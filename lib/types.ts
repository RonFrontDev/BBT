export interface TimeEntry {
  id: string;
  description: string;
  durationMinutes: number;
  categoryId?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}
