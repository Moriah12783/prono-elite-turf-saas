import { ApprovalStatus, ConfidenceLabel, PublicationMode, PublicationStatus, RaceStatus, ResultOfficialStatus, RunnerStatus } from "@prisma/client";

export type AdminRaceRecord = {
  id: string;
  raceName: string;
  venue: string;
  raceDate: Date;
  raceTime: string;
  raceDateTime: Date;
  discipline: string;
  distance: number;
  runnersCount: number;
  status: RaceStatus;
  qualityScore: number | null;
  publicationStatus: PublicationStatus;
  prediction: {
    id: string;
    approvalStatus: ApprovalStatus;
  } | null;
  result: {
    id: string;
    officialStatus: ResultOfficialStatus;
  } | null;
};

export type PublicationPayloadDraft = {
  title: string;
  body: string;
  excerpt?: string;
};

export type PublicationPreflightResult = {
  isPublishable: boolean;
  status: PublicationStatus;
  reasons: string[];
};

export type PublicationExecutionResult = {
  success: boolean;
  status: PublicationStatus;
  publishedAt?: Date;
  errorMessage?: string;
  externalReference?: string;
};

export type PublicationProviderInput = {
  publicationJobId: string;
  target: string;
  mode: PublicationMode;
  payload: PublicationPayloadDraft;
  race: {
    id: string;
    raceName: string;
    venue: string;
    raceTime: string;
  };
};

export type AdminRunnerRecord = {
  id: string;
  raceId: string;
  number: number;
  horseName: string;
  jockeyName: string | null;
  trainerName: string | null;
  odds: string | null;
  isNonRunner: boolean;
  status: RunnerStatus;
  race: {
    raceName: string;
    venue: string;
    raceTime: string;
  };
};

export type AdminPredictionRecord = {
  id: string;
  raceId: string;
  mainPick: string;
  basePick: string;
  outsiderPick: string;
  speculativePick: string;
  confidenceLabel: ConfidenceLabel;
  analysisText: string;
  cautionText: string;
  approvalStatus: ApprovalStatus;
  generatedAt: Date;
  approvedBy: {
    name: string;
  } | null;
  race: {
    raceName: string;
    venue: string;
    raceTime: string;
  };
};

export type AdminResultRecord = {
  id: string;
  raceId: string;
  officialArrival: string[];
  officialStatus: ResultOfficialStatus;
  importedAt: Date | null;
  race: {
    raceName: string;
    venue: string;
    raceTime: string;
  };
  prediction: {
    mainPick: string;
    basePick: string;
    outsiderPick: string;
    speculativePick: string;
  } | null;
};
