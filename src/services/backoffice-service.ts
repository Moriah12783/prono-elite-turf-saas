import { getPrisma } from "@/lib/prisma";

export async function getDashboardMetrics() {
  const prisma = getPrisma();

  const [totalRaces, pendingRaces, generatedPredictions, readyPublications, publishedPublications, anomalies] = await Promise.all([
    prisma.race.count(),
    prisma.race.count({ where: { status: { in: ["COLLECTED", "PENDING_VALIDATION"] } } }),
    prisma.prediction.count(),
    prisma.publicationJob.count({ where: { status: "READY" } }),
    prisma.publicationJob.count({ where: { status: "PUBLISHED" } }),
    Promise.all([
      prisma.publicationJob.count({ where: { status: { in: ["FAILED", "BLOCKED"] } } }),
      prisma.prediction.count({ where: { approvalStatus: "REJECTED" } })
    ]).then(([badPublicationJobs, rejectedPredictions]) => badPublicationJobs + rejectedPredictions)
  ]);

  return [
    { label: "Courses du jour", value: totalRaces.toString(), detail: "volume suivi dans le back-office" },
    { label: "Courses en attente", value: pendingRaces.toString(), detail: "a valider avant production" },
    { label: "Pronostics generes", value: generatedPredictions.toString(), detail: "fiches pronostic disponibles" },
    { label: "Publications pretes", value: readyPublications.toString(), detail: "eligibles a l'envoi" },
    { label: "Publications effectuees", value: publishedPublications.toString(), detail: "deja diffusees" },
    { label: "Alertes / anomalies", value: anomalies.toString(), detail: "publications bloquees/en echec ou pronostics rejetes" }
  ];
}

export async function getRaces() {
  const prisma = getPrisma();
  return prisma.race.findMany({
    include: {
      prediction: {
        select: { id: true, approvalStatus: true }
      },
      result: {
        select: { id: true, officialStatus: true }
      }
    },
    orderBy: [{ raceDate: "asc" }, { raceTime: "asc" }]
  });
}

export async function getRaceById(id: string) {
  const prisma = getPrisma();
  return prisma.race.findUnique({ where: { id } });
}

export async function getRacesForSelect() {
  const prisma = getPrisma();
  return prisma.race.findMany({
    select: {
      id: true,
      raceName: true,
      venue: true,
      raceTime: true,
      status: true
    },
    orderBy: [{ raceDate: "asc" }, { raceTime: "asc" }]
  });
}

export async function getRunners() {
  const prisma = getPrisma();
  return prisma.runner.findMany({
    include: {
      race: {
        select: {
          raceName: true,
          venue: true,
          raceTime: true,
          raceDate: true
        }
      }
    },
    orderBy: [{ race: { raceDate: "asc" } }, { race: { raceTime: "asc" } }, { number: "asc" }]
  });
}

export async function getRunnerById(id: string) {
  const prisma = getPrisma();
  return prisma.runner.findUnique({ where: { id } });
}

export async function getPredictions() {
  const prisma = getPrisma();
  return prisma.prediction.findMany({
    include: {
      approvedBy: {
        select: { name: true }
      },
      race: {
        select: {
          raceName: true,
          venue: true,
          raceTime: true,
          raceDate: true
        }
      }
    },
    orderBy: [{ race: { raceDate: "asc" } }, { race: { raceTime: "asc" } }]
  });
}

export async function getPredictionById(id: string) {
  const prisma = getPrisma();
  return prisma.prediction.findUnique({ where: { id } });
}

export async function getResults() {
  const prisma = getPrisma();
  return prisma.result.findMany({
    include: {
      race: {
        select: {
          raceName: true,
          venue: true,
          raceTime: true,
          raceDate: true,
          prediction: {
            select: {
              mainPick: true,
              basePick: true,
              outsiderPick: true,
              speculativePick: true
            }
          }
        }
      }
    },
    orderBy: [{ race: { raceDate: "asc" } }, { race: { raceTime: "asc" } }]
  });
}

export async function getResultById(id: string) {
  const prisma = getPrisma();
  return prisma.result.findUnique({ where: { id } });
}

export async function getPublicationRows() {
  const prisma = getPrisma();
  return prisma.publicationJob.findMany({
    include: {
      race: {
        select: {
          id: true,
          raceName: true,
          venue: true,
          raceTime: true,
          status: true,
          prediction: {
            select: {
              id: true,
              approvalStatus: true
            }
          }
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function getPublicationById(id: string) {
  const prisma = getPrisma();
  return prisma.publicationJob.findUnique({ where: { id } });
}

export async function getAuditLogs() {
  const prisma = getPrisma();
  return prisma.auditLog.findMany({
    include: {
      actor: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}
