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
  --identificación y estado
	center_id VARCHAR(10) PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	address VARCHAR(255),
  latitude DECIMAL(9, 6),
	longitude DECIMAL(9, 6),
	type VARCHAR(50) NOT NULL CHECK (type IN ('Acopio', 'Albergue')),
	is_active BOOLEAN DEFAULT FALSE,
  capacity INT DEFAULT 0, ---dato antiguo
	fullness_percentage INT DEFAULT 0,
	operational_status VARCHAR(50) DEFAULT 'Abierto',
	public_note TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Caracterización del Inmueble
  tipo_inmueble VARCHAR(255),
  numero_habitaciones INT,
  estado_conservacion VARCHAR(255),
  material_muros VARCHAR(255),
  material_pisos VARCHAR(255),
  material_techo VARCHAR(255),
  observaciones_acceso_y_espacios_comunes TEXT,

  -- Acceso y Espacios Comunes (Escala de Likert)
  espacio_10_afectados INT,
  diversidad_funcional INT,
  areas_comunes_accesibles INT,
  espacio_recreacion INT,

  -- Servicios Básicos (Escala de Likert)
  agua_potable INT,
  agua_estanques INT,
  electricidad INT,
  calefaccion INT,
  alcantarillado INT,
  observaciones_servicios_basicos TEXT,

  -- Baños y Servicios Higiénicos (Escala de Likert)
  estado_banos INT,
  wc_proporcion_personas INT,
  banos_genero INT,
  banos_grupos_prioritarios INT,
  cierre_banos_emergencia INT,
  lavamanos_proporcion_personas INT,
  dispensadores_jabon INT,
  dispensadores_alcohol_gel INT,
  papeleros_banos INT,
  papeleros_cocina INT,
  duchas_proporcion_personas INT,
  lavadoras_proporcion_personas INT,
  observaciones_banos_y_servicios_higienicos TEXT,
  cantidad_banos_operativos INT,
  duchas_calefaccion BOOLEAN,

  -- Distribución de posibles habitaciones (Escala de Likert)
  posee_habitaciones INT,
  separacion_familias INT,
  sala_lactancia INT,
  observaciones_distribucion_habitaciones TEXT,

  -- Herramientas y Mobiliario (Escala de Likert)
  cuenta_con_mesas_sillas INT,
  cocina_comedor_adecuados INT,
  cuenta_equipamiento_basico_cocina INT,
  cuenta_con_refrigerador INT,
  cuenta_set_extraccion INT,
  observaciones_herramientas_mobiliario TEXT,

  -- Seguridad y Protección (Escala de Likert)
  sistema_evacuacion_definido INT,
  cuenta_con_senaleticas_adecuadas INT,
  cuenta_con_luz_solar BOOLEAN,
  observaciones_condiciones_seguridad_proteccion_generales TEXT,

  -- Dimensión Animal (Escala de Likert y Checkbox)
  existe_lugar_animales_dentro INT,
  existe_lugar_animales_fuera INT,
  existe_jaula_mascota BOOLEAN,
  existe_recipientes_mascota BOOLEAN,
  existe_correa_bozal BOOLEAN,
  reconoce_personas_dentro_de_su_comunidad BOOLEAN,
  no_reconoce_personas_dentro_de_su_comunidad BOOLEAN,
  observaciones_dimension_animal TEXT,

  -- Elementos de Seguridad y Protección Personal (Checkbox)
  existen_cascos BOOLEAN,
  existen_gorros_cabello BOOLEAN,
  existen_gafas BOOLEAN,
  existen_caretas BOOLEAN,
  existen_mascarillas BOOLEAN,
  existen_respiradores BOOLEAN,
  existen_mascaras_gas BOOLEAN,
  existen_guantes_latex BOOLEAN,
  existen_mangas_protectoras BOOLEAN,
  existen_calzados_seguridad BOOLEAN,
  existen_botas_impermeables BOOLEAN,
  existen_chalecos_reflectantes BOOLEAN,
  existen_overoles_trajes BOOLEAN,
  existen_camillas_catre BOOLEAN,

  -- Elementos de Seguridad Comunitaria (Checkbox)
  existen_alarmas_incendios BOOLEAN,
  existen_hidrantes_mangueras BOOLEAN,
  existen_senaleticas BOOLEAN,
  existen_luces_emergencias BOOLEAN,
  existen_extintores BOOLEAN,
  existen_generadores BOOLEAN,
  existen_baterias_externas BOOLEAN,
  existen_altavoces BOOLEAN,
  existen_botones_alarmas BOOLEAN,
  existen_sistemas_monitoreo BOOLEAN,
  existen_radio_recargable BOOLEAN,
  existen_barandillas_escaleras BOOLEAN,
  existen_puertas_emergencia_rapida BOOLEAN,
  existen_rampas BOOLEAN,
  existen_ascensores_emergencia BOOLEAN,

  -- Preguntas de Evaluación (Checkbox)
  importa_elementos_seguridad BOOLEAN,
  importa_conocimientos_capacitaciones BOOLEAN
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