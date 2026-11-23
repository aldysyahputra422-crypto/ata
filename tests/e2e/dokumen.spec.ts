import { expect, test } from "@playwright/test";

// The attributes each prototype page type needs on <html>/<body> are in the server HTML, not added by a script
// before hydration (React reports a <body> class that differs from the server markup).
const tagBadan = (html: string) => html.match(/<body[^>]*>/)?.[0];
const tagHtml = (html: string) => html.match(/<html[^>]*>/)?.[0];

for (const path of ["/hari-ini", "/lomba"]) {
  test(`app shell ${path}: body class comes from the server`, async ({ request, page }) => {
    const html = await (await request.get(path)).text();
    expect(tagBadan(html)).toBe('<body class="badan-aplikasi">');
    expect(tagHtml(html)).not.toContain("data-embed");
    expect(html).not.toContain("classList.add('badan-aplikasi')");

    const galat: string[] = [];
    page.on("pageerror", (e) => galat.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") galat.push(m.text()); });
    await page.goto(path);
    await expect(page.locator("body")).toHaveClass("badan-aplikasi");
    expect(galat).toEqual([]);
  });
}

for (const path of ["/", "/paket"]) {
  test(`screen frame ${path}: embed mode comes from the server, no shell body class`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    expect(tagBadan(html)).toBe("<body>");
    expect(tagHtml(html)).toContain('data-embed="1"');
  });
}

test("tabs inside the shell navigate without a page load; leaving the shell loads the other document", async ({ page }) => {
  await page.goto("/hari-ini");
  await page.evaluate(() => { (window as unknown as { tanda: number }).tanda = 1; });
  await page.locator('.tab[data-tab="lomba"]:visible').click();
  await page.waitForURL("**/lomba");
  expect(await page.evaluate(() => (window as unknown as { tanda?: number }).tanda)).toBe(1);
  await expect(page.locator("body")).toHaveClass("badan-aplikasi");

  await page.goto("/paket");
  await page.locator("#keMasuk").click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.locator("html")).toHaveAttribute("data-embed", "1");
  await expect(page.locator("body")).not.toHaveClass(/badan-aplikasi/);
});
