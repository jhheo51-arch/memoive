export const RETENTION_POLICY={
  notificationAttemptsDays:90,
  activityDays:180,
  operationsHealthDays:180,
  followupDays:365,
  accountRecords:"계정 삭제 전까지",
  enforcement:"로그인한 계정이 서비스를 열 때 만료 자료를 정리",
} as const;

export const PILOT_PARTICIPANT_CODES=["P01","P02","P03","P04","P05"] as const;
export const PILOT_STATUSES=["planned","invited","scheduled","observed","completed","withdrawn"] as const;
export const PILOT_CONSENT_STATUSES=["pending","agreed","withdrawn"] as const;
