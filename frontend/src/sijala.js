import { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; 

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  // Cambia a 'true' para usar distancias aleatorias. 
  // Cambia a 'false' para conectar al servidor.
  MODO_SIMULACION: false, 
  
  // URL de tu servidor
  URL_SERVIDOR: "http://10.25.67.169:8000/api/ultrasonic-sensor/get/latest",
  
  // URL de la cámara (actualiza con tu endpoint de cámara)
  URL_CAMARA: "http://10.25.67.169:8000/api/camera/get/latest" 
};

// ** Importante **: Define el rango máximo de visualización en el mapa de carretera.
// No dibujaremos objetos más allá de este límite.
const MAX_DISTANCIA_VISUAL = 400; // 4 metros (400 cm)

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function DetectorProximidad() {

  // Inicialización con distancias predeterminadas
  const [sensores, setSensores] = useState({
    1: { distancia: 150, objeto: 'car'},
    2: { distancia: 100, objeto: 'person' },
    3: { distancia: 30, objeto: 'truck' }
  });

  const [imagenCamara, setImagenCamara] = useState(null);
  const [logConexion, setLogConexion] = useState([]); // Para debugging

  // ============================================
  // OBTENER IMAGEN DE LA CÁMARA (CORREGIDA)
  // ============================================
  const obtenerImagenCamara = useCallback(async () => {
    if (CONFIG.MODO_SIMULACION) {
      // En modo simulación, puedes usar una imagen placeholder o dejarlo vacío
      setImagenCamara(null);
      return;
    }

    try {
      const url = `${CONFIG.URL_CAMARA}?device_id=2`;
      
      console.log('📷 Solicitando imagen de cámara...');
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('✅ Respuesta de cámara recibida:', response.data);
      
      if (response.data && response.data.image_url) {
        // El servidor devuelve un JSON con la URL de la imagen
        const imageUrl = response.data.image_url;
        
        // Agregar timestamp para evitar cache
        const timestamp = Date.now();
        const finalImageUrl = `${imageUrl}?timestamp=${timestamp}`;
        
        setImagenCamara(finalImageUrl);
        console.log('✅ Imagen de cámara actualizada:', finalImageUrl);
        
        return { 
          status: 'fulfilled', 
          log: `✅ Cámara: Imagen recibida` 
        };
      } else {
        console.error('❌ No se encontró image_url en la respuesta');
        setImagenCamara(null);
        return { 
          status: 'rejected', 
          log: `❌ Cámara: Sin URL de imagen` 
        };
      }
    } catch (error) {
      let errorMessage = 'Error desconocido';
      if (axios.isCancel(error) || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = `Timeout (5000ms)`;
      } else if (error.response) {
        errorMessage = `HTTP ${error.response.status}`;
      } else if (error.request) {
        errorMessage = `Sin respuesta (red/CORS)`;
      } else {
        errorMessage = error.message;
      }
      
      console.error('❌ Error al obtener imagen de cámara:', error);
      setImagenCamara(null);
      
      return { 
        status: 'rejected', 
        log: `❌ Cámara: ${errorMessage}` 
      };
    }
  }, []);

  // ============================================
  // OBTENER DATOS DEL SERVIDOR (MODIFICADA: Devuelve el resultado)
  // ============================================
  /**
    * Realiza una solicitud GET a la URL del servidor para un sensor específico.
    * Devuelve el resultado para ser consolidado por monitoreoContinuo.
    */
  const realizarSolicitud = useCallback(async (sensorId) => {
    // Añadir el parámetro sensor_id a la URL
    const url = `${CONFIG.URL_SERVIDOR}?sensor_id=${sensorId}`;
    
    try {
      console.log(`🔍 Sensor ${sensorId}: Solicitando a ${url}`);
      
      // Timeout aumentado a 3 segundos
      const response = await axios.get(url, { 
        timeout: 3000,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log(`✅ Sensor ${sensorId}: Respuesta recibida:`, response.data);
      
      const data = response.data;
      
      // Lógica robusta: busca 'distance' o 'distancia', por defecto 'N/A'
      const distancia = data.distance !== undefined ? data.distance : 
                          data.distancia !== undefined ? data.distancia : 'N/A';
      
      // Lógica robusta: busca 'object' u 'objeto', si no está, usa 'car' por defecto.
      const objeto = data.object || data.objeto || 'car'; 

      console.log(`📏 Sensor ${sensorId}: Distancia=${distancia}, Objeto=${objeto}`);

      // Devuelve el objeto de éxito
      return { 
        status: 'fulfilled', 
        sensorId, 
        data: { 
          // Asegúrate de que la distancia se almacena como un número (o 'N/A')
          distancia: parseFloat(distancia) || 'N/A', 
          objeto 
        },
        log: `✅ S${sensorId}: ${Math.round(parseFloat(distancia) || 0)}cm` // Log para el panel
      };
    } 
    
    catch (error) {

      let errorMessage = 'Error desconocido';
      if (axios.isCancel(error) || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = `Timeout (3000ms)`;
      } else if (error.response) {
        errorMessage = `HTTP ${error.response.status}`;
      } else if (error.request) {
        errorMessage = `Sin respuesta (red/CORS)`;
      } else {
        errorMessage = error.message;
      }
      
      console.error(`❌ Sensor ${sensorId}: ${errorMessage}`, error);
      
      // Devuelve el objeto de fallo
      return { 
        status: 'rejected', 
        sensorId, 
        reason: errorMessage,
        log: `❌ S${sensorId}: ${errorMessage}` // Log para el panel
      };
    }
    
  }, []); 

  // ============================================
  // FUNCIÓN DE MONITOREO CONTINUO (ACTUALIZADA)
  // ============================================
  const monitoreoContinuo = useCallback(async () => {
    const sensoresAProcesar = [1, 2, 3];
    let nuevoEstadoSensores = {};
    let nuevoLogEntries = [];

    // 1. Ejecuta las 3 solicitudes de sensor en paralelo
    const promesas = sensoresAProcesar.map(realizarSolicitud);
    const resultados = await Promise.allSettled(promesas);
    
    // 2. Procesar y consolidar los resultados
    resultados.forEach(res => {
      const resultado = res.value; 
      if (res.status === 'fulfilled' && resultado) {
          const sensorId = resultado.sensorId;

          if (resultado.status === 'fulfilled') {
              nuevoEstadoSensores[sensorId] = resultado.data;
          } else {
              // En caso de fallo interno reportado por realizarSolicitud (ej. error Axios)
              nuevoEstadoSensores[sensorId] = { 
                  distancia: 'N/A', 
                  objeto: sensores[sensorId]?.objeto || 'car' 
              };
          }
          nuevoLogEntries.push(resultado.log);

      } else if (res.status === 'rejected') {
          console.error("Una promesa de sensor fue rechazada en allSettled:", res.reason);
          nuevoLogEntries.push(`❌ S?: Fallo promesa`);
      }
    });
    
    // 3. UNA SOLA ACTUALIZACIÓN DE ESTADO para todos los sensores
    setSensores(prev => ({ 
      ...prev, 
      ...nuevoEstadoSensores 
    }));
    
    // 4. Actualizar imagen de la cámara si no estamos en modo simulación
    if (!CONFIG.MODO_SIMULACION) {
      const resultadoCamara = await obtenerImagenCamara();
      if (resultadoCamara && resultadoCamara.log) {
        nuevoLogEntries.push(resultadoCamara.log);
      }
    } else {
      nuevoLogEntries.push(`🎮 Simulación OK`);
    }
    
    // 5. UNA SOLA ACTUALIZACIÓN DE ESTADO para el log
    setLogConexion(prev => [...prev.slice(-4), ...nuevoLogEntries]);

  }, [realizarSolicitud, sensores, obtenerImagenCamara]); 

  // ============================================
  // GENERAR DATOS ALEATORIOS (SIMULACIÓN)
  // ============================================
  const generarDatosAleatorios = useCallback(() => {
    const objetos = ['person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck'];
    
    setSensores({
      1: { 
        distancia: Math.random() * 300, 
        objeto: objetos[Math.floor(Math.random() * objetos.length)] 
      },
      2: { 
        distancia: Math.random() * 300,
        objeto: objetos[Math.floor(Math.random() * objetos.length)] 
      },
      3: { 
        distancia: Math.random() * 300, 
        objeto: objetos[Math.floor(Math.random() * objetos.length)] 
      }
    });
    setLogConexion(prev => [...prev.slice(-4), `🎮 Simulación OK`]);
  }, []); 

  // ============================================
  // INICIAR ACTUALIZACIÓN (USE EFFECT)
  // ============================================
  useEffect(() => {
    const INTERVALO_REFRESH = 2000; 
    
    if (CONFIG.MODO_SIMULACION) {
      console.log("🎮 MODO SIMULACIÓN ACTIVADO");
      const interval = setInterval(generarDatosAleatorios, INTERVALO_REFRESH);
      return () => clearInterval(interval);
      
    } else {
      console.log("🔗 CONECTANDO AL SERVIDOR...");
      monitoreoContinuo(); 
      const interval = setInterval(monitoreoContinuo, INTERVALO_REFRESH);
      return () => clearInterval(interval);
    }
  }, [generarDatosAleatorios, monitoreoContinuo]); 

  // ============================================
  // OBTENER COLOR (AJUSTADA A 400 cm)
  // ============================================
  const obtenerColor = (distancia) => {
    if (!Number.isFinite(distancia) || distancia > MAX_DISTANCIA_VISUAL) return '#64748b'; // Gris (Fuera de rango)
    
    // ZONAS DE ALERTA AJUSTADAS PARA 400cm
    if (distancia < 50) return '#ef4444'; // Rojo (Peligro: < 50cm)
    if (distancia < 250) return '#ecc94b'; // Amarillo (Advertencia: < 250cm)
    
    return '#48bb78'; // Verde (Seguro: hasta 400cm)
  };

  // ============================================
  // CALCULAR POSICIÓN SEGÚN DISTANCIA (AJUSTADA A 400 cm)
  // ============================================
  
  const calcularPosicion = (distancia) => {
    // Mapea distancia (0 - 400 cm) a un rango de posición (25%-85% de arriba a abajo)
    
    const distanciaNormalizada = Math.min(MAX_DISTANCIA_VISUAL, Math.max(0, distancia));
    // Invierte el mapeo: 0cm (cerca) es 85% (abajo), 400cm (lejos) es 25% (arriba)
    const porcentaje = 40 + ((distanciaNormalizada / MAX_DISTANCIA_VISUAL) * 60);
    
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
          <img 
            src={imagenCamara} 
            alt="Feed de cámara" 
            style={estilos.camaraImagen} 
            onError={(e) => {
              console.error('Error al cargar imagen de cámara');
              setImagenCamara(null);
            }}
          />
        ) : (
          <div style={estilos.camaraPlaceholder}>
            <div style={estilos.camaraIcono}>📷</div>
            <div style={estilos.camaraTexto}>
              {CONFIG.MODO_SIMULACION ? 'Modo Simulación' : 'Cargando cámara...'}
            </div>
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
          
          // MOSTRAR SOLO si la distancia es un número válido y dentro del rango de visualización
          if (!Number.isFinite(distancia) || distancia > MAX_DISTANCIA_VISUAL) return null;
          
          const posicion = calcularPosicion(distancia);
          // Distribuye los objetos en 3 carriles
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

      {/* MODO ACTIVO Y LOG DE CONEXIÓN */}
      <div style={estilos.indicadorModo}>
        {CONFIG.MODO_SIMULACION ? '🎮 SIMULACIÓN' : '🔗 SERVIDOR ACTIVO'}
      </div>

      {/* PANEL DE DEBUG */}
      {!CONFIG.MODO_SIMULACION && (
        <div style={estilos.panelDebug}>
          <div style={estilos.tituloDebug}>📡 Log de Conexión</div>
          {logConexion.length === 0 ? (
            <div style={estilos.logItem}>Esperando datos...</div>
          ) : (
            logConexion.map((log, i) => (
              <div key={i} style={estilos.logItem}>{log}</div> 
            ))
          )}
        </div>
      )}

    </div>
  );
}

// ============================================
// COMPONENTES SECUNDARIOS Y ESTILOS
// ============================================

function Coche({ color }) {
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
          <div style={{...estilos.bicicletaRuedaDelantera, borderColor: colorFijo}}></div>
          <div style={{...estilos.bicicletaRuedaTrasera, borderColor: colorFijo}}></div>
          <div style={{...estilos.bicicletaCuadro, borderRightColor: colorFijo, borderBottomColor: colorFijo}}></div>
          <div style={{...estilos.bicicletaAsiento, backgroundColor: colorFijo}}></div>
          <div style={{...estilos.bicicletaManubrio, backgroundColor: colorFijo}}></div>
          <div style={{...estilos.bicicletaPedal, borderColor: colorFijo}}></div>
        </div>
      );
    
    case 'motorcycle':
      return (
        <div style={estilos.motoContainer}>
          <div style={estilos.motoRuedaDelantera}></div>
          <div style={estilos.motoRuedaTrasera}></div>
          <div style={{...estilos.motoCuerpoLateral, backgroundColor: colorFijo}}>
            <div style={estilos.motoTanqueLateral}></div>
            <div style={estilos.motoAsientoLateral}></div>
            <div style={estilos.motoManubrio}></div>
            <div style={estilos.motoEscape}></div>
          </div>
        </div>
      );
    
    case 'bus':
      return (
        <div style={{...estilos.autobus, backgroundColor: colorFijo}}>
          <div style={estilos.autobusParabrisas}></div>
          <div style={estilos.autobusVentanaLateralIzq}></div>
          <div style={estilos.autobusVentanaLateralDer}></div>
          <div style={estilos.autobusCapo}>
            <div style={estilos.autobusLinea1}></div>
            <div style={estilos.autobusLinea2}></div>
            <div style={estilos.autobusLinea3}></div>
          </div>
          <div style={estilos.autobusParabrisasInferior}></div>
          <div style={estilos.autobusBordeIzq}></div>
          <div style={estilos.autobusBordeDer}></div>
        </div>
      );
    
    case 'truck':
      return (
        <div style={estilos.camionContainer}>
          <div style={{...estilos.camionCabina, backgroundColor: colorFijo}}>
            <div style={estilos.camionParabrisasCabina}></div>
            <div style={estilos.camionVentanaIzqCabina}></div>
            <div style={estilos.camionVentanaDerCabina}></div>
          </div>
          <div style={{...estilos.camionRemolque, backgroundColor: colorFijo}}>
            <div style={estilos.camionCargaInterior}>
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
  // ============================================
  // 1. CONTENEDOR PRINCIPAL Y PANELES
  // ============================================
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
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },

  camaraIcono: {
    fontSize: '32px',
    marginBottom: '10px'
  },

  camaraTexto: {
    fontSize: '12px',
    color: '#9ca3af'
  },

  // ============================================
  // 2. ÁREA DE DETECCIÓN / CARRETERA
  // ============================================
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

  // Coche Propio (TU COCHE)
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
  
  // Indicador de Modo
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
  },
  
  // Panel de Debug
  panelDebug: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: '10px',
    borderRadius: '10px',
    color: 'white',
    width: '250px',
    fontSize: '12px',
    zIndex: 10
  },

  tituloDebug: {
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#93c5fd'
  },

  logItem: {
    fontFamily: 'monospace',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '3px 0',
    color: '#cbd5e1'
  },

  // ============================================
  // 3. ESTILOS DE OBJETOS DETECTADOS 🚀
  // ============================================
  
  // PERSONA (person)
  persona: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  personaCabeza: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    borderWidth: '4px',
    borderStyle: 'solid',
    backgroundColor: '#fef3c7'
  },

  personaCuerpo: {
    width: '28px',
    height: '45px',
    borderRadius: '6px 6px 3px 3px',
    marginTop: '2px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
  },

  // BICICLETA (bicycle)
  bicicleta: {
    position: 'relative',
    width: '45px', 
    height: '45px',
    transform: 'rotate(90deg)', // Rotar para que apunte hacia arriba
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bicicletaRuedaDelantera: {
    position: 'absolute',
    right: '2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    borderWidth: '3px',
    borderStyle: 'solid',
  },
  bicicletaRuedaTrasera: {
    position: 'absolute',
    left: '2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    borderWidth: '3px',
    borderStyle: 'solid',
  },
  bicicletaCuadro: {
    position: 'absolute',
    width: '30px',
    height: '10px',
    borderStyle: 'solid',
    borderWidth: '3px',
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: 'skewX(-20deg)',
    zIndex: 1,
    margin: '0 auto',
  },
  bicicletaAsiento: {
    position: 'absolute',
    top: '4px',
    left: '10px',
    width: '5px',
    height: '5px',
    borderRadius: '0 0 5px 5px',
    zIndex: 2
  },
  bicicletaManubrio: {
    position: 'absolute',
    top: '4px',
    right: '10px',
    width: '5px',
    height: '5px',
    borderRadius: '5px 5px 0 0',
    zIndex: 2
  },
  bicicletaPedal: {
    position: 'absolute',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    borderWidth: '2px',
    borderStyle: 'solid',
    top: '22px',
    left: '20px',
    zIndex: 2
  },

  // MOTOCICLETA (motorcycle)
  motoContainer: {
    position: 'relative',
    width: '35px',
    height: '70px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  motoRuedaDelantera: {
    position: 'absolute',
    bottom: '5px',
    left: '1px',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    backgroundColor: '#2d3748',
    border: '3px solid #1a202c',
    zIndex: 1
  },
  motoRuedaTrasera: {
    position: 'absolute',
    bottom: '5px',
    right: '1px',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    backgroundColor: '#2d3748',
    border: '3px solid #1a202c',
    zIndex: 1
  },
  motoCuerpoLateral: {
    width: '30px',
    height: '55px',
    borderRadius: '15px 15px 5px 5px',
    position: 'relative',
    border: '2px solid #2d3748',
    zIndex: 2
  },
  motoTanqueLateral: {
    position: 'absolute',
    top: '0',
    width: '100%',
    height: '15px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '15px 15px 0 0',
  },
  motoAsientoLateral: {
    position: 'absolute',
    top: '15px',
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  motoManubrio: {
    position: 'absolute',
    top: '-4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '4px',
    height: '6px',
    backgroundColor: '#2d3748',
    borderRadius: '50%'
  },
  motoEscape: {
    position: 'absolute',
    bottom: '5px',
    right: '0',
    width: '2px',
    height: '10px',
    backgroundColor: '#a0aec0',
    borderRadius: '0 0 2px 0'
  },

  // AUTOBÚS (bus)
  autobus: {
    width: '60px',
    height: '100px',
    borderRadius: '10px 10px 5px 5px',
    position: 'relative',
    border: '3px solid #b8860b',
    boxShadow: '0 8px 15px rgba(0,0,0,0.4)',
    overflow: 'hidden'
  },
  autobusParabrisas: {
    position: 'absolute',
    top: '5px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '45px',
    height: '20px',
    backgroundColor: '#1e3a8a',
    borderRadius: '5px'
  },
  autobusVentanaLateralIzq: {
    position: 'absolute',
    top: '28px',
    left: '4px',
    width: '15px',
    height: '10px',
    backgroundColor: '#1e3a8a',
    borderRadius: '2px'
  },
  autobusVentanaLateralDer: {
    position: 'absolute',
    top: '28px',
    right: '4px',
    width: '15px',
    height: '10px',
    backgroundColor: '#1e3a8a',
    borderRadius: '2px'
  },
  autobusCapo: {
    position: 'absolute',
    top: '40px',
    width: '100%',
    height: '60px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  autobusLinea1: { width: '40px', height: '2px', backgroundColor: 'rgba(0,0,0,0.1)' },
  autobusLinea2: { width: '40px', height: '2px', backgroundColor: 'rgba(0,0,0,0.1)' },
  autobusLinea3: { width: '40px', height: '2px', backgroundColor: 'rgba(0,0,0,0.1)' },
  autobusParabrisasInferior: {
    position: 'absolute',
    bottom: '5px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '45px',
    height: '10px',
    backgroundColor: '#a0aec0',
    borderRadius: '5px'
  },
  autobusBordeIzq: { position: 'absolute', top: '0', left: '0', width: '4px', height: '100%', backgroundColor: '#d69e2e' },
  autobusBordeDer: { position: 'absolute', top: '0', right: '0', width: '4px', height: '100%', backgroundColor: '#d69e2e' },

  // CAMIÓN (truck)
  camionContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '55px',
    position: 'relative',
  },
  camionCabina: {
    width: '40px',
    height: '35px',
    borderRadius: '5px 5px 0 0',
    position: 'relative',
    border: '3px solid #4338ca',
    zIndex: 2,
    boxShadow: '0 -4px 10px rgba(0,0,0,0.3)',
  },
  camionParabrisasCabina: {
    position: 'absolute',
    top: '3px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '25px',
    height: '15px',
    backgroundColor: '#1e3a8a',
    borderRadius: '3px',
  },
  camionVentanaIzqCabina: {
    position: 'absolute',
    top: '22px',
    left: '2px',
    width: '10px',
    height: '8px',
    backgroundColor: '#1e3a8a',
    borderRadius: '2px'
  },
  camionVentanaDerCabina: {
    position: 'absolute',
    top: '22px',
    right: '2px',
    width: '10px',
    height: '8px',
    backgroundColor: '#1e3a8a',
    borderRadius: '2px'
  },
  camionRemolque: {
    width: '55px',
    height: '70px',
    borderRadius: '3px 3px 8px 8px',
    marginTop: '-3px', 
    position: 'relative',
    border: '3px solid #4338ca',
    zIndex: 1
  },
  camionCargaInterior: {
    position: 'absolute',
    top: '5px',
    left: '5px',
    right: '5px',
    bottom: '5px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    padding: '5px 0'
  },
  camionLineaRemolque1: { width: '80%', height: '1px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 auto' },
  camionLineaRemolque2: { width: '80%', height: '1px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 auto' },
  camionLineaRemolque3: { width: '80%', height: '1px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 auto' },
  camionLineaRemolque4: { width: '80%', height: '1px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 auto' },

  // COCHE OBJETO (car - en el default case de ObjetoVehiculo)
  cocheObjeto: {
    width: '45px',
    height: '65px',
    borderRadius: '45% 45% 18% 18%',
    position: 'relative',
    border: '2px solid #1e40af',
    overflow: 'hidden',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
  },
  cocheObjetoParabrisas: {
    position: 'absolute',
    top: '5px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '30px',
    height: '15px',
    backgroundColor: '#1e3a8a',
    borderRadius: '50% 50% 0 0',
    border: '1px solid #1e40af'
  },
  cocheObjetoCapo: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '38px',
    height: '30px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '5px',
  },
  cocheObjetoLinea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '2px',
    height: '25px',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  cocheObjetoVentanaIzq: {
    position: 'absolute',
    top: '8px',
    left: '4px',
    width: '10px',
    height: '10px',
    backgroundColor: '#3b82f6',
    borderRadius: '40% 10% 10% 10%',
    border: '1px solid #1e40af'
  },
  cocheObjetoVentanaDer: {
    position: 'absolute',
    top: '8px',
    right: '4px',
    width: '10px',
    height: '10px',
    backgroundColor: '#3b82f6',
    borderRadius: '10% 40% 10% 10%',
    border: '1px solid #1e40af'
  },
};