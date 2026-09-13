import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import YAML from "yaml";
import {
  applyReview,
  chartHash,
  reviewPlan,
  publicOrganization,
} from "../../scripts/lib/organization-review.mjs";
import { prepareContent } from "../../scripts/lib/content.mjs";
import { reconcileMedia } from "../../cms/reconcile-media.mjs";

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), "aiia-org-review-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp("fixtures", join(root, "source"), { recursive: true });
  const source = join(root, "source");
  await cp("cms/pages.yml", join(source, ".pages.yml"));
  await cp("content-source.json", join(root, "content-source.json"));
  const path = join(source, "content/organization.json");
  const image = join(root, "preview.png");
  await writeFile(
    image,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const read = async () => JSON.parse(await readFile(path, "utf8"));
  const save = (data) => writeFile(path, JSON.stringify(data));
  const first = await read();
  await applyReview(source, {
    image,
    expectedHash: chartHash(first),
    bootstrap: true,
  });
  return { root, source, image, read, save, first };
}

test("only diagram fields require another generated image", async (t) => {
  const { first } = await setup(t);
  const original = chartHash(first);
  for (const change of [
    (d) => {
      d.lede = "새 소개";
    },
    (d) => {
      d.nodes[4].description = "역할 설명 수정";
    },
    (d) => {
      d.nodes[4].photo = "/uploads/images/new.png";
    },
    (d) => {
      d.nodes.push({ name: "숨긴 조직", relation: "i", visible: false });
    },
    (d) => {
      [d.nodes[0], d.nodes[1]] = [d.nodes[1], d.nodes[0]];
    },
  ]) {
    const changed = structuredClone(first);
    change(changed);
    assert.equal(chartHash(changed), original);
  }
  for (const change of [
    (d) => {
      d.root_name = "새 연구원";
    },
    (d) => {
      d.nodes[4].name = "새 센터";
    },
    (d) => {
      d.nodes[4].leader = "홍길동";
    },
    (d) => {
      d.nodes[4].relation = "i";
    },
    (d) => {
      d.nodes[4].visible = false;
    },
    (d) => {
      d.nodes[4].detail_url = "https://example.org/center";
    },
    (d) => {
      [d.nodes[4], d.nodes[5]] = [d.nodes[5], d.nodes[4]];
    },
  ]) {
    const changed = structuredClone(first);
    change(changed);
    assert.notEqual(chartHash(changed), original);
  }
});

test("save generates a pending preview; only approval of that exact diagram changes public content", async (t) => {
  const { root, source, image, read, save } = await setup(t);
  const old = await publicOrganization(source);
  const draft = await read();
  draft.nodes[4].name = "검토 중인 새 센터";
  await save(draft); // old approval is still present, as in a real CMS save
  const plan = await reviewPlan(source);
  assert.equal(plan.needsPreview, true);
  await assert.rejects(applyReview(source), /먼저 생성/);
  assert.equal(
    (await applyReview(source, { image, expectedHash: plan.hash })).pending,
    true,
  );
  assert.deepEqual(await publicOrganization(source), old);
  await prepareContent({ root, source });
  assert.equal(
    JSON.parse(await readFile(join(root, "src/content/organization.json")))
      .nodes[4].name,
    old.nodes[4].name,
  );
  const review = await read();
  assert.equal(review.review_approval, "pending");
  assert.match(review.review_preview, new RegExp(plan.hash));
  const config = YAML.parse(await readFile(join(source, ".pages.yml"), "utf8"));
  const approval = config.content
    .find((c) => c.name === "organization")
    .fields.find((f) => f.name === "review_approval");
  assert.equal(approval.options.values[1].name, "approved");
  assert.equal(review.review_version, plan.hash);
  review.review_approval = "approved";
  await save(review);
  assert.equal((await applyReview(source)).published, true);
  assert.equal(
    (await publicOrganization(source)).nodes[4].name,
    "검토 중인 새 센터",
  );
  const manifestPath = join(source, "content-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await writeFile(manifestPath, JSON.stringify({ ...manifest, sample: false }));
  await assert.rejects(
    prepareContent({
      root,
      source,
      production: true,
      organizationPreview: true,
    }),
    /편집본/,
  );
});

test("stale approval or edits made after generation never publish a different diagram", async (t) => {
  const { source, image, read, save } = await setup(t);
  const old = await publicOrganization(source);
  let draft = await read();
  draft.nodes[4].name = "첫 수정";
  await save(draft);
  const firstHash = chartHash(draft);
  await applyReview(source, { image, expectedHash: firstHash });
  draft = await read();
  draft.nodes[4].name = "둘째 수정";
  draft.review_approval = "approved";
  assert.equal(draft.review_version, firstHash);
  await save(draft);
  await assert.rejects(
    applyReview(source, { image, expectedHash: firstHash }),
    /변경됐습니다/,
  );
  await applyReview(source, { image, expectedHash: chartHash(draft) });
  assert.deepEqual(await publicOrganization(source), old);
  assert.equal((await read()).review_approval, "pending");
});

test("description-only updates reuse the preview and publish without a new approval", async (t) => {
  const { source, read, save } = await setup(t);
  const draft = await read();
  const preview = draft.review_preview;
  draft.nodes[4].description = "설명만 변경";
  await save(draft);
  assert.equal((await reviewPlan(source)).needsPreview, false);
  const result = await applyReview(source);
  assert.equal(result.generated, false);
  assert.equal(result.published, true);
  assert.equal((await read()).review_preview, preview);
  assert.equal(
    (await publicOrganization(source)).nodes[4].description,
    "설명만 변경",
  );
});

test("photos referenced only by the approved organization are protected from archival", async (t) => {
  const { source, read, save } = await setup(t);
  await mkdir(join(source, "uploads/images"), { recursive: true });
  await writeFile(join(source, "uploads/images/live.png"), "live photo");
  let draft = await read();
  draft.nodes[4].photo = "/uploads/images/live.png";
  await save(draft);
  await applyReview(source);
  draft = await read();
  draft.nodes[4].photo = "";
  draft.nodes[4].name = "검토 중";
  await save(draft);
  const media = await reconcileMedia({ root: source, archiveNow: true });
  assert.equal(
    media.moves.some(
      (m) => m.from === "uploads/images/live.png" && m.reason === "unused",
    ),
    false,
  );
});

test("missing or inconsistent approved snapshots fail closed", async (t) => {
  const { source } = await setup(t);
  await writeFile(
    join(source, "organization-review/published.json"),
    '{"root_name":"tampered"}',
  );
  await assert.rejects(publicOrganization(source), /일치하지/);
  await rm(join(source, "organization-review/published.json"));
  await assert.rejects(publicOrganization(source));
});

test("cached CMS options remain valid across diagram revisions; stale preview versions cannot approve", async (t) => {
  const { source, image, read, save } = await setup(t);
  const cachedConfigText = await readFile(join(source, ".pages.yml"), "utf8");
  const config = YAML.parse(cachedConfigText);
  const fields = config.content.find((c) => c.name === "organization").fields;
  const values = fields
    .find((f) => f.name === "review_approval")
    .options.values.map((v) => v.value ?? v.name);
  assert.deepEqual(values, ["pending", "approved"]);
  assert.equal(fields.find((f) => f.name === "review_version").readonly, true);
  let draft = await read();
  const previousVersion = draft.review_version;
  draft.nodes[4].detail_url = "https://example.org/new-center";
  await save(draft);
  const nextHash = chartHash(draft);
  await applyReview(source, { image, expectedHash: nextHash });
  assert.equal(
    await readFile(join(source, ".pages.yml"), "utf8"),
    cachedConfigText,
  );
  draft = await read();
  draft.review_approval = "approved";
  draft.review_version = previousVersion; // an older tab with the same fixed options
  assert(values.includes(draft.review_approval)); // Pages CMS's select validation
  await save(draft);
  assert.equal((await applyReview(source)).pending, true);
  assert.notEqual(chartHash(await publicOrganization(source)), nextHash);
  draft = await read();
  draft.review_approval = "approved";
  delete draft.review_version;
  await save(draft);
  assert.equal((await applyReview(source)).pending, true);
  draft = await read();
  draft.review_approval = "approved";
  await save(draft);
  assert.equal((await applyReview(source)).published, true);
  const published = await publicOrganization(source);
  assert.equal(chartHash(published), nextHash);
  assert.equal(published.review_version, undefined);
  assert.equal(published.review_approval, undefined);
});

test("a new diagram style regenerates previews while previous approved snapshots remain readable", async (t) => {
  const { source, image, read, save } = await setup(t);
  const published = await publicOrganization(source);
  const legacyHash = chartHash(published, 1);
  const statePath = join(source, "organization-review/state.json");
  const currentState = JSON.parse(await readFile(statePath, "utf8"));
  await cp(
    join(
      source,
      "organization-review/previews",
      `${currentState.preview_hash}.png`,
    ),
    join(source, "organization-review/previews", `${legacyHash}.png`),
  );
  await rm(
    join(
      source,
      "organization-review/previews",
      `${currentState.preview_hash}.png`,
    ),
  );
  await writeFile(
    statePath,
    JSON.stringify({
      version: 1,
      preview_hash: legacyHash,
      published_hash: legacyHash,
    }),
  );
  let draft = await read();
  draft.review_version = legacyHash;
  await save(draft);
  assert.deepEqual(await publicOrganization(source), published);
  const plan = await reviewPlan(source);
  assert.equal(plan.needsPreview, true);
  assert.equal(plan.approved, false);
  assert.notEqual(plan.hash, legacyHash);
  await applyReview(source, { image, expectedHash: plan.hash });
  assert.deepEqual(await publicOrganization(source), published);
  assert.equal((await reviewPlan(source)).needsPreview, false);
});
