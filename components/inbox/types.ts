export interface Email {
  id: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
  receivedAt: string;
  to: string;
}

export interface EmailAttachment {
  filename?: string;
  contentType?: string;
  size?: number;
  contentBase64?: string;
  contentId?: string;
}
