-- Eliminación en orden para evitar errores de dependencia
DROP TABLE IF EXISTS CenterInventories;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Incidents;
DROP TABLE IF EXISTS InventoryLog;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Centers;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Roles;


-- Tabla de Roles
CREATE TABLE Roles (
	role_id SERIAL PRIMARY KEY,
	role_name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO Roles (role_name) VALUES ('Emergencias'), ('Encargado');

-- Tabla de Categorías
CREATE TABLE Categories (
	category_id SERIAL PRIMARY KEY,
	name VARCHAR(100) UNIQUE NOT NULL
);

-- Se insertan las categorías por defecto para que la aplicación las tenga desde el inicio
INSERT INTO Categories (name) VALUES 
('Alimentos y Bebidas'), 
('Ropa de Cama y Abrigo'), 
('Higiene Personal'), 
('Mascotas'),
('Herramientas');

-- Tabla de Centros
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

-- Centros de ejemplo
INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude) VALUES
('C001', 'Gimnasio Municipal San roque', 'San roque 123', 'Albergue', 200 , false, -33.073440, -71.583330),
('C002', 'Liceo Bicentenario Valparaíso', 'Calle Independencia 456', 'Acopio', 100, true, -33.045800, -71.619700),
('C003', 'Sede Vecinal Cerro Cordillera', 'Pasaje Esmeralda 789', 'Acopio', 300, false, -33.039500, -71.628500);

-- Tabla de Usuarios
CREATE TABLE Users (
	user_id SERIAL PRIMARY KEY,
	username VARCHAR(100) UNIQUE NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	email VARCHAR(100) UNIQUE,
	role_id INT NOT NULL REFERENCES Roles(role_id),
	center_id VARCHAR(10),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (center_id) REFERENCES Centers(center_id) ON DELETE SET NULL
);

-- Usuarios de ejemplo
INSERT INTO Users (username, password_hash, email, role_id, center_id)
VALUES 
('admin_jrojas', 'temporal123', 'jrojas@admin.cl', 1, NULL),
('admin_sofia', 'temporal456', 'sofia@admin.cl', 1, NULL);

-- Tabla de Productos (Modificada para usar category_id)
CREATE TABLE Products (
	item_id SERIAL PRIMARY KEY,
	name VARCHAR(255) UNIQUE NOT NULL,
	description TEXT,
	category_id INT REFERENCES Categories(category_id)
);

-- Productos de ejemplo actualizados para usar los IDs de la tabla Categories
-- Asumiendo: 1='Alimentos y Bebidas', 2='Ropa de Cama y Abrigo', 3='Higiene Personal', 4='Mascotas'
INSERT INTO Products (name, category_id) VALUES
('Agua Embotellada 1.5L', 1),
('Frazadas (1.5 plazas)', 2),
('Pañales para Adultos (Talla M)', 3),
('Pañales para Niños (Talla G)', 3),
('Comida para Mascotas (Perro)', 4),
('Conservas (Atún, Legumbres)', 1);

-- Tabla de Inventario por Centro
CREATE TABLE CenterInventories (
	center_inventory_id SERIAL PRIMARY KEY,
	center_id VARCHAR(10) NOT NULL,
	item_id INT NOT NULL,
	quantity INT NOT NULL CHECK (quantity >= 0),
	last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (center_id) REFERENCES Centers(center_id) ON DELETE CASCADE,
	FOREIGN KEY (item_id) REFERENCES Products(item_id) ON DELETE CASCADE,
	UNIQUE (center_id, item_id)
);

-- Inventario de ejemplo
INSERT INTO CenterInventories (center_id, item_id, quantity) VALUES
('C002', 6, 30),
('C003', 1, 120),
('C003', 4, 120),
('C003', 6, 20),
('C001', 1, 100),
('C002', 3, 30);

-- Tabla de Incidencias
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

-- Incidencia de ejemplo
INSERT INTO Incidents (description, status, registered_at, center_id, assigned_to, urgency)
VALUES ('Falta urgente de agua potable para 50 personas', 'pendiente', NOW(), 'C001', NULL, 'Media');

-- Tabla de registro de cambios en el inventario
CREATE TABLE InventoryLog (
	log_id SERIAL PRIMARY KEY,
	center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id),
	product_name TEXT,
	quantity INT,
	action_type TEXT CHECK (action_type IN ('add', 'edit', 'delete')),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Confirmación
SELECT 'Todas las tablas han sido creadas e inicializadas';