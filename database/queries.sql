-- ============================================================================
-- PROJECT: DistriCommerce - Multi-City E-Commerce Distributed DBMS
-- FILE:    queries.sql
-- PURPOSE: Key DBMS SQL Queries Demonstrating Distributed Relational Operations
-- ============================================================================

-- ============================================================================
-- QUERY 1: LISTING ORDERS BY REGION (Predicate Pushdown to Regional Fragment)
-- ============================================================================
-- Pune Fragment Scan (Western Hub)
SELECT order_id, customer_id, customer_name, delivery_city, delivery_address, product_id, quantity, total_amount, order_date, status
FROM orders_pune
ORDER BY order_date DESC;

-- Delhi Fragment Scan (Northern Hub)
SELECT order_id, customer_id, customer_name, delivery_city, delivery_address, product_id, quantity, total_amount, order_date, status
FROM orders_delhi
ORDER BY order_date DESC;

-- Chennai Fragment Scan (Southern Hub)
SELECT order_id, customer_id, customer_name, delivery_city, delivery_address, product_id, quantity, total_amount, order_date, status
FROM orders_chennai
ORDER BY order_date DESC;


-- ============================================================================
-- QUERY 2: THREE-WAY DISTRIBUTED JOIN (Customers + Reconstructed Orders + Products)
-- ============================================================================
SELECT 
    o.order_id,
    COALESCE(o.customer_name, c.name) AS customer_name,
    o.delivery_city,
    o.delivery_address,
    p.name AS product_name,
    p.category AS product_category,
    o.region AS storage_hub_node,
    o.quantity,
    o.unit_price,
    o.total_amount,
    o.order_date,
    o.status
FROM (
    SELECT order_id, customer_id, customer_name, delivery_city, delivery_address, product_id, region, quantity, unit_price, total_amount, order_date, status FROM orders_pune
    UNION ALL
    SELECT order_id, customer_id, customer_name, delivery_city, delivery_address, product_id, region, quantity, unit_price, total_amount, order_date, status FROM orders_delhi
    UNION ALL
    SELECT order_id, customer_id, customer_name, delivery_city, delivery_address, product_id, region, quantity, unit_price, total_amount, order_date, status FROM orders_chennai
) o
LEFT JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN products_central p ON o.product_id = p.product_id
ORDER BY o.order_date DESC;


-- ============================================================================
-- QUERY 3: CALCULATING GLOBAL GROSS SALES ACROSS ALL REGIONAL HUBS
-- ============================================================================
SELECT 
    COUNT(order_id) AS total_orders_placed,
    SUM(quantity) AS total_units_sold,
    ROUND(SUM(total_amount), 2) AS global_gross_sales
FROM (
    SELECT order_id, quantity, total_amount FROM orders_pune
    UNION ALL
    SELECT order_id, quantity, total_amount FROM orders_delhi
    UNION ALL
    SELECT order_id, quantity, total_amount FROM orders_chennai
) global_orders;


-- ============================================================================
-- QUERY 4: PARALLEL SALES AGGREGATION PER PRODUCT ACROSS ALL REGIONS
-- ============================================================================
-- This query is decomposed into regional subqueries and merged at coordinator
SELECT 
    p.product_id,
    p.name AS product_name,
    p.category,
    SUM(o.quantity) AS total_units_sold,
    ROUND(SUM(o.total_amount), 2) AS total_product_sales,
    COUNT(o.order_id) AS total_orders
FROM products_central p
JOIN (
    SELECT product_id, quantity, total_amount, order_id FROM orders_pune
    UNION ALL
    SELECT product_id, quantity, total_amount, order_id FROM orders_delhi
    UNION ALL
    SELECT product_id, quantity, total_amount, order_id FROM orders_chennai
) o ON p.product_id = o.product_id
GROUP BY p.product_id, p.name, p.category
ORDER BY total_product_sales DESC;


-- ============================================================================
-- QUERY 5: ORDER VOLUME COUNT BY STORAGE REGION NODE
-- ============================================================================
SELECT 
    region,
    COUNT(order_id) AS total_orders,
    ROUND(SUM(total_amount), 2) AS regional_gross_sales
FROM (
    SELECT order_id, region, total_amount FROM orders_pune
    UNION ALL
    SELECT order_id, region, total_amount FROM orders_delhi
    UNION ALL
    SELECT order_id, region, total_amount FROM orders_chennai
) o
GROUP BY region
ORDER BY total_orders DESC;


-- ============================================================================
-- QUERY 6: FINDING ORDERS BY ARBITRARY CUSTOMER DELIVERY CITY
-- ============================================================================
-- Demonstrates querying orders by actual delivery cities (e.g. Nagpur, Mumbai, Jaipur, Bengaluru)
SELECT 
    delivery_city,
    region AS storage_hub_node,
    COUNT(order_id) AS orders_in_city,
    ROUND(SUM(total_amount), 2) AS city_gross_revenue
FROM (
    SELECT order_id, delivery_city, region, total_amount FROM orders_pune
    UNION ALL
    SELECT order_id, delivery_city, region, total_amount FROM orders_delhi
    UNION ALL
    SELECT order_id, delivery_city, region, total_amount FROM orders_chennai
) o
GROUP BY delivery_city, region
ORDER BY city_gross_revenue DESC;


-- ============================================================================
-- QUERY 7: RECONSTRUCTING COMPLETE GLOBAL ORDERS RELATION (UNION ALL)
-- ============================================================================
SELECT order_id, customer_id, customer_name, product_id, region, delivery_city, delivery_address, quantity, unit_price, total_amount, order_date, status FROM orders_pune
UNION ALL
SELECT order_id, customer_id, customer_name, product_id, region, delivery_city, delivery_address, quantity, unit_price, total_amount, order_date, status FROM orders_delhi
UNION ALL
SELECT order_id, customer_id, customer_name, product_id, region, delivery_city, delivery_address, quantity, unit_price, total_amount, order_date, status FROM orders_chennai
ORDER BY order_date DESC;


-- ============================================================================
-- QUERY 8: PRODUCT REPLICATION CONSISTENCY AUDIT
-- ============================================================================
SELECT 
    c.product_id,
    c.name AS master_product_name,
    c.price AS master_price,
    c.stock_quantity AS master_stock,
    p.price AS pune_price,
    d.price AS delhi_price,
    ch.price AS chennai_price,
    CASE 
        WHEN c.price = p.price AND c.price = d.price AND c.price = ch.price 
             AND c.stock_quantity = p.stock_quantity AND c.stock_quantity = d.stock_quantity AND c.stock_quantity = ch.stock_quantity
        THEN 'IN_SYNC'
        ELSE 'OUT_OF_SYNC_DRIFT_DETECTED'
    END AS replica_sync_status
FROM products_central c
LEFT JOIN products_pune p ON c.product_id = p.product_id
LEFT JOIN products_delhi d ON c.product_id = d.product_id
LEFT JOIN products_chennai ch ON c.product_id = ch.product_id
ORDER BY c.product_id ASC;
