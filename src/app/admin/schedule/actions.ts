"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCmsAccess } from "@/features/cms/server/access";
import { isCmsId } from "@/features/cms/editor-fields";

export async function changeSchedule(_previous: string, form: FormData): Promise<string> {
  const { client } = await requireCmsAccess("publish", true);
  const value = (key: string) => String(form.get(key) ?? "");
  const action = value("action");
  const id = value("id");
  if (!isCmsId(id)) return "Reload this page and try again.";

  let result;
  if (action === "publish" || action === "unpublish") {
    const live = value("live") || null;
    const target = action === "unpublish" ? live : value("draft");
    if (!isCmsId(target) || (live !== null && !isCmsId(live))) return "Review the saved revision before scheduling.";
    result = await client.rpc("cms_schedule", {
      p_content_id: id, p_action: action, p_revision_id: target, p_expected_live: live,
      p_local: value("local"), p_zone: value("zone").trim(),
    });
  } else if (action === "cancel" || action === "assign" || action === "approve") {
    result = await client.rpc("cms_manage_job", { p_job: id, p_action: action, p_email: value("email") || undefined });
  } else {
    return "Choose a queue action.";
  }

  if (result.error) {
    const { code, message, details } = result.error;
    if (code === "22023" || code === "PT409") {
      return details && /^[a-zA-Z]+$/.test(details) ? message + " (" + details + ")" : message;
    }
    if (code === "PT429") return "Too many changes. Try again in one minute.";
    if (code === "42501") return "Your account cannot perform this queue action.";
    return "The queue is unavailable. Reload to check the job before trying again.";
  }
  revalidatePath("/admin/schedule");
  redirect("/admin/schedule?result=" + action + (action === "cancel" ? "&closed=1" : ""));
}
