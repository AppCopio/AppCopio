#!/usr/bin/env node

/**
 * Script para generar secretos JWT seguros para producción
 * 
 * Uso: node generate-jwt-secrets.js
 */

const crypto = require('crypto');

console.log('\n🔐 Generando secretos JWT seguros para PRODUCCIÓN\n');
console.log('=' .repeat(60));

const accessSecret = crypto.randomBytes(64).toString('base64');
const refreshSecret = crypto.randomBytes(64).toString('base64');

console.log('\n📋 Copia estos valores en tu configuración de Render:\n');

console.log('JWT_ACCESS_SECRET=');
console.log(accessSecret);
console.log('\n');

console.log('JWT_REFRESH_SECRET=');
console.log(refreshSecret);

console.log('\n' + '=' .repeat(60));
console.log('\n⚠️  IMPORTANTE:');
console.log('  - NO compartas estos secretos');
console.log('  - NO los subas a Git');
console.log('  - Úsalos SOLO en producción');
console.log('  - Guárdalos en un lugar seguro\n');
