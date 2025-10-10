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
('21.222.222-2', 'Pedro', 'Soto', 8, 'M');

WITH act AS (
  SELECT activation_id
  FROM CentersActivations
  WHERE center_id = 'C002' AND ended_at IS NULL
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