// ===== Estado de sesión =====

if(isLoggedIn()){
    onLoginSuccess();
}

function isLoggedIn(){
    return !!localStorage.getItem('forja_token');
}

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

function openChat(){
    if(!isLoggedIn()){
        openModal();
        return;
    }
    chatWindow.classList.add('open');
    launcher.style.display = 'none';
    cwInput.focus();
}

function planClick(){
    if(!isLoggedIn()){
        openModal();
        return;
    }
    document.getElementById('Plans').scrollIntoView({behavior:'smooth'});
}

function loginClick(){
    if(isLoggedIn()){
        logout();
    } else {
        openModal();
    }
}

function logout(){
    const confirmar = confirm("¿Seguro que quieres cerrar sesión?");
    if (confirmar){
        localStorage.removeItem('forja_token');
        localStorage.removeItem('forja_user');

        document.querySelectorAll('.solo-logueado').forEach(el => el.classList.remove('visible'));
        document.querySelector('.login-button').textContent = 'Iniciar sesión'
    }
}

const loginFormEl = document.getElementById('loginForm');
if(loginFormEl){
    loginFormEl.addEventListener('submit', async (e) => {
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

}

const registerFormEl = document.getElementById('registerForm');
if(registerFormEl){
    registerFormEl.addEventListener('submit', async (e) => {
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
}

function onLoginSuccess(){
    document.querySelectorAll('.solo-logueado').forEach(el => el.classList.add('visible'));
    document.querySelector('.login-button').textContent = 'Cerrar sesión';
}

if(isLoggedIn()){
    onLoginSuccess();
}