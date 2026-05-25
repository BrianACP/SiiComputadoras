const supabase = require('../config/supabaseClient');

const obtenerKPIs = async (req, res) => {
    try {
        const { count: totalServicios, error: errServicios } = await supabase
            .from('servicios')
            .select('*', { count: 'exact', head: true });

        if (errServicios) {
            console.error("Fallo al contar servicios:", errServicios);
            return res.status(500).json({ 
                exito: false, 
                mensaje: 'Error en la tabla servicios', 
                detalle: errServicios 
            });
        }

        // CORRECCIÓN AQUÍ: Cambiamos 'nombre' por 'company_name'
        const { data: feedbackData, error: errFeedback } = await supabase
            .from('feedback_clientes')
            .select(`
                respuestas, 
                created_at, 
                servicios (
                    clientes ( company_name )
                )
            `)
            .order('created_at', { ascending: false });

        if (errFeedback) {
            console.error("Fallo al cruzar datos de feedback:", errFeedback);
            return res.status(500).json({ 
                exito: false, 
                mensaje: 'Error en la tabla feedback o en las relaciones', 
                detalle: errFeedback 
            });
        }

        const totalRespuestas = feedbackData.length;
        let sumaCalificaciones = 0;
        let encuestasCalificadas = 0;

        const ultimosComentarios = feedbackData.map(f => {
            const calificacion = parseInt(f.respuestas.p1) || 0;
            if (calificacion > 0) {
                sumaCalificaciones += calificacion;
                encuestasCalificadas++;
            }
            return {
                // CORRECCIÓN AQUÍ: Leemos 'company_name'
                cliente: f.servicios?.clientes?.company_name || 'Cliente Anónimo',
                fecha: f.created_at,
                calificacion: calificacion,
                comentario: f.respuestas.p3 || 'Sin comentarios'
            };
        });

        const promedio = encuestasCalificadas > 0 
            ? (sumaCalificaciones / encuestasCalificadas).toFixed(1) 
            : 0;

        res.status(200).json({
            exito: true,
            kpis: {
                enviadas: totalServicios || 0,
                respondidas: totalRespuestas,
                pendientes: (totalServicios || 0) - totalRespuestas,
                promedio: promedio
            },
            recientes: ultimosComentarios.slice(0, 10)
        });

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error de servidor fatal', error: error.message });
    }
};

module.exports = { obtenerKPIs };