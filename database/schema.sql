-- ============================================================================
-- PROJECT: DistriCommerce - Multi-City E-Commerce Distributed DBMS
-- FILE:    schema.sql
-- PURPOSE: Relational Schema DDL for PostgreSQL & Multi-Node SQLite Engine
-- ============================================================================

-- ============================================================================
-- 1. CENTRAL COORDINATOR ENTITIES
-- ============================================================================

-- Global Customers Directory (Central Authoritative Master)
CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    city VARCHAR(50) NOT NULL,
    phone VARCHAR(25)
);

-- Central Master Product Catalog (Authoritative Write Master)
CREATE TABLE IF NOT EXISTS products_central (
    product_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    stock_quantity INT NOT NULL CHECK (stock_quantity >= 0),
    description TEXT,
    image_url VARCHAR(255),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. PRODUCT REPLICATION ENTITIES (Read Replicas across Regional Sites)
-- ============================================================================

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

-- ============================================================================
-- 3. HORIZONTAL REGIONAL ORDER FRAGMENTS (Disjoint Partitioning by Region)
-- Each fragment preserves the customer's actual delivery city and address
-- while being routed to its designated regional node.
-- ============================================================================

-- Pune Regional Fragment: Western Hub (region = 'Pune')
CREATE TABLE IF NOT EXISTS orders_pune (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    region VARCHAR(20) NOT NULL CHECK (region = 'Pune'),
    delivery_city VARCHAR(100) NOT NULL DEFAULT 'Pune',
    delivery_address TEXT,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(25),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    order_date TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Placed',
    CONSTRAINT fk_pune_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_pune_product FOREIGN KEY (product_id) REFERENCES products_central(product_id)
);

-- Delhi Regional Fragment: Northern Hub (region = 'Delhi')
CREATE TABLE IF NOT EXISTS orders_delhi (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    region VARCHAR(20) NOT NULL CHECK (region = 'Delhi'),
    delivery_city VARCHAR(100) NOT NULL DEFAULT 'Delhi',
    delivery_address TEXT,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(25),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    order_date TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Placed',
    CONSTRAINT fk_delhi_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_delhi_product FOREIGN KEY (product_id) REFERENCES products_central(product_id)
);

-- Chennai Regional Fragment: Southern Hub (region = 'Chennai')
CREATE TABLE IF NOT EXISTS orders_chennai (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    region VARCHAR(20) NOT NULL CHECK (region = 'Chennai'),
    delivery_city VARCHAR(100) NOT NULL DEFAULT 'Chennai',
    delivery_address TEXT,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(25),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    order_date TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Placed',
    CONSTRAINT fk_chennai_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_chennai_product FOREIGN KEY (product_id) REFERENCES products_central(product_id)
);

-- ============================================================================
-- 4. GLOBAL RECONSTRUCTED VIEW (UNION ALL)
-- ============================================================================

CREATE OR REPLACE VIEW orders_global AS
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
FROM orders_chennai;

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pune_date ON orders_pune(order_date);
CREATE INDEX IF NOT EXISTS idx_pune_city ON orders_pune(delivery_city);
CREATE INDEX IF NOT EXISTS idx_pune_cust ON orders_pune(customer_id);

CREATE INDEX IF NOT EXISTS idx_delhi_date ON orders_delhi(order_date);
CREATE INDEX IF NOT EXISTS idx_delhi_city ON orders_delhi(delivery_city);
CREATE INDEX IF NOT EXISTS idx_delhi_cust ON orders_delhi(customer_id);

CREATE INDEX IF NOT EXISTS idx_chennai_date ON orders_chennai(order_date);
CREATE INDEX IF NOT EXISTS idx_chennai_city ON orders_chennai(delivery_city);
CREATE INDEX IF NOT EXISTS idx_chennai_cust ON orders_chennai(customer_id);

-- ============================================================================
-- 6. DISTRIBUTED TRANSACTIONS (2PC LOGGING & WAL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS distributed_transactions (
    tx_id VARCHAR(50) PRIMARY KEY,
    tx_type VARCHAR(50) NOT NULL,
    coordinator VARCHAR(50) NOT NULL DEFAULT 'Central-Coordinator',
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
