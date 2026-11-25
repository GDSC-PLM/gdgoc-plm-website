import Link from "next/link";

import { editorAreas } from "@/features/cms/editor-fields";
import { editorButton, editorLink } from "@/features/cms/editor-style";
import { cmsAreaLabels, requireCmsAccess } from "@/features/cms/server/access";
import { signOut } from "./actions";

export default async function AdminDashboard() {
  const { access } = await requireCmsAccess();
  const areas = editorAreas.filter((area) => access.full_admin || access.areas.includes(area));
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <h1 className="text-3xl font-semibold tracking-tight">GDGoC PLM CMS</h1>
        <form action={signOut}><button className={editorButton}>Sign out</button></form>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Content areas</h2>
        <ul className="divide-y border-y">
          {areas.map((area) => (
            <li key={area} className="py-3">
              <Link className={editorLink} href={"/admin/content/" + area}>{cmsAreaLabels[area]}</Link>
            </li>
          ))}
        </ul>
      </section>
      {access.full_admin && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Administration</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className={editorLink} href="/admin/access">Manage administrator access</Link>
            <Link className={editorLink} href="/admin/schedule">Scheduled publications</Link>
          </div>
        </section>
      )}
    </div>
  );
}
