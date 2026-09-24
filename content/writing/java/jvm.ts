import type { Lesson } from "../types";

export const jvm: Lesson = {
  slug: "jvm",
  title: "JVM (Java Virtual Machine)",
  description:
    "Inside the JVM: the class loader subsystem, the runtime data areas and where things really live in HotSpot, and the execution engine with its interpreter, JIT compilers and garbage collector, all checked against real JDK 21 runs.",
  tags: ["JVM", "Class Loading", "JVM Memory", "JIT", "Garbage Collection"],
  sections: [
    {
      title: "Why the JVM Deserves Its Own Lesson",
      blocks: [
        {
          type: "paragraph",
          text: "Almost every \"why does Java work this way\" question I've run into ends at the JVM. Why a class's static block runs when it does, why a service is slow for its first minute, why an `OutOfMemoryError` says `Metaspace` instead of `Java heap space`: the answers all live here.",
        },
        {
          type: "paragraph",
          text: "The Java Virtual Machine is a **specification** for an abstract computer that executes bytecode, plus the **implementations** of that specification. It isn't hardware. It's a program, `libjvm.so` on my Linux machine, that the `java` launcher loads into its own process. Its job is to take `.class` files, which no real CPU can execute, and run them: load them, check them, lay them out in memory, execute them and clean up after them.",
        },
        {
          type: "paragraph",
          text: "The first lesson traced a Hello World from source to CPU. This one opens the box. I want to know the three subsystems well enough to reason about real failures, and I want every claim here to be something I actually watched happen on JDK 21.",
        },
      ],
    },
    {
      title: "Where the JVM Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The virtual machine idea came straight out of the Green Project's original goal: one program running unchanged on very different consumer-electronics chips. Put a virtual machine between the code and the hardware, and only the virtual machine has to be ported. The same idea turned out to be exactly what the web needed in 1995.",
        },
        {
          type: "list",
          items: [
            "**1996:** Sun published *The Java Virtual Machine Specification* alongside Java 1.0. It defines the class file format, the instruction set, verification, and how classes are loaded, linked and initialized.",
            "**Java 5 and 6:** new class file attributes for generics signatures and annotations (generics themselves are erased, so the instruction set barely changed), then the `StackMapTable` attribute that made verification faster.",
            "**Java 7:** `invokedynamic`, the first new invocation instruction since 1.0. Java 8 lambdas and, since Java 9, string concatenation are compiled to it.",
            "**Java 8:** HotSpot removed the Permanent Generation and moved class metadata to Metaspace in native memory.",
            "**Java 9 onwards:** the module system reshaped class loading (the extension loader became the platform loader), and G1 became the default garbage collector.",
          ],
        },
        {
          type: "heading",
          text: "One specification, several JVMs",
        },
        {
          type: "paragraph",
          text: "The specification says what must happen. It deliberately says nothing about how to implement garbage collection, JIT compilation or object layout, so implementations compete on exactly those:",
        },
        {
          type: "table",
          headers: ["Implementation", "Who", "What it's known for"],
          rows: [
            ["HotSpot", "Oracle / OpenJDK", "The JVM inside almost every OpenJDK build (Oracle, Temurin, Corretto, Zulu). Tiered C1/C2 JIT, G1, ZGC. Everything in this lesson is measured on it."],
            ["Eclipse OpenJ9", "IBM, now Eclipse", "Lower memory footprint and fast startup, popular in container-dense deployments."],
            ["GraalVM", "Oracle", "A JDK built on HotSpot that can use the Graal JIT compiler (written in Java) and adds **Native Image**, ahead-of-time compilation to a standalone binary."],
          ],
        },
        {
          type: "paragraph",
          text: "Because the contract is the bytecode, not the source language, Kotlin, Scala, Groovy and Clojure all run on the same JVMs. Those languages compiled to bytecode long before `invokedynamic` existed. What `invokedynamic` added was a fast, JIT-friendly way to express dynamic method dispatch and, later, lambdas.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "In the first lesson I used the universal translator. For the internals, the picture that works better for me is an international airport that every flight (a class) has to pass through before its passengers can do anything in the country (run code).",
        },
        {
          type: "list",
          items: [
            "**Immigration desks are the class loaders.** There are three counters in a fixed hierarchy, and each one sends you to the senior counter first. Only if the senior counter says \"not mine\" does the junior one process you. That's parent delegation, and it's why nobody sneaks in a fake `java.lang.String`.",
            "**The security scanner is the bytecode verifier.** Having a ticket (being loaded) isn't enough. Your bag is scanned before you're let through, and malformed bytecode is turned back with a `VerifyError`.",
            "**The city is the runtime data areas.** Shared infrastructure everyone uses (the heap, the method area) and a private hotel room per traveller (each thread's stack and PC register).",
            "**The workforce is the execution engine.** A slow, careful interpreter that handles everything from day one, and a specialist (the JIT) who studies the busiest routes and builds express lanes for them. The cleaning crew (the garbage collector) removes whatever nobody can reach any more.",
          ],
        },
        {
          type: "paragraph",
          text: "The analogy breaks in one useful place: an airport processes every passenger at arrival, but the JVM is lazy. A class isn't loaded until something needs it, and it isn't initialized until it's actually used. That laziness shows up again and again below.",
        },
      ],
    },
    {
      title: "The Three Subsystems",
      blocks: [
        {
          type: "heading",
          text: "A. Class loader subsystem",
        },
        {
          type: "paragraph",
          text: "It turns a class name into a live class inside the JVM. The specification splits this into three phases, and the middle one has three steps:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Loading:** find the bytes for a class (a `.class` file, an entry in a JAR, a module in the runtime image, or bytes generated in memory), parse them, and create the internal class structure plus a `java.lang.Class` object for it.",
            "**Linking, step 1, verification:** the bytecode verifier proves the code is type-safe and structurally sound before a single instruction runs.",
            "**Linking, step 2, preparation:** memory is set aside for static fields and they get **default** values: `0`, `false`, `null`. None of my code runs yet.",
            "**Linking, step 3, resolution:** symbolic references in the constant pool, like `Helper.greet:()Ljava/lang/String;`, are turned into direct references. HotSpot does this lazily, the first time each instruction that uses the reference executes.",
            "**Initialization:** the class's static initializer runs. That's every static field assignment and every `static {}` block, in source order. Now statics hold their real values.",
          ],
        },
        {
          type: "paragraph",
          text: "Three built-in loaders do the loading. The **bootstrap** loader lives inside the JVM in C++ and loads the core of the platform (`java.base`). The **platform** loader loads other Java SE and JDK modules such as `java.sql`. The **application** (system) loader loads my code from the class path or module path. Before Java 9 the middle one was the extension loader and read `jre/lib/ext`, which no longer exists.",
        },
        {
          type: "heading",
          text: "B. Runtime data areas",
        },
        {
          type: "paragraph",
          text: "The specification defines five areas. Two are shared by every thread, three are created per thread. HotSpot adds a sixth region the specification doesn't name, the code cache.",
        },
        {
          type: "table",
          headers: ["Area", "Scope", "What it holds (HotSpot, Java 8+)", "When it runs out"],
          rows: [
            ["Heap", "Shared", "Every object and array, each class's `Class` object (which holds its static fields), interned strings", "`OutOfMemoryError: Java heap space`"],
            ["Method area (Metaspace)", "Shared", "Class metadata: field and method descriptions, bytecode, the runtime constant pool. Native memory, not heap", "`OutOfMemoryError: Metaspace`"],
            ["Code cache", "Shared", "Native code produced by the JIT (240 MB reserved by default on my machine)", "JIT stops compiling, with a `CodeCache is full` warning"],
            ["JVM stack", "Per thread", "One frame per method call: local variables, an operand stack, a link to the class's constant pool", "`StackOverflowError`"],
            ["PC register", "Per thread", "Address of the bytecode instruction the thread is executing (undefined while in native code)", "Can't run out"],
            ["Native method stack", "Per thread", "Frames for native (C/C++) code called through JNI. HotSpot uses the thread's one native stack for both kinds of frames", "`StackOverflowError`"],
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The method area does not hold static variables",
          text: "My original notes said Metaspace stores \"class data and static variables\". That's the pre-Java-8 picture. Since Java 8 HotSpot keeps static fields inside the class's `java.lang.Class` object on the heap, and interned strings are on the heap too (they moved there in Java 7). Metaspace is class metadata only. PermGen, its fixed-size predecessor, was removed in Java 8.",
        },
        {
          type: "heading",
          text: "C. Execution engine",
        },
        {
          type: "list",
          items: [
            "**Interpreter:** executes bytecode one instruction at a time. It starts immediately and collects profiling data as it goes.",
            "**JIT compilers:** HotSpot has two. C1 compiles quickly with light optimization, C2 compiles slowly with aggressive optimization, and tiered compilation moves hot code from the interpreter to C1 to C2. The result goes into the code cache.",
            "**Garbage collector:** finds objects no thread can reach any more and reclaims their heap memory. G1 has been the default since Java 9. ZGC is the low-latency option.",
            "**JNI:** the Java Native Interface, the bridge into native libraries, which is what the native method stack exists for.",
          ],
        },
        {
          type: "paragraph",
          text: "None of this is abstract. When I took a thread dump of a trivial program that just sleeps, the JIT compilers and the collector were right there as real threads alongside `main`:",
        },
        {
          type: "code",
          language: "bash",
          code: `jcmd <pid> Thread.print | grep '^"'`,
        },
        {
          type: "output",
          text: `"main" #1 [133145] prio=5 os_prio=0 cpu=69.27ms elapsed=2.65s ...
"Reference Handler" #9 [133153] daemon prio=10 ...
"Finalizer" #10 [133154] daemon prio=8 ...
"C2 CompilerThread0" #14 [133158] daemon prio=9 ...
"C1 CompilerThread0" #22 [133159] daemon prio=9 ...
"VM Thread" os_prio=0 cpu=0.79ms elapsed=2.63s ...
"G1 Service" os_prio=0 cpu=0.31ms elapsed=2.65s ...
"G1 Conc#0" os_prio=0 cpu=0.14ms elapsed=2.65s ...
"GC Thread#0" os_prio=0 cpu=0.18ms elapsed=2.65s ...`,
        },
      ],
    },
    {
      title: "Internal Working: How the JVM Runs a Class",
      blocks: [
        {
          type: "paragraph",
          text: "Here is the full sequence when I run `java FareService`, with the parts I could observe marked by the flag or tool that shows them.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**The launcher starts the JVM.** The OS runs the `java` executable, which parses options and creates the JVM inside the same process (through `JNI_CreateJavaVM`). Heap, Metaspace and code cache are reserved now.",
            "**The platform boots.** The bootstrap loader loads core classes like `java.lang.Object` and `java.lang.String`, most of them straight out of the class data sharing (CDS) archive, which is why `-Xlog:class+load` reports them with `source: shared objects file`.",
            "**My class is loaded.** The application loader receives the request, delegates up to the platform loader, which delegates to the bootstrap loader. Neither parent has `FareService`, so the application loader reads `FareService.class` from the class path.",
            "**It's linked.** The verifier checks the bytecode, preparation gives `tripCount` the value `0`, and resolution happens piece by piece as instructions first execute.",
            "**The launcher finds the entry point.** This is the `java` launcher's rule, not the JVM specification's. The classic form is `public static void main(String[] args)`. Since Java 25 (JEP 512) it also accepts an instance `main`, a non-public one, and one with no parameters.",
            "**The class is initialized** just before `main` is invoked: static initializers run in source order.",
            "**The interpreter runs `main`,** counting method calls and loop back-edges as it goes.",
            "**Hot code is JIT-compiled.** Methods and loops that cross the thresholds go to C1, then C2, and later calls jump into native code in the code cache (`-XX:+PrintCompilation` shows it).",
            "**The garbage collector runs when needed.** With G1, a young collection is triggered when the young regions fill up, not on a timer (`-Xlog:gc` shows it).",
            "**Shutdown.** When the last non-daemon thread finishes (or someone calls `System.exit`), the JVM runs registered shutdown hooks and the process exits. Daemon threads are simply abandoned.",
          ],
        },
        {
          type: "heading",
          text: "Watching preparation happen",
        },
        {
          type: "paragraph",
          text: "I couldn't see preparation directly until I wrote a static initializer that reads a field before its own assignment has run. The default value from preparation leaks out:",
        },
        {
          type: "code",
          language: "java",
          title: "PrepareDemo.java",
          code: `public class PrepareDemo {
    static int a = readB();   // runs before b is assigned
    static int b = 10;

    static int readB() {
        return b;
    }

    public static void main(String[] args) {
        System.out.println("a = " + a);
        System.out.println("b = " + b);
    }
}`,
        },
        {
          type: "output",
          text: `a = 0
b = 10`,
        },
        {
          type: "paragraph",
          text: "Preparation set `b` to `0`. Initialization runs top to bottom, so when `a`'s initializer calls `readB()`, the `b = 10` line hasn't run yet.",
        },
        {
          type: "heading",
          text: "Loading is not initialization",
        },
        {
          type: "paragraph",
          text: "The JVM may load a class early, but it initializes it only on first active use: `new`, a static method call, or reading or writing a static field that isn't a compile-time constant (also reflection, a subclass being initialized, or being the main class). This program pokes a nested class in three ways:",
        },
        {
          type: "code",
          language: "java",
          title: "LazyInit.java",
          code: `public class LazyInit {
    static class Config {
        static { System.out.println("Config initialized"); }
        static final int LIMIT = 5;          // compile-time constant
        static int counter = 0;              // not a constant
    }

    public static void main(String[] args) {
        System.out.println("start");
        Config[] slots = new Config[2];      // loads Config, no init
        System.out.println("array created, LIMIT = " + Config.LIMIT);
        System.out.println("counter = " + Config.counter);  // triggers init
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load LazyInit | grep -E "LazyInit|^start|^array|^Config|^counter"`,
        },
        {
          type: "output",
          text: `[0.039s][info][class,load] LazyInit source: file:/.../jvm/
start
[0.040s][info][class,load] LazyInit$Config source: file:/.../jvm/
array created, LIMIT = 5
Config initialized
counter = 0`,
        },
        {
          type: "paragraph",
          text: "Creating a `Config[]` loaded `Config` but did not initialize it. Reading `LIMIT` didn't either, because `javac` inlines compile-time constants into the caller, so the bytecode never touches `Config` for it. Only reading `counter` triggered the static block.",
        },
        {
          type: "heading",
          text: "What resolution actually resolves",
        },
        {
          type: "paragraph",
          text: "Symbolic references are just text in the class file's constant pool. For a `Main` class that calls `new Helper().greet()`, `javap -v` shows them:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -v Main",
        },
        {
          type: "output",
          text: `Constant pool:
  ...
  #13 = Class              #14            // Helper
  #14 = Utf8               Helper
  #15 = Methodref          #13.#3         // Helper."<init>":()V
  #16 = Methodref          #13.#17        // Helper.greet:()Ljava/lang/String;
  #17 = NameAndType        #18:#19        // greet:()Ljava/lang/String;
  #18 = Utf8               greet
  #19 = Utf8               ()Ljava/lang/String;`,
        },
        {
          type: "paragraph",
          text: "Nothing here is an address. When the `new` instruction that points at `#13` first runs, the JVM resolves it: it asks `Main`'s class loader for `Helper`, loading it if needed, and caches the result. If `Helper.class` is gone at that moment, resolution fails, which is exactly the `NoClassDefFoundError` in the common mistakes section.",
        },
      ],
    },
    {
      title: "The Architecture in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `┌──────────────────────────────────────────────────────────┐
│  java FareService      launcher creates the JVM          │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  1. CLASS LOADER SUBSYSTEM                               │
│     Bootstrap ◄── Platform ◄── Application               │
│     (each loader asks its parent first)                  │
│     Load ─► Link (verify, prepare, resolve) ─► Init      │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  2. RUNTIME DATA AREAS                                   │
│     shared:      Heap │ Metaspace │ Code cache           │
│     per thread:  JVM stack │ PC register │ native stack  │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  3. EXECUTION ENGINE                                     │
│     Interpreter ──hot code──► JIT  (C1, then C2)         │
│     Garbage collector  (G1 by default)                   │
│     JNI ──► native libraries                             │
└────────────────────────────┬─────────────────────────────┘
                             ▼
               native machine code ─► OS ─► CPU`,
          caption:
            "The three subsystems. The arrows show the order a class moves through them, not a one-time pipeline: loading, JIT compilation and GC keep happening for the life of the process.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "The whiteboard version of the sequence above, in the order I'd say it in an interview:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`java ClassName`: the OS starts the launcher, which creates the JVM in-process.",
            "Load: the application loader delegates to platform, then bootstrap, then loads the class itself.",
            "Link: verify the bytecode, prepare statics with default values, resolve references (lazily in HotSpot).",
            "The launcher locates the entry point (`public static void main(String[] args)`, or a Java 25 instance or no-args `main`).",
            "Initialize: static fields get their real values, static blocks run in source order.",
            "Interpret `main`, profiling as it goes.",
            "JIT-compile hot methods and loops (C1, then C2) into the code cache.",
            "Collect garbage when heap regions fill.",
            "Last non-daemon thread ends: shutdown hooks run, process exits with a status code.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Steps 4 and 5 can look swapped",
          text: "Some notes put initialization before the launcher looks for `main`. In HotSpot's launcher, finding the method doesn't initialize the class. Invoking it does, because calling a static method is an active use. The order that matters for interviews is that static initializers finish before the first line of `main` runs.",
        },
      ],
    },
    {
      title: "Memory: Where Things Actually Live",
      blocks: [
        {
          type: "paragraph",
          text: "Stack versus heap gets a whole phase later. Here I want the map right, because it's the part most notes get wrong. Take this small class:",
        },
        {
          type: "code",
          language: "java",
          title: "FareService.java",
          code: `public class FareService {
    static int tripCount = 0;

    record Trip(int km) {}

    public static void main(String[] args) {
        int km = 12;
        Trip trip = new Trip(km);
        String city = "Kolkata";
        tripCount++;
        System.out.println(city + ": " + trip + ", trips = " + tripCount);
    }
}`,
        },
        {
          type: "output",
          text: "Kolkata: Trip[km=12], trips = 1",
        },
        {
          type: "paragraph",
          text: "Just before the `println`, the memory looks like this:",
        },
        {
          type: "diagram",
          text: ` main thread's JVM stack          HEAP  (shared)
┌───────────────────────┐      ┌─────────────────────────────┐
│ frame: main           │      │                             │
│   args  ──────────────┼─────►│ String[0]                   │
│   km    = 12          │      │                             │
│   trip  ──────────────┼─────►│ Trip { km = 12 }            │
│   city  ──────────────┼─────►│ "Kolkata"  (interned)       │
│                       │      │                             │
│ operand stack         │      │ Class<FareService> object   │
└───────────────────────┘      │   static tripCount = 1      │
 PC register: next bytecode    └─────────────────────────────┘

         METASPACE  (native memory, outside the heap)
┌────────────────────────────────────────────────────────────┐
│ FareService, FareService$Trip: field and method info,      │
│ bytecode, runtime constant pool                            │
└────────────────────────────────────────────────────────────┘`,
          caption:
            "`km` is a primitive, so its value sits in the frame. The other locals are references into the heap. The static field lives in the `Class` object, not in Metaspace.",
        },
        {
          type: "paragraph",
          text: "Every thread gets its own stack and PC register, which is why local variables are thread-safe by construction and heap objects are not. Two threads calling `main`-like code would each have their own `km`, but they'd share the one `tripCount`.",
        },
        {
          type: "heading",
          text: "PermGen and Metaspace",
        },
        {
          type: "paragraph",
          text: "Before Java 8, HotSpot kept class metadata, interned strings (until Java 7) and static fields in the **Permanent Generation**: a fixed-size region reserved next to the Java heap and collected with it. Its maximum was set once with `-XX:MaxPermSize`, and applications that loaded lots of classes, or redeployed web apps without restarting the server, died with `OutOfMemoryError: PermGen space`.",
        },
        {
          type: "paragraph",
          text: "Java 8 removed it. Class metadata went to **Metaspace**, allocated from native memory and unbounded by default. This came out of merging HotSpot with Oracle's JRockit JVM, which never had a PermGen, as much as out of the OOM problem. Unbounded doesn't mean leak-proof, though: it only means the leak eats the machine's memory instead of a fixed box. That's why I'd still set `-XX:MaxMetaspaceSize` in a container.",
        },
        {
          type: "heading",
          text: "Looking at a live JVM",
        },
        {
          type: "paragraph",
          text: "`jcmd` attaches to a running JVM. On a small program started with `-Xmx256m`, `GC.heap_info` shows the G1 heap and Metaspace as separate things:",
        },
        {
          type: "code",
          language: "bash",
          code: `jcmd -l
jcmd <pid> GC.heap_info`,
        },
        {
          type: "output",
          text: `133143 Idle
 garbage-first heap   total 247808K, used 3039K [0x00000000f0000000, 0x0000000100000000)
  region size 1024K, 2 young (2048K), 0 survivors (0K)
 Metaspace       used 360K, committed 576K, reserved 1114112K
  class space    used 26K, committed 128K, reserved 1048576K`,
        },
        {
          type: "paragraph",
          text: "Metaspace shows only 360K used because most JDK classes come from the CDS archive, which is mapped separately. The 1 GB \"class space\" reservation is compressed class space, part of Metaspace. It's address space, not memory actually in use.",
        },
      ],
    },
    {
      title: "Inside ClassLoader.loadClass",
      blocks: [
        {
          type: "paragraph",
          text: "My first attempt at pseudo-code put linking and initialization inside the loader. That's not how it works. `loadClass` only loads. Here's the real shape of `java.lang.ClassLoader.loadClass`, simplified:",
        },
        {
          type: "code",
          language: "text",
          title: "ClassLoader.loadClass, simplified",
          code: `loadClass(name):
    synchronized (getClassLoadingLock(name)):
        c = findLoadedClass(name)          // already loaded by me?
        if c is null:
            try:
                if parent is not null:
                    c = parent.loadClass(name)      // delegate up
                else:
                    c = findBootstrapClassOrNull(name)
            catch ClassNotFoundException:
                // parent couldn't find it: fall through
            if c is null:
                c = findClass(name)   // read bytes, call defineClass
        return c                      // loaded, not initialized

defineClass(name, bytes):
    parse class file, create metadata in Metaspace
    create the java.lang.Class object on the heap
    // verification, preparation and resolution happen when
    // the JVM links the class; initialization on first use`,
        },
        {
          type: "paragraph",
          text: "A custom loader normally overrides `findClass`, not `loadClass`, so it keeps delegation for free. Since Java 9 the built-in loaders also know about modules: a class in a named module goes straight to the loader that defines that module instead of walking the chain blindly.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The loader hierarchy, printed",
        },
        {
          type: "code",
          language: "java",
          title: "DelegationDemo.java",
          code: `public class DelegationDemo {
    public static void main(String[] args) {
        ClassLoader app = DelegationDemo.class.getClassLoader();
        System.out.println("DelegationDemo -> " + app);
        System.out.println("its parent     -> " + app.getParent());
        System.out.println("parent's parent-> " + app.getParent().getParent());

        System.out.println("java.sql.Date  -> " + java.sql.Date.class.getClassLoader());
        System.out.println("String         -> " + String.class.getClassLoader());
    }
}`,
        },
        {
          type: "output",
          text: `DelegationDemo -> jdk.internal.loader.ClassLoaders$AppClassLoader@639fee48
its parent     -> jdk.internal.loader.ClassLoaders$PlatformClassLoader@677327b6
parent's parent-> null
java.sql.Date  -> jdk.internal.loader.ClassLoaders$PlatformClassLoader@677327b6
String         -> null`,
        },
        {
          type: "paragraph",
          text: "My class comes from the application loader. `java.sql.Date` lives in the `java.sql` module, which the platform loader owns. `String` reports `null` because the bootstrap loader is part of the JVM itself and has no `ClassLoader` object to hand back. `null` here doesn't mean \"no loader\", it means \"the bootstrap loader\".",
        },
        {
          type: "heading",
          text: "Same name, different class",
        },
        {
          type: "paragraph",
          text: "A class's identity at runtime is its name **plus** the loader that defined it. I loaded the same `Helper.class` through two separate `URLClassLoader`s with no parent in common:",
        },
        {
          type: "code",
          language: "java",
          title: "TwoLoaders.java",
          code: `import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;

public class TwoLoaders {
    public static void main(String[] args) throws Exception {
        URL[] path = { Path.of("plugins").toUri().toURL() };
        Class<?> a = new URLClassLoader(path, null).loadClass("Helper");
        Class<?> b = new URLClassLoader(path, null).loadClass("Helper");
        System.out.println(a.getName() + " == " + b.getName() + " ? " + (a == b));
        Object obj = a.getDeclaredConstructor().newInstance();
        b.cast(obj);
    }
}`,
        },
        {
          type: "output",
          text: `Helper == Helper ? false
Exception in thread "main" java.lang.ClassCastException: Cannot cast Helper to Helper
	at java.base/java.lang.Class.cast(Class.java:4069)`,
        },
        {
          type: "paragraph",
          text: "\"Cannot cast Helper to Helper\" looks absurd until you know this rule. It's the same thing that bites plugin systems and app servers when one library ends up loaded by two different loaders.",
        },
        {
          type: "heading",
          text: "Where invokedynamic shows up",
        },
        {
          type: "code",
          language: "java",
          title: "Indy.java",
          code: `public class Indy {
    public static void main(String[] args) {
        int fare = 120;
        Runnable r = () -> System.out.println("fare: " + fare);
        r.run();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p Indy | grep invokedynamic",
        },
        {
          type: "output",
          text: `       4: invokedynamic #7,  0              // InvokeDynamic #0:run:(I)Ljava/lang/Runnable;
       4: invokedynamic #21,  0             // InvokeDynamic #1:makeConcatWithConstants:(I)Ljava/lang/String;`,
        },
        {
          type: "paragraph",
          text: "Two lines of ordinary Java, two `invokedynamic` call sites: one creates the lambda, and the other (inside the private method `javac` generated for the lambda body) is the string concatenation.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Mixing up ClassNotFoundException and NoClassDefFoundError",
        },
        {
          type: "paragraph",
          text: "`ClassNotFoundException` is a checked exception thrown when code asks for a class by name and no loader finds it: `Class.forName`, `loadClass`. It usually means a wrong name or a missing plugin JAR:",
        },
        {
          type: "code",
          language: "java",
          title: "Loader.java",
          code: `public class Loader {
    public static void main(String[] args) throws Exception {
        Class.forName("com.example.PaymentPlugin");
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.ClassNotFoundException: com.example.PaymentPlugin
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	...`,
        },
        {
          type: "paragraph",
          text: "`NoClassDefFoundError` is an `Error` thrown when a class that existed at compile time can't be found while the JVM resolves a reference to it. I compiled `Main` and `Helper` together, deleted `Helper.class` and ran `java Main`:",
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.NoClassDefFoundError: Helper
	at Main.main(Main.java:3)
Caused by: java.lang.ClassNotFoundException: Helper
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	...`,
        },
        {
          type: "paragraph",
          text: "The `Caused by` line is the real tell: the loader's `ClassNotFoundException` got wrapped because it happened during resolution, not in a call I made. There's a second, sneakier cause. If a static initializer throws, the first access gets `ExceptionInInitializerError` and every later access gets `NoClassDefFoundError`, even though the class file is right there:",
        },
        {
          type: "code",
          language: "java",
          title: "BadInit.java",
          code: `public class BadInit {
    static class Rates {
        static final double BASE = Double.parseDouble(System.getProperty("base.fare"));
    }

    public static void main(String[] args) {
        for (int i = 1; i <= 2; i++) {
            try {
                System.out.println(Rates.BASE);
            } catch (Throwable t) {
                System.out.println("attempt " + i + ": " + t);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `attempt 1: java.lang.ExceptionInInitializerError
attempt 2: java.lang.NoClassDefFoundError: Could not initialize class BadInit$Rates`,
        },
        {
          type: "callout",
          tone: "tip",
          text: "When a `NoClassDefFoundError` says \"Could not initialize class\", don't go hunting for a missing JAR. Scroll up the logs to the first `ExceptionInInitializerError`: that's the real failure, usually a missing config value.",
        },
        {
          type: "heading",
          text: "Other mistakes I had in my own notes",
        },
        {
          type: "list",
          items: [
            "**Treating the verifier as the class loader.** Loading reads the bytes. Verification is a separate step inside linking, after loading.",
            "**Saying preparation assigns initial values.** It assigns defaults (`0`, `false`, `null`). Real values come in initialization, as `PrepareDemo` shows.",
            "**Putting static variables in Metaspace.** In HotSpot since Java 8 they're on the heap in the `Class` object.",
            "**Assuming there's one JVM.** HotSpot, OpenJ9 and GraalVM all implement the same specification.",
            "**Forgetting which areas are shared.** Heap, Metaspace and code cache are shared. JVM stack, PC register and native method stack are per thread.",
            "**Saying \"the JVM looks for `public static void main`\".** The `java` launcher does, and since Java 25 it accepts more than that one signature.",
            "**Confusing JVM, JRE and JDK.** The JVM runs bytecode, the JRE is the JVM plus the class library, the JDK adds tools like `javac` and `jcmd`. The next two lessons cover them.",
          ],
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Read the `OutOfMemoryError` message before anything else. `Java heap space`, `Metaspace`, `unable to create native thread` and `Direct buffer memory` point at four different regions and four different fixes.",
            "Set `-Xmx` (or `-XX:MaxRAMPercentage` in containers) deliberately. The default max heap is a quarter of physical memory; `-XX:+PrintCommandLineFlags -version` shows mine as `MaxHeapSize=4015088640` on a 15 GB machine.",
            "Cap Metaspace with `-XX:MaxMetaspaceSize` for services that generate classes (proxies, scripting, plugins), so a class-loader leak fails fast instead of eating the host.",
            "Add `-XX:+HeapDumpOnOutOfMemoryError` in production. The dump is the difference between guessing and knowing what filled the heap.",
            "In custom class loaders, override `findClass` and keep parent delegation unless you have a clear reason to invert it, and close `URLClassLoader`s you're done with.",
            "Keep static initializers boring. Anything that can fail there turns into `NoClassDefFoundError` for the rest of the process's life.",
          ],
        },
      ],
    },
    {
      title: "Performance: JIT and GC in Practice",
      blocks: [
        {
          type: "heading",
          text: "Interpreter vs C1 vs tiered, measured",
        },
        {
          type: "paragraph",
          text: "Parent delegation adds a couple of lookups per class, once. It's a safety and consistency choice, not a speed one, and loaded classes are cached. The execution engine is where the real performance story is, so I timed one CPU-heavy loop under three modes:",
        },
        {
          type: "code",
          language: "java",
          title: "Warmup.java",
          code: `public class Warmup {
    static long collatzSteps(long n) {
        long steps = 0;
        while (n != 1) {
            n = (n % 2 == 0) ? n / 2 : 3 * n + 1;
            steps++;
        }
        return steps;
    }

    public static void main(String[] args) {
        long start = System.nanoTime();
        long total = 0;
        for (long i = 1; i <= 2_000_000; i++) total += collatzSteps(i);
        long ms = (System.nanoTime() - start) / 1_000_000;
        System.out.println("total steps = " + total + ", took " + ms + " ms");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xint Warmup                     # interpreter only
java -XX:TieredStopAtLevel=1 Warmup   # interpreter + C1
java Warmup                           # default tiered: C1 + C2`,
        },
        {
          type: "output",
          text: `total steps = 277182223, took 12836 ms
total steps = 277182223, took 3070 ms
total steps = 277182223, took 516 ms`,
        },
        {
          type: "paragraph",
          text: "Same bytecode, 25 times faster with the full JIT. `-XX:+PrintCompilation` shows how fast it got there: `collatzSteps` hit C1 (tier 3) and C2 (tier 4) within the first 35 ms, and the `%` lines are on-stack replacement, where the JVM swaps compiled code into a loop that's already running:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+PrintCompilation Warmup | grep Warmup::`,
        },
        {
          type: "output",
          text: `32    6       3       Warmup::collatzSteps (43 bytes)
33    7 %     4       Warmup::collatzSteps @ 2 (43 bytes)
34    8       4       Warmup::collatzSteps (43 bytes)
35    6       3       Warmup::collatzSteps (43 bytes)   made not entrant
53    9 %     3       Warmup::main @ 9 (61 bytes)
54   10       3       Warmup::main (61 bytes)
66   11 %     4       Warmup::main @ 9 (61 bytes)`,
        },
        {
          type: "paragraph",
          text: "This is why long-running services suit the JVM so well: they pay the warm-up once and then run on C2 code for days. A short script spends most of its life in the interpreter.",
        },
        {
          type: "heading",
          text: "Garbage collection, observed",
        },
        {
          type: "paragraph",
          text: "G1 splits the heap into equal regions (the `region size 1024K` in the `jcmd` output) and works generationally: new objects go into young regions, and most of them die young, so collecting young regions often and cheaply recovers most memory. Survivors get promoted to old regions, which G1 cleans up with concurrent marking plus mixed collections.",
        },
        {
          type: "paragraph",
          text: "I wrote a loop that creates 50 million short-lived `Trip` records and ran it with `-Xlog:gc`. The first run surprised me: the log printed `Using G1` and then nothing. No collections at all. The JIT's **escape analysis** had noticed that no `Trip` ever left the loop body and removed the allocation entirely. With escape analysis switched off, the young collections appeared:",
        },
        {
          type: "code",
          language: "java",
          title: "Churn.java",
          code: `public class Churn {
    record Trip(long id, double fare) {}

    public static void main(String[] args) {
        double revenue = 0;
        for (long i = 0; i < 50_000_000; i++) {
            Trip t = new Trip(i, 120.5);   // garbage right after this line
            revenue += t.fare();
        }
        System.out.println("revenue = " + revenue);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx64m -Xlog:gc -XX:-DoEscapeAnalysis Churn`,
        },
        {
          type: "output",
          text: `[0.005s][info][gc] Using G1
[0.077s][info][gc] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 24M->1M(64M) 1.291ms
[0.100s][info][gc] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 38M->1M(64M) 1.014ms
[0.110s][info][gc] GC(2) Pause Young (Normal) (G1 Evacuation Pause) 38M->1M(64M) 0.885ms
...`,
        },
        {
          type: "paragraph",
          text: "Each pause took about a millisecond and brought 38 MB down to 1 MB: almost everything was garbage, and G1 only had to copy the few live objects. That's the generational bet paying off.",
        },
        {
          type: "table",
          headers: ["Collector", "Flag", "When I'd reach for it"],
          rows: [
            ["G1", "default since Java 9", "The general-purpose default: good throughput with pause-time goals (`-XX:MaxGCPauseMillis`, 200 ms by default). The JVM falls back to Serial on very small machines (under 2 CPUs or about 1.8 GB)."],
            ["ZGC", "`-XX:+UseZGC`", "Low-latency services with big heaps. Pauses stay well under a millisecond regardless of heap size. Generational since Java 21 (opt-in there), the default mode in 23, and the only mode since 24."],
            ["Parallel", "`-XX:+UseParallelGC`", "Batch jobs that care about total throughput, not individual pause times."],
            ["Serial", "`-XX:+UseSerialGC`", "Tiny heaps and single-CPU containers."],
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "Benchmark with realistic code. A microbenchmark that allocates objects which never escape may show zero GC because the JIT deleted the allocations. JMH exists for exactly this reason.",
        },
      ],
    },
    {
      title: "Production Usage",
      blocks: [
        {
          type: "paragraph",
          text: "Everything above maps directly to flags and tools I'd actually touch on a service like RideX (Java 21, Spring Boot). Knowing which region failed tells me which knob to reach for.",
        },
        {
          type: "table",
          headers: ["Symptom", "Region", "What I'd look at"],
          rows: [
            ["`OutOfMemoryError: Java heap space`", "Heap", "`-Xmx`, a heap dump (`-XX:+HeapDumpOnOutOfMemoryError`), GC logs with `-Xlog:gc*`"],
            ["`OutOfMemoryError: Metaspace`", "Metaspace", "`-XX:MaxMetaspaceSize`, `jcmd <pid> VM.metaspace`, class loader counts, `-Xlog:class+load`"],
            ["`StackOverflowError`", "JVM stack", "The repeating frames in the stack trace. `-Xss` only as a last resort"],
            ["Slow first minutes after deploy", "Code cache / JIT", "`-XX:+PrintCompilation`, warm-up traffic, CDS or the Java 24+ AOT cache"],
            ["Latency spikes", "Heap / GC", "GC pause times in `-Xlog:gc`, then G1 pause goals or a switch to ZGC"],
          ],
        },
        {
          type: "heading",
          text: "Reproducing each failure",
        },
        {
          type: "paragraph",
          text: "I wanted to see every one of these errors myself rather than memorize their names. Unbounded recursion first:",
        },
        {
          type: "code",
          language: "java",
          title: "Recurse.java",
          code: `public class Recurse {
    static void dive(int n) {
        dive(n + 1);
    }

    public static void main(String[] args) {
        dive(0);
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.StackOverflowError
	at Recurse.dive(Recurse.java:3)
	at Recurse.dive(Recurse.java:3)
	at Recurse.dive(Recurse.java:3)
	...`,
        },
        {
          type: "paragraph",
          text: "With a counter and a `catch`, I could measure how deep the default stack goes. The number wasn't stable: between about 21,000 and 24,000 frames with the default 1 MB stack, and anywhere from 100,000 to 205,000 with `-Xss4m`. JIT-compiled frames are smaller than interpreted ones, so the depth depends on when the JIT kicked in.",
        },
        {
          type: "code",
          language: "java",
          title: "DeepRecursion.java",
          code: `public class DeepRecursion {
    static int depth = 0;

    static void dive() {
        depth++;
        dive();
    }

    public static void main(String[] args) {
        try {
            dive();
        } catch (StackOverflowError e) {
            System.out.println("Stack overflowed at depth " + depth);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java DeepRecursion
java -Xss4m DeepRecursion`,
        },
        {
          type: "output",
          text: `Stack overflowed at depth 22165
Stack overflowed at depth 99988`,
        },
        {
          type: "paragraph",
          text: "Next, a heap that's too small for what the program keeps reachable:",
        },
        {
          type: "code",
          language: "java",
          title: "Hog.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Hog {
    public static void main(String[] args) {
        List<byte[]> chunks = new ArrayList<>();
        while (true) {
            chunks.add(new byte[1024 * 1024]);   // 1 MB, kept reachable
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx32m Hog",
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at Hog.main(Hog.java:8)`,
        },
        {
          type: "paragraph",
          text: "And a Metaspace leak, the classic class-loader leak in miniature. Each new loader defines its own copy of `Helper`, and keeping the `Class` objects reachable keeps every copy's metadata alive:",
        },
        {
          type: "code",
          language: "java",
          title: "LoaderLeak.java",
          code: `import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class LoaderLeak {
    public static void main(String[] args) throws Exception {
        URL[] path = { Path.of("plugins").toUri().toURL() };
        List<Class<?>> kept = new ArrayList<>();
        for (int i = 1; ; i++) {
            // a fresh loader each time = a fresh copy of Helper's metadata
            URLClassLoader loader = new URLClassLoader(path, null);
            kept.add(loader.loadClass("Helper"));
            if (i % 1000 == 0) System.out.println(i + " copies loaded");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -XX:MaxMetaspaceSize=16m LoaderLeak",
        },
        {
          type: "output",
          text: `1000 copies loaded
2000 copies loaded
Exception in thread "main" java.lang.OutOfMemoryError: Metaspace
	...`,
        },
        {
          type: "paragraph",
          text: "Around 2,000 copies of a tiny class filled 16 MB, because each loader brings its own bookkeeping. Real frameworks that generate proxies or reload plugins can do this without anyone writing a loop.",
        },
        {
          type: "callout",
          tone: "note",
          text: "The same tuning matters for the big JVM systems a backend engineer operates rather than writes: a Kafka broker, Elasticsearch, a Spark executor. Sizing their heap and picking their collector is the same JVM knowledge.",
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
              question: "What is the JVM?",
              answer:
                "It's the runtime that executes Java bytecode. It loads `.class` files, verifies them, manages memory and garbage collection, and runs the code with an interpreter plus a JIT compiler.\n\nI'd also say it's two things at once: a specification, and implementations of it like HotSpot, OpenJ9 or GraalVM. On my machine it's literally a shared library, `libjvm.so`, that the `java` launcher loads into its own process.",
            },
            {
              question: "Name the three major subsystems of the JVM.",
              answer:
                "The class loader subsystem, the runtime data areas, and the execution engine. The loaders bring classes in and link and initialize them, the data areas are the memory those classes and their objects live in, and the execution engine actually runs the bytecode through the interpreter and the JIT, with the garbage collector cleaning the heap.\n\nWhen I took a thread dump of an idle program, I could see the execution engine's parts as real threads: `C1 CompilerThread0`, `C2 CompilerThread0`, and a bunch of `G1` threads next to `main`.",
            },
            {
              question: "What is the bytecode verifier, and when does it run?",
              answer:
                "It's the part of the JVM that checks a class's bytecode is safe before any of it runs: the operand stack can't overflow or underflow, every instruction gets the right types, branches land on real instructions, and access rules like `final` and `private` hold.\n\nIt runs during linking, after the class is loaded and before it's initialized. It's the JVM's job, not `javac`'s, and if it fails you get a `VerifyError`. HotSpot trusts the JDK's own boot classes and verifies everything else by default.",
            },
            {
              question: "What's the difference between the JVM specification and a JVM implementation?",
              answer:
                "The specification is the document that says what a JVM must do: the class file format, what every instruction means, how verification, loading, linking and initialization work. An implementation is the actual software that does it.\n\nThe spec leaves a lot open on purpose, like how garbage collection works, how objects are laid out, or whether there's a JIT at all. That's where implementations differ. HotSpot's G1 and ZGC, for example, aren't in the spec anywhere.",
            },
            {
              question: "Name two JVM implementations besides HotSpot.",
              answer:
                "Eclipse OpenJ9, originally IBM's, which is known for a smaller memory footprint and fast startup, and GraalVM, which is built on HotSpot but can use the Graal JIT compiler and adds Native Image for ahead-of-time compiled binaries.\n\nWorth knowing that most distributions people call different JDKs, like Temurin, Corretto or Zulu, all ship HotSpot. They're different builds, not different JVMs.",
            },
            {
              question: "What is the heap used for?",
              answer:
                "It holds every object and array the program creates, and it's shared by all threads. In HotSpot it also holds each class's `java.lang.Class` object, which is where static fields live, and the interned string pool.\n\nIt's the area the garbage collector manages. When a program keeps too much reachable, you get `OutOfMemoryError: Java heap space`. I reproduced that with `-Xmx32m` and a list of 1 MB arrays, and it died within a few dozen iterations.",
            },
            {
              question: "What is the JVM stack used for?",
              answer:
                "Each thread has its own JVM stack, and every method call pushes a frame onto it. A frame holds the method's local variables, an operand stack the bytecode works on, and a link to its class's constant pool. The frame is popped when the method returns.\n\nIf a thread recurses too deep, it throws `StackOverflowError`. With the default 1 MB stack I got about 22,000 frames of a trivial recursive method, and the number changed between runs because compiled frames are smaller than interpreted ones.",
            },
            {
              question: "Is the heap shared across threads, or per thread?",
              answer:
                "Shared. Every thread in the JVM sees the same heap, and so does the method area. The JVM stack, the PC register and the native method stack are per thread.\n\nThat split is basically the root of Java concurrency bugs: a local `int` in a frame can't be touched by another thread, but the object a local variable points to can, because the object is on the heap.",
            },
            {
              question: "What does the execution engine do?",
              answer:
                "It runs the bytecode. It starts with the interpreter, which executes instructions one by one and collects profiling data, then the JIT compilers turn hot methods into native code stored in the code cache. The garbage collector and JNI, the bridge into native code, are usually counted as part of it too.\n\nThe difference is big. I timed the same CPU-bound loop at about 12.8 seconds with `-Xint` (interpreter only) and about half a second with the default tiered JIT.",
            },
            {
              question: "What replaced PermGen in Java 8, and where does it live?",
              answer:
                "Metaspace, and it lives in native memory, outside the Java heap. It holds class metadata: method and field info, bytecode, runtime constant pools.\n\nPermGen was a fixed-size region reserved next to the heap, so apps that loaded a lot of classes hit `OutOfMemoryError: PermGen space`. One correction I had to make in my own notes: the static fields and interned strings that used to be in PermGen didn't move to Metaspace. They went to the heap.",
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
              question: "Name and explain the three phases of linking.",
              answer:
                "Verification checks the bytecode is safe and well-formed. Preparation allocates the class's static fields and sets them to default values like `0` or `null`. Resolution replaces symbolic references in the constant pool, which are just names like `Helper.greet:()Ljava/lang/String;`, with direct references.\n\nThe spec lets resolution be lazy, and HotSpot does it lazily: a reference is resolved the first time an instruction using it runs. That's why a missing class can blow up in the middle of a method rather than at startup.",
            },
            {
              question: "What's the difference between preparation and initialization for static variables?",
              answer:
                "Preparation gives a static field its type's default value. Initialization runs the actual assignments and `static` blocks in source order. No user code runs during preparation.\n\nI proved it to myself with a class where `static int a = readB();` comes before `static int b = 10;` and `readB()` returns `b`. It printed `a = 0`, because when `a`'s initializer ran, `b` only had its prepared default.",
            },
            {
              question: "What is the parent delegation model, and why does it exist?",
              answer:
                "When a class loader is asked for a class, it first checks whether it already loaded it, then asks its parent, and only tries to find the class itself if the parent chain can't. For the built-ins that's application to platform to bootstrap.\n\nIt exists for consistency and safety. Core classes are always defined by the same loader, so there's exactly one `java.lang.String` in the JVM, and code on the class path can't shadow it. Custom loaders get this for free as long as they override `findClass` rather than `loadClass`.",
            },
            {
              question: "Name the three built-in class loaders and their order.",
              answer:
                "Bootstrap, platform and application. Bootstrap is native code inside the JVM and loads `java.base`. Platform loads the other Java SE and JDK modules, like `java.sql`. Application loads my code from the class path or module path.\n\nRequests go bottom-up by delegation, starting at the application loader. When I printed `getParent()` twice from my own class, I got `PlatformClassLoader` and then `null`, the `null` being the bootstrap loader. Before Java 9 the middle one was the extension loader.",
            },
            {
              question: "Why does `String.class.getClassLoader()` return `null`?",
              answer:
                "Because `String` is loaded by the bootstrap loader, and the bootstrap loader isn't a Java object. It's C++ inside the JVM, so there's no `ClassLoader` instance to return, and the API uses `null` to mean \"bootstrap\".\n\nIt doesn't mean the class has no loader. `java.sql.Date`, by comparison, returned the `PlatformClassLoader` when I ran the same check.",
            },
            {
              question: "What's the difference between `ClassNotFoundException` and `NoClassDefFoundError`?",
              answer:
                "`ClassNotFoundException` is a checked exception from code that asks for a class by name, like `Class.forName`, when no loader can find it. `NoClassDefFoundError` is an `Error` from the JVM when a class that was there at compile time can't be found while resolving a reference at runtime.\n\nWhen I deleted `Helper.class` and ran the class that uses it, I got `NoClassDefFoundError: Helper` with `Caused by: java.lang.ClassNotFoundException: Helper` underneath. The other cause people miss is a failed static initializer: the second access gives `NoClassDefFoundError: Could not initialize class ...`.",
            },
            {
              question: "Why is the method area shared across threads while the stack is not?",
              answer:
                "Because they hold different kinds of things. The method area holds class definitions, and a class is loaded once and used by every thread, so duplicating it per thread would be pointless and inconsistent.\n\nA stack holds the state of one thread's method calls: which method it's in, its locals, where to return. Two threads running the same method are at different points with different values, so each needs its own frames. Sharing them would make no sense.",
            },
            {
              question: "What problem did moving from PermGen to Metaspace solve?",
              answer:
                "PermGen had a fixed maximum set by `-XX:MaxPermSize`, and picking it right was guesswork. Apps that loaded lots of classes, or app servers that redeployed web apps and leaked old class loaders, hit `OutOfMemoryError: PermGen space` all the time.\n\nMetaspace uses native memory and grows as needed, and freeing it is tied to class loaders being unloaded. It was also part of merging HotSpot with JRockit, which never had a PermGen. It doesn't fix leaks, it just moves the ceiling. With `-XX:MaxMetaspaceSize=16m` I still got `OutOfMemoryError: Metaspace` after about 2,000 leaked loaders.",
            },
            {
              question: "Why was `main()` traditionally static, and is that still required?",
              answer:
                "It was static because the `java` launcher calls it before any object of the class exists, and it has no general way to construct one. A static method belongs to the class, so the launcher could call it right after loading. `public` was so the launcher could access it from outside.\n\nBut it's the launcher's rule, not the JVM's, and it changed. Since Java 25 (JEP 512) the launcher accepts an instance `main`, a non-public one, and one without `String[] args`. For an instance `main` it creates the object through a non-private no-arg constructor first. On Java 21 a non-static `main` gets \"Main method is not static\" unless preview features are enabled.",
            },
            {
              question: "What does the program counter register do?",
              answer:
                "Each thread has one, and it holds the address of the bytecode instruction that thread is currently executing. When the thread moves to the next instruction, jumps, or returns from a method, the PC changes.\n\nIt's per thread because every thread is at its own point in its own code, and it's what lets the JVM switch between threads and resume each one where it was. While a thread is running a native method, the spec says its value is undefined.",
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
              question: "Walk through the complete JVM startup for a simple HelloWorld, from `java HelloWorld` to exit.",
              answer:
                "The launcher starts, parses options and creates the JVM in-process, which reserves the heap, Metaspace and code cache. The bootstrap loader brings in core classes, mostly from the CDS archive. Then the application loader, after delegating up, loads `HelloWorld.class`, and the class is linked: verified, statics prepared, references resolved lazily.\n\nThe launcher finds `main`, and invoking it initializes the class. The interpreter runs it, and anything hot gets JIT-compiled. When `main` returns and no non-daemon threads are left, shutdown hooks run and the process exits with `0`. With `-Xlog:class+load` I counted over 400 JDK classes loaded before `HelloWorld` itself showed up.",
            },
            {
              question: "How does the JVM stop malicious code from overriding core classes like `java.lang.String`?",
              answer:
                "There are a few layers. Parent delegation means a request for `java.lang.String` reaches the bootstrap loader first, and it always wins. `ClassLoader.defineClass` also refuses to define any class in a `java.*` package from a non-platform loader and throws a `SecurityException` for a prohibited package name.\n\nSince Java 9 the module system adds another wall: `java.lang` belongs to `java.base`, and I couldn't even compile a class declared in `package java.lang`. `javac` said \"package exists in another module: java.base\".",
            },
            {
              question: "Why is bytecode verification needed if `javac` already checked the source?",
              answer:
                "Because the JVM has no idea where a `.class` file came from. It could be from `javac`, from another language's compiler, from a bytecode library like ASM that a framework used at runtime, or hand-edited by someone with bad intentions.\n\n`javac`'s checks are about the source. The verifier checks the actual bytes that are about to run, and that's the only check the JVM can trust. Without it, a crafted class could treat an `int` as an object reference and read arbitrary memory.",
            },
            {
              question: "How can Kotlin, Scala and Groovy all run on the same JVM?",
              answer:
                "The JVM never sees source code. It only sees class files, and it doesn't care which compiler wrote them as long as they're valid and pass verification. Kotlin, Scala and Groovy compilers all emit standard bytecode.\n\nEach language ships its own runtime library for its extra features, but at the bytecode level a Kotlin class is just a class. That's also why Kotlin can call Java libraries and the other way around with no conversion: they're calling methods on the same kind of class, in the same JVM.",
            },
            {
              question: "What would you look at for a heap `OutOfMemoryError` versus a Metaspace one?",
              answer:
                "The message tells me which one I have. For `Java heap space` I'd check `-Xmx` against the container limit, make sure `-XX:+HeapDumpOnOutOfMemoryError` is on, and open the dump to see what's retaining memory. GC logs from `-Xlog:gc*` show whether the old generation was growing steadily, which points at a leak, or spiked, which points at one big request.\n\nFor `Metaspace` I'd look at `-XX:MaxMetaspaceSize`, run `jcmd <pid> VM.metaspace` or `-Xlog:class+load`, and watch the class and class loader counts. A count that keeps climbing usually means class loaders aren't being released: proxies generated per request, or plugins reloaded without closing the old loader.",
            },
            {
              question: "How does the stack-per-thread, shared-heap split relate to thread safety?",
              answer:
                "Anything that lives only in a stack frame, primitive locals and references that never escape the method, is thread-confined by construction. Nothing else can see it. Everything on the heap can be reached by any thread that has a reference, and that's where race conditions and visibility problems come from.\n\nThat's also why a static counter like `tripCount++` is dangerous under concurrency: it's one field in the `Class` object on the heap, and `++` is a read, an add and a write. Two threads can interleave those and lose an update.",
            },
            {
              question: "What is `invokedynamic`, and why was it added?",
              answer:
                "It's a bytecode instruction added in Java 7 (JSR 292) whose call target isn't fixed at compile time. The first time it runs, it calls a bootstrap method that returns a `CallSite`, and the JVM links the instruction to that. After that it can be inlined like any normal call.\n\nIt was added so dynamic languages like JRuby and Groovy could do their own method dispatch efficiently. Java itself now leans on it: when I ran `javap -c -p` on a tiny class with a lambda and a string concatenation, I found two `invokedynamic` instructions, one to `run` for the lambda and one to `makeConcatWithConstants` for the `+`.",
            },
            {
              question: "Compare interpreter-only execution with JIT-assisted execution over a program's lifetime.",
              answer:
                "Interpreter-only is flat: it starts fast but every execution of a method costs the same, and it never gets faster. With the JIT, the curve starts at interpreter speed, then climbs as C1 and then C2 compile the hot code, and stays at near-native speed.\n\nI measured it with one loop: about 12.8 seconds with `-Xint`, 3.1 seconds with C1 only, and around 0.5 seconds with full tiered compilation. `-XX:+PrintCompilation` showed the hot method reaching C2 in about 35 milliseconds. The trade-off is warm-up time, compiler threads using CPU, and code cache memory.",
            },
            {
              question: "Why are custom class loaders used for plugin architectures, and what are the risks?",
              answer:
                "Because each loader is its own namespace. Give every plugin its own loader and plugins can ship different versions of the same library, and you can unload a plugin by dropping every reference to its loader. App servers and IDEs use this to isolate and hot-reload modules.\n\nThe risks are real, though. Loaded code runs with the application's full permissions, and the Security Manager that used to sandbox it is deprecated for removal since Java 17, so plugins need to be trusted. The same class loaded by two loaders is two different classes: I got \"Cannot cast Helper to Helper\" that way. And a single stray reference to a plugin's class keeps its whole loader and all its metadata alive, which ends in `OutOfMemoryError: Metaspace`.",
            },
            {
              question: "Explain the exact relationship between the JVM, JRE and JDK.",
              answer:
                "The JVM executes bytecode. The JRE is a JVM plus the Java class library (`java.base` and the other modules) and the `java` launcher: everything needed to run a program. The JDK is the JRE plus development tools like `javac`, `javap`, `jar`, `jlink` and `jcmd`.\n\nOne thing that's changed: Oracle and OpenJDK stopped shipping a separate JRE with Java 11. Some vendors like Temurin still publish JRE builds, but the modern approach is to use `jlink` to build a trimmed runtime with just the modules your app needs.",
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
              question: "Your production service throws `OutOfMemoryError: Metaspace`. What does it tell you and what do you investigate?",
              answer:
                "It tells me the problem is class metadata, not objects, so raising `-Xmx` won't help. Either the service genuinely needs more classes than the cap allows, or something keeps loading classes and never lets them go.\n\nI'd first check whether `-XX:MaxMetaspaceSize` is set unusually low. Then I'd watch the loaded class count over time with `jcmd <pid> VM.metaspace` or `jstat -class`. If it keeps growing, it's a leak: often a library generating a new proxy or serializer class per request, or a class loader that's been replaced but is still referenced from a thread, a cache or a `ThreadLocal`. A heap dump shows which loaders are alive and who's holding them.",
            },
            {
              question: "A teammate builds a plugin system that loads classes at runtime. Which JVM subsystem handles this, and what are the security implications?",
              answer:
                "The class loader subsystem. They'd typically create a `URLClassLoader` or a custom subclass per plugin, and the JVM then links and verifies those classes like any other before running them.\n\nVerification only guarantees the bytecode is well-formed. It says nothing about intent. A plugin can read files, open sockets or call `System.exit`, and there's no Security Manager sandbox to rely on in modern Java. So I'd only load signed or otherwise trusted plugins, keep them in separate loaders, expose a narrow interface from the parent loader, and make sure unloading actually releases the loader so we don't slowly fill Metaspace.",
            },
            {
              question: "A `NoClassDefFoundError` only happens in production, never locally. What's the most likely cause?",
              answer:
                "Almost always a classpath difference. The class was there when the code compiled and on my laptop, but the production artifact is missing a JAR, has an older version of a dependency without that class, or has two conflicting versions and the wrong one wins. Resolution is lazy, so it only fails when that code path actually runs.\n\nThe second thing I'd check is the full log for an earlier `ExceptionInInitializerError`. If the message says \"Could not initialize class\", the class is present but its static initializer failed, often on a config value or environment variable that exists locally and not in production.",
            },
            {
              question: "Someone asks why Kotlin can call Java libraries directly with no conversion. How do you explain it?",
              answer:
                "Both compile to the same class file format and run on the same JVM, so once compiled there's no \"Kotlin class\" and \"Java class\" at runtime. There are just classes, loaded by the same loaders, with methods invoked by the same bytecode instructions like `invokevirtual`.\n\nKotlin's compiler reads Java class files to know what methods exist, and Java code sees Kotlin classes the same way. The only friction is at the language level, things like nullability or default arguments, which Kotlin handles with annotations such as `@JvmOverloads`. The JVM itself doesn't know or care.",
            },
            {
              question: "A junior developer asks: \"Why can't I skip bytecode verification for my own trusted code to make startup faster?\" How do you respond?",
              answer:
                "The flags for that, `-Xverify:none` and `-noverify`, have been deprecated since JDK 13. When I tried it on JDK 21, the JVM printed a deprecation warning before running anything. Turning verification off means a bad class file, say from a buggy bytecode-generating library, can crash the JVM or corrupt memory instead of failing cleanly with a `VerifyError`.\n\nAnd the gain is small, because the JDK's own classes already skip it and CDS archives store classes that were verified ahead of time. If startup matters, I'd point them to AppCDS or the Java 24+ AOT cache, which save the loading and linking work without giving up the safety check.",
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
            "Write `Dog.java` with a `static int count` field, a `static {}` block that prints \"Dog class initialized\", and a constructor that increments `count`.",
            "In a separate `ZooApp.java`, print \"before\", create a `Dog[] kennel = new Dog[3]`, print \"array created\", then create two `Dog` objects and print `Dog.count`.",
            "Predict the order of the output lines before you run it. Then run `java -Xlog:class+load ZooApp | grep -E \"Dog|ZooApp|before|array\"` and check when `Dog` is loaded versus initialized.",
            "Print `Dog.class.getClassLoader()` and `Object.class.getClassLoader()` and explain both results.",
            "Run it again with `-Xmx8m` and `-Xss256k`. Nothing should change, and it's worth understanding why.",
          ],
        },
        {
          type: "paragraph",
          text: "What I got: `Dog` is loaded when the array is created but the \"initialized\" line only prints right before the first constructor call, and the loaders print as `AppClassLoader` and `null`. The limits in the last step don't matter because the program keeps two tiny objects alive and never recurses.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `JVM        spec + implementations (HotSpot, OpenJ9, GraalVM)

SUBSYSTEMS 1. Class loaders:  load ─► link ─► initialize
           2. Data areas:     heap, metaspace, code cache,
                              stack, PC, native stack
           3. Exec engine:    interpreter, C1/C2 JIT, GC

LINKING    verify  = bytecode is safe (JVM's job, not javac's)
           prepare = statics get defaults (0, false, null)
           resolve = constant-pool names ─► real refs (lazy)
INIT       statics get real values, static blocks run,
           only on first active use

LOADERS    Bootstrap (null) ◄── Platform ◄── Application
           ask parent first; class identity = name + loader

MEMORY     shared:     heap (objects, Class + statics,
                       interned strings), metaspace (class
                       metadata only), code cache
           per thread: JVM stack, PC register, native stack
           PermGen removed in Java 8

GC         G1 default since 9; ZGC generational-only since 24
ENTRY      launcher finds main; Java 25 allows instance main`,
          caption: "The one-screen version I'd want the night before an interview.",
        },
        {
          type: "list",
          items: [
            "Loading, linking and initialization are separate events, and HotSpot does most of them lazily.",
            "Metaspace is class metadata only. Static fields and interned strings are on the heap.",
            "Every `OutOfMemoryError` and `StackOverflowError` names the region that ran out. Read it before tuning anything.",
            "The JIT is where Java's speed comes from, and warm-up is its price.",
          ],
        },
      ],
    },
  ],
};
