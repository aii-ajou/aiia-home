import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { json } from "./lib/content.mjs";
const { repository, branch } = await json("content-source.json");
const dir = ".content-repository";
try {
  if (existsSync(dir)) {
    if (!existsSync(`${dir}/.git`))
      throw new Error(
        `${dir}에 이전 자료가 있습니다. 보존 여부를 확인한 후 별도 경로에 clone하세요.`,
      );
    const origin = execFileSync(
      "git",
      ["-C", dir, "remote", "get-url", "origin"],
      { encoding: "utf8" },
    ).trim();
    if (
      ![
        `git@github.com:${repository}.git`,
        `https://github.com/${repository}.git`,
        `https://github.com/${repository}`,
      ].includes(origin)
    )
      throw new Error("콘텐츠 저장소 origin이 설정과 다릅니다.");
    if (
      execFileSync("git", ["-C", dir, "status", "--porcelain"], {
        encoding: "utf8",
      }).trim()
    )
      throw new Error(
        "콘텐츠 저장소에 로컬 변경이 있습니다. 먼저 커밋하거나 보관하세요.",
      );
    if (
      execFileSync("git", ["-C", dir, "branch", "--show-current"], {
        encoding: "utf8",
      }).trim() !== branch
    )
      throw new Error(`콘텐츠 저장소의 ${branch} 브랜치에서 실행하세요.`);
    execFileSync("git", ["-C", dir, "pull", "--ff-only", "origin", branch], {
      stdio: "inherit",
    });
  } else
    execFileSync(
      "gh",
      [
        "repo",
        "clone",
        repository,
        dir,
        "--",
        "--depth",
        "1",
        "--branch",
        branch,
      ],
      { stdio: "inherit" },
    );
  execFileSync(process.execPath, ["scripts/select-content.mjs", dir], {
    stdio: "inherit",
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
