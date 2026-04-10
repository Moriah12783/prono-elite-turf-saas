import { getPrisma } from "@/lib/prisma";

export async function syncRaceDerivedFields(raceId: string) {
  const prisma = getPrisma();
  const runnersCount = await prisma.runner.count({ where: { raceId } });

  await prisma.race.update({
    where: { id: raceId },
    data: {
      runnersCount
    }
  });
}
