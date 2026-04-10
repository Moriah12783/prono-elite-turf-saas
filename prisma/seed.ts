import {
  ApprovalStatus,
  AuditActionType,
  AuditEntityType,
  ConfidenceLabel,
  PublicationMode,
  PublicationStatus,
  RaceStatus,
  ResultOfficialStatus,
  RunnerStatus,
  UserRole
} from "@prisma/client";

import { getSeedAdminConfig } from "../src/lib/auth-config";
import { hashPassword } from "../src/lib/password";
import { getPrisma } from "../src/lib/prisma";

const prisma = getPrisma();

async function main() {
  const adminConfig = getSeedAdminConfig();

  const admin = await prisma.user.upsert({
    where: { email: adminConfig.email.toLowerCase() },
    update: {
      name: adminConfig.name,
      role: UserRole.ADMIN,
      passwordHash: hashPassword(adminConfig.password)
    },
    create: {
      name: adminConfig.name,
      email: adminConfig.email.toLowerCase(),
      role: UserRole.ADMIN,
      passwordHash: hashPassword(adminConfig.password)
    }
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor@elite-turf.local" },
    update: {
      name: "Operateur Turf",
      role: UserRole.EDITOR,
      passwordHash: hashPassword("EditorDemo123!")
    },
    create: {
      name: "Operateur Turf",
      email: "editor@elite-turf.local",
      role: UserRole.EDITOR,
      passwordHash: hashPassword("EditorDemo123!")
    }
  });

  const raceDefinitions = [
    {
      externalSourceId: "R1C3-2026-04-10",
      raceName: "Prix des Sprinters",
      venue: "Vincennes",
      raceDate: new Date("2026-04-10T00:00:00.000Z"),
      raceTime: "12:35",
      raceDateTime: new Date("2026-04-10T12:35:00.000Z"),
      discipline: "Trot attele",
      distance: 2700,
      status: RaceStatus.VALIDATED,
      qualityScore: 84,
      publicationStatus: PublicationStatus.READY
    },
    {
      externalSourceId: "R1C5-2026-04-10",
      raceName: "Prix du Plateau",
      venue: "Auteuil",
      raceDate: new Date("2026-04-10T00:00:00.000Z"),
      raceTime: "14:15",
      raceDateTime: new Date("2026-04-10T14:15:00.000Z"),
      discipline: "Obstacle",
      distance: 3600,
      status: RaceStatus.PENDING_VALIDATION,
      qualityScore: 61,
      publicationStatus: PublicationStatus.DRAFT
    },
    {
      externalSourceId: "R2C1-2026-04-10",
      raceName: "Prix des Inities",
      venue: "Lyon-La Soie",
      raceDate: new Date("2026-04-10T00:00:00.000Z"),
      raceTime: "16:00",
      raceDateTime: new Date("2026-04-10T16:00:00.000Z"),
      discipline: "Plat",
      distance: 1800,
      status: RaceStatus.PUBLISHED,
      qualityScore: 92,
      publicationStatus: PublicationStatus.PUBLISHED
    }
  ];

  const races = [] as { id: string; externalSourceId: string | null }[];

  for (const definition of raceDefinitions) {
    const race = await prisma.race.upsert({
      where: { externalSourceId: definition.externalSourceId },
      update: definition,
      create: definition
    });

    races.push({ id: race.id, externalSourceId: race.externalSourceId });
  }

  const [race1, race2, race3] = races;

  const runnerDefinitions = [
    {
      raceId: race1.id,
      number: 1,
      horseName: "Icare du Loft",
      jockeyName: "E. Raffin",
      trainerName: "M. Abrivard",
      odds: "4.80",
      isNonRunner: false,
      status: RunnerStatus.CONFIRMED,
      rawDataJson: { music: "1a2a3a", corde: 2 }
    },
    {
      raceId: race1.id,
      number: 4,
      horseName: "Jasmin d'Or",
      jockeyName: "Y. Lebourgeois",
      trainerName: "S. Ernault",
      odds: "8.30",
      isNonRunner: false,
      status: RunnerStatus.DECLARED,
      rawDataJson: { music: "4a1aDa", corde: 5 }
    },
    {
      raceId: race1.id,
      number: 7,
      horseName: "King of Turf",
      jockeyName: "F. Nivard",
      trainerName: "L. Baudron",
      odds: "6.10",
      isNonRunner: true,
      status: RunnerStatus.NON_RUNNER,
      rawDataJson: { note: "non-partant du matin" }
    },
    {
      raceId: race2.id,
      number: 2,
      horseName: "Lutin Noir",
      jockeyName: "K. Nabet",
      trainerName: "D. Cottin",
      odds: "5.20",
      isNonRunner: false,
      status: RunnerStatus.DECLARED,
      rawDataJson: { music: "2h4h1h" }
    },
    {
      raceId: race2.id,
      number: 5,
      horseName: "Mistral Bleu",
      jockeyName: "J. Reveley",
      trainerName: "F. Nicolle",
      odds: "7.40",
      isNonRunner: false,
      status: RunnerStatus.DECLARED,
      rawDataJson: { music: "3h5h2h" }
    },
    {
      raceId: race3.id,
      number: 3,
      horseName: "Nova de Feu",
      jockeyName: "C. Soumillon",
      trainerName: "A. Fabre",
      odds: "3.60",
      isNonRunner: false,
      status: RunnerStatus.CONFIRMED,
      rawDataJson: { music: "1p1p2p" }
    },
    {
      raceId: race3.id,
      number: 8,
      horseName: "Silver Track",
      jockeyName: "M. Guyon",
      trainerName: "H. Pantall",
      odds: "4.90",
      isNonRunner: false,
      status: RunnerStatus.CONFIRMED,
      rawDataJson: { music: "2p4p1p" }
    }
  ];

  for (const runner of runnerDefinitions) {
    await prisma.runner.upsert({
      where: {
        raceId_number: {
          raceId: runner.raceId,
          number: runner.number
        }
      },
      update: {
        ...runner,
        odds: runner.odds
      },
      create: {
        ...runner,
        odds: runner.odds
      }
    });
  }

  await prisma.prediction.upsert({
    where: { raceId: race1.id },
    update: {
      mainPick: "1",
      basePick: "4",
      outsiderPick: "6",
      speculativePick: "8",
      confidenceLabel: ConfidenceLabel.HIGH,
      analysisText: "Icare du Loft conserve la meilleure ligne du lot et reunit les signaux prioritaires de la methode Elite Turf.",
      cautionText: "Surveiller l'etat des non-partants avant validation finale.",
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: admin.id
    },
    create: {
      raceId: race1.id,
      mainPick: "1",
      basePick: "4",
      outsiderPick: "6",
      speculativePick: "8",
      confidenceLabel: ConfidenceLabel.HIGH,
      analysisText: "Icare du Loft conserve la meilleure ligne du lot et reunit les signaux prioritaires de la methode Elite Turf.",
      cautionText: "Surveiller l'etat des non-partants avant validation finale.",
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: admin.id
    }
  });

  await prisma.prediction.upsert({
    where: { raceId: race2.id },
    update: {
      mainPick: "2",
      basePick: "5",
      outsiderPick: "9",
      speculativePick: "11",
      confidenceLabel: ConfidenceLabel.MEDIUM,
      analysisText: "Lecture encore prudente, les cotes du marche doivent etre consolidees avant validation.",
      cautionText: "Terrain et rythme de course a recontroler.",
      approvalStatus: ApprovalStatus.PENDING_REVIEW,
      approvedById: editor.id
    },
    create: {
      raceId: race2.id,
      mainPick: "2",
      basePick: "5",
      outsiderPick: "9",
      speculativePick: "11",
      confidenceLabel: ConfidenceLabel.MEDIUM,
      analysisText: "Lecture encore prudente, les cotes du marche doivent etre consolidees avant validation.",
      cautionText: "Terrain et rythme de course a recontroler.",
      approvalStatus: ApprovalStatus.PENDING_REVIEW,
      approvedById: editor.id
    }
  });

  await prisma.prediction.upsert({
    where: { raceId: race3.id },
    update: {
      mainPick: "3",
      basePick: "8",
      outsiderPick: "6",
      speculativePick: "10",
      confidenceLabel: ConfidenceLabel.VERY_HIGH,
      analysisText: "Nova de Feu presentait toutes les garanties et le scenario a confirme le plan de jeu.",
      cautionText: "Aucune alerte bloquante.",
      approvalStatus: ApprovalStatus.PUBLISHED,
      approvedById: admin.id
    },
    create: {
      raceId: race3.id,
      mainPick: "3",
      basePick: "8",
      outsiderPick: "6",
      speculativePick: "10",
      confidenceLabel: ConfidenceLabel.VERY_HIGH,
      analysisText: "Nova de Feu presentait toutes les garanties et le scenario a confirme le plan de jeu.",
      cautionText: "Aucune alerte bloquante.",
      approvalStatus: ApprovalStatus.PUBLISHED,
      approvedById: admin.id
    }
  });

  await prisma.result.upsert({
    where: { raceId: race3.id },
    update: {
      officialArrival: ["3", "8", "6"],
      officialStatus: ResultOfficialStatus.OFFICIAL,
      importedAt: new Date("2026-04-10T16:10:00.000Z")
    },
    create: {
      raceId: race3.id,
      officialArrival: ["3", "8", "6"],
      officialStatus: ResultOfficialStatus.OFFICIAL,
      importedAt: new Date("2026-04-10T16:10:00.000Z")
    }
  });

  await prisma.result.upsert({
    where: { raceId: race1.id },
    update: {
      officialArrival: [],
      officialStatus: ResultOfficialStatus.PENDING
    },
    create: {
      raceId: race1.id,
      officialArrival: [],
      officialStatus: ResultOfficialStatus.PENDING
    }
  });

  await prisma.publicationJob.deleteMany({});`r`n  await prisma.auditLog.deleteMany({});`r`n`r`n  await prisma.publicationJob.createMany({
    data: [
      {
        raceId: race1.id,
        target: "WordPress REST API",
        mode: PublicationMode.VALIDATED,
        payloadJson: { title: "Pronostic R1C3", slug: "r1c3-vincennes" },
        status: PublicationStatus.READY
      },
      {
        raceId: race3.id,
        target: "Elite Turf CMS",
        mode: PublicationMode.MANUAL,
        payloadJson: { title: "Resultat R2C1" },
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date("2026-04-10T15:35:00.000Z")
      }
    ],
    skipDuplicates: false
  });

  await prisma.race.updateMany({
    data: { runnersCount: 0 }
  });

  for (const race of races) {
    const count = await prisma.runner.count({ where: { raceId: race.id } });
    await prisma.race.update({
      where: { id: race.id },
      data: { runnersCount: count }
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        actionType: AuditActionType.LOGIN,
        entityType: AuditEntityType.AUTH_SESSION,
        entityId: admin.id,
        metadataJson: { seeded: true }
      },
      {
        actorId: admin.id,
        actionType: AuditActionType.CREATE,
        entityType: AuditEntityType.RACE,
        entityId: race1.id,
        metadataJson: { source: "seed" }
      },
      {
        actorId: editor.id,
        actionType: AuditActionType.UPDATE,
        entityType: AuditEntityType.PREDICTION,
        entityId: race2.id,
        metadataJson: { source: "seed", approvalStatus: ApprovalStatus.PENDING_REVIEW }
      },
      {
        actorId: admin.id,
        actionType: AuditActionType.PUBLISH,
        entityType: AuditEntityType.PUBLICATION_JOB,
        entityId: race3.id,
        metadataJson: { status: PublicationStatus.PUBLISHED }
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

