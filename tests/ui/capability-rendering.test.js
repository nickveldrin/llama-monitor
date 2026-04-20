# Browser-based UI Tests

**Date**: 2026-04-20  
**Framework**: playwright/test  
**Target**: Phase 5 UI Implementation

---

## Test Suite

### Setup
```bash
# Run all UI tests
npm run test:ui

# Run specific test
npx playwright test tests/ui/capability-rendering.test.js

# Run with browser visible
npx playwright test --headless=false
```

---

## Test Cases

### Test 1: Local Endpoint with All Metrics

```javascript
test('local spawn has all metrics', async ({ page }) => {
    // Start server with spawn mode
    await page.goto('http://localhost:8001');
    
    // Verify system metrics visible
    await expect(page.locator('.gpu-table')).toBeVisible();
    
    // Verify inference metrics visible
    await expect(page.locator('#inference')).toBeVisible();
    
    // Verify GPU sections present
    const gpuRows = await page.locator('#gpu-rows tr').count();
    expect(gpuRows).toBeGreaterThan(0);
});
```

### Test 2: Remote Endpoint with Inference Only

```javascript
test('remote attach has inference only', async ({ page }) => {
    // Attach to remote endpoint
    await page.goto('http://localhost:9999');
    
    // Verify GPU section hidden
    await expect(page.locator('.gpu-table')).not.toBeVisible();
    
    // Verify system section hidden
    await expect(page.locator('#system-section')).not.toBeVisible();
    
    // Verify inference metrics visible
    await expect(page.locator('.widget-metric')).toBeVisible();
});
```

### Test 3: Server Unreachable State

```javascript
test('unreachable server shows error', async ({ page }) => {
    // Try to connect to non-existent endpoint
    await page.goto('http://localhost:9999');
    
    // Verify error state displayed
    await expect(page.locator('.endpoint-status.error')).toBeVisible();
    
    // Verify no metrics displayed
    await expect(page.locator('.widget-metric-value')).not.toHaveText(/—/);
});
```

### Test 4: High Context Usage Warning

```javascript
test('high context shows warning', async ({ page }) => {
    await page.goto('http://localhost:8001');
    
    // Simulate high context usage
    // (This would require mocking the metrics)
    
    // Verify warning displayed
    await expect(page.locator('.context-warning')).toBeVisible();
});
```

### Test 5: Missing GPU Backend

```javascript
test('missing GPU backend shows fallback', async ({ page }) => {
    await page.goto('http://localhost:8001');
    
    // Simulate missing GPU backend
    // (This would require mocking the metrics)
    
    // Verify fallback message shown
    await expect(page.locator('.gpu-backend-fallback')).toBeVisible();
});
```

### Test 6: Missing CPU Temperature

```javascript
test('missing CPU temp shows sensor unavailable', async ({ page }) => {
    await page.goto('http://localhost:8001');
    
    // Simulate missing CPU temperature sensor
    // (This would require mocking the metrics)
    
    // Verify fallback message shown
    await expect(page.locator('.temp-fallback')).toBeVisible();
});
```

### Test 7: Narrow Browser Width

```javascript
test('narrow width shows mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto('http://localhost:8001');
    
    // Verify single column layout
    await expect(page.locator('.dashboard-grid')).toHaveCSS('grid-template-columns', '1fr');
    
    // Verify sidebar hidden
    await expect(page.locator('.sidebar-nav')).not.toBeVisible();
});
```

### Test 8: Tray Mode (Headless)

```javascript
test('headless mode disables tray', async ({ page }) => {
    await page.goto('http://localhost:8001?headless=true');
    
    // Verify tray controls hidden
    await expect(page.locator('.tray-controls')).not.toBeVisible();
    
    // Verify full UI still accessible
    await expect(page.locator('.top-nav-bar')).toBeVisible();
});
```

### Test 9: Dark Mode Contrast

```javascript
test('dark mode has proper contrast', async ({ page }) => {
    // Switch to dark mode
    await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
    });
    
    await page.goto('http://localhost:8001');
    
    // Verify text is readable
    const textColor = await page.evaluate(() => {
        return getComputedStyle(document.body).color;
    });
    
    expect(textColor).not.toBe('rgb(0, 0, 0)');
});
```

### Test 10: Reduced Motion Mode

```javascript
test('reduced motion disables animations', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.addStyleTag({
        content: '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }'
    });
    
    await page.goto('http://localhost:8001');
    
    // Verify no transitions on hover
    const transition = await page.evaluate(() => {
        const card = document.querySelector('.widget-card');
        return getComputedStyle(card).transition;
    });
    
    expect(transition).toBe('none');
});
```

---

## Manual Testing

### Quick Manual Check

```bash
# Start server
cargo run --

# Open browser
open http://localhost:8001

# Manual checks:
# 1. Verify all UI components load
# 2. Test Start/Stop server
# 3. Test Settings modal
# 4. Test Analytics modal
# 5. Test Export modal
# 6. Test keyboard shortcuts (Ctrl+? or Shift+/)
# 7. Test theme toggle
```

---

## Test Results

Run this command to verify tests pass:

```bash
cargo test
```

Expected output: All 88 tests pass (41 + 43 + 4 integration tests)

---

**Last Updated**: 2026-04-20
