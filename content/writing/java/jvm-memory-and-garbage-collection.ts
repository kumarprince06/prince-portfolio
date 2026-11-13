import type { Lesson } from "../types";

export const jvmMemoryAndGarbageCollection: Lesson = {
  slug: "jvm-memory-and-garbage-collection",
  date: "2026-11-13",
  title: "JVM Memory Areas and Garbage Collection",
  description:
    "Back inside the JVM on JDK 21, measured rather than described: every memory area of a running process with Native Memory Tracking (a 256 MB heap inside 403 MB committed and 119 MB resident), GC roots and reachability, G1's regions, young, mixed and humongous collections read line by line from -Xlog:gc*, Serial, Parallel, G1, ZGC, generational ZGC and Shenandoah on the same workload (pauses from 227 ms down to 0.015 ms, and the allocation stalls and pacing that the pause numbers hide), soft, weak and phantom references, Cleaner and why finalize() could run a 256 MB heap out of memory, six kinds of OutOfMemoryError reproduced safely, heap dumps and class histograms, the classic leak patterns, and a trip cache in a ride-hailing backend that grew until G1 ran back-to-back full GCs.",
  tags: ["JVM", "Garbage Collection", "Memory", "Performance"],
  sections: [
    {
      title: "What JVM Memory and Garbage Collection Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Processing Annotations at Run Time and Compile Time, closed the Annotations phase with frameworks reading metadata through reflection, generating classes and creating proxies. Every one of those things lives somewhere: the `Class` objects and proxies on the heap, their metadata in Metaspace, the compiled code that calls them in the code cache, the threads that run them on native stacks. This phase goes back inside the JVM with everything the track has covered since the introduction, starting with where memory goes and how it comes back.",
        },
        {
          type: "paragraph",
          text: "The introduction already drew the map. The JVM lesson split the runtime into a class loader subsystem, runtime data areas and an execution engine, the Memory Allocation lesson showed a `new` turning into a pointer bump in a TLAB, and Stack vs Heap showed which area outlives which. What those lessons kept short is the other half of allocation: **garbage collection**, the part of the JVM that decides which heap objects are still needed and reuses the memory of the rest. In Java nothing is freed explicitly. An object is garbage when no chain of references from a **GC root** reaches it, and a collector finds the live ones by tracing.",
        },
        {
          type: "paragraph",
          text: "This lesson measures all of it on JDK 21: what a running process really uses (heap, Metaspace, code cache, thread stacks, direct memory), how G1 organises the heap into regions and what each line of its log means, how the other collectors behave on the same workload, how reference types and `Cleaner` interact with the collector, what each kind of `OutOfMemoryError` looks like, and how to find a leak with the tools that ship in the JDK. The next lesson does the same for the execution engine: the JIT compilers, profiling and tuning.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Garbage collection is older than Java by decades: John McCarthy described mark-and-sweep for Lisp in 1960, and Smalltalk and the Self project (whose team later built HotSpot) made generational, copying collectors practical. Java 1.0 shipped a simple stop-the-world mark-sweep-compact collector. Since then the story has been about two numbers: how much CPU the collector takes (throughput) and how long it stops the application (pause time). Each new collector moved more work out of the pause and into concurrent threads.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "Single-threaded, stop-the-world mark-sweep-compact", "Every collection stopped the whole program"],
            ["Java 1.2 (1998)", "`java.lang.ref`: `SoftReference`, `WeakReference`, `PhantomReference`, `WeakHashMap`", "Code can cooperate with the collector"],
            ["Java 1.3 (2000)", "HotSpot becomes the default VM, with a generational collector", "Young and old generations"],
            ["Java 1.4 (2002)", "Parallel young collector, CMS (1.4.1), NIO direct buffers", "Multi-threaded collection; memory outside the heap"],
            ["Java 5 (2004)", "GC ergonomics, `java.lang.management` memory and GC beans", "The JVM picks a collector and sizes the heap by itself"],
            ["Java 7u4 (2012)", "G1 fully supported", "Region-based, pause-time goals"],
            ["Java 8 (2014)", "PermGen removed, class metadata moves to native Metaspace (JEP 122)", "`OutOfMemoryError: Metaspace` replaces `PermGen space`"],
            ["Java 9 (2017)", "G1 becomes the default (JEP 248); unified logging `-Xlog` (JEP 158, 271); `Object.finalize` deprecated; `Cleaner` added", "The log format used throughout this lesson"],
            ["Java 11 (2018)", "ZGC (experimental, JEP 333), Epsilon no-op GC (JEP 318), JFR open-sourced (JEP 328)", "Sub-millisecond pauses become possible"],
            ["Java 12 (2019)", "Shenandoah (experimental, JEP 189); G1 returns unused memory to the OS (JEP 346)", "A second concurrent compacting collector"],
            ["Java 14 (2020)", "CMS removed (JEP 363)", "G1 replaces it"],
            ["Java 15 (2020)", "ZGC and Shenandoah production-ready (JEP 377, 379)", ""],
            ["Java 16 (2021)", "Elastic Metaspace (JEP 387)", "Metaspace returns memory after class unloading"],
            ["Java 18 (2022)", "Finalization deprecated for removal, `--finalization=disabled` (JEP 421)", "`finalize()` is on its way out"],
            ["Java 21 (2023)", "Generational ZGC, opt-in with `-XX:+ZGenerational` (JEP 439)", "The JDK used in this lesson"],
            ["Java 23 / 24", "Generational mode becomes ZGC's default (JEP 474), then the only mode (JEP 490)", "`-XX:+ZGenerational` is only needed on 21 and 22"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a large food court at a Kolkata mall, with a cleaning crew that has to keep tables free without throwing anyone out mid-meal.",
        },
        {
          type: "list",
          items: [
            "**The tables are heap regions.** New customers are always seated in the quick-service section (eden). Most of them eat and leave within minutes: the generational hypothesis.",
            "**A young collection** is the crew clearing the whole quick-service section at once. They don't wipe table by table; they move the few people still eating to a small holding area (survivor space) and reset the entire section. The work depends on how many people are **still eating**, not on how many came and went.",
            "**Promotion** is moving the regulars who stay for hours to the cafe section (old generation). Cleaning the cafe is more expensive, so the crew first walks around noting which tables are empty while people keep eating (concurrent marking), then clears the emptiest cafe tables first (G1's mixed collections, the \"garbage first\" in its name).",
            "**A humongous object** is a wedding party of forty that needs several adjacent tables booked directly in the cafe section.",
            "**Stop-the-world** is the doors being closed for a moment while tables are moved. Serial and Parallel close the doors for every clean-up; ZGC and Shenandoah keep them open and only close them for a few seconds to put up signs.",
            "**A memory leak** is a \"reserved\" card left on tables for people who are never coming back: the tables are empty in every way that matters, but the crew isn't allowed to touch them.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: in a food court, people leave on their own and the crew can see an empty chair. In the JVM an object never \"leaves\". It stays exactly where it is, and it's garbage only when nothing reachable points at it any more. The crew has to start from the roots (the people at the door, the staff, the reservation book) and follow every reference to decide who still counts as present. That tracing is the real cost, and it's why a leak is a **reachability** bug, not a forgotten `free`.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java/jvm-memory-and-garbage-collection-g1-regions.svg",
          alt: "Left: the memory of one JVM process measured with Native Memory Tracking on JDK 21, for a 256 MB heap. Java heap: 256 MB reserved and committed. Class space: 1 GB reserved, almost nothing committed. Metaspace: 64 MB reserved, 1 MB committed. Shared class space (CDS): 13 MB committed. Code cache: 242 MB reserved, 7 MB committed. Thread stacks: 38 threads, 38 MB reserved, 3 MB committed. GC data structures: 54 MB. Direct ByteBuffer, shown as Other: 64 MB. Total committed 403 MB, resident 119 MB. Right: a G1 heap as a grid of equal 1 MB regions labelled E for eden, S for survivor, O for old and H for humongous, with a 3 MB array occupying four consecutive H regions. Below, the G1 cycle as five boxes connected by arrows: young collections, Concurrent Start when old occupancy passes about 45 percent, concurrent mark, Remark and Cleanup pauses, then mixed collections that evacuate young regions plus the old regions with the most garbage, and back to young collections. A Full GC box on the side is reached only when evacuation fails.",
          caption: "One JVM process is much more than its heap, and G1 manages the heap as equal regions that change role over time.",
        },
        {
          type: "heading",
          text: "The runtime data areas, at depth",
        },
        {
          type: "table",
          headers: ["Area", "Shared or per thread", "What lives there", "Sized by", "When it runs out"],
          rows: [
            ["Java heap", "Shared", "Every object and array, including `Class` mirrors and interned strings", "`-Xms`, `-Xmx`, `-XX:MaxRAMPercentage`", "`OutOfMemoryError: Java heap space`"],
            ["Metaspace", "Shared (native)", "Class metadata: methods, bytecode, constant pools, per class loader", "`-XX:MaxMetaspaceSize` (unlimited by default)", "`OutOfMemoryError: Metaspace`"],
            ["Compressed class space", "Shared (native)", "The `Klass` structures that compressed class pointers point to", "`-XX:CompressedClassSpaceSize` (1 GB reserved)", "`OutOfMemoryError: Compressed class space`"],
            ["Code cache", "Shared (native)", "JIT-compiled methods, adapters, interpreter stubs", "`-XX:ReservedCodeCacheSize` (240 MB here)", "\"CodeCache is full. Compiler has been disabled.\""],
            ["Thread stacks", "Per thread (native)", "Frames: locals, operand stacks, return addresses", "`-Xss` (1 MB default on Linux x64)", "`StackOverflowError`, or `unable to create native thread`"],
            ["Direct memory", "Shared (native)", "`ByteBuffer.allocateDirect`, NIO and Netty buffers", "`-XX:MaxDirectMemorySize` (defaults to the max heap size)", "`OutOfMemoryError: Cannot reserve ... direct buffer memory`"],
            ["GC structures", "Shared (native)", "Card tables, remembered sets, mark bitmaps", "Grows with heap size and the collector", "Rarely the culprit, but visible in NMT"],
          ],
        },
        {
          type: "heading",
          text: "The vocabulary of collection",
        },
        {
          type: "table",
          headers: ["Term", "Meaning", "Where it shows up"],
          rows: [
            ["GC root", "A reference the collector treats as live without asking: locals in live frames, static fields, JNI handles, monitors held, the JVM's own references", "The starting points of every trace"],
            ["Reachable", "There is a chain of references from a root", "Live, survives the collection"],
            ["Minor (young) collection", "Collects only the young generation", "`Pause Young` in G1, Serial and Parallel logs"],
            ["Major / full collection", "Collects the old generation, or the whole heap", "`Pause Full`, which in G1 means something went wrong"],
            ["Evacuation (copying)", "Copy the live objects out of a region, then reuse the whole region", "G1, Serial and Parallel young collections, ZGC, Shenandoah"],
            ["Stop-the-world (STW) pause", "All application threads stopped at a safepoint", "Every `Pause ...` line"],
            ["Concurrent phase", "GC work done while the application runs", "`Concurrent Mark Cycle` in G1, most of ZGC and Shenandoah"],
            ["Promotion / tenuring", "Moving an object that survived enough young collections to the old generation", "`Old regions: 63->51`, tenuring threshold"],
            ["Humongous object", "In G1, an object at least half a region in size, allocated in its own contiguous regions", "`Humongous regions: 4->0`"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The JVM lesson listed the runtime data areas; here I wanted to see their real sizes in a process. Native Memory Tracking (NMT) makes the JVM account for every byte of native memory it allocates, by category. It costs a little performance, so it's off unless asked for:",
        },
        {
          type: "code",
          language: "java",
          title: "MemoryAreas.java",
          code: `import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;

public class MemoryAreas {
    record Trip(long id, String zone, long farePaise) {}

    public static void main(String[] args) throws Exception {
        List<Trip> trips = new ArrayList<>();                       // heap
        for (int i = 0; i < 200_000; i++) trips.add(new Trip(i, "SALT-LAKE", 14_500));
        ByteBuffer direct = ByteBuffer.allocateDirect(64 * 1024 * 1024);   // direct memory, off-heap
        CountDownLatch done = new CountDownLatch(1);
        for (int t = 0; t < 20; t++) {                              // 20 more thread stacks
            new Thread(() -> { try { done.await(); } catch (InterruptedException e) { } }, "worker-" + t).start();
        }
        System.out.println("pid " + ProcessHandle.current().pid() + ", trips " + trips.size()
                + ", direct " + direct.capacity() / (1024 * 1024) + " MB");
        Thread.sleep(30_000);                                       // time to run jcmd
        done.countDown();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xms256m -Xmx256m -XX:NativeMemoryTracking=summary MemoryAreas &
jcmd MemoryAreas VM.native_memory summary scale=MB`,
        },
        {
          type: "output",
          text: `Total: reserved=1763MB, committed=403MB
       malloc: 86MB #10050
       mmap:   reserved=1677MB, committed=317MB

-                 Java Heap (reserved=256MB, committed=256MB)
                            (mmap: reserved=256MB, committed=256MB, at peak)

-                     Class (reserved=1024MB, committed=0MB)
                            (classes #735)
                            (  instance classes #628, array classes #107)
                            (mmap: reserved=1024MB, committed=0MB, at peak)
...
-                    Thread (reserved=38MB, committed=3MB)
                            (threads #38)
                            (stack: reserved=38MB, committed=3MB, peak=3MB)

-                      Code (reserved=242MB, committed=7MB)
                            (mmap: reserved=242MB, committed=7MB, at peak)

-                        GC (reserved=54MB, committed=54MB)
                            (malloc=17MB #1786) (at peak)
                            (mmap: reserved=37MB, committed=37MB, at peak)
...
-                     Other (reserved=64MB, committed=64MB)
                            (malloc=64MB #1) (at peak)
...
-        Shared class space (reserved=16MB, committed=13MB, readonly=0MB)
                            (mmap: reserved=16MB, committed=13MB, peak=13MB)
...
-                 Metaspace (reserved=64MB, committed=1MB)
                            (mmap: reserved=64MB, committed=1MB, at peak)`,
        },
        {
          type: "list",
          items: [
            "**The heap is 256 MB of a 403 MB process.** The rest is native memory the JVM needs to run: 54 MB of GC data structures (G1's card table, remembered sets and mark bitmaps scale with heap size), 13 MB of the CDS archive, 7 MB of compiled code, and the 64 MB direct buffer, which NMT files under `Other` as a single `malloc`. A container limit has to cover all of it, not just `-Xmx`.",
            "**Reserved is not committed, and committed is not resident.** The JVM reserved 1,763 MB of address space (1 GB of it is the compressed class space, 242 MB the code cache) but committed 403 MB. `ps -o rss` reported **121,788 KB** resident at the same moment: `-Xms256m` commits the whole heap, but Linux only backs pages with physical memory when they're first touched, and this program touched about 20 MB of heap. `-XX:+AlwaysPreTouch` would make all 256 MB resident at startup.",
            "**38 threads for a program that started 21.** The other 17 are the JVM's own: GC workers, the JIT compiler threads, the reference handler, the finalizer, signal dispatcher and the service thread. Their stacks reserve 1 MB each and commit only what's used (3 MB in total).",
            "**735 classes, but Metaspace used only 0.5 MB.** `jcmd MemoryAreas GC.heap_info` reported `Metaspace used 469K`. Most JDK classes came from the CDS archive (the 13 MB shared class space), which is mapped from a file rather than parsed into Metaspace. The next lesson measures what that does for startup.",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: `jcmd MemoryAreas GC.heap_info
jcmd MemoryAreas Compiler.codecache`,
        },
        {
          type: "output",
          text: ` garbage-first heap   total 262144K, used 19506K [0x00000000f0000000, 0x0000000100000000)
  region size 1024K, 16 young (16384K), 0 survivors (0K)
 Metaspace       used 469K, committed 640K, reserved 1114112K
  class space    used 41K, committed 128K, reserved 1048576K

CodeHeap 'non-profiled nmethods': size=120028Kb used=76Kb max_used=76Kb free=119951Kb
CodeHeap 'profiled nmethods': size=120028Kb used=161Kb max_used=161Kb free=119867Kb
CodeHeap 'non-nmethods': size=5704Kb used=1293Kb max_used=1293Kb free=4410Kb
CodeCache: size=245760Kb, used=1530Kb, max_used=1530Kb, free=244228Kb
 total_blobs=561, nmethods=161, adapters=306, full_count=0`,
        },
        {
          type: "paragraph",
          text: "The heap is G1 with 1 MB regions, 16 of them currently young. 200,000 `Trip` records at 32 bytes each plus the `ArrayList`'s array make up most of the 19.5 MB used. The code cache is split into three segments: non-method code (interpreter, stubs), **profiled** methods (C1 code that still collects statistics) and **non-profiled** methods (C2's final code). The next lesson follows a method through all three.",
        },
        {
          type: "heading",
          text: "One G1 young collection, line by line",
        },
        {
          type: "paragraph",
          text: "`-Xlog:gc` prints one line per collection. `-Xlog:gc*` turns on every GC tag, which shows what happened inside a pause. This is the first collection of the `TripAllocator` workload from the G1 section below, with a 128 MB heap:",
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx128m -Xlog:gc* TripAllocator",
        },
        {
          type: "output",
          text: `[0.007s][info][gc,init] Heap Region Size: 1M
[0.007s][info][gc,init] Heap Initial Capacity: 122M
[0.007s][info][gc,init] Heap Max Capacity: 128M
[0.007s][info][gc,init] Parallel Workers: 8
[0.007s][info][gc,init] Concurrent Workers: 2
...
[0.070s][info][gc,start    ] GC(0) Pause Young (Normal) (G1 Evacuation Pause)
[0.070s][info][gc,task     ] GC(0) Using 2 workers of 8 for evacuation
[0.071s][info][gc,phases   ] GC(0)   Pre Evacuate Collection Set: 0.07ms
[0.071s][info][gc,phases   ] GC(0)   Merge Heap Roots: 0.02ms
[0.071s][info][gc,phases   ] GC(0)   Evacuate Collection Set: 0.93ms
[0.071s][info][gc,phases   ] GC(0)   Post Evacuate Collection Set: 0.13ms
[0.071s][info][gc,phases   ] GC(0)   Other: 0.21ms
[0.071s][info][gc,heap     ] GC(0) Eden regions: 23->0(62)
[0.071s][info][gc,heap     ] GC(0) Survivor regions: 0->2(3)
[0.071s][info][gc,heap     ] GC(0) Old regions: 2->2
[0.071s][info][gc,heap     ] GC(0) Humongous regions: 4->0
[0.071s][info][gc,metaspace] GC(0) Metaspace: 82K(320K)->82K(320K) NonClass: 76K(192K)->76K(192K) Class: 5K(128K)->5K(128K)
[0.071s][info][gc          ] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 28M->2M(124M) 1.543ms
[0.071s][info][gc,cpu      ] GC(0) User=0.00s Sys=0.01s Real=0.00s`,
        },
        {
          type: "list",
          items: [
            "**Why it ran:** `G1 Evacuation Pause` means eden was full; the allocating thread couldn't get a new TLAB, so the JVM brought all threads to a safepoint.",
            "**The phases:** *Merge Heap Roots* gathers the roots plus the remembered sets (old-to-young references recorded by the write barrier, so G1 doesn't have to scan the whole old generation). *Evacuate Collection Set* is the real work: trace from those roots and **copy** every live object out of the 23 eden regions. It took 0.93 ms of the 1.54 ms pause.",
            "**The region counts:** eden went from 23 regions to 0, and the survivors fit in 2 regions. 28 MB of heap before, 2 MB after: 93% of what was allocated was already garbage, and garbage costs nothing to collect because nothing visits it.",
            "**`Humongous regions: 4->0`:** a 3 MB report array needs four 1 MB regions (3 MB plus a 16-byte header doesn't fit in three). It was already unreachable, and G1 reclaims dead humongous objects eagerly during a young pause instead of waiting for a full marking cycle.",
            "**The number in brackets** is the future: `(62)` is how many eden regions G1 will allow next time. G1 resizes the young generation after every pause to meet its pause-time goal (`-XX:MaxGCPauseMillis`, 200 ms by default).",
          ],
        },
      ],
    },
    {
      title: "Reachability and GC Roots",
      blocks: [
        {
          type: "paragraph",
          text: "The Memory Allocation lesson drew roots and reachability as a diagram. I wanted to watch each kind of root keep an object alive, using a `WeakReference` as a probe: it doesn't keep its target alive, and `get()` returns `null` once the collector has cleared it.",
        },
        {
          type: "code",
          language: "java",
          title: "GcRoots.java",
          code: `import java.lang.ref.WeakReference;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

public class GcRoots {
    static class Driver { String name; Driver partner; Driver(String n) { name = n; } }

    static Driver onShift;                                        // root: a static field

    public static void main(String[] args) throws Exception {
        onShift = new Driver("Ravi");
        WeakReference<Driver> viaStatic = new WeakReference<>(onShift);

        CountDownLatch release = new CountDownLatch(1);
        AtomicReference<WeakReference<Driver>> viaThread = new AtomicReference<>();
        CountDownLatch started = new CountDownLatch(1);
        Thread worker = new Thread(() -> {
            Driver local = new Driver("Asha");                    // root: a local in a live frame
            viaThread.set(new WeakReference<>(local));
            started.countDown();
            try { release.await(); } catch (InterruptedException e) { }
            System.out.println("worker still using " + local.name);
        });
        worker.start();
        started.await();

        Driver a = new Driver("Imran"), b = new Driver("Meera");
        a.partner = b;
        b.partner = a;                                            // a cycle
        WeakReference<Driver> viaCycle = new WeakReference<>(a);
        a = null;
        b = null;                                                 // nothing outside the cycle points in

        System.gc();
        System.out.println("held by static field:   " + (viaStatic.get() != null));
        System.out.println("held by thread's local: " + (viaThread.get().get() != null));
        System.out.println("only held by a cycle:   " + (viaCycle.get() != null));

        release.countDown();
        worker.join();
        System.gc();
        System.out.println("after the thread ended: " + (viaThread.get().get() != null));
    }
}`,
        },
        {
          type: "output",
          text: `held by static field:   true
held by thread's local: true
only held by a cycle:   false
worker still using Asha
after the thread ended: false`,
        },
        {
          type: "list",
          items: [
            "**A static field is a root** for as long as its class is loaded, which for classes on the application class path means the life of the JVM. That's why every leak pattern later in this lesson starts with `static`.",
            "**A local variable in a live frame is a root**, on any thread. `Asha` survived a full `System.gc()` because the worker's frame was still active. Once the thread finished, its stack was gone and the object was collected.",
            "**Cycles don't matter.** `Imran` and `Meera` point at each other, and a reference-counting scheme would keep both forever. A tracing collector never reaches them from a root, so they're garbage. This is the main reason the JVM traces instead of counting.",
            "A subtle one I kept out of the test on purpose: the JIT is allowed to treat a local as dead **after its last use**, even while the method is still running. A compiled method can let an object be collected before the method returns. `Reference.reachabilityFence(obj)` exists to prevent that when it matters, for example when a `Cleaner` would close a resource that native code is still using.",
          ],
        },
        {
          type: "table",
          headers: ["Root kind", "Example", "Lives as long as"],
          rows: [
            ["Local variables and operands in live frames", "`Driver local` in a running method", "The frame (or the last use, once compiled)"],
            ["Static fields", "`static Map CACHE`", "The class, which means the class loader"],
            ["Active threads", "Every `Thread` object that has started and not ended", "The thread"],
            ["JNI references", "Global references held by native code", "Until native code deletes them"],
            ["Monitors", "Objects currently locked with `synchronized`", "The lock"],
            ["JVM internals", "The system class loader, interned strings table, `Class` mirrors of loaded classes", "The JVM, or the defining loader"],
          ],
        },
      ],
    },
    {
      title: "G1 in Detail: Regions, Young, Mixed and Humongous Collections",
      blocks: [
        {
          type: "paragraph",
          text: "G1 divides the heap into equal regions (1 MB to 32 MB on JDK 21, chosen as the heap size divided by about 2,048) and gives each one a role: eden, survivor, old, humongous or free. A young collection evacuates all eden and survivor regions. Old regions are only collected after a concurrent marking cycle has measured how much garbage each one holds, and then G1 picks the ones with the most garbage first. I wrote a workload with all three lifetimes: quotes that die immediately, trips that live for a while and then die old, and an occasional 3 MB report:",
        },
        {
          type: "code",
          language: "java",
          title: "TripAllocator.java",
          code: `public class TripAllocator {
    record Trip(long id, String zone, long farePaise, byte[] route) {}

    static byte[] lastQuote;                             // the quote escapes, so the JIT can't remove it

    public static void main(String[] args) {
        Trip[] active = new Trip[20_000];                // trips in progress: live for a while, then replaced
        long start = System.nanoTime();
        for (long i = 0; i < 20_000_000; i++) {
            lastQuote = new byte[200];                   // a fare quote: garbage by the next iteration
            if (i % 64 == 0) {                           // one in 64 quotes becomes a trip
                Trip t = new Trip(i, (i % 128 == 0) ? "SALT-LAKE" : "NEW-TOWN", 10_000 + i % 5_000, new byte[512]);
                active[(int) ((i / 64) % active.length)] = t;   // the trip it replaces is now garbage
            }
            if (i % 2_000_000 == 0) {
                lastQuote = new byte[3 * 1024 * 1024];   // a 3 MB report: humongous with 1 MB regions
            }
        }
        System.out.println("done in " + (System.nanoTime() - start) / 1_000_000 + " ms");
    }
}`,
        },
        {
          type: "callout",
          tone: "warning",
          title: "My first version allocated almost nothing",
          text: "The first draft created each quote as a local `byte[]` that never left the loop body, and the GC log showed 4 collections for what should have been 4 GB of allocation. Escape analysis had removed the quotes entirely, the same surprise the JVM lesson hit with `Churn`. Storing the quote in a static field makes it escape, which is what a real request object does when it's handed to another layer.",
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx128m -Xlog:gc TripAllocator",
        },
        {
          type: "output",
          text: `[0.002s][info][gc] Using G1
[0.042s][info][gc] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 28M->2M(124M) 1.312ms
[0.068s][info][gc] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 65M->4M(124M) 2.406ms
[0.079s][info][gc] GC(2) Pause Young (Normal) (G1 Evacuation Pause) 73M->8M(124M) 3.324ms
[0.088s][info][gc] GC(3) Pause Young (Normal) (G1 Evacuation Pause) 74M->10M(124M) 2.839ms
...
[0.229s][info][gc] GC(17) Pause Young (Normal) (G1 Evacuation Pause) (Evacuation Failure) 120M->56M(128M) 2.609ms
[0.237s][info][gc] GC(18) Pause Young (Normal) (G1 Evacuation Pause) 120M->59M(128M) 2.378ms
[0.247s][info][gc] GC(19) Pause Young (Normal) (G1 Evacuation Pause) (Evacuation Failure) 124M->107M(128M) 3.488ms
[0.249s][info][gc] GC(20) Pause Young (Concurrent Start) (G1 Evacuation Pause) 120M->107M(128M) 1.144ms
[0.249s][info][gc] GC(21) Concurrent Mark Cycle
[0.252s][info][gc] GC(22) Pause Young (Normal) (G1 Evacuation Pause) 118M->108M(128M) 1.009ms
[0.254s][info][gc] GC(23) Pause Young (Normal) (G1 Evacuation Pause) 119M->108M(128M) 0.931ms
[0.256s][info][gc] GC(21) Pause Remark 113M->69M(128M) 0.405ms
[0.257s][info][gc] GC(24) Pause Young (Normal) (G1 Evacuation Pause) 74M->65M(128M) 0.855ms
[0.261s][info][gc] GC(21) Pause Cleanup 95M->95M(128M) 0.141ms
[0.262s][info][gc] GC(21) Concurrent Mark Cycle 12.301ms
[0.266s][info][gc] GC(25) Pause Young (Prepare Mixed) (G1 Evacuation Pause) 119M->67M(128M) 1.419ms
[0.273s][info][gc] GC(26) Pause Young (Mixed) (G1 Evacuation Pause) 119M->57M(128M) 1.933ms
[0.282s][info][gc] GC(27) Pause Young (Mixed) (G1 Evacuation Pause) (Evacuation Failure) 119M->49M(128M) 2.444ms
...
[0.379s][info][gc] GC(44) Pause Young (Concurrent Start) (G1 Humongous Allocation) 28M->19M(79M) 1.544ms
...
done in 723 ms`,
        },
        {
          type: "paragraph",
          text: "Reading the run from top to bottom, it's one complete G1 cycle:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Young collections (GC 0 to 19).** Each one empties eden. The \"after\" number climbs by about 3 MB per collection (2M, 4M, 8M, 10M...): those are trips that survived long enough to be promoted to old regions, and most of them die later, **in the old generation**, where a young collection can't reclaim them.",
            "**Concurrent Start (GC 20).** Once old regions pass the initiating heap occupancy threshold (`-XX:InitiatingHeapOccupancyPercent`, 45% by default and adapted at run time), G1 piggybacks the start of marking on a young pause and launches **Concurrent Mark Cycle** `GC(21)` on 2 background threads.",
            "**Young collections keep happening during marking** (GC 22, 23): the cycle is concurrent, and the application keeps allocating.",
            "**Remark (0.4 ms).** A short pause to finish marking. Heap usage dropped from 113 MB to 69 MB **in a 0.4 ms pause**: old regions that marking found completely empty are freed immediately, without copying anything.",
            "**Cleanup (0.14 ms)** finalises the per-region liveness and sorts the candidate old regions by how much garbage they hold.",
            "**Prepare Mixed, then Mixed (GC 25 to 27).** The mixed collections evacuate eden plus a slice of the most-garbage old regions each time (`-XX:G1MixedGCCountTarget` spreads the candidates over up to 8 mixed pauses). In a second run with `-Xlog:gc*`, `Old regions: 63->51` then `51->45` showed the old generation shrinking while every pause stays near 2 ms.",
            "**Humongous Allocation (GC 44).** Allocating the 3 MB report can itself trigger a concurrent cycle, because a humongous object goes straight into old regions. The Arrays lesson mentioned this cost; here it is in the log.",
          ],
        },
        {
          type: "heading",
          text: "What Evacuation Failure means",
        },
        {
          type: "paragraph",
          text: "Some pauses are marked `(Evacuation Failure)`. G1 ran out of free regions to copy survivors into, so it left those objects where they were and turned their regions into old regions. That's G1's warning sign: it's working with too little headroom. With 128 MB and a steady stream of medium-lived trips, it happened 8 times in this run. With `-Xmx256m` the same program ran 40 young collections, no failures, and never even needed a marking cycle. If failures continue, the next step is a **Full GC** (`Pause Full (G1 Compaction Pause)`): a single-threaded-per-region, stop-the-world compaction of the whole heap, which the production section below runs into.",
        },
        {
          type: "table",
          headers: ["Log line", "Pause or concurrent", "What triggered it"],
          rows: [
            ["`Pause Young (Normal) (G1 Evacuation Pause)`", "Pause", "Eden is full"],
            ["`Pause Young (Concurrent Start)`", "Pause, then starts concurrent marking", "Old occupancy passed the IHOP, or a humongous allocation"],
            ["`Concurrent Mark Cycle`", "Concurrent", "Finds live objects in old regions"],
            ["`Pause Remark`", "Pause", "Finishes marking, frees fully empty regions, processes references"],
            ["`Pause Cleanup`", "Pause", "Sorts old regions by reclaimable space"],
            ["`Pause Young (Prepare Mixed)`", "Pause", "The last young-only pause before mixed collections"],
            ["`Pause Young (Mixed)`", "Pause", "Eden plus the best old regions"],
            ["`(Evacuation Failure)`", "Annotation on a pause", "No free regions to copy into"],
            ["`Pause Full (G1 Compaction Pause)`", "Long pause", "Evacuation failed repeatedly, or `System.gc()`"],
          ],
        },
      ],
    },
    {
      title: "Comparing Collectors on the Same Workload",
      blocks: [
        {
          type: "paragraph",
          text: "The JVM lesson listed the collectors in a table. I wanted numbers from one workload with a meaningful live set: 600,000 active trips (about 190 MB live after promotion), a stream of short-lived request garbage, and a trip replaced every 20 requests, so the old generation constantly gains new objects and loses old ones. Same 512 MB heap for every collector.",
        },
        {
          type: "code",
          language: "java",
          title: "GcCompare.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class GcCompare {
    record Trip(long id, String zone, long farePaise, long[] route) {}

    static Object sink;                                   // makes every quote escape

    public static void main(String[] args) {
        Map<Long, Trip> active = new HashMap<>();         // about 180 MB of trips that stay live
        for (long id = 0; id < 600_000; id++) active.put(id, new Trip(id, "SALT-LAKE", 14_500, new long[24]));
        long start = System.nanoTime();
        for (long i = 0; i < 30_000_000; i++) {
            sink = new long[16];                          // short-lived request garbage
            if (i % 20 == 0) {                            // a trip finishes and a new one starts
                long id = i % 600_000;
                active.put(id, new Trip(id, "NEW-TOWN", 15_000, new long[24]));
            }
        }
        System.out.println("trips " + active.size() + ", " + (System.nanoTime() - start) / 1_000_000 + " ms");
    }
}`,
        },
        {
          type: "paragraph",
          text: "Pause lines have a different shape for each collector, so I summarised each log with a small script: the number of stop-the-world pauses, their total and maximum, plus ZGC's allocation stalls and Shenandoah's pacing, which turned out to matter more than the pauses:",
        },
        {
          type: "code",
          language: "bash",
          title: "gcsummary.sh",
          code: `#!/bin/bash
# usage: ./gcsummary.sh gc.log   (a file written with -Xlog:gc*)
grep -E "\\]\\[(gc|gc,phases) *\\] GC\\([0-9]+\\) (Y: |O: )?Pause" "$1" | sed -E 's/.* ([0-9.]+)ms$/\\1/' |
  awk '{n++; t+=$1; if ($1 > m) m = $1} END {printf "  pauses %3d  total %6.1f ms  max %7.3f ms", n, t, m}'
grep -E "\\[gc *\\] Allocation Stall" "$1" | sed -E 's/.* ([0-9.]+)ms$/\\1/' |
  awk '{t+=$1} END {printf "  stalls %4.0f ms", t}'
grep -E "\\] Pacing +=" "$1" | awk '{printf "  pacing %s s", $5}'
echo`,
        },
        {
          type: "code",
          language: "bash",
          code: `for gc in "-XX:+UseSerialGC" "-XX:+UseParallelGC" "-XX:+UseG1GC" "-XX:+UseZGC" \\
          "-XX:+UseZGC -XX:+ZGenerational" "-XX:+UseShenandoahGC"; do
  java -Xms512m -Xmx512m $gc -Xlog:gc*:file=gc.log GcCompare
  ./gcsummary.sh gc.log
done`,
        },
        {
          type: "output",
          text: `trips 600000, 2201 ms
  pauses  34  total 1500.0 ms  max 227.434 ms  stalls    0 ms
trips 600000, 867 ms
  pauses  50  total  333.4 ms  max  31.422 ms  stalls    0 ms
trips 600000, 784 ms
  pauses  24  total  148.0 ms  max  12.265 ms  stalls    0 ms
trips 600000, 1856 ms
  pauses  57  total    0.5 ms  max   0.044 ms  stalls  983 ms
trips 600000, 1132 ms
  pauses  18  total    0.2 ms  max   0.077 ms  stalls   17 ms
trips 600000, 2502 ms
  pauses 112  total   10.9 ms  max   0.490 ms  stalls    0 ms  pacing 1.499 s`,
        },
        {
          type: "table",
          headers: ["Collector", "Loop time", "STW pauses", "Longest pause", "Hidden cost"],
          rows: [
            ["Serial", "2,201 ms", "34, total 1,500 ms", "227 ms", "One thread does all the copying"],
            ["Parallel", "867 ms", "50, total 333 ms", "31 ms", "None; best throughput class"],
            ["G1 (default)", "784 ms", "24, total 148 ms", "12 ms", "Concurrent marking threads"],
            ["ZGC, single generation", "1,856 ms", "57, total 0.5 ms", "0.044 ms", "**983 ms of allocation stalls**"],
            ["ZGC, generational", "1,132 ms", "18, total 0.2 ms", "0.077 ms", "17 ms of allocation stalls"],
            ["Shenandoah", "2,502 ms", "112, total 10.9 ms", "0.49 ms", "**1.5 s of pacing delays**"],
          ],
        },
        {
          type: "list",
          items: [
            "**Serial and Parallel: the same algorithm, different thread counts.** Both stop the world for every young collection. The first pauses were the longest (Serial's GC(0) took 132 to 227 ms across runs) because they had to copy the freshly built 180 MB live set into the old generation. Parallel did the same work with 8 threads in a quarter of the time.",
            "**G1 had the best throughput here and the shortest worst case of the stop-the-world collectors.** It's the default for a reason.",
            "**ZGC's pauses really are tiny** (44 microseconds at most, independent of heap size), because marking, relocation and reference updating all happen concurrently. But single-generation ZGC has to mark the **whole** 190 MB live set on every cycle, and at this allocation rate in a 512 MB heap it couldn't finish in time: `Allocation Stall (main) 78.853ms` lines appeared, where the allocating thread simply waited for memory. Almost a second of stalls in total. Those don't show up in any pause metric.",
            "**Generational ZGC fixed that** by collecting the young generation often and cheaply, the same bet G1 makes: stalls dropped from 983 ms to 17 ms, with the same sub-millisecond pauses. This is why it became ZGC's only mode in Java 24.",
            "**Shenandoah is in this JDK** (`java -XX:+UseShenandoahGC -version` works on this Ubuntu build; some vendors leave it out). Its pauses stayed under half a millisecond, but its **pacer** slowed the allocating thread down by 1.5 s in total so the concurrent collector could keep up. Pacing delays are also invisible in pause metrics; the log's statistics block says so in as many words.",
            "**The lesson I took away:** \"pause time\" is not \"latency\". Concurrent collectors move the cost into stalls, pacing and CPU taken from the application. And this workload is deliberately hostile (a huge allocation rate with a large live set in a small heap); with more headroom ZGC and Shenandoah stall far less. Numbers moved by up to 50% between runs on this laptop, but the ranking never changed.",
          ],
        },
        {
          type: "paragraph",
          text: "For reference, this is what one entry looks like in each log, because recognising the format is half of reading a GC log in production:",
        },
        {
          type: "output",
          text: `# Serial
[0.548s][info][gc          ] GC(5) Pause Young (Allocation Failure) 326M->189M(494M) 18.254ms
# Parallel
[0.327s][info][gc          ] GC(5) Pause Young (Allocation Failure) 316M->187M(420M) 9.129ms
# ZGC, single generation
[0.632s][info][gc          ] Allocation Stall (main) 78.853ms
[0.961s][info][gc,phases   ] GC(5) Pause Mark Start 0.018ms
[0.319s][info][gc          ] GC(0) Garbage Collection (Warmup) 136M(27%)->184M(36%)
# ZGC, generational (Y: young, O: old)
[0.518s][info][gc,phases   ] GC(5) Y: Pause Mark Start (Major) 0.009ms
[0.264s][info][gc          ] GC(2) Minor Collection (Allocation Rate)
# Shenandoah
[0.522s][info][gc          ] GC(5) Pause Init Mark (unload classes) 0.044ms
[0.564s][info][gc          ] GC(5) Concurrent marking (unload classes) 41.579ms`,
        },
      ],
    },
    {
      title: "Reference Types, Cleaner and the End of finalize",
      blocks: [
        {
          type: "paragraph",
          text: "`java.lang.ref` lets code hold a reference that the collector is allowed to clear. There are four strengths: strong (every normal reference), soft (cleared only under memory pressure), weak (cleared at the next collection that finds the target only weakly reachable) and phantom (never returns its target; only tells you, through a queue, that the object has been collected). I tested all of them, plus `WeakHashMap` and `Cleaner`, in one program with a 64 MB heap:",
        },
        {
          type: "code",
          language: "java",
          title: "RefTypes.java",
          code: `import java.lang.ref.Cleaner;
import java.lang.ref.PhantomReference;
import java.lang.ref.Reference;
import java.lang.ref.ReferenceQueue;
import java.lang.ref.SoftReference;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.WeakHashMap;

public class RefTypes {
    record Trip(String id) {}

    static final Cleaner CLEANER = Cleaner.create();

    public static void main(String[] args) throws Exception {
        ReferenceQueue<Trip> queue = new ReferenceQueue<>();
        Trip strong = new Trip("T-1");
        WeakReference<Trip> weak = new WeakReference<>(new Trip("T-2"), queue);
        SoftReference<byte[]> soft = new SoftReference<>(new byte[8 * 1024 * 1024]);
        PhantomReference<Trip> phantom = new PhantomReference<>(new Trip("T-3"), queue);

        Map<Trip, String> routes = new WeakHashMap<>();
        Trip active = new Trip("T-4");
        routes.put(active, "SALT-LAKE -> NEW-TOWN");
        routes.put(new Trip("T-5"), "HOWRAH -> PARK-STREET");

        Trip cleaned = new Trip("T-6");
        CLEANER.register(cleaned, () -> System.out.println("cleaner ran for T-6's resource"));
        cleaned = null;

        System.out.println("before GC: weak=" + weak.get() + " soft=" + (soft.get() != null)
                + " phantom.get()=" + phantom.get() + " routes=" + routes.size());
        System.gc();
        Thread.sleep(100);                                  // let the reference handler and cleaner threads run
        System.out.println("after GC:  weak=" + weak.get() + " soft=" + (soft.get() != null)
                + " strong=" + strong + " routes=" + routes.size() + " " + routes.values());
        Reference<? extends Trip> r;
        while ((r = queue.poll()) != null) {
            System.out.println("enqueued: " + r.getClass().getSimpleName());
        }

        List<byte[]> pressure = new ArrayList<>();
        try {
            while (true) pressure.add(new byte[1024 * 1024]);    // fill the heap
        } catch (OutOfMemoryError e) {
            pressure = null;
            System.out.println("after OOM pressure: soft=" + (soft.get() != null));
        }
        Reference.reachabilityFence(active);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx64m RefTypes",
        },
        {
          type: "output",
          text: `before GC: weak=Trip[id=T-2] soft=true phantom.get()=null routes=2
cleaner ran for T-6's resource
after GC:  weak=null soft=true strong=Trip[id=T-1] routes=1 [SALT-LAKE -> NEW-TOWN]
enqueued: WeakReference
enqueued: PhantomReference
after OOM pressure: soft=false`,
        },
        {
          type: "list",
          items: [
            "**Weak: cleared at the first GC.** `T-2` was only weakly reachable, so `System.gc()` cleared it and put the `WeakReference` on its queue. The same mechanism removed `T-5` from the `WeakHashMap`: its keys are weak, so an entry disappears once nothing else references the key. `T-4` stayed because `active` is still in use (the `reachabilityFence` at the end guarantees that).",
            "**Soft: survives a normal GC, cleared before an OOM.** The 8 MB array survived `System.gc()`. When the heap filled up, the JVM cleared all soft references before giving up, which is guaranteed by the specification. In between, HotSpot's policy (`-XX:SoftRefLRUPolicyMSPerMB`) keeps softly reachable objects for about one second per free megabyte since their last use, which makes soft-reference caches unpredictable: they empty exactly when the heap is under stress, and all at once.",
            "**Phantom: `get()` always returns `null`.** It exists only to be enqueued after the object is gone, so cleanup code can run without any chance of resurrecting the object.",
            "**`Cleaner` is the supported way to do that.** It runs a registered action on its own thread once the object becomes phantom reachable. The action must not capture the object itself (a lambda referencing `cleaned` would keep it reachable forever), and it's a safety net: the primary cleanup should still be `close()` in try-with-resources.",
          ],
        },
        {
          type: "heading",
          text: "Why finalize() was deprecated, measured",
        },
        {
          type: "paragraph",
          text: "Before `Cleaner`, the hook was `Object.finalize()`. An object of a class that overrides it (with a non-empty body; HotSpot ignores an empty one) is registered at allocation. When it becomes unreachable, the GC can't free it: it has to keep it, and everything it references, alive until the single **Finalizer** thread has called `finalize()`, and only a later GC can reclaim it. I measured what that does to a program that creates a lot of short-lived objects:",
        },
        {
          type: "code",
          language: "java",
          title: "FinalizerBacklog.java",
          code: `public class FinalizerBacklog {
    static volatile long finalized;
    static Object sink;

    static class Plain { long meterReading; }

    static class MeterConnection {                       // "closes" itself in finalize(): the old pattern
        long meterReading;
        @SuppressWarnings("removal")
        @Override
        protected void finalize() { finalized++; }
    }

    public static void main(String[] args) {
        for (int round = 1; round <= 3; round++) {
            long t = System.nanoTime();
            for (int i = 0; i < 2_000_000; i++) sink = new Plain();
            long plainMs = (System.nanoTime() - t) / 1_000_000;
            t = System.nanoTime();
            for (int i = 0; i < 2_000_000; i++) sink = new MeterConnection();
            long finMs = (System.nanoTime() - t) / 1_000_000;
            System.out.printf("round %d: 2M plain %4d ms, 2M with finalize() %5d ms, finalized so far %,d%n",
                    round, plainMs, finMs, finalized);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -Xlint:removal FinalizerBacklog.java     # silent: the warning is suppressed on purpose
java -Xmx256m FinalizerBacklog
java -Xmx256m FinalizerBacklog
java -Xmx256m --finalization=disabled FinalizerBacklog`,
        },
        {
          type: "output",
          text: `round 1: 2M plain   29 ms, 2M with finalize()  1230 ms, finalized so far 491,186
round 2: 2M plain   85 ms, 2M with finalize()  1154 ms, finalized so far 1,086,325
round 3: 2M plain  125 ms, 2M with finalize()  3014 ms, finalized so far 1,898,979

round 1: 2M plain   45 ms, 2M with finalize()  1398 ms, finalized so far 574,848
round 2: 2M plain  343 ms, 2M with finalize()  1357 ms, finalized so far 965,644

Exception: java.lang.OutOfMemoryError thrown from the UncaughtExceptionHandler in thread "main"

round 1: 2M plain   26 ms, 2M with finalize()    44 ms, finalized so far 0
round 2: 2M plain   23 ms, 2M with finalize()     7 ms, finalized so far 0
round 3: 2M plain    6 ms, 2M with finalize()     6 ms, finalized so far 0`,
        },
        {
          type: "list",
          items: [
            "**40 to 200 times slower** to create the same 24-byte object, and the time isn't in the constructor. Every `MeterConnection` is registered with the finalization machinery, survives its first GC, waits in a queue, and the plain objects allocated afterwards slow down too because the heap is full of dead objects that can't be freed yet.",
            "**The second run died.** The one Finalizer thread fell behind the allocating thread, the backlog of unfinalized garbage filled the 256 MB heap, and the JVM ran out of memory **while holding nothing but garbage**. It's a race, so the first run survived; that unpredictability is the problem.",
            "**`--finalization=disabled` (Java 18)** turns `finalize()` off for the whole JVM, which is how to test whether a codebase or a library still depends on it before it's removed. With it, the same objects cost the same as plain ones.",
            "Other reasons it's deprecated: `finalize()` can resurrect the object by storing `this` somewhere, it runs on an unspecified thread at an unspecified time (or never), and exceptions in it are swallowed. Replace it with `AutoCloseable` plus try-with-resources, and a `Cleaner` as the safety net.",
          ],
        },
      ],
    },
    {
      title: "Every Kind of OutOfMemoryError",
      blocks: [
        {
          type: "paragraph",
          text: "The JVM lesson reproduced `Java heap space` and a Metaspace leak, and Stack vs Heap explained native threads. The message after the colon is what tells you which area ran out, so I reproduced every kind I could safely, each with a small limit so the run takes under a second and can't hurt the machine:",
        },
        {
          type: "code",
          language: "java",
          title: "OomKinds.java",
          code: `import java.lang.reflect.Proxy;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

public class OomKinds {
    public interface FareRule { long apply(long paise); }

    public static void main(String[] args) throws Exception {
        switch (args[0]) {
            case "heap" -> {
                List<long[]> trips = new ArrayList<>();
                while (true) trips.add(new long[128 * 1024]);           // 1 MB each, all kept
            }
            case "array" -> {
                int[] huge = new int[Integer.MAX_VALUE];                 // more than any heap could hold
                System.out.println(huge.length);
            }
            case "overhead" -> {
                Map<Long, String> zones = new HashMap<>();
                for (long i = 0; ; i++) zones.put(i, "SALT-LAKE");     // many small live objects
            }
            case "metaspace" -> {
                List<Object> rules = new ArrayList<>();
                for (int i = 1; ; i++) {
                    // a fresh loader each time: each one gets its own proxy class in Metaspace
                    ClassLoader loader = new URLClassLoader(new URL[0], OomKinds.class.getClassLoader());
                    rules.add(Proxy.newProxyInstance(loader, new Class<?>[] {FareRule.class}, (p, m, a) -> 0L));
                    if (i % 1_000 == 0) System.out.println(i + " proxy classes");
                }
            }
            case "direct" -> {
                List<ByteBuffer> buffers = new ArrayList<>();
                while (true) buffers.add(ByteBuffer.allocateDirect(1024 * 1024));
            }
            case "threads" -> {
                CountDownLatch never = new CountDownLatch(1);
                for (int i = 1; i <= 20_000; i++) {                    // capped, and run under ulimit
                    Thread t = new Thread(() -> { try { never.await(); } catch (InterruptedException e) { } });
                    t.setDaemon(true);                                   // the JVM can still exit
                    t.start();
                    if (i % 100 == 0) System.out.println(i + " threads");
                }
            }
            default -> throw new IllegalArgumentException(args[0]);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx32m OomKinds heap
java -Xmx32m OomKinds array
java -Xmx32m -XX:+UseParallelGC OomKinds overhead
java -Xmx32m OomKinds overhead
java -XX:MaxMetaspaceSize=32m OomKinds metaspace
java -XX:MaxDirectMemorySize=32m OomKinds direct
(ulimit -v 6000000; java -Xmx32m OomKinds threads)    # a 6 GB address-space limit, in a subshell only`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at OomKinds.main(OomKinds.java:18)

Exception in thread "main" java.lang.OutOfMemoryError: Requested array size exceeds VM limit
	at OomKinds.main(OomKinds.java:21)

Exception in thread "main" java.lang.OutOfMemoryError: GC overhead limit exceeded
	at java.base/java.lang.Long.valueOf(Long.java:1207)
	at OomKinds.main(OomKinds.java:26)

Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at java.base/java.util.HashMap.newNode(HashMap.java:1909)
	...

1000 proxy classes
2000 proxy classes
3000 proxy classes
Exception in thread "main" java.lang.OutOfMemoryError: Metaspace
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	...
	at java.base/java.lang.reflect.Proxy.newProxyInstance(Proxy.java:1034)
	at OomKinds.main(OomKinds.java:33)

Exception in thread "main" java.lang.OutOfMemoryError: Cannot reserve 1048576 bytes of direct buffer memory (allocated: 33554432, limit: 33554432)
	at java.base/java.nio.Bits.reserveMemory(Bits.java:178)
	...

100 threads
200 threads
[0.050s][warning][os,thread] Failed to start thread "Unknown thread" - pthread_create failed (EAGAIN) for attributes: stacksize: 1024k, guardsize: 0k, detached.
[0.051s][warning][os,thread] Failed to start the native thread for java.lang.Thread "Thread-215"
Exception in thread "main" java.lang.OutOfMemoryError: unable to create native thread: possibly out of memory or process/resource limits reached
	at java.base/java.lang.Thread.start0(Native Method)
	at java.base/java.lang.Thread.start(Thread.java:1526)
	at OomKinds.main(OomKinds.java:46)`,
        },
        {
          type: "table",
          headers: ["Message", "Area", "Typical real cause", "First tool"],
          rows: [
            ["`Java heap space`", "Heap", "A leak, or a heap too small for the real live set", "Heap dump, `GC.class_histogram`"],
            ["`Requested array size exceeds VM limit`", "Heap (a single allocation)", "A size computed from bad input, e.g. a corrupt length field", "The stack trace"],
            ["`GC overhead limit exceeded`", "Heap, Parallel GC only", "Over 98% of time in GC recovering under 2% of the heap", "GC log, then as for heap space"],
            ["`Metaspace`", "Metaspace", "A class loader leak: redeploys, per-request proxies or generated classes", "`jcmd VM.metaspace`, `VM.classloader_stats`"],
            ["`Cannot reserve ... direct buffer memory`", "Direct memory", "NIO or Netty buffers not released, or a limit that's too low", "NMT (`Other`), buffer pool MXBeans"],
            ["`unable to create native thread`", "OS (address space, thread or process limits)", "Unbounded thread creation, or `ulimit -u` / container pid limits", "`jcmd Thread.print`, thread counts"],
          ],
        },
        {
          type: "list",
          items: [
            "**`GC overhead limit exceeded` is Parallel GC's early warning**, and G1 doesn't implement it. The same map-filling loop died with `GC overhead limit exceeded` after 3.5 s on Parallel, after the JVM had spent almost all that time collecting; with G1 it died with a plain `Java heap space` in 0.7 s. In production that \"almost dead\" phase is when request latency explodes long before the OOM.",
            "**Metaspace: about 3,000 proxy classes in 32 MB.** Every `URLClassLoader` gets its own copy of the proxy class (and its own Metaspace chunk), and keeping the proxies in a list keeps their classes and loaders alive. That's the shape of a real class-loader leak: an application server redeploying an app while something (a thread, a static field in a shared library, a JDBC driver registration) still references the old loader.",
            "**Direct memory is limited separately from the heap**, by default to the same size as `-Xmx`. A `-Xmx` sized close to a container limit plus direct buffers of the same size is a recipe for the kernel's OOM killer, which the next lesson demonstrates.",
            "**`unable to create native thread`** came from the operating system, not the heap. I limited the subshell's virtual address space with `ulimit -v`; each thread reserves a 1 MB stack plus glibc malloc arenas, and the 215th thread didn't fit. In real systems it's usually `ulimit -u`, a container's pids limit, or a thread-per-request design. The fix is bounded thread pools (or virtual threads), never a bigger limit alone.",
            "Not shown: `Compressed class space` (the 1 GB class-pointer space, rare) and `Map failed` from memory-mapped files.",
          ],
        },
      ],
    },
    {
      title: "Finding Leaks: Heap Dumps, Histograms and the Usual Suspects",
      blocks: [
        {
          type: "paragraph",
          text: "A leak in a garbage-collected language is an object that is **still reachable but no longer needed**. Three tools find most of them, all in the JDK: `jcmd <pid> GC.class_histogram` (counts and bytes per class, after a full GC, in a second or two), a heap dump (`jcmd <pid> GC.heap_dump file.hprof`, or automatically with `-XX:+HeapDumpOnOutOfMemoryError`), and a heap analyser (Eclipse MAT, VisualVM or IntelliJ) to follow the dominator tree from the biggest retained set back to its GC root. The production section below uses the first two on a real leak. These are the patterns I'd check first, measured with a full GC before and after:",
        },
        {
          type: "code",
          language: "java",
          title: "LeakPatterns.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class LeakPatterns {
    // 1. Listener registered per request and never removed
    static final List<Consumer<String>> SURGE_LISTENERS = new ArrayList<>();

    static void handleRequest(long requestId) {
        byte[] quoteContext = new byte[10_000];                     // captured by the lambda below
        SURGE_LISTENERS.add(zone -> quoteContext[0]++);             // leak: no removeListener
    }

    // 2. ThreadLocal on pooled threads, set and never removed
    static final ThreadLocal<byte[]> REPORT_BUFFER = new ThreadLocal<>();

    static long liveHeapKb() {
        System.gc();                                                // full GC: what remains is reachable
        return ManagementFactory.getMemoryMXBean().getHeapMemoryUsage().getUsed() / 1024;
    }

    public static void main(String[] args) throws Exception {
        long base = liveHeapKb();
        for (long r = 0; r < 2_000; r++) handleRequest(r);
        System.out.printf("listeners: %,d registered, live heap +%,d KB%n", SURGE_LISTENERS.size(), liveHeapKb() - base);
        SURGE_LISTENERS.clear();

        base = liveHeapKb();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int task = 0; task < 1_000; task++) {
            pool.submit(() -> {
                REPORT_BUFFER.set(new byte[4 * 1024 * 1024]);       // 4 MB per thread
                // ... build the report; no REPORT_BUFFER.remove() in finally
            });
        }
        Thread.sleep(500);
        System.out.printf("thread locals: pool idle, live heap +%,d KB%n", liveHeapKb() - base);
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.printf("thread locals: pool shut down, live heap +%,d KB%n", liveHeapKb() - base);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m LeakPatterns",
        },
        {
          type: "output",
          text: `listeners: 2,000 registered, live heap +19,916 KB
thread locals: pool idle, live heap +40,982 KB
thread locals: pool shut down, live heap +18 KB`,
        },
        {
          type: "list",
          items: [
            "**Listeners and callbacks.** Each lambda captured its request's 10 KB context, and the static listener list kept 2,000 of them (20 MB) reachable after the requests finished. Lambdas and anonymous classes capture more than they appear to; the Nested Classes lesson showed an inner class holding its outer instance the same way. Fix: unregister in `finally`, or have the event source hold listeners weakly.",
            "**ThreadLocals on pooled threads.** Pool threads never die, so a value set in a `ThreadLocal` and never removed stays reachable from the thread for as long as the pool lives. 8 threads times 4 MB should be 32 MB; it measured **40 MB**, because each 4 MB array is a humongous object, and 4 MB plus a 16-byte header needs **five** 1 MB regions. Shutting the pool down released everything. Fix: `try { ... } finally { REPORT_BUFFER.remove(); }`.",
            "**Static collections and unbounded caches** are the most common of all; the production section is one.",
            "**Others worth knowing:** a `HashMap` key whose `hashCode` changes after insertion (the entry becomes unreachable through `get` but stays in the map), `String.intern()` on unbounded input, unclosed resources that register themselves somewhere, and class-loader leaks, where one stray reference from a long-lived class keeps an entire redeployed application's classes alive.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing what happened to one `Trip` from `TripAllocator` (the one created at iteration `i`), from allocation until its memory was reused:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Allocate.** `new Trip(...)` and `new byte[512]` are pointer bumps in the main thread's TLAB, inside an eden region. Nothing else in the JVM knows about them yet.",
            "**Publish.** `active[...] = t` stores the reference into an array that has already been promoted to an old region. G1's post-write barrier sees an old-to-young reference and records the card in the young region's remembered set.",
            "**First young collection.** Eden is full; all threads stop at a safepoint. Roots plus remembered sets are scanned, and the trip is found reachable through `active`. It's copied to a survivor region, its age goes to 1, and the slot in `active` is updated to the new address. The 200-byte quotes next to it are never visited.",
            "**More young collections.** Each copies the trip again, between survivor regions, until its age reaches the tenuring threshold (adaptive, at most 15). Then it's copied into an old region: promoted.",
            "**Death.** 20,000 trips later, `active[...]` is overwritten with a newer trip. The old trip is now unreachable, but it sits in an old region, which young collections never evacuate.",
            "**Concurrent marking.** When old occupancy passes the IHOP, a Concurrent Start pause begins marking. Background threads trace the whole live graph, using snapshot-at-the-beginning barriers so the running program can't hide live objects from them. The dead trip is not marked.",
            "**Remark and Cleanup.** Marking finishes. If every object in the trip's region was dead, the region is freed right there. Otherwise its live bytes are counted and it's ranked as a candidate.",
            "**Mixed collection.** If the region has enough garbage, a mixed pause evacuates its few live neighbours elsewhere and the whole region, including the trip's 568 bytes (a 40-byte record plus its 528-byte array), returns to the free list. No individual object was ever \"freed\": the region was reused.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "The memory and GC commands I'd use on a running JVM, with real output from the `TripCache` program in the production section, paused mid-run (`-Xmx96m`, LRU version, with `-XX:NativeMemoryTracking=summary`). `jcmd` accepts a PID or the main class name; I've dropped the PID line it prints first, and blank lines.",
        },
        {
          type: "code",
          language: "bash",
          code: `# Which flags did ergonomics actually choose?
jcmd TripCache VM.flags
# -XX:CICompilerCount=4 -XX:ConcGCThreads=2 ... -XX:G1HeapRegionSize=1048576 -XX:InitialHeapSize=100663296
#   -XX:MaxHeapSize=100663296 -XX:MaxNewSize=59768832 ... -XX:+UseCompressedOops -XX:+UseG1GC

# Heap and Metaspace in four lines
jcmd TripCache GC.heap_info
#  garbage-first heap   total 98304K, used 23026K [0x00000000fa000000, 0x0000000100000000)
#   region size 1024K, 21 young (21504K), 4 survivors (4096K)
#  Metaspace       used 672K, committed 832K, reserved 1114112K
#   class space    used 50K, committed 128K, reserved 1048576K

# Live objects per class (forces a full GC first)
jcmd TripCache GC.class_histogram | head -8
#  num     #instances         #bytes  class name (module)
# -------------------------------------------------------
#    1:         19474        2722680  [B (java.base@21.0.13.0.3)
#    2:         19390         465360  java.lang.String (java.base@21.0.13.0.3)
#    3:         10000         400000  TripCache$TripSummary
#    4:         10000         400000  java.util.LinkedHashMap$Entry (java.base@21.0.13.0.3)
#    5:         10256         246144  java.lang.Long (java.base@21.0.13.0.3)

# A heap dump to open in Eclipse MAT, VisualVM or IntelliJ
jcmd TripCache GC.heap_dump /tmp/trips-lru.hprof
# Dumping heap to /tmp/trips-lru.hprof ...
# Heap dump file created [8627043 bytes in 0.018 secs]

# Metaspace by loader
jcmd TripCache VM.metaspace | head -5
# Total Usage - 30 loaders, 928 classes (845 shared):
#   Non-Class:   35 chunks,      4.07 MB capacity,  650.00 KB ( 16%) committed,   621.99 KB ( 15%) used, ...
#       Class:   32 chunks,    292.00 KB capacity,  100.00 KB ( 34%) committed,    50.09 KB ( 17%) used, ...

# All native memory (needs -XX:NativeMemoryTracking=summary at startup)
jcmd TripCache VM.native_memory summary scale=MB | head -12
# Total: reserved=1520MB, committed=99MB
#        malloc: 24MB #9127
#        mmap:   reserved=1496MB, committed=74MB
# -                 Java Heap (reserved=96MB, committed=20MB)

# Flags for the JVM command line
#   -Xlog:gc                                    one line per collection
#   -Xlog:gc*:file=gc.log:time,uptime,level,tags:filecount=5,filesize=20m
#   -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps
#   -XX:+ExitOnOutOfMemoryError                 restart instead of limping on
#   -XX:MaxMetaspaceSize=256m                   a ceiling, so a loader leak fails fast
#   -XX:MaxDirectMemorySize=256m                cap NIO buffers explicitly`,
        },
        {
          type: "paragraph",
          text: "`GC.heap_info` reported only 20 MB committed on a 96 MB heap: the class histogram's full GC let G1 uncommit the free regions, which is the Java 12 behaviour from the history table. `845 shared` of 928 classes came from the CDS archive.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Exporting GC metrics from inside the application",
        },
        {
          type: "code",
          language: "java",
          title: "GcMetrics.java",
          code: `import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryPoolMXBean;
import java.lang.management.MemoryType;

public class GcMetrics {
    static Object sink;

    public static void main(String[] args) {
        Object[] keep = new Object[5_000];
        for (int i = 0; i < 20_000_000; i++) {
            byte[] quote = new byte[100];
            sink = quote;
            if (i % 4_000 == 0) keep[(i / 4_000) % keep.length] = new byte[10_000];   // some survivors
        }
        // what a metrics endpoint would export
        for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans()) {
            System.out.printf("%-22s collections=%-4d time=%d ms%n", gc.getName(), gc.getCollectionCount(), gc.getCollectionTime());
        }
        for (MemoryPoolMXBean pool : ManagementFactory.getMemoryPoolMXBeans()) {
            if (pool.getType() == MemoryType.HEAP) {
                System.out.printf("%-22s used=%,d KB  after last GC=%,d KB%n", pool.getName(),
                        pool.getUsage().getUsed() / 1024, pool.getCollectionUsage().getUsed() / 1024);
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx128m GcMetrics
java -Xmx128m -XX:+UseZGC -XX:+ZGenerational GcMetrics
java -Xmx128m -XX:+UseParallelGC GcMetrics`,
        },
        {
          type: "output",
          text: `G1 Young Generation    collections=34   time=87 ms
G1 Concurrent GC       collections=0    time=0 ms
G1 Old Generation      collections=0    time=0 ms
G1 Eden Space          used=25,600 KB  after last GC=0 KB
G1 Old Gen             used=43,987 KB  after last GC=0 KB
G1 Survivor Space      used=5,882 KB  after last GC=5,882 KB

ZGC Minor Cycles       collections=54   time=401 ms
ZGC Minor Pauses       collections=171  time=1 ms
ZGC Major Cycles       collections=7    time=337 ms
ZGC Major Pauses       collections=30   time=0 ms
ZGC Old Generation     used=61,440 KB  after last GC=61,440 KB
ZGC Young Generation   used=4,096 KB  after last GC=4,096 KB

PS MarkSweep           collections=0    time=0 ms
PS Scavenge            collections=65   time=72 ms
PS Old Gen             used=49,250 KB  after last GC=0 KB
PS Survivor Space      used=992 KB  after last GC=992 KB
PS Eden Space          used=1,212 KB  after last GC=0 KB`,
        },
        {
          type: "list",
          items: [
            "This is what Micrometer and similar libraries read to produce `jvm.gc.pause` and `jvm.memory.used` metrics. The bean names depend on the collector, so dashboards built for one collector can silently show nothing after a switch.",
            "**ZGC's \"Cycles\" beans report concurrent time** (401 ms), not pauses. Its \"Pauses\" beans report 1 ms. A dashboard that sums every GC bean as \"pause time\" would be wrong by a factor of 400 here.",
            "**\"After last GC = 0\" for the old generation** means the old generation has never been collected by an old-generation collection yet, not that it's empty. The useful leak signal is old-gen usage **after** collections, trending up over hours, which only appears once old collections happen.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Where WeakHashMap is the right tool, and where it isn't",
        },
        {
          type: "code",
          language: "java",
          title: "TripMetadata.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.WeakHashMap;

public class TripMetadata {
    // Owned by the dispatch module: a trip object lives exactly as long as the trip is active
    static final class ActiveTrip {
        final long id;
        ActiveTrip(long id) { this.id = id; }
    }

    // Owned by an analytics module that must not extend a trip's life:
    // keyed by the ActiveTrip object itself, so the entry goes when the trip goes
    static final Map<ActiveTrip, String> ETA_DEBUG = new WeakHashMap<>();

    public static void main(String[] args) throws Exception {
        List<ActiveTrip> active = new ArrayList<>();
        for (long id = 1; id <= 1_000; id++) {
            ActiveTrip trip = new ActiveTrip(id);
            active.add(trip);
            ETA_DEBUG.put(trip, "eta samples for trip " + id);
        }
        System.out.println("active " + active.size() + ", debug entries " + ETA_DEBUG.size());

        active.subList(0, 900).clear();                         // 900 trips complete; dispatch drops them
        System.gc();
        Thread.sleep(50);
        System.out.println("active " + active.size() + ", debug entries " + ETA_DEBUG.size());

        Map<Long, String> wrong = new WeakHashMap<>();          // keyed by a boxed id instead
        for (long id = 1; id <= 1_000; id++) wrong.put(id, "eta samples for trip " + id);
        System.gc();
        Thread.sleep(50);
        System.out.println("WeakHashMap<Long, ...> after GC: " + wrong.size() + " entries " + wrong.keySet().stream().sorted().limit(3).toList() + "...");
    }
}`,
        },
        {
          type: "output",
          text: `active 1000, debug entries 1000
active 100, debug entries 100
WeakHashMap<Long, ...> after GC: 127 entries [1, 2, 3]...`,
        },
        {
          type: "list",
          items: [
            "**The right use:** metadata attached to an object whose lifetime someone else controls. The analytics map never kept a completed trip alive; when dispatch dropped 900 trips, their 900 entries went with the next GC. It relies on identity-like keys (`ActiveTrip` uses `Object.equals`), so only the original object can find the entry.",
            "**The wrong use:** keying by a value that's created on demand. Boxed `Long` keys are only referenced by the map, so the collector clears them whenever it gets to them (here, the full `System.gc()`), regardless of whether the trip is still active. And the result has a twist I didn't predict: **127 entries survived**, IDs 1 to 127, because `Long.valueOf` caches -128 to 127 (the Wrapper Classes lesson), and those cached objects are strongly reachable forever. A `WeakHashMap` keyed by small numbers or string literals never evicts them.",
            "So `WeakHashMap` is not a cache. A cache needs a size or time bound, which the production section adds.",
          ],
        },
        {
          type: "heading",
          text: "Example 3: GC logging the way I'd configure it for production",
        },
        {
          type: "code",
          language: "bash",
          code: `mkdir logs
java -Xmx128m -Xlog:gc*,safepoint:file=logs/gc.log:time,uptime,level,tags:filecount=3,filesize=64k TripAllocator
ls logs
grep -h "Pause Young (Mixed)" logs/gc.log* | grep -m1 "\\[gc          \\]"
grep -h -m1 "Safepoint \\"G1CollectForAllocation\\"" logs/gc.log.0`,
        },
        {
          type: "output",
          text: `done in 872 ms
gc.log
gc.log.0
gc.log.1
[2026-11-13T23:29:58.733+0530][0.797s][info][gc          ] GC(72) Pause Young (Mixed) (G1 Evacuation Pause) 69M->20M(89M) 2.398ms
[2026-11-13T23:29:57.983+0530][0.048s][info][safepoint   ] Safepoint "G1CollectForAllocation", Time since last: 31649386 ns, Reaching safepoint: 3876 ns, Cleanup: 4649 ns, At safepoint: 1619335 ns, Leaving safepoint: 3803 ns, Total: 1631663 ns`,
        },
        {
          type: "list",
          items: [
            "`gc*` logs every GC tag at info level; `safepoint` adds how long threads took to **reach** the safepoint (under 4 microseconds here). A long time-to-safepoint is a pause that the GC's own numbers don't include, typically caused by a long counted loop with no safepoint poll.",
            "`time,uptime,level,tags` decorates each line with wall-clock time (to correlate with request logs) and uptime (to correlate with other JVM logs).",
            "`filecount=3,filesize=64k` rotates: the log never takes more than three files, and the oldest content is overwritten. That's visible here: the first mixed collection still on disk is GC(72), because the files holding the earlier ones had already been reused. I used 64 KB to see the rotation in a one-second run; in production I'd use something like 5 files of 20 MB, which still holds days of history for most services.",
            "The overhead is negligible: this is the log the JVM keeps internally anyway, written asynchronously enough not to show up in any of the timings in this lesson.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which Collector",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Collector", "Why"],
          rows: [
            ["General-purpose service, heap from a few hundred MB to tens of GB", "G1 (default)", "Good throughput, pause goals, no tuning needed to start; best overall in my comparison"],
            ["Latency-critical service (p99.9 matters), large heap, spare CPU", "Generational ZGC (`-XX:+UseZGC -XX:+ZGenerational` on 21)", "Pauses under a millisecond regardless of heap size; needs headroom to avoid allocation stalls"],
            ["Batch jobs, ETL, offline computation", "Parallel", "Highest throughput; pauses don't matter when nobody is waiting"],
            ["Container with 1 CPU or under about 1.8 GB, small heap", "Serial (chosen automatically)", "No GC threads competing for the one CPU"],
            ["Low pauses on a JDK build that ships it", "Shenandoah", "Similar goals to ZGC; check that your vendor includes it"],
            ["Very short-lived processes, GC benchmarking", "Epsilon (`-XX:+UnlockExperimentalVMOptions -XX:+UseEpsilonGC`)", "Never collects; the process dies when the heap is full"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Sizing the container by -Xmx",
        },
        {
          type: "paragraph",
          text: "The heap was 256 MB of a 403 MB committed process in my NMT measurement, before counting any real thread pool or buffers. Setting `-Xmx` equal to the container limit guarantees the kernel kills the process instead of the JVM throwing a diagnosable `OutOfMemoryError`. The next lesson reproduces it.",
        },
        {
          type: "heading",
          text: "Treating pause time as the whole latency cost",
        },
        {
          type: "paragraph",
          text: "ZGC reported 0.5 ms of pauses and 983 ms of allocation stalls in the same run; Shenandoah reported 11 ms of pauses and 1.5 s of pacing. Look at application latency, and at `Allocation Stall` and pacing lines, not only at `Pause` lines.",
        },
        {
          type: "heading",
          text: "Calling System.gc() to \"help\"",
        },
        {
          type: "paragraph",
          text: "In G1 it triggers a **full** stop-the-world collection (`Pause Full (System.gc())`), the most expensive kind. Libraries that call it (some RMI and NIO code paths historically did) can be neutralised with `-XX:+DisableExplicitGC`, but check direct-buffer code first, because it sometimes relies on it. My demos use it only to make reachability observable.",
        },
        {
          type: "heading",
          text: "Using a WeakHashMap or SoftReferences as a cache",
        },
        {
          type: "paragraph",
          text: "Weak keys vanish on the collector's schedule (or never, for cached boxed values, as Example 2 showed), and soft references are cleared all at once when memory gets tight, which is exactly when a cache is most needed. A cache needs an explicit bound: a size-limited `LinkedHashMap`, or Caffeine with size and time limits.",
        },
        {
          type: "heading",
          text: "Overriding finalize() for cleanup",
        },
        {
          type: "paragraph",
          text: "It made allocation 40 to 200 times slower in my test and ran a 256 MB heap out of memory full of garbage. Use `AutoCloseable` with try-with-resources, and `Cleaner` only as a fallback.",
        },
        {
          type: "heading",
          text: "Forgetting ThreadLocal.remove() on pooled threads",
        },
        {
          type: "paragraph",
          text: "Pool threads live as long as the pool, so whatever is set stays reachable. With 8 threads and a 4 MB buffer the cost was 40 MB of heap, because of humongous-region rounding. Always pair `set` with `remove` in `finally`.",
        },
        {
          type: "heading",
          text: "Raising -Xmx to fix an OutOfMemoryError",
        },
        {
          type: "paragraph",
          text: "If the old generation after full collections keeps growing, a bigger heap only delays the failure and makes each full GC longer. Take a class histogram twice, a few minutes apart, and see which counts keep growing before changing any size.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Leave G1 as the default until measurements say otherwise; change collectors for a measured latency or throughput goal, not on reputation.",
            "Always run production JVMs with rotated GC logs (`-Xlog:gc*:file=...:filecount=5,filesize=20m`), `-XX:+HeapDumpOnOutOfMemoryError` with a `HeapDumpPath` on a persistent volume, and `-XX:+ExitOnOutOfMemoryError`.",
            "Watch old-generation occupancy **after** collections over time; that trend, not used heap, is the leak signal.",
            "Give every cache a bound (size, time or both) and export its size and hit rate as metrics.",
            "Pair every registration with an unregistration: listeners, `ThreadLocal.set`, resources registered in static registries.",
            "Leave headroom: G1 started failing evacuations with a 12 MB live set of trips in a 128 MB heap at a high promotion rate. A live set of about half the heap or less keeps every collector comfortable.",
            "Set `-XX:MaxMetaspaceSize` and `-XX:MaxDirectMemorySize` explicitly in containers, so a loader leak or a buffer leak fails with a clear message instead of a kill.",
            "Use NMT (`-XX:NativeMemoryTracking=summary`) when the process RSS is larger than heap plus Metaspace can explain.",
            "Replace `finalize()` with try-with-resources plus `Cleaner`, and run tests with `--finalization=disabled` to find code that still depends on it.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The cost model the earlier lessons stated (\"a young GC costs what survives, not what was allocated\") is worth one direct measurement. The same program allocates 4 million 1 KB trips every time; the only change is how many of the most recent ones stay reachable in a ring buffer:",
        },
        {
          type: "code",
          language: "java",
          title: "PauseCost.java",
          code: `public class PauseCost {
    static Object sink;

    public static void main(String[] args) {
        int liveMb = Integer.parseInt(args[0]);
        // the last liveMb MB of "active trips" stay reachable in a ring; everything older is garbage
        byte[][] active = new byte[Math.max(1, liveMb * 1024)][];
        long start = System.nanoTime();
        for (int i = 0; i < 4_000_000; i++) {
            byte[] trip = new byte[1_000];
            if (liveMb > 0) active[i % active.length] = trip;     // kept until the ring wraps around
            else sink = trip;                                      // garbage immediately
        }
        System.out.println((System.nanoTime() - start) / 1_000_000 + " ms");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `for live in 0 8 32 96; do
  java -Xms512m -Xmx512m -Xlog:gc:file=pc.log PauseCost $live > /dev/null
  grep "Pause Young" pc.log | sed -E 's/.* ([0-9.]+)ms$/\\1/' |
    awk -v l=$live '{n++; t+=$1; if ($1 > m) m = $1} END {printf "live %2d MB: %2d young pauses, avg %5.2f ms, max %5.2f ms\\n", l, n, t/n, m}'
done`,
        },
        {
          type: "output",
          text: `live  0 MB: 14 young pauses, avg  0.88 ms, max  1.67 ms
live  8 MB: 14 young pauses, avg  2.23 ms, max  4.28 ms
live 32 MB: 18 young pauses, avg  7.83 ms, max 14.62 ms
live 96 MB: 81 young pauses, avg 12.40 ms, max 32.78 ms`,
        },
        {
          type: "table",
          headers: ["Measurement", "Number", "Consequence"],
          rows: [
            ["Same 4 GB allocated, 0 vs 32 MB surviving", "0.88 ms vs 7.83 ms average young pause", "Pause time follows the live set, not the allocation rate"],
            ["96 MB surviving in a 512 MB heap", "81 pauses instead of 14, max 32.8 ms","Survivors fill the heap, young space shrinks, collections get frequent"],
            ["Serial vs Parallel vs G1 (same workload)", "1,500 / 333 / 148 ms of total pause", "Threads and regions matter more than heap size"],
            ["ZGC single-gen vs generational", "983 ms vs 17 ms of allocation stalls", "Use generational ZGC on 21"],
            ["`finalize()` objects", "40 to 200x slower to allocate, and an OOM", "Never override it"],
            ["ThreadLocal 4 MB buffers on 8 threads", "40 MB, not 32 MB", "Humongous objects round up to whole regions"],
            ["Process vs heap (NMT)", "403 MB committed for a 256 MB heap", "Budget at least 25 to 50% on top of `-Xmx`"],
          ],
        },
        {
          type: "paragraph",
          text: "Each line was stable across three runs (the averages moved by under 10%). These are single-machine, single-run measurements on an 8-CPU laptop with 7.6 GB of RAM, not a benchmark suite; the shapes are what transfer to other machines, not the milliseconds.",
        },
      ],
    },
    {
      title: "Garbage Collection in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend has a trip-summary endpoint that the rider and driver apps poll while a trip is in progress and shortly after it ends. To take load off the database, someone added an in-memory cache: a `static HashMap<Long, TripSummary>`, filled on a miss. The hit rate was excellent (91%), latency dropped, and the change shipped. A week later the service started showing p99 spikes of several seconds every few minutes, then restarted with an `OutOfMemoryError`, then did it again, each time a little sooner after a deploy. Nothing ever removed an entry: every trip ever summarised was still in the map.",
        },
        {
          type: "code",
          language: "java",
          title: "TripCache.java",
          code: `import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.WeakHashMap;

public class TripCache {
    record TripSummary(long tripId, String rider, String pickupZone, long farePaise, String routePolyline) {}

    static long dbLoads;

    static TripSummary loadFromDb(long tripId) {                    // stands in for a database read
        dbLoads++;
        return new TripSummary(tripId, "Asha", tripId % 2 == 0 ? "SALT-LAKE" : "NEW-TOWN",
                10_000 + tripId % 9_000, "polyline:" + "x".repeat(200) + tripId);
    }

    static Map<Long, TripSummary> newCache(String kind) {
        return switch (kind) {
            case "leak" -> new HashMap<>();                          // what shipped: never evicts
            case "lru" -> new LinkedHashMap<>(16, 0.75f, true) {    // access order, capped
                @Override
                protected boolean removeEldestEntry(Map.Entry<Long, TripSummary> eldest) {
                    return size() > 10_000;
                }
            };
            case "weak" -> new WeakHashMap<>();                      // looks tempting, see below
            default -> throw new IllegalArgumentException(kind);
        };
    }

    public static void main(String[] args) {
        Map<Long, TripSummary> cache = newCache(args[0]);
        long pauseAt = args.length > 1 ? Long.parseLong(args[1]) : -1;   // time to attach jcmd
        long lookups = 0;
        long batchStart = System.nanoTime();
        for (long trip = 1; trip <= 300_000; trip++) {
            // a new trip is created, then the rider and driver apps poll the last few hundred trips
            for (long recent = Math.max(1, trip - 500); recent <= trip; recent += 50) {
                cache.computeIfAbsent(recent, TripCache::loadFromDb);
                lookups++;
            }
            if (trip % 25_000 == 0) {
                System.out.printf("trips %,7d  cached %,7d  hit rate %5.1f%%  batch %5d ms%n", trip, cache.size(),
                        100.0 * (lookups - dbLoads) / lookups, (System.nanoTime() - batchStart) / 1_000_000);
                batchStart = System.nanoTime();
            }
            if (trip == pauseAt) {
                System.out.println("pid " + ProcessHandle.current().pid() + " paused");
                try { Thread.sleep(15_000); } catch (InterruptedException e) { return; }
            }
        }
    }
}`,
        },
        {
          type: "paragraph",
          text: "I rebuilt it with a 96 MB heap so a week of traffic fits in a second. First the shipped version, with a GC log:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx96m -Xlog:gc:file=leak-gc.log -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=trips.hprof TripCache leak`,
        },
        {
          type: "output",
          text: `trips  25,000  cached  25,000  hit rate  90.8%  batch   107 ms
trips  50,000  cached  50,000  hit rate  90.9%  batch    49 ms
trips  75,000  cached  75,000  hit rate  90.9%  batch     8 ms
trips 100,000  cached 100,000  hit rate  90.9%  batch    33 ms
trips 125,000  cached 125,000  hit rate  90.9%  batch    27 ms
trips 150,000  cached 150,000  hit rate  90.9%  batch    25 ms
trips 175,000  cached 175,000  hit rate  90.9%  batch    21 ms
trips 200,000  cached 200,000  hit rate  90.9%  batch    35 ms
trips 225,000  cached 225,000  hit rate  90.9%  batch    32 ms
trips 250,000  cached 250,000  hit rate  90.9%  batch   121 ms
java.lang.OutOfMemoryError: Java heap space
Dumping heap to trips.hprof ...
Heap dump file created [122288971 bytes in 0.164 secs]
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space: failed reallocation of scalar replaced objects
	at java.base/jdk.internal.misc.Unsafe.allocateUninitializedArray(Unsafe.java:1380)
	at java.base/java.lang.StringConcatHelper.newArray(StringConcatHelper.java:511)
	...
	at TripCache.loadFromDb(TripCache.java:14)
	at TripCache$$Lambda/0x000075cea0000c20.apply(Unknown Source)
	at java.base/java.util.HashMap.computeIfAbsent(HashMap.java:1228)
	at TripCache.main(TripCache.java:39)`,
        },
        {
          type: "paragraph",
          text: "The exception message surprised me: `failed reallocation of scalar replaced objects`. When the first `OutOfMemoryError` unwound into the JIT-compiled `main`, that frame had to be **deoptimized** back to the interpreter to handle it, and the interpreter needs real objects for everything that escape analysis had turned into plain local values (here, almost certainly the boxed `Long` keys of `computeIfAbsent`). Re-creating them needs heap, and there was none. Other runs of the same command ended with a plain `Java heap space` from `String.repeat` or `Long.valueOf`: where an OOM surfaces is a matter of timing, which is why the stack trace of an OOM rarely points at the leak. The next lesson covers escape analysis and deoptimization in detail.",
        },
        {
          type: "paragraph",
          text: "The GC log tells the story the application output hides. The \"after\" number of each young collection only ever goes up, then G1 runs out of room, fails evacuations and falls back to full GCs that recover almost nothing:",
        },
        {
          type: "output",
          text: `[0.200s][info][gc] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 24M->10M(96M) 12.768ms
[0.228s][info][gc] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 26M->18M(96M) 12.213ms
[0.269s][info][gc] GC(2) Pause Young (Normal) (G1 Evacuation Pause) 50M->33M(96M) 16.538ms
[0.302s][info][gc] GC(3) Pause Young (Normal) (G1 Evacuation Pause) 59M->46M(96M) 15.949ms
[0.330s][info][gc] GC(4) Pause Young (Normal) (G1 Evacuation Pause) 68M->56M(96M) 13.939ms
[0.352s][info][gc] GC(5) Pause Young (Concurrent Start) (G1 Evacuation Pause) 75M->64M(96M) 10.689ms
[0.352s][info][gc] GC(6) Concurrent Mark Cycle
[0.412s][info][gc] GC(6) Pause Remark 87M->86M(96M) 0.439ms
...
[0.449s][info][gc] GC(14) Pause Young (Normal) (G1 Evacuation Pause) (Evacuation Failure) 92M->92M(96M) 3.999ms
[0.457s][info][gc] GC(15) Pause Young (Normal) (G1 Evacuation Pause) (Evacuation Failure) 95M->95M(96M) 4.916ms
[0.533s][info][gc] GC(16) Pause Full (G1 Compaction Pause) 95M->84M(96M) 76.660ms
...
[0.662s][info][gc] GC(24) Pause Full (G1 Compaction Pause) 94M->92M(96M) 93.464ms
[0.664s][info][gc] GC(25) Pause Young (Normal) (G1 Evacuation Pause) (Evacuation Failure) 94M->94M(96M) 1.697ms
[0.755s][info][gc] GC(26) Pause Full (G1 Compaction Pause) 94M->93M(96M) 90.045ms
...
[1.012s][info][gc] GC(36) Pause Full (G1 Compaction Pause) 95M->95M(96M) 59.200ms
[1.095s][info][gc] GC(37) Pause Full (G1 Compaction Pause) 95M->95M(96M) 83.090ms
[1.334s][info][gc] GC(39) Pause Full (G1 Compaction Pause) 95M->95M(96M) 74.568ms
[1.399s][info][gc] GC(41) Pause Full (G1 Compaction Pause) 95M->95M(96M) 64.704ms`,
        },
        {
          type: "list",
          items: [
            "**Young collections couldn't free anything that mattered**: 24M->10M, then 26M->18M, then 50M->33M. Everything cached survived, was copied (which is why these pauses took 10 to 16 ms instead of 1 ms) and promoted.",
            "**Remark found almost nothing dead** (87M->86M): marking confirmed the old generation was all live.",
            "**Full GCs, back to back, each recovering a few MB, then nothing** (95M->95M). `grep -c \"Pause Full\"` counted 11 of them, about 60 to 93 ms each, in the last 0.9 s of the run. In production, with a multi-gigabyte heap, each of those is seconds long: the p99 spikes.",
          ],
        },
        {
          type: "paragraph",
          text: "To find the culprit without opening a 120 MB dump, I paused a run at 200,000 trips and took a class histogram of the live JVM (in production it's the same command against the running PID):",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx96m TripCache leak 200000 &
jcmd TripCache GC.class_histogram | head -10`,
        },
        {
          type: "output",
          text: ` num     #instances         #bytes  class name (module)
-------------------------------------------------------
   1:        209471       46802576  [B (java.base@21.0.13.0.3)
   2:        200000        8000000  TripCache$TripSummary
   3:        202416        6477312  java.util.HashMap$Node (java.base@21.0.13.0.3)
   4:        209387        5025288  java.lang.String (java.base@21.0.13.0.3)
   5:        200129        4803096  java.lang.Long (java.base@21.0.13.0.3)
   6:           275        2132304  [Ljava.util.HashMap$Node; (java.base@21.0.13.0.3)
   7:          1572         194072  java.lang.Class (java.base@21.0.13.0.3)`,
        },
        {
          type: "list",
          items: [
            "**Exactly 200,000 `TripSummary` objects after 200,000 trips**, with 200,000 `HashMap$Node`s and `Long`s beside them. A cache whose entry count equals the number of trips ever seen is the signature of a missing eviction. The `byte[]`s (the strings' contents, mostly the 200-character polylines) are the bulk of the bytes, but the application class with a suspicious count is what leads to the code.",
            "In the heap dump, a dominator tree would show one `HashMap` retaining about 70 MB, with its path to GC roots ending at the static field `TripCache.CACHE`'s equivalent.",
            "Something I tried that didn't work: `-XX:OnOutOfMemoryError=\"jcmd %p GC.class_histogram\"`. The command runs while the JVM is stopped at the OOM, so the attach mechanism can't get a response and `jcmd` timed out after 10.5 s. Take histograms **before** the OOM (a scheduled job, or when old-gen-after-GC crosses a threshold), and let `HeapDumpOnOutOfMemoryError` capture the moment of death.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is a bound. Trip summaries are only polled for a few minutes, so a size-limited LRU cache keeps the hot ones and evicts the rest. I also tried the tempting alternative, a `WeakHashMap`:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx96m -Xlog:gc:file=lru-gc.log TripCache lru
grep -c "Pause Full" lru-gc.log
java -Xmx96m TripCache weak`,
        },
        {
          type: "output",
          text: `trips  25,000  cached  10,000  hit rate  90.8%  batch    77 ms
trips  50,000  cached  10,000  hit rate  90.9%  batch    16 ms
trips  75,000  cached  10,000  hit rate  90.9%  batch    14 ms
trips 100,000  cached  10,000  hit rate  90.9%  batch    13 ms
trips 125,000  cached  10,000  hit rate  90.9%  batch     8 ms
trips 150,000  cached  10,000  hit rate  90.9%  batch    14 ms
trips 175,000  cached  10,000  hit rate  90.9%  batch     8 ms
trips 200,000  cached  10,000  hit rate  90.9%  batch     8 ms
trips 225,000  cached  10,000  hit rate  90.9%  batch    11 ms
trips 250,000  cached  10,000  hit rate  90.9%  batch     8 ms
trips 275,000  cached  10,000  hit rate  90.9%  batch     7 ms
trips 300,000  cached  10,000  hit rate  90.9%  batch    11 ms
0

trips  25,000  cached  25,000  hit rate  90.8%  batch    70 ms
trips  50,000  cached  33,415  hit rate  90.9%  batch    41 ms
trips  75,000  cached  58,415  hit rate  90.9%  batch    13 ms
trips 100,000  cached  67,814  hit rate  90.9%  batch    29 ms
trips 125,000  cached  80,334  hit rate  90.9%  batch    22 ms
trips 150,000  cached 105,334  hit rate  90.9%  batch    15 ms
trips 175,000  cached 117,856  hit rate  90.9%  batch    26 ms
trips 200,000  cached 130,375  hit rate  90.9%  batch    20 ms
trips 225,000  cached 143,380  hit rate  90.9%  batch    18 ms
trips 250,000  cached 159,022  hit rate  90.9%  batch    18 ms
trips 275,000  cached  52,534  hit rate  90.9%  batch    84 ms
trips 300,000  cached  68,620  hit rate  90.9%  batch    27 ms`,
        },
        {
          type: "list",
          items: [
            "**The LRU version kept exactly 10,000 entries, the same 90.9% hit rate, zero full GCs** (5 pauses in the whole run), and finished all 300,000 trips. The hit rate didn't drop because the polling only ever looks at the last 500 trips; the bound was chosen from the access pattern, not guessed. In a real service I'd use Caffeine with a maximum size and an `expireAfterWrite` of a few minutes, plus hit-rate and size metrics.",
            "**The `WeakHashMap` version survived this run, but not because it was bounded.** Its size climbed to 159,022 and then fell to 52,534 in one step. With `-Xlog:gc,gc+ref=debug` the pattern was clear: the young pauses cleared only a fraction of the weak `Long` keys (a minimal `WeakHashMap<Long, byte[]>` test showed the same, about 12,000 of 50,000 new keys per young pause), and the bulk went at concurrent-cycle Remarks (`71M->29M` in one of them). Eviction followed the collector's schedule, not the data: an active trip's entry can vanish while a finished one lingers, and as Example 2 showed, keys from the `Long` cache are never evicted at all. I didn't chase down exactly which G1 rule keeps most weak keys alive through young pauses; for the design question it doesn't matter.",
            "**What the incident taught the team:** every cache gets a bound and a hit-rate metric; dashboards plot old-generation usage **after** GC, so a rising floor raises an alert days before an OOM; GC logs and `HeapDumpOnOutOfMemoryError` were already on, which is why the root cause took an hour instead of a week; and `-Xmx` was not raised, because a bigger heap would only have stretched the time between incidents.",
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
              question: "How does garbage collection work in Java?",
              answer:
                "The collector starts from GC roots (locals in live stack frames, static fields, active threads, JNI references) and follows references to mark everything reachable. Everything else is garbage, whatever it references. Modern collectors then reclaim memory by copying the live objects out of a region and reusing the whole region (evacuation), so the cost depends on how much is live, not on how much garbage there is. Nothing is freed explicitly; an object is collected when it becomes unreachable.",
            },
            {
              question: "What are GC roots?",
              answer:
                "The references the collector treats as live by definition: local variables and operands in every live frame of every thread, static fields of loaded classes, active `Thread` objects, JNI global references, objects used as monitors, and JVM-internal references. In my `GcRoots` test, an object held only by a static field or by a running thread's local survived `System.gc()`; one held only by a two-object cycle did not.",
            },
            {
              question: "What is the difference between a minor and a major (full) GC?",
              answer:
                "A minor (young) collection collects only the young generation, where most objects die; it's frequent and short, and its cost follows the survivors. A major or full collection covers the old generation or the whole heap. In G1 the normal way to clean old regions is concurrent marking plus mixed collections; a `Pause Full` is a fallback after evacuation failures or an explicit `System.gc()`. In my trip-cache leak, back-to-back full GCs of 50 to 70 ms on a 96 MB heap were the sign that the heap was full of live data.",
            },
            {
              question: "What is the generational hypothesis?",
              answer:
                "The observation that most objects die young, while those that survive tend to live a long time. Collectors exploit it by allocating into a young generation that is collected often and cheaply (copying only the few survivors) and promoting long-lived objects to an old generation that is collected rarely. In my measurement, the same 4 GB of allocation cost 0.85 ms per young pause when nothing survived and 7.8 ms when 32 MB survived.",
            },
            {
              question: "Can you force garbage collection?",
              answer:
                "`System.gc()` is a request, not a command, and the JVM may ignore it (`-XX:+DisableExplicitGC` makes it a no-op). On G1 it normally triggers a full stop-the-world collection, which is the most expensive kind, so production code shouldn't call it. It's useful in experiments, like this lesson's reachability tests.",
            },
            {
              question: "What are the different memory areas of the JVM?",
              answer:
                "The heap (all objects, shared), thread stacks (one per thread, frames), Metaspace (class metadata, native), the code cache (JIT-compiled code), plus native memory for GC structures, direct `ByteBuffer`s and the JVM itself. With NMT, a process with a 256 MB heap had 403 MB committed: 54 MB GC structures, 64 MB direct buffer, 13 MB CDS archive, 7 MB code and more.",
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
              question: "How does G1 work?",
              answer:
                "It splits the heap into equal regions (1 to 32 MB on JDK 21) that are dynamically eden, survivor, old or humongous. Young collections evacuate all young regions in a pause. When old occupancy passes the initiating threshold (45% by default, adaptive), a concurrent marking cycle measures liveness per region; Remark frees fully empty regions and Cleanup ranks the rest. Then mixed collections evacuate young regions plus the old regions with the most garbage, within a pause-time goal (200 ms by default). Objects of half a region or more are humongous and get their own contiguous regions. A full GC is the fallback when evacuation fails.",
            },
            {
              question: "G1 vs ZGC: when would you choose each?",
              answer:
                "G1 is the general-purpose default: good throughput, pauses of a few to tens of milliseconds. ZGC does marking and relocation concurrently, with load barriers, so pauses stay under a millisecond regardless of heap size, at the cost of more CPU and memory headroom. On my workload G1 had 148 ms of total pause and the best loop time; generational ZGC had 0.2 ms of pause but 17 ms of allocation stalls and a slower loop. I'd pick ZGC when tail latency is the requirement and there's CPU and heap headroom, and on JDK 21 I'd use its generational mode, because single-generation ZGC stalled for almost a second on the same workload.",
            },
            {
              question: "What are soft, weak and phantom references used for?",
              answer:
                "A `WeakReference` doesn't keep its target alive and is cleared at the next GC that finds the target only weakly reachable; `WeakHashMap` uses weak keys for metadata attached to objects owned elsewhere. A `SoftReference` is cleared only under memory pressure, guaranteed before an `OutOfMemoryError`. A `PhantomReference` never returns its target and is enqueued after collection, for cleanup; `Cleaner` is built on it. In my test the weak reference was cleared by the first `System.gc()`, the soft one only when the heap filled up.",
            },
            {
              question: "What kinds of OutOfMemoryError are there?",
              answer:
                "The message names the area: `Java heap space`, `GC overhead limit exceeded` (Parallel GC only), `Requested array size exceeds VM limit`, `Metaspace`, `Compressed class space`, `Cannot reserve ... direct buffer memory`, and `unable to create native thread`. I reproduced all but compressed class space with small limits; for example, about 3,000 proxy classes in their own class loaders filled a 32 MB Metaspace, and a 6 GB address-space limit stopped thread creation at 215 threads.",
            },
            {
              question: "Why was finalize() deprecated?",
              answer:
                "Objects with a finalizer can't be reclaimed until the single Finalizer thread has run `finalize()`, so they survive at least one extra GC, slow down allocation and can build a backlog; they can also resurrect themselves, run at unpredictable times or never, and swallow exceptions. In my test, allocating 2 million such objects took 1.2 to 3 s instead of 30 ms, and one run died with an `OutOfMemoryError` while the heap held only garbage. The replacements are try-with-resources and `Cleaner`; `--finalization=disabled` (Java 18) lets you test without it.",
            },
            {
              question: "What is a humongous object, and why does it matter?",
              answer:
                "In G1, an object at least half a region in size, allocated directly into its own contiguous old regions. It rounds up to whole regions (a 3 MB array took four 1 MB regions, and four 4 MB `ThreadLocal` buffers cost 5 MB each), its allocation can trigger a concurrent cycle, and fragmentation can make it hard to find contiguous space. Dead humongous objects are reclaimed eagerly in young pauses. Fixes: larger regions (`-XX:G1HeapRegionSize`) or smaller, chunked buffers.",
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
              question: "How does a young collection avoid scanning the old generation?",
              answer:
                "With a write barrier and remembered sets. When a reference to a young object is stored into an old object, the barrier dirties the card for that old memory; G1 refines dirty cards into per-region remembered sets. A young pause then treats those remembered-set entries as additional roots (the `Merge Heap Roots` phase in `-Xlog:gc*`), so it only scans the old cards that actually point into the collection set. That's also why programs that store many new objects into old data structures, like my `GcCompare` map, have more expensive young pauses.",
            },
            {
              question: "How can ZGC and Shenandoah move objects while the application is running?",
              answer:
                "Both use barriers on reference loads (ZGC with colored pointers, Shenandoah with load-reference barriers). When the application loads a reference to an object that's being relocated, the barrier makes sure it gets the new copy, copying the object itself if needed, and fixes the reference. Pauses are only needed to flip phases and scan thread stacks briefly. The price is barrier overhead on every load, more CPU, and the need for headroom: if allocation outpaces the collector, threads stall (ZGC's `Allocation Stall`) or are slowed down (Shenandoah's pacing), which in my run cost 983 ms and 1.5 s respectively, invisible in pause metrics.",
            },
            {
              question: "Why can committed memory, RSS and -Xmx all disagree?",
              answer:
                "`-Xmx` limits only the heap. The JVM reserves address space for heap, class space and code cache, commits what it intends to use, and the OS only makes pages resident when they're touched. My NMT test had 1,763 MB reserved, 403 MB committed and 119 MB resident for a 256 MB heap. Container limits and the OOM killer act on resident memory, which grows towards committed as the heap and buffers are used, so the budget has to cover heap, Metaspace, code cache, thread stacks, GC structures and direct memory.",
            },
            {
              question: "How would you diagnose a Metaspace OutOfMemoryError?",
              answer:
                "It's almost always a class-loader leak: something long-lived references a class or object from a loader that should have been discarded, which keeps every class of that loader alive. I'd check `jcmd <pid> VM.metaspace` and `VM.classloader_stats` for the number of loaders and classes, compare `-Xlog:class+load` and `class+unload` counts, and in a heap dump look for many instances of the same loader type and their paths to GC roots (thread context class loaders, static registries, JDBC drivers, `ThreadLocal`s). Setting `-XX:MaxMetaspaceSize` makes it fail fast and clearly instead of growing native memory until the container is killed.",
            },
            {
              question: "Why did a WeakHashMap<Long, V> keep exactly 127 entries after GC?",
              answer:
                "Because autoboxing goes through `Long.valueOf`, which returns cached instances for -128 to 127. Those cached objects are strongly reachable from the `Long` cache for the life of the JVM, so their weak entries are never cleared, while keys 128 and above are fresh objects referenced only weakly and disappeared at the full GC. It's a good illustration of why weak maps need keys with identity and a lifetime owned elsewhere, never boxed values or string literals.",
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
              question: "A service's heap usage keeps climbing over days until it dies with OutOfMemoryError: Java heap space. How do you find the leak?",
              answer:
                "First confirm it's a leak: in the GC log, the heap after full or mixed collections (the floor) rises steadily. Then take two class histograms some time apart (`jcmd <pid> GC.class_histogram`) and look for classes whose instance counts grow without bound; in my trip-cache case `TripSummary` matched the number of trips ever seen. Take a heap dump (`jcmd GC.heap_dump`, or the one written by `-XX:+HeapDumpOnOutOfMemoryError`) and in MAT follow the dominator tree from the biggest retained set to its GC root, which usually ends at a static field, a `ThreadLocal`, a listener list or a cache. Fix the reachability (a bound, an unregister, a `remove()`), not the heap size.",
            },
            {
              question: "After moving to ZGC, GC pause metrics are near zero but p99 latency got worse. What do you check?",
              answer:
                "Allocation stalls and CPU. ZGC moves work into concurrent threads; if it can't keep up, allocating threads block in `Allocation Stall`, which isn't a pause and doesn't appear in pause metrics. In my comparison single-generation ZGC had 0.5 ms of pauses and 983 ms of stalls. I'd grep the GC log for `Allocation Stall`, check that it's generational ZGC on 21 (`-XX:+ZGenerational`), give it more heap headroom, check that the container has enough CPU for the concurrent threads, and only then consider tuning or going back to G1.",
            },
            {
              question: "A container keeps getting killed with exit code 137 but there's no OutOfMemoryError in the logs. Why?",
              answer:
                "Exit 137 is SIGKILL, usually from the kernel's OOM killer because the process exceeded the container's memory limit. The JVM never saw a Java-level OOM because the heap wasn't full: the total of heap, Metaspace, thread stacks, code cache, GC structures and direct buffers exceeded the limit. I'd enable NMT to see which category is large, lower `-XX:MaxRAMPercentage` (or `-Xmx`) to leave 25 to 50% for native memory, cap `MaxDirectMemorySize` and `MaxMetaspaceSize`, and check thread counts.",
            },
            {
              question: "Every few minutes a service shows multi-second pauses, and the GC log shows Pause Full (G1 Compaction Pause) preceded by Evacuation Failure. What's happening and what are your options?",
              answer:
                "G1 ran out of free regions to copy live objects into, so it fell back to a full compaction. Either the live set is too close to the heap size (a leak, or genuine growth), or the promotion or humongous allocation rate is too high for concurrent marking to finish in time. I'd check whether the heap floor after GC is rising (leak: fix the code), whether humongous allocations are frequent (chunk large buffers or raise the region size), and otherwise give G1 headroom (bigger heap) or start marking earlier with a lower `InitiatingHeapOccupancyPercent`. In my rebuild, a 96 MB heap with an unbounded cache ran nine full GCs in 0.4 s before dying; the bounded cache ran none.",
            },
            {
              question: "Someone proposes using SoftReferences for an in-memory cache of fare quotes so that \"the JVM manages the size\". What do you say?",
              answer:
                "That the JVM manages it in the worst possible way for a cache. Soft references survive until memory is tight and are then cleared all together (in my test the 8 MB soft array survived `System.gc()` and vanished just before the OOM), so the cache empties exactly under peak load, causing a thundering herd to the database. They also make the heap look full all the time, which hides real leaks and makes GC work harder. I'd use a bounded cache with explicit size and expiry (Caffeine, or a capped `LinkedHashMap`), sized from the access pattern, with hit-rate metrics.",
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
            "Run `GcRoots`, then change the worker so it sets `local = null` right after creating its weak reference, and prints `\"worker done\"` instead of `local.name`. Predict the second line of output.",
            "Run `TripAllocator` with `-Xmx128m -Xlog:gc` and then with `-Xmx256m -Xlog:gc`. Count the `Pause Young (Mixed)` lines in each with `grep -c`.",
            "Run `java -Xmx64m RefTypes`, then change the `SoftReference` array to 80 MB and run it again with the same heap.",
            "Run `java -Xmx32m -XX:+UseParallelGC OomKinds overhead`, then the same with `-XX:-UseGCOverheadLimit`.",
            "Run `TripMetadata`, then change the second map's loop to start at 1,000 instead of 1 and predict the entry count.",
            "Start `MemoryAreas` with `-XX:NativeMemoryTracking=summary` and change the direct buffer to 128 MB. Find the change in `jcmd MemoryAreas VM.native_memory summary scale=MB`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `held by thread's local: false`: the thread is still alive, but its frame no longer holds a reference, and a root is a reference, not a thread. Step 2 shows mixed collections with 128 MB (5, 19 and 9 in my three runs, depending on timing) and none with 256 MB, where the old generation never reaches the marking threshold. Step 3 throws `OutOfMemoryError: Java heap space` at the line that creates the array, because an 80 MB array can't be allocated in a 64 MB heap at all, soft reference or not. Step 4 shows `GC overhead limit exceeded` after about 3.5 s, then `Java heap space` after about 6.4 s of struggling once the limit check is disabled. Step 5 prints `0 entries`: IDs from 1,000 up are outside the `Long` cache, so every key is collected. Step 6 shows `Other (reserved=128MB, committed=128MB)`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PROCESS    heap + Metaspace + class space + code cache + thread stacks
           + GC structures + direct buffers      (NMT: 403 MB for a 256 MB heap)
           reserved > committed > resident; containers kill on resident

ROOTS      locals in live frames, statics, threads, JNI, monitors
           unreachable = garbage, cycles included; leak = still reachable

G1         equal regions: E S O H, young pauses copy survivors only
           IHOP 45% -> Concurrent Start -> mark -> Remark -> Cleanup
           -> Mixed (old regions with most garbage first)
           Evacuation Failure -> Pause Full = no headroom / leak
           humongous >= half a region, rounds up to whole regions

COLLECTORS Serial 1 thread | Parallel throughput | G1 default
           ZGC < 1 ms pauses, but watch Allocation Stall (use generational on 21)
           Shenandoah: watch pacing   "pause time" != latency

REFS       strong | soft (cleared before OOM) | weak (next GC) | phantom (cleanup)
           Cleaner, not finalize()   WeakHashMap != cache

OOM        heap space | GC overhead (Parallel) | array size | Metaspace
           direct buffer memory | unable to create native thread

TOOLS      -Xlog:gc*  jcmd GC.heap_info / GC.class_histogram / GC.heap_dump
           VM.native_memory  VM.metaspace  -XX:+HeapDumpOnOutOfMemoryError`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A JVM process is heap plus a large amount of native memory, and the collector's job is to find what's still reachable from the roots and reuse everything else. Pause time follows the live set, which is why young collections are cheap and leaks are expensive.",
            "G1 is the default because it balances throughput and pauses with almost no tuning; ZGC and Shenandoah trade CPU and headroom for sub-millisecond pauses, and their real costs show up as stalls and pacing. Read the GC log before changing anything, and find leaks with class histograms and heap dumps rather than bigger heaps.",
            "Next comes the other half of the execution engine: JIT Compilation, Profiling and JVM Tuning, which follows a method from the interpreter through C1 and C2, measures warm-up, inlining, escape analysis and deoptimization, and puts the memory and GC knowledge from this lesson into a tuning workflow for containers.",
          ],
        },
      ],
    },
  ],
};
