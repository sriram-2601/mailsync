export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  connectedAt?: string;
}

export interface AuthStatus {
  isGoogleConfigured: boolean;
  isConnected: boolean;
  user: UserProfile | null;
  hasGeminiKey: boolean;
}

export interface MonitoringRule {
  id: string;
  userId: string;
  senderEmail: string;
  keywords?: string;
  calendarId: string;
  defaultDuration: number;
  timezone: string;
  isActive: number | boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
}

export interface AutomationSettings {
  userId?: string;
  isAutomationActive: number | boolean;
  pollIntervalSeconds: number;
  defaultCalendarId: string;
  defaultTimezone: string;
  confidenceThreshold: number;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
}

export interface ExtractedMeetingData {
  eventTitle: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timezone: string;
  location: string;
  meetingUrl: string;
  description: string;
  confidence: number;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
}

export interface ProcessedEmail {
  id: string;
  userId: string;
  messageId: string;
  threadId?: string;
  ruleId?: string;
  sender: string;
  subject: string;
  snippet?: string;
  body?: string;
  receivedAt?: string;
  status: 'EVENT_CREATED' | 'NEEDS_REVIEW' | 'IGNORED' | 'ERROR';
  calendarEventId?: string;
  calendarEventUrl?: string;
  extractedData?: ExtractedMeetingData;
  confidence?: number;
  errorMessage?: string;
  processedAt: string;
}

export interface SyncStats {
  totalProcessed: number;
  eventsCreated: number;
  needsReview: number;
  errors: number;
  activeRules: number;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
}
