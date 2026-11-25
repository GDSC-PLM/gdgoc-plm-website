import Link from "next/link";

import { cmsAreaLabels, requireCmsAccess } from "@/features/cms/server/access";
import { signOut } from "./actions";

export default async function AdminDashboard() {
  const { access } = await requireCmsAccess();
  return (
    <>
      <h1 className="text-3xl font-bold">GDGoC PLM CMS</h1>
      {access.full_admin ? (
        <Link className="inline-block underline" href="/admin/access">Manage administrator access</Link>
      ) : (
        <section>
          <h2 className="font-semibold">Your editing areas</h2>
          <ul className="list-disc pl-5">
            {access.areas.map((area) => <li key={area}>{cmsAreaLabels[area]}</li>)}
          </ul>
        </section>
      )}
      <form action={signOut}><button className="underline">Sign out</button></form>
    </>
  );
}
