import { prepareContent } from "./lib/content.mjs";
try {
  const result = await prepareContent({
    source: process.env.AIIA_CONTENT_SOURCE,
    production: process.env.AIIA_REQUIRE_CONTENT === "true",
    organizationPreview: process.env.AIIA_ORGANIZATION_PREVIEW === "true",
  });
  console.log(
    `콘텐츠 준비: ${result.sample ? "개발용 샘플" : "운영 콘텐츠"} (${result.source})`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
