const supabase = require('../config/supabaseClient');

// --- OBTENER TODOS LOS SERVICIOS (con nombre del técnico, estatus real, búsqueda y filtros) ---
const obtenerServicios = async (req, res) => {
  try {
    const { search, estatus } = req.query;

    // 1. Construir la consulta base con el nombre del técnico
    let query = supabase
      .from('servicios')
      .select(`
        *,
        tecnico_id (
          nombre
        )
      `)
      .order('created_at', { ascending: false });

    // 1b. Aplicar búsqueda parcial por Folio o Cliente (case-insensitive)
    if (search && search.trim() !== '') {
      query = query.or(`folio.ilike.%${search}%,cliente.ilike.%${search}%`);
    }

    // 1c. Ejecutar la consulta construida
    const { data: servicios, error } = await query;

    if (error) throw new Error(error.message);

    // 2. Obtener todos los servicio_id que ya tienen feedback (encuesta respondida)
    const { data: feedbacks, error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .select('servicio_id');

    if (errorFeedback) throw new Error(errorFeedback.message);

    // 3. Crear un Set con los IDs de servicios que ya fueron respondidos
    const serviciosRespondidos = new Set(
      (feedbacks || []).map(f => f.servicio_id)
    );

    // 4. Calcular el estatus real de cada servicio y detectar desincronizados
    const idsDesincronizados = [];
    let serviciosConEstatus = (servicios || []).map(s => {
      const tieneRespuesta = serviciosRespondidos.has(s.id);
      const estatusReal = tieneRespuesta ? 'completado' : (s.estatus || 'pendiente');

      // Detectar registros cuyo estatus en BD no coincide con la realidad
      if (tieneRespuesta && s.estatus !== 'completado') {
        idsDesincronizados.push(s.id);
      }

      return { ...s, estatus: estatusReal };
    });

    // 4b. Filtrar por estatus si se proporcionó el parámetro
    if (estatus && estatus.trim() !== '') {
      serviciosConEstatus = serviciosConEstatus.filter(
        s => s.estatus === estatus.trim()
      );
    }

    // 5. Corregir en segundo plano los registros desincronizados en la BD
    if (idsDesincronizados.length > 0) {
      supabase
        .from('servicios')
        .update({ estatus: 'completado' })
        .in('id', idsDesincronizados)
        .then(({ error: errSync }) => {
          if (errSync) {
            console.error('Error al sincronizar estatus de servicios:', errSync);
          } else {
            console.log(`Estatus sincronizado para ${idsDesincronizados.length} servicio(s).`);
          }
        });
    }

    res.status(200).json({
      éxito: true,
      datos: serviciosConEstatus,
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- CREAR UN NUEVO SERVICIO (mantenimiento terminado) ---
const crearServicio = async (req, res) => {
  const { folio, cliente, telefono_cliente, descripcion_servicio, tecnico_id } = req.body;

  // Validación: los cinco campos son obligatorios
  if (!folio || !cliente || !telefono_cliente || !descripcion_servicio || !tecnico_id) {
    return res.status(400).json({
      éxito: false,
      mensaje:
        'Faltan datos obligatorios: folio, cliente, telefono_cliente, descripcion_servicio y tecnico_id son requeridos.',
    });
  }

  try {
    // Supabase autogenerará el campo "estatus" (valor por defecto) y el "token" de encuesta
    const { data, error } = await supabase
      .from('servicios')
      .insert([{ folio, cliente, telefono_cliente, descripcion_servicio, tecnico_id }])
      .select();

    if (error) throw new Error(error.message);

    res.status(201).json({
      éxito: true,
      mensaje: 'Servicio registrado exitosamente. La encuesta fue generada.',
      datos: data,
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- OBTENER KPIs DE SERVICIOS (conteo real agrupado por estatus) ---
const obtenerKPIsServicios = async (req, res) => {
  try {
    // 1. Obtener todos los servicios (solo id y estatus)
    const { data: servicios, error } = await supabase
      .from('servicios')
      .select('id, estatus');

    if (error) throw new Error(error.message);

    // 2. Obtener todos los servicio_id con feedback respondido
    const { data: feedbacks, error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .select('servicio_id');

    if (errorFeedback) throw new Error(errorFeedback.message);

    // 3. Set de servicios que ya tienen respuesta de encuesta
    const serviciosRespondidos = new Set(
      (feedbacks || []).map(f => f.servicio_id)
    );

    // 4. Calcular el estatus real de cada servicio y contar
    let pendientes = 0;
    let completados = 0;
    let auditados = 0;

    (servicios || []).forEach(s => {
      const tieneRespuesta = serviciosRespondidos.has(s.id);
      const estatusReal = tieneRespuesta ? 'completado' : (s.estatus || 'pendiente');

      switch (estatusReal) {
        case 'completado':
          completados++;
          break;
        case 'auditado':
          auditados++;
          break;
        default:
          pendientes++;
          break;
      }
    });

    res.status(200).json({
      éxito: true,
      kpis: { pendientes, completados, auditados },
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- ACTUALIZAR UN SERVICIO EXISTENTE ---
const actualizarServicio = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      éxito: false,
      mensaje: 'El parámetro id es obligatorio.',
    });
  }

  // Solo extraemos los campos válidos de la tabla para evitar enviar
  // propiedades extra (nombre_tecnico, objetos de join, etc.)
  const camposPermitidos = ['folio', 'cliente', 'telefono_cliente', 'descripcion_servicio', 'tecnico_id'];
  const actualizacion = {};
  for (const campo of camposPermitidos) {
    if (req.body[campo] !== undefined) {
      actualizacion[campo] = req.body[campo];
    }
  }

  // Si tecnico_id llegó como objeto del join (ej. { nombre: '...' }), extraer solo el id real
  if (actualizacion.tecnico_id && typeof actualizacion.tecnico_id === 'object') {
    delete actualizacion.tecnico_id;
  }

  try {
    const { data, error } = await supabase
      .from('servicios')
      .update(actualizacion)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      return res.status(404).json({
        éxito: false,
        mensaje: 'Servicio no encontrado.',
      });
    }

    res.status(200).json({
      éxito: true,
      mensaje: 'Servicio actualizado correctamente.',
      datos: data[0],
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

// --- ELIMINAR UN SERVICIO ---
const eliminarServicio = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      éxito: false,
      mensaje: 'El parámetro id es obligatorio.',
    });
  }

  try {
    // Primero eliminar los registros de feedback relacionados (si existen)
    // para evitar errores de foreign key en servicios completados
    const { error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .delete()
      .eq('servicio_id', id);

    if (errorFeedback) throw new Error(errorFeedback.message);

    // Ahora sí eliminar el servicio
    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    res.status(200).json({
      éxito: true,
      mensaje: 'Servicio eliminado correctamente.',
    });
  } catch (error) {
    res.status(500).json({ éxito: false, error: error.message });
  }
};

module.exports = { obtenerServicios, crearServicio, obtenerKPIsServicios, actualizarServicio, eliminarServicio };
