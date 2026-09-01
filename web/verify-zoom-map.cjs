const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Set view to zoom 6 around Great Lakes / Lake America / US States
  await page.evaluate(() => {
    if (window.__tempoMap) {
      window.__tempoMap.setView([42.5, -82.0], 6);
    }
  });
  
  await new Promise(r => setTimeout(r, 3500));
  
  const outPath = path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/zoom_lake_america.png');
  await page.screenshot({ path: outPath });
  console.log('Zoom screenshot saved to:', outPath);
  
  // Also capture default zoomed out world view
  await page.evaluate(() => {
    if (window.__tempoMap) {
      window.__tempoMap.setView([38.0, -95.0], 3);
    }
  });
  await new Promise(r => setTimeout(r, 3000));
  const outWorldPath = path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/world_view_light_blue.png');
  await page.screenshot({ path: outWorldPath });
  console.log('World screenshot saved to:', outWorldPath);

  await browser.close();
})();
