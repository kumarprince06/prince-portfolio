import type { Lesson } from "../types";

export const virtualThreads: Lesson = {
  slug: "virtual-threads",
  date: "2026-11-16",
  title: "Virtual Threads, Pinning and Structured Concurrency",
  description:
    "Java 21 virtual threads taken apart and measured on JDK 21: the VirtualThread class read through javap and reflection (a volatile int state that went 0, 7, 4, 99 as one thread slept, parked and finished, a carrierThread field that was null whenever it waited, a Continuation, and a FIFO ForkJoinPool scheduler sized by jdk.virtualThreadScheduler.parallelism), stack chunks that cost 2.1 to 2.7 KB per parked thread at call depth 10 and 3.9 to 7.6 KB at depth 200, 100,000 tasks that each sleep 100 ms finishing in 50.3 s on 200 platform threads, 11.0 s on 1,000 and 0.26 to 6.3 s on virtual threads with 15 platform threads in total, 1,000 blocking socket reads served by 8 carriers and a poller, pinning on Java 21 (100 synchronized sleeps took 1,510 ms against 117 ms with a ReentrantLock) found with -Djdk.tracePinnedThreads=full and the JFR jdk.VirtualThreadPinned event, a class initialiser pinned as NATIVE, Object.wait growing the carrier pool to 36, eight pinned carriers deadlocking on a lock their own holder could never be scheduled to release, jcmd Thread.dump_to_file -format=json showing 1,019 threads where Thread.print showed 27, why a pool of 20 virtual threads made 980 tasks see a stale ThreadLocal, Semaphore as the concurrency limit, StructuredTaskScope.ShutdownOnFailure and ShutdownOnSuccess (preview in Java 21) cancelling siblings within 5 ms with ScopedValue bindings inherited by every fork, CPU-bound work that gained nothing and starved a health check for 1.1 s, and a driver-payout job in a ride-hailing backend that exhausted the JDBC pool and failed 680 of 800 payouts the night it moved to virtual threads.",
  tags: ["Multithreading", "Virtual Threads", "Structured Concurrency", "JVM Internals"],
  sections: [
    {
      title: "What Virtual Threads Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, ThreadLocal, InheritableThreadLocal and Leaks in Pools, ended with 100,000 virtual threads each creating its own cached `SimpleDateFormat`, and with `ScopedValue` reading a rider's ID inside a `StructuredTaskScope`. Both assumed something this lesson explains: that a Java program can have 100,000 threads at once, cheaply, and that a thread can be created per task instead of borrowed from a pool.",
        },
        {
          type: "paragraph",
          text: "A **virtual thread** is a `java.lang.Thread` that the JVM schedules itself instead of handing to the operating system. Every thread so far in this track was a **platform thread**: a thin Java wrapper around one OS thread, with its own OS stack (1 MB reserved by default), scheduled by the kernel. A virtual thread has no OS thread of its own. It runs by being **mounted** on a platform thread called its **carrier**, and when it blocks (a `sleep`, a lock, a queue, a socket read), the JVM **unmounts** it: its stack frames are copied to a small object on the heap and the carrier is free to run another virtual thread. When the wait is over, any free carrier copies the frames back and continues.",
        },
        {
          type: "paragraph",
          text: "That one trick changes the arithmetic of servers. A request that spends 95% of its time waiting for a database no longer holds an OS thread while it waits, so the number of requests in progress is no longer limited by how many OS threads the machine can afford. The code stays plain blocking code: no callbacks, no `CompletableFuture` chains. The catch is in the details: some blocking **pins** the virtual thread to its carrier on Java 21, pooling virtual threads defeats the point, an unbounded number of threads can overwhelm whatever they call, and CPU-bound work gains nothing.",
        },
        {
          type: "paragraph",
          text: "This lesson measures all of it on JDK 21: the `VirtualThread` class and its state field, the scheduler and its properties, stack chunks on the heap, 100,000 blocking tasks on platform and virtual threads, pinning and the two tools that find it, JSON thread dumps, `Semaphore` as the right way to limit concurrency, and `StructuredTaskScope`, the preview API that gives a group of virtual threads a parent, a lifetime and cancellation. The next lesson, Deadlock, Livelock and Starvation, starts the phase on liveness failures, and one of them already appears here: eight pinned carriers deadlocked behind a thread that couldn't get a carrier to release its lock.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java has had user-mode threads before. Java 1.0 and 1.1 on Solaris used **green threads**, scheduled by the JVM on a single OS thread; they couldn't use more than one CPU, and by Java 1.3 every JVM had moved to one OS thread per Java thread. For twenty years, that 1:1 model meant servers either kept a bounded pool of threads (and queued requests) or went asynchronous (NIO selectors, Netty, reactive libraries), giving up readable stack traces and simple blocking code. Project Loom, started in 2017 and led by Ron Pressler, set out to make threads cheap again without changing the `Thread` API, using one-shot delimited continuations inside the JVM.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.1 (1997)", "Green threads on Solaris; replaced by native threads by Java 1.3", "The old M:1 model, which couldn't use multiple CPUs"],
            ["Java 5 to 8", "Thread pools, `CompletableFuture`, NIO", "Working around expensive threads with pools and async code"],
            ["Java 19 (2022)", "Virtual threads preview (JEP 425); structured concurrency incubator (JEP 428)", "`Thread.ofVirtual()`, `newVirtualThreadPerTaskExecutor()`; `ExecutorService` becomes `AutoCloseable`"],
            ["Java 20 (2023)", "Second previews (JEP 436, JEP 437); `ScopedValue` incubator", "API settled"],
            ["Java 21 (2023)", "Virtual threads final (JEP 444); `StructuredTaskScope` preview (JEP 453); `ScopedValue` preview (JEP 446)", "The JDK in this lesson; pinning in `synchronized` still exists"],
            ["Java 22 to 24", "Structured concurrency previews continue (JEP 462, 480, 499)", "Still preview, still behind `--enable-preview`"],
            ["Java 24 (2025)", "JEP 491: virtual threads no longer pin inside `synchronized`", "The biggest Java 21 pitfall goes away; `jdk.tracePinnedThreads` is removed"],
            ["Java 25 (2025)", "`ScopedValue` final (JEP 506); structured concurrency fifth preview with a redesigned API (JEP 505)", "`StructuredTaskScope.open()` and `Joiner` replace the Java 21 subclasses"],
          ],
        },
        {
          type: "paragraph",
          text: "Everything below is measured on JDK 21 (`21.0.13`), the long-term release most services run. Where newer JDKs behave differently, I say so, but I didn't measure them.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing company's support line with 8 agents and 100,000 open conversations.",
        },
        {
          type: "list",
          items: [
            "**The agents are carriers** (platform threads, one per CPU core). **The conversations are virtual threads.** An agent works on one conversation at a time.",
            "**Unmounting is putting a customer on hold.** When a conversation has to wait (\"let me check with the driver\"), the agent writes a note on the conversation's card (the stack chunk), files it, and takes the next conversation in the queue. The waiting customer costs a card, not an agent.",
            "**Mounting is any free agent picking the card back up** when the driver replies. It doesn't have to be the same agent; the card has everything needed to continue.",
            "**Pinning is a conversation that can't be put on hold.** On Java 21, if the agent is inside a `synchronized` block (holding a key to a filing cabinet that only the agent's own hand can hold) when the wait starts, the agent has to sit there holding the phone. Eight such calls and the whole support line stops answering.",
            "**A `Semaphore` is a limit on how many conversations may call the warehouse at once.** With 100,000 conversations, the warehouse (the database) becomes the bottleneck, and someone has to limit how many call it.",
            "**A `StructuredTaskScope` is an agent opening three sub-tickets** (check surge, check ETA, check promo) and refusing to close the main ticket until all three are resolved or cancelled, so no sub-ticket is ever orphaned.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real agent can be interrupted mid-sentence. A carrier can't take a virtual thread off unless that thread blocks. A conversation that never waits (CPU-bound work) keeps its agent until it finishes, however long that takes, which is why CPU-heavy code gains nothing from virtual threads and can starve everyone else.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/virtual-threads-carriers.svg",
          alt: "A ForkJoinPool named ForkJoinPool-1 with eight carrier platform threads, worker-1 to worker-8. Six carriers each have a virtual thread mounted and RUNNING, such as #20 asha and #4107. Worker-3 is shown in red with virtual thread #57 PINNED because it called sleep inside synchronized. Worker-8 is idle and takes the next runnable continuation. A blue arrow labelled unmount points down to the Java heap: when a virtual thread blocks in park, sleep, a queue or a socket, its frames are copied into a StackChunk and the carrier is freed. An orange arrow labelled mount points back up: unpark submits runContinuation to the pool and any free carrier copies the frames back and resumes. The heap box lists parked virtual threads as objects, each a VirtualThread pointing to a Continuation and a StackChunk, in states PARKED, TIMED_PARKED and UNPARKED, with 9,997 more. Measured with a class histogram for 10,000 parked threads: VirtualThread objects 1.4 MB at 144 bytes each, chunks 2.1 to 2.7 KB at depth 10, StackChunks 21 to 27 MB at call depth 10 and 39 to 76 MB at depth 200. A side box lists what blocking does on JDK 21: sleep, LockSupport.park, ReentrantLock, BlockingQueue, Semaphore and socket I/O unmount; blocking inside synchronized pins with reason MONITOR; class initialisation and native frames pin with reason NATIVE; Object.wait pins but the pool adds a carrier, up to 256; JDK 24 removes pinning in synchronized. The footer: 100,000 tasks sleeping 100 ms each took 10.2 to 11.7 s on 1,000 platform threads and 0.26 to 6.3 s with a virtual thread per task on 15 platform threads.",
          caption: "Carriers are a handful of platform threads; parked virtual threads are heap objects. Blocking unmounts, except when it pins.",
        },
        {
          type: "heading",
          text: "Platform thread vs virtual thread",
        },
        {
          type: "table",
          headers: ["", "Platform thread", "Virtual thread"],
          rows: [
            ["Backed by", "One OS thread for its whole life", "No OS thread; mounted on a carrier while running"],
            ["Stack", "OS stack, 1 MB reserved (`-Xss`), fixed", "Frames on the carrier while mounted; a heap `StackChunk` while parked, sized to the actual stack"],
            ["Scheduled by", "The OS kernel, preemptively, with time slices", "The JVM's `ForkJoinPool`, only at blocking points (no time slicing)"],
            ["Creation cost (measured below)", "129 to 177 us, 20 to 22 KB RSS each", "1.4 to 3.4 us, under 1 KB RSS each"],
            ["How many", "Thousands", "Millions"],
            ["Pool them?", "Yes: they're expensive", "No: create one per task"],
            ["Daemon / priority", "Configurable", "Always daemon; priority fixed at 5"],
            ["`ThreadLocal`", "Supported", "Supported, but per task (previous lesson)"],
          ],
        },
        {
          type: "heading",
          text: "What blocking does on JDK 21",
        },
        {
          type: "table",
          headers: ["Operation", "Effect on the carrier", "Shown below in"],
          rows: [
            ["`Thread.sleep`, `LockSupport.park`, `ReentrantLock`, `Condition`, `BlockingQueue`, `Semaphore`, `CountDownLatch`", "Unmounts: carrier freed", "`VirtualThreadPeek`, `PinnedCarriers`"],
            ["Socket and `SocketChannel` I/O", "Unmounts: socket switched to non-blocking, registered with a poller thread", "`SocketUnmount`"],
            ["Blocking while holding a monitor (`synchronized`)", "**Pins**: reason `MONITOR`, carrier blocked", "`PinnedCarriers`"],
            ["Blocking under a native frame (JNI, class initialiser)", "**Pins**: reason `NATIVE`", "`NativePin`"],
            ["`Object.wait()`", "Pins, but the scheduler adds a temporary carrier (up to `maxPoolSize`)", "`WaitCompensates`"],
            ["CPU work", "Holds the carrier until the next blocking call", "`CpuBound`"],
          ],
        },
        {
          type: "heading",
          text: "Scheduler properties",
        },
        {
          type: "table",
          headers: ["System property", "Default (read from bytecode)", "Meaning"],
          rows: [
            ["`jdk.virtualThreadScheduler.parallelism`", "`availableProcessors()` (8 here)", "Number of carriers normally running"],
            ["`jdk.virtualThreadScheduler.maxPoolSize`", "`max(parallelism, 256)`", "Hard cap, including temporary carriers added to compensate for `Object.wait` and some file I/O"],
            ["`jdk.virtualThreadScheduler.minRunnable`", "`max(parallelism / 2, 1)`", "Minimum runnable carriers the pool tries to keep"],
            ["`jdk.tracePinnedThreads`", "Off; `full` or `short`", "Print a stack trace when a virtual thread blocks while pinned (Java 21 to 23)"],
            ["`jdk.traceVirtualThreadLocals`", "Off", "Stack trace when a virtual thread sets a `ThreadLocal` (previous lesson)"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "`java.lang.VirtualThread` is a package-private class, so it doesn't appear in the API docs, but `javap -p` shows all of it (JDK 21, trimmed):",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -constants java.lang.VirtualThread
javap -p jdk.internal.vm.Continuation jdk.internal.vm.StackChunk`,
        },
        {
          type: "output",
          text: `final class java.lang.VirtualThread extends java.lang.BaseVirtualThread {
  private static final jdk.internal.vm.ContinuationScope VTHREAD_SCOPE;
  private static final java.util.concurrent.ForkJoinPool DEFAULT_SCHEDULER;
  private static final java.util.concurrent.ScheduledExecutorService UNPARKER;
  private static final int TRACE_PINNING_MODE;
  private final java.util.concurrent.Executor scheduler;
  private final jdk.internal.vm.Continuation cont;
  private final java.lang.Runnable runContinuation;
  private volatile int state;
  private static final int NEW = 0;
  private static final int STARTED = 1;
  private static final int RUNNING = 2;
  private static final int PARKING = 3;
  private static final int PARKED = 4;
  private static final int PINNED = 5;
  private static final int TIMED_PARKING = 6;
  private static final int TIMED_PARKED = 7;
  private static final int TIMED_PINNED = 8;
  private static final int UNPARKED = 9;
  private static final int YIELDING = 10;
  private static final int YIELDED = 11;
  private static final int TERMINATED = 99;
  private static final int SUSPENDED = 256;
  private volatile boolean parkPermit;
  private volatile java.lang.Thread carrierThread;
  private volatile java.util.concurrent.CountDownLatch termination;
  private void runContinuation();
  private void submitRunContinuation();
  private void mount();
  private void unmount();
  private boolean yieldContinuation();
  private void afterYield();
  void park();
  void parkNanos(long);
  private void parkOnCarrierThread(boolean, long);
  private java.util.concurrent.Future<?> scheduleUnpark(long);
  void unpark();
  void sleepNanos(long) throws java.lang.InterruptedException;
  ...
}
public class jdk.internal.vm.Continuation {
  private final java.lang.Runnable target;
  private final jdk.internal.vm.ContinuationScope scope;
  private jdk.internal.vm.Continuation parent;
  private jdk.internal.vm.StackChunk tail;
  private boolean done;
  private volatile boolean mounted;
  private static native int doYield();
  private static native void enterSpecial(jdk.internal.vm.Continuation, boolean, boolean);
  public final void run();
  public static boolean yield(jdk.internal.vm.ContinuationScope);
  protected void onPinned(jdk.internal.vm.Continuation$Pinned);
  public static native void pin();
  public static native void unpin();
  ...
}
public final class jdk.internal.vm.StackChunk {
  private jdk.internal.vm.StackChunk parent;
  private int size;
  private int sp;
  private int bottom;
}`,
        },
        {
          type: "list",
          items: [
            "**A virtual thread is a `Thread` plus a `Continuation`.** `cont` holds the code to run and, while the thread is parked, a `tail` pointer to its saved frames in a `StackChunk`. `Continuation.run()` enters or resumes it; `Continuation.yield(scope)` suspends it, and the native `doYield` does the actual copy of frames from the carrier's stack to the chunk (\"freezing\"). Resuming copies them back (\"thawing\"), lazily, a few frames at a time.",
            "**`state` is a volatile int with 14 values.** The interesting ones are the pairs: `PARKING` (3) is the moment between deciding to park and finishing the yield, `PARKED` (4) is fully unmounted, and `PINNED` (5) means the yield failed and the thread is parked **on its carrier**. The `TIMED_` versions are the same for `parkNanos` and `sleep`.",
            "**`carrierThread` is set by `mount()` and cleared by `unmount()`.** When it's `null`, the virtual thread isn't using any OS thread at all.",
            "**`scheduler` is an `Executor`**, by default the shared `DEFAULT_SCHEDULER`, a `ForkJoinPool`. `runContinuation` is a `Runnable` that the scheduler runs to mount and continue the thread. Every resume of every virtual thread is one task submitted to that pool.",
            "**`UNPARKER`** is a `ScheduledExecutorService` with one platform thread named `VirtualThread-unparker`: `sleep` and timed parks schedule their wake-up on it.",
            "**`Continuation$Pinned`** is an enum with three reasons: `NATIVE`, `MONITOR`, `CRITICAL_SECTION`. They're what `jdk.tracePinnedThreads` prints later.",
          ],
        },
        {
          type: "heading",
          text: "The default scheduler, from bytecode",
        },
        {
          type: "paragraph",
          text: "The pool is created by a lambda in `createDefaultScheduler` (`javap -c -p -constants java.lang.VirtualThread`, trimmed):",
        },
        {
          type: "output",
          text: `  private static java.util.concurrent.ForkJoinPool lambda$createDefaultScheduler$4(...);
       0: ldc_w         #605                // String jdk.virtualThreadScheduler.parallelism
       8: ldc_w         #610                // String jdk.virtualThreadScheduler.maxPoolSize
      16: ldc_w         #612                // String jdk.virtualThreadScheduler.minRunnable
      38: invokestatic  #614                // Method java/lang/Runtime.getRuntime:()Ljava/lang/Runtime;
      41: invokevirtual #620                // Method java/lang/Runtime.availableProcessors:()I
      66: sipush        256
      69: invokestatic  #627                // Method java/lang/Integer.max:(II)I
      87: iload_1
      88: iconst_2
      89: idiv
      90: iconst_1
      91: invokestatic  #627                // Method java/lang/Integer.max:(II)I
     102: iconst_1                          // asyncMode = true
     105: new           #109                // class java/util/concurrent/ForkJoinPool
     115: iconst_0                          // corePoolSize = 0
     123: ldc2_w        #638                // long 30l
     126: getstatic     #640                // Field java/util/concurrent/TimeUnit.SECONDS:Ljava/util/concurrent/TimeUnit;
     129: invokespecial #643                // Method java/util/concurrent/ForkJoinPool."<init>":(ILjava/util/concurrent/ForkJoinPool$ForkJoinWorkerThreadFactory;Ljava/lang/Thread$UncaughtExceptionHandler;ZIIILjava/util/function/Predicate;JLjava/util/concurrent/TimeUnit;)V`,
        },
        {
          type: "list",
          items: [
            "**Parallelism defaults to the number of CPUs**, or `jdk.virtualThreadScheduler.parallelism`. `maxPoolSize` defaults to `max(parallelism, 256)`; `minRunnable` to `max(parallelism / 2, 1)`. Idle carriers die after 30 seconds (`30l`, `SECONDS`).",
            "**`asyncMode` is `true`**: each carrier takes tasks from its own queue in FIFO order, not the LIFO order the common pool uses for fork/join recursion. Virtual threads resumed earlier run earlier.",
            "**The thread factory creates `jdk.internal.misc.CarrierThread`**, a `ForkJoinWorkerThread` subclass. This pool is separate from `ForkJoinPool.commonPool()`, so parallel streams don't compete with virtual threads for workers.",
          ],
        },
        {
          type: "heading",
          text: "Park and resume, in bytecode",
        },
        {
          type: "paragraph",
          text: "`park()` and `runContinuation()` are the two halves of every unmount and mount (trimmed to the calls):",
        },
        {
          type: "output",
          text: `  void park();
      23: invokevirtual #324                // Method getAndSetParkPermit:(Z)Z       permit available? return at once
      40: iconst_3
      41: invokevirtual #246                // Method setState:(I)V                  PARKING
      45: invokevirtual #328                // Method yieldContinuation:()Z          try to unmount
     114: iconst_2
     115: invokevirtual #246                // Method setState:(I)V                  RUNNING (yield failed)
     200: invokevirtual #331                // Method parkOnCarrierThread:(ZJ)V      ... so park the carrier: PINNED

  private void runContinuation();
      42: invokevirtual #63                 // Method compareAndSetState:(II)Z      STARTED or UNPARKED -> RUNNING
      65: invokevirtual #71                 // Method mount:()V                      carrierThread = current carrier
      72: invokevirtual #74                 // Method jdk/internal/vm/Continuation.run:()V   run until the next yield
      76: invokevirtual #78                 // Method unmount:()V                    carrierThread = null
      97: invokevirtual #87                 // Method afterYield:()V                 PARKING -> PARKED, or resubmit

  private void afterYield();
      42: iconst_4                          // PARKING (3) -> PARKED (4)
      46: bipush        7                   // TIMED_PARKING (6) -> TIMED_PARKED (7)
      63: bipush        9                   // if unparked meanwhile: UNPARKED (9) ...
      95: invokevirtual #260                // Method lazySubmitRunContinuation:(Ljava/util/concurrent/ForkJoinPool;)V`,
        },
        {
          type: "paragraph",
          text: "So a park is: set `PARKING`, call `Continuation.yield`, which freezes the frames into a chunk and returns control to `runContinuation` on the carrier, which calls `unmount()` and `afterYield()` to publish `PARKED`. The state is set to `PARKED` only **after** the carrier has let go, so an `unpark` arriving in between sees `PARKING` and is handled by the re-check in `afterYield`. If `yieldContinuation` returns false (the thread is pinned), `park` falls back to `parkOnCarrierThread`, which parks the carrier itself with `Unsafe.park`.",
        },
        {
          type: "heading",
          text: "Watching state and carrier with reflection",
        },
        {
          type: "paragraph",
          text: "Reading the private fields needs `--add-opens java.base/java.lang=ALL-UNNAMED`. The program checks a virtual thread from the outside while it sleeps, parks and ends, then lets four threads print which carrier ran each step:",
        },
        {
          type: "code",
          language: "java",
          title: "VirtualThreadPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.locks.LockSupport;

public class VirtualThreadPeek {
    static final Class<?> VT;
    static final Field STATE, CARRIER, CONT, SCHEDULER, DEFAULT;
    static {
        try {
            VT = Class.forName("java.lang.VirtualThread");
            STATE = open(VT, "state");
            CARRIER = open(VT, "carrierThread");
            CONT = open(VT, "cont");
            SCHEDULER = open(VT, "scheduler");
            DEFAULT = open(VT, "DEFAULT_SCHEDULER");
        } catch (Exception e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    static Field open(Class<?> c, String name) throws Exception {
        Field f = c.getDeclaredField(name);
        f.setAccessible(true);
        return f;
    }

    static volatile boolean released;

    static String peek(Thread vt) throws Exception {
        return String.format("state=%-2d carrier=%-28s getState()=%s", STATE.getInt(vt),
                CARRIER.get(vt) == null ? "null" : ((Thread) CARRIER.get(vt)).getName(), vt.getState());
    }

    public static void main(String[] args) throws Exception {
        ForkJoinPool pool = (ForkJoinPool) DEFAULT.get(null);
        System.out.println("default scheduler: " + pool);
        System.out.println("asyncMode (FIFO)=" + pool.getAsyncMode() + " parallelism=" + pool.getParallelism());

        Thread vt = Thread.ofVirtual().name("trip-42").unstarted(() -> {
            System.out.println("  inside, before sleep: " + Thread.currentThread());
            try { Thread.sleep(200); } catch (InterruptedException e) { }
            System.out.println("  inside, after sleep:  " + Thread.currentThread());
            while (!released) LockSupport.park();            // park can return spuriously: loop
            System.out.println("  inside, after park:   " + Thread.currentThread());
        });
        System.out.println("unstarted       " + peek(vt));
        System.out.println("cont = " + CONT.get(vt) + ", scheduler is the default pool: " + (SCHEDULER.get(vt) == pool));
        vt.start();
        Thread.sleep(100);
        System.out.println("sleeping        " + peek(vt));
        Thread.sleep(250);
        System.out.println("parked          " + peek(vt));
        released = true;
        LockSupport.unpark(vt);
        vt.join();
        System.out.println("terminated      " + peek(vt));
        System.out.println("pool after: " + pool);

        // four threads, four sleeps each: which carrier runs each step?
        Thread[] ts = new Thread[4];
        for (int i = 0; i < 4; i++) {
            ts[i] = Thread.ofVirtual().name("driver-" + i).start(() -> {
                StringBuilder sb = new StringBuilder(Thread.currentThread().getName() + ":");
                for (int step = 0; step < 4; step++) {
                    String s = Thread.currentThread().toString();
                    sb.append(' ').append(s.substring(s.indexOf("worker-")));
                    try { Thread.sleep(20); } catch (InterruptedException e) { }
                }
                System.out.println("  " + sb);
            });
        }
        for (Thread t : ts) t.join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.lang=ALL-UNNAMED VirtualThreadPeek.java",
        },
        {
          type: "output",
          text: `default scheduler: java.util.concurrent.ForkJoinPool@45752059[Running, parallelism = 8, size = 0, active = 0, running = 0, steals = 0, tasks = 0, submissions = 0]
asyncMode (FIFO)=true parallelism=8
unstarted       state=0  carrier=null                         getState()=NEW
cont = java.lang.VirtualThread$VThreadContinuation@3cd3e762 scope: VirtualThreads, scheduler is the default pool: true
  inside, before sleep: VirtualThread[#23,trip-42]/runnable@ForkJoinPool-1-worker-1
sleeping        state=7  carrier=null                         getState()=TIMED_WAITING
  inside, after sleep:  VirtualThread[#23,trip-42]/runnable@ForkJoinPool-1-worker-1
parked          state=4  carrier=null                         getState()=WAITING
  inside, after park:   VirtualThread[#23,trip-42]/runnable@ForkJoinPool-1-worker-1
terminated      state=99 carrier=null                         getState()=TERMINATED
pool after: java.util.concurrent.ForkJoinPool@45752059[Running, parallelism = 8, size = 2, active = 0, running = 0, steals = 3, tasks = 0, submissions = 0]
  driver-0: worker-1 worker-2 worker-4 worker-1
  driver-2: worker-1 worker-1 worker-1 worker-3
  driver-1: worker-2 worker-2 worker-3 worker-4
  driver-3: worker-1 worker-3 worker-1 worker-1`,
        },
        {
          type: "list",
          items: [
            "**The pool starts with no threads** (`size = 0`): carriers are created on demand. After one virtual thread had run, it had 2.",
            "**While sleeping, the state was 7 (`TIMED_PARKED`) and `carrierThread` was `null`**: the thread was fully unmounted, its frames in a chunk on the heap. `getState()` maps that to the familiar `TIMED_WAITING`. Parked, it was 4 (`PARKED`), shown as `WAITING`; finished, 99.",
            "**`toString()` shows the carrier**: `VirtualThread[#23,trip-42]/runnable@ForkJoinPool-1-worker-1`. It's only meaningful at that instant.",
            "**Carriers change between steps.** `driver-0` ran its four steps on workers 1, 2, 4 and 1; the assignment was different in every run. Code on a virtual thread must never assume its carrier (for example, by using the carrier's identity or its thread locals).",
            "In one of my first runs, without the `while (!released)` loop, `LockSupport.park()` returned at once and the thread finished early. `park` is allowed to return spuriously, on virtual threads as on platform threads; always park in a loop that re-checks the condition.",
          ],
        },
        {
          type: "heading",
          text: "What a parked virtual thread costs: stack chunks",
        },
        {
          type: "paragraph",
          text: "10,000 virtual threads parked at the bottom of a recursion 10 frames deep, then 200 frames deep, counted with `jcmd GC.class_histogram`:",
        },
        {
          type: "code",
          language: "java",
          title: "StackChunks.java",
          code: `import java.util.concurrent.CountDownLatch;

public class StackChunks {
    static CountDownLatch release, parked;

    // Recurse to the requested depth, then block: the whole stack must be saved somewhere
    static void descend(int depth) {
        if (depth == 0) {
            parked.countDown();
            try { release.await(); } catch (InterruptedException e) { }
            return;
        }
        descend(depth - 1);
    }

    static void histogram() throws Exception {
        Process p = new ProcessBuilder("jcmd", Long.toString(ProcessHandle.current().pid()), "GC.class_histogram")
                .redirectErrorStream(true).start();
        p.inputReader().lines()
                .filter(l -> l.contains("java.lang.VirtualThread ") || l.contains("jdk.internal.vm.StackChunk ")
                        || l.contains("VThreadContinuation "))
                .forEach(l -> System.out.println("    " + l.trim()));
        p.waitFor();
    }

    public static void main(String[] args) throws Exception {
        for (int depth : new int[] {10, 200}) {
            release = new CountDownLatch(1);
            parked = new CountDownLatch(10_000);
            Thread[] threads = new Thread[10_000];
            for (int i = 0; i < threads.length; i++) {
                threads[i] = Thread.ofVirtual().start(() -> descend(depth));
            }
            parked.await();
            Thread.sleep(200);                         // let the last ones finish unmounting
            System.out.println("10,000 virtual threads parked at call depth " + depth + ":");
            histogram();
            release.countDown();
            for (Thread t : threads) t.join();
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx512m StackChunks.java",
        },
        {
          type: "output",
          text: `10,000 virtual threads parked at call depth 10:
    1:         10000       21098416  jdk.internal.vm.StackChunk (java.base@21.0.13.0.3)
    2:         10000        1440000  java.lang.VirtualThread (java.base@21.0.13.0.3)
    4:         10000         480000  java.lang.VirtualThread$VThreadContinuation (java.base@21.0.13.0.3)
10,000 virtual threads parked at call depth 200:
    1:         10000       39440000  jdk.internal.vm.StackChunk (java.base@21.0.13.0.3)
    2:         10000        1440000  java.lang.VirtualThread (java.base@21.0.13.0.3)
    4:         10000         480000  java.lang.VirtualThread$VThreadContinuation (java.base@21.0.13.0.3)`,
        },
        {
          type: "list",
          items: [
            "**One `StackChunk`, one `VirtualThread` (144 bytes) and one continuation (48 bytes) per parked thread.** The thread object is tiny; the chunk is where the memory goes.",
            "**A chunk is as big as the stack it saved**: about 2.1 KB at depth 10 and 3.9 KB at depth 200 in this run. Over three runs it was 21.1 to 26.7 MB at depth 10 and 39.4 to 76.3 MB at depth 200. The spread comes from the JIT: compiled frames are compact, interpreted ones aren't, and how much had been compiled when the threads parked varied. With `-Xint` (interpreter only) it was 32.7 MB and 236.5 MB.",
            "**Compare a platform thread**: it reserves 1 MB of address space for its stack whether it uses 2 KB or 900 KB, and measured below at about 20 KB of real memory each. A virtual thread pays for the frames it actually has, and pays on the garbage-collected heap, which is why a deep framework stack (Spring, Hibernate, a servlet filter chain) costs more per parked request than a toy example.",
          ],
        },
      ],
    },
    {
      title: "Why 100,000 Blocking Tasks Become Cheap",
      blocks: [
        {
          type: "paragraph",
          text: "A typical request handler waits far more than it computes. Here each of 100,000 tasks sleeps 100 ms, standing in for a database or HTTP call, run three ways. `ThreadMXBean.getPeakThreadCount()` counts platform threads only, so it shows how many OS threads each approach needed:",
        },
        {
          type: "code",
          language: "java",
          title: "HundredThousandWaits.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

public class HundredThousandWaits {
    static final int TASKS = 100_000;
    static final AtomicLong DONE = new AtomicLong();

    // A request handler that mostly waits: 100 ms on "the database"
    static void handle() {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        DONE.incrementAndGet();
    }

    static void run(String label, ExecutorService executor) {
        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        mx.resetPeakThreadCount();
        DONE.set(0);
        long t0 = System.nanoTime();
        try (executor) {
            for (int i = 0; i < TASKS; i++) executor.submit(HundredThousandWaits::handle);
        }
        long ms = (System.nanoTime() - t0) / 1_000_000;
        System.out.printf("%-34s %,d tasks in %,6d ms  (%,7.0f tasks/s)  peak platform threads %,d%n",
                label, DONE.get(), ms, DONE.get() * 1000.0 / ms, mx.getPeakThreadCount());
    }

    public static void main(String[] args) {
        run("fixed pool, 200 platform threads", Executors.newFixedThreadPool(200));
        run("fixed pool, 1,000 platform threads", Executors.newFixedThreadPool(1_000));
        run("virtual thread per task", Executors.newVirtualThreadPerTaskExecutor());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx512m HundredThousandWaits.java",
        },
        {
          type: "output",
          text: `fixed pool, 200 platform threads   100,000 tasks in 50,262 ms  (  1,990 tasks/s)  peak platform threads 206
fixed pool, 1,000 platform threads 100,000 tasks in 11,004 ms  (  9,088 tasks/s)  peak platform threads 1,006
virtual thread per task            100,000 tasks in    591 ms  (169,205 tasks/s)  peak platform threads 15`,
        },
        {
          type: "list",
          items: [
            "**With a pool, throughput is threads divided by wait time.** 200 threads that each wait 100 ms can finish at most 2,000 tasks a second, so 100,000 tasks take 50 seconds; that was exactly what I got in all three runs (50.2 to 50.3 s). 1,000 threads: 10.2 to 11.7 s. This is Little's law: concurrency = throughput x latency. With latency fixed by the database, the only way to raise throughput is more concurrency, and with platform threads, concurrency costs OS threads.",
            "**Virtual threads ran all 100,000 at once on 15 platform threads**: 8 carriers, `VirtualThread-unparker`, `main` and the JVM's own threads. The time is about 100 ms of sleeping plus the cost of creating, parking and waking 100,000 threads.",
            "**The virtual-thread time was the noisiest number in this lesson**: 0.26 s to 6.3 s over twelve runs. Other agents were running benchmarks on the same 8 cores (load average between 9 and 36 during those runs), and all 100,000 stack chunks live on a 512 MB heap: the GC log of the 6.3 s run showed 21 pause events, one of them 136 ms. Even the slowest run was about 1.6 times faster than 1,000 platform threads; the quiet runs were 20 to 40 times faster.",
          ],
        },
        {
          type: "heading",
          text: "Real blocking I/O: sockets unmount too",
        },
        {
          type: "paragraph",
          text: "`sleep` is the easy case. The point of virtual threads is that ordinary blocking I/O unmounts as well. A loopback server answers each connection after 200 ms; 1,000 virtual threads connect and block in `InputStream.read()`:",
        },
        {
          type: "code",
          language: "java",
          title: "SocketUnmount.java",
          code: `import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import java.util.concurrent.atomic.AtomicInteger;

public class SocketUnmount {
    public static void main(String[] args) throws Exception {
        ServerSocket server = new ServerSocket(0, 4096, InetAddress.getLoopbackAddress());
        // "driver location service": answers each connection after 200 ms
        Thread.ofVirtual().start(() -> {
            while (true) {
                try {
                    Socket s = server.accept();
                    Thread.ofVirtual().start(() -> {
                        try (s; OutputStream out = s.getOutputStream()) {
                            Thread.sleep(200);
                            out.write(42);
                        } catch (Exception e) { }
                    });
                } catch (Exception e) { return; }
            }
        });

        AtomicInteger ok = new AtomicInteger();
        long t0 = System.nanoTime();
        List<Thread> clients = new ArrayList<>();
        for (int i = 0; i < 1_000; i++) {
            clients.add(Thread.ofVirtual().start(() -> {
                try (Socket s = new Socket(server.getInetAddress(), server.getLocalPort());
                     InputStream in = s.getInputStream()) {
                    if (in.read() == 42) ok.incrementAndGet();      // a blocking read: the virtual thread unmounts
                } catch (Exception e) {
                    System.out.println(e);
                }
            }));
        }
        Thread.sleep(100);
        var all = Thread.getAllStackTraces().keySet();              // platform threads only
        TreeSet<String> platform = new TreeSet<>();
        for (Thread t : all) platform.add(t.getName().replaceAll("-\\\\d+$", "-N"));
        for (Thread c : clients) c.join();
        System.out.printf("1,000 blocking socket reads of 200 ms: %d ok in %,d ms%n", ok.get(), (System.nanoTime() - t0) / 1_000_000);
        System.out.println("platform threads during the run: " + all.size() + " " + platform);
        server.close();
    }
}`,
        },
        {
          type: "output",
          text: `1,000 blocking socket reads of 200 ms: 1000 ok in 377 ms
platform threads during the run: 19 [Common-Cleaner, Finalizer, ForkJoinPool-1-worker-N, Notification Thread, Read-Poller, Read-Updater, Reference Handler, Signal Dispatcher, VirtualThread-unparker, Write-Poller, Write-Updater, main]`,
        },
        {
          type: "list",
          items: [
            "**2,000 virtual threads (1,000 clients, 1,000 server handlers) blocked in socket calls on 19 platform threads.** 1,000 reads of 200 ms finished in 369 to 377 ms over two runs.",
            "**`Read-Poller` and `Write-Poller` are how it works.** On a virtual thread, the JDK's socket implementation puts the socket in non-blocking mode. A read that would block registers the file descriptor with the poller (epoll on Linux) and parks the virtual thread. When data arrives, the poller thread unparks it, and a carrier resumes it inside `read()`. The code above is ordinary blocking code; the asynchronous part is inside the JDK.",
            "**`Thread.getAllStackTraces()` returned only platform threads.** It doesn't include virtual threads, and neither does `jcmd Thread.print`, as the thread-dump section shows.",
            "**JDBC drivers, HTTP clients and `java.net.http.HttpClient`** all block on sockets this way, which is why most I/O libraries work on virtual threads unchanged. The exceptions are drivers that block inside `synchronized`, which is the next section.",
          ],
        },
      ],
    },
    {
      title: "Pinning on Java 21",
      blocks: [
        {
          type: "paragraph",
          text: "A virtual thread is **pinned** when it can't be unmounted, so blocking blocks its carrier too. On JDK 21 there are two causes: the thread holds a **monitor** (it's inside a `synchronized` block or method), or there's a **native frame** on its stack (a JNI call, or the JVM itself calling into Java, as it does to run a class initialiser). The continuation can't copy a frame that holds a monitor, because monitors in JDK 21 are tied to the carrier's OS thread, and it can't copy native frames at all.",
        },
        {
          type: "paragraph",
          text: "100 virtual threads each do a 100 ms blocking call while holding a lock. Each thread has its own lock, so there's no contention: any slowdown is pinning, not waiting.",
        },
        {
          type: "code",
          language: "java",
          title: "PinnedCarriers.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

public class PinnedCarriers {
    // One lock per driver: no contention at all, so any slowdown is pinning, not waiting for a lock
    static final int TASKS = 100;
    static final Object[] MONITORS = new Object[TASKS];
    static final ReentrantLock[] LOCKS = new ReentrantLock[TASKS];
    static {
        for (int i = 0; i < TASKS; i++) { MONITORS[i] = new Object(); LOCKS[i] = new ReentrantLock(); }
    }

    static void fetchDriverLocation() {
        try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    static void withSynchronized(int driver) {
        synchronized (MONITORS[driver]) {
            fetchDriverLocation();                      // blocking while holding a monitor: pins on JDK 21
        }
    }

    static void withReentrantLock(int driver) {
        LOCKS[driver].lock();
        try {
            fetchDriverLocation();                      // parks the virtual thread: unmounts
        } finally {
            LOCKS[driver].unlock();
        }
    }

    static void run(String label, java.util.function.IntConsumer body) throws InterruptedException {
        long t0 = System.nanoTime();
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < TASKS; i++) {
            int driver = i;
            threads.add(Thread.ofVirtual().start(() -> body.accept(driver)));
        }
        for (Thread t : threads) t.join();
        System.out.printf("%-16s %d virtual threads x 100 ms sleep: %,5d ms%n", label, TASKS, (System.nanoTime() - t0) / 1_000_000);
    }

    public static void main(String[] args) throws InterruptedException {
        System.out.println("carriers (parallelism): " + System.getProperty("jdk.virtualThreadScheduler.parallelism", "default = " + Runtime.getRuntime().availableProcessors()));
        run("synchronized", PinnedCarriers::withSynchronized);
        run("ReentrantLock", PinnedCarriers::withReentrantLock);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java PinnedCarriers.java
java -Djdk.virtualThreadScheduler.parallelism=2 PinnedCarriers.java`,
        },
        {
          type: "output",
          text: `carriers (parallelism): default = 8
synchronized     100 virtual threads x 100 ms sleep: 1,510 ms
ReentrantLock    100 virtual threads x 100 ms sleep:   117 ms
carriers (parallelism): 2
synchronized     100 virtual threads x 100 ms sleep: 5,342 ms
ReentrantLock    100 virtual threads x 100 ms sleep:   121 ms`,
        },
        {
          type: "list",
          items: [
            "**Pinned, the virtual threads behaved like a pool of 8 platform threads.** Each pinned sleep held a carrier for 100 ms, so 100 sleeps on 8 carriers needed 13 rounds: about 1.3 s, measured 1.34 to 1.51 s. With 2 carriers: 50 rounds, 5.3 s.",
            "**With `ReentrantLock`, the number of carriers didn't matter**: 104 to 121 ms either way. `ReentrantLock` parks through `LockSupport.park`, which unmounts the virtual thread even while it holds the lock, because the lock's ownership is recorded in the lock object, not in the carrier's OS thread.",
            "**Holding a monitor without blocking is fine.** Pinning only costs something if the thread blocks (sleep, I/O, lock wait) while pinned. A `synchronized` block that updates a counter and exits pins the thread for nanoseconds and doesn't matter; one that does a JDBC call inside it holds a carrier for the whole round trip.",
          ],
        },
        {
          type: "heading",
          text: "Finding pinning: -Djdk.tracePinnedThreads",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Djdk.tracePinnedThreads=full PinnedCarriers
java -Djdk.tracePinnedThreads=short PinnedCarriers`,
        },
        {
          type: "output",
          text: `carriers (parallelism): default = 8
VirtualThread[#20]/runnable@ForkJoinPool-1-worker-1 reason:MONITOR
    java.base/java.lang.VirtualThread$VThreadContinuation.onPinned(VirtualThread.java:199)
    java.base/jdk.internal.vm.Continuation.onPinned0(Continuation.java:393)
    java.base/java.lang.VirtualThread.parkNanos(VirtualThread.java:635)
    java.base/java.lang.VirtualThread.sleepNanos(VirtualThread.java:807)
    java.base/java.lang.Thread.sleep(Thread.java:507)
    PinnedCarriers.fetchDriverLocation(PinnedCarriers.java:15)
    PinnedCarriers.withSynchronized(PinnedCarriers.java:20) <== monitors:1
    PinnedCarriers.lambda$run$0(PinnedCarriers.java:38)
    java.base/java.lang.VirtualThread.run(VirtualThread.java:329)
synchronized     100 virtual threads x 100 ms sleep: 1,337 ms
ReentrantLock    100 virtual threads x 100 ms sleep:   117 ms

carriers (parallelism): default = 8
VirtualThread[#28]/runnable@ForkJoinPool-1-worker-8 reason:MONITOR
    PinnedCarriers.withSynchronized(PinnedCarriers.java:20) <== monitors:1
synchronized     100 virtual threads x 100 ms sleep: 1,339 ms
ReentrantLock    100 virtual threads x 100 ms sleep:   104 ms`,
        },
        {
          type: "list",
          items: [
            "**`reason:MONITOR` and `<== monitors:1`** point at the exact frame holding the monitor: `withSynchronized`, line 20. `full` prints the whole stack, `short` only the frames that hold monitors or are native.",
            "**100 pinned sleeps printed one trace.** The JDK remembers stack traces it has already printed and prints each distinct one once, so the trace tells you **where** pinning happens, not how often or for how long.",
            "**It prints from `onPinned`**, called when `Continuation.yield` fails. That's the same failed yield that sends `park` to `parkOnCarrierThread` in the bytecode above.",
            "The property was removed in JDK 24, together with monitor pinning (JEP 491). On 21, it's the cheapest way to find pinning in a test suite.",
          ],
        },
        {
          type: "heading",
          text: "Measuring pinning: JFR jdk.VirtualThreadPinned",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:StartFlightRecording:filename=pinned.jfr PinnedCarriers
jfr summary pinned.jfr | grep VirtualThread
jfr print --events jdk.VirtualThreadPinned --stack-depth 8 pinned.jfr`,
        },
        {
          type: "output",
          text: ` jdk.VirtualThreadPinned                   100          1401
 jdk.VirtualThreadStart                      0             0
 jdk.VirtualThreadEnd                        0             0
 jdk.VirtualThreadSubmitFailed               0             0
jdk.VirtualThreadPinned {
  startTime = 01:03:45.160 (2026-11-16)
  duration = 81.9 ms
  eventThread = "" (javaThreadId = 24, virtual)
  stackTrace = [
    java.lang.VirtualThread.parkOnCarrierThread(boolean, long) line: 689
    java.lang.VirtualThread.parkNanos(long) line: 648
    java.lang.VirtualThread.sleepNanos(long) line: 807
    java.lang.Thread.sleep(long) line: 507
    PinnedCarriers.fetchDriverLocation() line: 15
    PinnedCarriers.withSynchronized(int) line: 20
    PinnedCarriers.lambda$run$0(IntConsumer, int) line: 38
    java.lang.VirtualThread.run(Runnable) line: 329
  ]
}
...`,
        },
        {
          type: "list",
          items: [
            "**One event per pinned block, with its duration**: 100 events for 100 pinned sleeps. 99 of them lasted 107 to 121 ms (median 113 ms); one read 82 ms. The default and `profile` JFR settings both record this event when it lasts longer than 20 ms, so it's on in any production recording.",
            "**Where the trace is good for finding pinning in tests, JFR is for production**: it counts how often and how long, and JDK Mission Control can group the events by stack trace to rank the worst call sites.",
            "`jdk.VirtualThreadStart` and `End` are disabled by default (they'd be too frequent), which is why they show 0.",
          ],
        },
        {
          type: "heading",
          text: "Native frames: a class initialiser",
        },
        {
          type: "code",
          language: "java",
          title: "NativePin.java",
          code: `public class NativePin {
    static class FareTable {
        static final int BASE;
        static {
            try { Thread.sleep(100); } catch (InterruptedException e) { }   // "load the fare table" in a static initialiser
            BASE = 50;
        }
    }

    public static void main(String[] args) throws Exception {
        Thread.ofVirtual().start(() -> System.out.println("base fare " + FareTable.BASE)).join();
        Object lock = new Object();
        Thread.ofVirtual().start(() -> {
            synchronized (lock) {
                try { lock.wait(50); } catch (InterruptedException e) { }   // Object.wait inside a monitor
            }
        }).join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac NativePin.java && java -Djdk.tracePinnedThreads=full NativePin",
        },
        {
          type: "output",
          text: `VirtualThread[#20]/runnable@ForkJoinPool-1-worker-1 reason:NATIVE
    java.base/java.lang.VirtualThread$VThreadContinuation.onPinned(VirtualThread.java:199)
    java.base/jdk.internal.vm.Continuation.onPinned0(Continuation.java:393)
    java.base/java.lang.VirtualThread.parkNanos(VirtualThread.java:635)
    java.base/java.lang.VirtualThread.sleepNanos(VirtualThread.java:807)
    java.base/java.lang.Thread.sleep(Thread.java:507)
    NativePin$FareTable.<clinit>(NativePin.java:5)
    NativePin.lambda$main$0(NativePin.java:11)
    java.base/java.lang.VirtualThread.run(VirtualThread.java:329)
base fare 50`,
        },
        {
          type: "list",
          items: [
            "**Blocking in `<clinit>` pinned with `reason:NATIVE`.** The JVM runs a static initialiser by calling from its own C++ code into Java, and that native transition can't be frozen. A static initialiser that loads configuration over the network pins every virtual thread that triggers it (and makes the others wait for initialisation).",
            "**The `Object.wait()` inside `synchronized` printed nothing**, though it's blocking with a monitor held. On JDK 21, `Object.wait` doesn't go through `park` at all; it blocks the carrier in the JVM, and the scheduler compensates instead, which the next program shows.",
          ],
        },
        {
          type: "heading",
          text: "Object.wait: pinned, but compensated",
        },
        {
          type: "code",
          language: "java",
          title: "WaitCompensates.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ForkJoinPool;

public class WaitCompensates {
    interface Body { void run(Object lock) throws InterruptedException; }

    static void run(String label, Body body) throws Exception {
        Field f = Class.forName("java.lang.VirtualThread").getDeclaredField("DEFAULT_SCHEDULER");
        f.setAccessible(true);
        ForkJoinPool carriers = (ForkJoinPool) f.get(null);
        long t0 = System.nanoTime();
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < 32; i++) {
            Object lock = new Object();
            threads.add(Thread.ofVirtual().start(() -> {
                try { body.run(lock); } catch (InterruptedException e) { }
            }));
        }
        Thread.sleep(250);
        int sizeDuring = carriers.getPoolSize();
        for (Thread t : threads) t.join();
        System.out.printf("%-30s 32 threads x 500 ms: %,5d ms, carriers during the run: %d%n",
                label, (System.nanoTime() - t0) / 1_000_000, sizeDuring);
    }

    public static void main(String[] args) throws Exception {
        run("sleep inside synchronized", lock -> { synchronized (lock) { Thread.sleep(500); } });
        run("Object.wait inside synchronized", lock -> { synchronized (lock) { lock.wait(500); } });
        run("sleep, no monitor", lock -> Thread.sleep(500));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac WaitCompensates.java
java --add-opens java.base/java.lang=ALL-UNNAMED WaitCompensates
java --add-opens java.base/java.lang=ALL-UNNAMED -Djdk.virtualThreadScheduler.maxPoolSize=12 WaitCompensates`,
        },
        {
          type: "output",
          text: `sleep inside synchronized      32 threads x 500 ms: 2,005 ms, carriers during the run: 8
Object.wait inside synchronized 32 threads x 500 ms:   503 ms, carriers during the run: 36
sleep, no monitor              32 threads x 500 ms:   503 ms, carriers during the run: 36

sleep inside synchronized      32 threads x 500 ms: 2,004 ms, carriers during the run: 8
Object.wait inside synchronized 32 threads x 500 ms: 1,501 ms, carriers during the run: 12
sleep, no monitor              32 threads x 500 ms:   504 ms, carriers during the run: 12`,
        },
        {
          type: "list",
          items: [
            "**`sleep` in `synchronized`: 4 rounds of 8, 2.0 s, and the pool stayed at 8.** Pinned parks are not compensated.",
            "**`Object.wait`: 0.5 s, because the pool grew from 8 to 36 carriers**, adding OS threads so that the blocked waiters didn't starve everything else. That's `ForkJoinPool`'s managed-blocker mechanism: before blocking in `wait`, the JVM tells the pool, and the pool starts a replacement thread. It keeps the program moving at the cost of OS threads, which is exactly what virtual threads were supposed to save.",
            "**`maxPoolSize` caps the compensation**: with 12, the 32 waits ran 12 at a time, 3 rounds, 1.5 s. The default cap is 256, so 1,000 virtual threads in `wait()` would still be throttled to 256 at a time.",
            "The third line's 36 and 12 are leftovers: the extra carriers stay idle in the pool for up to 30 seconds (the keep-alive in the bytecode) before they exit.",
          ],
        },
        {
          type: "heading",
          text: "When pinning becomes a deadlock",
        },
        {
          type: "paragraph",
          text: "Pinning isn't just slow. A virtual thread that's unmounted needs a free carrier to continue, and if every carrier is pinned by a thread that's waiting for that virtual thread, nothing can ever move:",
        },
        {
          type: "code",
          language: "java",
          title: "PinnedDeadlock.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

public class PinnedDeadlock {
    static final ReentrantLock FARE_CACHE = new ReentrantLock();

    public static void main(String[] args) throws Exception {
        boolean pin = !(args.length > 0 && args[0].equals("no-monitor"));
        int carriers = Integer.getInteger("jdk.virtualThreadScheduler.parallelism", Runtime.getRuntime().availableProcessors());
        // 1. A virtual thread takes the lock and blocks briefly with it: it unmounts, freeing its carrier
        Thread holder = Thread.ofVirtual().name("refresher").start(() -> {
            FARE_CACHE.lock();
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
            } finally {
                FARE_CACHE.unlock();
            }
        });
        Thread.sleep(20);
        // 2. One thread per carrier enters a synchronized block, then waits for the lock: each pins its carrier
        List<Thread> quoters = new ArrayList<>();
        for (int i = 0; i < carriers; i++) {
            Object monitor = new Object();
            quoters.add(Thread.ofVirtual().name("quote-" + i).start(() -> {
                if (pin) {
                    synchronized (monitor) {
                        FARE_CACHE.lock();                // parks while holding a monitor: pinned
                        FARE_CACHE.unlock();
                    }
                } else {
                    FARE_CACHE.lock();                    // parks without a monitor: unmounts
                    FARE_CACHE.unlock();
                }
            }));
        }
        // 3. The holder's sleep ends at 100 ms, but there is no free carrier to run its unlock
        holder.join(Long.getLong("wait", 3_000));
        System.out.printf("%-10s carriers=%d  after 3 s: refresher alive=%b (state %s), quoters alive=%d%n",
                pin ? "monitor" : "no-monitor", carriers,
                holder.isAlive(), holder.getState(), quoters.stream().filter(Thread::isAlive).count());
        System.exit(0);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac PinnedDeadlock.java
java PinnedDeadlock
java PinnedDeadlock no-monitor
java -Djdk.virtualThreadScheduler.parallelism=2 PinnedDeadlock`,
        },
        {
          type: "output",
          text: `monitor    carriers=8  after 3 s: refresher alive=true (state RUNNABLE), quoters alive=8
no-monitor carriers=8  after 3 s: refresher alive=false (state TERMINATED), quoters alive=0
monitor    carriers=2  after 3 s: refresher alive=true (state RUNNABLE), quoters alive=2`,
        },
        {
          type: "list",
          items: [
            "**The refresher's 100 ms sleep ended, and it never ran again.** Its state was `RUNNABLE`: unparked, queued in the scheduler, waiting for a carrier. All 8 carriers were pinned by quoters parked in `FARE_CACHE.lock()`, each waiting for the refresher's `unlock()`. A cycle through the scheduler: the lock waits for the refresher, the refresher waits for a carrier, the carriers wait for the lock.",
            "**Without the monitor, the same code finished**: the quoters unmounted while waiting for the lock, the refresher got a carrier and released it.",
            "**The JVM's deadlock detector doesn't see this.** I took `jcmd Thread.print` while it was stuck (with `-Dwait=20000`): no \"Found one Java-level deadlock\" section, and all 8 carriers showed `Carrying virtual thread #N` with frames inside `Continuation.run`. The cycle isn't between locks the JVM tracks; it goes through a scheduler queue. Deadlock, Livelock and Starvation covers the kinds the detector does find.",
            "**Real-world shape**: a library that does I/O inside `synchronized` (older JDBC drivers, some caches and connection pools) calling into code that needs another virtual thread to make progress. With 8 cores, 8 such requests at once are enough. On JDK 24 and later, JEP 491 removes this case for `synchronized`; native frames can still pin.",
          ],
        },
      ],
    },
    {
      title: "Thread Dumps for Virtual Threads",
      blocks: [
        {
          type: "paragraph",
          text: "The classic `jcmd <pid> Thread.print` (and `jstack`) shows platform threads only. With a million virtual threads that's by design: the text format wasn't built for it. JDK 21 added `jcmd <pid> Thread.dump_to_file`, in plain text or JSON, which includes every virtual thread and groups threads by the **thread container** that owns them: an executor, a `StructuredTaskScope`, or the root.",
        },
        {
          type: "code",
          language: "java",
          title: "DumpThreads.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.StructuredTaskScope;

public class DumpThreads {
    static String slowCall(String what, long ms) throws InterruptedException {
        Thread.sleep(ms);
        return what;
    }

    public static void main(String[] args) throws Exception {
        ExecutorService requests = Executors.newVirtualThreadPerTaskExecutor();
        for (int i = 0; i < 1_000; i++) {
            int trip = i;
            requests.submit(() -> slowCall("trip-" + trip, 60_000));
        }
        // a request that fans out with a StructuredTaskScope: its forks are grouped under the scope
        Thread.ofVirtual().name("quote-request").start(() -> {
            try (var scope = new StructuredTaskScope.ShutdownOnFailure("fare-quote", Thread.ofVirtual().factory())) {
                scope.fork(() -> slowCall("surge", 60_000));
                scope.fork(() -> slowCall("eta", 60_000));
                scope.join();
            } catch (InterruptedException e) { }
        });
        Thread.sleep(60_000);            // time for: jcmd <pid> Thread.dump_to_file -format=json threads.json
        System.exit(0);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 21 --enable-preview DumpThreads.java
java --enable-preview DumpThreads &
jcmd <pid> Thread.print | grep -c '^"'                        # threads in the classic dump
jcmd <pid> Thread.dump_to_file -format=json $PWD/threads.json
python3 -c "
import json
d = json.load(open('threads.json'))['threadDump']
for c in d['threadContainers']:
    print(c['container'], '| parent:', c['parent'], '| owner:', c['owner'], '| threads:', c['threadCount'])"`,
        },
        {
          type: "output",
          text: `27
Created /tmp/.../threads.json
<root> | parent: None | owner: None | threads: 8
ForkJoinPool-1/jdk.internal.vm.SharedThreadContainer@435ef815 | parent: <root> | owner: None | threads: 8
ForkJoinPool.commonPool/jdk.internal.vm.SharedThreadContainer@5e470e3b | parent: <root> | owner: None | threads: 0
java.util.concurrent.ThreadPerTaskExecutor@64f87dc5 | parent: <root> | owner: None | threads: 1000
java.util.concurrent.ThreadPoolExecutor@4e63f35c | parent: <root> | owner: None | threads: 0
java.util.concurrent.ScheduledThreadPoolExecutor@7a81197d | parent: <root> | owner: None | threads: 1
fare-quote/jdk.internal.misc.ThreadFlock$ThreadContainerImpl@71d9b711 | parent: <root> | owner: 1029 | threads: 2`,
        },
        {
          type: "paragraph",
          text: "The `fare-quote` container, pretty-printed with Python's `json` module:",
        },
        {
          type: "output",
          text: `{
  "container": "fare-quote/jdk.internal.misc.ThreadFlock$ThreadContainerImpl@71d9b711",
  "parent": "<root>",
  "owner": "1029",
  "threads": [
    {
      "tid": "1030",
      "name": "",
      "stack": [
        "java.base/java.lang.VirtualThread.parkNanos(VirtualThread.java:635)",
        "java.base/java.lang.VirtualThread.sleepNanos(VirtualThread.java:807)",
        "java.base/java.lang.Thread.sleep(Thread.java:507)",
        "DumpThreads.slowCall(DumpThreads.java:7)",
        "DumpThreads.lambda$main$1(DumpThreads.java:20)",
        "java.base/java.util.concurrent.StructuredTaskScope$SubtaskImpl.run(StructuredTaskScope.java:886)",
        "java.base/java.lang.VirtualThread.run(VirtualThread.java:329)"
      ]
    },
    { "tid": "1031", ... "DumpThreads.lambda$main$2(DumpThreads.java:21)", ... }
  ],
  "threadCount": "2"
}`,
        },
        {
          type: "list",
          items: [
            "**The classic dump listed 27 threads; the JSON dump held 1,019**: the 1,000 parked requests, the scope owner and its two forks, plus the platform threads. The plain-text form (`jcmd <pid> Thread.dump_to_file threads.txt`) also had 1,019 entries, with virtual ones marked like `#1028 \"quote-request\" virtual`.",
            "**Containers give structure.** The 1,000 request threads sit under their `ThreadPerTaskExecutor`; the 8 carriers under `ForkJoinPool-1`; `VirtualThread-unparker` is the one thread of the `ScheduledThreadPoolExecutor`. The two forks sit under `fare-quote`, whose `owner` is thread 1029, the virtual thread named `quote-request` that opened the scope (listed under `<root>`, its stack ending in `StructuredTaskScope$ShutdownOnFailure.join`). A dump can be read as a tree: which request is waiting for which subtasks.",
            "**The JSON has no lock information**: no thread states, no \"waiting to lock\", no owned synchronizers. It's a census of stacks, not a replacement for `Thread.print` when debugging lock contention between platform threads.",
            "**Name your virtual threads** (`Thread.ofVirtual().name(\"quote-\", 0)`). Unnamed ones appear with `\"name\": \"\"`, and with 1,000 identical stacks, the name is often the only way to tell which request a thread belongs to.",
          ],
        },
      ],
    },
    {
      title: "Don't Pool Virtual Threads: Limit Concurrency with a Semaphore",
      blocks: [
        {
          type: "paragraph",
          text: "Platform-thread pools did two jobs at once: they **reused** expensive threads, and they **limited** how many tasks ran at a time, which also limited how hard the application could hit a database or another service. With virtual threads, reuse is pointless (creating one costs about 2 microseconds), but the limit is still needed. The mistake is to keep both by making a pool **of** virtual threads. Here, 1,000 tasks each make a 50 ms database call and the database should see at most 20 at once:",
        },
        {
          type: "code",
          language: "java",
          title: "LimitNotPool.java",
          code: `import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

public class LimitNotPool {
    static final AtomicInteger inDb = new AtomicInteger(), peak = new AtomicInteger();
    static final Set<Thread> threadsUsed = ConcurrentHashMap.newKeySet();
    static final ThreadLocal<String> LAST_RIDER = new ThreadLocal<>();
    static final AtomicInteger sawPreviousRider = new AtomicInteger();

    static void query(int trip) {
        threadsUsed.add(Thread.currentThread());
        if (LAST_RIDER.get() != null) sawPreviousRider.incrementAndGet();   // state left by an earlier task
        LAST_RIDER.set("rider-" + trip);
        peak.accumulateAndGet(inDb.incrementAndGet(), Math::max);
        try { Thread.sleep(50); } catch (InterruptedException e) { }
        inDb.decrementAndGet();
    }

    static void run(String label, ExecutorService executor, Semaphore limit) {
        peak.set(0); threadsUsed.clear(); sawPreviousRider.set(0);
        long t0 = System.nanoTime();
        try (executor) {
            for (int i = 0; i < 1_000; i++) {
                int trip = i;
                executor.submit(() -> {
                    if (limit == null) { query(trip); return; }
                    limit.acquireUninterruptibly();
                    try { query(trip); } finally { limit.release(); }
                });
            }
        }
        System.out.printf("%-38s %,5d ms  peak in DB %4d  threads %,5d  tasks seeing old ThreadLocal %d%n", label,
                (System.nanoTime() - t0) / 1_000_000, peak.get(), threadsUsed.size(), sawPreviousRider.get());
    }

    public static void main(String[] args) {
        run("no limit, virtual per task", Executors.newVirtualThreadPerTaskExecutor(), null);
        run("pool of 20 virtual threads", Executors.newFixedThreadPool(20, Thread.ofVirtual().factory()), null);
        run("virtual per task + Semaphore(20)", Executors.newVirtualThreadPerTaskExecutor(), new Semaphore(20));
    }
}`,
        },
        {
          type: "output",
          text: `no limit, virtual per task               129 ms  peak in DB 1000  threads 1,000  tasks seeing old ThreadLocal 0
pool of 20 virtual threads             2,553 ms  peak in DB   20  threads    20  tasks seeing old ThreadLocal 980
virtual per task + Semaphore(20)       2,572 ms  peak in DB   20  threads 1,000  tasks seeing old ThreadLocal 0`,
        },
        {
          type: "list",
          items: [
            "**Without a limit, the \"database\" saw 1,000 concurrent calls.** That's the new failure mode: with platform threads, a pool of 200 quietly capped concurrency; with a virtual thread per task, nothing does. A real database with `max_connections = 100`, or a payment gateway with a rate limit, gets every request at once.",
            "**The pool of virtual threads and the semaphore gave the same limit and the same time** (1,000 x 50 ms / 20 = 2.5 s). The pool brought nothing else, and it brought back the problems of pools: **980 of 1,000 tasks found the previous task's `ThreadLocal`** on their reused thread (the leak from the previous lesson), the limit applies to everything submitted to that executor rather than to the database call itself, and tasks queue invisibly inside the executor.",
            "**The semaphore limits exactly the resource**, around exactly the call that needs it. The other 980 virtual threads are parked in `acquire`, costing a stack chunk each, and every task still gets a fresh thread with clean thread locals. Different resources get different semaphores: 20 for the database, 50 for the maps API, 5 for the bank.",
            "A connection pool (HikariCP) is already a semaphore for connections, and that's fine. The problem in the production story below is that it was the **only** limit, with a short timeout, shared by everything.",
          ],
        },
      ],
    },
    {
      title: "Structured Concurrency (Preview in Java 21)",
      blocks: [
        {
          type: "paragraph",
          text: "With threads this cheap, it's natural to fork a few for every request: one for surge pricing, one for the ETA, one for promos. Plain `ExecutorService.submit` makes that **unstructured**: nothing ties the subtasks to the request. If the promo call fails, the surge and ETA calls keep running and their results are thrown away; if the request thread is interrupted, the subtasks don't know; a thread dump can't tell which subtask belongs to which request. `StructuredTaskScope` (JEP 453, a **preview API in Java 21**) makes the subtasks children of a block of code: they're forked inside a `try`-with-resources, joined before it ends, and cancelled if the policy says so.",
        },
        {
          type: "code",
          language: "java",
          title: "FareQuoteScope.java",
          code: `import java.time.Instant;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.Subtask;
import java.util.concurrent.TimeoutException;

public class FareQuoteScope {
    static final ScopedValue<String> RIDER = ScopedValue.newInstance();
    static long t0;

    static void log(String msg) {
        System.out.printf("%5d ms  %-38s %s%n", (System.nanoTime() - t0) / 1_000_000, msg,
                RIDER.isBound() ? "rider=" + RIDER.get() : "rider unbound");
    }

    static int call(String name, long ms, boolean fail) throws Exception {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            log(name + " interrupted (cancelled)");
            throw e;
        }
        if (fail) {
            log(name + " failed");
            throw new IllegalStateException(name + " service returned 503");
        }
        log(name + " done");
        return (int) ms;
    }

    record Quote(int surge, int eta, int promo) { }

    // All three are needed: the first failure cancels the others
    static Quote quote(boolean promoFails) throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            Subtask<Integer> surge = scope.fork(() -> call("surge", 300, false));
            Subtask<Integer> eta = scope.fork(() -> call("eta", 500, false));
            Subtask<Integer> promo = scope.fork(() -> call("promo", 100, promoFails));
            scope.join().throwIfFailed();                     // wait for all, or for the first failure
            return new Quote(surge.get(), eta.get(), promo.get());
        }
    }

    // Any one is enough: the first success cancels the others
    static String fastestEta() throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
            scope.fork(() -> "mapsA:" + call("mapsA", 400, false));
            scope.fork(() -> "mapsB:" + call("mapsB", 150, false));
            scope.fork(() -> "mapsC:" + call("mapsC", 50, true));   // fails first, doesn't win
            scope.join();
            return scope.result();
        }
    }

    public static void main(String[] args) throws Exception {
        ScopedValue.where(RIDER, "asha").call(() -> {
            t0 = System.nanoTime();
            log("quote, all succeed");
            log("result " + quote(false));

            t0 = System.nanoTime();
            log("quote, promo fails at 100 ms");
            try {
                quote(true);
            } catch (ExecutionException e) {
                log("throwIfFailed: " + e.getCause().getMessage());
            }

            t0 = System.nanoTime();
            log("fastest ETA, ShutdownOnSuccess");
            log("result " + fastestEta());

            t0 = System.nanoTime();
            try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
                scope.fork(() -> call("slow pricing", 2_000, false));
                scope.joinUntil(Instant.now().plusMillis(250));
            } catch (TimeoutException e) {
                log("joinUntil 250 ms: TimeoutException");
            }
            log("scope closed");
            return null;
        });
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 21 --enable-preview FareQuoteScope.java     # Note: FareQuoteScope.java uses preview features of Java SE 21.
java --enable-preview FareQuoteScope`,
        },
        {
          type: "output",
          text: `    0 ms  quote, all succeed                     rider=asha
  141 ms  promo done                             rider=asha
  340 ms  surge done                             rider=asha
  540 ms  eta done                               rider=asha
  605 ms  result Quote[surge=300, eta=500, promo=100] rider=asha
    0 ms  quote, promo fails at 100 ms           rider=asha
  101 ms  promo failed                           rider=asha
  105 ms  eta interrupted (cancelled)            rider=asha
  105 ms  surge interrupted (cancelled)          rider=asha
  108 ms  throwIfFailed: promo service returned 503 rider=asha
    0 ms  fastest ETA, ShutdownOnSuccess         rider=asha
   53 ms  mapsC failed                           rider=asha
  153 ms  mapsB done                             rider=asha
  162 ms  mapsA interrupted (cancelled)          rider=asha
  164 ms  result mapsB:150                       rider=asha
  253 ms  slow pricing interrupted (cancelled)   rider=asha
  255 ms  joinUntil 250 ms: TimeoutException     rider=asha
  255 ms  scope closed                           rider=asha`,
        },
        {
          type: "list",
          items: [
            "**All succeed: the quote took as long as the slowest call**, about 500 ms, not 900 ms in sequence. (The first quote finished about 40 ms after its slowest call would suggest; that's first-use overhead, and the later scopes in the same run were on time.)",
            "**`ShutdownOnFailure`: the promo failure at 101 ms cancelled surge and ETA within 4 ms.** `handleComplete` saw a failed subtask, called `shutdown()`, which interrupted the other forks. The request failed in 108 ms instead of waiting 500 ms for answers it would throw away. `throwIfFailed()` rethrows the first failure wrapped in `ExecutionException`.",
            "**`ShutdownOnSuccess`: the first success wins, failures are ignored** until all fail. `mapsC` failed at 53 ms and nothing happened; `mapsB` succeeded at 153 ms and `mapsA` was cancelled. `result()` returns the winner's value.",
            "**`joinUntil` gives the whole scope a deadline.** At 250 ms it threw `TimeoutException`; by the time the `catch` block ran, the slow fork had already been interrupted, because the `try`-with-resources closes the scope (cancelling and waiting for its forks) before control reaches `catch`. No subtask outlives the `try` block: that's the guarantee \"structured\" refers to.",
            "**Every fork saw `rider=asha`.** The scope captured the `ScopedValue` bindings of the thread that opened it, and each fork runs with them. That's the inheritance promised in the previous lesson: no copying of maps, no `InheritableThreadLocal`, and nothing left behind when the scope ends.",
          ],
        },
        {
          type: "heading",
          text: "The rules a scope enforces",
        },
        {
          type: "code",
          language: "java",
          title: "ScopeRules.java",
          code: `import java.util.concurrent.StructuredTaskScope;

public class ScopeRules {
    static final ScopedValue<String> RIDER = ScopedValue.newInstance();

    public static void main(String[] args) throws Exception {
        // 1. get() before join()
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            var eta = scope.fork(() -> 7);
            try {
                eta.get();
            } catch (IllegalStateException e) {
                System.out.println("1. get() before join(): " + e);
            }
            scope.join();
            System.out.println("   after join(): " + eta.get() + " state=" + eta.state());
        }

        // 2. a fork from a different thread than the owner
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            Thread other = Thread.ofVirtual().start(() -> {
                try {
                    scope.fork(() -> 1);
                } catch (Exception e) {
                    System.out.println("2. fork from another thread: " + e);
                }
            });
            other.join();
            scope.join();
        }

        // 3. bindings changed after the scope was opened
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            ScopedValue.where(RIDER, "ravi").run(() -> {
                try {
                    scope.fork(() -> RIDER.get());
                } catch (Exception e) {
                    System.out.println("3. fork under a newer binding: " + e);
                }
            });
            scope.join();
        }

        // 4. forgetting join() before close()
        try {
            try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
                scope.fork(() -> 1);
            }
        } catch (Exception e) {
            System.out.println("4. close() without join(): " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `1. get() before join(): java.lang.IllegalStateException: Owner did not join after forking subtasks
   after join(): 7 state=SUCCESS
2. fork from another thread: java.lang.WrongThreadException: Current thread not owner or thread in flock
3. fork under a newer binding: java.util.concurrent.StructureViolationException: Scoped value bindings have changed
4. close() without join(): java.lang.IllegalStateException: Owner did not join after forking subtasks`,
        },
        {
          type: "list",
          items: [
            "**Results are only readable after `join()`**, which is what makes them safe to read without extra synchronisation: `join` waits for every fork, so their writes happen-before the owner's reads.",
            "**Only the owner (or a thread inside the scope) can fork.** A random thread can't add children to someone else's scope.",
            "**`StructureViolationException`** guards the `ScopedValue` contract: a fork must see exactly the bindings the scope was opened with. Rebinding `RIDER` to `ravi` inside the scope and forking there would give the child a binding that outlives its `run`, so the API refuses.",
            "**Forgetting `join()` is an error at `close()`**, not a silent leak. `close()` still cancels and waits for the forks, then throws.",
          ],
        },
        {
          type: "heading",
          text: "What a scope is made of",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.StructuredTaskScope 'java.util.concurrent.StructuredTaskScope$ShutdownOnFailure'
javap -p jdk.internal.misc.ThreadFlock`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.StructuredTaskScope<T> implements java.lang.AutoCloseable {
  private final java.util.concurrent.ThreadFactory factory;
  private final jdk.internal.misc.ThreadFlock flock;
  private final java.util.concurrent.locks.ReentrantLock shutdownLock;
  private volatile int state;
  private int forkRound;
  private int lastJoinAttempted;
  private int lastJoinCompleted;
  protected void handleComplete(java.util.concurrent.StructuredTaskScope$Subtask<? extends T>);
  public <U extends T> java.util.concurrent.StructuredTaskScope$Subtask<U> fork(java.util.concurrent.Callable<? extends U>);
  private void implInterruptAll();
  public void shutdown();
  ...
}
public final class java.util.concurrent.StructuredTaskScope$ShutdownOnFailure extends java.util.concurrent.StructuredTaskScope<java.lang.Object> {
  private volatile java.lang.Throwable firstException;
  protected void handleComplete(java.util.concurrent.StructuredTaskScope$Subtask<?>);
  public void throwIfFailed() throws java.util.concurrent.ExecutionException;
  ...
}
public class jdk.internal.misc.ThreadFlock implements java.lang.AutoCloseable {
  private final java.util.Set<java.lang.Thread> threads;
  private volatile int threadCount;
  private final java.lang.String name;
  private final jdk.internal.vm.ScopedValueContainer$BindingsSnapshot scopedValueBindings;
  private final jdk.internal.misc.ThreadFlock$ThreadContainerImpl container;
  private volatile boolean shutdown;
  private volatile boolean closed;
  ...
}`,
        },
        {
          type: "list",
          items: [
            "**The scope is a `ThreadFlock`**: a set of threads, a count, and a **snapshot of the owner's `ScopedValue` bindings** taken when the scope opened. Each fork starts with that snapshot, which is how the forks saw `asha`, and comparing it with the current bindings is how `fork` detects the violation in rule 3.",
            "**The flock registers a `ThreadContainer`**, the `fare-quote/...ThreadFlock$ThreadContainerImpl` in the JSON dump, with the owner thread recorded. That's where the dump's tree comes from.",
            "**Policies are `handleComplete` overrides.** `ShutdownOnFailure` records the first exception in `firstException` and calls `shutdown()`; `ShutdownOnSuccess` records the first result. Custom policies (collect all results, succeed on two of three) subclass `StructuredTaskScope` and override `handleComplete` the same way. Java 25's redesign (JEP 505) replaces subclassing with `StructuredTaskScope.open(Joiner)`, so code written against the Java 21 preview needs changes later.",
          ],
        },
      ],
    },
    {
      title: "CPU-Bound Work Gets No Benefit",
      blocks: [
        {
          type: "paragraph",
          text: "Virtual threads make **waiting** cheap. They don't make computing faster: there are still 8 cores, and the scheduler has 8 carriers. And because a virtual thread only gives up its carrier when it blocks, a long computation keeps its carrier for its whole duration.",
        },
        {
          type: "code",
          language: "java",
          title: "CpuBound.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CpuBound {
    static volatile long sink;

    // Route scoring: pure CPU, no blocking
    static void scoreRoutes() {
        long h = 0;
        for (int i = 0; i < 150_000_000; i++) h = h * 31 + i;
        sink = h;
    }

    static void longScore() {
        long h = 0;
        for (int i = 0; i < 1_000_000_000; i++) h = h * 31 + i;
        sink = h;
    }

    static void run(String label, ExecutorService executor) {
        long t0 = System.nanoTime();
        try (executor) {
            for (int i = 0; i < 64; i++) executor.submit(CpuBound::scoreRoutes);
        }
        System.out.printf("%-30s 64 CPU tasks: %,6d ms%n", label, (System.nanoTime() - t0) / 1_000_000);
    }

    public static void main(String[] args) throws Exception {
        for (int round = 0; round < 2; round++) {           // round 1 warms up; I quote round 2
            run("fixed pool of 8 platform", Executors.newFixedThreadPool(8));
            run("virtual thread per task", Executors.newVirtualThreadPerTaskExecutor());
        }

        // No time slicing: 8 CPU-bound virtual threads hold all 8 carriers
        Thread[] hogs = new Thread[8];
        long hogStart = System.nanoTime();
        for (int i = 0; i < 8; i++) hogs[i] = Thread.ofVirtual().start(CpuBound::longScore);
        Thread.sleep(20);
        long t0 = System.nanoTime();
        Thread.ofVirtual().start(() -> { }).join();          // a trivial "health check"
        System.out.printf("trivial virtual thread behind 8 CPU hogs waited %,d ms to run%n", (System.nanoTime() - t0) / 1_000_000);
        for (Thread h : hogs) h.join();
        System.out.printf("the 8 hogs ran for %,d ms%n", (System.nanoTime() - hogStart) / 1_000_000);
    }
}`,
        },
        {
          type: "output",
          text: `fixed pool of 8 platform       64 CPU tasks:  2,085 ms
virtual thread per task        64 CPU tasks:  1,950 ms
fixed pool of 8 platform       64 CPU tasks:  1,978 ms
virtual thread per task        64 CPU tasks:  2,171 ms
trivial virtual thread behind 8 CPU hogs waited 1,133 ms to run
the 8 hogs ran for 1,230 ms`,
        },
        {
          type: "list",
          items: [
            "**No consistent difference for CPU work.** Over three runs, round 2 took 1,978 to 3,404 ms on the pool and 1,658 to 2,171 ms on virtual threads, with the order flipping between runs. The noise from other processes on the machine was larger than any difference. Either way, 8 cores do the work; creating 64 threads instead of reusing 8 costs microseconds.",
            "**A trivial virtual thread waited 1.1 s to start** (1.1 to 1.4 s over two runs) because 8 CPU-bound virtual threads held all 8 carriers and never blocked. The JDK 21 scheduler has no time slicing for virtual threads. Platform threads would have been preempted by the OS every few milliseconds; virtual threads aren't. In a server, that \"trivial virtual thread\" is the health check, the next request, or a timeout handler.",
            "**Keep CPU-heavy work on a bounded platform pool** (a `ForkJoinPool` or fixed pool sized to the cores), and have the virtual thread hand it over and wait for the result, which is a blocking wait and unmounts. Virtual threads are for the request that waits; the computation goes where the OS can schedule it fairly.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `Thread.ofVirtual().start(task)` where the task calls `Thread.sleep(100)` once and returns, on JDK 21:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Creation.** The builder calls the `VirtualThread` constructor, which stores `scheduler` (the shared `DEFAULT_SCHEDULER`), creates a `VThreadContinuation` (`cont`) wrapping the task, and a `runContinuation` `Runnable`. State is `NEW` (0). No OS thread is involved and no stack is allocated yet.",
            "**`start()`.** The thread joins its container (the root, an executor or a scope), the state becomes `STARTED` (1), and `submitRunContinuation` hands `runContinuation` to the `ForkJoinPool`. If the pool has no carrier yet, it starts one: a `CarrierThread`, a real OS thread.",
            "**Mount.** A carrier runs `runContinuation`: CAS `STARTED` to `RUNNING` (2), `mount()` sets `carrierThread`, and `Continuation.run()` enters the continuation (`enterSpecial`), which calls the task on the carrier's own stack. From here on, `Thread.currentThread()` returns the virtual thread, not the carrier.",
            "**Block.** `Thread.sleep` sees a virtual thread and calls `sleepNanos`, then `parkNanos`: schedule a wake-up on `VirtualThread-unparker`, set `TIMED_PARKING` (6), call `yieldContinuation()`.",
            "**Unmount (freeze).** `Continuation.yield` calls the native `doYield`, which copies the frames between the continuation's entry and the yield point into a `StackChunk` on the heap, and returns to `runContinuation` on the carrier. `unmount()` clears `carrierThread`, and `afterYield()` publishes `TIMED_PARKED` (7). The carrier returns to the pool and runs the next task in its queue.",
            "**Pinned instead?** If `doYield` finds a monitor held or a native frame on the stack, the yield fails, `onPinned` runs (printing a trace if `jdk.tracePinnedThreads` is set; JFR records `jdk.VirtualThreadPinned` if the park lasts over 20 ms), the state becomes `TIMED_PINNED` (8), and `parkOnCarrierThread` blocks the carrier with `Unsafe.park` for the whole 100 ms.",
            "**Wake-up.** After 100 ms the unparker calls `unpark()`: CAS `TIMED_PARKED` to `UNPARKED` (9), and `submitRunContinuation` queues `runContinuation` in the pool again.",
            "**Remount (thaw).** Whichever carrier takes the task runs `runContinuation` again: `UNPARKED` to `RUNNING`, `mount()` with the new carrier, `Continuation.run()` copies frames back from the chunk (lazily, the top frames first), and `sleep` returns inside the task as if nothing happened.",
            "**Termination.** The task returns, the continuation is done, `afterDone()` sets `TERMINATED` (99), counts down `termination` so `join()` returns, and removes the thread from its container. The `VirtualThread` and its chunk become ordinary garbage.",
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
          title: "VirtualTour.java",
          code: `import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadFactory;

public class VirtualTour {
    static String who() {
        Thread t = Thread.currentThread();
        return t.getName() + " virtual=" + t.isVirtual() + " daemon=" + t.isDaemon();
    }

    public static void main(String[] args) throws Exception {
        // 1. start one directly
        Thread a = Thread.startVirtualThread(() -> System.out.println("1. " + who()));
        a.join();

        // 2. the builder: name, counter, unstarted
        Thread.Builder.OfVirtual builder = Thread.ofVirtual().name("trip-", 100);
        Thread b = builder.start(() -> System.out.println("2. " + who()));
        Thread c = builder.unstarted(() -> System.out.println("   " + who()));
        b.join();
        c.start();
        c.join();

        // 3. a factory, for APIs that take one
        ThreadFactory factory = Thread.ofVirtual().name("receipt-", 0).factory();
        Thread d = factory.newThread(() -> System.out.println("3. " + who()));
        d.start();
        d.join();

        // 4. one new virtual thread per task; close() waits for all of them
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<String>> etas = executor.invokeAll(List.of(() -> "eta-1 " + who(), () -> "eta-2 " + who()));
            for (Future<String> f : etas) System.out.println("4. " + f.get());
        }

        // 5. same, but with named threads
        try (ExecutorService executor = Executors.newThreadPerTaskExecutor(factory)) {
            System.out.println("5. " + executor.submit(VirtualTour::who).get());
        }

        // 6. what you can't do
        try {
            Thread.ofVirtual().unstarted(() -> { }).setDaemon(false);
        } catch (IllegalArgumentException e) {
            System.out.println("6. setDaemon(false): " + e.getMessage());
        }
        Thread v = Thread.ofVirtual().unstarted(() -> { });
        v.setPriority(Thread.MAX_PRIORITY);
        System.out.println("   setPriority(10) ignored, priority=" + v.getPriority());
    }
}`,
        },
        {
          type: "output",
          text: `1.  virtual=true daemon=true
2. trip-100 virtual=true daemon=true
   trip-101 virtual=true daemon=true
3. receipt-0 virtual=true daemon=true
4. eta-1  virtual=true daemon=true
4. eta-2  virtual=true daemon=true
5. receipt-1 virtual=true daemon=true
6. setDaemon(false): 'false' not legal for virtual threads
   setPriority(10) ignored, priority=5`,
        },
        {
          type: "paragraph",
          text: "Virtual threads have an empty name unless you give one (lines 1 and 4), are always daemon threads (so a JVM whose only remaining threads are virtual exits; join them or close their executor), and ignore priorities. `name(prefix, start)` numbers threads per builder or factory: the factory continued from `receipt-0` to `receipt-1` across uses. `newVirtualThreadPerTaskExecutor()` is `newThreadPerTaskExecutor` with an unnamed virtual thread factory. The structured-concurrency syntax is in `FareQuoteScope` above.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: ETAs for 1,000 drivers against a rate-limited maps API",
        },
        {
          type: "paragraph",
          text: "Dispatch wants a road ETA from every nearby driver to the rider. The maps provider allows 50 concurrent requests per API key and each takes about 40 ms. One virtual thread per driver keeps the code simple; a `Semaphore` enforces the provider's limit; `tryAcquire` with a time budget falls back to a cheap straight-line estimate instead of making the rider wait:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverEtas.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class DriverEtas {
    // The maps provider allows 50 concurrent requests per API key; each takes about 40 ms
    static final Semaphore MAPS_API = new Semaphore(50);
    static final AtomicInteger inFlight = new AtomicInteger(), peak = new AtomicInteger();

    static int roadEta(int driver) throws InterruptedException {
        peak.accumulateAndGet(inFlight.incrementAndGet(), Math::max);
        try {
            Thread.sleep(40);
            return 3 + driver % 9;
        } finally {
            inFlight.decrementAndGet();
        }
    }

    static int straightLineEta(int driver) { return 2 + driver % 7; }     // no API call: a cheap estimate

    // Wait up to 'budgetMs' for a permit; otherwise fall back instead of queueing forever
    static int eta(int driver, long budgetMs) throws InterruptedException {
        if (!MAPS_API.tryAcquire(budgetMs, TimeUnit.MILLISECONDS)) return -straightLineEta(driver);
        try {
            return roadEta(driver);
        } finally {
            MAPS_API.release();
        }
    }

    public static void main(String[] args) throws Exception {
        for (long budget : new long[] {1_000, 150}) {
            peak.set(0);
            long t0 = System.nanoTime();
            List<Future<Integer>> etas = new ArrayList<>();
            try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
                for (int d = 0; d < 1_000; d++) {
                    int driver = d;
                    etas.add(executor.submit(() -> eta(driver, budget)));
                }
            }
            int road = 0, fallback = 0;
            for (Future<Integer> f : etas) if (f.resultNow() > 0) road++; else fallback++;
            System.out.printf("budget %,5d ms: 1,000 drivers in %,5d ms, road ETAs %d, straight-line fallbacks %d, peak API calls %d%n",
                    budget, (System.nanoTime() - t0) / 1_000_000, road, fallback, peak.get());
        }
    }
}`,
        },
        {
          type: "output",
          text: `budget 1,000 ms: 1,000 drivers in   824 ms, road ETAs 1000, straight-line fallbacks 0, peak API calls 50
budget   150 ms: 1,000 drivers in   275 ms, road ETAs 201, straight-line fallbacks 799, peak API calls 50`,
        },
        {
          type: "list",
          items: [
            "**The provider never saw more than 50 calls**, though 1,000 virtual threads were running. The limit sits on the call, not on the threads.",
            "**With a 1 s budget, every driver got a road ETA** in 20 waves of 50 x 40 ms, about 800 ms. With a 150 ms budget, about four waves fit (201 road ETAs), and the other 799 drivers got the fallback, so the whole batch took 275 ms. The budget turns \"how long will this take\" into a product decision.",
            "Waiting in `tryAcquire` parks a virtual thread, so 950 waiting threads cost heap, not carriers. With a platform-thread pool, those 950 waiters would each have needed an OS thread, or a queue in front of the pool.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: a pinning check that fails the build",
        },
        {
          type: "paragraph",
          text: "`jdk.tracePinnedThreads` prints to the console and dedupes; for a test, I want a count I can assert on. JFR can be consumed in-process with `RecordingStream`. Here an old client for the surge service guards its connection with `synchronized`, a new one with `ReentrantLock`:",
        },
        {
          type: "code",
          language: "java",
          title: "PinningGuard.java",
          code: `import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import jdk.jfr.consumer.RecordedFrame;
import jdk.jfr.consumer.RecordingStream;

public class PinningGuard {
    // Two versions of a client for the surge service: the old one guards its socket with synchronized
    static class OldSurgeClient {
        synchronized int surgeFor(String zone) throws InterruptedException {
            Thread.sleep(30);                                   // the network round trip
            return 120;
        }
    }

    static class NewSurgeClient {
        private final ReentrantLock lock = new ReentrantLock();
        int surgeFor(String zone) throws InterruptedException {
            lock.lock();
            try {
                Thread.sleep(30);
                return 120;
            } finally {
                lock.unlock();
            }
        }
    }

    interface Client { int surgeFor(String zone) throws InterruptedException; }

    // Run a workload on virtual threads and report every pinned park longer than 5 ms, grouped by the frame in our code
    static void check(String label, Client client) throws Exception {
        Map<String, AtomicInteger> pinnedAt = new ConcurrentHashMap<>();
        try (RecordingStream rs = new RecordingStream()) {
            rs.enable("jdk.VirtualThreadPinned").withThreshold(Duration.ofMillis(5)).withStackTrace();
            rs.onEvent("jdk.VirtualThreadPinned", e -> {
                List<RecordedFrame> frames = e.getStackTrace().getFrames();
                String where = frames.stream()
                        .filter(f -> f.getMethod().getType().getName().startsWith("PinningGuard"))
                        .findFirst()
                        .map(f -> f.getMethod().getType().getName() + "." + f.getMethod().getName() + ":" + f.getLineNumber())
                        .orElse("?");
                pinnedAt.computeIfAbsent(where, k -> new AtomicInteger()).incrementAndGet();
            });
            rs.startAsync();
            try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
                for (int i = 0; i < 50; i++) {
                    Client perRequest = client;
                    executor.submit(() -> perRequest.surgeFor("SALT-LAKE"));
                }
            }
            Thread.sleep(1_500);                                // let the stream deliver the last events
        }
        System.out.printf("%-16s pinned events: %s%n", label, pinnedAt.isEmpty() ? "none" : new TreeMap<>(pinnedAt));
    }

    public static void main(String[] args) throws Exception {
        OldSurgeClient old = new OldSurgeClient();
        NewSurgeClient fresh = new NewSurgeClient();
        check("OldSurgeClient", old::surgeFor);
        check("NewSurgeClient", fresh::surgeFor);
    }
}`,
        },
        {
          type: "output",
          text: `OldSurgeClient   pinned events: {PinningGuard$OldSurgeClient.surgeFor:17=50}
NewSurgeClient   pinned events: none`,
        },
        {
          type: "list",
          items: [
            "**50 pinned parks, all at line 17**, the `sleep` inside the `synchronized` method; none for the `ReentrantLock` version. The same in both runs. In a test, `assertTrue(pinnedAt.isEmpty())` turns this into a build failure the day someone adds blocking I/O inside `synchronized`.",
            "**JFR delivers events to a stream in batches**, roughly once a second, so the check sleeps for 1.5 s before closing the stream to let the last batch arrive.",
            "**What it can't see: threads waiting to enter the monitor.** The other 49 requests spent most of their time blocked at the entrance to `synchronized surgeFor`, and on JDK 21 a virtual thread blocked on monitor entry also holds its carrier, without a park and without an event. A separate check (`MonitorEnter.java`: one thread sleeping 1 s inside `synchronized`, 8 more trying to enter) made a trivial virtual thread wait 900 ms to run, in both runs. Contended `synchronized` on virtual threads is invisible to both tools on 21 and shows up only as carriers that are busy doing nothing.",
          ],
        },
      ],
    },
    {
      title: "When to Use Virtual Threads",
      blocks: [
        {
          type: "table",
          headers: ["Workload", "Use", "Why"],
          rows: [
            ["Request handlers that call databases and services (thread-per-request servers)", "Virtual threads (Tomcat/Jetty/Spring Boot `spring.threads.virtual.enabled=true`, or `newVirtualThreadPerTaskExecutor`)", "Concurrency stops being limited by OS threads; code stays blocking and debuggable"],
            ["Fan-out to several services per request", "Virtual threads, ideally `StructuredTaskScope` (preview in 21)", "Cheap forks, cancellation on failure, deadlines"],
            ["High-volume calls to a limited resource", "Virtual threads + a `Semaphore` per resource", "The threads are free; the resource isn't"],
            ["CPU-bound work (pricing models, route scoring, image work)", "A bounded platform pool or `ForkJoinPool` sized to the cores", "No gain from virtual threads, and no time slicing to protect latency"],
            ["Code that blocks inside `synchronized` or native code on Java 21", "Fix the code (`ReentrantLock`), or keep it on platform threads", "Pinning turns the scheduler into an 8-thread pool, or deadlocks it"],
            ["Per-thread caches, heavy `ThreadLocal` use", "Platform pool, or refactor first", "Caches become per-task allocations (previous lesson)"],
            ["Already-asynchronous code (reactive, NIO event loops)", "Leave it, or rewrite to blocking style gradually", "Virtual threads compete with async code, not with blocking code"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Pooling virtual threads",
        },
        {
          type: "paragraph",
          text: "`Executors.newFixedThreadPool(20, Thread.ofVirtual().factory())` keeps the limit and the queue of a pool and adds nothing: in `LimitNotPool` it took the same 2.5 s as a semaphore, and 980 of 1,000 tasks saw the previous task's `ThreadLocal`. Create a virtual thread per task and limit the resource with a `Semaphore`.",
        },
        {
          type: "heading",
          text: "Removing the only concurrency limit without replacing it",
        },
        {
          type: "paragraph",
          text: "A 200-thread pool was also a limit of 200 concurrent database calls. Switching to a thread per task removes it, and the connection pool or the downstream service becomes the limit, usually with timeouts and errors: the production story below lost 680 of 800 payouts this way. Put an explicit `Semaphore` in front of every limited resource before switching.",
        },
        {
          type: "heading",
          text: "Blocking inside synchronized on Java 21",
        },
        {
          type: "paragraph",
          text: "I/O or a lock wait inside `synchronized` pins the carrier: 100 sleeps took 1.5 s instead of 0.12 s, and eight pinned threads waiting on a lock deadlocked the scheduler. Use `ReentrantLock` around blocking code, upgrade libraries that do I/O in `synchronized` (many JDBC drivers changed for this), or move to JDK 24 or later.",
        },
        {
          type: "heading",
          text: "Running CPU-heavy work on virtual threads",
        },
        {
          type: "paragraph",
          text: "There's no speed-up, and with no time slicing, 8 long computations held all 8 carriers and a trivial thread waited 1.1 s. Send CPU work to a bounded platform pool and wait for it from the virtual thread.",
        },
        {
          type: "heading",
          text: "Expecting thread dumps to show virtual threads",
        },
        {
          type: "paragraph",
          text: "`jstack` and `jcmd Thread.print` showed 27 threads for a process with 1,003 virtual threads. Use `jcmd <pid> Thread.dump_to_file -format=json` (or the text format), and name virtual threads so the dump is readable.",
        },
        {
          type: "heading",
          text: "Doing slow work in static initialisers",
        },
        {
          type: "paragraph",
          text: "Blocking in `<clinit>` pins with `reason:NATIVE`, and every other thread that touches the class waits for the initialiser. Load slow resources lazily in ordinary methods.",
        },
        {
          type: "heading",
          text: "Relying on preview APIs without planning for change",
        },
        {
          type: "paragraph",
          text: "`StructuredTaskScope` and `ScopedValue` need `--enable-preview` on Java 21 at compile and run time, and `StructuredTaskScope` was redesigned in Java 25. Keep preview usage behind a small internal helper so the change touches one file.",
        },
        {
          type: "heading",
          text: "Spinning instead of blocking",
        },
        {
          type: "paragraph",
          text: "A busy-wait loop (`while (!ready) { }` or `Thread.onSpinWait()`) never unmounts, so it holds a carrier exactly like CPU work. Use a blocking primitive (`CountDownLatch`, `CompletableFuture.get`, `LockSupport.park` in a loop).",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Create one virtual thread per task (`newVirtualThreadPerTaskExecutor()` in a `try`-with-resources, or a server's virtual-thread option). Never pool them.",
            "Put a `Semaphore` in front of every resource with a capacity: database, each downstream service, each third-party API. Use `tryAcquire` with a timeout when a fallback exists.",
            "Size the connection pool for the database's capacity, not for the number of threads, and keep the semaphore's permits at or below the pool size so waiting happens in the semaphore, not in the pool's timeout.",
            "On Java 21, replace `synchronized` around blocking calls with `ReentrantLock`; keep `synchronized` for short, non-blocking critical sections, where it's fine.",
            "Run tests with `-Djdk.tracePinnedThreads=short` and fail on `jdk.VirtualThreadPinned` events from your own packages; in production, keep JFR on and watch that event.",
            "Name virtual threads that matter (`Thread.ofVirtual().name(\"payout-\", 0)`) and take dumps with `jcmd <pid> Thread.dump_to_file -format=json`.",
            "Keep CPU-bound work on a bounded platform pool and hand it over from the virtual thread.",
            "Use `StructuredTaskScope` for fan-out when previews are acceptable; otherwise, cancel sibling futures explicitly on failure and always set a deadline.",
            "Treat `ThreadLocal` caches as per-task costs on virtual threads, and prefer `ScopedValue` or parameters for context.",
            "Leave `jdk.virtualThreadScheduler.parallelism` at the core count unless measurements say otherwise; raising it hides pinning instead of fixing it.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "What a thread costs to create and to keep parked: 5,000 platform threads, then 5,000 and 100,000 virtual threads, each parked on a latch, with the process's resident memory (`VmRSS` from `/proc/self/status`) before and after:",
        },
        {
          type: "code",
          language: "java",
          title: "ThreadCost.java",
          code: `import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;

public class ThreadCost {
    static long rssMb() throws Exception {
        for (String line : Files.readAllLines(Path.of("/proc/self/status"))) {
            if (line.startsWith("VmRSS:")) return Long.parseLong(line.replaceAll("\\\\D", "")) / 1024;
        }
        return -1;
    }

    static void park(String label, Thread.Builder builder, int n) throws Exception {
        CountDownLatch started = new CountDownLatch(n), release = new CountDownLatch(1);
        System.gc();
        long rss0 = rssMb(), t0 = System.nanoTime();
        Thread[] ts = new Thread[n];
        for (int i = 0; i < n; i++) {
            ts[i] = builder.start(() -> {
                started.countDown();
                try { release.await(); } catch (InterruptedException e) { }
            });
        }
        started.await();
        long startMs = (System.nanoTime() - t0) / 1_000_000;
        System.gc();
        long rss1 = rssMb();
        System.out.printf("%-10s %,7d parked: started in %,5d ms (%5.1f us each), RSS +%,4d MB (%5.1f KB each)%n",
                label, n, startMs, startMs * 1000.0 / n, rss1 - rss0, (rss1 - rss0) * 1024.0 / n);
        release.countDown();
        for (Thread t : ts) t.join();
    }

    public static void main(String[] args) throws Exception {
        park("warm-up", Thread.ofVirtual(), 10_000);
        park("platform", Thread.ofPlatform(), 5_000);
        park("virtual", Thread.ofVirtual(), 5_000);
        park("virtual", Thread.ofVirtual(), 100_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx512m ThreadCost.java",
        },
        {
          type: "output",
          text: `warm-up     10,000 parked: started in   140 ms ( 14.0 us each), RSS +  34 MB (  3.5 KB each)
platform     5,000 parked: started in   647 ms (129.4 us each), RSS + 108 MB ( 22.1 KB each)
virtual      5,000 parked: started in    17 ms (  3.4 us each), RSS +   3 MB (  0.6 KB each)
virtual    100,000 parked: started in   215 ms (  2.2 us each), RSS +  84 MB (  0.9 KB each)`,
        },
        {
          type: "list",
          items: [
            "**A platform thread took 129 to 177 us to start and about 20 to 22 KB of resident memory** (three runs): a `clone` system call, a guard page, the touched part of a 1 MB stack, and the JVM's per-thread structures. 5,000 of them cost 98 to 108 MB.",
            "**A virtual thread took 1.4 to 3.4 us and under 1 KB of RSS.** 100,000 parked virtual threads added 84 to 91 MB, which is mostly heap (stack chunks at this shallow depth, plus the latch's wait queue nodes). The 5,000-thread virtual RSS numbers are an underestimate, because the heap had already been grown by the warm-up and new objects fit into committed memory.",
            "**Where the time goes in real workloads**: starting and parking a virtual thread costs microseconds, small next to a database round trip of milliseconds. Pinning, a missing concurrency limit and GC of millions of chunks are what actually showed up in my measurements: 1.5 s instead of 0.12 s for pinned sleeps, 680 failed payouts, and the 0.26 to 6.3 s spread of `HundredThousandWaits` under load.",
            "These are single-machine `System.nanoTime` and `/proc` measurements on an 8-core machine with other benchmarks running, not JMH. The ratios (about 40 to 120 times cheaper to start, about 20 times less memory per parked thread) were stable across runs; the absolute numbers weren't.",
          ],
        },
      ],
    },
    {
      title: "Virtual Threads in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend's nightly payout job pays every driver for the day's trips. Each payout updates the driver ledger and then calls the bank's payout API, inside one `@Transactional` method, so the database connection is held for the bank call too. The job used to run on a fixed pool of 16 platform threads and finished every night. The service shares a HikariCP pool of 20 connections (`connectionTimeout` 500 ms) with the rider-facing fare-quote endpoint. During a Java 21 upgrade, the team switched the job's executor to `newVirtualThreadPerTaskExecutor()` (\"virtual threads are cheap, why limit them?\"). That night most payouts failed with `Connection is not available, request timed out after 500ms`, and fare quotes slowed down while the job ran. I rebuilt it, scaled down:",
        },
        {
          type: "code",
          language: "java",
          title: "PayoutPoolExhaustion.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class PayoutPoolExhaustion {
    // A stand-in for HikariCP: 20 connections, give up after 500 ms (connectionTimeout)
    static class ConnectionPool {
        final BlockingQueue<Integer> idle = new ArrayBlockingQueue<>(20);
        final AtomicInteger inUse = new AtomicInteger(), peak = new AtomicInteger();
        ConnectionPool() { for (int i = 0; i < 20; i++) idle.add(i); }

        int borrow() throws InterruptedException {
            Integer c = idle.poll(500, TimeUnit.MILLISECONDS);
            if (c == null) throw new IllegalStateException("Connection is not available, request timed out after 500ms");
            peak.accumulateAndGet(inUse.incrementAndGet(), Math::max);
            return c;
        }
        void release(int c) { inUse.decrementAndGet(); idle.add(c); }
    }

    static final int PAYOUTS = 800;

    // One driver payout: holds a connection for the ledger update AND the bank call (the real bug in the code)
    static boolean payout(ConnectionPool db, Semaphore limit) {
        try {
            if (limit != null) limit.acquire();
            try {
                int c = db.borrow();
                try {
                    Thread.sleep(20);                    // UPDATE driver_ledger ...
                    Thread.sleep(80);                    // POST to the bank, connection still held
                } finally {
                    db.release(c);
                }
                return true;
            } finally {
                if (limit != null) limit.release();
            }
        } catch (IllegalStateException e) {
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    // Rider fare quotes share the same pool: one every 10 ms, 5 ms of database time each
    static Thread fareTraffic(ConnectionPool db, List<Long> latencies, AtomicInteger failed, long runMs) {
        return Thread.ofVirtual().start(() -> {
            List<Thread> quotes = new ArrayList<>();
            long end = System.nanoTime() + runMs * 1_000_000;
            while (System.nanoTime() < end) {
                quotes.add(Thread.ofVirtual().start(() -> {
                    long t0 = System.nanoTime();
                    try {
                        int c = db.borrow();
                        try { Thread.sleep(5); } finally { db.release(c); }
                        latencies.add((System.nanoTime() - t0) / 1_000_000);
                    } catch (Exception e) {
                        failed.incrementAndGet();
                    }
                }));
                try { Thread.sleep(10); } catch (InterruptedException e) { return; }
            }
            for (Thread q : quotes) { try { q.join(); } catch (InterruptedException e) { return; } }
        });
    }

    static void run(String label, ExecutorService payoutExecutor, Semaphore limit) throws Exception {
        ConnectionPool db = new ConnectionPool();
        List<Long> latencies = Collections.synchronizedList(new ArrayList<>());
        AtomicInteger quoteFailures = new AtomicInteger(), paid = new AtomicInteger(), payoutFailures = new AtomicInteger();
        long t0 = System.nanoTime();
        Thread fares = fareTraffic(db, latencies, quoteFailures, 4_000);
        try (payoutExecutor) {
            for (int i = 0; i < PAYOUTS; i++) {
                payoutExecutor.submit(() -> {
                    if (payout(db, limit)) paid.incrementAndGet(); else payoutFailures.incrementAndGet();
                });
            }
        }
        long payoutMs = (System.nanoTime() - t0) / 1_000_000;
        fares.join();
        List<Long> sorted = new ArrayList<>(latencies);
        Collections.sort(sorted);
        long p99 = sorted.isEmpty() ? -1 : sorted.get((int) (sorted.size() * 0.99) - 1);
        System.out.println(label);
        System.out.printf("  payouts: %d paid, %d failed (pool timeout), took %,d ms, peak connections %d/20%n",
                paid.get(), payoutFailures.get(), payoutMs, db.peak.get());
        System.out.printf("  fare quotes: %d ok, %d failed, p99 wait+query %d ms%n", sorted.size(), quoteFailures.get(), p99);
    }

    public static void main(String[] args) throws Exception {
        run("before: payouts on a fixed pool of 16 platform threads", Executors.newFixedThreadPool(16), null);
        run("after the switch: one virtual thread per payout", Executors.newVirtualThreadPerTaskExecutor(), null);
        run("fix: virtual threads + Semaphore(16) around payouts", Executors.newVirtualThreadPerTaskExecutor(), new Semaphore(16));
    }
}`,
        },
        {
          type: "output",
          text: `before: payouts on a fixed pool of 16 platform threads
  payouts: 800 paid, 0 failed (pool timeout), took 5,037 ms, peak connections 17/20
  fare quotes: 385 ok, 0 failed, p99 wait+query 8 ms
after the switch: one virtual thread per payout
  payouts: 120 paid, 680 failed (pool timeout), took 620 ms, peak connections 20/20
  fare quotes: 378 ok, 10 failed, p99 wait+query 459 ms
fix: virtual threads + Semaphore(16) around payouts
  payouts: 800 paid, 0 failed (pool timeout), took 5,026 ms, peak connections 17/20
  fare quotes: 390 ok, 0 failed, p99 wait+query 5 ms`,
        },
        {
          type: "list",
          items: [
            "**680 of 800 payouts failed, and the job \"finished\" in 620 ms.** All 800 virtual threads asked for a connection at once. 20 got one; each held it for 100 ms; in the 500 ms timeout, each connection could serve 5 payouts in turn, so about 20 + 100 = 120 succeeded and the rest timed out. That's exactly 119 to 120 paid in all three runs. The old pool of 16 had never let more than 16 payouts ask at once, which nobody had written down as a requirement.",
            "**Fare quotes, which share the pool, suffered too**: 2 to 14 failed per run and the p99 went from 7 or 8 ms to 432 to 484 ms, because riders' quotes queued behind 780 payouts for the same connections. In production that looked like a rider-facing latency spike at 02:00 that nobody connected to the payout job.",
            "**The fix restored the limit explicitly**: a `Semaphore(16)` around the payout, so at most 16 payouts hold or wait for connections, and the other 784 wait in the semaphore, where waiting is cheap and has no timeout. Result: 800 of 800 paid in about 5 s, the same as before, and fare quotes kept 4 connections free (peak 17 or 18 of 20, p99 5 to 8 ms). Virtual threads didn't make the job faster, because the bottleneck is 20 connections x 100 ms, and they never could.",
            "**The deeper fix is in the payout itself**: holding a connection across the bank call is what made 20 connections so scarce. Committing the ledger update, releasing the connection, then calling the bank (with an outbox table or an idempotency key for safety) would let each connection do five times more payouts.",
            "**What I'd check first in production**: HikariCP's `hikaricp_connections_pending` and timeout metrics alongside the executor change, then a JSON thread dump: hundreds of virtual threads parked in `HikariPool.getConnection` is the signature. **What prevents it next time**: a rule that every executor switched to virtual threads gets an explicit `Semaphore` for each resource the old pool size was protecting, and a load test with the job and the rider traffic running together.",
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
              question: "What is a virtual thread, and how is it different from a platform thread?",
              answer:
                "A virtual thread is a `java.lang.Thread` scheduled by the JVM rather than the OS. A platform thread wraps one OS thread for its whole life, with a fixed OS stack; a virtual thread runs by being mounted on a carrier platform thread and is unmounted when it blocks, its frames saved to a heap object. That makes them cheap: in my measurements about 2 us and under 1 KB to create and park, against about 150 us and 20 KB for a platform thread, so you can have millions. They're always daemon threads and ignore priority.",
            },
            {
              question: "How do you create virtual threads?",
              answer:
                "`Thread.startVirtualThread(r)`, the builder `Thread.ofVirtual().name(\"trip-\", 0).start(r)` (or `unstarted`, or `.factory()` for a `ThreadFactory`), or an executor: `Executors.newVirtualThreadPerTaskExecutor()`, which creates a new virtual thread for every task. Use the executor in a `try`-with-resources; `close()` waits for all tasks.",
            },
            {
              question: "Do virtual threads make code run faster?",
              answer:
                "No. They make waiting cheap, which raises throughput for code that mostly waits on I/O, because many more requests can be in flight at once. A single request isn't faster, and CPU-bound work isn't faster at all: in my test, 64 CPU tasks took about the same time on 8 platform threads as on 64 virtual threads, because there are still 8 cores.",
            },
            {
              question: "Should you pool virtual threads?",
              answer:
                "No. Pools exist because platform threads are expensive; virtual threads aren't. A pool of virtual threads brings back the pool's problems, such as `ThreadLocal` values left by previous tasks (980 of 1,000 tasks saw one in my test), and adds nothing. If you need to limit concurrency, limit the resource with a `Semaphore`.",
            },
            {
              question: "What is a carrier thread?",
              answer:
                "A platform thread in the virtual-thread scheduler (a `ForkJoinPool`, one carrier per core by default) that runs virtual threads. A virtual thread is mounted on a carrier while it runs and unmounted when it blocks; it can resume on a different carrier. `Thread.currentThread()` always returns the virtual thread, never the carrier.",
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
              question: "How does a virtual thread unmount when it blocks?",
              answer:
                "Each `VirtualThread` has a `Continuation`. When it blocks in `park`, `sleep`, a `java.util.concurrent` lock or socket I/O, the JDK sets the state to `PARKING` and calls `Continuation.yield`, which copies the frames from the carrier's stack into a `StackChunk` on the heap and returns to the carrier's `runContinuation`. That clears `carrierThread` and publishes `PARKED`. On `unpark`, the state becomes `UNPARKED` and `runContinuation` is submitted to the scheduler; any carrier mounts it and copies the frames back. I watched the state field read 7 (`TIMED_PARKED`) with a null carrier during a sleep.",
            },
            {
              question: "What is pinning, and what causes it on Java 21?",
              answer:
                "A pinned virtual thread can't unmount, so when it blocks, its carrier blocks too. On Java 21 it's caused by blocking while holding a monitor (inside `synchronized`), reason `MONITOR`, or with a native frame on the stack (JNI, or a class initialiser), reason `NATIVE`. In my test, 100 sleeps inside `synchronized` took 1.5 s on 8 carriers versus 0.12 s with `ReentrantLock`. JDK 24 (JEP 491) removed monitor pinning.",
            },
            {
              question: "How do you find pinning?",
              answer:
                "In tests, `-Djdk.tracePinnedThreads=full` (or `short`) prints a stack trace with `reason:MONITOR` or `NATIVE` and marks the frame holding the monitor with `<== monitors:1`; it prints each distinct stack once. In production, JFR's `jdk.VirtualThreadPinned` event records every pinned park over 20 ms with duration and stack, enabled in the default settings. You can also consume it in-process with `RecordingStream` and fail a test on it. Neither sees threads blocked on monitor **entry**.",
            },
            {
              question: "Why does replacing synchronized with ReentrantLock fix pinning?",
              answer:
                "On JDK 21, a monitor's ownership is tied to the OS thread (the carrier), so the JVM can't move a monitor-holding frame to another carrier. `ReentrantLock` records its owner in a Java field (`exclusiveOwnerThread`, the virtual thread) and waits through `LockSupport.park`, which for a virtual thread is a normal unmount. So a virtual thread can hold a `ReentrantLock`, block, unmount, and resume on another carrier still owning the lock.",
            },
            {
              question: "How do you take a thread dump that includes virtual threads?",
              answer:
                "`jcmd <pid> Thread.dump_to_file -format=json <file>` (or without `-format=json` for text). `jstack` and `jcmd Thread.print` only show platform threads: 27 threads against 1,019 in the JSON for my test. The JSON groups threads by container (each executor, each `StructuredTaskScope` with its owner), but has no lock or state information.",
            },
            {
              question: "What does StructuredTaskScope.ShutdownOnFailure do?",
              answer:
                "It's a preview API in Java 21 (needs `--enable-preview`). You fork subtasks inside a `try`-with-resources, call `join()`, then `throwIfFailed()`. The first failing subtask triggers `shutdown()`, which interrupts the others; `throwIfFailed` rethrows the failure in an `ExecutionException`. In my fare quote, a promo failure at 101 ms cancelled the surge and ETA calls by 105 ms. `ShutdownOnSuccess` is the opposite: the first success wins and cancels the rest.",
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
              question: "Describe the default virtual-thread scheduler and its tuning properties.",
              answer:
                "A dedicated `ForkJoinPool` (not the common pool) in async (FIFO) mode, created with `CarrierThread` workers. `jdk.virtualThreadScheduler.parallelism` defaults to the number of processors, `maxPoolSize` to `max(parallelism, 256)`, `minRunnable` to `max(parallelism / 2, 1)`, and idle carriers exit after 30 s; I read these from the bytecode of `createDefaultScheduler`. The pool can temporarily exceed parallelism to compensate for `Object.wait()` and some blocking file I/O (it grew to 36 carriers in my test), up to `maxPoolSize`. There's no time slicing: a virtual thread keeps its carrier until it blocks.",
            },
            {
              question: "Can pinning cause a deadlock? Explain how.",
              answer:
                "Yes. If every carrier is pinned by a virtual thread waiting for something that only an unmounted virtual thread can provide, that thread can never get a carrier. In my `PinnedDeadlock`, a virtual thread held a `ReentrantLock` and slept (unmounted); 8 others entered `synchronized` blocks and then called `lock()`, pinning all 8 carriers. When the sleep ended, the holder was `RUNNABLE` but never ran, so it never unlocked. The JVM deadlock detector reported nothing, since the cycle goes through the scheduler's queue. Without the `synchronized`, the same code finished.",
            },
            {
              question: "How much memory does a parked virtual thread use, and what determines it?",
              answer:
                "A `VirtualThread` object (144 bytes), its continuation (48 bytes), and a `StackChunk` holding its frames, which dominates. For 10,000 threads parked 10 frames deep, chunks were 21 to 27 MB (about 2 KB each); 200 frames deep, 39 to 76 MB, and 236 MB with `-Xint`, because interpreted frames are larger than compiled ones. So the cost depends on stack depth and on JIT state, and it's on the GC heap, unlike a platform thread's fixed OS stack.",
            },
            {
              question: "How are ScopedValue bindings inherited by StructuredTaskScope subtasks, and what is StructureViolationException?",
              answer:
                "When a scope opens, its `ThreadFlock` takes a snapshot of the owner's `ScopedValue` bindings; each fork starts with exactly that snapshot, so no maps are copied and the child can't outlive the binding (the scope must close before the `run` that bound it returns). If the owner rebinds a value after opening the scope and then forks, the bindings no longer match the snapshot, and `fork` throws `StructureViolationException: Scoped value bindings have changed`, which I triggered by forking inside a nested `where(RIDER, \"ravi\")`.",
            },
            {
              question: "Why don't virtual threads help CPU-bound work, and what's the risk of running it on them?",
              answer:
                "The scheduler has as many carriers as cores, so total compute capacity is unchanged; virtual threads only remove the cost of waiting. The risk is latency: JDK 21 doesn't time-slice virtual threads, so long computations keep their carriers until they block. In my test, 8 CPU-bound virtual threads made a trivial virtual thread wait 1.1 to 1.4 s. Platform threads would have been preempted by the OS. Keep CPU work on a bounded platform pool.",
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
              question: "After switching a Spring Boot service to virtual threads, throughput under load dropped instead of rising, CPU is low, and requests time out. Thread dumps from jstack look almost empty. What's going on and how do you investigate?",
              answer:
                "Low CPU plus timeouts means the carriers are blocked, which on Java 21 points to pinning. `jstack` only shows platform threads, so I'd take `jcmd <pid> Thread.dump_to_file -format=json` and look at what the virtual threads are doing, and check the 8 carriers in `Thread.print`: carriers \"Carrying virtual thread\" with stacks in socket reads under a `synchronized` frame mean pinned I/O. Then I'd confirm with a JFR recording and `jfr print --events jdk.VirtualThreadPinned`, and with `-Djdk.tracePinnedThreads=short` in a staging run, to get the exact frame holding the monitor (often a JDBC driver, a connection pool or a legacy client). In `PinnedCarriers`, pinning turned 0.12 s into 1.5 s.\n\nFixes, in order: upgrade the library to a version that uses `ReentrantLock`, replace our own `synchronized` around I/O with `ReentrantLock`, or move to JDK 24+. Raising `jdk.virtualThreadScheduler.parallelism` only hides it.",
            },
            {
              question: "A nightly payout job was moved from a fixed pool of 16 threads to newVirtualThreadPerTaskExecutor. Now most payouts fail with 'Connection is not available, request timed out', and rider fare quotes get slow while the job runs. What happened and what do you change?",
              answer:
                "The fixed pool was also an implicit concurrency limit: never more than 16 payouts wanting a connection. With a thread per payout, all of them asked at once, the 20-connection pool ran out, and requests waiting longer than `connectionTimeout` failed; the rider endpoint, sharing the pool, queued behind them. My reproduction: 680 of 800 payouts failed, fare-quote p99 went from 8 ms to about 460 ms.\n\nChange: put a `Semaphore(16)` around the payout so waiting happens in the semaphore (cheap, no timeout) and connections stay available for riders; that gave 800 of 800 paid and p99 5 ms. Then stop holding the connection across the bank call, and consider a separate pool for batch jobs. Virtual threads won't make the job faster than 20 connections allow.",
            },
            {
              question: "A service on Java 21 virtual threads occasionally freezes completely: no requests complete, CPU is near zero, and the JVM's deadlock detector finds nothing. Restarting fixes it for a few hours. What could cause this?",
              answer:
                "A deadlock through the scheduler: all carriers pinned by virtual threads that are waiting for something only an unmounted virtual thread can do. My `PinnedDeadlock` shows the shape: one virtual thread holds a `ReentrantLock` and blocks (unmounts); 8 others enter `synchronized` and then wait for that lock, pinning all 8 carriers; the holder becomes runnable but never gets a carrier. `Thread.print` shows every carrier \"Carrying virtual thread\" and no deadlock section.\n\nI'd confirm with a JSON dump (the lock holder parked or runnable, many threads parked in `lock()` under a `synchronized` frame) and JFR pinned events, then remove the blocking-inside-`synchronized` (or upgrade to JDK 24). Because it needs as many simultaneous pinned threads as carriers, it appears only under load, which is why it looks intermittent.",
            },
            {
              question: "After moving the pricing service to virtual threads, p99 latency for simple endpoints like /health and /zones jumped during surge recalculation, although average CPU didn't change. Why?",
              answer:
                "Surge recalculation is CPU-bound and now runs on virtual threads. JDK 21's scheduler doesn't time-slice them, so a few long computations hold carriers until they finish, and short requests queue for a carrier. In `CpuBound`, a trivial virtual thread waited 1.1 s behind 8 CPU-bound ones. Fix: run the recalculation on a bounded platform `ForkJoinPool` or fixed pool (fewer threads than cores, so some CPU stays free) and have the virtual thread submit and wait for it. Virtual threads for waiting, platform threads for computing.",
            },
            {
              question: "Your team wants to fan out a fare quote to surge, ETA and promo services. Today, when one call fails, the others keep running and their results are discarded, and thread dumps can't tell which subtask belongs to which request. What would you propose?",
              answer:
                "Structured concurrency: on Java 21 that's `StructuredTaskScope.ShutdownOnFailure` behind `--enable-preview`. Fork the three calls in a `try`-with-resources, `join()` (or `joinUntil` with the request's deadline), then `throwIfFailed()`. A failure interrupts the siblings (in my run, within 4 ms), no subtask outlives the block, `ScopedValue` context like the rider ID is inherited by every fork, and JSON thread dumps show the forks under a container owned by the request thread. If previews aren't allowed, the fallback is `CompletableFuture` with explicit cancellation of siblings on failure and `orTimeout`, which needs more care. I'd wrap it in a small helper because the API changes in Java 25.",
            },
            {
              question: "A teammate proposes Executors.newFixedThreadPool(200, Thread.ofVirtual().factory()) to 'get virtual threads but keep the old limit'. What do you say?",
              answer:
                "That it keeps the costs of a pool and none of the benefits. It limits everything submitted to that executor rather than the specific resource, it queues tasks invisibly, and reused threads carry `ThreadLocal` state between tasks (980 of 1,000 tasks saw a stale value in my `LimitNotPool`). The pool and a `Semaphore(20)` gave the same 2.5 s and the same peak of 20 database calls. I'd use a virtual thread per task and a `Semaphore` per limited resource, sized from that resource's capacity.",
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
            "Run `PinnedCarriers` with `-Djdk.virtualThreadScheduler.parallelism=2`. How long do the `synchronized` and `ReentrantLock` versions take?",
            "Run `PinnedCarriers` with `-Djdk.tracePinnedThreads=short`. How many traces print for 100 pinned sleeps?",
            "Run `WaitCompensates` with `-Djdk.virtualThreadScheduler.maxPoolSize=12`. What happens to the `Object.wait` line?",
            "Run `PinnedDeadlock no-monitor`. Does the refresher finish?",
            "Compile `FareQuoteScope.java` with a plain `javac FareQuoteScope.java`, without the preview flags.",
            "Run `StackChunks` with `-Xint` and compare the `StackChunk` sizes at depth 200 with a normal run.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 takes about 5.3 s for `synchronized` (50 rounds of 100 ms on 2 carriers) and about 120 ms for `ReentrantLock`, unchanged from 8 carriers. Step 2 prints one short trace, `withSynchronized(PinnedCarriers.java:20) <== monitors:1` with `reason:MONITOR`, because each distinct stack is printed once. Step 3: the `Object.wait` line takes about 1.5 s with 12 carriers, since compensation stops at `maxPoolSize`. Step 4 prints `refresher alive=false (state TERMINATED), quoters alive=0`: without the monitor, the waiters unmount. Step 5 fails with `error: StructuredTaskScope is a preview API and is disabled by default.` and the hint `(use --enable-preview to enable preview APIs)`. Step 6 gives about 236 MB of chunks at depth 200 with `-Xint`, against 39 to 76 MB normally, because interpreted frames are much larger than compiled ones.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT       VirtualThread = Thread + Continuation; state int; carrierThread
           mounted on a carrier (ForkJoinPool, FIFO, parallelism = cores)
           block -> freeze frames to a heap StackChunk -> carrier freed
           unpark -> runContinuation submitted -> any carrier thaws + resumes

COST       ~2 us, < 1 KB to start; chunk = actual stack (2 KB at depth 10)
           100k x 100 ms sleeps: 50 s on 200 threads, 0.26-6.3 s virtual

PINNING    Java 21: blocking inside synchronized (MONITOR), native/clinit (NATIVE)
           100 pinned sleeps 1.5 s vs 0.12 s with ReentrantLock
           find: -Djdk.tracePinnedThreads=full|short, JFR jdk.VirtualThreadPinned
           Object.wait: pinned but compensated (pool grows to maxPoolSize)
           all carriers pinned + holder unmounted = deadlock nobody detects
           JDK 24 (JEP 491): synchronized no longer pins

DUMPS      jcmd <pid> Thread.dump_to_file -format=json  (Thread.print hides them)

RULES      one virtual thread per task; never pool them
           Semaphore per limited resource (DB, APIs); tryAcquire + fallback
           CPU-bound work -> bounded platform pool (no time slicing)

SCOPES     StructuredTaskScope (preview 21, --enable-preview)
           ShutdownOnFailure: first failure cancels siblings
           ShutdownOnSuccess: first success wins; joinUntil = deadline
           forks inherit ScopedValue bindings; join before get/close`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A virtual thread is a `Thread` whose stack moves to the heap whenever it waits, so waiting costs memory proportional to the stack instead of an OS thread. That makes thread-per-request cheap for I/O-bound code, and changes nothing for CPU-bound code.",
            "On Java 21, the traps are pinning (blocking inside `synchronized` or native frames), the concurrency limit that disappears with the pool, and `ThreadLocal` caches. Find pinning with `jdk.tracePinnedThreads` and JFR, limit resources with semaphores, and take dumps with `Thread.dump_to_file`. `StructuredTaskScope` adds a parent, a deadline and cancellation to a group of forks, with `ScopedValue` context flowing into them.",
            "Next comes Deadlock, Livelock and Starvation: how a lock-ordering cycle forms between threads, what the JVM's deadlock detector finds in a thread dump (and what it misses, like the pinned-carrier deadlock above), `tryLock` with timeouts, livelock where threads stay busy without progress, and starvation from unfair locks and greedy tasks.",
          ],
        },
      ],
    },
  ],
};
