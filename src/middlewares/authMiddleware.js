const jwt = require('jsonwebtoken');

// Usamos la misma clave secreta que en el authController
const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_portal_360_2026';

const verificarToken = (req, res, next) => {
  // 1. Buscamos el token en los encabezados de la petición (formato: "Bearer token_aqui")
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ 
      éxito: false, 
      mensaje: 'Acceso denegado. No se proporcionó un token válido.' 
    });
  }

  // 2. Extraemos solo el token (quitamos la palabra "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // 3. Verificamos que el token sea auténtico y no haya caducado
    const decodificado = jwt.verify(token, JWT_SECRET);
    
    // 4. Guardamos los datos del empleado (id, rol) en la petición para usarlos después
    req.usuario = decodificado; 
    
    // 5. ¡Todo en orden! Le decimos a Express que continúe hacia el controlador
    next(); 
  } catch (error) {
    return res.status(401).json({ 
      éxito: false, 
      mensaje: 'Token inválido o expirado. Por favor, inicia sesión nuevamente.' 
    });
  }
};

module.exports = verificarToken;