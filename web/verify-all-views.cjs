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
  
  // 1. World View (Zoom 3)
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([38.0, -95.0], 3);
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view1_world.png') });
  
  // 2. State & Province View (Zoom 5)
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([38.5, -96.0], 5);
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view2_states.png') });
  
  // 3. Regional Cities View (Zoom 7)
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([41.5, -76.0], 7);
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view3_cities.png') });
  
  // 4. Local Towns & Cities (Zoom 8) around New York / New England
  await page.evaluate(() => {
    if (window.__tempoMap) window.__tempoMap.setView([42.2, -73.5], 8);
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/view4_deep_cities.png') });

  console.log('All 4 verification screenshots saved successfully!');
  await browser.close();
})();
