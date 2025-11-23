
export enum TicketStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DISCARDED = 'DISCARDED',
}

export interface AITags {
  summary: string;
  tags: string[];
  complexity: string;
}

export interface Ticket {
  id: string;
  studentName: string;
  reason: string;
  availability: string;
  status: TicketStatus;
  createdAt: number;
  createdBy?: string; // ID do usuário que criou o ticket (Firebase UID)
  aiData?: AITags;
}

export enum UserRole {
  STUDENT = 'STUDENT',
  MENTOR = 'MENTOR',
}
