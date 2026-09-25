import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface FetchedGmailMessage {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
}

/**
 * Decodes base64url encoded string from Gmail payload
 */
function decodeBase64(data: string): string {
  try {
    const sanitized = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(sanitized, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Strips HTML tags and extracts readable plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Recursively extracts email body from Gmail message payload parts
 */
function extractBodyFromPayload(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return '';

  // Direct body data
  if (payload.body && payload.body.data) {
    const decoded = decodeBase64(payload.body.data);
    if (payload.mimeType === 'text/html') {
      return stripHtml(decoded);
    }
    return decoded;
  }

  // Multipart parts
  if (payload.parts && payload.parts.length > 0) {
    // Prefer text/plain if present
    const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      return decodeBase64(plainPart.body.data);
    }

    // Otherwise text/html
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return stripHtml(decodeBase64(htmlPart.body.data));
    }

    // Recurse sub-parts
    for (const part of payload.parts) {
      const extracted = extractBodyFromPayload(part);
      if (extracted) return extracted;
    }
  }

  return '';
}

/**
 * Extracts sender email address from "From" header
 */
function parseSenderEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase().trim();
  return fromHeader.toLowerCase().trim();
}

/**
 * Search Gmail for matching emails based on sender and optional keywords
 */
export async function searchEmails(
  auth: OAuth2Client,
  senderEmail: string,
  keywords?: string,
  maxResults = 25
): Promise<FetchedGmailMessage[]> {
  const gmail = google.gmail({ version: 'v1', auth });

  // Build Gmail search query
  let query = `from:${senderEmail.trim()}`;
  if (keywords && keywords.trim()) {
    query += ` ${keywords.trim()}`;
  }

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults
  });

  const messages = listRes.data.messages || [];
  const fetchedList: FetchedGmailMessage[] = [];

  for (const msgMeta of messages) {
    if (!msgMeta.id) continue;

    try {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: msgMeta.id,
        format: 'full'
      });

      const message = msgRes.data;
      const headers = message.payload?.headers || [];

      const getHeader = (name: string) => {
        const h = headers.find(header => header.name?.toLowerCase() === name.toLowerCase());
        return h?.value || '';
      };

      const from = getHeader('From');
      const subject = getHeader('Subject') || '(No Subject)';
      const dateHeader = getHeader('Date');

      const body = extractBodyFromPayload(message.payload) || message.snippet || '';

      fetchedList.push({
        id: message.id!,
        threadId: message.threadId || message.id!,
        sender: from,
        senderEmail: parseSenderEmail(from),
        subject,
        snippet: message.snippet || '',
        body,
        receivedAt: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString()
      });
    } catch (err) {
      console.error(`[GmailService] Failed to fetch full message for ID ${msgMeta.id}:`, err);
    }
  }

  return fetchedList;
}
