# 🛠️ Comandos Útiles - AppCopio Producción

## 📦 Scripts Disponibles

### Generación de Secretos JWT
```bash
cd appcopio-backend
node generate-jwt-secrets.js
```

### Verificación de Base de Datos
```bash
cd appcopio-backend
DATABASE_URL="postgresql://..." node verify-db-connection.js
```

---

## 🗄️ Comandos de Base de Datos

### Conectar a Base de Datos
```bash
# Usando la External Database URL
psql <External_Database_URL>
```

### Ejecutar Scripts SQL
```bash
# Inicializar tablas
psql <DATABASE_URL> < db_init/001_tablas.sql

# Crear triggers
psql <DATABASE_URL> < db_init/002_triggers.sql

# Insertar datos iniciales
psql <DATABASE_URL> < db_init/003_datos.sql
```

### Backup de Base de Datos
```bash
# Crear backup con timestamp
pg_dump <External_Database_URL> > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup simple
pg_dump <External_Database_URL> > backup.sql
```

### Restaurar Backup
```bash
psql <External_Database_URL> < backup.sql
```

### Consultas Útiles
```sql
-- Listar todas las tablas
\dt

-- Ver estructura de una tabla
\d Users

-- Contar usuarios
SELECT COUNT(*) FROM Users;

-- Ver roles disponibles
SELECT * FROM Roles;

-- Ver últimos usuarios registrados
SELECT user_id, username, email, created_at 
FROM Users 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar integridad de datos
SELECT 
    (SELECT COUNT(*) FROM Users) as users,
    (SELECT COUNT(*) FROM Roles) as roles,
    (SELECT COUNT(*) FROM Categories) as categories;
```

---

## 🖥️ Backend (Render)

### Ver Logs
```bash
# En el Dashboard de Render:
# Tu servicio → Logs tab
```

### Redesplegar Backend
```bash
# Opción 1: Push a Git (automático)
git add .
git commit -m "Update backend"
git push origin main

# Opción 2: Manual Deploy en Render Dashboard
# Tu servicio → Manual Deploy → Deploy latest commit
```

### Probar Endpoints
```bash
# Health check
curl https://appcopio-backend.onrender.com/api/health

# Login (ejemplo)
curl -X POST https://appcopio-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Ver respuesta detallada
curl -v https://appcopio-backend.onrender.com/api/health
```

### Verificar Variables de Entorno
```bash
# En Render Dashboard:
# Tu servicio → Environment → Variables
```

---

## 🌐 Frontend (Vercel)

### Deploy desde CLI
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy a producción
cd appcopio_frontend2
vercel --prod

# Deploy preview
vercel
```

### Ver Logs
```bash
# Logs en tiempo real
vercel logs <tu-url>

# Logs de una función específica
vercel logs <tu-url> --follow
```

### Redesplegar Frontend
```bash
# Opción 1: Push a Git (automático)
git add .
git commit -m "Update frontend"
git push origin main

# Opción 2: Vercel CLI
cd appcopio_frontend2
vercel --prod

# Opción 3: Vercel Dashboard
# Tu proyecto → Deployments → Redeploy
```

### Rollback
```bash
# Ver deployments
vercel ls

# Rollback a deployment anterior
vercel rollback <deployment-url>
```

---

## 🔍 Debugging

### Backend no responde
```bash
# 1. Verificar estado del servicio en Render
# Dashboard → Tu servicio → Events

# 2. Ver logs
# Dashboard → Tu servicio → Logs

# 3. Verificar variables de entorno
# Dashboard → Tu servicio → Environment

# 4. Test de conexión a DB
DATABASE_URL="..." node verify-db-connection.js

# 5. Redesplegar
# Dashboard → Manual Deploy
```

### CORS Issues
```bash
# 1. Verificar CORS_ORIGIN en Render
echo $CORS_ORIGIN

# 2. Verificar VITE_API_URL en Vercel
# Vercel → Settings → Environment Variables

# 3. Test con curl
curl -H "Origin: https://tu-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://appcopio-backend.onrender.com/api/auth/login

# 4. Debe retornar:
# Access-Control-Allow-Origin: https://tu-app.vercel.app
```

### Frontend muestra página en blanco
```bash
# 1. Ver logs en consola del navegador (F12)

# 2. Verificar build
cd appcopio_frontend2
npm run build

# 3. Test local del build
npm run preview

# 4. Verificar VITE_API_URL
# Vercel → Settings → Environment Variables → VITE_API_URL
```

---

## 📊 Monitoreo

### Verificar Estado de Servicios
```bash
# Backend Health Check
curl https://appcopio-backend.onrender.com/api/health

# Frontend (debe retornar HTML)
curl https://tu-app.vercel.app
```

### Métricas de Rendimiento
```bash
# Tiempo de respuesta del backend
time curl https://appcopio-backend.onrender.com/api/health

# Análisis con curl detallado
curl -w "\nTime Total: %{time_total}s\n" \
     -o /dev/null \
     -s \
     https://appcopio-backend.onrender.com/api/health
```

### Logs en Tiempo Real
```bash
# Vercel
vercel logs <tu-url> --follow

# Render
# Dashboard → Logs (con auto-refresh activado)
```

---

## 🔐 Seguridad

### Rotar Secretos JWT
```bash
# 1. Generar nuevos secretos
cd appcopio-backend
node generate-jwt-secrets.js

# 2. Actualizar en Render
# Dashboard → Environment → Update JWT_ACCESS_SECRET y JWT_REFRESH_SECRET

# 3. Redesplegar
# Dashboard → Manual Deploy

# ⚠️ Esto cerrará todas las sesiones activas
```

### Verificar SSL/TLS
```bash
# Verificar certificado SSL
curl -vI https://appcopio-backend.onrender.com/api/health 2>&1 | grep -i ssl

# Debe mostrar: SSL connection using TLS...
```

### Auditoría de Seguridad
```bash
# Backend
cd appcopio-backend
npm audit
npm audit fix

# Frontend
cd appcopio_frontend2
npm audit
npm audit fix
```

---

## 🧪 Testing en Producción

### Test de Flujo Completo
```bash
# 1. Test de registro
curl -X POST https://appcopio-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"test_user",
    "email":"test@example.com",
    "password":"Test123!",
    "role_id":2
  }'

# 2. Test de login
curl -X POST https://appcopio-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user","password":"Test123!"}'

# 3. Guardar token y hacer petición autenticada
TOKEN="<tu_token>"
curl -H "Authorization: Bearer $TOKEN" \
     https://appcopio-backend.onrender.com/api/users/profile
```

### Load Testing (opcional)
```bash
# Usando Apache Bench
ab -n 100 -c 10 https://appcopio-backend.onrender.com/api/health

# Usando wrk
wrk -t4 -c100 -d30s https://appcopio-backend.onrender.com/api/health
```

---

## 🔄 Mantenimiento

### Actualización de Dependencias
```bash
# Backend
cd appcopio-backend
npm outdated
npm update
npm run build
npm test

# Frontend
cd appcopio_frontend2
npm outdated
npm update
npm run build
```

### Limpieza de Logs
```bash
# Render mantiene logs por 7 días (plan Free)
# Vercel mantiene logs según plan

# Para guardar logs importantes:
# Render → Logs → Copy to clipboard → Guardar en archivo
```

### Backup Programado
```bash
# Crear script de backup automático (cron job local o GitHub Actions)
#!/bin/bash
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > "$BACKUP_DIR/backup-$(date +%Y%m%d).sql"

# Ejecutar semanalmente con cron:
# 0 2 * * 0 /path/to/backup-script.sh
```

---

## 📱 URLs de Referencia Rápida

```bash
# Production
FRONTEND=https://tu-app.vercel.app
BACKEND=https://appcopio-backend.onrender.com
API=${BACKEND}/api

# Dashboards
RENDER=https://dashboard.render.com
VERCEL=https://vercel.com/dashboard
```

---

## 🆘 Comandos de Emergencia

### Backend caído
```bash
# 1. Ver logs inmediatamente
# Render Dashboard → Logs

# 2. Redesplegar desde última versión estable
# Render Dashboard → Manual Deploy → Deploy specific commit

# 3. Rollback de DB si es necesario
psql <DATABASE_URL> < backup-ultimo.sql
```

### Frontend caído
```bash
# Rollback inmediato
vercel rollback <deployment-anterior>

# O desde dashboard
# Vercel → Deployments → Deployment anterior → Promote to Production
```

### Base de Datos corrompida
```bash
# 1. Crear backup inmediato del estado actual
pg_dump <External_Database_URL> > emergency-backup.sql

# 2. Restaurar desde último backup bueno
psql <External_Database_URL> < backup-ultimo-bueno.sql

# 3. Verificar integridad
DATABASE_URL="..." node verify-db-connection.js
```

---

**💡 Tip**: Guarda este archivo en marcadores para acceso rápido a comandos comunes.
