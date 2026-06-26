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

const esFechaValida = (fecha) => !Number.isNaN(new Date(fecha).getTime());

/**
 * FUNCION 1: obtenerResumen
 * Obtiene un resumen general de encuestas y servicios en un periodo.
 */
const obtenerResumen = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(desde, hasta);

    const { data: serviciosPeriodo, error: errorServicios } = await supabase
      .from('servicios')
      .select('id')
      .gte('created_at', fechaDesde)
      .lte('created_at', fechaHasta);

    if (errorServicios) throw errorServicios;

    const serviciosIdsPeriodo = (serviciosPeriodo || []).map(servicio => servicio.id);
    const total_servicios = serviciosIdsPeriodo.length;

    if (total_servicios === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total_respondidas: 0,
          participacion: 0,
          promedio_general: 0,
          total_alertas: 0,
          total_servicios: 0
        }
      });
    }

    const { data: feedbacks, error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .select('servicio_id, respondido_at, respuestas, alerta_activa')
      .in('servicio_id', serviciosIdsPeriodo);

    if (errorFeedback) throw errorFeedback;

    const serviciosRespondidosUnicos = new Set(
      (feedbacks || [])
        .filter(f => f.respondido_at)
        .map(f => f.servicio_id)
        .filter(Boolean)
    );

    const total_respondidas = serviciosRespondidosUnicos.size;
    const total_alertas = (feedbacks || []).filter(f => f.alerta_activa).length;
    const participacion = total_servicios > 0
      ? Math.min(Number(((total_respondidas / total_servicios) * 100).toFixed(1)), 100)
      : 0;

    const promedios = (feedbacks || [])
      .map(f => calcularPromedio(f.respuestas))
      .filter(p => p !== null);

    const promedio_general = promedios.length > 0
      ? promedios.reduce((a, b) => a + b, 0) / promedios.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        total_respondidas,
        participacion,
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

    // Agrupar feedbacks por tecnico_id
    const grupos = {};

    (feedbacks || []).forEach(f => {
      const servicio = (servicios || []).find(s => s.id === f.servicio_id);
      if (!servicio) return;

      const tid = servicio.tecnico_id;
      if (!tid) return;

      if (!grupos[tid]) {
        const empleado = (empleados || []).find(e => e.id === tid);
        grupos[tid] = {
          tecnico_id: tid,
          nombre: empleado?.nombre || 'Sin nombre',
          calificaciones: [],
          total_evaluaciones: 0
        };
      }

      const promedio = calcularPromedio(f.respuestas);
      if (promedio !== null) {
        grupos[tid].calificaciones.push(promedio);
      }
      grupos[tid].total_evaluaciones++;
    });

    const resultado = Object.values(grupos).map(g => ({
      tecnico_id: g.tecnico_id,
      nombre: g.nombre,
      total_evaluaciones: g.total_evaluaciones,
      promedio: g.calificaciones.length > 0
        ? g.calificaciones.reduce((a, b) => a + b, 0) / g.calificaciones.length
        : 0
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

    const { data: serviciosPeriodo, error: errorServicios } = await supabase
      .from('servicios')
      .select('id, created_at')
      .gte('created_at', fechaDesde)
      .lte('created_at', fechaHasta);

    if (errorServicios) throw errorServicios;

    const servicios = serviciosPeriodo || [];
    if (servicios.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const serviciosIds = servicios.map(servicio => servicio.id);
    const serviciosPorId = servicios.reduce((acc, servicio) => {
      acc[servicio.id] = servicio;
      return acc;
    }, {});

    const { data: feedbacks, error: errorFeedback } = await supabase
      .from('feedback_clientes')
      .select('servicio_id, respuestas')
      .in('servicio_id', serviciosIds);

    if (errorFeedback) throw errorFeedback;

    const semanasMap = {};

    (feedbacks || []).forEach(f => {
      const servicio = serviciosPorId[f.servicio_id];
      if (!servicio?.created_at) return;

      // Usar fecha simple YYYY-MM-DD para evitar problemas de formato
      const semana = new Date(servicio.created_at).toISOString().slice(0, 10);

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
 * FUNCION 4: getDistribucion
 * Distribucion de encuestas por nivel de satisfaccion.
 */
const getDistribucion = async (req, res) => {
  const { fechaDesde: fechaDesdeQuery, fechaHasta: fechaHastaQuery } = req.query;

  const fechaHastaBase = fechaHastaQuery
    ? new Date(`${fechaHastaQuery}T00:00:00.000Z`)
    : new Date();
  const fechaDesdeBase = fechaDesdeQuery
    ? new Date(`${fechaDesdeQuery}T00:00:00.000Z`)
    : new Date(fechaHastaBase);

  if (!fechaDesdeQuery) {
    fechaDesdeBase.setUTCDate(fechaDesdeBase.getUTCDate() - 29);
  }

  if (!esFechaValida(fechaDesdeBase) || !esFechaValida(fechaHastaBase)) {
    return res.status(400).json({
      success: false,
      message: 'Las fechas deben tener formato YYYY-MM-DD'
    });
  }

  if (fechaDesdeBase > fechaHastaBase) {
    return res.status(400).json({
      success: false,
      message: 'fechaDesde no puede ser mayor que fechaHasta'
    });
  }

  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(
      fechaDesdeBase.toISOString().slice(0, 10),
      fechaHastaBase.toISOString().slice(0, 10)
    );

    const { data: serviciosPeriodo, error: errorServicios } = await supabase
      .from('servicios')
      .select('id')
      .gte('created_at', fechaDesde)
      .lte('created_at', fechaHasta);

    if (errorServicios) throw errorServicios;

    const serviciosIds = (serviciosPeriodo || []).map(servicio => servicio.id);
    if (serviciosIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { excelente: 0, bueno: 0, regular: 0, malo: 0, total: 0 }
      });
    }

    const { data, error } = await supabase
      .from('feedback_clientes')
      .select('id, respuestas')
      .in('servicio_id', serviciosIds)
      .not('respondido_at', 'is', null)
      ;

    if (error) throw error;

    const distribucion = {
      excelente: 0,
      bueno: 0,
      regular: 0,
      malo: 0,
      total: 0
    };

    (data || []).forEach((feedback) => {
      const respuestas = Array.isArray(feedback.respuestas) ? feedback.respuestas : [];
      const calificaciones = respuestas
        .filter((item) => item.tipo === 'calificacion' && item.calificacion !== null)
        .map((item) => Number(item.calificacion))
        .filter((valor) => Number.isFinite(valor));

      if (calificaciones.length === 0) return;

      const promedio = calificaciones.reduce((acumulado, valor) => acumulado + valor, 0) / calificaciones.length;

      if (promedio >= 4.5) {
        distribucion.excelente++;
      } else if (promedio >= 3.5) {
        distribucion.bueno++;
      } else if (promedio >= 2.5) {
        distribucion.regular++;
      } else {
        distribucion.malo++;
      }

      distribucion.total++;
    });

    res.status(200).json({ success: true, data: distribucion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener distribucion', error: error.message });
  }
};

/**
 * FUNCION 5: obtenerDetalleTecnico
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
 * FUNCION 6: obtenerAlertas
 * Obtiene todas las encuestas con alerta_activa = true.
 * Usa 3 consultas separadas y une en JavaScript.
 */
const obtenerAlertas = async (req, res) => {
  const { fechaDesde: fechaDesdeQuery, fechaHasta: fechaHastaQuery } = req.query;

  const fechaHastaBase = fechaHastaQuery
    ? new Date(`${fechaHastaQuery}T00:00:00.000Z`)
    : new Date();
  const fechaDesdeBase = fechaDesdeQuery
    ? new Date(`${fechaDesdeQuery}T00:00:00.000Z`)
    : new Date(fechaHastaBase);

  if (!fechaDesdeQuery) {
    fechaDesdeBase.setUTCDate(fechaDesdeBase.getUTCDate() - 29);
  }

  if (!esFechaValida(fechaDesdeBase) || !esFechaValida(fechaHastaBase)) {
    return res.status(400).json({
      success: false,
      message: 'Las fechas deben tener formato YYYY-MM-DD'
    });
  }

  if (fechaDesdeBase > fechaHastaBase) {
    return res.status(400).json({
      success: false,
      message: 'fechaDesde no puede ser mayor que fechaHasta'
    });
  }

  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(
      fechaDesdeBase.toISOString().slice(0, 10),
      fechaHastaBase.toISOString().slice(0, 10)
    );

    // a) Feedbacks con alerta activa (sin pedir folio ni cliente, no existen aqui)
    const { data: feedbacks, error: errorFeedbacks } = await supabase
      .from('feedback_clientes')
      .select('id, servicio_id, respondido_at, respuestas, alerta_activa, nota_resolucion')
      .eq('alerta_activa', true)
      .not('respondido_at', 'is', null)
      .gte('respondido_at', fechaDesde)
      .lte('respondido_at', fechaHasta)
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
 * FUNCION 7: guardarNotaResolucion
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
      .update({ nota_resolucion, alerta_activa: false })
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
  getDistribucion,
  obtenerDetalleTecnico,
  obtenerAlertas,
  guardarNotaResolucion
};
