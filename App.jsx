import { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; 

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  MODO_SIMULACION: false, // Cambia a false para probar con servidor
  URL_SERVIDOR: "http://10.25.67.169:8000/api/ultrasonic-sensor/get/latest"
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function DetectorProximidad() {

  // Inicialización con distancias predeterminadas
  const [sensores, setSensores] = useState({
    1: { distancia: 150, objeto: ''},
    2: { distancia: 100, objeto: '' },
    3: { distancia: 30, objeto: '' }
  });

  const [imagenCamara] = useState(null); // No usado, pero mantenido

  // ============================================
  // OBTENER DATOS DEL SERVIDOR (OPTIMIZADA)
  // ============================================
  const realizarSolicitud = useCallback(async (sensorId) => {
    const url = `${CONFIG.URL_SERVIDOR}?sensor_id=${sensorId}`;
    
    try {
      // Timeout nativo de Axios de 2 segundos
      const response = await axios.get(url, { timeout: 2000 });
      
      const data = response.data;
      
      // Lógica robusta: busca 'distance' o 'distancia', por defecto 'N/A'
      const distancia = data.distance !== undefined ? data.distance : 
                        data.distancia !== undefined ? data.distancia : 'N/A';
      
      // Lógica robusta: busca 'object' o 'objeto', por defecto 'car'
      const objeto = data.object || data.objeto || 'car'; 

      // Actualización segura del estado
      setSensores((prev) => ({
        ...prev,
        [sensorId]: { distancia, objeto }
      }));
      
      return { status: 'fulfilled', sensorId, data: { distancia, objeto } };
    } catch (error) {
      let errorMessage = 'Error desconocido';
      if (axios.isCancel(error) || error.code === 'ECONNABORTED') {
        errorMessage = `Timeout después de 2000ms`;
      } else if (error.response) {
        errorMessage = `Error HTTP (Status: ${error.response.status})`;
      } else {
        errorMessage = `Error de conexión: ${error.message}`;
      }
      
      console.error(`❌ Sensor ${sensorId}: ${errorMessage}`);
      
      // Establecer N/A en caso de fallo, manteniendo el objeto anterior si es posible
      setSensores((prev) => ({
        ...prev,
        [sensorId]: { distancia: 'N/A', objeto: prev[sensorId].objeto }
      }));
      
      return { status: 'rejected', sensorId, reason: errorMessage };
    }
  }, []); // Dependencia vacía: 'realizarSolicitud' es estable

  // ============================================
  // FUNCIÓN DE MONITOREO CONTINUO (OPTIMIZADA: Ejecución en paralelo)
  // ============================================
  const monitoreoContinuo = useCallback(async () => {
    const sensoresAProcesar = [1, 2, 3];

    // Ejecuta las 3 solicitudes de sensor en paralelo
    const results = await Promise.allSettled(
      sensoresAProcesar.map(realizarSolicitud)
    );
    
    // console.log("Ciclo de monitoreo completado:", results);
  }, [realizarSolicitud]);

  // ============================================
  // GENERAR DATOS ALEATORIOS
  // ============================================
  const generarDatosAleatorios = useCallback(() => {
    const objetos = ['person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck'];
    
    setSensores({
      1: { 
        distancia: Math.random() * 250, 
        objeto: 'car' 
      },
      2: { 
        distancia: Math.random() * 250,
        objeto: objetos[Math.floor(Math.random() * objetos.length)] 
      },
      3: { 
        distancia: Math.random() * 250, 
        objeto: objetos[Math.floor(Math.random() * objetos.length)] 
      }
    });
    // console.log("🎲 Datos Aleatorios Generados");
  }, []); // Dependencia vacía: 'generarDatosAleatorios' es estable

  // ============================================
  // INICIAR ACTUALIZACIÓN (USE EFFECT)
  // ============================================
  useEffect(() => {
    const INTERVALO_REFRESH = 1500; // Tiempo entre ciclos completos de monitoreo
    
    if (CONFIG.MODO_SIMULACION) {
      console.log("🎮 MODO SIMULACIÓN ACTIVADO");
      const interval = setInterval(generarDatosAleatorios, INTERVALO_REFRESH);
      return () => clearInterval(interval);
      
    } else {
      console.log("🔗 CONECTANDO AL SERVIDOR...");
      console.log("URL:", CONFIG.URL_SERVIDOR);
      
      // El intervalo llama a la función de monitoreo que ahora es paralela
      const interval = setInterval(monitoreoContinuo, INTERVALO_REFRESH);

      return () => clearInterval(interval);
    }
  }, [generarDatosAleatorios, monitoreoContinuo]); // Dependencias estables por useCallback

  // [RESTO DE LAS FUNCIONES Y RENDER NO MODIFICADAS]
  
  // ============================================
  // OBTENER COLOR
  // ============================================
  const obtenerColor = (distancia) => {
    if (distancia < 100) return '#ef4444'; // Rojo (Peligro)
    if (distancia < 200) return '#ecc94b'; // Amarillo (Advertencia)
    return '#48bb78'; // Verde (Seguro)
  };

  // ============================================
  // CALCULAR POSICIÓN SEGÚN DISTANCIA
  // ============================================
  const calcularPosicion = (distancia) => {
    // Mapea distancia (0-250) a un rango de posición (25%-85% de arriba a abajo)
    const porcentaje = 25 + ((distancia / 250) * 60);
    return Math.max(25, Math.min(85, porcentaje));
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={estilos.contenedor}> 

      {/* CUADRADOS DE DISTANCIA */}
      <div style={estilos.panelSensores}>
        {[1, 2, 3].map((id) => (
          <div key={id} style={estilos.tarjetaSensor}>
            <div style={estilos.etiquetaSensor}>
              {id === 1 ? 'IZQUIERDA' : id === 2 ? 'CENTRO' : 'DERECHA'}
            </div>
            <div style={{ ...estilos.valorSensor, color: obtenerColor(sensores[id].distancia) }}>
              {sensores[id].distancia === 'N/A' ? '--' : Math.round(sensores[id].distancia)} cm
            </div>
            <div style={estilos.objetoTipo}>{sensores[id].objeto}</div>
          </div>
        ))}
      </div>

      {/* CÁMARA */}
      <div style={estilos.camaraContainer}>
        {imagenCamara ? (
          <img src={imagenCamara} alt="Cámara" style={estilos.camaraImagen} />
        ) : (
          <div style={estilos.camaraPlaceholder}>
            <div style={estilos.camaraTexto}>Esperando cámara...</div>
          </div>
        )}
      </div>

      {/* ÁREA DE DETECCIÓN - CARRETERA */}
      <div style={estilos.areaDeteccion}>
        
        {/* BORDES DE CARRETERA */}
        <div style={estilos.bordeCarreteraIzq}></div>
        <div style={estilos.bordeCarreteraDer}></div>
        
        {/* LÍNEAS DE CARRETERA */}
        <div style={estilos.lineaCarretera1}></div>
        <div style={estilos.lineaCarretera2}></div>

        {/* COCHE PRINCIPAL */}
        <div style={estilos.cocheContainer}>
          <Coche color="#3b82f6" /> 
          <div style={estilos.etiquetaCoche}>TU COCHE</div>
        </div>

        {/* OBJETOS DETECTADOS */}
        {[1, 2, 3].map((id) => {
          const distancia = sensores[id].distancia;
          const objeto = sensores[id].objeto;
          
          // MOSTRAR SIEMPRE SI LA DISTANCIA ES MENOR A 250
          if (distancia === 'N/A' || distancia >= 250) return null;
          
          const posicion = calcularPosicion(distancia);
          const xPos = id === 1 ? '25%' : id === 2 ? '50%' : '75%';
          
          return (
            <div 
              key={id}
              style={{
                ...estilos.objetoDetectado,
                left: xPos,
                top: `${posicion}%`
              }}
            >
              <ObjetoVehiculo
                tipo={objeto}
                color={obtenerColor(distancia)}
              />
              <div style={estilos.distanciaLabel}>
                {Math.round(distancia)} cm
              </div>
            </div>
          );
        })}

      </div>

      {/* MODO ACTIVO */}
      <div style={estilos.indicadorModo}>
        {CONFIG.MODO_SIMULACION ? '🎮 SIMULACIÓN' : '🔗 SERVIDOR ACTIVO'}
      </div>

    </div>
  );
}

// ============================================
// COMPONENTES SECUNDARIOS Y ESTILOS (NO MODIFICADOS)
// ============================================

// Se mantienen sin cambios las funciones Coche y ObjetoVehiculo y el objeto estilos
function Coche({ color }) {
  // ... (cuerpo de la función Coche)
  return (
    <div style={estilos.coche}>
      <div style={estilos.parabrisas}></div>
      <div style={estilos.capo}>
        <div style={estilos.lineaCapo}></div>
      </div>
      <div style={estilos.ventanaIzq}></div>
      <div style={estilos.ventanaDer}></div>
      <div style={estilos.sombraIzq}></div>
      <div style={estilos.sombraDer}></div>
      <div style={estilos.parteTraseraCoche}></div>
    </div>
  );
}

function ObjetoVehiculo({ tipo, color }) {
  const coloresFijos = {
    person: '#f59e0b',     
    bicycle: '#10b981',      
    car: '#3b82f6',          
    motorcycle: '#8b5cf6',  
    bus: '#eab308',          
    truck: '#6366f1'         
  };

  const colorFijo = coloresFijos[tipo] || '#3b82f6';
  const finalColor = (tipo === 'car' || tipo === 'carro') ? color : colorFijo; 

  switch(tipo) {
    case 'person':
      return (
        <div style={estilos.persona}>
          <div style={{...estilos.personaCabeza, borderColor: colorFijo}}></div>
          <div style={{...estilos.personaCuerpo, backgroundColor: colorFijo}}></div>
        </div>
      );
    
    case 'bicycle':
      return (
        <div style={estilos.bicicleta}>
          {/* Rueda delantera */}
          <div style={{...estilos.bicicletaRuedaDelantera, borderColor: colorFijo}}></div>
          {/* Rueda trasera */}
          <div style={{...estilos.bicicletaRuedaTrasera, borderColor: colorFijo}}></div>
          {/* Cuadro/Marco */}
          <div style={{...estilos.bicicletaCuadro, borderRightColor: colorFijo, borderBottomColor: colorFijo}}></div>
          {/* Asiento */}
          <div style={{...estilos.bicicletaAsiento, backgroundColor: colorFijo}}></div>
          {/* Manubrio */}
          <div style={{...estilos.bicicletaManubrio, backgroundColor: colorFijo}}></div>
          {/* Pedales */}
          <div style={{...estilos.bicicletaPedal, borderColor: colorFijo}}></div>
        </div>
      );
    
    case 'motorcycle':
      return (
        <div style={estilos.motoContainer}>
          {/* Rueda delantera */}
          <div style={estilos.motoRuedaDelantera}></div>
          {/* Rueda trasera */}
          <div style={estilos.motoRuedaTrasera}></div>
          {/* Cuerpo/Chasis */}
          <div style={{...estilos.motoCuerpoLateral, backgroundColor: colorFijo}}>
            {/* Tanque */}
            <div style={estilos.motoTanqueLateral}></div>
            {/* Asiento */}
            <div style={estilos.motoAsientoLateral}></div>
            {/* Manubrio frontal */}
            <div style={estilos.motoManubrio}></div>
            {/* Escape */}
            <div style={estilos.motoEscape}></div>
          </div>
        </div>
      );
    
    case 'bus':
      return (
        <div style={{...estilos.autobus, backgroundColor: colorFijo}}>
          {/* Parabrisas superior */}
          <div style={estilos.autobusParabrisas}></div>
          {/* Ventanas laterales */}
          <div style={estilos.autobusVentanaLateralIzq}></div>
          <div style={estilos.autobusVentanaLateralDer}></div>
          {/* Capó con líneas */}
          <div style={estilos.autobusCapo}>
            <div style={estilos.autobusLinea1}></div>
            <div style={estilos.autobusLinea2}></div>
            <div style={estilos.autobusLinea3}></div>
          </div>
          {/* Parabrisas inferior */}
          <div style={estilos.autobusParabrisasInferior}></div>
          {/* Bordes oscuros */}
          <div style={estilos.autobusBordeIzq}></div>
          <div style={estilos.autobusBordeDer}></div>
        </div>
      );
    
    case 'truck':
      return (
        <div style={estilos.camionContainer}>
          {/* Cabina */}
          <div style={{...estilos.camionCabina, backgroundColor: colorFijo}}>
            <div style={estilos.camionParabrisasCabina}></div>
            <div style={estilos.camionVentanaIzqCabina}></div>
            <div style={estilos.camionVentanaDerCabina}></div>
          </div>
          {/* Remolque */}
          <div style={{...estilos.camionRemolque, backgroundColor: colorFijo}}>
            <div style={estilos.camionCargaInterior}>
              {/* Líneas horizontales del remolque */}
              <div style={estilos.camionLineaRemolque1}></div>
              <div style={estilos.camionLineaRemolque2}></div>
              <div style={estilos.camionLineaRemolque3}></div>
              <div style={estilos.camionLineaRemolque4}></div>
            </div>
          </div>
        </div>
      );
    
    default: // 'car'
      return (
        <div style={{...estilos.cocheObjeto, backgroundColor: finalColor}}>
          <div style={estilos.cocheObjetoParabrisas}></div>
          <div style={estilos.cocheObjetoCapo}>
            <div style={estilos.cocheObjetoLinea}></div>
          </div>
          <div style={estilos.cocheObjetoVentanaIzq}></div>
          <div style={estilos.cocheObjetoVentanaDer}></div>
        </div>
      );
  }
}

const estilos = {
  // ... (cuerpo del objeto estilos)
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '12px 18px',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.3)',
    minWidth: '110px',
    textAlign: 'center'
  },

  etiquetaSensor: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '10px',
    marginBottom: '6px',
    fontWeight: 'bold'
  },

  valorSensor: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0
  },

  objetoTipo: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '4px',
    textTransform: 'uppercase'
  },

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },

  camaraImagen: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  camaraPlaceholder: {
    color: '#4b5563',
    textAlign: 'center'
  },

  camaraTexto: {
    fontSize: '12px',
    color: '#9ca3af'
  },

  // CARRETERA CON BORDES VISIBLES
  areaDeteccion: {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(to bottom, #1e293b 0%, #0f172a 100%)',
    overflow: 'hidden'
  },

  bordeCarreteraIzq: {
    position: 'absolute',
    left: '15%',
    top: '0',
    width: '8px',
    height: '100%',
    background: 'linear-gradient(to bottom, #fbbf24 0%, #f59e0b 100%)',
    boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
  },

  bordeCarreteraDer: {
    position: 'absolute',
    right: '15%',
    top: '0',
    width: '8px',
    height: '100%',
    background: 'linear-gradient(to bottom, #fbbf24 0%, #f59e0b 100%)',
    boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
  },

  lineaCarretera1: {
    position: 'absolute',
    left: '40%',
    top: '0',
    width: '4px',
    height: '100%',
    background: 'repeating-linear-gradient(to bottom, #fbbf24 0px, #fbbf24 40px, transparent 40px, transparent 80px)'
  },

  lineaCarretera2: {
    position: 'absolute',
    right: '40%',
    top: '0',
    width: '4px',
    height: '100%',
    background: 'repeating-linear-gradient(to bottom, #fbbf24 0px, #fbbf24 40px, transparent 40px, transparent 80px)'
  },

  cocheContainer: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 5
  },

  coche: {
    position: 'relative',
    width: '90px',
    height: '140px',
    backgroundColor: '#3b82f6',
    borderRadius: '45% 45% 18% 18%',
    border: '4px solid #1e40af',
    overflow: 'hidden',
    boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
  },

  parabrisas: {
    position: 'absolute',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '55px',
    height: '32px',
    backgroundColor: '#1e3a8a',
    borderRadius: '50% 50% 0 0',
    border: '2px solid #1e40af'
  },

  capo: {
    position: 'absolute',
    top: '42px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '72px',
    height: '55px',
    backgroundColor: '#60a5fa',
    borderRadius: '10px'
  },

  lineaCapo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '3px',
    height: '45px',
    backgroundColor: '#3b82f6'
  },

  ventanaIzq: {
    position: 'absolute',
    top: '14px',
    left: '8px',
    width: '18px',
    height: '22px',
    backgroundColor: '#3b82f6',
    borderRadius: '40% 10% 10% 10%',
    border: '2px solid #1e40af'
  },

  ventanaDer: {
    position: 'absolute',
    top: '14px',
    right: '8px',
    width: '18px',
    height: '22px',
    backgroundColor: '#3b82f6',
    borderRadius: '10% 40% 10% 10%',
    border: '2px solid #1e40af'
  },

  sombraIzq: {
    position: 'absolute',
    top: '42px',
    left: '0',
    width: '12px',
    height: '82px',
    backgroundColor: '#1e40af',
    borderRadius: '0 0 0 14px'
  },

  sombraDer: {
    position: 'absolute',
    top: '42px',
    right: '0',
    width: '12px',
    height: '82px',
    backgroundColor: '#1e40af',
    borderRadius: '0 0 14px 0'
  },

  parteTraseraCoche: {
    position: 'absolute',
    bottom: '5px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '18px',
    backgroundColor: '#1e3a8a',
    borderRadius: '0 0 10px 10px',
    border: '2px solid #1e40af'
  },

  etiquetaCoche: {
    marginTop: '8px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: '4px 12px',
    borderRadius: '12px'
  },

  // OBJETOS DETECTADOS
  objetoDetectado: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    transition: 'all 0.5s ease',
    zIndex: 3
  },

  distanciaLabel: {
    marginTop: '5px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '3px 8px',
    borderRadius: '10px',
    textAlign: 'center',
    whiteSpace: 'nowrap'
  },

  // PERSONA
  persona: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  personaCabeza: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '4px solid',
    backgroundColor: '#fef3c7'
  },

  personaCuerpo: {
    width: '28px',
    height: '45px',
    borderRadius: '6px 6px 3px 3px',
    marginTop: '2px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
  },

  // BICICLETA (vista lateral simplificada)
  bicicleta: {
    position: 'relative',
    width: '90px',
    height: '55px'
  },

  bicicletaRuedaDelantera: {
    position: 'absolute',
    left: '5px',
    bottom: '5px',
    width: '28px',
    height: '28px',
    border: '4px solid',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)'
  },

  bicicletaRuedaTrasera: {
    position: 'absolute',
    right: '5px',
    bottom: '5px',
    width: '28px',
    height: '28px',
    border: '4px solid',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)'
  },

  bicicletaCuadro: {
    position: 'absolute',
    left: '18px',
    top: '20px',
    width: '55px',
    height: '22px',
    borderRight: '3px solid',
    borderBottom: '3px solid',
    backgroundColor: 'transparent'
  },

  bicicletaAsiento: {
    position: 'absolute',
    right: '15px',
    top: '8px',
    width: '18px',
    height: '8px',
    borderRadius: '4px'
  },

  bicicletaManubrio: {
    position: 'absolute',
    left: '12px',
    top: '10px',
    width: '12px',
    height: '8px',
    borderRadius: '2px'
  },

  bicicletaPedal: {
    position: 'absolute',
    left: '50%',
    bottom: '15px',
    transform: 'translateX(-50%)',
    width: '10px',
    height: '10px',
    border: '2px solid',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },

  // MOTO (estilo pixel art como la imagen)
  motoContainer: {
    position: 'relative',
    width: '95px',
    height: '60px'
  },

  motoRuedaDelantera: {
    position: 'absolute',
    left: '8px',
    bottom: '5px',
    width: '28px',
    height: '28px',
    border: '5px solid #1f2937',
    borderRadius: '50%',
    backgroundColor: '#4b5563',
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.4)'
  },

  motoRuedaTrasera: {
    position: 'absolute',
    right: '8px',
    bottom: '5px',
    width: '28px',
    height: '28px',
    border: '5px solid #1f2937',
    borderRadius: '50%',
    backgroundColor: '#4b5563',
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.4)'
  },

  motoCuerpoLateral: {
    position: 'absolute',
    left: '22px',
    top: '5px',
    width: '52px',
    height: '32px',
    borderRadius: '12px 6px 8px 20px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
    border: '3px solid rgba(0,0,0,0.4)'
  },

  motoTanqueLateral: {
    position: 'absolute',
    top: '2px',
    left: '6px',
    width: '32px',
    height: '14px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '6px 6px 3px 3px',
    border: '2px solid rgba(0,0,0,0.5)'
  },

  motoAsientoLateral: {
    position: 'absolute',
    top: '14px',
    left: '8px',
    width: '38px',
    height: '10px',
    backgroundColor: '#1f2937',
    borderRadius: '8px 4px 12px 4px',
    border: '2px solid #000',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
  },

  motoManubrio: {
    position: 'absolute',
    top: '3px',
    left: '-8px',
    width: '16px',
    height: '10px',
    backgroundColor: '#374151',
    borderRadius: '3px',
    border: '2px solid #1f2937',
    transform: 'rotate(-25deg)'
  },

  motoEscape: {
    position: 'absolute',
    bottom: '-6px',
    right: '2px',
    width: '18px',
    height: '6px',
    backgroundColor: '#6b7280',
    borderRadius: '0 3px 3px 0',
    border: '2px solid #374151',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },

  // AUTOBÚS (vista top-down como imagen amarilla/azul)
  autobus: {
    position: 'relative',
    width: '65px',
    height: '120px',
    borderRadius: '18px',
    border: '4px solid rgba(0,0,0,0.6)',
    boxShadow: '0 6px 15px rgba(0,0,0,0.5)',
    overflow: 'hidden'
  },

  autobusParabrisas: {
    position: 'absolute',
    top: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '52px',
    height: '18px',
    backgroundColor: '#7dd3fc',
    borderRadius: '8px 8px 0 0',
    border: '2px solid #0ea5e9',
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)'
  },

  autobusVentanaLateralIzq: {
    position: 'absolute',
    top: '26px',
    left: '4px',
    width: '10px',
    height: '45px',
    backgroundColor: '#7dd3fc',
    border: '2px solid #0ea5e9',
    borderRadius: '3px'
  },

  autobusVentanaLateralDer: {
    position: 'absolute',
    top: '26px',
    right: '4px',
    width: '10px',
    height: '45px',
    backgroundColor: '#7dd3fc',
    border: '2px solid #0ea5e9',
    borderRadius: '3px'
  },

  autobusCapo: {
    position: 'absolute',
    top: '26px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '38px',
    height: '68px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '8px 0'
  },

  autobusLinea1: {
    width: '30px',
    height: '3px',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: '2px'
  },

  autobusLinea2: {
    width: '30px',
    height: '3px',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: '2px'
  },

  autobusLinea3: {
    width: '30px',
    height: '3px',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: '2px'
  },

  autobusParabrisasInferior: {
    position: 'absolute',
    bottom: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '52px',
    height: '18px',
    backgroundColor: '#7dd3fc',
    borderRadius: '0 0 8px 8px',
    border: '2px solid #0ea5e9',
    boxShadow: 'inset 0 -2px 4px rgba(255,255,255,0.3)'
  },

  autobusBordeIzq: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '4px',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },

  autobusBordeDer: {
    position: 'absolute',
    top: '0',
    right: '0',
    width: '4px',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },

  // CAMIÓN (vista top-down como imagen roja)
  camionContainer: {
    position: 'relative',
    width: '65px',
    height: '130px'
  },

  camionCabina: {
    position: 'absolute',
    top: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '58px',
    height: '38px',
    borderRadius: '12px 12px 4px 4px',
    border: '3px solid rgba(0,0,0,0.6)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
    overflow: 'hidden'
  },

  camionParabrisasCabina: {
    position: 'absolute',
    top: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '45px',
    height: '16px',
    backgroundColor: '#3b82f6',
    borderRadius: '6px 6px 0 0',
    border: '2px solid #1e40af',
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)'
  },

  camionVentanaIzqCabina: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    width: '10px',
    height: '12px',
    backgroundColor: '#3b82f6',
    border: '2px solid #1e40af',
    borderRadius: '2px'
  },

  camionVentanaDerCabina: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    width: '10px',
    height: '12px',
    backgroundColor: '#3b82f6',
    border: '2px solid #1e40af',
    borderRadius: '2px'
  },

  camionRemolque: {
    position: 'absolute',
    bottom: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '62px',
    height: '88px',
    borderRadius: '4px 4px 10px 10px',
    border: '3px solid rgba(0,0,0,0.6)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
    overflow: 'hidden'
  },

  camionCargaInterior: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '50px',
    height: '72px',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '6px 0'
  },

  camionLineaRemolque1: {
    width: '42px',
    height: '2px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '1px'
  },

  camionLineaRemolque2: {
    width: '42px',
    height: '2px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '1px'
  },

  camionLineaRemolque3: {
    width: '42px',
    height: '2px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '1px'
  },

  camionLineaRemolque4: {
    width: '42px',
    height: '2px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '1px'
  },

  // COCHE OBJETO (para cuando detecta otro carro)
  cocheObjeto: {
    position: 'relative',
    width: '70px',
    height: '110px',
    borderRadius: '42% 42% 16% 16%',
    border: '3px solid rgba(0,0,0,0.4)',
    overflow: 'hidden',
    boxShadow: '0 6px 15px rgba(0,0,0,0.4)'
  },

  cocheObjetoParabrisas: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '45px',
    height: '25px',
    backgroundColor: '#1e3a8a',
    borderRadius: '50% 50% 0 0',
    border: '2px solid #1e40af'
  },

  cocheObjetoCapo: {
    position: 'absolute',
    top: '33px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '58px',
    height: '45px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '8px'
  },

  cocheObjetoLinea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '2px',
    height: '35px',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },

  cocheObjetoVentanaIzq: {
    position: 'absolute',
    top: '12px',
    left: '6px',
    width: '14px',
    height: '18px',
    backgroundColor: '#3b82f6',
    borderRadius: '40% 10% 10% 10%',
    border: '2px solid #1e40af'
  },

  cocheObjetoVentanaDer: {
    position: 'absolute',
    top: '12px',
    right: '6px',
    width: '14px',
    height: '18px',
    backgroundColor: '#3b82f6',
    borderRadius: '10% 40% 10% 10%',
    border: '2px solid #1e40af'
  },

  indicadorModo: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    backgroundColor: 'rgba(59,130,246,0.8)',
    padding: '10px 20px',
    borderRadius: '10px',
    color: '#bfdbfe',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 10
  }
};