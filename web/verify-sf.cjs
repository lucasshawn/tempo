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
  
  // 1. Zoom to San Francisco (lat: 37.77, lng: -122.42) at Zoom 6
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([37.77, -122.42], 6);
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view_sf_z6.png') });
  
  // 2. Zoom to San Francisco Bay Area at Zoom 8
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([37.77, -122.42], 8);
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view_sf_z8.png') });

  // 3. Zoom closer into SF / Oakland / Berkeley at Zoom 10
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([37.77, -122.42], 10);
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view_sf_z10.png') });

  console.log('San Francisco verification screenshots saved!');
  await browser.close();
})();
