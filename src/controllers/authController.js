const supabase = require('../config/supabaseClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Clave secreta para firmar los tokens (Idealmente debería ir en el .env)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_portal_360_2026';

// --- 1. REGISTRO DE USUARIOS (Solo para uso interno) ---
const registrarUsuario = async (req, res) => {
  const { role_id, name, email, password } = req.body;

  try {
    // 1. Encriptar la contraseña (10 es el nivel de seguridad estándar)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 2. Guardar en Supabase
    const { data, error } = await supabase 

      .from('usuarios')
      .insert([{ role_id, name, email, password_hash }])
      .select();

    if (error) throw new Error(error.message);

    res.status(201).json({ éxito: true, mensaje: 'Usuario registrado', datos: data });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- 2. INICIO DE SESIÓN ---
const loginUsuario = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar si el correo existe en la base de datos
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email);

    if (error) throw new Error(error.message);
    if (usuarios.length === 0) {
      return res.status(401).json({ éxito: false, mensaje: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    // 2. Comparar la contraseña escrita con la encriptada en la base de datos
    const contraseñaValida = await bcrypt.compare(password, usuario.password_hash);
    if (!contraseñaValida) {
      return res.status(401).json({ éxito: false, mensaje: 'Credenciales inválidas' });
    }

    // 3. Crear el "gafete" (Token JWT)
    const token = jwt.sign(
      { id: usuario.id, role_id: usuario.role_id }, 
      JWT_SECRET, 
      { expiresIn: '8h' } // El token caduca en 8 horas (una jornada laboral)
    );

    res.status(200).json({ 
      éxito: true, 
      mensaje: 'Bienvenido', 
      token,
      usuario: { nombre: usuario.name, rol: usuario.role_id }
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

module.exports = { registrarUsuario, loginUsuario };