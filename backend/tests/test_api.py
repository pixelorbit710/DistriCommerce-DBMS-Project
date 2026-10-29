import pytest
import json
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import app
from database import init_databases, get_orders_by_region
from coordinator import TwoPhaseCommitCoordinator

@pytest.fixture
def client():
    app.config["TESTING"] = True
    init_databases()
    with app.test_client() as client:
        yield client

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert "engine" in data
    assert "Pune" in data["regions"]
    assert "Delhi" in data["regions"]
    assert "Chennai" in data["regions"]

def test_dashboard_stats(client):
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total_orders"] >= 15
    assert data["total_customers"] >= 10
    assert data["total_products"] >= 10
    assert data["total_gross_sales"] > 0
    assert "Pune" in data["regional_breakdown"]
    assert "Delhi" in data["regional_breakdown"]
    assert "Chennai" in data["regional_breakdown"]
    # Check that sum of regional order counts matches total orders
    reg_sum = sum(data["regional_breakdown"][r]["order_count"] for r in ["Pune", "Delhi", "Chennai"])
    assert reg_sum == data["total_orders"]

def test_order_creation_horizontal_routing(client):
    # Test inserting an order for Pune
    order_payload = {
        "customer_id": "CUST-101",
        "product_id": "PROD-106",
        "region": "Pune",
        "quantity": 2,
        "unit_price": 8499.00
    }
    response = client.post("/api/orders", json=order_payload)
    assert response.status_code == 201
    res_data = response.get_json()
    assert "target_fragment" in res_data["order"]
    assert res_data["order"]["target_fragment"] == "orders_pune"
    assert res_data["order"]["total_amount"] == 16998.00

    # Verify that the order is actually inside the Pune fragment
    pune_orders = get_orders_by_region("Pune")
    created_id = res_data["order"]["order_id"]
    assert any(o["order_id"] == created_id for o in pune_orders)

def test_global_orders_reconstruction(client):
    response = client.get("/api/orders")
    assert response.status_code == 200
    data = response.get_json()
    assert "orders" in data
    assert len(data["orders"]) >= 15

    # Check regional filter
    pune_res = client.get("/api/orders?region=Pune")
    assert pune_res.status_code == 200
    p_orders = pune_res.get_json()["orders"]
    assert all(o["region"] == "Pune" for o in p_orders)

def test_order_status_update_and_delete(client):
    # Create a temporary test order
    test_order = {
        "customer_id": "CUST-104",
        "product_id": "PROD-107",
        "region": "Delhi",
        "quantity": 1,
        "unit_price": 7995.00
    }
    create_res = client.post("/api/orders", json=test_order)
    assert create_res.status_code == 201
    order_id = create_res.get_json()["order"]["order_id"]

    # Update status to Shipped
    update_res = client.patch(f"/api/orders/{order_id}/status", json={"status": "Shipped", "region": "Delhi"})
    assert update_res.status_code == 200

    # Delete order safely
    del_res = client.delete(f"/api/orders/{order_id}?region=Delhi")
    assert del_res.status_code == 200

def test_product_replication_and_sync(client):
    # Fetch products
    res = client.get("/api/products")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["central_products"]) >= 10
    assert "Pune" in data["regional_replicas"]
    assert "Delhi" in data["regional_replicas"]
    assert "Chennai" in data["regional_replicas"]

    # Trigger replication sync
    sync_res = client.post("/api/products/sync", json={"product_id": "PROD-101"})
    assert sync_res.status_code == 200
    sync_data = sync_res.get_json()
    assert "regions" in sync_data

def test_parallel_query_processing(client):
    response = client.get("/api/parallel-query/sales")
    assert response.status_code == 200
    data = response.get_json()
    assert "parallel_duration_ms" in data
    assert "regional_partial_aggregates" in data
    assert "combined_final_aggregates" in data
    assert "Pune" in data["regional_partial_aggregates"]
    assert "Delhi" in data["regional_partial_aggregates"]
    assert "Chennai" in data["regional_partial_aggregates"]
    assert len(data["combined_final_aggregates"]) > 0

def test_two_phase_commit_commit_decision(client):
    # Unanimous COMMIT votes
    payload = {
        "tx_type": "TEST_DISTRIBUTED_ORDER",
        "details": "Testing unanimous 2PC commit",
        "participant_votes": {
            "Pune-Node": "VOTE_COMMIT",
            "Delhi-Node": "VOTE_COMMIT",
            "Chennai-Node": "VOTE_COMMIT"
        }
    }
    response = client.post("/api/2pc/execute", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["decision"] == "GLOBAL_COMMIT"
    assert data["status"] == "COMMITTED"
    assert len(data["events"]) >= 6

def test_two_phase_commit_abort_decision(client):
    # One participant votes ABORT -> must result in GLOBAL_ABORT
    payload = {
        "tx_type": "TEST_FAILED_ALLOCATION",
        "details": "Testing abort propagation",
        "participant_votes": {
            "Pune-Node": "VOTE_COMMIT",
            "Delhi-Node": "VOTE_ABORT",
            "Chennai-Node": "VOTE_COMMIT"
        }
    }
    response = client.post("/api/2pc/execute", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["decision"] == "GLOBAL_ABORT"
    assert data["status"] == "ABORTED"

def test_transaction_recovery_protocol(client):
    # 1. Simulate a transaction where Pune crashes in READY state
    sim_payload = {
        "tx_type": "CRASH_SIMULATION_TX",
        "details": "Pune crashes after voting READY",
        "simulate_crash_participant": "Pune-Node",
        "participant_votes": {
            "Pune-Node": "VOTE_COMMIT",
            "Delhi-Node": "VOTE_COMMIT",
            "Chennai-Node": "VOTE_COMMIT"
        }
    }
    sim_res = client.post("/api/2pc/execute", json=sim_payload)
    assert sim_res.status_code == 200
    tx_id = sim_res.get_json()["tx_id"]

    # 2. Trigger recovery for Pune-Node
    rec_payload = {
        "participant": "Pune-Node",
        "tx_id": tx_id
    }
    rec_res = client.post("/api/recovery/recover", json=rec_payload)
    assert rec_res.status_code == 200
    rec_data = rec_res.get_json()
    assert rec_data["recovered"] is True
    assert rec_data["decision_found"] == "GLOBAL_COMMIT"
    assert rec_data["resolved_state"] == "COMMITTED"


# ============================================================================
# NEW GENERIC E-COMMERCE & DISTRIBUTED ROUTING TESTS
# ============================================================================

def test_generic_order_with_new_customer(client):
    """Test A: User enters completely new customer details without selecting predefined ID."""
    payload = {
        "customer_name": "Riya Pardhi",
        "delivery_city": "Nagpur",
        "delivery_address": "Flat 402, Green Acres, Wardha Road, Nagpur - 440015",
        "customer_phone": "+91 98765 43210",
        "customer_email": "riya.pardhi@rscoe.ac.in",
        "product_id": "PROD-105",
        "quantity": 1
    }
    response = client.post("/api/orders", json=payload)
    assert response.status_code == 201
    data = response.get_json()["order"]
    assert data["customer_name"] == "Riya Pardhi"
    assert data["delivery_city"] == "Nagpur"
    assert data["delivery_address"] == "Flat 402, Green Acres, Wardha Road, Nagpur - 440015"
    assert data["region"] == "Pune"  # Nagpur mapped to Pune Western hub
    assert data["target_fragment"] == "orders_pune"
    assert data["total_amount"] > 0
    assert "CUST-" in data["customer_id"]

def test_arbitrary_city_nagpur_routing(client):
    """Test B: Arbitrary delivery city Nagpur is routed to Pune node."""
    res = client.get("/api/routing/resolve?city=Nagpur")
    assert res.status_code == 200
    info = res.get_json()
    assert info["assigned_region"] == "Pune"
    assert info["input_city"] == "Nagpur"
    assert info["is_fallback"] is False

def test_arbitrary_city_jaipur_and_bengaluru_routing(client):
    """Test C: Arbitrary cities Jaipur (Delhi node) and Bengaluru (Chennai node)."""
    # Jaipur -> Delhi
    res_jaipur = client.get("/api/routing/resolve?city=Jaipur")
    assert res_jaipur.status_code == 200
    assert res_jaipur.get_json()["assigned_region"] == "Delhi"

    # Bengaluru -> Chennai
    res_blr = client.get("/api/routing/resolve?city=Bengaluru")
    assert res_blr.status_code == 200
    assert res_blr.get_json()["assigned_region"] == "Chennai"

def test_unknown_city_fallback_routing(client):
    """Test D: Unknown city routes to default gateway hub (Pune) while preserving original city."""
    payload = {
        "customer_name": "Aditi Gite",
        "delivery_city": "Port Blair",
        "delivery_address": "Aberdeen Bazaar, Port Blair - 744101",
        "product_id": "PROD-106",
        "quantity": 1
    }
    response = client.post("/api/orders", json=payload)
    assert response.status_code == 201
    order = response.get_json()["order"]
    assert order["delivery_city"] == "Port Blair"  # Original city preserved!
    assert order["region"] == "Pune"               # Fallback regional node
    assert order["target_fragment"] == "orders_pune"
    assert order["is_fallback_routing"] is True

def test_order_input_validation(client):
    """Test E: Reject submissions without product, customer name, or with non-positive quantities."""
    # Missing product
    res1 = client.post("/api/orders", json={"customer_name": "Test", "quantity": 1})
    assert res1.status_code == 400

    # Negative quantity
    res2 = client.post("/api/orders", json={"customer_name": "Test", "product_id": "PROD-101", "quantity": -5})
    assert res2.status_code == 400

    # Zero quantity
    res3 = client.post("/api/orders", json={"customer_name": "Test", "product_id": "PROD-101", "quantity": 0})
    assert res3.status_code == 400

def test_inventory_check_and_deduction(client):
    """Test F: Reject order exceeding inventory; verify inventory decrement on success."""
    # 1. Fetch current stock of PROD-108
    prods = client.get("/api/products").get_json()["central_products"]
    prod_108 = next(p for p in prods if p["product_id"] == "PROD-108")
    stock_before = prod_108["stock_quantity"]

    # 2. Attempt to order more than available stock -> must be rejected!
    excess_payload = {
        "customer_name": "Pooja Jagtap",
        "delivery_city": "Pune",
        "product_id": "PROD-108",
        "quantity": stock_before + 50
    }
    excess_res = client.post("/api/orders", json=excess_payload)
    assert excess_res.status_code == 400
    assert "Insufficient stock" in excess_res.get_json()["error"]

    # 3. Order valid quantity (1) -> stock must be decremented
    valid_payload = {
        "customer_name": "Pooja Jagtap",
        "delivery_city": "Pune",
        "product_id": "PROD-108",
        "quantity": 1
    }
    valid_res = client.post("/api/orders", json=valid_payload)
    assert valid_res.status_code == 201

    # Verify stock decremented by 1
    prods_after = client.get("/api/products").get_json()["central_products"]
    prod_108_after = next(p for p in prods_after if p["product_id"] == "PROD-108")
    assert prod_108_after["stock_quantity"] == stock_before - 1

def test_order_cancellation_restores_inventory(client):
    """Test G: Cancelling an order restores the inventory in the central catalog and replicas."""
    # Place an order for PROD-109 with quantity 2
    prods = client.get("/api/products").get_json()["central_products"]
    stock_init = next(p for p in prods if p["product_id"] == "PROD-109")["stock_quantity"]

    order_payload = {
        "customer_name": "Shanitej Patil",
        "delivery_city": "Kolhapur",
        "product_id": "PROD-109",
        "quantity": 2
    }
    res = client.post("/api/orders", json=order_payload)
    assert res.status_code == 201
    created = res.get_json()["order"]
    order_id = created["order_id"]
    region = created["region"]

    # Cancel order
    cancel_res = client.patch(f"/api/orders/{order_id}/status", json={"status": "Cancelled", "region": region})
    assert cancel_res.status_code == 200

    # Verify inventory was restored
    prods_final = client.get("/api/products").get_json()["central_products"]
    stock_final = next(p for p in prods_final if p["product_id"] == "PROD-109")["stock_quantity"]
    assert stock_final == stock_init
