const API_BASE = 'https://forjagimnasio.onrender.com';

async function cargarRutina() {
    const token = localStorage.getItem('forja_token');
    if(!token){
        window.location.href = 'index.html';
        return;
    }

    try{
        const res = await fetch(`${API_BASE}/api/routine`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if(!res.ok){
            alert(data.error || 'Error al cargar la rutina');
            return;
        }

        if(!data.routine){
            mostrarSinRutina();
            return;
        }

        renderizarEjercicios(data.exercises);
    } catch(err){
        console.error("Error al cargar rutina: ", err)
    }
}

function mostrarSinRutina(){
    document.getElementById('routineContainer').innerHTML = `
        <p style="color:#b6b0a0; text-align:center; padding:40px;">
        Todavía no tenés una rutina activa. Hablá con el Entrenador IA para que te arme una.
        </p>
    `
}

function renderizarEjercicios(exercises){
    const container = document.getElementById('routineContainer');
    container.innerHTML = '';

    const porDia = {};

    exercises.forEach(ex =>{
        const dia = ex.dia || 'General';
        if(!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(ex);

        Object.keys(porDia).forEach(dia => {
            const tag = document.createElement('div');
            tag.className = 'day-tag';
            tag.textContent = dia;
            container.appendChild(tag);
        })

        porDia[dia].forEach(ex => {
            const card = document.createElement('div');
        card.className = 'exercise-card'
        card.innerHTML = `
            <div class="ex-top">
                <div>
                    <div class="ex-name">${ex.ejercicio}</div>
                    <div class="ex-target">Objetivo: ${ex.series_obj}×${ex.reps_obj} · ${ex.peso_obj}kg</div>
                </div>
                <span class="status-pill pending">Pendiente</span>
            </div>
            <div class="log-row">
                <div class="log-field"><label>Series</label><input type="number" class="input-series"></div>
                <div class="log-field"><label>Reps</label><input type="number" class="input-reps"></div>
                <div class="log-field"><label>Peso (kg)</label><input type="number" class="input-peso"></div>
                <button class="log-btn" onclick="guardarRegistro(${ex.id}, this)">Guardar</button>
            </div>
            `;
            container.appendChild(card)
        });
    })
}

async function guardarRegistro(routineExercise, btnEl){
    const card = btnEl.closest('.exercise-card')
    const series_real = card.querySelector('.input-series').value;
    const reps_real = card.querySelector('.input-reps').value;
    const peso_real = card.querySelector('.input-peso').value;

    const token = localStorage.getItem("forja_token");

    try{
        const res = await fetch(`${API_BASE}/api/workout-log`,{
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer: ${token}`
            },
            body: JSON.stringify({
                routine_exercise_id: routineExerciseId,
                series_real, reps_real, peso_real
            })
        });

        if(!res.ok) {alert('Error al guardar'); return};

        card.querySelector('.status-pill').textContent = '✓ Cargado';
        card.querySelector('.status-pill').className = 'status-pill done'
    } catch(err){
        console.error(err)
    };
}

cargarRutina()
