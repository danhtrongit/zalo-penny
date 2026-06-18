import { useEffect } from "react";

interface PageHeadProps {
  title?: string;
  description?: string;
  /** Path ("/pricing") or absolute URL; resolved against SITE_URL for canonical + og:url. */
  canonical?: string;
  ogImage?: string;
  /** JSON-LD structured data (object or array of objects). */
  jsonLd?: object | object[];
  noIndex?: boolean;
}

const SITE_URL = "https://pennybot.vn";
const DEFAULT_TITLE = "Penny - Trợ lý chi tiêu thông minh trên Zalo";
const DEFAULT_DESCRIPTION =
  "Penny là trợ lý AI trên Zalo giúp bạn ghi chi tiêu bằng tiếng Việt tự nhiên, quét hóa đơn, theo dõi ngân sách.";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

/**
 * Per-route head manager: title, description, canonical, Open Graph, Twitter,
 * robots, and JSON-LD. No SSR — these update on the client, so JS-aware crawlers
 * (Googlebot) see per-page metadata. A prerender/SSG step would be needed for
 * non-JS unfurlers; tracked separately.
 */
export function PageHead({
  title,
  description,
  canonical,
  ogImage,
  jsonLd,
  noIndex,
}: PageHeadProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | Penny` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const url = canonical
      ? canonical.startsWith("http")
        ? canonical
        : `${SITE_URL}${canonical}`
      : SITE_URL;

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setMeta("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");
    setCanonical(url);

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    }

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-pagehead", "");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      if (script) script.remove();
    };
  }, [title, description, canonical, ogImage, jsonLd, noIndex]);

  return null;
}
