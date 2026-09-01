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
  
  // 1. Zoom to Lewiston, ID (lat: 46.4165, lng: -117.0177) at Zoom 9
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([46.4165, -117.0177], 9);
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view_lewiston_id_z9.png') });
  
  // 2. Zoom closer to Lewiston, ID & Clarkston, WA at Zoom 11
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([46.4165, -117.0177], 11);
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view_lewiston_id_z11.png') });

  console.log('Lewiston ID verification screenshots saved!');
  await browser.close();
})();
