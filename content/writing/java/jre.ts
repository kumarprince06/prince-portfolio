import type { LessonSection } from "./what-is-java";

export const jre = {
  title: "JRE (Java Runtime Environment)",
  lesson: "Lesson 05",
  category: "Java",
  description:
    "Understanding the runtime package that combines a JVM, core Java libraries, and supporting files needed to execute Java applications.",
  tags: ["JRE", "Runtime", "Java Libraries", "JPMS"],
  sections: [
    {
      number: "01",
      title: "What is the JRE?",
      paragraphs: [
        "The Java Runtime Environment, or JRE, is the software environment needed to run Java applications. At a high level, it combines a JVM implementation with the core Java class libraries and supporting runtime files.",
        "The JVM alone is not enough to run a real program. Code such as System.out.println, String, ArrayList, and File depends on precompiled Java classes. The JRE provides those classes alongside the JVM that executes them.",
      ],
      keyPoints: [
        "JRE is for running Java applications",
        "JRE includes a JVM implementation",
        "JRE includes core Java class libraries",
        "JRE does not include development tools such as javac",
      ],
    },
    {
      number: "02",
      title: "JVM versus JRE",
      paragraphs: [
        "The JVM is the virtual machine and execution engine described in Lesson 04. The JRE is a runnable software package that contains a JVM implementation plus the libraries and resources applications need at runtime.",
        "The JVM specification describes rules. The JRE is an actual runtime distribution. This distinction is why the terms should not be treated as interchangeable.",
      ],
      code: {
        language: "text",
        code: `JRE
+-- JVM implementation
+-- Core Java class libraries
+-- Runtime configuration and supporting resources
+
+JDK = JRE/runtime capabilities + development tools`,
      },
      keyPoints: [
        "JVM: executes bytecode",
        "JRE: JVM plus runtime libraries and support files",
        "JDK: development kit containing tools for building applications",
      ],
    },
    {
      number: "03",
      title: "What the JRE contains",
      paragraphs: [
        "The JRE contains the JVM, core Java class libraries, and supporting files. The libraries include classes from java.lang such as String, Object, System, and Math; java.util such as ArrayList and HashMap; and java.io for file and stream operations.",
        "Older Java versions packaged many core classes in rt.jar. Java 9 introduced the Java Platform Module System, so modern runtimes provide these classes as modules such as java.base instead of one large rt.jar file.",
      ],
      keyPoints: [
        "java.lang: String, Object, System, and Math",
        "java.util: collections such as ArrayList and HashMap",
        "java.io: file and stream APIs",
        "Java 9+ uses modules such as java.base",
      ],
    },
    {
      number: "04",
      title: "What the JRE does not contain",
      paragraphs: [
        "The JRE is for running already-compiled programs. It does not provide the javac compiler, javadoc documentation generator, debugger, or other development tools supplied by the JDK.",
        "The JRE also does not contain your application's compiled classes. Your own .class files are loaded separately from the application classpath or module path by the Application Class Loader.",
      ],
      keyPoints: [
        "No javac compiler",
        "No debugger or javadoc tool",
        "No source code for your application",
        "Your classes are loaded from your project or deployment artifact",
      ],
    },
    {
      number: "05",
      title: "Historical packaging after Java 9",
      paragraphs: [
        "Before Java 9, Sun and Oracle commonly distributed the JDK and JRE as separate downloads. End users who only needed to run applications could install the smaller JRE, while developers installed the JDK.",
        "Java 9 introduced the Java Platform Module System, also known as Project Jigsaw. Modern Java installations generally provide a JDK, and tools such as jlink can create a custom runtime image containing only the modules an application needs.",
      ],
      keyPoints: [
        "Pre-Java 9: JRE and JDK were commonly separate downloads",
        "Java 9: JPMS changed how the platform is packaged",
        "Modern development generally starts with a JDK",
        "jlink can create a minimal runtime image",
      ],
    },
    {
      number: "06",
      title: "How the JRE runs a program",
      paragraphs: [
        "When you run java HelloWorld, the Java launcher starts a JVM instance. The Application Class Loader loads your HelloWorld.class. As the bytecode references String, System, or other built-in classes, the bootstrap loading mechanism obtains those classes from the runtime's core libraries.",
        "The program can run because the JRE supplies both the engine and the standard classes the engine needs. Without those libraries, the JVM could start but would fail when the application referenced missing core classes.",
      ],
      code: {
        language: "text",
        code: `java HelloWorld
+-- JRE launcher starts a JVM
+-- Application Loader loads HelloWorld.class
+-- Bootstrap loader loads java.lang.String and System
+-- Interpreter and JIT execute the program`,
      },
      keyPoints: [
        "The launcher starts the JVM",
        "Application classes come from the application path",
        "Core classes come from the runtime libraries",
        "Both paths use the JVM's class-loading subsystem",
      ],
    },
    {
      number: "07",
      title: "Inspect the installed runtime",
      paragraphs: [
        "Java exposes information about the active runtime through standard APIs. java.home points to the Java installation used by the process, while String.class.getModule() shows the module that provides String in the modern module system.",
      ],
      code: {
        language: "java",
        code: `public class JreCheck {
    public static void main(String[] args) {
        System.out.println("Java home: "
            + System.getProperty("java.home"));
        System.out.println("String module: "
            + String.class.getModule());
    }
}`,
      },
      keyPoints: [
        "java.home identifies the Java installation used by the process",
        "String.class.getModule() commonly reports java.base",
        "java.base contains foundational classes used by most programs",
      ],
    },
    {
      number: "08",
      title: "JRE, modules, and jlink",
      paragraphs: [
        "The Java Platform Module System lets the platform and applications describe dependencies at module level. A custom runtime image created with jlink can include only the modules needed by a service instead of shipping an entire JDK.",
        "For containerized backend deployments, a smaller runtime image can reduce image size, startup transfer time, and the number of unused components that need security scanning.",
      ],
      code: {
        language: "bash",
        code: `jlink \\
  --add-modules java.base,java.sql,java.net.http \\
  --output custom-runtime`,
      },
      keyPoints: [
        "JPMS organizes Java functionality into modules",
        "jlink creates custom runtime images",
        "Minimal images can help container size and attack surface",
        "Runtime modules must match actual application dependencies",
      ],
    },
    {
      number: "09",
      title: "Common mistakes and review",
      paragraphs: [
        "Do not confuse the JRE with the JVM: the JVM is the execution engine, while the JRE includes that engine and the libraries required by applications. Do not assume the JRE contains your application classes; those are supplied by the deployment artifact.",
        "The clean definition to remember is: JRE = JVM implementation + core Java class libraries + runtime support files. It is intended to run compiled Java programs, not develop them.",
      ],
      keyPoints: [
        "JRE does not compile Java source code",
        "JRE does not contain your application's classes",
        "Java 9 modules changed the old JRE packaging model",
        "jlink can build a custom runtime image",
      ],
    },
  ] satisfies LessonSection[],
};
