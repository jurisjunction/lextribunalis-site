// Takes a picture of every page of the built site, at desktop and telephone
// width, for reading them over before publishing:
//
//   python3 -m http.server 8131 --directory docs
//   NODE_PATH=<the application>/node_modules node _src/review.cjs http://localhost:8131 <folder>

const { chromium } = require("@playwright/test");

const [base, out] = process.argv.slice(2);
const pages = { home: "/", "what-it-does": "/what-it-does/", "yours-to-change": "/yours-to-change/", planned: "/planned/", "for-it": "/for-it/", about: "/about/", contact: "/contact/" };
const widths = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 800 } };

(async () => {
  const browser = await chromium.launch();
  for (const [size, viewport] of Object.entries(widths)) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const [name, path] of Object.entries(pages)) {
      await page.goto(base + path);
      await page.evaluate(async () => {
        document.querySelectorAll("img[loading=lazy]").forEach((img) => (img.loading = "eager"));
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
      });
      await page.screenshot({ path: `${out}/${name}-${size}.png`, fullPage: true });
      if (size === "desktop" && name === "home") await page.screenshot({ path: `${out}/home-first-screen.png` });
      const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (wide) console.log(`${name} at ${size} width scrolls sideways`);
    }
    await context.close();
  }
  await browser.close();
})();
