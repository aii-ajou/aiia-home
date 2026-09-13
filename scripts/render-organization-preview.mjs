import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
const output = resolve(process.argv[2] || ".aiia/organization-review.png");
const port = process.env.AIIA_REVIEW_PORT || "4346";
const server = spawn(process.execPath, ["scripts/serve-built.mjs"], {
  env: { ...process.env, AIIA_TEST_PORT: port, AIIA_TEST_BASE_PATH: "" },
  stdio: "pipe",
});
let browser;
try {
  let ready = false;
  for (let tries = 0; tries < 100; tries++) {
    if (server.exitCode !== null)
      throw new Error("검토용 서버를 시작하지 못했습니다.");
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await setTimeout(100);
  }
  if (!ready) throw new Error("검토용 서버 응답 시간이 초과됐습니다.");
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    deviceScaleFactor: 2,
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "header.gnb, .skip-link { visibility: hidden !important; }",
  });
  const original = await page
    .locator(".chart-scroll")
    .evaluate((element) => Number(element.dataset.width));
  // Capture every node at original size even when the diagram is wider than the page.
  await page.setViewportSize({
    width: Math.max(1440, original + 160),
    height: 1000,
  });
  await page.addStyleTag({
    content: `#organization { width:${original + 80}px; max-width:none; }`,
  });
  await page.locator(".chart-scroll").scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      document.querySelector(".chart-scroll")?.getAttribute("data-scale") ===
      "1",
  );
  await mkdir(dirname(output), { recursive: true });
  await page
    .locator(".org-chart")
    .screenshot({ path: output, animations: "disabled" });
  console.log(`조직도 검토 그림 생성: ${output}`);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
