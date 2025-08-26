// hashPassword.js
const bcrypt = require('bcryptjs');

// 👇 Pon aquí la contraseña que quieres usar para tus pruebas
const password = '12345'; 
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error("Error al hashear la contraseña:", err);
    return;
  }
  console.log(`Contraseña en texto plano: ${password}`);
  console.log(`Hash para la base de datos: ${hash}`);
});