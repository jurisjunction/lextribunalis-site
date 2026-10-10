// A reader with no opinions: opens every page of the built site at desktop
// and telephone width and reports what can be measured. Accessibility faults
// (axe-core, WCAG 2 A and AA), anything that scrolls sideways, errors in the
// console, requests that fail, links that lead nowhere, and how heavy each
// page is.
//
//   python3 -m http.server 8131 --directory docs
//   NODE_PATH=<the application>/node_modules node _src/audit.cjs http://localhost:8131

const { chromium } = require("@playwright/test");
const fs = require("node:fs");

const base = process.argv[2];
const axe = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const pages = ["/", "/what-it-does/", "/yours-to-change/", "/planned/", "/for-it/", "/about/", "/contact/", "/thanks/", "/404.html"];
const widths = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 800 } };

(async () => {
  const browser = await chromium.launch();
  const links = new Map();
  let faults = 0;
  for (const [size, viewport] of Object.entries(widths)) {
    const context = await browser.newContext({ viewport });
    for (const path of pages) {
      const page = await context.newPage();
      const said = [];
      let bytes = 0;
      page.on("console", (message) => message.type() === "error" && said.push(`console: ${message.text()}`));
      page.on("requestfailed", (request) => said.push(`failed: ${request.url()}`));
      page.on("response", async (response) => {
        if (response.status() >= 400 && !(path === "/404.html")) said.push(`${response.status()}: ${response.url()}`);
        bytes += Number(response.headers()["content-length"] || 0);
      });
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.querySelectorAll("img[loading=lazy]").forEach((img) => (img.loading = "eager")));
      await page.waitForLoadState("networkidle");
      await page.addScriptTag({ content: axe });
      const result = await page.evaluate(() => window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] }));
      for (const violation of result.violations) {
        said.push(`axe ${violation.impact}: ${violation.id} (${violation.nodes.length}) ${violation.help}; e.g. ${violation.nodes[0].target.join(" ")}`);
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) said.push("the page scrolls sideways");
      const small = await page.evaluate(() => [...document.querySelectorAll("main a, main button, nav a")].filter((el) => { const r = el.getBoundingClientRect(); return r.height > 0 && r.height < 24 && getComputedStyle(el).display !== "inline"; }).length);
      if (small && size === "phone") said.push(`${small} links or buttons under 24px tall`);
      for (const href of await page.evaluate(() => [...document.querySelectorAll("a[href], form[action]")].map((el) => el.href || el.action))) links.set(href, path);
      console.log(`${size.padEnd(7)} ${path.padEnd(18)} ${String(Math.round(bytes / 1024)).padStart(5)} KB  ${said.length ? "" : "nothing found"}`);
      for (const line of said) console.log(`          ${line}`);
      faults += said.length;
      await page.close();
    }
    await context.close();
  }
  // Every address any page points at, asked for once.
  const context = await browser.newContext();
  for (const [href, from] of links) {
    if (href.startsWith("mailto:")) continue;
    const local = href.replace("https://lextribunalis.com", base);
    try {
      const response = await context.request.get(local.split("#")[0], { timeout: 20000, maxRedirects: 5 });
      const anchor = local.includes("#") ? local.split("#")[1] : null;
      if (response.status() >= 400 && !href.includes("formsubmit.co")) { console.log(`link ${response.status()}: ${href} (on ${from})`); faults += 1; }
      else if (anchor && !(await response.text()).includes(`id="${anchor}"`)) { console.log(`link to a missing place #${anchor}: ${href} (on ${from})`); faults += 1; }
    } catch (error) {
      console.log(`link unreachable: ${href} (on ${from})`); faults += 1;
    }
  }
  console.log(`\n${links.size} distinct links checked. ${faults} things found.`);
  await browser.close();
})();
