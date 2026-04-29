# App Update Capability — 2026-04-29

## Architecture Context

**llama-monitor** is a standalone Rust binary with embedded HTML/CSS/JS frontend (via `include_str!` in `src/web/static_assets.rs`). It is distributed as raw binaries on GitHub Releases for four platforms: Linux x86_64, Linux ARM64, Windows x86_64, macOS ARM64.

**There is no self-update mechanism.** Users must manually download new versions from GitHub Releases. Remote agent update logic exists (`src/agent.rs`) but is for managing remote machines only — not self-update.

**There is no Tauri/Electron wrapper.** The app uses `tray-icon` + `wry` directly for native tray/webview, not through a packaging framework that provides auto-update.

---

## Proposed Approach

### What We Can Do

1. **Display current version** — always visible in bottom-left nav (below collapse button)
2. **Check for updates** — silent background fetch of GitHub latest release on app load
3. **Notify if behind** — subtle pill in top bar (no banners, no modals, no dark patterns)
4. **Show release notes** — slide-out panel with GitHub release Markdown
5. **Self-update (Unix/macOS)** — download and replace binary using `self_update` crate
6. **Deep-link (Windows)** — open GitHub release page (cannot replace running `.exe` without helper)

### What We Won't Do

- Forced updates or blocking dialogs
- Repeat nagging after dismissal
- Background downloads without user consent
- Auto-restart without explicit user action

---

## UI/UX Design

### Version Display

**Location:** Bottom-left of sidebar nav, below the collapse/expand button.

**Appearance:** `10px` font, `--text-muted` color, always visible. Format: `v0.10.0`.

**Implementation:**
- `Cargo.toml` version is exposed via `CARGO_PKG_VERSION` environment variable at compile time
- Add a `<script>` tag in `static/index.html` that writes the version to a DOM element:
  ```html
  <span id="app-version" class="nav-version"></span>
  ```
- In `static/index.html`, add the version span inside the sidebar nav footer area:
  ```html
  <!-- Inside .sidebar-nav, after the collapse button -->
  <span class="nav-version" id="app-version"></span>
  ```
- In `static/app.js`, populate on `DOMContentLoaded`:
  ```js
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = APP_VERSION; // injected at build time
  ```
- In `static/index.html` `<head>`, inject version via inline script (safe — no CSP conflict since we control the server):
  ```html
  <script>const APP_VERSION = '{{ VERSION }}';</script>
  ```
- In `src/web/mod.rs`, replace `{{ VERSION }}` in the HTML before serving:
  ```rust
  let html = static_assets::INDEX_HTML.replace("{{ VERSION }}", env!("CARGO_PKG_VERSION"));
  ```

### Update Check

**Trigger:** On app load (after `DOMContentLoaded`), fetch `/api/releases/latest`.

**Backend:** Add new API endpoint in `src/web/api.rs`:
```rust
fn api_latest_release() -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "releases" / "latest")
        .and(warp::get())
        .and_then(async || {
            // Reuse existing logic from src/agent.rs:latest_release_info()
            // Return JSON: { tag_name: "v0.11.0", html_url: "...", published_at: "..." }
        })
}
```

**Frontend:** In `static/app.js`, add:
```js
async function checkForUpdate() {
    try {
        const resp = await fetch('/api/releases/latest');
        const latest = await resp.json();
        const current = APP_VERSION;
        if (compareVersions(latest.tag_name, current) > 0) {
            showUpdatePill(latest);
        }
    } catch (e) {
        console.debug('Update check failed:', e.message);
    }
}
```

**Version comparison:** Add a simple `compareVersions(a, b)` utility that parses semver strings and returns `-1`, `0`, or `1`. Handle `v` prefix.

### Update Pill

**Location:** Top bar, between the "Settings" button and the "User" avatar.

**Appearance:** Small pill (`height: 24px`), neutral background (`rgba(99, 102, 241, 0.12)`), muted text (`--text-secondary`), no red urgency. Content: `v0.11.0 available`.

**Behavior:**
- Click pill → open release notes panel (slide-out from right)
- Click outside panel → close
- Panel includes "Dismiss" button → hides pill, stores dismissed version in `localStorage`
- Dismissed versions reappear after 24 hours or on app restart (stored timestamp in `localStorage`)

**HTML:** Add to `static/index.html` inside `.top-nav-bar`:
```html
<button id="update-pill" class="top-nav-pill" style="display:none;" onclick="openReleaseNotes()">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
    </svg>
    <span id="update-pill-text"></span>
</button>
```

**CSS:** Add to `static/css/layout.css`:
```css
.top-nav-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    padding: 0 10px;
    border-radius: 12px;
    background: rgba(99, 102, 241, 0.12);
    color: var(--text-secondary);
    border: 1px solid rgba(99, 102, 241, 0.15);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
}
.top-nav-pill:hover {
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.25);
}
```

### Release Notes Panel

**Appearance:** Slide-out panel from right (`width: 420px`), dark background (`--color-surface`), rounded left corners. Contains:
- Header: release version + date
- Body: rendered Markdown from GitHub release body
- Footer: "Open on GitHub" link + "Dismiss" button

**Implementation:**
- Add panel HTML to `static/index.html`:
  ```html
  <div id="release-notes-panel" class="slide-panel" style="display:none;">
      <div class="slide-panel-header">
          <h3 id="release-notes-title"></h3>
          <button class="modal-close" onclick="closeReleaseNotes()">&times;</button>
      </div>
      <div class="slide-panel-body" id="release-notes-body"></div>
      <div class="slide-panel-footer">
          <a id="release-notes-link" href="#" target="_blank">Open on GitHub ↗</a>
          <button class="btn-sm btn-preset" onclick="dismissUpdate()">Dismiss</button>
      </div>
  </div>
  ```
- Add CSS for `.slide-panel` to `static/css/layout.css` (use existing modal CSS as reference)
- Add `openReleaseNotes()`, `closeReleaseNotes()`, `dismissUpdate()` to `static/app.js`
- Render Markdown using existing `renderMd()` function

### Self-Update (Backend)

**Dependency:** Add `self_update = "0.40"` to `Cargo.toml`.

**Endpoint:** Add `POST /api/self-update` in `src/web/api.rs`:
```rust
fn api_self_update(state: Arc<AppState>) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "self-update")
        .and(warp::post())
        .and(warp::any().map(move || state.clone()))
        .and_then(|state: Arc<AppState>| async move {
            // Use self_update::backends::github::Update::configure()
            // to download and apply update
            // Return JSON: { ok: true, version: "v0.11.0", restart_required: true }
        })
}
```

**Platform constraints:**
- **macOS/Linux:** Binary replacement works. App must restart (tray icon can trigger restart).
- **Windows:** Cannot replace running `.exe`. Return `restart_required: false` and instruct user to download manually from GitHub.

**Frontend:** In the release notes panel, show "Update & Restart" button (Unix/macOS) or "Download from GitHub" link (Windows). Detect platform via `/api/platform` endpoint (already exists).

---

## Implementation Order

1. **Version display** — expose `CARGO_PKG_VERSION` to frontend, render in nav footer
2. **Update check endpoint** — `/api/releases/latest` (reuse `src/agent.rs` logic)
3. **Update pill + panel** — UI components in HTML/CSS/JS
4. **Dismissal logic** — `localStorage` for dismissed versions
5. **Self-update endpoint** — `self_update` crate integration (Unix/macOS only)
6. **Update button** — trigger self-update or deep-link to GitHub

---

## Files to Modify

| File | Change |
|---|---|
| `Cargo.toml` | Add `self_update` dependency |
| `src/web/mod.rs` | Replace `{{ VERSION }}` in HTML; add `/api/releases/latest` route |
| `src/web/api.rs` | Add release info and self-update endpoints |
| `static/index.html` | Add version span, update pill, release notes panel |
| `static/css/layout.css` | Add `.top-nav-pill`, `.slide-panel`, `.nav-version` styles |
| `static/app.js` | Add `checkForUpdate()`, `compareVersions()`, panel controls, dismissal logic |

---

## Notes for Future Implementation

- The existing `latest_release_info()` in `src/agent.rs` can be extracted to a shared utility function
- The `warp` filter pattern used for `/api/remote-agent/releases/latest` is the template to follow
- The `renderMd()` function already exists and can render GitHub release Markdown
- The `tray.rs` module can be consulted for restart logic (it already handles app restart on tray close)
- Do not block app startup on update check — it should be fire-and-forget with no UI impact on failure
