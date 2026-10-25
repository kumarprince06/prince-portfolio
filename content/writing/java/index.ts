import type { Phase } from "../types";
import { classLoading } from "./class-loading";
import { compilationProcess } from "./compilation-process";
import { controlStatements } from "./control-statements";
import { dataTypes } from "./data-types";
import { historyOfJava } from "./history-of-java";
import { javaFeatures } from "./java-features";
import { jdk } from "./jdk";
import { jre } from "./jre";
import { jvm } from "./jvm";
import { loops } from "./loops";
import { methods } from "./methods";
import { operators } from "./operators";
import { typeCasting } from "./type-casting";
import { variables } from "./variables";
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
    title: "Variables, Data Types, Operators, Type Casting",
    description: "How Java stores values, which types exist, how operators behave and how conversions work.",
    lessons: [variables, dataTypes, operators, typeCasting],
  },
  {
    title: "Control Statements & Loops",
    description: "Making decisions and repeating work: if, switch, for, while and how to control them.",
    lessons: [controlStatements, loops],
  },
  {
    title: "Methods, Memory Allocation, Stack vs Heap",
    description: "Writing and calling methods, how arguments are passed, and what each call does to the stack and the heap.",
    lessons: [methods],
  },
];
