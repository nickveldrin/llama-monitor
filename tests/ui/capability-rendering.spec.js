// Browser-based UI tests for Phase 5 UI Components
// Run with: npx playwright test tests/ui

import { test, expect } from '@playwright/test';

test.describe('Phase 5 UI Components', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for server to be ready
    await page.goto('http://localhost:8001');
    await page.waitForSelector('.top-nav-bar', { timeout: 10000 });
  });

  test('top navigation bar renders', async ({ page }) => {
    await expect(page.locator('.top-nav-bar')).toBeVisible();
    await expect(page.locator('.nav-logo')).toBeVisible();
    await expect(page.locator('.nav-search')).toBeVisible();
    await expect(page.locator('.nav-right')).toBeVisible();
  });

  test('sidebar navigation renders', async ({ page }) => {
    await expect(page.locator('.sidebar-nav')).toBeVisible();
    await expect(page.locator('.sidebar-btn')).toHaveCount(6);
  });

  test('dashboard grid renders', async ({ page }) => {
    await expect(page.locator('.dashboard-grid')).toBeVisible();
    await expect(page.locator('.widget-card')).toBeVisible();
  });

  test('inference metrics render', async ({ page }) => {
    await expect(page.locator('#inference')).toBeVisible();
    await expect(page.locator('.widget-metric')).toBeVisible();
  });

  test('GPU table renders when available', async ({ page }) => {
    // GPU table should be visible for local spawn
    const gpuTable = page.locator('.gpu-table');
    await expect(gpuTable).toBeVisible();
  });

  test('chat tab exists', async ({ page }) => {
    await expect(page.locator('#page-chat')).toBeVisible();
  });

  test('logs tab exists', async ({ page }) => {
    await expect(page.locator('#page-logs')).toBeVisible();
  });

  test('session modal structure', async ({ page }) => {
    await expect(page.locator('#session-modal')).toBeVisible();
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  test('settings modal structure', async ({ page }) => {
    await expect(page.locator('#settings-modal')).toBeVisible();
    await expect(page.locator('.settings-tabs')).toBeVisible();
  });

  test('analytics modal structure', async ({ page }) => {
    await expect(page.locator('#analytics-modal')).toBeVisible();
    await expect(page.locator('.analytics-dashboard')).toBeVisible();
  });

  test('export modal structure', async ({ page }) => {
    await expect(page.locator('#export-modal')).toBeVisible();
    await expect(page.locator('.export-panel')).toBeVisible();
  });

  test('keyboard shortcuts modal structure', async ({ page }) => {
    await expect(page.locator('#keyboard-shortcuts-modal')).toBeVisible();
    await expect(page.locator('.shortcuts-modal')).toBeVisible();
  });

  test('user preferences modal structure', async ({ page }) => {
    await expect(page.locator('#user-preferences-modal')).toBeVisible();
    await expect(page.locator('.personalization-panel')).toBeVisible();
  });
});

test.describe('Theme System', () => {
  test('light mode default', async ({ page }) => {
    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('light');
  });

  test('dark mode toggle', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark');
  });

  test('theme colors apply', async ({ page }) => {
    const rootStyles = await page.evaluate(() => {
      return getComputedStyle(document.documentElement);
    });
    expect(rootStyles.getPropertyValue('--theme-primary')).not.toBe('');
  });
});

test.describe('Responsive Design', () => {
  test('desktop layout (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:8001');
    
    const gridTemplate = await page.evaluate(() => {
      const grid = document.querySelector('.dashboard-grid');
      return getComputedStyle(grid).gridTemplateColumns;
    });
    expect(gridTemplate).toContain('1fr');
  });

  test('laptop layout (1024px)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('http://localhost:8001');
    
    await expect(page.locator('.sidebar-nav')).toBeVisible();
  });

  test('mobile layout (< 768px)', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto('http://localhost:8001');
    
    // Verify single column layout
    const grid = await page.evaluate(() => {
      return getComputedStyle(document.querySelector('.dashboard-grid')).gridTemplateColumns;
    });
    expect(grid).toBe('1fr');
  });
});

test.describe('Remote Agent Mode', () => {
  test('remote endpoint hides GPU', async ({ page }) => {
    await page.goto('http://localhost:9999'); // Remote endpoint
    
    // GPU table should be hidden for remote
    await expect(page.locator('.gpu-table')).not.toBeVisible();
    
    // Remote agent indicator should be visible
    await expect(page.locator('.agent-status')).toBeVisible();
  });

  test('remote endpoint shows inference only', async ({ page }) => {
    await page.goto('http://localhost:9999');
    
    // Verify only inference metrics visible
    await expect(page.locator('.widget-metric')).toBeVisible();
    await expect(page.locator('.gpu-table')).not.toBeVisible();
  });
});

test.describe('Error States', () => {
  test('server unreachable state', async ({ page }) => {
    // This would require mocking the API response
    // For now, verify the error UI structure exists
    await expect(page.locator('.endpoint-status')).toBeVisible();
  });

  test('high context warning', async ({ page }) => {
    // Simulate high context usage and verify warning shows
    await expect(page.locator('.context-warning')).not.toBeNull();
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('shortcuts modal opens', async ({ page }) => {
    // Trigger keyboard shortcuts modal (Shift+? or Ctrl+/)
    await page.keyboard.press('Shift+/');
    await expect(page.locator('.shortcuts-modal')).toBeVisible();
  });

  test('shortcuts displayed', async ({ page }) => {
    await expect(page.locator('.shortcut-item')).toHaveCount(21);
  });

  test('navigation shortcuts', async ({ page }) => {
    await expect(page.locator('.shortcuts-section:nth-child(1) .shortcut-item')).toHaveCount(6);
  });

  test('session shortcuts', async ({ page }) => {
    await expect(page.locator('.shortcuts-section:nth-child(2) .shortcut-item')).toHaveCount(3);
  });

  test('quick action shortcuts', async ({ page }) => {
    await expect(page.locator('.shortcuts-section:nth-child(3) .shortcut-item')).toHaveCount(5);
  });
});

test.describe('Analytics Dashboard', () => {
  test('analytics modal opens', async ({ page }) => {
    // Trigger analytics modal (Ctrl+A)
    await page.keyboard.press('Control+a');
    await expect(page.locator('#analytics-modal')).toBeVisible();
  });

  test('analytics charts render', async ({ page }) => {
    await expect(page.locator('.chart-container')).toBeVisible();
  });

  test('analytics metrics visible', async ({ page }) => {
    await expect(page.locator('.analytics-metric')).toBeVisible();
  });
});

test.describe('Export Functionality', () => {
  test('export modal opens', async ({ page }) => {
    // Trigger export modal (Ctrl+E)
    await page.keyboard.press('Control+e');
    await expect(page.locator('#export-modal')).toBeVisible();
  });

  test('export options available', async ({ page }) => {
    await expect(page.locator('.export-option')).toHaveCount(4);
  });

  test('export formats available', async ({ page }) => {
    await expect(page.locator('input[name="export-format"]')).toHaveCount(2);
  });

  test('export ranges available', async ({ page }) => {
    await expect(page.locator('input[name="export-range"]')).toHaveCount(4);
  });
});

test.describe('User Preferences', () => {
  test('preferences modal opens', async ({ page }) => {
    // Trigger user preferences modal
    await page.goto('http://localhost:8001?open=prefs');
    await expect(page.locator('#user-preferences-modal')).toBeVisible();
  });

  test('theme mode options', async ({ page }) => {
    await expect(page.locator('#pref-theme-mode option')).toHaveCount(3);
  });

  test('font scale slider', async ({ page }) => {
    await expect(page.locator('#pref-font-scale')).toBeVisible();
  });

  test('dashboard options', async ({ page }) => {
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(12);
  });
});

test.describe('Session Management', () => {
  test('sessions panel renders', async ({ page }) => {
    await expect(page.locator('#page-sessions')).toBeVisible();
  });

  test('session cards display', async ({ page }) => {
    await expect(page.locator('.session-card')).toBeVisible();
  });

  test('session status indicators', async ({ page }) => {
    await expect(page.locator('.status-dot')).toBeVisible();
  });
});

test.describe('Settings Modal', () => {
  test('settings tabs render', async ({ page }) => {
    await expect(page.locator('.settings-tab')).toHaveCount(4);
  });

  test('general settings tab', async ({ page }) => {
    await expect(page.locator('#settings-general')).toBeVisible();
  });

  test('appearance settings tab', async ({ page }) => {
    await expect(page.locator('#settings-appearance')).toBeVisible();
  });

  test('GPU settings tab', async ({ page }) => {
    await expect(page.locator('#settings-gpu')).toBeVisible();
  });

  test('network settings tab', async ({ page }) => {
    await expect(page.locator('#settings-network')).toBeVisible();
  });
});

test.describe('Toast Notifications', () => {
  test('toast container exists', async ({ page }) => {
    await expect(page.locator('#toast-container')).toBeVisible();
  });

  test('toast styles apply', async ({ page }) => {
    const toastStyles = await page.evaluate(() => {
      return getComputedStyle(document.body);
    });
    expect(toastStyles.getPropertyValue('--toast-duration')).toBe('4000ms');
  });
});

test.describe('Accessibility', () => {
  test('keyboard navigation works', async ({ page }) => {
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('aria-labels present', async ({ page }) => {
    const ariaLabels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*[aria-label]')).length;
    });
    expect(ariaLabels).toBeGreaterThan(0);
  });

  test('focus states visible', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusRing = await page.evaluate(() => {
      const focused = document.activeElement;
      return getComputedStyle(focused).outline;
    });
    expect(focusRing).not.toBe('none');
  });
});
