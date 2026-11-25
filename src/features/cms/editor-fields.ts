import { cmsAreas, type CmsArea, type CmsFieldRule, type CmsJson, type CmsSnapshot } from "./server/schema";

export type EditorArea = Exclude<CmsArea, "settings">;
export const editorAreas = cmsAreas.filter((area): area is EditorArea => area !== "settings");
export const isEditorArea = (area: unknown): area is EditorArea =>
  typeof area === "string" && editorAreas.some((value) => value === area);

export const isCmsId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

export type FieldRules = Record<string, CmsFieldRule>;
export type EditorValues = Record<string, string>;
export type FieldErrors = Record<string, string>;

export const optionalFields = ["tags", "topics", "statusLabel", "sortOrder", "featured", "metaTitle", "metaDescription", "socialImage"];
const fieldOrder = ["category", "kind", "role", "startsAt", "endsAt", "mode", "venue", "issueLabel", "releaseDate",
  "description", "bio", "body", "answer", "instructions", "registrationUrl", "websiteUrl", "outboundUrl",
  "cover", "photo", "logo", "download", ...optionalFields];

const labels: Record<string, string> = {
  startsAt: "Starts at", endsAt: "Ends at", releaseDate: "Release date", issueLabel: "Issue label",
  registrationUrl: "Registration URL", websiteUrl: "Website URL", outboundUrl: "Game URL",
  statusLabel: "Status label", sortOrder: "Sort order", metaTitle: "SEO title",
  metaDescription: "SEO description", socialImage: "Social sharing image", download: "Zine PDF",
};

export function fieldLabel(key: string) {
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export const titleLabel = (area: EditorArea) =>
  area === "faq" ? "Question" : area === "board" || area === "haribots" ? "Name" : "Title";

export function orderedFields(rules: FieldRules) {
  return [...new Set([...fieldOrder, ...Object.keys(rules)])].filter((key) => Object.hasOwn(rules, key));
}

export function mediaUse(value: CmsJson) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !isCmsId(value.versionId)) return null;
  return { versionId: value.versionId, alt: typeof value.alt === "string" ? value.alt : "" };
}

export function editorValues(rules: FieldRules, draft?: CmsSnapshot): EditorValues {
  const values: EditorValues = { title: draft?.title ?? "", slug: draft?.slug ?? "" };
  for (const key of orderedFields(rules)) {
    const value = draft?.fields[key];
    const rule = rules[key];
    if (rule.type === "image" || rule.type === "pdf") {
      const use = value === undefined ? null : mediaUse(value);
      values[key] = use?.versionId ?? "";
      if (rule.type === "image") values[key + ".alt"] = use?.alt ?? "";
    } else if (Array.isArray(value)) {
      values[key] = value.filter((part) => typeof part === "string").join(", ");
    } else if (value !== null && typeof value !== "object" && value !== undefined) {
      values[key] = String(value);
    } else {
      values[key] = "";
    }
  }
  return values;
}

export function httpsLink(value: string) {
  if (!/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function parseEditorValues(rules: FieldRules, values: unknown, area: EditorArea) {
  const errors: FieldErrors = {};
  const fields: CmsSnapshot["fields"] = {};
  const input = values && typeof values === "object" && !Array.isArray(values)
    ? values as Record<string, unknown> : {};
  function raw(key: string) {
    const value = Object.hasOwn(input, key) ? input[key] : undefined;
    if (value === undefined) return "";
    if (typeof value === "string") return value;
    errors[key] = "Enter a valid value.";
    return "";
  }
  const title = raw("title").trim();
  const slug = raw("slug").trim();
  if (Array.from(title).length > 160) errors.title = "Use at most 160 characters for the " + titleLabel(area).toLowerCase() + ".";
  if (slug && (slug.length > 100 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))) {
    errors.slug = "Use up to 100 lowercase letters, numbers and single hyphens.";
  }

  for (const key of orderedFields(rules)) {
    const rule = rules[key];
    const value = raw(key);
    if (!value.trim()) continue;
    const trimmed = value.trim();
    if (rule.type === "image" || rule.type === "pdf") {
      const alt = rule.type === "image" ? raw(key + ".alt").trim() : "";
      if (!isCmsId(trimmed)) errors[key] = "Choose a file from the media library.";
      else if (Array.from(alt).length > 250) errors[key] = "Use at most 250 characters for alt text.";
      else fields[key] = rule.type === "image" ? { versionId: trimmed, alt } : { versionId: trimmed };
    } else if (rule.type === "line" || rule.type === "markdown") {
      if (Array.from(value).length > rule.max) errors[key] = "Use at most " + rule.max + " characters.";
      else fields[key] = rule.type === "line" ? trimmed : value;
    } else if (rule.type === "labels") {
      const labels = value.split(",").map((label) => label.trim()).filter(Boolean);
      if (labels.length > 12 || labels.some((label) => Array.from(label).length > 40)) {
        errors[key] = "Use up to 12 comma-separated labels with at most 40 characters each.";
      } else fields[key] = labels;
    } else if (rule.type === "order") {
      if (!/^\d{1,4}$/.test(trimmed)) errors[key] = "Enter a whole number from 0 to 9999.";
      else fields[key] = Number(trimmed);
    } else if (rule.type === "boolean") {
      if (trimmed !== "true" && trimmed !== "false") errors[key] = "Choose whether to feature this item.";
      else fields[key] = trimmed === "true";
    } else if (rule.type === "choice") {
      if (!rule.values.includes(trimmed)) errors[key] = "Choose one of the listed options.";
      else fields[key] = trimmed;
    } else if (rule.type === "https" || rule.type === "registration" || rule.type === "game") {
      if (!httpsLink(trimmed)) errors[key] = "Enter a valid HTTPS link.";
      else fields[key] = trimmed;
    } else {
      fields[key] = trimmed;
    }
  }
  return { snapshot: { title, slug: slug || null, fields }, errors };
}

export function publicationStatus(item: { archived_at: string | null; published_revision_id: string | null; draft_revision_id: string }) {
  if (item.archived_at) return "Archived";
  if (!item.published_revision_id) return "Draft";
  return item.published_revision_id === item.draft_revision_id ? "Published" : "Published with draft changes";
}

export function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
  }).format(date);
}
