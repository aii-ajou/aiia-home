import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  cp,
  symlink,
  readFile,
  writeFile,
  readdir,
  mkdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import YAML from "yaml";
const exec = promisify(execFile);
const config = YAML.parse(await readFile("cms/pages.yml", "utf8"));

// Exercise the real Astro schemas and pages in a disposable project. Never
// modify a developer's selected content or the private content repository.
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), "aiia-cms-edit-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of [
    "src",
    "public",
    "scripts",
    "fixtures",
    "package.json",
    "astro.config.mjs",
    "tsconfig.json",
    "content-source.json",
  ])
    await cp(name, join(root, name), {
      recursive: true,
      filter: (path) => !["src/content", "public/uploads"].includes(path),
    });
  await symlink(resolve("node_modules"), join(root, "node_modules"), "dir");
  return root;
}

function edit(data, fields, scenario) {
  for (const field of fields) {
    if (field.type === "object") {
      if (scenario === "omitted" && field.list) data[field.name] = [];
      else
        for (const row of data[field.name] || [])
          edit(row, field.fields, scenario);
    } else if (!field.required) {
      if (scenario === "uploads" && field.type === "image")
        data[field.name] = "/uploads/cms-upload.svg";
      else if (scenario === "uploads" && field.type === "file")
        data[field.name] = "/uploads/documents/cms-file.pdf";
      else if (scenario === "omitted") delete data[field.name];
      else data[field.name] = null;
    }
  }
  return data;
}

for (const scenario of ["null", "omitted", "uploads"])
  test(`CMS edits build with ${scenario} optional fields, changed pages, new entries and removals`, async (t) => {
    const root = await workspace(t);
    const save = (path, data) => writeFile(path, JSON.stringify(data));
    const markers = [];
    for (const entry of config.content) {
      if (entry.type === "file") {
        const path = join(root, "fixtures", entry.path);
        const data = edit(
          JSON.parse(await readFile(path, "utf8")),
          entry.fields,
          scenario,
        );
        const title =
          entry.name === "site_settings"
            ? "site_title"
            : entry.name === "footer"
              ? "copyright"
              : "title";
        data[title] = `CMS-edit-${entry.name}`;
        markers.push(data[title]);
        await save(path, data);
      } else {
        const dir = join(root, "fixtures", entry.path);
        const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
        const template = JSON.parse(
          await readFile(join(dir, files[0]), "utf8"),
        );
        // New records contain CMS fields only, plus configured defaults.
        const added = Object.fromEntries(
          entry.fields
            .map((field) => [field.name, template[field.name] ?? field.default])
            .filter(([, value]) => value !== undefined),
        );
        edit(added, entry.fields, scenario);
        added.status = "published";
        const title = entry.view.primary;
        added[title] = `CMS-edit-${entry.name}`;
        await save(join(dir, "cms-added.json"), added);
        for (const file of files) {
          const path = join(dir, file);
          const data = edit(
            JSON.parse(await readFile(path, "utf8")),
            entry.fields,
            scenario,
          );
          data.status = "archived";
          await save(path, data);
        }
        if (files.length) await rm(join(dir, files[0]));
      }
    }
    await cp(
      join(root, "fixtures/uploads/sample.svg"),
      join(root, "fixtures/uploads/cms-upload.svg"),
    );
    await mkdir(join(root, "fixtures/uploads/documents"), { recursive: true });
    await writeFile(
      join(root, "fixtures/uploads/documents/cms-file.pdf"),
      "%PDF-1.4\n% CMS attachment fixture\n%%EOF\n",
    );
    const env = {
      ...process.env,
      AIIA_CONTENT_SOURCE: join(root, "fixtures"),
      AIIA_REQUIRE_CONTENT: "false",
      GITHUB_PAGES: "true",
    };
    try {
      await exec("npm", ["run", "build"], {
        cwd: root,
        env,
        maxBuffer: 2 * 1024 * 1024,
      });
      await exec(process.execPath, ["scripts/verify-built.mjs"], {
        cwd: root,
        env,
      });
    } catch (error) {
      assert.fail(
        `${scenario}: ${error.stdout || ""}\n${error.stderr || error.message}`,
      );
    }
    const home = await readFile(join(root, "dist/index.html"), "utf8");
    for (const marker of markers)
      assert.ok(home.includes(marker), `Missing edited text: ${marker}`);
    for (const name of ["centers", "nav_items"])
      assert.ok(home.includes(`CMS-edit-${name}`));
    const news = await readFile(
      join(root, "dist/news/cms-added/index.html"),
      "utf8",
    );
    assert.ok(news.includes("CMS-edit-news"));
    assert.ok(
      (
        await readFile(join(root, "dist/members/cms-added/index.html"), "utf8")
      ).includes("CMS-edit-members"),
    );
    if (scenario === "uploads") {
      assert.ok(home.includes("/aiia-home/uploads/cms-upload.svg"));
      assert.ok(news.includes("/aiia-home/uploads/documents/cms-file.pdf"));
    } else assert.ok(!news.includes("첨부파일 내려받기"));
  });
