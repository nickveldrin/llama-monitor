import { test, expect } from '@playwright/test';

test.describe('modern UI shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.top-nav-bar');
  });

  test('renders status, nav, sidebar, and dashboard shell', async ({ page }) => {
    await expect(page.locator('.endpoint-health-strip')).toBeVisible();
    await expect(page.locator('.status-label')).toHaveText('Active endpoint');
    await expect(page.locator('.top-nav-bar')).toBeVisible();
    await expect(page.locator('.sidebar-nav')).toBeVisible();
    await expect(page.locator('#page-server')).toBeVisible();
    await expect(page.locator('.dashboard-grid')).toBeVisible();
  });

  test('top status endpoint is read-only and edit control is in dashboard', async ({ page }) => {
    await expect(page.locator('.endpoint-url')).toBeVisible();
    await expect(page.locator('.endpoint-url')).not.toHaveJSProperty('tagName', 'INPUT');
    await expect(page.locator('#server-endpoint')).toBeEditable();
  });

  test('sidebar page tabs switch server, chat, and logs', async ({ page }) => {
    await page.getByRole('button', { name: /chat/i }).click();
    await expect(page.locator('#page-chat')).toBeVisible();
    await expect(page.locator('#page-server')).not.toBeVisible();

    await page.getByRole('button', { name: /logs/i }).click();
    await expect(page.locator('#page-logs')).toBeVisible();
    await expect(page.locator('#page-chat')).not.toBeVisible();

    await page.getByRole('button', { name: /server/i }).click();
    await expect(page.locator('#page-server')).toBeVisible();
  });
});

test.describe('modal controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.top-nav-bar');
  });

  test('settings opens and secondary tabs switch', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).first().click();
    await expect(page.locator('#settings-modal')).toHaveClass(/open/);
    await expect(page.locator('#settings-session')).toBeVisible();

    await page.getByRole('button', { name: 'Advanced' }).click();
    await expect(page.locator('#settings-advanced')).toBeVisible();
    await expect(page.getByRole('button', { name: /open runtime configuration/i })).toBeVisible();
  });

  test('sessions opens without stale id errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.getByRole('button', { name: /sessions/i }).click();
    await expect(page.locator('#session-modal')).toHaveClass(/open/);
    await expect(page.locator('#session-modal-title')).toHaveText('New Session');

    await page.locator('#modal-session-mode').selectOption('attach');
    await expect(page.locator('#modal-session-port-label')).toHaveText('Endpoint');
    expect(errors).toEqual([]);
  });

  test('models modal opens and lists model discovery state', async ({ page }) => {
    await page.getByRole('button', { name: /models/i }).click();
    await expect(page.locator('#models-modal')).toHaveClass(/open/);
    await expect(page.locator('#models-summary')).toBeVisible();
    await expect(page.locator('#models-list')).toBeVisible();
  });

  test('profile menu remains open after click', async ({ page }) => {
    await page.getByRole('button', { name: /user/i }).click();
    await expect(page.locator('.nav-user-menu')).toHaveClass(/open/);
    await expect(page.getByRole('link', { name: 'Preferences' })).toBeVisible();
  });

  test('profile dropdown actions are wired', async ({ page }) => {
    await page.getByRole('button', { name: /user/i }).click();
    await page.getByRole('link', { name: 'Preferences' }).click();
    await expect(page.locator('#user-preferences-modal')).toHaveClass(/open/);
    await page.locator('#user-preferences-modal .modal-close').click();

    await page.getByRole('button', { name: /user/i }).click();
    await page.getByRole('link', { name: 'Help' }).click();
    await expect(page.locator('#keyboard-shortcuts-modal')).toHaveClass(/open/);
    await page.locator('#keyboard-shortcuts-modal .shortcuts-close').click();

    await page.getByRole('button', { name: /user/i }).click();
    await page.getByRole('link', { name: 'Toggle Theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
  });

  test('remote agent fix opens runtime configuration', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('agent-status').style.display = '';
    });
    await page.locator('.btn-firewall-fix').click();
    await expect(page.locator('#config-modal')).toHaveClass(/open/);
    await expect(page.locator('#remote-agent-panel')).toBeVisible();
  });

  test('configuration explains local executable, GPU, and explicit SSH flow', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.getByRole('button', { name: 'Advanced' }).click();
    await page.getByRole('button', { name: /open runtime configuration/i }).click();

    await expect(page.locator('#config-modal')).toHaveClass(/open/);
    await expect(page.getByText('Local llama-server executable')).toBeVisible();
    await expect(page.getByText('actual executable file')).toBeVisible();
    await expect(page.getByText('These checks run on this Mac or workstation only.')).toBeVisible();
    await expect(page.getByText('Remote agent actions are opt-in.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guided SSH Setup' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check Host' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check Release' })).toBeVisible();
  });

  test('guided SSH setup builds a structured target without contacting host', async ({ page }) => {
    let detectCalls = 0;

    await page.route('/api/remote-agent/detect', async route => {
      detectCalls += 1;
      const payload = route.request().postDataJSON();
      expect(payload.ssh_target).toBe('ssh://user@192.0.2.16:2222');
      expect(payload.ssh_connection).toMatchObject({
        host: '192.0.2.16',
        username: 'user',
        port: 2222,
      });
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          os: 'linux',
          arch: 'x86_64',
          installed: false,
          reachable: false,
          install_path: '~/.config/llama-monitor/bin/llama-monitor',
          matching_asset: { name: 'llama-monitor-linux-x86_64', archive: false },
          latest_release: { tag_name: 'v0.5.1' },
        }),
      });
    });

    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.getByRole('button', { name: 'Advanced' }).click();
    await page.getByRole('button', { name: /open runtime configuration/i }).click();
    await page.getByRole('button', { name: 'Guided SSH Setup' }).click();
    await page.locator('#ssh-guide-host').fill('192.0.2.16');
    await page.locator('#ssh-guide-user').fill('user');
    await page.locator('#ssh-guide-port').fill('2222');
    await page.getByRole('button', { name: 'Preview Plan' }).click();
    await expect(page.locator('#ssh-guide-plan')).toContainText('ssh://user@192.0.2.16:2222');
    await expect(page.getByRole('button', { name: 'Scan Host Key' })).toBeVisible();
    expect(detectCalls).toBe(0);

    await page.getByRole('button', { name: 'Use These Settings' }).click();
    await expect(page.locator('#set-remote-agent-ssh-target')).toHaveValue('ssh://user@192.0.2.16:2222');
    expect(detectCalls).toBe(0);

    await page.getByRole('button', { name: 'Check Host' }).click();
    await expect.poll(() => detectCalls).toBe(1);
  });

  test('typing SSH target does not auto-detect remote host', async ({ page }) => {
    let detectCalls = 0;

    await page.route('/api/remote-agent/detect', async route => {
      detectCalls += 1;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          os: 'linux',
          arch: 'x86_64',
          installed: false,
          reachable: false,
          install_path: '~/.config/llama-monitor/bin/llama-monitor',
          matching_asset: { name: 'llama-monitor-linux-x86_64', archive: false },
          latest_release: { tag_name: 'v0.5.1' },
        }),
      });
    });

    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.getByRole('button', { name: 'Advanced' }).click();
    await page.getByRole('button', { name: /open runtime configuration/i }).click();
    await page.getByText('SSH and Agent Details').click();
    await page.locator('#set-remote-agent-ssh-target').fill('user@192.0.2.16');
    await page.waitForTimeout(250);
    expect(detectCalls).toBe(0);

    await page.getByRole('button', { name: 'Check Host' }).click();
    await expect.poll(() => detectCalls).toBe(1);
  });
});

test.describe('responsive shell', () => {
  test('mobile layout keeps navigation and endpoint form usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.locator('.endpoint-health-strip')).toBeVisible();
    await expect(page.locator('.sidebar-nav')).toBeVisible();
    await expect(page.locator('#server-endpoint')).toBeEditable();
    await expect(page.getByRole('button', { name: /^attach$/i })).toBeVisible();
  });
});
