import source from "../../content-source.json";
export const cmsRoot = `https://app.pagescms.org/${source.repository}/${encodeURIComponent(source.branch)}`;
export const cmsCollection = (name: string) =>
  `${cmsRoot}/collection/${encodeURIComponent(name)}`;
export const cmsNew = (name: string) => `${cmsCollection(name)}/new`;
export const cmsEntry = (name: string, slug: string) =>
  `${cmsCollection(name)}/edit/${encodeURIComponent(`content/${name}/${slug}.json`)}`;
export const cmsFile = (name: string) =>
  `${cmsRoot}/file/${encodeURIComponent(name)}`;
export const cmsMedia = `${cmsRoot}/media/images`;
export const deploymentUrl = `https://github.com/${source.codeRepository}/actions/workflows/deploy.yml`;
