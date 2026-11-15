import type { Lesson } from "../types";

export const asyncTimeoutsAndExecutors: Lesson = {
  slug: "async-timeouts-and-executors",
  date: "2026-11-16",
  title: "Timeouts, Fallbacks, Fan-out and Choosing Executors",
  description:
    "Making a fan-out request survive slow dependencies on JDK 21: orTimeout and completeOnTimeout read in javap (orTimeout returns the same future, arms a Timeout task on CompletableFuture$Delayer and cancels it with a Canceller), the single daemon thread CompletableFutureDelayScheduler that the JVM creates lazily and that 10,001 pending timers share, a thread dump that caught it running my 1-second fallback while an unrelated 200 ms timeout fired at 1,103 to 1,106 ms, a timeout that fired at 150 ms while the surge call kept its only thread until 1,024 ms, a cancellation chain that interrupted the call at 152 ms, fallbacks and partial results for a fare/ETA/surge quote, deadline budgets that turned 314 to 441 ms late answers into replies inside 282 ms, 42 blocking calls that held the common pool's 7 threads for 600 ms while an unrelated parallel stream waited 601 ms, a shared pool where one slow dependency pushed fare p50 to 1,232 ms against 80 ms with bulkheads, retries with exponential backoff and jitter on delayedExecutor, the same 1,000 blocking calls taking 7.2 s on the common pool, 569 ms on 100 threads and 91 ms on virtual threads, hedged requests that cut ETA p99 from 401 ms to 95 to 100 ms for 5% more calls, about 600 ns and 233 bytes per armed timeout, and a ride quote API whose p50 went from about 5.2 s to 150 ms during a surge-service incident.",
  tags: ["Multithreading", "CompletableFuture", "Timeouts", "Executors"],
  sections: [
    {
      title: "What Timeouts, Fallbacks and Fan-out Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, CompletableFuture in Depth: Threads, Composition and Errors, took `CompletableFuture` apart: the callback stack, which thread runs each callback, how `allOf` and `thenCombine` are wired, and how exceptions get wrapped. It ended on the sharp edges: `cancel` that never reaches the running work, and an `allOf` that waits for the slowest input. This lesson is about what a real service does with all that when one of its dependencies gets slow.",
        },
        {
          type: "paragraph",
          text: "A **fan-out** is a request that calls several services at once and combines the answers. A ride quote is the classic one: the fare service, the ETA service and the surge service are called in parallel, and the rider sees one screen. A **timeout** is a limit on how long one call (or the whole request) may take. A **fallback** is what you return instead when a call fails or runs out of time: a default value, a cached value, or nothing, with the response marked as **degraded** (partial). Without these three, a fan-out is only as fast as its slowest dependency, and only as available as its least available one.",
        },
        {
          type: "paragraph",
          text: "Java 9 added timeouts to `CompletableFuture`: `orTimeout`, `completeOnTimeout` and `delayedExecutor`. They look simple, but they're driven by **one JVM-wide daemon thread**, they don't stop the work they time out, and the callbacks after a timeout run on that one shared thread. On top of them sit the decisions that matter in production: which executor runs each call (the common pool, a bounded pool per dependency, or virtual threads), how a request's total time budget is split across its calls, how to cancel work so threads are actually freed, and how to retry without blocking. I measured each one on JDK 21, ending with latency percentiles for a quote API before and after.",
        },
        {
          type: "paragraph",
          text: "One question stays open at the end: when a request fans out across three executors, how does the request's context (which rider, which trace ID) travel with the work? That's where the next lesson, ThreadLocal, InheritableThreadLocal and Leaks in Pools, starts.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Timeouts on blocking calls are as old as `Future.get(long, TimeUnit)` in Java 5. Timeouts on **asynchronous** results took longer. Java 8's `CompletableFuture` (2014) had no timeout at all: you either blocked in `get(timeout)` or built your own timer with a `ScheduledExecutorService`. Libraries filled the gap. Michael Nygard's book Release It! (2007) named the patterns (timeouts, bulkheads, circuit breakers); Netflix's Hystrix (2012) put them in a Java library, with a thread pool per dependency as the default bulkhead; Guava had `Futures.withTimeout`. Java 9 then added the timer to `CompletableFuture` itself.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`Future.get(timeout, unit)`, `ScheduledThreadPoolExecutor`", "A blocking wait with a limit; the scheduler that later drives `orTimeout`"],
            ["Java 7 (2011)", "`ForkJoinPool`", "The pool behind `commonPool()`"],
            ["Java 8 (2014)", "`CompletableFuture`, `ForkJoinPool.commonPool()`", "Async composition, but no timeouts; `*Async` defaults to the common pool"],
            ["2012 to 2018", "Hystrix: timeouts, fallbacks, thread-pool bulkheads (maintenance mode from 2018, succeeded by Resilience4j)", "The patterns this lesson builds by hand"],
            ["2013", "\"The Tail at Scale\" (Dean and Barroso) describes hedged requests", "The hedging example later in the lesson"],
            ["Java 9 (2017, JEP 266)", "`orTimeout`, `completeOnTimeout`, `delayedExecutor`, `failedFuture`, `completeAsync`", "Timeouts and delays inside `CompletableFuture`, driven by `Delayer`"],
            ["Java 12 (2019)", "`exceptionallyAsync`, `exceptionallyCompose`", "Fallbacks that run off the timer thread; async retries"],
            ["Java 21 (2023, JEP 444)", "Virtual threads final; `Executors.newVirtualThreadPerTaskExecutor()`", "A third executor choice for blocking calls"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A travel agent booking a trip for a customer standing at the counter. She phones the airline, the hotel and the car-rental desk at the same time.",
        },
        {
          type: "list",
          items: [
            "**The fan-out** is three phone calls placed at once. The customer waits for the slowest answer, so one slow desk sets the pace for everything.",
            "**A timeout** is a kitchen timer next to each phone. The single timer clerk who watches all the timers is the `CompletableFutureDelayScheduler` thread: when a timer rings, he walks over and tells the agent \"stop waiting for the hotel\". If the agent makes him also write up a long alternative while he's there, every other timer in the office rings late.",
            "**A timeout doesn't hang up the phone.** The agent stops waiting, but the hotel line is still busy, and the next customer who needs the hotel waits for a free line. Cancelling for real means actually putting the receiver down.",
            "**A fallback** is \"car hire not confirmed, we'll arrange it at the airport\": the trip is sold, marked partial. Without the flight, there's no trip at all: that call is essential.",
            "**A deadline budget** is the customer saying \"I have 5 minutes\". If the airline took 4, the hotel gets 1, not its usual 3.",
            "**Bulkheads** are separate phone lines per supplier. When the hotel line is jammed, the airline calls still get through.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real clerk can notice he's falling behind and ask for help. The timer thread can't. There is exactly one, it's shared by the whole JVM, and it never knows that the callback it's running is delaying everyone else's timers.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/async-timeouts-and-executors-fanout.svg",
          alt: "Title: One quote, three dependencies, three bulkheads. A quote request from SALT-LAKE to NEW-TOWN fans out to three lanes at once. The fare lane runs on fare-io, 8 threads with a queue of 16 and Abort policy, a call taking about 80 ms, guarded by orTimeout of 300 ms; it is essential, so no fare means no quote and failure becomes HTTP 503. The ETA lane runs on eta-io, 8 threads, queue 16, Abort, a call taking about 120 ms, guarded by orTimeout of 250 ms; exceptionally returns ETA unavailable and the quote is marked degraded. The surge lane runs on surge-io, 4 threads, queue 4, Abort, and during the incident a call takes 1,500 ms; it is guarded by orTimeout of 150 ms, exceptionally returns a quote without surge, and cancel(true) frees the thread. The three lanes join in allOf, then a Quote with paise, etaMin, surgePct and degraded, which never waits past 300 ms. A wide box below says every orTimeout is fired by one JVM-wide daemon thread, CompletableFutureDelayScheduler, which completes the future and then runs every non-async callback on it; a 1 second fallback in exceptionally made an unrelated 200 ms timeout fire at 1,103 to 1,106 ms, so callbacks after a timeout must be cheap or use the Async variants. At the bottom, measurements for 40 quotes a second for 1 second on an 8-core machine. Before, common pool and no timeouts: healthy p50 301 to 318 ms on 7 threads with 120 blocking calls; with surge at 1.5 seconds, p50 5,175 to 5,187 ms and p99 9,455 to 9,462 ms, because every quote waited for surge. After, bulkheads, budgets, fallbacks and cancel: healthy p50 120 to 122 ms and p99 120 to 130 ms; surge at 1.5 seconds p50 150 ms and p99 150 to 154 ms, with 40 of 40 quotes served and all marked degraded.",
          caption: "Each dependency gets its own threads, its own time limit and its own fallback, and one shared timer thread fires every timeout in the JVM.",
        },
        {
          type: "heading",
          text: "The timeout and delay methods",
        },
        {
          type: "table",
          headers: ["Method", "What it does", "Returns", "Caveat"],
          rows: [
            ["`orTimeout(t, unit)`", "If still pending after `t`, complete **this** future with `TimeoutException`", "`this` (same object)", "Doesn't stop the work producing the value"],
            ["`completeOnTimeout(v, t, unit)`", "If still pending after `t`, complete **this** future with `v`", "`this`", "Callers can't tell the value was a default"],
            ["`delayedExecutor(t, unit, ex)`", "An `Executor` that hands each task to `ex` after `t`", "`Executor`", "Without `ex`, the default async pool"],
            ["`completeAsync(supplier, ex)`", "Complete this future with `supplier.get()` run on `ex`", "`this`", "With a delayed executor: a value that arrives later"],
            ["`failedFuture(ex)`", "An already-failed future", "new future", "Useful when there's no budget left to even try"],
            ["`exceptionallyAsync(fn, ex)`", "Fallback that runs on `ex`, not on the completing thread", "new stage", "The fix for slow fallbacks after a timeout"],
            ["`get(t, unit)`", "Block the caller for at most `t`", "the value", "Throws `TimeoutException` but leaves the future pending"],
          ],
        },
        {
          type: "heading",
          text: "The executor choices",
        },
        {
          type: "table",
          headers: ["Executor", "Threads", "Good for", "Bad for"],
          rows: [
            ["`ForkJoinPool.commonPool()` (the default for `*Async`)", "cores minus 1, shared with parallel streams and every library", "Short CPU-bound callbacks", "Anything that blocks: 7 blocked threads stall the JVM's whole async default"],
            ["Bounded `ThreadPoolExecutor` per dependency (bulkhead)", "Fixed, with a bounded queue and a rejection policy", "Blocking I/O to one dependency; isolation", "Needs sizing per dependency"],
            ["Fixed pool sized to cores", "cores", "CPU-bound work you control", "Blocking I/O: throughput limited to `threads / latency`"],
            ["`newCachedThreadPool()`", "Unbounded", "Rarely the right answer", "A slow dependency makes it create a thread per waiting call"],
            ["`newVirtualThreadPerTaskExecutor()` (Java 21)", "One virtual thread per task, on cores-many carriers", "Large numbers of blocking calls", "No built-in limit: the downstream sees every call at once"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson listed `Delayer`, `Timeout`, `Canceller`, `DelayedExecutor` and `TaskSubmitter` among the 34 nested classes of `CompletableFuture`. Here they are opened up (`javap -p`, then `javap -c -p`, trimmed):",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p 'java.util.concurrent.CompletableFuture$Delayer' 'java.util.concurrent.CompletableFuture$Timeout' \\
         'java.util.concurrent.CompletableFuture$Canceller' 'java.util.concurrent.CompletableFuture$DelayedCompleter' \\
         'java.util.concurrent.CompletableFuture$DelayedExecutor' 'java.util.concurrent.CompletableFuture$TaskSubmitter'`,
        },
        {
          type: "output",
          text: `final class java.util.concurrent.CompletableFuture$Delayer {
  static final java.util.concurrent.ScheduledThreadPoolExecutor delayer;
  static java.util.concurrent.ScheduledFuture<?> delay(java.lang.Runnable, long, java.util.concurrent.TimeUnit);
  static {};
}
final class java.util.concurrent.CompletableFuture$Timeout implements java.lang.Runnable {
  final java.util.concurrent.CompletableFuture<?> f;
  public void run();
}
final class java.util.concurrent.CompletableFuture$Canceller implements java.util.function.BiConsumer<java.lang.Object, java.lang.Throwable> {
  final java.util.concurrent.Future<?> f;
  public void accept(java.lang.Object, java.lang.Throwable);
}
final class java.util.concurrent.CompletableFuture$DelayedCompleter<U> implements java.lang.Runnable {
  final java.util.concurrent.CompletableFuture<U> f;
  final U u;
  public void run();
}
final class java.util.concurrent.CompletableFuture$DelayedExecutor implements java.util.concurrent.Executor {
  final long delay;
  final java.util.concurrent.TimeUnit unit;
  final java.util.concurrent.Executor executor;
  public void execute(java.lang.Runnable);
}
final class java.util.concurrent.CompletableFuture$TaskSubmitter implements java.lang.Runnable {
  final java.util.concurrent.Executor executor;
  final java.lang.Runnable action;
  public void run();
}`,
        },
        {
          type: "paragraph",
          text: "And the code that ties them together:",
        },
        {
          type: "output",
          text: `Delayer static {}:
   0: new           #14   // class java/util/concurrent/ScheduledThreadPoolExecutor
   4: iconst_1             // corePoolSize = 1
   5: new           #19   // class CompletableFuture$Delayer$DaemonThreadFactory
  12: invokespecial #22   // Method ScheduledThreadPoolExecutor."<init>":(ILjava/util/concurrent/ThreadFactory;)V
  16: putstatic     #7    // Field delayer
  19: iconst_1
  20: invokevirtual #25   // Method ScheduledThreadPoolExecutor.setRemoveOnCancelPolicy:(Z)V

Delayer$DaemonThreadFactory.newThread(Runnable):
  10: iconst_1
  11: invokevirtual #12   // Method java/lang/Thread.setDaemon:(Z)V
  15: ldc           #16   // String CompletableFutureDelayScheduler
  17: invokevirtual #18   // Method java/lang/Thread.setName:(Ljava/lang/String;)V

public CompletableFuture<T> orTimeout(long, TimeUnit):
  13: getfield      #124  // Field result:Ljava/lang/Object;
  16: ifnonnull     44     // already done: do nothing
  20: new           #578  // class CompletableFuture$Canceller
  24: new           #580  // class CompletableFuture$Timeout
  34: invokestatic  #585  // Method CompletableFuture$Delayer.delay:(...)Ljava/util/concurrent/ScheduledFuture;
  37: invokespecial #591  // Method CompletableFuture$Canceller."<init>":(Ljava/util/concurrent/Future;)V
  40: invokevirtual #594  // Method whenComplete:(Ljava/util/function/BiConsumer;)Ljava/util/concurrent/CompletableFuture;
  44: aload_0
  45: areturn             // returns THIS future

Timeout.run():
   4: ifnull        32
  11: invokevirtual #13   // Method CompletableFuture.isDone:()Z
  14: ifne          32
  21: new           #19   // class java/util/concurrent/TimeoutException
  28: invokevirtual #22   // Method CompletableFuture.completeExceptionally:(Ljava/lang/Throwable;)Z

Canceller.accept(Object, Throwable):
  11: invokeinterface #13 // InterfaceMethod java/util/concurrent/Future.isDone:()Z
  23: iconst_0             // mayInterruptIfRunning = false
  24: invokeinterface #19 // InterfaceMethod java/util/concurrent/Future.cancel:(Z)Z

DelayedExecutor.execute(Runnable):
   0: new           #21   // class CompletableFuture$TaskSubmitter
  20: invokestatic  #26   // Method CompletableFuture$Delayer.delay:(...)

TaskSubmitter.run():
   8: invokeinterface #17 // InterfaceMethod java/util/concurrent/Executor.execute:(Ljava/lang/Runnable;)V`,
        },
        {
          type: "list",
          items: [
            "**`Delayer` is a `ScheduledThreadPoolExecutor` with one core thread**, made by a factory that names it `CompletableFutureDelayScheduler` and marks it a daemon. It lives in a static field, so it's created the first time any code in the JVM uses a timeout or a delayed executor, and it's shared by everything: your code, your HTTP client, your libraries.",
            "**`orTimeout` returns `this`.** It doesn't create a new stage. It schedules a `Timeout` task and attaches a `Canceller` with `whenComplete`. When the future completes for any reason, the `Canceller` calls `cancel(false)` on the scheduled task, and because `setRemoveOnCancelPolicy(true)` is on, the cancelled timer is removed from the scheduler's queue immediately instead of sitting there until its time comes.",
            "**`Timeout.run` is `if (!f.isDone()) f.completeExceptionally(new TimeoutException())`.** That call is made on the scheduler thread, and `completeExceptionally` runs `postComplete`, so every non-async callback attached to the future runs on the scheduler thread too.",
            "**`completeOnTimeout` is the same, with a `DelayedCompleter` (`f.complete(u)`) instead of a `Timeout`.**",
            "**`DelayedExecutor` only schedules a `TaskSubmitter`, whose `run` is one line: `executor.execute(action)`.** The scheduler thread never runs your delayed task, it only hands it to the executor you passed. That's why delayed retries are safe in a way that slow `exceptionally` callbacks aren't.",
          ],
        },
        {
          type: "heading",
          text: "Watching the Delayer with reflection",
        },
        {
          type: "paragraph",
          text: "Reading `Delayer.delayer` needs `--add-opens java.base/java.util.concurrent=ALL-UNNAMED`, since `java.base` doesn't open that package to application code:",
        },
        {
          type: "code",
          language: "java",
          title: "DelayerPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class DelayerPeek {
    static boolean schedulerThreadExists() {
        return Thread.getAllStackTraces().keySet().stream()
                .anyMatch(t -> t.getName().equals("CompletableFutureDelayScheduler"));
    }

    public static void main(String[] args) throws Exception {
        System.out.println("before any timeout: scheduler thread exists=" + schedulerThreadExists());

        CompletableFuture<String> fare = new CompletableFuture<>();
        CompletableFuture<String> same = fare.orTimeout(5, TimeUnit.SECONDS);
        System.out.println("orTimeout returned the same future: " + (same == fare));

        Class<?> delayerClass = Class.forName("java.util.concurrent.CompletableFuture$Delayer");
        Field f = delayerClass.getDeclaredField("delayer");
        f.setAccessible(true);
        ScheduledThreadPoolExecutor delayer = (ScheduledThreadPoolExecutor) f.get(null);
        System.out.println("Delayer.delayer: core=" + delayer.getCorePoolSize() + " max=" + delayer.getMaximumPoolSize()
                + " removeOnCancel=" + delayer.getRemoveOnCancelPolicy() + " poolSize=" + delayer.getPoolSize());
        Thread scheduler = Thread.getAllStackTraces().keySet().stream()
                .filter(t -> t.getName().equals("CompletableFutureDelayScheduler")).findFirst().orElseThrow();
        System.out.println("thread: " + scheduler.getName() + " daemon=" + scheduler.isDaemon() + " state=" + scheduler.getState());
        System.out.println("pending timers after 1 orTimeout: " + delayer.getQueue().size());

        CompletableFuture<?>[] many = new CompletableFuture<?>[10_000];
        for (int i = 0; i < many.length; i++) many[i] = new CompletableFuture<>().orTimeout(30, TimeUnit.SECONDS);
        System.out.println("pending timers after 10,001:      " + delayer.getQueue().size());
        for (int i = 0; i < 5_000; i++) many[i].complete(null);       // finished in time: Canceller cancels the timer
        System.out.println("after completing 5,000 normally:  " + delayer.getQueue().size());

        fare.complete("18000");
        System.out.println("after fare completes:             " + delayer.getQueue().size());

        CompletableFuture<String> eta = new CompletableFuture<>();
        long t0 = System.nanoTime();
        eta.orTimeout(200, TimeUnit.MILLISECONDS)
           .whenComplete((v, ex) -> System.out.printf("eta failed after %d ms with %s on %s%n",
                   (System.nanoTime() - t0) / 1_000_000, ex, Thread.currentThread().getName()));
        Thread.sleep(400);
        System.out.println("eta.complete(\\"7 min\\") now -> " + eta.complete("7 min"));
        System.out.println("completed tasks run by the scheduler: " + delayer.getCompletedTaskCount());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED DelayerPeek.java",
        },
        {
          type: "output",
          text: `before any timeout: scheduler thread exists=false
orTimeout returned the same future: true
Delayer.delayer: core=1 max=2147483647 removeOnCancel=true poolSize=1
thread: CompletableFutureDelayScheduler daemon=true state=TIMED_WAITING
pending timers after 1 orTimeout: 1
pending timers after 10,001:      10001
after completing 5,000 normally:  5001
after fare completes:             5000
eta failed after 201 ms with java.util.concurrent.TimeoutException on CompletableFutureDelayScheduler
eta.complete("7 min") now -> false
completed tasks run by the scheduler: 1`,
        },
        {
          type: "list",
          items: [
            "**The scheduler thread is created lazily.** Before the first `orTimeout` it didn't exist; after it, `poolSize=1`. A `ScheduledThreadPoolExecutor` reports `max=2147483647`, but it only ever runs its core threads, so in practice it's exactly one thread for the whole JVM.",
            "**10,001 pending timeouts share that one thread**, held in the scheduler's `DelayedWorkQueue`, a binary heap ordered by due time. Completing 5,000 futures on time removed exactly 5,000 timers: that's the `Canceller` plus `removeOnCancel`. Without it, the queue would keep every on-time call's timer until it expired.",
            "**A fired timeout completes the future on the scheduler thread**, and the `whenComplete` attached to it ran there too. Completing the future afterwards returned `false`: the first completion wins, and the timeout was first.",
            "**`completedTaskCount` was 1**: of 10,002 timers, only the one that actually fired ran as a task. Cancelled timers never run.",
          ],
        },
        {
          type: "heading",
          text: "The scheduler thread in a thread dump",
        },
        {
          type: "paragraph",
          text: "With one timeout pending, `jcmd <pid> Thread.print` shows the thread idle, waiting for the nearest due time:",
        },
        {
          type: "output",
          text: `"CompletableFutureDelayScheduler" #23 [918598] daemon prio=5 os_prio=0 cpu=0.24ms elapsed=0.29s tid=0x00007aca705466f0 nid=918598 waiting on condition  [0x00007aca48656000]
   java.lang.Thread.State: TIMED_WAITING (parking)
 at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
 - parking to wait for  <0x00000000ff66c2b8> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
 at java.util.concurrent.locks.LockSupport.parkNanos(java.base@21.0.13.0.3/LockSupport.java:269)
 at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1797)
 at java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(java.base@21.0.13.0.3/ScheduledThreadPoolExecutor.java:1182)
 at java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(java.base@21.0.13.0.3/ScheduledThreadPoolExecutor.java:899)
 at java.util.concurrent.ThreadPoolExecutor.getTask(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1070)
 at java.util.concurrent.ThreadPoolExecutor.runWorker(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1130)
 at java.util.concurrent.ThreadPoolExecutor$Worker.run(java.base@21.0.13.0.3/ThreadPoolExecutor.java:642)
 at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
 at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)`,
        },
        {
          type: "list",
          items: [
            "**`TIMED_WAITING (parking)` in `DelayedWorkQueue.take`** is the healthy state: the thread is in `awaitNanos` on the queue's condition, sleeping until the earliest timer is due (or until a new, earlier timer is added and signals it).",
            "**It's an ordinary `ThreadPoolExecutor` worker** (`runWorker`, `getTask`): `ScheduledThreadPoolExecutor` extends `ThreadPoolExecutor`, and its queue's `take` simply doesn't return a task before the task's delay has passed.",
            "If you search a production dump for this name and find the thread anywhere **other** than `DelayedWorkQueue.take`, it's running a callback, and every timeout in the JVM is waiting behind it. The next section is exactly that.",
          ],
        },
      ],
    },
    {
      title: "The Timer Thread Runs Your Callbacks",
      blocks: [
        {
          type: "paragraph",
          text: "Because `Timeout.run` completes the future on the scheduler thread, a plain `exceptionally`, `handle`, `thenApply` or `whenComplete` attached to a timed-out future runs **on that thread**. A fallback that does real work (a cache read, a database query, a call to a second service) blocks the only thread that fires timeouts. I made the fallback a 1-second read of a stale fare, and put an unrelated 200 ms timeout next to it:",
        },
        {
          type: "code",
          language: "java",
          title: "SlowFallbackStall.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class SlowFallbackStall {
    static long t0;
    static long ms() { return (System.nanoTime() - t0) / 1_000_000; }

    // A "fallback" that reads a stale fare from a slow cache: 1 second
    static String staleFare(Throwable ex) {
        sleep(1_000);
        return "stale fare 17500";
    }

    static void run(boolean async, ExecutorService fallbackPool) throws Exception {
        t0 = System.nanoTime();
        CompletableFuture<String> fare = new CompletableFuture<>();   // fare service never answers
        CompletableFuture<String> eta = new CompletableFuture<>();    // ETA service never answers either

        CompletableFuture<String> shownFare = async
                ? fare.orTimeout(100, TimeUnit.MILLISECONDS).exceptionallyAsync(SlowFallbackStall::staleFare, fallbackPool)
                : fare.orTimeout(100, TimeUnit.MILLISECONDS).exceptionally(SlowFallbackStall::staleFare);
        CompletableFuture<String> etaDone = eta.orTimeout(200, TimeUnit.MILLISECONDS)
                .whenComplete((v, ex) -> System.out.printf("  eta timeout (set for 200 ms) fired at %4d ms on %s%n",
                        ms(), Thread.currentThread().getName()));
        if (!async) {
            Thread.sleep(400);
            dump();
        }
        System.out.printf("  fare: %s at %d ms%n", shownFare.join(), ms());
        etaDone.exceptionally(ex -> null).join();
    }

    static void dump() throws Exception {
        Process p = new ProcessBuilder("jcmd", Long.toString(ProcessHandle.current().pid()), "Thread.print")
                .redirectErrorStream(true).start();
        boolean in = false;
        for (String line : p.inputReader().lines().toList()) {
            if (line.startsWith("\\"CompletableFutureDelayScheduler\\"")) in = true;
            else if (in && line.isBlank()) break;
            if (in) System.out.println("    " + line);
        }
        p.waitFor();
    }

    public static void main(String[] args) throws Exception {
        ExecutorService fallbackPool = Executors.newFixedThreadPool(2, r -> new Thread(r, "fallback-1"));
        System.out.println("exceptionally (runs on the timer thread):");
        run(false, fallbackPool);
        System.out.println("exceptionallyAsync(fn, fallbackPool):");
        run(true, fallbackPool);
        fallbackPool.shutdown();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `exceptionally (runs on the timer thread):
    "CompletableFutureDelayScheduler" #23 [337832] daemon prio=5 os_prio=0 cpu=0.59ms elapsed=0.65s tid=0x000073f568536340 nid=337832 waiting on condition  [0x000073f5506fd000]
       java.lang.Thread.State: TIMED_WAITING (sleeping)
        at java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
        at java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
        at SlowFallbackStall.sleep(SlowFallbackStall.java:57)
        at SlowFallbackStall.staleFare(SlowFallbackStall.java:12)
        at SlowFallbackStall$$Lambda/0x000073f4f4160428.apply(Unknown Source)
        at java.util.concurrent.CompletableFuture.uniExceptionally(java.base@21.0.13.0.3/CompletableFuture.java:990)
        at java.util.concurrent.CompletableFuture$UniExceptionally.tryFire(java.base@21.0.13.0.3/CompletableFuture.java:974)
        at java.util.concurrent.CompletableFuture.postComplete(java.base@21.0.13.0.3/CompletableFuture.java:510)
        at java.util.concurrent.CompletableFuture.completeExceptionally(java.base@21.0.13.0.3/CompletableFuture.java:2194)
        at java.util.concurrent.CompletableFuture$Timeout.run(java.base@21.0.13.0.3/CompletableFuture.java:2920)
        at java.util.concurrent.Executors$RunnableAdapter.call(java.base@21.0.13.0.3/Executors.java:572)
        at java.util.concurrent.FutureTask.run(java.base@21.0.13.0.3/FutureTask.java:317)
        at java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(java.base@21.0.13.0.3/ScheduledThreadPoolExecutor.java:304)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1144)
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(java.base@21.0.13.0.3/ThreadPoolExecutor.java:642)
        at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
        at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)
  fare: stale fare 17500 at 1105 ms
  eta timeout (set for 200 ms) fired at 1106 ms on CompletableFutureDelayScheduler
exceptionallyAsync(fn, fallbackPool):
  eta timeout (set for 200 ms) fired at  200 ms on CompletableFutureDelayScheduler
  fare: stale fare 17500 at 1100 ms`,
        },
        {
          type: "list",
          items: [
            "**The dump reads bottom to top as the whole mechanism**: the scheduler's worker runs a `ScheduledFutureTask`, which runs `Timeout.run`, which calls `completeExceptionally`, which runs `postComplete`, which fires the `UniExceptionally` node, which calls my `staleFare`, which is sleeping. The JVM's only timer thread is in `Thread.sleep` inside application code.",
            "**The unrelated 200 ms ETA timeout fired at 1,106 ms**, more than five times late, and 1,103 to 1,106 ms over three runs. It had nothing to do with the fare; it only shared the thread. In a service, that's every timeout of every request in the JVM, including ones set by libraries.",
            "**`exceptionallyAsync(fn, fallbackPool)` fixed it**: the ETA timeout fired at exactly 200 ms, and the fare fallback still finished at 1,100 ms, now on `fallback-1`. The timer thread only completed the future and handed the fallback to the pool.",
            "The same applies to `thenApply`, `thenCombine`, `whenComplete` or `handle` after a timeout. In the fan-out later in this lesson, `thenCombine` runs on the scheduler thread whenever a timeout is the last input to complete. That's fine for building a small `Quote` object; it isn't fine for anything that blocks or does heavy CPU work.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "One thread, whole JVM",
          text: "There's one `CompletableFutureDelayScheduler` per JVM, not per pool and not per library. Anything that blocks it (a slow fallback, a logging call to a stuck appender, a `join()` in a callback) delays every `orTimeout`, `completeOnTimeout` and `delayedExecutor` in the process. Callbacks attached directly to a future with a timeout must be trivial, or use the `*Async(fn, executor)` form.",
        },
      ],
    },
    {
      title: "A Timeout Doesn't Stop the Work",
      blocks: [
        {
          type: "paragraph",
          text: "`orTimeout` completes the **future**. The thread computing the value doesn't know: it carries on until the call returns, and then its `complete` loses the race and is ignored. If that thread belongs to a small pool, the pool is blocked for the full duration of a call nobody is waiting for. The surge service below takes 1,000 ms per call, and its pool has one thread:",
        },
        {
          type: "code",
          language: "java",
          title: "TimeoutKeepsRunning.java",
          code: `import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public class TimeoutKeepsRunning {
    static long t0;
    static long ms() { return (System.nanoTime() - t0) / 1_000_000; }
    static void log(String s) { System.out.printf("  %5d ms  %-31s %s%n", ms(), Thread.currentThread().getName(), s); }

    // The surge service is having a bad day: every call takes 1,000 ms
    static String surgeCall(String req) throws InterruptedException {
        log(req + " surge call starts");
        try {
            Thread.sleep(1_000);
        } catch (InterruptedException e) {
            log(req + " surge call interrupted, thread freed");
            throw e;
        }
        log(req + " surge call finished, result thrown away");
        return "1.4x";
    }

    // Plain: supplyAsync + orTimeout. The future gives up; the thread doesn't.
    static CompletableFuture<String> plain(ExecutorService pool, String req) {
        return CompletableFuture.supplyAsync(() -> {
            try { return surgeCall(req); } catch (InterruptedException e) { throw new RuntimeException(e); }
        }, pool).orTimeout(150, TimeUnit.MILLISECONDS);
    }

    // Cancellable: keep the executor's Future so a timeout can interrupt the running call
    static <T> CompletableFuture<T> cancellable(ExecutorService pool, Callable<T> call, long timeoutMs) {
        CompletableFuture<T> cf = new CompletableFuture<>();
        Future<?> task = pool.submit(() -> {
            try { cf.complete(call.call()); } catch (Throwable t) { cf.completeExceptionally(t); }
        });
        cf.orTimeout(timeoutMs, TimeUnit.MILLISECONDS)
          .whenComplete((v, ex) -> { if (ex != null) task.cancel(true); });   // interrupts the worker
        return cf;
    }

    static void scenario(String label, boolean cancel) throws Exception {
        System.out.println(label);
        ExecutorService surgeIo = Executors.newFixedThreadPool(1, r -> new Thread(r, "surge-io"));
        t0 = System.nanoTime();
        CompletableFuture<String> first = cancel ? cancellable(surgeIo, () -> surgeCall("req-1"), 150) : plain(surgeIo, "req-1");
        Thread.sleep(200);
        CompletableFuture<String> second = cancel ? cancellable(surgeIo, () -> surgeCall("req-2"), 150) : plain(surgeIo, "req-2");
        for (CompletableFuture<String> f : java.util.List.of(first, second)) {
            f.handle((v, ex) -> v != null ? v : ex.getClass().getSimpleName()).thenAccept(r -> log("caller sees " + r)).join();
        }
        surgeIo.shutdown();
        surgeIo.awaitTermination(5, TimeUnit.SECONDS);
        log("surge-io idle again");
    }

    public static void main(String[] args) throws Exception {
        scenario("supplyAsync(...).orTimeout(150 ms), one surge-io thread:", false);
        scenario("submit + orTimeout + cancel(true) on timeout:", true);

        System.out.println("completeOnTimeout:");
        t0 = System.nanoTime();
        CompletableFuture<String> never = new CompletableFuture<>();
        String shown = never.completeOnTimeout("1.0x (no surge)", 150, TimeUnit.MILLISECONDS).join();
        log("shown multiplier " + shown + ", isCompletedExceptionally=" + never.isCompletedExceptionally());
    }
}`,
        },
        {
          type: "output",
          text: `supplyAsync(...).orTimeout(150 ms), one surge-io thread:
      5 ms  surge-io                        req-1 surge call starts
    209 ms  main                            caller sees TimeoutException
    358 ms  CompletableFutureDelayScheduler caller sees TimeoutException
   1024 ms  surge-io                        req-1 surge call finished, result thrown away
   1025 ms  main                            surge-io idle again
submit + orTimeout + cancel(true) on timeout:
      2 ms  surge-io                        req-1 surge call starts
    152 ms  surge-io                        req-1 surge call interrupted, thread freed
    203 ms  main                            caller sees TimeoutException
    203 ms  surge-io                        req-2 surge call starts
    354 ms  CompletableFutureDelayScheduler caller sees TimeoutException
    354 ms  surge-io                        req-2 surge call interrupted, thread freed
    355 ms  main                            surge-io idle again
completeOnTimeout:
    158 ms  main                            shown multiplier 1.0x (no surge), isCompletedExceptionally=false`,
        },
        {
          type: "list",
          items: [
            "**The plain version timed out at 150 ms, and `surge-io` stayed busy until 1,024 ms** finishing a call whose result was thrown away. (The first \"caller sees\" line says 209 ms only because `main` was sleeping until 200 ms before it looked; the future had failed at 150.)",
            "**`req-2` never ran at all.** It was queued behind `req-1`, its own 150 ms timeout fired at about 350 ms while it was still in the queue, and when the thread finally got to it, the task did nothing. That's a detail of `supplyAsync`: its internal `AsyncSupply` task checks whether its future is already completed and skips the supplier if so. Useful, but it doesn't give back the second the thread spent on `req-1`.",
            "**The cancellable version interrupted `req-1` at 152 ms**, and `req-2` started at 203 ms, as soon as it was submitted. The trick is to keep the handle that can actually stop the work, the `Future` returned by `ExecutorService.submit` (a `FutureTask`), and to call `cancel(true)` on it when the `CompletableFuture` fails. `CompletableFuture.cancel(true)` can't do this: as the previous lesson showed, it's only `completeExceptionally(new CancellationException())` and never interrupts anything.",
            "**`cancel(true)` only works if the work responds to interrupts.** `Thread.sleep`, `BlockingQueue.take`, `Object.wait`, and NIO interruptible channels do. Classic blocking socket reads (`InputStream.read` on a `java.net.Socket`) don't, so for those the real limit has to be the client's own read timeout (`setSoTimeout`, the HTTP client's request timeout). In practice I set both: the client's timeout so the socket gives up, and `orTimeout` as the outer guarantee for the caller.",
            "**`completeOnTimeout` completed normally**, with the default. `isCompletedExceptionally` is `false`, so nothing downstream can tell that `1.0x` was a guess rather than the surge service's answer. That's sometimes what you want and sometimes a silent revenue bug, which comes back in the fan-out below.",
          ],
        },
      ],
    },
    {
      title: "Fan-out, Fallbacks and Partial Results",
      blocks: [
        {
          type: "paragraph",
          text: "A ride quote needs the fare (essential: without a price there is nothing to show), an ETA (nice to have) and the surge multiplier (nice to have, but showing 0% surge during real surge loses money). Each call gets its own timeout and its own failure policy, decided per dependency, not per request:",
        },
        {
          type: "code",
          language: "java",
          title: "FanoutFallbacks.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

public class FanoutFallbacks {
    record Quote(long farePaise, Integer etaMin, Integer surgePct, boolean degraded) { }

    static final ExecutorService IO = Executors.newFixedThreadPool(12);

    static <T> Supplier<T> slow(long ms, T value) {
        return () -> {
            try { Thread.sleep(ms); } catch (InterruptedException e) { throw new CompletionException(e); }
            return value;
        };
    }

    static <T> Supplier<T> broken(long ms) {
        return () -> {
            try { Thread.sleep(ms); } catch (InterruptedException e) { throw new CompletionException(e); }
            throw new IllegalStateException("surge-svc 500");
        };
    }

    static Throwable unwrap(Throwable t) {
        return t instanceof CompletionException && t.getCause() != null ? t.getCause() : t;
    }

    static CompletableFuture<Quote> quote(Supplier<Long> fareSvc, Supplier<Integer> etaSvc, Supplier<Integer> surgeSvc) {
        // essential: no fare, no quote
        CompletableFuture<Long> fare = CompletableFuture.supplyAsync(fareSvc, IO).orTimeout(300, TimeUnit.MILLISECONDS);
        // optional: a missing ETA or surge becomes null, and the quote is marked degraded
        CompletableFuture<Integer> eta = CompletableFuture.supplyAsync(etaSvc, IO)
                .orTimeout(250, TimeUnit.MILLISECONDS).exceptionally(ex -> null);
        CompletableFuture<Integer> surge = CompletableFuture.supplyAsync(surgeSvc, IO)
                .completeOnTimeout(0, 150, TimeUnit.MILLISECONDS)          // late surge: quote without surge
                .exceptionally(ex -> null);                                 // broken surge: unknown, degraded
        return fare.thenCombine(eta, (f, e) -> new long[] {f, e == null ? -1 : e})
                .thenCombine(surge, (fe, s) -> new Quote(fe[0], fe[1] < 0 ? null : (int) fe[1], s,
                        fe[1] < 0 || s == null));
    }

    static void run(String label, Supplier<Long> fare, Supplier<Integer> eta, Supplier<Integer> surge) {
        long t0 = System.nanoTime();
        Object result;
        try {
            result = quote(fare, eta, surge).join();
        } catch (CompletionException e) {
            Throwable cause = unwrap(e);
            result = (cause instanceof TimeoutException ? "HTTP 503 (fare timed out)" : "HTTP 503 (" + cause + ")");
        }
        long tookMs = (System.nanoTime() - t0) / 1_000_000;
        System.out.printf("%-26s %4d ms  %s%n", label, tookMs, result);
    }

    public static void main(String[] args) {
        quote(slow(80, 18_000L), slow(120, 7), slow(40, 20)).join();      // warm-up: class loading, lambdas
        run("healthy", slow(80, 18_000L), slow(120, 7), slow(40, 20));
        run("ETA takes 2 s", slow(80, 18_000L), slow(2_000, 7), slow(40, 20));
        run("surge takes 1.5 s", slow(80, 18_000L), slow(120, 7), slow(1_500, 20));
        run("surge returns 500", slow(80, 18_000L), slow(120, 7), broken(30));
        run("fare takes 1 s", slow(1_000, 18_000L), slow(120, 7), slow(40, 20));
        IO.shutdownNow();
    }
}`,
        },
        {
          type: "output",
          text: `healthy                     135 ms  Quote[farePaise=18000, etaMin=7, surgePct=20, degraded=false]
ETA takes 2 s               258 ms  Quote[farePaise=18000, etaMin=null, surgePct=20, degraded=true]
surge takes 1.5 s           179 ms  Quote[farePaise=18000, etaMin=7, surgePct=0, degraded=false]
surge returns 500           128 ms  Quote[farePaise=18000, etaMin=7, surgePct=null, degraded=true]
fare takes 1 s              323 ms  HTTP 503 (fare timed out)`,
        },
        {
          type: "list",
          items: [
            "**Healthy, the quote took as long as the slowest call** (ETA, 120 ms) plus overhead: 135 to 157 ms over three runs on a loaded machine.",
            "**ETA taking 2 s cost the quote 250 ms, not 2 s**: the timeout fired, `exceptionally` turned it into `null`, and the quote went out marked `degraded=true`, which the app shows as \"ETA unavailable\".",
            "**Surge taking 1.5 s gave `surgePct=0` and `degraded=false`.** That's `completeOnTimeout` doing exactly what it says: the default looks like a real answer. During a real surge, every quote would go out at base fare and nobody would know. For anything with money attached, I'd rather use `orTimeout` plus `exceptionally` and mark the response degraded, as the broken-surge case does, so the app can decide (show \"prices may be higher\", or refuse to book).",
            "**Surge returning a 500 became `surgePct=null, degraded=true`** in 128 to 137 ms: the failure arrived fast, so the quote didn't wait at all for it.",
            "**Fare taking 1 s failed the whole quote at 300 ms** with a clean 503. An essential call has a timeout and no fallback. The `unwrap` is needed because `join` wraps the `TimeoutException` in a `CompletionException`, the rule from the previous lesson.",
            "Timings here drift by 10 to 40 ms between runs because other processes were running on the machine; the ordering and the timeout boundaries were the same in every run.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "Decide the policy per dependency",
          text: "For each call in a fan-out, write down three things: is it essential, what's its timeout, and what's its fallback (none, a default, a cached value, or \"absent and degraded\"). Most fan-out bugs I've seen are one of those three left implicit.",
        },
      ],
    },
    {
      title: "Deadline Budgets Across a Fan-out",
      blocks: [
        {
          type: "paragraph",
          text: "Per-call timeouts don't add up to a request timeout. If the client gives the quote 300 ms, and the request first loads the rider's profile (up to 200 ms) and then fans out with a fare timeout of 300 ms, the worst case is 500 ms: the client has hung up by then, and the server is still working on an answer nobody will read. A **deadline** fixes the request's end time once, when it arrives, and every call gets the smaller of its own cap and the time left:",
        },
        {
          type: "code",
          language: "java",
          title: "DeadlineBudget.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class DeadlineBudget {
    // One deadline per request, fixed when the request arrives
    record Deadline(long atNanos) {
        static Deadline in(long ms) { return new Deadline(System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(ms)); }
        long remainingMs() { return Math.max(0, TimeUnit.NANOSECONDS.toMillis(atNanos - System.nanoTime())); }
        // a call gets its own cap, or whatever is left of the request, whichever is smaller
        long budgetFor(long capMs) { return Math.min(capMs, remainingMs()); }
    }

    static final ExecutorService IO = Executors.newFixedThreadPool(8);

    static CompletableFuture<String> call(String name, long tookMs) {
        return CompletableFuture.supplyAsync(() -> {
            try { Thread.sleep(tookMs); } catch (InterruptedException e) { throw new CompletionException(e); }
            return name;
        }, IO);
    }

    static String quote(boolean useBudget, long profileMs, long fareMs, long etaMs) {
        long t0 = System.nanoTime();
        Deadline deadline = Deadline.in(300 - 20);                    // client SLA 300 ms, minus 20 ms to reply
        String profile = call("profile", profileMs).orTimeout(useBudget ? deadline.budgetFor(200) : 200, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> "default-profile").join();      // step 1, sequential
        long fareTimeout = useBudget ? deadline.budgetFor(300) : 300; // step 2, fan-out
        long etaTimeout = useBudget ? deadline.budgetFor(250) : 250;
        CompletableFuture<String> fare = call("fare", fareMs).orTimeout(fareTimeout, TimeUnit.MILLISECONDS);
        CompletableFuture<String> eta = call("eta", etaMs).orTimeout(etaTimeout, TimeUnit.MILLISECONDS).exceptionally(ex -> "no-eta");
        String result;
        try {
            result = fare.thenCombine(eta, (f, e) -> profile + "+" + f + "+" + e).join();
        } catch (CompletionException e) {
            result = "503";
        }
        long took = (System.nanoTime() - t0) / 1_000_000;
        return String.format("timeouts fare=%3d eta=%3d  -> %-22s in %3d ms%s", fareTimeout, etaTimeout, result, took,
                took > 300 ? "  (client gave up at 300 ms)" : "");
    }

    public static void main(String[] args) {
        quote(true, 10, 10, 10);                                     // warm-up
        for (boolean budget : new boolean[] {false, true}) {
            System.out.println(budget ? "deadline budget:" : "fixed per-call timeouts:");
            System.out.println("  healthy                     " + quote(budget, 40, 80, 120));
            System.out.println("  profile 190 ms              " + quote(budget, 190, 80, 120));
            System.out.println("  profile 190 ms, ETA 1 s     " + quote(budget, 190, 80, 1_000));
            System.out.println("  profile 190 ms, fare 200 ms " + quote(budget, 190, 200, 120));
        }
        IO.shutdownNow();
    }
}`,
        },
        {
          type: "output",
          text: `fixed per-call timeouts:
  healthy                     timeouts fare=300 eta=250  -> profile+fare+eta       in 166 ms
  profile 190 ms              timeouts fare=300 eta=250  -> profile+fare+eta       in 316 ms  (client gave up at 300 ms)
  profile 190 ms, ETA 1 s     timeouts fare=300 eta=250  -> profile+fare+no-eta    in 441 ms  (client gave up at 300 ms)
  profile 190 ms, fare 200 ms timeouts fare=300 eta=250  -> profile+fare+eta       in 391 ms  (client gave up at 300 ms)
deadline budget:
  healthy                     timeouts fare=239 eta=239  -> profile+fare+eta       in 161 ms
  profile 190 ms              timeouts fare= 89 eta= 89  -> profile+fare+no-eta    in 279 ms
  profile 190 ms, ETA 1 s     timeouts fare= 89 eta= 89  -> profile+fare+no-eta    in 279 ms
  profile 190 ms, fare 200 ms timeouts fare= 88 eta= 88  -> 503                    in 280 ms`,
        },
        {
          type: "list",
          items: [
            "**With fixed timeouts, three of four cases answered after the client had given up**: 316, 441 and 391 ms (314 to 441 ms over two runs). Every one of those is a \"success\" in the server's metrics and a spinner followed by an error on the rider's phone. Worse, the server spent threads and downstream capacity producing them.",
            "**With a budget, every reply left within 282 ms.** After a 190 ms profile load, only 89 ms were left, so fare and ETA each got 89 ms instead of 300 and 250. ETA (120 ms) didn't make it and the quote went out degraded; a 200 ms fare couldn't make it, so the request failed fast with a 503 the client could still read and retry.",
            "**The 20 ms margin matters.** My first version set the deadline at the full 300 ms, and its replies landed at 299 to 306 ms: on time on paper, late on the wire. Leave room for serialising and sending the response.",
            "**A fast failure beats a late success.** A 503 at 280 ms lets the app retry or show an error; a 200 at 441 ms is never seen. That's the whole case for budgets.",
            "Across services the same idea is called **deadline propagation**: gRPC sends the remaining deadline in a header (`grpc-timeout`) and each server budgets from it. Over plain HTTP you can do the same with your own header, so a downstream service doesn't spend 300 ms on a request whose caller has 50 ms left.",
          ],
        },
      ],
    },
    {
      title: "Blocking Calls, the Common Pool and Bulkheads",
      blocks: [
        {
          type: "paragraph",
          text: "`supplyAsync(fn)` without an executor runs on `ForkJoinPool.commonPool()`, which has `cores - 1` threads (7 on this 8-core machine) and is shared with parallel streams, every library that uses `*Async` without an executor, and `CompletableFuture`'s own async callbacks. Blocking I/O there doesn't just slow your calls, it stalls everyone else's work too:",
        },
        {
          type: "code",
          language: "java",
          title: "CommonPoolStarvation.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ForkJoinPool;
import java.util.stream.IntStream;

public class CommonPoolStarvation {
    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    // 42 ETA lookups that each block 100 ms on a "socket", then an unrelated tiny CPU job
    static void run(String label, ExecutorService io) {
        long t0 = System.nanoTime();
        List<CompletableFuture<Void>> calls = new ArrayList<>();
        for (int i = 0; i < 42; i++) {
            Runnable call = () -> sleep(100);
            calls.add(io == null ? CompletableFuture.runAsync(call) : CompletableFuture.runAsync(call, io));
        }
        sleep(5);
        long submitted = System.nanoTime();
        // Somebody else's work on the common pool: a surge-zone recalculation with a parallel stream
        long zones = CompletableFuture.supplyAsync(() -> IntStream.range(0, 1_000).parallel().filter(z -> z % 7 == 0).count()).join();
        long cpuWaitMs = (System.nanoTime() - submitted) / 1_000_000;
        CompletableFuture.allOf(calls.toArray(CompletableFuture[]::new)).join();
        System.out.printf("%-34s 42 blocking calls done in %4d ms | zone recount (%d zones) took %4d ms | common pool threads %d%n",
                label, (System.nanoTime() - t0) / 1_000_000, zones, cpuWaitMs, ForkJoinPool.commonPool().getPoolSize());
    }

    public static void main(String[] args) {
        System.out.println("common pool parallelism = " + ForkJoinPool.getCommonPoolParallelism());
        run("blocking calls on the common pool", null);
        sleep(500);
        ExecutorService etaIo = Executors.newFixedThreadPool(42);
        run("blocking calls on an eta-io pool", etaIo);
        etaIo.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `common pool parallelism = 7
blocking calls on the common pool  42 blocking calls done in  611 ms | zone recount (143 zones) took  601 ms | common pool threads 7
blocking calls on an eta-io pool   42 blocking calls done in  113 ms | zone recount (143 zones) took    0 ms | common pool threads 7`,
        },
        {
          type: "list",
          items: [
            "**42 calls of 100 ms on 7 threads took 600 ms**: six rounds of seven, exactly the arithmetic. On their own pool of 42 threads they took one round, 104 to 113 ms over four runs.",
            "**The unrelated zone recount waited 598 to 601 ms** for a job that takes well under a millisecond, because it queued behind the blocked calls. Its owner did nothing wrong: someone else's blocking calls took all seven threads of a pool they share. That's the starvation the previous lesson warned about, measured.",
            "**The pool didn't grow**: still 7 threads. The common pool adds compensating threads only when a worker blocks through `ForkJoinPool.managedBlock` (which `CompletableFuture.join` uses internally); `Thread.sleep`, socket reads and JDBC calls don't, so the pool just sits there with every worker blocked.",
            "With `-Djava.util.concurrent.ForkJoinPool.common.parallelism=64` the same program finished the blocking calls in 110 ms and the recount in 9 ms. That works as a stopgap, but it makes every parallel stream in the JVM run on 64 threads too. A dedicated pool is the actual fix.",
          ],
        },
        {
          type: "heading",
          text: "Bulkheads: one pool per dependency",
        },
        {
          type: "paragraph",
          text: "Moving blocking calls off the common pool into **one** shared I/O pool only moves the problem: a slow dependency fills that pool instead. A **bulkhead** (the watertight compartments in a ship's hull) gives each dependency its own bounded pool, so a flood in one compartment stays there. Here, 40 requests in 1 second each make an 80 ms fare call and a 1,500 ms surge call:",
        },
        {
          type: "code",
          language: "java",
          title: "SharedVsBulkhead.java",
          code: `import java.util.Arrays;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;

public class SharedVsBulkhead {
    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    // 40 requests in 1 s; each makes a fare call (80 ms) and a surge call (1,500 ms: the incident)
    static void run(String label, ExecutorService farePool, ExecutorService surgePool) {
        long[] fareMs = new long[40];
        AtomicInteger rejected = new AtomicInteger();
        CompletableFuture<?>[] all = new CompletableFuture<?>[80];
        long start = System.nanoTime();
        for (int i = 0; i < 40; i++) {
            long arrival = start + i * 25_000_000L;
            LockSupport.parkNanos(arrival - System.nanoTime());
            int idx = i;
            all[2 * i] = CompletableFuture.runAsync(() -> sleep(80), farePool)
                    .thenRun(() -> fareMs[idx] = (System.nanoTime() - arrival) / 1_000_000);
            try {
                all[2 * i + 1] = CompletableFuture.runAsync(() -> sleep(1_500), surgePool);
            } catch (RejectedExecutionException e) {
                rejected.incrementAndGet();
                all[2 * i + 1] = CompletableFuture.completedFuture(null);
            }
        }
        CompletableFuture.allOf(all).join();
        Arrays.sort(fareMs);
        System.out.printf("%-38s fare p50 %5d ms  p99 %5d ms | surge calls rejected %d%n", label, fareMs[20], fareMs[39], rejected.get());
    }

    public static void main(String[] args) {
        ExecutorService shared = Executors.newFixedThreadPool(16);
        run("one shared pool of 16 threads", shared, shared);
        shared.shutdown();
        ExecutorService fareIo = Executors.newFixedThreadPool(8);
        ExecutorService surgeIo = new ThreadPoolExecutor(4, 4, 0, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(4),
                new ThreadPoolExecutor.AbortPolicy());
        run("fare-io 8 + surge-io 4 (queue 4, Abort)", fareIo, surgeIo);
        fareIo.shutdown();
        surgeIo.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `one shared pool of 16 threads          fare p50  1232 ms  p99  2411 ms | surge calls rejected 0
fare-io 8 + surge-io 4 (queue 4, Abort) fare p50    80 ms  p99    81 ms | surge calls rejected 32`,
        },
        {
          type: "list",
          items: [
            "**In the shared pool, an 80 ms fare call took 1,232 ms at p50 and 2,411 ms at p99.** Within the first few hundred milliseconds, surge calls held most of the 16 threads for 1.5 s each, and fare calls queued behind them in the same unbounded queue. The fare service was perfectly healthy.",
            "**With bulkheads, fare stayed at 80 ms**, because surge could only ever hold its own 4 threads. Once those 4 threads and the 4 queue slots were full, 32 surge calls were **rejected immediately** with `RejectedExecutionException`, which a fan-out turns into a fallback in microseconds instead of a 1.5 s wait.",
            "**The bounded queue is half the bulkhead.** A fixed pool with the default unbounded `LinkedBlockingQueue` isolates threads, but queued calls still wait behind slow ones until their timeouts fire. A small queue plus `AbortPolicy` turns \"the dependency is saturated\" into an instant, handleable failure.",
            "Sizing: threads per dependency is roughly the dependency's request rate times its normal latency (Little's law), with headroom. 40 requests per second times 80 ms is 3.2 busy threads on average, so 8 is generous for fare. A semaphore around the call can do the same job without a pool, which is how bulkheads are usually built on virtual threads.",
          ],
        },
      ],
    },
    {
      title: "Retries with delayedExecutor",
      blocks: [
        {
          type: "paragraph",
          text: "A failed call is often worth retrying, but not immediately (the dependency is probably overloaded) and not by sleeping a thread between attempts (that's a blocked thread per retrying request). `delayedExecutor(delay, unit, executor)` waits without holding any thread: the scheduler thread holds a timer, and when it's due, `TaskSubmitter` hands the next attempt to your executor. Exponential backoff with **jitter** (a random part of the delay) stops every client from retrying at the same instant:",
        },
        {
          type: "code",
          language: "java",
          title: "RetryWithBackoff.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

public class RetryWithBackoff {
    static long t0;
    static long ms() { return (System.nanoTime() - t0) / 1_000_000; }

    static final AtomicInteger n = new AtomicInteger();
    static final ExecutorService FARE_IO = Executors.newFixedThreadPool(2, r -> new Thread(r, "fare-io-" + n.incrementAndGet()));

    // The fare service answers 503 to the first \`failures\` calls, in 20 ms each
    static Supplier<Long> flakyFare(int failures) {
        AtomicInteger calls = new AtomicInteger();
        return () -> {
            int attempt = calls.incrementAndGet();
            try { Thread.sleep(20); } catch (InterruptedException e) { throw new CompletionException(e); }
            System.out.printf("  %4d ms  attempt %d on %-9s -> %s%n", ms(), attempt, Thread.currentThread().getName(),
                    attempt <= failures ? "503" : "18000");
            if (attempt <= failures) throw new IllegalStateException("fare-svc 503");
            return 18_000L;
        };
    }

    // Retry with exponential backoff and jitter, without blocking any thread between attempts
    static <T> CompletableFuture<T> retry(Supplier<T> call, Executor io, int attempt, int maxAttempts, long deadlineNanos) {
        return CompletableFuture.supplyAsync(call, io).exceptionallyCompose(ex -> {
            long cap = 50L << (attempt - 1);                                  // 50, 100, 200 ms ...
            long delay = ThreadLocalRandom.current().nextLong(cap / 2, cap + 1);
            boolean timeLeft = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(delay + 20) < deadlineNanos;
            if (attempt >= maxAttempts || !timeLeft) {
                System.out.printf("  %4d ms  giving up after %d attempts (time left for another: %b)%n", ms(), attempt, timeLeft);
                return CompletableFuture.failedFuture(ex);
            }
            System.out.printf("  %4d ms  backing off %d ms before attempt %d%n", ms(), delay, attempt + 1);
            Executor later = CompletableFuture.delayedExecutor(delay, TimeUnit.MILLISECONDS, io);
            return CompletableFuture.supplyAsync(() -> null, later)
                    .thenCompose(ignored -> retry(call, io, attempt + 1, maxAttempts, deadlineNanos));
        });
    }

    static void run(String label, int failures, long budgetMs) {
        System.out.println(label);
        t0 = System.nanoTime();
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(budgetMs);
        String result = retry(flakyFare(failures), FARE_IO, 1, 4, deadline)
                .handle((v, ex) -> v != null ? "fare " + v : "failed: " + ex.getCause().getMessage()).join();
        System.out.printf("  %4d ms  %s%n", ms(), result);
    }

    public static void main(String[] args) {
        run("two 503s, then success (budget 1,000 ms):", 2, 1_000);
        run("always 503 (budget 1,000 ms):", 99, 1_000);
        run("always 503 (budget 150 ms):", 99, 150);
        FARE_IO.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `two 503s, then success (budget 1,000 ms):
    29 ms  attempt 1 on fare-io-1 -> 503
    64 ms  backing off 31 ms before attempt 2
   122 ms  attempt 2 on fare-io-2 -> 503
   126 ms  backing off 99 ms before attempt 3
   247 ms  attempt 3 on fare-io-2 -> 18000
   248 ms  fare 18000
always 503 (budget 1,000 ms):
    20 ms  attempt 1 on fare-io-1 -> 503
    21 ms  backing off 35 ms before attempt 2
    78 ms  attempt 2 on fare-io-2 -> 503
    79 ms  backing off 68 ms before attempt 3
   168 ms  attempt 3 on fare-io-1 -> 503
   168 ms  backing off 198 ms before attempt 4
   390 ms  attempt 4 on fare-io-2 -> 503
   391 ms  giving up after 4 attempts (time left for another: true)
   393 ms  failed: fare-svc 503
always 503 (budget 150 ms):
    20 ms  attempt 1 on fare-io-1 -> 503
    21 ms  backing off 36 ms before attempt 2
    78 ms  attempt 2 on fare-io-1 -> 503
    78 ms  giving up after 2 attempts (time left for another: false)
    81 ms  failed: fare-svc 503`,
        },
        {
          type: "list",
          items: [
            "**Every attempt ran on `fare-io`, never on the scheduler thread.** That's the `TaskSubmitter` from the bytecode: the timer thread only calls `executor.execute`. Between attempts, no thread was blocked at all; the request existed only as a timer in the `DelayedWorkQueue` and a chain of futures.",
            "**The delays grew and varied**: 31 then 99 ms in one run, 35, 68 then 198 ms in the next. Each delay is random between half the cap and the cap (50, 100, 200 ms). Without jitter, a thousand clients that failed together retry together, and the recovering service gets hit by the same spike again.",
            "**The retry respects the request's deadline.** With a 150 ms budget it stopped after the second attempt because another backoff plus a 20 ms call wouldn't fit. A retry loop that ignores the budget turns a 300 ms SLA into a multi-second request.",
            "**`exceptionallyCompose` (Java 12) is what makes this a few lines**: on failure it returns a new future (the next attempt) instead of a value. The first gap (29 to 64 ms in the first run) is one-time class loading for that path; later gaps were 0 to 4 ms.",
            "Retry only what's safe to repeat. A fare lookup is idempotent (calling it twice does no harm); \"charge the rider\" isn't, unless the API takes an idempotency key. And retries multiply load: three attempts per request triple the traffic to a service that's already failing, which is why production retry policies also have a retry budget (for example, at most 10% extra calls) or sit behind a circuit breaker.",
          ],
        },
      ],
    },
    {
      title: "Choosing an Executor",
      blocks: [
        {
          type: "paragraph",
          text: "The same 1,000 blocking calls of 50 ms, and the same 64 CPU-bound calculations, on five executors. `maxInFlight` is the most calls the downstream ETA service saw at once:",
        },
        {
          type: "code",
          language: "java",
          title: "ExecutorChoice.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

public class ExecutorChoice {
    static final ThreadMXBean THREADS = ManagementFactory.getThreadMXBean();
    static final AtomicInteger inFlight = new AtomicInteger(), maxInFlight = new AtomicInteger();
    static Semaphore limit;                                          // optional cap on calls to the ETA service

    static void etaCall() {                                          // blocking I/O: 50 ms
        try {
            if (limit != null) limit.acquire();
            try {
                maxInFlight.accumulateAndGet(inFlight.incrementAndGet(), Math::max);
                Thread.sleep(50);
                inFlight.decrementAndGet();
            } finally {
                if (limit != null) limit.release();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    static void sleepQuietly(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    static long cpuWork() {                                          // pure CPU, no blocking
        long x = 0;
        for (int i = 0; i < 12_000_000; i++) x += (x ^ i) * 31 + i;
        return x;
    }

    static void run(String label, ExecutorService ex, Runnable task, int tasks) {
        maxInFlight.set(0);
        THREADS.resetPeakThreadCount();
        long t0 = System.nanoTime();
        CompletableFuture<?>[] all = new CompletableFuture<?>[tasks];
        for (int i = 0; i < tasks; i++) all[i] = ex == null ? CompletableFuture.runAsync(task) : CompletableFuture.runAsync(task, ex);
        CompletableFuture.allOf(all).join();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        System.out.printf("  %-34s %5d ms   peak JVM threads %4d%s%n", label, ms, THREADS.getPeakThreadCount(),
                maxInFlight.get() > 0 ? "   max ETA calls in flight " + maxInFlight.get() : "");
        if (ex != null) {
            ex.shutdown();
            try { ex.awaitTermination(1, java.util.concurrent.TimeUnit.MINUTES); } catch (InterruptedException e) { }
        }
        sleepQuietly(200);                                        // let finished pools' threads exit
    }

    public static void main(String[] args) {
        for (int i = 0; i < 10; i++) cpuWork();                    // warm up the JIT
        long c0 = System.nanoTime();
        cpuWork();
        System.out.printf("one cpuWork() alone: %d ms%n", (System.nanoTime() - c0) / 1_000_000);
        System.out.println("1,000 blocking ETA calls of 50 ms:");
        run("common pool (7 workers)", null, ExecutorChoice::etaCall, 1_000);
        run("fixed pool, 8 threads", Executors.newFixedThreadPool(8), ExecutorChoice::etaCall, 1_000);
        run("fixed pool, 100 threads", Executors.newFixedThreadPool(100), ExecutorChoice::etaCall, 1_000);
        run("cached pool (unbounded)", Executors.newCachedThreadPool(), ExecutorChoice::etaCall, 1_000);
        run("virtual thread per task", Executors.newVirtualThreadPerTaskExecutor(), ExecutorChoice::etaCall, 1_000);
        limit = new Semaphore(100);
        run("virtual threads + Semaphore(100)", Executors.newVirtualThreadPerTaskExecutor(), ExecutorChoice::etaCall, 1_000);
        limit = null;

        System.out.println("64 CPU-bound fare calculations:");
        run("common pool (7 workers)", null, ExecutorChoice::cpuWork, 64);
        run("fixed pool, 8 threads", Executors.newFixedThreadPool(8), ExecutorChoice::cpuWork, 64);
        run("fixed pool, 100 threads", Executors.newFixedThreadPool(100), ExecutorChoice::cpuWork, 64);
        run("virtual thread per task", Executors.newVirtualThreadPerTaskExecutor(), ExecutorChoice::cpuWork, 64);
    }
}`,
        },
        {
          type: "output",
          text: `one cpuWork() alone: 30 ms
1,000 blocking ETA calls of 50 ms:
  common pool (7 workers)             7203 ms   peak JVM threads   13   max ETA calls in flight 7
  fixed pool, 8 threads               6301 ms   peak JVM threads   21   max ETA calls in flight 8
  fixed pool, 100 threads              569 ms   peak JVM threads  113   max ETA calls in flight 100
  cached pool (unbounded)              333 ms   peak JVM threads  389   max ETA calls in flight 370
  virtual thread per task               91 ms   peak JVM threads   22   max ETA calls in flight 1000
  virtual threads + Semaphore(100)     511 ms   peak JVM threads   22   max ETA calls in flight 100
64 CPU-bound fare calculations:
  common pool (7 workers)              407 ms   peak JVM threads   22
  fixed pool, 8 threads                542 ms   peak JVM threads   30
  fixed pool, 100 threads              449 ms   peak JVM threads   86
  virtual thread per task              603 ms   peak JVM threads   22`,
        },
        {
          type: "list",
          items: [
            "**For blocking calls, throughput is threads divided by latency.** 7 threads at 50 ms per call is 140 calls a second, so 1,000 calls took 7.2 s; 100 threads did them in 569 ms. In a second run, while the machine's load average was above 15, the common pool took 15.9 s for the same calls, and the other rows stayed close. Blocking work on a small pool is the most fragile row in the table.",
            "**Virtual threads finished in 91 ms (84 to 106 ms over three runs) with 22 platform threads in the JVM**: the 8 carrier threads plus the JVM's own. Each blocked virtual thread unmounts from its carrier during `sleep`, so 1,000 calls can wait at once for the price of 1,000 small heap objects.",
            "**The catch is in the last column: the ETA service saw 1,000 calls at once.** A pool size used to be an accidental limit on how hard you hit a dependency. Virtual threads remove that limit, so you must put it back on purpose: with a `Semaphore(100)` the virtual threads took 511 ms and never had more than 100 calls in flight, the same shape as a 100-thread pool without 100 platform threads.",
            "**The cached pool made 389 threads in this run, and 543 and 824 in two others** (the count depends on how fast threads are released and reused). That's the worst of both: as many platform threads as the timing happens to produce, each with its own stack, and no limit on the downstream either.",
            "**For CPU-bound work, no executor won.** The ideal is 64 tasks of about 30 ms on 8 cores, about 240 ms; every executor landed between 214 and 603 ms across three runs, with the ranking changing between runs because other processes were using the same cores. More threads than cores can't add CPU, and virtual threads don't make computation faster. Peak thread counts include threads left from earlier rows: 22 is the baseline after virtual threads started their 8 carriers.",
          ],
        },
        {
          type: "table",
          headers: ["Work", "My default on Java 21", "Why"],
          rows: [
            ["Short CPU-bound callbacks (`thenApply` that maps a DTO)", "Run inline (non-async), or the common pool", "Microseconds of work; a hop costs more than the work"],
            ["Heavier CPU-bound work you own", "A fixed pool sized to cores, or the common pool if nothing blocks on it", "More threads than cores only adds switching"],
            ["Blocking I/O to one dependency", "A bulkhead: bounded pool or semaphore per dependency", "Isolation, plus a natural limit on calls to that dependency"],
            ["Many blocking calls with modest per-dependency limits", "Virtual threads plus a `Semaphore` per dependency", "Cheap waiting, explicit limits"],
            ["Fallbacks and callbacks after a timeout", "`*Async(fn, executor)`", "Keeps `CompletableFutureDelayScheduler` free"],
            ["Anything that blocks", "Never the common pool", "7 shared threads; starves parallel streams and libraries"],
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing one surge call made with the cancellable helper (`pool.submit`, then `orTimeout(150 ms)`, then `whenComplete` that calls `task.cancel(true)`), when the surge service hangs:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Submit.** `surgeIo.submit(...)` wraps the lambda in a `FutureTask` and starts a new worker for it if the pool is below its core size, or otherwise puts it in the bounded queue. If the queue is full, `AbortPolicy` throws `RejectedExecutionException` on the calling thread, and the helper completes the future exceptionally at once: the fallback runs in microseconds.",
            "**Arm the timer.** `cf.orTimeout(150, MILLISECONDS)` checks `result == null`, creates `new Timeout(cf)`, calls `Delayer.delay`, which calls `ScheduledThreadPoolExecutor.schedule`. That takes the queue's lock, inserts a `ScheduledFutureTask` into the binary heap by due time, and, if it's now the earliest timer, signals the `CompletableFutureDelayScheduler` thread so it recomputes how long to wait. On first use in the JVM, this step also creates that thread. `orTimeout` then attaches a `Canceller` holding the scheduled task, and returns the same `cf`.",
            "**Attach the cancel.** `whenComplete((v, ex) -> ...)` pushes a `UniWhenComplete` node onto `cf`'s callback stack. `orTimeout`'s `Canceller` is below it.",
            "**The worker runs the call.** A `surge-io` thread takes the `FutureTask`, records itself as the runner, and calls the surge service, which blocks.",
            "**150 ms later, the timer fires.** The scheduler thread's `DelayedWorkQueue.take` returns the task; it runs `Timeout.run`: `cf.isDone()` is false, so `cf.completeExceptionally(new TimeoutException())`. The CAS on `result` succeeds.",
            "**`postComplete` on the scheduler thread.** It pops and fires the callbacks: the `UniWhenComplete` sees an exception and calls `task.cancel(true)`. `FutureTask.cancel(true)` sets its state to `INTERRUPTING`, calls `interrupt()` on the `surge-io` thread, and sets `INTERRUPTED`. Then the `Canceller` runs and calls `cancel(false)` on the timer task, which is the very task running this code; that's harmless, since the task has already left the queue and nothing is interrupted. Any fallback stage (`exceptionally`) attached to `cf` runs here too, on the scheduler thread, unless it's an `*Async` variant.",
            "**The worker unwinds.** The interrupted `sleep` (or interruptible I/O) throws `InterruptedException`; the helper's `catch` calls `cf.completeExceptionally(...)`, which returns `false` because the timeout already won. The `surge-io` thread returns to the pool and takes the next queued task.",
            "**On-time path, for contrast.** If the surge service had answered in 40 ms, `cf.complete(20)` would run `postComplete` on the worker thread: `whenComplete` sees no exception, and the `Canceller` calls `cancel(false)` on the timer, which `removeOnCancel` takes straight out of the heap. The scheduler thread never wakes up for it.",
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
          title: "TimeoutTour.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class TimeoutTour {
    static final long T0 = System.nanoTime();
    static String at() { return String.format("%4d ms %-10s", (System.nanoTime() - T0) / 1_000_000, Thread.currentThread().getName()); }

    public static void main(String[] args) {
        ExecutorService io = Executors.newFixedThreadPool(2, r -> new Thread(r, "io"));

        // 1. orTimeout: fail with TimeoutException (unwrapped on this stage, wrapped one stage later)
        CompletableFuture<String> a = new CompletableFuture<String>().orTimeout(50, TimeUnit.MILLISECONDS);
        a.exceptionally(ex -> { System.out.println("1. " + at() + " own stage sees " + ex.getClass().getSimpleName()); return null; }).join();
        a.thenApply(String::length).exceptionally(ex -> {
            System.out.println("   next stage sees " + ex.getClass().getSimpleName() + "(" + ex.getCause().getClass().getSimpleName() + ")");
            return null;
        }).join();

        // 2. completeOnTimeout: succeed with a default instead
        System.out.println("2. " + new CompletableFuture<String>().completeOnTimeout("1.0x", 50, TimeUnit.MILLISECONDS).join());

        // 3. a timeout only covers what is still pending when it fires, and an early completion wins
        CompletableFuture<String> b = CompletableFuture.supplyAsync(() -> "18000", io).orTimeout(50, TimeUnit.MILLISECONDS);
        System.out.println("3. on time: " + b.join() + ", completed exceptionally: " + b.isCompletedExceptionally());

        // 4. delayedExecutor: run later, on the executor you pass (the timer thread only submits)
        Executor later = CompletableFuture.delayedExecutor(100, TimeUnit.MILLISECONDS, io);
        CompletableFuture.runAsync(() -> System.out.println("4. " + at() + " delayed task"), later).join();

        // 5. completeAsync + delayedExecutor: a value that arrives after a delay
        String v = new CompletableFuture<String>().completeAsync(() -> at() + " retry-token", later).join();
        System.out.println("5. " + v);

        // 6. exceptionallyAsync: keep fallbacks off the timer thread
        String fb = new CompletableFuture<String>().orTimeout(50, TimeUnit.MILLISECONDS)
                .exceptionallyAsync(ex -> "fallback built on " + Thread.currentThread().getName(), io).join();
        System.out.println("6. " + fb);

        // 7. failedFuture: an already-failed stage, handy for "no budget left"
        CompletableFuture<String> none = CompletableFuture.failedFuture(new TimeoutException("budget spent"));
        System.out.println("7. " + none.handle((x, ex) -> ex.getMessage()).join());

        // 8. get(timeout) is a blocking wait with a limit; the future itself is NOT completed
        CompletableFuture<String> c = new CompletableFuture<>();
        try {
            c.get(50, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            System.out.println("8. get threw " + e.getClass().getSimpleName() + ", future done: " + c.isDone());
        }
        io.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `1.   56 ms CompletableFutureDelayScheduler own stage sees TimeoutException
   next stage sees CompletionException(TimeoutException)
2. 1.0x
3. on time: 18000, completed exceptionally: false
4.  232 ms io         delayed task
5.  336 ms io         retry-token
6. fallback built on io
7. budget spent
8. get threw TimeoutException, future done: false`,
        },
        {
          type: "paragraph",
          text: "Line 1 shows both rules at once: the stage `orTimeout` completed sees the bare `TimeoutException` (on the scheduler thread), and the stage after it sees `CompletionException(TimeoutException)`, so always unwrap before checking. Lines 4 and 5 ran on `io`, about 100 ms apart, never on the scheduler. Line 8 is the difference between a timeout on the **wait** and a timeout on the **future**: `get(50 ms)` gave up waiting, but the future is still pending, and another caller could still complete it or wait on it.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: hedged requests for tail latency",
        },
        {
          type: "paragraph",
          text: "Some slowness is random: a GC pause or a noisy neighbour on one ETA replica. A timeout plus fallback gives up on those calls; a **hedged request** sends a second copy of the call if the first hasn't answered by roughly the p95 latency, and takes whichever answers first. `delayedExecutor` schedules the hedge without blocking anything:",
        },
        {
          type: "code",
          language: "java",
          title: "HedgedEta.java",
          code: `import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class HedgedEta {
    static final ExecutorService ETA_IO = Executors.newFixedThreadPool(64);
    static final AtomicInteger calls = new AtomicInteger();

    // ETA replica: usually 20 to 40 ms, but 5% of calls hit a GC pause and take 400 ms
    static int etaCall() {
        calls.incrementAndGet();
        long ms = ThreadLocalRandom.current().nextInt(100) < 5 ? 400 : ThreadLocalRandom.current().nextLong(20, 41);
        try { Thread.sleep(ms); } catch (InterruptedException e) { throw new CompletionException(e); }
        return 7;
    }

    static CompletableFuture<Integer> plain() {
        return CompletableFuture.supplyAsync(HedgedEta::etaCall, ETA_IO);
    }

    // Hedge: if the first call hasn't answered after 60 ms, send a second one and take whichever is first
    static CompletableFuture<Integer> hedged() {
        CompletableFuture<Integer> first = CompletableFuture.supplyAsync(HedgedEta::etaCall, ETA_IO);
        CompletableFuture<Integer> second = new CompletableFuture<>();
        CompletableFuture.delayedExecutor(60, TimeUnit.MILLISECONDS, ETA_IO).execute(() -> {
            if (!first.isDone()) CompletableFuture.supplyAsync(HedgedEta::etaCall, ETA_IO).whenComplete((v, ex) -> {
                if (ex == null) second.complete(v); else second.completeExceptionally(ex);
            });
        });
        return first.applyToEither(second, v -> v);
    }

    static void measure(String label, boolean hedge) throws Exception {
        calls.set(0);
        long[] ms = new long[1_000];
        for (int batch = 0; batch < 20; batch++) {                // 20 batches of 50 concurrent requests
            CompletableFuture<?>[] fs = new CompletableFuture<?>[50];
            for (int i = 0; i < 50; i++) {
                int idx = batch * 50 + i;
                long t0 = System.nanoTime();
                fs[i] = (hedge ? hedged() : plain()).thenRun(() -> ms[idx] = (System.nanoTime() - t0) / 1_000_000);
            }
            CompletableFuture.allOf(fs).join();
        }
        Arrays.sort(ms);
        System.out.printf("%-8s p50 %3d ms  p95 %3d ms  p99 %3d ms  max %3d ms  ETA calls sent: %,d for 1,000 requests%n",
                label, ms[500], ms[950], ms[990], ms[999], calls.get());
    }

    public static void main(String[] args) throws Exception {
        measure("warm-up", false);
        measure("plain", false);
        measure("hedged", true);
        ETA_IO.shutdownNow();
    }
}`,
        },
        {
          type: "output",
          text: `warm-up  p50  32 ms  p95  59 ms  p99 403 ms  max 419 ms  ETA calls sent: 1,000 for 1,000 requests
plain    p50  32 ms  p95 400 ms  p99 402 ms  max 415 ms  ETA calls sent: 1,000 for 1,000 requests
hedged   p50  31 ms  p95  82 ms  p99 100 ms  max 401 ms  ETA calls sent: 1,051 for 1,000 requests`,
        },
        {
          type: "list",
          items: [
            "**p99 went from 401 to 402 ms down to 95 to 100 ms over three runs**, for 1,047 to 1,052 calls per 1,000 requests: about 5% more load, because only the slow 5% ever get a hedge. p50 didn't change, since a fast call never triggers one.",
            "**p95 is right on the edge** (5% slow calls): it read 400 ms in two plain runs and 48 ms in a third, which is a good reminder that percentiles near the fraction of slow calls jump around.",
            "**The slowest hedged request still took over 400 ms in two of three runs**: the hedge itself hit a slow replica (5% of 5%). Hedging cuts the tail, it doesn't remove it.",
            "Hedge only idempotent reads, set the delay from measured latency (around p95), and cancel the loser when the call is expensive. In the ride-hailing backend I'd hedge ETA and map lookups, never \"book the trip\".",
          ],
        },
        {
          type: "heading",
          text: "Example 2: partial results from many calls",
        },
        {
          type: "paragraph",
          text: "Dispatch pings the six nearest drivers' apps and offers the trip to whoever answers within 150 ms. A slow phone shouldn't hold up the offer, and a crashed app shouldn't fail it. Each ping gets `completeOnTimeout(null)` and `exceptionally(null)`, and `allOf` waits at most 150 ms:",
        },
        {
          type: "code",
          language: "java",
          title: "NearestDrivers.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class NearestDrivers {
    record Offer(String driver, int etaMin) { }

    // Each driver app answers a ping; some are on a bad network
    static final Map<String, Long> RESPONSE_MS = Map.of(
            "D-101", 40L, "D-102", 90L, "D-103", 600L, "D-104", 60L, "D-105", 2_000L, "D-106", 120L);

    public static void main(String[] args) {
        ExecutorService io = Executors.newFixedThreadPool(6);
        long t0 = System.nanoTime();
        List<CompletableFuture<Offer>> pings = RESPONSE_MS.keySet().stream().sorted().map(d ->
                CompletableFuture.supplyAsync(() -> {
                    try { Thread.sleep(RESPONSE_MS.get(d)); } catch (InterruptedException e) { throw new CompletionException(e); }
                    if (d.equals("D-104")) throw new IllegalStateException("driver app crashed");
                    return new Offer(d, (int) (RESPONSE_MS.get(d) / 20));
                }, io)
                .completeOnTimeout(null, 150, TimeUnit.MILLISECONDS)      // too slow: leave it out
                .exceptionally(ex -> null))                               // failed: leave it out
                .toList();

        List<Offer> offers = CompletableFuture.allOf(pings.toArray(CompletableFuture[]::new))
                .thenApply(v -> pings.stream().map(CompletableFuture::join).filter(Objects::nonNull)
                        .sorted((x, y) -> Integer.compare(x.etaMin(), y.etaMin())).toList())
                .join();
        System.out.printf("after %d ms: %d of %d drivers answered: %s%n",
                (System.nanoTime() - t0) / 1_000_000, offers.size(), pings.size(), offers);
        io.shutdownNow();
    }
}`,
        },
        {
          type: "output",
          text: `after 172 ms: 3 of 6 drivers answered: [Offer[driver=D-101, etaMin=2], Offer[driver=D-102, etaMin=4], Offer[driver=D-106, etaMin=6]]`,
        },
        {
          type: "list",
          items: [
            "**Three offers in 164 to 172 ms over three runs**: the 150 ms window plus start-up costs of a fresh JVM. D-103 and D-105 were too slow and became `null` via `completeOnTimeout`; D-104 crashed and became `null` via `exceptionally`. The `allOf` can't fail and can't wait past the window, because every input is guaranteed to complete with a value by 150 ms.",
            "Here `completeOnTimeout(null)` is the right tool, unlike the surge case: absence is the honest answer (\"didn't answer in time\"), and the caller filters it out. The difference is whether the default could be mistaken for real data.",
            "`io.shutdownNow()` interrupts the two still-sleeping pings. In a real service they'd run on a bulkhead, and the slow pings would need the cancellable helper to free their threads.",
          ],
        },
      ],
    },
    {
      title: "When to Use What",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["Fail a call that takes too long", "`orTimeout`, then `exceptionally`/`exceptionallyAsync` per dependency", "`get(timeout)` on a request thread"],
            ["A safe default when a call is late", "`completeOnTimeout(v)`, only when `v` can't be mistaken for real data", "Defaults for money, prices or permissions"],
            ["A slow or blocking fallback", "`exceptionallyAsync(fn, executor)`", "Plain `exceptionally` after `orTimeout` (runs on the timer thread)"],
            ["Free the thread when a call times out", "Keep the `FutureTask`, `cancel(true)` on timeout; plus client-level I/O timeouts", "`CompletableFuture.cancel(true)` (never interrupts)"],
            ["A request-level SLA", "A deadline at arrival; each call gets `min(cap, remaining)`", "Fixed per-call timeouts that add up past the SLA"],
            ["Isolate dependencies", "A bounded pool or semaphore per dependency, with `AbortPolicy`", "One shared I/O pool; the common pool"],
            ["Retry transient failures", "`exceptionallyCompose` + `delayedExecutor`, backoff with jitter, inside the budget", "`Thread.sleep` between attempts; retrying non-idempotent calls"],
            ["Cut tail latency on reads", "Hedged request after ~p95", "Hedging writes or expensive calls"],
            ["Many blocking calls", "Virtual threads plus a semaphore per dependency", "Cached thread pools; unbounded concurrency to a dependency"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Doing real work in a callback on a timed-out future",
        },
        {
          type: "paragraph",
          text: "A fallback that reads a cache or calls another service, attached with plain `exceptionally`, runs on `CompletableFutureDelayScheduler`. In `SlowFallbackStall`, a 1-second fallback made an unrelated 200 ms timeout fire at 1,103 to 1,106 ms. Use `exceptionallyAsync(fn, executor)` or `handleAsync(fn, executor)`.",
        },
        {
          type: "heading",
          text: "Assuming a timeout stops the work",
        },
        {
          type: "paragraph",
          text: "`orTimeout` completes the future; the thread keeps running the call. In `TimeoutKeepsRunning`, the only `surge-io` thread stayed busy until 1,024 ms after a 150 ms timeout. Keep the executor's `Future` and `cancel(true)` it, and set the I/O client's own timeouts.",
        },
        {
          type: "heading",
          text: "Blocking calls on the common pool",
        },
        {
          type: "paragraph",
          text: "`supplyAsync(fn)` without an executor, where `fn` makes an HTTP or JDBC call. Seven threads are shared by the whole JVM; 42 blocking calls made an unrelated parallel stream wait 601 ms. Always pass an executor for anything that can block.",
        },
        {
          type: "heading",
          text: "Per-call timeouts with no request deadline",
        },
        {
          type: "paragraph",
          text: "Timeouts of 200 ms for the profile and 300 ms for the fare look reasonable one at a time and add up to 500 ms. In `DeadlineBudget`, fixed timeouts produced answers at 391 and 441 ms for a 300 ms client. Compute each call's timeout from the time left.",
        },
        {
          type: "heading",
          text: "Defaults that look like real answers",
        },
        {
          type: "paragraph",
          text: "`completeOnTimeout(0)` for surge produced `surgePct=0, degraded=false`: every quote during a real surge would go out at base price with nothing flagging it. Mark fallbacks as degraded, and use `completeOnTimeout` only where a default is honest.",
        },
        {
          type: "heading",
          text: "Checking instanceof TimeoutException after a join or a later stage",
        },
        {
          type: "paragraph",
          text: "Only the stage that `orTimeout` completed holds the bare `TimeoutException`; `join` and every later stage see `CompletionException(TimeoutException)`. Unwrap first, as `FanoutFallbacks.unwrap` does.",
        },
        {
          type: "heading",
          text: "A shared pool, or a pool with an unbounded queue, as the bulkhead",
        },
        {
          type: "paragraph",
          text: "A slow dependency fills a shared pool, and everything else queues behind it: fare p50 went from 80 ms to 1,232 ms in `SharedVsBulkhead` with fare perfectly healthy. Give each dependency its own threads and a small queue with `AbortPolicy`.",
        },
        {
          type: "heading",
          text: "Retrying immediately, forever, or by sleeping",
        },
        {
          type: "paragraph",
          text: "Immediate retries hit an overloaded service again at the worst moment, retries without a limit or budget turn an outage into a traffic multiplier, and `Thread.sleep` between attempts holds a thread per retrying request. Back off with jitter on `delayedExecutor`, stop at the deadline, and only retry idempotent calls.",
        },
        {
          type: "heading",
          text: "Virtual threads with no limit on the dependency",
        },
        {
          type: "paragraph",
          text: "The pool size used to cap concurrency to the downstream service; with a virtual thread per task, `ExecutorChoice` sent 1,000 calls at once. Put a `Semaphore` per dependency in front of the call.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "For every call in a fan-out, decide and write down: essential or optional, timeout, fallback, and whether a fallback marks the response degraded.",
            "Create a deadline when the request arrives (minus a margin for writing the response), and derive every call's timeout from it; pass the remaining time to downstream services in a header.",
            "Pass an executor to every `*Async` method that can block, and give each dependency its own bounded pool or semaphore, with a rejection that becomes an instant fallback.",
            "Keep callbacks attached to a future with a timeout trivial; for anything else use `exceptionallyAsync`, `handleAsync` or `thenApplyAsync` with an executor.",
            "Cancel for real: keep the `FutureTask` (or the client's own cancel handle) and cancel it when the future fails, and configure connect and read timeouts in the HTTP or JDBC client as well.",
            "Retry only idempotent calls, with exponential backoff and jitter via `delayedExecutor`, a maximum number of attempts, and the request deadline as a hard stop.",
            "Measure percentiles, not averages: p50 hides the tail that timeouts and bulkheads exist to fix. Record p99 per dependency and per request, plus counts of timeouts, rejections and degraded responses.",
            "In thread dumps, check where `CompletableFutureDelayScheduler` is. Anywhere other than `DelayedWorkQueue.take` means a callback is holding every timer in the JVM.",
            "On Java 21, prefer virtual threads for large numbers of blocking calls, with an explicit semaphore per dependency; keep CPU-bound work on a pool sized to cores.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Timeouts aren't free: each one is a heap insert under a lock on a queue shared by the whole JVM, and a removal when the call finishes on time. Best of five rounds of a million futures, then 1 and 8 threads arming timeouts at once, then the memory of 200,000 pending timeouts:",
        },
        {
          type: "code",
          language: "java",
          title: "TimeoutCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class TimeoutCost {
    static final int N = 1_000_000;

    static long usedKb() {
        System.gc();
        return ManagementFactory.getMemoryMXBean().getHeapMemoryUsage().getUsed() >> 10;
    }

    // create, (optionally) arm a timeout, complete normally: the common case of a call that is on time
    static double nsPerFuture(boolean withTimeout) {
        long best = Long.MAX_VALUE;
        for (int round = 0; round < 5; round++) {
            long t = System.nanoTime();
            for (int i = 0; i < N; i++) {
                CompletableFuture<Integer> f = new CompletableFuture<>();
                if (withTimeout) f.orTimeout(10, TimeUnit.SECONDS);
                f.complete(i);
            }
            best = Math.min(best, System.nanoTime() - t);
        }
        return (double) best / N;
    }

    public static void main(String[] args) {
        System.out.printf("new + complete                    %6.1f ns%n", nsPerFuture(false));
        System.out.printf("new + orTimeout(10 s) + complete  %6.1f ns%n", nsPerFuture(true));

        for (int threads : new int[] {1, 8}) {                   // all threads share one DelayedWorkQueue lock
            long best = Long.MAX_VALUE;
            for (int round = 0; round < 3; round++) {
                Thread[] ts = new Thread[threads];
                long t = System.nanoTime();
                for (int k = 0; k < threads; k++) {
                    ts[k] = new Thread(() -> {
                        for (int i = 0; i < 400_000; i++) new CompletableFuture<Integer>().orTimeout(10, TimeUnit.SECONDS).complete(i);
                    });
                    ts[k].start();
                }
                for (Thread th : ts) try { th.join(); } catch (InterruptedException e) { }
                best = Math.min(best, System.nanoTime() - t);
            }
            System.out.printf("%d thread(s) arming timeouts: %,6.0f timeouts per ms in total%n", threads, 400_000.0 * threads / (best / 1e6));
        }

        long before = usedKb();
        CompletableFuture<?>[] pending = new CompletableFuture<?>[200_000];
        for (int i = 0; i < pending.length; i++) pending[i] = new CompletableFuture<>().orTimeout(60, TimeUnit.SECONDS);
        long armed = usedKb();
        for (CompletableFuture<?> f : pending) f.complete(null);
        long done = usedKb();
        System.out.printf("200,000 pending timeouts: +%,d KB (%d bytes each, future included); after completing them: +%,d KB%n",
                armed - before, (armed - before) * 1024 / pending.length, done - before);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx512m TimeoutCost.java",
        },
        {
          type: "output",
          text: `new + complete                      19.0 ns
new + orTimeout(10 s) + complete   635.3 ns
1 thread(s) arming timeouts:  1,869 timeouts per ms in total
8 thread(s) arming timeouts:  3,196 timeouts per ms in total
200,000 pending timeouts: +45,984 KB (235 bytes each, future included); after completing them: +7,767 KB`,
        },
        {
          type: "list",
          items: [
            "**An on-time call with a timeout cost about 600 ns more than one without** (580 to 667 ns against 16 to 22 ns over three runs): allocating the `Timeout`, `ScheduledFutureTask`, `Canceller` and `whenComplete` stage, taking the queue's lock to insert into the heap, and taking it again to remove the cancelled timer. Next to a network call of milliseconds, that's nothing; it matters only if you put timeouts on in-memory work millions of times a second.",
            "**Eight threads arming timeouts got 1.7 times the throughput of one, not 8 times.** All timers in the JVM go through one `DelayedWorkQueue` guarded by one `ReentrantLock`. At thousands of requests per second with three timeouts each, that's still far below the limit; at a million a second it becomes a contention point.",
            "**Each pending timeout cost about 233 bytes** (231 to 235 over three runs), including the future itself, the timer task and its heap slot. After completing them, 7.6 MB remained: 200,000 completed futures still referenced from my array. The timers themselves were gone, thanks to `removeOnCancel`.",
            "**How late do timeouts fire?** With 2,000 timeouts of 10 to 100 ms armed over about 100 ms, a separate run measured them firing late by a median of 71 to 546 microseconds and a p99 of 0.3 to 5.2 ms over three runs, with a worst case of 5 to 10 ms, and never early. On a busy machine a timeout is a lower bound plus a few milliseconds, until something blocks the scheduler thread, and then it's unbounded, as `SlowFallbackStall` showed.",
            "These are single-machine `System.nanoTime` measurements taken while other processes were running, not JMH. The shape (hundreds of nanoseconds per timeout, one shared lock, a couple of hundred bytes each) was the same in every run.",
          ],
        },
      ],
    },
    {
      title: "Timeouts and Executors in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing quote API fans out to fare, ETA and surge for every \"Where to?\" search. It was written with `supplyAsync` and no executor, so all three blocking HTTP calls ran on the common pool, and the quote waited for `allOf`. One Friday evening the surge service's database slowed down and its calls went from 40 ms to 1.5 s. Within a minute, quote p50 went from about 300 ms to over 5 seconds, riders saw spinners in every city including ones with no surge at all, and fare and ETA dashboards were green. I rebuilt it at 40 quotes a second for one second, before and after the fix (bulkheads, per-call timeouts within a 300 ms budget, fallbacks, and cancellation that interrupts the abandoned call):",
        },
        {
          type: "code",
          language: "java",
          title: "RideQuoteApi.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;

public class RideQuoteApi {
    record Quote(long paise, Integer etaMin, Integer surgePct, boolean degraded) { }

    static volatile long surgeMs = 40;                       // the incident: 1,500
    static volatile boolean cancelOnTimeout = true;

    static long fareSvc()  { sleep(80);  return 18_000; }
    static int etaSvc()    { sleep(120); return 7; }
    static int surgeSvc()  { sleep(surgeMs); return 20; }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { throw new RuntimeException("interrupted", e); }
    }

    // BEFORE: everything on the common pool, no timeouts, wait for all three
    static CompletableFuture<Quote> quoteBefore() {
        var fare = CompletableFuture.supplyAsync(RideQuoteApi::fareSvc);
        var eta = CompletableFuture.supplyAsync(RideQuoteApi::etaSvc);
        var surge = CompletableFuture.supplyAsync(RideQuoteApi::surgeSvc);
        return CompletableFuture.allOf(fare, eta, surge)
                .thenApply(v -> new Quote(fare.join(), eta.join(), surge.join(), false));
    }

    // AFTER: a bounded pool per dependency, a timeout per call, a fallback per optional call,
    // and a timeout that interrupts the call it gave up on
    static ThreadPoolExecutor bulkhead(String name, int threads, int queue) {
        AtomicInteger n = new AtomicInteger();
        return new ThreadPoolExecutor(threads, threads, 0, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(queue),
                r -> new Thread(r, name + "-" + n.incrementAndGet()), new ThreadPoolExecutor.AbortPolicy());
    }
    static final ThreadPoolExecutor FARE_IO = bulkhead("fare-io", 8, 16);
    static final ThreadPoolExecutor ETA_IO = bulkhead("eta-io", 8, 16);
    static final ThreadPoolExecutor SURGE_IO = bulkhead("surge-io", 4, 4);

    static final AtomicInteger SURGE_REJECTED = new AtomicInteger(), SURGE_TIMED_OUT = new AtomicInteger();

    static <T> CompletableFuture<T> call(ExecutorService pool, Callable<T> c, long timeoutMs) {
        CompletableFuture<T> cf = new CompletableFuture<>();
        try {
            Future<?> task = pool.submit(() -> {
                try { cf.complete(c.call()); } catch (Throwable t) { cf.completeExceptionally(t); }
            });
            cf.orTimeout(timeoutMs, TimeUnit.MILLISECONDS)
              .whenComplete((v, ex) -> { if (ex != null && cancelOnTimeout) task.cancel(true); });
        } catch (RuntimeException rejected) {                     // bulkhead full: fail fast
            cf.completeExceptionally(rejected);
        }
        return cf;
    }

    static CompletableFuture<Quote> quoteAfter() {
        var fare = call(FARE_IO, RideQuoteApi::fareSvc, 300);
        var eta = call(ETA_IO, RideQuoteApi::etaSvc, 250).exceptionally(ex -> null);
        var surge = call(SURGE_IO, RideQuoteApi::surgeSvc, 150).exceptionally(ex -> {
            (ex instanceof java.util.concurrent.RejectedExecutionException ? SURGE_REJECTED : SURGE_TIMED_OUT).incrementAndGet();
            return null;
        });
        return CompletableFuture.allOf(fare, eta, surge)
                .thenApply(v -> new Quote(fare.join(), eta.join(), surge.join(), eta.join() == null || surge.join() == null));
    }

    static void load(String label, boolean after) {
        List<Long> latencies = Collections.synchronizedList(new ArrayList<>());
        AtomicInteger degraded = new AtomicInteger(), failed = new AtomicInteger();
        SURGE_REJECTED.set(0);
        SURGE_TIMED_OUT.set(0);
        List<CompletableFuture<?>> all = new ArrayList<>();
        long start = System.nanoTime();
        for (int i = 0; i < 40; i++) {                            // 40 quotes a second for 1 second
            long arrival = start + i * 25_000_000L;
            LockSupport.parkNanos(arrival - System.nanoTime());
            all.add((after ? quoteAfter() : quoteBefore()).whenComplete((q, ex) -> {
                latencies.add((System.nanoTime() - arrival) / 1_000_000);
                if (ex != null) failed.incrementAndGet(); else if (q.degraded()) degraded.incrementAndGet();
            }).exceptionally(ex -> null));
        }
        CompletableFuture.allOf(all.toArray(CompletableFuture[]::new)).join();
        List<Long> s = new ArrayList<>(latencies);
        Collections.sort(s);
        System.out.printf("%-30s p50 %5d  p90 %5d  p99 %5d  max %5d ms | served %d, degraded %d, failed %d%n", label,
                s.get(s.size() / 2), s.get((int) (s.size() * 0.9)), s.get((int) Math.ceil(s.size() * 0.99) - 1),
                s.get(s.size() - 1), s.size() - failed.get(), degraded.get(), failed.get());
        if (after && SURGE_REJECTED.get() + SURGE_TIMED_OUT.get() > 0)
            System.out.printf("%-30s surge calls timed out %d, rejected by the full bulkhead %d%n", "",
                    SURGE_TIMED_OUT.get(), SURGE_REJECTED.get());
    }

    public static void main(String[] args) throws Exception {
        load("warm-up", true);
        Thread.sleep(2_000);
        for (boolean after : new boolean[] {false, true}) {
            surgeMs = 40;
            load((after ? "after, " : "before, ") + "healthy", after);
            Thread.sleep(2_000);                                 // let leftover calls drain
            surgeMs = 1_500;
            load((after ? "after, " : "before, ") + "surge at 1.5 s", after);
            Thread.sleep(2_000);
        }
        cancelOnTimeout = false;                                 // same bulkheads, but a timeout only abandons the call
        load("after without cancel, surge", true);
        FARE_IO.shutdownNow(); ETA_IO.shutdownNow(); SURGE_IO.shutdownNow();
    }
}`,
        },
        {
          type: "output",
          text: `warm-up                        p50   120  p90   123  p99   141  max   141 ms | served 40, degraded 0, failed 0
before, healthy                p50   301  p90   447  p99   477  max   477 ms | served 40, degraded 0, failed 0
before, surge at 1.5 s         p50  5176  p90  8934  p99  9462  max  9462 ms | served 40, degraded 0, failed 0
after, healthy                 p50   120  p90   121  p99   123  max   123 ms | served 40, degraded 0, failed 0
after, surge at 1.5 s          p50   150  p90   150  p99   150  max   150 ms | served 40, degraded 40, failed 0
                               surge calls timed out 40, rejected by the full bulkhead 0
after without cancel, surge    p50   120  p90   150  p99   151  max   151 ms | served 40, degraded 40, failed 0
                               surge calls timed out 8, rejected by the full bulkhead 32`,
        },
        {
          type: "list",
          items: [
            "**Before, even the healthy case was slow: p50 301 to 318 ms over six runs**, for calls whose slowest part is 120 ms. 40 quotes a second times three blocking calls is 120 calls, about 9.6 thread-seconds of waiting per second, on a pool of 7 threads. The common pool was already saturated on a normal day; nobody noticed because nothing timed out.",
            "**During the incident, p50 was 5,175 to 5,187 ms and p99 9,455 to 9,462 ms.** Every quote waited for its own 1.5 s surge call, and every surge call waited for a common-pool thread held by earlier surge calls. Fare and ETA were healthy and still took seconds, because they queued in the same 7 threads. That's why their dashboards were green while riders waited.",
            "**After: p50 120 ms healthy, 150 ms during the incident.** Fare and ETA ran on their own pools and answered on time; surge timed out at 150 ms and the quote went out with `degraded=true` (the app shows \"prices may be higher\"). Every one of the 40 quotes was served. With only 40 samples per run, p99 is the slowest request, so I'd want thousands of requests before trusting a p99 in production; here it's 120 to 130 ms healthy and 150 to 154 ms during the incident across five runs.",
            "**Cancellation kept the surge bulkhead usable.** With `cancel(true)`, all 40 surge calls were tried and timed out (each `surge-io` thread was freed at 150 ms). Without it, the 4 threads stayed stuck in 1.5 s calls, 4 more calls sat in the queue until they timed out, and the other 32 were rejected instantly. Latency looked even better (p50 120 ms, because rejections are instant), but the service had stopped calling surge at all, so the moment surge recovered, quotes would keep missing surge until the stuck calls drained. With cancellation, the next call after recovery gets through.",
            "**What I'd check first in a real incident:** a thread dump. All `ForkJoinPool.commonPool-worker` threads inside a socket read for one host is this exact bug. Then per-dependency p99 and timeout counts, which point at the one slow dependency even when it isn't the one that looks slow.",
            "**What prevents it next time:** a lint or ArchUnit rule that forbids `supplyAsync`/`runAsync` without an executor in service code, a bulkhead per dependency created from configuration (threads, queue, timeout), a request deadline in the HTTP filter, and an alert on degraded-response rate, not just on errors.",
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
              question: "What's the difference between orTimeout and completeOnTimeout?",
              answer:
                "Both act if the future is still pending after the given time. `orTimeout` completes it exceptionally with a `TimeoutException`; `completeOnTimeout(value, ...)` completes it normally with `value`. Both return the **same** future, not a new stage. `orTimeout` suits essential calls and fallbacks that mark the response degraded; `completeOnTimeout` suits honest defaults like \"no answer, leave it out\", and is risky when the default could be mistaken for real data, like 0% surge.",
            },
            {
              question: "What's the difference between future.get(1, SECONDS) and future.orTimeout(1, SECONDS)?",
              answer:
                "`get(timeout)` blocks the calling thread for at most a second and throws `TimeoutException` to that caller, but leaves the future pending. `orTimeout` doesn't block anyone: it schedules a timer that completes the future itself exceptionally, so every dependent stage sees the timeout. In my tour, `get(50 ms)` threw and `isDone()` was still `false` afterwards.",
            },
            {
              question: "Does a timeout stop the task that was computing the value?",
              answer:
                "No. It only completes the future. The thread keeps running the call until it returns, and its result is discarded. In my test the only `surge-io` thread stayed busy until 1,024 ms after a 150 ms timeout. To stop the work you need the handle of the work itself (the `FutureTask` from `ExecutorService.submit`) and `cancel(true)` on it, and the work must respond to interrupts, or a client-level I/O timeout.",
            },
            {
              question: "Why shouldn't you run blocking calls on the common ForkJoinPool?",
              answer:
                "It has only `cores - 1` threads (7 on 8 cores) and is shared by the whole JVM: parallel streams, libraries, and every `*Async` call without an executor. Blocking calls hold those threads idle. In my test, 42 blocking calls of 100 ms took 600 ms on it, and an unrelated parallel stream waited 601 ms. The pool doesn't add threads for plain blocking calls, only for `ForkJoinPool.managedBlock`.",
            },
            {
              question: "What is a fallback, and what makes a response \"degraded\"?",
              answer:
                "A fallback is what you return when a call fails or times out: a default, a cached value, or nothing. A degraded response is one built with at least one fallback, marked so the client and the metrics know it's partial. In my quote, a slow ETA produced `etaMin=null, degraded=true` in about 250 ms instead of waiting 2 s, and a slow fare (essential) produced a 503.",
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
              question: "Which thread fires orTimeout, and why does that matter?",
              answer:
                "A single daemon thread named `CompletableFutureDelayScheduler`, the one core thread of a static `ScheduledThreadPoolExecutor` in `CompletableFuture$Delayer`, created on first use and shared by the whole JVM. `Timeout.run` calls `completeExceptionally` on that thread, so every non-async callback on the future runs there too. A slow fallback in `exceptionally` blocks every other timeout: mine made an unrelated 200 ms timeout fire at 1,106 ms. Use `exceptionallyAsync(fn, executor)` for anything non-trivial.",
            },
            {
              question: "How does orTimeout avoid leaking a timer for every call that completes on time?",
              answer:
                "It attaches a `Canceller` with `whenComplete`. When the future completes for any reason, the `Canceller` calls `cancel(false)` on the scheduled timer, and the `Delayer`'s executor has `setRemoveOnCancelPolicy(true)`, so the cancelled task is removed from the delay queue immediately. In my reflection test, 10,001 pending timers dropped by exactly 5,000 when 5,000 futures completed on time.",
            },
            {
              question: "How would you make sure a fan-out request never exceeds its SLA?",
              answer:
                "Fix a deadline when the request arrives, minus a margin for writing the response, and give every call a timeout of `min(its own cap, time remaining)`, including sequential steps and retries. With fixed per-call timeouts my quote replied at 391 and 441 ms against a 300 ms client; with a budget every reply left within 282 ms, some degraded and one as a fast 503. Across services, propagate the remaining time (gRPC does this with `grpc-timeout`).",
            },
            {
              question: "What is a bulkhead, and how do you build one in Java?",
              answer:
                "Isolation per dependency, so one slow dependency can't use up resources the others need. In Java: a `ThreadPoolExecutor` per dependency with a fixed size, a small bounded queue and `AbortPolicy`, or a `Semaphore` per dependency (which works well with virtual threads). In my test, a shared 16-thread pool pushed a healthy fare call to p50 1,232 ms during a surge incident; separate pools kept it at 80 ms and rejected 32 surge calls instantly.",
            },
            {
              question: "How do you implement retries with backoff using CompletableFuture without blocking threads?",
              answer:
                "`exceptionallyCompose` on the attempt, and in it, return the next attempt scheduled through `CompletableFuture.delayedExecutor(delay, unit, executor)`. The delay is held as a timer by the scheduler thread, which only hands the task to your executor (`TaskSubmitter`), so no thread waits between attempts. Use exponential backoff with jitter, a maximum number of attempts, and stop when the next attempt wouldn't fit in the deadline. Only retry idempotent operations.",
            },
            {
              question: "When are virtual threads the right executor, and what do they not solve?",
              answer:
                "For large numbers of blocking calls: 1,000 blocking 50 ms calls took 91 ms on virtual threads with 22 platform threads in the JVM, against 7.2 s on the common pool. They don't speed up CPU-bound work (no executor won my CPU test), and they remove the accidental concurrency limit a pool gave you: the downstream saw 1,000 calls at once. Add a `Semaphore` per dependency; with `Semaphore(100)` the calls took 511 ms with at most 100 in flight.",
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
              question: "Walk through what happens inside the JDK when you call orTimeout(150, MILLISECONDS) on a pending future.",
              answer:
                "If `result` is already non-null it returns immediately. Otherwise it creates `new Timeout(this)` and calls `Delayer.delay`, which is `delayer.schedule(task, 150, MILLISECONDS)` on the static `ScheduledThreadPoolExecutor` (one core thread, daemon, named `CompletableFutureDelayScheduler`, `removeOnCancel` on). That inserts a `ScheduledFutureTask` into the `DelayedWorkQueue` heap under its lock and signals the scheduler if it's the new earliest. Then it wraps the returned `ScheduledFuture` in a `Canceller` and attaches it with `whenComplete`, and returns `this`. When due, `Timeout.run` checks `isDone()` and calls `completeExceptionally(new TimeoutException())`, running `postComplete` on the scheduler thread. If the future completes first, the `Canceller` cancels and removes the timer.",
            },
            {
              question: "CompletableFuture.cancel(true) doesn't interrupt anything. How do you build cancellation that stops the running work?",
              answer:
                "Don't create the work with `supplyAsync`; submit it with `ExecutorService.submit`, keep the returned `Future` (a `FutureTask` that knows its runner thread), and complete a separate `CompletableFuture` from inside the task. Attach `whenComplete((v, ex) -> { if (ex != null) task.cancel(true); })`. On timeout, `FutureTask.cancel(true)` interrupts the worker. In my test the call was interrupted at 152 ms instead of finishing at 1,000, and the next request started at once. It only works if the work is interruptible, so I also set client-level I/O timeouts.",
            },
            {
              question: "How expensive is a timeout, and when would it become a bottleneck?",
              answer:
                "I measured about 600 ns per on-time call (create, schedule, cancel and remove) against about 20 ns without a timeout, and about 233 bytes per pending timeout including the future. All timers share one `DelayedWorkQueue` and its lock: eight threads arming timeouts got only 1.7 times the throughput of one. For network calls that's negligible; it matters for in-memory work at millions of operations a second, or when callbacks block the single scheduler thread.",
            },
            {
              question: "What's a hedged request, and when would you not use one?",
              answer:
                "Send a second copy of a call if the first hasn't answered by about its p95 latency, and take whichever answers first (`applyToEither`), scheduling the hedge with `delayedExecutor`. With 5% of ETA calls taking 400 ms, hedging at 60 ms cut p99 from about 401 ms to 95 to 100 ms for about 5% more calls. Don't hedge non-idempotent operations, very expensive calls, or a dependency that's slow because it's overloaded, where extra calls make it worse.",
            },
            {
              question: "Why might p50 latency improve when you remove cancellation from a bulkheaded fan-out, and why is that misleading?",
              answer:
                "Without cancellation, timed-out calls keep their threads, the bulkhead fills, and later calls are rejected instantly, which is faster than waiting for a timeout. My run showed p50 120 ms without cancellation against 150 ms with it, with 32 of 40 surge calls rejected outright. But the service has effectively stopped calling the dependency, and it can't benefit when the dependency recovers until the stuck calls drain. Watch timeout and rejection counts alongside latency.",
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
              question: "Your quote service has 200 ms timeouts on every downstream call, but during an incident, latency graphs show requests timing out after 1 to 2 seconds. CPU is low. What do you look at?",
              answer:
                "The `CompletableFutureDelayScheduler` thread in a thread dump. If it's anywhere other than `DelayedWorkQueue.take`, it's running a callback, and every timeout in the JVM is waiting behind it. The usual cause is a fallback or `whenComplete` attached with a non-async method that does I/O (a cache read, a DB call, logging to a stuck appender). In `SlowFallbackStall` a 1 s fallback made a 200 ms timeout fire at 1,103 to 1,106 ms. Fix: `exceptionallyAsync`/`handleAsync` with an executor for anything non-trivial after a timeout.",
            },
            {
              question: "The surge service is slow, and you added a 150 ms timeout. Quotes are now fast, but the surge-io thread pool is constantly at 100% busy and surge calls start failing even after the surge service recovers. Why?",
              answer:
                "The timeout completes the future but doesn't stop the call: each abandoned call keeps its thread for the full slow duration, so the pool stays full of calls nobody is waiting for, and new calls queue or get rejected. In `TimeoutKeepsRunning`, the thread stayed busy until 1,024 ms after a 150 ms timeout. Fix: keep the `FutureTask` and `cancel(true)` it on timeout, and set the HTTP client's own request and read timeouts so the socket gives up too. With cancellation, my surge-io thread was free at 152 ms.",
            },
            {
              question: "After deploying a new feature that calls a slow geo service with CompletableFuture.supplyAsync, latency of unrelated endpoints that use parallel streams spikes. What happened?",
              answer:
                "`supplyAsync` without an executor runs on the common pool, which parallel streams share. The geo calls block those 7 threads, and parallel streams queue behind them; in `CommonPoolStarvation` an unrelated parallel stream waited 601 ms behind 42 blocking calls. A thread dump will show `ForkJoinPool.commonPool-worker` threads in socket reads. Fix: pass a dedicated executor (a bulkhead for the geo service) to every `*Async` call; raising common-pool parallelism is only a stopgap.",
            },
            {
              question: "Your API has a 300 ms SLA. Each downstream call has a reasonable timeout, yet the gateway logs many 504s while your service logs those same requests as successful at 350 to 450 ms. What's wrong and how do you fix it?",
              answer:
                "Timeouts are per call, not per request: a slow first step plus full-length timeouts in the fan-out add up past the SLA, so the service finishes work the client already abandoned. In `DeadlineBudget`, fixed timeouts answered at 391 and 441 ms. Fix: create a deadline at request arrival (300 ms minus a margin), give each call `min(cap, remaining)`, stop retrying when the budget is spent, and propagate the remaining time downstream. My budgeted version replied within 282 ms, sometimes degraded or as a fast 503.",
            },
            {
              question: "After moving the quote service to virtual threads, latency improved, but the ETA team reports their service is being overwhelmed by traffic spikes from you. What changed?",
              answer:
                "The old thread pool limited how many ETA calls could be in flight; a virtual thread per task has no such limit, so a burst of requests becomes a burst of simultaneous ETA calls. In `ExecutorChoice`, 1,000 tasks put 1,000 calls in flight at once. Add a `Semaphore` per dependency around the call (sized from what the dependency can take), with a timeout on `tryAcquire` so a full semaphore becomes a fast fallback. With `Semaphore(100)` the same 1,000 calls never had more than 100 in flight.",
            },
            {
              question: "During a surge-service outage, your quotes are fast and all marked degraded, but finance notices riders were charged base fares during real surge. Where would you look?",
              answer:
                "At how the surge fallback was built. `completeOnTimeout(0)` (or `exceptionally(ex -> 0)`) produces a normal-looking `surgePct=0` with `degraded=false`, as in my first fan-out run; nothing downstream can tell it was a guess. Use `orTimeout` plus a fallback that returns \"unknown\" and marks the quote degraded, and have the booking flow refuse or re-quote when surge is unknown, or use a recent cached multiplier with an age limit. Add an alert on the fallback rate.",
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
            "Run `DelayerPeek` and add `Thread.sleep(31_000)` at the end. How many tasks has the scheduler completed when the 5,000 remaining 30-second timers have fired?",
            "In `SlowFallbackStall`, change only `exceptionally` to `exceptionallyAsync(SlowFallbackStall::staleFare, fallbackPool)` in the non-async branch. When does the ETA timeout fire?",
            "In `TimeoutKeepsRunning`, replace `task.cancel(true)` with `task.cancel(false)`. What happens to `req-1` and `req-2`?",
            "Run `CommonPoolStarvation` with `-Djava.util.concurrent.ForkJoinPool.common.parallelism=64`. How long do the blocking calls and the zone recount take now?",
            "In `FanoutFallbacks`, replace surge's `completeOnTimeout(0, ...)` with `orTimeout(150, ...)`. What does the \"surge takes 1.5 s\" line print?",
            "In `RideQuoteApi`, look at the last line: \"after without cancel\". Why are exactly 8 surge calls timed out and 32 rejected?",
            "Add `System.out.println(fare.getNumberOfDependents())` to `DelayerPeek` right after the `orTimeout` call. What does it print, and why?",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 shows 5,001 completed tasks (the 200 ms timer plus the 5,000 that fired; cancelled timers never run). Step 2 makes the ETA timeout fire on time at 200 ms, the same as the `exceptionallyAsync` run in the output above, because the timer thread only hands the fallback to the pool. Step 3 brings back the original problem: `cancel(false)` doesn't interrupt, so `req-1` ran until 1,002 ms in my run, and `req-2`, already cancelled while it was queued, never started. Step 4: I measured the blocking calls at 110 ms and the recount at 9 ms, because 64 threads were enough for all 42 calls. Step 5 prints `surgePct=null, degraded=true`, about 150 ms. Step 6: 4 surge threads plus 4 queue slots hold 8 calls, all stuck in 1.5 s calls or queued behind them, so those 8 time out and every later call is rejected by `AbortPolicy`. Step 7 prints 1: nothing of mine is attached to `fare` yet, so the one dependent is the `whenComplete(Canceller)` stage that `orTimeout` pushed onto its callback stack. Every timeout adds a node to the future it guards.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `TIMER        CompletableFuture$Delayer: static ScheduledThreadPoolExecutor
             1 daemon thread "CompletableFutureDelayScheduler", lazy, JVM-wide
             removeOnCancel: on-time calls remove their timer (Canceller)
             ~600 ns + ~233 bytes per timeout; one heap, one lock

TIMEOUTS     orTimeout -> TimeoutException; completeOnTimeout -> default value
             both return THIS future; get(t) only limits the wait
             callbacks on a timed-out future run ON THE TIMER THREAD
             1 s fallback -> unrelated 200 ms timeout fired at 1,106 ms

STOP WORK    timeout != cancel: thread busy until 1,024 ms after 150 ms timeout
             keep FutureTask, cancel(true) on timeout -> freed at 152 ms
             plus client I/O timeouts (sockets ignore interrupts)

FAN-OUT      per dependency: essential? timeout? fallback? degraded flag
             completeOnTimeout(0) for surge = silent wrong price
             deadline at arrival; call timeout = min(cap, remaining)
             fixed: 314-441 ms vs 300 SLA; budget: all within 282 ms

EXECUTORS    common pool = 7 shared threads: never block on it
             bulkhead per dependency: bounded pool + small queue + Abort
             shared pool: fare p50 1,232 ms; bulkheads: 80 ms
             virtual threads: 1,000 blocking calls in 91 ms, add a Semaphore

RETRY/HEDGE  exceptionallyCompose + delayedExecutor, backoff + jitter
             hedge at ~p95: p99 401 -> ~100 ms for 5% more calls

PRODUCTION   surge at 1.5 s: p50 ~5,180 ms -> 150 ms, 40/40 served, degraded`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A timeout in `CompletableFuture` is a timer on one JVM-wide thread that completes the future and then runs its plain callbacks. It doesn't stop the work, so keep callbacks trivial (or async), and pair every timeout with a real cancellation of the call and a client-level I/O timeout.",
            "Resilience in a fan-out is a set of per-dependency decisions: its own bounded executor, its own timeout derived from the request's deadline, its own fallback that marks the response degraded, and retries or hedges only where calls are idempotent. Measured with percentiles, that turned a 5-second outage into 150 ms degraded quotes.",
            "Next comes ThreadLocal, InheritableThreadLocal and Leaks in Pools: the fan-out in this lesson runs on three executors, so the rider and trace ID set on the request thread are missing on every one of them. How per-thread variables work inside `Thread`, why they leak in pools, and how to carry context across an executor without leaking it.",
          ],
        },
      ],
    },
  ],
};
