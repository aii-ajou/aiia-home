/**
 * client.ts — Directus SDK 클라이언트 싱글톤.
 * 기본은 익명(Public role) 읽기. DIRECTUS_TOKEN 이 있으면 정적 토큰으로 읽는다.
 */
import { createDirectus, rest, staticToken } from "@directus/sdk";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";
import type { Schema } from "./schema";

const base = createDirectus<Schema>(DIRECTUS_URL).with(rest());

export const directus = DIRECTUS_TOKEN ? base.with(staticToken(DIRECTUS_TOKEN)) : base;
