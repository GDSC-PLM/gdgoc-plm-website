"use client";

import { useActionState, useState, type ReactNode } from "react";
import { changeSchedule } from "@/app/admin/schedule/actions";
import { editorInput, editorButton, editorPrimary } from "./editor-style";

export function QueueForm({ children, submit, primary = false }: {
  children: ReactNode; submit: string; primary?: boolean;
}) {
  const [error, action, pending] = useActionState(changeSchedule, "");
  return <form action={action} className="space-y-3">
    {children}
    {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
    <button disabled={pending} className={primary ? editorPrimary : editorButton}>{pending ? "Saving…" : submit}</button>
  </form>;
}

export function ScheduleForm({ id, draft, live, version, liveVersion }: {
  id: string; draft: string; live: string | null; version: number; liveVersion: number | null;
}) {
  const [local, setLocal] = useState("");
  const [zone, setZone] = useState("Asia/Manila");
  const [action, setAction] = useState(live === draft ? "unpublish" : "publish");
  return <QueueForm submit="Approve and schedule" primary>
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="draft" value={draft} />
    <input type="hidden" name="live" value={live ?? ""} />
    <div>
      <label className="block text-sm font-medium" htmlFor="schedule-action">Action</label>
      <select className={editorInput} id="schedule-action" name="action" value={action} onChange={event => setAction(event.target.value)}>
        {draft !== live && <option value="publish">Publish saved revision {version}</option>}
        {live && <option value="unpublish">Unpublish live revision {liveVersion}</option>}
      </select>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block min-w-0 text-sm font-medium">Local date and time
        <input required name="local" type="datetime-local" className={editorInput} value={local}
          onChange={event => setLocal(event.target.value)} />
      </label>
      <label className="block min-w-0 text-sm font-medium">Time zone
        <input required name="zone" className={editorInput} value={zone} maxLength={80}
          onChange={event => setZone(event.target.value)} placeholder="Asia/Manila" />
      </label>
    </div>
  </QueueForm>;
}
