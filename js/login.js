// ===== Estado de sesión =====
function isLoggedIn(){
    return !!localStorage.getItem('forja_token');
}

// ===== Modal =====
function openModal(){
    document.getElementById("modal-overlay").classList.add("open");
}

function closeModal(){
    document.getElementById("modal-overlay").classList.remove("open");
}

function showAuthTab(which){
    const isLogin = which === 'login';
    document.getElementById("loginModal").classList.toggle("active", isLogin);
    document.getElementById("registerModal").classList.toggle("active", !isLogin);
    document.getElementById("loginForm").style.display = isLogin ? 'block' : 'none';
    document.getElementById("registerForm").style.display = isLogin ? 'none' : 'block';
}

// ===== Gate del chat =====
function openChat(){
    if(!isLoggedIn()){
        openModal();
        return;
    }
    chatWindow.classList.add('open');
    launcher.style.display = 'none';
    cwInput.focus();
}

// ===== Gate de planes =====
function planClick(){
    if(!isLoggedIn()){
        openModal();
        return;
    }
    document.getElementById('Plans').scrollIntoView({behavior:'smooth'});
}

// ===== Login real (conectado al backend) =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type=email]').value;
    const password = e.target.querySelector('input[type=password]').value;

    try {
        const res = await fetch('https://forjagimnasio.onrender.com/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) { alert(data.error); return; }

        localStorage.setItem('forja_token', data.token);
        localStorage.setItem('forja_user', JSON.stringify(data.user));
        closeModal();
        onLoginSuccess();

    } catch (err) {
        console.error(err);
        alert('Error de conexión');
    }
});

// ===== Registro real (conectado al backend) =====
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input');
    const nombre = inputs[0].value;
    const email = inputs[1].value;
    const password = inputs[2].value;

    try {
        const res = await fetch('https://forjagimnasio.onrender.com/api/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nombre, email, password })
        });
        const data = await res.json();

        if (!res.ok) { alert(data.error); return; }

        localStorage.setItem('forja_token', data.token);
        localStorage.setItem('forja_user', JSON.stringify(data.user));
        closeModal();
        onLoginSuccess();

    } catch (err) {
        console.error(err);
        alert('Error de conexión');
    }
});

// ===== Qué pasa cuando el login/registro sale bien =====
function onLoginSuccess(){
    document.querySelectorAll('.solo-logueado').forEach(el => el.style.display = '');
    document.getElementById('trial-button').textContent = 'Mi cuenta';
}

// al cargar la página, revisar si ya había sesión iniciada de antes
if(isLoggedIn()){
    onLoginSuccess();
}