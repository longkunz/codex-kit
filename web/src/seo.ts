import { DEFAULT_PAGE, getRoutePath, type AppRoute } from "./docs/navigation";
import type { DocPage } from "./content";

const siteName = "Codex Kit";
const siteUrl = "https://codexkit.xyz";
const defaultTitle = "Codex Kit - AI Agent Capability Expansion Toolkit";
const defaultDescription =
  "Codex Kit helps teams scaffold Codex repositories with skills, workflows, subagents, and managed updates.";
const defaultKeywords =
  "Codex Kit, AI agent toolkit, Codex scaffold, AI workflow, Codex skills, Codex plugins";
const defaultImage = `${siteUrl}/codex-kit-plugin-install.png`;

export type SeoPayload = {
  title: string;
  description: string;
  keywords: string;
  url: string;
  type: "website" | "article";
  robots: string;
  schema: Record<string, unknown>;
};

export function applySeo(route: AppRoute, page: DocPage) {
  const payload = getSeoPayload(route, page);

  document.documentElement.lang = "en";
  document.title = payload.title;

  setMetaTag("name", "description", payload.description);
  setMetaTag("name", "keywords", payload.keywords);
  setMetaTag("name", "robots", payload.robots);
  setMetaTag("property", "og:type", payload.type);
  setMetaTag("property", "og:site_name", siteName);
  setMetaTag("property", "og:title", payload.title);
  setMetaTag("property", "og:description", payload.description);
  setMetaTag("property", "og:url", payload.url);
  setMetaTag("property", "og:image", defaultImage);
  setMetaTag("property", "og:image:alt", `${siteName} preview`);
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", payload.title);
  setMetaTag("name", "twitter:description", payload.description);
  setMetaTag("name", "twitter:image", defaultImage);

  setLinkTag("canonical", payload.url);
  setJsonLd(payload.schema);
}

export function getSeoPayload(route: AppRoute, page: DocPage): SeoPayload {
  return route.view === "docs" ? getDocsSeo(page) : getLandingSeo();
}

function getLandingSeo(): SeoPayload {
  return {
    title: defaultTitle,
    description: defaultDescription,
    keywords: defaultKeywords,
    url: `${siteUrl}/`,
    type: "website",
    robots: "index,follow",
    schema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteName,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "macOS, Windows, Linux",
      description: defaultDescription,
      url: `${siteUrl}/`,
      image: defaultImage,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD"
      },
      sameAs: [
        "https://github.com/daominhhiep/codex-kit",
        "https://www.npmjs.com/package/@longkunz/codex-kit"
      ]
    }
  };
}

function getDocsSeo(page: DocPage): SeoPayload {
  const docPath = page.slug === "not-found" ? getRoutePath({ view: "docs", slug: DEFAULT_PAGE }) : getRoutePath({ view: "docs", slug: page.slug });
  const url = `${siteUrl}${docPath}`;
  const isNotFound = page.slug === "not-found";

  return {
    title: `${page.title} | Codex Kit Docs`,
    description: page.summary,
    keywords: `${page.title}, Codex Kit docs, ${defaultKeywords}`,
    url,
    type: "article",
    robots: isNotFound ? "noindex,nofollow" : "index,follow",
    schema: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: page.title,
      description: page.summary,
      url,
      author: {
        "@type": "Person",
        name: "Dao Minh Hiep"
      },
      publisher: {
        "@type": "Organization",
        name: siteName
      },
      isPartOf: {
        "@type": "WebSite",
        name: siteName,
        url: `${siteUrl}/`
      }
    }
  };
}

function setMetaTag(attribute: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute("href", href);
}

function setJsonLd(schema: Record<string, unknown>) {
  const id = "codex-kit-jsonld";
  let tag = document.head.querySelector<HTMLScriptElement>(`script#${id}`);

  if (!tag) {
    tag = document.createElement("script");
    tag.id = id;
    tag.type = "application/ld+json";
    document.head.appendChild(tag);
  }

  tag.textContent = JSON.stringify(schema);
}
