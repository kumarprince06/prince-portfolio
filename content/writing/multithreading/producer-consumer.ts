import type { Lesson } from "../types";

export const producerConsumer: Lesson = {
  slug: "producer-consumer",
  date: "2026-11-14",
  title: "Producer-Consumer, Backpressure and Clean Shutdown",
  description:
    "Building pipelines between threads on JDK 21 and measuring what happens when the consumer is slower than the producer: the producer-consumer pattern three ways (wait/notify by hand, a BlockingQueue, and an executor whose CallerRunsPolicy ran up to 74% of the work in the producers), an unbounded queue growing by 14,000 events a second while a bounded one held the producer to the consumer's pace, why offer with a fixed 2 ms timeout shed almost nothing while a deadline-based offer kept every answer under 11 ms, poison pills (one per consumer, and the two consumers left parked forever with one), interrupt-based shutdown that drops or drains, the element in hand that interruption loses, shutdown hooks under SIGTERM and SIGKILL, per-key ordering by partitioning (hundreds of out-of-order events per run with one shared queue, zero with four partitioned ones), consumers killed silently by an exception inside submit(), throughput against consumer count for I/O and CPU work, and a trip-event pipeline in a ride-hailing backend that died with OutOfMemoryError in 7 seconds on a 64 MB heap and lost 24,970 events on deploy, rebuilt with a bounded queue, backpressure, batching and drain-on-shutdown to lose none.",
  tags: ["Multithreading", "Concurrency", "Backpressure", "Graceful Shutdown"],
  sections: [
    {
      title: "What Producer-Consumer Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, BlockingQueue Implementations, opened up the queues themselves: the method matrix, one lock or two, fairness, `drainTo`. This lesson builds the thing those queues exist for. **Producer-consumer** is the pattern where some threads create work (producers), other threads do it (consumers), and a queue sits between them so neither has to wait for the other step by step. A GPS ingest thread doesn't wait for the database insert; it hands the ping over and goes back to reading the network.",
        },
        {
          type: "paragraph",
          text: "The pattern is easy to write and hard to run. The difficult questions are all about the edges. What happens when the consumer is slower than the producer for an hour (**backpressure**)? What does a request thread do when the queue is full (**block, wait a bit, or shed**)? How do consumers stop on deploy without losing what's queued (**clean shutdown**)? How do a driver's events stay in order with four consumers (**partitioning by key**)? And what happens to the pipeline when one consumer throws an exception nobody sees?",
        },
        {
          type: "paragraph",
          text: "I built the pattern three ways, then measured each of those questions on JDK 21: queue size and heap with a slow consumer, latency with and without shedding, events lost by each shutdown style, out-of-order events with one queue against partitioned queues, and throughput against consumer count. The production section rebuilds a trip-event pipeline that ran out of memory when the database slowed down and lost every queued event on deploy, then fixes both.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Edsger Dijkstra described the bounded buffer in 1965, in \"Cooperating Sequential Processes\": two counting semaphores (free slots and filled slots) and a mutex. It became the standard example for every synchronization primitive since. Tony Hoare's 1974 monitor paper used it to show condition variables, which is the design Java's `synchronized`/`wait`/`notify` follows, and `ArrayBlockingQueue`'s `notEmpty`/`notFull` are Hoare's two conditions almost exactly.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`wait`, `notify`, `notifyAll` on every object; `Thread.stop` (later deprecated)", "Hand-written buffers; no safe way to stop a thread except cooperation"],
            ["Java 1.3 (2000)", "`Runtime.addShutdownHook`", "Code that runs on SIGTERM or `System.exit`: where draining happens"],
            ["Java 5 (2004)", "`BlockingQueue`, `ExecutorService` with `shutdown`/`shutdownNow`/`awaitTermination`, `ThreadPoolExecutor` rejection policies including `CallerRunsPolicy`, `Thread.UncaughtExceptionHandler`", "The building blocks of every pipeline in this lesson"],
            ["Java 9 (2017)", "`java.util.concurrent.Flow` (JEP 266): the Reactive Streams interfaces, with demand signalled by `request(n)`", "Backpressure as an explicit protocol rather than a full queue"],
            ["Java 19 (2022)", "`ExecutorService.close()`: an executor works in try-with-resources", "Shutdown plus wait in one call"],
            ["Java 21 (2023)", "Virtual threads (JEP 444)", "Blocked producers are cheap, so the queue bound, not the thread count, limits work in flight"],
          ],
        },
        {
          type: "paragraph",
          text: "Backpressure as a word came from fluid dynamics through networking (TCP flow control is backpressure: a receiver with a full buffer advertises a zero window and the sender stops). The Reactive Streams specification (2015) made it explicit for libraries. Inside one JVM, a bounded `BlockingQueue` is the simplest form of it: a full queue makes the producer wait.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the parcel counter at a courier office in New Town on the last day before Diwali.",
        },
        {
          type: "list",
          items: [
            "**Customers are producers; the packers in the back are consumers; the shelf between them is the queue.** Customers don't wait for their parcel to be packed, only for it to be accepted.",
            "**An unbounded queue is a counter clerk who accepts every parcel** and piles the overflow in the corridor. The queue at the counter stays short and everyone is happy, until the corridor is full, the fire exit is blocked, and the office has to close (`OutOfMemoryError`).",
            "**A bounded queue with backpressure is a clerk who stops accepting** when the shelf is full. Customers wait at the counter (`put`), or after five minutes are told to come back tomorrow (`offer` with a timeout, then shed). The problem is visible at the door instead of hidden in the corridor.",
            "**Closing time is shutdown.** The clean way: lock the front door (stop intake), let the packers finish the shelf (drain), then switch off the lights. The careless way: switch off the lights at 8 pm, and every parcel on the shelf is lost (`shutdownNow`).",
            "**A poison pill is a \"closing\" card** placed on the shelf behind the last parcel. Each packer who picks up a card goes home. Three packers need three cards; with one card, two packers stand waiting forever.",
            "**Partitioning by key is giving each packer a range of pin codes.** All of one customer's parcels go to the same packer, so they leave in the order they were handed in.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a waiting customer can see the full shelf and decide to go elsewhere. A blocked producer thread sees nothing; it just parks, and so does whoever is waiting for it, all the way back to the driver's phone. Backpressure in software only helps if the waiting is visible and bounded somewhere, as a timeout, a metric or an HTTP 503.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/producer-consumer-pipeline.svg",
          alt: "Top: a pipeline from driver apps sending 8,000 pings per second, to gps-ingest threads that call offer with the 5 ms budget left, route by hash of driverId modulo N and answer 503 when the offer fails, to two ArrayBlockingQueue partitions of capacity 5,000 (drivers 0, 2, 4 in partition 0 and drivers 1, 3, 5 in partition 1), to one db-writer per partition doing take plus drainTo(499), to the database with one INSERT per batch. A dashed arrow from the ingest threads back to the driver apps says that when the queue is full past the budget the ping is shed and the app retries later. A note says one writer per partition keeps a driver's events in order. Bottom left, Before: new LinkedBlockingQueue with one INSERT per event and a database that slows down at 1 second; queued events 6,749 at 1 s with 13 MB heap, 29,589 at 4 s with 36 MB, 52,357 at 7 s with 59 MB, then Terminating due to OutOfMemoryError; a deploy at 3.5 seconds called shutdownNow and lost 24,970 queued events. Bottom right, After, the SIGTERM shutdown hook in order: stop intake and join the ingest threads, one pill per consumer with offer(pill, 20 s), writers drain the queue with the pill last, awaitTermination inside the grace period; 4,637 events were queued at SIGTERM, drained in 1.0 s, none lost, and the heap stayed between 12 and 43 MB for 30 seconds with no full GC. Footer: the bound equals memory and worst-case wait, 5,000 events of about 1.1 KB is about 5.5 MB and takes 1 second to drain at 5,000 per second.",
          caption: "The fixed pipeline from the production section, drawn with two partitions; the measured rebuild uses one queue and one writer.",
        },
        {
          type: "heading",
          text: "What a producer can do when the queue is full",
        },
        {
          type: "table",
          headers: ["Strategy", "Call", "Effect", "Fits"],
          rows: [
            ["Block", "`put(e)`", "Producer waits as long as it takes; the pipeline runs at the consumer's speed", "Dedicated producer threads reading from a source that can wait (a file, a Kafka partition)"],
            ["Wait a bounded time, then shed", "`offer(e, timeout, unit)`", "Waits up to the timeout, then the caller decides: 503, drop, write to disk", "Request threads with a latency budget"],
            ["Shed immediately", "`offer(e)`", "Never waits", "Telemetry and samples where the newest data matters most"],
            ["Run it yourself", "`ThreadPoolExecutor.CallerRunsPolicy`", "The producer does the work, so it can't produce more meanwhile", "Executors fed by internal producers"],
            ["Grow", "unbounded queue", "Never waits; memory grows instead", "Only when the total amount of work is known to be small"],
          ],
        },
        {
          type: "heading",
          text: "How consumers can be stopped",
        },
        {
          type: "table",
          headers: ["Technique", "Queued work", "Element in hand", "Pitfall"],
          rows: [
            ["Poison pill, one per consumer", "Processed (pill is behind it)", "Finished", "Too few pills leave consumers parked forever; `drainTo` can swallow the pill"],
            ["Interrupt, then exit", "Dropped (stays in the queue)", "Lost if interrupted mid-write", "Swallowed `InterruptedException` means the thread never stops"],
            ["Interrupt, then drain with `poll()`", "Processed", "Must be kept and finished explicitly", "Takes time; must fit the grace period"],
            ["`ExecutorService.shutdown()` + `awaitTermination`", "Processed (queued tasks run)", "Finished", "Waits forever unless given a timeout"],
            ["`ExecutorService.shutdownNow()`", "Returned as a `List<Runnable>`, not run", "Interrupted", "Whatever the returned list holds is lost unless saved"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The same pipeline built three ways",
        },
        {
          type: "paragraph",
          text: "Three producers send 100,000 pings each to two consumers: first through the hand-written bounded buffer from the lesson synchronized, Monitors and Race Conditions, then through an `ArrayBlockingQueue`, then through a `ThreadPoolExecutor` whose work queue is the same `ArrayBlockingQueue` and whose rejection policy is `CallerRunsPolicy`:",
        },
        {
          type: "code",
          language: "java",
          title: "ThreeWays.java",
          code: `import java.util.ArrayDeque;
import java.util.Queue;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

public class ThreeWays {
    record Ping(String driver, int seq) { }
    static final Ping STOP = new Ping("STOP", -1);
    static final int PRODUCERS = 3, CONSUMERS = 2, PER_PRODUCER = 100_000;

    // 1. By hand: the bounded buffer from the synchronized lesson
    static final class HandBuffer {
        private final Queue<Ping> items = new ArrayDeque<>();
        private final int capacity;
        HandBuffer(int capacity) { this.capacity = capacity; }

        synchronized void put(Ping p) throws InterruptedException {
            while (items.size() == capacity) wait();              // while, never if
            items.add(p);
            notifyAll();                                          // producers and consumers share one wait set
        }

        synchronized Ping take() throws InterruptedException {
            while (items.isEmpty()) wait();
            Ping p = items.remove();
            notifyAll();
            return p;
        }
    }

    interface Put { void put(Ping p) throws InterruptedException; }
    interface Take { Ping take() throws InterruptedException; }

    static void runThreads(String label, Put put, Take take) throws Exception {
        AtomicLong consumed = new AtomicLong();
        Thread[] consumers = new Thread[CONSUMERS];
        for (int c = 0; c < CONSUMERS; c++) {
            consumers[c] = Thread.ofPlatform().name("db-writer-" + c).start(() -> {
                try {
                    for (Ping p = take.take(); p != STOP; p = take.take()) consumed.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        long t0 = System.nanoTime();
        Thread[] producers = new Thread[PRODUCERS];
        for (int p = 0; p < PRODUCERS; p++) {
            String driver = "driver-" + p;
            producers[p] = Thread.ofPlatform().name("gps-ingest-" + p).start(() -> {
                try {
                    for (int i = 0; i < PER_PRODUCER; i++) put.put(new Ping(driver, i));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        for (Thread t : producers) t.join();
        for (int c = 0; c < CONSUMERS; c++) put.put(STOP);         // one pill per consumer
        for (Thread t : consumers) t.join();
        System.out.printf("%-28s consumed %,d in %d ms%n", label, consumed.get(), (System.nanoTime() - t0) / 1_000_000);
    }

    public static void main(String[] args) throws Exception {
        for (int round = 0; round < 3; round++) {
            HandBuffer hand = new HandBuffer(1024);
            runThreads("wait/notify by hand", hand::put, hand::take);

            BlockingQueue<Ping> q = new ArrayBlockingQueue<>(1024);
            runThreads("ArrayBlockingQueue", q::put, q::take);

            // 3. An executor: the pool owns the queue and the consumer threads
            AtomicLong consumed = new AtomicLong(), ranInProducer = new AtomicLong();
            ExecutorService pool = new ThreadPoolExecutor(CONSUMERS, CONSUMERS, 0, TimeUnit.SECONDS,
                    new ArrayBlockingQueue<>(1024), new ThreadPoolExecutor.CallerRunsPolicy());
            long t0 = System.nanoTime();
            Thread[] producers = new Thread[PRODUCERS];
            for (int p = 0; p < PRODUCERS; p++) {
                String driver = "driver-" + p;
                producers[p] = Thread.ofPlatform().name("gps-ingest-" + p).start(() -> {
                    for (int i = 0; i < PER_PRODUCER; i++) {
                        Ping ping = new Ping(driver, i);
                        pool.execute(() -> {
                            consumed.incrementAndGet();
                            if (Thread.currentThread().getName().startsWith("gps")) ranInProducer.incrementAndGet();
                        });
                    }
                });
            }
            for (Thread t : producers) t.join();
            pool.shutdown();                                        // no pills: shutdown() lets queued tasks finish
            pool.awaitTermination(1, TimeUnit.MINUTES);
            System.out.printf("%-28s consumed %,d in %d ms (%,d ran in a producer thread)%n", "ThreadPoolExecutor",
                    consumed.get(), (System.nanoTime() - t0) / 1_000_000, ranInProducer.get());
            System.out.println();
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m ThreeWays",
        },
        {
          type: "output",
          text: `wait/notify by hand          consumed 300,000 in 90 ms
ArrayBlockingQueue           consumed 300,000 in 58 ms
ThreadPoolExecutor           consumed 300,000 in 74 ms (191,715 ran in a producer thread)

wait/notify by hand          consumed 300,000 in 68 ms
ArrayBlockingQueue           consumed 300,000 in 29 ms
ThreadPoolExecutor           consumed 300,000 in 52 ms (222,337 ran in a producer thread)

wait/notify by hand          consumed 300,000 in 86 ms
ArrayBlockingQueue           consumed 300,000 in 33 ms
ThreadPoolExecutor           consumed 300,000 in 27 ms (173,790 ran in a producer thread)`,
        },
        {
          type: "list",
          items: [
            "**By hand**, every `put` and `take` enters the one monitor, and every one calls `notifyAll`, which wakes **all** waiting threads (producers and consumers share one wait set), most of which re-check their `while` condition and go back to sleep. It was the slowest in every round (68 to 94 ms over six rounds). It's still worth writing once: `while` (never `if`) around `wait`, and `notifyAll` (never `notify`) when two kinds of thread share a wait set.",
            "**`ArrayBlockingQueue`** is the same algorithm with two conditions, so `put` signals exactly one consumer and `take` exactly one producer. 29 to 65 ms. The pipeline code shrank to `q.put(p)` and `q.take()`, plus the pills.",
            "**The executor** owns both the queue and the consumer threads. There are no pills: `shutdown()` stops accepting tasks and lets the queued ones run, then `awaitTermination` waits. The surprise was the last column: between **137,570 and 222,337 of the 300,000 tasks (46% to 74%) ran in a producer thread**. Each task here is tiny, the producers were faster than the two workers, the work queue filled up, and `CallerRunsPolicy` ran the rejected task in the thread that called `execute`. That's backpressure by another route: a producer busy running a task isn't producing.",
            "With `CallerRunsPolicy`, the producer also loses ordering guarantees (its task ran before tasks queued earlier) and, if the producer is a request thread, the request now pays for the work. It's a reasonable policy for internal producers and a dangerous one for an event loop or an HTTP acceptor thread.",
          ],
        },
        {
          type: "heading",
          text: "What an unbounded queue looks like from inside the JVM",
        },
        {
          type: "paragraph",
          text: "The production section's \"before\" pipeline puts about 8,000 pings a second into a `new LinkedBlockingQueue<>()` while the database writes about 430 a second. Four and a half seconds in, I took a class histogram of the live process:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx64m -XX:+ExitOnOutOfMemoryError TripPipeline before &
jcmd <pid> GC.class_histogram | head -12`,
        },
        {
          type: "output",
          text: ` num     #instances         #bytes  class name (module)
-------------------------------------------------------
   1:         78758       37293080  [B (java.base@21.0.13.0.3)
   2:         34388        1925728  TripPipeline$TripEvent
   3:         44279        1062696  java.lang.String (java.base@21.0.13.0.3)
   4:         34388         825312  java.util.concurrent.LinkedBlockingQueue$Node (java.base@21.0.13.0.3)
   5:          1726         212304  java.lang.Class (java.base@21.0.13.0.3)
   6:          1061         184376  [Ljdk.internal.vm.FillerElement; (java.base@21.0.13.0.3)
   7:          1633         163584  [Ljava.lang.Object; (java.base@21.0.13.0.3)
   8:          2464          78848  java.util.HashMap$Node (java.base@21.0.13.0.3)
   9:           217          56856  [C (java.base@21.0.13.0.3)`,
        },
        {
          type: "list",
          items: [
            "**34,388 `LinkedBlockingQueue$Node`s and exactly 34,388 `TripEvent`s.** Every queued event is pinned by its node, at 24 bytes per node (825,312 / 34,388). The heap dump's dominator tree would show one `LinkedBlockingQueue` retaining almost the whole heap: the classic signature of this bug.",
            "**The `byte[]`s are the real weight**: the 1 KB raw payload of each ping plus the bytes of the `tripId` strings, 37 MB. One queued event costs about 1.1 KB in total, which is the number that turns a queue capacity into a memory budget.",
            "**`#instances` of `String` is higher than the events** because `String` objects also belong to classes, the JDK and the program; the extra 10,000 are not queued data.",
          ],
        },
        {
          type: "paragraph",
          text: "With `-Xlog:gc`, the end looks like this (the full run is in the production section):",
        },
        {
          type: "output",
          text: `[6.482s][info][gc] GC(10) Pause Young (Concurrent Start) (G1 Evacuation Pause) 59M->60M(64M) 1.085ms
[6.700s][info][gc] GC(12) Pause Young (Prepare Mixed) (G1 Evacuation Pause) (Evacuation Failure) 62M->63M(64M) 1.914ms
[6.807s][info][gc] GC(13) Pause Young (Mixed) (G1 Evacuation Pause) (Evacuation Failure) 64M->64M(64M) 1.601ms
[6.833s][info][gc] GC(14) Pause Full (G1 Compaction Pause) 64M->57M(64M) 25.768ms
[7.252s][info][gc] GC(18) Pause Full (G1 Compaction Pause) 61M->61M(64M) 25.641ms
[7.362s][info][gc] GC(20) Pause Full (G1 Compaction Pause) 62M->62M(64M) 30.913ms
[7.463s][info][gc] GC(23) Pause Full (G1 Compaction Pause) 63M->63M(64M) 26.860ms
[7.505s][info][gc] GC(24) Pause Full (G1 Compaction Pause) 63M->63M(64M) 41.896ms
Terminating due to java.lang.OutOfMemoryError: Java heap space`,
        },
        {
          type: "paragraph",
          text: "This is the pattern the JVM Memory Areas and Garbage Collection lesson described for a leak: young collections that free nothing (`63M->63M`), evacuation failures because there is nowhere to copy survivors, then back-to-back full GCs that each recover less, until allocation fails. The queue isn't a leak in the usual sense (every element would eventually be written), but to the collector it looks the same: a growing set of reachable objects.",
        },
        {
          type: "heading",
          text: "Consumers left behind by too few pills",
        },
        {
          type: "code",
          language: "java",
          title: "TooFewPills.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

public class TooFewPills {
    static final String PILL = new String("PILL");

    public static void main(String[] args) throws Exception {
        BlockingQueue<String> q = new ArrayBlockingQueue<>(100);
        for (int i = 0; i < 3; i++) {
            Thread.ofPlatform().name("writer-" + i).start(() -> {
                try {
                    while (q.take() != PILL) { }                     // write the event
                    System.out.println(Thread.currentThread().getName() + " got the pill and exited");
                } catch (InterruptedException e) { }
            });
        }
        for (int i = 0; i < 50; i++) q.put("event-" + i);
        q.put(PILL);                                                // one pill, three consumers
        System.out.println("main finished, pid " + ProcessHandle.current().pid());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java TooFewPills &
jcmd <pid> Thread.print`,
        },
        {
          type: "output",
          text: `writer-1 got the pill and exited
main finished, pid 1484891

"writer-0" #20 [1484910] prio=5 os_prio=0 cpu=1.35ms elapsed=2.30s tid=0x000075f78c181a20 nid=1484910 waiting on condition  [0x000075f71a72d000]
   java.lang.Thread.State: WAITING (parking)
	- parking to wait for  <0x000000008df14d80> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
"writer-2" #22 [1484912] prio=5 os_prio=0 cpu=0.24ms elapsed=2.30s tid=0x000075f78c183c60 nid=1484912 waiting on condition  [0x000075f71a52d000]
   java.lang.Thread.State: WAITING (parking)
	- parking to wait for  <0x000000008df14d80> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
"DestroyJavaVM" #23 [1484893] prio=5 os_prio=0 cpu=50.86ms elapsed=2.15s tid=0x000075f78c019920 nid=1484893 waiting on condition  [0x0000000000000000]`,
        },
        {
          type: "list",
          items: [
            "`main` returned, but the process didn't exit. **`DestroyJavaVM`** is the thread that took over from `main`: it waits until every non-daemon thread has finished, and two writers never will. They're parked on the same `notEmpty` condition, waiting for an element that will never come.",
            "This is how \"the service hangs on shutdown until Kubernetes kills it\" usually looks in a dump: a few named consumer threads in `take()` and `DestroyJavaVM` waiting. After the grace period (30 seconds by default), the orchestrator sends SIGKILL, and nothing that was queued anywhere gets a chance to finish.",
            "Making consumers daemon threads would let the JVM exit, but it would exit **without** finishing their work, which is the opposite problem. The fix is one pill per consumer, or interruption, plus a bounded wait.",
          ],
        },
      ],
    },
    {
      title: "Backpressure: Bounded vs Unbounded Queues",
      blocks: [
        {
          type: "paragraph",
          text: "One producer tries to send 20 pings every millisecond (20,000 a second, about 300 bytes each); one consumer takes 100 microseconds per ping (about 6,000 a second). Every half second I print what was produced and written, the queue size, the heap after a `System.gc()` (so it shows what is still reachable), and how long the producer has spent blocked in `put`:",
        },
        {
          type: "code",
          language: "java",
          title: "Backpressure.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;

public class Backpressure {
    record Ping(long driverId, long atMillis, byte[] payload) { }      // ~300 bytes with its payload

    public static void main(String[] args) throws Exception {
        boolean bounded = args[0].equals("bounded");
        BlockingQueue<Ping> q = bounded ? new ArrayBlockingQueue<>(2_000) : new LinkedBlockingQueue<>();
        AtomicLong produced = new AtomicLong(), written = new AtomicLong(), blockedNanos = new AtomicLong();

        Thread producer = Thread.ofPlatform().daemon().name("gps-ingest").start(() -> {
            long next = System.nanoTime();
            try {
                while (true) {                                          // tries to send 20 pings every millisecond
                    for (int i = 0; i < 20; i++) {
                        long t = System.nanoTime();
                        q.put(new Ping(produced.get() % 5_000, System.currentTimeMillis(), new byte[256]));
                        blockedNanos.addAndGet(System.nanoTime() - t);
                        produced.incrementAndGet();
                    }
                    next += 1_000_000;
                    LockSupport.parkNanos(next - System.nanoTime());
                }
            } catch (InterruptedException e) { }
        });
        Thread consumer = Thread.ofPlatform().daemon().name("db-writer").start(() -> {
            try {
                while (true) {
                    q.take();
                    LockSupport.parkNanos(100_000);                      // a slow INSERT
                    written.incrementAndGet();
                }
            } catch (InterruptedException e) { }
        });

        var memory = ManagementFactory.getMemoryMXBean();
        System.out.println(bounded ? "ArrayBlockingQueue(2,000)" : "LinkedBlockingQueue()  (unbounded)");
        System.out.println("  time  produced   written  in queue  heap used  producer blocked");
        for (int s = 1; s <= 8; s++) {
            Thread.sleep(500);
            System.gc();                                                // so heap used is what's still reachable
            System.out.printf("%5.1fs %,9d %,9d %,9d %7d MB %13d ms%n", s / 2.0, produced.get(), written.get(), q.size(),
                    memory.getHeapMemoryUsage().getUsed() >> 20, blockedNanos.get() / 1_000_000);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx256m Backpressure unbounded
java -Xmx256m Backpressure bounded`,
        },
        {
          type: "output",
          text: `LinkedBlockingQueue()  (unbounded)
  time  produced   written  in queue  heap used  producer blocked
  0.5s    10,856     3,247     7,652       3 MB            14 ms
  1.0s    21,600     6,583    15,023       6 MB            23 ms
  1.5s    31,921     9,698    22,230       8 MB            35 ms
  2.0s    42,281    12,813    29,473      10 MB            50 ms
  2.5s    52,580    15,985    36,594      12 MB            59 ms
  3.0s    62,969    19,158    43,837      15 MB            66 ms
  3.5s    73,322    22,303    51,041      17 MB            71 ms
  4.0s    83,740    25,388    58,370      19 MB            77 ms
ArrayBlockingQueue(2,000)
  time  produced   written  in queue  heap used  producer blocked
  0.5s     4,890     2,891     1,998       1 MB           405 ms
  1.0s     7,978     5,979     2,000       2 MB           941 ms
  1.5s    10,969     8,968     2,000       2 MB          1449 ms
  2.0s    13,910    11,909     2,000       2 MB          1957 ms
  2.5s    16,900    14,900     2,000       2 MB          2464 ms
  3.0s    19,841    17,841     2,000       2 MB          2971 ms
  3.5s    22,831    20,830     2,000       2 MB          3470 ms
  4.0s    25,766    23,766     2,000       2 MB          3987 ms`,
        },
        {
          type: "list",
          items: [
            "**Unbounded: the queue grew by about 14,500 events a second**, the difference between 21,000 produced and 6,300 written, and the heap after GC grew with it, about 4.6 MB a second (about 340 bytes per queued event, matching the payload plus record plus node). Nothing in the producer noticed: it spent 77 ms of 4 seconds in `put`, all of it lock contention, none of it waiting for space. At this rate a 256 MB heap lasts under two minutes, and every ping in the queue is a ping that was \"accepted\" but not yet written.",
            "**Bounded: the queue filled to 2,000 in under half a second and stayed there.** From then on the producer spent almost all its time in `put` (3,987 ms of 4,000 ms) and produced exactly as fast as the consumer wrote: about 6,000 a second. Memory stayed flat at 2 MB.",
            "**Written was about the same in both runs** (25,388 against 23,766, and 21,868 to 24,764 in two more runs of each). The unbounded queue didn't make the system faster; it made it **look** faster at the front door while the actual work proceeded at the consumer's pace. The bounded queue moved the waiting to where something can be done about it: the producer.",
            "What the blocked producer does next decides whether backpressure helps. If the producer reads from Kafka, a blocked producer simply stops polling and the broker holds the data: perfect. If the producer is an HTTP handler, a blocked producer is a blocked request, and the next sections are about bounding that.",
          ],
        },
      ],
    },
    {
      title: "Offer with a Timeout, and Shedding",
      blocks: [
        {
          type: "paragraph",
          text: "A request thread can't wait forever, so the usual advice is `offer(e, timeout, unit)` and shed on `false`. I measured three versions with pings arriving every 50 microseconds (20,000 a second for 2 seconds) into a 500-slot queue whose consumer manages about 6,000 a second. \"Answered in\" is the time from when a ping arrived to when its request got an answer (accepted or shed):",
        },
        {
          type: "code",
          language: "java",
          title: "LoadShedding.java",
          code: `import java.util.Arrays;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;

public class LoadShedding {
    record Ping(long driverId, long arrivedNanos) { }

    static void run(String mode) throws Exception {
        BlockingQueue<Ping> q = new ArrayBlockingQueue<>(500);
        Thread writer = Thread.ofPlatform().daemon().name("db-writer").start(() -> {
            try {
                while (true) { q.take(); LockSupport.parkNanos(100_000); }   // about 6,000 pings/s
            } catch (InterruptedException e) { }
        });

        int requests = 40_000;                                     // 2 seconds of pings arriving at 20,000/s
        long[] latency = new long[requests];
        int accepted = 0, shed = 0;
        long start = System.nanoTime();
        for (int i = 0; i < requests; i++) {
            long arrives = start + i * 50_000L;                    // one every 50 us
            long wait = arrives - System.nanoTime();
            if (wait > 0) LockSupport.parkNanos(wait);
            Ping p = new Ping(i % 5_000, arrives);
            boolean ok;
            if (mode.equals("put")) {
                q.put(p);
                ok = true;
            } else if (mode.equals("offer(2 ms)")) {
                ok = q.offer(p, 2, TimeUnit.MILLISECONDS);         // wait at most 2 ms for a slot
            } else {
                long budgetLeft = arrives + 5_000_000 - System.nanoTime();     // 5 ms budget from arrival
                ok = budgetLeft > 0 && q.offer(p, budgetLeft, TimeUnit.NANOSECONDS);
            }
            if (ok) accepted++; else shed++;                       // shed: answer 503 and let the app retry later
            latency[i] = System.nanoTime() - arrives;              // how late this request was answered
        }
        long elapsed = (System.nanoTime() - start) / 1_000_000;
        writer.interrupt();
        Arrays.sort(latency);
        System.out.printf("%-16s accepted %,6d  shed %,6d  answered in p50 %,6.1f ms  p99 %,7.1f ms  max %,7.1f ms  (%,d ms for 2 s of traffic)%n",
                mode, accepted, shed, latency[requests / 2] / 1e6, latency[requests * 99 / 100] / 1e6,
                latency[requests - 1] / 1e6, elapsed);
    }

    public static void main(String[] args) throws Exception {
        run("put");
        run("offer(2 ms)");
        run("offer(deadline)");
    }
}`,
        },
        {
          type: "output",
          text: `put              accepted 40,000  shed      0  answered in p50 2,291.3 ms  p99 4,494.9 ms  max 4,538.3 ms  (6,538 ms for 2 s of traffic)
offer(2 ms)      accepted 39,998  shed      2  answered in p50 2,080.0 ms  p99 4,303.8 ms  max 4,347.9 ms  (6,347 ms for 2 s of traffic)
offer(deadline)  accepted 12,739  shed 27,261  answered in p50    5.0 ms  p99     7.3 ms  max    10.7 ms  (2,005 ms for 2 s of traffic)`,
        },
        {
          type: "list",
          items: [
            "**`put`**: everything accepted, and the answers fell further and further behind. Two seconds of traffic took 6.5 seconds to accept; the median request waited 2.3 seconds and the slowest 4.5. The backlog didn't disappear, it moved out of the queue and into the requests (in a real server: into the HTTP accept queue and the clients' sockets).",
            "**`offer(e, 2 ms)` behaved almost exactly like `put`**, which surprised me. It shed 2 pings out of 40,000 (2 to 25 across three runs). With one producer, a slot frees up every 160 microseconds or so, so a 2 ms wait almost always succeeds. The timeout bounded each **individual** wait, but requests were queuing up **behind** that wait, and nothing bounded that. A per-call timeout is not a latency budget.",
            "**`offer` with the request's remaining deadline** (5 ms from arrival, minus however long the request has already waited) is what worked: 12,739 accepted, which is about what the consumer can write in 2 seconds, 27,261 shed immediately with an answer the client can act on, and p99 latency 5.2 to 7.3 ms across three runs. The traffic finished in 2.0 seconds, exactly as long as it arrived.",
            "Shedding sounds like losing data, but for GPS pings the driver app keeps unsent pings and retries, and the newest position matters more than an old one. For a payment it would be different: there the right answer to a full queue is a 503 the client retries with an idempotency key (System Design track: Idempotency and Webhooks), not silently dropping it.",
          ],
        },
      ],
    },
    {
      title: "Clean Shutdown: Poison Pills, Interrupts and Draining",
      blocks: [
        {
          type: "paragraph",
          text: "Three consumers, 300 events, each write taking about 1 ms, stopped six different ways. Every style was run three times:",
        },
        {
          type: "code",
          language: "java",
          title: "ShutdownStyles.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class ShutdownStyles {
    static final String PILL = new String("PILL");                   // compared by identity: no event can equal it

    static void slowWrite() {
        try { Thread.sleep(1); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    static List<Thread> pillConsumers(BlockingQueue<String> q, AtomicInteger written, int n) {
        List<Thread> ts = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            ts.add(Thread.ofPlatform().name("writer-" + i).start(() -> {
                try {
                    while (true) {
                        String e = q.take();
                        if (e == PILL) return;                           // this consumer is done
                        slowWrite();
                        written.incrementAndGet();
                    }
                } catch (InterruptedException ex) { }
            }));
        }
        return ts;
    }

    static void pills(int pills) throws Exception {
        BlockingQueue<String> q = new ArrayBlockingQueue<>(1000);
        AtomicInteger written = new AtomicInteger();
        List<Thread> consumers = pillConsumers(q, written, 3);
        for (int i = 0; i < 300; i++) q.put("event-" + i);               // the producer finishes first
        for (int i = 0; i < pills; i++) q.put(PILL);                     // then one pill per consumer
        int alive = 0;
        for (Thread t : consumers) { t.join(1_000); if (t.isAlive()) alive++; }
        System.out.printf("poison pill x%d          written %3d of 300, consumers still running %d%n", pills, written.get(), alive);
        for (Thread t : consumers) t.interrupt();                        // clean up the stuck ones
    }

    static void interrupt(boolean drain) throws Exception {
        BlockingQueue<String> q = new ArrayBlockingQueue<>(1000);
        AtomicInteger written = new AtomicInteger();
        List<Thread> consumers = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            consumers.add(Thread.ofPlatform().start(() -> {
                String inHand = null;
                try {
                    while (!Thread.currentThread().isInterrupted()) {
                        inHand = q.take();
                        Thread.sleep(1);                                  // the write; also an interruption point
                        written.incrementAndGet();
                        inHand = null;
                    }
                } catch (InterruptedException ex) {
                    // interrupted: fall through
                }
                if (drain) {                                              // finish the one in hand, then the queue
                    if (inHand != null) written.incrementAndGet();
                    for (String e = q.poll(); e != null; e = q.poll()) written.incrementAndGet();
                }
            }));
        }
        for (int i = 0; i < 300; i++) q.put("event-" + i);
        for (Thread t : consumers) t.interrupt();                        // stop now
        for (Thread t : consumers) t.join();
        System.out.printf("interrupt, %-13s written %3d of 300, left in queue %d%n", drain ? "then drain" : "and drop", written.get(), q.size());
    }

    static void executor(boolean now) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(3);
        AtomicInteger written = new AtomicInteger();
        for (int i = 0; i < 300; i++) pool.execute(() -> { slowWrite(); written.incrementAndGet(); });
        int neverRan = 0;
        if (now) neverRan = pool.shutdownNow().size();                   // interrupts workers, returns the queued tasks
        else pool.shutdown();                                             // stops intake, runs what is queued
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.printf("executor %-15s written %3d of 300, returned unrun %d%n", now ? "shutdownNow()" : "shutdown()", written.get(), neverRan);
    }

    public static void main(String[] args) throws Exception {
        pills(3);
        pills(1);
        interrupt(false);
        interrupt(true);
        executor(false);
        executor(true);
    }
}`,
        },
        {
          type: "output",
          text: `poison pill x3          written 300 of 300, consumers still running 0
poison pill x1          written 300 of 300, consumers still running 2
interrupt, and drop      written   0 of 300, left in queue 297
interrupt, then drain    written 300 of 300, left in queue 0
executor shutdown()      written 300 of 300, returned unrun 0
executor shutdownNow()   written   6 of 300, returned unrun 294`,
        },
        {
          type: "list",
          items: [
            "**Pills, one per consumer**: all 300 written and all three consumers gone. The pill is queued **after** the last event, so FIFO order guarantees everything before it is processed. It's compared by identity (`e == PILL`, with `new String(\"PILL\")`), so no real event can ever be mistaken for it.",
            "**One pill for three consumers**: still 300 written, but two consumers parked in `take()` forever, the thread dump shown earlier. A pill stops exactly one consumer.",
            "**Interrupt, and drop**: 0 to 6 written (across three runs), 291 to 297 left in the queue. And 300 minus 297 is 3: **three events were neither written nor in the queue**. Each consumer had taken one and was interrupted inside the write (`Thread.sleep` is an interruption point, like most I/O waits), so the event in its hand vanished.",
            "**Interrupt, then drain**: 300 of 300, because the consumer kept a reference to the event in hand (`inHand`), finished it after the interrupt, then emptied the queue with `poll()` (which doesn't block and doesn't throw). My first version of this drain didn't track `inHand` and wrote 297: the same three lost events.",
            "**`shutdown()`**: 300 of 300. The executor stops accepting new tasks, its workers keep taking from the work queue until it's empty, then exit.",
            "**`shutdownNow()`**: 3 to 6 written, 294 to 297 returned unrun. It interrupts every worker and **removes** all queued tasks, returning them as a `List<Runnable>`. If the caller ignores that list, those tasks are gone. The tasks that were running when interrupted finished their (interrupted) sleep and still counted, because `slowWrite` restores the flag and returns instead of throwing.",
          ],
        },
        {
          type: "heading",
          text: "Shutdown hooks: what runs on SIGTERM",
        },
        {
          type: "paragraph",
          text: "A deploy on Kubernetes (or `systemctl stop`, or `docker stop`) sends SIGTERM, waits for the grace period, then sends SIGKILL. The JVM turns SIGTERM into an orderly exit that runs registered shutdown hooks. A slow writer (500 events a second) is fed by a faster producer (about 1,000 a second), so there is always a backlog when the signal arrives:",
        },
        {
          type: "code",
          language: "java",
          title: "HookDemo.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

public class HookDemo {
    static final String PILL = new String("PILL");
    static volatile boolean accepting = true;

    public static void main(String[] args) throws Exception {
        boolean drainOnExit = args.length > 0 && args[0].equals("drain");
        BlockingQueue<String> q = new ArrayBlockingQueue<>(10_000);
        AtomicInteger received = new AtomicInteger(), written = new AtomicInteger();

        Thread writer = Thread.ofPlatform().name("db-writer").daemon(!drainOnExit).start(() -> {
            try {
                for (String e = q.take(); e != PILL; e = q.take()) {
                    Thread.sleep(2);                                     // slow INSERT: 500 events/s
                    written.incrementAndGet();
                }
            } catch (InterruptedException e) { }
        });
        Thread.ofPlatform().name("gps-ingest").daemon().start(() -> {
            for (int i = 0; accepting; i++) {
                if (q.offer("ping-" + i)) received.incrementAndGet();
                try { Thread.sleep(1); } catch (InterruptedException e) { return; }   // ~1,000 events/s
            }
        });

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            long t0 = System.nanoTime();
            System.out.printf("hook: SIGTERM received, received %d, written %d, queued %d%n", received.get(), written.get(), q.size());
            if (drainOnExit) {
                accepting = false;                                       // 1. stop intake
                try {
                    q.put(PILL);                                         // 2. pill goes behind the queued events
                    writer.join(10_000);                                 // 3. wait, with a limit
                } catch (InterruptedException e) { }
            }
            System.out.printf("hook: done in %d ms, written %d, lost %d%n",
                    (System.nanoTime() - t0) / 1_000_000, written.get(), received.get() - written.get());
        }, "shutdown-hook"));

        System.out.println("pid " + ProcessHandle.current().pid() + (drainOnExit ? " (drain on exit)" : " (no drain)"));
        Thread.sleep(60_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java HookDemo nodrain &   sleep 2; kill -TERM <pid>
java HookDemo drain &     sleep 2; kill -TERM <pid>
java HookDemo drain &     sleep 2; kill -KILL <pid>`,
        },
        {
          type: "output",
          text: `pid 1325832 (no drain)
hook: SIGTERM received, received 1820, written 942, queued 877
hook: done in 19 ms, written 952, lost 885

pid 1325950 (drain on exit)
hook: SIGTERM received, received 1831, written 944, queued 886
hook: done in 1861 ms, written 1846, lost 0

pid 1326058 (drain on exit)`,
        },
        {
          type: "list",
          items: [
            "**No drain**: the writer is a daemon thread, the hook does nothing about it, and the JVM exits 19 ms after the signal. 885 accepted events were lost. Daemon threads are not stopped gracefully; they simply cease to exist when the last non-daemon thread and the hooks finish.",
            "**Drain**: the hook stops intake, puts a pill behind the 886 queued events and joins the writer. 1.9 seconds later everything was written: 1,846 received, 1,846 written, 0 lost.",
            "**SIGKILL**: nothing. The process vanished without running the hook, which is why a hook must finish well inside the grace period: anything still running when SIGKILL arrives is lost the same way.",
            "**The drain must fit the grace period.** I left one drain-mode process running for 11 seconds before sending SIGTERM. By then 5,389 events were queued, which at 500 a second needs 10.8 seconds, longer than the hook's 10-second `join` limit. The output: `hook: done in 10027 ms, written 10673, lost 636`. The bound on the queue is also a bound on shutdown time: capacity divided by drain rate must be comfortably shorter than the grace period.",
            "Two more facts about hooks: they all start at once in unspecified order, so a hook can't rely on another hook (for example, on a logging framework's hook not having closed the log yet); and a background process started from a non-interactive shell ignores SIGINT (my test process showed `SigIgn: 0000000000000002` in `/proc/<pid>/status`), so test shutdown with SIGTERM, which is what orchestrators send.",
          ],
        },
      ],
    },
    {
      title: "Ordering per Key",
      blocks: [
        {
          type: "paragraph",
          text: "A single queue is FIFO, but with several consumers the **processing** order is not: consumer 1 takes event 7 of a trip, consumer 2 takes event 8 a microsecond later, and consumer 2 might finish first. For trip events (ACCEPTED, ARRIVED, STARTED, COMPLETED) the order per driver matters. I sent 400,000 events for 50 drivers through four consumers, and counted how often a consumer applied an event older than one already applied for the same driver:",
        },
        {
          type: "code",
          language: "java",
          title: "PerKeyOrdering.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class PerKeyOrdering {
    record TripEvent(String driver, int seq, String type) { }
    static final TripEvent PILL = new TripEvent("", -1, "PILL");
    static final String[] TYPES = {"ACCEPTED", "ARRIVED", "STARTED", "COMPLETED"};

    static void run(String label, List<BlockingQueue<TripEvent>> queues, boolean partitioned) throws Exception {
        int consumers = 4;
        Map<String, Integer> lastSeq = new ConcurrentHashMap<>();
        AtomicInteger outOfOrder = new AtomicInteger(), applied = new AtomicInteger();
        List<Thread> threads = new ArrayList<>();
        for (int c = 0; c < consumers; c++) {
            BlockingQueue<TripEvent> mine = queues.get(partitioned ? c : 0);
            threads.add(Thread.ofPlatform().name("trip-writer-" + c).start(() -> {
                try {
                    while (true) {
                        TripEvent e = mine.take();
                        if (e == PILL) break;
                        if (e.seq() % 7 == 0) Thread.yield();                // uneven work per event
                        int[] seen = {0};
                        lastSeq.compute(e.driver(), (k, prev) -> {
                            if (prev != null && prev > e.seq()) seen[0] = 1;  // an older event after a newer one
                            return prev == null ? e.seq() : Math.max(prev, e.seq());
                        });
                        outOfOrder.addAndGet(seen[0]);
                        applied.incrementAndGet();
                    }
                } catch (InterruptedException ex) { }
            }));
        }
        for (int i = 0; i < 400_000; i++) {
            String driver = "driver-" + (i % 50);
            TripEvent e = new TripEvent(driver, i / 50, TYPES[(i / 50) % 4]);
            int target = partitioned ? Math.floorMod(driver.hashCode(), consumers) : 0;   // same driver, same queue
            queues.get(target).put(e);
        }
        for (int c = 0; c < consumers; c++) queues.get(partitioned ? c : 0).put(PILL);
        for (Thread t : threads) t.join();
        System.out.printf("%-34s applied %,d  out-of-order %,d%n", label, applied.get(), outOfOrder.get());
    }

    public static void main(String[] args) throws Exception {
        run("1 shared queue, 4 consumers", List.of(new ArrayBlockingQueue<>(4_096)), false);
        List<BlockingQueue<TripEvent>> parts = new ArrayList<>();
        for (int i = 0; i < 4; i++) parts.add(new ArrayBlockingQueue<>(1_024));
        run("4 queues partitioned by driver", parts, true);
    }
}`,
        },
        {
          type: "output",
          text: `1 shared queue, 4 consumers        applied 400,000  out-of-order 352
4 queues partitioned by driver     applied 400,000  out-of-order 0
1 shared queue, 4 consumers        applied 400,000  out-of-order 616
4 queues partitioned by driver     applied 400,000  out-of-order 0
1 shared queue, 4 consumers        applied 400,000  out-of-order 1,306
4 queues partitioned by driver     applied 400,000  out-of-order 0`,
        },
        {
          type: "list",
          items: [
            "**One shared queue: 280 to 1,379 out-of-order events in six runs**, a different number every time. With my first version (1,000 drivers, so a driver's consecutive events were 1,000 positions apart) it was only 5 to 101 per run: the closer together a key's events are, the more often they race, and real trip events come in bursts.",
            "**Four queues, one consumer each, routed by `hash(driver) % 4`: zero in every run.** Each driver's events always go to the same queue and are processed by the same single thread, so FIFO order within that queue is processing order for that driver. Different drivers still run in parallel.",
            "This is exactly how Kafka orders messages: a partition key picks a partition, and one consumer per partition. It's also why \"add more consumers\" doesn't speed up a single hot key: all of that driver's events go to one partition and one thread.",
            "The partition count is fixed by the routing function. Changing it (4 to 8 queues) moves keys between queues, and during the switch a key's old events may still be in the old queue while new ones go to the new one. Drain first, then change the count.",
            "If keys are uneven (one fleet account producing half the events), one partition becomes the bottleneck. Monitor per-partition queue sizes, not only the total.",
          ],
        },
      ],
    },
    {
      title: "When a Consumer Dies Silently",
      blocks: [
        {
          type: "paragraph",
          text: "Two consumers run as tasks in a fixed thread pool, started with `submit`. Two of 5,000 trip events carry a fare written as `\"14,500\"`, which `Long.parseLong` rejects:",
        },
        {
          type: "code",
          language: "java",
          title: "SilentDeath.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

public class SilentDeath {
    record TripEvent(int seq, String fareText) { }

    static void write(TripEvent e) {
        Long.parseLong(e.fareText());                         // a malformed fare throws NumberFormatException
    }

    static Runnable consumer(BlockingQueue<TripEvent> q, AtomicInteger written, AtomicInteger deadLetters, boolean guarded) {
        return () -> {
            while (true) {
                TripEvent e;
                try {
                    e = q.take();
                } catch (InterruptedException ex) {
                    return;
                }
                if (!guarded) {
                    write(e);                                  // one bad event ends this loop, and the thread's task
                    written.incrementAndGet();
                    continue;
                }
                try {
                    write(e);
                    written.incrementAndGet();
                } catch (RuntimeException ex) {                // per-event failure: record it and keep going
                    deadLetters.incrementAndGet();
                    System.out.println("  dead letter: event " + e.seq() + " (" + ex + ")");
                }
            }
        };
    }

    static void run(boolean guarded) throws Exception {
        System.out.println(guarded ? "guarded consumers:" : "unguarded consumers:");
        BlockingQueue<TripEvent> q = new ArrayBlockingQueue<>(10_000);
        AtomicInteger written = new AtomicInteger(), deadLetters = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<?> f1 = pool.submit(consumer(q, written, deadLetters, guarded));
        Future<?> f2 = pool.submit(consumer(q, written, deadLetters, guarded));
        for (int i = 0; i < 5_000; i++) {
            String fare = (i == 1_000 || i == 3_000) ? "14,500" : "14500";      // two events with a comma
            q.put(new TripEvent(i, fare));
        }
        Thread.sleep(500);
        System.out.printf("  written %,d of 5,000, still queued %,d, consumer tasks done: %b %b%n",
                written.get(), q.size(), f1.isDone(), f2.isDone());
        if (f1.isDone()) {
            try { f1.get(); } catch (Exception ex) { System.out.println("  f1.get() -> " + ex); }
        }
        pool.shutdownNow();
    }

    public static void main(String[] args) throws Exception {
        run(false);
        run(true);
    }
}`,
        },
        {
          type: "output",
          text: `unguarded consumers:
  written 2,999 of 5,000, still queued 1,999, consumer tasks done: true true
  f1.get() -> java.util.concurrent.ExecutionException: java.lang.NumberFormatException: For input string: "14,500"
guarded consumers:
  dead letter: event 1000 (java.lang.NumberFormatException: For input string: "14,500")
  dead letter: event 3000 (java.lang.NumberFormatException: For input string: "14,500")
  written 4,998 of 5,000, still queued 0, consumer tasks done: false false`,
        },
        {
          type: "list",
          items: [
            "**Unguarded: both consumers are dead, and nothing was printed.** The first bad event (1,000) killed one consumer, the second (3,000) killed the other, and 1,999 events sit in a queue nobody reads. `submit` wraps the task in a `FutureTask`, which catches the exception and stores it in the `Future`. Nobody called `get()`, so nobody saw it. The pool's threads are alive and idle, so a thread-count health check says everything is fine.",
            "Only `f1.get()` revealed the cause, as an `ExecutionException`. The Exception Handling Best Practices lesson called this a swallowed exception; here the JDK swallowed it on our behalf.",
            "**With `execute` instead of `submit`** (I changed only those two calls), the default uncaught exception handler printed both stack traces to stderr (`Exception in thread \"pool-1-thread-2\" java.lang.NumberFormatException...`) and `ThreadPoolExecutor` replaced the dead worker threads. But the replacement threads don't run my consumer loop; they wait for new tasks. The output was still `written 2,999 of 5,000, still queued 1,999`. Louder, not fixed.",
            "**Guarded: a `try`/`catch` around each event**, inside the loop. Bad events go to a dead-letter path (here a log line; in production a dead-letter table or topic with the payload and the error), and the consumer keeps going: 4,998 written, 2 dead letters, 0 left.",
            "Catch `RuntimeException` per event, not `Throwable`: an `Error` such as `OutOfMemoryError` means the JVM may be in a bad state, and Example 2 below shows how a supervisor handles a consumer that dies from one.",
          ],
        },
      ],
    },
    {
      title: "How Many Consumers?",
      blocks: [
        {
          type: "paragraph",
          text: "Throughput against consumer count for two kinds of work: a 1 ms wait per event (a database call) and pure arithmetic per event (about 35 to 45 microseconds on this machine). Best of three for each count, three full runs:",
        },
        {
          type: "code",
          language: "java",
          title: "ConsumerScaling.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.locks.LockSupport;

public class ConsumerScaling {
    static final Integer PILL = Integer.MIN_VALUE;
    static volatile long sink;

    static void cpuWork() {                                   // pure arithmetic, standing in for fare calculation
        long x = 0;
        for (int i = 0; i < 20_000; i++) x += (x ^ i) * 31 + i;
        sink = x;
    }

    static double run(int consumers, int events, boolean io) throws Exception {
        BlockingQueue<Integer> q = new ArrayBlockingQueue<>(1_024);
        List<Thread> ts = new ArrayList<>();
        for (int c = 0; c < consumers; c++) {
            ts.add(Thread.ofPlatform().start(() -> {
                try {
                    for (Integer e = q.take(); e != PILL; e = q.take()) {
                        if (io) LockSupport.parkNanos(1_000_000);  // a 1 ms database call
                        else cpuWork();
                    }
                } catch (InterruptedException ex) { }
            }));
        }
        long t0 = System.nanoTime();
        for (int i = 0; i < events; i++) q.put(i);
        for (int c = 0; c < consumers; c++) q.put(PILL);
        for (Thread t : ts) t.join();
        return events / ((System.nanoTime() - t0) / 1e9);
    }

    public static void main(String[] args) throws Exception {
        run(4, 20_000, false);                                  // warm up the JIT
        System.out.println("consumers   1 ms I/O per event   CPU-only per event   (events/s, best of 3)");
        for (int c : new int[] {1, 2, 4, 8, 16, 32, 64}) {
            double io = 0, cpu = 0;
            for (int r = 0; r < 3; r++) {
                io = Math.max(io, run(c, Math.min(c * 500, 8_000), true));
                cpu = Math.max(cpu, run(c, 100_000, false));
            }
            System.out.printf("%9d   %,18.0f   %,18.0f%n", c, io, cpu);
        }
    }
}`,
        },
        {
          type: "output",
          text: `consumers   1 ms I/O per event   CPU-only per event   (events/s, best of 3)
        1                  929               29,032
        2                1,794               60,140
        4                3,598              119,420
        8                7,226              186,115
       16               14,420              182,017
       32               28,784              161,759
       64               58,017              153,516`,
        },
        {
          type: "list",
          items: [
            "**I/O-bound work scaled linearly to 64 consumers** in all runs: about 900 events a second per consumer, because each consumer spends almost all its time parked, not on a CPU. In a real system the limit comes from the other side: the database connection pool (64 consumers with a 10-connection pool means 54 consumers waiting for a connection), the database's own capacity, and lock contention on the rows being written.",
            "**CPU-bound work scaled to 8 consumers (the core count) and then flattened or dropped**: 186,115 at 8, 153,516 at 64 in this run; across the earlier three runs the peak was 150,942 to 185,244, at 8 consumers in two runs and at 32 in one. Beyond the core count, extra consumers only add context switches and contention on the queue. Other benchmarks were running on this machine at the same time, so these are single-machine numbers under load, not JMH.",
            "So the sizing rule from ThreadPoolExecutor Internals: Queues, Rejection and Sizing applies to consumers too: about the core count for CPU work, `cores * (1 + wait time / compute time)` for blocking work, then capped by whatever downstream resource they share. And batching (`drainTo`) often beats adding consumers for database writes, because it reduces round trips instead of multiplying them.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing the fixed trip pipeline from the production section when SIGTERM arrives with 4,637 events queued:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**The signal.** The orchestrator sends SIGTERM. The JVM's signal handler thread starts the shutdown sequence: it calls `Runtime.exit`, which starts every registered shutdown hook thread at the same time. Application threads (ingest, writer, `main`) keep running while hooks run.",
            "**Stop intake.** The hook sets `accepting = false` (a `volatile` field, so the ingest threads see it on their next loop check, per the Java Memory Model lesson). Each ingest thread finishes the ping it is working on and leaves its loop. The hook `join`s them with a 1-second limit. From now on no new event enters the queue, so the queue can only shrink.",
            "**Place the pill.** `q.offer(PILL, 20, SECONDS)`: the queue may be full at this moment, so a plain `offer` could fail and leave the writer waiting forever. The pill goes behind every accepted event.",
            "**Stop the executor from accepting tasks.** `writerPool.shutdown()` doesn't interrupt anything; it only means no new tasks and that the worker thread will end once its current task (the writer loop) returns.",
            "**Drain.** The writer keeps doing `take()` + `drainTo(batch, 499)`. Each batch of up to 500 events is one INSERT. When a batch contains the pill, `batch.remove(PILL)` returns `true`, the remaining events in that batch are written, and the loop returns.",
            "**Wait inside the grace period.** `awaitTermination(20, SECONDS)` returns `true` once the writer loop has returned and the worker thread has exited. It took 1.0 second here. If it returned `false`, the hook would call `shutdownNow()` and the remaining events would be counted as lost, which is better than being killed by SIGKILL mid-batch.",
            "**Exit.** All hooks finish, the JVM halts. `received - written` was 0. The 24,443 pings rejected with 503 during the slowdown were never accepted; they're still on the drivers' phones and will be retried against the new instance.",
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
          title: "PipelineTour.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

public class PipelineTour {
    record Event(String driver, int seq) { }
    static final Event PILL = new Event("", -1);                   // a unique object, compared with ==

    public static void main(String[] args) throws Exception {
        // 1. bounded queues, one per partition, so a driver's events stay in order
        int partitions = 2;
        List<BlockingQueue<Event>> queues = new ArrayList<>();
        for (int i = 0; i < partitions; i++) queues.add(new ArrayBlockingQueue<>(4));

        // 2. one consumer per partition: block for one event, then batch whatever else is there
        List<Thread> consumers = new ArrayList<>();
        for (int i = 0; i < partitions; i++) {
            BlockingQueue<Event> q = queues.get(i);
            consumers.add(Thread.ofPlatform().name("writer-" + i).start(() -> {
                List<Event> batch = new ArrayList<>();
                boolean stop = false;
                while (!stop) {
                    try {
                        batch.add(q.take());
                        q.drainTo(batch, 9);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                    stop = batch.remove(PILL);                        // the pill may arrive inside a batch
                    try {
                        if (!batch.isEmpty()) System.out.println(Thread.currentThread().getName() + " wrote " + batch);
                    } catch (RuntimeException e) {                     // 3. one bad batch must not kill the consumer
                        System.out.println("failed batch " + batch + ": " + e);
                    }
                    batch.clear();
                }
            }));
        }

        // 4. producers: route by key, wait a bounded time, shed if full
        int shed = 0;
        for (int seq = 0; seq < 3; seq++) {
            for (String driver : List.of("Asha", "Ravi")) {
                Event e = new Event(driver, seq);
                int p = Math.floorMod(driver.hashCode(), partitions);
                if (!queues.get(p).offer(e, 100, TimeUnit.MILLISECONDS)) shed++;
            }
        }

        // 5. clean shutdown: one pill per consumer, after the last event, then a bounded wait
        for (BlockingQueue<Event> q : queues) q.put(PILL);
        for (Thread t : consumers) t.join(5_000);
        System.out.println("shed " + shed + ", consumers alive " + consumers.stream().filter(Thread::isAlive).count());
    }
}`,
        },
        {
          type: "output",
          text: `writer-1 wrote [Event[driver=Asha, seq=0], Event[driver=Asha, seq=1], Event[driver=Asha, seq=2]]
writer-0 wrote [Event[driver=Ravi, seq=0], Event[driver=Ravi, seq=1], Event[driver=Ravi, seq=2]]
shed 0, consumers alive 0`,
        },
        {
          type: "paragraph",
          text: "The two writer lines appeared in either order between runs, and in one run `writer-1` printed Asha's events as two batches (`[seq=0]`, then `[seq=1, seq=2]`) because it woke before the producer had put all three. Within each driver, the order was always 0, 1, 2. The five numbered comments are the whole lesson in miniature: bounded partitioned queues, `take` plus `drainTo`, a per-batch `try`/`catch`, `offer` with a timeout at the producer, and one pill per consumer with a bounded `join`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A reusable bounded pipeline that drains on close",
        },
        {
          type: "paragraph",
          text: "Everything from this lesson in one small class: partitioned bounded queues, batching consumers, a per-batch failure path that isolates the bad item, `submit` with a timeout, and `close()` that stops intake, sends one pill per partition, waits with a deadline and reports losses. Because it's `AutoCloseable`, try-with-resources guarantees the drain even if the producing code throws.",
        },
        {
          type: "code",
          language: "java",
          title: "BoundedPipeline.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;
import java.util.function.ToIntFunction;

// A small, reusable pipeline: partitioned bounded queues, batching consumers, drain on close
public class BoundedPipeline<T> implements AutoCloseable {
    private static final Object PILL = new Object();
    private final List<BlockingQueue<Object>> queues = new ArrayList<>();
    private final List<Thread> workers = new ArrayList<>();
    private final ToIntFunction<T> key;
    private final AtomicLong accepted = new AtomicLong(), shed = new AtomicLong(), handled = new AtomicLong(), failed = new AtomicLong();
    private volatile boolean open = true;

    public BoundedPipeline(String name, int partitions, int capacity, int maxBatch, ToIntFunction<T> key, Consumer<List<T>> handler) {
        this.key = key;
        for (int p = 0; p < partitions; p++) {
            BlockingQueue<Object> q = new ArrayBlockingQueue<>(capacity);
            queues.add(q);
            workers.add(Thread.ofPlatform().name(name + "-" + p).start(() -> {
                List<Object> raw = new ArrayList<>(maxBatch);
                boolean stop = false;
                while (!stop) {
                    try {
                        raw.add(q.take());
                    } catch (InterruptedException e) {
                        break;                                       // close() timed out and interrupted us
                    }
                    q.drainTo(raw, maxBatch - 1);
                    stop = raw.remove(PILL);
                    @SuppressWarnings("unchecked") List<T> batch = (List<T>) (List<?>) raw;
                    if (!batch.isEmpty()) {
                        try {
                            handler.accept(batch);
                            handled.addAndGet(batch.size());
                        } catch (RuntimeException e) {               // never let one batch kill the worker:
                            for (T item : batch) {                   // retry one by one to isolate the bad item
                                try {
                                    handler.accept(List.of(item));
                                    handled.incrementAndGet();
                                } catch (RuntimeException single) {
                                    failed.incrementAndGet();         // a real system writes it to a dead-letter table
                                    System.out.println(Thread.currentThread().getName() + " dead letter " + item + ": " + single.getMessage());
                                }
                            }
                        }
                    }
                    raw.clear();
                }
            }));
        }
    }

    /** Returns false (shed) if the partition stays full for longer than the timeout, or the pipeline is closed. */
    public boolean submit(T item, long timeout, TimeUnit unit) throws InterruptedException {
        if (!open) return false;
        BlockingQueue<Object> q = queues.get(Math.floorMod(key.applyAsInt(item), queues.size()));
        boolean ok = q.offer(item, timeout, unit);
        (ok ? accepted : shed).incrementAndGet();
        return ok;
    }

    @Override
    public void close() throws InterruptedException {
        open = false;                                                // stop intake
        for (BlockingQueue<Object> q : queues) q.put(PILL);          // behind everything already accepted
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        for (Thread w : workers) {
            w.join(Math.max(1, TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime())));
            if (w.isAlive()) w.interrupt();                          // out of time: stop it, and report the loss
        }
        System.out.printf("closed: accepted %d, handled %d, failed %d, shed %d, lost %d%n", accepted.get(), handled.get(),
                failed.get(), shed.get(), accepted.get() - handled.get() - failed.get());
    }

    record Ping(int driverId, int seq) { }

    public static void main(String[] args) throws Exception {
        try (BoundedPipeline<Ping> pipeline = new BoundedPipeline<>("db-writer", 4, 100, 50, Ping::driverId, batch -> {
            if (batch.stream().anyMatch(p -> p.seq() == 1234)) throw new IllegalStateException("constraint violation");
            try { Thread.sleep(2); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        })) {
            for (int i = 0; i < 20_000; i++) pipeline.submit(new Ping(i % 40, i), 50, TimeUnit.MILLISECONDS);
        }
        System.out.println("after try-with-resources: every accepted ping was handled or reported");
    }
}`,
        },
        {
          type: "output",
          text: `db-writer-2 dead letter Ping[driverId=34, seq=1234]: constraint violation
closed: accepted 19998, handled 19997, failed 1, shed 2, lost 0
after try-with-resources: every accepted ping was handled or reported`,
        },
        {
          type: "list",
          items: [
            "Every accepted ping is accounted for: `accepted = handled + failed + lost`, and lost is 0. That equation is the metric worth exporting from any real pipeline.",
            "**My first version failed whole batches.** One bad ping made the batch of 50 throw, and all 50 were reported as failed. Retrying the batch one item at a time isolates the single bad ping (`seq=1234`); the other 49 are written.",
            "**That retry has a cost, and the output shows it**: 2 pings were shed (in all three runs). While partition 2's writer retried 50 items one by one at 2 ms each (about 100 ms), its queue filled, and two `submit` calls waited longer than their 50 ms timeout. Shedding is the system working as designed: the slowness stayed in one partition and the callers got a quick `false`.",
            "Try-with-resources (from the try-with-resources lesson) is the right shape for a pipeline: it can't be forgotten on an exception path, and `close()` is where the drain belongs.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Restarting a consumer that dies from an Error",
        },
        {
          type: "paragraph",
          text: "Catching `RuntimeException` per event covers bad data. An `Error` (`StackOverflowError` from a recursive rule, an `AssertionError`, `OutOfMemoryError`) still ends the consumer thread. An `UncaughtExceptionHandler` can log it and start a replacement:",
        },
        {
          type: "code",
          language: "java",
          title: "ConsumerSupervisor.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class ConsumerSupervisor {
    static final BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(1_000);
    static final AtomicInteger handled = new AtomicInteger(), restarts = new AtomicInteger();
    static final CountDownLatch allDone = new CountDownLatch(1);

    static void handle(int event) {
        if (event == 500) throw new StackOverflowError("simulated: recursive fare rule");   // an Error, not an Exception
        if (handled.incrementAndGet() == 999) allDone.countDown();
    }

    static void startConsumer(int generation) {
        Thread t = new Thread(() -> {
            try {
                while (true) {
                    int e = queue.take();
                    try {
                        handle(e);
                    } catch (RuntimeException ex) {
                        System.out.println("event " + e + " failed: " + ex);    // Exceptions are handled per event
                    }
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }, "db-writer-gen" + generation);
        t.setUncaughtExceptionHandler((dead, err) -> {                       // runs in the dying thread
            System.out.println(dead.getName() + " died: " + err + "; restarting");
            restarts.incrementAndGet();
            startConsumer(generation + 1);
        });
        t.start();
    }

    public static void main(String[] args) throws Exception {
        startConsumer(1);
        for (int i = 0; i < 1_000; i++) queue.put(i);
        allDone.await();
        System.out.println("handled " + handled.get() + " of 1,000, restarts " + restarts.get() + ", queue " + queue.size());
        System.exit(0);
    }
}`,
        },
        {
          type: "output",
          text: `db-writer-gen1 died: java.lang.StackOverflowError: simulated: recursive fare rule; restarting
handled 999 of 1,000, restarts 1, queue 0`,
        },
        {
          type: "list",
          items: [
            "The `StackOverflowError` passed straight through `catch (RuntimeException ex)`, ended the thread's `run`, and the JVM called the thread's uncaught exception handler **in the dying thread**. The handler started generation 2, which consumed the remaining 499 events.",
            "The event that caused the `Error` is lost (999 of 1,000): the consumer had already taken it. If it can be identified, it should go to the dead-letter path before the restart, or the replacement should not take it again, otherwise a poison message causes an endless crash-and-restart loop.",
            "For `OutOfMemoryError` I wouldn't restart at all: the production section runs with `-XX:+ExitOnOutOfMemoryError`, because after an OOM any thread may have failed half-way through an update. Restarting a whole instance is cleaner than restarting one thread in a damaged JVM.",
            "`System.exit(0)` at the end is needed because the restarted consumer is a non-daemon thread parked in `take()`. In a real service the supervisor would also stop restarting during shutdown.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which Design",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Avoid"],
          rows: [
            ["Dedicated producer threads, source can wait (files, Kafka)", "Bounded queue with `put`", "Unbounded queues; shedding data you could have waited for"],
            ["Request threads with a latency budget", "Bounded queue, `offer` with the request's remaining deadline, 503 on `false`", "`put`, or `offer` with a fixed per-call timeout and no overall deadline"],
            ["Newest data matters more than completeness (GPS, metrics)", "`offer` and drop, or drop the oldest", "Blocking ingestion on a slow sink"],
            ["Per-key ordering with parallelism", "N queues, route by `hash(key) % N`, one consumer each", "One shared queue with many consumers"],
            ["Many small writes to a database", "`take` + `drainTo` batches", "One round trip per event; more consumers instead of batching"],
            ["Simple background tasks, no ordering", "A bounded `ThreadPoolExecutor` with a rejection policy", "`Executors.newFixedThreadPool` (unbounded queue) for untrusted load"],
            ["Stopping consumers you wrote", "One poison pill per consumer, plus a bounded `join`", "One pill for many consumers; `Thread.stop`"],
            ["Stopping on SIGTERM", "Shutdown hook: stop intake, pill, drain within the grace period", "`shutdownNow()` without saving the returned tasks; daemon writer threads"],
            ["Explicit demand between components or across a network", "`Flow`/Reactive Streams `request(n)`, Kafka consumer lag", "Hoping queues upstream are bounded"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "An unbounded queue between a fast producer and a slow consumer",
        },
        {
          type: "paragraph",
          text: "`new LinkedBlockingQueue<>()` and `Executors.newFixedThreadPool` both accept work without limit. A slow consumer turns into heap growth (about 14,500 events a second in `Backpressure`), full GCs, and an `OutOfMemoryError` that kills every queued event at once.",
        },
        {
          type: "heading",
          text: "Treating a per-call timeout as a latency budget",
        },
        {
          type: "paragraph",
          text: "`offer(e, 2, MILLISECONDS)` shed 2 to 25 pings out of 40,000 and answered the median request after 2 seconds. The timeout must be what's left of the request's own deadline.",
        },
        {
          type: "heading",
          text: "One poison pill for several consumers",
        },
        {
          type: "paragraph",
          text: "Each pill stops one consumer. The others park in `take()` forever and keep the JVM alive (`DestroyJavaVM` waiting in the thread dump). Send one per consumer, after the producers have finished.",
        },
        {
          type: "heading",
          text: "Sending the pill while producers are still running",
        },
        {
          type: "paragraph",
          text: "If a producer puts an event after the pill, the consumer that took the pill has already left, and the event sits in the queue forever (or another consumer processes it out of order). Join or stop the producers first; that's why the hook in the production section joins the ingest threads before placing the pill.",
        },
        {
          type: "heading",
          text: "Losing the element in hand on interrupt",
        },
        {
          type: "paragraph",
          text: "A consumer interrupted in the middle of writing has already removed the event from the queue. Draining the queue afterwards misses it: 3 events in `ShutdownStyles` until I kept a reference to the element in hand and finished it.",
        },
        {
          type: "heading",
          text: "Using shutdownNow() and ignoring its return value",
        },
        {
          type: "code",
          language: "java",
          code: `executor.shutdownNow();                        // 294 to 297 of 300 tasks discarded in my test

List<Runnable> unrun = executor.shutdownNow(); // at least count them, or persist them
log.warn("{} tasks not run", unrun.size());`,
        },
        {
          type: "heading",
          text: "Letting an exception end the consumer loop",
        },
        {
          type: "paragraph",
          text: "Inside `submit`, the exception is stored in a `Future` nobody reads; inside `execute`, it's printed and the thread is replaced, but the loop is gone either way. Wrap each event (or batch) in `try`/`catch (RuntimeException)` and route failures to a dead-letter store.",
        },
        {
          type: "heading",
          text: "Assuming a shared queue keeps per-key order",
        },
        {
          type: "paragraph",
          text: "The queue is FIFO; processing with several consumers isn't. 280 to 1,379 out-of-order events per run in `PerKeyOrdering`. Partition by key.",
        },
        {
          type: "heading",
          text: "A shutdown hook that can take longer than the grace period",
        },
        {
          type: "paragraph",
          text: "With 5,389 events queued and a drain rate of 500 a second, the hook needed 10.8 seconds and had 10. Size the queue so `capacity / drain rate` is well inside the grace period, and always use a bounded wait so the hook can report what it couldn't finish.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Bound every queue, and derive the bound from two numbers: memory per element times capacity must fit the heap budget; capacity divided by drain rate must fit the latency budget and the shutdown grace period.",
            "Decide explicitly what producers do when the queue is full: block (internal producers), wait up to the remaining deadline then shed (request threads), or drop (telemetry). Make shedding visible with a counter and a meaningful response.",
            "Batch on the consumer side with `take` + `drainTo`, and isolate failures by retrying a failed batch item by item.",
            "Catch `RuntimeException` per event or batch inside the consumer loop; never let one bad message end the loop. Send failures to a dead-letter store with the payload and the error.",
            "Partition by key when order per key matters, with one consumer per partition; monitor per-partition lag.",
            "Shut down in order: stop intake, stop producers, one pill per consumer (or interrupt and drain), wait with a deadline inside the grace period, report anything not finished.",
            "Keep track of the element in hand in interruptible consumers.",
            "Name threads (`gps-ingest-0`, `db-writer-2`) and export queue size, fill percentage, accepted, handled, failed, shed and lost. `accepted == handled + failed + lost` should hold at shutdown.",
            "Run services with `-XX:+ExitOnOutOfMemoryError` (or `CrashOnOutOfMemoryError`) so an OOM restarts the instance instead of leaving a half-dead pipeline.",
            "Prefer an existing durable queue (Kafka, a database outbox) over an in-memory one when losing queued events on a crash isn't acceptable; an in-memory queue only survives graceful shutdowns.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The measurements from this lesson, gathered in one place. All are single-machine runs on 8 cores with other benchmarks running at the same time, repeated at least three times, not JMH:",
        },
        {
          type: "table",
          headers: ["Measurement", "Result", "Takeaway"],
          rows: [
            ["300,000 events, 3 producers, 2 consumers", "wait/notify 68 to 94 ms, `ArrayBlockingQueue` 29 to 65 ms, executor 27 to 97 ms", "The hand-written buffer is slowest; `notifyAll` wakes everyone"],
            ["Executor with `CallerRunsPolicy`, tiny tasks", "46% to 74% of tasks ran in producer threads", "CallerRuns is backpressure, and it moves work into callers"],
            ["Unbounded queue, producer 21,000/s, consumer 6,300/s", "Queue grows ~14,500/s, heap ~4.6 MB/s; producer blocked 77 to 100 ms in 4 s", "Growth is silent"],
            ["Bounded queue (2,000), same rates", "Queue flat at 2,000, heap 2 MB, producer blocked 3,987 to 4,000 ms in 4 s", "The producer runs at the consumer's speed"],
            ["`put` vs `offer(2 ms)` vs `offer(deadline)`, 20,000/s into 6,000/s", "p99 4.4 to 4.9 s, 4.2 to 4.5 s, and 5.2 to 7.3 ms", "Only a deadline bounds latency"],
            ["Shared queue vs partitioned, 4 consumers, 50 drivers", "280 to 1,379 vs 0 out-of-order events", "Partition by key for order"],
            ["Consumers for 1 ms I/O work", "~900 events/s per consumer, linear to 64", "Limited by downstream resources, not threads"],
            ["Consumers for CPU work", "Peak 150,942 to 186,115/s, at about the core count", "More consumers than cores doesn't help"],
            ["Drain on SIGTERM", "886 events in 1.9 s; 4,637 events in 1.0 s with batching", "Batching shortens shutdown too"],
          ],
        },
      ],
    },
    {
      title: "Producer-Consumer in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend in Kolkata receives GPS pings and trip events from driver apps (about 8,000 a second across Salt Lake and New Town in the evening) and writes them to a trip-events table that billing and dispute resolution read later. Two ingest threads put events into a `new LinkedBlockingQueue<>()`, and a single-thread executor writes them one INSERT at a time. It had run for months. Then two things happened in the same week. On Tuesday, an index rebuild on the trip-events table made inserts several times slower, and within minutes every instance died with `OutOfMemoryError`. On Thursday, a routine deploy finished cleanly, and the next morning support found 40 minutes of trips with no events at all: no start, no end, no route, so no way to settle fare disputes.",
        },
        {
          type: "paragraph",
          text: "I rebuilt it with the same shape: two ingest threads at 4 pings per millisecond each, 1 KB of raw payload per event, a database stand-in that costs 0.5 ms plus 0.02 ms per row and becomes 2 ms plus 0.2 ms per row one second in (the index rebuild), and a 64 MB heap so it fails in seconds instead of minutes:",
        },
        {
          type: "code",
          language: "java",
          title: "TripPipeline.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;

public class TripPipeline {
    record TripEvent(long driverId, String tripId, double lat, double lon, long atMillis, byte[] raw) { }
    static final TripEvent PILL = new TripEvent(-1, "PILL", 0, 0, 0, new byte[0]);

    static final long START = System.nanoTime();
    static final AtomicLong received = new AtomicLong(), written = new AtomicLong(), rejected = new AtomicLong();
    static volatile boolean accepting = true;

    // The database: 0.5 ms + 0.02 ms per row, until an index rebuild at t = 1 s makes it 2 ms + 0.2 ms per row
    static void insert(int rows) {
        boolean slow = System.nanoTime() - START > 1_000_000_000L;
        LockSupport.parkNanos(slow ? 2_000_000 + 200_000L * rows : 500_000 + 20_000L * rows);
    }

    public static void main(String[] args) throws Exception {
        boolean fixed = args[0].equals("after");
        BlockingQueue<TripEvent> q = fixed ? new ArrayBlockingQueue<>(5_000) : new LinkedBlockingQueue<>();

        // GPS ingest: two threads, each receiving 4 pings per millisecond from driver apps
        List<Thread> ingest = new ArrayList<>();
        for (int t = 0; t < 2; t++) {
            ingest.add(Thread.ofPlatform().name("gps-ingest-" + t).daemon().start(() -> {
                long next = System.nanoTime(), n = 0;
                while (accepting) {
                    for (int i = 0; i < 4; i++, n++) {
                        long arrived = next;                     // when the app sent it, even if this thread is behind
                        TripEvent e = new TripEvent(n % 20_000, "TRIP-" + n, 22.58, 88.41, System.currentTimeMillis(), new byte[1024]);
                        try {
                            boolean ok;
                            if (fixed) {   // backpressure: wait up to the 5 ms budget, otherwise answer 503 and the app retries
                                long left = arrived + 5_000_000 - System.nanoTime();
                                ok = left > 0 && q.offer(e, left, TimeUnit.NANOSECONDS);
                            } else {
                                ok = q.offer(e);                 // unbounded: always true
                            }
                            (ok ? received : rejected).incrementAndGet();
                        } catch (InterruptedException ex) {
                            return;
                        }
                    }
                    next += 1_000_000;
                    LockSupport.parkNanos(next - System.nanoTime());
                }
            }));
        }

        // DB writer
        ExecutorService writerPool = Executors.newSingleThreadExecutor(r -> new Thread(r, "db-writer"));
        writerPool.execute(() -> {
            List<TripEvent> batch = new ArrayList<>(500);
            try {
                while (true) {
                    TripEvent first = q.take();
                    if (first == PILL) return;
                    batch.add(first);
                    if (fixed) q.drainTo(batch, 499);           // fixed: one INSERT for up to 500 rows
                    boolean stop = batch.remove(PILL);
                    insert(batch.size());
                    written.addAndGet(batch.size());
                    batch.clear();
                    if (stop) return;
                }
            } catch (InterruptedException e) {
                System.out.println("db-writer interrupted, " + batch.size() + " events in hand dropped");
            }
        });

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.printf("SIGTERM at %.1fs: received %,d, written %,d, queued %,d%n",
                    (System.nanoTime() - START) / 1e9, received.get(), written.get(), q.size());
            if (fixed) {
                accepting = false;                                // 1. stop intake (the load balancer stops routing too)
                for (Thread t : ingest) {
                    try { t.join(1_000); } catch (InterruptedException e) { }
                }
                try {
                    q.offer(PILL, 20, TimeUnit.SECONDS);          // 2. pill behind the last event (the queue may be full)
                } catch (InterruptedException e) { }
                writerPool.shutdown();                            // 3. no new tasks; the writer keeps draining
                try {
                    if (!writerPool.awaitTermination(20, TimeUnit.SECONDS)) writerPool.shutdownNow();   // 4. within the grace period
                } catch (InterruptedException e) { }
            } else {
                writerPool.shutdownNow();                         // what the framework did on context close
            }
            System.out.printf("exit after %.1fs: received %,d, written %,d, LOST %,d (rejected with 503, still on phones: %,d)%n",
                    (System.nanoTime() - START) / 1e9, received.get(), written.get(), received.get() - written.get(), rejected.get());
        }, "shutdown"));

        var memory = ManagementFactory.getMemoryMXBean();
        System.out.println("pid " + ProcessHandle.current().pid() + ", " + (fixed ? "ArrayBlockingQueue(5,000) + backpressure + batches" : "LinkedBlockingQueue() + one INSERT per event"));
        for (int s = 1; s <= 60; s++) {
            Thread.sleep(1_000);
            System.out.printf("%3ds  received %,7d  written %,7d  rejected %,7d  queued %,7d  heap %3d MB%n", s,
                    received.get(), written.get(), rejected.get(), q.size(), memory.getHeapMemoryUsage().getUsed() >> 20);
        }
    }
}`,
        },
        {
          type: "heading",
          text: "Before, Tuesday: the database slows down",
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx64m -XX:+ExitOnOutOfMemoryError -Xlog:gc:file=gc.log TripPipeline before",
        },
        {
          type: "output",
          text: `pid 1467362, LinkedBlockingQueue() + one INSERT per event
  1s  received   8,320  written   1,570  rejected       0  queued   6,749  heap  13 MB
  2s  received  16,424  written   2,009  rejected       0  queued  14,414  heap  23 MB
  3s  received  24,440  written   2,433  rejected       0  queued  22,006  heap  27 MB
  4s  received  32,448  written   2,858  rejected       0  queued  29,589  heap  36 MB
  5s  received  40,456  written   3,279  rejected       0  queued  37,176  heap  46 MB
  6s  received  48,472  written   3,707  rejected       0  queued  44,764  heap  57 MB
  7s  received  56,480  written   4,122  rejected       0  queued  52,357  heap  59 MB
Terminating due to java.lang.OutOfMemoryError: Java heap space
exit code 3`,
        },
        {
          type: "paragraph",
          text: "After the slowdown the writer managed about 430 events a second against 8,000 arriving, and the queue grew by about 7,500 a second. The GC log (shown in Internal Working) went from normal young collections to evacuation failures and five full GCs in the last 0.7 seconds. 56,480 events had been accepted and 4,122 written: **52,358 accepted events died with the process**, and no shutdown hook ran, because `ExitOnOutOfMemoryError` halts immediately. Without that flag the first run was worse: `OutOfMemoryError` was thrown inside the ingest threads and `main` (\"thrown from the UncaughtExceptionHandler\"), 19 full GCs ran, and the process exited without the shutdown hook printing anything.",
        },
        {
          type: "heading",
          text: "Before, Thursday: a deploy",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx64m -XX:+ExitOnOutOfMemoryError TripPipeline before &
sleep 3.5; kill -TERM <pid>`,
        },
        {
          type: "output",
          text: `pid 1467628, LinkedBlockingQueue() + one INSERT per event
  1s  received   8,400  written   1,547  rejected       0  queued   6,852  heap  13 MB
  2s  received  16,496  written   1,991  rejected       0  queued  14,504  heap  23 MB
  3s  received  24,504  written   2,425  rejected       0  queued  22,078  heap  27 MB
SIGTERM at 3.5s: received 27,560, written 2,589, queued 24,970
exit after 3.5s: received 27,560, written 2,590, LOST 24,970 (rejected with 503, still on phones: 0)
db-writer interrupted, 0 events in hand dropped`,
        },
        {
          type: "paragraph",
          text: "The application framework closed its executors on shutdown with `shutdownNow()`. That interrupted the writer and returned nothing useful (the events were in my own queue, not the executor's), and the JVM exited in milliseconds. 24,970 events that the server had **acknowledged** to the driver apps were never written. The apps had deleted them after the 200 OK, so they were gone for good. A second run where I sent SIGTERM at 4.8 seconds lost 34,873.",
        },
        {
          type: "heading",
          text: "After: bounded queue, backpressure, batches and drain on shutdown",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx64m -XX:+ExitOnOutOfMemoryError -Xlog:gc:file=gc.log TripPipeline after &
sleep 10.5; kill -TERM <pid>`,
        },
        {
          type: "output",
          text: `pid 1468205, ArrayBlockingQueue(5,000) + backpressure + batches
  1s  received   8,224  written   8,008  rejected       0  queued      96  heap  13 MB
  2s  received  16,432  written  12,688  rejected       0  queued   3,244  heap  23 MB
  3s  received  23,181  written  17,688  rejected   1,259  queued   4,993  heap  14 MB
  4s  received  28,009  written  22,688  rejected   4,439  queued   4,822  heap  23 MB
  5s  received  32,861  written  27,688  rejected   7,611  queued   4,673  heap  32 MB
  6s  received  37,688  written  32,188  rejected  10,752  queued   5,000  heap  12 MB
  7s  received  42,688  written  37,188  rejected  13,768  queued   5,000  heap  21 MB
  8s  received  47,688  written  42,188  rejected  16,820  queued   5,000  heap  30 MB
  9s  received  52,532  written  47,188  rejected  19,996  queued   4,844  heap  38 MB
 10s  received  57,364  written  52,188  rejected  23,172  queued   4,676  heap  14 MB
SIGTERM at 10.5s: received 59,325, written 54,188, queued 4,637
 11s  received  59,329  written  56,688  rejected  24,443  queued   2,142  heap  19 MB
exit after 11.5s: received 59,329, written 59,329, LOST 0 (rejected with 503, still on phones: 24,443)`,
        },
        {
          type: "list",
          items: [
            "**Batching changed the database's capacity**: the same slow database wrote 5,000 events a second in batches of up to 500 (2 ms + 500 × 0.2 ms = 102 ms per batch) against 430 a second one row at a time. That alone is a factor of 11.",
            "**Backpressure handled the rest.** 8,000 a second still exceeded 5,000, so the queue filled to its 5,000 bound and stayed there, and pings that couldn't be queued within their 5 ms budget got a 503. The driver apps keep those and retry. The heap stayed between 12 and 43 MB over a 30-second run with zero full GCs: eight young collections in 30 seconds, each leaving 6 to 16 MB live (`48M->16M` was the last).",
            "**The deploy lost nothing.** The hook stopped intake, joined the ingest threads, placed the pill and let the writer drain 4,637 events in 1.0 second, well inside a 30-second grace period. `received == written`: 59,329. A 30-second run drained 4,808 events with the same result: lost 0.",
            "**My first fixed version hung on shutdown.** It placed the pill with plain `q.offer(PILL)`. At the moment of SIGTERM the queue was full (5,000 of 5,000), so `offer` returned `false`, the pill was never queued, the writer drained everything and then waited in `take()`, and `awaitTermination` sat for its full 20 seconds before `shutdownNow`. `offer(PILL, 20, SECONDS)` fixed it. A pill has to be placed with an operation that waits for room.",
            "**My first backpressure version barely shed.** It measured the 5 ms budget from when the ingest thread got round to the ping, not from when the ping arrived, so a thread that was already behind kept waiting, exactly the `offer(2 ms)` result from the shedding section. Measuring from the scheduled arrival time fixed it.",
          ],
        },
        {
          type: "paragraph",
          text: "Lessons learned:",
        },
        {
          type: "list",
          items: [
            "An unbounded queue doesn't absorb a slowdown; it converts it into memory and then into an outage that loses everything queued. Give every queue a bound derived from memory per element and drain time.",
            "Backpressure needs an exit: a deadline-based `offer` and a response the client understands (503 plus retry), so a full queue becomes a visible, local decision.",
            "Batch writes with `drainTo`. Against a slow database it was the difference between 430 and 5,000 events a second.",
            "Drain on SIGTERM in a fixed order (stop intake, place one pill per consumer with a waiting `offer`, wait with a deadline inside the grace period), and never let a framework's `shutdownNow()` decide what happens to your own queue.",
            "An acknowledged event must survive a graceful shutdown; for events that must also survive a crash, write them durably before acknowledging (an outbox table or Kafka) and keep the in-memory queue only as a buffer in front of that.",
            "Run with `-XX:+ExitOnOutOfMemoryError`, and export queue size, accepted, written, rejected and lost, so Tuesday's growth shows on a dashboard long before the heap is full.",
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
              question: "What is the producer-consumer problem?",
              answer:
                "Some threads produce work and others consume it, at different and varying speeds, through a shared buffer. The problem is coordinating them safely: consumers must wait when the buffer is empty, producers when it's full, and no item may be lost or processed twice. In Java the standard solution is a bounded `BlockingQueue`: `put` blocks when full, `take` blocks when empty.",
            },
            {
              question: "How would you implement producer-consumer with wait and notify?",
              answer:
                "A class with a `Queue` and a capacity, and two `synchronized` methods. `put`: `while (queue.size() == capacity) wait();` then add and `notifyAll()`. `take`: `while (queue.isEmpty()) wait();` then remove and `notifyAll()`. `while`, not `if`, because of spurious wake-ups and because another thread may have taken the slot first; `notifyAll`, not `notify`, because producers and consumers share one wait set. In my measurement it was slower than `ArrayBlockingQueue` in every round (68 to 94 ms against 29 to 65 ms for 300,000 events).",
            },
            {
              question: "What is a poison pill?",
              answer:
                "A special marker object put on the queue after the last real item to tell a consumer to stop. Because the queue is FIFO, everything before the pill is processed first. You need one pill per consumer: with one pill and three consumers, two stayed parked in `take()` forever in my test and kept the JVM alive. Compare it by identity so no real item can equal it.",
            },
            {
              question: "What is the difference between shutdown() and shutdownNow()?",
              answer:
                "`shutdown()` stops accepting new tasks and lets already queued tasks run; `awaitTermination` then waits for them. `shutdownNow()` interrupts running tasks and removes queued tasks, returning them as a `List<Runnable>`. In my test with 300 queued 1 ms tasks, `shutdown()` ran all 300; `shutdownNow()` ran 3 to 6 and returned 294 to 297.",
            },
            {
              question: "Why should a producer-consumer queue be bounded?",
              answer:
                "So that a consumer slower than the producer makes the producer wait (or shed) instead of growing memory without limit. My unbounded queue grew by about 14,500 events a second with no signal to the producer; the bounded one stayed at 2,000 and slowed the producer to the consumer's rate. The bound also caps latency and shutdown drain time.",
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
              question: "What is backpressure, and how do you implement it in a Java service?",
              answer:
                "Backpressure is a slow consumer slowing down (or refusing) its producers instead of buffering without limit. In-process, a bounded `BlockingQueue` gives it: `put` blocks internal producers; request threads use `offer` with their remaining deadline and return 503 on `false`; executors use a bounded queue plus a rejection policy such as `CallerRunsPolicy`. Across services: TCP flow control, Reactive Streams `request(n)` (`java.util.concurrent.Flow`), Kafka consumer lag, HTTP 429/503 with retry.",
            },
            {
              question: "How do you stop consumer threads cleanly?",
              answer:
                "Stop the producers first, then either send one poison pill per consumer (they finish everything queued before the pill) or interrupt them. If interrupting, decide whether to drain: after the interrupt, finish the element in hand and `poll()` until empty. Always wait with a timeout (`join(ms)` or `awaitTermination`) and report what wasn't finished. In my tests, pills wrote 300 of 300; interrupt-and-drop wrote 0 to 6 and lost 3 in-hand events; interrupt-then-drain wrote 300 once I tracked the element in hand.",
            },
            {
              question: "How do you preserve per-key ordering with multiple consumers?",
              answer:
                "Partition: N queues, route each item by `hash(key) % N`, one consumer per queue. All of one key's items go through one FIFO queue and one thread. With one shared queue and four consumers I measured 280 to 1,379 out-of-order events per run for 50 drivers; with four partitioned queues, zero in every run. It's the same model as Kafka partitions.",
            },
            {
              question: "Why did an exception in a consumer not appear in the logs?",
              answer:
                "Because the consumer ran via `ExecutorService.submit`, which wraps the task in a `FutureTask` that catches the exception and stores it in the `Future`. Unless someone calls `get()`, it's never seen, and the consumer loop is simply gone. With `execute`, the uncaught handler prints it and the pool replaces the thread, but the loop is still gone. Fix: catch `RuntimeException` per event inside the loop and route failures to a dead-letter store.",
            },
            {
              question: "What does CallerRunsPolicy do, and when is it a good backpressure strategy?",
              answer:
                "When the executor's queue is full and no thread can be added, it runs the rejected task in the thread that called `execute`. The submitter is busy and can't submit more, so it slows the producer. In my test with tiny tasks, 46% to 74% of tasks ran in producer threads. It's fine for internal producers; it's risky when the caller is a request thread (the request pays for the task) or an event loop (which must never block), and it breaks submission order.",
            },
            {
              question: "What does drainTo give a consumer?",
              answer:
                "Batching: `take()` waits for the first item, `drainTo(batch, max)` grabs whatever else is already there in one lock acquisition, without blocking. The consumer then does one database round trip per batch. In the production rebuild that took a slow database from 430 to 5,000 events a second. Watch out: `drainTo` also drains a poison pill, so check the batch for it.",
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
              question: "Why doesn't offer(e, 2 ms) bound request latency?",
              answer:
                "It bounds one wait, not the request's total time. With one ingest thread, requests queue behind each other before they even reach `offer`, and with a queue that frees a slot every 160 µs, a 2 ms wait almost always succeeds. I measured 2 to 25 shed out of 40,000 and a median answer after about 2 seconds, almost identical to `put`. Using the request's remaining deadline (`arrival + budget - now`) as the timeout shed 27,000 and kept p99 at 5 to 7 ms.",
            },
            {
              question: "What happens to in-flight work when a JVM receives SIGTERM, SIGKILL, or runs out of memory?",
              answer:
                "SIGTERM: the JVM runs all shutdown hooks concurrently while application threads keep running; daemon threads just stop when the hooks finish. Anything queued in memory survives only if a hook drains it. SIGKILL: no hooks, everything in memory is lost. `OutOfMemoryError` with `-XX:+ExitOnOutOfMemoryError`: immediate exit, no hooks, everything lost (52,358 events in my rebuild); without the flag, the error hits whichever threads happen to allocate, they die one by one, and in my run the process went through 19 full GCs before exiting without its hook output. That's why acknowledged events that must survive crashes need durable storage before the acknowledgement.",
            },
            {
              question: "How do you size the queue and the drain timeout?",
              answer:
                "From three constraints. Memory: capacity times bytes per element (about 1.1 KB per trip event in my histogram) must fit comfortably in the heap. Latency: capacity divided by drain rate is the worst-case time an accepted item waits. Shutdown: the same number must fit inside the grace period minus a margin. My hook with a 10 s limit lost 636 events when 5,389 were queued at 500 a second. Then measure under a slowed consumer, not only at normal load.",
            },
            {
              question: "How does a supervisor handle a consumer that dies from an Error?",
              answer:
                "Per-event `catch (RuntimeException)` doesn't catch `Error`s, so the thread ends. A `Thread.UncaughtExceptionHandler` runs in the dying thread and can log and start a replacement consumer; my `ConsumerSupervisor` restarted after a `StackOverflowError` and processed the remaining 499 events. The item that caused it must be dead-lettered, or the restart loops on it. For `OutOfMemoryError` I prefer exiting the whole JVM, because other threads may have left shared state half-updated.",
            },
            {
              question: "How do virtual threads change producer-consumer design?",
              answer:
                "Blocking becomes cheap: a virtual thread parked in `put` or `take` unmounts from its carrier, so one virtual thread per producer, or per request, is fine. What doesn't change is that something must still bound the work in flight. Unbounded queues still exhaust the heap, and a million blocked virtual producers still hold a million requests. Bounded queues and semaphores become the main limit, rather than thread pool sizes.",
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
              question: "After a database slowdown, all instances of an event-ingest service die with OutOfMemoryError within minutes. What do you look for, and what do you change?",
              answer:
                "A heap dump or class histogram: a large number of `LinkedBlockingQueue$Node` objects equal to the number of event objects means an unbounded queue absorbed the slowdown (my histogram showed 34,388 of each, with the payload `byte[]`s weighing 37 MB). GC logs will show young collections freeing nothing, evacuation failures and back-to-back full GCs. Fix: bounded queue sized from memory and drain time, a deadline-based `offer` with 503 and client retry, `drainTo` batching to raise the database's effective throughput (430 to 5,000 events a second in my rebuild), `-XX:+ExitOnOutOfMemoryError`, and a queue-size alert.",
            },
            {
              question: "Every deploy, support finds a few minutes of trip events missing, although the ingest API returned 200 OK for them. What's happening?",
              answer:
                "Events acknowledged at ingest are still in an in-memory queue when the old instance stops, and nothing drains it: a framework calling `shutdownNow()`, daemon writer threads, or no shutdown hook. My rebuild lost 24,970 events on SIGTERM that way. Fix: a SIGTERM hook that stops intake, joins producers, places one pill per consumer with an `offer` that waits for room, and waits with a deadline inside the grace period; make sure the load balancer stops routing first. If events must also survive crashes, write them durably before returning 200.",
            },
            {
              question: "A service takes exactly 30 seconds to stop on every deploy and then gets SIGKILLed. Thread dumps during shutdown show three threads in LinkedBlockingQueue.take and DestroyJavaVM. What's wrong?",
              answer:
                "Non-daemon consumer threads are parked in `take()` and nobody stops them, so the JVM waits for them until the orchestrator's 30-second grace period ends. Usually that's too few poison pills (one for three consumers), pills sent before producers finished, or a pill that couldn't be queued because the queue was full (a plain `offer` returning `false`, which hung my first fixed pipeline for 20 seconds). Send one pill per consumer with a blocking or timed `offer`, or interrupt the consumers, and wait with a timeout.",
            },
            {
              question: "A queue's size keeps growing although the consumer threads are all alive and idle. CPU is low. What would you check?",
              answer:
                "Whether the consumer loops are actually running. Threads alive and idle in a pool's `getTask`, rather than in your queue's `take`, means the loops ended, most often because an exception escaped a task started with `submit`, where it's stored silently in the `Future`. My `SilentDeath` run left both consumers dead after two malformed fares and 1,999 events queued, with nothing in the logs. Check `future.get()` or add a per-event `try`/`catch` with dead-lettering, and alert on \"queue growing while processed rate is zero\".",
            },
            {
              question: "Riders occasionally see a trip shown as COMPLETED and then STARTED again. The event processor uses one queue and eight consumer threads. How do you fix it without losing parallelism?",
              answer:
                "The shared queue is FIFO, but eight consumers process in parallel, so a driver's STARTED and COMPLETED can be applied in either order. My test with 4 consumers and 50 drivers produced 280 to 1,379 out-of-order applications per run. Partition by trip or driver ID into N queues with one consumer each: zero out-of-order in every run, and different drivers still run in parallel. Also make the consumer reject a transition that the trip's state machine doesn't allow (System Design track: State Machines) as a second line of defence.",
            },
            {
              question: "To protect the ingest API, a teammate changed put to offer(e, 2, MILLISECONDS). Under overload, p99 latency is still several seconds and almost nothing is rejected. Why?",
              answer:
                "Because the timeout limits one wait, not the request's age. Requests queue up behind the ingest threads before they reach `offer`, and with a constantly draining queue a 2 ms wait nearly always gets a slot. I measured exactly this: 2 to 25 shed out of 40,000 and seconds of latency, the same as `put`. Use the remaining deadline: compute it from the request's arrival time and skip the `offer` entirely when it's already expired. That shed 27,000 of 40,000 and kept p99 at 5 to 7 ms.",
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
            "Create an `ArrayBlockingQueue<Integer>(3)` and a consumer thread that loops `take()` then `Thread.sleep(100)`. From `main`, `put` the numbers 1 to 10 and print the elapsed milliseconds and `size()` after each `put`.",
            "Run step 1 again with `new LinkedBlockingQueue<>()`.",
            "Start three consumer threads that loop on `take()` until they see a pill, put 50 events and **one** pill, let `main` return, and run `jcmd <pid> Thread.print`.",
            "Submit `() -> { throw new IllegalStateException(\"bad event\"); }` to a single-thread executor with `submit`, sleep 200 ms, print `future.isDone()`, then call `future.get()` in a `try`.",
            "Run `HookDemo drain` from the Clean Shutdown section, wait two seconds, and send `kill -TERM <pid>`. Then run it again and send `kill -KILL <pid>`.",
            "Run `PerKeyOrdering` a few times.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 accepts the first four `put`s immediately (three in the queue, one already taken by the consumer) and then one every 100 ms: I got `put 5 at 100 ms` up to `put 10 at 603 ms`, with size stuck at 3. Step 2 accepts all ten within a few milliseconds and the size climbs to 9: the producer never waits. Step 3 prints one \"got the pill\" line, the process doesn't exit, and the dump shows two writer threads `WAITING (parking)` on the same condition plus `DestroyJavaVM`. Step 4 prints nothing until `get()`, then `isDone true` and `java.lang.IllegalStateException: bad event` as the cause. Step 5 prints both hook lines with `lost 0` for SIGTERM, and nothing at all after the pid line for SIGKILL. Step 6 shows a few hundred to over a thousand out-of-order events for the shared queue and 0 for the partitioned one, every time.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PATTERN     producers -> bounded queue -> consumers
            by hand: synchronized + while(wait) + notifyAll   (slowest)
            BlockingQueue: put/take        executor: shutdown() drains

FULL QUEUE  put            -> producer waits (internal producers)
            offer(deadline)-> wait what's left of the budget, then 503
            offer()        -> drop now (telemetry)
            CallerRuns     -> producer runs the task (46-74% in my test)
            unbounded      -> heap grows (~14,500 events/s) -> OOM

SHUTDOWN    stop intake -> stop producers -> 1 pill PER consumer
            -> drain -> wait with deadline < grace period -> report
            shutdownNow(): returns unrun tasks; interrupt loses the item in hand
            SIGTERM runs hooks; SIGKILL and ExitOnOutOfMemoryError don't

ORDER       shared queue + N consumers: 280-1,379 out of order
            partition by hash(key) % N, 1 consumer each: 0

FAILURES    submit() hides exceptions in the Future; catch per event,
            dead-letter, supervise Errors, exit on OOM

SIZING      capacity x bytes/item <= heap budget
            capacity / drain rate <= latency budget and grace period
            consumers: ~cores for CPU, more for I/O, capped downstream`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A producer-consumer pipeline is only as good as its edges: a bound that turns a slow consumer into backpressure instead of heap growth, a deadline-based response when the queue is full, and partitioning when order per key matters.",
            "Shutdown is part of the design: stop intake, one pill per consumer, drain within the grace period, and account for every accepted item (`accepted == handled + failed + lost`). Consumer loops must survive bad events, and nothing should be able to end them silently.",
            "Next comes CopyOnWriteArrayList and CopyOnWriteArraySet: concurrent collections that make reads free by copying the whole array on every write, and the listener lists and configuration snapshots where that trade is exactly right.",
          ],
        },
      ],
    },
  ],
};
