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


-- Tabla de Centros (MODIFICADA Y ACTUALIZADA)
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
    
    -- Foreign Keys a la tabla de usuarios
    comunity_charge_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
    municipal_manager_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Centros de ejemplo (Sin cambios)
INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude) VALUES
('C001', 'Gimnasio Municipal San roque', 'San roque 123', 'Albergue', 200 , false, -33.073440, -71.583330),
('C002', 'Liceo Bicentenario Valparaíso', 'Calle Independencia 456', 'Acopio', 100, true, -33.045800, -71.619700),
('C003', 'Sede Vecinal Cerro Cordillera', 'Pasaje Esmeralda 789', 'Acopio', 300, false, -33.039500, -71.628500);



-- ==========================================================
-- NUEVA TABLA DE DESCRIPCIÓN DETALLADA DE CENTROS (CATASTRO)
-- ==========================================================
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







-- Tabla de Usuarios (MODIFICADA Y ACTUALIZADA)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,   
    username VARCHAR(100) UNIQUE NOT NULL,
    rut VARCHAR(20) UNIQUE, -- Se mantiene por su importancia como identificador
    password_hash VARCHAR(255) NOT NULL,     
    email VARCHAR(100) UNIQUE NOT NULL,       
    role_id INT NOT NULL REFERENCES roles(role_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imagen_perfil TEXT,
    nombre VARCHAR(150),
    genero VARCHAR(20), -- MODIFICADO: Ahora es un array para mayor flexibilidad
    celular VARCHAR(20),
    es_apoyo_admin BOOLEAN NOT NULL DEFAULT FALSE, -- Se mantiene por ser clave en la lógica de roles
    is_active BOOLEAN NOT NULL DEFAULT FALSE -- MODIFICADO: Se renombra para mayor claridad
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

-- Tabla de Productos (MODIFICADA para añadir 'unit')
CREATE TABLE Products (
    item_id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    unit TEXT, -- Nuevo campo para la unidad de medida
    category_id INT REFERENCES Categories(category_id)
);

-- ==========================================================
-- REEMPLAZO DE TABLA DE INVENTARIO
-- Se reemplaza 'CenterInventories' por 'CenterInventoryItems' para mayor claridad y trazabilidad.
-- ==========================================================
CREATE TABLE CenterInventoryItems (
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES Products(item_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity >= 0),
    
    -- Nuevos campos para trazabilidad
    updated_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Llave primaria compuesta para asegurar un único ítem por centro
    PRIMARY KEY (center_id, item_id)
);

-- Inventario de ejemplo (Sin cambios)
INSERT INTO CenterInventories (center_id, item_id, quantity) VALUES
('C002', 6, 30),
('C003', 1, 120),
('C003', 4, 120),
('C003', 6, 20),
('C001', 1, 100),
('C002', 3, 30);

-- ==========================================================
-- NUEVA TABLA DE SOLICITUDES DE ACTUALIZACIÓN (Reemplaza Incidents)
-- ==========================================================
CREATE TABLE UpdateRequests (
    request_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'canceled')),
    urgency VARCHAR(20) NOT NULL, -- Mantenemos VARCHAR para tener múltiples niveles (ej: 'Alta', 'Media', 'Baja')
    
    -- Campos de Trazabilidad
    requested_by INT REFERENCES Users(user_id) ON DELETE SET NULL, -- Quién la creó
    assigned_to INT REFERENCES Users(user_id) ON DELETE SET NULL,  -- A quién se le asignó
    resolved_by INT REFERENCES Users(user_id) ON DELETE SET NULL,   -- Quién la resolvió

    -- Timestamps y Comentarios
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_comment TEXT
);
-- ==========================================================
-- NUEVA TABLA DE HISTORIAL DE CAMBIOS EN CENTROS (AUDITORÍA)
-- ==========================================================
CREATE TABLE CenterChangesHistory (
    audit_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    changed_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    before_data JSONB, -- Contendrá el estado de la fila ANTES del cambio (null en INSERT)
    after_data JSONB,  -- Contendrá el estado de la fila DESPUÉS del cambio (null en DELETE)
    changed_cols TEXT[], -- Un array con los nombres de las columnas que cambiaron
    change_note TEXT -- Un campo opcional para notas manuales
);



-- ==========================================================
-- NUEVA TABLA DE HISTORIAL DE ACTIVACIONES DE CENTROS
-- ==========================================================
CREATE TABLE CentersActivations (
    activation_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    
    -- Período de activación
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE, -- Se deja en NULL mientras el centro esté activo

    -- Auditoría de la activación
    activated_by INT NOT NULL REFERENCES Users(user_id) ON DELETE SET NULL,
    deactivated_by INT REFERENCES Users(user_id) ON DELETE SET NULL,

    -- Información adicional
    notes TEXT
);

-- Incidencia de ejemplo (Sin cambios)
INSERT INTO Incidents (description, status, registered_at, center_id, assigned_to, urgency)
VALUES ('Falta urgente de agua potable para 50 personas', 'pendiente', NOW(), 'C001', NULL, 'Media');

-- ==========================================================
-- REEMPLAZO DE TABLA DE LOG DE INVENTARIO
-- Se mejora la estructura para una auditoría más robusta y detallada.
-- ==========================================================
CREATE TABLE InventoryLog (
    log_id SERIAL PRIMARY KEY,
    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES Products(item_id) ON DELETE RESTRICT, -- RESTRICT para no perder logs si se borra un producto
    
    action_type TEXT NOT NULL CHECK (action_type IN ('ADD', 'SUB', 'ADJUST')), -- Nuevos valores
    quantity INT NOT NULL, -- La cantidad afectada en la acción
    
    -- Campos de contexto y auditoría
    reason TEXT, -- Motivo del ajuste (ej: "Vencimiento", "Donación específica")
    notes TEXT, -- Notas adicionales
    created_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- NUEVA TABLA DE GRUPOS FAMILIARES (FIBE)
-- ==========================================================
CREATE TABLE FamilyGroups (
    family_id SERIAL PRIMARY KEY,
    activation_id INT NOT NULL REFERENCES CentersActivations(activation_id) ON DELETE CASCADE,
    
    -- RECOMENDACIÓN: Apunta directamente a la tabla Persons para evitar dependencia circular.
    jefe_hogar_person_id INT REFERENCES Persons(person_id) ON DELETE SET NULL,
    
    observaciones TEXT,
    -- RECOMENDACIÓN: Se usa un array de enteros para las 14 necesidades básicas.
    necesidades_basicas INTEGER[14],

    -- La unicidad se puede manejar a nivel de aplicación o con un trigger más complejo
    -- si es necesario evitar que el mismo jefe_hogar cree dos grupos en la misma activación.
    UNIQUE (activation_id, jefe_hogar_person_id)
);

-- ==========================================================
-- NUEVA TABLA DE MIEMBROS DE GRUPOS FAMILIARES (FIBE)
-- ==========================================================
CREATE TABLE FamilyGroupMembers (
    member_id SERIAL PRIMARY KEY, -- RECOMENDACIÓN: Añadir una clave primaria propia.
    family_id INT NOT NULL REFERENCES FamilyGroups(family_id) ON DELETE CASCADE,
    person_id INT NOT NULL REFERENCES Persons(person_id) ON DELETE CASCADE,
    parentesco TEXT NOT NULL, -- Relación con el jefe de hogar (ej: 'Cónyuge', 'Hijo/a', etc.)

    UNIQUE(family_id, person_id) -- Evita que la misma persona esté dos veces en la misma familia
);


CREATE TABLE Persons (
    person_id SERIAL PRIMARY KEY,
    rut VARCHAR(20) UNIQUE NOT NULL, -- Usamos VARCHAR para formato completo
    nombre TEXT NOT NULL,
    primer_apellido TEXT NOT NULL,
    segundo_apellido TEXT,
    nacionalidad TEXT CHECK (nacionalidad IN ('CH', 'EXT')),
    genero TEXT CHECK (genero IN ('F', 'M', 'Otro')),
    edad INT,
    
    -- Campos específicos de la ficha FIBE
    estudia BOOLEAN,
    trabaja BOOLEAN,
    perdida_trabajo BOOLEAN,
    rubro TEXT,
    discapacidad BOOLEAN,
    dependencia BOOLEAN,

    -- Timestamps de auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);




-- Confirmación
SELECT 'Todas las tablas han sido creadas e inicializadas con la nueva estructura de roles.';