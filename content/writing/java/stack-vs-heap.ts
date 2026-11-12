import type { Lesson } from "../types";

export const stackVsHeap: Lesson = {
  slug: "stack-vs-heap",
  date: "2026-11-12",
  title: "Stack vs Heap",
  description:
    "The two memory areas every Java program uses, side by side: per-thread stacks versus the shared heap, how long values live in each, StackOverflowError versus OutOfMemoryError, why locals are thread-safe and fields are not, virtual threads whose stacks live on the heap, and reading both with jcmd in production.",
  tags: ["Core Java", "Memory", "JVM", "Stack", "Heap", "Threads"],
  sections: [
    {
      title: "Why Compare Them",
      blocks: [
        {
          type: "paragraph",
          text: "The last two lessons each looked at one side: Methods showed how a call pushes a frame onto the stack, Memory Allocation showed what `new` does on the heap. Separately they made sense. What I actually got asked about, and what actually caused bugs, was the line between them: which data belongs to one thread and which is shared, which disappears on its own and which waits for the garbage collector, and which error means which area ran out.",
        },
        {
          type: "paragraph",
          text: "This lesson puts them side by side. The shortest version: **the stack is a thread's private scratchpad for the method calls in progress, the heap is the shared storage for every object**. Almost every rule below follows from that one sentence.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Both ideas are older than Java. A call stack is how nearly every language since the 1960s implements function calls: push a record on call, pop it on return, which also makes recursion work. A heap, in the memory-management sense (not the data structure of the same name), is the region a program draws long-lived memory from in any order, which in C means `malloc`.",
        },
        {
          type: "paragraph",
          text: "Java kept both but changed who manages them. The JVM pushes and pops frames itself, and Java code can't put an object in a frame the way C++ can declare an object on the stack. Every object goes to the heap, and the garbage collector, not the programmer, decides when it's freed. Java 21 added one twist that the classic \"stack vs heap\" answer doesn't cover: virtual threads, whose stacks are kept **on the heap** while they're waiting. That gets its own section below.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I picture an office with a shared filing room.",
        },
        {
          type: "list",
          items: [
            "Every employee (thread) has a **stack of sticky notes** on their own desk. Starting a task, they put a new note on top with the details they need: the customer id, a running total. Finishing the task, they throw the top note away. Nobody else ever reads their notes, and nobody needs to clean them up.",
            "The **filing room** (heap) holds the actual files: customer records, invoices. Any employee can open any file if they know its cabinet number, which is what they write on their sticky notes (a reference).",
            "Files are big and live long; notes are small and live only for one task. The desk has room for only so many notes (a stack has a fixed size), and the filing room has room for only so many files (the heap has a maximum).",
            "A **records clerk** (the garbage collector) periodically removes files whose cabinet number isn't written on any employee's note or in any other file. They never touch the notes.",
            "If two employees open the same file and both change the total at the same moment, one change gets lost. That never happens with sticky notes, because each one has their own. That's the thread-safety difference in one picture.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "table",
          headers: ["", "Stack", "Heap"],
          rows: [
            ["How many", "One per thread", "One per JVM"],
            ["Holds", "Frames: local variables, parameters, operand stack, return info", "Every object and array, the string pool, objects static fields refer to"],
            ["Visible to", "Only its own thread", "Every thread that has a reference"],
            ["Allocated when", "A method is called (frame push)", "`new`, literals, boxing, and anything that creates an object"],
            ["Freed when", "The method returns or throws (frame pop)", "A garbage collection finds the object unreachable"],
            ["Order", "Strictly LIFO: last called, first returned", "Any order; the GC decides"],
            ["Size", "Fixed per thread: `-Xss`, 1 MB default on 64-bit Linux", "`-Xms` to `-Xmx`, default max 1/4 of RAM"],
            ["Speed", "Push and pop are a pointer move", "Allocation is a TLAB pointer bump; the cost is GC work later"],
            ["When full", "`StackOverflowError`", "`OutOfMemoryError: Java heap space`"],
            ["Thread-safety", "Inherently safe: nobody else can see it", "Shared: needs synchronisation, immutability or confinement"],
          ],
        },
        {
          type: "image",
          src: "/images/java/stack-and-heap.svg",
          alt: "Two thread stacks, http-1 and http-2, each with an assign frame holding its own id and a reference to its own Ride object in the shared heap; both Rides and a caller's local point to the same Zone object; an unreachable old Ride is marked as garbage.",
          caption: "Each thread's frames are private. The objects they point to are in one shared heap, and nothing stops two threads from pointing at the same object.",
        },
        {
          type: "callout",
          tone: "note",
          title: "The rule that resolves most confusion",
          text: "Objects always live on the heap. Variables live wherever they're declared: a local in its frame, a field inside its object. So `Ride ride = new Ride()` inside a method is **both**: the variable `ride` is on the stack, the `Ride` object is on the heap, and the stack slot holds a reference to it.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The stack: a frame per call",
        },
        {
          type: "paragraph",
          text: "When a thread starts, the JVM reserves its stack as one contiguous block of virtual memory. Each method call pushes a frame whose size `javac` already computed (`locals=` and `stack=` in `javap -v`), and each return pops it. There's no search for free space and no bookkeeping about which frame is free, which is why it's so cheap, and also why the stack can't hold anything that must outlive the call.",
        },
        {
          type: "paragraph",
          text: "\"Reserved\" is the key word. The operating system only backs the pages the thread actually touches. I started 200 platform threads that just wait, and read the numbers with Native Memory Tracking:",
        },
        {
          type: "code",
          language: "java",
          title: "Parked.java",
          code: `import java.util.concurrent.CountDownLatch;

public class Parked {
    public static void main(String[] args) throws InterruptedException {
        CountDownLatch never = new CountDownLatch(1);
        for (int i = 0; i < 200; i++) {
            Thread t = new Thread(() -> {
                try { never.await(); } catch (InterruptedException e) { }
            }, "worker-" + i);
            t.setDaemon(true);
            t.start();
        }
        System.out.println("200 platform threads parked");
        Thread.sleep(60_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:NativeMemoryTracking=summary Parked &
jcmd <pid> VM.native_memory summary | grep -A3 "Thread"`,
        },
        {
          type: "output",
          text: `-                    Thread (reserved=228063KB, committed=22391KB)
                            (threads #222)
                            (stack: reserved=227328KB, committed=21656KB, peak=21656KB)`,
        },
        {
          type: "paragraph",
          text: "222 threads (my 200 plus the JVM's own: GC, JIT compiler, finalizer and so on) reserved 222 MB of stack, 1 MB each, but only about 21 MB was committed, roughly 100 KB per thread. So \"each thread costs 1 MB\" is true for address space and false for actual RAM, as long as the threads don't recurse deeply. The real limits on platform threads are the OS thread itself and context switching, which is what virtual threads address.",
        },
        {
          type: "heading",
          text: "The heap: shared, managed, generational",
        },
        {
          type: "paragraph",
          text: "The heap is one region for the whole JVM, split by G1 into equal-sized regions labelled eden, survivor, old or humongous. Threads allocate in their own TLABs inside eden (previous lesson), so allocation doesn't contend even though the heap is shared. Freeing is the opposite of the stack: nothing happens at the moment an object becomes unused. Later, a collection traces from the GC roots, and **the roots include every live frame of every thread's stack**. That's the link between the two areas: a local reference on a stack keeps its heap object alive for exactly as long as that frame exists, or until the variable is no longer used, as the JIT is allowed to notice.",
        },
        {
          type: "diagram",
          text: `GC ROOTS                              HEAP
┌─────────────────────────────┐
│ stack of thread main        │
│   frame main: order ●───────┼──────► Order ──► List ──► Item, Item
│ stack of thread http-1      │
│   frame assign: ride ●──────┼──────► Ride ──► "zone-2"
│ static fields               │
│   Registry.ALL ●────────────┼──────► HashMap ──► ...
└─────────────────────────────┘
                                       Ride (old)      ◄ no path from a root:
                                                         collected at the next GC`,
          caption: "Stacks are part of the root set. When a frame is popped, the objects only it referenced become collectable.",
        },
      ],
    },
    {
      title: "Lifetimes: Who Outlives Whom",
      blocks: [
        {
          type: "paragraph",
          text: "A local variable dies with its frame. The object it pointed to doesn't, if anything else still references it. Returning an object from a method is the everyday example: the variable is gone, the object carries on with the caller.",
        },
        {
          type: "code",
          language: "java",
          title: "Lifetime.java",
          code: `import java.lang.ref.WeakReference;

public class Lifetime {
    record Booking(String id) {}

    static Booking create(String id) {
        Booking b = new Booking(id);     // b dies with this frame...
        return b;                        // ...but the object lives on: the caller now references it
    }

    public static void main(String[] args) throws InterruptedException {
        Booking kept = create("BK-1");
        WeakReference<Booking> watcher = new WeakReference<>(create("BK-2"));  // nobody keeps BK-2

        System.gc();
        Thread.sleep(100);

        System.out.println("kept    -> " + kept);
        System.out.println("watcher -> " + watcher.get());
    }
}`,
        },
        {
          type: "output",
          text: `kept    -> Booking[id=BK-1]
watcher -> null`,
        },
        {
          type: "list",
          items: [
            "Both `Booking`s were created the same way, in a frame that was popped right after. `BK-1` survived the collection because `main`'s local `kept` still referenced it.",
            "`BK-2` was only reachable through a `WeakReference`, which by definition doesn't keep an object alive, so the GC cleared it. `System.gc()` is only a request; it worked here, but I wouldn't build anything real on it.",
            "So the lifetime of a heap object has nothing to do with where it was created. It lives exactly as long as it is reachable.",
          ],
        },
        {
          type: "table",
          headers: ["Thing", "Lives until"],
          rows: [
            ["Local variable or parameter", "Its method returns or throws"],
            ["Object referenced only by locals", "Those frames are gone (or the JIT sees the locals are no longer used), then the next GC"],
            ["Object returned or stored in a field", "Nothing reachable references it anymore"],
            ["Object referenced by a `static` field", "The class is unloaded, which for application classes usually means never"],
            ["A thread's stack", "The thread ends"],
          ],
        },
      ],
    },
    {
      title: "Per Thread vs Shared",
      blocks: [
        {
          type: "paragraph",
          text: "This is the part of stack versus heap that matters most in backend code. Two threads running the same method get two separate frames, so two separate copies of every local. But if those locals point at the same heap object, both threads are working on one object:",
        },
        {
          type: "code",
          language: "java",
          title: "TwoThreads.java",
          code: `public class TwoThreads {
    static class Counter { int value; }              // one object on the heap, shared

    public static void main(String[] args) throws InterruptedException {
        Counter shared = new Counter();

        Runnable work = () -> {
            int mine = 0;                              // a local: one copy per thread, in its own stack
            for (int i = 0; i < 1_000_000; i++) {
                mine++;
                shared.value++;                        // read-add-write on the shared heap object
            }
            System.out.println(Thread.currentThread().getName() + " mine=" + mine);
        };

        Thread t1 = new Thread(work, "t1");
        Thread t2 = new Thread(work, "t2");
        t1.start(); t2.start();
        t1.join();  t2.join();
        System.out.println("shared=" + shared.value + " (expected 2000000)");
    }
}`,
        },
        {
          type: "output",
          text: `t1 mine=1000000
t2 mine=1000000
shared=1460744 (expected 2000000)

# second run
shared=1452531 (expected 2000000)
# third run
shared=1385640 (expected 2000000)`,
        },
        {
          type: "list",
          items: [
            "`mine` was exactly 1,000,000 in both threads, every run. Each thread incremented its own slot in its own frame; there was nothing to collide with.",
            "`shared.value` lost between 540,000 and 615,000 increments, and a different number each run. `value++` is three steps (read the field, add one, write it back), and when both threads read the same old value, one write overwrites the other.",
            "The lambda captured `shared`, the reference, into the lambda object, and each thread loaded that reference into its own frame. Copying a reference never copies the object, which is the same pass-by-value rule from the Methods lesson, now across threads.",
          ],
        },
        {
          type: "paragraph",
          text: "Fixing that properly is the Multithreading track's job (`AtomicInteger`, `synchronized`, `LongAdder`). The memory lesson is simpler: **anything only on the stack is thread-safe automatically, anything on the heap that two threads can reach is not**, unless it's immutable.",
        },
      ],
    },
    {
      title: "Two Errors, Two Areas",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "TwoErrors.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class TwoErrors {
    static int depth = 0;
    static void recurse() { depth++; recurse(); }

    public static void main(String[] args) {
        try {
            recurse();
        } catch (StackOverflowError e) {
            System.out.println("stack: " + e.getClass().getSimpleName() + " at depth ~" + depth);
        }

        List<long[]> hoard = new ArrayList<>();
        try {
            while (true) hoard.add(new long[1_000_000]);    // 8 MB each, all kept reachable
        } catch (OutOfMemoryError e) {
            int held = hoard.size();
            hoard = null;                                    // let it go before printing
            System.out.println("heap:  " + e.getMessage() + " after " + held + " arrays (~" + held * 8 + " MB)");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m TwoErrors",
        },
        {
          type: "output",
          text: `stack: StackOverflowError at depth ~22276
heap:  Java heap space after 31 arrays (~248 MB)`,
        },
        {
          type: "table",
          headers: ["", "StackOverflowError", "OutOfMemoryError: Java heap space"],
          rows: [
            ["Area", "One thread's stack", "The shared heap"],
            ["Typical cause", "Recursion with no working base case, or very deep recursion", "A leak (objects kept reachable), or a heap too small for the real workload"],
            ["Who's affected", "The thread that overflowed; others keep running", "Any thread that tries to allocate, so usually the whole service"],
            ["What the trace shows", "The same frames repeating", "Whatever happened to allocate last, often not the culprit"],
            ["Fix", "Base case, iteration instead of recursion, or `-Xss` as a last resort", "Heap dump and dominator tree to find the holder; then bound it or raise `-Xmx`"],
          ],
        },
        {
          type: "paragraph",
          text: "I caught both here only to print them. Both are `Error`s, not `Exception`s, and production code shouldn't catch them to carry on: after an OOM, some other thread may have failed halfway through updating shared state. I nulled `hoard` before printing for the same reason the leak in the previous lesson crashed a second time: printing needs memory too.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "The third one: unable to create native thread",
          text: "`OutOfMemoryError: unable to create native thread` sounds like a heap problem but isn't. The OS refused a new thread, because of a process or user thread limit (`ulimit -u`, a container's `pids.max`) or native memory for its stack. Raising `-Xmx` makes it worse, since the heap takes more of the memory the stacks need. The fix is fewer threads: bounded pools, or virtual threads.",
        },
      ],
    },
    {
      title: "Virtual Threads: Stacks on the Heap",
      blocks: [
        {
          type: "paragraph",
          text: "Java 21's virtual threads change the classic answer. A virtual thread runs on a normal platform thread (a **carrier**) while it's doing work. When it blocks, on `sleep`, a socket read or a lock, the JVM copies its frames off the carrier's stack into **stack chunk objects on the heap**, and the carrier is free to run another virtual thread. When it resumes, the frames are copied back. So a waiting virtual thread costs heap memory proportional to how deep its stack actually is, not a 1 MB reservation.",
        },
        {
          type: "code",
          language: "java",
          title: "ManyThreads.java",
          code: `import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

public class ManyThreads {
    public static void main(String[] args) {
        AtomicInteger done = new AtomicInteger();
        Instant start = Instant.now();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 100_000; i++) {
                executor.submit(() -> {
                    Thread.sleep(1_000);              // blocked: the virtual thread's stack is parked on the heap
                    return done.incrementAndGet();
                });
            }
        }                                              // close() waits for all tasks
        System.out.println(done.get() + " virtual threads finished in "
            + Duration.between(start, Instant.now()).toMillis() + " ms");
    }
}`,
        },
        {
          type: "output",
          text: "100000 virtual threads finished in 1413 ms",
        },
        {
          type: "list",
          items: [
            "100,000 threads that each sleep one second finished in 1.4 seconds total, on a 16-core laptop, with the default heap. All of them were blocked at the same time, and their stacks were heap objects while they waited.",
            "The same with 100,000 platform threads would mean 100 GB of reserved stack address space and 100,000 OS threads, which typical OS limits refuse long before that.",
            "The rule \"locals are thread-private\" still holds. A virtual thread's frames are still its own; they're just stored in a heap object while it's parked, reachable only by the JVM.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "One request through a service, following both areas, for `Ride ride = new Ride(id, zone); rides.add(ride); return ride.id();`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "The request thread calls `assign(42)`. **Stack:** a frame for `assign` is pushed, with `this`, `id = 42` and an empty slot for `ride`.",
            "`\"zone-\" + (id % 5)` builds a `String`. **Heap:** a new `String` (and its `byte[]`) in the thread's TLAB.",
            "`new Ride(...)`. **Heap:** the `Ride` is allocated and zeroed. **Stack:** a frame for the constructor is pushed, sets the fields, and is popped.",
            "`ride` now holds the reference. **Stack:** one 4-byte slot. **Heap:** the 24-byte `Ride`.",
            "`rides.add(ride)` stores the reference in a shared list. **Heap:** the list's array now points at the `Ride` too, so the object has two incoming references.",
            "`return ride.id()`. **Stack:** the `long` is pushed to the caller's operand stack and the frame is popped, so `ride` and `id` are gone.",
            "**Heap:** the `Ride` is still alive because the shared list references it. The temporary `String`s from concatenation that nothing kept are garbage, reclaimed at the next young GC without anyone doing anything.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "StackOrHeap.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class StackOrHeap {
    static final List<String> LOG = new ArrayList<>();   // static: the List object is on the heap,
                                                         // reachable for the life of the class
    private int requests;                                // field: inside this object, on the heap

    int handle(int km) {                                 // km: parameter, in this call's frame
        int fare = 50 + km * 12;                         // local primitive: in the frame
        String line = "fare=" + fare;                    // reference in the frame, String on the heap
        LOG.add(line);                                   // now the heap list references it too
        requests++;                                      // updates the field on the heap
        return fare;                                     // fare's value is copied to the caller
    }                                                    // frame popped: km, fare, line are gone

    public static void main(String[] args) {
        StackOrHeap service = new StackOrHeap();         // reference on the stack, object on the heap
        System.out.println(service.handle(10) + " " + service.handle(3));
        System.out.println(LOG + " requests=" + service.requests);
    }
}`,
        },
        {
          type: "output",
          text: `170 86
[fare=170, fare=86] requests=2`,
        },
        {
          type: "table",
          headers: ["Tool", "Shows", "Command"],
          rows: [
            ["Thread dump", "Every thread's stack, frame by frame", "`jcmd <pid> Thread.print` or `jstack <pid>`"],
            ["Heap summary", "Heap size, used, regions, Metaspace", "`jcmd <pid> GC.heap_info`"],
            ["Class histogram", "Instance count and bytes per class", "`jcmd <pid> GC.class_histogram`"],
            ["Heap dump", "Every object and reference, for MAT", "`jcmd <pid> GC.heap_dump /path/file.hprof`"],
            ["Native memory", "Stacks, Metaspace, code cache, GC", "`-XX:NativeMemoryTracking=summary` + `jcmd <pid> VM.native_memory summary`"],
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "paragraph",
          text: "The sections above already have four runnable programs: `Lifetime` (a local dies, its object survives), `TwoThreads` (private locals versus a shared object), `TwoErrors` (one error per area) and `ManyThreads` (virtual threads). `StackOrHeap` in the syntax section labels every line. One more puts recursion and the heap together, because it's a classic interview follow-up: a recursive method's locals are on the stack, but what it builds can go to the heap.",
        },
        {
          type: "code",
          language: "java",
          title: "RecursionMemory.java",
          code: `import java.util.ArrayDeque;
import java.util.Deque;

public class RecursionMemory {
    // Depth-first sum of 1..n, recursively: one frame per level, on the thread's stack
    static long sumRecursive(int n) {
        return n == 0 ? 0 : n + sumRecursive(n - 1);
    }

    // Same work with an explicit stack: the "frames" are Integer objects on the heap
    static long sumIterative(int n) {
        Deque<Integer> pending = new ArrayDeque<>();
        for (int i = n; i > 0; i--) pending.push(i);
        long sum = 0;
        while (!pending.isEmpty()) sum += pending.pop();
        return sum;
    }

    public static void main(String[] args) {
        System.out.println(sumIterative(1_000_000));
        System.out.println(sumRecursive(10_000));
        try {
            System.out.println(sumRecursive(1_000_000));
        } catch (StackOverflowError e) {
            System.out.println("recursive 1,000,000: StackOverflowError");
        }
    }
}`,
        },
        {
          type: "output",
          text: `500000500000
50005000
recursive 1,000,000: StackOverflowError`,
        },
        {
          type: "paragraph",
          text: "The iterative version holds a million pending items without trouble, because they're on the heap, which here has gigabytes. The recursive one needs a million frames on a 1 MB stack and overflows. This is why tree and graph traversals on unbounded input (a deep category tree, a long chain of linked records) should use an explicit `ArrayDeque` rather than recursion: it moves the depth from the small, fixed stack to the large heap.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**\"Primitives go on the stack, objects on the heap.\"** Half right. Objects do go on the heap, but a primitive field is inside its object on the heap. Where the variable is declared decides.",
            "**Keeping per-request state in a field of a singleton.** A Spring `@Service` is one object on the heap, shared by every request thread. A field used as a scratch variable is shared state. The production section below shows it producing wrong fares.",
            "**Thinking a local makes an object thread-safe.** The reference is private; the object isn't. If the same object is also reachable from a field, a collection or another thread, it's shared.",
            "**Raising `-Xss` to fix a StackOverflowError.** Usually it hides a missing base case or a cycle, such as `toString` or Jackson serialisation going round a bidirectional JPA relationship. Find the repeating frames first.",
            "**Raising `-Xmx` to fix \"unable to create native thread\".** It's a thread-count or native-memory problem, and a bigger heap leaves less room for stacks.",
            "**Expecting returned objects to die with the method.** Only the frame dies. Whatever the method returned or stored somewhere lives as long as it's reachable.",
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
            "Keep per-request data in locals and parameters. It's thread-safe by construction and becomes garbage the moment the request finishes.",
            "Keep singleton services stateless, or holding only immutable or thread-safe state (`final` fields, `ConcurrentHashMap`, `AtomicLong`).",
            "Prefer immutable objects (records, `List.of`) for anything shared between threads. An object no thread can change can be shared freely.",
            "Use iteration with an explicit `ArrayDeque` for traversals whose depth depends on input, rather than recursion.",
            "Use bounded thread pools for platform threads, or virtual threads for blocking I/O work, rather than unbounded `new Thread` per task.",
            "In production, take thread dumps for \"stuck\" or \"slow\" problems (stacks) and heap dumps or histograms for \"growing memory\" problems (heap). Using the right one first saves hours.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "table",
          headers: ["Operation", "Cost", "Note"],
          rows: [
            ["Frame push/pop", "A pointer move", "Often removed entirely when the JIT inlines the call"],
            ["Heap allocation (small object)", "A TLAB pointer bump", "Comparable to a frame push; may be eliminated by escape analysis"],
            ["Reclaiming a dead local", "Nothing", "Gone with the frame"],
            ["Reclaiming a dead object", "Nothing directly, at collection time", "Young GC copies survivors only; the dead cost nothing"],
            ["Keeping an object alive", "Copying through survivor spaces, then old-gen GC work", "Where GC time really goes"],
            ["Platform thread stack", "1 MB reserved, ~100 KB committed when idle (my measurement)", "Plus an OS thread and context switches"],
            ["Virtual thread while blocked", "Its frames, as heap objects", "Hundreds of thousands are practical"],
          ],
        },
        {
          type: "paragraph",
          text: "The practical conclusion matches the previous lesson: stack versus heap is not where performance is lost. Long-lived heap objects, contended shared objects, and too many platform threads are.",
        },
      ],
    },
    {
      title: "Stack and Heap in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The stack-versus-heap bug I'd most expect in a Spring Boot codebase: a singleton service using a field as a scratch variable. Tomcat runs each request on its own worker thread, but every request calls the same service object. Here's a minimal reproduction with a fixed pool standing in for Tomcat's threads:",
        },
        {
          type: "code",
          language: "java",
          title: "FareService.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class FareService {
    // Like a Spring @Service: ONE instance on the heap, shared by every request thread
    static class BuggyFareCalculator {
        private int km;                                  // per-request data in a field: shared!

        int fare(int requestKm) {
            this.km = requestKm;
            Thread.onSpinWait();                         // a tiny gap where another request can write km
            return 50 + km * 12;
        }
    }

    static class SafeFareCalculator {
        int fare(int requestKm) {
            int km = requestKm;                          // a local: lives in this thread's own frame
            Thread.onSpinWait();
            return 50 + km * 12;
        }
    }

    interface Calc { int fare(int km); }

    static int wrongAnswers(Calc calc) throws InterruptedException {
        AtomicInteger wrong = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(8);   // like Tomcat's worker threads
        for (int t = 0; t < 8; t++) {
            int km = t + 1;
            pool.submit(() -> {
                for (int i = 0; i < 200_000; i++) {
                    if (calc.fare(km) != 50 + km * 12) wrong.incrementAndGet();
                }
            });
        }
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.MINUTES);
        return wrong.get();
    }

    public static void main(String[] args) throws InterruptedException {
        BuggyFareCalculator buggy = new BuggyFareCalculator();
        SafeFareCalculator safe = new SafeFareCalculator();
        System.out.println("field-based: " + wrongAnswers(buggy::fare) + " wrong fares out of 1600000");
        System.out.println("local-based: " + wrongAnswers(safe::fare) + " wrong fares out of 1600000");
    }
}`,
        },
        {
          type: "output",
          text: `field-based: 130266 wrong fares out of 1600000
local-based: 0 wrong fares out of 1600000

# two more runs
field-based: 136291 wrong fares out of 1600000
field-based: 114912 wrong fares out of 1600000
local-based: 0 wrong fares out of 1600000 (every run)`,
        },
        {
          type: "list",
          items: [
            "About 8% of fares were computed with **another request's distance**. No exception, no log line, just wrong money, and different every run. In a real service this shows up as a customer complaint, not an alert.",
            "The only difference between the two classes is where `km` lives: a field on the shared heap object, or a local in each thread's frame. Moving it to the stack fixed it completely, without any locking.",
            "Unit tests won't catch it, because they call the method from one thread. It only happens under concurrent load.",
          ],
        },
        {
          type: "heading",
          text: "Looking at both areas in a live JVM",
        },
        {
          type: "paragraph",
          text: "When a service misbehaves, `jcmd` (shipped with the JDK) reads both areas from the running process without restarting it. I parked a small dispatch program inside a method and looked at it from outside:",
        },
        {
          type: "code",
          language: "java",
          title: "DispatchService.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class DispatchService {
    record Ride(long id, String zone) {}
    static final List<Ride> ACTIVE = new ArrayList<>();

    static void assign(long id) throws InterruptedException {
        ACTIVE.add(new Ride(id, "zone-" + (id % 5)));
        Thread.sleep(60_000);                       // park here so jcmd can see the frame
    }

    public static void main(String[] args) throws InterruptedException {
        assign(42);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx128m DispatchService &
jcmd <pid> GC.heap_info
jcmd <pid> Thread.print
jcmd <pid> GC.class_histogram | grep DispatchService`,
        },
        {
          type: "output",
          text: ` garbage-first heap   total 131072K, used 3040K [0x00000000f8000000, 0x0000000100000000)
  region size 1024K, 2 young (2048K), 0 survivors (0K)
 Metaspace       used 176K, committed 384K, reserved 1114112K
  class space    used 10K, committed 128K, reserved 1048576K

"main" #1 [12400] prio=5 os_prio=0 cpu=34.84ms elapsed=1.83s tid=0x0000746584019990 nid=12400 waiting on condition
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
	at java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
	at DispatchService.assign(DispatchService.java:10)
	at DispatchService.main(DispatchService.java:14)

 198:             1             24  DispatchService$Ride`,
        },
        {
          type: "list",
          items: [
            "**Heap view:** a 128 MB G1 heap in 1 MB regions, 3 MB used. Metaspace is listed separately, because it isn't part of the heap.",
            "**Stack view:** the `main` thread's frames, top first: two JDK frames for `sleep`, then `assign` at line 10, then `main`. It's the same frame stack from the Methods lesson, read from outside the process. For a hung service, I'd take three of these a few seconds apart and look for threads stuck in the same frame.",
            "**Heap contents:** exactly one `Ride` instance, 24 bytes (12 header + 8 for `id` + 4 for the `zone` reference), held by the static `ACTIVE` list. In a leak, this is where a class with millions of instances stands out.",
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
              question: "What is the difference between stack and heap memory in Java?",
              answer:
                "The stack is per thread and holds frames for the method calls in progress: local variables, parameters and intermediate values. It's freed automatically when each method returns. The heap is shared by all threads and holds every object and array, and objects are freed by the garbage collector once nothing can reach them.\n\nSo the stack is small, fast, private and short-lived, and the heap is large, shared and managed. Each has its own error: `StackOverflowError` when a thread's stack is full, `OutOfMemoryError: Java heap space` when the heap is.",
            },
            {
              question: "Where is a local variable stored? Where is the object it refers to stored?",
              answer:
                "The variable is in the method's frame on the stack. The object is on the heap. For `Ride ride = new Ride()`, the stack slot holds only a reference, a 4-byte compressed pointer by default, and the `Ride` itself is a separate block on the heap.\n\nThat's why the same object can be reached from several variables in different frames or threads: each holds a copy of the reference, not a copy of the object.",
            },
            {
              question: "What happens to local variables when a method returns?",
              answer:
                "They're gone: the method's frame is popped, and with it every local and parameter. Nothing has to clean them up and the GC isn't involved.\n\nObjects those locals pointed to aren't affected directly. If the method returned one or stored it somewhere, it stays alive. In my `Lifetime` example, a `Booking` created in a finished method survived a GC because `main` held it, and an identical one held only weakly was cleared.",
            },
            {
              question: "Which is faster, stack or heap?",
              answer:
                "Pushing a frame and allocating a small object are both very cheap: a frame push moves a pointer, and heap allocation is a pointer bump in the thread's TLAB. The real difference is cleanup. Stack memory is reclaimed instantly when a frame pops; heap objects that live long cost GC work.\n\nSo the honest answer is that stack operations are slightly cheaper, but heap allocation isn't slow. Retention is what's expensive.",
            },
            {
              question: "Which error occurs when the stack is full, and which when the heap is full?",
              answer:
                "`StackOverflowError` for a thread's stack, usually from runaway recursion. `OutOfMemoryError: Java heap space` for the heap, usually from a leak or an undersized heap.\n\nI triggered both in one program: the recursion overflowed at about 22,000 levels on the default 1 MB stack, and holding 8 MB arrays in a list ran out after 31 of them with `-Xmx256m`.",
            },
            {
              question: "Is the heap shared between threads?",
              answer:
                "Yes. There's one heap per JVM and every thread can reach any object it has a reference to. Each thread has its own stack, and no thread can see another thread's frames.\n\nThat's the root of thread-safety: locals are private automatically, and heap objects reachable from two threads need synchronisation or immutability. My `TwoThreads` program kept a perfect private count in each thread but lost about 30% of increments on the shared counter.",
            },
            {
              question: "What is stored in the heap besides objects you create with `new`?",
              answer:
                "Arrays, the string pool (since Java 7), boxed values from autoboxing, lambda and anonymous-class instances, and the `Class` objects, which in HotSpot also hold the values of static fields. In short, anything that is an object.\n\nWhat's not on the heap: class metadata and bytecode (Metaspace, native memory), JIT-compiled code (code cache), and thread stacks of platform threads.",
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
              question: "Why are local variables thread-safe?",
              answer:
                "Because each thread has its own stack, and each call has its own frame, no other thread can name or access them. Two threads running the same method at the same moment have two separate `km` variables.\n\nThe caveat: a local reference is private, but the object it points to isn't, if it's reachable some other way. In `FareService`, moving `km` from a field to a local took wrong fares from about 130,000 out of 1.6 million to zero, with no locks.",
            },
            {
              question: "Can a heap object be referenced from multiple stacks?",
              answer:
                "Yes, any number of frames in any number of threads can hold references to the same object, plus fields of other objects and static fields. Every reference keeps it alive.\n\nThat's normal and useful (a shared cache, a singleton service), and it's exactly what makes an object shared state. The GC only collects it when none of those paths remains.",
            },
            {
              question: "How do you change the stack size and the heap size?",
              answer:
                "`-Xss` sets the stack size for each platform thread, for example `-Xss512k` (default 1 MB on 64-bit Linux). `-Xms` and `-Xmx` set the initial and maximum heap, or in containers `-XX:MaxRAMPercentage` sets the max heap as a percentage of the memory limit. A single thread's stack can also be set in its constructor: `new Thread(group, task, name, stackSize)`.\n\nI'd treat both as tuning, not fixes. Most stack overflows are bugs, and most heap OOMs need a heap dump before anyone touches `-Xmx`.",
            },
            {
              question: "Does each thread really use 1 MB of memory for its stack?",
              answer:
                "It reserves 1 MB of address space by default, but the OS only commits the pages it touches. With Native Memory Tracking, 222 threads in my test reserved 227 MB of stack but committed only 21 MB, about 100 KB each.\n\nSo a few hundred threads isn't a memory problem by itself. Deep recursion commits more, and many thousands of platform threads hit OS limits and context-switching costs, which is what virtual threads avoid.",
            },
            {
              question: "What are GC roots, and how do stacks relate to them?",
              answer:
                "The starting points from which the GC traces live objects: references in the frames of every live thread's stack, static fields, references held by JNI code, active monitors and a few JVM internals. Anything reachable from a root is alive; anything else is garbage.\n\nSo stacks keep heap objects alive. A local reference is a root for as long as its frame exists, and with JIT-compiled code, only as long as the variable is still used, since the JIT's stack maps don't report dead locals.",
            },
            {
              question: "Why does deep recursion fail when the same algorithm with an explicit stack works?",
              answer:
                "Recursion keeps its state in frames on the thread's stack, which has a fixed, small size. An explicit `ArrayDeque` keeps the same state as objects on the heap, which is far larger.\n\nIn my `RecursionMemory` example, summing a million numbers recursively overflowed, while the iterative version with a deque of a million `Integer`s finished. Java also doesn't eliminate tail calls, so even tail recursion keeps every frame.",
            },
            {
              question: "What is `OutOfMemoryError: unable to create native thread`?",
              answer:
                "The JVM asked the OS for a new thread and the OS refused, because a thread limit was hit (`ulimit -u`, a container's `pids.max`) or there wasn't native memory for the new stack. It isn't a heap problem.\n\nThe cause is almost always unbounded thread creation, like `new Thread` per request or an unbounded `newCachedThreadPool`. The fix is a bounded pool or virtual threads. A bigger `-Xmx` makes it worse, since it leaves less native memory.",
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
              question: "Where does a virtual thread's stack live?",
              answer:
                "While it runs, on its carrier platform thread's stack. When it blocks (sleep, I/O, a `ReentrantLock`), the JVM copies its frames into stack chunk objects on the heap and unmounts it, freeing the carrier. On resume, frames are copied back, lazily.\n\nThat's why a blocked virtual thread costs only as much heap as its actual stack depth, and why my test ran 100,000 concurrent one-second sleeps in 1.4 seconds total. One catch: in JDK 21, blocking inside `synchronized` pins the virtual thread to its carrier, so the stack can't be moved off. JDK 24 removed that limitation.",
            },
            {
              question: "Can the JVM allocate an object on the stack?",
              answer:
                "Not in the sense C++ can. HotSpot has no stack allocation of objects. What it does is scalar replacement: if escape analysis proves an object never leaves the method, C2 doesn't create it at all and keeps its fields in registers or stack slots.\n\nThe observable effect is similar, no heap allocation and no GC cost. In the previous lesson's test, a loop of ten million `Point`s allocated 0 MB with escape analysis on and 240 MB with it off.",
            },
            {
              question: "When exactly does an object referenced by a local become eligible for GC?",
              answer:
                "When it's no longer reachable, and for a local that can be earlier than the end of the method. In JIT-compiled code, the GC uses stack maps that only include live variables, so an object can be collected right after the last use of the local referring to it, even while the method is still running.\n\nThat's why `Reference.reachabilityFence` exists: to keep an object alive until a certain point, for example when native resources are tied to it. In interpreted code the slot often stays live until it's overwritten or the frame pops, so the behaviour can differ between the two.",
            },
            {
              question: "Explain how the stack and heap interact during a single method call that creates and returns an object.",
              answer:
                "The caller pushes the arguments; `invoke` creates the callee's frame with them in its first local slots. `new` bump-allocates the object in the thread's TLAB on the heap and pushes a reference onto the callee's operand stack. `invokespecial <init>` pushes a constructor frame that initialises the fields, then pops. The reference is stored in a local, and `areturn` moves it onto the caller's operand stack as the callee's frame is popped.\n\nSo the only thing that crossed between frames was a 4-byte reference. The object never moved, and it outlives the frame that created it because the caller's stack now refers to it.",
            },
            {
              question: "Why is `StackOverflowError` usually recoverable for other threads but `OutOfMemoryError` often isn't?",
              answer:
                "A stack overflow affects one thread's private memory. Once it unwinds, that stack is fine again, and other threads never shared it. Heap exhaustion affects the shared resource, so any thread allocating anything can fail, including in the middle of updating shared state, in framework code or in logging.\n\nThat's why after an OOM I'd rather exit (`-XX:+ExitOnOutOfMemoryError`) and let the orchestrator restart the instance than keep serving from a JVM in an unknown state. My leak demo in the previous lesson even failed a second time while printing the first error.",
            },
            {
              question: "What does `-Xss` affect, and what doesn't it affect?",
              answer:
                "It sets the stack size for new platform threads (Java frames and native frames share it in HotSpot), which bounds recursion depth. It doesn't affect the heap, Metaspace, or virtual threads' stacks, which grow as heap objects while parked. A single thread can also be given its own size through the `Thread` constructor's `stackSize` argument, which the JVM treats as a hint.\n\nIn the Methods lesson I measured it: `-Xss512k` cut the recursion depth by much more than half, because guard pages at the end of the stack are a fixed cost, and `-Xss4m` multiplied it.",
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
              question: "Under load, a Spring service occasionally returns another customer's data. Single-threaded tests all pass. What do you suspect?",
              answer:
                "Request data stored in a field of a singleton bean, or in a static. Every request thread shares that one heap object, so one request can overwrite the field between another request writing and reading it. Tests are single-threaded and never interleave.\n\nI'd look for mutable fields in `@Service`, `@Component` and `@Controller` classes, plus `SimpleDateFormat` and similar non-thread-safe objects held in fields. The fix is to move the state into locals and parameters. My `FareService` reproduction went from ~8% wrong answers to none with just that change.",
            },
            {
              question: "A recursive JSON serialisation of an entity graph throws StackOverflowError. Why, and what are your options?",
              answer:
                "Almost always a cycle: `Order` references its `Customer`, which references its list of `Order`s, and the serialiser follows the references forever. Each step is a frame, so it overflows. The stack trace shows the same few serializer frames repeating.\n\nOptions: return DTOs instead of entities (my first choice), or break the cycle with `@JsonManagedReference`/`@JsonBackReference` or `@JsonIgnore`. Raising `-Xss` doesn't help, because the recursion is infinite.",
            },
            {
              question: "A batch job processes a deep tree of categories recursively and fails only for one large customer. How would you fix it?",
              answer:
                "That customer's tree is deeper than the thread's stack allows. Rather than raising `-Xss` and waiting for a deeper tree, I'd rewrite the traversal iteratively with an `ArrayDeque` as an explicit stack. That moves the pending work to the heap, which is much larger, and makes the depth limit disappear for practical purposes.\n\nMy `RecursionMemory` example shows the pattern: recursive summing overflowed at a million levels while the deque version finished. If the data could contain cycles, I'd also keep a visited set.",
            },
            {
              question: "Your service creates a new thread per incoming request, and under a traffic spike it crashes with `unable to create native thread`. What do you change?",
              answer:
                "Stop creating unbounded platform threads. Each needs an OS thread and a stack reservation, and the OS limit was hit. For blocking I/O work on Java 21, `Executors.newVirtualThreadPerTaskExecutor()` keeps the thread-per-request style while parked threads cost only heap. Otherwise, a bounded `ThreadPoolExecutor` with a bounded queue and a rejection policy makes overload visible instead of fatal.\n\nI'd also check that a bigger `-Xmx` wasn't the attempted fix, since it takes memory away from thread stacks.",
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
            "Write a method `makeList()` that creates an `ArrayList<String>` in a local, adds three items and returns it. In `main`, print the result. In a comment, explain what was on the stack and what on the heap at each step, and why the list survived.",
            "Run `TwoThreads` three times and note the shared totals. Then change `int value` to `java.util.concurrent.atomic.AtomicInteger` and `shared.value++` to `shared.value.incrementAndGet()`. Run again.",
            "Write a recursive `factorialDepth(int n)` that only counts depth. Find where it overflows with the default stack, then with `-Xss256k` and `-Xss4m`.",
            "Rewrite the recursive method from step 3 as a loop. Can you make it overflow now?",
            "Run any program with a `Thread.sleep(60_000)` inside a method, then run `jcmd` with no arguments to find its pid, and `jcmd <pid> Thread.print`. Find your method's frame.",
            "Change `ManyThreads` to use `Executors.newFixedThreadPool(200)` instead of virtual threads, and predict the total time before running it.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: in step 1, the local and the frame are gone after `makeList` returns, but the list is still reachable from `main`. Step 2 gives different, too-low totals, then exactly `2000000` with `AtomicInteger`. Step 3's depth scales with `-Xss` and varies between runs because of the JIT. Step 4 can't overflow. In step 5, your method appears a couple of lines below `Thread.sleep`. In step 6, 100,000 one-second tasks on 200 threads take about 100,000 / 200 = 500 seconds, so let it run for a while or reduce the task count; that's the difference virtual threads make for blocking work.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `                STACK                         HEAP
how many        one per thread                one per JVM
holds           frames: locals, params,       every object and array,
                operand stack                 string pool, statics' objects
visible to      its own thread only           every thread with a reference
freed           on return (frame pop)         by GC, when unreachable
size            -Xss (1 MB reserved,          -Xms / -Xmx /
                ~100 KB committed idle)       -XX:MaxRAMPercentage
error           StackOverflowError            OutOfMemoryError: Java heap space
thread-safe     yes, by construction          only if immutable or synchronised

LINK      stack frames are GC roots: a local keeps its object alive
RULE      objects → heap; variables → wherever they're declared
VIRTUAL   blocked virtual threads park their frames on the heap
TOOLS     jcmd <pid> Thread.print       (stacks)
          jcmd <pid> GC.heap_info       (heap)
          jcmd <pid> GC.class_histogram / GC.heap_dump`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If someone says \"primitives go on the stack\": only local ones. Fields live in their objects, and objects live on the heap.",
            "Locals are thread-safe, shared heap objects are not. Keeping request data in locals instead of fields of singletons prevents a whole class of production bugs.",
            "That completes the methods-and-memory phase. Next comes Object-Oriented Programming, where these heap objects get classes, constructors and inheritance.",
          ],
        },
      ],
    },
  ],
};
