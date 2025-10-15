# 🚀 Guía de Despliegue AppCopio - Producción

Esta guía te ayudará a desplegar AppCopio en producción usando:
- **Frontend**: Vercel
- **Backend**: Render
- **Base de Datos**: PostgreSQL en Render

---

## 📋 Pre-requisitos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Render](https://render.com)
- Repositorio Git con tu código (GitHub, GitLab, etc.)
- Dominio (opcional, pero recomendado)

---

## 1️⃣ DESPLEGAR BASE DE DATOS EN RENDER

### Paso 1: Crear PostgreSQL Database

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en **"New +"** → **"PostgreSQL"**
3. Configura:
   - **Name**: `appcopio-db`
   - **Database**: `appcopio_db`
   - **User**: (se genera automático)
   - **Region**: Elige la más cercana a tus usuarios
   - **PostgreSQL Version**: 16 (o la última disponible)
   - **Plan**: Free (para empezar) o Paid según necesites

4. Click en **"Create Database"**

### Paso 2: Obtener credenciales de conexión

Una vez creada la DB, ve a la página de tu base de datos y anota:

```
Hostname: (ejemplo: dpg-xxxxx-a.oregon-postgres.render.com)
Port: 5432
Database: appcopio_db
Username: (ejemplo: appcopio_user)
Password: (contraseña generada)

Internal Database URL: (para usar desde Render)
External Database URL: (para conexiones externas)
```

⚠️ **IMPORTANTE**: Guarda estas credenciales de forma segura.

### Paso 3: Inicializar la base de datos

Necesitas ejecutar los scripts SQL para crear las tablas. Tienes 2 opciones:

#### Opción A: Usando psql desde tu computadora

```bash
# Conectarte a la base de datos
psql <External_Database_URL>

# Ejecutar los scripts en orden
\i db_init/001_tablas.sql
\i db_init/002_triggers.sql
\i db_init/003_datos.sql
```

#### Opción B: Usando el Dashboard de Render

1. En Render, ve a tu base de datos
2. Click en **"Connect"** → **"External Connection"**
3. Usa un cliente como [DBeaver](https://dbeaver.io/) o [pgAdmin](https://www.pgadmin.org/)
4. Conecta y ejecuta manualmente los scripts SQL

---

## 2️⃣ DESPLEGAR BACKEND EN RENDER

### Paso 1: Preparar el Backend

Asegúrate de que tu `package.json` tenga estos scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts"
  }
}
```

### Paso 2: Crear archivo de configuración para Render

Crea un archivo `render.yaml` en la raíz de tu proyecto (opcional pero recomendado):

```yaml
services:
  - type: web
    name: appcopio-backend
    env: node
    region: oregon
    plan: free
    buildCommand: cd appcopio-backend && npm install && npm run build
    startCommand: cd appcopio-backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

### Paso 3: Crear Web Service en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio Git
4. Configura:
   - **Name**: `appcopio-backend`
   - **Region**: Elige la misma que tu base de datos
   - **Branch**: `main` (o tu rama principal)
   - **Root Directory**: `appcopio-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (para empezar)

### Paso 4: Configurar Variables de Entorno

En la sección **"Environment"** de tu servicio, agrega:

```bash
# Puerto (Render asigna automático, pero puedes especificar)
PORT=10000

# Base de Datos (usa la Internal Database URL de Render)
DB_HOST=dpg-xxxxx-a.oregon-postgres.render.com
DB_PORT=5432
DB_USER=appcopio_user
DB_PASSWORD=<tu_password_generado>
DB_NAME=appcopio_db

# O simplemente usa DATABASE_URL (más simple)
DATABASE_URL=<Internal_Database_URL>

# JWT (genera nuevos secretos para producción)
JWT_ACCESS_SECRET=<genera_un_secret_largo_y_seguro>
JWT_REFRESH_SECRET=<genera_otro_secret_diferente>
ACCESS_TOKEN_TTL_MIN=15
REFRESH_TOKEN_TTL_DAYS=7

# CORS (actualiza con tu dominio de Vercel)
CORS_ORIGIN=https://tu-app.vercel.app
NODE_ENV=production
CROSS_SITE_COOKIES=0

# SMTP (para notificaciones)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=appcopiogroup@gmail.com
SMTP_PASS=bkri peoq ytyb jcac
SMTP_FROM="AppCopio <no-reply@appcopio.cl>"
```

### Paso 5: Generar secretos JWT seguros

```bash
# En tu terminal, genera secretos aleatorios seguros:
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

Ejecuta este comando 2 veces para generar `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`.

### Paso 6: Deploy

Click en **"Create Web Service"** y espera a que Render haga el build y deploy.

Una vez completado, tendrás una URL como: `https://appcopio-backend.onrender.com`

⚠️ **Nota**: El plan Free de Render "duerme" después de 15 minutos de inactividad. La primera petición después de dormir tardará ~50 segundos.

---

## 3️⃣ DESPLEGAR FRONTEND EN VERCEL

### Paso 1: Preparar el Frontend

Crea un archivo `.env.production` en `appcopio_frontend2/`:

```env
VITE_API_URL=https://appcopio-backend.onrender.com/api
```

### Paso 2: Actualizar configuración de Vite

Asegúrate de tener en `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // ... resto de configuración PWA
    })
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
```

### Paso 3: Desplegar en Vercel

#### Opción A: Usando el Dashboard de Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **"Add New..."** → **"Project"**
3. Importa tu repositorio Git
4. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `appcopio_frontend2`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. En **"Environment Variables"**, agrega:
   ```
   VITE_API_URL=https://appcopio-backend.onrender.com/api
   ```

6. Click en **"Deploy"**

#### Opción B: Usando Vercel CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Ir a la carpeta del frontend
cd appcopio_frontend2

# Login en Vercel
vercel login

# Deploy
vercel --prod
```

### Paso 4: Configurar dominio personalizado (Opcional)

1. En Vercel, ve a tu proyecto → **"Settings"** → **"Domains"**
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones de Vercel

---

## 4️⃣ CONFIGURACIÓN FINAL Y TESTING

### Actualizar CORS en Backend

Una vez que tengas tu URL de Vercel, actualiza la variable `CORS_ORIGIN` en Render:

```bash
CORS_ORIGIN=https://tu-app.vercel.app
```

Si tienes múltiples dominios (ejemplo: con y sin www):

```bash
CORS_ORIGIN=https://tu-app.vercel.app,https://www.tu-app.vercel.app
```

### Testing de Producción

1. **Test de Base de Datos**:
   - Verifica que puedas hacer login
   - Crea un usuario de prueba
   - Verifica que los datos se guarden correctamente

2. **Test de API**:
   - Ve a `https://appcopio-backend.onrender.com/api/health` (si tienes un endpoint de health)
   - Verifica que las rutas respondan correctamente

3. **Test de Frontend**:
   - Abre tu app en Vercel
   - Verifica que cargue correctamente
   - Test de login/registro
   - Verifica que las llamadas a la API funcionen

---

## 5️⃣ MONITOREO Y MANTENIMIENTO

### Logs en Render

- Ve a tu servicio en Render → **"Logs"** para ver los logs del backend
- Ve a tu base de datos → **"Logs"** para logs de DB

### Logs en Vercel

- Ve a tu proyecto → **"Deployments"** → Click en un deployment → **"Functions"**
- También puedes ver logs en tiempo real con: `vercel logs <tu-url>`

### Health Checks

Considera agregar un endpoint de health en tu backend:

```typescript
// src/routes/health.ts
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version 
  });
});
```

---

## 🔒 SEGURIDAD

### Checklist de Seguridad:

- ✅ Usar HTTPS en producción (automático en Vercel y Render)
- ✅ Secretos JWT diferentes a desarrollo
- ✅ Variables de entorno nunca en el código
- ✅ CORS configurado correctamente
- ✅ Rate limiting en el backend
- ✅ Validación de datos con Zod
- ✅ Passwords hasheados con bcrypt
- ✅ Tokens con expiración
- ✅ Conexión a DB con SSL/TLS

### Actualizar tu código backend para usar DATABASE_URL

Si usas `DATABASE_URL` (recomendado), actualiza tu configuración de DB:

```typescript
// src/config/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

export default pool;
```

---

## 📊 COSTOS ESTIMADOS

### Plan Free (Ideal para empezar):
- **Vercel**: Gratis (100GB bandwidth/mes)
- **Render Backend**: Gratis (750 horas/mes)
- **Render PostgreSQL**: Gratis (1GB storage)

**Total**: $0/mes

### Plan Básico (Para producción real):
- **Vercel Pro**: $20/mes
- **Render Backend**: $7/mes (Starter)
- **Render PostgreSQL**: $7/mes (Starter)

**Total**: $34/mes

---

## 🐛 TROUBLESHOOTING

### Backend no se conecta a la DB
- Verifica que uses la **Internal Database URL** en Render
- Asegúrate de tener `ssl: { rejectUnauthorized: false }` en producción

### CORS Errors
- Verifica que `CORS_ORIGIN` en backend tenga la URL exacta de Vercel
- Incluye `https://` en la URL

### Frontend no puede hacer fetch a Backend
- Verifica que `VITE_API_URL` esté correctamente configurado
- Revisa la consola del navegador para ver el error exacto

### "Service Unavailable" en Render
- El servicio puede estar "dormido" (plan Free)
- La primera petición tardará ~50 segundos en "despertar"
- Considera upgrade a plan Starter para tener servicio 24/7

---

## 📝 COMANDOS ÚTILES

```bash
# Ver logs de backend en tiempo real (Render)
# (disponible en el dashboard)

# Ver logs de frontend (Vercel CLI)
vercel logs <tu-url>

# Redesplegar backend en Render
# (push a tu rama principal o click en "Manual Deploy")

# Redesplegar frontend en Vercel
cd appcopio_frontend2
vercel --prod

# Backup de base de datos
pg_dump <External_Database_URL> > backup.sql

# Restaurar backup
psql <External_Database_URL> < backup.sql
```

---

## 🎉 ¡Listo!

Tu aplicación AppCopio ahora debería estar funcionando en producción:

- **Frontend**: https://tu-app.vercel.app
- **Backend**: https://appcopio-backend.onrender.com
- **Base de Datos**: Alojada en Render

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa los logs en Render y Vercel
2. Verifica las variables de entorno
3. Asegúrate de que los 3 servicios estén "activos"
4. Revisa la documentación oficial:
   - [Render Docs](https://render.com/docs)
   - [Vercel Docs](https://vercel.com/docs)

---

**Última actualización**: Enero 2025
