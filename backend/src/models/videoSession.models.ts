export interface VideoSessionModel {
  id: string;
  participants: string[]; // UIDs
  startedAt: Date;
  endedAt?: Date;
  meetLink?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  createdBy: string;
  metadata?: Record<string, any>;
}
