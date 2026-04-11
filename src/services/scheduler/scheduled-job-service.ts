import {
  ApprovalStatus,
  AuditActionType,
  AuditEntityType,
  Prisma,
  PublicationMode,
  PublicationStatus,
  ScheduledJobKey,
  ScheduledJobRunStatus,
  ScheduledJobTrigger
} from "@prisma/client";

import { createAuditLog } from "@/lib/audit";
import { getPrisma } from "@/lib/prisma";
import { getApiCustomConfig } from "@/services/publication/api-custom-config";
import { publishPublicationJob, refreshPublicationJobStatus } from "@/services/publication/publication-service";
import { getWordPressConfig } from "@/services/publication/wordpress-config";

import { formatExecutionWindow, getScheduledJobDefinition, scheduledJobDefinitions } from "./scheduled-jobs";

type RunScheduledJobInput = {
  jobKey: ScheduledJobKey;
  trigger: ScheduledJobTrigger;
  dryRun?: boolean;
  force?: boolean;
  actorId?: string;
};

type JsonRecord = Prisma.InputJsonObject;
type ScheduledJobExecutionSummary = JsonRecord;

const RUNNING_LOCK_WINDOW_MS = 15 * 60 * 1000;
export const RUNNING_LOCK_WINDOW_MINUTES = RUNNING_LOCK_WINDOW_MS / (60 * 1000);
const AUTO_MODES = new Set<PublicationMode>([
  PublicationMode.AUTO_DRAFT,
  PublicationMode.VALIDATED,
  PublicationMode.CONDITIONAL_AUTOMATIC
]);

function getUtcDayStart(referenceDate = new Date()) {
  return new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
}

function getUtcDayEnd(dayStart: Date) {
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
}

function isWithinExecutionWindow(
  now: Date,
  windowUtc: {
    startHour: number;
    endHour: number;
  }
) {
  const currentHour = now.getUTCHours();
  return currentHour >= windowUtc.startHour && currentHour < windowUtc.endHour;
}

function getDefaultScheduledTarget() {
  if (getApiCustomConfig().enabled) {
    return "api-custom";
  }

  if (getWordPressConfig().enabled) {
    return "wordpress-rest";
  }

  return "mock";
}

function createAutoDraftPayload(input: {
  raceName: string;
  venue: string;
  raceTime: string;
  mainPick: string;
  basePick: string;
  outsiderPick: string;
  speculativePick: string;
  analysisText: string;
  cautionText: string;
}): Prisma.InputJsonObject {
  return {
    title: `${input.raceName} - Pronostic Elite Turf`,
    excerpt: `Notre selection du jour pour ${input.raceName} a ${input.venue}.`,
    body: [
      `Course : ${input.raceName} - ${input.venue} - ${input.raceTime}`,
      "",
      `Selection principale : ${input.mainPick}`,
      `Base : ${input.basePick}`,
      `Outsider : ${input.outsiderPick}`,
      `Speculatif : ${input.speculativePick}`,
      "",
      "Analyse :",
      input.analysisText,
      "",
      "Avertissement :",
      input.cautionText
    ].join("\n")
  };
}

async function runPrepareDailyPublications(dayStart: Date, dryRun: boolean): Promise<ScheduledJobExecutionSummary> {
  const prisma = getPrisma();
  const dayEnd = getUtcDayEnd(dayStart);
  const defaultTarget = getDefaultScheduledTarget();

  const races = await prisma.race.findMany({
    where: {
      archivedAt: null,
      raceDate: {
        gte: dayStart,
        lt: dayEnd
      },
      prediction: {
        archivedAt: null,
        approvalStatus: {
          in: [ApprovalStatus.APPROVED, ApprovalStatus.PUBLISHED]
        }
      }
    },
    include: {
      prediction: true,
      publicationJobs: {
        where: { archivedAt: null },
        select: { id: true, status: true, target: true }
      }
    },
    orderBy: [{ raceDate: "asc" }, { raceTime: "asc" }]
  });

  const candidates = races.filter((race) => race.prediction && race.publicationJobs.length === 0);

  if (dryRun) {
    return {
      day: dayStart.toISOString(),
      dryRun: true,
      defaultTarget,
      totals: {
        scannedRaces: races.length,
        candidates: candidates.length,
        createdDrafts: 0
      },
      candidates: candidates.map((race) => ({
        raceId: race.id,
        raceName: race.raceName,
        venue: race.venue,
        raceTime: race.raceTime
      }))
    };
  }

  const created: Prisma.InputJsonObject[] = [];

  for (const race of candidates) {
    const prediction = race.prediction;

    if (!prediction) {
      continue;
    }

    const publication = await prisma.publicationJob.create({
      data: {
        raceId: race.id,
        target: defaultTarget,
        mode: PublicationMode.AUTO_DRAFT,
        status: PublicationStatus.DRAFT,
        payloadJson: createAutoDraftPayload({
          raceName: race.raceName,
          venue: race.venue,
          raceTime: race.raceTime,
          mainPick: prediction.mainPick,
          basePick: prediction.basePick,
          outsiderPick: prediction.outsiderPick,
          speculativePick: prediction.speculativePick,
          analysisText: prediction.analysisText,
          cautionText: prediction.cautionText
        })
      }
    });

    created.push({
      publicationJobId: publication.id,
      raceId: race.id,
      raceName: race.raceName,
      target: publication.target,
      mode: publication.mode
    });
  }

  return {
    day: dayStart.toISOString(),
    dryRun: false,
    defaultTarget,
    totals: {
      scannedRaces: races.length,
      candidates: candidates.length,
      createdDrafts: created.length
    },
    created
  };
}

async function runValidateReadyPublications(dayStart: Date, dryRun: boolean, actorId?: string): Promise<ScheduledJobExecutionSummary> {
  const prisma = getPrisma();
  const dayEnd = getUtcDayEnd(dayStart);

  const jobs = await prisma.publicationJob.findMany({
    where: {
      archivedAt: null,
      race: {
        archivedAt: null,
        raceDate: {
          gte: dayStart,
          lt: dayEnd
        }
      },
      status: {
        in: [PublicationStatus.DRAFT, PublicationStatus.BLOCKED, PublicationStatus.FAILED, PublicationStatus.READY]
      }
    },
    select: {
      id: true,
      status: true,
      race: {
        select: {
          raceName: true,
          venue: true,
          raceTime: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  if (dryRun) {
    return {
      day: dayStart.toISOString(),
      dryRun: true,
      totals: {
        candidates: jobs.length
      },
      jobs: jobs.map((job) => ({
        id: job.id,
        status: job.status,
        raceName: job.race.raceName,
        venue: job.race.venue,
        raceTime: job.race.raceTime
      }))
    };
  }

  let readyCount = 0;
  let blockedCount = 0;
  const results: Prisma.InputJsonObject[] = [];

  for (const job of jobs) {
    const evaluation = await refreshPublicationJobStatus(job.id, actorId);

    if (evaluation.job.status === PublicationStatus.READY) {
      readyCount += 1;
    }

    if (evaluation.job.status === PublicationStatus.BLOCKED) {
      blockedCount += 1;
    }

    results.push({
      id: job.id,
      previousStatus: job.status,
      nextStatus: evaluation.job.status,
      reasons: evaluation.evaluation.reasons
    });
  }

  return {
    day: dayStart.toISOString(),
    dryRun: false,
    totals: {
      candidates: jobs.length,
      ready: readyCount,
      blocked: blockedCount
    },
    results
  };
}

async function runAttemptAutomaticPublications(dayStart: Date, dryRun: boolean, actorId?: string): Promise<ScheduledJobExecutionSummary> {
  const prisma = getPrisma();
  const dayEnd = getUtcDayEnd(dayStart);

  const jobs = await prisma.publicationJob.findMany({
    where: {
      archivedAt: null,
      status: PublicationStatus.READY,
      mode: {
        in: Array.from(AUTO_MODES)
      },
      race: {
        archivedAt: null,
        raceDate: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    },
    select: {
      id: true,
      target: true,
      mode: true,
      race: {
        select: {
          raceName: true,
          venue: true,
          raceTime: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  if (dryRun) {
    return {
      day: dayStart.toISOString(),
      dryRun: true,
      totals: {
        candidates: jobs.length
      },
      jobs: jobs.map((job) => ({
        id: job.id,
        target: job.target,
        mode: job.mode,
        raceName: job.race.raceName,
        venue: job.race.venue,
        raceTime: job.race.raceTime
      }))
    };
  }

  let publishedCount = 0;
  let failedCount = 0;
  const results: Prisma.InputJsonObject[] = [];

  for (const job of jobs) {
    const result = await publishPublicationJob(job.id, actorId);

    if (result.success) {
      publishedCount += 1;
    } else {
      failedCount += 1;
    }

    results.push({
      id: job.id,
      target: job.target,
      mode: job.mode,
      success: result.success,
      status: result.status,
      deliveryMode: result.deliveryMode,
      errorMessage: result.errorMessage ?? null
    });
  }

  return {
    day: dayStart.toISOString(),
    dryRun: false,
    totals: {
      candidates: jobs.length,
      published: publishedCount,
      failed: failedCount
    },
    results
  };
}

async function executeScheduledJob(jobKey: ScheduledJobKey, dayStart: Date, dryRun: boolean, actorId?: string) {
  switch (jobKey) {
    case ScheduledJobKey.PREPARE_DAILY_PUBLICATIONS:
      return runPrepareDailyPublications(dayStart, dryRun);
    case ScheduledJobKey.VALIDATE_READY_PUBLICATIONS:
      return runValidateReadyPublications(dayStart, dryRun, actorId);
    case ScheduledJobKey.ATTEMPT_AUTOMATIC_PUBLICATIONS:
      return runAttemptAutomaticPublications(dayStart, dryRun, actorId);
    default:
      throw new Error("Job planifie non pris en charge.");
  }
}

export async function getScheduledJobRuns(limit = 20) {
  const prisma = getPrisma();
  return prisma.scheduledJobRun.findMany({
    include: {
      requestedBy: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit
  });
}

export async function getRecentScheduledJobAlerts(limit = 5) {
  const prisma = getPrisma();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return prisma.scheduledJobRun.findMany({
    where: {
      OR: [
        {
          status: ScheduledJobRunStatus.FAILED,
          createdAt: { gte: since }
        },
        {
          status: ScheduledJobRunStatus.SKIPPED,
          createdAt: { gte: since },
          summaryJson: {
            path: ["reason"],
            equals: "outside_window"
          }
        }
      ]
    },
    include: {
      requestedBy: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit
  });
}

export function getScheduledJobDefinitions() {
  return scheduledJobDefinitions;
}

export async function getScheduledJobOverview() {
  const prisma = getPrisma();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentRuns = await prisma.scheduledJobRun.findMany({
    where: {
      createdAt: {
        gte: since
      }
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      requestedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return scheduledJobDefinitions.map((definition) => {
    const jobRuns = recentRuns.filter((run) => run.jobKey === definition.key);
    const lastRun = jobRuns[0] ?? null;
    const lastSuccess = jobRuns.find((run) => run.status === ScheduledJobRunStatus.SUCCEEDED) ?? null;
    const lastFailure = jobRuns.find((run) => run.status === ScheduledJobRunStatus.FAILED) ?? null;
    const recentFailures = jobRuns.filter((run) => run.status === ScheduledJobRunStatus.FAILED);
    const recentOutsideWindowSkips = jobRuns.filter(
      (run) =>
        run.status === ScheduledJobRunStatus.SKIPPED &&
        typeof run.summaryJson === "object" &&
        run.summaryJson !== null &&
        "reason" in (run.summaryJson as Record<string, unknown>) &&
        (run.summaryJson as Record<string, unknown>).reason === "outside_window"
    );

    return {
      ...definition,
      lastRun,
      lastSuccess,
      lastFailure,
      lastStatus: lastRun?.status ?? null,
      recentFailureCount: recentFailures.length,
      recentOutsideWindowSkipCount: recentOutsideWindowSkips.length
    };
  });
}

function isSameUtcDay(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

export async function getSchedulerGlobalAttentionStatus() {
  const overview = await getScheduledJobOverview();
  const now = new Date();
  const lastObservedRun =
    overview
      .map((job) => job.lastRun?.createdAt ?? null)
      .filter((value): value is Date => value instanceof Date)
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
  const freshnessMinutes = lastObservedRun ? Math.floor((now.getTime() - lastObservedRun.getTime()) / (60 * 1000)) : null;
  const freshness = !lastObservedRun
    ? {
        label: "Aucune supervision recente",
        tone: "stale" as const
      }
    : freshnessMinutes !== null && freshnessMinutes <= 90
      ? {
          label: "Frais",
          tone: "fresh" as const
        }
      : {
          label: "A rafraichir",
          tone: "stale" as const
        };
  const expectedToday = overview.filter((job) => now.getUTCHours() >= job.executionWindowUtc.startHour);
  const executedToday = expectedToday.filter((job) => (job.lastRun ? isSameUtcDay(job.lastRun.createdAt, now) : false));
  const pendingToday = expectedToday.filter((job) => !(job.lastRun ? isSameUtcDay(job.lastRun.createdAt, now) : false));

  const missingExpectedRuns = overview.filter((job) => {
    const windowClosed = now.getUTCHours() >= job.executionWindowUtc.endHour;
    const hasRunToday = job.lastRun ? isSameUtcDay(job.lastRun.createdAt, now) : false;

    return windowClosed && !hasRunToday;
  });

  const criticalFailure = overview.find(
    (job) =>
      (job.key === ScheduledJobKey.VALIDATE_READY_PUBLICATIONS || job.key === ScheduledJobKey.ATTEMPT_AUTOMATIC_PUBLICATIONS) &&
      job.recentFailureCount > 0
  );

  if (criticalFailure) {
    return {
      level: "blocked" as const,
      title: "Bloque",
      message: `Le pipeline quotidien demande une intervention : ${criticalFailure.label} a rencontre un echec recent.`,
      details: [`${criticalFailure.label} : ${criticalFailure.recentFailureCount} echec(s) recent(s).`],
      computedAt: now,
      lastObservedRun,
      freshness,
      expectedToday: {
        total: expectedToday.length,
        executed: executedToday.length,
        pending: pendingToday.length
      }
    };
  }

  if (missingExpectedRuns.length > 0) {
    return {
      level: "alert" as const,
      title: "Alerte",
      message: "Au moins un job attendu aujourd'hui n'a pas encore ete constate apres sa fenetre d'execution.",
      details: missingExpectedRuns.map((job) => `${job.label} : aucun run constate aujourd'hui.`),
      computedAt: now,
      lastObservedRun,
      freshness,
      expectedToday: {
        total: expectedToday.length,
        executed: executedToday.length,
        pending: pendingToday.length
      }
    };
  }

  const warningJobs = overview.filter(
    (job) => job.recentFailureCount > 0 || job.recentOutsideWindowSkipCount > 0 || job.lastStatus === ScheduledJobRunStatus.SKIPPED
  );

  if (warningJobs.length > 0) {
    return {
      level: "alert" as const,
      title: "Alerte",
      message: "Le scheduler reste operationnel, mais certains signaux recents demandent une verification admin.",
      details: warningJobs.map((job) => {
        if (job.recentFailureCount > 0) {
          return `${job.label} : ${job.recentFailureCount} echec(s) recent(s).`;
        }

        return `${job.label} : skip hors fenetre ou execution a surveiller.`;
      }),
      computedAt: now,
      lastObservedRun,
      freshness,
      expectedToday: {
        total: expectedToday.length,
        executed: executedToday.length,
        pending: pendingToday.length
      }
    };
  }

  return {
    level: "ok" as const,
    title: "OK",
    message: "Le pipeline quotidien est sain a ce stade : aucun blocage critique recent n'a ete detecte.",
    details: ["Les signaux recents du scheduler restent conformes aux garde-fous du MVP."],
    computedAt: now,
    lastObservedRun,
    freshness,
    expectedToday: {
      total: expectedToday.length,
      executed: executedToday.length,
      pending: pendingToday.length
    }
  };
}

export function getScheduledJobGuardrails(jobKey: ScheduledJobKey) {
  const definition = getScheduledJobDefinition(jobKey);

  if (!definition) {
    return null;
  }

  return {
    executionWindowUtc: formatExecutionWindow(definition),
    runningLockWindowMinutes: RUNNING_LOCK_WINDOW_MINUTES,
    duplicateProtection: "one-successful-real-run-per-day",
    outsideWindowPolicy: "skip-real-runs",
    dryRunAvailable: true
  };
}

export async function runScheduledJob(input: RunScheduledJobInput) {
  const prisma = getPrisma();
  const definition = getScheduledJobDefinition(input.jobKey);

  if (!definition) {
    throw new Error("Job planifie introuvable.");
  }

  const dryRun = input.dryRun ?? true;
  const force = input.force ?? false;
  const now = new Date();
  const dayStart = getUtcDayStart(now);
  const runningThreshold = new Date(Date.now() - RUNNING_LOCK_WINDOW_MS);

  const runningJob = await prisma.scheduledJobRun.findFirst({
    where: {
      jobKey: input.jobKey,
      status: ScheduledJobRunStatus.RUNNING,
      startedAt: {
        gte: runningThreshold
      }
    }
  });

  if (runningJob) {
    throw new Error("Ce job est deja en cours d'execution. Attendez la fin du run precedent avant de relancer.");
  }

  if (!dryRun && !force && !isWithinExecutionWindow(now, definition.executionWindowUtc)) {
    const skippedRun = await prisma.scheduledJobRun.create({
      data: {
        jobKey: input.jobKey,
        trigger: input.trigger,
        runDate: dayStart,
        dryRun: false,
        status: ScheduledJobRunStatus.SKIPPED,
        requestedById: input.actorId,
        finishedAt: now,
        summaryJson: {
          reason: "outside_window",
          message: `Execution ignoree hors fenetre autorisee (${formatExecutionWindow(definition)}).`,
          attemptedAt: now.toISOString()
        }
      }
    });

    if (input.actorId) {
      await createAuditLog({
        actorId: input.actorId,
        actionType: AuditActionType.VALIDATE,
        entityType: AuditEntityType.SCHEDULED_JOB_RUN,
        entityId: skippedRun.id,
        metadataJson: {
          jobKey: input.jobKey,
          trigger: input.trigger,
          dryRun: false,
          status: skippedRun.status,
          reason: "outside_window",
          executionWindow: formatExecutionWindow(definition)
        }
      });
    }

    return {
      run: skippedRun,
      summary: skippedRun.summaryJson,
      skipped: true,
      message: `Execution ignoree : en dehors de la fenetre ${formatExecutionWindow(definition)}.`
    };
  }

  if (!force && !dryRun) {
    const successfulRun = await prisma.scheduledJobRun.findFirst({
      where: {
        jobKey: input.jobKey,
        runDate: dayStart,
        dryRun: false,
        status: ScheduledJobRunStatus.SUCCEEDED
      },
      orderBy: { createdAt: "desc" }
    });

    if (successfulRun) {
      const skippedRun = await prisma.scheduledJobRun.create({
        data: {
          jobKey: input.jobKey,
          trigger: input.trigger,
          runDate: dayStart,
          dryRun: false,
          status: ScheduledJobRunStatus.SKIPPED,
          requestedById: input.actorId,
          finishedAt: new Date(),
          summaryJson: {
            reason: "already_succeeded_today",
            message: "Une execution reussie existe deja pour ce job aujourd'hui."
          }
        }
      });

      return {
        run: skippedRun,
        summary: skippedRun.summaryJson,
        skipped: true,
        message: "Execution ignoree : un run reussi existe deja aujourd'hui."
      };
    }
  }

  const run = await prisma.scheduledJobRun.create({
    data: {
      jobKey: input.jobKey,
      trigger: input.trigger,
      runDate: dayStart,
      dryRun,
      status: ScheduledJobRunStatus.PENDING,
      requestedById: input.actorId
    }
  });

  await prisma.scheduledJobRun.update({
    where: { id: run.id },
    data: {
      status: ScheduledJobRunStatus.RUNNING,
      startedAt: new Date()
    }
  });

  try {
    const summary = await executeScheduledJob(input.jobKey, dayStart, dryRun, input.actorId);

    const completedRun = await prisma.scheduledJobRun.update({
      where: { id: run.id },
      data: {
        status: ScheduledJobRunStatus.SUCCEEDED,
        finishedAt: new Date(),
        summaryJson: summary,
        errorMessage: null
      }
    });

    if (input.actorId) {
      await createAuditLog({
        actorId: input.actorId,
        actionType: dryRun ? AuditActionType.VALIDATE : AuditActionType.UPDATE,
        entityType: AuditEntityType.SCHEDULED_JOB_RUN,
        entityId: completedRun.id,
        metadataJson: {
          jobKey: input.jobKey,
          trigger: input.trigger,
          dryRun,
          status: completedRun.status,
          summary
        }
      });
    }

    return {
      run: completedRun,
      summary,
      skipped: false,
      message: dryRun ? "Simulation terminee." : "Execution terminee."
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue pendant l'execution du job planifie.";

    const failedRun = await prisma.scheduledJobRun.update({
      where: { id: run.id },
      data: {
        status: ScheduledJobRunStatus.FAILED,
        finishedAt: new Date(),
        errorMessage: message
      }
    });

    if (input.actorId) {
      await createAuditLog({
        actorId: input.actorId,
        actionType: AuditActionType.UPDATE,
        entityType: AuditEntityType.SCHEDULED_JOB_RUN,
        entityId: failedRun.id,
        metadataJson: {
          jobKey: input.jobKey,
          trigger: input.trigger,
          dryRun,
          status: failedRun.status,
          errorMessage: message
        }
      });
    }

    throw new Error(message);
  }
}

