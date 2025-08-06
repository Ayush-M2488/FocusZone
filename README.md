#FocusZone - Browser Session Tracker

A comprehensive Chrome extension for tracking and managing browser usage sessions with advanced analytics, website filtering, and scheduling features.

## Features

### 🎯 Session Management
- **Start/Stop Sessions**: Easily control your browsing sessions with different types (Work, Study, Break, Personal)
- **Real-time Tracking**: Monitor current session duration, websites visited, and activity
- **Session Categories**: Organize your browsing time by purpose

### 🚫 Website Filtering
- **Allowed/Blocked Lists**: Configure specific websites for each session type
- **Smart Warnings**: Red overlay warnings appear after 1 minute on non-allowed sites
- **Flexible Override**: Continue anyway or go back when warnings appear

### 📅 Scheduling
- **Automatic Sessions**: Schedule sessions to start automatically at specific times
- **Weekly Recurring**: Set up recurring schedules for different days of the week
- **Duration Control**: Set automatic session end times

### 📊 Analytics & Reports
- **Visual Charts**: Bar charts, pie charts, and timeline visualizations
- **Website Analytics**: Detailed breakdown of time spent on each website
- **Session History**: Complete log of all past sessions with statistics
- **Productivity Scoring**: Track work/study vs break/personal time ratio

### 🔧 Advanced Features
- **Data Export**: Export session data as JSON or CSV
- **Auto-stop**: Automatically end sessions after periods of inactivity
- **Notifications**: Browser notifications for session events
- **Data Management**: Import/export settings and clear old data

## Installation

### Method 1: Load Unpacked Extension (Developer Mode)

1. **Download the Extension**
   - Download or clone this repository to your computer
   - Extract the files if downloaded as a ZIP

2. **Enable Developer Mode**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Select the `browser-session-tracker` folder
   - The extension should now appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "Browser Session Tracker" and click the pin icon

### Method 2: Chrome Web Store (Future)
*This extension will be available on the Chrome Web Store in the future.*

## Quick Start

### Starting Your First Session

1. **Click the Extension Icon**
   - Look for the blue clock icon in your Chrome toolbar
   - Click it to open the popup

2. **Choose Session Type**
   - Select from Work, Study, Break, or Personal
   - Click "Start Session"

3. **Browse Normally**
   - The extension tracks your activity automatically
   - View real-time stats in the popup

4. **End Session**
   - Click the extension icon again
   - Click "Stop Session" when done

### Setting Up Website Filters

1. **Open Settings**
   - Click "Settings" in the extension popup
   - Or right-click the extension icon and select "Options"

2. **Configure Session Types**
   - Go to the "Session Types" tab
   - Add allowed/blocked websites for each session type
   - Enter domains separated by commas or new lines

3. **Save Configuration**
   - Click "Save Session Configurations"
   - Your filters are now active

### Creating Schedules

1. **Go to Schedules Tab**
   - Open extension settings
   - Click on "Schedules" tab

2. **Add New Schedule**
   - Click "+ Add New Schedule"
   - Fill in the schedule details:
     - Name (e.g., "Morning Work Session")
     - Session type
     - Start time
     - Duration
     - Days of the week

3. **Enable Schedule**
   - Make sure "Enabled" is checked
   - Click "Save Schedule"

### Viewing Reports

1. **Access Reports**
   - Click "View Reports" in the popup
   - Or go to Settings → View Reports

2. **Explore Analytics**
   - **Overview**: Summary stats and charts
   - **Sessions**: Detailed session history
   - **Websites**: Website usage analytics
   - **Timeline**: Visual timeline of daily activity

3. **Export Data**
   - Click "Export Report" to download your data
   - Choose JSON for complete data or CSV for sessions only

## Configuration Guide

### Session Types

Each session type can have its own configuration:

- **Work**: For professional tasks
  - Suggested allowed sites: GitHub, Google Docs, Slack, email
  - Suggested blocked sites: Social media, entertainment

- **Study**: For learning and education
  - Suggested allowed sites: Wikipedia, Khan Academy, Coursera
  - Suggested blocked sites: Gaming, social media

- **Break**: For relaxation
  - Suggested allowed sites: YouTube, Netflix, social media
  - Suggested blocked sites: Work tools, email

- **Personal**: For personal tasks
  - Suggested allowed sites: Banking, shopping, personal email
  - Suggested blocked sites: Work-related sites

### General Settings

- **Warning Delay**: Time before showing overlay (10-300 seconds)
- **Auto-stop**: Automatically end sessions after inactivity
- **Inactivity Timeout**: Minutes of inactivity before auto-stop
- **Notifications**: Enable/disable browser notifications
- **Sound Alerts**: Play sounds with warning overlays
- **Data Retention**: How long to keep session history

## Privacy & Data

### What Data is Collected
- Session start/end times
- Websites visited and time spent
- Session types and activities
- User-configured settings

### Data Storage
- All data is stored locally in your browser
- No data is sent to external servers
- You have full control over your data

### Data Management
- Export your data anytime
- Clear old data by time period
- Import previously exported data
- Complete data deletion available

## Troubleshooting

### Extension Not Working
1. Check if the extension is enabled in `chrome://extensions/`
2. Refresh the page you're trying to track
3. Restart Chrome if issues persist

### Sessions Not Starting
1. Make sure you clicked "Start Session" in the popup
2. Check if there are any error messages
3. Try refreshing the extension popup

### Website Filtering Not Working
1. Verify your allowed/blocked lists are saved
2. Check domain formatting (use just the domain, not full URLs)
3. Refresh pages after changing settings

### Schedules Not Triggering
1. Ensure schedules are enabled
2. Check that the correct days are selected
3. Verify your system time is correct

### Reports Not Loading
1. Try refreshing the reports page
2. Check if you have session data
3. Clear browser cache if needed

## Support

### Getting Help
- Check this README for common solutions
- Review the troubleshooting section
- Check browser console for error messages

### Reporting Issues
When reporting issues, please include:
- Chrome version
- Extension version
- Steps to reproduce the problem
- Any error messages

## Technical Details

### Permissions Used
- **storage**: Save session data and settings
- **tabs**: Monitor active tabs and URLs
- **activeTab**: Track current tab activity
- **scripting**: Inject warning overlays
- **alarms**: Schedule automatic sessions
- **notifications**: Show session notifications
- **host_permissions**: Monitor all websites

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers (Edge, Brave, etc.)

### File Structure
```
browser-session-tracker/
├── manifest.json          # Extension configuration
├── popup/                 # Extension popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/            # Background service worker
│   └── background.js
├── content/               # Content scripts and overlays
│   ├── content.js
│   └── overlay.css
├── options/               # Settings and reports pages
│   ├── options.html
│   ├── options.css
│   ├── options.js
│   ├── reports.html
│   ├── reports.css
│   └── reports.js
├── assets/                # Icons and images
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Version History

### v1.0.0 (Current)
- Initial release
- Session tracking and management
- Website filtering with warnings
- Scheduling system
- Analytics and reporting
- Data export/import



**FocusZone** - Take control of your browsing time and boost your productivity! 🚀

