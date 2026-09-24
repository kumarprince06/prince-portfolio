import type { Lesson, LessonSection } from "../types";

export const jvm: Lesson = {
  slug: "jvm",
  title: "JVM (Java Virtual Machine)",
  description:
    "Understanding the JVM specification, class loading, runtime memory areas, bytecode verification, interpretation, JIT compilation, and garbage collection.",
  tags: ["JVM", "Class Loader", "Memory", "JIT"],
  sections: [
    {
      number: "01",
      title: "What is the JVM?",
      paragraphs: [
        "The Java Virtual Machine is software that executes Java bytecode. It is not a physical machine and it is not the Java language itself. The JVM is a specification plus multiple implementations that follow that specification.",
        "Java source code is compiled from a .java file into a .class file. That bytecode is not native machine code that a CPU can execute directly. The JVM loads it, checks it, manages runtime memory, and executes it on the host operating system.",
      ],
      keyPoints: [
        "The JVM executes Java bytecode",
        "The JVM provides a virtual execution environment",
        "The JVM specification is separate from a JVM implementation",
        "The same bytecode can run on different platform-specific JVMs",
      ],
    },
    {
      number: "02",
      title: "Specification and implementations",
      paragraphs: [
        "The JVM Specification defines the class-file format, bytecode instructions, runtime data areas, and execution rules that a compliant JVM must follow.",
        "HotSpot is widely used in Oracle and OpenJDK distributions. OpenJ9 focuses on a low-memory footprint, and GraalVM provides additional compilation and runtime capabilities. Kotlin, Scala, Groovy, and Clojure can also compile to JVM bytecode and use the same runtime.",
      ],
      keyPoints: [
        "Specification: the formal contract",
        "Implementation: software that follows the contract",
        "HotSpot, OpenJ9, and GraalVM are JVM implementations",
        "The JVM can run bytecode produced by multiple languages",
      ],
    },
    {
      number: "03",
      title: "The three major JVM areas",
      paragraphs: [
        "A useful high-level model divides the JVM into the Class Loader Subsystem, Runtime Data Areas, and Execution Engine. The class loader brings classes into the runtime, memory areas support execution, and the execution engine runs and optimizes bytecode.",
      ],
      code: {
        language: "text",
        code: `JVM
+-- Class Loader Subsystem: Loading -> Linking -> Initialization
+-- Runtime Data Areas: Metaspace, Heap, Stacks, PC Registers
+-- Execution Engine: Interpreter + JIT Compiler
    Garbage Collection works with heap management`,
      },
      keyPoints: [
        "Class Loader Subsystem loads and prepares classes",
        "Runtime Data Areas provide execution memory",
        "Execution Engine interprets and compiles bytecode",
      ],
    },
    {
      number: "04",
      title: "Loading, linking, and initialization",
      paragraphs: [
        "After a class is selected, the JVM processes it through loading, linking, and initialization. Linking contains verification, preparation, and resolution.",
        "Preparation assigns default values to static fields. Initialization later assigns programmer-specified values and runs static initializer blocks. These are different stages and should not be confused.",
      ],
      code: {
        language: "text",
        code: `Loading
  -> read class bytes
Linking
  -> Verification: check bytecode safety
  -> Preparation: assign static defaults
  -> Resolution: connect symbolic references
Initialization
  -> assign real static values
  -> run static initializer blocks`,
      },
      keyPoints: [
        "Verification: Bytecode Verifier checks validity and safety",
        "Preparation: static fields receive defaults such as 0, null, or false",
        "Resolution: symbolic references become runtime references",
        "Initialization: real values are assigned and static blocks run",
      ],
    },
    {
      number: "05",
      title: "Runtime Data Areas",
      paragraphs: [
        "Runtime Data Areas are the memory regions used while a program executes. Some are shared by all threads, while others belong to one thread.",
        "The Method Area is the JVM specification concept for class-level metadata. In common Java 8 and later HotSpot terminology, this is implemented using Metaspace, which is stored in native memory. The exact implementation can vary by JVM.",
      ],
      keyPoints: [
        "Method Area or Metaspace: class metadata and static data",
        "Heap: objects and arrays, shared across threads",
        "JVM Stack: method frames and local data, one per thread",
        "PC Register: current instruction for one thread",
        "Native Method Stack: supports native method calls",
      ],
    },
    {
      number: "06",
      title: "Interpreter, JIT, and garbage collection",
      paragraphs: [
        "The Interpreter reads bytecode instructions one at a time so a program can start without compiling every method first. The Just-In-Time compiler watches for frequently executed hot code, compiles it into native instructions, and caches the result.",
        "The Garbage Collector reclaims heap memory from objects that are no longer reachable. Its exact behavior depends on the selected collector, such as G1GC or ZGC.",
      ],
      keyPoints: [
        "Interpreter: starts execution quickly",
        "JIT Compiler: optimizes frequently executed code",
        "Garbage Collector: reclaims unreachable heap objects",
        "Long-running services benefit from JIT warmup",
      ],
    },
    {
      number: "07",
      title: "Why main is public and static",
      paragraphs: [
        "The JVM looks for public static void main(String[] args). public makes the method accessible from outside the class. static lets the JVM call it on the class without creating an object first.",
        "No application object exists when the program begins. The JVM needs an entry point before ordinary objects have been created, which is the precise reason main must be static.",
      ],
      code: {
        language: "java",
        code: `public class FeatureDemo {
    public static void main(String[] args) {
        System.out.println("The JVM found main");
    }
}`,
      },
      keyPoints: [
        "public: accessible from outside the class",
        "static: no object instance is required",
        "void: no direct return value",
        "String[] args: command-line arguments",
      ],
    },
    {
      number: "08",
      title: "Review and interview preparation",
      paragraphs: [
        "A strong JVM explanation connects the specification, class-loading lifecycle, memory areas, and execution engine. Avoid saying only that the JVM converts Java to machine code; explain that it loads and verifies bytecode, manages memory, interprets instructions, and JIT-compiles hot paths.",
        "Try answering these questions: What is the difference between the JVM specification and implementation? What are the linking phases? Which memory areas are shared? What is the Parent Delegation Model?",
      ],
      keyPoints: [
        "JVM = specification plus conforming implementations",
        "Loading -> Linking -> Initialization",
        "Verify -> Prepare -> Resolve are the linking steps",
        "Heap and Metaspace are shared; stacks and PC registers are per-thread",
        "Preparation assigns defaults; initialization assigns real static values",
      ],
    },
  ] satisfies LessonSection[],
};
