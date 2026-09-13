import {
  mkdir,
  readFile,
  readdir,
  cp,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve, join, relative, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { publicOrganization } from "./organization-review.mjs";

export const singletons = [
  "site_settings",
  "hero",
  "about",
  "organization",
  "inquiry",
  "contact",
  "footer",
];
export const collections = ["news", "members", "centers", "nav_items", "stats"];
export async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
export async function validateSource(source, version = 1) {
  const manifest = await json(join(source, "content-manifest.json"));
  if (manifest.schemaVersion !== version)
    throw new Error(
      `콘텐츠 형식 버전이 다릅니다: expected ${version}, got ${manifest.schemaVersion}`,
    );
  for (const name of singletons)
    await json(join(source, "content", `${name}.json`));
  for (const name of collections) {
    for (const file of await readdir(join(source, "content", name), {
      withFileTypes: true,
    })) {
      if (!file.isFile() || !file.name.endsWith(".json"))
        throw new Error(`허용되지 않는 콘텐츠 항목: ${name}/${file.name}`);
      await json(join(source, "content", name, file.name));
    }
  }
  // Do not copy symlinks or files outside the intended content/media trees.
  async function tree(dir, data = false) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      if (item.isSymbolicLink() || (!item.isDirectory() && !item.isFile()))
        throw new Error(`허용되지 않는 파일: ${item.name}`);
      if (item.isDirectory()) await tree(join(dir, item.name), data);
      else if (data && !item.name.endsWith(".json"))
        throw new Error(`JSON 이외 콘텐츠 파일: ${item.name}`);
    }
  }
  await tree(join(source, "content"), true);
  await tree(join(source, "uploads"));
  return manifest;
}
export async function prepareContent({
  root = process.cwd(),
  source,
  production = false,
  organizationPreview = false,
} = {}) {
  root = resolve(root);
  const settings = await json(join(root, "content-source.json"));
  if (!source) {
    try {
      source = (await json(join(root, ".aiia/source.json"))).path;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  source = resolve(root, source || "fixtures");
  for (const output of ["src/content", "public/uploads"]) {
    const rel = relative(resolve(root, output), source);
    if (!rel || (!rel.startsWith(`..${sep}`) && rel !== ".."))
      throw new Error("생성 폴더를 콘텐츠 원본으로 사용할 수 없습니다.");
  }
  const manifest = await validateSource(source, settings.schemaVersion);
  if (production && manifest.sample)
    throw new Error("운영 배포에 샘플 콘텐츠를 사용할 수 없습니다.");
  if (production && organizationPreview)
    throw new Error("운영 배포에는 조직도 편집본을 사용할 수 없습니다.");
  const approvedOrganization = organizationPreview
    ? null
    : await publicOrganization(source);
  const work = join(root, ".aiia", `prepare-${randomUUID()}`);
  await mkdir(work, { recursive: true });
  const installed = [];
  const backups = [];
  try {
    await cp(join(source, "content"), join(work, "content"), {
      recursive: true,
    });
    if (approvedOrganization)
      await writeFile(
        join(work, "content/organization.json"),
        JSON.stringify(approvedOrganization, null, 2) + "\n",
      );
    await cp(join(source, "uploads"), join(work, "uploads"), {
      recursive: true,
    });
    for (const [name, output] of [
      ["content", "src/content"],
      ["uploads", "public/uploads"],
    ]) {
      const target = join(root, output);
      await mkdir(resolve(target, ".."), { recursive: true });
      const backup = join(work, `${name}-previous`);
      try {
        await rename(target, backup);
        backups.push([backup, target]);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      await rename(join(work, name), target);
      installed.push(target);
    }
    await writeFile(
      join(root, ".aiia/prepared.json"),
      JSON.stringify({
        source,
        sample: !!manifest.sample,
        schemaVersion: manifest.schemaVersion,
      }) + "\n",
    );
  } catch (error) {
    for (const target of installed)
      await rm(target, { recursive: true, force: true });
    for (const [backup, target] of backups.reverse())
      await rename(backup, target);
    throw error;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
  return { source, sample: !!manifest.sample };
}
