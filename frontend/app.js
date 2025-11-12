// Estado de los sensores
let sensores = {
    izquierda: 300,
    centro: 300,
    derecha: 300
};

// Funcion para generar datos aleatorios
function generarDatos() {
    return {
        izquierda: Math.random() * 300,
        centro: Math.random() * 300,
        derecha: Math.random() * 300
    };
}

// Funcion para determinar el color segun la distancia
function obtenerColor(distancia) {
    if (distancia < 100) return 'rojo';
    if (distancia < 200) return 'amarillo';
    return 'verde';
}

// Funcion para actualizar la interfaz
function actualizarInterfaz() {
    // Actualizar valores numericos
    document.getElementById('sensor-izquierda').textContent = Math.round(sensores.izquierda) + ' cm';
    document.getElementById('sensor-centro').textContent = Math.round(sensores.centro) + ' cm';
    document.getElementById('sensor-derecha').textContent = Math.round(sensores.derecha) + ' cm';

    // Limpiar bolitas anteriores
    const area = document.getElementById('area-deteccion');
    const bolitas = area.querySelectorAll('.bolita');
    bolitas.forEach(bolita => bolita.remove());

    // Crear nuevas bolitas si es necesario
    if (sensores.izquierda < 250) {
        const bolita = document.createElement('div');
        bolita.className = `bolita ${obtenerColor(sensores.izquierda)}`;
        bolita.style.left = '30%';
        bolita.textContent = Math.round(sensores.izquierda);
        area.appendChild(bolita);
    }

    if (sensores.centro < 250) {
        const bolita = document.createElement('div');
        bolita.className = `bolita ${obtenerColor(sensores.centro)}`;
        bolita.style.left = '50%';
        bolita.textContent = Math.round(sensores.centro);
        area.appendChild(bolita);
    }

    if (sensores.derecha < 250) {
        const bolita = document.createElement('div');
        bolita.className = `bolita ${obtenerColor(sensores.derecha)}`;
        bolita.style.left = '70%';
        bolita.textContent = Math.round(sensores.derecha);
        area.appendChild(bolita);
    }
}

// Iniciar simulacion
function iniciarSimulacion() {
    setInterval(() => {
        sensores = generarDatos();
        actualizarInterfaz();
    }, 1000);
}

// Iniciar cuando la pagina cargue
window.addEventListener('load', () => {
    actualizarInterfaz();
    iniciarSimulacion();
});