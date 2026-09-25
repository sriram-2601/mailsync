import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ExtractedMeetingInfo } from './aiExtractor.js';

export interface CalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
}

export interface CreatedEventResult {
  eventId: string;
  htmlLink: string;
}

// Common timezone abbreviation to IANA timezone mapping
const TZ_MAP: Record<string, string> = {
  'IST': 'Asia/Kolkata',
  'UTC': 'UTC',
  'GMT': 'GMT',
  'EST': 'America/New_York',
  'EDT': 'America/New_York',
  'CST': 'America/Chicago',
  'CDT': 'America/Chicago',
  'MST': 'America/Denver',
  'MDT': 'America/Denver',
  'PST': 'America/Los_Angeles',
  'PDT': 'America/Los_Angeles',
  'BST': 'Europe/London',
  'CET': 'Europe/Paris',
  'CEST': 'Europe/Paris',
  'JST': 'Asia/Tokyo',
  'SGT': 'Asia/Singapore',
  'HKT': 'Asia/Hong_Kong',
  'AEST': 'Australia/Sydney',
  'AEDT': 'Australia/Sydney'
};

export function resolveIanaTimezone(tz?: string): string {
  if (!tz) return 'UTC';
  const upper = tz.toUpperCase().trim();
  if (TZ_MAP[upper]) return TZ_MAP[upper];
  // If already an IANA timezone e.g. "Asia/Kolkata" or "America/New_York"
  if (tz.includes('/')) return tz;
  return 'UTC';
}

/**
 * Converts date string (YYYY-MM-DD) and time string (e.g. "11:00 AM" or "14:30") into ISO local format "YYYY-MM-DDTHH:mm:ss"
 */
export function formatToLocalIso(dateStr: string, timeStr: string): string {
  const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
  let hours = 9;
  let minutes = 0;

  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }

  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  return `${dateStr}T${hStr}:${mStr}:00`;
}

/**
 * Fetch list of Google Calendars for the user
 */
export async function listUserCalendars(auth: OAuth2Client): Promise<CalendarItem[]> {
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.calendarList.list({
    minAccessRole: 'writer' // only calendars the user can write to
  });

  return (res.data.items || []).map(item => ({
    id: item.id || '',
    summary: item.summary || 'Untitled Calendar',
    description: item.description || '',
    primary: Boolean(item.primary),
    backgroundColor: item.backgroundColor || '#4285F4'
  }));
}

/**
 * Creates a Google Calendar event from extracted data and original email details
 */
export async function createGoogleCalendarEvent(
  auth: OAuth2Client,
  calendarId: string,
  info: ExtractedMeetingInfo,
  originalEmail: { sender: string; subject: string; snippet?: string }
): Promise<CreatedEventResult> {
  const calendar = google.calendar({ version: 'v3', auth });

  const ianaTimezone = resolveIanaTimezone(info.timezone);
  const startDateTime = formatToLocalIso(info.date, info.startTime);
  const endDateTime = formatToLocalIso(info.date, info.endTime || info.startTime);

  // Build clean description containing original email context
  let description = `${info.description ? info.description + '\n\n' : ''}`;
  description += `----------------------------------------\n`;
  description += `📅 Auto-scheduled by MailCal Sync from Gmail\n`;
  description += `✉️ From: ${originalEmail.sender}\n`;
  description += `📝 Subject: ${originalEmail.subject}\n`;
  if (info.meetingUrl) {
    description += `🔗 Meeting Link: ${info.meetingUrl}\n`;
  }
  if (originalEmail.snippet) {
    description += `\nSnippet:\n"${originalEmail.snippet}"\n`;
  }

  const location = info.meetingUrl || info.location || 'Online';

  const requestBody: any = {
    summary: info.eventTitle,
    location,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: ianaTimezone
    },
    end: {
      dateTime: endDateTime,
      timeZone: ianaTimezone
    },
    reminders: {
      useDefault: true
    }
  };

  const insertRes = await calendar.events.insert({
    calendarId: calendarId || 'primary',
    requestBody
  });

  if (!insertRes.data.id) {
    throw new Error('Google Calendar API did not return an event ID');
  }

  return {
    eventId: insertRes.data.id,
    htmlLink: insertRes.data.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${insertRes.data.id}`
  };
}
