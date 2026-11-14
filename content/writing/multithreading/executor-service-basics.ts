import type { Lesson } from "../types";

export const executorServiceBasics: Lesson = {
  slug: "executor-service-basics",
  date: "2026-11-14",
  title: "ExecutorService, Callable and Future",
  description:
    "Thread pools from the API side on JDK 21, measured: why reusing threads made 20,000 tiny tasks over 100 times faster than starting a thread for each, what every Executors factory really builds (an unbounded LinkedBlockingQueue behind newFixedThreadPool, Integer.MAX_VALUE threads behind newCachedThreadPool), FutureTask's seven states, execute() killing and replacing a worker while submit() hides the same exception until get(), get with a timeout, cancel(true) that interrupts and the busy loop it can't stop, invokeAll and invokeAny, shutdown, shutdownNow, awaitTermination and close(), a JVM that never exits because of one forgotten pool, 1,000 leaked threads from a pool per request, scheduleAtFixedRate against scheduleWithFixedDelay timed to the millisecond, and a fare-sync job in a ride-hailing backend that silently stopped forever after one exception.",
  tags: ["Multithreading", "ExecutorService", "Future", "Thread Pools"],
  sections: [
    {
      title: "What ExecutorService, Callable and Future Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, CAS, Atomic Classes, LongAdder and VarHandle, finished the toolkit for protecting shared state: locks, `volatile`, and lock-free updates. All of the lessons so far started their threads by hand with `new Thread(...).start()`. That's fine for learning, and the first lesson, Processes, Threads and Creating Threads, measured why it's wrong for a server: every platform thread is an OS thread with its own stack, and starting and joining one cost about 100 microseconds there, plus about 100 KB of resident memory while it lives. A backend that handles thousands of small jobs a second can't pay that for every job, and it can't let the number of threads grow with the traffic.",
        },
        {
          type: "paragraph",
          text: "An **executor** separates *what* to run from *how* it runs. Code hands a task to an `Executor`, and the executor decides which thread runs it and when. An `ExecutorService` is an executor with a lifecycle (it can be shut down and waited for) that returns a `Future` for every task. A **`Callable`** is a task that returns a value and may throw a checked exception, unlike `Runnable`. A **`Future`** is the handle to a result that may not exist yet: it can be waited on (`get`), with a timeout, checked (`isDone`), or cancelled (`cancel`). Most executors are **thread pools**: a fixed set of threads that take tasks from a queue and run them one after another, so the cost of creating a thread is paid once, not once per task.",
        },
        {
          type: "paragraph",
          text: "This lesson covers the API that application code uses every day, and the behaviour that surprises people in production: what each `Executors` factory really builds, where exceptions go, how cancellation and shutdown work, why a JVM sometimes refuses to exit, and how scheduled tasks behave when they're slow or when they throw. The next lesson opens up `ThreadPoolExecutor` itself: its queues, rejection policies and sizing.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Before Java 5, every team wrote its own thread pool, usually a `List<Thread>` around a `wait`/`notify` queue, often with bugs. Doug Lea had published a well-tested set of concurrency utilities (`EDU.oswego.cs.dl.util.concurrent`) in the late 1990s, and JSR 166, led by him, brought a redesigned version into the JDK as `java.util.concurrent` in Java 5. `Executor`, `ExecutorService`, `Callable`, `Future`, `ThreadPoolExecutor` and the `Executors` factory class all arrived together, and most of today's API is still that original design.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`Thread`, `Runnable`, `wait`/`notify`", "Every pool was hand-written"],
            ["Java 5 (2004)", "JSR 166: `Executor`, `ExecutorService`, `ScheduledExecutorService`, `Callable`, `Future`, `FutureTask`, `ThreadPoolExecutor`, `Executors`, `CompletionService`", "The API in this lesson"],
            ["Java 6 (2006)", "`AbstractExecutorService.newTaskFor`, `RunnableFuture`", "Pools can customise the `Future` they return"],
            ["Java 7 (2011)", "`ForkJoinPool` (JSR 166y)", "Work-stealing for divide-and-conquer tasks"],
            ["Java 8 (2014)", "`Executors.newWorkStealingPool`, `CompletableFuture`, the common pool used by parallel streams", "A `Future` you can chain instead of blocking on"],
            ["Java 19 (2022)", "`ExecutorService` extends `AutoCloseable` (`close()` waits for tasks); `Future.state()`, `resultNow()`, `exceptionNow()`", "try-with-resources for pools"],
            ["Java 21 (2023)", "Virtual threads final (JEP 444): `Executors.newVirtualThreadPerTaskExecutor()`", "A thread per task becomes cheap again, for blocking work"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the kitchen of a cloud restaurant in Salt Lake that cooks for a food-delivery app.",
        },
        {
          type: "list",
          items: [
            "**Starting a thread per task is hiring a cook for every order**: interview, uniform, induction, then one dish, then the cook goes home. A thread pool is a kitchen with a fixed crew of cooks who take order tickets from a rail, one after another.",
            "**`execute(order)`** is pinning a ticket on the rail and walking away. **`submit(order)`** is pinning the ticket and getting a numbered token back: the `Future`. With the token you can wait at the counter (`get`), wait at most five minutes (`get(timeout)`), ask whether it's ready (`isDone`) or cancel it (`cancel`).",
            "**When a dish burns**: with `execute`, the cook storms out of the kitchen shouting (the stack trace) and the manager hires a replacement. With `submit`, the burnt dish is quietly put in a box with your token number on it. Nobody shouts. You only find out when you come to collect it, and if you never come, nobody ever knows.",
            "**`shutdown()`** is closing the doors at 11 pm: no new orders, but every ticket already on the rail gets cooked. **`shutdownNow()`** is a fire alarm: cooks drop what they're doing and the unstarted tickets are handed back to the manager.",
            "**A scheduled task** is a cook who checks the stock every 15 minutes. If that cook has an accident once, `scheduleAtFixedRate` doesn't send anyone else: the stock is simply never checked again.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real cook told to stop will stop. A Java thread can only be *asked* to stop, by interrupting it, and the task code has to notice the request. A task stuck in a loop that never checks the interrupt keeps running after `cancel(true)` and after `shutdownNow()`, and the \"cancelled\" `Future` says it's done while the work is still going.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/executor-service-basics-task-flow.svg",
          alt: "Top row, left to right: the caller thread calls pool.submit(task) and gets a Future back at once; the task is wrapped in a FutureTask, which holds the callable, the outcome, the runner thread and the waiters, with state NEW; the FutureTask goes into the work queue, a LinkedBlockingQueue for newFixedThreadPool, or straight to a new worker; the worker thread pool-1-thread-1 runs runWorker, taking tasks from the queue and calling run, and parks in take when idle. Middle left: when a task passed to execute throws, the exception escapes runWorker, the worker thread dies, the uncaught exception handler prints the stack trace to stderr, and the pool starts pool-1-thread-2 as a replacement. Middle right: when a task passed to submit throws, FutureTask.run catches it with setException, the state becomes EXCEPTIONAL, the thread lives on, nothing is printed, and only get reveals the exception as an ExecutionException; periodic tasks just stop. Bottom: the FutureTask states from javap: NEW 0 goes to COMPLETING 1 and then NORMAL 2 or EXCEPTIONAL 3; NEW can also go to CANCELLED 4 with cancel(false), or to INTERRUPTING 5 and then INTERRUPTED 6 with cancel(true). NORMAL, EXCEPTIONAL, CANCELLED and INTERRUPTED are final.",
          caption: "submit() turns every task into a FutureTask, and that wrapper is where results, exceptions and cancellation live.",
        },
        {
          type: "heading",
          text: "The interfaces",
        },
        {
          type: "table",
          headers: ["Interface", "Adds", "Key methods"],
          rows: [
            ["`Executor`", "Run a `Runnable` somehow", "`execute(Runnable)`"],
            ["`ExecutorService`", "Results, bulk submission, lifecycle, `AutoCloseable` (19+)", "`submit`, `invokeAll`, `invokeAny`, `shutdown`, `shutdownNow`, `awaitTermination`, `isShutdown`, `isTerminated`, `close`"],
            ["`ScheduledExecutorService`", "Delayed and periodic tasks", "`schedule`, `scheduleAtFixedRate`, `scheduleWithFixedDelay`"],
            ["`Callable<V>`", "A task that returns `V` and may throw `Exception`", "`V call() throws Exception`"],
            ["`Future<V>`", "A handle to a pending result", "`get`, `get(timeout, unit)`, `cancel`, `isDone`, `isCancelled`, `state`, `resultNow`, `exceptionNow`"],
            ["`ScheduledFuture<V>`", "A `Future` with a delay", "`getDelay(unit)`"],
            ["`CompletionService<V>`", "Results in completion order", "`submit`, `take`, `poll`"],
          ],
        },
        {
          type: "heading",
          text: "What the Executors factories build",
        },
        {
          type: "table",
          headers: ["Factory", "Really builds", "Threads", "Queue", "Watch out for"],
          rows: [
            ["`newFixedThreadPool(n)`", "`ThreadPoolExecutor`", "Exactly `n`, created lazily", "Unbounded `LinkedBlockingQueue`", "The queue grows without limit under overload"],
            ["`newCachedThreadPool()`", "`ThreadPoolExecutor`", "0 to `Integer.MAX_VALUE`, idle ones die after 60 s", "`SynchronousQueue` (no capacity)", "One new thread per concurrent task, without limit"],
            ["`newSingleThreadExecutor()`", "`ThreadPoolExecutor` hidden in a wrapper", "1", "Unbounded `LinkedBlockingQueue`", "Can't be cast or resized; same unbounded queue"],
            ["`newScheduledThreadPool(n)`", "`ScheduledThreadPoolExecutor`", "`n` core (max is `Integer.MAX_VALUE` but never used)", "`DelayedWorkQueue` (a heap ordered by time)", "Exceptions silently stop periodic tasks"],
            ["`newWorkStealingPool()`", "`ForkJoinPool`, async mode", "Parallelism = number of cores", "One deque per worker", "Daemon threads: the JVM won't wait for them"],
            ["`newVirtualThreadPerTaskExecutor()`", "`ThreadPerTaskExecutor`", "A new virtual thread per task, unbounded", "None", "Covered in Virtual Threads, Pinning and Structured Concurrency"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "I didn't want to trust the factory table from memory, so I asked each executor what it is. A `ThreadPoolExecutor` exposes its configuration through getters:",
        },
        {
          type: "code",
          language: "java",
          title: "WhatFactoriesBuild.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.ThreadPoolExecutor;

public class WhatFactoriesBuild {
    static void describe(String factory, ExecutorService es) {
        System.out.println(factory);
        System.out.println("  class   " + es.getClass().getName());
        if (es instanceof ThreadPoolExecutor tpe) {
            System.out.println("  core " + tpe.getCorePoolSize() + ", max " + tpe.getMaximumPoolSize()
                    + ", keepAlive " + tpe.getKeepAliveTime(java.util.concurrent.TimeUnit.SECONDS) + "s"
                    + ", queue " + tpe.getQueue().getClass().getSimpleName()
                    + " (remaining capacity " + tpe.getQueue().remainingCapacity() + ")"
                    + ", handler " + tpe.getRejectedExecutionHandler().getClass().getSimpleName());
        } else if (es instanceof ForkJoinPool fjp) {
            System.out.println("  parallelism " + fjp.getParallelism() + ", asyncMode " + fjp.getAsyncMode());
        }
        es.close();
    }

    public static void main(String[] args) {
        describe("newFixedThreadPool(4)", Executors.newFixedThreadPool(4));
        describe("newCachedThreadPool()", Executors.newCachedThreadPool());
        describe("newSingleThreadExecutor()", Executors.newSingleThreadExecutor());
        describe("newScheduledThreadPool(2)", Executors.newScheduledThreadPool(2));
        describe("newWorkStealingPool()", Executors.newWorkStealingPool());
        describe("newVirtualThreadPerTaskExecutor()", Executors.newVirtualThreadPerTaskExecutor());
        System.out.println("availableProcessors " + Runtime.getRuntime().availableProcessors());
    }
}`,
        },
        {
          type: "output",
          text: `newFixedThreadPool(4)
  class   java.util.concurrent.ThreadPoolExecutor
  core 4, max 4, keepAlive 0s, queue LinkedBlockingQueue (remaining capacity 2147483647), handler AbortPolicy
newCachedThreadPool()
  class   java.util.concurrent.ThreadPoolExecutor
  core 0, max 2147483647, keepAlive 60s, queue SynchronousQueue (remaining capacity 0), handler AbortPolicy
newSingleThreadExecutor()
  class   java.util.concurrent.Executors$AutoShutdownDelegatedExecutorService
newScheduledThreadPool(2)
  class   java.util.concurrent.ScheduledThreadPoolExecutor
  core 2, max 2147483647, keepAlive 0s, queue DelayedWorkQueue (remaining capacity 2147483647), handler AbortPolicy
newWorkStealingPool()
  class   java.util.concurrent.ForkJoinPool
  parallelism 8, asyncMode true
newVirtualThreadPerTaskExecutor()
  class   java.util.concurrent.ThreadPerTaskExecutor
availableProcessors 8`,
        },
        {
          type: "list",
          items: [
            "**`newFixedThreadPool(4)` has a queue with room for 2,147,483,647 tasks.** That's the default `LinkedBlockingQueue` capacity, `Integer.MAX_VALUE`. Nothing ever rejects a task; under overload the queue just grows on the heap. The next lesson's production story is exactly that.",
            "**`newCachedThreadPool()` has no queue at all.** A `SynchronousQueue` can't hold anything: a task is either handed directly to an idle thread or a new thread is created, up to `Integer.MAX_VALUE`. A burst of slow tasks becomes a burst of OS threads.",
            "**`newSingleThreadExecutor()` returns a wrapper**, `AutoShutdownDelegatedExecutorService`, so it can't be cast to `ThreadPoolExecutor` and reconfigured into something that isn't single-threaded. In JDK 21 the wrapper also registers a `Cleaner` that shuts the inner pool down if the wrapper becomes unreachable (older JDKs used `finalize()` for this). That's a safety net that depends on garbage collection, not a reason to skip `shutdown()`.",
            "**`newScheduledThreadPool(2)` reports a maximum of `Integer.MAX_VALUE`, which is never used.** Its queue is unbounded, and a `ThreadPoolExecutor` only adds threads above the core size when the queue is full. The next lesson shows that rule in detail.",
            "**`newWorkStealingPool()` is a `ForkJoinPool`** with parallelism equal to the number of cores (8 here) in async (FIFO) mode. Its threads are daemon threads, unlike every other pool here.",
          ],
        },
        {
          type: "heading",
          text: "submit() is execute() plus a FutureTask",
        },
        {
          type: "paragraph",
          text: "`ThreadPoolExecutor` only implements `execute(Runnable)`. `submit` is inherited from `AbstractExecutorService`, and the bytecode shows all it does:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c java.util.concurrent.AbstractExecutorService",
        },
        {
          type: "output",
          text: `  public java.util.concurrent.Future<?> submit(java.lang.Runnable);
    Code:
       0: aload_1
       1: ifnonnull     12
       4: new           #15                 // class java/lang/NullPointerException
       7: dup
       8: invokespecial #17                 // Method java/lang/NullPointerException."<init>":()V
      11: athrow
      12: aload_0
      13: aload_1
      14: aconst_null
      15: invokevirtual #18                 // Method newTaskFor:(Ljava/lang/Runnable;Ljava/lang/Object;)Ljava/util/concurrent/RunnableFuture;
      18: astore_2
      19: aload_0
      20: aload_2
      21: invokevirtual #24                 // Method execute:(Ljava/lang/Runnable;)V
      24: aload_2
      25: areturn`,
        },
        {
          type: "paragraph",
          text: "`newTaskFor` creates a `FutureTask` (a `Runnable` that is also a `Future`), `execute` queues it like any other `Runnable`, and the same object is returned as the `Future`. A `Runnable` passed to `submit` is first adapted to a `Callable` by `Executors$RunnableAdapter`, which returns the given result (here `null`). Everything a `Future` knows is stored in that `FutureTask`:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p -constants java.util.concurrent.FutureTask",
        },
        {
          type: "output",
          text: `public class java.util.concurrent.FutureTask<V> implements java.util.concurrent.RunnableFuture<V> {
  private volatile int state;
  private static final int NEW = 0;
  private static final int COMPLETING = 1;
  private static final int NORMAL = 2;
  private static final int EXCEPTIONAL = 3;
  private static final int CANCELLED = 4;
  private static final int INTERRUPTING = 5;
  private static final int INTERRUPTED = 6;
  private java.util.concurrent.Callable<V> callable;
  private java.lang.Object outcome;
  private volatile java.lang.Thread runner;
  private volatile java.util.concurrent.FutureTask$WaitNode waiters;
  private static final java.lang.invoke.VarHandle STATE;
  private static final java.lang.invoke.VarHandle RUNNER;
  private static final java.lang.invoke.VarHandle WAITERS;
  ...
  protected void set(V);
  protected void setException(java.lang.Throwable);
  public void run();
  protected boolean runAndReset();`,
        },
        {
          type: "list",
          items: [
            "**`state`** is a `volatile int` moved forward with compare-and-set through the `STATE` `VarHandle`, the technique from the previous lesson. Only one transition out of `NEW` can win, which is why a task that completes at the same moment it's cancelled ends up either completed or cancelled, never both.",
            "**`outcome`** is a plain `Object` that holds either the result or the `Throwable`. It isn't volatile: the write to `outcome` happens before the volatile write that moves `state` to `NORMAL` or `EXCEPTIONAL`, and `get()` reads `state` first, so the visibility rule from volatile, Visibility and the Java Memory Model makes the result safe to read.",
            "**`runner`** is the thread currently running the task. `cancel(true)` interrupts exactly that thread.",
            "**`waiters`** is a lock-free stack (a Treiber stack, pushed with CAS) of threads blocked in `get()`. When the task finishes, `finishCompletion()` pops each one and unparks it with `LockSupport.unpark`.",
            "**`run()`** calls `callable.call()` inside a `try`/`catch (Throwable)`: success goes to `set(result)`, failure goes to `setException(ex)`. That `catch` is where every exception from a submitted task disappears from view. **`runAndReset()`** is the variant for periodic tasks: it runs the task without setting a result, so the task can run again, and returns `false` if the task threw.",
          ],
        },
        {
          type: "heading",
          text: "What an idle pool thread is doing",
        },
        {
          type: "paragraph",
          text: "A pool thread is a loop: take a task from the queue, run it, repeat. To see that loop in a live process, I started a pool, gave it one task and let `main` return without calling `shutdown()`:",
        },
        {
          type: "code",
          language: "java",
          title: "NoExit.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class NoExit {
    public static void main(String[] args) {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        pool.submit(() -> System.out.println("fare synced on " + Thread.currentThread().getName()));
        System.out.println("main() returns now, pid " + ProcessHandle.current().pid());
    }   // no shutdown(): the pool's worker is a non-daemon thread waiting for more work
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `timeout 6 java NoExit; echo "exit code $?" &
jcmd NoExit Thread.print`,
        },
        {
          type: "output",
          text: `fare synced on pool-1-thread-1
main() returns now, pid 125378
"pool-1-thread-1" #20 [125396] prio=5 os_prio=0 cpu=2.67ms elapsed=1.59s tid=0x000077efe4176720 nid=125396 waiting on condition  [0x000077efbdcfe000]
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
\t- parking to wait for  <0x000000008df14810> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
\tat java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:371)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionNode.block(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:519)
\tat java.util.concurrent.ForkJoinPool.unmanagedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3780)
\tat java.util.concurrent.ForkJoinPool.managedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3725)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1746)
\tat java.util.concurrent.LinkedBlockingQueue.take(java.base@21.0.13.0.3/LinkedBlockingQueue.java:435)
\tat java.util.concurrent.ThreadPoolExecutor.getTask(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1070)
\tat java.util.concurrent.ThreadPoolExecutor.runWorker(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1130)
\tat java.util.concurrent.ThreadPoolExecutor$Worker.run(java.base@21.0.13.0.3/ThreadPoolExecutor.java:642)
\tat java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
\tat java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

"DestroyJavaVM" #21 [125379] prio=5 os_prio=0 cpu=37.67ms elapsed=2.12s tid=0x000077efe4019920 nid=125379 waiting on condition  [0x0000000000000000]
   java.lang.Thread.State: RUNNABLE
...
exit code 124`,
        },
        {
          type: "list",
          items: [
            "**Read the stack from the bottom up**: `Thread.run` calls `Worker.run`, which calls `runWorker`, the pool's loop. `runWorker` called `getTask()`, which called `LinkedBlockingQueue.take()`, which waits on a `Condition` of the queue's lock (the `AbstractQueuedSynchronizer` from ReentrantLock, ReadWriteLock, StampedLock and AQS) and finally parks the thread with `Unsafe.park`. The thread is in `WAITING (parking)` and costs no CPU: `cpu=2.67ms` in total.",
            "**Only one pool thread exists**, although the pool was created with 2. Threads are created lazily, one per submitted task until the core size is reached. There was only one task.",
            "**`main` has returned, but the JVM is still alive.** The thread `DestroyJavaVM` is the JVM's launcher thread waiting for every non-daemon thread to finish (Thread States, join, sleep, interrupt and Daemon Threads covered the rule). `pool-1-thread-1` isn't a daemon (the dump line would say `daemon`), and it will wait in `take()` forever. `timeout` had to kill the process after 6 seconds: exit code 124.",
            "**`ForkJoinPool.managedBlock`** in the middle of a `LinkedBlockingQueue` stack trace looks odd. Since JDK 17, `AbstractQueuedSynchronizer`'s condition wait goes through it so that a blocked `ForkJoinPool` worker can be compensated with another thread; for a normal platform thread it simply calls the blocking code directly (`unmanagedBlock`).",
          ],
        },
        {
          type: "heading",
          text: "How a ScheduledThreadPoolExecutor tells rate from delay",
        },
        {
          type: "paragraph",
          text: "A scheduled pool wraps each task in a `ScheduledFutureTask`, a `FutureTask` with a trigger time and a period, and keeps them in a `DelayedWorkQueue`, a binary heap ordered by trigger time. Its `period` field holds both kinds of periodic task in one number. I read it by reflection (which needs `--add-opens`, because `java.util.concurrent` isn't open to applications):",
        },
        {
          type: "code",
          language: "java",
          title: "PeriodSign.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class PeriodSign {
    public static void main(String[] args) throws Exception {
        ScheduledExecutorService ses = Executors.newScheduledThreadPool(1);
        ScheduledFuture<?> rate = ses.scheduleAtFixedRate(() -> { }, 1, 100, TimeUnit.MILLISECONDS);
        ScheduledFuture<?> delay = ses.scheduleWithFixedDelay(() -> { }, 1, 100, TimeUnit.MILLISECONDS);
        ScheduledFuture<?> once = ses.schedule(() -> { }, 1, TimeUnit.SECONDS);
        Field period = rate.getClass().getDeclaredField("period");
        period.setAccessible(true);                       // needs --add-opens java.base/java.util.concurrent
        System.out.println(rate.getClass().getName());
        System.out.println("scheduleAtFixedRate    period = " + period.get(rate) + " ns");
        System.out.println("scheduleWithFixedDelay period = " + period.get(delay) + " ns");
        System.out.println("schedule (one-shot)    period = " + period.get(once) + " ns");
        ses.shutdownNow();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED PeriodSign",
        },
        {
          type: "output",
          text: `java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask
scheduleAtFixedRate    period = 100000000 ns
scheduleWithFixedDelay period = -100000000 ns
schedule (one-shot)    period = 0 ns`,
        },
        {
          type: "list",
          items: [
            "**The sign is the mode.** A positive period means fixed rate: after each run the next trigger time is the *previous trigger time* plus the period. A negative period means fixed delay: the next trigger time is *now* plus the delay. Zero means a one-shot task.",
            "**After each successful run**, `ScheduledFutureTask.run()` calls `runAndReset()`, and only if that returns `true` does it compute the next time and put the task back in the queue. If the task threw, `runAndReset()` stores the exception, returns `false`, and the task is simply never re-queued. That one `if` is the whole production story at the end of this lesson.",
            "**An idle scheduled worker waits with a timeout**, not forever: `jcmd Thread.print` showed it in `TIMED_WAITING (parking)` inside `DelayedWorkQueue.take`, called from `awaitNanos`, because it knows when the next task is due.",
          ],
        },
      ],
    },
    {
      title: "execute vs submit: Where Exceptions Go",
      blocks: [
        {
          type: "paragraph",
          text: "The difference between the two methods is small in the API and large in production: it decides whether an exception is printed, and whether the thread survives it.",
        },
        {
          type: "code",
          language: "java",
          title: "SubmitVsExecute.java",
          code: `import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;

public class SubmitVsExecute {
    static void syncFare(String zone) {
        if (zone.equals("NEW-TOWN")) throw new IllegalStateException("no fare table for " + zone);
        System.out.println("synced " + zone + " on " + Thread.currentThread().getName());
    }

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(1);

        System.out.println("--- execute");
        pool.execute(() -> syncFare("NEW-TOWN"));
        Thread.sleep(200);
        pool.execute(() -> syncFare("SALT-LAKE"));
        Thread.sleep(200);

        System.out.println("--- submit");
        Future<?> f = pool.submit(() -> syncFare("NEW-TOWN"));
        Thread.sleep(200);
        System.out.println("nothing printed; isDone=" + f.isDone() + " state=" + f.state());
        try {
            f.get();
        } catch (ExecutionException e) {
            System.out.println("get() threw ExecutionException, cause: " + e.getCause());
        }
        System.out.println("completed tasks " + ((ThreadPoolExecutor) pool).getCompletedTaskCount()
                + ", pool size " + ((ThreadPoolExecutor) pool).getPoolSize());
        pool.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `--- execute
Exception in thread "pool-1-thread-1" java.lang.IllegalStateException: no fare table for NEW-TOWN
\tat SubmitVsExecute.syncFare(SubmitVsExecute.java:9)
\tat SubmitVsExecute.lambda$main$0(SubmitVsExecute.java:17)
\tat java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1144)
\tat java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:642)
\tat java.base/java.lang.Thread.run(Thread.java:1583)
synced SALT-LAKE on pool-1-thread-2
--- submit
nothing printed; isDone=true state=FAILED
get() threw ExecutionException, cause: java.lang.IllegalStateException: no fare table for NEW-TOWN
completed tasks 3, pool size 1`,
        },
        {
          type: "list",
          items: [
            "**`execute`: the exception kills the worker.** `runWorker` runs the task directly, catches the exception only to call the `afterExecute` hook, and rethrows it. It escapes `Thread.run`, so the thread's uncaught-exception handler runs (the default one prints `Exception in thread ...` to stderr) and the thread dies. The pool notices in `processWorkerExit` and starts a replacement, which is why the next task ran on **`pool-1-thread-2`**. A pool whose tasks keep failing through `execute` keeps creating threads.",
            "**`submit`: the exception is captured.** `FutureTask.run` catches it and stores it as the outcome. The worker thread is fine (pool size stays 1, no `thread-3`), and **nothing at all is printed**. `isDone()` is `true` and `state()` (Java 19) is `FAILED`, but no log line, metric or alert exists unless some code calls `get()`, which throws `ExecutionException` with the original exception as its cause.",
            "**`getCompletedTaskCount()` counted 3**, including both failures. \"Completed\" means \"finished running\", not \"succeeded\". The next lesson shows how to count failures with the `afterExecute` hook.",
            "**The rule I follow**: if the result of a `submit` is never read, it should have been `execute`, or the task must catch and log its own exceptions. A `Future` thrown away is an exception thrown away.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The stack trace is the worker's, not the caller's",
          text: "Even when `get()` does report the exception, the `ExecutionException` is created in the thread calling `get()`, and its cause carries the stack of the pool thread. The caller's stack at the moment of `submit` is lost. When debugging, log enough context in the task itself (trip ID, zone, attempt) to know which submission failed.",
        },
      ],
    },
    {
      title: "Callable and Future: get, Timeouts and Cancellation",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "FutureDemo.java",
          code: `import java.util.concurrent.Callable;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class FutureDemo {
    static long t0 = System.nanoTime();
    static String at() { return String.format("%4d ms", (System.nanoTime() - t0) / 1_000_000); }

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);

        Callable<Long> quote = () -> {                       // a Callable returns a value and may throw
            Thread.sleep(300);                               // pretend: pricing service call
            return 14_500L;
        };
        Future<Long> f = pool.submit(quote);
        System.out.println(at() + " submitted, isDone=" + f.isDone() + " state=" + f.state());
        try {
            f.get(100, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            System.out.println(at() + " get(100ms) timed out; the task is still running: " + f.state());
        }
        long paise = f.get();                                // blocks until the result is ready
        System.out.println(at() + " get() = " + paise + " paise, state=" + f.state());

        Future<String> slow = pool.submit(() -> {
            try {
                Thread.sleep(5_000);
                return "route computed";
            } catch (InterruptedException e) {
                System.out.println(at() + " task saw interrupt, interrupted flag now " + Thread.currentThread().isInterrupted());
                throw e;
            }
        });
        Thread.sleep(100);
        boolean cancelled = slow.cancel(true);               // interrupts the running thread
        System.out.println(at() + " cancel(true) = " + cancelled);
        Thread.sleep(50);
        System.out.println(at() + " isCancelled=" + slow.isCancelled() + " isDone=" + slow.isDone());
        try {
            slow.get();
        } catch (CancellationException e) {
            System.out.println(at() + " get() threw CancellationException");
        }

        Future<String> stubborn = pool.submit(() -> {
            long end = System.nanoTime() + 300_000_000;
            while (System.nanoTime() < end) { }            // busy loop: never checks interruption
            System.out.println(at() + " stubborn task finished anyway");
            return "ignored";
        });
        Thread.sleep(50);
        boolean c2 = stubborn.cancel(true);
        System.out.println(at() + " cancel(true) on a busy loop = " + c2 + ", isDone=" + stubborn.isDone());
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.SECONDS);
        System.out.println(at() + " pool terminated");
    }
}`,
        },
        {
          type: "output",
          text: `   8 ms submitted, isDone=false state=RUNNING
 141 ms get(100ms) timed out; the task is still running: RUNNING
 309 ms get() = 14500 paise, state=SUCCESS
 417 ms task saw interrupt, interrupted flag now false
 417 ms cancel(true) = true
 470 ms isCancelled=true isDone=true
 475 ms get() threw CancellationException
 526 ms cancel(true) on a busy loop = true, isDone=true
 776 ms stubborn task finished anyway
 776 ms pool terminated`,
        },
        {
          type: "list",
          items: [
            "**`get(timeout)` gives up waiting, not the task.** After the `TimeoutException` the task is still `RUNNING`, and the plain `get()` later returned its result at 309 ms (300 ms of sleep plus start-up). A timeout on `get` protects the caller only; if the work should stop too, the caller has to `cancel` it.",
            "**`cancel(true)` interrupts the runner thread.** The task was in `Thread.sleep`, which responds to an interrupt by throwing `InterruptedException` and **clearing the interrupt flag** (hence `interrupted flag now false`, the rule from Thread States, join, sleep, interrupt and Daemon Threads). The `Future` became `CANCELLED`, and `get()` throws `CancellationException`, not `ExecutionException`.",
            "**`cancel(true)` on code that ignores interrupts does nothing to the code.** The busy loop never checks `Thread.interrupted()`, so it ran to the end, 250 ms after the `Future` claimed `isDone=true`. The `Future` is cancelled; the work isn't. Long CPU loops need an explicit `if (Thread.currentThread().isInterrupted()) return;`, and blocking I/O on classic sockets doesn't respond to interrupts at all, which is why it needs its own timeouts.",
            "**`cancel(false)`** only prevents a task from starting. On a task that's already running it changes the `Future`'s state and lets the task finish.",
            "**`isDone()` is true for every final state**: completed, failed and cancelled. Use `state()` (Java 19+), or `isCancelled()` and a `get()` in a `try`, to tell them apart.",
          ],
        },
        {
          type: "table",
          headers: ["Call", "Running task", "Not started yet", "Already done"],
          rows: [
            ["`get()`", "Blocks until done", "Blocks until it runs and finishes", "Returns the result, or throws `ExecutionException` / `CancellationException`"],
            ["`get(t, unit)`", "Blocks at most `t`, then `TimeoutException`", "Same", "Same as `get()`"],
            ["`cancel(false)`", "Marks it cancelled, lets it run to the end", "Marks it cancelled, it never runs", "Returns `false`, changes nothing"],
            ["`cancel(true)`", "Marks it cancelled and interrupts the runner", "Same as `cancel(false)`", "Returns `false`"],
            ["`resultNow()` (19+)", "Throws `IllegalStateException`", "Throws `IllegalStateException`", "Returns the result if it succeeded"],
          ],
        },
      ],
    },
    {
      title: "invokeAll and invokeAny",
      blocks: [
        {
          type: "paragraph",
          text: "Two bulk methods cover the common fan-out shapes: \"I need every answer\" and \"I need any one answer\". I gave both three map providers for an ETA: A answers in 300 ms, B fails after 100 ms, C answers in 200 ms.",
        },
        {
          type: "code",
          language: "java",
          title: "InvokeAllAny.java",
          code: `import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public class InvokeAllAny {
    static long t0;
    static long ms() { return (System.nanoTime() - t0) / 1_000_000; }

    static Callable<String> provider(String name, long delayMs, boolean fails) {
        return () -> {
            try {
                Thread.sleep(delayMs);
            } catch (InterruptedException e) {
                System.out.println("  " + name + " interrupted at " + ms() + " ms");
                throw e;
            }
            if (fails) throw new IllegalStateException(name + " is down");
            return name + " eta " + delayMs / 10 + " min";
        };
    }

    public static void main(String[] args) throws Exception {
        List<Callable<String>> maps = List.of(
                provider("map-A", 300, false), provider("map-B", 100, true), provider("map-C", 200, false));

        try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
            t0 = System.nanoTime();
            List<Future<String>> all = pool.invokeAll(maps);              // waits for every task
            System.out.println("invokeAll returned at " + ms() + " ms");
            for (Future<String> f : all) {
                try {
                    System.out.println("  " + f.get());
                } catch (ExecutionException e) {
                    System.out.println("  failed: " + e.getCause().getMessage());
                }
            }

            t0 = System.nanoTime();
            List<Future<String>> timed = pool.invokeAll(maps, 250, TimeUnit.MILLISECONDS);
            System.out.println("invokeAll(250 ms) returned at " + ms() + " ms, states "
                    + timed.stream().map(Future::state).toList());

            t0 = System.nanoTime();
            String first = pool.invokeAny(maps);                          // first SUCCESSFUL result
            System.out.println("invokeAny returned \\"" + first + "\\" at " + ms() + " ms");
            Thread.sleep(50);
        }
    }
}`,
        },
        {
          type: "output",
          text: `invokeAll returned at 306 ms
  map-A eta 30 min
  failed: map-B is down
  map-C eta 20 min
  map-A interrupted at 250 ms
invokeAll(250 ms) returned at 250 ms, states [CANCELLED, FAILED, SUCCESS]
invokeAny returned "map-C eta 20 min" at 207 ms
  map-A interrupted at 211 ms`,
        },
        {
          type: "list",
          items: [
            "**`invokeAll` waits for every task**, successful or not, so it took as long as the slowest (306 ms). It returns the futures **in the order of the input list**, all of them done, and each failure is still inside its `Future`: B's exception only appeared when I called `get()` on it.",
            "**`invokeAll` with a timeout cancels whatever isn't done** when the time runs out. A was interrupted at 250 ms and its future came back `CANCELLED`. This is the simplest way to say \"give me whatever answers arrive within 250 ms\".",
            "**`invokeAny` returns the first *successful* result** and cancels the rest. B failed first, at 100 ms, and was ignored; C succeeded at 200 ms and won; A was interrupted. Only if **every** task fails does `invokeAny` throw an `ExecutionException` (in my test, with the last failure as the cause).",
            "Both methods block the calling thread. For non-blocking fan-out with callbacks, the Java 8 lesson on CompletableFuture and the later lesson Timeouts, Fallbacks, Fan-out and Choosing Executors are the better tools.",
          ],
        },
      ],
    },
    {
      title: "Shutting Down: shutdown, shutdownNow, awaitTermination and close",
      blocks: [
        {
          type: "paragraph",
          text: "A pool owns threads, and threads keep a JVM alive. Every pool needs an owner that shuts it down. I loaded a single-threaded pool with four 200 ms tasks (one running, three queued) and stopped it three different ways:",
        },
        {
          type: "code",
          language: "java",
          title: "ShutdownModes.java",
          code: `import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;

public class ShutdownModes {
    static long t0 = System.nanoTime();
    static long ms() { return (System.nanoTime() - t0) / 1_000_000; }

    static Runnable trip(int id) {
        return () -> {
            try {
                Thread.sleep(200);
                System.out.println("  trip " + id + " settled at " + ms() + " ms");
            } catch (InterruptedException e) {
                System.out.println("  trip " + id + " interrupted at " + ms() + " ms");
            }
        };
    }

    static ExecutorService loaded() {
        ExecutorService pool = Executors.newSingleThreadExecutor();
        for (int i = 1; i <= 4; i++) pool.execute(trip(i));     // 1 running, 3 queued
        return pool;
    }

    public static void main(String[] args) throws Exception {
        System.out.println("shutdown():");
        t0 = System.nanoTime();
        ExecutorService a = loaded();
        Thread.sleep(50);
        a.shutdown();                                            // no new tasks; queued ones still run
        System.out.println("  isShutdown=" + a.isShutdown() + " isTerminated=" + a.isTerminated());
        try {
            a.execute(trip(99));
        } catch (RejectedExecutionException e) {
            System.out.println("  new task rejected: " + e.getClass().getSimpleName());
        }
        boolean done = a.awaitTermination(2, TimeUnit.SECONDS);
        System.out.println("  awaitTermination=" + done + " at " + ms() + " ms");

        System.out.println("shutdownNow():");
        t0 = System.nanoTime();
        ExecutorService b = loaded();
        Thread.sleep(50);
        List<Runnable> neverRan = b.shutdownNow();               // interrupt running, drain queue
        System.out.println("  returned " + neverRan.size() + " queued tasks that never ran");
        System.out.println("  awaitTermination=" + b.awaitTermination(2, TimeUnit.SECONDS) + " at " + ms() + " ms");

        System.out.println("close() (Java 19+):");
        t0 = System.nanoTime();
        try (ExecutorService c = loaded()) {
            System.out.println("  leaving the try block at " + ms() + " ms");
        }                                                        // close() = shutdown() + wait for all
        System.out.println("  close() returned at " + ms() + " ms");
    }
}`,
        },
        {
          type: "output",
          text: `shutdown():
  isShutdown=true isTerminated=false
  new task rejected: RejectedExecutionException
  trip 1 settled at 211 ms
  trip 2 settled at 425 ms
  trip 3 settled at 625 ms
  trip 4 settled at 826 ms
  awaitTermination=true at 829 ms
shutdownNow():
  trip 1 interrupted at 54 ms
  returned 3 queued tasks that never ran
  awaitTermination=true at 62 ms
close() (Java 19+):
  leaving the try block at 0 ms
  trip 1 settled at 201 ms
  trip 2 settled at 402 ms
  trip 3 settled at 605 ms
  trip 4 settled at 805 ms
  close() returned at 805 ms`,
        },
        {
          type: "table",
          headers: ["Method", "New tasks", "Queued tasks", "Running tasks", "Blocks?"],
          rows: [
            ["`shutdown()`", "Rejected", "Still run", "Finish normally", "No, returns at once"],
            ["`shutdownNow()`", "Rejected", "Removed and returned as a `List<Runnable>`", "Interrupted", "No, returns at once"],
            ["`awaitTermination(t, unit)`", "(no effect)", "(no effect)", "(no effect)", "Yes, until terminated or timeout; returns `true`/`false`"],
            ["`close()` (19+)", "Rejected", "Still run", "Finish normally", "Yes, until terminated; `shutdownNow()` if the waiting thread is interrupted"],
          ],
        },
        {
          type: "list",
          items: [
            "**`shutdown()` doesn't wait.** It flips the pool's state, and every queued task still runs: here the pool needed another 800 ms. Code that calls `shutdown()` and then reads results it expects to be complete has a race. `awaitTermination` is the wait.",
            "**`shutdownNow()` interrupts and drains.** Trip 1 was interrupted mid-sleep, and the three queued tasks came back as a list. Those `Runnable`s are the pool's internal objects (`FutureTask`s, if they were submitted), so the list is mainly useful for counting or logging what was dropped. A task that ignores interrupts survives `shutdownNow()` exactly as it survived `cancel(true)`.",
            "**`close()` is `shutdown()` plus waiting**, which makes try-with-resources the natural scope for a short-lived pool. It waits without a time limit, so a stuck task makes `close()` stuck too. For long-lived pools in a server, the two-phase pattern in Example 2 below (shutdown, wait with a deadline, then shutdownNow) is the safer default.",
            "**`isShutdown()` vs `isTerminated()`**: the first is true as soon as shutdown starts, the second only when the last task has finished and every worker has exited.",
          ],
        },
        {
          type: "heading",
          text: "A pool per request, never shut down",
        },
        {
          type: "paragraph",
          text: "Forgetting `shutdown()` on a pool that lives for the whole application costs nothing but a slow exit. Forgetting it on a pool created per request is a thread leak:",
        },
        {
          type: "code",
          language: "java",
          title: "PoolPerRequest.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class PoolPerRequest {
    static long handle(int req) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);     // a new pool for every request
        Future<Long> a = pool.submit(() -> 10_000L + req);
        Future<Long> b = pool.submit(() -> 2_000L);
        return a.get() + b.get();                                   // no shutdown
    }

    static long handleFixed(int req) throws Exception {
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            Future<Long> a = pool.submit(() -> 10_000L + req);
            Future<Long> b = pool.submit(() -> 2_000L);
            return a.get() + b.get();
        }
    }

    public static void main(String[] args) throws Exception {
        boolean fixed = args.length > 0;
        int base = Thread.activeCount();
        for (int i = 0; i < 500; i++) {
            if (fixed) handleFixed(i); else handle(i);
        }
        System.out.println("after 500 requests: " + (Thread.activeCount() - base) + " extra threads");
        System.gc();
        Thread.sleep(500);
        System.out.println("after System.gc():   " + (Thread.activeCount() - base) + " extra threads");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `timeout 8 java PoolPerRequest;       echo "exit code $?"
timeout 8 java PoolPerRequest fixed; echo "exit code $?"`,
        },
        {
          type: "output",
          text: `after 500 requests: 1000 extra threads
after System.gc():   1000 extra threads
exit code 124
after 500 requests: 0 extra threads
after System.gc():   0 extra threads
exit code 0`,
        },
        {
          type: "paragraph",
          text: "Every request left two idle threads parked in `take()`, and a garbage collection didn't help: a started thread is a GC root, and the thread references its pool, so the pool is never unreachable. After 500 requests the process had 1,000 extra threads and couldn't exit. In a real service this ends with `OutOfMemoryError: unable to create native thread`. The fixed version, with the pool in try-with-resources, left nothing behind. Better still is one shared pool for the whole application, created once.",
        },
      ],
    },
    {
      title: "Scheduled Executors: Fixed Rate, Fixed Delay and Silent Death",
      blocks: [
        {
          type: "paragraph",
          text: "`scheduleAtFixedRate(task, initialDelay, period, unit)` and `scheduleWithFixedDelay(task, initialDelay, delay, unit)` look interchangeable. I timed when each run started, for a 100 ms period and three kinds of task: fast (30 ms), slower than the period (150 ms), and one slow first run (350 ms) followed by fast ones:",
        },
        {
          type: "code",
          language: "java",
          title: "RateVsDelay.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class RateVsDelay {
    // Runs a job every 100 ms for 620 ms and returns when each run started
    static List<Long> run(String mode, long firstRunMs, long workMs) throws InterruptedException {
        List<Long> starts = new ArrayList<>();
        long t0 = System.nanoTime();
        Runnable job = () -> {
            starts.add((System.nanoTime() - t0) / 1_000_000);
            long sleep = starts.size() == 1 ? firstRunMs : workMs;
            try { Thread.sleep(sleep); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        };
        ScheduledExecutorService ses = Executors.newSingleThreadScheduledExecutor();
        ScheduledFuture<?> f = mode.equals("rate")
                ? ses.scheduleAtFixedRate(job, 0, 100, TimeUnit.MILLISECONDS)
                : ses.scheduleWithFixedDelay(job, 0, 100, TimeUnit.MILLISECONDS);
        Thread.sleep(620);
        f.cancel(false);
        ses.shutdown();
        ses.awaitTermination(1, TimeUnit.SECONDS);
        return starts;
    }

    public static void main(String[] args) throws Exception {
        run("rate", 1, 1);                                   // warm-up: class loading, lambdas
        System.out.println("every 100 ms, each run takes 30 ms");
        System.out.println("  atFixedRate     starts " + run("rate", 30, 30));
        System.out.println("  withFixedDelay  starts " + run("delay", 30, 30));
        System.out.println("every 100 ms, each run takes 150 ms (longer than the period)");
        System.out.println("  atFixedRate     starts " + run("rate", 150, 150));
        System.out.println("  withFixedDelay  starts " + run("delay", 150, 150));
        System.out.println("every 100 ms, the first run takes 350 ms, the rest 10 ms");
        System.out.println("  atFixedRate     starts " + run("rate", 350, 10));
        System.out.println("  withFixedDelay  starts " + run("delay", 350, 10));
    }
}`,
        },
        {
          type: "output",
          text: `every 100 ms, each run takes 30 ms
  atFixedRate     starts [0, 100, 200, 300, 400, 500, 600]
  withFixedDelay  starts [0, 130, 260, 391, 524]
every 100 ms, each run takes 150 ms (longer than the period)
  atFixedRate     starts [0, 150, 300, 450, 600]
  withFixedDelay  starts [0, 251, 502]
every 100 ms, the first run takes 350 ms, the rest 10 ms
  atFixedRate     starts [1, 351, 361, 371, 400, 500, 600]
  withFixedDelay  starts [2, 452, 563]`,
        },
        {
          type: "list",
          items: [
            "**Fixed rate keeps a timetable.** Runs started at 0, 100, 200... regardless of how long each took, because the next trigger time is the previous trigger time plus the period. **Fixed delay keeps a gap**: each run started 100 ms after the previous one *ended*, so with 30 ms of work the real period was 130 ms.",
            "**Fixed rate never overlaps runs of the same task.** With 150 ms of work every 100 ms, it didn't start a second run in parallel; it started each run immediately after the previous one, every 150 ms, permanently behind schedule. The javadoc says so: \"subsequent executions may start late, but will not concurrently execute\". Adding threads to the pool doesn't change that.",
            "**After a slow run, fixed rate catches up in a burst.** The first run took 350 ms, so the runs due at 100, 200 and 300 ms were all overdue: they ran back to back at 351, 361 and 371 ms, then the timetable resumed at 400. A job that hits an external API every minute can fire three calls in a row after one slow minute. Fixed delay simply started 100 ms after the slow run ended (452 ms).",
            "**Which to use**: fixed rate when runs must stay aligned to the clock (sampling a metric every second); fixed delay when each run must leave a gap for the system it calls (polling, syncing, cleanup). Most backend jobs want fixed delay.",
            "These timings are from one machine with other benchmarks running, after a warm-up run; I ran the final program five times; the fixed-rate starts never moved more than 6 ms from the values shown, and the fixed-delay starts drifted by up to 10 ms (each run adds its own scheduling delay to the next).",
          ],
        },
        {
          type: "heading",
          text: "One exception and the task is gone",
        },
        {
          type: "code",
          language: "java",
          title: "PeriodicDeath.java",
          code: `import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class PeriodicDeath {
    public static void main(String[] args) throws Exception {
        ScheduledExecutorService ses = Executors.newScheduledThreadPool(1);
        AtomicInteger runs = new AtomicInteger();
        ScheduledFuture<?> heartbeat = ses.scheduleAtFixedRate(() -> {
            int n = runs.incrementAndGet();
            System.out.println("heartbeat run " + n);
            if (n == 3) throw new IllegalStateException("zone SALT-LAKE missing from the fare table");
        }, 0, 100, TimeUnit.MILLISECONDS);

        Thread.sleep(1_000);                                 // ten periods
        System.out.println("after 1 s: runs=" + runs.get() + " isDone=" + heartbeat.isDone()
                + " isCancelled=" + heartbeat.isCancelled() + " state=" + heartbeat.state());
        try {
            heartbeat.get();
        } catch (ExecutionException e) {
            System.out.println("the only place the exception survives: " + e.getCause());
        }
        System.out.println("executor still alive: isShutdown=" + ses.isShutdown()
                + ", it would happily run other tasks");
        ses.shutdown();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java PeriodicDeath 2>&1",
        },
        {
          type: "output",
          text: `heartbeat run 1
heartbeat run 2
heartbeat run 3
after 1 s: runs=3 isDone=true isCancelled=false state=FAILED
the only place the exception survives: java.lang.IllegalStateException: zone SALT-LAKE missing from the fare table
executor still alive: isShutdown=false, it would happily run other tasks`,
        },
        {
          type: "list",
          items: [
            "**Three runs in one second, then nothing**, even with stderr redirected into the output (`2>&1`): no stack trace, no log line. The task threw on run 3, `runAndReset()` returned `false`, and the task wasn't re-queued. The javadoc of `scheduleAtFixedRate` states it: \"If any execution of the task encounters an exception, subsequent executions are suppressed.\"",
            "**The `ScheduledFuture` knows**: `isDone=true`, `state=FAILED`, and `get()` throws the exception. But nobody calls `get()` on a periodic task's future, because for a healthy periodic task `get()` blocks forever.",
            "**The executor itself is healthy**, which is what makes this so hard to notice: its thread is alive, its queue works, health checks that look at the pool pass. Only the one task has stopped.",
            "**The fix belongs inside the task**: wrap the body in `try`/`catch` so no exception ever leaves it, log every failure, and record the time of the last success so a monitor can alert when it gets old. The production section rebuilds exactly this.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `Future<Long> f = pool.submit(quote); f.get();` on a `newFixedThreadPool(2)` from `FutureDemo`, where `quote` sleeps 300 ms and returns 14,500:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`submit` wraps the task.** `AbstractExecutorService.submit` checks for `null`, calls `newTaskFor(quote)`, which creates a `FutureTask` with `state = NEW` and `callable = quote`, and passes it to `execute`.",
            "**`execute` admits it.** The pool has 0 workers and a core size of 2, so it creates a worker with this task as its first task and starts a new platform thread, `pool-1-thread-1`. (With a full set of core threads, the task would go into the `LinkedBlockingQueue` instead; the next lesson has the full algorithm.)",
            "**`submit` returns the same `FutureTask`** as a `Future<Long>`. The caller hasn't waited for anything.",
            "**The worker runs it.** `runWorker` calls `FutureTask.run()`, which sets `runner` to the current thread by CAS (so a concurrent second `run()` can't also execute it) and calls `quote.call()`.",
            "**The caller calls `get()`.** `state` is `NEW`, so `awaitDone` pushes a `WaitNode` for the calling thread onto the `waiters` stack with CAS and parks the thread. A `jcmd Thread.print` at this moment would show `main` in `WAITING (parking)` inside `FutureTask.awaitDone`.",
            "**The task returns 14,500.** `set(14500L)` moves `state` from `NEW` to `COMPLETING` by CAS, stores the result in `outcome`, then sets `state` to `NORMAL` (a release write), and calls `finishCompletion()`.",
            "**`finishCompletion` wakes the waiters.** It pops every `WaitNode` and calls `LockSupport.unpark` on its thread, then clears `callable`.",
            "**`get()` returns.** `main` wakes up, sees `NORMAL`, and `report` returns `outcome` cast to `Long`. Had the state been `EXCEPTIONAL`, `report` would throw `new ExecutionException(outcome)`; `CANCELLED` or `INTERRUPTED` would throw `CancellationException`.",
            "**The worker goes back to the queue.** `runWorker` loops into `getTask()`, which calls `take()` on the empty queue and parks `pool-1-thread-1` until the next task, exactly as in the `NoExit` thread dump.",
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
          title: "ExecutorTour.java",
          code: `import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class ExecutorTour {
    public static void main(String[] args) throws Exception {
        // 1. a pool, closed by try-with-resources (Java 19+: close() waits for tasks)
        try (ExecutorService pool = Executors.newFixedThreadPool(4)) {

            // 2. execute: fire and forget, Runnable, no result
            pool.execute(() -> System.out.println("execute on " + Thread.currentThread().getName()));

            // 3. submit a Callable: a Future with the result (or the exception)
            Future<Long> fare = pool.submit(() -> 14_500L);
            System.out.println("fare " + fare.get());

            // 4. get with a timeout, then cancel
            Future<String> slow = pool.submit(() -> { Thread.sleep(2_000); return "late"; });
            try {
                slow.get(50, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                System.out.println("timeout; cancel(true)=" + slow.cancel(true));
            }

            // 5. the task's exception arrives wrapped in ExecutionException
            Future<Integer> bad = pool.submit(() -> Integer.parseInt("NEW-TOWN"));
            try {
                bad.get();
            } catch (ExecutionException e) {
                System.out.println("cause " + e.getCause().getClass().getSimpleName());
            }

            // 6. invokeAll / invokeAny
            List<Callable<String>> zones = List.of(() -> "SALT-LAKE", () -> "NEW-TOWN");
            for (Future<String> f : pool.invokeAll(zones)) System.out.print(f.get() + " ");
            System.out.println("| any: " + pool.invokeAny(zones));
        }

        // 7. scheduling
        ScheduledExecutorService ses = Executors.newSingleThreadScheduledExecutor();
        ScheduledFuture<String> once = ses.schedule(() -> "reminder sent", 100, TimeUnit.MILLISECONDS);
        System.out.println(once.get());
        ScheduledFuture<?> tick = ses.scheduleWithFixedDelay(() -> System.out.print("tick "), 0, 30, TimeUnit.MILLISECONDS);
        Thread.sleep(100);
        tick.cancel(false);
        System.out.println();

        // 8. explicit shutdown sequence
        ses.shutdown();
        if (!ses.awaitTermination(1, TimeUnit.SECONDS)) ses.shutdownNow();
        System.out.println("terminated " + ses.isTerminated());
    }
}`,
        },
        {
          type: "output",
          text: `execute on pool-1-thread-1
fare 14500
timeout; cancel(true)=true
cause NumberFormatException
SALT-LAKE NEW-TOWN | any: SALT-LAKE
reminder sent
tick tick tick tick
terminated true`,
        },
        {
          type: "paragraph",
          text: "`invokeAny` returns whichever task succeeds first, so the `any:` value changes between runs: in six runs I got `SALT-LAKE` five times and `NEW-TOWN` once. `schedule` with a `Callable` returns a `ScheduledFuture` whose `get()` waits for the delay and the result. The scheduled pool is shut down by hand at the end because it's outside the try-with-resources block, with the usual \"wait, then force\" sequence.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Handling results in completion order",
        },
        {
          type: "paragraph",
          text: "Rendering trip receipts takes different times per rider. Looping over a list of futures and calling `get()` on each would wait for Asha's slow receipt before emailing anyone else's. An `ExecutorCompletionService` puts each finished task's future on a queue, so the caller handles results as they finish:",
        },
        {
          type: "code",
          language: "java",
          title: "ReceiptsAsTheyFinish.java",
          code: `import java.util.concurrent.CompletionService;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class ReceiptsAsTheyFinish {
    record Receipt(String rider, long farePaise, long tookMs) {}

    public static void main(String[] args) throws Exception {
        String[] riders = {"Asha", "Ravi", "Imran", "Meera", "Kabir"};
        long[] renderMs = {400, 100, 300, 50, 200};             // PDF rendering time varies per receipt
        long t0 = System.nanoTime();

        try (ExecutorService pool = Executors.newFixedThreadPool(5)) {
            CompletionService<Receipt> done = new ExecutorCompletionService<>(pool);
            for (int i = 0; i < riders.length; i++) {
                int k = i;
                done.submit(() -> {
                    Thread.sleep(renderMs[k]);
                    return new Receipt(riders[k], 10_000 + 1_000L * k, renderMs[k]);
                });
            }
            for (int i = 0; i < riders.length; i++) {
                Future<Receipt> next = done.take();                // whichever finished first
                Receipt r = next.get();
                System.out.printf("%4d ms  emailed %-5s (rendered in %d ms)%n",
                        (System.nanoTime() - t0) / 1_000_000, r.rider(), r.tookMs());
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `  70 ms  emailed Meera (rendered in 50 ms)
 119 ms  emailed Ravi  (rendered in 100 ms)
 219 ms  emailed Kabir (rendered in 200 ms)
 319 ms  emailed Imran (rendered in 300 ms)
 419 ms  emailed Asha  (rendered in 400 ms)`,
        },
        {
          type: "paragraph",
          text: "Asha's task was submitted first and finished last; Meera's receipt was emailed after 70 ms instead of waiting 400. `ExecutorCompletionService` does this by wrapping each task in a `FutureTask` subclass whose `done()` hook adds it to a `LinkedBlockingQueue`; `take()` blocks on that queue. Under load the first line moved to 97 ms in one run, but the order never changed.",
        },
        {
          type: "heading",
          text: "Example 2: Graceful shutdown on SIGTERM",
        },
        {
          type: "paragraph",
          text: "When Kubernetes stops a pod it sends SIGTERM, waits for a grace period, then sends SIGKILL. A payout service should finish what it can in that window and leave the rest for a retry. The two-phase pattern from the `ExecutorService` javadoc, called from a shutdown hook:",
        },
        {
          type: "code",
          language: "java",
          title: "GracefulStop.java",
          code: `import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class GracefulStop {
    // The two-phase pattern from the ExecutorService javadoc
    static void shutdownAndAwait(ExecutorService pool, long graceMs) {
        pool.shutdown();                                          // stop accepting, finish the queue
        try {
            if (!pool.awaitTermination(graceMs, TimeUnit.MILLISECONDS)) {
                List<Runnable> dropped = pool.shutdownNow();       // interrupt and drain
                System.out.println("grace period over: interrupted running tasks, " + dropped.size() + " never started");
                if (!pool.awaitTermination(graceMs, TimeUnit.MILLISECONDS)) {
                    System.out.println("pool did not terminate");
                }
            }
        } catch (InterruptedException e) {
            pool.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public static void main(String[] args) throws Exception {
        ExecutorService payouts = Executors.newFixedThreadPool(2);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("SIGTERM received, draining payouts");
            shutdownAndAwait(payouts, 300);
            System.out.println("hook done, terminated=" + payouts.isTerminated());
        }));
        for (int i = 1; i <= 20; i++) {
            int id = i;
            payouts.execute(() -> {
                try {
                    Thread.sleep(250);                             // one driver payout
                    System.out.println("payout " + id + " sent");
                } catch (InterruptedException e) {
                    System.out.println("payout " + id + " interrupted, will be retried from the outbox");
                }
            });
        }
        System.out.println("pid " + ProcessHandle.current().pid() + ", 20 payouts queued");
        Thread.sleep(60_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `timeout -s TERM 0.6 java GracefulStop; echo "exit code $?"`,
        },
        {
          type: "output",
          text: `pid 1049643, 20 payouts queued
payout 1 sent
payout 2 sent
payout 3 sent
payout 4 sent
SIGTERM received, draining payouts
payout 5 sent
payout 6 sent
grace period over: interrupted running tasks, 12 never started
payout 7 interrupted, will be retried from the outbox
payout 8 interrupted, will be retried from the outbox
hook done, terminated=true
exit code 124`,
        },
        {
          type: "list",
          items: [
            "SIGTERM arrived at 600 ms. The hook called `shutdown()`, and the two workers finished payouts 5 and 6 in the 300 ms grace period. Then `shutdownNow()` interrupted 7 and 8 and returned the 12 that never started. Every payout is accounted for: 6 sent, 2 interrupted, 12 never started.",
            "Shutdown hooks run on their own thread while `main` is still sleeping, so the pool must be reachable from the hook (here, captured by the lambda).",
            "Interrupted and dropped payouts are only safe because they can be retried: the task must be idempotent, and the work must be recorded somewhere durable (an outbox table) before it's queued in memory. SKIP LOCKED Job Queues, Idempotency and Distributed Locks covers that properly.",
            "`timeout` reports 124 because it had to send the signal. Run directly and stopped with `kill -TERM`, the JVM exits with 143 (128 + SIGTERM's number 15).",
          ],
        },
        {
          type: "heading",
          text: "Example 3: Never losing an exception from submit",
        },
        {
          type: "paragraph",
          text: "When tasks are submitted from many places and some callers never read their futures, the safest fix is to log failures where they happen, inside the task, and still let them propagate:",
        },
        {
          type: "code",
          language: "java",
          title: "LoggedTasks.java",
          code: `import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class LoggedTasks {
    // Wrap every task before it reaches the pool: failures are logged where they happen,
    // and still propagate (to the Future, or to the uncaught-exception handler)
    static Runnable logged(String name, Runnable r) {
        return () -> {
            try {
                r.run();
            } catch (RuntimeException | Error e) {
                System.out.println("[ERROR] task " + name + " failed on " + Thread.currentThread().getName() + ": " + e);
                throw e;
            }
        };
    }

    static <T> Callable<T> logged(String name, Callable<T> c) {
        return () -> {
            try {
                return c.call();
            } catch (Exception e) {
                System.out.println("[ERROR] task " + name + " failed on " + Thread.currentThread().getName() + ": " + e);
                throw e;
            }
        };
    }

    public static void main(String[] args) throws Exception {
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            Future<?> forgotten = pool.submit(logged("invoice-ASHA", () -> {
                throw new IllegalArgumentException("GSTIN missing");
            }));
            Future<Long> fare = pool.submit(logged("fare-RAVI", () -> Long.parseLong("14,500")));
            Thread.sleep(100);
            System.out.println("nobody called get(), but both failures were logged; states "
                    + forgotten.state() + " " + fare.state());
        }
    }
}`,
        },
        {
          type: "output",
          text: `[ERROR] task fare-RAVI failed on pool-1-thread-2: java.lang.NumberFormatException: For input string: "14,500"
[ERROR] task invoice-ASHA failed on pool-1-thread-1: java.lang.IllegalArgumentException: GSTIN missing
nobody called get(), but both failures were logged; states FAILED FAILED`,
        },
        {
          type: "paragraph",
          text: "Both failures were logged with a task name and a thread, although nobody called `get()`. Rethrowing keeps the `Future` honest (`FAILED`), so a caller that does read it still gets the exception. The same idea can be applied once for a whole pool by overriding `afterExecute`, which the next lesson does; the wrapper version works with any `ExecutorService`, including ones you didn't create.",
        },
      ],
    },
    {
      title: "When to Use Which Executor",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["A handful of tasks in a short-lived scope", "`try (var pool = Executors.newFixedThreadPool(n))`", "A pool without an owner that shuts it down"],
            ["A long-lived pool in a server", "One shared, named `ThreadPoolExecutor` with a bounded queue (next lesson)", "`Executors.newFixedThreadPool` / `newCachedThreadPool` under unbounded load"],
            ["Many blocking tasks (HTTP, JDBC) on Java 21", "`newVirtualThreadPerTaskExecutor()`, with a limit on the downstream resource", "A huge platform-thread pool"],
            ["Result of one task", "`submit` + `get(timeout)`", "`get()` with no timeout on remote calls"],
            ["Results as they finish", "`ExecutorCompletionService`", "Looping `get()` in submission order"],
            ["All results, or a deadline", "`invokeAll(tasks, timeout, unit)`", "Manual loops of `submit` and `cancel`"],
            ["Fastest successful answer", "`invokeAny`", "Racing futures by hand"],
            ["Fire-and-forget", "`execute`, or `submit` with a logging wrapper", "`submit` and ignoring the `Future`"],
            ["Periodic job that calls something", "`scheduleWithFixedDelay` with `try`/`catch` inside", "`scheduleAtFixedRate` with code that can throw"],
            ["Chaining async steps", "`CompletableFuture` with an explicit executor", "Blocking `get()` calls inside pool threads"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Submitting and never reading the Future",
        },
        {
          type: "paragraph",
          text: "`pool.submit(task)` with the result ignored swallows every exception the task throws. `SubmitVsExecute` printed nothing for a failed task. Use `execute` for fire-and-forget, or catch and log inside the task.",
        },
        {
          type: "heading",
          text: "Letting an exception escape a periodic task",
        },
        {
          type: "paragraph",
          text: "One exception cancels all future runs of a `scheduleAtFixedRate` or `scheduleWithFixedDelay` task, without a log line. Every periodic task body should be a `try`/`catch` that logs.",
        },
        {
          type: "heading",
          text: "Calling get() without a timeout",
        },
        {
          type: "paragraph",
          text: "`future.get()` on a task that calls a slow service blocks the caller for as long as the service takes, possibly forever. In a request thread that means requests pile up behind it. Use `get(timeout, unit)` and decide what happens on `TimeoutException` (cancel, fallback, error).",
        },
        {
          type: "heading",
          text: "Expecting cancel(true) or shutdownNow() to stop any code",
        },
        {
          type: "paragraph",
          text: "Both only interrupt. A busy loop that never checks the interrupt flag, or a blocking socket read, keeps running. `FutureDemo`'s stubborn task finished 250 ms after it was \"cancelled\".",
        },
        {
          type: "heading",
          text: "Creating a pool per request",
        },
        {
          type: "code",
          language: "java",
          code: `// Wrong: two threads leak per call
ExecutorService pool = Executors.newFixedThreadPool(2);
return pool.submit(task).get();

// Better: one shared pool for the application; or, for a local scope:
try (ExecutorService local = Executors.newFixedThreadPool(2)) {
    return local.submit(task).get();
}`,
        },
        {
          type: "paragraph",
          text: "`PoolPerRequest` leaked 1,000 threads in 500 calls. Creating pools is also slow: each new pool starts new threads, which is the cost pools exist to avoid.",
        },
        {
          type: "heading",
          text: "Forgetting that pool threads keep the JVM alive",
        },
        {
          type: "paragraph",
          text: "A command-line tool or test that forgets `shutdown()` never exits, as `NoExit` showed. Use try-with-resources or an explicit shutdown in `finally`. Making pool threads daemon threads (with a `ThreadFactory`) hides the problem by abandoning queued work at exit; it's only right for work that may be lost.",
        },
        {
          type: "heading",
          text: "Blocking on a Future from inside the same pool",
        },
        {
          type: "paragraph",
          text: "A task that submits a subtask to its own pool and waits for it with `get()` holds a thread while waiting. With a pool of `n` threads and `n` such tasks running at once, every thread waits for a subtask that has no thread to run on: a thread-starvation deadlock. Deadlock, Livelock and Starvation returns to it; the fix is a separate pool for the subtasks or non-blocking composition.",
        },
        {
          type: "heading",
          text: "Calling shutdown() and reading results immediately",
        },
        {
          type: "paragraph",
          text: "`shutdown()` returns at once while queued tasks still run. Follow it with `awaitTermination`, or use `close()`, before reading anything the tasks produce.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Create long-lived pools once, at application start, and give each one an owner that shuts it down (a Spring bean's destroy method, a shutdown hook, try-with-resources for local scopes).",
            "Prefer `execute` for fire-and-forget tasks; when using `submit`, always read the `Future` or log inside the task.",
            "Put a timeout on every `get` that waits for I/O, and cancel the task when you stop waiting for it.",
            "Write task code that responds to interruption: check `Thread.currentThread().isInterrupted()` in long loops, and restore the flag (`Thread.currentThread().interrupt()`) when catching `InterruptedException` without rethrowing.",
            "Wrap the body of every periodic task in `try`/`catch`, record the last success time, and alert when it's older than a few periods.",
            "Use `scheduleWithFixedDelay` for jobs that call other systems, so a slow run doesn't trigger a burst of catch-up runs.",
            "Shut down in two phases: `shutdown()`, `awaitTermination` with a deadline shorter than the platform's grace period, then `shutdownNow()`.",
            "Make queued work durable or idempotent if losing it on shutdown or crash matters; an in-memory queue is not a work queue you can trust.",
            "Name pool threads (next lesson) so thread dumps say `fare-sync-1`, not `pool-7-thread-1`.",
            "Treat the `Executors` factories as prototypes: for production pools, construct `ThreadPoolExecutor` with a bounded queue and a deliberate rejection policy.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Processes, Threads and Creating Threads measured the cost of a single thread start against a pool hand-off. Here the same question for a whole workload, with virtual threads added: 20,000 tiny tasks (about half a microsecond of work each), run four ways, best of five runs:",
        },
        {
          type: "code",
          language: "java",
          title: "ThreadVsPool.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.LongAdder;

public class ThreadVsPool {
    static final int TASKS = 20_000;
    static final LongAdder SINK = new LongAdder();

    static void quote(int i) {                              // a tiny task: about a microsecond of work
        long fare = 0;
        for (int k = 0; k < 200; k++) fare += (i * 31L + k) % 97;
        SINK.add(fare);
    }

    interface Run { void go() throws Exception; }

    static void time(String label, Run r) throws Exception {
        long best = Long.MAX_VALUE;
        for (int rep = 0; rep < 5; rep++) {
            long t = System.nanoTime();
            r.go();
            best = Math.min(best, System.nanoTime() - t);
        }
        System.out.printf("%-34s %6d ms  %6.1f us/task%n", label, best / 1_000_000, best / 1_000.0 / TASKS);
    }

    public static void main(String[] args) throws Exception {
        time("new Thread per task, 8 at a time", () -> {
            for (int i = 0; i < TASKS; i += 8) {
                Thread[] batch = new Thread[8];
                for (int j = 0; j < 8; j++) {
                    int id = i + j;
                    batch[j] = new Thread(() -> quote(id));
                    batch[j].start();
                }
                for (Thread t : batch) t.join();
            }
        });
        ExecutorService pool = Executors.newFixedThreadPool(8);
        time("fixed pool of 8, submit + get", () -> {
            List<Future<?>> fs = new ArrayList<>(TASKS);
            for (int i = 0; i < TASKS; i++) {
                int id = i;
                fs.add(pool.submit(() -> quote(id)));
            }
            for (Future<?> f : fs) f.get();
        });
        pool.close();
        time("virtual thread per task", () -> {
            try (ExecutorService v = Executors.newVirtualThreadPerTaskExecutor()) {
                for (int i = 0; i < TASKS; i++) {
                    int id = i;
                    v.submit(() -> quote(id));
                }
            }
        });
        time("same work on the calling thread", () -> {
            for (int i = 0; i < TASKS; i++) quote(i);
        });
    }
}`,
        },
        {
          type: "output",
          text: `new Thread per task, 8 at a time     2161 ms   108.1 us/task
fixed pool of 8, submit + get          17 ms     0.9 us/task
virtual thread per task                32 ms     1.6 us/task
same work on the calling thread         7 ms     0.4 us/task`,
        },
        {
          type: "list",
          items: [
            "**A new platform thread per task cost about 108 microseconds per task**: creating the thread, the `clone` system call, allocating its stack, scheduling it, and joining it. The pool did the same 20,000 tasks in 17 ms, **over 100 times faster**, because its 8 threads were created once and each task cost only a queue hand-off and a `FutureTask`.",
            "**The pool is still about twice as slow as doing the work inline** (0.9 against 0.4 µs per task) for work this tiny. Handing a task to another thread costs a few hundred nanoseconds; it pays off only when the task is much bigger than that, or when it blocks.",
            "**Virtual threads** (1.6 µs per task) are far cheaper to create than platform threads, but for pure CPU work a small pool is still cheaper. Their advantage is blocking work, covered in Virtual Threads, Pinning and Structured Concurrency.",
            "Over three runs the ranges were 2,034 to 2,321 ms for threads per task, 15 to 17 ms for the pool and 29 to 47 ms for virtual threads. These are `System.nanoTime` measurements on one 8-core machine with other benchmarks running (load average around 9), not JMH. The ratio between threads-per-task and the pool, over 100 times, was the stable result.",
          ],
        },
      ],
    },
    {
      title: "Scheduled Jobs in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend kept a local copy of base fares per zone, refreshed every 15 minutes from the pricing service with `scheduleAtFixedRate`. One evening the pricing team deployed a change that briefly left `NEW-TOWN` out of the surge table. The sync job hit a `NullPointerException` on one run, and never ran again. There were no errors in the logs, the service's health check was green, and the fares stayed frozen at the old values for three days, until finance noticed that `NEW-TOWN` trips weren't getting the new evening surcharge. I rebuilt it with 100 ms standing in for 15 minutes:",
        },
        {
          type: "code",
          language: "java",
          title: "FareSyncJob.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class FareSyncJob {
    // 100 ms here stands for the real job's 15 minutes
    static final long PERIOD_MS = 100;

    // The pricing service's response: run 4 contains a zone with no surge entry (a bad deploy upstream)
    static final AtomicInteger RUN = new AtomicInteger();
    static Map<String, Integer> fetchSurge() {
        int run = RUN.incrementAndGet();
        Map<String, Integer> m = new ConcurrentHashMap<>(Map.of("SALT-LAKE", 120, "NEW-TOWN", 100));
        if (run == 4 || run == 5) m.remove("NEW-TOWN");
        return m;
    }

    static final Map<String, Long> FARES = new ConcurrentHashMap<>();   // base fare in paise, by zone
    static void sync() {
        Map<String, Integer> surge = fetchSurge();
        for (String zone : List.of("SALT-LAKE", "NEW-TOWN")) {
            int pct = surge.get(zone);                                  // NPE when the zone is missing
            FARES.put(zone, 10_000L * pct / 100);
        }
    }

    static long t0;
    static long ms() { return (System.nanoTime() - t0) / 1_000_000; }

    public static void main(String[] args) throws Exception {
        System.out.println("BEFORE: the task as shipped");
        ScheduledExecutorService ses = Executors.newScheduledThreadPool(1);
        t0 = System.nanoTime();
        ses.scheduleAtFixedRate(() -> {
            sync();
            System.out.println("  " + ms() + " ms sync ok, run " + RUN.get());
        }, 0, PERIOD_MS, TimeUnit.MILLISECONDS);
        Thread.sleep(10 * PERIOD_MS);
        System.out.println("  runs attempted in 10 periods: " + RUN.get() + ", nothing logged, executor alive: " + !ses.isShutdown());
        ses.shutdownNow();

        System.out.println("AFTER: catch inside the task, record success, watch staleness");
        RUN.set(0);
        AtomicLong lastSuccess = new AtomicLong(System.nanoTime());
        AtomicInteger failures = new AtomicInteger();
        ScheduledExecutorService fixed = Executors.newScheduledThreadPool(2);   // the watchdog gets its own thread
        t0 = System.nanoTime();
        fixed.scheduleAtFixedRate(() -> {
            try {
                sync();
                lastSuccess.set(System.nanoTime());
                System.out.println("  " + ms() + " ms sync ok, run " + RUN.get());
            } catch (Exception e) {                                      // never let it escape
                failures.incrementAndGet();
                System.out.println("  " + ms() + " ms sync FAILED, run " + RUN.get() + ": " + e);
            }
        }, 0, PERIOD_MS, TimeUnit.MILLISECONDS);
        fixed.scheduleAtFixedRate(() -> {                                // the watchdog: alert on staleness
            long ageMs = (System.nanoTime() - lastSuccess.get()) / 1_000_000;
            if (ageMs > 2 * PERIOD_MS) System.out.println("  " + ms() + " ms ALERT: fares are " + ageMs + " ms stale");
        }, PERIOD_MS / 2, PERIOD_MS, TimeUnit.MILLISECONDS);
        Thread.sleep(10 * PERIOD_MS);
        System.out.println("  runs attempted: " + RUN.get() + ", failures: " + failures.get());
        fixed.shutdownNow();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java FareSyncJob 2>&1",
        },
        {
          type: "output",
          text: `BEFORE: the task as shipped
  6 ms sync ok, run 1
  106 ms sync ok, run 2
  206 ms sync ok, run 3
  runs attempted in 10 periods: 4, nothing logged, executor alive: true
AFTER: catch inside the task, record success, watch staleness
  3 ms sync ok, run 1
  103 ms sync ok, run 2
  203 ms sync ok, run 3
  303 ms sync FAILED, run 4: java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
  403 ms sync FAILED, run 5: java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
  456 ms ALERT: fares are 253 ms stale
  503 ms sync ok, run 6
  603 ms sync ok, run 7
  703 ms sync ok, run 8
  803 ms sync ok, run 9
  903 ms sync ok, run 10
  1003 ms sync ok, run 11
  runs attempted: 11, failures: 2`,
        },
        {
          type: "list",
          items: [
            "**Before: 4 runs attempted, 3 logged, then silence.** Run 4 threw (the unboxing NPE from Wrapper Traps: Equality, Overloading and Performance), the exception went into the task's `ScheduledFuture`, which nobody reads, and the task was never scheduled again. Even with stderr captured (`2>&1`), there was nothing to see. The executor was alive, which is all a generic health check would look at.",
            "**After: the bad data cost two runs, not three days.** The `try`/`catch` keeps every exception inside the task, so the task is always re-queued. Runs 4 and 5 failed and were logged with the cause; run 6, after the upstream fix, succeeded on its own.",
            "**The watchdog turned a silent failure into an alert.** It checks the age of the last success every period and alerted at 456 ms when the fares were 253 ms (2.5 periods) old. In production that's a metric (`fare_sync_last_success_timestamp`) with an alert rule, not a `println`, but the idea is the same: monitor the **outcome** of the job, not the existence of the thread.",
            "**The watchdog needs its own thread.** I gave the fixed scheduler two threads; on a single-threaded scheduler, a sync run that hangs (rather than throws) would also block the watchdog that's supposed to detect it. An external monitor of the timestamp is more robust still.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took away from it:",
        },
        {
          type: "list",
          items: [
            "Every periodic task body is `try { ... } catch (Exception e) { log; count; }`. Catching `Throwable` is debatable; an `Error` like `OutOfMemoryError` usually means the process should restart anyway, but it must at least be logged.",
            "Know where exceptions go for each API: `execute` prints and kills the thread, `submit` hides them in the `Future`, periodic scheduling hides them and stops the task.",
            "Monitor jobs by their results (last success time, items synced, failure count), not by whether a thread or executor exists.",
            "Validate upstream data at the boundary (`getOrDefault`, or reject the whole response) so one missing key fails one zone, not the whole run. In this rebuild, `SALT-LAKE` was updated in runs 4 and 5 while `NEW-TOWN` failed, leaving a half-applied update; applying all zones only after all of them parse is better.",
            "Prefer `scheduleWithFixedDelay` for sync jobs, and for anything that must run on a fleet of servers exactly once, a scheduler with a database lock (the last two lessons of this track).",
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
              question: "Why use a thread pool instead of creating a new thread for each task?",
              answer:
                "Creating a platform thread is expensive (a system call, a stack, scheduling) and unbounded thread creation can exhaust memory or the OS thread limit. A pool creates a fixed set of threads once and reuses them, and it bounds concurrency. In my measurement, 20,000 tiny tasks took about 108 µs each with a new thread per task and 0.9 µs each on a fixed pool of 8, over 100 times faster.",
            },
            {
              question: "What is the difference between Runnable and Callable?",
              answer:
                "`Runnable.run()` returns nothing and can't throw checked exceptions. `Callable<V>.call()` returns a `V` and is declared `throws Exception`. `execute` accepts only `Runnable`; `submit` accepts both and returns a `Future` (for a `Runnable`, a `Future<?>` whose `get()` returns `null`).",
            },
            {
              question: "What is the difference between execute() and submit()?",
              answer:
                "`execute(Runnable)` returns nothing; if the task throws, the exception propagates out of the worker thread, the uncaught-exception handler prints it, and the pool replaces the dead thread. `submit` wraps the task in a `FutureTask` and returns it as a `Future`; an exception is caught and stored in the future, printed nowhere, and only rethrown (wrapped in `ExecutionException`) by `get()`. In my test, `execute` printed a stack trace and the next task ran on `pool-1-thread-2`; `submit` printed nothing.",
            },
            {
              question: "What is the difference between shutdown() and shutdownNow()?",
              answer:
                "Both stop new tasks from being accepted. `shutdown()` lets queued and running tasks finish and returns immediately. `shutdownNow()` interrupts running tasks and removes queued ones, returning them as a list. Neither waits; `awaitTermination` (or `close()` in Java 19+) does. In my test with one running and three queued tasks, `shutdown` let all four finish in 829 ms; `shutdownNow` interrupted the first and returned 3.",
            },
            {
              question: "Why doesn't my program exit after main() finishes?",
              answer:
                "Pool threads created by the `Executors` factories are non-daemon threads, and the JVM waits for all non-daemon threads before exiting. An idle pool thread waits in `queue.take()` forever. Call `shutdown()` (or use try-with-resources on Java 19+). A thread dump shows the culprit: `pool-1-thread-1` in `WAITING (parking)` in `LinkedBlockingQueue.take`, and `DestroyJavaVM` waiting.",
            },
            {
              question: "What does Future.get() do, and what can it throw?",
              answer:
                "It blocks until the task finishes, then returns the result. It throws `ExecutionException` if the task threw (the original exception is the cause), `CancellationException` if it was cancelled, `InterruptedException` if the waiting thread is interrupted, and with a timeout, `TimeoutException` if time runs out, which does not cancel the task.",
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
              question: "What does Executors.newFixedThreadPool(n) really create, and what's risky about it?",
              answer:
                "A `ThreadPoolExecutor` with core and max both `n`, keep-alive 0 and an unbounded `LinkedBlockingQueue` (capacity `Integer.MAX_VALUE`). Threads never exceed `n`, but nothing ever rejects a task, so under sustained overload the queue grows until latency is huge and the heap runs out. `newCachedThreadPool` has the opposite risk: a `SynchronousQueue` and up to `Integer.MAX_VALUE` threads.",
            },
            {
              question: "How does cancel(true) work, and when doesn't it stop a task?",
              answer:
                "It moves the `FutureTask` to `INTERRUPTING` by CAS, calls `interrupt()` on the runner thread, then sets `INTERRUPTED`. The task stops only if its code reacts to the interrupt: blocking methods like `sleep`, `wait`, `BlockingQueue.take` throw `InterruptedException`; loops must check the flag themselves. A busy loop or a classic blocking socket read ignores it. In my test the future said `isDone=true` while a busy loop ran another 250 ms.",
            },
            {
              question: "What is the difference between scheduleAtFixedRate and scheduleWithFixedDelay?",
              answer:
                "Fixed rate schedules each run at the previous *scheduled* time plus the period, so starts stay on a timetable (0, 100, 200 ms); fixed delay schedules each run a delay after the previous run *ends* (0, 130, 260 ms with 30 ms of work). Neither overlaps runs of the same task. When a fixed-rate run is slow, the missed runs execute back to back to catch up (351, 361, 371 ms in my test). Internally the period is stored positive for rate and negative for delay.",
            },
            {
              question: "What happens if a periodic scheduled task throws an exception?",
              answer:
                "All future executions are suppressed, silently. `ScheduledFutureTask.run` calls `runAndReset()`, which catches the exception, stores it in the future and returns `false`, so the task isn't re-queued. Nothing is printed; the `ScheduledFuture` becomes done with state `FAILED`, and only `get()` reveals the exception. The fix is a `try`/`catch` inside the task and monitoring of the last success time.",
            },
            {
              question: "What's the difference between invokeAll and invokeAny?",
              answer:
                "`invokeAll` runs all tasks and waits for all of them, returning completed futures in input order (with failures inside their futures); with a timeout, unfinished tasks are cancelled. `invokeAny` returns the result of the first task that completes **successfully** and cancels the rest; it throws `ExecutionException` only if all tasks fail. In my test a provider that failed first was ignored and the 200 ms success won.",
            },
            {
              question: "Is ExecutorService AutoCloseable? What does close() do?",
              answer:
                "Since Java 19, yes. The default `close()` calls `shutdown()` and then waits for termination with no time limit; if the waiting thread is interrupted it calls `shutdownNow()` and restores the interrupt status. That makes try-with-resources correct for scoped pools, but a stuck task makes `close()` stuck too, so long-lived server pools are better stopped with a deadline.",
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
              question: "How does FutureTask store its result and make it visible to the thread calling get()?",
              answer:
                "The result or exception goes into a non-volatile `outcome` field, and then a volatile `state` is set to `NORMAL` or `EXCEPTIONAL` with a release write. `get()` reads `state` (a volatile read) before reading `outcome`, so the write to `outcome` happens-before the read. Waiting threads are kept in a lock-free Treiber stack of `WaitNode`s and are woken with `LockSupport.unpark` by `finishCompletion`.",
            },
            {
              question: "Why does a pool that runs failing tasks through execute() keep creating threads?",
              answer:
                "`runWorker` rethrows the task's exception after `afterExecute`, so it escapes the worker's `run()` and the thread terminates. `processWorkerExit` is called with `completedAbruptly = true` and starts a replacement worker so the pool keeps its size. Each failure costs a thread creation and a stack trace, and thread names keep counting up (`pool-1-thread-2`, `-3`...). With `submit`, the `FutureTask` catches the exception, so the worker survives.",
            },
            {
              question: "Why does newSingleThreadExecutor return a wrapper instead of a ThreadPoolExecutor?",
              answer:
                "So the guarantee of exactly one thread (and therefore sequential execution in submission order) can't be broken by casting it to `ThreadPoolExecutor` and calling `setCorePoolSize`. In JDK 21 the wrapper is `AutoShutdownDelegatedExecutorService`, which also uses a `Cleaner` to shut the pool down if the wrapper becomes unreachable. `newFixedThreadPool(1)` returns a real `ThreadPoolExecutor` that could be resized.",
            },
            {
              question: "What is a thread-starvation deadlock in a pool?",
              answer:
                "Tasks running in a pool block waiting (with `get()`) for other tasks submitted to the same pool. If all `n` threads are occupied by waiting parents, the children sit in the queue with no thread to run them, and nothing progresses, without any lock involved. Fixes: separate pools for dependent stages, a larger or unbounded pool (moving the problem), or non-blocking composition with `CompletableFuture`.",
            },
            {
              question: "How would you shut down an executor in a service that receives SIGTERM?",
              answer:
                "In a shutdown hook (or the framework's lifecycle callback): `shutdown()` to stop intake and let queued work finish, `awaitTermination` with a deadline shorter than the platform's grace period, then `shutdownNow()` to interrupt the rest, and log what was dropped. Tasks must be interruptible and their work durable or idempotent so dropped work can be retried. In my `GracefulStop` run, 6 payouts finished, 2 were interrupted and 12 never started, all accounted for.",
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
              question: "A scheduled job that syncs fares every 15 minutes stopped running three days ago. There are no errors in the logs and the service is healthy. What happened, and how do you fix it?",
              answer:
                "Almost certainly an exception escaped the task once: with `scheduleAtFixedRate`/`scheduleWithFixedDelay`, that suppresses all later runs and the exception is stored only in the `ScheduledFuture`, which nobody reads. I'd confirm by finding the last successful run in the logs and, if the process is still up, checking for the scheduler thread (alive, idle in `DelayedWorkQueue.take`) in a thread dump.\n\nFix: wrap the task body in `try`/`catch` that logs and counts failures, record the last success time as a metric, and alert when it's older than two or three periods. My rebuild went from \"stopped after run 3\" to \"two failed runs, logged, an alert, then recovery\".",
            },
            {
              question: "Background tasks occasionally fail but nothing ever shows up in the logs. The code uses executor.submit(...) everywhere. What do you check?",
              answer:
                "Whether anyone calls `get()` on those futures. `submit` captures exceptions in the `FutureTask`, so unread futures swallow them; my `SubmitVsExecute` test printed nothing for a failing submitted task. I'd search for `submit(` calls whose return value is discarded.\n\nFixes: use `execute` for fire-and-forget (exceptions then reach the uncaught-exception handler), or wrap tasks in a logging decorator, or subclass `ThreadPoolExecutor` and inspect futures in `afterExecute`. Also make sure the uncaught-exception handler logs through the logging framework, not just stderr.",
            },
            {
              question: "After a deploy, old pods take the full 30-second grace period to stop and then get SIGKILLed. What would you look at?",
              answer:
                "Something keeps the JVM alive after the application stops: usually executor threads that were never shut down. I'd take a thread dump during shutdown (`jcmd <pid> Thread.print`) and look for non-daemon threads like `pool-3-thread-1` parked in `LinkedBlockingQueue.take`, plus `DestroyJavaVM` waiting.\n\nFix: give every pool an owner that shuts it down on application stop (shutdown, awaitTermination with a deadline under 30 s, shutdownNow), and name pool threads so the dump shows which component owns them.",
            },
            {
              question: "The number of threads in a service grows by thousands per hour until it fails with OutOfMemoryError: unable to create native thread. What's the likely cause?",
              answer:
                "A new executor created per request (or per message) and never shut down. Each pool leaves its threads parked forever, and a GC doesn't help because started threads are GC roots. My `PoolPerRequest` leaked exactly two threads per call: 1,000 extra threads after 500 calls.\n\nI'd confirm with a thread dump: thousands of `pool-N-thread-M` with ever-increasing `N`. Fix by sharing one application-wide pool, or at minimum scoping per-call pools in try-with-resources.",
            },
            {
              question: "Request latency spikes whenever the maps provider is slow, even though the ETA is fetched in a separate pool. A thread dump shows many request threads in FutureTask.awaitDone. Why, and what do you change?",
              answer:
                "The request threads call `future.get()` without a timeout, so moving the call to a pool didn't help: each request thread still waits as long as the provider takes. I'd switch to `get(300, MILLISECONDS)`, cancel the task on `TimeoutException`, and return a fallback (a cached or estimated ETA).\n\nI'd also put timeouts on the HTTP client itself, because `cancel(true)` can't stop a blocking socket read, and bound the ETA pool so a slow provider can't accumulate thousands of stuck tasks. `invokeAll(tasks, timeout)` is an option when several providers are queried at once.",
            },
            {
              question: "A report job is cancelled from an admin page; the UI says \"cancelled\" but CPU stays at 100% for another ten minutes. Why?",
              answer:
                "`cancel(true)` only interrupts the thread; the future is marked cancelled immediately, but the report code (a long computation loop) never checks the interrupt flag. My `FutureDemo` busy loop finished 250 ms after `cancel(true)` returned and `isDone()` said `true`.\n\nFix the task: check `Thread.currentThread().isInterrupted()` every N rows and stop cleanly, and make sure no code catches `InterruptedException` and carries on without restoring the flag.",
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
            "Run `NoExit` and take a thread dump with `jcmd NoExit Thread.print` while it hangs. Then add `pool.shutdown()` at the end of `main` and run it again.",
            "Submit a task that throws with `submit`, and the same task with `execute`, to a `newFixedThreadPool(1)`. Print the thread name inside the tasks and compare what's printed.",
            "Submit three 100 ms tasks to `newSingleThreadExecutor()`, call `shutdownNow()` after 50 ms and print the size of the returned list.",
            "Call `invokeAny` with two `Callable`s that both throw. What is thrown, and what's its cause?",
            "Cast `Executors.newFixedThreadPool(2)` to `ThreadPoolExecutor` and call `setCorePoolSize(5)`. Then try to cast `Executors.newSingleThreadExecutor()` to `ThreadPoolExecutor`.",
            "Schedule a task with `scheduleAtFixedRate` every 100 ms that throws on its third run, count the runs after one second, and print `future.state()`.",
            "Shut down a `newCachedThreadPool()` and then call `submit` on it.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 hangs with `pool-1-thread-1` in `WAITING (parking)` at `LinkedBlockingQueue.take`, and exits immediately once `shutdown()` is added. Step 2 prints a stack trace for `execute` and nothing for `submit`; the task after the `execute` failure runs on `pool-1-thread-2`. Step 3 prints 2: one task was running (and is interrupted), two were queued. Step 4 throws `ExecutionException`; in my run its cause was the second task's exception (`IllegalStateException: b`). Step 5 throws `IllegalArgumentException`, because the new core size (5) exceeds the maximum (2); the second cast throws `ClassCastException`, because the single-thread executor is a wrapper. Step 6 counts 3 runs and prints `FAILED`. Step 7 throws `RejectedExecutionException`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHY POOLS    new Thread per task ~108 us; pooled task ~0.9 us (20,000 tasks, 8 threads)

FACTORIES    newFixedThreadPool(n)    TPE(n, n), UNBOUNDED LinkedBlockingQueue
             newCachedThreadPool()    TPE(0, MAX_VALUE), SynchronousQueue, 60 s idle
             newSingleThreadExecutor  wrapper around TPE(1, 1), can't be resized
             newScheduledThreadPool   ScheduledTPE, DelayedWorkQueue (heap)
             newWorkStealingPool      ForkJoinPool, daemon threads

execute      exception -> uncaught handler prints it, worker dies, pool replaces it
submit       FutureTask catches it -> state EXCEPTIONAL -> only get() throws
             ExecutionException(cause); nobody calls get() -> nobody knows

Future       get() blocks | get(t) TimeoutException, task keeps running
             cancel(true) interrupts runner; code must check the flag
             isDone() true for success, failure AND cancel; state() (19+)

BULK         invokeAll: waits for all, futures in input order
             invokeAny: first SUCCESS wins, rest cancelled

STOPPING     shutdown: no new, queue drains   shutdownNow: interrupt + return queue
             awaitTermination: the wait   close() (19+): shutdown + wait forever
             non-daemon pool threads keep the JVM alive

SCHEDULING   fixed rate: timetable, catch-up burst   fixed delay: gap after end
             ONE exception -> periodic task silently never runs again
             -> try/catch inside + last-success metric + alert`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "An `ExecutorService` decouples submitting work from running it, and `submit` turns every task into a `FutureTask` whose state, outcome and waiters are the whole story of a `Future`: results, exceptions, cancellation and blocking all live there.",
            "Most production surprises come from where exceptions and threads go: swallowed exceptions in unread futures, periodic tasks that stop after one failure, pools that keep the JVM alive or leak threads, and cancellation that only interrupts.",
            "Next comes ThreadPoolExecutor Internals: Queues, Rejection and Sizing: the exact algorithm that decides between a new thread, the queue and rejection, the `ctl` field and `Worker` class behind it, the four rejection policies, how to size a pool, and a notification service that ran out of memory because of `newFixedThreadPool`'s unbounded queue.",
          ],
        },
      ],
    },
  ],
};
