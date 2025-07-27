class MeditationController {
    constructor() {
        this.timer = null;
        this.duration = 300; // 5 minutes default
        this.timeRemaining = 0;
        this.isActive = false;
        this.isPaused = false;
        
        this.backgroundAudio = document.getElementById('backgroundAudio');
        this.voiceGuidanceAudio = document.getElementById('voiceGuidanceAudio');
        
        this.initializeControls();
        this.setupCharts();
    }

    initializeControls() {
        // Button controls
        document.getElementById('startMeditation').addEventListener('click', () => this.start());
        document.getElementById('pauseMeditation').addEventListener('click', () => this.pause());
        document.getElementById('stopMeditation').addEventListener('click', () => this.stop());

        // Audio controls
        document.getElementById('backgroundSound').addEventListener('change', (e) => this.setBackgroundSound(e.target.value));
        document.getElementById('voiceGuide').addEventListener('change', (e) => this.setVoiceGuide(e.target.value));
        document.getElementById('voiceVolume').addEventListener('input', (e) => {
            this.voiceGuidanceAudio.volume = e.target.value;
        });

        // Duration control
        document.getElementById('meditationDuration').addEventListener('change', (e) => {
            this.duration = parseInt(e.target.value);
        });
    }

    async start() {
        this.isActive = true;
        this.timeRemaining = this.duration;
        this.updateButtonStates(true);
        
        // Start background sound
        await this.playBackgroundSound();
        
        // Start voice guidance
        await this.startVoiceGuidance();
        
        // Start timer
        this.timer = setInterval(() => this.updateTimer(), 1000);
        
        // Start real-time brainwave monitoring
        this.startBrainwaveMonitoring();
    }

    pause() {
        if (this.isActive) {
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                this.backgroundAudio.pause();
                this.voiceGuidanceAudio.pause();
            } else {
                this.backgroundAudio.play();
                this.voiceGuidanceAudio.play();
            }
        }
    }

    stop() {
        this.isActive = false;
        this.isPaused = false;
        clearInterval(this.timer);
        this.backgroundAudio.pause();
        this.voiceGuidanceAudio.pause();
        this.updateButtonStates(false);
        this.resetTimer();
    }

    async playBackgroundSound() {
        const sound = document.getElementById('backgroundSound').value;
        this.backgroundAudio.src = `/static/audio/${sound}.mp3`;
        this.backgroundAudio.volume = 0.3;
        await this.backgroundAudio.play();
    }

    async startVoiceGuidance() {
        const guide = document.getElementById('voiceGuide').value;
        if (guide !== 'none') {
            this.voiceGuidanceAudio.src = `/static/audio/guidance/${guide}.mp3`;
            this.voiceGuidanceAudio.volume = document.getElementById('voiceVolume').value;
            await this.voiceGuidanceAudio.play();
        }
    }

    updateTimer() {
        if (this.isActive && !this.isPaused) {
            this.timeRemaining--;
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (this.timeRemaining <= 0) {
                this.stop();
            }
        }
    }

    setupCharts() {
        const ctx = document.getElementById('realTimeBrainwaves').getContext('2d');
        this.brainwaveChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Alpha Waves',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.4
                },
                {
                    label: 'Theta Waves',
                    data: [],
                    borderColor: 'rgba(153, 102, 255, 1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 0
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    startBrainwaveMonitoring() {
        // Update brainwave data every 1 second
        this.brainwaveInterval = setInterval(() => {
            this.updateBrainwaveData();
        }, 1000);
    }

    updateBrainwaveData() {
        // Simulate brainwave data - replace with actual sensor data
        const newData = {
            alpha: Math.random() * 100,
            theta: Math.random() * 100
        };

        const timestamp = new Date().toLocaleTimeString();
        
        this.brainwaveChart.data.labels.push(timestamp);
        this.brainwaveChart.data.datasets[0].data.push(newData.alpha);
        this.brainwaveChart.data.datasets[1].data.push(newData.theta);

        // Keep only last 30 seconds of data
        if (this.brainwaveChart.data.labels.length > 30) {
            this.brainwaveChart.data.labels.shift();
            this.brainwaveChart.data.datasets.forEach(dataset => dataset.data.shift());
        }

        this.brainwaveChart.update();
    }

    updateButtonStates(isSessionActive) {
        document.getElementById('startMeditation').disabled = isSessionActive;
        document.getElementById('pauseMeditation').disabled = !isSessionActive;
        document.getElementById('stopMeditation').disabled = !isSessionActive;
    }

    resetTimer() {
        document.getElementById('timer').textContent = '00:00';
    }
}

// Initialize meditation controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.meditationController = new MeditationController();
});
