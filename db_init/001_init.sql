-- Eliminación en orden para evitar errores de dependencia
DROP TABLE IF EXISTS UserCenterAssignments; -- Se añade la nueva tabla a la eliminación
DROP TABLE IF EXISTS CenterInventories;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Incidents;
DROP TABLE IF EXISTS InventoryLog;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Centers;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Roles;


-- Tabla de Roles (MODIFICADA)
CREATE TABLE Roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

-- Se insertan los nuevos roles base
INSERT INTO Roles (role_name) VALUES ('Administrador'), ('Trabajador Municipal'), ('Contacto Ciudadano');

-- Tabla de Categorías (Sin cambios)
CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO Categories (name) VALUES 
('Alimentos y Bebidas'), 
('Ropa de Cama y Abrigo'), 
('Higiene Personal'), 
('Mascotas'),
('Herramientas');

-- Tabla de Centros (Sin cambios)
CREATE TABLE Centers (
    center_id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('Acopio', 'Albergue')),
    capacity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    fullness_percentage INT DEFAULT 0,
    operational_status VARCHAR(50) DEFAULT 'Abierto',
    public_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Centros de ejemplo (Sin cambios)
INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude) VALUES
('C001', 'Gimnasio Municipal San roque', 'San roque 123', 'Albergue', 200 , false, -33.073440, -71.583330),
('C002', 'Liceo Bicentenario Valparaíso', 'Calle Independencia 456', 'Acopio', 100, true, -33.045800, -71.619700),
('C003', 'Sede Vecinal Cerro Cordillera', 'Pasaje Esmeralda 789', 'Acopio', 300, false, -33.039500, -71.628500);

-- Tabla de Usuarios (MODIFICADA)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,   
    username VARCHAR(100) UNIQUE NOT NULL,
    rut VARCHAR(20) UNIQUE,        
    password_hash VARCHAR(255) NOT NULL,    
    email VARCHAR(100) UNIQUE NOT NULL,      
    role_id INT NOT NULL REFERENCES roles(role_id),
    -- Se elimina la columna center_id
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imagen_perfil TEXT,
    nombre VARCHAR(150),
    genero VARCHAR(20),
    celular VARCHAR(20),
    -- Se añade la columna para el permiso de Apoyo
    es_apoyo_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active_user BOOLEAN NOT NULL DEFAULT TRUE -- Nombre cambiado por claridad
);

-- Usuarios de ejemplo actualizados a la nueva estructura
INSERT INTO users (user_id, rut, password_hash, email, role_id, nombre, username, is_active_user)
VALUES
(1, '11111111-1', 'hash_seguro_admin', 'admin@municipalidad.cl', 1, 'Admin Principal', 'admin_principal', TRUE),
(2, '22222222-2', '1234', 'trabajador1@municipalidad.cl', 2, 'Juan Rojas', 'juan.rojas', TRUE);

-- ==========================================================
-- NUEVA TABLA DE ASIGNACIONES
-- ==========================================================
CREATE TABLE UserCenterAssignments (
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    center_id VARCHAR(10) NOT NULL REFERENCES centers(center_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, center_id) -- Llave primaria compuesta para evitar duplicados
);

-- Ejemplo: Se asigna el centro C001 y C002 al trabajador municipal Juan Rojas (user_id = 2)
INSERT INTO UserCenterAssignments (user_id, center_id) VALUES
(2, 'C001'),
(2, 'C002');

-- ==========================================================

-- Tabla de Productos (Sin cambios)
CREATE TABLE Products (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category_id INT REFERENCES Categories(category_id)
);

-- Productos de ejemplo (Sin cambios)
INSERT INTO Products (name, category_id) VALUES
('Agua Embotellada 1.5L', 1),
('Frazadas (1.5 plazas)', 2),
('Pañales para Adultos (Talla M)', 3),
('Pañales para Niños (Talla G)', 3),
('Comida para Mascotas (Perro)', 4),
('Conservas (Atún, Legumbres)', 1);

-- Tabla de Inventario por Centro (Sin cambios)
CREATE TABLE CenterInventories (
    center_inventory_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES Products(item_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity >= 0),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (center_id, item_id)
);

-- Inventario de ejemplo (Sin cambios)
INSERT INTO CenterInventories (center_id, item_id, quantity) VALUES
('C002', 6, 30),
('C003', 1, 120),
('C003', 4, 120),
('C003', 6, 20),
('C001', 1, 100),
('C002', 3, 30);

-- Tabla de Incidencias (Sin cambios, pero las FK apuntan a la nueva tabla de usuarios)
CREATE TABLE Incidents (
    incident_id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    urgency VARCHAR(20) NOT NULL,
    resolution_comment TEXT,
    registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES Users(user_id),
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id),
    assigned_to INTEGER REFERENCES Users(user_id)
);

-- Incidencia de ejemplo (Sin cambios)
INSERT INTO Incidents (description, status, registered_at, center_id, assigned_to, urgency)
VALUES ('Falta urgente de agua potable para 50 personas', 'pendiente', NOW(), 'C001', NULL, 'Media');

-- Tabla de registro de cambios en el inventario (Sin cambios)
CREATE TABLE InventoryLog (
    log_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id),
    product_name TEXT,
    quantity INT,
    action_type TEXT CHECK (action_type IN ('add', 'edit', 'delete')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Confirmación
SELECT 'Todas las tablas han sido creadas e inicializadas con la nueva estructura de roles.';