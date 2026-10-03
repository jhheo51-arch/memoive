import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const notificationAttempts = sqliteTable("notification_attempts", {
  id:text("id").primaryKey(),userId:text("user_id").notNull(),channel:text("channel").notNull(),
  day:text("day").notNull(),status:text("status").notNull(),providerMessageId:text("provider_message_id"),
  providerGroupId:text("provider_group_id"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
},t=>[uniqueIndex("idx_notification_pilot_daily").on(t.userId,t.day),index("idx_notification_user_time").on(t.userId,t.createdAt)]);

export const portfolioRecords = sqliteTable("portfolio_records", {
  id:text("id").primaryKey(), userId:text("user_id").notNull(), kind:text("kind").notNull(),
  title:text("title").notNull(), body:text("body").notNull(), status:text("status").notNull().default("draft"),
  createdAt:text("created_at").notNull(), updatedAt:text("updated_at").notNull(),
},t=>[index("idx_portfolio_user_kind").on(t.userId,t.kind)]);
export const sourceReviews = sqliteTable("source_reviews", {
  id:text("id").primaryKey(), userId:text("user_id").notNull(),benefitId:text("benefit_id").notNull(),
  sourceUrl:text("source_url").notNull(), contentHash:text("content_hash"),excerpt:text("excerpt"),
  previousExcerpt:text("previous_excerpt"),status:text("status").notNull(),note:text("note"),
  discoveredAt:text("discovered_at").notNull(),reviewedAt:text("reviewed_at"),
},t=>[index("idx_source_reviews_user_benefit").on(t.userId,t.benefitId)]);
export const experimentAssignments = sqliteTable("experiment_assignments", {
  id:text("id").primaryKey(),userId:text("user_id").notNull(),experimentId:text("experiment_id").notNull(),
  variant:text("variant").notNull(),assignedAt:text("assigned_at").notNull(),
},t=>[uniqueIndex("idx_experiment_user").on(t.userId,t.experimentId)]);

export const pilotSessions = sqliteTable("pilot_sessions", {
  id: text("id").primaryKey(),
  operatorUserId: text("operator_user_id").notNull(),
  participantCode: text("participant_code").notNull(),
  status: text("status").notNull().default("planned"),
  consentStatus: text("consent_status").notNull().default("pending"),
  choicesToFirstBenefit: integer("choices_to_first_benefit"),
  firstBenefitElapsedMs: integer("first_benefit_elapsed_ms"),
  firstBenefitId: text("first_benefit_id"),
  preparationStarted: integer("preparation_started", { mode: "boolean" })
    .notNull()
    .default(false),
  stopPoint: text("stop_point"),
  observation: text("observation"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_pilot_operator_participant").on(
    table.operatorUserId,
    table.participantCode,
  ),
  index("idx_pilot_operator_status").on(table.operatorUserId, table.status),
]);

export const operationalAlerts = sqliteTable("operational_alerts", {
  id: text("id").primaryKey(),
  operatorUserId: text("operator_user_id").notNull(),
  alertKey: text("alert_key").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  status: text("status").notNull().default("open"),
  firstDetectedAt: text("first_detected_at").notNull(),
  lastDetectedAt: text("last_detected_at").notNull(),
  resolvedAt: text("resolved_at"),
}, (table) => [
  uniqueIndex("idx_operational_alert_operator_key").on(
    table.operatorUserId,
    table.alertKey,
  ),
  index("idx_operational_alert_status").on(
    table.operatorUserId,
    table.status,
    table.severity,
  ),
]);

export const operationsHealthRuns = sqliteTable("operations_health_runs", {
  id: text("id").primaryKey(),
  operatorUserId: text("operator_user_id").notNull(),
  overallStatus: text("overall_status").notNull(),
  alertCount: integer("alert_count").notNull().default(0),
  sourceFailureCount: integer("source_failure_count").notNull().default(0),
  notificationFailureCount: integer("notification_failure_count").notNull().default(0),
  dataAnomalyCount: integer("data_anomaly_count").notNull().default(0),
  checkedAt: text("checked_at").notNull(),
}, (table) => [
  index("idx_operations_health_operator_time").on(
    table.operatorUserId,
    table.checkedAt,
  ),
]);

export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  profileData: text("profile_data"),
  dataMode: text("data_mode").notNull().default("demo"),
  confirmedAt: text("confirmed_at"),
  name: text("name").notNull(),
  interestTopics: text("interest_topics", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  interestRoles: text("interest_roles", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  contentTypes: text("content_types", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  preferredChannel: text("preferred_channel").notNull(),
  birthYear: integer("birth_year").notNull().default(1999),
  region: text("region").notNull().default("서울특별시"),
  employmentStatus: text("employment_status").notNull().default("employed"),
  housingStatus: text("housing_status").notNull().default("monthly_rent"),
  annualIncome: integer("annual_income").notNull().default(3200),
  monthlyTransitCost: integer("monthly_transit_cost").notNull().default(60000),
  hasStudentLoan: integer("has_student_loan", { mode: "boolean" })
    .notNull()
    .default(true),
  lifeEvent: text("life_event").notNull().default("first_independence"),
  profileStatement: text("profile_statement"),
  profileContext: text("profile_context", { mode: "json" }).$type<string[]>(),
  householdType: text("household_type").notNull().default("single"),
  careNeeds: text("care_needs", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  restartConsent: integer("restart_consent", { mode: "boolean" })
    .notNull()
    .default(true),
  status: text("status").notNull().default("active"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const benefitApplications = sqliteTable(
  "benefit_applications",
  {
    applicationId: text("application_id").primaryKey(),
    userId: text("user_id").notNull(),
    benefitId: text("benefit_id").notNull(),
    stage: text("stage").notNull().default("checking"),
    eligibilityStatus: text("eligibility_status")
      .notNull()
      .default("needs_info"),
    expectedValue: integer("expected_value").notNull().default(0),
    receivedAmount: integer("received_amount"),
    receivedAt: text("received_at"),
    receiptMethod: text("receipt_method"),
    ruleVersion: text("rule_version"),
    detail: text("detail"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_benefit_applications_user_benefit").on(
      table.userId,
      table.benefitId,
    ),
    index("idx_benefit_applications_stage_updated").on(
      table.stage,
      table.updatedAt,
    ),
  ],
);

export const consentLogs = sqliteTable(
  "consent_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    channel: text("channel").notNull(),
    purpose: text("purpose").notNull(),
    agreed: integer("agreed", { mode: "boolean" }).notNull(),
    agreedAt: text("agreed_at"),
    withdrawnAt: text("withdrawn_at"),
  },
  (table) => [
    index("idx_consent_logs_user_channel").on(table.userId, table.channel),
  ],
);

export const contents = sqliteTable(
  "contents",
  {
    contentId: text("content_id").primaryKey(),
    type: text("type").notNull(),
    topicTags: text("topic_tags", { mode: "json" }).$type<string[]>().notNull(),
    roleTags: text("role_tags", { mode: "json" }).$type<string[]>().notNull(),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    publishedAt: text("published_at").notNull(),
    deadline: text("deadline"),
    approvalStatus: text("approval_status").notNull().default("pending"),
    reviewedAt: text("reviewed_at"),
  },
  (table) => [
    index("idx_contents_approval_published").on(
      table.approvalStatus,
      table.publishedAt,
    ),
  ],
);

export const sends = sqliteTable(
  "sends",
  {
    sendId: text("send_id").primaryKey(),
    userId: text("user_id").notNull(),
    cardIds: text("card_ids", { mode: "json" }).$type<string[]>().notNull(),
    channel: text("channel").notNull(),
    sentAt: text("sent_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    status: text("status").notNull().default("delivered"),
  },
  (table) => [index("idx_sends_user_sent").on(table.userId, table.sentAt)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    sendId: text("send_id"),
    contentId: text("content_id"),
    eventType: text("event_type").notNull(),
    properties: text("properties"),
    eventAt: text("event_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_events_user_time").on(table.userId, table.eventAt),
    index("idx_events_type_time").on(table.eventType, table.eventAt),
  ],
);

export const followupTasks = sqliteTable(
  "followup_tasks",
  {
    taskId: text("task_id").primaryKey(),
    userId: text("user_id").notNull(),
    requestType: text("request_type").notNull(),
    dueAt: text("due_at").notNull(),
    owner: text("owner").notNull().default("미배정"),
    requestDetail: text("request_detail"),
    outcome: text("outcome"),
    status: text("status").notNull().default("open"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_followup_tasks_status_due").on(table.status, table.dueAt),
  ],
);

export const evaluations = sqliteTable(
  "evaluations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    sendId: text("send_id"),
    relevance: text("relevance").notNull(),
    amount: text("amount").notNull(),
    actionIntent: integer("action_intent", { mode: "boolean" }).notNull(),
    improvement: text("improvement"),
    receiveNext: text("receive_next").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_evaluations_user_time").on(table.userId, table.createdAt),
  ],
);
