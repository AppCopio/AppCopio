-- ==========================================================
-- PASO 1: ELIMINACIÓN SEGURA DE TODAS LAS TABLAS CON CASCADE
-- Garantiza una base de datos limpia en cada ejecución.
-- ==========================================================
DROP TABLE IF EXISTS FamilyGroupMembers CASCADE;
DROP TABLE IF EXISTS FamilyGroups CASCADE;
DROP TABLE IF EXISTS Persons CASCADE;
DROP TABLE IF EXISTS CenterInventoryItems CASCADE;
--DROP TABLE IF EXISTS CenterChangesHistory CASCADE;
DROP TABLE IF EXISTS CentersActivations CASCADE;
DROP TABLE IF EXISTS UpdateRequests CASCADE;
DROP TABLE IF EXISTS CenterAssignments CASCADE;
DROP TABLE IF EXISTS InventoryLog CASCADE;
DROP TABLE IF EXISTS CentersDescription CASCADE;
DROP TABLE IF EXISTS Products CASCADE;
DROP TABLE IF EXISTS Categories CASCADE;
DROP TABLE IF EXISTS Centers CASCADE;
DROP TABLE IF EXISTS Users CASCADE;
DROP TABLE IF EXISTS Roles CASCADE;
DROP SEQUENCE IF EXISTS centers_seq CASCADE;

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
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 002_auth_refreshtokens.sql
CREATE TABLE IF NOT EXISTS RefreshTokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refreshtokens_userid ON RefreshTokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refreshtokens_tokenhash ON RefreshTokens(token_hash);

CREATE SEQUENCE centers_seq START 1;

CREATE TABLE Centers (
    center_id VARCHAR(10) PRIMARY KEY DEFAULT ('C' || LPAD(nextval('centers_seq')::text, 3, '0')),
    name TEXT NOT NULL,
    address TEXT,
    type TEXT NOT NULL, 
    folio TEXT,
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

-- Tabla de personas individuales: una persona se crea únicamente al ingresarla como parte de un grupo familiar
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

-- Guarda el historial de asignaciones de cada centro: el registro vàlido actualmente es el que tiene valid_to IS NULL
CREATE TABLE CenterAssignments (
    assignment_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('trabajador municipal', 'contacto ciudadano')),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE,
    changed_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

-- Guarda el historial de activaciones de cada centro, el registro valido actualmente es el que tiene ended_at IS NULL
CREATE TABLE CentersActivations (
    activation_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    activated_by INT NOT NULL REFERENCES Users(user_id) ON DELETE SET NULL,
    deactivated_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    notes TEXT
);

-- Registro de grupos familiares ingresados en X centro activado
CREATE TABLE FamilyGroups (
    family_id SERIAL PRIMARY KEY,
    activation_id INT NOT NULL REFERENCES CentersActivations(activation_id) ON DELETE CASCADE,
    jefe_hogar_person_id INT REFERENCES Persons(person_id) ON DELETE SET NULL,
    observaciones TEXT,
    necesidades_basicas INTEGER[14],
    
    --Esto es lo nuevo: 

    status VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo')),
    departure_date TIMESTAMPTZ,
    departure_reason TEXT,
    destination_activation_id INT REFERENCES CentersActivations(activation_id) ON DELETE SET NULL,
    -- Restricciones existentes
    UNIQUE (activation_id, jefe_hogar_person_id)
);

-- Registro que une a las personas con su grupo familiar y define el parentesco con el jefe de hogar
CREATE TABLE FamilyGroupMembers (
    member_id SERIAL PRIMARY KEY,
    family_id INT NOT NULL REFERENCES FamilyGroups(family_id) ON DELETE CASCADE,
    person_id INT NOT NULL REFERENCES Persons(person_id) ON DELETE CASCADE,
    parentesco TEXT NOT NULL,
    UNIQUE(family_id, person_id)
);

-- Guarda el historial de las descripciones detalladas de cada centro)
CREATE TABLE CentersDescription (
    center_id VARCHAR(10) PRIMARY KEY REFERENCES Centers(center_id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    nombre_organizacion TEXT,
    nombre_dirigente TEXT,
    cargo_dirigente TEXT,
    telefono_contacto VARCHAR(12),

    -- Sección: Acceso y Espacios Comunes
    tipo_inmueble TEXT,
    numero_habitaciones INT,
    estado_conservacion INT,
    --Material muros
    muro_hormigon BOOLEAN,
    muro_albaneria BOOLEAN,
    muro_tabique BOOLEAN,
    muro_adobe BOOLEAN,
    muro_mat_precario BOOLEAN,
    --material pisos
    piso_parquet BOOLEAN,
    piso_ceramico BOOLEAN,
    piso_alfombra BOOLEAN,
    piso_baldosa BOOLEAN,
    piso_radier BOOLEAN,
    piso_enchapado BOOLEAN,
    piso_tierra BOOLEAN,
    --Material techo
    techo_tejas BOOLEAN,
    techo_losa BOOLEAN,
    techo_planchas BOOLEAN,
    techo_fonolita BOOLEAN,
    techo_mat_precario BOOLEAN,
    techo_sin_cubierta BOOLEAN,

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
    existen_botiquines BOOLEAN,
    existen_camilla_emergencia BOOLEAN,
    existen_sillas_ruedas BOOLEAN,
    existen_muletas BOOLEAN,
    existen_desfibriladores BOOLEAN,
    existen_senales_advertencia BOOLEAN,
    existen_senales_informativas BOOLEAN,
    existen_senales_exclusivas BOOLEAN,
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
INSERT INTO Users (username, password_hash, email, role_id, nombre, rut, is_active, es_apoyo_admin)
VALUES
('admin', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'admin@appcopio.cl', 1, 'Admin AppCopio', '11.111.111-1', TRUE, TRUE),
('juan.perez', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'juan.perez@municipalidad.cl', 2, 'Juan Pérez', '22.222.222-2', TRUE, FALSE),
('carla.rojas', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'carla.rojas@comunidad.cl', 3, 'Carla Rojas', '33.333.333-3', TRUE, FALSE),
('martinalina', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'marti@comunidad.cl', 2, 'Martina Tejo', '44.444.444-4', TRUE, FALSE),
('paali', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'pali@comunidad.cl', 3, 'Paula Castillo', '53.333.333-3', TRUE, FALSE),
('tito', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'tito@comunidad.cl', 2, 'Tito Orellana', '55.333.333-3', TRUE, FALSE),
('bruno', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'bruno@comunidad.cl', 2, 'Bruno Bonati', '55.533.333-3', TRUE, FALSE),
('mati', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'matias@comunidad.cl', 3, 'Matias Godoy', '55.553.333-3', TRUE, FALSE),
('paulsen', '$2b$10$Psi3QNyicQITWPeGLOVXr.eqO9E72SBodzpSgJ42Z8EGgJZIYYR4m', 'paulsen@comunidad.cl', 3, 'Benjamin Paulsen', '55.555.333-3', TRUE, FALSE);

INSERT INTO Centers (name, address, type, capacity, latitude, longitude) VALUES
('Gimnasio Municipal de Valparaíso', 'Av. Argentina 123', 'albergue', 150, -33.0458, -71.6197),
('Liceo Bicentenario', 'Independencia 456', 'albergue comunitario', 80, -33.0465, -71.6212),
('Sede Vecinal Cerro Alegre', 'Lautaro Rosas 789', 'albergue comunitario', 50, -33.0401, -71.6285),
('Escuela República de Uruguay', 'Av. Uruguay 321', 'albergue', 120, -33.0475, -71.6143);
-- Centers Descriptions
INSERT INTO CentersDescription (
    center_id,
    nombre_organizacion,
    nombre_dirigente,
    cargo_dirigente,
    telefono_contacto,
    tipo_inmueble,
    numero_habitaciones,
    estado_conservacion,
    muro_hormigon,
    piso_radier,
    techo_losa,
    observaciones_espacios_comunes,
    agua_potable,
    electricidad,
    alcantarillado,
    estado_banos,
    wc_proporcion_personas,
    duchas_proporcion_personas,
    observaciones_banos_y_servicios_higienicos,
    posee_habitaciones,
    separacion_familias,
    observaciones_distribucion_habitaciones,
    cuenta_con_mesas_sillas,
    cocina_comedor_adecuados,
    cuenta_con_refrigerador,
    sistema_evacuacion_definido,
    observaciones_condiciones_seguridad_proteccion_generales,
    existe_lugar_animales_dentro,
    existe_lugar_animales_fuera,
    observaciones_dimension_animal,
    existen_extintores,
    existen_generadores,
    existen_luces_emergencias
) VALUES (
    'C001',
    'Municipalidad de Valparaíso',
    'Juan Herrera',
    'Encargado de Operaciones',
    '987654321',
    'Edificio público',
    10,
    5, -- Excelente
    TRUE,
    TRUE,
    TRUE,
    'Amplios espacios para albergue, buena iluminación y ventilación.',
    5, -- Excelente
    5, -- Excelente
    5, -- Excelente
    5, -- Excelente
    4, -- Buena proporción
    4, -- Buena proporción
    'Baños en buen estado, limpios y con acceso para personas con movilidad reducida.',
    3, -- Con habitaciones
    3, -- Separa a las familias
    'Las habitaciones están separadas por mamparas para dar privacidad a las familias.',
    5, -- Excelente
    4, -- Adecuado
    5, -- Sí, hay varios
    5, -- Sí, definido
    'El plan de evacuación está claramente señalizado y se realizan simulacros regularmente.',
    1, -- Sí, dentro
    4, -- Sí, fuera con espacio separado
    'Se habilitó un área exterior para mascotas con jaulas y recipientes de agua.',
    TRUE,
    TRUE,
    TRUE
);

-- Datos de descripción para el Liceo Bicentenario (C002)
INSERT INTO CentersDescription (
    center_id,
    nombre_organizacion,
    telefono_contacto,
    tipo_inmueble,
    numero_habitaciones,
    estado_conservacion,
    muro_albaneria,
    piso_baldosa,
    techo_losa,
    espacio_10_afectados,
    diversidad_funcional,
    observaciones_servicios_basicos,
    agua_potable,
    electricidad,
    alcantarillado,
    observaciones_herramientas_mobiliario,
    cuenta_equipamiento_basico_cocina,
    observaciones_condiciones_seguridad_proteccion_generales,
    sistema_evacuacion_definido,
    existen_luces_emergencias
) VALUES (
    'C002',
    'Liceo Bicentenario Valparaíso',
    '912345678',
    'Edificio público',
    20,
    4, -- Bueno
    TRUE,
    TRUE,
    TRUE,
    4, -- Sí, mucho
    4, -- Con acceso universal
    'Cuenta con todos los servicios básicos en buen estado.',
    4, -- Bueno
    4, -- Bueno
    4, -- Bueno
    'El mobiliario es limitado, se recomienda traer mesas y sillas adicionales.',
    3, -- Sí, equipamiento básico
    'Plan de emergencia en desarrollo, se necesitan más señaléticas.',
    3, -- En desarrollo
    TRUE
);

-- Datos de descripción para la Sede Vecinal (C003)
INSERT INTO CentersDescription (
    center_id,
    nombre_organizacion,
    nombre_dirigente,
    tipo_inmueble,
    estado_conservacion,
    muro_tabique,
    piso_tierra,
    techo_planchas,
    observaciones_espacios_comunes,
    agua_estanques,
    electricidad,
    observaciones_servicios_basicos,
    estado_banos,
    observaciones_banos_y_servicios_higienicos,
    cocina_comedor_adecuados,
    cuenta_con_refrigerador,
    observaciones_herramientas_mobiliario,
    sistema_evacuacion_definido,
    observaciones_condiciones_seguridad_proteccion_generales,
    existe_lugar_animales_fuera,
    observaciones_dimension_animal
) VALUES (
    'C003',
    'Junta de Vecinos Cerro Alegre',
    'Ana Beltrán',
    'Sede social',
    2, -- Regular
    TRUE,
    TRUE,
    TRUE,
    'Espacio pequeño, ideal para grupos familiares reducidos. Sin áreas recreativas.',
    3, -- Se llena de la red
    3, -- Con cortes
    'El suministro de agua no es constante, depende del llenado de estanques.',
    2, -- Deteriorado
    'Los baños están en malas condiciones y no hay duchas disponibles.',
    2, -- Poco adecuado
    1, -- No
    'Solo cuenta con un par de mesas y sillas. La cocina no tiene equipamiento.',
    1, -- No, no definido
    'No hay señaléticas ni plan de evacuación.',
    3, -- Sí, fuera con amarras
    'No hay un área cercada para los animales.'
);

-- Datos de descripción para la Escuela República de Uruguay (C004)
INSERT INTO CentersDescription (
    center_id,
    nombre_organizacion,
    telefono_contacto,
    tipo_inmueble,
    numero_habitaciones,
    estado_conservacion,
    muro_albaneria,
    piso_ceramico,
    techo_planchas,
    espacio_recreacion,
    observaciones_servicios_basicos,
    agua_potable,
    electricidad,
    alcantarillado,
    estado_banos,
    observaciones_banos_y_servicios_higienicos,
    cuenta_con_mesas_sillas,
    cocina_comedor_adecuados,
    sistema_evacuacion_definido,
    observaciones_condiciones_seguridad_proteccion_generales,
    existen_extintores,
    existen_rampas,
    existen_luces_emergencias
) VALUES (
    'C004',
    'Escuela República de Uruguay',
    '998765432',
    'Escuela',
    15,
    4, -- Bueno
    TRUE,
    TRUE,
    TRUE,
    4, -- Sí, con juegos
    'Todos los servicios básicos en buen estado y funcionamiento.',
    4, -- Bueno
    4, -- Bueno
    4, -- Bueno
    4, -- Bueno
    'Baños limpios y funcionales, adaptados para uso masivo.',
    5, -- Excelente
    4, -- Adecuado
    5, -- Sí, definido
    'Plan de evacuación establecido, salidas de emergencia señalizadas y extintores en cada pasillo.',
    TRUE,
    TRUE,
    TRUE
);

-- Categorías de productos
INSERT INTO Categories (name) VALUES 
('Alimentos y Bebidas'), ('Ropa y Abrigo'), ('Higiene Personal'), 
('Artículos para Mascotas'), ('Herramientas y Equipamiento'), ('Botiquín y Primeros Auxilios');

-- Productos de prueba
INSERT INTO Products (name, unit, category_id)
VALUES
('Agua Embotellada 1.5L', 'un', 1), ('Frazadas (1.5 plazas)', 'un', 2),
('Kit de Higiene Personal (Adulto)', 'un', 3), ('Pañales para Niños (Talla G)', 'paquete', 3),
('Saco de Comida para Perro (10kg)', 'saco', 4), ('Pilas AA', 'pack 4un', 5),
('Paracetamol 500mg', 'caja', 6), ('Arroz (1kg)', 'kg', 1);

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
INSERT INTO CenterAssignments (user_id, center_id, role, changed_by) 
VALUES (2, 'C001', 'trabajador municipal', 1), (3, 'C001', 'contacto ciudadano', 1), (2, 'C003', 'trabajador municipal', 1);

UPDATE Centers c
SET municipal_manager_id = ca.user_id
FROM CenterAssignments ca
WHERE ca.center_id = c.center_id
  AND ca.role = 'trabajador municipal'
  AND ca.valid_to IS NULL;

UPDATE Centers c
SET comunity_charge_id = ca.user_id
FROM CenterAssignments ca
WHERE ca.center_id = c.center_id
  AND ca.role = 'contacto ciudadano'
  AND ca.valid_to IS NULL;

-- Solicitudes de prueba
INSERT INTO UpdateRequests (center_id, description, urgency, requested_by) VALUES
('C002', 'Se necesitan con urgencia frazadas adicionales para niños y adultos mayores.', 'Alta', 3);

-- Activación de un centro
INSERT INTO CentersActivations (center_id, activated_by, notes)
VALUES
('C001', 1, 'Activación por emergencia de incendio forestal en la zona alta de Valparaíso.'),
('C002', 1, 'Apertura para contingencia en sector centro.');

-- Sincroniza bandera redundante is_active según activaciones vigentes
UPDATE Centers c
SET is_active = EXISTS (
  SELECT 1 FROM CentersActivations ca
  WHERE ca.center_id = c.center_id AND ca.ended_at IS NULL
);

-- Personas y grupos familiares de prueba
INSERT INTO Persons (rut, nombre, primer_apellido, edad, genero)
VALUES
('15.111.111-1', 'María', 'González', 34, 'F'),
('21.222.222-2', 'Pedro', 'Soto', 8, 'M'),
('14.411.111-1', 'Fernando', 'Gatica', 25, 'M'),
('20.422.222-2', 'Rocio', 'Garcia', 8, 'F');

WITH act AS (
  SELECT activation_id
  FROM CentersActivations
  WHERE center_id = 'C001' AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1
)
INSERT INTO FamilyGroups (activation_id, jefe_hogar_person_id, observaciones)
SELECT act.activation_id, 1, 'Familia monoparental, requieren apoyo especial para menor de edad.'
FROM act;

INSERT INTO FamilyGroupMembers (family_id, person_id, parentesco) VALUES
(1, 1, 'Jefe de Hogar'), (1, 2, 'Hijo/a');

-- Confirmaciones finales de integridad de datos

-- Centros activos y sus activaciones vigentes
SELECT c.center_id, c.name, c.is_active, ca.activation_id
FROM Centers c
LEFT JOIN CentersActivations ca
  ON ca.center_id = c.center_id AND ca.ended_at IS NULL
ORDER BY c.center_id;

-- Punteros redundantes resueltos desde asignaciones vigentes
SELECT c.center_id, c.municipal_manager_id, c.comunity_charge_id
FROM Centers c
ORDER BY c.center_id;

-- Verifica que el FamilyGroup quedó colgando de una activación vigente
SELECT fg.family_id, fg.activation_id, ca.center_id, ca.ended_at
FROM FamilyGroups fg
JOIN CentersActivations ca ON ca.activation_id = fg.activation_id;

-- Confirmación final
SELECT 'Script definitivo ejecutado. Todas las tablas y datos de prueba han sido creados.';