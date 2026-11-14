import type { Lesson } from "../types";

export const reentrantAndReadWriteLocks: Lesson = {
  slug: "reentrant-and-read-write-locks",
  date: "2026-11-14",
  title: "ReentrantLock, ReadWriteLock, StampedLock and AQS",
  description:
    "The explicit locks of java.util.concurrent.locks on JDK 21, measured and taken apart: what Lock adds over synchronized (tryLock, timeouts, lockInterruptibly, fairness, several Conditions), why unlock belongs in finally (a lock held by a dead thread stays locked forever), fair locks that parked once per acquisition and ran 17 to 139 times slower, a bounded buffer with two Conditions, ReentrantReadWriteLock losing to synchronized by 3x on short reads and winning by 2x on long ones, readers using tryLock that starved a writer for a full second, the read-to-write upgrade that deadlocks a thread with itself, StampedLock's optimistic reads, and AbstractQueuedSynchronizer from the inside: its state int read through reflection, its wait queue in a thread dump, LockSupport.park and two synchronizers built on it in a few lines, ending with a fare-surge cache in a ride-hailing backend that hung every request thread and that the JVM's deadlock detector could not see.",
  tags: ["Multithreading", "Locks", "AQS", "Concurrency"],
  sections: [
    {
      title: "What ReentrantLock, ReadWriteLock and StampedLock Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, volatile, Visibility and the Java Memory Model, ended with what `volatile` can't do: it makes a single read or write visible, but it can't make a read-check-write sequence atomic. For that, the track has so far had one tool: `synchronized`, the monitor built into every object, covered two lessons ago in synchronized, Monitors and Race Conditions. This lesson is about the second family of locks, the ones in `java.util.concurrent.locks`, which are ordinary Java classes rather than a language keyword.",
        },
        {
          type: "paragraph",
          text: "`ReentrantLock` does what `synchronized` does (mutual exclusion, reentrancy, the same happens-before guarantees) and adds what the keyword can't express: trying to acquire without waiting, waiting with a timeout, waiting in a way that an interrupt can cancel, a fairness policy, and several separate wait queues (`Condition`s) per lock. `ReentrantReadWriteLock` splits the lock in two, so many readers can hold it at once while a writer needs it alone. `StampedLock` goes further with **optimistic reads** that don't write to shared memory at all. All three are built on one framework class, `AbstractQueuedSynchronizer` (AQS), which is also the engine under `CountDownLatch`, `Semaphore` and the thread pools' workers.",
        },
        {
          type: "paragraph",
          text: "Everything here is measured on JDK 21 on an 8-thread laptop: what the API calls do, what the locks cost uncontended and under contention, when a read-write lock helps and when it makes things three times slower, and what each lock looks like in a thread dump. The deep part is AQS itself, read through `javap`, reflection and `jcmd Thread.print`, because once its single `int` and its queue are clear, every synchronizer in the rest of the track becomes easy to reason about.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Before Java 5, `synchronized`, `wait` and `notify` were the only primitives, and libraries that needed timeouts or try-locks built them on top, usually badly. Doug Lea's `EDU.oswego.cs.dl.util.concurrent` package (1998) showed what a proper toolkit looked like, and it became JSR 166, which shipped in Java 5 as `java.util.concurrent`. His 2004 paper *The java.util.concurrent Synchronizer Framework* describes AQS: one atomic `int` of state plus a queue of waiting threads based on the CLH (Craig, Landin and Hagersten) queue lock, with subclasses only defining what \"acquire\" and \"release\" mean.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`synchronized`, `Object.wait/notify`", "One lock and one wait set per object, no timeouts on acquisition"],
            ["Java 5 (2004)", "JSR 166: `Lock`, `ReentrantLock`, `ReentrantReadWriteLock`, `Condition`, `AbstractQueuedSynchronizer`, `LockSupport`", "Locks as library classes with tryLock, timeouts, interruptible waits"],
            ["Java 6 (2006)", "`AbstractQueuedLongSynchronizer`; `LockSupport.park(Object blocker)`; `jstack -l` and `ThreadMXBean` report ownable synchronizers", "Thread dumps can say which lock a parked thread waits for"],
            ["Java 6 (2006)", "Biased and adaptive locking make uncontended `synchronized` cheap", "The early \"ReentrantLock is faster\" advice stopped being true"],
            ["Java 8 (2014)", "`StampedLock` (JEP 155)", "Optimistic reads; not reentrant, no conditions"],
            ["Java 9 (2017)", "j.u.c classes move from `sun.misc.Unsafe` to `VarHandle` and `jdk.internal.misc.Unsafe`", "AQS's CAS on `state` is now an internal intrinsic"],
            ["Java 14 (2020)", "AQS and `Condition` reimplemented by Doug Lea", "The `Node`/`ExclusiveNode`/`ConditionNode` classes seen in this lesson's `javap` output"],
            ["Java 15 (2020)", "Biased locking deprecated (JEP 374), disabled by default", "`synchronized` and `ReentrantLock` are close again uncontended"],
            ["Java 21 (2023)", "Virtual threads (JEP 444): blocking in `synchronized` pins the carrier, `ReentrantLock` doesn't", "One reason frameworks moved to `ReentrantLock`; JDK 24 (JEP 491) removes most pinning"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Picture the dispatch desk at a ride-hailing hub in Salt Lake, with one key to the dispatch terminal.",
        },
        {
          type: "list",
          items: [
            "**`synchronized` is a door with a lock and a crowd outside it.** You wait until it opens, however long that takes, and you can't decide to leave. Whoever pushes through first when it opens gets in.",
            "**`ReentrantLock` is the same desk with a token machine and a clock.** `tryLock()` is glancing at the desk and leaving if it's busy. `tryLock(200 ms)` is waiting a fixed time. `lockInterruptibly()` is waiting in a way your manager can call you away from. Reentrancy means the person holding the key can go through the inner door too, and has to hand the key back once per door.",
            "**Fairness is whether the token numbers are honoured.** In a fair lock the next token gets the key. In an unfair one, someone who just walked in and finds the key on the desk may take it, which is faster for the desk but bad luck for whoever was waiting.",
            "**`Condition`s are separate waiting rooms** attached to the same desk: one for dispatchers waiting for a free bay, one for drivers waiting for a trip. With `synchronized` there is one waiting room for everyone, so `notifyAll` wakes them all.",
            "**A read-write lock is the fare board.** Any number of drivers can read it at once, but the person updating surge prices needs the room empty, and nobody new is let in to read while they wait.",
            "**A `StampedLock` optimistic read is reading the board through the window** and then checking that its version number didn't change while you read. If it did, you go in properly.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real dispatcher who leaves the building takes the key with them or leaves it at the desk. A `ReentrantLock` held by a thread that dies is never released (this lesson shows it, `Locked by thread pricing-1` after that thread had terminated). And reading the fare board through the window is safe in real life because glass doesn't tear the numbers; an optimistic read in Java can see a half-written object and must be thrown away, not acted on, when the stamp doesn't validate.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/reentrant-and-read-write-locks-aqs.svg",
          alt: "Top left: the fields of ReentrantLock$NonfairSync, which is an AbstractQueuedSynchronizer: volatile int state equal to 1, Thread exclusiveOwnerThread equal to main, and volatile head and tail pointers. Every change to state goes through getState, setState or compareAndSetState. Top right: the wait queue, a CLH-style linked list: a dummy head node with no waiter, then an ExclusiveNode for thread asha-lock with status WAITING, then one for ravi-lock, which is the tail; next pointers go forward and prev pointers back. Both threads show as WAITING (parking), parking to wait for a ReentrantLock$NonfairSync in the thread dump. A Condition keeps its own list of ConditionNodes and signal moves one onto this queue. Middle: the lock path in four boxes: CAS state from 0 to 1 and become the owner; if that fails and the owner is the current thread, increment state for reentry; otherwise enqueue by CAS on tail and, if first in line, spin and retry; finally set status WAITING, recheck and call LockSupport.park. The unlock path: tryRelease decrements state and at 0 clears the owner with a volatile write; signalNext unparks the first waiter; the woken thread retries tryAcquire, and in a nonfair lock a newcomer may barge in first. Bottom: what the int means, measured: hold count for ReentrantLock, readers shifted left 16 bits plus writer holds for ReentrantReadWriteLock (3 readers is 0x00030000), count left for CountDownLatch, permits left for Semaphore.",
          caption: "Every lock in this lesson is an int changed by CAS plus a queue of parked threads.",
        },
        {
          type: "heading",
          text: "synchronized vs Lock",
        },
        {
          type: "table",
          headers: ["Capability", "`synchronized`", "`ReentrantLock`"],
          rows: [
            ["Mutual exclusion, reentrancy, happens-before", "Yes", "Yes (`unlock` happens-before the next `lock`)"],
            ["Release on exception", "Automatic (`monitorexit` in an exception handler)", "Only if you `unlock()` in `finally`"],
            ["Acquire without waiting", "No", "`tryLock()`"],
            ["Bounded wait", "No", "`tryLock(time, unit)`"],
            ["Cancel a waiting thread", "No: interrupts are ignored while BLOCKED", "`lockInterruptibly()`"],
            ["Fairness", "No guarantee", "`new ReentrantLock(true)`"],
            ["Wait sets", "One per object (`wait/notify`)", "Any number (`newCondition()`)"],
            ["Can span methods", "No, block-structured", "Yes: lock in one method, unlock in another"],
            ["Introspection", "`Thread.holdsLock(obj)`", "`isLocked`, `getHoldCount`, `getQueueLength`, `hasQueuedThreads`, `toString`"],
            ["Thread dump", "`- locked <...>`, `waiting to lock <...>`, BLOCKED", "`parking to wait for <...>`, WAITING (parking); owner only with `-l`"],
            ["Virtual threads on JDK 21", "Blocking inside pins the carrier thread", "Doesn't pin"],
          ],
        },
        {
          type: "heading",
          text: "The lock classes",
        },
        {
          type: "table",
          headers: ["Class", "Mode", "Reentrant", "Conditions", "AQS state means", "Use for"],
          rows: [
            ["`ReentrantLock`", "Exclusive", "Yes", "Yes, any number", "Hold count", "What `synchronized` does, plus the extras"],
            ["`ReentrantReadWriteLock`", "Shared reads, exclusive writes", "Yes, both", "Write lock only", "High 16 bits: read holds; low 16: write holds", "Long reads, rare writes"],
            ["`StampedLock`", "Write, read, optimistic read", "No", "No", "Its own `long state` (not AQS): version and reader count", "Very short reads of a few fields"],
            ["`AbstractQueuedSynchronizer`", "Exclusive and/or shared, as you define", "Up to you", "`ConditionObject`", "Whatever you define", "Building new synchronizers"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "`ReentrantLock` itself is almost empty: it holds a `Sync` object and forwards every call to it. `Sync` extends `AbstractQueuedSynchronizer`. `javap -p` shows the whole data model of AQS on JDK 21:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.locks.AbstractQueuedSynchronizer
javap -p 'java.util.concurrent.locks.AbstractQueuedSynchronizer$Node'
javap -p java.util.concurrent.locks.AbstractOwnableSynchronizer`,
        },
        {
          type: "output",
          text: `public abstract class java.util.concurrent.locks.AbstractQueuedSynchronizer extends java.util.concurrent.locks.AbstractOwnableSynchronizer implements java.io.Serializable {
  static final int WAITING;
  static final int CANCELLED;
  static final int COND;
  private volatile transient java.util.concurrent.locks.AbstractQueuedSynchronizer$Node head;
  private volatile transient java.util.concurrent.locks.AbstractQueuedSynchronizer$Node tail;
  private volatile int state;
  private static final jdk.internal.misc.Unsafe U;
  private static final long STATE;
  private static final long HEAD;
  private static final long TAIL;
  protected final int getState();
  protected final void setState(int);
  protected final boolean compareAndSetState(int, int);
  ...
  final int acquire(java.util.concurrent.locks.AbstractQueuedSynchronizer$Node, int, boolean, boolean, boolean, long);
  protected boolean tryAcquire(int);
  protected boolean tryRelease(int);
  protected int tryAcquireShared(int);
  protected boolean tryReleaseShared(int);
  protected boolean isHeldExclusively();
  public final void acquire(int);
  public final void acquireInterruptibly(int) throws java.lang.InterruptedException;
  public final boolean tryAcquireNanos(int, long) throws java.lang.InterruptedException;
  public final boolean release(int);
  public final void acquireShared(int);
  ...
abstract class java.util.concurrent.locks.AbstractQueuedSynchronizer$Node {
  volatile java.util.concurrent.locks.AbstractQueuedSynchronizer$Node prev;
  volatile java.util.concurrent.locks.AbstractQueuedSynchronizer$Node next;
  java.lang.Thread waiter;
  volatile int status;
  ...
public abstract class java.util.concurrent.locks.AbstractOwnableSynchronizer implements java.io.Serializable {
  private transient java.lang.Thread exclusiveOwnerThread;
  protected final void setExclusiveOwnerThread(java.lang.Thread);
  protected final java.lang.Thread getExclusiveOwnerThread();
}`,
        },
        {
          type: "list",
          items: [
            "**`private volatile int state`** is the whole synchronization state. Subclasses read it with `getState`, write it with `setState` (a volatile write) and change it atomically with `compareAndSetState`, which is a CAS through `jdk.internal.misc.Unsafe` at the field offset `STATE`. The next lesson, CAS, Atomic Classes, LongAdder and VarHandle, is about that instruction.",
            "**`head` and `tail`** are the ends of the wait queue, a doubly linked list of `Node`s. Each node records its `waiter` thread and a `status` (`WAITING` is 1, `CANCELLED` is `Integer.MIN_VALUE`, `COND` is 2, read with `javap -constants`). New waiters are appended with a CAS on `tail`, which is why many threads can enqueue at once without a lock.",
            "**`exclusiveOwnerThread`** comes from the superclass and is a plain field: only the owner writes it, and the volatile write of `state` publishes it. It's what `toString()` and `jcmd Thread.print -l` report as the owner.",
            "**The protected `tryAcquire`, `tryRelease`, `tryAcquireShared`, `tryReleaseShared` and `isHeldExclusively` throw `UnsupportedOperationException` by default.** A subclass overrides the ones for its mode. The public final methods (`acquire`, `release`, ...) contain all the queueing, parking, timeout and interrupt logic, written once.",
          ],
        },
        {
          type: "heading",
          text: "ReentrantLock's acquire, in bytecode",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p 'java.util.concurrent.locks.ReentrantLock$NonfairSync'",
        },
        {
          type: "output",
          text: `  final boolean initialTryLock();
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
      20: aload_0
      21: invokevirtual #23                 // Method getExclusiveOwnerThread:()Ljava/lang/Thread;
      24: aload_1
      25: if_acmpne     56
      28: aload_0
      29: invokevirtual #26                 // Method getState:()I
      32: iconst_1
      33: iadd
      34: istore_2
      35: iload_2
      36: ifge          49
      39: new           #30                 // class java/lang/Error
      42: dup
      43: ldc           #32                 // String Maximum lock count exceeded
      45: invokespecial #34                 // Method java/lang/Error."<init>":(Ljava/lang/String;)V
      48: athrow
      49: aload_0
      50: iload_2
      51: invokevirtual #37                 // Method setState:(I)V
      54: iconst_1
      55: ireturn
      56: iconst_0
      57: ireturn`,
        },
        {
          type: "list",
          items: [
            "**Offset 7: CAS `state` from 0 to 1.** If the lock is free, one atomic instruction acquires it, and the thread records itself as owner. That's the whole uncontended path: no queue, no allocation.",
            "**Offsets 20 to 51: reentry.** If the CAS failed but the owner is the current thread, `state` is simply incremented with a plain `setState` (no CAS needed, only the owner can be here). The hold count overflowing `int` throws `Error(\"Maximum lock count exceeded\")`.",
            "**Offset 56: give up the fast path.** `Sync.lock()` then calls `acquire(1)`, which runs `tryAcquire` again and, if that fails, queues the thread and parks it. `FairSync.initialTryLock` differs in one check: it calls `hasQueuedPredecessors()` before the CAS, so a newcomer never jumps the queue. That one check is the whole difference between fair and unfair, and the Fair vs Unfair section measures what it costs.",
          ],
        },
        {
          type: "heading",
          text: "Reading the state int of real synchronizers",
        },
        {
          type: "paragraph",
          text: "The meaning of `state` is up to each subclass. I read it with reflection from five synchronizers (it's private in `java.base`, so this needs `--add-opens`):",
        },
        {
          type: "code",
          language: "java",
          title: "AqsState.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Semaphore;
import java.util.concurrent.locks.AbstractQueuedSynchronizer;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class AqsState {
    // Reads the private AQS 'state' int behind a synchronizer (needs --add-opens)
    static int state(Object owner) throws Exception {
        Field syncField = owner.getClass().getDeclaredField("sync");
        syncField.setAccessible(true);
        Object sync = syncField.get(owner);
        Field stateField = AbstractQueuedSynchronizer.class.getDeclaredField("state");
        stateField.setAccessible(true);
        return stateField.getInt(sync);
    }

    static void show(String label, Object owner) throws Exception {
        int s = state(owner);
        System.out.printf("%-34s state=%-7d (0x%08x)%n", label, s, s);
    }

    public static void main(String[] args) throws Exception {
        ReentrantLock lock = new ReentrantLock();
        show("ReentrantLock, free", lock);
        lock.lock();
        show("ReentrantLock, locked once", lock);
        lock.lock();
        show("ReentrantLock, locked twice", lock);
        System.out.println("  toString: " + lock);
        lock.unlock();
        lock.unlock();
        show("ReentrantLock, released", lock);

        ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
        CountDownLatch readersIn = new CountDownLatch(3), release = new CountDownLatch(1);
        for (int i = 0; i < 3; i++) {
            Thread.ofPlatform().daemon().start(() -> {
                rw.readLock().lock();
                readersIn.countDown();
                try { release.await(); } catch (InterruptedException e) { }
                rw.readLock().unlock();
            });
        }
        readersIn.await();
        show("RWLock, 3 readers", rw);
        release.countDown();
        while (rw.getReadLockCount() > 0) Thread.onSpinWait();
        rw.writeLock().lock();
        show("RWLock, 1 writer", rw);
        rw.writeLock().unlock();

        CountDownLatch latch = new CountDownLatch(3);
        show("CountDownLatch(3)", latch);
        latch.countDown();
        show("CountDownLatch after countDown", latch);

        Semaphore permits = new Semaphore(5);
        permits.acquire(2);
        show("Semaphore(5) after acquire(2)", permits);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent.locks=ALL-UNNAMED --add-opens java.base/java.util.concurrent=ALL-UNNAMED AqsState",
        },
        {
          type: "output",
          text: `ReentrantLock, free                state=0       (0x00000000)
ReentrantLock, locked once         state=1       (0x00000001)
ReentrantLock, locked twice        state=2       (0x00000002)
  toString: java.util.concurrent.locks.ReentrantLock@2d98a335[Locked by thread main]
ReentrantLock, released            state=0       (0x00000000)
RWLock, 3 readers                  state=196608  (0x00030000)
RWLock, 1 writer                   state=1       (0x00000001)
CountDownLatch(3)                  state=3       (0x00000003)
CountDownLatch after countDown     state=2       (0x00000002)
Semaphore(5) after acquire(2)      state=3       (0x00000003)`,
        },
        {
          type: "list",
          items: [
            "**`ReentrantLock`: the hold count.** 0 is free, 1 is held, 2 is held twice by the same thread, and two `unlock()` calls bring it back to 0. `toString()` prints the owner.",
            "**`ReentrantReadWriteLock`: two counters in one int.** Three readers gave `0x00030000`: the read count lives in the high 16 bits (`SHARED_SHIFT = 16`, `SHARED_UNIT = 65536` in `javap -constants`), the write hold count in the low 16. Packing both into one int is what lets a single CAS check \"no writer\" and add a reader atomically. It also means at most 65,535 read holds and 65,535 write holds.",
            "**`CountDownLatch`: the remaining count.** `countDown()` CASes it down; `await()` succeeds when it's 0. **`Semaphore`: the free permits.** The same `int`, four different meanings.",
          ],
        },
        {
          type: "heading",
          text: "The wait queue in a thread dump",
        },
        {
          type: "paragraph",
          text: "To see the queue and parked threads, I made `main` hold a `ReentrantLock` and a monitor, started two threads that call `lock()`, one that waits on a `Condition` of another lock, and one that tries to enter the monitor:",
        },
        {
          type: "code",
          language: "java",
          title: "ParkedThreads.java",
          code: `import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

public class ParkedThreads {
    static final ReentrantLock DISPATCH = new ReentrantLock();
    static final ReentrantLock QUEUE = new ReentrantLock();
    static final Condition TRIP_READY = QUEUE.newCondition();
    static final Object MONITOR = new Object();

    public static void main(String[] args) throws Exception {
        Thread.ofPlatform().name("waits-on-condition").start(() -> {
            QUEUE.lock();
            try { TRIP_READY.await(); } catch (InterruptedException e) { }
            finally { QUEUE.unlock(); }
        });
        DISPATCH.lock();                                    // main holds a ReentrantLock
        synchronized (MONITOR) {                            // ...and a monitor
            Thread.ofPlatform().name("asha-lock").start(DISPATCH::lock);
            Thread.ofPlatform().name("ravi-lock").start(DISPATCH::lock);
            Thread.ofPlatform().name("sync-blocked").start(() -> { synchronized (MONITOR) { } });
            Thread.sleep(300);
            System.out.println("queue length " + DISPATCH.getQueueLength() + ", " + DISPATCH);
            Thread.sleep(60_000);                           // time for: jcmd ParkedThreads Thread.print -l
        }
        System.exit(0);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java ParkedThreads &
jcmd ParkedThreads Thread.print -l`,
        },
        {
          type: "output",
          text: `queue length 2, java.util.concurrent.locks.ReentrantLock@29453f44[Locked by thread main]

"main" #1 [140539] prio=5 os_prio=0 cpu=81.12ms elapsed=3.92s tid=0x00007232b0019920 nid=140539 waiting on condition  [0x00007232b4ffe000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
	at java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
	at ParkedThreads.main(ParkedThreads.java:23)
	- locked <0x000000008df15720> (a java.lang.Object)

   Locked ownable synchronizers:
	- <0x000000008df156b8> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)

"asha-lock" #21 [140558] prio=5 os_prio=0 cpu=0.27ms elapsed=3.82s tid=0x00007232b0176440 nid=140558 waiting on condition  [0x0000723294826000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008df156b8> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:788)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1024)
	at java.util.concurrent.locks.ReentrantLock$Sync.lock(java.base@21.0.13.0.3/ReentrantLock.java:153)
	at java.util.concurrent.locks.ReentrantLock.lock(java.base@21.0.13.0.3/ReentrantLock.java:322)
	at ParkedThreads$$Lambda/0x0000723238000c28.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
	- None

"waits-on-condition" #20 [140557] prio=5 os_prio=0 cpu=2.85ms elapsed=3.83s tid=0x00007232b01745a0 nid=140557 waiting on condition  [0x0000723294926000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008df15708> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:371)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionNode.block(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:519)
	at java.util.concurrent.ForkJoinPool.unmanagedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3780)
	at java.util.concurrent.ForkJoinPool.managedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3725)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1746)
	at ParkedThreads.lambda$main$0(ParkedThreads.java:13)
	at ParkedThreads$$Lambda/0x0000723238000a08.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
	- None

"sync-blocked" #23 [140560] prio=5 os_prio=0 cpu=0.34ms elapsed=3.81s tid=0x00007232b0178a30 nid=140560 waiting for monitor entry  [0x0000723294626000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at ParkedThreads.lambda$main$1(ParkedThreads.java:20)
	- waiting to lock <0x000000008df15720> (a java.lang.Object)
	at ParkedThreads$$Lambda/0x0000723238001a28.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
	- None`,
        },
        {
          type: "list",
          items: [
            "**Two different waiting states for the same situation.** `asha-lock` waits for a `ReentrantLock` and is `WAITING (parking)`, with `parking to wait for <0x...8df156b8> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)`. `sync-blocked` waits for a monitor and is `BLOCKED (on object monitor)`, with `waiting to lock`. Tools and alerts that only look for BLOCKED threads miss every j.u.c lock.",
            "**The object in `parking to wait for` is the `Sync`, not the `ReentrantLock`.** It's whatever was passed as the *blocker* to `LockSupport.park(blocker)`, and AQS passes `this`. The address `0x...8df156b8` is the same one listed under main's `Locked ownable synchronizers`, which is how to find the owner in a big dump.",
            "**The owner shows up only with `-l`.** Without it, `main`'s stack shows `- locked <...> (a java.lang.Object)` for the monitor and nothing for the `ReentrantLock`. Monitors are tracked by the JVM; `ReentrantLock` ownership is just a field in a Java object, which `-l` finds by scanning the heap for AQS instances owned by each thread.",
            "**The frames are the algorithm:** `ReentrantLock.lock`, `Sync.lock`, `AQS.acquire(int)` (line 1024), `AQS.acquire(Node, ...)` (line 788), `LockSupport.park`, `Unsafe.park`. The condition waiter parks on the `ConditionObject` instead, through `ConditionNode.block` and `ForkJoinPool.managedBlock`, which on JDK 21 lets a `ForkJoinPool` compensate for a blocked worker.",
            "**Queue length 2, three threads parked on that lock?** `getQueueLength()` was 2 and the dump shows only `asha-lock` and `ravi-lock` waiting for `0x...8df156b8`. The `waits-on-condition` thread parks on a different object: it holds no lock while waiting, because `await()` released `QUEUE`. A `Condition` has its own queue, and `signal()` moves a node from it into the lock's queue.",
          ],
        },
        {
          type: "heading",
          text: "LockSupport.park and unpark",
        },
        {
          type: "paragraph",
          text: "AQS never uses `wait/notify`. It blocks threads with `LockSupport.park()` and wakes them with `unpark(thread)`, which work like a per-thread permit that holds at most one token:",
        },
        {
          type: "code",
          language: "java",
          title: "ParkPermit.java",
          code: `import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;

public class ParkPermit {
    static long ms(long start) { return (System.nanoTime() - start) / 1_000_000; }

    public static void main(String[] args) throws Exception {
        Thread me = Thread.currentThread();

        LockSupport.unpark(me);                         // permit given before park
        long t = System.nanoTime();
        LockSupport.park();                             // consumes it, returns at once
        System.out.println("park after unpark returned in " + ms(t) + " ms");

        LockSupport.unpark(me); LockSupport.unpark(me); // permits do not add up: at most one
        LockSupport.park();
        t = System.nanoTime();
        LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(200));
        System.out.println("second park waited " + ms(t) + " ms (only one permit was stored)");

        Object blocker = new Object() { public String toString() { return "trip-assignment"; } };
        Thread waiter = Thread.ofPlatform().name("waiter").start(() -> {
            LockSupport.park(blocker);                  // the blocker is what thread dumps print
            System.out.println("waiter woke up, interrupted = " + Thread.currentThread().isInterrupted());
        });
        Thread.sleep(100);
        System.out.println("waiter " + waiter.getState() + ", blocker " + LockSupport.getBlocker(waiter));
        waiter.interrupt();                             // interrupt also ends park, without an exception
        waiter.join();
    }
}`,
        },
        {
          type: "output",
          text: `park after unpark returned in 0 ms
second park waited 200 ms (only one permit was stored)
waiter WAITING, blocker trip-assignment
waiter woke up, interrupted = true`,
        },
        {
          type: "list",
          items: [
            "**`unpark` before `park` isn't lost.** The permit is stored and the next `park` consumes it immediately. That removes the classic lost-wakeup race of `wait/notify` (where a `notify` before the `wait` is lost) and is why AQS can unpark a successor without holding any lock.",
            "**Permits don't accumulate.** Two `unpark`s stored one permit, so the second `park` waited for its 200 ms timeout. AQS never relies on counting wake-ups; after every `park` it rechecks the state in a loop.",
            "**`park` can also return for no reason** (spuriously) and returns, without an exception, when the thread is interrupted. The interrupt flag stays set, and AQS checks it afterwards: `lockInterruptibly` turns it into `InterruptedException`, `lock()` re-asserts the flag and keeps waiting.",
            "**The blocker** is what a thread dump prints after `parking to wait for`, and `LockSupport.getBlocker(thread)` returns it. Code that calls `park()` without a blocker produces dumps that say nothing useful.",
          ],
        },
        {
          type: "heading",
          text: "How CountDownLatch uses the same machinery",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p 'java.util.concurrent.CountDownLatch$Sync'",
        },
        {
          type: "output",
          text: `  protected int tryAcquireShared(int);
    Code:
       0: aload_0
       1: invokevirtual #13                 // Method getState:()I
       4: ifne          11
       7: iconst_1
       8: goto          12
      11: iconst_m1
      12: ireturn

  protected boolean tryReleaseShared(int);
    Code:
       0: aload_0
       1: invokevirtual #13                 // Method getState:()I
       4: istore_2
       5: iload_2
       6: ifne          11
       9: iconst_0
      10: ireturn
      11: iload_2
      12: iconst_1
      13: isub
      14: istore_3
      15: aload_0
      16: iload_2
      17: iload_3
      18: invokevirtual #17                 // Method compareAndSetState:(II)Z
      21: ifeq          34
      24: iload_3
      25: ifne          32
      28: iconst_1
      29: goto          33
      32: iconst_0
      33: ireturn
      34: goto          0`,
        },
        {
          type: "paragraph",
          text: "That's the entire latch: `await()` is a shared acquire that succeeds (returns 1) when `state == 0` and otherwise returns -1, which makes AQS queue and park the thread. `countDown()` is a shared release that CASes the count down in a retry loop (offset 34 jumps back to 0 when the CAS loses) and returns `true` only for the transition to 0, which makes AQS wake the queued threads one after another (`signalNextIfShared`). The CountDownLatch and CyclicBarrier lesson later in the track uses the latch; this is what's underneath it.",
        },
      ],
    },
    {
      title: "The Lock API: tryLock, Timeouts and Interruption",
      blocks: [
        {
          type: "paragraph",
          text: "A thread `holder` takes a driver's `ReentrantLock` and a monitor and keeps both. Then other threads try every way of acquiring them:",
        },
        {
          type: "code",
          language: "java",
          title: "LockApi.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

public class LockApi {
    static final ReentrantLock DRIVER_RAVI = new ReentrantLock();
    static final Object RAVI_MONITOR = new Object();

    static void log(String s) { System.out.printf("[%-8s] %s%n", Thread.currentThread().getName(), s); }

    public static void main(String[] args) throws Exception {
        CountDownLatch held = new CountDownLatch(1), done = new CountDownLatch(1);
        Thread holder = Thread.ofPlatform().name("holder").start(() -> {
            DRIVER_RAVI.lock();
            synchronized (RAVI_MONITOR) {
                held.countDown();
                try { done.await(); } catch (InterruptedException e) { }
            }
            DRIVER_RAVI.unlock();
        });
        held.await();

        // 1. tryLock(): no waiting at all
        log("tryLock() -> " + DRIVER_RAVI.tryLock());

        // 2. tryLock(timeout): bounded waiting
        long t = System.nanoTime();
        boolean got = DRIVER_RAVI.tryLock(200, TimeUnit.MILLISECONDS);
        log("tryLock(200 ms) -> " + got + " after " + (System.nanoTime() - t) / 1_000_000 + " ms");

        // 3. lockInterruptibly(): a waiting thread can be cancelled
        Thread asha = Thread.ofPlatform().name("asha").start(() -> {
            try {
                DRIVER_RAVI.lockInterruptibly();
                try { log("got the lock"); } finally { DRIVER_RAVI.unlock(); }
            } catch (InterruptedException e) {
                log("lockInterruptibly() interrupted, state " + Thread.currentThread().getState());
            }
        });
        // 4. lock() and synchronized ignore interrupts while waiting
        Thread plain = Thread.ofPlatform().name("plain").start(() -> {
            DRIVER_RAVI.lock();
            try { log("lock() finally acquired, interrupted flag = " + Thread.currentThread().isInterrupted()); }
            finally { DRIVER_RAVI.unlock(); }
        });
        Thread mon = Thread.ofPlatform().name("monitor").start(() -> {
            synchronized (RAVI_MONITOR) {
                log("synchronized finally entered, interrupted flag = " + Thread.currentThread().isInterrupted());
            }
        });
        Thread.sleep(100);
        log("asha " + asha.getState() + ", plain " + plain.getState() + ", monitor " + mon.getState());
        asha.interrupt(); plain.interrupt(); mon.interrupt();
        asha.join();
        Thread.sleep(100);
        log("after interrupt: plain " + plain.getState() + ", monitor " + mon.getState());
        done.countDown();
        holder.join(); plain.join(); mon.join();

        // 5. reentrancy and ownership
        DRIVER_RAVI.lock(); DRIVER_RAVI.lock();
        log("holdCount " + DRIVER_RAVI.getHoldCount() + ", heldByMe " + DRIVER_RAVI.isHeldByCurrentThread());
        DRIVER_RAVI.unlock(); DRIVER_RAVI.unlock();
        try {
            DRIVER_RAVI.unlock();
        } catch (IllegalMonitorStateException e) {
            log("unlock() without holding -> " + e.getClass().getSimpleName());
        }
    }
}`,
        },
        {
          type: "output",
          text: `[main    ] tryLock() -> false
[main    ] tryLock(200 ms) -> false after 200 ms
[main    ] asha WAITING, plain WAITING, monitor BLOCKED
[asha    ] lockInterruptibly() interrupted, state RUNNABLE
[main    ] after interrupt: plain WAITING, monitor BLOCKED
[plain   ] lock() finally acquired, interrupted flag = true
[monitor ] synchronized finally entered, interrupted flag = true
[main    ] holdCount 2, heldByMe true
[main    ] unlock() without holding -> IllegalMonitorStateException`,
        },
        {
          type: "list",
          items: [
            "**`tryLock()` returns at once.** `false` here, because the lock is held. Note one subtlety from the Javadoc: the untimed `tryLock()` **barges** even on a fair lock, taking a free lock regardless of waiting threads. `tryLock(0, SECONDS)` respects fairness.",
            "**`tryLock(200, MILLISECONDS)` waited exactly the timeout** and returned `false`. Internally it's the same `acquire` with a deadline: the thread parks with `parkNanos` for the remaining time and gives up when it runs out. It also throws `InterruptedException` if interrupted.",
            "**`lockInterruptibly()` can be cancelled.** After `interrupt()`, `asha` left the queue with `InterruptedException` and moved on. This is how a request thread waiting for a lock can honour a shutdown or a request timeout.",
            "**`lock()` and `synchronized` can't.** After the interrupt, `plain` was still `WAITING` and `monitor` still `BLOCKED`. Both acquired eventually, when `holder` released, with their interrupt flag still set (which of the two printed first varied between runs). A thread stuck in `lock()` or at a `synchronized` block can't be freed by anything except the holder letting go.",
            "**Ownership is checked.** `unlock()` by a thread that doesn't hold the lock throws `IllegalMonitorStateException`, and `getHoldCount()`/`isHeldByCurrentThread()` are there for assertions (`assert lock.isHeldByCurrentThread()` in helper methods that expect the caller to hold it).",
          ],
        },
      ],
    },
    {
      title: "Always Unlock in finally",
      blocks: [
        {
          type: "paragraph",
          text: "`synchronized` releases the monitor whatever happens, because `javac` wraps the block in an exception handler that runs `monitorexit` (the synchronized lesson showed the bytecode). A `Lock` is released only by an `unlock()` call that you write. Here is what happens when the code between `lock()` and `unlock()` throws:",
        },
        {
          type: "code",
          language: "java",
          title: "UnlockInFinally.java",
          code: `import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class UnlockInFinally {
    // try-with-resources guard: unlock() runs in the generated finally
    record Held(Lock lock) implements AutoCloseable {
        static Held acquire(Lock lock) { lock.lock(); return new Held(lock); }
        @Override public void close() { lock.unlock(); }
    }

    static int fare(String zone) {
        if (zone.equals("NEW-TOWN")) throw new IllegalStateException("no surge table for " + zone);
        return 14_500;
    }

    public static void main(String[] args) throws Exception {
        ReentrantLock leaky = new ReentrantLock();
        Thread t = Thread.ofPlatform().name("pricing-1").start(() -> {
            leaky.lock();
            fare("NEW-TOWN");                     // throws: the unlock below never runs
            leaky.unlock();
        });
        t.join();
        System.out.println("pricing-1 is " + t.getState() + ", lock: " + leaky);
        System.out.println("tryLock(1 s) from main: " + leaky.tryLock(1, TimeUnit.SECONDS));

        Object monitor = new Object();
        Thread s = Thread.ofPlatform().name("pricing-2").start(() -> {
            synchronized (monitor) { fare("NEW-TOWN"); }   // monitorexit runs on the exception path too
        });
        s.join();
        synchronized (monitor) { System.out.println("synchronized: monitor free again after the exception"); }

        ReentrantLock safe = new ReentrantLock();
        Thread g = Thread.ofPlatform().name("pricing-3").start(() -> {
            try (var held = Held.acquire(safe)) {
                fare("NEW-TOWN");
            }
        });
        g.join();
        System.out.println("try-with-resources guard, lock: " + safe);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java UnlockInFinally 2>&1",
        },
        {
          type: "output",
          text: `Exception in thread "pricing-1" java.lang.IllegalStateException: no surge table for NEW-TOWN
	at UnlockInFinally.fare(UnlockInFinally.java:13)
	at UnlockInFinally.lambda$main$0(UnlockInFinally.java:21)
	at java.base/java.lang.Thread.run(Thread.java:1583)
pricing-1 is TERMINATED, lock: java.util.concurrent.locks.ReentrantLock@4554617c[Locked by thread pricing-1]
tryLock(1 s) from main: false
Exception in thread "pricing-2" java.lang.IllegalStateException: no surge table for NEW-TOWN
	at UnlockInFinally.fare(UnlockInFinally.java:13)
	at UnlockInFinally.lambda$main$1(UnlockInFinally.java:30)
	at java.base/java.lang.Thread.run(Thread.java:1583)
synchronized: monitor free again after the exception
Exception in thread "pricing-3" java.lang.IllegalStateException: no surge table for NEW-TOWN
	at UnlockInFinally.fare(UnlockInFinally.java:13)
	at UnlockInFinally.lambda$main$2(UnlockInFinally.java:38)
	at java.base/java.lang.Thread.run(Thread.java:1583)
try-with-resources guard, lock: java.util.concurrent.locks.ReentrantLock@355da254[Unlocked]`,
        },
        {
          type: "list",
          items: [
            "**The lock outlived its owner.** `pricing-1` threw, its `unlock()` never ran, and the thread terminated. The lock still says `Locked by thread pricing-1`, and `main` couldn't get it in a second. Nothing will ever release it: AQS doesn't know or care that the owner is dead, and only the owner may call `unlock()`. Every later caller of `lock()` waits forever.",
            "**`synchronized` cleaned up by itself.** Same exception in `pricing-2`, and the monitor was free afterwards.",
            "**The `Held` record is a try-with-resources guard.** The try-with-resources lesson showed that `javac` turns `try (var r = ...)` into a `finally` that calls `close()`; here `close()` is `unlock()`. The lock was released despite the exception. It's two lines of code, and it makes forgetting the `finally` impossible at the call site.",
          ],
        },
        {
          type: "paragraph",
          text: "The canonical shape, from the `Lock` Javadoc, is `lock.lock(); try { ... } finally { lock.unlock(); }`, with `lock()` **before** the `try`. If the acquisition were inside the `try` and failed (interrupted `lockInterruptibly`, a timed-out `tryLock`, an `Error`), the `finally` would call `unlock()` on a lock the thread doesn't hold. Common Mistakes shows that this replaces the real exception with `IllegalMonitorStateException`.",
        },
      ],
    },
    {
      title: "Fair vs Unfair, Measured",
      blocks: [
        {
          type: "paragraph",
          text: "`new ReentrantLock(true)` grants the lock in arrival order. The default is unfair: on `unlock()`, AQS unparks the first waiter, but a thread that arrives in the meantime and finds `state == 0` takes the lock with its CAS. Four threads hammered one lock for 500 ms; I also read each thread's `voluntary_ctxt_switches` from `/proc/thread-self/status`, which counts how often Linux put the thread to sleep, which here means `park`:",
        },
        {
          type: "code",
          language: "java",
          title: "FairVsUnfair.java",
          code: `import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.locks.ReentrantLock;

public class FairVsUnfair {
    static long shared;                                     // guarded by the lock
    static long[] switches;                                 // voluntary context switches per thread

    static long voluntarySwitches() {                       // Linux: this thread's scheduler stats
        try {
            return Files.readAllLines(Path.of("/proc/thread-self/status")).stream()
                    .filter(l -> l.startsWith("voluntary_ctxt_switches"))
                    .mapToLong(l -> Long.parseLong(l.split("\\\\s+")[1])).sum();
        } catch (Exception e) { return -1; }
    }

    // threads hammer one lock for 'millis'; returns acquisitions per thread
    static long[] run(ReentrantLock lock, int threads, long millis) throws Exception {
        long[] counts = new long[threads];
        switches = new long[threads];
        CountDownLatch start = new CountDownLatch(1);
        Thread[] ts = new Thread[threads];
        long end = System.nanoTime() + millis * 1_000_000 + 50_000_000;   // threads check the clock
        for (int i = 0; i < threads; i++) {
            int id = i;
            ts[i] = Thread.ofPlatform().start(() -> {
                try { start.await(); } catch (InterruptedException e) { return; }
                long n = 0, before = voluntarySwitches();
                while (System.nanoTime() < end) {
                    lock.lock();
                    try { shared++; } finally { lock.unlock(); }
                    n++;
                }
                counts[id] = n;
                switches[id] = voluntarySwitches() - before;
            });
        }
        Thread.sleep(50);
        start.countDown();
        for (Thread t : ts) t.join();
        return counts;
    }

    public static void main(String[] args) throws Exception {
        int threads = 4;
        for (boolean fair : new boolean[] {false, true, false, true}) {
            long best = 0, bestSwitches = 0; long[] bestCounts = null;
            for (int r = 0; r < 3; r++) {
                long[] c = run(new ReentrantLock(fair), threads, 500);
                long total = Arrays.stream(c).sum();
                if (total > best) { best = total; bestCounts = c; bestSwitches = Arrays.stream(switches).sum(); }
            }
            long min = Arrays.stream(bestCounts).min().getAsLong(), max = Arrays.stream(bestCounts).max().getAsLong();
            System.out.printf("%-6s %,11d locks in 500 ms  per thread %,10d..%,10d  parks (voluntary switches) %,8d%n",
                    fair ? "fair" : "unfair", best, min, max, bestSwitches);
        }
    }
}`,
        },
        {
          type: "output",
          text: `unfair   8,432,393 locks in 500 ms  per thread  1,991,241.. 2,232,631  parks (voluntary switches)   50,381
fair       424,625 locks in 500 ms  per thread     69,591..   156,955  parks (voluntary switches)   38,625
unfair   8,541,345 locks in 500 ms  per thread  1,848,033.. 2,497,376  parks (voluntary switches)   46,241
fair        75,421 locks in 500 ms  per thread     18,739..    19,151  parks (voluntary switches)   74,964`,
        },
        {
          type: "list",
          items: [
            "**Unfair: about 8.5 million acquisitions in 500 ms, fair: 75,000 to 425,000.** Over all my 4-thread runs, under varying load from other processes on the machine, the unfair lock did between 17 and 139 times more work. The ratio moved a lot with load; with 4 threads the direction never did (Try It Yourself has a 2-thread run where it did).",
            "**The cause is in the park column.** In the second fair run, 75,421 acquisitions cost 74,964 parks: almost exactly one sleep and wake-up per lock. A fair lock must hand the lock to the queued thread, which is asleep, so every `unlock()` is followed by a wake-up that takes microseconds while nobody holds the lock (a **lock convoy**). The unfair lock let the thread that just released it take it again on its next iteration, millions of times, with only about 50,000 parks in total.",
            "**The first fair run parked less (38,625 times for 424,625 acquisitions)** and its per-thread counts were uneven (69,591 to 156,955). When a thread finds the queue empty, even a fair lock lets it in by CAS, so under lighter scheduling pressure some acquisitions avoided the hand-off. Fairness is about the order of the queue, not equal shares of CPU.",
            "**The unfair lock didn't starve anyone here** (1.8 to 2.5 million per thread), because the OS scheduler preempts the barging thread often enough. Starvation with an unfair lock is possible but rarely the real problem; when bounded waiting matters, a fair lock or a queue (a `BlockingQueue`, later in the track) is the tool.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "When to choose fair",
          text: "Almost never for throughput. Choose fair when a waiting thread must not wait indefinitely behind barging ones, for example a small number of long critical sections where predictability matters more than speed. The Javadoc's own advice: fair locks give lower overall throughput, and fairness doesn't guarantee fair thread scheduling.",
        },
      ],
    },
    {
      title: "Conditions: A Bounded Buffer",
      blocks: [
        {
          type: "paragraph",
          text: "With `synchronized`, a monitor has one wait set, so producers waiting for space and consumers waiting for items share it and `notifyAll` wakes both kinds. A `ReentrantLock` can create any number of `Condition`s, each its own queue. This is the textbook example from the `Condition` Javadoc, for trip requests flowing from two producers to three drivers through a buffer of 4:",
        },
        {
          type: "code",
          language: "java",
          title: "BoundedBuffer.java",
          code: `import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

public class BoundedBuffer<T> {
    private final Object[] items;
    private int putIndex, takeIndex, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();     // producers wait here
    private final Condition notEmpty = lock.newCondition();    // consumers wait here
    final AtomicLong producerWaits = new AtomicLong(), consumerWaits = new AtomicLong();

    BoundedBuffer(int capacity) { items = new Object[capacity]; }

    void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) {                     // while, never if
                producerWaits.incrementAndGet();
                notFull.await();                                // releases the lock while waiting
            }
            items[putIndex] = item;
            putIndex = (putIndex + 1) % items.length;
            count++;
            notEmpty.signal();                                  // wake one consumer, not producers
        } finally {
            lock.unlock();
        }
    }

    @SuppressWarnings("unchecked")
    T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) {
                consumerWaits.incrementAndGet();
                notEmpty.await();
            }
            T item = (T) items[takeIndex];
            items[takeIndex] = null;
            takeIndex = (takeIndex + 1) % items.length;
            count--;
            notFull.signal();                                   // wake one producer
            return item;
        } finally {
            lock.unlock();
        }
    }

    public static void main(String[] args) throws Exception {
        BoundedBuffer<Long> requests = new BoundedBuffer<>(4);
        int perProducer = 50_000;
        AtomicLong consumedSum = new AtomicLong(), consumedCount = new AtomicLong();
        Thread[] producers = new Thread[2], drivers = new Thread[3];
        for (int p = 0; p < producers.length; p++) {
            producers[p] = Thread.ofPlatform().start(() -> {
                try { for (long i = 1; i <= perProducer; i++) requests.put(i); } catch (InterruptedException e) { }
            });
        }
        for (int d = 0; d < drivers.length; d++) {
            drivers[d] = Thread.ofPlatform().start(() -> {
                try {
                    while (true) {
                        long fare = requests.take();
                        if (fare < 0) return;                   // poison pill
                        consumedSum.addAndGet(fare);
                        consumedCount.incrementAndGet();
                    }
                } catch (InterruptedException e) { }
            });
        }
        for (Thread p : producers) p.join();
        for (int d = 0; d < drivers.length; d++) requests.put(-1L);
        for (Thread d : drivers) d.join();
        long expected = 2L * perProducer * (perProducer + 1) / 2;
        System.out.printf("consumed %,d items, sum %,d (expected %,d)%n", consumedCount.get(), consumedSum.get(), expected);
        System.out.printf("producers waited on notFull %,d times, drivers waited on notEmpty %,d times%n",
                requests.producerWaits.get(), requests.consumerWaits.get());
    }
}`,
        },
        {
          type: "output",
          text: `consumed 100,000 items, sum 2,500,050,000 (expected 2,500,050,000)
producers waited on notFull 45,327 times, drivers waited on notEmpty 72,281 times`,
        },
        {
          type: "list",
          items: [
            "**Every item arrived exactly once** (sum and count match in every run), with a buffer of only 4 slots.",
            "**`notEmpty.signal()` wakes one consumer, never a producer**, and `notFull.signal()` one producer. With a single wait set, `notify()` could wake the wrong kind of thread, which then waits again while the right one sleeps; that's why monitor code has to use `notifyAll` and wake everybody. Separate conditions make the cheaper `signal` correct.",
            "**`await()` releases the lock while waiting and reacquires it before returning**, like `wait()`. It saves the hold count and restores it, so it works even when the lock is held reentrantly.",
            "**Always `while`, never `if`.** In five runs, producers waited 42,845 to 45,893 times and drivers 65,931 to 72,281 times. Between a `signal` and the woken thread reacquiring the lock, another thread may have taken the slot or the item (and `await` may return spuriously), so the condition must be rechecked.",
            "**Both `await` and `signal` require holding the lock**, or they throw `IllegalMonitorStateException`. That is the same rule as `wait/notify` inside `synchronized`.",
          ],
        },
        {
          type: "paragraph",
          text: "In production code this class already exists: `ArrayBlockingQueue` is a bounded buffer implemented with one `ReentrantLock` and two conditions named exactly `notEmpty` and `notFull`. The BlockingQueue Implementations lesson opens it up.",
        },
      ],
    },
    {
      title: "ReentrantReadWriteLock: Read-Heavy Caches, Starvation and Upgrades",
      blocks: [
        {
          type: "paragraph",
          text: "The promise of a read-write lock is simple: readers don't block readers, so a cache that is read constantly and updated rarely should scale with the number of reader threads. I measured that promise on a surge-multiplier cache of 64 zones with 8 threads, comparing five ways of guarding the same `HashMap`. A read op reads `work` entries under one lock acquisition; `writesPerMille` of the ops are writes:",
        },
        {
          type: "code",
          language: "java",
          title: "ReadHeavyCache.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.LongAdder;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.concurrent.locks.StampedLock;

public class ReadHeavyCache {
    interface SurgeCache { int read(int zone, int work); void write(int zone, int pct); }

    static int quote(Map<Integer, Integer> m, int zone, int work) {   // a read of 'work' entries
        int sum = 0;
        for (int i = 0; i < work; i++) sum += m.get((zone + i) & 63);
        return sum;
    }

    static final class Sync implements SurgeCache {
        final Map<Integer, Integer> m = seed();
        public synchronized int read(int z, int w) { return quote(m, z, w); }
        public synchronized void write(int z, int p) { m.put(z, p); }
    }
    static final class Rl implements SurgeCache {
        final Map<Integer, Integer> m = seed(); final ReentrantLock l = new ReentrantLock();
        public int read(int z, int w) { l.lock(); try { return quote(m, z, w); } finally { l.unlock(); } }
        public void write(int z, int p) { l.lock(); try { m.put(z, p); } finally { l.unlock(); } }
    }
    static final class Rw implements SurgeCache {
        final Map<Integer, Integer> m = seed(); final ReentrantReadWriteLock l = new ReentrantReadWriteLock();
        public int read(int z, int w) { l.readLock().lock(); try { return quote(m, z, w); } finally { l.readLock().unlock(); } }
        public void write(int z, int p) { l.writeLock().lock(); try { m.put(z, p); } finally { l.writeLock().unlock(); } }
    }
    static final class Stamped implements SurgeCache {
        final Map<Integer, Integer> m = seed(); final StampedLock l = new StampedLock();
        public int read(int z, int w) {
            long stamp = l.tryOptimisticRead();
            int r;
            try { r = quote(m, z, w); } catch (RuntimeException e) { r = -1; }   // may see a torn HashMap
            if (l.validate(stamp)) return r;
            stamp = l.readLock();
            try { return quote(m, z, w); } finally { l.unlockRead(stamp); }
        }
        public void write(int z, int p) { long s = l.writeLock(); try { m.put(z, p); } finally { l.unlockWrite(s); } }
    }
    static final class Chm implements SurgeCache {
        final Map<Integer, Integer> m = new ConcurrentHashMap<>(seed());
        public int read(int z, int w) { return quote(m, z, w); }
        public void write(int z, int p) { m.put(z, p); }
    }

    static Map<Integer, Integer> seed() {
        Map<Integer, Integer> m = new HashMap<>();
        for (int z = 0; z < 64; z++) m.put(z, 100 + z);
        return m;
    }

    static int writesPerMille;

    static long opsPerMs(SurgeCache c, int threads, int work, long millis) throws Exception {
        LongAdder ops = new LongAdder();
        CountDownLatch go = new CountDownLatch(1);
        Thread[] ts = new Thread[threads];
        long[] end = new long[1];
        for (int i = 0; i < threads; i++) {
            ts[i] = Thread.ofPlatform().start(() -> {
                ThreadLocalRandom rnd = ThreadLocalRandom.current();
                try { go.await(); } catch (InterruptedException e) { return; }
                long n = 0, sink = 0;
                while (System.nanoTime() < end[0]) {
                    int zone = rnd.nextInt(64);
                    if (rnd.nextInt(1000) < writesPerMille) c.write(zone, 100 + rnd.nextInt(100));   // writesPerMille in 1000
                    else sink += c.read(zone, work);
                    n++;
                }
                ops.add(n + (sink == 42 ? 1 : 0));
            });
        }
        end[0] = System.nanoTime() + millis * 1_000_000;
        go.countDown();
        for (Thread t : ts) t.join();
        return ops.sum() / millis;
    }

    public static void main(String[] args) throws Exception {
        int threads = Integer.parseInt(args[0]), work = Integer.parseInt(args[1]);
        writesPerMille = Integer.parseInt(args[2]);
        String[] names = {"synchronized", "ReentrantLock", "ReentrantReadWriteLock", "StampedLock (optimistic)", "ConcurrentHashMap, no lock"};
        long[] best = new long[names.length];
        for (int round = 0; round < 3; round++) {
            SurgeCache[] caches = {new Sync(), new Rl(), new Rw(), new Stamped(), new Chm()};
            for (int i = 0; i < caches.length; i++) best[i] = Math.max(best[i], opsPerMs(caches[i], threads, work, 300));
        }
        System.out.printf("%d threads, %d map reads per read op, %.1f%% writes (best of 3, ops per ms)%n", threads, work, writesPerMille / 10.0);
        for (int i = 0; i < names.length; i++) System.out.printf("  %-27s %,9d%n", names[i], best[i]);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java ReadHeavyCache 8 1 0       # 8 threads, 1 map read per op, no writes
java ReadHeavyCache 8 1024 0    # 1,024 map reads per op, no writes
java ReadHeavyCache 8 1024 10   # 1,024 map reads per op, 1% writes`,
        },
        {
          type: "output",
          text: `8 threads, 1 map reads per read op, 0.0% writes (best of 3, ops per ms)
  synchronized                   18,178
  ReentrantLock                  13,787
  ReentrantReadWriteLock          5,709
  StampedLock (optimistic)      167,543
  ConcurrentHashMap, no lock    167,234
8 threads, 1024 map reads per read op, 0.0% writes (best of 3, ops per ms)
  synchronized                      410
  ReentrantLock                     457
  ReentrantReadWriteLock            911
  StampedLock (optimistic)        2,209
  ConcurrentHashMap, no lock      1,079
8 threads, 1024 map reads per read op, 1.0% writes (best of 3, ops per ms)
  synchronized                      280
  ReentrantLock                     253
  ReentrantReadWriteLock            424
  StampedLock (optimistic)        1,203
  ConcurrentHashMap, no lock        752`,
        },
        {
          type: "list",
          items: [
            "**For a short read, the read-write lock was the slowest option**: 5,709 ops per ms against 18,178 for `synchronized`, 3.2 times slower, even with zero writes. Every `readLock().lock()` is a CAS on the shared `state` int (adding `SHARED_UNIT`) and every `unlock()` another, plus bookkeeping of per-thread hold counts in a `ThreadLocal`. Eight cores doing CAS on one cache line bounce it between them; readers don't *block* each other, but they still **contend** on the lock's own memory. With a one-entry read, that overhead is the whole cost.",
            "**For a long read (1,024 map lookups), it won**: 911 against 410 (2.2 times) with no writes, 424 against 280 (1.5 times) with 1% writes. Now the critical section is long enough that the CAS is noise, and readers really overlap. Each write still waits for all readers to drain and blocks new ones, so writes erode the gain quickly.",
            "**`StampedLock` optimistic reads and `ConcurrentHashMap` were in a different league** for short reads (167,543 and 167,234, about 9 times `synchronized`), because neither writes to shared memory on a read. Optimistic reads also led for long ones. The catch, shown in the `Stamped` class, is that an optimistic read of a `HashMap` can observe it mid-update and throw or loop, which is why my reader catches `RuntimeException` before validating; for anything bigger than a few fields, `ConcurrentHashMap` is the safer fast option.",
            "**These are single-machine numbers, best of three 300 ms rounds, not JMH**, on a laptop where other processes were running benchmarks at the same time. Absolute values moved by up to about 60% between runs; the ordering didn't. The lesson: a read-write lock pays off only when read critical sections are long (microseconds, not nanoseconds) and writes are rare. Measure before choosing it.",
          ],
        },
        {
          type: "heading",
          text: "Writer starvation",
        },
        {
          type: "paragraph",
          text: "A naive read-write lock lets readers in whenever no writer is **active**. With overlapping readers, the reader count never reaches zero and a writer waits forever. I compared a textbook readers-preference lock with `ReentrantReadWriteLock`, with four reader threads that each hold the read lock for 200 microseconds in a tight loop, and a writer that tries ten times with a one-second limit:",
        },
        {
          type: "code",
          language: "java",
          title: "WriterStarvation.java",
          code: `import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class WriterStarvation {
    // A textbook readers-preference lock: writers wait until no reader is inside
    static final class NaiveRwLock {
        private int readers; private boolean writing;
        synchronized void readLock() throws InterruptedException { while (writing) wait(); readers++; }
        synchronized void readUnlock() { if (--readers == 0) notifyAll(); }
        synchronized boolean writeLock(long timeoutMs) throws InterruptedException {
            long deadline = System.currentTimeMillis() + timeoutMs;
            while (writing || readers > 0) {
                long left = deadline - System.currentTimeMillis();
                if (left <= 0) return false;
                wait(left);
            }
            writing = true;
            return true;
        }
        synchronized void writeUnlock() { writing = false; notifyAll(); }
    }

    static volatile boolean stop;

    interface Rw { void read() throws InterruptedException; boolean write(long ms) throws InterruptedException; }

    static void spin(long micros) { long end = System.nanoTime() + micros * 1000; while (System.nanoTime() < end) Thread.onSpinWait(); }

    static void measure(String label, Rw rw) throws Exception {
        stop = false;
        Thread[] readers = new Thread[4];
        for (int i = 0; i < readers.length; i++) {
            readers[i] = Thread.ofPlatform().daemon().start(() -> {
                try { while (!stop) rw.read(); } catch (InterruptedException e) { }
            });
        }
        Thread.sleep(100);
        long worst = 0, total = 0; int timeouts = 0, attempts = 10;
        for (int i = 0; i < attempts; i++) {
            long t = System.nanoTime();
            if (!rw.write(1000)) timeouts++;
            long us = (System.nanoTime() - t) / 1_000;
            worst = Math.max(worst, us); total += us;
            Thread.sleep(20);
        }
        stop = true;
        for (Thread r : readers) r.join();
        System.out.printf("%-37s writer: %2d/%d timed out (1 s limit), avg wait %,9d us, worst %,9d us%n",
                label, timeouts, attempts, total / attempts, worst);
    }

    public static void main(String[] args) throws Exception {
        NaiveRwLock naive = new NaiveRwLock();
        measure("naive readers-preference lock", new Rw() {
            public void read() throws InterruptedException { naive.readLock(); try { spin(200); } finally { naive.readUnlock(); } }
            public boolean write(long ms) throws InterruptedException {
                if (!naive.writeLock(ms)) return false;
                naive.writeUnlock(); return true;
            }
        });
        for (boolean fair : new boolean[] {false, true}) {
            ReentrantReadWriteLock rrw = new ReentrantReadWriteLock(fair);
            String kind = fair ? "fair" : "nonfair";
            measure("RRWL " + kind + ", readers use lock()", new Rw() {
                public void read() { rrw.readLock().lock(); try { spin(200); } finally { rrw.readLock().unlock(); } }
                public boolean write(long ms) throws InterruptedException {
                    if (!rrw.writeLock().tryLock(ms, TimeUnit.MILLISECONDS)) return false;
                    rrw.writeLock().unlock(); return true;
                }
            });
            measure("RRWL " + kind + ", readers use tryLock()", new Rw() {
                public void read() {
                    if (rrw.readLock().tryLock()) { try { spin(200); } finally { rrw.readLock().unlock(); } }
                }
                public boolean write(long ms) throws InterruptedException {
                    if (!rrw.writeLock().tryLock(ms, TimeUnit.MILLISECONDS)) return false;
                    rrw.writeLock().unlock(); return true;
                }
            });
        }
    }
}`,
        },
        {
          type: "output",
          text: `naive readers-preference lock         writer: 10/10 timed out (1 s limit), avg wait 1,000,112 us, worst 1,000,352 us
RRWL nonfair, readers use lock()      writer:  0/10 timed out (1 s limit), avg wait       213 us, worst       256 us
RRWL nonfair, readers use tryLock()   writer: 10/10 timed out (1 s limit), avg wait 1,000,100 us, worst 1,000,156 us
RRWL fair, readers use lock()         writer:  0/10 timed out (1 s limit), avg wait       216 us, worst       267 us
RRWL fair, readers use tryLock()      writer: 10/10 timed out (1 s limit), avg wait 1,000,098 us, worst 1,000,112 us`,
        },
        {
          type: "list",
          items: [
            "**The naive lock starved the writer completely**: 10 of 10 attempts timed out after a full second.",
            "**`ReentrantReadWriteLock` with `readLock().lock()` let the writer in within about 0.2 ms, fair or not.** In nonfair mode, a new reader blocks if the first thread in the queue is a writer (`readerShouldBlock()` calls `apparentlyFirstQueuedIsExclusive()`). So a waiting writer stops the inflow of new readers, the current ones drain, and the writer goes next. That's a heuristic, not a guarantee, but it's why writer starvation is rare with this class.",
            "**But readers that use `readLock().tryLock()` starve the writer even on a fair lock.** The untimed `tryLock()` barges by design: it takes the read lock whenever no writer **holds** it, ignoring queued writers. 10 of 10 timeouts in both modes. A cache with a `tryLock()` fast path for reads can lock out its own refresh.",
          ],
        },
        {
          type: "heading",
          text: "No upgrade from read to write, but downgrade is allowed",
        },
        {
          type: "code",
          language: "java",
          title: "UpgradeDowngrade.java",
          code: `import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class UpgradeDowngrade {
    public static void main(String[] args) throws Exception {
        ReentrantReadWriteLock rw = new ReentrantReadWriteLock();

        // 1. upgrade read -> write with a timeout: refused
        rw.readLock().lock();
        boolean upgraded = rw.writeLock().tryLock(500, TimeUnit.MILLISECONDS);
        System.out.println("upgrade with tryLock(500 ms): " + upgraded + ", my read holds " + rw.getReadHoldCount());
        rw.readLock().unlock();

        // 2. upgrade with lock(): the thread waits for itself, forever
        Thread stuck = Thread.ofPlatform().name("upgrader").daemon().start(() -> {
            rw.readLock().lock();
            rw.writeLock().lock();                      // never returns
            System.out.println("unreachable");
        });
        stuck.join(1000);
        System.out.println("after 1 s: upgrader " + stuck.getState() + ", readLockCount " + rw.getReadLockCount()
                + ", writeLocked " + rw.isWriteLocked() + ", queued " + rw.getQueueLength());
        Thread other = Thread.ofPlatform().daemon().start(() -> rw.readLock().lock());
        other.join(500);
        System.out.println("a new reader now: " + other.getState() + " (queued behind the writer request)");

        // 3. downgrade write -> read: allowed
        ReentrantReadWriteLock rw2 = new ReentrantReadWriteLock();
        rw2.writeLock().lock();
        // ...update the cache...
        rw2.readLock().lock();                          // still holding the write lock: allowed
        rw2.writeLock().unlock();                       // now only a reader
        System.out.println("downgraded: writeLocked " + rw2.isWriteLocked() + ", my read holds " + rw2.getReadHoldCount());
        Thread reader = Thread.ofPlatform().start(() -> {
            rw2.readLock().lock();
            System.out.println("another reader got in alongside: readLockCount " + rw2.getReadLockCount());
            rw2.readLock().unlock();
        });
        reader.join();
        rw2.readLock().unlock();
    }
}`,
        },
        {
          type: "output",
          text: `upgrade with tryLock(500 ms): false, my read holds 1
after 1 s: upgrader WAITING, readLockCount 1, writeLocked false, queued 1
a new reader now: WAITING (queued behind the writer request)
downgraded: writeLocked false, my read holds 1
another reader got in alongside: readLockCount 2`,
        },
        {
          type: "list",
          items: [
            "**An upgrade attempt is refused or hangs.** The write lock requires that **no** thread holds the read lock, including the current one. `tryLock(500 ms)` returned `false`; plain `lock()` waited for its own read lock to be released, which can't happen: a deadlock with a single thread. The lock really is reentrant for reads and for writes, just not from read to write.",
            "**The stuck upgrader also blocks everyone else.** A new reader went straight to `WAITING`: the upgrader is queued as a writer, and new readers queue behind a waiting writer (the anti-starvation rule from above). One thread trying to upgrade can stop every reader and writer of that lock. That's the production incident at the end of this lesson.",
            "**Downgrade works:** holding the write lock, take the read lock, then release the write lock. Nothing else could have written in between, and other readers can join immediately (`readLockCount 2`). It's how to update and then keep reading a consistent value without a gap.",
            "**Why no upgrade?** If two readers both tried to upgrade, each would wait for the other's read lock forever. The class could detect that, but it would need to fail one of them, so instead it forbids the operation: release the read lock, acquire the write lock, and **re-check** the state, because someone else may have done the update in between. `StampedLock` offers `tryConvertToWriteLock`, which succeeds only if it can upgrade without waiting.",
          ],
        },
      ],
    },
    {
      title: "StampedLock and Optimistic Reads",
      blocks: [
        {
          type: "paragraph",
          text: "`StampedLock` (Java 8) is not built on AQS. It keeps a `long state` whose low 7 bits count readers (`RBITS = 127`), bit 7 is the write bit (`WBIT = 128`) and the higher bits are a version that every write lock and unlock advances (`ORIGIN = 256`), all read with `javap -constants`. Every acquisition returns that state as a **stamp**, and an optimistic read is just reading the version, reading your fields, and checking the version again:",
        },
        {
          type: "code",
          language: "java",
          title: "StampedDemo.java",
          code: `import java.util.concurrent.atomic.LongAdder;
import java.util.concurrent.locks.StampedLock;

public class StampedDemo {
    // A driver's position: two fields that must be read as a consistent pair
    static final class Position {
        private double lat = 22.5726, lon = 88.3639;          // Kolkata
        private final StampedLock sl = new StampedLock();
        final LongAdder optimisticOk = new LongAdder(), fellBack = new LongAdder();

        void move(double dLat, double dLon) {
            long stamp = sl.writeLock();
            try { lat += dLat; lon += dLon; } finally { sl.unlockWrite(stamp); }
        }

        double distanceFromOrigin() {
            long stamp = sl.tryOptimisticRead();               // no write to shared memory
            double la = lat, lo = lon;                         // copy into locals
            if (!sl.validate(stamp)) {                         // a writer got in: read again under a real read lock
                fellBack.increment();
                stamp = sl.readLock();
                try { la = lat; lo = lon; } finally { sl.unlockRead(stamp); }
            } else {
                optimisticOk.increment();
            }
            return Math.hypot(la - 22.5726, lo - 88.3639);
        }

        // upgrade is allowed here, unlike ReentrantReadWriteLock
        boolean moveIfAt(double expectLat, double newLat) {
            long stamp = sl.readLock();
            try {
                while (lat == expectLat) {
                    long ws = sl.tryConvertToWriteLock(stamp);
                    if (ws != 0L) { stamp = ws; lat = newLat; return true; }
                    sl.unlockRead(stamp);
                    stamp = sl.writeLock();
                }
                return false;
            } finally {
                sl.unlock(stamp);
            }
        }
    }

    public static void main(String[] args) throws Exception {
        StampedLock sl = new StampedLock();
        long r1 = sl.tryOptimisticRead();
        long w = sl.writeLock();
        System.out.printf("optimistic stamp %d, write stamp %d (binary %s)%n", r1, w, Long.toBinaryString(w));
        System.out.println("validate(old optimistic stamp) while writing: " + sl.validate(r1));
        System.out.println("tryWriteLock() again from the same thread: " + sl.tryWriteLock() + "  (0 = failed: not reentrant)");
        System.out.println("tryReadLock() from the writing thread:    " + sl.tryReadLock());
        sl.unlockWrite(w);
        long r2 = sl.tryOptimisticRead();
        System.out.printf("after unlockWrite: new optimistic stamp %d, old one still valid? %b%n", r2, sl.validate(r1));
        try {
            sl.asWriteLock().newCondition();
        } catch (UnsupportedOperationException e) {
            System.out.println("asWriteLock().newCondition(): UnsupportedOperationException");
        }

        Position ravi = new Position();
        Thread writer = Thread.ofPlatform().start(() -> {
            for (int i = 0; i < 200_000; i++) ravi.move(0.000001, 0.000001);
        });
        Thread[] readers = new Thread[3];
        for (int i = 0; i < readers.length; i++) {
            readers[i] = Thread.ofPlatform().start(() -> {
                for (int j = 0; j < 2_000_000; j++) ravi.distanceFromOrigin();
            });
        }
        writer.join();
        for (Thread t : readers) t.join();
        System.out.printf("reads: %,d validated optimistically, %,d fell back to readLock%n",
                ravi.optimisticOk.sum(), ravi.fellBack.sum());
        System.out.println("conditional upgrade: " + ravi.moveIfAt(ravi.lat, 22.60) + ", lat now " + ravi.lat);
    }
}`,
        },
        {
          type: "output",
          text: `optimistic stamp 256, write stamp 384 (binary 110000000)
validate(old optimistic stamp) while writing: false
tryWriteLock() again from the same thread: 0  (0 = failed: not reentrant)
tryReadLock() from the writing thread:    0
after unlockWrite: new optimistic stamp 512, old one still valid? false
asWriteLock().newCondition(): UnsupportedOperationException
reads: 5,938,794 validated optimistically, 61,206 fell back to readLock
conditional upgrade: true, lat now 22.6`,
        },
        {
          type: "list",
          items: [
            "**The stamps are the state.** A fresh lock's optimistic stamp is 256 (`ORIGIN`, no readers, no writer). The write stamp 384 is `256 | 128`: version plus write bit. After `unlockWrite` the version moved to 512, so the old optimistic stamp 256 no longer validates. `validate` is a comparison of version bits, preceded by a load fence: no write to shared memory, which is why optimistic reads scaled so well in the cache benchmark.",
            "**Not reentrant.** The writing thread's own `tryWriteLock()` and `tryReadLock()` returned 0 (failure). With the blocking `writeLock()` it would deadlock with itself. Code that calls a locked method from another locked method can't use `StampedLock`.",
            "**No conditions.** The `Lock` views (`asReadLock`, `asWriteLock`) throw `UnsupportedOperationException` from `newCondition()`. There's also no owner: any thread holding a valid stamp can unlock, which is flexible and removes a safety check.",
            "**Optimistic reads mostly succeed.** 3 reader threads did 6 million reads while a writer moved the position 200,000 times; 98.98% validated (5,938,794 of 6,000,000) and 61,206 fell back to a real read lock. The pattern: copy the fields into locals, validate, and only then use the locals. Between `tryOptimisticRead` and `validate` the values may be inconsistent (a new `lat` with an old `lon`), so nothing may depend on them before validation.",
            "**`tryConvertToWriteLock` is a safe upgrade:** it returns a write stamp if it can convert without waiting (no other readers), or 0, in which case the code releases and takes the write lock normally. The `moveIfAt` method is the pattern from the Javadoc.",
          ],
        },
      ],
    },
    {
      title: "Writing a Synchronizer on AQS",
      blocks: [
        {
          type: "paragraph",
          text: "The best way to understand AQS is to subclass it. A non-reentrant mutex needs `tryAcquire`, `tryRelease` and `isHeldExclusively`; a one-shot gate (a latch of count 1) needs only the two shared methods. AQS supplies the queue, parking, timeouts, interruption and conditions:",
        },
        {
          type: "code",
          language: "java",
          title: "TripGate.java",
          code: `import java.util.concurrent.locks.AbstractQueuedSynchronizer;

// Two synchronizers in a few lines each: AQS does the queueing, parking and waking
public class TripGate {
    // Exclusive: a non-reentrant mutex. state 0 = free, 1 = held
    static final class Mutex {
        private static final class Sync extends AbstractQueuedSynchronizer {
            @Override protected boolean tryAcquire(int ignored) {
                if (compareAndSetState(0, 1)) { setExclusiveOwnerThread(Thread.currentThread()); return true; }
                return false;
            }
            @Override protected boolean tryRelease(int ignored) {
                if (getState() == 0) throw new IllegalMonitorStateException();
                setExclusiveOwnerThread(null);
                setState(0);                                   // volatile write: publishes the critical section
                return true;
            }
            @Override protected boolean isHeldExclusively() { return getExclusiveOwnerThread() == Thread.currentThread(); }
        }
        private final Sync sync = new Sync();
        void lock() { sync.acquire(1); }
        void unlock() { sync.release(1); }
        int queued() { return sync.getQueueLength(); }
    }

    // Shared: a gate that is closed until opened once. state 0 = closed, 1 = open
    static final class OneShotGate {
        private static final class Sync extends AbstractQueuedSynchronizer {
            @Override protected int tryAcquireShared(int ignored) { return getState() == 1 ? 1 : -1; }
            @Override protected boolean tryReleaseShared(int ignored) { setState(1); return true; }
        }
        private final Sync sync = new Sync();
        void await() throws InterruptedException { sync.acquireSharedInterruptibly(1); }
        void open() { sync.releaseShared(1); }
        int waiting() { return sync.getQueueLength(); }
    }

    static long fares;                                          // guarded by MUTEX

    public static void main(String[] args) throws Exception {
        Mutex mutex = new Mutex();
        OneShotGate surgeTableLoaded = new OneShotGate();
        Thread[] drivers = new Thread[4];
        for (int i = 0; i < drivers.length; i++) {
            drivers[i] = Thread.ofPlatform().name("driver-" + i).start(() -> {
                try { surgeTableLoaded.await(); } catch (InterruptedException e) { return; }
                for (int j = 0; j < 250_000; j++) {
                    mutex.lock();
                    try { fares += 145; } finally { mutex.unlock(); }
                }
            });
        }
        Thread.sleep(200);
        System.out.println("waiting at the gate: " + surgeTableLoaded.waiting());
        surgeTableLoaded.open();                               // one release wakes every shared waiter
        for (Thread d : drivers) d.join();
        System.out.println("fares " + fares + " (expected " + 4L * 250_000 * 145 + "), queued now " + mutex.queued());
    }
}`,
        },
        {
          type: "output",
          text: `waiting at the gate: 4
fares 145000000 (expected 145000000), queued now 0`,
        },
        {
          type: "list",
          items: [
            "**The mutex is correct**: 4 threads, 1 million increments, exact total. The CAS from 0 to 1 is the acquire; `setState(0)` is the release, and because it's a volatile write it publishes everything written in the critical section to the next owner (the happens-before edge every lock must provide).",
            "**The gate shows shared mode.** All four drivers queued in `await()` (`waiting at the gate: 4`), and a single `releaseShared` woke all of them: when a shared acquire succeeds, AQS wakes the next shared waiter too, which propagates down the queue.",
            "**Return values carry the protocol.** `tryAcquireShared` returns negative for \"fail, queue me\", zero for \"succeeded, don't wake others\", positive for \"succeeded, others may too\". `tryReleaseShared` returns whether waiters should be woken.",
            "**What AQS doesn't give you:** reentrancy (my `Mutex` deadlocks if the owner calls `lock()` again, by design) and ownership checks beyond what `tryRelease` does. `ReentrantLock.Sync` adds both with the hold count and the owner comparison seen in the bytecode above.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing a contended `lock()` and the `unlock()` that releases it, with `main` holding a nonfair `ReentrantLock` and `asha-lock` calling `lock()`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Fast path.** `ReentrantLock.lock()` calls `Sync.lock()`, which calls `NonfairSync.initialTryLock()`: `compareAndSetState(0, 1)` fails because `state` is 1, and the owner is `main`, not the caller. It returns `false`.",
            "**Slow path.** `Sync.lock()` calls AQS `acquire(1)`, which calls `tryAcquire(1)` once more (the lock may have been released meanwhile), then the internal `acquire(node, ...)` loop.",
            "**Enqueue.** The loop allocates an `ExclusiveNode` with `waiter = asha-lock`, sets its `prev` to the current tail and CASes `tail` to point at it. If there was no queue yet, `tryInitializeHead` first installs a dummy head node.",
            "**Spin briefly, then mark.** If the node is first in line (its `prev` is `head`), it retries `tryAcquire` a few times with `Thread.onSpinWait()` between attempts. If that fails, it sets `status = WAITING`, which tells the releasing thread it must unpark this node, and checks `tryAcquire` once more to avoid sleeping through a release that happened in between.",
            "**Park.** `LockSupport.park(this)`: the thread state becomes `WAITING (parking)` with the `Sync` as the blocker, and the OS thread sleeps on a futex. This is the moment a thread dump captures as `parking to wait for <...> (a ...ReentrantLock$NonfairSync)`.",
            "**Release.** `main` calls `unlock()`, which calls `release(1)`, which calls `tryRelease(1)`: `state` drops to 0, so it clears `exclusiveOwnerThread` and does the volatile `setState(0)`. Everything `main` wrote under the lock is now visible to the next acquirer.",
            "**Wake the successor.** `release` calls `signalNext(head)`: if the first node's status is `WAITING`, it clears the status and calls `LockSupport.unpark(node.waiter)`.",
            "**Retry.** `asha-lock` returns from `park`, loops, and calls `tryAcquire(1)`. In a nonfair lock a thread that wasn't queued can win the CAS first, in which case `asha-lock` parks again. When it wins, its node becomes the new `head` (the old head is unlinked for the GC), it sets itself as owner and `lock()` returns. If it was interrupted while parked, `lock()` re-sets the interrupt flag before returning.",
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
          title: "LocksTour.java",
          code: `import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.concurrent.locks.StampedLock;

public class LocksTour {
    record Held(Lock lock) implements AutoCloseable {
        static Held acquire(Lock lock) { lock.lock(); return new Held(lock); }
        @Override public void close() { lock.unlock(); }
    }

    public static void main(String[] args) throws Exception {
        // 1. ReentrantLock: lock before try, unlock in finally
        ReentrantLock lock = new ReentrantLock();             // new ReentrantLock(true) for fair
        lock.lock();
        try {
            System.out.println("1 held " + lock.isHeldByCurrentThread() + ", holds " + lock.getHoldCount());
        } finally {
            lock.unlock();
        }

        // 2. tryLock with and without a timeout
        if (lock.tryLock(50, TimeUnit.MILLISECONDS)) {
            try { System.out.println("2 tryLock(50 ms) acquired"); } finally { lock.unlock(); }
        }

        // 3. interruptible acquisition
        lock.lockInterruptibly();
        try { System.out.println("3 lockInterruptibly acquired"); } finally { lock.unlock(); }

        // 4. a Condition: await in a loop, signal while holding the lock
        Condition tripReady = lock.newCondition();
        lock.lock();
        try {
            boolean signalled = tripReady.await(20, TimeUnit.MILLISECONDS);
            System.out.println("4 await(20 ms) signalled " + signalled);
        } finally {
            lock.unlock();
        }

        // 5. read/write lock, and a downgrade
        ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
        rw.writeLock().lock();
        try {
            rw.readLock().lock();                             // downgrade: take read before releasing write
        } finally {
            rw.writeLock().unlock();
        }
        try {
            System.out.println("5 readers " + rw.getReadLockCount() + ", writeLocked " + rw.isWriteLocked());
        } finally {
            rw.readLock().unlock();
        }

        // 6. StampedLock: optimistic read, validate, fall back
        StampedLock sl = new StampedLock();
        long stamp = sl.tryOptimisticRead();
        int surge = 20;                                       // read the fields into locals here
        if (!sl.validate(stamp)) {
            stamp = sl.readLock();
            try { surge = 20; } finally { sl.unlockRead(stamp); }
        }
        System.out.println("6 optimistic read valid, surge " + surge);

        // 7. try-with-resources guard
        try (var held = Held.acquire(lock)) {
            System.out.println("7 guard holds " + lock.getHoldCount());
        }
        System.out.println("  after guard: locked " + lock.isLocked());
    }
}`,
        },
        {
          type: "output",
          text: `1 held true, holds 1
2 tryLock(50 ms) acquired
3 lockInterruptibly acquired
4 await(20 ms) signalled false
5 readers 1, writeLocked false
6 optimistic read valid, surge 20
7 guard holds 1
  after guard: locked false`,
        },
        {
          type: "paragraph",
          text: "The shapes to remember: `lock()` before `try`, `unlock()` in `finally`; `if (tryLock(...)) { try { ... } finally { unlock(); } }` so that `unlock` runs only when the lock was acquired; `await` in a loop while holding the lock; downgrade by taking the read lock before releasing the write lock; an optimistic read copies fields, then validates, then uses them.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Taking two locks without deadlocking, with tryLock and back-off",
        },
        {
          type: "paragraph",
          text: "Moving a queued trip from one driver to another needs both drivers' locks. When two threads move trips in opposite directions at the same time, each takes its first lock and waits for the other's. The Deadlock, Livelock and Starvation lesson covers lock ordering in depth; `tryLock` with a timeout is the other classic escape:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverSwap.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

public class DriverSwap {
    static final class Driver {
        final String name; int trips; final ReentrantLock lock = new ReentrantLock();
        Driver(String name, int trips) { this.name = name; this.trips = trips; }
    }

    // Move one queued trip from 'from' to 'to'. Needs both locks; acquired in caller's order.
    static boolean naive(Driver from, Driver to) {
        from.lock.lock();
        try {
            sleepQuietly(1);                                   // widen the window
            to.lock.lock();
            try { from.trips--; to.trips++; return true; } finally { to.lock.unlock(); }
        } finally { from.lock.unlock(); }
    }

    static final AtomicInteger backoffs = new AtomicInteger();

    static boolean withTryLock(Driver from, Driver to) throws InterruptedException {
        while (true) {
            if (from.lock.tryLock(10, TimeUnit.MILLISECONDS)) {
                try {
                    sleepQuietly(1);
                    if (to.lock.tryLock(10, TimeUnit.MILLISECONDS)) {
                        try { from.trips--; to.trips++; return true; } finally { to.lock.unlock(); }
                    }
                } finally { from.lock.unlock(); }
            }
            backoffs.incrementAndGet();
            Thread.sleep(ThreadLocalRandom.current().nextInt(1, 5));   // random back-off breaks the symmetry
        }
    }

    static void sleepQuietly(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }

    interface Swap { void run(Driver a, Driver b) throws Exception; }

    static void race(String label, Swap swap) throws Exception {
        Driver asha = new Driver("Asha", 100), ravi = new Driver("Ravi", 100);
        Thread t1 = Thread.ofPlatform().daemon().start(() -> { try { for (int i = 0; i < 50; i++) swap.run(asha, ravi); } catch (Exception e) { } });
        Thread t2 = Thread.ofPlatform().daemon().start(() -> { try { for (int i = 0; i < 50; i++) swap.run(ravi, asha); } catch (Exception e) { } });
        t1.join(3000); t2.join(3000);
        boolean stuck = t1.isAlive() || t2.isAlive();
        long[] deadlocked = ManagementFactory.getThreadMXBean().findDeadlockedThreads();
        System.out.printf("%-8s %s  Asha %d, Ravi %d%n", label,
                stuck ? "STUCK after 3 s, findDeadlockedThreads() -> " + deadlocked.length + " threads" : "finished",
                asha.trips, ravi.trips);
    }

    public static void main(String[] args) throws Exception {
        race("naive", DriverSwap::naive);
        race("tryLock", DriverSwap::withTryLock);
        System.out.println("tryLock back-offs: " + backoffs.get());
    }
}`,
        },
        {
          type: "output",
          text: `naive    STUCK after 3 s, findDeadlockedThreads() -> 2 threads  Asha 100, Ravi 100
tryLock  finished  Asha 100, Ravi 100
tryLock back-offs: 42`,
        },
        {
          type: "list",
          items: [
            "**The naive version deadlocked in every run.** Both threads were `WAITING` forever, and the JVM's deadlock detector found them (`findDeadlockedThreads()` returned 2 threads): it understands `ReentrantLock` because each has an owner thread. Remember that for the production section, where the detector sees nothing.",
            "**The `tryLock` version always finished**, with between 33 and 52 back-offs over my runs. When a thread can't get its second lock within 10 ms, it **releases the first** and sleeps a random 1 to 4 ms before retrying. Releasing breaks the cycle; the randomness stops both threads from retrying in lockstep forever (a livelock).",
            "Trip counts stayed at 100 each, since every move is one decrement and one increment under both locks.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Waiting for a trip offer with a deadline",
        },
        {
          type: "paragraph",
          text: "A driver's app thread waits up to 300 ms for a trip offer before going back to the pool. One lock protects the offers, with one `Condition` per driver so an offer wakes only that driver's thread:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverInbox.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

public class DriverInbox {
    private final ReentrantLock lock = new ReentrantLock();
    private final Map<String, Condition> offerArrived = new HashMap<>();   // one Condition per driver
    private final Map<String, String> offers = new HashMap<>();

    void register(String driver) {
        lock.lock();
        try { offerArrived.put(driver, lock.newCondition()); } finally { lock.unlock(); }
    }

    void offer(String driver, String trip) {
        lock.lock();
        try {
            offers.put(driver, trip);
            offerArrived.get(driver).signal();                // wakes only that driver's thread
        } finally { lock.unlock(); }
    }

    // Waits up to 'timeout' for an offer, surviving spurious wake-ups
    String awaitOffer(String driver, long timeout, TimeUnit unit) throws InterruptedException {
        long nanos = unit.toNanos(timeout);
        lock.lock();
        try {
            while (!offers.containsKey(driver)) {
                if (nanos <= 0L) return null;                 // deadline passed
                nanos = offerArrived.get(driver).awaitNanos(nanos);   // returns the time left
            }
            return offers.remove(driver);
        } finally { lock.unlock(); }
    }

    public static void main(String[] args) throws Exception {
        DriverInbox inbox = new DriverInbox();
        for (String d : new String[] {"Asha", "Ravi"}) inbox.register(d);
        long start = System.nanoTime();
        Thread[] ts = new Thread[2];
        String[] names = {"Asha", "Ravi"};
        for (int i = 0; i < 2; i++) {
            String d = names[i];
            ts[i] = Thread.ofPlatform().start(() -> {
                try {
                    String trip = inbox.awaitOffer(d, 300, TimeUnit.MILLISECONDS);
                    System.out.printf("%s after ~%d ms: %s%n", d, Math.round((System.nanoTime() - start) / 1e7) * 10,
                            trip == null ? "no offer, going back online" : "accepted " + trip);
                } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            });
        }
        Thread.sleep(100);
        inbox.offer("Asha", "trip 9001 SALT-LAKE -> NEW-TOWN");
        for (Thread t : ts) t.join();
    }
}`,
        },
        {
          type: "output",
          text: `Asha after ~110 ms: accepted trip 9001 SALT-LAKE -> NEW-TOWN
Ravi after ~310 ms: no offer, going back online`,
        },
        {
          type: "paragraph",
          text: "`awaitNanos` returns the time still left, so the loop keeps an overall deadline even if the thread wakes spuriously or is signalled for an offer someone else removed. Asha got her offer after about 110 ms (rounded to 10 ms in the output, which was the same in every run); Ravi's wait ended at the 300 ms deadline with `null`. With `synchronized` this needs one shared monitor and `notifyAll`, waking every waiting driver for every offer.",
        },
      ],
    },
    {
      title: "When to Use Which Lock",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["Short critical section, no special needs", "`synchronized`", "Simplest, releases on exceptions, JIT can elide or coarsen it"],
            ["Need to give up after a timeout, or try without waiting", "`ReentrantLock.tryLock`", "`synchronized` can only wait forever"],
            ["Waiting thread must be cancellable (shutdown, request deadline)", "`lockInterruptibly`", "BLOCKED threads ignore interrupts"],
            ["Several distinct wait conditions on one state", "`ReentrantLock` + several `Condition`s", "`signal` the right waiters instead of `notifyAll`"],
            ["Virtual threads that block while holding a lock (JDK 21 to 23)", "`ReentrantLock`", "`synchronized` pins the carrier thread"],
            ["Long reads (microseconds), rare writes", "`ReentrantReadWriteLock`", "Readers overlap; measured 1.5 to 2.2x over `synchronized`"],
            ["Short reads, frequent access", "`synchronized`, or better a concurrent structure", "RW lock was 3.2x slower than `synchronized` here"],
            ["Reading a few fields very often, rare writes", "`StampedLock` optimistic read", "No shared write on read; about 9x `synchronized` here"],
            ["A key-value cache", "`ConcurrentHashMap`", "No lock to manage; next lessons"],
            ["Strict arrival order matters more than throughput", "`new ReentrantLock(true)`", "17 to 139x slower in my runs"],
            ["A custom gate, latch or permit scheme", "Subclass `AbstractQueuedSynchronizer`", "Queueing and parking come for free"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Calling lock() inside the try",
        },
        {
          type: "code",
          language: "java",
          title: "LockInsideTry.java",
          code: `import java.util.concurrent.locks.ReentrantLock;

public class LockInsideTry {
    public static void main(String[] args) throws Exception {
        ReentrantLock lock = new ReentrantLock();
        lock.lock();                                      // main holds it, so the worker waits
        Thread worker = Thread.ofPlatform().name("worker").start(() -> {
            try {
                try {
                    lock.lockInterruptibly();             // WRONG: acquisition inside the try
                    System.out.println("assigning trip");
                } finally {
                    lock.unlock();                        // runs even though we never got the lock
                }
            } catch (Exception e) {
                System.out.println("worker saw: " + e);
                System.out.println("suppressed/cause: " + java.util.Arrays.toString(e.getSuppressed()) + " / " + e.getCause());
            }
        });
        Thread.sleep(100);
        worker.interrupt();
        worker.join();
    }
}`,
        },
        {
          type: "output",
          text: `worker saw: java.lang.IllegalMonitorStateException
suppressed/cause: [] / null`,
        },
        {
          type: "paragraph",
          text: "The worker was interrupted while waiting, so `lockInterruptibly()` threw `InterruptedException`. The `finally` then called `unlock()` on a lock it never acquired, which threw `IllegalMonitorStateException`, and that **replaced** the `InterruptedException` entirely: no cause, nothing suppressed. The real reason (shutdown in progress) is gone from the logs. Acquire before the `try`; with `tryLock`, put the `try` inside the `if`.",
        },
        {
          type: "heading",
          text: "Forgetting unlock on an exception path",
        },
        {
          type: "paragraph",
          text: "Shown above: a `ReentrantLock` whose owner threw without `unlock()` stays locked after the thread dies, and every future caller waits forever. Every `lock()` needs a `finally`, or use a try-with-resources guard.",
        },
        {
          type: "heading",
          text: "Upgrading a read lock to a write lock",
        },
        {
          type: "paragraph",
          text: "`readLock().lock()` then `writeLock().lock()` deadlocks the thread with itself and then blocks every new reader. Release the read lock first and re-check after taking the write lock, or use `StampedLock.tryConvertToWriteLock`.",
        },
        {
          type: "heading",
          text: "Using readLock().tryLock() on a hot path",
        },
        {
          type: "paragraph",
          text: "The untimed `tryLock()` ignores queued writers, even on a fair lock. Readers that loop on it starved a writer for 10 out of 10 seconds-long attempts. Use `lock()` or `tryLock(0, TimeUnit.SECONDS)`, which honours fairness.",
        },
        {
          type: "heading",
          text: "Using the values of an optimistic read before validate",
        },
        {
          type: "paragraph",
          text: "Between `tryOptimisticRead()` and `validate()` the fields can be inconsistent or, for objects, half-constructed from the reader's point of view. Copy into locals, validate, then use. Never call methods on shared mutable objects (like a `HashMap`) in the optimistic section unless you can tolerate exceptions from a torn state, as the benchmark had to.",
        },
        {
          type: "heading",
          text: "Treating StampedLock as reentrant",
        },
        {
          type: "paragraph",
          text: "A method holding a write stamp that calls another method which takes the read or write lock blocks forever: `tryWriteLock()` from the owner returned 0. Keep `StampedLock` usage in small leaf methods.",
        },
        {
          type: "heading",
          text: "await or signal without holding the lock, or await with if",
        },
        {
          type: "paragraph",
          text: "`Condition.await()` and `signal()` throw `IllegalMonitorStateException` if the lock isn't held. `if (count == 0) notEmpty.await();` is wrong even when held: after waking, another consumer may have taken the item. Always `while`.",
        },
        {
          type: "heading",
          text: "Calling wait() or notify() on a Lock object",
        },
        {
          type: "paragraph",
          text: "A `ReentrantLock` is also an ordinary object with a monitor. `lock.wait()` compiles, and throws `IllegalMonitorStateException` unless you are inside `synchronized (lock)`, which has nothing to do with the `Lock`. Use `lock.newCondition()`. Likewise, don't mix `synchronized` and a `Lock` to guard the same data: they are two unrelated locks.",
        },
        {
          type: "heading",
          text: "Choosing a ReadWriteLock or a fair lock without measuring",
        },
        {
          type: "paragraph",
          text: "Both sound like improvements. For short critical sections the read-write lock was 3.2 times slower than `synchronized`, and the fair lock between 17 and 139 times slower than the unfair one.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Start with `synchronized`; switch to `ReentrantLock` when you need `tryLock`, timeouts, interruptible waits, several conditions, or virtual-thread friendliness on JDK 21 to 23.",
            "Write `lock(); try { ... } finally { unlock(); }` with the acquisition outside the `try`, or wrap the lock in a small `AutoCloseable` guard.",
            "Prefer `tryLock(timeout)` on paths that can wait on other services or locks, and decide what to do on failure (fail the request, retry with back-off).",
            "Use `lockInterruptibly` in code that must respect shutdown or request cancellation, and restore the interrupt flag if you catch `InterruptedException` without rethrowing.",
            "Keep critical sections short and never call remote services while holding a lock; the production section is what happens when a refresh runs under a lock.",
            "Use a read-write lock only for long reads with rare writes, and never upgrade; release, acquire the write lock, re-check.",
            "Use `StampedLock` optimistic reads only for a few fields copied into locals, validated before use; never reentrantly.",
            "Name your threads and pass blockers to `LockSupport.park` in custom synchronizers, so thread dumps are readable; use `jcmd <pid> Thread.print -l` to see owners of j.u.c locks.",
            "Prefer higher-level tools over hand-written locking: `ConcurrentHashMap`, `BlockingQueue`, `CountDownLatch`, `Semaphore`, which the next phases cover.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Uncontended cost first: one thread, 20 million lock-and-unlock pairs around a counter increment, best of seven:",
        },
        {
          type: "code",
          language: "java",
          title: "LockCost.java",
          code: `import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.concurrent.locks.StampedLock;
import java.util.function.LongUnaryOperator;

public class LockCost {
    static long counter;
    static final Object MON = new Object();
    static final ReentrantLock RL = new ReentrantLock();
    static final ReentrantLock FAIR = new ReentrantLock(true);
    static final ReentrantReadWriteLock RW = new ReentrantReadWriteLock();
    static final StampedLock SL = new StampedLock();

    static void bench(String label, LongUnaryOperator body) {
        int n = 20_000_000;
        double best = Double.MAX_VALUE;
        for (int r = 0; r < 7; r++) {
            long t = System.nanoTime();
            body.applyAsLong(n);
            best = Math.min(best, (System.nanoTime() - t) / (double) n);
        }
        System.out.printf("%-30s %5.1f ns per lock+unlock%n", label, best);
    }

    public static void main(String[] args) {
        bench("no lock", n -> { for (long i = 0; i < n; i++) counter++; return counter; });
        bench("synchronized", n -> { for (long i = 0; i < n; i++) synchronized (MON) { counter++; } return counter; });
        bench("ReentrantLock", n -> { for (long i = 0; i < n; i++) { RL.lock(); try { counter++; } finally { RL.unlock(); } } return counter; });
        bench("ReentrantLock(fair)", n -> { for (long i = 0; i < n; i++) { FAIR.lock(); try { counter++; } finally { FAIR.unlock(); } } return counter; });
        bench("RRWL readLock", n -> { for (long i = 0; i < n; i++) { RW.readLock().lock(); try { counter++; } finally { RW.readLock().unlock(); } } return counter; });
        bench("RRWL writeLock", n -> { for (long i = 0; i < n; i++) { RW.writeLock().lock(); try { counter++; } finally { RW.writeLock().unlock(); } } return counter; });
        bench("StampedLock readLock", n -> { for (long i = 0; i < n; i++) { long s = SL.readLock(); try { counter++; } finally { SL.unlockRead(s); } } return counter; });
        bench("StampedLock optimistic", n -> { long sum = 0; for (long i = 0; i < n; i++) { long s = SL.tryOptimisticRead(); long c = counter; if (SL.validate(s)) sum += c; } return sum; });
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java LockCost
java -XX:-EliminateLocks LockCost`,
        },
        {
          type: "output",
          text: `no lock                          0.0 ns per lock+unlock
synchronized                     5.6 ns per lock+unlock
ReentrantLock                   19.3 ns per lock+unlock
ReentrantLock(fair)             19.8 ns per lock+unlock
RRWL readLock                   25.1 ns per lock+unlock
RRWL writeLock                  18.0 ns per lock+unlock
StampedLock readLock            18.0 ns per lock+unlock
StampedLock optimistic           0.9 ns per lock+unlock

no lock                          0.0 ns per lock+unlock
synchronized                    19.7 ns per lock+unlock
ReentrantLock                   15.8 ns per lock+unlock
ReentrantLock(fair)             16.0 ns per lock+unlock
RRWL readLock                   19.5 ns per lock+unlock
RRWL writeLock                  16.1 ns per lock+unlock
StampedLock readLock            18.4 ns per lock+unlock
StampedLock optimistic           0.9 ns per lock+unlock`,
        },
        {
          type: "list",
          items: [
            "**`synchronized` looked 3.5 times cheaper than `ReentrantLock`, but that was the JIT, not the lock.** With `-XX:-EliminateLocks`, which turns off lock elision and coarsening, `synchronized` went from 5.6 to 19.7 ns. C2 had merged the monitor enter and exit of consecutive loop iterations (lock coarsening), something it can't do for `ReentrantLock`, whose lock is just method calls on an object. In real code, where a lock protects one operation per request, both cost a CAS and a release, about 15 to 20 ns uncontended on this laptop.",
            "**Fairness costs nothing without contention** (16.0 vs 15.8 ns): `hasQueuedPredecessors()` finds an empty queue.",
            "**A read lock is the most expensive uncontended acquisition** (19.5 to 25.1 ns): the CAS on `state` plus updating the per-thread read hold count. That's the overhead that made it lose on short reads.",
            "**An optimistic read is under 1 ns**: two volatile-ish reads and a comparison.",
            "Under contention the picture is the one measured above: the unfair `ReentrantLock` keeps the lock hot on one core and runs millions of acquisitions per second; a fair lock pays a park/unpark (several microseconds) per acquisition; a read-write lock helps only when reads are long.",
            "Single machine, `System.nanoTime` around a loop, not JMH, with other benchmarks running on the same CPU; I report ratios, which were stable across runs, rather than the absolute nanoseconds.",
          ],
        },
      ],
    },
    {
      title: "Locks in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing pricing service keeps surge percentages per zone in an in-memory cache with a 300 ms time-to-live (shortened for the reproduction; in production it was minutes). The cache is read on every fare quote, so the team protected it with a `ReentrantReadWriteLock`. The refresh was added later: when a reader finds a stale entry, it takes the write lock, reloads the surge from the pricing service and stores it. It passed review and the load test. In production, a few minutes after each deployment, every request thread of an instance stopped serving quotes. CPU dropped to zero, there were no exceptions, and the health check (which didn't touch the cache) stayed green. Restarting the instance fixed it until the first entry expired. I rebuilt it:",
        },
        {
          type: "code",
          language: "java",
          title: "SurgeCache.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.LongAdder;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class SurgeCache {
    record Surge(int percent, long loadedAtNanos) {
        boolean stale() { return System.nanoTime() - loadedAtNanos > 300_000_000L; }   // 300 ms TTL
    }

    private final Map<String, Surge> byZone = new HashMap<>();
    private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
    final LongAdder served = new LongAdder(), refreshes = new LongAdder();

    static int loadFromPricingService(String zone) {           // stands in for a remote call
        return zone.equals("SALT-LAKE") ? 20 : 35;
    }

    // What shipped: refresh under the read lock by "upgrading"
    int surgeBuggy(String zone) {
        rw.readLock().lock();
        try {
            Surge s = byZone.get(zone);
            if (s == null || s.stale()) {
                rw.writeLock().lock();                         // read -> write: waits for its own read lock
                try {
                    s = new Surge(loadFromPricingService(zone), System.nanoTime());
                    byZone.put(zone, s);
                    refreshes.increment();
                } finally {
                    rw.writeLock().unlock();
                }
            }
            served.increment();
            return s.percent();
        } finally {
            rw.readLock().unlock();
        }
    }

    // The fix: give up the read lock, take the write lock, re-check, downgrade
    int surgeFixed(String zone) {
        rw.readLock().lock();
        Surge s = byZone.get(zone);
        if (s != null && !s.stale()) {
            try { served.increment(); return s.percent(); } finally { rw.readLock().unlock(); }
        }
        rw.readLock().unlock();                                // never hold read while asking for write
        rw.writeLock().lock();
        try {
            s = byZone.get(zone);                              // another thread may have refreshed it
            if (s == null || s.stale()) {
                s = new Surge(loadFromPricingService(zone), System.nanoTime());
                byZone.put(zone, s);
                refreshes.increment();
            }
            rw.readLock().lock();                              // downgrade: allowed
        } finally {
            rw.writeLock().unlock();
        }
        try { served.increment(); return s.percent(); } finally { rw.readLock().unlock(); }
    }

    public static void main(String[] args) throws Exception {
        boolean fixed = args[0].equals("fixed");
        int seconds = Integer.parseInt(args[1]);
        SurgeCache cache = new SurgeCache();
        String[] zones = {"SALT-LAKE", "NEW-TOWN"};
        for (String z : zones) cache.byZone.put(z, new Surge(loadFromPricingService(z), System.nanoTime()));   // warm
        for (int i = 0; i < 8; i++) {
            String zone = zones[i % 2];
            Thread.ofPlatform().name("http-" + i).daemon().start(() -> {
                while (true) {
                    if (fixed) cache.surgeFixed(zone); else cache.surgeBuggy(zone);
                }
            });
        }
        long last = 0;
        for (int tick = 1; tick <= seconds * 4; tick++) {
            Thread.sleep(250);
            long now = cache.served.sum();
            if (tick % 2 == 0 || tick <= 4) {
                System.out.printf("%s t=%4d ms  served %,11d  (+%,d)  refreshes %d%n",
                        fixed ? "fixed" : "buggy", tick * 250, now, now - last, cache.refreshes.sum());
            }
            last = now;
        }
        long[] deadlocked = java.lang.management.ManagementFactory.getThreadMXBean().findDeadlockedThreads();
        long upgraders = Thread.getAllStackTraces().values().stream()
                .filter(st -> java.util.Arrays.stream(st).anyMatch(
                        f -> f.getClassName().endsWith("$WriteLock") && f.getMethodName().equals("lock")))
                .count();
        System.out.println("findDeadlockedThreads(): " + (deadlocked == null ? "null" : deadlocked.length + " threads")
                + ", threads parked in WriteLock.lock: " + upgraders);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java SurgeCache buggy 2
java SurgeCache fixed 2`,
        },
        {
          type: "output",
          text: `buggy t= 250 ms  served   1,031,677  (+1,031,677)  refreshes 0
buggy t= 500 ms  served   1,221,577  (+189,900)  refreshes 0
buggy t= 750 ms  served   1,221,577  (+0)  refreshes 0
buggy t=1000 ms  served   1,221,577  (+0)  refreshes 0
buggy t=1500 ms  served   1,221,577  (+0)  refreshes 0
buggy t=2000 ms  served   1,221,577  (+0)  refreshes 0
findDeadlockedThreads(): null, threads parked in WriteLock.lock: 7
fixed t= 250 ms  served   1,097,930  (+1,097,930)  refreshes 0
fixed t= 500 ms  served   2,599,918  (+1,501,988)  refreshes 2
fixed t= 750 ms  served   3,905,238  (+1,305,320)  refreshes 4
fixed t=1000 ms  served   5,264,304  (+1,359,066)  refreshes 6
fixed t=1500 ms  served   8,049,772  (+1,408,192)  refreshes 10
fixed t=2000 ms  served  11,005,003  (+1,477,984)  refreshes 12
findDeadlockedThreads(): null, threads parked in WriteLock.lock: 0`,
        },
        {
          type: "paragraph",
          text: "The buggy version served 1.2 million quotes in its first half second, and then nothing, ever. Exactly when the first entries passed their 300 ms TTL, request threads holding the read lock asked for the write lock. I took a thread dump of a run left going for 30 seconds:",
        },
        {
          type: "code",
          language: "bash",
          code: `java SurgeCache buggy 30 &
jcmd SurgeCache Thread.print -l`,
        },
        {
          type: "output",
          text: `"http-0" #20 [1086524] daemon prio=5 os_prio=0 cpu=68.45ms elapsed=3.80s tid=0x00007010d417c150 nid=1086524 waiting on condition  [0x000070106282d000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008c800748> (a java.util.concurrent.locks.ReentrantReadWriteLock$NonfairSync)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:788)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1024)
	at java.util.concurrent.locks.ReentrantReadWriteLock$WriteLock.lock(java.base@21.0.13.0.3/ReentrantReadWriteLock.java:959)
	at SurgeCache.surgeBuggy(SurgeCache.java:25)
	at SurgeCache.lambda$main$0(SurgeCache.java:74)
	at SurgeCache$$Lambda/0x0000701064000c28.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
	- None

"http-1" #21 [1086525] daemon prio=5 os_prio=0 cpu=70.37ms elapsed=3.80s tid=0x00007010d417d2d0 nid=1086525 waiting on condition  [0x000070106272d000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008c800748> (a java.util.concurrent.locks.ReentrantReadWriteLock$NonfairSync)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:788)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireShared(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1113)
	at java.util.concurrent.locks.ReentrantReadWriteLock$ReadLock.lock(java.base@21.0.13.0.3/ReentrantReadWriteLock.java:738)
	at SurgeCache.surgeBuggy(SurgeCache.java:21)
	at SurgeCache.lambda$main$0(SurgeCache.java:74)
	at SurgeCache$$Lambda/0x0000701064000c28.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
	- None
...`,
        },
        {
          type: "list",
          items: [
            "**What the dump says:** all 8 `http-` threads are `WAITING (parking)` on the same `ReentrantReadWriteLock$NonfairSync`. Six were in `WriteLock.lock` called from `SurgeCache.java:25` (the upgrade, while holding the read lock taken at line 21); two were in `ReadLock.lock` at line 21, queued behind the waiting writers. Across runs, between 6 and 8 threads were stuck in the upgrade, depending on how many had found the entry stale at the same moment.",
            "**Why it hangs:** each upgrader waits for the read count to reach 0, but it holds one of those reads itself, and so do the other upgraders. New readers can't help either: they queue behind the waiting writers. Every thread is waiting for something only a waiting thread can do.",
            "**Why nothing alerted:** the dump has **no** `Found one Java-level deadlock` section, and `ThreadMXBean.findDeadlockedThreads()` returned `null`. The detector follows owner links, and read locks have no owner: `Locked ownable synchronizers: None` for every thread, even those holding a read lock. Compare Example 1, where the same detector found two threads deadlocked on `ReentrantLock`s. A read-write lock deadlock is invisible to it, so the only signals were zero throughput and the stack traces.",
            "**How to recognise it in a dump:** many threads parked on the same `ReentrantReadWriteLock$...Sync`, some of them in `WriteLock.lock` with a frame of your code that is **inside** a method that also took the read lock. Grep the dump for `WriteLock.lock` and look one frame below.",
            "**The fix (`surgeFixed`):** never request the write lock while holding the read lock. Release the read lock, take the write lock, **re-check** the entry (another thread may have refreshed it in the meantime, which is why there were 12 refreshes for 2 zones in 2 seconds and not one per request), refresh, then downgrade to the read lock to return the value. It served 11 million quotes in 2 seconds, about 1.4 million per 250 ms window, steadily.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took away from it:",
        },
        {
          type: "list",
          items: [
            "Read-to-write upgrade is a deadlock by design in `ReentrantReadWriteLock`; it belongs in code review checklists next to lock ordering.",
            "The JVM's deadlock detection doesn't cover read locks (or `StampedLock`, `Semaphore` or anything else without an owner). Throughput and \"requests in flight\" metrics are what catch these; a health check should exercise the real request path.",
            "`jcmd <pid> Thread.print -l`, taken two or three times a few seconds apart, is the first tool for any \"CPU idle but nothing happens\" incident. Identical stacks across dumps mean stuck, not slow.",
            "Better still, the refresh shouldn't run on the request thread or under the lock at all. The final version moved the remote call outside any lock and stored results in a `ConcurrentHashMap` with `compute`, which the ConcurrentHashMap lessons cover; a `tryLock(timeout)` on the write lock would at least have turned the hang into errors.",
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
              question: "What's the difference between synchronized and ReentrantLock?",
              answer:
                "Both give mutual exclusion, reentrancy and the same memory visibility guarantees. `ReentrantLock` adds `tryLock()` (don't wait), `tryLock(timeout)`, `lockInterruptibly()` (a waiting thread can be cancelled by an interrupt), an optional fair ordering, multiple `Condition`s, and introspection like `getQueueLength()`. The costs: you must `unlock()` in a `finally` yourself, and it's more code. `synchronized` releases automatically on exceptions and is the right default.",
            },
            {
              question: "Why must unlock() be in a finally block, and why is lock() called before try?",
              answer:
                "If the code between `lock` and `unlock` throws and `unlock` isn't in `finally`, the lock is never released: in my test it stayed `Locked by thread pricing-1` after that thread had terminated, and no other thread could ever acquire it. `lock()` goes before `try` because if acquisition fails (for example `lockInterruptibly` is interrupted), the `finally` would call `unlock()` on a lock the thread doesn't hold, throwing `IllegalMonitorStateException` that hides the original exception.",
            },
            {
              question: "What does \"reentrant\" mean?",
              answer:
                "The thread that holds the lock can acquire it again without blocking, for example when one locked method calls another. The lock counts holds and is released only when `unlock()` has been called as many times as `lock()`. In AQS terms the `state` int is the hold count: I read 1 after one `lock()` and 2 after two. `StampedLock` is not reentrant: a second `writeLock()` from the owner blocks forever.",
            },
            {
              question: "What is a ReadWriteLock and when does it help?",
              answer:
                "A pair of locks: a shared read lock that many threads can hold together, and an exclusive write lock that requires no readers and no other writer. It helps when reads are much more frequent than writes **and** read critical sections are long. In my benchmark it was 2.2x faster than `synchronized` for reads of 1,024 map lookups, but 3.2x slower for single lookups, because each read acquisition is a CAS on shared state.",
            },
            {
              question: "What is a Condition?",
              answer:
                "A wait queue associated with a `Lock`, created by `lock.newCondition()`. `await()` releases the lock and waits until signalled (or interrupted, or timed out), then reacquires the lock; `signal()` wakes one waiter, `signalAll()` all. Unlike a monitor's single wait set, a lock can have several conditions, such as `notFull` and `notEmpty` in a bounded buffer, so you wake only the right threads. Both must be called while holding the lock, and `await` belongs in a `while` loop.",
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
              question: "What's the difference between a fair and an unfair ReentrantLock, and which is faster?",
              answer:
                "A fair lock grants the lock to the longest-waiting thread (`FairSync` checks `hasQueuedPredecessors()` before its CAS). An unfair lock lets a thread that arrives while the lock is free take it, even if others are queued (barging). Unfair is much faster under contention: in my test 4 threads did 8.5 million acquisitions in 500 ms unfair and 75,000 fair, because the fair lock hands off to a parked thread on every release, about one park per acquisition. Over all runs the ratio was 17x to 139x. Uncontended, both cost the same.",
            },
            {
              question: "Can you upgrade a read lock to a write lock in ReentrantReadWriteLock?",
              answer:
                "No. The write lock requires zero read holds, including the caller's own, so `writeLock().lock()` while holding the read lock blocks forever; `tryLock(timeout)` returns `false`. Worse, the stuck thread is queued as a writer, so new readers queue behind it and the whole lock stops. Downgrading is allowed: take the read lock while holding the write lock, then release the write lock. To \"upgrade\", release the read lock, acquire the write lock and re-check, or use `StampedLock.tryConvertToWriteLock`.",
            },
            {
              question: "How does a thread dump show a thread waiting for a ReentrantLock, compared with synchronized?",
              answer:
                "A `synchronized` waiter is `BLOCKED (on object monitor)` with `- waiting to lock <addr> (a SomeClass)`, and the owner's frame shows `- locked <addr>`. A `ReentrantLock` waiter is `WAITING (parking)` with `- parking to wait for <addr> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)` under `Unsafe.park`. The owner isn't visible in its stack at all; `jcmd <pid> Thread.print -l` adds a `Locked ownable synchronizers` section listing the same `<addr>` under the owner thread.",
            },
            {
              question: "What is StampedLock's optimistic read and what are its pitfalls?",
              answer:
                "`tryOptimisticRead()` returns a stamp (the current version) without acquiring anything or writing shared memory; you read fields into locals, then `validate(stamp)` checks that no write lock was acquired since. If it fails, you retry under `readLock()`. In my test 99% of 6 million reads validated, and optimistic reads were about 9x faster than `synchronized` for short reads. Pitfalls: values read before validation may be inconsistent and must not be acted on; the lock isn't reentrant; it has no conditions and no owner; and it isn't built on AQS.",
            },
            {
              question: "What does lockInterruptibly() give you that lock() doesn't?",
              answer:
                "A waiting thread can be cancelled. If interrupted while queued, `lockInterruptibly()` leaves the queue and throws `InterruptedException`. `lock()` ignores the interrupt, keeps waiting, and returns with the interrupt flag set once it eventually acquires; `synchronized` behaves the same (the thread stays `BLOCKED`). I verified both: after `interrupt()`, the `lockInterruptibly` thread exited immediately while the `lock()` and `synchronized` threads waited until the holder released.",
            },
            {
              question: "Why do ReentrantReadWriteLock readers not starve writers, and when can they?",
              answer:
                "In nonfair mode, a new reader blocks if the first queued thread is a writer (`readerShouldBlock` uses `apparentlyFirstQueuedIsExclusive`), and fair mode queues readers behind any earlier waiter. So a waiting writer stops new readers and gets in once the current ones finish: about 0.2 ms in my test with continuously overlapping readers. Readers using the untimed `readLock().tryLock()` bypass this, because `tryLock()` barges by design: they starved the writer for the full second in 10 of 10 attempts, even on a fair lock.",
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
              question: "Explain how AbstractQueuedSynchronizer works.",
              answer:
                "AQS keeps a `volatile int state` and a FIFO wait queue (a CLH-style doubly linked list of nodes with `waiter` and `status`). Subclasses define acquire and release in terms of the state with `tryAcquire`/`tryRelease` (exclusive) or `tryAcquireShared`/`tryReleaseShared` (shared), using `getState`, `setState` and `compareAndSetState`. AQS's final methods handle the rest: on a failed try, enqueue a node with a CAS on `tail`, spin briefly if first, mark the node `WAITING`, recheck, `LockSupport.park`; on release, `signalNext` unparks the first waiter, which retries. It also implements timeouts, interruption, cancellation and `ConditionObject`. `ReentrantLock`, `ReentrantReadWriteLock`, `Semaphore`, `CountDownLatch` and `ThreadPoolExecutor.Worker` are all subclasses.",
            },
            {
              question: "How is the state int used by ReentrantLock, ReentrantReadWriteLock, CountDownLatch and Semaphore?",
              answer:
                "`ReentrantLock`: hold count (0 free). `ReentrantReadWriteLock`: two 16-bit counters, read holds in the high half and write holds in the low half; I read `0x00030000` with three readers. That's why one CAS can check \"no writer\" and add a reader. `CountDownLatch`: the remaining count; `await` succeeds at 0, `countDown` CASes it down. `Semaphore`: free permits; `acquire(2)` on `Semaphore(5)` left 3.",
            },
            {
              question: "Why can LockSupport.unpark be called before park, and why does AQS still loop after park returns?",
              answer:
                "Each thread has a single permit: `unpark` makes it available, `park` consumes it or blocks until it is. An `unpark` before `park` isn't lost, which removes the lost-wakeup race of `notify` before `wait`, so the releasing thread can unpark a successor without holding any lock. But permits don't accumulate (two `unpark`s let only one `park` through in my test), and `park` can return spuriously or on interrupt. So AQS treats a return from `park` as \"look again\": it retries `tryAcquire` in a loop and parks again if it fails.",
            },
            {
              question: "Implement a simple non-reentrant mutex using AQS.",
              answer:
                "Subclass AQS with `tryAcquire`: `if (compareAndSetState(0, 1)) { setExclusiveOwnerThread(Thread.currentThread()); return true; } return false;`, `tryRelease`: throw `IllegalMonitorStateException` if state is 0, otherwise clear the owner and `setState(0)` (the volatile write publishes the critical section), and `isHeldExclusively`: owner equals the current thread. Then `lock()` is `sync.acquire(1)` and `unlock()` is `sync.release(1)`. My version kept a counter exact under 4 threads and 1 million increments. A shared-mode gate is `tryAcquireShared` returning 1 if `state == 1` else -1, and `tryReleaseShared` setting state to 1.",
            },
            {
              question: "Why can't the JVM detect a deadlock involving read locks?",
              answer:
                "Deadlock detection (`ThreadMXBean.findDeadlockedThreads`, the `Found one Java-level deadlock` section of a thread dump) builds a graph from each blocked thread to the owner of what it waits for. Monitors and exclusive AQS synchronizers have an owner. Read locks are shared and have no owner thread, so there's no edge: in my surge cache, 6 to 8 threads were permanently stuck upgrading, `findDeadlockedThreads()` returned `null`, and every thread showed `Locked ownable synchronizers: None`. The same applies to `Semaphore`, `CountDownLatch` and `StampedLock`.",
            },
            {
              question: "In a microbenchmark synchronized was 3.5x faster than ReentrantLock. Is synchronized faster?",
              answer:
                "Not in general. My loop of lock-increment-unlock measured 5.6 ns for `synchronized` and 19.3 ns for `ReentrantLock`, but with `-XX:-EliminateLocks` `synchronized` became 19.7 ns. C2 had coarsened the monitor across unrolled iterations, an optimisation it can only apply to `synchronized`. Without that, both are one CAS to acquire and a release store. Under contention the behaviour depends on spinning and parking policies more than the base cost. So: use JMH, and compare the real code shape, not a tight loop.",
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
              question: "After a deployment, request threads of a pricing service stop making progress; CPU is near zero and there are no errors. What do you do?",
              answer:
                "Take two or three `jcmd <pid> Thread.print -l` dumps a few seconds apart. Identical stacks mean stuck, not slow. Then group threads by what they wait for: here, all request threads were `WAITING (parking)` on one `ReentrantReadWriteLock$NonfairSync`, some in `WriteLock.lock` called from a method that had already taken the read lock. That's a read-to-write upgrade deadlock, which the dump's deadlock detector doesn't report because read locks have no owner. Immediate mitigation is a restart; the fix is to release the read lock before taking the write lock and re-check (or move the refresh off the request path). In my reproduction, throughput went from zero after 500 ms to 1.4 million quotes per 250 ms.",
            },
            {
              question: "A service uses ReentrantReadWriteLock for a cache that's read 100 times more than it's written, but it's slower than the old synchronized version. Why?",
              answer:
                "Because the read critical section is short. Each `readLock().lock()`/`unlock()` is a CAS on the lock's shared `state` plus per-thread hold-count bookkeeping, so readers contend on the lock's cache line even though they don't block each other. I measured single-lookup reads at 5,709 ops/ms with the RW lock against 18,178 with `synchronized` on 8 threads. For a map, replace both with `ConcurrentHashMap` (167,234 ops/ms in the same test); for a few fields read constantly, a `StampedLock` optimistic read or an immutable snapshot in a `volatile`/`AtomicReference`.",
            },
            {
              question: "A thread dump shows 40 threads WAITING (parking) on the same ReentrantLock$NonfairSync, but no thread's stack shows it holding the lock. How do you find the owner?",
              answer:
                "Take the dump with `-l` (`jcmd <pid> Thread.print -l` or `jstack -l`): the owner lists the same address under `Locked ownable synchronizers`. If no thread lists it, the owner has terminated without unlocking: an exception path skipped `unlock()`, and the lock will never be released. I reproduced exactly that: `toString()` still said `Locked by thread pricing-1` after the thread was `TERMINATED`. The fix is `unlock()` in `finally` (or a try-with-resources guard), plus restarting the instance now; there's no way to release it from outside.",
            },
            {
              question: "Two threads moving trips between drivers occasionally hang forever. Each takes the source driver's lock and then the destination's. What are your options?",
              answer:
                "It's a lock-ordering deadlock: A to B and B to A at the same time. Options: impose a global order (always lock the lower driver ID first), or use `tryLock(timeout)` on the second lock and, on failure, release the first, back off for a random time and retry. My `tryLock` version never hung, with 33 to 52 back-offs per run, while the naive one deadlocked every time and was flagged by `findDeadlockedThreads()`. Ordering is simpler and has no retries; `tryLock` also bounds waiting when ordering isn't possible.",
            },
            {
              question: "During shutdown, worker threads waiting for a lock don't stop, and the pod is killed after the grace period. What would you change?",
              answer:
                "Threads waiting in `lock()` or at a `synchronized` block ignore `interrupt()`, so `executor.shutdownNow()` can't free them; I verified both stay waiting with the interrupt flag set. Use `lockInterruptibly()` (or `tryLock(timeout)` in a loop that checks for shutdown), handle `InterruptedException` by cleaning up and exiting, and keep critical sections short so the holder releases quickly. Also make sure nothing holds the lock across a blocking call that itself can't be interrupted.",
            },
            {
              question: "A team proposes switching all locks to fair ReentrantLocks because some requests have high tail latency. What do you tell them?",
              answer:
                "Measure first. Fairness forces a hand-off to a parked thread on every release, which costs a context switch per acquisition: in my test, 75,421 acquisitions in 500 ms caused 74,964 parks, against 8.5 million unfair acquisitions. Throughput dropped 17x to 139x, which usually makes tail latency worse under load. Tail latency from lock contention is better fixed by shortening the critical section, splitting the lock (per zone or per driver), or replacing it with a concurrent structure. Fair locks fit only where strict ordering matters more than throughput.",
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
            "Lock a `ReentrantLock` three times, print `getHoldCount()`, then call `unlock()` four times, printing the hold count after each call.",
            "On a `ReentrantReadWriteLock`, take the read lock and print `writeLock().tryLock()`. Release it, take the write lock, and print `readLock().tryLock()`.",
            "On a `StampedLock`, take `writeLock()` and print `tryWriteLock()` and `isWriteLocked()`.",
            "Create a `Condition` from a `ReentrantLock` and call `await()` and `signal()` without holding the lock.",
            "Run `ParkedThreads` and take `jcmd ParkedThreads Thread.print` with and without `-l`. Find which thread owns the `ReentrantLock`.",
            "Change `FairVsUnfair` to 2 threads and run it. Compare the ratio and the park counts with 4 threads.",
            "In `SurgeCache`, replace `rw.writeLock().lock()` in `surgeBuggy` with `if (!rw.writeLock().tryLock(1, TimeUnit.SECONDS)) throw new IllegalStateException(\"upgrade\");` and run `buggy 2`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints 3, then hold counts 2, 1, 0, and the fourth `unlock()` throws `IllegalMonitorStateException`. Step 2 prints `false` (no upgrade) then `true` (taking the read lock while holding the write lock is the first half of a downgrade). Step 3 prints `0 true`: not reentrant. Step 4 throws `IllegalMonitorStateException` from both. Step 5: without `-l`, `main` shows only `- locked <...> (a java.lang.Object)` for the monitor; with `-l` it lists the `ReentrantLock$NonfairSync` under `Locked ownable synchronizers`, at the address the waiting threads park on. Step 6 is less predictable than it sounds: in three of my four 2-thread runs the fair lock was 10 to 18 times slower with about one park for every three to five acquisitions, but in one run it did 9.2 million acquisitions, more than twice the unfair lock, because the waiting thread was often still spinning (the `onSpinWait` phase of `acquire`) when the lock was released, so the hand-off needed no park. Step 7: about a second after the stall, all eight request threads die with `IllegalStateException: upgrade` (printed by the default uncaught exception handler); readers that were queued behind the upgraders get in, find the entry stale and fail the same way. The last line shows 0 threads parked and `served` stays frozen: the hang has turned into errors, but every thread is dead, which is why the real fix is to never upgrade.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `LOCK API      lock(); try { ... } finally { unlock(); }      (lock BEFORE try)
              tryLock()  tryLock(t, unit)  lockInterruptibly()  newCondition()
              dead owner never unlocks: lock stays held forever

FAIRNESS      unfair: barging, ~1 park per many locks       (default)
              fair:   hand-off, ~1 park per lock -> 17-139x slower here

CONDITION     await in while(), signal/signalAll while holding the lock
              several per lock: notFull / notEmpty

RW LOCK       state = readers<<16 | writer holds
              short reads: 3.2x SLOWER than synchronized; long reads: 2.2x faster
              read -> write upgrade = DEADLOCK (invisible to detector)
              write -> read downgrade OK;  readLock().tryLock() starves writers

STAMPED       tryOptimisticRead -> copy fields -> validate -> else readLock
              not reentrant, no conditions, no owner, not AQS

AQS           volatile int state + CLH-style queue of parked threads
              tryAcquire/tryRelease (exclusive), ...Shared (shared)
              park/unpark: one permit, recheck in a loop

DUMPS         synchronized: BLOCKED, "waiting to lock"
              j.u.c locks:  WAITING (parking), "parking to wait for ...Sync"
              owner: jcmd <pid> Thread.print -l -> Locked ownable synchronizers`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Explicit locks are `synchronized` plus the things the keyword can't say: don't wait, wait a bounded time, wait cancellably, wait on several conditions, choose an ordering. The price is the `finally`, and a lock whose owner died without it stays locked forever.",
            "Every lock here is an `int` (or a `long`) changed by CAS and a queue of parked threads. Read-write locks and fair locks sound like upgrades and measured as slowdowns unless the workload matches; read-to-write upgrades deadlock silently. Thread dumps with `-l` show what's going on.",
            "Next comes CAS, Atomic Classes, LongAdder and VarHandle: the compare-and-swap instruction that every `compareAndSetState` in this lesson relies on, used directly for lock-free counters and references, and why a single `AtomicLong` stopped scaling at two threads.",
          ],
        },
      ],
    },
  ],
};
