// ── State Initialization (Classic Script) ──────────────────────────────────────
// Loaded as a classic script BEFORE app.js. Sets up window.* with default values
// from app-state.js so that app.js can read/write window.* without errors.
//
// This is a classic script (not a module) so it executes synchronously before
// app.js. The module bootstrap (bootstrap.js) runs after app.js and can import
// from ES modules.

(function() {
    // Dashboard / Monitor
    window.prevValues = { prompt: 0, generation: 0, contextPct: 0 };
    window.metricSeries = { prompt: [], generation: [], liveOutput: [] };
    window.slotSnapshots = new Map();
    window.requestActivity = [];
    window.recentTasks = [];
    window.metricCapabilities = {};
    window.liveOutputTracker = {
        taskId: null, previousDecoded: null, previousMs: null, latestRate: 0, rates: []
    };
    window.lastServerState = null;
    window.lastLlamaMetrics = null;
    window.lastSystemMetrics = null;
    window.lastGpuMetrics = null;
    window.lastCapabilities = null;
    window.currentPollInterval = 5000;
    window.lastGpuData = null;

    // Presets / Sessions
    window.presets = [];
    window.sessions = [];
    window.activeSessionId = 'default';
    window.activeSessionPort = 8080;
    window.serverRunning = false;
    window.prevLogLen = 0;

    // Remote Agent
    window.remoteAgentInProgress = false;
    window.remoteAgentSshConnection = null;
    window.latestSshHostKey = null;

    // Settings
    window.settingsIsDirty = false;
    window.settingsSaveTimer = null;

    // Chat
    window.chatTabs = [];
    window.activeChatTabId = null;
    window.chatBusy = false;
    window.compactionInProgress = false;
    window.unreadChatCount = 0;
    window.chatAbortController = null;
    window.chatTabsDirty = false;
    window.chatPersistTimer = null;

    // LHM
    window.lhmResolve = null;

    // UI Preferences
    window.enterToSend = localStorage.getItem('llama-monitor-enter-to-send') !== 'false';
    window.chatFontSize = parseInt(localStorage.getItem('llama-monitor-chat-font') || '100');
})();
