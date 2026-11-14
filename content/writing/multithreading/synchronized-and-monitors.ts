import type { Lesson } from "../types";

export const synchronizedAndMonitors: Lesson = {
  slug: "synchronized-and-monitors",
  date: "2026-11-14",
  title: "synchronized, Monitors and Race Conditions",
  description:
    "How Java threads stop stepping on each other, measured on JDK 21: count++ as getfield, iadd, putfield and the up to 75% of increments four threads lost with it, check-then-act races in lazy initialisation and on a ConcurrentHashMap, synchronized methods (ACC_SYNCHRONIZED) against blocks (monitorenter and the hidden exception-path monitorexit), which object each form locks and the traps of locking on String literals, boxed Integers and getClass(), reentrancy, the mark word read byte by byte through an unlocked, thin-locked and inflated monitor and back again after async deflation, biased locking gone and LockingMode on JDK 21, uncontended and contended lock costs, wait, notify and notifyAll with the lost-wakeup deadlock that notify() caused in 10 of 10 trials, BLOCKED and WAITING in jcmd thread dumps and JFR, and a ride-hailing assignment service that gave one driver two trips.",
  tags: ["Multithreading", "synchronized", "Race Conditions", "JVM Internals"],
  sections: [
    {
      title: "What synchronized, Monitors and Race Conditions Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Thread States, join, sleep, interrupt and Daemon Threads, followed a single thread through its life: NEW, RUNNABLE, the waiting states, TERMINATED, and the ways one thread can wait for or stop another. Two of those states were left for this lesson: **BLOCKED**, which a thread enters when it wants a lock someone else holds, and the **WAITING** that comes from `Object.wait()`. Both exist because threads share memory, and shared memory needs rules about who may touch what, and when.",
        },
        {
          type: "paragraph",
          text: "A **race condition** is a bug whose outcome depends on the timing of threads. The classic one is `count++` from several threads: it looks like one operation and is really three (read, add, write), so two threads can read the same value and one increment disappears. The other common shape is **check-then-act**: \"if the driver is free, assign them\", where another thread can change the answer between the check and the act. A section of code that must not run in two threads at once on the same data is a **critical section**.",
        },
        {
          type: "paragraph",
          text: "Java's built-in tool for critical sections is `synchronized`. Every object can act as a **monitor**: a lock that at most one thread owns at a time, plus a wait set for threads that called `wait()` on it. `synchronized` acquires the monitor on entry and releases it on exit, however the block exits. This lesson looks at all of it on JDK 21: the bytecode `javac` emits, what the JVM writes into the object header when a thread locks it, what contention costs, how `wait` and `notify` work and fail, and what locks look like in thread dumps. The lesson after this one, on `volatile` and the Java Memory Model, explains the other half of what `synchronized` guarantees: visibility.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Monitors are older than Java: Per Brinch Hansen and Tony Hoare described them in 1973 and 1974 as a module whose procedures run under mutual exclusion, with condition variables to wait on. Java 1.0 simplified the idea: every object is a monitor with exactly one, unnamed condition (`wait`, `notify`, `notifyAll`), and it used **Mesa semantics** (from Xerox's Mesa language, 1980): a notified thread doesn't run immediately, it just becomes eligible to re-acquire the lock, so by the time it runs, the condition may be false again. That's why every `wait()` belongs in a `while` loop. Most of the JVM history since has been about making the lock cheap.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`synchronized` methods and blocks, `wait`/`notify`/`notifyAll` on every object", "One lock and one condition per object"],
            ["Java 1.3 (2000)", "HotSpot: thin (stack) locks, inflated to a full monitor only under contention", "Uncontended locking costs one CAS"],
            ["Java 5 (2004)", "JSR 133 memory model: unlock happens-before the next lock; `java.util.concurrent` (`ReentrantLock`, atomics)", "`synchronized` defined for visibility as well as exclusion"],
            ["Java 6 (2006)", "Biased locking on by default, adaptive spinning, lock elision and coarsening in C2", "Single-threaded locking almost free, at a cost in revocation pauses"],
            ["Java 15 (2020)", "Biased locking disabled by default and deprecated (JEP 374)", "Modern code uses `j.u.c` classes that never benefited from it"],
            ["Java 16 (2021)", "Warnings for synchronizing on value-based classes such as `Integer` (JEP 390)", "`javac` warns; `-XX:DiagnoseSyncOnValueBasedClasses` logs or aborts"],
            ["Java 18 (2022)", "Biased locking code removed from HotSpot", "`-XX:+UseBiasedLocking` is unrecognised on JDK 21"],
            ["Java 21 (2023)", "Experimental `-XX:LockingMode` (0 monitors only, 1 legacy stack locking as default, 2 lightweight)", "The JDK used in this lesson; virtual threads pin their carrier inside `synchronized`"],
            ["Java 23 / 24", "Lightweight locking becomes the default (23); virtual threads no longer pin in `synchronized` (JEP 491, 24)", "The header layout below is the JDK 21 default"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A dispatch desk at a Kolkata taxi stand, with one paper register of which driver has which trip.",
        },
        {
          type: "list",
          items: [
            "**A race condition** is two dispatchers looking at the register at the same moment, both seeing Asha marked free, and both radioing her a trip. Each did the right thing on what they saw; the register just changed between looking and writing.",
            "**`synchronized`** is a rule that only the person holding the desk's single pen may read-and-write the register. Others queue at the desk (BLOCKED) until the pen is put down.",
            "**Reentrancy** is that the person holding the pen doesn't have to queue behind themselves when one entry leads to another.",
            "**`wait()`** is a dispatcher who needs a free driver, sees none, puts the pen down and sits on the bench (WAITING). **`notifyAll()`** is someone shouting \"a driver just came back\": everyone on the bench gets up, queues for the pen, and each re-reads the register, because the first one may already have taken that driver.",
            "**Locking on a String literal** is two different desks that each think they have their own pen, but both are chained to the same one.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real dispatcher sees the register change in front of them. Threads don't: without the lock, one thread can keep reading an old value of a field for a long time, as the next lesson shows. The pen rule in Java gives both exclusion **and** visibility: whatever one holder wrote is guaranteed to be seen by the next holder of the same lock.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/synchronized-and-monitors-mark-word.svg",
          alt: "Left: the first 8 bytes of one object (its mark word) over time, read with Unsafe on JDK 21. Unlocked with an identity hash: 0x000000610455d601, low bits 01, the hash 0x610455d6 stored in bits 8 to 38. After monitorenter with no other thread: thin-locked, 0x000070a93c9fe920, low bits 00, pointing to a BasicLock in the owner's stack frame that keeps the old header. When a second thread arrives or wait() is called: inflated, 0x000070a890000fe2, low bits 10, pointing to a native ObjectMonitor, staying inflated after release. After async deflation by the service thread: unlocked again with the same hash. Right: the ObjectMonitor with its owner (assigner-1, reentry count 0, shown as '- locked' in thread dumps), the cxq and EntryList holding threads that want the lock (assigner-2, BLOCKED, 'waiting to lock'), and the WaitSet holding threads that called wait() and released the lock (dispatcher, WAITING, 'waiting on'). A woken waiter must re-acquire the lock and re-check its condition. Footer: biased locking off by default in JDK 15 and removed in JDK 18; LockingMode=2 keeps the header and uses a per-thread lock stack.",
          caption: "One object, three header states. The heavyweight ObjectMonitor only exists once a lock is contended or waited on.",
        },
        {
          type: "heading",
          text: "The forms of synchronized",
        },
        {
          type: "table",
          headers: ["Form", "Lock object", "Bytecode", "Typical use"],
          rows: [
            ["`synchronized void m()`", "`this`", "`ACC_SYNCHRONIZED` flag on the method, no extra instructions", "Small classes that guard all their state with one lock"],
            ["`static synchronized void m()`", "The `Class` object (`Foo.class`)", "`ACC_STATIC, ACC_SYNCHRONIZED`", "Static state; a different lock from every instance"],
            ["`synchronized (lock) { ... }`", "Any object expression", "`monitorenter`, `monitorexit`, plus a second `monitorexit` on the exception path", "Narrow critical sections, private lock objects"],
            ["`lock.wait()` / `notify()` / `notifyAll()`", "Must already hold `lock`", "Native methods on `Object`", "Waiting for a condition guarded by that lock"],
          ],
        },
        {
          type: "heading",
          text: "What a monitor guarantees",
        },
        {
          type: "table",
          headers: ["Property", "Meaning", "Consequence"],
          rows: [
            ["Mutual exclusion", "At most one thread owns a given monitor", "Code guarded by the same lock never interleaves"],
            ["Visibility", "Releasing a monitor happens-before every later acquisition of it", "The next owner sees all writes made under the lock (next lesson)"],
            ["Reentrancy", "The owner can acquire it again; a counter tracks depth", "Synchronized methods can call each other on the same object"],
            ["Release on any exit", "Normal return, `return` in the middle, or an exception", "No `finally` needed, unlike `Lock.unlock()`"],
            ["Not interruptible, no timeout", "A thread BLOCKED on `monitorenter` ignores `interrupt()`", "`ReentrantLock` exists for `lockInterruptibly` and `tryLock` (lesson 5)"],
            ["Not fair", "No queue order is promised", "A releasing thread can re-acquire before a waiting one"],
          ],
        },
        {
          type: "heading",
          text: "Thread states involved",
        },
        {
          type: "table",
          headers: ["State", "How a thread gets there", "Thread dump line"],
          rows: [
            ["RUNNABLE", "Inside the critical section, owning the monitor", "`- locked <0x...> (a Foo)`"],
            ["BLOCKED", "Reached `synchronized` while another thread owns the monitor, or woken from `wait()` and re-acquiring", "`waiting for monitor entry`, `- waiting to lock <0x...>`"],
            ["WAITING", "Called `wait()` (no timeout) on a monitor it owned", "`in Object.wait()`, `- waiting on <0x...>`"],
            ["TIMED_WAITING", "`wait(millis)` or `Thread.sleep` (sleep keeps any locks held)", "`(sleeping)` or `(on object monitor)`"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "Three layers: what `javac` emits, what the JVM does to the object, and how the JVM accounts for it. First the bytecode for the two forms:",
        },
        {
          type: "code",
          language: "java",
          title: "SyncBytecode.java",
          code: `public class SyncBytecode {
    private int count;
    private final Object lock = new Object();

    synchronized void incrementMethod() {
        count++;
    }

    void incrementBlock() {
        synchronized (lock) {
            count++;
        }
    }

    static synchronized void staticMethod() { }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac SyncBytecode.java && javap -v -p SyncBytecode",
        },
        {
          type: "output",
          text: `  synchronized void incrementMethod();
    descriptor: ()V
    flags: (0x0020) ACC_SYNCHRONIZED
    Code:
      stack=3, locals=1, args_size=1
         0: aload_0
         1: dup
         2: getfield      #13                 // Field count:I
         5: iconst_1
         6: iadd
         7: putfield      #13                 // Field count:I
        10: return

  void incrementBlock();
    descriptor: ()V
    flags: (0x0000)
    Code:
      stack=3, locals=3, args_size=1
         0: aload_0
         1: getfield      #7                  // Field lock:Ljava/lang/Object;
         4: dup
         5: astore_1
         6: monitorenter
         7: aload_0
         8: dup
         9: getfield      #13                 // Field count:I
        12: iconst_1
        13: iadd
        14: putfield      #13                 // Field count:I
        17: aload_1
        18: monitorexit
        19: goto          27
        22: astore_2
        23: aload_1
        24: monitorexit
        25: aload_2
        26: athrow
        27: return
      Exception table:
         from    to  target type
             7    19    22   any
            22    25    22   any
...
  static synchronized void staticMethod();
    descriptor: ()V
    flags: (0x0028) ACC_STATIC, ACC_SYNCHRONIZED`,
        },
        {
          type: "list",
          items: [
            "**`count++` is three instructions:** `getfield` reads the field onto the operand stack, `iadd` adds 1, `putfield` writes it back. Another thread can run between any two of them. Nothing in the bytecode makes the sequence atomic; that's the job of the lock around it.",
            "**A synchronized method has no lock instructions at all.** It has the `ACC_SYNCHRONIZED` flag, and the JVM's method entry code (interpreter or JIT) acquires the monitor of `this`, or of the `Class` for a static method, before the first instruction and releases it on every return or exception.",
            "**A synchronized block is explicit.** `javac` stores the lock object in a local (`astore_1`), so the same object is unlocked even if the field changes inside the block, then `monitorenter` at 6 and `monitorexit` at 18.",
            "**The hidden exception path:** the exception table sends any `Throwable` thrown between 7 and 19 to offset 22, which does a second `monitorexit` and rethrows. The second table row covers the handler itself (22 to 25), so even an asynchronous exception during the unlock retries it. This is how `synchronized` guarantees release without a `finally` in the source.",
            "The JVM spec requires structured locking: if a method returns while still holding a monitor it acquired, or exits one it doesn't hold, the JVM throws `IllegalMonitorStateException`. `javac` never generates that, but hand-written bytecode could.",
          ],
        },
        {
          type: "heading",
          text: "The mark word: where the lock really is",
        },
        {
          type: "paragraph",
          text: "Every object starts with a 12-byte header on 64-bit HotSpot with compressed class pointers: an 8-byte **mark word** and a 4-byte class pointer. The mark word is multipurpose: it holds the identity hash code, the GC age and two **lock bits**. Locking an object rewrites it. I read it directly with `sun.misc.Unsafe` (still accessible in JDK 21 through the `jdk.unsupported` module, with a compiler warning) while taking the object through each state:",
        },
        {
          type: "code",
          language: "java",
          title: "MarkWord.java",
          code: `import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class MarkWord {
    static final Unsafe U;
    static {
        try {
            Field f = Unsafe.class.getDeclaredField("theUnsafe");
            f.setAccessible(true);
            U = (Unsafe) f.get(null);
        } catch (ReflectiveOperationException e) { throw new ExceptionInInitializerError(e); }
    }

    static String mark(Object o) {
        long m = U.getLong(o, 0L);                          // the first 8 bytes of every object
        String state = switch ((int) (m & 0b11)) {
            case 0b01 -> "unlocked";
            case 0b00 -> "thin-locked (owner's stack or lock-stack)";
            case 0b10 -> "inflated (ObjectMonitor)";
            default -> "marked (GC)";
        };
        return String.format("0x%016x  low bits %2s  %s", m, Long.toBinaryString(m & 0b11), state);
    }

    public static void main(String[] args) throws Exception {
        Object trip = new Object();
        System.out.println("new object           " + mark(trip));
        System.out.println("identityHashCode     " + Integer.toHexString(System.identityHashCode(trip)));
        System.out.println("after hashCode       " + mark(trip));
        synchronized (trip) {
            System.out.println("synchronized         " + mark(trip));
            synchronized (trip) {
                System.out.println("nested (reentrant)   " + mark(trip));
            }
        }
        System.out.println("released             " + mark(trip));

        Thread waiter = new Thread(() -> { synchronized (trip) { } }, "waiter");
        synchronized (trip) {
            waiter.start();
            while (waiter.getState() != Thread.State.BLOCKED) Thread.onSpinWait();
            System.out.println("contended            " + mark(trip));
        }
        waiter.join();
        System.out.println("released again       " + mark(trip));
        System.gc();
        for (int i = 0; i < 20 && (U.getLong(trip, 0L) & 0b11) == 0b10; i++) Thread.sleep(250);
        System.out.println("later                " + mark(trip));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac MarkWord.java && java MarkWord",
        },
        {
          type: "output",
          text: `new object           0x0000000000000001  low bits  1  unlocked
identityHashCode     610455d6
after hashCode       0x000000610455d601  low bits  1  unlocked
synchronized         0x000070a93c9fe920  low bits  0  thin-locked (owner's stack or lock-stack)
nested (reentrant)   0x000070a93c9fe920  low bits  0  thin-locked (owner's stack or lock-stack)
released             0x000000610455d601  low bits  1  unlocked
contended            0x000070a890000fe2  low bits 10  inflated (ObjectMonitor)
released again       0x000070a890000fe2  low bits 10  inflated (ObjectMonitor)
later                0x000070a890000fe2  low bits 10  inflated (ObjectMonitor)`,
        },
        {
          type: "list",
          items: [
            "**New object: `0x...01`.** Lock bits `01` mean unlocked; everything else is zero, because the identity hash is computed lazily.",
            "**After `System.identityHashCode`: `0x000000610455d601`.** The hash `610455d6` is now stored in the header, shifted left by 8 bits. It has to stay stable for the object's whole life, which matters below.",
            "**Inside `synchronized`: `0x000070a93c9fe920`, lock bits `00`.** This is **stack locking** (`LockingMode=1`, the JDK 21 default). The thread copied the old header into a `BasicLock` slot in its own stack frame and CASed the mark word to point at that slot. The address is in the thread's stack region (`0x7...`), and because stack slots are aligned, the low two bits are naturally `00`. One compare-and-swap, no other memory touched.",
            "**Nested `synchronized` on the same object: unchanged.** The inner `monitorenter` sees the header already points into its own stack, so it records a recursive `BasicLock` with an empty displaced header and touches nothing else. That's reentrancy at the hardware level.",
            "**Released: the original header with the hash is back.** Unlocking CASes the saved header back in.",
            "**Contended: `0x000070a890000fe2`, lock bits `10`.** A second thread found the object locked, so the JVM **inflated** it: it allocated a native `ObjectMonitor` (outside the heap), moved the saved header into it, and pointed the mark word at it with tag `10`. The waiter then spins briefly and parks itself in the monitor's queue.",
            "**It stays inflated after release.** Inflation is cheap to keep; tearing the monitor down safely takes coordination with every thread. 5 seconds later, it was still inflated.",
          ],
        },
        {
          type: "paragraph",
          text: "Monitors are cleaned up by **async deflation** in the JVM's service thread: when the number of in-use monitors passes a threshold (`MonitorUsedDeflationThreshold`, 90% of an estimate), or at least every `GuaranteedAsyncDeflationInterval` (60,000 ms by default). Shortening the interval with a diagnostic flag shows the whole round trip, and `-Xlog:monitorinflation` shows which objects were inflated and when:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UnlockDiagnosticVMOptions -XX:GuaranteedAsyncDeflationInterval=1000 MarkWord | tail -3
java -XX:+UnlockDiagnosticVMOptions -XX:GuaranteedAsyncDeflationInterval=1000 \\
     -Xlog:monitorinflation=trace MarkWord | grep -E 'inflate\\(|deflate_monitor|needed'`,
        },
        {
          type: "output",
          text: `contended            0x000076d27c000fe2  low bits 10  inflated (ObjectMonitor)
released again       0x000076d27c000fe2  low bits 10  inflated (ObjectMonitor)
later                0x000000610455d601  low bits  1  unlocked

[0.034s][trace][monitorinflation] inflate(has_locker): object=0x000000008df025f0, mark=0x000074ac240011f2, type='java.lang.ref.NativeReferenceQueue$Lock'
[0.088s][trace][monitorinflation] inflate(has_locker): object=0x000000008df20918, mark=0x000074ac04000fe2, type='java.lang.Object'
[0.089s][trace][monitorinflation] inflate(has_locker): object=0x000000008df3eeb8, mark=0x000074acb0179a42, type='java.lang.Thread'
[1.038s][info ][monitorinflation] Async deflation needed: guaranteed interval (1000 ms) is greater than time since last deflation (1035 ms)
[1.038s][trace][monitorinflation] deflate_monitor: object=0x0000000086723f68, mark=0x000074acb0179a42, type='java.lang.Thread'
[1.038s][trace][monitorinflation] deflate_monitor: object=0x0000000086717808, mark=0x000074ac04000fe2, type='java.lang.Object'`,
        },
        {
          type: "list",
          items: [
            "After deflation the header is `0x000000610455d601` again: unlocked, with the same identity hash, which the `ObjectMonitor` had been keeping.",
            "Three objects were inflated. The `java.lang.Object` is mine. The `java.lang.Thread` is the `waiter` thread object: `Thread.join()` on a platform thread is implemented as `synchronized (this) { while (isAlive()) wait(...); }`, and `wait()` always needs a full monitor. The first is a JDK-internal lock used by the reference-handling machinery at startup.",
            "The objects' addresses differ between the inflate and deflate lines because a GC (my `System.gc()`) moved them in between; the monitor pointer in the mark word moved with them.",
          ],
        },
        {
          type: "heading",
          text: "Biased locking is gone, LockingMode is new",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UseBiasedLocking -version
/usr/lib/jvm/java-17-openjdk-amd64/bin/java -XX:+UseBiasedLocking -version 2>&1 | head -1
java -XX:+UnlockDiagnosticVMOptions -XX:+UnlockExperimentalVMOptions -XX:+PrintFlagsFinal -version | grep -E 'LockingMode|Deflation'`,
        },
        {
          type: "output",
          text: `Unrecognized VM option 'UseBiasedLocking'
Error: Could not create the Java Virtual Machine.
Error: A fatal exception has occurred. Program will exit.

OpenJDK 64-Bit Server VM warning: Option UseBiasedLocking was deprecated in version 15.0 and will likely be removed in a future release.

     intx AsyncDeflationInterval                   = 250                                    {diagnostic} {default}
     intx GuaranteedAsyncDeflationInterval         = 60000                                  {diagnostic} {default}
      int LockingMode                              = 1                                    {experimental} {default}
     intx MonitorDeflationMax                      = 1000000                                {diagnostic} {default}
     intx MonitorUsedDeflationThreshold            = 90                                     {diagnostic} {default}`,
        },
        {
          type: "list",
          items: [
            "**Biased locking** let the first thread to lock an object \"own\" it by writing its thread ID into the header, so later locks by the same thread needed no CAS at all. When another thread came along, the bias had to be **revoked** at a safepoint, stopping the world. It made old `Vector`/`Hashtable`-style code fast and modern concurrent code slower, and it complicated the JVM. JDK 15 disabled it by default (JEP 374) and JDK 18 removed it. On JDK 21 the flag doesn't even parse; on JDK 17 it's accepted with a deprecation warning.",
            "**`LockingMode`** is an experimental flag on JDK 21: `0` inflates every lock to an `ObjectMonitor`, `1` (default) is the stack locking above, and `2` is the newer **lightweight locking**, which became the default in JDK 23.",
            "`grep -i locking` on `-XX:+PrintFlagsFinal` without the unlock options shows only `UseRTMLocking`: experimental and diagnostic flags are hidden until unlocked.",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UnlockExperimentalVMOptions -XX:LockingMode=2 MarkWord
java -XX:+UnlockExperimentalVMOptions -XX:LockingMode=0 MarkWord`,
        },
        {
          type: "output",
          text: `new object           0x0000000000000001  low bits  1  unlocked
identityHashCode     610455d6
after hashCode       0x000000610455d601  low bits  1  unlocked
synchronized         0x000000610455d600  low bits  0  thin-locked (owner's stack or lock-stack)
nested (reentrant)   0x00007a1a6c177562  low bits 10  inflated (ObjectMonitor)
released             0x00007a1a6c177562  low bits 10  inflated (ObjectMonitor)
...
synchronized         0x00007c72081992f2  low bits 10  inflated (ObjectMonitor)
nested (reentrant)   0x00007c72081992f2  low bits 10  inflated (ObjectMonitor)`,
        },
        {
          type: "list",
          items: [
            "**Lightweight locking (`2`)** keeps the header intact (the hash `610455d6` is still visible) and only flips the lock bits to `00`. The owner is recorded by pushing the object onto a small **lock stack** inside the `JavaThread`, so no stack address is stored in the object. Recursion wasn't supported in the JDK 21 version: the nested `synchronized` inflated the monitor straight away. Later releases added recursive lightweight locking.",
            "**Monitors only (`0`)** inflates on the very first lock. Useful for comparison, not for production.",
          ],
        },
      ],
    },
    {
      title: "Race Conditions: Lost Updates",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "LostUpdates.java",
          code: `public class LostUpdates {
    static class Counter {
        int count;
        void increment() {
            count++;                               // read, add, write: three steps
        }
    }

    public static void main(String[] args) throws InterruptedException {
        int threads = 4, perThread = 1_000_000;
        for (int run = 1; run <= 5; run++) {
            Counter c = new Counter();
            Thread[] ts = new Thread[threads];
            for (int t = 0; t < threads; t++) {
                ts[t] = new Thread(() -> {
                    for (int i = 0; i < perThread; i++) c.increment();
                });
                ts[t].start();
            }
            for (Thread t : ts) t.join();
            int expected = threads * perThread;
            System.out.printf("run %d: count = %,d, expected %,d, lost %,d (%.1f%%)%n",
                    run, c.count, expected, expected - c.count, 100.0 * (expected - c.count) / expected);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac LostUpdates.java && java LostUpdates",
        },
        {
          type: "output",
          text: `run 1: count = 1,033,952, expected 4,000,000, lost 2,966,048 (74.2%)
run 2: count = 1,280,616, expected 4,000,000, lost 2,719,384 (68.0%)
run 3: count = 3,000,190, expected 4,000,000, lost 999,810 (25.0%)
run 4: count = 2,809,671, expected 4,000,000, lost 1,190,329 (29.8%)
run 5: count = 3,542,402, expected 4,000,000, lost 457,598 (11.4%)`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xint LostUpdates",
        },
        {
          type: "output",
          text: `run 1: count = 1,414,512, expected 4,000,000, lost 2,585,488 (64.6%)
run 2: count = 1,394,438, expected 4,000,000, lost 2,605,562 (65.1%)
run 3: count = 1,393,490, expected 4,000,000, lost 2,606,510 (65.2%)
run 4: count = 1,425,773, expected 4,000,000, lost 2,574,227 (64.4%)
run 5: count = 1,278,568, expected 4,000,000, lost 2,721,432 (68.0%)`,
        },
        {
          type: "list",
          items: [
            "**Every run lost increments, except when it didn't.** Over 20 JIT-compiled runs (four JVMs, five runs each) the final count ranged from 1,002,206 to exactly 4,000,000; it was correct in 2 of the 20. A race that sometimes gives the right answer is the dangerous kind: it passes tests.",
            "**The interpreter lost a steady 64% to 68%.** With `-Xint` every `getfield`/`putfield` really goes to memory, the four threads interleave at instruction granularity, and most increments are overwritten by a thread that read the same old value.",
            "**The compiled runs lost in chunks.** Counts like 1,033,952 and 3,000,190 sit just above whole millions, which is what you'd expect if a thread's loop doesn't touch memory on every iteration. The field isn't `volatile` and the loop has no lock, so C2 is allowed to keep `count` in a register and write it back rarely (or once, as `count += 1_000_000`). One thread's late write then wipes out another thread's entire million. The next lesson shows the same freedom making a loop never see a flag.",
            "And when the threads happened not to overlap at all (each one's compiled loop finished before the next got going), nothing was lost. Thread start-up time decides the outcome; that's a race condition by definition.",
          ],
        },
        {
          type: "paragraph",
          text: "Making `increment()` `synchronized` gives 4,000,000 in every run: only one thread can be between the `getfield` and the `putfield`, and the JIT can no longer cache the field across iterations, because each lock release must publish the write. The Performance section measures what that costs.",
        },
      ],
    },
    {
      title: "Check-Then-Act Races",
      blocks: [
        {
          type: "paragraph",
          text: "A lost update is a read-modify-write on one variable. Check-then-act is the same bug at the level of logic: a decision based on state that can change before the action. Thread-safe collections don't help, because each call is atomic but the pair isn't.",
        },
        {
          type: "code",
          language: "java",
          title: "CheckThenAct.java",
          code: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class CheckThenAct {
    static final AtomicInteger BUILT = new AtomicInteger();

    static class ZoneMap {
        ZoneMap() {
            BUILT.incrementAndGet();
            try { Thread.sleep(2); } catch (InterruptedException e) { }   // loading takes a moment
        }
    }

    static ZoneMap zones;                              // lazily initialised, no lock

    static ZoneMap zones() {
        if (zones == null) {                           // check
            zones = new ZoneMap();                     // act
        }
        return zones;
    }

    static volatile boolean go;                        // a start gun so the threads begin together

    static void race(int threads, Runnable body) throws InterruptedException {
        go = false;
        Thread[] ts = new Thread[threads];
        for (int t = 0; t < threads; t++) {
            ts[t] = new Thread(() -> {
                while (!go) Thread.onSpinWait();
                body.run();
            });
            ts[t].start();
        }
        go = true;
        for (Thread t : ts) t.join();
    }

    public static void main(String[] args) throws InterruptedException {
        int trialsWithDuplicates = 0, maxBuilt = 0;
        for (int trial = 0; trial < 200; trial++) {
            zones = null;
            BUILT.set(0);
            race(8, CheckThenAct::zones);
            if (BUILT.get() > 1) trialsWithDuplicates++;
            maxBuilt = Math.max(maxBuilt, BUILT.get());
        }
        System.out.println("lazy init: " + trialsWithDuplicates + " of 200 trials built ZoneMap more than once, max " + maxBuilt + " times");

        int doubleWins = 0;
        for (int trial = 0; trial < 200; trial++) {
            Map<String, String> assigned = new ConcurrentHashMap<>();   // a thread-safe map
            AtomicInteger winners = new AtomicInteger();
            race(2, () -> {
                if (!assigned.containsKey("driver-42")) {              // check
                    assigned.put("driver-42", Thread.currentThread().getName());   // act
                    winners.incrementAndGet();
                }
            });
            if (winners.get() > 1) doubleWins++;
        }
        System.out.println("containsKey + put: " + doubleWins + " of 200 trials had two winners");

        int atomicDoubleWins = 0;
        for (int trial = 0; trial < 200; trial++) {
            Map<String, String> assigned = new ConcurrentHashMap<>();
            AtomicInteger winners = new AtomicInteger();
            race(2, () -> {
                if (assigned.putIfAbsent("driver-42", Thread.currentThread().getName()) == null) {
                    winners.incrementAndGet();
                }
            });
            if (winners.get() > 1) atomicDoubleWins++;
        }
        System.out.println("putIfAbsent: " + atomicDoubleWins + " of 200 trials had two winners");
    }
}`,
        },
        {
          type: "output",
          text: `lazy init: 200 of 200 trials built ZoneMap more than once, max 8 times
containsKey + put: 73 of 200 trials had two winners
putIfAbsent: 0 of 200 trials had two winners`,
        },
        {
          type: "list",
          items: [
            "**Lazy initialisation without a lock built the object up to eight times**, in every one of 200 trials. The 2 ms constructor (standing in for loading a zone map from a file) makes the window between `zones == null` and the assignment wide, so all eight threads see `null`. Callers then hold different instances, and if the constructor registers anything globally, it's registered eight times.",
            "**`containsKey` followed by `put` on a `ConcurrentHashMap` let two threads both \"win\"** in 50 to 74 of 200 trials across six runs. The map wasn't corrupted (it's thread-safe), but both threads believed they had assigned `driver-42`. Thread safety of the parts doesn't make the composition safe.",
            "**`putIfAbsent` never had two winners**: the check and the insert happen inside the map under the lock of that bin, as one operation. The ConcurrentHashMap lessons cover `putIfAbsent`, `computeIfAbsent` and `merge` in depth.",
            "The `go` flag is a tiny start barrier: threads spin until main sets it, so they reach the race together instead of one at a time. It's `volatile` so the spinning threads are guaranteed to see the change; the next lesson explains exactly why that's needed.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix for lazy initialisation is a `synchronized` getter, or one of the idioms in the next lesson (the holder class, or double-checked locking with `volatile`). The fix for check-then-act on a map is either one lock around both steps or an atomic method on the map that does both.",
        },
      ],
    },
    {
      title: "Which Object Is Locked",
      blocks: [
        {
          type: "paragraph",
          text: "`synchronized` only excludes threads that lock **the same object**. Most locking bugs I've seen in review weren't missing locks, they were two pieces of code locking different objects while guarding the same data, or unrelated code accidentally sharing one.",
        },
        {
          type: "code",
          language: "java",
          title: "WhichLock.java",
          code: `public class WhichLock {
    static int trips;                                       // shared static state

    static synchronized void addFromStatic() { trips++; }  // locks WhichLock.class
    synchronized void addFromInstance() { trips++; }       // locks this

    static Integer boxedCount = 0;
    static void addBoxed() {
        synchronized (boxedCount) {                         // locks whatever Integer is there now
            boxedCount++;                                   // ...and replaces it with a new one
        }
    }

    // Two unrelated classes, each with its "own" lock
    static class Billing {
        private static final String LOCK = "LOCK";
        static void settle() throws InterruptedException {
            synchronized (LOCK) { Thread.sleep(300); }      // a slow settlement
        }
    }
    static class Payouts {
        private static final String LOCK = "LOCK";          // the same interned String object
        static long payMillis() {
            long t = System.nanoTime();
            synchronized (LOCK) { }
            return (System.nanoTime() - t) / 1_000_000;
        }
    }

    static class Fare {
        void reprice() { synchronized (getClass()) { check(); } }
        void check() { }
    }
    static class SurgeFare extends Fare {
        @Override void check() {
            System.out.println("synchronized (getClass()) from a SurgeFare holds Fare.class? "
                    + Thread.holdsLock(Fare.class) + ", SurgeFare.class? " + Thread.holdsLock(SurgeFare.class));
        }
    }

    static void twoThreads(Runnable a, Runnable b) throws InterruptedException {
        Thread t1 = new Thread(() -> { for (int i = 0; i < 1_000_000; i++) a.run(); });
        Thread t2 = new Thread(() -> { for (int i = 0; i < 1_000_000; i++) b.run(); });
        t1.start(); t2.start(); t1.join(); t2.join();
    }

    public static void main(String[] args) throws InterruptedException {
        WhichLock w = new WhichLock();
        twoThreads(WhichLock::addFromStatic, w::addFromInstance);
        System.out.println("static sync + instance sync: " + trips + " of 2000000");

        twoThreads(WhichLock::addBoxed, WhichLock::addBoxed);
        System.out.println("synchronized (boxedCount):   " + boxedCount + " of 2000000");

        Thread billing = new Thread(() -> {
            try { Billing.settle(); } catch (InterruptedException e) { }
        });
        billing.start();
        Thread.sleep(50);                                   // let billing take its lock first
        System.out.println("Payouts waited " + Payouts.payMillis() + " ms for Billing's String lock");
        billing.join();

        new SurgeFare().reprice();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac WhichLock.java && java WhichLock",
        },
        {
          type: "output",
          text: `WhichLock.java:9: warning: [synchronization] attempt to synchronize on an instance of a value-based class
        synchronized (boxedCount) {                         // locks whatever Integer is there now
        ^
1 warning
static sync + instance sync: 1651230 of 2000000
synchronized (boxedCount):   1598295 of 2000000
Payouts waited 250 ms for Billing's String lock
synchronized (getClass()) from a SurgeFare holds Fare.class? false, SurgeFare.class? true`,
        },
        {
          type: "list",
          items: [
            "**Static and instance `synchronized` methods don't exclude each other.** `addFromStatic` locks `WhichLock.class`, `addFromInstance` locks `this`. Both update the same static field, so increments were lost: between 1,468,190 and 1,995,551 of 2,000,000 over six runs. Static state needs one lock used by every path, usually the class or a `private static final Object`.",
            "**Locking on a field you then reassign locks nothing useful.** `synchronized (boxedCount) { boxedCount++; }` locks the current `Integer` and then replaces it with a new `Integer`. The next thread locks the new object while the first still holds the old one. Between 1,506,030 and 1,978,973 survived, over six runs. Since JDK 16, `javac` warns about synchronizing on value-based classes, as the output shows. Even without the reassignment, `Integer.valueOf` caches -128 to 127, so `synchronized (Integer.valueOf(1))` in two unrelated classes is the same lock.",
            "**String literals are interned, so `\"LOCK\"` is one object for the whole JVM.** `Billing` and `Payouts` each declared a private `LOCK`, but both are the same interned `String`, so `Payouts` waited 250 ms for an unrelated settlement (249 to 250 ms in every run). In a real service the two classes could be in different libraries, and the symptom is unexplained latency or a deadlock.",
            "**`synchronized (getClass())` locks the runtime class.** Code in `Fare` that meant to lock `Fare.class` locked `SurgeFare.class` when called on a subclass, so a `Fare` and a `SurgeFare` repricing at once don't exclude each other. Use the class literal (`Fare.class`) or a private static lock.",
          ],
        },
        {
          type: "paragraph",
          text: "The JVM can report synchronization on value-based classes at run time, which catches cases `javac` can't see (for example a lock passed in as `Object`):",
        },
        {
          type: "code",
          language: "java",
          title: "SyncOnBox.java",
          code: `public class SyncOnBox {
    public static void main(String[] args) {
        Integer driverId = 42;
        synchronized (driverId) {
            System.out.println("inside");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UnlockDiagnosticVMOptions -XX:DiagnoseSyncOnValueBasedClasses=2 SyncOnBox
java -XX:+UnlockDiagnosticVMOptions -XX:DiagnoseSyncOnValueBasedClasses=1 SyncOnBox`,
        },
        {
          type: "output",
          text: `[0.057s][info][valuebasedclasses] Synchronizing on object 0x00000000ffecaca0 of klass java.lang.Integer
[0.057s][info][valuebasedclasses] 	at SyncOnBox.main(SyncOnBox.java:4)
[0.057s][info][valuebasedclasses] 	- locked <0x00000000ffecaca0> (a java.lang.Integer)
inside

#
# A fatal error has been detected by the Java Runtime Environment:
#
#  Internal Error (synchronizer.cpp:463), pid=579943, tid=580010
#  fatal error: Synchronizing on object 0x00000000ffecaca0 of klass java.lang.Integer at SyncOnBox.main(SyncOnBox.java:4)`,
        },
        {
          type: "paragraph",
          text: "Mode 2 logs each occurrence with a stack trace and carries on; mode 1 aborts the JVM with a fatal error (and a core dump), which is what you want in a test suite and never in production. I first ran mode 2 on `WhichLock`, which locks a boxed `Integer` two million times: it logged two million stack traces and I had to kill it.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "The safe default",
          text: "Lock on a `private final Object lock = new Object();` (or `private static final` for static state). Nobody outside the class can reach it, it can't be reassigned, it isn't interned or cached, and `synchronized (lock)` makes the guarded region obvious. Locking on `this` is fine for small classes, but then any caller can lock your object too, and hold your lock for as long as they like.",
        },
      ],
    },
    {
      title: "Reentrancy, Contention and Thread Dumps",
      blocks: [
        {
          type: "paragraph",
          text: "Intrinsic locks are **reentrant**: a thread that owns a monitor can enter it again, and the monitor counts the depth (the recursive `BasicLock` in the mark-word experiment, or `_recursions` in an inflated `ObjectMonitor`). Without it, a synchronized method calling another synchronized method on the same object, or an overriding method calling `super`, would deadlock on itself. The Syntax at a Glance program shows `addAndGet` calling `addFare` on the same object.",
        },
        {
          type: "paragraph",
          text: "When a lock is contended, the question in production is always \"who holds it, and who's waiting?\". A thread dump answers it. This program creates one of each situation:",
        },
        {
          type: "code",
          language: "java",
          title: "MonitorStates.java",
          code: `public class MonitorStates {
    static class DriverPool {
        synchronized void assign(String trip) throws InterruptedException {
            Thread.sleep(60_000);                           // holds the monitor while sleeping
        }
    }

    static class TripQueue {
        private String next;
        synchronized String awaitTrip() throws InterruptedException {
            while (next == null) wait();                    // releases the monitor while waiting
            return next;
        }
    }

    public static void main(String[] args) throws Exception {
        DriverPool pool = new DriverPool();
        TripQueue queue = new TripQueue();
        Thread a = new Thread(() -> { try { pool.assign("T-1"); } catch (InterruptedException e) { } }, "assigner-1");
        Thread b = new Thread(() -> { try { pool.assign("T-2"); } catch (InterruptedException e) { } }, "assigner-2");
        Thread d = new Thread(() -> { try { queue.awaitTrip(); } catch (InterruptedException e) { } }, "dispatcher");
        a.start();
        Thread.sleep(100);
        b.start();
        d.start();
        Thread.sleep(200);
        for (Thread t : new Thread[] {a, b, d}) System.out.println(t.getName() + " " + t.getState());
        System.out.println("pid " + ProcessHandle.current().pid());
        a.join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java MonitorStates &
jcmd MonitorStates Thread.print`,
        },
        {
          type: "output",
          text: `assigner-1 TIMED_WAITING
assigner-2 BLOCKED
dispatcher WAITING

"assigner-1" #20 [1095183] prio=5 os_prio=0 cpu=0.17ms elapsed=2.24s tid=0x000073b8cc173940 nid=1095183 waiting on condition  [0x000073b8b0675000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
	at java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
	at MonitorStates$DriverPool.assign(MonitorStates.java:4)
	- locked <0x000000008df153e0> (a MonitorStates$DriverPool)
	at MonitorStates.lambda$main$0(MonitorStates.java:19)
	...

"assigner-2" #21 [1095184] prio=5 os_prio=0 cpu=0.63ms elapsed=2.14s tid=0x000073b8cc175560 nid=1095184 waiting for monitor entry  [0x000073b8b0575000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at MonitorStates$DriverPool.assign(MonitorStates.java:4)
	- waiting to lock <0x000000008df153e0> (a MonitorStates$DriverPool)
	at MonitorStates.lambda$main$1(MonitorStates.java:20)
	...

"dispatcher" #22 [1095185] prio=5 os_prio=0 cpu=0.33ms elapsed=2.14s tid=0x000073b8cc176740 nid=1095185 in Object.wait()  [0x000073b8b0475000]
   java.lang.Thread.State: WAITING (on object monitor)
	at java.lang.Object.wait0(java.base@21.0.13.0.3/Native Method)
	- waiting on <0x000000008df15f98> (a MonitorStates$TripQueue)
	at java.lang.Object.wait(java.base@21.0.13.0.3/Object.java:366)
	at java.lang.Object.wait(java.base@21.0.13.0.3/Object.java:339)
	at MonitorStates$TripQueue.awaitTrip(MonitorStates.java:11)
	- locked <0x000000008df15f98> (a MonitorStates$TripQueue)
	...`,
        },
        {
          type: "list",
          items: [
            "**The owner:** `assigner-1` shows `- locked <0x000000008df153e0>`. It's TIMED_WAITING because it's in `Thread.sleep`, and **`sleep` doesn't release locks**. A thread sleeping or doing I/O while holding a monitor is the most common cause of a pile-up.",
            "**The blocked thread:** `assigner-2` is `BLOCKED (on object monitor)`, `waiting for monitor entry`, `- waiting to lock <0x000000008df153e0>`. The same address as the owner's `locked` line: matching those addresses is how you find who blocks whom in a dump with hundreds of threads.",
            "**The waiting thread:** `dispatcher` is `WAITING (on object monitor)`, `in Object.wait()`, `- waiting on <0x...f98>`. It also shows `- locked <0x...f98>` further down, from the `synchronized` method frame; that line is the frame's history, not the present. During `wait()` the monitor is released, which is exactly why `publishTrip`-style code can get in to change the condition.",
            "BLOCKED is \"I want the lock\"; WAITING is \"I gave up the lock until someone notifies me\". A dump full of BLOCKED threads on one address is lock contention; a dump full of WAITING threads is usually idle workers, or a lost notification.",
          ],
        },
        {
          type: "paragraph",
          text: "For contention that comes and goes, JFR records every monitor entry that blocked longer than 20 ms (the default threshold) as `jdk.JavaMonitorEnter`, with the previous owner and the stack. With the sleep in `assign` shortened to one second:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:StartFlightRecording:filename=m.jfr MonitorStates
jfr print --events jdk.JavaMonitorEnter m.jfr`,
        },
        {
          type: "output",
          text: `jdk.JavaMonitorEnter {
  startTime = 04:02:07.107 (2026-11-14)
  duration = 1.01 s
  monitorClass = MonitorStates$DriverPool (classLoader = app)
  previousOwner = "assigner-1" (javaThreadId = 24)
  address = 0x7A137C001110
  eventThread = "assigner-2" (javaThreadId = 25)
  stackTrace = [
    MonitorStates$DriverPool.assign(String) line: 4
    MonitorStates.lambda$main$1(MonitorStates$DriverPool) line: 20
    java.lang.Thread.run() line: 1583
    ...
  ]
}`,
        },
        {
          type: "paragraph",
          text: "`previousOwner` names the thread that held the lock, and `duration` is how long `assigner-2` was blocked. In a JFR recording from production, grouping these events by `monitorClass` and summing `duration` finds the hottest lock in a minute. `jdk.JavaMonitorWait` records `wait()` calls the same way.",
        },
      ],
    },
    {
      title: "wait, notify and notifyAll",
      blocks: [
        {
          type: "paragraph",
          text: "`wait()` lets a thread inside a monitor give up the lock until some condition changes. It's the only way, with intrinsic locks, to wait for something without spinning. The rules are strict, and each one has a reason:",
        },
        {
          type: "table",
          headers: ["Rule", "Reason"],
          rows: [
            ["Call `wait`/`notify`/`notifyAll` only while holding that object's monitor", "Otherwise `IllegalMonitorStateException`. The condition is shared state, so checking it and deciding to wait must be atomic, or a notification could arrive between them and be lost"],
            ["Always wait in a `while` loop that re-checks the condition", "Mesa semantics: by the time the woken thread re-acquires the lock, another thread may have changed the state. Also **spurious wakeups**: the `Object.wait` documentation says a thread may wake without being notified, interrupted or timing out"],
            ["Change the state, then notify, both under the lock", "The waiter re-checks the state, not the notification"],
            ["Prefer `notifyAll` unless every waiter waits for the same condition and any one of them can proceed", "`notify` wakes one arbitrary thread; if it's the wrong kind, the signal is gone (demo below)"],
            ["Use `wait(timeout)` with a deadline when the wait must be bounded", "`wait(ms)` can return early, so recompute the remaining time in the loop"],
          ],
        },
        {
          type: "code",
          language: "java",
          title: "WaitNotifyRules.java",
          code: `public class WaitNotifyRules {
    static class Wallet {
        private long balancePaise;

        synchronized void credit(long paise) {
            balancePaise += paise;
            notifyAll();                                   // the condition may now be true
        }

        // Guarded block: wait until the balance covers the fare, or give up after a timeout
        synchronized boolean debitWhenAvailable(long paise, long timeoutMillis) throws InterruptedException {
            long deadline = System.nanoTime() + timeoutMillis * 1_000_000;
            while (balancePaise < paise) {                 // re-check after every wake-up
                long left = (deadline - System.nanoTime()) / 1_000_000;
                if (left <= 0) return false;
                wait(left);                                // releases the monitor, re-acquires before returning
            }
            balancePaise -= paise;
            return true;
        }

        synchronized long balance() { return balancePaise; }
    }

    public static void main(String[] args) throws Exception {
        Object lock = new Object();
        try {
            lock.wait();                                   // not holding lock's monitor
        } catch (IllegalMonitorStateException e) {
            System.out.println("wait() without the lock:   " + e.getMessage());
        }
        try {
            synchronized (new Object()) { lock.notify(); } // holding a different monitor
        } catch (IllegalMonitorStateException e) {
            System.out.println("notify() on another object: " + e.getMessage());
        }

        Wallet wallet = new Wallet();
        Thread rider = new Thread(() -> {
            try {
                long t = System.nanoTime();
                boolean ok = wallet.debitWhenAvailable(14_500, 2_000);
                System.out.println("rider debited Rs 145: " + ok + " after " + (System.nanoTime() - t) / 1_000_000 + " ms");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        rider.start();
        for (int i = 0; i < 3; i++) {                      // three top-ups of Rs 50
            Thread.sleep(100);
            wallet.credit(5_000);
        }
        rider.join();
        System.out.println("balance left: " + wallet.balance() + " paise");
        System.out.println("timed out waiting for Rs 1000: " + !wallet.debitWhenAvailable(100_000, 300));
    }
}`,
        },
        {
          type: "output",
          text: `wait() without the lock:   current thread is not owner
notify() on another object: current thread is not owner
rider debited Rs 145: true after 300 ms
balance left: 500 paise
timed out waiting for Rs 1000: true`,
        },
        {
          type: "list",
          items: [
            "Both illegal calls throw `IllegalMonitorStateException` with the message \"current thread is not owner\". Holding *a* lock isn't enough; it must be the monitor of the object you call `wait` or `notify` on.",
            "The rider needed Rs 145 and the wallet got three Rs 50 top-ups 100 ms apart. The rider woke after the first and second top-ups, re-checked `balancePaise < paise`, and went back to waiting both times; only the third made the condition false. 300 ms, 500 paise left. With `if` instead of `while`, the first wake-up would have debited a balance of Rs 50.",
            "The deadline loop recomputes `left` after every wake-up, so early returns from `wait(left)` don't extend the total wait. The last line shows the timeout path: no top-ups, `false` after 300 ms.",
            "`wait` releases only the monitor it's called on. If the thread holds other monitors (nested `synchronized`), it keeps them while waiting: a classic route to deadlock (lesson 21).",
          ],
        },
        {
          type: "heading",
          text: "if instead of while",
        },
        {
          type: "code",
          language: "java",
          title: "IfNotWhile.java",
          code: `import java.util.ArrayDeque;
import java.util.Queue;

public class IfNotWhile {
    static final Queue<String> trips = new ArrayDeque<>();

    static String takeBuggy() throws InterruptedException {
        synchronized (trips) {
            if (trips.isEmpty()) trips.wait();             // checks once, never re-checks
            return trips.remove();                         // throws if another thread got there first
        }
    }

    public static void main(String[] args) throws InterruptedException {
        Runnable driver = () -> {
            try {
                System.out.println(Thread.currentThread().getName() + " got " + takeBuggy());
            } catch (Exception e) {
                System.out.println(Thread.currentThread().getName() + " failed: " + e);
            }
        };
        Thread asha = new Thread(driver, "Asha");
        Thread ravi = new Thread(driver, "Ravi");
        asha.start();
        ravi.start();
        while (asha.getState() != Thread.State.WAITING || ravi.getState() != Thread.State.WAITING) Thread.sleep(10);
        synchronized (trips) {
            trips.add("TRIP-SALT-LAKE-1");                 // one trip...
            trips.notifyAll();                             // ...but both drivers wake up
        }
        asha.join();
        ravi.join();
    }
}`,
        },
        {
          type: "output",
          text: `Ravi failed: java.util.NoSuchElementException
Asha got TRIP-SALT-LAKE-1`,
        },
        {
          type: "paragraph",
          text: "One trip, two waiting drivers, `notifyAll`. Both wake; the first to re-acquire the lock takes the trip, and the second continues after its `if` without re-checking, so `remove()` on an empty queue throws. It failed the same way in every run (which driver lost varied, and the print order depends on which thread reaches `println` first, outside the lock). With `while`, the second driver would see the empty queue and wait again.",
        },
        {
          type: "heading",
          text: "notify() and the lost wake-up",
        },
        {
          type: "paragraph",
          text: "`notify()` wakes one thread from the wait set, chosen by the JVM. When producers and consumers wait on the same monitor for **different** conditions, the one thread woken can be the wrong kind:",
        },
        {
          type: "code",
          language: "java",
          title: "LostWakeup.java",
          code: `import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;

public class LostWakeup {
    // One slot shared by producers and consumers, guarded by this object's monitor
    static class Slot {
        private String trip;
        private final boolean all;
        Slot(boolean notifyAll) { all = notifyAll; }

        synchronized void put(String t) throws InterruptedException {
            while (trip != null) wait();                 // guard: wait until empty
            trip = t;
            wake();
        }

        synchronized String take() throws InterruptedException {
            while (trip == null) wait();                 // guard: wait until full
            String t = trip;
            trip = null;
            wake();
            return t;
        }

        private void wake() { if (all) notifyAll(); else notify(); }
    }

    // Two producers and two consumers move 2 x items trips through one slot.
    // Returns null if all finished, or a description of where they stopped.
    static String trial(boolean notifyAll, int items) throws InterruptedException {
        Slot slot = new Slot(notifyAll);
        AtomicInteger taken = new AtomicInteger();
        Thread[] ts = new Thread[4];
        for (int i = 0; i < 2; i++) {
            ts[i] = new Thread(() -> {
                try { for (int n = 0; n < items; n++) slot.put("trip-" + n); } catch (InterruptedException e) { }
            }, "producer-" + i);
            ts[i + 2] = new Thread(() -> {
                try { for (int n = 0; n < items; n++) { slot.take(); taken.incrementAndGet(); } } catch (InterruptedException e) { }
            }, "consumer-" + i);
        }
        for (Thread t : ts) t.setDaemon(true);           // stuck threads must not keep the JVM alive
        for (Thread t : ts) t.start();
        long deadline = System.currentTimeMillis() + 2_000;
        for (Thread t : ts) t.join(Math.max(1, deadline - System.currentTimeMillis()));
        if (Arrays.stream(ts).noneMatch(Thread::isAlive)) return null;
        StringBuilder sb = new StringBuilder("after " + taken.get() + " trips:");
        for (Thread t : ts) sb.append(' ').append(t.getName()).append('=').append(t.getState());
        return sb.toString();
    }

    public static void main(String[] args) throws InterruptedException {
        for (boolean all : new boolean[] {false, true}) {
            int stuck = 0;
            String example = null;
            for (int i = 0; i < 10; i++) {
                String r = trial(all, 10_000);
                if (r != null) { stuck++; if (example == null) example = r; }
            }
            System.out.println((all ? "notifyAll" : "notify   ") + ": " + stuck + " of 10 trials stuck"
                    + (example == null ? "" : ", first one " + example));
        }
    }
}`,
        },
        {
          type: "output",
          text: `notify   : 10 of 10 trials stuck, first one after 15 trips: producer-0=WAITING producer-1=WAITING consumer-0=WAITING consumer-1=WAITING
notifyAll: 0 of 10 trials stuck`,
        },
        {
          type: "list",
          items: [
            "**With `notify()`, every trial ended with all four threads WAITING** and nobody left to notify them: after 15 trips in the run shown, 43 in another. Both loops use `while` correctly; the bug is entirely in which thread got the one wake-up.",
            "**How it happens:** the slot is full and both producers are waiting. A consumer takes the trip and calls `notify()`, which wakes the other **consumer** instead of a producer. That consumer finds the slot empty and waits again, without notifying anyone. The first consumer comes back for more, finds it empty, and waits too. Now all four wait, and the one notification that could have woken a producer was spent on a consumer.",
            "**With `notifyAll()`, 0 of 10 trials stuck.** Every waiter wakes, re-checks its own condition, and the right kind proceeds. The cost is waking threads that will just go back to waiting, which is why `java.util.concurrent` uses separate conditions (`notFull`, `notEmpty`) on a `ReentrantLock` (lesson 5) instead.",
            "`notify()` is only safe when all waiters are interchangeable: they wait for the same condition, and any one of them can make progress and pass the baton on.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "In new code",
          text: "Hand-written `wait`/`notify` is rare in modern Java. A `BlockingQueue` (lessons 11 and 12), `CountDownLatch`, `Semaphore` or `CompletableFuture` does the waiting for you, correctly. Knowing the rules still matters: they're asked in every interview, and they explain the behaviour of the classes built on top of them.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "What happens when two threads call the synchronized `assign` on the same `DriverPool`, on JDK 21 with the default locking mode:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Thread A invokes `assign`.** The method has `ACC_SYNCHRONIZED`, so the entry code locks `this` before the first bytecode.",
            "**Fast path.** A reserves a `BasicLock` slot in its frame, copies the unlocked mark word (`...01`) into it, and CASes the object's mark word from that value to the slot's address (`...00`). The CAS succeeds: A owns a thin lock. No other memory was touched.",
            "**Thread B invokes `assign`.** Its CAS fails, because the mark word is no longer the unlocked value. B checks whether the address points into its own stack (it would, for a reentrant call); it doesn't.",
            "**Inflation.** B inflates the lock: it allocates an `ObjectMonitor`, records A as the owner, moves A's saved header into the monitor, and installs the monitor pointer with tag `10` in the mark word.",
            "**Spin, then park.** B spins for a short adaptive period, retrying to CAS the monitor's owner field, in case A releases soon. If not, B enqueues itself on the monitor's `cxq` and parks (a futex wait on Linux). Its state is BLOCKED, and a dump shows `waiting to lock`.",
            "**A finishes.** On return, A releases the inflated monitor: it clears the owner with release semantics, and since there are waiters, it picks a successor and unparks it.",
            "**B wakes and retries** the owner CAS. If a third thread grabbed the lock in between (monitors aren't fair), B goes back to the queue. Otherwise B owns the monitor and runs `assign`. Everything A wrote before releasing is visible to B.",
            "**Later, idle.** When nobody owns the monitor and nobody waits, the service thread may deflate it and restore the original header, hash included.",
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
          title: "SynchronizedTour.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class SynchronizedTour {
    private static int instances;                        // guarded by SynchronizedTour.class
    private final Object lock = new Object();            // a private lock nobody else can reach
    private final List<String> trips = new ArrayList<>(); // guarded by lock
    private long farePaise;                              // guarded by this

    SynchronizedTour() { countInstance(); }

    // 1. static synchronized: locks the Class object
    private static synchronized void countInstance() { instances++; }

    // 2. synchronized method: locks this
    synchronized void addFare(long paise) { farePaise += paise; }

    // 3. reentrancy: a synchronized method calling another one on the same object
    synchronized long addAndGet(long paise) {
        addFare(paise);                                  // already holds this: no self-deadlock
        return farePaise;
    }

    // 4. synchronized block on a private lock object
    void addTrip(String id) {
        synchronized (lock) { trips.add(id); }
    }

    // 5. wait/notifyAll in a guarded block
    String awaitTrip(long timeoutMillis) throws InterruptedException {
        synchronized (lock) {
            long deadline = System.currentTimeMillis() + timeoutMillis;
            while (trips.isEmpty()) {
                long left = deadline - System.currentTimeMillis();
                if (left <= 0) return null;
                lock.wait(left);
            }
            return trips.remove(0);
        }
    }

    void publishTrip(String id) {
        synchronized (lock) {
            trips.add(id);
            lock.notifyAll();
        }
    }

    public static void main(String[] args) throws Exception {
        SynchronizedTour t = new SynchronizedTour();
        new SynchronizedTour();
        System.out.println("instances " + instances);
        System.out.println("addAndGet " + t.addAndGet(14_500) + ", holds this outside? " + Thread.holdsLock(t));

        t.addTrip("TRIP-1");
        System.out.println("awaitTrip " + t.awaitTrip(100) + ", then " + t.awaitTrip(100));

        Thread driver = new Thread(() -> {
            try { System.out.println("driver got " + t.awaitTrip(1_000)); } catch (InterruptedException e) { }
        });
        driver.start();
        Thread.sleep(50);
        System.out.println("driver state while waiting " + driver.getState());
        t.publishTrip("TRIP-2");
        driver.join();

        Thread blocked = new Thread(() -> t.addFare(100));
        synchronized (t) {                               // main holds t's monitor
            blocked.start();
            Thread.sleep(50);
            System.out.println("addFare caller state " + blocked.getState());
        }
        blocked.join();
        System.out.println("fare " + t.farePaise);
    }
}`,
        },
        {
          type: "output",
          text: `instances 2
addAndGet 14500, holds this outside? false
awaitTrip TRIP-1, then null
driver state while waiting TIMED_WAITING
driver got TRIP-2
addFare caller state BLOCKED
fare 14600`,
        },
        {
          type: "paragraph",
          text: "The comments `// guarded by ...` are worth copying into real code: a lock is only as good as the agreement on what it protects, and that agreement is otherwise invisible. `wait(left)` makes the waiting driver TIMED_WAITING rather than WAITING. `Thread.holdsLock` is handy in assertions (`assert Thread.holdsLock(lock)`) inside private methods that must only be called with the lock held.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Reads need the lock too",
        },
        {
          type: "code",
          language: "java",
          title: "ZoneStats.java",
          code: `public class ZoneStats {
    private long trips;                                  // invariant: totalPaise == trips * 10_000
    private long totalPaise;

    synchronized void record() {                         // both fields change together
        trips++;
        totalPaise += 10_000;
    }

    long[] readUnlocked() { return new long[] {trips, totalPaise}; }
    synchronized long[] readLocked() { return new long[] {trips, totalPaise}; }

    static volatile boolean done;

    public static void main(String[] args) throws InterruptedException {
        ZoneStats stats = new ZoneStats();
        Thread writer = new Thread(() -> { for (int i = 0; i < 20_000_000; i++) stats.record(); done = true; });
        writer.start();
        long unlockedReads = 0, unlockedBroken = 0, lockedReads = 0, lockedBroken = 0;
        while (!done) {
            long[] a = stats.readUnlocked();
            unlockedReads++;
            if (a[1] != a[0] * 10_000) unlockedBroken++;
            long[] b = stats.readLocked();
            lockedReads++;
            if (b[1] != b[0] * 10_000) lockedBroken++;
        }
        writer.join();
        System.out.printf("unlocked reads: %,d, inconsistent: %,d%n", unlockedReads, unlockedBroken);
        System.out.printf("locked reads:   %,d, inconsistent: %,d%n", lockedReads, lockedBroken);
        System.out.println("final " + stats.trips + " trips, " + stats.totalPaise + " paise");
    }
}`,
        },
        {
          type: "output",
          text: `unlocked reads: 8,723,064, inconsistent: 3,588
locked reads:   8,723,064, inconsistent: 0
final 20000000 trips, 200000000000 paise`,
        },
        {
          type: "paragraph",
          text: "The writer keeps an invariant across two fields (`totalPaise == trips * 10_000`), and always updates both under the lock. A reader that skips the lock can read `trips` before an update and `totalPaise` after it: 1,881 to 3,588 inconsistent snapshots per run over three runs. The locked reader never saw one, because it can't run between the writer's two assignments. A common mistake is to lock only writes because \"reads don't change anything\": they don't, but they can observe a half-finished change, and without a lock or `volatile` they're not even guaranteed to see the latest values.",
        },
        {
          type: "heading",
          text: "Example 2: Iterating a synchronized collection",
        },
        {
          type: "code",
          language: "java",
          title: "SnapshotUnderLock.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.ConcurrentModificationException;
import java.util.List;

public class SnapshotUnderLock {
    static final List<String> onlineDrivers = Collections.synchronizedList(new ArrayList<>());
    static volatile boolean stop;

    static int countUnsafe() {
        int n = 0;
        for (String d : onlineDrivers) if (d.startsWith("DRV")) n++;    // each call locks, the loop doesn't
        return n;
    }

    static int countSafe() {
        List<String> copy;
        synchronized (onlineDrivers) {                                  // the list's own lock
            copy = new ArrayList<>(onlineDrivers);
        }
        int n = 0;
        for (String d : copy) if (d.startsWith("DRV")) n++;             // iterate outside the lock
        return n;
    }

    public static void main(String[] args) throws InterruptedException {
        Thread churn = new Thread(() -> {
            for (int i = 0; !stop; i++) {
                onlineDrivers.add("DRV-" + i);
                if (onlineDrivers.size() > 1_000) onlineDrivers.remove(0);
            }
        });
        churn.start();
        while (onlineDrivers.size() < 1_000) Thread.onSpinWait();
        int failures = 0;
        for (int i = 0; i < 10_000; i++) {
            try { countUnsafe(); } catch (ConcurrentModificationException e) { failures++; }
        }
        System.out.println("unsafe iteration: " + failures + " of 10000 threw ConcurrentModificationException");
        failures = 0;
        for (int i = 0; i < 10_000; i++) {
            try { countSafe(); } catch (ConcurrentModificationException e) { failures++; }
        }
        System.out.println("copy under lock:  " + failures + " of 10000 threw");
        stop = true;
        churn.join();
    }
}`,
        },
        {
          type: "output",
          text: `unsafe iteration: 10000 of 10000 threw ConcurrentModificationException
copy under lock:  0 of 10000 threw`,
        },
        {
          type: "list",
          items: [
            "`Collections.synchronizedList` locks each method call, but a `for` loop is many calls (`iterator()`, `hasNext()`, `next()`), and the list's lock is released between them. With another thread adding and removing, every one of 10,000 iterations threw `ConcurrentModificationException`. The `synchronizedList` documentation says iteration must be done while holding the list's own lock manually.",
            "Holding the lock for the whole iteration would block the churn thread for the length of the loop, so the fix copies the list under the lock (fast, one `System.arraycopy`) and iterates the copy without it.",
            "My first version of this program reported 0 failures for both: the 10,000 reads finished before the churn thread had added anything. The `while (onlineDrivers.size() < 1_000)` line makes the test wait until there's something to race with. A concurrency test that can't fail proves nothing; it's worth checking that the buggy version fails first.",
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
            ["Guard a few fields that change together", "`synchronized` on a private lock object, around both reads and writes", "Locking only the writes"],
            ["A single counter or flag updated from many threads", "`AtomicLong`, `LongAdder` (lesson 6)", "`volatile` `count++`, an unsynchronized `int`"],
            ["Insert-if-absent on a shared map", "`putIfAbsent`, `computeIfAbsent` on `ConcurrentHashMap`", "`containsKey` then `put`"],
            ["Wait for a condition", "`BlockingQueue`, `CountDownLatch`, `CompletableFuture`; or `wait` in a `while` loop with `notifyAll`", "`wait` in an `if`, `notify` with mixed waiters, `sleep` polling"],
            ["Try a lock with a timeout, or be interruptible while waiting", "`ReentrantLock.tryLock`, `lockInterruptibly` (lesson 5)", "`synchronized`, which can't do either"],
            ["Many readers, rare writers", "Immutable snapshots behind a `volatile` reference (lesson 4), `ReadWriteLock` (lesson 5)", "One big lock around every read"],
            ["Mutual exclusion across several service instances", "Database row locks, conditional updates (lessons 23 and 24)", "`synchronized`, which only covers one JVM"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Guarding the same data with different locks",
        },
        {
          type: "paragraph",
          text: "A `static synchronized` method and an instance `synchronized` method updating the same static field lock different objects and exclude nothing: `WhichLock` lost up to 27% of its increments. Decide which lock guards which state, write it down in a comment, and use that lock everywhere the state is touched.",
        },
        {
          type: "heading",
          text: "Locking on something shared or replaceable",
        },
        {
          type: "paragraph",
          text: "String literals are interned JVM-wide; small boxed integers are cached; `getClass()` changes with the subclass; a field that's reassigned inside the block (`synchronized (boxedCount) { boxedCount++; }`) gives each thread a different lock. Lock on a `private final` object that exists only to be a lock.",
        },
        {
          type: "heading",
          text: "Check-then-act on a thread-safe collection",
        },
        {
          type: "paragraph",
          text: "`if (!map.containsKey(k)) map.put(k, v);` on a `ConcurrentHashMap` gave two winners in a quarter to a third of trials. Use the map's atomic compound methods, or put both calls in one critical section.",
        },
        {
          type: "heading",
          text: "Doing slow work while holding a lock",
        },
        {
          type: "paragraph",
          text: "`Thread.sleep`, network calls, database queries and logging to a slow appender inside `synchronized` make every other thread wait for them. `sleep` and I/O don't release monitors. The Performance section measures a lock held around computation: eight threads were slower than one.",
        },
        {
          type: "heading",
          text: "wait() in an if, or notify() with different kinds of waiters",
        },
        {
          type: "paragraph",
          text: "`if (empty) wait();` fails as soon as two threads wake for one item (`IfNotWhile`). `notify()` with producers and consumers on one monitor deadlocked in 10 of 10 trials (`LostWakeup`). Always `while`, and `notifyAll` unless you can prove `notify` is enough.",
        },
        {
          type: "heading",
          text: "Calling wait or notify without holding the monitor",
        },
        {
          type: "paragraph",
          text: "`IllegalMonitorStateException: current thread is not owner`. It also happens when you hold a lock, but not the one belonging to the object you call `wait` on, for example `synchronized (this) { queue.wait(); }`.",
        },
        {
          type: "heading",
          text: "Assuming a race that passed tests is fixed",
        },
        {
          type: "paragraph",
          text: "`LostUpdates` returned the right total in 2 of 20 compiled runs, and `SnapshotUnderLock` reported zero failures until the test was fixed to actually overlap. Run racy code many times, with more threads than cores, and check that the test can fail before trusting it when it passes. Lesson 22 covers tools for this.",
        },
        {
          type: "heading",
          text: "Expecting synchronized to work across servers",
        },
        {
          type: "paragraph",
          text: "A monitor lives in one JVM's memory. Two instances of a service behind a load balancer each have their own lock and their own in-memory state, and the production section shows a `synchronized` fix that still double-assigns every time with two instances.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Keep shared mutable state small, private, and documented with the lock that guards it (`// guarded by lock`).",
            "Lock on a `private final Object` rather than `this`, a `Class`, a `String` or a wrapper, unless the class is small and its locking is part of its documented contract.",
            "Guard every access, reads included, to state that several threads write.",
            "Make compound actions atomic: one critical section around check and act, or an atomic method that does both.",
            "Keep critical sections short: compute outside, lock only around the shared update. Never sleep, block on I/O or call unknown code (listeners, callbacks) while holding a lock.",
            "For waiting, prefer `java.util.concurrent` classes. If you write `wait`, use a `while` loop, `notifyAll`, and a deadline when the wait must be bounded.",
            "Prefer immutable objects and confinement (data owned by one thread) over locking; the cheapest lock is the one you don't need.",
            "Turn on `-XX:DiagnoseSyncOnValueBasedClasses=1` in test runs, and look at `jdk.JavaMonitorEnter` events in JFR recordings when latency looks like queueing.",
            "When the data lives in a database or several instances serve the same requests, coordinate there, not with `synchronized`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "What does a lock cost? 40 million increments through a `synchronized` method, best of five runs per row, with the CPU time spent by all threads alongside the wall time:",
        },
        {
          type: "code",
          language: "java",
          title: "LockCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.concurrent.atomic.AtomicLong;

public class LockCost {
    static final ThreadMXBean MX = ManagementFactory.getThreadMXBean();

    static class Counter {
        long plain;
        long locked;
        void plainIncrement() { plain++; }
        synchronized void syncIncrement() { locked++; }
    }

    // returns {wall ns, cpu ns summed over threads}
    static long[] run(int threads, long opsPerThread, Counter c) throws InterruptedException {
        AtomicLong cpu = new AtomicLong();
        Thread[] ts = new Thread[threads];
        for (int t = 0; t < threads; t++) {
            ts[t] = new Thread(() -> {
                long c0 = MX.getCurrentThreadCpuTime();
                for (long i = 0; i < opsPerThread; i++) c.syncIncrement();
                cpu.addAndGet(MX.getCurrentThreadCpuTime() - c0);
            });
        }
        long start = System.nanoTime();
        for (Thread t : ts) t.start();
        for (Thread t : ts) t.join();
        return new long[] {System.nanoTime() - start, cpu.get()};
    }

    static void inflate(Counter c) throws InterruptedException {
        synchronized (c) { c.wait(1); }                        // wait() always inflates the monitor
    }

    public static void main(String[] args) throws InterruptedException {
        long total = 40_000_000;
        for (int warm = 0; warm < 2; warm++) run(2, 5_000_000, new Counter());

        long best = Long.MAX_VALUE;
        for (int r = 0; r < 5; r++) {
            Counter c = new Counter();
            long t = System.nanoTime();
            for (long i = 0; i < total; i++) c.plainIncrement();
            best = Math.min(best, System.nanoTime() - t);
            if (c.plain != total) throw new AssertionError();
        }
        System.out.printf("%-36s %6.2f ns/op%n", "no lock, 1 thread", (double) best / total);

        for (String mode : new String[] {"thin", "inflated"}) {
            long[] b = {Long.MAX_VALUE, 0};
            for (int r = 0; r < 5; r++) {
                Counter c = new Counter();
                if (mode.equals("inflated")) inflate(c);
                long[] x = run(1, total, c);
                if (x[0] < b[0]) b = x;
            }
            System.out.printf("%-36s %6.2f ns/op%n", "synchronized, 1 thread, " + mode, (double) b[0] / total);
        }

        for (int threads : new int[] {2, 4, 8}) {
            long[] b = {Long.MAX_VALUE, 0};
            for (int r = 0; r < 5; r++) {
                Counter c = new Counter();
                long[] x = run(threads, total / threads, c);
                if (c.locked != total) throw new AssertionError(c.locked);
                if (x[0] < b[0]) b = x;
            }
            System.out.printf("%-36s %6.2f ns/op  cpu %5.2f ns/op%n",
                    "synchronized, " + threads + " threads", (double) b[0] / total, (double) b[1] / total);
        }
    }
}`,
        },
        {
          type: "output",
          text: `no lock, 1 thread                      2.00 ns/op
synchronized, 1 thread, thin           6.63 ns/op
synchronized, 1 thread, inflated       2.67 ns/op
synchronized, 2 threads                3.20 ns/op  cpu  3.19 ns/op
synchronized, 4 threads                5.85 ns/op  cpu  6.15 ns/op
synchronized, 8 threads                6.34 ns/op  cpu  6.37 ns/op`,
        },
        {
          type: "list",
          items: [
            "**An uncontended thin lock cost about 4.5 ns per call** on top of the work: 6.4 to 7.2 ns against 1.9 to 2.2 ns without a lock, over six runs. That's two atomic CAS instructions (lock and unlock), each a few nanoseconds on this Core i5. Small, but not free in a tight loop.",
            "**The surprise: an already-inflated monitor was faster than a thin lock** when uncontended, 2.7 to 3.7 ns. The likely reason: entering an inflated monitor is one CAS on its owner field, and the compiled fast path can release it with a plain store when nobody is queued, whereas a stack lock needs a CAS to lock and another to restore the header on unlock.",
            "**Contention didn't collapse throughput, it removed parallelism.** With 2, 4 or 8 threads the total time stayed in the same range as one thread (3.2 to 9.1 ns per increment over six runs, very noisy because other benchmarks were running on the machine), and in most runs the CPU time matched the wall time: effectively one thread worked while the others were parked. In some runs CPU time was up to 2.4 times the wall time, which is threads spinning before they park. Eight threads did the work of one.",
          ],
        },
        {
          type: "paragraph",
          text: "So the real cost of a contended lock is the work that can't run in parallel. The second benchmark computes a fare (about 0.4 microseconds of arithmetic the JIT can't remove) and adds it to a shared total, with the lock either around everything or around only the addition:",
        },
        {
          type: "code",
          language: "java",
          title: "LockScope.java",
          code: `public class LockScope {
    static long totalPaise;
    static final Object LOCK = new Object();

    static long fareFor(long trip) {                       // about a microsecond of pure computation
        double d = trip;
        for (int i = 0; i < 60; i++) d = Math.sqrt(d + i);   // a dependent chain the JIT can't skip
        return 5_000 + (long) (d * 1000) % 30_000;
    }

    static void wide(long trip) {
        synchronized (LOCK) {                              // the whole calculation under the lock
            totalPaise += fareFor(trip);
        }
    }

    static void narrow(long trip) {
        long fare = fareFor(trip);                         // computed in parallel
        synchronized (LOCK) {                              // only the shared update is locked
            totalPaise += fare;
        }
    }

    interface Op { void apply(long trip); }

    static long time(int threads, int perThread, Op op) throws InterruptedException {
        totalPaise = 0;
        Thread[] ts = new Thread[threads];
        for (int t = 0; t < threads; t++) {
            int base = t * perThread;
            ts[t] = new Thread(() -> { for (int i = 0; i < perThread; i++) op.apply(base + i); });
        }
        long start = System.nanoTime();
        for (Thread t : ts) t.start();
        for (Thread t : ts) t.join();
        return (System.nanoTime() - start) / 1_000_000;
    }

    public static void main(String[] args) throws InterruptedException {
        int total = 800_000;
        for (int w = 0; w < 2; w++) { time(8, 50_000, LockScope::wide); time(8, 50_000, LockScope::narrow); }
        for (int threads : new int[] {1, 8}) {
            long bestWide = Long.MAX_VALUE, bestNarrow = Long.MAX_VALUE;
            long sumWide = 0, sumNarrow = 0;
            for (int r = 0; r < 3; r++) {
                bestWide = Math.min(bestWide, time(threads, total / threads, LockScope::wide));
                sumWide = totalPaise;
                bestNarrow = Math.min(bestNarrow, time(threads, total / threads, LockScope::narrow));
                sumNarrow = totalPaise;
            }
            System.out.printf("%d thread(s): lock around everything %5d ms, lock around the update %5d ms (totals equal: %b)%n",
                    threads, bestWide, bestNarrow, sumWide == sumNarrow);
        }
    }
}`,
        },
        {
          type: "output",
          text: `1 thread(s): lock around everything   300 ms, lock around the update   296 ms (totals equal: true)
8 thread(s): lock around everything   431 ms, lock around the update    88 ms (totals equal: true)`,
        },
        {
          type: "list",
          items: [
            "**Lock around everything: 8 threads were slower than 1** (362 to 437 ms against about 300 ms, over three runs). The computation was serialized by the lock, and the threads added handoff costs on top.",
            "**Lock around the update only: 84 to 95 ms**, about 3.4 times faster than one thread. Not 8 times: the machine had other load, and the shared update is still a serial point. But the work itself ran in parallel.",
            "Same totals either way: both are correct. The difference is entirely how long the lock is held. \"Compute outside, publish inside\" is the most effective lock optimisation there is.",
            "Single-machine `System.nanoTime` measurements under load from other processes, not JMH; I ran each benchmark at least three times and quote ranges. The ratios were stable; the absolute numbers were not.",
          ],
        },
        {
          type: "paragraph",
          text: "C2 also removes locks it can prove are useless: **lock elision** for objects that never escape the thread (escape analysis), and **lock coarsening**, merging adjacent `synchronized` blocks on the same object into one. Both are on by default (`-XX:+EliminateLocks`), which is one reason micro-benchmarks of locking on local objects measure nothing.",
        },
      ],
    },
    {
      title: "synchronized in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing dispatch service in Kolkata keeps an in-memory map of which driver is assigned to which trip. When a rider requests a trip, the service finds the nearest free driver and assigns them. During the evening peak in SALT-LAKE, support started getting calls from riders whose driver had cancelled on them, and from drivers who had two pickups at once. The logs showed the same driver assigned to two trips within a few milliseconds. The assignment code checked `containsKey` on a `ConcurrentHashMap` and then called `put`: thread-safe parts, racy whole.",
        },
        {
          type: "paragraph",
          text: "I rebuilt it with two riders requesting at the same instant, both matched to the same nearest driver, Asha. A `volatile` start flag lines the two threads up; no other synchronization:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverAssignment.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class DriverAssignment {
    interface Assigner { boolean assign(String driver, String trip); }

    // What shipped: a thread-safe map, used with check-then-act
    static class BuggyAssigner implements Assigner {
        final Map<String, String> tripByDriver = new ConcurrentHashMap<>();
        public boolean assign(String driver, String trip) {
            if (tripByDriver.containsKey(driver)) return false;    // check: is the driver free?
            int eta = etaSeconds(driver, trip);                     // a little work in between
            tripByDriver.put(driver, trip);                         // act: assign
            return eta >= 0;
        }
    }

    // Fix 1: make check and act one critical section
    static class SyncAssigner implements Assigner {
        final Map<String, String> tripByDriver = new HashMap<>();   // only touched under the lock
        public synchronized boolean assign(String driver, String trip) {
            if (tripByDriver.containsKey(driver)) return false;
            int eta = etaSeconds(driver, trip);
            tripByDriver.put(driver, trip);
            return eta >= 0;
        }
    }

    // Fix 2: let the map do check-and-act atomically
    static class AtomicAssigner implements Assigner {
        final Map<String, String> tripByDriver = new ConcurrentHashMap<>();
        public boolean assign(String driver, String trip) {
            return tripByDriver.putIfAbsent(driver, trip) == null;
        }
    }

    static int etaSeconds(String driver, String trip) {
        return Math.abs((driver + trip).hashCode()) % 600;
    }

    static volatile boolean go;

    // Two riders in SALT-LAKE request at the same moment; both get matched to the nearest driver, Asha.
    static int doubleAssignments(java.util.function.Supplier<Assigner> service, boolean twoInstances, int rounds)
            throws InterruptedException {
        int doubles = 0;
        for (int r = 0; r < rounds; r++) {
            Assigner a = service.get();
            Assigner b = twoInstances ? service.get() : a;          // second pod with its own memory
            AtomicInteger accepted = new AtomicInteger();
            go = false;
            Thread t1 = new Thread(() -> { while (!go) Thread.onSpinWait(); if (a.assign("DRV-ASHA", "TRIP-1")) accepted.incrementAndGet(); });
            Thread t2 = new Thread(() -> { while (!go) Thread.onSpinWait(); if (b.assign("DRV-ASHA", "TRIP-2")) accepted.incrementAndGet(); });
            t1.start(); t2.start();
            go = true;
            t1.join(); t2.join();
            if (accepted.get() == 2) doubles++;
        }
        return doubles;
    }

    public static void main(String[] args) throws InterruptedException {
        int rounds = 1_000;
        System.out.println("containsKey + put:      " + doubleAssignments(BuggyAssigner::new, false, rounds) + " of " + rounds + " rounds assigned Asha twice");
        System.out.println("synchronized assign:    " + doubleAssignments(SyncAssigner::new, false, rounds) + " of " + rounds);
        System.out.println("putIfAbsent:            " + doubleAssignments(AtomicAssigner::new, false, rounds) + " of " + rounds);
        System.out.println("synchronized, 2 pods:   " + doubleAssignments(SyncAssigner::new, true, rounds) + " of " + rounds);
    }
}`,
        },
        {
          type: "output",
          text: `containsKey + put:      90 of 1000 rounds assigned Asha twice
synchronized assign:    0 of 1000
putIfAbsent:            0 of 1000
synchronized, 2 pods:   1000 of 1000`,
        },
        {
          type: "list",
          items: [
            "**The bug reproduced every time:** between 14 and 215 of 1,000 simultaneous requests assigned Asha twice, over eleven runs. Both threads passed `containsKey` before either reached `put`. In production the window was much wider, because the real code called a maps service for the ETA between the check and the put.",
            "**Fix 1, `synchronized assign`:** the check, the ETA and the put are one critical section, 0 of 1,000. The map no longer needs to be concurrent, since it's only touched under the lock. The cost is that all assignments in the service are serialized, including the slow ETA call, so it only scales if that work moves outside the lock.",
            "**Fix 2, `putIfAbsent`:** the map's own atomic check-and-insert, 0 of 1,000, and it locks only the bin for that driver, so assignments for different drivers run in parallel. The ETA is computed before or after the claim, outside any lock. This was the version that shipped.",
            "**Neither fixes two instances.** `synchronized, 2 pods` gives each simulated pod its own `SyncAssigner`, as two JVMs behind a load balancer would have, and Asha was assigned twice in **every** round: each pod's lock and map know nothing about the other's. The service was running two replicas at peak, and that's where most of the real duplicates came from. The durable fix moved the claim into the database (`UPDATE drivers SET trip_id = ? WHERE id = ? AND trip_id IS NULL`, checking the updated row count), which is the subject of lesson 23, Why synchronized Fails Across Servers.",
          ],
        },
        {
          type: "list",
          items: [
            "Lesson: any \"if free then take\" on shared state is a check-then-act race, no matter how thread-safe each call is.",
            "Lesson: make the claim a single atomic operation on whatever is the source of truth: a lock in one JVM, an atomic map method for in-memory state, a conditional update for a database.",
            "Lesson: keep slow calls out of the critical section, or the fix becomes the next bottleneck.",
            "Lesson: in-memory locks protect in-memory state in one process. The moment there are two replicas, they protect nothing shared.",
            "Lesson: a concurrent reproduction with a start barrier and a counter turned a \"can't reproduce\" ticket into a number (90 in 1,000) that a fix could be measured against.",
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
              question: "What is a race condition? Give an example.",
              answer:
                "A bug whose result depends on the relative timing of threads. `count++` from several threads is the classic: it compiles to `getfield`, `iadd`, `putfield`, so two threads can read the same value and one write overwrites the other. Four threads doing a million increments each ended with as little as 1,002,206 instead of 4,000,000 in my runs. Check-then-act (`if (!map.containsKey(k)) map.put(k, v)`) is the other common form.",
            },
            {
              question: "What's the difference between a synchronized method and a synchronized block?",
              answer:
                "A synchronized instance method locks `this` for the whole method (a static one locks the `Class` object); it's marked with the `ACC_SYNCHRONIZED` flag and has no lock instructions in its bytecode. A synchronized block locks any object you choose for just that block, compiled to `monitorenter` and `monitorexit`, plus a second `monitorexit` in an exception handler so the lock is released if the block throws. Blocks let you use a private lock object and keep the critical section small.",
            },
            {
              question: "What lock does a static synchronized method use?",
              answer:
                "The `Class` object of the class it's declared in, for example `Fare.class`. It's a different lock from any instance's `this`, so a static synchronized method and an instance synchronized method can run at the same time. If both touch the same static field, updates are lost; I measured up to 27% lost increments.",
            },
            {
              question: "Is synchronized reentrant? Why does it matter?",
              answer:
                "Yes. A thread that owns a monitor can enter it again, and the JVM counts the depth, releasing the lock only when the outermost block exits. Without it, a synchronized method calling another synchronized method on the same object, or an override calling `super.method()`, would deadlock on itself. With thin locks, the recursive entry just records an extra lock record on the stack without touching the object header.",
            },
            {
              question: "What's the difference between BLOCKED and WAITING?",
              answer:
                "BLOCKED means the thread is trying to enter a `synchronized` region whose monitor another thread owns; a thread dump shows `waiting to lock <0x...>`. WAITING (from `wait()`) means the thread owned the monitor, released it, and is waiting to be notified; the dump shows `waiting on <0x...>`. A BLOCKED thread wants the lock; a WAITING thread has given it up.",
            },
            {
              question: "Why must wait() be called inside a while loop?",
              answer:
                "Because waking up doesn't mean the condition is true. Java monitors use Mesa semantics: a notified thread must re-acquire the lock, and by then another thread may have consumed what it was waiting for. The JVM may also wake a thread spuriously. Re-checking the condition in a `while` loop handles both. With `if`, two drivers woken for one trip both tried to take it, and one got `NoSuchElementException`.",
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
              question: "Why does wait() have to be called while holding the monitor?",
              answer:
                "Because checking the condition and deciding to wait must be atomic with respect to the thread that changes it. If you could check \"queue empty\" without the lock, a producer could add an item and `notify` between your check and your `wait`, and you'd sleep forever on a notification that already happened. The JVM enforces it: `wait` or `notify` without owning that object's monitor throws `IllegalMonitorStateException: current thread is not owner`. `wait` then releases the monitor atomically as the thread joins the wait set.",
            },
            {
              question: "When is notify() safe, and when do you need notifyAll()?",
              answer:
                "`notify()` is safe only when every waiter waits for the same condition and any single one of them can proceed (uniform waiters, one-in-one-out). With producers and consumers waiting on the same monitor, `notify()` can wake the wrong kind of thread, which goes back to waiting without passing the signal on. My one-slot buffer with two producers and two consumers ended with all four threads WAITING in 10 of 10 trials with `notify()`, and 0 of 10 with `notifyAll()`.",
            },
            {
              question: "Why shouldn't you synchronize on a String literal or an Integer?",
              answer:
                "Because they're shared in ways you don't control. String literals are interned, so `\"LOCK\"` in two unrelated classes is the same object and the same lock: my `Payouts` class waited 250 ms for a `Billing` settlement it had nothing to do with. `Integer.valueOf` caches -128 to 127, and boxed values are replaced on every `++`, so `synchronized (boxedCount) { boxedCount++; }` locks a different object each time. Since JDK 16 `javac` warns about value-based classes, and `-XX:DiagnoseSyncOnValueBasedClasses` can log or abort at run time.",
            },
            {
              question: "Does using ConcurrentHashMap make your code thread-safe?",
              answer:
                "It makes each map operation thread-safe, not sequences of operations. `containsKey` followed by `put` is a check-then-act race; I measured two winners in a quarter to a third of simultaneous attempts. Use the atomic compound methods (`putIfAbsent`, `computeIfAbsent`, `compute`, `merge`) or a lock around the sequence. Invariants across several maps or fields also need a lock.",
            },
            {
              question: "Does sleep() release the lock? Does wait()?",
              answer:
                "`sleep()` doesn't: a thread sleeping inside `synchronized` keeps the monitor, and every other thread that needs it stays BLOCKED. A thread dump shows the sleeper as TIMED_WAITING (sleeping) with `- locked <0x...>`. `wait()` releases the monitor it's called on (only that one, not other monitors the thread holds) and re-acquires it before returning.",
            },
            {
              question: "What does javac generate for a synchronized block, and why are there two monitorexit instructions?",
              answer:
                "It stores the lock object in a local variable, emits `monitorenter`, the body, `monitorexit` and a jump past the handler. The second `monitorexit` is in an exception handler that covers the body (`any` in the exception table): it releases the lock and rethrows. A second table entry covers the handler itself, so the unlock is retried if something is thrown during it. That's how `synchronized` releases the lock on every exit path without a source-level `finally`.",
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
              question: "How does HotSpot implement synchronized? What is lock inflation?",
              answer:
                "Through the object's mark word. On JDK 21's default (stack locking), an uncontended lock CASes the mark word to point at a lock record in the owner's stack frame, which holds the displaced header; lock bits `00`. When another thread contends, or `wait()` is called, the lock is inflated: a native `ObjectMonitor` is allocated with owner, recursion count, entry queues and a wait set, and the mark word points to it with tag `10`. Contending threads spin adaptively, then park. Idle monitors are deflated later by the service thread. I read all three header states with `Unsafe`: `...d601`, `...e920`, `...0fe2`, and back to `...d601` after deflation.",
            },
            {
              question: "What happened to biased locking?",
              answer:
                "Biased locking let one thread own an object's lock without any atomic instruction by writing its thread ID into the header; another thread's arrival required a revocation at a safepoint. It helped legacy code that locked uncontended `Vector`s and `Hashtable`s, but cost safepoint pauses and JVM complexity, while modern code uses `java.util.concurrent`. JDK 15 disabled it by default and deprecated it (JEP 374), and JDK 18 removed it. On JDK 21, `-XX:+UseBiasedLocking` is an unrecognised option; on JDK 17 it still works with a deprecation warning.",
            },
            {
              question: "What does the identity hash code have to do with locking?",
              answer:
                "Both live in the mark word. With stack locking, the header (including the hash) is copied into the lock record while the object is locked and restored on unlock. If someone asks for the identity hash of a locked object, or an inflated one, the hash is read from or stored in the displaced header or the `ObjectMonitor`. In my experiment the hash `610455d6` disappeared from the header while the lock was inflated and came back intact after deflation. Under the newer lightweight locking (`LockingMode=2`) the header keeps the hash even while locked.",
            },
            {
              question: "Why can a contended synchronized counter be as fast in total as an uncontended one?",
              answer:
                "Because under heavy contention the JVM parks the losers, so in effect one thread runs at a time and re-acquires an inflated monitor cheaply while the others sleep. I measured 3 to 9 ns per increment with 2, 4 or 8 threads, the same range as one thread, with CPU time roughly equal to wall time. The cost isn't per-operation overhead, it's lost parallelism and unfair scheduling: eight threads did the work of one, and with real work inside the lock they were slower than one.",
            },
            {
              question: "What are lock elision and lock coarsening?",
              answer:
                "C2 optimisations. Elision removes locking on objects that escape analysis proves are only reachable from one thread, for example a local `StringBuffer`. Coarsening merges adjacent synchronized regions on the same lock into one, reducing acquire/release pairs, for example consecutive `append` calls. Both are controlled by `-XX:+EliminateLocks` (on by default). They're why benchmarks of locks on local objects often measure nothing, and why the JMM is specified in terms of happens-before rather than \"every lock really executes\".",
            },
            {
              question: "What changed for synchronized with virtual threads?",
              answer:
                "On JDK 21, a virtual thread that blocks inside `synchronized` (or in `wait()`) pins its carrier platform thread: it can't unmount, so the carrier is blocked too, and with few carriers that can stall the scheduler. That's why JDK 21 advice was to use `ReentrantLock` around blocking I/O in virtual-thread code. JDK 24 (JEP 491) reworked monitors so virtual threads can unmount while blocked on or waiting in a monitor. Lesson 20 covers pinning in detail.",
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
              question: "Production reports the same driver assigned to two trips a few times an hour at peak. The code checks a ConcurrentHashMap with containsKey and then calls put. What do you do?",
              answer:
                "It's a check-then-act race: two requests both see the driver free before either puts. First I'd reproduce it: two threads released together by a start flag, assigning the same driver, counted over a thousand rounds. My rebuild assigned Asha twice in 14 to 215 of 1,000. Then make the claim atomic: `putIfAbsent(driver, trip) == null` (0 of 1,000) or a `synchronized` method around check and put (also 0), keeping slow calls like the ETA lookup outside the lock.\n\nThen I'd ask how many instances run: with two replicas each has its own map and lock, and my two-pod simulation double-assigned in every round. If it's more than one, the claim has to move to the shared store, a conditional `UPDATE ... WHERE trip_id IS NULL` checking the row count.",
            },
            {
              question: "Latency of an API jumps from 20 ms to 2 s under load, CPU is low, and a thread dump shows 180 threads BLOCKED. How do you find the cause?",
              answer:
                "Low CPU with many BLOCKED threads means queueing on a lock, not computation. In the dump, the BLOCKED threads say `waiting to lock <0x...>`; I'd count the addresses and find the one most threads wait on, then search for the thread with `- locked <same address>`. Its stack shows what it does while holding the lock: typically a database call, an HTTP call, `Thread.sleep`, or logging. Two or three dumps a few seconds apart show whether it's one long holder or a steady stream.\n\nJFR's `jdk.JavaMonitorEnter` events, grouped by monitor class and summed by duration, confirm it with numbers. The fix is to move the slow work out of the critical section; in my benchmark, narrowing the lock made eight threads 4.9 times faster than locking around everything.",
            },
            {
              question: "A nightly settlement job and a payout service occasionally stall each other for seconds, though they share no data. Both have private static final String LOCK = \"LOCK\". What's happening?",
              answer:
                "String literals are interned, so both `LOCK` fields refer to the same `String` object in the JVM, and both classes are synchronizing on one monitor. My two-class reproduction made `Payouts` wait 250 ms for `Billing`'s unrelated settlement. A thread dump confirms it: threads from both components wait on the same `<0x...> (a java.lang.String)`.\n\nThe fix is `private static final Object LOCK = new Object();` in each class. I'd also grep for `synchronized (\"`, synchronization on boxed values and `getClass()`, and enable `-XX:DiagnoseSyncOnValueBasedClasses=1` in tests.",
            },
            {
              question: "A worker pool built on wait/notify sometimes stops processing completely. All worker threads show WAITING and the queue has items. What do you look for?",
              answer:
                "A lost wake-up. Most likely `notify()` with more than one kind of waiter on the same monitor (for example producers waiting for space and consumers waiting for items), so a notification wakes a thread that can't proceed and the signal is gone. My one-slot buffer did this in 10 of 10 trials with `notify()`. Other causes: notifying without changing state under the same lock, waiting in an `if`, or changing the state without notifying at all on some path (an exception between the update and the `notify`).\n\nShort-term fix: `notifyAll()`, and `wait` in `while` loops. Better: replace the hand-written queue with an `ArrayBlockingQueue` or `LinkedBlockingQueue`, which use separate conditions for not-full and not-empty.",
            },
            {
              question: "A teammate fixes a lost-update bug by adding synchronized to the write method only. The counter is now right, but a dashboard sometimes shows an average fare that's impossible. Why?",
              answer:
                "The readers aren't locked. The writer updates two related fields (count and total) under the lock, but an unlocked reader can read one before an update and the other after it, and without the lock it isn't even guaranteed to see recent writes. My `ZoneStats` test saw 1,881 to 3,588 inconsistent snapshots per run with unlocked reads, and none with a `synchronized` read method. Fix: read both fields under the same lock, or publish an immutable snapshot object through a `volatile` field (next lesson).",
            },
            {
              question: "After a refactor, a static cache's hit counter undercounts by 10 to 20%, though every method that updates it is synchronized. What would you check?",
              answer:
                "Which object each `synchronized` locks. A common cause is a mix of `static synchronized` methods (locking the `Class`) and instance `synchronized` methods (locking `this`) updating the same static field; the refactor may have turned one of them into an instance method. My `WhichLock` reproduced it: up to 27% lost. Other suspects: `synchronized (getClass())` called on subclasses, a lock field that's reassigned, or code that updates the field through a path with no lock at all. Fix by guarding the static state with one `private static final Object` used everywhere, or replacing the counter with a `LongAdder`.",
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
            "Run `LostUpdates` three times, then add `synchronized` to `increment()` and run it three times again.",
            "Compile a class with one `synchronized` block and run `javap -c` on it. Find the two `monitorexit` instructions and the exception table.",
            "Run `java -XX:+UseBiasedLocking -version` on JDK 21, and on JDK 17 if you have it.",
            "Start `MonitorStates` in the background and run `jcmd MonitorStates Thread.print`. Match the `waiting to lock` address to a `- locked` line.",
            "In `LostWakeup`, change the number of producers and consumers to one each, keeping `notify()`. Does it still get stuck?",
            "Run `MarkWord` with `-XX:+UnlockExperimentalVMOptions -XX:LockingMode=2` and compare the `synchronized` and `nested` lines with the default.",
            "In `IfNotWhile`, change the `if` to `while` and run it. What does the program do now, and why?",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 gives counts well below 4,000,000 that vary between runs (occasionally exactly 4,000,000), then 4,000,000 every time. Step 2 shows `monitorenter`, a `monitorexit` on the normal path, a second `monitorexit` in the handler, and exception table rows with type `any`. Step 3 prints `Unrecognized VM option 'UseBiasedLocking'` on 21 and a deprecation warning on 17. Step 4 shows the same `<0x...>` address in `assigner-2`'s `waiting to lock` and `assigner-1`'s `- locked`. Step 5 doesn't get stuck: with one producer and one consumer, the only waiter that `notify()` can wake is the one that can proceed, so all 10 trials finish. Step 6 shows the hash still in the header while locked (`...d600`) and the nested lock inflated (`...62`, low bits 10). Step 7 never finishes on its own: Asha takes the trip, Ravi re-checks, finds the queue empty and waits again forever (the program hangs; press Ctrl+C), which is the correct behaviour for a consumer with nothing to consume.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `RACES      count++ = getfield, iadd, putfield -> lost updates
           (4 threads x 1M: as low as 1,002,206; right 2 of 20 runs)
           check-then-act: containsKey + put -> two winners (1/4 to 1/3)

FORMS      synchronized m()        -> this          ACC_SYNCHRONIZED
           static synchronized m() -> Foo.class
           synchronized (lock) {}  -> monitorenter/monitorexit
                                      + 2nd monitorexit on exception path
LOCK ON    private final Object lock     NOT "LITERAL", Integer, getClass()

HEADER     ...01 unlocked (hash stored) -> ...00 thin lock (CAS, stack)
           -> ...10 inflated ObjectMonitor (contention, wait())
           -> deflated later by the service thread
           biased locking: removed in JDK 18; LockingMode=1 default on 21

WAIT       hold the monitor (else IllegalMonitorStateException)
           while (!condition) wait();     // Mesa semantics, spurious wake
           notifyAll unless waiters are interchangeable
           notify + producers/consumers: stuck 10 of 10

DUMPS      BLOCKED  "waiting to lock <0x..>"  wants the lock
           WAITING  "waiting on <0x..>"       released it in wait()
           sleep() keeps the lock;  JFR jdk.JavaMonitorEnter

COST       uncontended thin ~4.5 ns; contended = lost parallelism
           lock only the shared update: 88 ms vs 431 ms (8 threads)
           synchronized = ONE JVM. Two pods: double-assigned every time`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A race condition is shared state changed by a sequence that isn't atomic: a read-modify-write like `count++`, or a check followed by an act. Thread-safe pieces don't make a safe whole.",
            "`synchronized` makes a region atomic with respect to every other region locking **the same object**, releases on every exit, is reentrant, and, as the next lesson shows, also makes writes visible. Choose the lock object deliberately, keep the region short, and use `wait` only in a `while` loop.",
            "Next comes volatile, Visibility and the Java Memory Model: why a thread can spin forever on a flag that another thread already changed, what `volatile` does and doesn't fix, the happens-before rules behind `synchronized` and `volatile`, reordering measured on real hardware, and safe publication.",
          ],
        },
      ],
    },
  ],
};
