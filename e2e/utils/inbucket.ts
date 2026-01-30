/**
 * Mailpit API client for email retrieval in E2E tests
 * Note: Supabase local dev now uses Mailpit instead of Inbucket
 * API docs: https://mailpit.axllent.org/docs/api-v1/
 */

interface MailpitAddress {
  Name: string;
  Address: string;
}

interface MailpitMessageSummary {
  ID: string;
  MessageID: string;
  Read: boolean;
  From: MailpitAddress;
  To: MailpitAddress[];
  Cc: MailpitAddress[];
  Bcc: MailpitAddress[];
  ReplyTo: MailpitAddress[];
  Subject: string;
  Created: string;
  Tags: string[];
  Size: number;
  Attachments: number;
  Snippet: string;
}

export interface MailpitMessagesResponse {
  total: number;
  unread: number;
  count: number;
  messages_count: number;
  start: number;
  tags: string[];
  messages: MailpitMessageSummary[];
}

export interface MailpitMessage {
  ID: string;
  MessageID: string;
  From: MailpitAddress;
  To: MailpitAddress[];
  Subject: string;
  Date: string;
  Text: string;
  HTML: string;
  Size: number;
  Attachments: unknown[];
}

// Backwards-compatible interface for existing code
export interface InbucketMessageHeader {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
}

interface InbucketMessageBody {
  text: string;
  html: string;
}

export interface InbucketMessage {
  mailbox: string;
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
  body: InbucketMessageBody;
  header: Record<string, string[]>;
}

export class InbucketClient {
  readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.INBUCKET_URL || 'http://localhost:54324';
  }

  /**
   * List all messages for a specific email address, sorted by date descending
   */
  async listMessages(mailbox: string): Promise<InbucketMessageHeader[]> {
    // Mailpit doesn't have per-mailbox listing. We page through messages and filter by recipient.
    // IMPORTANT: Do not assume any particular sort order from the API response.
    const limit = 200;
    const maxPages = 5; // scan up to ~1000 messages for stability in busy suites
    const mailboxLower = mailbox.toLowerCase();

    const matchesRecipient = (msg: MailpitMessageSummary): boolean => {
      return msg.To.some((to) => {
        const addr = to.Address?.toLowerCase?.() ?? '';
        if (!addr) return false;
        // If caller passed full email, match exactly.
        if (mailbox.includes('@')) {
          return addr === mailboxLower;
        }
        // Otherwise match by local-part (before @) so TEST_USER_EMAIL can use any domain.
        const local = addr.split('@')[0] ?? '';
        return local === mailboxLower;
      });
    };

    const filteredMessages: MailpitMessageSummary[] = [];
    for (let page = 0; page < maxPages; page++) {
      const start = page * limit;
      const url = new URL(`${this.baseUrl}/api/v1/messages`);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('start', String(start));
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to list messages: ${response.statusText}`);
      }
      const data: MailpitMessagesResponse = await response.json();
      if (!data?.messages?.length) break;
      filteredMessages.push(...data.messages.filter(matchesRecipient));
      // If we got fewer than `limit`, we've reached the end.
      if (data.messages.length < limit) break;
    }

    // Convert to backwards-compatible format
    return filteredMessages
      .map((msg) => ({
        id: msg.ID,
        from: msg.From.Address,
        to: msg.To.map((t) => t.Address),
        subject: msg.Subject,
        date: msg.Created,
        size: msg.Size,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Get full message by ID
   */
  async getMessage(mailbox: string, messageId: string): Promise<InbucketMessage> {
    const response = await fetch(`${this.baseUrl}/api/v1/message/${messageId}`);
    if (!response.ok) {
      throw new Error(`Failed to get message: ${response.statusText}`);
    }
    const msg: MailpitMessage = await response.json();

    // Convert to backwards-compatible format
    return {
      mailbox,
      id: msg.ID,
      from: msg.From.Address,
      to: msg.To.map((t) => t.Address),
      subject: msg.Subject,
      date: msg.Date,
      size: msg.Size,
      body: {
        text: msg.Text,
        html: msg.HTML,
      },
      header: {},
    };
  }

  /**
   * Delete a specific message
   */
  async deleteMessage(_mailbox: string, messageId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: [messageId] }),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete message: ${response.statusText}`);
    }
  }

  /**
   * Purge messages for a specific mailbox (email address)
   * Since Mailpit doesn't have per-mailbox purge, we list and delete individually
   */
  async purgeMailbox(mailbox: string): Promise<void> {
    const messages = await this.listMessages(mailbox);
    if (messages.length === 0) {
      return;
    }
    
    // Delete only messages for this specific mailbox
    const messageIds = messages.map((m) => m.id);
    const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: messageIds }),
    });
    
    // 200 is success, ignore errors for empty mailbox
    if (!response.ok && response.status !== 404) {
      console.warn(`Failed to purge mailbox ${mailbox}: ${response.statusText}`);
    }
  }

  /**
   * Get latest message for a mailbox (email address)
   */
  async getLatestMessage(mailbox: string): Promise<InbucketMessage | null> {
    const messages = await this.listMessages(mailbox);
    if (messages.length === 0) {
      return null;
    }
    return this.getMessage(mailbox, messages[0].id);
  }

  /**
   * Extract magic link URL from email body
   */
  extractMagicLink(message: InbucketMessage): string | null {
    // Try HTML body first, then text body
    const content = message.body.html || message.body.text;
    // Match Supabase magic link URL patterns:
    // - older: token=...
    // - newer: token_hash=... (+ type=...)
    // - fallback: code=...
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+(?:token_hash|token|code)=[^\s"'<>]+/);
    if (!urlMatch) {
      return null;
    }
    // Decode HTML entities (e.g., &amp; -> &)
    let url = urlMatch[0]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Replace 127.0.0.1 with localhost for Playwright compatibility
    // Supabase local dev uses 127.0.0.1 but Playwright needs localhost
    url = url.replace(/127\.0\.0\.1/g, 'localhost');
    
    return url;
  }
}
