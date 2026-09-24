import type { Phase } from "../types";
import { classLoading } from "./class-loading";
import { compilationProcess } from "./compilation-process";
import { historyOfJava } from "./history-of-java";
import { javaFeatures } from "./java-features";
import { jdk } from "./jdk";
import { jre } from "./jre";
import { jvm } from "./jvm";
import { whatIsJava } from "./what-is-java";

// Reading order — phases run in sequence, lessons are numbered straight through them.
export const javaPhases: Phase[] = [
  {
    title: "Java Fundamentals",
    description: "What Java is, how it evolved, and what really happens between javac and a running program.",
    lessons: [
      whatIsJava,
      historyOfJava,
      javaFeatures,
      jvm,
      jre,
      jdk,
      compilationProcess,
      classLoading,
    ],
  },
  {
    title: "Variables, Data Types, Operators and Type Casting",
    description: "How Java stores values, which types exist, how operators behave and how conversions work.",
    lessons: [],
  },
  {
    title: "Control Statements and Loops",
    description: "Making decisions and repeating work: if, switch, for, while and how to control them.",
    lessons: [],
  },
];
