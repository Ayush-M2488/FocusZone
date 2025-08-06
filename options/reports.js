class ReportsController {
    constructor() {
        this.currentTab = 'overview';
        this.dateRange = 'week';
        this.sessionData = [];
        this.filteredData = [];
        this.charts = {};
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupListenersAndLoad());
        } else {
            this.setupListenersAndLoad();
        }
    }

    setupListenersAndLoad() {
        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', e => this.switchTab(e.target.dataset.tab));
        });

        // Date range selector
        const dateRangeEl = document.getElementById('date-range');
        if (dateRangeEl) {
            dateRangeEl.addEventListener('change', e => {
                this.dateRange = e.target.value;
                this.loadData();
            });
        }

        // Export report
        const exportBtn = document.getElementById('export-report');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportReport());
        }

        // Back to settings
        const backSettingsBtn = document.getElementById('back-to-settings');
        if (backSettingsBtn) {
            backSettingsBtn.addEventListener('click', () => this.backToSettings());
        }

        // Session filters
        const sessionTypeFilter = document.getElementById('session-type-filter');
        if (sessionTypeFilter) {
            sessionTypeFilter.addEventListener('change', () => this.filterSessions());
        }
        const sessionSearchInput = document.getElementById('session-search') || document.getElementById('search-session');
        if (sessionSearchInput) {
            sessionSearchInput.addEventListener('input', () => this.filterSessions());
        }

        // Website sorting
        const websiteSort = document.getElementById('website-sort');
        if (websiteSort) {
            websiteSort.addEventListener('change', () => this.updateWebsitesTab());
        }

        // Timeline controls
        const timelineDate = document.getElementById('timeline-date');
        if (timelineDate) {
            timelineDate.addEventListener('change', () => this.updateTimeline());
            timelineDate.value = new Date().toISOString().slice(0, 10);
        }
        const timelinePrev = document.getElementById('timeline-prev');
        if (timelinePrev) {
            timelinePrev.addEventListener('click', () => this.navigateTimeline(-1));
        }
        const timelineNext = document.getElementById('timeline-next');
        if (timelineNext) {
            timelineNext.addEventListener('click', () => this.navigateTimeline(1));
        }

        // Footer actions
        const refreshData = document.getElementById('refresh-data');
        if (refreshData) {
            refreshData.addEventListener('click', () => this.loadData());
        }
        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => this.clearFilters());
        }

        // Event delegation for View Details buttons
        const sessionsList = document.getElementById('sessions-list');
        if (sessionsList) {
            sessionsList.addEventListener('click', e => {
                if (e.target && e.target.classList.contains('view-details-btn')) {
                    const sessionId = e.target.dataset.sessionId;
                    if (sessionId) this.viewSessionDetails(sessionId);
                }
            });
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const btn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
        if (btn) btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const tab = document.getElementById(`${tabName}-tab`);
        if (tab) tab.classList.add('active');

        this.currentTab = tabName;
        this.updateCurrentTab();
    }

    async loadData() {
        try {
            const result = await chrome.storage.local.get('sessionHistory');
            const allSessions = result.sessionHistory || [];
            this.sessionData = this.filterByDateRange(allSessions);
            this.filteredData = [...this.sessionData];

            // Optional: Also get current active session status to update scheduled warning (if you store it separately)
            const status = await this.getCurrentSessionStatus();
            this.updateSessionStatus(status);

            this.updateCurrentTab();
        } catch (error) {
            console.error('Error loading session data:', error);
            this.showMessage('Error loading session data', 'error');
        }
    }

    filterByDateRange(sessions) {
        const now = new Date();
        switch (this.dateRange) {
            case 'today': {
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return sessions.filter(s => {
                    const st = new Date(s.startTime);
                    return st >= todayStart && st < new Date(todayStart.getTime() + 86400000);
                });
            }
            case 'week': {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                return sessions.filter(s => new Date(s.startTime) >= weekStart);
            }
            case 'month': {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return sessions.filter(s => new Date(s.startTime) >= monthStart);
            }
            case 'all':
            default:
                return sessions;
        }
    }

    updateCurrentTab() {
        switch (this.currentTab) {
            case 'overview': this.updateOverviewTab(); break;
            case 'sessions': this.updateSessionsTab(); break;
            case 'websites': this.updateWebsitesTab(); break;
            case 'timeline': this.updateTimeline(); break;
        }
    }

    updateOverviewTab() {
        this.updateOverviewStats();
        this.updateOverviewCharts();
    }

    updateOverviewStats() {
        const totalTime = this.sessionData.reduce((sum, s) => sum + (s.totalDuration || 0), 0);
        const totalSessions = this.sessionData.length;
        const uniqueSites = new Set();
        this.sessionData.forEach(s => { if (s.sites) Object.keys(s.sites).forEach(site => uniqueSites.add(site)); });
        const avg = totalSessions > 0 ? totalTime / totalSessions : 0;

        document.getElementById('total-time').textContent = this.formatDuration(totalTime);
        document.getElementById('total-sessions').textContent = totalSessions;
        document.getElementById('unique-sites').textContent = uniqueSites.size;
        document.getElementById('avg-session').textContent = this.formatDuration(avg, true);

        this.updateProductivityScore();
    }

    updateProductivityScore() {
        const productiveTypes = ['work', 'study'];
        const productiveTime = this.sessionData.filter(s => productiveTypes.includes(s.type)).reduce((sum, s) => sum + (s.totalDuration || 0), 0);
        const totalTime = this.sessionData.reduce((sum, s) => sum + (s.totalDuration || 0), 0);
        const score = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

        const progElem = document.getElementById('productivity-score');
        if (progElem) {
            progElem.setAttribute('data-score', score);
            progElem.style.setProperty('--progress', `${score}%`);
            progElem.style.setProperty('--progress-angle', `${(score / 100) * 360}deg`);
        }
        const valElem = document.getElementById('productivity-value');
        if (valElem) valElem.textContent = `${score}%`;
    }

    updateOverviewCharts() {
        this.createSessionTypesChart();
        this.createDailyActivityChart();
        this.createTopWebsitesChart();
    }

    createSessionTypesChart() {
        const ctx = document.getElementById('session-types-chart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.sessionTypes) this.charts.sessionTypes.destroy();

        const counts = {};
        this.sessionData.forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });

        const labels = Object.keys(counts);
        if (labels.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        const colors = { work: '#3b82f6', study: '#10b981', break: '#fbbf24', personal: '#ec4899' };
        const data = labels.map(l => counts[l]);
        const backgroundColors = labels.map(l => colors[l] || '#6b7280');

        this.charts.sessionTypes = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: backgroundColors, borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    createDailyActivityChart() {
        const ctx = document.getElementById('daily-activity-chart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.dailyActivity) this.charts.dailyActivity.destroy();

        const dailyMap = {};
        this.sessionData.forEach(s => {
            const dateStr = new Date(s.startTime).toLocaleDateString();
            dailyMap[dateStr] = (dailyMap[dateStr] || 0) + (s.totalDuration || 0);
        });

        const now = new Date();
        const labels = [];
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            labels.push(date.toLocaleDateString(undefined, { weekday: 'short' }));
            const fullDate = date.toLocaleDateString();
            data.push((dailyMap[fullDate] || 0) / (1000 * 60 * 60)); // hours
        }

        if (data.every(v => v === 0)) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        this.charts.dailyActivity = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Hours', data, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', fill: true, tension: 0.3 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours' } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    createTopWebsitesChart() {
        const ctx = document.getElementById('top-websites-chart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.topWebsites) this.charts.topWebsites.destroy();

        const siteMap = {};
        this.sessionData.forEach(s => {
            if (!s.sites) return;
            Object.values(s.sites).forEach(site => {
                siteMap[site.domain] = (siteMap[site.domain] || 0) + (site.totalTime || 0);
            });
        });

        const sortedSites = Object.entries(siteMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

        if (sortedSites.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        const labels = sortedSites.map(([domain]) => domain.length > 20 ? domain.slice(0, 17) + '...' : domain);
        const data = sortedSites.map(([_, time]) => Math.round(time / 60000)); // minutes

        this.charts.topWebsites = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Minutes', data, backgroundColor: '#10b981', borderColor: '#059669', borderWidth: 1 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: { x: { beginAtZero: true, title: { display: true, text: 'Minutes' } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    updateSessionsTab() {
        this.filterSessions();
    }

    filterSessions() {
        const typeFilter = document.getElementById('session-type-filter')?.value || 'all';
        const searchTerm = (document.getElementById('session-search')?.value || '').toLowerCase();

        this.filteredData = this.sessionData.filter(s => {
            const typeMatch = (typeFilter === 'all') || (s.type === typeFilter);
            const searchMatch =
                !searchTerm
                || s.type.toLowerCase().includes(searchTerm)
                || (s.sites && Object.keys(s.sites).some(site => site.toLowerCase().includes(searchTerm)));
            return typeMatch && searchMatch;
        });

        this.currentPage = 1;
        this.renderSessions();
    }

    renderSessions() {
        const container = document.getElementById('sessions-list');
        if (!container) return;

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const slice = this.filteredData.slice(startIdx, endIdx);

        if (slice.length === 0) {
            container.innerHTML = `<div class="empty-state"><h3>No sessions found.</h3><p>Try adjusting your filters.</p></div>`;
            return;
        }

        container.innerHTML = slice.map((s) => {
            const start = new Date(s.startTime);
            const end = s.endTime ? new Date(s.endTime) : null;
            const sitesCount = s.sites ? Object.keys(s.sites).length : 0;
            return `
      <div class="session-item">
          <div class="session-type-badge ${s.type}">${s.type}</div>
          <div class="session-details">
              <div class="session-time">${start.toLocaleDateString()} ${start.toLocaleTimeString()}
                  ${end ? " - " + end.toLocaleTimeString() : " (ongoing)"}
              </div>
              <div class="session-duration">${this.formatDuration(s.totalDuration)}</div>
              <div class="session-sites">${sitesCount} website${sitesCount !== 1 ? 's' : ''} visited</div>
          </div>
          <div class="session-actions">
              <button class="btn btn-small view-details-btn" data-session-id="${s.id}">View Details</button>
          </div>
      </div>`;
        }).join('');

        this.renderPagination();
    }

    renderPagination() {
        const container = document.getElementById('sessions-pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
      <button ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Previous page" class="pagination-btn" data-page="${this.currentPage - 1}">Previous</button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                html += `<span class="pagination-ellipsis">…</span>`;
            }
        }

        html += `<button ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="Next page" class="pagination-btn" data-page="${this.currentPage + 1}">Next</button>`;
        container.innerHTML = html;
        container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const p = Number(e.target.getAttribute('data-page'));
                if (!isNaN(p)) this.changePage(p);
            });
        });
    }

    changePage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderSessions();
    }

    updateWebsitesTab() {
        this.createWebsiteChart();
        this.renderWebsitesTable();
    }

    createWebsiteChart() {
        const ctx = document.getElementById('website-time-chart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.websiteTime) this.charts.websiteTime.destroy();

        const siteMap = {};
        this.sessionData.forEach(s => {
            if (!s.sites) return;
            Object.values(s.sites).forEach(site => {
                siteMap[site.domain] = siteMap[site.domain] || { time: 0, visits: 0, lastVisit: 0 };
                siteMap[site.domain].time += site.totalTime || 0;
                siteMap[site.domain].visits += site.visits || 0;
                siteMap[site.domain].lastVisit = Math.max(siteMap[site.domain].lastVisit, site.lastVisit || 0);
            });
        });

        const websiteSort = document.getElementById('website-sort');
        const sortVal = websiteSort?.value || 'time';

        let entries = Object.entries(siteMap);
        switch (sortVal) {
            case 'visits':
                entries = entries.sort((a, b) => b[1].visits - a[1].visits);
                break;
            case 'name':
                entries = entries.sort((a, b) => a[0].localeCompare(b[0]));
                break;
            case 'time':
            default:
                entries = entries.sort((a, b) => b[1].time - a[1].time);
                break;
        }
        entries = entries.slice(0, 15);

        if (entries.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        const labels = entries.map(([domain]) => domain.length > 20 ? domain.slice(0, 17) + '...' : domain);
        const data = entries.map(([_, d]) => +(d.time / 1000 / 60 / 60).toFixed(2));

        this.charts.websiteTime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Hours',
                    data,
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 1,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: 'Hours' } }
                },
                plugins: { legend: { display: false } },
            },
        });
    }

    renderWebsitesTable() {
        const tbody = document.getElementById('websites-table-body');
        if (!tbody) return;

        const websiteSort = document.getElementById('website-sort');
        const sortVal = websiteSort?.value || 'time';

        const siteMap = {};
        this.sessionData.forEach(s => {
            if (!s.sites) return;
            Object.values(s.sites).forEach(site => {
                siteMap[site.domain] = siteMap[site.domain] || { domain: site.domain, time: 0, visits: 0, lastVisit: 0 };
                siteMap[site.domain].time += site.totalTime || 0;
                siteMap[site.domain].visits += site.visits || 0;
                siteMap[site.domain].lastVisit = Math.max(siteMap[site.domain].lastVisit, site.lastVisit || 0);
            });
        });

        let sites = Object.values(siteMap);
        switch (sortVal) {
            case 'visits':
                sites = sites.sort((a, b) => b.visits - a.visits);
                break;
            case 'name':
                sites = sites.sort((a, b) => a.domain.localeCompare(b.domain));
                break;
            case 'time':
            default:
                sites = sites.sort((a, b) => b.time - a.time);
                break;
        }

        tbody.innerHTML = sites.map(site => {
            return `<tr>
        <td class="website-name">${site.domain}</td>
        <td>${this.formatDuration(site.time)}</td>
        <td>${site.visits}</td>
        <td>${this.formatDuration(site.visits ? site.time / site.visits : 0)}</td>
        <td>${site.lastVisit ? new Date(site.lastVisit).toLocaleDateString() : '-'}</td>
      </tr>`;
        }).join('');
    }

    updateTimeline() {
        const dateInput = document.getElementById('timeline-date');
        if (!dateInput) return;
        const selectedDate = new Date(dateInput.value);
        if (isNaN(selectedDate)) return;

        const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const dayEnd = new Date(dayStart.getTime() + 86400000);

        const sessionsForDay = this.sessionData.filter(s => {
            const start = new Date(s.startTime);
            return start >= dayStart && start < dayEnd;
        });

        this.renderTimelineHours();
        this.renderTimelineSessions(sessionsForDay);
    }

    renderTimelineHours() {
        const container = document.querySelector('.timeline-hours');
        if (!container) return;

        container.innerHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            const el = document.createElement('div');
            el.className = 'timeline-hour';
            el.textContent = `${hour.toString().padStart(2, '0')}:00`;
            container.appendChild(el);
        }
    }

    renderTimelineSessions(sessions) {
        const container = document.getElementById('timeline-content');
        if (!container) return;

        container.innerHTML = '';

        sessions.forEach((session, i) => {
            const startDate = new Date(session.startTime);
            const endDate = session.endTime ? new Date(session.endTime) : new Date();
            const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
            const durationMins = Math.max(endMinutes - startMinutes, 1);

            const minWidthPercent = 1.5; // minimum visible width for bars
            const leftPercent = (startMinutes / (60 * 24)) * 100;
            let widthPercent = (durationMins / (60 * 24)) * 100;
            widthPercent = Math.max(widthPercent, minWidthPercent);

            const div = document.createElement('div');
            div.className = `timeline-session ${session.type}`;
            div.style.left = `${leftPercent}%`;
            div.style.width = `${widthPercent}%`;
            div.style.top = `${i * 30 + 8}px`;
            div.textContent = `${session.type} (${this.formatDuration(session.totalDuration, true)})`;
            div.title = `${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`;

            container.appendChild(div);
        });

        container.style.minHeight = `${sessions.length * 30 + 15}px`;
    }

    navigateTimeline(direction) {
        const dateInput = document.getElementById('timeline-date');
        if (!dateInput) return;
        const currentDate = new Date(dateInput.value);
        if (isNaN(currentDate)) return;

        currentDate.setDate(currentDate.getDate() + direction);
        dateInput.value = currentDate.toISOString().slice(0, 10);
        this.updateTimeline();
    }

    viewSessionDetails(sessionId) {
        const session = this.sessionData.find(s => s.id === sessionId);
        if (!session) return;

        const sites = session.sites ? Object.values(session.sites) : [];
        const siteDetails = sites.map(site => `${site.domain}: ${this.formatDuration(site.totalTime)} (${site.visits} visits)`).join('\n') || 'No websites tracked';

        alert(`Session Details
Type: ${session.type}
Start: ${new Date(session.startTime).toLocaleString()}
End: ${session.endTime ? new Date(session.endTime).toLocaleString() : 'Ongoing'}
Duration: ${this.formatDuration(session.totalDuration)}

Sites visited:
${siteDetails}`);
    }

    formatDuration(ms, short = false) {
        if (!ms || ms <= 0) return short ? '0m' : '0h 0m';
        const totalMinutes = Math.floor(ms / 1000 / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (short) {
            return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
        return `${hours}h ${minutes}m`;
    }

    showMessage(msg, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `message ${type}`;
        notification.textContent = msg;
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '9999',
            maxWidth: '320px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            userSelect: 'none',
        });
        switch (type) {
            case 'success': notification.style.backgroundColor = '#10b981'; break;
            case 'error': notification.style.backgroundColor = '#ef4444'; break;
            default: notification.style.backgroundColor = '#3b82f6';
        }
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3500);
    }

    // Export report function (optional)
    async exportReport() {
        try {
            const reportData = {
                dateRange: this.dateRange,
                generatedAt: new Date().toISOString(),
                summary: {
                    totalSessions: this.sessionData.length,
                    totalTime: this.sessionData.reduce((sum, s) => sum + (s.totalDuration || 0), 0),
                    uniqueSites: new Set(this.sessionData.flatMap(s => Object.keys(s.sites || {}))).size,
                },
                sessions: this.sessionData
            };

            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session-report-${this.dateRange}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showMessage('Report exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showMessage('Error exporting report', 'error');
        }
    }

    // Navigate back to settings page
    async backToSettings() {
        try {
            await chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
            window.close();
        } catch (error) {
            console.error('Error opening settings:', error);
            this.showMessage('Could not open settings.', 'error');
        }
    }

    clearFilters() {
        const sessionFilter = document.getElementById('session-type-filter');
        const searchInput = document.getElementById('session-search');
        const websiteSort = document.getElementById('website-sort');
        if (sessionFilter) sessionFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        if (websiteSort) websiteSort.value = 'time';
        this.filterSessions();
        this.updateWebsitesTab();
    }

    // New method: update session status (handle scheduledStart warning in reports UI)
    updateSessionStatus(status) {
        const scheduledWarning = document.getElementById('scheduledSessionWarning');
        const dismissBtn = document.getElementById('dismissScheduledWarning');

        if (status && status.scheduledStart) {
            if (scheduledWarning) scheduledWarning.style.display = 'block';
            if (dismissBtn) {
                dismissBtn.onclick = () => {
                    scheduledWarning.style.display = 'none';
                };
            }
        } else {
            if (scheduledWarning) scheduledWarning.style.display = 'none';
        }
    }

    // Optional helper to get current session status for scheduled warning UI
    async getCurrentSessionStatus() {
        return new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'getSessionStatus' }, resolve);
        });
    }
}

// Initialize controller on page load
const reportsController = new ReportsController();
