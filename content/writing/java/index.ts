import type { LessonSection } from "./what-is-java";
import { classLoading } from "./class-loading";
import { compilationProcess } from "./compilation-process";
import { historyOfJava } from "./history-of-java";
import { javaFeatures } from "./java-features";
import { jdk } from "./jdk";
import { jre } from "./jre";
import { jvm } from "./jvm";
import { whatIsJava } from "./what-is-java";

export interface JavaLessonContent {
  title: string;
  lesson: string;
  category: string;
  description: string;
  tags: string[];
  sections: LessonSection[];
}

export const javaLessons: Record<string, JavaLessonContent> = {
  "what-is-java": whatIsJava,
  "history-of-java": historyOfJava,
  "java-features": javaFeatures,
  jvm,
  jre,
  jdk,
  "compilation-process": compilationProcess,
  "class-loading": classLoading,
};
