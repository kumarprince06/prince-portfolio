import type { Phase } from "../types";
import { abstraction } from "./abstraction";
import { accessModifiers } from "./access-modifiers";
import { annotationProcessing } from "./annotation-processing";
import { annotations } from "./annotations";
import { arrays } from "./arrays";
import { arraysClassAndCopying } from "./arrays-class-and-copying";
import { associationAggregationComposition } from "./association-aggregation-composition";
import { classLoading } from "./class-loading";
import { classesAndObjects } from "./classes-and-objects";
import { compilationProcess } from "./compilation-process";
import { constructors } from "./constructors";
import { controlStatements } from "./control-statements";
import { customExceptions } from "./custom-exceptions";
import { dataTypes } from "./data-types";
import { encapsulation } from "./encapsulation";
import { enums } from "./enums";
import { enumSetEnumMapAndPatterns } from "./enumset-enummap-and-patterns";
import { exceptionBestPractices } from "./exception-best-practices";
import { exceptionsBasics } from "./exceptions-basics";
import { fileIoStreamsReadersWriters } from "./file-io-streams-readers-writers";
import { generics } from "./generics";
import { genericsWildcardsAndErasure } from "./generics-wildcards-and-erasure";
import { historyOfJava } from "./history-of-java";
import { inheritance } from "./inheritance";
import { interfaces } from "./interfaces";
import { javaFeatures } from "./java-features";
import { javaModules } from "./java-modules";
import { jdk } from "./jdk";
import { jitCompilationAndJvmTuning } from "./jit-compilation-and-jvm-tuning";
import { jre } from "./jre";
import { jvm } from "./jvm";
import { jvmMemoryAndGarbageCollection } from "./jvm-memory-and-garbage-collection";
import { loops } from "./loops";
import { memoryAllocation } from "./memory-allocation";
import { methods } from "./methods";
import { nestedClasses } from "./nested-classes";
import { nioFilesAndPaths } from "./nio-files-and-paths";
import { objectClass } from "./object-class";
import { operators } from "./operators";
import { packages } from "./packages";
import { polymorphism } from "./polymorphism";
import { reflection } from "./reflection";
import { reflectionProxiesAndMethodHandles } from "./reflection-proxies-and-method-handles";
import { serialization } from "./serialization";
import { serializationSecurityAndAlternatives } from "./serialization-security-and-alternatives";
import { stackVsHeap } from "./stack-vs-heap";
import { staticKeyword } from "./static-keyword";
import { stringBuilderAndStringBuffer } from "./stringbuilder-and-stringbuffer";
import { stringsAndImmutability } from "./strings-and-immutability";
import { tryCatchFinally } from "./try-catch-finally";
import { tryWithResources } from "./try-with-resources";
import { typeCasting } from "./type-casting";
import { variables } from "./variables";
import { whatIsJava } from "./what-is-java";
import { whenToUseWhat } from "./when-to-use-what";
import { wrapperClasses } from "./wrapper-classes";
import { wrapperTraps } from "./wrapper-traps";

// Reading order — phases run in sequence, lessons are numbered straight through them.
export const javaPhases: Phase[] = [
  {
    title: "Introduction to Java",
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
    lessons: [methods, memoryAllocation, stackVsHeap],
  },
  {
    title: "Object-Oriented Programming",
    description: "Classes, objects, constructors and static, then encapsulation, inheritance, object relationships, polymorphism, abstraction and interfaces, the Object class methods, nested classes, and when to use which.",
    lessons: [
      classesAndObjects,
      constructors,
      staticKeyword,
      encapsulation,
      inheritance,
      associationAggregationComposition,
      polymorphism,
      abstraction,
      interfaces,
      objectClass,
      nestedClasses,
      whenToUseWhat,
    ],
  },
  {
    title: "Packages, Access Modifiers",
    description: "Organising code into packages, controlling what each class exposes, and the module system that enforces it across JARs.",
    lessons: [packages, accessModifiers, javaModules],
  },
  {
    title: "Exception Handling",
    description: "Checked and unchecked exceptions, try-catch-finally, custom exceptions, try-with-resources, how the JVM unwinds the stack, and the practices that keep failures diagnosable.",
    lessons: [exceptionsBasics, tryCatchFinally, customExceptions, tryWithResources, exceptionBestPractices],
  },
  {
    title: "String, StringBuilder, StringBuffer",
    description: "Why strings are immutable, the string pool, and when to reach for a builder instead.",
    lessons: [stringsAndImmutability, stringBuilderAndStringBuffer],
  },
  {
    title: "Arrays",
    description: "Fixed-size collections of values: declaring, iterating, copying and how arrays sit in memory.",
    lessons: [arrays, arraysClassAndCopying],
  },
  {
    title: "Generics",
    description: "Type-safe code with type parameters, bounded types, wildcards and type erasure.",
    lessons: [generics, genericsWildcardsAndErasure],
  },
  {
    title: "Enums",
    description: "Fixed sets of constants that are full classes, with fields, methods and switch support.",
    lessons: [enums, enumSetEnumMapAndPatterns],
  },
  {
    title: "Wrapper Classes",
    description: "The object versions of primitives, autoboxing, caching and the traps around them.",
    lessons: [wrapperClasses, wrapperTraps],
  },
  {
    title: "File Handling",
    description: "Reading and writing files with java.io and java.nio, streams, readers and paths.",
    lessons: [fileIoStreamsReadersWriters, nioFilesAndPaths],
  },
  {
    title: "Serialization",
    description: "Turning objects into bytes and back, serialVersionUID, transient fields and the risks.",
    lessons: [serialization, serializationSecurityAndAlternatives],
  },
  {
    title: "Reflection",
    description: "Inspecting and using classes, methods and fields at runtime, and what frameworks build on it.",
    lessons: [reflection, reflectionProxiesAndMethodHandles],
  },
  {
    title: "Annotations",
    description: "Metadata on code: built-in annotations, writing custom ones, and processing them at compile time and runtime.",
    lessons: [annotations, annotationProcessing],
  },
  {
    title: "JVM Deep Dive",
    description: "Back inside the JVM with everything learned since: memory, garbage collection, JIT and tuning.",
    lessons: [jvmMemoryAndGarbageCollection, jitCompilationAndJvmTuning],
  },
];
