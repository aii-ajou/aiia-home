import { resolve } from "node:path";
import { appendFile } from "node:fs/promises";
import { reviewPlan, applyReview } from "./lib/organization-review.mjs";
const [command, folder = ".", ...args] = process.argv.slice(2);
const root = resolve(folder);
if (command === "plan") {
  const plan = await reviewPlan(root);
  const result = {
    hash: plan.hash,
    needs_preview: plan.needsPreview,
    approved: plan.approved,
  };
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `hash=${plan.hash}\nneeds_preview=${plan.needsPreview}\n`,
    );
  console.log(JSON.stringify(result, null, 2));
} else if (command === "apply") {
  const option = (name) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  console.log(
    JSON.stringify(
      await applyReview(root, {
        image: option("--image"),
        expectedHash: option("--hash"),
        bootstrap: args.includes("--bootstrap-approved"),
      }),
      null,
      2,
    ),
  );
} else
  throw new Error(
    "Usage: review-organization.mjs plan|apply <source> [--hash HASH --image PNG]",
  );
