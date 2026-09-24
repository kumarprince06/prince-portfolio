import type { Lesson } from "../types";
import { classLoading } from "./class-loading";
import { compilationProcess } from "./compilation-process";
import { historyOfJava } from "./history-of-java";
import { javaFeatures } from "./java-features";
import { jdk } from "./jdk";
import { jre } from "./jre";
import { jvm } from "./jvm";
import { whatIsJava } from "./what-is-java";

// Reading order — the position here is the lesson number.
export const javaLessons: Lesson[] = [
  whatIsJava,
  historyOfJava,
  javaFeatures,
  jvm,
  jre,
  jdk,
  compilationProcess,
  classLoading,
];
