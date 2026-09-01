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
  
  // Double click near Lake America / New York / Ontario to zoom in
  await page.mouse.click(670, 370, { clickCount: 2 });
  await new Promise(r => setTimeout(r, 1500));
  await page.mouse.click(670, 370, { clickCount: 2 });
  await new Promise(r => setTimeout(r, 3000));
  
  const outPath = path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/zoom_test.png');
  await page.screenshot({ path: outPath });
  console.log('Zoom screenshot saved to:', outPath);
  await browser.close();
})();
