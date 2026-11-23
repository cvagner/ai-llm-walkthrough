#!/bin/bash
set -e

echo "🏪 Initializing demo business data..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create schema for demo business data
    CREATE SCHEMA IF NOT EXISTS demo;
    
    -- Stores with locations
    CREATE TABLE IF NOT EXISTS demo.stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        type VARCHAR(50),
        address VARCHAR(200),
        city VARCHAR(100),
        phone VARCHAR(20),
        rating DECIMAL(2,1),
        geom GEOMETRY(Point, 4326)
    );
    
    -- Products
    CREATE TABLE IF NOT EXISTS demo.products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        category VARCHAR(50),
        price DECIMAL(10,2),
        stock INTEGER,
        description TEXT
    );
    
    -- Store inventory (which products are in which store)
    CREATE TABLE IF NOT EXISTS demo.store_inventory (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES demo.stores(id),
        product_id INTEGER REFERENCES demo.products(id),
        quantity INTEGER,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Sales transactions
    CREATE TABLE IF NOT EXISTS demo.sales (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES demo.stores(id),
        product_id INTEGER REFERENCES demo.products(id),
        quantity INTEGER,
        total_amount DECIMAL(10,2),
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Insert sample stores (Paris area)
    INSERT INTO demo.stores (name, type, address, city, phone, rating, geom) VALUES
    ('TechStore Central', 'Electronics', '123 Rue de Rivoli', 'Paris', '+33 1 42 60 00 00', 4.5,
     ST_GeomFromText('POINT(2.3522 48.8566)', 4326)),
    ('BookWorld Montparnasse', 'Bookstore', '45 Boulevard du Montparnasse', 'Paris', '+33 1 43 20 00 00', 4.2,
     ST_GeomFromText('POINT(2.3200 48.8420)', 4326)),
    ('FashionHub Champs-Élysées', 'Clothing', '78 Avenue des Champs-Élysées', 'Paris', '+33 1 53 75 00 00', 4.7,
     ST_GeomFromText('POINT(2.3070 48.8698)', 4326)),
    ('GourmetMarket Marais', 'Grocery', '34 Rue des Francs Bourgeois', 'Paris', '+33 1 48 87 00 00', 4.4,
     ST_GeomFromText('POINT(2.3625 48.8566)', 4326)),
    ('SportsZone Bercy', 'Sports', '12 Rue de Bercy', 'Paris', '+33 1 53 17 00 00', 4.3,
     ST_GeomFromText('POINT(2.3790 48.8400)', 4326));
    
    -- Insert sample products
    INSERT INTO demo.products (name, category, price, stock, description) VALUES
    ('Laptop Pro 15', 'Electronics', 1299.99, 50, 'High-performance laptop with 16GB RAM'),
    ('Wireless Mouse', 'Electronics', 29.99, 200, 'Ergonomic wireless mouse with USB receiver'),
    ('Python Programming Guide', 'Books', 45.50, 100, 'Complete guide to Python programming'),
    ('Running Shoes', 'Sports', 89.99, 75, 'Professional running shoes with cushioning'),
    ('Organic Coffee Beans', 'Grocery', 12.99, 150, '1kg premium organic coffee beans'),
    ('Yoga Mat', 'Sports', 34.99, 60, 'Non-slip yoga mat with carrying strap'),
    ('Smart Watch', 'Electronics', 249.99, 30, 'Fitness tracker with heart rate monitor'),
    ('Winter Jacket', 'Clothing', 159.99, 40, 'Waterproof winter jacket with insulation'),
    ('SQL Cookbook', 'Books', 38.75, 80, 'Advanced SQL queries and techniques'),
    ('Bluetooth Speaker', 'Electronics', 79.99, 90, 'Portable speaker with 12-hour battery');
    
    -- Insert inventory data (distribute products across stores)
    INSERT INTO demo.store_inventory (store_id, product_id, quantity) VALUES
    (1, 1, 15), (1, 2, 50), (1, 7, 20), (1, 10, 25),
    (2, 3, 40), (2, 9, 30),
    (3, 8, 25),
    (4, 5, 100),
    (5, 4, 35), (5, 6, 40);
    
    -- Insert sample sales
    INSERT INTO demo.sales (store_id, product_id, quantity, total_amount, sale_date) VALUES
    (1, 1, 2, 2599.98, NOW() - INTERVAL '1 day'),
    (1, 2, 5, 149.95, NOW() - INTERVAL '2 days'),
    (2, 3, 3, 136.50, NOW() - INTERVAL '1 day'),
    (3, 8, 1, 159.99, NOW() - INTERVAL '3 hours'),
    (5, 4, 2, 179.98, NOW() - INTERVAL '5 hours');
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_stores_geom ON demo.stores USING GIST (geom);
    CREATE INDEX IF NOT EXISTS idx_stores_type ON demo.stores(type);
    CREATE INDEX IF NOT EXISTS idx_products_category ON demo.products(category);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON demo.sales(sale_date);
    
    -- Useful views
    CREATE OR REPLACE VIEW demo.store_product_availability AS
    SELECT 
        s.name AS store_name,
        s.city,
        p.name AS product_name,
        p.category,
        p.price,
        si.quantity AS in_stock
    FROM demo.stores s
    JOIN demo.store_inventory si ON s.id = si.store_id
    JOIN demo.products p ON si.product_id = p.id
    WHERE si.quantity > 0;
    
    CREATE OR REPLACE VIEW demo.sales_summary AS
    SELECT 
        s.name AS store_name,
        p.name AS product_name,
        p.category,
        SUM(sa.quantity) AS units_sold,
        SUM(sa.total_amount) AS revenue,
        COUNT(*) AS transactions
    FROM demo.sales sa
    JOIN demo.stores s ON sa.store_id = s.id
    JOIN demo.products p ON sa.product_id = p.id
    GROUP BY s.name, p.name, p.category;
    
    -- Grant permissions
    GRANT USAGE ON SCHEMA demo TO PUBLIC;
    GRANT SELECT ON ALL TABLES IN SCHEMA demo TO PUBLIC;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA demo TO PUBLIC;
    
EOSQL

echo "✅ Demo business data initialized successfully!"
echo "🛍️ Sample queries you can try with your LLM:"
echo "  - SELECT * FROM demo.store_product_availability WHERE category = 'Electronics';"
echo "  - SELECT store_name, SUM(revenue) FROM demo.sales_summary GROUP BY store_name;"
echo "  - Find stores near a location: SELECT name FROM demo.stores WHERE ST_DWithin(geom::geography, ST_MakePoint(2.35, 48.85)::geography, 1000);"
