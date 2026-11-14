import type { Lesson } from "../types";

export const atomicsAndCas: Lesson = {
  slug: "atomics-and-cas",
  date: "2026-11-14",
  title: "CAS, Atomic Classes, LongAdder and VarHandle",
  description:
    "Lock-free programming in Java on JDK 21, from the instruction up: compare-and-swap and the lock cmpxchg and lock xadd behind it (seen through -XX:+PrintIntrinsics and javap), why count++ lost 2.7 million of 4 million increments while AtomicLong lost none, get-then-set on an AtomicInteger that is just as broken, updateAndGet running a side-effecting function up to 4.1 times per update under 8 threads, the ABA problem reproduced on a lock-free stack and fixed with AtomicStampedReference, atomic arrays and field updaters that saved 16 bytes per driver, LongAdder's base and cells read through reflection, AtomicLong stuck at 36 to 60 million increments per second from 2 to 8 threads while LongAdder reached 569 million, a LongAdder sum() that returned -625 for a value that was only ever 0 or 1, VarHandle access modes, false sharing that made two independent counters 3 to 9 times slower and @Contended that only works with -XX:-RestrictContended, the history of sun.misc.Unsafe, and a requests-per-driver counter in a ride-hailing backend that lost up to 8% of its counts and was fixed with computeIfAbsent and LongAdder.",
  tags: ["Multithreading", "CAS", "Atomics", "Performance"],
  sections: [
    {
      title: "What CAS and the Atomic Classes Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, ReentrantLock, ReadWriteLock, StampedLock and AQS, kept arriving at the same line of code: `compareAndSetState(0, 1)`. Every lock in it, and every synchronizer built on AQS, is an `int` changed by one atomic instruction plus a queue for the threads that lose. This lesson is about that instruction, **compare-and-swap** (CAS), used directly: atomically \"if the value is still what I last saw, replace it with this, and tell me whether it worked\".",
        },
        {
          type: "paragraph",
          text: "`java.util.concurrent.atomic` wraps CAS into classes: `AtomicInteger`, `AtomicLong`, `AtomicBoolean` and `AtomicReference` for single variables, `AtomicIntegerArray` and friends for array elements, field updaters for `volatile` fields of your own classes, `AtomicStampedReference` for the ABA problem, and `LongAdder`/`LongAccumulator` for counters that many threads update at once. `VarHandle` (Java 9) is the general mechanism underneath, with explicit memory-ordering modes. None of them block: a thread that loses a CAS race just tries again, so there is no parking, no queue and no deadlock.",
        },
        {
          type: "paragraph",
          text: "That doesn't make them free. I measured the cost on JDK 21: an uncontended atomic increment is about as expensive as a `volatile` write, a contended `AtomicLong` gets **slower** as threads are added, a CAS loop re-runs your update function when it loses, and two unrelated counters that happen to share a 64-byte cache line can be several times slower than two that don't. The second half of the lesson is about those costs and the tools that remove them: `LongAdder`'s striping and `@Contended` padding.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Compare-and-swap is older than Java by twenty years: IBM put `CS` (compare and swap) into the System/370 in 1970 to let operating system code update shared data without disabling interrupts, and Intel added `CMPXCHG` with the 486 in 1989 (the `LOCK` prefix makes it atomic across processors). Maurice Herlihy's 1991 paper *Wait-Free Synchronization* proved that CAS is universal: any concurrent object can be built from it without locks, which ordinary reads and writes can't do. Java exposed it in 2004, through Doug Lea's JSR 166.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.4 (2002)", "`sun.misc.Unsafe` used inside the JDK (NIO, reflection); CAS methods `compareAndSwapInt/Long/Object`", "The only way to reach CAS, and not a public API"],
            ["Java 5 (2004)", "JSR 166: `java.util.concurrent.atomic` (`AtomicInteger`, `AtomicLong`, `AtomicBoolean`, `AtomicReference`, arrays, field updaters, `AtomicStampedReference`, `AtomicMarkableReference`)", "CAS as a supported API; built on `Unsafe`"],
            ["Java 6 (2006)", "`lazySet` on the atomic classes", "A cheaper ordered store (later named `setRelease`)"],
            ["Java 8 (2014)", "`LongAdder`, `LongAccumulator`, `DoubleAdder`, `DoubleAccumulator`; `updateAndGet`, `accumulateAndGet`; `@sun.misc.Contended` (JEP 142)", "Striped counters; functional updates; padding against false sharing"],
            ["Java 9 (2017)", "`VarHandle` (JEP 193); access modes plain, opaque, acquire/release, volatile; `compareAndExchange`, `weakCompareAndSet*`; JDK code moves to `jdk.internal.misc.Unsafe`; `@Contended` moves to `jdk.internal.vm.annotation`", "A supported replacement for `Unsafe` field access; explicit memory ordering"],
            ["Java 16 (2021)", "`VarHandle.withInvokeExactBehavior()`", "Exact type checking at the call site"],
            ["Java 23 (2024)", "JEP 471: memory-access methods of `sun.misc.Unsafe` deprecated for removal", "Use `VarHandle` and the Foreign Memory API instead"],
            ["Java 24 (2025)", "JEP 498: warning on first use of those `Unsafe` methods", "Libraries still using them print a warning at run time"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the whiteboard at a driver hub in New Town that shows how many seats are left in the airport shuttle.",
        },
        {
          type: "list",
          items: [
            "**`count++` without atomics is reading the board, walking to your desk to do the sum, and coming back to write it.** Two people who read 3 at the same time both write 4, and one booking vanishes.",
            "**CAS is a rule for the marker:** \"rub out the 3 and write 4, but only if it still says 3\". If someone changed it while you were working it out, you read it again and redo the sum. Nobody waits for anybody; you just sometimes redo work.",
            "**The update function is your sum on paper.** If, while working it out, you also phoned the passenger to confirm, a redo means a second phone call. That's why functions passed to `updateAndGet` must not have side effects.",
            "**ABA is the board saying \"Asha\" when you looked, and \"Asha\" when you came back,** although in between someone wrote \"Ravi\" and then \"Asha\" again. \"It still says Asha\" is true and misleading. A version number in the corner (`AtomicStampedReference`) catches it.",
            "**`LongAdder` is giving every team its own tally sheet** instead of one board everybody queues at, and adding the sheets up when someone asks for the total. The total is only as fresh as the moment you read each sheet.",
            "**False sharing is two teams with separate tallies written on the same small whiteboard.** They never touch each other's numbers, but only one person can hold the board at a time.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: people at a whiteboard see each other and back off politely. CPU cores don't; a losing thread retries immediately, so under heavy contention they keep invalidating each other's cache line and most of the work is wasted retries, which is what the measurements in this lesson show. And a whiteboard has no \"cache line\": the false-sharing cost is a property of how CPUs move memory in 64-byte blocks, not of the data itself.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/atomics-and-cas-striping.svg",
          alt: "Three panels and a strip. Left: a CAS retry loop: do, seen equals value, next equals f of seen, while not CAS of seen and next. On x86, CAS is lock cmpxchg and getAndAdd is lock xadd, which needs no retry. Measured: with 8 threads, f ran 2.4 to 4.1 times per successful update, so f must have no side effects. Middle: AtomicLong, one hot cache line: cpu0 to cpu7 all pointing at a single volatile long value; the line moves from core to core on every increment, so adding threads adds no speed; 1 thread 119 to 148 million increments per second, 8 threads 40 to 52 million. Right: LongAdder, a base field used until a CAS fails, then cells 0 to 7, each Cell annotated Contended so it sits on its own cache line; a thread picks cells at index probe and n minus 1, and n grows up to the number of CPUs; sum is base plus every cell, read one by one, so it is not a snapshot; 1 thread 75 to 99 million per second, 8 threads 365 to 569 million. Bottom: false sharing: an object with bytes 0 to 15 of header, asha's counter at offset 16 and ravi's at offset 24, all in one 64-byte line, took 0.8 to 2.4 seconds for 2 times 50 million volatile increments; with 56 bytes of padding or Contended's 128 bytes between them, 0.27 to 0.40 seconds. Contended outside java.base needs add-exports to compile and minus RestrictContended to run; without the flag it is silently ignored and the offsets stay 16 and 24.",
          caption: "Atomic classes make one variable correct; LongAdder and padding make many threads fast.",
        },
        {
          type: "heading",
          text: "The atomic classes",
        },
        {
          type: "table",
          headers: ["Class", "Holds", "Built on (JDK 21, javap -p)", "Typical use"],
          rows: [
            ["`AtomicInteger`, `AtomicLong`", "`private volatile int/long value`", "`jdk.internal.misc.Unsafe` at offset `VALUE`", "Counters, sequence numbers, state codes"],
            ["`AtomicBoolean`", "`private volatile int value` (0 or 1)", "`VarHandle VALUE`", "Once-only flags, started/stopped"],
            ["`AtomicReference<V>`", "`private volatile V value`", "`VarHandle VALUE`", "Swapping immutable snapshots"],
            ["`AtomicIntegerArray`, `AtomicLongArray`, `AtomicReferenceArray`", "A plain `final int[]` etc.", "Array-element `VarHandle AA`", "Per-slot atomic counters"],
            ["`AtomicIntegerFieldUpdater`, `...LongFieldUpdater`, `...ReferenceFieldUpdater`", "Nothing: operate on a `volatile` field of your object", "Reflection checks, then `Unsafe`", "Millions of objects with one atomic field each"],
            ["`AtomicStampedReference<V>`", "`volatile Pair<V> pair` (reference + int stamp)", "`VarHandle PAIR`; a new `Pair` per successful CAS", "ABA-safe references"],
            ["`LongAdder`, `LongAccumulator`", "`volatile long base` + `volatile Cell[] cells`", "`Striped64`, `@Contended` cells", "Hot counters and statistics"],
          ],
        },
        {
          type: "heading",
          text: "The operations",
        },
        {
          type: "table",
          headers: ["Method", "Returns", "Implemented as"],
          rows: [
            ["`get()`, `set(v)`", "Value / nothing", "Volatile read, volatile write"],
            ["`compareAndSet(expect, update)`", "`true` if it swapped", "One CAS"],
            ["`weakCompareAndSetVolatile(e, u)`", "May fail spuriously", "One CAS (may fail without a real conflict on LL/SC hardware such as older ARM)"],
            ["`compareAndExchange(e, u)` (Java 9)", "The witness value actually found", "One CAS"],
            ["`getAndIncrement()`, `incrementAndGet()`, `getAndAdd(d)`, `addAndGet(d)`", "Old or new value", "Atomic fetch-and-add (`lock xadd` on x86)"],
            ["`getAndSet(v)`", "Old value", "Atomic exchange (`xchg`)"],
            ["`updateAndGet(f)`, `getAndUpdate(f)`", "New / old value", "CAS loop calling `f` until it wins"],
            ["`accumulateAndGet(x, op)`, `getAndAccumulate(x, op)`", "New / old value", "CAS loop calling `op(current, x)`"],
            ["`lazySet(v)` / `setRelease(v)`", "Nothing", "Release store: ordered, but no full fence"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "An `AtomicInteger` is a `volatile int` and a handful of one-line methods. `javap -c` shows where the work goes:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.concurrent.atomic.AtomicInteger",
        },
        {
          type: "output",
          text: `public class java.util.concurrent.atomic.AtomicInteger extends java.lang.Number implements java.io.Serializable {
  private static final jdk.internal.misc.Unsafe U;
  private static final long VALUE;
  private volatile int value;
  ...
  public final boolean compareAndSet(int, int);
    Code:
       0: getstatic     #13                 // Field U:Ljdk/internal/misc/Unsafe;
       3: aload_0
       4: getstatic     #17                 // Field VALUE:J
       7: iload_1
       8: iload_2
       9: invokevirtual #31                 // Method jdk/internal/misc/Unsafe.compareAndSetInt:(Ljava/lang/Object;JII)Z
      12: ireturn

  public final int getAndIncrement();
    Code:
       0: getstatic     #13                 // Field U:Ljdk/internal/misc/Unsafe;
       3: aload_0
       4: getstatic     #17                 // Field VALUE:J
       7: iconst_1
       8: invokevirtual #38                 // Method jdk/internal/misc/Unsafe.getAndAddInt:(Ljava/lang/Object;JI)I
      11: ireturn`,
        },
        {
          type: "paragraph",
          text: "`VALUE` is the byte offset of the `value` field inside an `AtomicInteger` object, computed once in the static initialiser with `U.objectFieldOffset`. So `compareAndSet` is \"CAS the int at address `this + VALUE`\". `getAndIncrement` calls `getAndAddInt`. In `Unsafe`, those two look very different:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p --module java.base jdk.internal.misc.Unsafe",
        },
        {
          type: "output",
          text: `  public final native boolean compareAndSetLong(java.lang.Object, long, long, long);
  ...
  public final long getAndAddLong(java.lang.Object, long, long);
    Code:
       0: aload_0
       1: aload_1
       2: lload_2
       3: invokevirtual #509                // Method getLongVolatile:(Ljava/lang/Object;J)J
       6: lstore        6
       8: aload_0
       9: aload_1
      10: lload_2
      11: lload         6
      13: lload         6
      15: lload         4
      17: ladd
      18: invokevirtual #486                // Method weakCompareAndSetLong:(Ljava/lang/Object;JJJ)Z
      21: ifeq          0
      24: lload         6
      26: lreturn`,
        },
        {
          type: "list",
          items: [
            "**`compareAndSetLong` is `native`**: there is no Java implementation to fall back to. It's marked `@IntrinsicCandidate`, and every JIT replaces the call with the CPU's CAS instruction.",
            "**`getAndAddLong` is written in Java as a CAS loop**: read the value, try to swap in value + delta, and jump back to offset 0 if the CAS failed. That's the portable definition. On x86 the JIT doesn't use it: it replaces the whole method with a single atomic fetch-and-add.",
          ],
        },
        {
          type: "paragraph",
          text: "To see the JIT make those replacements, I compiled a loop of `incrementAndGet` and one of `compareAndSet` and asked HotSpot to print the intrinsics it used:",
        },
        {
          type: "code",
          language: "java",
          title: "CasIntrinsics.java",
          code: `import java.util.concurrent.atomic.AtomicLong;

public class CasIntrinsics {
    static final AtomicLong TRIPS = new AtomicLong();

    static long incrementLoop(int n) {
        long last = 0;
        for (int i = 0; i < n; i++) last = TRIPS.incrementAndGet();        // getAndAddLong
        return last;
    }

    static boolean casLoop(int n) {
        boolean ok = false;
        for (int i = 0; i < n; i++) {
            long seen = TRIPS.get();
            ok = TRIPS.compareAndSet(seen, seen + 1);                     // compareAndSetLong
        }
        return ok;
    }

    public static void main(String[] args) {
        for (int r = 0; r < 20; r++) { incrementLoop(100_000); casLoop(100_000); }
        System.out.println("trips " + TRIPS.get());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -XX:+UnlockDiagnosticVMOptions -XX:+PrintIntrinsics CasIntrinsics | grep -E 'getAndAddLong|compareAndSetLong|^trips'",
        },
        {
          type: "output",
          text: `                              @ 8   jdk.internal.misc.Unsafe::getAndAddLong (27 bytes)   (intrinsic)
                              @ 9   jdk.internal.misc.Unsafe::compareAndSetLong (0 bytes)   (intrinsic)
                                @ 8   jdk.internal.misc.Unsafe::getAndAddLong (27 bytes)   (intrinsic)
                                @ 9   jdk.internal.misc.Unsafe::compareAndSetLong (0 bytes)   (intrinsic)
                                @ 8   jdk.internal.misc.Unsafe::getAndAddLong (27 bytes)   (intrinsic)
                                @ 9   jdk.internal.misc.Unsafe::compareAndSetLong (0 bytes)   (intrinsic)
trips 4000000`,
        },
        {
          type: "list",
          items: [
            "**`(intrinsic)` means the call was replaced by hand-written machine code** in each compilation of the two methods (C1 and C2 both report it, hence the repeated lines). `getAndAddLong (27 bytes)` is the Java loop above, discarded; `compareAndSetLong (0 bytes)` has no bytecode at all, being native.",
            "**On x86-64 the instructions are `lock cmpxchg` for CAS and `lock xadd` for fetch-and-add**, from the `compareAndSwapL` and `xaddL` rules in HotSpot's `x86_64.ad` file. I don't have the `hsdis` disassembler plugin installed, so I couldn't print the generated assembly with `-XX:+PrintAssembly`; the intrinsic list above is the evidence I could collect. On ARMv8.1 and later the equivalents are `cas` and `ldadd`; older ARM cores use a load-linked/store-conditional loop (`ldxr`/`stxr`), which is where `weakCompareAndSet`'s permission to fail spuriously comes from.",
            "**`lock xadd` can't fail**, so `incrementAndGet` never retries on x86, however many threads hit it. A hand-written CAS loop can fail and retry; the measurements below show both.",
            "**What `lock` costs.** The `lock` prefix makes the instruction atomic by holding the cache line exclusively for its duration, and it's a full memory barrier: the core's store buffer must drain first. That is why an uncontended atomic increment (6.0 ns in the Performance section) costs as much as a `volatile` write (6.9 ns), whose barrier on x86 is also a `lock`-prefixed instruction. Under contention the real cost is moving the cache line between cores, which the volatile lesson's store-buffer picture explains.",
          ],
        },
        {
          type: "heading",
          text: "updateAndGet in bytecode",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.concurrent.atomic.AtomicInteger   # updateAndGet",
        },
        {
          type: "output",
          text: `  public final int updateAndGet(java.util.function.IntUnaryOperator);
    Code:
       0: aload_0
       1: invokevirtual #41                 // Method get:()I
       4: istore_2
       5: iconst_0
       6: istore_3
       7: iconst_0
       8: istore        4
      10: iload         4
      12: ifne          23
      15: aload_1
      16: iload_2
      17: invokeinterface #45,  2           // InterfaceMethod java/util/function/IntUnaryOperator.applyAsInt:(I)I
      22: istore_3
      23: aload_0
      24: iload_2
      25: iload_3
      26: invokevirtual #51                 // Method weakCompareAndSetVolatile:(II)Z
      29: ifeq          34
      32: iload_3
      33: ireturn
      34: iload_2
      35: aload_0
      36: invokevirtual #41                 // Method get:()I
      39: dup
      40: istore_2
      41: if_icmpne     48
      44: iconst_1
      45: goto          49
      48: iconst_0
      49: istore        4
      51: goto          10`,
        },
        {
          type: "paragraph",
          text: "Reading it as Java: `prev = get(); next = 0; haveNext = false; for (;;) { if (!haveNext) next = f.applyAsInt(prev); if (weakCompareAndSetVolatile(prev, next)) return next; haveNext = (prev == (prev = get())); }`. The function is called, a weak CAS tries to install the result, and on failure the value is read again. The `haveNext` detail avoids calling the function again when the weak CAS failed spuriously but the value didn't actually change. When another thread **did** change it, the function runs again on the new value. That second call is the cost and the danger the section on CAS loops measures.",
        },
        {
          type: "heading",
          text: "LongAdder's fields",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.atomic.Striped64
javap -v 'java.util.concurrent.atomic.Striped64$Cell' | grep -A2 RuntimeVisibleAnnotations`,
        },
        {
          type: "output",
          text: `abstract class java.util.concurrent.atomic.Striped64 extends java.lang.Number {
  static final int NCPU;
  volatile transient java.util.concurrent.atomic.Striped64$Cell[] cells;
  volatile transient long base;
  volatile transient int cellsBusy;
  private static final java.lang.invoke.VarHandle BASE;
  private static final java.lang.invoke.VarHandle CELLSBUSY;
  private static final java.lang.invoke.VarHandle THREAD_PROBE;
  ...
  final void longAccumulate(long, java.util.function.LongBinaryOperator, boolean, int);
  ...
RuntimeVisibleAnnotations:
  0: #80()
    jdk.internal.vm.annotation.Contended`,
        },
        {
          type: "paragraph",
          text: "`LongAdder` extends `Striped64`: a `base` counter, a lazily created array of `Cell`s (each one a `volatile long` in its own object), a `cellsBusy` spin lock used only while creating or resizing the array, and `THREAD_PROBE`, a handle to a per-thread hash stored in `Thread` itself (the same one `ThreadLocalRandom` uses). The `Cell` class carries `@Contended`, so the JVM pads each cell to keep it on its own cache line. The LongAdder section below reads these fields from a live adder.",
        },
      ],
    },
    {
      title: "Read-Modify-Write: Why Atomic Classes Exist",
      blocks: [
        {
          type: "paragraph",
          text: "Four threads each increment a counter a million times, five ways:",
        },
        {
          type: "code",
          language: "java",
          title: "LostUpdates.java",
          code: `import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class LostUpdates {
    static long plain;
    static volatile long vol;
    static final AtomicLong atomic = new AtomicLong();
    static final AtomicInteger getThenSet = new AtomicInteger();
    static final AtomicInteger casLoop = new AtomicInteger();

    static void run(Runnable perIncrement, int threads, int each) throws InterruptedException {
        Thread[] ts = new Thread[threads];
        for (int i = 0; i < threads; i++) {
            ts[i] = Thread.ofPlatform().start(() -> { for (int j = 0; j < each; j++) perIncrement.run(); });
        }
        for (Thread t : ts) t.join();
    }

    public static void main(String[] args) throws Exception {
        int threads = 4, each = 1_000_000, expected = threads * each;
        run(() -> plain++, threads, each);
        run(() -> vol++, threads, each);
        run(atomic::incrementAndGet, threads, each);
        run(() -> getThenSet.set(getThenSet.get() + 1), threads, each);     // two atomic steps, not one
        run(() -> {
            int seen;
            do { seen = casLoop.get(); } while (!casLoop.compareAndSet(seen, seen + 1));
        }, threads, each);
        System.out.printf("expected                 %,d%n", expected);
        System.out.printf("long++                   %,d%n", plain);
        System.out.printf("volatile long++          %,d%n", vol);
        System.out.printf("AtomicLong.increment     %,d%n", atomic.get());
        System.out.printf("AtomicInteger get+set    %,d%n", getThenSet.get());
        System.out.printf("AtomicInteger CAS loop   %,d%n", casLoop.get());
    }
}`,
        },
        {
          type: "output",
          text: `expected                 4,000,000
long++                   1,818,578
volatile long++          1,332,697
AtomicLong.increment     4,000,000
AtomicInteger get+set    1,673,068
AtomicInteger CAS loop   4,000,000`,
        },
        {
          type: "list",
          items: [
            "**`long++` lost more than half.** Over five runs, between 1.06 and 1.83 million of 4 million survived. It's a read, an add and a write; two threads that read the same value both write value + 1. (The JIT can also keep a plain field in a register for a whole loop and write it once at the end, which is how one thread's whole million can overwrite another's.)",
            "**`volatile` doesn't help** (1.23 to 1.44 million). The previous lesson explained why: `volatile` makes each read and each write visible, not the three of them indivisible.",
            "**`AtomicLong.incrementAndGet` was exact in every run**, because the read, add and write are one instruction.",
            "**`set(get() + 1)` on an `AtomicInteger` was as broken as `long++`** (1.02 to 1.67 million). Both calls are atomic, but the pair isn't: another thread can increment between the `get` and the `set`, and the `set` overwrites it. Using an atomic class doesn't make code atomic; using its single read-modify-write methods does. This is the bug behind the production section.",
            "**The hand-written CAS loop was exact**: when `compareAndSet(seen, seen + 1)` fails, someone changed the value after we read it, so we read again. That loop is what `updateAndGet` and the portable `getAndAdd` are.",
          ],
        },
      ],
    },
    {
      title: "CAS Loops and Side-Effect-Free Update Functions",
      blocks: [
        {
          type: "paragraph",
          text: "`updateAndGet(f)` and `accumulateAndGet(x, op)` are CAS loops around a function you pass in. The Javadoc says the function \"should be side-effect-free, since it may be re-applied when attempted updates fail due to contention among threads\". I measured how often that happens with a wallet credit whose function, wrongly, also sends an SMS, and counted the failures of the equivalent hand-written loop:",
        },
        {
          type: "code",
          language: "java",
          title: "RetryingUpdate.java",
          code: `import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

public class RetryingUpdate {
    static final AtomicLong walletPaise = new AtomicLong();
    static final LongAdder functionCalls = new LongAdder();
    static final LongAdder smsSent = new LongAdder();          // the side effect
    static final AtomicInteger casFailures = new AtomicInteger();

    // WRONG: the update function has a side effect, and may run more than once per update
    static long creditWithSms(long paise) {
        return walletPaise.updateAndGet(balance -> {
            functionCalls.increment();
            smsSent.increment();                                // "Rs credited" SMS
            return balance + paise;
        });
    }

    // RIGHT: pure function inside, side effect once, after the update succeeds
    static long creditThenSms(long paise) {
        long after = walletPaise.addAndGet(paise);
        smsSent.increment();
        return after;
    }

    // The loop that updateAndGet runs, written out with a failure counter
    static long creditCountingRetries(long paise) {
        long seen, next;
        do {
            seen = walletPaise.get();
            next = seen + paise;
            if (walletPaise.compareAndSet(seen, next)) return next;
            casFailures.incrementAndGet();
        } while (true);
    }

    static void run(int threads, int each, Runnable r) throws InterruptedException {
        Thread[] ts = new Thread[threads];
        for (int i = 0; i < threads; i++) ts[i] = Thread.ofPlatform().start(() -> { for (int j = 0; j < each; j++) r.run(); });
        for (Thread t : ts) t.join();
    }

    public static void main(String[] args) throws Exception {
        int each = 250_000;
        for (int threads : new int[] {1, 2, 4, 8}) {
            walletPaise.set(0); functionCalls.reset(); smsSent.reset(); casFailures.set(0);
            run(threads, each, () -> creditWithSms(100));
            long updates = (long) threads * each;
            long sms = smsSent.sum();
            run(threads, each, () -> creditCountingRetries(100));
            System.out.printf("%d threads: %,9d credits, function ran %,9d times, %,9d SMS (%.2f per credit); CAS loop failed %,9d times%n",
                    threads, updates, functionCalls.sum(), sms, sms / (double) updates, casFailures.get());
        }
        walletPaise.set(0); smsSent.reset();
        run(8, each, () -> creditThenSms(100));
        System.out.printf("fixed, 8 threads: balance %,d paise, %,d SMS%n", walletPaise.get(), smsSent.sum());
    }
}`,
        },
        {
          type: "output",
          text: `1 threads:   250,000 credits, function ran   250,000 times,   250,000 SMS (1.00 per credit); CAS loop failed         0 times
2 threads:   500,000 credits, function ran   834,166 times,   834,166 SMS (1.67 per credit); CAS loop failed   181,212 times
4 threads: 1,000,000 credits, function ran 2,927,057 times, 2,927,057 SMS (2.93 per credit); CAS loop failed   791,150 times
8 threads: 2,000,000 credits, function ran 8,206,813 times, 8,206,813 SMS (4.10 per credit); CAS loop failed 2,695,742 times
fixed, 8 threads: balance 200,000,000 paise, 2,000,000 SMS`,
        },
        {
          type: "list",
          items: [
            "**One thread, one call per update**, as everyone expects in testing.",
            "**With 8 threads, the function ran 4.10 times per successful credit** in this run, and between 2.42 and 4.10 over four runs. Customers would get two to four SMS per credit. With 2 threads it was already 1.07 to 1.67. The balance itself was always right, which is the point: the CAS guarantees the **value**, not how many times your code ran.",
            "**Side effects make the retries worse.** The bare CAS loop failed 2.7 million times for 2 million credits; the `updateAndGet` with an SMS counter inside ran its function more often than that loop's attempts. The work inside the function widens the window between reading the value and the CAS, so more other threads get in first.",
            "**The fix is structural:** keep the function pure and do the side effect once, after the update succeeded, using the returned value (`creditThenSms`). 2 million credits, 2 million SMS. Logging, metrics, I/O, allocation of resources, and changes to other variables all count as side effects.",
            "**Under heavy contention, retries are wasted CPU.** 2.7 million failed CAS attempts for 2 million successes is more than half the work thrown away. `addAndGet` (fetch-and-add, no retry on x86) or a `LongAdder` avoid it for sums; a CAS loop is for updates that can't be expressed as an add.",
          ],
        },
      ],
    },
    {
      title: "The ABA Problem and AtomicStampedReference",
      blocks: [
        {
          type: "paragraph",
          text: "CAS checks that the value is **equal** to what you saw, not that nothing happened. If a value changes from A to B and back to A between your read and your CAS, the CAS succeeds as if nothing happened. That's harmless for counters and dangerous for linked structures whose nodes are reused. I reproduced it on a Treiber stack (a lock-free stack where `top` is an `AtomicReference`) of idle drivers, using latches to force the bad interleaving every time; `main` plays the second thread:",
        },
        {
          type: "code",
          language: "java",
          title: "AbaDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicStampedReference;

public class AbaDemo {
    // A lock-free stack of idle drivers whose nodes are recycled (a pool, to avoid allocation)
    static final class Node {
        final String driver; Node next;
        Node(String driver) { this.driver = driver; }
    }

    static List<String> dump(Node top) {
        List<String> out = new ArrayList<>();
        for (Node n = top; n != null && out.size() < 10; n = n.next) out.add(n.driver);
        return out;
    }

    public static void main(String[] args) throws Exception {
        Node a = new Node("Asha"), b = new Node("Ravi"), c = new Node("Imran");
        a.next = b; b.next = c;

        // --- AtomicReference: compares references only ---
        AtomicReference<Node> top = new AtomicReference<>(a);
        CountDownLatch t1Read = new CountDownLatch(1), t2Done = new CountDownLatch(1);
        Thread t1 = Thread.ofPlatform().start(() -> {
            Node seen = top.get();                          // Asha
            Node next = seen.next;                          // Ravi
            t1Read.countDown();
            try { t2Done.await(); } catch (InterruptedException e) { }   // descheduled here
            boolean ok = top.compareAndSet(seen, next);     // top is Asha again, so this succeeds
            System.out.println("t1 pop(Asha) CAS succeeded: " + ok);
        });
        t1Read.await();
        // t2: pop Asha, pop Ravi (Ravi is assigned a trip), push Asha back (same node)
        Node x = top.get(); top.set(x.next);                // pop Asha
        Node y = top.get(); top.set(y.next);                // pop Ravi -> busy on a trip
        x.next = top.get(); top.set(x);                     // push Asha back: A -> B -> A
        System.out.println("t2 popped Asha and Ravi, pushed Asha back: " + dump(top.get()));
        t2Done.countDown();
        t1.join();
        System.out.println("AtomicReference stack now: " + dump(top.get()) + "   <- Ravi is back, though he is on a trip");

        // --- AtomicStampedReference: compares reference AND stamp ---
        a.next = b; b.next = c;
        AtomicStampedReference<Node> stamped = new AtomicStampedReference<>(a, 0);
        CountDownLatch s1Read = new CountDownLatch(1), s2Done = new CountDownLatch(1);
        Thread s1 = Thread.ofPlatform().start(() -> {
            int[] stampHolder = new int[1];
            Node seen = stamped.get(stampHolder);
            int stamp = stampHolder[0];
            Node next = seen.next;
            s1Read.countDown();
            try { s2Done.await(); } catch (InterruptedException e) { }
            boolean ok = stamped.compareAndSet(seen, next, stamp, stamp + 1);
            System.out.println("s1 pop(Asha) with stamp " + stamp + " succeeded: " + ok + " (stamp is now " + stamped.getStamp() + ")");
        });
        s1Read.await();
        int[] h = new int[1];
        Node p = stamped.get(h); stamped.compareAndSet(p, p.next, h[0], h[0] + 1);
        Node q = stamped.get(h); stamped.compareAndSet(q, q.next, h[0], h[0] + 1);
        p.next = stamped.getReference(); stamped.compareAndSet(stamped.getReference(), p, stamped.getStamp(), stamped.getStamp() + 1);
        s2Done.countDown();
        s1.join();
        System.out.println("AtomicStampedReference stack now: " + dump(stamped.getReference()));
    }
}`,
        },
        {
          type: "output",
          text: `t2 popped Asha and Ravi, pushed Asha back: [Asha, Imran]
t1 pop(Asha) CAS succeeded: true
AtomicReference stack now: [Ravi, Imran]   <- Ravi is back, though he is on a trip
s1 pop(Asha) with stamp 0 succeeded: false (stamp is now 3)
AtomicStampedReference stack now: [Asha, Imran]`,
        },
        {
          type: "list",
          items: [
            "**`t1` read `top = Asha` and `next = Ravi`**, then was delayed (the latch stands in for being descheduled).",
            "**Meanwhile the other thread popped Asha, popped Ravi (assigned to a trip), and pushed the same Asha node back.** The stack is now `[Asha, Imran]`, and `top` is again the very same object `t1` saw.",
            "**`t1`'s `compareAndSet(Asha, Ravi)` succeeded**, because `AtomicReference` compares references with `==`, and installed its stale `next`: Ravi, who is on a trip, is back at the top of the idle stack, and the stack's contents no longer match anything any thread did.",
            "**With `AtomicStampedReference`, the same interleaving failed**: each successful CAS incremented the stamp (0 to 3 after pop, pop, push), and `s1`'s CAS expected stamp 0. It must re-read and retry, finding the real top.",
            "**The cost of the fix:** `AtomicStampedReference` keeps a `volatile Pair` of reference and stamp and allocates a new `Pair` on every successful update (`javap -p` shows `casPair(Pair, Pair)`). `AtomicMarkableReference` is the same with a boolean.",
            "**When ABA can't happen:** in Java, a node can only come back if your code reuses it. Without node pools, a popped node's memory isn't reused while any thread still holds a reference to it (the GC guarantees that), so a garbage-collected lock-free stack that allocates a new node per push is ABA-safe. In C or C++, freed memory can be reused at the same address, which is why ABA is a much bigger topic there.",
          ],
        },
      ],
    },
    {
      title: "Atomic Arrays and Field Updaters",
      blocks: [
        {
          type: "paragraph",
          text: "An `AtomicInteger[]` is an array of references to separate objects. `AtomicIntegerArray` is one `int[]` whose elements are updated atomically. And when millions of objects each need one atomic field, a **field updater** works directly on a `volatile` field of your class, saving an object per instance:",
        },
        {
          type: "code",
          language: "java",
          title: "ArraysAndUpdaters.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.atomic.AtomicIntegerArray;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicLongFieldUpdater;

public class ArraysAndUpdaters {
    // One AtomicLong object per driver: 2 objects each
    static final class DriverBoxed {
        final long id; final AtomicLong tripsToday = new AtomicLong();
        DriverBoxed(long id) { this.id = id; }
    }

    // A volatile field plus one shared updater: 1 object each
    static final class DriverLean {
        static final AtomicLongFieldUpdater<DriverLean> TRIPS =
                AtomicLongFieldUpdater.newUpdater(DriverLean.class, "tripsToday");
        final long id; volatile long tripsToday;            // must be volatile, non-static, accessible
        DriverLean(long id) { this.id = id; }
    }

    static final com.sun.management.ThreadMXBean MX =
            (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();

    public static void main(String[] args) throws Exception {
        String[] zones = {"SALT-LAKE", "NEW-TOWN", "GARIA", "HOWRAH"};
        AtomicIntegerArray requestsByZone = new AtomicIntegerArray(zones.length);   // each slot is atomic
        Thread[] ts = new Thread[4];
        for (int i = 0; i < ts.length; i++) {
            ts[i] = Thread.ofPlatform().start(() -> {
                for (int j = 0; j < 100_000; j++) requestsByZone.incrementAndGet(j % zones.length);
            });
        }
        for (Thread t : ts) t.join();
        System.out.println("requests by zone " + requestsByZone);

        int n = 1_000_000;
        long before = MX.getCurrentThreadAllocatedBytes();
        DriverBoxed[] boxed = new DriverBoxed[n];
        for (int i = 0; i < n; i++) boxed[i] = new DriverBoxed(i);
        long boxedBytes = MX.getCurrentThreadAllocatedBytes() - before;

        before = MX.getCurrentThreadAllocatedBytes();
        DriverLean[] lean = new DriverLean[n];
        for (int i = 0; i < n; i++) lean[i] = new DriverLean(i);
        long leanBytes = MX.getCurrentThreadAllocatedBytes() - before;

        DriverLean.TRIPS.incrementAndGet(lean[7]);
        DriverLean.TRIPS.compareAndSet(lean[7], 1, 5);
        boxed[7].tripsToday.incrementAndGet();
        System.out.printf("1M drivers with AtomicLong field: %,d bytes (%d per driver)%n", boxedBytes, boxedBytes / n);
        System.out.printf("1M drivers with field updater:    %,d bytes (%d per driver)%n", leanBytes, leanBytes / n);
        System.out.println("lean[7].tripsToday = " + lean[7].tripsToday + ", boxed[7] = " + boxed[7].tripsToday);
        try {
            AtomicLongFieldUpdater.newUpdater(DriverBoxed.class, "id");
        } catch (IllegalArgumentException e) {
            System.out.println("updater on a non-volatile field: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `requests by zone [100000, 100000, 100000, 100000]
1M drivers with AtomicLong field: 52,003,328 bytes (52 per driver)
1M drivers with field updater:    36,005,064 bytes (36 per driver)
lean[7].tripsToday = 5, boxed[7] = 1
updater on a non-volatile field: Must be volatile type`,
        },
        {
          type: "list",
          items: [
            "**`AtomicIntegerArray` gave exact per-zone counts** under four threads. Each element is accessed through an array-element `VarHandle` (`AA` in `javap -p`). Elements that are updated by different threads at a high rate sit next to each other in memory, so they share cache lines; the false sharing section measures what that costs.",
            "**A field updater saved 16 bytes per driver**: 52 bytes per driver with an `AtomicLong` field (24 for the driver, 24 for the `AtomicLong`, 4 for the array slot) against 36 with a `volatile long` and one static `AtomicLongFieldUpdater` (32 + 4). Measured with `getCurrentThreadAllocatedBytes` while creating a million of each; the totals moved by a few hundred bytes between runs, the per-driver figures didn't. That's why the JDK itself uses updaters (and now `VarHandle`s) in classes like `ConcurrentLinkedQueue` and `CompletableFuture`, which have huge numbers of instances.",
            "**The updater checks the field when it's created**: it must be `volatile`, an instance field, and accessible from the calling class. A non-volatile field fails immediately with `IllegalArgumentException: Must be volatile type`. Each call also checks that the object is an instance of the right class, which makes updaters slightly slower than `AtomicLong`; a `VarHandle` is the modern alternative.",
          ],
        },
      ],
    },
    {
      title: "LongAdder and LongAccumulator: Striping",
      blocks: [
        {
          type: "paragraph",
          text: "An `AtomicLong` is one memory location. Every increment from every core needs that cache line in exclusive state, so the line is passed from core to core and the cores mostly wait for it. `LongAdder` spreads the count over several cells and adds them up only when asked. I measured both, plus `synchronized` and a summing `LongAccumulator`, with 1, 2, 4 and 8 threads incrementing for 300 ms:",
        },
        {
          type: "code",
          language: "java",
          title: "CounterBench.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAccumulator;
import java.util.concurrent.atomic.LongAdder;

public class CounterBench {
    interface Counter { void inc(); long total(); }

    static final class Sync implements Counter {
        private long n;
        public synchronized void inc() { n++; }
        public synchronized long total() { return n; }
    }
    static final class Atomic implements Counter {
        private final AtomicLong n = new AtomicLong();
        public void inc() { n.incrementAndGet(); }
        public long total() { return n.get(); }
    }
    static final class Adder implements Counter {
        private final LongAdder n = new LongAdder();
        public void inc() { n.increment(); }
        public long total() { return n.sum(); }
    }
    static final class Accumulator implements Counter {
        private final LongAccumulator n = new LongAccumulator(Long::sum, 0);
        public void inc() { n.accumulate(1); }
        public long total() { return n.get(); }
    }

    static volatile boolean stop;

    // millions of increments per second, all threads together
    static double run(Counter c, int threads) throws Exception {
        stop = false;
        long[] done = new long[threads * 16];                     // spaced out: no false sharing between threads
        CountDownLatch ready = new CountDownLatch(threads);
        Thread[] ts = new Thread[threads];
        for (int i = 0; i < threads; i++) {
            int slot = i * 16;
            ts[i] = Thread.ofPlatform().start(() -> {
                ready.countDown();
                long k = 0;
                while (!stop) { c.inc(); k++; }
                done[slot] = k;
            });
        }
        ready.await();
        long t = System.nanoTime();
        Thread.sleep(300);
        stop = true;
        for (Thread th : ts) th.join();
        double secs = (System.nanoTime() - t) / 1e9;
        long sum = 0; for (long d : done) sum += d;
        if (sum != c.total()) throw new AssertionError(sum + " != " + c.total());
        return sum / secs / 1e6;
    }

    public static void main(String[] args) throws Exception {
        String[] names = {"synchronized long", "AtomicLong", "LongAdder", "LongAccumulator(sum)"};
        int[] threadCounts = {1, 2, 4, 8};
        double[][] best = new double[names.length][threadCounts.length];
        for (int round = 0; round < 3; round++) {
            for (int t = 0; t < threadCounts.length; t++) {
                Counter[] cs = {new Sync(), new Atomic(), new Adder(), new Accumulator()};
                for (int i = 0; i < cs.length; i++) best[i][t] = Math.max(best[i][t], run(cs[i], threadCounts[t]));
            }
        }
        System.out.println("millions of increments per second (best of 3, all threads together)");
        System.out.printf("%-22s %8s %8s %8s %8s%n", "", "1 thr", "2 thr", "4 thr", "8 thr");
        for (int i = 0; i < names.length; i++) {
            System.out.printf("%-22s %8.0f %8.0f %8.0f %8.0f%n", names[i], best[i][0], best[i][1], best[i][2], best[i][3]);
        }
    }
}`,
        },
        {
          type: "output",
          text: `millions of increments per second (best of 3, all threads together)
                          1 thr    2 thr    4 thr    8 thr
synchronized long            54       47       18       16
AtomicLong                  148       52       48       52
LongAdder                    99      199      417      569
LongAccumulator(sum)        100      198      418      610`,
        },
        {
          type: "list",
          items: [
            "**`AtomicLong` lost about two thirds of its throughput going from 1 to 2 threads** (148 to 52 million per second) and stayed flat up to 8. With one thread the line sits in that core's L1 cache; with two, every `lock xadd` first has to fetch the line from the other core. Adding cores adds only more queueing for one line.",
            "**`LongAdder` scaled nearly linearly to 4 threads and reached 569 million at 8** (this laptop has 4 cores with 2 hardware threads each, so 8 threads isn't 8 cores). At 8 threads it did **11 times** the work of `AtomicLong`.",
            "**Uncontended, `LongAdder` costs more** (99 against 148 million with 1 thread): an extra check for the cells array and a `casBase` instead of `lock xadd`. For a counter that only one thread updates at a time, `AtomicLong` is better.",
            "**`synchronized` was the slowest in every column with contention** (16 to 47 million).",
            "Other runs, with other benchmarks on the machine: `AtomicLong` 119 to 148 (1 thread) and 36 to 60 (2 to 8 threads), `LongAdder` 75 to 99 (1 thread) and 365 to 569 (8 threads). The second complete run printed `AtomicLong 127, 39, 36, 40` and `LongAdder 75, 145, 255, 365`. Ratios held; absolute numbers didn't. Best of 3 per cell, not JMH.",
          ],
        },
        {
          type: "heading",
          text: "Inside a LongAdder",
        },
        {
          type: "code",
          language: "java",
          title: "AdderCells.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.atomic.LongAdder;

public class AdderCells {
    static Field CELLS, BASE;

    static String describe(LongAdder adder) throws Exception {
        Object[] cells = (Object[]) CELLS.get(adder);
        if (cells == null) return "base=" + BASE.getLong(adder) + ", cells=null";
        StringBuilder sb = new StringBuilder("base=" + BASE.getLong(adder) + ", cells[" + cells.length + "]=");
        for (Object c : cells) {
            if (c == null) { sb.append(" -"); continue; }
            Field v = c.getClass().getDeclaredField("value");
            v.setAccessible(true);
            sb.append(' ').append(v.getLong(c));
        }
        return sb.toString();
    }

    static void hammer(LongAdder adder, int threads, int each) throws InterruptedException {
        Thread[] ts = new Thread[threads];
        for (int i = 0; i < threads; i++) ts[i] = Thread.ofPlatform().start(() -> { for (int j = 0; j < each; j++) adder.increment(); });
        for (Thread t : ts) t.join();
    }

    public static void main(String[] args) throws Exception {
        Class<?> striped = Class.forName("java.util.concurrent.atomic.Striped64");
        CELLS = striped.getDeclaredField("cells"); CELLS.setAccessible(true);
        BASE = striped.getDeclaredField("base"); BASE.setAccessible(true);
        System.out.println("NCPU = " + Runtime.getRuntime().availableProcessors());

        LongAdder trips = new LongAdder();
        hammer(trips, 1, 1_000_000);
        System.out.println("1 thread : " + describe(trips) + "  sum=" + trips.sum());

        trips = new LongAdder();
        hammer(trips, 2, 1_000_000);
        System.out.println("2 threads: " + describe(trips) + "  sum=" + trips.sum());

        trips = new LongAdder();
        hammer(trips, 8, 1_000_000);
        System.out.println("8 threads: " + describe(trips) + "  sum=" + trips.sum());

        trips = new LongAdder();
        hammer(trips, 32, 100_000);
        System.out.println("32 threads: " + describe(trips) + "  sum=" + trips.sum());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent.atomic=ALL-UNNAMED AdderCells",
        },
        {
          type: "output",
          text: `NCPU = 8
1 thread : base=1000000, cells=null  sum=1000000
2 threads: base=22179, cells[2]= 977821 1000000  sum=2000000
8 threads: base=11542, cells[8]= 1314577 1027309 856786 972691 817195 1000000 999900 1000000  sum=8000000
32 threads: base=11705, cells[8]= 973588 400000 400000 416014 273800 300000 300000 124893  sum=3200000`,
        },
        {
          type: "list",
          items: [
            "**One thread never creates cells**: every increment was a successful `casBase`, and `cells` stayed `null`. A `LongAdder` that is never contended is an `AtomicLong` with a slightly longer path.",
            "**The first failed CAS on `base` creates a 2-cell array**, and threads move to cells (`base=22179` is what the two threads managed before that happened). Further collisions double the array until it reaches the number of CPUs: 8 cells for 8 and for 32 threads, never more.",
            "**A thread's cell is `cells[probe & (n - 1)]`**, where `probe` is the per-thread hash in `Thread`. When a thread's CAS on its cell fails, `longAccumulate` gives it a new probe (`advanceProbe`, an xorshift step), so colliding threads spread out. That's why the cells hold uneven counts: they record where threads happened to land, not one thread each.",
            "**`sum()` is `base` plus every cell**, read one after another with no lock, which leads to the next point.",
          ],
        },
        {
          type: "heading",
          text: "sum() is not a snapshot",
        },
        {
          type: "paragraph",
          text: "The Javadoc says `sum()` is not an atomic snapshot: increments that happen during the sum may or may not be counted. I wanted to see a value that could never have been the real count. One seat is passed between two threads: one increments, then the other decrements, so the true value is always 0 or 1. A third thread calls `sum()` constantly. A second experiment drains a request counter every iteration, the way a per-second rate metric does:",
        },
        {
          type: "code",
          language: "java",
          title: "AdderSnapshot.java",
          code: `import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.ToLongFunction;

public class AdderSnapshot {
    static volatile int turn;              // 0: the incrementing thread's turn, 1: the decrementing thread's
    static volatile boolean stop;

    static long windowedTotal(ToLongFunction<LongAdder> drain) throws InterruptedException {
        LongAdder requests = new LongAdder();
        Thread[] rs = new Thread[8];
        for (int i = 0; i < rs.length; i++) {
            rs[i] = Thread.ofPlatform().start(() -> { for (int j = 0; j < 2_000_000; j++) requests.increment(); });
        }
        long reported = 0;
        boolean running = true;
        while (running) {
            reported += drain.applyAsLong(requests);            // "requests in this window"
            running = false;
            for (Thread r : rs) running |= r.isAlive();
        }
        return reported + drain.applyAsLong(requests);
    }

    public static void main(String[] args) throws Exception {
        // 1. sum() is not a snapshot
        LongAdder seatsTaken = new LongAdder();
        Thread[] warm = new Thread[8];                          // contention first, so the adder has cells
        for (int i = 0; i < 8; i++) warm[i] = Thread.ofPlatform().start(() -> { for (int j = 0; j < 1_000_000; j++) seatsTaken.increment(); });
        for (Thread w : warm) w.join();
        seatsTaken.add(-seatsTaken.sum());                      // back to 0; the cells stay

        // One seat handed back and forth: +1 by one thread, then -1 by another. True value: 0 or 1.
        Thread inc = Thread.ofPlatform().start(() -> {
            ThreadLocalRandom.current();                        // initialises this thread's probe, so its own cell
            while (!stop) { while (turn != 0 && !stop) Thread.onSpinWait(); seatsTaken.increment(); turn = 1; }
        });
        Thread dec = Thread.ofPlatform().start(() -> {
            ThreadLocalRandom.current();
            while (!stop) { while (turn != 1 && !stop) Thread.onSpinWait(); seatsTaken.decrement(); turn = 0; }
        });
        long min = 0, max = 0, reads = 0, impossible = 0;
        long end = System.nanoTime() + 2_000_000_000L;
        while (System.nanoTime() < end) {
            long s = seatsTaken.sum();
            if (s < 0 || s > 1) impossible++;
            min = Math.min(min, s); max = Math.max(max, s); reads++;
        }
        stop = true; inc.join(); dec.join();
        System.out.printf("sum() x %,d: min %d, max %d, impossible values %,d%n", reads, min, max, impossible);

        // 2. draining a rate counter: sum() then reset() vs sumThenReset()
        long expected = 8L * 2_000_000;
        long twoCalls = windowedTotal(a -> { long n = a.sum(); a.reset(); return n; });
        long oneCall = windowedTotal(LongAdder::sumThenReset);
        System.out.printf("sum(); reset();  reported %,d of %,d (lost %,d)%n", twoCalls, expected, expected - twoCalls);
        System.out.printf("sumThenReset()   reported %,d of %,d (lost %,d)%n", oneCall, expected, expected - oneCall);
    }
}`,
        },
        {
          type: "output",
          text: `sum() x 35,739,503: min -625, max 1, impossible values 9,738
sum(); reset();  reported 12,103,055 of 16,000,000 (lost 3,896,945)
sumThenReset()   reported 16,000,000 of 16,000,000 (lost 0)`,
        },
        {
          type: "list",
          items: [
            "**`sum()` returned -625**, for a counter that only ever held 0 or 1, and 9,738 impossible values in 36 million reads. Over ten runs the minimum ranged from -47 to -2,056. The two threads use different cells; `sum()` read the incrementing thread's cell, was descheduled or delayed for a while, and then read the decrementing thread's cell after hundreds more round trips. It saw hundreds of decrements without their matching increments.",
            "**I had to make the threads use different cells to see it.** My first version showed nothing: a thread that has never used `ThreadLocalRandom` has probe 0, so both threads landed in cell 0 and every `sum()` was consistent. Calling `ThreadLocalRandom.current()` initialises the probe. In a real service, threads have long since been assigned probes.",
            "**Draining with `sum()` then `reset()` lost a quarter of the requests** (3.9 million of 16 million, and 2.6 to 5.9 million over five runs): increments that land between the two calls are counted by nobody.",
            "**`sumThenReset()` lost nothing.** On JDK 21 it uses an atomic `getAndSet(0)` on `base` and on each cell (`javap -c` shows `getAndSetBase` and `Cell.getAndSet`), so every increment is counted in exactly one window. Java 8 read each cell and then wrote 0 to it, so check the version before relying on it, and remember it's still not a snapshot across cells.",
            "**So:** `sum()` is right for monitoring and statistics, wrong for anything that needs an exact value at a moment (an ID generator, a balance, a limit check). Use `AtomicLong` for those.",
          ],
        },
        {
          type: "heading",
          text: "LongAccumulator",
        },
        {
          type: "paragraph",
          text: "`LongAccumulator(op, identity)` generalises `LongAdder` to any associative, commutative, side-effect-free operator: `new LongAccumulator(Long::sum, 0)` is a `LongAdder` (it measured the same), `new LongAccumulator(Math::max, Long.MIN_VALUE)` tracks a maximum, such as the longest rider wait time, from many threads without contention. Because cells are combined in an unspecified order, the operator must not care about order, and like `updateAndGet` it may be applied more than once per call. `DoubleAdder` and `DoubleAccumulator` exist too, with the caveat that floating-point addition isn't associative, so the sum can differ slightly from run to run.",
        },
      ],
    },
    {
      title: "VarHandle and Memory Access Modes",
      blocks: [
        {
          type: "paragraph",
          text: "`VarHandle` (Java 9) is the supported way to do what the atomic classes do on **any** field or array element, without a wrapper object and without `Unsafe`. Since Java 9 most of `java.util.concurrent` uses it internally (the `VALUE` and `AA` fields in the `javap` output above). It also exposes the memory-ordering modes that the atomic classes only partly offer:",
        },
        {
          type: "code",
          language: "java",
          title: "VarHandleDemo.java",
          code: `import java.lang.invoke.MethodHandles;
import java.lang.invoke.VarHandle;

public class VarHandleDemo {
    static final class Driver {
        volatile long earningsPaise;        // VarHandle works on any field; volatile so plain reads are safe too
        int status;                         // 0 = offline, 1 = online (accessed only through STATUS)
        Object payload;                     // published with release/acquire
        volatile boolean ready;
    }

    static final VarHandle EARNINGS, STATUS, PAYLOAD, ZONE_COUNTS;
    static {
        try {
            MethodHandles.Lookup l = MethodHandles.lookup();
            EARNINGS = l.findVarHandle(Driver.class, "earningsPaise", long.class);
            STATUS = l.findVarHandle(Driver.class, "status", int.class);
            PAYLOAD = l.findVarHandle(Driver.class, "payload", Object.class);
            ZONE_COUNTS = MethodHandles.arrayElementVarHandle(long[].class);
        } catch (ReflectiveOperationException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    public static void main(String[] args) throws Exception {
        Driver asha = new Driver();

        // atomic read-modify-write on a field, no AtomicLong object
        Thread[] ts = new Thread[4];
        for (int i = 0; i < ts.length; i++) {
            ts[i] = Thread.ofPlatform().start(() -> { for (int j = 0; j < 100_000; j++) EARNINGS.getAndAdd(asha, 145L); });
        }
        for (Thread t : ts) t.join();
        System.out.println("earnings " + asha.earningsPaise + " (expected " + 4L * 100_000 * 145 + ")");

        // compareAndSet on a plain int field: only one thread wins the offline -> online transition
        boolean first = STATUS.compareAndSet(asha, 0, 1);
        boolean second = STATUS.compareAndSet(asha, 0, 1);
        System.out.println("go online: " + first + ", again: " + second + ", status " + (int) STATUS.getVolatile(asha));

        // array elements
        long[] zoneCounts = new long[4];
        ZONE_COUNTS.getAndAdd(zoneCounts, 2, 10L);
        System.out.println("zone 2 count " + (long) ZONE_COUNTS.getAcquire(zoneCounts, 2));

        // the access modes, weakest to strongest
        PAYLOAD.set(asha, "plain");                         // plain: no ordering, may be reordered or cached
        PAYLOAD.setOpaque(asha, "opaque");                  // opaque: no tearing, eventually visible, no ordering
        PAYLOAD.setRelease(asha, "release");                // release: earlier writes cannot move below it
        PAYLOAD.setVolatile(asha, "volatile");              // volatile: total order, like a volatile field
        System.out.println("payload " + PAYLOAD.getAcquire(asha) + ", opaque read " + PAYLOAD.getOpaque(asha));

        // types are checked at the call site, at run time
        long before = (long) EARNINGS.getAndAdd(asha, 5);   // int 5 is adapted to long (like asType)
        System.out.println("getAndAdd(int 5) worked, before " + before + ", after " + asha.earningsPaise);
        try {
            long ignored = (long) EARNINGS.withInvokeExactBehavior().getAndAdd(asha, 5);   // exact: no adaptation
        } catch (java.lang.invoke.WrongMethodTypeException e) {
            System.out.println("exact getAndAdd(int 5): WrongMethodTypeException");
        }
        System.out.println(EARNINGS);
    }
}`,
        },
        {
          type: "output",
          text: `earnings 58000000 (expected 58000000)
go online: true, again: false, status 1
zone 2 count 10
payload volatile, opaque read volatile
getAndAdd(int 5) worked, before 58000000, after 58000005
exact getAndAdd(int 5): WrongMethodTypeException
VarHandle[varType=long, coord=[class VarHandleDemo$Driver]]`,
        },
        {
          type: "list",
          items: [
            "**`getAndAdd` on a field** gave the exact 58,000,000 under four threads, with no `AtomicLong` object: the field updater's memory saving without its reflection checks.",
            "**`compareAndSet` on a plain `int` field** works through the handle even though the field isn't `volatile`: the VarHandle access mode decides the ordering, not the field declaration. Mixing plain accesses of the same field elsewhere is then a data race, so in practice such fields are touched only through the handle.",
            "**Types are checked at the call site.** `VarHandle` methods are *signature-polymorphic*: `javac` compiles each call with the exact argument types written, and the JVM adapts them at run time if it can. `getAndAdd(asha, 5)` with an `int` worked because `int` widens to `long`. With `withInvokeExactBehavior()` (Java 16), the same call threw `WrongMethodTypeException`. A `(long)` cast on the result matters for the same reason: without it, the return type is taken as `Object`.",
            "**`toString()` describes the handle**: the variable type and the coordinates (here, the `Driver` instance).",
          ],
        },
        {
          type: "table",
          headers: ["Mode", "Methods", "Guarantees", "Typical use"],
          rows: [
            ["Plain", "`get`, `set`", "None beyond program order in one thread; may be cached in a register, reordered; `long`/`double` may tear on 32-bit JVMs", "Data protected by something else"],
            ["Opaque", "`getOpaque`, `setOpaque`", "No tearing; each variable is coherent and writes become visible eventually; no ordering with other variables", "Progress flags, statistics"],
            ["Acquire/release", "`getAcquire`, `setRelease` (= `lazySet`)", "Release: earlier reads/writes can't move after it. Acquire: later ones can't move before it. A release paired with an acquire publishes everything before it", "Publishing an object or message from one thread to another"],
            ["Volatile", "`getVolatile`, `setVolatile`, all CAS and `getAndAdd` methods", "Acquire/release plus a single total order of all volatile accesses (sequential consistency)", "The default; what a `volatile` field gives"],
          ],
        },
        {
          type: "paragraph",
          text: "On x86, plain, opaque and acquire loads and release stores all compile to ordinary `mov` instructions (x86 already keeps those orders); only a volatile store needs a `lock`-prefixed instruction or `mfence`, which is the 6.9 ns `volatile long++` in the Performance section. On ARM, acquire and release map to `ldar` and `stlr`. The weaker modes are for library authors who have proved they don't need more; for application code, volatile mode (and the atomic classes) are the right default.",
        },
        {
          type: "heading",
          text: "Unsafe, briefly",
        },
        {
          type: "paragraph",
          text: "Before `VarHandle`, CAS on a field was only possible through `sun.misc.Unsafe`, an internal class with raw memory access (`getLong(address)`, `allocateMemory`, `objectFieldOffset`, `compareAndSwapLong`) that bypasses every check the language makes. The JDK used it for `java.util.concurrent`, NIO and serialisation, and libraries copied it for speed: Netty, Disruptor, Hazelcast, Kryo, Cassandra. Java 9 moved the JDK to its own `jdk.internal.misc.Unsafe` (not exported) and kept `sun.misc.Unsafe` reachable through the `jdk.unsupported` module so libraries kept working; that's why `javac` still prints \"Unsafe is internal proprietary API and may be removed in a future release\" when the false-sharing program below uses it. `VarHandle` replaced its field and array access (Java 9) and the Foreign Function and Memory API its off-heap access (Java 22). Java 23 deprecated the memory-access methods for removal (JEP 471) and Java 24 prints a warning when they're first used (JEP 498). New code has no reason to touch it.",
        },
      ],
    },
    {
      title: "False Sharing and @Contended",
      blocks: [
        {
          type: "paragraph",
          text: "Caches move memory in 64-byte lines, and the coherence protocol tracks ownership per line, not per variable. Two threads that write two different fields in the same line fight over the line exactly as if they were writing the same field. I gave Asha's and Ravi's trip counters to two threads, 50 million `volatile` increments each, with three layouts. The program prints the field offsets (with `Unsafe.objectFieldOffset`) and where the object starts relative to a 64-byte boundary, and runs one layout per JVM:",
        },
        {
          type: "code",
          language: "java",
          title: "FalseSharing.java",
          code: `import java.lang.reflect.Field;
import jdk.internal.vm.annotation.Contended;

public class FalseSharing {
    static final class Unpadded {
        volatile long ashaTrips;
        volatile long raviTrips;                           // 8 bytes later: same 64-byte cache line
    }
    static final class Padded {
        volatile long ashaTrips;
        long p1, p2, p3, p4, p5, p6, p7;                   // 56 bytes of padding
        volatile long raviTrips;
    }
    static final class WithContended {
        @Contended volatile long ashaTrips;                // honoured outside the JDK only with -XX:-RestrictContended
        @Contended volatile long raviTrips;
    }

    static final sun.misc.Unsafe U;
    static {
        try {
            Field f = sun.misc.Unsafe.class.getDeclaredField("theUnsafe");
            f.setAccessible(true);
            U = (sun.misc.Unsafe) f.get(null);
        } catch (ReflectiveOperationException e) { throw new ExceptionInInitializerError(e); }
    }

    @SuppressWarnings("deprecation")
    static String layout(Object o) throws Exception {
        Class<?> c = o.getClass();
        long a = U.objectFieldOffset(c.getDeclaredField("ashaTrips"));
        long b = U.objectFieldOffset(c.getDeclaredField("raviTrips"));
        Object[] holder = {o};                             // compressed oop -> address (zero-based, shift 3)
        long address = (U.getInt(holder, (long) U.arrayBaseOffset(Object[].class)) & 0xFFFFFFFFL) << 3;
        return String.format("offsets %3d, %3d (%3d apart), object at 64*k+%d", a, b, b - a, address % 64);
    }

    interface Pair { void incA(); void incB(); }

    static long millis(Pair p, int n) throws InterruptedException {
        long best = Long.MAX_VALUE;
        for (int r = 0; r < 5; r++) {
            Thread a = Thread.ofPlatform().unstarted(() -> { for (int i = 0; i < n; i++) p.incA(); });
            Thread b = Thread.ofPlatform().unstarted(() -> { for (int i = 0; i < n; i++) p.incB(); });
            long t = System.nanoTime();
            a.start(); b.start(); a.join(); b.join();
            best = Math.min(best, (System.nanoTime() - t) / 1_000_000);
        }
        return best;
    }

    public static void main(String[] args) throws Exception {
        int n = 50_000_000;                                // volatile increments per thread
        // One layout per JVM: with all three in one run, the call sites in millis() see three
        // Pair classes, turn megamorphic, and whichever layout runs last looks slower.
        switch (args[0]) {
            case "unpadded" -> {
                Unpadded u = new Unpadded();
                System.out.printf("%-11s %s %5d ms%n", "unpadded", layout(u),
                        millis(new Pair() { public void incA() { u.ashaTrips++; } public void incB() { u.raviTrips++; } }, n));
            }
            case "padded" -> {
                Padded p = new Padded();
                System.out.printf("%-11s %s %5d ms%n", "manual pad", layout(p),
                        millis(new Pair() { public void incA() { p.ashaTrips++; } public void incB() { p.raviTrips++; } }, n));
            }
            default -> {
                WithContended c = new WithContended();
                System.out.printf("%-11s %s %5d ms%n", "@Contended", layout(c),
                        millis(new Pair() { public void incA() { c.ashaTrips++; } public void incB() { c.raviTrips++; } }, n));
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --add-exports java.base/jdk.internal.vm.annotation=ALL-UNNAMED FalseSharing.java
java FalseSharing unpadded
java FalseSharing padded
java FalseSharing contended
java -XX:-RestrictContended FalseSharing contended`,
        },
        {
          type: "output",
          text: `unpadded    offsets  16,  24 (  8 apart), object at 64*k+0  2051 ms
manual pad  offsets  16,  80 ( 64 apart), object at 64*k+0   270 ms
@Contended  offsets  16,  24 (  8 apart), object at 64*k+0  1887 ms
@Contended  offsets 144, 280 (136 apart), object at 64*k+0   272 ms`,
        },
        {
          type: "list",
          items: [
            "**Unpadded: 2,051 ms.** The two counters are 8 bytes apart in an object that starts at a line boundary, so both are in one line, and each increment by one thread invalidates the other core's copy.",
            "**Seven unused `long`s between them: 270 ms, 7.6 times faster** for the same work. Now they're 64 bytes apart, in different lines. HotSpot's field layout kept my declaration order here (all fields are `long`s), but it's free to reorder fields, which is why the offsets are worth printing rather than assuming.",
            "**`@Contended` without the flag did nothing**: offsets 16 and 24, and 1,887 ms. Outside the JDK's own classes, the annotation is ignored unless the JVM runs with `-XX:-RestrictContended`, and it compiles only with `--add-exports java.base/jdk.internal.vm.annotation=ALL-UNNAMED` (it's an internal annotation). There is no warning.",
            "**With `-XX:-RestrictContended`: 272 ms.** The JVM inserted 128 bytes of padding (`-XX:ContendedPaddingWidth`, default 128, to also defeat the adjacent-line prefetcher) before each annotated field: offsets 144 and 280, and the object grew to more than 400 bytes. That's the trade: memory for isolation, which is why the JDK uses it only for a few hot classes (`Striped64.Cell`, `Thread`'s random-number fields, `ForkJoinPool` work queues, `Exchanger`).",
            "**The unpadded time is unstable**: 0.8 to 2.4 seconds over a dozen runs, padded 0.27 to 0.40. This CPU has 4 cores with 2 hardware threads each; when the scheduler puts both threads on the two hardware threads of one core, they share an L1 cache and false sharing costs almost nothing. That's also a reason false sharing is hard to reproduce on a developer laptop and obvious on a server.",
            "**A benchmarking trap I hit first.** My first version measured all three layouts in one JVM, and whichever ran **last** was slowest, even `@Contended`. The `Pair` call sites inside `millis()` had seen three different classes by then and gone megamorphic, so the JIT stopped inlining `incA()`. One layout per JVM fixed it. JMH forks a JVM per benchmark for exactly this reason.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `requests.increment()` on a fresh `LongAdder` as contention arrives, from `Striped64` on JDK 21:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**First calls, one thread.** `increment()` is `add(1)`. `cells` is `null`, so `add` tries `casBase(b, b + 1)`: a CAS on `base`. It succeeds, and that's the whole call. This is the 1-thread `AdderCells` line: `cells=null`.",
            "**A second thread arrives.** Both CAS on `base`; one wins, the other's CAS fails because the value changed. `add` doesn't retry on `base`. It reads its probe (`getProbe()`, from `Thread`) and, since `cells` is still `null`, calls `longAccumulate(1, null, true, probe)`.",
            "**Initialise the probe if needed.** If the thread's probe is 0, `longAccumulate` calls `ThreadLocalRandom.current()` to give it a random non-zero probe.",
            "**Create the table.** `cells` is `null`, so the thread takes the `cellsBusy` spin lock with a CAS from 0 to 1, creates `new Cell[2]` with a `Cell` holding its increment at index `probe & 1`, publishes the array and releases `cellsBusy`. If another thread holds `cellsBusy`, it falls back to trying `casBase` again instead of waiting.",
            "**Normal contended path.** From now on `add` sees `cells != null` and goes straight to `cells[probe & (n - 1)]`, doing `c.cas(v, v + 1)` on that cell. Different threads usually hit different cells and their CASes succeed without interfering. Each `Cell` is padded by `@Contended`, so neighbouring cells don't false-share.",
            "**Collision.** If the cell CAS fails (another thread uses the same cell), `longAccumulate` retries once after `advanceProbe`, which moves this thread to a different index. If collisions continue and `n` is below `NCPU`, it takes `cellsBusy` and doubles the table (2, 4, 8), copying the existing cells.",
            "**Steady state.** With `n == NCPU` (8 here) the table stops growing; threads that still collide keep rehashing until they find a quiet cell. The `AdderCells` run with 32 threads ended with exactly 8 cells.",
            "**Reading.** `sum()` reads `base`, then each cell in index order, adding as it goes, without stopping writers. A cell read early can miss increments that a cell read later already includes, which is how the experiment got -625.",
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
          title: "AtomicsTour.java",
          code: `import java.lang.invoke.MethodHandles;
import java.lang.invoke.VarHandle;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicStampedReference;
import java.util.concurrent.atomic.LongAccumulator;
import java.util.concurrent.atomic.LongAdder;

public class AtomicsTour {
    static volatile long fareTotal;
    static final VarHandle FARE_TOTAL;
    static {
        try { FARE_TOTAL = MethodHandles.lookup().findStaticVarHandle(AtomicsTour.class, "fareTotal", long.class); }
        catch (ReflectiveOperationException e) { throw new ExceptionInInitializerError(e); }
    }

    public static void main(String[] args) {
        // 1. AtomicInteger: the read-modify-write family
        AtomicInteger seats = new AtomicInteger(4);
        System.out.println("1 " + seats.getAndIncrement() + " " + seats.incrementAndGet() + " "
                + seats.addAndGet(-2) + " " + seats.getAndSet(3) + " " + seats.get());

        // 2. compareAndSet: succeeds only if the value is still the expected one
        System.out.println("2 " + seats.compareAndSet(3, 2) + " " + seats.compareAndSet(3, 1) + " " + seats.get());

        // 3. functional updates: the function must be pure, it can run more than once
        System.out.println("3 " + seats.updateAndGet(s -> Math.max(0, s - 5)) + " "
                + seats.accumulateAndGet(10, Math::max));

        // 4. AtomicBoolean as a once-only switch
        AtomicBoolean welcomeSent = new AtomicBoolean();
        System.out.println("4 " + welcomeSent.compareAndSet(false, true) + " " + welcomeSent.compareAndSet(false, true));

        // 5. AtomicReference: swap an immutable snapshot
        AtomicReference<List<String>> zones = new AtomicReference<>(List.of("SALT-LAKE"));
        zones.updateAndGet(old -> { var copy = new java.util.ArrayList<>(old); copy.add("NEW-TOWN"); return List.copyOf(copy); });
        System.out.println("5 " + zones.get());

        // 6. AtomicStampedReference: value plus version
        AtomicStampedReference<String> driver = new AtomicStampedReference<>("Asha", 0);
        boolean ok = driver.compareAndSet("Asha", "Ravi", 0, 1);
        boolean stale = driver.compareAndSet("Ravi", "Asha", 0, 1);     // old stamp: refused
        System.out.println("6 " + ok + " " + stale + " " + driver.getReference() + "@" + driver.getStamp());

        // 7. LongAdder and LongAccumulator
        LongAdder requests = new LongAdder();
        requests.increment(); requests.add(41);
        LongAccumulator longestWaitMs = new LongAccumulator(Math::max, 0);
        longestWaitMs.accumulate(120); longestWaitMs.accumulate(45);
        System.out.println("7 " + requests.sum() + " " + longestWaitMs.get());

        // 8. VarHandle on a plain static field
        FARE_TOTAL.getAndAdd(14_500L);
        boolean cas = FARE_TOTAL.compareAndSet(14_500L, 29_000L);
        System.out.println("8 " + cas + " " + (long) FARE_TOTAL.getAcquire());
    }
}`,
        },
        {
          type: "output",
          text: `1 4 6 4 4 3
2 true false 2
3 0 10
4 true false
5 [SALT-LAKE, NEW-TOWN]
6 true false Ravi@1
7 42 120
8 true 29000`,
        },
        {
          type: "paragraph",
          text: "Line 1 reads left to right: `getAndIncrement` returned 4 (then 5), `incrementAndGet` 6, `addAndGet(-2)` 4, `getAndSet(3)` returned the old 4, and the value is 3. In line 3, `updateAndGet` clamped `2 - 5` to 0 and `accumulateAndGet(10, Math::max)` produced 10. In line 6 the second CAS was refused because it expected stamp 0 after the first had moved it to 1.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Swapping an immutable fare table with AtomicReference",
        },
        {
          type: "paragraph",
          text: "Fare quotes read base fares for two zones that must change together (New Town is always Rs 10 more than Salt Lake). Instead of a read-write lock, the whole table is an immutable record in an `AtomicReference`, and an admin thread publishes new versions:",
        },
        {
          type: "code",
          language: "java",
          title: "FareTableSwap.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

public class FareTableSwap {
    // Immutable snapshot: a version and an unmodifiable map
    record FareTable(int version, Map<String, Integer> basePaiseByZone) {
        FareTable {
            basePaiseByZone = Map.copyOf(basePaiseByZone);
        }
        FareTable with(String zone, int paise) {
            Map<String, Integer> copy = new HashMap<>(basePaiseByZone);
            copy.put(zone, paise);
            return new FareTable(version + 1, copy);
        }
    }

    static final AtomicReference<FareTable> CURRENT =
            new AtomicReference<>(new FareTable(1, Map.of("SALT-LAKE", 5_000, "NEW-TOWN", 6_000)));

    public static void main(String[] args) throws Exception {
        AtomicLong inconsistent = new AtomicLong(), reads = new AtomicLong();
        Thread[] readers = new Thread[4];
        for (int i = 0; i < readers.length; i++) {
            readers[i] = Thread.ofPlatform().start(() -> {
                for (int j = 0; j < 2_000_000; j++) {
                    FareTable t = CURRENT.get();                       // one volatile read, no lock
                    int a = t.basePaiseByZone().get("SALT-LAKE"), b = t.basePaiseByZone().get("NEW-TOWN");
                    if (b - a != 1_000) inconsistent.incrementAndGet(); // the two zones always move together
                    reads.incrementAndGet();
                }
            });
        }
        Thread admin = Thread.ofPlatform().start(() -> {
            for (int k = 1; k <= 1_000; k++) {
                int bump = k;
                CURRENT.updateAndGet(t -> t.with("SALT-LAKE", 5_000 + bump).with("NEW-TOWN", 6_000 + bump));
            }
        });
        admin.join();
        for (Thread r : readers) r.join();
        FareTable last = CURRENT.get();
        System.out.printf("%,d reads, %d inconsistent; final version %d, %s%n",
                reads.get(), inconsistent.get(), last.version(), new java.util.TreeMap<>(last.basePaiseByZone()));
    }
}`,
        },
        {
          type: "output",
          text: `8,000,000 reads, 0 inconsistent; final version 2001, {NEW-TOWN=7000, SALT-LAKE=6000}`,
        },
        {
          type: "list",
          items: [
            "**8 million reads, 1,000 updates, never an inconsistent pair.** A reader takes one reference with one volatile read and then works on an object that never changes, so it can't see Salt Lake updated and New Town not. That's the same guarantee a read lock gives, without any lock.",
            "**The version is 2,001**: each update called `with` twice, creating two versions; `updateAndGet` installed the result of both in one CAS. Only the admin thread writes, so its CAS never failed here; with several writers, `updateAndGet` would rebuild the table on retry, which is fine because building it has no side effects.",
            "**This is copy-on-write**: cheap reads, writes that copy the whole structure. It suits small, rarely changed configuration (fare tables, feature flags, routing rules). The CopyOnWriteArrayList lesson later in the track is the same idea as a collection.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Doing something exactly once with AtomicBoolean",
        },
        {
          type: "paragraph",
          text: "When a driver comes online, the ops dashboard should get one notification. Login, the first GPS ping and the app heartbeat can all arrive at once, on different threads:",
        },
        {
          type: "code",
          language: "java",
          title: "OnlineOnce.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class OnlineOnce {
    static final AtomicInteger notificationsSent = new AtomicInteger();

    static void notifyOps(String name) {                              // "Asha is online" to the ops dashboard
        long end = System.nanoTime() + 20_000;                        // ~20 us, standing in for a network call
        while (System.nanoTime() < end) Thread.onSpinWait();
        notificationsSent.incrementAndGet();
    }

    static final class Driver {
        final String name;
        private final AtomicBoolean online = new AtomicBoolean();
        private volatile boolean onlineChecked;                       // the check-then-act version
        Driver(String name) { this.name = name; }

        void goOnlineRacy() {                                         // check, act, then set
            if (!onlineChecked) {
                notifyOps(name);
                onlineChecked = true;
            }
        }
        void goOnline() {                                             // claim first, in one atomic step
            if (online.compareAndSet(false, true)) notifyOps(name);
        }
    }

    static int race(Runnable action) throws InterruptedException {
        notificationsSent.set(0);
        CountDownLatch go = new CountDownLatch(1);
        Thread[] ts = new Thread[8];                                  // app heartbeat, GPS ping, login... all at once
        for (int i = 0; i < ts.length; i++) ts[i] = Thread.ofPlatform().start(() -> {
            try { go.await(); } catch (InterruptedException e) { return; }
            action.run();
        });
        go.countDown();
        for (Thread t : ts) t.join();
        return notificationsSent.get();
    }

    public static void main(String[] args) throws Exception {
        int racyMax = 0, racyDuplicates = 0, casMax = 0;
        for (int trial = 0; trial < 500; trial++) {
            Driver a = new Driver("Asha");
            int n = race(a::goOnlineRacy);
            racyMax = Math.max(racyMax, n);
            if (n > 1) racyDuplicates++;
            Driver b = new Driver("Ravi");
            casMax = Math.max(casMax, race(b::goOnline));
        }
        System.out.println("volatile check-then-set: duplicate notifications in " + racyDuplicates + " of 500 trials, worst " + racyMax);
        System.out.println("AtomicBoolean.compareAndSet: worst " + casMax + " notification per driver");
    }
}`,
        },
        {
          type: "output",
          text: `volatile check-then-set: duplicate notifications in 493 of 500 trials, worst 6
AtomicBoolean.compareAndSet: worst 1 notification per driver`,
        },
        {
          type: "paragraph",
          text: "The `volatile` check-then-act version sent duplicates in 493 of 500 trials, up to 6 notifications for one driver, because all eight threads passed the check before any of them set the flag. Making the flag `volatile` makes the check see the latest value, not makes check-and-set one step. `compareAndSet(false, true)` is one step: exactly one thread gets `true`, and that thread does the work. In my first version of this example the \"notification\" was an instant counter increment and duplicates were rare (3 in 2,000 trials); with a realistic 20-microsecond call between check and set they became almost certain. Small windows hide races in tests.",
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
            ["Counter read often for exact values (IDs, sequence numbers, limits)", "`AtomicLong.incrementAndGet`", "`LongAdder` (no exact snapshot)"],
            ["Hot counter or statistic, many writer threads, read occasionally", "`LongAdder`; `LongAccumulator` for max/min", "`AtomicLong` (36 to 60 M/s here with 2 to 8 threads), `synchronized`"],
            ["Update depending on the current value", "`updateAndGet`/`accumulateAndGet` with a pure function, or a CAS loop", "`set(get() + ...)`"],
            ["Do something exactly once", "`AtomicBoolean.compareAndSet(false, true)`", "Check a `volatile` flag, then set it"],
            ["Publish a consistent group of values", "Immutable object in an `AtomicReference` (or a `volatile` field)", "Several separate atomics updated one by one"],
            ["Lock-free structure with reused nodes", "`AtomicStampedReference` / `AtomicMarkableReference`", "Plain `AtomicReference` CAS"],
            ["Millions of objects with one atomic field", "`VarHandle` or a field updater on a `volatile` field", "An `AtomicLong` per object (+16 bytes each)"],
            ["Per-slot counters in an array", "`AtomicLongArray`; pad or stripe if slots are hot", "`AtomicLong[]`"],
            ["Invariants across several variables, or blocking until a condition holds", "A lock (previous lesson)", "Juggling several atomics"],
            ["Per-key counters in a map", "`ConcurrentHashMap<K, LongAdder>` with `computeIfAbsent(...).increment()`, or `merge`", "`get`, then `put`, then increment"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Composing atomic calls and expecting atomicity",
        },
        {
          type: "paragraph",
          text: "`counter.set(counter.get() + 1)`, `if (map.get(k) == null) map.put(k, ...)`, `if (!flag.get()) { flag.set(true); ... }`: each call is atomic, the sequence isn't. In `LostUpdates`, `set(get() + 1)` kept 1.0 to 1.7 million of 4 million increments. Use the single read-modify-write method (`incrementAndGet`, `compareAndSet`, `computeIfAbsent`, `merge`).",
        },
        {
          type: "heading",
          text: "Side effects inside updateAndGet or accumulateAndGet",
        },
        {
          type: "paragraph",
          text: "The function can run several times per update: up to 4.1 times on average with 8 threads in my test. Logging, sending messages, incrementing other counters or allocating resources inside it repeats them. Keep it pure and act on the returned value.",
        },
        {
          type: "heading",
          text: "compareAndSet on boxed values",
        },
        {
          type: "code",
          language: "java",
          code: `AtomicReference<Integer> r = new AtomicReference<>(1000);
r.compareAndSet(1000, 2000);          // false: two different Integer objects for 1000
AtomicReference<Integer> s = new AtomicReference<>(100);
s.compareAndSet(100, 200);            // true: Integer.valueOf(100) is cached`,
        },
        {
          type: "paragraph",
          text: "`AtomicReference.compareAndSet` compares references with `==`, and autoboxing 1000 creates a new `Integer` each time (the Wrapper Classes lessons showed the -128 to 127 cache). It returned `false` with the value plainly 1000. For numbers, use `AtomicInteger`/`AtomicLong`; for references, compare against the exact object you read with `get()`.",
        },
        {
          type: "heading",
          text: "Using LongAdder.sum() as an exact value",
        },
        {
          type: "paragraph",
          text: "`sum()` returned -625 for a value that was always 0 or 1, and `sum()` followed by `reset()` lost a quarter of the increments. `LongAdder` is for statistics. Use `sumThenReset()` for windows (atomic per cell on JDK 21), and `AtomicLong` when the exact current value matters.",
        },
        {
          type: "heading",
          text: "Hand-rolling ABA-prone structures",
        },
        {
          type: "paragraph",
          text: "Node pools and recycled objects in lock-free code bring back ABA, which garbage collection otherwise prevents. Allocate new nodes, use `AtomicStampedReference`, or better, use the JDK's tested lock-free collections (`ConcurrentLinkedQueue`, `ConcurrentLinkedDeque`, covered later in the track).",
        },
        {
          type: "heading",
          text: "Assuming @Contended works because it compiles",
        },
        {
          type: "paragraph",
          text: "Without `-XX:-RestrictContended` the annotation is silently ignored for application classes: the offsets stayed 16 and 24 and the run took 1,887 ms. Print the offsets, or use manual padding (and print those offsets too, since field order isn't guaranteed).",
        },
        {
          type: "heading",
          text: "Spinning on CAS under heavy contention for an add",
        },
        {
          type: "paragraph",
          text: "A CAS loop that implements an addition wastes most of its attempts when many threads contend (2.7 million failures for 2 million successes with 8 threads). For sums, `addAndGet` (a single `lock xadd`) or `LongAdder` don't retry.",
        },
        {
          type: "heading",
          text: "Replacing every lock with atomics",
        },
        {
          type: "paragraph",
          text: "Atomics make **one** variable consistent. An invariant across several variables (a seat count and a passenger list, a balance and a ledger entry) needs either one immutable object swapped atomically or a lock. Two `AtomicInteger`s updated one after the other can be observed half-updated.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Prefer the single-call operations: `incrementAndGet`, `addAndGet`, `getAndSet`, `compareAndSet`, `accumulateAndGet`; never `set(get() ...)`.",
            "Keep functions passed to `updateAndGet`/`accumulateAndGet` and to `LongAccumulator` pure; do side effects after the update, with the returned value.",
            "Use `LongAdder` for counters with many writers and occasional reads (metrics, rates, per-key counts), `AtomicLong` for exact values and single-writer counters.",
            "Publish groups of related values as an immutable object in an `AtomicReference` or `volatile` field.",
            "Use `AtomicBoolean.compareAndSet(false, true)` for once-only actions, and let the winner do the work.",
            "For many instances with an atomic field, use a `VarHandle` (or a field updater) on a `volatile` field instead of an atomic object per instance.",
            "Stick to volatile-mode operations unless you can explain, for your specific publication pattern, why acquire/release or opaque is enough.",
            "Watch for false sharing in per-thread counters and arrays of hot slots; verify layouts by printing offsets, and measure on server hardware.",
            "Don't use `sun.misc.Unsafe` in new code; `VarHandle` and the Foreign Memory API replace it.",
            "When the logic spans several variables, use a lock; lock-free code is only simpler when the state fits in one CAS.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Uncontended costs, one thread, 50 million increments, best of seven:",
        },
        {
          type: "code",
          language: "java",
          title: "CasCost.java",
          code: `import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.IntToLongFunction;

public class CasCost {
    static long plain;
    static volatile long vol;
    static final AtomicLong ATOMIC = new AtomicLong();
    static final LongAdder ADDER = new LongAdder();
    static final Object MON = new Object();

    static void bench(String label, IntToLongFunction body) {
        int n = 50_000_000;
        double best = Double.MAX_VALUE;
        long sink = 0;
        for (int r = 0; r < 7; r++) {
            long t = System.nanoTime();
            sink += body.applyAsLong(n);
            best = Math.min(best, (System.nanoTime() - t) / (double) n);
        }
        System.out.printf("%-34s %5.2f ns per increment%s%n", label, best, sink == 42 ? "!" : "");
    }

    public static void main(String[] args) {
        bench("long++ (plain)", n -> { for (int i = 0; i < n; i++) plain++; return plain; });
        bench("volatile long++ (not atomic)", n -> { for (int i = 0; i < n; i++) vol++; return vol; });
        bench("AtomicLong.incrementAndGet", n -> { for (int i = 0; i < n; i++) ATOMIC.incrementAndGet(); return ATOMIC.get(); });
        bench("AtomicLong CAS loop", n -> {
            for (int i = 0; i < n; i++) { long v; do { v = ATOMIC.get(); } while (!ATOMIC.compareAndSet(v, v + 1)); }
            return ATOMIC.get();
        });
        bench("LongAdder.increment", n -> { for (int i = 0; i < n; i++) ADDER.increment(); return ADDER.sum(); });
        bench("synchronized long++", n -> { for (int i = 0; i < n; i++) synchronized (MON) { plain++; } return plain; });
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java CasCost
java -XX:-EliminateLocks CasCost | tail -1`,
        },
        {
          type: "output",
          text: `long++ (plain)                      0.06 ns per increment
volatile long++ (not atomic)        6.87 ns per increment
AtomicLong.incrementAndGet          6.02 ns per increment
AtomicLong CAS loop                10.20 ns per increment
LongAdder.increment                 8.43 ns per increment
synchronized long++                 4.47 ns per increment
synchronized long++                19.00 ns per increment`,
        },
        {
          type: "list",
          items: [
            "**A plain `long++` is free** (0.06 ns): the JIT keeps it in a register and adds 50 million in a few instructions, which is also why it's useless across threads.",
            "**A `volatile` increment and an atomic increment cost the same, about 6 to 7 ns.** Both end in a `lock`-prefixed instruction (the volatile store's barrier, or `lock xadd`), which waits for the store buffer to drain. The atomic one is correct; the volatile one isn't. There's no performance reason to pick `volatile` for a counter.",
            "**A hand-written CAS loop costs more than `incrementAndGet` (10.2 vs 6.0 ns)** even uncontended: a load, a compare-and-swap and a branch, against one `lock xadd`.",
            "**`LongAdder` uncontended: 8.4 ns**, between the two. Its extra checks are the price of scaling under contention, where `CounterBench` showed it 11 times faster than `AtomicLong` at 8 threads.",
            "**`synchronized` at 4.5 ns is the JIT coarsening the lock across loop iterations again**, as in the previous lesson; with `-XX:-EliminateLocks` it's 19.0 ns, three times the atomic increment.",
            "Contended costs are in `CounterBench` and `FalseSharing` above: an `AtomicLong` stays at 36 to 60 million increments per second total from 2 to 8 threads, `LongAdder` reaches 365 to 569 million, and false sharing made independent counters 3 to 9 times slower. Single-machine `System.nanoTime` numbers with other benchmarks running, not JMH; the ratios were stable across runs, the absolute values weren't.",
          ],
        },
      ],
    },
    {
      title: "Atomics in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing dispatch service counts ride requests per driver, used by a fairness rule that spreads requests across drivers and by an hourly payout bonus. The first version stored an `AtomicLong` per driver in a `ConcurrentHashMap` and a global `AtomicLong` for the total. Two symptoms came up in the same quarter. Finance found that drivers' request counts summed to less than the total, by a few percent in busy hours, and drivers complained about missed bonuses. Separately, a profiler run during a surge showed request threads spending a surprising share of time in `AtomicLong.incrementAndGet`. I rebuilt the counter with the original code and three fixes, 8 threads recording 2 million requests each, first spread over 200 drivers and then concentrated on 8 (a surge at an airport queue, where a few drivers get most requests):",
        },
        {
          type: "code",
          language: "java",
          title: "DriverRequestCounter.java",
          code: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

public class DriverRequestCounter {
    interface Counter { void record(long driverId); long total(); long perDriverSum(); int drivers(); }

    // What shipped
    static final class Buggy implements Counter {
        final Map<Long, AtomicLong> perDriver = new ConcurrentHashMap<>();
        final AtomicLong total = new AtomicLong();
        public void record(long driverId) {
            AtomicLong c = perDriver.get(driverId);
            if (c == null) {                                   // check-then-act: two threads can both create one
                c = new AtomicLong();
                perDriver.put(driverId, c);                    // ...and the second put replaces the first
            }
            c.set(c.get() + 1);                                // read, add, write: three steps, not one
            total.incrementAndGet();                           // every request on every core hits one cache line
        }
        public long total() { return total.get(); }
        public long perDriverSum() { return perDriver.values().stream().mapToLong(AtomicLong::get).sum(); }
        public int drivers() { return perDriver.size(); }
    }

    // Correct, still one AtomicLong for the total
    static final class AtomicFixed implements Counter {
        final Map<Long, AtomicLong> perDriver = new ConcurrentHashMap<>();
        final AtomicLong total = new AtomicLong();
        public void record(long driverId) {
            perDriver.computeIfAbsent(driverId, id -> new AtomicLong()).incrementAndGet();
            total.incrementAndGet();
        }
        public long total() { return total.get(); }
        public long perDriverSum() { return perDriver.values().stream().mapToLong(AtomicLong::get).sum(); }
        public int drivers() { return perDriver.size(); }
    }

    // The fix: LongAdder for every write-mostly counter
    static final class AdderFixed implements Counter {
        final Map<Long, LongAdder> perDriver = new ConcurrentHashMap<>();
        final LongAdder total = new LongAdder();
        public void record(long driverId) {
            perDriver.computeIfAbsent(driverId, id -> new LongAdder()).increment();
            total.increment();
        }
        public long total() { return total.sum(); }
        public long perDriverSum() { return perDriver.values().stream().mapToLong(LongAdder::sum).sum(); }
        public int drivers() { return perDriver.size(); }
    }

    // Also correct: boxed Long values updated with merge (allocates a Long per update above 127)
    static final class MergeFixed implements Counter {
        final ConcurrentHashMap<Long, Long> perDriver = new ConcurrentHashMap<>();
        final LongAdder total = new LongAdder();
        public void record(long driverId) {
            perDriver.merge(driverId, 1L, Long::sum);
            total.increment();
        }
        public long total() { return total.sum(); }
        public long perDriverSum() { return perDriver.values().stream().mapToLong(Long::longValue).sum(); }
        public int drivers() { return perDriver.size(); }
    }

    static int busyDrivers;

    static void run(String label, Counter c, int threads, int each) throws Exception {
        Thread[] ts = new Thread[threads];
        long t = System.nanoTime();
        for (int i = 0; i < threads; i++) {
            ts[i] = Thread.ofPlatform().start(() -> {
                ThreadLocalRandom rnd = ThreadLocalRandom.current();
                for (int j = 0; j < each; j++) c.record(104_000 + rnd.nextInt(busyDrivers));
            });
        }
        for (Thread th : ts) th.join();
        long ms = (System.nanoTime() - t) / 1_000_000;
        long expected = (long) threads * each;
        System.out.printf("%-12s %5d ms  total %,11d  per-driver sum %,11d  drivers %d  (expected %,d)%n",
                label, ms, c.total(), c.perDriverSum(), c.drivers(), expected);
    }

    public static void main(String[] args) throws Exception {
        int threads = 8, each = 2_000_000;
        busyDrivers = Integer.parseInt(args[0]);
        for (int round = 0; round < 2; round++) {                 // the first round includes JIT warm-up
            System.out.println("round " + (round + 1) + ", " + busyDrivers + " busy drivers, " + threads + " threads");
            run("buggy", new Buggy(), threads, each);
            run("AtomicLong", new AtomicFixed(), threads, each);
            run("LongAdder", new AdderFixed(), threads, each);
            run("merge", new MergeFixed(), threads, each);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java DriverRequestCounter 200
java DriverRequestCounter 8`,
        },
        {
          type: "output",
          text: `round 1, 200 busy drivers, 8 threads
buggy          408 ms  total  16,000,000  per-driver sum  15,959,157  drivers 200  (expected 16,000,000)
AtomicLong     472 ms  total  16,000,000  per-driver sum  16,000,000  drivers 200  (expected 16,000,000)
LongAdder      289 ms  total  16,000,000  per-driver sum  16,000,000  drivers 200  (expected 16,000,000)
merge          289 ms  total  16,000,000  per-driver sum  16,000,000  drivers 200  (expected 16,000,000)
round 2, 200 busy drivers, 8 threads
buggy          376 ms  total  16,000,000  per-driver sum  15,957,508  drivers 200  (expected 16,000,000)
AtomicLong     496 ms  total  16,000,000  per-driver sum  16,000,000  drivers 200  (expected 16,000,000)
LongAdder      233 ms  total  16,000,000  per-driver sum  16,000,000  drivers 200  (expected 16,000,000)
merge          325 ms  total  16,000,000  per-driver sum  16,000,000  drivers 200  (expected 16,000,000)

round 1, 8 busy drivers, 8 threads
buggy          396 ms  total  16,000,000  per-driver sum  14,808,109  drivers 8  (expected 16,000,000)
AtomicLong     376 ms  total  16,000,000  per-driver sum  16,000,000  drivers 8  (expected 16,000,000)
LongAdder      114 ms  total  16,000,000  per-driver sum  16,000,000  drivers 8  (expected 16,000,000)
merge          554 ms  total  16,000,000  per-driver sum  16,000,000  drivers 8  (expected 16,000,000)
round 2, 8 busy drivers, 8 threads
buggy          430 ms  total  16,000,000  per-driver sum  14,711,819  drivers 8  (expected 16,000,000)
AtomicLong     506 ms  total  16,000,000  per-driver sum  16,000,000  drivers 8  (expected 16,000,000)
LongAdder      109 ms  total  16,000,000  per-driver sum  16,000,000  drivers 8  (expected 16,000,000)
merge          604 ms  total  16,000,000  per-driver sum  16,000,000  drivers 8  (expected 16,000,000)`,
        },
        {
          type: "list",
          items: [
            "**The total was always right, the per-driver counts never were.** The global `incrementAndGet` is atomic; `c.set(c.get() + 1)` isn't. With 200 drivers about 41,000 of 16 million counts were lost (0.26%); with 8 busy drivers, where the same driver is hit by several threads at once, 1.2 to 1.3 million (7.4% to 8.1%). That's the finance discrepancy, and why it grew in busy hours.",
            "**A second, rarer loss hides in `get`, then `put`.** Two threads that see no counter for a new driver both create one, and the second `put` replaces the first, discarding its counts. It's the same check-then-act pattern, at map level. `computeIfAbsent` creates the value at most once per key, atomically.",
            "**The `AtomicLong` fix was correct and no faster** (376 to 506 ms for 8 drivers). Every request still incremented the global `AtomicLong` and one of 8 hot per-driver `AtomicLong`s, all on contended cache lines.",
            "**The `LongAdder` fix was 3.3 to 4.6 times faster than the `AtomicLong` fix with 8 hot drivers** (109 to 114 ms) and about twice as fast with 200 drivers (233 to 289 against 472 to 496 ms), and exact. Both the total and the per-driver counters spread across cells.",
            "**`merge` with boxed `Long` values was correct and the slowest with hot keys** (554 to 604 ms): `ConcurrentHashMap.merge` locks the bin for each update, and every count above 127 allocates a new `Long`. It's fine for low rates and saves a class; for hot counters, `LongAdder` values are better. Its 200-driver result (289 to 325 ms) shows how much the answer depends on how concentrated the keys are.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took away from it:",
        },
        {
          type: "list",
          items: [
            "Calling methods of an atomic class doesn't make the code atomic. Code review should flag `x.set(x.get() ...)`, and map code that does `get`, then `put`.",
            "Lost updates scale with contention on the same key, so they hide in tests and quiet hours and appear in surges. A reconciliation check (sum of per-key counts against the total) caught this one; it's a cheap invariant to monitor.",
            "For write-heavy counters, `ConcurrentHashMap<K, LongAdder>` with `computeIfAbsent(k, x -> new LongAdder()).increment()` is the standard pattern, and the JDK documentation suggests it. Reading the values for a payout should happen after traffic for that window has stopped, since `sum()` isn't a snapshot.",
            "The scaling problem of a single hot `AtomicLong` doesn't show with one or two threads; measure with the real thread count and the real key distribution.",
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
              question: "What is compare-and-swap (CAS)?",
              answer:
                "An atomic CPU instruction that takes a memory location, an expected value and a new value, and writes the new value only if the location still holds the expected one, reporting whether it did. In Java it's `compareAndSet(expect, update)` on the atomic classes and `VarHandle`. On x86 it's `lock cmpxchg`. Lock-free algorithms read a value, compute a new one, and CAS it in, retrying if another thread changed it in between.",
            },
            {
              question: "Why isn't count++ thread-safe, even on a volatile field?",
              answer:
                "`count++` is three operations: read, add, write. Two threads can read the same value and both write value + 1, losing one increment. `volatile` makes each read and write visible but doesn't make the three indivisible. In my test, 4 threads doing a million increments each ended with 1.2 to 1.4 million on a `volatile long` and exactly 4 million with `AtomicLong.incrementAndGet()`.",
            },
            {
              question: "What's the difference between getAndIncrement and incrementAndGet?",
              answer:
                "Both atomically add 1. `getAndIncrement()` returns the value before the increment, `incrementAndGet()` the value after, like `i++` and `++i`. On an `AtomicInteger` holding 4, `getAndIncrement()` returns 4 and leaves 5, and a following `incrementAndGet()` returns 6. Both compile to `Unsafe.getAndAddInt`, a single `lock xadd` on x86.",
            },
            {
              question: "When would you use AtomicBoolean?",
              answer:
                "For a flag that several threads may try to change, especially \"do this exactly once\": `if (started.compareAndSet(false, true)) start();` guarantees one winner. A `volatile boolean` with `if (!flag) { flag = true; ... }` doesn't: in my test it sent duplicate notifications in 493 of 500 trials. For a flag only one thread writes (like a stop signal), `volatile boolean` is enough.",
            },
            {
              question: "What is LongAdder and when should you use it instead of AtomicLong?",
              answer:
                "A counter that spreads updates over a base value and an array of cells, one per contending thread group, and sums them on read. Use it when many threads update and reads are occasional: metrics, request counts, rates. With 8 threads it did 569 million increments per second against `AtomicLong`'s 52 million in my test. Use `AtomicLong` when you need the exact current value (IDs, limits), since `sum()` isn't a snapshot, or when there's little contention, where `AtomicLong` is faster.",
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
              question: "Why must the function passed to updateAndGet be side-effect-free?",
              answer:
                "Because `updateAndGet` is a CAS loop: it calls the function on the current value and tries to CAS the result in; if another thread changed the value, it calls the function again on the new one. Under contention the function runs several times per update: 4.1 times on average with 8 threads in my test, so an SMS sent inside it went out four times per credit while the balance was correct. Keep the function pure and do side effects after the call with the returned value.",
            },
            {
              question: "What is the ABA problem and how do you solve it?",
              answer:
                "A CAS checks that a value equals what you read, not that it never changed. If it goes from A to B and back to A, a CAS expecting A succeeds on stale assumptions. I reproduced it on a lock-free stack with reused nodes: a delayed pop installed a stale `next` and put back a driver who had been removed. Solutions: `AtomicStampedReference` (reference plus a version stamp, which made the same CAS fail), `AtomicMarkableReference`, or not reusing nodes, since in Java the GC won't recycle an object while anyone still references it.",
            },
            {
              question: "Is AtomicInteger.set(atomicInteger.get() + 1) thread-safe?",
              answer:
                "No. Each call is atomic, but another thread can update between the `get` and the `set`, and the `set` overwrites it. In my test it kept between 1.0 and 1.7 million of 4 million increments, no better than a plain `int`. Use `incrementAndGet()`, or a CAS loop or `updateAndGet` for other updates.",
            },
            {
              question: "How does LongAdder work internally?",
              answer:
                "It extends `Striped64`: a `volatile long base`, a lazily created `Cell[] cells` and a `cellsBusy` spin lock. An increment first CASes `base`; once a CAS on `base` fails, the thread uses `cells[probe & (n-1)]`, where `probe` is a per-thread hash. The array starts at 2 cells and doubles on collisions up to the number of CPUs (I saw 8 cells on 8 CPUs, even with 32 threads); a thread whose cell CAS fails gets a new probe. `Cell` is `@Contended`, so cells don't false-share. `sum()` adds `base` and all cells without locking.",
            },
            {
              question: "What's the difference between AtomicLong and AtomicLongFieldUpdater?",
              answer:
                "`AtomicLong` is an object holding a `volatile long`. A field updater is one shared object that performs atomic operations on a `volatile long` field of other objects, so you don't need an extra object per instance. For a million drivers I measured 52 bytes each with an `AtomicLong` field and 36 with a field updater. The updater requires a `volatile` instance field accessible to the caller (otherwise `IllegalArgumentException: Must be volatile type`) and checks the target's class on every call. `VarHandle` is the modern alternative.",
            },
            {
              question: "What does weakCompareAndSet mean?",
              answer:
                "A CAS that may fail spuriously, even when the current value equals the expected one. It exists because on load-linked/store-conditional hardware (older ARM, POWER) a CAS is a loop, and a weak CAS can skip that inner loop when it's going to retry anyway. On x86 it's the same `lock cmpxchg` as the strong version. Use it only inside retry loops; `AtomicInteger.updateAndGet` does, and rechecks the value to avoid re-running the function after a spurious failure.",
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
              question: "What machine instructions implement Java's atomic operations on x86, and what do they cost?",
              answer:
                "CAS (`compareAndSet`) is `lock cmpxchg`, fetch-and-add (`getAndAdd`, `incrementAndGet`) is `lock xadd`, exchange (`getAndSet`) is `xchg`. They replace `Unsafe` methods as intrinsics, which `-XX:+PrintIntrinsics` confirmed for `getAndAddLong` and `compareAndSetLong`. The `lock` prefix holds the cache line exclusively and acts as a full fence, so even uncontended it costs about the same as a volatile store, 6 to 7 ns here. Contended, the cost is cache-line transfer between cores: `AtomicLong` stayed at 36 to 60 million increments per second from 2 to 8 threads, never near its single-thread 119 to 148 million.",
            },
            {
              question: "Explain false sharing and how @Contended addresses it.",
              answer:
                "Cache coherence works per 64-byte line. Two variables in the same line written by different cores force the line to bounce between them even though the data is independent. Two counters 8 bytes apart took 0.8 to 2.4 s for 2 x 50 million volatile increments; 64 bytes apart, 0.27 to 0.40 s. `@jdk.internal.vm.annotation.Contended` makes the JVM pad a field or class (128 bytes by default): offsets went from 16/24 to 144/280. Outside the JDK it needs `-XX:-RestrictContended` at run time (and `--add-exports` to compile); without the flag it's silently ignored. The JDK uses it for `Striped64.Cell` and a few other hot fields.",
            },
            {
              question: "Is LongAdder.sum() accurate?",
              answer:
                "It's exact when no updates are in progress, and not a snapshot when they are: it reads `base` and each cell one at a time. With one thread incrementing and another decrementing a value that was always 0 or 1, I saw `sum()` return values as low as -625 (and -2,056 in another run), because it read one cell before a series of increments and another after the matching decrements. `sumThenReset()` on JDK 21 uses `getAndSet` per cell, so no increment is lost between windows, but it's still not a point-in-time value.",
            },
            {
              question: "What are VarHandle access modes and when would you use acquire/release instead of volatile?",
              answer:
                "Plain (no ordering), opaque (atomic and coherent per variable, no cross-variable ordering), acquire/release (a release store keeps earlier accesses before it, an acquire load keeps later ones after it; together they publish data from one thread to another), and volatile (acquire/release plus a total order over all volatile accesses). Acquire/release is enough for one-way publication, such as a producer filling a buffer and releasing an index that a consumer acquires, and on x86 a release store avoids the `lock`-prefixed fence a volatile store needs. Application code should default to volatile; weaker modes are for libraries with a proof.",
            },
            {
              question: "Why was sun.misc.Unsafe used so widely, and what replaced it?",
              answer:
                "Until Java 9 it was the only way to do CAS on arbitrary fields, ordered stores, field offsets and off-heap memory from Java, so the JDK's own concurrency classes and performance libraries (Netty, Disruptor, serialisers) used it despite it being unsupported and unchecked. Java 9 added `VarHandle` for field and array access with memory modes, moved the JDK to `jdk.internal.misc.Unsafe`, and left `sun.misc.Unsafe` in `jdk.unsupported` for compatibility. The Foreign Memory API (final in Java 22) replaced off-heap access, JEP 471 deprecated the memory-access methods in Java 23 and JEP 498 made them warn in Java 24.",
            },
            {
              question: "When is a lock-free algorithm worse than a lock?",
              answer:
                "When contention is high and the update can't be a single fetch-and-add: a CAS loop wastes the work of every failed attempt (2.7 million failures for 2 million successes with 8 threads in my test) and keeps the contended line bouncing, while a lock lets losers sleep. Also when the state spans several variables, since a CAS covers one location; when fairness or bounded waiting matters (CAS retries have no queue, so a thread can lose repeatedly); and when correctness depends on subtle issues like ABA. Lock-free wins for single-variable updates with moderate contention and when blocking must be avoided.",
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
              question: "Per-driver request counts sum to a few percent less than the global total, more so during surges. Both are built on AtomicLong. Where do you look?",
              answer:
                "For a read-modify-write split into two calls on the per-driver counters, like `c.set(c.get() + 1)` or `c.lazySet(c.get() + 1)`, and for counter creation via `get` then `put`, which can replace a counter that already has counts. The total uses `incrementAndGet`, so it's right. The loss grows with contention on the same key, which matches surges: in my rebuild, 0.26% was lost with 200 active drivers and 7.4% to 8.1% with 8. Fix with `computeIfAbsent(id, k -> new LongAdder()).increment()` and keep a reconciliation metric.",
            },
            {
              question: "A profiler shows request threads spending significant time in AtomicLong.incrementAndGet on a global metrics counter under load. What do you do?",
              answer:
                "Confirm it's contention: the time grows with thread count while each call is a single `lock xadd`. A single `AtomicLong` doesn't scale: 148 million increments per second with one thread, 36 to 60 million total with 2 to 8 in my benchmark. Replace it with a `LongAdder` (365 to 569 million with 8 threads) if reads are occasional, which is true for metrics. If several such counters sit in one object, check for false sharing as well, since independent counters in one cache line were 3 to 9 times slower.",
            },
            {
              question: "Customers report receiving the same 'wallet credited' SMS two or three times, but balances are correct. The credit uses AtomicLong.updateAndGet. What happened?",
              answer:
                "The SMS is sent inside the update function. `updateAndGet` re-runs the function whenever its CAS loses to another thread, so under concurrent credits to the same wallet the function runs several times while only one result is stored: 2.4 to 4.1 runs per credit with 8 threads in my test. Move the SMS after the call, using the returned balance (`long after = wallet.addAndGet(paise); sendSms(after);`); `addAndGet` also avoids the retries entirely.",
            },
            {
              question: "A dashboard shows a negative number of 'drivers currently on a trip', a LongAdder incremented at trip start and decremented at trip end. Is the data corrupt?",
              answer:
                "Probably not. `LongAdder.sum()` isn't a snapshot: it reads cells one at a time while other threads keep updating, so it can miss an increment in a cell it has already read and include the matching decrement in a later one. I reproduced it with a value that was only ever 0 or 1 and saw sums down to -625. For a gauge that must be exact at read time, use an `AtomicLong`; for a statistic, clamp or smooth the display, and know that the total is exact once updates stop.",
            },
            {
              question: "Two counters in a hot per-thread stats object are updated by different threads, and throughput drops when the service moves from a 4-core VM to a 32-core server. Nothing is shared logically. What might be wrong?",
              answer:
                "False sharing: the fields sit in the same 64-byte cache line, so writes from different cores invalidate each other's copy. It can hide on small machines, where threads often share a physical core: my unpadded run varied between 0.8 and 2.4 s depending on placement, while padded ones stayed at 0.27 to 0.40 s. Print the field offsets (`Unsafe.objectFieldOffset` or JOL), pad the hot fields by at least 64 bytes or use `@Contended` with `-XX:-RestrictContended`, or restructure so each thread's counters live in their own object, which is what `LongAdder` does for you.",
            },
            {
              question: "A rate limiter allows 100 requests per second using an AtomicInteger: if (count.get() < 100) { count.incrementAndGet(); allow(); }. Under load it lets through 130. Why, and how do you fix it?",
              answer:
                "Check-then-act across two atomic calls: many threads see 99 and all increment. Make the check and the increment one CAS: loop `int c = count.get(); if (c >= 100) reject; if (count.compareAndSet(c, c + 1)) allow;`, or `int n = count.incrementAndGet(); if (n > 100) reject;` (simpler, the counter overshoots but admissions don't). The same pattern caused duplicate online notifications in 493 of 500 trials until it became a single `compareAndSet`. For per-key limits across servers, the last two lessons of the track move this to the database or Redis.",
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
            "Create `new AtomicInteger(5)` and print `compareAndSet(4, 10)`, `compareAndSet(5, 10)` and `get()`.",
            "On the same object, print `getAndUpdate(x -> x * 2)`, then `get()`, then `updateAndGet(x -> x * 2)`.",
            "Create `AtomicReference<Integer> r = new AtomicReference<>(1000)` and print `r.compareAndSet(1000, 2000)`. Repeat with 100 and 200.",
            "Start three threads that each call `adder.add(5)` on one `LongAdder`, join them, and print `sum()`, `toString()` and `intValue()`.",
            "Create `new LongAccumulator(Math::max, Long.MIN_VALUE)`, accumulate 3, 9 and 4, then print `get()`, `getThenReset()` and `get()` again.",
            "Write a class with a non-volatile `long trips` field and create an `AtomicLongFieldUpdater` for it.",
            "Run `FalseSharing contended` with and without `-XX:-RestrictContended` and compare the offsets and times.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `false true 10`. Step 2 prints `10`, then `20`, then `40`: `getAndUpdate` returns the old value, `updateAndGet` the new one. Step 3 prints `false` for 1000 (two different boxed `Integer`s, compared with `==`) and `true` for 100 (cached). Step 4 prints `15 15 15`. Step 5 prints `9`, `9`, and then `-9223372036854775808`: after the reset the accumulator holds its identity, `Long.MIN_VALUE`. Step 6 throws `IllegalArgumentException` with the message `Must be volatile type`. Step 7 shows offsets 16 and 24 without the flag and 144 and 280 with it, and the flagged run several times faster unless the two threads happen to share a physical core.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `CAS           if (value == expected) value = new; return success   (atomically)
              x86: lock cmpxchg (CAS), lock xadd (getAndAdd), intrinsics
              lock-free: losers retry, nobody parks, no deadlock

ATOMICS       incrementAndGet / getAndAdd / compareAndSet / getAndSet: one step
              set(get() + 1): TWO steps -> lost updates (1.0-1.7M of 4M)
              updateAndGet(f): f may run many times (4.1x at 8 threads) -> pure f

ABA           A -> B -> A fools CAS; AtomicStampedReference adds a version
              GC makes Java ABA-safe unless nodes are reused

LAYOUT        AtomicIntegerArray: atomic slots in one int[]
              field updater / VarHandle on a volatile field: -16 bytes/object

LONGADDER     base + Cell[] (grows to NCPU, @Contended), probe picks the cell
              8 threads: 365-569 M/s vs AtomicLong 40-52 M/s
              sum() is NOT a snapshot (saw -625); sumThenReset atomic per cell

VARHANDLE     plain < opaque < acquire/release < volatile
              signature-polymorphic; withInvokeExactBehavior() for strict types

FALSE SHARING 2 counters in 1 line: 3-9x slower; pad 64+ bytes
              @Contended needs -XX:-RestrictContended (else silently ignored)

UNSAFE        sun.misc.Unsafe -> VarHandle (9) + FFM (22); deprecated (23)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "CAS is the primitive under every lock and atomic class: one atomic compare-and-replace, with the losers retrying. The atomic classes make a single variable correct, but only their single read-modify-write methods are atomic; two atomic calls in a row are a race, and update functions must survive being run more than once.",
            "Correct isn't the same as scalable. One contended `AtomicLong` is a single cache line passed between cores; `LongAdder` spreads it over padded cells and gave 11 times the throughput at 8 threads, at the price of a `sum()` that isn't a snapshot. Unrelated fields in one cache line slow each other down until they're padded apart.",
            "Next comes ExecutorService, Callable and Future: instead of creating threads by hand as every program in this phase did, handing tasks to a pool of reusable threads and getting their results back.",
          ],
        },
      ],
    },
  ],
};
