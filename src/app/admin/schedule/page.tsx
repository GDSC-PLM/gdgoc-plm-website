import Link from "next/link";
import { notFound } from "next/navigation";
import { isCmsId } from "@/features/cms/editor-fields";
import { editorInput, editorLink } from "@/features/cms/editor-style";
import { QueueForm, ScheduleForm } from "@/features/cms/schedule-form";
import { requireCmsAccess } from "@/features/cms/server/access";
import { getCmsContent, getCmsRevision } from "@/features/cms/server/content";
import type { CmsJob } from "@/features/cms/server/schema";

const results: Record<string, string> = {
  publish: "Publication scheduled.", unpublish: "Scheduled to unpublish.", cancel: "Job cancelled.",
  assign: "Job assigned. The new administrator must review and approve it.", approve: "Job approved for execution.",
};
const states: Record<CmsJob["status"], string> = {
  ready: "Scheduled", unassigned: "Paused · unassigned", awaiting_approval: "Paused · awaiting approval",
  executed: "Executed", blocked: "Blocked · schedule again after review", cancelled: "Cancelled",
};

async function NewSchedule({ id }: { id: string }) {
  if (!isCmsId(id)) notFound();
  const item = await getCmsContent(id);
  if (!item || item.archived_at) notFound();
  const draft = await getCmsRevision(id, item.draft_revision_id);
  const live = item.published_revision_id && await getCmsRevision(id, item.published_revision_id);
  if (!draft) notFound();
  const path = "/admin/content/" + item.area + "/" + id;
  return <section className="max-w-2xl space-y-4 rounded-lg border p-4 sm:p-6">
    <h2 className="break-words text-xl font-semibold">{draft.title || "Untitled draft"}</h2>
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      <Link className={editorLink} href={path + "/preview?revision=" + draft.id}>Review saved revision {draft.version}</Link>
      {live && live.id !== draft.id && <Link className={editorLink} href={path + "/preview?revision=" + live.id}>Review live revision {live.version}</Link>}
    </div>
    <ScheduleForm id={id} draft={draft.id} version={draft.version} live={item.published_revision_id} liveVersion={live ? live.version : null} />
  </section>;
}

export default async function SchedulePage({ searchParams }: PageProps<"/admin/schedule">) {
  const { client, userId } = await requireCmsAccess("publish");
  const query = await searchParams;
  const closed = query.closed === "1";
  const before = Number(query.before);
  const listing = await client.rpc("cms_list_jobs", {
    p_closed: closed, p_before: Number.isSafeInteger(before) && before > 0 ? before : undefined,
  });
  if (listing.error) throw new Error("Could not load the publication queue.");
  const jobs = listing.data;
  const officers = jobs.some(job => job.status === "unassigned") ? await client.rpc("cms_list_access") : null;
  if (officers?.error) throw new Error("Could not load active administrators.");
  const admins = officers?.data.filter(row => row.full_admin && row.accepted_at && !row.revoked_at) ?? [];
  const result = typeof query.result === "string" && Object.hasOwn(results, query.result) && results[query.result];
  return <div className="mx-auto max-w-4xl space-y-6">
    <Link className={editorLink} href="/admin">Dashboard</Link>
    <h1 className="text-3xl font-semibold tracking-tight">Scheduled publications</h1>
    {result && <p role="status" className="rounded-md bg-muted px-4 py-3 text-sm">{result}</p>}
    {typeof query.content === "string" && <NewSchedule id={query.content} />}
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 border-b pb-3">
        <h2 className="text-xl font-semibold">{closed ? "Finished jobs" : "Pending jobs"}</h2>
        <Link className={editorLink} href={closed ? "/admin/schedule" : "/admin/schedule?closed=1"}>
          {closed ? "View pending jobs" : "View finished jobs"}
        </Link>
      </div>
      {jobs.length === 0 && <p className="text-sm">{closed ? "No finished jobs on this page." : "No pending jobs on this page. Open a saved item to schedule publication."}</p>}
      <ul className="divide-y">
        {jobs.map(job => <li key={job.id} className="space-y-3 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="min-w-0 break-words font-semibold">{job.action === "publish" ? "Publish" : "Unpublish"} · {job.title}</h3>
            <span className="text-sm font-medium">{states[job.status]}</span>
          </div>
          <p className="break-words text-sm">
            <time dateTime={job.due_at}>{job.local_minute.slice(0,16).replace("T", " ")} {job.zone}</time>
            {job.assignee_email && " · " + job.assignee_email}
          </p>
          <Link className={editorLink} prefetch={false} href={"/admin/content/" + job.area + "/" + job.content_id + "/preview?revision=" + job.revision_id}>
            Review revision {job.version}
          </Link>
          {job.reason && <p className="text-sm">{job.reason}</p>}
          {job.refresh_pending && <p className="text-sm">Cache refresh pending.</p>}
          {job.status === "unassigned" && <QueueForm submit="Assign administrator">
            <input type="hidden" name="id" value={job.id} /><input type="hidden" name="action" value="assign" />
            <label className="block max-w-md text-sm font-medium">Replacement administrator
              <select name="email" className={editorInput} defaultValue="" required>
                <option value="" disabled>Choose an administrator</option>
                {admins.map(admin => <option key={admin.email}>{admin.email}</option>)}
              </select>
            </label>
          </QueueForm>}
          <div className="flex flex-wrap gap-2">
            {job.status === "awaiting_approval" && job.assignee === userId && <QueueForm submit={"Approve revision " + job.version} primary>
              <input type="hidden" name="id" value={job.id} /><input type="hidden" name="action" value="approve" />
            </QueueForm>}
            {!closed && <QueueForm submit="Cancel job">
              <input type="hidden" name="id" value={job.id} /><input type="hidden" name="action" value="cancel" />
            </QueueForm>}
          </div>
        </li>)}
      </ul>
      {jobs.length === 50 && <Link className={editorLink} href={"/admin/schedule?closed=" + Number(closed) + "&before=" + jobs.at(-1)?.seq}>Older jobs</Link>}
    </section>
  </div>;
}
