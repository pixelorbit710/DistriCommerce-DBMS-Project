import random
from datetime import datetime, timedelta
from database import (
    init_databases, get_sqlite_conn, get_pg_connection, USE_POSTGRES,
    CENTRAL_DB_PATH, PUNE_DB_PATH, DELHI_DB_PATH, CHENNAI_DB_PATH,
    sync_product_replicas, get_regional_conn
)
from config import REGIONS

CUSTOMERS = [
    ("CUST-101", "Aarav Sharma", "aarav.sharma@example.in", "Pune", "+91 98201 11223"),
    ("CUST-102", "Diya Patel", "diya.patel@example.in", "Mumbai", "+91 98201 22334"),
    ("CUST-103", "Rohan Joshi", "rohan.joshi@example.in", "Nagpur", "+91 98201 33445"),
    ("CUST-104", "Isha Verma", "isha.verma@example.in", "Delhi", "+91 98111 44556"),
    ("CUST-105", "Kabir Malhotra", "kabir.m@example.in", "Jaipur", "+91 98111 55667"),
    ("CUST-106", "Ananya Gupta", "ananya.g@example.in", "Lucknow", "+91 98111 66778"),
    ("CUST-107", "Karthik Subramanian", "karthik.s@example.in", "Chennai", "+91 94440 77889"),
    ("CUST-108", "Meera Natarajan", "meera.n@example.in", "Bengaluru", "+91 94440 88990"),
    ("CUST-109", "Vignesh Raman", "vignesh.r@example.in", "Hyderabad", "+91 94440 99001"),
    ("CUST-110", "Pooja Deshmukh", "pooja.d@example.in", "Nashik", "+91 98201 44332"),
]

PRODUCTS = [
    (
        "PROD-101",
        "MacBook Pro M3 Max",
        "Electronics",
        249999.00,
        35,
        "Apple M3 Max 14-Core CPU, 30-Core GPU, 36GB Unified Memory, 1TB SSD, Liquid Retina XDR.",
        "laptop"
    ),
    (
        "PROD-102",
        "Dell XPS 15 OLED",
        "Electronics",
        179999.00,
        42,
        "Intel Core i9 13th Gen, 3.5K OLED Touch, 32GB DDR5 RAM, 1TB NVMe SSD, NVIDIA RTX 4070.",
        "laptop"
    ),
    (
        "PROD-103",
        "iPhone 16 Pro 256GB",
        "Mobile",
        119999.00,
        80,
        "Grade 5 Titanium finish, A18 Pro Bionic, 48MP Pro camera with 5x Telephoto optical zoom.",
        "smartphone"
    ),
    (
        "PROD-104",
        "Samsung Galaxy S25 Ultra",
        "Mobile",
        129999.00,
        65,
        "Snapdragon 8 Gen 4, 200MP Quad Camera, S-Pen included, 6.8-inch Dynamic AMOLED 2X 120Hz.",
        "smartphone"
    ),
    (
        "PROD-105",
        "Sony WH-1000XM5 ANC Headphones",
        "Accessories",
        26990.00,
        110,
        "Industry-leading active noise cancellation with 8 mics, 30-hr battery, Multipoint pairing.",
        "headphones"
    ),
    (
        "PROD-106",
        "Keychron K2 Mechanical Keyboard",
        "Accessories",
        8499.00,
        140,
        "75% compact wireless mechanical keyboard, Gateron Brown tactile switches, Mac/Win layout.",
        "keyboard"
    ),
    (
        "PROD-107",
        "Logitech MX Master 3S Mouse",
        "Accessories",
        7995.00,
        120,
        "Quiet Click ergonomic wireless mouse, 8000 DPI Darkfield sensor, MagSpeed metal scroll wheel.",
        "mouse"
    ),
    (
        "PROD-108",
        "Ergonomic Mesh Office Chair",
        "Furniture",
        16499.00,
        50,
        "Breathable Korean mesh, dynamic lumbar support, 3D adjustable armrests, heavy-duty Class 4 gas lift.",
        "chair"
    ),
    (
        "PROD-109",
        "Motorized Standing Desk 140x70",
        "Furniture",
        28999.00,
        25,
        "Dual electric motors, solid teak finish top, anti-collision sensor, 4 programmable height presets.",
        "desk"
    ),
    (
        "PROD-110",
        "LG UltraFine 27-inch 4K Monitor",
        "Electronics",
        34999.00,
        40,
        "IPS panel, DCI-P3 95% wide gamut, HDR400, USB-C 90W single-cable power delivery, ergonomic stand.",
        "monitor"
    ),
]

# Regional distribution seeds showcasing multi-city delivery addresses
INITIAL_ORDERS = [
    # Pune Fragment (Serving West / Central-West Cluster)
    ("ORD-PUN-00101", "CUST-101", "Aarav Sharma", "+91 98201 11223", "PROD-101", "Pune", "Pune", "Flat 402, Shivajinagar, Pune - 411005", 1, 249999.00, 249999.00, "2026-10-20 10:15:00", "Delivered"),
    ("ORD-PUN-00102", "CUST-102", "Diya Patel", "+91 98201 22334", "PROD-105", "Pune", "Mumbai", "Bandra Kurla Complex, Tower B, Mumbai - 400051", 2, 26990.00, 53980.00, "2026-10-21 14:30:00", "Delivered"),
    ("ORD-PUN-00103", "CUST-103", "Rohan Joshi", "+91 98201 33445", "PROD-106", "Pune", "Nagpur", "Plot 18, Civil Lines, Nagpur - 440001", 1, 8499.00, 8499.00, "2026-10-23 16:45:00", "Shipped"),
    ("ORD-PUN-00104", "CUST-110", "Pooja Deshmukh", "+91 98201 44332", "PROD-103", "Pune", "Nashik", "Gangapur Road, Near KTHM College, Nashik - 422002", 1, 119999.00, 119999.00, "2026-10-25 09:20:00", "Processing"),
    ("ORD-PUN-00105", "CUST-101", "Aarav Sharma", "+91 98201 11223", "PROD-107", "Pune", "Pune", "Kothrud Depot Road, Pune - 411038", 3, 7995.00, 23985.00, "2026-10-26 11:10:00", "Placed"),

    # Delhi Fragment (Serving North / Upper-Central Cluster)
    ("ORD-DEL-00201", "CUST-104", "Isha Verma", "+91 98111 44556", "PROD-103", "Delhi", "Delhi", "C-45, Greater Kailash Part 1, New Delhi - 110048", 2, 119999.00, 239998.00, "2026-10-19 11:00:00", "Delivered"),
    ("ORD-DEL-00202", "CUST-105", "Kabir Malhotra", "+91 98111 55667", "PROD-108", "Delhi", "Jaipur", "C-Scheme, Ashok Nagar, Jaipur - 302001", 1, 16499.00, 16499.00, "2026-10-22 13:15:00", "Delivered"),
    ("ORD-DEL-00203", "CUST-106", "Ananya Gupta", "+91 98111 66778", "PROD-102", "Delhi", "Lucknow", "Gomti Nagar, Vibhuti Khand, Lucknow - 226010", 1, 179999.00, 179999.00, "2026-10-24 15:40:00", "Shipped"),
    ("ORD-DEL-00204", "CUST-104", "Isha Verma", "+91 98111 44556", "PROD-110", "Delhi", "Noida", "Sector 62, Electronic City, Noida - 201309", 1, 34999.00, 34999.00, "2026-10-25 18:25:00", "Processing"),
    ("ORD-DEL-00205", "CUST-105", "Kabir Malhotra", "+91 98111 55667", "PROD-104", "Delhi", "Chandigarh", "Sector 17-C, Commercial Plaza, Chandigarh - 160017", 1, 129999.00, 129999.00, "2026-10-26 14:05:00", "Placed"),

    # Chennai Fragment (Serving South / East Cluster)
    ("ORD-CHE-00301", "CUST-107", "Karthik Subramanian", "+91 94440 77889", "PROD-104", "Chennai", "Chennai", "Anna Nagar West, 2nd Avenue, Chennai - 600040", 1, 129999.00, 129999.00, "2026-10-18 10:45:00", "Delivered"),
    ("ORD-CHE-00302", "CUST-108", "Meera Natarajan", "+91 94440 88990", "PROD-109", "Chennai", "Bengaluru", "Indiranagar 100ft Road, Bengaluru - 560038", 1, 28999.00, 28999.00, "2026-10-21 16:10:00", "Delivered"),
    ("ORD-CHE-00303", "CUST-109", "Vignesh Raman", "+91 94440 99001", "PROD-105", "Chennai", "Hyderabad", "HITEC City, Madhapur, Hyderabad - 500081", 2, 26990.00, 53980.00, "2026-10-23 11:35:00", "Shipped"),
    ("ORD-CHE-00304", "CUST-107", "Karthik Subramanian", "+91 94440 77889", "PROD-107", "Chennai", "Kolkata", "Salt Lake Sector V, Kolkata - 700091", 1, 7995.00, 7995.00, "2026-10-25 17:00:00", "Processing"),
    ("ORD-CHE-00305", "CUST-108", "Meera Natarajan", "+91 94440 88990", "PROD-101", "Chennai", "Chennai", "Adyar, Gandhi Nagar, Chennai - 600020", 1, 249999.00, 249999.00, "2026-10-26 15:50:00", "Placed"),
]

def seed_all():
    print("[Seed] Initializing databases, tables, and schemas...")
    init_databases()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Seed Customers & Central Products
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        for cid, name, email, city, phone in CUSTOMERS:
            cur.execute("""
                INSERT INTO customers (customer_id, name, email, city, phone)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (customer_id) DO NOTHING
            """, (cid, name, email, city, phone))
        
        for pid, name, cat, price, stock, desc, img in PRODUCTS:
            cur.execute("""
                INSERT INTO products_central (product_id, name, category, price, stock_quantity, description, image_url, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (product_id) DO UPDATE SET
                    description = EXCLUDED.description,
                    image_url = EXCLUDED.image_url
            """, (pid, name, cat, price, stock, desc, img, now_str))
        conn.commit()
        cur.close()
        conn.close()
    else:
        conn = get_sqlite_conn(CENTRAL_DB_PATH)
        for cid, name, email, city, phone in CUSTOMERS:
            conn.execute("""
                INSERT OR IGNORE INTO customers (customer_id, name, email, city, phone)
                VALUES (?, ?, ?, ?, ?)
            """, (cid, name, email, city, phone))
        for pid, name, cat, price, stock, desc, img in PRODUCTS:
            conn.execute("""
                INSERT INTO products_central (product_id, name, category, price, stock_quantity, description, image_url, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(product_id) DO UPDATE SET
                    description = excluded.description,
                    image_url = excluded.image_url
            """, (pid, name, cat, price, stock, desc, img, now_str))
        conn.commit()
        conn.close()

    # 2. Synchronize Regional Product Copies (Replication)
    print("[Seed] Synchronizing product replicas across Pune, Delhi, Chennai...")
    sync_product_replicas()

    # 3. Seed Regional Orders into their respective fragments
    print("[Seed] Inserting sample orders into horizontal fragments...")
    for oid, cid, cname, cphone, pid, region, dcity, daddr, qty, uprice, total, odate, status in INITIAL_ORDERS:
        tbl = f"orders_{region.lower()}"
        if USE_POSTGRES:
            conn = get_pg_connection()
            cur = conn.cursor()
            cur.execute(f"""
                INSERT INTO {tbl} (
                    order_id, customer_id, customer_name, customer_phone, product_id, region,
                    delivery_city, delivery_address, quantity, unit_price, total_amount, order_date, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (order_id) DO NOTHING
            """, (oid, cid, cname, cphone, pid, region, dcity, daddr, qty, uprice, total, odate, status))
            conn.commit()
            cur.close()
            conn.close()
        else:
            rconn = get_regional_conn(region)
            rconn.execute(f"""
                INSERT OR IGNORE INTO {tbl} (
                    order_id, customer_id, customer_name, customer_phone, product_id, region,
                    delivery_city, delivery_address, quantity, unit_price, total_amount, order_date, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (oid, cid, cname, cphone, pid, region, dcity, daddr, qty, uprice, total, odate, status))
            rconn.commit()
            rconn.close()

    print("[Seed] DistriCommerce database seeding complete!")

if __name__ == "__main__":
    seed_all()
