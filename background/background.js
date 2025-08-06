// Background service worker for Browser Session Tracker

class SessionTracker {
    constructor() {
        this.currentSession = null;
        this.currentTabId = null;
        this.currentUrl = null;
        this.lastActiveTime = null;
        this.siteStartTime = null;
        this.blockedSiteNotificationInterval = null; // To manage repeating notifications

        this.settings = {};
        this.autoStopTimers = new Map();

        this.init();
    }

    init() {
        // Listeners remain the same...
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabChange(activeInfo.tabId);
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.url && tab.active) {
                this.handleUrlChange(tab.url, tabId);
            }
        });

        chrome.windows.onFocusChanged.addListener((windowId) => {
            if (windowId === chrome.windows.WINDOW_ID_NONE) {
                this.handleWindowBlur();
            } else {
                this.handleWindowFocus();
            }
        });

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sendResponse);
            return true;
        });

        chrome.alarms.create('saveData', { periodInMinutes: 1 });
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'saveData') {
                this.saveCurrentData();
            } else if (alarm.name.startsWith('schedule_')) {
                this.handleScheduleAlarm(alarm.name);
            }
        });

        this.loadCurrentSession();
        this.loadSchedulesOnStartup();
        this.loadGeneralSettings();
    }

    async handleMessage(message, sendResponse) {
        try {
            switch (message.action) {
                case 'startSession':
                    await this.startSession(message.sessionType);
                    sendResponse({ success: true });
                    break;

                case 'stopSession':
                    await this.stopSession();
                    sendResponse({ success: true });
                    break;

                case 'getSessionStatus':
                    const status = await this.getSessionStatus();
                    sendResponse(status);
                    break;

                case 'getTodayStats':
                    const stats = await this.getTodayStats();
                    sendResponse(stats);
                    break;

                case 'overrideWarning':
                    this.handleWarningOverride(message.url);
                    sendResponse({ success: true });
                    break;

                case 'pageVisibilityChanged':
                    this.handlePageVisibilityChange(message.visible, message.url);
                    sendResponse({ success: true });
                    break;

                case 'activityUpdate':
                    this.handleActivityUpdate(message.active, message.url);
                    sendResponse({ success: true });
                    break;

                case 'updateSchedules':
                    await this.updateSchedules(message.schedules);
                    sendResponse({ success: true });
                    break;

                case 'saveGeneralSettings':
                    await this.loadGeneralSettings();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    async startSession(sessionType) {
        if (this.currentSession) {
            await this.stopSession();
        }

        const now = Date.now();
        this.currentSession = {
            id: `session_${now}`,
            type: sessionType,
            startTime: now,
            endTime: null,
            sites: {},
            activities: [],
            totalDuration: 0
        };

        const allTabs = await chrome.tabs.query({});
        for (const tab of allTabs) {
            if (tab.url) {
                const domain = this.extractDomain(tab.url);
                this.checkSiteAndApplyWarning(domain, tab.id);
            }
        }

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0]) {
            this.currentTabId = tabs[0].id;
            this.handleUrlChange(tabs[0].url, tabs[0].id);
        }

        await this.saveCurrentSession();

        if (this.settings.notifications !== false) {
            chrome.notifications.create(`session-start-${Date.now()}`, {
                type: 'basic',
                iconUrl: '../assets/icon128.png',
                title: 'Session Tracker',
                message: `A '${sessionType}' session has started.`,
                requireInteraction: true
            });
        }

        console.log('Session started:', sessionType);
    }

    async stopSession() {
        if (!this.currentSession) return;

        const sessionType = this.currentSession.type; // Get session type before clearing
        this.clearBlockedSiteNotificationInterval();
        if (this.currentUrl && this.siteStartTime) {
            this.recordSiteDuration();
        }

        const allTabs = await chrome.tabs.query({});
        allTabs.forEach(tab => this.hideWarning(tab.id));

        this.currentSession.endTime = Date.now();
        this.currentSession.totalDuration = this.currentSession.endTime - this.currentSession.startTime;

        if (this.settings.notifications !== false) {
            chrome.notifications.create(`session-end-${Date.now()}`, {
                type: 'basic',
                iconUrl: '../assets/icon48.png',
                title: 'Session Tracker',
                message: `Your '${sessionType}' session has ended.`,
                requireInteraction: true
            });
        }

        await this.saveSessionToHistory();
        this.currentSession = null;
        this.currentTabId = null;
        this.currentUrl = null;
        this.siteStartTime = null;
        this.lastActiveTime = null;

        for (let timerId of this.autoStopTimers.values()) {
            clearTimeout(timerId);
        }
        this.autoStopTimers.clear();

        await chrome.storage.local.remove('currentSession');
        console.log('Session stopped');
    }

    async handleTabChange(tabId) {
        if (!this.currentSession) return;
        this.clearBlockedSiteNotificationInterval();
        if (this.currentUrl && this.siteStartTime) {
            this.recordSiteDuration();
        }
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab) {
                this.handleUrlChange(tab.url, tabId);
            }
        } catch (error) {
            console.error('Error getting tab info in handleTabChange:', error);
        }
    }

    async handleUrlChange(url, tabId) {
        if (!this.currentSession || !url) return;
        this.clearBlockedSiteNotificationInterval();
        if (this.currentUrl && this.siteStartTime) {
            this.recordSiteDuration();
        }
        this.currentTabId = tabId;
        this.currentUrl = url;
        this.siteStartTime = Date.now();
        this.lastActiveTime = Date.now();

        const domain = this.extractDomain(url);
        if (!this.currentSession.sites[domain]) {
            this.currentSession.sites[domain] = {
                domain,
                totalTime: 0,
                visits: 0,
                firstVisit: Date.now(),
                lastVisit: Date.now()
            };
        }
        this.currentSession.sites[domain].visits++;
        this.currentSession.sites[domain].lastVisit = Date.now();
        this.currentSession.activities.push({
            timestamp: Date.now(),
            action: 'navigate',
            url,
            domain
        });

        this.checkSiteAndApplyWarning(domain, tabId);
        console.log('URL changed to domain:', domain);
    }

    async checkSiteAndApplyWarning(domain, tabId) {
        if (!this.currentSession) {
            this.hideWarning(tabId);
            return;
        }

        const config = await this.getSessionConfig(this.currentSession.type);
        const hasAllowedSites = config.allowedSites && config.allowedSites.length > 0;
        const hasBlockedSites = config.blockedSites && config.blockedSites.length > 0;
        let isBlocked = false;

        if (hasAllowedSites) {
            if (!config.allowedSites.some(allowed => domain.includes(allowed))) {
                isBlocked = true;
            }
        } else if (hasBlockedSites) {
            if (config.blockedSites.some(blocked => domain.includes(blocked))) {
                isBlocked = true;
            }
        }

        if (isBlocked) {
            this.showWarning(tabId, this.currentSession.type);
            this.startBlockedSiteNotifications();
        } else {
            this.hideWarning(tabId);
            this.clearBlockedSiteNotificationInterval();
        }
    }

    showBlockedSiteNotification() {
        if (this.settings.notifications !== false) {
            chrome.notifications.create('site-blocked-notification', {
                type: 'basic',
                iconUrl: '../assets/icon48.png',
                title: 'Site Blocked',
                message: 'This site is restricted during your current session.',
                priority: 2,
                requireInteraction: true
            });
        }
    }

    startBlockedSiteNotifications() {
        this.clearBlockedSiteNotificationInterval();
        this.showBlockedSiteNotification();
        this.blockedSiteNotificationInterval = setInterval(() => {
            this.showBlockedSiteNotification();
        }, 10000);
    }

    clearBlockedSiteNotificationInterval() {
        if (this.blockedSiteNotificationInterval) {
            clearInterval(this.blockedSiteNotificationInterval);
            this.blockedSiteNotificationInterval = null;
            chrome.notifications.clear('site-blocked-notification');
        }
    }

    // START: CORRECTED SOUND AND WARNING FUNCTIONS
    async playSound() {
        const offscreenUrl = chrome.runtime.getURL('offscreen/offscreen.html');
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [offscreenUrl]
        });

        if (existingContexts.length > 0) {
            chrome.runtime.sendMessage({ action: 'playSound' });
            return;
        }

        await chrome.offscreen.createDocument({
            url: 'offscreen/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'To play a sound alert for blocked websites.',
        });

        chrome.runtime.sendMessage({ action: 'playSound' });
    }

    async showWarning(tabId, sessionType) {
        try {
            if (this.settings.soundAlerts) {
                this.playSound();
            }

            const result = await chrome.storage.local.get('generalSettings');
            const settings = result.generalSettings || {};
            const warningDelay = settings.warningDelay || 60;

            await chrome.tabs.sendMessage(tabId, {
                action: 'startGradualWarning',
                sessionType: sessionType,
                warningDelay: warningDelay
            });
        } catch (error) {
            // Safe to ignore
        }
    }
    // END: CORRECTED SOUND AND WARNING FUNCTIONS

    async hideWarning(tabId) {
        try {
            await chrome.tabs.sendMessage(tabId, {
                action: 'hideWarning'
            });
        } catch (error) {
            // Safe to ignore
        }
    }

    recordSiteDuration() {
        if (!this.currentSession || !this.currentUrl || !this.siteStartTime) return;
        const domain = this.extractDomain(this.currentUrl);
        const duration = Date.now() - this.siteStartTime;
        if (this.currentSession.sites[domain]) {
            this.currentSession.sites[domain].totalTime += duration;
        }
        console.log(`Recorded ${duration}ms for domain ${domain}`);
    }

    async getGeneralSettings() {
        const result = await chrome.storage.local.get('generalSettings');
        return result.generalSettings || {};
    }

    handleWindowBlur() {
        if (this.currentSession && this.currentUrl && this.siteStartTime) {
            this.recordSiteDuration();
            this.siteStartTime = null;
        }
    }

    handleWindowFocus() {
        if (this.currentSession && this.currentUrl) {
            this.siteStartTime = Date.now();
        }
    }

    extractDomain(url) {
        try {
            if (url.startsWith('chrome://') || url.startsWith('about:')) {
                return url.split('/')[0];
            }
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    async getSessionConfig(sessionType) {
        const result = await chrome.storage.local.get('sessionConfigs');
        const configs = result.sessionConfigs || {};
        return configs[sessionType] || { allowedSites: [], blockedSites: [] };
    }

    async getSessionStatus() {
        if (!this.currentSession) {
            return { active: false };
        }
        const now = Date.now();
        const duration = now - this.currentSession.startTime;
        const currentDomain = this.currentUrl ? this.extractDomain(this.currentUrl) : null;
        return {
            active: true,
            sessionType: this.currentSession.type,
            duration,
            currentSite: currentDomain,
            sitesCount: Object.keys(this.currentSession.sites).length,
            startTime: this.currentSession.startTime
        };
    }

    async getTodayStats() {
        const todayStr = new Date().toDateString();
        const result = await chrome.storage.local.get('sessionHistory');
        const history = result.sessionHistory || [];
        const todaySessions = history.filter(session => new Date(session.startTime).toDateString() === todayStr);
        const totalTime = todaySessions.reduce((sum, session) => sum + (session.totalDuration || 0), 0);
        const topSite = this.getTopSite(todaySessions);
        return {
            totalTime,
            sessionCount: todaySessions.length,
            topSite
        };
    }

    getTopSite(sessions) {
        const siteTotals = {};
        sessions.forEach(session => {
            Object.values(session.sites || {}).forEach(site => {
                siteTotals[site.domain] = (siteTotals[site.domain] || 0) + site.totalTime;
            });
        });
        let topSite = null;
        let maxTime = 0;
        Object.entries(siteTotals).forEach(([domain, time]) => {
            if (time > maxTime) {
                maxTime = time;
                topSite = domain;
            }
        });
        return topSite;
    }

    async saveCurrentSession() {
        if (this.currentSession) {
            await chrome.storage.local.set({ currentSession: this.currentSession });
        }
    }

    async loadCurrentSession() {
        const result = await chrome.storage.local.get('currentSession');
        if (result.currentSession) {
            this.currentSession = result.currentSession;
            console.log('Loaded existing session:', this.currentSession.type);
        }
    }

    async saveSessionToHistory() {
        if (!this.currentSession) return;
        const result = await chrome.storage.local.get('sessionHistory');
        const history = result.sessionHistory || [];
        history.push(this.currentSession);
        if (history.length > 1000) {
            history.splice(0, history.length - 1000);
        }
        await chrome.storage.local.set({ sessionHistory: history });
    }

    async saveCurrentData() {
        if (this.currentSession) {
            if (this.currentUrl && this.siteStartTime) {
                this.recordSiteDuration();
                this.siteStartTime = Date.now();
            }
            await this.saveCurrentSession();
        }
    }

    handleWarningOverride(url) {
        if (this.currentSession) {
            this.currentSession.activities.push({
                timestamp: Date.now(),
                action: 'warning_override',
                url: url,
                domain: this.extractDomain(url)
            });
        }
        console.log('Warning overridden for:', url);
    }

    handlePageVisibilityChange(visible, url) {
        if (!this.currentSession) return;
        if (visible) {
            if (this.currentUrl === url) {
                this.siteStartTime = Date.now();
            }
        } else {
            if (this.currentUrl === url && this.siteStartTime) {
                this.recordSiteDuration();
                this.siteStartTime = null;
            }
        }
        this.currentSession.activities.push({
            timestamp: Date.now(),
            action: visible ? 'page_visible' : 'page_hidden',
            url,
            domain: this.extractDomain(url)
        });
    }

    handleActivityUpdate(active, url) {
        if (!this.currentSession) return;
        if (active) {
            this.lastActiveTime = Date.now();
        }
        this.currentSession.activities.push({
            timestamp: Date.now(),
            action: active ? 'user_active' : 'user_inactive',
            url,
            domain: this.extractDomain(url)
        });
        this.checkAutoStop();
    }

    async checkAutoStop() {
        if (!this.currentSession || !this.lastActiveTime) return;

        const settings = this.settings || {};

        if (settings.autoStop !== false) {
            const inactivityTimeout = (settings.inactivityTimeout || 30) * 60 * 1000;
            const inactiveTime = Date.now() - this.lastActiveTime;

            if (inactiveTime > inactivityTimeout) {
                console.log('Auto-stopping session due to inactivity');
                await this.stopSession();
            }
        }
    }

    async loadGeneralSettings() {
        const result = await chrome.storage.local.get('generalSettings');
        this.settings = result.generalSettings || {
            warningDelay: 60,
            autoStop: true,
            inactivityTimeout: 30,
            notifications: true,
            soundAlerts: false
        };
        console.log('General settings loaded:', this.settings);
    }

    async updateSchedules(schedules) {
        try {
            const alarms = await chrome.alarms.getAll();
            const scheduleAlarms = alarms.filter(alarm => alarm.name.startsWith('schedule_'));
            for (const alarm of scheduleAlarms) {
                await chrome.alarms.clear(alarm.name);
            }
            const enabledSchedules = schedules.filter(s => s.enabled);
            for (const schedule of enabledSchedules) {
                await this.createScheduleAlarm(schedule);
            }
            console.log(`Updated ${enabledSchedules.length} schedule alarms`);
        } catch (error) {
            console.error('Error updating schedules:', error);
        }
    }

    async createScheduleAlarm(schedule) {
        try {
            const [hours, minutes] = schedule.time.split(':').map(Number);
            for (const dayOfWeek of schedule.days) {
                const alarmName = `schedule_${schedule.id}_${dayOfWeek}`;
                const now = new Date();
                const nextOccurrence = new Date(now);
                const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
                nextOccurrence.setDate(now.getDate() + daysUntilTarget);
                nextOccurrence.setHours(hours, minutes, 0, 0);
                if (daysUntilTarget === 0 && nextOccurrence <= now) {
                    nextOccurrence.setDate(nextOccurrence.getDate() + 7);
                }
                await chrome.alarms.create(alarmName, {
                    when: nextOccurrence.getTime(),
                    periodInMinutes: 7 * 24 * 60
                });
                console.log(`Created alarm ${alarmName} for ${nextOccurrence}`);
            }
        } catch (error) {
            console.error('Error creating schedule alarm:', error);
        }
    }

    async handleScheduleAlarm(alarmName) {
        try {
            const parts = alarmName.split('_');
            if (parts.length < 3 || parts[0] !== 'schedule') return;
            const scheduleId = parts.slice(1, -1).join('_');
            const result = await chrome.storage.local.get('schedules');
            const schedules = result.schedules || [];
            const schedule = schedules.find(s => s.id === scheduleId);
            if (!schedule || !schedule.enabled) {
                console.log(`Schedule ${scheduleId} not found or disabled`);
                return;
            }
            if (this.currentSession) {
                console.log('Session already active, skipping scheduled start');
                if (this.settings.notifications !== false) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: '../assets/icon48.png',
                        title: 'Scheduled Session Skipped',
                        message: `A session is already active. Scheduled ${schedule.type} session was not started.`,
                        requireInteraction: true
                    });
                }
                return;
            }
            await this.startSession(schedule.type);
            if (schedule.duration && schedule.duration > 0) {
                const timer = setTimeout(async () => {
                    if (this.currentSession && this.currentSession.type === schedule.type) {
                        await this.stopSession();
                    }
                    this.autoStopTimers.delete(alarmName);
                }, schedule.duration * 60 * 1000);
                this.autoStopTimers.set(alarmName, timer);
            }
            console.log(`Started scheduled session: ${schedule.type}`);
        } catch (error) {
            console.error('Error handling schedule alarm:', error);
        }
    }

    async loadSchedulesOnStartup() {
        try {
            const result = await chrome.storage.local.get('schedules');
            const schedules = result.schedules || [];
            await this.updateSchedules(schedules);
        } catch (error) {
            console.error('Error loading schedules on startup:', error);
        }
    }

    formatDuration(milliseconds) {
        if (!milliseconds || milliseconds < 0) return '0 minutes';
        const totalMinutes = Math.floor(milliseconds / 1000 / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}

const sessionTracker = new SessionTracker();