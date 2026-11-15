import type { Lesson } from "../types";

export const deadlockLivelockStarvation: Lesson = {
  slug: "deadlock-livelock-starvation",
  date: "2026-11-16",
  title: "Deadlock, Livelock and Starvation",
  description:
    "The three ways threads stop making progress, reproduced and measured on JDK 21: the four Coffman conditions, a real deadlock between two driver wallets locked with synchronized in opposite orders, the jcmd Thread.print report that said \"Found one Java-level deadlock\", ThreadMXBean.findDeadlockedThreads naming both threads from inside the program, how HotSpot finds a cycle by following monitor owners and AbstractOwnableSynchronizer.exclusiveOwnerThread (set for a held ReentrantLock, null for a Semaphore), a ReentrantLock deadlock that findDeadlockedThreads caught and findMonitorDeadlockedThreads missed, Semaphore, CountDownLatch, pool-starvation and virtual-thread deadlocks that nothing reported, 2,000,000 random transfers that the naive order deadlocked after 516 to 21,990 while lock ordering by id, tryLock with jittered backoff, one lock and a lock-free CAS all finished (one lock was fastest at 147 to 219 ms), two polite threads that backed off in lockstep for a full 10 seconds and 222 attempts with a fixed 50 ms backoff but finished in 94 to 273 ms with random jitter, a payout thread whose p99 wait on an unfair lock was 4.5 to 27 ms against 0.13 to 1 ms on a fair one, thread priorities that changed nothing (ratio 1.07) until ThreadPriorityPolicy=1 (1.84), a home-made read-write lock whose writer published 0 fare tables in 3 seconds against 59 with ReentrantReadWriteLock, a PostgreSQL deadlock between the same two wallets, and a fare-settlement pool in a ride-hailing backend that jammed with 8 of 8 threads waiting on their own subtasks while every deadlock detector said null.",
  tags: ["Multithreading", "Deadlock", "Livelock", "Starvation", "Concurrency"],
  sections: [
    {
      title: "What Deadlock, Livelock and Starvation Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Virtual Threads, Pinning and Structured Concurrency, finished the tools for running work concurrently. This phase is about what goes wrong when that work has to share things. The first group of failures isn't about wrong results at all: it's about threads that **stop making progress**. Nothing crashes, no exception is thrown, the process is alive, and yet trips don't get settled. There are three distinct ways this happens, and they look different in a thread dump, so it pays to tell them apart.",
        },
        {
          type: "paragraph",
          text: "A **deadlock** is a set of threads where each one is waiting for something another one in the set holds, so none of them can ever continue. Thread A holds Asha's wallet and waits for Ravi's; thread B holds Ravi's and waits for Asha's. Both are `BLOCKED` (or `WAITING`) forever, using no CPU. A **livelock** is the opposite in one way: the threads are busy, they keep reacting to each other, but every reaction undoes the other's progress. Two polite threads that each let go of their lock when they see the other one waiting, then both grab again at the same moment, can do this forever. A **starvation** is when the system as a whole makes progress, but one thread (or one kind of request) rarely or never gets its turn: an unfair lock that keeps going to whoever is already running, readers that never leave a gap for a writer.",
        },
        {
          type: "paragraph",
          text: "This lesson reproduces all three on JDK 21 in the ride-hailing backend used throughout the track: a deadlock between two driver wallets and how `jcmd`, `jstack` and `ThreadMXBean` find it (and which deadlocks they can't find), four ways to prevent it with measured costs, a livelock and the jitter that ends it, three kinds of starvation with numbers, a deadlock inside PostgreSQL, and a settlement pool that deadlocked without a single lock. The next lesson, Race Conditions, Thread Dumps and Testing Concurrent Code, covers the other family of bugs: threads that do make progress, but produce wrong results.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Deadlock was a problem in operating systems long before Java. Edsger Dijkstra described the \"deadly embrace\" in the 1960s and illustrated it with the dining philosophers: five philosophers, five forks, each needs two forks to eat. In 1971, Edward Coffman, Melanie Elphick and Arie Shoshani published \"System Deadlocks\", which stated the **four conditions** that must all hold for a deadlock to happen. Every prevention technique since, in operating systems, databases and Java, works by breaking at least one of them. Livelock and the fix for it, randomised backoff, are also older than Java: Ethernet's exponential backoff with a random delay exists precisely so that two stations that collided don't retry at the same instant again.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`synchronized`, `wait`/`notify`, `Thread.suspend`/`resume`/`stop`", "The first Java deadlocks; nested `synchronized` blocks in opposite orders"],
            ["Java 1.2 (1998)", "`suspend`, `resume` and `stop` deprecated", "`suspend` kept every lock the thread held: a deadlock by design"],
            ["Java 5 (2004)", "`java.util.concurrent`, `ReentrantLock.tryLock(timeout)`, `lockInterruptibly`, fair locks; `ThreadMXBean.findMonitorDeadlockedThreads` (JSR 174)", "Locks you can give up on; programmatic detection, monitors only"],
            ["Java 6 (2006)", "`ThreadMXBean.findDeadlockedThreads`, `ThreadInfo.getLockedMonitors` and `getLockedSynchronizers`", "Detection extended to ownable synchronizers such as `ReentrantLock`"],
            ["Java 7 (2011)", "`jcmd`", "`jcmd <pid> Thread.print` prints the same dump and deadlock report"],
            ["Java 19 to 21 (2022 to 2023)", "Virtual threads, `jcmd Thread.dump_to_file`", "Millions of threads; as measured below, the deadlock finder doesn't cover them in 21"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Two cars at a narrow one-lane bridge in the hills, one from each side.",
        },
        {
          type: "list",
          items: [
            "**Deadlock:** both drivers drive halfway onto the bridge and stop nose to nose. Each needs the other's half to get across, neither will reverse, and there's no one to tow either car. They will sit there forever, engines off. That's all four Coffman conditions: one car per lane (mutual exclusion), each keeps its half while waiting for the other half (hold and wait), nobody can take a car off the bridge (no preemption), and each waits for the other (circular wait).",
            "**Livelock:** both drivers are polite. Each sees the other, reverses off the bridge, waits ten seconds, and drives on again, at exactly the same moment, every time. Engines running, petrol burning, nobody crossing. The fix is not more politeness: it's one of them waiting a random amount of time.",
            "**Starvation:** the bridge works fine, but the rule is \"whoever is closest goes first\", and the side with the market has a continuous stream of cars. A single car on the quiet side waits for an hour. Traffic flows; that one driver doesn't.",
            "**Prevention by ordering:** a sign that says \"northbound traffic always goes first\". With one global order, two cars can never both be halfway on.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real driver eventually gets out and talks to the other one. Threads don't. A deadlocked JVM never notices by itself; no exception is thrown and no timeout fires unless the code asked for one. And a real bridge deadlock is visible to anyone passing by, while the deadlocks later in this lesson involving semaphores, latches and thread pools are invisible even to the JVM's own detector.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/deadlock-livelock-starvation-wait-for-graph.svg",
          alt: "Four panels. Top left, the measured cycle: two thread boxes, settle-asha-to-ravi and settle-ravi-to-asha, both BLOCKED, above two wallet boxes, Wallet asha at 0x...ff916a90 and Wallet ravi at 0x...ff916ad8. Green arrows labelled held by go from each wallet up to the thread that owns it: asha's wallet to settle-asha-to-ravi, ravi's wallet to settle-ravi-to-asha. Red crossing arrows labelled waiting to lock go from each thread to the other wallet, closing a cycle; the caption quotes jcmd: Found one Java-level deadlock, Found 1 deadlock. Top right, what findDeadlockedThreads can see: synchronized via the monitor owner, ReentrantLock and the ReentrantReadWriteLock write lock via exclusiveOwnerThread are found; Semaphore(1) and CountDownLatch with owner null, and Future.get with no owner at all, are missed. A wait-for edge exists only when the thing waited on has an owner thread; findMonitorDeadlockedThreads sees monitors only and returned null for the ReentrantLock cycle. Bottom left, a thread-starvation deadlock with no locks: eight pool thread boxes, all in settle() calling FutureTask.get, and a queue of promo and tip subtasks, 45 queued, that can never get a thread; findDeadlockedThreads returns null. Bottom right, break one Coffman condition: circular wait by locking the lower id first, hold and wait by tryLock with a timeout, releasing everything and backing off with random jitter, mutual exclusion by one lock or a CAS on one state object, no preemption by lockInterruptibly or a database choosing a victim; 2,000,000 transfers on four threads finished with every fix, while the naive order deadlocked after 516 to 21,990 transfers.",
          caption: "A deadlock is a cycle of \"waits for, owned by\" edges. The JVM can only follow edges where the thing being waited on has an owner.",
        },
        {
          type: "heading",
          text: "Three ways to stop making progress",
        },
        {
          type: "table",
          headers: ["", "Deadlock", "Livelock", "Starvation"],
          rows: [
            ["What happens", "A cycle of threads, each waiting for a resource the next one holds", "Threads keep acting and retrying, but each action cancels the other's progress", "The system progresses; one thread or request class rarely or never gets a turn"],
            ["Thread states", "`BLOCKED` or `WAITING (parking)`, permanently", "`RUNNABLE` or `TIMED_WAITING` (sleeping between retries), changing all the time", "The victim is `BLOCKED` or `WAITING`; others run normally"],
            ["CPU", "Zero for the stuck threads", "Busy (or periodically busy)", "Normal"],
            ["Does it end by itself?", "Never", "Possibly, by luck; in my run with a fixed backoff, not in 10 seconds", "Usually, but with unbounded tail latency"],
            ["JVM detects it?", "Yes for monitors and owned locks; no for semaphores, latches, futures, pools, virtual threads", "No", "No"],
            ["Typical fix", "A global lock order, timeouts, fewer locks", "Random jitter in the backoff, or a single coordinator", "Fair locks, bounded waits, writer preference, separate pools"],
          ],
        },
        {
          type: "heading",
          text: "The four Coffman conditions",
        },
        {
          type: "paragraph",
          text: "A deadlock can only happen if **all four** hold at once. Remove any one and it becomes impossible, which is the whole basis of prevention:",
        },
        {
          type: "table",
          headers: ["Condition", "Meaning", "In the wallet example", "How to break it"],
          rows: [
            ["Mutual exclusion", "A resource can be held by only one thread at a time", "A wallet's monitor has one owner", "Don't lock: CAS on immutable state, single-writer designs"],
            ["Hold and wait", "A thread keeps what it holds while waiting for more", "Holds Asha's wallet while waiting for Ravi's", "Acquire everything at once, or release everything when you can't get the rest (`tryLock`)"],
            ["No preemption", "A held resource can't be taken away; only the holder releases it", "Nothing can make a thread leave a `synchronized` block", "Interruptible or timed acquisition; databases abort a victim transaction"],
            ["Circular wait", "A cycle exists: T1 waits for T2, which waits for ... T1", "asha-to-ravi waits for ravi-to-asha and back", "One global lock order (by wallet id), so a cycle can't form"],
          ],
        },
        {
          type: "heading",
          text: "The tools that look for them",
        },
        {
          type: "table",
          headers: ["Tool", "What it reports", "Covers"],
          rows: [
            ["`jcmd <pid> Thread.print -l`", "Every platform thread's stack, the monitors it holds and waits for, owned synchronizers, then \"Found one Java-level deadlock\" for each cycle", "Monitors and ownable synchronizers"],
            ["`jstack -l <pid>`", "The same dump and report", "Same"],
            ["`ThreadMXBean.findDeadlockedThreads()`", "IDs of threads in a cycle, or `null`", "Monitors and ownable synchronizers (`ReentrantLock`, write lock of `ReentrantReadWriteLock`)"],
            ["`ThreadMXBean.findMonitorDeadlockedThreads()`", "IDs of threads in a cycle of monitors, or `null`", "`synchronized` only"],
            ["`ThreadInfo.getLockOwnerName()`, `getLockedMonitors()`, `getLockedSynchronizers()`", "Who owns what a thread is waiting for, and what it holds", "Building your own watchdog or diagnostics"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "A real deadlock between two driver wallets",
        },
        {
          type: "paragraph",
          text: "End-of-day settlement moves money between drivers: a shared ride where Asha owes Ravi part of a fare, and a correction where Ravi owes Asha. Each transfer locks the source wallet, then the target wallet, which is how the code naturally reads. Two transfers in opposite directions at the same moment:",
        },
        {
          type: "code",
          language: "java",
          title: "WalletDeadlock.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;

public class WalletDeadlock {
    static final class Wallet {
        final String driver;
        long paise;
        Wallet(String driver, long paise) { this.driver = driver; this.paise = paise; }
    }

    // Lock the source wallet, then the target wallet: the order depends on the call
    static void transfer(Wallet from, Wallet to, long amount) {
        synchronized (from) {
            pause(50);                                   // read balances, check limits ...
            synchronized (to) {
                from.paise -= amount;
                to.paise += amount;
            }
        }
    }

    static void pause(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    public static void main(String[] args) throws Exception {
        Wallet asha = new Wallet("asha", 50_000), ravi = new Wallet("ravi", 50_000);
        Thread t1 = Thread.ofPlatform().name("settle-asha-to-ravi").start(() -> transfer(asha, ravi, 12_000));
        Thread t2 = Thread.ofPlatform().name("settle-ravi-to-asha").start(() -> transfer(ravi, asha, 8_000));

        t1.join(1_000);
        System.out.println("after 1 s: " + t1.getName() + " " + t1.getState() + ", " + t2.getName() + " " + t2.getState());

        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        long[] ids = mx.findDeadlockedThreads();
        System.out.println("findDeadlockedThreads: " + (ids == null ? "null" : ids.length + " threads"));
        for (ThreadInfo ti : ids == null ? new ThreadInfo[0] : mx.getThreadInfo(ids, true, true)) {
            System.out.printf("  %s %s on %s owned by %s, holding %s%n", ti.getThreadName(), ti.getThreadState(),
                    ti.getLockName(), ti.getLockOwnerName(),
                    java.util.Arrays.stream(ti.getLockedMonitors()).map(Object::toString).toList());
        }
        System.out.println("pid " + ProcessHandle.current().pid() + ", waiting for jcmd ...");
        Thread.sleep(Long.parseLong(args.length > 0 ? args[0] : "0"));
        System.exit(1);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac WalletDeadlock.java
java WalletDeadlock 8000 &
jcmd WalletDeadlock Thread.print -l`,
        },
        {
          type: "output",
          text: `after 1 s: settle-asha-to-ravi BLOCKED, settle-ravi-to-asha BLOCKED
findDeadlockedThreads: 2 threads
  settle-asha-to-ravi BLOCKED on WalletDeadlock$Wallet@12edcd21 owned by settle-ravi-to-asha, holding [WalletDeadlock$Wallet@34a245ab]
  settle-ravi-to-asha BLOCKED on WalletDeadlock$Wallet@34a245ab owned by settle-asha-to-ravi, holding [WalletDeadlock$Wallet@12edcd21]
pid 1461226, waiting for jcmd ...

"settle-asha-to-ravi" #20 [1461245] prio=5 os_prio=0 cpu=0.65ms elapsed=3.26s tid=0x0000717d6c12f510 nid=1461245 waiting for monitor entry  [0x0000717d5452d000]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat WalletDeadlock.transfer(WalletDeadlock.java:17)
\t- waiting to lock <0x00000000ff916ad8> (a WalletDeadlock$Wallet)
\t- locked <0x00000000ff916a90> (a WalletDeadlock$Wallet)
\tat WalletDeadlock.lambda$main$0(WalletDeadlock.java:29)
\tat WalletDeadlock$$Lambda/0x0000717cf8000c18.run(Unknown Source)
\tat java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
\tat java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

"settle-ravi-to-asha" #21 [1461246] prio=5 os_prio=0 cpu=0.47ms elapsed=3.26s tid=0x0000717d6c130970 nid=1461246 waiting for monitor entry  [0x0000717d5442d000]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat WalletDeadlock.transfer(WalletDeadlock.java:17)
\t- waiting to lock <0x00000000ff916a90> (a WalletDeadlock$Wallet)
\t- locked <0x00000000ff916ad8> (a WalletDeadlock$Wallet)
\tat WalletDeadlock.lambda$main$1(WalletDeadlock.java:30)
\t...

Found one Java-level deadlock:
=============================
"settle-asha-to-ravi":
  waiting to lock monitor 0x0000717cc80019a0 (object 0x00000000ff916ad8, a WalletDeadlock$Wallet),
  which is held by "settle-ravi-to-asha"

"settle-ravi-to-asha":
  waiting to lock monitor 0x0000717cbc000fe0 (object 0x00000000ff916a90, a WalletDeadlock$Wallet),
  which is held by "settle-asha-to-ravi"

Java stack information for the threads listed above:
===================================================
"settle-asha-to-ravi":
\tat WalletDeadlock.transfer(WalletDeadlock.java:17)
\t- waiting to lock <0x00000000ff916ad8> (a WalletDeadlock$Wallet)
\t- locked <0x00000000ff916a90> (a WalletDeadlock$Wallet)
\t...
"settle-ravi-to-asha":
\tat WalletDeadlock.transfer(WalletDeadlock.java:17)
\t- waiting to lock <0x00000000ff916a90> (a WalletDeadlock$Wallet)
\t- locked <0x00000000ff916ad8> (a WalletDeadlock$Wallet)
\t...

Found 1 deadlock.`,
        },
        {
          type: "list",
          items: [
            "**Both threads are `BLOCKED (on object monitor)` with `cpu=0.65ms` and `0.47ms` after 3.26 seconds.** A deadlocked thread costs no CPU; it's parked inside the JVM waiting for a monitor that will never be released. The process looks idle, not broken.",
            "**Each stack shows both edges of the graph.** `- locked <0x...ff916a90>` is what the thread holds (Asha's wallet for `settle-asha-to-ravi`), `- waiting to lock <0x...ff916ad8>` is what it wants (Ravi's). The other thread has the same two addresses swapped. Matching addresses across threads is how to read any lock problem in a dump.",
            "**The line number points one line past the inner `synchronized`.** Line 16 is `synchronized (to)`; the dump says 17. The bytecode explains it: the inner `monitorenter` is at bytecode index 15, which `LineNumberTable` maps to line 16, but the frame of a thread blocked in it was reported at line 17 (index 16) in every run. Look one line up for the lock.",
            "**There are two addresses per lock in the report.** `monitor 0x0000717cc80019a0` is the native `ObjectMonitor` the JVM inflated for the contended wallet (the structure from synchronized, Monitors and Race Conditions); `object 0x00000000ff916ad8` is the wallet in the heap, the one the stack traces show.",
            "**`findDeadlockedThreads()` saw the same cycle from inside the program**, and `ThreadInfo` named the owner of each wanted lock and the monitors each thread holds. That's enough to build a watchdog, which the Examples section does.",
          ],
        },
        {
          type: "heading",
          text: "How the JVM finds a cycle",
        },
        {
          type: "paragraph",
          text: "Both `jcmd Thread.print` and `ThreadMXBean` end up in the same HotSpot code (`ThreadService::find_deadlocks_at_safepoint` in `threadService.cpp`), run as a VM operation at a safepoint so no thread moves while it looks. On the Java side, `findDeadlockedThreads` is a permission check and a native call:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p sun.management.ThreadImpl | grep -i dead
javap -c -p sun.management.ThreadImpl     # findDeadlockedThreads, trimmed
javap -p java.util.concurrent.locks.AbstractOwnableSynchronizer`,
        },
        {
          type: "output",
          text: `  public long[] findMonitorDeadlockedThreads();
  public long[] findDeadlockedThreads();
  private static native java.lang.Thread[] findMonitorDeadlockedThreads0();
  private static native java.lang.Thread[] findDeadlockedThreads0();

  public long[] findDeadlockedThreads();
    Code:
       0: aload_0
       1: invokevirtual #229                // Method isSynchronizerUsageSupported:()Z
       4: ifne          17
       7: new           #50                 // class java/lang/UnsupportedOperationException
      ...
      17: invokestatic  #78                 // Method sun/management/Util.checkMonitorAccess:()V
      20: invokestatic  #234                // Method findDeadlockedThreads0:()[Ljava/lang/Thread;
      23: astore_1
      24: aload_0
      25: aload_1
      26: invokevirtual #226                // Method threadsToIds:([Ljava/lang/Thread;)[J
      29: areturn

public abstract class java.util.concurrent.locks.AbstractOwnableSynchronizer implements java.io.Serializable {
  private static final long serialVersionUID;
  private transient java.lang.Thread exclusiveOwnerThread;
  protected java.util.concurrent.locks.AbstractOwnableSynchronizer();
  protected final void setExclusiveOwnerThread(java.lang.Thread);
  protected final java.lang.Thread getExclusiveOwnerThread();
}`,
        },
        {
          type: "paragraph",
          text: "The algorithm is a walk along \"waits for, owned by\" edges. For each thread it asks: is this thread blocked entering a monitor? Then the next thread is that monitor's owner. Otherwise, is it parked on an object that is an `AbstractOwnableSynchronizer`? Then the next thread is that object's `exclusiveOwnerThread`. It follows the chain until it reaches a thread that isn't waiting (no deadlock) or a thread already on the current path (a cycle). `findMonitorDeadlockedThreads0` follows only the first kind of edge.",
        },
        {
          type: "paragraph",
          text: "That means everything depends on whether the thing being waited on **has an owner**. Every AQS lock extends `AbstractOwnableSynchronizer`, but only exclusive acquisitions call `setExclusiveOwnerThread`. I read the private field with reflection:",
        },
        {
          type: "code",
          language: "java",
          title: "OwnerPeek.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.reflect.Field;
import java.util.concurrent.Semaphore;
import java.util.concurrent.locks.AbstractOwnableSynchronizer;
import java.util.concurrent.locks.ReentrantLock;

public class OwnerPeek {
    // Every AQS lock extends AbstractOwnableSynchronizer: is the owner field set?
    static Object owner(Object lockOrSemaphore) throws Exception {
        Field sync = lockOrSemaphore.getClass().getDeclaredField("sync");
        sync.setAccessible(true);
        Field owner = AbstractOwnableSynchronizer.class.getDeclaredField("exclusiveOwnerThread");
        owner.setAccessible(true);
        Object s = sync.get(lockOrSemaphore);
        return s.getClass().getSimpleName() + " exclusiveOwnerThread=" + owner.get(s);
    }

    public static void main(String[] args) throws Exception {
        ReentrantLock lock = new ReentrantLock();
        Semaphore permit = new Semaphore(1);
        lock.lock();
        permit.acquire();
        System.out.println("ReentrantLock held by main: " + owner(lock));
        System.out.println("Semaphore acquired by main: " + owner(permit));

        Thread waiter = Thread.ofPlatform().name("waiter").start(permit::acquireUninterruptibly);
        Thread.sleep(200);
        ThreadInfo ti = ManagementFactory.getThreadMXBean().getThreadInfo(new long[] {waiter.threadId()}, false, true)[0];
        System.out.println("waiter: " + ti.getThreadState() + " on " + ti.getLockInfo() + ", owner " + ti.getLockOwnerName());
        ThreadInfo me = ManagementFactory.getThreadMXBean().getThreadInfo(new long[] {Thread.currentThread().threadId()}, false, true)[0];
        System.out.println("main's locked synchronizers: " + java.util.Arrays.toString(me.getLockedSynchronizers()));
        permit.release();
        waiter.join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED --add-opens java.base/java.util.concurrent.locks=ALL-UNNAMED OwnerPeek.java",
        },
        {
          type: "output",
          text: `ReentrantLock held by main: NonfairSync exclusiveOwnerThread=Thread[#1,main,5,main]
Semaphore acquired by main: NonfairSync exclusiveOwnerThread=null
waiter: WAITING on java.util.concurrent.Semaphore$NonfairSync@6973b51b, owner null
main's locked synchronizers: [java.util.concurrent.locks.ReentrantLock$NonfairSync@dbf57b3]`,
        },
        {
          type: "list",
          items: [
            "**A held `ReentrantLock` records its owner;** an acquired `Semaphore` permit doesn't. Permits aren't owned by anyone: any thread may release a permit another thread acquired, so there is no owner to record. Both syncs are called `NonfairSync`, but they are different classes in different outer classes.",
            "**So the waiter on the semaphore has a lock it waits for, but `owner null`.** The wait-for chain ends there, and no cycle can ever be found through a semaphore. The same is true for `CountDownLatch`, `CyclicBarrier`, `Phaser`, and a `Future` (whose waiters park on the `FutureTask` itself, which isn't a synchronizer at all).",
            "**`getLockedSynchronizers()` listed only the `ReentrantLock`.** This is the \"Locked ownable synchronizers\" section of `jstack -l`. The semaphore permit main was holding at the time doesn't appear anywhere in a dump.",
          ],
        },
      ],
    },
    {
      title: "Deadlocks the JVM Can and Cannot See",
      blocks: [
        {
          type: "paragraph",
          text: "The theory predicts which deadlocks are reported. I built three in one JVM, each with two threads (or two pool tasks) waiting for each other, and asked both `ThreadMXBean` methods after each one:",
        },
        {
          type: "code",
          language: "java",
          title: "WhoSeesIt.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.concurrent.locks.ReentrantLock;

public class WhoSeesIt {
    static final ThreadMXBean MX = ManagementFactory.getThreadMXBean();

    static void pause(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { throw new RuntimeException(e); }
    }

    static String names(long[] ids) {
        if (ids == null) return "null";
        return Arrays.stream(MX.getThreadInfo(ids)).map(ti -> ti.getThreadName()).sorted().toList().toString();
    }

    static void report(String label) {
        pause(500);                                       // let the threads get stuck
        System.out.println(label);
        System.out.println("  findDeadlockedThreads        " + names(MX.findDeadlockedThreads()));  // monitors + ownable synchronizers
        System.out.println("  findMonitorDeadlockedThreads " + names(MX.findMonitorDeadlockedThreads()));
    }

    // Two ReentrantLocks taken in opposite orders
    static void reentrantLocks() {
        ReentrantLock asha = new ReentrantLock(), ravi = new ReentrantLock();
        Thread.ofPlatform().daemon().name("rl-asha-to-ravi").start(() -> {
            asha.lock(); pause(50); ravi.lock();
        });
        Thread.ofPlatform().daemon().name("rl-ravi-to-asha").start(() -> {
            ravi.lock(); pause(50); asha.lock();
        });
        report("ReentrantLock, opposite order");
    }

    // Two one-permit semaphores used as locks, taken in opposite orders
    static void semaphores() {
        Semaphore asha = new Semaphore(1), ravi = new Semaphore(1);
        Thread.ofPlatform().daemon().name("sem-asha-to-ravi").start(() -> {
            asha.acquireUninterruptibly(); pause(50); ravi.acquireUninterruptibly();
        });
        Thread.ofPlatform().daemon().name("sem-ravi-to-asha").start(() -> {
            ravi.acquireUninterruptibly(); pause(50); asha.acquireUninterruptibly();
        });
        report("Semaphore(1), opposite order");
    }

    // Tasks on a 2-thread pool that wait for subtasks submitted to the same pool
    static void poolStarvation() {
        ExecutorService pool = Executors.newFixedThreadPool(2, Thread.ofPlatform().daemon().name("settle-", 1).factory());
        for (int trip = 1; trip <= 2; trip++) {
            int id = trip;
            pool.submit(() -> {
                Future<Long> fare = pool.submit(() -> 25_000L + id);   // queued behind ... nothing can run it
                return fare.get();
            });
        }
        report("pool waits on its own subtasks");
    }

    public static void main(String[] args) throws Exception {
        reentrantLocks();
        semaphores();
        poolStarvation();
        System.out.println("pid " + ProcessHandle.current().pid());
        Thread.sleep(Long.parseLong(args.length > 0 ? args[0] : "0"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java WhoSeesIt 6000 &
jstack -l <pid>`,
        },
        {
          type: "output",
          text: `ReentrantLock, opposite order
  findDeadlockedThreads        [rl-asha-to-ravi, rl-ravi-to-asha]
  findMonitorDeadlockedThreads null
Semaphore(1), opposite order
  findDeadlockedThreads        [rl-asha-to-ravi, rl-ravi-to-asha]
  findMonitorDeadlockedThreads null
pool waits on its own subtasks
  findDeadlockedThreads        [rl-asha-to-ravi, rl-ravi-to-asha]
  findMonitorDeadlockedThreads null
pid 461315

"rl-asha-to-ravi" #20 [461444] daemon prio=5 os_prio=0 cpu=0.24ms elapsed=6.64s tid=0x00007dbdb013e010 nid=461444 waiting on condition  [0x00007dbd4292d000]
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
\t- parking to wait for  <0x00000000ff959920> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
\tat java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:788)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1024)
\tat java.util.concurrent.locks.ReentrantLock$Sync.lock(java.base@21.0.13.0.3/ReentrantLock.java:153)
\tat java.util.concurrent.locks.ReentrantLock.lock(java.base@21.0.13.0.3/ReentrantLock.java:322)
\tat WhoSeesIt.lambda$reentrantLocks$1(WhoSeesIt.java:33)
\t...

   Locked ownable synchronizers:
\t- <0x00000000ff9598f0> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)

"sem-asha-to-ravi" #22 [461696] daemon prio=5 os_prio=0 cpu=0.28ms elapsed=5.91s tid=0x00007dbdb014c840 nid=461696 waiting on condition  [0x00007dbd4272d000]
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
\t- parking to wait for  <0x00000000ff739dd8> (a java.util.concurrent.Semaphore$NonfairSync)
\tat java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:788)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireShared(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1113)
\tat java.util.concurrent.Semaphore.acquireUninterruptibly(java.base@21.0.13.0.3/Semaphore.java:341)
\tat WhoSeesIt.lambda$semaphores$3(WhoSeesIt.java:45)
\t...

   Locked ownable synchronizers:
\t- None

"settle-1" #24 [462202] daemon prio=5 os_prio=0 cpu=1.52ms elapsed=5.32s tid=0x00007dbdb0154e40 nid=462202 waiting on condition  [0x00007dbd4252d000]
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
\t- parking to wait for  <0x00000000ff603860> (a java.util.concurrent.FutureTask)
\tat java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
\tat java.util.concurrent.FutureTask.awaitDone(java.base@21.0.13.0.3/FutureTask.java:500)
\tat java.util.concurrent.FutureTask.get(java.base@21.0.13.0.3/FutureTask.java:190)
\tat WhoSeesIt.lambda$poolStarvation$6(WhoSeesIt.java:60)
\tat WhoSeesIt$$Lambda/0x00007dbd44007000.call(Unknown Source)
\tat java.util.concurrent.FutureTask.run(java.base@21.0.13.0.3/FutureTask.java:317)
\tat java.util.concurrent.ThreadPoolExecutor.runWorker(java.base@21.0.13.0.3/ThreadPoolExecutor.java:1144)
\t...

Found one Java-level deadlock:
=============================
"rl-asha-to-ravi":
  waiting for ownable synchronizer 0x00000000ff959920, (a java.util.concurrent.locks.ReentrantLock$NonfairSync),
  which is held by "rl-ravi-to-asha"

"rl-ravi-to-asha":
  waiting for ownable synchronizer 0x00000000ff9598f0, (a java.util.concurrent.locks.ReentrantLock$NonfairSync),
  which is held by "rl-asha-to-ravi"
...
Found 1 deadlock.`,
        },
        {
          type: "list",
          items: [
            "**Three real deadlocks, one report.** The two `ReentrantLock` threads were found by `findDeadlockedThreads`, and `jstack` printed \"Found one Java-level deadlock\" with \"waiting for ownable synchronizer\". The later reports still list the same two threads because a deadlock never goes away; the semaphore pair and the pool pair were never added. `jstack` ended with `Found 1 deadlock.`, not 3.",
            "**`findMonitorDeadlockedThreads` returned `null` even for the `ReentrantLock` cycle.** It follows only monitor edges. Old monitoring code (and some APM agents) still call it; it misses every `java.util.concurrent` lock deadlock.",
            "**The semaphore threads look exactly like healthy waiters:** `WAITING (parking)` on a `Semaphore$NonfairSync`, `Locked ownable synchronizers: None`. Nothing in the dump says which thread has the permit they need. To spot it, you have to know the code: \"two threads parked on two different semaphores, each in a method that already acquired the other one\".",
            "**The pool tasks are parked on a `FutureTask`**, in `FutureTask.get` called from inside `ThreadPoolExecutor.runWorker`. Both pool threads were busy waiting for tasks that sat in the pool's own queue. There is no lock anywhere, so there is no edge for the detector to follow. This is a **thread-starvation deadlock**, and the production section shows how it takes down a real service.",
          ],
        },
        {
          type: "paragraph",
          text: "Two more checks, because the diagram makes claims about them. Two `ReentrantReadWriteLock` write locks taken in opposite orders, and two latches where each thread waits for the other's latch before counting down its own:",
        },
        {
          type: "code",
          language: "java",
          title: "Extra.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class Extra {
    static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { } }

    public static void main(String[] a) throws Exception {
        var mx = ManagementFactory.getThreadMXBean();
        ReentrantReadWriteLock x = new ReentrantReadWriteLock(), y = new ReentrantReadWriteLock();
        Thread.ofPlatform().daemon().start(() -> { x.writeLock().lock(); sleep(50); y.writeLock().lock(); });
        Thread.ofPlatform().daemon().start(() -> { y.writeLock().lock(); sleep(50); x.writeLock().lock(); });
        sleep(400);
        long[] d = mx.findDeadlockedThreads();
        System.out.println("RRWL write locks: " + (d == null ? "null" : d.length + " threads"));
        CountDownLatch l1 = new CountDownLatch(1), l2 = new CountDownLatch(1);
        Thread.ofPlatform().daemon().start(() -> { try { l1.await(); } catch (InterruptedException e) { } l2.countDown(); });
        Thread.ofPlatform().daemon().start(() -> { try { l2.await(); } catch (InterruptedException e) { } l1.countDown(); });
        sleep(400);
        d = mx.findDeadlockedThreads();
        System.out.println("latches waiting on each other, still only: " + (d == null ? "null" : d.length + " threads"));
    }
}`,
        },
        {
          type: "output",
          text: `RRWL write locks: 2 threads
latches waiting on each other, still only: 2 threads`,
        },
        {
          type: "paragraph",
          text: "The write locks were found (the write lock is exclusive and sets the owner); the latch pair added nobody. The same goes for virtual threads, which matters after the previous lesson. In JDK 21, `ThreadMXBean` works with platform threads only:",
        },
        {
          type: "code",
          language: "java",
          title: "VirtualDeadlock.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.Arrays;
import java.util.concurrent.locks.ReentrantLock;

public class VirtualDeadlock {
    static final ThreadMXBean MX = ManagementFactory.getThreadMXBean();
    static void pause(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { } }

    static String found() {
        long[] ids = MX.findDeadlockedThreads();
        return ids == null ? "null" : Arrays.stream(MX.getThreadInfo(ids)).map(ti -> ti.getThreadName()).sorted().toList().toString();
    }

    public static void main(String[] args) throws Exception {
        ReentrantLock a = new ReentrantLock(), b = new ReentrantLock();
        Thread v1 = Thread.ofVirtual().name("v-asha-to-ravi").start(() -> { a.lock(); pause(50); b.lock(); });
        Thread v2 = Thread.ofVirtual().name("v-ravi-to-asha").start(() -> { b.lock(); pause(50); a.lock(); });
        pause(500);
        System.out.println("virtual + ReentrantLock: states " + v1.getState() + "/" + v2.getState() + ", findDeadlockedThreads " + found());

        Object x = new Object(), y = new Object();
        Thread v3 = Thread.ofVirtual().name("v-sync-1").start(() -> { synchronized (x) { pause(50); synchronized (y) { } } });
        Thread v4 = Thread.ofVirtual().name("v-sync-2").start(() -> { synchronized (y) { pause(50); synchronized (x) { } } });
        pause(500);
        System.out.println("virtual + synchronized:  states " + v3.getState() + "/" + v4.getState() + ", findDeadlockedThreads " + found());
        System.exit(0);
    }
}`,
        },
        {
          type: "output",
          text: `virtual + ReentrantLock: states WAITING/WAITING, findDeadlockedThreads null
virtual + synchronized:  states BLOCKED/BLOCKED, findDeadlockedThreads null`,
        },
        {
          type: "paragraph",
          text: "Both pairs were deadlocked for good (`WAITING/WAITING` and `BLOCKED/BLOCKED`), and both times the answer was `null`. `jcmd <pid> Thread.print` on the same process listed none of the four virtual threads (only their carrier `ForkJoinPool-1-worker` threads) and printed no deadlock report. On JDK 21, a deadlock among virtual threads has to be found by reading a `jcmd <pid> Thread.dump_to_file` dump by hand, or prevented by design. With virtual threads, prevention is the only reliable strategy.",
        },
      ],
    },
    {
      title: "Preventing Deadlock: Lock Ordering, tryLock, One Lock and Lock-Free",
      blocks: [
        {
          type: "paragraph",
          text: "The wallet deadlock needed a `pause(50)` to happen on the first try. Real code has no such pause, so the window is a few instructions wide, and the bug shows up as \"settlement hung once last Tuesday\". To see how often it really happens, and what each fix costs, I ran 2,000,000 random transfers between 10 wallets on 4 threads, with five strategies. Each one breaks a different Coffman condition:",
        },
        {
          type: "code",
          language: "java",
          title: "TransferStrategies.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;

public class TransferStrategies {
    static final int WALLETS = 10, THREADS = 4, TRANSFERS_PER_THREAD = 500_000;
    static final long START = 100_000;

    static final class Wallet {
        final int id;
        final ReentrantLock lock = new ReentrantLock();
        long paise = START;
        Wallet(int id) { this.id = id; }
    }

    interface Bank { void transfer(int from, int to, long amount) throws InterruptedException; long total(); }

    static Wallet[] wallets() {
        Wallet[] w = new Wallet[WALLETS];
        for (int i = 0; i < WALLETS; i++) w[i] = new Wallet(i);
        return w;
    }

    static long sum(Wallet[] w) { long s = 0; for (Wallet x : w) s += x.paise; return s; }

    // 1. Lock source then target, as the code reads: can deadlock
    static Bank naive() {
        Wallet[] w = wallets();
        return new Bank() {
            public void transfer(int f, int t, long amt) {
                synchronized (w[f]) { synchronized (w[t]) { w[f].paise -= amt; w[t].paise += amt; } }
            }
            public long total() { return sum(w); }
        };
    }

    // 2. Global order: always lock the lower id first
    static Bank ordered() {
        Wallet[] w = wallets();
        return new Bank() {
            public void transfer(int f, int t, long amt) {
                Wallet first = w[Math.min(f, t)], second = w[Math.max(f, t)];
                synchronized (first) { synchronized (second) { w[f].paise -= amt; w[t].paise += amt; } }
            }
            public long total() { return sum(w); }
        };
    }

    static final AtomicLong BACKOFFS = new AtomicLong();

    // 3. tryLock with a timeout, release everything and back off with jitter on failure
    static Bank tryLock() {
        Wallet[] w = wallets();
        return new Bank() {
            public void transfer(int f, int t, long amt) throws InterruptedException {
                while (true) {
                    if (w[f].lock.tryLock(1, TimeUnit.MILLISECONDS)) {
                        try {
                            if (w[t].lock.tryLock(1, TimeUnit.MILLISECONDS)) {
                                try { w[f].paise -= amt; w[t].paise += amt; return; }
                                finally { w[t].lock.unlock(); }
                            }
                        } finally { w[f].lock.unlock(); }
                    }
                    BACKOFFS.incrementAndGet();
                    Thread.sleep(0, ThreadLocalRandom.current().nextInt(1_000, 50_000));   // 1 to 50 us of jitter
                }
            }
            public long total() { return sum(w); }
        };
    }

    // 4. One lock for the whole ledger: no ordering to get wrong
    static Bank oneLock() {
        Wallet[] w = wallets();
        Object ledger = new Object();
        return new Bank() {
            public void transfer(int f, int t, long amt) {
                synchronized (ledger) { w[f].paise -= amt; w[t].paise += amt; }
            }
            public long total() { synchronized (ledger) { return sum(w); } }
        };
    }

    static final AtomicLong CAS_RETRIES = new AtomicLong();

    // 5. Lock-free: an immutable balance array swapped with compareAndSet
    static Bank lockFree() {
        long[] init = new long[WALLETS];
        java.util.Arrays.fill(init, START);
        AtomicReference<long[]> state = new AtomicReference<>(init);
        return new Bank() {
            public void transfer(int f, int t, long amt) {
                while (true) {
                    long[] cur = state.get();
                    long[] next = cur.clone();
                    next[f] -= amt; next[t] += amt;
                    if (state.compareAndSet(cur, next)) return;
                    CAS_RETRIES.incrementAndGet();
                }
            }
            public long total() { long s = 0; for (long x : state.get()) s += x; return s; }
        };
    }

    static void run(String label, Bank bank) throws Exception {
        Thread[] ts = new Thread[THREADS];
        AtomicLong done = new AtomicLong();
        long t0 = System.nanoTime();
        for (int i = 0; i < THREADS; i++) {
            ts[i] = Thread.ofPlatform().daemon().name(label + "-" + i).start(() -> {
                ThreadLocalRandom r = ThreadLocalRandom.current();
                try {
                    for (int k = 0; k < TRANSFERS_PER_THREAD; k++) {
                        int f = r.nextInt(WALLETS), t = r.nextInt(WALLETS - 1);
                        if (t >= f) t++;                                   // never to itself
                        bank.transfer(f, t, 1 + r.nextInt(500));
                        done.incrementAndGet();
                    }
                } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            });
        }
        long deadline = t0 + TimeUnit.SECONDS.toNanos(5);
        for (Thread t : ts) t.join(Math.max(1, (deadline - System.nanoTime()) / 1_000_000));
        long ms = (System.nanoTime() - t0) / 1_000_000;
        var mx = ManagementFactory.getThreadMXBean();
        long[] dead = mx.findDeadlockedThreads();
        long mine = dead == null ? 0 : java.util.Arrays.stream(mx.getThreadInfo(dead))
                .filter(ti -> ti.getThreadName().startsWith(label + "-")).count();
        if (mine > 0) {
            System.out.printf("%-10s DEADLOCKED: %d threads in the cycle, stuck after %,d transfers; gave up at %d ms%n",
                    label, mine, done.get(), ms);
            for (Thread t : ts) System.out.printf("           %s %s%n", t.getName(), t.getState());
        } else {
            System.out.printf("%-10s %,d transfers in %4d ms, total %s%n", label, done.get(), ms,
                    bank.total() == WALLETS * START ? "conserved" : "WRONG " + bank.total());
        }
    }

    public static void main(String[] args) throws Exception {
        run("ordered", ordered());
        run("tryLock", tryLock());
        System.out.printf("           tryLock backed off %,d times%n", BACKOFFS.get());
        run("one-lock", oneLock());
        run("lock-free", lockFree());
        System.out.printf("           lock-free CAS retried %,d times%n", CAS_RETRIES.get());
        run("naive", naive());
        System.exit(0);
    }
}`,
        },
        {
          type: "output",
          text: `ordered    2,000,000 transfers in  267 ms, total conserved
tryLock    2,000,000 transfers in 1007 ms, total conserved
           tryLock backed off 1,583 times
one-lock   2,000,000 transfers in  147 ms, total conserved
lock-free  2,000,000 transfers in  342 ms, total conserved
           lock-free CAS retried 525,202 times
naive      DEADLOCKED: 3 threads in the cycle, stuck after 10,830 transfers; gave up at 5002 ms
           naive-0 BLOCKED
           naive-1 BLOCKED
           naive-2 BLOCKED
           naive-3 BLOCKED`,
        },
        {
          type: "list",
          items: [
            "**The naive order deadlocked in every one of five runs**, after 516, 2,216, 9,074, 10,830 and 21,990 transfers: a few milliseconds of work. Without the `pause(50)`, the deadlock is rarer per transfer, but at production volumes \"rare per transfer\" means \"several times a day\". The naive strategy runs last because a deadlock can't be undone: those threads stay `BLOCKED` until the JVM exits.",
            "**Cycles can be longer than two.** In this run three threads formed the cycle (wallet A waits for B, B for C, C for A) and the fourth was `BLOCKED` behind one of them, waiting for a lock held by a deadlocked thread. `findDeadlockedThreads` reports only the threads **in** the cycle (2 or 3 in my runs), never the ones queued behind it. All four were stuck.",
            "**Lock ordering by id (circular wait broken)** finished every run in 257 to 429 ms. The rule is mechanical: compute `first = min(from, to)` before taking any lock. It works for any number of locks, as long as every code path follows the same order.",
            "**`tryLock` with a timeout and jittered backoff (hold and wait broken)** finished too, but was the slowest in four of five runs: 373 to 1,007 ms, with 302 to 1,583 backoffs. Each backoff throws away work and sleeps. It's the right tool when you can't impose an order (locks chosen at runtime, code you don't own), not the first choice.",
            "**One lock for the ledger (fewer locks, no ordering to get wrong)** was the fastest at 147 to 219 ms. With critical sections this tiny, four threads queueing on one lock beat four threads taking two locks each. Coarse locking is underrated: it removes the whole problem, and its cost only shows when the critical section is long or the thread count is high.",
            "**Lock-free CAS on an immutable array (mutual exclusion removed)** finished in 342 to 466 ms, with 525,202 to 2,055,625 failed `compareAndSet` calls across runs. No thread ever waits for another, so no deadlock is possible, but every retry clones the array again. It fits small state that is read far more than written; for 10 wallets under constant writes, it lost to one lock.",
            "**The total was conserved in every finished run**, which checks that each strategy is also correct, not just deadlock-free. These are `System.nanoTime` measurements on a busy 8-core machine (load average 8 to 15), so the ranges across five runs are wide; one lock was the fastest in all five runs and `tryLock` the slowest in four.",
          ],
        },
      ],
    },
    {
      title: "Livelock: Polite Threads That Never Finish",
      blocks: [
        {
          type: "paragraph",
          text: "`tryLock` removes deadlock, but it can create livelock. Here each settlement takes its own wallet, reads the balance from the database (20 ms, while holding the lock), tries the other wallet, and if it's busy, rolls back (20 ms), politely lets go, waits a fixed 50 ms and tries again. Both start at the same moment, which a scheduled job or a burst of requests does all the time:",
        },
        {
          type: "code",
          language: "java",
          title: "PoliteLivelock.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

public class PoliteLivelock {
    static void sleep(long ms) throws InterruptedException { Thread.sleep(ms); }

    // Take my wallet, then try the other one. If it's busy: undo, let go, back off, retry.
    static void settle(String name, ReentrantLock first, ReentrantLock second, boolean jitter,
                       AtomicLong attempts, AtomicBoolean stop) throws InterruptedException {
        while (!stop.get()) {
            attempts.incrementAndGet();
            first.lock();
            try {
                sleep(20);                                       // read the balance from the database
                if (second.tryLock()) {
                    try {
                        if (!stop.get()) System.out.printf("  %s transferred; attempts so far %d%n", name, attempts.get());
                        return;
                    } finally { second.unlock(); }
                }
                sleep(20);                                       // roll back, log "wallet busy, retrying"
            } finally {
                first.unlock();                                  // politely let go
            }
            sleep(jitter ? ThreadLocalRandom.current().nextLong(0, 100)   // 0 to 100 ms, random
                         : 50);                                            // always 50 ms
        }
    }

    static void run(boolean jitter) throws InterruptedException {
        ReentrantLock asha = new ReentrantLock(), ravi = new ReentrantLock();
        AtomicLong attempts = new AtomicLong();
        AtomicBoolean stop = new AtomicBoolean();
        CountDownLatch go = new CountDownLatch(1);              // both settlements start together
        Thread a = Thread.ofPlatform().name("asha-to-ravi").start(() -> {
            try { go.await(); settle("asha-to-ravi", asha, ravi, jitter, attempts, stop); } catch (InterruptedException e) { }
        });
        Thread b = Thread.ofPlatform().name("ravi-to-asha").start(() -> {
            try { go.await(); settle("ravi-to-asha", ravi, asha, jitter, attempts, stop); } catch (InterruptedException e) { }
        });
        Thread.sleep(20);
        long t0 = System.nanoTime();
        go.countDown();
        a.join(10_000);
        b.join(Math.max(1, 10_000 - (System.nanoTime() - t0) / 1_000_000));
        long ms = (System.nanoTime() - t0) / 1_000_000;
        System.out.printf("%s: after %d ms, attempts %d, threads %s/%s, findDeadlockedThreads %s%n",
                jitter ? "jitter 0-100 ms" : "fixed 50 ms", ms, attempts.get(), a.getState(), b.getState(),
                ManagementFactory.getThreadMXBean().findDeadlockedThreads());
        stop.set(true);
        a.join(); b.join();
    }

    public static void main(String[] args) throws Exception {
        run(false);
        run(true);
    }
}`,
        },
        {
          type: "output",
          text: `fixed 50 ms: after 10001 ms, attempts 222, threads TIMED_WAITING/TIMED_WAITING, findDeadlockedThreads null
  ravi-to-asha transferred; attempts so far 5
  asha-to-ravi transferred; attempts so far 6
jitter 0-100 ms: after 273 ms, attempts 6, threads TERMINATED/TERMINATED, findDeadlockedThreads null`,
        },
        {
          type: "list",
          items: [
            "**With a fixed backoff, neither transfer completed in 10 seconds:** 222 attempts (111 each), zero progress, in both 10-second runs, and 111 to 112 attempts in each of three earlier 5-second runs. Every cycle is identical: both lock their own wallet at the same moment, both find the other wallet taken, both roll back, both release, both sleep exactly 50 ms, and both come back at the same moment again.",
            "**Why it doesn't drift apart by itself:** the two threads are \"in the window\" as long as they start within 20 ms of each other (the time each holds its first lock before trying the second). `Thread.sleep` wakes up slightly late, by a varying amount, so the gap does wander, but small random delays against a 20 ms window can take thousands of cycles to add up to an escape. On a machine where the gaps happen to cancel out, it never escapes.",
            "**Nothing reports it.** The threads were `TIMED_WAITING` (sleeping between retries) when sampled, at other moments `RUNNABLE`; `findDeadlockedThreads` was `null`; no lock is held for long. In a dump, a livelock looks like healthy, busy code. Only a progress metric (\"transfers completed\" not moving, \"retries\" climbing) shows it.",
            "**Random jitter ended it within a few attempts:** 94, 123, 205, 245 and 273 ms across five runs, 4 to 6 attempts in total. One thread draws a shorter backoff, gets back first, takes both wallets while the other is still sleeping, and finishes. This is the same idea as Ethernet's random backoff after a collision: the cure for symmetry is randomness.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "How long should the jitter be?",
          text: "The random range must be wide compared with the window in which the threads collide. Here a thread holds its first lock for 20 ms before trying the second, so 0 to 100 ms separates them on the first or second try. A jitter of 0 to 1 ms would barely change anything. Libraries usually combine jitter with exponential backoff (double the range after each failure, up to a cap), which also stops many retrying clients from hammering a shared resource.",
        },
      ],
    },
    {
      title: "Starvation: Unfair Locks, Priorities and Writers",
      blocks: [
        {
          type: "heading",
          text: "Barging: an unfair lock and an occasional thread",
        },
        {
          type: "paragraph",
          text: "Starvation shows up most with a mix of threads: some that want a lock all the time, and one that needs it occasionally. Three location-update threads update a zone table nonstop (20 microseconds per update, then straight back in), and a payout thread needs the same lock once per millisecond:",
        },
        {
          type: "code",
          language: "java",
          title: "UnfairLock.java",
          code: `import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;
import java.util.concurrent.locks.ReentrantLock;

public class UnfairLock {
    static void busy(long nanos) { long end = System.nanoTime() + nanos; while (System.nanoTime() < end) Thread.onSpinWait(); }

    // 3 location-update threads hammer the zone table; 1 payout thread needs it once per millisecond
    static void run(boolean fair) throws InterruptedException {
        ReentrantLock zoneTable = new ReentrantLock(fair);
        AtomicBoolean stop = new AtomicBoolean();
        AtomicLong updates = new AtomicLong();
        Thread[] hammer = new Thread[3];
        for (int i = 0; i < 3; i++) {
            hammer[i] = Thread.ofPlatform().name("location-" + i).start(() -> {
                while (!stop.get()) {
                    zoneTable.lock();
                    try { busy(20_000); updates.incrementAndGet(); }   // 20 us per update, then straight back
                    finally { zoneTable.unlock(); }
                }
            });
        }
        long[] waits = new long[2_000];
        int n = 0;
        long t0 = System.nanoTime();
        while (System.nanoTime() - t0 < 2_000_000_000L && n < waits.length) {
            LockSupport.parkNanos(1_000_000);                         // the payout thread's own work
            long t = System.nanoTime();
            zoneTable.lock();
            try { waits[n++] = System.nanoTime() - t; }
            finally { zoneTable.unlock(); }
        }
        stop.set(true);
        for (Thread t : hammer) t.join();
        long[] w = Arrays.copyOf(waits, n);
        Arrays.sort(w);
        System.out.printf("%-7s payout got the lock %,5d times in 2 s; wait p50 %6.3f ms, p99 %6.3f ms, max %6.3f ms; location updates %,d%n",
                fair ? "fair" : "unfair", n, w[n / 2] / 1e6, w[(int) (n * 0.99)] / 1e6, w[n - 1] / 1e6, updates.get());
    }

    public static void main(String[] args) throws Exception {
        run(false);
        run(true);
    }
}`,
        },
        {
          type: "output",
          text: `unfair  payout got the lock 1,087 times in 2 s; wait p50  0.600 ms, p99  4.539 ms, max 10.848 ms; location updates 88,696
fair    payout got the lock 1,652 times in 2 s; wait p50  0.085 ms, p99  1.044 ms, max  3.562 ms; location updates 61,410
unfair  payout got the lock   690 times in 2 s; wait p50  0.914 ms, p99 11.931 ms, max 41.900 ms; location updates 91,061
fair    payout got the lock 1,748 times in 2 s; wait p50  0.077 ms, p99  0.126 ms, max  0.789 ms; location updates 72,313
unfair  payout got the lock   643 times in 2 s; wait p50  0.856 ms, p99 27.003 ms, max 93.317 ms; location updates 91,125
fair    payout got the lock 1,668 times in 2 s; wait p50  0.082 ms, p99  0.574 ms, max  3.354 ms; location updates 66,339`,
        },
        {
          type: "list",
          items: [
            "**With the default (unfair) lock, the payout thread's p99 wait was 4.5 to 27 ms and its worst wait 11 to 93 ms**, for a lock held 20 microseconds at a time. It got the lock 643 to 1,087 times in 2 seconds while with the fair lock, in the same 2 seconds, it got it 1,652 to 1,748 times. That's starvation: the system made progress (about 90,000 location updates), one thread mostly didn't.",
            "**The fair lock bounded it:** p50 about 0.08 ms, p99 0.13 to 1 ms, max 0.8 to 3.6 ms, and 1,652 to 1,748 acquisitions. The cost is throughput for everyone else: location updates dropped from about 90,000 to 61,000 to 72,000 (20 to 33% fewer).",
            "**Why unfair starves the occasional thread:** when a location thread unlocks, the payout thread at the head of the queue is unparked, which takes tens of microseconds. Meanwhile the location thread that just unlocked loops straight back to `lock()` and wins the CAS, because a nonfair lock lets a newcomer take a free lock without looking at the queue (\"barging\"). The woken payout thread finds the lock taken again and parks again.",
          ],
        },
        {
          type: "paragraph",
          text: "The difference is a single check in the first acquisition attempt, visible in the bytecode:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p 'java.util.concurrent.locks.ReentrantLock$NonfairSync'   # initialTryLock
javap -c -p 'java.util.concurrent.locks.ReentrantLock$FairSync'      # initialTryLock`,
        },
        {
          type: "output",
          text: `  final boolean initialTryLock();          // NonfairSync
    Code:
       0: invokestatic  #7                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
       3: astore_1
       4: aload_0
       5: iconst_0
       6: iconst_1
       7: invokevirtual #13                 // Method compareAndSetState:(II)Z
      10: ifeq          20
      13: aload_0
      14: aload_1
      15: invokevirtual #19                 // Method setExclusiveOwnerThread:(Ljava/lang/Thread;)V
      18: iconst_1
      19: ireturn
      ...
  final boolean initialTryLock();          // FairSync
    Code:
       0: invokestatic  #7                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
       3: astore_1
       4: aload_0
       5: invokevirtual #13                 // Method getState:()I
       8: istore_2
       9: iload_2
      10: ifne          36
      13: aload_0
      14: invokevirtual #19                 // Method hasQueuedThreads:()Z
      17: ifne          68
      20: aload_0
      21: iconst_0
      22: iconst_1
      23: invokevirtual #23                 // Method compareAndSetState:(II)Z
      26: ifeq          68
      29: aload_0
      30: aload_1
      31: invokevirtual #27                 // Method setExclusiveOwnerThread:(Ljava/lang/Thread;)V
      ...`,
        },
        {
          type: "paragraph",
          text: "The nonfair version CASes `state` from 0 to 1 immediately; if it wins, it owns the lock, whoever is queued. The fair version first calls `hasQueuedThreads()` (offset 14) and, if anyone is waiting, goes to the back of the queue instead (offset 17 jumps to the slow path). `synchronized` behaves like the nonfair lock here and has no fair mode at all.",
        },
        {
          type: "heading",
          text: "Thread priorities don't fix it (on Linux, by default)",
        },
        {
          type: "paragraph",
          text: "A common suggestion is to raise the priority of the thread that starves. I ran 8 threads at priority 10 and 8 at priority 1, all spinning on the CPU, on 8 cores for 3 seconds:",
        },
        {
          type: "code",
          language: "java",
          title: "Priorities.java",
          code: `import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLongArray;

public class Priorities {
    public static void main(String[] args) throws Exception {
        int perGroup = Runtime.getRuntime().availableProcessors();   // 2x oversubscribed: 8 high + 8 low on 8 cores
        AtomicBoolean stop = new AtomicBoolean();
        AtomicLongArray work = new AtomicLongArray(2);
        Thread[] ts = new Thread[2 * perGroup];
        for (int i = 0; i < ts.length; i++) {
            int group = i < perGroup ? 0 : 1;
            ts[i] = Thread.ofPlatform().name((group == 0 ? "high-" : "low-") + i).unstarted(() -> {
                long local = 0;
                while (!stop.get()) local++;                          // pure CPU
                work.addAndGet(group, local);
            });
            ts[i].setPriority(group == 0 ? Thread.MAX_PRIORITY : Thread.MIN_PRIORITY);
        }
        for (Thread t : ts) t.start();
        Thread.sleep(3_000);
        stop.set(true);
        for (Thread t : ts) t.join();
        long hi = work.get(0), lo = work.get(1);
        System.out.printf("priority 10: %,d loops, priority 1: %,d loops, ratio %.2f%n", hi, lo, (double) hi / lo);
        System.out.println("ThreadPriorityPolicy=" + java.lang.management.ManagementFactory.getPlatformMXBean(
                com.sun.management.HotSpotDiagnosticMXBean.class).getVMOption("ThreadPriorityPolicy").getValue()
                + ", UseThreadPriorities=" + java.lang.management.ManagementFactory.getPlatformMXBean(
                com.sun.management.HotSpotDiagnosticMXBean.class).getVMOption("UseThreadPriorities").getValue());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Priorities.java
java -XX:ThreadPriorityPolicy=1 Priorities.java`,
        },
        {
          type: "output",
          text: `priority 10: 12,142,474,671 loops, priority 1: 11,380,462,137 loops, ratio 1.07
ThreadPriorityPolicy=0, UseThreadPriorities=true

OpenJDK 64-Bit Server VM warning: -XX:ThreadPriorityPolicy=1 may require system level permission, e.g., being the root user. If the necessary permission is not possessed, changes to priority will be silently ignored.
priority 10: 15,276,342,724 loops, priority 1: 8,295,675,684 loops, ratio 1.84
ThreadPriorityPolicy=1, UseThreadPriorities=true`,
        },
        {
          type: "list",
          items: [
            "**By default, priority 10 and priority 1 got the same CPU:** ratios of 1.07 and 1.10 in two runs, which is noise. On Linux, HotSpot's default `ThreadPriorityPolicy=0` doesn't pass Java priorities to the OS scheduler; every thread dump shows `os_prio=0`. `setPriority` is a hint the JVM is allowed to ignore, and here it does.",
            "**With `-XX:ThreadPriorityPolicy=1` the ratio became 1.84 and 1.71**, despite the warning. As a non-root user, the JVM can't raise a thread above normal, but it can lower low-priority threads (a higher `nice` value), which is enough to skew CPU time when the cores are oversubscribed.",
            "**Either way, priorities are the wrong tool for lock starvation.** They decide who gets a CPU, not who gets a lock, and when cores are idle they do nothing at all. On another OS or JVM the effect is different again. Starvation is fixed by the lock's policy (fairness, writer preference) or by separating the workloads, not by priorities.",
          ],
        },
        {
          type: "heading",
          text: "Readers starving a writer",
        },
        {
          type: "paragraph",
          text: "A read-write lock lets many readers in together. If readers keep overlapping, the read count never reaches zero, and a writer that waits for zero waits forever. Six quote threads read the fare table nonstop (2 ms each); one thread publishes a new table every 50 ms, giving up after 1 second. I compared a home-made read-write lock that only checks for an **active** writer with `ReentrantReadWriteLock`:",
        },
        {
          type: "code",
          language: "java",
          title: "WriterStarvation.java",
          code: `import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class WriterStarvation {
    interface RW { void readLock() throws InterruptedException; void readUnlock(); boolean writeLock(long ms) throws InterruptedException; void writeUnlock(); }

    // A home-made read-write lock: readers only check for an active writer, never for a waiting one
    static RW naive() {
        return new RW() {
            int readers; boolean writing;
            public synchronized void readLock() throws InterruptedException { while (writing) wait(); readers++; }
            public synchronized void readUnlock() { if (--readers == 0) notifyAll(); }
            public synchronized boolean writeLock(long ms) throws InterruptedException {
                long deadline = System.currentTimeMillis() + ms;
                while (readers > 0 || writing) {
                    long left = deadline - System.currentTimeMillis();
                    if (left <= 0) return false;
                    wait(left);
                }
                writing = true;
                return true;
            }
            public synchronized void writeUnlock() { writing = false; notifyAll(); }
        };
    }

    static RW jdk(boolean fair) {
        ReentrantReadWriteLock rw = new ReentrantReadWriteLock(fair);
        return new RW() {
            public void readLock() { rw.readLock().lock(); }
            public void readUnlock() { rw.readLock().unlock(); }
            public boolean writeLock(long ms) throws InterruptedException { return rw.writeLock().tryLock(ms, TimeUnit.MILLISECONDS); }
            public void writeUnlock() { rw.writeLock().unlock(); }
        };
    }

    // 6 quote threads read the fare table nonstop (2 ms each, overlapping); 1 thread publishes a new table every 50 ms
    static void run(String label, RW lock) throws InterruptedException {
        AtomicBoolean stop = new AtomicBoolean();
        AtomicLong reads = new AtomicLong();
        Thread[] readers = new Thread[6];
        for (int i = 0; i < 6; i++) {
            readers[i] = Thread.ofPlatform().name("quote-" + i).start(() -> {
                try {
                    while (!stop.get()) {
                        lock.readLock();
                        try { Thread.sleep(2); reads.incrementAndGet(); } finally { lock.readUnlock(); }
                    }
                } catch (InterruptedException e) { }
            });
        }
        Thread.sleep(50);
        int published = 0, gaveUp = 0;
        long maxWait = 0;
        long t0 = System.nanoTime();
        while (System.nanoTime() - t0 < 3_000_000_000L) {
            long t = System.nanoTime();
            if (lock.writeLock(1_000)) {                        // give up after 1 s
                try { published++; } finally { lock.writeUnlock(); }
            } else {
                gaveUp++;
            }
            maxWait = Math.max(maxWait, System.nanoTime() - t);
            Thread.sleep(50);
        }
        stop.set(true);
        for (Thread r : readers) r.join();
        System.out.printf("%-22s fare tables published %2d, gave up after 1 s %d times, longest wait %5.0f ms, reads %,d%n",
                label, published, gaveUp, maxWait / 1e6, reads.get());
    }

    public static void main(String[] args) throws Exception {
        run("naive read-write lock", naive());
        run("RRWL non-fair", jdk(false));
        run("RRWL fair", jdk(true));
    }
}`,
        },
        {
          type: "output",
          text: `naive read-write lock  fare tables published  0, gave up after 1 s 3 times, longest wait  1000 ms, reads 9,087
RRWL non-fair          fare tables published 59, gave up after 1 s 0 times, longest wait     2 ms, reads 8,628
RRWL fair              fare tables published 59, gave up after 1 s 0 times, longest wait     3 ms, reads 8,670`,
        },
        {
          type: "list",
          items: [
            "**The home-made lock published zero fare tables in 3 seconds.** Every write attempt waited the full second and gave up, three times in a row, in both runs. Six readers holding the lock for 2 ms each, back to back, meant `readers` was never 0 at the moment the writer checked. Readers didn't do anything wrong individually; together they starved the writer completely.",
            "**`ReentrantReadWriteLock` published 59 tables with a longest wait of 2 to 3 ms, fair or not.** Readers lost about 5% of their reads (8,628 to 8,678 against 9,076 to 9,087), which is the gap they had to leave for the writer.",
            "**The non-fair mode still protects writers.** It is not \"anything goes\": its `readerShouldBlock()` is one call, `apparentlyFirstQueuedIsExclusive()`. A new reader that finds a writer at the head of the wait queue queues behind it instead of barging in, so readers can't overlap forever. That one heuristic is the difference between 0 and 59.",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p 'java.util.concurrent.locks.ReentrantReadWriteLock$NonfairSync'`,
        },
        {
          type: "output",
          text: `  final boolean readerShouldBlock();
    Code:
       0: aload_0
       1: invokevirtual #7                  // Method apparentlyFirstQueuedIsExclusive:()Z
       4: ireturn`,
        },
      ],
    },
    {
      title: "Database Deadlocks",
      blocks: [
        {
          type: "paragraph",
          text: "Java locks are only half the story in a backend: the wallets actually live in a database, and the database takes row locks. The same opposite-order transfer, as two PostgreSQL 16 transactions started 100 ms apart (each `UPDATE` locks the row it changes until `COMMIT`):",
        },
        {
          type: "code",
          language: "sql",
          title: "a.sql (Asha pays Ravi) and b.sql (Ravi pays Asha)",
          code: `-- session A
BEGIN;
UPDATE driver_wallet SET balance_paise = balance_paise - 12000 WHERE driver_id = 1;
SELECT pg_sleep(0.5);
UPDATE driver_wallet SET balance_paise = balance_paise + 12000 WHERE driver_id = 2;
COMMIT;

-- session B
BEGIN;
UPDATE driver_wallet SET balance_paise = balance_paise - 8000 WHERE driver_id = 2;
SELECT pg_sleep(0.5);
UPDATE driver_wallet SET balance_paise = balance_paise + 8000 WHERE driver_id = 1;
COMMIT;`,
        },
        {
          type: "output",
          text: `-- session A
UPDATE driver_wallet SET balance_paise = balance_paise + 12000 WHERE driver_id = 2;
ERROR:  deadlock detected
DETAIL:  Process 1987 waits for ShareLock on transaction 49740; blocked by process 1993.
Process 1993 waits for ShareLock on transaction 49739; blocked by process 1987.
HINT:  See server log for query details.
CONTEXT:  while updating tuple (0,2) in relation "driver_wallet"
COMMIT;
ROLLBACK

-- session B
UPDATE driver_wallet SET balance_paise = balance_paise + 8000 WHERE driver_id = 1;
UPDATE 1
COMMIT;
COMMIT

-- server log
ERROR:  deadlock detected
DETAIL:  Process 1987 waits for ShareLock on transaction 49740; blocked by process 1993.
\tProcess 1993 waits for ShareLock on transaction 49739; blocked by process 1987.
\tProcess 1987: UPDATE driver_wallet SET balance_paise = balance_paise + 12000 WHERE driver_id = 2;
\tProcess 1993: UPDATE driver_wallet SET balance_paise = balance_paise + 8000 WHERE driver_id = 1;

 driver_id | driver | balance_paise
-----------+--------+---------------
         1 | asha   |         58000
         2 | ravi   |         42000

 deadlocks
-----------
         1`,
        },
        {
          type: "list",
          items: [
            "**The database does what the JVM doesn't: it breaks the deadlock.** A transaction that has waited for a lock longer than `deadlock_timeout` (1 s, the default, which this server used) runs a check of the wait-for graph; if it finds a cycle, it aborts one transaction, the **victim**, with `ERROR: deadlock detected`. That's the \"no preemption\" condition removed by force. The other transaction then gets its lock and commits.",
            "**The victim's work is gone.** Session A's first `UPDATE` was rolled back, and its `COMMIT` became `ROLLBACK`. Only Ravi's 8,000 paise transfer happened (58,000 and 42,000). The application must catch the error (SQLSTATE `40P01`) and retry the whole transaction, not just the failed statement. `pg_stat_database.deadlocks` counted it, which makes a good alert.",
            "**\"Waits for ShareLock on transaction\"** is how PostgreSQL shows a row lock wait: a transaction that wants a locked row waits for the transaction holding it to end. MySQL's InnoDB reports the same situation through `SHOW ENGINE INNODB STATUS` and chooses its victim differently, but the cycle is identical.",
            "**The fix is the same as in Java: one order.** I reran both sessions starting with `SELECT driver_id FROM driver_wallet WHERE driver_id IN (1, 2) ORDER BY driver_id FOR UPDATE`, which locks both rows in id order. Session B simply waited (383 ms for that statement) and then committed; both transfers went through (54,000 and 46,000), and the deadlock counter stayed at 1.",
          ],
        },
        {
          type: "paragraph",
          text: "Databases add a twist Java code doesn't have: a Java thread that holds a monitor while it waits for a database row lock, while another thread holds the row and waits for the monitor, is a deadlock that **neither** detector can see, because each sees only half of the cycle. Keeping locks and transactions short, never holding a Java lock across a database call, and taking rows in a fixed order cover most of it. The last phase, starting with Why synchronized Fails Across Servers: Database Locks and Conditional Updates, takes database locking further.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `WalletDeadlock` from the two `start()` calls to the line in the dump:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`settle-asha-to-ravi` calls `transfer(asha, ravi, ...)`** and executes `monitorenter` on Asha's wallet. Nobody owns it, so the JVM takes it on the fast path (a lightweight lock recorded in the object's header and the thread's stack). The thread now owns Asha's wallet and goes to sleep for 50 ms inside the block.",
            "**`settle-ravi-to-asha` does the same with Ravi's wallet**, a few microseconds later. Each thread holds one lock. So far nothing is wrong; this is just two threads each in a critical section.",
            "**After 50 ms, `settle-asha-to-ravi` reaches `synchronized (to)`**: `monitorenter` on Ravi's wallet, which is owned. The JVM **inflates** Ravi's lock into a native `ObjectMonitor` (the `monitor 0x...` address in the report), records itself as a pending entrant, spins briefly in case the owner is about to leave, then blocks. Its state becomes `BLOCKED (on object monitor)`.",
            "**`settle-ravi-to-asha` reaches `synchronized (to)` on Asha's wallet** and does the same. Now each thread holds one monitor and is blocked entering the other. All four Coffman conditions hold: one owner per monitor, each holding while waiting, nothing can take a monitor away, and the waits form a cycle.",
            "**`main` wakes from `join(1_000)`**, which timed out because `t1` never ended, and prints both states: `BLOCKED`. Neither thread will ever run again; they use no CPU.",
            "**`findDeadlockedThreads()`** calls the native `findDeadlockedThreads0`. The JVM brings all threads to a safepoint and, for each thread, follows the chain: blocked on Ravi's monitor, owned by `settle-ravi-to-asha`; that thread is blocked on Asha's monitor, owned by `settle-asha-to-ravi`, which is where the chain started. A cycle: both IDs are returned. `getThreadInfo(ids, true, true)` adds the lock each thread wants, its owner and the monitors each holds.",
            "**`jcmd WalletDeadlock Thread.print -l`** attaches to the JVM and runs the thread dump as a VM operation. It prints every platform thread's stack with `- locked` and `- waiting to lock` lines, then runs the same deadlock search and prints \"Found one Java-level deadlock\" with the cycle, the stacks again, and \"Found 1 deadlock.\"",
            "**Nothing else happens.** The JVM reports the deadlock but never breaks it: there is no API to take a monitor away from a thread. `main` calls `System.exit(1)` after the sleep, which is the only way out. In a server, that means a restart; the fix has to be in the code.",
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
          title: "DeadlockTour.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

public class DeadlockTour {
    record Wallet(int id, ReentrantLock lock) { Wallet(int id) { this(id, new ReentrantLock()); } }

    public static void main(String[] args) throws Exception {
        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        Wallet a = new Wallet(1), b = new Wallet(2);

        // 1. Global order: lower id first, whatever the direction of the transfer
        Wallet first = a.id() < b.id() ? a : b, second = first == a ? b : a;
        synchronized (first) { synchronized (second) { System.out.println("1. locked " + first.id() + " then " + second.id()); } }

        // 2. tryLock with a timeout: give up instead of waiting forever
        Thread holder = Thread.ofPlatform().start(() -> { b.lock().lock(); sleep(300); b.lock().unlock(); });
        sleep(50);
        long t = System.nanoTime();
        boolean got = b.lock().tryLock(100, TimeUnit.MILLISECONDS);
        System.out.printf("2. tryLock(100 ms) -> %b after %d ms%n", got, (System.nanoTime() - t) / 1_000_000);
        holder.join();

        // 3. A thread BLOCKED on synchronized ignores interrupts
        Object monitor = new Object();
        Thread blocked;
        synchronized (monitor) {
            blocked = Thread.ofPlatform().start(() -> { synchronized (monitor) { } });
            sleep(50);
            blocked.interrupt();
            sleep(100);
            System.out.println("3. interrupted monitor waiter is still " + blocked.getState() + ", flag " + blocked.isInterrupted());
        }
        blocked.join();

        // 4. lockInterruptibly: a deadlocked thread can be interrupted out of it
        a.lock().lock();
        Thread waiter = Thread.ofPlatform().start(() -> {
            try { a.lock().lockInterruptibly(); } catch (InterruptedException e) { System.out.println("4. waiter interrupted out of lockInterruptibly"); }
        });
        sleep(50);
        waiter.interrupt();
        waiter.join();
        a.lock().unlock();

        // 5. Ask the JVM: any deadlocks right now?
        System.out.println("5. findDeadlockedThreads -> " + mx.findDeadlockedThreads()
                + ", deadlock detection on synchronizers supported: " + mx.isSynchronizerUsageSupported());
    }

    static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }
}`,
        },
        {
          type: "output",
          text: `1. locked 1 then 2
2. tryLock(100 ms) -> false after 100 ms
3. interrupted monitor waiter is still BLOCKED, flag true
4. waiter interrupted out of lockInterruptibly
5. findDeadlockedThreads -> null, deadlock detection on synchronizers supported: true`,
        },
        {
          type: "paragraph",
          text: "The output was the same in every run. Part 3 is the reason `synchronized` deadlocks are permanent: the interrupt set the flag, but the thread stayed `BLOCKED` until `main` left the block. Part 4 is the escape hatch `ReentrantLock` offers: `lockInterruptibly()` (and `tryLock` with a timeout) lets a stuck thread be pulled out, which is \"no preemption\" weakened from the outside.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A deadlock watchdog",
        },
        {
          type: "paragraph",
          text: "Since the JVM never breaks a deadlock, the next best thing is to notice it within seconds and say exactly where it is. A scheduled task that calls `findDeadlockedThreads` once a second costs almost nothing (measured in Performance) and turns \"settlement is slow\" into a precise alert. Here it catches a deadlock that mixes a monitor and a `ReentrantLock`:",
        },
        {
          type: "code",
          language: "java",
          title: "DeadlockWatchdog.java",
          code: `import java.lang.management.LockInfo;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

public class DeadlockWatchdog {
    // Checks once a second; reports each deadlocked thread once, with what it holds and what it wants
    static ScheduledExecutorService start() {
        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        Set<Long> reported = new HashSet<>();
        ScheduledExecutorService ses = Executors.newSingleThreadScheduledExecutor(
                Thread.ofPlatform().daemon().name("deadlock-watchdog").factory());
        ses.scheduleAtFixedRate(() -> {
            long[] ids = mx.findDeadlockedThreads();
            if (ids == null) return;
            for (ThreadInfo ti : mx.getThreadInfo(ids, true, true)) {
                if (!reported.add(ti.getThreadId())) continue;
                System.out.printf("DEADLOCK %s wants %s held by %s; holds monitors %s, synchronizers %s%n",
                        ti.getThreadName(), ti.getLockName(), ti.getLockOwnerName(),
                        Arrays.stream(ti.getLockedMonitors()).map(m -> m.getClassName()).toList(),
                        Arrays.stream(ti.getLockedSynchronizers()).map(LockInfo::getClassName).toList());
                Arrays.stream(ti.getStackTrace())                          // first frame in our own code
                        .filter(f -> !f.getClassName().startsWith("java.") && !f.getClassName().startsWith("jdk."))
                        .findFirst().ifPresent(f -> System.out.println("    at " + f));
            }
        }, 1, 1, TimeUnit.SECONDS);
        return ses;
    }

    public static void main(String[] args) throws Exception {
        start();
        Object rideSplit = new Object();                         // a monitor
        ReentrantLock payout = new ReentrantLock();              // an ownable synchronizer
        Thread.ofPlatform().daemon().name("split-fare").start(() -> {
            synchronized (rideSplit) { sleep(100); payout.lock(); }
        });
        Thread.ofPlatform().daemon().name("weekly-payout").start(() -> {
            payout.lock(); sleep(100); synchronized (rideSplit) { }
        });
        long t0 = System.nanoTime();
        Thread.sleep(2_500);
        System.out.printf("main still running after %d ms%n", (System.nanoTime() - t0) / 1_000_000);
    }

    static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { } }
}`,
        },
        {
          type: "output",
          text: `DEADLOCK split-fare wants java.util.concurrent.locks.ReentrantLock$NonfairSync@5dd99193 held by weekly-payout; holds monitors [java.lang.Object], synchronizers []
    at DeadlockWatchdog.lambda$main$4(DeadlockWatchdog.java:42)
DEADLOCK weekly-payout wants java.lang.Object@2bde9d0c held by split-fare; holds monitors [], synchronizers [java.util.concurrent.locks.ReentrantLock$NonfairSync]
    at DeadlockWatchdog.lambda$main$5(DeadlockWatchdog.java:45)`,
        },
        {
          type: "list",
          items: [
            "**A mixed cycle was found:** one edge through a monitor owner, one through `exclusiveOwnerThread`. The report names, for each thread, the lock it wants, its owner, what it holds, and the exact source line (42 is `payout.lock()` inside the `synchronized` block, 45 is the `synchronized (rideSplit)` after `payout.lock()`).",
            "**`main` kept running.** A deadlock only stops the threads in it; the rest of the application carries on, which is why deadlocks in servers show up as \"some requests hang\" rather than an outage, until the threads in the cycle (or the threads queued behind them) are the ones every request needs.",
            "**What to do on detection:** log it with stacks, raise an alert, and mark the instance unhealthy so the orchestrator replaces it. Don't try to \"recover\" by interrupting threads; a thread `BLOCKED` on a monitor ignores interrupts, as `DeadlockTour` showed. The watchdog misses everything the detector misses (semaphores, pools, virtual threads), so it complements progress metrics, it doesn't replace them.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Locking any number of wallets in one order",
        },
        {
          type: "paragraph",
          text: "A split fare charges three riders and credits one driver in one atomic step. Each split lists its riders in a different order, so naive nested locking would deadlock as soon as two splits overlap. A small helper sorts by id, locks in that order, and unlocks in reverse:",
        },
        {
          type: "code",
          language: "java",
          title: "SplitFare.java",
          code: `import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.locks.ReentrantLock;

public class SplitFare {
    record Wallet(int id, String rider, ReentrantLock lock, long[] paise) {
        Wallet(int id, String rider, long paise) { this(id, rider, new ReentrantLock(), new long[] {paise}); }
    }

    // Lock any number of wallets in one global order (by id), run the action, unlock in reverse
    static void withWallets(List<Wallet> wallets, Runnable action) {
        Wallet[] sorted = wallets.stream().sorted(Comparator.comparingInt(Wallet::id)).toArray(Wallet[]::new);
        int locked = 0;
        try {
            for (Wallet w : sorted) { w.lock().lock(); locked++; }
            action.run();
        } finally {
            for (int i = locked - 1; i >= 0; i--) sorted[i].lock().unlock();
        }
    }

    public static void main(String[] args) throws Exception {
        Wallet asha = new Wallet(7, "asha", 5_000_000), ravi = new Wallet(3, "ravi", 5_000_000),
               imran = new Wallet(5, "imran", 5_000_000), driver = new Wallet(1, "driver-meera", 0);
        List<List<Wallet>> splits = List.of(                 // each split charges its riders in a different order
                List.of(asha, ravi, imran), List.of(imran, asha, ravi), List.of(ravi, imran, asha));
        long t0 = System.nanoTime();
        try (ExecutorService pool = Executors.newFixedThreadPool(6)) {
            for (int i = 0; i < 30_000; i++) {
                List<Wallet> riders = splits.get(i % 3);
                pool.execute(() -> {
                    List<Wallet> all = new java.util.ArrayList<>(riders);
                    all.add(driver);
                    withWallets(all, () -> {                  // charge each rider 1 rupee, credit the driver
                        for (Wallet r : riders) { r.paise()[0] -= 100; driver.paise()[0] += 100; }
                    });
                });
            }
        }
        System.out.printf("30,000 splits in %d ms; asha %d, ravi %d, imran %d, driver %d (total %d)%n",
                (System.nanoTime() - t0) / 1_000_000, asha.paise()[0], ravi.paise()[0], imran.paise()[0],
                driver.paise()[0], asha.paise()[0] + ravi.paise()[0] + imran.paise()[0] + driver.paise()[0]);
    }
}`,
        },
        {
          type: "output",
          text: `30,000 splits in 84 ms; asha 2000000, ravi 2000000, imran 2000000, driver 9000000 (total 15000000)`,
        },
        {
          type: "paragraph",
          text: "30,000 overlapping splits on 6 threads finished in 84 to 88 ms in three runs, with every balance exact (each rider paid 30,000 x 100 paise, the driver received 9,000,000, the total stayed 15,000,000). The `locked` counter matters: if the third `lock()` threw, only the two locks actually taken are released. The ids must be unique and stable; ordering by `System.identityHashCode` is a common shortcut, but two objects can share a hash code and then need a tie-breaker lock.",
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
            ["Two or more objects locked together (transfers, splits, seat swaps)", "One global order by a stable id; a helper that sorts and locks", "Locking in argument order (\"from, then to\")"],
            ["The set of locks is decided at runtime, or code you don't own takes locks", "`tryLock(timeout)` on all of them, release everything on failure, back off with random jitter", "Retrying in a tight loop or with a fixed delay (livelock)"],
            ["Small shared state with short updates", "One lock, or `AtomicReference` with immutable state", "Fine-grained locks you then have to order"],
            ["A thread must be cancellable while waiting for a lock", "`lockInterruptibly()` or `tryLock(timeout)`", "`synchronized` (ignores interrupts while `BLOCKED`)"],
            ["Tasks that wait for other tasks", "Composition (`thenCombine`, `allOf`) or a separate executor for the subtasks", "`future.get()` inside a task on the same bounded pool"],
            ["An occasional thread must not wait behind a stream of others", "A fair `ReentrantLock`, or separate locks per workload", "Raising thread priority"],
            ["Many readers, occasional writer", "`ReentrantReadWriteLock` (writers queue ahead of new readers)", "A home-made read-write lock that only checks for an active writer"],
            ["Rows updated together in a database", "Lock rows in id order (`ORDER BY id FOR UPDATE`) and retry on deadlock errors", "Holding a Java lock across a database call"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Locking in the order the arguments arrive",
        },
        {
          type: "paragraph",
          text: "`synchronized (from) { synchronized (to) { ... } }` is correct for one call and a deadlock for two calls in opposite directions. In my test, it deadlocked after 516 to 21,990 random transfers. Lock by a stable global order instead.",
        },
        {
          type: "heading",
          text: "Calling unknown code while holding a lock",
        },
        {
          type: "paragraph",
          text: "A listener, callback, `equals`, logging appender or anything overridable can take its own locks, in an order you never see. Holding your lock while calling it creates lock orders you can't control (the \"alien method\" problem). Copy what you need under the lock, release it, then call out.",
        },
        {
          type: "heading",
          text: "Assuming jstack will show every deadlock",
        },
        {
          type: "paragraph",
          text: "My Semaphore, CountDownLatch, pool and virtual-thread deadlocks produced no report at all, while a `ReentrantLock` one in the same JVM did. \"No deadlock found\" means \"no cycle of owned locks among platform threads\", nothing more.",
        },
        {
          type: "heading",
          text: "Using findMonitorDeadlockedThreads",
        },
        {
          type: "paragraph",
          text: "It returned `null` for a `ReentrantLock` cycle that `findDeadlockedThreads` found. Old health checks and copied snippets still call it. Use `findDeadlockedThreads`.",
        },
        {
          type: "heading",
          text: "Blocking on subtasks in the same bounded pool",
        },
        {
          type: "paragraph",
          text: "A task that submits work to its own pool and calls `get()` holds a thread while waiting for a thread. With enough concurrent parents, every thread waits and the subtasks never start: no locks, no report, a hung service. The production section shows it at exactly 8 concurrent settlements on 8 threads.",
        },
        {
          type: "heading",
          text: "Retrying with a fixed backoff",
        },
        {
          type: "paragraph",
          text: "Two threads that fail together and wait the same fixed time collide again. With 50 ms fixed, mine made zero progress for 10 seconds; with 0 to 100 ms random, both finished in under 300 ms. Always add jitter.",
        },
        {
          type: "heading",
          text: "Fixing starvation with thread priorities",
        },
        {
          type: "paragraph",
          text: "On Linux with default flags, priority 10 and priority 1 got the same CPU (ratio 1.07). Priorities don't affect who gets a lock anyway. Use a fair lock or separate the workloads.",
        },
        {
          type: "heading",
          text: "Holding a Java lock while waiting for the database",
        },
        {
          type: "paragraph",
          text: "If thread A holds a monitor and waits for a row lock, while transaction B holds the row and its thread waits for the monitor, the cycle crosses two systems. The JVM sees one half, PostgreSQL the other, and neither detects it; only B's statement timeout, if any, ends it.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Define one lock order for every set of objects locked together (wallet id, trip id) and put it in a helper, so no call site decides the order itself.",
            "Prefer fewer locks: one lock around small shared state was the fastest option in my measurements and has no order to get wrong.",
            "Hold locks for the shortest possible time; never across I/O, remote calls or database transactions, and never while calling code you don't control.",
            "Where waiting forever is unacceptable, use `tryLock(timeout)` or `lockInterruptibly()`, release everything on failure, and back off with random jitter (ideally exponential with a cap).",
            "Never block on a `Future` from inside a task on the same bounded executor; compose with `CompletableFuture`, or give subtasks their own executor.",
            "Run a deadlock watchdog (`findDeadlockedThreads` once every few seconds) and treat any hit as an alert plus an unhealthy instance.",
            "Monitor progress, not just liveness: completed-task counts, last-success timestamps and retry counters catch livelocks, starvation and the deadlocks no detector sees.",
            "Use a fair lock (or a separate lock) when an occasional, important thread competes with a stream of frequent ones, and accept the throughput cost knowingly.",
            "In the database, touch rows in a consistent order, keep transactions short, and retry the whole transaction on a deadlock error.",
            "Name your threads; a deadlock report that says `settle-asha-to-ravi` is solved in minutes, one that says `pool-3-thread-7` is not.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Two cost questions: how much does detection cost (can a watchdog run every second?), and what do the prevention strategies cost? The second is answered by `TransferStrategies` above. For the first, I timed `findDeadlockedThreads` and a full `dumpAllThreads(true, true)` (what a thread-dump endpoint does) with 20, 200 and 2,000 parked threads, best of 20:",
        },
        {
          type: "code",
          language: "java",
          title: "DetectCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;

public class DetectCost {
    public static void main(String[] args) throws Exception {
        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        CountDownLatch never = new CountDownLatch(1);
        List<Thread> parked = new ArrayList<>();
        for (int target : new int[] {20, 200, 2_000}) {
            while (parked.size() < target) {
                parked.add(Thread.ofPlatform().daemon().start(() -> {
                    try { never.await(); } catch (InterruptedException e) { }
                }));
            }
            Thread.sleep(200);
            long best = Long.MAX_VALUE, bestDump = Long.MAX_VALUE;
            for (int i = 0; i < 20; i++) {
                long t = System.nanoTime();
                mx.findDeadlockedThreads();
                best = Math.min(best, System.nanoTime() - t);
                t = System.nanoTime();
                mx.dumpAllThreads(true, true);
                bestDump = Math.min(bestDump, System.nanoTime() - t);
            }
            System.out.printf("%,5d threads: findDeadlockedThreads %7.3f ms, dumpAllThreads(true, true) %7.3f ms%n",
                    mx.getThreadCount(), best / 1e6, bestDump / 1e6);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xss256k DetectCost.java",
        },
        {
          type: "output",
          text: `   26 threads: findDeadlockedThreads   0.044 ms, dumpAllThreads(true, true)   2.722 ms
  206 threads: findDeadlockedThreads   0.105 ms, dumpAllThreads(true, true)   3.754 ms
2,006 threads: findDeadlockedThreads   0.776 ms, dumpAllThreads(true, true)  20.685 ms`,
        },
        {
          type: "list",
          items: [
            "**`findDeadlockedThreads` took 0.04 to 1 ms** (0.040 to 0.044 ms with 26 threads, 0.78 to 0.98 ms with 2,006, over two runs). It grows roughly linearly with the number of threads, and it pauses the application at a safepoint while it runs. Once a second, even with 2,000 threads, that's about 0.1% of wall time. A watchdog is cheap.",
            "**A full dump with locks was 24 to 74 times more expensive:** 2.7 to 3.0 ms with 26 threads, 20.7 to 23.7 ms with 2,006, because it walks every stack and resolves every lock. Fine on demand, too heavy to run every second.",
            "**The strategies, from the transfer benchmark:** one lock 147 to 219 ms for 2,000,000 transfers, lock ordering 257 to 429 ms, lock-free CAS 342 to 466 ms, `tryLock` with jitter 373 to 1,007 ms. Deadlock prevention isn't expensive in itself; what costs is contention and retries. With longer critical sections the ranking changes: one lock becomes a bottleneck, and ordering per object wins.",
            "**Fairness has a price too:** the fair lock cut the payout thread's p99 from 4.5 to 27 ms to under 1.1 ms, and cost 20 to 33% of the frequent threads' throughput. Use it where the tail matters, not by default.",
            "All of these are `System.nanoTime` measurements on a shared, busy 8-core machine, not JMH. The relative order was stable; absolute numbers moved between runs.",
          ],
        },
      ],
    },
    {
      title: "Deadlocks in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend settles each completed trip: it computes the fare, then applies a promo discount and adds a tip, each fetched from another service. To \"parallelise the lookups\", someone changed `settle()` to submit the promo and tip lookups to the settlement pool (8 threads) and wait for both. It passed every test and ran for weeks. On a Friday evening, after a surge ended and hundreds of trips completed within a few seconds, settlement stopped completely. No exceptions. CPU near zero. The deadlock watchdog was silent. The health check said UP, because the HTTP threads were fine. Drivers saw \"payment pending\" for 40 minutes until someone restarted the pods. I rebuilt it:",
        },
        {
          type: "code",
          language: "java",
          title: "SettlementPool.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class SettlementPool {
    static long promo(int trip) throws InterruptedException { Thread.sleep(30); return trip % 3 == 0 ? 2_000 : 0; }
    static long tip(int trip) throws InterruptedException { Thread.sleep(20); return trip % 4 == 0 ? 3_000 : 0; }

    // What shipped: settle() runs on the pool and blocks on two subtasks submitted to the SAME pool
    static long settleBlocking(ExecutorService pool, int trip) throws Exception {
        Future<Long> p = pool.submit(() -> promo(trip));
        Future<Long> t = pool.submit(() -> tip(trip));
        return 25_000 - p.get() + t.get();
    }

    static void burst(String label, int trips) throws Exception {
        ThreadPoolExecutor pool = (ThreadPoolExecutor) Executors.newFixedThreadPool(8,
                Thread.ofPlatform().daemon().name("settle-", 1).factory());
        List<Future<Long>> results = new ArrayList<>();
        long t0 = System.nanoTime();
        for (int i = 1; i <= trips; i++) {
            int trip = i;
            results.add(pool.submit(() -> settleBlocking(pool, trip)));
        }
        int settled = 0;
        try {
            for (Future<Long> f : results) { f.get(3, TimeUnit.SECONDS); settled++; }
            System.out.printf("%-30s %3d trips settled in %4d ms%n", label, settled, (System.nanoTime() - t0) / 1_000_000);
        } catch (TimeoutException e) {
            System.out.printf("%-30s STUCK: %d of %d settled after 3 s; active %d of %d threads, queued %d, completed %d%n",
                    label, settled, trips, pool.getActiveCount(), pool.getMaximumPoolSize(), pool.getQueue().size(),
                    pool.getCompletedTaskCount());
            System.out.println("    findDeadlockedThreads: " + ManagementFactory.getThreadMXBean().findDeadlockedThreads());
        }
        pool.shutdownNow();
    }

    // The fix: compose instead of blocking; I/O-ish subtasks run on their own executor
    static void burstComposed(String label, int trips) throws Exception {
        ExecutorService settlePool = Executors.newFixedThreadPool(8);
        ExecutorService lookups = Executors.newVirtualThreadPerTaskExecutor();
        long t0 = System.nanoTime();
        List<CompletableFuture<Long>> results = new ArrayList<>();
        for (int i = 1; i <= trips; i++) {
            int trip = i;
            CompletableFuture<Long> p = CompletableFuture.supplyAsync(() -> call(() -> promo(trip)), lookups);
            CompletableFuture<Long> t = CompletableFuture.supplyAsync(() -> call(() -> tip(trip)), lookups);
            results.add(p.thenCombineAsync(t, (promo, tip) -> 25_000 - promo + tip, settlePool));
        }
        CompletableFuture.allOf(results.toArray(CompletableFuture[]::new)).get(3, TimeUnit.SECONDS);
        System.out.printf("%-30s %3d trips settled in %4d ms%n", label, trips, (System.nanoTime() - t0) / 1_000_000);
        settlePool.shutdown();
        lookups.shutdown();
    }

    interface Call { long run() throws Exception; }
    static long call(Call c) { try { return c.run(); } catch (Exception e) { throw new RuntimeException(e); } }

    public static void main(String[] args) throws Exception {
        burst("blocking, 3 trips at once", 3);
        burst("blocking, 7 trips at once", 7);
        burst("blocking, 8 trips at once", 8);
        burst("blocking, 40 trips at once", 40);
        burstComposed("composed, 40 trips at once", 40);
        burstComposed("composed, 400 trips at once", 400);
    }
}`,
        },
        {
          type: "output",
          text: `blocking, 3 trips at once        3 trips settled in   51 ms
blocking, 7 trips at once        7 trips settled in  117 ms
blocking, 8 trips at once      STUCK: 0 of 8 settled after 3 s; active 8 of 8 threads, queued 13, completed 3
    findDeadlockedThreads: null
blocking, 40 trips at once     STUCK: 1 of 40 settled after 3 s; active 8 of 8 threads, queued 45, completed 7
    findDeadlockedThreads: null
composed, 40 trips at once      40 trips settled in   51 ms
composed, 400 trips at once    400 trips settled in   42 ms`,
        },
        {
          type: "list",
          items: [
            "**Below the pool size it worked, which is why tests passed.** With 3 or 7 trips at once there was always a free thread for the lookups: 45 to 117 ms in two runs.",
            "**At 8 trips it was a coin toss.** In the run above all 8 settlement tasks took all 8 threads before any lookup started, and nothing settled; in the second run, a few lookups slipped in first and all 8 settled in 162 ms. At 40 trips it jammed in both runs: 8 of 8 threads active, 45 tasks queued, and only 5 and 7 tasks had completed in the two runs. That's a thread-starvation deadlock: every thread is waiting for work that needs a thread.",
            "**Every detector said no.** `findDeadlockedThreads` returned `null`, because the threads park on `FutureTask` objects, which have no owner (the `WhoSeesIt` dump above shows exactly that frame). There's no lock and no cycle of owned resources, so the JVM sees eight threads that are each waiting for some future, as healthy code often is.",
            "**What would have caught it:** the pool's own numbers. `getActiveCount() == getMaximumPoolSize()`, a growing queue, and `getCompletedTaskCount()` not moving for several seconds is a precise signature. A gauge on those three, and an alert on \"settlements completed per minute\" dropping to zero, would have paged someone within a minute instead of 40.",
            "**The fix removes the blocking, not just the symptom.** The lookups run on their own executor (virtual threads, since they only wait), and the settlement step is a `thenCombineAsync` callback that runs when both results exist, on the settlement pool. No thread ever waits for another task to get a thread. 40 trips settled in 38 to 51 ms and 400 in 41 to 42 ms, in both runs. Simply making the pool bigger would only move the cliff: any burst larger than the pool hits it again.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from it:",
        },
        {
          type: "list",
          items: [
            "A deadlock doesn't need locks. Any cycle of waiting does it, including \"a thread waits for a task, the task waits for a thread\". Bounded pools turn that into a real resource that can run out.",
            "The JVM's deadlock detector is useful, but it only covers owned locks among platform threads. Monitoring for progress (completed counts, queue age, last success time) covers everything else, including livelock and starvation.",
            "A test that passes at low concurrency proves little. The bug appeared exactly at the pool size, so a test with \"pool size + 1\" concurrent requests would have found it on day one.",
            "Never call `get()` or `join()` on a future from inside a task on a bounded executor, unless the future runs somewhere else that can always make progress.",
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
              question: "What is a deadlock?",
              answer:
                "A set of threads where each is waiting for a resource held by another thread in the set, so none can ever continue. The classic case is two threads locking two objects in opposite orders: thread A holds wallet 1 and waits for wallet 2, thread B holds wallet 2 and waits for wallet 1. In my reproduction both stayed `BLOCKED` with under 1 ms of CPU after several seconds, and they would stay that way until the JVM exits; Java never breaks a deadlock by itself.",
            },
            {
              question: "What are the four conditions for a deadlock?",
              answer:
                "The Coffman conditions: mutual exclusion (a resource has one holder at a time), hold and wait (a thread keeps what it has while waiting for more), no preemption (a resource can't be taken from its holder), and circular wait (a cycle of threads each waiting for the next). All four must hold. Prevention means breaking one: a global lock order breaks circular wait, `tryLock` with release breaks hold and wait, interruptible locks or a database aborting a victim weaken no preemption, and lock-free designs avoid mutual exclusion.",
            },
            {
              question: "What is the difference between deadlock, livelock and starvation?",
              answer:
                "In a deadlock the threads are stuck waiting and use no CPU. In a livelock the threads are active, they keep responding to each other and retrying, but make no progress; my two polite transfers with a fixed 50 ms backoff made 222 attempts in 10 seconds without completing. In starvation the system makes progress but one thread rarely gets a turn; my payout thread's worst wait for an unfair lock was up to 93 ms while other threads did 90,000 updates.",
            },
            {
              question: "How do you find a deadlock in a running Java application?",
              answer:
                "Take a thread dump with `jcmd <pid> Thread.print -l` or `jstack -l <pid>`. For deadlocks on monitors and owned locks such as `ReentrantLock`, the dump ends with \"Found one Java-level deadlock\", listing each thread, the lock it's waiting for and who holds it. From inside the application, `ManagementFactory.getThreadMXBean().findDeadlockedThreads()` returns the IDs of deadlocked threads, or `null`.",
            },
            {
              question: "How does lock ordering prevent deadlock?",
              answer:
                "If every thread acquires locks in the same global order (for example, lower wallet id first), a thread holding a higher lock never waits for a lower one, so a cycle can't form. In my benchmark, the naive \"from, then to\" order deadlocked after 516 to 21,990 transfers, while ordering by `min(from, to)` completed 2,000,000 transfers in every run.",
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
              question: "What is the difference between findDeadlockedThreads and findMonitorDeadlockedThreads?",
              answer:
                "`findMonitorDeadlockedThreads` (Java 5) only follows `synchronized` monitors. `findDeadlockedThreads` (Java 6) also follows ownable synchronizers: AQS-based locks that record an `exclusiveOwnerThread`, such as `ReentrantLock` and the write lock of `ReentrantReadWriteLock`. For a `ReentrantLock` cycle, `findDeadlockedThreads` named both threads and `findMonitorDeadlockedThreads` returned `null`. Both return only the threads in the cycle, not those blocked behind it.",
            },
            {
              question: "Why isn't a deadlock between two Semaphores reported by jstack?",
              answer:
                "Detection follows \"waiting for X, X is owned by T\" edges. A semaphore permit has no owner: any thread may release it, so `Semaphore`'s sync never sets `exclusiveOwnerThread`. I read it with reflection: `null` while `main` held the only permit, versus the owning thread for a held `ReentrantLock`. Without an owner there is no edge, so no cycle. The same holds for `CountDownLatch`, `CyclicBarrier` and `Future.get`. In the dump, such threads look like normal `WAITING (parking)` threads with `Locked ownable synchronizers: None`.",
            },
            {
              question: "How does tryLock help avoid deadlock, and what new problem can it cause?",
              answer:
                "`tryLock(timeout)` lets a thread give up instead of waiting forever; if it can't get the second lock, it releases the first, which breaks hold-and-wait. The risk is livelock: if two threads fail together and retry after the same fixed delay, they collide again. Mine collided for 10 seconds with a 50 ms fixed backoff. Random jitter in the backoff (0 to 100 ms here) separated them within 4 to 6 attempts. `tryLock` was also the slowest strategy in my transfer benchmark in four of five runs, because failed attempts throw work away.",
            },
            {
              question: "What is a thread-starvation deadlock in an executor?",
              answer:
                "A task running on a bounded pool submits subtasks to the same pool and blocks on their results. If all pool threads are running such parent tasks, the subtasks wait in the queue forever, and the parents wait for them. There are no locks, so no detector reports it: in my settlement pool of 8 threads, 8 concurrent settlements could jam it and 40 always did, leaving all 8 threads in `FutureTask.get` with 45 tasks queued, and `findDeadlockedThreads` returned `null`. Fix it by composing futures instead of blocking, or by running subtasks on a different executor.",
            },
            {
              question: "Why can't you interrupt a thread out of a synchronized deadlock?",
              answer:
                "A thread `BLOCKED` entering a monitor doesn't respond to interrupts: the flag is set, but it keeps waiting. I measured it: after `interrupt()`, the thread was still `BLOCKED` with the flag `true` until the monitor was released. `ReentrantLock.lockInterruptibly()` and `tryLock(timeout)` do respond, so a stuck thread can be cancelled. That's one practical reason to prefer `ReentrantLock` when lock acquisition might block for a long time.",
            },
            {
              question: "What causes starvation with an unfair lock, and what does a fair lock cost?",
              answer:
                "A nonfair lock lets an arriving thread CAS the lock state immediately, even if others are queued (\"barging\"). A thread that just released the lock and loops back usually wins against a queued thread that is still waking up. My payout thread, needing the lock once per millisecond against three busy threads, had a p99 wait of 4.5 to 27 ms. With `new ReentrantLock(true)`, whose `initialTryLock` checks `hasQueuedThreads()` first, the p99 fell below 1.1 ms, but the busy threads did 20 to 33% fewer updates.",
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
              question: "How does HotSpot detect deadlocks?",
              answer:
                "At a safepoint, it walks the wait-for graph. For each thread, the next node is the owner of the monitor it is blocked entering, or, if it's parked on an `AbstractOwnableSynchronizer`, that synchronizer's `exclusiveOwnerThread`. It follows the chain until it reaches a thread that isn't waiting or one already on the current path, which is a cycle. `jcmd Thread.print`, `jstack` and `ThreadMXBean.findDeadlockedThreads` (native `findDeadlockedThreads0`) share this code. It cost me 0.04 ms with 26 threads and under 1 ms with 2,006.",
            },
            {
              question: "Can deadlocks happen with virtual threads, and will the JVM tell you?",
              answer:
                "They can: two virtual threads locking two `ReentrantLock`s or two monitors in opposite orders deadlock exactly like platform threads. In JDK 21, `findDeadlockedThreads` returned `null` for both cases (states `WAITING/WAITING` and `BLOCKED/BLOCKED`), because `ThreadMXBean` covers platform threads only, and `jcmd Thread.print` doesn't list virtual threads. You'd need `jcmd Thread.dump_to_file` and manual analysis. With virtual threads, deadlock prevention by design matters even more.",
            },
            {
              question: "Lock ordering, tryLock, one lock, or lock-free: how would you choose?",
              answer:
                "One lock when the shared state is small and critical sections are short: it was fastest in my benchmark (147 to 219 ms for 2,000,000 transfers) and has no order to get wrong. Lock ordering when objects are independent and contention is spread out: correct and nearly as fast (257 to 429 ms). `tryLock` with jittered backoff when you can't impose an order: safe but slowest (373 to 1,007 ms). Lock-free CAS for small, mostly-read state; under constant writes it retried 525,202 to 2,055,625 times and lost to one lock.",
            },
            {
              question: "How do database deadlocks differ from JVM deadlocks?",
              answer:
                "The database detects and resolves them. PostgreSQL checks for a cycle after a lock wait exceeds `deadlock_timeout` (1 s by default) and aborts one transaction with `ERROR: deadlock detected` (SQLSTATE `40P01`); the other proceeds. In my test the victim's whole transaction was rolled back, so the application must retry the entire transaction. The JVM only reports. Prevention is the same: lock rows in a consistent order (`ORDER BY id FOR UPDATE`). A cycle that spans a Java lock and a row lock is detected by neither side.",
            },
            {
              question: "Why does a read-write lock risk writer starvation, and how does ReentrantReadWriteLock avoid it?",
              answer:
                "If readers can always join while other readers hold the lock, a continuous stream of overlapping readers keeps the count above zero, and a writer waits forever. My home-made lock published 0 fare tables in 3 seconds against 6 readers. `ReentrantReadWriteLock`'s nonfair mode makes new readers block if the first queued thread is a writer (`readerShouldBlock()` returns `apparentlyFirstQueuedIsExclusive()`), and fair mode queues everyone in order. Both published 59 tables with a longest wait of 2 to 3 ms.",
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
              question: "After a release, some settlement requests hang forever while others work. CPU is low. A thread dump shows two threads BLOCKED and ends with \"Found one Java-level deadlock\". What do you do?",
              answer:
                "Read the report: each thread's \"waiting to lock\" and \"which is held by\" lines give the cycle, and the stacks give the code (remember the frame line can point one past the inner `synchronized`). Typically it's two code paths locking the same objects in different orders, often a new path added in the release. Restart to restore service (the JVM will never break it), then fix the order: one helper that sorts by id and locks, used by every path. Add a `findDeadlockedThreads` watchdog so the next one alerts in seconds.",
            },
            {
              question: "Your payout service stops processing during a traffic spike. Pods are UP, CPU is near zero, the deadlock watchdog reports nothing. Thread dumps show all 8 pool threads in FutureTask.get. What happened?",
              answer:
                "A thread-starvation deadlock: tasks on the pool are waiting for subtasks submitted to the same pool, and every thread is occupied by a waiting parent, so the subtasks never run. No lock, no owner, so no detector fires. My reproduction could jam at exactly the pool size (8 concurrent settlements, in one of two runs) and always jammed at 40, with 45 tasks queued and `findDeadlockedThreads` returning `null`. Confirm with the pool metrics (active equals maximum, queue growing, completed count flat). Fix by composing with `CompletableFuture` and running lookups on a separate executor; increasing the pool only moves the threshold.",
            },
            {
              question: "Two background jobs that reconcile driver balances both retry on lock conflicts. Logs show thousands of \"wallet busy, retrying\" lines per minute, but almost no reconciliations complete. No thread is blocked. What's going on, and how do you fix it?",
              answer:
                "A livelock: both jobs take a lock, find the other one's lock busy, release, wait the same fixed time and collide again. The threads are runnable or sleeping, never stuck, so dumps and detectors look healthy; the retry counter rising while completions stay flat is the signature. In my test, a fixed 50 ms backoff gave zero progress for 10 seconds; random jitter of 0 to 100 ms finished both in 94 to 273 ms. Add randomized (ideally exponential) backoff, and better, make both jobs lock in the same order so the conflict can't arise.",
            },
            {
              question: "Fare-table updates are delayed by minutes during peak hours, even though the update itself takes milliseconds. Quote requests are fine. The table is protected by a read-write lock. What do you suspect?",
              answer:
                "Writer starvation: with many concurrent quote requests, the read lock is almost always held by someone, and the writer can't find a moment with zero readers. This happens with a home-made read-write lock (or a library one that lets readers barge in past a waiting writer). My home-made lock published nothing for 3 seconds with 6 readers; `ReentrantReadWriteLock` published every 50 ms with a 2 to 3 ms wait. Switch to `ReentrantReadWriteLock`, or publish the table as an immutable snapshot through a `volatile` reference so readers need no lock at all.",
            },
            {
              question: "Your p99 latency for a rare but important operation (driver payouts) is 50x its median, while the frequent operations sharing the same lock look fine. A colleague proposes raising the payout thread's priority. What do you say?",
              answer:
                "It's starvation by barging on an unfair lock, and priorities won't fix it: on Linux with default flags, priority 10 and 1 got the same CPU in my test (ratio 1.07), and priorities don't influence who gets a lock anyway. Measure the lock wait for the payout thread, then use a fair lock (my payout p99 fell from 4.5 to 27 ms to under 1.1 ms, at a 20 to 33% throughput cost for the frequent threads), or better, stop the two workloads sharing one lock (split the data, or give payouts a snapshot).",
            },
            {
              question: "Under load, your service logs occasional \"ERROR: deadlock detected\" from PostgreSQL in the trip-settlement transaction. What does it mean and what do you change?",
              answer:
                "Two transactions locked the same rows in different orders (for example, rider then driver wallet in one path, driver then rider in another); PostgreSQL found the cycle after `deadlock_timeout` and aborted one as the victim, rolling back its entire transaction. Short term, catch SQLSTATE `40P01` and retry the whole transaction. Long term, lock rows in a consistent order (`SELECT ... WHERE id IN (...) ORDER BY id FOR UPDATE` first), keep transactions short, and alert on `pg_stat_database.deadlocks`. In my reproduction, the ordered version simply waited 383 ms and committed.",
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
            "In `WalletDeadlock`, delete the `pause(50)` line inside `transfer` and run it ten times.",
            "Run `WhoSeesIt 6000`, take `jstack -l <pid>`, and count the \"Found one Java-level deadlock\" blocks. Then find the two semaphore threads in the dump and try to work out, from the dump alone, which permit each one holds.",
            "Run `Priorities.java` twice, once plainly and once with `-XX:ThreadPriorityPolicy=1`, and compare the ratios.",
            "Run `SettlementPool` several times and watch the \"8 trips at once\" line.",
            "Change `PoliteLivelock`'s fixed backoff from 50 ms to a random value and rerun it, then change the start so the second thread begins 30 ms after the first.",
            "In a scratch PostgreSQL database, run the two wallet transactions from the Database Deadlocks section in two `psql` sessions, then query `SELECT deadlocks FROM pg_stat_database WHERE datname = current_database();`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 completed without a deadlock in 10 of 10 of my runs; the window became a few instructions wide, which is why the bug needs volume (thousands of transfers in `TransferStrategies`) to show up. Step 2 finds one deadlock, the `ReentrantLock` pair; the semaphore threads show `Locked ownable synchronizers: None`, and nothing in the dump says who holds the permits. Step 3 gave ratios of 1.07 and 1.10 by default and 1.84 and 1.71 with the flag, plus a warning about root permission. Step 4 sometimes jams and sometimes settles all 8 (I saw both). Step 5: with a random backoff, both transfers finish within a few attempts, as in the measured run. With a 30 ms head start, both versions finished in 50 ms with one attempt each: the first thread had both wallets and was done before the second began. A livelock needs the threads to move in step. Step 6 shows one `deadlock detected` error in one session, a commit in the other, and the counter going up by one.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `DEADLOCK    cycle of threads, each waiting for what the next one holds
            all 4 Coffman: mutual exclusion + hold&wait + no preemption + circular wait
            BLOCKED/WAITING forever, ~0 CPU, never broken by the JVM

DETECT      jcmd <pid> Thread.print -l | jstack -l  -> "Found one Java-level deadlock"
            ThreadMXBean.findDeadlockedThreads(): monitors + exclusiveOwnerThread
            findMonitorDeadlockedThreads(): monitors only (missed ReentrantLock)
            NOT SEEN: Semaphore, latch, barrier, Future.get/pool, virtual threads (21)
            cost: 0.04 ms (26 threads) .. ~1 ms (2,006): watchdog every second is fine

PREVENT     order by id (min first)          -> breaks circular wait
            tryLock(t) + release + jitter    -> breaks hold and wait (slowest)
            one lock / CAS on immutable state -> fewer or no locks (one lock fastest)
            lockInterruptibly, DB victim      -> weakens no preemption
            naive order: deadlock after 516..21,990 random transfers

LIVELOCK    busy, retrying, no progress; fixed 50 ms backoff = 0 transfers in 10 s
            random jitter 0-100 ms -> done in 94..273 ms

STARVATION  unfair lock barging: payout p99 4.5..27 ms (fair: < 1.1 ms, -20..33% tput)
            priorities: ignored on Linux by default (1.07); not a lock fix anyway
            readers vs writer: naive RW lock 0 writes, RRWL 59 (writer-first heuristic)

POOLS       task waits on subtask in same bounded pool = deadlock with no locks
            8 of 8 threads in FutureTask.get, null from every detector -> compose instead
DATABASE    PostgreSQL aborts a victim after deadlock_timeout; retry whole tx; ORDER BY id FOR UPDATE`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A deadlock needs all four Coffman conditions, so prevention is choosing which one to break: a global lock order by id is the usual answer, one coarse lock is often faster than people expect, and `tryLock` with jittered backoff is for when no order can be imposed.",
            "The JVM finds only cycles of owned locks among platform threads. Semaphores, latches, futures, thread pools and virtual threads deadlock silently, and so do livelocks and starvation, which is why progress metrics matter as much as the deadlock watchdog.",
            "Livelock is cured by randomness, starvation by fairness or separation (not by priorities), and database deadlocks by consistent row order plus retrying the whole transaction.",
            "Next comes Race Conditions, Thread Dumps and Testing Concurrent Code: the bugs where threads keep running but produce wrong results, how to read a thread dump from top to bottom, and how to write tests (including jcstress) that actually catch concurrency bugs.",
          ],
        },
      ],
    },
  ],
};
