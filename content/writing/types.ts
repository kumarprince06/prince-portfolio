export interface LessonCode {
  language: string;
  code: string;
}

export interface LessonExample {
  title: string;
  explanation: string;
  code?: LessonCode;
  output?: string;
  dryRun?: string[];
}

export interface LessonVisual {
  src: string;
  alt: string;
  caption: string;
}

export interface InterviewQuestion {
  question: string;
  answer: string;
}

export interface LessonSection {
  number: string;
  title: string;
  paragraphs?: string[];
  keyPoints?: string[];
  examples?: LessonExample[];
  code?: LessonCode;
  output?: string;
  dryRun?: string[];
  importantPoints?: string[];
  commonMistakes?: string[];
  interviewQuestions?: InterviewQuestion[];
  practiceQuestions?: string[];
  visual?: LessonVisual;
  complexity?: { time: string; space: string };
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

export interface Category {
  slug: string;
  title: string;
  description: string;
  // Label shown before the number, e.g. "Lesson 04" or "Problem 12"
  unit: string;
  lessons: Lesson[];
}
