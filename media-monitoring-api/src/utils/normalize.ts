// source alias
import type { MentionInput, NormalizedMention } from "../types/mention.js";

export function normalizeMention(mention: MentionInput): NormalizedMention {
  const sourceNormalized = normalizeSource(mention.source);
  const urlNormalized = normalizeUrl(mention.url);

  return {
    external_id: mention.external_id.trim(),

    source: getSourceDisplayName(sourceNormalized),

    source_normalized: sourceNormalized,

    title: normalizeTitle(mention.title),

    content: normalizeContent(mention.content),

    url: mention.url.trim(),

    url_normalized: urlNormalized,

    author: mention.author?.trim() || null,

    published_at: parsePublishedAt(mention.published_at),

    engagement: normalizeEngagement(mention.engagement),
  };
}

const SOURCE_ALIASES: Record<string, string> = {
  "the star": "the star",
  thestar: "the star",

  "new straits times": "new straits times",

  twitter: "twitter",

  facebook: "facebook",

  instagram: "instagram",

  malaysiakini: "malaysiakini",
};

//Normalize Source
export function normalizeSource(source: string): string {
  const normalized = source.trim().toLowerCase();

  return SOURCE_ALIASES[normalized] ?? normalized;
}

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  "the star": "The Star",
  "new straits times": "New Straits Times",
  twitter: "Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
  malaysiakini: "Malaysiakini",
};

export function getSourceDisplayName(normalizedSource: string): string {
  return SOURCE_DISPLAY_NAMES[normalizedSource] ?? normalizedSource;
}

export function normalizeContent(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEngagement(engagement: number | string): number {
  if (typeof engagement === "number") {
    return engagement;
  }

  const normalized = engagement.replace(/,/g, "").trim();

  const value = Number(normalized);

  if (!Number.isInteger(value)) {
    throw new Error(`Invalid engagement value: ${engagement}`);
  }

  return value;
}

//Normalize Title
export function normalizeTitle(title: string | null): string | null {
  if (title === null) {
    return null;
  }

  const normalized = title.trim();

  return normalized === "" ? null : normalized;
}

//URL Normalize
export function normalizeUrl(url: string): string {
  const normalized = url.trim();

  const parsed = new URL(normalized);

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  return parsed.toString();
}

// Normalize Tanggal/ Date
export function parsePublishedAt(value: string | number | null): Date | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return new Date(value * 1000);
  }

  const dateOnlyMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (dateOnlyMatch) {
    const [, day, month, year] = dateOnlyMatch;

    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid published_at: ${value}`);
  }

  return date;
}
