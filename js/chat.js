const API_URL = 'https://forjagimnasio.onrender.com/api/chat';

const chatWindow = document.getElementById('chatWindow');
const launcher = document.getElementById('launcher');
const cwBody = document.getElementById('cwBody');
const cwInput = document.getElementById('cwInput');
const cwQuick = document.getElementById('cwQuick');

let conversationHistory = [];
let isWaitingResponse = false;

const STORAGE_KEY = 'forja_chat_historial';

function guradarHistorial(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
}

function cargarHistorial(){
    const guardado = localStorage.getItem(STORAGE_KEY);
    if(!guardado) return false;

    try{
        const historial = JSON.parse(guardado);
        if(!Array.isArray(historial) || historial.length === 0) return false;

        conversationHistory = historial

        cwBody.innerHTML = ''
        historial.forEach(msg=>{
            addBubble(msg.content, msg.role === 'user' ? 'user' : 'bot');
        })

        return true
    } catch(err){
        console.error('No se pudo cargar el historial: ', err);
        return false
    }
}

function openChat(){
    chatWindow.classList.add('open');
    launcher.style.display = 'none';
    cwInput.focus();
}

function closeChat(){
    chatWindow.classList.remove('open');
    launcher.style.display = 'flex';
}

async function callHerrero(userText){
    conversationHistory.push({ role: 'user', content: userText });
    guradarHistorial();

    const token = localStorage.getItem('forja_token');

    try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: conversationHistory })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Error desconocido del servidor');
    }

    conversationHistory.push({ role: 'assistant', content: data.reply });
    guradarHistorial();
    return data.reply;

    } catch (err) {
    console.error('Error llamando al Entrenador IA:', err);
    return 'Se cortó la conexión con la fragua. Probá de nuevo en unos segundos.';
    }
}

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

cargarHistorial();

cwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMsg();
});