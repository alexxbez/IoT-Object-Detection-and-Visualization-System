import { useState, useEffect } from 'react';

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

  const realizarSolicitud = () => {
    fetch(CONFIG.URL_SERVIDOR)
      .then(response => response.json())
      .then(data => {
        setSensores({
          izquierda: data.izquierda,
          centro: data.centro,
          derecha: data.derecha
        });

        if (data.frame) {
          setImagenCamara("data:image/jpeg;base64," + data.frame);
        }
      })
      .catch(console.error);
  };

  const generarDatosAleatorios = () => {
    setSensores({
      izquierda: Math.random() * 300,
      centro: Math.random() * 300,
      derecha: Math.random() * 300
    });
  };

  useEffect(() => {
    const interval = setInterval(
      CONFIG.MODO_SIMULACION ? generarDatosAleatorios : realizarSolicitud,
      1000
    );
    return () => clearInterval(interval);
  }, []);

  const obtenerColor = dist => {
    if (dist < 100) return "#ef4444";
    if (dist < 200) return "#ecc94b";
    return "#48bb78";
  };

  return (
    <div className="contenedor">

      {/* PANEL SENSORES */}
      <div className="panelSensores">
        {["izquierda", "centro", "derecha"].map(key => (
          <div className="tarjetaSensor" key={key}>
            <div className="etiquetaSensor">{key.toUpperCase()}</div>
            <div className="valorSensor" style={{ color: obtenerColor(sensores[key]) }}>
              {Math.round(sensores[key])} cm
            </div>
          </div>
        ))}
      </div>

      {/* CÁMARA */}
      <div className="camaraContainer">
        {imagenCamara
          ? <img src={imagenCamara} className="camaraImagen" />
          : <div className="camaraPlaceholder">
              📹<div className="camaraTexto">Esperando cámara…</div>
            </div>
        }
      </div>

      {/* ÁREA DETECCIÓN */}
      <div className="areaDeteccion">

        {/* COCHE */}
        <div className="cocheContainer">
          <div className="coche">
            <div className="parabrisas"></div>
            <div className="capo"><div className="lineaCapo"></div></div>
            <div className="ventanaIzq"></div>
            <div className="ventanaDer"></div>
            <div className="sombraIzq"></div>
            <div className="sombraDer"></div>
            <div className="parteTraseraCoche"></div>
          </div>
          <div className="etiquetaCoche">TU COCHE</div>
        </div>

        {/* BOLITAS */}
        <div className="bolitasContainer">
          {sensores.izquierda < 250 && (
            <div className="bolita" style={{ left: "35%", backgroundColor: obtenerColor(sensores.izquierda) }}>
              <span className="textoBolita">{Math.round(sensores.izquierda)}</span>
            </div>
          )}
          {sensores.centro < 250 && (
            <div className="bolita" style={{ left: "50%", backgroundColor: obtenerColor(sensores.centro) }}>
              <span className="textoBolita">{Math.round(sensores.centro)}</span>
            </div>
          )}
          {sensores.derecha < 250 && (
            <div className="bolita" style={{ left: "65%", backgroundColor: obtenerColor(sensores.derecha) }}>
              <span className="textoBolita">{Math.round(sensores.derecha)}</span>
            </div>
          )}
        </div>

      </div>

      {/* INDICADOR MODO */}
      <div className="indicadorModo">
        {CONFIG.MODO_SIMULACION ? "🎮 MODO SIMULACIÓN" : "🔗 MODO SERVIDOR"}
      </div>

    </div>
  );
}
