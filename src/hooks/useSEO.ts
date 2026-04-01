import { useEffect } from "react";

interface SEOOptions {
  title: string;
  description?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: "summary" | "summary_large_image";
}

const DEFAULT_DESCRIPTION =
  "Cloud-based development platform for building, deploying, and showcasing projects instantly.";
const DEFAULT_OG_IMAGE =
  "https://image2url.com/r2/default/images/1775049565777-edb4a68b-6591-4227-80b7-53b5e322c58b.png";

function setMeta(property: string, content: string, useProperty = false) {
  const selector = useProperty
    ? `meta[property="${property}"]`
    : `meta[name="${property}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    if (useProperty) {
      el.setAttribute("property", property);
    } else {
      el.setAttribute("name", property);
    }
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  ogImage = DEFAULT_OG_IMAGE,
  ogUrl,
  twitterCard = "summary_large_image",
}: SEOOptions) {
  useEffect(() => {
    // Page title
    document.title = title;

    // Standard meta
    setMeta("description", description);
    setMeta("theme-color", "#0a0a0a");

    // OG tags
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:image", ogImage, true);
    setMeta("og:type", "website", true);
    if (ogUrl) setMeta("og:url", ogUrl, true);

    // Twitter tags
    setMeta("twitter:card", twitterCard);
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);

    return () => {
      document.title = "DevOS — Code in the Cloud";
    };
  }, [title, description, ogImage, ogUrl, twitterCard]);
}
