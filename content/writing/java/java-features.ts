import type { Lesson } from "../types";

export const javaFeatures: Lesson = {
  slug: "java-features",
  date: "2026-08-16",
  title: "Features of Java",
  description:
    "The ten classic features of Java, what problem each one solves, and what each looks like when you actually run code: bytecode versions, bounds checks, fixed-size types, threads, virtual threads, the JIT and runtime class loading.",
  tags: ["Core Java", "JVM", "Multithreading", "Fundamentals"],
  sections: [
    {
      title: "Why the Features Matter",
      blocks: [
        {
          type: "paragraph",
          text: "The first lesson covered what Java is, and the second how it evolved. This one answers a narrower question: which characteristics make Java feel like Java, and why was each one a deliberate design decision rather than an accident?",
        },
        {
          type: "paragraph",
          text: "\"What are the features of Java?\" is one of the most common opening interview questions. Reciting \"simple, secure, portable, robust\" doesn't get you far. What an interviewer wants to hear is what problem each feature solves and where it lives: in the language, in `javac`, in the JVM or in the standard library. Those are the notes I wrote for myself.",
        },
        {
          type: "callout",
          tone: "note",
          text: "Most of these words come from Sun's 1995 white paper, which described Java as \"simple, object-oriented, distributed, interpreted, robust, secure, architecture-neutral, portable, high-performance, multithreaded, and dynamic\". A few of them have aged well, some need an asterisk in 2026, and one (the Security Manager side of \"secure\") is gone. I point out which is which as I go.",
        },
      ],
    },
    {
      title: "Where the Features Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Almost every feature traces back to a pain point the Green Project team hit with C++ in the early 1990s. Read as a table, the list stops looking like marketing and starts looking like a bug report:",
        },
        {
          type: "table",
          headers: ["C/C++ problem", "Java's response"],
          rows: [
            ["Binaries tied to one CPU and OS", "Platform independence: bytecode plus a JVM per platform"],
            ["Manual memory management causing leaks and crashes", "Automatic garbage collection"],
            ["Pointer arithmetic and raw memory access causing exploits", "References only, no pointer arithmetic, bounds-checked arrays"],
            ["Multiple inheritance and the diamond problem", "Single class inheritance, multiple inheritance of type via interfaces"],
            ["No threads in the language; OS-specific libraries instead", "`Thread`, `synchronized` and a defined memory model built in"],
            ["Undefined behaviour on errors, silent memory corruption", "Runtime checks that throw exceptions, plus checked exceptions"],
            ["Type sizes that differ between compilers and CPUs", "Fixed-size primitives on every platform"],
          ],
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of it as the difference between an old car and a modern one. C and C++ give you full control and full responsibility. Java trades a little of that control for safety systems that are built into the design.",
        },
        {
          type: "list",
          items: [
            "**Garbage collection is the automatic gearbox.** I don't manage gears (memory) by hand, so I can't stall the engine (crash the process) with a bad shift.",
            "**No pointer arithmetic is the sealed engine bay.** I can still drive the car (use references), but I can't reach in and disconnect something dangerous by accident.",
            "**Platform independence is a universal charging port.** The same car charges at any country's station (OS) because the adapter (the JVM) handles the local details.",
            "**Runtime checks are the seatbelts and airbags.** They're part of the design, not an afterthought, and when something goes wrong they turn a crash into a recoverable event: an exception with a stack trace.",
          ],
        },
      ],
    },
    {
      title: "The Ten Features, One by One",
      blocks: [
        {
          type: "heading",
          text: "1. Platform independent",
        },
        {
          type: "paragraph",
          text: "`javac` compiles source to bytecode, not machine code, and any JVM on Windows, Linux or macOS runs the same `.class` file. It's Java's most famous feature and the first lesson covers the mechanics. The detail I'd add in an interview: the **bytecode** is platform-independent, the **JVM** is not. Each OS and CPU gets its own JVM build, and that's the whole trick.",
        },
        {
          type: "paragraph",
          text: "There's one real-world caveat, which gets its own section below: \"anywhere\" means anywhere with a Java runtime at least as new as the one the code was compiled for.",
        },
        {
          type: "heading",
          text: "2. Object-oriented",
        },
        {
          type: "paragraph",
          text: "Code is organised into classes, and a program works by creating objects that keep data and behaviour together. Encapsulation, inheritance, polymorphism and abstraction make large codebases modular and reusable. I cover all of that properly in the OOP phase.",
        },
        {
          type: "paragraph",
          text: "One precise point: Java is not a **pure** object-oriented language. The eight primitives (`int`, `long`, `double`, `boolean` and so on) are not objects, and `static` methods belong to no object. That was a performance decision. An `int[]` of a million elements is one contiguous block of 4-byte values, not a million `Integer` objects scattered on the heap.",
        },
        {
          type: "heading",
          text: "3. Simple",
        },
        {
          type: "paragraph",
          text: "Java removed the C++ features that caused the most bugs: pointer arithmetic, operator overloading, multiple inheritance of classes, `goto`, header files, and manual memory management with `malloc`/`free` or `new`/`delete`. The philosophy was to cut down the ways a developer can shoot themselves in the foot.",
        },
        {
          type: "paragraph",
          text: "\"No pointers\" is the usual phrasing, and it's slightly wrong. Java has pointers. It calls them **references**, and every object variable is one (that's why the exception is called `NullPointerException`). What Java removed is the ability to do arithmetic on them, cast an integer into one, or free the memory behind one. This short program shows references are real:",
        },
        {
          type: "code",
          language: "java",
          title: "References.java",
          code: `public class References {
    public static void main(String[] args) {
        int[] fares = {120, 250, 90};
        int[] alias = fares;          // copies the reference, not the array
        alias[0] = 999;
        System.out.println(fares[0]); // same object, so 999
        System.out.println(fares == alias);
    }
}`,
        },
        {
          type: "output",
          text: `999
true`,
        },
        {
          type: "paragraph",
          text: "Two variables, one array. What I can't do is write `alias + 1` to walk into whatever memory sits after it. \"Simple\" also needs an honest asterisk in 2026: generics with wildcards, the memory model and the concurrency APIs are not simple. Java is simple in the sense of \"fewer sharp edges\", not \"small\".",
        },
        {
          type: "heading",
          text: "4. Robust",
        },
        {
          type: "paragraph",
          text: "Java tries to catch errors as early as possible, and when it can't, to fail loudly and predictably instead of corrupting memory. Three things work together: strong static typing at compile time, runtime checks that throw exceptions, and garbage collection, which removes use-after-free and double-free bugs entirely.",
        },
        {
          type: "paragraph",
          text: "The compile-time half: a method that can throw a **checked exception** has to either handle it or declare it. `Files.readString` declares `IOException`, so this doesn't compile:",
        },
        {
          type: "code",
          language: "java",
          title: "ReadConfig.java",
          code: `import java.nio.file.Files;
import java.nio.file.Path;

public class ReadConfig {
    public static void main(String[] args) {
        String config = Files.readString(Path.of("app.properties"));
        System.out.println(config);
    }
}`,
        },
        {
          type: "output",
          text: `ReadConfig.java:6: error: unreported exception IOException; must be caught or declared to be thrown
        String config = Files.readString(Path.of("app.properties"));
                                        ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The fix is a `try`/`catch` around the call or `throws IOException` on `main`. Either way, the compiler forced me to decide what happens when the file is missing before the program ever ran.",
        },
        {
          type: "paragraph",
          text: "The runtime half: every array access is bounds-checked. In C, writing one element past the end of an array is undefined behaviour and might silently overwrite a neighbouring variable. In Java it's an exception with the exact line:",
        },
        {
          type: "code",
          language: "java",
          title: "Bounds.java",
          code: `public class Bounds {
    public static void main(String[] args) {
        int[] seats = new int[3];
        seats[3] = 1;   // one past the end
        System.out.println("never printed");
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3
	at Bounds.main(Bounds.java:4)`,
        },
        {
          type: "paragraph",
          text: "The process exits with status `1`, nothing else in memory is touched, and the stack trace points at line 4. The same idea covers bad casts (`ClassCastException`) and null dereferences (`NullPointerException`, which since Java 15 names exactly what was null, as shown in the examples).",
        },
        {
          type: "heading",
          text: "5. Secure",
        },
        {
          type: "paragraph",
          text: "Java's security story today rests on things built into the language and the JVM:",
        },
        {
          type: "list",
          items: [
            "**No pointer arithmetic and bounds-checked arrays.** A program can't forge an address or read past a buffer, which removes the buffer-overflow exploits behind so many C/C++ vulnerabilities.",
            "**The bytecode verifier.** When a class is linked, the JVM checks that its bytecode is well-formed and type-safe before running it. That's the JVM's job, not `javac`'s, because a `.class` file can come from anywhere.",
            "**Class loaders and modules.** Class-loader delegation stops application code from replacing `java.lang.String`, and since Java 17 (JEP 403) the module system strongly encapsulates JDK internals: packages like `jdk.internal.misc` or `sun.nio.ch` aren't reachable by reflection unless you open them explicitly with `--add-opens`.",
            "**Security libraries.** TLS, cryptography (JCA) and certificate handling ship with the JDK.",
          ],
        },
        {
          type: "paragraph",
          text: "A lot of older material, including my own early notes, also lists the **Security Manager** and applet sandboxing. That is history now. Applets ran untrusted code from websites inside your browser, and the Security Manager was the sandbox around them. The browser plugin was removed in Java 11, the Applet API was deprecated for removal in Java 17 and removed in JDK 26, and the Security Manager itself was deprecated for removal in Java 17 (JEP 411). Since Java 18, trying to install one fails unless you opt in. On my JDK 21:",
        },
        {
          type: "code",
          language: "java",
          title: "SecMgr.java",
          code: `public class SecMgr {
    public static void main(String[] args) {
        System.setSecurityManager(new SecurityManager());
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.UnsupportedOperationException: The Security Manager is deprecated and will be removed in a future release
	at java.base/java.lang.System.setSecurityManager(System.java:431)
	at SecMgr.main(SecMgr.java:3)`,
        },
        {
          type: "callout",
          tone: "warning",
          title: "Don't cite the Security Manager as a current feature",
          text: "Java 24 permanently disabled it (JEP 486): there is no flag that turns it back on. Modern Java apps are sandboxed the way everything else is, with containers, OS permissions and process isolation. And \"secure language\" never meant \"secure application\": SQL injection and vulnerable dependencies (Log4Shell) happen in Java just as easily.",
        },
        {
          type: "heading",
          text: "6. Architecture-neutral and portable",
        },
        {
          type: "paragraph",
          text: "This is related to platform independence but not the same thing. Platform independence is about the binary running everywhere. Architecture neutrality is about the **program meaning the same thing** everywhere. In C, the standard only promises that an `int` is at least 16 bits, so it has been 2 bytes on some systems and 4 on others, and signed overflow is undefined behaviour. In Java, the language spec fixes it: `int` is always 32-bit two's complement, `long` is 64-bit, `char` is 16-bit, and overflow wraps around in a defined way.",
        },
        {
          type: "code",
          language: "java",
          title: "Sizes.java",
          code: `public class Sizes {
    public static void main(String[] args) {
        System.out.println("int:  " + Integer.SIZE + " bits");
        System.out.println("long: " + Long.SIZE + " bits");
        System.out.println("char: " + Character.SIZE + " bits");
        int max = Integer.MAX_VALUE;
        System.out.println(max + 1);   // defined wrap-around, not undefined behaviour
    }
}`,
        },
        {
          type: "output",
          text: `int:  32 bits
long: 64 bits
char: 16 bits
-2147483648`,
        },
        {
          type: "paragraph",
          text: "Those four lines print the same on x86, ARM, Windows or Linux. The class file format is also fixed (big-endian, whatever the CPU), and since Java 17 (JEP 306) floating-point arithmetic is strict everywhere, so `strictfp` no longer does anything. The wrap-around is portable but still a bug in business code. For money or counters that can grow, I'd use `Math.addExact`, which throws `ArithmeticException` instead of going negative.",
        },
        {
          type: "heading",
          text: "7. Multithreaded",
        },
        {
          type: "paragraph",
          text: "Threads are part of the language and the platform: the `Thread` class, the `synchronized` keyword, `wait`/`notify`, and since Java 5 a formal **Java Memory Model** that defines when one thread's writes become visible to another, plus the `java.util.concurrent` package (executors, locks, atomics, concurrent collections). Older C and C++ had no threads in the language at all. You used pthreads or Win32 threads, different on every OS. C11 and C++11 only added them in 2011.",
        },
        {
          type: "paragraph",
          text: "Java 21 added the biggest change to this feature since Java 5: **virtual threads** (JEP 444). A platform thread is a thin wrapper around an OS thread, costs around a megabyte of reserved stack, and you can realistically run a few thousand. A virtual thread is managed by the JVM and mounted on a small pool of carrier threads only while it's actually running. When it blocks on I/O or `sleep`, it unmounts and the carrier picks up other work. So you can run hundreds of thousands and keep writing plain blocking code.",
        },
        {
          type: "code",
          language: "java",
          title: "Workers.java",
          code: `import java.util.concurrent.Executors;

public class Workers {
    public static void main(String[] args) throws InterruptedException {
        Runnable task = () ->
                System.out.println("running on " + Thread.currentThread().getName());

        Thread t1 = new Thread(task, "worker-1");
        Thread t2 = new Thread(task, "worker-2");
        t1.start();
        t2.start();
        t1.join();   // wait for both before moving on
        t2.join();

        // Java 21: one virtual thread per task
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 10_000; i++) {
                executor.submit(() -> {
                    Thread.sleep(100);   // blocking is cheap here
                    return null;
                });
            }
        }   // close() waits for all 10,000 tasks
        System.out.println("10,000 virtual threads done");
    }
}`,
        },
        {
          type: "output",
          text: `running on worker-2
running on worker-1
10,000 virtual threads done`,
        },
        {
          type: "paragraph",
          text: "The order of the first two lines is **not deterministic**. I ran it five times: `worker-2` printed first four times and `worker-1` once. `start()` only makes a thread runnable, and the OS scheduler decides who goes first. Anything that depends on that order is a race condition.",
        },
        {
          type: "paragraph",
          text: "The second half is the interesting part. Ten thousand tasks that each sleep 100 ms would take 1,000 seconds on one thread. The whole program finished in about 0.3 seconds of wall-clock time on my laptop, because all 10,000 virtual threads slept at the same time on a handful of carrier threads.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "Virtual threads help when tasks spend most of their time waiting (HTTP calls, database queries). They don't make CPU-bound work faster, and they're never pooled: create one per task. On Java 21 a virtual thread blocking inside a `synchronized` block pins its carrier thread; Java 24 fixed that (JEP 491).",
        },
        {
          type: "heading",
          text: "8. High performance",
        },
        {
          type: "paragraph",
          text: "Java is fast, but the honest version needs detail. The JVM starts by interpreting bytecode, then the **JIT compiler** compiles hot methods and loops to native code, using profiling data a static compiler never sees: which branches are actually taken, which concrete types show up at a call site. For a long-running server, steady-state throughput is often close to C++. To see how much of that comes from the JIT, I ran the same loop with the JIT on and with `-Xint` (interpreter only):",
        },
        {
          type: "code",
          language: "java",
          title: "Loop.java",
          code: `public class Loop {
    public static void main(String[] args) {
        long start = System.nanoTime();
        long sum = 0;
        for (int i = 0; i < 500_000_000; i++) {
            sum += i % 7;
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        System.out.println("sum=" + sum + " in " + ms + " ms");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Loop
java -Xint Loop`,
        },
        {
          type: "output",
          text: `sum=1499999994 in 732 ms
sum=1499999994 in 7116 ms`,
        },
        {
          type: "paragraph",
          text: "Exact numbers depend on the machine, and this is a quick check, not a proper benchmark (for that I'd use JMH). But a 10x gap from the JIT alone is typical for a hot loop like this.",
        },
        {
          type: "paragraph",
          text: "Where C and C++ still win: startup time, memory footprint (a JVM plus heap headroom plus JIT and GC overhead), and predictable latency, since garbage collection and warm-up can add jitter. Java deliberately traded some raw speed for safety, portability and productivity. The gap keeps shrinking: G1 and ZGC keep pauses short, and GraalVM Native Image and the Java 24+ AOT cache attack startup.",
        },
        {
          type: "heading",
          text: "9. Distributed",
        },
        {
          type: "paragraph",
          text: "Java was built with networking in mind from day one. `java.net` (sockets, URLs) shipped in 1.0, RMI (Remote Method Invocation) in 1.1 let one JVM call methods on objects in another, and Java 11 added a modern `java.net.http.HttpClient` with HTTP/2 support. The JDK even ships a small HTTP server, so a client and server talking over real TCP fit in one file:",
        },
        {
          type: "code",
          language: "java",
          title: "PingServer.java",
          code: `import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class PingServer {
    public static void main(String[] args) throws Exception {
        // a tiny HTTP server on any free port (JDK's built-in jdk.httpserver)
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/ping", exchange -> {
            byte[] body = "pong".getBytes();
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        int port = server.getAddress().getPort();

        // and a client calling it over real TCP, with java.net.http
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest
                .newBuilder(URI.create("http://localhost:" + port + "/ping"))
                .build();
        HttpResponse<String> response =
                client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.statusCode() + " " + response.body());

        server.stop(0);
    }
}`,
        },
        {
          type: "output",
          text: "200 pong",
        },
        {
          type: "paragraph",
          text: "My first version bound a fixed port 8080 and died with `java.net.BindException: Address already in use`, because something else on my machine was already on 8080. Port `0` asks the OS for any free port. In practice, \"distributed\" in 2026 means REST, gRPC and Kafka on top of these networking basics. RMI still exists but is rarely used in new systems, CORBA was removed in Java 11, and RMI Activation in Java 17.",
        },
        {
          type: "heading",
          text: "10. Dynamic",
        },
        {
          type: "paragraph",
          text: "Java doesn't link everything at build time. Classes are loaded lazily at runtime, when first needed, and a program can load a class whose name it only learns while running. That is the base of reflection, plugin architectures, JDBC drivers, and every dependency-injection framework, including Spring. Here the gateway class name comes from the command line:",
        },
        {
          type: "code",
          language: "java",
          title: "Plugins.java",
          code: `public class Plugins {
    public static void main(String[] args) throws Exception {
        Class<?> type = Class.forName(args[0]);   // name only known at runtime
        PaymentGateway gateway = (PaymentGateway) type.getDeclaredConstructor().newInstance();
        System.out.println(gateway.charge(25000));
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "PaymentGateway.java and UpiGateway.java",
          code: `public interface PaymentGateway {
    String charge(int amountInPaise);
}

public class UpiGateway implements PaymentGateway {
    public String charge(int amountInPaise) {
        return "charged " + amountInPaise + " via " + getClass().getSimpleName();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Plugins UpiGateway
java Plugins CardGateway`,
        },
        {
          type: "output",
          text: `charged 25000 via UpiGateway
Exception in thread "main" java.lang.ClassNotFoundException: CardGateway`,
        },
        {
          type: "paragraph",
          text: "`Plugins` never mentions `UpiGateway` in its source. Running it with `-Xlog:class+load` shows `Plugins`, then `PaymentGateway`, then `UpiGateway` loading only when `Class.forName` asks for it. The standard, safer version of this pattern is `ServiceLoader`, which is how JDBC drivers register themselves since JDBC 4.0. That's why modern code no longer needs `Class.forName(\"com.mysql.jdbc.Driver\")`.",
        },
      ],
    },
    {
      title: "How It Works Internally",
      blocks: [
        {
          type: "paragraph",
          text: "Listing features is easy. What made them click for me was tracing each one to the machinery that actually delivers it. Following a class from `javac` to running code, this is where each feature comes from:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`javac` checks and compiles (robust, simple, architecture-neutral).** The compiler enforces static types and checked exceptions, rejects anything that needs pointer arithmetic, and emits bytecode whose types have fixed sizes: `iadd` always means 32-bit integer addition, whatever CPU runs it later.",
            "**Bytecode plus a per-platform JVM (platform independence).** The `.class` file is the same everywhere. The JVM is the only platform-specific piece, compiled separately for Linux x64, Windows, macOS on ARM and so on.",
            "**Class loaders load on demand (dynamic).** Classes are found and loaded lazily, when a reference to them is first resolved, or explicitly through `Class.forName` and reflection. Nothing requires every class to be known at build time.",
            "**The verifier runs at link time (secure).** Before a loaded class is used, the JVM proves its bytecode is type-safe: no forged references, no stack overflow or underflow, no jumps into the middle of an instruction. `javac` doesn't do this; the JVM does, because it can't trust where a class file came from.",
            "**The interpreter and JIT execute it (high performance).** Code starts in the interpreter. HotSpot counts method calls and loop iterations, and hot code is compiled by C1, then by the optimizing C2 compiler, into native instructions kept in the code cache.",
            "**Runtime checks and the GC guard memory (robust).** Array instructions carry their own bounds check, casts are checked, and objects live on a heap the garbage collector manages. No code can free memory that is still referenced.",
            "**Threads map onto the OS or onto carriers (multithreaded).** A platform thread is a one-to-one wrapper around an OS thread. A virtual thread is a heap object that the JVM mounts on a carrier thread only while it runs.",
          ],
        },
        {
          type: "heading",
          text: "The bounds check is inside the instruction",
        },
        {
          type: "paragraph",
          text: "I expected to find an explicit comparison in the bytecode for `seats[3] = 1` from the robustness example. There isn't one. `javap -c Bounds` shows a single `iastore`, and the JVM specification defines that instruction as throwing `ArrayIndexOutOfBoundsException` when the index is out of range:",
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: iconst_3
       1: newarray       int
       3: astore_1
       4: aload_1
       5: iconst_3
       6: iconst_1
       7: iastore
       8: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;`,
        },
        {
          type: "paragraph",
          text: "So the check isn't something the compiler can forget to emit. It's part of what the instruction means, on every JVM. The JIT is then free to remove it in compiled code when it can prove the index is always in range.",
        },
        {
          type: "heading",
          text: "Platform threads vs virtual threads",
        },
        {
          type: "paragraph",
          text: "Printing `Thread.currentThread()` from each kind of thread shows the difference directly:",
        },
        {
          type: "code",
          language: "java",
          title: "Carriers.java",
          code: `public class Carriers {
    public static void main(String[] args) throws InterruptedException {
        Thread platform = Thread.ofPlatform().name("platform-1").start(
                () -> System.out.println(Thread.currentThread()));
        platform.join();

        Thread virtual = Thread.ofVirtual().name("virtual-1").start(
                () -> System.out.println(Thread.currentThread()));
        virtual.join();
    }
}`,
        },
        {
          type: "output",
          text: `Thread[#28,platform-1,5,main]
VirtualThread[#29,virtual-1]/runnable@ForkJoinPool-1-worker-1`,
        },
        {
          type: "paragraph",
          text: "The virtual thread tells you where it's mounted: `@ForkJoinPool-1-worker-1` is the carrier, a platform thread from a `ForkJoinPool` the JVM sizes to the number of CPU cores. When the virtual thread blocks on I/O or `sleep`, its stack frames are copied to the heap, it unmounts, and that carrier runs another virtual thread.",
        },
        {
          type: "diagram",
          text: `PLATFORM THREADS                VIRTUAL THREADS

┌──────────┐ ┌──────────┐       ┌────┐┌────┐┌────┐┌────┐┌────┐
│ Thread A │ │ Thread B │       │ V1 ││ V2 ││ V3 ││ V4 ││... │
└────┬─────┘ └────┬─────┘       └─┬──┘└────┘└─┬──┘└────┘└────┘
     │ 1:1        │ 1:1           │           │  V2, V4:
     ▼            ▼               ▼           ▼  blocked
┌──────────┐ ┌──────────┐       ┌──────────┐┌──────────┐
│ OS       │ │ OS       │       │ carrier  ││ carrier  │
│ thread   │ │ thread   │       │ worker-1 ││ worker-2 │
└──────────┘ └──────────┘       └────┬─────┘└────┬─────┘
                                     │ 1:1       │ 1:1
~1 MB stack each,                    ▼           ▼
thousands at most               ┌──────────┐┌──────────┐
                                │ OS       ││ OS       │
                                │ thread   ││ thread   │
                                └──────────┘└──────────┘`,
          caption:
            "V1 and V3 are mounted and running. V2 and V4 are blocked, so their stacks wait on the heap and hold no OS thread.",
        },
        {
          type: "heading",
          text: "Bytecode versions: the limit on WORA",
        },
        {
          type: "paragraph",
          text: "One more JVM detail ties several features together. How does a Java 25 JVM run a library compiled for Java 8, and why doesn't the reverse work?",
        },
        {
          type: "paragraph",
          text: "Every `.class` file starts with the magic number `0xCAFEBABE` followed by a **class file version**. When a class loader reads a class, the JVM checks that version:",
        },
        {
          type: "list",
          items: [
            "Version older than or equal to what the running JVM supports: it loads and runs. That's Java's backward compatibility, and it's why a JAR built in 2014 still runs today.",
            "Version newer than the running JVM: loading fails with `UnsupportedClassVersionError`. An old JVM can't know what newer bytecode might contain.",
          ],
        },
        {
          type: "table",
          headers: ["Java version", "Class file major version"],
          rows: [
            ["8", "52"],
            ["11", "55"],
            ["17", "61"],
            ["21", "65"],
            ["25", "69"],
          ],
        },
        {
          type: "paragraph",
          text: "The rule is simply 44 plus the Java version. So \"Write Once, Run Anywhere\" really means \"run anywhere on an equal or newer JVM\", and a mismatch between the JDK that built the code and the runtime that runs it is a very common deployment bug.",
        },
      ],
    },
    {
      title: "Which Layer Provides Which Feature",
      blocks: [
        {
          type: "diagram",
          text: `┌──────────────────────────────────────────────────────────┐
│  LANGUAGE + javac                  (at compile time)     │
│    Simple, Object-oriented, Architecture-neutral types,  │
│    Robust: static types, checked exceptions              │
└────────────────────────────┬─────────────────────────────┘
                             │  .class files (bytecode)
                             ▼
┌──────────────────────────────────────────────────────────┐
│  JVM                (at run time, one build per OS/CPU)  │
│    Platform independent: same bytecode everywhere        │
│    Secure: verifier, no pointer arithmetic               │
│    Robust: bounds, null and cast checks, GC              │
│    High performance: interpreter + JIT                   │
│    Dynamic: lazy class loading                           │
│    Multithreaded: threads, memory model                  │
└────────────────────────────┬─────────────────────────────┘
                             │  used through
                             ▼
┌──────────────────────────────────────────────────────────┐
│  STANDARD LIBRARY                                        │
│    Distributed: java.net, java.net.http, RMI             │
│    Multithreaded: java.util.concurrent, virtual threads  │
│    Dynamic: reflection, ServiceLoader                    │
│    Secure: TLS, cryptography (JCA)                       │
└──────────────────────────────────────────────────────────┘`,
          caption:
            "Some features span layers. Multithreading needs the language (synchronized), the JVM (the memory model) and the library (executors).",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: the version check, reproduced",
        },
        {
          type: "paragraph",
          text: "I have JDK 21 and JDK 17 on the same machine, so I could reproduce the version mismatch for real instead of reading about it.",
        },
        {
          type: "code",
          language: "java",
          title: "HelloVersion.java",
          code: `public class HelloVersion {
    public static void main(String[] args) {
        System.out.println("Compiled with a modern JDK");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# compile with JDK 21 and check the version stamped in the file
javac HelloVersion.java
javap -v HelloVersion | grep major

# run it on a Java 17 runtime
/usr/lib/jvm/java-17-openjdk-amd64/bin/java HelloVersion`,
        },
        {
          type: "output",
          text: `  major version: 65
Error: LinkageError occurred while loading main class HelloVersion
	java.lang.UnsupportedClassVersionError: HelloVersion has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0`,
        },
        {
          type: "paragraph",
          text: "The message tells you both sides: the class is 65.0 (Java 21) and the runtime only understands up to 61.0 (Java 17). On a Java 8 runtime, the last number would be 52.0. The fix is to compile for the oldest runtime you deploy to:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 17 -d out HelloVersion.java
javap -v out/HelloVersion.class | grep major
/usr/lib/jvm/java-17-openjdk-amd64/bin/java -cp out HelloVersion`,
        },
        {
          type: "output",
          text: `  major version: 61
Compiled with a modern JDK`,
        },
        {
          type: "callout",
          tone: "tip",
          text: "Use `--release`, not `-source`/`-target`. `--release 17` also checks that you only call APIs that exist in Java 17. With plain `-target 17` the code compiles against the JDK 21 library and can still fail at runtime with `NoSuchMethodError`.",
        },
        {
          type: "heading",
          text: "Example 2: a null that explains itself (robust)",
        },
        {
          type: "code",
          language: "java",
          title: "Checkout.java",
          code: `public class Checkout {
    record Rider(String name, String city) {}

    public static void main(String[] args) {
        Rider rider = new Rider("Asha", null);
        System.out.println(rider.city().toUpperCase());
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.toUpperCase()" because the return value of "Checkout$Rider.city()" is null
	at Checkout.main(Checkout.java:6)`,
        },
        {
          type: "paragraph",
          text: "In C, dereferencing null is undefined behaviour and usually a segfault with no context. In Java it's an ordinary exception, and since Java 15 (helpful NullPointerExceptions, JEP 358, on by default from 15) the message says exactly which call returned null. With a chain like `order.rider().city().toUpperCase()` on one line, that message saves real debugging time. `Checkout$Rider` is how the nested record's class name looks inside the JVM.",
        },
        {
          type: "heading",
          text: "Example 3: multithreaded is not thread-safe",
        },
        {
          type: "code",
          language: "java",
          title: "Counter.java",
          code: `import java.util.concurrent.atomic.AtomicInteger;

public class Counter {
    static int plain = 0;
    static AtomicInteger atomic = new AtomicInteger();

    public static void main(String[] args) throws InterruptedException {
        Runnable work = () -> {
            for (int i = 0; i < 100_000; i++) {
                plain++;                   // read, add, write: three steps
                atomic.incrementAndGet();  // one atomic step
            }
        };
        Thread a = new Thread(work);
        Thread b = new Thread(work);
        a.start();
        b.start();
        a.join();
        b.join();
        System.out.println("plain:  " + plain);
        System.out.println("atomic: " + atomic.get());
    }
}`,
        },
        {
          type: "output",
          text: `plain:  179694
atomic: 200000`,
        },
        {
          type: "paragraph",
          text: "Two threads, 100,000 increments each, so the right answer is 200,000. The `plain` counter lost about 20,000 updates, and the number changed on every run (179,694, then 189,369, then 183,120). `plain++` is a read, an add and a write, and when both threads read the same value, one increment disappears. `AtomicInteger` does the whole thing as one compare-and-set, so it's always correct. Java gives you threads; making shared state safe is still my job.",
        },
        {
          type: "heading",
          text: "Example 4: defined overflow, and how to refuse it",
        },
        {
          type: "code",
          language: "java",
          title: "SafeAdd.java",
          code: `public class SafeAdd {
    public static void main(String[] args) {
        int walletBalance = Integer.MAX_VALUE;
        System.out.println(walletBalance + 1);
        System.out.println(Math.addExact(walletBalance, 1));
    }
}`,
        },
        {
          type: "output",
          text: `-2147483648
Exception in thread "main" java.lang.ArithmeticException: integer overflow
	at java.base/java.lang.Math.addExact(Math.java:911)
	at SafeAdd.main(SafeAdd.java:5)`,
        },
        {
          type: "paragraph",
          text: "The first line is architecture neutrality at work: the wrap-around is defined and identical on every CPU. It's also a silent bug in a wallet. `Math.addExact` turns the same overflow into an exception, which is what I want anywhere money or counts are involved.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**Saying Java has no pointers.** It has references and throws `NullPointerException`. What it doesn't have is pointer arithmetic or manual `free`.",
            "**Calling Java 100% object-oriented.** Primitives and `static` members are not objects. \"Object-oriented, not purely\" is the accurate answer.",
            "**Saying the JVM is platform-independent.** It's the opposite. Bytecode is portable, the JVM is built per platform.",
            "**Listing the Security Manager or applets as current security features.** Both are gone from modern Java. The Security Manager was permanently disabled in Java 24.",
            "**Assuming \"multithreaded\" means \"thread-safe\".** Java gives you threads and the tools to coordinate them. A `HashMap` shared between threads without synchronization is still a bug, and output order between threads is never guaranteed.",
            "**Forgetting the version caveat on WORA.** Code compiled with a newer JDK won't load on an older runtime.",
            "**Quoting \"Java is slow\" or \"Java is as fast as C\" without context.** Startup and memory: slower and heavier. Steady-state throughput of a warmed-up service: usually close.",
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
            "Start new projects on the latest LTS, which is **Java 25** (September 2025), unless a dependency holds you back. Java 21 is the sensible floor if you want virtual threads.",
            "Check your framework's baseline before picking a JDK. Spring Boot 3.x and 4.x both require Java 17 or later.",
            "Keep the local JDK, the CI build JDK and the production runtime aligned, and pin the target with `--release` (or `<maven.compiler.release>` in Maven) so a newer build JDK can't produce bytecode production can't load.",
            "Lean on the robustness features instead of fighting them: handle checked exceptions where you can actually recover, and don't swallow them in an empty `catch`.",
            "Use virtual threads for I/O-bound request handling, and platform-thread pools sized to CPU cores for CPU-bound work.",
            "Prefer `ServiceLoader` or your framework's dependency injection over raw `Class.forName` for plugins. Reflection bypasses compile-time checks, so keep it at the edges.",
          ],
        },
      ],
    },
    {
      title: "Performance Considerations",
      blocks: [
        {
          type: "list",
          items: [
            "Every LTS since Java 9 has brought JVM performance improvements you get just by upgrading. G1 became the default collector in Java 9. ZGC and Shenandoah became production-ready in Java 15 for low-latency workloads, and generational ZGC arrived in Java 21.",
            "The JIT needs warm-up. A service is slowest in its first seconds after start, so measure after warm-up and consider warm-up traffic or readiness probes before sending real load.",
            "Virtual threads (Java 21) change the scalability picture for backend services. Thread-per-request code no longer runs out of threads at a few hundred concurrent requests blocked on I/O, without rewriting it in a reactive style.",
            "The robustness checks cost less than you'd think. The JIT removes bounds checks it can prove are unnecessary, for example in a loop that runs from `0` to `array.length`.",
          ],
        },
      ],
    },
    {
      title: "Where This Shows Up in Production",
      blocks: [
        {
          type: "list",
          items: [
            "Banking cores, e-commerce platforms, ride-hailing and dispatch systems and most large backend estates run on LTS releases. Java 17 and 21 are the common targets today, with 25 adoption starting, and some legacy systems still on 8 or 11.",
            "Netflix has written publicly about moving its services to Java 21, and about a deadlock they hit when virtual threads pinned their carrier threads inside `synchronized` blocks. That's the exact issue Java 24 fixed, and a good reminder that a new feature has to be understood, not just switched on.",
            "In RideX, my ride-hailing project on Java 21 and Spring Boot, the features in this lesson are the everyday reality: dependency injection is the dynamic feature at work, the database and Redis calls are where virtual threads pay off, and pinning `--release 21` in the build keeps the bytecode matched to the runtime image.",
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
              question: "What are the main features of Java?",
              answer:
                "The classic list is platform independent, object-oriented, simple, robust, secure, architecture-neutral, multithreaded, high performance, distributed and dynamic. I don't just recite it, though. I'd group them by where they come from: the language and `javac` give you static typing and checked exceptions, the JVM gives you portability, the verifier, runtime checks, GC and the JIT, and the standard library gives you networking and concurrency.\n\nIf they want one feature, I'd pick platform independence, because it's the reason the JVM exists at all.",
            },
            {
              question: "What does platform independent mean in Java?",
              answer:
                "It means the compiled program, the bytecode in `.class` files, runs unchanged on any OS and CPU that has a JVM. I compile once on my Linux laptop and the same JAR runs on a Windows machine or an ARM server.\n\nThe JVM itself is platform-dependent. There's a separate build for each OS and CPU, and it does the platform-specific work so my code doesn't have to. The one catch is the Java version: the runtime has to be at least as new as what I compiled for.",
            },
            {
              question: "Why is Java called object-oriented, and is it purely object-oriented?",
              answer:
                "Because programs are built from classes and objects that bundle data with the methods that work on it, and it supports encapsulation, inheritance, polymorphism and abstraction directly.\n\nIt isn't purely object-oriented, though. The eight primitives like `int` and `boolean` aren't objects, and `static` methods don't belong to any object. That was a deliberate performance call: an `int[]` is just packed 4-byte values in memory, not an array of `Integer` objects.",
            },
            {
              question: "Does Java have pointers?",
              answer:
                "It has references, which are pointers under the hood, but no pointer arithmetic. Every object variable holds a reference, which is why the exception is called `NullPointerException`.\n\nWhat I can't do is add an offset to a reference, turn an integer into one, or free the memory behind one. When I assigned one array to another variable and changed an element through the second one, the first saw the change, so the aliasing is real. The dangerous operations are just gone.",
            },
            {
              question: "Why is Java called robust?",
              answer:
                "Because it catches errors early and fails predictably when it can't. The compiler checks types and forces you to deal with checked exceptions. At runtime, array bounds, casts and nulls are checked and turn into exceptions instead of memory corruption, and the garbage collector removes use-after-free bugs.\n\nWhen I wrote one element past the end of a 3-element array, I got `ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3` with the exact line number. In C that same write is undefined behaviour and might silently overwrite another variable.",
            },
            {
              question: "What makes Java secure?",
              answer:
                "Mainly that the language can't touch raw memory: no pointer arithmetic, bounds-checked arrays, and a bytecode verifier that checks every loaded class is type-safe before it runs. On top of that, class-loader delegation stops you replacing core classes, and the module system hides JDK internals.\n\nI wouldn't mention the Security Manager as a current feature. It was deprecated in Java 17 and permanently disabled in Java 24. And I'd be clear that a safe language doesn't make an app secure. SQL injection and a vulnerable dependency hurt a Java app just as much.",
            },
            {
              question: "What is the difference between platform independent and architecture-neutral?",
              answer:
                "Platform independent is about the binary: the same bytecode runs on any OS. Architecture-neutral is about meaning: the program behaves the same on every CPU, because the language fixes things C leaves open.\n\nThe classic example is `int`. In C it's at least 16 bits and has been 2 or 4 bytes depending on the system. In Java it's always 32-bit, and overflow is defined. `Integer.MAX_VALUE + 1` printed `-2147483648` on my machine and will print that everywhere.",
            },
            {
              question: "What does it mean that Java is multithreaded?",
              answer:
                "Threads are built into the language and platform instead of coming from OS-specific libraries. You have `Thread`, `synchronized`, a formal memory model that defines visibility between threads, and `java.util.concurrent` for executors, locks and concurrent collections.\n\nSince Java 21 there are also virtual threads, which are cheap enough to create one per task. One thing I noticed running a two-thread example: the print order changed between runs. That's expected, since the scheduler decides, and it's why shared state needs synchronization.",
            },
            {
              question: "Is Java compiled or interpreted, and how does that relate to performance?",
              answer:
                "Both. `javac` compiles source to bytecode, and the JVM interprets that bytecode at first, then the JIT compiles the hot parts to native code while the program runs.\n\nThat's where the performance comes from. I ran a 500-million-iteration loop normally and with `-Xint`, which turns the JIT off. It took about 0.7 seconds with the JIT and about 7 seconds without it.",
            },
            {
              question: "Why is Java called dynamic?",
              answer:
                "Because classes are loaded at runtime when first needed, not all linked together at build time, and a program can load a class it only knows by name while running. That's the basis of reflection, plugins, JDBC drivers and Spring's dependency injection.\n\nI tried it with `Class.forName(args[0])` and an interface: passing `UpiGateway` on the command line loaded and ran that implementation, and passing a name that didn't exist gave `ClassNotFoundException`. The main class never referenced the implementation directly.",
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
              question: "Which C/C++ problems did Java's features address?",
              answer:
                "Platform-specific binaries, fixed by bytecode and a JVM per platform. Manual memory management and its leaks and double frees, fixed by garbage collection. Pointer arithmetic and buffer overruns, fixed by references plus bounds checks and the verifier. The diamond problem of multiple inheritance, avoided with single class inheritance plus interfaces. And missing language-level threads, fixed by building them in.\n\nThe price was some low-level control, a startup cost and more memory. For backend services that's almost always a good trade.",
            },
            {
              question: "Why is Java called simple, and is that still accurate?",
              answer:
                "It was simple compared with C++. It dropped pointer arithmetic, operator overloading, multiple class inheritance, header files and manual memory management, so there are fewer ways to write code that compiles but corrupts memory.\n\nToday I'd say \"fewer sharp edges\" rather than \"small\". Generics with wildcards, the memory model and the concurrency APIs take real effort to learn. But the core rules are consistent, and most of what trips people up in C++ simply can't happen.",
            },
            {
              question: "What's the difference between checked and unchecked exceptions, and how do they relate to robustness?",
              answer:
                "Checked exceptions, like `IOException`, extend `Exception` but not `RuntimeException`, and the compiler makes you catch or declare them. Unchecked ones, like `NullPointerException` or `IllegalArgumentException`, extend `RuntimeException` and aren't enforced.\n\nThe idea is that recoverable, expected failures (a missing file, a network error) should be handled on purpose. When I called `Files.readString` without handling it, `javac` refused with \"unreported exception IOException; must be caught or declared to be thrown\", so I had to decide what happens if the config file is missing before I could even run it.",
            },
            {
              question: "What happened to the Security Manager and applets?",
              answer:
                "Both are gone from modern Java. Applets needed a browser plugin, which was removed in Java 11, and the Applet API itself was deprecated for removal in 17 and has since been removed. The Security Manager, which was the sandbox around applets, was deprecated for removal in Java 17 by JEP 411 and permanently disabled in Java 24 by JEP 486.\n\nOn Java 21, calling `System.setSecurityManager` throws `UnsupportedOperationException` saying it's deprecated. Real isolation today comes from containers and OS permissions, not an in-process sandbox.",
            },
            {
              question: "How does the JIT make Java a high-performance language?",
              answer:
                "The JVM watches which methods and loops run often and compiles them to native code while the program runs. Because it compiles at runtime, it can use real profile data: which branches are taken, which concrete types appear at a call site. It inlines aggressively on that basis and deoptimizes if an assumption later breaks.\n\nThe effect is big. The same loop took about 0.7 seconds with the JIT and 7 seconds with `-Xint` on my laptop. The cost is warm-up: a freshly started service is slower for its first few seconds.",
            },
            {
              question: "What are virtual threads, and how are they different from platform threads?",
              answer:
                "A platform thread maps one-to-one to an OS thread. It's expensive to create and has a large reserved stack, so you get a few thousand at most. A virtual thread, final in Java 21, is scheduled by the JVM onto a small pool of carrier threads, and when it blocks on I/O it unmounts and frees the carrier.\n\nSo blocking becomes cheap. I submitted 10,000 tasks that each slept 100 ms to a virtual-thread-per-task executor, and the whole program finished in about 0.3 seconds. Sequentially that would be 1,000 seconds.",
            },
            {
              question: "What does \"distributed\" mean for Java today?",
              answer:
                "Originally it meant networking in the standard library from day one: `java.net` sockets and URLs in 1.0, and RMI in 1.1 for calling methods on objects in another JVM. Today it mostly means that the platform makes networked services easy: `java.net.http.HttpClient` since Java 11, and frameworks like Spring on top.\n\nIn practice, Java services talk over REST, gRPC and Kafka. RMI still exists but I wouldn't choose it for a new system. CORBA was removed in Java 11 and RMI Activation in Java 17.",
            },
            {
              question: "How does reflection relate to Java being dynamic?",
              answer:
                "Reflection is the API side of it. Because classes are loaded and linked at runtime, a program can look up a class by name, list its methods and fields, and create instances or call methods without compile-time references to them.\n\nSpring does exactly this: it scans for annotated classes and wires them together at startup. The trade-off is that reflection skips compile-time checks, so a typo in a class name becomes a runtime `ClassNotFoundException` instead of a compile error.",
            },
            {
              question: "Does being multithreaded mean Java code is thread-safe?",
              answer:
                "No. Java gives you threads and the tools to coordinate them, not automatic safety. Two threads incrementing a shared `int` without synchronization can lose updates, and a plain `HashMap` isn't safe for concurrent writes.\n\nYou get safety by design: immutable objects, `synchronized` or locks, atomics like `AtomicInteger`, and concurrent collections like `ConcurrentHashMap`. Even something as simple as two threads printing a line came out in different orders on different runs for me.",
            },
            {
              question: "Why is a Java `int` always 32 bits, and why does that matter?",
              answer:
                "The Java Language Specification defines every primitive's size and behaviour: `int` is 32-bit two's complement, `long` 64-bit, `char` 16-bit UTF-16. The JVM has to implement exactly that on every CPU.\n\nIt removes a whole class of portability bugs, like a C program that works on a 32-bit machine and overflows on another. It also means overflow is defined but silent, so for money I use `long` or `BigDecimal`, and `Math.addExact` when I'd rather get an exception than a negative number.",
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
              question: "Explain how bytecode versioning enables and limits backward compatibility.",
              answer:
                "Every class file carries a major version, which is 44 plus the Java version, so 52 for Java 8, 65 for 21 and 69 for 25. A JVM accepts any version up to its own, which is why decade-old JARs still run on new JVMs.\n\nThe limit is the other direction. An older JVM rejects a newer class file with `UnsupportedClassVersionError`, because it can't know what new bytecode features it might use. When I compiled with JDK 21 and ran on 17, the message said \"class file version 65.0\" and \"only recognizes class file versions up to 61.0\".",
            },
            {
              question: "Why does `UnsupportedClassVersionError` happen and how do you prevent it?",
              answer:
                "It happens when the class loader reads a class whose major version is higher than the running JVM supports, typically because the code was built with a newer JDK than the one in production. It's a `LinkageError`, so it fails at load time, not in your code.\n\nTo prevent it, I compile with `--release` set to the oldest runtime we deploy on, and keep the CI JDK and the runtime image aligned. `--release` is better than `-target` because it also checks the API: with `-target` alone you can still compile a call to a method that doesn't exist on the older runtime.",
            },
            {
              question: "How do virtual threads work internally, and what are their limitations?",
              answer:
                "A virtual thread is a Java object with its own stack stored on the heap. The JVM mounts it onto a carrier thread from a `ForkJoinPool` sized to the CPU cores. When it hits a blocking operation that the JDK has made virtual-thread aware, like socket I/O or `sleep`, its stack is saved and the carrier is released to run another virtual thread.\n\nThe limitations: it doesn't speed up CPU-bound work, and some operations pin the carrier. On Java 21, blocking inside `synchronized` pinned, which Java 24 fixed with JEP 491. Blocking native calls still pin. Also, don't pool them, and watch `ThreadLocal`-heavy code, since a million virtual threads means a million copies.",
            },
            {
              question: "How does the bytecode verifier contribute to Java's security and robustness?",
              answer:
                "When a class is linked, the verifier proves the bytecode is safe: the class file is well-formed, every instruction gets operands of the right type, the operand stack never overflows or underflows, branches land on real instructions, and access rules like `private` and `final` hold. A failure throws `VerifyError` before any code in that class runs.\n\nIt matters because the JVM can't trust where a class file came from. `javac` produces valid bytecode, but a hand-crafted or tampered file might not. Without the verifier, the no-pointer-arithmetic guarantee could be bypassed at the bytecode level.",
            },
            {
              question: "Is Java really high performance compared to C++? Give an honest answer.",
              answer:
                "For long-running server workloads, steady-state throughput is often close to C++, sometimes better where the JIT can use profile data a static compiler doesn't have, like inlining a virtual call that only ever sees one type.\n\nWhere C++ still wins is startup, memory footprint and tail latency. A JVM carries the heap headroom a GC needs, the JIT's own CPU and memory, and warm-up time. That's why Java fits servers well and short-lived CLI tools less well, and why GraalVM Native Image and the AOT cache exist.",
            },
            {
              question: "What is the Java Memory Model and why is it part of the multithreaded feature?",
              answer:
                "It's the part of the language spec, rewritten in Java 5 by JSR-133, that defines when a write in one thread is guaranteed to be visible to a read in another. It does that through happens-before rules: unlocking a monitor happens-before a later lock of the same monitor, a `volatile` write happens-before later reads of it, and `Thread.start()` and `join()` create edges too.\n\nWithout it, threads would be unusable across CPUs, since compilers and CPUs reorder memory operations freely. It's also why `join()` in my example matters: after `t1.join()`, everything `t1` wrote is visible to `main`.",
            },
            {
              question: "What are the downsides of Java's dynamic class loading?",
              answer:
                "Errors move from build time to runtime. A missing class becomes `ClassNotFoundException` or `NoClassDefFoundError` in production instead of a compile error, and version conflicts between JARs show up as `NoSuchMethodError` when a method is first called.\n\nIt also costs startup time, since classes are loaded, verified and initialized on first use. That's part of why a Spring Boot app takes a few seconds to start. Reflection-heavy code is harder for tools like GraalVM Native Image to analyse too, which is why frameworks now generate metadata ahead of time.",
            },
            {
              question: "How does the JIT deal with the cost of Java's runtime safety checks?",
              answer:
                "It removes the ones it can prove are unnecessary. In a loop from `0` to `array.length`, range-check elimination drops the per-access bounds check. Null checks are often turned into implicit checks that cost nothing unless the reference actually is null, in which case a hardware trap is converted into the exception.\n\nSo the safety features are mostly paid for in the interpreter and at the edges of loops, not on every access in hot code. That's a big part of why \"robust\" and \"high performance\" don't conflict as much as people expect.",
            },
            {
              question: "Why did Java choose single inheritance with interfaces, and how do default methods change that?",
              answer:
                "To avoid the diamond problem. With multiple class inheritance, if two parents define the same method or field, it's ambiguous which one the child gets. Java allows one superclass for state and implementation, and any number of interfaces for type.\n\nSince Java 8, interfaces can have `default` methods, so a class can inherit behaviour from several of them. Java still resolves the diamond explicitly: if two interfaces give conflicting defaults, the compiler forces the class to override the method, and it can pick one with `InterfaceName.super.method()`. Interfaces still can't have instance fields, so there's no state conflict.",
            },
            {
              question: "Why is Project Loom considered as significant as Java's original thread model?",
              answer:
                "Because it changes the cost model of the most common backend pattern. Thread-per-request has always been the simplest way to write a server, but platform threads are expensive, so under heavy I/O you either capped concurrency with pools or rewrote everything in reactive or async style, which is harder to write and debug.\n\nVirtual threads let you keep simple blocking code and still handle huge numbers of concurrent requests, with normal stack traces and debuggers. For most I/O-bound services that removes the main reason to go reactive.",
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
              question: "Your CI pipeline compiles with JDK 21, but production runs a Java 11 runtime. What happens on deploy and why?",
              answer:
                "The app fails to start with `UnsupportedClassVersionError`. The classes have major version 65, and a Java 11 runtime only accepts up to 55. It fails on the first class loaded, usually the main class, so nothing runs.\n\nThe proper fix is to align the environments, ideally by upgrading production. If that's not possible right now, build with `--release 11` and fix whatever no longer compiles. I reproduced the 21-on-17 version of this locally, and the error names both versions, so it's quick to diagnose once you've seen it.",
            },
            {
              question: "You're starting a new backend service today. Which Java version do you pick, and what do you weigh?",
              answer:
                "Java 25, the current LTS, unless something blocks it. Then Java 21, which is still well supported and already has virtual threads.\n\nWhat I'd weigh: whether our framework and key libraries support it (Spring Boot 3.x and 4.x need 17 or later), what base images and runtime vendors our platform uses, whether our monitoring agents support it, and how long the vendor supports that LTS. I wouldn't pick a non-LTS release for production unless we were ready to upgrade every six months.",
            },
            {
              question: "A teammate says \"Java is secure, so we don't need to worry about security.\" How do you respond?",
              answer:
                "I'd agree with the narrow part: memory safety removes buffer overflows and use-after-free, which are a huge share of vulnerabilities in C and C++.\n\nBut application security is a different layer. SQL injection, broken authentication, deserializing untrusted data and vulnerable dependencies all happen in Java. Log4Shell was a Java library vulnerability. So we still need parameterized queries, input validation, dependency scanning and regular patching of the JDK itself.",
            },
            {
              question: "A service handling many slow downstream HTTP calls runs out of threads under load. How could Java's features help?",
              answer:
                "The threads are mostly waiting on I/O, which is exactly the case virtual threads are for. On Java 21 or later, I'd move request handling to virtual threads (in Spring Boot that's `spring.threads.virtual.enabled=true`) so each request gets a cheap thread and blocking on the downstream call doesn't hold an OS thread.\n\nI'd also check for pinning, especially long `synchronized` blocks around I/O on Java 21, and add timeouts on the HTTP client. Virtual threads remove the thread limit, but the downstream service still has its own limit, so a bulkhead or rate limit on those calls still matters.",
            },
            {
              question: "A plugin loaded by class name works locally but fails in production with `ClassNotFoundException`. What do you check?",
              answer:
                "First, whether the class is actually on the production classpath. Dynamic loading means the compiler never checked that the JAR is packaged, so a dependency marked `provided` or left out of the fat JAR is the usual cause. Then I'd check that the fully qualified name in the config matches, including the package, and which class loader is doing the lookup, since app servers and plugin systems use separate loaders.\n\nRunning with `-Xlog:class+load` shows exactly which classes loaded from where. Longer term, I'd move to `ServiceLoader` so implementations are discovered from the JARs present, instead of a class name string in config.",
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
            "Write a program that starts three platform threads named `A`, `B` and `C`, each printing its name. Run it five times and write down the order each time.",
            "Add `join()` calls and a final line in `main` that prints only after all three threads finish.",
            "Change it to start 10,000 tasks that each `Thread.sleep(50)`, first with `Executors.newFixedThreadPool(100)` and then with `Executors.newVirtualThreadPerTaskExecutor()`. Time both.",
            "Compile the program with `--release 17` and check the major version with `javap -v`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: the order of `A`, `B` and `C` changes between runs, and nothing in the language says it shouldn't. The fixed pool of 100 needs 100 rounds of 50 ms, so at least 5 seconds. The virtual-thread version runs all 10,000 sleeps at once and finishes in well under a second. `javap` shows `major version: 61`.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "`newVirtualThreadPerTaskExecutor` needs Java 21, so the virtual-thread step won't compile with `--release 17`. Do step 4 on the platform-thread version.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PLATFORM INDEP.  bytecode runs on any JVM; JVM is per-OS
                 caveat: runtime version >= compile version
OBJECT-ORIENTED  classes + objects; primitives are not objects
SIMPLE           references yes, pointer arithmetic no
ROBUST           static types, checked exceptions,
                 bounds/null/cast checks, GC
SECURE           verifier, no raw memory, modules, TLS/JCA
                 Security Manager: disabled for good in 24
ARCH-NEUTRAL     int = 32 bits everywhere, defined overflow
MULTITHREADED    Thread, synchronized, memory model, j.u.c
                 virtual threads final in Java 21
HIGH PERF        interpreter + JIT; ~10x vs -Xint here
                 C/C++ still wins on startup and memory
DISTRIBUTED      java.net, HttpClient (11+), RMI (legacy)
DYNAMIC          lazy class loading, reflection, ServiceLoader

CLASS VERSION    Java N -> major 44+N  (8=52 17=61 21=65 25=69)
                 newer class on older JVM ->
                 UnsupportedClassVersionError; use --release`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "For every feature, know the problem it solved and which layer provides it: `javac`, the JVM or the library.",
            "Say \"no pointer arithmetic\", not \"no pointers\", and \"object-oriented, not purely\".",
            "Keep the stale parts out of interview answers: applets and the Security Manager are history. Virtual threads are the modern half of \"multithreaded\".",
          ],
        },
      ],
    },
  ],
};
