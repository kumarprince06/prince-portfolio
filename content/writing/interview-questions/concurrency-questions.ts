import type { Lesson } from "../types";

export const concurrencyQuestions: Lesson = {
  slug: "concurrency-interview-questions",
  date: "2026-10-29",
  title: "Multithreading and Concurrency Interview Questions",
  description: "Java concurrency questions from threads, synchronized, volatile and the memory model to CAS, AQS, thread pools, CompletableFuture and virtual threads. The page ends with the distributed side: conditional updates, optimistic and pessimistic locking, SKIP LOCKED and idempotency keys.",
  tags: [
    "Interview",
    "Java",
    "Concurrency",
    "Multithreading",
  ],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These are the multithreading and concurrency questions I get asked, written the way I'd answer them out loud. Try answering each one yourself before you open it. A ⭐ marks the ones that come up most often.",
        },
        {
          type: "paragraph",
          text: "The page goes from single-JVM basics (threads, locks, `volatile`, pools) to the part backend interviews care about most: keeping data correct when the same app runs on several servers at once.",
        },
      ],
    },
    {
      title: "Threads Basics",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is the difference between a process and a thread?",
              answer: "A process is like a restaurant: it has its own kitchen, storeroom and money, separate from the restaurant next door. Threads are the cooks inside one restaurant: they share the kitchen and the storeroom, and each has their own order slip.\n\nTechnically, a process has its own memory space. Threads inside a process share the heap but each has its own stack. Threads are cheaper to create and switch between, but sharing the heap is exactly why thread safety matters. One JVM is one process with many threads; a web server like Tomcat serves each request on a thread from its pool.",
            },
            {
              question: "⭐ How do I create a thread? `Runnable` vs `Callable`?",
              answer: "Four ways: extend `Thread`, pass a `Runnable` to a `Thread`, submit a `Callable` to an executor, or (the right default) submit tasks to an `ExecutorService` and let it manage the threads.\n\n`Runnable.run()` returns nothing and can't throw checked exceptions. `Callable.call()` returns a value and can throw, and I get the result through a `Future`. Implementing `Runnable` beats extending `Thread`, because the task stays separate from how it's run.",
            },
            {
              question: "What are the thread states?",
              answer: "`NEW` (created, not started), `RUNNABLE` (running or ready to run), `BLOCKED` (waiting to enter a `synchronized` block another thread holds), `WAITING` (waiting with no time limit, as in `wait()`, `join()` or `LockSupport.park()`), `TIMED_WAITING` (the same with a time limit, as in `sleep(ms)` or `wait(ms)`), and `TERMINATED`.\n\nIn a thread dump, lots of threads in `BLOCKED` on the same lock means contention; lots of `WAITING` on a pool's queue is just idle workers.",
            },
            {
              question: "⭐ `start()` vs `run()`?",
              answer: "`start()` asks the JVM to create a new thread, and that new thread calls `run()`. Calling `run()` directly just runs the code on the current thread like any normal method: no new thread, no concurrency. Calling `start()` twice on the same thread throws `IllegalThreadStateException`.",
            },
            {
              question: "⭐ `sleep()` vs `wait()`?",
              answer: "`sleep` is a static method on `Thread`. It pauses the current thread for some time and keeps every lock it holds, like a cashier who naps at the counter and keeps the drawer key.\n\n`wait` is a method on `Object`. It must be called while holding that object's lock, inside `synchronized`. It releases the lock and waits until another thread calls `notify` or `notifyAll` on the same object, then has to re-acquire the lock before continuing.\n\n`wait` should always sit in a `while` loop that re-checks the condition, because threads can wake up spuriously, or another thread may have grabbed the item first.",
            },
            {
              question: "Why are `wait` and `notify` on `Object` and not on `Thread`?",
              answer: "Because waiting is tied to a lock, and any object can be a lock (a monitor). Threads wait for a condition on a particular object, like \"this queue is no longer empty\", so the waiting room belongs to that object.",
            },
            {
              question: "What do `join()` and daemon threads do?",
              answer: "`t.join()` makes the current thread wait until `t` finishes. Like waiting for a friend to finish paying before you leave the shop together.\n\nA daemon thread doesn't keep the JVM alive: when only daemon threads are left, the JVM exits. Background helpers like a cache-cleanup timer are good daemons. `setDaemon(true)` must be called before `start()`.",
            },
            {
              question: "How do I stop a thread properly?",
              answer: "Not with `Thread.stop()`, which is deprecated because it kills the thread mid-operation and can leave data half-updated. I ask nicely: call `interrupt()`, and the thread checks `Thread.currentThread().isInterrupted()` in its loop, or gets an `InterruptedException` from `sleep`, `wait` or `take`. A `volatile boolean running` flag also works for simple loops.\n\nWhen catching `InterruptedException` without rethrowing, I restore the flag with `Thread.currentThread().interrupt()`, so code higher up still knows a stop was requested.",
            },
          ],
        },
      ],
    },
    {
      title: "synchronized and Monitors",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What does `synchronized` do?",
              answer: "It makes a block of code one-at-a-time, like a single-person washroom with a lock on the door: whoever holds the key goes in, everyone else waits outside. It also guarantees visibility: whatever the previous holder wrote is visible to the next one who gets the lock.\n\nA synchronized instance method locks `this`; a static synchronized method locks the `Class` object; a synchronized block locks whatever object I name. I prefer a block on a private lock object around just the critical lines: less time holding the lock means less waiting.",
            },
            {
              question: "Object lock vs class lock?",
              answer: "An object lock (`synchronized` instance method, or `synchronized(this)`) is per object. Two threads can run the same synchronized method on two different objects at the same time.\n\nA class lock (`static synchronized`, or `synchronized(Booking.class)`) is one per class. A static synchronized method and an instance synchronized method can run at the same time, since they hold different locks.",
            },
            {
              question: "How does `synchronized` work internally?",
              answer: "Every object can act as a monitor. Its lock state lives in the object header's \"mark word\". The bytecode for a synchronized block is `monitorenter` at the start and `monitorexit` at the end, plus an extra `monitorexit` on the exception path so the lock is always released.\n\nThe JVM makes the common case cheap. If no other thread is competing, taking the lock is a single CAS on the header (a lightweight lock). When threads really compete, it inflates to a full monitor where waiting threads are parked by the operating system. Biased locking, an older optimisation, was disabled in JDK 15 and later removed.\n\n`synchronized` is reentrant: a thread holding the lock can enter another block on the same lock, and the JVM counts the entries.",
            },
            {
              question: "What does reentrant mean, and why does it matter?",
              answer: "A thread that already holds a lock can take it again without blocking itself. If `placeOrder()` and `applyDiscount()` are both synchronized and one calls the other, a non-reentrant lock would make the thread wait for itself forever. Both `synchronized` and `ReentrantLock` count how many times the owner entered and release only when the count gets back to zero.",
            },
          ],
        },
      ],
    },
    {
      title: "volatile and the Java Memory Model",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What does `volatile` guarantee?",
              answer: "Visibility and ordering. Without it, a thread may keep reading a stale copy of a field, cached in a register or a CPU cache, and never see another thread's update. A `volatile` write is seen by every later read of that field, and writes before the volatile write can't be reordered after it.\n\nThink of a whiteboard in an office versus personal notebooks. Without `volatile`, each worker may copy the value into their notebook and keep reading the notebook. With `volatile`, everyone always reads and writes the whiteboard.\n\nThe classic good use is a stop flag: `private volatile boolean running = true;` set to false by another thread.",
            },
            {
              question: "⭐ Why isn't `volatile` enough for `count++`?",
              answer: "Because `count++` is three steps: read, add one, write. `volatile` makes each read and write visible, but not the three together atomic. Two threads can both read 5, both compute 6, and both write 6: one increment is lost.\n\nIt's like two bank tellers both reading a balance of ₹1000, each adding a ₹100 deposit, and both writing ₹1100. The bank lost ₹100. For counters I use `AtomicInteger`, `LongAdder` or a lock.",
            },
            {
              question: "What is the Java Memory Model and happens-before?",
              answer: "The JMM is the set of rules that says when one thread's writes are guaranteed to be visible to another thread. Compilers and CPUs reorder and cache aggressively, so without these rules \"I wrote it, why can't you see it?\" would be normal.\n\nThe key idea is happens-before: if action A happens-before action B, then B sees everything A did. The main rules: unlocking a monitor happens-before the next lock of the same monitor. A `volatile` write happens-before every later read of that field. `Thread.start()` happens-before everything in the started thread. Everything in a thread happens-before another thread returns from `join()` on it. And the rule chains: if A happens-before B and B happens-before C, then A happens-before C.\n\nWithout one of these edges, there's no visibility guarantee at all.",
            },
            {
              question: "How does `volatile` work internally?",
              answer: "The JIT inserts memory barriers around volatile accesses. A volatile write can't be reordered with the writes before it, and it's made visible to other cores. A volatile read can't be reordered with the reads after it, and it can't be served from a stale cached value. On x86 the write usually becomes a locked instruction, and reads are almost free. It's visibility and ordering only, never atomicity for compound actions.",
            },
            {
              question: "Why does double-checked locking need `volatile`?",
              answer: "`instance = new Cache()` is really three steps: allocate memory, run the constructor, assign the reference. Without `volatile`, those can be reordered so the reference is published before the constructor finishes. A second thread then sees a non-null `instance` on the first, unlocked check and uses a half-built object. `volatile` forbids that reordering.",
            },
          ],
        },
      ],
    },
    {
      title: "Atomics and CAS",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is a race condition?",
              answer: "When the result depends on the timing of threads. The classic shape is check-then-act: \"if the seat is free, book it\". Two people check at the same moment, both see \"free\", and both book. The other shape is read-modify-write, like `count++`.\n\nThe fix is to make the check and the act one indivisible step: a lock, an atomic operation, or, across servers, a conditional database update.",
            },
            {
              question: "⭐ What is CAS, and how do atomic classes work without locks?",
              answer: "CAS (compare-and-swap) is a single CPU instruction: \"set this value to 6, but only if it is still 5\". If another thread changed it in the meantime, the CAS fails and nothing is written.\n\n`AtomicInteger` holds a `volatile int` and uses CAS through `VarHandle` (or `Unsafe` in older JDKs). `incrementAndGet` is a loop: read the current value, compute the new one, CAS; if the CAS failed because someone else got there first, read again and retry. No thread ever blocks, which is why this is called lock-free.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "int incrementAndGet() {\n    int current, next;\n    do {\n        current = value;          // read\n        next = current + 1;       // compute\n    } while (!compareAndSet(current, next));   // retry if someone else won\n    return next;\n}",
          title: "What incrementAndGet does, in spirit",
        },
        {
          type: "qa",
          items: [
            {
              question: "What is the ABA problem?",
              answer: "CAS only checks that the value is the same, not that it was never changed. A thread reads A, gets paused, another thread changes A to B and back to A, and the first thread's CAS succeeds as if nothing happened. For counters it doesn't matter. For lock-free linked structures it can corrupt data, and `AtomicStampedReference` fixes it by adding a version number to the check.",
            },
            {
              question: "`AtomicLong` vs `LongAdder`?",
              answer: "Under heavy contention, many threads CAS-ing one `AtomicLong` keep failing and retrying, and the CPU cache line bounces between cores. `LongAdder` spreads updates across several cells, so threads mostly update different cells, and `sum()` adds them up when read.\n\nLike a supermarket with several checkout counters, each keeping its own tally, and the manager adding up the tallies at closing time. `LongAdder` is great for metrics and hit counters that are written constantly and read rarely. `AtomicLong` is still right when I need the exact current value on every operation, or `compareAndSet`.",
            },
          ],
        },
      ],
    },
    {
      title: "Locks and AQS",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ `ReentrantLock` vs `synchronized`?",
              answer: "`synchronized` is simpler and releases automatically, even on exceptions. `ReentrantLock` adds `tryLock()` (give up instead of waiting forever, optionally with a timeout), `lockInterruptibly()`, an optional fairness mode (longest waiter goes first), and several `Condition` objects per lock (like separate \"not full\" and \"not empty\" waiting rooms).\n\nThe price: I must call `unlock()` in a `finally` block, every time. My default is `synchronized`, and `ReentrantLock` when I need one of those features.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "private final ReentrantLock lock = new ReentrantLock();\n\nvoid bookSeat(String seat) {\n    lock.lock();\n    try {\n        // check the seat and book it\n    } finally {\n        lock.unlock();\n    }\n}",
          title: "Always unlock in finally",
        },
        {
          type: "qa",
          items: [
            {
              question: "How does `ReentrantLock` work internally? (AQS)",
              answer: "It's built on `AbstractQueuedSynchronizer`. AQS keeps one `volatile int state` (for a lock, 0 means free and anything else is the hold count) and a FIFO queue of waiting threads.\n\n`lock()` tries to CAS the state from 0 to 1. If that works, this thread owns the lock. If the current owner is this thread, it just increments the count. Otherwise, the thread joins the queue and is parked with `LockSupport.park()`. `unlock()` decrements the state, and when it hits 0, it unparks the next waiter in the queue.\n\n`Semaphore`, `CountDownLatch`, `ReentrantReadWriteLock` and the thread-pool worker all sit on AQS; they just interpret `state` differently.",
            },
            {
              question: "What are `ReadWriteLock` and `StampedLock`?",
              answer: "`ReentrantReadWriteLock` lets many readers in together, but a writer gets exclusive access. It's good for data read constantly and changed rarely, like a menu that's updated once a day but read by every customer.\n\n`StampedLock` (Java 8) adds optimistic reading: read without locking, then check whether a write happened meanwhile, and only take a real read lock if one did. It's faster for read-heavy data, but it isn't reentrant and is easier to misuse.",
            },
          ],
        },
      ],
    },
    {
      title: "Deadlock and Friends",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is a deadlock, and what conditions cause it?",
              answer: "Two threads each hold a lock the other needs, and both wait forever. Two cars meeting on a narrow bridge, each refusing to back up.\n\nAll four Coffman conditions must hold: mutual exclusion (a lock has one owner), hold-and-wait (holding one lock while waiting for another), no preemption (a lock can't be taken away), and circular wait (T1 waits for T2 while T2 waits for T1). Break any one and deadlock can't happen.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "// Thread 1: lock(accountA) then lock(accountB)\n// Thread 2: lock(accountB) then lock(accountA)   -> both wait forever",
          title: "The classic deadlock",
        },
        {
          type: "qa",
          items: [
            {
              question: "How do I prevent and detect deadlocks?",
              answer: "Prevention: always take locks in one global order. For a money transfer, lock the account with the smaller ID first, whichever way the money moves. That breaks circular wait. I also use `tryLock` with a timeout, keep critical sections small, and never call unknown code (callbacks, remote calls) while holding a lock.\n\nDetection: take a thread dump with `jstack <pid>` or `jcmd <pid> Thread.print`. The JVM finds monitor and `ReentrantLock` cycles itself and prints \"Found one Java-level deadlock\" with the threads and locks involved.",
            },
            {
              question: "Livelock vs starvation?",
              answer: "Livelock: threads keep reacting to each other without making progress, like two people in a corridor who keep stepping aside in the same direction. Retry loops without random backoff do this.\n\nStarvation: one thread never gets the CPU or the lock because others always win, for example under an unfair lock with constant traffic. Fair locks and bounded waiting help.",
            },
          ],
        },
      ],
    },
    {
      title: "Executors and Thread Pools",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is an `ExecutorService`, and why use it instead of new threads?",
              answer: "A managed pool of worker threads. A restaurant doesn't hire a new cook for every order and fire them afterwards; it keeps a team and hands orders to whoever is free. Creating a thread per task is slow and unbounded: a traffic spike becomes thousands of threads and the server runs out of memory.\n\nI submit tasks, the pool reuses threads, and it gives me control over queueing, sizing and shutdown. When I'm done, `shutdown()` stops new tasks and lets the queued ones finish, and `awaitTermination` waits for them.",
            },
            {
              question: "⭐ `submit` vs `execute`?",
              answer: "`execute(Runnable)` is fire-and-forget. If the task throws, the exception kills that worker and goes to the uncaught exception handler, so at least it gets printed.\n\n`submit(...)` returns a `Future`, and any exception is captured inside the Future. If I never call `get()`, the error disappears silently. That's a real production trap: tasks fail and nobody ever sees a log line. So with `submit`, I either call `get()` or catch and log inside the task.",
            },
            {
              question: "Why is `Executors.newFixedThreadPool` risky in production?",
              answer: "It uses an unbounded `LinkedBlockingQueue`. Under a traffic spike, tasks keep piling up in the queue until memory runs out, and latency grows without limit. `newCachedThreadPool` has the opposite problem: unlimited threads. Both hide overload instead of pushing back.\n\nSo I build the pool myself with a bounded queue and an explicit rejection policy.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "ExecutorService pool = new ThreadPoolExecutor(\n        8,                                   // core threads\n        16,                                  // max threads\n        60, TimeUnit.SECONDS,                // idle time before extra threads die\n        new ArrayBlockingQueue<>(500),       // bounded queue = backpressure\n        new ThreadPoolExecutor.CallerRunsPolicy());",
          title: "A bounded pool with backpressure",
        },
        {
          type: "qa",
          items: [
            {
              question: "How does `ThreadPoolExecutor` handle a new task?",
              answer: "Like a bank branch. If fewer than the core number of tellers are working, open a new counter (start a core thread). Otherwise, the customer takes a token and waits in the queue. If the waiting area is full, call in extra tellers, up to the maximum. If even that's full, apply the rejection policy.\n\nThe order surprises people: the pool grows past core size only when the queue is full. So with an unbounded queue, `maxPoolSize` never matters.\n\nThe rejection policies: `AbortPolicy` (the default, throws `RejectedExecutionException`), `CallerRunsPolicy` (the submitting thread runs the task itself, which naturally slows the producer down), `DiscardPolicy` and `DiscardOldestPolicy`. Extra threads above core die after the keep-alive time.",
            },
            {
              question: "How do I size a thread pool?",
              answer: "For CPU-bound work, about the number of cores (`Runtime.getRuntime().availableProcessors()`); more threads just fight for the same CPUs. For I/O-bound work, more threads, roughly `cores × (1 + wait time / compute time)`, because threads spend most of their time waiting. Then measure and adjust.\n\nAnd downstream limits win: if every task needs a database connection and the pool has 10 connections, 200 threads won't go faster than 10. For I/O-heavy work on Java 21, virtual threads are often the simpler answer.",
            },
            {
              question: "What are `ScheduledExecutorService` and `ForkJoinPool`?",
              answer: "`ScheduledExecutorService` runs tasks after a delay or periodically: `scheduleAtFixedRate` (every N seconds by the clock) and `scheduleWithFixedDelay` (N seconds after the previous run finishes). An uncaught exception in a periodic task quietly cancels all its future runs.\n\n`ForkJoinPool` is built for divide-and-conquer. Each worker has its own deque of tasks, and an idle worker steals from the tail of a busy worker's deque (work stealing). Parallel streams and `CompletableFuture`'s default async methods use the shared common pool.",
            },
          ],
        },
      ],
    },
    {
      title: "CompletableFuture",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ `Future` vs `CompletableFuture`?",
              answer: "A `Future` is like a token at a food counter: the only thing I can do is stand there and wait (`get()` blocks). A `CompletableFuture` is like a buzzer: I say what happens when the food is ready and go sit down.\n\nIt lets me chain steps (`thenApply`, `thenCompose`), combine independent calls (`thenCombine`, `allOf`), recover from errors (`exceptionally`, `handle`) and add timeouts (`orTimeout`, `completeOnTimeout`), all without blocking a thread while waiting.",
            },
            {
              question: "How does `CompletableFuture` chain steps internally?",
              answer: "Each future keeps a stack of dependent actions. When it completes, it pops and runs them. For `thenApply` that's on the thread that completed it (or immediately on the caller if it was already done); for `thenApplyAsync` the action is handed to an executor. The default executor is the common `ForkJoinPool`, which is why I pass my own executor for blocking I/O, so slow calls don't starve parallel streams and everything else on the shared pool.",
            },
          ],
        },
      ],
    },
    {
      title: "Synchronizers",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ `CountDownLatch` vs `CyclicBarrier` vs `Semaphore`?",
              answer: "**CountDownLatch** is a starting gate with a counter: threads wait until the count reaches zero. A rocket launch waits until all 5 checks report \"go\". It's single-use. In tests, a latch of 1 is great for releasing several threads at exactly the same instant to provoke a race.\n\n**CyclicBarrier** is \"wait for each other\": N threads each stop at the barrier, and when the last one arrives, all continue together. Like friends meeting at the cinema gate before going in. It resets itself and can be reused.\n\n**Semaphore** is a set of permits: at most N threads at a time. A parking lot with 5 spaces. I use it to cap concurrent calls to a rate-limited API: `acquire()` before the call, `release()` in `finally`.",
            },
            {
              question: "What is a `Phaser` or an `Exchanger`?",
              answer: "A `Phaser` is a flexible barrier where parties can register and leave between phases, useful when the number of workers changes. An `Exchanger` lets exactly two threads swap objects at a meeting point, like a buffer swap between a filler and an emptier. Both are rare in interviews, but it's good to recognise them.",
            },
          ],
        },
      ],
    },
    {
      title: "ThreadLocal",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is `ThreadLocal`, and how does it work internally?",
              answer: "A variable where each thread gets its own separate value, like a locker per employee: everyone uses the same locker number, but each person opens their own.\n\nThe values aren't stored in the `ThreadLocal` itself. Each `Thread` has a `ThreadLocalMap`, and the `ThreadLocal` object is the key. Frameworks use it to hold per-request data such as the current user, the current transaction, or a request ID for logs.",
            },
            {
              question: "Why can `ThreadLocal` leak memory and data?",
              answer: "In `ThreadLocalMap`, the keys are weak references but the values are strong. In a thread pool, threads live for the whole life of the app. If I set a value and never call `remove()`, it stays reachable from the thread forever: a memory leak. Worse, the next request that lands on that thread can see the previous request's data, like the previous user's identity.\n\nSo it's always `try { holder.set(x); ... } finally { holder.remove(); }`. It's also why code running on another thread, like an async task, doesn't automatically see the caller's thread-local context; it has to be passed or copied on purpose.",
            },
          ],
        },
      ],
    },
    {
      title: "Producer-Consumer",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Implement producer-consumer.",
              answer: "A kitchen and waiters with a counter that holds 10 plates. Cooks put plates on the counter and wait if it's full; waiters take plates and wait if it's empty. A bounded `BlockingQueue` is exactly that counter, so the code stays small and correct.\n\nTo stop consumers cleanly, I send a \"poison pill\" item they recognise, or interrupt them. And I never swallow `InterruptedException`; I restore the interrupt flag.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "BlockingQueue<String> counter = new ArrayBlockingQueue<>(10);   // bounded\n\nRunnable cook = () -> {\n    try {\n        for (int i = 1; i <= 100; i++) counter.put(\"order-\" + i);  // waits when full\n    } catch (InterruptedException e) {\n        Thread.currentThread().interrupt();\n    }\n};\n\nRunnable waiter = () -> {\n    try {\n        while (true) serve(counter.take());                         // waits when empty\n    } catch (InterruptedException e) {\n        Thread.currentThread().interrupt();\n    }\n};",
          title: "Producer-consumer with a BlockingQueue",
        },
        {
          type: "qa",
          items: [
            {
              question: "Can I write producer-consumer with `wait` and `notify`?",
              answer: "Yes, and some interviewers ask for it to check the basics. Synchronize on the shared queue. The producer does `while (queue.size() == capacity) queue.wait();`, adds, then `queue.notifyAll()`. The consumer does `while (queue.isEmpty()) queue.wait();`, removes, then `notifyAll()`.\n\nThe two details they're listening for are `while` (not `if`), because of spurious wake-ups, and `notifyAll` (not `notify`), so the right kind of thread wakes up. Then I'd say that in real code `BlockingQueue` does all of this for me.",
            },
            {
              question: "Print odd and even numbers alternately with two threads.",
              answer: "One shared lock and counter. Each thread loops: wait while it's not its turn (odd thread waits while the counter is even), print, increment, `notifyAll`. Another clean version uses two `Semaphore`s, `odd` starting with 1 permit and `even` with 0: each thread acquires its own and releases the other's, passing the turn back and forth like a baton.",
            },
          ],
        },
      ],
    },
    {
      title: "Virtual Threads",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What are virtual threads, and when do they help?",
              answer: "A platform thread maps one-to-one to an OS thread and costs around a megabyte of stack, so a server can have a few thousand. A virtual thread (Java 21) is a cheap object managed by the JVM. When it blocks on I/O, it unmounts from its carrier OS thread, and the carrier runs another virtual thread meanwhile.\n\nLike a waiter who doesn't stand next to your table while the kitchen cooks. They take your order, serve other tables, and come back when your food is ready. A few waiters serve a whole restaurant.\n\nThey help when many tasks spend their time waiting: HTTP calls, database queries, a request per thread. They don't make CPU-bound work faster. Creating one per task is the intended use (`Executors.newVirtualThreadPerTaskExecutor()`); pooling them makes no sense.",
            },
            {
              question: "What are the pitfalls of virtual threads?",
              answer: "Pinning: before JDK 24, a virtual thread blocking inside a `synchronized` block couldn't unmount, so it held its carrier. `ReentrantLock` avoided that; JDK 24 fixed `synchronized` too.\n\nDownstream limits don't move. A million virtual threads still share a database pool of maybe 10 connections, so the bottleneck just moves there; a `Semaphore` can cap concurrency on purpose. And heavy per-thread caching in `ThreadLocal` becomes a million copies.",
            },
          ],
        },
      ],
    },
    {
      title: "Thread Safety in Practice",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How do I make a class thread-safe?",
              answer: "In order of preference: don't share it (keep it stateless; most Spring services are), make it immutable, confine the state to one thread, use thread-safe building blocks (`ConcurrentHashMap`, atomics, `BlockingQueue`), and only then lock, with the smallest possible critical section.\n\nThread safety is about invariants, not individual fields. Two atomic fields that must change together, like `balance` and `lastUpdated`, still need one lock around both.",
            },
            {
              question: "Is a Spring singleton bean thread-safe?",
              answer: "Not automatically. One instance serves every request thread at once. It's safe only if it has no mutable state, which is why services should hold just final, injected dependencies and keep per-request data in local variables. A field like `private Order currentOrder;` in a service is a bug waiting to happen under load.",
            },
          ],
        },
      ],
    },
    {
      title: "Distributed Concurrency",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "Why does `synchronized` stop working when the app runs on several servers?",
              answer: "`synchronized` and every `java.util.concurrent` lock live in one JVM's memory. With two instances behind a load balancer, each has its own lock. It's like two branches of a bank each with their own token machine: both can hand out token number 42.\n\nSo \"only one driver can accept this ride\" or \"don't sell the last ticket twice\" must be enforced somewhere shared by all instances, usually the database, sometimes a distributed lock in Redis or ZooKeeper. I keep in-JVM locks for in-JVM state only.",
            },
            {
              question: "How do I make \"check then update\" safe across servers with the database?",
              answer: "Push the check into the update itself, so the database does both atomically: `UPDATE rides SET driver_id = ?, status = 'ASSIGNED' WHERE id = ? AND status = 'SEARCHING'`. Then look at the affected row count. 1 means I won; 0 means someone else got there first, and I tell this driver the ride is gone.\n\nIt's the database version of CAS: set it only if it's still what I expected. No lock is held across a network round trip, and it works on any number of servers. In my RideX project, this conditional update is exactly how the platform decides which driver wins a ride when several accept at once.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: "UPDATE rides\n   SET driver_id = :driverId, status = 'ASSIGNED'\n WHERE id = :rideId\n   AND status = 'SEARCHING';\n-- 1 row updated  -> this driver won\n-- 0 rows updated -> someone else won",
          title: "Conditional update: the database does the check and the act together",
        },
        {
          type: "qa",
          items: [
            {
              question: "Optimistic vs pessimistic locking?",
              answer: "**Optimistic locking** assumes conflicts are rare. Nothing is locked; each row has a `version` column, and the update says `... WHERE id = ? AND version = 7`, then increments it. If someone else saved first, 0 rows change and I get a conflict, which I retry or show as \"someone else changed this\". In JPA that's `@Version`, and the failure is an `OptimisticLockException`. Like editing a shared document that warns \"this was changed since you opened it\".\n\n**Pessimistic locking** assumes conflicts are likely. I lock the row when reading it (`SELECT ... FOR UPDATE`), so others wait until my transaction ends. Like taking the only key to a meeting room.\n\nOptimistic for mostly-read data with rare conflicts, like an admin editing settings. Pessimistic for hot rows with frequent, short conflicts, like a seat or wallet balance, keeping the transaction short.",
            },
            {
              question: "What is `SELECT ... FOR UPDATE SKIP LOCKED`, and why is it great for job queues?",
              answer: "`FOR UPDATE` locks the selected rows until the transaction ends. `SKIP LOCKED` (Postgres, MySQL 8, Oracle) tells the query to skip rows another transaction has already locked, instead of waiting for them.\n\nThat turns a table into a safe work queue for many workers. Several servers run the same poller, `SELECT * FROM jobs WHERE status = 'PENDING' ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED`, and each one gets a different batch with no double processing and no waiting. Like several cashiers each taking the next customer who isn't already being served. RideX's outbox and payment workers claim their rows this way, which is why the workers are safe on multiple nodes.",
            },
            {
              question: "What is an idempotency key?",
              answer: "A unique key the client sends with a request (often an `Idempotency-Key` header), so that retrying the same request doesn't do the work twice. If a \"pay ₹500\" request times out and the app retries, the server sees the same key, finds the stored result of the first attempt, and returns it instead of charging again.\n\nThe safe way to build it is a unique constraint in the database on the key. The first request inserts the key and does the work; a concurrent duplicate fails on the constraint, and later retries read the saved response. Payment providers like Stripe use exactly this pattern.",
            },
            {
              question: "When would I use a distributed lock (Redis, ZooKeeper) instead?",
              answer: "When the thing to protect isn't a single database row: \"only one server should run the nightly report\", or a call to an external API that must not run twice. Redis `SET key value NX PX 30000` is the usual simple lock, with an expiry so a crashed holder doesn't block forever, and a unique value so I only release my own lock.\n\nThe catch: a lock with an expiry can run out while the holder is paused (a long GC pause), so two holders can briefly overlap. For correctness-critical writes I still add a check in the database itself (a fencing token or a conditional update).",
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
          text: "THREAD        NEW -> RUNNABLE -> BLOCKED / WAITING / TIMED_WAITING -> TERMINATED\n              start() = new thread; run() = same thread\n              sleep keeps locks; wait releases (inside synchronized, in a while loop)\nSYNCHRONIZED  monitor in object header; monitorenter / monitorexit\n              thin lock (CAS) -> inflated monitor; reentrant; gives visibility\nVOLATILE      visibility + ordering, NOT atomicity (count++ still races)\nHAPPENS-      unlock -> next lock | volatile write -> later read\nBEFORE        start() -> thread body | thread body -> join() returns\nCAS           set only if unchanged; AtomicInteger retries; LongAdder for hot counters\nAQS           volatile int state + FIFO wait queue: ReentrantLock, Semaphore, Latch\nDEADLOCK      mutual exclusion + hold&wait + no preemption + circular wait\n              fix: global lock order, tryLock timeout; detect: jstack\nPOOL          core -> queue -> max -> reject   (grows past core only when queue full)\n              bounded ArrayBlockingQueue + CallerRunsPolicy; submit() hides errors\nSYNCHRONIZERS Latch (wait for N events, once) | Barrier (wait for each other, reuse)\n              Semaphore (N permits)\nTHREADLOCAL   per-thread map; ALWAYS remove() in finally in pools\nVIRTUAL       cheap, unmount on blocking I/O; not for CPU work; DB pool still limits\n\nDISTRIBUTED   JVM locks don't cross servers -> database decides\n              UPDATE ... WHERE status = 'SEARCHING'  (check 1 vs 0 rows)\n              optimistic: version column | pessimistic: SELECT ... FOR UPDATE\n              job queue: FOR UPDATE SKIP LOCKED | retries: idempotency key + unique index",
          caption: "Concurrency in one screen",
        },
      ],
    },
  ],
};
