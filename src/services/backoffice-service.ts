import { getPrisma } from "@/lib/prisma";

type ArchiveFilterOptions = {
  archived?: boolean;
};

function getArchiveWhere(options?: ArchiveFilterOptions) {
  return options?.archived ? { NOT: { archivedAt: null } } : { archivedAt: null };
}

export async function getDashboardMetrics() {
  const prisma = getPrisma();
  const activeWhere = { archivedAt: null };

  const [totalRaces, pendingRaces, generatedPredictions, readyPublications, publishedPublications, anomalies] = await Promise.all([
    prisma.race.count({ where: activeWhere }),
    prisma.race.count({ where: { ...activeWhere, status: { in: ["COLLECTED", "PENDING_VALIDATION"] } } }),
    prisma.prediction.count({ where: activeWhere }),
    prisma.publicationJob.count({ where: { ...activeWhere, status: "READY" } }),
    prisma.publicationJob.count({ where: { ...activeWhere, status: "PUBLISHED" } }),
    Promise.all([
      prisma.publicationJob.count({ where: { ...activeWhere, status: { in: ["FAILED", "BLOCKED"] } } }),
      prisma.prediction.count({ where: { ...activeWhere, approvalStatus: "REJECTED" } })
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

export async function getRaces(options?: ArchiveFilterOptions) {
  const prisma = getPrisma();
  return prisma.race.findMany({
    where: getArchiveWhere(options),
    include: {
      archivedBy: {
        select: { name: true }
      },
      publicationJobs: {
        select: {
          id: true,
          status: true
        }
      },
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
  return prisma.race.findUnique({
    where: { id },
    include: {
      archivedBy: {
        select: { name: true }
      }
    }
  });
}

export async function getRacesForSelect() {
  const prisma = getPrisma();
  return prisma.race.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      raceName: true,
      venue: true,
      raceTime: true,
      status: true,
      prediction: {
        select: { id: true }
      },
      result: {
        select: { id: true }
      }
    },
    orderBy: [{ raceDate: "asc" }, { raceTime: "asc" }]
  });
}

export async function getRunners() {
  const prisma = getPrisma();
  return prisma.runner.findMany({
    where: {
      race: {
        archivedAt: null
      }
    },
    include: {
      race: {
        select: {
          id: true,
          raceName: true,
          venue: true,
          raceTime: true,
          raceDate: true,
          archivedAt: true,
          publicationJobs: {
            select: {
              status: true
            }
          },
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
    orderBy: [{ race: { raceDate: "asc" } }, { race: { raceTime: "asc" } }, { number: "asc" }]
  });
}

export async function getRunnerById(id: string) {
  const prisma = getPrisma();
  return prisma.runner.findUnique({ where: { id } });
}

export async function getPredictions(options?: ArchiveFilterOptions) {
  const prisma = getPrisma();
  return prisma.prediction.findMany({
    where: options?.archived
      ? { NOT: { archivedAt: null } }
      : {
          archivedAt: null,
          race: {
            archivedAt: null
          }
        },
    include: {
      approvedBy: {
        select: { name: true }
      },
      archivedBy: {
        select: { name: true }
      },
      race: {
        select: {
          archivedAt: true,
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
  return prisma.prediction.findUnique({
    where: { id },
    include: {
      archivedBy: {
        select: { name: true }
      }
    }
  });
}

export async function getResults(options?: ArchiveFilterOptions) {
  const prisma = getPrisma();
  return prisma.result.findMany({
    where: options?.archived
      ? { NOT: { archivedAt: null } }
      : {
          archivedAt: null,
          race: {
            archivedAt: null
          }
        },
    include: {
      archivedBy: {
        select: { name: true }
      },
      race: {
        select: {
          archivedAt: true,
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
  return prisma.result.findUnique({
    where: { id },
    include: {
      archivedBy: {
        select: { name: true }
      }
    }
  });
}

export async function getPublicationRows(options?: ArchiveFilterOptions) {
  const prisma = getPrisma();
  return prisma.publicationJob.findMany({
    where: options?.archived
      ? { NOT: { archivedAt: null } }
      : {
          archivedAt: null,
          race: {
            archivedAt: null
          }
        },
    include: {
      archivedBy: {
        select: { name: true }
      },
      race: {
        select: {
          id: true,
          archivedAt: true,
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
  return prisma.publicationJob.findUnique({
    where: { id },
    include: {
      archivedBy: {
        select: { name: true }
      },
      race: {
        select: {
          id: true,
          archivedAt: true,
          raceName: true,
          venue: true,
          raceTime: true,
          status: true
        }
      }
    }
  });
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
