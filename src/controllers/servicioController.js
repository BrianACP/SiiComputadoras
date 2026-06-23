const supabase = require('../config/supabaseClient');

// --- OBTENER TODOS LOS SERVICIOS (con nombre del técnico y estatus real) ---
const obtenerServicios = async (req, res) => {
  try {
    // 1. Obtener todos los servicios con el nombre del técnico
    const { data: servicios, error } = await supabase
      .from('servicios')
      .select(`
        *,
        tecnico_id (
          nombre
        )
      `)
      .order('created_at', { ascending: false });

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
    const serviciosConEstatus = (servicios || []).map(s => {
      const tieneRespuesta = serviciosRespondidos.has(s.id);
      const estatusReal = tieneRespuesta ? 'completado' : (s.estatus || 'pendiente');

      // Detectar registros cuyo estatus en BD no coincide con la realidad
      if (tieneRespuesta && s.estatus !== 'completado') {
        idsDesincronizados.push(s.id);
      }

      return { ...s, estatus: estatusReal };
    });

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

module.exports = { obtenerServicios, crearServicio };
