"use server";

import { ScheduledJobKey, ScheduledJobTrigger } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getUserFacingActionErrorMessage, logServerActionError, rethrowIfRedirectError } from "@/lib/action-errors";
import { requireAdmin } from "@/lib/auth";
import { redirectWithFeedback } from "@/lib/feedback";
import { runScheduledJob } from "@/services/scheduler/scheduled-job-service";
import { assertRequiredString } from "@/lib/validation";

const PATH = "/scheduler";

function isScheduledJobKey(value: string): value is ScheduledJobKey {
  return Object.values(ScheduledJobKey).includes(value as ScheduledJobKey);
}

export async function runScheduledJobAction(formData: FormData) {
  const user = await requireAdmin();
  const rawJobKey = assertRequiredString(formData.get("jobKey"), "Le job planifie");
  const dryRun = formData.get("dryRun")?.toString() !== "0";
  const force = formData.get("force")?.toString() === "1";

  try {
    if (!isScheduledJobKey(rawJobKey)) {
      throw new Error("Job planifie invalide.");
    }

    const result = await runScheduledJob({
      jobKey: rawJobKey,
      trigger: ScheduledJobTrigger.MANUAL,
      dryRun,
      force,
      actorId: user.id
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", result.message);
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("run-scheduled-job", error, {
      userId: user.id,
      jobKey: rawJobKey,
      dryRun,
      force
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible d'executer ce job planifie.");
    redirectWithFeedback(PATH, "error", message);
  }
}
