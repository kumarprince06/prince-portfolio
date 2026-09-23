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
}

export const whatIsJava = {
  title: "What is Java?",
  lesson: "Lesson 01",
  category: "Java",

  description:
    "A complete introduction to Java, covering its history, philosophy, features, platform independence, JVM, JDK, JRE, bytecode and execution model.",

  tags: ["Core Java", "JVM", "JDK", "JRE"],

  sections: [
    {
      number: "01",
      title: "What is Java?",

      paragraphs: [
        "Java is a high-level, class-based, object-oriented programming language designed to be portable, reliable and suitable for building a wide range of software applications.",

        "Java source code is compiled into bytecode, which can then be executed by a Java Virtual Machine (JVM). This execution model is one of the major reasons Java applications can run across different operating systems.",
      ],

      keyPoints: [
        "High-level programming language",
        "Object-oriented",
        "Class-based",
        "Platform independent through the JVM",
        "Statically typed",
      ],

      visual: {
        src: "/images/java/java-execution-flow.svg",
        alt: "Diagram showing Java source code becoming bytecode and running inside the JVM",
        caption:
          "Think of the JVM as the common runtime that gives Java bytecode a place to run on different operating systems.",
      },

      examples: [
        {
          title: "A language for giving instructions",
          explanation:
            "A programming language is like a structured language for giving precise instructions to a computer. Just as a recipe tells a cook what to do, Java code tells the computer what work to perform.",
        },
        {
          title: "Java as a shared language",
          explanation:
            "Java is like writing a document in a standard format that different devices can open. You write the program once, and a compatible Java runtime can execute it on Windows, Linux, or macOS.",
        },
        {
          title: "Java in a backend service",
          explanation:
            "A delivery application might use Java to validate orders, calculate routes, store data, and respond to requests. Java is the language used to express those rules, while libraries and frameworks provide reusable building blocks.",
        },
        {
          title: "Real life: an online checkout",
          explanation:
            "When a student buys a course online, a Java backend can validate the cart, check payment status, reserve access, and send a confirmation. Each business rule is written as code, tested, and run by the JVM.",
        },
        {
          title: "Real life: a student result system",
          explanation:
            "A college result system can receive marks, calculate grades, apply pass rules, and generate a report. Java classes can model Student, Subject, and Result so the code matches the problem people already understand.",
          code: {
            language: "java",
            code: `int total = marksInJava + marksInMaths;
double percentage = total / 2.0;

System.out.println("Percentage: " + percentage);`,
          },
          output: "Percentage: 82.5",
        },
      ],

      code: {
        language: "java",
        code: `public class HelloJava {
    public static void main(String[] args) {
        System.out.println("Hello Java");
    }
}`,
      },

      output: "Hello Java",

      dryRun: [
        "Save the source code in a file named HelloJava.java.",
        "The Java compiler, javac, checks the source and creates HelloJava.class bytecode.",
        "The java command starts a Java runtime and loads the HelloJava class.",
        "The runtime finds the main method and begins executing its statements.",
        "System.out.println sends the text Hello Java to the console.",
      ],

      importantPoints: [
        "Java is a programming language used to describe data, behavior, and application rules.",
        "Java source code is compiled into bytecode rather than directly into one operating system's machine code.",
        "A compatible JVM allows the same bytecode to run on different platforms.",
        "Java is statically typed, class-based, and object-oriented.",
      ],

      commonMistakes: [
        "Thinking Java source code runs directly without being compiled into bytecode.",
        "Saying Java is fully compiled or fully interpreted instead of explaining its bytecode and JVM model.",
        "Assuming platform independence means application configuration can never depend on the operating system.",
        "Confusing the Java language with the JVM, JRE, or JDK.",
      ],

      interviewQuestions: [
        {
          question: "What is Java?",
          answer:
            "Java is a general-purpose, class-based, object-oriented programming language designed to be portable, reliable, and widely usable.",
        },
        {
          question: "Why is Java called platform independent?",
          answer:
            "Java source code is compiled into platform-independent bytecode, which can run on different operating systems through compatible JVM implementations.",
        },
        {
          question: "Is Java compiled or interpreted?",
          answer:
            "Both ideas are involved. javac compiles Java source into bytecode, and the JVM interprets or JIT-compiles that bytecode at runtime.",
        },
        {
          question: "What is the purpose of the main method?",
          answer:
            "The main method is the entry point the Java runtime uses to start a basic Java application.",
        },
        {
          question: "What problem does Java's platform model solve?",
          answer:
            "It reduces the need to create a separate native program for every operating system and hardware platform.",
        },
      ],

      practiceQuestions: [
        "In your own words, explain what Java is and name one type of application built with it.",
        "What is the difference between a Java source file and a Java bytecode file?",
        "Why can the same .class file run on more than one operating system?",
        "Create HelloJava.java, compile it with javac, and run it with java.",
        "Change the example so it prints your name on a second line.",
      ],
    },

    {
      number: "02",
      title: "History of Java",

      paragraphs: [
        "Java originated at Sun Microsystems and was designed with portability and reliability in mind.",

        "The language evolved from the Green Project and was initially developed for consumer electronic devices before becoming widely used for web, enterprise and server-side software.",
      ],

      keyPoints: [
        "Developed at Sun Microsystems",
        "Created by James Gosling and the original Java team",
        "Initially targeted portable software",
        "Later became widely used in enterprise and backend development",
      ],

      examples: [
        {
          title: "From embedded devices to the web",
          explanation:
            "Java began as an attempt to make software portable across consumer devices. When the web expanded, browsers had the same portability problem, so Java's original idea found a much larger audience.",
        },
        {
          title: "Why Java 5 mattered",
          explanation:
            "Java 5 was like a major upgrade to a familiar tool: it kept existing Java programs working while adding generics, enums, annotations, and the enhanced for-loop.",
        },
      ],

      importantPoints: [
        "1991: the Green Project begins at Sun Microsystems.",
        "Oak was the original name of the language.",
        "Java was released for the web in the mid-1990s.",
        "Java 5 and Java 8 were especially important language milestones.",
        "Modern teams commonly choose LTS releases for production stability.",
      ],

      commonMistakes: [
        "Assuming Java was originally created only for web development.",
        "Thinking the change from 1.4 to 5.0 means Java skipped several releases; 5.0 was a versioning rename.",
        "Assuming the newest Java release is automatically the version every enterprise uses.",
        "Thinking Oracle alone controls every Java design decision; OpenJDK development includes many contributors.",
      ],

      interviewQuestions: [
        {
          question: "What was Java originally called?",
          answer: "The language was originally called Oak.",
        },
        {
          question: "What was the Green Project?",
          answer:
            "It was Sun Microsystems' project to create portable software for interactive television and embedded consumer devices.",
        },
        {
          question: "Why did Java move toward the web?",
          answer:
            "The growing web needed programs that could run safely across many unknown computers, which matched Java's portability goals.",
        },
        {
          question: "What is an LTS Java release?",
          answer:
            "LTS means Long-Term Support. These releases receive extended updates and are commonly preferred for production systems.",
        },
      ],

      practiceQuestions: [
        "Put Oak, Java 1.0, Java 5, and Java 8 in chronological order.",
        "Explain in two sentences why Java's original embedded-device goal was useful on the web.",
        "Name two features introduced in Java 5 or Java 8.",
        "Why might an enterprise choose an LTS release instead of the newest release?",
      ],
    },

    {
      number: "03",
      title: "Java Features",

      paragraphs: [
        "Java provides a collection of language and platform features that make it suitable for developing maintainable and scalable applications.",
      ],

      keyPoints: [
        "Object-oriented",
        "Platform independent",
        "Robust",
        "Secure",
        "Multithreaded",
        "Portable",
        "Automatic memory management",
      ],

      examples: [
        {
          title: "Garbage collection as automatic cleanup",
          explanation:
            "Java can reclaim objects that are no longer reachable, so developers do not manually free ordinary object memory after every use.",
        },
        {
          title: "JIT compilation as warm-up",
          explanation:
            "The JVM can begin by interpreting bytecode and later optimize frequently used code with JIT compilation. A long-running service may become faster after it warms up.",
        },
        {
          title: "Interfaces for flexible design",
          explanation:
            "Instead of inheriting implementation from multiple classes, Java can use interfaces to describe capabilities that different classes can implement.",
        },
      ],

      importantPoints: [
        "Java's features were designed to solve practical portability, safety, and maintenance problems.",
        "Platform independence comes from bytecode and the JVM.",
        "Robustness comes from type checking, exception handling, and managed memory.",
        "High performance comes from runtime optimization, not from compiling directly to one machine.",
      ],

      commonMistakes: [
        "Treating Java feature names as a list to memorize without knowing the problem each solves.",
        "Assuming garbage collection means memory leaks are impossible.",
        "Assuming object-oriented programming automatically produces good design without clear responsibilities.",
        "Calling Java fully native because JIT compilation can produce machine code at runtime.",
      ],

      interviewQuestions: [
        {
          question: "What are three important features of Java?",
          answer:
            "Examples include platform independence, object-oriented design, automatic garbage collection, robustness, security, and multithreading.",
        },
        {
          question: "How does garbage collection help Java developers?",
          answer:
            "It automatically reclaims memory occupied by unreachable objects, reducing many manual memory-management errors.",
        },
        {
          question: "Why is Java considered robust?",
          answer:
            "Strong type checking, structured exception handling, and automatic memory management help detect or reduce common failures.",
        },
        {
          question: "How can Java be portable and performant?",
          answer:
            "Portable bytecode runs through the JVM, while the JVM can JIT-compile frequently used code for the current machine.",
        },
      ],

      practiceQuestions: [
        "Choose one Java feature and explain the problem it solves.",
        "Which Java feature helps reduce manual memory-management mistakes?",
        "Why are interfaces useful when designing Java applications?",
        "Explain why a long-running Java service may improve performance after startup.",
      ],
    },

    {
      number: "04",
      title: "Platform Independence",

      paragraphs: [
        "Java follows the principle of writing code once and running it on systems that provide a compatible Java runtime environment.",

        "Java source code is compiled into bytecode. The JVM on the target operating system interprets or compiles that bytecode for the underlying machine.",
      ],

      keyPoints: [
        "Source code is compiled",
        "Bytecode is generated",
        "JVM executes the bytecode",
        "Different operating systems can provide different JVM implementations",
      ],

      examples: [
        {
          title: "One program, different machines",
          explanation:
            "A Java program can be compiled into the same bytecode on one machine and then executed by compatible JVM implementations on Windows, Linux, or macOS.",
        },
        {
          title: "A translation layer",
          explanation:
            "Bytecode is an intermediate language. The JVM translates or executes it for the local operating system and processor instead of requiring the source to be rewritten.",
        },
      ],

      dryRun: [
        "Write the program in a .java source file.",
        "Run javac to create a .class file containing bytecode.",
        "Copy the .class file to another machine with a compatible JVM.",
        "Run the class; that machine's JVM handles the platform-specific execution.",
      ],

      importantPoints: [
        "Platform independence refers to the bytecode and JVM execution model.",
        "The JVM implementation is platform-specific; the application bytecode is portable.",
        "Java still needs compatible libraries, configuration, and operating-system resources.",
      ],

      commonMistakes: [
        "Thinking bytecode is the same as native machine code.",
        "Assuming WORA means every file path, environment variable, or native dependency works identically everywhere.",
        "Forgetting that the target machine still needs a compatible Java runtime.",
      ],

      interviewQuestions: [
        {
          question: "What makes Java platform independent?",
          answer:
            "Java compiles source code into bytecode, and compatible JVM implementations execute that bytecode on different platforms.",
        },
        {
          question: "What is WORA?",
          answer:
            "WORA means Write Once, Run Anywhere. It describes the ability to run compatible Java bytecode on different platforms with suitable JVMs.",
        },
        {
          question: "Is the JVM the same on every operating system?",
          answer:
            "No. JVM implementations are built for their target platforms, but they follow the JVM specification and execute the same bytecode format.",
        },
        {
          question: "Is Java completely independent of the operating system?",
          answer:
            "No. Java bytecode is portable, but application configuration, files, native libraries, and environment behavior can still depend on the operating system.",
        },
      ],

      practiceQuestions: [
        "Draw the path from a .java file to bytecode and then to execution.",
        "What must be installed on a machine that runs a compiled Java program?",
        "Explain the difference between bytecode and native machine code.",
        "Give one example of an application detail that might still be operating-system dependent.",
      ],
    },

    {
      number: "05",
      title: "JVM, JDK and JRE",

      paragraphs: [
        "The Java ecosystem contains several important components. The JVM executes Java bytecode, the JRE provides the runtime environment, and the JDK provides tools required to develop Java applications.",
      ],

      keyPoints: [
        "JVM → executes bytecode",
        "JRE → runtime environment",
        "JDK → development kit",
      ],

      examples: [
        {
          title: "A kitchen analogy",
          explanation:
            "The JVM is the cooking equipment, the JRE is the working kitchen with ingredients, and the JDK is the full facility with tools for creating and packaging new recipes.",
        },
        {
          title: "A backend deployment",
          explanation:
            "A developer uses a JDK to build a service. A production environment may use only the runtime capabilities needed to execute the already-built application.",
        },
      ],

      importantPoints: [
        "The JVM executes bytecode.",
        "The JRE provides runtime libraries and the environment needed to run programs.",
        "The JDK provides development tools such as javac in addition to runtime capabilities.",
        "JVM, JRE, and JDK are related layers, not interchangeable names.",
      ],

      commonMistakes: [
        "Confusing the JVM specification with an installed JRE or JDK.",
        "Thinking the JRE includes the Java compiler.",
        "Thinking the JDK and JVM are the same layer.",
        "Assuming the JRE contains an application's own source files.",
      ],

      interviewQuestions: [
        {
          question: "What is the difference between the JVM, JRE, and JDK?",
          answer:
            "The JVM executes bytecode, the JRE adds runtime libraries and support files, and the JDK adds development tools such as the compiler.",
        },
        {
          question: "Can a JRE compile Java source code?",
          answer:
            "No. Compilation requires the javac tool, which is provided by the JDK.",
        },
        {
          question: "What does a developer normally install?",
          answer:
            "A developer normally installs a JDK because it provides both runtime capabilities and the tools needed to build applications.",
        },
        {
          question: "What does the JVM do?",
          answer:
            "The JVM loads and executes Java bytecode while managing the runtime environment and execution process.",
        },
      ],

      practiceQuestions: [
        "Place JVM, JRE, and JDK in order from smallest execution layer to largest development package.",
        "Which component do you need to compile a .java file?",
        "Which component is needed to run an existing .class file?",
        "Explain why installing a JDK normally gives a developer everything needed to run Java code.",
      ],
    },

    {
      number: "06",
      title: "How Java Code Runs",

      paragraphs: [
        "A Java program starts as source code written in a .java file.",

        "The Java compiler converts the source code into bytecode stored in a .class file. The JVM then loads and executes that bytecode.",
      ],

      code: {
        language: "java",
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello Java");
    }
}`,
      },

      keyPoints: [
        ".java → source code",
        "javac → compiler",
        ".class → bytecode",
        "JVM → executes bytecode",
      ],

      output: "Hello Java",

      dryRun: [
        "javac reads Main.java and checks the source code.",
        "The compiler writes Main.class containing JVM bytecode.",
        "java Main starts the runtime and loads the Main class.",
        "The runtime invokes public static void main(String[] args).",
        "System.out.println writes Hello Java to standard output.",
      ],

      importantPoints: [
        "The .java file is human-readable source code.",
        "javac compiles source code into a .class bytecode file.",
        "The JVM executes bytecode rather than directly executing Java source.",
        "The main method is the usual starting point for a basic Java application.",
      ],

      commonMistakes: [
        "Saving a public class under a filename that does not match the class name.",
        "Running java Main.java when you intended to run an already-compiled Main class.",
        "Writing Main instead of Main.class when using the java launcher.",
        "Assuming compilation produces native machine code directly.",
      ],

      interviewQuestions: [
        {
          question: "What is the difference between javac Main.java and java Main?",
          answer:
            "javac compiles the source file into bytecode, while java starts the runtime and executes the compiled Main class.",
        },
        {
          question: "What file does Java compilation produce?",
          answer:
            "It produces a .class file containing JVM bytecode and class metadata.",
        },
        {
          question: "Why must the public class name match the filename?",
          answer:
            "Java uses that naming rule to keep the public class declaration and its source file unambiguous to the compiler and class-loading process.",
        },
        {
          question: "What happens after bytecode is generated?",
          answer:
            "The JVM can load, verify, and execute the bytecode, using interpretation and runtime compilation as appropriate.",
        },
      ],

      practiceQuestions: [
        "Write a Java program that prints your name and compile it with javac.",
        "What is stored in a .class file?",
        "Which command runs a compiled class named Main?",
        "Change the example message and predict the exact output before running it.",
      ],
    },
  ],
};