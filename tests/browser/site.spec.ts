import { test, expect } from "@playwright/test";
import fs from "node:fs";
import YAML from "yaml";
import { emailHref, emailParts } from "../../src/lib/email";
const prefix =
  process.env.AIIA_TEST_BASE_PATH ||
  new URL(
    process.env.AIIA_TEST_URL || "http://localhost:4321",
  ).pathname.replace(/\/$/, "");
const url = (path: string) => `${prefix}/${path}`;
const published = (collection: string) =>
  fs
    .readdirSync(`src/content/${collection}`)
    .map((f) => ({
      slug: f.replace(/\.json$/, ""),
      ...JSON.parse(fs.readFileSync(`src/content/${collection}/${f}`, "utf8")),
    }))
    .filter((d) => d.status === "published")
    .sort((a, b) => a.sort - b.sort);
const members = published("members");
const news = published("news");
const featured = [...members]
  .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
  .slice(0, 5);

test("email links normalize addresses and preserve contact text", () => {
  expect(emailHref("  MAILTO:person@example.org  ")).toBe(
    "mailto:person@example.org",
  );
  const link = new URL(
    emailHref("person+ai#team@example.org", "[AIIA 협력 문의]"),
  );
  expect(decodeURIComponent(link.pathname)).toBe("person+ai#team@example.org");
  expect(link.searchParams.get("subject")).toBe("[AIIA 협력 문의]");
  expect(link.hash).toBe("");
  expect(
    emailParts(
      "주소 안내\n메일: person@example.org. 또는 mailto:team+ai@example.org",
    ),
  ).toEqual([
    "주소 안내\n메일: ",
    "person@example.org",
    ". 또는 ",
    "mailto:team+ai@example.org",
    "",
  ]);
});

test("visible contact addresses link to email composers", async ({ page }) => {
  await page.goto(url(""));
  const settings = JSON.parse(
    fs.readFileSync("src/content/site_settings.json", "utf8"),
  );
  const direct = page.locator("#inquiry .inquiry__actions > p a");
  await expect(direct).toHaveAttribute(
    "href",
    emailHref(settings.contact_email),
  );
  const button = page.locator("#inquiry a.btn");
  const destination = new URL((await button.getAttribute("href"))!);
  expect(destination.protocol).toBe("mailto:");
  expect(destination.searchParams.get("subject")).toBe("[AIIA 협력 문의]");
  for (const [selector, text] of [
    [
      "#contact",
      JSON.parse(fs.readFileSync("src/content/contact.json", "utf8"))
        .items.map((item: any) => item.value)
        .join("\n"),
    ],
    [
      ".footer__address",
      JSON.parse(fs.readFileSync("src/content/footer.json", "utf8"))
        .address_html,
    ],
  ]) {
    for (const address of emailParts(text).filter((_, i) => i % 2))
      await expect(
        page
          .locator(selector)
          .locator(`a[href="${emailHref(address)}"]`)
          .first(),
      ).toBeAttached();
  }
  // Inspect activation without launching an OS application or sending mail.
  await page.evaluate(() =>
    document.addEventListener("click", (event) => {
      const anchor = (event.target as Element).closest('a[href^="mailto:"]');
      if (anchor) {
        event.preventDefault();
        document.body.dataset.emailDestination = anchor.getAttribute("href")!;
      }
    }),
  );
  await direct.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-email-destination",
    emailHref(settings.contact_email),
  );
});

test("home limits content and links to complete directories", async ({
  page,
}) => {
  await page.goto(url(""));
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("#members .member-card")).toHaveCount(
    Math.min(5, members.length),
  );
  await expect(page.locator("#news .news-card")).toHaveCount(
    Math.min(3, news.length),
  );
  await page.getByRole("link", { name: "연구자 전체 보기" }).click();
  await expect(page).toHaveURL(/members\//);
  await expect(page.locator("[data-entry]:visible")).toHaveCount(
    Math.min(10, members.length),
  );
  await expect(page.locator("[data-result-count]")).toContainText(
    String(members.length),
  );
  const pages = Math.ceil(members.length / 10);
  for (let i = 2; i <= pages; i++) {
    await page.locator("[data-next]").click();
    await expect(page.locator("[data-page]")).toHaveText(`${i} / ${pages}`);
    await expect(page.locator("[data-entry]:visible")).toHaveCount(
      Math.min(10, members.length - (i - 1) * 10),
    );
  }
  if (pages > 1) await expect(page.locator("[data-next]")).toBeDisabled();
  const target = members.find((m) => m.email);
  if (!target) return;
  await page.getByRole("searchbox").fill(target.name);
  await expect(page.locator("[data-pagination]")).toBeHidden();
  await page
    .locator(`[data-entry] a[href="${url(`members/${target.slug}/`)}"]`)
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    target.name,
  );
  await expect(page.getByRole("link", { name: "이메일 문의" })).toHaveAttribute(
    "href",
    `mailto:${target.email}`,
  );
});
test("search combines affiliation and handles empty results and query links", async ({
  page,
}) => {
  test.skip(!members.length, "No published researchers");
  const target = members[0];
  await page.goto(url(`members/?q=${encodeURIComponent(target.name)}`));
  await expect(page.getByRole("searchbox")).toHaveValue(target.name);
  await expect(page.locator("[data-entry]:visible")).not.toHaveCount(0);
  await page.getByRole("combobox").selectOption(target.role);
  for (const e of await page.locator("[data-entry]:visible").all())
    await expect(e).toHaveAttribute("data-category", target.role);
  await page.getByRole("searchbox").fill("없는교수님xyz");
  await expect(page.locator("[data-empty]")).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await page.getByRole("combobox").selectOption("");
  await expect(page.locator("[data-entry]:visible")).toHaveCount(
    Math.min(10, members.length),
  );
});
test("news category and original source link work", async ({ page }) => {
  const target = news.find((n) => n.source_url);
  test.skip(!target, "No published external news");
  await page.goto(url("news/"));
  await page.getByRole("searchbox").fill(target.title);
  await page.getByRole("combobox").selectOption(target.category);
  await expect(page.locator("[data-entry]:visible")).toHaveCount(1);
  await page.locator("[data-entry]:visible a").click();
  const link = page.getByRole("link", { name: "원문 읽기" });
  await expect(link).toHaveAttribute("href", target.source_url);
  await expect(link).toHaveAttribute("target", "_blank");
  await page.getByRole("link", { name: "소식 목록" }).click();
  await expect(page).toHaveURL(/news\/$/);
});
test("research disclosure, saved theme and image fallbacks work", async ({
  page,
}) => {
  // CMS uploads and external photos need not live in /uploads/members/.
  // Simulate image failures by request type, independent of storage paths.
  await page.route("**/*", (route) =>
    route.request().resourceType() === "image"
      ? route.abort()
      : route.continue(),
  );
  await page.goto(url(""));
  if (await page.locator("#centers summary").count()) {
    await page.locator("#centers summary").first().click();
    await expect(page.locator("#centers details").first()).toHaveAttribute(
      "open",
      "",
    );
  }
  await page.locator("#members").scrollIntoViewIfNeeded();
  await expect(page.locator("#members .image-unavailable")).toHaveCount(
    featured.length,
  );
  await page.getByRole("button", { name: "어두운 화면으로 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test.describe("partnership descriptions", () => {
  test.use({ javaScriptEnabled: false });
  for (const width of [390, 1440])
    test(`editable descriptions open with pointer and keyboard at ${width}px`, async ({
      page,
    }) => {
      const inquiry = JSON.parse(
        fs.readFileSync("src/content/inquiry.json", "utf8"),
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url(""));
      const rows = page.locator("#inquiry li");
      await expect(rows).toHaveCount(inquiry.coop_modes.length);
      for (const [index, mode] of inquiry.coop_modes.entries()) {
        const row = rows.nth(index);
        await expect(row).toContainText(mode.mode);
        if (!mode.description?.trim()) {
          await expect(row.locator("summary")).toHaveCount(0);
          continue;
        }
        const summary = row.locator("summary");
        const description = row.locator(".inquiry__description");
        await expect(description).toBeHidden();
        await summary.locator(".inquiry__toggle").click();
        await expect(description).toBeVisible();
        await expect(description).toHaveText(mode.description);
        await summary.focus();
        await page.keyboard.press("Enter");
        await expect(description).toBeHidden();
        await page.keyboard.press("Space");
        await expect(description).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      await expect(
        page.locator('#inquiry a.btn[href^="mailto:"]'),
      ).toBeVisible();
    });
});
for (const width of [390, 768, 1440])
  test(`responsive pages at ${width}px have no overflow or broken local assets`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const failed: string[] = [];
    page.on("response", (r) => {
      if (
        r.status() >= 400 &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(r.url())
      )
        failed.push(r.url());
    });
    for (const path of ["", "members/", "news/", "admin/"]) {
      await page.goto(url(path));
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
    }
    expect(failed).toEqual([]);
    await page.goto(url(""));
    if (width < 1001) {
      await page.getByRole("button", { name: "메뉴 열기" }).click();
      await expect(page.locator("#mobile-nav")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#mobile-nav")).toBeHidden();
    }
  });
test("admin shortcuts, source fields and draft defaults are configured", async ({
  page,
}) => {
  await page.goto(url("admin/"));
  await expect(
    page.getByRole("link", { name: "새 소식 작성" }),
  ).toHaveAttribute(
    "href",
    /app.pagescms.org\/aii-ajou\/aiia-content\/main\/collection\/news\/new$/,
  );
  await expect(
    page.getByRole("link", { name: "첫 화면 바꾸기" }),
  ).toHaveAttribute("href", /\/file\/hero$/);
  const config = YAML.parse(fs.readFileSync("cms/pages.yml", "utf8"));
  const fields = config.content.find((c: any) => c.name === "news").fields;
  expect(fields.find((f: any) => f.name === "status").default).toBe("draft");
  expect(config.settings.content.merge).toBe(true);
  expect(fields.find((f: any) => f.name === "date").type).toBe("date");
  expect(fields.find((f: any) => f.name === "source_url")).toBeDefined();
});
test("all referenced local content images exist", async () => {
  for (const collection of ["members", "news"])
    for (const file of fs.readdirSync(`src/content/${collection}`)) {
      const data = JSON.parse(
        fs.readFileSync(`src/content/${collection}/${file}`, "utf8"),
      );
      for (const key of ["photo", "thumbnail"])
        if (data[key]?.startsWith("/"))
          expect(fs.existsSync(`public${data[key]}`)).toBe(true);
    }
});
test("home portraits load successfully when scrolled into view", async ({
  page,
}) => {
  await page.goto(url(""));
  await page.locator("#members").scrollIntoViewIfNeeded();
  const images = page.locator("#members img");
  await expect(images).toHaveCount(featured.filter((m) => m.photo).length);
  for (const img of await images.all()) {
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  }
});
