import type { Lesson } from "../types";

export const volatileAndJavaMemoryModel: Lesson = {
  slug: "volatile-and-java-memory-model",
  date: "2026-11-14",
  title: "volatile, Visibility and the Java Memory Model",
  description:
    "Why one thread can miss another thread's write forever, and what the Java Memory Model promises instead, measured on JDK 21 and an 8-core x86 machine: a stop-flag loop that never ended once C2 compiled it (and ended under -Xint and C1), the hoisted load found in C2's own machine code decoded without hsdis, volatile fixing visibility but not count++, the happens-before rules for program order, locks, volatile, thread start and join and final fields, the store-buffering litmus test returning r1 == 0 && r2 == 0 millions of times with plain fields and never with volatile, what volatile compiles to (a plain mov to read, mov plus lock add to write), safe publication, double-checked locking, the holder idiom and enum singletons, final fields and this-escape, x86 TSO against weaker hardware, a first look at VarHandle access modes, and a ride-hailing pricing service whose hot-reloaded surge config was never seen by one loop and half-applied for others.",
  tags: ["Multithreading", "Java Memory Model", "volatile", "JVM Internals"],
  sections: [
    {
      title: "What volatile and the Java Memory Model Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, synchronized, Monitors and Race Conditions, was about **atomicity**: making a sequence like `count++` or check-then-act run without another thread getting in between. It ended with a promise: `synchronized` also guarantees that the next owner of a lock sees what the previous owner wrote. That second property, **visibility**, sounds like it should come for free. It doesn't. Without a reason to do otherwise, the compiler, the JIT and the CPU are all allowed to keep a value in a register, buffer a write, or reorder memory operations, and another thread may then see stale or out-of-order values, or never see a change at all.",
        },
        {
          type: "paragraph",
          text: "The **Java Memory Model** (JMM, chapter 17.4 of the Java Language Specification) is the contract that says which values a read is allowed to return in a multithreaded program. Its central idea is the **happens-before** relation: if action A happens-before action B, then B is guaranteed to see A's effects. Happens-before edges come from a short list of rules: program order within a thread, unlocking then locking the same monitor, writing then reading the same `volatile` field, starting and joining threads, and a few more. If two threads access the same variable, at least one writes it, and no happens-before edge orders them, the program has a **data race**, and the JMM allows surprising results.",
        },
        {
          type: "paragraph",
          text: "`volatile` is the lightest tool that creates those edges. A `volatile` field is never cached across reads, its writes are visible to subsequent reads in other threads, and it limits how surrounding reads and writes may be reordered, which is what makes **safe publication** of objects possible. What it doesn't do is make compound operations atomic. This lesson measures each of these on JDK 21, down to the machine instructions, and the next lesson moves on to `ReentrantLock` and the explicit locks of `java.util.concurrent`.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java was the first mainstream language to try to define a memory model at all; C and C++ left it to compilers and hardware until 2011. The first attempt, in 1996, turned out to be both too strict and too weak: it forbade ordinary compiler optimisations, and at the same time let `final` fields appear to change and didn't order normal accesses around `volatile` ones. In 1999 and 2000 Bill Pugh showed it was broken, and the \"Double-Checked Locking is Broken\" declaration (signed by many JVM and compiler engineers) explained why the most popular lazy-initialisation idiom didn't work. JSR 133, led by Pugh with Jeremy Manson and Sarita Adve, replaced the model in Java 5. That model, built on happens-before, is still the one in Java 21.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "JLS chapter 17: threads, locks, `volatile`, the original memory model", "Underspecified and, as it turned out, broken"],
            ["2000", "\"The Double-Checked Locking is Broken\" declaration", "Lazy singletons needed another idiom"],
            ["Java 5 (2004)", "JSR 133: the happens-before memory model; `volatile` gets acquire/release semantics; `final` field guarantees", "Double-checked locking works with `volatile`; immutable objects are safe to share"],
            ["Java 5 (2004)", "JSR 166: `java.util.concurrent`, atomics, explicit happens-before guarantees for its classes", "Most code gets ordering from library classes"],
            ["Java 6 (2006)", "`AtomicXxx.lazySet` (an ordered store without the full fence)", "First access mode weaker than volatile"],
            ["2011", "C11 and C++11 memory models, drawing on the JSR 133 work", "Same vocabulary across languages"],
            ["Java 9 (2017)", "`VarHandle` (JEP 193) with plain, opaque, acquire/release and volatile modes; `Thread.onSpinWait` (JEP 285)", "Fine-grained ordering without `Unsafe` (lesson 6)"],
            ["Java 21 (2023)", "Same JMM; virtual threads follow the same rules", "The JDK used in this lesson"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing company's surge prices, and drivers who work from notes rather than looking at the dispatch board every second.",
        },
        {
          type: "list",
          items: [
            "**Caching (no visibility)** is a driver who copied the surge level onto a sticky note at the start of the shift and keeps quoting from the note. Head office changed the board an hour ago; nothing forces the driver to look again.",
            "**A store buffer** is head office writing the new price on a slip and putting it in the outbox instead of on the board. Office staff (the same core) read their own outbox, so to them the change is done; drivers looking at the board still see the old price until the outbox is emptied.",
            "**`volatile`** is a rule: this one number must be read from the board every time, and anything written on the board before it was updated must be up there too by the time anyone reads it.",
            "**Safe publication** is pinning a complete, laminated rate card to the board in one go, rather than editing the old card one line at a time while drivers are reading it.",
            "**`volatile count++`** is two dispatchers who each read \"12 trips\" from the board and both write \"13\". Reading and writing the board reliably doesn't stop them from overwriting each other.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: the drivers in the analogy are lazy; real hardware and compilers aren't. Keeping a value in a register or buffering a write is how CPUs get their speed, and the JIT moves memory accesses around because, for a single thread, the result is identical. Nothing is wrong until a second thread looks. The JMM's job is to say exactly when that second thread is entitled to an up-to-date answer.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/volatile-and-java-memory-model-store-buffer.svg",
          alt: "Two CPU cores, each with a private store buffer, above shared coherent caches and memory holding x = 0 and y = 0. Core 1 runs thread 1: step 1, x = 1 goes into its store buffer, not yet visible; step 3, r1 = y reads memory and gets 0. Core 2 runs thread 2: step 2, y = 1 goes into its store buffer; step 4, r2 = x reads memory and gets 0. Both stores drain later, so r1 == 0 and r2 == 0. Measured counts of r1 == 0 && r2 == 0 per 20,480,000 trials of StoreLoad.java: plain fields compiled by C2, 3.7 to 7.0 million (18% to 34%); plain fields under -Xint, hardware only, 16,650 to 27,516; volatile fields, 0 in every run. Footer: a volatile store compiles to mov plus lock add [rsp-0x40], 0, which drains the store buffer before the next load; a volatile load on x86 is a plain mov that the JIT may not move or cache.",
          caption: "Each core sees its own writes at once and other cores' writes later. volatile closes that gap; on x86 it costs one locked instruction per store.",
        },
        {
          type: "heading",
          text: "The three problems",
        },
        {
          type: "table",
          headers: ["Problem", "What goes wrong", "Who causes it", "Fixed by"],
          rows: [
            ["Atomicity", "Two threads' read-modify-write sequences interleave", "Thread scheduling", "Locks, atomics (not `volatile`)"],
            ["Visibility", "A thread keeps using an old value, possibly forever", "JIT keeping values in registers; store buffers delaying writes", "`volatile`, locks, other happens-before edges"],
            ["Ordering", "Another thread sees writes in a different order than they were made", "JIT reordering; store buffers (store-load reordering on x86); weaker CPUs reorder more", "`volatile`, locks, `final` fields"],
          ],
        },
        {
          type: "heading",
          text: "The happens-before rules",
        },
        {
          type: "table",
          headers: ["Rule", "Edge from", "Edge to"],
          rows: [
            ["Program order", "Each action in a thread", "Every later action in the same thread"],
            ["Monitor lock", "Unlock of monitor M", "Every subsequent lock of M (by any thread)"],
            ["Volatile variable", "Write to volatile field V", "Every subsequent read of V that sees that write"],
            ["Thread start", "`t.start()`", "Every action in `t`"],
            ["Thread termination", "Every action in `t`", "Another thread returning from `t.join()` or seeing `t.isAlive() == false`"],
            ["Interruption", "`t.interrupt()`", "`t` detecting the interrupt (exception, `isInterrupted`, `interrupted`)"],
            ["Default values", "Writing default values (0, `null`) to every field", "Every other action"],
            ["Final fields", "End of the constructor (the \"freeze\")", "Any thread that reads the field through a reference obtained after construction"],
            ["Transitivity", "A hb B and B hb C", "A hb C"],
            ["`java.util.concurrent`", "Putting into a concurrent collection, `submit` to an executor, `countDown`, `complete`", "The matching `get`, task execution, `await`, dependent stage"],
          ],
        },
        {
          type: "heading",
          text: "What each tool guarantees",
        },
        {
          type: "table",
          headers: ["Tool", "Atomic compound ops", "Visibility", "Ordering", "Blocks"],
          rows: [
            ["Plain field", "No (not even `long`/`double` writes, in theory)", "No guarantee", "None across threads", "No"],
            ["`volatile` field", "Single reads and writes only (including `long`/`double`)", "Yes", "Acquire on read, release on write, and sequential consistency among volatiles", "No"],
            ["`synchronized`", "Yes, for the whole block", "Yes, between holders of the same lock", "Yes, for the same lock", "Yes"],
            ["`final` field", "n/a (written once)", "Yes, after the constructor, if `this` didn't escape", "Fields frozen before the reference is published", "No"],
            ["`AtomicLong` and friends", "Yes (CAS, `incrementAndGet`)", "Yes", "Volatile semantics", "No"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The visibility problem is easy to describe and surprisingly hard to believe until you see a loop that never ends. This one spins on a plain `boolean` until another thread clears it:",
        },
        {
          type: "code",
          language: "java",
          title: "StopFlag.java",
          code: `public class StopFlag {
    static boolean running = true;                       // plain field: no visibility guarantee
    static volatile boolean runningVolatile = true;

    public static void main(String[] args) throws InterruptedException {
        boolean useVolatile = args.length > 0 && args[0].equals("volatile");
        Thread worker = new Thread(() -> {
            long spins = 0;
            if (useVolatile) { while (runningVolatile) spins++; }
            else             { while (running) spins++; }
            System.out.println("worker stopped after " + spins + " spins");
        });
        worker.setDaemon(true);                          // so a stuck worker can't keep the JVM alive
        worker.start();
        Thread.sleep(1_000);                             // long enough for the JIT to compile the loop
        running = false;
        runningVolatile = false;
        System.out.println("main set the flag to false");
        worker.join(3_000);
        System.out.println(worker.isAlive() ? "worker still running 3 s later: it never saw the write" : "worker finished");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac StopFlag.java
java StopFlag
java StopFlag volatile
java -Xint StopFlag
java -XX:TieredStopAtLevel=1 StopFlag`,
        },
        {
          type: "output",
          text: `main set the flag to false
worker still running 3 s later: it never saw the write

main set the flag to false
worker stopped after 1447384910 spins
worker finished

main set the flag to false
worker stopped after 40323726 spins
worker finished

main set the flag to false
worker stopped after 1094483770 spins
worker finished`,
        },
        {
          type: "list",
          items: [
            "**With a plain field, the worker never stopped**, in every one of the runs I made: main's write happened, but the worker kept spinning 3 seconds later (and would have forever; it's a daemon thread, so the JVM could exit).",
            "**With `volatile`, it stopped at once**, after 1.4 billion iterations in the second it ran.",
            "**With `-Xint` it also stopped**, after only 40 million iterations: the interpreter executes `getstatic` on every iteration, which reads memory, and x86 caches are coherent, so the new value shows up. That's the first clue that the CPU isn't the main culprit here.",
            "**With C1 only (`-XX:TieredStopAtLevel=1`) it stopped too.** C1 compiled the loop, but its code reloaded the field on every iteration. Only C2 broke it.",
          ],
        },
        {
          type: "paragraph",
          text: "`-XX:+PrintCompilation` shows when the loop changed hands. The `%` marks an **on-stack replacement** (OSR) compilation: the loop was running in the interpreter and got replaced by compiled code while it was still running:",
        },
        {
          type: "output",
          text: `58   27 %     3       StopFlag::lambda$main$0 @ 19 (45 bytes)
59   28       3       StopFlag::lambda$main$0 (45 bytes)
59   29 %     4       StopFlag::lambda$main$0 @ 19 (45 bytes)
61   27 %     3       StopFlag::lambda$main$0 @ 19 (45 bytes)   made not entrant
main set the flag to false
worker still running 3 s later: it never saw the write`,
        },
        {
          type: "paragraph",
          text: "At 59 ms, C2 (tier 4) produced an OSR version of the loop at bytecode 19. Main cleared the flag at 1,000 ms; by then the worker had been running C2's code for over 900 ms. To see what that code does, I wanted the machine code. `-XX:+PrintAssembly` needs the `hsdis` disassembler plugin, which isn't packaged on this machine (\"Loading hsdis library failed\"). Without it, HotSpot still prints the raw instruction bytes as hex, so I wrote a 20-line script that feeds them to `objdump`. A minimal version of the loop:",
        },
        {
          type: "code",
          language: "java",
          title: "SpinLoop.java",
          code: `public class SpinLoop {
    static boolean running = true;

    static long spin() {
        long spins = 0;
        while (running) spins++;
        return spins;
    }

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> System.out.println("stopped after " + spin()));
        worker.setDaemon(true);
        worker.start();
        Thread.sleep(1_000);
        running = false;
        worker.join(2_000);
        System.out.println(worker.isAlive() ? "still spinning" : "done");
    }
}`,
        },
        {
          type: "code",
          language: "python",
          title: "hex2asm.py",
          code: `import re, subprocess, sys
# Turn HotSpot's raw-hex PrintAssembly output (no hsdis) into objdump disassembly
text = open(sys.argv[1]).read()
for m in re.finditer(r"Compiled method \\((c[12])\\).*?(\\S+::\\S+).*?\\[Verified Entry Point\\](.*?)\\[Exception Handler\\]", text, re.S):
    comp, name, body = m.groups()
    data, start = bytearray(), None
    for line in body.splitlines():
        mm = re.match(r"\\s+0x([0-9a-f]+): ([0-9a-f |]+)$", line)
        if mm:
            if start is None: start = int(mm.group(1), 16)
            data += bytes.fromhex(mm.group(2).replace("|", "").replace(" ", ""))
    open("code.bin", "wb").write(data)
    out = subprocess.run(["objdump", "-D", "-b", "binary", "-m", "i386:x86-64", "-M", "intel",
                          "--adjust-vma=0x0", "code.bin"], capture_output=True, text=True).stdout
    print(f"== {name} ({comp})")
    for l in out.splitlines():
        if re.match(r"\\s+[0-9a-f]+:", l): print(l)`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UnlockDiagnosticVMOptions -XX:-TieredCompilation -XX:CompileCommand=quiet \\
     -XX:CompileCommand=print,SpinLoop::spin SpinLoop > spin.txt 2>&1
python3 hex2asm.py spin.txt`,
        },
        {
          type: "output",
          text: `== SpinLoop::spin (c2)
...
  2a:	48 8b 1e             	mov    rbx,QWORD PTR [rsi]
...
  45:	49 ba 08 3d f1 8d 00 	movabs r10,0x8df13d08
  4c:	00 00 00
  4f:	45 0f b6 5a 70       	movzx  r11d,BYTE PTR [r10+0x70]
  54:	45 85 db             	test   r11d,r11d
  57:	74 10                	je     0x69
  59:	48 83 c3 01          	add    rbx,0x1
  5d:	4d 8b 9f 58 04 00 00 	mov    r11,QWORD PTR [r15+0x458]
  64:	41 85 03             	test   DWORD PTR [r11],eax
  67:	eb f0                	jmp    0x59
  69:	be 76 ff ff ff       	mov    esi,0xffffff76
...`,
        },
        {
          type: "list",
          items: [
            "**`0x8df13d08` is the `SpinLoop` class mirror** (static fields live in it), and `[r10+0x70]` is the static `running` field. It's read **once**, at offset `0x4f`, before the loop.",
            "**The loop is offsets `0x59` to `0x67`:** `add rbx,1` (that's `spins++`, kept in a register), a load of the thread's polling page address and a `test` against it (the **safepoint poll**, so the GC can still stop this thread), and `jmp 0x59`. There is no read of `running` inside the loop at all.",
            "This is **loop-invariant code motion**, or hoisting. Inside the loop nothing writes `running`, there's no lock, no volatile access, no call that could write it, so for a single thread the value can't change, and the JMM lets C2 assume that no other thread's write needs to be seen. The program is behaving as if it were `if (running) while (true) spins++;`.",
            "The safepoint poll explains why GC and thread dumps still work while it spins, and why it didn't matter: reaching a safepoint doesn't make the compiled code reload `running` afterwards.",
          ],
        },
        {
          type: "heading",
          text: "What volatile compiles to",
        },
        {
          type: "paragraph",
          text: "In bytecode, `volatile` changes nothing about the instructions, only the field's flags:",
        },
        {
          type: "code",
          language: "java",
          title: "VolatileAsm.java",
          code: `public class VolatileAsm {
    static int plain;
    static volatile int vol;

    static void storePlain(int v) { plain = v; }
    static void storeVolatile(int v) { vol = v; }
    static int loadVolatile() { return vol; }

    public static void main(String[] args) {
        long sum = 0;
        for (int i = 0; i < 2_000_000; i++) {
            storePlain(i);
            storeVolatile(i);
            sum += loadVolatile();
        }
        System.out.println(sum);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac VolatileAsm.java && javap -v -p VolatileAsm",
        },
        {
          type: "output",
          text: `  static int plain;
    descriptor: I
    flags: (0x0008) ACC_STATIC

  static volatile int vol;
    descriptor: I
    flags: (0x0048) ACC_STATIC, ACC_VOLATILE
...
  static void storePlain(int);
    Code:
       0: iload_0
       1: putstatic     #7                  // Field plain:I
       4: return

  static void storeVolatile(int);
    Code:
       0: iload_0
       1: putstatic     #13                 // Field vol:I
       4: return`,
        },
        {
          type: "paragraph",
          text: "Both stores are `putstatic`. The interpreter and the JIT look up the field, see `ACC_VOLATILE`, and emit different machine code. With inlining turned off for these methods so each is compiled on its own:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UnlockDiagnosticVMOptions -XX:-TieredCompilation -XX:CompileCommand=quiet \\
     -XX:CompileCommand=dontinline,VolatileAsm::* \\
     -XX:CompileCommand=print,VolatileAsm::store* -XX:CompileCommand=print,VolatileAsm::load* \\
     VolatileAsm > vasm.txt 2>&1
python3 hex2asm.py vasm.txt`,
        },
        {
          type: "output",
          text: `== VolatileAsm::storePlain (c2)
...
  1a:	49 ba b0 34 f1 8d 00 	movabs r10,0x8df134b0
  24:	41 89 72 70          	mov    DWORD PTR [r10+0x70],esi
  28:	48 83 c4 10          	add    rsp,0x10
...
== VolatileAsm::storeVolatile (c2)
...
  1a:	49 ba b0 34 f1 8d 00 	movabs r10,0x8df134b0
  24:	41 89 72 74          	mov    DWORD PTR [r10+0x74],esi
  28:	f0 83 44 24 c0 00    	lock add DWORD PTR [rsp-0x40],0x0
  2e:	48 83 c4 10          	add    rsp,0x10
...
== VolatileAsm::loadVolatile (c2)
...
  1a:	49 ba b0 34 f1 8d 00 	movabs r10,0x8df134b0
  24:	41 8b 42 74          	mov    eax,DWORD PTR [r10+0x74]
  28:	48 83 c4 10          	add    rsp,0x10`,
        },
        {
          type: "list",
          items: [
            "**A plain store** is one `mov` to the field (`plain` at offset `0x70` in the class mirror).",
            "**A volatile store** is the same `mov` (to `vol` at `0x74`) followed by `lock add DWORD PTR [rsp-0x40],0x0`: add zero to a dummy location just below the stack pointer, with the `lock` prefix. The addition does nothing; the `lock` prefix makes the CPU drain its store buffer before any later load can execute. It's a full **StoreLoad fence**, and HotSpot uses it instead of `mfence` because it's been faster on most x86 chips. Targeting the stack keeps it on a cache line the thread already owns.",
            "**A volatile load is a plain `mov`.** On x86, loads are never reordered with other loads, and stores are never reordered with earlier loads, so acquire semantics come for free from the hardware. What volatile changes for a load is the compiler: C2 must perform it every time and must not move later accesses above it, which is exactly what it didn't do for `running` in `SpinLoop`.",
            "On weaker hardware the instructions differ: on AArch64, HotSpot uses `ldar` (load-acquire) and `stlr` (store-release) for volatile accesses. The Java code, and the guarantees, are the same.",
          ],
        },
      ],
    },
    {
      title: "volatile Fixes Visibility, Not Atomicity",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "VolatileCount.java",
          code: `import java.util.concurrent.atomic.AtomicInteger;

public class VolatileCount {
    static volatile int volatileCount;
    static final AtomicInteger atomicCount = new AtomicInteger();

    public static void main(String[] args) throws InterruptedException {
        for (int run = 1; run <= 3; run++) {
            volatileCount = 0;
            atomicCount.set(0);
            Thread[] ts = new Thread[4];
            for (int t = 0; t < 4; t++) {
                ts[t] = new Thread(() -> {
                    for (int i = 0; i < 1_000_000; i++) {
                        volatileCount++;                 // volatile read, add, volatile write
                        atomicCount.incrementAndGet();   // one atomic read-modify-write
                    }
                });
                ts[t].start();
            }
            for (Thread t : ts) t.join();
            System.out.printf("run %d: volatile int %,d   AtomicInteger %,d   (expected 4,000,000)%n",
                    run, volatileCount, atomicCount.get());
        }
    }
}`,
        },
        {
          type: "output",
          text: `run 1: volatile int 2,652,614   AtomicInteger 4,000,000   (expected 4,000,000)
run 2: volatile int 2,663,145   AtomicInteger 4,000,000   (expected 4,000,000)
run 3: volatile int 2,506,971   AtomicInteger 4,000,000   (expected 4,000,000)`,
        },
        {
          type: "list",
          items: [
            "**`volatile` `count++` lost 33% to 43% of the increments** (2,286,161 to 2,663,145 of 4,000,000 over six runs). Every read saw the latest write, and every write was flushed at once, but `count++` is still three steps: a volatile read, an add, a volatile write. Two threads can read the same value between them.",
            "Compared with the plain `int` in the previous lesson, the losses were steadier: the JIT can no longer collapse the loop into one big write, so threads collide on almost every increment instead of overwriting whole millions.",
            "**`AtomicInteger.incrementAndGet` was exact every time.** It's a single atomic instruction (`lock xadd` on x86): the read, the add and the write happen as one, with volatile visibility. Lesson 6 looks at how atomics work.",
            "So `volatile` is right for a value with **one writer** (a flag, a published reference, a status written by one thread and read by many), or when writes don't depend on the current value. For read-modify-write from several threads it's the wrong tool.",
          ],
        },
      ],
    },
    {
      title: "Reordering: The Store-Buffering Litmus Test",
      blocks: [
        {
          type: "paragraph",
          text: "Visibility is about a write showing up eventually. Ordering is about the order in which writes show up. The classic test is the core of Dekker's mutual-exclusion algorithm: two threads each write their own variable and then read the other's. If the operations ran in some interleaving of the two programs (sequential consistency), at least one thread would see the other's write, so `r1 == 0 && r2 == 0` would be impossible.",
        },
        {
          type: "paragraph",
          text: "The standard tool for this kind of test is jcstress, the OpenJDK concurrency stress harness. It isn't installed here, and my local Maven repository (`~/.m2`) has no copy, so I wrote a small harness in the same spirit: many independent pairs of fields, two long-lived threads that run through batches of 1,024 pairs side by side after a barrier, and a count of the four possible outcomes:",
        },
        {
          type: "code",
          language: "java",
          title: "StoreLoad.java",
          code: `import java.util.concurrent.atomic.AtomicInteger;

// The store-buffering litmus test (Dekker's core): x = y = 0
//   thread 1: x = 1; r1 = y;        thread 2: y = 1; r2 = x;
// Sequential consistency forbids r1 == 0 && r2 == 0.
public class StoreLoad {
    static final class Plain { int x, y; }
    static final class Vol { volatile int x, y; }

    static final int BATCH = 1024, BATCHES = 20_000;
    static final AtomicInteger arrived = new AtomicInteger();

    static void barrier(int round) {                     // both actors start each batch together
        arrived.incrementAndGet();
        while (arrived.get() < 2 * round) Thread.onSpinWait();
    }

    static long[] test(boolean useVolatile) throws InterruptedException {
        Plain[][] p = new Plain[BATCHES][];
        Vol[][] v = new Vol[BATCHES][];
        for (int b = 0; b < BATCHES; b++) {              // fresh, zeroed state for every trial
            if (useVolatile) { v[b] = new Vol[BATCH]; for (int i = 0; i < BATCH; i++) v[b][i] = new Vol(); }
            else             { p[b] = new Plain[BATCH]; for (int i = 0; i < BATCH; i++) p[b][i] = new Plain(); }
        }
        int[][] r1 = new int[BATCHES][BATCH], r2 = new int[BATCHES][BATCH];
        arrived.set(0);
        Thread a1 = new Thread(() -> {
            for (int b = 0; b < BATCHES; b++) {
                barrier(b + 1);
                int[] out = r1[b];
                if (useVolatile) { Vol[] s = v[b]; for (int i = 0; i < BATCH; i++) { s[i].x = 1; out[i] = s[i].y; } }
                else             { Plain[] s = p[b]; for (int i = 0; i < BATCH; i++) { s[i].x = 1; out[i] = s[i].y; } }
            }
        });
        Thread a2 = new Thread(() -> {
            for (int b = 0; b < BATCHES; b++) {
                barrier(b + 1);
                int[] out = r2[b];
                if (useVolatile) { Vol[] s = v[b]; for (int i = 0; i < BATCH; i++) { s[i].y = 1; out[i] = s[i].x; } }
                else             { Plain[] s = p[b]; for (int i = 0; i < BATCH; i++) { s[i].y = 1; out[i] = s[i].x; } }
            }
        });
        a1.start(); a2.start(); a1.join(); a2.join();
        long[] outcomes = new long[4];                   // index r1 * 2 + r2
        for (int b = 0; b < BATCHES; b++) for (int i = 0; i < BATCH; i++) outcomes[r1[b][i] * 2 + r2[b][i]]++;
        return outcomes;
    }

    public static void main(String[] args) throws InterruptedException {
        for (boolean vol : new boolean[] {false, true}) {
            long[] o = test(vol);
            System.out.printf("%-8s (0,0) %,11d   (0,1) %,11d   (1,0) %,11d   (1,1) %,9d%n",
                    vol ? "volatile" : "plain", o[0], o[1], o[2], o[3]);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac StoreLoad.java
java -Xmx2g StoreLoad
java -Xint -Xmx2g StoreLoad`,
        },
        {
          type: "output",
          text: `plain    (0,0)   3,716,020   (0,1)   7,645,774   (1,0)   9,117,721   (1,1)       485
volatile (0,0)           0   (0,1)   9,060,548   (1,0)  10,884,873   (1,1)   534,579

plain    (0,0)      27,516   (0,1)   7,038,354   (1,0)  13,410,921   (1,1)     3,209
volatile (0,0)           0   (0,1)   9,222,046   (1,0)  11,178,759   (1,1)    79,195`,
        },
        {
          type: "list",
          items: [
            "**With plain fields, both threads read 0 in 3.7 to 7.0 million of 20.48 million trials** (three runs), an outcome sequential consistency forbids. In each of those trials, each thread's read happened before the other thread's write became visible.",
            "**With `-Xint`, 16,650 to 27,516** (four runs). The interpreter executes the store and then the load in program order, so this is purely the **hardware**: the store sits in the core's store buffer while the load is served from the cache, exactly as in the diagram above. x86's memory model, **TSO** (total store order), allows precisely this one reordering, a store followed by a load from a different address.",
            "**The compiled numbers are about 200 times higher.** Part of that is speed (the threads overlap more), but C2 is also free to move a plain load above an unrelated plain store, so compiler reordering adds to the hardware's. Both are legal: the program has data races, and the JMM allows `(0,0)`.",
            "**With `volatile`, `(0,0)` never happened**: 0 in every run, compiled or interpreted. The volatile store's `lock add` drains the store buffer before the load runs, and C2 may not reorder volatile accesses with each other. Volatile accesses are **sequentially consistent** among themselves; that's a JMM guarantee, not an x86 accident.",
            "`(1,1)`, both threads seeing the other's write, needs the two threads to be almost exactly in step, and varied from 485 to 693,038 per run. The interesting column is `(0,0)`.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Honest limits of this harness",
          text: "jcstress does a lot this harness doesn't: it varies thread placement, compiler modes and timing, and runs millions of tests per configuration. Mine ran three or four times on one machine with other processes busy. It proves that the `(0,0)` outcome is real on this hardware and absent with `volatile`; it doesn't measure how often it happens in general. The 2 GB heap is for the 20 million state objects allocated up front so that every trial starts from zeros.",
        },
        {
          type: "heading",
          text: "The JMM and the hardware",
        },
        {
          type: "table",
          headers: ["Reordering of", "x86 (TSO)", "ARM, POWER", "JIT, plain fields", "Allowed by the JMM for data races"],
          rows: [
            ["Load, then later load", "No", "Yes", "Yes", "Yes"],
            ["Load, then later store", "No", "Yes", "Yes", "Yes"],
            ["Store, then later store", "No", "Yes", "Yes", "Yes"],
            ["Store, then later load (different address)", "Yes (store buffer)", "Yes", "Yes", "Yes"],
          ],
        },
        {
          type: "paragraph",
          text: "The JMM is deliberately weaker than any one CPU, so the same Java program means the same thing on all of them, and the JIT is free to optimise. Code that \"works on x86\" because x86 only reorders store-load can break on an ARM server (AWS Graviton, Apple silicon) where stores can be reordered with each other. If your program is correctly synchronized, you never have to think about the table: the JMM guarantees that a program without data races behaves as if it were sequentially consistent (\"DRF-SC\").",
        },
      ],
    },
    {
      title: "Safe Publication and Double-Checked Locking",
      blocks: [
        {
          type: "paragraph",
          text: "**Publishing** an object means making a reference to it reachable by another thread. It's **safe** when the other thread is guaranteed to see the object fully constructed. Without a happens-before edge, the JMM allows the reference to become visible before the constructor's writes: another thread can see a non-null reference to an object whose fields are still 0 or `null`. The safe ways to publish:",
        },
        {
          type: "list",
          items: [
            "Store the reference in a `volatile` field (or an `AtomicReference`).",
            "Store it in a field guarded by a lock, and read it under the same lock.",
            "Store it in a `final` field of an object that is itself properly constructed.",
            "Initialise it from a static initialiser (class initialisation is synchronized by the JVM).",
            "Put it in a thread-safe collection or hand it over through a `BlockingQueue`, executor or `CompletableFuture`.",
            "Make the object **immutable** (all fields `final`, `this` doesn't escape the constructor): then even a racy publication shows the final fields correctly.",
          ],
        },
        {
          type: "paragraph",
          text: "I tried to catch an unsafely published object half-initialised on this machine: a writer creating `Fare` objects with four plain fields and publishing each through a plain static field, and a reader checking every published object for a zero field:",
        },
        {
          type: "code",
          language: "java",
          title: "UnsafePublication.java",
          code: `public class UnsafePublication {
    static final class Fare {
        int base, perKm, perMin, surge;                  // plain, non-final fields
        Fare(int seed) { base = seed; perKm = seed; perMin = seed; surge = seed; }
    }

    static Fare shared;                                   // published with a plain write
    static volatile boolean stop;

    public static void main(String[] args) throws InterruptedException {
        long[] seen = new long[2];                        // [published objects read, half-initialised ones]
        Thread reader = new Thread(() -> {
            long reads = 0, broken = 0;
            while (!stop) {
                Fare f = shared;
                if (f != null) {
                    reads++;
                    if (f.base == 0 || f.perKm == 0 || f.perMin == 0 || f.surge == 0) broken++;
                }
            }
            seen[0] = reads; seen[1] = broken;
        });
        reader.start();
        long start = System.nanoTime();
        for (int i = 1; System.nanoTime() - start < 5_000_000_000L; i++) {
            shared = new Fare(i == 0 ? 1 : i);            // allocate, initialise, publish, repeat
            if (i == Integer.MAX_VALUE) i = 1;
        }
        stop = true;
        reader.join();
        System.out.printf("reads of a published Fare: %,d, saw a zero field: %,d%n", seen[0], seen[1]);
    }
}`,
        },
        {
          type: "output",
          text: `reads of a published Fare: 306,225,557, saw a zero field: 0
reads of a published Fare: 325,982,260, saw a zero field: 0`,
        },
        {
          type: "paragraph",
          text: "**Zero in over 600 million reads.** That's an honest negative, and the reason is the hardware and this JIT, not the program: x86 doesn't reorder stores with other stores, and C2 on x86 emitted the field initialisation before the publishing store. The JMM still allows the reordering, and on weakly ordered CPUs such as ARM and POWER, where stores can become visible out of order, partially constructed objects are a documented, reproducible outcome (jcstress has tests for exactly this). Code that relies on \"I've never seen it\" on a laptop can fail on an ARM server. Correctness has to come from the rules, not from the test.",
        },
        {
          type: "heading",
          text: "Double-checked locking",
        },
        {
          type: "paragraph",
          text: "The idiom tries to avoid locking on every call to a lazy getter: check without the lock, and only lock if the instance isn't there yet. The broken version:",
        },
        {
          type: "code",
          language: "java",
          code: `private static ZoneMap instance;                 // NOT volatile: broken

static ZoneMap get() {
    if (instance == null) {                      // 1. unsynchronized read
        synchronized (ZoneMap.class) {
            if (instance == null) {
                instance = new ZoneMap();        // 2. allocate, construct, publish
            }
        }
    }
    return instance;                             // 3. may be a half-built object
}`,
        },
        {
          type: "list",
          items: [
            "`instance = new ZoneMap()` is several steps: allocate memory, run the constructor (write the fields), store the reference. Inside the `synchronized` block those writes can be reordered: the reference may be stored before the field writes are visible.",
            "A second thread at step 1 doesn't take the lock, so there's no happens-before edge between it and the writer. It can see a non-null `instance` and return an object whose fields are still defaults. The lock protects only the threads that enter it.",
            "Declaring `instance` `volatile` fixes it: the volatile write in step 2 happens after the constructor in program order, and a volatile read that sees it happens-after it, so the constructor's writes are visible. Java 5's JSR 133 made this the correct form.",
            "The fast path then costs one volatile read: 0.6 to 0.8 ns per call in the Performance section, against 17 to 19 ns for a `synchronized` getter.",
          ],
        },
        {
          type: "paragraph",
          text: "Usually there are simpler options than double-checked locking. The **holder class idiom** uses the JVM's own lazy, thread-safe class initialisation: the nested class isn't initialised until `get()` first touches it, and the JVM guarantees that initialisation runs once, with happens-before to every thread that uses the class. An **enum** with one constant does the same and also handles serialization. Both appear in Syntax at a Glance. Double-checked locking is still the right tool for lazy **instance** fields, where there's no class to defer.",
        },
      ],
    },
    {
      title: "Final Fields and this-Escape",
      blocks: [
        {
          type: "paragraph",
          text: "The JMM gives `final` fields a special guarantee (JLS 17.5): when a constructor finishes, its `final` fields are **frozen**, and any thread that obtains a reference to the object after that point sees the final values, even if the reference was published through a data race. It's what makes immutable objects like `String`, records and `List.of` safe to share without any synchronization. The guarantee has one condition: `this` must not escape during construction.",
        },
        {
          type: "code",
          language: "java",
          title: "ThisEscape.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class ThisEscape {
    static final List<Consumer<Driver>> listeners = new ArrayList<>();

    static final class Driver {
        final String name;
        final long ratingX100;

        Driver(String name, long ratingX100) {
            listeners.forEach(l -> l.accept(this));      // 'this' escapes before the fields are set
            this.name = name;
            this.ratingX100 = ratingX100;
        }
    }

    static final class SafeDriver {
        final String name;
        final long ratingX100;
        private SafeDriver(String name, long ratingX100) { this.name = name; this.ratingX100 = ratingX100; }

        static SafeDriver create(String name, long ratingX100) {
            SafeDriver d = new SafeDriver(name, ratingX100);   // constructor finishes first
            System.out.println("listener sees " + d.name + " rated " + d.ratingX100);   // then publish
            return d;
        }
    }

    public static void main(String[] args) {
        listeners.add(d -> System.out.println("listener sees " + d.name + " rated " + d.ratingX100));
        Driver asha = new Driver("Asha", 487);
        System.out.println("after the constructor: " + asha.name + " rated " + asha.ratingX100);
        SafeDriver.create("Ravi", 492);
    }
}`,
        },
        {
          type: "output",
          text: `listener sees null rated 0
after the constructor: Asha rated 487
listener sees Ravi rated 492`,
        },
        {
          type: "list",
          items: [
            "**The listener saw `null` and 0 in two `final` fields**, without any concurrency at all: the constructor passed `this` to a listener before assigning them. Final doesn't mean \"never seen at its default value\"; it means \"frozen at the end of the constructor\".",
            "With threads, the same mistake is worse: registering `this` with an event bus, starting a thread from the constructor with an inner class or lambda that captures `this`, or storing `this` in a static field all let another thread see the object before the freeze, with no guarantee about any field.",
            "**The fix is a factory method**: construct completely, then publish. `SafeDriver.create` does that, and the listener sees Ravi and 492.",
            "On x86, the freeze needs no instruction (stores aren't reordered with each other); it limits what the JIT may reorder. On weakly ordered CPUs such as ARM, HotSpot emits a real barrier instruction at the end of constructors that write final fields.",
          ],
        },
      ],
    },
    {
      title: "VarHandle Access Modes, Briefly",
      blocks: [
        {
          type: "paragraph",
          text: "`volatile` is all-or-nothing: every access to the field is fully ordered. Since Java 9, `VarHandle` lets each access choose its strength. Lesson 6 uses them for compare-and-set; here is just the map, because the modes are defined in terms of this lesson's ideas:",
        },
        {
          type: "table",
          headers: ["Mode", "Methods", "Guarantees", "Typical use"],
          rows: [
            ["Plain", "`get`, `set`", "Same as a normal field: no ordering, no visibility promise", "Single-threaded phases"],
            ["Opaque", "`getOpaque`, `setOpaque`", "Each access really happens (no hoisting or caching), coherent per variable, no ordering of other accesses", "Progress flags, counters read for monitoring"],
            ["Acquire / release", "`getAcquire`, `setRelease`", "Writes before a release are visible to a thread whose acquire sees it; no store-load fence", "Publishing data from one writer; cheaper than volatile stores"],
            ["Volatile", "`getVolatile`, `setVolatile`, `compareAndSet`", "Same as a `volatile` field: sequentially consistent", "Default when in doubt"],
          ],
        },
        {
          type: "paragraph",
          text: "On x86, a release store needs no fence (TSO already keeps stores in order), so `setRelease` avoids the `lock add` that makes a volatile store cost about 7 ns in Performance below. That saving is why `AtomicXxx.lazySet` (the Java 6 name for a release store) existed long before `VarHandle`.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing a config reload with `static volatile Pricing current` and an immutable `record Pricing`, from the production section: the reload thread writes `current = new Pricing(\"SALT-LAKE\", 50, 5_000);` while a request thread runs `Pricing p = current; quote(p.surgePercent());`.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Allocate.** The reload thread bumps its TLAB pointer and gets zeroed memory for a `Pricing`; the header is written.",
            "**Construct.** The record's canonical constructor writes `zone`, `surgePercent` and `baseFarePaise`, all `final`. These are plain stores, possibly sitting in the core's store buffer.",
            "**Freeze.** The constructor ends. The JIT may not move the final-field stores below the publication that follows; on x86 there's nothing to emit.",
            "**Volatile write.** `putstatic current` compiles to `mov` the reference into the field, then `lock add [rsp-0x40], 0`. The locked instruction waits until the store buffer has drained, so the three field stores and the reference store are all visible in the cache before the thread moves on.",
            "**Volatile read.** The request thread executes `getstatic current`, a plain `mov` on x86 that C2 must perform every time (it can't hoist it out of the request loop). It sees the new reference.",
            "**Happens-before.** The write in step 4 is a volatile write; the read in step 5 is a volatile read that saw it. So everything before step 4 in the reload thread, including the constructor in step 2, happens-before everything after step 5 in the request thread.",
            "**Use.** `p.surgePercent()` is a plain read of a final field of an object the request thread obtained through a happens-before edge: it's 50. And because `p` is a local, every field the request reads comes from the same snapshot, even if `current` is replaced again a microsecond later.",
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
          title: "VolatileTour.java",
          code: `public class VolatileTour {
    // 1. a volatile flag: every read sees the latest write
    static volatile boolean shuttingDown;

    // 2. piggybacking: plain data published by a later volatile write
    static long[] fares;                                 // plain
    static volatile boolean faresReady;                  // the "release" flag

    // 3. final fields: safe to share once the constructor has finished
    record Zone(String name, int surgePercent) { }

    // 4. lazy singleton, holder idiom: class initialisation does the locking
    static final class ZoneDirectory {
        private ZoneDirectory() { System.out.println("  ZoneDirectory initialised"); }
        private static final class Holder { static final ZoneDirectory INSTANCE = new ZoneDirectory(); }
        static ZoneDirectory get() { return Holder.INSTANCE; }
    }

    // 5. lazy field, double-checked locking: needs volatile
    private static volatile Zone defaultZone;
    static Zone defaultZone() {
        Zone z = defaultZone;
        if (z == null) {
            synchronized (VolatileTour.class) {
                z = defaultZone;
                if (z == null) defaultZone = z = new Zone("SALT-LAKE", 0);
            }
        }
        return z;
    }

    static int sharedBeforeStart;
    static int writtenByWorker;

    public static void main(String[] args) throws InterruptedException {
        sharedBeforeStart = 7;                           // happens-before start()
        Thread worker = new Thread(() -> {
            System.out.println("worker sees sharedBeforeStart = " + sharedBeforeStart);
            writtenByWorker = 99;                        // happens-before join() returns
            while (!shuttingDown) Thread.onSpinWait();
            System.out.println("worker saw shuttingDown");
        });
        worker.start();
        Thread.sleep(50);
        shuttingDown = true;
        worker.join();
        System.out.println("after join, writtenByWorker = " + writtenByWorker);

        Thread reader = new Thread(() -> {
            while (!faresReady) Thread.onSpinWait();     // volatile read...
            System.out.println("reader sees fares[2] = " + fares[2]);   // ...makes the plain array visible
        });
        reader.start();
        fares = new long[] {5_000, 6_000, 14_500};
        faresReady = true;                               // volatile write after the plain writes
        reader.join();

        Zone z = new Zone("NEW-TOWN", 20);
        System.out.println("record fields are final: " + z);
        System.out.println("before first get()");
        ZoneDirectory.get();
        ZoneDirectory.get();
        System.out.println("same default zone twice: " + (defaultZone() == defaultZone()));
    }
}`,
        },
        {
          type: "output",
          text: `worker sees sharedBeforeStart = 7
worker saw shuttingDown
after join, writtenByWorker = 99
reader sees fares[2] = 14500
record fields are final: Zone[name=NEW-TOWN, surgePercent=20]
before first get()
  ZoneDirectory initialised
same default zone twice: true`,
        },
        {
          type: "list",
          items: [
            "`sharedBeforeStart` and `writtenByWorker` are plain fields, and they're correct: `start()` and `join()` are happens-before edges.",
            "**Piggybacking:** `fares` is a plain field holding a plain array, but it's written before the volatile `faresReady = true`, and the reader reads `faresReady` before `fares`. Program order plus the volatile edge plus transitivity make the array visible. The order matters: writing the flag first would publish nothing.",
            "The holder's `ZoneDirectory initialised` line printed after `before first get()`, and only once: lazy and thread-safe without a `volatile` or a lock in sight.",
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Stopping a worker cleanly",
        },
        {
          type: "code",
          language: "java",
          title: "GpsPoller.java",
          code: `public class GpsPoller implements Runnable {
    private volatile boolean running = true;             // written by another thread, read every loop
    private long polls;

    @Override public void run() {
        while (running) {
            polls++;                                      // poll the driver's GPS
            try {
                Thread.sleep(20);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();       // keep the status, then fall out
                break;
            }
        }
        System.out.println("poller exiting after " + polls + " polls, interrupted=" + Thread.currentThread().isInterrupted());
    }

    void stop() { running = false; }

    public static void main(String[] args) throws InterruptedException {
        GpsPoller p1 = new GpsPoller();
        Thread t1 = new Thread(p1, "gps-1");
        t1.start();
        Thread.sleep(200);
        long t = System.nanoTime();
        p1.stop();                                        // seen at the next loop check
        t1.join();
        System.out.println("flag only: stopped in " + (System.nanoTime() - t) / 1_000_000 + " ms");

        GpsPoller p2 = new GpsPoller();
        Thread t2 = new Thread(p2, "gps-2");
        t2.start();
        Thread.sleep(200);
        t = System.nanoTime();
        p2.stop();
        t2.interrupt();                                   // also wake it from sleep
        t2.join();
        System.out.println("flag + interrupt: stopped in " + (System.nanoTime() - t) / 1_000_000 + " ms");
    }
}`,
        },
        {
          type: "output",
          text: `poller exiting after 10 polls, interrupted=false
flag only: stopped in 16 ms
poller exiting after 10 polls, interrupted=true
flag + interrupt: stopped in 0 ms`,
        },
        {
          type: "paragraph",
          text: "A `volatile boolean running` is the textbook stop flag, and it works: the poller saw it at its next loop check. But a thread blocked in `sleep`, `wait` or a blocking queue only checks the flag when it wakes up: 16 ms here, up to a whole polling interval in general, and forever if it's waiting for a queue that never fills. Setting the flag **and** interrupting the thread stops it immediately (0 ms), and restoring the interrupt status in the `catch` lets the caller see why it stopped. The previous lessons covered interrupts; the flag is still useful for loops that don't block, and as the explicit statement of intent.",
        },
        {
          type: "heading",
          text: "Example 2: A copy-on-write surge table, and why writers still need a lock",
        },
        {
          type: "code",
          language: "java",
          title: "SurgeTable.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class SurgeTable {
    private volatile Map<String, Integer> surge = Map.of();   // immutable snapshot, swapped whole
    private final boolean lockWriters;
    SurgeTable(boolean lockWriters) { this.lockWriters = lockWriters; }

    int surgeFor(String zone) { return surge.getOrDefault(zone, 0); }   // readers: no lock, one volatile read

    void put(String zone, int percent) {
        if (lockWriters) {
            synchronized (this) { swap(zone, percent); }
        } else {
            swap(zone, percent);
        }
    }

    private void swap(String zone, int percent) {
        Map<String, Integer> next = new HashMap<>(surge);         // read the current snapshot
        next.put(zone, percent);
        surge = Map.copyOf(next);                                  // publish a new one
    }

    int size() { return surge.size(); }

    public static void main(String[] args) throws InterruptedException {
        for (boolean lock : new boolean[] {false, true}) {
            SurgeTable table = new SurgeTable(lock);
            Thread a = new Thread(() -> { for (int i = 0; i < 2_000; i++) table.put("A-" + i, 20); });
            Thread b = new Thread(() -> { for (int i = 0; i < 2_000; i++) table.put("B-" + i, 30); });
            a.start(); b.start(); a.join(); b.join();
            System.out.println((lock ? "synchronized writers:   " : "unsynchronized writers: ") + table.size()
                    + " of 4000 zones, NEW-TOWN surge " + table.surgeFor("NEW-TOWN"));
        }
    }
}`,
        },
        {
          type: "output",
          text: `unsynchronized writers: 2051 of 4000 zones, NEW-TOWN surge 0
synchronized writers:   4000 of 4000 zones, NEW-TOWN surge 0`,
        },
        {
          type: "list",
          items: [
            "Readers do one volatile read and then work with an immutable `Map.copyOf` snapshot: no lock, no `ConcurrentModificationException`, never a half-updated map. This pattern is excellent for read-mostly data like surge tables, feature flags and routing config.",
            "**But the write is a read-modify-write**: read the current snapshot, copy, add, publish. Two unsynchronized writers read the same snapshot, and the second publish discards the first one's change. Only 2,014 to 2,115 of 4,000 zones survived over four runs. `volatile` made each publication visible; it didn't make the update atomic.",
            "With writers serialized by `synchronized`, all 4,000 survived, and readers still never lock. `AtomicReference.updateAndGet` (lesson 6) does the same with a CAS retry loop instead of a lock. `CopyOnWriteArrayList` (lesson 13) is this pattern packaged as a list.",
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
            ["A flag set by one thread, read by others (stop, ready, shutting down)", "`volatile boolean`, plus `interrupt()` for blocked threads", "A plain field; `Thread.stop`"],
            ["Publish an object built by one thread for others to read", "Immutable object (final fields) behind a `volatile` reference", "Mutating a shared object in place"],
            ["A counter updated by several threads", "`AtomicLong`, `LongAdder`", "`volatile long count; count++`"],
            ["Several related fields updated together", "One immutable snapshot object, or `synchronized`", "Several separate `volatile` fields"],
            ["Lazy static singleton", "Holder class idiom, or an enum", "Double-checked locking without `volatile`"],
            ["Lazy instance field read on a hot path", "Double-checked locking with a `volatile` field", "`synchronized` getter on a hot path"],
            ["Read-mostly config, written rarely", "`volatile` snapshot, writers serialized or CAS", "`ReadWriteLock` around every read"],
            ["Fine control over ordering cost", "`VarHandle` acquire/release or opaque modes (lesson 6)", "`Unsafe`, hand-placed fences, unless you can prove them"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "A plain field as a stop or ready flag",
        },
        {
          type: "paragraph",
          text: "Works in the debugger, in unit tests and under `-Xint`; hangs forever once C2 compiles the loop, as `StopFlag` did in every run. Any field written by one thread and read by another needs `volatile`, a lock or an atomic.",
        },
        {
          type: "heading",
          text: "Assuming volatile makes ++ atomic",
        },
        {
          type: "paragraph",
          text: "`volatile int count; count++` lost a third or more of its increments. Use `AtomicInteger`/`LongAdder`, or a lock.",
        },
        {
          type: "heading",
          text: "Double-checked locking without volatile",
        },
        {
          type: "paragraph",
          text: "The unsynchronized first check can see a non-null reference to an object whose constructor's writes aren't visible yet. Add `volatile`, or use the holder idiom.",
        },
        {
          type: "heading",
          text: "Updating a shared object in place instead of replacing it",
        },
        {
          type: "paragraph",
          text: "Even with a `volatile` reference, mutating the fields of the object it points to gives readers a mix of old and new values: the production section measured tens of thousands of mixed reads. Build a new immutable object and publish the reference once.",
        },
        {
          type: "heading",
          text: "Letting this escape from a constructor",
        },
        {
          type: "paragraph",
          text: "Registering listeners, starting threads or storing `this` in a static field from inside a constructor publishes the object before its `final` fields are frozen. Use a factory method that constructs, then registers.",
        },
        {
          type: "heading",
          text: "Publishing the flag before the data",
        },
        {
          type: "paragraph",
          text: "Piggybacking only works one way round: write the plain data, then the volatile flag; read the volatile flag, then the data. `ready = true; data = x;` publishes nothing.",
        },
        {
          type: "heading",
          text: "Trusting x86 results",
        },
        {
          type: "paragraph",
          text: "My unsafe-publication test saw zero half-built objects in 600 million reads on x86. The same code is allowed to fail, and does fail, on ARM. Reason from happens-before, not from what a test on one machine didn't show.",
        },
        {
          type: "heading",
          text: "Making everything volatile",
        },
        {
          type: "paragraph",
          text: "Sprinkling `volatile` on every field doesn't make compound operations atomic or multi-field updates consistent, and every volatile store costs a fence (7 ns against 0.5 ns in a loop here). Decide what is shared, how it's published, and which tool guarantees that.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Prefer immutability: final fields, records, `List.of`/`Map.copyOf`. Immutable objects need no synchronization once safely published, and even racy publication can't show half-built final fields.",
            "Publish shared state through one well-defined edge: a `volatile` field, a lock, a concurrent collection, an executor or a future.",
            "Use `volatile` for single-writer flags and published references; use atomics or locks for anything that reads, computes and writes.",
            "Group related values into one immutable snapshot and swap the reference, rather than keeping several `volatile` fields that can be read in inconsistent combinations.",
            "Serialize writers of a copy-on-write snapshot (a lock or CAS), even though readers need nothing.",
            "Never let `this` escape a constructor; use factory methods for registration and thread start-up.",
            "For lazy singletons use the holder idiom or an enum; reserve double-checked locking (with `volatile`) for lazy instance fields.",
            "Test concurrency with stress harnesses (jcstress where available) and on the hardware you deploy to, and treat a passing test as weak evidence; reason with happens-before.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Volatile reads, volatile writes, and three lazy singletons on the hot path, best of five runs per row, run three times:",
        },
        {
          type: "code",
          language: "java",
          title: "VolatileCost.java",
          code: `import java.util.function.LongSupplier;

public class VolatileCost {
    static final class Fields { int plain; volatile int vol; }
    static final Fields F = new Fields();

    static final class ZoneMap { final int zones = 42; }

    // three lazy singletons
    static ZoneMap syncInstance;
    static synchronized ZoneMap syncGet() {
        if (syncInstance == null) syncInstance = new ZoneMap();
        return syncInstance;
    }

    static volatile ZoneMap dclInstance;
    static ZoneMap dclGet() {
        ZoneMap z = dclInstance;                          // one volatile read on the fast path
        if (z == null) {
            synchronized (VolatileCost.class) {
                z = dclInstance;
                if (z == null) dclInstance = z = new ZoneMap();
            }
        }
        return z;
    }

    static final class Holder { static final ZoneMap INSTANCE = new ZoneMap(); }
    static ZoneMap holderGet() { return Holder.INSTANCE; }

    static double bestNsPerOp(int threads, long opsPerThread, LongSupplier perThreadWork) throws InterruptedException {
        long best = Long.MAX_VALUE;
        for (int r = 0; r < 5; r++) {
            Thread[] ts = new Thread[threads];
            long[] sink = new long[threads];
            for (int t = 0; t < threads; t++) { int id = t; ts[t] = new Thread(() -> sink[id] = perThreadWork.getAsLong()); }
            long start = System.nanoTime();
            for (Thread t : ts) t.start();
            for (Thread t : ts) t.join();
            best = Math.min(best, System.nanoTime() - start);
        }
        return (double) best / opsPerThread;
    }

    public static void main(String[] args) throws InterruptedException {
        long n = 200_000_000;
        System.out.printf("plain write               %5.2f ns/op%n", bestNsPerOp(1, n, () -> { for (int i = 0; i < n; i++) F.plain = i; return F.plain; }));
        System.out.printf("volatile write            %5.2f ns/op%n", bestNsPerOp(1, n, () -> { for (int i = 0; i < n; i++) F.vol = i; return F.vol; }));
        System.out.printf("volatile read             %5.2f ns/op%n", bestNsPerOp(1, n, () -> { long s = 0; for (int i = 0; i < n; i++) s += F.vol; return s; }));

        long m = 50_000_000;
        for (int threads : new int[] {1, 8}) {
            System.out.printf("%d thread(s): synchronized get %6.2f   double-checked %5.2f   holder %5.2f ns/op per thread%n", threads,
                    bestNsPerOp(threads, m, () -> { long s = 0; for (int i = 0; i < m; i++) s += syncGet().zones; return s; }),
                    bestNsPerOp(threads, m, () -> { long s = 0; for (int i = 0; i < m; i++) s += dclGet().zones; return s; }),
                    bestNsPerOp(threads, m, () -> { long s = 0; for (int i = 0; i < m; i++) s += holderGet().zones; return s; }));
        }
    }
}`,
        },
        {
          type: "output",
          text: `plain write                0.42 ns/op
volatile write             6.89 ns/op
volatile read              0.56 ns/op
1 thread(s): synchronized get  17.75   double-checked  0.65   holder  0.45 ns/op per thread
8 thread(s): synchronized get 179.59   double-checked  2.44   holder  2.09 ns/op per thread`,
        },
        {
          type: "list",
          items: [
            "**A volatile write cost 6.7 to 7.3 ns** per iteration, against 0.4 to 0.6 ns for a plain write. That's the `lock add` waiting for the store buffer to drain, every iteration. The plain loop is that cheap most likely because C2 is free to keep the value in a register and store only occasionally, which is exactly the freedom `volatile` removes.",
            "**A volatile read cost 0.55 to 0.62 ns**, about the same as the plain loop: on x86 it's a plain `mov` from a cache line that stays in the core's L1 when nobody writes it. Volatile reads of rarely-written fields are nearly free; volatile writes are not.",
            "**Lazy singleton getters:** with one thread, the `synchronized` getter cost 17 to 19 ns per call, double-checked locking 0.6 to 0.8 ns (one volatile read), and the holder idiom 0.5 to 0.6 ns (after initialisation it's a constant load). With eight threads calling at once, the `synchronized` getter jumped to 180 to 492 ns per call per thread, because every call contends for the class's monitor; double-checked locking and the holder stayed at 1.5 to 2.4 ns, the cost of eight threads sharing a loaded machine.",
            "Single-machine `System.nanoTime` loops with other benchmarks running, not JMH. The absolute numbers are rough; the ratios (about 15 times for volatile against plain writes, about 100 times for a contended `synchronized` getter against the alternatives) were consistent.",
          ],
        },
      ],
    },
    {
      title: "volatile in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing pricing service hot-reloads its surge configuration: an admin raises the surge in SALT-LAKE, a reload thread picks up the change and updates the in-memory config, and quotes are supposed to reflect it within a second. Two symptoms showed up after a rush-hour surge change. A batch repricing job (a tight loop recomputing quotes for queued requests until the surge changed) never picked up the new surge and had to be restarted. And for a few seconds after each reload, a small number of quotes used the **NEW-TOWN** base fare with the **SALT-LAKE** zone, a combination no config had ever contained.",
        },
        {
          type: "paragraph",
          text: "The config was one mutable object in a plain static field, and the reload thread updated its fields in place. I rebuilt both bugs and the fix:",
        },
        {
          type: "code",
          language: "java",
          title: "ConfigReload.java",
          code: `import java.util.concurrent.atomic.AtomicLong;

public class ConfigReload {
    // Before: one mutable config object, reloaded in place, held in a plain static field
    static final class MutablePricing {
        String zone = "SALT-LAKE";
        int surgePercent = 0;
        long baseFarePaise = 5_000;
    }
    static MutablePricing pricing = new MutablePricing();

    // After: an immutable snapshot, swapped atomically through a volatile reference
    record Pricing(String zone, int surgePercent, long baseFarePaise) { }
    static volatile Pricing current = new Pricing("SALT-LAKE", 0, 5_000);

    static volatile boolean stop;

    public static void main(String[] args) throws InterruptedException {
        // Problem 1: a hot pricing loop that never sees the reload
        Thread repricer = new Thread(() -> {
            long quotes = 0;
            while (pricing.surgePercent == 0) quotes++;  // "reprice until surge kicks in"
            System.out.println("repricer saw surge after " + quotes + " quotes");
        });
        repricer.setDaemon(true);
        repricer.start();
        Thread.sleep(1_000);
        pricing.surgePercent = 50;                         // the reload thread turns on 50% surge
        repricer.join(2_000);
        System.out.println("plain field, in-place reload: repricer " + (repricer.isAlive() ? "STILL quoting without surge 2 s later" : "stopped"));

        // Problem 2: readers see a half-applied reload (mixed old and new values)
        AtomicLong reads = new AtomicLong(), mixed = new AtomicLong();
        stop = false;
        Thread reader = new Thread(() -> {
            while (!stop) {
                MutablePricing p = pricing;
                String zone = p.zone;
                long base = p.baseFarePaise;
                reads.incrementAndGet();
                // valid configs: SALT-LAKE with base 5000, or NEW-TOWN with base 6000
                if (zone.equals("SALT-LAKE") != (base == 5_000)) mixed.incrementAndGet();
            }
        });
        reader.start();
        for (int i = 0; i < 2_000_000; i++) {              // reloads alternate between two valid configs
            boolean newTown = i % 2 == 0;
            pricing.zone = newTown ? "NEW-TOWN" : "SALT-LAKE";
            pricing.baseFarePaise = newTown ? 6_000 : 5_000;
        }
        stop = true;
        reader.join();
        System.out.printf("in-place reload: %,d reads, %,d saw a zone and a base fare from different configs%n", reads.get(), mixed.get());

        // The fix: build a new immutable Pricing, publish it with one volatile write
        Thread fixedRepricer = new Thread(() -> {
            long quotes = 0;
            while (current.surgePercent() == 0) quotes++;
            System.out.println("fixed repricer saw surge after " + quotes + " quotes");
        });
        fixedRepricer.start();
        Thread.sleep(1_000);
        current = new Pricing("SALT-LAKE", 50, 5_000);
        fixedRepricer.join(2_000);

        reads.set(0); mixed.set(0); stop = false;
        Thread fixedReader = new Thread(() -> {
            while (!stop) {
                Pricing p = current;                       // one read gives one consistent snapshot
                reads.incrementAndGet();
                if (p.zone().equals("SALT-LAKE") != (p.baseFarePaise() == 5_000)) mixed.incrementAndGet();
            }
        });
        fixedReader.start();
        for (int i = 0; i < 2_000_000; i++) {
            boolean newTown = i % 2 == 0;
            current = newTown ? new Pricing("NEW-TOWN", 50, 6_000) : new Pricing("SALT-LAKE", 50, 5_000);
        }
        stop = true;
        fixedReader.join();
        System.out.printf("snapshot reload: %,d reads, %,d mixed%n", reads.get(), mixed.get());
    }
}`,
        },
        {
          type: "output",
          text: `plain field, in-place reload: repricer STILL quoting without surge 2 s later
in-place reload: 1,519,823 reads, 38,233 saw a zone and a base fare from different configs
fixed repricer saw surge after 1680605140 quotes
snapshot reload: 3,502,327 reads, 0 mixed`,
        },
        {
          type: "list",
          items: [
            "**The repricer never saw the surge.** Its loop reads `pricing.surgePercent` and does nothing else, so once C2 compiled it, the field was read once and the loop spun on the old value, exactly like `StopFlag`. In every run it was still quoting without surge 2 seconds after the reload. Request threads mostly didn't show this in production, because they make calls, take locks and do I/O that stop the JIT from caching the field; the repricer's tight loop had none of that. \"It works in the request path\" is luck, not a guarantee.",
            "**Mixed configs: 33,834 to 69,829 per run** (four runs), out of 0.24 to 1.7 million reads. The reload writes `zone`, then `baseFarePaise`, so a reader that runs in between sees one new and one old value. That isn't reordering at all: it's simply a multi-field update that isn't atomic. `volatile` on the fields wouldn't fix it either; each field would be visible, and still mixed.",
            "**The fix: an immutable `record Pricing` behind a `volatile` reference.** The reload builds a complete new `Pricing` and publishes it with one volatile write. A reader does one volatile read and uses that snapshot for the whole quote. The fixed repricer saw the surge immediately, and over 3.1 to 3.7 million reads per run, none were mixed.",
            "As a check, I removed `volatile` from `current` and ran it again: the fixed repricer never printed and the JVM never exited (that thread isn't a daemon), while the snapshot reads were still never mixed. Immutability fixed the consistency; `volatile` fixed the visibility. The service needed both.",
          ],
        },
        {
          type: "list",
          items: [
            "Lesson: config, feature flags and routing tables are read-mostly shared state. Model them as immutable snapshots and swap a `volatile` (or `AtomicReference`) reference.",
            "Lesson: never mutate a shared object in place while others read it; a multi-field update is a race even when every field is `volatile`.",
            "Lesson: a field read in a tight loop without any synchronization can be read once and never again. If a loop waits for another thread, the variable it reads must be `volatile` (or the loop must use a proper waiting primitive).",
            "Lesson: read the reference once per unit of work (`Pricing p = current;`) and use `p` throughout, so one quote never mixes two configs.",
            "Lesson: if two admins can reload at once, serialize the reloads; publishing snapshots makes reads consistent, not concurrent writes.",
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
              question: "What does the volatile keyword do?",
              answer:
                "It makes reads and writes of a field visible across threads and ordered: every read sees the most recent write (in the happens-before order), the JIT can't cache the field in a register or hoist the read out of a loop, and writes made before a volatile write are visible to a thread that reads the volatile and sees that write. It also makes `long` and `double` reads and writes atomic. It doesn't make compound operations like `count++` atomic.",
            },
            {
              question: "Why can a loop like while (!stop) {} run forever even after another thread sets stop = true?",
              answer:
                "Because without `volatile` or synchronization, the JMM doesn't require the loop to ever see the other thread's write, and C2 takes advantage of that: it hoists the read out of the loop. I disassembled C2's code for such a loop and the field was read once before the loop, which then only incremented a register and polled for safepoints. Under `-Xint` and with C1 the same program stopped; with C2 it never did. Declaring the field `volatile` fixes it.",
            },
            {
              question: "Is volatile count++ thread-safe?",
              answer:
                "No. `count++` is a volatile read, an add and a volatile write, and two threads can read the same value in between. Four threads doing a million increments each on a volatile `int` ended with 2.3 to 2.7 million in my runs. Use `AtomicInteger.incrementAndGet` (exact every time), `LongAdder`, or a lock.",
            },
            {
              question: "What is the difference between volatile and synchronized?",
              answer:
                "`synchronized` gives mutual exclusion plus visibility: one thread at a time in the block, and the next holder of the same lock sees everything the previous one wrote. `volatile` gives visibility and ordering for one field without any exclusion: no blocking, no atomic compound operations. Use `volatile` for flags and published references with one writer; use `synchronized` (or atomics) when a sequence of operations must be atomic.",
            },
            {
              question: "What is happens-before?",
              answer:
                "The JMM's ordering relation: if A happens-before B, B is guaranteed to see A's effects. Edges come from program order within a thread, unlocking then locking the same monitor, writing then reading the same volatile, `start()` to the started thread's actions, a thread's actions to `join()` returning, interrupt to its detection, and the end of a constructor for final fields, and the relation is transitive. If two conflicting accesses aren't ordered by happens-before, it's a data race.",
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
              question: "Why is double-checked locking broken without volatile, and how does volatile fix it?",
              answer:
                "The first check reads the field without a lock, so there's no happens-before edge between the thread that constructed the object and the reader. The construction's field writes and the reference store can be reordered, so the reader can see a non-null reference to an object whose fields aren't visible yet. With `volatile`, the reference store is a volatile write that comes after the constructor in program order, and a reader whose volatile read sees it gets a happens-before edge to the whole construction. The holder-class idiom or an enum avoids the question for static singletons.",
            },
            {
              question: "What is safe publication? Name some ways to do it.",
              answer:
                "Making an object visible to other threads in a way that guarantees they see it fully constructed. Ways: store the reference in a `volatile` field or `AtomicReference`; in a field guarded by a lock that readers also take; in a `final` field of a properly constructed object; from a static initialiser; or hand it over through a concurrent collection, `BlockingQueue`, executor or `CompletableFuture`. Immutable objects with only final fields are safe even if published through a race.",
            },
            {
              question: "What guarantee do final fields give, and how can it be broken?",
              answer:
                "When a constructor completes, its final fields are frozen: any thread that gets a reference to the object afterwards sees the final values, even through a racy publication. It's broken by letting `this` escape during construction (registering a listener, starting a thread, storing `this` in a static field) because the other code can then see the object before the freeze. My example showed a listener reading `null` and 0 from two final fields that way, without any concurrency at all.",
            },
            {
              question: "How do you publish a group of related values so readers never see a mixture?",
              answer:
                "Put them in one immutable object (a record with final fields), build a new instance for each change, and publish it with a single write to a `volatile` field (or `AtomicReference`). Readers read the reference once and use that snapshot. Updating fields of a shared object in place produced 34,000 to 70,000 mixed reads per run in my test; the snapshot version produced none. If several writers can update concurrently, serialize them or use a CAS loop.",
            },
            {
              question: "Is reading a long or double atomic in Java?",
              answer:
                "Not guaranteed for plain fields: JLS 17.7 allows a non-volatile 64-bit write to be split into two 32-bit halves, so a reader could see a torn value. Volatile `long` and `double` reads and writes are always atomic, and so are reference reads and writes. On 64-bit HotSpot plain `long` accesses are atomic in practice, but the specification doesn't promise it, so code that shares a `long` across threads should use `volatile`, a lock or `AtomicLong` anyway, for visibility if nothing else.",
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
              question: "What does a volatile write compile to on x86, and why is a volatile read cheap?",
              answer:
                "I disassembled C2's code: a plain store is `mov`; a volatile store is the same `mov` followed by `lock add DWORD PTR [rsp-0x40], 0`, a locked no-op on the stack that acts as a full StoreLoad fence by draining the store buffer. A volatile load is a plain `mov`: x86's TSO model already keeps loads ordered with loads and stores, so acquire semantics need no instruction, only the compiler's promise not to cache or reorder the load. I measured about 7 ns per volatile write against 0.5 ns per plain write in a loop, and volatile reads at the same cost as plain ones.",
            },
            {
              question: "Explain the store-buffering (Dekker) litmus test and what the JMM says about it.",
              answer:
                "Two threads: `x = 1; r1 = y;` and `y = 1; r2 = x;`, starting from zero. Under sequential consistency `r1 == 0 && r2 == 0` is impossible, but with plain fields the JMM allows it (it's a data race), and real hardware produces it: each core's store waits in its store buffer while its load reads the old value. I counted 3.7 to 7 million `(0,0)` outcomes in 20.48 million trials with C2, 16,650 to 27,516 in the interpreter (pure hardware), and zero with `volatile` fields, because volatile accesses are sequentially consistent with each other and the volatile store's fence drains the buffer before the load.",
            },
            {
              question: "What is the difference between the JMM and the x86 memory model?",
              answer:
                "x86 implements TSO: the only reordering it allows is a store followed by a load from a different address (because of store buffers). ARM and POWER also reorder loads with loads and stores with stores. The JMM is weaker than all of them for plain accesses, so it can be implemented on every platform and leave the JIT free to reorder and cache. Programs that are data-race-free get sequential consistency (DRF-SC) regardless of hardware. Code that relies on x86 behaviour, like my unsafe-publication test that never saw a half-built object in 600 million reads, can fail on ARM.",
            },
            {
              question: "What are the VarHandle access modes and when would you use acquire/release instead of volatile?",
              answer:
                "Plain (no guarantees), opaque (each access happens and is coherent, but nothing else is ordered), acquire/release (a release store makes earlier writes visible to a thread whose acquire load sees it), and volatile (sequentially consistent). Acquire/release is enough for one-way publication from a single writer: it skips the StoreLoad fence, so on x86 `setRelease` is a plain `mov` instead of `mov` plus `lock add`. It isn't enough for Dekker-style protocols where each thread writes and then reads the other's variable; those need volatile.",
            },
            {
              question: "Why did a count++ loop on a plain int lose whole millions of increments at once, while a volatile int lost them one at a time?",
              answer:
                "Because C2 may treat a plain field like a local inside a loop without synchronization: read it once, increment a register, and write it back rarely or once at the end. Two threads doing that overwrite each other's entire batches, so the totals land near multiples of a million. A volatile field must be read and written on every iteration, so collisions happen per increment: steady losses of 33% to 43% in my runs. Both are wrong; only the shape of the wrongness differs.",
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
              question: "A background worker that should stop when a shutdown flag is set keeps running in production, but stops fine in tests and in the debugger. What do you suspect and how do you confirm it?",
              answer:
                "A non-volatile flag read in a loop that C2 has compiled and hoisted. Tests and debuggers often run interpreted or short enough that C2 never compiles the loop. To confirm: a thread dump shows the worker RUNNABLE in the loop; `-XX:+PrintCompilation` shows a tier-4 `%` (OSR) compilation of that method; running with `-Xint` or `-XX:TieredStopAtLevel=1` makes the problem go away, as it did for my `StopFlag`. Fix: make the flag `volatile` (or an `AtomicBoolean`), and if the worker blocks in `sleep`, `wait` or a queue, also `interrupt()` it, which stopped my poller in 0 ms instead of 16.",
            },
            {
              question: "After a config hot-reload, some requests use a mix of old and new settings for a few seconds. The config object's fields are all volatile. Why, and what do you change?",
              answer:
                "Because the reload updates several fields of one shared object, one at a time. Each field is visible, but a reader running between two field writes sees a combination that never existed as a config. `volatile` on fields doesn't make the group atomic. My rebuild saw 34,000 to 70,000 mixed reads per run. Change the config into an immutable record, build a complete new one on reload, and publish it through one `volatile` reference; each request reads the reference once and uses that snapshot. That gave zero mixed reads. Serialize reloads if two can run at once.",
            },
            {
              question: "A lazy singleton uses double-checked locking. Code review flags it, the author says it has worked for years on x86. How do you respond?",
              answer:
                "If the field isn't `volatile`, it's a data race: the JMM allows another thread to see a non-null reference to an object whose constructor's writes aren't visible. It hasn't failed on x86 because x86 doesn't reorder stores and C2 happened to emit the constructor's stores first; my unsafe-publication test saw nothing in 600 million reads on x86 too. It can fail on ARM servers, with a different JIT, or after a refactor. The fix is one keyword (`volatile`), or better for a static singleton, the holder idiom or an enum, which are lazy, correct by the class-initialisation rules, and slightly faster on the hot path (0.5 against 0.65 ns per call in my measurement).",
            },
            {
              question: "A monitoring counter is a volatile long incremented by 50 request threads, and its totals are consistently 30% below the access logs. What's wrong?",
              answer:
                "`count++` on a volatile is not atomic, so concurrent increments overwrite each other. With four threads I lost 33% to 43%. `volatile` only guarantees each read and write is visible. Replace it with a `LongAdder` (best for many writers and occasional reads, since it stripes the counter across cells) or an `AtomicLong`. If the counter is also read in a hot loop, `LongAdder.sum()` is more expensive than a read, which is the trade-off covered in lesson 6.",
            },
            {
              question: "A service passes all its tests on developer laptops and x86 CI, but after moving to ARM (Graviton) instances a cache occasionally returns entries with null fields. Where do you look?",
              answer:
                "Unsafe publication. ARM can make stores visible out of order, so an object published through a plain field (a lazily filled cache slot, a non-volatile double-checked singleton, a `HashMap` written by one thread and read by others without synchronization) can be seen before its fields are written. x86 hides this because it keeps stores in order. I'd look for shared fields written without `volatile`, locks or concurrent collections, objects whose constructors let `this` escape, and caches implemented with plain maps. Fixes: `ConcurrentHashMap`, `volatile`/`AtomicReference` for published references, final fields for immutable values, and jcstress tests run on ARM CI.",
            },
            {
              question: "To fix a visibility bug, a teammate proposes making every field in a class volatile. What do you say?",
              answer:
                "It may fix visibility, but not atomicity or consistency: compound updates (`count++`, check-then-act) still race, and several volatile fields can still be read in inconsistent combinations. It also costs: each volatile store is a full fence, 7 ns against 0.5 ns per write in my loop, and it blocks JIT optimisations on every access. I'd identify which state is shared and who writes it, then choose: immutable snapshots behind one volatile reference for read-mostly data, atomics for counters, a lock for invariants across fields, and confinement for everything else.",
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
            "Run `StopFlag` three times, then `java StopFlag volatile`, then `java -Xint StopFlag`.",
            "Run `java -XX:+PrintCompilation StopFlag | grep lambda` and find the tier-4 line with a `%`.",
            "Change `StopFlag`'s plain loop to `while (running) { spins++; Thread.yield(); }` and run it.",
            "Run `VolatileCount` twice and compare the two columns.",
            "Run `StoreLoad` with and without `-Xint`, and compare the `(0,0)` column for plain and volatile fields.",
            "In `ConfigReload`, remove `volatile` from `current` and run it.",
            "Run `VolatileTour` and check which line prints before `ZoneDirectory initialised`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 hangs-then-reports `worker still running 3 s later` with the plain field every time, and stops at once with `volatile` and with `-Xint`. Step 2 shows lines like `59   29 %     4       StopFlag::lambda$main$0 @ 19 (45 bytes)`. Step 3 stopped in my run (after 317,916 spins), because the JIT doesn't keep `running` in a register across a call into the VM, but that's an implementation detail, not a guarantee: the JMM still allows it to spin forever. Step 4 shows the volatile column well below 4,000,000 and different each run, and the `AtomicInteger` column at exactly 4,000,000. Step 5 shows millions of `(0,0)` outcomes for plain fields compiled, tens of thousands under `-Xint`, and 0 for volatile in both. Step 6 still shows `0 mixed` for the snapshot reads, but `fixed repricer saw surge` never prints and the program doesn't exit (press Ctrl+C), because the repricer's loop is hoisted again. Step 7 prints `before first get()` before `ZoneDirectory initialised`: the holder class is initialised on first use.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `3 PROBLEMS  atomicity (count++)  visibility (stale/never)  ordering
VISIBILITY  plain flag in a loop -> C2 hoists the read -> spins forever
            (-Xint and C1 stopped; C2 read the field once, then jmp)
VOLATILE    every access really happens, in order
            read  = plain mov on x86 (~free)
            write = mov + lock add [rsp-0x40],0  (StoreLoad fence, ~7 ns)
            NOT atomic: volatile count++ lost 33-43%
HB RULES    program order; unlock -> lock; volatile write -> read;
            start() -> thread; thread -> join(); ctor end -> final
            fields; transitive. No hb + a write = data race
REORDERING  x = 1; r1 = y || y = 1; r2 = x
            (0,0): 3.7-7M of 20.5M (C2), ~20K (-Xint), 0 (volatile)
            x86 TSO reorders only store->load; ARM reorders all four
PUBLISH     volatile / lock / final / static init / concurrent handoff
            DCL needs volatile; holder idiom or enum for singletons
            never let 'this' escape a constructor
PATTERN     immutable snapshot + ONE volatile reference
            read it once per unit of work; serialize the writers`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Without a happens-before edge, another thread may see an old value, a value forever stale, or writes in a different order. The JIT causes most of the surprises; the hardware adds store-load reordering on x86 and more on ARM.",
            "`volatile` gives one variable visibility and ordering, and with piggybacking it publishes everything written before it. It never makes a read-modify-write atomic. Immutable snapshots behind a `volatile` reference are the workhorse pattern for shared read-mostly state.",
            "Next comes ReentrantLock, ReadWriteLock, StampedLock and AQS: explicit locks that can time out, be interrupted, be fair, have several conditions, and separate readers from writers, and the AbstractQueuedSynchronizer that most of `java.util.concurrent` is built on.",
          ],
        },
      ],
    },
  ],
};
