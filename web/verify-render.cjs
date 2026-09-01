const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  
  // Wait 3 seconds for all canvas tiles to render and paint
  await new Promise(r => setTimeout(r, 3000));
  
  const outPath = path.resolve('C:/Users/lucas/.gemini/antigravity-cli/brain/eda5e845-0bc3-49ce-b350-8f30ad8953e7/scratch/live_render_verification.png');
  await page.screenshot({ path: outPath });
  console.log('Screenshot saved to:', outPath);
  
  await browser.close();
})();
