import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  cp,
  symlink,
} from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import YAML from "yaml";
import { reconcileMedia } from "../../cms/reconcile-media.mjs";
import { prepareContent } from "../../scripts/lib/content.mjs";

const day = 86400000;
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), "aiia-media-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function put(path, data) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(
      join(root, path),
      typeof data === "object" ? JSON.stringify(data) : data,
    );
  }
  const get = (path) => readFile(join(root, path), "utf8");
  return { root, put, get };
}

test("migration rewrites every shared reference, including drafts, archived entries and body links", async (t) => {
  const { root, put, get } = await workspace(t);
  await put("content/members/a.json", {
    photo: "/uploads/old.png",
    status: "draft",
  });
  await put("content/news/a.json", {
    thumbnail: "/uploads/old.png",
    status: "archived",
    body: "[file](/uploads/report.pdf#page=2)",
  });
  await put("uploads/old.png", "photo");
  await put("uploads/report.pdf", "document");
  const plan = await reconcileMedia({ root });
  assert.equal(plan.moves.length, 2);
  assert.equal(await get("uploads/old.png"), "photo"); // default is read-only
  await reconcileMedia({ root, apply: true });
  assert.equal(await get("uploads/members/old.png"), "photo");
  assert.match(await get("content/news/a.json"), /\/uploads\/members\/old.png/);
  assert.match(
    await get("content/news/a.json"),
    /\/uploads\/documents\/report.pdf#page=2/,
  );
  assert.deepEqual((await reconcileMedia({ root })).moves, []);
});

test("unused uploads have a full grace period; newly used or replaced bytes reset eligibility", async (t) => {
  const { root, put, get } = await workspace(t);
  await put("content/hero.json", {});
  await put("uploads/images/new.jpg", "first");
  assert.equal(
    (await reconcileMedia({ root, now: 0, apply: true })).pending,
    1,
  );
  assert.equal((await reconcileMedia({ root, now: day - 1 })).moves.length, 0);
  await put("uploads/images/new.jpg", "second");
  assert.equal(
    (await reconcileMedia({ root, now: day, apply: true })).moves.length,
    0,
  );
  await put("content/hero.json", { visual_image: "/uploads/images/new.jpg" });
  assert.equal(
    (await reconcileMedia({ root, now: 2 * day, apply: true })).pending,
    0,
  );
  await put("content/hero.json", {});
  assert.equal(
    (await reconcileMedia({ root, now: 3 * day, apply: true })).moves.length,
    0,
  );
  assert.equal(
    (await reconcileMedia({ root, now: 4 * day, apply: true })).moves.length,
    1,
  );
  assert.equal(await get("media-archive/images/images/new.jpg"), "second");
  assert.equal((await reconcileMedia({ root, now: 6 * day })).moves.length, 0);
});

test("initial archive preserves duplicates and same-name files without overwriting", async (t) => {
  const { root, put, get } = await workspace(t);
  await put("content/hero.json", {});
  await put("uploads/a.png", "duplicate");
  await put("uploads/b.png", "duplicate");
  await put("media-archive/images/a.png", "previous");
  await put("uploads/documents/a.pdf", "attachment");
  const result = await reconcileMedia({ root, archiveNow: true, apply: true });
  assert.equal(result.moves.length, 3);
  assert.equal(await get("media-archive/images/a.png"), "previous");
  assert.equal(await get("media-archive/images/a-1.png"), "duplicate");
  assert.equal(await get("media-archive/images/b.png"), "duplicate");
  assert.equal(
    await get("media-archive/documents/documents/a.pdf"),
    "attachment",
  );
});

test("restoring a referenced archive file updates its link and handles destination collisions", async (t) => {
  const { root, put, get } = await workspace(t);
  await put("content/members/a.json", { photo: "/media-archive/images/a.png" });
  await put("uploads/members/a.png", "existing");
  await put("media-archive/images/a.png", "restored");
  await reconcileMedia({ root, apply: true });
  assert.equal(await get("uploads/members/a-1.png"), "restored");
  assert.match(
    await get("content/members/a.json"),
    /\/uploads\/members\/a-1.png/,
  );
  assert.equal(await get("uploads/members/a.png"), "existing");
});

test("missing references and symlinks fail before media changes", async (t) => {
  const { root, put, get } = await workspace(t);
  await put("content/hero.json", { visual_image: "/uploads/missing.jpg" });
  await put("uploads/keep.jpg", "keep");
  await assert.rejects(
    reconcileMedia({ root, apply: true, archiveNow: true }),
    /Missing media/,
  );
  assert.equal(await get("uploads/keep.jpg"), "keep");
  await put("content/hero.json", {});
  await symlink(join(root, "content/hero.json"), join(root, "uploads/link"));
  await assert.rejects(
    reconcileMedia({ root, apply: true }),
    /Unsupported file/,
  );
});

test("encoded filenames keep valid body links and external URLs stay external", async (t) => {
  const { root, put, get } = await workspace(t);
  await put("uploads/한 글.jpg", "photo");
  const encoded = encodeURI("/uploads/한 글.jpg");
  await put("content/news/a.json", {
    thumbnail: encoded,
    body: `[photo](${encoded}?v=1) https://example.org/uploads/missing.jpg`,
  });
  await reconcileMedia({ root, apply: true });
  const data = JSON.parse(await get("content/news/a.json"));
  assert.equal(data.thumbnail, encodeURI("/uploads/news/한 글.jpg"));
  assert.equal(
    data.body,
    `[photo](${data.thumbnail}?v=1) https://example.org/uploads/missing.jpg`,
  );
  assert.equal((await reconcileMedia({ root })).moves.length, 0);
});

test("archives stay outside public build assets", async (t) => {
  const { root, put, get } = await workspace(t);
  await cp("fixtures", join(root, "source"), { recursive: true });
  await cp("content-source.json", join(root, "content-source.json"));
  await put("source/media-archive/images/unused.jpg", "private archived photo");
  await prepareContent({ root, source: "source" });
  await assert.rejects(get("public/media-archive/images/unused.jpg"), {
    code: "ENOENT",
  });
  await assert.rejects(get("public/uploads/unused.jpg"), { code: "ENOENT" });
});

test("CMS uses disjoint storage roots and content fields select the matching media library", async () => {
  const config = YAML.parse(await readFile("cms/pages.yml", "utf8"));
  const roots = config.media.map((item) => item.input);
  for (const a of roots)
    for (const b of roots)
      if (a !== b) assert.equal(a.startsWith(b + "/"), false);
  for (const [collection, field, name, input] of [
    ["members", "photo", "member_images", "uploads/members"],
    ["news", "thumbnail", "news_images", "uploads/news"],
    ["news", "attachment", "documents", "uploads/documents"],
  ]) {
    assert.equal(
      config.content
        .find((item) => item.name === collection)
        .fields.find((item) => item.name === field).options.media,
      name,
    );
    assert.equal(config.media.find((item) => item.name === name).input, input);
  }
  const workflow = YAML.parse(await readFile("cms/publish-site.yml", "utf8"));
  assert.ok(workflow.on.schedule.length);
  assert.equal(workflow.concurrency["cancel-in-progress"], false);
});
