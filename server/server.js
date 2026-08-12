const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: 'https://forja-gimnasio-rosy.vercel.app'
}));
app.use(express.json());

const SYSTEM_PROMPT = `Sos "El Entrenador IA" de FORJA, un gimnasio de fuerza.
Hablás como un entrenador argentino (usá "vos"), directo y motivador sin sobreactuar.
No tenés datos previos de la persona: preguntá objetivo, días disponibles, experiencia
y lesiones de a poco antes de armar una rutina completa.
No diagnostiques lesiones ni recomiendes fármacos o dietas restrictivas.
Respuestas cortas, 4-6 líneas, como un chat real.`;

app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Falta el historial de mensajes' });
    }

    try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
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

    const reply = data.choices?.[0]?.message?.content || 'Se me apagó la fragua un segundo, ¿me lo repetís?';

    res.json({ reply });

    } catch (err) {
        console.error('Error llamando a Groq:', err);
        res.status(500).json({ error: 'Se cortó la conexión con la fragua' });
    }
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));