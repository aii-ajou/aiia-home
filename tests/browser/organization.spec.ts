import { test, expect } from "@playwright/test";
import fs from "node:fs";
import YAML from "yaml";
import { layoutOrganization } from "../../src/lib/content/organization";
import type { OrgNodeView } from "../../src/lib/content/queries";

const data = JSON.parse(
  fs.readFileSync("src/content/organization.json", "utf8"),
);
const nodes = (data.nodes || []).filter(
  (node: { visible?: boolean }) => node.visible !== false,
);
const base = process.env.AIIA_TEST_BASE_PATH || "";
const node = (
  relation: OrgNodeView["relation"],
  name = "조직",
): OrgNodeView => ({
  relation,
  name,
  description: "설명",
  leader: "",
  photo: "",
  detailUrl: "",
});

test("organization layout handles empty, mixed and large lists without overlapping boxes", () => {
  for (const items of [
    [],
    [node("d")],
    [
      node("h"),
      node("h"),
      ...Array.from({ length: 7 }, () => node("p")),
      node("s"),
      node("c"),
      node("c"),
      node("i"),
    ],
    Array.from({ length: 18 }, (_, i) =>
      node(
        i % 2 ? "d" : "i",
        "아주 긴 이름의 다학제 공동연구 및 기업 브랜드 협력센터",
      ),
    ),
  ]) {
    const chart = layoutOrganization(items);
    expect(chart.boxes).toHaveLength(items.length);
    const boxes = [...chart.boxes, chart.root];
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.x + a.width).toBeLessThanOrEqual(chart.width);
      expect(a.y + a.height).toBeLessThanOrEqual(chart.height);
      for (const b of boxes.slice(i + 1))
        expect(
          a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
        ).toBe(false);
    }
  }
});

test("CMS distinguishes research fields from actual organizations and offers six relations", () => {
  const config = YAML.parse(fs.readFileSync("cms/pages.yml", "utf8"));
  expect(
    config.content.find((item: { name: string }) => item.name === "centers")
      .label,
  ).toBe("연구 분야");
  const fields = config.content.find(
    (item: { name: string }) => item.name === "organization",
  ).fields;
  const list = fields.find((field: { name: string }) => field.name === "nodes");
  expect(
    list.fields
      .find((field: { name: string }) => field.name === "relation")
      .options.values.map((item: { name: string }) => item.name),
  ).toEqual(["h", "p", "c", "s", "d", "i"]);
  expect(
    list.fields.find((field: { name: string }) => field.name === "leader")
      .required,
  ).not.toBe(true);
  expect(
    fields.some((field: { name: string }) => field.name === "center_groups"),
  ).toBe(false);
});

for (const width of [390, 768, 1050, 1440, 1920])
  test(`organization preview remains readable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/`);
    await page.locator("#organization").scrollIntoViewIfNeeded();
    await expect(page.locator("#centers .center__index")).toHaveCount(0);
    const container = page.locator(".chart-canvas");
    await expect(container).toBeVisible();
    await expect(
      page.locator('.chart-canvas [data-relation="d"] .node-kind'),
    ).toHaveCount(0);
    await expect(page.locator(".mobile-chart")).toHaveCount(0);
    await expect(
      page
        .locator("#organization")
        .getByText("일반·도메인 센터", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".chart-scroll")).toHaveAttribute(
      "data-scale",
      /.+/,
    );
    const size = await page
      .locator(".chart-scroll")
      .evaluate((element: HTMLElement) => ({
        available: element.clientWidth,
        scroll: element.scrollWidth,
        original: Number(element.dataset.width),
        scale: Number(element.dataset.scale),
        rendered: element
          .querySelector(".chart-canvas")!
          .getBoundingClientRect().width,
        frameHeight: element
          .querySelector(".chart-frame")!
          .getBoundingClientRect().height,
        originalHeight: Number(element.dataset.height),
      }));
    expect(size.scale).toBeCloseTo(
      Math.max(0.8, Math.min(1, size.available / size.original)),
      3,
    );
    expect(size.rendered).toBeCloseTo(size.original * size.scale, 1);
    expect(size.frameHeight).toBeCloseTo(size.originalHeight * size.scale, 1);
    if (size.available < size.original * 0.8) {
      expect(size.scroll).toBeGreaterThan(size.available);
      await expect(page.locator(".chart-scroll-hint")).toBeVisible();
    } else {
      expect(size.scroll).toBeLessThanOrEqual(size.available + 1);
      await expect(page.locator(".chart-scroll-hint")).toBeHidden();
    }
    for (const item of nodes)
      await expect(
        container.getByText(item.name, { exact: true }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    const centers = nodes.filter((item: { relation: string }) =>
      ["d", "i"].includes(item.relation),
    );
    await expect(page.locator("[data-center-name]")).toHaveCount(
      centers.length,
    );
    for (const item of centers) {
      const card = page.locator("[data-center-name]").filter({
        has: page.getByRole("heading", { name: item.name, exact: true }),
      });
      if (item.description) await expect(card).toContainText(item.description);
      if (!item.leader)
        await expect(card.locator(".org-leader")).toHaveCount(0);
    }
    if (width > 720) {
      const overflowing = await page
        .locator(".chart-node")
        .evaluateAll(
          (elements) =>
            elements.filter(
              (element) =>
                element.scrollHeight > element.clientHeight + 1 ||
                element.scrollWidth > element.clientWidth + 1,
            ).length,
        );
      expect(overflowing).toBe(0);
    }
  });

test("resizing clamps the chart and horizontal scrolling reaches both edges", async ({
  page,
}) => {
  await page.goto(`${base}/`);
  const region = page.locator(".chart-scroll");
  for (const width of [1920, 1050, 390, 320, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () =>
        region.evaluate((element: HTMLElement) => {
          const expected = Math.max(
            0.8,
            Math.min(1, element.clientWidth / Number(element.dataset.width)),
          );
          return Math.abs(Number(element.dataset.scale) - expected) < 0.001;
        }),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(region).toHaveAttribute("data-overflow", "true");
  await region.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  expect(
    await region.evaluate(
      (element) =>
        element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    ),
  ).toBe(true);
  await region.evaluate((element) => {
    element.scrollLeft = 0;
  });
  expect(await region.evaluate((element) => element.scrollLeft)).toBe(0);
});

test("organization is present without browser JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${base}/`);
  await expect(page.locator(".chart-canvas [data-relation]")).toHaveCount(
    nodes.length,
  );
  await expect(page.locator(".chart-canvas [data-org-root]")).toContainText(
    data.root_name || "AIIA",
  );
  await context.close();
});
