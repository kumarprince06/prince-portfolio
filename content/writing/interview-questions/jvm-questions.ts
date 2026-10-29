import type { Lesson } from "../types";

export const jvmQuestions: Lesson = {
  slug: "jvm-interview-questions",
  date: "2026-10-29",
  title: "JVM and Memory Interview Questions",
  description: "JVM interview questions on architecture, class loading, heap, stack and metaspace, garbage collectors from Serial to ZGC, memory leaks, references and JIT tiers. It also covers diagnosing out-of-memory errors and CPU spikes, and running the JVM in containers.",
  tags: [
    "Interview",
    "Java",
    "JVM",
    "Memory",
    "Garbage Collection",
  ],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These are the JVM and memory questions I get asked, written the way I'd answer them out loud. Try answering each one yourself before you open it. A ⭐ marks the ones that come up most often.",
        },
        {
          type: "paragraph",
          text: "Every answer starts with a simple picture, then the internals. The last few sections are the practical ones: finding a memory leak, an out-of-memory error or a CPU spike in a running app, and running Java safely in containers.",
        },
      ],
    },
    {
      title: "JDK, JRE and JVM",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ JDK vs JRE vs JVM?",
              answer: "Think of a car. The **JVM** is the engine: it runs bytecode. The **JRE** is the whole car you can drive: the JVM plus the standard libraries (`java.lang`, `java.util` and so on), enough to run an app. The **JDK** is the car plus the garage tools: the JRE plus `javac`, `jar`, `javadoc`, `jshell`, `jcmd`, `jstack` and friends, enough to build apps.\n\nSince Java 11 Oracle no longer ships a separate JRE download; I either ship the full JDK or build a slim runtime with `jlink`. A typical Docker setup builds with a JDK image and runs on a smaller JRE-style image.",
            },
            {
              question: "What does \"write once, run anywhere\" really mean?",
              answer: "`javac` doesn't compile to machine code for my CPU. It compiles to bytecode, a portable instruction set for an imaginary machine, stored in `.class` files. Each platform has its own JVM that understands bytecode, so the same `.jar` runs on Linux, Windows or a Mac with no recompiling. Like a recipe written in a common language, and each kitchen's cook knows how to follow it with the local stove.",
            },
            {
              question: "What is bytecode, and how can I look at it?",
              answer: "The instruction set of the JVM: compact, stack-based instructions like `iload`, `iadd`, `invokevirtual` and `areturn`, stored in `.class` files with a constant pool of names and literals. `javap -c -p MyClass` prints it. I use it to answer \"what does this really compile to?\" questions, like string concatenation, autoboxing, lambdas or a string `switch`.",
            },
            {
              question: "Is the JVM an interpreter or a compiler?",
              answer: "Both. It starts by interpreting bytecode one instruction at a time, which starts quickly but runs slowly. It watches which code runs often, and the JIT compiler turns that hot code into optimised native machine code. Long-running server code mostly runs as native code after warm-up.",
            },
          ],
        },
      ],
    },
    {
      title: "JVM Architecture",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What does the JVM architecture look like?",
              answer: "Three main parts. The **class loader subsystem** finds `.class` files and loads, links and initialises them. The **runtime data areas** are the memory: the heap, metaspace, and per-thread stacks, PC registers and native method stacks. The **execution engine** runs the code: the interpreter, the JIT compilers and the garbage collector.\n\nAround them sits JNI, the bridge to native C or C++ libraries.",
            },
          ],
        },
        {
          type: "diagram",
          text: "  .class files\n       |\n       v\n  CLASS LOADER SUBSYSTEM\n     load -> link (verify, prepare, resolve) -> initialise\n       |\n       v\n  RUNTIME DATA AREAS\n     shared by all threads : HEAP (objects)   METASPACE (class metadata)\n     one per thread        : JVM STACK   PC REGISTER   NATIVE METHOD STACK\n       |\n       v\n  EXECUTION ENGINE\n     interpreter  |  JIT (C1, C2)  |  garbage collector\n       |\n       v\n  JNI  ->  native libraries",
          caption: "The JVM at a glance",
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ What are the runtime data areas?",
              answer: "The **heap** is shared by all threads and holds every object and array. The GC manages it.\n\n**Metaspace** (since Java 8) holds class metadata: class structures, method bytecode, and the runtime constant pool. It's in native memory, outside the heap.\n\nEach thread gets its own **JVM stack** of frames, one per method call, holding local variables, the operand stack and a link back to the class's constant pool. Each thread also has a **PC register** (which instruction it's on) and a **native method stack** for native code.\n\nWhere things live surprises people: interned strings and static field values live in the heap (since Java 7/8), while the class description itself lives in metaspace.",
            },
          ],
        },
      ],
    },
    {
      title: "Heap and Stack",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Heap vs stack?",
              answer: "The stack is a waiter's personal order pad: each method call adds a page with its local notes, and the page is torn off when the method returns. It's private to the thread, fast, and cleaned up automatically. The heap is the restaurant's shared storeroom: everyone puts things there and picks them up, and a cleaner (the GC) clears what nobody needs any more.\n\nIn `Order order = new Order();` inside a method, the reference `order` lives in the stack frame and the `Order` object lives on the heap. Primitive local variables live entirely on the stack. Too-deep recursion overflows the stack (`StackOverflowError`); too many live objects fill the heap (`OutOfMemoryError`).",
            },
            {
              question: "Are objects always allocated on the heap?",
              answer: "Logically yes, but the JIT can avoid it. With escape analysis, if it proves an object never leaves the method (isn't returned, stored in a field or passed to another thread), it can replace the object with plain local variables (scalar replacement), so no heap allocation happens at all. That's why small short-lived objects in hot loops are cheaper than they look.",
            },
            {
              question: "What are `-Xms`, `-Xmx` and `-Xss`?",
              answer: "`-Xms` is the initial heap size, `-Xmx` the maximum heap size, and `-Xss` the stack size per thread. Setting `-Xms` equal to `-Xmx` on servers avoids resizing the heap at runtime. In containers I prefer percentage flags, covered below.",
            },
            {
              question: "⭐ `StackOverflowError` vs `OutOfMemoryError`?",
              answer: "`StackOverflowError` means one thread's stack ran out of room, almost always unbounded or very deep recursion, like a recursive method without a proper base case. Its stack trace shows the same few frames repeating.\n\n`OutOfMemoryError` means the JVM couldn't get memory it needed: usually heap, sometimes metaspace, native threads or direct buffers. Both are `Error`s, so I don't catch them to carry on; I fix the cause.",
            },
            {
              question: "How is a new object allocated so fast?",
              answer: "Each thread gets its own chunk of Eden called a TLAB (thread-local allocation buffer). Allocating is just \"bump the pointer\": the next object goes right after the previous one, with no lock and no searching for free space. Like each cashier having their own roll of receipt paper and tearing off the next piece. Only when the TLAB is full does the thread ask for a new one. That's why creating short-lived objects in Java is so cheap.",
            },
            {
              question: "What does an object look like in memory?",
              answer: "A header, then the fields. The header has the mark word (hash code, lock state and GC age bits) and a pointer to the object's class; arrays also store their length. Fields are laid out and padded to 8-byte alignment. So on a 64-bit JVM even an empty object takes about 16 bytes, and an `Integer` is 16 bytes for a 4-byte value, which is why a `List<Integer>` costs far more memory than an `int[]`. JOL (Java Object Layout) prints exact layouts.",
            },
            {
              question: "What are compressed oops?",
              answer: "On a 64-bit JVM a reference would normally be 8 bytes. With heaps under about 32 GB, the JVM stores references as 32-bit offsets and scales them by 8 (objects are 8-byte aligned), so references take 4 bytes. That's on by default and saves a lot of memory. The surprise: going from a 31 GB heap to a 33 GB heap can leave less usable room, because references double in size.",
            },
          ],
        },
      ],
    },
    {
      title: "Metaspace",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Metaspace vs PermGen?",
              answer: "Before Java 8, class metadata lived in PermGen, a fixed-size part of the heap. Apps that loaded many classes, or redeployed often in an app server, hit `OutOfMemoryError: PermGen space`.\n\nJava 8 replaced it with Metaspace in native memory, which grows as needed. Interned strings and static values had already moved to the normal heap. Metaspace can still run out: a class-loader leak, or a library generating classes in a loop, eats native memory until `OutOfMemoryError: Metaspace`. So I set `-XX:MaxMetaspaceSize` on servers.",
            },
          ],
        },
      ],
    },
    {
      title: "Class Loading",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What happens when a class is loaded?",
              answer: "Three phases.\n\n**Loading:** a class loader finds the `.class` bytes (in a jar, a directory, or generated on the fly) and creates a `Class` object.\n\n**Linking**, in three steps. **Verification** checks the bytecode is safe and well-formed: no stack overflows, no jumps into the middle of nowhere, correct types. **Preparation** allocates static fields and sets them to default values (0, null, false). **Resolution** turns symbolic references like \"the method `Order.total`\" into direct references, often lazily on first use.\n\n**Initialisation:** runs the static initialisers and `static { }` blocks, in source order, exactly once, with the JVM holding a lock so two threads can't initialise the same class twice.\n\nClasses are loaded lazily, the first time they're really used.",
            },
            {
              question: "⭐ What are the built-in class loaders, and how does parent delegation work?",
              answer: "Three built-in loaders. The **Bootstrap** loader is native code and loads the core JDK classes (`java.lang.*` and so on). The **Platform** loader (called the Extension loader before Java 9) loads other JDK modules. The **Application** (system) loader loads my classpath and module path.\n\nParent delegation: when a loader is asked for a class, it first asks its parent, and only loads the class itself if the parent can't. Like a junior employee who checks with the manager before acting. That means `java.lang.String` always comes from Bootstrap, so nobody can sneak in a fake `String` on the classpath, and each core class is loaded only once.",
            },
            {
              question: "When is a class initialised?",
              answer: "On first active use: creating an instance (`new`), calling a static method, reading or writing a static field that isn't a compile-time constant, reflection like `Class.forName`, initialising a subclass (the parent goes first), or being the main class.\n\nNot on: reading a `static final` compile-time constant (it's inlined into the caller), declaring an array of the type, or referring to `Order.class`. This lazy, locked initialisation is exactly what makes the holder-idiom singleton thread-safe without any `synchronized`.",
            },
            {
              question: "How can the same class be loaded twice?",
              answer: "By two different class loaders. A class's identity at runtime is its name plus the loader that defined it. So `com.app.Order` loaded by two loaders is two different classes, and casting one to the other throws a `ClassCastException` that says \"Order cannot be cast to Order\". App servers and plugin systems use separate loaders on purpose to isolate apps, and break parent-first delegation to do it.",
            },
          ],
        },
      ],
    },
    {
      title: "Garbage Collection Basics",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ How does the GC decide what is garbage?",
              answer: "Reachability, not reference counting. It starts from GC roots: local variables in live stack frames, static fields, active threads, JNI references and a few JVM internals. It marks everything it can reach by following references. Anything not marked is garbage, even two objects pointing at each other, which is why cycles aren't a problem in Java.\n\nLike cleaning out a shared fridge: anything with a name tag from someone still in the office stays; everything else gets thrown out.",
            },
            {
              question: "⭐ What are the heap generations, and why are there generations?",
              answer: "Most objects die young: a request's temporary strings and DTOs are garbage within milliseconds. So the heap is split.\n\nThe **young generation** has Eden, where new objects are born, and two survivor spaces. A **minor GC** copies the few live objects out of Eden into a survivor space and wipes Eden in one go. That's cheap, because it only touches the survivors. Each object has an age; after surviving enough minor GCs (up to 15 by default), it's promoted to the **old generation**. A **major** or **full GC** cleans the old generation, which is bigger and more expensive.\n\nCopying only the few survivors is far cheaper than scanning everything, and that's the whole point of generations.",
            },
            {
              question: "What is a stop-the-world pause?",
              answer: "A moment where the GC stops all application threads to do some of its work safely, at a safepoint. Users see it as latency spikes. Modern collectors do most of their marking and even moving concurrently, while the app keeps running, and keep the stop-the-world parts very short.",
            },
            {
              question: "What is a safepoint?",
              answer: "A point in the code where a thread's state is fully known, so the JVM can safely pause it: between bytecodes in the interpreter, and at method returns and loop back-edges in compiled code. Stop-the-world work (some GC phases, deoptimisation, thread dumps) waits until every thread reaches one. A long counted loop without a safepoint check could delay everyone (much rarer since JDK 10 added loop strip mining), which shows up as \"time to safepoint\" in the logs.",
            },
            {
              question: "How does the young GC avoid scanning the whole old generation?",
              answer: "Old objects can point to young ones, and those references are GC roots for a young collection. Rather than scanning the entire old generation each time, the JVM records old-to-young references as they're written, using a write barrier and a card table (remembered sets in G1). The young GC scans only those dirty cards.",
            },
            {
              question: "Can I force a garbage collection?",
              answer: "`System.gc()` is only a request, and the JVM may ignore it, especially with `-XX:+DisableExplicitGC`. With G1 it usually triggers a full GC, which is the opposite of what I want in production. If code needs `System.gc()` to work, the real problem is somewhere else.",
            },
          ],
        },
      ],
    },
    {
      title: "Garbage Collectors",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Which garbage collectors does the JVM have?",
              answer: "**Serial** is single-threaded and stop-the-world: fine for small heaps and tiny containers.\n\n**Parallel** uses many threads, still stop-the-world, and aims for maximum throughput: batch jobs that don't care about pauses.\n\n**G1** (Garbage-First) has been the default since Java 9. It splits the heap into many equal regions and collects the regions with the most garbage first, aiming for a pause target (200 ms by default, set with `-XX:MaxGCPauseMillis`).\n\n**ZGC** and **Shenandoah** do almost all their work concurrently, with pauses usually under a millisecond, even on very large heaps. Generational ZGC (Java 21+) is a strong choice for latency-sensitive services.\n\nOne surprise: on a machine or container with under 2 CPUs or under about 1.8 GB of memory, the JVM picks Serial by default instead of G1.",
            },
            {
              question: "How does G1 work?",
              answer: "The heap is cut into many equal regions (1 to 32 MB each), and each region is dynamically Eden, survivor, old or humongous (for very big objects). Young collections evacuate live objects from Eden and survivor regions. A concurrent marking cycle works out how much garbage each old region holds, and mixed collections then clean the young regions plus the old regions with the most garbage, as many as fit in the pause target.\n\nLike a cleaning crew that only has 10 minutes: it starts with the messiest rooms first.",
            },
            {
              question: "What is a humongous object in G1?",
              answer: "An object at least half a region in size, like a huge array or a big byte buffer. G1 puts it directly into one or more contiguous old regions, skipping the young generation. Lots of them fragment the heap and can trigger extra collections. A bigger region size (`-XX:G1HeapRegionSize`) or smaller buffers help.",
            },
            {
              question: "How do I choose a garbage collector?",
              answer: "By what matters most: throughput, latency or footprint. For a batch job that only cares about total runtime, Parallel. For a general web service, G1, the default, and usually fine. For latency-sensitive services with big heaps, where a 200 ms pause is a problem, ZGC (generational in Java 21+) or Shenandoah. For a tiny container with one CPU, Serial is the honest choice. I change the collector only after GC logs show a real problem.",
            },
            {
              question: "How does ZGC get pauses under a millisecond?",
              answer: "It does marking, relocation (moving objects) and reference fixing while the application runs. It uses coloured pointers (metadata bits in the reference itself) and load barriers: small checks the JIT adds to every reference load, so if the app touches an object that has moved, the barrier fixes the reference on the spot. The pauses only scan thread stacks, so they don't grow with the heap size.",
            },
          ],
        },
      ],
    },
    {
      title: "References and Memory Leaks",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Can Java have memory leaks?",
              answer: "Yes. The GC only frees unreachable objects; a leak is something I keep reachable by accident.\n\nThe usual suspects: static collections that only grow, like a `static Map` used as a \"cache\" with no eviction. Caches with no size limit or expiry. `ThreadLocal` values never removed in thread pools. Listeners and callbacks registered and never unregistered. Inner classes and lambdas holding a hidden reference to a big outer object. Mutable `HashMap` keys whose hash changed. Unclosed streams and connections. And class-loader leaks on redeploy.\n\nIt's like a lost-and-found box nobody ever empties. Each item is small, but after months the room is full.",
            },
            {
              question: "What are strong, soft, weak and phantom references?",
              answer: "**Strong** is a normal reference: the object stays as long as it's reachable.\n\n**Soft** (`SoftReference`): the GC clears it only when memory is running low. It's used for memory-sensitive caches, though a proper cache library with a size limit is usually more predictable.\n\n**Weak** (`WeakReference`): cleared at the next GC once no strong references remain. `WeakHashMap` uses weak keys, and `ThreadLocalMap` uses weak keys too.\n\n**Phantom** (`PhantomReference`): `get()` always returns null. It's only used to learn that an object has been collected, so cleanup can run; that's what `Cleaner` is built on, replacing `finalize()`.",
            },
          ],
        },
      ],
    },
    {
      title: "JIT Compilation",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What does the JIT compiler do?",
              answer: "It turns hot bytecode into native machine code at runtime. Code starts out interpreted. The JVM counts method calls and loop iterations, and when a method gets hot, it's compiled.\n\nTiered compilation uses two compilers. **C1** compiles quickly with light optimisation and adds profiling. **C2** recompiles the really hot code with aggressive optimisations, using the profile it collected: inlining small methods into their callers, escape analysis, loop unrolling, removing bounds checks, and betting on the common case (like \"this call site always sees an `ArrayList`\").\n\nIf a bet turns out wrong, for example a new subclass shows up, the JVM deoptimises that code back to the interpreter and compiles it again later. That's why a fresh app is slower for its first requests and load tests need a warm-up phase.",
            },
            {
              question: "What are the JIT tiers?",
              answer: "Tier 0 is the interpreter. Tiers 1 to 3 are C1, with no, light and full profiling. Tier 4 is C2, fully optimised. Typical hot code goes 0 to 3 to 4. Tools like `-XX:+PrintCompilation` show methods moving between tiers. GraalVM also offers ahead-of-time native images, trading peak optimisation for instant start-up.",
            },
            {
              question: "What is method inlining, and why does it matter so much?",
              answer: "Replacing a call with the body of the called method. A getter like `order.total()` becomes a direct field read, with no call overhead. More importantly, once the code is inlined the JIT sees the bigger picture and can apply other optimisations across it, like escape analysis. That's why small methods cost nothing in hot paths and I shouldn't avoid them for speed.",
            },
          ],
        },
      ],
    },
    {
      title: "Diagnosing Problems",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ How do I diagnose an `OutOfMemoryError`?",
              answer: "First read the message, because it says which memory ran out. \"Java heap space\" means too many live objects or a heap that's too small. \"GC overhead limit exceeded\" means the JVM spends almost all its time in GC and frees almost nothing. \"Metaspace\" means classes. \"unable to create native thread\" means too many threads or an OS limit. \"Direct buffer memory\" means off-heap NIO buffers.\n\nFor heap problems, run with `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps` so the JVM writes a heap dump at the moment it dies, or take one with `jcmd <pid> GC.heap_dump`. Open it in Eclipse MAT or VisualVM and look at the dominator tree and the leak suspects report: the biggest retained objects and the reference chain that keeps them alive. Usually that's one map or list holding millions of entries.\n\nThen decide: if memory grows with load and flattens out, the heap is just too small. If it climbs forever, even when idle, it's a leak.",
            },
            {
              question: "How do I find the cause of high CPU?",
              answer: "Find the busy thread, then see what it's doing. `top -H -p <pid>` shows threads by CPU. Convert the hot thread's ID to hex, take a thread dump with `jstack <pid>` (or `jcmd <pid> Thread.print`), and search for that hex ID as `nid=0x...`. Its stack trace shows the code that's burning CPU.\n\nA few dumps a few seconds apart show whether it's always in the same place. Common causes: an infinite loop, a runaway regex (catastrophic backtracking), a huge sort or JSON serialisation, or the GC itself. If the hot threads are GC threads, it's really a memory problem. A profiler like async-profiler gives a flame graph, which is even quicker to read.",
            },
            {
              question: "Which JDK tools should I know for troubleshooting?",
              answer: "`jps` lists Java processes. `jcmd` is the Swiss army knife: thread dumps, heap dumps, GC info, flags and native memory. `jstack` gives thread dumps. `jmap` gives heap histograms and dumps. `jstat -gcutil` shows live GC statistics. JDK Flight Recorder (`-XX:StartFlightRecording`) records low-overhead profiling data in production, viewed in JDK Mission Control. GC logs (`-Xlog:gc*`) show every collection and its pause.",
            },
            {
              question: "How do I read GC logs and spot trouble?",
              answer: "I look at pause times, how often GCs run, and how much the old generation holds after each collection. Healthy: young GCs are frequent and short, and old-generation occupancy after a collection stays flat. Trouble: the old generation's after-GC level keeps climbing (a leak), full GCs that free almost nothing (heap too small or a leak), or long pauses (heap too big for the collector, or the wrong collector).",
            },
            {
              question: "How much memory does a Java process use besides the heap?",
              answer: "Quite a lot, which is why `-Xmx` is not the container size. Add metaspace, the code cache for JIT-compiled code, thread stacks (each thread reserves its stack), GC bookkeeping, direct NIO buffers, and native libraries. Native Memory Tracking (`-XX:NativeMemoryTracking=summary`, then `jcmd <pid> VM.native_memory summary`) shows the breakdown.",
            },
          ],
        },
      ],
    },
    {
      title: "JVM in Containers",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How should I set memory for a JVM in a Docker or Kubernetes container?",
              answer: "Modern JVMs (10+, and 8u191+) read the container's memory and CPU limits instead of the whole host's. Rather than a fixed `-Xmx`, I use `-XX:MaxRAMPercentage=75.0`, so the heap is 75% of whatever memory the container gets, leaving room for metaspace, threads, code cache and native memory.\n\nIf the heap is set too close to the limit, the container's total memory crosses it and the kernel's OOM killer ends the process with exit code 137. There's no Java error or heap dump at all, just a dead pod, which confuses people. So a container that keeps dying with 137 usually needs more headroom outside the heap, not a bigger heap.",
            },
            {
              question: "What else matters for the JVM in containers?",
              answer: "CPU limits: the JVM sizes GC threads, the common `ForkJoinPool` and the JIT compiler threads from the CPU count it sees, and with fewer than 2 CPUs it picks the Serial GC. `-XX:ActiveProcessorCount` overrides what it sees.\n\nStart-up time: Class Data Sharing (CDS/AppCDS) and newer projects like CRaC and Leyden cut start-up, and GraalVM native images start in milliseconds. And always set heap-dump-on-OOM to a mounted volume, otherwise the dump vanishes with the container.",
            },
          ],
        },
      ],
    },
    {
      title: "Quick Revision",
      blocks: [
        {
          type: "diagram",
          text: "JDK  = JRE + tools (javac, jcmd, jstack)      JRE = JVM + libraries\nJVM  = class loader + runtime data areas + execution engine (interp, JIT, GC)\n\nMEMORY      heap (objects, shared) | metaspace (classes, native) |\n            per thread: stack frames, PC register, native stack\n            ref on stack, object on heap; escape analysis may skip the heap\n\nLOADING     load -> link (verify, prepare defaults, resolve) -> initialise once\nLOADERS     Bootstrap -> Platform -> Application, parent asked first\n            class identity = name + loader\n\nGC          reachable from roots (stacks, statics, threads, JNI) = alive\n            Eden -> survivor -> old (age); minor = cheap copy, full = expensive\n            Serial | Parallel (throughput) | G1 default (regions, pause goal)\n            ZGC / Shenandoah (concurrent, < 1 ms)\nREFS        strong | soft (low memory) | weak (next GC) | phantom (cleanup)\nLEAKS       static maps, unbounded caches, ThreadLocal, listeners, inner classes\n\nJIT         interpreter -> C1 (fast, profiles) -> C2 (inline, escape analysis)\n            deoptimise when a bet breaks; warm up before load tests\n\nOOM         read the message; -XX:+HeapDumpOnOutOfMemoryError; MAT dominator tree\nHIGH CPU    top -H -> hex tid -> jstack nid=0x... ; repeat a few dumps\nCONTAINER   -XX:MaxRAMPercentage=75; exit 137 = killed by the kernel, no Java error",
          caption: "JVM in one screen",
        },
      ],
    },
  ],
};
