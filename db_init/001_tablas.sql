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
    rut VARCHAR(20) NOT NULL,
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

-- CREATE INDEX IF NOT EXISTS idx_centersactivations_active
--   ON "CentersActivations"(center_id)
--   WHERE ended_at IS NULL;

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

CREATE INDEX IF NOT EXISTS idx_fgm_person ON FamilyGroupMembers(person_id);
CREATE INDEX IF NOT EXISTS idx_fg_activation ON FamilyGroups(activation_id);
CREATE INDEX IF NOT EXISTS idx_fg_head_activation ON FamilyGroups(activation_id, jefe_hogar_person_id) WHERE status='activo';


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

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bases de datos creadas
CREATE TABLE Datasets (
    dataset_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id  INT NOT NULL REFERENCES CentersActivations(activation_id),
    center_id      VARCHAR(10) NOT NULL REFERENCES Centers(center_id), -- redundante, para evitarnos JOINs
    name           TEXT NOT NULL, -- nombre visible en UI
    key            TEXT NOT NULL, -- slug/clave única por activación (para rutas limpias sin ocupar el id de la base de datos)
    config         JSONB NOT NULL DEFAULT '{}'::jsonb, -- configuración general (ejemplo: permisos, opciones, orden, columnas escondidas, etc.)
    schema_snapshot JSONB, -- snapshot del schema lógico (columnas y opciones) actual, se usa para auditoría e historial
    
    created_by     INT REFERENCES Users(user_id) ON DELETE SET NULL,
    updated_by     INT REFERENCES Users(user_id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ,
    deleted_at     TIMESTAMPTZ,
    CONSTRAINT datasets_uq UNIQUE (activation_id, key), -- evita keys duplicadas en una misma activación
    CONSTRAINT datasets_uq_id_act_dtst UNIQUE (dataset_id, activation_id),
    CONSTRAINT datasets_key_lower_chk CHECK (key = lower(key))
);

-- Columnas de cada base de datos
CREATE TABLE DatasetFields (
    field_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id     UUID NOT NULL REFERENCES Datasets(dataset_id) ON DELETE CASCADE,
    name           TEXT NOT NULL, -- nombre visible en UI
    key            TEXT NOT NULL, -- clave única a utilizar en dataset.records.data (permite distinguir columnas entre sí)
    type           TEXT NOT NULL CHECK (type IN (
                        'text','number','bool','date','time','datetime',
                        'select','multi_select','relation'
                    )),
    required       BOOLEAN NOT NULL DEFAULT FALSE,
    unique_field   BOOLEAN NOT NULL DEFAULT FALSE, 
    config         JSONB NOT NULL DEFAULT '{}'::jsonb, -- configuración de la columna (valores máximos, precisión numérica, formato, etc.)
    position       INT NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE, -- archivar campos sin eliminarlos (para "ocultar" columnas en la vista del usuario u otro)
    -- Para relaciones
    is_multi       BOOLEAN NOT NULL DEFAULT FALSE, --uno a muchos (true) o uno a uno (false)
    relation_target_kind TEXT CHECK (relation_target_kind IN ('dynamic','core')), -- dynamic = otro dataset, core = a registros de tablas de la BD de SQL
    relation_target_dataset_id UUID, -- si es dynamic, a qué dataset apunta
    relation_target_core   TEXT, -- nombre lógico de la tabla SQL ('persons','family_groups')
    
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ,
    deleted_at     TIMESTAMPTZ,

    CONSTRAINT datasetfields_key_lower_chk CHECK (key = lower(key)),
    CONSTRAINT df_relation_meta_coherence_chk CHECK (
        (type <> 'relation'
        AND is_multi = FALSE
        AND relation_target_kind IS NULL
        AND relation_target_dataset_id IS NULL
        AND relation_target_core IS NULL)
        OR
        (type = 'relation'
        AND relation_target_kind = 'dynamic'
        AND relation_target_dataset_id IS NOT NULL
        AND relation_target_core IS NULL)
        OR
        (type = 'relation'
        AND relation_target_kind = 'core'
        AND relation_target_core IS NOT NULL
        AND relation_target_dataset_id IS NULL)
    )
);

CREATE UNIQUE INDEX dataset_fields_uq_active_key ON DatasetFields (dataset_id, key) WHERE is_active; -- Unicidad de key entre campos activos de una misma base de datos

CREATE INDEX dataset_fields_by_dataset_pos ON DatasetFields(dataset_id, position); -- orden de las columnas en la UI rápido
CREATE INDEX dataset_fields_rel_target_ds  ON DatasetFields(relation_target_dataset_id); -- listar qué campos apuntan a cierto dataset

-- Opciones para las columnas (si son del tipo selesct/multi_select)
CREATE TABLE DatasetFieldOptions (
    option_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id     UUID NOT NULL REFERENCES DatasetFields(field_id) ON DELETE CASCADE,
    label        TEXT NOT NULL, -- texto visible en UI
    value        TEXT NOT NULL, -- key estable para filtros
    color        TEXT, -- color HEX para UI
    position     INT NOT NULL DEFAULT 0, 
    is_active    BOOLEAN NOT NULL DEFAULT TRUE, -- "eliminar" opciones sin perder historial
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ,
    CONSTRAINT dfo_value_lower_chk CHECK (value = lower(value))
);

CREATE UNIQUE INDEX dataset_field_options_uq_active ON DatasetFieldOptions(field_id, value) WHERE is_active;  
CREATE INDEX dfo_by_field_pos_live ON DatasetFieldOptions(field_id, position) WHERE is_active;
CREATE INDEX dataset_field_options_by_field_pos ON DatasetFieldOptions(field_id, position);

-- Filas / registros de las bases de datos
CREATE TABLE DatasetRecords (
    record_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id    UUID NOT NULL REFERENCES Datasets(dataset_id) ON DELETE CASCADE,
    activation_id INT NOT NULL REFERENCES CentersActivations(activation_id),
    version       INT NOT NULL DEFAULT 1, -- optimistic locking
    data          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- solo los valores atómicos bajo key de la columna
    
    created_by    INT REFERENCES Users(user_id) ON DELETE SET NULL,
    updated_by    INT REFERENCES Users(user_id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    FOREIGN KEY (dataset_id, activation_id) REFERENCES Datasets(dataset_id, activation_id) ON DELETE CASCADE
);

CREATE INDEX dataset_records_by_ds_upd ON DatasetRecords(dataset_id, updated_at DESC); 
CREATE INDEX dataset_records_by_act_upd ON DatasetRecords(activation_id, updated_at DESC);
CREATE INDEX dataset_records_data_gin ON DatasetRecords USING gin (data jsonb_path_ops); -- Índice GIN para búsquedas por data (exists/contains).

-- Valores para las filas en campos del tipo select/multi_select
CREATE TABLE DatasetRecordOptionValues (
    record_id   UUID NOT NULL REFERENCES DatasetRecords(record_id) ON DELETE CASCADE,
    field_id    UUID NOT NULL REFERENCES DatasetFields(field_id) ON DELETE CASCADE,
    option_id   UUID NOT NULL REFERENCES DatasetFieldOptions(option_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    PRIMARY KEY (record_id, field_id, option_id)
);
CREATE INDEX drov_by_field_option ON DatasetRecordOptionValues(field_id, option_id);


-- Valores para las filas en campos del tipo relation (a otros dataset)
CREATE TABLE DatasetRecordRelations (
    record_id        UUID NOT NULL REFERENCES DatasetRecords(record_id) ON DELETE CASCADE,
    field_id         UUID NOT NULL REFERENCES DatasetFields(field_id) ON DELETE CASCADE,
    target_record_id UUID NOT NULL REFERENCES DatasetRecords(record_id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ,
    PRIMARY KEY (record_id, field_id, target_record_id)
);
CREATE INDEX drr_by_field_target ON DatasetRecordRelations(field_id, target_record_id);
CREATE INDEX drr_by_target ON DatasetRecordRelations(target_record_id);

-- Valores para las filas en campos del tipo relation (a entidades como familia, personas, etc.)
CREATE TABLE DatasetRecordCoreRelations (
    record_id     UUID NOT NULL REFERENCES DatasetRecords(record_id) ON DELETE CASCADE,
    field_id      UUID NOT NULL REFERENCES DatasetFields(field_id) ON DELETE CASCADE,
    target_core   TEXT NOT NULL,  -- nombre de la tabla, ejemplo: 'persons','familyGroups'
    target_id     INT NOT NULL,  -- PK de la entidad core
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    PRIMARY KEY (record_id, field_id, target_core, target_id)
);
CREATE INDEX drcr_by_field_core ON DatasetRecordCoreRelations(field_id, target_core, target_id);
CREATE INDEX drcr_by_core ON DatasetRecordCoreRelations(target_core, target_id);

-- Plantillas para las bases de datos
CREATE TABLE Templates (
    template_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    description  TEXT,
    is_public    BOOLEAN NOT NULL DEFAULT FALSE, -- para cuando tengamos más de una municipalidad
    created_by   INT REFERENCES Users(user_id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ
);

-- Columnas de cada plantilla de las bases de datos
CREATE TABLE TemplateFields (
    template_field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id       UUID NOT NULL REFERENCES Templates(template_id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    key              TEXT NOT NULL,
    field_type        TEXT NOT NULL CHECK (field_type IN (
                        'text','number','bool','date','time','datetime',
                        'select','multi_select','relation'
                        )),
    is_required       BOOLEAN NOT NULL DEFAULT FALSE,
    is_multi          BOOLEAN NOT NULL DEFAULT FALSE,
    position          INTEGER NOT NULL DEFAULT 0,
    settings          JSONB NOT NULL DEFAULT '{}'::jsonb,
    relation_target_kind TEXT CHECK (relation_target_kind IN ('dynamic','core')),
    relation_target_template_id UUID,
    relation_target_core   TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ,
    CONSTRAINT tf_slug_lower_chk CHECK (key = lower(key))
);
CREATE UNIQUE INDEX template_fields_uq_slug ON TemplateFields(template_id, key);

-- auditoría de cambios en las bases de datos y sus registros
CREATE TABLE AuditLog (
    audit_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id  INT,
    actor_user_id  INT,
    action         TEXT NOT NULL CHECK (action IN ('insert','update','delete')),
    entity_type    TEXT NOT NULL,      -- p.ej. 'datasets','dataset_fields',...
    entity_id      UUID,
    at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    before         JSONB,
    after          JSONB
);

CREATE INDEX audit_by_activation ON AuditLog(activation_id, at DESC); --listado cronológico de cambios en una activación
CREATE INDEX audit_by_entity     ON AuditLog(entity_type, entity_id); -- para la historia de un dataset, columna o registro en específico