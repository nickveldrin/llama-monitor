// ── File Browser ───────────────────────────────────────────────────────────────
// File/directory browser modal. Used by preset modal, session modal, settings.

let fbTargetId = '';
let fbFilter = '';
let fbCurrentPath = '';

export function openFileBrowser(targetId, filter) {
    fbTargetId = targetId;
    fbFilter = filter === 'dir' ? '' : (filter || '');
    const modal = document.getElementById('file-browser-modal');

    const current = document.getElementById(targetId).value;
    let startPath = '';
    if (current) {
        const parts = current.split('/');
        parts.pop();
        startPath = parts.join('/') || '/';
    }

    const selectBtn = modal.querySelector('.btn-modal-save');
    selectBtn.style.display = filter === 'dir' ? '' : 'none';
    modal.classList.add('open');

    fileBrowserGo(startPath);
}

export function closeFileBrowser() {
    document.getElementById('file-browser-modal').classList.remove('open');
}

export async function fileBrowserGo(path) {
    const entriesEl = document.getElementById('fb-entries');
    entriesEl.innerHTML = '<div class="fb-empty">Loading...</div>';

    const params = new URLSearchParams();
    if (path) params.set('path', path);
    if (fbFilter) params.set('filter', fbFilter);

    try {
        const resp = await fetch('/api/browse?' + params);
        const data = await resp.json();
        if (data.error) {
            entriesEl.innerHTML = '<div class="fb-empty">' + data.error + '</div>';
            return;
        }

        fbCurrentPath = data.path;
        document.getElementById('fb-path-input').value = data.path;
        if (data.entries.length === 0) {
            entriesEl.innerHTML = '<div class="fb-empty">Empty directory</div>';
            return;
        }

        entriesEl.innerHTML = data.entries.map(e => {
            const escapeJsString = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            if (e.is_dir) {
                return '<div class="fb-entry fb-entry-dir" onclick="openFileBrowser(\'' + escapeJsString(e.path) + '\')">' +
                    '<span class="fb-entry-icon">\u{1F4C1}</span>' +
                    '<span class="fb-entry-name">' + e.name + '</span></div>';
            } else {
                return '<div class="fb-entry fb-entry-file fb-match" onclick="fileBrowserSelect(\'' + escapeJsString(e.path) + '\')">' +
                    '<span class="fb-entry-icon">\u{1F4C4}</span>' +
                    '<span class="fb-entry-name">' + e.name + '</span>' +
                    '<span class="fb-entry-size">' + e.size_display + '</span></div>';
            }
        }).join('');
    } catch (err) {
        entriesEl.innerHTML = '<div class="fb-empty">Error: ' + err.message + '</div>';
    }
}

export function fileBrowserUp() {
    if (fbCurrentPath && fbCurrentPath !== '/') {
        const parts = fbCurrentPath.split('/');
        parts.pop();
        fileBrowserGo(parts.join('/') || '/');
    }
}

export function fileBrowserSelect(path) {
    document.getElementById(fbTargetId).value = path || fbCurrentPath;
    document.getElementById(fbTargetId).dispatchEvent(new Event('input', { bubbles: true }));
    closeFileBrowser();
}

// ── Init ───────────────────────────────────────────────────────────────────────

export function initFileBrowser() {
    // Put on window for inline handlers
    window.openFileBrowser = openFileBrowser;
    window.closeFileBrowser = closeFileBrowser;
    window.fileBrowserGo = fileBrowserGo;
    window.fileBrowserUp = fileBrowserUp;
    window.fileBrowserSelect = fileBrowserSelect;

    // Modal overlay click
    const modal = document.getElementById('file-browser-modal');
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === e.currentTarget) closeFileBrowser();
        });
    }

    // Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
            closeFileBrowser();
            e.stopImmediatePropagation();
        }
    }, true);
}
