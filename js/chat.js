const API_URL = 'http://localhost:3000/api/chat';

// Referencias a elementos del DOM
const chatWindow = document.getElementById('chatWindow');
const launcher = document.getElementById('launcher');
const cwBody = document.getElementById('cwBody');
const cwInput = document.getElementById('cwInput');
const cwQuick = document.getElementById('cwQuick');

// Historial de conversación (se manda completo en cada request,
// porque el backend/la IA no tiene memoria propia entre llamadas)
let conversationHistory = [];
let isWaitingResponse = false;

// ---------- Abrir / cerrar el chat ----------
function openChat(){
    chatWindow.classList.add('open');
    launcher.style.display = 'none';
    cwInput.focus();
}

function closeChat(){
    chatWindow.classList.remove('open');
    launcher.style.display = 'flex';
}

// ---------- Llamada al backend ----------
async function callHerrero(userText){
    conversationHistory.push({ role: 'user', content: userText });

    try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Error desconocido del servidor');
    }

    conversationHistory.push({ role: 'assistant', content: data.reply });
    return data.reply;

    } catch (err) {
    console.error('Error llamando al Entrenador IA:', err);
    return 'Se cortó la conexión con la fragua. Probá de nuevo en unos segundos.';
    }
}

// ---------- Renderizado de mensajes ----------
function addBubble(text, who){
    const b = document.createElement('div');
    b.className = 'bubble ' + who;
    b.textContent = text;
    cwBody.appendChild(b);
    cwBody.scrollTop = cwBody.scrollHeight;
}

function showTyping(){
    const t = document.createElement('div');
    t.className = 'typing';
    t.id = 'typingIndicator';
    t.innerHTML = '<span></span><span></span><span></span>';
    cwBody.appendChild(t);
    cwBody.scrollTop = cwBody.scrollHeight;
}

function hideTyping(){
    const t = document.getElementById('typingIndicator');
    if (t) t.remove();
}

// ---------- Flujo de envío ----------
async function respondTo(text){
    if (isWaitingResponse) return;
    isWaitingResponse = true;

    cwInput.disabled = true;
    cwQuick.style.pointerEvents = 'none';
    cwQuick.style.opacity = '0.5';

    showTyping();
    const reply = await callHerrero(text);
    hideTyping();
    addBubble(reply, 'bot');

    isWaitingResponse = false;
    cwInput.disabled = false;
    cwQuick.style.pointerEvents = 'auto';
    cwQuick.style.opacity = '1';
    cwInput.focus();
}

function sendMsg(){
    if (isWaitingResponse) return;
    const val = cwInput.value.trim();
    if (!val) return;

    addBubble(val, 'user');
    cwInput.value = '';
    respondTo(val);
}

function quickMsg(text){
    if (isWaitingResponse) return;
    addBubble(text, 'user');
    respondTo(text);
}

// ---------- Enter para enviar ----------
cwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMsg();
});