import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import { join } from "node:path";

export const reviewFolder = "organization-review";
export const publishedFile = `${reviewFolder}/published.json`;
const stateFile = `${reviewFolder}/state.json`;
const text = (value) => value ?? "";
const controls = [
  "review_status",
  "review_preview",
  "review_approval",
  "review_version",
];
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
async function optionalJson(path) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
const save = (path, data) =>
  writeFile(path, JSON.stringify(data, null, 2) + "\n");
export function withoutReview(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !controls.includes(key)),
  );
}

// Include exactly the fields visible or interactive in OrganizationChart. Group
// order is fixed by the layout, so moving an item past a different group is inert.
export function chartData(data) {
  const nodes = data.nodes ?? [];
  if (!Array.isArray(nodes)) throw new Error("조직 구성은 목록이어야 합니다.");
  for (const node of nodes) {
    if (
      !node ||
      !["h", "p", "s", "c", "d", "i"].includes(node.relation) ||
      typeof node.name !== "string" ||
      !node.name.trim()
    )
      throw new Error("조직명과 종류(관계)를 확인하세요.");
  }
  const visible = nodes.filter((node) => node.visible !== false);
  const group = (relations) =>
    visible
      .filter((node) => relations.includes(node.relation))
      .map((node) => ({
        name: node.name,
        relation: node.relation,
        leader: text(node.leader),
        detail_url: text(node.detail_url),
      }));
  return {
    version: 1,
    root_name: data.root_name ?? "AIIA",
    root_description: data.root_description || "인공지능연구원",
    root_leader: text(data.root_leader),
    h: group("h"),
    p: group("p"),
    s: group("s"),
    c: group("c"),
    centers: group("di"),
  };
}
export function chartHash(data) {
  return createHash("sha256")
    .update(JSON.stringify(chartData(data)))
    .digest("hex");
}

export async function reviewPlan(root) {
  const draft = await readJson(join(root, "content/organization.json"));
  const hash = chartHash(draft);
  const state = await optionalJson(join(root, stateFile));
  const published = await optionalJson(join(root, publishedFile));
  const preview = `${reviewFolder}/previews/${hash}.png`;
  let imageExists = true;
  try {
    await access(join(root, preview));
  } catch {
    imageExists = false;
  }
  const needsPreview = !imageExists;
  // Approval is valid only for a preview already generated for these exact fields.
  const approved =
    !needsPreview &&
    state?.preview_hash === hash &&
    draft.review_approval === "approved" &&
    draft.review_version === hash;
  return {
    draft,
    hash,
    state,
    published,
    preview,
    needsPreview,
    approved,
    alreadyPublished: !!published && chartHash(published) === hash,
  };
}

export async function applyReview(
  root,
  { image, expectedHash, bootstrap = false } = {},
) {
  const plan = await reviewPlan(root);
  if (expectedHash && plan.hash !== expectedHash)
    throw new Error(
      "미리보기 생성 후 조직 정보가 변경됐습니다. 다시 생성하세요.",
    );
  if (bootstrap && plan.published)
    throw new Error("최초 승인 초기화는 한 번만 가능합니다.");
  if (plan.needsPreview && !image)
    throw new Error("새 조직도 그림을 먼저 생성해야 합니다.");
  if (image && !expectedHash)
    throw new Error("생성한 그림의 대상 버전이 필요합니다.");
  const publish = bootstrap || plan.alreadyPublished || plan.approved;
  if (!publish && !plan.published)
    throw new Error("기존 공개 조직도를 먼저 초기화하세요.");
  await mkdir(join(root, reviewFolder, "previews"), { recursive: true });
  if (plan.needsPreview) {
    const bytes = await readFile(image);
    if (
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new Error("PNG 조직도 그림이 아닙니다.");
    await copyFile(image, join(root, plan.preview));
  }
  const published = publish ? withoutReview(plan.draft) : plan.published;
  const state = {
    version: 1,
    preview_hash: plan.hash,
    published_hash: chartHash(published),
    generated_at:
      plan.state?.preview_hash === plan.hash
        ? plan.state.generated_at
        : new Date().toISOString(),
  };
  const draft = {
    ...plan.draft,
    review_status: publish
      ? "공개 승인 완료. 자동 배포 후 홈페이지에 반영됩니다."
      : "새 조직도 그림이 준비됐습니다. 아래 그림을 확인한 뒤 공개 승인을 선택하고 저장하세요.",
    review_preview: `![조직도 검토 그림 — ${plan.hash.slice(0, 8)}](/${plan.preview})`,
    review_version: plan.hash,
    review_approval: publish ? "approved" : "pending",
  };
  await save(join(root, publishedFile), published);
  await save(join(root, stateFile), state);
  await save(join(root, "content/organization.json"), draft);
  return {
    hash: plan.hash,
    generated: plan.needsPreview,
    published: publish,
    pending: !publish,
  };
}

export async function publicOrganization(root) {
  const state = await optionalJson(join(root, stateFile));
  if (!state) return null; // Legacy and sample sources remain compatible.
  const published = await readJson(join(root, publishedFile));
  if (chartHash(published) !== state.published_hash)
    throw new Error("승인된 조직도 데이터가 일치하지 않습니다.");
  return withoutReview(published);
}
