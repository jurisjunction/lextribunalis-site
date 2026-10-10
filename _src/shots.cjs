// Takes the pictures of the application that the site shows.
//
// They are taken from the application itself, running with its invented
// demonstration data (the Diocese of Torhaven) on a database kept apart from
// any other, signed in as its notary with the second factor off:
//
//   DEMO_EMAIL=... DEMO_PASSWORD=... NODE_PATH=<the application>/node_modules \\
//     node _src/shots.cjs http://localhost:3212 docs/assets/img
//
// DEMO_EMAIL and DEMO_PASSWORD are the demonstration's one account.
//
// Never point this at a tribunal's own records.

const { chromium } = require("@playwright/test");

const [base, out] = process.argv.slice(2);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: base, viewport: { width: 1120, height: 720 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(process.env.DEMO_EMAIL);
  await page.getByLabel("Password").fill(process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/cases");

  // The demonstration pins its date so that the time limits always look the
  // same, and says so beside it. That note means nothing to a visitor.
  const shoot = async (name, clip) => {
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      // Likewise the record of changes, taken on this machine today, would show
      // this machine's own address and today's date beside a docket dated the 23rd.
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        node.nodeValue = node.nodeValue
          .replace(" (pinned)", "")
          .replace(/^::1$/, "10.20.4.17")
          .replace(/^[A-Z][a-z]{2} \d{1,2}, 2026, \d{1,2}:(\d\d:\d\d) [ap]\.m\.$/, "Oct 23, 2026, 10:$1 a.m.");
      }
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: `${out}/${name}.png`, clip });
  };

  // A correction to one person's details, so that the record of changes has one to show.
  await page.goto("/people?q=tighe");
  await page.getByRole("link", { name: /Leonard Francis Tighe/ }).first().click();
  await page.getByRole("link", { name: "Edit" }).click();
  // Run a second time, it changes the city back, so that there is always a change to show.
  const city = page.getByLabel("City");
  await city.fill((await city.inputValue()) === "Ashby Cross" ? "Dunmere" : "Ashby Cross");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("heading", { name: /Leonard Francis Tighe/ }).waitFor();

  // Tall enough for the whole docket.
  await page.setViewportSize({ width: 1120, height: 850 });
  await page.goto("/cases");
  await shoot("docket");
  await page.setViewportSize({ width: 1120, height: 720 });
  await page.goto("/today");
  await shoot("today");
  await page.goto("/templates");
  await shoot("templates");
  await page.goto("/statistics");
  await shoot("report");

  await page.goto("/cases");
  await page.getByText("Lindqvist – Harwell").first().click();
  await page.waitForURL(/\/cases\/c[^/]+$/);
  const file = new URL(page.url()).pathname;
  await page.goto(`${file}/procedure`);
  await shoot("procedure");
  await page.goto(`${file}/acts`);
  await shoot("acts");
  await page.goto(`${file}/chronology`);
  // The chronology alone, without the panel beside it that runs the assistant.
  await page.setViewportSize({ width: 1120, height: 900 });
  await shoot("chronology", { x: 0, y: 188, width: 790, height: 700 });
  await page.setViewportSize({ width: 1120, height: 720 });

  await page.goto("/audit");
  await page.locator("tr", { hasText: "Changed the details of Leonard Francis Tighe" }).first().getByText("What it was, and what it became").click();
  await shoot("record");

  await browser.close();
})();
