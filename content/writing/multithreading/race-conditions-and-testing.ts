import type { Lesson } from "../types";

export const raceConditionsAndTesting: Lesson = {
  slug: "race-conditions-and-testing",
  date: "2026-11-16",
  title: "Race Conditions, Thread Dumps and Testing Concurrent Code",
  description:
    "Race conditions on JDK 21, measured instead of described: data races versus race conditions (a check-then-act on a ConcurrentHashMap with no data race at all double-booked a driver in 248 to 583 of 20,000 trials, putIfAbsent in none), the three shapes (read-modify-write as getfield, iadd, putfield in javap; check-then-act; publication, where a this-escape showed 377 to 1,430 of 200,000 quotes with a fare of 0), reading jcmd Thread.print properly (BLOCKED on a monitor versus WAITING parked on a ReentrantLock, the header text that lies, Locked ownable synchronizers, three dumps a few seconds apart that found the hot lock and the threads starving behind it), Thread.dump_to_file JSON that shows 1,000 virtual threads Thread.print never lists but no states or locks, JFR jdk.JavaMonitorEnter and jdk.ThreadPark plus jfr view contention-by-thread, and the starved thread JFR never recorded; then testing: a racy counter that passed 500 of 500 runs at 2 threads by 100 increments and failed 500 of 500 at 8 by 10,000 behind a start gate, start gates, stress loops that failed in round 1 or round 148 or not at all, jcstress run for real (28 JVM configurations, 9.78% double bookings, 0 for putIfAbsent, 0 torn publications on x86 out of 451 million), Thread.sleep(100) failing 32 of 100 tests where Awaitility failed none and ran faster, an injected Clock and Executor that made 1,002 tests pass in 687 ms, assertTimeoutPreemptively and @Timeout(SEPARATE_THREAD) failing a deadlock in 2 seconds while the default @Timeout hung forever and leaked threads poisoned the next test, and a ride-hailing dispatch service that double-booked drivers only under evening load until replace(driver, AVAILABLE, ON_TRIP) fixed it.",
  tags: ["Multithreading", "Race Conditions", "Thread Dumps", "Testing", "jcstress"],
  sections: [
    {
      title: "What Race Conditions Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Deadlock, Livelock and Starvation, was about threads that stop making progress: they wait for each other forever, or keep busy without getting anywhere, or never get their turn. Those bugs are loud once they happen, because something visibly stops. This lesson is about the quiet bug: threads that all make progress, finish, return success, and leave the wrong answer behind. A driver assigned to two riders. A trip counter that is 12 short at the end of the day. A fare quote read before its fare was set.",
        },
        {
          type: "paragraph",
          text: "A **race condition** is a bug where the result depends on the timing of threads: run the same code twice with the same input and you can get different answers, depending on which thread got to a step first. A **data race** is narrower and more technical: two threads access the same variable, at least one writes, and nothing orders the two accesses (no lock, no `volatile`, no other happens-before edge from the Java Memory Model). They overlap a lot, but they are not the same thing. Code can have a race condition with **no data race at all**: two threads calling `containsKey` and then `put` on a `ConcurrentHashMap` touch the map only through thread-safe methods, and still both decide the driver is free.",
        },
        {
          type: "paragraph",
          text: "Race conditions are hard for two reasons, and this lesson covers both. They are hard to **see**: in production a race leaves no blocked thread, no exception and no log line, so the tools are thread dumps and JFR for the times the symptom is waiting, and careful reasoning for the times it isn't. And they are hard to **test**: a racy test usually passes. So the second half is about testing concurrent code on purpose: measuring how often a race shows up, start gates and stress loops, jcstress, polling instead of sleeping, injecting a `Clock` and an `Executor`, and timeouts that turn a deadlock into a failed test instead of a hung build. Everything was run on JDK 21.",
        },
        {
          type: "paragraph",
          text: "All of it happens inside one JVM. The next lesson, Why synchronized Fails Across Servers: Database Locks and Conditional Updates, starts the last phase, where the same check-then-act bug comes back with two servers instead of two threads, and the fix this lesson ends with (a conditional update) moves into the database.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The term comes from hardware: in the 1950s, logic designers called it a race when two signals raced each other through a circuit and the output depended on which arrived first. Software inherited both the name and the bug. The most famous software race is the Therac-25 radiation therapy machine (1985 to 1987), where a fast operator could edit the treatment settings while a concurrent task was still setting up the beam, and patients received massive overdoses. In 2003, a race condition in the alarm system of an Ohio utility's energy management software silently stopped alarms during the Northeast blackout. Neither crashed. Both produced wrong state quietly, which is what races do.",
        },
        {
          type: "paragraph",
          text: "Java shipped `synchronized` and threads in 1996, but its original memory model (chapter 17 of the first Java Language Specification) was so unclear that even `final` fields could be seen changing. Bill Pugh showed it was broken, and JSR 133 replaced it in Java 5 with the model still in use: the **happens-before** relation, and a formal definition of a data race as two conflicting accesses not ordered by happens-before. The tools for seeing concurrency bugs came over the following twenty years:",
        },
        {
          type: "table",
          headers: ["Version / year", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "Threads, `synchronized`; thread dumps with `kill -3` / Ctrl+Break", "The `waiting to lock` / `locked` lines date from here"],
            ["Java 5 (2004)", "JSR 133 memory model; `java.util.concurrent`; `jstack`; `ThreadMXBean.findMonitorDeadlockedThreads`", "Data race gets a precise definition; dumps from the command line"],
            ["Java 6 (2006)", "`Locked ownable synchronizers` in dumps (`jstack -l`); `findDeadlockedThreads`", "`ReentrantLock` owners become visible"],
            ["Java 7 (2011)", "`jcmd`", "One tool for `Thread.print`, `JFR.*`, `GC.*`"],
            ["Java 8 (2014)", "`java.time.Clock`", "Time can be injected and controlled in tests"],
            ["2010 to 2013", "Awaitility (Johan Haleby); jcstress (Aleksey Shipilev, OpenJDK Code Tools)", "Polling assertions; systematic concurrency stress tests"],
            ["Java 11 (2018)", "JFR open-sourced (JEP 328) with `jdk.JavaMonitorEnter`, `jdk.ThreadPark`", "Contention with durations, always-on in production"],
            ["JUnit 5 (2017 to 2022)", "`assertTimeoutPreemptively` (5.0), `@Timeout` (5.5), `threadMode = SEPARATE_THREAD` (5.9)", "Tests that fail on a deadlock instead of hanging"],
            ["Java 19 to 21 (2022 to 2023)", "Virtual threads (preview in 19, final in 21) with `jcmd Thread.dump_to_file -format=json`; `jfr view` (21)", "Dumps that include virtual threads; contention views from the command line"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing company's dispatch office before computers: a whiteboard of drivers, and two dispatchers on phones.",
        },
        {
          type: "list",
          items: [
            "**Check-then-act** is both dispatchers glancing at the board, both seeing \"Ravi: free\", and both telling their caller \"Ravi is on his way\". Each glance was accurate. Each write on the board was neat. The board was never smudged or half-written (no data race). The bug is in the gap between looking and writing.",
            "**Read-modify-write** is a tally of completed trips. Both dispatchers read \"41\", both add one, both write \"42\". Two trips happened; the tally went up by one.",
            "**Publication** is a dispatcher pinning a new fare card to the board before writing the price on it. Someone walking past reads a card with no price.",
            "**A thread dump** is a photo of the office. One photo shows six people standing at one desk. Three photos a few seconds apart show whether it's the same six people at the same desk (a hot lock) or a normal queue that moves.",
            "**A stress test** is running the morning rush on purpose, many times, with everyone starting at the same moment. One quiet morning without a double booking proves nothing.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: in the office, a supervisor could watch both dispatchers and see the double booking happen. In a JVM, nobody is watching. The race leaves no trace: the threads finish, the map is consistent, and the only evidence is two riders waiting for the same car. That's why the tools in this lesson are about provoking races (stress tests, jcstress) and about watching threads that wait (dumps, JFR), not about catching a race in the act.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/race-conditions-and-testing-interleaving.svg",
          alt: "A timeline with two lanes, rider-0 and rider-1, and a row for the map state underneath. rider-0 calls containsKey(D-17) and gets false while the map is empty; then rider-1 calls containsKey(D-17) and also gets false, inside a dashed orange box labelled race window: rider-0 has checked, not yet acted. Then rider-0 calls put(D-17, rider-0), returns true, and the map holds D-17=rider-0; then rider-1 calls put(D-17, rider-1), returns true, and the map holds D-17=rider-1, highlighted in orange. A note says every call is atomic and every write happens-before the next read, so there is no data race, but both riders were told D-17 is theirs and rider-0's assignment was silently overwritten: a race condition. Two panels below: measured results with a start gate, containsKey then put double-booked in 248 to 583 of 20,000 trials, with an ETA calculation in between 254 to 680, putIfAbsent 0 of 20,000 in three runs; and the fix, which moves the decision inside the map: putIfAbsent(D-17, rider) == null, replace(D-17, AVAILABLE, ON_TRIP), compute. A bottom panel lists the three shapes: read-modify-write, trips++ compiles to getfield, iadd, putfield, so two threads read 0 and both write 1; check-then-act, if not containsKey then put, both checks pass before either act; publication, latest = new Quote(1500), the reference is seen before the fields.",
          caption: "Each call is thread-safe; the sequence is not. The race lives in the gap between the check and the act.",
        },
        {
          type: "heading",
          text: "Data race vs race condition",
        },
        {
          type: "table",
          headers: ["", "Data race", "Race condition"],
          rows: [
            ["Definition", "Two accesses to the same variable, at least one a write, not ordered by happens-before", "The result depends on the relative timing of threads"],
            ["Defined by", "The Java Memory Model (JLS 17.4.5): a precise, checkable property", "The program's requirements: \"a driver gets at most one trip\""],
            ["Fixed by", "Ordering: `synchronized`, `volatile`, atomics, safe publication", "Atomicity of the whole decision: one lock around check and act, or one atomic operation"],
            ["Can exist without the other?", "Yes: `String.hashCode` caches into a plain field, a deliberate, benign data race", "Yes: check-then-act on `ConcurrentHashMap` has no data race and still double-books"],
            ["Typical symptom", "Stale or impossible values, loops that never see a flag change", "Lost updates, duplicates, overbooking, negative balances"],
          ],
        },
        {
          type: "heading",
          text: "The three shapes",
        },
        {
          type: "table",
          headers: ["Shape", "Pattern", "What goes wrong", "Fix"],
          rows: [
            ["Read-modify-write", "`count++`, `balance -= fare`, `map.put(k, map.get(k) + 1)`", "Both threads read the same old value; one update is lost", "`AtomicInteger`, `LongAdder`, `map.merge`, or a lock around the whole update"],
            ["Check-then-act", "`if (!map.containsKey(k)) map.put(k, v)`, lazy init, `if (seats > 0) seats--`", "Both checks pass before either act", "`putIfAbsent`, `computeIfAbsent`, `replace(k, old, new)`, CAS, or one lock"],
            ["Publication", "Sharing a reference before the object is fully built, or through a plain field", "Another thread sees the reference but default field values", "Finish construction first; publish through `volatile`, a lock, a concurrent collection or `final` fields"],
          ],
        },
        {
          type: "heading",
          text: "The tools, and what each one sees",
        },
        {
          type: "table",
          headers: ["Tool", "Sees", "Misses"],
          rows: [
            ["`jcmd <pid> Thread.print -l`", "Every platform thread's state, stack, locks held and wanted, ownable synchronizers, monitor deadlocks", "Virtual threads; how long anyone waited; races that don't wait"],
            ["`jcmd <pid> Thread.dump_to_file -format=json`", "Platform **and** virtual threads, grouped by thread container", "Thread states and lock information (JDK 21)"],
            ["JFR `jdk.JavaMonitorEnter`, `jdk.ThreadPark`", "Each contended enter or park above a threshold, with duration, lock class and previous owner", "A wait that never finishes (the event is written when it ends)"],
            ["Stress loop with a start gate", "Races that show up often enough in N rounds", "Rare interleavings, reorderings the JIT only does sometimes"],
            ["jcstress", "Every outcome of a small concurrent scenario, across JIT modes, millions of times", "Anything bigger than a few lines and a few actors"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "count++ is three instructions",
        },
        {
          type: "paragraph",
          text: "To see why a read-modify-write can lose updates and a check-then-act can double-book, I compiled the shapes and read the bytecode with `javap`:",
        },
        {
          type: "code",
          language: "java",
          title: "RaceBytecode.java",
          code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class RaceBytecode {
    int trips;                                   // plain field
    volatile int volatileTrips;                  // volatile field
    final AtomicInteger atomicTrips = new AtomicInteger();
    final ConcurrentHashMap<String, String> driverToRider = new ConcurrentHashMap<>();

    void plainIncrement()    { trips++; }
    void volatileIncrement() { volatileTrips++; }
    void atomicIncrement()   { atomicTrips.incrementAndGet(); }

    boolean assignCheckThenAct(String driver, String rider) {
        if (!driverToRider.containsKey(driver)) {     // check
            driverToRider.put(driver, rider);         // act
            return true;
        }
        return false;
    }

    boolean assignAtomic(String driver, String rider) {
        return driverToRider.putIfAbsent(driver, rider) == null;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac RaceBytecode.java
javap -c -p RaceBytecode
javap -v -p RaceBytecode   # for the field flags`,
        },
        {
          type: "output",
          text: `  void plainIncrement();
    Code:
       0: aload_0
       1: dup
       2: getfield      #23                 // Field trips:I
       5: iconst_1
       6: iadd
       7: putfield      #23                 // Field trips:I
      10: return

  void volatileIncrement();
    Code:
       0: aload_0
       1: dup
       2: getfield      #27                 // Field volatileTrips:I
       5: iconst_1
       6: iadd
       7: putfield      #27                 // Field volatileTrips:I
      10: return

  void atomicIncrement();
    Code:
       0: aload_0
       1: getfield      #10                 // Field atomicTrips:Ljava/util/concurrent/atomic/AtomicInteger;
       4: invokevirtual #30                 // Method java/util/concurrent/atomic/AtomicInteger.incrementAndGet:()I
       7: pop
       8: return

  boolean assignCheckThenAct(java.lang.String, java.lang.String);
    Code:
       0: aload_0
       1: getfield      #19                 // Field driverToRider:Ljava/util/concurrent/ConcurrentHashMap;
       4: aload_1
       5: invokevirtual #34                 // Method java/util/concurrent/ConcurrentHashMap.containsKey:(Ljava/lang/Object;)Z
       8: ifne          23
      11: aload_0
      12: getfield      #19                 // Field driverToRider:Ljava/util/concurrent/ConcurrentHashMap;
      15: aload_1
      16: aload_2
      17: invokevirtual #38                 // Method java/util/concurrent/ConcurrentHashMap.put:(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
      20: pop
      21: iconst_1
      22: ireturn
      23: iconst_0
      24: ireturn

  boolean assignAtomic(java.lang.String, java.lang.String);
    Code:
       0: aload_0
       1: getfield      #19                 // Field driverToRider:Ljava/util/concurrent/ConcurrentHashMap;
       4: aload_1
       5: aload_2
       6: invokevirtual #42                 // Method java/util/concurrent/ConcurrentHashMap.putIfAbsent:(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
       9: ifnonnull     16
      12: iconst_1
      13: goto          17
      16: iconst_0
      17: ireturn

  int trips;
    descriptor: I
    flags: (0x0000)
--
  volatile int volatileTrips;
    descriptor: I
    flags: (0x0040) ACC_VOLATILE`,
        },
        {
          type: "list",
          items: [
            "**`trips++` is `getfield`, `iadd`, `putfield`.** Three separate steps. A thread can be descheduled, or another core can run the same three steps, between the read at offset 2 and the write at offset 7. Two threads that both read 41 both write 42.",
            "**`volatile` changes nothing in the bytecode except a flag.** `volatileIncrement` has exactly the same instructions; the only difference is `ACC_VOLATILE` (0x0040) on the field, which tells the JIT to order and publish each access. Each read and each write is now visible and ordered, but they are still two accesses with a gap between them. `volatile` removes the **data race**; it doesn't remove the **race condition**.",
            "**`AtomicInteger.incrementAndGet()` is one call**, and inside it is one hardware instruction. Its bytecode (from `javap -c java.util.concurrent.atomic.AtomicInteger`) is `Unsafe.getAndAddInt(this, VALUE, 1)` plus 1, which the JIT turns into a `lock xadd` on x86: read, add and write as one indivisible step.",
            "**The check-then-act is two separate `invokevirtual` calls** (offsets 5 and 17), with a branch between them. Each call is internally atomic and thread-safe: `ConcurrentHashMap` guarantees that. Nothing guarantees anything about the gap at offset 8 to 11. `putIfAbsent` is one call (offset 6), and inside the map, the check and the insert happen under the same bin lock (or the same CAS on an empty bin), as ConcurrentHashMap Internals showed.",
          ],
        },
        {
          type: "heading",
          text: "A data race the JDK commits on purpose",
        },
        {
          type: "paragraph",
          text: "To show that a data race is not automatically a bug, here is `String.hashCode()` in JDK 21:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.lang.String | grep -E 'hash|value;|coder'
javap -c -p java.lang.String   # hashCode() only`,
        },
        {
          type: "output",
          text: `  private final byte[] value;
  private final byte coder;
  private int hash;
  private boolean hashIsZero;
  ...
  public int hashCode();
    Code:
       0: aload_0
       1: getfield      #19                 // Field hash:I
       4: istore_1
       5: iload_1
       6: ifne          58
       9: aload_0
      10: getfield      #23                 // Field hashIsZero:Z
      13: ifne          58
      16: aload_0
      17: invokevirtual #492                // Method isLatin1:()Z
      ...
      27: invokestatic  #628                // Method java/lang/StringLatin1.hashCode:([B)I
      ...
      40: istore_1
      41: iload_1
      42: ifne          53
      45: aload_0
      46: iconst_1
      47: putfield      #23                 // Field hashIsZero:Z
      50: goto          58
      53: aload_0
      54: iload_1
      55: putfield      #19                 // Field hash:I
      58: iload_1
      59: ireturn`,
        },
        {
          type: "paragraph",
          text: "`hash` is a plain `int`, not `volatile`, and two threads hashing the same string both read it and may both write it, with no lock: a textbook data race. It's safe for three reasons the code was designed around: the value is computed from `value`, which is `final` and immutable, so every thread computes the **same** number; an `int` write can't be torn; and the method reads `hash` once into a local (offset 4) and returns the local, so it never sees two different reads. The worst case is that two threads both compute the hash once. This is the kind of reasoning a benign data race needs, and it's why the rule for application code is simpler: don't write data races, because proving them benign is a job for JDK authors.",
        },
      ],
    },
    {
      title: "The Three Shapes, Measured",
      blocks: [
        {
          type: "heading",
          text: "Check-then-act on a ConcurrentHashMap",
        },
        {
          type: "paragraph",
          text: "Two riders request driver D-17 at the same moment. Each trial creates a fresh map, starts two threads behind a start gate (the `ready` and `start` latches from CountDownLatch and CyclicBarrier, so both threads are parked and released together), and counts the trials where **both** riders were told \"you got D-17\":",
        },
        {
          type: "code",
          language: "java",
          title: "CheckThenAct.java",
          code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class CheckThenAct {
    interface Assigner { boolean assign(ConcurrentHashMap<String, String> m, String driver, String rider); }

    // Check, then act: two thread-safe calls, but not one atomic step
    static boolean checkThenAct(ConcurrentHashMap<String, String> m, String driver, String rider) {
        if (!m.containsKey(driver)) {
            m.put(driver, rider);
            return true;
        }
        return false;
    }

    // Same, with a little work between the check and the act (computing the pickup ETA)
    static boolean checkWorkThenAct(ConcurrentHashMap<String, String> m, String driver, String rider) {
        if (!m.containsKey(driver)) {
            etaSeconds(rider);
            m.put(driver, rider);
            return true;
        }
        return false;
    }

    // One atomic step: the map decides who wins
    static boolean putIfAbsent(ConcurrentHashMap<String, String> m, String driver, String rider) {
        return m.putIfAbsent(driver, rider) == null;
    }

    static int etaSeconds(String rider) {                 // about a microsecond of arithmetic
        int h = rider.hashCode();
        for (int i = 0; i < 200; i++) h = h * 31 + i;
        return Math.abs(h % 600);
    }

    // trials x (two riders request driver D-17 at the same moment); counts trials where BOTH were told "you got D-17"
    static void run(String label, Assigner a, int trials) throws InterruptedException {
        int doubleBooked = 0;
        for (int t = 0; t < trials; t++) {
            ConcurrentHashMap<String, String> assignments = new ConcurrentHashMap<>();
            CountDownLatch ready = new CountDownLatch(2), start = new CountDownLatch(1);
            AtomicInteger winners = new AtomicInteger();
            Thread[] riders = new Thread[2];
            for (int r = 0; r < 2; r++) {
                String rider = "rider-" + r;
                riders[r] = Thread.ofPlatform().start(() -> {
                    ready.countDown();
                    try { start.await(); } catch (InterruptedException e) { return; }
                    if (a.assign(assignments, "D-17", rider)) winners.incrementAndGet();
                });
            }
            ready.await();
            start.countDown();
            for (Thread th : riders) th.join();
            if (winners.get() > 1) doubleBooked++;
        }
        System.out.printf("%-26s both riders got D-17 in %4d of %d trials%n", label, doubleBooked, trials);
    }

    public static void main(String[] args) throws Exception {
        int trials = 20_000;
        run("containsKey then put", CheckThenAct::checkThenAct, trials);
        run("containsKey, ETA, put", CheckThenAct::checkWorkThenAct, trials);
        run("putIfAbsent", CheckThenAct::putIfAbsent, trials);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m CheckThenAct.java   # three runs",
        },
        {
          type: "output",
          text: `containsKey then put       both riders got D-17 in  248 of 20000 trials
containsKey, ETA, put      both riders got D-17 in  334 of 20000 trials
putIfAbsent                both riders got D-17 in    0 of 20000 trials
containsKey then put       both riders got D-17 in  507 of 20000 trials
containsKey, ETA, put      both riders got D-17 in  680 of 20000 trials
putIfAbsent                both riders got D-17 in    0 of 20000 trials
containsKey then put       both riders got D-17 in  583 of 20000 trials
containsKey, ETA, put      both riders got D-17 in  254 of 20000 trials
putIfAbsent                both riders got D-17 in    0 of 20000 trials`,
        },
        {
          type: "list",
          items: [
            "**A race condition with no data race.** Every access to the map went through `ConcurrentHashMap`, which is fully thread-safe: each `put` happens-before a later `get` of the same key. The JMM is satisfied. Yet in 1.2% to 2.9% of trials both riders \"won\", and the map ended with only the second rider in it: the first rider's assignment was overwritten with no error anywhere.",
            "**More work in the gap didn't reliably mean more failures.** I expected the ETA calculation between check and act to widen the window: one run went from 507 to 680, but another went from 583 down to 254. With only two threads and a gap of about a microsecond, the run-to-run noise (thread start-up, scheduling on a busy 8-core machine) is bigger than the effect. The window matters, but measuring it needs many more trials than intuition suggests.",
            "**`putIfAbsent` never double-booked** in 60,000 trials, and it can't: the check and the insert are one operation inside the map. The same goes for `computeIfAbsent`, `compute`, `merge` and `replace(key, expected, newValue)`. The general fix for check-then-act is always the same idea: make the thing that decides also be the thing that writes.",
          ],
        },
        {
          type: "heading",
          text: "Publication: the object escapes before it's built",
        },
        {
          type: "paragraph",
          text: "Publication races are the hardest of the three to reproduce, because on x86 the CPU doesn't reorder stores with other stores (jcstress below confirms it). The version that shows up on any CPU is a `this` escape: the constructor hands `this` to another thread before it finishes. Here a `Quote` registers itself with a live-quote queue that a surge monitor drains, and sets its fare one line later:",
        },
        {
          type: "code",
          language: "java",
          title: "ThisEscape.java",
          code: `import java.util.concurrent.ConcurrentLinkedQueue;

public class ThisEscape {
    static final ConcurrentLinkedQueue<Quote> LIVE_QUOTES = new ConcurrentLinkedQueue<>();

    static class Quote {
        final String zone;
        final int farePaise;                                  // final, and still seen as 0

        Quote(String zone, int distanceM) {
            this.zone = zone;
            LIVE_QUOTES.add(this);                            // 'this' escapes before the constructor ends
            this.farePaise = 5_000 + distanceM * 12;           // written after publication
        }
    }

    public static void main(String[] args) throws Exception {
        int quotes = 200_000;
        int[] seenZero = {0}, seen = {0};
        Thread surgeMonitor = Thread.ofPlatform().start(() -> {
            while (seen[0] < quotes) {
                Quote q = LIVE_QUOTES.poll();
                if (q == null) { Thread.onSpinWait(); continue; }
                seen[0]++;
                if (q.farePaise == 0) seenZero[0]++;
            }
        });
        for (int i = 0; i < quotes; i++) new Quote("SALT-LAKE", 1_000 + i % 5_000);
        surgeMonitor.join();
        System.out.printf("quotes read by the monitor: %,d, with farePaise == 0: %,d%n", seen[0], seenZero[0]);
    }
}`,
        },
        {
          type: "output",
          text: `quotes read by the monitor: 200,000, with farePaise == 0: 377
quotes read by the monitor: 200,000, with farePaise == 0: 666
quotes read by the monitor: 200,000, with farePaise == 0: 1,430`,
        },
        {
          type: "list",
          items: [
            "**A `final` field read as 0.** The JMM's guarantee for `final` fields (every thread sees the constructed value) only holds for objects whose reference **doesn't escape during construction**. Here it escaped through the queue, and the monitor read hundreds of quotes priced at zero, in each of three runs (377, 666 and 1,430 out of 200,000).",
            "**The queue itself was perfectly safe.** `ConcurrentLinkedQueue` publishes the reference correctly. What it published was an unfinished object. Safe publication is about **when** you share, not just **how**.",
            "**The fix is structural:** finish construction, then share. A static factory (`Quote q = new Quote(...); LIVE_QUOTES.add(q); return q;`) or a builder makes it impossible to get wrong. Registering listeners, starting threads and submitting `this` to an executor from a constructor are the usual ways `this` escapes.",
          ],
        },
        {
          type: "paragraph",
          text: "The third shape, read-modify-write, is the racy counter used in the testing sections below, where the question becomes not \"does it race?\" but \"how many runs does it take to notice?\".",
        },
      ],
    },
    {
      title: "Reading Thread Dumps Properly",
      blocks: [
        {
          type: "paragraph",
          text: "A race that loses updates leaves nothing in a thread dump. But a lot of concurrency trouble shows up as **waiting**: a hot lock that serialises a service, threads starving behind it, a deadlock. That's what dumps are for. I built a small service with three kinds of threads: six fare-quote threads calling a `synchronized` fare table that does a 40 ms \"database call\" while holding its monitor, three payout threads sharing a `ReentrantLock` held for 30 ms per payout, and two idle consumers waiting on an empty queue:",
        },
        {
          type: "code",
          language: "java",
          title: "HotLock.java",
          code: `import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.locks.ReentrantLock;

public class HotLock {
    // A synchronized fare table that calls the pricing database while holding its monitor
    static class FareTable {
        synchronized int quote(String zone) throws InterruptedException {
            Thread.sleep(40);                              // the "database call", under the lock
            return 120 + zone.length();
        }
    }

    // A payout ledger guarded by a ReentrantLock, held for about 30 ms per payout
    static class PayoutLedger {
        final ReentrantLock lock = new ReentrantLock();
        void pay(String driver) throws InterruptedException {
            lock.lock();
            try {
                Thread.sleep(30);
            } finally {
                lock.unlock();
            }
        }
    }

    public static void main(String[] args) throws Exception {
        FareTable fares = new FareTable();
        PayoutLedger ledger = new PayoutLedger();
        LinkedBlockingQueue<String> tripEvents = new LinkedBlockingQueue<>();
        long runMillis = args.length > 0 ? Long.parseLong(args[0]) : 60_000;
        long pauseMillis = args.length > 1 ? Long.parseLong(args[1]) : 0;   // work done outside the lock

        for (int i = 0; i < 6; i++) {
            Thread.ofPlatform().daemon().name("fare-quote-" + i).start(() -> {
                try { while (true) { fares.quote("SALT-LAKE"); Thread.sleep(pauseMillis); } } catch (InterruptedException e) { }
            });
        }
        for (int i = 0; i < 3; i++) {
            Thread.ofPlatform().daemon().name("payout-" + i).start(() -> {
                try { while (true) { ledger.pay("D-17"); Thread.sleep(pauseMillis); } } catch (InterruptedException e) { }
            });
        }
        for (int i = 0; i < 2; i++) {                      // idle consumers: parked, but healthy
            Thread.ofPlatform().daemon().name("trip-events-" + i).start(() -> {
                try { while (true) tripEvents.take(); } catch (InterruptedException e) { }
            });
        }
        System.out.println("running; pid " + ProcessHandle.current().pid());
        Thread.sleep(runMillis);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac HotLock.java
java -Xmx128m HotLock 30000 0 &
PID=$!; sleep 3
for i in 1 2 3; do jcmd $PID Thread.print -l > dump$i.txt; sleep 3; done`,
        },
        {
          type: "heading",
          text: "A thread waiting for a monitor, and the one holding it",
        },
        {
          type: "output",
          text: `"fare-quote-0" #20 [1053559] daemon prio=5 os_prio=0 cpu=1.46ms elapsed=3.17s tid=0x00007918d8135800 nid=1053559 waiting for monitor entry  [0x00007918dc7d1000]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat HotLock$FareTable.quote(HotLock.java:8)
\t- waiting to lock <0x00000000ff916520> (a HotLock$FareTable)
\tat HotLock.lambda$main$0(HotLock.java:35)
\tat HotLock$$Lambda/0x0000791864002800.run(Unknown Source)
\tat java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
\tat java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

"fare-quote-2" #22 [1053561] daemon prio=5 os_prio=0 cpu=0.22ms elapsed=3.17s tid=0x00007918d8137a90 nid=1053561 waiting on condition  [0x00007918dc5d1000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
\tat java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
\tat java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
\tat HotLock$FareTable.quote(HotLock.java:8)
\t- locked <0x00000000ff916520> (a HotLock$FareTable)
\tat HotLock.lambda$main$0(HotLock.java:35)
\tat HotLock$$Lambda/0x0000791864002800.run(Unknown Source)
\tat java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
\tat java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
\t- None`,
        },
        {
          type: "list",
          items: [
            "**`BLOCKED (on object monitor)` with `- waiting to lock <addr>`** means the thread is trying to enter a `synchronized` block or method and someone else owns the monitor. The address identifies the object (`0x...ff916520`, a `HotLock$FareTable`). The frame shows line 8, the first line of the `synchronized` method, because entering the method is where it waits.",
            "**`- locked <same addr>`** appears in the owner's stack, under the frame that took the monitor. Searching a dump for the address from a `waiting to lock` line finds the owner. Here the owner, `fare-quote-2`, is `TIMED_WAITING (sleeping)` inside `Thread.sleep`, **while holding the lock**: the classic hot-lock shape, slow I/O inside `synchronized`.",
            "**The header text is not the state.** `fare-quote-2`'s header says `waiting on condition`, which sounds like a `Condition.await`, but it's sleeping. The header is a low-level description of the OS thread; always read the `java.lang.Thread.State` line and the frames under it.",
            "**`Locked ownable synchronizers: - None`** is printed because of `-l`. It lists `java.util.concurrent` locks (anything built on AQS that has an exclusive owner) held by the thread. Monitors never appear there; they appear inline as `- locked`.",
          ],
        },
        {
          type: "heading",
          text: "A thread parked on a ReentrantLock, and the one holding it",
        },
        {
          type: "output",
          text: `"payout-0" #26 [1053565] daemon prio=5 os_prio=0 cpu=7.01ms elapsed=3.17s tid=0x00007918d813bef0 nid=1053565 waiting on condition  [0x00007918dc1d1000]
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
\t- parking to wait for  <0x00000000ff917388> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
\tat java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:221)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:788)
\tat java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1024)
\tat java.util.concurrent.locks.ReentrantLock$Sync.lock(java.base@21.0.13.0.3/ReentrantLock.java:153)
\tat java.util.concurrent.locks.ReentrantLock.lock(java.base@21.0.13.0.3/ReentrantLock.java:322)
\tat HotLock$PayoutLedger.pay(HotLock.java:17)
\tat HotLock.lambda$main$1(HotLock.java:40)
\t...

"payout-1" #27 [1053566] daemon prio=5 os_prio=0 cpu=11.74ms elapsed=3.17s tid=0x00007918d813d7e0 nid=1053566 waiting on condition  [0x00007918d7ffe000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
\tat java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
\tat java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
\tat HotLock$PayoutLedger.pay(HotLock.java:19)
\tat HotLock.lambda$main$1(HotLock.java:40)
\t...

   Locked ownable synchronizers:
\t- <0x00000000ff917388> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)

"trip-events-0" #29 ... waiting on condition
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
\t- parking to wait for  <0x00000000ff9176b8> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
\t...
\tat java.util.concurrent.LinkedBlockingQueue.take(java.base@21.0.13.0.3/LinkedBlockingQueue.java:435)`,
        },
        {
          type: "list",
          items: [
            "**A thread waiting for a `ReentrantLock` is never `BLOCKED`.** It is `WAITING (parking)`, and the line is `- parking to wait for <addr> (a ...ReentrantLock$NonfairSync)`. A search for `BLOCKED` alone misses every `java.util.concurrent` lock in the dump.",
            "**The owner shows the lock only under `Locked ownable synchronizers`**, not in its stack. `payout-1` holds `0x...ff917388`, and nothing in its frames says so; without `-l` (or with `jstack` without `-l`) that section is missing and the owner is invisible.",
            "**`parking to wait for` doesn't always mean contention.** `trip-events-0` parks on a `ConditionObject` inside `LinkedBlockingQueue.take`: an idle consumer waiting for work, which is healthy. Parking on a `...Sync` (`NonfairSync`, `FairSync`, `ReentrantReadWriteLock$...`) means waiting for a lock; parking on a `ConditionObject` means waiting for a **signal** (an `await`, a queue `take`, a barrier).",
          ],
        },
        {
          type: "table",
          headers: ["State line", "Waiting for", "Typical frames", "Usually means"],
          rows: [
            ["`RUNNABLE`", "Nothing (or native I/O)", "Your code, or `socketRead0`, `epollWait`", "Working, or blocked in a native read the JVM can't see"],
            ["`BLOCKED (on object monitor)`", "A `synchronized` monitor", "`- waiting to lock <addr>`", "Monitor contention; find `- locked <addr>`"],
            ["`WAITING (parking)` on a `...Sync`", "A `java.util.concurrent` lock", "`AbstractQueuedSynchronizer.acquire`", "Lock contention; find the address under `Locked ownable synchronizers`"],
            ["`WAITING (parking)` on a `ConditionObject`", "A signal", "`ConditionObject.await`, `LinkedBlockingQueue.take`", "Idle or waiting for an event; normal for pool and consumer threads"],
            ["`WAITING (on object monitor)`", "`notify` after `Object.wait()`", "`- waiting on <addr>`", "Old-style wait/notify; the monitor is released while waiting"],
            ["`TIMED_WAITING (sleeping)` / `(parking)`", "Time, or a timed park", "`Thread.sleep`, `parkNanos`, `poll(timeout)`", "Sleeping or a timed wait; suspicious if it holds a lock"],
          ],
        },
        {
          type: "heading",
          text: "Three dumps a few seconds apart",
        },
        {
          type: "paragraph",
          text: "A single dump is a photo: it can't tell a hot lock from a lock that happened to be held at that instant. Three dumps a few seconds apart can. I wrote a small script that groups waiters by lock address and finds each lock's owner (from `- locked` for monitors and from `Locked ownable synchronizers` for AQS locks), skipping `ConditionObject` parks because those are waits for a signal, not for a lock:",
        },
        {
          type: "code",
          language: "python",
          title: "hotlocks.py",
          code: `import re, sys
from collections import Counter, defaultdict

# For each jcmd Thread.print -l dump: who waits on which lock, and who holds it
for path in sys.argv[1:]:
    text = open(path).read()
    waiting, holder, kind, states = Counter(), {}, {}, Counter()
    for block in text.split('\\n"')[1:]:
        name = block.split('"', 1)[0]
        m = re.search(r'java.lang.Thread.State: (\\S+)', block)
        if m: states[m.group(1)] += 1
        for addr, cls in re.findall(r'- waiting to lock <(\\w+)> \\(a ([\\w.$]+)\\)', block):
            waiting[addr] += 1; kind[addr] = cls + " (monitor)"
        for addr, cls in re.findall(r'- parking to wait for\\s+<(\\w+)> \\(a ([\\w.$]+)\\)', block):
            if 'ConditionObject' in cls: continue      # waiting for a signal (idle), not for a lock
            waiting[addr] += 1; kind[addr] = cls
        for addr in re.findall(r'- locked <(\\w+)>', block): holder[addr] = name
        own = block.split('Locked ownable synchronizers:')[-1] if 'Locked ownable' in block else ''
        for addr in re.findall(r'- <(\\w+)>', own): holder[addr] = name
    print(f"{path}: " + ", ".join(f"{s} {n}" for s, n in sorted(states.items())))
    for addr, n in waiting.most_common():
        print(f"  {n} waiting for <{addr}> {kind[addr]}, held by {holder.get(addr, '?')}")`,
        },
        {
          type: "code",
          language: "bash",
          code: "python3 -I hotlocks.py dump1.txt dump2.txt dump3.txt",
        },
        {
          type: "output",
          text: `dump1.txt: BLOCKED 5, RUNNABLE 8, TIMED_WAITING 4, WAITING 5
  5 waiting for <0x00000000ff916520> HotLock$FareTable (monitor), held by fare-quote-2
  2 waiting for <0x00000000ff917388> java.util.concurrent.locks.ReentrantLock$NonfairSync, held by payout-1
dump2.txt: BLOCKED 5, RUNNABLE 8, TIMED_WAITING 4, WAITING 5
  5 waiting for <0x00000000ff916520> HotLock$FareTable (monitor), held by fare-quote-3
  2 waiting for <0x00000000ff917388> java.util.concurrent.locks.ReentrantLock$NonfairSync, held by payout-2
dump3.txt: BLOCKED 5, RUNNABLE 8, TIMED_WAITING 4, WAITING 5
  5 waiting for <0x00000000ff916520> HotLock$FareTable (monitor), held by fare-quote-3
  2 waiting for <0x00000000ff917388> java.util.concurrent.locks.ReentrantLock$NonfairSync, held by payout-0`,
        },
        {
          type: "list",
          items: [
            "**Same address, same queue length, three times in a row:** five of six fare-quote threads waiting on `0x...ff916520` in every dump. A lock that's merely busy shows different addresses or a shorter queue each time. This one is the bottleneck: the six-thread fare service is effectively single-threaded, at 40 ms per quote.",
            "**The owner changed between dumps**, so it isn't a deadlock: the lock is being passed around. A deadlock would show the same owner, the same waiters and identical stacks in all three, plus a `Found one Java-level deadlock` section at the end of the dump.",
            "**The 8 `RUNNABLE` threads were all JVM infrastructure** (`Reference Handler`, `Signal Dispatcher`, `Service Thread`, `Monitor Deflation Thread`, the two compiler threads, `Notification Thread`, `Attach Listener`). `RUNNABLE` doesn't mean using CPU: `Reference Handler` was waiting in native code. Filter the dump to your own thread names first.",
          ],
        },
        {
          type: "heading",
          text: "The cpu= column finds starving threads",
        },
        {
          type: "paragraph",
          text: "Every thread header has `cpu=` (CPU time used so far) and `elapsed=`. Across three dumps, a thread whose `cpu=` doesn't move hasn't run at all in between:",
        },
        {
          type: "code",
          language: "bash",
          code: `for f in dump1.txt dump2.txt dump3.txt; do
  echo "$f $(grep -oE 'elapsed=[0-9.]+s' $f | head -1): $(grep -oE '^"(fare-quote|payout)-[0-9]".*cpu=[0-9.]+ms' $f \\
    | sed -E 's/^"([^"]+)".*cpu=([0-9.]+ms)/\\1 \\2/' | tr '\\n' ',')"
done`,
        },
        {
          type: "output",
          text: `dump1.txt elapsed=3.23s: fare-quote-0 1.46ms,fare-quote-1 0.25ms,fare-quote-2 0.22ms,fare-quote-3 0.60ms,fare-quote-4 3.14ms,fare-quote-5 5.59ms,payout-0 7.01ms,payout-1 11.74ms,payout-2 5.77ms,
dump2.txt elapsed=6.36s: fare-quote-0 1.46ms,fare-quote-1 0.25ms,fare-quote-2 6.52ms,fare-quote-3 4.36ms,fare-quote-4 3.62ms,fare-quote-5 5.59ms,payout-0 18.14ms,payout-1 13.90ms,payout-2 18.72ms,
dump3.txt elapsed=9.54s: fare-quote-0 1.46ms,fare-quote-1 0.25ms,fare-quote-2 6.52ms,fare-quote-3 11.32ms,fare-quote-4 6.94ms,fare-quote-5 5.59ms,payout-0 31.07ms,payout-1 20.46ms,payout-2 24.63ms,`,
        },
        {
          type: "list",
          items: [
            "**`fare-quote-0` and `fare-quote-1` didn't run once in 6.3 seconds**: their CPU time stayed at exactly 1.46 ms and 0.25 ms from the first dump to the third. `fare-quote-5` also stood still. Meanwhile `fare-quote-2`, `-3` and `-4` kept getting the monitor. That's the starvation from the previous lesson, visible from nothing but three dumps.",
            "**Why:** a `synchronized` monitor is not fair. A thread that releases it and immediately asks again (the `while (true)` loop with no pause) often wins against threads that have to be woken first. In an earlier run of the same program, four of the six fare threads didn't move at all between the first and the third dump while two shared the lock between them. The payout threads, on a non-fair `ReentrantLock`, all kept moving in this run.",
            "**What it means in production:** if requests are served by those threads, some requests are fast and some time out, with the same code and the same data. When a few threads have frozen `cpu=` values while others on the same lock advance, look for a lock that's held for long periods and re-acquired in a loop.",
          ],
        },
        {
          type: "heading",
          text: "Thread.dump_to_file and virtual threads",
        },
        {
          type: "paragraph",
          text: "JDK 21 added a second dump command, `Thread.dump_to_file`, with a plain text and a JSON format. I took one of the same process:",
        },
        {
          type: "code",
          language: "bash",
          code: "jcmd $PID Thread.dump_to_file -format=json $PWD/dump.json",
        },
        {
          type: "output",
          text: `{
  "threadDump": {
    "processId": "1053540",
    "time": "2026-11-15T19:45:35.748009930Z",
    "runtimeVersion": "21.0.13.0.3+1-1-24.04.1-Ubuntu",
    "threadContainers": [
      {
        "container": "<root>",
        "parent": null,
        "owner": null,
        "threads": [
         ...
         {
           "tid": "20",
           "name": "fare-quote-0",
           "stack": [
              "HotLock$FareTable.quote(HotLock.java:8)",
              "HotLock.lambda$main$0(HotLock.java:35)",
              "java.base\\/java.lang.Thread.run(Thread.java:1583)"
           ]
         },`,
        },
        {
          type: "paragraph",
          text: "Compare it with the `Thread.print` entry for the same thread above: **no state, no `waiting to lock`, no `locked`, no owner.** In JDK 21 the JSON dump has names, ids and stacks only (and it hides the lambda and `runWith` frames). For lock analysis it's useless. So why does it exist? I parked 1,000 virtual threads on a `ReentrantLock` held by `main` and took both kinds of dump:",
        },
        {
          type: "code",
          language: "java",
          title: "VirtualDump.java",
          code: `import java.util.concurrent.locks.ReentrantLock;

public class VirtualDump {
    public static void main(String[] args) throws Exception {
        ReentrantLock payouts = new ReentrantLock();
        payouts.lock();                                            // main holds it: the virtual threads park
        for (int i = 0; i < 1_000; i++) {
            Thread.ofVirtual().name("payout-vt-" + i).start(() -> { payouts.lock(); payouts.unlock(); });
        }
        Thread.sleep(500);
        System.out.println("1000 virtual threads parked; pid " + ProcessHandle.current().pid());
        Thread.sleep(20_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `jcmd $PID Thread.print > print.txt
jcmd $PID Thread.dump_to_file -format=json $PWD/vt.json
echo "Thread.print: $(grep -c payout-vt print.txt) payout-vt mentions, $(grep -c '^"' print.txt) threads"
echo "JSON: $(grep -c '"name": "payout-vt' vt.json) payout-vt threads"`,
        },
        {
          type: "output",
          text: `Thread.print: 0 payout-vt mentions, 26 threads
JSON: 1000 payout-vt threads

           "tid": "28",
           "name": "payout-vt-7",
           "stack": [
              "java.base\\/java.lang.VirtualThread.park(VirtualThread.java:596)",
              "java.base\\/java.lang.System$2.parkVirtualThread(System.java:2644)",
              "java.base\\/jdk.internal.misc.VirtualThreads.park(VirtualThreads.java:54)",
              "java.base\\/java.util.concurrent.locks.LockSupport.park(LockSupport.java:219)",
              "java.base\\/java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(AbstractQueuedSynchronizer.java:788)",
              "java.base\\/java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(AbstractQueuedSynchronizer.java:1024)",
              "java.base\\/java.util.concurrent.locks.ReentrantLock$Sync.lock(ReentrantLock.java:153)",
              "java.base\\/java.util.concurrent.locks.ReentrantLock.lock(ReentrantLock.java:322)",
              "VirtualDump.lambda$main$0(VirtualDump.java:8)",
              "java.base\\/java.lang.VirtualThread.run(VirtualThread.java:329)"
           ]`,
        },
        {
          type: "list",
          items: [
            "**`Thread.print` doesn't list unmounted virtual threads at all.** 1,000 threads were stuck on a lock and the classic dump had 26 platform threads and not one mention of them. A service on virtual threads that \"hangs\" can produce a classic dump that looks completely idle.",
            "**The JSON dump had all 1,000**, with stacks that show exactly where they park (`ReentrantLock.lock` at line 8). It groups threads by **thread container** (`<root>`, each executor, the `ForkJoinPool` carriers), which is how structured concurrency organises them.",
            "**So take both.** `Thread.print -l` for states, owners and deadlocks of platform threads; `Thread.dump_to_file -format=json` when virtual threads are in use, then grep the stacks for the same lock frames.",
          ],
        },
      ],
    },
    {
      title: "JFR: jdk.JavaMonitorEnter and jdk.ThreadPark",
      blocks: [
        {
          type: "paragraph",
          text: "Dumps show **where** threads wait; JFR shows **how long**, for every wait above a threshold. `jdk.JavaMonitorEnter` is recorded for a contended `synchronized` entry and `jdk.ThreadPark` for a `LockSupport.park` (which covers every `java.util.concurrent` lock and condition); both have a 20 ms threshold in the `default` settings. I recorded `HotLock` for 10 seconds, first exactly as in the dumps (no pause between calls):",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx128m -XX:StartFlightRecording:filename=hot.jfr,settings=default HotLock 10000 0
jfr summary hot.jfr | grep -E 'JavaMonitorEnter|ThreadPark'
jfr print --events jdk.JavaMonitorEnter hot.jfr`,
        },
        {
          type: "output",
          text: ` jdk.ThreadPark                            332         12616
 jdk.JavaMonitorEnter                        1            24

jdk.JavaMonitorEnter {
  startTime = 01:14:24.948 (2026-11-16)
  duration = 11.3 s
  monitorClass = HotLock$FareTable (classLoader = app)
  previousOwner = "fare-quote-0" (javaThreadId = 24)
  address = 0x7E07DC000FE0
  eventThread = "fare-quote-5" (javaThreadId = 29)
  stackTrace = [
    HotLock$FareTable.quote(String) line: 8
    HotLock.lambda$main$0(HotLock$FareTable) line: 33
    java.lang.Thread.run() line: 1583
    ...
  ]
}`,
        },
        {
          type: "list",
          items: [
            "**One monitor event in ten seconds, for a lock with five threads always waiting.** In this run `fare-quote-0` kept re-acquiring the monitor and the others starved. JFR writes a `JavaMonitorEnter` event when the wait **ends**, so a thread that never gets the lock produces no event at all. The single event is `fare-quote-5` finally getting in, close to the end of the run, after 11.3 s. (This recording was taken before I added the `pauseMillis` argument, so the lambda's line number is 33 rather than 35.)",
            "**`previousOwner` is the most useful field**: it names the thread that held the monitor just before, which points straight at the code holding it too long.",
            "**All 332 `ThreadPark` events came from `payout-1`**: in this run `payout-0` hogged the `ReentrantLock` and `payout-2` never got it, so it never produced an event either. The lesson for production: absence of JFR events is not absence of waiting. Check a dump for threads waiting right now.",
          ],
        },
        {
          type: "paragraph",
          text: "Then the same program with 10 ms of work outside the lock between calls, which is closer to a real service, and the `jfr view` command that JDK 21 added:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx128m -XX:StartFlightRecording:filename=hot2.jfr,settings=default HotLock 10000 10
jfr summary hot2.jfr | grep -E 'JavaMonitorEnter|ThreadPark '
jfr view contention-by-thread hot2.jfr
jfr view contention-by-class hot2.jfr`,
        },
        {
          type: "output",
          text: ` jdk.ThreadPark                            332         12616
 jdk.JavaMonitorEnter                      249          5875

                              Contention by Thread

Thread                                               Count    Avg    P90   Max.
---------------------------------------------------- ----- ------ ------ ------
fare-quote-0                                            24 396 ms 398 ms 400 ms
fare-quote-1                                            25 390 ms 397 ms 400 ms
fare-quote-5                                            50 170 ms 306 ms 310 ms
fare-quote-2                                            50 167 ms 306 ms 310 ms
fare-quote-3                                            50 168 ms 215 ms 218 ms
fare-quote-4                                            50 169 ms 215 ms 216 ms

                            Contention by Lock Class

Lock Class                                           Count   Avg.   P90   Max.
---------------------------------------------------- ----- ------ ------ ------
HotLock$FareTable                                      249 213 ms 396 ms 400 ms`,
        },
        {
          type: "list",
          items: [
            "**With a pause, everyone gets a turn, but not an equal one.** 249 contended entries, averaging 213 ms each for a 40 ms critical section. `fare-quote-0` and `-1` waited about 400 ms per entry and got in half as often (24 and 25 times) as the other four (50 each). JFR quantifies the unfairness that the dumps only hinted at.",
            "**The `ThreadPark` events split evenly this time**: 110, 111 and 111 events for `payout-0`, `-1` and `-2`, with park times from 29.9 to 64.0 ms (median 56.8). The count, 332, is the same as in the first recording by coincidence: both runs did roughly ten seconds of 30 ms payouts.",
            "**`jfr view` saves a trip to JDK Mission Control.** `contention-by-site`, `contention-by-thread`, `contention-by-class` and `contention-by-address` read the same events. In production, a continuous JFR recording (`-XX:StartFlightRecording:maxage=1h,...`) plus `jcmd <pid> JFR.dump` after an incident gives the last hour of lock waits.",
          ],
        },
      ],
    },
    {
      title: "Why One Run Proves Nothing",
      blocks: [
        {
          type: "paragraph",
          text: "Now the testing half. A concurrency test that passes once tells you almost nothing, and I wanted a number for \"almost\". The racy counter (`volatile int`, incremented with `++` from several threads) was run 500 times for each combination of thread count, increments per thread, and whether a start gate released the threads together. A run \"fails\" if any update was lost:",
        },
        {
          type: "code",
          language: "java",
          title: "RaceOdds.java",
          code: `import java.util.concurrent.CountDownLatch;

public class RaceOdds {
    static volatile int completedTrips;               // volatile: visible, but ++ is still read-modify-write

    // One run: 'threads' threads each do 'perThread' increments; returns how many updates were lost
    static int oneRun(int threads, int perThread, boolean gate) throws InterruptedException {
        completedTrips = 0;
        CountDownLatch ready = new CountDownLatch(threads), start = new CountDownLatch(1);
        Thread[] ts = new Thread[threads];
        for (int i = 0; i < threads; i++) {
            ts[i] = Thread.ofPlatform().start(() -> {
                if (gate) {
                    ready.countDown();
                    try { start.await(); } catch (InterruptedException e) { return; }
                }
                for (int k = 0; k < perThread; k++) completedTrips++;
            });
        }
        if (gate) { ready.await(); start.countDown(); }
        for (Thread t : ts) t.join();
        return threads * perThread - completedTrips;
    }

    public static void main(String[] args) throws Exception {
        int runs = 500;
        System.out.println("threads perThread  gate   failing runs   lost updates (avg when failing)");
        for (int threads : new int[] {2, 8}) {
            for (int perThread : new int[] {10, 100, 1_000, 10_000}) {
                for (boolean gate : new boolean[] {false, true}) {
                    int failing = 0; long lost = 0;
                    for (int r = 0; r < runs; r++) {
                        int l = oneRun(threads, perThread, gate);
                        if (l > 0) { failing++; lost += l; }
                    }
                    System.out.printf("%5d %10d  %-5s %4d of %d (%5.1f%%)  %8.1f%n", threads, perThread, gate ? "yes" : "no",
                            failing, runs, 100.0 * failing / runs, failing == 0 ? 0.0 : (double) lost / failing);
                }
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `threads perThread  gate   failing runs   lost updates (avg when failing)
    2         10  no       0 of 500 (  0.0%)       0.0
    2         10  yes      0 of 500 (  0.0%)       0.0
    2        100  no       0 of 500 (  0.0%)       0.0
    2        100  yes      0 of 500 (  0.0%)       0.0
    2       1000  no       0 of 500 (  0.0%)       0.0
    2       1000  yes    246 of 500 ( 49.2%)     194.6
    2      10000  no     285 of 500 ( 57.0%)    1095.8
    2      10000  yes    485 of 500 ( 97.0%)    7671.5
    8         10  no       1 of 500 (  0.2%)       6.0
    8         10  yes     10 of 500 (  2.0%)       6.4
    8        100  no       0 of 500 (  0.0%)       0.0
    8        100  yes     76 of 500 ( 15.2%)      47.5
    8       1000  no       6 of 500 (  1.2%)     673.7
    8       1000  yes    329 of 500 ( 65.8%)     953.7
    8      10000  no     431 of 500 ( 86.2%)   16816.3
    8      10000  yes    500 of 500 (100.0%)   52479.2`,
        },
        {
          type: "list",
          items: [
            "**The same bug passed 2,500 runs in a row** in the first five rows (2 threads with 10 or 100 increments, gate or no gate, and 1,000 increments without one). A test written at that size would be green in CI forever. In two more runs of the whole program those rows produced 0, 1 or a handful of failures each (for example, 2 threads by 100 without a gate: 0, 0 and 1 failure in 500).",
            "**The start gate is worth more than more threads.** At 2 threads by 1,000, the gate took the failure rate from 0% to 49% (75% and 85% in the other two runs). Without the gate the second thread often started after the first had finished its 1,000 increments: they never overlapped.",
            "**The amount of work per thread decides the odds.** Each thread must still be inside its loop when the other starts. At 10 increments the race is almost invisible (at most 2.2% even with 8 threads and a gate); at 10,000 it fails nearly every time.",
            "**The numbers moved a lot between runs.** 8 threads by 1,000 with the gate failed 329, 500 and 393 times in 500 in three runs. That's typical: the odds depend on what else the machine is doing. A test that relies on a 50% chance of catching a bug will pass half the time on a bug.",
            "**What to do with this:** a concurrency test needs enough overlapping work (a start gate and a loop long enough to overlap), and enough repetitions that the probability of missing a real race is small. If one run catches the bug with probability p, n runs miss it with probability (1 - p)^n: at p = 0.02, 200 runs still miss it about 2% of the time.",
          ],
        },
      ],
    },
    {
      title: "Stress Loops and jcstress",
      blocks: [
        {
          type: "paragraph",
          text: "A stress loop is the start gate run many times, with a check after every round. The reusable version is in Examples below; the idea is: fresh state per round, all threads released together, a deadline on every round, and stop at the first failing round so the state that broke is printed. It catches races that happen often. It can't control what the JIT does, which CPU each thread runs on, or how the two threads' instructions line up, and it gives no idea how likely the bug it **didn't** see is. That's what jcstress is for.",
        },
        {
          type: "heading",
          text: "jcstress: what it is",
        },
        {
          type: "paragraph",
          text: "jcstress (the Java Concurrency Stress tests harness, from the OpenJDK Code Tools project) runs a tiny concurrent scenario, a few `@Actor` methods on a shared `@State` object, hundreds of millions of times. It records every outcome, lines up the actors so they really run at the same instant, pins them to CPUs, and repeats the whole thing in many JVM configurations: each actor interpreted, compiled by C1 or by C2, and with C2's randomised scheduling flags (`-XX:+StressGCM`, `-XX:+StressLCM` and others) that shuffle instruction order the way a future JIT might. You declare which outcomes are acceptable, forbidden or interesting, and it counts them. I downloaded `jcstress-core-0.16.jar` and its three dependencies from Maven Central and wrote four tests, one per shape plus the fix:",
        },
        {
          type: "code",
          language: "java",
          title: "rides/TripCounterRace.java",
          code: `package rides;

import org.openjdk.jcstress.annotations.*;
import org.openjdk.jcstress.infra.results.I_Result;

import static org.openjdk.jcstress.annotations.Expect.*;

// Read-modify-write: two actors increment a volatile counter once each
@JCStressTest
@Outcome(id = "2", expect = ACCEPTABLE, desc = "Both increments counted")
@Outcome(id = "1", expect = ACCEPTABLE_INTERESTING, desc = "Lost update: both read 0")
@State
public class TripCounterRace {
    volatile int completedTrips;

    @Actor public void driverA() { completedTrips++; }
    @Actor public void driverB() { completedTrips++; }

    @Arbiter public void check(I_Result r) { r.r1 = completedTrips; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "rides/DriverCheckThenAct.java",
          code: `package rides;

import java.util.concurrent.ConcurrentHashMap;
import org.openjdk.jcstress.annotations.*;
import org.openjdk.jcstress.infra.results.II_Result;

import static org.openjdk.jcstress.annotations.Expect.*;

// Check-then-act on a ConcurrentHashMap: no data race, still a race condition
@JCStressTest
@Outcome(id = {"1, 0", "0, 1"}, expect = ACCEPTABLE, desc = "Exactly one rider got the driver")
@Outcome(id = "1, 1", expect = ACCEPTABLE_INTERESTING, desc = "Both riders told they got D-17")
@State
public class DriverCheckThenAct {
    final ConcurrentHashMap<String, String> assignments = new ConcurrentHashMap<>();

    int assign(String rider) {
        if (!assignments.containsKey("D-17")) {
            assignments.put("D-17", rider);
            return 1;
        }
        return 0;
    }

    @Actor public void riderA(II_Result r) { r.r1 = assign("asha"); }
    @Actor public void riderB(II_Result r) { r.r2 = assign("ravi"); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "rides/DriverPutIfAbsent.java",
          code: `package rides;

import java.util.concurrent.ConcurrentHashMap;
import org.openjdk.jcstress.annotations.*;
import org.openjdk.jcstress.infra.results.II_Result;

import static org.openjdk.jcstress.annotations.Expect.*;

// The fix: one atomic step
@JCStressTest
@Outcome(id = {"1, 0", "0, 1"}, expect = ACCEPTABLE, desc = "Exactly one rider got the driver")
@Outcome(id = "1, 1", expect = FORBIDDEN, desc = "Both riders told they got D-17")
@State
public class DriverPutIfAbsent {
    final ConcurrentHashMap<String, String> assignments = new ConcurrentHashMap<>();

    @Actor public void riderA(II_Result r) { r.r1 = assignments.putIfAbsent("D-17", "asha") == null ? 1 : 0; }
    @Actor public void riderB(II_Result r) { r.r2 = assignments.putIfAbsent("D-17", "ravi") == null ? 1 : 0; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "rides/FareUnsafePublication.java",
          code: `package rides;

import org.openjdk.jcstress.annotations.*;
import org.openjdk.jcstress.infra.results.I_Result;

import static org.openjdk.jcstress.annotations.Expect.*;

// Publication: a Quote with a non-final field, published through a plain field
@JCStressTest
@Outcome(id = "-1", expect = ACCEPTABLE, desc = "Not published yet")
@Outcome(id = "1500", expect = ACCEPTABLE, desc = "Published and fully built")
@Outcome(id = "0", expect = ACCEPTABLE_INTERESTING, desc = "Published, but fare not visible yet")
@State
public class FareUnsafePublication {
    static class Quote {
        int farePaise;                                   // not final
        Quote(int f) { farePaise = f; }
    }

    Quote latest;                                        // not volatile

    @Actor public void pricing() { latest = new Quote(1500); }

    @Actor public void rider(I_Result r) {
        Quote q = latest;
        r.r1 = (q == null) ? -1 : q.farePaise;
    }
}`,
        },
        {
          type: "paragraph",
          text: "The tests compile with plain `javac`: jcstress's annotation processor (registered in the jar's `META-INF/services`) generates the harness classes and a test list. The run used 4 CPUs, a 64 MB heap per forked JVM and the `quick` preset:",
        },
        {
          type: "code",
          language: "bash",
          code: `CP=jcstress-core-0.16.jar:jopt-simple-4.6.jar:jna-5.8.0.jar:jna-platform-5.8.0.jar
javac -cp $CP -d classes rides/*.java
time java -Xmx256m -cp $CP:classes org.openjdk.jcstress.Main -m quick -c 4 -hs 64 -t 'rides\\..*' -r report`,
        },
        {
          type: "paragraph",
          text: "While it runs, it prints each configuration. One of the 28 for the counter:",
        },
        {
          type: "output",
          text: `.......... [OK] rides.TripCounterRace

  Scheduling class:
    driverA: package group 0, core group 0
    driverB: package group 0, core group 0

  CPU allocation: 
    driverA: CPU #1 (package #0, core #1, thread #1)
    driverB: CPU #5 (package #0, core #1, thread #5)

  Compilation: split
    driverA: Interpreter
    driverB: C2

  JVM args: [-Xmx256m, -XX:+StressLCM, -XX:+StressGCM, -XX:+StressIGVN, -XX:+StressCCP, -XX:StressSeed=2089602588]
  Fork: #1

  RESULT     SAMPLES     FREQ       EXPECT  DESCRIPTION
       1      20,518    0.12%  Interesting  Lost update: both read 0
       2  17,237,913   99.88%   Acceptable  Both increments counted`,
        },
        {
          type: "paragraph",
          text: "And the totals across all configurations (the last two tests are printed with `-v`, which I got by re-parsing the saved results with `-p`):",
        },
        {
          type: "output",
          text: `RUN RESULTS:
  Interesting tests: 2 matching test results.

.......... [OK] rides.DriverCheckThenAct

  Results across all configurations:

  RESULT     SAMPLES     FREQ       EXPECT  DESCRIPTION
    0, 1  45,866,370   43.52%   Acceptable  Exactly one rider got the driver
    1, 0  49,224,306   46.70%   Acceptable  Exactly one rider got the driver
    1, 1  10,305,543    9.78%  Interesting  Both riders told they got D-17

.......... [OK] rides.TripCounterRace

  Results across all configurations:

  RESULT      SAMPLES     FREQ       EXPECT  DESCRIPTION
       1    1,730,886    0.46%  Interesting  Lost update: both read 0
       2  372,231,625   99.54%   Acceptable  Both increments counted

  Failed tests: No matches.

  Error tests: No matches.

  All remaining tests: 2 matching test results.
.......... [OK] rides.DriverPutIfAbsent
  Results across all configurations:
  RESULT     SAMPLES     FREQ      EXPECT  DESCRIPTION
    0, 1  50,931,038   44.04%  Acceptable  Exactly one rider got the driver
    1, 0  64,722,479   55.96%  Acceptable  Exactly one rider got the driver
    1, 1           0    0.00%   Forbidden  Both riders told they got D-17
.......... [OK] rides.FareUnsafePublication
  Results across all configurations:
  RESULT      SAMPLES     FREQ       EXPECT  DESCRIPTION
      -1  275,537,528   60.97%   Acceptable  Not published yet
       0            0    0.00%  Interesting  Published, but fare not visible yet
    1500  176,378,296   39.03%   Acceptable  Published and fully built

real\t2m46.383s`,
        },
        {
          type: "list",
          items: [
            "**The check-then-act double-booked 9.78% of the time**: over 10 million times, and in every one of the 28 configurations (from 1.15% to 24.64% depending on how the two actors were compiled). My hand-written loop saw it in 1.2% to 2.9% of trials, because jcstress lines the actors up far more precisely than two freshly started threads.",
            "**The counter lost an update in 0.46% of samples overall**, between 0.06% and 7.82% per configuration; the highest was with both actors interpreted. A single increment per actor gives a tiny window, and jcstress still found it 1.7 million times.",
            "**`putIfAbsent` never double-booked in 115,653,517 samples**, with the outcome marked `FORBIDDEN`: had it happened once, the test would have been reported as failed.",
            "**The unsafe publication never showed a torn object: 0 out of 451,915,824.** That doesn't make it correct. x86 keeps stores in order (its memory model is called TSO, total store order), and in this run C2 never moved the `farePaise` store after the `latest` store either. On ARM (AWS Graviton, Apple silicon) stores can be reordered, and the JMM allows the `0` outcome everywhere. A jcstress result is evidence about **this** CPU and **this** JIT; the JMM is what the code may rely on.",
            "**It took 2 minutes 46 seconds for four tests** in quick mode on 4 CPUs. The default mode runs far longer; jcstress belongs in a nightly job or in the build of a library, not in every developer's test run.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "When jcstress is worth it",
          text: "jcstress tests a few lines, not a service. It is the right tool for the small core of a concurrent component: a lock-free structure, a lazy initialiser, a custom cache's check-and-insert, a flag protocol between two threads. For whole flows (dispatching, payments), stress loops with a start gate and many repetitions are the practical tool, and the code they test should be built from pieces that jcstress or the JDK already proved.",
        },
      ],
    },
    {
      title: "Polling Instead of Sleeping",
      blocks: [
        {
          type: "paragraph",
          text: "The most common flaky concurrent test isn't about races in the code: it's a race in the **test**. Code finishes something asynchronously, and the test sleeps for a guess and then asserts. Completing a trip here writes the receipt on a pool thread, which takes 20 to 150 ms. I ran 100 tests per waiting strategy, with the same 100 write times for each (a fixed random seed):",
        },
        {
          type: "code",
          language: "java",
          title: "SleepVsPoll.java",
          code: `import static org.awaitility.Awaitility.await;

import java.time.Duration;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SleepVsPoll {
    // Completing a trip writes the receipt asynchronously; the write takes 20 to 150 ms
    static class TripService {
        final Set<String> receipts = ConcurrentHashMap.newKeySet();
        final ExecutorService io = Executors.newFixedThreadPool(4);
        void completeTrip(String tripId, long writeMillis) {
            io.execute(() -> {
                try { Thread.sleep(writeMillis); } catch (InterruptedException e) { return; }
                receipts.add(tripId);
            });
        }
    }

    interface Wait { void until(TripService s, String tripId) throws Exception; }

    static void measure(String label, Wait wait) throws Exception {
        Random rnd = new Random(42);                       // the same 100 write times for every strategy
        TripService service = new TripService();
        int failed = 0;
        long t0 = System.nanoTime();
        for (int run = 0; run < 100; run++) {
            String trip = "T-" + run;
            service.completeTrip(trip, 20 + rnd.nextInt(131));
            try {
                wait.until(service, trip);
                if (!service.receipts.contains(trip)) failed++;  // the test's assertion
            } catch (org.awaitility.core.ConditionTimeoutException e) {
                failed++;
            }
        }
        service.io.shutdownNow();
        System.out.printf("%-28s failed %3d of 100, total %5d ms (%.0f ms per test)%n",
                label, failed, (System.nanoTime() - t0) / 1_000_000, (System.nanoTime() - t0) / 1e6 / 100);
    }

    public static void main(String[] args) throws Exception {
        measure("Thread.sleep(100)", (s, id) -> Thread.sleep(100));
        measure("Thread.sleep(300)", (s, id) -> Thread.sleep(300));
        measure("Awaitility, poll every 10ms", (s, id) -> await().atMost(Duration.ofSeconds(2))
                .pollInterval(Duration.ofMillis(10)).until(() -> s.receipts.contains(id)));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -cp awaitility-4.3.0.jar:hamcrest-3.0.jar SleepVsPoll.java",
        },
        {
          type: "output",
          text: `Thread.sleep(100)            failed  32 of 100, total 10036 ms (100 ms per test)
Thread.sleep(300)            failed   0 of 100, total 30029 ms (300 ms per test)
Awaitility, poll every 10ms  failed   0 of 100, total  8887 ms (89 ms per test)`,
        },
        {
          type: "list",
          items: [
            "**A sleep is a guess, and the guess fails in proportion to how wrong it is.** `sleep(100)` failed 32 tests in 100: every write slower than 100 ms. On a loaded CI machine the writes get slower and the failure rate climbs, which is why such tests are \"flaky in CI, fine on my laptop\".",
            "**A longer sleep fixes the flakiness by making every test slow.** `sleep(300)` passed all 100 and took 30 seconds, three times longer than needed, and it's still a guess: a GC pause or a slow disk on the CI box breaks it again.",
            "**Polling was both reliable and the fastest**: 0 failures and 89 ms per test, because it returns as soon as the condition holds (each test took about its own write time plus up to one 10 ms poll interval). `atMost` is the real timeout: only a genuinely broken system makes it wait 2 seconds and fail, with a `ConditionTimeoutException` that names the condition.",
            "**Without Awaitility**, the same idea is ten lines: loop until the condition is true or a deadline passes, sleeping a few milliseconds between checks, and fail with a message if the deadline passes. What matters is that the wait has an upper bound and returns early.",
            "**Even better is not needing to wait at all.** If the test can tell the code when to run its asynchronous work, there's nothing to poll for. That's the next section.",
          ],
        },
      ],
    },
    {
      title: "Injecting a Clock and an Executor",
      blocks: [
        {
          type: "paragraph",
          text: "Two things make concurrent code hard to test deterministically: **time** (\"expires after 15 seconds\") and **threads** (\"sends the push notification asynchronously\"). Both can be passed in instead of being reached for. A driver gets 15 seconds to accept a ride offer, and the offer's push notification goes through an executor:",
        },
        {
          type: "code",
          language: "java",
          title: "OfferService.java",
          code: `import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executor;

// A driver gets 15 seconds to accept a ride offer; the push notification is sent asynchronously
public class OfferService {
    public enum Result { ACCEPTED, EXPIRED, UNKNOWN }
    static final Duration TTL = Duration.ofSeconds(15);

    private final Clock clock;                        // injected: production passes Clock.systemUTC()
    private final Executor pushExecutor;              // injected: production passes a real pool
    private final Map<String, Instant> expiresAt = new ConcurrentHashMap<>();
    final List<String> pushed = new CopyOnWriteArrayList<>();

    public OfferService(Clock clock, Executor pushExecutor) {
        this.clock = clock;
        this.pushExecutor = pushExecutor;
    }

    public void offer(String driver, String trip) {
        expiresAt.put(driver + "/" + trip, clock.instant().plus(TTL));
        pushExecutor.execute(() -> pushed.add(driver + " <- " + trip));
    }

    public Result accept(String driver, String trip) {
        Instant deadline = expiresAt.remove(driver + "/" + trip);
        if (deadline == null) return Result.UNKNOWN;
        return clock.instant().isBefore(deadline) ? Result.ACCEPTED : Result.EXPIRED;
    }
}`,
        },
        {
          type: "paragraph",
          text: "For tests, a clock the test moves by hand, and an executor that queues tasks until the test runs them:",
        },
        {
          type: "code",
          language: "java",
          title: "MutableClock.java and ManualExecutor.java",
          code: `import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

// A clock the test moves by hand
public class MutableClock extends Clock {
    private volatile Instant now;
    public MutableClock(Instant start) { this.now = start; }
    public void advance(Duration d) { now = now.plus(d); }
    @Override public Instant instant() { return now; }
    @Override public ZoneId getZone() { return ZoneOffset.UTC; }
    @Override public Clock withZone(ZoneId zone) { return this; }
}

// ManualExecutor.java
import java.util.ArrayDeque;
import java.util.Queue;
import java.util.concurrent.Executor;

// Collects tasks; the test decides when (and in which order) they run, on its own thread
public class ManualExecutor implements Executor {
    private final Queue<Runnable> tasks = new ArrayDeque<>();
    @Override public synchronized void execute(Runnable r) { tasks.add(r); }
    public synchronized int pending() { return tasks.size(); }
    public void runAll() {
        Runnable r;
        while ((r = poll()) != null) r.run();
    }
    private synchronized Runnable poll() { return tasks.poll(); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "OfferServiceTest.java",
          code: `import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

class OfferServiceTest {
    final MutableClock clock = new MutableClock(Instant.parse("2026-11-16T09:00:00Z"));
    final ManualExecutor push = new ManualExecutor();
    final OfferService service = new OfferService(clock, push);

    @Test
    void acceptedOneMillisecondBeforeExpiry() {
        service.offer("D-17", "T-901");
        clock.advance(Duration.ofSeconds(15).minusMillis(1));
        assertEquals(OfferService.Result.ACCEPTED, service.accept("D-17", "T-901"));
    }

    @Test
    void expiredExactlyAtFifteenSeconds() {
        service.offer("D-17", "T-902");
        clock.advance(Duration.ofSeconds(15));
        assertEquals(OfferService.Result.EXPIRED, service.accept("D-17", "T-902"));
    }

    @RepeatedTest(1000)
    void pushIsSentOnlyWhenTheExecutorRuns() {
        service.offer("D-17", "T-903");
        assertEquals(1, push.pending());               // queued, not sent: no race with the assertion
        assertEquals(List.of(), service.pushed);
        push.runAll();
        assertEquals(List.of("D-17 <- T-903"), service.pushed);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out -cp junit-platform-console-standalone-1.12.2.jar *.java
java -jar junit-platform-console-standalone-1.12.2.jar execute -cp out --select-class OfferServiceTest --details=tree`,
        },
        {
          type: "output",
          text: `╷
├─ JUnit Platform Suite ✔
├─ JUnit Jupiter ✔
│  └─ OfferServiceTest ✔
│     ├─ expiredExactlyAtFifteenSeconds() ✔
│     ├─ acceptedOneMillisecondBeforeExpiry() ✔
│     └─ pushIsSentOnlyWhenTheExecutorRuns() ✔
│        ├─ repetition 1 of 1000 ✔
│        ...
│        └─ repetition 1000 of 1000 ✔
└─ JUnit Vintage ✔

Test run finished after 687 ms
[         5 containers successful ]
[         0 containers failed     ]
[      1002 tests successful      ]
[         0 tests failed          ]`,
        },
        {
          type: "list",
          items: [
            "**1,002 tests in 687 ms**, including the whole JUnit start-up. Testing the 15-second boundary with the real clock would take at least 15 seconds per test, and couldn't test \"one millisecond before\" at all: by the time `accept` runs, an unknown number of milliseconds has passed.",
            "**The boundary is now exact and repeatable.** 14.999 s is `ACCEPTED`, 15.000 s is `EXPIRED`, because the code uses `isBefore`. A real-clock test can't pin that down; this one documents it.",
            "**The asynchronous push has no race with the assertion.** With a real pool, the test would have to poll for the push (the previous section). With `ManualExecutor`, the push is provably not sent until the test says so, and then provably sent: 1,000 repetitions, identical every time.",
            "**This doesn't test the concurrency**; it removes it, to test the logic. The thread-safety of `OfferService` (a `ConcurrentHashMap`, a `remove` that makes `accept` single-use) still needs a stress test with a real pool. Both kinds are needed: deterministic tests for the rules, stress tests for the races.",
            "**The production cost is two constructor parameters.** `Clock.systemUTC()` and the real executor are passed in once, at wiring time. Code that calls `Instant.now()` or `CompletableFuture.runAsync(task)` without an executor can't be tested this way.",
          ],
        },
      ],
    },
    {
      title: "Timeouts So a Deadlock Fails Instead of Hanging",
      blocks: [
        {
          type: "paragraph",
          text: "A deadlock in a test doesn't fail the test: it hangs the build until a CI-level timeout kills the whole job, usually with no dump and no hint of which test. Every concurrent test needs its own deadline. I used a classic lock-ordering deadlock of the kind the previous lesson took apart (two locks taken in opposite order, with latches to make it certain) and tried JUnit 5's three ways of adding one:",
        },
        {
          type: "code",
          language: "java",
          title: "DeadlockTimeoutTest.java",
          code: `import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

class DeadlockTimeoutTest {
    static final Object WALLET = new Object(), LEDGER = new Object();

    // Locks WALLET then LEDGER on the calling thread, while a helper thread holds LEDGER and wants WALLET
    static void settleFareDeadlocks() throws InterruptedException {
        CountDownLatch helperHasLedger = new CountDownLatch(1), callerHasWallet = new CountDownLatch(1);
        Thread.ofPlatform().daemon().name("payout-helper").start(() -> {
            synchronized (LEDGER) {
                helperHasLedger.countDown();
                try { callerHasWallet.await(); } catch (InterruptedException e) { return; }
                synchronized (WALLET) { }
            }
        });
        synchronized (WALLET) {
            callerHasWallet.countDown();
            helperHasLedger.await();
            synchronized (LEDGER) { }                       // BLOCKED forever: not interruptible
        }
    }

    @Test
    void preemptiveTimeout() {
        assertTimeoutPreemptively(Duration.ofSeconds(2), DeadlockTimeoutTest::settleFareDeadlocks);
    }

    @Test
    @Timeout(value = 2, unit = TimeUnit.SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    void timeoutAnnotationSeparateThread() throws InterruptedException {
        settleFareDeadlocks();
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "SameThreadTimeoutTest.java",
          code: `import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

class SameThreadTimeoutTest {
    @Test
    @Timeout(value = 2, unit = TimeUnit.SECONDS)       // default thread mode: SAME_THREAD
    void timeoutAnnotationSameThread() throws InterruptedException {
        DeadlockTimeoutTest.settleFareDeadlocks();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -jar junit-platform-console-standalone-1.12.2.jar execute -cp out \\
    --select-class OfferServiceTest --select-class DeadlockTimeoutTest --details=tree
date +%T; timeout 20 java -jar junit-platform-console-standalone-1.12.2.jar execute -cp out \\
    --select-class SameThreadTimeoutTest --details=tree; echo "exit=$?"; date +%T`,
        },
        {
          type: "output",
          text: `│  └─ DeadlockTimeoutTest ✔
│     ├─ timeoutAnnotationSeparateThread() ✘ timeoutAnnotationSeparateThread() timed out after 2 seconds
│     └─ preemptiveTimeout() ✘ execution timed out after 2000 ms

Failures (2):
  JUnit Jupiter:DeadlockTimeoutTest:timeoutAnnotationSeparateThread()
    => java.util.concurrent.TimeoutException: timeoutAnnotationSeparateThread() timed out after 2 seconds
     Caused by: org.junit.jupiter.api.AssertTimeoutPreemptively$ExecutionTimeoutException: Execution timed out in thread junit-timeout-thread-1
       DeadlockTimeoutTest.settleFareDeadlocks(DeadlockTimeoutTest.java:25)
       DeadlockTimeoutTest.timeoutAnnotationSeparateThread(DeadlockTimeoutTest.java:37)
       ...
  JUnit Jupiter:DeadlockTimeoutTest:preemptiveTimeout()
    => org.opentest4j.AssertionFailedError: execution timed out after 2000 ms
     Caused by: org.junit.jupiter.api.AssertTimeoutPreemptively$ExecutionTimeoutException: Execution timed out in thread junit-timeout-thread-2
       DeadlockTimeoutTest.settleFareDeadlocks(DeadlockTimeoutTest.java:23)
       ...

Test run finished after 4892 ms

01:06:38
Terminated
exit=124
01:06:58`,
        },
        {
          type: "list",
          items: [
            "**`assertTimeoutPreemptively` and `@Timeout(threadMode = SEPARATE_THREAD)` both failed the deadlock after 2 seconds**, with a stack trace of the stuck thread pointing at line 25, the inner `synchronized (LEDGER)`. They run the test body on a separate thread and stop waiting for it.",
            "**The default `@Timeout` hung forever.** In `SAME_THREAD` mode JUnit runs the test on its own thread and, when time is up, **interrupts** it. A thread `BLOCKED` on a monitor ignores interrupts, so nothing happened; the JUnit run printed nothing and was killed by the shell's `timeout` after 20 seconds (`exit=124`). It works for code that waits interruptibly (`sleep`, `join`, `await`, `lock.lockInterruptibly`), not for `synchronized` or `lock()`.",
            "**Stopping waiting is not stopping the thread.** Java can't kill a thread. After a preemptive timeout, the deadlocked thread and its helper are still alive and still holding their locks.",
            "**That's why the second test failed at line 23, not 25.** In the run above, `timeoutAnnotationSeparateThread` ran first and leaked a thread holding `WALLET`. When `preemptiveTimeout` ran, its thread couldn't even enter `synchronized (WALLET)`: it was blocked on the leaked thread, not on its own deadlock. (The frame says 23 rather than 22, the `synchronized` line: in my traces, a thread stuck entering a monitor was reported at the line of the instruction **after** the `monitorenter`, which for a block whose body starts on the next line is one line below the `synchronized` statement.) Run alone, `preemptiveTimeout` reported line 25.",
          ],
        },
        {
          type: "paragraph",
          text: "To confirm the leak, I ran the preemptive assertion twice from a plain `main` and then asked the JVM which threads were blocked and on whom:",
        },
        {
          type: "code",
          language: "java",
          title: "LeakCheck.java",
          code: `import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.time.Duration;

public class LeakCheck {
    public static void main(String[] args) {
        for (int test = 1; test <= 2; test++) {
            try {
                assertTimeoutPreemptively(Duration.ofSeconds(2), DeadlockTimeoutTest::settleFareDeadlocks);
            } catch (Throwable e) {
                System.out.println("test " + test + ": " + e.getMessage());
            }
        }
        for (ThreadInfo ti : ManagementFactory.getThreadMXBean().dumpAllThreads(true, false)) {
            if (ti.getThreadState() == Thread.State.BLOCKED) {
                System.out.printf("%-22s BLOCKED on %s owned by %s, at %s%n", ti.getThreadName(),
                        ti.getLockName(), ti.getLockOwnerName(), ti.getStackTrace()[0]);
            }
        }
        long[] dl = ManagementFactory.getThreadMXBean().findMonitorDeadlockedThreads();
        System.out.println("deadlocked threads reported by the JVM: " + (dl == null ? 0 : dl.length));
        System.exit(0);
    }
}`,
        },
        {
          type: "output",
          text: `test 1: execution timed out after 2000 ms
test 2: execution timed out after 2000 ms
junit-timeout-thread-1 BLOCKED on java.lang.Object@17f052a3 owned by payout-helper, at app//DeadlockTimeoutTest.settleFareDeadlocks(DeadlockTimeoutTest.java:25)
payout-helper          BLOCKED on java.lang.Object@1d56ce6a owned by junit-timeout-thread-1, at app//DeadlockTimeoutTest.lambda$settleFareDeadlocks$0(DeadlockTimeoutTest.java:19)
junit-timeout-thread-2 BLOCKED on java.lang.Object@1d56ce6a owned by junit-timeout-thread-1, at app//DeadlockTimeoutTest.settleFareDeadlocks(DeadlockTimeoutTest.java:23)
payout-helper          BLOCKED on java.lang.Object@17f052a3 owned by payout-helper, at app//DeadlockTimeoutTest.lambda$settleFareDeadlocks$0(DeadlockTimeoutTest.java:17)
deadlocked threads reported by the JVM: 2`,
        },
        {
          type: "list",
          items: [
            "**Four threads were stuck after two \"failed\" tests.** The first test's pair is a real deadlock (each owns what the other wants), and the JVM's detector reports exactly those 2 threads. The second test's pair is blocked **behind** the first: `junit-timeout-thread-2` waits for `WALLET`, owned by the leaked `junit-timeout-thread-1`, and the second `payout-helper` waits for `LEDGER`, owned by the first `payout-helper`. They aren't in a cycle, so the detector doesn't count them, but they'll never run either.",
            "**Consequences for a test suite:** after one deadlock, every later test that touches the same static locks fails for the wrong reason. Make the threads daemons (so they can't keep the JVM alive), avoid static locks in code under test, and treat the **first** timeout in a run as the real failure.",
            "**On a timeout, dump the threads.** The stack trace in the JUnit failure shows only the test thread. `ThreadMXBean.findDeadlockedThreads()` and `dumpAllThreads(true, true)` in a failure handler, or `jcmd <pid> Thread.print -l` from the CI script, show the other side of the cycle.",
          ],
        },
        {
          type: "heading",
          text: "Without JUnit: a timed join",
        },
        {
          type: "paragraph",
          text: "The same safety net needs no framework: run the code under test on its own daemon thread, `join` with a deadline, and if it's still alive, report what it's stuck on:",
        },
        {
          type: "code",
          language: "java",
          title: "TimedJoin.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.util.concurrent.CountDownLatch;

// No test framework: run the code under test in its own thread, join with a deadline, report what is stuck
public class TimedJoin {
    static final Object WALLET = new Object(), LEDGER = new Object();

    // WALLET then LEDGER on the calling thread; a helper holds LEDGER and wants WALLET
    static void settleFare() throws InterruptedException {
        CountDownLatch helperHasLedger = new CountDownLatch(1), callerHasWallet = new CountDownLatch(1);
        Thread.ofPlatform().daemon().name("payout-helper").start(() -> {
            synchronized (LEDGER) {
                helperHasLedger.countDown();
                try { callerHasWallet.await(); } catch (InterruptedException e) { return; }
                synchronized (WALLET) { }
            }
        });
        synchronized (WALLET) {
            callerHasWallet.countDown();
            helperHasLedger.await();
            synchronized (LEDGER) { }
        }
    }

    static void runWithDeadline(String name, long millis, Runnable body) throws InterruptedException {
        Thread t = Thread.ofPlatform().daemon().name(name).start(body);   // daemon: a stuck one can't keep the JVM alive
        t.join(millis);
        if (!t.isAlive()) { System.out.println(name + ": passed"); return; }

        System.out.println(name + ": FAILED, still running after " + millis + " ms, state " + t.getState());
        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        long[] ids = mx.findDeadlockedThreads();                          // monitors and ownable synchronizers
        if (ids != null) {
            for (ThreadInfo ti : mx.getThreadInfo(ids, true, true)) {
                System.out.printf("  deadlocked: %s waiting for %s held by %s%n",
                        ti.getThreadName(), ti.getLockName(), ti.getLockOwnerName());
            }
        }
        throw new AssertionError(name + " timed out");
    }

    public static void main(String[] args) throws Exception {
        runWithDeadline("settle-fare-uncontended", 2_000, () -> { synchronized (WALLET) { } });
        long t0 = System.nanoTime();
        try {
            runWithDeadline("settle-fare", 2_000, () -> {
                try { settleFare(); } catch (InterruptedException e) { }
            });
        } catch (AssertionError e) {
            System.out.printf("caught: %s after %d ms%n", e.getMessage(), (System.nanoTime() - t0) / 1_000_000);
        }
    }
}`,
        },
        {
          type: "output",
          text: `settle-fare-uncontended: passed
settle-fare: FAILED, still running after 2000 ms, state BLOCKED
  deadlocked: settle-fare waiting for java.lang.Object@4f6ee6e4 held by payout-helper
  deadlocked: payout-helper waiting for java.lang.Object@4f18837a held by settle-fare
caught: settle-fare timed out after 2032 ms`,
        },
        {
          type: "paragraph",
          text: "The deadlock failed in 2,032 ms with both sides of the cycle named, which is more than the JUnit failure message gave. The pattern is what `assertTimeoutPreemptively` does internally (a separate thread and a bounded wait), plus the diagnosis. In a JUnit suite, the same `ThreadMXBean` code fits in a test extension or a shared helper called on timeout.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "What happens, step by step, when two dispatcher threads run the check-then-act from the incident below at the same moment, and how each tool sees it:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Both threads pass the start gate within microseconds of each other: `start.countDown()` unparks the first waiter, which unparks the next.",
            "Thread A calls `status.get(\"D-3\")`. `ConcurrentHashMap.get` reads the bin with a volatile read, without locking, and returns `AVAILABLE`.",
            "Thread B calls `status.get(\"D-3\")` before A's `put`. It also reads `AVAILABLE`. Nothing is wrong yet: two correct reads of the current value.",
            "Thread A computes the pickup ETA (a few hundred multiplications). The window between check and act is now open on both threads.",
            "Thread A calls `status.put(\"D-3\", ON_TRIP)`. The map locks the bin, replaces the value, unlocks. The write happens-before any later read of that key.",
            "Thread B, already past its check, calls `put(\"D-3\", ON_TRIP)`, which locks the bin and writes the same value again. No error: putting `ON_TRIP` over `ON_TRIP` is a perfectly valid map operation.",
            "Both return `true`. Two trips are assigned to D-3. The map is consistent, every invariant the map itself guarantees holds, and the business invariant (one trip per driver) is broken.",
            "No thread waited, so a thread dump at any moment shows both threads `RUNNABLE` or already finished, and JFR records no contention. The only trace is in the data: two trips with one driver.",
            "With `replace(\"D-3\", AVAILABLE, ON_TRIP)`, step 6 is different: B's call locks the bin, sees `ON_TRIP` instead of the expected `AVAILABLE`, changes nothing and returns `false`. B moves on to the next driver.",
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
          title: "RaceAndTestCheatSheet.java",
          code: `// Read-modify-write: make the update one operation
counter.incrementAndGet();                       // AtomicInteger / AtomicLong
adder.increment();                               // LongAdder: hot counters, read rarely
tripsPerZone.merge(zone, 1, Integer::sum);       // ConcurrentHashMap counter

// Check-then-act: let the map decide
boolean won = assignments.putIfAbsent(driver, rider) == null;
boolean claimed = status.replace(driver, Status.AVAILABLE, Status.ON_TRIP);
Quote q = cache.computeIfAbsent(key, k -> price(k));   // keep the function short and side-effect free
synchronized (wallet) { if (wallet.balance >= fare) wallet.balance -= fare; }   // or one lock around both

// Publication: build first, then share through something that orders it
volatile Quote latest;                           // or final fields + no escaping 'this'
LIVE_QUOTES.add(Quote.create(zone, distance));   // factory: constructor finished before add

// Start gate
CountDownLatch ready = new CountDownLatch(n), start = new CountDownLatch(1), done = new CountDownLatch(n);
// worker: ready.countDown(); start.await(); work(); finally done.countDown();
// test:   ready.await(); start.countDown(); assertTrue(done.await(5, SECONDS));

// Polling instead of sleeping (Awaitility)
await().atMost(Duration.ofSeconds(2)).pollInterval(Duration.ofMillis(10)).until(() -> receipts.contains(id));

// Deterministic time and threads
new OfferService(Clock.systemUTC(), pool);       // production
new OfferService(mutableClock, manualExecutor);  // test: clock.advance(...), executor.runAll()

// Timeouts that work on a deadlock
assertTimeoutPreemptively(Duration.ofSeconds(2), () -> settleFare());
@Timeout(value = 2, unit = SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
// junit-platform.properties: junit.jupiter.execution.timeout.default = 10 s`,
        },
        {
          type: "code",
          language: "bash",
          title: "Diagnostics",
          code: `jcmd <pid> Thread.print -l                         # states, locks, owners, deadlocks (platform threads)
for i in 1 2 3; do jcmd <pid> Thread.print -l > d$i.txt; sleep 5; done
jcmd <pid> Thread.dump_to_file -format=json /tmp/t.json   # includes virtual threads; no states or locks in 21
grep -A1 'waiting to lock' d1.txt | sort | uniq -c       # quick hot-monitor count
java -XX:StartFlightRecording:filename=app.jfr,settings=default ...
jfr view contention-by-site app.jfr                       # JavaMonitorEnter grouped by stack
jfr print --events jdk.ThreadPark app.jfr                 # parks on j.u.c locks with durations
java -cp jcstress.jar:classes org.openjdk.jcstress.Main -m quick -t 'MyTest'`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A reusable stress loop",
        },
        {
          type: "paragraph",
          text: "A rider's wallet is debited by concurrent fare captures (a trip fare and a tip, a retry of the same capture, a split fare). Four captures of 300 against a balance of 1,000: at most three can succeed, and balance plus captured must always equal 1,000. The helper runs a scenario on N threads behind a start gate, with fresh state per round, a deadline per round, and stops at the first round whose check fails:",
        },
        {
          type: "code",
          language: "java",
          title: "Stress.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

public class Stress {
    // Runs 'body' on N threads released together, 'rounds' times; stops at the first round whose check fails
    static <S> void repeat(String name, int rounds, int threads, Supplier<S> fresh,
                           java.util.function.BiConsumer<S, Integer> body, java.util.function.Predicate<S> ok) throws InterruptedException {
        long t0 = System.nanoTime();
        for (int round = 1; round <= rounds; round++) {
            S state = fresh.get();
            CountDownLatch ready = new CountDownLatch(threads), start = new CountDownLatch(1), done = new CountDownLatch(threads);
            AtomicReference<Throwable> error = new AtomicReference<>();
            for (int t = 0; t < threads; t++) {
                int id = t;
                Thread.ofPlatform().daemon().start(() -> {
                    try {
                        ready.countDown();
                        start.await();
                        body.accept(state, id);
                    } catch (Throwable e) {
                        error.compareAndSet(null, e);
                    } finally {
                        done.countDown();
                    }
                });
            }
            ready.await();
            start.countDown();
            if (!done.await(5, TimeUnit.SECONDS)) throw new AssertionError(name + ": round " + round + " hung for 5 s");
            if (error.get() != null) throw new AssertionError(name + ": round " + round + " threw", error.get());
            if (!ok.test(state)) {
                System.out.printf("%-22s FAILED in round %d of %d: %s%n", name, round, rounds, state);
                return;
            }
        }
        System.out.printf("%-22s passed %d rounds in %d ms%n", name, rounds, (System.nanoTime() - t0) / 1_000_000);
    }

    static class Wallet {                                   // a rider's wallet, debited by concurrent fare captures
        int balance = 1_000;
        int captured;
        void capture(int amount) { if (balance >= amount) { balance -= amount; captured += amount; } }
        synchronized void captureSafely(int amount) { capture(amount); }
        public String toString() { return "balance=" + balance + " captured=" + captured; }
    }

    public static void main(String[] args) throws Exception {
        // 4 threads each try to capture 300 from 1,000: at most 3 captures can succeed, and money must add up
        repeat("unsynchronized capture", 10_000, 4, Wallet::new, (w, id) -> w.capture(300),
                w -> w.balance >= 0 && w.balance + w.captured == 1_000);
        repeat("synchronized capture", 10_000, 4, Wallet::new, (w, id) -> w.captureSafely(300),
                w -> w.balance >= 0 && w.balance + w.captured == 1_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx128m Stress.java   # five runs",
        },
        {
          type: "output",
          text: `unsynchronized capture FAILED in round 148 of 10000: balance=100 captured=1200
synchronized capture   passed 10000 rounds in 2647 ms
unsynchronized capture passed 10000 rounds in 2696 ms
synchronized capture   passed 10000 rounds in 2620 ms
unsynchronized capture FAILED in round 146 of 10000: balance=100 captured=1200
synchronized capture   passed 10000 rounds in 2785 ms
unsynchronized capture FAILED in round 68 of 10000: balance=100 captured=1200
synchronized capture   passed 10000 rounds in 2677 ms
unsynchronized capture FAILED in round 1 of 10000: balance=100 captured=600
synchronized capture   passed 10000 rounds in 2701 ms`,
        },
        {
          type: "list",
          items: [
            "**The unsynchronized wallet captured 1,200 from a balance of 1,000**, four captures where three were possible, and still showed `balance=100`: both a check-then-act (`balance >= amount` checked by all four before any debit) and a read-modify-write (`balance -= amount` losing updates) in two lines.",
            "**One run in five passed all 10,000 rounds.** Across eight runs of this program (including three before I removed two unused imports), the broken wallet failed in round 1, 68, 143, 146 or 148 six times and passed all 10,000 rounds twice. A stress test is a probability, not a proof, and it should run often (every CI build) so that its misses don't line up.",
            "**The helper reports the failing state**, not just \"assertion failed\": `balance=100 captured=1200` tells you immediately that more money left than existed. Print the state in the failure message of every stress test.",
            "**About 0.27 ms per round**, almost all of it creating four platform threads. 10,000 rounds in under 3 seconds is cheap enough to run on every build.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: The race that only exists without the gate",
        },
        {
          type: "paragraph",
          text: "The same `CheckThenAct` program, with the `ready` and `start` latches removed so each trial just starts two threads in a row:",
        },
        {
          type: "output",
          text: `containsKey then put       both riders got D-17 in  154 of 20000 trials`,
        },
        {
          type: "paragraph",
          text: "154 double bookings in 20,000 (one run), against 248 to 583 with the gate. With a race this tight, the gap between starting two threads is sometimes small enough on its own, but the gate still gave 1.6 to 3.8 times as many hits. For the racy counter earlier, where the second thread usually started after the first had finished, the gate made the difference between 0% and 49%. The gate matters most exactly when the work per thread is short, which is the usual case for the operation under test.",
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
            ["A counter, total or tally shared by threads", "`AtomicLong`, `LongAdder`, `map.merge(k, 1, Integer::sum)`", "`volatile` with `++`; `get` then `put`"],
            ["\"Only if not already taken\" on a map", "`putIfAbsent`, `computeIfAbsent`, `replace(k, expected, new)`", "`containsKey`/`get` followed by `put`"],
            ["An invariant spanning several fields (balance and captured)", "One lock around the whole check and update, or an immutable state object swapped with CAS", "Separate atomics per field"],
            ["Sharing an object with other threads", "Finish construction, then publish through `volatile`, a lock or a concurrent collection", "Registering `this` or starting threads from a constructor"],
            ["Service slow, many threads waiting", "Three `Thread.print -l` dumps a few seconds apart; JFR `contention-by-site`", "One dump; reading the header text instead of the state"],
            ["Service on virtual threads looks idle but hangs", "`Thread.dump_to_file -format=json`", "`Thread.print` alone (it doesn't list virtual threads)"],
            ["Testing the logic of time-based or async code", "Injected `Clock` and `Executor`", "`Thread.sleep` in tests; `Instant.now()` in code"],
            ["Testing that concurrent code is actually thread-safe", "Start gate + stress loop with many rounds, real threads", "One run of two threads started in a loop"],
            ["A small lock-free or lazy-init core", "jcstress", "Hand-written loops that can't control JIT or CPU placement"],
            ["Waiting for an async result in a test", "Awaitility (`atMost` + polling)", "A fixed sleep"],
            ["Any test that could deadlock", "`assertTimeoutPreemptively` or `@Timeout(threadMode = SEPARATE_THREAD)`; a global default timeout", "`@Timeout` in the default `SAME_THREAD` mode around `synchronized` code"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "\"It's a ConcurrentHashMap, so it's thread-safe\"",
        },
        {
          type: "paragraph",
          text: "Each method is thread-safe; a sequence of methods is not. `containsKey` then `put` double-booked a driver in up to 2.9% of my trials and 9.78% of jcstress samples. Any decision that reads the map and then writes it must be a single map operation, or must be inside one lock.",
        },
        {
          type: "heading",
          text: "Making a field volatile to fix a lost update",
        },
        {
          type: "paragraph",
          text: "`volatile` makes each read and write visible and ordered; it doesn't make `count++` one step. The bytecode is identical apart from a flag, and the racy counter in this lesson was `volatile` the whole time while losing, in the worst row, an average of 60,306 updates per failing run. Use an atomic or a lock.",
        },
        {
          type: "heading",
          text: "Trusting a concurrency test because it passed",
        },
        {
          type: "paragraph",
          text: "The same racy counter passed 2,500 runs in a row at small sizes. A test that never fails on the broken version proves nothing about the fixed one. Before trusting a concurrency test, run it against a deliberately broken version and check that it fails reliably.",
        },
        {
          type: "heading",
          text: "Thread.sleep in tests",
        },
        {
          type: "paragraph",
          text: "Too short and it's flaky (32 failures in 100 at 100 ms), long enough and it's slow (30 seconds for 100 tests at 300 ms), and either way it breaks when CI is slower than the guess. Poll with a deadline, or inject an executor so there's nothing to wait for.",
        },
        {
          type: "heading",
          text: "Relying on the default @Timeout for deadlocks",
        },
        {
          type: "paragraph",
          text: "In `SAME_THREAD` mode the timeout interrupts the test thread, which a thread blocked on `synchronized` ignores: my test hung until the shell killed it. Use `assertTimeoutPreemptively` or `threadMode = SEPARATE_THREAD`, and set `junit.jupiter.execution.timeout.default` (with `junit.jupiter.execution.timeout.thread.mode.default = SEPARATE_THREAD`) so no test can hang the build.",
        },
        {
          type: "heading",
          text: "Searching a dump only for BLOCKED",
        },
        {
          type: "paragraph",
          text: "Every thread waiting for a `ReentrantLock`, `ReadWriteLock` or `Semaphore` is `WAITING (parking)`, not `BLOCKED`. Its owner is only visible in `Locked ownable synchronizers`, which needs `-l`. And parking on a `ConditionObject` is usually an idle thread, not contention.",
        },
        {
          type: "heading",
          text: "Taking one dump",
        },
        {
          type: "paragraph",
          text: "One dump can't distinguish a hot lock from bad luck, or a deadlock from a slow call. Take three, a few seconds apart, and compare addresses, owners and `cpu=` values.",
        },
        {
          type: "heading",
          text: "Letting `this` escape from a constructor",
        },
        {
          type: "paragraph",
          text: "Registering a listener, adding to a shared queue or starting a thread with `this` inside a constructor publishes an unfinished object: 377 to 1,430 of 200,000 quotes were read with a fare of 0, even though the field was `final`. Moving the `add` after the last field assignment brought it to 0 in three runs; a factory method makes it impossible to get wrong.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Name every invariant that spans more than one step (\"one trip per driver\", \"balance plus captured is constant\") and make sure one atomic operation or one lock covers each.",
            "Prefer operations that decide and write in one call: `merge`, `compute`, `putIfAbsent`, `replace(k, old, new)`, `compareAndSet`.",
            "Build objects completely before sharing them; prefer immutable objects with `final` fields and factories over constructors that register themselves.",
            "Name your threads and pools; without names, dumps and JFR views are lists of `pool-3-thread-7`.",
            "In an incident, take three `Thread.print -l` dumps a few seconds apart, plus a JSON dump if virtual threads are in use, and keep a continuous JFR recording so contention is already on disk.",
            "Write concurrency tests with a start gate, enough work per thread to overlap, many rounds, a deadline per round, and the failing state in the message. Check that each test fails on a broken version.",
            "Inject `Clock` and `Executor` into anything time-based or asynchronous; test the rules deterministically and the races with real threads.",
            "Poll with a deadline (Awaitility or a small helper) instead of sleeping.",
            "Give every concurrent test a preemptive timeout, and a global default for the whole suite.",
            "Use jcstress for the small, critical cores (lock-free structures, initialisation protocols), in a nightly job.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Is it safe to take thread dumps from a busy production JVM? `Thread.print` stops every Java thread at a **safepoint** (a point where the JVM can inspect all threads safely) while it walks the stacks. I started 100, 1,000 and 3,000 platform threads, each 30 frames deep and `BLOCKED` on one monitor, took three dumps of each, and read the pauses from the JVM's safepoint log:",
        },
        {
          type: "code",
          language: "java",
          title: "ManyBlocked.java",
          code: `import java.util.concurrent.CountDownLatch;

public class ManyBlocked {
    static final Object FARE_TABLE = new Object();

    static void depth(int n, CountDownLatch started) {            // a 30-frame stack, like a real request
        if (n > 0) { depth(n - 1, started); return; }
        started.countDown();
        synchronized (FARE_TABLE) { }                             // BLOCKED: main holds it
    }

    public static void main(String[] args) throws Exception {
        int n = Integer.parseInt(args[0]);
        CountDownLatch started = new CountDownLatch(n);
        synchronized (FARE_TABLE) {
            for (int i = 0; i < n; i++) Thread.ofPlatform().daemon().name("req-" + i).start(() -> depth(30, started));
            started.await();
            System.out.println(n + " threads blocked; pid " + ProcessHandle.current().pid());
            Thread.sleep(Long.parseLong(args[1]));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx128m -Xss256k -Xlog:safepoint=info:file=sp-$n.log ManyBlocked $n 20000 &
for k in 1 2 3; do /usr/bin/time -f "%e s" jcmd $PID Thread.print -l > dump-$n-$k.txt; done
grep -E 'PrintThreads|FindDeadlocks' sp-$n.log    # "Total: ... ns" per safepoint`,
        },
        {
          type: "output",
          text: `[1.810s][info][safepoint] Safepoint "PrintThreads", Time since last: 740316718 ns, Reaching safepoint: 196750 ns, Cleanup: 9055 ns, At safepoint: 55226241 ns, Leaving safepoint: 113978 ns, Total: 55546024 ns
[1.811s][info][safepoint] Safepoint "FindDeadlocks", Time since last: 69390 ns, Reaching safepoint: 64439 ns, Cleanup: 5074 ns, At safepoint: 837079 ns, Leaving safepoint: 13997 ns, Total: 920589 ns`,
        },
        {
          type: "paragraph",
          text: "Those two lines are the first dump at 1,000 threads. The `Total` of every `PrintThreads` and `FindDeadlocks` safepoint, for all nine dumps, with the wall time of each `jcmd` call and the size of the dump file:",
        },
        {
          type: "table",
          headers: ["Threads", "jcmd wall time (3 dumps)", "PrintThreads pause", "FindDeadlocks pause", "Dump size"],
          rows: [
            ["100", "0.32 s, 0.13 s, 0.14 s", "10.9, 5.2, 2.9 ms", "0.1, 0.0, 0.0 ms", "194,562 bytes"],
            ["1,000", "0.38 s, 0.21 s, 0.22 s", "55.5, 25.4, 22.8 ms", "0.9, 0.9, 0.9 ms", "1,891,984 bytes"],
            ["3,000", "0.50 s, 0.38 s, 0.36 s", "72.7, 70.5, 67.8 ms", "6.9, 6.9, 6.4 ms", "5,667,985 bytes"],
            ["3,000, `Thread.dump_to_file -format=json`", "0.53 s, 0.27 s, 0.27 s", "none in the safepoint log", "none", "5,851,641 bytes"],
          ],
        },
        {
          type: "list",
          items: [
            "**A dump pauses the whole application** for as long as it takes to walk every stack: 3 to 11 ms at 100 threads, 23 to 56 ms at 1,000, about 70 ms at 3,000. Each `Thread.print -l` also ran a second, shorter safepoint to look for deadlocks (`FindDeadlocks`, up to 7 ms). The first dump of each run was slower (the tool was warming up).",
            "**That's acceptable during an incident**, which is when dumps are taken: three dumps cost a few hundred milliseconds of pause at most. Taking a dump every second as \"monitoring\" is not acceptable at a few thousand threads; use JFR for continuous data.",
            "**The JSON dump didn't stop the world.** With 3,000 threads, the safepoint log showed no `PrintThreads` operation for it, only a routine cleanup; JDK 21 captures each thread's stack separately instead of stopping all of them at once. The output was larger (5.9 MB) and has no lock information, so it complements `Thread.print` rather than replacing it.",
            "**Dumps are big.** 1.9 MB for 1,000 threads: copy them off the box and use a script like `hotlocks.py` rather than reading them in a terminal.",
            "**Testing costs.** A stress round with four new threads cost about 0.27 ms, so 10,000 rounds take about 3 seconds; the 500-repetition dispatch test below ran in about a second; jcstress took 2 minutes 46 seconds for four tests in quick mode. JFR's `default` settings are documented as designed for continuous use in production (low single-digit percent overhead); I didn't measure that here. These are single-machine measurements on a shared 8-core box with other work running, and they varied between runs.",
          ],
        },
      ],
    },
    {
      title: "Race Conditions in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing dispatch service kept each driver's status in a `ConcurrentHashMap<String, Status>`. To assign a driver, a dispatcher thread checked that the driver was `AVAILABLE`, computed the pickup ETA, and set the status to `ON_TRIP`. The unit tests passed, the concurrency test (two threads started in a loop, one run) passed, and the service ran fine for months. Then the dispatch pool was raised from 2 to 8 threads for a Friday evening surge, and support tickets started: two riders, one driver, both told \"Your driver is on the way\". The second rider waited, the driver never came, the rider cancelled and was refunded. There were no errors in the logs, no blocked threads in dumps, nothing unusual in JFR. I rebuilt the core of it:",
        },
        {
          type: "code",
          language: "java",
          title: "DispatchIncident.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

public class DispatchIncident {
    enum Status { AVAILABLE, ON_TRIP }

    interface Dispatcher { boolean tryAssign(Map<String, Status> status, String driver); }

    // What shipped: every call is thread-safe, the sequence is not
    static boolean checkThenAct(Map<String, Status> status, String driver) {
        if (status.get(driver) == Status.AVAILABLE) {
            pickupEtaSeconds(driver);                       // a little work between check and act
            status.put(driver, Status.ON_TRIP);
            return true;
        }
        return false;
    }

    // The fix: a conditional update, one atomic step inside the map
    static boolean conditionalReplace(Map<String, Status> status, String driver) {
        return status.replace(driver, Status.AVAILABLE, Status.ON_TRIP);
    }

    static int pickupEtaSeconds(String driver) {
        int h = driver.hashCode();
        for (int i = 0; i < 300; i++) h = h * 31 + i;
        return Math.abs(h % 900);
    }

    // One dispatch "minute": 40 drivers in a hot zone, 'threads' dispatchers share 32 ride requests.
    // Returns how many drivers were handed more than one trip.
    static int oneMinute(int threads, Dispatcher d) throws InterruptedException {
        Map<String, Status> status = new ConcurrentHashMap<>();
        List<String> drivers = new ArrayList<>();
        for (int i = 0; i < 40; i++) { drivers.add("D-" + i); status.put("D-" + i, Status.AVAILABLE); }
        Map<String, AtomicInteger> tripsPerDriver = new ConcurrentHashMap<>();
        CountDownLatch ready = new CountDownLatch(threads), start = new CountDownLatch(1);
        Thread[] ts = new Thread[threads];
        for (int t = 0; t < threads; t++) {
            int requests = 32 / threads;
            ts[t] = Thread.ofPlatform().start(() -> {
                ready.countDown();
                try { start.await(); } catch (InterruptedException e) { return; }
                for (int r = 0; r < requests; r++) {
                    int from = ThreadLocalRandom.current().nextInt(drivers.size());   // nearest driver first
                    for (int k = 0; k < drivers.size(); k++) {
                        String driver = drivers.get((from + k) % drivers.size());
                        if (d.tryAssign(status, driver)) {
                            tripsPerDriver.computeIfAbsent(driver, x -> new AtomicInteger()).incrementAndGet();
                            break;
                        }
                    }
                }
            });
        }
        ready.await();
        start.countDown();
        for (Thread t : ts) t.join();
        return (int) tripsPerDriver.values().stream().filter(c -> c.get() > 1).count();
    }

    static void simulate(String label, int threads, Dispatcher d, int minutes) throws InterruptedException {
        int badMinutes = 0, doubleBooked = 0;
        for (int m = 0; m < minutes; m++) {
            int dup = oneMinute(threads, d);
            if (dup > 0) badMinutes++;
            doubleBooked += dup;
        }
        System.out.printf("%-20s %2d dispatcher threads: %4d of %d minutes had a double booking, %5d drivers double-booked%n",
                label, threads, badMinutes, minutes, doubleBooked);
    }

    public static void main(String[] args) throws Exception {
        int minutes = 2_000;
        simulate("check-then-act", 1, DispatchIncident::checkThenAct, minutes);
        simulate("check-then-act", 2, DispatchIncident::checkThenAct, minutes);
        simulate("check-then-act", 8, DispatchIncident::checkThenAct, minutes);
        simulate("replace(k, old, new)", 8, DispatchIncident::conditionalReplace, minutes);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m DispatchIncident.java   # three runs",
        },
        {
          type: "output",
          text: `check-then-act        1 dispatcher threads:    0 of 2000 minutes had a double booking,     0 drivers double-booked
check-then-act        2 dispatcher threads:   39 of 2000 minutes had a double booking,    39 drivers double-booked
check-then-act        8 dispatcher threads:   72 of 2000 minutes had a double booking,    75 drivers double-booked
replace(k, old, new)  8 dispatcher threads:    0 of 2000 minutes had a double booking,     0 drivers double-booked

check-then-act        1 dispatcher threads:    0 of 2000 minutes had a double booking,     0 drivers double-booked
check-then-act        2 dispatcher threads:   47 of 2000 minutes had a double booking,    48 drivers double-booked
check-then-act        8 dispatcher threads:   87 of 2000 minutes had a double booking,    88 drivers double-booked
replace(k, old, new)  8 dispatcher threads:    0 of 2000 minutes had a double booking,     0 drivers double-booked

check-then-act        1 dispatcher threads:    0 of 2000 minutes had a double booking,     0 drivers double-booked
check-then-act        2 dispatcher threads:   45 of 2000 minutes had a double booking,    48 drivers double-booked
check-then-act        8 dispatcher threads:   53 of 2000 minutes had a double booking,    54 drivers double-booked
replace(k, old, new)  8 dispatcher threads:    0 of 2000 minutes had a double booking,     0 drivers double-booked`,
        },
        {
          type: "list",
          items: [
            "**The bug was always there; the load decided how often it fired.** One dispatcher thread can't race with itself: 0 double bookings. Two threads: 39 to 48 double-booked drivers per 64,000 requests, roughly 1 request in 1,400, which in production looked like an occasional support ticket blamed on the app. Eight threads behind a start gate (a burst of requests arriving together, like a surge): 54 to 88. It's a rare event per request, multiplied by evening volume.",
            "**Nothing in the observability stack could see it.** No thread waited, so dumps and JFR were clean. The map was consistent. The only evidence was in the business data: two trips with the same driver and overlapping times. The query that found it in production was exactly that: trips grouped by driver where the pickup windows overlap.",
            "**The fix is one line**: `status.replace(driver, AVAILABLE, ON_TRIP)`, a **conditional update** that sets the new value only if the current value is still the expected one, atomically inside the map. 0 double bookings in all three runs. The ETA is computed after a successful claim; if the claim fails, the dispatcher moves to the next driver.",
          ],
        },
        {
          type: "heading",
          text: "The test that passed, and the test that would have caught it",
        },
        {
          type: "paragraph",
          text: "The same driver pool behind two JUnit tests. `DriverPool.tryAssign` contains either the check-then-act or the `replace` (chosen with `-Dfixed`):",
        },
        {
          type: "code",
          language: "java",
          title: "DriverPoolTest.java",
          code: `import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

class DriverPoolTest {
    static final boolean FIXED = Boolean.getBoolean("fixed");

    // Every request walks the driver list from 'from' and takes the first driver it can assign
    static void dispatch(DriverPool pool, int from, Map<String, AtomicInteger> trips) {
        for (int k = 0; k < 40; k++) {
            String d = "D-" + (from + k) % 40;
            if (pool.tryAssign(d)) { trips.computeIfAbsent(d, x -> new AtomicInteger()).incrementAndGet(); return; }
        }
    }

    static long doubleBooked(Map<String, AtomicInteger> trips) {
        return trips.values().stream().filter(c -> c.get() > 1).count();
    }

    // The test the team had: two threads started in a loop, one run
    @Test
    void twoDispatchersOnce() throws InterruptedException {
        DriverPool pool = new DriverPool(40, FIXED);
        Map<String, AtomicInteger> trips = new ConcurrentHashMap<>();
        Thread[] ts = new Thread[2];
        for (int t = 0; t < 2; t++) {
            int seed = t;
            ts[t] = Thread.ofPlatform().start(() -> { for (int r = 0; r < 16; r++) dispatch(pool, (seed * 7 + r * 3) % 40, trips); });
        }
        for (Thread t : ts) t.join();
        assertEquals(0, doubleBooked(trips));
    }

    // The stress test: 8 dispatchers behind a start gate, all aiming at the same drivers, repeated
    @RepeatedTest(500)
    @Timeout(value = 5, unit = TimeUnit.SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    void eightDispatchersStartedTogether() throws InterruptedException {
        DriverPool pool = new DriverPool(40, FIXED);
        Map<String, AtomicInteger> trips = new ConcurrentHashMap<>();
        CountDownLatch ready = new CountDownLatch(8), start = new CountDownLatch(1), done = new CountDownLatch(8);
        for (int t = 0; t < 8; t++) {
            int seed = t;
            Thread.ofPlatform().start(() -> {
                try {
                    ready.countDown();
                    start.await();
                    for (int r = 0; r < 4; r++) dispatch(pool, (seed + r) % 4, trips);   // everyone wants D-0..D-3 first
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        ready.await();
        start.countDown();
        done.await();
        assertEquals(0, doubleBooked(trips), "drivers with two trips");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Dfixed=false -jar junit-platform-console-standalone-1.12.2.jar execute -cp out --select-class DriverPoolTest
java -Dfixed=true  -jar junit-platform-console-standalone-1.12.2.jar execute -cp out --select-class DriverPoolTest
# and the old test alone, in 30 fresh JVMs (30 CI builds)
for i in $(seq 1 30); do java -jar junit-platform-console-standalone-1.12.2.jar execute -cp out \\
    --select-method DriverPoolTest#twoDispatchersOnce --details=none; done`,
        },
        {
          type: "output",
          text: `fixed=false
    => org.opentest4j.AssertionFailedError: drivers with two trips ==> expected: <0> but was: <6>
    => org.opentest4j.AssertionFailedError: drivers with two trips ==> expected: <0> but was: <8>
    => org.opentest4j.AssertionFailedError: drivers with two trips ==> expected: <0> but was: <4>
    ...
Test run finished after 1080 ms
[       289 tests successful      ]
[       212 tests failed          ]

fixed=true
Test run finished after 1021 ms
[       501 tests successful      ]
[         0 tests failed          ]

single-run test: passed 29, failed 1 of 30 JVM runs`,
        },
        {
          type: "list",
          items: [
            "**The old test passed 29 of 30 times** on the broken code. In CI, the one failure would have been re-run, passed, and been written off as flaky. That's how a real race ships: its test is \"flaky\" rather than red.",
            "**The stress test failed 212 of 500 repetitions** on the broken code, in about a second, and passed all 500 on the fixed one. The differences: a start gate, eight threads instead of two, every dispatcher aiming at the same four drivers first (maximum contention, like a surge zone), and 500 repetitions. A failure message with the number of double-booked drivers (6, 8, 4) shows that it's the race, not noise.",
            "**`@Timeout(threadMode = SEPARATE_THREAD)` on the stress test** means a future change that deadlocks the pool fails in 5 seconds instead of hanging the pipeline.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from it:",
        },
        {
          type: "list",
          items: [
            "Thread-safe collections make individual operations safe, not decisions. Every \"check, then change\" on shared state needs to be one atomic operation: a conditional update.",
            "Races scale with concurrency and volume. Code that was fine at 2 threads and low traffic can fail daily at 8 threads in a surge, without any code change. Raising pool sizes is a change that needs a stress test.",
            "Some race conditions are only visible in business data. Add invariant checks (one active trip per driver) as queries or metrics, because dumps and JFR will never show them.",
            "A concurrency test that passes on the broken code is worse than none. Prove each one fails on a deliberately broken version.",
            "The same bug exists one level up: two **instances** of the dispatch service, each with its own map, can both assign the same driver no matter how correct each JVM is. That's the next lesson.",
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
              question: "What is a race condition?",
              answer:
                "A bug where the result depends on the timing of threads, so the same code with the same input can produce different results. The classic shapes are read-modify-write (`count++` losing updates), check-then-act (two threads both see a driver as free and both assign him) and publication (another thread sees an object before it's fully built). They usually don't crash; they leave wrong data behind.",
            },
            {
              question: "Why is count++ not thread-safe, even if count is volatile?",
              answer:
                "Because `count++` compiles to three bytecodes, `getfield`, `iadd`, `putfield`: a read, an add and a write. Two threads can both read 41 and both write 42. `volatile` only adds the `ACC_VOLATILE` flag, making each read and write visible and ordered; it doesn't merge them into one step. My `volatile` counter lost updates in up to 100% of runs at 8 threads by 10,000 increments. Use `AtomicInteger.incrementAndGet()`, `LongAdder` or a lock.",
            },
            {
              question: "Is ConcurrentHashMap enough to make my code thread-safe?",
              answer:
                "It makes each single operation thread-safe. A sequence like `if (!map.containsKey(k)) map.put(k, v)` is still a race: both threads can pass the check before either puts. I measured 248 to 583 double bookings in 20,000 trials with that code, and none with `putIfAbsent`. Use the map's atomic compound operations: `putIfAbsent`, `computeIfAbsent`, `compute`, `merge`, `replace(k, old, new)`.",
            },
            {
              question: "How do you take a thread dump?",
              answer:
                "`jcmd <pid> Thread.print -l` (the `-l` adds `Locked ownable synchronizers`, needed to see who holds a `ReentrantLock`), or `jstack -l <pid>`, or `kill -3 <pid>`, which prints to the JVM's stdout. On JDK 21 with virtual threads, add `jcmd <pid> Thread.dump_to_file -format=json <file>`, because `Thread.print` doesn't list unmounted virtual threads. Take three, a few seconds apart.",
            },
            {
              question: "Why is Thread.sleep a bad way to wait in a test?",
              answer:
                "It's a guess about timing. Too short and the test is flaky; long enough and every test is slow; and CI machines are slower than laptops. In my measurement, `sleep(100)` failed 32 of 100 tests, `sleep(300)` passed but took 30 seconds, and polling with Awaitility (`atMost(2s)`, every 10 ms) failed none and took 8.9 seconds in total, because it returns as soon as the condition holds.",
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
              question: "What's the difference between a data race and a race condition? Can you have one without the other?",
              answer:
                "A data race is a memory-model property: two accesses to the same variable, at least one a write, not ordered by happens-before. A race condition is a correctness property: the outcome depends on timing. Yes to both: check-then-act on a `ConcurrentHashMap` has no data race (every access goes through the map's synchronised operations) but is a race condition; jcstress saw both riders win in 9.78% of samples. And `String.hashCode()` caches its result in a plain `int` field with no synchronisation, a deliberate data race that isn't a race condition, because every thread computes the same value from immutable data and reads the field once.",
            },
            {
              question: "In a thread dump, what's the difference between 'waiting to lock' and 'parking to wait for'?",
              answer:
                "`- waiting to lock <addr>` appears under a `BLOCKED (on object monitor)` thread trying to enter `synchronized`; the owner has `- locked <addr>` in its stack. `- parking to wait for <addr>` appears under a `WAITING (parking)` or `TIMED_WAITING (parking)` thread inside `LockSupport.park`, which is how every `java.util.concurrent` lock and condition waits. If the object is a `...Sync` (like `ReentrantLock$NonfairSync`), it's waiting for a lock whose owner is listed under `Locked ownable synchronizers` (needs `-l`); if it's a `ConditionObject`, it's waiting for a signal, often an idle thread in `queue.take()`.",
            },
            {
              question: "How do you find a hot lock from thread dumps?",
              answer:
                "Take three `Thread.print -l` dumps a few seconds apart. Group waiting threads by the lock address in `waiting to lock` and `parking to wait for` lines (ignoring `ConditionObject` parks), and find each address's owner. A hot lock has many waiters on the same address in every dump; the owner's stack shows what it does while holding it (in my example, a 40 ms sleep inside a `synchronized` method, with five of six threads waiting in all three dumps). Different owners across dumps mean contention, not deadlock. Also compare `cpu=` per thread: values that don't change between dumps mean threads that never ran, which is starvation.",
            },
            {
              question: "What do jdk.JavaMonitorEnter and jdk.ThreadPark record, and what do they miss?",
              answer:
                "`JavaMonitorEnter` records a contended `synchronized` entry that took longer than the threshold (20 ms in `default`), with its duration, the monitor class, address and `previousOwner`. `ThreadPark` records a `LockSupport.park` over the threshold, with the parked-on class, which covers `java.util.concurrent` locks. Both are written when the wait **ends**. A thread that never gets the lock produces no event: in one of my recordings, five threads waited on a monitor for 10 seconds and JFR recorded exactly one enter event. So JFR measures waits that complete; a dump shows waits in progress. `jfr view contention-by-site` and `contention-by-thread` summarise them in JDK 21.",
            },
            {
              question: "How do you make a concurrency test actually catch races?",
              answer:
                "Make the threads overlap and repeat many times. A start gate (`ready` latch, `start` latch of 1, `done` latch) releases all threads together; enough work per thread keeps them overlapping; fresh state and an assertion per round; hundreds or thousands of rounds; a deadline per round. Then verify the test fails on a deliberately broken version. My racy counter passed 2,500 runs in a row at small sizes without that, while the same bug failed 49% to 85% of runs with a gate at 2 threads by 1,000.",
            },
            {
              question: "How do you test code that depends on time or runs things asynchronously, without sleeping?",
              answer:
                "Inject the dependencies. Pass a `java.time.Clock` instead of calling `Instant.now()`, and an `Executor` instead of using a hidden pool. In tests, a clock you advance by hand makes the 15-second offer expiry testable at exactly 14.999 and 15.000 seconds, and an executor that queues tasks until the test calls `runAll()` makes the async push deterministic. My 1,002 such tests ran in 687 ms. That tests the logic; thread-safety still needs a stress test with a real pool.",
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
              question: "What is jcstress and how does it differ from a stress loop?",
              answer:
                "jcstress is OpenJDK's harness for concurrency tests. You write `@Actor` methods on a `@State` object and declare each possible `@Outcome` as acceptable, forbidden or interesting. It runs the actors hundreds of millions of times, aligned to start together, pinned to CPUs, in many JVM configurations: interpreted, C1, C2, split per actor, and with C2's randomising stress flags. A stress loop can't control any of that. My four tests ran 28 configurations each in 2 minutes 46 seconds; check-then-act double-booked in every configuration (1.15% to 24.64%), the counter lost updates in every configuration (0.06% to 7.82%), and `putIfAbsent` produced the forbidden outcome 0 times in 115 million samples.",
            },
            {
              question: "Your jcstress test for unsafe publication shows 0 bad outcomes. Is the code correct?",
              answer:
                "No. It means this CPU and this JIT didn't reorder the stores in that run. My test, publishing a `Quote` with a non-final field through a plain field, saw 0 torn objects in 451,915,824 samples on x86, which keeps stores in order (TSO). The JMM allows the reader to see the reference before the field, ARM CPUs can actually reorder those stores, and a future JIT could too. Correctness comes from happens-before (`volatile`, a lock, `final` fields with no escaping `this`), not from a test result on one machine.",
            },
            {
              question: "Why can a final field be read as its default value?",
              answer:
                "The JMM's `final` field guarantee (other threads see the value set in the constructor) only holds if `this` doesn't escape during construction. If the constructor adds `this` to a shared queue, registers a listener or starts a thread before assigning the field, another thread can read the field before it's written. My `ThisEscape` program read 377 to 1,430 of 200,000 quotes with `farePaise == 0`, even though the field was `final` and the queue was a `ConcurrentLinkedQueue`. Moving the `add` after the field assignment gave 0 in three runs; a static factory makes it structural.",
            },
            {
              question: "Why didn't JUnit's @Timeout stop a deadlocked test, and what does?",
              answer:
                "In the default `SAME_THREAD` mode, `@Timeout` runs the test on the calling thread and interrupts it when time's up. A thread `BLOCKED` on `synchronized` (or in `lock()`) doesn't respond to interrupts, so the test hung until the shell killed it after 20 seconds. `assertTimeoutPreemptively` and `@Timeout(threadMode = SEPARATE_THREAD)` run the body on another thread and stop waiting after the deadline: both failed in 2 seconds. The stuck threads keep running and holding their locks, though: in my run the second test failed because a thread leaked by the first still held `WALLET`. Use daemon threads, avoid static locks in tested code, and dump threads on timeout.",
            },
            {
              question: "Is it safe to take thread dumps from a production JVM with thousands of threads?",
              answer:
                "Occasionally, yes. `Thread.print` stops all Java threads at a safepoint while it walks every stack: I measured 3 to 11 ms with 100 threads, 23 to 56 ms with 1,000 and about 70 ms with 3,000, plus a smaller `FindDeadlocks` safepoint (up to 7 ms). Three dumps during an incident are fine; one every second as monitoring is not. In JDK 21, `Thread.dump_to_file -format=json` with 3,000 threads didn't produce a stop-the-world safepoint at all, but it has no states or lock information. For continuous data, use JFR.",
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
              question: "Riders occasionally report that the driver assigned to them went to someone else. Logs show no errors, thread dumps show nothing blocked, and it happens more in the evening surge. What's going on, and how do you prove and fix it?",
              answer:
                "Almost certainly a check-then-act on driver status: two dispatcher threads both see the driver `AVAILABLE` and both assign him. It leaves no waiting thread, so dumps and JFR are clean, and its frequency grows with concurrency and volume, which is why it peaks in the surge. Prove it in the data (trips grouped by driver with overlapping pickup windows) and in a stress test: eight dispatchers behind a start gate aiming at the same few drivers, repeated 500 times; in my reproduction it failed 212 of 500 repetitions, while the existing two-thread test passed 29 of 30 times. Fix with a conditional update, `status.replace(driver, AVAILABLE, ON_TRIP)`, which gave 0 double bookings; compute the ETA only after a successful claim. If the service runs on several instances, the map isn't enough: the conditional update has to move to the database.",
            },
            {
              question: "A fare-quote endpoint's p99 latency jumped from 60 ms to 2 seconds, CPU is low, and the service has 200 request threads. What do you do?",
              answer:
                "Low CPU with high latency means threads are waiting. Take three `jcmd <pid> Thread.print -l` dumps five seconds apart. Group threads by the address in `waiting to lock` (BLOCKED) and `parking to wait for` a `...Sync` (WAITING), and find each owner from `- locked` or `Locked ownable synchronizers`. If most request threads wait on one address in all three dumps, that's the hot lock, and the owner's stack shows what it does while holding it (in my reproduction, a pricing database call inside a `synchronized` method). Compare `cpu=` across dumps to spot threads that never get the lock. Confirm with JFR (`jfr view contention-by-site`). Fix by moving I/O out of the critical section, narrowing it, or replacing the shared lock with a concurrent structure.",
            },
            {
              question: "A service migrated to virtual threads stops responding under load. The thread dump from jcmd Thread.print shows only about 30 idle JVM threads. What do you check?",
              answer:
                "`Thread.print` in JDK 21 doesn't list unmounted virtual threads, so a dump can look idle while thousands of virtual threads are stuck. Take `jcmd <pid> Thread.dump_to_file -format=json` instead: in my test, 1,000 virtual threads parked on one `ReentrantLock` were completely absent from `Thread.print` and all present in the JSON, with stacks ending in `ReentrantLock.lock`. Group the JSON stacks by their top application frames to find the shared lock or resource; JSON has no lock owners in 21, so find the owner from the code path or JFR `ThreadPark` events. Also check for pinning (virtual threads blocked inside `synchronized` hold their carrier on JDK 21).",
            },
            {
              question: "A CI pipeline hangs for 60 minutes about once a week and is then killed, with no failing test reported. How do you make it fail fast and tell you why?",
              answer:
                "Some test deadlocks or waits forever, and nothing bounds it. Add a global JUnit timeout (`junit.jupiter.execution.timeout.default`) with `junit.jupiter.execution.timeout.thread.mode.default = SEPARATE_THREAD`, because the default same-thread mode only interrupts, which doesn't free a thread blocked on `synchronized`: my test with the default `@Timeout` hung until killed, while the separate-thread version failed in 2 seconds. On timeout, dump all threads (`ThreadMXBean.dumpAllThreads(true, true)` and `findDeadlockedThreads()` in an extension, or `jcmd Thread.print -l` from the CI script) so the report names both sides of the cycle. Make test threads daemons and avoid static locks, so one stuck test doesn't make the next ones fail for the wrong reason.",
            },
            {
              question: "A test for an async receipt writer is flaky: it fails about a third of the time in CI and never locally. The test calls completeTrip, sleeps 100 ms, then asserts. What's wrong and how do you fix it?",
              answer:
                "The test races the code: the write takes a variable time, and 100 ms is a guess that's wrong whenever the write is slower, more often on a busy CI machine. In my reproduction with writes of 20 to 150 ms, `sleep(100)` failed 32 of 100. Replace the sleep with a bounded poll (`await().atMost(2s).until(() -> receipts.contains(trip))`), which failed none and was faster. Better, inject the executor so the test runs the write itself (`ManualExecutor.runAll()`), making the test deterministic with nothing to wait for.",
            },
            {
              question: "After a refactor, monitoring shows a surge-pricing worker publishing quotes with a fare of 0 a few hundred times a day. The Quote class has only final fields. How can that happen?",
              answer:
                "Final fields are only guaranteed visible if `this` doesn't escape from the constructor. Look for the refactor adding `this` to something shared inside the constructor: a registry, a listener list, a queue, an executor, a started thread. Another thread can then read the object before the remaining fields are assigned. My reproduction, a constructor adding `this` to a `ConcurrentLinkedQueue` before setting `farePaise`, gave 377 to 1,430 zero fares per 200,000 quotes, and 0 after moving the `add` to after the assignment. Fix with a static factory that constructs fully and then publishes, and add a check for zero fares as a guard.",
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
            "In `CheckThenAct`, remove the `ready` and `start` latches so each trial just starts two threads, and run only the `containsKey then put` case.",
            "In `ThisEscape`, move `LIVE_QUOTES.add(this)` to after the `farePaise` assignment and run it three times.",
            "Run `HotLock 30000 0`, take three `jcmd <pid> Thread.print -l` dumps three seconds apart, run `hotlocks.py` on them, and compare the `cpu=` values of the six fare-quote threads.",
            "Record `HotLock 10000 10` with `-XX:StartFlightRecording:filename=hot2.jfr,settings=default` and run `jfr view contention-by-thread hot2.jfr`.",
            "Run `VirtualDump`, then compare `jcmd <pid> Thread.print` with `jcmd <pid> Thread.dump_to_file -format=json <file>`: count the `payout-vt` threads in each.",
            "Run `SameThreadTimeoutTest` under `timeout 20` and note what the JUnit console prints before it's killed.",
            "Run `Stress.java` five times and write down which round the unsynchronized wallet fails in each time.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 still double-books, but less: 154 in 20,000 in my run, against 248 to 583 with the gate. Step 2 prints `farePaise == 0: 0` all three times, because the queue's `add` now publishes a finished object. Step 3 shows five waiters on one `FareTable` address in every dump, owners that change between dumps, and two or more fare-quote threads whose `cpu=` doesn't move at all (which ones differs per run). Step 4 shows two threads waiting about 400 ms per entry and getting in half as often as the other four. Step 5 gives 0 in `Thread.print` and 1,000 in the JSON. Step 6 prints nothing: the run hangs until `timeout` kills it with exit code 124, because the test thread is blocked on a monitor and ignores the interrupt. Step 7 varies: in my eight runs the broken wallet failed in round 1, 68, 143, 146 or 148, and twice passed all 10,000 rounds.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `RACES       race condition = result depends on timing (a requirement is broken)
            data race = conflicting accesses with no happens-before (a JMM property)
            either can exist without the other: CHM check-then-act / String.hash

SHAPES      read-modify-write  count++ = getfield, iadd, putfield  -> atomics, merge
            check-then-act     containsKey + put: 248..583 / 20,000 double-booked
                               putIfAbsent / replace(k, old, new): 0
            publication        'this' escaping a constructor: final field read as 0

DUMPS       jcmd <pid> Thread.print -l, three times, a few seconds apart
            BLOCKED + waiting to lock <a>      -> owner has "- locked <a>"
            WAITING (parking) on ...Sync       -> owner under Locked ownable synchronizers
            parking on ConditionObject         -> waiting for a signal (often idle)
            same address every dump = hot lock; frozen cpu= = starving thread
            JSON dump_to_file: virtual threads too, but no states/locks (JDK 21)

JFR         jdk.JavaMonitorEnter / jdk.ThreadPark: durations, previousOwner
            written when the wait ENDS: a starved thread leaves no event
            jfr view contention-by-site | -by-thread | -by-class

TESTS       one run proves nothing: 2,500 straight passes at small sizes, 49-85% fails with a gate
            start gate + many rounds + state in the message + fail on a broken version
            jcstress for small cores: 9.78% double-booked, 0 forbidden with putIfAbsent
            poll, don't sleep: sleep(100) failed 32/100, Awaitility 0/100
            inject Clock + Executor: 1,002 deterministic tests in 687 ms
            assertTimeoutPreemptively / @Timeout(SEPARATE_THREAD); default @Timeout hangs`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A race condition is a timing-dependent wrong answer, and it often has no data race: thread-safe pieces composed into an unsafe decision. The fix is always to make the decision and the write one atomic step.",
            "Thread dumps and JFR find concurrency problems that wait: hot locks, starvation, deadlocks. Read the state line and the lock lines, not the header; take three dumps; use the JSON dump for virtual threads; remember JFR only records waits that finish.",
            "Testing concurrent code is about probability: make threads overlap, repeat, check the test fails on broken code, use jcstress for the small critical cores, remove time and threads from logic tests by injecting a `Clock` and an `Executor`, poll instead of sleeping, and give every test a preemptive timeout.",
            "Next comes Why synchronized Fails Across Servers: Database Locks and Conditional Updates: the dispatch bug from this lesson with two service instances instead of two threads, where no Java lock can help, and the conditional update moves into SQL as `UPDATE ... WHERE status = 'AVAILABLE'`, alongside `SELECT ... FOR UPDATE` and optimistic version columns.",
          ],
        },
      ],
    },
  ],
};
