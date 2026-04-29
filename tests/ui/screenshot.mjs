import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = process.env.LLAMA_MONITOR_URL || 'http://localhost:7778';
const REMOTE_SERVER = 'http://192.168.2.16:8001';
const OUTPUT_DIR = '../../docs/screenshots';
const CHAT_ONLY = process.argv.includes('--chat-only');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    if (CHAT_ONLY) {
      await captureChatOnly(page, BASE_URL, REMOTE_SERVER);
    } else {
      await captureAll(page, BASE_URL, REMOTE_SERVER);
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
})();

async function captureAll(page, baseUrl, remoteServer) {
  console.log('Taking welcome screen screenshot...');
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: `${OUTPUT_DIR}/01-welcome.png`, fullPage: true });
  console.log('Done: 01-welcome.png');

  await attachToServer(page, remoteServer);

  console.log('Taking inference metrics screenshot...');
  await page.click('button[onclick="switchTab(\'server\')"]');
  await sleep(5000);
  await page.screenshot({ path: `${OUTPUT_DIR}/02-inference-metrics.png`, fullPage: true });
  console.log('Done: 02-inference-metrics.png');

  await captureChat(page, '03-chat.png');

  console.log('Taking GPU/system metrics screenshot...');
  await page.click('button[onclick="switchTab(\'server\')"]');
  await sleep(3000);
  await page.evaluate(() => {
    const gpuSection = document.getElementById('gpu-section');
    if (gpuSection) gpuSection.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await sleep(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/04-gpu-metrics.png`, fullPage: true });
  console.log('Done: 04-gpu-metrics.png');

  console.log('Taking logs screenshot...');
  await page.click('button[onclick="switchTab(\'logs\')"]');
  await sleep(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/05-logs.png`, fullPage: true });
  console.log('Done: 05-logs.png');

  console.log('\nAll screenshots saved to docs/screenshots/');
}

async function captureChatOnly(page, baseUrl, remoteServer) {
  console.log('[CHAT ONLY] Navigating and attaching to server...');
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await sleep(3000);

  await attachToServer(page, remoteServer);

  console.log('[CHAT ONLY] Switching to chat tab...');
  await page.click('button[onclick="switchTab(\'chat\')"]');
  await sleep(2000);

  await captureChat(page, 'chat-overhaul.png');
  console.log('\nChat-only screenshot saved to docs/screenshots/chat-overhaul.png');
}

async function attachToServer(page, remoteServer) {
  console.log('Attaching to remote server...');
  await page.evaluate((url) => {
    const input = document.getElementById('setup-endpoint-url');
    if (input) {
      input.value = url;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, remoteServer);
  await sleep(500);
  await page.evaluate(() => document.querySelector('button[onclick="doAttachFromSetup()"]')?.click());
  await sleep(8000);
}

async function captureChat(page, filename) {
  const message = process.env.CHAT_MESSAGE || 'Hello, can you tell me a short joke?';

  await page.evaluate((msg) => {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = msg;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, message);
  await sleep(500);
  await page.evaluate(() => document.getElementById('btn-send')?.click());

  console.log('Waiting for LLM response to complete...');
  await page.waitForFunction(() => {
    const typing = document.getElementById('chat-typing');
    const sendBtn = document.getElementById('btn-send');
    return typing && typing.style.display === 'none' && sendBtn && !sendBtn.disabled;
  }, { timeout: 90000 });
  await sleep(500);

  await page.screenshot({ path: `${OUTPUT_DIR}/${filename}`, fullPage: true });
  console.log(`Done: ${filename}`);
}
