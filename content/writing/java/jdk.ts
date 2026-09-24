import type { Lesson, LessonSection } from "../types";

export const jdk: Lesson = {
  slug: "jdk",
  title: "JDK (Java Development Kit)",
  description:
    "Understanding the tools and runtime layers developers use to compile, debug, document, package, and run Java applications.",
  tags: ["JDK", "javac", "Tools", "OpenJDK"],
  sections: [
    {
      number: "01",
      title: "What is the JDK?",
      paragraphs: [
        "The Java Development Kit is the complete software kit for building Java applications. It includes the runtime capabilities needed to run programs and adds the development tools needed to compile, debug, document, and package them.",
        "A useful hierarchy is JDK contains the runtime environment, and the runtime environment contains the JVM implementation. In shorthand: JDK contains JRE capabilities, and JRE contains the JVM and core libraries.",
      ],
      keyPoints: [
        "JDK is for building and running Java applications",
        "JDK includes the tools that developers need",
        "JRE is for running compiled programs",
        "JVM is the execution engine inside the runtime layer",
      ],
    },
    {
      number: "02",
      title: "JDK, JRE, and JVM",
      paragraphs: [
        "Running a program and building a program are different needs. An end user may only need runtime components, while a developer needs a compiler and tools in addition to those runtime components.",
      ],
      code: {
        language: "text",
        code: `JDK
+-- Development tools: javac, jar, javadoc, jdb, jshell, jlink
+-- Runtime libraries and launcher
    +-- JVM implementation
    +-- Core Java class libraries

Quick rule:
Need to compile? -> JDK
Only run bytecode? -> JRE capabilities are enough`,
      },
      keyPoints: [
        "JVM: executes bytecode",
        "JRE: JVM plus core runtime libraries",
        "JDK: runtime plus development tools",
      ],
    },
    {
      number: "03",
      title: "Important JDK tools",
      paragraphs: [
        "The JDK includes command-line tools that cover the development lifecycle. The most important distinction is that javac creates bytecode from source, while java launches and runs compiled code.",
      ],
      keyPoints: [
        "javac: compiles .java source into .class bytecode",
        "java: launches a JVM and runs a class",
        "jar: packages classes and resources into an archive",
        "javadoc: generates HTML API documentation",
        "jdb: provides a command-line debugger",
        "jshell: provides an interactive Java REPL",
        "jlink: creates custom runtime images",
      ],
    },
    {
      number: "04",
      title: "The development workflow",
      paragraphs: [
        "A developer writes source code, compiles it with javac, runs it with java, and can package it with jar for distribution. Build tools such as Maven and Gradle automate these same steps with dependency and output-directory management.",
      ],
      code: {
        language: "bash",
        code: `javac HelloWorld.java
+-- creates HelloWorld.class
+
+java HelloWorld
+-- starts the JVM and runs the class
+
+jar cf hello.jar HelloWorld.class
+-- packages the compiled application`,
      },
      keyPoints: [
        "Compilation needs a JDK",
        "Running compiled bytecode needs runtime capabilities",
        "Packaging creates a distributable application artifact",
        "Maven and Gradle orchestrate JDK tools in real projects",
      ],
    },
    {
      number: "05",
      title: "Source-launch mode",
      paragraphs: [
        "Java 11 introduced source-launch mode. The command java HelloWorld.java can compile source in memory and run it in one step. This is convenient for small scripts, but it does not replace the normal build process for production applications.",
        "The traditional javac HelloWorld.java command writes a .class file. The java HelloWorld command loads an existing class and does not compile source at that point.",
      ],
      code: {
        language: "bash",
        code: `javac HelloWorld.java  # compile to a class file
+java HelloWorld          # run existing bytecode
+java HelloWorld.java     # Java 11+ source-launch mode`,
      },
      keyPoints: [
        "java ClassName runs existing bytecode",
        "java SourceFile.java uses source-launch mode",
        "Build pipelines normally use javac through Maven or Gradle",
      ],
    },
    {
      number: "06",
      title: "JDK vendors and versions",
      paragraphs: [
        "A JDK vendor and a JDK version are separate choices. Oracle JDK, Eclipse Temurin, Amazon Corretto, Azul Zulu, and SapMachine are examples of distributions built from or aligned with OpenJDK. Versions such as 11, 17, 21, and 25 identify release lines.",
        "Organizations often standardize on one vendor and one LTS version for security updates, compatibility, licensing, and support. The important operational rule is to make the build JDK and runtime version explicit in local development and CI/CD.",
      ],
      keyPoints: [
        "Vendor: who builds and supports the distribution",
        "Version: which Java release line is used",
        "LTS versions are common enterprise choices",
        "OpenJDK-based distributions can be production-ready alternatives",
      ],
    },
    {
      number: "07",
      title: "Check your JDK",
      paragraphs: [
        "The simplest way to prove that a JDK is installed is to check javac. The java command alone only proves that runtime capabilities exist; javac is a development tool supplied by the JDK.",
      ],
      code: {
        language: "bash",
        code: `javac -version
java -version

# Linux or macOS
ls "$JAVA_HOME/bin"`,
      },
      keyPoints: [
        "javac -version confirms the compiler is available",
        "java -version shows the active runtime version",
        "JAVA_HOME should point to the intended JDK installation",
        "PATH determines which java and javac commands are found",
      ],
    },
    {
      number: "08",
      title: "Review and interview preparation",
      paragraphs: [
        "The precise answer is: the JDK is the development kit that adds compiler, debugger, documentation, packaging, REPL, and runtime-image tools to Java's runtime capabilities.",
        "Remember the quick rule: if you need to compile, you need a JDK. If you only need to run precompiled bytecode, runtime capabilities are enough. In modern development, installing a JDK is the normal choice because it supports both activities.",
      ],
      keyPoints: [
        "JDK contains runtime capabilities and development tools",
        "javac is JDK-only; java is used to launch programs",
        "JDK vendor and JDK version are independent choices",
        "Keep JAVA_HOME, PATH, CI, and production versions aligned",
      ],
    },
  ] satisfies LessonSection[],
};
