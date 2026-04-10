import { ScheduledJobKey, ScheduledJobTrigger } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { runScheduledJob } from "@/services/scheduler/scheduled-job-service";

function isScheduledJobKey(value: string): value is ScheduledJobKey {
  return Object.values(ScheduledJobKey).includes(value as ScheduledJobKey);
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.SCHEDULER_API_TOKEN?.trim();

  if (!expectedToken) {
    return NextResponse.json({ success: false, message: "SCHEDULER_API_TOKEN est absent." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return NextResponse.json({ success: false, message: "Authorization Bearer requis." }, { status: 401 });
  }

  if (token !== expectedToken) {
    return NextResponse.json({ success: false, message: "Token de planification invalide." }, { status: 403 });
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const jobKey = typeof body.jobKey === "string" ? body.jobKey : "";
  const dryRun = body.dryRun === undefined ? true : Boolean(body.dryRun);
  const force = Boolean(body.force);

  if (!isScheduledJobKey(jobKey)) {
    return NextResponse.json({ success: false, message: "jobKey invalide." }, { status: 422 });
  }

  try {
    const result = await runScheduledJob({
      jobKey,
      trigger: ScheduledJobTrigger.API,
      dryRun,
      force
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      skipped: result.skipped,
      run: {
        id: result.run.id,
        jobKey: result.run.jobKey,
        status: result.run.status,
        dryRun: result.run.dryRun,
        runDate: result.run.runDate,
        startedAt: result.run.startedAt,
        finishedAt: result.run.finishedAt,
        errorMessage: result.run.errorMessage
      },
      summary: result.summary
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur inconnue pendant l'execution du job."
      },
      { status: 500 }
    );
  }
}
