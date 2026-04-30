// ── Navigation ────────────────────────────────────────────────────────────────
// Tab switching and sidebar collapse.

function switchTab(name) {
    const page = document.getElementById('page-' + name);
    if (!page) return;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));

    page.classList.add('active');

    const sidebarButton = Array.from(document.querySelectorAll('.sidebar-btn'))
        .find(button => button.getAttribute('onclick') === "switchTab('" + name + "')");
    if (sidebarButton) sidebarButton.classList.add('active');
}

function toggleSidebarCollapse() {
    const sidebar = document.getElementById('sidebar-nav');
    const icon = document.querySelector('.sidebar-collapse-icon');

    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');

    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());

    if (icon) {
        icon.textContent = isCollapsed ? '▶' : '◀';
    }
}

function restoreSidebarState() {
    const sidebar = document.getElementById('sidebar-nav');
    const icon = document.querySelector('.sidebar-collapse-icon');
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
        if (icon) icon.textContent = '▶';
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initNav() {
    window.switchTab = switchTab;
    window.toggleSidebarCollapse = toggleSidebarCollapse;
    restoreSidebarState(); // runs immediately on import
}
