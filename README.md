# AppCopio  - Guía de Desarrollo Local
Wena,

Bienvenidos al repositorio oficial de AppCopio. Este documento es nuestra guía central para configurar el entorno de desarrollo y empezar a trabajar. El objetivo es que todos podamos levantar el proyecto en nuestras máquinas locales de forma rápida y consistente.

## 🏗️ Arquitectura del Proyecto

Este repositorio está organizado en un formato de "monorepo", lo que significa que contiene dos proyectos principales en carpetas separadas:

-   **/appcopio-frontend**: Contiene toda la aplicación de cara al usuario, construida con React y TypeScript.
-   **/appcopio-backend**: Contiene nuestro servidor y la API, construido con Node.js, Express y TypeScript.

Ambas partes deben estar corriendo simultáneamente para que la aplicación funcione por completo.

## 📋 Paso 0: Prerrequisitos

Antes de empezar, asegúrate de tener instalado el siguiente software en tu computador:

-   **Node.js**: Versión LTS (Long-Term Support) recomendada. Puedes descargarlo [aquí](https://nodejs.org/). (npm viene incluido).
-   **Git**: Para la gestión de versiones. Puedes descargarlo [aquí](https://git-scm.com/).
-   **PostgreSQL**: Nuestro motor de base de datos. Se recomienda la versión 14 o superior. Puedes descargarlo [aquí](https://www.postgresql.org/download/).
-   **(Recomendado) pgAdmin 4**: Una herramienta gráfica para gestionar tu base de datos PostgreSQL. Suele venir con el instalador de PostgreSQL.
-   **Un editor de código**: Recomendamos [Visual Studio Code](https://code.visualstudio.com/).

## 🛠️ Paso 1: Configuración del Backend (`appcopio-backend`)


Luego de tener clonado el repositorio empezaremos por el backend, ya que el frontend depende de él para obtener los datos.

1.  **Navega a la carpeta del backend** en tu terminal:
    ```bash
    cd appcopio-backend
    ```

2.  **Instala las dependencias** del proyecto:
    ```bash
    npm install
    ```

3.  **Configurar la Base de Datos PostgreSQL**:
    * Asegúrate de que tu servicio de PostgreSQL esté corriendo.
    * Usando `pgAdmin` o tu cliente de base de datos preferido, **crea una nueva base de datos vacía**. Se recomienda usar el nombre `appcopio_db`.
    * Una vez creada la base de datos, abre la "Query Tool" (Herramienta de Consultas) para esa base de datos y **ejecuta el siguiente script SQL completo**. Esto creará todas las tablas necesarias (incluyendo las de inventario) y cargará los datos iniciales.

    <details>
    <summary>Haz clic aquí para ver el Script SQL completo y actualizado</summary>

    ```sql
    -- Eliminación en orden para evitar errores de dependencia
	DROP TABLE IF EXISTS CenterInventories;
	DROP TABLE IF EXISTS Products;
	DROP TABLE IF EXISTS Incidents;
	DROP TABLE IF EXISTS Users;
	DROP TABLE IF EXISTS InventoryLog;
	DROP TABLE IF EXISTS Centers;
	DROP TABLE IF EXISTS Roles;
	
	
	-- Tabla de Roles
	CREATE TABLE Roles (
	    role_id SERIAL PRIMARY KEY,
	    role_name VARCHAR(50) UNIQUE NOT NULL
	);
	
	INSERT INTO Roles (role_name) VALUES ('Emergencias'), ('Encargado');
	
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
	    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	
	-- Centros de ejemplo
	INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude) VALUES
    ('C001', 'Gimnasio Municipal Sann roque', 'San roque 123', 'Albergue', 150, false, -33.073440, -71.583330),
    ('C002', 'Liceo Bicentenario Valparaíso', 'Calle Independencia 456', 'Acopio', 0, true, -33.045800, -71.619700),
    ('C003', 'Sede Vecinal Cerro Cordillera', 'Pasaje Esmeralda 789', 'Acopio', 0, false, -33.039500, -71.628500);
	
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
	
	-- Tabla de Productos
	CREATE TABLE Products (
	    item_id SERIAL PRIMARY KEY,
	    name VARCHAR(255) UNIQUE NOT NULL,
	    category VARCHAR(100) NOT NULL,
	    description TEXT
	);
	
	-- Productos de ejemplo
	INSERT INTO Products (name, category) VALUES
	('Agua Embotellada 1.5L', 'Alimentos y Bebidas'),
	('Frazadas (1.5 plazas)', 'Ropa de Cama y Abrigo'),
	('Pañales para Adultos (Talla M)', 'Higiene Personal'),
	('Pañales para Niños (Talla G)', 'Higiene Personal'),
	('Comida para Mascotas (Perro)', 'Mascotas'),
	('Conservas (Atún, Legumbres)', 'Alimentos y Bebidas');
	
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
	('C002', 1, 2000),
	('C002', 2, 15000),
	('C003', 2, 10000),
	('C001', 1, 5000);
	
	-- Tabla de Incidencias
	CREATE TABLE Incidents (
	    incident_id SERIAL PRIMARY KEY,
	    description TEXT NOT NULL,
	    status VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aceptada', 'rechazada'
	    registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
	    resolved_at TIMESTAMP,
		urgency VARCHAR(20) NOT NULL,
	    resolution_comment TEXT,
	    resolved_by INTEGER REFERENCES Users(user_id),
	    center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id),
	    assigned_to INTEGER REFERENCES Users(user_id)
	);
	
	-- Incidencia de ejemplo
	INSERT INTO Incidents (description, status, registered_at, center_id, assigned_to, urgency)
	VALUES ('Falta urgente de agua potable para 50 personas', 'pendiente', NOW(), 'C001', NULL, 'Media');
	
	CREATE TABLE InventoryLog (
		log_id SERIAL PRIMARY KEY,
		center_id VARCHAR(10) NOT NULL REFERENCES Centers(center_id),
		product_name TEXT,
		quantity INT,
		action_type TEXT CHECK (action_type IN ('add', 'edit', 'delete')),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	
	
	-- Confirmación
	SELECT 'Todas las tablas han sido creadas e inicializadas'
    ```
    </details>

4.  **Crea tu archivo de entorno local (`.env`)**:
    * En la raíz de la carpeta `appcopio-backend`, crea un archivo llamado `.env`.
    * Copia y pega el siguiente contenido, **reemplazando `tu_contraseña` con la contraseña que configuraste para tu usuario `postgres`**.

        ```env
        # Puerto para el servidor backend
        PORT=4000

        # Credenciales de la Base de Datos PostgreSQL
        DB_HOST=localhost
        DB_PORT=5432
        DB_USER=postgres
        DB_PASSWORD=tu_contraseña
        DB_NAME=appcopio_db
        ```
    * **IMPORTANTE:** Este archivo es ignorado por Git por seguridad. Cada miembro del equipo debe crear su propio archivo `.env`.

## 🛠️ Paso 2: Configuración del Frontend (`appcopio-frontend`)

Ahora vamos con la parte visual.

1.  **Navega a la carpeta del frontend** en una **NUEVA** terminal (deja la del backend para después):
    ```bash
    cd appcopio-frontend
    ```
2.  **Instala las dependencias**:
    ```bash
    npm install
    ```
3.  **Crea tu archivo de entorno local (`.env.local`)**:
    * Este archivo es necesario para la clave de la API de Google Maps. Cada miembro del equipo debe obtener su propia clave de API gratuita (wuajajaja con cuea tenemos la mia)desde la [Google Cloud Console](https://console.cloud.google.com/).
    * En la raíz de la carpeta `appcopio-frontend`, crea un archivo llamado `.env.local`.
    * Añade el siguiente contenido, reemplazando con tu propia clave (pedirsela al bruno pero usar con cuidado ⚠):

        ```env
        VITE_Maps_API_KEY=TU_PROPIA_CLAVE_DE_API_DE_Maps
        ```
    * Recuerda configurar la facturación y las restricciones HTTP en tu clave para que funcione en `localhost`.

## ▶️ Paso 3: ¡A Levantar el Proyecto!

Necesitarás **dos terminales abiertas** para correr la aplicación completa.

* **Terminal 1: Levantar el Backend**
    ```bash
    cd appcopio-backend
    npm run dev
    ```
    > Verás un mensaje indicando que el servidor corre en `http://localhost:4000`.

* **Terminal 2: Levantar el Frontend**
    ```bash
    cd appcopio-frontend
    npm run dev
    ```
    > Verás un mensaje indicando que el frontend corre en `http://localhost:5173` (o un puerto similar) y probablemente se abrirá en tu navegador.

¡Y listo! Con ambos servidores corriendo, la aplicación debería ser completamente funcional. Si navegas a la sección `/map`, deberías ver los pines cargados desde la base de datos que configuraste.

Cualquier duda consultarle al bruno! :D
