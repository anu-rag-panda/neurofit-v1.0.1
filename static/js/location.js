class LocationManager {
    constructor() {
        this.position = null;
        this.watchId = null;
    }

    async getCurrentLocation() {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            this.position = position;
            return position;
        } catch (error) {
            console.error('Error getting location:', error);
            return null;
        }
    }

    startWatching() {
        if ("geolocation" in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                position => {
                    this.position = position;
                    this.handleLocationUpdate(position);
                },
                error => console.error('Location error:', error),
                {
                    enableHighAccuracy: true,
                    maximumAge: 30000,
                    timeout: 27000
                }
            );
        }
    }

    handleLocationUpdate(position) {
        // Update location data for emergency alerts
        const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };
        
        // Store location for emergency use
        localStorage.setItem('lastLocation', JSON.stringify(locationData));
    }

    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }
}

// Initialize location manager
const locationManager = new LocationManager();
