// scripts/testAuth.ts
// Script para probar el sistema de autenticación
// Uso: npx ts-node scripts/testAuth.ts

import axios from 'axios';

declare const process: any;

const API_URL = 'http://localhost:4000/api';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      test: name,
      status: 'PASS',
      message: 'OK',
      duration: Date.now() - start
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      test: name,
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - start
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function main() {
  console.log('\n🧪 Iniciando pruebas del sistema de autenticación...\n');

  let accessToken = '';
  let cookieHeader = '';

  // Test 1: Login exitoso
  await test('Login con credenciales válidas', async () => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: '12345'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.access_token) {
      throw new Error('No access_token in response');
    }

    if (!response.headers['set-cookie']) {
      throw new Error('No refresh cookie set');
    }

    accessToken = response.data.access_token;
    cookieHeader = response.headers['set-cookie'].join('; ');
  });

  // Test 2: Usar access token
  await test('Usar access token en /auth/me', async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      validateStatus: () => true
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.user) {
      throw new Error('No user data in response');
    }
  });

  // Test 3: Refresh token
  await test('Refresh token endpoint', async () => {
    const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
      headers: {
        Cookie: cookieHeader
      },
      withCredentials: true,
      validateStatus: () => true
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.access_token) {
      throw new Error('No new access_token in response');
    }

    // Actualizar token
    accessToken = response.data.access_token;
  });

  // Test 4: Token inválido
  await test('Rechazar token inválido', async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid_token_here'
      },
      validateStatus: () => true
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  // Test 5: Login con credenciales inválidas
  await test('Rechazar credenciales inválidas', async () => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'wrong',
      password: 'wrong'
    }, {
      validateStatus: () => true
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  // Test 6: Logout
  await test('Logout exitoso', async () => {
    const response = await axios.post(`${API_URL}/auth/logout`, {}, {
      headers: {
        Cookie: cookieHeader
      },
      withCredentials: true,
      validateStatus: () => true
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.ok) {
      throw new Error('Logout did not return ok: true');
    }
  });

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n✅ Pasadas: ${passed}/${results.length}`);
  console.log(`❌ Fallidas: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Tests fallidos:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('✅ ¡TODOS LOS TESTS PASARON!');
  } else {
    console.log('❌ ALGUNOS TESTS FALLARON');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Error fatal:', error.message);
  process.exit(1);
});
