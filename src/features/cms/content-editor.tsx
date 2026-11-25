"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type MouseEvent } from "react";

import { publishEditorRevision, restoreEditorRevision, saveEditorDraft } from "@/app/admin/content/actions";
import {
  displayDate, fieldLabel, optionalFields, orderedFields, publicationStatus, titleLabel,
  type EditorArea, type EditorValues, type FieldErrors, type FieldRules,
} from "./editor-fields";
import { ConfirmEditorAction, EditorField, EditorLabel, MediaEditorField } from "./editor-controls";
import { editorButton, editorInput, editorLink, editorPrimary } from "./editor-style";
import type { CmsContent, CmsContentActivity, CmsMediaChoice, CmsPublicationAction, CmsRevisionSummary } from "./server/schema";

type Props = {
  area: EditorArea;
  areaLabel: string;
  owner: string;
  fullAdmin: boolean;
  initial: EditorValues;
  rules: FieldRules;
  media: CmsMediaChoice[];
  record?: CmsContent;
  draftVersion?: number;
  revisions?: CmsRevisionSummary[];
  activity?: CmsContentActivity[];
  earlierHistory?: string;
  result?: string;
};

const notices: Record<string, string> = {
  saved: "Draft saved.",
  restored: "Revision restored as a new draft. The published version is unchanged.",
  publish: "Published. This is the current published revision.",
  unpublish: "Unpublished. The saved draft is still available.",
  archive: "Archived. Revision history is retained.",
};

function watchStorage(update: () => void) {
  window.addEventListener("storage", update);
  return () => window.removeEventListener("storage", update);
}

function noStorage() { return null; }

function recoverValues(raw: string | null, initial: EditorValues, expected: string | null) {
  try {
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (payload.expected !== expected || !payload.values || typeof payload.values !== "object") return null;
    return Object.fromEntries(Object.entries(initial).map(([key, value]) => [
      key, typeof payload.values[key] === "string" ? payload.values[key] : value,
    ]));
  } catch {
    return null;
  }
}

export function ContentEditor({ area, areaLabel, owner, fullAdmin, initial, rules, media, record,
  draftVersion, revisions = [], activity = [], earlierHistory, result }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [feedback, setFeedback] = useState<{ message: string; errors?: FieldErrors }>();
  const [choices, setChoices] = useState(media);
  const [uploads, setUploads] = useState(0);
  const [finished, setFinished] = useState(false);
  const [pending, transition] = useTransition();
  const operationIds = useRef<Partial<Record<CmsPublicationAction, string>>>({});
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const expected = record?.draft_revision_id ?? null;
  const storageKey = "gdgoc-cms-edit:" + owner + ":" + area + ":" + (record?.id ?? "new");
  const readStorage = useCallback(() => {
    try { return sessionStorage.getItem(storageKey); } catch { return null; }
  }, [storageKey]);
  const stored = useSyncExternalStore(watchStorage, readStorage, noStorage);
  const recovery = recoverValues(stored, initial, expected);
  const initialJson = JSON.stringify(initial);
  const dirty = !finished && JSON.stringify(values) !== initialJson;
  const locked = !!record?.archived_at;
  const busy = pending || uploads > 0 || finished;
  const areaUrl = "/admin/content/" + area;
  const itemUrl = record ? areaUrl + "/" + record.id : areaUrl + "/new";

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function beforeLink(event: MouseEvent<HTMLElement>) {
    if (!dirty || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        !(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
    if (anchor && (!anchor.target || anchor.target === "_self") && anchor.origin === window.location.origin &&
        !window.confirm("Leave this editor with unsaved changes?")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function clearRecovery() {
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
  }

  function change(key: string, value: string) {
    const next = { ...values, [key]: value };
    try {
      if (JSON.stringify(next) === initialJson) clearRecovery();
      else sessionStorage.setItem(storageKey, JSON.stringify({ expected, values: next }));
    } catch { /* The form still works without browser storage. */ }
    setValues(next);
    if (feedback?.errors?.[key]) {
      const remaining = { ...feedback.errors };
      delete remaining[key];
      setFeedback(Object.keys(remaining).length ? { ...feedback, errors: remaining } : undefined);
    }
  }

  function showError(message: string, errors?: FieldErrors) {
    const field = errors && Object.keys(errors)[0];
    setFeedback({ message, errors });
    requestAnimationFrame(() => {
      const input = field ? document.getElementById("editor-" + field) : null;
      const details = input?.closest("details");
      if (details) details.open = true;
      if (input) input.focus();
      else errorSummary.current?.focus();
    });
  }

  function run(action: () => ReturnType<typeof saveEditorDraft>, notice: string) {
    transition(async () => {
      setFeedback(undefined);
      try {
        const outcome = await action();
        if (!outcome.ok) {
          showError(outcome.message, outcome.errors);
          return;
        }
        clearRecovery();
        setFinished(true);
        router.replace(areaUrl + "/" + outcome.id + "?result=" + notice);
        router.refresh();
      } catch {
        showError("The request could not finish. Check your connection and try again.");
      }
    });
  }

  function publish(action: CmsPublicationAction) {
    if (!record) return;
    const key = operationIds.current[action] ??= crypto.randomUUID();
    run(() => publishEditorRevision({
      p_content_id: record.id, p_operation_id: key, p_action: action,
      p_revision_id: action === "unpublish" ? null : record.draft_revision_id,
      p_expected_published_id: record.published_revision_id,
    }), action);
  }

  function renderField(key: string) {
    const rule = rules[key];
    const error = feedback?.errors?.[key];
    const control = { name: key, rule, value: values[key], error, change: (value: string) => change(key, value) };
    if (rule.type === "image" || rule.type === "pdf") {
      return <MediaEditorField key={key} {...control} area={area} alt={values[key + ".alt"] ?? ""} choices={choices}
        changeAlt={(text) => change(key + ".alt", text)}
        uploaded={(file) => setChoices((current) => [file, ...current.filter((item) => item.media_id !== file.media_id)])}
        uploadPending={(offset) => setUploads((count) => count + offset)} />;
    }
    return <EditorField key={key} {...control} />;
  }

  const fields = orderedFields(rules);
  const isSecondary = (key: string) => optionalFields.includes(key) || (key === "category" && !rules[key].required);
  const notice = result && Object.hasOwn(notices, result) ? notices[result] : "";
  const canRecover = !dirty && !locked && recovery && JSON.stringify(recovery) !== initialJson;
  const confirmDisabled = busy || dirty;

  return (
    <div className="space-y-7" onClickCapture={beforeLink}>
      <nav aria-label="Content" className="flex flex-wrap gap-4">
        <Link href="/admin" className={editorLink}>Dashboard</Link>
        <Link href={areaUrl} className={editorLink}>{areaLabel}</Link>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold tracking-tight">
            {record ? initial.title || "Untitled draft" : "New draft"}
          </h1>
          <p className="mt-2 text-sm text-foreground/75">
            {record ? publicationStatus(record) + " · Revision " + draftVersion : areaLabel}
          </p>
        </div>
        {record && (
          <Link href={itemUrl + "/preview"} prefetch={false} className={editorButton}>Preview saved draft</Link>
        )}
      </header>

      {notice && !feedback && <p role="status" className="rounded-md border border-primary/35 bg-primary/10 px-4 py-3 text-sm font-medium">{notice}</p>}
      {feedback && (
        <p role="alert" tabIndex={-1} ref={errorSummary} className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium">
          {feedback.message}
        </p>
      )}
      {canRecover && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/50 p-4">
          <p className="grow text-sm">This tab has unsaved edits for this draft.</p>
          <button type="button" className={editorButton} onClick={() => setValues(recovery)}>Recover unsaved edits</button>
          <button type="button" className={editorButton} onClick={() => { clearRecovery(); setValues({ ...initial }); }}>Discard copy</button>
        </div>
      )}

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {locked ? (
          <section className="space-y-2 border-b pb-5">
            <h2 className="text-lg font-semibold">Archived content</h2>
            <p className="text-sm">Open the saved preview or review earlier revisions in History.</p>
          </section>
        ) : (
          <form className="min-w-0 space-y-6" noValidate onSubmit={(event) => {
            event.preventDefault();
            if (!busy) run(() => saveEditorDraft(area, record?.id ?? null, expected, values), "saved");
          }}>
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-y bg-background py-3">
              <button type="submit" disabled={busy} className={editorPrimary}>{pending ? "Working…" : "Save draft"}</button>
              <p aria-live="polite" className="text-sm text-foreground/75">
                {dirty ? "Unsaved changes" : record ? "All edits saved" : "Save to create this draft"}
              </p>
            </div>
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              <legend className="sr-only">Draft fields</legend>
              <div className="space-y-2">
                <EditorLabel id="editor-title" name={titleLabel(area)} hint="Required to publish." error={feedback?.errors?.title} />
                <input id="editor-title" value={values.title} aria-describedby="editor-title-help"
                  aria-invalid={feedback?.errors?.title ? true : undefined} className={editorInput}
                  onChange={(event) => change("title", event.target.value)} />
              </div>
              <div className="space-y-2">
                <EditorLabel id="editor-slug" name="Slug" hint="Required to publish. Use lowercase letters, numbers and hyphens."
                  error={feedback?.errors?.slug} />
                <input id="editor-slug" value={values.slug} aria-describedby="editor-slug-help"
                  aria-invalid={feedback?.errors?.slug ? true : undefined} className={editorInput}
                  onChange={(event) => change("slug", event.target.value)} />
              </div>
              {fields.filter((key) => !isSecondary(key)).map(renderField)}
              {fields.some(isSecondary) && <details className="min-w-0 rounded-md border p-4">
                <summary className="cursor-pointer rounded-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">Taxonomy, display and metadata</summary>
                <div className="mt-4 space-y-5">{fields.filter(isSecondary).map(renderField)}</div>
              </details>}
            </fieldset>
          </form>
        )}

        <aside className="min-w-0 space-y-6">
          {!locked && (
            <section className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <h2 className="text-base font-semibold">Publication</h2>
              <p className="text-sm text-foreground/80">
                {fullAdmin
                  ? dirty || !record ? "Save the draft before publishing, unpublishing, or archiving." : "Review the saved preview before publishing."
                  : "Save a draft for a full administrator to review."}
              </p>
              {record && fullAdmin && (
                <div className="flex flex-wrap gap-2">
                  {record.published_revision_id !== record.draft_revision_id && (
                    <ConfirmEditorAction label="Publish" description="Make this saved revision visible to public readers."
                      disabled={confirmDisabled} confirm={() => publish("publish")} />
                  )}
                  {record.published_revision_id && (
                    <ConfirmEditorAction label="Unpublish" description="Remove the live version from public view and keep the draft and history."
                      disabled={confirmDisabled} confirm={() => publish("unpublish")} />
                  )}
                  <ConfirmEditorAction label="Archive" description="Remove this record from public view and keep its history. It will be read only."
                    disabled={confirmDisabled} confirm={() => publish("archive")} />
                  <Link href={"/admin/schedule?content=" + record.id} className={editorButton}>Schedule publication</Link>
                </div>
              )}
            </section>
          )}
          {record && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold">History</h2>
              <ol className="divide-y border-y">
                {revisions.map((revision) => (
                  <li key={revision.id} className="space-y-1.5 py-3 text-sm">
                    <p className="break-words font-medium">Revision {revision.version} · {revision.title || "Untitled"}</p>
                    <p className="text-xs text-foreground/75">{displayDate(revision.saved_at)} · {revision.saved_by === owner ? "You" : "Editor " + revision.saved_by.slice(0, 8)}</p>
                    <Link className={editorLink} prefetch={false} href={itemUrl + "/preview?revision=" + revision.id}>Preview revision {revision.version}</Link>
                    {!locked && revision.id !== expected && (
                      <ConfirmEditorAction label="Restore revision" description="Copy this snapshot into a new draft. The published version will stay as it is."
                        confirm={() => run(() => restoreEditorRevision(record.id, record.draft_revision_id, revision.id), "restored")}
                        disabled={confirmDisabled}>Restore revision {revision.version}</ConfirmEditorAction>
                    )}
                  </li>
                ))}
              </ol>
              {earlierHistory && <Link href={earlierHistory} className={editorLink}>Earlier history</Link>}
              <details className="min-w-0 rounded-md border p-3">
                <summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">Activity log</summary>
                <ul className="mt-3 space-y-2">
                  {activity.map((entry) => (
                    <li key={entry.id} className="text-sm">
                      <p className="capitalize">{fieldLabel(entry.action)}</p>
                      <p className="text-xs text-foreground/75">{displayDate(entry.occurred_at)} · {entry.actor_id === owner ? "You" : "Editor " + entry.actor_id.slice(0, 8)}</p>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
