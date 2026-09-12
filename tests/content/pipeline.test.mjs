import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  cp,
  readFile,
  writeFile,
  mkdir,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";
import { prepareContent, validateSource } from "../../scripts/lib/content.mjs";
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), "aiia-content-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp("fixtures", join(root, "fixtures"), { recursive: true });
  await cp("content-source.json", join(root, "content-source.json"));
  return root;
}
test("fresh clone builds with sample content; production refuses the same source", async (t) => {
  const root = await workspace(t);
  assert.equal((await prepareContent({ root })).sample, true);
  assert.match(
    await readFile(join(root, "src/content/site_settings.json"), "utf8"),
    /개발용 샘플/,
  );
  await assert.rejects(
    prepareContent({ root, production: true }),
    /샘플 콘텐츠/,
  );
});
test("switching sources removes stale content and photos without changing the originals", async (t) => {
  const root = await workspace(t);
  await prepareContent({ root });
  await writeFile(join(root, "src/content/news/stale.json"), "{}");
  await writeFile(join(root, "public/uploads/stale.webp"), "stale");
  await cp(join(root, "fixtures"), join(root, "operational"), {
    recursive: true,
  });
  await writeFile(
    join(root, "operational/content-manifest.json"),
    '{"schemaVersion":1}',
  );
  assert.equal(
    (await prepareContent({ root, source: "operational", production: true }))
      .sample,
    false,
  );
  await assert.rejects(readFile(join(root, "src/content/news/stale.json")), {
    code: "ENOENT",
  });
  await assert.rejects(readFile(join(root, "public/uploads/stale.webp")), {
    code: "ENOENT",
  });
  assert.equal((await validateSource(join(root, "fixtures"))).sample, true);
});
test("incomplete or incompatible sources fail before replacing working data", async (t) => {
  const root = await workspace(t);
  await prepareContent({ root });
  const before = await readFile(join(root, "src/content/hero.json"), "utf8");
  await mkdir(join(root, "broken"));
  await writeFile(
    join(root, "broken/content-manifest.json"),
    '{"schemaVersion":2}',
  );
  await assert.rejects(prepareContent({ root, source: "broken" }), /버전/);
  await writeFile(
    join(root, "broken/content-manifest.json"),
    '{"schemaVersion":1}',
  );
  await assert.rejects(prepareContent({ root, source: "broken" }), {
    code: "ENOENT",
  });
  assert.equal(
    await readFile(join(root, "src/content/hero.json"), "utf8"),
    before,
  );
  await assert.rejects(
    prepareContent({ root, source: "src/content" }),
    /생성 폴더/,
  );
});
test("symlinks in content media are rejected", async (t) => {
  const root = await workspace(t);
  await symlink(
    join(root, "content-source.json"),
    join(root, "fixtures/uploads/link.json"),
  );
  await assert.rejects(prepareContent({ root }), /허용되지 않는 파일/);
});
test("Pages CMS preserves unexposed legacy fields and creates drafts with stable filenames", async () => {
  const config = YAML.parse(await readFile("cms/pages.yml", "utf8"));
  assert.equal(config.settings.content.merge, true);
  for (const name of ["news", "members", "centers", "nav_items"]) {
    const c = config.content.find((c) => c.name === name);
    assert.equal(c.format, "json");
    assert.equal(c.operations.rename, false);
    assert.equal(c.filename.field, false);
    assert.match(c.filename.template, /^[a-z]+-\{fields\.entry_id\}\.json$/);
    const id = c.fields.find((f) => f.name === "entry_id");
    assert.equal(id.type, "uuid");
    assert.equal(id.hidden, true);
    assert.equal(id.required, true);
    assert.equal(id.default, undefined); // Pages CMS generates UUIDs by default.
    assert.equal(c.fields.find((f) => f.name === "status").default, "draft");
    for (const field of c.fields)
      assert.ok(
        [
          "string",
          "text",
          "select",
          "boolean",
          "number",
          "image",
          "file",
          "date",
          "object",
          "uuid",
        ].includes(field.type),
      );
  }
  assert.equal(
    config.content
      .find((c) => c.name === "news")
      .fields.find((f) => f.name === "date").options.format,
    "yyyy-MM-dd",
  );
});
