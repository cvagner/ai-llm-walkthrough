#!/bin/bash
set -e

echo "🌍 Initializing Natural Earth sample data..."

# Create schema for natural earth data
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable PostGIS
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS postgis_topology;
    
    -- Create schema for natural earth data
    CREATE SCHEMA IF NOT EXISTS natural_earth;
    
    -- Sample: World Countries (simplified version)
    CREATE TABLE IF NOT EXISTS natural_earth.countries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        iso_a3 VARCHAR(3),
        iso_a2 VARCHAR(2),
        continent VARCHAR(50),
        region VARCHAR(100),
        population BIGINT,
        gdp_md BIGINT,
        geom GEOMETRY(MultiPolygon, 4326)
    );
    
    -- Sample: Major Cities
    CREATE TABLE IF NOT EXISTS natural_earth.cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        country VARCHAR(100),
        population INTEGER,
        capital BOOLEAN DEFAULT FALSE,
        geom GEOMETRY(Point, 4326)
    );
    
    -- Insert sample countries (simplified geometries)
    INSERT INTO natural_earth.countries (name, iso_a3, iso_a2, continent, region, population, gdp_md, geom) VALUES
    ('France', 'FRA', 'FR', 'Europe', 'Western Europe', 67000000, 2700000,
     ST_GeomFromText('MULTIPOLYGON(((2.5 51, 2.5 42, 9.5 42, 9.5 51, 2.5 51)))', 4326)),
    ('Germany', 'DEU', 'DE', 'Europe', 'Western Europe', 83000000, 3800000,
     ST_GeomFromText('MULTIPOLYGON(((6 55, 6 47, 15 47, 15 55, 6 55)))', 4326)),
    ('Spain', 'ESP', 'ES', 'Europe', 'Southern Europe', 47000000, 1400000,
     ST_GeomFromText('MULTIPOLYGON(((-9 44, -9 36, 4 36, 4 44, -9 44)))', 4326)),
    ('Italy', 'ITA', 'IT', 'Europe', 'Southern Europe', 60000000, 2000000,
     ST_GeomFromText('MULTIPOLYGON(((7 47, 7 37, 18 37, 18 47, 7 47)))', 4326)),
    ('United States', 'USA', 'US', 'North America', 'Northern America', 331000000, 21000000,
     ST_GeomFromText('MULTIPOLYGON(((-125 49, -125 25, -66 25, -66 49, -125 49)))', 4326));
    
    -- Insert sample cities
    INSERT INTO natural_earth.cities (name, country, population, capital, geom) VALUES
    ('Paris', 'France', 2161000, TRUE, ST_GeomFromText('POINT(2.3522 48.8566)', 4326)),
    ('Lyon', 'France', 513275, FALSE, ST_GeomFromText('POINT(4.8357 45.7640)', 4326)),
    ('Marseille', 'France', 869815, FALSE, ST_GeomFromText('POINT(5.3698 43.2965)', 4326)),
    ('Berlin', 'Germany', 3645000, TRUE, ST_GeomFromText('POINT(13.4050 52.5200)', 4326)),
    ('Munich', 'Germany', 1472000, FALSE, ST_GeomFromText('POINT(11.5820 48.1351)', 4326)),
    ('Madrid', 'Spain', 3223000, TRUE, ST_GeomFromText('POINT(-3.7038 40.4168)', 4326)),
    ('Barcelona', 'Spain', 1620000, FALSE, ST_GeomFromText('POINT(2.1734 41.3851)', 4326)),
    ('Rome', 'Italy', 2873000, TRUE, ST_GeomFromText('POINT(12.4964 41.9028)', 4326)),
    ('Milan', 'Italy', 1352000, FALSE, ST_GeomFromText('POINT(9.1900 45.4642)', 4326)),
    ('New York', 'United States', 8336000, FALSE, ST_GeomFromText('POINT(-74.0060 40.7128)', 4326)),
    ('Los Angeles', 'United States', 3979000, FALSE, ST_GeomFromText('POINT(-118.2437 34.0522)', 4326)),
    ('Washington', 'United States', 705749, TRUE, ST_GeomFromText('POINT(-77.0369 38.9072)', 4326));
    
    -- Create spatial indexes
    CREATE INDEX IF NOT EXISTS idx_countries_geom ON natural_earth.countries USING GIST (geom);
    CREATE INDEX IF NOT EXISTS idx_cities_geom ON natural_earth.cities USING GIST (geom);
    
    -- Sample view for quick queries
    CREATE OR REPLACE VIEW natural_earth.european_capitals AS
    SELECT c.name, c.country, c.population, c.geom
    FROM natural_earth.cities c
    WHERE c.capital = TRUE AND c.country IN ('France', 'Germany', 'Spain', 'Italy');
    
    -- Grant permissions
    GRANT USAGE ON SCHEMA natural_earth TO PUBLIC;
    GRANT SELECT ON ALL TABLES IN SCHEMA natural_earth TO PUBLIC;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA natural_earth TO PUBLIC;
    
EOSQL

echo "✅ Natural Earth sample data initialized successfully!"
echo "📍 Sample queries you can try with your LLM:"
echo "  - SELECT name, population FROM natural_earth.cities WHERE country = 'France';"
echo "  - SELECT name FROM natural_earth.countries WHERE ST_Area(geom) > 10;"
echo "  - SELECT c.name, c.country, c.population FROM natural_earth.cities c ORDER BY population DESC LIMIT 5;"
