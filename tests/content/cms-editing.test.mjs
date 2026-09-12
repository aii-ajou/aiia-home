import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
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
    const created = new Map();
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
            .map((field) => [
              field.name,
              field.type === "uuid"
                ? randomUUID()
                : (template[field.name] ?? field.default),
            ])
            .filter(([, value]) => value !== undefined),
        );
        edit(added, entry.fields, scenario);
        added.status = "published";
        const title = entry.view.primary;
        added[title] = "한글이름";
        const filenames = [];
        // Identical Korean names must produce distinct, valid JSON filenames.
        for (let i = 0; i < 2; i++) {
          added.entry_id = randomUUID();
          const filename = entry.filename.template.replace(
            "{fields.entry_id}",
            added.entry_id,
          );
          assert.match(filename, /^[a-z]+-[0-9a-f-]+\.json$/);
          filenames.push(filename);
          await save(join(dir, filename), added);
        }
        assert.notEqual(filenames[0], filenames[1]);
        created.set(
          entry.name,
          filenames.map((f) => f.slice(0, -5)),
        );
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
    assert.ok(home.includes("한글이름"));
    const news = await readFile(
      join(root, "dist/news", created.get("news")[0], "index.html"),
      "utf8",
    );
    for (const name of ["members", "news"])
      for (const slug of created.get(name))
        assert.ok(
          (
            await readFile(join(root, "dist", name, slug, "index.html"), "utf8")
          ).includes("한글이름"),
        );
    if (scenario === "uploads") {
      assert.ok(home.includes("/aiia-home/uploads/cms-upload.svg"));
      assert.ok(news.includes("/aiia-home/uploads/documents/cms-file.pdf"));
    } else assert.ok(!news.includes("첨부파일 내려받기"));
  });
