const supabase = require('../config/supabaseClient');

// --- OBTENER TODOS LOS EMPLEADOS ---
const obtenerEmpleados = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    res.status(200).json({
      éxito: true,
      datos: data,
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- CREAR UN NUEVO EMPLEADO ---
const crearEmpleado = async (req, res) => {
  const { nombre, puesto, telefono } = req.body;

  // Validación: los tres campos son obligatorios
  if (!nombre || !puesto || !telefono) {
    return res.status(400).json({
      éxito: false,
      mensaje: 'Faltan datos obligatorios: nombre, puesto y telefono son requeridos.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('empleados')
      .insert([{ nombre, puesto, telefono }])
      .select();

    if (error) throw new Error(error.message);

    res.status(201).json({
      éxito: true,
      mensaje: 'Empleado creado exitosamente.',
      datos: data,
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- ACTUALIZAR UN EMPLEADO EXISTENTE ---
const actualizarEmpleado = async (req, res) => {
  const { id } = req.params;
  const { nombre, puesto, telefono } = req.body;

  try {
    const { data, error } = await supabase
      .from('empleados')
      .update({ nombre, puesto, telefono })
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);

    // Si Supabase no encontró ningún registro con ese id, data estará vacío
    if (!data || data.length === 0) {
      return res.status(404).json({
        éxito: false,
        mensaje: `No se encontró ningún empleado con el id: ${id}`,
      });
    }

    res.status(200).json({
      éxito: true,
      mensaje: 'Empleado actualizado exitosamente.',
      datos: data,
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- ELIMINAR UN EMPLEADO ---
const eliminarEmpleado = async (req, res) => {
  const { id } = req.params;

  try {
    const { count, error: countError } = await supabase
      .from('servicios')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', id);

    if (countError) throw new Error(countError.message);

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar: el empleado tiene servicios registrados en el sistema'
      });
    }

    const { data, error } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      return res.status(404).json({
        éxito: false,
        mensaje: `No se encontró ningún empleado con el id: ${id}`,
      });
    }

    res.status(200).json({
      éxito: true,
      mensaje: `Empleado con id ${id} eliminado exitosamente.`,
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

module.exports = { obtenerEmpleados, crearEmpleado, actualizarEmpleado, eliminarEmpleado };

