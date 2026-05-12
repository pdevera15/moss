export type NoteLanguage = "en" | "ja" | "zh";

export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: number; // Unix milliseconds
  updated_at: number; // Unix milliseconds
  language: NoteLanguage;
}
