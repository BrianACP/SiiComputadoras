const supabase = require('../config/supabaseClient');

/**
 * FUNCION 1: obtenerResumen
 * Obtiene un resumen general de encuestas y servicios en un periodo.
 */
const obtenerResumen = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    let queryFeedback = supabase.from('feedback_clientes').select('respuestas, alerta_activa, respondido_at');
    let queryServicios = supabase.from('servicios').select('id', { count: 'exact', head: true });

    if (desde) {
      queryFeedback = queryFeedback.gte('respondido_at', desde);
      queryServicios = queryServicios.gte('created_at', desde);
    }
    if (hasta) {
      queryFeedback = queryFeedback.lte('respondido_at', hasta);
      queryServicios = queryServicios.lte('created_at', hasta);
    }

    const { data: feedbacks, error: errorFeedback } = await queryFeedback;
    const { count: total_servicios, error: errorServicios } = await queryServicios;

    if (errorFeedback) throw errorFeedback;
    if (errorServicios) throw errorServicios;

    const total_respondidas = feedbacks.length;
    let sumaCalificaciones = 0;
    let totalCalificaciones = 0;
    let total_alertas = 0;

    feedbacks.forEach(f => {
      if (f.alerta_activa) total_alertas++;
      
      const calificaciones = f.respuestas
        .filter(r => r.tipo === 'calificacion' && r.calificacion !== null)
        .map(r => r.calificacion);
      
      calificaciones.forEach(c => {
        sumaCalificaciones += c;
        totalCalificaciones++;
      });
    });

    const promedio_general = totalCalificaciones > 0 ? sumaCalificaciones / totalCalificaciones : 0;

    res.status(200).json({
      success: true,
      data: {
        total_respondidas,
        promedio_general,
        total_alertas,
        total_servicios: total_servicios || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener resumen', error: error.message });
  }
};

/**
 * FUNCION 2: obtenerPorTecnico
 * Metricas de desempeño por cada tecnico.
 */
const obtenerPorTecnico = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    let query = supabase
      .from('feedback_clientes')
      .select(`
        respuestas,
        servicios (
          tecnico_id,
          empleados (nombre)
        )
      `);

    if (desde) query = query.gte('respondido_at', desde);
    if (hasta) query = query.lte('respondido_at', hasta);

    const { data, error } = await query;
    if (error) throw error;

    const tecnicosMap = {};

    data.forEach(item => {
      const tecnico = item.servicios?.empleados;
      const tecnicoId = item.servicios?.tecnico_id;
      
      if (!tecnicoId || !tecnico) return;

      if (!tecnicosMap[tecnicoId]) {
        tecnicosMap[tecnicoId] = {
          nombre: tecnico.nombre,
          total_evaluaciones: 0,
          sumaPromedios: 0,
          conteoPromedios: 0
        };
      }

      const calificaciones = item.respuestas
        .filter(r => r.tipo === 'calificacion' && r.calificacion !== null)
        .map(r => r.calificacion);
      
      const promedioEncuesta = calificaciones.length > 0
        ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length
        : null;

      tecnicosMap[tecnicoId].total_evaluaciones++;
      if (promedioEncuesta !== null) {
        tecnicosMap[tecnicoId].sumaPromedios += promedioEncuesta;
        tecnicosMap[tecnicoId].conteoPromedios++;
      }
    });

    const resultado = Object.values(tecnicosMap).map(t => ({
      nombre: t.nombre,
      total_evaluaciones: t.total_evaluaciones,
      promedio: t.conteoPromedios > 0 ? t.sumaPromedios / t.conteoPromedios : 0
    }));

    resultado.sort((a, b) => a.promedio - b.promedio);

    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener metricas por tecnico', error: error.message });
  }
};

/**
 * FUNCION 3: obtenerTendencia
 * Promedio de calificaciones agrupado por semana.
 */
const obtenerTendencia = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    let query = supabase.from('feedback_clientes').select('respuestas, respondido_at');
    if (desde) query = query.gte('respondido_at', desde);
    if (hasta) query = query.lte('respondido_at', hasta);

    const { data, error } = await query;
    if (error) throw error;

    const semanasMap = {};

    data.forEach(f => {
      const fecha = new Date(f.respondido_at);
      // Obtener numero de semana aproximado (YYYY-WW)
      const year = fecha.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (fecha - firstDayOfYear) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const semanaKey = `${year}-${weekNumber.toString().padStart(2, '0')}`;

      if (!semanasMap[semanaKey]) {
        semanasMap[semanaKey] = { semana: semanaKey, sumaPromedios: 0, conteo: 0, total: 0 };
      }

      const calificaciones = f.respuestas
        .filter(r => r.tipo === 'calificacion' && r.calificacion !== null)
        .map(r => r.calificacion);
      
      const promedio = calificaciones.length > 0
        ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length
        : null;

      semanasMap[semanaKey].total++;
      if (promedio !== null) {
        semanasMap[semanaKey].sumaPromedios += promedio;
        semanasMap[semanaKey].conteo++;
      }
    });

    const resultado = Object.values(semanasMap).map(s => ({
      semana: s.semana,
      promedio: s.conteo > 0 ? s.sumaPromedios / s.conteo : 0,
      total: s.total
    }));

    resultado.sort((a, b) => a.semana.localeCompare(b.semana));

    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener tendencia', error: error.message });
  }
};

/**
 * FUNCION 4: obtenerDetalleTecnico
 * Todas las encuestas de un tecnico especifico.
 */
const obtenerDetalleTecnico = async (req, res) => {
  const { tecnico_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('feedback_clientes')
      .select(`
        id,
        respondido_at,
        respuestas,
        alerta_activa,
        nota_resolucion,
        servicios!inner (
          folio,
          cliente,
          tecnico_id
        )
      `)
      .eq('servicios.tecnico_id', tecnico_id);

    if (error) throw error;

    const resultado = data.map(f => ({
      id: f.id,
      folio: f.servicios.folio,
      cliente: f.servicios.cliente,
      respondido_at: f.respondido_at,
      respuestas: f.respuestas,
      alerta_activa: f.alerta_activa,
      nota_resolucion: f.nota_resolucion
    }));

    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener detalle del tecnico', error: error.message });
  }
};

/**
 * FUNCION 5: obtenerAlertas
 * Obtiene todas las encuestas con alerta_activa = true.
 */
const obtenerAlertas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('feedback_clientes')
      .select(`
        *,
        servicios (
          folio,
          cliente,
          empleados (nombre)
        )
      `)
      .eq('alerta_activa', true)
      .order('respondido_at', { ascending: false });

    if (error) throw error;

    const resultado = data.map(f => ({
      ...f,
      folio: f.servicios?.folio,
      cliente: f.servicios?.cliente,
      nombre_tecnico: f.servicios?.empleados?.nombre
    }));

    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener alertas', error: error.message });
  }
};

/**
 * FUNCION 6: guardarNotaResolucion
 * Guarda o actualiza la nota de resolucion de una alerta.
 */
const guardarNotaResolucion = async (req, res) => {
  const { feedback_id } = req.params;
  const { nota_resolucion } = req.body;

  if (!nota_resolucion || nota_resolucion.trim() === '') {
    return res.status(400).json({ success: false, message: 'La nota de resolucion es requerida' });
  }

  try {
    const { error } = await supabase
      .from('feedback_clientes')
      .update({ nota_resolucion })
      .eq('id', feedback_id);

    if (error) throw error;

    res.status(200).json({ success: true, message: 'Nota guardada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al guardar nota de resolucion', error: error.message });
  }
};

module.exports = {
  obtenerResumen,
  obtenerPorTecnico,
  obtenerTendencia,
  obtenerDetalleTecnico,
  obtenerAlertas,
  guardarNotaResolucion
};
