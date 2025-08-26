-- ==========================================================
-- PASO 1: ELIMINACIÓN SEGURA DE TODAS LAS TABLAS CON CASCADE
-- Garantiza una base de datos limpia en cada ejecución.
-- ==========================================================
DROP TABLE IF EXISTS FamilyGroupMembers CASCADE;
DROP TABLE IF EXISTS FamilyGroups CASCADE;
DROP TABLE IF EXISTS Persons CASCADE;
DROP TABLE IF EXISTS CenterInventoryItems CASCADE;
DROP TABLE IF EXISTS CenterChangesHistory CASCADE;
DROP TABLE IF EXISTS CentersActivations CASCADE;
DROP TABLE IF EXISTS UpdateRequests CASCADE;
DROP TABLE IF EXISTS CenterAssignments CASCADE;
DROP TABLE IF EXISTS UserCenterAssignments CASCADE; -- Obsoleta
DROP TABLE IF EXISTS InventoryLog CASCADE;
DROP TABLE IF EXISTS CentersDescription CASCADE;
DROP TABLE IF EXISTS Products CASCADE;
DROP TABLE IF EXISTS Categories CASCADE;
DROP TABLE IF EXISTS Incidents CASCADE; -- Obsoleta
DROP TABLE IF EXISTS CenterInventories CASCADE; -- Obsoleta
DROP TABLE IF EXISTS Centers CASCADE;
DROP TABLE IF EXISTS Users CASCADE;
DROP TABLE IF EXISTS Roles CASCADE;


-- ==========================================================
-- PASO 2: CREACIÓN DE TABLAS EN ORDEN LÓGICO DE DEPENDENCIAS
-- ==========================================================

-- Tablas base (sin dependencias)
CREATE TABLE Roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Tablas de primer nivel
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,   
    username VARCHAR(100) UNIQUE NOT NULL,
    rut VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,     
    email VARCHAR(100) UNIQUE NOT NULL,       
    role_id INT NOT NULL REFERENCES Roles(role_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imagen_perfil TEXT,
    nombre VARCHAR(150),
    genero VARCHAR(20),
    celular VARCHAR(20),
    es_apoyo_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE Centers (
    center_id VARCHAR(10) PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    type TEXT NOT NULL, 
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    capacity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    fullness_percentage INT DEFAULT 0,
    operational_status TEXT DEFAULT 'abierto', 
    public_note TEXT,
    should_be_active BOOLEAN DEFAULT FALSE,
    comunity_charge_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
    municipal_manager_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Products (
    item_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    unit TEXT,
    category_id INT REFERENCES Categories(category_id)
);

-- CAMBIO CREANDO TABLA CATEGORIAS
CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE Persons (
    person_id SERIAL PRIMARY KEY,
    rut VARCHAR(20) UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    primer_apellido TEXT NOT NULL,
    segundo_apellido TEXT,
    nacionalidad TEXT CHECK (nacionalidad IN ('CH', 'EXT')),
    genero TEXT CHECK (genero IN ('F', 'M', 'Otro')),
    edad INT,
    estudia BOOLEAN,
    trabaja BOOLEAN,
    perdida_trabajo BOOLEAN,
    rubro TEXT,
    discapacidad BOOLEAN,
    dependencia BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tablas de segundo nivel e intermedias
CREATE TABLE CenterInventoryItems (
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES Products(item_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity >= 0),
    updated_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (center_id, item_id)
);

CREATE TABLE InventoryLog (
    log_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES Products(item_id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL CHECK (action_type IN ('ADD', 'SUB', 'ADJUST')),
    quantity INT NOT NULL,
    reason TEXT,
    notes TEXT,
    created_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CenterAssignments (
    assignment_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('trabajador municipal', 'contacto comunidad')),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE,
    changed_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (center_id, user_id, role)
);

CREATE TABLE UpdateRequests (
    request_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'canceled')),
    urgency VARCHAR(20) NOT NULL,
    requested_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    assigned_to INT REFERENCES Users(user_id) ON DELETE SET NULL,
    resolved_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_comment TEXT
);

CREATE TABLE CentersActivations (
    activation_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    activated_by INT NOT NULL REFERENCES Users(user_id) ON DELETE SET NULL,
    deactivated_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    notes TEXT
);

CREATE TABLE FamilyGroups (
    family_id SERIAL PRIMARY KEY,
    activation_id INT NOT NULL REFERENCES CentersActivations(activation_id) ON DELETE CASCADE,
    jefe_hogar_person_id INT REFERENCES Persons(person_id) ON DELETE SET NULL,
    observaciones TEXT,
    necesidades_basicas INTEGER[14],
    UNIQUE (activation_id, jefe_hogar_person_id)
);

CREATE TABLE FamilyGroupMembers (
    member_id SERIAL PRIMARY KEY,
    family_id INT NOT NULL REFERENCES FamilyGroups(family_id) ON DELETE CASCADE,
    person_id INT NOT NULL REFERENCES Persons(person_id) ON DELETE CASCADE,
    parentesco TEXT NOT NULL,
    UNIQUE(family_id, person_id)
);

CREATE TABLE CentersDescription (
    center_id VARCHAR(10) PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Sección: Acceso y Espacios Comunes
    tipo_inmueble TEXT,
    numero_habitaciones INT,
    estado_conservacion INT,
    material_muros INT,
    material_pisos INT,
    material_techo INT,
    observaciones_acceso_y_espacios_comunes TEXT,

    -- Sección: Espacios Comunes
    espacio_10_afectados INT,
    diversidad_funcional INT,
    areas_comunes_accesibles INT,
    espacio_recreacion INT,
    observaciones_espacios_comunes TEXT,

    -- Sección: Servicios Básicos
    agua_potable INT,
    agua_estanques INT,
    electricidad INT,
    calefaccion INT,
    alcantarillado INT,
    observaciones_servicios_basicos TEXT,

    -- Sección: Baños y Servicios Higiénicos
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

    -- Sección: Distribución de Habitaciones
    posee_habitaciones INT,
    separacion_familias INT,
    sala_lactancia INT,
    observaciones_distribucion_habitaciones TEXT,

    -- Sección: Herramientas y Mobiliario
    cuenta_con_mesas_sillas INT,
    cocina_comedor_adecuados INT,
    cuenta_equipamiento_basico_cocina INT,
    cuenta_con_refrigerador INT,
    cuenta_set_extraccion INT,
    observaciones_herramientas_mobiliario TEXT,

    -- Sección: Condiciones de Seguridad y Protección Generales
    sistema_evacuacion_definido INT,
    cuenta_con_senaleticas_adecuadas INT,
    observaciones_condiciones_seguridad_proteccion_generales TEXT,

    -- Sección: Dimensión Animal
    existe_lugar_animales_dentro INT,
    existe_lugar_animales_fuera INT,
    existe_jaula_mascota BOOLEAN,
    existe_recipientes_mascota BOOLEAN,
    existe_correa_bozal BOOLEAN,
    reconoce_personas_dentro_de_su_comunidad BOOLEAN,
    no_reconoce_personas_dentro_de_su_comunidad BOOLEAN,
    observaciones_dimension_animal TEXT,

    -- Sección: Elementos de Protección Personal (EPP)
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

    -- Sección: Seguridad Comunitaria
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
    observaciones_seguridad_comunitaria TEXT,
    
    -- Sección: Necesidades Adicionales
    importa_elementos_seguridad BOOLEAN,
    observaciones_importa_elementos_seguridad TEXT,
    importa_conocimientos_capacitaciones BOOLEAN,
    observaciones_importa_conocimientos_capacitaciones TEXT,

    -- Constraint de la llave foránea
    CONSTRAINT fk_center
        FOREIGN KEY(center_id) 
        REFERENCES Centers(center_id)
        ON DELETE CASCADE
);

-- ==========================================================
-- PASO 3: INSERCIÓN DE DATOS DE PRUEBA COMPLETOS
-- ==========================================================

-- Roles base
INSERT INTO Roles (role_name) VALUES ('Administrador'), ('Trabajador Municipal'), ('Contacto Ciudadano');

-- Usuarios de prueba (contraseña para todos: '12345')
INSERT INTO Users (user_id, username, password_hash, email, role_id, nombre, rut, is_active, es_apoyo_admin)
OVERRIDING SYSTEM VALUE
VALUES
(1, 'admin', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'admin@appcopio.cl', 1, 'Admin AppCopio', '11.111.111-1', TRUE, TRUE),
(2, 'juan.perez', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'juan.perez@municipalidad.cl', 2, 'Juan Pérez', '22.222.222-2', TRUE, FALSE),
(3, 'carla.rojas', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'carla.rojas@comunidad.cl', 3, 'Carla Rojas', '33.333.333-3', TRUE, FALSE);

-- Centros de prueba
INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude, municipal_manager_id) VALUES
('C001', 'Gimnasio Municipal de Valparaíso', 'Av. Argentina 123', 'albergue', 150, true, -33.0458, -71.6197, 1),
('C002', 'Liceo Bicentenario', 'Independencia 456', 'albergue comunitario', 80, true, -33.0465, -71.6212, 2),
('C003', 'Sede Vecinal Cerro Alegre', 'Lautaro Rosas 789', 'albergue comunitario', 50, false, -33.0401, -71.6285, 2),
('C004', 'Escuela República de Uruguay', 'Av. Uruguay 321', 'albergue', 120, false, -33.0475, -71.6143, 1);

-- Categorías de productos
INSERT INTO Categories (name) VALUES 
('Alimentos y Bebidas'), ('Ropa y Abrigo'), ('Higiene Personal'), 
('Artículos para Mascotas'), ('Herramientas y Equipamiento'), ('Botiquín y Primeros Auxilios');

-- Productos de prueba
INSERT INTO Products (item_id, name, unit, category_id)
OVERRIDING SYSTEM VALUE
VALUES
(1, 'Agua Embotellada 1.5L', 'un', 1), (2, 'Frazadas (1.5 plazas)', 'un', 2),
(3, 'Kit de Higiene Personal (Adulto)', 'un', 3), (4, 'Pañales para Niños (Talla G)', 'paquete', 3),
(5, 'Saco de Comida para Perro (10kg)', 'saco', 4), (6, 'Pilas AA', 'pack 4un', 5),
(7, 'Paracetamol 500mg', 'caja', 6), (8, 'Arroz (1kg)', 'kg', 1);

-- Inventario de prueba
INSERT INTO CenterInventoryItems (center_id, item_id, quantity, updated_by) VALUES
('C001', 1, 200, 1), ('C001', 2, 150, 1), ('C001', 8, 100, 1),
('C002', 1, 80, 2), ('C002', 4, 50, 2);

-- Log de inventario correspondiente al stock inicial
INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, reason, created_by) VALUES
('C001', 1, 'ADD', 200, 'Stock Inicial', 1), ('C001', 2, 'ADD', 150, 'Stock Inicial', 1),
('C001', 8, 'ADD', 100, 'Stock Inicial', 1), ('C002', 1, 'ADD', 80, 'Stock Inicial', 2),
('C002', 4, 'ADD', 50, 'Stock Inicial', 2);

-- Asignaciones de prueba
INSERT INTO CenterAssignments (user_id, center_id, role, changed_by) VALUES
(2, 'C001', 'trabajador municipal', 1), (2, 'C003', 'trabajador municipal', 1);

-- Solicitudes de prueba
INSERT INTO UpdateRequests (center_id, description, urgency, requested_by) VALUES
('C002', 'Se necesitan con urgencia frazadas adicionales para niños y adultos mayores.', 'Alta', 3);

-- Activación de un centro
INSERT INTO CentersActivations (activation_id, center_id, activated_by, notes)
OVERRIDING SYSTEM VALUE
VALUES
(1, 'C001', 1, 'Activación por emergencia de incendio forestal en la zona alta de Valparaíso.');

-- Personas y grupos familiares de prueba
INSERT INTO Persons (person_id, rut, nombre, primer_apellido, edad, genero)
OVERRIDING SYSTEM VALUE
VALUES
(101, '15.111.111-1', 'María', 'González', 34, 'F'),
(102, '21.222.222-2', 'Pedro', 'Soto', 8, 'M');

INSERT INTO FamilyGroups (family_id, activation_id, jefe_hogar_person_id, observaciones)
OVERRIDING SYSTEM VALUE
VALUES
(201, 1, 101, 'Familia monoparental, requieren apoyo especial para menor de edad.');

INSERT INTO FamilyGroupMembers (family_id, person_id, parentesco) VALUES
(201, 101, 'Jefe de Hogar'), (201, 102, 'Hijo/a');

-- Confirmación final
SELECT 'Script definitivo ejecutado. Todas las tablas y datos de prueba han sido creados.';