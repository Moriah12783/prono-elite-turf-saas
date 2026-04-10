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
  archivedAt: Date | null;
  archivedBy: {
    name: string;
  } | null;
  publicationJobs: {
    id: string;
    status: PublicationStatus;
  }[];
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
  providerKey?: string;
  deliveryMode?: "mock" | "real";
  requestPayload?: unknown;
  responsePayload?: unknown;
};

export type PublicationProviderInput = {
  publicationJobId: string;
  target: string;
  mode: PublicationMode;
  publicationStatus?: PublicationStatus;
  payload: PublicationPayloadDraft;
  race: {
    id: string;
    raceName: string;
    venue: string;
    raceTime: string;
    raceDateTime?: Date;
  };
};

export type EliteTurfApiPublicationPayload = {
  requestId: string;
  provider: "api-custom";
  target: "elite-turf";
  mode: PublicationMode;
  publicationStatus: string;
  scheduledFor?: string;
  course: {
    id: string;
    externalSourceId?: string;
    raceName: string;
    venue: string;
    raceDateTime?: string;
  };
  article: {
    title: string;
    excerpt?: string;
    content: string;
    contentFormat: "html";
  };
  metadata: {
    sourceSystem: "prono-elite-turf-saas";
    publicationJobId: string;
    generatedAt: string;
  };
};

export type EliteTurfApiPublicationResponse = {
  success: boolean;
  publicationId?: string;
  externalReference?: string;
  status: "accepted" | "draft" | "published" | "failed";
  message?: string;
  receivedAt?: string;
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
    id: string;
    raceName: string;
    venue: string;
    raceTime: string;
    archivedAt?: Date | null;
    prediction: {
      mainPick: string;
      basePick: string;
      outsiderPick: string;
      speculativePick: string;
    } | null;
    publicationJobs: {
      status: PublicationStatus;
    }[];
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
  archivedAt: Date | null;
  approvedBy: {
    name: string;
  } | null;
  archivedBy: {
    name: string;
  } | null;
  race: {
    archivedAt?: Date | null;
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
  archivedAt: Date | null;
  archivedBy: {
    name: string;
  } | null;
  race: {
    archivedAt?: Date | null;
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
