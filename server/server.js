const express = require('express');
const cors = require('cors');
require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db')

const app = express();
const allowedOrigins = [
    'https://forja-gimnasio-rosy.vercel.app',
    'http://127.0.0.1:5500',
    'http://localhost:5500'
];
app.use(cors({
    origin: function(origin, callback){
        // permitir requests sin origin (como Postman o curl) y los de la lista
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    }
}));
app.use(express.json());

// ===== Registro =====

app.post('/api/register', async(req, res)=>{
    const { nombre , email , password } = req.body;

    if(!nombre || !email || !password){
        return res.status(400).json({error: 'Faltan datos'});
    }

    try{
        const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if(existe.rows.length > 0){
            return res.status(400).json({error: 'Este mail ya esta registrado'});
        }

        const hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (nombre, email, password_hash) VALUES ($1,$2,$3) RETURNING id, nombre, email',
            [nombre, email, hash]
        )

        const user = result.rows[0];

        const token = jwt.sign ({ userId: user.id}, process.env.JWT_SECRET, {expiresIn: '30d'})

        res.json({token, user: {nombre: user.nombre, email: user.email } })

    }catch(err){
        console.error('Error en el registro', err);
        res.status(500).json({error: 'Error al crear la cuenta'});
    }
    
});

// ===== Login =====

app.post('/api/login', async(req,res)=>{
    const {email, password} = req.body;

    try{
        const result = await pool.query('SELECT * FROM users WHERE email = $1 ', [email]);
        const user = result.rows[0];

        if(!user){
            return res.status(401).json({error: 'Email o contraseña incorrectos'});
        }

        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if(!passwordOk){
            return res.status(401).json({error: 'Email o contraseña incorrectos'})
        }

        const token = jwt.sign({userId: user.id}, process.env.JWT_SECRET, {expiresIn: '30d'});
        res.json({token, user: {nombre: user.nombre , email: user.email } });

    }catch(err){
        console.error('Error en login', err);
        res.status(500).json({error: 'Error al iniciar sesion'});
    }
});

// ===== Middleware: proteger rutas que requieren sesión =====

function requireAuth(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).json({error: 'No hay token'})
    }

    const token = authHeader.split(' ')[1];

    try{
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    }catch(err){
        res.status(500).json({error: 'Token invalido o vencido'})
    }
};

// ===== Traer la rutina activa del usuario logueado =====

app.get('/api/routine', requireAuth, async(req, res)=>{
    try{
        const routine = await pool.query(
            'SELECT * FROM routines WHERE user_id = $1 AND activa = true LIMIT 1',
            [req.userId]
        );

        if(routine.rows.length === 0){
            return res.json({routine: null, exercises: []});
        }

        const exercises = await pool.query(
            'SELECT * FROM routine_exercises WHERE routine_id = $1 ORDER BY orden',
            [routine.rows[0].id]
        )

        res.json({ routine: routine.rows[0], exercises: exercises.rows});
    }catch(err){
        console.error('Error al traer rutina', err)
        res.status(500).json({error: 'Error al cargar la rutina'})
    }
});

// ===== Guardar un registro de entrenamiento =====

app.post('/api/workout-log', requireAuth, async(req, res)=>{
    const { routine_exercise_id, series_real, reps_real, peso_real, nota } = req.body;

    try{
        const result = await pool.query(
            `INSERT INTO workout_logs (user_id, routine_exercise_id, series_real, reps_real, peso_real, nota)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.userId, routine_exercise_id, series_real, reps_real, peso_real, nota]
        )

        res.json({ log: result.rows[0]});
    }catch(err){
        console.error('Error al guardar registro', err)
        res.status(500).json({error: 'Error al guardar'})
    }
})


const SYSTEM_PROMPT = `Sos "El Entrenador IA" de FORJA, un gimnasio de fuerza.
Hablás como un entrenador argentino (usá "vos"), directo y motivador sin sobreactuar.
Preguntá objetivo, días disponibles, experiencia y lesiones de a poco antes de armar una rutina completa.
No diagnostiques lesiones ni recomiendes fármacos o dietas restrictivas.
Respuestas cortas, 4-6 líneas, como un chat real.

Cuando ya tengas info suficiente, armá la rutina COMPLETA de una sola vez (todos los días,
todos los ejercicios) y agregá al FINAL de tu respuesta un bloque así, exactamente con estas
etiquetas, sin explicarlo en el texto visible:

<<ROUTINE>>
{
    "nombre": "Rutina de fuerza",
    "ejercicios": [
        { "dia": "Día 1 - Push", "ejercicio": "Press banca", "series_obj": 4, "reps_obj": "8-12", "peso_obj": 40 }
    ]
}
<<END>>

REGLAS ESTRICTAS sobre este bloque:
- Mandalo UNA SOLA VEZ en toda la conversación, cuando la rutina esté totalmente definida y completa.
- TODOS los ejercicios deben incluir el campo "dia" (ej: "Día 1 - Push"), sin excepción.
- Si el usuario pide un ajuste a una rutina ya armada (cambiar un ejercicio, un peso), mandá el
bloque de nuevo pero con la rutina COMPLETA actualizada (todos los ejercicios, no solo el que cambió).
- Nunca mandes un bloque parcial o incompleto.`;

app.post('/api/chat', requireAuth, async (req, res) => {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Falta el historial de mensajes' });
    }

    try {
        const rutinaActual = await pool.query(
            'SELECT * FROM routines WHERE user_id = $1 AND activa = true LIMIT 1',
            [req.userId]
        );

        let contextoExtra = '';
        if (rutinaActual.rows.length > 0){
            const ejercicios = await pool.query(
                'SELECT * FROM routine_exercises WHERE routine_id = $1',
                [rutinaActual.rows[0].id]
            );
            contextoExtra = `\n\nRutina activa actual del usuario: ${JSON.stringify(ejercicios.rows)}`
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                max_tokens: 3000,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error de Groq:', data);
            return res.status(500).json({ error: 'Error al consultar la IA' });
        }

        let reply = data.choices?.[0]?.message?.content || 'Se me apagó la fragua un segundo, ¿me lo repetís?';

        const match = reply.match(/<<ROUTINE>>([\s\S]*?)<<END>>/);
        if(match){
            try{
                const rutinaData = JSON.parse(match[1].trim());

                const valido = Array.isArray(rutinaData.ejercicios) &&
                    rutinaData.ejercicios.length > 0 &&
                    rutinaData.ejercicios.every(ej => ej.dia && ej.ejercicio && ej.series_obj);

                if(!valido){
                    console.warn('Bloque de rutina incompleto, se ignora:', rutinaData);
                } else {
                    await guardarRutina(req.userId, rutinaData);
                    reply = reply.replace(match[0], '').trim();
                }

            }catch(err){
                console.error('Error al parsear rutina modelo:', err);
            }
        }

        res.json({ reply });

    } catch (err) {
        console.error('Error llamando a Groq:', err);
        res.status(500).json({ error: 'Se cortó la conexión con la fragua' });
    }
});

async function guardarRutina(userId, rutinaData){
    await pool.query(
        'UPDATE routines SET activa = false WHERE user_id = $1',
        [userId]
    );

    const nuevaRutina = await pool.query(
        'INSERT INTO routines (user_id, nombre, activa) VALUES ($1, $2, true) RETURNING id',
        [userId, rutinaData.nombre || 'Mi rutina']
    );

    const routineId = nuevaRutina.rows[0].id;

    for(const [i, ej] of rutinaData.ejercicios.entries()){
        await pool.query(
            `INSERT INTO routine_exercises (routine_id, ejercicio, series_obj, reps_obj, peso_obj, orden, dia)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [routineId, ej.ejercicio, ej.series_obj, ej.reps_obj, ej.peso_obj, i, ej.dia || 'General']
        );
    }
}

app.get('/', (req, res) => {
    res.send('FORJA backend activo');
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));