class PopupController {
    constructor() {
        this.currentSession = null;
        this.updateInterval = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Session control buttons
        document.getElementById('startSession').addEventListener('click', () => this.startSession());
        document.getElementById('stopSession').addEventListener('click', () => this.stopSession());

        // Navigation buttons
        document.getElementById('viewReports').addEventListener('click', () => this.openReports());
        document.getElementById('openSettings').addEventListener('click', () => this.openSettings());

        // Scheduled session warning dismiss button
        const dismissBtn = document.getElementById('dismissScheduledWarning');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                const scheduledWarning = document.getElementById('scheduledSessionWarning');
                if (scheduledWarning) scheduledWarning.style.display = 'none';
            });
        }

        // Initialize UI
        this.updateUI();

        // Start periodic updates
        this.startPeriodicUpdates();
    }

    async startSession() {
        const sessionType = document.getElementById('sessionType').value;
        try {
            const response = await this.sendMessage({
                action: 'startSession',
                sessionType: sessionType
            });

            if (response.success) {
                this.showNotification('Session started successfully!', 'success');
                this.updateUI();
            } else {
                this.showNotification('Failed to start session: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error starting session:', error);
            this.showNotification('Error starting session', 'error');
        }
    }

    async stopSession() {
        try {
            const response = await this.sendMessage({
                action: 'stopSession'
            });

            if (response.success) {
                this.showNotification('Session stopped successfully!', 'success');
                this.updateUI();
            } else {
                this.showNotification('Failed to stop session: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error stopping session:', error);
            this.showNotification('Error stopping session', 'error');
        }
    }

    async updateUI() {
        try {
            // Get session status
            const sessionStatus = await this.sendMessage({
                action: 'getSessionStatus'
            });

            // Get today's stats
            const todayStats = await this.sendMessage({
                action: 'getTodayStats'
            });

            this.updateSessionStatus(sessionStatus);
            this.updateTodayStats(todayStats);
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    updateSessionStatus(status) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        const startButton = document.getElementById('startSession');
        const stopButton = document.getElementById('stopSession');
        const currentSessionSection = document.getElementById('currentSession');
        const scheduledWarning = document.getElementById('scheduledSessionWarning');

        if (status.active) {
            // Active session
            statusDot.className = 'status-dot active';
            statusText.textContent = 'Active';
            startButton.disabled = true;
            stopButton.disabled = false;
            currentSessionSection.style.display = 'block';

            // Update current session info
            document.getElementById('currentType').textContent = status.sessionType;
            document.getElementById('currentDuration').textContent = this.formatDuration(status.duration);
            document.getElementById('currentSite').textContent = status.currentSite || '-';
            document.getElementById('sitesCount').textContent = status.sitesCount;

            // Update session type selector to match current session
            document.getElementById('sessionType').value = status.sessionType;

            // Show scheduled session warning if session started by schedule
            if (status.scheduledStart) {
                if (scheduledWarning) {
                    scheduledWarning.style.display = 'block';
                }
            } else {
                if (scheduledWarning) {
                    scheduledWarning.style.display = 'none';
                }
            }
        } else {
            // Inactive session
            statusDot.className = 'status-dot';
            statusText.textContent = 'Inactive';
            startButton.disabled = false;
            stopButton.disabled = true;
            currentSessionSection.style.display = 'none';
            if (scheduledWarning) scheduledWarning.style.display = 'none';
        }
    }

    updateTodayStats(stats) {
        document.getElementById('todayTotal').textContent = this.formatDuration(stats.totalTime);
        document.getElementById('todaySessions').textContent = stats.sessionCount;
        document.getElementById('todayTopSite').textContent = stats.topSite || '-';
    }

    formatDuration(milliseconds) {
        if (!milliseconds || milliseconds < 0) return '0h 0m';

        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }

    formatTime(milliseconds) {
        if (!milliseconds || milliseconds < 0) return '00:00:00';

        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    startPeriodicUpdates() {
        // Update every 5 seconds
        this.updateInterval = setInterval(() => {
            this.updateUI();
        }, 5000);
    }

    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async openReports() {
        try {
            await chrome.tabs.create({
                url: chrome.runtime.getURL('options/reports.html')
            });
            window.close();
        } catch (error) {
            console.error('Error opening reports:', error);
            this.showNotification('Error opening reports', 'error');
        }
    }

    async openSettings() {
        try {
            await chrome.tabs.create({
                url: chrome.runtime.getURL('options/options.html')
            });
            window.close();
        } catch (error) {
            console.error('Error opening settings:', error);
            this.showNotification('Error opening settings', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideInRight 0.3s ease-out;
        `;

        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10b981';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f59e0b';
                break;
            default:
                notification.style.backgroundColor = '#3b82f6';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    cleanup() {
        this.stopPeriodicUpdates();
    }
}

const popupController = new PopupController();

window.addEventListener('beforeunload', () => {
    popupController.cleanup();
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
