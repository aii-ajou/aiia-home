import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
const root = resolve("dist");
const base = process.env.GITHUB_PAGES === "true" ? "/aiia-home" : "";
const errors = [];
async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    files.push(...(entry.isDirectory() ? await walk(p) : [p]));
  }
  return files;
}
const files = (await walk(root)).filter((f) => extname(f) === ".html");
for (const file of files) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (/^(https?:|mailto:|tel:|data:|blob:|\/\/)/i.test(href)) continue;
    const path = href.split(/[?#]/)[0];
    if (!path) continue;
    if (path.startsWith("/") && base && !path.startsWith(base + "/")) {
      errors.push(`${file}: missing base: ${href}`);
      continue;
    }
    const target = path.startsWith("/")
      ? resolve(root, "." + path.slice(base.length))
      : resolve(file, "..", decodeURIComponent(path));
    if (!(await exists(target)))
      errors.push(`${file}: missing target: ${href}`);
  }
}
for (const name of ["news", "members"])
  for (const file of await readdir(`src/content/${name}`)) {
    const data = JSON.parse(
      await readFile(`src/content/${name}/${file}`, "utf8"),
    );
    const output = join(root, name, file.replace(/\.json$/, ""), "index.html");
    if ((data.status === "published") !== (await exists(output)))
      errors.push(
        `${name}/${file}: published state does not match generated route`,
      );
  }
for (const file of ["admin/index.html", "admin/editor.html"])
  if (!(await exists(join(root, file)))) errors.push(`missing ${file}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Verified ${files.length} pages: internal links, assets, admin files and publication states (${base || "/"}).`,
);
