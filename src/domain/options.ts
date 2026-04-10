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

export const USER_ROLE_OPTIONS = [UserRole.ADMIN, UserRole.EDITOR, UserRole.SUPER_ADMIN] as const;
export const RACE_STATUS_OPTIONS = [
  RaceStatus.COLLECTED,
  RaceStatus.PENDING_VALIDATION,
  RaceStatus.VALIDATED,
  RaceStatus.PREDICTION_GENERATED,
  RaceStatus.DRAFT_READY,
  RaceStatus.APPROVED,
  RaceStatus.PUBLISHED,
  RaceStatus.ARCHIVED,
  RaceStatus.RESULT_INTEGRATED
] as const;
export const PUBLICATION_STATUS_OPTIONS = [
  PublicationStatus.DRAFT,
  PublicationStatus.READY,
  PublicationStatus.PUBLISHED,
  PublicationStatus.FAILED
] as const;
export const RUNNER_STATUS_OPTIONS = [RunnerStatus.DECLARED, RunnerStatus.NON_RUNNER, RunnerStatus.CONFIRMED] as const;
export const APPROVAL_STATUS_OPTIONS = [
  ApprovalStatus.DRAFT,
  ApprovalStatus.PENDING_REVIEW,
  ApprovalStatus.APPROVED,
  ApprovalStatus.REJECTED,
  ApprovalStatus.PUBLISHED
] as const;
export const CONFIDENCE_LABEL_OPTIONS = [
  ConfidenceLabel.LOW,
  ConfidenceLabel.MEDIUM,
  ConfidenceLabel.HIGH,
  ConfidenceLabel.VERY_HIGH
] as const;
export const RESULT_STATUS_OPTIONS = [ResultOfficialStatus.PENDING, ResultOfficialStatus.PARTIAL, ResultOfficialStatus.OFFICIAL] as const;
export const PUBLICATION_MODE_OPTIONS = [
  PublicationMode.MANUAL,
  PublicationMode.AUTO_DRAFT,
  PublicationMode.VALIDATED,
  PublicationMode.CONDITIONAL_AUTOMATIC
] as const;
export const AUDIT_ACTION_OPTIONS = [
  AuditActionType.CREATE,
  AuditActionType.UPDATE,
  AuditActionType.DELETE,
  AuditActionType.VALIDATE,
  AuditActionType.APPROVE,
  AuditActionType.PUBLISH,
  AuditActionType.LOGIN,
  AuditActionType.LOGOUT
] as const;
export const AUDIT_ENTITY_OPTIONS = [
  AuditEntityType.USER,
  AuditEntityType.RACE,
  AuditEntityType.RUNNER,
  AuditEntityType.PREDICTION,
  AuditEntityType.RESULT,
  AuditEntityType.PUBLICATION_JOB,
  AuditEntityType.AUTH_SESSION
] as const;
