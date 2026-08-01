import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type V2SeoConfig = {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  jsonLd?: Array<Record<string, unknown>>;
};

const DEFAULT_ROBOTS = "index, follow";
const BASE_URL = "https://tourstream.kr";

const upsertMeta = (nameOrProperty: "name" | "property", key: string, content: string) => {
  const selector = `meta[${nameOrProperty}="${key}"]`;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(nameOrProperty, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", href);
};

export const useV2Seo = (config: V2SeoConfig) => {
  const location = useLocation();

  useEffect(() => {
    const canonical = config.canonicalPath
      ? `${BASE_URL}${config.canonicalPath}`
      : `${BASE_URL}${location.pathname}${location.search}`;
    const robots = config.robots || DEFAULT_ROBOTS;
    const ogType = config.ogType || "website";
    const ogImage = config.ogImage || `${BASE_URL}/logo192.png`;

    document.title = config.title;
    upsertCanonical(canonical);
    upsertMeta("name", "description", config.description);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:title", config.title);
    upsertMeta("property", "og:description", config.description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", config.title);
    upsertMeta("name", "twitter:description", config.description);
    upsertMeta("name", "twitter:image", ogImage);

    const existingScripts = document.head.querySelectorAll('script[type="application/ld+json"][data-v2-seo="true"]');
    existingScripts.forEach((node) => node.remove());
    (config.jsonLd || []).forEach((schema) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-v2-seo", "true");
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      const scripts = document.head.querySelectorAll('script[type="application/ld+json"][data-v2-seo="true"]');
      scripts.forEach((node) => node.remove());
    };
  }, [config, location.pathname, location.search]);
};
