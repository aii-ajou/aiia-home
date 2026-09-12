import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prepareContent } from "./lib/content.mjs";
try {
  const source = process.argv[2] || "fixtures";
  const result = await prepareContent({ source });
  await mkdir(".aiia", { recursive: true });
  await writeFile(
    ".aiia/source.json",
    JSON.stringify({ path: resolve(source) }) + "\n",
  );
  console.log(
    `로컬 콘텐츠 선택: ${result.source}\n실행 중인 개발 서버는 다시 시작하세요.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
