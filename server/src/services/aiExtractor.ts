import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

export interface ExtractedMeetingInfo {
  eventTitle: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "11:00 AM" or "11:00"
  endTime: string; // e.g. "11:45 AM" or "11:45"
  durationMinutes: number;
  timezone: string;
  location: string;
  meetingUrl: string;
  description: string;
  confidence: number; // 0.0 to 1.0
  isAmbiguous: boolean;
  ambiguityReason?: string;
}

const MONTH_MAP: Record<string, string> = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sept: '09', sep: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12'
};

const COMMON_TIMEZONES = [
  'IST', 'UTC', 'GMT', 'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT',
  'BST', 'CET', 'CEST', 'JST', 'AEST', 'AEDT', 'SGT', 'HKT', 'NZST'
];

/**
 * Extracts meeting links (Google Meet, Zoom, Teams, Webex)
 */
export function extractMeetingUrl(text: string): string {
  // Google Meet
  const meetMatch = text.match(/https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i) ||
                    text.match(/https?:\/\/meet\.google\.com\/[a-zA-Z0-9\-_]+/i);
  if (meetMatch) return meetMatch[0];

  // Zoom
  const zoomMatch = text.match(/https?:\/\/(?:[a-zA-Z0-9\-]+\.)?zoom\.us\/(?:j|my|w)\/[a-zA-Z0-9?&=._\-]+/i);
  if (zoomMatch) return zoomMatch[0];

  // MS Teams
  const teamsMatch = text.match(/https?:\/\/teams\.microsoft\.com\/(?:l\/meetup-join|meet)\/[^\s"<>]+/i);
  if (teamsMatch) return teamsMatch[0];

  // Webex
  const webexMatch = text.match(/https?:\/\/[a-zA-Z0-9.\-]*webex\.com\/[^\s"<>]+/i);
  if (webexMatch) return webexMatch[0];

  return '';
}

/**
 * Extracts date patterns and normalizes to YYYY-MM-DD
 */
export function extractDates(text: string, referenceDate = new Date()): { dates: string[]; ambiguous: boolean } {
  const foundDates: string[] = [];
  const currentYear = referenceDate.getFullYear();

  // Pattern 1: "September 30, 2026" or "Sept 30 2026" or "30th September 2026"
  const monthNameRegex = /\b(january|february|march|april|may|june|july|august|september|sept|sep|october|oct|november|nov|december|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/gi;
  let match;
  while ((match = monthNameRegex.exec(text)) !== null) {
    const month = MONTH_MAP[match[1].toLowerCase()];
    const day = match[2].padStart(2, '0');
    const year = match[3] || currentYear.toString();
    const isoDate = `${year}-${month}-${day}`;
    if (!foundDates.includes(isoDate)) foundDates.push(isoDate);
  }

  // Pattern 2: "30th September 2026" or "30 September 2026"
  const dayFirstRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|sept|sep|october|oct|november|nov|december|dec)[a-z]*\.?(?:,?\s+(\d{4}))?\b/gi;
  while ((match = dayFirstRegex.exec(text)) !== null) {
    const day = match[1].padStart(2, '0');
    const month = MONTH_MAP[match[2].toLowerCase()];
    const year = match[3] || currentYear.toString();
    const isoDate = `${year}-${month}-${day}`;
    if (!foundDates.includes(isoDate)) foundDates.push(isoDate);
  }

  // Pattern 3: ISO format "YYYY-MM-DD"
  const isoRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((match = isoRegex.exec(text)) !== null) {
    const isoDate = match[0];
    if (!foundDates.includes(isoDate)) foundDates.push(isoDate);
  }

  // Pattern 4: "MM/DD/YYYY" or "DD/MM/YYYY" (assume MM/DD/YYYY if first number <= 12)
  const slashRegex = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
  while ((match = slashRegex.exec(text)) !== null) {
    const part1 = parseInt(match[1], 10);
    const part2 = parseInt(match[2], 10);
    const year = match[3];
    // if part1 <= 12 and part2 > 12 -> MM/DD/YYYY
    if (part1 <= 12 && part2 > 12) {
      const isoDate = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      if (!foundDates.includes(isoDate)) foundDates.push(isoDate);
    } else {
      // standard US format fallback
      const isoDate = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      if (!foundDates.includes(isoDate)) foundDates.push(isoDate);
    }
  }

  // Check for ambiguous multiple conflicting dates
  const isAmbiguous = foundDates.length > 1;
  return { dates: foundDates, ambiguous: isAmbiguous };
}

/**
 * Extracts time information and timezones
 */
export function extractTimes(text: string): {
  startTime: string;
  endTime: string;
  timezone: string;
  durationMinutes: number;
  ambiguous: boolean;
} {
  let startTime = '';
  let endTime = '';
  let timezone = '';
  let durationMinutes = 0;
  let ambiguous = false;

  // 1. Timezone detection
  for (const tz of COMMON_TIMEZONES) {
    const tzRegex = new RegExp(`\\b${tz}\\b`, 'i');
    if (tzRegex.test(text)) {
      timezone = tz.toUpperCase();
      break;
    }
  }

  // 2. Duration detection: "Duration: 45 minutes", "45 mins", "1 hour"
  const durationMatch = text.match(/(?:duration\s*:\s*|for\s+)?(\d+(?:\.\d+)?)\s*(minutes|minute|mins|min|hours|hour|hrs|hr)\b/i);
  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('h')) {
      durationMinutes = Math.round(val * 60);
    } else {
      durationMinutes = Math.round(val);
    }
  }

  // 3. Time range pattern: "11:00 AM - 11:45 AM" or "11:00 AM to 12:00 PM"
  const timeRangeRegex = /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s*(?:-|–|to|until)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i;
  const rangeMatch = text.match(timeRangeRegex);
  if (rangeMatch) {
    startTime = rangeMatch[1].trim();
    endTime = rangeMatch[2].trim();
  } else {
    // 4. Single time: "at 11:00 AM" or "11:00 AM"
    const singleTimeRegex = /\b(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\b/gi;
    const timesFound: string[] = [];
    let tMatch;
    while ((tMatch = singleTimeRegex.exec(text)) !== null) {
      timesFound.push(tMatch[1].trim());
    }

    if (timesFound.length === 1) {
      startTime = timesFound[0];
    } else if (timesFound.length > 2) {
      ambiguous = true;
      startTime = timesFound[0];
    } else if (timesFound.length === 2) {
      startTime = timesFound[0];
      endTime = timesFound[1];
    }
  }

  // 24-hour time fallback: "at 14:00" or "14:30 hrs"
  if (!startTime) {
    const militaryRegex = /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?:\s*hrs|\s*hours)?\b/i;
    const mMatch = text.match(militaryRegex);
    if (mMatch) {
      startTime = `${mMatch[1]}:${mMatch[2]}`;
    }
  }

  return { startTime, endTime, timezone, durationMinutes, ambiguous };
}

/**
 * Clean up title and location heuristics
 */
export function extractTitleAndLocation(subject: string, body: string, meetingUrl: string): { title: string; location: string } {
  // Title heuristic: Clean subject line
  let title = subject.replace(/^(?:re|fwd|fw):\s*/gi, '').trim();
  if (!title) {
    const firstLine = body.split('\n').map(l => l.trim()).find(l => l.length > 5);
    title = firstLine ? firstLine.substring(0, 60) : 'Scheduled Meeting';
  }

  // Location heuristic
  let location = '';
  const locMatch = body.match(/(?:location|venue|where)\s*:\s*([^\n\r]+)/i);
  if (locMatch) {
    location = locMatch[1].trim();
  } else if (meetingUrl) {
    location = 'Online';
  }

  return { title, location };
}

/**
 * Calculate end time from start time and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime || !durationMinutes) return '';
  
  const match = startTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
  if (!match) return '';

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const totalMinutes = hours * 60 + minutes + durationMinutes;
  let endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  if (meridiem) {
    const endMeridiem = endHours >= 12 ? 'PM' : 'AM';
    const displayHours = endHours % 12 || 12;
    return `${displayHours}:${endMinutes.toString().padStart(2, '0')} ${endMeridiem}`;
  } else {
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }
}

/**
 * Built-in deterministic Heuristic NLP Extractor
 */
export function extractMeetingWithHeuristics(
  subject: string,
  body: string,
  defaultDuration = 45,
  defaultTimezone = 'UTC'
): ExtractedMeetingInfo {
  const combinedText = `${subject}\n\n${body}`;

  const meetingUrl = extractMeetingUrl(combinedText);
  const { dates, ambiguous: dateAmbiguous } = extractDates(combinedText);
  const { startTime, endTime: rawEndTime, timezone: extractedTz, durationMinutes: extractedDuration, ambiguous: timeAmbiguous } = extractTimes(combinedText);
  const { title, location } = extractTitleAndLocation(subject, body, meetingUrl);

  const durationMinutes = extractedDuration > 0 ? extractedDuration : defaultDuration;
  const timezone = extractedTz || defaultTimezone;

  const date = dates.length > 0 ? dates[0] : '';
  const endTime = rawEndTime || (startTime ? calculateEndTime(startTime, durationMinutes) : '');

  // Confidence & Ambiguity evaluation
  let confidence = 0.0;
  let isAmbiguous = false;
  let ambiguityReason = '';

  if (date) confidence += 0.40;
  if (startTime) confidence += 0.30;
  if (meetingUrl || location) confidence += 0.15;
  if (durationMinutes > 0 || endTime) confidence += 0.10;
  if (title) confidence += 0.05;

  if (dateAmbiguous) {
    isAmbiguous = true;
    ambiguityReason = 'Multiple possible dates detected in email body.';
    confidence = Math.min(confidence, 0.50);
  } else if (timeAmbiguous) {
    isAmbiguous = true;
    ambiguityReason = 'Multiple conflicting meeting times detected.';
    confidence = Math.min(confidence, 0.50);
  } else if (!date || !startTime) {
    isAmbiguous = true;
    ambiguityReason = !date && !startTime 
      ? 'No clear date and time found in email.' 
      : (!date ? 'No clear date identified.' : 'No clear meeting start time identified.');
    confidence = Math.min(confidence, 0.45);
  }

  // Ensure confidence is between 0.0 and 1.0
  confidence = Math.round(Math.min(1.0, Math.max(0.0, confidence)) * 100) / 100;

  return {
    eventTitle: title,
    date,
    startTime,
    endTime,
    durationMinutes,
    timezone,
    location,
    meetingUrl,
    description: body.trim().substring(0, 800),
    confidence,
    isAmbiguous,
    ambiguityReason: ambiguityReason || undefined
  };
}

/**
 * Gemini AI Structured Extractor (when GEMINI_API_KEY is configured)
 */
export async function extractMeetingWithGemini(
  subject: string,
  body: string,
  defaultDuration = 45,
  defaultTimezone = 'UTC'
): Promise<ExtractedMeetingInfo | null> {
  if (!config.geminiApiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const prompt = `
You are an expert scheduling assistant. Extract structured meeting and scheduling details from the following email.
Current reference year is ${new Date().getFullYear()}.

Subject: ${subject}
Email Content:
"""
${body}
"""

Extract the information into the exact following JSON structure:
{
  "eventTitle": "Descriptive title for calendar event (e.g. 'Interview Scheduled – Software Engineer')",
  "date": "YYYY-MM-DD format (empty if not specified or ambiguous)",
  "startTime": "Start time e.g. '11:00 AM' or '14:00' (empty if not specified)",
  "endTime": "End time e.g. '11:45 AM' or calculated from duration (empty if not specified)",
  "durationMinutes": number (default to ${defaultDuration} if not explicitly stated),
  "timezone": "Timezone e.g. 'IST', 'PST', 'UTC' (default to '${defaultTimezone}' if unstated)",
  "location": "Meeting location or 'Online'",
  "meetingUrl": "Valid URL to Google Meet, Zoom, MS Teams, Webex if present, or empty string",
  "description": "Concise summary of relevant details from original email",
  "confidence": number between 0.0 and 1.0 (how confident you are in date and start time),
  "isAmbiguous": boolean (true if email has multiple conflicting dates, asks user to choose between dates, or lacks clear date/time),
  "ambiguityReason": "Explanation if isAmbiguous is true"
}

IMPORTANT:
- If the email suggests multiple different dates/times or asks the recipient to choose a slot, mark isAmbiguous = true and confidence <= 0.5.
- If date or startTime is missing, confidence must be <= 0.4 and isAmbiguous = true.
- Output ONLY valid JSON.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as ExtractedMeetingInfo;

    // Validate fields
    if (parsed && typeof parsed.confidence === 'number') {
      return {
        eventTitle: parsed.eventTitle || subject,
        date: parsed.date || '',
        startTime: parsed.startTime || '',
        endTime: parsed.endTime || '',
        durationMinutes: parsed.durationMinutes || defaultDuration,
        timezone: parsed.timezone || defaultTimezone,
        location: parsed.location || (parsed.meetingUrl ? 'Online' : ''),
        meetingUrl: parsed.meetingUrl || '',
        description: parsed.description || body.substring(0, 500),
        confidence: Math.round(parsed.confidence * 100) / 100,
        isAmbiguous: Boolean(parsed.isAmbiguous),
        ambiguityReason: parsed.ambiguityReason
      };
    }
  } catch (error) {
    console.warn('[AIExtractor] Gemini API extraction failed or timed out, falling back to heuristics:', error);
  }

  return null;
}

/**
 * Unified extractor: attempts Gemini first if key available, falls back to heuristic engine.
 */
export async function extractMeetingInfo(
  subject: string,
  body: string,
  defaultDuration = 45,
  defaultTimezone = 'UTC'
): Promise<ExtractedMeetingInfo> {
  if (config.geminiApiKey) {
    const aiResult = await extractMeetingWithGemini(subject, body, defaultDuration, defaultTimezone);
    if (aiResult) {
      return aiResult;
    }
  }

  return extractMeetingWithHeuristics(subject, body, defaultDuration, defaultTimezone);
}
