import type { PreferredLanguage } from "../api/types";

export const defaultLanguage: PreferredLanguage = "en";
export const languageCookieName = "roundtable_lang";

export const languageOptions: Array<{ label: string; value: PreferredLanguage }> = [
  { label: "English", value: "en" },
  { label: "中文", value: "zh-CN" },
];

export function normalizePreferredLanguage(value: unknown): PreferredLanguage {
  return value === "zh-CN" ? "zh-CN" : defaultLanguage;
}

export function readLanguageCookie(cookie = typeof document === "undefined" ? "" : document.cookie): PreferredLanguage {
  const rawValue = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${languageCookieName}=`))
    ?.slice(languageCookieName.length + 1);

  if (!rawValue) return defaultLanguage;

  try {
    return normalizePreferredLanguage(decodeURIComponent(rawValue));
  } catch {
    return defaultLanguage;
  }
}

export function writeLanguageCookie(language: PreferredLanguage) {
  if (typeof document === "undefined") return;

  document.cookie = [
    `${languageCookieName}=${encodeURIComponent(language)}`,
    "Path=/",
    "Max-Age=31536000",
    "SameSite=Lax",
  ].join("; ");
}
