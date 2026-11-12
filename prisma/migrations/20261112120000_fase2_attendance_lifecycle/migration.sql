-- AlterTable Event (Additive)
ALTER TABLE "Event" ADD COLUMN "closedAt" DATETIME;
ALTER TABLE "Event" ADD COLUMN "closedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable EventEvidence (Additive)
ALTER TABLE "EventEvidence" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'SUPPORTING_DOCUMENT';
ALTER TABLE "EventEvidence" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventEvidence" ADD COLUMN "replacedById" TEXT;
ALTER TABLE "EventEvidence" ADD COLUMN "replacementReason" TEXT;

-- CreateTable Career
CREATE TABLE "Career" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable AcademicGrade
CREATE TABLE "AcademicGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "levelOrder" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable DepartmentArea
CREATE TABLE "DepartmentArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaType" TEXT NOT NULL DEFAULT 'ACADEMIC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable EventAttendanceConfig
CREATE TABLE "EventAttendanceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "accessMode" TEXT NOT NULL DEFAULT 'RESTRICTED',
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicRegistrationToken" TEXT NOT NULL,
    "registrationStartAt" DATETIME,
    "registrationEndAt" DATETIME,
    "checkInOpen" BOOLEAN NOT NULL DEFAULT false,
    "checkInClosedAt" DATETIME,
    "institutionalEmailDomain" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventAttendanceConfig_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable EventAttendee
CREATE TABLE "EventAttendee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "attendeeType" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enrollmentNumber" TEXT,
    "careerId" TEXT,
    "academicGradeId" TEXT,
    "departmentAreaId" TEXT,
    "organization" TEXT,
    "registrationStatus" TEXT NOT NULL DEFAULT 'INVITED',
    "privacyAcceptedAt" DATETIME,
    "createdById" TEXT,
    "revokedAt" DATETIME,
    "revokedById" TEXT,
    "revocationReason" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventAttendee_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventAttendee_academicGradeId_fkey" FOREIGN KEY ("academicGradeId") REFERENCES "AcademicGrade" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventAttendee_departmentAreaId_fkey" FOREIGN KEY ("departmentAreaId") REFERENCES "DepartmentArea" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventAttendee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventAttendee_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable AttendeeQrCredential
CREATE TABLE "AttendeeQrCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventAttendeeId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "qrImagePath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "expiresAt" DATETIME,
    CONSTRAINT "AttendeeQrCredential_eventAttendeeId_fkey" FOREIGN KEY ("eventAttendeeId") REFERENCES "EventAttendee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable EventAttendance
CREATE TABLE "EventAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventAttendeeId" TEXT NOT NULL,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInById" TEXT,
    "registrationMethod" TEXT NOT NULL DEFAULT 'QR',
    "notes" TEXT,
    CONSTRAINT "EventAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventAttendance_eventAttendeeId_fkey" FOREIGN KEY ("eventAttendeeId") REFERENCES "EventAttendee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventAttendance_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable InvitationDelivery
CREATE TABLE "InvitationDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventAttendeeId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME,
    "lastAttemptAt" DATETIME,
    "errorMessage" TEXT,
    "providerMessageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvitationDelivery_eventAttendeeId_fkey" FOREIGN KEY ("eventAttendeeId") REFERENCES "EventAttendee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable EventAccessOperator
CREATE TABLE "EventAccessOperator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "EventAccessOperator_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventAccessOperator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventAccessOperator_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable AttendanceScanLog
CREATE TABLE "AttendanceScanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "attendeeId" TEXT,
    "operatorId" TEXT NOT NULL,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'QR',
    "details" TEXT,
    CONSTRAINT "AttendanceScanLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceScanLog_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "EventAttendee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttendanceScanLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndexes
CREATE UNIQUE INDEX "Career_code_key" ON "Career"("code");
CREATE UNIQUE INDEX "Career_name_key" ON "Career"("name");
CREATE INDEX "Career_code_idx" ON "Career"("code");

CREATE UNIQUE INDEX "AcademicGrade_code_key" ON "AcademicGrade"("code");
CREATE UNIQUE INDEX "AcademicGrade_name_key" ON "AcademicGrade"("name");
CREATE INDEX "AcademicGrade_levelOrder_idx" ON "AcademicGrade"("levelOrder");

CREATE UNIQUE INDEX "DepartmentArea_code_key" ON "DepartmentArea"("code");
CREATE UNIQUE INDEX "DepartmentArea_name_key" ON "DepartmentArea"("name");
CREATE INDEX "DepartmentArea_areaType_idx" ON "DepartmentArea"("areaType");

CREATE INDEX "EventEvidence_eventId_category_idx" ON "EventEvidence"("eventId", "category");

CREATE UNIQUE INDEX "EventAttendanceConfig_eventId_key" ON "EventAttendanceConfig"("eventId");
CREATE UNIQUE INDEX "EventAttendanceConfig_publicRegistrationToken_key" ON "EventAttendanceConfig"("publicRegistrationToken");
CREATE INDEX "EventAttendanceConfig_publicRegistrationToken_idx" ON "EventAttendanceConfig"("publicRegistrationToken");
CREATE INDEX "EventAttendanceConfig_accessMode_idx" ON "EventAttendanceConfig"("accessMode");

CREATE INDEX "EventAttendee_eventId_registrationStatus_idx" ON "EventAttendee"("eventId", "registrationStatus");
CREATE INDEX "EventAttendee_eventId_email_idx" ON "EventAttendee"("eventId", "email");
CREATE INDEX "EventAttendee_eventId_enrollmentNumber_idx" ON "EventAttendee"("eventId", "enrollmentNumber");
CREATE INDEX "EventAttendee_attendeeType_idx" ON "EventAttendee"("attendeeType");
CREATE INDEX "EventAttendee_careerId_idx" ON "EventAttendee"("careerId");
CREATE INDEX "EventAttendee_academicGradeId_idx" ON "EventAttendee"("academicGradeId");
CREATE INDEX "EventAttendee_departmentAreaId_idx" ON "EventAttendee"("departmentAreaId");

CREATE UNIQUE INDEX "AttendeeQrCredential_tokenHash_key" ON "AttendeeQrCredential"("tokenHash");
CREATE INDEX "AttendeeQrCredential_eventAttendeeId_isActive_idx" ON "AttendeeQrCredential"("eventAttendeeId", "isActive");
CREATE INDEX "AttendeeQrCredential_tokenHash_idx" ON "AttendeeQrCredential"("tokenHash");

CREATE UNIQUE INDEX "EventAttendance_eventAttendeeId_key" ON "EventAttendance"("eventAttendeeId");
CREATE INDEX "EventAttendance_eventId_checkedInAt_idx" ON "EventAttendance"("eventId", "checkedInAt");

CREATE INDEX "InvitationDelivery_eventAttendeeId_status_idx" ON "InvitationDelivery"("eventAttendeeId", "status");
CREATE INDEX "InvitationDelivery_status_idx" ON "InvitationDelivery"("status");

CREATE UNIQUE INDEX "EventAccessOperator_eventId_userId_key" ON "EventAccessOperator"("eventId", "userId");
CREATE INDEX "EventAccessOperator_userId_active_idx" ON "EventAccessOperator"("userId", "active");

CREATE INDEX "AttendanceScanLog_eventId_attemptedAt_idx" ON "AttendanceScanLog"("eventId", "attemptedAt");
CREATE INDEX "AttendanceScanLog_eventId_result_idx" ON "AttendanceScanLog"("eventId", "result");
CREATE INDEX "AttendanceScanLog_operatorId_idx" ON "AttendanceScanLog"("operatorId");

