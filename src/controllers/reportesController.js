const supabase = require('../config/supabaseClient');

// Helper: parsea respuestas (string o array) y devuelve promedio de calificaciones
const calcularPromedio = (respuestas) => {
  try {
    const arr = typeof respuestas === 'string'
      ? JSON.parse(respuestas)
      : respuestas;
    if (!Array.isArray(arr)) return null;
    const calificaciones = arr
      .filter(r => r.tipo === 'calificacion' && r.calificacion !== null)
      .map(r => Number(r.calificacion));
    if (calificaciones.length === 0) return null;
    return calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length;
  } catch (e) {
    return null;
  }
};

// Helper: construye rango de fechas ISO para filtros de Supabase
// Convierte desde='YYYY-MM-DD' a inicio del dia y hasta='YYYY-MM-DD' a final del dia
// Esto evita que hasta='YYYY-MM-DD' excluya registros de ese dia
const construirFiltroFechas = (desde, hasta) => {
  const fechaDesde = desde
    ? new Date(desde + 'T00:00:00.000Z').toISOString()
    : new Date('2000-01-01').toISOString();
  const fechaHasta = hasta
    ? new Date(hasta + 'T23:59:59.999Z').toISOString()
    : new Date().toISOString();
  return { fechaDesde, fechaHasta };
};

/**
 * FUNCION 1: obtenerResumen
 * Obtiene un resumen general de encuestas y servicios en un periodo.
 */
const obtenerResumen = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(desde, hasta);

    const { data: feedbacks, error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .select('*')
      .gte('respondido_at', fechaDesde)
      .lte('respondido_at', fechaHasta);

    if (errorFeedback) throw errorFeedback;

    const { count: total_servicios, error: errorServicios } = await supabase
      .from('servicios')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', fechaDesde)
      .lte('created_at', fechaHasta);

    if (errorServicios) throw errorServicios;

    const total_respondidas = feedbacks.length;
    const total_alertas = feedbacks.filter(f => f.alerta_activa).length;

    const promedios = feedbacks
      .map(f => calcularPromedio(f.respuestas))
      .filter(p => p !== null);

    const promedio_general = promedios.length > 0
      ? promedios.reduce((a, b) => a + b, 0) / promedios.length
      : 0;

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
 * Metricas de desempenio por cada tecnico.
 * Usa 3 consultas separadas y une en JavaScript para evitar problemas de JOIN anidado.
 */
const obtenerPorTecnico = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(desde, hasta);

    // a) Todos los feedbacks del periodo
    const { data: feedbacks, error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .select('respuestas, servicio_id, respondido_at')
      .gte('respondido_at', fechaDesde)
      .lte('respondido_at', fechaHasta);

    if (errorFeedback) throw errorFeedback;

    // b) Todos los servicios (para obtener tecnico_id)
    const { data: servicios, error: errorServicios } = await supabase
      .from('servicios')
      .select('id, tecnico_id');

    if (errorServicios) throw errorServicios;

    // c) Todos los empleados
    const { data: empleados, error: errorEmpleados } = await supabase
      .from('empleados')
      .select('id, nombre');

    if (errorEmpleados) throw errorEmpleados;

    const servicioMap = {};
    (servicios || []).forEach(s => { servicioMap[s.id] = s; });

    const empleadoMap = {};
    (empleados || []).forEach(e => { empleadoMap[e.id] = e; });

    const tecnicosMap = {};

    (feedbacks || []).forEach(f => {
      const servicio = servicioMap[f.servicio_id];
      if (!servicio) return;

      const tecnicoId = servicio.tecnico_id;
      if (!tecnicoId) return;

      const empleado = empleadoMap[tecnicoId];
      const nombreTecnico = empleado ? empleado.nombre : 'Desconocido';

      if (!tecnicosMap[tecnicoId]) {
        tecnicosMap[tecnicoId] = {
          nombre: nombreTecnico,
          total_evaluaciones: 0,
          sumaPromedios: 0,
          conteoPromedios: 0
        };
      }

      const promedioEncuesta = calcularPromedio(f.respuestas);

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

    resultado.sort((a, b) => b.promedio - a.promedio);

    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener metricas por tecnico', error: error.message });
  }
};

/**
 * FUNCION 3: obtenerTendencia
 * Promedio de calificaciones agrupado por fecha (YYYY-MM-DD).
 */
const obtenerTendencia = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(desde, hasta);

    const { data, error } = await supabase
      .from('feedback_clientes')
      .select('respuestas, respondido_at')
      .gte('respondido_at', fechaDesde)
      .lte('respondido_at', fechaHasta);

    if (error) throw error;

    const semanasMap = {};

    (data || []).forEach(f => {
      // Usar fecha simple YYYY-MM-DD para evitar problemas de formato
      const semana = new Date(f.respondido_at).toISOString().slice(0, 10);

      if (!semanasMap[semana]) {
        semanasMap[semana] = { semana, sumaPromedios: 0, conteo: 0, total: 0 };
      }

      const promedio = calcularPromedio(f.respuestas);

      semanasMap[semana].total++;
      if (promedio !== null) {
        semanasMap[semana].sumaPromedios += promedio;
        semanasMap[semana].conteo++;
      }
    });

    const resultado = Object.values(semanasMap).map(s => ({
      semana: s.semana,
      promedio: s.conteo > 0 ? s.sumaPromedios / s.conteo : 0,
      total: s.total
    }));

    // Ordenar por fecha ascendente
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
 * Usa 3 consultas separadas y une en JavaScript.
 */
const obtenerAlertas = async (req, res) => {
  try {
    // a) Feedbacks con alerta activa (sin pedir folio ni cliente, no existen aqui)
    const { data: feedbacks, error: errorFeedbacks } = await supabase
      .from('feedback_clientes')
      .select('id, servicio_id, respondido_at, respuestas, alerta_activa, nota_resolucion')
      .eq('alerta_activa', true)
      .order('respondido_at', { ascending: false });

    if (errorFeedbacks) throw errorFeedbacks;

    // b) Servicios para obtener folio, cliente y tecnico_id
    const { data: servicios, error: errorServicios } = await supabase
      .from('servicios')
      .select('id, folio, cliente, tecnico_id');

    if (errorServicios) throw errorServicios;

    // c) Empleados para obtener nombre del tecnico
    const { data: empleados, error: errorEmpleados } = await supabase
      .from('empleados')
      .select('id, nombre');

    if (errorEmpleados) throw errorEmpleados;

    const alertas = (feedbacks || []).map(f => {
      const servicio = (servicios || []).find(s => s.id === f.servicio_id) || {};
      const empleado = (empleados || []).find(e => e.id === servicio.tecnico_id) || {};

      return {
        id: f.id,
        respondido_at: f.respondido_at,
        respuestas: f.respuestas,
        alerta_activa: f.alerta_activa,
        nota_resolucion: f.nota_resolucion,
        folio: servicio.folio || 'Sin folio',
        cliente: servicio.cliente || 'Sin cliente',
        nombre_tecnico: empleado.nombre || 'Sin tecnico'
      };
    });

    res.status(200).json({ success: true, data: alertas });
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
