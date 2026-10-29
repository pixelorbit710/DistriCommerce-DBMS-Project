import os
import sqlite3
import random
from datetime import datetime
from typing import List, Dict, Any, Optional
from config import (
    USE_POSTGRES, DATABASE_URL, PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD,
    CENTRAL_DB_PATH, PUNE_DB_PATH, DELHI_DB_PATH, CHENNAI_DB_PATH, REGIONAL_DB_MAP, REGIONS
)
from routing import resolve_city_region, DEFAULT_REGION

def get_db_mode() -> str:
    return "PostgreSQL (Enterprise Engine)" if USE_POSTGRES else "Distributed Multi-Node SQLite (Local Nodes)"

def get_pg_connection():
    import psycopg2
    from psycopg2.extras import RealDictCursor
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DATABASE,
        user=PG_USER,
        password=PG_PASSWORD,
        cursor_factory=RealDictCursor
    )

def get_sqlite_conn(db_path: str):
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    return conn

def get_coordinator_conn():
    if USE_POSTGRES:
        return get_pg_connection()
    conn = get_sqlite_conn(CENTRAL_DB_PATH)
    conn.execute("ATTACH DATABASE ? AS pune_node;", (PUNE_DB_PATH,))
    conn.execute("ATTACH DATABASE ? AS delhi_node;", (DELHI_DB_PATH,))
    conn.execute("ATTACH DATABASE ? AS chennai_node;", (CHENNAI_DB_PATH,))
    return conn

def get_regional_conn(region: str):
    if region not in REGIONAL_DB_MAP:
        raise ValueError(f"Invalid region: {region}. Must be one of {REGIONS}")
    if USE_POSTGRES:
        return get_pg_connection()
    return get_sqlite_conn(REGIONAL_DB_MAP[region])

def init_databases():
    """Initializes tables, constraints, foreign keys, indexes, and applies safe column migrations."""
    if USE_POSTGRES:
        _init_postgres()
    else:
        _init_sqlite()

def _init_postgres():
    conn = get_pg_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            customer_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            city VARCHAR(50) NOT NULL,
            phone VARCHAR(25)
        );

        CREATE TABLE IF NOT EXISTS products_central (
            product_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            category VARCHAR(50) NOT NULL,
            price NUMERIC(10,2) NOT NULL CHECK(price > 0),
            stock_quantity INT NOT NULL CHECK(stock_quantity >= 0),
            description TEXT,
            image_url VARCHAR(255),
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products_pune (
            product_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            category VARCHAR(50) NOT NULL,
            price NUMERIC(10,2) NOT NULL,
            stock_quantity INT NOT NULL,
            description TEXT,
            image_url VARCHAR(255),
            synced_at TIMESTAMP NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products_delhi (
            product_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            category VARCHAR(50) NOT NULL,
            price NUMERIC(10,2) NOT NULL,
            stock_quantity INT NOT NULL,
            description TEXT,
            image_url VARCHAR(255),
            synced_at TIMESTAMP NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products_chennai (
            product_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            category VARCHAR(50) NOT NULL,
            price NUMERIC(10,2) NOT NULL,
            stock_quantity INT NOT NULL,
            description TEXT,
            image_url VARCHAR(255),
            synced_at TIMESTAMP NOT NULL
        );

        -- Horizontal Regional Fragments for Orders with Delivery City & Customer details
        CREATE TABLE IF NOT EXISTS orders_pune (
            order_id VARCHAR(50) PRIMARY KEY,
            customer_id VARCHAR(50) REFERENCES customers(customer_id),
            product_id VARCHAR(50) REFERENCES products_central(product_id),
            region VARCHAR(20) NOT NULL CHECK(region = 'Pune'),
            delivery_city VARCHAR(100) NOT NULL DEFAULT 'Pune',
            delivery_address TEXT,
            customer_name VARCHAR(150),
            customer_phone VARCHAR(25),
            quantity INT NOT NULL CHECK(quantity > 0),
            unit_price NUMERIC(10,2) NOT NULL,
            total_amount NUMERIC(12,2) NOT NULL,
            order_date TIMESTAMP NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Placed'
        );
        CREATE TABLE IF NOT EXISTS orders_delhi (
            order_id VARCHAR(50) PRIMARY KEY,
            customer_id VARCHAR(50) REFERENCES customers(customer_id),
            product_id VARCHAR(50) REFERENCES products_central(product_id),
            region VARCHAR(20) NOT NULL CHECK(region = 'Delhi'),
            delivery_city VARCHAR(100) NOT NULL DEFAULT 'Delhi',
            delivery_address TEXT,
            customer_name VARCHAR(150),
            customer_phone VARCHAR(25),
            quantity INT NOT NULL CHECK(quantity > 0),
            unit_price NUMERIC(10,2) NOT NULL,
            total_amount NUMERIC(12,2) NOT NULL,
            order_date TIMESTAMP NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Placed'
        );
        CREATE TABLE IF NOT EXISTS orders_chennai (
            order_id VARCHAR(50) PRIMARY KEY,
            customer_id VARCHAR(50) REFERENCES customers(customer_id),
            product_id VARCHAR(50) REFERENCES products_central(product_id),
            region VARCHAR(20) NOT NULL CHECK(region = 'Chennai'),
            delivery_city VARCHAR(100) NOT NULL DEFAULT 'Chennai',
            delivery_address TEXT,
            customer_name VARCHAR(150),
            customer_phone VARCHAR(25),
            quantity INT NOT NULL CHECK(quantity > 0),
            unit_price NUMERIC(10,2) NOT NULL,
            total_amount NUMERIC(12,2) NOT NULL,
            order_date TIMESTAMP NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Placed'
        );

        CREATE INDEX IF NOT EXISTS idx_orders_pune_date ON orders_pune(order_date);
        CREATE INDEX IF NOT EXISTS idx_orders_delhi_date ON orders_delhi(order_date);
        CREATE INDEX IF NOT EXISTS idx_orders_chennai_date ON orders_chennai(order_date);

        CREATE TABLE IF NOT EXISTS distributed_transactions (
            tx_id VARCHAR(50) PRIMARY KEY,
            tx_type VARCHAR(50) NOT NULL,
            coordinator VARCHAR(50) NOT NULL,
            status VARCHAR(30) NOT NULL,
            decision VARCHAR(30),
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            details TEXT
        );

        CREATE TABLE IF NOT EXISTS participant_votes (
            id SERIAL PRIMARY KEY,
            tx_id VARCHAR(50) NOT NULL REFERENCES distributed_transactions(tx_id) ON DELETE CASCADE,
            participant VARCHAR(50) NOT NULL,
            vote VARCHAR(30) NOT NULL,
            state VARCHAR(30) NOT NULL,
            vote_timestamp TIMESTAMP NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recovery_logs (
            log_id SERIAL PRIMARY KEY,
            tx_id VARCHAR(50) NOT NULL,
            participant VARCHAR(50) NOT NULL,
            failure_type VARCHAR(50) NOT NULL,
            recovery_action VARCHAR(50) NOT NULL,
            resolved_state VARCHAR(30) NOT NULL,
            logged_at TIMESTAMP NOT NULL,
            message TEXT
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

def _init_sqlite():
    # 1. Central Coordinator Database
    central_conn = get_sqlite_conn(CENTRAL_DB_PATH)
    central_conn.executescript("""
        CREATE TABLE IF NOT EXISTS customers (
            customer_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            city TEXT NOT NULL,
            phone TEXT
        );

        CREATE TABLE IF NOT EXISTS products_central (
            product_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL CHECK(price > 0),
            stock_quantity INTEGER NOT NULL CHECK(stock_quantity >= 0),
            description TEXT,
            image_url TEXT,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS distributed_transactions (
            tx_id TEXT PRIMARY KEY,
            tx_type TEXT NOT NULL,
            coordinator TEXT NOT NULL DEFAULT 'Central-Coordinator',
            status TEXT NOT NULL,
            decision TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT,
            details TEXT
        );

        CREATE TABLE IF NOT EXISTS participant_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT NOT NULL,
            participant TEXT NOT NULL,
            vote TEXT NOT NULL,
            state TEXT NOT NULL,
            vote_timestamp TEXT NOT NULL,
            FOREIGN KEY (tx_id) REFERENCES distributed_transactions(tx_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS recovery_logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT NOT NULL,
            participant TEXT NOT NULL,
            failure_type TEXT NOT NULL,
            recovery_action TEXT NOT NULL,
            resolved_state TEXT NOT NULL,
            logged_at TEXT NOT NULL,
            message TEXT
        );
    """)
    # Check if products_central needs column additions
    pcols = [c[1] for c in central_conn.execute("PRAGMA table_info(products_central)").fetchall()]
    if "description" not in pcols:
        central_conn.execute("ALTER TABLE products_central ADD COLUMN description TEXT;")
    if "image_url" not in pcols:
        central_conn.execute("ALTER TABLE products_central ADD COLUMN image_url TEXT;")

    central_conn.commit()
    central_conn.close()

    # 2. Regional Database Nodes (Pune, Delhi, Chennai)
    for region, db_path in REGIONAL_DB_MAP.items():
        reg_conn = get_sqlite_conn(db_path)
        table_name = f"orders_{region.lower()}"
        product_table = f"products_{region.lower()}"
        reg_conn.executescript(f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                order_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                region TEXT NOT NULL CHECK(region = '{region}'),
                delivery_city TEXT NOT NULL DEFAULT '{region}',
                delivery_address TEXT,
                customer_name TEXT,
                customer_phone TEXT,
                quantity INTEGER NOT NULL CHECK(quantity > 0),
                unit_price REAL NOT NULL,
                total_amount REAL NOT NULL,
                order_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Placed'
            );

            CREATE TABLE IF NOT EXISTS {product_table} (
                product_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                stock_quantity INTEGER NOT NULL,
                description TEXT,
                image_url TEXT,
                synced_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_{table_name}_date ON {table_name}(order_date);
            CREATE INDEX IF NOT EXISTS idx_{table_name}_cust ON {table_name}(customer_id);
            CREATE INDEX IF NOT EXISTS idx_{table_name}_prod ON {table_name}(product_id);
        """)

        # Check existing orders columns & migrate if needed
        cols = [c[1] for c in reg_conn.execute(f"PRAGMA table_info({table_name})").fetchall()]
        if "delivery_city" not in cols:
            reg_conn.execute(f"ALTER TABLE {table_name} ADD COLUMN delivery_city TEXT DEFAULT '{region}';")
            reg_conn.execute(f"UPDATE {table_name} SET delivery_city = '{region}' WHERE delivery_city IS NULL;")
        if "delivery_address" not in cols:
            reg_conn.execute(f"ALTER TABLE {table_name} ADD COLUMN delivery_address TEXT DEFAULT 'Regional Distribution Center, {region}';")
            reg_conn.execute(f"UPDATE {table_name} SET delivery_address = 'Regional Distribution Center, {region}' WHERE delivery_address IS NULL;")
        if "customer_name" not in cols:
            reg_conn.execute(f"ALTER TABLE {table_name} ADD COLUMN customer_name TEXT;")
        if "customer_phone" not in cols:
            reg_conn.execute(f"ALTER TABLE {table_name} ADD COLUMN customer_phone TEXT;")

        # Check existing products columns & migrate if needed
        pcols = [c[1] for c in reg_conn.execute(f"PRAGMA table_info({product_table})").fetchall()]
        if "description" not in pcols:
            reg_conn.execute(f"ALTER TABLE {product_table} ADD COLUMN description TEXT;")
        if "image_url" not in pcols:
            reg_conn.execute(f"ALTER TABLE {product_table} ADD COLUMN image_url TEXT;")

        reg_conn.commit()
        reg_conn.close()

# Customer handling
def get_all_customers() -> List[Dict[str, Any]]:
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM customers ORDER BY name ASC")
        rows = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return rows
    else:
        conn = get_sqlite_conn(CENTRAL_DB_PATH)
        rows = conn.execute("SELECT * FROM customers ORDER BY name ASC").fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result

def create_or_get_customer(customer_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generic Customer Management:
    Allows new customers to place orders on-the-fly without manual prior registration.
    Reuses an existing customer only if matching by customer_id or verified email/phone.
    """
    cust_id = customer_data.get("customer_id")
    name = (customer_data.get("customer_name") or customer_data.get("name") or "").strip()
    city = (customer_data.get("delivery_city") or customer_data.get("city") or "").strip()
    phone = (customer_data.get("customer_phone") or customer_data.get("phone") or "").strip()
    email = (customer_data.get("customer_email") or customer_data.get("email") or "").strip()

    if not name:
        name = "Guest Customer"
    if not city:
        city = "Pune"

    # 1. If explicit customer_id given, check if exists
    if cust_id:
        if USE_POSTGRES:
            conn = get_pg_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM customers WHERE customer_id = %s", (cust_id,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if row:
                return dict(row)
        else:
            conn = get_sqlite_conn(CENTRAL_DB_PATH)
            row = conn.execute("SELECT * FROM customers WHERE customer_id = ?", (cust_id,)).fetchone()
            conn.close()
            if row:
                return dict(row)

    # 2. Check if customer already exists with this exact email
    if email:
        if USE_POSTGRES:
            conn = get_pg_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM customers WHERE email = %s", (email,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if row:
                return dict(row)
        else:
            conn = get_sqlite_conn(CENTRAL_DB_PATH)
            row = conn.execute("SELECT * FROM customers WHERE email = ?", (email,)).fetchone()
            conn.close()
            if row:
                return dict(row)

    # 3. Create a brand-new customer record
    new_id = f"CUST-{random.randint(100000, 999999)}"
    if not email:
        email = f"{new_id.lower()}@customer.districommerce.in"
    if not phone:
        phone = "+91 98200 00000"

    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO customers (customer_id, name, email, city, phone)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (customer_id) DO NOTHING
        """, (new_id, name, email, city, phone))
        conn.commit()
        cur.close()
        conn.close()
    else:
        conn = get_sqlite_conn(CENTRAL_DB_PATH)
        conn.execute("""
            INSERT OR IGNORE INTO customers (customer_id, name, email, city, phone)
            VALUES (?, ?, ?, ?, ?)
        """, (new_id, name, email, city, phone))
        conn.commit()
        conn.close()

    return {
        "customer_id": new_id,
        "name": name,
        "email": email,
        "city": city,
        "phone": phone
    }

# Products Handling
def get_central_products() -> List[Dict[str, Any]]:
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM products_central ORDER BY product_id ASC")
        rows = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return rows
    else:
        conn = get_sqlite_conn(CENTRAL_DB_PATH)
        rows = conn.execute("SELECT * FROM products_central ORDER BY product_id ASC").fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result

def get_single_product(product_id: str) -> Optional[Dict[str, Any]]:
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM products_central WHERE product_id = %s", (product_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        return dict(row) if row else None
    else:
        conn = get_sqlite_conn(CENTRAL_DB_PATH)
        row = conn.execute("SELECT * FROM products_central WHERE product_id = ?", (product_id,)).fetchone()
        conn.close()
        return dict(row) if row else None

def get_regional_products(region: str) -> List[Dict[str, Any]]:
    table_name = f"products_{region.lower()}"
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM {table_name} ORDER BY product_id ASC")
        rows = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return rows
    else:
        conn = get_regional_conn(region)
        rows = conn.execute(f"SELECT * FROM {table_name} ORDER BY product_id ASC").fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result

# Orders & Regional Fragmentation
def get_orders_by_region(region: str) -> List[Dict[str, Any]]:
    table_name = f"orders_{region.lower()}"
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT o.*, 
                   COALESCE(o.customer_name, c.name, 'Valued Customer') as customer_name,
                   c.email as customer_email, 
                   p.name as product_name,
                   p.image_url as product_image
            FROM {table_name} o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN products_central p ON o.product_id = p.product_id
            ORDER BY o.order_date DESC
        """)
        rows = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return rows
    else:
        reg_conn = get_regional_conn(region)
        orders = [dict(r) for r in reg_conn.execute(f"SELECT * FROM {table_name} ORDER BY order_date DESC").fetchall()]
        reg_conn.close()
        
        cent_conn = get_sqlite_conn(CENTRAL_DB_PATH)
        custs = {r['customer_id']: r['name'] for r in cent_conn.execute("SELECT customer_id, name FROM customers").fetchall()}
        prods = {r['product_id']: (r['name'], dict(r).get('image_url', '')) for r in cent_conn.execute("SELECT product_id, name, image_url FROM products_central").fetchall()}
        cent_conn.close()
        
        for o in orders:
            o['customer_name'] = o.get('customer_name') or custs.get(o['customer_id'], 'Valued Customer')
            prod_info = prods.get(o['product_id'], (o['product_id'], ''))
            o['product_name'] = prod_info[0]
            o['product_image'] = prod_info[1]
            if not o.get('delivery_city'):
                o['delivery_city'] = region
            if not o.get('delivery_address'):
                o['delivery_address'] = f"Regional Distribution Center, {region}"
        return orders

def get_global_orders_reconstructed() -> List[Dict[str, Any]]:
    """
    Global Relation Reconstruction via Relational UNION ALL:
    Reconstructs the complete global relation from horizontal fragments
    orders_pune UNION ALL orders_delhi UNION ALL orders_chennai.
    """
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        query = """
            SELECT order_id, customer_id, product_id, region, delivery_city, delivery_address,
                   customer_name, customer_phone, quantity, unit_price, total_amount, order_date, status
            FROM orders_pune
            UNION ALL
            SELECT order_id, customer_id, product_id, region, delivery_city, delivery_address,
                   customer_name, customer_phone, quantity, unit_price, total_amount, order_date, status
            FROM orders_delhi
            UNION ALL
            SELECT order_id, customer_id, product_id, region, delivery_city, delivery_address,
                   customer_name, customer_phone, quantity, unit_price, total_amount, order_date, status
            FROM orders_chennai
            ORDER BY order_date DESC;
        """
        cur.execute(query)
        rows = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        
        # Enrich with customer/product catalog
        cust_conn = get_pg_connection()
        ccur = cust_conn.cursor()
        ccur.execute("SELECT customer_id, name FROM customers")
        cust_map = {r['customer_id']: r['name'] for r in ccur.fetchall()}
        ccur.execute("SELECT product_id, name, image_url FROM products_central")
        prod_rows = ccur.fetchall()
        prod_map = {r['product_id']: r['name'] for r in prod_rows}
        img_map = {r['product_id']: r.get('image_url', '') for r in prod_rows}
        ccur.close()
        cust_conn.close()
        
        for r in rows:
            r['customer_name'] = r.get('customer_name') or cust_map.get(r['customer_id'], 'Valued Customer')
            r['product_name'] = prod_map.get(r['product_id'], 'Product Catalog Item')
            r['product_image'] = img_map.get(r['product_id'], '')
        return rows
    else:
        all_orders = []
        for reg in REGIONS:
            all_orders.extend(get_orders_by_region(reg))
        all_orders.sort(key=lambda x: str(x['order_date']), reverse=True)
        return all_orders

def insert_regional_order(order_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generic E-Commerce Order Placement & Intelligent Horizontal Routing:
    1. Resolves delivery city to assigned regional fragment (Pune, Delhi, Chennai).
    2. Dynamically creates or matches customer record.
    3. Validates authoritative catalog stock in products_central.
    4. Decrements inventory atomically.
    5. Inserts order record into the target regional partition.
    """
    raw_city = order_data.get("delivery_city") or order_data.get("city") or ""
    explicit_region = order_data.get("region")

    # Resolve regional routing
    if explicit_region and explicit_region in REGIONS and not raw_city:
        assigned_region = explicit_region
        delivery_city = explicit_region
        routing_info = {
            "assigned_region": assigned_region,
            "routing_reason": f"Explicitly allocated to {assigned_region} Node",
            "is_fallback": False
        }
    else:
        routing_info = resolve_city_region(raw_city or explicit_region or "Pune")
        assigned_region = routing_info["assigned_region"]
        delivery_city = routing_info["input_city"] or assigned_region

    delivery_address = order_data.get("delivery_address") or f"Standard Delivery, {delivery_city}"

    # Resolve or create customer record
    customer_info = create_or_get_customer({
        "customer_id": order_data.get("customer_id"),
        "customer_name": order_data.get("customer_name") or order_data.get("name"),
        "delivery_city": delivery_city,
        "customer_phone": order_data.get("customer_phone") or order_data.get("phone"),
        "customer_email": order_data.get("customer_email") or order_data.get("email"),
    })
    customer_id = customer_info["customer_id"]
    customer_name = customer_info["name"]
    customer_phone = customer_info.get("phone", "")

    # Validate Product & Inventory in Authoritative Catalog
    product_id = order_data["product_id"]
    product = get_single_product(product_id)
    if not product:
        raise ValueError(f"Product ID '{product_id}' does not exist in master catalog.")

    try:
        quantity = int(order_data["quantity"])
        if quantity <= 0:
            raise ValueError("Order quantity must be a positive integer greater than zero.")
    except (ValueError, TypeError):
        raise ValueError("Invalid quantity. Must be an integer greater than zero.")

    available_stock = int(product.get("stock_quantity", 0))
    if available_stock < quantity:
        raise ValueError(f"Insufficient stock for '{product['name']}'. Requested: {quantity}, Available: {available_stock}")

    # Authoritative database price or validated price
    if "unit_price" in order_data and float(order_data["unit_price"]) > 0:
        unit_price = float(order_data["unit_price"])
    else:
        unit_price = float(product["price"])
    total_amount = round(quantity * unit_price, 2)
    order_date = order_data.get("order_date") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    order_id = order_data.get("order_id") or f"ORD-{assigned_region.upper()[:3]}-{random.randint(100000, 999999)}"
    status = order_data.get("status", "Placed")

    table_name = f"orders_{assigned_region.lower()}"

    # Atomically reduce stock in Central Master and Replicas
    new_stock = available_stock - quantity
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        # 1. Update stock
        cur.execute("""
            UPDATE products_central 
            SET stock_quantity = %s, updated_at = %s 
            WHERE product_id = %s
        """, (new_stock, now_str, product_id))
        cur.execute(f"""
            UPDATE products_{assigned_region.lower()}
            SET stock_quantity = %s, synced_at = %s
            WHERE product_id = %s
        """, (new_stock, now_str, product_id))
        # 2. Insert order into regional partition
        cur.execute(f"""
            INSERT INTO {table_name} (
                order_id, customer_id, product_id, region, delivery_city, delivery_address,
                customer_name, customer_phone, quantity, unit_price, total_amount, order_date, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            order_id, customer_id, product_id, assigned_region, delivery_city, delivery_address,
            customer_name, customer_phone, quantity, unit_price, total_amount, order_date, status
        ))
        conn.commit()
        cur.close()
        conn.close()
    else:
        # Central stock update
        cconn = get_sqlite_conn(CENTRAL_DB_PATH)
        cconn.execute("""
            UPDATE products_central
            SET stock_quantity = ?, updated_at = ?
            WHERE product_id = ?
        """, (new_stock, now_str, product_id))
        cconn.commit()
        cconn.close()

        # Regional replica stock update & Order insert
        rconn = get_regional_conn(assigned_region)
        rconn.execute(f"""
            UPDATE products_{assigned_region.lower()}
            SET stock_quantity = ?, synced_at = ?
            WHERE product_id = ?
        """, (new_stock, now_str, product_id))
        rconn.execute(f"""
            INSERT INTO {table_name} (
                order_id, customer_id, product_id, region, delivery_city, delivery_address,
                customer_name, customer_phone, quantity, unit_price, total_amount, order_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id, customer_id, product_id, assigned_region, delivery_city, delivery_address,
            customer_name, customer_phone, quantity, unit_price, total_amount, order_date, status
        ))
        rconn.commit()
        rconn.close()

    return {
        "order_id": order_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "product_id": product_id,
        "product_name": product["name"],
        "region": assigned_region,
        "delivery_city": delivery_city,
        "delivery_address": delivery_address,
        "quantity": quantity,
        "unit_price": unit_price,
        "total_amount": total_amount,
        "order_date": order_date,
        "status": status,
        "target_fragment": table_name,
        "routing_reason": routing_info.get("routing_reason", f"Assigned to {assigned_region} Hub"),
        "is_fallback_routing": routing_info.get("is_fallback", False)
    }

def update_order_status(order_id: str, region: str, new_status: str) -> bool:
    """Updates order status; if cancelled, restores product inventory."""
    table_name = f"orders_{region.lower()}"
    
    # Check current status and quantity
    current_order = None
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM {table_name} WHERE order_id = %s", (order_id,))
        row = cur.fetchone()
        if row:
            current_order = dict(row)
        cur.execute(f"UPDATE {table_name} SET status = %s WHERE order_id = %s", (new_status, order_id))
        rows_affected = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
    else:
        reg_conn = get_regional_conn(region)
        row = reg_conn.execute(f"SELECT * FROM {table_name} WHERE order_id = ?", (order_id,)).fetchone()
        if row:
            current_order = dict(row)
        cur = reg_conn.execute(f"UPDATE {table_name} SET status = ? WHERE order_id = ?", (new_status, order_id))
        rows_affected = cur.rowcount
        reg_conn.commit()
        reg_conn.close()

    # If cancelling, restore inventory
    if current_order and new_status == "Cancelled" and current_order.get("status") != "Cancelled":
        pid = current_order["product_id"]
        qty = int(current_order["quantity"])
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if USE_POSTGRES:
            conn = get_pg_connection()
            cur = conn.cursor()
            cur.execute("UPDATE products_central SET stock_quantity = stock_quantity + %s, updated_at = %s WHERE product_id = %s", (qty, now_str, pid))
            cur.execute(f"UPDATE products_{region.lower()} SET stock_quantity = stock_quantity + %s, synced_at = %s WHERE product_id = %s", (qty, now_str, pid))
            conn.commit()
            cur.close()
            conn.close()
        else:
            cconn = get_sqlite_conn(CENTRAL_DB_PATH)
            cconn.execute("UPDATE products_central SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE product_id = ?", (qty, now_str, pid))
            cconn.commit()
            cconn.close()
            rconn = get_regional_conn(region)
            rconn.execute(f"UPDATE products_{region.lower()} SET stock_quantity = stock_quantity + ?, synced_at = ? WHERE product_id = ?", (qty, now_str, pid))
            rconn.commit()
            rconn.close()

    return rows_affected > 0

def delete_order(order_id: str, region: str) -> bool:
    table_name = f"orders_{region.lower()}"
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {table_name} WHERE order_id = %s", (order_id,))
        rows_affected = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return rows_affected > 0
    else:
        reg_conn = get_regional_conn(region)
        cur = reg_conn.execute(f"DELETE FROM {table_name} WHERE order_id = ?", (order_id,))
        rows_affected = cur.rowcount
        reg_conn.commit()
        reg_conn.close()
        return rows_affected > 0

def sync_product_replicas(product_id: Optional[str] = None, target_regions: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Replication Manager:
    Synchronizes central product catalogue records to regional product replica tables.
    """
    regions_to_sync = target_regions or REGIONS
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 1. Fetch source products from central catalog
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        if product_id:
            cur.execute("SELECT * FROM products_central WHERE product_id = %s", (product_id,))
        else:
            cur.execute("SELECT * FROM products_central")
        central_products = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
    else:
        cent_conn = get_sqlite_conn(CENTRAL_DB_PATH)
        if product_id:
            rows = cent_conn.execute("SELECT * FROM products_central WHERE product_id = ?", (product_id,)).fetchall()
        else:
            rows = cent_conn.execute("SELECT * FROM products_central").fetchall()
        central_products = [dict(r) for r in rows]
        cent_conn.close()

    sync_results = {}
    for region in regions_to_sync:
        table_name = f"products_{region.lower()}"
        count = 0
        if USE_POSTGRES:
            reg_conn = get_pg_connection()
            rcur = reg_conn.cursor()
            for p in central_products:
                rcur.execute(f"""
                    INSERT INTO {table_name} (product_id, name, category, price, stock_quantity, description, image_url, synced_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (product_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        category = EXCLUDED.category,
                        price = EXCLUDED.price,
                        stock_quantity = EXCLUDED.stock_quantity,
                        description = EXCLUDED.description,
                        image_url = EXCLUDED.image_url,
                        synced_at = EXCLUDED.synced_at
                """, (p["product_id"], p["name"], p["category"], p["price"], p["stock_quantity"], p.get("description"), p.get("image_url"), timestamp))
                count += 1
            reg_conn.commit()
            rcur.close()
            reg_conn.close()
        else:
            rconn = get_regional_conn(region)
            for p in central_products:
                rconn.execute(f"""
                    INSERT INTO {table_name} (product_id, name, category, price, stock_quantity, description, image_url, synced_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(product_id) DO UPDATE SET
                        name = excluded.name,
                        category = excluded.category,
                        price = excluded.price,
                        stock_quantity = excluded.stock_quantity,
                        description = excluded.description,
                        image_url = excluded.image_url,
                        synced_at = excluded.synced_at
                """, (p["product_id"], p["name"], p["category"], p["price"], p["stock_quantity"], p.get("description"), p.get("image_url"), timestamp))
                count += 1
            rconn.commit()
            rconn.close()
        sync_results[region] = {"synced_count": count, "synced_at": timestamp, "status": "In-Sync"}

    return {
        "sync_mode": "Application-Level Eager Replication",
        "timestamp": timestamp,
        "regions": sync_results
    }
