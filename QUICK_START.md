# 🚀 AppCopio - Despliegue Rápido a Producción

## TL;DR - Guía Express (15 minutos)

### 1. Base de Datos en Render (5 min)
```bash
1. Ir a render.com → New → PostgreSQL
2. Nombre: appcopio-db
3. Crear y copiar DATABASE_URL
4. Conectar y ejecutar:
   psql <DATABASE_URL> < db_init/001_tablas.sql
   psql <DATABASE_URL> < db_init/002_triggers.sql
   psql <DATABASE_URL> < db_init/003_datos.sql
```

### 2. Backend en Render (5 min)
```bash
1. Render → New → Web Service
2. Conectar repo Git
3. Root: appcopio-backend
4. Build: npm install && npm run build
5. Start: npm start
6. Variables de entorno:
   - DATABASE_URL: <copiar de paso 1>
   - JWT_ACCESS_SECRET: <generar con script>
   - JWT_REFRESH_SECRET: <generar con script>
   - CORS_ORIGIN: https://tu-app.vercel.app
   - NODE_ENV: production
   
7. Deploy y copiar URL: https://appcopio-backend.onrender.com
```

Generar secretos JWT:
```bash
cd appcopio-backend
node generate-jwt-secrets.js
```

### 3. Frontend en Vercel (5 min)
```bash
1. Vercel.com → New Project
2. Importar repo
3. Root: appcopio_frontend2
4. Framework: Vite
5. Env var:
   VITE_API_URL=https://appcopio-backend.onrender.com/api
6. Deploy
```

### 4. Actualizar CORS
```bash
1. Copiar URL de Vercel
2. Actualizar CORS_ORIGIN en Render
3. Redesplegar backend
```

---

## 📋 Archivos Creados

- `DEPLOYMENT_GUIDE.md` - Guía completa paso a paso
- `DEPLOYMENT_CHECKLIST.md` - Checklist detallado
- `appcopio-backend/.env.production.example` - Template de variables backend
- `appcopio_frontend2/.env.production.example` - Template de variables frontend
- `render.yaml` - Configuración automática para Render
- `appcopio-backend/generate-jwt-secrets.js` - Generador de secretos
- `appcopio-backend/verify-db-connection.js` - Verificador de DB

---

## 🔑 Variables de Entorno Críticas

### Backend (Render)
```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<generar>
JWT_REFRESH_SECRET=<generar>
CORS_ORIGIN=https://tu-app.vercel.app
NODE_ENV=production
```

### Frontend (Vercel)
```env
VITE_API_URL=https://appcopio-backend.onrender.com/api
```

---

## ✅ Verificación

### Backend funcionando:
```bash
curl https://appcopio-backend.onrender.com/api/health
```

### Frontend funcionando:
Abrir en navegador: `https://tu-app.vercel.app`

### Base de datos:
```bash
cd appcopio-backend
DATABASE_URL="..." node verify-db-connection.js
```

---

## 💰 Costos

### GRATIS (para empezar):
- Vercel: 100GB/mes
- Render Backend: 750h/mes
- Render PostgreSQL: 1GB

**Total: $0/mes**

⚠️ Limitación: Backend "duerme" después de 15 min de inactividad (50s para despertar)

### Recomendado para producción ($34/mes):
- Vercel Pro: $20/mes
- Render Backend Starter: $7/mes
- Render PostgreSQL Starter: $7/mes

---

## 🆘 Problemas Comunes

| Problema | Solución |
|----------|----------|
| CORS Error | Actualizar `CORS_ORIGIN` con URL exacta de Vercel |
| DB no conecta | Usar `DATABASE_URL` con SSL enabled |
| Backend lento | Es normal en plan Free (duerme después 15 min) |
| Login no funciona | Verificar JWT secrets configurados |

---

## 📞 Ayuda

1. Ver `DEPLOYMENT_GUIDE.md` para guía completa
2. Usar `DEPLOYMENT_CHECKLIST.md` para seguimiento
3. Revisar logs en Render y Vercel
4. Documentación oficial:
   - https://render.com/docs
   - https://vercel.com/docs

---

## 🎯 URLs Finales

Después del despliegue tendrás:

- **Frontend**: https://tu-app.vercel.app
- **Backend**: https://appcopio-backend.onrender.com
- **API Base**: https://appcopio-backend.onrender.com/api

---

**Tiempo estimado total: 15-30 minutos**

¡Éxito! 🚀
