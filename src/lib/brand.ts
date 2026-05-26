export const COMPANY_NAME = "KONTYRA";
export const COMPANY_DOMAIN = "kontyra.name.ng";

export const PRODUCT_NAME = "DevOS";
export const PRODUCT_BRAND_NAME = `${PRODUCT_NAME} by ${COMPANY_NAME}`;
export const PRODUCT_NAV_LABEL = `${COMPANY_NAME} / ${PRODUCT_NAME}`;
export const PRODUCT_DESCRIPTION =
  `${PRODUCT_BRAND_NAME} is a cloud-based developer platform for building, deploying, and showcasing projects instantly.`;

export const DEVOS_PRODUCT_HOST = `devos.${COMPANY_DOMAIN}`;
export const DEVOS_CANONICAL_ORIGIN = `https://${DEVOS_PRODUCT_HOST}`;

export const RESERVED = [
  "www",
  "docs",
  "status",
  "api",
  "auth",
  "admin",
  "devos",
  "kontyra",
  "org",
];

export const RESERVED_SUBDOMAINS = new Set(RESERVED);

const LEGACY_ROOT_HOSTS = new Set(["devos.zone.id", "devos.name.ng", "devos.app"]);

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeLabel(value: string) {
  return trimSlashes(value).toLowerCase();
}

export function buildDevosUrl(path = "") {
  const normalizedPath = trimSlashes(path);
  return normalizedPath ? `${DEVOS_CANONICAL_ORIGIN}/${normalizedPath}` : DEVOS_CANONICAL_ORIGIN;
}

export function buildPortfolioUrl(username: string) {
  return `https://${normalizeLabel(username)}.${DEVOS_PRODUCT_HOST}`;
}

export function buildProjectUrl(username: string, projectSlug: string) {
  return `https://${normalizeLabel(projectSlug)}.${normalizeLabel(username)}.${DEVOS_PRODUCT_HOST}`;
}

export function buildOrgUrl(slug: string) {
  return `https://${normalizeLabel(slug)}.org.${DEVOS_PRODUCT_HOST}`;
}

export function buildOrgProjectUrl(orgSlug: string, projectSlug: string) {
  return `https://${normalizeLabel(projectSlug)}.${normalizeLabel(orgSlug)}.org.${DEVOS_PRODUCT_HOST}`;
}

export function isLocalDevelopmentHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  );
}

export type DevosHostTarget =
  | { kind: "root" }
  | { kind: "app" }
  | { kind: "portfolio"; username: string }
  | { kind: "project"; username: string; projectSlug: string }
  | { kind: "organization"; orgSlug: string }
  | { kind: "org-project"; orgSlug: string; projectSlug: string }
  | { kind: "reserved" }
  | { kind: "unknown" };

export function parseDevosHost(hostname: string): DevosHostTarget {
  const normalizedHost = hostname.toLowerCase();
  if (isLocalDevelopmentHost(normalizedHost) || normalizedHost === DEVOS_PRODUCT_HOST) {
    return { kind: "app" };
  }

  if (normalizedHost === COMPANY_DOMAIN) {
    return { kind: "root" };
  }

  const suffix = `.devos.${COMPANY_DOMAIN}`;
  if (!normalizedHost.endsWith(suffix)) {
    return { kind: "unknown" };
  }

  const subdomainPart = normalizedHost.slice(0, -suffix.length);
  if (!subdomainPart) {
    return { kind: "unknown" };
  }

  const subdomains = subdomainPart.split(".").filter(Boolean).map(normalizeLabel);
  if (subdomains.length === 3 && subdomains[2] === "org") {
    const [projectSlug, orgSlug] = subdomains;
    if (RESERVED_SUBDOMAINS.has(projectSlug) || RESERVED_SUBDOMAINS.has(orgSlug)) {
      return { kind: "reserved" };
    }
    return { kind: "org-project", projectSlug, orgSlug };
  }

  if (subdomains.length === 2 && subdomains[1] === "org") {
    const [orgSlug] = subdomains;
    if (RESERVED_SUBDOMAINS.has(orgSlug)) {
      return { kind: "reserved" };
    }
    return { kind: "organization", orgSlug };
  }

  if (subdomains.length === 2) {
    const [projectSlug, username] = subdomains;
    if (RESERVED_SUBDOMAINS.has(projectSlug) || RESERVED_SUBDOMAINS.has(username)) {
      return { kind: "reserved" };
    }
    return { kind: "project", projectSlug, username };
  }

  if (subdomains.length === 1) {
    const [username] = subdomains;
    if (RESERVED_SUBDOMAINS.has(username)) {
      return { kind: "reserved" };
    }
    return { kind: "portfolio", username };
  }

  return { kind: "unknown" };
}

export function isLegacyDevosHost(hostname: string) {
  if (LEGACY_ROOT_HOSTS.has(hostname)) return true;
  return (
    hostname.endsWith(".devos.name.ng") ||
    hostname.endsWith(".devos.zone.id")
  );
}

export function getLegacyRedirectUrl(hostname: string, pathname = "", search = ""): string | null {
  if (hostname.endsWith(".devos.name.ng")) {
    const parts = hostname.split(".");
    if (parts.length === 5) {
      const [projectSlug, username] = parts;
      return `${buildProjectUrl(username, projectSlug)}${pathname}${search}`;
    }
    if (parts.length === 4) {
      const [username] = parts;
      return `${buildPortfolioUrl(username)}${pathname}${search}`;
    }
  }

  if (hostname.endsWith(".devos.zone.id")) {
    const parts = hostname.split(".");
    if (parts.length === 5) {
      const [projectSlug, username] = parts;
      return `${buildProjectUrl(username, projectSlug)}${pathname}${search}`;
    }
    if (parts.length === 4) {
      const [username] = parts;
      return `${buildPortfolioUrl(username)}${pathname}${search}`;
    }
  }

  if (LEGACY_ROOT_HOSTS.has(hostname)) {
    if (pathname.startsWith("/@")) {
      const [, username, projectSlug] = pathname.split("/");
      if (projectSlug) {
        return `${buildProjectUrl(username.replace(/^@/, ""), projectSlug)}${search}`;
      }
      return `${buildPortfolioUrl(username.replace(/^@/, ""))}${search}`;
    }
    return `${DEVOS_CANONICAL_ORIGIN}${pathname}${search}`;
  }

  return null;
}
