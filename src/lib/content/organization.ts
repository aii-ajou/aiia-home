import type { OrgNodeView } from "./queries";

export const relationLabels = {
  h: "상위기관",
  p: "협력기관",
  c: "위원회",
  s: "스탭·행정 부서",
  d: "일반·도메인 센터",
  i: "기업 브랜드 센터",
} as const;

export interface ChartBox {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Build-time coordinates only. Browsers receive HTML nodes and decorative SVG lines. */
export function layoutOrganization(nodes: OrgNodeView[]) {
  const boxWidth = 196;
  const gap = 24;
  const padding = 24;
  const group = (relations: string) =>
    nodes
      .map((node, index) => ({ ...node, index }))
      .filter((node) => relations.includes(node.relation));
  const upper = group("h");
  const peers = group("p");
  const staff = group("s");
  const committees = group("c");
  const centers = group("di");
  // Allow long names to wrap without clipping. The chart scrolls within its frame
  // when many centers are present, including on narrow mobile screens.
  const heightFor = (items: OrgNodeView[]) =>
    Math.max(
      104,
      ...items.map((node) => {
        const units = [...node.name].reduce(
          (sum, char) => sum + (char.charCodeAt(0) > 255 ? 1 : 0.6),
          0,
        );
        return 52 + Math.ceil(units / 9) * 24 + (node.leader ? 24 : 0);
      }),
    );
  const width = Math.max(
    960,
    centers.length * (boxWidth + gap) - gap + padding * 2,
  );
  const cx = width / 2;
  const boxes: ChartBox[] = [];
  const lines: { path: string; peer: boolean }[] = [];
  const addLine = (path: string, peer = false) => lines.push({ path, peer });
  const place = (index: number, x: number, y: number, height: number) => {
    const box = { index, x, y, width: boxWidth, height };
    boxes.push(box);
    return box;
  };
  let y = padding;
  for (const node of upper) {
    const height = heightFor([node]);
    place(node.index, cx - boxWidth / 2, y, height);
    addLine(`M ${cx} ${y + height} V ${y + height + gap}`);
    y += height + gap;
  }
  const peerHeight = heightFor(peers);
  const peerRows = Math.max(1, Math.ceil(peers.length / 2));
  const mainHeight = Math.max(112, peerRows * (peerHeight + gap) - gap);
  const rootY = y + (mainHeight - 112) / 2;
  const root = { x: cx - boxWidth / 2, y: rootY, width: boxWidth, height: 112 };
  if (rootY > y && upper.length) addLine(`M ${cx} ${y} V ${rootY}`);
  peers.forEach((node, index) => {
    const left = index % 2 === 0;
    const x = left ? cx - boxWidth * 2 : cx + boxWidth;
    const py = y + Math.floor(index / 2) * (peerHeight + gap);
    place(node.index, x, py, peerHeight);
    const edge = left ? x + boxWidth : x;
    const rootEdge = left ? root.x : root.x + root.width;
    const junction = (edge + rootEdge) / 2;
    addLine(
      `M ${edge} ${py + peerHeight / 2} H ${junction} V ${rootY + 56} H ${rootEdge}`,
      true,
    );
  });
  let spine = rootY + 112;
  y += mainHeight + gap;
  const supportHeight = heightFor([...staff, ...committees]);
  const supportRows = Math.max(staff.length, committees.length);
  for (let row = 0; row < supportRows; row++) {
    const sy = y + row * (supportHeight + gap);
    const middle = sy + supportHeight / 2;
    addLine(`M ${cx} ${spine} V ${middle}`);
    spine = middle;
    if (staff[row]) {
      const box = place(
        staff[row].index,
        cx - boxWidth - gap * 2,
        sy,
        supportHeight,
      );
      addLine(`M ${box.x + boxWidth} ${middle} H ${cx}`);
    }
    if (committees[row]) {
      const box = place(committees[row].index, cx + gap * 2, sy, supportHeight);
      addLine(`M ${cx} ${middle} H ${box.x}`);
    }
  }
  y += supportRows * (supportHeight + gap);
  if (centers.length) {
    const railY = y + gap;
    const centerY = railY + gap;
    const height = heightFor(centers);
    const start = (width - (centers.length * (boxWidth + gap) - gap)) / 2;
    addLine(`M ${cx} ${spine} V ${railY}`);
    const first = start + boxWidth / 2;
    const last = first + (centers.length - 1) * (boxWidth + gap);
    if (centers.length > 1) addLine(`M ${first} ${railY} H ${last}`);
    centers.forEach((node, index) => {
      const x = start + index * (boxWidth + gap);
      place(node.index, x, centerY, height);
      addLine(`M ${x + boxWidth / 2} ${railY} V ${centerY}`);
    });
    y = centerY + height;
  }
  return { width, height: y + padding, root, boxes, lines };
}
