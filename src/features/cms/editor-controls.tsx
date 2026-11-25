"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";

import { fieldLabel, type EditorArea } from "./editor-fields";
import { editorButton, editorInput } from "./editor-style";
import type { CmsFieldRule, CmsMediaChoice } from "./server/schema";

export function EditorLabel({ id, name, hint, error }: {
  id: string; name: string; hint?: string; error?: string;
}) {
  return (
    <>
      <label htmlFor={id} className="block text-sm font-semibold">{name}</label>
      {(error || hint) && (
        <p id={id + "-help"} className={error ? "text-sm font-medium text-destructive" : "text-sm text-foreground/70"}>
          {error || hint}
        </p>
      )}
    </>
  );
}

type EditorFieldProps = {
  name: string;
  rule: CmsFieldRule;
  value: string;
  error?: string;
  change: (value: string) => void;
};

export function EditorField({ name, rule, value, error, change }: EditorFieldProps) {
  const id = "editor-" + name;
  const hint = [
    rule.required && "Required to publish.",
    rule.type === "instant" && "Include a UTC offset, for example 2026-12-11T18:30+08:00.",
    rule.type === "labels" && "Separate labels with commas.",
    name === "venue" && "Required for in-person and hybrid events.",
  ].filter(Boolean).join(" ");
  const a11y = { id, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? id + "-help" : undefined };
  const source = useRef<HTMLTextAreaElement>(null);

  function format(command: string) {
    const textarea = source.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const selected = textarea.value.slice(start, end);
    const selectedText = selected || "text";
    const insert = command === "Bold" ? "**" + selectedText + "**"
      : command === "Italic" ? "*" + selectedText + "*"
      : command === "Heading" ? "\n## " + (selected || "Heading") + "\n"
      : command === "List" ? "\n" + selectedText.split("\n").map((line) => "- " + line).join("\n") + "\n"
      : "[" + selectedText + "](https://example.com)";
    change(textarea.value.slice(0, start) + insert + textarea.value.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + insert.length);
    });
  }

  if (rule.type === "boolean") {
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input {...a11y} type="checkbox" className="size-4 accent-primary" checked={value === "true"}
            onChange={(event) => change(event.target.checked ? "true" : "")} />
          {fieldLabel(name)}
        </label>
        {error && <p id={id + "-help"} className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      <EditorLabel id={id} name={fieldLabel(name)} hint={hint} error={error} />
      {rule.type === "markdown" ? (
        <>
          <div role="group" aria-label={fieldLabel(name) + " formatting"} className="flex flex-wrap gap-2">
            {["Bold", "Italic", "Heading", "List", "Link"].map((command) => (
              <button key={command} type="button" className={editorButton} onClick={() => format(command)}>{command}</button>
            ))}
          </div>
          <textarea {...a11y} ref={source} rows={7} className={editorInput + " resize-y"} value={value}
            onChange={(event) => change(event.target.value)} />
        </>
      ) : rule.type === "choice" ? (
        <select {...a11y} className={editorInput} value={value} onChange={(event) => change(event.target.value)}>
          <option value="">Select an option</option>
          {rule.values.map((option) => (
            <option key={option} value={option}>{fieldLabel(option.replaceAll("-", " "))}</option>
          ))}
        </select>
      ) : (
        <input {...a11y} className={editorInput} value={value} type={rule.type === "date" ? "date" : "text"}
          inputMode={rule.type === "order" ? "numeric" : ["https", "game", "registration"].includes(rule.type) ? "url" : undefined}
          onChange={(event) => change(event.target.value)} />
      )}
    </div>
  );
}

export function MediaEditorField({ area, name, rule, value, alt, error, choices, change, changeAlt, uploaded, uploadPending }: {
  area: EditorArea; name: string; rule: CmsFieldRule; value: string; alt: string; error?: string;
  choices: CmsMediaChoice[]; change: (value: string) => void; changeAlt: (value: string) => void;
  uploaded: (file: CmsMediaChoice) => void; uploadPending: (change: number) => void;
}) {
  const id = "editor-" + name;
  const pdf = rule.type === "pdf";
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const fileInput = useRef<HTMLInputElement>(null);
  const options = choices.filter((choice) => (choice.mime === "application/pdf") === pdf);
  const selected = options.find((choice) => choice.version_id === value);

  async function upload(replacement?: string) {
    if (!file || busy) return;
    setBusy(true);
    uploadPending(1);
    setFeedback(undefined);
    try {
      const query = new URLSearchParams({ area, ...(replacement ? { mediaId: replacement } : {}) });
      const response = await fetch("/admin/media?" + query, {
        method: "POST", body: file, redirect: "manual",
        headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
      });
      if (!response.ok) {
        const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
        setFeedback({ text: data?.error ?? "Upload failed. Check your access and try again.", error: true });
        return;
      }
      const media = await response.json() as CmsMediaChoice;
      uploaded(media);
      change(media.version_id);
      setFile(undefined);
      if (fileInput.current) fileInput.current.value = "";
      setFeedback({ text: "File uploaded and selected. Save the draft to keep this selection." });
    } catch {
      setFeedback({ text: "The upload was interrupted. Try again.", error: true });
    } finally {
      setBusy(false);
      uploadPending(-1);
    }
  }

  const hint = (rule.required ? "Required to publish. " : "") + (pdf ? "PDF up to 10 MiB." : "JPEG, PNG or WebP up to 5 MiB.");
  return (
    <div className="min-w-0 space-y-2">
      <EditorLabel id={id} name={fieldLabel(name)} hint={hint} error={error} />
      <select id={id} value={value} className={editorInput} aria-invalid={error ? true : undefined}
        aria-describedby={id + "-help"} onChange={(event) => change(event.target.value)}>
        <option value="">No file selected</option>
        {value && !selected && <option value={value}>Selected earlier file version</option>}
        {options.map((choice) => (
          <option key={choice.version_id} value={choice.version_id}>{choice.original_name}</option>
        ))}
      </select>
      {value && !pdf && (
        <div className="grid min-w-0 items-start gap-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
          <Image unoptimized src={"/admin/media/" + value} width={80} height={56} alt=""
            className="h-14 w-20 rounded-md border bg-muted object-cover" />
          <div className="min-w-0 space-y-2">
            <label htmlFor={id + "-alt"} className="block text-sm font-medium">{fieldLabel(name)} alt text</label>
            <input id={id + "-alt"} value={alt} className={editorInput} placeholder="Leave blank for decorative images"
              onChange={(event) => changeAlt(event.target.value)} maxLength={250} />
          </div>
        </div>
      )}
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary">Upload a file</summary>
        <div className="mt-3 space-y-3">
          <label htmlFor={id + "-file"} className="sr-only">{fieldLabel(name)} upload file</label>
          <input id={id + "-file"} ref={fileInput} type="file" className="block min-h-11 w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-2"
            accept={pdf ? "application/pdf" : "image/jpeg,image/png,image/webp"}
            onChange={(event) => setFile(event.target.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={editorButton} disabled={!file || busy} onClick={() => upload()}>
              {busy ? "Uploading…" : "Upload as new"}
            </button>
            {selected && (
              <button type="button" className={editorButton} disabled={!file || busy} onClick={() => upload(selected.media_id)}>
                Upload as replacement
              </button>
            )}
          </div>
        </div>
      </details>
      {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "text-sm text-destructive" : "text-sm"}>{feedback.text}</p>}
    </div>
  );
}

export function ConfirmEditorAction({ label, description, disabled, confirm, children }: {
  label: string; description: string; disabled: boolean; confirm: () => void; children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <div>
      <button type="button" className={editorButton} disabled={disabled} onClick={() => dialog.current?.showModal()}>
        {children ?? label}
      </button>
      <dialog ref={dialog} aria-label={label}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border bg-background p-5 text-foreground backdrop:bg-black/45">
        <h2 className="text-lg font-semibold">{label}?</h2>
        <p className="mt-2 text-sm leading-relaxed">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={editorButton} autoFocus onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="button" className={editorButton} disabled={disabled} onClick={() => {
            dialog.current?.close();
            confirm();
          }}>Confirm {label.toLowerCase()}</button>
        </div>
      </dialog>
    </div>
  );
}
