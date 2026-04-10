import { PublicationStatus } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";

const statusPriority: PublicationStatus[] = [
  PublicationStatus.BLOCKED,
  PublicationStatus.FAILED,
  PublicationStatus.READY,
  PublicationStatus.PUBLISHED,
  PublicationStatus.DRAFT
];

export async function syncRacePublicationStatus(raceId: string) {
  const prisma = getPrisma();
  const jobs = await prisma.publicationJob.findMany({
    where: { raceId },
    select: { status: true, updatedAt: true },
    orderBy: { updatedAt: "desc" }
  });

  const nextStatus =
    statusPriority.find((status) => jobs.some((job) => job.status === status)) ?? PublicationStatus.DRAFT;

  await prisma.race.update({
    where: { id: raceId },
    data: {
      publicationStatus: nextStatus
    }
  });

  return nextStatus;
}
