/** CMS에는 주소만 입력한다. 기존 mailto 접두사가 있어도 한 번만 붙인다. */
export const emailAddress = (value: string) =>
  value
    .trim()
    .replace(/^mailto:/i, "")
    .trim();

export function emailHref(value: string, subject?: string): string {
  const address = encodeURIComponent(emailAddress(value)).replace(/%40/g, "@");
  return `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

/** 연락처 문장 속 주소만 나눈다. HTML로 해석하지 않고 Astro에서 출력한다. */
export function emailParts(value: string): string[] {
  return value.split(
    /((?:mailto:)?[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)/gi,
  );
}
