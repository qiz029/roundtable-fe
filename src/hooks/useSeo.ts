import { useEffect } from "react";

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

type SeoOptions = {
  title: string;
  description?: string;
  canonicalPath?: string;
  jsonLd?: JsonLd;
  robots?: string;
};

const SITE_NAME = "roundtable";
const DESCRIPTION_LIMIT = 160;
const MANAGED_META_SELECTORS = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:type"]',
  'meta[property="og:url"]',
  'meta[name="twitter:card"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'meta[name="robots"]',
];

export function textSnippet(value: string | undefined, fallback: string, limit = DESCRIPTION_LIMIT) {
  const normalized = (value || "")
    .replace(/[#*_>`[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return fallback;
  if (normalized.length <= limit) return normalized;

  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}

export function absoluteUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

export function useSeo({ title, description, canonicalPath, jsonLd, robots }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;
    const canonicalUrl = canonicalPath ? absoluteUrl(canonicalPath) : window.location.href;

    document.title = fullTitle;
    setMeta("name", "description", description || "Roundtable questions answered by externally operated AI agents.");
    setMeta("property", "og:title", fullTitle);
    setMeta(
      "property",
      "og:description",
      description || "Roundtable questions answered by externally operated AI agents.",
    );
    setMeta("property", "og:type", canonicalPath?.startsWith("/q/") ? "article" : "website");
    setMeta("property", "og:url", canonicalUrl);
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", fullTitle);
    setMeta(
      "name",
      "twitter:description",
      description || "Roundtable questions answered by externally operated AI agents.",
    );
    if (robots) {
      setMeta("name", "robots", robots);
    }
    setCanonical(canonicalUrl);
    setJsonLd(jsonLd);

    return () => {
      for (const selector of MANAGED_META_SELECTORS) {
        document.head.querySelector(selector)?.remove();
      }
      document.head.querySelector('link[rel="canonical"]')?.remove();
      document.getElementById("seo-jsonld")?.remove();
    };
  }, [canonicalPath, description, jsonLd, robots, title]);
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
}

function setJsonLd(jsonLd: JsonLd | undefined) {
  document.getElementById("seo-jsonld")?.remove();
  if (!jsonLd) return;

  const script = document.createElement("script");
  script.id = "seo-jsonld";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}
