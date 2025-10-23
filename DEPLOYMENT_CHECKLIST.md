# ✅ Checklist de Despliegue AppCopio

Usa este checklist para asegurarte de completar todos los pasos necesarios.

---

## 📋 PRE-DESPLIEGUE

### Preparación del Código
- [ ] Código actualizado en repositorio Git
- [ ] Todo el código compilado sin errores (`npm run build`)
- [ ] Tests pasando correctamente (`npm test`)
- [ ] Archivo `.gitignore` excluye `.env` y archivos sensibles
- [ ] README.md actualizado con documentación

### Cuentas y Accesos
- [ ] Cuenta creada en [Render](https://render.com)
- [ ] Cuenta creada en [Vercel](https://vercel.com)
- [ ] Acceso al repositorio Git configurado
- [ ] Permisos de administrador en las plataformas

---

## 🗄️ BASE DE DATOS (Render PostgreSQL)

### Creación
- [ ] Base de datos PostgreSQL creada en Render
- [ ] Nombre: `appcopio-db`
- [ ] Plan seleccionado (Free o Paid)
- [ ] Región seleccionada

### Credenciales
- [ ] **Hostname** anotado
- [ ] **Port** anotado (5432)
- [ ] **Database name** anotado (appcopio_db)
- [ ] **Username** anotado
- [ ] **Password** anotado
- [ ] **Internal Database URL** copiada
- [ ] **External Database URL** copiada

### Inicialización
- [ ] Script `001_tablas.sql` ejecutado
- [ ] Script `002_triggers.sql` ejecutado
- [ ] Script `003_datos.sql` ejecutado
- [ ] Verificado que tablas se crearon correctamente
- [ ] Datos iniciales insertados (roles, categorías, etc.)

### Verificación
```sql
-- Ejecutar en psql para verificar
\dt                    -- Listar todas las tablas
SELECT * FROM Roles;   -- Verificar datos iniciales
```

---

## 🖥️ BACKEND (Render Web Service)

### Configuración del Servicio
- [ ] Web Service creado en Render
- [ ] Nombre: `appcopio-backend`
- [ ] Repositorio Git conectado
- [ ] Rama principal seleccionada (main/master)
- [ ] Root Directory: `appcopio-backend`
- [ ] Runtime: Node
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Plan seleccionado

### Variables de Entorno
- [ ] `PORT=10000`
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL=<Internal_Database_URL>`
- [ ] `JWT_ACCESS_SECRET=<generado con script>`
- [ ] `JWT_REFRESH_SECRET=<generado con script>`
- [ ] `ACCESS_TOKEN_TTL_MIN=15`
- [ ] `REFRESH_TOKEN_TTL_DAYS=7`
- [ ] `CORS_ORIGIN=https://tu-app.vercel.app` (actualizar después)
- [ ] `CROSS_SITE_COOKIES=0`
- [ ] `SMTP_HOST=smtp.gmail.com`
- [ ] `SMTP_PORT=465`
- [ ] `SMTP_SECURE=true`
- [ ] `SMTP_USER=<tu_email>`
- [ ] `SMTP_PASS=<tu_password>`
- [ ] `SMTP_FROM="AppCopio <no-reply@appcopio.cl>"`

### Generación de Secretos JWT
```bash
# Ejecutar en terminal:
cd appcopio-backend
node generate-jwt-secrets.js
```
- [ ] Secretos JWT generados
- [ ] Secretos copiados a variables de entorno en Render
- [ ] Secretos guardados en lugar seguro

### Deploy y Verificación
- [ ] Deploy iniciado en Render
- [ ] Build completado sin errores
- [ ] Servicio iniciado correctamente
- [ ] URL del backend anotada: `https://appcopio-backend.onrender.com`
- [ ] Logs revisados (sin errores críticos)
- [ ] Endpoint de prueba accesible

### Testing del Backend
```bash
# Probar endpoints básicos
curl https://appcopio-backend.onrender.com/api/health
```
- [ ] API responde correctamente
- [ ] Conexión a base de datos funciona
- [ ] Endpoints principales accesibles

---

## 🌐 FRONTEND (Vercel)

### Configuración del Proyecto
- [ ] Proyecto creado en Vercel
- [ ] Repositorio Git conectado
- [ ] Framework Preset: Vite
- [ ] Root Directory: `appcopio_frontend2`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### Variables de Entorno
- [ ] `VITE_API_URL=https://appcopio-backend.onrender.com/api`

### Deploy y Verificación
- [ ] Deploy iniciado en Vercel
- [ ] Build completado sin errores
- [ ] URL del frontend anotada: `https://tu-app.vercel.app`
- [ ] Preview URL verificada
- [ ] Producción desplegada

### Testing del Frontend
- [ ] Aplicación carga correctamente
- [ ] Página de login visible
- [ ] Estilos aplicados correctamente
- [ ] Sin errores en consola del navegador

---

## 🔗 INTEGRACIÓN

### Actualizar CORS
- [ ] URL de Vercel copiada
- [ ] Variable `CORS_ORIGIN` actualizada en Render
- [ ] Backend redesplegar con nuevo CORS
- [ ] Verificar que no hay errores de CORS

### Testing End-to-End
- [ ] Login funciona
- [ ] Registro de usuarios funciona
- [ ] Navegación entre páginas funciona
- [ ] Llamadas a API funcionan
- [ ] Datos se guardan en base de datos
- [ ] Notificaciones por email funcionan (si aplica)
- [ ] Autenticación persiste entre recargas

---

## 🔒 SEGURIDAD

### Verificaciones de Seguridad
- [ ] HTTPS habilitado (automático en Vercel y Render)
- [ ] Secretos JWT únicos para producción
- [ ] Variables de entorno NO en código fuente
- [ ] Archivo `.env` en `.gitignore`
- [ ] CORS configurado correctamente
- [ ] Passwords hasheados en DB
- [ ] Tokens JWT con expiración
- [ ] Rate limiting activado
- [ ] Validación de datos con Zod
- [ ] SQL injection protegido (usando pg con parámetros)

### Backup
- [ ] Backup de base de datos realizado
- [ ] Backup guardado en lugar seguro
- [ ] Proceso de backup documentado

```bash
# Comando para backup
pg_dump <External_Database_URL> > backup-$(date +%Y%m%d).sql
```

---

## 📊 MONITOREO

### Configuración de Monitoreo
- [ ] Health check endpoint implementado
- [ ] Logs de Render configurados
- [ ] Logs de Vercel configurados
- [ ] Alertas de downtime configuradas (opcional)
- [ ] Analytics configurado (opcional)

### Documentación
- [ ] URLs de producción documentadas
- [ ] Credenciales guardadas en gestor de contraseñas
- [ ] Proceso de deploy documentado
- [ ] Contactos de soporte anotados

---

## 🎯 POST-DESPLIEGUE

### Testing Final
- [ ] Crear usuario de prueba
- [ ] Realizar flujo completo de la aplicación
- [ ] Verificar todas las funcionalidades críticas
- [ ] Probar en diferentes navegadores
- [ ] Probar en dispositivos móviles
- [ ] Verificar performance (tiempos de carga)

### Comunicación
- [ ] Equipo notificado del despliegue
- [ ] Usuarios informados (si aplica)
- [ ] Documentación compartida con equipo
- [ ] Credenciales compartidas de forma segura

### Mantenimiento
- [ ] Plan de monitoreo establecido
- [ ] Proceso de actualización documentado
- [ ] Plan de rollback definido
- [ ] Calendario de backups establecido

---

## 🚨 TROUBLESHOOTING

### Problemas Comunes

#### Backend no responde
- [ ] Verificar logs en Render
- [ ] Verificar variables de entorno
- [ ] Verificar conexión a base de datos
- [ ] Revisar build logs

#### Frontend muestra errores CORS
- [ ] Verificar `CORS_ORIGIN` en backend
- [ ] Verificar `VITE_API_URL` en frontend
- [ ] Verificar que ambas URLs usen HTTPS
- [ ] Redesplegar backend si se cambió CORS

#### Base de datos no conecta
- [ ] Verificar `DATABASE_URL`
- [ ] Verificar que incluye SSL config
- [ ] Verificar que DB está activa en Render
- [ ] Probar conexión con psql

#### Login no funciona
- [ ] Verificar que users existan en DB
- [ ] Verificar JWT secrets configurados
- [ ] Verificar cookies/tokens en navegador
- [ ] Revisar logs de backend

---

## 📞 RECURSOS DE AYUDA

### Documentación Oficial
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Herramientas Útiles
- [DBeaver](https://dbeaver.io/) - Cliente de base de datos
- [Postman](https://www.postman.com/) - Testing de API
- [Vercel CLI](https://vercel.com/docs/cli) - Deploy desde terminal

### Comandos de Emergencia
```bash
# Ver logs en tiempo real (Vercel)
vercel logs <tu-url>

# Redesplegar backend (push a Git)
git push origin main

# Rollback en Vercel
vercel rollback <deployment-url>

# Backup inmediato de DB
pg_dump <External_Database_URL> > emergency-backup.sql
```

---

## ✅ DESPLIEGUE COMPLETADO

Una vez completado todo:

- [ ] Checklist 100% completado
- [ ] Aplicación funcionando en producción
- [ ] Testing completo realizado
- [ ] Documentación actualizada
- [ ] Equipo notificado

---

**🎉 ¡Felicidades! Tu aplicación AppCopio está en producción**

URLs de Producción:
- Frontend: ____________________
- Backend: ____________________
- Base de Datos: ____________________

Fecha de Despliegue: ____________________
Responsable: ____________________
