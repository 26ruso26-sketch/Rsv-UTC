import { EventLifecycleStatus } from '@/types';

/**
 * Forma del JSON que entrega /api/reports (ver src/lib/reports-service.ts).
 * Compartida por la vista de reportes y por la vista imprimible de la
 * plantilla institucional.
 */
export interface ReportData {
  summary: {
    totalEvents: number;
    pendingApproval: number;
    scheduled: number;
    inProgress: number;
    completedPendingEvidence: number;
    closed: number;
    rejected: number;
    expired: number;
    openEvents: number;
    restrictedEvents: number;
    totalRegisteredActive: number;
    totalRevoked: number;
    totalQrGenerated: number;
    totalInvitationsSent: number;
    totalInvitationsFailed: number;
    totalInvitationsPending: number;
    totalCheckedIn: number;
    totalCheckedInQr: number;
    totalCheckedInManual: number;
    totalPendingCheckIn: number;
    globalAttendancePct: number;
    globalOccupancyPct: number;
    totalScanAttempts: number;
    totalScanRejected: number;
  };
  bySpace: {
    spaceName: string;
    buildingName: string;
    capacity: number;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    closed: number;
    pendingEvidence: number;
    registeredAttendees: number;
    checkedInAttendees: number;
  }[];
  byBuilding: {
    buildingName: string;
    totalEvents: number;
    approvedEvents: number;
    closedEvents: number;
    pendingEvidenceEvents: number;
    registeredAttendees: number;
    checkedInAttendees: number;
  }[];
  byCareer: {
    code: string;
    name: string;
    registered: number;
    checkedIn: number;
    attendancePct: number;
  }[];
  byAcademicGrade: {
    code: string;
    name: string;
    levelOrder: number;
    registered: number;
    checkedIn: number;
    attendancePct: number;
  }[];
  byDepartmentArea: {
    code: string;
    name: string;
    areaType: string;
    registered: number;
    checkedIn: number;
    attendancePct: number;
  }[];
  byAttendeeType: {
    type: string;
    label: string;
    registered: number;
    checkedIn: number;
    qrMethod: number;
    manualMethod: number;
  }[];
  peakCheckInHours: { hour: string; count: number }[];
  events: {
    id: string;
    demoCode?: string | null;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    cleaningEndTime: string;
    responsibleName: string;
    responsibleDepartment: string;
    criticalityLevel: number;
    lifecycleStatus: EventLifecycleStatus;
    space: { name: string; capacity: number; building?: { name: string } | null };
    createdBy: { fullName: string; username: string };
    spaceRequest?: { status: string } | null;
    equipmentRequest?: { status: string } | null;
    attendanceStats: {
      accessMode: string;
      checkInOpen: boolean;
      registeredActive: number;
      revoked: number;
      qrGenerated: number;
      invitationsSent: number;
      invitationsFailed: number;
      invitationsPending: number;
      checkedIn: number;
      pendingCheckIn: number;
      attendancePct: number;
      spaceCapacity: number;
      occupancyPct: number;
      rejectedScans: number;
    };
    filteredAttendees: {
      id: string;
      fullName: string;
      email: string;
      attendeeType: string;
      enrollmentNumber: string | null;
      careerName: string | null;
      academicGradeName: string | null;
      departmentAreaName: string | null;
      organization: string | null;
      registrationStatus: string;
      checkedInAt: string | null;
      checkInMethod: string | null;
      checkedInByName: string | null;
      invitationStatus: string;
    }[];
  }[];
}
