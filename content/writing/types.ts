// Text fields support inline `code` and **bold**.

export interface InterviewQuestion {
  question: string;
  answer: string;
}

export type LessonBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "code"; language: string; code: string; title?: string }
  | { type: "output"; text: string }
  // ASCII diagrams and cheat sheets: monospace, no syntax label
  | { type: "diagram"; text: string; caption?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; tone: "note" | "tip" | "warning"; title?: string; text: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "qa"; items: InterviewQuestion[] }
  // DSA approaches
  | { type: "complexity"; time: string; space: string };

// A section's number is its position in the lesson.
export interface LessonSection {
  title: string;
  blocks: LessonBlock[];
}

export interface Lesson {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  // DSA problems
  difficulty?: "Easy" | "Medium" | "Hard";
  problemUrl?: string;
  sections: LessonSection[];
}

// A step in a learning path. A phase with no lessons yet shows as "Coming soon".
export interface Phase {
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Category {
  slug: string;
  title: string;
  description: string;
  // Label shown before the number, e.g. "Lesson 04" or "Problem 12"
  unit: string;
  lessons: Lesson[];
  phases?: Phase[];
}
