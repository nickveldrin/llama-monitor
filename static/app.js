// ── Legacy Shim ───────────────────────────────────────────────────────────────
// This file is a minimal compatibility shim. All feature code has been extracted
// to ES modules in static/js/features/*. The modules register their functions
// on window.* for inline HTML handlers. This shim triggers the init functions
// that are not yet wired through bootstrap.js.
//
// bootstrap.js (type="module") runs first and initializes all extracted modules.
// This classic script runs after, providing any remaining compatibility layer.

// Call init on DOM ready (functions provided by modules on window.*)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof window.initAppVersion === 'function') window.initAppVersion();
        if (typeof window.checkForUpdate === 'function') window.checkForUpdate();
        if (typeof window.initViewState === 'function') window.initViewState();
        if (typeof window.initChatTabs === 'function') window.initChatTabs();
        if (typeof window.autoResizeChatInput === 'function') window.autoResizeChatInput();
        if (typeof window.initChatInputHandler === 'function') window.initChatInputHandler();
        if (typeof window.initChatScrollButton === 'function') window.initChatScrollButton();
        if (typeof window.initEnterToggle === 'function') window.initEnterToggle();
        if (typeof window.initChatStyle === 'function') window.initChatStyle();
        if (typeof window.applyChatFontSize === 'function') window.applyChatFontSize();
        if (typeof window.initChatKeyboardShortcuts === 'function') window.initChatKeyboardShortcuts();
    });
} else {
    if (typeof window.initAppVersion === 'function') window.initAppVersion();
    if (typeof window.checkForUpdate === 'function') window.checkForUpdate();
    if (typeof window.initViewState === 'function') window.initViewState();
    if (typeof window.initChatTabs === 'function') window.initChatTabs();
    if (typeof window.autoResizeChatInput === 'function') window.autoResizeChatInput();
    if (typeof window.initChatInputHandler === 'function') window.initChatInputHandler();
    if (typeof window.initChatScrollButton === 'function') window.initChatScrollButton();
    if (typeof window.initEnterToggle === 'function') window.initEnterToggle();
    if (typeof window.initChatStyle === 'function') window.initChatStyle();
    if (typeof window.applyChatFontSize === 'function') window.applyChatFontSize();
    if (typeof window.initChatKeyboardShortcuts === 'function') window.initChatKeyboardShortcuts();
}
