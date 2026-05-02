# Window Globals Inventory

Date: 2026-05-02

Phase 1 of the window architecture cleanup plan. Enumerates every `window.*` bridge, grouped by owner and consumer.

## Legend

| Category | Meaning |
|----------|---------|
| **state** | Mutable data shared across modules |
| **action** | Function that triggers a behavior (API call, state mutation) |
| **render** | Function that updates the DOM |
| **shim** | Compatibility bridge for inline HTML handlers |
| **keep** | Intentional browser-global (e.g., `window.location`) |

---

## A. Bootstrap → State (bootstrap.js writes `window.*` from app-state.js)

These are the initial copies from `app-state.js` onto `window`. Every one of these is a **state** bridge.

| Global | Assigned By | Read By | Category | Action |
|--------|------------|---------|----------|--------|
| `window.prevValues` | bootstrap | dashboard-ws (animateNumber) | state | replace with import |
| `window.metricSeries` | bootstrap | dashboard-ws (sparklines) | state | replace with import |
| `window.slotSnapshots` | bootstrap | dashboard-ws (GPU viz) | state | replace with import |
| `window.requestActivity` | bootstrap | dashboard-render (activity rail) | state | replace with import |
| `window.recentTasks` | bootstrap | dashboard-render (recent tasks) | state | replace with import |
| `window.metricCapabilities` | bootstrap | dashboard-render | state | replace with import |
| `window.liveOutputTracker` | bootstrap | dashboard-ws (live output rate) | state | replace with import |
| `window.lastServerState` | bootstrap | dashboard-ws | state | replace with import |
| `window.lastLlamaMetrics` | bootstrap | dashboard-ws | state | replace with import |
| `window.lastSystemMetrics` | bootstrap | dashboard-ws | state | replace with import |
| `window.lastGpuMetrics` | bootstrap | dashboard-ws | state | replace with import |
| `window.lastCapabilities` | bootstrap | dashboard-ws | state | replace with import |
| `window.currentPollInterval` | bootstrap | dashboard-ws | state | replace with import |
| `window.lastGpuData` | bootstrap | dashboard-ws | state | replace with import |
| `window.presets` | bootstrap | sessions, attach-detach | state | replace with import |
| `window.sessions` | bootstrap | sessions | state | replace with import |
| `window.activeSessionId` | bootstrap | sessions, attach-detach | state | replace with import |
| `window.activeSessionPort` | bootstrap | sessions, attach-detach | state | replace with import |
| `window.serverRunning` | bootstrap | dashboard-ws, attach-detach | state | replace with import |
| `window.prevLogLen` | bootstrap | dashboard-ws (log rendering) | state | replace with import |
| `window.remoteAgentInProgress` | bootstrap | remote-agent | state | replace with import |
| `window.remoteAgentSshConnection` | bootstrap | remote-agent | state | replace with import |
| `window.latestSshHostKey` | bootstrap | remote-agent | state | replace with import |
| `window.settingsIsDirty` | bootstrap | settings | state | replace with import |
| `window.settingsSaveTimer` | bootstrap | settings | state | replace with import |
| `window.chatTabs` | bootstrap | chat-state, chat-render, chat-transport | state | replace with import |
| `window.activeChatTabId` | bootstrap | chat-state, chat-render | state | replace with import |
| `window.chatBusy` | bootstrap | chat-transport, chat-render | state | replace with import |
| `window.compactionInProgress` | bootstrap | chat-state | state | replace with import |
| `window.unreadChatCount` | bootstrap | chat-state | state | replace with import |
| `window.chatAbortController` | bootstrap | chat-transport | state | replace with import |
| `window.chatTabsDirty` | bootstrap | chat-state | state | replace with import |
| `window.chatPersistTimer` | bootstrap | chat-state | state | replace with import |
| `window.chatInitialized` | bootstrap | chat-render | state | replace with import |
| `window.lhmResolve` | bootstrap | lhm (deferred) | state | replace with import |
| `window.enterToSend` | bootstrap | user-menu | state | replace with import |
| `window.chatFontSize` | bootstrap | chat-render | state | replace with import |

**Summary:** 35 state bridges. All should be replaced with imports from `app-state.js`. The dashboard slice is the biggest consumer.

---

## B. Dashboard Render Helpers (dashboard-render.js exports to `window.*`)

These are **render** functions exposed on `window` for `dashboard-ws.js` to call.

| Global | Assigned By | Read By | Category | Action |
|--------|------------|---------|----------|--------|
| `window.setChipState` | dashboard-render | dashboard-ws | render | replace with import |
| `window.setCardState` | dashboard-render | dashboard-ws | render | replace with import |
| `window.pushSparklinePoint` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderSparkline` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderLiveSparkline` | dashboard-render | dashboard-ws | render | replace with import |
| `window.updateLiveOutputEstimate` | dashboard-render | dashboard-ws | render | replace with import |
| `window.updateRequestActivity` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderRecentTask` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderActivityRail` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderSlotGrid` | dashboard-render | dashboard-ws | render | replace with import |
| `window.getPrimarySlot` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderSlotUtilization` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderRequestStats` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderGenerationDetailItems` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderDecodingConfig` | dashboard-render | dashboard-ws | render | replace with import |
| `window.formatParamCount` | dashboard-render | dashboard-render | render | replace with import |
| `window.renderCapabilityPopover` | dashboard-render | dashboard-ws | render | replace with import |
| `window.updateMetricDelta` | dashboard-render | dashboard-ws | render | replace with import |
| `window.setEmptyState` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderGpuCard` | dashboard-render | dashboard-ws | render | replace with import |
| `window.renderSystemCard` | dashboard-render | dashboard-ws | render | replace with import |
| `window.setMetricSectionVisibility` | dashboard-render | dashboard-ws | render | replace with import |

**Summary:** 22 render bridges. All consumed by `dashboard-ws.js`. The natural fix is to have `dashboard-ws.js` import from `dashboard-render.js` directly, eliminating the `window.*` indirection.

---

## C. Dashboard Transport (dashboard-ws.js writes `window.*` state)

These are **state** mutations by the WebSocket transport.

| Global | Assigned By | Read By | Category | Action |
|--------|------------|---------|----------|--------|
| `window.prevLogLen` | dashboard-ws | dashboard-ws (next poll) | state | local variable or import from app-state |
| `window.appState.wsData` | dashboard-ws | — | state | remove (dead write) |
| `window.serverRunning` | dashboard-ws | attach-detach | state | write to app-state import |
| `window.lastServerState` | dashboard-ws | dashboard-ws (next poll) | state | import from app-state |
| `window.lastLlamaMetrics` | dashboard-ws | dashboard-ws (next poll) | state | import from app-state |
| `window.lastSystemMetrics` | dashboard-ws | dashboard-ws (next poll) | state | import from app-state |
| `window.lastCapabilities` | dashboard-ws | dashboard-ws (next poll) | state | import from app-state |
| `window.lastGpuMetrics` | dashboard-ws | dashboard-ws (next poll) | state | import from app-state |
| `window.speedMax` | dashboard-ws | dashboard-ws (next poll) | state | local variable |
| `window.lastGpuData` | dashboard-ws | dashboard-ws (next poll) | state | import from app-state |

**Summary:** 10 state writes. These should write to `app-state.js` imports instead of `window.*`.

---

## D. Feature Module Exports (action bridges on `window.*`)

These are **action** functions exposed on `window` for inline HTML handlers or cross-module use.

| Global | Assigned By | Read By | Category | Action |
|--------|------------|---------|----------|--------|
| `window.markSettingsDirty` | settings | inline HTML | shim | keep temporarily (inline handler) |
| `window.collectSettings` | settings | inline HTML | shim | keep temporarily |
| `window.saveSettings` | settings | inline HTML | shim | keep temporarily |
| `window.applySettings` | settings | inline HTML | shim | keep temporarily |
| `window.closeSettingsModal` | settings | inline HTML | shim | keep temporarily |
| `window.showToast` | toast | many modules | action | keep temporarily (cross-module toast) |
| `window.showToastWithActions` | toast | many modules | action | keep temporarily |
| `window.openFileBrowser` | file-browser (deferred) | bootstrap | action | replace with import |
| `window.setRemoteAgentStatus` | remote-agent | dashboard-ws | action | replace with import |
| `window.doAttach` | attach-detach | inline HTML | shim | keep temporarily |
| `window.doStart` | attach-detach | inline HTML | shim | keep temporarily |
| `window.updateActiveSessionInfo` | sessions | attach-detach | action | replace with import |
| `window.openKeyboardShortcutsModal` | shortcuts | user-menu | action | replace with import |
| `window.applyChatStyle` | chat-render | user-menu | action | replace with import |

**Summary:** 14 action bridges. Toast functions are genuinely cross-module — consider a narrow `toast.js` import. Inline HTML handlers (shims) can stay until we move those to JS event listeners.

---

## E. Chat Module Globals

| Global | Assigned By | Read By | Category | Action |
|--------|------------|---------|----------|--------|
| `window.chatScroll` | chat-render | bootstrap (inline handler) | shim | keep temporarily |
| `window.addChatTab` | chat-state | bootstrap (inline handler) | shim | keep temporarily |
| (many more chat functions) | chat-state, chat-render, chat-transport | cross-module | action/shim | Phase 3 |

**Summary:** Chat is the most globally-coupled slice. Deferred to Phase 3.

---

## F. Compatibility / Utility

| Global | Assigned By | Read By | Category | Action |
|--------|------------|---------|----------|--------|
| `window.escapeHtml` | bootstrap | inline HTML handlers | shim | keep temporarily |
| `window.formatMetricNumber` | compat/globals | inline HTML handlers | shim | keep temporarily |
| `window.closeAnalyticsModal` | bootstrap | inline HTML | shim | remove when analytics implemented |
| `window.closeExportModal` | bootstrap | inline HTML | shim | remove when export implemented |
| `window.exportData` | bootstrap | inline HTML | shim | remove when export implemented |

---

## G. Browser-Native (not our globals)

| Global | Category | Action |
|--------|----------|--------|
| `window.location` | keep | no action |
| `window.requestIdleCallback` | keep | no action |
| `window.clearTimeout` | keep | no action |
| `window.localStorage` | keep | no action |

---

## Summary by Category

| Category | Count | Phase |
|----------|-------|-------|
| State bridges (A) | 35 | Phase 2 (dashboard), Phase 3 (chat) |
| Render bridges (B) | 22 | Phase 2 |
| Transport state writes (C) | 10 | Phase 2 |
| Action bridges (D) | 14 | Phase 2-4 |
| Chat globals (E) | ~30+ | Phase 3 |
| Compat shims (F) | 6 | keep temporarily |

**Total actionable: ~117** (excluding chat and browser-native)

---

## Phase 2 Target (Dashboard Slice) — ✅ COMPLETE (2026-05-02)

For Phase 2, the dashboard slice cleanup should eliminate these:

1. **35 state bridges** (A) — dashboard-specific subset: replaced with `import * as state from '../core/app-state.js'` in `dashboard-ws.js`
2. **22 render bridges** (B) — replaced with explicit ES module exports from `dashboard-render.js`, imported directly in `dashboard-ws.js`
3. **10 transport state writes** (C) — now write to `state.*` imports

**Phase 2 result: eliminated ~67 `window.*` globals from dashboard slice.**

### What changed

- `dashboard-ws.js` now imports state from `app-state.js` and render functions from `dashboard-render.js` directly
- `dashboard-render.js` exports 22 render functions as ES module exports (replaces `window.*` assignments)
- `speedMax` is now a local variable in `dashboard-ws.js` (not shared globally)
- `formatMetricNumber` imported from `core/format.js` (not via `window.*`)
- `animateNumber` imported from `animate.js` (not via `window.*`)
- `setRemoteAgentStatus` imported from `remote-agent.js` (not via `window.*`)
- `activeChatTab` imported from `chat-state.js` (not via `window.*`)
- 2 remaining `window.*` references (`hideConnectingState`, `switchView`) are TODOs for setup-view extraction

### What was NOT changed

- `bootstrap.js` still copies state to `window.*` — other modules (sessions, attach-detach, chat) still read from `window.*`. Safe to remove only after all consumers are migrated.
- Inline HTML handlers still use `window.*` shims (e.g., `window.doAttach`, `window.doStart`). These are intentional compat bridges.
