import Link from "next/link";

import { cmsAreaLabels, requireCmsAccess } from "@/features/cms/server/access";
import { cmsAreas } from "@/features/cms/server/schema";
import { manageCmsAccess } from "../actions";

const notices: Record<string, string> = {
  saved: "Access updated.",
  invalid: "Enter a valid email, role, editing areas and expiry.",
  failed: "The change was rejected. Check the account state and activate a replacement before revoking the last full administrator.",
};

export default async function AdminAccess({ searchParams }: PageProps<"/admin/access">) {
  const { client } = await requireCmsAccess("publish");
  const { data, error } = await client.rpc("cms_list_access");
  const { status } = await searchParams;
  const notice = typeof status === "string" && Object.hasOwn(notices, status) ? notices[status] : null;
  const displayTime = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
  });

  return (
    <>
      <Link className="underline" href="/admin">CMS dashboard</Link>
      <h1 className="text-3xl font-bold">Administrator access</h1>
      {notice && <p role="status">{notice}</p>}
      <form action={manageCmsAccess} className="grid gap-4 rounded-lg border p-4">
        <h2 className="font-semibold">Invite an administrator or change permissions</h2>
        <label className="grid gap-1">
          Google email address
          <input className="rounded border p-2" name="email" type="email" required maxLength={254} />
        </label>
        <label className="grid gap-1">
          Role
          <select className="rounded border p-2" name="role">
            <option value="contributor">Contributor</option>
            <option value="full">Full administrator</option>
          </select>
        </label>
        <fieldset className="grid gap-1">
          <legend>Editing areas for contributors</legend>
          {cmsAreas.filter((area) => area !== "settings").map((area) => (
            <label className="flex items-center gap-2" key={area}>
              <input type="checkbox" name="areas" value={area} />{cmsAreaLabels[area]}
            </label>
          ))}
        </fieldset>
        <label className="grid gap-1">
          Invitation expires in days
          <input className="rounded border p-2" name="days" type="number" required min={1} max={30} defaultValue={7} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button name="operation" value="invite" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
            Save invitation
          </button>
          <button name="operation" value="update_permissions" className="rounded-md border px-4 py-2">
            Update active account permissions
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold">Invitations and accounts</h2>
        {error && <p role="status">Access records are temporarily unavailable.</p>}
        <ul className="space-y-3">
          {data?.map((row) => {
            const pending = row.pending;
            const active = row.accepted_at && !row.revoked_at;
            return (
              <li className="space-y-1 rounded-lg border p-4" key={row.email}>
                <p className="break-all font-semibold">{row.email}</p>
                <p>{row.full_admin ? "Full administrator" : row.areas.map((area) => cmsAreaLabels[area]).join(", ")}</p>
                <p>
                  {active ? "Active" : row.revoked_at ? "Revoked" : pending
                    ? "Pending until " + displayTime.format(new Date(row.expires_at)) + " Manila time"
                    : "Expired or cancelled"}
                </p>
                {(pending || active) && (
                  <details>
                    <summary className="cursor-pointer underline">{active ? "Revoke access" : "Cancel invitation"}</summary>
                    <form className="mt-2" action={manageCmsAccess}>
                      <input type="hidden" name="email" value={row.email} />
                      <button className="rounded border px-3 py-1" name="operation" value={active ? "revoke" : "cancel_invitation"}>
                        {active ? "Confirm revocation" : "Confirm cancellation"}
                      </button>
                    </form>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
