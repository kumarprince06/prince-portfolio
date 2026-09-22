import type { LessonSection } from "./what-is-java";

export const javaFeatures = {
  title: "Java Features",
  lesson: "Lesson 03",
  category: "Java",

  description:
    "A practical explanation of the features that define Java, the problems they solve, and why they matter when building reliable backend systems.",

  tags: ["Core Java", "OOP", "Platform Independence"],

  sections: [
    {
      number: "01",
      title: "What makes Java Java?",
      paragraphs: [
        "Lesson 1 introduced Java, and Lesson 2 followed its evolution. This lesson focuses on the characteristics that define Java and the design problems behind them.",
        "Java's features are not just a list to memorize. Most of them were deliberate responses to problems in older systems programming languages, especially platform-dependent binaries, manual memory management, unsafe pointers, and complex inheritance.",
        "For a backend engineer, understanding the reason behind each feature makes Java code easier to read and gives you stronger answers in technical interviews.",
      ],
      keyPoints: [
        "Java features solve practical problems in software development",
        "Portability, safety, and maintainability are recurring design goals",
        "The JVM provides many of these guarantees at runtime",
      ],
    },

    {
      number: "02",
      title: "The problems Java was designed to solve",
      paragraphs: [
        "Java was designed during a time when C and C++ were common choices for systems software. Those languages are powerful, but they also expose developers to platform-specific binaries, manual memory management, pointer errors, and complicated inheritance rules.",
        "Java responded by combining a portable bytecode format with a runtime that manages memory, checks types, verifies classes, and provides standard support for concurrency and networking.",
      ],
      keyPoints: [
        "Platform-dependent binaries -> bytecode and the JVM",
        "Manual memory management -> automatic garbage collection",
        "Direct pointer manipulation -> no explicit pointer arithmetic",
        "Multiple inheritance ambiguity -> single class inheritance and interfaces",
        "Undefined error behavior -> structured exception handling",
        "OS-specific threads -> built-in concurrency APIs",
      ],
    },

    {
      number: "03",
      title: "A real-world analogy",
      paragraphs: [
        "Think of Java's features like the safety and convenience features of a modern car compared with an older car. Automatic garbage collection is like automatic transmission: you do not manually manage every low-level step, which reduces the chance of a common mistake.",
        "The JVM is like a controlled environment around the engine. It provides checks and rules before code runs, while the language hides dangerous details such as arbitrary memory addresses. Platform independence is similar to using a standard interface that works across different environments.",
      ],
      keyPoints: [
        "Automatic memory management reduces common resource mistakes",
        "Runtime checks add safety before and during execution",
        "Abstraction hides dangerous machine-specific details",
      ],
    },

    {
      number: "04",
      title: "Platform independent",
      paragraphs: [
        "Java source code is compiled into bytecode rather than directly into one operating system's machine code. A compatible JVM on Windows, Linux, or macOS can execute that bytecode.",
        "This is Java's most famous feature and the foundation of Write Once, Run Anywhere. The JVM implementation changes for each platform, but the Java bytecode contract stays consistent.",
      ],
      code: {
        language: "text",
        code: `Java source (.java)
        |
        | javac
        v
Bytecode (.class)
        |
        | JVM for Windows, Linux, or macOS
        v
Platform-specific machine instructions`,
      },
      keyPoints: [
        "The same bytecode can run on different operating systems",
        "The JVM hides many CPU and operating system differences",
        "Platform independence applies to the runtime model, not every application detail",
      ],
    },

    {
      number: "05",
      title: "Object-oriented",
      paragraphs: [
        "Java is a class-based, object-oriented language. Classes define data and behavior, while objects are usable instances of those definitions.",
        "Object-oriented design can help organize a large application into smaller units with clear responsibilities. Encapsulation protects an object's internal state, inheritance enables reuse in selected cases, and polymorphism lets code work with a common abstraction.",
        "Object-oriented programming is a large topic on its own. In this lesson, the important point is that Java uses classes and objects as a primary way to model software.",
      ],
      keyPoints: [
        "Classes define structure and behavior",
        "Objects are instances of classes",
        "Encapsulation protects internal state",
        "Polymorphism allows common abstractions to support different implementations",
      ],
    },

    {
      number: "06",
      title: "Simple",
      paragraphs: [
        "Java deliberately removed or limited several features that made C++ difficult to use safely. Java does not expose explicit pointer arithmetic, does not support multiple inheritance of classes, and manages memory automatically.",
        "Simple does not mean Java has very few features. It means the language tries to provide useful abstractions while reducing ways for developers to create difficult-to-debug memory and inheritance problems.",
      ],
      keyPoints: [
        "No explicit pointer arithmetic",
        "No manual malloc and free for ordinary object memory",
        "No multiple inheritance of classes",
        "A smaller set of low-level hazards makes code easier to maintain",
      ],
    },

    {
      number: "07",
      title: "Robust",
      paragraphs: [
        "Java is designed to detect errors early and handle failures in a structured way. Strong type checking catches many mistakes during compilation, while exceptions provide a defined way to report and handle many runtime problems.",
        "Automatic memory management also removes an entire class of errors caused by forgetting to free memory or freeing the same memory twice. Java can still contain bugs, but its design reduces several common sources of unpredictable crashes.",
      ],
      keyPoints: [
        "Compile-time type checking catches mistakes early",
        "Exception handling provides structured failure paths",
        "Garbage collection manages unreachable objects",
        "Robustness reduces risk but does not eliminate the need for testing",
      ],
    },

    {
      number: "08",
      title: "Secure",
      paragraphs: [
        "Java's security model was especially important when applets were running code downloaded from websites. The JVM verifies bytecode before execution, and class loading controls how code is brought into the runtime.",
        "Java does not give ordinary application code direct pointer arithmetic for arbitrary memory access. This removes a large category of memory corruption vulnerabilities common in lower-level languages, although application-level security still depends on good engineering.",
      ],
      keyPoints: [
        "The bytecode verifier checks loaded classes",
        "Class loading controls how code enters the JVM",
        "No explicit pointers reduce arbitrary memory access risks",
        "Language safety does not replace secure authentication, authorization, or input validation",
      ],
    },

    {
      number: "09",
      title: "Architecture-neutral and portable",
      paragraphs: [
        "Architecture-neutral means Java defines important type behavior consistently across platforms. For example, a Java int is always a signed 32-bit value, regardless of whether the program runs on Windows, Linux, or macOS.",
        "This differs from simply saying that bytecode runs on many operating systems. Stable type sizes and defined language behavior prevent portability bugs that can happen when native languages make different assumptions on different machines.",
      ],
      keyPoints: [
        "Java primitive types have defined sizes and behavior",
        "The JVM specification defines how bytecode should execute",
        "Portable type rules make data handling more predictable",
      ],
    },

    {
      number: "10",
      title: "Multithreaded",
      paragraphs: [
        "Java includes built-in support for concurrent execution. The Thread class, synchronized keyword, locks, executors, concurrent collections, and later virtual threads give applications several ways to perform work concurrently.",
        "Concurrency is essential for backend services that handle multiple requests, background jobs, network calls, and scheduled work. The feature provides tools, but developers still need to reason carefully about shared state, visibility, and race conditions.",
      ],
      code: {
        language: "java",
        code: `Thread worker = new Thread(() -> {
    System.out.println("Work is running concurrently");
});

worker.start();`,
      },
      keyPoints: [
        "Java supports concurrent execution through language and library APIs",
        "synchronized helps protect shared state",
        "Executors and concurrent collections support larger applications",
        "Concurrency requires careful design to avoid races and deadlocks",
      ],
    },

    {
      number: "11",
      title: "High performance through JIT compilation",
      paragraphs: [
        "Java is not compiled directly into one platform's native code before execution. The JVM initially interprets bytecode and then uses a Just-In-Time compiler to optimize frequently executed code into native instructions.",
        "This introduces startup and warmup costs, but long-running services can become very fast after the JVM identifies hot paths. Java trades some low-level control for portability, safety, runtime optimization, and developer productivity.",
      ],
      keyPoints: [
        "The interpreter helps code start running quickly",
        "The JIT compiler optimizes frequently executed paths",
        "Long-running backend services benefit from runtime optimization",
        "Performance should be measured for the actual workload",
      ],
    },

    {
      number: "12",
      title: "Distributed and network-ready",
      paragraphs: [
        "Java has included networking support from its early platform design. The java.net package provides APIs for network communication, and technologies such as RMI historically supported calling methods across JVM processes.",
        "Modern backend systems usually communicate through HTTP, messaging systems, database drivers, and service frameworks. Java's standard libraries and ecosystem make these distributed application patterns practical to build and operate.",
      ],
      keyPoints: [
        "java.net provides core networking APIs",
        "JDBC supports database connectivity",
        "Modern Java backends commonly use HTTP and messaging libraries",
        "Distributed systems still require careful handling of failures and latency",
      ],
    },

    {
      number: "13",
      title: "Dynamic",
      paragraphs: [
        "Java can load classes at runtime instead of requiring every class to be linked into one fixed executable at compile time. This supports plugins, reflection, application servers, and framework features that discover classes dynamically.",
        "Dynamic loading is powerful, but it can make behavior harder to trace. Modern applications should use it deliberately and keep configuration, module boundaries, and security rules clear.",
      ],
      keyPoints: [
        "Classes can be loaded on demand",
        "Reflection and plugins use dynamic loading capabilities",
        "Frameworks use these capabilities to discover application components",
        "Dynamic behavior should be balanced with clarity and observability",
      ],
    },

    {
      number: "14",
      title: "How the features work together",
      paragraphs: [
        "Java's features reinforce one another. Source code is compiled into portable bytecode, the JVM verifies and loads that bytecode, automatic memory management reduces resource errors, and the JIT compiler improves hot code at runtime.",
        "Object-oriented structure and a large standard library help developers build maintainable applications, while networking and concurrency APIs support backend workloads. The result is a platform designed for reliable, long-running software rather than only short scripts.",
      ],
      code: {
        language: "text",
        code: `Portable source
      |
      v
Bytecode + JVM verification
      |
      +--> Garbage collection
      +--> Exception handling
      +--> Threads and concurrency
      +--> JIT optimization
      |
      v
Maintainable backend application`,
      },
      keyPoints: [
        "Portability comes from bytecode and the JVM",
        "Safety comes from type checking, verification, and managed memory",
        "Backend capability comes from networking, concurrency, and mature libraries",
        "Performance comes from runtime profiling and JIT compilation",
      ],
    },

    {
      number: "15",
      title: "Review and interview preparation",
      paragraphs: [
        "When asked about Java's features, do not only recite words such as robust, secure, and portable. Connect each feature to the problem it solves: bytecode solves platform dependency, garbage collection reduces manual memory errors, and JIT compilation improves long-running performance.",
        "Try answering these questions: Why is Java platform independent? How is architecture-neutral different from platform independent? Why does Java use garbage collection? What does the bytecode verifier do? How does Java support multithreading? Why can Java be both portable and performant?",
      ],
      keyPoints: [
        "Platform independent: bytecode runs through a JVM",
        "Object-oriented: classes and objects organize data and behavior",
        "Simple: dangerous C++ features are reduced or removed",
        "Robust: type checking, exceptions, and memory management reduce failures",
        "Secure: verification, controlled loading, and no explicit pointers add protection",
        "Multithreaded: the platform supports concurrent work",
        "High performance: the JIT compiler optimizes hot code",
        "Dynamic: classes can be loaded and discovered at runtime",
      ],
    },
  ] satisfies LessonSection[],
};
