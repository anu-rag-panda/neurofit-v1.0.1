class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
    }

    async connect() {
        try {
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'NeuroFit' }],
                optionalServices: ['heart_rate', 'health_data']
            });

            this.server = await this.device.gatt.connect();
            console.log('Connected to device:', this.device.name);
            
            // Start receiving data
            this.startNotifications();
        } catch (error) {
            console.error('Bluetooth connection failed:', error);
        }
    }

    async startNotifications() {
        try {
            this.service = await this.server.getPrimaryService('health_data');
            const characteristic = await this.service.getCharacteristic('measurement');
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', this.handleData);
        } catch (error) {
            console.error('Failed to start notifications:', error);
        }
    }

    handleData(event) {
        const value = event.target.value;
        // Process received data and update UI
        updateDashboard(value);
    }

    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
    }
}

// Initialize Bluetooth manager
const bluetoothManager = new BluetoothManager();

async function connectDevice() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['heart_rate'] }],
            optionalServices: ['battery_service', 'device_information']
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const characteristic = await service.getCharacteristic('heart_rate_measurement');
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleHealthData);

        alert('Device connected: ' + device.name);
    } catch (error) {
        alert('Bluetooth connection failed: ' + error);
    }
}

function handleHealthData(event) {
    const value = event.target.value;
    // Example: parse heart rate from value (first byte)
    const heartRate = value.getUint8(1);
    document.getElementById('heartRate').textContent = heartRate + ' BPM';
    // You can extend this to update SpO2, mood, etc.
}

// Attach to button
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('connectBLE');
    if (btn) {
        btn.addEventListener('click', connectDevice);
    }
});
