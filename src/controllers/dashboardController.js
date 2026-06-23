const supabase = require('../config/supabaseClient');

// Helper: extrae la calificacion de respuestas sin importar el formato
// Formato nuevo (array): [{ tipo: 'calificacion', calificacion: 5 }, ...]
// Formato viejo (objeto): { p1: '5', p3: 'comentario' }
const extraerCalificacion = (respuestas) => {
    try {
        if (!respuestas) return 0;
        const data = typeof respuestas === 'string' ? JSON.parse(respuestas) : respuestas;

        // Formato nuevo: array de objetos
        if (Array.isArray(data)) {
            const calificaciones = data
                .filter(r => r.tipo === 'calificacion' && r.calificacion !== null && r.calificacion !== undefined)
                .map(r => Number(r.calificacion));
            if (calificaciones.length === 0) return 0;
            return calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length;
        }

        // Formato viejo: objeto con p1
        if (typeof data === 'object' && data.p1 !== undefined) {
            return parseInt(data.p1) || 0;
        }

        return 0;
    } catch (e) {
        return 0;
    }
};

// Helper: extrae el comentario de respuestas sin importar el formato
const extraerComentario = (respuestas) => {
    try {
        if (!respuestas) return 'Sin comentarios';
        const data = typeof respuestas === 'string' ? JSON.parse(respuestas) : respuestas;

        // Formato nuevo: array de objetos
        if (Array.isArray(data)) {
            const textoResp = data.find(r => r.tipo === 'texto' && r.comentario && r.comentario.trim() !== '');
            return textoResp ? textoResp.comentario : 'Sin comentarios escritos';
        }

        // Formato viejo: objeto con p3
        if (typeof data === 'object' && data.p3) {
            return data.p3;
        }

        return 'Sin comentarios';
    } catch (e) {
        return 'Sin comentarios';
    }
};

const obtenerKPIs = async (req, res) => {
    try {
        // 1. Total de servicios
        const { count: totalServicios, error: errServicios } = await supabase
            .from('servicios')
            .select('*', { count: 'exact', head: true });

        if (errServicios) throw errServicios;

        // 2. Todos los feedbacks para calcular metricas
        const { data: feedbacks, error: errFeedback } = await supabase
            .from('feedback_clientes')
            .select('id, respondido_at, respuestas, alerta_activa');

        if (errFeedback) throw errFeedback;

        // 3. Calculos en JavaScript
        const respondidas = feedbacks?.length || 0;
        const pendientes = (totalServicios || 0) - respondidas;

        const todasCalificaciones = (feedbacks || []).flatMap(f => {
            try {
                const arr = typeof f.respuestas === 'string'
                    ? JSON.parse(f.respuestas) : (f.respuestas || []);
                if (!Array.isArray(arr)) return [];
                return arr
                    .filter(r => r.tipo === 'calificacion' && r.calificacion !== null)
                    .map(r => Number(r.calificacion));
            } catch (e) {
                return [];
            }
        });

        const promedio = todasCalificaciones.length > 0
            ? (todasCalificaciones.reduce((a, b) => a + b, 0)
                / todasCalificaciones.length).toFixed(2)
            : '0.00';

        // 4. Ultimos 5 feedbacks con folio y cliente
        const { data: recientes, error: errRecientes } = await supabase
            .from('feedback_clientes')
            .select('id, respondido_at, respuestas, servicio_id')
            .order('respondido_at', { ascending: false })
            .limit(5);

        if (errRecientes) throw errRecientes;

        const servicioIds = recientes?.map(r => r.servicio_id).filter(Boolean) || [];

        let serviciosRecientes = [];
        if (servicioIds.length > 0) {
            const { data: sData, error: errSvc } = await supabase
                .from('servicios')
                .select('id, folio, cliente')
                .in('id', servicioIds);

            if (errSvc) throw errSvc;
            serviciosRecientes = sData || [];
        }

        const recientesConFolio = (recientes || []).map(r => {
            const s = serviciosRecientes.find(sv => sv.id === r.servicio_id) || {};
            return {
                id: r.id,
                respondido_at: r.respondido_at,
                folio: s.folio || 'Sin folio',
                cliente: s.cliente || 'Sin cliente'
            };
        });

        res.status(200).json({
            exito: true,
            kpis: {
                enviadas: totalServicios || 0,
                respondidas,
                pendientes: pendientes < 0 ? 0 : pendientes,
                promedio
            },
            recientes: recientesConFolio
        });

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error de servidor fatal', error: error.message });
    }
};

module.exports = { obtenerKPIs };