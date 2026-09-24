import type { Lesson } from "../types";

export const whatIsJava: Lesson = {
  slug: "what-is-java",
  date: "2026-09-16",
  title: "What is Java?",
  description:
    "What Java actually is, why it was built, and what really happens between typing `java HelloWorld` and seeing output: bytecode, the JVM, class loading, the interpreter and the JIT.",
  tags: ["Core Java", "JVM", "Bytecode", "Fundamentals"],
  sections: [
    {
      title: "What Java Is and Why It Exists",
      blocks: [
        {
          type: "paragraph",
          text: "Java is a general-purpose, class-based, object-oriented language built around one idea: compile your code once, then run the result on any machine that has a Java Virtual Machine. You don't ship a Windows binary and a Linux binary. You ship bytecode, and the JVM on each machine does the rest.",
        },
        {
          type: "paragraph",
          text: "The problem it solved was platform dependency. A C or C++ program compiles to machine code for one CPU and one operating system. Shipping to Windows, Solaris and macOS meant three builds, three test cycles and three sets of platform bugs. Java's answer became its slogan: **Write Once, Run Anywhere** (WORA).",
        },
        {
          type: "paragraph",
          text: "I'm learning Java because it is the foundation of so much backend software: banking systems, e-commerce platforms, Spring Boot microservices, and most of the big data stack (Kafka, Hadoop, Spark and Elasticsearch all run on the JVM). Spring, Hibernate and every distributed-systems topic I want to go deep on sit on top of what this lesson covers.",
        },
      ],
    },
    {
      title: "Where Java Came From",
      blocks: [
        {
          type: "list",
          items: [
            "**1991:** James Gosling and a small team at Sun Microsystems start the **Green Project**. The target wasn't the web at all. It was software for consumer electronics like set-top boxes and handheld devices.",
            "The team tried C++ first and ran into three problems: compiled binaries only worked on the exact chip and OS they were built for, manual memory management (`malloc`/`free`, `new`/`delete`) caused leaks and crashes that are unacceptable on a device nobody can reboot, and multiple inheritance brought the ambiguity of the \"diamond problem\".",
            "Gosling designed a new language called **Oak**, after a tree outside his office. The name was already trademarked, so it was renamed **Java**, after the coffee.",
            "**1995:** Sun publicly announces Java, aimed at the fast-growing web. Browsers needed to run small programs (applets) safely on any visitor's machine, and \"run anywhere\" fit that exactly. JDK 1.0 shipped in January 1996.",
            "**2006–2007:** Sun open-sources Java as **OpenJDK**, which is still where Java is developed today.",
            "**2010:** Oracle completes its acquisition of Sun and has led Java's development since. Today Java ships every six months, with a long-term support (LTS) release every two years: 8, 11, 17, 21 and, as of September 2025, **Java 25**.",
          ],
        },
        {
          type: "heading",
          text: "What Java fixed from C and C++",
        },
        {
          type: "table",
          headers: ["Problem in C/C++", "How Java addressed it"],
          rows: [
            ["Platform-dependent compiled binaries", "Compile to bytecode once; a JVM per platform runs it"],
            ["Manual memory management (`malloc`/`free`)", "Automatic garbage collection"],
            ["Pointer arithmetic causing crashes and security holes", "References only, no pointer arithmetic, bounds-checked arrays"],
            ["Multiple inheritance ambiguity", "Single inheritance of classes; multiple inheritance of type through interfaces"],
          ],
        },
        {
          type: "callout",
          tone: "note",
          text: "Since Java 8, interfaces can have `default` methods, so a class can inherit behaviour from more than one interface. Java handles the diamond case explicitly: if two interfaces give you conflicting defaults, the compiler makes you override the method and pick one.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "The way I think about it: imagine writing a letter that people in India, Japan and France all need to read. If I write it in English, every country needs its own translator. That's C++: a separate compile for every platform.",
        },
        {
          type: "paragraph",
          text: "Now imagine every country owns the same universal translator device. I write the letter once in a universal script, and each country's device turns it into the local language as it is read. The universal script is **bytecode**. The translator device is the **JVM**. The device is built differently for Windows, Linux and macOS, but they all read the same script.",
        },
        {
          type: "paragraph",
          text: "So I write the code once, `javac` compiles it to bytecode once, and any machine with a JVM runs that same bytecode. Nothing gets rewritten or recompiled.",
        },
      ],
    },
    {
      title: "The Technical Definition",
      blocks: [
        {
          type: "paragraph",
          text: "Taking the definition apart, Java is:",
        },
        {
          type: "list",
          items: [
            "**General-purpose:** not tied to one domain. It runs web backends, Android apps, desktop tools, embedded systems and big data pipelines.",
            "**Class-based and object-oriented:** code is organised into classes, and a program works with objects. I cover this properly in the OOP phase.",
            "**Compiled and interpreted:** `javac` compiles `.java` source into bytecode in `.class` files. That is not machine code. At runtime the JVM interprets the bytecode and JIT-compiles the hot parts into native code for the host CPU. This mix is how Java gets platform independence and still runs fast.",
            "**Statically typed:** every variable has a type the compiler checks, so most type errors show up before the program runs (unlike Python or JavaScript). A few checks, like casts and array stores, still happen at runtime.",
            "**Memory-managed:** a garbage collector reclaims objects that are no longer reachable. There is no `free`.",
            "**Robust and secure by design:** strict compile-time checks, runtime checks (array bounds, null references, casts), bytecode verification and no pointer arithmetic remove whole classes of bugs and exploits.",
          ],
        },
      ],
    },
    {
      title: "How It Works Internally",
      blocks: [
        {
          type: "image",
          src: "/images/java/java-execution-flow.svg",
          alt: "Java source compiled by javac into bytecode, loaded and executed by the JVM",
          caption:
            "The whole journey at a glance. The figure uses `Hello.java`; the rest of this lesson uses `HelloWorld.java`, but the path is identical.",
        },
        {
          type: "paragraph",
          text: "Here is the end-to-end path, from a text file to instructions running on the CPU:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Source:** I write `HelloWorld.java`. Plain, human-readable text.",
            "**Compilation:** `javac HelloWorld.java` checks syntax and types and produces `HelloWorld.class`. That file holds **bytecode**, instructions for the JVM rather than for any real CPU. The same `.class` file works on Windows, Linux and macOS.",
            "**Class loading:** `java HelloWorld` starts a JVM, and a class loader finds `HelloWorld.class` on the class path and reads it into memory.",
            "**Linking and verification:** before the class can be used, the JVM links it. The first step is the **bytecode verifier**, which checks that the bytecode is well-formed and type-safe: no jumps into the middle of an instruction, no operand stack overflow or underflow, no treating an `int` as an object reference. This is the JVM's job, not `javac`'s, because a `.class` file can come from anywhere, including a tampered download.",
            "**Execution:** the execution engine runs `main`. It uses two strategies together. The **interpreter** executes bytecode one instruction at a time, which starts instantly but repeats the same work on every pass. The **JIT (just-in-time) compiler** watches for hot methods and loops, compiles them to native machine code and caches the result, so later calls run at native speed.",
            "**Hardware:** the native code runs directly on the CPU. The operating system schedules the JVM's threads like those of any other process.",
          ],
        },
        {
          type: "paragraph",
          text: "That is the whole trick behind WORA. The bytecode never changes between platforms. Only the JVM is built separately for each OS and CPU.",
        },
        {
          type: "heading",
          text: "Looking at the bytecode",
        },
        {
          type: "paragraph",
          text: "The first time I ran `javap -c` on `HelloWorld.class`, I expected something cryptic. It turned out to be short and readable: load the `System.out` field, push a string constant, call `println`, return. The compiler also added a default constructor I never wrote.",
        },
        {
          type: "code",
          language: "bash",
          code: `javac HelloWorld.java
javap -c HelloWorld`,
        },
        {
          type: "output",
          text: `Compiled from "HelloWorld.java"
public class HelloWorld {
  public HelloWorld();
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: return

  public static void main(java.lang.String[]);
    Code:
       0: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
       3: ldc           #13                 // String Hello, World!
       5: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
       8: return
}`,
        },
      ],
    },
    {
      title: "The Pipeline in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `┌─────────────────────┐
│  HelloWorld.java    │   source code, plain text
└──────────┬──────────┘
           │  javac  (once, on any OS)
           ▼
┌─────────────────────┐
│  HelloWorld.class   │   bytecode, identical everywhere
└──────────┬──────────┘
           │  java HelloWorld
           ▼
┌──────────────────────────────────────────────┐
│  JVM  (a separate build per OS and CPU)      │
│                                              │
│  ┌────────────────────┐                      │
│  │  Class loader      │  find + load .class  │
│  └─────────┬──────────┘                      │
│            ▼                                 │
│  ┌────────────────────┐                      │
│  │  Bytecode verifier │  part of linking     │
│  └─────────┬──────────┘                      │
│            ▼                                 │
│  ┌────────────────────┐                      │
│  │  Execution engine  │  interpreter + JIT   │
│  └─────────┬──────────┘                      │
└────────────┼─────────────────────────────────┘
             ▼
┌─────────────────────┐
│  Native code        │   executed by the CPU,
└─────────────────────┘   threads scheduled by the OS`,
          caption:
            "Everything above the JVM box is portable. Everything inside and below it is specific to the machine.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Zooming in on what happens after I type `java HelloWorld`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "The OS starts the `java` launcher, which creates a JVM inside the same process.",
            "The JVM bootstraps itself, loading core classes such as `java.lang.Object`, `java.lang.String` and `java.lang.System`.",
            "The application class loader finds `HelloWorld.class` on the class path and loads it. The class's metadata goes into Metaspace, and a `java.lang.Class` object representing it is created on the heap.",
            "The class is **linked**: the verifier checks the bytecode, static fields get default values, and symbolic references are resolved as they are needed.",
            "The launcher looks for the entry point. The classic form is `public static void main(String[] args)`. Since Java 25 the launcher also accepts instance, non-public and parameterless `main` methods (more on that in the syntax section).",
            "The class is **initialized** (its static initializers run), and `main` starts executing in the interpreter.",
            "Methods and loops that run often get JIT-compiled to native code, and later calls use the compiled version.",
            "Output is written, here `Hello, World!` to the console.",
            "When `main` returns and no other non-daemon threads are running, the JVM runs its shutdown hooks and the process exits with status `0`.",
          ],
        },
        {
          type: "paragraph",
          text: "Steps 2 and 3 are easy to watch. `-Xlog:class+load` logs every class as it loads. On my JDK 21 machine, over 400 JDK classes loaded before `HelloWorld` did:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load HelloWorld | grep -E "java.lang.(Object|String|System) |HelloWorld"`,
        },
        {
          type: "output",
          text: `[0.027s][info][class,load] java.lang.Object source: shared objects file
[0.028s][info][class,load] java.lang.String source: shared objects file
[0.028s][info][class,load] java.lang.System source: shared objects file
[0.029s][info][class,load] HelloWorld source: file:/.../hello/`,
        },
        {
          type: "callout",
          tone: "note",
          title: "Loading is not initialization",
          text: "The JVM may load a class early, but it only **initializes** it (runs static initializers) on first active use: `new`, a static method call, or reading a static field that isn't a compile-time constant. The class-loading lesson covers this in detail.",
        },
      ],
    },
    {
      title: "JVM Memory at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "Stack and heap get a full phase of their own later. Class loading already touches memory, though, so here is a preview of the regions the JVM manages, as they are laid out in HotSpot (the JVM in OpenJDK) since Java 8:",
        },
        {
          type: "diagram",
          text: `┌──────────────────────────────────────────────────────────┐
│  SHARED BY ALL THREADS                                   │
│  ┌─────────────────────────┐ ┌────────────────────────┐  │
│  │ Heap                    │ │ Metaspace (native mem) │  │
│  │  objects and arrays     │ │  class metadata:       │  │
│  │  Class objects, which   │ │  methods, bytecode,    │  │
│  │  hold static fields     │ │  constant pools        │  │
│  │  interned strings       │ │  = the "method area"   │  │
│  └─────────────────────────┘ └────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Code cache  (native code from the JIT)             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ONE PER THREAD                                          │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────┐  │
│  │ JVM stack      │ │ PC register    │ │ Native       │  │
│  │  one frame per │ │  current       │ │ method stack │  │
│  │  method call   │ │  instruction   │ │  (JNI calls) │  │
│  └────────────────┘ └────────────────┘ └──────────────┘  │
└──────────────────────────────────────────────────────────┘`,
          caption:
            "The JVM specification calls it the method area. HotSpot implements it as Metaspace, in native memory outside the heap.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Static fields are not in Metaspace",
          text: "Many older notes say the method area holds static variables. In HotSpot since Java 8 that is wrong: Metaspace holds class metadata only, while static fields live on the heap inside the class's `java.lang.Class` object, next to interned strings. PermGen, the region Metaspace replaced, was removed in Java 8.",
        },
      ],
    },
    {
      title: "How the Launcher Starts main",
      blocks: [
        {
          type: "paragraph",
          text: "Put together, this is roughly what happens between `java HelloWorld` and the first line of `main`. It is simplified pseudo-code, but the split of responsibilities is real: the JVM loads, links and runs classes, while the `java` launcher decides which method is the entry point.",
        },
        {
          type: "code",
          language: "text",
          title: "launcher pseudo-code",
          code: `launch(className, args):
    jvm   = createJavaVM(options)          // JNI_CreateJavaVM
    clazz = appClassLoader.load(className)  // load only, no init yet
    // may throw VerifyError while linking

    entry = findMainMethod(clazz)           // launcher rule, not the JVM spec
    if entry is null:
        print "Error: Main method not found in class ..."
        exit(1)

    // invoking main initializes the class first,
    // then the execution engine runs its bytecode
    jvm.invoke(entry, args)

    jvm.destroy()   // waits for non-daemon threads, runs shutdown hooks`,
        },
        {
          type: "paragraph",
          text: "A missing `main` is not a `NoSuchMethodError` thrown by the JVM. The launcher prints an error message and exits with status `1`. You'll see the exact messages in the common mistakes section.",
        },
      ],
    },
    {
      title: "The Syntax, Line by Line",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "HelloWorld.java",
          code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
        },
        {
          type: "table",
          headers: ["Element", "Why it's there"],
          rows: [
            [
              "`public class HelloWorld`",
              "In classic Java, all code lives inside a class. A `public` top-level class must be in a file with the same name, `HelloWorld.java`. That rule is enforced by `javac`. The JVM never sees the source filename: `javac` names the output `HelloWorld.class` after the class, and the class loader finds it by that name.",
            ],
            [
              "`public static void main(String[] args)`",
              "The classic entry point. `public` so the launcher can call it from outside the class. `static` so it can be called before any object exists. `void` because the exit status is not a return value: it is `0` on normal completion, `1` on an uncaught exception, or whatever you pass to `System.exit(int)`. `String[] args` holds the command-line arguments.",
            ],
            [
              "`System.out.println(...)`",
              "`System` is a class in `java.lang`, `out` is its `public static final` `PrintStream` field for standard output, and `println` prints the value followed by a line separator.",
            ],
          ],
        },
        {
          type: "heading",
          text: "What changed in Java 25",
        },
        {
          type: "paragraph",
          text: "For almost 30 years `static` really was mandatory. Java 25 finalized **JEP 512** (compact source files and instance main methods), and the launcher's rules relaxed. `main` can now be an instance method, doesn't have to be `public` (only not `private`), and can drop the `String[] args` parameter. The launcher prefers a `main(String[] args)` and falls back to `main()`. For an instance `main`, it creates the object through a non-private no-argument constructor first. A source file can even skip the class declaration:",
        },
        {
          type: "code",
          language: "java",
          title: "HelloWorld.java (Java 25+)",
          code: `void main() {
    IO.println("Hello, World!");
}`,
        },
        {
          type: "paragraph",
          text: "I still write the classic signature in real services. Every framework, tutorial and codebase uses it, and it works on every Java version. But in an interview I'd be careful not to say `static` is required by the language. It never was: it was the launcher's rule, and the launcher changed it.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The smallest program",
        },
        {
          type: "code",
          language: "java",
          title: "HelloWorld.java",
          code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac HelloWorld.java
java HelloWorld`,
        },
        {
          type: "output",
          text: "Hello, World!",
        },
        {
          type: "paragraph",
          text: "Declare a class, declare the entry point, print one line. Note that `java` takes the class name, not the file name.",
        },
        {
          type: "heading",
          text: "A variable and string concatenation",
        },
        {
          type: "code",
          language: "java",
          title: "Greeter.java",
          code: `public class Greeter {
    public static void main(String[] args) {
        String name = "Prince";
        System.out.println("Hello, " + name + "! Welcome to Java.");
    }
}`,
        },
        {
          type: "output",
          text: "Hello, Prince! Welcome to Java.",
        },
        {
          type: "paragraph",
          text: "`name` is a `String` variable. The `+` operator joins it with the literals into one string, and `println` prints the result.",
        },
        {
          type: "heading",
          text: "Passing command-line arguments",
        },
        {
          type: "code",
          language: "java",
          title: "Args.java",
          code: `public class Args {
    public static void main(String[] args) {
        System.out.println("Got " + args.length + " argument(s)");
        for (int i = 0; i < args.length; i++) {
            System.out.println("args[" + i + "] = " + args[i]);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Args.java
java Args ride 42 "hello world"`,
        },
        {
          type: "output",
          text: `Got 3 argument(s)
args[0] = ride
args[1] = 42
args[2] = hello world`,
        },
        {
          type: "paragraph",
          text: "This is what `String[] args` is for. Everything after the class name lands in the array, split on spaces unless I quote it, which is why `\"hello world\"` arrives as one argument. Note that `42` is still a `String`; the launcher never converts types for me.",
        },
        {
          type: "heading",
          text: "One class file, asking where it is running",
        },
        {
          type: "code",
          language: "java",
          title: "WhereAmI.java",
          code: `public class WhereAmI {
    public static void main(String[] args) {
        System.out.println("Java version : " + System.getProperty("java.version"));
        System.out.println("JVM          : " + System.getProperty("java.vm.name"));
        System.out.println("OS           : " + System.getProperty("os.name"));
        System.out.println("CPU arch     : " + System.getProperty("os.arch"));
    }
}`,
        },
        {
          type: "output",
          text: `Java version : 21.0.12.1
JVM          : OpenJDK 64-Bit Server VM
OS           : Linux
CPU arch     : amd64`,
        },
        {
          type: "paragraph",
          text: "The bytecode never changes, but the answers do: copy the same `WhereAmI.class` to a Windows or macOS machine and it reports that platform instead. That is WORA in one file.",
        },
        {
          type: "paragraph",
          text: "There is a catch I ran into, though. Running the JDK 21 build on a Java 17 runtime fails before `main` even starts:",
        },
        {
          type: "output",
          text: `Error: LinkageError occurred while loading main class WhereAmI
	java.lang.UnsupportedClassVersionError: WhereAmI has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0`,
        },
        {
          type: "callout",
          tone: "tip",
          text: "\"Run anywhere\" means any JVM that is **at least as new** as the class file. Compiling with `javac --release 17 WhereAmI.java` produces version 61 bytecode, and that build ran fine on the Java 17 runtime.",
        },
        {
          type: "heading",
          text: "The same entry point in a real service",
        },
        {
          type: "paragraph",
          text: "In RideX, my ride-hailing project on Java 21 and Spring Boot, the whole application still starts from this exact contract. Spring Boot doesn't replace `main`. It gives `main` one job:",
        },
        {
          type: "code",
          language: "java",
          title: "RideXApplication.java",
          code: `@SpringBootApplication
public class RideXApplication {
    public static void main(String[] args) {
        SpringApplication.run(RideXApplication.class, args);
    }
}`,
        },
        {
          type: "paragraph",
          text: "Same JVM, same launcher, same `public static void main`. The framework takes over from the first line.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "File name doesn't match the public class",
        },
        {
          type: "paragraph",
          text: "Save `public class HelloWorld` as `Hello.java` and `javac` refuses it:",
        },
        {
          type: "output",
          text: `Hello.java:1: error: class HelloWorld is public, should be declared in a file named HelloWorld.java
public class HelloWorld {
       ^
1 error`,
        },
        {
          type: "paragraph",
          text: "This is a compiler rule, not a class-loading one. Remove `public` and the same file compiles fine to `HelloWorld.class`, and `java HelloWorld` runs it.",
        },
        {
          type: "heading",
          text: "Running the .class file instead of the class",
        },
        {
          type: "code",
          language: "bash",
          code: "java HelloWorld.class",
        },
        {
          type: "output",
          text: `Error: Could not find or load main class HelloWorld.class
Caused by: java.lang.ClassNotFoundException: HelloWorld.class`,
        },
        {
          type: "paragraph",
          text: "`java` expects a class name, so it looks for a class called `class` in a package called `HelloWorld`. The fix is `java HelloWorld`.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "`java HelloWorld.java` (with `.java`) is valid since Java 11. The launcher compiles the source in memory and runs it, which is handy for single-file experiments. It's the `.class` suffix that is always wrong.",
        },
        {
          type: "heading",
          text: "Leaving out static on main (before Java 25)",
        },
        {
          type: "paragraph",
          text: "Older notes claim this throws `NoSuchMethodError: main`. That's not what happens. On Java 21, `public void main(String[] args)` compiles fine, and the launcher prints:",
        },
        {
          type: "output",
          text: `Error: Main method is not static in class HelloWorld, please define the main method as:
   public static void main(String[] args)`,
        },
        {
          type: "paragraph",
          text: "It exits with status `1`. On Java 21 the same class runs with `--enable-preview`, because instance main methods were a preview feature (JEP 445). On Java 25 it just runs.",
        },
        {
          type: "heading",
          text: "Wrong method name or parameter",
        },
        {
          type: "paragraph",
          text: "`public static void Main(String[] args)` (capital M) or `public static void main(String args)` (no `[]`) both compile, because they are legal methods. They just aren't entry points. On Java 21:",
        },
        {
          type: "output",
          text: `Error: Main method not found in class HelloWorld, please define the main method as:
   public static void main(String[] args)
or a JavaFX application class must extend javafx.application.Application`,
        },
        {
          type: "paragraph",
          text: "Java 25 still rejects both. It accepts `main()` with no parameters, but not `main(String)`, and never `Main`.",
        },
        {
          type: "heading",
          text: "Treating JDK, JRE and JVM as the same thing",
        },
        {
          type: "paragraph",
          text: "They are nested, not interchangeable. The JVM runs bytecode. The JRE is the JVM plus the standard class libraries. The JDK is the JRE plus tools like `javac`, `javap` and `jlink`. Each one gets its own lesson in this phase.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Match the file name to the public class exactly, including case. macOS and Windows file systems are usually case-insensitive while Linux is not, so `helloworld.java` can work on a laptop and break in a Linux CI build.",
            "Keep `main` thin. In real projects it bootstraps the application (starts Spring, wires dependencies) and hands off. Business logic belongs in classes you can test.",
            "Name classes in PascalCase: `HelloWorld`, not `helloworld` or `hello_world`.",
            "Use the classic `public static void main(String[] args)` in production code unless every environment you deploy to runs Java 25 or later.",
          ],
        },
      ],
    },
    {
      title: "Performance: Startup vs Steady State",
      blocks: [
        {
          type: "list",
          items: [
            "**Startup costs something.** A JVM has to boot, load hundreds of classes and interpret code until the JIT catches up. A natively compiled C program starts faster, which matters for CLI tools and serverless cold starts.",
            "**Steady state is fast.** Once the JIT has compiled the hot paths, using runtime profiling a static compiler never sees (which branches are taken, which types actually show up), long-running Java services are often competitive with C++.",
            "That is why Java is such a good fit for long-running backend servers and historically a weaker fit for short-lived processes. The gap is closing: **GraalVM Native Image** compiles ahead of time to a native binary that starts in milliseconds, and JDK 24 and 25 added an AOT cache (Project Leyden) that lets the standard JVM reuse class loading and profiling work from a training run.",
          ],
        },
        {
          type: "paragraph",
          text: "I wanted to actually see the JIT kick in, so I wrote a loop that calls a tiny `square` method 100,000 times and ran it with `-XX:+PrintCompilation`:",
        },
        {
          type: "code",
          language: "java",
          title: "Hot.java",
          code: `public class Hot {
    static int square(int x) { return x * x; }

    public static void main(String[] args) {
        long sum = 0;
        for (int i = 0; i < 100_000; i++) sum += square(i);
        System.out.println(sum);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+PrintCompilation Hot | grep Hot::`,
        },
        {
          type: "output",
          text: `48    6       3       Hot::square (4 bytes)
48    7       4       Hot::square (4 bytes)
48    6       3       Hot::square (4 bytes)   made not entrant
51    8 %     3       Hot::main @ 4 (32 bytes)
51    9       3       Hot::main (32 bytes)`,
        },
        {
          type: "paragraph",
          text: "The fourth column is the tier. `square` got compiled by C1 (tier 3), then by C2 (tier 4), and the C1 version was thrown away (`made not entrant`). All of that happened within the first 50 milliseconds. `main` only runs once, but its loop was hot, so it got an on-stack replacement compile (the `%`), which swaps in compiled code while the loop is still running.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "When a freshly deployed Java service is slow for its first few seconds, the cause is usually warm-up (class loading plus JIT compilation), not a bug. Measure after warm-up, or you'll be benchmarking the interpreter.",
        },
      ],
    },
    {
      title: "Where Java Runs in Production",
      blocks: [
        {
          type: "list",
          items: [
            "Amazon, Netflix, LinkedIn, Uber and Google run large parts of their backend infrastructure on the JVM, in Java and in other JVM languages like Kotlin and Scala that compile to the same bytecode.",
            "Android apps are mostly written in Java or Kotlin, but Android does not run a JVM. The build converts bytecode to DEX format, and the **Android Runtime (ART)** runs that. The language and libraries carry over, the virtual machine does not.",
            "Kafka, Hadoop, Spark and Elasticsearch are all JVM systems. Understanding the JVM pays off directly in distributed systems work: tuning a Kafka broker's heap is JVM tuning. My Smart Dispatch project runs on Kafka with Java 21, so this is where these fundamentals turn into practical skills for me.",
          ],
        },
      ],
    },
    {
      title: "Interview Questions",
      blocks: [
        {
          type: "heading",
          text: "Beginner",
        },
        {
          type: "qa",
          items: [
            {
              question: "What is Java?",
              answer:
                "Java's a general-purpose, statically typed, object-oriented language where you compile once to bytecode and let a JVM run it on whatever machine you're on. That's the whole \"Write Once, Run Anywhere\" idea.\n\nWhy it stuck around in backends is more practical: garbage collection, a huge ecosystem like Spring and Hibernate, and it gets really fast once a server has been running a while. My own Java work is on Spring Boot services, and I noticed pretty quickly that the language itself is the small part. Most of what you actually learn is the JVM and the ecosystem around it.",
            },
            {
              question: "Why is Java called platform-independent?",
              answer:
                "Because `javac` doesn't produce machine code. It produces bytecode, and that bytecode is the same on every OS. The part that's platform-specific is the JVM, and there's a separate JVM build for Windows, Linux, macOS and so on.\n\nSo I can build a JAR on my laptop and run the exact same file on a Linux server. The one catch I've actually hit is the version. I ran a class compiled with JDK 21 on a Java 17 runtime and got `UnsupportedClassVersionError`, \"class file version 65.0\" versus \"up to 61.0\". The bytecode is portable across operating systems, not backwards across Java versions.",
            },
            {
              question: "What is bytecode?",
              answer:
                "It's the instruction set of the JVM, the stuff `javac` writes into `.class` files. It isn't tied to any real CPU.\n\nIt's stack-based and honestly more readable than I expected. When I ran `javap -c` on a Hello World, `main` was four instructions: `getstatic` to load `System.out`, `ldc` to push the string, `invokevirtual` to call `println`, and `return`. At runtime the JVM verifies that, interprets it, and JIT-compiles whatever turns out to be hot.",
            },
            {
              question: "What is the entry point of a Java program?",
              answer:
                "The `main` method, classically `public static void main(String[] args)`. It's the `java` launcher that looks for it, in whatever class you name on the command line.\n\nOne thing I'd point out: since Java 25, with JEP 512, the launcher also accepts a non-static `main`, a non-public one, and one with no parameters at all. I still write the classic signature everywhere, because every framework and tutorial uses it and it runs on any version.",
            },
            {
              question: "Why must the filename match the public class name?",
              answer:
                "Because `javac` enforces it for public top-level classes. Put `public class HelloWorld` in `Hello.java` and you get \"class HelloWorld is public, should be declared in a file named HelloWorld.java\".\n\nPeople often say it's so the class loader can find the class, but that's not really it. The class loader looks for `HelloWorld.class`, and `javac` names that file after the class, not after the source file. I tested it: I dropped `public`, left the file as `Hello.java`, and it compiled to `HelloWorld.class` and ran fine. The rule is about the compiler being able to find the source for a public class by name.",
            },
            {
              question: "What is the JVM?",
              answer:
                "It's the runtime that actually executes bytecode, and it owns everything around that too: class loading, memory, garbage collection, the JIT.\n\nIt's also a spec, which people forget. HotSpot, the one in OpenJDK, is just one implementation. OpenJ9 and GraalVM are others. What surprised me was how much work it does before my code even starts. With `-Xlog:class+load`, a plain Hello World loaded over 400 JDK classes before `HelloWorld` itself showed up.",
            },
            {
              question: "Is Java fully compiled or fully interpreted?",
              answer:
                "Neither, it's both. `javac` compiles source to bytecode ahead of time, then the JVM interprets that bytecode and JIT-compiles the hot parts to native code while it runs.\n\nYou can watch the JIT do it with `-XX:+PrintCompilation`. In a small loop test, my `square` method went from the interpreter to C1 and then to C2 within about 50 milliseconds.",
            },
            {
              question: "Who created Java and when?",
              answer:
                "James Gosling and his team at Sun Microsystems. It started in 1991 as the Green Project, which was actually aimed at consumer electronics, not the web.\n\nIt was first called Oak, got renamed to Java because Oak was already trademarked, was announced in 1995, and JDK 1.0 shipped in January 1996. Oracle bought Sun in 2010, and development happens in the open in OpenJDK now.",
            },
            {
              question: "What does WORA stand for?",
              answer:
                "Write Once, Run Anywhere. You compile to bytecode once, and any compatible JVM can run it without a rebuild.\n\nThe word doing the work is \"compatible\". A class built for Java 21 won't load on a Java 17 runtime, and code that hard-codes Windows paths or loads a native library isn't portable just because it's Java. That's why I pin the target with `--release` to whatever version we deploy on.",
            },
            {
              question: "What is `System.out.println()`?",
              answer:
                "It prints a value to standard output with a line break after it. `System` is a class in `java.lang`, `out` is its `public static final PrintStream` field, and `println` is a method on that stream.\n\nIn `javap` you can see exactly that: a `getstatic` to fetch `System.out`, then an `invokevirtual` on `PrintStream.println`. It's fine for learning, but in actual services I use a logger like SLF4J, so I get log levels and can control where output ends up.",
            },
          ],
        },
        {
          type: "heading",
          text: "Intermediate",
        },
        {
          type: "qa",
          items: [
            {
              question: "Explain the full journey from a `.java` file to program execution.",
              answer:
                "`javac` type-checks the source and writes bytecode to a `.class` file. Then `java HelloWorld` starts a JVM, the application class loader finds and loads the class, it gets linked (that's where verification happens), the launcher finds `main`, the class is initialized, and `main` starts in the interpreter.\n\nFrom there the JIT compiles whatever gets hot. When `main` returns and there are no non-daemon threads left, the JVM runs shutdown hooks and exits. The part I didn't appreciate until I logged it is how much happens before step one of my code: hundreds of JDK classes get loaded first, most of them from the shared archive.",
            },
            {
              question: "What is the difference between compilation and interpretation, and how does Java use both?",
              answer:
                "The way I explain it: a compiler turns the program into something else before it runs, and an interpreter just executes it step by step. Java does both, at different stages.\n\n`javac` compiles to bytecode up front. At runtime HotSpot interprets first, because that starts instantly, then compiles hot methods with C1 and eventually C2 once it has profiling data. In the `PrintCompilation` output you can see the tier numbers climb, 3 then 4, and the old C1 version gets marked \"made not entrant\" once the C2 one replaces it.",
            },
            {
              question: "What is the role of the bytecode verifier?",
              answer:
                "It checks that bytecode is safe before the JVM runs it. For example, an instruction can't treat an `int` as an object reference, and a jump can't land in the middle of another instruction. If the check fails you get a `VerifyError`.\n\nThe reason it lives in the JVM and not in `javac` is that the JVM can't assume a `.class` file came from `javac` at all. It could be hand-written or tampered with. By default HotSpot verifies application classes and trusts the JDK's own boot classes.",
            },
            {
              question: "What is JIT compilation and why does it matter?",
              answer:
                "It's the JVM compiling bytecode to native code while the program runs, but only for code that's actually hot. Because it happens at runtime, it can use things a normal compiler never knows, like which branches really get taken and which concrete types show up at a call site.\n\nThat's why a warmed-up Java service can be really fast even though it starts out interpreted. The cost is warm-up. When I tested a tiny loop, `main` itself even got an OSR compile (shown as `%`), meaning the JVM swapped in compiled code in the middle of the running loop.",
            },
            {
              question: "Why can't Java bytecode run directly on hardware?",
              answer:
                "Because real CPUs don't implement the JVM's instruction set. x86 and ARM have their own instructions and registers, and bytecode is a stack-based abstract format with instructions like `new` and `invokevirtual` that assume there's a runtime with objects, a GC and class loading behind them.\n\nThat's on purpose, since it's what makes bytecode portable. People did try Java hardware, Sun's picoJava and ARM's Jazelle, but JIT compilation on normal CPUs won out.",
            },
            {
              question: "What problems in C/C++ did Java aim to solve?",
              answer:
                "Mainly platform-specific binaries and memory safety. With C++ you rebuild for every OS and CPU, and you manage memory by hand, so leaks, double frees and buffer overruns are always on the table.\n\nJava moved the platform problem into the JVM and made memory automatic with garbage collection, plus references instead of raw pointers and bounds-checked arrays. It also dropped multiple inheritance of classes and used interfaces instead. The price is JVM startup time and a bigger memory footprint, which is a fair trade for most backend work.",
            },
            {
              question: "Why is the classic `main()` declared `static`, and is that still required?",
              answer:
                "It's static so the launcher can call it without creating an object first. When the program starts there's no instance of your class, and the launcher has no idea how you'd want to construct one.\n\nIt isn't strictly required anymore. Java 25 (JEP 512) lets `main` be an instance method, and the launcher creates the object with a no-argument constructor and calls it. On Java 21 I tried dropping `static`, and the launcher refused with \"Main method is not static in class HelloWorld\". It only ran once I added `--enable-preview`.",
            },
            {
              question: "What happens if the main method signature is incorrect?",
              answer:
                "Usually it compiles, and then fails when you launch it. `Main` with a capital M, or `main(String args)` without the brackets, is a perfectly legal method. It just isn't an entry point.\n\nWhen I tried both on Java 21, the launcher printed \"Error: Main method not found in class HelloWorld, please define the main method as: public static void main(String[] args)\" and exited with status 1. A lot of notes say it throws `NoSuchMethodError`, but what you actually get is that launcher message.",
            },
            {
              question: "What is the class loader's responsibility?",
              answer:
                "Taking a class name and turning it into a loaded class in the JVM, whether the bytes come from a `.class` file, a JAR, a module or something generated at runtime.\n\nThere's a hierarchy: bootstrap for core JDK classes, then platform, then the application loader for your class path. Each one asks its parent first, which is why you can't sneak in your own `java.lang.String`. Loading is only the first step, though. Linking and initialization come after and are separate, which trips people up.",
            },
            {
              question: "Why is Java called robust and secure?",
              answer:
                "Robust because a lot of mistakes either get caught at compile time or fail loudly instead of corrupting memory. An array overrun is an `ArrayIndexOutOfBoundsException`, not a silent write into someone else's memory, and the GC takes care of use-after-free.\n\nSecure mostly means there's no pointer arithmetic and the verifier rejects bad bytecode. I'd be careful not to oversell it in an interview, though. Log4Shell was a Java vulnerability, and so are injection bugs in Java apps.",
            },
          ],
        },
        {
          type: "heading",
          text: "Advanced",
        },
        {
          type: "qa",
          items: [
            {
              question: "How does the JVM decide which methods to JIT-compile?",
              answer:
                "HotSpot counts. Every method has an invocation counter and a back-edge counter for loop iterations, and when those cross a threshold the method gets queued for compilation.\n\nWith tiered compilation, the path is usually interpreter, then C1 with profiling after a few hundred calls, then C2 after a few thousand, using the profile C1 collected. Hot loops in a method that only runs once get on-stack replacement. I saw both in `PrintCompilation`: `square` went tier 3 then tier 4, and `main` got a `%` OSR compile because of its loop. If an assumption later breaks, the JVM deoptimizes back to the interpreter.",
            },
            {
              question: "What's the difference between the interpreter path and the compiled path in execution performance?",
              answer:
                "The interpreter has no compile cost, so it starts right away, but it pays dispatch overhead on every single instruction and can't optimize across them.\n\nCompiled code gets registers, inlining, escape analysis and loop optimizations, and for hot code it's easily an order of magnitude faster or more. What you pay is compile time, memory in the code cache and warm-up. Tiered compilation is basically HotSpot trying to get the startup of one and the throughput of the other.",
            },
            {
              question: "How does bytecode stay platform-independent when JIT-compiled code is platform-specific?",
              answer:
                "Because they live at different layers. The bytecode is what you ship, and it's identical everywhere. The JIT output is never shipped. Each JVM generates native code for its own CPU at runtime, keeps it in the code cache and throws it away when the process exits. The platform-specific work lives in the JVM, not in my application.",
            },
            {
              question: "What trade-offs does Java's hybrid model make compared to pure compilation (C++) or pure interpretation (Python)?",
              answer:
                "Against C++, Java gives you portable artifacts, memory safety and optimizations based on how the code actually runs. What it costs is startup time, warm-up, more memory and some GC overhead.\n\nAgainst CPython, Java adds a compile step and static types, and gets much better steady-state speed and a lot more errors caught before runtime. CPython also compiles to bytecode, but it has historically had no JIT. That's the main reason the performance gap is so big. The hybrid model really pays off for long-running servers, which is exactly where Java is strongest.",
            },
            {
              question: "Why did Sun choose bytecode instead of shipping source code to be interpreted?",
              answer:
                "Mostly so the expensive work happens once. Parsing, type-checking and compiling happen at build time instead of on every user's machine, and the runtime doesn't need a full compiler.\n\nBytecode is also compact, which mattered for applets over 1990s connections, and it's structured enough to be verified before it runs. A side effect nobody planned was that it became a target for other languages. Kotlin, Scala and Clojure all compile to the same bytecode.",
            },
            {
              question: "How does lazy class loading work?",
              answer:
                "The JVM doesn't load everything on the class path at startup. A class gets loaded when it's first needed, usually when a reference to it is resolved. It's only initialized, meaning its static initializers run, on first active use: `new`, a static method call, or touching a static field that isn't a compile-time constant.\n\nThe JVM is allowed to load early, but it can't initialize early. `-Xlog:class+load` is the easiest way to see it. A class I never touch simply never appears in the log.",
            },
            {
              question: "What is the significance of Java being statically typed for large codebases?",
              answer:
                "Mostly that the compiler and tooling can reason about the code for you. A wrong argument type or a call to a method that doesn't exist fails the build instead of failing in production.\n\nThe bigger win in practice is refactoring. In a Spring Boot codebase I can rename a method or change a signature, and the IDE finds every caller, and the compiler tells me what I missed. The JIT also benefits, because it knows exact types to optimize around.",
            },
            {
              question: "How does the JVM abstract away OS and CPU differences?",
              answer:
                "Bytecode is written against an abstract machine, with an operand stack, local variable slots, fixed-size types (an `int` is always 32 bits) and a defined memory model for threads.\n\nThe JVM then maps that onto the real hardware: native code for the actual CPU, OS threads for Java threads, system calls for I/O. The standard library does the same for files and networking. So my code never needs to know whether it's on Linux or Windows unless I go out of my way to make it care.",
            },
            {
              question: "What's the relationship between the JVM specification and JVM implementations like HotSpot or GraalVM?",
              answer:
                "The spec is the contract. It defines the class file format, what every instruction does, verification, and how loading, linking and initialization work. It deliberately doesn't say how to do garbage collection, JIT or memory layout.\n\nHotSpot, OpenJ9 and GraalVM each fill those gaps differently. GraalVM, for example, can swap in the Graal JIT and also offers Native Image for ahead-of-time compilation. A build has to pass the Java SE compatibility kit (the TCK) to be certified, which is why the same JAR behaves the same on any of them.",
            },
            {
              question: "Why is Java a good fit for enterprise, long-running server applications specifically?",
              answer:
                "Because a long-running process pays the startup and warm-up cost once and then runs on fully optimized code for weeks. Collectors like G1 and ZGC handle big heaps with short pauses, and virtual threads since Java 21 make high request volumes a lot simpler.\n\nThe less exciting reasons matter just as much: strong backward compatibility, LTS releases supported for years, and tooling like JFR and heap dumps for when something goes wrong in production.",
            },
          ],
        },
        {
          type: "heading",
          text: "Scenario-Based",
        },
        {
          type: "qa",
          items: [
            {
              question: "You compiled a `.java` file on Windows and try to run the `.class` file on a Linux server. Will it work?",
              answer:
                "Yes, as long as the server's Java version is at least the one you compiled for. The bytecode doesn't care about the OS.\n\nThe version part is the real trap. I compiled with JDK 21 and ran it on a Java 17 runtime, and got `UnsupportedClassVersionError`: \"compiled by a more recent version of the Java Runtime (class file version 65.0)\". That's why I set `--release` to the version we actually deploy on. After that, the only thing that breaks portability is the code itself, like a hard-coded `C:\\` path.",
            },
            {
              question: "A junior developer asks why they can't just distribute `.java` source files to end users instead of compiling. What do you tell them?",
              answer:
                "I'd tell them compiling once is what gives us something we can actually test and trust. If we ship source, every user needs a full JDK, pays compile time, and any compile error shows up on their machine instead of in our CI.\n\nA JAR is a verified, versioned artifact, and it's exactly what we tested. That said, I'd also show them `java Main.java`. For a quick single-file script, running source directly is legitimately handy.",
            },
            {
              question: "A service is slow for the first few seconds after deployment but fast afterward. What's likely happening at the JVM level?",
              answer:
                "Warm-up, most likely. The JVM is still loading classes and running in the interpreter, and the JIT hasn't compiled the hot paths yet. On top of that there's usually some application-level cold start, like connection pools opening on the first request.\n\nI'd confirm with metrics first, then send some warm-up traffic before the instance takes real load and gate it behind a readiness probe. If startup really matters, I'd look at the JDK 24+ AOT cache or GraalVM Native Image.",
            },
            {
              question: "You rename a class from `HelloWorld` to `Greeter` but forget to rename the file. What error occurs and why?",
              answer:
                "If the class is `public`, it won't compile. I tried it and got \"HelloWorld.java:1: error: class Greeter is public, should be declared in a file named Greeter.java\". That's `javac` enforcing the public-class-per-file rule.\n\nIf it isn't public, it compiles fine to `Greeter.class`, and then anything still running `java HelloWorld` fails with \"Could not find or load main class\". In practice I let the IDE do the rename, since it renames the file along with the class.",
            },
            {
              question: "A teammate claims \"Java is 100% interpreted, just like Python.\" How do you correct this?",
              answer:
                "I'd say it's half right. The JVM does interpret bytecode at first, but that bytecode was already compiled and type-checked by `javac`, and the JIT turns hot code into native machine code while it runs.\n\nIf they wanted proof, I'd run the service with `-XX:+PrintCompilation` and show them methods moving up to tier 4 within milliseconds. Standard CPython has historically had no JIT at all, and that's a big part of why the two perform so differently.",
            },
          ],
        },
      ],
    },
    {
      title: "Try It Yourself",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "Create a file named `MyIntro.java` with a `public class MyIntro`.",
            "In `main`, print your name, your current role, and one sentence about why you're learning Java, using three separate `System.out.println()` calls.",
            "Compile it with `javac MyIntro.java` and run it with `java MyIntro`.",
            "Then break it on purpose: rename the file, drop `static` from `main`, and run `java MyIntro.class`. Read each error message and match it to the common mistakes above.",
            "Bonus: run `javap -c MyIntro` and find the three `invokevirtual` calls to `println`.",
          ],
        },
        {
          type: "paragraph",
          text: "Here's my version:",
        },
        {
          type: "code",
          language: "java",
          title: "MyIntro.java",
          code: `public class MyIntro {
    public static void main(String[] args) {
        System.out.println("Name: Prince Kumar Sharma");
        System.out.println("Role: Associate Developer at Innofied");
        System.out.println("Why Java: I want to build backend services that stay fast and stable for months.");
    }
}`,
        },
        {
          type: "output",
          text: `Name: Prince Kumar Sharma
Role: Associate Developer at Innofied
Why Java: I want to build backend services that stay fast and stable for months.`,
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT     General-purpose, statically typed, class-based OOP
         language. Compiled to bytecode, run on a JVM (WORA).
ORIGIN   James Gosling, Sun Microsystems, Green Project (1991)
         "Oak" -> Java; announced 1995, JDK 1.0 in Jan 1996
TODAY    Oracle since 2010, developed in OpenJDK
         LTS: 8, 11, 17, 21, 25 (Sept 2025)

FLOW     .java ─javac─► .class ─java─► load ─► verify ─►
         init ─► interpret + JIT ─► native code on the CPU

ENTRY    public static void main(String[] args)   classic
         Java 25+: instance / non-public / no-args allowed

MEMORY   Heap: objects, Class objects + static fields
         Metaspace: class metadata only (no PermGen)
         Per thread: JVM stack, PC register, native stack

RUN IT   javac HelloWorld.java  then  java HelloWorld
         never: java HelloWorld.class`,
          caption: "The one-screen version I'd want the night before an interview.",
        },
        {
          type: "list",
          items: [
            "Never say Java is \"fully compiled\" or \"fully interpreted\". It's both: compiled to bytecode, then interpreted and JIT-compiled by the JVM.",
            "The file-name rule comes from `javac`. The entry-point rules come from the `java` launcher. Neither is the JVM's own business.",
            "Bytecode is portable. The JVM is not, and that's the point.",
          ],
        },
      ],
    },
  ],
};
