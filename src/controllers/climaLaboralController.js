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
const construirFiltroFechas = (desde, hasta) => {
  const fechaDesde = desde
    ? new Date(desde + 'T00:00:00.000Z').toISOString()
    : new Date('2000-01-01').toISOString();
  const fechaHasta = hasta
    ? new Date(hasta + 'T23:59:59.999Z').toISOString()
    : new Date().toISOString();
  return { fechaDesde, fechaHasta };
};

// Helper: inicio de semana (lunes), replica date_trunc('week', ...) de Postgres
const inicioSemana = (fecha) => {
  const d = new Date(fecha);
  const dia = d.getUTCDay();
  const diff = (dia === 0 ? -6 : 1) - dia;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const generarRonda = async (req, res) => {
  const { periodo } = req.body;

  if (!periodo) {
    return res.status(400).json({ success: false, message: 'periodo es requerido' });
  }

  try {
    const { data: empleados, error: errorEmpleados } = await supabase
      .from('empleados')
      .select('id, puesto');

    if (errorEmpleados) throw errorEmpleados;

    if (!empleados || empleados.length === 0) {
      return res.status(200).json({ success: true, data: { generados: 0, periodo } });
    }

    // Resuelve, por cada puesto distinto, el id de configuracion a usar:
    // 'empleado_' + puesto si existe, si no cae al fallback generico 'empleado'.
    const puestosUnicos = [...new Set(empleados.map(e => e.puesto).filter(Boolean))];
    const configPorPuesto = {};

    if (puestosUnicos.length > 0) {
      const idsBuscados = puestosUnicos.map(puesto => `empleado_${puesto}`);
      const { data: configs, error: errorConfigs } = await supabase
        .from('configuracion_encuestas')
        .select('id')
        .in('id', idsBuscados);

      if (errorConfigs) {
        console.warn('[generarRonda] Fallo el lookup de configuraciones por puesto, se usara el fallback "empleado" para todos:', errorConfigs.message);
      } else {
        const idsExistentes = new Set((configs || []).map(c => c.id));
        puestosUnicos.forEach(puesto => {
          const idEsperado = `empleado_${puesto}`;
          configPorPuesto[puesto] = idsExistentes.has(idEsperado) ? idEsperado : 'empleado';
        });
      }
    }

    const filas = empleados.map(empleado => {
      const configId = empleado.puesto
        ? (configPorPuesto[empleado.puesto] || 'empleado')
        : 'empleado';

      console.log(`[generarRonda] empleado ${empleado.id} (puesto: ${empleado.puesto || 'N/A'}) -> config: ${configId}`);

      return {
        empleado_id: empleado.id,
        periodo,
        puesto: empleado.puesto
      };
    });

    const { data: insertados, error: errorInsert } = await supabase
      .from('feedback_empleados')
      .insert(filas)
      .select();

    if (errorInsert) throw errorInsert;

    res.status(200).json({
      success: true,
      data: {
        generados: insertados?.length || 0,
        periodo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar la ronda de clima laboral', error: error.message });
  }
};

const obtenerKpisClima = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(desde, hasta);

    const { data: envios, error: errorEnvios } = await supabase
      .from('feedback_empleados')
      .select('respondido_at, respuestas')
      .gte('created_at', fechaDesde)
      .lte('created_at', fechaHasta);

    if (errorEnvios) throw errorEnvios;

    const filas = envios || [];
    const total_enviadas = filas.length;
    const respondidas = filas.filter(f => f.respondido_at !== null);
    const total_respondidas = respondidas.length;

    const participacion = total_enviadas > 0
      ? Math.min(Number(((total_respondidas / total_enviadas) * 100).toFixed(1)), 100)
      : 0;

    const calificaciones = respondidas.flatMap(f => {
      const arr = Array.isArray(f.respuestas) ? f.respuestas : [];
      return arr
        .filter(r => r.tipo === 'calificacion' && r.calificacion !== null)
        .map(r => Number(r.calificacion));
    });

    const promedio_general = calificaciones.length > 0
      ? Number((calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length).toFixed(2))
      : null;

    res.status(200).json({
      success: true,
      data: {
        total_enviadas,
        total_respondidas,
        participacion,
        promedio_general
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener KPIs de clima laboral', error: error.message });
  }
};

const obtenerTendenciaClima = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(desde, hasta);

    const { data, error } = await supabase
      .from('feedback_empleados')
      .select('respondido_at, respuestas')
      .not('respondido_at', 'is', null)
      .gte('respondido_at', fechaDesde)
      .lte('respondido_at', fechaHasta);

    if (error) throw error;

    const filas = data || [];
    if (filas.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const semanasMap = {};

    filas.forEach(f => {
      const semana = inicioSemana(f.respondido_at);

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

    resultado.sort((a, b) => a.semana.localeCompare(b.semana));

    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener tendencia de clima laboral', error: error.message });
  }
};

const obtenerPorPuesto = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const { fechaDesde, fechaHasta } = construirFiltroFechas(desde, hasta);

    const { data, error } = await supabase
      .from('feedback_empleados')
      .select('puesto, respuestas')
      .not('respondido_at', 'is', null)
      .gte('respondido_at', fechaDesde)
      .lte('respondido_at', fechaHasta);

    if (error) throw error;

    const grupos = {};

    (data || []).forEach(f => {
      const puesto = f.puesto || 'Sin puesto';
      if (!grupos[puesto]) {
        grupos[puesto] = { puesto, calificaciones: [], total: 0 };
      }

      const promedio = calcularPromedio(f.respuestas);
      if (promedio !== null) {
        grupos[puesto].calificaciones.push(promedio);
      }
      grupos[puesto].total++;
    });

    const resultado = Object.values(grupos)
      .filter(g => g.total >= 3)
      .map(g => ({
        puesto: g.puesto,
        promedio: g.calificaciones.length > 0
          ? g.calificaciones.reduce((a, b) => a + b, 0) / g.calificaciones.length
          : 0,
        total: g.total
      }));

    resultado.sort((a, b) => b.promedio - a.promedio);

    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener metricas por puesto', error: error.message });
  }
};

// GET /api/clima-laboral/configs - Lista las configuraciones de encuesta por empleado/puesto
const obtenerConfigs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('configuracion_encuestas')
      .select('id, preguntas, updated_at')
      .like('id', 'empleado%')
      .order('id');

    if (error) throw error;

    res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener las configuraciones', error: error.message });
  }
};

// GET /api/clima-laboral/configs/:configId - Obtiene una configuracion puntual
const obtenerConfigPorId = async (req, res) => {
  const { configId } = req.params;

  try {
    const { data, error } = await supabase
      .from('configuracion_encuestas')
      .select('id, preguntas, updated_at')
      .eq('id', configId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, message: 'Config no encontrada' });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener la configuracion', error: error.message });
  }
};

// PUT /api/clima-laboral/configs/:configId - Actualiza las preguntas de una configuracion existente
const actualizarConfig = async (req, res) => {
  const { configId } = req.params;
  const { preguntas } = req.body;

  if (!Array.isArray(preguntas)) {
    return res.status(400).json({ success: false, message: 'El campo preguntas es requerido y debe ser un array' });
  }

  try {
    const { data: existente, error: errorExistente } = await supabase
      .from('configuracion_encuestas')
      .select('id')
      .eq('id', configId)
      .maybeSingle();

    if (errorExistente) throw errorExistente;

    if (!existente) {
      return res.status(404).json({ success: false, message: 'Config no encontrada' });
    }

    const { error: errorUpdate } = await supabase
      .from('configuracion_encuestas')
      .update({ preguntas, updated_at: new Date().toISOString() })
      .eq('id', configId);

    if (errorUpdate) throw errorUpdate;

    res.status(200).json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar la configuracion', error: error.message });
  }
};

// POST /api/clima-laboral/configs - Crea una configuracion nueva para un puesto
const crearConfig = async (req, res) => {
  const { puesto } = req.body;

  if (!puesto || typeof puesto !== 'string' || !puesto.trim()) {
    return res.status(400).json({ success: false, message: 'puesto es requerido' });
  }

  const id = `empleado_${puesto.trim()}`;

  try {
    const { data: existente, error: errorExistente } = await supabase
      .from('configuracion_encuestas')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (errorExistente) throw errorExistente;

    if (existente) {
      return res.status(409).json({ success: false, message: 'Ya existe una configuración para ese puesto' });
    }

    const { data: creado, error: errorInsert } = await supabase
      .from('configuracion_encuestas')
      .insert({ id, preguntas: [], updated_at: new Date().toISOString() })
      .select('id, preguntas')
      .single();

    if (errorInsert) throw errorInsert;

    res.status(201).json({ success: true, data: creado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear la configuracion', error: error.message });
  }
};

module.exports = {
  generarRonda,
  obtenerKpisClima,
  obtenerTendenciaClima,
  obtenerPorPuesto,
  obtenerConfigs,
  obtenerConfigPorId,
  actualizarConfig,
  crearConfig
};
