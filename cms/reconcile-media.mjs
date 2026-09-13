// Install unchanged at scripts/reconcile-media.mjs in the content repository.
// Uses only Node built-ins so the private content repository needs no npm install.
import { readdir, readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join, dirname, basename, extname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const imageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".svg",
]);
const statePath = "media-state.json";
const graceMs = 24 * 60 * 60 * 1000;

async function files(root, folder) {
  let entries;
  try {
    entries = await readdir(join(root, folder), { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) result.push(...(await files(root, path)));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Unsupported file: ${path}`);
  }
  return result;
}

// Ignore external URLs; preserve query strings/fragments and recognize encoded paths
// in both dedicated fields and links embedded in text. Exact fields may have spaces.
function mapLinks(value, visit) {
  if (typeof value === "string") {
    const replace = (link) => {
      const decoded = decodeURI(link);
      const target = visit(decoded);
      if (target === decoded) return link;
      return link !== decoded ? encodeURI(target) : target;
    };
    if (
      /^\/(?:uploads|media-archive)\//.test(value) &&
      !/[\n<>"\[\]]/.test(value)
    ) {
      const match = value.match(/^([^?#]+)(.*)$/s);
      return replace(match[1]) + match[2];
    }
    return value.replace(
      /https?:\/\/[^\s<>"']+|\/(?:uploads|media-archive)\/[^\s<>"'()[\]?#]+/g,
      (link) => (link.startsWith("/") ? replace(link) : link),
    );
  }
  if (Array.isArray(value)) return value.map((item) => mapLinks(item, visit));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapLinks(item, visit)]),
    );
  return value;
}

export async function reconcileMedia({
  root = process.cwd(),
  now = Date.now(),
  apply = false,
  archiveNow = false,
} = {}) {
  root = resolve(root);
  const contentFiles = (await files(root, "content")).filter((path) =>
    path.endsWith(".json"),
  );
  if (!contentFiles.length)
    throw new Error("No content JSON found; refusing to archive media.");
  const records = await Promise.all(
    contentFiles.map(async (path) => ({
      path,
      data: JSON.parse(await readFile(join(root, path), "utf8")),
    })),
  );
  const media = [
    ...(await files(root, "uploads")),
    ...(await files(root, "media-archive")),
  ].filter((path) => !path.endsWith("/.gitkeep"));
  const inventory = new Set(media);
  const hashes = new Map(
    await Promise.all(
      media.map(async (path) => [
        path,
        createHash("sha256")
          .update(await readFile(join(root, path)))
          .digest("hex"),
      ]),
    ),
  );
  let previous = { version: 1, unused: {} };
  try {
    previous = JSON.parse(await readFile(join(root, statePath), "utf8"));
    if (previous.version !== 1 || !previous.unused)
      throw new Error("Invalid media state");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const references = new Map();
  for (const record of records)
    mapLinks(record.data, (url) => {
      const path = url.slice(1);
      if (!inventory.has(path))
        throw new Error(`Missing media: ${url} (${record.path})`);
      if (!references.has(path)) references.set(path, new Set());
      references.get(path).add(record.path);
      return url;
    });
  const moves = [];
  const replacements = new Map();
  const unused = {};
  function allocate(folder, path) {
    let target = `${folder}/${basename(path)}`;
    if (target === path) return target;
    // Never overwrite or silently discard a duplicate. Preserve both byte streams.
    const extension = extname(path);
    const stem = basename(path, extension);
    for (let suffix = 1; inventory.has(target); suffix++)
      target = `${folder}/${stem}-${suffix}${extension}`;
    inventory.add(target);
    return target;
  }
  for (const path of media) {
    const owners = references.get(path);
    const isImage = imageExtensions.has(extname(path).toLowerCase());
    if (owners) {
      const folder = !isImage
        ? "documents"
        : [...owners].some((owner) => owner.startsWith("content/members/"))
          ? "members"
          : [...owners].some((owner) => owner.startsWith("content/news/"))
            ? "news"
            : "images";
      const target = allocate(`uploads/${folder}`, path);
      if (target !== path) {
        moves.push({ from: path, to: target, reason: "used" });
        replacements.set(`/${path}`, `/${target}`);
      }
    } else if (path.startsWith("uploads/")) {
      const old = previous.unused[path];
      const firstUnusedAt =
        old?.sha256 === hashes.get(path) &&
        Number.isFinite(Date.parse(old.since))
          ? old.since
          : new Date(now).toISOString();
      if (archiveNow || now - Date.parse(firstUnusedAt) >= graceMs) {
        // Keep the former folder hierarchy for operators and later restoration.
        const folder = `media-archive/${isImage ? "images" : "documents"}/${dirname(path.slice("uploads/".length))}`;
        const target = allocate(folder.replace(/\/\.$/, ""), path);
        moves.push({ from: path, to: target, reason: "unused" });
      } else unused[path] = { sha256: hashes.get(path), since: firstUnusedAt };
    }
  }
  const updates = [];
  for (const record of records) {
    const data = mapLinks(record.data, (url) => replacements.get(url) || url);
    if (JSON.stringify(data) !== JSON.stringify(record.data))
      updates.push({ path: record.path, data });
  }
  if (apply) {
    // All JSON, references and destinations are checked before the first mutation.
    for (const move of moves) {
      await mkdir(dirname(join(root, move.to)), { recursive: true });
      await rename(join(root, move.from), join(root, move.to));
    }
    for (const update of updates)
      await writeFile(
        join(root, update.path),
        JSON.stringify(update.data, null, 2) + "\n",
      );
    await writeFile(
      join(root, statePath),
      JSON.stringify({ version: 1, unused }, null, 2) + "\n",
    );
  }
  return {
    moves,
    updatedContent: updates.map((item) => item.path),
    pending: Object.keys(unused).length,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (
    args.some(
      (arg) =>
        arg.startsWith("--") && !["--apply", "--archive-now"].includes(arg),
    )
  )
    throw new Error(
      "Usage: node reconcile-media.mjs [root] [--apply] [--archive-now]",
    );
  const result = await reconcileMedia({
    root: args.find((arg) => !arg.startsWith("--")),
    apply: args.includes("--apply"),
    archiveNow: args.includes("--archive-now"),
  });
  console.log(JSON.stringify(result, null, 2));
}
