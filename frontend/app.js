// Estado de los sensores
let sensores = {
    izquierda: 300,
    centro: 300,
    derecha: 300
};

// CONFIGURACIÓN - Cambia esto según necesites
const CONFIG = {
    MODO_SIMULACION: true, // true = datos aleatorios, false = servidor real
    URL_SERVIDOR: "http://127.0.0.1:8000/api/ultrasonic-get"
};

// Función para generar datos aleatorios (SIMULACIÓN)
function generarDatosAleatorios() {
    sensores.izquierda = Math.random() * 300;
    sensores.centro = Math.random() * 300;
    sensores.derecha = Math.random() * 300;
    console.log("Datos simulados:", sensores);
    actualizarInterfaz();
}

// Función para obtener datos del servidor (REAL)
function realizarSolicitud() {
    fetch(CONFIG.URL_SERVIDOR)
        .then(response => {
            console.log("Respuesta:", response);
            return response.json();
        })
        .then(data => {
            console.log("Datos recibidos:", data);
            sensores.izquierda = data.izquierda;
            sensores.centro = data.centro;
            sensores.derecha = data.derecha;
            actualizarInterfaz();
        })
        .catch(error => console.error("Error al obtener datos:", error));
}

// Función para determinar el color según la distancia
function obtenerColor(distancia) {
    if (distancia < 100) return 'rojo';
    if (distancia < 200) return 'amarillo';
    return 'verde';
}

// Función para actualizar la interfaz
function actualizarInterfaz() {
    // Actualizar valores numéricos
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

// Iniciar actualización automática
function iniciarActualizacion() {
    if (CONFIG.MODO_SIMULACION) {
        // Modo simulación: datos aleatorios
        console.log("Iniciando en MODO SIMULACIÓN");
        setInterval(generarDatosAleatorios, 1000);
    } else {
        // Modo real: servidor
        console.log("Iniciando en MODO SERVIDOR");
        setInterval(realizarSolicitud, 1000);
    }
}

// Iniciar cuando la página cargue
window.addEventListener('load', () => {
    actualizarInterfaz();
    iniciarActualizacion();
});
