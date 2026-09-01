const puppeteer = require('C:/Users/lucas/tempo/web/node_modules/puppeteer');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode < 500) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.abort());
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

(async () => {
  console.log('--- Starting Trace Context Flyout Verification ---');
  let apiProc = null;
  let viteProc = null;
  let browser = null;

  try {
    // 1. Launch Go API server on :8080
    console.log('Starting Go API backend...');
    apiProc = spawn('go', ['run', './cmd/server/main.go'], {
      cwd: path.resolve(__dirname, '../api'),
      stdio: 'pipe',
      shell: true,
    });
    apiProc.stderr.on('data', (d) => console.log('[API ERR]', d.toString().trim()));

    await waitForServer('http://localhost:8080/healthz');
    console.log('Go API is ready at http://localhost:8080/healthz');

    // 2. Launch Vite dev server on :5173
    console.log('Starting Vite frontend dev server...');
    viteProc = spawn('npm.cmd', ['run', 'dev', '--', '--port', '5173', '--host'], {
      cwd: __dirname,
      stdio: 'pipe',
      shell: true,
    });
    viteProc.stderr.on('data', (d) => console.log('[VITE ERR]', d.toString().trim()));

    await waitForServer('http://localhost:5173');
    console.log('Vite server is ready at http://localhost:5173');

    // 3. Launch Puppeteer Browser
    console.log('Launching headless browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 860 });

    console.log('Navigating to Tempo web app...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // Wait for markers to render
    console.log('Waiting for single marker badge with "1"...');
    await page.waitForSelector('.marker-single-badge', { timeout: 10000 });

    const singleMarkers = await page.$$('.marker-single-badge');
    console.log(`Found ${singleMarkers.length} single marker badge(s)`);

    if (singleMarkers.length === 0) {
      throw new Error('No single marker badges ("1") found on map');
    }

    // 4. Click the first single marker badge ("1")
    console.log('Clicking single marker badge ("1")...');
    await singleMarkers[0].click();

    // 5. Verify Flyout panel emergence
    console.log('Waiting for .trace-flyout-container...');
    await page.waitForSelector('.trace-flyout-container', { timeout: 5000 });

    // Verify Tier 1 Headline, Tier 2 Subheading, Tier 3 Meta Row
    const title = await page.$eval('.trace-tier1-title', (el) => el.textContent?.trim());
    const subheading = await page.$eval('.trace-tier2-subheading', (el) => el.textContent?.trim());
    const metaText = await page.$eval('.trace-tier3-meta-row', (el) => el.textContent?.trim());
    const privacy = await page.$eval('.trace-privacy-badge', (el) => el.textContent?.trim());

    console.log('Verified Flyout Header:');
    console.log(' - Tier 1 Title:', title);
    console.log(' - Tier 2 Subheading:', subheading);
    console.log(' - Tier 3 Meta Row:', metaText);
    console.log(' - Privacy Badge:', privacy);

    if (!title) throw new Error('Tier 1 Title is missing or empty');
    if (!subheading) throw new Error('Tier 2 Subheading is missing or empty');
    if (!metaText) throw new Error('Tier 3 Meta Row is missing or empty');

    // Verify Feed Items
    const feedItems = await page.$$('.trace-feed-item');
    console.log(`Verified ${feedItems.length} feed item(s) rendered in chronological feed.`);
    if (feedItems.length === 0) throw new Error('Feed items are missing in flyout');

    // Verify Audio Waveform Player
    const waveformBars = await page.$$('.trace-waveform-bar');
    console.log(`Verified Audio Player with ${waveformBars.length} waveform bars.`);

    const playBtn = await page.$('.trace-audio-play-btn');
    if (playBtn) {
      console.log('Clicking audio play button...');
      await playBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      console.log('Audio playback simulation active.');
    }

    // Capture screenshot artifact
    const screenshotPath = 'C:/Users/lucas/.gemini/antigravity-cli/brain/7dfbb994-d847-41dc-b496-541882a1c1ff/scratch/verify_flyout.png';
    await page.screenshot({ path: screenshotPath });
    console.log('Captured verification screenshot to:', screenshotPath);

    // 6. Test Close / Dismiss interaction
    const closeBtn = await page.$('.trace-close-btn');
    if (closeBtn) {
      console.log('Testing close button ✕...');
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      const closedFlyout = await page.$('.trace-flyout-container');
      if (closedFlyout !== null) {
        throw new Error('Flyout failed to dismiss on close button click');
      }
      console.log('Flyout successfully dismissed!');
    }

    console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (viteProc) {
      try { process.kill(viteProc.pid); } catch {}
    }
    if (apiProc) {
      try { process.kill(apiProc.pid); } catch {}
    }
    process.exit(process.exitCode || 0);
  }
})();
