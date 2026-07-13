export type NoteLanguage = "en" | "ja" | "zh";

export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: number; // Unix milliseconds
  updated_at: number; // Unix milliseconds
  language: NoteLanguage;
  notebook_id: string | null;
}

export interface Notebook {
  id: string;
  name: string;
  position: number;
  created_at: number; // Unix milliseconds
  updated_at: number; // Unix milliseconds
}
