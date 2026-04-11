import { createHash, timingSafeEqual } from "node:crypto";

import { ScheduledJobKey, ScheduledJobTrigger } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getScheduledJobGuardrails, runScheduledJob } from "@/services/scheduler/scheduled-job-service";
import { formatExecutionWindow, getScheduledJobDefinition, scheduledJobDefinitions } from "@/services/scheduler/scheduled-jobs";

type ScheduledJobApiBody = {
  jobKey: ScheduledJobKey;
  dryRun: boolean;
  force: boolean;
};

function isScheduledJobKey(value: string): value is ScheduledJobKey {
  return Object.values(ScheduledJobKey).includes(value as ScheduledJobKey);
}

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function parseBooleanLike(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return fallback;
}

function readSchedulerToken() {
  const token = process.env.SCHEDULER_API_TOKEN?.trim() ?? "";

  if (!token) {
    return {
      ok: false as const,
      status: 503,
      code: "scheduler_token_missing",
      message: "SCHEDULER_API_TOKEN est absent."
    };
  }

  if (token.length < 16) {
    return {
      ok: false as const,
      status: 503,
      code: "scheduler_token_too_short",
      message: "SCHEDULER_API_TOKEN est trop court. Utilisez un secret d'au moins 16 caracteres."
    };
  }

  return {
    ok: true as const,
    token
  };
}

function isValidBearerToken(receivedToken: string, expectedToken: string) {
  const received = createHash("sha256").update(receivedToken).digest();
  const expected = createHash("sha256").update(expectedToken).digest();
  return timingSafeEqual(received, expected);
}

function parseRequestBody(value: unknown):
  | { ok: true; body: ScheduledJobApiBody }
  | { ok: false; status: number; code: string; message: string } {
  if (typeof value !== "object" || value === null) {
    return {
      ok: false,
      status: 400,
      code: "invalid_json_body",
      message: "Le corps JSON doit etre un objet."
    };
  }

  const candidate = value as Record<string, unknown>;
  const jobKey = typeof candidate.jobKey === "string" ? candidate.jobKey : "";

  if (!isScheduledJobKey(jobKey)) {
    return {
      ok: false,
      status: 422,
      code: "invalid_job_key",
      message: "jobKey invalide."
    };
  }

  return {
    ok: true,
    body: {
      jobKey,
      dryRun: parseBooleanLike(candidate.dryRun, true),
      force: parseBooleanLike(candidate.force, false)
    }
  };
}

function createJobDescriptor(jobKey: ScheduledJobKey) {
  const definition = getScheduledJobDefinition(jobKey);
  const guardrails = getScheduledJobGuardrails(jobKey);

  return {
    key: jobKey,
    label: definition?.label ?? jobKey,
    description: definition?.description ?? null,
    executionWindowUtc: definition ? formatExecutionWindow(definition) : null,
    caution: definition?.caution ?? null,
    guardrails
  };
}

function createApiExamples(baseUrl: string) {
  return {
    prepareDailyPublications: {
      method: "POST",
      url: `${baseUrl}/api/jobs/scheduled`,
      body: {
        jobKey: ScheduledJobKey.PREPARE_DAILY_PUBLICATIONS,
        dryRun: true,
        force: false
      }
    },
    validateReadyPublications: {
      method: "POST",
      url: `${baseUrl}/api/jobs/scheduled`,
      body: {
        jobKey: ScheduledJobKey.VALIDATE_READY_PUBLICATIONS,
        dryRun: true,
        force: false
      }
    },
    attemptAutomaticPublications: {
      method: "POST",
      url: `${baseUrl}/api/jobs/scheduled`,
      body: {
        jobKey: ScheduledJobKey.ATTEMPT_AUTOMATIC_PUBLICATIONS,
        dryRun: false,
        force: false
      }
    }
  };
}

function mapExecutionError(message: string) {
  if (message.includes("deja en cours d'execution")) {
    return {
      status: 409,
      code: "job_already_running"
    };
  }

  if (message.includes("Job planifie introuvable")) {
    return {
      status: 422,
      code: "unknown_job_key"
    };
  }

  return {
    status: 500,
    code: "job_execution_failed"
  };
}

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;

  return json(200, {
    success: true,
    message: "Contrat d'appel du scheduler externe.",
    endpoint: "/api/jobs/scheduled",
    method: "POST",
    authentication: {
      type: "Bearer token",
      header: "Authorization: Bearer <SCHEDULER_API_TOKEN>",
      tokenEnvVar: "SCHEDULER_API_TOKEN",
      minimumLength: 16
    },
    requestContract: {
      contentType: "application/json",
      body: {
        jobKey: "PREPARE_DAILY_PUBLICATIONS | VALIDATE_READY_PUBLICATIONS | ATTEMPT_AUTOMATIC_PUBLICATIONS",
        dryRun: "boolean, optional, default true",
        force: "boolean, optional, default false"
      }
    },
    jobs: scheduledJobDefinitions.map((job) => createJobDescriptor(job.key)),
    examples: createApiExamples(baseUrl)
  });
}

export async function POST(request: NextRequest) {
  const tokenState = readSchedulerToken();

  if (!tokenState.ok) {
    return json(tokenState.status, {
      success: false,
      code: tokenState.code,
      message: tokenState.message
    });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return json(401, {
      success: false,
      code: "missing_bearer_token",
      message: "Authorization Bearer requis."
    });
  }

  if (!isValidBearerToken(token, tokenState.token)) {
    return json(403, {
      success: false,
      code: "invalid_bearer_token",
      message: "Token de planification invalide."
    });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return json(415, {
      success: false,
      code: "unsupported_content_type",
      message: "Content-Type application/json requis."
    });
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return json(400, {
      success: false,
      code: "invalid_json_body",
      message: "Corps JSON invalide."
    });
  }

  const parsedBody = parseRequestBody(rawBody);

  if (!parsedBody.ok) {
    return json(parsedBody.status, {
      success: false,
      code: parsedBody.code,
      message: parsedBody.message
    });
  }

  const payload = parsedBody.body;
  const job = createJobDescriptor(payload.jobKey);

  try {
    const result = await runScheduledJob({
      jobKey: payload.jobKey,
      trigger: ScheduledJobTrigger.API,
      dryRun: payload.dryRun,
      force: payload.force
    });

    return json(200, {
      success: true,
      code: result.skipped ? "job_skipped" : "job_executed",
      message: result.message,
      request: {
        jobKey: payload.jobKey,
        dryRun: payload.dryRun,
        force: payload.force,
        trigger: ScheduledJobTrigger.API
      },
      job,
      outcome: {
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
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue pendant l'execution du job.";
    const mapped = mapExecutionError(message);

    return json(mapped.status, {
      success: false,
      code: mapped.code,
      message,
      request: {
        jobKey: payload.jobKey,
        dryRun: payload.dryRun,
        force: payload.force,
        trigger: ScheduledJobTrigger.API
      },
      job
    });
  }
}
