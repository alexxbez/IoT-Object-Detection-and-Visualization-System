import { useState, useEffect } from 'react';

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  MODO_SIMULACION: true,
  URL_SERVIDOR: "http://127.0.0.1:8000/api/ultrasonic-get",
  URL_CAMARA: "http://127.0.0.1:8000/api/camera/stream"
};

export default function DetectorProximidad() {
  
  const [sensores, setSensores] = useState({
    izquierda: 300,
    centro: 300,
    derecha: 300
  });

  const [imagenCamara, setImagenCamara] = useState(null);

  // ============================================
  // OBTENER DATOS DEL SERVIDOR
  // ============================================
  const realizarSolicitud = () => {
    fetch(CONFIG.URL_SERVIDOR)
      .then(response => response.json())
      .then(data => {
        console.log("Datos recibidos:", data);
        setSensores({
          izquierda: data.izquierda,
          centro: data.centro,
          derecha: data.derecha
        });
        
        // Si el servidor envía imagen de cámara
        if (data.frame) {
          setImagenCamara('data:image/jpeg;base64,' + data.frame);
        }
      })
      .catch(error => console.error("Error:", error));
  };

  // ============================================
  // GENERAR DATOS ALEATORIOS
  // ============================================
  const generarDatosAleatorios = () => {
    const nuevosDatos = {
      izquierda: Math.random() * 300,
      centro: Math.random() * 300,
      derecha: Math.random() * 300
    };
    setSensores(nuevosDatos);
  };

  // ============================================
  // INICIAR ACTUALIZACIÓN
  // ============================================
  useEffect(() => {
    if (CONFIG.MODO_SIMULACION) {
      console.log("MODO SIMULACIÓN");
      const interval = setInterval(generarDatosAleatorios, 1000);
      return () => clearInterval(interval);
    } else {
      console.log("MODO SERVIDOR");
      const interval = setInterval(realizarSolicitud, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // ============================================
  // OBTENER COLOR
  // ============================================
  const obtenerColor = (distancia) => {
    if (distancia < 100) return '#ef4444';
    if (distancia < 200) return '#ecc94b';
    return '#48bb78';
  };

  // ============================================
  // RENDER
  // ============================================
  return (

    <div style={estilos.contenedor}>
      
      {/* CUADRADOS DE DISTANCIAS - ARRIBA IZQUIERDA */}
      <div style={estilos.panelSensores}>
        <div style={estilos.tarjetaSensor}>
          <div style={estilos.etiquetaSensor}>IZQUIERDA</div>
          <div style={{...estilos.valorSensor, color: obtenerColor(sensores.izquierda)}}>
            {Math.round(sensores.izquierda)} cm
          </div>
        </div>
        <div style={estilos.tarjetaSensor}>
          <div style={estilos.etiquetaSensor}>CENTRO</div>
          <div style={{...estilos.valorSensor, color: obtenerColor(sensores.centro)}}>
            {Math.round(sensores.centro)} cm
          </div>
        </div>
        <div style={estilos.tarjetaSensor}>
          <div style={estilos.etiquetaSensor}>DERECHA</div>
          <div style={{...estilos.valorSensor, color: obtenerColor(sensores.derecha)}}>
            {Math.round(sensores.derecha)} cm
          </div>
        </div>
      </div>

      {/* CÁMARA - ARRIBA DERECHA */}
      <div style={estilos.camaraContainer}>
        {imagenCamara ? (
          <img 
            src={imagenCamara} 
            alt="Cámara" 
            style={estilos.camaraImagen}
          />
        ) : (
          <div style={estilos.camaraPlaceholder}>
            📹
            <div style={estilos.camaraTexto}>Esperando cámara...</div>
          </div>
        )}
      </div>

      {/* ÁREA DE DETECCIÓN */}
      <div style={estilos.areaDeteccion}>
        
        {/* COCHE - PARTE SUPERIOR */}
        <div style={estilos.cocheContainer}>
          <div style={estilos.coche}>
            {/* Parabrisas superior */}
            <div style={estilos.parabrisas}></div>
            
            {/* Capó */}
            <div style={estilos.capo}>
              {/* Línea central del capó */}
              <div style={estilos.lineaCapo}></div>
            </div>
            
            {/* Ventanas laterales */}
            <div style={estilos.ventanaIzq}></div>
            <div style={estilos.ventanaDer}></div>
            
            {/* Sombras laterales */}
            <div style={estilos.sombraIzq}></div>
            <div style={estilos.sombraDer}></div>
            
            {/* Parte trasera oscura */}
            <div style={estilos.parteTraseraCoche}></div>
          </div>
          
          <div style={estilos.etiquetaCoche}>TU COCHE</div>
        </div>

        {/* BOLITAS - PARTE INFERIOR (MÁS CENTRADAS) */}
        <div style={estilos.bolitasContainer}>
          {sensores.izquierda < 250 && (
            <div style={{
              ...estilos.bolita,
              left: '35%',
              backgroundColor: obtenerColor(sensores.izquierda)
            }}>
              <span style={estilos.textoBolita}>
                {Math.round(sensores.izquierda)}
              </span>
            </div>
          )}

          {sensores.centro < 250 && (
            <div style={{
              ...estilos.bolita,
              left: '50%',
              backgroundColor: obtenerColor(sensores.centro)
            }}>
              <span style={estilos.textoBolita}>
                {Math.round(sensores.centro)}
              </span>
            </div>
          )}

          {sensores.derecha < 250 && (
            <div style={{
              ...estilos.bolita,
              left: '65%',
              backgroundColor: obtenerColor(sensores.derecha)
            }}>
              <span style={estilos.textoBolita}>
                {Math.round(sensores.derecha)}
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

// ============================================
// ESTILOS
// ============================================
const estilos = {

  contenedor: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#1a202c',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif'
  },

  panelSensores: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    display: 'flex',
    gap: '15px',
    zIndex: 10
  },

  tarjetaSensor: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    padding: '15px 20px',
    borderRadius: '10px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    minWidth: '120px',
    textAlign: 'center'
  },

  etiquetaSensor: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '11px',
    marginBottom: '8px',
    fontWeight: 'bold'
  },

  valorSensor: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },

  // CÁMARA - ARRIBA DERECHA
  camaraContainer: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '280px',
    height: '200px',
    backgroundColor: 'black',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '3px solid #3b82f6',
    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.5)',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  camaraImagen: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  camaraPlaceholder: {
    color: '#4b5563',
    fontSize: '50px',
    textAlign: 'center'
  },

  camaraTexto: {
    fontSize: '12px',
    marginTop: '10px',
    color: '#9ca3af'
  },

  areaDeteccion: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '700px',
    height: '500px',
    background: 'linear-gradient(to bottom, #4a5568, #2d3748)',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    border: '3px solid #718096'
  },

  cocheContainer: {
    position: 'absolute',
    top: '50px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  // COCHE ESTILO TOP-DOWN (como la imagen)
  coche: {
    position: 'relative',
    width: '100px',
    height: '160px',
    backgroundColor: '#3b82f6',
    borderRadius: '45% 45% 20% 20%',
    border: '3px solid #1e40af',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden'
  },

  parabrisas: {
    position: 'absolute',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '35px',
    backgroundColor: '#1e293b',
    borderRadius: '50% 50% 0 0',
    border: '2px solid #0f172a'
  },

  capo: {
    position: 'absolute',
    top: '45px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '80px',
    height: '60px',
    backgroundColor: '#60a5fa',
    borderRadius: '10px'
  },

  lineaCapo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '3px',
    height: '50px',
    backgroundColor: '#3b82f6'
  },

  ventanaIzq: {
    position: 'absolute',
    top: '15px',
    left: '8px',
    width: '20px',
    height: '25px',
    backgroundColor: '#0ea5e9',
    borderRadius: '40% 10% 10% 10%',
    border: '1px solid #0284c7'
  },

  ventanaDer: {
    position: 'absolute',
    top: '15px',
    right: '8px',
    width: '20px',
    height: '25px',
    backgroundColor: '#0ea5e9',
    borderRadius: '10% 40% 10% 10%',
    border: '1px solid #0284c7'
  },

  sombraIzq: {
    position: 'absolute',
    top: '50px',
    left: '0',
    width: '12px',
    height: '90px',
    backgroundColor: '#1e40af',
    borderRadius: '0 0 0 15px'
  },

  sombraDer: {
    position: 'absolute',
    top: '50px',
    right: '0',
    width: '12px',
    height: '90px',
    backgroundColor: '#1e40af',
    borderRadius: '0 0 15px 0'
  },

  parteTraseraCoche: {
    position: 'absolute',
    bottom: '5px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '70px',
    height: '20px',
    backgroundColor: '#1e293b',
    borderRadius: '0 0 10px 10px'
  },

  etiquetaCoche: {
    marginTop: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: '5px 15px',
    borderRadius: '15px'
  },

  bolitasContainer: {
    position: 'absolute',
    bottom: '50px',
    width: '100%',
    height: '100px'
  },

  bolita: {
    position: 'absolute',
    bottom: '0',
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translateX(-50%)',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4)',
    border: '3px solid rgba(255, 255, 255, 0.3)'
  },

  textoBolita: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
  },
};