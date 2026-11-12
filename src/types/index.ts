export type UserRole = 'SUPER_ADMIN' | 'DIRECTOR' | 'EXTENSION';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type EventLifecycleStatus =
  | 'PENDING_APPROVAL'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED_PENDING_EVIDENCE'
  | 'CLOSED'
  | 'REJECTED'
  | 'EXPIRED';

export type EvidenceCategory = 'SUPPORTING_DOCUMENT' | 'CLOSURE_EVIDENCE';

export type AccessMode = 'OPEN' | 'RESTRICTED';

export type AttendeeType = 'STUDENT' | 'TEACHER' | 'ADMIN_STAFF' | 'EXTERNAL_GUEST';

export type RegistrationStatus = 'REGISTERED' | 'INVITED' | 'REVOKED';

export type CheckInMethod = 'QR' | 'MANUAL';

export type InvitationStatus = 'PENDING' | 'SENT' | 'FAILED';

export type ScanResult =
  | 'AUTHORIZED'
  | 'DUPLICATE'
  | 'REVOKED'
  | 'WRONG_EVENT'
  | 'CHECKIN_CLOSED'
  | 'INVALID_TOKEN';

export type ReservationStatus = 'PROVISIONAL' | 'APPROVED' | 'RELEASED';

export type ReservationType = 'ORIGINAL' | 'SCHEDULE_CHANGE';

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  buildingId: string | null;
  buildingName: string | null;
  departmentLabel: string | null;
  isDemo: boolean;
}

export interface AvailabilityConflict {
  reservationId: string;
  eventId: string;
  eventName: string;
  demoCode: string | null;
  reservationType: ReservationType;
  status: ReservationStatus;
  date: string;
  startTime: string;
  endTime: string;
  cleaningEndTime: string;
  conflictKind: 'DIRECT_OVERLAP' | 'INVADES_PREVIOUS_CLEANING' | 'CLEANING_INVADES_NEXT_EVENT';
  message: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  date: string;
  startTime: string;
  endTime: string;
  cleaningEndTime: string;
  startMinutes: number;
  endMinutes: number;
  cleaningEndMinutes: number;
  conflicts: AvailabilityConflict[];
}

export interface CalendarSlotBlock {
  id: string;
  eventId: string;
  demoCode: string | null;
  eventName: string;
  spaceId: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  cleaningEndTime: string;
  startMinutes: number;
  endMinutes: number;
  cleaningEndMinutes: number;
  blockCategory: 'APPROVED' | 'PENDING' | 'SCHEDULE_CHANGE_PROPOSED' | 'CLEANING';
  colorCode: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  responsibleName?: string;
  responsibleDepartment?: string;
  criticalityLevel: number;
  hasPendingScheduleChange?: boolean;
  canViewPrivateDetails: boolean;
  lifecycleStatus?: EventLifecycleStatus;
}
