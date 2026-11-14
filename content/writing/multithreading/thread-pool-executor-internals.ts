import type { Lesson } from "../types";

export const threadPoolExecutorInternals: Lesson = {
  slug: "thread-pool-executor-internals",
  date: "2026-11-14",
  title: "ThreadPoolExecutor Internals: Queues, Rejection and Sizing",
  description:
    "Inside ThreadPoolExecutor on JDK 21: the six constructor parameters, the exact admission order read from javap (core threads, then the queue, then extra threads, then rejection), why an unbounded LinkedBlockingQueue means maximumPoolSize never matters and why tasks 5 and 6 can run before tasks 3 and 4, the ctl field that packs the run state and worker count into one int (watched by reflection from RUNNING to TERMINATED), the AQS-based Worker, getTask's poll versus take and why \"core thread\" is a count rather than a thread, ArrayBlockingQueue, LinkedBlockingQueue, SynchronousQueue and the PriorityBlockingQueue that throws ClassCastException on submit, all four rejection policies, keep-alive, prestarting, named threads, CPU-bound and IO-bound sizing measured against N+1 and N(1+W/C), monitoring and beforeExecute/afterExecute hooks, the shared ForkJoinPool common pool, and a notification service that ran out of memory in about 2 seconds with newFixedThreadPool and held steady with a bounded queue and CallerRunsPolicy.",
  tags: ["Multithreading", "ThreadPoolExecutor", "Thread Pools", "Performance"],
  sections: [
    {
      title: "What ThreadPoolExecutor Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, ExecutorService, Callable and Future, used thread pools through their interfaces and found that most `Executors` factories build the same class with different arguments: `newFixedThreadPool` is a `ThreadPoolExecutor` with an unbounded `LinkedBlockingQueue`, `newCachedThreadPool` one with a `SynchronousQueue` and no thread limit, and the scheduled pool a subclass of it. This lesson opens that class, because every production pool should be configured on purpose rather than by a factory's defaults.",
        },
        {
          type: "paragraph",
          text: "A `ThreadPoolExecutor` is a set of **worker threads**, a **work queue** and a **policy** that decides, for every submitted task, whether to start a new thread, queue the task, or reject it. Six constructor parameters define that policy: `corePoolSize`, `maximumPoolSize`, `keepAliveTime`, the `workQueue`, a `ThreadFactory` and a `RejectedExecutionHandler`. Internally, the run state and the number of workers live together in one atomic integer, `ctl`, and each worker is a small lock built on `AbstractQueuedSynchronizer`.",
        },
        {
          type: "paragraph",
          text: "The order in which the pool grows is the single most misunderstood fact about it, and the root of a classic outage: a pool with an unbounded queue never adds threads beyond its core size, and never rejects anything, so under overload it quietly turns memory into latency until the heap runs out. This lesson measures that, the four rejection policies, how to size a pool for CPU-bound and IO-bound work, and how to watch a pool in production.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "`ThreadPoolExecutor` arrived with JSR 166 in Java 5, derived from the `PooledExecutor` in Doug Lea's earlier concurrency library. The admission policy (core, queue, maximum, reject) and the four rejection policies are from that first version. Later releases mostly changed the internals: the original kept the run state and worker count in separate fields guarded by a lock, and Java 7's rewrite packed them into one `AtomicInteger` so the hot path of `execute` needs no lock at all.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`ThreadPoolExecutor`, `ScheduledThreadPoolExecutor`, `ArrayBlockingQueue`, `LinkedBlockingQueue`, `SynchronousQueue`, `PriorityBlockingQueue`, the four rejection policies", "The whole design in this lesson"],
            ["Java 6 (2006)", "`allowCoreThreadTimeOut`", "Pools that shrink to zero when idle"],
            ["Java 7 (2011)", "`ctl` packs run state and worker count into one `AtomicInteger`; `ForkJoinPool`", "Lock-free admission; work stealing"],
            ["Java 8 (2014)", "`ForkJoinPool.commonPool()`, used by parallel streams and `CompletableFuture`'s default async methods", "A pool shared by the whole JVM"],
            ["Java 9 (2017)", "`setCorePoolSize` above the maximum throws `IllegalArgumentException`", "Resizing must change max first"],
            ["Java 19 to 21", "`ExecutorService.close()`; JDK 21 tracks pool threads in a `SharedThreadContainer` (the `container` field in javap); virtual threads", "New thread dump format and executor choices"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A food-delivery dispatch desk at New Town, assigning orders to riders.",
        },
        {
          type: "list",
          items: [
            "**`corePoolSize`** is the riders on the permanent roster. The desk calls in a roster rider for every new order until all of them are out, even if one of them just came back and is sitting idle.",
            "**The work queue** is the shelf of packed orders waiting for a rider. Once the roster is out, new orders go on the shelf.",
            "**`maximumPoolSize`** is extra freelance riders. The desk calls freelancers **only when the shelf is full**, and a freelancer takes the order that just arrived, not the oldest one on the shelf.",
            "**`keepAliveTime`** is how long a rider waits without work before going home. Freelancers always go home; roster riders only if `allowCoreThreadTimeOut` is set.",
            "**The rejection policy** is what happens when the shelf is full and every freelancer is out: refuse the order (`Abort`), make the restaurant deliver it itself (`CallerRuns`), quietly throw it away (`Discard`), or throw away the oldest order on the shelf to make room (`DiscardOldest`).",
            "**An unbounded queue** is a shelf that never fills. The desk never calls a freelancer and never refuses an order, so on a festival night the shelf grows into the street while customers wait hours.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: riders are people with names, and the roster is a fixed list of them. In a `ThreadPoolExecutor`, \"core\" is only a number. No thread is marked as a core thread: when the pool has more threads than `corePoolSize`, whichever threads happen to time out first leave, and in my test it was sometimes the first thread ever created.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/thread-pool-executor-internals-admission.svg",
          alt: "Left: the admission chain of ThreadPoolExecutor.execute, with numbers from a pool with core 2, max 4 and an ArrayBlockingQueue of capacity 2. Step 1, if workerCount is less than corePoolSize, checked even if existing workers are idle: a new core thread runs the task, tasks 1 and 2, pool size 1 then 2. Otherwise step 2, if workQueue.offer succeeds, a non-blocking offer, never put: the task waits in the queue, tasks 3 and 4. Otherwise, the queue being full, step 3, if workerCount is less than maximumPoolSize, addWorker with core false: an extra thread runs the task now, so tasks 5 and 6 start before 3 and 4. Otherwise step 4, reject: the RejectedExecutionHandler handles task 7; Abort throws, CallerRuns runs it on the caller, Discard and DiscardOldest drop one. A note says that with an unbounded LinkedBlockingQueue, as in newFixedThreadPool, step 2 always succeeds, steps 3 and 4 never happen, the pool never grows past core, and the queue grows until the heap runs out. Right: ctl, one AtomicInteger holding two fields: the top 3 bits are runState, here 111, and the low 29 bits are workerCount, here 3. A table of states and their top bits: RUNNING 111, negative, set by the constructor; SHUTDOWN 000 by shutdown; STOP 001 by shutdownNow; TIDYING 010 when there are no workers and the queue is empty; TERMINATED 011 after terminated runs. States only increase, so a single compare-and-set updates state and count together. A box notes that Worker extends AQS and implements Runnable, and is locked while running a task, so shutdown interrupts only the workers it can tryLock, the idle ones.",
          caption: "A task goes to a core thread, then to the queue, then to an extra thread, then to the rejection handler, in that order.",
        },
        {
          type: "heading",
          text: "The constructor parameters",
        },
        {
          type: "table",
          headers: ["Parameter", "Meaning", "Default in newFixedThreadPool(n)", "Common mistake"],
          rows: [
            ["`corePoolSize`", "Threads created on demand and kept even when idle", "`n`", "Thinking threads above it are created before queueing"],
            ["`maximumPoolSize`", "Upper limit on threads, used only when the queue is full", "`n`", "Setting it high with an unbounded queue, where it has no effect"],
            ["`keepAliveTime`, `unit`", "How long a thread above core waits for work before exiting", "0", "Expecting core threads to time out (needs `allowCoreThreadTimeOut(true)`)"],
            ["`workQueue`", "Where tasks wait when all core threads are busy", "`new LinkedBlockingQueue<>()` (unbounded)", "Leaving it unbounded in a server"],
            ["`threadFactory`", "Creates every worker thread: name, daemon flag, priority, handler", "`Executors.defaultThreadFactory()`: `pool-N-thread-M`, non-daemon", "Anonymous thread names in thread dumps"],
            ["`handler`", "What happens to a task that can't be admitted", "`AbortPolicy`", "Not deciding, and discovering `RejectedExecutionException` in production"],
          ],
        },
        {
          type: "heading",
          text: "Queues and what they do to the pool",
        },
        {
          type: "table",
          headers: ["Queue", "Capacity", "Effect on the pool", "Used by"],
          rows: [
            ["`LinkedBlockingQueue()`", "`Integer.MAX_VALUE`", "Never grows past core, never rejects; memory grows instead", "`newFixedThreadPool`, `newSingleThreadExecutor`"],
            ["`LinkedBlockingQueue(n)`", "`n`", "Bounded; a node allocated per task; separate locks for put and take", "Hand-built pools"],
            ["`ArrayBlockingQueue(n)`", "`n`, preallocated array", "Bounded; one lock; no allocation per task", "Hand-built pools"],
            ["`SynchronousQueue`", "0", "Hands each task directly to an idle thread or forces a new thread; rejects at max", "`newCachedThreadPool`"],
            ["`PriorityBlockingQueue`", "Unbounded", "Runs queued tasks by priority; never grows past core; tasks must be `Comparable`", "Priority dispatch (with `execute` only)"],
            ["`DelayedWorkQueue`", "Unbounded heap", "Orders by trigger time", "`ScheduledThreadPoolExecutor`"],
          ],
        },
        {
          type: "heading",
          text: "Rejection policies",
        },
        {
          type: "table",
          headers: ["Policy", "What happens to the rejected task", "When it fits"],
          rows: [
            ["`AbortPolicy` (default)", "`execute` throws `RejectedExecutionException`", "The caller can return an error (HTTP 503, retry later)"],
            ["`CallerRunsPolicy`", "Runs on the submitting thread, unless the pool is shut down", "Backpressure: slows the producer to the pool's speed"],
            ["`DiscardPolicy`", "Silently dropped", "Work that is truly optional (best-effort telemetry), with a counter"],
            ["`DiscardOldestPolicy`", "Drops the head of the queue, then retries the new task", "Only the latest value matters (location updates)"],
            ["Custom handler", "Anything: count, log, persist for later, block with a timeout", "Most production pools"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The JDK on this machine ships without `src.zip`, so I read the class the way the JVM sees it: fields with `javap -p`, constants with `-constants`, and the logic of `execute` with `javap -c`.",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p -constants java.util.concurrent.ThreadPoolExecutor",
        },
        {
          type: "output",
          text: `public class java.util.concurrent.ThreadPoolExecutor extends java.util.concurrent.AbstractExecutorService {
  private final java.util.concurrent.atomic.AtomicInteger ctl;
  private static final int COUNT_BITS = 29;
  private static final int COUNT_MASK = 536870911;
  private static final int RUNNING = -536870912;
  private static final int SHUTDOWN = 0;
  private static final int STOP = 536870912;
  private static final int TIDYING = 1073741824;
  private static final int TERMINATED = 1610612736;
  private final java.util.concurrent.BlockingQueue<java.lang.Runnable> workQueue;
  private final java.util.concurrent.locks.ReentrantLock mainLock;
  private final java.util.HashSet<java.util.concurrent.ThreadPoolExecutor$Worker> workers;
  private final java.util.concurrent.locks.Condition termination;
  private final jdk.internal.vm.SharedThreadContainer container;
  private int largestPoolSize;
  private long completedTaskCount;
  private volatile java.util.concurrent.ThreadFactory threadFactory;
  private volatile java.util.concurrent.RejectedExecutionHandler handler;
  private volatile long keepAliveTime;
  private volatile boolean allowCoreThreadTimeOut;
  private volatile int corePoolSize;
  private volatile int maximumPoolSize;
  ...`,
        },
        {
          type: "list",
          items: [
            "**`ctl` is the whole hot state.** `COUNT_BITS = 29`: the low 29 bits hold the worker count (`COUNT_MASK` is 2^29 - 1 = 536,870,911, the real upper limit on threads), and the top 3 bits hold the run state. `RUNNING` is `-1 << 29`, binary `111` followed by 29 zeros, which is negative; `SHUTDOWN` is 0, `STOP` is `1 << 29`, `TIDYING` `2 << 29`, `TERMINATED` `3 << 29`.",
            "**Why one integer**: the pool constantly needs to check \"am I running, and how many workers are there?\" and change both together (\"add a worker if still running and below the limit\"). With both in one `int`, a single `compareAndSet` on `ctl` does it, without a lock: the CAS technique from CAS, Atomic Classes, LongAdder and VarHandle. And because the states are ordered numerically, \"is it running?\" is just `c < SHUTDOWN`.",
            "**`mainLock` guards the rest**: the `workers` set, `largestPoolSize` and `completedTaskCount`. It's taken when adding or removing a worker and when reading statistics, not when a task is queued.",
            "**The configuration fields are `volatile`** so `setCorePoolSize`, `setMaximumPoolSize` and `setKeepAliveTime` can change a live pool and every worker sees the new value on its next check.",
            "**`container`** is new: JDK 21 registers pool threads in a `SharedThreadContainer`, which is how the new JSON thread dump (`jcmd Thread.dump_to_file`) groups threads by the executor that owns them.",
          ],
        },
        {
          type: "heading",
          text: "Watching ctl change",
        },
        {
          type: "paragraph",
          text: "Constants only describe the encoding, so I read `ctl` from a live pool through its whole life, with reflection (and `--add-opens`, since `java.util.concurrent` isn't open to application code):",
        },
        {
          type: "code",
          language: "java",
          title: "CtlPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class CtlPeek {
    static Field ctlField;

    static void show(String when, ThreadPoolExecutor pool) throws Exception {
        int c = ((AtomicInteger) ctlField.get(pool)).get();
        String bits = String.format("%32s", Integer.toBinaryString(c)).replace(' ', '0');
        int runState = c & ~((1 << 29) - 1);
        int workerCount = c & ((1 << 29) - 1);
        String state = switch (runState) {
            case -1 << 29 -> "RUNNING";
            case 0 -> "SHUTDOWN";
            case 1 << 29 -> "STOP";
            case 2 << 29 -> "TIDYING";
            default -> "TERMINATED";
        };
        System.out.printf("%-26s %s %s  %-10s workers=%d%n", when, bits.substring(0, 3), bits.substring(3), state, workerCount);
    }

    public static void main(String[] args) throws Exception {
        ctlField = ThreadPoolExecutor.class.getDeclaredField("ctl");
        ctlField.setAccessible(true);                      // --add-opens java.base/java.util.concurrent=ALL-UNNAMED

        ThreadPoolExecutor pool = new ThreadPoolExecutor(3, 3, 0, TimeUnit.SECONDS, new LinkedBlockingQueue<>());
        CountDownLatch release = new CountDownLatch(1);
        show("new pool", pool);
        for (int i = 0; i < 3; i++) pool.execute(() -> { try { release.await(); } catch (InterruptedException e) { } });
        show("after 3 tasks", pool);
        pool.shutdown();
        show("shutdown(), tasks running", pool);
        release.countDown();
        pool.awaitTermination(1, TimeUnit.SECONDS);
        show("terminated", pool);

        ThreadPoolExecutor other = new ThreadPoolExecutor(2, 2, 0, TimeUnit.SECONDS, new LinkedBlockingQueue<>());
        CountDownLatch never = new CountDownLatch(1);
        other.execute(() -> {
            long end = System.nanoTime() + 200_000_000;
            while (System.nanoTime() < end) { }             // ignores the interrupt for 200 ms
        });
        other.execute(() -> { try { never.await(); } catch (InterruptedException e) { } });
        Thread.sleep(50);
        other.shutdownNow();
        show("shutdownNow(), 1 busy", other);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED CtlPeek",
        },
        {
          type: "output",
          text: `new pool                   111 00000000000000000000000000000  RUNNING    workers=0
after 3 tasks              111 00000000000000000000000000011  RUNNING    workers=3
shutdown(), tasks running  000 00000000000000000000000000011  SHUTDOWN   workers=3
terminated                 011 00000000000000000000000000000  TERMINATED workers=0
shutdownNow(), 1 busy      001 00000000000000000000000000010  STOP       workers=2`,
        },
        {
          type: "list",
          items: [
            "**A new pool has no threads**: `RUNNING`, count 0. Three tasks created three workers, and the low bits counted them.",
            "**`shutdown()` changed only the top bits**, from `111` to `000`, while three workers were still running tasks. The count stayed 3 until each worker finished and exited.",
            "**`TERMINATED` (`011`) with 0 workers** after `awaitTermination` returned. The pool passed through `TIDYING` (`010`) on the way, for the moment it took to run the `terminated()` hook.",
            "**`shutdownNow()` went straight to `STOP`** (`001`), and the count was still 2 at that instant: one worker had been blocked in `await` and was interrupted, but hadn't finished exiting yet (in 2 of 10 runs it already had, and the count read 1). The other was in a busy loop that ignores interrupts, so it stays counted until it finishes on its own. A pool can't terminate while any worker is stuck in a task.",
          ],
        },
        {
          type: "heading",
          text: "The admission algorithm, from javap -c",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.concurrent.ThreadPoolExecutor   # execute(java.lang.Runnable), calls and branches only",
        },
        {
          type: "output",
          text: `      13: getfield      #7                  // Field ctl:Ljava/util/concurrent/atomic/AtomicInteger;
      16: invokevirtual #21                 // Method java/util/concurrent/atomic/AtomicInteger.get:()I
      21: invokestatic  #28                 // Method workerCountOf:(I)I
      25: getfield      #193                // Field corePoolSize:I
      28: if_icmpge     49
      33: iconst_1
      34: invokevirtual #251                // Method addWorker:(Ljava/lang/Runnable;Z)Z
      37: ifeq          41
      40: return
...
      50: invokestatic  #35                 // Method isRunning:(I)Z
      53: ifeq          117
      57: getfield      #44                 // Field workQueue:Ljava/util/concurrent/BlockingQueue;
      61: invokeinterface #356,  2          // InterfaceMethod java/util/concurrent/BlockingQueue.offer:(Ljava/lang/Object;)Z
      66: ifeq          117
...
      86: invokevirtual #359                // Method remove:(Ljava/lang/Runnable;)Z
      94: invokevirtual #362                // Method reject:(Ljava/lang/Runnable;)V
     101: invokestatic  #28                 // Method workerCountOf:(I)I
     104: ifne          114
     109: iconst_0
     110: invokevirtual #251                // Method addWorker:(Ljava/lang/Runnable;Z)Z
     119: iconst_0
     120: invokevirtual #251                // Method addWorker:(Ljava/lang/Runnable;Z)Z
     123: ifne          131
     128: invokevirtual #362                // Method reject:(Ljava/lang/Runnable;)V
     131: return`,
        },
        {
          type: "paragraph",
          text: "Written back as Java (my reconstruction from those branches, which matches the JDK source's structure):",
        },
        {
          type: "code",
          language: "java",
          code: `public void execute(Runnable command) {
    if (command == null) throw new NullPointerException();
    int c = ctl.get();
    if (workerCountOf(c) < corePoolSize) {            // 1. below core: a new thread, with this task first
        if (addWorker(command, true)) return;
        c = ctl.get();
    }
    if (isRunning(c) && workQueue.offer(command)) {    // 2. queue it; offer() never blocks
        int recheck = ctl.get();
        if (!isRunning(recheck) && remove(command))
            reject(command);                           //    shut down meanwhile: undo
        else if (workerCountOf(recheck) == 0)
            addWorker(null, false);                    //    no thread left to drain the queue
    }
    else if (!addWorker(command, false))               // 3. queue full: a thread above core
        reject(command);                               // 4. at maximum, or shut down
}`,
        },
        {
          type: "list",
          items: [
            "**`addWorker(task, true)`** checks the count against `corePoolSize`, `addWorker(task, false)` against `maximumPoolSize`. Inside, it increments the count in `ctl` with a CAS loop (retrying if another thread changed `ctl`), then creates the `Worker`, adds it to `workers` under `mainLock`, and starts its thread. The task passed in becomes the worker's `firstTask`: it runs immediately, without going through the queue.",
            "**`offer`, never `put`**: the pool never blocks the submitting thread on a full queue. A full bounded queue makes `offer` return `false`, which is the only way to reach step 3. An unbounded queue's `offer` always succeeds, so steps 3 and 4 are unreachable.",
            "**The recheck after queueing** handles two races: the pool shut down between the state check and the `offer` (then the task is removed and rejected), and the last worker died meanwhile (possible with `allowCoreThreadTimeOut` or `corePoolSize = 0`), so a worker with no first task is started to drain the queue.",
          ],
        },
        {
          type: "heading",
          text: "Worker, runWorker and getTask",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p 'java.util.concurrent.ThreadPoolExecutor$Worker'",
        },
        {
          type: "output",
          text: `final class java.util.concurrent.ThreadPoolExecutor$Worker extends java.util.concurrent.locks.AbstractQueuedSynchronizer implements java.lang.Runnable {
  private static final long serialVersionUID;
  final java.lang.Thread thread;
  java.lang.Runnable firstTask;
  volatile long completedTasks;
  final java.util.concurrent.ThreadPoolExecutor this$0;
  java.util.concurrent.ThreadPoolExecutor$Worker(java.util.concurrent.ThreadPoolExecutor, java.lang.Runnable);
  public void run();
  protected boolean isHeldExclusively();
  protected boolean tryAcquire(int);
  protected boolean tryRelease(int);
  public void lock();
  public boolean tryLock();
  public void unlock();
  public boolean isLocked();
  void interruptIfStarted();
}`,
        },
        {
          type: "list",
          items: [
            "**A `Worker` is its thread's `Runnable`** (the `ThreadFactory` is given the worker, and `Worker.run()` calls the pool's `runWorker(this)`), and it's also **a lock**: a minimal non-reentrant mutex built on `AbstractQueuedSynchronizer`, the framework from ReentrantLock, ReadWriteLock, StampedLock and AQS. `tryAcquire` is a single CAS of the AQS state from 0 to 1.",
            "**The lock means \"busy\".** `runWorker` locks the worker around each task. `shutdown()` calls `interruptIdleWorkers`, which interrupts only workers whose `tryLock()` succeeds, so idle workers waiting in the queue are woken up to exit, and busy ones aren't interrupted in the middle of a task. `getActiveCount()` counts locked workers. It's non-reentrant on purpose: a task calling `setCorePoolSize` (which interrupts idle workers) must not be able to \"re-acquire\" its own worker and interrupt itself.",
            "**`runWorker`** is the loop: `while (task != null || (task = getTask()) != null)`, lock, call `beforeExecute`, run the task, call `afterExecute` (with the exception, if any), count it in `completedTasks`, unlock. When `getTask()` returns `null`, the loop ends and `processWorkerExit` removes the worker, adds its count to `completedTaskCount`, and replaces it if it died from an exception or if the pool is now below its minimum.",
            "**`getTask`** is where threads wait, and where they decide to die. If `allowCoreThreadTimeOut` is set **or the current worker count is above `corePoolSize`**, it calls `workQueue.poll(keepAliveTime)`; otherwise `workQueue.take()`. A `poll` that times out returns `null`, after a CAS decrements the count, and the worker exits.",
          ],
        },
        {
          type: "paragraph",
          text: "That last rule has a consequence I wanted to see: a thread isn't \"core\" or \"extra\". It depends on the count at the moment the thread asks for work. A pool with core 1, max 3 and keep-alive 3 s, after a burst that started 3 threads:",
        },
        {
          type: "code",
          language: "java",
          title: "WhoSurvives.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class WhoSurvives {
    public static void main(String[] args) throws Exception {
        AtomicInteger n = new AtomicInteger();
        ThreadPoolExecutor pool = new ThreadPoolExecutor(1, 3, 3, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1),
                r -> new Thread(r, "fare-" + n.incrementAndGet()));
        CountDownLatch release = new CountDownLatch(1);
        for (int i = 0; i < 4; i++) pool.execute(() -> { try { release.await(); } catch (InterruptedException e) { } });
        release.countDown();
        System.out.println("pid " + ProcessHandle.current().pid() + ", 3 threads now idle");
        Thread.sleep(6_000);
        System.out.println("poolSize after keepAlive " + pool.getPoolSize());
        Thread.sleep(3_000);
        pool.shutdown();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java WhoSurvives &
jcmd WhoSurvives Thread.print      # at 1.5 s
jcmd WhoSurvives Thread.print      # at 7 s`,
        },
        {
          type: "output",
          text: `"fare-1" #20 [1081033] prio=5 os_prio=0 cpu=0.28ms elapsed=1.88s tid=0x000078ab981827f0 nid=1081033 waiting on condition  [0x000078ab6ea7c000]
   java.lang.Thread.State: TIMED_WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
\t- parking to wait for  <0x000000008df151e8> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
\tat java.util.concurrent.locks.LockSupport.parkNanos(java.base@21.0.13.0.3/LockSupport.java:269)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1797)
\tat java.util.concurrent.ArrayBlockingQueue.poll(java.base@21.0.13.0.3/ArrayBlockingQueue.java:435)
\tat java.util.concurrent.ThreadPoolExecutor.getTask(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1069)
\tat java.util.concurrent.ThreadPoolExecutor.runWorker(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1130)
...
(fare-2 and fare-3: the same, TIMED_WAITING in ArrayBlockingQueue.poll)

poolSize after keepAlive 1

"fare-1" #20 [1081033] prio=5 os_prio=0 cpu=0.73ms elapsed=7.76s tid=0x000078ab981827f0 nid=1081033 waiting on condition  [0x000078ab6ea7c000]
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
...
\tat java.util.concurrent.ArrayBlockingQueue.take(java.base@21.0.13.0.3/ArrayBlockingQueue.java:420)
\tat java.util.concurrent.ThreadPoolExecutor.getTask(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1070)
\tat java.util.concurrent.ThreadPoolExecutor.runWorker(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1130)`,
        },
        {
          type: "list",
          items: [
            "**At 1.5 s all three threads were in `poll` with a timeout** (`TIMED_WAITING`, line 1069 of `getTask`), including `fare-1`, the thread created for the first task. With 3 workers and a core size of 1, every worker is \"above core\".",
            "**After the keep-alive, one thread remained, now in `take()`** (`WAITING`, line 1070): once the count dropped to 1, the survivor's next `getTask` call chose `take`. In this run the survivor was `fare-1`; in an earlier run it was `fare-2`. Which thread survives is a race between their timeouts.",
            "So `corePoolSize` is a **target count**, not a set of special threads. That's also why a `ThreadLocal` on a \"core thread\" can't be relied on to live forever (ThreadLocal, InheritableThreadLocal and Leaks in Pools comes back to pool threads and their lifetimes).",
          ],
        },
      ],
    },
    {
      title: "The Admission Order, Measured",
      blocks: [
        {
          type: "paragraph",
          text: "A pool with core 2, max 4 and a queue of 2, given 7 tasks that all block until released; then the same pool with an unbounded queue:",
        },
        {
          type: "code",
          language: "java",
          title: "Admission.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class Admission {
    static void fill(String label, BlockingQueue<Runnable> queue, int tasks) throws InterruptedException {
        System.out.println(label);
        ThreadPoolExecutor pool = new ThreadPoolExecutor(2, 4, 30, TimeUnit.SECONDS, queue);
        CountDownLatch release = new CountDownLatch(1);
        ConcurrentLinkedQueue<Integer> startOrder = new ConcurrentLinkedQueue<>();
        for (int i = 1; i <= tasks; i++) {
            int id = i;
            try {
                pool.execute(() -> {
                    startOrder.add(id);
                    try { release.await(); } catch (InterruptedException e) { }
                });
                System.out.printf("  task %2d accepted: poolSize=%d queue=%d%n", i, pool.getPoolSize(), pool.getQueue().size());
            } catch (RejectedExecutionException e) {
                System.out.printf("  task %2d REJECTED: poolSize=%d queue=%d%n", i, pool.getPoolSize(), pool.getQueue().size());
            }
        }
        release.countDown();
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.SECONDS);
        System.out.println("  tasks started in the order " + startOrder);
    }

    public static void main(String[] args) throws InterruptedException {
        fill("core 2, max 4, ArrayBlockingQueue(2)", new ArrayBlockingQueue<>(2), 7);
        fill("core 2, max 4, unbounded LinkedBlockingQueue", new LinkedBlockingQueue<>(), 7);
    }
}`,
        },
        {
          type: "output",
          text: `core 2, max 4, ArrayBlockingQueue(2)
  task  1 accepted: poolSize=1 queue=0
  task  2 accepted: poolSize=2 queue=0
  task  3 accepted: poolSize=2 queue=1
  task  4 accepted: poolSize=2 queue=2
  task  5 accepted: poolSize=3 queue=2
  task  6 accepted: poolSize=4 queue=2
  task  7 REJECTED: poolSize=4 queue=2
  tasks started in the order [1, 2, 5, 6, 3, 4]
core 2, max 4, unbounded LinkedBlockingQueue
  task  1 accepted: poolSize=1 queue=0
  task  2 accepted: poolSize=2 queue=0
  task  3 accepted: poolSize=2 queue=1
  task  4 accepted: poolSize=2 queue=2
  task  5 accepted: poolSize=2 queue=3
  task  6 accepted: poolSize=2 queue=4
  task  7 accepted: poolSize=2 queue=5
  tasks started in the order [1, 2, 3, 4, 5, 6, 7]`,
        },
        {
          type: "list",
          items: [
            "**Threads, then queue, then threads, then rejection.** Tasks 1 and 2 created the core threads. Tasks 3 and 4 were queued, **not** given new threads, although the maximum was 4. Only when the queue was full did tasks 5 and 6 get extra threads. Task 7 found the queue full and the pool at its maximum, and was rejected with `RejectedExecutionException` (the default `AbortPolicy`).",
            "**Tasks 5 and 6 started before 3 and 4.** An extra thread runs the task that caused its creation (its `firstTask`), while 3 and 4 wait in the queue until a thread is free. A bounded pool under pressure is not FIFO. In 8 runs, the start order was `[1, 2, 5, 6, 3, 4]` five times and `[1, 2, 5, 6, 4, 3]` three times (3 and 4 are taken by two threads at once, so their recording order is a race).",
            "**With the unbounded queue, `maximumPoolSize = 4` did nothing.** The pool stayed at 2 threads and every other task was queued, and they started in submission order (in 1 run of 10, 4 started just before 3, the same two-threads-take-at-once race). This is `newFixedThreadPool` with a misleadingly large maximum, and the reason a common \"fix\" for a slow fixed pool, raising the maximum, changes nothing: only the core size or a bounded queue does.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Why the JDK grows in this order",
          text: "Queueing before adding threads keeps the pool at its core size for normal load, and uses extra threads only for bursts the queue can't absorb. If you want the opposite (grow to max first, then queue), the usual trick is a queue whose `offer` returns `false` while the pool is below its maximum, as Tomcat's `TaskQueue` does. A `SynchronousQueue` gets close: every task needs a free thread, and none ever waits.",
        },
      ],
    },
    {
      title: "Choosing a Queue",
      blocks: [
        {
          type: "paragraph",
          text: "`ArrayBlockingQueue` and `LinkedBlockingQueue` behave like the first and second halves of `Admission`. The other two need their own test:",
        },
        {
          type: "code",
          language: "java",
          title: "QueueChoices.java",
          code: `import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class QueueChoices {
    record Dispatch(String rider, int priority, ConcurrentLinkedQueue<String> log) implements Runnable, Comparable<Dispatch> {
        public void run() {
            log.add(rider);
            try { Thread.sleep(20); } catch (InterruptedException e) { }
        }
        public int compareTo(Dispatch o) { return Integer.compare(o.priority, priority); }   // higher first
    }

    public static void main(String[] args) throws Exception {
        // SynchronousQueue: no capacity; a task is handed to an idle thread or a new thread is made
        ThreadPoolExecutor direct = new ThreadPoolExecutor(0, 3, 60, TimeUnit.SECONDS, new SynchronousQueue<>());
        CountDownLatch release = new CountDownLatch(1);
        for (int i = 1; i <= 4; i++) {
            try {
                direct.execute(() -> { try { release.await(); } catch (InterruptedException e) { } });
                System.out.println("SynchronousQueue: task " + i + " -> poolSize " + direct.getPoolSize() + ", queue " + direct.getQueue().size());
            } catch (java.util.concurrent.RejectedExecutionException e) {
                System.out.println("SynchronousQueue: task " + i + " rejected (3 threads busy, nowhere to wait)");
            }
        }
        release.countDown();
        Thread.sleep(50);
        direct.execute(() -> { });
        System.out.println("SynchronousQueue: after release, a new task reuses an idle thread: poolSize " + direct.getPoolSize());
        direct.shutdown();

        // PriorityBlockingQueue: one worker, queued tasks run by priority, not arrival
        ThreadPoolExecutor prio = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new PriorityBlockingQueue<>());
        ConcurrentLinkedQueue<String> log = new ConcurrentLinkedQueue<>();
        prio.execute(new Dispatch("first-in (runs at once)", 0, log));
        prio.execute(new Dispatch("Ravi, standard", 1, log));
        prio.execute(new Dispatch("Asha, premium", 5, log));
        prio.execute(new Dispatch("Imran, standard", 1, log));
        prio.execute(new Dispatch("Meera, ambulance", 9, log));
        prio.shutdown();
        prio.awaitTermination(1, TimeUnit.SECONDS);
        System.out.println("PriorityBlockingQueue order: " + log);

        ThreadPoolExecutor prio2 = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new PriorityBlockingQueue<>());
        prio2.submit(new Dispatch("a", 1, log));          // runs at once, never queued
        try {
            prio2.submit(new Dispatch("b", 2, log));      // queued: submit wrapped it in a FutureTask
        } catch (ClassCastException e) {
            System.out.println("submit() into a PriorityBlockingQueue: " + e.getMessage());
        }
        prio2.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `SynchronousQueue: task 1 -> poolSize 1, queue 0
SynchronousQueue: task 2 -> poolSize 2, queue 0
SynchronousQueue: task 3 -> poolSize 3, queue 0
SynchronousQueue: task 4 rejected (3 threads busy, nowhere to wait)
SynchronousQueue: after release, a new task reuses an idle thread: poolSize 3
PriorityBlockingQueue order: [first-in (runs at once), Meera, ambulance, Asha, premium, Imran, standard, Ravi, standard]
submit() into a PriorityBlockingQueue: class java.util.concurrent.FutureTask cannot be cast to class java.lang.Comparable (java.util.concurrent.FutureTask and java.lang.Comparable are in module java.base of loader 'bootstrap')`,
        },
        {
          type: "list",
          items: [
            "**`SynchronousQueue` holds nothing.** Its `offer` succeeds only if a thread is already waiting in `poll`/`take`. With no idle thread, every task created a new one, and the fourth, with all 3 busy, was rejected immediately. After the tasks finished, the idle threads were waiting in `poll`, so a new task was handed over without creating a thread. This is `newCachedThreadPool`'s design, with a sane maximum instead of `Integer.MAX_VALUE`.",
            "**`PriorityBlockingQueue` reorders queued tasks.** The first task ran immediately (it was the new thread's `firstTask`, never queued); the rest ran by priority: ambulance 9, premium 5, then the two standard rides. The two priority-1 tasks ran **Imran before Ravi**, the opposite of their arrival: a heap isn't stable, so equal priorities come out in no particular order. Add a sequence number to the comparison if ties must be FIFO.",
            "**`submit` breaks priority queues.** `submit` wraps the task in a `FutureTask`, which isn't `Comparable`, and `PriorityBlockingQueue.offer` throws `ClassCastException` while sifting it into the heap. It only fails when the task is queued, not when it goes straight to a new thread (task `a` was fine), so it can pass light testing. Use `execute`, or override `newTaskFor` to return a comparable `FutureTask` subclass.",
            "**`LinkedBlockingQueue` vs `ArrayBlockingQueue`**, both bounded: `LinkedBlockingQueue` has two locks (producers and consumers don't contend) but allocates a node per task; `ArrayBlockingQueue` preallocates its array and uses one lock. The Performance section measures the difference; BlockingQueue Implementations goes inside both.",
          ],
        },
      ],
    },
    {
      title: "Rejection Policies",
      blocks: [
        {
          type: "paragraph",
          text: "One thread, a queue of one, five 100 ms tasks submitted at once: tasks 1 and 2 fit, 3, 4 and 5 don't (at least, not at the moment they arrive). The same test for each built-in policy:",
        },
        {
          type: "code",
          language: "java",
          title: "RejectionPolicies.java",
          code: `import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class RejectionPolicies {
    static void trial(RejectedExecutionHandler handler) throws InterruptedException {
        // one thread, room for one waiting task: tasks 3, 4 and 5 don't fit
        ThreadPoolExecutor pool = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1), handler);
        ConcurrentLinkedQueue<String> ran = new ConcurrentLinkedQueue<>();
        StringBuilder events = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            int id = i;
            long t = System.nanoTime();
            try {
                pool.execute(() -> {
                    ran.add("t" + id + "@" + (Thread.currentThread().getName().equals("main") ? "main" : "pool"));
                    try { Thread.sleep(100); } catch (InterruptedException e) { }
                });
                long ms = (System.nanoTime() - t) / 1_000_000;
                if (ms > 50) events.append(" t").append(id).append(":execute() blocked ").append(ms).append("ms");
            } catch (RejectedExecutionException e) {
                events.append(" t").append(id).append(":threw");
            }
        }
        pool.shutdown();
        pool.awaitTermination(2, TimeUnit.SECONDS);
        System.out.printf("%-20s ran %-46s%s%n", handler.getClass().getSimpleName(), List.copyOf(ran), events);
    }

    public static void main(String[] args) throws Exception {
        trial(new ThreadPoolExecutor.AbortPolicy());
        trial(new ThreadPoolExecutor.CallerRunsPolicy());
        trial(new ThreadPoolExecutor.DiscardPolicy());
        trial(new ThreadPoolExecutor.DiscardOldestPolicy());
    }
}`,
        },
        {
          type: "output",
          text: `AbortPolicy          ran [t1@pool, t2@pool]                             t3:threw t4:threw t5:threw
CallerRunsPolicy     ran [t3@main, t1@pool, t2@pool, t4@main, t5@pool]  t3:execute() blocked 100ms t4:execute() blocked 100ms
DiscardPolicy        ran [t1@pool, t2@pool]
DiscardOldestPolicy  ran [t1@pool, t5@pool]                            `,
        },
        {
          type: "list",
          items: [
            "**`AbortPolicy`** threw `RejectedExecutionException` for 3, 4 and 5. Nothing is lost silently: the caller knows and can respond (an HTTP 503, a retry with backoff, a message left on a durable queue).",
            "**`CallerRunsPolicy`** ran task 3 on `main`, the submitting thread, and `execute()` took 100 ms to return: the producer was **slowed down to the pool's pace**. While `main` was busy with task 3, the pool finished task 1 and took task 2 from the queue, so task 4 fit... or didn't: across runs, `main` ran either 3 and 4 or 3 and 5, depending on timing. Every task ran. That self-regulation is backpressure, and it's why `CallerRunsPolicy` is the usual choice for internal pools fed by a thread that can afford to slow down.",
            "**`DiscardPolicy`** dropped 3, 4 and 5 with no trace at all: no exception, no log. Without a counter, that's data loss you can't see.",
            "**`DiscardOldestPolicy`** made room by throwing away the oldest queued task each time: task 3 displaced 2, 4 displaced 3, 5 displaced 4. Only 1 (running) and 5 (the latest) ran. Useful when only the newest value matters (a driver's latest location), dangerous anywhere else, and particularly wrong with a `PriorityBlockingQueue`, where the \"oldest\" is the highest-priority task.",
            "**`CallerRunsPolicy` has two traps**: if the caller is a request thread, the request now takes as long as the task; and if the caller is a thread that must never block (a Netty event loop, a Kafka consumer with a poll-interval limit), running a slow task on it causes worse problems than rejection. After `shutdown()`, it silently discards the task.",
          ],
        },
      ],
    },
    {
      title: "Thread Lifecycle: Keep-Alive, Prestarting and ThreadFactory",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "PoolLifecycle.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class PoolLifecycle {
    static ThreadFactory named(String prefix) {
        AtomicInteger n = new AtomicInteger();
        return r -> {
            Thread t = new Thread(r, prefix + "-" + n.incrementAndGet());
            t.setDaemon(false);
            t.setUncaughtExceptionHandler((th, e) -> System.out.println("  [" + th.getName() + "] died: " + e));
            return t;
        };
    }

    public static void main(String[] args) throws Exception {
        // 1. a new core thread per task until corePoolSize, even if the existing ones are idle
        ThreadPoolExecutor p = new ThreadPoolExecutor(3, 3, 0, TimeUnit.SECONDS, new LinkedBlockingQueue<>(), named("receipt"));
        for (int i = 0; i < 3; i++) {
            p.execute(() -> { });
            Thread.sleep(50);                                       // the previous thread is idle by now
            System.out.println("instant task " + (i + 1) + " -> poolSize " + p.getPoolSize());
        }
        p.shutdown();

        // 2. prestartAllCoreThreads: pay the thread start-up cost before the first request
        ThreadPoolExecutor warm = new ThreadPoolExecutor(4, 4, 0, TimeUnit.SECONDS, new LinkedBlockingQueue<>(), named("warm"));
        System.out.println("prestarted " + warm.prestartAllCoreThreads() + " threads, poolSize " + warm.getPoolSize());
        warm.shutdown();

        // 3. keepAliveTime: threads above core die after 200 ms idle; with allowCoreThreadTimeOut, all of them
        for (boolean coreTimeout : new boolean[] {false, true}) {
            ThreadPoolExecutor burst = new ThreadPoolExecutor(2, 6, 200, TimeUnit.MILLISECONDS,
                    new ArrayBlockingQueue<>(1), named("burst"));
            burst.allowCoreThreadTimeOut(coreTimeout);
            CountDownLatch release = new CountDownLatch(1);
            for (int i = 0; i < 7; i++) burst.execute(() -> { try { release.await(); } catch (InterruptedException e) { } });
            System.out.print("allowCoreThreadTimeOut=" + coreTimeout + ": busy " + burst.getPoolSize());
            release.countDown();
            Thread.sleep(100);
            System.out.print(", +100 ms " + burst.getPoolSize());
            Thread.sleep(400);
            System.out.println(", +500 ms " + burst.getPoolSize() + " (largest " + burst.getLargestPoolSize() + ")");
            burst.shutdown();
        }

        // 4. a named thread with an uncaught-exception handler
        ThreadPoolExecutor payouts = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new LinkedBlockingQueue<>(), named("payout"));
        payouts.execute(() -> { throw new IllegalStateException("bank API returned 503"); });
        Thread.sleep(50);
        payouts.execute(() -> System.out.println("  next task runs on " + Thread.currentThread().getName()));
        payouts.shutdown();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java PoolLifecycle 2>&1",
        },
        {
          type: "output",
          text: `instant task 1 -> poolSize 1
instant task 2 -> poolSize 2
instant task 3 -> poolSize 3
prestarted 4 threads, poolSize 4
allowCoreThreadTimeOut=false: busy 6, +100 ms 6, +500 ms 2 (largest 6)
allowCoreThreadTimeOut=true: busy 6, +100 ms 6, +500 ms 0 (largest 6)
  [payout-1] died: java.lang.IllegalStateException: bank API returned 503
  next task runs on payout-2`,
        },
        {
          type: "list",
          items: [
            "**Below the core size, every task creates a thread, even when the existing threads are idle.** Each task finished instantly and the previous thread was idle for 50 ms, yet the pool grew to 3. Step 1 of `execute` compares the count with `corePoolSize` and never asks whether a thread is free.",
            "**`prestartAllCoreThreads()`** starts all core threads up front, so the first requests after a deploy don't pay for thread creation. It's useful for latency-sensitive pools and harmless otherwise.",
            "**Keep-alive shrinks the pool back to core.** A burst of 7 tasks grew the pool to 6 threads. 100 ms after the work ended they were all still there; by 500 ms (keep-alive 200 ms) the pool was back to 2. With `allowCoreThreadTimeOut(true)`, it went to **0**: right for pools that are idle most of the day, at the cost of creating threads again on the next burst. `getLargestPoolSize()` remembers the peak (6), which is a useful metric.",
            "**A `ThreadFactory` names threads and installs a handler.** `payout-1` in a thread dump or log is self-explanatory; `pool-7-thread-1` isn't. The uncaught-exception handler set by the factory caught the `execute`d task's exception, and the pool replaced the dead thread with `payout-2`, as the previous lesson showed. The factory is also where to set the daemon flag deliberately.",
          ],
        },
      ],
    },
    {
      title: "Sizing a Pool",
      blocks: [
        {
          type: "paragraph",
          text: "The two classic formulas, from *Java Concurrency in Practice*: for CPU-bound work, **N + 1** threads (N = cores; the extra one covers an occasional page fault or pause); for work that waits, **N × (1 + W/C)**, where W/C is the ratio of waiting time to computing time. I tested both on this 8-core machine: 256 tasks of about 4.7 ms of pure computation, then 400 tasks of the same computation plus a 20 ms wait (standing in for a remote call), so W/C is about 4.3 and the formula suggests 8 × 5.3 ≈ 42 threads.",
        },
        {
          type: "code",
          language: "java",
          title: "PoolSizing.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class PoolSizing {
    static volatile long sink;

    static long compute(long iterations) {                  // CPU work: a fare hash, about 5 ms per 4M iterations
        long h = 1125899906842597L;
        for (long i = 0; i < iterations; i++) h = 31 * h + (i ^ (h >>> 7));
        return h;
    }

    static long run(int threads, int tasks, long iterations, long waitMs) throws Exception {
        long best = Long.MAX_VALUE;
        for (int rep = 0; rep < 3; rep++) {
            ExecutorService pool = Executors.newFixedThreadPool(threads);
            long t = System.nanoTime();
            List<Future<?>> fs = new ArrayList<>();
            for (int i = 0; i < tasks; i++) {
                fs.add(pool.submit(() -> {
                    sink = compute(iterations);
                    if (waitMs > 0) {
                        try { Thread.sleep(waitMs); } catch (InterruptedException e) { }   // the remote call
                    }
                }));
            }
            for (Future<?> f : fs) f.get();
            best = Math.min(best, System.nanoTime() - t);
            pool.shutdown();
        }
        return best / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        int n = Runtime.getRuntime().availableProcessors();
        long t = System.nanoTime();
        compute(4_000_000);
        for (int i = 0; i < 20; i++) compute(4_000_000);     // warm-up
        t = System.nanoTime();
        compute(4_000_000);
        System.out.println("N = " + n + " cores; one compute(4M) = " + (System.nanoTime() - t) / 1_000_000.0 + " ms");

        System.out.println("CPU-bound: 256 tasks of compute(4M)");
        for (int threads : new int[] {1, 2, 4, n, n + 1, 2 * n, 4 * n}) {
            System.out.printf("  %3d threads  %5d ms%n", threads, run(threads, 256, 4_000_000, 0));
        }
        System.out.println("IO-bound: 400 tasks of compute(4M) + 20 ms wait");
        for (int threads : new int[] {n, 2 * n, 4 * n, 6 * n, 10 * n, 20 * n}) {
            System.out.printf("  %3d threads  %5d ms%n", threads, run(threads, 400, 4_000_000, 20));
        }
    }
}`,
        },
        {
          type: "output",
          text: `N = 8 cores; one compute(4M) = 4.747415 ms
CPU-bound: 256 tasks of compute(4M)
    1 threads   1130 ms
    2 threads    561 ms
    4 threads    271 ms
    8 threads    169 ms
    9 threads    169 ms
   16 threads    169 ms
   32 threads    172 ms
IO-bound: 400 tasks of compute(4M) + 20 ms wait
    8 threads   1242 ms
   16 threads    635 ms
   32 threads    342 ms
   48 threads    295 ms
   80 threads    293 ms
  160 threads    309 ms`,
        },
        {
          type: "list",
          items: [
            "**CPU-bound work stops scaling at the core count.** 1, 2 and 4 threads scaled almost perfectly (1,130, 561, 271 ms); 8 threads reached 169 ms, and 9, 16 and 32 threads were no faster, because there were no more cores to run them. Extra threads only add context switches and memory (32 threads was slightly slower). The ideal for 8 threads would be 141 ms; the gap is the other benchmarks running on this machine.",
            "**IO-bound work needs many more threads than cores.** With 8 threads, each thread spent most of its time waiting, and the run took 1,242 ms. Throughput improved almost linearly up to 32 threads and levelled out between 48 and 80 (about 293 ms), close to the formula's 42. The floor is the CPU work itself: 400 × 4.7 ms over 8 cores is about 235 ms. Doubling again to 160 threads was slightly worse.",
            "**The formula is a starting point, not an answer.** W/C changes with the downstream's latency: if the remote call slows from 20 ms to 200 ms, the \"right\" size grows tenfold, and so do the threads blocked on it. That's why pools for remote calls also need timeouts and limits on the downstream, and why virtual threads (which make W cheap) change this calculation for blocking work.",
            "**Measure the real W/C** with a profiler or from metrics (time in the task versus CPU time per task), and verify with a load test watching throughput, latency and CPU together.",
            "I ran the experiment three times. The first two runs agreed within a few percent; in the third, other benchmarks were using the CPUs heavily and the 8-to-32-thread CPU-bound results ranged from 238 to 365 ms with no clear pattern. Single machine, `System.nanoTime`, best of 3, not JMH.",
          ],
        },
        {
          type: "table",
          headers: ["Workload", "Starting size", "Then check"],
          rows: [
            ["Pure computation (pricing, encoding, compression)", "N or N + 1", "CPU near 100%, no queue growth"],
            ["Blocking I/O (HTTP, JDBC)", "N × (1 + W/C), capped by the downstream's limit (connection pool size)", "Downstream saturation, latency at p99"],
            ["Mixed", "Separate pools for CPU and I/O stages", "Each pool's queue and active count"],
            ["Calls into a pool of connections", "No more threads than connections", "Threads waiting for a connection"],
          ],
        },
      ],
    },
    {
      title: "Monitoring and Hooks",
      blocks: [
        {
          type: "paragraph",
          text: "A pool exposes its state through getters, and three protected hooks (`beforeExecute`, `afterExecute`, `terminated`) let a subclass measure every task. Here they count failures, including those hidden inside `submit`'s futures, measure run time, and count rejections:",
        },
        {
          type: "code",
          language: "java",
          title: "MonitoredPool.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.LongAdder;

public class MonitoredPool extends ThreadPoolExecutor {
    private final ThreadLocal<Long> startedAt = new ThreadLocal<>();
    final LongAdder failed = new LongAdder();
    final LongAdder totalRunNanos = new LongAdder();
    final LongAdder rejected = new LongAdder();

    MonitoredPool(int threads, int queueCapacity) {
        super(threads, threads, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(queueCapacity));
        setRejectedExecutionHandler((r, pool) -> {
            rejected.increment();                                    // count it, then fail loudly
            throw new java.util.concurrent.RejectedExecutionException("dispatch pool full");
        });
    }

    @Override protected void beforeExecute(Thread t, Runnable r) {
        startedAt.set(System.nanoTime());
    }

    @Override protected void afterExecute(Runnable r, Throwable t) {
        totalRunNanos.add(System.nanoTime() - startedAt.get());
        if (t == null && r instanceof Future<?> f && f.isDone()) {     // submit(): the exception is inside the Future
            try {
                f.get();
            } catch (CancellationException e) {
                t = e;
            } catch (ExecutionException e) {
                t = e.getCause();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        if (t != null) {
            failed.increment();
            System.out.println("  afterExecute saw: " + t);
        }
    }

    public static void main(String[] args) throws Exception {
        MonitoredPool pool = new MonitoredPool(4, 20);
        ScheduledExecutorService reporter = Executors.newSingleThreadScheduledExecutor();
        reporter.scheduleAtFixedRate(() -> System.out.printf(
                "  [metrics] active=%d queue=%d completed=%d failed=%d rejected=%d avgRun=%.1fms%n",
                pool.getActiveCount(), pool.getQueue().size(), pool.getCompletedTaskCount(),
                pool.failed.sum(), pool.rejected.sum(),
                pool.getCompletedTaskCount() == 0 ? 0.0 : pool.totalRunNanos.sum() / 1e6 / pool.getCompletedTaskCount()),
                0, 100, TimeUnit.MILLISECONDS);

        for (int i = 1; i <= 30; i++) {
            int id = i;
            try {
                pool.submit(() -> {
                    try { Thread.sleep(40); } catch (InterruptedException e) { }
                    if (id % 10 == 0) throw new IllegalStateException("trip " + id + ": driver not found");
                });
            } catch (java.util.concurrent.RejectedExecutionException e) {
                // the caller would return 503 here
            }
        }
        Thread.sleep(450);
        reporter.shutdown();
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.SECONDS);
    }
}`,
        },
        {
          type: "output",
          text: `  [metrics] active=1 queue=0 completed=0 failed=0 rejected=0 avgRun=0.0ms
  [metrics] active=4 queue=12 completed=8 failed=0 rejected=6 avgRun=40.2ms
  afterExecute saw: java.lang.IllegalStateException: trip 10: driver not found
  [metrics] active=4 queue=4 completed=16 failed=1 rejected=6 avgRun=41.2ms
  afterExecute saw: java.lang.IllegalStateException: trip 20: driver not found
  [metrics] active=0 queue=0 completed=24 failed=2 rejected=6 avgRun=40.9ms
  [metrics] active=0 queue=0 completed=24 failed=2 rejected=6 avgRun=40.9ms`,
        },
        {
          type: "list",
          items: [
            "**30 tasks into 4 threads and a queue of 20**: 24 were accepted and 6 rejected (tasks 25 to 30, so trip 30's failure never happened). The rejection handler counted them before throwing, which is the minimum any custom handler should do.",
            "**`afterExecute` saw the exceptions from `submit`.** For a submitted task, the `Throwable` parameter is `null`, because `FutureTask` caught the exception; the hook has to check whether the `Runnable` is a `Future` and call `get()` on it (it's already done, so `get()` doesn't block). That code is straight from the `ThreadPoolExecutor` javadoc.",
            "**`beforeExecute` and `afterExecute` run on the worker thread**, so a `ThreadLocal` carries the start time between them. The same hooks are where tracing context and MDC logging fields are set and cleared.",
            "**The useful metrics**: `getQueue().size()` (the leading indicator of overload), `getActiveCount()` against `getMaximumPoolSize()` (saturation), `getCompletedTaskCount()` (throughput, which counts failures too), `getLargestPoolSize()`, plus failures and rejections from hooks and handlers. `getActiveCount()` and `getCompletedTaskCount()` take `mainLock` and walk the workers, so poll them every few seconds, not per task.",
            "**The first sample said `active=1 queue=0`**, taken while the tasks were still being submitted. All the getters are snapshots that can be out of date by the time they're returned; they're for dashboards, not for making decisions in code.",
          ],
        },
      ],
    },
    {
      title: "ForkJoinPool and the Common Pool",
      blocks: [
        {
          type: "paragraph",
          text: "`ForkJoinPool` is the other executor in the JDK. Each worker has its own double-ended queue: it pushes and pops its own subtasks at one end, and idle workers **steal** from the other end of someone else's deque. That suits divide-and-conquer work (split a task, run the halves, join them) and many small tasks, without one shared queue that every thread contends on. One instance, the **common pool**, is created by the JVM and shared by every parallel stream and every `CompletableFuture.*Async` call that doesn't name an executor:",
        },
        {
          type: "code",
          language: "java",
          title: "CommonPoolShared.java",
          code: `import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ForkJoinPool;
import java.util.stream.IntStream;

public class CommonPoolShared {
    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    static long timeQuickJob() {
        long t = System.nanoTime();
        IntStream.range(0, 64).parallel().forEach(i -> sleep(10));     // 64 x 10 ms, should take ~80 ms
        return (System.nanoTime() - t) / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        ForkJoinPool common = ForkJoinPool.commonPool();
        System.out.println("cores " + Runtime.getRuntime().availableProcessors() + ", common pool parallelism " + common.getParallelism());

        Set<String> threads = ConcurrentHashMap.newKeySet();
        IntStream.range(0, 10_000).parallel().forEach(i -> threads.add(Thread.currentThread().getName()));
        System.out.println("a parallel stream ran on " + threads.size() + " threads, including main: " + threads.contains("main"));

        timeQuickJob();
        System.out.println("quick parallel job alone:              " + timeQuickJob() + " ms");

        CompletableFuture<Void> slow = CompletableFuture.runAsync(() ->     // someone else's blocking work
                IntStream.range(0, 7).parallel().forEach(i -> sleep(2_000)));
        Thread.sleep(100);
        System.out.println("quick job while 7 workers are blocked: " + timeQuickJob() + " ms");
        slow.join();
    }
}`,
        },
        {
          type: "output",
          text: `cores 8, common pool parallelism 7
a parallel stream ran on 8 threads, including main: true
quick parallel job alone:              85 ms
quick job while 7 workers are blocked: 648 ms`,
        },
        {
          type: "list",
          items: [
            "**The common pool's parallelism is cores minus one** (7 here), because the thread that starts a parallel stream also works on it: the stream ran on 8 threads, `main` included. It can be changed with `-Djava.util.concurrent.ForkJoinPool.common.parallelism`.",
            "**It's shared by everything in the JVM.** A quick parallel job (64 tasks of 10 ms) took 85 ms alone. While another piece of code ran blocking work on the common pool, the same job took **648 ms**: all 7 workers were asleep, so only `main` worked through the 64 tasks one by one (64 × 10 ms). Blocking calls in parallel streams or default-executor `CompletableFuture`s slow down unrelated code in the same JVM.",
            "**Rules I follow**: parallel streams only for CPU-bound work on large data; never blocking I/O in the common pool; `CompletableFuture.supplyAsync(task, myExecutor)` with an explicit pool for anything that waits. CompletableFuture in Depth: Threads, Composition and Errors goes further.",
            "`ForkJoinPool` workers are daemon threads, and it has no rejection policy in the `ThreadPoolExecutor` sense: its queues are unbounded (they grow until a limit of millions of tasks per queue, then throw `RejectedExecutionException`).",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing task 5 in `Admission` (core 2, max 4, `ArrayBlockingQueue(2)`, two busy threads and two queued tasks):",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Read `ctl`.** `main` calls `execute(task5)`; `ctl.get()` returns `111` + `...010`: running, 2 workers.",
            "**Step 1 fails.** `workerCountOf(c)` is 2, which is not less than `corePoolSize` (2). No lock was taken.",
            "**Step 2 fails.** The pool is running, so `workQueue.offer(task5)` is called. `ArrayBlockingQueue` takes its lock, sees `count == items.length` (2 of 2) and returns `false` immediately.",
            "**Step 3: `addWorker(task5, false)`.** In its retry loop, it re-reads `ctl`, checks the state is still `RUNNING` and that the count (2) is below `maximumPoolSize` (4), then `compareAndSet`s `ctl` from 2 workers to 3. If another thread had changed `ctl` first, the CAS would fail and the loop would re-check.",
            "**Create and register the worker.** `new Worker(task5)` sets the AQS state to -1 (so it can't be interrupted before it starts) and asks the `ThreadFactory` for a thread. Under `mainLock`, the worker is added to `workers` and `largestPoolSize` becomes 3. The lock is released and `thread.start()` is called.",
            "**`execute` returns.** `main` prints `poolSize=3 queue=2`.",
            "**The new thread runs `runWorker`.** It unlocks the worker (allowing interrupts), takes `firstTask` (task 5) and runs it **without touching the queue**, which is why task 5 starts before tasks 3 and 4.",
            "**Task 5 finishes** (after the latch is released): `afterExecute`, `completedTasks++`, unlock. `getTask()` now finds 4 workers, more than `corePoolSize`, so it calls `workQueue.poll(30, SECONDS)` and gets task 3 or 4, or eventually times out and lets the worker exit.",
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
          title: "TpeTour.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class TpeTour {
    public static void main(String[] args) throws Exception {
        // 1. a named ThreadFactory
        AtomicInteger seq = new AtomicInteger();
        ThreadFactory factory = r -> {
            Thread t = new Thread(r, "dispatch-" + seq.incrementAndGet());
            t.setDaemon(false);
            return t;
        };

        // 2. every constructor parameter, explicitly
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                4,                                          // corePoolSize
                8,                                          // maximumPoolSize (used only when the queue is full)
                30, TimeUnit.SECONDS,                       // keepAliveTime for threads above core
                new ArrayBlockingQueue<>(100),              // bounded workQueue
                factory,                                    // ThreadFactory
                new ThreadPoolExecutor.CallerRunsPolicy()); // RejectedExecutionHandler

        // 3. lifecycle knobs
        pool.allowCoreThreadTimeOut(false);
        System.out.println("prestarted " + pool.prestartAllCoreThreads());

        // 4. work and monitoring
        for (int i = 0; i < 10; i++) pool.execute(() -> { try { Thread.sleep(20); } catch (InterruptedException e) { } });
        System.out.println("pool=" + pool.getPoolSize() + " active=" + pool.getActiveCount()
                + " queued=" + pool.getQueue().size() + " remaining=" + pool.getQueue().remainingCapacity());

        // 5. resize at run time: raise max before core, lower core before max
        pool.setMaximumPoolSize(16);
        pool.setCorePoolSize(12);
        System.out.println("core=" + pool.getCorePoolSize() + " max=" + pool.getMaximumPoolSize());

        // 6. toString summarises everything
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.SECONDS);
        System.out.println(pool);
    }
}`,
        },
        {
          type: "output",
          text: `prestarted 4
pool=4 active=0 queued=10 remaining=90
core=12 max=16
java.util.concurrent.ThreadPoolExecutor@14ae5a5[Terminated, pool size = 0, active threads = 0, queued tasks = 0, completed tasks = 10]`,
        },
        {
          type: "paragraph",
          text: "The second line is a race and changes between runs: in six runs I saw `active=0 queued=10` four times, `active=0 queued=9` once and `active=1 queued=9` once. With prestarted threads, all 10 tasks are offered to the queue (the pool is already at its core size), and the parked threads take a moment to wake up. `toString()` gives a one-line summary of a pool's state, handy in logs.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Blocking submission with a time limit",
        },
        {
          type: "paragraph",
          text: "Sometimes neither rejection nor running on the caller is right: an ingestion thread should wait a little for room, and give up if the wait is too long. A `Semaphore` around any executor does that, and caps queued plus running tasks:",
        },
        {
          type: "code",
          language: "java",
          title: "BlockingSubmit.java",
          code: `import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

public class BlockingSubmit {
    // At most 'limit' tasks queued or running; callers wait up to 'maxWaitMs' for a slot, then get rejected
    static final class BoundedExecutor implements Executor {
        private final ExecutorService delegate;
        private final Semaphore slots;
        private final long maxWaitMs;

        BoundedExecutor(ExecutorService delegate, int limit, long maxWaitMs) {
            this.delegate = delegate;
            this.slots = new Semaphore(limit);
            this.maxWaitMs = maxWaitMs;
        }

        @Override public void execute(Runnable task) {
            try {
                if (!slots.tryAcquire(maxWaitMs, TimeUnit.MILLISECONDS)) {
                    throw new RejectedExecutionException("no slot within " + maxWaitMs + " ms");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RejectedExecutionException("interrupted while waiting for a slot");
            }
            try {
                delegate.execute(() -> {
                    try { task.run(); } finally { slots.release(); }
                });
            } catch (RejectedExecutionException e) {
                slots.release();                                   // never leak a permit
                throw e;
            }
        }
    }

    public static void main(String[] args) throws Exception {
        ExecutorService workers = Executors.newFixedThreadPool(2);   // its own queue never holds more than 4
        BoundedExecutor dispatch = new BoundedExecutor(workers, 6, 60);
        long t0 = System.nanoTime();
        for (int i = 1; i <= 10; i++) {
            int id = i;
            long before = System.nanoTime();
            try {
                dispatch.execute(() -> { try { Thread.sleep(100); } catch (InterruptedException e) { } });
                System.out.printf("trip %2d accepted after waiting %3d ms (t=%d ms)%n", id,
                        (System.nanoTime() - before) / 1_000_000, (System.nanoTime() - t0) / 1_000_000);
            } catch (RejectedExecutionException e) {
                System.out.printf("trip %2d rejected: %s (t=%d ms)%n", id, e.getMessage(), (System.nanoTime() - t0) / 1_000_000);
            }
        }
        workers.close();
    }
}`,
        },
        {
          type: "output",
          text: `trip  1 accepted after waiting   6 ms (t=6 ms)
trip  2 accepted after waiting   0 ms (t=21 ms)
trip  3 accepted after waiting   0 ms (t=21 ms)
trip  4 accepted after waiting   0 ms (t=21 ms)
trip  5 accepted after waiting   0 ms (t=22 ms)
trip  6 accepted after waiting   0 ms (t=22 ms)
trip  7 rejected: no slot within 60 ms (t=89 ms)
trip  8 accepted after waiting  17 ms (t=106 ms)
trip  9 accepted after waiting  14 ms (t=121 ms)
trip 10 rejected: no slot within 60 ms (t=182 ms)`,
        },
        {
          type: "list",
          items: [
            "Six slots: 2 running plus 4 waiting. Trips 1 to 6 were accepted at once; trip 7 waited 60 ms, no task had finished yet, and it was rejected. Trips 8 and 9 got the slots freed when trips 1 and 2 finished (around 106 and 121 ms).",
            "The permit is released in a `finally` inside the wrapped task, and also when the delegate rejects the task, so a failure can never leak a permit. Leaking permits would shrink the pool's capacity forever.",
            "The delegate's own queue never holds more than 4 tasks here, so even though it's `newFixedThreadPool`'s unbounded queue, memory is bounded. Semaphore, Phaser and Exchanger looks at `Semaphore` itself.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Resizing a live pool",
        },
        {
          type: "paragraph",
          text: "Pools are often resized at run time from a config change, to absorb a known peak. The order of the calls matters:",
        },
        {
          type: "code",
          language: "java",
          title: "ResizeAtRuntime.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class ResizeAtRuntime {
    public static void main(String[] args) throws Exception {
        // a fixed pool built by hand, so it can be resized (Executors.newFixedThreadPool returns one too)
        ThreadPoolExecutor pool = new ThreadPoolExecutor(2, 2, 0, TimeUnit.SECONDS, new LinkedBlockingQueue<>());
        CountDownLatch release = new CountDownLatch(1);
        for (int i = 0; i < 10; i++) pool.execute(() -> { try { release.await(); } catch (InterruptedException e) { } });
        System.out.println("busy:  pool=" + pool.getPoolSize() + " queued=" + pool.getQueue().size());

        try {
            pool.setCorePoolSize(6);                       // core above max
        } catch (IllegalArgumentException e) {
            System.out.println("setCorePoolSize(6) with max 2: IllegalArgumentException");
        }
        try {
            pool.setMaximumPoolSize(6);
            System.out.println("setMaximumPoolSize(6): pool=" + pool.getPoolSize() + " (max alone never grows an unbounded-queue pool)");
            pool.setCorePoolSize(6);                       // starts new workers for the queued tasks at once
            Thread.sleep(50);
            System.out.println("setCorePoolSize(6):    pool=" + pool.getPoolSize() + " queued=" + pool.getQueue().size());
        } catch (IllegalArgumentException e) {
            System.out.println("unexpected: " + e);
        }

        release.countDown();
        Thread.sleep(50);
        pool.setCorePoolSize(2);                           // shrinks as idle workers are interrupted
        Thread.sleep(50);
        System.out.println("back to core 2: pool=" + pool.getPoolSize());
        pool.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `busy:  pool=2 queued=8
setCorePoolSize(6) with max 2: IllegalArgumentException
setMaximumPoolSize(6): pool=2 (max alone never grows an unbounded-queue pool)
setCorePoolSize(6):    pool=6 queued=4
back to core 2: pool=2`,
        },
        {
          type: "list",
          items: [
            "**Raise the maximum before the core, lower the core before the maximum.** Since Java 9, a core size above the maximum throws `IllegalArgumentException`.",
            "**Raising only the maximum changed nothing**, for the reason measured in `Admission`: with an unbounded queue, threads above core are never created.",
            "**Raising the core size started 4 new workers at once**, without waiting for new submissions: `setCorePoolSize` starts up to `min(delta, queue size)` workers when tasks are queued. They took 4 of the 8 queued tasks immediately.",
            "**Lowering the core size** interrupts idle workers, which then see the count above core and exit (keep-alive 0 here), so the pool went back to 2 within 50 ms.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which Configuration",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Configuration", "Avoid"],
          rows: [
            ["Internal async work fed by a thread that can slow down", "Fixed core = max, bounded `ArrayBlockingQueue`, `CallerRunsPolicy`", "Unbounded queue"],
            ["Request handling that should shed load", "Bounded queue, `AbortPolicy` (or a counting custom handler) mapped to HTTP 503/429", "`CallerRunsPolicy` on request threads"],
            ["Bursty, short, independent tasks", "Core small, max larger, small bounded queue or `SynchronousQueue`, keep-alive 30 to 60 s", "`newCachedThreadPool` with no maximum"],
            ["Rarely used pool", "`allowCoreThreadTimeOut(true)`", "Idle threads held for the whole day"],
            ["Latency-sensitive pool after deploy", "`prestartAllCoreThreads()`", "Paying thread creation on the first requests"],
            ["Tasks with priorities", "`PriorityBlockingQueue` with `execute` and a sequence number for ties", "`submit` into a priority queue"],
            ["Only the latest update matters", "Queue of 1 with `DiscardOldestPolicy`, or a coalescing map", "`DiscardOldestPolicy` for normal work"],
            ["Divide-and-conquer CPU work", "`ForkJoinPool` / parallel streams", "Blocking I/O in the common pool"],
            ["Many blocking calls on Java 21", "Virtual threads plus a `Semaphore` on the downstream", "Huge platform-thread pools"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Using newFixedThreadPool for unbounded input",
        },
        {
          type: "paragraph",
          text: "Its queue holds 2^31 - 1 tasks. Under sustained overload it never rejects, the queue grows on the heap, latency grows with it, and the process eventually dies with `OutOfMemoryError`. The production section below measures it at 64 MB: about 2 seconds.",
        },
        {
          type: "heading",
          text: "Raising maximumPoolSize on a pool with an unbounded queue",
        },
        {
          type: "paragraph",
          text: "It has no effect: threads above core are created only when `offer` fails, and an unbounded queue's `offer` never fails. Raise `corePoolSize`, or bound the queue.",
        },
        {
          type: "heading",
          text: "Expecting threads up to the maximum before queueing",
        },
        {
          type: "paragraph",
          text: "The pool queues first. With core 2, max 50 and a queue of 1,000, it runs on 2 threads until 1,000 tasks are waiting. If the goal is \"up to 50 threads, then queue\", set core to 50 (with `allowCoreThreadTimeOut` if idle threads should go away).",
        },
        {
          type: "heading",
          text: "Calling submit on a pool with a PriorityBlockingQueue",
        },
        {
          type: "paragraph",
          text: "`FutureTask` isn't `Comparable`, so the first task that has to be queued throws `ClassCastException`. Use `execute` with `Comparable` tasks.",
        },
        {
          type: "heading",
          text: "Silent DiscardPolicy",
        },
        {
          type: "paragraph",
          text: "Dropped tasks leave no trace. Wrap the policy in a handler that increments a counter and logs at a sampled rate, so a dashboard shows the loss.",
        },
        {
          type: "heading",
          text: "CallerRunsPolicy on a thread that mustn't block",
        },
        {
          type: "paragraph",
          text: "On an event-loop thread or a message consumer with a poll-interval deadline, running a slow task inline stalls everything that thread serves, or gets the consumer kicked out of its group. Use it only where the caller slowing down is the intended effect.",
        },
        {
          type: "heading",
          text: "Blocking work in the common pool",
        },
        {
          type: "paragraph",
          text: "`parallelStream().map(id -> httpClient.get(...))` or `supplyAsync(() -> jdbc...)` without an executor puts blocking calls on the 7 common-pool workers shared by the whole JVM. `CommonPoolShared` slowed an unrelated job from 85 ms to 648 ms.",
        },
        {
          type: "heading",
          text: "One pool for everything",
        },
        {
          type: "paragraph",
          text: "When payouts, notifications and report generation share a pool, a slow downstream for one of them fills the queue and every other kind of task waits behind it. Separate pools per dependency (the bulkhead pattern) keep failures contained; Timeouts, Fallbacks, Fan-out and Choosing Executors returns to this.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Construct `ThreadPoolExecutor` directly for production pools, with every parameter chosen: core, max, keep-alive, a **bounded** queue, a named `ThreadFactory`, and a deliberate rejection policy.",
            "Size the queue from a latency budget: worst-case wait ≈ queue capacity ÷ throughput. 2,000 tasks at 3,600 per second is about 560 ms, which is what the production section measured.",
            "Pick the rejection behaviour per pool: `CallerRunsPolicy` for backpressure, `AbortPolicy` mapped to an error response for load shedding, and always count rejections.",
            "Size CPU-bound pools near the core count and IO-bound pools from N × (1 + W/C), capped by the downstream's own limits, then load-test.",
            "Export queue size, active count, largest pool size, completed, failed and rejected counts, and task run and wait times; alert on queue size and rejections.",
            "Use `afterExecute` (with the `Future` check) or task wrappers so failures are logged no matter how tasks are submitted.",
            "Keep separate pools for separate dependencies, and never block in the `ForkJoinPool` common pool.",
            "When resizing a live pool, raise the maximum before the core, and lower the core before the maximum.",
            "Treat `corePoolSize` as a count; don't rely on any particular thread living forever.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Beyond sizing, the queue and the pool type have a fixed cost per task. One producer submitting 1,000,000 trivial tasks (add to a `LongAdder`, count down a latch) to 4 workers, best of five:",
        },
        {
          type: "code",
          language: "java",
          title: "QueueThroughput.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.Supplier;

public class QueueThroughput {
    static final int TASKS = 1_000_000;

    static void measure(String label, Supplier<ExecutorService> factory) throws Exception {
        long best = Long.MAX_VALUE;
        for (int rep = 0; rep < 5; rep++) {
            ExecutorService pool = factory.get();
            LongAdder sum = new LongAdder();
            CountDownLatch done = new CountDownLatch(TASKS);
            long t = System.nanoTime();
            for (int i = 0; i < TASKS; i++) {
                int fare = i;
                pool.execute(() -> { sum.add(fare % 97); done.countDown(); });   // a tiny task
            }
            done.await();
            best = Math.min(best, System.nanoTime() - t);
            pool.shutdown();
            pool.awaitTermination(5, TimeUnit.SECONDS);
        }
        System.out.printf("%-50s %4d ms  %4d ns/task%n", label, best / 1_000_000, best / TASKS);
    }

    public static void main(String[] args) throws Exception {
        measure("TPE(4) LinkedBlockingQueue (newFixedThreadPool)",
                () -> new ThreadPoolExecutor(4, 4, 0, TimeUnit.SECONDS, new LinkedBlockingQueue<>()));
        measure("TPE(4) ArrayBlockingQueue(1024) + CallerRuns",
                () -> new ThreadPoolExecutor(4, 4, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1024),
                        new ThreadPoolExecutor.CallerRunsPolicy()));
        measure("TPE(0..4) SynchronousQueue + CallerRuns",
                () -> new ThreadPoolExecutor(0, 4, 60, TimeUnit.SECONDS, new SynchronousQueue<>(),
                        new ThreadPoolExecutor.CallerRunsPolicy()));
        measure("ForkJoinPool(4), async mode (newWorkStealingPool)",
                () -> new ForkJoinPool(4, ForkJoinPool.defaultForkJoinWorkerThreadFactory, null, true));
    }
}`,
        },
        {
          type: "output",
          text: `TPE(4) LinkedBlockingQueue (newFixedThreadPool)     187 ms   187 ns/task
TPE(4) ArrayBlockingQueue(1024) + CallerRuns        136 ms   136 ns/task
TPE(0..4) SynchronousQueue + CallerRuns             151 ms   151 ns/task
ForkJoinPool(4), async mode (newWorkStealingPool)    88 ms    88 ns/task`,
        },
        {
          type: "list",
          items: [
            "**The overhead per task is 100 to 200 nanoseconds** in every configuration: a queue hand-off, a lambda object, and waking a parked thread now and then. For tasks that take milliseconds it's irrelevant; for sub-microsecond tasks it dominates, and batching several items per task is the fix.",
            "**`ForkJoinPool` was consistently about twice as fast as `ThreadPoolExecutor` with a `LinkedBlockingQueue`** (63 to 102 ns against 140 to 207 ns per task over six runs). Its per-worker deques avoid the single shared queue lock, and it allocates no queue node per task.",
            "**`LinkedBlockingQueue` allocates a 24-byte node per task**; the bounded `ArrayBlockingQueue` was faster here, but part of that is `CallerRunsPolicy` making the producer run some tasks itself whenever the queue was full, which is cheaper than handing them off. The `SynchronousQueue` pool did the same. These are not pure queue comparisons; BlockingQueue Implementations looks at the queues on their own.",
            "Ranges across six runs on one shared 8-core machine: 140 to 207 ns (`LinkedBlockingQueue`), 88 to 188 ns (`ArrayBlockingQueue`), 117 to 227 ns (`SynchronousQueue`), 63 to 102 ns (`ForkJoinPool`). The load average went from 3.6 to 5.7 during these runs. `System.nanoTime`, not JMH: trust the ranking of `ForkJoinPool` and the order of magnitude, not the exact numbers.",
          ],
        },
      ],
    },
    {
      title: "Thread Pools in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing company's notification service consumed trip events and sent push notifications (\"Your driver Ravi is arriving\", promo messages) through a push gateway, using `Executors.newFixedThreadPool(4)`. The gateway handled about 4,000 pushes a second with 4 threads, comfortably above normal traffic. Then marketing launched an evening campaign that produced 20,000 notifications a second for a few minutes. The service's latency for \"driver arriving\" pushes went to minutes, the heap filled, GC ran back to back, and the pods died with `OutOfMemoryError`. Restarted pods consumed the same backlog and died again. I rebuilt it with a 64 MB heap, 1 ms per push, and 2 KB per notification:",
        },
        {
          type: "code",
          language: "java",
          title: "NotificationBlast.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

public class NotificationBlast {
    // One push notification: rider-facing text plus device tokens, about 2 KB on the heap
    record Push(long tripId, String rider, byte[] payload, long enqueuedAt) {}

    static final LongAdder SENT = new LongAdder();
    static final AtomicLong WORST_WAIT_MS = new AtomicLong();       // reset by every report
    static final LongAdder CALLER_RAN = new LongAdder();

    static void send(Push p) {
        long waitedMs = (System.nanoTime() - p.enqueuedAt()) / 1_000_000;
        WORST_WAIT_MS.accumulateAndGet(waitedMs, Math::max);
        try { Thread.sleep(1); } catch (InterruptedException e) { return; }   // the push gateway call
        SENT.increment();
    }

    public static void main(String[] args) throws Exception {
        boolean fixed = args.length > 0 && args[0].equals("fixed");
        int capacity = args.length > 1 ? Integer.parseInt(args[1]) : 2_000;
        ThreadPoolExecutor pool;
        if (fixed) {
            RejectedExecutionHandler callerRuns = new ThreadPoolExecutor.CallerRunsPolicy();
            pool = new ThreadPoolExecutor(4, 4, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(capacity),
                    (r, executor) -> { CALLER_RAN.increment(); callerRuns.rejectedExecution(r, executor); });
        } else {
            pool = (ThreadPoolExecutor) Executors.newFixedThreadPool(4);        // what shipped
        }

        ExecutorService reporter = Executors.newSingleThreadExecutor(r -> { Thread t = new Thread(r); t.setDaemon(true); return t; });
        LongAdder offered = new LongAdder();
        long t0 = System.nanoTime();
        reporter.execute(() -> {
            Runtime rt = Runtime.getRuntime();
            while (true) {
                try { Thread.sleep(500); } catch (InterruptedException e) { return; }
                long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
                System.out.printf("%5.1f s  offered %,7d  sent %,6d  queue %,7d  worst wait %,5d ms  heap %3d MB  caller-ran %,d%n",
                        (System.nanoTime() - t0) / 1e9, offered.sum(), SENT.sum(), pool.getQueue().size(),
                        WORST_WAIT_MS.getAndSet(0), usedMb, CALLER_RAN.sum());
            }
        });

        // A promo campaign: the trip-events consumer wants to push 20,000 notifications a second
        long id = 0;
        while (System.nanoTime() - t0 < 4_000_000_000L) {
            long batchStart = System.nanoTime();
            for (int i = 0; i < 200; i++) {
                Push p = new Push(id++, "rider-" + (id % 50_000), new byte[2_000], System.nanoTime());
                pool.execute(() -> send(p));
                offered.increment();
            }
            long spent = (System.nanoTime() - batchStart) / 1_000_000;
            if (spent < 10) Thread.sleep(10 - spent);
        }
        System.out.printf("producer stopped after %,d notifications; %,d still queued%n", offered.sum(), pool.getQueue().size());
        pool.shutdownNow();
        reporter.shutdownNow();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx64m -XX:+ExitOnOutOfMemoryError NotificationBlast",
        },
        {
          type: "output",
          text: `  0.5 s  offered   9,400  sent  1,750  queue   7,646  worst wait   412 ms  heap  23 MB  caller-ran 0
  1.0 s  offered  19,800  sent  3,641  queue  16,155  worst wait   847 ms  heap  38 MB  caller-ran 0
  1.5 s  offered  29,600  sent  5,419  queue  24,177  worst wait 1,255 ms  heap  57 MB  caller-ran 0
Terminating due to java.lang.OutOfMemoryError: Java heap space`,
        },
        {
          type: "paragraph",
          text: "A class histogram taken at 1.4 s (`jcmd NotificationBlast GC.class_histogram`, which runs a full GC first, so it counts only live objects) shows where the heap went:",
        },
        {
          type: "output",
          text: ` num     #instances         #bytes  class name (module)
-------------------------------------------------------
   1:         61566       53757216  [B (java.base@21.0.13.0.3)
   2:         26052        1042080  NotificationBlast$Push
   3:         35430         850320  java.lang.String (java.base@21.0.13.0.3)
   4:         26050         625200  java.util.concurrent.LinkedBlockingQueue$Node (java.base@21.0.13.0.3)
   5:          1071         429240  [Ljdk.internal.vm.FillerElement; (java.base@21.0.13.0.3)
   6:         26052         416832  NotificationBlast$$Lambda/0x000072385c002a18
...`,
        },
        {
          type: "list",
          items: [
            "**The pool sent about 3,600 pushes a second and accepted 20,000.** The difference, about 16,000 a second, went into the `LinkedBlockingQueue`. The pool never grew past 4 threads and never rejected anything: an unbounded queue makes both impossible.",
            "**The wait grew with the queue**: the worst time a notification spent queued went from 412 ms to 1,255 ms in a second. A \"driver arriving\" push stuck behind 24,000 promo messages is useless by the time it's sent. In the real incident, with a multi-gigabyte heap, the queue held millions of tasks and the waits were in minutes.",
            "**The histogram shows the queue owning the heap**: 26,050 `LinkedBlockingQueue$Node`s, each holding a lambda that captured a `Push` with its 2,000-byte payload. 53 MB of byte arrays in a 64 MB heap. Shortly after the 1.5 s report the JVM ran out (the whole process, start-up included, lasted 2.1 s in three runs). (`-XX:+ExitOnOutOfMemoryError` made it exit at once; without it, the non-daemon pool threads would have kept a half-dead JVM running.)",
          ],
        },
        {
          type: "paragraph",
          text: "The fix: a bounded `ArrayBlockingQueue` and `CallerRunsPolicy`, so when the queue is full the consuming thread sends the push itself and therefore consumes events more slowly. The backlog stays in the durable event log (Kafka, in the real system), not on the heap. The handler also counts how often that happens:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx64m -XX:+ExitOnOutOfMemoryError NotificationBlast fixed        # queue of 2,000
java -Xmx64m -XX:+ExitOnOutOfMemoryError NotificationBlast fixed 200    # queue of 200`,
        },
        {
          type: "output",
          text: `  0.5 s  offered   4,089  sent  2,090  queue   2,000  worst wait   414 ms  heap  12 MB  caller-ran 328
  1.0 s  offered   6,399  sent  4,399  queue   1,996  worst wait   560 ms  heap  17 MB  caller-ran 780
  1.5 s  offered   8,646  sent  6,642  queue   2,000  worst wait   560 ms  heap  22 MB  caller-ran 1,223
  2.0 s  offered  10,865  sent  8,864  queue   1,997  worst wait   564 ms  heap   8 MB  caller-ran 1,662
  2.5 s  offered  13,112  sent 11,112  queue   1,996  worst wait   564 ms  heap  13 MB  caller-ran 2,109
  3.0 s  offered  15,439  sent 13,436  queue   1,999  worst wait   558 ms  heap  18 MB  caller-ran 2,571
  3.5 s  offered  17,728  sent 15,727  queue   1,997  worst wait   547 ms  heap  23 MB  caller-ran 3,027
producer stopped after 20,000 notifications; 1,997 still queued

  0.5 s  offered   2,397  sent  2,197  queue     196  worst wait    57 ms  heap   9 MB  caller-ran 427
  1.0 s  offered   4,784  sent  4,584  queue     196  worst wait    56 ms  heap  14 MB  caller-ran 896
  1.5 s  offered   7,066  sent  6,862  queue     200  worst wait    56 ms  heap  18 MB  caller-ran 1,346
  2.0 s  offered   9,351  sent  9,149  queue     198  worst wait    56 ms  heap  23 MB  caller-ran 1,797
  2.5 s  offered  11,631  sent 11,427  queue     200  worst wait    62 ms  heap   6 MB  caller-ran 2,246
  3.0 s  offered  13,744  sent 13,544  queue     196  worst wait    69 ms  heap  10 MB  caller-ran 2,674
  3.5 s  offered  15,896  sent 15,692  queue     200  worst wait    68 ms  heap  15 MB  caller-ran 3,095
producer stopped after 18,000 notifications; 197 still queued`,
        },
        {
          type: "list",
          items: [
            "**The process survived, with a flat heap** (8 to 23 MB, the sawtooth of normal young collections) for the whole 4 seconds, where the old version died after about 2.",
            "**The producer slowed to the system's real capacity**: about 4,500 notifications a second instead of 20,000. That's 4 pool threads plus the caller, which ran about 900 pushes a second itself (`caller-ran`). The other 15,500 a second weren't lost; in the real system they stayed in Kafka as consumer lag, which is durable, visible and alertable.",
            "**The queue capacity set the latency**: with 2,000 slots the worst wait settled around 560 ms (2,000 ÷ about 3,600 per second through the pool); with 200 slots, around 60 ms, at the same throughput. A queue is a latency budget, and its size should come from how stale a notification is allowed to be.",
            "**The 1,997 tasks still queued at the end** were dropped by `shutdownNow()` in this demo. In production, their events must not be acknowledged to Kafka until they're sent, so a restart re-delivers them.",
          ],
        },
        {
          type: "paragraph",
          text: "What changed after the incident:",
        },
        {
          type: "list",
          items: [
            "No `Executors.newFixedThreadPool` or `newCachedThreadPool` in production code; a lint rule flags them, and pools are built through one factory that requires a queue bound and a rejection policy.",
            "Backpressure goes upstream: `CallerRunsPolicy` (or a blocking `Semaphore`) slows the consumer, and the backlog stays in the durable log, where consumer lag is monitored.",
            "Separate pools (and priorities) for transactional notifications (\"driver arriving\", OTPs) and bulk promos, so a campaign can never delay a ride notification.",
            "Metrics for queue size, worst queue wait, rejections and caller-runs counts, with alerts on queue size above half its capacity.",
            "Load tests at 5 times peak traffic before campaigns, watching heap after GC, not just throughput.",
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
              question: "What are the parameters of the ThreadPoolExecutor constructor?",
              answer:
                "`corePoolSize` (threads kept even when idle), `maximumPoolSize` (the upper limit, used only when the queue is full), `keepAliveTime` with its `TimeUnit` (how long threads above core wait for work before exiting), `workQueue` (where tasks wait), `ThreadFactory` (creates and names threads) and `RejectedExecutionHandler` (what to do with tasks that can't be admitted). The shorter constructors default the last two to `Executors.defaultThreadFactory()` and `AbortPolicy`.",
            },
            {
              question: "In what order does a ThreadPoolExecutor create threads, queue tasks and reject them?",
              answer:
                "Below `corePoolSize`, every task gets a new thread, even if others are idle. At core size, tasks are offered to the queue. Only if the queue is full are threads added up to `maximumPoolSize`. If the pool is at the maximum and the queue is full, the task is rejected. With core 2, max 4 and a queue of 2, my test created threads for tasks 1 and 2, queued 3 and 4, created threads for 5 and 6, and rejected 7.",
            },
            {
              question: "What are the four built-in rejection policies?",
              answer:
                "`AbortPolicy` (default) throws `RejectedExecutionException`. `CallerRunsPolicy` runs the task on the thread that called `execute`, which slows the producer down. `DiscardPolicy` silently drops it. `DiscardOldestPolicy` drops the oldest queued task and retries the new one. In my test with 5 tasks and room for 2, Abort threw three times, CallerRuns ran every task (two on `main`), Discard ran only 1 and 2, and DiscardOldest ran 1 and 5.",
            },
            {
              question: "Why is Executors.newFixedThreadPool considered dangerous in production?",
              answer:
                "Its `LinkedBlockingQueue` is unbounded (capacity `Integer.MAX_VALUE`), so it never rejects and never applies backpressure. If tasks arrive faster than they're processed, the queue grows until latency is huge and the heap runs out. My rebuild accepted 20,000 tasks a second, processed 3,600, and died with `OutOfMemoryError` in about 2 seconds with a 64 MB heap.",
            },
            {
              question: "How do you size a thread pool?",
              answer:
                "For CPU-bound work, about the number of cores (N or N + 1). For work that waits on I/O, N × (1 + W/C), where W/C is the ratio of waiting to computing time, capped by downstream limits such as the connection pool size. Then verify with a load test. In my measurement, CPU-bound tasks stopped improving at 8 threads on 8 cores; IO-bound tasks with W/C ≈ 4.3 were fastest at 48 to 80 threads, near the formula's 42.",
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
              question: "With corePoolSize 10, maximumPoolSize 100 and a LinkedBlockingQueue with no capacity, how many threads will the pool ever have?",
              answer:
                "Ten. Extra threads are created only when `workQueue.offer` fails, and an unbounded queue's `offer` always succeeds, so `maximumPoolSize` is never consulted. My `Admission` test with core 2, max 4 and an unbounded queue stayed at 2 threads with 5 tasks queued. To use more threads, raise the core size or bound the queue.",
            },
            {
              question: "What is the difference between SynchronousQueue, LinkedBlockingQueue and ArrayBlockingQueue as a pool's work queue?",
              answer:
                "`SynchronousQueue` has no capacity: a task goes straight to an idle thread or forces a new one, and is rejected at the maximum (`newCachedThreadPool`). `LinkedBlockingQueue` is unbounded by default (or bounded with a capacity), allocates a node per task, and has separate put and take locks. `ArrayBlockingQueue` is always bounded, preallocated, with one lock. Bounded queues are what make `maximumPoolSize` and rejection policies meaningful.",
            },
            {
              question: "What does allowCoreThreadTimeOut do, and when would you use it?",
              answer:
                "It applies `keepAliveTime` to all threads, not just those above the core size, so an idle pool shrinks to zero threads. It suits pools that are idle most of the time (a nightly job, an admin feature), saving threads and memory, at the cost of re-creating threads on the next burst. In my test a pool that grew to 6 shrank to 2 without it and to 0 with it.",
            },
            {
              question: "Why does CallerRunsPolicy provide backpressure, and what are its risks?",
              answer:
                "When the pool is saturated, the submitting thread runs the task itself, so it can't submit more until that task finishes: the producer is slowed to the pool's pace automatically. In my notification rebuild, the producer dropped from 20,000 to about 4,500 tasks a second and the heap stayed flat. Risks: the caller's latency becomes the task's latency, a caller that must not block (an event loop, a consumer with poll deadlines) stalls, and after shutdown the task is silently discarded.",
            },
            {
              question: "How can you find out about exceptions from tasks in a ThreadPoolExecutor without calling get()?",
              answer:
                "Override `afterExecute(Runnable r, Throwable t)`. For `execute`d tasks, `t` is the exception. For `submit`ted tasks, `t` is `null` because `FutureTask` caught it, so check `r instanceof Future<?> f && f.isDone()` and call `f.get()`, catching `ExecutionException` and `CancellationException`. My `MonitoredPool` counted both failures that way. Alternatives: a `ThreadFactory` with an uncaught-exception handler (only for `execute`), or wrapping each task.",
            },
            {
              question: "Why does submit() fail on a pool backed by a PriorityBlockingQueue?",
              answer:
                "`submit` wraps the task in a `FutureTask`, which doesn't implement `Comparable`, and `PriorityBlockingQueue` casts elements to `Comparable` to order them, throwing `ClassCastException`. It only fails when a task is actually queued, not when it goes straight to a new thread. Use `execute` with `Comparable` tasks, or override `newTaskFor` to return a comparable `FutureTask` subclass.",
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
              question: "What is the ctl field in ThreadPoolExecutor, and why does it pack two values into one int?",
              answer:
                "An `AtomicInteger` whose top 3 bits are the run state (`RUNNING` 111, `SHUTDOWN` 000, `STOP` 001, `TIDYING` 010, `TERMINATED` 011) and whose low 29 bits are the worker count (`COUNT_BITS = 29`, so at most 536,870,911 workers). Admission must check \"still running and below the limit\" and increment the count atomically; with both in one int, a single CAS does it without a lock. The states are ordered, so \"running\" is `c < SHUTDOWN`. I watched it go from `111...011` (running, 3 workers) to `000...011` after `shutdown()` and `011...000` when terminated.",
            },
            {
              question: "Why is ThreadPoolExecutor.Worker built on AbstractQueuedSynchronizer?",
              answer:
                "Each worker is a non-reentrant lock held while it runs a task. `shutdown()` and `setCorePoolSize` interrupt only idle workers, identified by a successful `tryLock()`, so tasks in progress aren't interrupted. `getActiveCount()` counts locked workers. It's non-reentrant so that a task calling a pool-control method can't acquire its own worker and interrupt itself, and it starts at state -1 so it can't be interrupted before its thread starts running.",
            },
            {
              question: "Is there such a thing as a core thread in ThreadPoolExecutor?",
              answer:
                "No, only a core count. In `getTask`, each worker checks whether the current count exceeds `corePoolSize` (or core timeout is allowed); if so it waits with `poll(keepAliveTime)`, otherwise with `take()`. Any worker can time out while the count is above core. My thread dumps showed all three threads of a core-1 pool in `poll`, and after the keep-alive the survivor was `fare-1` in one run and `fare-2` in another.",
            },
            {
              question: "Why can tasks run out of submission order in a bounded ThreadPoolExecutor?",
              answer:
                "A thread created above the core size (step 3 of admission) runs the task that triggered it as its `firstTask`, bypassing the queue, while earlier tasks are still queued. My test with core 2, max 4 and a queue of 2 started tasks in the order 1, 2, 5, 6, 3, 4. Also, multiple workers take from the queue concurrently, so even queued tasks start in a racy order. Use a single-threaded executor (or per-key serial executors) when order matters.",
            },
            {
              question: "Why shouldn't you run blocking I/O in parallel streams or default CompletableFuture async methods?",
              answer:
                "Both use `ForkJoinPool.commonPool()`, shared by the whole JVM with parallelism of cores minus one (7 here). Blocking calls occupy its workers, and every other user of the pool waits. In my test a parallel job that took 85 ms alone took 648 ms while seven other tasks were sleeping in the common pool, because only the calling thread was left to do the work. Pass an explicit executor sized for I/O.",
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
              question: "During a marketing campaign the notification service's heap grows steadily, GC pauses increase, and pods die with OutOfMemoryError. A heap dump shows millions of LinkedBlockingQueue$Node objects. What is happening and how do you fix it?",
              answer:
                "Tasks are arriving faster than the pool processes them and the pool's queue is unbounded (almost certainly `Executors.newFixedThreadPool`), so the backlog lives on the heap. My rebuild showed the pattern: 20,000 offered a second, 3,600 sent, the queue growing by 16,000 a second, 26,050 queue nodes holding 53 MB at 1.4 s, OOM about half a second later.\n\nImmediate fix: a bounded `ArrayBlockingQueue` sized from a latency budget, and `CallerRunsPolicy` (or a blocking semaphore) so the consumer slows down and the backlog stays in Kafka; with a 2,000-slot queue the heap stayed flat and the worst wait was 560 ms. Then add queue-size and rejection metrics, separate pools for transactional and bulk notifications, and a lint rule against the unbounded factories.",
            },
            {
              question: "A team raised maximumPoolSize from 10 to 200 to fix slow processing, but the thread count in the dump is still 10 and latency is unchanged. Why?",
              answer:
                "The pool has an unbounded (or very large) queue. Threads above `corePoolSize` are created only when `offer` to the queue fails, which never happens, so `maximumPoolSize` is ignored. My `Admission` and `ResizeAtRuntime` tests both showed it: raising the maximum alone left the pool at its core size.\n\nRaise `corePoolSize` instead (after raising the maximum, since core can't exceed max), or bound the queue. But first check what the tasks are waiting on: if they're blocked on a database with 10 connections, more threads only means more threads waiting for a connection.",
            },
            {
              question: "The pool's queue size is always zero, but requests fail with RejectedExecutionException. What would you check?",
              answer:
                "Whether the queue is a `SynchronousQueue` (as in a cached-pool configuration with a finite maximum): it holds nothing, so once every thread up to the maximum is busy, the next task is rejected immediately. My `QueueChoices` test rejected the fourth task with 3 busy threads and `queue 0`. Also check whether the pool has been shut down (rejections after `shutdown()` look the same).\n\nThe fix depends on intent: a small bounded queue to absorb bursts, a higher maximum if the downstream can take it, or treating rejections as load shedding and returning 503.",
            },
            {
              question: "After moving report generation to CompletableFuture.supplyAsync, unrelated API endpoints that use parallel streams became slow during report runs. What's the connection?",
              answer:
                "Both use the JVM-wide `ForkJoinPool.commonPool()`. The reports block (on JDBC or file I/O) inside common-pool workers, so the endpoints' parallel streams find no free workers and run mostly on the calling thread. My `CommonPoolShared` test showed a job going from 85 ms to 648 ms while 7 workers were blocked.\n\nFix: `supplyAsync(task, reportExecutor)` with a dedicated, bounded pool sized for I/O, and confirm with a thread dump that `ForkJoinPool.commonPool-worker-*` threads are no longer parked in JDBC calls.",
            },
            {
              question: "A pricing pool is configured with corePoolSize 64 on an 8-core server. CPU is at 100%, throughput is no better than with 8 threads, and p99 latency is worse. What would you recommend?",
              answer:
                "Pricing is CPU-bound, so more threads than cores can't add throughput; they only add context switches, cache misses and queueing inside the OS scheduler, which hurts tail latency. My CPU-bound test was flat from 8 to 32 threads (169 to 172 ms) and slower at 32 under load. I'd set the pool to about 8 (N or N + 1), bound its queue, and shed or apply backpressure beyond that.\n\nIf some pricing tasks block on remote calls, split the pipeline: a small CPU pool for computation and a separate pool (or virtual threads) for the I/O, each sized for its own work.",
            },
            {
              question: "Ops reports that the dispatch pool silently loses about 2% of tasks during peaks, with no errors in the logs. What could cause that, and how do you prove it?",
              answer:
                "A `DiscardPolicy` or `DiscardOldestPolicy` (or a custom handler that does nothing) on a saturated pool: both drop tasks without an exception or log, as my `RejectionPolicies` test showed. Other candidates: tasks `submit`ted whose failures are never read, or `shutdownNow()` during deploys dropping queued tasks.\n\nI'd check the pool's construction, then wrap the handler to count and log rejections and add `afterExecute` failure counting, and compare submitted, completed, failed and rejected counts during the next peak. The fix is to choose a policy that doesn't lose work silently (`CallerRunsPolicy` or `AbortPolicy` with a retry), and to make the counts visible.",
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
            "Build `new ThreadPoolExecutor(1, 3, 1, SECONDS, new ArrayBlockingQueue<>(1))`, submit 5 tasks that each sleep 500 ms, and print `getPoolSize()` and `getQueue().size()` after each submission.",
            "Replace the queue in step 1 with `new LinkedBlockingQueue<>()` and repeat.",
            "Run `CtlPeek` and add a line that prints `ctl` after calling `pool.prestartAllCoreThreads()` on a new pool.",
            "Create a pool with a `PriorityBlockingQueue` and one thread, submit two tasks with `submit`, then with `execute`.",
            "Run `RejectionPolicies` three times and compare the `CallerRunsPolicy` line.",
            "Run `CommonPoolShared` with `-Djava.util.concurrent.ForkJoinPool.common.parallelism=16`.",
            "Run `NotificationBlast` with `-Xmx32m`, then `NotificationBlast fixed 50` with `-Xmx32m`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints pool sizes 1, 1, 2, 3 with queue sizes 0, 1, 1, 1, then rejects the fifth task with `RejectedExecutionException`. Step 2 prints pool size 1 every time and queue sizes 0, 1, 2, 3, 4: no rejection, no growth. Step 3 shows `111` with a worker count of 3 (`...011`) for a 3-thread pool, before any task. Step 4 throws `ClassCastException` on the second `submit` (the first goes straight to the new thread), and works with `execute`. Step 5 shows `main` running task 3 every time, and task 4 or 5 depending on timing. Step 6 reports parallelism 16; in my run the quick job took 41 ms alone and 71 ms with 7 workers blocked, instead of 648 ms, because 9 workers were still free. Step 7 dies with `OutOfMemoryError` in under a second, (mine printed one report at 0.5 s, then `Terminating due to java.lang.OutOfMemoryError`), while the fixed version runs the full 4 seconds with a worst wait around 14 ms and a queue of under 50.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ADMISSION   1. workers < core     -> new thread (even if others idle)
            2. queue.offer() ok   -> wait in queue
            3. workers < max      -> new thread, runs THIS task first (jumps the queue)
            4. else               -> RejectedExecutionHandler
            unbounded queue: steps 3-4 never happen -> max ignored, heap grows

ctl         one AtomicInteger: top 3 bits runState, low 29 bits workerCount
            RUNNING 111 < SHUTDOWN 000 < STOP 001 < TIDYING 010 < TERMINATED 011
            one CAS checks state AND count -> no lock on the hot path

Worker      extends AQS (non-reentrant lock = busy), implements Runnable
getTask     count > core or coreTimeout -> poll(keepAlive), else take()
            "core" is a COUNT; any thread may be the one that times out

QUEUES      LBQ() unbounded | ABQ(n) bounded, 1 lock | SynchronousQueue 0, handoff
            PBQ priority, unbounded, submit() -> ClassCastException

REJECTION   Abort: throw | CallerRuns: backpressure | Discard: silent loss
            DiscardOldest: drops head of queue | custom: COUNT IT

SIZING      CPU-bound: N (+1)      I/O: N x (1 + W/C), capped by downstream
            measured: flat beyond 8 on 8 cores; I/O best at 48-80 (formula 42)

WATCH       queue size, active/max, largest, completed, failed, rejected,
            wait time; afterExecute + Future.get() catches submit() failures

COMMON POOL cores - 1 workers, shared by parallel streams + default async
            never block in it (85 ms job -> 648 ms)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `ThreadPoolExecutor` adds threads only up to its core size, then queues, then adds threads up to its maximum, then rejects. With an unbounded queue the last two steps never happen, which turns overload into memory growth and latency instead of a visible error.",
            "Production pools need a bounded queue sized from a latency budget, a rejection policy chosen on purpose (backpressure or load shedding, always counted), a named thread factory, a size that matches the work (cores for CPU, N × (1 + W/C) for I/O), and metrics on queue size, saturation, failures and rejections.",
            "Next comes ConcurrentHashMap Internals: the Concurrent Collections phase starts with the map most thread pools end up writing into, its bins, CAS insertions, synchronized bin locks, tree bins, and how it resizes while other threads keep reading and writing.",
          ],
        },
      ],
    },
  ],
};
