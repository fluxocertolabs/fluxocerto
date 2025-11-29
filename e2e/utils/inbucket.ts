/**
 * Mailpit API client for email retrieval in E2E tests
 * Note: Supabase local dev now uses Mailpit instead of Inbucket
 * API docs: https://mailpit.axllent.org/docs/api-v1/
 */

export interface MailpitAddress {
  Name: string;
  Address: string;
}

export interface MailpitMessageSummary {
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

export interface InbucketMessageBody {
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
    // Mailpit uses a different API - search by recipient
    const response = await fetch(`${this.baseUrl}/api/v1/messages`);
    if (!response.ok) {
      throw new Error(`Failed to list messages: ${response.statusText}`);
    }
    const data: MailpitMessagesResponse = await response.json();
    
    // Filter messages by recipient email (mailbox is the email prefix or full email)
    const targetEmail = mailbox.includes('@') ? mailbox : `${mailbox}@example.com`;
    const filteredMessages = data.messages.filter((msg) =>
      msg.To.some((to) => to.Address.toLowerCase() === targetEmail.toLowerCase())
    );

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
   * Purge all messages (Mailpit doesn't have per-mailbox purge)
   */
  async purgeMailbox(_mailbox: string): Promise<void> {
    // Mailpit DELETE /api/v1/messages with no body deletes all messages
    const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'DELETE',
    });
    // 200 is success, ignore errors for empty mailbox
    if (!response.ok && response.status !== 404) {
      console.warn(`Failed to purge mailbox: ${response.statusText}`);
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
    // Match Supabase magic link URL pattern
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+token=[^\s"'<>]+/);
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
