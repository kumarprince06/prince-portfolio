import type { Phase } from "../types";
import { java8NextPhase } from "../roadmap";
import { collectors } from "./collectors";
import { completableFuture } from "./completable-future";
import { dateTimeApi } from "./date-time-api";
import { defaultAndStaticMethods } from "./default-and-static-methods";
import { functionalInterfaces } from "./functional-interfaces";
import { java8PracticeProblems } from "./java-8-practice-problems";
import { lambdaExpressions } from "./lambda-expressions";
import { methodReferences } from "./method-references";
import { optional } from "./optional";
import { otherJava8Additions } from "./other-java-8-additions";
import { streamsApi } from "./streams-api";

// Reading order — phases run in sequence, lessons are numbered straight through them.
export const java8Phases: Phase[] = [
  {
    title: "Functional Programming Basics",
    description: "Passing behaviour around: lambdas, the functional interfaces behind them, method references, and interfaces that carry code.",
    lessons: [lambdaExpressions, functionalInterfaces, methodReferences, defaultAndStaticMethods],
  },
  {
    title: "Streams and Collectors",
    description: "Processing collections as lazy pipelines, and gathering the results into lists, maps and reports.",
    lessons: [streamsApi, collectors],
  },
  {
    title: "Optional and the Date and Time API",
    description: "Saying \"there might be nothing here\" without null, and handling dates, times and time zones correctly.",
    lessons: [optional, dateTimeApi],
  },
  {
    title: "Asynchronous Programming",
    description: "Starting slow work in the background and chaining what happens next with CompletableFuture.",
    lessons: [completableFuture],
  },
  {
    title: "Wrap-up and Practice",
    description: "The smaller Java 8 additions I use every day, then a full practice set of interview-style problems.",
    lessons: [otherJava8Additions, java8PracticeProblems],
  },
  java8NextPhase,
];
