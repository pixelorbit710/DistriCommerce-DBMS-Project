import os
import hashlib
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import REGIONS, PORT, DATA_DIR
from routing import resolve_city_region, get_routing_overview, DEFAULT_REGION
from database import (
    get_db_mode, init_databases, get_all_customers, get_central_products,
    get_regional_products, get_orders_by_region, get_global_orders_reconstructed,
    insert_regional_order, update_order_status, delete_order, sync_product_replicas,
    get_sqlite_conn, get_pg_connection, USE_POSTGRES, CENTRAL_DB_PATH,
    create_or_get_customer, get_single_product
)
from coordinator import (
    TwoPhaseCommitCoordinator, get_transaction_history, get_recovery_logs, PARTICIPANTS
)
from parallel_query import execute_parallel_sales_aggregation

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
CORS(app)

# Ensure databases are initialized on start
@app.before_request
def setup_if_needed():
    if not hasattr(app, "_db_initialized"):
        init_databases()
        app._db_initialized = True

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api"):
        return jsonify({"error": "API route not found"}), 404
    if path != "" and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({
        "project": "DistriCommerce",
        "tagline": "One Platform. Three Regions. Distributed Intelligence.",
        "message": "DistriCommerce Multi-City E-Commerce API Server Running",
        "health": "/api/health"
    })

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "project": "DistriCommerce",
        "tagline": "One Platform. Three Regions. Distributed Intelligence.",
        "engine": get_db_mode(),
        "is_postgres": USE_POSTGRES,
        "regions": REGIONS,
        "participants": PARTICIPANTS,
        "timestamp": datetime.now().isoformat()
    })

# ROUTING ENGINE ENDPOINTS
@app.route("/api/routing/resolve", methods=["GET"])
def api_resolve_city():
    city = request.args.get("city", "").strip()
    return jsonify(resolve_city_region(city))

@app.route("/api/routing/overview", methods=["GET"])
def api_routing_overview():
    return jsonify(get_routing_overview())

# MODULE 1: DASHBOARD
@app.route("/api/dashboard", methods=["GET"])
@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    orders = get_global_orders_reconstructed()
    customers = get_all_customers()
    products = get_central_products()

    # Regional breakdown calculated strictly from DB
    regional_breakdown = {}
    regional_sales_total = 0.0
    for r in REGIONS:
        r_orders = [o for o in orders if o.get("region") == r]
        r_sales = sum(float(o.get("total_amount", 0)) for o in r_orders)
        regional_sales_total += r_sales
        regional_breakdown[r] = {
            "region": r,
            "order_count": len(r_orders),
            "total_sales": round(r_sales, 2),
            "site_status": "Online",
            "storage_node": f"{r.lower()}_site.db" if not USE_POSTGRES else f"PostgreSQL orders_{r.lower()}",
            "last_active": r_orders[0]["order_date"] if r_orders else "N/A"
        }

    # Gross sales strictly matches sum of regional sales
    total_gross_sales = round(regional_sales_total, 2)

    # Order Status Distribution
    status_counts = {}
    for o in orders:
        st = o.get("status", "Placed")
        status_counts[st] = status_counts.get(st, 0) + 1

    recent_txs = get_transaction_history(limit=5)

    return jsonify({
        "project": "DistriCommerce",
        "total_orders": len(orders),
        "total_customers": len(customers),
        "total_products": len(products),
        "total_gross_sales": total_gross_sales,
        "regional_breakdown": regional_breakdown,
        "status_distribution": status_counts,
        "recent_orders": orders[:7],
        "recent_transactions": recent_txs,
        "database_engine": get_db_mode()
    })

# MODULE 2: PLACE AN ORDER (GENERIC E-COMMERCE + DDBMS ALLOCATION)
@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json() or {}
    
    # 1. Product validation
    product_id = data.get("product_id")
    if not product_id:
        return jsonify({"error": "Missing required field: product_id"}), 400

    # 2. Quantity validation
    if "quantity" not in data or data["quantity"] is None:
        return jsonify({"error": "Missing required field: quantity"}), 400

    try:
        quantity = int(data["quantity"])
        if quantity <= 0:
            return jsonify({"error": "Quantity must be greater than zero."}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a positive integer."}), 400

    # 3. Check customer identification or generic input
    customer_name = (data.get("customer_name") or data.get("name") or "").strip()
    customer_id = data.get("customer_id")
    
    # If customer_id provided but no name, ensure valid
    if not customer_id and not customer_name:
        return jsonify({"error": "Please provide your Customer Name."}), 400

    # 4. Resolve delivery city & regional routing
    delivery_city = (data.get("delivery_city") or data.get("city") or data.get("region") or "").strip()
    if not delivery_city:
        delivery_city = "Pune"  # Default city if empty

    # Pass to database layer which performs authoritative stock checking & atomicity
    try:
        created_order = insert_regional_order(data)
        assigned_region = created_order["region"]
        return jsonify({
            "message": f"Order {created_order['order_id']} successfully placed! Dynamically routed to regional fragment 'orders_{assigned_region.lower()}'.",
            "order": created_order
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to insert order into regional fragment: {str(e)}"}), 500

# MODULE 3: ORDER MANAGEMENT
@app.route("/api/orders", methods=["GET"])
def get_orders():
    region_filter = request.args.get("region")
    city_filter = request.args.get("city")
    status_filter = request.args.get("status")
    search = request.args.get("search", "").strip().lower()
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    orders = get_global_orders_reconstructed()

    # Apply filters
    if region_filter and region_filter != "All":
        orders = [o for o in orders if o.get("region") == region_filter]

    if city_filter and city_filter != "All":
        orders = [o for o in orders if str(o.get("delivery_city", "")).lower() == city_filter.lower()]
    
    if status_filter and status_filter != "All":
        orders = [o for o in orders if o.get("status") == status_filter]

    if search:
        orders = [
            o for o in orders
            if search in str(o.get("order_id", "")).lower()
            or search in str(o.get("customer_name", "")).lower()
            or search in str(o.get("product_name", "")).lower()
            or search in str(o.get("delivery_city", "")).lower()
            or search in str(o.get("delivery_address", "")).lower()
        ]

    if start_date:
        orders = [o for o in orders if str(o.get("order_date", "")) >= start_date]

    if end_date:
        orders = [o for o in orders if str(o.get("order_date", "")) <= end_date + " 23:59:59"]

    return jsonify({"orders": orders, "count": len(orders)})

@app.route("/api/orders/<order_id>", methods=["GET"])
def get_single_order(order_id):
    orders = get_global_orders_reconstructed()
    match = next((o for o in orders if o.get("order_id") == order_id), None)
    if match:
        return jsonify({"order": match})
    return jsonify({"error": f"Order {order_id} not found."}), 404

@app.route("/api/orders/<order_id>", methods=["PUT"])
@app.route("/api/orders/<order_id>/status", methods=["PATCH"])
def change_order_status(order_id):
    data = request.get_json() or {}
    new_status = data.get("status")
    region = data.get("region")

    if not new_status:
        return jsonify({"error": "Missing new status."}), 400

    if not region:
        # Try finding region if not passed
        orders = get_global_orders_reconstructed()
        match = next((o for o in orders if o.get("order_id") == order_id), None)
        if match:
            region = match["region"]
        else:
            return jsonify({"error": f"Order {order_id} not found."}), 404

    success = update_order_status(order_id, region, new_status)
    if success:
        return jsonify({"message": f"Order {order_id} updated to {new_status}."})
    return jsonify({"error": f"Order {order_id} not found in fragment orders_{region.lower()}."}), 404

@app.route("/api/orders/<order_id>", methods=["DELETE"])
def remove_order(order_id):
    region = request.args.get("region")
    if not region:
        orders = get_global_orders_reconstructed()
        match = next((o for o in orders if o.get("order_id") == order_id), None)
        if match:
            region = match["region"]
        else:
            return jsonify({"error": "Region parameter is required to identify target partition fragment."}), 400

    success = delete_order(order_id, region)
    if success:
        return jsonify({"message": f"Demonstration order {order_id} deleted safely from orders_{region.lower()}."})
    return jsonify({"error": f"Order {order_id} not found in orders_{region.lower()}."}), 404

# MODULE 4: REGIONAL DATABASE
@app.route("/api/regions", methods=["GET"])
def get_regions():
    return jsonify({
        "regions": [
            {"name": "Pune", "fragment": "orders_pune", "node": "pune_site.db", "status": "Online", "cluster": "Western & Central-West Hub"},
            {"name": "Delhi", "fragment": "orders_delhi", "node": "delhi_site.db", "status": "Online", "cluster": "Northern & Upper-Central Hub"},
            {"name": "Chennai", "fragment": "orders_chennai", "node": "chennai_site.db", "status": "Online", "cluster": "Southern & Eastern Hub"}
        ]
    })

@app.route("/api/regions/<region>/orders", methods=["GET"])
@app.route("/api/regional/<region>/orders", methods=["GET"])
def get_regional_site_orders(region):
    if region not in REGIONS:
        return jsonify({"error": f"Invalid region: {region}"}), 400
    orders = get_orders_by_region(region)
    return jsonify({
        "region": region,
        "fragment_table": f"orders_{region.lower()}",
        "database_file": f"{region.lower()}_site.db" if not USE_POSTGRES else f"PostgreSQL {region} Partition",
        "query_executed": f"SELECT * FROM orders_{region.lower()} ORDER BY order_date DESC;",
        "orders": orders,
        "count": len(orders)
    })

@app.route("/api/regional/global-query", methods=["GET"])
def get_global_reconstruction_info():
    sql = """
SELECT order_id, customer_id, product_id, region, delivery_city, delivery_address, customer_name, quantity, unit_price, total_amount, order_date, status FROM orders_pune
UNION ALL
SELECT order_id, customer_id, product_id, region, delivery_city, delivery_address, customer_name, quantity, unit_price, total_amount, order_date, status FROM orders_delhi
UNION ALL
SELECT order_id, customer_id, product_id, region, delivery_city, delivery_address, customer_name, quantity, unit_price, total_amount, order_date, status FROM orders_chennai
ORDER BY order_date DESC;
    """.strip()
    return jsonify({
        "title": "Global Relation Reconstruction",
        "relational_algebra": "ORDERS = orders_pune ∪ orders_delhi ∪ orders_chennai",
        "sql_query": sql,
        "explanation": "Horizontally fragmented relations are reconstructed using relational UNION ALL to preserve all records without eliminating duplicates, since primary keys are guaranteed unique across fragments."
    })

# MODULE 5: DATA DISTRIBUTION & PARTITIONING DEMO
@app.route("/api/partitioning/simulate", methods=["POST"])
def simulate_partitioning():
    data = request.get_json() or {}
    sample_value = data.get("value", "")
    strategy = data.get("strategy", "round_robin")

    result = {}
    if strategy == "range":
        try:
            val = float(sample_value)
            if val < 20000:
                partition = "Partition 1: Economy Tier (< ₹20,000)"
                rule = "amount < 20000"
            elif val <= 100000:
                partition = "Partition 2: Mid-Range Tier (₹20,000 - ₹1,00,000)"
                rule = "20000 <= amount <= 100000"
            else:
                partition = "Partition 3: Premium Tier (> ₹1,00,000)"
                rule = "amount > 100000"
            result = {
                "strategy": "Range Partitioning",
                "input": val,
                "assigned_partition": partition,
                "rule": rule,
                "explanation": "Divides records based on continuous non-overlapping ranges of an attribute value."
            }
        except ValueError:
            result = {"error": "Range partitioning simulation requires a numeric amount."}

    elif strategy == "hash":
        key = str(sample_value)
        hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16)
        partition_num = hash_val % 3
        partitions = ["Partition A (Pune Node)", "Partition B (Delhi Node)", "Partition C (Chennai Node)"]
        result = {
            "strategy": "Hash Partitioning",
            "input": key,
            "hash_value": hash_val,
            "modulo_result": f"hash(key) % 3 = {partition_num}",
            "assigned_partition": partitions[partition_num],
            "explanation": "Applies a deterministic pseudo-random hash function to achieve uniform data scattering across nodes."
        }

    else:
        counter = int(data.get("sequence_number", 1))
        partition_num = counter % 3
        partitions = ["Node 1 (Pune)", "Node 2 (Delhi)", "Node 3 (Chennai)"]
        result = {
            "strategy": "Round-Robin Partitioning",
            "sequence_number": counter,
            "assigned_partition": partitions[partition_num],
            "rule": f"sequence({counter}) % 3 -> {partition_num}",
            "explanation": "Cycles sequentially through partition targets. Guarantees balanced tuple counts, but provides no point-query predicate pruning."
        }

    return jsonify(result)

# MODULE 6: PRODUCT REPLICATION
@app.route("/api/replication", methods=["GET"])
@app.route("/api/products", methods=["GET"])
def list_products():
    central = get_central_products()
    regional = {r: get_regional_products(r) for r in REGIONS}
    return jsonify({
        "central_products": central,
        "regional_replicas": regional,
        "replication_type": "Application-Level Master-Slave Replication",
        "description": "Central catalog serves as write master; regional replicas serve local read traffic."
    })

@app.route("/api/products/update", methods=["POST"])
def update_product():
    data = request.get_json() or {}
    product_id = data.get("product_id")
    price = data.get("price")
    stock = data.get("stock_quantity")
    
    if not product_id:
        return jsonify({"error": "Missing product_id"}), 400

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Update Central Master
    if USE_POSTGRES:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE products_central
            SET price = COALESCE(%s, price), stock_quantity = COALESCE(%s, stock_quantity), updated_at = %s
            WHERE product_id = %s
        """, (price, stock, now_str, product_id))
        conn.commit()
        cur.close()
        conn.close()
    else:
        conn = get_sqlite_conn(CENTRAL_DB_PATH)
        conn.execute("""
            UPDATE products_central
            SET price = COALESCE(?, price), stock_quantity = COALESCE(?, stock_quantity), updated_at = ?
            WHERE product_id = ?
        """, (price, stock, now_str, product_id))
        conn.commit()
        conn.close()

    auto_sync = data.get("auto_sync", False)
    sync_result = None
    if auto_sync:
        sync_result = sync_product_replicas(product_id)

    return jsonify({
        "message": f"Central product {product_id} updated.",
        "updated_at": now_str,
        "auto_synced": auto_sync,
        "sync_details": sync_result
    })

@app.route("/api/replication/sync", methods=["POST"])
@app.route("/api/products/sync", methods=["POST"])
def trigger_product_sync():
    data = request.get_json() or {}
    product_id = data.get("product_id")
    target_regions = data.get("regions")
    res = sync_product_replicas(product_id=product_id, target_regions=target_regions)
    return jsonify(res)

# MODULE 7: PARALLEL QUERY PROCESSING
@app.route("/api/parallel-query/sales", methods=["GET"])
def run_parallel_sales_query():
    result = execute_parallel_sales_aggregation()
    return jsonify(result)

# MODULE 8: DISTRIBUTED TRANSACTIONS (2PC)
@app.route("/api/transactions/start", methods=["POST"])
@app.route("/api/2pc/execute", methods=["POST"])
def execute_2pc_tx():
    data = request.get_json() or {}
    tx_type = data.get("tx_type", "CROSS_REGION_INVENTORY_TRANSFER")
    details = data.get("details", "Demo 2PC Transaction")
    participant_votes = data.get("participant_votes")
    simulate_crash_participant = data.get("simulate_crash_participant")

    result = TwoPhaseCommitCoordinator.execute_2pc(
        tx_type=tx_type,
        details=details,
        participant_votes=participant_votes,
        simulate_crash_participant=simulate_crash_participant
    )
    return jsonify(result)

@app.route("/api/transactions", methods=["GET"])
@app.route("/api/2pc/transactions", methods=["GET"])
def get_2pc_transactions():
    limit = int(request.args.get("limit", 20))
    txs = get_transaction_history(limit=limit)
    return jsonify({"transactions": txs, "count": len(txs)})

@app.route("/api/transactions/<tx_id>", methods=["GET"])
def get_single_transaction(tx_id):
    txs = get_transaction_history(limit=100)
    match = next((t for t in txs if t.get("tx_id") == tx_id), None)
    if match:
        return jsonify({"transaction": match})
    return jsonify({"error": f"Transaction {tx_id} not found."}), 404

# MODULE 9: TRANSACTION RECOVERY
@app.route("/api/transactions/<tx_id>/recover", methods=["POST"])
@app.route("/api/recovery/recover", methods=["POST"])
def trigger_recovery(tx_id=None):
    data = request.get_json() or {}
    participant = data.get("participant")
    target_tx_id = tx_id or data.get("tx_id")

    if not participant:
        return jsonify({"error": "Participant node name is required."}), 400

    result = TwoPhaseCommitCoordinator.recover_participant(participant=participant, tx_id=target_tx_id)
    return jsonify(result)

@app.route("/api/recovery/logs", methods=["GET"])
def list_recovery_logs():
    logs = get_recovery_logs(limit=25)
    return jsonify({"recovery_logs": logs, "count": len(logs)})

@app.route("/api/customers", methods=["GET"])
def list_customers():
    return jsonify({"customers": get_all_customers()})

if __name__ == "__main__":
    init_databases()
    print(f"Starting DistriCommerce API Server on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=True)
