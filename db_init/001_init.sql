-- 001_init.sql
-- Script de inicialización de la base de datos AppCopio

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'center_admin' CHECK (role IN ('admin', 'center_admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de centros
CREATE TABLE IF NOT EXISTS centers (
    center_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Acopio', 'Albergue')),
    capacity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    operational_status VARCHAR(30) DEFAULT 'Abierto' CHECK (operational_status IN ('Abierto', 'Cerrado Temporalmente', 'Capacidad Máxima')),
    public_note TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de productos/items
CREATE TABLE IF NOT EXISTS products (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) DEFAULT 'unidad',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de inventario de centros
CREATE TABLE IF NOT EXISTS centerinventories (
    inventory_id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(center_id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES products(item_id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(center_id, item_id)
);

-- Crear tabla de historial de inventario
CREATE TABLE IF NOT EXISTS inventory_history (
    history_id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(center_id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES products(item_id) ON DELETE CASCADE,
    previous_quantity INTEGER,
    new_quantity INTEGER,
    change_type VARCHAR(20) CHECK (change_type IN ('entrada', 'salida', 'ajuste')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id)
);

-- Crear tabla de incidentes
CREATE TABLE IF NOT EXISTS incidents (
    incident_id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(center_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_progreso', 'resuelto', 'cerrado')),
    priority VARCHAR(10) DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'critica')),
    reported_by INTEGER REFERENCES users(user_id),
    assigned_to INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos de ejemplo para productos/categorías
INSERT INTO products (name, category, unit) VALUES
('Arroz', 'Alimentos y Bebidas', 'kg'),
('Frijoles', 'Alimentos y Bebidas', 'kg'),
('Agua embotellada', 'Alimentos y Bebidas', 'litro'),
('Pasta', 'Alimentos y Bebidas', 'kg'),
('Atún enlatado', 'Alimentos y Bebidas', 'lata'),
('Aceite de cocina', 'Alimentos y Bebidas', 'litro'),
('Azúcar', 'Alimentos y Bebidas', 'kg'),
('Sal', 'Alimentos y Bebidas', 'kg'),

('Mantas', 'Ropa de Cama y Abrigo', 'unidad'),
('Almohadas', 'Ropa de Cama y Abrigo', 'unidad'),
('Sábanas', 'Ropa de Cama y Abrigo', 'unidad'),
('Cobijas', 'Ropa de Cama y Abrigo', 'unidad'),
('Ropa de abrigo', 'Ropa de Cama y Abrigo', 'unidad'),

('Jabón', 'Higiene Personal', 'unidad'),
('Champú', 'Higiene Personal', 'unidad'),
('Pasta dental', 'Higiene Personal', 'unidad'),
('Cepillo de dientes', 'Higiene Personal', 'unidad'),
('Papel higiénico', 'Higiene Personal', 'rollo'),
('Toallas sanitarias', 'Higiene Personal', 'paquete'),
('Pañales', 'Higiene Personal', 'paquete'),

('Comida para perros', 'Mascotas', 'kg'),
('Comida para gatos', 'Mascotas', 'kg'),
('Correas', 'Mascotas', 'unidad'),
('Bebederos', 'Mascotas', 'unidad'),

('Martillo', 'Herramientas', 'unidad'),
('Destornillador', 'Herramientas', 'unidad'),
('Cinta adhesiva', 'Herramientas', 'rollo'),
('Cuerda', 'Herramientas', 'metro')
ON CONFLICT DO NOTHING;

-- Insertar algunos centros de ejemplo
INSERT INTO centers (name, address, type, capacity, latitude, longitude, operational_status, public_note) VALUES
('Centro de Acopio Norte', 'Av. Libertad 123, Sector Norte', 'Acopio', 100, -33.4489, -70.6693, 'Abierto', 'Necesitamos especialmente alimentos enlatados'),
('Albergue Central', 'Calle Principal 456, Centro', 'Albergue', 50, -33.4569, -70.6483, 'Abierto', 'Capacidad disponible para 20 personas más'),
('Centro de Acopio Sur', 'Av. Los Andes 789, Sector Sur', 'Acopio', 80, -33.4689, -70.6393, 'Cerrado Temporalmente', 'Cerrado por mantenimiento hasta mañana'),
('Albergue Familiar', 'Calle de la Esperanza 321, Las Condes', 'Albergue', 30, -33.4289, -70.6193, 'Capacidad Máxima', 'Sin espacio disponible temporalmente'),
('Centro de Acopio Este', 'Av. Oriente 654, Sector Este', 'Acopio', 120, -33.4389, -70.6093, 'Abierto', 'Funcionando con horario extendido'),
('Albergue Comunitario', 'Plaza de la Comunidad 987, Maipú', 'Albergue', 75, -33.5089, -70.7593, 'Abierto', 'Necesitamos voluntarios para el turno de noche'),
('Centro de Emergencia', 'Av. Emergencia 147, Providencia', 'Acopio', 200, -33.4189, -70.5993, 'Abierto', 'Centro especializado en distribución rápida')
ON CONFLICT DO NOTHING;

-- Insertar usuario administrador por defecto
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@appcopio.com', '$2b$10$example.hash.here', 'admin'),
('centro_admin', 'centro@appcopio.com', '$2b$10$example.hash.here', 'center_admin')
ON CONFLICT DO NOTHING;

-- Insertar algunos datos de inventario de ejemplo
INSERT INTO centerinventories (center_id, item_id, quantity) VALUES
(1, 1, 50),  -- Centro Norte: 50kg arroz
(1, 2, 30),  -- Centro Norte: 30kg frijoles
(1, 3, 100), -- Centro Norte: 100L agua
(1, 9, 25),  -- Centro Norte: 25 mantas
(1, 14, 40), -- Centro Norte: 40 jabones

(2, 1, 25),  -- Albergue Central: 25kg arroz
(2, 9, 15),  -- Albergue Central: 15 mantas
(2, 10, 20), -- Albergue Central: 20 almohadas
(2, 14, 30), -- Albergue Central: 30 jabones

(3, 2, 40),  -- Centro Sur: 40kg frijoles
(3, 4, 35),  -- Centro Sur: 35kg pasta
(3, 11, 50), -- Centro Sur: 50 sábanas

(5, 1, 75),  -- Centro Este: 75kg arroz
(5, 3, 150), -- Centro Este: 150L agua
(5, 5, 60),  -- Centro Este: 60 latas atún
(5, 22, 15), -- Centro Este: 15kg comida perros

(7, 1, 100), -- Centro Emergencia: 100kg arroz
(7, 2, 80),  -- Centro Emergencia: 80kg frijoles
(7, 3, 200), -- Centro Emergencia: 200L agua
(7, 9, 50),  -- Centro Emergencia: 50 mantas
(7, 14, 75)  -- Centro Emergencia: 75 jabones
ON CONFLICT DO NOTHING;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_centers_type ON centers(type);
CREATE INDEX IF NOT EXISTS idx_centers_active ON centers(is_active);
CREATE INDEX IF NOT EXISTS idx_centers_status ON centers(operational_status);
CREATE INDEX IF NOT EXISTS idx_inventory_center ON centerinventories(center_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON centerinventories(item_id);
CREATE INDEX IF NOT EXISTS idx_incidents_center ON incidents(center_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
