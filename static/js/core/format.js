// ── Pure formatting helpers ────────────────────────────────────────────────────
// Extracted from static/app.js — no DOM access, no side effects

/**
 * Escape HTML entities in a string.
 * Authoritative implementation — replaces 3 duplicates in app.js.
 */
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

/**
 * Format a number with locale-aware thousands separators.
 */
export function formatMetricNumber(value) {
    if (!Number.isFinite(value)) return '0';
    return Math.round(value).toLocaleString();
}

/**
 * Format a Unix timestamp (ms) as a relative age string.
 */
export function formatMetricAge(unixMs) {
    if (!unixMs) return 'no recent activity';
    const ageSeconds = Math.max(0, Math.floor((Date.now() - unixMs) / 1000));
    if (ageSeconds < 2) return 'updated just now';
    if (ageSeconds < 60) return 'updated ' + ageSeconds + 's ago';
    const ageMinutes = Math.floor(ageSeconds / 60);
    return 'updated ' + ageMinutes + 'm ago';
}

/**
 * Format a duration in milliseconds as a human-readable string.
 */
export function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '~0.0s';
    if (ms < 1000) return '~' + Math.round(ms) + 'ms';
    return '~' + (ms / 1000).toFixed(1) + 's';
}

/**
 * Format a config value — round numbers to 2 decimal places.
 */
export function formatConfigValue(value) {
    const num = parseFloat(value);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
        const rounded = Math.round(num * 100) / 100;
        return String(rounded);
    }
    return String(value);
}

/**
 * Format a hex SSH host key with colons (e.g. "aa:bb:cc:dd").
 */
export function formatHostKey(keyHex) {
    return String(keyHex || '').match(/.{1,2}/g)?.join(':') || '';
}

/**
 * Format a clock readout in MHz or GHz.
 * Returns { value, unit, detail }.
 */
export function formatClockReadout(mhz) {
    if (!Number.isFinite(mhz) || mhz <= 0) {
        return { value: '\u2014', unit: 'MHz', detail: '\u2014' };
    }
    if (mhz >= 1000) {
        const ghz = mhz >= 10000 ? (mhz / 1000).toFixed(1) : (mhz / 1000).toFixed(2);
        return { value: ghz, unit: 'GHz', detail: mhz + ' MHz' };
    }
    return { value: String(mhz), unit: 'MHz', detail: mhz + ' MHz' };
}

/**
 * Format a token count with K/M suffix.
 */
export function formatTokenCount(n) {
    if (!Number.isFinite(n)) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

/**
 * Compare two semantic version strings.
 * Returns -1, 0, or 1.
 */
export function compareVersions(a, b) {
    const parse = s => s.replace(/^v/, '').split('.').map(Number);
    const [av, bv] = [parse(a), parse(b)];
    for (let i = 0; i < Math.max(av.length, bv.length); i++) {
        const x = av[i] || 0;
        const y = bv[i] || 0;
        if (x > y) return 1;
        if (x < y) return -1;
    }
    return 0;
}

/**
 * Get a severity color for a percentage (e.g. context usage).
 */
export function getSeverityColor(pct) {
    if (pct >= 95) return '#f43f5e';
    if (pct >= 80) return '#f59e0b';
    return '#10b981';
}

/**
 * Get a severity color for a temperature reading.
 */
export function getTempSeverityColor(temp) {
    if (temp >= 90) return '#f43f5e';
    if (temp >= 75) return '#f59e0b';
    return '#8fbcbb';
}

/**
 * Compute min/max/pct for a clock band from history + current value.
 * Returns { min, max, pct, peakPct, lowPct }.
 */
export function computeClockBand(history, current) {
    const points = (history || []).filter(Number.isFinite);
    if (Number.isFinite(current) && current > 0) points.push(current);
    if (points.length === 0) {
        return { min: 0, max: 0, pct: 0, peakPct: 0, lowPct: 0 };
    }
    const min = Math.min.apply(null, points);
    const max = Math.max.apply(null, points);
    const range = max - min || 1;
    const pct = Number.isFinite(current) ? ((current - min) / range) * 100 : 0;
    return {
        min,
        max,
        pct,
        peakPct: ((max - min) / range) * 100,
        lowPct: 0,
    };
}

/**
 * Get a stable key for a task ID (used for request activity tracking).
 */
export function getTaskKey(taskId, active) {
    if (taskId !== null && taskId !== undefined) return String(taskId);
    return active ? 'active-unknown' : null;
}
