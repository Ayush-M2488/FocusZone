class OptionsController {
    constructor() {
        this.currentTab = 'sessions';
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Session configuration buttons
        document.getElementById('save-sessions').addEventListener('click', () => this.saveSessionConfigs());
        document.getElementById('reset-sessions').addEventListener('click', () => this.resetSessionConfigs());

        // Schedule management buttons
        document.getElementById('add-schedule').addEventListener('click', () => this.showScheduleModal());
        document.getElementById('close-modal').addEventListener('click', () => this.hideScheduleModal());
        document.getElementById('cancel-schedule').addEventListener('click', () => this.hideScheduleModal());
        document.getElementById('schedule-form').addEventListener('submit', (e) => this.saveSchedule(e));
        document.getElementById('save-schedules').addEventListener('click', () => this.saveAllSchedules());
        document.getElementById('clear-schedules').addEventListener('click', () => this.clearAllSchedules());

        // Delegate schedule toggle/edit/delete buttons inside schedules list
        document.getElementById('schedules-list').addEventListener('click', (e) => {
            const target = e.target;

            if (target.classList.contains('schedule-toggle')) {
                const scheduleId = target.closest('.schedule-item').dataset.id;
                this.toggleSchedule(scheduleId);
            } else if (target.classList.contains('btn-outline') && target.textContent.trim() === 'Edit') {
                const scheduleId = target.closest('.schedule-item').dataset.id;
                this.editSchedule(scheduleId);
            } else if (target.classList.contains('btn-danger') && target.textContent.trim() === 'Delete') {
                const scheduleId = target.closest('.schedule-item').dataset.id;
                this.deleteSchedule(scheduleId);
            }
        });

        // General settings buttons
        document.getElementById('save-general').addEventListener('click', () => this.saveGeneralSettings());
        document.getElementById('reset-general').addEventListener('click', () => this.resetGeneralSettings());

        // Data management buttons
        document.getElementById('export-json').addEventListener('click', () => this.exportData('json'));
        document.getElementById('export-csv').addEventListener('click', () => this.exportData('csv'));
        document.getElementById('import-data').addEventListener('click', () => this.importData());
        document.getElementById('import-file').addEventListener('change', (e) => this.handleFileImport(e));

        document.getElementById('clear-week').addEventListener('click', () => this.clearData('week'));
        document.getElementById('clear-month').addEventListener('click', () => this.clearData('month'));
        document.getElementById('clear-all').addEventListener('click', () => this.clearData('all'));

        // Footer links
        document.getElementById('view-reports').addEventListener('click', () => this.openReports());

        // Modal click outside to close
        document.getElementById('schedule-modal').addEventListener('click', (e) => {
            if (e.target.id === 'schedule-modal') {
                this.hideScheduleModal();
            }
        });

        // Add listener for auto-stop checkbox to enable/disable timeout field
        document.getElementById('auto-stop').addEventListener('change', (e) => {
            document.getElementById('inactivity-timeout').disabled = !e.target.checked;
        });

        // Load initial data
        this.loadAllSettings();
        this.updateDataStats();
    }

    switchTab(tabName) {
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update content areas
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) activeContent.classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        if (tabName === 'data') {
            this.updateDataStats();
        } else if (tabName === 'schedules') {
            this.loadSchedules();
        }
    }

    async loadAllSettings() {
        await this.loadSessionConfigs();
        await this.loadSchedules();
        await this.loadGeneralSettings();
    }

    async loadSessionConfigs() {
        try {
            const result = await chrome.storage.local.get('sessionConfigs');
            const configs = result.sessionConfigs || {};

            const sessionTypes = ['work', 'study', 'break', 'personal'];
            sessionTypes.forEach(type => {
                const config = configs[type] || { allowedSites: [], blockedSites: [] };
                const allowedTextarea = document.getElementById(`${type}-allowed`);
                const blockedTextarea = document.getElementById(`${type}-blocked`);

                if (allowedTextarea) allowedTextarea.value = config.allowedSites.join('\n');
                if (blockedTextarea) blockedTextarea.value = config.blockedSites.join('\n');
            });
        } catch (error) {
            console.error('Error loading session configs:', error);
            this.showMessage('Error loading session configurations', 'error');
        }
    }

    async saveSessionConfigs() {
        try {
            const sessionTypes = ['work', 'study', 'break', 'personal'];
            const configs = {};

            sessionTypes.forEach(type => {
                const allowedTextarea = document.getElementById(`${type}-allowed`);
                const blockedTextarea = document.getElementById(`${type}-blocked`);
                const allowedSites = this.parseWebsiteList(allowedTextarea.value);
                const blockedSites = this.parseWebsiteList(blockedTextarea.value);

                configs[type] = {
                    allowedSites,
                    blockedSites
                };
            });

            await chrome.storage.local.set({ sessionConfigs: configs });
            this.showMessage('Session configurations saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving session configs:', error);
            this.showMessage('Error saving session configurations', 'error');
        }
    }

    resetSessionConfigs() {
        if (confirm('Are you sure you want to reset all session configurations to defaults?')) {
            const sessionTypes = ['work', 'study', 'break', 'personal'];
            sessionTypes.forEach(type => {
                const allowedTextarea = document.getElementById(`${type}-allowed`);
                const blockedTextarea = document.getElementById(`${type}-blocked`);

                if (allowedTextarea) allowedTextarea.value = '';
                if (blockedTextarea) blockedTextarea.value = '';
            });
            this.showMessage('Session configurations reset to defaults', 'info');
        }
    }

    async loadGeneralSettings() {
        try {
            const result = await chrome.storage.local.get('generalSettings');
            const settings = result.generalSettings || this.getDefaultGeneralSettings();

            const warningDelayInput = document.getElementById('warning-delay');
            const autoStopCheckbox = document.getElementById('auto-stop');
            const inactivityTimeoutInput = document.getElementById('inactivity-timeout');
            const notificationsCheckbox = document.getElementById('notifications');
            const soundAlertsCheckbox = document.getElementById('sound-alerts');
            const dataRetentionInput = document.getElementById('data-retention');

            if (warningDelayInput) warningDelayInput.value = settings.warningDelay || 60;
            if (autoStopCheckbox) {
                autoStopCheckbox.checked = settings.autoStop !== false;
                if (inactivityTimeoutInput) inactivityTimeoutInput.disabled = !autoStopCheckbox.checked;
            }
            if (inactivityTimeoutInput) inactivityTimeoutInput.value = settings.inactivityTimeout || 30;
            if (notificationsCheckbox) notificationsCheckbox.checked = settings.notifications !== false;
            if (soundAlertsCheckbox) soundAlertsCheckbox.checked = settings.soundAlerts || false;
            if (dataRetentionInput) dataRetentionInput.value = settings.dataRetention || 90;
        } catch (error) {
            console.error('Error loading general settings:', error);
            this.showMessage('Error loading general settings', 'error');
        }
    }

    async saveGeneralSettings() {
        try {
            const settings = {
                warningDelay: parseInt(document.getElementById('warning-delay').value, 10),
                autoStop: document.getElementById('auto-stop').checked,
                inactivityTimeout: parseInt(document.getElementById('inactivity-timeout').value, 10),
                notifications: document.getElementById('notifications').checked,
                soundAlerts: document.getElementById('sound-alerts').checked,
                dataRetention: parseInt(document.getElementById('data-retention').value, 10)
            };

            await chrome.storage.local.set({ generalSettings: settings });

            // Notify background script that settings have changed
            await chrome.runtime.sendMessage({ action: 'saveGeneralSettings' });

            this.showMessage('General settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving general settings:', error);
            this.showMessage('Error saving general settings', 'error');
        }
    }

    resetGeneralSettings() {
        if (confirm('Are you sure you want to reset general settings to defaults?')) {
            const defaults = this.getDefaultGeneralSettings();

            const warningDelayInput = document.getElementById('warning-delay');
            const autoStopCheckbox = document.getElementById('auto-stop');
            const inactivityTimeoutInput = document.getElementById('inactivity-timeout');
            const notificationsCheckbox = document.getElementById('notifications');
            const soundAlertsCheckbox = document.getElementById('sound-alerts');
            const dataRetentionInput = document.getElementById('data-retention');

            if (warningDelayInput) warningDelayInput.value = defaults.warningDelay;
            if (autoStopCheckbox) autoStopCheckbox.checked = defaults.autoStop;
            if (inactivityTimeoutInput) {
                inactivityTimeoutInput.value = defaults.inactivityTimeout;
                inactivityTimeoutInput.disabled = !defaults.autoStop;
            }
            if (notificationsCheckbox) notificationsCheckbox.checked = defaults.notifications;
            if (soundAlertsCheckbox) soundAlertsCheckbox.checked = defaults.soundAlerts;
            if (dataRetentionInput) dataRetentionInput.value = defaults.dataRetention;

            this.showMessage('General settings reset to defaults', 'info');
        }
    }

    getDefaultGeneralSettings() {
        return {
            warningDelay: 60,
            autoStop: true,
            inactivityTimeout: 30,
            notifications: true,
            soundAlerts: false,
            dataRetention: 90
        };
    }

    parseWebsiteList(text) {
        if (!text) return [];
        return text
            .split(/[,\n]/)
            .map(site => site.trim())
            .filter(site => site.length > 0)
            // Remove protocol and www prefix for consistency
            .map(site => site.replace(/^https?:\/\//i, '').replace(/^www\./i, ''));
    }

    async updateDataStats() {
        try {
            const storageData = await chrome.storage.local.get(null);
            const storageSize = JSON.stringify(storageData).length;
            document.getElementById('storage-usage').textContent = this.formatBytes(storageSize);

            const result = await chrome.storage.local.get('sessionHistory');
            const history = result.sessionHistory || [];

            document.getElementById('total-sessions').textContent = history.length;

            if (history.length > 0) {
                const oldestSession = history.reduce((oldest, session) =>
                    session.startTime < oldest.startTime ? session : oldest
                );
                document.getElementById('oldest-session').textContent =
                    new Date(oldestSession.startTime).toLocaleDateString();
            } else {
                document.getElementById('oldest-session').textContent = '-';
            }
        } catch (error) {
            console.error('Error updating data stats:', error);
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async exportData(format) {
        try {
            const result = await chrome.storage.local.get(['sessionHistory', 'sessionConfigs', 'generalSettings']);

            if (format === 'json') {
                this.downloadJSON(result, 'browser-session-tracker-data.json');
            } else if (format === 'csv') {
                this.downloadCSV(result.sessionHistory || [], 'browser-session-tracker-sessions.csv');
            }

            this.showMessage(`Data exported successfully as ${format.toUpperCase()}!`, 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showMessage('Error exporting data', 'error');
        }
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, filename);
    }

    downloadCSV(sessions, filename) {
        const headers = ['Session ID', 'Type', 'Start Time', 'End Time', 'Duration (ms)', 'Sites Visited', 'Top Site'];
        const rows = sessions.map(session => {
            const topSite = this.getTopSiteFromSession(session);
            return [
                session.id,
                session.type,
                new Date(session.startTime).toISOString(),
                session.endTime ? new Date(session.endTime).toISOString() : '',
                session.totalDuration || 0,
                Object.keys(session.sites || {}).length,
                topSite
            ];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadBlob(blob, filename);
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getTopSiteFromSession(session) {
        if (!session.sites) return '';

        let topSite = '';
        let maxTime = 0;

        Object.values(session.sites).forEach(site => {
            if (site.totalTime > maxTime) {
                maxTime = site.totalTime;
                topSite = site.domain;
            }
        });

        return topSite;
    }

    importData() {
        document.getElementById('import-file').click();
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (confirm('This will merge the imported data with your existing data. Continue?')) {
                // Merge session history
                if (data.sessionHistory) {
                    const result = await chrome.storage.local.get('sessionHistory');
                    const existingHistory = result.sessionHistory || [];
                    const mergedHistory = [...existingHistory, ...data.sessionHistory];
                    await chrome.storage.local.set({ sessionHistory: mergedHistory });
                }

                // Import configurations if present
                if (data.sessionConfigs) {
                    await chrome.storage.local.set({ sessionConfigs: data.sessionConfigs });
                    await this.loadSessionConfigs();
                }

                if (data.generalSettings) {
                    await chrome.storage.local.set({ generalSettings: data.generalSettings });
                    await this.loadGeneralSettings();
                }

                this.showMessage('Data imported successfully!', 'success');
                this.updateDataStats();
            }
        } catch (error) {
            console.error('Error importing data:', error);
            this.showMessage('Error importing data. Please check the file format.', 'error');
        }

        // Reset file input
        event.target.value = '';
    }

    async clearData(timeframe) {
        let confirmMessage = '';
        let cutoffDate = null;

        switch (timeframe) {
            case 'week':
                confirmMessage = 'Are you sure you want to delete all session data from the last week?';
                cutoffDate = Date.now() - (7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                confirmMessage = 'Are you sure you want to delete all session data from the last month?';
                cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
                confirmMessage = 'Are you sure you want to delete ALL session data? This action cannot be undone!';
                break;
        }

        if (confirm(confirmMessage)) {
            try {
                if (timeframe === 'all') {
                    await chrome.storage.local.remove('sessionHistory');
                } else {
                    const result = await chrome.storage.local.get('sessionHistory');
                    const history = result.sessionHistory || [];
                    const filteredHistory = history.filter(session => session.startTime < cutoffDate);
                    await chrome.storage.local.set({ sessionHistory: filteredHistory });
                }

                this.showMessage(`Data cleared successfully!`, 'success');
                this.updateDataStats();
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showMessage('Error clearing data', 'error');
            }
        }
    }

    async openReports() {
        try {
            await chrome.tabs.create({
                url: chrome.runtime.getURL('options/reports.html')
            });
        } catch (error) {
            console.error('Error opening reports:', error);
            this.showMessage('Error opening reports', 'error');
        }
    }

    showMessage(text, type = 'info') {
        // Remove existing messages
        document.querySelectorAll('.message').forEach(msg => msg.remove());

        // Create new message element
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;

        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            activeTab.insertBefore(message, activeTab.firstChild);

            setTimeout(() => {
                if (message.parentNode) message.remove();
            }, 5000);
        }
    }

    // ============ Scheduling Methods ============

    async loadSchedules() {
        try {
            const result = await chrome.storage.local.get('schedules');
            const schedules = result.schedules || [];
            this.renderSchedules(schedules);
        } catch (error) {
            console.error('Error loading schedules:', error);
            this.showMessage('Error loading schedules', 'error');
        }
    }

    renderSchedules(schedules) {
        const container = document.getElementById('schedules-list');

        if (schedules.length === 0) {
            container.innerHTML = `
                <div class="empty-schedules">
                    <h3>No Schedules Yet</h3>
                    <p>Create your first schedule to automatically start sessions at specific times.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = schedules.map(schedule => `
            <div class="schedule-item ${schedule.enabled ? '' : 'disabled'}" data-id="${schedule.id}">
                <div class="schedule-info">
                    <div class="schedule-name">${schedule.name}</div>
                    <div class="schedule-details">
                        <div class="schedule-detail">
                            <span>📅</span>
                            <span>${this.formatDays(schedule.days)}</span>
                        </div>
                        <div class="schedule-detail">
                            <span>⏰</span>
                            <span>${schedule.time}</span>
                        </div>
                        <div class="schedule-detail">
                            <span>⏱️</span>
                            <span>${schedule.duration} min</span>
                        </div>
                        <div class="schedule-detail">
                            <span>📋</span>
                            <span>${schedule.type}</span>
                        </div>
                    </div>
                </div>
                <div class="schedule-actions">
                    <div class="schedule-toggle ${schedule.enabled ? 'enabled' : ''}"></div>
                    <button class="btn btn-small btn-outline">Edit</button>
                    <button class="btn btn-small btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
    }

    formatDays(days) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        if (days.length === 7) return 'Every day';
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
        if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
        return days.map(day => dayNames[day]).join(', ');
    }

    showScheduleModal(scheduleId = null) {
        const modal = document.getElementById('schedule-modal');
        const form = document.getElementById('schedule-form');

        console.log('showScheduleModal called with ID:', scheduleId);

        if (scheduleId) {
            // Edit mode
            this.loadScheduleForEdit(scheduleId);
            document.querySelector('.modal-header h3').textContent = 'Edit Schedule';
        } else {
            // Add mode
            form.reset();
            document.querySelector('.modal-header h3').textContent = 'Add New Schedule';
            document.getElementById('schedule-enabled').checked = true;
            delete form.dataset.editId; // Clear edit mode
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hideScheduleModal() {
        const modal = document.getElementById('schedule-modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async loadScheduleForEdit(scheduleId) {
        try {
            const result = await chrome.storage.local.get('schedules');
            const schedules = result.schedules || [];
            const schedule = schedules.find(s => s.id === scheduleId);

            if (schedule) {
                document.getElementById('schedule-name').value = schedule.name;
                document.getElementById('schedule-type').value = schedule.type;
                document.getElementById('schedule-time').value = schedule.time;
                document.getElementById('schedule-duration').value = schedule.duration;
                document.getElementById('schedule-enabled').checked = schedule.enabled;

                // Set days
                document.querySelectorAll('.day-checkbox input').forEach(checkbox => {
                    checkbox.checked = schedule.days.includes(parseInt(checkbox.value, 10));
                });

                document.getElementById('schedule-form').dataset.editId = scheduleId;
            }
        } catch (error) {
            console.error('Error loading schedule for edit:', error);
            this.showMessage('Error loading schedule for edit', 'error');
        }
    }

    async saveSchedule(event) {
        event.preventDefault();
        console.log('saveSchedule called');

        try {
            const form = document.getElementById('schedule-form');
            const editId = form.dataset.editId;

            const schedule = {
                id: editId || this.generateScheduleId(),
                name: document.getElementById('schedule-name').value.trim(),
                type: document.getElementById('schedule-type').value,
                time: document.getElementById('schedule-time').value,
                duration: parseInt(document.getElementById('schedule-duration').value, 10),
                enabled: document.getElementById('schedule-enabled').checked,
                days: Array.from(document.querySelectorAll('.day-checkbox input:checked'))
                    .map(checkbox => parseInt(checkbox.value, 10))
            };

            if (!schedule.name) {
                this.showMessage('Please enter a schedule name', 'error');
                return;
            }

            if (schedule.days.length === 0) {
                this.showMessage('Please select at least one day', 'error');
                return;
            }

            const result = await chrome.storage.local.get('schedules');
            let schedules = result.schedules || [];

            if (editId) {
                const index = schedules.findIndex(s => s.id === editId);
                if (index !== -1) schedules[index] = schedule;
            } else {
                schedules.push(schedule);
            }

            await chrome.storage.local.set({ schedules });
            await this.updateBackgroundSchedules(schedules);

            this.hideScheduleModal();
            this.renderSchedules(schedules);
            this.showMessage('Schedule saved successfully!', 'success');

            delete form.dataset.editId;
        } catch (error) {
            console.error('Error saving schedule:', error);
            this.showMessage('Error saving schedule', 'error');
        }
    }

    generateScheduleId() {
        return 'schedule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async toggleSchedule(scheduleId) {
        try {
            const result = await chrome.storage.local.get('schedules');
            const schedules = result.schedules || [];
            const schedule = schedules.find(s => s.id === scheduleId);
            if (schedule) {
                schedule.enabled = !schedule.enabled;
                await chrome.storage.local.set({ schedules });
                await this.updateBackgroundSchedules(schedules);
                this.renderSchedules(schedules);
            }
        } catch (error) {
            console.error('Error toggling schedule:', error);
            this.showMessage('Error updating schedule', 'error');
        }
    }

    editSchedule(scheduleId) {
        this.showScheduleModal(scheduleId);
    }

    async deleteSchedule(scheduleId) {
        if (confirm('Are you sure you want to delete this schedule?')) {
            try {
                const result = await chrome.storage.local.get('schedules');
                const schedules = result.schedules || [];
                const filteredSchedules = schedules.filter(s => s.id !== scheduleId);

                await chrome.storage.local.set({ schedules: filteredSchedules });
                await this.updateBackgroundSchedules(filteredSchedules);
                this.renderSchedules(filteredSchedules);
                this.showMessage('Schedule deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting schedule:', error);
                this.showMessage('Error deleting schedule', 'error');
            }
        }
    }

    async saveAllSchedules() {
        // Schedules are saved individually; placeholder method for UI consistency
        this.showMessage('All schedules are already saved!', 'info');
    }

    async clearAllSchedules() {
        if (confirm('Are you sure you want to delete all schedules? This action cannot be undone.')) {
            try {
                await chrome.storage.local.set({ schedules: [] });
                await this.updateBackgroundSchedules([]);
                this.renderSchedules([]);
                this.showMessage('All schedules cleared successfully!', 'success');
            } catch (error) {
                console.error('Error clearing schedules:', error);
                this.showMessage('Error clearing schedules', 'error');
            }
        }
    }

    async updateBackgroundSchedules(schedules) {
        try {
            await chrome.runtime.sendMessage({
                action: 'updateSchedules',
                schedules: schedules
            });
        } catch (error) {
            console.error('Error updating background schedules:', error);
        }
    }
}

const optionsController = new OptionsController();