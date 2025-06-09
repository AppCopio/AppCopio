# AppCopio  - Guía de Desarrollo Local

¡Hola equipo!

Bienvenidos al repositorio oficial de AppCopio. Este documento es nuestra guía central para configurar el entorno de desarrollo y empezar a trabajar. El objetivo es que todos podamos levantar el proyecto en nuestras máquinas locales de forma rápida y consistente.

## 🚀 Descripción del Proyecto

[cite_start]AppCopio es una plataforma de gestión integral para centros de acopio y albergues diseñada para contextos post-catástrofe.  [cite_start]Su propósito es centralizar la información en tiempo real, mejorar la coordinación de ayuda y optimizar la distribución de recursos, conectando a municipalidades, equipos de emergencia, voluntarios y damnificados. 

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

Empezaremos por el backend, ya que el frontend depende de él para obtener los datos.

1.  **Navega a la carpeta del backend** en tu terminal:
    ```bash
    cd appcopio-backend
    ```

2.  **Instala las dependencias** del proyecto:
    ```bash
    npm install
    ```

3.  **Configura la Base de Datos PostgreSQL**:
    * Asegúrate de que tu servicio de PostgreSQL esté corriendo.
    * Usando `pgAdmin` o tu cliente de base de datos preferido, **crea una nueva base de datos vacía**. Se recomienda usar el nombre `appcopio_db`.
    * Una vez creada, abre la "Query Tool" (Herramienta de Consultas) para esa base de datos y **ejecuta el siguiente script SQL completo**. Esto creará todas las tablas necesarias y cargará los datos iniciales.

    <details>
    <summary>Haz clic aquí para ver el Script SQL completo</summary>

    ```sql
    -- Borra las tablas si ya existen (útil si necesitas empezar de cero)
    DROP TABLE IF EXISTS Users CASCADE;
    DROP TABLE IF EXISTS Centers CASCADE;
    DROP TABLE IF EXISTS Roles CASCADE;

    -- Tabla para Roles (Equipo de Emergencias, Encargado de Centro)
    CREATE TABLE Roles (
        role_id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL
    );

    INSERT INTO Roles (role_name) VALUES ('Emergencias'), ('Encargado');

    -- Tabla para Usuarios
    CREATE TABLE Users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE,
        role_id INT NOT NULL,
        center_id VARCHAR(10),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES Roles(role_id)
    );

    -- Tabla para Centros
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

    -- Insertamos algunos centros de ejemplo para probar
    INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude) VALUES
    ('C001', 'Gimnasio Municipal Playa Ancha', 'Av. Playa Ancha 123', 'Albergue', 150, false, -33.036100, -71.606700),
    ('C002', 'Liceo Bicentenario Valparaíso', 'Calle Independencia 456', 'Acopio', 0, true, -33.045800, -71.619700),
    ('C003', 'Sede Vecinal Cerro Cordillera', 'Pasaje Esmeralda 789', 'Acopio', 0, false, -33.039500, -71.628500);

    SELECT 'Tablas creadas e inicializadas con éxito!' as status;
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
    * Este archivo es necesario para la clave de la API de Google Maps. Cada miembro del equipo debe obtener su propia clave de API gratuita desde la [Google Cloud Console](https://console.cloud.google.com/).
    * En la raíz de la carpeta `appcopio-frontend`, crea un archivo llamado `.env.local`.
    * Añade el siguiente contenido, reemplazando con tu propia clave:

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

¡Cualquier duda, me avisan!