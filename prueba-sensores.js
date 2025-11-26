import axios from 'axios';

async function monitoreoContinuo() {
    console.log('🔄 INICIANDO MONITOREO CONTINUO DE DISTANCIAS');
    console.log('============================================\n');
    console.log('Presiona Ctrl + C para detener\n');
    
    let contador = 0;
    
    const intervalo = setInterval(async () => {
        contador++;
        console.log(`\n🔄 CICLO ${contador} - ${new Date().toLocaleTimeString()}`);
        console.log('-----------------------------------');
        
        const sensores = [1, 2, 3];
        const urlBase = 'http://10.25.67.169:8000/api/ultrasonic-sensor/get/latest';
        
        for (const sensorId of sensores) {
            const url = `${urlBase}?sensor_id=${sensorId}`;
            
            try {
                const response = await axios.get(url, { timeout: 2000 });
                const data = response.data;
                
                const distancia = data.distance !== undefined ? data.distance : 
                                data.distancia !== undefined ? data.distancia : 'N/A';
                
                const objeto = data.objeto || data.object || 'N/A';
                
                console.log(`📍 Sensor ${sensorId}: ${distancia} cm | ${objeto} | ✅`);
                
            } catch (error) {
                console.log(`📍 Sensor ${sensorId}: -- cm | -- | ❌ (${error.code || 'Error'})`);
            }
            
            // Pequeña pausa entre sensores
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
    }, 1000); 
    
    // Manejar cierre con Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\n🛑 DETENIENDO MONITOREO...');
        clearInterval(intervalo);
        process.exit(0);
    });
}

monitoreoContinuo();