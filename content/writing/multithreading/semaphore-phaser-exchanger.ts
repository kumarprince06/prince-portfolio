import type { Lesson } from "../types";

export const semaphorePhaserExchanger: Lesson = {
  slug: "semaphore-phaser-exchanger",
  date: "2026-11-16",
  title: "Semaphore, Phaser and Exchanger",
  description:
    "The last three synchronizers of java.util.concurrent on JDK 21, taken apart and measured: Semaphore as AQS shared mode with state as the free permits (read through javap and reflection), nonfair at 6.7 to 7.1 million acquires per second against 150,000 to 200,000 for fair with 8 threads on 2 permits, why untimed tryAcquire barges even on a fair semaphore, release() with no matching acquire raising a Semaphore(4) to 16 permits and letting 16 calls into a slow API at once, a bulkhead that kept trip-status at 5 ms while a maps API took 1 s per call (1,063 ms p50 without it), why a semaphore limits concurrency and not rate (2,602 to 53 calls a second from the same Semaphore(5)), Phaser's single packed long state field decoded bit by bit, register, arriveAndDeregister, onAdvance termination and tiering, a timeout that leaves a Phaser working where a CyclicBarrier breaks, Exchanger's slot and its Node[192] arena with used slots 32 apart, double buffering that halved a GPS ingest from 1,221 to 649 ms with two buffers, what each looks like in jcmd thread dumps and JFR, and a fare-quote bulkhead in a ride-hailing backend whose leaked permits doubled its limit during a maps outage.",
  tags: ["Multithreading", "Semaphore", "Phaser", "Exchanger", "Concurrency"],
  sections: [
    {
      title: "What Semaphore, Phaser and Exchanger Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, CountDownLatch and CyclicBarrier, covered the two classic gates: a counter that opens once, and a meeting point for a fixed group that resets every round. This lesson finishes the coordination toolbox with three more synchronizers. A **synchronizer** is any object whose job is to make threads wait for each other at the right moment; it holds no business data of its own.",
        },
        {
          type: "list",
          items: [
            "**`Semaphore`** holds a number of **permits**. A thread takes one with `acquire()` and gives it back with `release()`; if none are left, `acquire()` waits. It answers \"at most N threads may do this at once\": at most 4 concurrent calls to a maps vendor, at most 10 database connections for exports.",
            "**`Phaser`** is a reusable barrier whose set of parties can change. Threads can `register()` and `arriveAndDeregister()` between rounds (called **phases**), and an overridable `onAdvance` method decides after each phase whether to continue or stop. It answers \"these workers move through stages together, but the group isn't fixed\".",
            "**`Exchanger`** is a meeting point for exactly two threads, where each hands an object to the other and gets the other's object back. It answers \"two threads take turns with two buffers\": one fills, one drains, then they swap.",
          ],
        },
        {
          type: "paragraph",
          text: "The one most worth knowing well is `Semaphore`, because it is the tool behind **bulkheads**: limits that stop one slow dependency from using up every thread in a service. It is also easy to misuse in two ways that this lesson measures: releasing a permit that was never acquired (which silently raises the limit), and treating it as a rate limiter (which it isn't). `Phaser` and `Exchanger` are rarer, but interviewers like them because their internals are clever: a phaser keeps its whole state in one `long`, and an exchanger grows an \"arena\" of slots when many threads pair up at once.",
        },
        {
          type: "paragraph",
          text: "As in the earlier lessons, I read the internals of all three on JDK 21 with `javap` and reflection, timed fair against nonfair permits, broke things on purpose, and looked at each in a thread dump and in JFR. The next lesson, CompletableFuture in Depth: Threads, Composition and Errors, leaves waiting behind and moves to the asynchronous style, where nobody blocks and callbacks carry results forward.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The semaphore is one of the oldest ideas in concurrency. Edsger Dijkstra described it in the early 1960s for the THE operating system, with two operations he called P and V (from Dutch words for \"try to take\" and \"release\"). A counting semaphore is exactly what `java.util.concurrent.Semaphore` implements: P is `acquire`, V is `release`. Java's `synchronized` monitors are a later idea (Hoare and Brinch Hansen in the 1970s), so for years Java programmers built semaphores out of monitors by hand.",
        },
        {
          type: "paragraph",
          text: "Doug Lea's `EDU.oswego.cs.dl.util.concurrent` library had `Semaphore` and a two-party `Rendezvous` in the late 1990s, and both came into the JDK with JSR 166 in Java 5. `Exchanger` was rewritten for Java 6 around an **elimination arena**, an idea from Bill Scherer, Doug Lea and Michael Scott's research on scalable exchange channels: when many threads try to pair up, spread them over several slots instead of fighting over one. `Phaser` arrived in Java 7 (from the JSR 166y work). Its design borrowed from the \"phasers\" of the Habanero project at Rice University, which generalised barriers to groups whose membership changes.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["1960s", "Dijkstra's P/V semaphore", "The counting-permits model `Semaphore` still uses"],
            ["Java 5 (2004)", "`Semaphore` (on AQS shared mode, fair and nonfair), `Exchanger` (JSR 166)", "Standard permits; `acquire` is a shared acquire, `release` a shared release"],
            ["Java 6 (2006)", "`Exchanger` rewritten with a slot and an arena", "Pairs threads up without a lock; scales when many threads exchange"],
            ["Java 7 (2011)", "`Phaser`", "Barrier with dynamic parties, phase numbers, `onAdvance` and tiering"],
            ["Java 9 (2017)", "`java.util.concurrent` moves from `Unsafe` to `VarHandle`", "The `STATE`, `SLOT`, `BOUND` and `MATCH` VarHandles in this lesson's `javap` output"],
            ["Java 14 (2020)", "AQS rewritten", "The `acquire(Node, ...)` frames in this lesson's thread dumps"],
            ["Java 21 (2023)", "Virtual threads final", "A `Semaphore` becomes the natural way to limit concurrency when threads are no longer pooled"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Three situations at a ride-hailing company's office.",
        },
        {
          type: "list",
          items: [
            "**A `Semaphore` is the rack of four phone headsets for calling the maps vendor's support line.** Anyone who needs to call takes a headset; when all four are taken, the next person waits by the rack. Nobody checks who returns a headset, so if someone \"returns\" one they never took (finds a spare in a drawer and hangs it up), the rack now has five, and five people can be on the line at once. That's the permit leak this lesson measures.",
            "**`tryAcquire` with a timeout is a person who waits 20 seconds at the rack and then answers the customer from the printed price sheet instead.** That's a bulkhead with a fallback.",
            "**A `Phaser` is the monthly payout run.** Each city's team finishes \"collect trips\" before anyone starts \"compute payouts\", and so on. A city with nothing to pay this month leaves after the first stage; a new city that went live mid-month joins at the second. The coordinator writes the stage report after each stage and decides when the run is over.",
            "**An `Exchanger` is two dispatchers with two clipboards.** One writes incoming ride requests on a clipboard; the other enters a full clipboard into the system. When the writer's clipboard is full and the other's is empty, they swap and carry on. Nobody waits for a blank sheet to be printed.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: the headset rack has a physical number of headsets, but a `Semaphore` has no maximum; it is only a counter, and `release()` always adds one. And headsets are returned by the people who took them, but a permit has no owner: any thread can release, which is useful (one thread acquires, another releases when the work finishes) and dangerous (nothing catches a release without an acquire).",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/semaphore-phaser-exchanger-permits.svg",
          alt: "Three panels across the top. Left, Semaphore(4): a Semaphore$Sync box (an AQS in shared mode) where state is the free permits; acquire(n) CASes state to state minus n and, if the result would be negative, queues and parks; release(n) CASes state to state plus n, with no owner and no upper limit; fair mode checks hasQueuedPredecessors first. Middle, Phaser: one volatile long state, split into a termination bit (63), a 31-bit phase (62 to 32), a 16-bit parties count (31 to 16) and a 16-bit unarrived count (15 to 0); examples: 3 parties with 1 arrived is 0x0000000000030002, phase 1 with all reset is 0x0000000100030003, terminated in phase 2 is 0x8000000200030003; waiters spin 256 times, then park on a QNode in evenQ or oddQ; children register with a parent. Right, Exchanger: a slot holding a Node whose item A waits until a partner takes A and gives B; with 2 threads arena stays null, with 8 contending threads it becomes Node[192], (FULL+2) shifted left by ASHIFT; used slots are 32 apart and Node is @Contended, so there's no false sharing. Middle row: a Semaphore as a bulkhead, 8 request threads, a maps API stuck at 1 s per call, 2 s of traffic. No bulkhead: all 8 threads wait on maps, trip-status p50 1,063 ms, max 2,157 ms, quote p50 2,060 ms. Semaphore(3) with tryAcquire(20 ms): at most 3 threads on maps, the rest use a cached ETA, trip-status p50 5 ms, max 5 ms, but a permitted quote still waits 1,000 ms. A 3-thread pool with get(300 ms): callers also time out the call, trip-status p50 5 ms, max 5 ms, quote max 301 ms, all cached. Bottom: the permit leak. Red code: boolean got = s.tryAcquire(50, MILLISECONDS); try { if (got) call(); } finally { s.release(); }, permits 4 to 16. Blue code: if (!s.tryAcquire(50, MILLISECONDS)) return fallback(); try { return call(); } finally { s.release(); }, permits stay 4.",
          caption: "A Semaphore is an AQS counter of free permits, a Phaser is one packed long, an Exchanger is a slot that grows into an arena. The bulkhead and the leak are measured in this lesson.",
        },
        {
          type: "heading",
          text: "The three side by side",
        },
        {
          type: "table",
          headers: ["", "Semaphore", "Phaser", "Exchanger"],
          rows: [
            ["Answers", "\"At most N at once\"", "\"Everyone finishes stage k before stage k+1\", with a changing group", "\"Two threads swap objects\""],
            ["Who waits", "Threads asking for more permits than are free", "Parties that arrive and await the phase's end", "The first of a pair, until a partner comes"],
            ["Reusable", "Yes: permits come and go forever", "Yes: phase numbers count up", "Yes: every call is a new pairing"],
            ["Parties", "Any number of threads; permits are counts, not identities", "Registered dynamically (up to 65,535 per phaser)", "Exactly two per exchange"],
            ["Owner", "None: any thread may release", "None", "None"],
            ["Failure model", "None: a lost release just shrinks capacity, an extra release grows it", "None: a late party only delays the phase; timeouts don't break it", "None: a timeout just returns to the caller"],
            ["Built on", "AQS shared mode, `state` = free permits", "One `volatile long state` + two Treiber stacks of `QNode`", "A `slot` `Node`, then an arena of `Node`s, via `VarHandle` CAS"],
            ["Waiting thread in a dump", "`WAITING (parking)` on `Semaphore$NonfairSync` or `$FairSync`", "`WAITING (parking)` on `Phaser$QNode`", "`WAITING (parking)` on the `Exchanger` itself"],
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
            ["`new Semaphore(n)` / `new Semaphore(n, fair)`", "`n` permits, nonfair by default", "`n` may be 0 or negative: it then takes `1 - n` releases before anyone passes"],
            ["`acquire()` / `acquire(k)`", "Takes 1 (or `k`) permits, waiting if needed", "Interruptible; `acquireUninterruptibly` keeps waiting and restores the interrupt flag afterwards"],
            ["`tryAcquire()`", "Takes a permit only if one is free right now", "Barges even on a fair semaphore; `tryAcquire(0, unit)` respects fairness"],
            ["`tryAcquire(t, unit)`", "Waits up to `t`; returns `false` on timeout", "`false` means no permit: don't release"],
            ["`release()` / `release(k)`", "Adds 1 (or `k`) permits, wakes waiters", "Never checks that the caller acquired; only overflow past `Integer.MAX_VALUE` throws `Error`"],
            ["`availablePermits()`, `drainPermits()`, `getQueueLength()`", "Inspection; `drainPermits` takes all free permits", "`toString()` prints `[Permits = n]`"],
            ["`new Phaser(n)` / `new Phaser(parent, n)`", "A phaser with `n` registered parties, optionally a child of `parent`", "`n` up to 65,535; a child registers with its parent when it gets its first party"],
            ["`register()`, `bulkRegister(k)`", "Adds parties to the current phase", "Returns the phase number they joined in"],
            ["`arrive()`, `arriveAndDeregister()`, `arriveAndAwaitAdvance()`", "Arrive without waiting / arrive and leave / arrive and wait for the rest", "Return the phase number arrived at (or the next one, for `arriveAndAwaitAdvance`); negative once terminated"],
            ["`awaitAdvance(phase)`, `awaitAdvanceInterruptibly(phase, t, unit)`", "Wait for `phase` to end", "Returns at once if the phaser is already past `phase`"],
            ["`onAdvance(phase, parties)`", "Overridable hook run once per phase by the last arrival", "Return `true` to terminate; the default terminates when `parties == 0`"],
            ["`exchange(x)` / `exchange(x, t, unit)`", "Gives `x`, returns the partner's object", "`null` is allowed; the timed form throws `TimeoutException`"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Semaphore is AQS shared mode with state as the permits",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.Semaphore 'java.util.concurrent.Semaphore$Sync' \\
  'java.util.concurrent.Semaphore$NonfairSync' 'java.util.concurrent.Semaphore$FairSync'`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.Semaphore implements java.io.Serializable {
  private static final long serialVersionUID;
  private final java.util.concurrent.Semaphore$Sync sync;
  public java.util.concurrent.Semaphore(int);
  public java.util.concurrent.Semaphore(int, boolean);
  public void acquire() throws java.lang.InterruptedException;
  public void acquireUninterruptibly();
  public boolean tryAcquire();
  public boolean tryAcquire(long, java.util.concurrent.TimeUnit) throws java.lang.InterruptedException;
  public void release();
  ...
  public int availablePermits();
  public int drainPermits();
  protected void reducePermits(int);
  public boolean isFair();
  public final boolean hasQueuedThreads();
  public final int getQueueLength();
  protected java.util.Collection<java.lang.Thread> getQueuedThreads();
  public java.lang.String toString();
}
abstract class java.util.concurrent.Semaphore$Sync extends java.util.concurrent.locks.AbstractQueuedSynchronizer {
  java.util.concurrent.Semaphore$Sync(int);
  final int getPermits();
  final int nonfairTryAcquireShared(int);
  protected final boolean tryReleaseShared(int);
  final void reducePermits(int);
  final int drainPermits();
}
final class java.util.concurrent.Semaphore$NonfairSync extends java.util.concurrent.Semaphore$Sync {
  protected int tryAcquireShared(int);
}
final class java.util.concurrent.Semaphore$FairSync extends java.util.concurrent.Semaphore$Sync {
  protected int tryAcquireShared(int);
}`,
        },
        {
          type: "paragraph",
          text: "Like `CountDownLatch`, the semaphore is a shell: one `sync` field, an AQS subclass, and AQS's `volatile int state` holds the number of free permits. The constructor calls `setState(permits)`. The two subclasses differ only in `tryAcquireShared`. The whole algorithm is in four short methods, so here is their bytecode from `javap -c -p`, trimmed, with my notes after `//`:",
        },
        {
          type: "output",
          text: `  final int nonfairTryAcquireShared(int);          // NonfairSync.tryAcquireShared calls this
       0: aload_0
       1: invokevirtual #13     // Method getState:()I          available = state
       5: iload_2
       6: iload_1
       7: isub                  //                               remaining = available - acquires
       9: iload_3
      10: iflt          22      // remaining < 0: return it (negative = "queue me")
      16: invokevirtual #17     // Method compareAndSetState:(II)Z
      19: ifeq          24      // CAS lost: loop
      22: iload_3
      23: ireturn               // >= 0: success, and others may succeed too
      24: goto          0

  protected int tryAcquireShared(int);              // FairSync
       1: invokevirtual #7      // Method hasQueuedPredecessors:()Z
       4: ifeq          9
       7: iconst_m1
       8: ireturn               // someone is queued ahead of me: -1, go to the queue
       9: ...                   // then the same loop as above

  protected final boolean tryReleaseShared(int);
       1: invokevirtual #13     // Method getState:()I
       7: iadd                  //                               next = current + releases
      11: if_icmpge     24
      18: ldc           #23     // String Maximum permit count exceeded   (only on int overflow)
      23: athrow
      27: invokevirtual #17     // Method compareAndSetState:(II)Z
      33: iconst_1
      34: ireturn               // always true: always wake the queue
      35: goto          0

  public boolean tryAcquire();                      // on Semaphore itself
       5: invokevirtual #29     // Method Semaphore$Sync.nonfairTryAcquireShared:(I)I
       8: iflt          15      // nonfair even when the semaphore is fair`,
        },
        {
          type: "list",
          items: [
            "**Acquire is \"subtract and CAS\".** `remaining = state - acquires`; if that is negative, the method returns it without touching `state`, and AQS queues the thread as a **shared** node and parks it. Otherwise it CASes `state` down and returns the remainder. A non-negative result tells AQS that later shared waiters might also succeed, so a release can wake several of them in a chain (the same propagation the latch used).",
            "**Fair differs in one call.** `FairSync` first asks `hasQueuedPredecessors()`: if anyone is queued, it gives up immediately and joins the queue, even when permits are free. Nonfair just tries the CAS, so a newly arriving thread can **barge** past queued ones. That one branch is the whole throughput difference measured below.",
            "**Release has no owner check and no ceiling.** `tryReleaseShared` adds and CASes. It doesn't know who acquired, or how many permits the semaphore started with; the only check is for `int` overflow. Every `release()` is a +1, and it always returns `true`, so AQS always tries to wake the head of the queue.",
            "**`tryAcquire()` with no timeout calls `nonfairTryAcquireShared` directly**, on any semaphore. The Javadoc says so too: the untimed `tryAcquire()` barges even on a fair semaphore; `tryAcquire(0, TimeUnit.SECONDS)` goes through AQS and respects fairness. I checked that below.",
          ],
        },
        {
          type: "heading",
          text: "Watching the permits and the queue",
        },
        {
          type: "paragraph",
          text: "I read the private `sync` field with reflection to see which subclass a semaphore uses, then walked through acquires, a waiting multi-permit request, a release with no acquire, and the edge cases:",
        },
        {
          type: "code",
          language: "java",
          title: "SemaphorePeek.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.Semaphore;
import java.util.concurrent.locks.AbstractQueuedSynchronizer;

public class SemaphorePeek {
    // The private Sync is an AQS; reading it needs --add-opens java.base/java.util.concurrent
    static AbstractQueuedSynchronizer sync(Semaphore s) throws Exception {
        Field f = Semaphore.class.getDeclaredField("sync");
        f.setAccessible(true);
        return (AbstractQueuedSynchronizer) f.get(s);
    }

    static String show(Semaphore s) throws Exception {
        AbstractQueuedSynchronizer sync = sync(s);
        return sync.getClass().getSimpleName() + " " + s.toString().replaceAll(".*\\\\[", "[")
                + " queued=" + s.getQueueLength();
    }

    public static void main(String[] args) throws Exception {
        Semaphore maps = new Semaphore(4);                        // 4 concurrent calls to the maps API
        System.out.println("new Semaphore(4):        " + show(maps));
        maps.acquire(3);
        System.out.println("after acquire(3):        " + show(maps));

        Thread big = Thread.ofPlatform().name("route-batch").start(() -> {
            try { maps.acquire(2); System.out.println("  route-batch got 2 permits"); maps.release(2); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        while (maps.getQueueLength() == 0) Thread.onSpinWait();
        System.out.println("route-batch acquire(2):  " + show(maps) + " (needs 2, only 1 free)");
        System.out.println("  tryAcquire() by main: " + maps.tryAcquire() + " -> " + show(maps));
        maps.release(1);
        System.out.println("after release(1):        " + show(maps));
        maps.release(3);
        big.join();
        System.out.println("after release(3):        " + show(maps));

        maps.release();                                           // nobody acquired this one
        System.out.println("release() with no acquire: " + show(maps));
        System.out.println("drainPermits() returned " + maps.drainPermits() + ": " + show(maps));

        Semaphore negative = new Semaphore(-2);                   // allowed: 3 releases before anyone passes
        System.out.println("new Semaphore(-2):       " + show(negative) + ", tryAcquire " + negative.tryAcquire());
        negative.release(3);
        System.out.println("after release(3):        " + show(negative) + ", tryAcquire " + negative.tryAcquire());

        System.out.println("new Semaphore(1, true):  " + show(new Semaphore(1, true)));
        Semaphore top = new Semaphore(Integer.MAX_VALUE);
        try { top.release(); } catch (Error e) { System.out.println("release at MAX_VALUE:    " + e); }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED SemaphorePeek.java",
        },
        {
          type: "output",
          text: `new Semaphore(4):        NonfairSync [Permits = 4] queued=0
after acquire(3):        NonfairSync [Permits = 1] queued=0
route-batch acquire(2):  NonfairSync [Permits = 1] queued=1 (needs 2, only 1 free)
  tryAcquire() by main: true -> NonfairSync [Permits = 0] queued=1
after release(1):        NonfairSync [Permits = 1] queued=1
  route-batch got 2 permits
after release(3):        NonfairSync [Permits = 4] queued=0
release() with no acquire: NonfairSync [Permits = 5] queued=0
drainPermits() returned 5: NonfairSync [Permits = 0] queued=0
new Semaphore(-2):       NonfairSync [Permits = -2] queued=0, tryAcquire false
after release(3):        NonfairSync [Permits = 1] queued=0, tryAcquire true
new Semaphore(1, true):  FairSync [Permits = 1] queued=0
release at MAX_VALUE:    java.lang.Error: Maximum permit count exceeded`,
        },
        {
          type: "list",
          items: [
            "**`new Semaphore(4)` is a `NonfairSync`**; only `new Semaphore(n, true)` gives a `FairSync`. Nonfair is the default because it is much faster, as the next section measures.",
            "**A multi-permit request waits for all its permits at once.** `route-batch` asked for 2 with 1 free and queued. It doesn't take the 1 and wait for the other: AQS retries the whole `tryAcquireShared(2)` each time it's woken.",
            "**Barging, live.** While `route-batch` sat in the queue, `main`'s `tryAcquire()` took the single free permit. A nonfair semaphore lets a newcomer in ahead of a queued thread whenever the newcomer's request fits. Large requests can starve this way; the Examples section measures it.",
            "**`release()` with no acquire made 5 permits out of 4.** Nothing complained. The semaphore has no idea what \"4\" meant; it only counts. This is the root of the leak in the production section.",
            "**Negative initial permits are legal** and occasionally useful: `new Semaphore(-2)` needs three releases before anyone passes, like a latch that opens after three events but can then be used as a semaphore. `drainPermits()` takes every free permit and returns how many, a quick way to stop new work.",
          ],
        },
        {
          type: "heading",
          text: "Phaser keeps everything in one long",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -constants java.util.concurrent.Phaser 'java.util.concurrent.Phaser$QNode'`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.Phaser {
  private volatile long state;
  private static final int MAX_PARTIES = 65535;
  private static final int MAX_PHASE = 2147483647;
  private static final int PARTIES_SHIFT = 16;
  private static final int PHASE_SHIFT = 32;
  private static final int UNARRIVED_MASK = 65535;
  private static final long PARTIES_MASK = 4294901760l;
  private static final long COUNTS_MASK = 4294967295l;
  private static final long TERMINATION_BIT = -9223372036854775808l;
  private static final int ONE_ARRIVAL = 1;
  private static final int ONE_PARTY = 65536;
  private static final int ONE_DEREGISTER = 65537;
  private static final int EMPTY = 1;
  private final java.util.concurrent.Phaser parent;
  private final java.util.concurrent.Phaser root;
  private final java.util.concurrent.atomic.AtomicReference<java.util.concurrent.Phaser$QNode> evenQ;
  private final java.util.concurrent.atomic.AtomicReference<java.util.concurrent.Phaser$QNode> oddQ;
  private static final int NCPU;
  static final int SPINS_PER_ARRIVAL;
  private static final java.lang.invoke.VarHandle STATE;
  private int doArrive(int);
  private int doRegister(int);
  private long reconcileState();
  ...
  protected boolean onAdvance(int, int);
  private void releaseWaiters(int);
  private int internalAwaitAdvance(int, java.util.concurrent.Phaser$QNode);
}
final class java.util.concurrent.Phaser$QNode implements java.util.concurrent.ForkJoinPool$ManagedBlocker {
  final java.util.concurrent.Phaser phaser;
  final int phase;
  final boolean interruptible;
  final boolean timed;
  boolean wasInterrupted;
  long nanos;
  final long deadline;
  volatile java.lang.Thread thread;
  java.util.concurrent.Phaser$QNode next;
  ...
}`,
        },
        {
          type: "list",
          items: [
            "**No lock and no AQS.** A `Phaser` is one `volatile long state` changed with a CAS through the `STATE` VarHandle. The constants say how it is packed: the low 16 bits (`UNARRIVED_MASK`) count parties that haven't arrived yet, the next 16 bits (`PARTIES_SHIFT = 16`) count registered parties, bits 32 to 62 (`PHASE_SHIFT = 32`, `MAX_PHASE`) hold the phase number, and bit 63 (`TERMINATION_BIT`) marks termination. That's why one phaser can have at most `MAX_PARTIES = 65535` parties.",
            "**One CAS does several things at once.** `ONE_ARRIVAL = 1` subtracts one unarrived party. `ONE_PARTY = 65536` adds a registered party. `ONE_DEREGISTER = 65537` is both at once: arrive **and** leave in a single CAS. Because phase, parties and arrivals all live in the same word, a thread can never see a phase number that doesn't match the counts.",
            "**`EMPTY = 1` is a special value** for \"no parties at all\": a phaser with zero parties stores unarrived = 1 so that \"everyone arrived\" (unarrived = 0) can't be confused with \"nobody registered\".",
            "**Waiters go into two stacks, `evenQ` and `oddQ`**, chosen by whether the phase they wait for is even or odd. While phase k's waiters are being released from one stack, threads already waiting for phase k+1 push onto the other, so releasing one phase never races with queueing for the next. `SPINS_PER_ARRIVAL` is 256 on a multi-core machine (the static initialiser picks 1 if `availableProcessors() < 2`): a waiter spins before parking, which matters for the performance numbers later.",
            "**`parent` and `root` support tiering**: a child phaser registers with its parent as a single party, and the phase number lives in the root. A later section builds one.",
          ],
        },
        {
          type: "paragraph",
          text: "To see the packing, I read `state` with reflection after each operation and decoded the four fields with the same shifts and masks the class uses:",
        },
        {
          type: "code",
          language: "java",
          title: "PhaserState.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.Phaser;
import java.util.concurrent.atomic.AtomicReference;

public class PhaserState {
    // Phaser's private fields; needs --add-opens java.base/java.util.concurrent
    static Object field(Phaser p, String name) throws Exception {
        Field f = Phaser.class.getDeclaredField(name);
        f.setAccessible(true);
        return f.get(p);
    }

    static String show(String what, Phaser p) throws Exception {
        long s = (long) field(p, "state");
        return String.format("%-28s state=0x%016x  term=%d phase=%d parties=%d unarrived=%d", what, s,
                s >>> 63, (int) (s >>> 32) & Integer.MAX_VALUE, (int) (s >>> 16) & 0xFFFF, (int) s & 0xFFFF);
    }

    public static void main(String[] args) throws Exception {
        Phaser p = new Phaser(3);
        System.out.println(show("new Phaser(3)", p));
        p.arrive();
        System.out.println(show("one arrive()", p));
        p.arrive();
        p.arrive();
        System.out.println(show("third arrive(): phase 1", p));
        p.register();
        System.out.println(show("register()", p));
        p.arriveAndDeregister();
        System.out.println(show("arriveAndDeregister()", p));

        // A waiter parks in evenQ or oddQ, chosen by the phase it waits for
        Thread waiter = Thread.ofPlatform().name("payout-worker").start(() -> p.arriveAndAwaitAdvance());
        Thread.sleep(200);
        AtomicReference<?> evenQ = (AtomicReference<?>) field(p, "evenQ"), oddQ = (AtomicReference<?>) field(p, "oddQ");
        System.out.println(show("one party waiting", p));
        System.out.println("  phase " + p.getPhase() + " waiter queue: evenQ=" + name(evenQ.get()) + " oddQ=" + name(oddQ.get()));
        p.arrive(); p.arrive();
        waiter.join();
        System.out.println(show("rest arrived: phase 2", p));
        System.out.println("  " + p);

        p.forceTermination();
        System.out.println(show("forceTermination()", p));
        System.out.println("  getPhase()=" + p.getPhase() + ", arrive() returns " + p.arrive() + ", isTerminated=" + p.isTerminated());

        Phaser empty = new Phaser();
        System.out.println(show("new Phaser()", empty));
        empty.register();
        empty.arriveAndDeregister();
        System.out.println(show("last party deregisters", empty));
        System.out.println("  isTerminated=" + empty.isTerminated());
    }

    static String name(Object qnode) throws Exception {
        if (qnode == null) return "empty";
        Field t = qnode.getClass().getDeclaredField("thread");
        t.setAccessible(true);
        Field ph = qnode.getClass().getDeclaredField("phase");
        ph.setAccessible(true);
        return "QNode{thread=" + ((Thread) t.get(qnode)).getName() + ", phase=" + ph.get(qnode) + "}";
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED PhaserState.java",
        },
        {
          type: "output",
          text: `new Phaser(3)                state=0x0000000000030003  term=0 phase=0 parties=3 unarrived=3
one arrive()                 state=0x0000000000030002  term=0 phase=0 parties=3 unarrived=2
third arrive(): phase 1      state=0x0000000100030003  term=0 phase=1 parties=3 unarrived=3
register()                   state=0x0000000100040004  term=0 phase=1 parties=4 unarrived=4
arriveAndDeregister()        state=0x0000000100030003  term=0 phase=1 parties=3 unarrived=3
one party waiting            state=0x0000000100030002  term=0 phase=1 parties=3 unarrived=2
  phase 1 waiter queue: evenQ=empty oddQ=QNode{thread=payout-worker, phase=1}
rest arrived: phase 2        state=0x0000000200030003  term=0 phase=2 parties=3 unarrived=3
  java.util.concurrent.Phaser@18078bef[phase = 2 parties = 3 arrived = 0]
forceTermination()           state=0x8000000200030003  term=1 phase=2 parties=3 unarrived=3
  getPhase()=-2147483646, arrive() returns -2147483646, isTerminated=true
new Phaser()                 state=0x0000000000000001  term=0 phase=0 parties=0 unarrived=1
last party deregisters       state=0x8000000100000000  term=1 phase=1 parties=0 unarrived=0
  isTerminated=true`,
        },
        {
          type: "list",
          items: [
            "**Read the hex in four groups.** `0x0000000000030002` is phase `00000000`, parties `0003`, unarrived `0002`: three parties, one arrived. When the third party arrived, one CAS moved the word to `0x0000000100030003`: phase 1, and unarrived reset to the number of parties. Advancing a phase is literally \"add 1 to the top half and copy parties into unarrived\".",
            "**`register()` added to both counts** (`0x...00040004`), because a new party hasn't arrived in the current phase. `arriveAndDeregister()` subtracted from both in one CAS, back to `0x...00030003`.",
            "**The waiter for phase 1 went into `oddQ`**, as a `QNode` that records its thread and the phase it waits for. `evenQ` stayed empty. When phase 1 ended, the last arrival's `releaseWaiters` popped that stack and unparked the thread.",
            "**Termination sets bit 63 and keeps everything else** (`0x8000000200030003`). Because the top bit is the sign bit of the `int` that `getPhase()` returns, a terminated phaser reports a negative phase: `-2147483646` is phase 2 plus `Integer.MIN_VALUE`. Every `arrive` and `await` method returns that negative number immediately; that's the documented way to detect termination from a return value.",
            "**A phaser whose last party deregisters terminates itself.** The default `onAdvance(phase, registeredParties)` returns `registeredParties == 0`, so when `empty` lost its only party, the phase advanced to 1 and the termination bit was set (`0x8000000100000000`). That surprises people who register and deregister one worker at a time: the phaser can die between workers. The fix is to keep one extra party registered (a coordinator) until the end, as the examples do.",
          ],
        },
        {
          type: "heading",
          text: "Exchanger: a slot, then an arena",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -constants java.util.concurrent.Exchanger 'java.util.concurrent.Exchanger$Node'
javap -v 'java.util.concurrent.Exchanger$Node' | grep -A2 RuntimeVisibleAnnotations`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.Exchanger<V> {
  private static final int ASHIFT = 5;
  private static final int MMASK = 255;
  private static final int SEQ = 256;
  private static final int NCPU;
  static final int FULL;
  private static final int SPINS = 1024;
  private static final java.lang.Object NULL_ITEM;
  private static final java.lang.Object TIMED_OUT;
  private final java.util.concurrent.Exchanger$Participant participant;
  private volatile java.util.concurrent.Exchanger$Node[] arena;
  private volatile java.util.concurrent.Exchanger$Node slot;
  private volatile int bound;
  private static final java.lang.invoke.VarHandle BOUND;
  private static final java.lang.invoke.VarHandle SLOT;
  private static final java.lang.invoke.VarHandle MATCH;
  private static final java.lang.invoke.VarHandle AA;
  private final java.lang.Object arenaExchange(java.lang.Object, boolean, long);
  private final java.lang.Object slotExchange(java.lang.Object, boolean, long);
  ...
}
final class java.util.concurrent.Exchanger$Node {
  int index;
  int bound;
  int collides;
  int hash;
  java.lang.Object item;
  volatile java.lang.Object match;
  volatile java.lang.Thread parked;
}
RuntimeVisibleAnnotations:
  0: #27()
    jdk.internal.vm.annotation.Contended`,
        },
        {
          type: "list",
          items: [
            "**The common case is one `slot`.** The first thread CASes its `Node` (holding its `item`) into `slot` and spins, then parks. The second thread finds the node, CASes `slot` back to `null`, writes its own item into the node's `match` field and unparks the first. Each thread's `Node` comes from `participant`, a `ThreadLocal`, so exchanging doesn't allocate.",
            "**When the slot CAS fails, the arena appears.** In `slotExchange`'s bytecode, a failed CAS on `slot` is followed by `NCPU > 1`, `bound == 0`, a CAS of `bound` from 0 to `SEQ` (256), and then `anewarray Exchanger$Node` with size `(FULL + 2) << 5`. From then on, contending threads pair up in different arena slots instead of all hitting `slot`.",
            "**`ASHIFT = 5` spaces the used slots 32 elements apart**, so two busy slots never share a cache line, and `Node` itself is annotated `@Contended`, which pads it inside the JVM (the annotation is internal, but the JDK's own classes may use it). Both are against **false sharing**: two threads writing different variables that happen to sit in the same 64-byte cache line, which makes the cores fight over that line.",
            "**`bound` packs two things**: the low 8 bits (`MMASK`) are the highest arena index currently in use, and the rest is a sequence number bumped by `SEQ` on every change, so threads can tell a fresh `bound` from an old one with the same index (the ABA problem from Atomics and CAS).",
            "**`null` items are allowed**: `NULL_ITEM` is a private sentinel used inside the node in place of `null`, so \"nothing here yet\" and \"the partner sent null\" can't be confused.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "ExchangerPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Exchanger;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class ExchangerPeek {
    // Exchanger's private fields; needs --add-opens java.base/java.util.concurrent
    static Object field(Object o, Class<?> c, String name) throws Exception {
        Field f = c.getDeclaredField(name);
        f.setAccessible(true);
        return f.get(o);
    }

    static String show(Exchanger<?> x) throws Exception {
        Object slot = field(x, Exchanger.class, "slot");
        Object[] arena = (Object[]) field(x, Exchanger.class, "arena");
        String s = slot == null ? "null" : "Node{item=" + field(slot, slot.getClass(), "item") + "}";
        long used = arena == null ? 0 : java.util.Arrays.stream(arena).filter(n -> n != null).count();
        return "slot=" + s + ", arena=" + (arena == null ? "null" : "Node[" + arena.length + "] (" + used + " slots in use)")
                + ", bound=" + field(x, Exchanger.class, "bound");
    }

    public static void main(String[] args) throws Exception {
        System.out.println("NCPU=" + field(null, Exchanger.class, "NCPU") + ", FULL=" + field(null, Exchanger.class, "FULL"));
        Exchanger<String> x = new Exchanger<>();
        System.out.println("new Exchanger:       " + show(x));

        Thread a = Thread.ofPlatform().name("ping-reader").start(() -> {
            try { System.out.println("  ping-reader got " + x.exchange("FULL buffer #1")); } catch (InterruptedException e) { }
        });
        Thread.sleep(200);
        System.out.println("one thread waiting:  " + show(x));
        System.out.println("  main got " + x.exchange("EMPTY buffer #2"));
        a.join();
        System.out.println("after the swap:      " + show(x));

        // Now 8 threads exchanging as fast as they can: the slot CAS fails and the arena appears
        Exchanger<Integer> busy = new Exchanger<>();
        List<Thread> ts = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            int id = i;
            ts.add(Thread.ofPlatform().start(() -> {
                long end = System.nanoTime() + 500_000_000L;        // 0.5 s; timed, so nobody is left waiting forever
                try { while (System.nanoTime() < end) busy.exchange(id, 10, TimeUnit.MILLISECONDS); }
                catch (InterruptedException | TimeoutException e) { }
            }));
        }
        java.util.TreeSet<Integer> seen = new java.util.TreeSet<>();
        int maxBound = 0;
        while (ts.stream().anyMatch(Thread::isAlive)) {                 // sample the arena while they run
            Object[] ar = (Object[]) field(busy, Exchanger.class, "arena");
            if (ar != null) for (int i = 0; i < ar.length; i++) if (ar[i] != null) seen.add(i);
            maxBound = Math.max(maxBound, (int) field(busy, Exchanger.class, "bound") & 0xFF);
        }
        System.out.println("while busy: arena indexes seen in use " + seen + ", highest bound index " + maxBound);
        System.out.println("after 8 busy threads: " + show(busy));
        System.out.println("  bound=0x" + Integer.toHexString((int) field(busy, Exchanger.class, "bound"))
                + ": low 8 bits = highest arena index in use, the rest a sequence number");
    }
}`,
        },
        {
          type: "output",
          text: `NCPU=8, FULL=4
new Exchanger:       slot=null, arena=null, bound=0
one thread waiting:  slot=Node{item=FULL buffer #1}, arena=null, bound=0
  main got FULL buffer #1
  ping-reader got EMPTY buffer #2
after the swap:      slot=null, arena=null, bound=0
while busy: arena indexes seen in use [31, 63, 95, 127], highest bound index 3
after 8 busy threads: slot=null, arena=Node[192] (0 slots in use), bound=167168
  bound=0x28d00: low 8 bits = highest arena index in use, the rest a sequence number`,
        },
        {
          type: "list",
          items: [
            "**Two threads never needed the arena.** The waiting `ping-reader` sat in `slot` as a `Node` holding `FULL buffer #1`; `main` took it and handed back `EMPTY buffer #2`, and `slot` went back to `null`. `arena` stayed `null` the whole time.",
            "**Eight busy threads created a `Node[192]`.** On this 8-CPU machine `FULL` is `NCPU >>> 1` = 4, and `(4 + 2) << 5` = 192: room for `FULL` logical slots of 32 references each, plus spare space used as padding.",
            "**The used indexes were 31, 63, 95 and 127**: logical slots 0 to 3, each at `(i << 5) + 31`, 32 references apart. The highest index `bound` reached was 3, which is `FULL - 1`. In a second run I saw 31, 63 and 95, with a highest index of 2: the arena grows when threads collide and shrinks when they wait without a partner.",
            "**After the run the arena was empty but still allocated**, and `bound` was `0x28d00`: index 0 in the low byte and a sequence number of `0x28d` (653 changes of `bound`) above it. The arena is never freed, but it costs only 192 references.",
            "**Why I used timed exchanges:** my first version had each thread do 200,000 untimed exchanges and it hung. Eight threads pair up in arbitrary combinations, so some thread finished early and the last thread had exchanges left and nobody to pair with. With an exchanger, \"the other side may never come\" is a real case; the timed form is the defence.",
          ],
        },
        {
          type: "heading",
          text: "All three in a thread dump",
        },
        {
          type: "code",
          language: "java",
          title: "ParkedOnSync.java",
          code: `import java.util.concurrent.Exchanger;
import java.util.concurrent.Phaser;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

public class ParkedOnSync {
    public static void main(String[] args) throws Exception {
        Semaphore maps = new Semaphore(0);                       // no permits: callers wait
        Phaser payout = new Phaser(2);
        Exchanger<String> buffers = new Exchanger<>();

        Thread.ofPlatform().name("quote-1").start(() -> {
            try { maps.acquire(); } catch (InterruptedException e) { }
        });
        Thread.ofPlatform().name("quote-2").start(() -> {
            try { maps.tryAcquire(5, TimeUnit.MINUTES); } catch (InterruptedException e) { }
        });
        Thread.ofPlatform().name("payout-KOLKATA").start(payout::arriveAndAwaitAdvance);
        Thread.ofPlatform().name("ping-reader").start(() -> {
            try { buffers.exchange("full"); } catch (InterruptedException e) { }
        });
        Thread.sleep(300);
        System.out.println(maps + ", " + payout);
        Thread.sleep(60_000);                                    // time for: jcmd ParkedOnSync Thread.print -l
        System.exit(0);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d . ParkedOnSync.java && java ParkedOnSync &
jcmd ParkedOnSync Thread.print -l`,
        },
        {
          type: "output",
          text: `java.util.concurrent.Semaphore@610455d6[Permits = 0], java.util.concurrent.Phaser@511d50c0[phase = 0 parties = 2 arrived = 1]

"quote-1" #20 [895086] prio=5 os_prio=0 cpu=0.43ms elapsed=3.78s tid=0x00007188740f7290 nid=895086 waiting on condition  [0x000071885c6fe000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x00000000ffd15980> (a java.util.concurrent.Semaphore$NonfairSync)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:788)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireSharedInterruptibly(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1133)
	at java.util.concurrent.Semaphore.acquire(java.base@21.0.13.0.3/Semaphore.java:318)
	at ParkedOnSync.lambda$main$0(ParkedOnSync.java:13)
	...

   Locked ownable synchronizers:
	- None

"quote-2" #21 [895087] ... waiting on condition
   java.lang.Thread.State: TIMED_WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x00000000ffd15980> (a java.util.concurrent.Semaphore$NonfairSync)
	at java.util.concurrent.locks.LockSupport.parkNanos(java.base@21.0.13.0.3/LockSupport.java:269)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:790)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.tryAcquireSharedNanos(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1160)
	at java.util.concurrent.Semaphore.tryAcquire(java.base@21.0.13.0.3/Semaphore.java:415)
	at ParkedOnSync.lambda$main$1(ParkedOnSync.java:16)
	...

"payout-KOLKATA" #22 [895088] ... waiting on condition
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x00000000ffb00a50> (a java.util.concurrent.Phaser$QNode)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
	at java.util.concurrent.Phaser$QNode.block(java.base@21.0.13.0.3/Phaser.java:1133)
	at java.util.concurrent.ForkJoinPool.unmanagedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3780)
	at java.util.concurrent.ForkJoinPool.managedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3725)
	at java.util.concurrent.Phaser.internalAwaitAdvance(java.base@21.0.13.0.3/Phaser.java:1063)
	at java.util.concurrent.Phaser.arriveAndAwaitAdvance(java.base@21.0.13.0.3/Phaser.java:685)
	...

"ping-reader" #23 [895089] ... waiting on condition
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x00000000ffd1b000> (a java.util.concurrent.Exchanger)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
	at java.util.concurrent.Exchanger.slotExchange(java.base@21.0.13.0.3/Exchanger.java:503)
	at java.util.concurrent.Exchanger.exchange(java.base@21.0.13.0.3/Exchanger.java:566)
	at ParkedOnSync.lambda$main$2(ParkedOnSync.java:20)
	...`,
        },
        {
          type: "list",
          items: [
            "**Semaphore waiters park on `Semaphore$NonfairSync`** (or `$FairSync`) under `acquireSharedInterruptibly` and `Semaphore.acquire`; the timed `tryAcquire` shows `TIMED_WAITING` and `tryAcquireSharedNanos`. Both quote threads point at the same address, `0x...ffd15980`, so a dump with 200 threads on one address means 200 requests waiting for the same permits: a bulkhead doing its job, or a leak of permits in the other direction (acquires that are never released).",
            "**Phaser waiters park on a `Phaser$QNode`**, their own node, not on the phaser. Each waiter has a different address, so grouping by \"parking to wait for\" doesn't work; look for `Phaser.internalAwaitAdvance` in the stack instead. The `ForkJoinPool.managedBlock` frames are there because `QNode` is a `ManagedBlocker`: inside a `ForkJoinPool`, the pool can add a spare thread while one blocks in a phaser.",
            "**Exchanger waiters park on the `Exchanger` object itself**, under `slotExchange` (or `arenaExchange` when contended). In a dump, one thread parked in `Exchanger.exchange` for a long time means its partner died or stopped calling.",
            "**No owners anywhere.** `Locked ownable synchronizers` is `None` for all four threads, and none of these appear in the JVM's deadlock report. A permit that will never be released, a party that will never arrive, and an exchange partner that will never come all look like ordinary waiting.",
          ],
        },
        {
          type: "heading",
          text: "How long they waited, from JFR",
        },
        {
          type: "paragraph",
          text: "A dump shows who is waiting; JFR's `jdk.ThreadPark` event shows how long each wait took and on what class. One thread waits about 300 ms for a permit held by `main`, another about 500 ms for a phaser party:",
        },
        {
          type: "code",
          language: "java",
          title: "PermitParks.java",
          code: `import java.util.concurrent.Phaser;
import java.util.concurrent.Semaphore;

public class PermitParks {
    public static void main(String[] args) throws Exception {
        Semaphore maps = new Semaphore(1);
        Phaser payout = new Phaser(2);
        maps.acquire();                                       // main holds the only maps permit
        Thread quote = Thread.ofPlatform().name("quote-1").start(() -> {
            maps.acquireUninterruptibly();                    // waits about 300 ms
            maps.release();
        });
        Thread shard = Thread.ofPlatform().name("payout-PUNE").start(payout::arriveAndAwaitAdvance);
        Thread.sleep(300);
        maps.release();
        Thread.sleep(200);
        payout.arrive();                                      // the shard waited about 500 ms
        quote.join();
        shard.join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:StartFlightRecording:filename=parks.jfr,settings=profile PermitParks
jfr print --events jdk.ThreadPark parks.jfr`,
        },
        {
          type: "output",
          text: `jdk.ThreadPark {
  startTime = 01:14:00.734 (2026-11-16)
  duration = 339 ms
  parkedClass = java.util.concurrent.Semaphore$NonfairSync (classLoader = bootstrap)
  timeout = N/A
  until = N/A
  address = 0xFE4E7F98
  eventThread = "quote-1" (javaThreadId = 24)
  stackTrace = [
    jdk.internal.misc.Unsafe.park(boolean, long)
    java.util.concurrent.locks.LockSupport.park(Object) line: 221
    java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(AbstractQueuedSynchronizer$Node, int, boolean, boolean, boolean, long) line: 788
    java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireShared(int) line: 1113
    java.util.concurrent.Semaphore.acquireUninterruptibly() line: 341
    ...
  ]
}

jdk.ThreadPark {
  startTime = 01:14:00.736 (2026-11-16)
  duration = 562 ms
  parkedClass = java.util.concurrent.Phaser$QNode (classLoader = bootstrap)
  timeout = N/A
  until = N/A
  address = 0xFE376688
  eventThread = "payout-PUNE" (javaThreadId = 25)
  stackTrace = [
    jdk.internal.misc.Unsafe.park(boolean, long)
    java.util.concurrent.locks.LockSupport.park(Object) line: 221
    java.util.concurrent.Phaser$QNode.block() line: 1133
    java.util.concurrent.ForkJoinPool.unmanagedBlock(ForkJoinPool$ManagedBlocker) line: 3780
    java.util.concurrent.ForkJoinPool.managedBlock(ForkJoinPool$ManagedBlocker) line: 3725
    ...
  ]
}`,
        },
        {
          type: "list",
          items: [
            "**`parkedClass = Semaphore$NonfairSync` is the bulkhead metric you get for free.** Summed per `parkedClass` in JDK Mission Control, it answers \"how much request time went into waiting for maps permits\", without adding any code.",
            "**The durations were longer than the sleeps** (339 and 562 ms against 300 and 500), because both threads started parking before `main` began sleeping; JFR times the park itself. The `acquireUninterruptibly` path goes through `acquireShared`, not `acquireSharedInterruptibly`, which is how to tell the two kinds of waiter apart in a stack.",
          ],
        },
      ],
    },
    {
      title: "Semaphore: Fair vs Nonfair, Measured",
      blocks: [
        {
          type: "paragraph",
          text: "Fairness decides who gets a permit that has just been released: the longest-waiting thread (fair) or whoever happens to ask first, including a thread that has never waited (nonfair). I ran 8 threads on a `Semaphore(2)` for one second each way. Each thread does a little work while holding a permit and the same amount outside it, and records how many permits it got and its longest single wait:",
        },
        {
          type: "code",
          language: "java",
          title: "FairVsNonfair.java",
          code: `import java.util.Arrays;
import java.util.concurrent.Semaphore;

public class FairVsNonfair {
    static volatile boolean stop;
    static long sink;

    static void work(int n) {                                     // a little CPU work while holding a permit
        long x = 0;
        for (int i = 0; i < n; i++) x += i * 31L;
        sink += x;
    }

    static void run(boolean fair, int threads, int permits, long millis) throws Exception {
        Semaphore s = new Semaphore(permits, fair);
        long[] perThread = new long[threads];
        long[] maxWaitNanos = new long[threads];
        Thread[] ts = new Thread[threads];
        stop = false;
        for (int i = 0; i < threads; i++) {
            int id = i;
            ts[i] = Thread.ofPlatform().start(() -> {
                long count = 0, maxWait = 0;
                while (!stop) {
                    long t = System.nanoTime();
                    s.acquireUninterruptibly();
                    long waited = System.nanoTime() - t;
                    if (waited > maxWait) maxWait = waited;
                    try { work(200); } finally { s.release(); }
                    count++;
                    work(200);                                    // some work outside the permit too
                }
                perThread[id] = count;
                maxWaitNanos[id] = maxWait;
            });
        }
        Thread.sleep(millis);
        stop = true;
        for (Thread t : ts) t.join();
        long total = Arrays.stream(perThread).sum();
        long min = Arrays.stream(perThread).min().getAsLong(), max = Arrays.stream(perThread).max().getAsLong();
        long worstWait = Arrays.stream(maxWaitNanos).max().getAsLong();
        System.out.printf("%-8s %,11d acquires/s   per thread min %,9d max %,9d (max/min %.1f)   worst wait %,7d us%n",
                fair ? "fair" : "nonfair", total * 1000 / millis, min, max, (double) max / min, worstWait / 1_000);
    }

    public static void main(String[] args) throws Exception {
        for (int round = 0; round < 2; round++) {                 // first round warms up the JIT
            if (round == 1) System.out.println("8 threads, Semaphore(2), 1 s each:");
            run(false, 8, 2, round == 0 ? 300 : 1000);
            run(true, 8, 2, round == 0 ? 300 : 1000);
        }
    }
}`,
        },
        {
          type: "output",
          text: `8 threads, Semaphore(2), 1 s each:
nonfair    6,720,047 acquires/s   per thread min   807,808 max   878,559 (max/min 1.1)   worst wait   4,937 us
fair         201,984 acquires/s   per thread min    25,205 max    25,313 (max/min 1.0)   worst wait   1,180 us`,
        },
        {
          type: "list",
          items: [
            "**Nonfair was 33 to 47 times faster.** Over three runs: 6.7 to 7.1 million acquires per second nonfair, 150,000 to 200,000 fair. The reason is in the bytecode: a fair acquire with anyone queued goes straight to the queue and parks, and every release must unpark a sleeping thread, which takes microseconds. A nonfair release usually finds a running thread that grabs the permit by CAS in nanoseconds, while the queued thread is still waking up.",
            "**Fair spread the permits perfectly**: per-thread counts within 1% of each other (max/min 1.0). Nonfair was still reasonably even here (1.1 to 1.2), because all threads did the same work.",
            "**Fair had the shorter worst-case wait**: 1.2 to 5.3 ms against 4.9 to 10.9 ms nonfair. With nonfair permits, an unlucky thread can lose the race several times in a row. Fairness buys a bound on waiting, paid for with throughput.",
            "**The `sink` field is only there so the JIT can't delete `work`.** Its updates race between threads, which doesn't matter for a value nobody reads.",
          ],
        },
        {
          type: "paragraph",
          text: "There is one more fairness detail that the bytecode predicted: the untimed `tryAcquire()` always uses the nonfair path. I set up a thread waiting for 2 permits with 1 free, then tried to take the free one both ways:",
        },
        {
          type: "code",
          language: "java",
          title: "FairBarging.java",
          code: `import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

public class FairBarging {
    public static void main(String[] args) throws Exception {
        for (boolean fair : new boolean[] {false, true}) {
            Semaphore s = new Semaphore(1, fair);
            Thread big = Thread.ofPlatform().start(() -> {
                try { s.acquire(2); s.release(2); } catch (InterruptedException e) { }
            });
            while (s.getQueueLength() == 0) Thread.onSpinWait();   // big waits for 2, 1 is free
            boolean timedZero = s.tryAcquire(0, TimeUnit.SECONDS);
            if (timedZero) s.release();
            boolean untimed = s.tryAcquire();
            System.out.printf("%-7s with a thread queued: tryAcquire(0, SECONDS)=%-5b tryAcquire()=%b%n",
                    fair ? "fair" : "nonfair", timedZero, untimed);
            s.release(untimed ? 2 : 1);
            big.join();
        }
    }
}`,
        },
        {
          type: "output",
          text: `nonfair with a thread queued: tryAcquire(0, SECONDS)=true  tryAcquire()=true
fair    with a thread queued: tryAcquire(0, SECONDS)=false tryAcquire()=true`,
        },
        {
          type: "paragraph",
          text: "On the fair semaphore, `tryAcquire(0, SECONDS)` refused because a thread was queued ahead, while `tryAcquire()` took the permit anyway. If you chose a fair semaphore so that a large request can't be starved, every untimed `tryAcquire()` in the code base quietly undoes that choice. Use `tryAcquire(0, unit)` when fairness matters.",
        },
      ],
    },
    {
      title: "acquire and release: The Rules",
      blocks: [
        {
          type: "paragraph",
          text: "A lock has an owner, so `unlock()` by the wrong thread throws `IllegalMonitorStateException`. A semaphore has no owner, so a wrong `release()` is accepted and simply adds a permit. Two patterns produce wrong releases. I ran both against a `Semaphore(4)` guarding a 200 ms maps call, with 16 request threads making 5 quotes each:",
        },
        {
          type: "code",
          language: "java",
          title: "PermitLeak.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class PermitLeak {
    static final AtomicInteger inMaps = new AtomicInteger(), maxInMaps = new AtomicInteger();

    static void callMaps() throws InterruptedException {
        maxInMaps.accumulateAndGet(inMaps.incrementAndGet(), Math::max);
        try { Thread.sleep(200); } finally { inMaps.decrementAndGet(); }
    }

    interface Call { void run(Semaphore s) throws InterruptedException; }

    // 16 request threads, 5 quotes each, against a Semaphore(4)
    static void load(String label, Call call) throws InterruptedException {
        Semaphore s = new Semaphore(4);
        inMaps.set(0); maxInMaps.set(0);
        List<Thread> ts = new ArrayList<>();
        for (int i = 0; i < 16; i++) {
            ts.add(Thread.ofPlatform().start(() -> {
                for (int k = 0; k < 5; k++) {
                    try { call.run(s); } catch (InterruptedException e) { return; }
                }
            }));
        }
        for (Thread t : ts) t.join();
        System.out.printf("%-34s permits after: %3d (started with 4), most calls in flight: %2d%n",
                label, s.availablePermits(), maxInMaps.get());
    }

    public static void main(String[] args) throws Exception {
        // Bug 1: release in finally even when tryAcquire failed
        load("buggy: release after failed try", s -> {
            boolean got = s.tryAcquire(50, TimeUnit.MILLISECONDS);
            try {
                if (got) callMaps();                     // otherwise serve a cached ETA
            } finally {
                s.release();                             // runs for the failures too
            }
        });

        // The fix: return before the try when there is no permit
        load("fixed: release only after acquire", s -> {
            if (!s.tryAcquire(50, TimeUnit.MILLISECONDS)) return;   // cached ETA
            try {
                callMaps();
            } finally {
                s.release();
            }
        });

        // Bug 2: acquire() inside the try; an interrupt while waiting still runs release()
        Semaphore one = new Semaphore(1);
        one.acquire();                                   // main holds the only permit
        Thread waiter = Thread.ofPlatform().start(() -> {
            try {
                one.acquire();
                // ... work ...
            } catch (InterruptedException e) {
                System.out.println("waiter interrupted while acquiring");
            } finally {
                one.release();                           // releases a permit it never got
            }
        });
        while (one.getQueueLength() == 0) Thread.onSpinWait();
        waiter.interrupt();
        waiter.join();
        System.out.println("main still holds the permit, yet availablePermits() = " + one.availablePermits()
                + ", tryAcquire by another thread: " + one.tryAcquire());
    }
}`,
        },
        {
          type: "output",
          text: `buggy: release after failed try    permits after:  16 (started with 4), most calls in flight: 16
fixed: release only after acquire  permits after:   4 (started with 4), most calls in flight:  4
waiter interrupted while acquiring
main still holds the permit, yet availablePermits() = 1, tryAcquire by another thread: true`,
        },
        {
          type: "list",
          items: [
            "**The buggy version turned 4 permits into 16, and let 16 calls into the maps API at once.** Every failed `tryAcquire` was followed by a `release()`, adding a permit nobody had taken. The more the semaphore said no, the more permits it gained, until every one of the 16 threads could get in. It stopped at 16 only because there were 16 threads; with a server's 200 request threads it would have stopped at 200. The result was identical in all three runs.",
            "**The fix is structural: acquire before `try`, release in its `finally`.** If the acquire fails or throws, the method leaves before the `try` and nothing is released. The fixed version ended with exactly 4 permits and never had more than 4 calls in flight.",
            "**`acquire()` inside the `try` has the same bug on interrupt.** The waiter was interrupted while queued, `acquire()` threw `InterruptedException`, and `finally` released a permit it never had. `main` still held the only permit, yet the semaphore now showed 1 free and another thread took it: two holders of a \"one at a time\" semaphore.",
            "**`availablePermits()` above the configured limit is the alarm.** A healthy bulkhead's free permits are always between 0 and its size. Exporting `availablePermits()` as a gauge and alerting when it exceeds the limit would have caught the production incident at the end of this lesson in minutes.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Release in a different thread is allowed, and easy to get wrong",
          text: "Because permits have no owner, one thread may acquire and another release: for example, acquire before submitting an async call and release in its completion callback. That's legitimate, but then every path must release exactly once: success, failure, timeout and cancellation. A `whenComplete` callback runs on all of them, which makes it the right place; a release in `thenAccept` alone leaks a permit on every failure. CompletableFuture in Depth covers those callbacks.",
        },
      ],
    },
    {
      title: "A Semaphore as a Bulkhead",
      blocks: [
        {
          type: "paragraph",
          text: "A **bulkhead** is named after the walls that divide a ship's hull into compartments, so one leak can't flood the whole ship. In a service, it is a limit on how many threads may be busy with one dependency, so a slow dependency can't tie up every thread. I simulated a fare service with 8 request threads (like a small web server's worker pool) serving two endpoints for 2 seconds: `GET /trips/{id}/status`, 5 ms of work, 50 per second, and `POST /quote`, which needs an ETA from a maps API that is having a bad day and takes 1 second per call, about 17 per second. Three versions: no protection, a `Semaphore(3)` with a 20 ms `tryAcquire`, and a dedicated 3-thread pool with a 300 ms `Future.get` timeout:",
        },
        {
          type: "code",
          language: "java",
          title: "Bulkhead.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class Bulkhead {
    static final AtomicInteger inMaps = new AtomicInteger(), maxInMaps = new AtomicInteger();

    // The maps API is having a bad day: every call takes 1 second
    static String callMapsApi() throws InterruptedException {
        maxInMaps.accumulateAndGet(inMaps.incrementAndGet(), Math::max);
        try { Thread.sleep(1_000); return "eta 7 min"; } finally { inMaps.decrementAndGet(); }
    }

    static String cachedEta() { return "eta ~8 min (cached)"; }

    interface Quote { String get() throws Exception; }

    static void run(String label, Quote quote) throws Exception {
        inMaps.set(0); maxInMaps.set(0);
        ExecutorService requestThreads = Executors.newFixedThreadPool(8);    // like a server's 8 worker threads
        List<Long> status = Collections.synchronizedList(new ArrayList<>());
        List<Long> quotes = Collections.synchronizedList(new ArrayList<>());
        AtomicInteger fallbacks = new AtomicInteger();
        long end = System.nanoTime() + 2_000_000_000L;
        int tick = 0;
        while (System.nanoTime() < end) {                            // 2 s of traffic
            long submitted = System.nanoTime();
            requestThreads.execute(() -> {                           // GET /trips/{id}/status: 5 ms of work
                try { Thread.sleep(5); } catch (InterruptedException e) { return; }
                status.add((System.nanoTime() - submitted) / 1_000_000);
            });
            if (tick++ % 3 == 0) {                                   // POST /quote: needs an ETA, about 17 per second
                requestThreads.execute(() -> {
                    try { if (quote.get().contains("cached")) fallbacks.incrementAndGet(); } catch (Exception e) { }
                    quotes.add((System.nanoTime() - submitted) / 1_000_000);
                });
            }
            Thread.sleep(20);                                        // 50 status requests per second
        }
        requestThreads.shutdown();
        requestThreads.awaitTermination(1, TimeUnit.MINUTES);
        System.out.printf("%-30s trip-status n=%d p50 %,5d ms max %,5d ms | quote n=%d p50 %,5d ms max %,5d ms, %d cached | max in maps %d%n",
                label, status.size(), pct(status, 50), pct(status, 100), quotes.size(), pct(quotes, 50), pct(quotes, 100),
                fallbacks.get(), maxInMaps.get());
    }

    static long pct(List<Long> xs, int p) {
        List<Long> s = new ArrayList<>(xs);
        Collections.sort(s);
        return s.get(Math.max(0, (int) Math.ceil(p / 100.0 * s.size()) - 1));
    }

    public static void main(String[] args) throws Exception {
        run("no bulkhead", Bulkhead::callMapsApi);

        Semaphore mapsPermits = new Semaphore(3);
        run("Semaphore(3), tryAcquire 20 ms", () -> {
            if (!mapsPermits.tryAcquire(20, TimeUnit.MILLISECONDS)) return cachedEta();   // shed load
            try { return callMapsApi(); } finally { mapsPermits.release(); }
        });

        ThreadPoolExecutor mapsPool = new ThreadPoolExecutor(3, 3, 0, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(3), new ThreadPoolExecutor.AbortPolicy());
        run("3-thread pool + get(300 ms)", () -> {
            Future<String> f;
            try { f = mapsPool.submit(Bulkhead::callMapsApi); } catch (RejectedExecutionException e) { return cachedEta(); }
            try { return f.get(300, TimeUnit.MILLISECONDS); }
            catch (TimeoutException e) { f.cancel(true); return cachedEta(); }
        });
        mapsPool.shutdownNow();
    }
}`,
        },
        {
          type: "output",
          text: `no bulkhead                    trip-status n=99 p50 1,063 ms max 2,157 ms | quote n=33 p50 2,060 ms max 3,124 ms, 0 cached | max in maps 8
Semaphore(3), tryAcquire 20 ms trip-status n=100 p50     5 ms max     5 ms | quote n=34 p50    20 ms max 1,000 ms, 28 cached | max in maps 3
3-thread pool + get(300 ms)    trip-status n=100 p50     5 ms max     5 ms | quote n=34 p50   300 ms max   301 ms, 34 cached | max in maps 3`,
        },
        {
          type: "list",
          items: [
            "**Without a bulkhead, the slow maps API took down an endpoint that never calls it.** All 8 request threads ended up inside `callMapsApi`, and trip-status requests queued behind them: median 1,063 ms and up to 2,157 ms for 5 ms of work. Quotes themselves waited 2 to 3 seconds. The three runs agreed to within 10 ms.",
            "**`Semaphore(3)` kept trip-status at 5 ms** (a worst case of 5 to 7 ms over three runs). At most 3 threads could be inside the maps call (`max in maps 3`), so at least 5 always served everything else. Quotes that couldn't get a permit within 20 ms got a cached ETA (27 or 28 of 33 or 34). The 6 quotes that did get a permit still waited the full 1,000 ms: a semaphore limits **how many** wait, not **how long**.",
            "**A dedicated pool with `get(timeout)` limits both.** Callers waited at most 300 ms and then fell back (all 34 here, because the API never answered within 300 ms); `cancel(true)` interrupted the stuck call. Its cost is a thread hand-off per call and a second pool to size and monitor. Libraries like Resilience4j offer both kinds: a `SemaphoreBulkhead` and a `ThreadPoolBulkhead`.",
            "**Pick the permit count from the dependency, not the caller.** 3 here is \"what the maps vendor and our latency budget can take\": with 1 s calls, 3 permits means at most 3 quotes per second get a live ETA. The rest is the fallback's job.",
          ],
        },
        {
          type: "heading",
          text: "With virtual threads, the semaphore is the limit",
        },
        {
          type: "paragraph",
          text: "With platform threads, a fixed pool size limits concurrency as a side effect. Virtual threads are not pooled: one per task, as many as there are tasks. Then a `Semaphore` is the place to put the limit a downstream service needs:",
        },
        {
          type: "code",
          language: "java",
          title: "VirtualLimit.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

public class VirtualLimit {
    public static void main(String[] args) throws Exception {
        Semaphore maps = new Semaphore(20);                       // the maps vendor allows 20 concurrent calls
        AtomicInteger inFlight = new AtomicInteger(), maxInFlight = new AtomicInteger();
        long t = System.nanoTime();
        try (ExecutorService perRequest = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 1_000; i++) {
                perRequest.submit(() -> {
                    maps.acquire();                               // a virtual thread parks here, its carrier is freed
                    try {
                        maxInFlight.accumulateAndGet(inFlight.incrementAndGet(), Math::max);
                        Thread.sleep(10);                         // the maps call
                        inFlight.decrementAndGet();
                    } finally {
                        maps.release();
                    }
                    return null;
                });
            }
        }
        System.out.printf("1,000 virtual threads, Semaphore(20), 10 ms calls: %d ms, most in flight %d%n",
                (System.nanoTime() - t) / 1_000_000, maxInFlight.get());
    }
}`,
        },
        {
          type: "output",
          text: `1,000 virtual threads, Semaphore(20), 10 ms calls: 529 ms, most in flight 20`,
        },
        {
          type: "paragraph",
          text: "A thousand virtual threads, never more than 20 inside the call, done in 529 and 534 ms in two runs (the ideal is 1,000 / 20 × 10 ms = 500 ms). Waiting in `acquire()` parks the virtual thread through AQS and frees its carrier thread, so the 980 waiters cost a little memory each and no platform threads. This is the pattern the JDK documentation recommends for virtual threads: limit the scarce resource with a semaphore, not the threads with a pool.",
        },
      ],
    },
    {
      title: "Semaphore Limits Concurrency, Not Rate",
      blocks: [
        {
          type: "paragraph",
          text: "A common misreading: \"the maps vendor allows 5 requests per second, so use `new Semaphore(5)`\". A semaphore bounds how many calls are **in flight at once**. The number per second then depends entirely on how long each call takes. I let 8 threads call through the same `Semaphore(5)` for one second with three call durations, then tried the usual home-made fix, a timer that refills permits every second:",
        },
        {
          type: "code",
          language: "java",
          title: "RateVsConcurrency.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class RateVsConcurrency {
    // 8 threads call the maps API as fast as a Semaphore(5) lets them, for 1 second
    static int callsPerSecond(long callMillis) throws InterruptedException {
        Semaphore permits = new Semaphore(5);
        AtomicInteger calls = new AtomicInteger();
        long end = System.nanoTime() + 1_000_000_000L;
        List<Thread> ts = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            ts.add(Thread.ofPlatform().start(() -> {
                while (System.nanoTime() < end) {
                    permits.acquireUninterruptibly();
                    try {
                        Thread.sleep(callMillis);
                        calls.incrementAndGet();
                    } catch (InterruptedException e) {
                        return;
                    } finally {
                        permits.release();
                    }
                }
            }));
        }
        for (Thread t : ts) t.join();
        return calls.get();
    }

    // A "rate limiter" built by refilling a semaphore every second; capped or not
    static void refill(boolean capped) throws InterruptedException {
        int perSecond = 20;
        Semaphore tokens = new Semaphore(perSecond);
        ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor();
        timer.scheduleAtFixedRate(() -> {
            int add = capped ? perSecond - tokens.availablePermits() : perSecond;
            if (add > 0) tokens.release(add);
        }, 1, 1, TimeUnit.SECONDS);
        Thread.sleep(3_200);                               // a quiet period: nobody calls
        int burst = 0;
        while (tokens.tryAcquire()) burst++;               // then a spike takes everything at once
        timer.shutdownNow();
        System.out.printf("refill %-8s after 3 s idle, calls allowed instantly: %d (limit says %d/s)%n",
                capped ? "capped" : "uncapped", burst, perSecond);
    }

    public static void main(String[] args) throws Exception {
        callsPerSecond(1);                                 // warm-up
        for (long ms : new long[] {1, 10, 100}) {
            System.out.printf("Semaphore(5), each call %3d ms: %,5d calls in 1 s%n", ms, callsPerSecond(ms));
        }
        refill(false);
        refill(true);
    }
}`,
        },
        {
          type: "output",
          text: `Semaphore(5), each call   1 ms: 2,602 calls in 1 s
Semaphore(5), each call  10 ms:   427 calls in 1 s
Semaphore(5), each call 100 ms:    53 calls in 1 s
refill uncapped after 3 s idle, calls allowed instantly: 80 (limit says 20/s)
refill capped   after 3 s idle, calls allowed instantly: 20 (limit says 20/s)`,
        },
        {
          type: "list",
          items: [
            "**The same `Semaphore(5)` allowed 2,602, 427 or 53 calls per second**, depending only on call duration (2,484, 405 and 53 in a second run). A 1 ms call ran at about 500 times the \"5 per second\" someone meant. The 1 ms case reached about half its theoretical 5,000 because `Thread.sleep(1)` sleeps longer than 1 ms on Linux and the loop has overhead. If the vendor's limit is per second, a semaphore protects nothing when the vendor is fast, which is exactly when you'll send the most.",
            "**Refilling permits on a timer is a rate limiter, but the naive refill is wrong.** The uncapped version added 20 permits every second whether or not they'd been used, so after 3 quiet seconds a spike got 80 calls through instantly, four times the limit. That's the \"release raises the count with no ceiling\" rule again.",
            "**The capped refill tops up to the limit instead** (`perSecond - availablePermits()`) and allowed exactly 20. It is still a crude fixed-window limiter: 20 at 0.99 s and 20 more at 1.01 s is 40 in 20 ms. For real rate limits use a proper token bucket (Guava's `RateLimiter`, Resilience4j's `RateLimiter`, or the vendor's own client), and for limits shared by many service instances, a central one, because each instance's semaphore only knows its own calls.",
            "**Often both are needed**: a rate limiter for the vendor's contract, and a semaphore bulkhead so a slow vendor can't hold all your threads.",
          ],
        },
      ],
    },
    {
      title: "Phaser: Phases, Parties and onAdvance",
      blocks: [
        {
          type: "paragraph",
          text: "A `CyclicBarrier` needs the same number of parties every round. A nightly payout run doesn't work like that: each city shard goes through \"collect trips\", \"compute payouts\" and \"publish to bank\" in step with the others, but a city with no trips has nothing to compute, and a city that went live today joins halfway. The coordinator (`main`) is a party only while it sets things up. `onAdvance` prints a stage report after each phase and stops the phaser after the last stage:",
        },
        {
          type: "code",
          language: "java",
          title: "PayoutPhases.java",
          code: `import java.util.List;
import java.util.concurrent.Phaser;

public class PayoutPhases {
    static final List<String> STAGES = List.of("collect trips", "compute payouts", "publish to bank");

    public static void main(String[] args) throws Exception {
        // onAdvance runs once per phase, in the last party to arrive; returning true terminates the phaser
        Phaser payout = new Phaser(1) {                          // 1 = the coordinator (main)
            @Override
            protected boolean onAdvance(int phase, int registeredParties) {
                System.out.printf("  phase %d (%s) done by %s, %d parties registered%n",
                        phase, STAGES.get(phase), Thread.currentThread().getName(), registeredParties);
                return phase == STAGES.size() - 1 || registeredParties == 0;
            }
        };

        for (String city : List.of("KOLKATA", "PUNE", "INDORE")) {
            payout.register();                                   // one party per city shard
            Thread.ofPlatform().name("shard-" + city).start(() -> runShard(payout, city));
        }

        // The coordinator takes part in phase 0 only, then leaves
        int arrivedAt = payout.arriveAndDeregister();             // returns the phase it arrived at
        System.out.println("main deregistered in phase " + arrivedAt + ", still registered " + payout.getRegisteredParties());

        Thread.sleep(150);                                       // a late shard joins in phase 1
        int joinedIn = payout.register();
        System.out.println("shard-SURAT registered in phase " + joinedIn);
        Thread.ofPlatform().name("shard-SURAT").start(() -> runShard(payout, "SURAT"));

        while (!payout.isTerminated()) Thread.sleep(20);
        System.out.println("terminated: getPhase()=" + payout.getPhase() + " (negative once terminated), parties " + payout.getRegisteredParties());
    }

    static void runShard(Phaser payout, String city) {
        while (!payout.isTerminated()) {
            int phase = payout.getPhase();
            if (city.equals("INDORE") && phase == 1) {           // no trips today: nothing to pay out
                System.out.println("  shard-INDORE has no payouts, leaves at phase " + phase);
                payout.arriveAndDeregister();
                return;
            }
            sleep(city.equals("KOLKATA") ? 120 : 60);            // this stage's work for the city
            payout.arriveAndAwaitAdvance();
        }
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `main deregistered in phase 0, still registered 3
  phase 0 (collect trips) done by shard-KOLKATA, 3 parties registered
shard-SURAT registered in phase 1
  shard-INDORE has no payouts, leaves at phase 1
  phase 1 (compute payouts) done by shard-KOLKATA, 3 parties registered
  phase 2 (publish to bank) done by shard-KOLKATA, 3 parties registered
terminated: getPhase()=-2147483645 (negative once terminated), parties 3`,
        },
        {
          type: "list",
          items: [
            "**Parties changed between and during phases.** Phase 0 had `main` plus three shards; `main` left with `arriveAndDeregister()` (counting as its arrival for phase 0). In phase 1, INDORE left and SURAT joined, so phase 1 still had 3 parties: KOLKATA, PUNE and SURAT. A `CyclicBarrier` can't do either.",
            "**`onAdvance` ran once per phase, in the last thread to arrive** (KOLKATA, the slowest at 120 ms per stage), like a barrier action. Its return value is the termination decision: `true` after the last stage. The order of the INDORE and SURAT lines changed between runs; the phase reports never did.",
            "**`register()` returns the phase you joined in.** SURAT's registration returned 1, so it took part in phase 1 and phase 1 could not end without it. A party registered in the middle of a phase is a full member of that phase.",
            "**After termination `getPhase()` is negative**: `-2147483645` is phase 3 plus `Integer.MIN_VALUE`. The last advance moved the phase from 2 to 3 and set the termination bit in the same CAS. The shards' loops checked `isTerminated()` and ended.",
            "**Keeping `main` registered at the start mattered.** Without the initial party, the first shard to register and arrive could complete phase 0 alone before the others registered. Registering a coordinator party first and deregistering it when setup is done is the standard Phaser idiom.",
          ],
        },
        {
          type: "heading",
          text: "A timeout doesn't break a Phaser",
        },
        {
          type: "paragraph",
          text: "In the previous lesson, one 300 ms timeout broke a `CyclicBarrier` for every party, permanently. A `Phaser` has no broken state. `arrive()` and `awaitAdvanceInterruptibly(phase, timeout, unit)` are separate calls, and a timeout only ends one thread's wait. The same three zones, with HOWRAH slow once:",
        },
        {
          type: "code",
          language: "java",
          title: "PhaserTimeout.java",
          code: `import java.util.concurrent.Phaser;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class PhaserTimeout {
    public static void main(String[] args) throws Exception {
        Phaser tick = new Phaser(3);
        long t0 = System.nanoTime();
        for (String zone : new String[] {"SALT-LAKE", "NEW-TOWN", "HOWRAH"}) {
            Thread.ofPlatform().name(zone).start(() -> {
                for (int round = 0; round < 3; round++) {
                    long work = zone.equals("HOWRAH") && round == 0 ? 700 : 50;     // HOWRAH is slow once
                    sleep(work);
                    int phase = tick.arrive();                    // arrive without waiting
                    try {
                        tick.awaitAdvanceInterruptibly(phase, 300, TimeUnit.MILLISECONDS);
                        System.out.printf("%4d ms  %-9s phase %d advanced%n", ms(t0), zone, phase);
                    } catch (TimeoutException e) {
                        System.out.printf("%4d ms  %-9s phase %d TimeoutException, phaser still fine: phase %d, unarrived %d%n",
                                ms(t0), zone, phase, tick.getPhase(), tick.getUnarrivedParties());
                        tick.awaitAdvance(phase);                 // decide: wait on, or skip; nothing is broken
                    } catch (InterruptedException e) {
                        return;
                    }
                }
            });
        }
        Thread.sleep(2_000);
        System.out.println("final phase " + tick.getPhase() + ", terminated " + tick.isTerminated());
    }

    static long ms(long t0) { return (System.nanoTime() - t0) / 1_000_000; }
    static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }
}`,
        },
        {
          type: "output",
          text: ` 352 ms  SALT-LAKE phase 0 TimeoutException, phaser still fine: phase 0, unarrived 1
 352 ms  NEW-TOWN  phase 0 TimeoutException, phaser still fine: phase 0, unarrived 1
 702 ms  HOWRAH    phase 0 advanced
 753 ms  HOWRAH    phase 1 advanced
 753 ms  SALT-LAKE phase 1 advanced
 753 ms  NEW-TOWN  phase 1 advanced
 806 ms  NEW-TOWN  phase 2 advanced
 806 ms  HOWRAH    phase 2 advanced
 806 ms  SALT-LAKE phase 2 advanced
final phase 3, terminated false`,
        },
        {
          type: "list",
          items: [
            "**Both fast zones timed out at 352 ms** (50 ms of work plus the 300 ms timeout), and the phaser was untouched: still phase 0, one party unarrived. They chose to keep waiting with `awaitAdvance(phase)`, and phase 0 ended when HOWRAH arrived at 702 ms. Phases 1 and 2 then ran normally, 50 ms apart. A barrier in the same situation would have thrown `BrokenBarrierException` at every later `await`.",
            "**The decision after a timeout is the caller's.** It can keep waiting, as here, or skip the phase and use stale data, or call `forceTermination()` to stop everyone. Nothing happens to the other parties unless someone decides it should.",
            "**`arrive()` plus a separate await is a useful split.** A thread can arrive, do unrelated work, and only then wait for the phase (or never wait at all: a producer that just reports \"my part of phase k is done\").",
            "**The flip side: nothing tells the others that a party is in trouble.** With a barrier, failure spreads loudly; with a phaser, a party that never arrives makes the phase wait forever, silently. Use timed waits, and log `getUnarrivedParties()` when one expires.",
          ],
        },
      ],
    },
    {
      title: "Tiered Phasers",
      blocks: [
        {
          type: "paragraph",
          text: "Every arrival on a phaser is a CAS on one `long`. With thousands of parties on many cores, that word becomes a hot spot. **Tiering** splits the parties across child phasers that share a root: each child counts its own arrivals and, when all of its parties have arrived, arrives once at its parent. I first checked how a tree is wired, then compared 64 threads on one flat phaser, on a tree of 8 children with 8 parties each, and on a `CyclicBarrier`, for 2,000 phases with no work in between (best of the later repetitions, after one warm-up):",
        },
        {
          type: "code",
          language: "java",
          title: "PhaserTiers.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Phaser;

public class PhaserTiers {
    interface Setup { Runnable[] parties(int n); }

    // n threads each run 'phases' rounds of: tiny work, then wait for everyone
    static long run(int n, int phases, Setup setup) throws Exception {
        Runnable[] awaits = setup.parties(n);
        List<Thread> ts = new ArrayList<>();
        long t = System.nanoTime();
        for (int i = 0; i < n; i++) {
            Runnable await = awaits[i];
            ts.add(Thread.ofPlatform().start(() -> { for (int k = 0; k < phases; k++) await.run(); }));
        }
        for (Thread th : ts) th.join();
        return (System.nanoTime() - t) / phases;
    }

    public static void main(String[] args) throws Exception {
        // 1. How a tree is wired: a child registers with its parent when it gets its first party
        Phaser root = new Phaser();
        Phaser zoneA = new Phaser(root), zoneB = new Phaser(root);
        System.out.println("before: root parties " + root.getRegisteredParties());
        zoneA.bulkRegister(3);
        System.out.println("zoneA.bulkRegister(3): zoneA parties " + zoneA.getRegisteredParties()
                + ", root parties " + root.getRegisteredParties());
        zoneB.bulkRegister(2);
        System.out.println("zoneB.bulkRegister(2): root parties " + root.getRegisteredParties()
                + ", zoneB.getRoot()==root " + (zoneB.getRoot() == root));
        for (int i = 0; i < 3; i++) zoneA.arrive();
        System.out.println("all of zoneA arrived: zoneA phase " + zoneA.getPhase() + ", root " + root
                .toString().replaceAll(".*\\\\[", "["));
        for (int i = 0; i < 2; i++) zoneB.arrive();
        System.out.println("all of zoneB arrived: zoneA phase " + zoneA.getPhase() + ", zoneB phase " + zoneB.getPhase()
                + ", root phase " + root.getPhase());

        // 2. Cost per phase with 64 threads: one flat phaser, a tree of 8 x 8, a CyclicBarrier
        int n = 64, phases = 2_000;
        for (int rep = 0; rep < 3; rep++) {
            long flat = run(n, phases, k -> {
                Phaser p = new Phaser(k);
                Runnable[] r = new Runnable[k];
                for (int i = 0; i < k; i++) r[i] = p::arriveAndAwaitAdvance;
                return r;
            });
            long tree = run(n, phases, k -> {
                Phaser top = new Phaser();
                Phaser[] leaves = new Phaser[k / 8];
                for (int j = 0; j < leaves.length; j++) leaves[j] = new Phaser(top, 8);
                Runnable[] r = new Runnable[k];
                for (int i = 0; i < k; i++) { Phaser leaf = leaves[i / 8]; r[i] = leaf::arriveAndAwaitAdvance; }
                return r;
            });
            long barrier = run(n, phases, k -> {
                CyclicBarrier b = new CyclicBarrier(k);
                Runnable[] r = new Runnable[k];
                for (int i = 0; i < k; i++) r[i] = () -> { try { b.await(); } catch (Exception e) { throw new RuntimeException(e); } };
                return r;
            });
            if (rep > 0) System.out.printf("64 threads: flat Phaser %,6d us/phase   8x8 tree %,6d us/phase   CyclicBarrier %,6d us/phase%n",
                    flat / 1_000, tree / 1_000, barrier / 1_000);
        }
    }
}`,
        },
        {
          type: "output",
          text: `before: root parties 0
zoneA.bulkRegister(3): zoneA parties 3, root parties 1
zoneB.bulkRegister(2): root parties 2, zoneB.getRoot()==root true
all of zoneA arrived: zoneA phase 0, root [phase = 0 parties = 2 arrived = 1]
all of zoneB arrived: zoneA phase 1, zoneB phase 1, root phase 1
64 threads: flat Phaser    832 us/phase   8x8 tree    983 us/phase   CyclicBarrier  1,451 us/phase
64 threads: flat Phaser  1,204 us/phase   8x8 tree  1,982 us/phase   CyclicBarrier  1,773 us/phase`,
        },
        {
          type: "list",
          items: [
            "**A child is one party of its parent.** `zoneA.bulkRegister(3)` made the root's party count 1, not 3: the child registered itself with the root when it got its first parties. When all three of zoneA's parties arrived, zoneA arrived once at the root (`arrived = 1`), and zoneA's own phase stayed 0: a child's phase follows the root. Only when zoneB also finished did the root advance, and both children moved to phase 1 together.",
            "**On this 8-core machine, tiering didn't pay off.** Across three runs (six measurements), the flat phaser took 779 to 1,204 microseconds per phase, the 8×8 tree 732 to 1,982, and the barrier 1,029 to 1,773. With 64 threads on 8 cores, the cost is waking 64 parked threads every phase, not CAS contention on one word. The load average was between 10 and 31 during these runs because other benchmarks were running, so treat the ranges as rough.",
            "**Tiering is for many cores and many parties**: hundreds of threads on a large machine, where every arrival's CAS on a single `state` fails and retries. The `Phaser` Javadoc suggests it for that case. For a handful of parties, a flat phaser is simpler and at least as fast.",
            "**The flat phaser beat the barrier in five of six measurements**, and the Performance section shows why the gap is much larger with few threads: phaser waiters spin before parking.",
          ],
        },
      ],
    },
    {
      title: "Exchanger: Double Buffering",
      blocks: [
        {
          type: "paragraph",
          text: "The classic use of an `Exchanger` is **double buffering**: one thread fills a buffer while another drains a second one, and when both are done they swap. Only two buffers ever exist, nobody allocates per batch, and the two stages overlap. A location-ingest service reads GPS pings from drivers' phones (about 30 ms to read and parse 1,000 pings) and writes them to the location store (about 30 ms per batch). I ran 20 batches with one thread doing both stages, then with two threads and an exchanger:",
        },
        {
          type: "code",
          language: "java",
          title: "PingBuffers.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Exchanger;

public class PingBuffers {
    static final int BATCHES = 20, BATCH_SIZE = 1_000;

    // Reading 1,000 GPS pings from the socket and parsing them: about 30 ms
    static void fill(List<String> buf, int batch) throws InterruptedException {
        Thread.sleep(30);
        for (int i = 0; i < BATCH_SIZE; i++) buf.add("driver-" + (i % 50) + "@batch" + batch);
    }

    // Writing a batch to the location store: about 30 ms
    static void write(List<String> buf) throws InterruptedException {
        Thread.sleep(30);
        buf.clear();
    }

    public static void main(String[] args) throws Exception {
        // One thread does both, one after the other
        long t = System.nanoTime();
        List<String> only = new ArrayList<>();
        for (int b = 0; b < BATCHES; b++) { fill(only, b); write(only); }
        System.out.printf("one thread, fill then write: %4d ms%n", (System.nanoTime() - t) / 1_000_000);

        // Two threads, two buffers, swapped with an Exchanger
        Exchanger<List<String>> swap = new Exchanger<>();
        Set<Integer> buffersSeen = ConcurrentHashMap.newKeySet();
        long[] waitedNs = new long[2];
        t = System.nanoTime();
        Thread reader = Thread.ofPlatform().name("ping-reader").start(() -> {
            List<String> filling = new ArrayList<>();
            try {
                for (int b = 0; b < BATCHES; b++) {
                    fill(filling, b);
                    buffersSeen.add(System.identityHashCode(filling));
                    long w = System.nanoTime();
                    filling = swap.exchange(filling);      // give the full one, get the empty one back
                    waitedNs[0] += System.nanoTime() - w;
                }
                swap.exchange(null);                       // end of stream
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        Thread writer = Thread.ofPlatform().name("ping-writer").start(() -> {
            List<String> draining = new ArrayList<>();
            int written = 0;
            try {
                while (true) {
                    long w = System.nanoTime();
                    draining = swap.exchange(draining);    // give the empty one, get the full one
                    waitedNs[1] += System.nanoTime() - w;
                    if (draining == null) break;
                    buffersSeen.add(System.identityHashCode(draining));
                    written += draining.size();
                    write(draining);
                }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            System.out.println("writer stored " + written + " pings");
        });
        reader.join();
        writer.join();
        System.out.printf("two threads + Exchanger:     %4d ms, distinct buffers used: %d, reader waited %d ms, writer waited %d ms%n",
                (System.nanoTime() - t) / 1_000_000, buffersSeen.size(), waitedNs[0] / 1_000_000, waitedNs[1] / 1_000_000);
    }
}`,
        },
        {
          type: "output",
          text: `one thread, fill then write: 1221 ms
writer stored 20000 pings
two threads + Exchanger:      649 ms, distinct buffers used: 2, reader waited 0 ms, writer waited 41 ms`,
        },
        {
          type: "list",
          items: [
            "**The two stages overlapped and the run took about half as long**: 637 to 658 ms against 1,219 to 1,250 ms over three runs. While the writer stored batch k, the reader was already parsing batch k+1.",
            "**Only two buffer objects were ever used.** The reader's full list became the writer's, and the writer's emptied list came back to the reader. No allocation per batch and no queue of buffers, which is why exchangers appear in low-garbage pipelines.",
            "**The waits show who is faster.** The writer waited 32 to 49 ms in total, most of it at the start for the first batch; the reader waited 0 to 11 ms. If one side were much slower, the other would spend most of its time parked in `exchange`, and the speed-up would vanish: double buffering only hides the shorter stage behind the longer one.",
            "**The exchange is also a memory barrier.** Everything the reader wrote into the list before `exchange` is visible to the writer after its `exchange` returns (the Javadoc states this happens-before rule), so the plain `ArrayList` needs no extra synchronization. Each buffer is only ever touched by one thread at a time.",
            "**`null` as an end-of-stream marker works because `Exchanger` allows `null` items.** It's a design choice, not a requirement; a dedicated empty sentinel list would be clearer in a bigger program.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Exchanger vs a pair of queues",
          text: "The same pipeline can be built with two `ArrayBlockingQueue`s (full buffers one way, empty buffers back), and that version extends to more buffers and more threads, which an exchanger can't. An `Exchanger` is the right tool only when there are exactly two partners that swap symmetrically; with three threads, nobody controls who pairs with whom.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing a `Semaphore(4)` bulkhead call, a three-party `Phaser` round and one exchange:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`new Semaphore(4)`** creates a `NonfairSync` and calls `setState(4)`. Nothing else exists: no owner field, no record of the initial 4.",
            "**A request thread calls `tryAcquire(20, MILLISECONDS)`.** AQS's `tryAcquireSharedNanos` calls `tryAcquireShared(1)`, which reads `state` (4), computes 3, CASes 4 to 3 and returns 3. The call returns `true` without queueing.",
            "**Four permits are taken; a fifth caller arrives.** `tryAcquireShared` computes -1 and returns it without a CAS. AQS adds a shared node to the queue and parks the thread with `parkNanos` for the remaining timeout. In a dump it is now `TIMED_WAITING (parking)` on `Semaphore$NonfairSync`.",
            "**A holder calls `release()`** in its `finally`. `tryReleaseShared(1)` CASes 0 to 1 and returns `true`, and AQS unparks the head of the queue. Meanwhile a brand-new caller may CAS 1 to 0 first (barging); the woken thread then finds 0 and parks again. A `FairSync` would have refused the newcomer because `hasQueuedPredecessors()` was true.",
            "**The fifth caller's 20 ms run out.** AQS cancels its node and `tryAcquire` returns `false`. The caller serves a cached ETA and, if written correctly, never calls `release()`. If it does, `state` goes up by one permanently.",
            "**`new Phaser(3)`** stores `0x0000000000030003` in `state`: phase 0, 3 parties, 3 unarrived. **A party calls `arriveAndAwaitAdvance()`.** `doArrive` CASes `state` down by `ONE_ARRIVAL` to `...030002`; since unarrived isn't 0, it calls `internalAwaitAdvance(0, null)`, which spins up to 256 times per arrival it sees, then pushes a `QNode` onto `evenQ` (phase 0 is even) and parks.",
            "**The second party does the same** (`...030001`). **The third party's CAS brings unarrived to 0.** It is the last arrival, so it calls `onAdvance(0, 3)`. If that returns `false`, it computes the next state, phase 1 with unarrived reset to parties (`0x0000000100030003`), sets it, and calls `releaseWaiters(0)`, which pops `evenQ` and unparks each waiting thread. If `onAdvance` returns `true`, the termination bit is set in the same write.",
            "**`register()` and `arriveAndDeregister()`** are the same CAS with different deltas: `+ONE_PARTY` adds to both parties and unarrived, `-ONE_DEREGISTER` subtracts from both. A child phaser whose party count goes from 0 to 1 also registers once with its parent; its phase number is read from the root.",
            "**An exchange.** Thread A calls `exchange(x)`, finds `slot` empty, CASes its own `Node` (item `x`) into `slot`, spins, then parks on the `Exchanger`. Thread B calls `exchange(y)`, finds A's node, CASes `slot` back to `null`, takes `x`, writes `y` into the node's `match`, unparks A and returns `x`. A wakes, reads `match` and returns `y`.",
            "**If B's CAS on `slot` loses to a third thread**, the slow path CASes `bound` from 0 to 256 and allocates `arena = new Node[(FULL + 2) << 5]`. From then on, threads pick arena slots 32 references apart, and the arena's active size grows on collisions and shrinks on timeouts without a partner.",
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
          title: "SyncTour.java",
          code: `import java.util.concurrent.Exchanger;
import java.util.concurrent.Phaser;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class SyncTour {
    public static void main(String[] args) throws Exception {
        // 1. Semaphore: acquire before try, release in finally
        Semaphore maps = new Semaphore(2);
        maps.acquire();
        try {
            System.out.println("1. holding 1 of 2, available " + maps.availablePermits());
        } finally {
            maps.release();
        }

        // 2. tryAcquire with a timeout: false means "no permit", so don't release
        maps.acquire(2);
        boolean got = maps.tryAcquire(10, TimeUnit.MILLISECONDS);
        System.out.println("2. all taken, tryAcquire(10 ms) = " + got);
        maps.release(2);

        // 3. Phaser: parties can register and leave; arrive returns the phase number
        Phaser phaser = new Phaser(1);
        phaser.register();
        System.out.print("3. parties " + phaser.getRegisteredParties());
        phaser.arrive();
        phaser.arriveAndDeregister();
        System.out.println(", now phase " + phaser.getPhase() + " with parties " + phaser.getRegisteredParties());

        // 4. onAdvance decides when to stop
        Phaser threeRounds = new Phaser(1) {
            protected boolean onAdvance(int phase, int parties) { return phase >= 2; }
        };
        while (!threeRounds.isTerminated()) threeRounds.arriveAndAwaitAdvance();
        System.out.println("4. terminated after 3 phases, isTerminated " + threeRounds.isTerminated());

        // 5. Exchanger: two threads swap objects
        Exchanger<String> swap = new Exchanger<>();
        Thread.ofPlatform().start(() -> {
            try { swap.exchange("full buffer"); } catch (InterruptedException e) { }
        });
        System.out.println("5. main gave \\"empty buffer\\", got \\"" + swap.exchange("empty buffer") + "\\"");

        // 6. exchange with a timeout when the partner may not come
        try {
            swap.exchange("alone", 10, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            System.out.println("6. no partner within 10 ms: TimeoutException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `1. holding 1 of 2, available 1
2. all taken, tryAcquire(10 ms) = false
3. parties 2, now phase 1 with parties 1
4. terminated after 3 phases, isTerminated true
5. main gave "empty buffer", got "full buffer"
6. no partner within 10 ms: TimeoutException`,
        },
        {
          type: "paragraph",
          text: "The output was the same on every run. Part 3 shows that `arriveAndDeregister()` counts as an arrival: with one `arrive()` and one arrive-and-leave, both parties of phase 0 had arrived, so the phase advanced and one party remained. In part 4, a single party loops through phases 0, 1 and 2, and `onAdvance` returning `true` after phase 2 ends the loop.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Weighted permits and starvation",
        },
        {
          type: "paragraph",
          text: "Payout exports share a budget of 10 database connections. A driver statement needs 1 connection; a full city report runs four queries in parallel and needs 4, taken with `acquire(4)`. Nine threads keep producing 2 ms driver statements. How long does the city report wait for its 4 permits?",
        },
        {
          type: "code",
          language: "java",
          title: "WeightedPermits.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

public class WeightedPermits {
    static volatile boolean stop;

    // 9 threads keep running 1-permit driver statements; one city report needs 4 of the 10 permits
    static void run(boolean fair) throws Exception {
        Semaphore dbBudget = new Semaphore(10, fair);            // 10 database connections for exports
        AtomicInteger statements = new AtomicInteger();
        stop = false;
        List<Thread> small = new ArrayList<>();
        for (int i = 0; i < 9; i++) {
            small.add(Thread.ofPlatform().start(() -> {
                while (!stop) {
                    dbBudget.acquireUninterruptibly();           // a driver statement: 1 connection
                    try { Thread.sleep(2); } catch (InterruptedException e) { return; }
                    finally { dbBudget.release(); }
                    statements.incrementAndGet();
                }
            }));
        }
        Thread.sleep(200);                                       // the small jobs are flowing
        long t = System.nanoTime();
        dbBudget.acquireUninterruptibly(4);                      // the city report: 4 connections at once
        long waitedMs = (System.nanoTime() - t) / 1_000_000;
        dbBudget.release(4);
        stop = true;
        for (Thread th : small) th.join();
        System.out.printf("%-7s acquire(4) waited %,5d ms while %,d statements ran%n",
                fair ? "fair" : "nonfair", waitedMs, statements.get());
    }

    public static void main(String[] args) throws Exception {
        run(false);
        run(true);
    }
}`,
        },
        {
          type: "output",
          text: `nonfair acquire(4) waited   307 ms while 2,149 statements ran
fair    acquire(4) waited     1 ms while 888 statements ran`,
        },
        {
          type: "list",
          items: [
            "**Nonfair, the big request waited 29 to 422 ms** over four runs; fair, it waited 1 ms every time. With nine 1-permit users on 10 permits, there are rarely 4 free at the same moment. Nonfair, every released permit goes to whichever small job asks next, and the queued `acquire(4)` keeps finding 1 or 2 free. Fair, once the report is queued, new small requests line up behind it, the running ones finish, and 4 permits collect within a couple of milliseconds.",
            "**The statement counts include the 200 ms warm-up**, so the difference (2,149 against 888) mostly reflects the extra 300 ms the nonfair run lasted.",
            "**Weighted permits are a good fit for \"cost\" limits** (connections, memory, CPU slots), but mixing small and large weights on a nonfair semaphore starves the large ones. Use a fair semaphore, or give large jobs their own semaphore.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: A Phaser as a latch whose count isn't known in advance",
        },
        {
          type: "paragraph",
          text: "Document checks for new drivers: each document is a task, and checking an insurance document discovers two more checks (the insurer's API and the vehicle registration). A `CountDownLatch` needs its count up front. A `Phaser` doesn't: register before submitting each task, `arriveAndDeregister()` in its `finally`, and wait for phase 0 to end:",
        },
        {
          type: "code",
          language: "java",
          title: "DocumentChecks.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Phaser;
import java.util.concurrent.atomic.AtomicInteger;

public class DocumentChecks {
    // Each driver has some documents; a document may need extra checks discovered while checking it
    static final Map<String, List<String>> DOCS = Map.of(
            "Asha", List.of("licence", "insurance"),
            "Ravi", List.of("licence", "insurance", "permit"),
            "Imran", List.of("licence"));

    public static void main(String[] args) throws Exception {
        Phaser pending = new Phaser(1);                          // 1 = main, so phase 0 can't end early
        AtomicInteger checks = new AtomicInteger();
        try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
            DOCS.forEach((driver, docs) -> docs.forEach(doc -> submit(pool, pending, checks, driver, doc, 0)));
            System.out.println("submitted the first wave, registered parties now " + pending.getRegisteredParties());
            pending.arriveAndAwaitAdvance();                     // wait until every task, old and new, has deregistered
            System.out.println("all checks done: " + checks.get() + " checks, parties left " + pending.getRegisteredParties()
                    + ", phase " + pending.getPhase());
        }
    }

    static void submit(ExecutorService pool, Phaser pending, AtomicInteger checks, String driver, String doc, int depth) {
        pending.register();                                      // register BEFORE handing the task over
        pool.execute(() -> {
            try {
                Thread.sleep(20);
                checks.incrementAndGet();
                if (doc.equals("insurance") && depth == 0) {     // insurance needs the insurer and the vehicle checked too
                    submit(pool, pending, checks, driver, "insurer-api", 1);
                    submit(pool, pending, checks, driver, "vehicle-reg", 1);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                pending.arriveAndDeregister();                   // like countDown in finally
            }
        });
    }
}`,
        },
        {
          type: "output",
          text: `submitted the first wave, registered parties now 7
all checks done: 10 checks, parties left 1, phase 1`,
        },
        {
          type: "list",
          items: [
            "**The count grew while the work ran.** Six documents plus `main` made 7 parties; the two insurance checks registered four more tasks before they themselves deregistered. Phase 0 ended only when all ten tasks had left and `main` had arrived: `10 checks`, the same in every run.",
            "**Register before submitting, in the submitting thread.** If the task registered itself, there would be a window where the parent had deregistered and the child hadn't registered yet, and phase 0 could end early with work still pending.",
            "**`main`'s own party is what keeps phase 0 open** while the first wave is being submitted, exactly like the coordinator in `PayoutPhases`. After `arriveAndAwaitAdvance()` it is still registered (`parties left 1`), so the phaser didn't terminate. For this shape of problem, a `CompletableFuture` per task combined with `allOf` is often clearer; the phaser shines when tasks are plain `Runnable`s and the tree of subtasks is unknown.",
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
            ["At most N concurrent calls to a dependency", "`Semaphore(N)`, `tryAcquire(timeout)` before `try`, `release` in `finally`, a fallback when refused", "Sizing the shared request pool and hoping"],
            ["The calls must also be cut off after a deadline", "A dedicated bounded pool + `Future.get(timeout)` (or `orTimeout`), or a semaphore plus a client-level timeout", "A semaphore alone: it limits how many wait, not how long"],
            ["\"At most N per second\"", "A token-bucket rate limiter (Guava, Resilience4j), central if shared across instances", "`Semaphore(N)`, or a refill timer without a cap"],
            ["Limit concurrency with virtual threads", "`Semaphore` around the scarce resource", "A fixed pool of virtual threads"],
            ["Jobs with different costs share a budget", "`acquire(k)` on a fair semaphore, or one semaphore per job size", "Weighted permits on a nonfair semaphore (large jobs starve)"],
            ["Workers in lockstep stages, group may change", "`Phaser` with a coordinator party and `onAdvance`", "`CyclicBarrier` (fixed parties, breaks on timeout)"],
            ["Wait for a set of tasks whose number grows as they run", "`Phaser`: register before submit, `arriveAndDeregister` in `finally`", "`CountDownLatch` (count fixed up front)"],
            ["Thousands of parties on a large machine", "Tiered `Phaser`s", "One flat phaser or barrier"],
            ["Two threads hand buffers back and forth", "`Exchanger` (with timed `exchange`)", "Allocating a new buffer per batch"],
            ["More than two threads, or more than two buffers", "A pair of `BlockingQueue`s", "`Exchanger` (pairing is arbitrary)"],
            ["Mutual exclusion with an owner", "`ReentrantLock` or `synchronized`", "`Semaphore(1)` (no owner, no reentrancy, any thread can release)"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Releasing a permit that was never acquired",
        },
        {
          type: "paragraph",
          text: "`boolean got = s.tryAcquire(...); try { ... } finally { s.release(); }` releases on failure too; `try { s.acquire(); ... } finally { s.release(); }` releases after an interrupted acquire. Both raise the permit count permanently: a `Semaphore(4)` became 16 in this lesson's test. Acquire before `try` and return early when it fails.",
        },
        {
          type: "heading",
          text: "Forgetting the release on one path",
        },
        {
          type: "paragraph",
          text: "The opposite leak: an early `return` or an exception between `acquire` and the `try`, or an async callback that releases only on success. Each lost release shrinks the semaphore by one until every caller waits forever, with threads `WAITING (parking)` on `Semaphore$NonfairSync` and no owner to blame. Keep the acquire immediately before `try`, and for async work release in `whenComplete`.",
        },
        {
          type: "heading",
          text: "Using a semaphore as a rate limiter",
        },
        {
          type: "paragraph",
          text: "`Semaphore(5)` allowed 2,602 calls per second when calls took 1 ms. It limits concurrency. For per-second limits use a token bucket; a refill timer that adds permits without a cap let 80 calls through at once after 3 quiet seconds.",
        },
        {
          type: "heading",
          text: "Using Semaphore(1) as a lock",
        },
        {
          type: "paragraph",
          text: "It works for mutual exclusion, but it isn't reentrant (the same thread acquiring twice deadlocks itself), any thread can release it, it has no `Condition`s, and dumps show no owner. Use a `ReentrantLock` unless you specifically need \"released by another thread\".",
        },
        {
          type: "heading",
          text: "Untimed tryAcquire() on a fair semaphore",
        },
        {
          type: "paragraph",
          text: "It barges past queued threads; only `tryAcquire(0, unit)` respects fairness. Measured above: `false` with the timed form, `true` with the untimed one, on the same fair semaphore with the same thread queued.",
        },
        {
          type: "heading",
          text: "A Phaser that terminates when its parties drop to zero",
        },
        {
          type: "paragraph",
          text: "The default `onAdvance` returns `registeredParties == 0`. Workers that each register, work, and `arriveAndDeregister()` one after another can bring the count to zero between workers, and the phaser terminates; every later `register()` and `arrive()` then returns a negative phase and does nothing. Keep a coordinator party registered, or override `onAdvance`.",
        },
        {
          type: "heading",
          text: "Ignoring the negative phase",
        },
        {
          type: "paragraph",
          text: "After termination, `arrive`, `arriveAndAwaitAdvance` and `awaitAdvance` return immediately with a negative number instead of waiting or throwing. A loop that doesn't check `isTerminated()` or the sign of the return value spins through \"phases\" that never happen.",
        },
        {
          type: "heading",
          text: "More than 65,535 parties on one Phaser",
        },
        {
          type: "paragraph",
          text: "The party count has 16 bits. `new Phaser(65536)` throws `IllegalArgumentException: Illegal number of parties`, and `register()` past the limit throws `IllegalStateException`. Use tiered phasers for larger groups.",
        },
        {
          type: "heading",
          text: "An untimed exchange with a partner that may not come",
        },
        {
          type: "paragraph",
          text: "If one side of an `Exchanger` dies, stops early, or does one exchange fewer, the other parks in `Exchanger.exchange` forever. My first arena test hung exactly this way. Use `exchange(x, timeout, unit)` and decide what a `TimeoutException` means.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Write every semaphore use as `if (!s.tryAcquire(t, unit)) return fallback(); try { ... } finally { s.release(); }`, with nothing between the acquire and the `try`.",
            "Export `availablePermits()` and `getQueueLength()` as metrics, and alert when free permits exceed the configured size (a leak upwards) or stay at 0 with a long queue (a leak downwards, or an undersized bulkhead).",
            "Size bulkhead permits from the dependency's capacity and your latency budget, and always pair them with a fallback and a client-level timeout on the call itself.",
            "Use nonfair semaphores by default (33 to 47 times the throughput here); choose fair when large `acquire(k)` requests must not starve or worst-case waits matter, and then use `tryAcquire(0, unit)` instead of `tryAcquire()`.",
            "With virtual threads, put limits on resources with semaphores instead of limiting threads with pools.",
            "For rate limits, use a token bucket; keep semaphores for concurrency.",
            "On a `Phaser`, register a coordinator party first, register children before handing them work, deregister in `finally`, and override `onAdvance` to make termination explicit.",
            "Use timed waits (`awaitAdvanceInterruptibly(phase, t, unit)`, `exchange(x, t, unit)`) whenever a party or partner can fail, and log `getUnarrivedParties()` on timeout.",
            "Reach for `Exchanger` only for exactly two threads swapping objects; otherwise use queues.",
            "Name threads that wait on these synchronizers, so dumps and JFR's `jdk.ThreadPark` show which bulkhead or phase they wait on.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "What do these synchronizers cost when nobody has to wait, and when threads hand off to each other as fast as they can? Best of five repetitions each: 10 million uncontended acquire/release pairs, 200,000 swaps between two threads, and 20,000 rounds of four threads meeting at a phaser or a barrier:",
        },
        {
          type: "code",
          language: "java",
          title: "SyncCost.java",
          code: `import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Exchanger;
import java.util.concurrent.Phaser;
import java.util.concurrent.Semaphore;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.locks.ReentrantLock;

public class SyncCost {
    interface Body { void run() throws Exception; }

    static double best(int reps, long ops, Body b) throws Exception {
        long best = Long.MAX_VALUE;
        for (int r = 0; r < reps; r++) {
            long t = System.nanoTime();
            b.run();
            best = Math.min(best, System.nanoTime() - t);
        }
        return (double) best / ops;
    }

    public static void main(String[] args) throws Exception {
        int n = 10_000_000;
        Semaphore s = new Semaphore(1), fair = new Semaphore(1, true);
        ReentrantLock lock = new ReentrantLock();
        System.out.printf("uncontended acquire+release, Semaphore nonfair: %,7.1f ns%n",
                best(5, n, () -> { for (int i = 0; i < n; i++) { s.acquire(); s.release(); } }));
        System.out.printf("uncontended acquire+release, Semaphore fair:    %,7.1f ns%n",
                best(5, n, () -> { for (int i = 0; i < n; i++) { fair.acquire(); fair.release(); } }));
        System.out.printf("uncontended lock+unlock, ReentrantLock:         %,7.1f ns%n",
                best(5, n, () -> { for (int i = 0; i < n; i++) { lock.lock(); lock.unlock(); } }));

        int swaps = 200_000;
        Exchanger<Integer> x = new Exchanger<>();
        System.out.printf("2 threads, Exchanger swap:                      %,7.0f ns%n", best(5, swaps, () -> {
            Thread other = Thread.ofPlatform().start(() -> {
                try { for (int i = 0; i < swaps; i++) x.exchange(i); } catch (InterruptedException e) { }
            });
            for (int i = 0; i < swaps; i++) x.exchange(i);
            other.join();
        }));
        SynchronousQueue<Integer> there = new SynchronousQueue<>(), back = new SynchronousQueue<>();
        System.out.printf("2 threads, swap via two SynchronousQueues:      %,7.0f ns%n", best(5, swaps, () -> {
            Thread other = Thread.ofPlatform().start(() -> {
                try { for (int i = 0; i < swaps; i++) { back.put(i); there.take(); } } catch (InterruptedException e) { }
            });
            for (int i = 0; i < swaps; i++) { back.take(); there.put(i); }
            other.join();
        }));

        int rounds = 20_000, parties = 4;
        System.out.printf("4 threads, one round of Phaser:                 %,7.0f ns%n", best(5, rounds, () -> {
            Phaser p = new Phaser(parties);
            Thread[] ts = new Thread[parties];
            for (int i = 0; i < parties; i++) ts[i] = Thread.ofPlatform().start(() -> { for (int k = 0; k < rounds; k++) p.arriveAndAwaitAdvance(); });
            for (Thread t : ts) t.join();
        }));
        System.out.printf("4 threads, one round of CyclicBarrier:          %,7.0f ns%n", best(5, rounds, () -> {
            CyclicBarrier b = new CyclicBarrier(parties);
            Thread[] ts = new Thread[parties];
            for (int i = 0; i < parties; i++) ts[i] = Thread.ofPlatform().start(() -> {
                try { for (int k = 0; k < rounds; k++) b.await(); } catch (Exception e) { throw new RuntimeException(e); }
            });
            for (Thread t : ts) t.join();
        }));
    }
}`,
        },
        {
          type: "output",
          text: `uncontended acquire+release, Semaphore nonfair:    24.3 ns
uncontended acquire+release, Semaphore fair:       24.7 ns
uncontended lock+unlock, ReentrantLock:            17.0 ns
2 threads, Exchanger swap:                           72 ns
2 threads, swap via two SynchronousQueues:          318 ns
4 threads, one round of Phaser:                     412 ns
4 threads, one round of CyclicBarrier:           21,719 ns`,
        },
        {
          type: "list",
          items: [
            "**An uncontended permit costs about 20 to 26 nanoseconds**, fair or not (19.4 to 26.1 ns nonfair and 22.7 to 24.7 ns fair over three runs), a little more than a `ReentrantLock` (17.0 to 17.2 ns). With nobody queued, `hasQueuedPredecessors()` is a cheap check, so fairness costs nothing until there is contention. A bulkhead around a network call adds nothing measurable.",
            "**An `Exchanger` swap took 72 to 158 ns**, against 309 to 321 ns for the same swap through two `SynchronousQueue`s. The exchanger does one meeting per swap; the queues do two hand-offs. Both threads were spinning most of the time instead of parking, which is what makes these numbers so small.",
            "**A Phaser round was 40 to 53 times cheaper than a CyclicBarrier round in each run**: 336 to 412 ns against 14,025 to 21,719 ns. The difference is spinning. A phaser waiter spins 256 times per arrival before parking, so with 4 threads on 8 idle-ish cores the round usually completes while everyone is still spinning, and nobody parks. A barrier waiter parks on its `Condition` at once, and every round costs park and unpark, plus the lock re-acquisition the previous lesson measured. In one earlier run of the same measurements, a Phaser round took 14.2 microseconds against the barrier's 21.1: when the spinning doesn't pay off (other processes taking the cores), the phaser parks too, and the gap mostly closes.",
            "**Spinning burns CPU.** That's the price of the phaser's speed: on a machine with spare cores it is a good trade, on a saturated one it steals time from threads doing real work. With 64 threads on 8 cores (the tiering test), where most waiters must park, the flat phaser was only 0.95 to 1.9 times as fast as the barrier.",
            "These are single-machine `System.nanoTime` measurements, not JMH, on 8 cores with other work running (load average about 10 during these runs). The ratios were stable; absolute numbers moved by up to 2 times between runs.",
          ],
        },
      ],
    },
    {
      title: "Semaphore, Phaser and Exchanger in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing fare service had a bulkhead in front of its maps vendor: `Semaphore(4)` per instance, `tryAcquire(50, MILLISECONDS)`, and a cached ETA when refused. It passed load tests and ran for months. Then the maps vendor had a 20-minute slowdown, calls taking about a second. The bulkhead should have kept 4 threads per instance on maps and served cached ETAs to the rest. Instead every request thread ended up waiting on maps, trip-status and driver-location endpoints slowed to seconds, health checks timed out, and the orchestrator restarted instances in the middle of the incident. After the vendor recovered, the dashboards looked normal, except one gauge nobody had looked at before: available maps permits per instance, which now read far above 4. The quote code was this:",
        },
        {
          type: "code",
          language: "java",
          title: "the shipped quote path",
          code: `boolean got = mapsPermits.tryAcquire(50, TimeUnit.MILLISECONDS);
try {
    if (got) return mapsClient.eta(pickup, drop);
    return etaCache.get(pickup, drop);
} finally {
    mapsPermits.release();          // also for the requests that were refused
}`,
        },
        {
          type: "paragraph",
          text: "On a normal day, `tryAcquire` almost never failed, so the extra `release()` almost never ran and the bug was invisible. Only a slow dependency, the exact situation the bulkhead existed for, made refusals common, and each refusal added a permit. I rebuilt it with 8 request threads, about 17 quotes and 50 trip-status requests per second, and a maps API that takes 50 ms normally and 1 s from 1.5 s to 3.5 s:",
        },
        {
          type: "code",
          language: "java",
          title: "QuoteBulkheadLeak.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class QuoteBulkheadLeak {
    static final int MAPS_PERMITS = 4;
    static volatile long mapsMillis = 50;                     // healthy maps API
    static final AtomicInteger inMaps = new AtomicInteger();

    static void callMaps() throws InterruptedException {
        inMaps.incrementAndGet();
        try { Thread.sleep(mapsMillis); } finally { inMaps.decrementAndGet(); }
    }

    static void quoteBuggy(Semaphore s) throws InterruptedException {
        boolean got = s.tryAcquire(50, TimeUnit.MILLISECONDS);
        try {
            if (got) callMaps();                              // else: cached ETA
        } finally {
            s.release();                                      // the bug: also runs when got == false
        }
    }

    static void quoteFixed(Semaphore s) throws InterruptedException {
        if (!s.tryAcquire(50, TimeUnit.MILLISECONDS)) return; // cached ETA, no permit to give back
        try {
            callMaps();
        } finally {
            s.release();
        }
    }

    interface Quote { void run(Semaphore s) throws InterruptedException; }

    static void simulate(String label, Quote quote) throws Exception {
        System.out.println("== " + label);
        mapsMillis = 50;
        Semaphore permits = new Semaphore(MAPS_PERMITS);
        ExecutorService requestThreads = Executors.newFixedThreadPool(8);
        List<long[]> status = Collections.synchronizedList(new ArrayList<>());   // {finishedAtMs, latencyMs}
        long t0 = System.nanoTime();
        int tick = 0, nextReport = 500;
        while (true) {
            long now = (System.nanoTime() - t0) / 1_000_000;
            mapsMillis = now >= 1_500 && now < 3_500 ? 1_000 : 50;   // from 1.5 s to 3.5 s the maps API takes 1 s per call
            if (now >= nextReport) {
                List<Long> window = new ArrayList<>();
                synchronized (status) {
                    for (long[] s : status) if (s[0] > nextReport - 500 && s[0] <= nextReport) window.add(s[1]);
                }
                Collections.sort(window);
                int free = permits.availablePermits(), busy = inMaps.get();
                System.out.printf("  t=%4d ms  maps %4d ms  free permits %2d  calls in maps %d  (limit now %2d)  trip-status done %2d, p50 %,5d ms%n",
                        nextReport, mapsMillis, free, busy, free + busy, window.size(),
                        window.isEmpty() ? -1 : window.get(window.size() / 2));
                nextReport += 500;
                if (nextReport > 5_500) break;
            }
            long submitted = System.nanoTime();
            requestThreads.execute(() -> {                    // GET /trips/{id}/status: 5 ms
                try { Thread.sleep(5); } catch (InterruptedException e) { return; }
                long done = System.nanoTime();
                status.add(new long[] {(done - t0) / 1_000_000, (done - submitted) / 1_000_000});
            });
            if (tick++ % 3 == 0) requestThreads.execute(() -> {   // POST /quote: about 17 per second
                try { quote.run(permits); } catch (InterruptedException e) { }
            });
            Thread.sleep(20);
        }
        requestThreads.shutdownNow();
        requestThreads.awaitTermination(5, TimeUnit.SECONDS);
    }

    public static void main(String[] args) throws Exception {
        simulate("release in finally after tryAcquire (what shipped)", QuoteBulkheadLeak::quoteBuggy);
        simulate("release only after a successful tryAcquire (the fix)", QuoteBulkheadLeak::quoteFixed);
    }
}`,
        },
        {
          type: "output",
          text: `== release in finally after tryAcquire (what shipped)
  t= 500 ms  maps   50 ms  free permits  3  calls in maps 1  (limit now  4)  trip-status done 25, p50     5 ms
  t=1000 ms  maps   50 ms  free permits  3  calls in maps 1  (limit now  4)  trip-status done 24, p50     5 ms
  t=1500 ms  maps 1000 ms  free permits  3  calls in maps 1  (limit now  4)  trip-status done 25, p50     5 ms
  t=2000 ms  maps 1000 ms  free permits  0  calls in maps 6  (limit now  6)  trip-status done 24, p50     5 ms
  t=2500 ms  maps 1000 ms  free permits  0  calls in maps 8  (limit now  8)  trip-status done 11, p50     5 ms
  t=3000 ms  maps 1000 ms  free permits  0  calls in maps 8  (limit now  8)  trip-status done 18, p50   319 ms
  t=3500 ms  maps   50 ms  free permits  0  calls in maps 8  (limit now  8)  trip-status done  6, p50   541 ms
  t=4000 ms  maps   50 ms  free permits  6  calls in maps 2  (limit now  8)  trip-status done 64, p50   466 ms
  t=4500 ms  maps   50 ms  free permits  8  calls in maps 0  (limit now  8)  trip-status done 25, p50     5 ms
  t=5000 ms  maps   50 ms  free permits  7  calls in maps 1  (limit now  8)  trip-status done 25, p50     5 ms
  t=5500 ms  maps   50 ms  free permits  7  calls in maps 1  (limit now  8)  trip-status done 25, p50     5 ms
== release only after a successful tryAcquire (the fix)
  t= 500 ms  maps   50 ms  free permits  3  calls in maps 1  (limit now  4)  trip-status done 25, p50     5 ms
  t=1000 ms  maps   50 ms  free permits  3  calls in maps 1  (limit now  4)  trip-status done 25, p50     5 ms
  t=1500 ms  maps 1000 ms  free permits  4  calls in maps 0  (limit now  4)  trip-status done 25, p50     5 ms
  t=2000 ms  maps 1000 ms  free permits  0  calls in maps 4  (limit now  4)  trip-status done 24, p50     5 ms
  t=2500 ms  maps 1000 ms  free permits  0  calls in maps 4  (limit now  4)  trip-status done 25, p50     5 ms
  t=3000 ms  maps 1000 ms  free permits  0  calls in maps 4  (limit now  4)  trip-status done 25, p50     5 ms
  t=3500 ms  maps   50 ms  free permits  0  calls in maps 4  (limit now  4)  trip-status done 24, p50     5 ms
  t=4000 ms  maps   50 ms  free permits  4  calls in maps 0  (limit now  4)  trip-status done 25, p50     5 ms
  t=4500 ms  maps   50 ms  free permits  3  calls in maps 1  (limit now  4)  trip-status done 25, p50     5 ms
  t=5000 ms  maps   50 ms  free permits  3  calls in maps 1  (limit now  4)  trip-status done 25, p50     5 ms
  t=5500 ms  maps   50 ms  free permits  4  calls in maps 0  (limit now  4)  trip-status done 25, p50     5 ms`,
        },
        {
          type: "list",
          items: [
            "**While maps was healthy, both versions were identical**: limit 4, trip-status at 5 ms. That's why the bug survived load tests that didn't include a slow dependency.",
            "**Within a second of the slowdown, the shipped version's limit had doubled.** Each refused quote released a permit it never had, the extra permits let more quotes in, and by 2.5 s all 8 request threads were inside the maps call. Trip-status completions dropped from 25 per half-second to 6 to 18, and their median went from 5 ms to 319 and then 541 ms, for an endpoint that never touches maps. In production, with 200 request threads per instance, the limit kept climbing toward 200.",
            "**After the vendor recovered, the damage stayed.** From 4.5 s on, the shipped version showed 7 or 8 free permits on a semaphore created with 4: the bulkhead was now an 8-permit bulkhead and would fail open even faster next time. Only a restart would reset it. The second run was the same to within a few milliseconds.",
            "**The fixed version never exceeded 4 calls in maps**, and trip-status stayed at 5 ms through the whole slowdown. Quotes beyond the 4 permits got cached ETAs after waiting 50 ms.",
            "**Thread dumps during the incident pointed the wrong way.** The request threads were inside the maps call (in `Thread.sleep` in this simulation, in socket reads inside the maps client in production), not in `Semaphore.tryAcquire`. Nothing was waiting on the semaphore, which reads as \"the bulkhead has plenty of room\". The semaphore did have plenty of room: that was the bug.",
          ],
        },
        {
          type: "paragraph",
          text: "What the team changed:",
        },
        {
          type: "list",
          items: [
            "The pattern: `if (!tryAcquire(...)) return cached; try { call } finally { release }`, with a static-analysis rule that flags `release()` in a `finally` whose `try` doesn't directly follow a successful acquire.",
            "A gauge of `availablePermits()` per bulkhead with an alert when it exceeds the configured size, and one on `getQueueLength()` for the opposite leak. Both are free to read.",
            "A timeout on the maps client itself (800 ms), because a bulkhead limits how many requests wait, not how long the permitted ones do.",
            "A chaos test that slows the maps dependency to 1 s in staging. The bug needed refusals to show up; a load test with healthy dependencies could never have found it.",
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
              question: "What is a Semaphore and what is it used for?",
              answer:
                "A counter of permits. `acquire()` takes one, waiting if none are free; `release()` gives one back and wakes a waiter. It limits how many threads can do something at once: at most N calls to a dependency (a bulkhead), at most N connections from a shared budget, at most N tasks in flight with virtual threads. `new Semaphore(n)` is nonfair; `new Semaphore(n, true)` is fair.",
            },
            {
              question: "What is the difference between a Semaphore and a lock?",
              answer:
                "A lock has an owner: only the thread that locked can unlock, and `ReentrantLock` lets the owner lock again. A semaphore has no owner: any thread may release, nothing checks that it acquired first, and it isn't reentrant. A semaphore also allows N holders instead of one. `Semaphore(1)` gives mutual exclusion, but without ownership checks, reentrancy, `Condition`s or an owner in thread dumps, so a lock is usually the better choice for that.",
            },
            {
              question: "How do you use acquire and release correctly?",
              answer:
                "Acquire immediately before the `try`, release in its `finally`: `s.acquire(); try { work(); } finally { s.release(); }`, or with a timeout `if (!s.tryAcquire(t, unit)) return fallback(); try { ... } finally { s.release(); }`. Never put the acquire inside the `try` and never release after a failed `tryAcquire`, because both release a permit that was never taken and raise the limit permanently. In my test, that turned a `Semaphore(4)` into 16 permits.",
            },
            {
              question: "What is a Phaser?",
              answer:
                "A reusable synchronization barrier where the number of parties can change. Parties `register()` and `arriveAndDeregister()`, threads `arrive()` or `arriveAndAwaitAdvance()`, and each completed round increments a phase number. The overridable `onAdvance(phase, registeredParties)` runs once per phase in the last arriving thread and returns `true` to terminate the phaser. It can replace both `CountDownLatch` and `CyclicBarrier` when the group isn't fixed.",
            },
            {
              question: "What does an Exchanger do?",
              answer:
                "It lets exactly two threads swap objects: each calls `exchange(x)`, waits for the other, and receives the other's object. The classic use is double buffering: one thread fills a buffer while the other drains a second one, then they swap. In my test, that overlapped the two stages and cut a 20-batch GPS ingest from 1,221 ms to 649 ms with only two buffers ever allocated.",
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
              question: "What is the difference between a fair and a nonfair Semaphore, and which is faster?",
              answer:
                "Fair gives permits to waiting threads in FIFO order: its `tryAcquireShared` first checks `hasQueuedPredecessors()` and queues if anyone is waiting. Nonfair lets a newcomer take a free permit by CAS ahead of queued threads. Nonfair is much faster under contention, because a release usually goes to an already-running thread instead of waking a parked one: with 8 threads on 2 permits I measured 6.7 to 7.1 million acquires per second nonfair against 150,000 to 200,000 fair. Fair gives even distribution and a better worst-case wait, and prevents starvation of large `acquire(k)` requests.",
            },
            {
              question: "Does a fair Semaphore guarantee FIFO for every method?",
              answer:
                "No. The untimed `tryAcquire()` calls `nonfairTryAcquireShared` directly, so it takes a free permit even when other threads are queued. `tryAcquire(0, TimeUnit.SECONDS)` goes through AQS and respects fairness. I checked it: on a fair semaphore with a thread queued, the timed form returned `false` and the untimed form returned `true`.",
            },
            {
              question: "Can a Semaphore be used as a rate limiter?",
              answer:
                "Not directly. It limits concurrency, not calls per second: the same `Semaphore(5)` allowed 2,602 calls in a second with 1 ms calls and 53 with 100 ms calls. Refilling permits on a timer makes a crude limiter, but without a cap it accumulates: after 3 idle seconds, my uncapped version allowed 80 calls at once for a 20-per-second limit. Use a token bucket (Guava or Resilience4j `RateLimiter`), and a central limiter when the limit is shared across instances.",
            },
            {
              question: "What is a bulkhead and how does a Semaphore implement one?",
              answer:
                "A limit on how many threads can be busy with one dependency, so a slow dependency can't take every thread in the service. With a semaphore: `tryAcquire` with a short timeout before the call, a fallback when refused, release in `finally`. In my simulation with 8 request threads and a maps API at 1 s per call, trip-status took 1,063 ms at the median without a bulkhead and 5 ms with a `Semaphore(3)`. A semaphore limits how many wait, not how long; permitted calls still need their own timeout, or a dedicated pool with `Future.get(timeout)`.",
            },
            {
              question: "How does a Phaser differ from a CyclicBarrier?",
              answer:
                "Parties can register and deregister at any time; arrival and waiting are separate calls (`arrive()` and `awaitAdvance(phase)`); there is a phase number; `onAdvance` decides termination; phasers can be tiered; and there is no broken state. In my test, a 300 ms timeout on a phaser left it working (the waiters chose to keep waiting and all three phases completed), where the same timeout permanently breaks a barrier. The cost is that a missing party makes a phase wait silently.",
            },
            {
              question: "How do these synchronizers look in a thread dump?",
              answer:
                "All `WAITING (parking)` or `TIMED_WAITING (parking)`, with no owner. Semaphore waiters park on `Semaphore$NonfairSync` or `$FairSync` under `acquireSharedInterruptibly` (all on the same address). Phaser waiters park on their own `Phaser$QNode` under `Phaser.internalAwaitAdvance` (different addresses). Exchanger waiters park on the `Exchanger` under `slotExchange` or `arenaExchange`. None appear in the deadlock detector, and JFR's `jdk.ThreadPark` gives wait durations per `parkedClass`.",
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
              question: "How is Semaphore implemented?",
              answer:
                "As AQS in shared mode, with `state` holding the free permits. `acquire(n)` runs `tryAcquireShared(n)`: read `state`, compute `state - n`, return it if negative (AQS queues the thread as a shared node and parks it), else CAS and return the remainder. The fair version first returns -1 if `hasQueuedPredecessors()`. `release(n)` runs `tryReleaseShared(n)`: add `n` with a CAS loop, throw `Error` only on `int` overflow, and return `true` so AQS wakes the queue; woken shared waiters propagate the wake-up. There is no owner and no maximum, which is why a stray release raises the count.",
            },
            {
              question: "How does a Phaser store its state?",
              answer:
                "In one `volatile long`: bits 0 to 15 unarrived parties, 16 to 31 registered parties, 32 to 62 the phase, bit 63 termination. Every operation is a CAS on that word with a delta: `ONE_ARRIVAL = 1`, `ONE_PARTY = 65536`, `ONE_DEREGISTER = 65537`. The last arrival computes the next phase with unarrived reset to parties. I read it with reflection: three parties with one arrived was `0x0000000000030002`, the next phase `0x0000000100030003`, and termination set the top bit (`0x8000000200030003`), which makes `getPhase()` negative. Waiters push `QNode`s onto `evenQ` or `oddQ` by phase parity, after spinning 256 times per arrival.",
            },
            {
              question: "What is phaser tiering and when does it help?",
              answer:
                "A child phaser created with `new Phaser(parent)` counts its own parties and registers with its parent as one party; when all its parties arrive, it arrives once at the parent, and the phase lives in the root. That spreads CAS contention over several `state` words. It helps with hundreds or thousands of parties on many cores. On my 8-core machine with 64 threads, it made no consistent difference (732 to 1,982 µs per phase against 779 to 1,204 flat), because waking parked threads dominated, not CAS contention.",
            },
            {
              question: "How does Exchanger scale when many threads exchange at once?",
              answer:
                "It starts with a single `slot`. When a CAS on the slot fails because of contention (and there is more than one CPU), it CASes `bound` from 0 and allocates an arena of `(FULL + 2) << ASHIFT` nodes, where `FULL` is half the CPU count: `Node[192]` on my 8-CPU machine. Threads then pair up in different arena slots, 32 references apart (`ASHIFT = 5`), and `Node` is `@Contended`, both to avoid false sharing. `bound` holds the highest active index plus a sequence number to avoid ABA. With 8 busy threads I saw slots 31, 63, 95 and 127 in use.",
            },
            {
              question: "Why is a Phaser round so much cheaper than a CyclicBarrier round with few threads?",
              answer:
                "Because phaser waiters spin (`SPINS_PER_ARRIVAL` = 256 per arrival on a multi-core machine) before parking, while barrier waiters park on a `Condition` immediately and must then re-acquire the barrier's lock one at a time. With 4 threads and free cores, the phaser round finished while everyone was still spinning: 336 to 412 ns against 14 to 22 µs for the barrier. The trade-off is CPU spent spinning; under load, or with many more threads than cores, the phaser parks too and the gap closes.",
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
              question: "A service has a Semaphore(20) bulkhead around a payment gateway. During a gateway slowdown, every request thread ended up stuck in gateway calls and unrelated endpoints timed out. Afterwards, a metric shows 140 available permits. What happened and how do you fix it?",
              answer:
                "Permits leaked upwards: some path releases without having acquired. The usual culprits are `release()` in a `finally` after a failed `tryAcquire`, or `acquire()` inside the `try` so an interrupted or failed acquire still releases. It's invisible on normal days because acquires rarely fail; during a slowdown, every refusal adds a permit, the bulkhead stops limiting, and all threads pile into the slow call. In my reproduction, a `Semaphore(4)` limit doubled within a second of the slowdown and stayed at 8 afterwards. Fix the pattern (acquire before `try`, return early on failure), restart to reset the count, alert when `availablePermits()` exceeds the configured size, and add a slow-dependency chaos test.",
            },
            {
              question: "After a release, a service's export jobs stop: thread dumps show 30 threads WAITING (parking) on the same Semaphore$NonfairSync, and nothing is holding a connection. What do you look for?",
              answer:
                "The opposite leak: permits acquired and never released, so the semaphore has drained to 0 with no work running. Look for paths between `acquire` and the `try` that can throw or return, an early `return` that skips the release, or async work that releases only in a success callback (`thenAccept`) and not on failure or cancellation. `availablePermits()` at 0 with an empty set of active jobs confirms it. Fix by moving the acquire directly before `try`/`finally`, or `whenComplete` for async; meanwhile, a deliberate `release(n)` can restore capacity, but only with a clear count of what was lost.",
            },
            {
              question: "The maps vendor's contract says 50 requests per second. A teammate adds `new Semaphore(50)` around the client and the vendor still throttles you with HTTP 429s. Why?",
              answer:
                "A semaphore caps calls in flight, not calls per second. With 50 permits and 20 ms calls, that's up to 2,500 calls per second; I measured 2,602 calls in one second through a `Semaphore(5)` with 1 ms calls. And each service instance has its own semaphore, so 10 instances allow 10 times as much again. Use a rate limiter (token bucket) for the contract, shared or divided across instances, and keep a small semaphore as a bulkhead against slowness.",
            },
            {
              question: "A nightly payout job uses a Phaser with one party per city shard. Some nights it finishes in seconds and publishes nothing; in the logs, every shard's arriveAndAwaitAdvance returned a negative number. What happened?",
              answer:
                "The phaser terminated early. The default `onAdvance` terminates when registered parties reach 0, so if shards register one at a time and an early shard deregisters before the next one registers, the count hits 0 and the phaser terminates; every later call returns a negative phase immediately instead of waiting. Fix: register a coordinator party first and deregister it only after all shards are registered (my `PayoutPhases` does this), override `onAdvance` to terminate explicitly after the last stage, and check `isTerminated()` or the sign of return values.",
            },
            {
              question: "A large report job on a shared Semaphore(10) budget sometimes waits seconds to start, while small jobs using the same semaphore run fine. How do you explain and fix it?",
              answer:
                "The report calls `acquire(4)` on a nonfair semaphore, and small 1-permit jobs keep barging in whenever a permit frees, so 4 are rarely free at once. In my test the report waited 29 to 422 ms nonfair and 1 ms fair. Make the semaphore fair (and replace any untimed `tryAcquire()`, which barges anyway, with `tryAcquire(0, unit)`), or give large jobs a separate budget.",
            },
            {
              question: "A two-thread ingest pipeline using an Exchanger sometimes hangs at shutdown with the writer thread parked in Exchanger.exchange. What's wrong?",
              answer:
                "The writer is waiting for a partner that has stopped calling: the reader exited (an exception, an interrupt, or a different number of exchanges) without a final exchange. An exchanger has no notion of \"the other side is gone\". Use the timed `exchange(x, t, unit)` and treat a `TimeoutException` as end of stream or failure, send an explicit end-of-stream marker from the reader's `finally` (my example sends `null`), and interrupt the writer on shutdown. For anything beyond two symmetric partners, a pair of bounded queues is easier to shut down cleanly.",
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
            "Create `new Semaphore(0)`, call `tryAcquire()`, then `release()` and `tryAcquire()` again.",
            "Create `new Semaphore(2)`, call `release()` three times without acquiring, and print `availablePermits()`.",
            "Create `new Phaser(1)`, print the result of `arrive()` and `getPhase()`, then `arriveAndDeregister()` and `isTerminated()`.",
            "Try `new Phaser(65536)`, and `arrive()` on a `new Phaser(0)`.",
            "Have two threads call `exchange(null)` on the same `Exchanger` and print what each receives.",
            "Start a thread that calls `acquireUninterruptibly(2)` on a `Semaphore(1)`, interrupt it, print its state and interrupt flag, then `release()` once more.",
            "In `PermitLeak`, change the number of request threads from 16 to 32 and watch the final permit count.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect, from my runs: step 1 prints `false` then `true`: a semaphore can start empty and be filled by releases. Step 2 prints `5`: nothing stops releases beyond the initial count. Step 3 prints `arrive()=0`, `phase=1`, then `arriveAndDeregister()=1` and `terminated=true`, because the last party leaving makes the default `onAdvance` terminate. Step 4 throws `IllegalArgumentException: Illegal number of parties`, and the second part throws `IllegalStateException: Attempted arrival of unregistered party`. Step 5 prints `null` for both: `null` is a legal item. Step 6 shows the thread still `WAITING` with its interrupt flag `false` (AQS clears it while waiting and sets it again after the acquire succeeds); after the extra `release()` the thread gets its 2 permits and ends, leaving 0. Step 7: try to predict it first. In my two runs the buggy version ended with 32 permits and 32 calls in flight, the fixed one with 4 and 4: the leak grows until there are enough permits that no thread is ever refused, which is the number of threads.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `SEMAPHORE   AQS shared mode, state = free permits, NO owner, NO maximum
            acquire(n): CAS state-n, negative -> queue + park
            release(n): CAS state+n, always wakes the queue
            nonfair 6.7-7.1M/s vs fair 150-200k/s (8 threads, 2 permits)
            tryAcquire() barges even when fair; tryAcquire(0, unit) doesn't

RULES       if (!s.tryAcquire(t, u)) return fallback();
            try { call(); } finally { s.release(); }
            release without acquire RAISES the limit (4 -> 16)
            limits concurrency, NOT rate (Semaphore(5): 2,602/s or 53/s)
            bulkhead: trip-status 1,063 ms -> 5 ms; still needs a call timeout

PHASER      one volatile long: [term 63][phase 62..32][parties 31..16][unarrived 15..0]
            register / arriveAndDeregister / arriveAndAwaitAdvance
            onAdvance(phase, parties) -> true terminates (default: parties == 0)
            terminated -> negative phase; timeouts don't break it
            waiters spin 256x, then park on QNode in evenQ/oddQ; tiering for huge groups

EXCHANGER   exactly two threads swap objects; slot, then arena Node[(FULL+2)<<5]
            double buffering: 1,221 ms -> 649 ms, two buffers total
            use the timed exchange: a missing partner = parked forever

DUMPS       Semaphore$NonfairSync | Phaser$QNode | Exchanger, all WAITING (parking)
            no owners, no deadlock report; JFR jdk.ThreadPark for durations`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `Semaphore` is an AQS counter of permits with no owner and no ceiling. That makes it the right tool for bulkheads and for limiting work under virtual threads, and it makes one wrong `release()` a silent, permanent increase in the limit. Acquire before `try`, release in `finally`, watch `availablePermits()`, and remember it limits concurrency, not rate.",
            "A `Phaser` is a barrier packed into one `long`, with parties that come and go, an `onAdvance` hook that decides termination, and no broken state. An `Exchanger` is a two-party swap that grows an arena under contention. Both are niche, and both need timed waits when a partner can fail.",
            "Next comes CompletableFuture in Depth: Threads, Composition and Errors: the asynchronous style where nobody blocks: the stack of callbacks inside a future, which thread really runs each one, how `thenCompose`, `thenCombine` and `allOf` are wired, and the exact rules for exceptions and `CompletionException`.",
          ],
        },
      ],
    },
  ],
};
