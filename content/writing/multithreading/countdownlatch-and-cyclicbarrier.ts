import type { Lesson } from "../types";

export const countDownLatchAndCyclicBarrier: Lesson = {
  slug: "countdownlatch-and-cyclicbarrier",
  date: "2026-11-14",
  title: "CountDownLatch and CyclicBarrier",
  description:
    "The two classic coordination gates of java.util.concurrent on JDK 21, taken apart and measured: CountDownLatch as a thin wrapper over AQS shared mode (its state int is the count, its four parked waiters woke in queue order within 64 to 143 microseconds), why it is one-shot, await with a timeout and countDown in finally (a loader that threw without counting down kept startup waiting until the 2 second timeout), the start-gate pattern that made a racy counter fail in 157 of 200 test runs instead of 14, CyclicBarrier built from a ReentrantLock, a Condition and a Generation object read through javap and reflection, the barrier action that runs in the last thread to arrive, BrokenBarrierException from timeouts, interrupts, reset and a throwing action, what each looks like in jcmd thread dumps and JFR, latch vs barrier vs join vs CompletableFuture.allOf, and a surge-pricing job in a ride-hailing backend whose barrier broke on one slow database call and never published again.",
  tags: ["Multithreading", "CountDownLatch", "CyclicBarrier", "Concurrency"],
  sections: [
    {
      title: "What CountDownLatch and CyclicBarrier Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, ConcurrentLinkedQueue, ConcurrentLinkedDeque and ConcurrentSkipListMap, finished the concurrent collections: structures that let threads share data safely. This phase is about something different: letting threads **wait for each other** at the right moment. A `CountDownLatch` is a counter that threads can wait on until it reaches zero: \"don't start serving requests until the three caches are loaded\". A `CyclicBarrier` is a meeting point for a fixed group of threads: \"no zone worker starts tick 5 until all four have finished tick 4\".",
        },
        {
          type: "paragraph",
          text: "They look similar, and interviewers love asking for the difference, but they solve opposite problems. With a latch, the threads that **wait** and the threads that **count down** are usually different; the counters never block, and once the count reaches zero the latch stays open forever. With a barrier, the same threads both arrive and wait, nobody passes until everyone has arrived, and then the barrier resets itself for the next round. A latch is one-shot; a barrier is cyclic. That one difference decides which one a problem needs.",
        },
        {
          type: "paragraph",
          text: "This lesson measures both on JDK 21: the latch's AQS state and wait queue (building on the AQS internals from ReentrantLock, ReadWriteLock, StampedLock and AQS), the barrier's lock, condition and generation object, what breaks a barrier and how that failure spreads to every party, how each looks in a thread dump, and when a plain `join()` or `CompletableFuture.allOf` is the better tool.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Both classes come from Doug Lea's `EDU.oswego.cs.dl.util.concurrent` library of the late 1990s, which had a `CountDown` and a `CyclicBarrier` long before they were standardised. They arrived in Java 5 with JSR 166 and `java.util.concurrent`. Before that, the same coordination was written by hand with `synchronized`, a counter, `wait()` and `notifyAll()`, and getting the spurious-wakeup loop, the lost notification and the interrupt handling right every time was exactly what the library was meant to end. Brian Goetz's *Java Concurrency in Practice* (2006) popularised the two-latch start gate used for timing tests later in this lesson.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`CountDownLatch`, `CyclicBarrier`, `BrokenBarrierException`, `TimeUnit` timeouts (JSR 166)", "Standard gates replace hand-written `wait`/`notifyAll` counters"],
            ["Java 5 (2004)", "`CountDownLatch` built on `AbstractQueuedSynchronizer` in shared mode", "`await` is a shared acquire, `countDown` a shared release"],
            ["Java 7 (2011)", "`Phaser`", "A reusable barrier with a changing number of parties (next lesson)"],
            ["Java 8 (2014)", "`CompletableFuture.allOf`", "Waiting for N results without blocking a thread per task"],
            ["Java 14 (2020)", "AQS and `ConditionObject` rewritten", "The `acquire(Node, ...)` and `ConditionNode.block` frames in this lesson's dumps"],
            ["Java 19 to 21 (2022 to 2023)", "Virtual threads; `ExecutorService` is `AutoCloseable` (Java 19)", "Both gates park virtual threads without pinning; try-with-resources waits for tasks"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Two kinds of waiting at a ride-hailing company's office.",
        },
        {
          type: "list",
          items: [
            "**A `CountDownLatch` is the morning launch checklist with three boxes**: zones loaded, fare rules loaded, driver index built. The duty manager waits by the board. Each engineer ticks a box and walks away; they don't wait for anyone. When the last box is ticked, the manager opens the doors, and anyone who walks up to the board later sees all boxes ticked and goes straight in. Nobody un-ticks the boxes for tomorrow: tomorrow gets a new board.",
            "**`await` with a timeout is the manager saying \"if the boxes aren't ticked by 9:05, I open anyway in degraded mode and call someone\".** An engineer who goes home sick without ticking the box (an exception before `countDown`) leaves the manager waiting forever unless there's a deadline.",
            "**A `CyclicBarrier` is the four zone leads who meet every hour.** Nobody leaves the meeting room until all four have arrived. The last one to arrive writes the summary on the whiteboard (the barrier action), then everyone leaves together, and the same room is used again next hour.",
            "**A broken barrier is one lead who never shows up.** The others wait a while, then give up; and once the meeting is called off, everyone who arrives later is told \"cancelled\" at the door, until someone officially reschedules (`reset()`).",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real meeting can start without one person, but a `CyclicBarrier` has no quorum: it needs exactly `parties` arrivals, every round. And a real checklist knows **who** ticked each box. A latch only knows how many ticks are left; it can't tell which loader failed to count down, which is why the examples below keep a separate record of each outcome.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/countdownlatch-and-cyclicbarrier-gates.svg",
          alt: "Two panels. Left, CountDownLatch(3): a CountDownLatch$Sync box (an AQS in shared mode) where volatile int state is the count, await calls acquireSharedInterruptibly(1) and countDown calls releaseShared(1), a CAS of state minus one. Below it, state boxes 3, 2, 1 and 0 linked by countDown arrows, then four parked waiters in the AQS queue, waiter-0 to waiter-3, woken in order 64, 113, 134 and 143 microseconds after the last countDown, each unparking the next; at 0 the latch stays open, countDown at 0 does nothing and there is no reset. Right, CyclicBarrier(3, action): a box with ReentrantLock lock, Condition trip, int parties and count, Runnable barrierCommand and a Generation object with a boolean broken. Three arrivals: the first leaves count 2 and returns 2, the second count 1 and returns 1, the last count 0 and returns 0; earlier arrivals release the lock and park on the Condition. The last thread runs barrierCommand, then nextGeneration: signalAll, count reset to parties, a new Generation. A red box: a timeout, interrupt, reset or a throwing action calls breakBarrier, which sets broken and signals all, so everyone else gets BrokenBarrierException. Bottom: in a thread dump both are WAITING (parking); latch waiters park on a CountDownLatch$Sync under acquireSharedInterruptibly and CountDownLatch.await, barrier waiters park on an AbstractQueuedSynchronizer$ConditionObject under ConditionObject.await, CyclicBarrier.dowait and CyclicBarrier.await.",
          caption: "A latch is an AQS counter that opens once; a barrier is a lock, a condition and a generation that open and reset every round.",
        },
        {
          type: "heading",
          text: "The two side by side",
        },
        {
          type: "table",
          headers: ["", "CountDownLatch", "CyclicBarrier"],
          rows: [
            ["Who waits", "Any threads calling `await()`, usually not the ones counting", "The parties themselves: each `await()` is both an arrival and a wait"],
            ["Who signals", "Any code calling `countDown()`, which never blocks", "The last party to arrive"],
            ["Count is", "Events (one thread may count down many times)", "Threads (each party arrives once per round)"],
            ["After opening", "Stays open forever: one-shot, no reset", "Resets itself for the next round (a new `Generation`)"],
            ["Action on open", "None", "Optional `Runnable` run by the last arriving thread before anyone is released"],
            ["Failure model", "None: a missing `countDown` just means waiting forever (or until the timeout)", "Broken: a timeout, interrupt, `reset()` or a throwing action breaks the round for all parties"],
            ["Built on", "AQS shared mode, `state` = remaining count", "`ReentrantLock` + `Condition` + `int count` + `Generation`"],
            ["Waiting threads in a dump", "`WAITING (parking)` on `CountDownLatch$Sync`", "`WAITING (parking)` on `AbstractQueuedSynchronizer$ConditionObject`"],
          ],
        },
        {
          type: "heading",
          text: "The API",
        },
        {
          type: "table",
          headers: ["Method", "What it does", "Notes"],
          rows: [
            ["`new CountDownLatch(n)`", "Count starts at `n`", "`n < 0` throws `IllegalArgumentException: count < 0`; `n == 0` is already open"],
            ["`latch.await()` / `await(t, unit)`", "Waits until the count is 0", "Interruptible; the timed form returns `false` on timeout instead of throwing"],
            ["`latch.countDown()`", "Decrements, wakes all waiters at the 1-to-0 transition", "Never blocks; at 0 it does nothing"],
            ["`latch.getCount()`", "Current count", "A snapshot; useful in logs and `toString()` (`[Count = 3]`)"],
            ["`new CyclicBarrier(parties, action)`", "A gate for exactly `parties` threads", "`action` may be `null`; `parties <= 0` throws"],
            ["`barrier.await()` / `await(t, unit)`", "Arrive and wait for the rest; returns the arrival index", "`parties - 1` for the first arrival, 0 for the last; throws `BrokenBarrierException`, `InterruptedException`, `TimeoutException`"],
            ["`barrier.reset()`", "Breaks the current round, starts a new one", "Current waiters get `BrokenBarrierException`"],
            ["`isBroken()`, `getNumberWaiting()`, `getParties()`", "Inspection", "Each takes the barrier's lock briefly"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "CountDownLatch is a thin shell around AQS",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.CountDownLatch 'java.util.concurrent.CountDownLatch$Sync'
javap -c java.util.concurrent.CountDownLatch`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.CountDownLatch {
  private final java.util.concurrent.CountDownLatch$Sync sync;
  public java.util.concurrent.CountDownLatch(int);
  public void await() throws java.lang.InterruptedException;
  public boolean await(long, java.util.concurrent.TimeUnit) throws java.lang.InterruptedException;
  public void countDown();
  public long getCount();
  public java.lang.String toString();
}
final class java.util.concurrent.CountDownLatch$Sync extends java.util.concurrent.locks.AbstractQueuedSynchronizer {
  private static final long serialVersionUID;
  java.util.concurrent.CountDownLatch$Sync(int);
  int getCount();
  protected int tryAcquireShared(int);
  protected boolean tryReleaseShared(int);
}
  public void await() throws java.lang.InterruptedException;
    Code:
       0: aload_0
       1: getfield      #19                 // Field sync:Ljava/util/concurrent/CountDownLatch$Sync;
       4: iconst_1
       5: invokevirtual #25                 // Method java/util/concurrent/CountDownLatch$Sync.acquireSharedInterruptibly:(I)V
       8: return
  public boolean await(long, java.util.concurrent.TimeUnit) throws java.lang.InterruptedException;
    Code:
       ...
      10: invokevirtual #34                 // Method java/util/concurrent/CountDownLatch$Sync.tryAcquireSharedNanos:(IJ)Z
      13: ireturn
  public void countDown();
    Code:
       0: aload_0
       1: getfield      #19                 // Field sync:Ljava/util/concurrent/CountDownLatch$Sync;
       4: iconst_1
       5: invokevirtual #38                 // Method java/util/concurrent/CountDownLatch$Sync.releaseShared:(I)Z
       8: pop
       9: return`,
        },
        {
          type: "list",
          items: [
            "**One field.** The latch holds a `Sync`, and `Sync` extends `AbstractQueuedSynchronizer`. The count lives in AQS's `volatile int state`; there is no other storage. The constructor calls `setState(count)`.",
            "**`await()` is `acquireSharedInterruptibly(1)`.** AQS calls `Sync.tryAcquireShared`, which (as the bytecode in ReentrantLock, ReadWriteLock, StampedLock and AQS showed) returns 1 when `state == 0` and -1 otherwise. A negative result makes AQS enqueue the thread as a **shared** node and park it. The timed `await` calls `tryAcquireSharedNanos` and returns its `boolean`: a timeout is a normal `false`, not an exception.",
            "**`countDown()` is `releaseShared(1)` with the result thrown away** (the `pop` at offset 8). `tryReleaseShared` CASes `state` down by one in a retry loop and returns `true` only for the transition from 1 to 0. Only then does AQS start waking waiters. At 0, `tryReleaseShared` returns `false` immediately: the count can't go negative.",
            "**Nothing can increase `state` again.** No method calls `setState` after the constructor, so once the count is 0, every `tryAcquireShared` succeeds without queueing. That's the whole reason the latch is one-shot: it isn't a rule enforced somewhere, there is simply no code path back up.",
          ],
        },
        {
          type: "heading",
          text: "Watching the wait queue and the wake-up chain",
        },
        {
          type: "paragraph",
          text: "`CountDownLatch` doesn't expose its queue, but `Sync` is an AQS, and AQS has public `getQueueLength()` and `getQueuedThreads()`. I read the private `sync` field with reflection, queued four waiters in a known order, and timed when each one woke after the last `countDown()`:",
        },
        {
          type: "code",
          language: "java",
          title: "LatchQueue.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.locks.AbstractQueuedSynchronizer;

public class LatchQueue {
    // The latch's private Sync is an AQS; reading it needs --add-opens java.base/java.util.concurrent
    static AbstractQueuedSynchronizer sync(CountDownLatch latch) throws Exception {
        Field f = CountDownLatch.class.getDeclaredField("sync");
        f.setAccessible(true);
        return (AbstractQueuedSynchronizer) f.get(latch);
    }

    public static void main(String[] args) throws Exception {
        CountDownLatch ready = new CountDownLatch(3);
        AbstractQueuedSynchronizer sync = sync(ready);
        long[] wokeAt = new long[4];
        Thread[] waiters = new Thread[4];
        for (int i = 0; i < 4; i++) {
            int id = i;
            waiters[i] = Thread.ofPlatform().name("waiter-" + i).start(() -> {
                try {
                    ready.await();
                    wokeAt[id] = System.nanoTime();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            while (sync.getQueueLength() < i + 1) Thread.onSpinWait();   // queue them in a known order
        }
        System.out.println("queued (head first): " + new java.util.ArrayList<>(sync.getQueuedThreads()).reversed()
                .stream().map(Thread::getName).toList());
        System.out.println(ready + ", hasQueuedThreads=" + sync.hasQueuedThreads());

        ready.countDown();
        ready.countDown();
        System.out.println("after 2 countDowns: " + ready + ", still queued " + sync.getQueueLength());
        long opened = System.nanoTime();
        ready.countDown();                                   // 1 -> 0: releaseShared returns true
        for (Thread t : waiters) t.join();
        for (int i = 0; i < 4; i++) {
            System.out.printf("waiter-%d woke %4d us after the last countDown%n", i, (wokeAt[i] - opened) / 1_000);
        }
        ready.countDown();                                   // already 0: no effect
        System.out.println("extra countDown: " + ready + ", await returns at once: "
                + ready.await(0, java.util.concurrent.TimeUnit.SECONDS));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED LatchQueue",
        },
        {
          type: "output",
          text: `queued (head first): [waiter-0, waiter-1, waiter-2, waiter-3]
java.util.concurrent.CountDownLatch@58372a00[Count = 3], hasQueuedThreads=true
after 2 countDowns: java.util.concurrent.CountDownLatch@58372a00[Count = 1], still queued 4
waiter-0 woke   64 us after the last countDown
waiter-1 woke  113 us after the last countDown
waiter-2 woke  134 us after the last countDown
waiter-3 woke  143 us after the last countDown
extra countDown: java.util.concurrent.CountDownLatch@58372a00[Count = 0], await returns at once: true`,
        },
        {
          type: "list",
          items: [
            "**All four waiters sat in one FIFO queue.** `getQueuedThreads()` walks from the tail, so I reversed it: `waiter-0` is at the head. Two `countDown()`s changed `state` from 3 to 1 and woke nobody (`still queued 4`): `tryReleaseShared` returned `false` for both.",
            "**They woke in queue order, one after another.** The 1-to-0 `countDown()` unparked only the head waiter. When a shared acquire succeeds, AQS checks whether the next node is also shared and unparks it too (`signalNextIfShared`), so the release **propagates** down the queue: each woken thread wakes the next. In this run the gaps were 64, 113, 134 and 143 microseconds; in three other runs the first waiter woke after 63 to 420 microseconds and the last after 155 to 869 (the machine was busy with other benchmarks). With hundreds of waiters, the last one wakes noticeably later than the first.",
            "**The extra `countDown()` at 0 did nothing**, and `await(0, SECONDS)` on an open latch returned `true` at once: the shared acquire succeeded without touching the queue. `toString()` includes the count, which is useful in logs: `[Count = 0]`.",
          ],
        },
        {
          type: "heading",
          text: "CyclicBarrier is a lock, a condition and a generation",
        },
        {
          type: "paragraph",
          text: "`CyclicBarrier` is not an AQS subclass at all. `javap -p` shows what it is built from:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.CyclicBarrier 'java.util.concurrent.CyclicBarrier$Generation'`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.CyclicBarrier {
  private final java.util.concurrent.locks.ReentrantLock lock;
  private final java.util.concurrent.locks.Condition trip;
  private final int parties;
  private final java.lang.Runnable barrierCommand;
  private java.util.concurrent.CyclicBarrier$Generation generation;
  private int count;
  private void nextGeneration();
  private void breakBarrier();
  private int dowait(boolean, long) throws java.lang.InterruptedException, java.util.concurrent.BrokenBarrierException, java.util.concurrent.TimeoutException;
  public java.util.concurrent.CyclicBarrier(int, java.lang.Runnable);
  public java.util.concurrent.CyclicBarrier(int);
  public int getParties();
  public int await() throws java.lang.InterruptedException, java.util.concurrent.BrokenBarrierException;
  public int await(long, java.util.concurrent.TimeUnit) throws java.lang.InterruptedException, java.util.concurrent.BrokenBarrierException, java.util.concurrent.TimeoutException;
  public boolean isBroken();
  public void reset();
  public int getNumberWaiting();
}
class java.util.concurrent.CyclicBarrier$Generation {
  boolean broken;
  java.util.concurrent.CyclicBarrier$Generation();
}`,
        },
        {
          type: "paragraph",
          text: "A `ReentrantLock` protects `count`, a `Condition` called `trip` is where early arrivals wait, and a `Generation` object identifies the current round. `count` is a plain `int`, not volatile, because it is only touched while holding the lock. Both `await` methods call `dowait`, and its bytecode is the whole algorithm. This is `javap -c -p` output, trimmed, with the constant-pool comments shortened and my notes in brackets or after them:",
        },
        {
          type: "output",
          text: `  private int dowait(boolean, long) ...
       6: aload         4
       8: invokevirtual #37     // Method java/util/concurrent/locks/ReentrantLock.lock:()V
      11: aload_0
      12: getfield      #25     // Field generation:Ljava/util/concurrent/CyclicBarrier$Generation;
      15: astore        5       // g = generation (remember MY round)
      17: aload         5
      19: getfield      #29     // Field java/util/concurrent/CyclicBarrier$Generation.broken:Z
      22: ifeq          33
      25: new           #41     // class java/util/concurrent/BrokenBarrierException
      ...
      33: invokestatic  #44     // Method java/lang/Thread.interrupted:()Z
      36: ifeq          51
      40: invokevirtual #50     // Method breakBarrier:()V
      43: new           #53     // class java/lang/InterruptedException
      ...
      51: aload_0
      52: dup
      53: getfield      #17     // Field count:I
      56: iconst_1
      57: isub
      58: dup_x1
      59: putfield      #17     // Field count:I        (index = --count)
      64: iload         6
      66: ifne          114     // not the last one: go and wait
      69: aload_0
      70: getfield      #56     // Field barrierCommand:Ljava/lang/Runnable;
      ...
      82: invokeinterface #60,  1   // InterfaceMethod java/lang/Runnable.run:()V
      ...
      93: invokevirtual #50     // Method breakBarrier:()V   (only if run() threw)
      ...
     100: invokevirtual #67     // Method nextGeneration:()V
     103: iconst_0
     ...
     113: ireturn               // the last arrival returns 0
     114: iload_1
     115: ifne          130
     122: invokeinterface #73,  1   // InterfaceMethod java/util/concurrent/locks/Condition.await:()V
     ...
     141: invokeinterface #76,  3   // InterfaceMethod java/util/concurrent/locks/Condition.awaitNanos:(J)J
     ...
     184: getfield      #29     // Field java/util/concurrent/CyclicBarrier$Generation.broken:Z
     187: ifeq          198
     190: new           #41     // class java/util/concurrent/BrokenBarrierException
     ...
     201: getfield      #25     // Field generation:Ljava/util/concurrent/CyclicBarrier$Generation;
     204: if_acmpeq     219     // still my generation? keep waiting
     ...
     218: ireturn               // a new generation: my round finished, return my index
     219: iload_1
     ...
     230: invokevirtual #50     // Method breakBarrier:()V
     233: new           #87     // class java/util/concurrent/TimeoutException`,
        },
        {
          type: "list",
          items: [
            "**Everything happens under `lock`** (offset 8). That's why `count` doesn't need to be volatile or atomic, and why `isBroken()`, `getNumberWaiting()` and `reset()` all take the lock too.",
            "**The arrival index is `--count`** (offsets 51 to 59). The first of three parties gets 2, the second 1, the last 0. The last arrival (offset 66) runs `barrierCommand` **in its own thread, while holding the lock**, then calls `nextGeneration()` and returns 0. If the command throws, offset 93 calls `breakBarrier()` before rethrowing, so the other parties don't wait forever.",
            "**Earlier arrivals wait on `trip`** (offsets 122 and 141). `Condition.await` releases the lock while parked and re-acquires it before returning, which is how other parties can get in to decrement `count`.",
            "**After waking, a thread compares generations** (offset 204). If `generation` has changed, its round completed and it returns its index. If its own generation is broken (offset 187), it throws `BrokenBarrierException`. If neither (a spurious wakeup), it loops. With a timeout, an expired wait calls `breakBarrier()` and throws `TimeoutException` (offset 233).",
            "**`nextGeneration()` and `breakBarrier()` are tiny:** `nextGeneration` is `trip.signalAll(); count = parties; generation = new Generation();`. `breakBarrier` is `generation.broken = true; count = parties; trip.signalAll();`. A broken generation stays broken; only `reset()`, which calls both, starts a fresh one.",
            "**`await()` without a timeout wraps an impossible `TimeoutException` in `Error`.** Its bytecode calls `dowait(false, 0)` with an exception handler that does `new Error(e)`. It can't happen, but it shows that both forms share one implementation.",
          ],
        },
        {
          type: "heading",
          text: "Watching generations change",
        },
        {
          type: "paragraph",
          text: "To see the generation object being replaced, I read `generation` and `count` with reflection while three threads arrived 50 ms apart, for two rounds:",
        },
        {
          type: "code",
          language: "java",
          title: "BarrierGenerations.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.CyclicBarrier;

public class BarrierGenerations {
    // Private fields of CyclicBarrier (needs --add-opens java.base/java.util.concurrent)
    static Object field(CyclicBarrier b, String name) throws Exception {
        Field f = CyclicBarrier.class.getDeclaredField(name);
        f.setAccessible(true);
        return f.get(b);
    }

    static String describe(CyclicBarrier b) throws Exception {
        Object gen = field(b, "generation");
        return "generation@" + Integer.toHexString(System.identityHashCode(gen)) + " count=" + field(b, "count");
    }

    public static void main(String[] args) throws Exception {
        CyclicBarrier[] holder = new CyclicBarrier[1];
        holder[0] = new CyclicBarrier(3, () -> {
            try {
                System.out.println("  action runs in " + Thread.currentThread().getName() + ", " + describe(holder[0]));
            } catch (Exception e) { throw new RuntimeException(e); }
        });
        CyclicBarrier barrier = holder[0];
        System.out.println("new barrier:  " + describe(barrier));

        for (int round = 1; round <= 2; round++) {
            Thread[] ts = new Thread[3];
            for (int i = 0; i < 3; i++) {
                String name = "r" + round + "-worker-" + i;
                ts[i] = Thread.ofPlatform().name(name).start(() -> {
                    try {
                        int index = barrier.await();          // parties-1 for the first arrival, 0 for the last
                        System.out.println("  " + Thread.currentThread().getName() + " arrival index " + index);
                    } catch (Exception e) { throw new RuntimeException(e); }
                });
                Thread.sleep(50);                              // arrive one by one, in order
                if (i < 2) System.out.println("  after " + name + " arrives: waiting=" + barrier.getNumberWaiting() + ", " + describe(barrier));
            }
            for (Thread t : ts) t.join();
            System.out.println("after round " + round + ": " + describe(barrier) + ", broken=" + barrier.isBroken());
        }
    }
}`,
        },
        {
          type: "output",
          text: `new barrier:  generation@13221655 count=3
  after r1-worker-0 arrives: waiting=1, generation@13221655 count=2
  after r1-worker-1 arrives: waiting=2, generation@13221655 count=1
  action runs in r1-worker-2, generation@13221655 count=0
  r1-worker-0 arrival index 2
  r1-worker-2 arrival index 0
  r1-worker-1 arrival index 1
after round 1: generation@312b1dae count=3, broken=false
  after r2-worker-0 arrives: waiting=1, generation@312b1dae count=2
  after r2-worker-1 arrives: waiting=2, generation@312b1dae count=1
  action runs in r2-worker-2, generation@312b1dae count=0
  r2-worker-2 arrival index 0
  r2-worker-0 arrival index 2
  r2-worker-1 arrival index 1
after round 2: generation@65b3120a count=3, broken=false`,
        },
        {
          type: "list",
          items: [
            "**`count` counts down from `parties` within one generation** (3, 2, 1, 0) and `getNumberWaiting()` is `parties - count`.",
            "**The barrier action ran in the last thread to arrive**, `r1-worker-2` and then `r2-worker-2`, while the generation was still the old one and `count` was 0. It runs before anyone is released, so it can safely read what all parties wrote: every party's write happens-before its `await`, which happens-before the action, which happens-before every party's return from `await`.",
            "**Arrival indexes were deterministic** (2, 1, 0 in arrival order), but the order of the `arrival index` lines varied between runs: the last thread returns without parking and often prints first, while the others still have to wake up and re-acquire the lock.",
            "**After each round the generation was a new object** (`13221655`, then `312b1dae`, then `65b3120a`) with `count` back at 3. Reuse is literally \"replace the round marker and reset the counter\".",
          ],
        },
        {
          type: "heading",
          text: "Both gates in a thread dump",
        },
        {
          type: "paragraph",
          text: "Two threads waiting on a latch (one with a timeout) and two parties of a three-party barrier, captured with `jcmd`:",
        },
        {
          type: "code",
          language: "java",
          title: "ParkedOnGates.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.TimeUnit;

public class ParkedOnGates {
    public static void main(String[] args) throws Exception {
        CountDownLatch cachesWarm = new CountDownLatch(3);
        CyclicBarrier roundDone = new CyclicBarrier(3);

        Thread.ofPlatform().name("http-server").start(() -> {
            try { cachesWarm.await(); } catch (InterruptedException e) { }
        });
        Thread.ofPlatform().name("health-check").start(() -> {
            try { cachesWarm.await(5, TimeUnit.MINUTES); } catch (InterruptedException e) { }
        });
        for (String zone : new String[] {"SALT-LAKE", "NEW-TOWN"}) {
            Thread.ofPlatform().name("surge-" + zone).start(() -> {
                try { roundDone.await(); } catch (Exception e) { }
            });
        }
        Thread.sleep(300);
        System.out.println(cachesWarm + ", barrier waiting " + roundDone.getNumberWaiting() + "/" + roundDone.getParties());
        Thread.sleep(60_000);                        // time for: jcmd ParkedOnGates Thread.print -l
        System.exit(0);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java ParkedOnGates &
jcmd ParkedOnGates Thread.print -l`,
        },
        {
          type: "output",
          text: `java.util.concurrent.CountDownLatch@511d50c0[Count = 3], barrier waiting 2/3

"http-server" #20 [1542300] prio=5 os_prio=0 cpu=0.39ms elapsed=2.36s tid=0x00007ff02c17c410 nid=1542300 waiting on condition  [0x00007ff010978000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008df14b40> (a java.util.concurrent.CountDownLatch$Sync)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:788)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireSharedInterruptibly(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1133)
	at java.util.concurrent.CountDownLatch.await(java.base@21.0.13.0.3/CountDownLatch.java:230)
	at ParkedOnGates.lambda$main$0(ParkedOnGates.java:11)
	at ParkedOnGates$$Lambda/0x00007fefb4000a08.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

"health-check" #21 [1542301] prio=5 os_prio=0 cpu=0.30ms elapsed=2.35s tid=0x00007ff02c17d5f0 nid=1542301 waiting on condition  [0x00007ff010878000]
   java.lang.Thread.State: TIMED_WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008df14b40> (a java.util.concurrent.CountDownLatch$Sync)
	at java.util.concurrent.locks.LockSupport.parkNanos(java.base@21.0.13.0.3/LockSupport.java:269)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:790)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.tryAcquireSharedNanos(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1160)
	at java.util.concurrent.CountDownLatch.await(java.base@21.0.13.0.3/CountDownLatch.java:276)
	at ParkedOnGates.lambda$main$1(ParkedOnGates.java:14)
	at ParkedOnGates$$Lambda/0x00007fefb4000c30.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

"surge-SALT-LAKE" #22 [1542302] prio=5 os_prio=0 cpu=1.44ms elapsed=2.35s tid=0x00007ff02c1802d0 nid=1542302 waiting on condition  [0x00007ff010778000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008df14cf8> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:371)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionNode.block(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:519)
	at java.util.concurrent.ForkJoinPool.unmanagedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3780)
	at java.util.concurrent.ForkJoinPool.managedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3725)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1746)
	at java.util.concurrent.CyclicBarrier.dowait(java.base@21.0.13.0.3/CyclicBarrier.java:236)
	at java.util.concurrent.CyclicBarrier.await(java.base@21.0.13.0.3/CyclicBarrier.java:364)
	at ParkedOnGates.lambda$main$2(ParkedOnGates.java:18)
	at ParkedOnGates$$Lambda/0x00007fefb4001800.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

"surge-NEW-TOWN" ... the same frames, parking on the same <0x000000008df14cf8>`,
        },
        {
          type: "list",
          items: [
            "**Latch waiters park on the `CountDownLatch$Sync`**, under `AbstractQueuedSynchronizer.acquireSharedInterruptibly` (or `tryAcquireSharedNanos` for the timed `await`, which shows as `TIMED_WAITING (parking)` and `parkNanos`). Both point at the same address, `0x...8df14b40`, which is how to group a dump's threads by latch.",
            "**Barrier waiters park on an `AbstractQueuedSynchronizer$ConditionObject`**, not on anything named `CyclicBarrier`. The frame that identifies them is `CyclicBarrier.dowait`. A search for \"CyclicBarrier\" in the `parking to wait for` lines finds nothing.",
            "**No owner, anywhere.** Neither gate has an owner thread, so `Locked ownable synchronizers` is `None` for all of them and the JVM's deadlock detector never reports a latch or barrier that will never open. A thread stuck here forever looks exactly like a thread that will be released in a second; only a second dump, or the count, tells them apart.",
            "**`WAITING (parking)`, never `BLOCKED`.** The barrier's `ReentrantLock` is held only for a few instructions per arrival; a thread contending for it would also show `WAITING (parking)`, on a `ReentrantLock$NonfairSync`.",
          ],
        },
        {
          type: "heading",
          text: "How long threads waited, from JFR",
        },
        {
          type: "paragraph",
          text: "A thread dump shows where threads wait, not for how long. JFR's `jdk.ThreadPark` event records each park longer than a threshold (20 ms in the `profile` settings) with the class of the object parked on. I made one thread wait on a latch for about 250 ms and two parties wait on a barrier for about 400 ms:",
        },
        {
          type: "code",
          language: "java",
          title: "GateParks.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;

public class GateParks {
    public static void main(String[] args) throws Exception {
        CountDownLatch warm = new CountDownLatch(1);
        CyclicBarrier tick = new CyclicBarrier(3);
        Thread waiter = Thread.ofPlatform().name("http-server").start(() -> {
            try { warm.await(); } catch (InterruptedException e) { }
        });
        Thread[] zones = new Thread[2];
        for (int i = 0; i < 2; i++) {
            zones[i] = Thread.ofPlatform().name("surge-" + i).start(() -> {
                try { tick.await(); } catch (Exception e) { }
            });
        }
        Thread.sleep(250);
        warm.countDown();          // the latch waiter parked about 250 ms
        Thread.sleep(150);
        tick.await();              // main is the third party: the two zone threads parked about 400 ms
        waiter.join();
        for (Thread z : zones) z.join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:StartFlightRecording:filename=parks.jfr,settings=profile GateParks
jfr print --events jdk.ThreadPark parks.jfr`,
        },
        {
          type: "output",
          text: `jdk.ThreadPark {
  startTime = 09:06:00.271 (2026-11-14)
  duration = 294 ms
  parkedClass = java.util.concurrent.CountDownLatch$Sync (classLoader = bootstrap)
  timeout = N/A
  until = N/A
  address = 0x8C818230
  eventThread = "http-server" (javaThreadId = 24)
  stackTrace = [
    jdk.internal.misc.Unsafe.park(boolean, long)
    java.util.concurrent.locks.LockSupport.park(Object) line: 221
    java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(AbstractQueuedSynchronizer$Node, int, boolean, boolean, boolean, long) line: 788
    java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireSharedInterruptibly(int) line: 1133
    java.util.concurrent.CountDownLatch.await() line: 230
    ...
  ]
}
jdk.ThreadPark {
  startTime = 09:06:00.293 (2026-11-14)
  duration = 440 ms
  parkedClass = java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject (classLoader = bootstrap)
  ...
  eventThread = "surge-0" (javaThreadId = 25)
  ...
}
jdk.ThreadPark {
  startTime = 09:06:00.293 (2026-11-14)
  duration = 440 ms
  parkedClass = java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject (classLoader = bootstrap)
  ...
  eventThread = "surge-1" (javaThreadId = 26)
  ...
}`,
        },
        {
          type: "list",
          items: [
            "**One event per park, with its duration and the class waited on.** In production, `jfr print --events jdk.ThreadPark` (or JDK Mission Control's \"Thread Park\" view, grouped by `parkedClass`) answers \"which latch or barrier did my request threads spend their time on?\", which no single thread dump can.",
            "**The durations were longer than the sleeps**, 294 and 440 ms instead of 250 and 400, in all three recordings, and about 300 ms without JFR too: the waiter parked as soon as it started, before `main` had started the other threads and begun its own `sleep`. JFR measures the park itself, which is what matters.",
            "**Barrier parties appear as `ConditionObject` parks**, again with no mention of `CyclicBarrier` except deeper in the stack trace (cut at five frames by default).",
          ],
        },
      ],
    },
    {
      title: "CountDownLatch: One-Shot, Timeouts and countDown in finally",
      blocks: [
        {
          type: "paragraph",
          text: "The most common use of a latch: a service starts three loaders in parallel and must not accept traffic until all three are done. The obvious version counts down after a successful load. Here one loader throws:",
        },
        {
          type: "code",
          language: "java",
          title: "ServiceStartup.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class ServiceStartup {
    record Loader(String name, long millis, boolean fails) { }

    static final List<Loader> LOADERS = List.of(
            new Loader("zones", 120, false),
            new Loader("fare-rules", 200, true),          // throws while loading
            new Loader("driver-index", 300, false));

    static void load(Loader l) throws InterruptedException {
        Thread.sleep(l.millis());
        if (l.fails()) throw new IllegalStateException(l.name() + ": fare table missing for NEW-TOWN");
    }

    // countDown only on success: a failing loader never counts down
    static void startBuggy() throws InterruptedException {
        CountDownLatch ready = new CountDownLatch(LOADERS.size());
        for (Loader l : LOADERS) {
            Thread.ofPlatform().daemon().name("load-" + l.name()).start(() -> {
                try {
                    load(l);
                    ready.countDown();
                } catch (Exception e) {
                    System.out.println("  " + Thread.currentThread().getName() + " failed: " + e.getMessage());
                }
            });
        }
        long t = System.nanoTime();
        boolean open = ready.await(2, TimeUnit.SECONDS);   // without the timeout, this waits forever
        System.out.printf("buggy: await returned %b after %d ms, count still %d%n",
                open, (System.nanoTime() - t) / 1_000_000, ready.getCount());
    }

    // countDown in finally, and the outcome recorded per loader
    static void startFixed() throws InterruptedException {
        CountDownLatch done = new CountDownLatch(LOADERS.size());
        Map<String, String> outcome = new ConcurrentHashMap<>();
        for (Loader l : LOADERS) {
            Thread.ofPlatform().daemon().name("load-" + l.name()).start(() -> {
                try {
                    load(l);
                    outcome.put(l.name(), "ok");
                } catch (Exception e) {
                    outcome.put(l.name(), "FAILED " + e.getMessage());
                } finally {
                    done.countDown();                      // always, exactly once per loader
                }
            });
        }
        long t = System.nanoTime();
        boolean allFinished = done.await(2, TimeUnit.SECONDS);
        System.out.printf("fixed: await returned %b after %d ms%n", allFinished, (System.nanoTime() - t) / 1_000_000);
        LOADERS.forEach(l -> System.out.println("  " + l.name() + " -> " + outcome.get(l.name())));
        boolean healthy = allFinished && outcome.values().stream().allMatch("ok"::equals);
        System.out.println("  ready to serve: " + healthy);
    }

    public static void main(String[] args) throws Exception {
        startBuggy();
        startFixed();
    }
}`,
        },
        {
          type: "output",
          text: `  load-fare-rules failed: fare-rules: fare table missing for NEW-TOWN
buggy: await returned false after 2000 ms, count still 1
fixed: await returned true after 300 ms
  zones -> ok
  fare-rules -> FAILED fare-rules: fare table missing for NEW-TOWN
  driver-index -> ok
  ready to serve: false`,
        },
        {
          type: "list",
          items: [
            "**A `countDown` that's skipped is gone for good.** `fare-rules` threw before reaching `ready.countDown()`, so the count stopped at 1. Nothing can ever bring it to 0. With a plain `await()`, startup would hang forever, with the waiting thread `WAITING (parking)` and no error anywhere except one log line from a loader thread. Here the 2-second timeout returned `false` with the count still at 1.",
            "**`countDown()` belongs in `finally`,** exactly like `unlock()`. The fixed version counted down in all three loaders and the latch opened after 300 ms, the time of the slowest loader. But opening the latch only means \"every loader finished\", not \"every loader succeeded\": the latch has no way to carry a result. The fixed version records each outcome in a map and decides readiness from it: `ready to serve: false`, with the reason.",
            "**Always pass a timeout on startup and request paths.** `await(timeout, unit)` returns `false` instead of throwing, so it's easy to forget to check it. A `boolean` that's ignored turns a missing `countDown` back into a silent hang, only shorter.",
            "**One-shot is a feature here.** The startup gate must stay open after startup: a health check that calls `await()` an hour later must pass immediately, and it does. If something needs to happen again (reload caches every hour), it needs a new latch each time, not a reset.",
          ],
        },
      ],
    },
    {
      title: "The Start Gate Pattern for Tests",
      blocks: [
        {
          type: "paragraph",
          text: "A concurrency test that starts eight threads with a loop isn't very concurrent: each `start()` takes tens of microseconds, so the first thread may have finished its work before the last one starts. The fix from *Java Concurrency in Practice* is a **start gate**: every worker counts down a `ready` latch, then waits on a `start` latch of 1, which the test opens once all workers are parked there. A third latch, `done`, tells the test when all have finished. I ran a deliberately racy counter (`volatile int`, incremented with `++`) both ways, 200 times each:",
        },
        {
          type: "code",
          language: "java",
          title: "StartGate.java",
          code: `import java.util.concurrent.CountDownLatch;

public class StartGate {
    static volatile int bookings;                       // volatile, but ++ is still a race

    // Starts n threads that each do 'perThread' unsafe increments; returns the lost updates
    static int run(int n, int perThread, boolean useGate) throws InterruptedException {
        bookings = 0;
        CountDownLatch ready = new CountDownLatch(n);   // every worker is running
        CountDownLatch start = new CountDownLatch(1);   // the gate: opened once by main
        CountDownLatch done = new CountDownLatch(n);    // every worker has finished
        for (int i = 0; i < n; i++) {
            Thread.ofPlatform().start(() -> {
                try {
                    if (useGate) {
                        ready.countDown();
                        start.await();
                    }
                    for (int k = 0; k < perThread; k++) bookings++;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        if (useGate) {
            ready.await();                              // all threads are parked at the gate
            start.countDown();                          // release them together
        }
        done.await();
        return n * perThread - bookings;
    }

    public static void main(String[] args) throws Exception {
        int n = 8, perThread = 1_000, trials = 200;
        for (boolean gate : new boolean[] {false, true}) {
            int caught = 0;
            long lost = 0;
            for (int t = 0; t < trials; t++) {
                int l = run(n, perThread, gate);
                if (l > 0) caught++;
                lost += l;
            }
            System.out.printf("%-10s race caught in %3d of %d trials, %,7d updates lost in total%n",
                    gate ? "start gate" : "no gate", caught, trials, lost);
        }
    }
}`,
        },
        {
          type: "output",
          text: `no gate    race caught in  14 of 200 trials,  10,250 updates lost in total
start gate race caught in 157 of 200 trials, 349,328 updates lost in total`,
        },
        {
          type: "list",
          items: [
            "**Same bug, same test, 11 times more likely to fail.** Without a gate, the race showed up in 14 of 200 runs; with the gate, in 157. Over three more runs: 6 to 19 failures without the gate and 134 to 147 with it. I also ran the gate first in case JIT warm-up favoured the second loop: 104 and 132 with the gate against 3 and 6 without. A concurrency test that passes 93% of the time on broken code is worse than no test, because it creates false confidence.",
            "**Why it works:** with the gate, all eight threads are created, started and parked before any of them does work. `start.countDown()` releases them within microseconds of each other (the wake-up chain measured above), so their loops genuinely overlap.",
            "**Why `volatile`:** with a plain `int`, the JIT compiled the loop into something close to one addition of 1,000 (the hoisting from volatile, Visibility and the Java Memory Model), leaving almost no window for the race. In my runs, a plain `int` failed only 2 to 10 times in 200 with or without the gate. The bug was still there; the test just couldn't see it. Tools built for this (jcstress, covered in Finding and Testing Concurrency Bugs) control such effects properly.",
            "**`done` uses `finally`,** so a worker that throws still counts down, and the test reports a failure instead of hanging the build.",
          ],
        },
      ],
    },
    {
      title: "CyclicBarrier: Barrier Action and Reuse",
      blocks: [
        {
          type: "paragraph",
          text: "A barrier fits work that proceeds in lockstep rounds, where each round needs every worker's result from the previous one. Three zone workers compute demand over supply for their zone each tick; the barrier action, run once per round, turns the three ratios into surge multipliers and publishes them:",
        },
        {
          type: "code",
          language: "java",
          title: "SurgeRounds.java",
          code: `import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.atomic.AtomicIntegerArray;

public class SurgeRounds {
    static final List<String> ZONES = List.of("SALT-LAKE", "NEW-TOWN", "HOWRAH");
    // demand[round][zone] and supply[round][zone] for three one-minute ticks
    static final int[][] DEMAND = {{40, 25, 10}, {55, 30, 12}, {80, 26, 9}};
    static final int[][] SUPPLY = {{35, 30, 15}, {35, 28, 14}, {32, 30, 15}};

    public static void main(String[] args) throws Exception {
        AtomicIntegerArray ratioPct = new AtomicIntegerArray(ZONES.size());  // demand/supply per zone, this round
        int[] round = {0};
        // Runs once per round, in the last thread to arrive, before anyone is released
        Runnable publish = () -> {
            StringBuilder sb = new StringBuilder("round " + (++round[0]) + " surge:");
            for (int z = 0; z < ZONES.size(); z++) {
                int pct = ratioPct.get(z);
                double multiplier = pct <= 100 ? 1.0 : Math.min(2.0, 1.0 + (pct - 100) / 100.0);
                sb.append(String.format(" %s x%.1f", ZONES.get(z), multiplier));
            }
            System.out.println(sb);
        };
        CyclicBarrier tick = new CyclicBarrier(ZONES.size(), publish);

        Thread[] workers = new Thread[ZONES.size()];
        for (int z = 0; z < ZONES.size(); z++) {
            int zone = z;
            workers[z] = Thread.ofPlatform().name("zone-" + ZONES.get(z)).start(() -> {
                try {
                    for (int r = 0; r < DEMAND.length; r++) {
                        ratioPct.set(zone, DEMAND[r][zone] * 100 / SUPPLY[r][zone]);  // this zone's share of the work
                        tick.await();                                                  // wait for the other zones
                    }
                } catch (Exception e) {
                    System.out.println(Thread.currentThread().getName() + " stopped: " + e);
                }
            });
        }
        for (Thread w : workers) w.join();
        System.out.println("rounds published: " + round[0]);
    }
}`,
        },
        {
          type: "output",
          text: `round 1 surge: SALT-LAKE x1.1 NEW-TOWN x1.0 HOWRAH x1.0
round 2 surge: SALT-LAKE x1.6 NEW-TOWN x1.1 HOWRAH x1.0
round 3 surge: SALT-LAKE x2.0 NEW-TOWN x1.0 HOWRAH x1.0
rounds published: 3`,
        },
        {
          type: "list",
          items: [
            "**One barrier, three rounds.** Each worker's loop calls `tick.await()` once per round; the barrier resets itself after every trip, so there's no new object per round. The output was identical in every run, because the action runs only when all three ratios for the round are written.",
            "**The action sees every party's writes without extra synchronization.** The workers' `ratioPct.set` happen-before their `await`, and the barrier's lock makes those writes visible to the last thread, which runs the action. I used `AtomicIntegerArray` anyway, so the array is safe even if someone later reads it outside the action.",
            "**No worker starts round 2 until round 1 is published.** That's the point of the barrier, and also its cost: the round is as slow as the slowest worker, and every worker sits parked while the slowest one finishes. When rounds don't actually depend on each other, a barrier just adds waiting.",
            "**Keep the action short.** It runs while holding the barrier's lock and while every other party is parked. A 200 ms database write in the action makes every round 200 ms longer, for all parties.",
          ],
        },
      ],
    },
    {
      title: "Broken Barriers: Timeouts, Interrupts and reset",
      blocks: [
        {
          type: "paragraph",
          text: "A barrier's failure model is all-or-nothing: if one party can't complete the round, nobody can. I triggered each way of breaking a barrier and recorded what every party saw:",
        },
        {
          type: "code",
          language: "java",
          title: "BrokenBarrier.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class BrokenBarrier {
    static final long T0 = System.nanoTime();
    static long ms() { return (System.nanoTime() - T0) / 1_000_000; }

    // Each party sleeps 'delays[i]' ms, then calls await(timeoutMs) (or await() when timeoutMs < 0)
    static void scenario(String title, CyclicBarrier b, long[] delays, long timeoutMs, Runnable meanwhile)
            throws InterruptedException {
        System.out.println("== " + title);
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < delays.length; i++) {
            long delay = delays[i];
            String name = "zone-" + i;
            threads.add(Thread.ofPlatform().name(name).start(() -> {
                long start = 0;
                try {
                    Thread.sleep(delay);
                    start = ms();
                    if (timeoutMs >= 0) b.await(timeoutMs, TimeUnit.MILLISECONDS); else b.await();
                    System.out.printf("  %s passed%n", name);
                } catch (TimeoutException e) {
                    System.out.printf("  %s TimeoutException after %d ms%n", name, ms() - start);
                } catch (BrokenBarrierException e) {
                    System.out.printf("  %s BrokenBarrierException after %d ms waiting%n", name, ms() - start);
                } catch (InterruptedException e) {
                    System.out.printf("  %s InterruptedException%n", name);
                } catch (RuntimeException e) {
                    System.out.printf("  %s %s: %s%n", name, e.getClass().getSimpleName(), e.getMessage());
                }
            }));
        }
        meanwhile.run();
        for (Thread t : threads) t.join();
        System.out.println("  broken=" + b.isBroken() + ", waiting=" + b.getNumberWaiting());
    }

    public static void main(String[] args) throws Exception {
        // 1. one slow party: the first timeout breaks the barrier for everyone
        CyclicBarrier b1 = new CyclicBarrier(3);
        scenario("timeout: zone-2 arrives late", b1, new long[] {0, 0, 900}, 300, () -> { });
        try {
            b1.await(1, TimeUnit.SECONDS);
        } catch (Exception e) {
            System.out.println("  a later await on the broken barrier: " + e.getClass().getSimpleName() + " at once");
        }
        b1.reset();
        System.out.println("  after reset(): broken=" + b1.isBroken());

        // 2. interrupting one waiter breaks it too
        CyclicBarrier b2 = new CyclicBarrier(3);
        Thread[] victim = new Thread[1];
        scenario("interrupt one waiter", b2, new long[] {0, 0}, -1, () -> {
            sleep(200);
            Thread.getAllStackTraces().keySet().stream()
                    .filter(t -> t.getName().equals("zone-1")).forEach(t -> victim[0] = t);
            victim[0].interrupt();
        });

        // 3. reset() while parties are waiting
        CyclicBarrier b3 = new CyclicBarrier(3);
        scenario("reset() with 2 waiting", b3, new long[] {0, 0}, -1, () -> { sleep(200); b3.reset(); });

        // 4. the barrier action throws: the last thread gets the exception, the others BrokenBarrierException
        CyclicBarrier b4 = new CyclicBarrier(3, () -> { throw new IllegalStateException("surge table write failed"); });
        scenario("barrier action throws", b4, new long[] {0, 0, 100}, -1, () -> { });

        // 5. await with a zero timeout by a non-last party
        CyclicBarrier b5 = new CyclicBarrier(2);
        scenario("await(0 ms) while the other party is 100 ms away", b5, new long[] {0, 100}, 0, () -> { });
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `== timeout: zone-2 arrives late
  zone-1 BrokenBarrierException after 300 ms waiting
  zone-0 TimeoutException after 301 ms
  zone-2 BrokenBarrierException after 0 ms waiting
  broken=true, waiting=0
  a later await on the broken barrier: BrokenBarrierException at once
  after reset(): broken=false
== interrupt one waiter
  zone-1 InterruptedException
  zone-0 BrokenBarrierException after 208 ms waiting
  broken=true, waiting=0
== reset() with 2 waiting
  zone-0 BrokenBarrierException after 201 ms waiting
  zone-1 BrokenBarrierException after 201 ms waiting
  broken=false, waiting=0
== barrier action throws
  zone-2 IllegalStateException: surge table write failed
  zone-0 BrokenBarrierException after 101 ms waiting
  zone-1 BrokenBarrierException after 101 ms waiting
  broken=true, waiting=0
== await(0 ms) while the other party is 100 ms away
  zone-0 TimeoutException after 0 ms
  zone-1 BrokenBarrierException after 1 ms waiting
  broken=true, waiting=0`,
        },
        {
          type: "list",
          items: [
            "**A timeout breaks the barrier for everyone.** `zone-0` and `zone-1` both waited with a 300 ms timeout. Whichever timed out first (it varied between runs) got `TimeoutException` and called `breakBarrier()`; the other was woken by `signalAll` and got `BrokenBarrierException`. `zone-2`, arriving at 900 ms, got `BrokenBarrierException` immediately: a broken barrier stays broken, and a later `await` fails at once.",
            "**An interrupt breaks it too.** The interrupted waiter got `InterruptedException`, and the other party got `BrokenBarrierException`. The bytecode showed why: `dowait` calls `breakBarrier()` before throwing `InterruptedException`. That means `executor.shutdownNow()` on workers that share a barrier ends the whole round, not just one worker.",
            "**`reset()` with waiters breaks the current round.** Both waiting parties got `BrokenBarrierException`, and afterwards `isBroken()` was `false`, because `reset()` immediately starts a new generation. The waiters can't tell a `reset()` from a failure; both are \"your round is over\".",
            "**A throwing barrier action breaks it.** The last thread (`zone-2`) received the action's `IllegalStateException` itself; the other two got `BrokenBarrierException`. The action's exception is not passed to them, so it must be logged where it happens.",
            "**`await(0, unit)` from a non-last party breaks the barrier at once.** A zero or negative timeout means \"don't wait at all\", so `zone-0` timed out immediately and broke the barrier for `zone-1`, which arrived 100 ms later. A computed timeout that reaches 0 (a deadline that has already passed) does the same.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Recovering a broken barrier is hard",
          text: "`reset()` is only safe when no party is still running the broken round, and no single party knows that. If one thread calls `reset()` while another is about to call `await()` for the old round, the late thread joins the new round and the rounds go out of step. The Javadoc's advice is to create a new barrier for a new attempt. In practice, when a party can fail, a per-round coordinator (one task per worker per round, waited on with a deadline) is easier to get right; the production section below makes that change.",
        },
      ],
    },
    {
      title: "Latch vs Barrier vs join vs CompletableFuture.allOf",
      blocks: [
        {
          type: "paragraph",
          text: "Four ways to wait until three lookups (ETA, fare and promo) are done, with the promo lookup failing:",
        },
        {
          type: "code",
          language: "java",
          title: "FourWays.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

public class FourWays {
    static final List<String> PARTS = List.of("eta", "fare", "promo");

    // One lookup per part; "promo" fails, to see how each tool reports a failure
    static String lookup(String part) {
        try { Thread.sleep(part.equals("eta") ? 120 : 60); } catch (InterruptedException e) { throw new RuntimeException(e); }
        if (part.equals("promo")) throw new IllegalStateException("promo service 503");
        return "ok";
    }

    static Map<String, String> results() { return new ConcurrentHashMap<>(); }

    static void time(String label, Supplier<String> body) {
        long t = System.nanoTime();
        String r = body.get();
        System.out.printf("%-24s %4d ms  %s%n", label, (System.nanoTime() - t) / 1_000_000, r);
    }

    public static void main(String[] args) throws Exception {
        try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
            time("join()", () -> {
                Map<String, String> out = results();
                List<Thread> ts = PARTS.stream().map(p -> Thread.ofPlatform().start(() -> {
                    try { out.put(p, lookup(p)); } catch (RuntimeException e) { out.put(p, "FAILED " + e.getMessage()); }
                })).toList();
                for (Thread t : ts) { try { t.join(); } catch (InterruptedException e) { throw new RuntimeException(e); } }
                return out.toString();
            });

            time("CountDownLatch", () -> {
                Map<String, String> out = results();
                CountDownLatch done = new CountDownLatch(PARTS.size());
                for (String p : PARTS) pool.execute(() -> {
                    try { out.put(p, lookup(p)); }
                    catch (RuntimeException e) { out.put(p, "FAILED " + e.getMessage()); }
                    finally { done.countDown(); }
                });
                try { done.await(); } catch (InterruptedException e) { throw new RuntimeException(e); }
                return out.toString();
            });

            time("CyclicBarrier", () -> {
                Map<String, String> out = results();
                CountDownLatch finished = new CountDownLatch(1);
                CyclicBarrier allIn = new CyclicBarrier(PARTS.size(), () -> {   // runs in the last worker
                    out.put("merged-by", Thread.currentThread().getName());
                    finished.countDown();
                });
                for (String p : PARTS) pool.execute(() -> {
                    try { out.put(p, lookup(p)); } catch (RuntimeException e) { out.put(p, "FAILED " + e.getMessage()); }
                    try { allIn.await(); } catch (Exception e) { out.put(p + "-barrier", e.toString()); }
                });
                try { finished.await(); } catch (InterruptedException e) { throw new RuntimeException(e); }
                return out.toString();
            });

            time("CompletableFuture.allOf", () -> {
                List<CompletableFuture<String>> fs = PARTS.stream()
                        .map(p -> CompletableFuture.supplyAsync(() -> lookup(p), pool)).toList();
                try {
                    CompletableFuture.allOf(fs.toArray(new CompletableFuture[0])).join();
                    return fs.stream().map(CompletableFuture::join).toList().toString();
                } catch (RuntimeException e) {
                    return "allOf failed: " + e;
                }
            });
        }
    }
}`,
        },
        {
          type: "output",
          text: `join()                    124 ms  {promo=FAILED promo service 503, fare=ok, eta=ok}
CountDownLatch            122 ms  {promo=FAILED promo service 503, fare=ok, eta=ok}
CyclicBarrier             121 ms  {promo=FAILED promo service 503, fare=ok, eta=ok, merged-by=pool-1-thread-2}
CompletableFuture.allOf   126 ms  allOf failed: java.util.concurrent.CompletionException: java.lang.IllegalStateException: promo service 503`,
        },
        {
          type: "list",
          items: [
            "**All four took about 120 to 145 ms, the time of the slowest lookup (120 ms)** in all three runs. The tools cost microseconds; the waiting is the work itself.",
            "**`join()` waits for threads, not for work.** It needs a thread per task and can't be used with a pool, where threads never terminate. It's fine in a `main` method or a test.",
            "**`CountDownLatch` waits for events and works with any executor.** Results and errors travel separately (here in a map), and the `finally` matters: without it, the failed promo lookup would leave `main` waiting forever.",
            "**`CyclicBarrier` makes the workers wait for each other**, and the action ran in the last worker (`pool-1-thread-2`). To make the caller wait, I needed a latch anyway: a barrier is the wrong tool for \"main waits for N tasks\". It also holds three pool threads parked until the slowest finishes.",
            "**`CompletableFuture.allOf` carries the results and the failure.** The failure arrived as a `CompletionException` wrapping the `IllegalStateException`, with no extra bookkeeping, no blocked worker threads, and composition (`orTimeout`, `exceptionally`, `thenCombine`) available on the result. For request-path fan-out, this is usually the right choice; CompletableFuture in Depth: Threads, Composition and Errors covers it.",
          ],
        },
        {
          type: "table",
          headers: ["Tool", "Waits for", "Reusable", "Carries results/errors", "Best for"],
          rows: [
            ["`Thread.join()`", "A specific thread to terminate", "No", "No", "`main`, tests, a few threads you created"],
            ["`CountDownLatch`", "N events (from anywhere)", "No (one-shot)", "No", "Startup gates, \"all N done\", start gates in tests, one-time signals"],
            ["`CyclicBarrier`", "N parties to reach the same point", "Yes, automatically", "No (broken flag only)", "Fixed group of threads in lockstep rounds"],
            ["`CompletableFuture.allOf`", "N futures to complete", "No (new futures each time)", "Yes", "Fan-out of independent calls, request paths"],
            ["`ExecutorService.invokeAll`", "N callables, optionally with a deadline", "Per call", "Yes (`Future`s)", "A batch of tasks with a timeout that cancels stragglers"],
            ["`Phaser`", "A changing number of parties, per phase", "Yes", "No", "Dynamic parties, multi-phase work (next lesson)"],
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `LatchQueue` and a three-party `CyclicBarrier` round side by side:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`new CountDownLatch(3)`** creates a `Sync` and calls `setState(3)`. **`new CyclicBarrier(3, action)`** creates a `ReentrantLock`, its `Condition` `trip`, a first `Generation`, and sets `count = parties = 3`.",
            "**A thread calls `latch.await()`.** `acquireSharedInterruptibly(1)` calls `tryAcquireShared`, which sees `state == 3` and returns -1. AQS creates a `SharedNode`, appends it to the queue with a CAS on `tail`, spins briefly, rechecks, and calls `LockSupport.park(this)`. The thread is now `WAITING (parking)` on the `CountDownLatch$Sync`.",
            "**`countDown()` twice.** Each `releaseShared(1)` runs `tryReleaseShared`: read `state`, CAS it to `state - 1`, return whether the new value is 0. 3 to 2 and 2 to 1 return `false`; no thread is woken.",
            "**The third `countDown()`.** The CAS from 1 to 0 succeeds and returns `true`, so `releaseShared` calls `signalNext(head)` and unparks the first queued waiter.",
            "**The first waiter wakes,** retries `tryAcquireShared`, which now returns 1 (\"succeeded, others may too\"), becomes the new head, and calls `signalNextIfShared`, unparking the next shared waiter. That one does the same. The release propagates down the queue: 64, 113, 134 and 143 microseconds in the measured run.",
            "**Later `await()` calls** find `state == 0` in `tryAcquireShared` and return without touching the queue. Further `countDown()`s see 0 and return `false`. The latch is open for good.",
            "**Barrier: party 1 calls `await()`.** `dowait` takes `lock`, saves `g = generation`, checks `g.broken` and the interrupt flag, computes `index = --count` (2), and calls `trip.await()`, which fully releases the lock and parks the thread on the `ConditionObject`.",
            "**Party 2 does the same** with index 1 and parks on `trip`.",
            "**Party 3 arrives,** `index = --count` is 0. It runs `barrierCommand.run()` in its own thread, still holding the lock. Then `nextGeneration()`: `trip.signalAll()` moves both condition waiters into the lock's queue, `count = 3`, `generation = new Generation()`. It unlocks and returns 0.",
            "**Parties 1 and 2 wake** one at a time, each re-acquiring the lock inside `Condition.await`. Each sees `g != generation` (a new round has started) and returns its index (2 or 1). The barrier is ready for the next round with no further action.",
            "**On failure instead:** a timeout, an interrupt, `reset()` or a throwing action calls `breakBarrier()`: `g.broken = true`, `count = parties`, `trip.signalAll()`. Each woken party sees `g.broken` and throws `BrokenBarrierException`, and every later `await()` fails at the first check until `reset()` installs a new generation.",
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
          title: "GatesTour.java",
          code: `import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

public class GatesTour {
    public static void main(String[] args) throws Exception {
        try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
            // 1. CountDownLatch: N events, waiters block until the count reaches 0
            CountDownLatch loaded = new CountDownLatch(3);
            for (String cache : new String[] {"zones", "fares", "drivers"}) {
                pool.execute(() -> {
                    try { /* load cache */ } finally { loaded.countDown(); }   // always count down
                });
            }
            System.out.println("1. all loaded: " + loaded.await(1, TimeUnit.SECONDS) + ", count " + loaded.getCount());

            // 2. one-shot: it never goes back up; await on an open latch returns at once
            loaded.countDown();
            System.out.println("2. still " + loaded.getCount() + ", await returns " + loaded.await(0, TimeUnit.SECONDS));

            // 3. a start gate: CountDownLatch(1) as a one-time signal
            CountDownLatch go = new CountDownLatch(1);
            AtomicInteger started = new AtomicInteger();
            for (int i = 0; i < 3; i++) pool.execute(() -> {
                try { go.await(); started.incrementAndGet(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            });
            Thread.sleep(50);
            System.out.print("3. before go: " + started.get());
            go.countDown();
            while (started.get() < 3) Thread.onSpinWait();
            System.out.println(", after go: " + started.get());

            // 4. CyclicBarrier: N parties wait for each other, then an optional action runs, then it resets
            AtomicInteger rounds = new AtomicInteger();
            CyclicBarrier tick = new CyclicBarrier(3, rounds::incrementAndGet);
            CountDownLatch finished = new CountDownLatch(3);
            for (int i = 0; i < 3; i++) pool.execute(() -> {
                try {
                    for (int r = 0; r < 4; r++) tick.await();                // reused 4 times
                } catch (InterruptedException | BrokenBarrierException e) {
                    System.out.println("broken: " + e);
                } finally { finished.countDown(); }
            });
            finished.await();
            System.out.println("4. barrier tripped " + rounds.get() + " times, broken " + tick.isBroken());

            // 5. a timeout breaks the barrier for every party, until reset()
            CyclicBarrier pair = new CyclicBarrier(2);
            try {
                pair.await(10, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                System.out.print("5. timed out, broken " + pair.isBroken());
            }
            pair.reset();
            System.out.println(", after reset broken " + pair.isBroken());
        }
    }
}`,
        },
        {
          type: "output",
          text: `1. all loaded: true, count 0
2. still 0, await returns true
3. before go: 0, after go: 3
4. barrier tripped 4 times, broken false
5. timed out, broken true, after reset broken false`,
        },
        {
          type: "paragraph",
          text: "The output was the same on every run. Part 3 spins briefly on an `AtomicInteger` only to print a stable number; real code would wait on a `done` latch as in `StartGate`. Part 5 is a party waiting alone on a two-party barrier: the 10 ms timeout broke it, and `reset()` made it usable again because no other party was involved.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Warm-up with a deadline and a degraded mode",
        },
        {
          type: "code",
          language: "java",
          title: "WarmupShards.java",
          code: `import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class WarmupShards {
    public static void main(String[] args) throws Exception {
        Map<String, Long> loadMillis = new TreeMap<>(Map.of(
                "SALT-LAKE", 80L, "NEW-TOWN", 150L, "HOWRAH", 1_500L, "PARK-STREET", 60L));
        Set<String> pending = ConcurrentHashMap.newKeySet();
        pending.addAll(loadMillis.keySet());
        CountDownLatch warm = new CountDownLatch(loadMillis.size());

        ExecutorService pool = Executors.newFixedThreadPool(loadMillis.size());
        long t0 = System.nanoTime();
        loadMillis.forEach((zone, ms) -> pool.execute(() -> {
            try {
                Thread.sleep(ms);                          // load driver positions for the zone
                pending.remove(zone);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                warm.countDown();
            }
        }));

        boolean allWarm = warm.await(400, TimeUnit.MILLISECONDS);
        System.out.printf("after %d ms: allWarm=%b, still loading %s (count %d)%n",
                (System.nanoTime() - t0) / 1_000_000, allWarm, pending, warm.getCount());
        if (!allWarm) System.out.println("serving in degraded mode: matching in " + pending + " uses the database");

        warm.await();                                       // the slow shard finishes in the background
        System.out.printf("after %d ms: all zones warm, pending %s%n", (System.nanoTime() - t0) / 1_000_000, pending);
        pool.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `after 407 ms: allWarm=false, still loading [HOWRAH] (count 1)
serving in degraded mode: matching in [HOWRAH] uses the database
after 1506 ms: all zones warm, pending []`,
        },
        {
          type: "paragraph",
          text: "A matching service loads driver positions per Kolkata zone into memory. Waiting for every zone would hold the whole service hostage to the slowest one (HOWRAH, 1.5 s here), so it waits at most 400 ms and then serves, falling back to the database for zones still loading. The latch alone can only say \"one left\" (`count 1`); the `pending` set says which one. The latch keeps working afterwards: the second `await()` returned when HOWRAH finished, at about 1.5 s. The first line said 407 ms rather than 400: `await` returns after the timeout expires and the thread is scheduled again, so a timed wait is \"at least\", not \"exactly\".",
        },
        {
          type: "heading",
          text: "Example 2: Counting events, not threads",
        },
        {
          type: "code",
          language: "java",
          title: "FirstOffers.java",
          code: `import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class FirstOffers {
    public static void main(String[] args) throws Exception {
        int wanted = 3;
        CountDownLatch enoughOffers = new CountDownLatch(wanted);   // counts events, not threads
        List<String> offers = new CopyOnWriteArrayList<>();

        // Two dispatch threads, each pushing offers from several drivers
        String[][] drivers = {{"Asha", "Ravi", "Imran"}, {"Meera", "Tapas", "Joy"}};
        long[] gapMs = {70, 110};
        for (int d = 0; d < drivers.length; d++) {
            String[] names = drivers[d];
            long gap = gapMs[d];
            Thread.ofPlatform().daemon().name("dispatch-" + d).start(() -> {
                for (String name : names) {
                    try { Thread.sleep(gap); } catch (InterruptedException e) { return; }
                    if (enoughOffers.getCount() == 0) return;         // stop producing once enough arrived
                    offers.add(name);
                    enoughOffers.countDown();                          // one thread counts down many times
                }
            });
        }

        long t = System.nanoTime();
        boolean got = enoughOffers.await(1, TimeUnit.SECONDS);
        List<String> firstThree = List.copyOf(offers.subList(0, wanted));
        System.out.printf("got %d offers in %d ms: %b, first %s%n", wanted, (System.nanoTime() - t) / 1_000_000, got, firstThree);
        Thread.sleep(400);
        System.out.println("offers list after the latch opened: " + offers);
    }
}`,
        },
        {
          type: "output",
          text: `got 3 offers in 140 ms: true, first [Asha, Meera, Ravi]
offers list after the latch opened: [Asha, Meera, Ravi]`,
        },
        {
          type: "list",
          items: [
            "**The count is events.** Two dispatch threads produced the offers; three `countDown()` calls came from them in arrival order (Asha at 70 ms, Meera at 110, Ravi at 140), and `await` returned after 140 ms in all four runs. A latch doesn't know or care which threads count down.",
            "**`getCount() == 0` as a stop signal is a check-then-act.** Two producers can both see 1, both add an offer and both count down; the second `countDown()` is harmless (the latch is already 0), but the list then has four entries. That's why the reader copies exactly the first three, and why the list must be thread-safe. In these runs the timings never collided, so the list ended with exactly three offers.",
            "**For \"first N of many\", this is a small, clear tool.** For \"first one wins\", `CompletableFuture.anyOf` or `ExecutorService.invokeAny` returns the value as well.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Avoid"],
          rows: [
            ["Don't serve traffic until N components are initialised", "`CountDownLatch(N)`, `countDown` in `finally`, `await` with a timeout, outcomes recorded separately", "`await()` without a timeout; counting down only on success"],
            ["Release many threads at the same instant (tests, load generators)", "Start gate: `ready` latch of N + `start` latch of 1 + `done` latch of N", "Starting threads in a loop and hoping they overlap"],
            ["A one-time event other threads wait for (config loaded, shutdown requested)", "`CountDownLatch(1)`", "A `volatile boolean` polled in a sleep loop"],
            ["A fixed group of threads working in lockstep rounds", "`CyclicBarrier(N, action)`", "A new latch per round shared by long-lived threads"],
            ["Parties join and leave between rounds", "`Phaser`", "`CyclicBarrier` (its party count is fixed)"],
            ["A request waits for N independent calls", "`CompletableFuture.allOf` with `orTimeout`, or `invokeAll` with a timeout", "Blocking pool threads on a latch or barrier"],
            ["Wait for threads you started yourself to end", "`join()`, or an `ExecutorService` closed with try-with-resources", "A latch that duplicates what `join` already does"],
            ["Lockstep rounds where a worker may fail or be slow", "A per-round coordinator with a deadline", "A long-lived barrier with \"catch and continue\""],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "countDown only on the success path",
        },
        {
          type: "paragraph",
          text: "`load(); latch.countDown();` skips the `countDown` when `load` throws, and the latch never opens. Put it in `finally`, and record success or failure somewhere else, because an open latch only means \"finished\".",
        },
        {
          type: "heading",
          text: "await() with no timeout on a startup or request path",
        },
        {
          type: "paragraph",
          text: "A missing `countDown` then hangs the thread forever, with no exception and no deadlock report. Use `await(timeout, unit)` and **check the returned boolean**; ignoring it is the same bug with a delay.",
        },
        {
          type: "heading",
          text: "Expecting a latch to reset",
        },
        {
          type: "paragraph",
          text: "There is no `reset()`; at 0 a latch stays open, and `countDown()` does nothing. Code that reuses one latch for a periodic job sails through every round after the first. Create a new latch per round, or use a `CyclicBarrier` or `Phaser`.",
        },
        {
          type: "heading",
          text: "Sizing the latch from a different number than the tasks",
        },
        {
          type: "paragraph",
          text: "`new CountDownLatch(zones.size())` followed by a loop that skips disabled zones never reaches 0. Compute the count from the exact list of tasks submitted, or count down for skipped ones too.",
        },
        {
          type: "heading",
          text: "More parties than threads",
        },
        {
          type: "paragraph",
          text: "A `CyclicBarrier(4)` whose four parties run as tasks on a pool of 3 threads deadlocks: three tasks park at the barrier, holding all the pool's threads, and the fourth task never starts. The same happens with latches when the counting tasks queue behind the waiting tasks on the same bounded pool.",
        },
        {
          type: "code",
          language: "java",
          title: "PoolTooSmall.java",
          code: `import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class PoolTooSmall {
    public static void main(String[] args) throws Exception {
        CyclicBarrier allZones = new CyclicBarrier(4);
        ThreadPoolExecutor pool = new ThreadPoolExecutor(3, 3, 0, TimeUnit.SECONDS, new LinkedBlockingQueue<>());
        for (int i = 0; i < 4; i++) {
            pool.execute(() -> {
                try { allZones.await(); } catch (Exception e) { System.out.println("  task ended: " + e); }
            });
        }
        Thread.sleep(1_000);
        System.out.println("after 1 s: waiting at barrier " + allZones.getNumberWaiting()
                + ", tasks still queued " + pool.getQueue().size() + ", active threads " + pool.getActiveCount());
        pool.shutdownNow();                      // interrupts the parked parties: the barrier breaks
        pool.awaitTermination(1, TimeUnit.SECONDS);
    }
}`,
        },
        {
          type: "output",
          text: `after 1 s: waiting at barrier 3, tasks still queued 1, active threads 3
  task ended: java.util.concurrent.BrokenBarrierException
  task ended: java.util.concurrent.BrokenBarrierException
  task ended: java.lang.InterruptedException`,
        },
        {
          type: "paragraph",
          text: "Three parties parked, holding all three threads, and the fourth task sat in the queue for the whole second, in both runs. `shutdownNow()` interrupted the parked threads; the first interrupted one got `InterruptedException` and broke the barrier for the other two. The fourth task never ran: `shutdownNow()` returns it in its list of tasks that never started.",
        },
        {
          type: "heading",
          text: "Catching BrokenBarrierException and carrying on",
        },
        {
          type: "paragraph",
          text: "Every later `await()` on a broken barrier throws immediately, so a worker loop that logs the exception and continues never waits again: it races through rounds, and the barrier action never runs. The production section shows exactly that.",
        },
        {
          type: "heading",
          text: "Slow work in the barrier action",
        },
        {
          type: "paragraph",
          text: "The action runs while holding the barrier's lock and while all other parties are parked, so its duration is added to every round. Publish a reference or hand the result to another thread; don't do I/O in it.",
        },
        {
          type: "heading",
          text: "Using a barrier to make the caller wait",
        },
        {
          type: "paragraph",
          text: "A barrier makes its parties wait for each other. To make `main` or a request thread wait for workers, either make the caller a party (it then blocks a round like the others) or use a latch, `join` or futures.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Call `countDown()` in `finally`, exactly once per expected event, and keep results and errors in a separate thread-safe structure.",
            "Always wait with a timeout on paths that serve users or gate startup, check the result, and log `getCount()` (or `toString()`) when it fails.",
            "Treat a latch as one-shot: a new latch per batch or per reload, never a shared, reused one.",
            "Name threads that wait on gates (`Thread.ofPlatform().name(...)`, a `ThreadFactory`) so dumps and JFR show what is waiting.",
            "Use the start gate (`ready`, `start`, `done`) in concurrency tests, and for real coverage use jcstress.",
            "Size the pool for barrier parties: at least one thread per party, or use dedicated threads.",
            "Keep the barrier action short and exception-safe; log its exceptions where they happen.",
            "Decide in advance what a broken barrier means (abort the job, or rebuild with a new barrier) instead of catching `BrokenBarrierException` in a loop.",
            "Prefer `CompletableFuture.allOf` or `invokeAll` with a deadline for request-path fan-out; keep latches and barriers for coordinating threads, not for collecting results.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "What does a round of coordination cost? Four workers each do a tiny step (one `LongAdder` increment) per round, 20,000 rounds, best of five, with four ways to coordinate each round. Then the latch object itself, created, counted down and awaited with no waiting:",
        },
        {
          type: "code",
          language: "java",
          title: "RoundCost.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.LongAdder;

public class RoundCost {
    static final int WORKERS = 4;
    static final LongAdder WORK = new LongAdder();

    static void work() { WORK.increment(); }                   // a tiny step per worker per round

    interface Rounds { void run(int rounds) throws Exception; }

    static void measure(String label, int rounds, Rounds r) throws Exception {
        long best = Long.MAX_VALUE;
        for (int rep = 0; rep < 5; rep++) {
            WORK.reset();
            long t = System.nanoTime();
            r.run(rounds);
            best = Math.min(best, System.nanoTime() - t);
            if (WORK.sum() != (long) rounds * WORKERS) throw new AssertionError(WORK.sum());
        }
        System.out.printf("%-36s %7.1f us per round%n", label, best / 1_000.0 / rounds);
    }

    public static void main(String[] args) throws Exception {
        int rounds = 20_000;
        ExecutorService pool = Executors.newFixedThreadPool(WORKERS);

        measure("CyclicBarrier, 4 long-lived threads", rounds, n -> {
            CyclicBarrier barrier = new CyclicBarrier(WORKERS);
            Thread[] ts = new Thread[WORKERS];
            for (int i = 0; i < WORKERS; i++) ts[i] = Thread.ofPlatform().start(() -> {
                try { for (int k = 0; k < n; k++) { work(); barrier.await(); } } catch (Exception e) { throw new RuntimeException(e); }
            });
            for (Thread t : ts) t.join();
        });

        measure("new CountDownLatch per round + pool", rounds, n -> {
            for (int k = 0; k < n; k++) {
                CountDownLatch done = new CountDownLatch(WORKERS);
                for (int i = 0; i < WORKERS; i++) pool.execute(() -> { try { work(); } finally { done.countDown(); } });
                done.await();
            }
        });

        measure("CompletableFuture.allOf per round", rounds, n -> {
            for (int k = 0; k < n; k++) {
                CompletableFuture<?>[] fs = new CompletableFuture<?>[WORKERS];
                for (int i = 0; i < WORKERS; i++) fs[i] = CompletableFuture.runAsync(RoundCost::work, pool);
                CompletableFuture.allOf(fs).join();
            }
        });

        measure("4 new threads + join per round", rounds / 10, n -> {
            for (int k = 0; k < n; k++) {
                Thread[] ts = new Thread[WORKERS];
                for (int i = 0; i < WORKERS; i++) ts[i] = Thread.ofPlatform().start(RoundCost::work);
                for (Thread t : ts) t.join();
            }
        });
        pool.shutdown();

        // The objects themselves, with no waiting: create, count down, await an open latch
        long best = Long.MAX_VALUE, sink = 0;
        for (int rep = 0; rep < 5; rep++) {
            long t = System.nanoTime();
            for (int k = 0; k < 10_000_000; k++) {
                CountDownLatch l = new CountDownLatch(1);
                l.countDown();
                l.await();
                sink += l.getCount();
            }
            best = Math.min(best, System.nanoTime() - t);
        }
        System.out.printf("%-36s %7.1f ns per latch (sink %d)%n", "uncontended new+countDown+await", best / 10_000_000.0, sink);
    }
}`,
        },
        {
          type: "output",
          text: `CyclicBarrier, 4 long-lived threads     17.0 us per round
new CountDownLatch per round + pool     11.3 us per round
CompletableFuture.allOf per round       11.5 us per round
4 new threads + join per round         293.3 us per round
uncontended new+countDown+await         33.2 ns per latch (sink 0)`,
        },
        {
          type: "list",
          items: [
            "**Creating threads per round was the outlier:** 255 to 580 microseconds per round across four runs, 20 to 25 times the other options. Every other approach reuses threads.",
            "**The barrier was not faster than a pool and a new latch per round**, which surprised me: 15 to 38 microseconds against 11 to 28 (and 11 to 28 for `allOf`), consistently about 1.3 to 1.5 times slower. The bytecode explains it: in every round three of the four threads park on `trip`, and `signalAll` moves them into the `ReentrantLock`'s queue, so they wake **one at a time**, each re-acquiring the lock inside `Condition.await` before it can return. The pool version parks one thread (`main`) per round and lets idle workers pick up the next tasks.",
            "**A latch with no waiting costs nanoseconds**: 17 to 33 ns to allocate one, count it down and pass an open `await`. Creating a new latch per batch is not a performance concern.",
            "**The cost is parking, not the objects.** With tiny steps, each round is dominated by park and unpark (a few microseconds each on Linux). With real work of milliseconds per round, all three pooled options are noise. Choose by semantics, not by these numbers.",
            "These are single-machine `System.nanoTime` measurements, not JMH, on an 8-core machine with other benchmarks running (load average 8 to 10 during the runs). The ranges are across four runs; the ratios were stable, the absolute numbers were not.",
          ],
        },
      ],
    },
    {
      title: "Coordination in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend recomputes surge multipliers for four Kolkata zones every tick. The first version used four long-lived worker threads and a `CyclicBarrier(4)` whose action published the surge table. To avoid hanging on a slow zone, each worker waited with `await(300, MILLISECONDS)`, and to be \"resilient\", it caught `TimeoutException` and `BrokenBarrierException`, logged a warning and moved on to the next tick. One evening, HOWRAH's database call took 700 ms once. The surge table stopped updating for the rest of the night, while the job kept running and logging warnings. I rebuilt it with one slow call in tick 4 of 12:",
        },
        {
          type: "code",
          language: "java",
          title: "SurgeJob.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicIntegerArray;

public class SurgeJob {
    static final List<String> ZONES = List.of("SALT-LAKE", "NEW-TOWN", "HOWRAH", "PARK-STREET");
    static final int TICKS = 12;

    // Reads demand for a zone; HOWRAH's database is slow for one tick (tick 4)
    static int computeSurgePct(int zone, int tick) throws InterruptedException {
        Thread.sleep(ZONES.get(zone).equals("HOWRAH") && tick == 4 ? 700 : 50);
        return 100 + 10 * ((zone + tick) % 4);
    }

    // What ran in production: long-lived workers in lockstep on a CyclicBarrier
    static void barrierVersion() throws InterruptedException {
        AtomicIntegerArray surge = new AtomicIntegerArray(ZONES.size());
        AtomicInteger published = new AtomicInteger(), lastPublishedTick = new AtomicInteger(), failures = new AtomicInteger();
        int[] tickNo = {0};
        CyclicBarrier tick = new CyclicBarrier(ZONES.size(), () -> {
            published.incrementAndGet();
            lastPublishedTick.set(++tickNo[0]);
        });
        List<Thread> workers = new ArrayList<>();
        for (int z = 0; z < ZONES.size(); z++) {
            int zone = z;
            workers.add(Thread.ofPlatform().name("surge-" + ZONES.get(z)).start(() -> {
                for (int t = 1; t <= TICKS; t++) {
                    try {
                        surge.set(zone, computeSurgePct(zone, t));
                        tick.await(300, TimeUnit.MILLISECONDS);
                    } catch (TimeoutException | BrokenBarrierException e) {
                        failures.incrementAndGet();             // "log and carry on with the next tick"
                        if (failures.get() <= 4) {
                            System.out.printf("  tick %2d %-12s %s%n", t, ZONES.get(zone), e.getClass().getSimpleName());
                        }
                    } catch (InterruptedException e) {
                        return;
                    }
                }
            }));
        }
        for (Thread w : workers) w.join();
        System.out.printf("barrier: %d ticks, published %d, last published tick %d, %d exceptions, broken=%b%n",
                TICKS, published.get(), lastPublishedTick.get(), failures.get(), tick.isBroken());
    }

    // The fix: one coordinator per tick, a deadline per tick, last known value for a late zone
    static void perTickVersion() throws InterruptedException {
        int[] lastKnown = new int[ZONES.size()];
        int published = 0, staleZones = 0;
        ExecutorService pool = Executors.newFixedThreadPool(ZONES.size());
        for (int t = 1; t <= TICKS; t++) {
            int tick = t;
            List<Callable<Integer>> tasks = new ArrayList<>();
            for (int z = 0; z < ZONES.size(); z++) {
                int zone = z;
                tasks.add(() -> computeSurgePct(zone, tick));
            }
            List<Future<Integer>> results = pool.invokeAll(tasks, 300, TimeUnit.MILLISECONDS);  // cancels the late ones
            List<String> stale = new ArrayList<>();
            for (int z = 0; z < ZONES.size(); z++) {
                Future<Integer> f = results.get(z);
                if (f.state() == Future.State.SUCCESS) lastKnown[z] = f.resultNow();
                else { stale.add(ZONES.get(z)); staleZones++; }
            }
            published++;
            if (!stale.isEmpty()) System.out.printf("  tick %2d published with last known surge for %s%n", tick, stale);
        }
        pool.shutdown();
        System.out.printf("per-tick: %d ticks, published %d, stale zone-ticks %d%n", TICKS, published, staleZones);
    }

    public static void main(String[] args) throws Exception {
        long t = System.nanoTime();
        barrierVersion();
        System.out.printf("  took %d ms%n", (System.nanoTime() - t) / 1_000_000);
        t = System.nanoTime();
        perTickVersion();
        System.out.printf("  took %d ms%n", (System.nanoTime() - t) / 1_000_000);
    }
}`,
        },
        {
          type: "output",
          text: `  tick  4 PARK-STREET  BrokenBarrierException
  tick  4 NEW-TOWN     TimeoutException
  tick  4 SALT-LAKE    BrokenBarrierException
  tick  5 PARK-STREET  BrokenBarrierException
barrier: 12 ticks, published 3, last published tick 3, 36 exceptions, broken=true
  took 1274 ms
  tick  4 published with last known surge for [HOWRAH]
per-tick: 12 ticks, published 12, stale zone-ticks 1
  took 863 ms`,
        },
        {
          type: "list",
          items: [
            "**One slow call broke every later tick.** In tick 4, one of the three fast zones timed out first (`PARK-STREET` here; `SALT-LAKE` and `NEW-TOWN` in other runs) and broke the barrier, the other two got `BrokenBarrierException`, and HOWRAH, arriving at 700 ms, got it immediately. From tick 5 on, every `await` failed at the first check of `dowait` because the generation stayed broken: 36 exceptions (4 in tick 4 plus 4 in each of ticks 5 to 12), 3 ticks published out of 12, the same in all three runs. In production that meant a surge table frozen at tick 3 and a log full of warnings that looked like \"resilience\".",
            "**Nothing looked stuck.** No thread was blocked, CPU was low, the job was \"running\". Only a staleness metric on the published table (\"last published tick\") would have caught it, and there wasn't one.",
            "**Why not just `reset()` in the catch block?** Four workers would each call it, at different times, some of them while others were already waiting for the next tick, breaking those rounds too. Getting the barrier back in step needs a coordinator anyway.",
            "**The fix made the coordinator explicit.** Each tick submits one task per zone and waits with `invokeAll(tasks, 300, MILLISECONDS)`, which cancels late tasks (interrupting HOWRAH's sleep). The tick publishes with the last known value for the late zone and says so. Result: 12 of 12 ticks published, 1 stale zone-tick, in 860 ms instead of a broken job. A failure in one tick can't leak into the next, because each tick has its own futures.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from it:",
        },
        {
          type: "list",
          items: [
            "A `CyclicBarrier` is the right model only when every party must complete every round. If a party may be slow or fail, the barrier turns one failure into a permanent one.",
            "`catch (BrokenBarrierException e) { log; continue; }` is never recovery. Decide what a broken round means and handle it in one place.",
            "Per-round coordination with deadlines (`invokeAll` with a timeout, or `CompletableFuture.allOf` with `orTimeout`) isolates rounds from each other and makes partial results explicit.",
            "Monitor the output, not just the process: a \"last published\" timestamp with an alert would have caught this in minutes.",
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
              question: "What is the difference between CountDownLatch and CyclicBarrier?",
              answer:
                "A `CountDownLatch` lets threads wait until a count of events reaches zero; the threads counting down don't wait, and the latch is one-shot: once at zero it stays open and can't be reset. A `CyclicBarrier` makes a fixed number of parties wait for each other at a common point; each `await()` is both an arrival and a wait, nobody passes until all have arrived, an optional action runs once per round, and the barrier resets itself for the next round. Latch: \"wait for N things to happen\". Barrier: \"N threads wait for each other, repeatedly\".",
            },
            {
              question: "Can a CountDownLatch be reused?",
              answer:
                "No. There is no method that increases the count after construction, so at zero it stays open: further `countDown()` calls do nothing, and every `await()` returns immediately. I checked: `countDown()` three times on a latch of 2 printed counts 1, 0, 0. For repeated rounds, create a new latch each time, or use `CyclicBarrier` or `Phaser`.",
            },
            {
              question: "Why should countDown() be called in a finally block?",
              answer:
                "Because if the work throws before `countDown()`, that count is lost forever and every `await()` waits indefinitely. In my startup test, a loader that threw left the count at 1 and the waiting thread returned only because I'd used a 2-second timeout. In `finally`, every task counts down exactly once, and success or failure is recorded separately, since an open latch only means \"all finished\".",
            },
            {
              question: "What does CyclicBarrier.await() return?",
              answer:
                "The arrival index: `parties - 1` for the first thread to arrive, down to 0 for the last. It's `--count` inside `dowait`. The last arrival (index 0) is also the thread that runs the barrier action, so code sometimes uses `if (index == 0)` to let exactly one party do per-round work.",
            },
            {
              question: "What happens if await(timeout) on a CountDownLatch times out?",
              answer:
                "It returns `false`; it doesn't throw. The count is unchanged, and the latch can still open later; other waiters are unaffected. Because it's just a `boolean`, the result must be checked, otherwise a timeout silently continues as if everything was ready.",
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
              question: "What is BrokenBarrierException and when is it thrown?",
              answer:
                "It's thrown by `CyclicBarrier.await()` when the current round can't complete: another party timed out, was interrupted, the barrier action threw, or `reset()` was called while threads were waiting. One party gets the original cause (`TimeoutException`, `InterruptedException`, the action's exception); all others get `BrokenBarrierException`. The barrier stays broken, so later `await()` calls throw it immediately until `reset()`. I triggered all five cases, including `await(0, ms)` by a non-last party, which breaks the barrier at once.",
            },
            {
              question: "Which thread runs the barrier action, and when?",
              answer:
                "The last thread to arrive, inside its `await()`, while holding the barrier's lock and before any party is released; then `nextGeneration()` wakes the others. My reflection test printed the last worker's name for each round, with `count` at 0 and the generation still the old one. Because of happens-before through the lock, the action safely sees every party's writes from the round. It should be short, because all parties wait for it.",
            },
            {
              question: "How do you make N threads start at exactly the same time in a test?",
              answer:
                "Use a start gate: each worker calls `ready.countDown()` then `start.await()`, where `start` is a `CountDownLatch(1)`; the test waits for `ready` (all N parked), then calls `start.countDown()`, and waits on a `done` latch that each worker counts down in `finally`. In my test, a racy counter failed in 157 of 200 runs with the gate and 14 of 200 without. A `CyclicBarrier(N + 1)` with the test thread as a party works too.",
            },
            {
              question: "How do latch and barrier waiters look in a thread dump?",
              answer:
                "Both are `WAITING (parking)` (or `TIMED_WAITING` with a timeout), never `BLOCKED`. Latch waiters show `parking to wait for <...> (a java.util.concurrent.CountDownLatch$Sync)` under `acquireSharedInterruptibly` and `CountDownLatch.await`. Barrier waiters park on an `AbstractQueuedSynchronizer$ConditionObject`, with `CyclicBarrier.dowait` in the stack. Neither has an owner, so `Locked ownable synchronizers` is `None` and the deadlock detector never reports them.",
            },
            {
              question: "When would you use CompletableFuture.allOf instead of a CountDownLatch?",
              answer:
                "When waiting for results of independent tasks, especially on a request path. `allOf` carries values and failures (my failing lookup arrived as a `CompletionException`), doesn't need a blocked thread per task or a `finally`, and composes with `orTimeout` and `exceptionally`. A latch is better for coordinating threads around events that aren't task results: startup gates, start gates in tests, one-time signals.",
            },
            {
              question: "What happens if a CyclicBarrier has more parties than the thread pool running them?",
              answer:
                "Deadlock. With a `CyclicBarrier(4)` and four tasks on a 3-thread pool, three tasks parked at the barrier and the fourth stayed in the pool's queue forever, because no thread was free to run it. `getNumberWaiting()` stayed at 3. The pool needs at least as many threads as parties, or the parties need dedicated threads.",
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
              question: "How is CountDownLatch implemented?",
              answer:
                "As a private `Sync extends AbstractQueuedSynchronizer` in shared mode, with AQS's `state` as the count. `await()` is `acquireSharedInterruptibly(1)`: `tryAcquireShared` returns 1 if `state == 0`, else -1, which makes AQS enqueue a shared node and park. `countDown()` is `releaseShared(1)`: `tryReleaseShared` CASes the count down in a retry loop and returns `true` only on the 1-to-0 transition, which makes AQS unpark the head waiter; each woken shared waiter then unparks the next. Nothing ever increases `state`, which is why it's one-shot.",
            },
            {
              question: "How is CyclicBarrier implemented, and why doesn't it use AQS directly?",
              answer:
                "With a `ReentrantLock`, one `Condition` (`trip`), an `int count` and a `Generation` object with a `broken` flag. `dowait` takes the lock, decrements `count`; the last arrival runs the action and calls `nextGeneration()` (`signalAll`, reset `count`, new `Generation`), others `trip.await()` and, when woken, compare their saved generation with the current one: changed means success, `broken` means `BrokenBarrierException`. It needs more state than one `int` (the action, the broken flag per round, the arrival index), and the lock makes that state simple to keep consistent; the cost is that woken parties re-acquire the lock one at a time.",
            },
            {
              question: "Why does CyclicBarrier need a Generation object instead of just resetting count?",
              answer:
                "To let a woken thread tell which round it belongs to. After the last party trips the barrier, it immediately resets `count`, and fast threads may already be arriving for the next round before slow threads have woken from the previous one. A woken thread compares its saved `Generation` reference with the current one: a different object means \"my round completed\". And `broken` is per generation, so breaking one round doesn't affect a new one created by `reset()`. My reflection test showed a new generation object after every round.",
            },
            {
              question: "In what order are latch waiters released, and does that matter?",
              answer:
                "In FIFO queue order, by propagation: the final `countDown()` unparks the head waiter, which on success unparks the next shared waiter, and so on. In my test, four waiters woke 64, 113, 134 and 143 microseconds after the last `countDown()`. With hundreds of waiters, the last one wakes noticeably later, so a latch is not a precise \"everyone at once\" mechanism; for load tests that matters a little, for startup gating not at all.",
            },
            {
              question: "Why might a CyclicBarrier round be slower than submitting tasks to a pool and waiting on a new latch?",
              answer:
                "Because after `signalAll`, every woken party must re-acquire the barrier's `ReentrantLock` inside `Condition.await` before returning, so wake-ups are serialised, and in each round all but one party park. In my measurement with 4 workers and tiny work, a barrier round took 15 to 38 microseconds against 11 to 28 for pool plus latch, and creating 4 threads per round took 255 to 580. With realistic work per round, the difference disappears.",
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
              question: "A service's pods never become ready after a deployment. A thread dump shows the startup thread WAITING (parking) on a CountDownLatch$Sync, and there are no errors except one log line from a loader thread. What happened and how do you fix it?",
              answer:
                "A loader threw before calling `countDown()`, so the count can never reach zero and `await()` waits forever. The dump has no owner and no deadlock report, because a latch has no owner. To confirm, log or inspect `getCount()` (`toString()` prints `[Count = 1]`). Fix: `countDown()` in `finally`, a separate record of each loader's outcome, and `await(timeout, unit)` with the result checked, failing startup loudly with the list of failed loaders. In my reproduction, the fixed version opened after 300 ms and reported `fare-rules -> FAILED` instead of hanging.",
            },
            {
              question: "A batch job using a CyclicBarrier stopped publishing results hours ago, but it's still running and logging BrokenBarrierException warnings every tick. What do you check and change?",
              answer:
                "The barrier broke once (a timeout, an interrupt or a throwing action) and stays broken; every later `await()` throws immediately, and the workers catch it and continue, so the action never runs again. Check the first warning's time and cause (the one party that got `TimeoutException` or the action's exception), and `isBroken()`. I reproduced it: one 700 ms call in tick 4 meant 3 of 12 ticks published and 36 exceptions. The fix is to stop treating `BrokenBarrierException` as recoverable in a loop: use a per-round coordinator with a deadline (`invokeAll(tasks, timeout)`), which published 12 of 12 with one stale value, and alert on the age of the last published result.",
            },
            {
              question: "A concurrency test for a booking counter has passed in CI for months, but production shows lost updates. How would you make the test catch it?",
              answer:
                "The threads probably never overlapped: starting threads in a loop staggers them, and the work can finish before the next thread starts. Use a start gate (`ready`, `start`, `done` latches) so all workers are parked and released together, repeat the scenario many times, and assert on every run. In my test, the same racy counter failed in 157 of 200 runs with the gate and 14 without. Also watch for the JIT hiding the race (a plain `int` loop was compiled into almost a single add and failed only 2 to 10 times in 200 either way), which is why jcstress exists for this kind of test.",
            },
            {
              question: "After moving a simulation from dedicated threads to a shared fixed thread pool, it hangs at the first round. Thread dumps show three pool threads parked in CyclicBarrier.dowait. What's wrong?",
              answer:
                "The barrier has more parties than the pool has free threads. Three parties are parked holding all three pool threads, and the fourth party's task is still in the pool's queue, so the barrier can never trip. My reproduction with `CyclicBarrier(4)` on a 3-thread pool stayed at `waiting=3` with one task queued. Fix: give the parties dedicated threads, size the pool to at least the number of parties (and never share it with other work that could occupy threads), or restructure to per-round tasks that don't block each other.",
            },
            {
              question: "A request handler fans out to three services and waits on a CountDownLatch with a 2-second timeout. Under load, p99 latency is exactly 2 seconds for some requests, though all three services respond in 200 ms. What could be happening?",
              answer:
                "Requests that wait exactly the full timeout usually mean a `countDown()` that never happened: a callback path that throws, a branch that returns early, or an error handler that doesn't count down, so the latch reaches the timeout. Another cause is the counting tasks queued behind the waiting ones on the same bounded pool, which only starts them after the waiter gives up. Check for `countDown` outside `finally`, log `getCount()` on timeout, and check whether the waiter and the workers share an executor. Better still, replace the latch with `CompletableFuture.allOf(...).orTimeout(...)` on a separate executor, which carries the failure instead of turning it into a 2-second wait.",
            },
            {
              question: "Your team wants to add a startup check that waits for 'all caches loaded' and also reuses that latch every hour when caches reload. What do you advise?",
              answer:
                "A latch can't do that: at zero it stays open, so after the first load every hourly `await()` returns immediately and the reload check passes without waiting. Use a new latch per reload (created by the reload coordinator, published through a `volatile` field or returned to callers), or a `Phaser` if the same set of loaders cycles. Keep the startup latch as the one-shot gate it is, and expose reload status separately (last successful reload time per cache).",
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
            "Create `new CountDownLatch(0)` and call `await()`. Then try `new CountDownLatch(-1)`.",
            "Create `new CountDownLatch(2)`, call `countDown()` three times, and print `getCount()` after each call.",
            "Create `new CyclicBarrier(1, action)` where the action prints the current thread's name, and call `await()` twice from `main`, printing the return values.",
            "Create `new CyclicBarrier(2)`, call `await(0, TimeUnit.MILLISECONDS)` from `main`, print `isBroken()`, then call `await()` again.",
            "Start a thread that calls `await()` on a `CountDownLatch(1)`, interrupt it after 100 ms, and print the exception, `getCount()` and the thread's interrupt flag inside the catch block.",
            "In `StartGate`, remove `volatile` from `bookings` and run it a few times.",
            "Run `ParkedOnGates`, take `jcmd ParkedOnGates Thread.print`, and find the address each latch waiter parks on.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 returns immediately (the latch is born open), and `-1` throws `IllegalArgumentException: count < 0`. Step 2 prints `1 0 0`: the third `countDown()` does nothing. Step 3 runs the action in `main` twice and prints `0 0`: with one party, every caller is the last arrival. Step 4 throws `TimeoutException` at once, `isBroken()` is `true`, and the second `await()` throws `BrokenBarrierException` without waiting. Step 5 prints `java.lang.InterruptedException, count 1, flag false`: the interrupt doesn't touch the count, and the flag is cleared when the exception is thrown, so code that can't rethrow should restore it. Step 6 is the surprise: the race almost disappears with or without the gate (2 to 10 failures in 200 in my runs), because the JIT can keep a non-volatile field in a register for the whole loop. Step 7 shows both latch waiters parking on the same `CountDownLatch$Sync` address, one `WAITING` and one `TIMED_WAITING`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `LATCH       CountDownLatch(n): AQS shared mode, state = count
            await() = acquireSharedInterruptibly(1): pass when state == 0
            countDown() = releaseShared(1): CAS down, wake all at 1 -> 0
            ONE-SHOT: no reset, countDown at 0 is a no-op
            waiters woken in FIFO order by propagation (64..143 us for 4)

RULES       countDown in finally   await(t, unit) and CHECK the boolean
            open latch = "all finished", not "all succeeded"
            start gate: ready(N) + start(1) + done(N) -> 157/200 vs 14/200

BARRIER     CyclicBarrier(parties, action): ReentrantLock + Condition trip
            + int count + Generation{broken}
            await() returns --count (parties-1 first ... 0 last)
            last arrival runs action (holding the lock), then new Generation

BROKEN      timeout | interrupt | reset() | action throws -> breakBarrier
            one party gets the cause, the rest BrokenBarrierException
            stays broken: later awaits throw at once ("catch+continue" = dead job)
            parties > pool threads = deadlock

DUMPS       latch:   WAITING (parking) on CountDownLatch$Sync
            barrier: WAITING (parking) on AQS$ConditionObject, CyclicBarrier.dowait
            no owner -> no deadlock report; JFR jdk.ThreadPark gives durations

CHOOSE      join: threads you made   latch: N events   barrier: lockstep rounds
            allOf / invokeAll(timeout): results + errors + deadlines`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `CountDownLatch` is an AQS counter that opens once: cheap, simple, and unforgiving of a missing `countDown`. `finally`, a timeout, and a separate record of outcomes turn it from a hang risk into a reliable startup or test gate.",
            "A `CyclicBarrier` is a lock, a condition and a generation that open and reset every round. It fits a fixed group of threads in lockstep; one slow or failing party breaks the round for all, and a broken barrier stays broken, so decide up front what failure means.",
            "Next comes Semaphore, Phaser and Exchanger: permits that limit how many threads do something at once (and the bulkhead that keeps a slow maps API from taking a whole service down), a barrier whose parties can join and leave, and a meeting point where two threads swap buffers.",
          ],
        },
      ],
    },
  ],
};
