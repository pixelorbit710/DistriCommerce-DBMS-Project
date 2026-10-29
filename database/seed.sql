-- ============================================================================
-- PROJECT: DistriCommerce - Multi-City E-Commerce Distributed DBMS
-- FILE:    seed.sql
-- PURPOSE: Realistic Seed Data for Customers, Products, Replicas, and Orders
-- ============================================================================

-- ============================================================================
-- 1. SEED CUSTOMERS
-- ============================================================================
INSERT INTO customers (customer_id, name, email, city, phone) VALUES
('CUST-101', 'Aarav Sharma', 'aarav.sharma@example.in', 'Pune', '+91 98201 11223'),
('CUST-102', 'Diya Patel', 'diya.patel@example.in', 'Mumbai', '+91 98201 22334'),
('CUST-103', 'Rohan Joshi', 'rohan.joshi@example.in', 'Nagpur', '+91 98201 33445'),
('CUST-104', 'Isha Verma', 'isha.verma@example.in', 'Delhi', '+91 98111 44556'),
('CUST-105', 'Kabir Malhotra', 'kabir.m@example.in', 'Jaipur', '+91 98111 55667'),
('CUST-106', 'Ananya Gupta', 'ananya.g@example.in', 'Lucknow', '+91 98111 66778'),
('CUST-107', 'Karthik Subramanian', 'karthik.s@example.in', 'Chennai', '+91 94440 77889'),
('CUST-108', 'Meera Natarajan', 'meera.n@example.in', 'Bengaluru', '+91 94440 88990'),
('CUST-109', 'Vignesh Raman', 'vignesh.r@example.in', 'Hyderabad', '+91 94440 99001'),
('CUST-110', 'Pooja Deshmukh', 'pooja.d@example.in', 'Nashik', '+91 98201 44332');

-- ============================================================================
-- 2. SEED CENTRAL MASTER CATALOG
-- ============================================================================
INSERT INTO products_central (product_id, name, category, price, stock_quantity, description, image_url, updated_at) VALUES
('PROD-101', 'MacBook Pro M3 Max', 'Electronics', 249999.00, 35, 'Apple M3 Max 14-Core CPU, 30-Core GPU, 36GB Unified Memory, 1TB SSD.', 'laptop', '2026-10-26 10:00:00'),
('PROD-102', 'Dell XPS 15 OLED', 'Electronics', 179999.00, 42, 'Intel Core i9 13th Gen, 3.5K OLED Touch, 32GB DDR5 RAM, 1TB NVMe SSD, RTX 4070.', 'laptop', '2026-10-26 10:00:00'),
('PROD-103', 'iPhone 16 Pro 256GB', 'Mobile', 119999.00, 80, 'Grade 5 Titanium finish, A18 Pro Bionic, 48MP Pro camera with 5x Telephoto.', 'smartphone', '2026-10-26 10:00:00'),
('PROD-104', 'Samsung Galaxy S25 Ultra', 'Mobile', 129999.00, 65, 'Snapdragon 8 Gen 4, 200MP Quad Camera, S-Pen included, 6.8-inch AMOLED 2X 120Hz.', 'smartphone', '2026-10-26 10:00:00'),
('PROD-105', 'Sony WH-1000XM5 ANC Headphones', 'Accessories', 26990.00, 110, 'Industry-leading noise cancellation with 8 mics, 30-hr battery, Multipoint pairing.', 'headphones', '2026-10-26 10:00:00'),
('PROD-106', 'Keychron K2 Mechanical Keyboard', 'Accessories', 8499.00, 140, '75% compact wireless mechanical keyboard, Gateron Brown tactile switches.', 'keyboard', '2026-10-26 10:00:00'),
('PROD-107', 'Logitech MX Master 3S Mouse', 'Accessories', 7995.00, 120, 'Quiet Click ergonomic wireless mouse, 8000 DPI Darkfield sensor, MagSpeed metal wheel.', 'mouse', '2026-10-26 10:00:00'),
('PROD-108', 'Ergonomic Mesh Office Chair', 'Furniture', 16499.00, 50, 'Breathable Korean mesh, dynamic lumbar support, 3D adjustable armrests, Class 4 gas lift.', 'chair', '2026-10-26 10:00:00'),
('PROD-109', 'Motorized Standing Desk 140x70', 'Furniture', 28999.00, 25, 'Dual electric motors, solid teak finish top, anti-collision sensor, 4 memory presets.', 'desk', '2026-10-26 10:00:00'),
('PROD-110', 'LG UltraFine 27-inch 4K Monitor', 'Electronics', 34999.00, 40, 'IPS panel, DCI-P3 95% wide gamut, HDR400, USB-C 90W power delivery.', 'monitor', '2026-10-26 10:00:00');

-- ============================================================================
-- 3. SEED REGIONAL PRODUCT REPLICAS (PUNE, DELHI, CHENNAI)
-- ============================================================================
INSERT INTO products_pune (product_id, name, category, price, stock_quantity, description, image_url, synced_at)
SELECT product_id, name, category, price, stock_quantity, description, image_url, '2026-10-26 10:05:00' FROM products_central;

INSERT INTO products_delhi (product_id, name, category, price, stock_quantity, description, image_url, synced_at)
SELECT product_id, name, category, price, stock_quantity, description, image_url, '2026-10-26 10:05:00' FROM products_central;

INSERT INTO products_chennai (product_id, name, category, price, stock_quantity, description, image_url, synced_at)
SELECT product_id, name, category, price, stock_quantity, description, image_url, '2026-10-26 10:05:00' FROM products_central;

-- ============================================================================
-- 4. SEED HORIZONTAL REGIONAL FRAGMENTS
-- Showcases multi-city customer delivery addresses across regional clusters
-- ============================================================================

-- Pune Regional Fragment (orders_pune - Western Hub)
INSERT INTO orders_pune (
    order_id, customer_id, customer_name, customer_phone, product_id, region,
    delivery_city, delivery_address, quantity, unit_price, total_amount, order_date, status
) VALUES
('ORD-PUN-00101', 'CUST-101', 'Aarav Sharma', '+91 98201 11223', 'PROD-101', 'Pune', 'Pune', 'Flat 402, Shivajinagar, Pune - 411005', 1, 249999.00, 249999.00, '2026-10-20 10:15:00', 'Delivered'),
('ORD-PUN-00102', 'CUST-102', 'Diya Patel', '+91 98201 22334', 'PROD-105', 'Pune', 'Mumbai', 'Bandra Kurla Complex, Tower B, Mumbai - 400051', 2, 26990.00, 53980.00, '2026-10-21 14:30:00', 'Delivered'),
('ORD-PUN-00103', 'CUST-103', 'Rohan Joshi', '+91 98201 33445', 'PROD-106', 'Pune', 'Nagpur', 'Plot 18, Civil Lines, Nagpur - 440001', 1, 8499.00, 8499.00, '2026-10-23 16:45:00', 'Shipped'),
('ORD-PUN-00104', 'CUST-110', 'Pooja Deshmukh', '+91 98201 44332', 'PROD-103', 'Pune', 'Nashik', 'Gangapur Road, Near KTHM College, Nashik - 422002', 1, 119999.00, 119999.00, '2026-10-25 09:20:00', 'Processing'),
('ORD-PUN-00105', 'CUST-101', 'Aarav Sharma', '+91 98201 11223', 'PROD-107', 'Pune', 'Pune', 'Kothrud Depot Road, Pune - 411038', 3, 7995.00, 23985.00, '2026-10-26 11:10:00', 'Placed');

-- Delhi Regional Fragment (orders_delhi - Northern Hub)
INSERT INTO orders_delhi (
    order_id, customer_id, customer_name, customer_phone, product_id, region,
    delivery_city, delivery_address, quantity, unit_price, total_amount, order_date, status
) VALUES
('ORD-DEL-00201', 'CUST-104', 'Isha Verma', '+91 98111 44556', 'PROD-103', 'Delhi', 'Delhi', 'C-45, Greater Kailash Part 1, New Delhi - 110048', 2, 119999.00, 239998.00, '2026-10-19 11:00:00', 'Delivered'),
('ORD-DEL-00202', 'CUST-105', 'Kabir Malhotra', '+91 98111 55667', 'PROD-108', 'Delhi', 'Jaipur', 'C-Scheme, Ashok Nagar, Jaipur - 302001', 1, 16499.00, 16499.00, '2026-10-22 13:15:00', 'Delivered'),
('ORD-DEL-00203', 'CUST-106', 'Ananya Gupta', '+91 98111 66778', 'PROD-102', 'Delhi', 'Lucknow', 'Gomti Nagar, Vibhuti Khand, Lucknow - 226010', 1, 179999.00, 179999.00, '2026-10-24 15:40:00', 'Shipped'),
('ORD-DEL-00204', 'CUST-104', 'Isha Verma', '+91 98111 44556', 'PROD-110', 'Delhi', 'Noida', 'Sector 62, Electronic City, Noida - 201309', 1, 34999.00, 34999.00, '2026-10-25 18:25:00', 'Processing'),
('ORD-DEL-00205', 'CUST-105', 'Kabir Malhotra', '+91 98111 55667', 'PROD-104', 'Delhi', 'Chandigarh', 'Sector 17-C, Commercial Plaza, Chandigarh - 160017', 1, 129999.00, 129999.00, '2026-10-26 14:05:00', 'Placed');

-- Chennai Regional Fragment (orders_chennai - Southern Hub)
INSERT INTO orders_chennai (
    order_id, customer_id, customer_name, customer_phone, product_id, region,
    delivery_city, delivery_address, quantity, unit_price, total_amount, order_date, status
) VALUES
('ORD-CHE-00301', 'CUST-107', 'Karthik Subramanian', '+91 94440 77889', 'PROD-104', 'Chennai', 'Chennai', 'Anna Nagar West, 2nd Avenue, Chennai - 600040', 1, 129999.00, 129999.00, '2026-10-18 10:45:00', 'Delivered'),
('ORD-CHE-00302', 'CUST-108', 'Meera Natarajan', '+91 94440 88990', 'PROD-109', 'Chennai', 'Bengaluru', 'Indiranagar 100ft Road, Bengaluru - 560038', 1, 28999.00, 28999.00, '2026-10-21 16:10:00', 'Delivered'),
('ORD-CHE-00303', 'CUST-109', 'Vignesh Raman', '+91 94440 99001', 'PROD-105', 'Chennai', 'Hyderabad', 'HITEC City, Madhapur, Hyderabad - 500081', 2, 26990.00, 53980.00, '2026-10-23 11:35:00', 'Shipped'),
('ORD-CHE-00304', 'CUST-107', 'Karthik Subramanian', '+91 94440 77889', 'PROD-107', 'Chennai', 'Kolkata', 'Salt Lake Sector V, Kolkata - 700091', 1, 7995.00, 7995.00, '2026-10-25 17:00:00', 'Processing'),
('ORD-CHE-00305', 'CUST-108', 'Meera Natarajan', '+91 94440 88990', 'PROD-101', 'Chennai', 'Chennai', 'Adyar, Gandhi Nagar, Chennai - 600020', 1, 249999.00, 249999.00, '2026-10-26 15:50:00', 'Placed');

-- ============================================================================
-- 5. SEED DISTRIBUTED 2PC LOGS
-- ============================================================================
INSERT INTO distributed_transactions (tx_id, tx_type, coordinator, status, decision, start_time, end_time, details) VALUES
('GTX-20261026-001', 'CROSS_REGION_STOCK_REBALANCING', 'Central-Coordinator', 'COMMITTED', 'GLOBAL_COMMIT', '2026-10-26 21:00:00', '2026-10-26 21:00:01', 'Rebalancing stock of PROD-103 across Pune & Delhi'),
('GTX-20261026-002', 'MULTI_SITE_ORDER_DISPATCH', 'Central-Coordinator', 'ABORTED', 'GLOBAL_ABORT', '2026-10-26 21:30:00', '2026-10-26 21:30:01', 'Participant Delhi-Node voted VOTE_ABORT due to local lock conflict');

INSERT INTO participant_votes (tx_id, participant, vote, state, vote_timestamp) VALUES
('GTX-20261026-001', 'Pune-Node', 'VOTE_COMMIT', 'COMMITTED', '2026-10-26 21:00:00'),
('GTX-20261026-001', 'Delhi-Node', 'VOTE_COMMIT', 'COMMITTED', '2026-10-26 21:00:00'),
('GTX-20261026-001', 'Chennai-Node', 'VOTE_COMMIT', 'COMMITTED', '2026-10-26 21:00:00'),
('GTX-20261026-002', 'Pune-Node', 'VOTE_COMMIT', 'ABORTED', '2026-10-26 21:30:00'),
('GTX-20261026-002', 'Delhi-Node', 'VOTE_ABORT', 'ABORTED', '2026-10-26 21:30:00'),
('GTX-20261026-002', 'Chennai-Node', 'VOTE_COMMIT', 'ABORTED', '2026-10-26 21:30:00');

INSERT INTO recovery_logs (tx_id, participant, failure_type, recovery_action, resolved_state, logged_at, message) VALUES
('GTX-20261026-002', 'Delhi-Node', 'SITE_FAILURE_IN_DOUBT', 'CONSULTED_COORDINATOR_WAL', 'ABORTED', '2026-10-26 21:30:05', 'Recovered from in-doubt state by reading coordinator GLOBAL_ABORT log.');
