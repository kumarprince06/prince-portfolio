import type { Lesson } from "../types";

export const jitCompilationAndJvmTuning: Lesson = {
  slug: "jit-compilation-and-jvm-tuning",
  date: "2026-11-13",
  title: "JIT Compilation, Profiling and JVM Tuning",
  description:
    "The execution engine on JDK 21, measured: the interpreter, C1 and C2 and the five tiers between them, -XX:+PrintCompilation decoded column by column, compile thresholds found to the exact call (tier 3 at the 256th invocation), warm-up measured per batch under -Xint, C1 only, C2 only and tiered, inlining read from PrintInlining (and how one inlining decision turned 64 MB of allocation into zero), why the Wrapper Traps loop kept exactly half of its boxes (loop unrolling), deoptimization when a monomorphic call site turns megamorphic, vectorisation (4x), the code cache, why a naive benchmark measured 0.00 ns per call, ergonomics and container memory measured inside real Docker containers (a 1 GB container gets a 256 MB heap and the Serial collector), a container killed with exit code 137 instead of an OutOfMemoryError, jstat, jcmd and JFR, AppCDS cutting startup by a third, and a fare-quote service whose p99 spiked after every deploy.",
  tags: ["JVM", "JIT", "Performance", "Tuning"],
  sections: [
    {
      title: "What JIT Compilation and JVM Tuning Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, JVM Memory Areas and Garbage Collection, followed objects from allocation to reuse. This one follows **code**: the bytecode that `javac` produced, from its first interpreted execution to optimised machine code, and back again when the JVM's assumptions turn out wrong. The JVM lesson already measured the headline (the same Collatz loop took 12.8 s interpreted and 516 ms with the full JIT) and showed a few lines of `-XX:+PrintCompilation`. Here I go through the mechanism behind those numbers.",
        },
        {
          type: "paragraph",
          text: "**JIT (just-in-time) compilation** means compiling while the program runs, using information that only exists at run time: which methods are hot, which branches are taken, which classes actually arrive at a virtual call. HotSpot has an interpreter and two compilers, C1 (fast to compile, modest optimisation) and C2 (slow to compile, aggressive, speculative optimisation), arranged in tiers. The speculation is the important part: C2 compiles for what it has **seen**, and keeps a way back to the interpreter (deoptimization) for when the program does something new.",
        },
        {
          type: "paragraph",
          text: "**JVM tuning** is the second half of this lesson: choosing flags (heap size, collector, code cache, startup options) from measurements rather than folklore, with the tools that ship in the JDK (`-XX:+PrintFlagsFinal`, `jcmd`, `jstat`, JFR) and with the container limits most services now run under. The production story at the end puts both halves together: a latency spike after every deploy that was half warm-up and half heap sizing.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The first JVMs only interpreted, which is where Java's early reputation for slowness came from. Symantec and others shipped JIT compilers that compiled every method on first call, which made startup slow. HotSpot, built on research from the Self language at Sun and Stanford, took the opposite approach: interpret first, profile, and only compile the hot spots, hence the name. Most of what this lesson measures is a refinement of that idea.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["JDK 1.1 (1997)", "Symantec JIT, compile-everything", "Faster loops, slow startup"],
            ["JDK 1.2 / 1.3 (1999 to 2000)", "HotSpot: interpreter plus profiling, client (C1) and server (C2) compilers; default in 1.3", "Adaptive optimisation, deoptimization, OSR"],
            ["Java 5 (2004)", "Class Data Sharing (CDS) for JDK classes", "Faster startup by mapping pre-parsed classes"],
            ["Java 6u23 (2010)", "Escape analysis enabled by default in C2", "Scalar replacement of non-escaping objects"],
            ["Java 7 (2011)", "Tiered compilation available (C1 then C2)", "Fast warm-up and peak performance in one JVM"],
            ["Java 8 (2014)", "Tiered compilation on by default", "The five tiers measured below"],
            ["Java 8u191 / 10 (2018)", "Container awareness, `-XX:MaxRAMPercentage` (JDK-8146115)", "Heap sized from the cgroup limit, not the host"],
            ["Java 9 (2017)", "Segmented code cache (JEP 197)", "Profiled, non-profiled and non-method heaps"],
            ["Java 10 (2018)", "Application CDS (JEP 310)", "Archive your own classes, not just the JDK's"],
            ["Java 11 (2018)", "JFR open-sourced (JEP 328)", "Production profiling at about 1% overhead, free"],
            ["Java 12 / 13 (2019)", "Default CDS archive (JEP 341), dynamic archiving at exit (JEP 350)", "`-XX:ArchiveClassesAtExit`"],
            ["Java 21 (2023)", "`jfr view` summaries; virtual threads (JEP 444)", "The JDK used in this lesson"],
            ["Java 24 (2025)", "Ahead-of-time class loading and linking cache (JEP 483)", "The successor to AppCDS, from Project Leyden"],
          ],
        },
        {
          type: "paragraph",
          text: "JMH, the benchmark harness that this lesson explains but can't run (it isn't available offline on this machine), was written by Aleksey Shipilev and the HotSpot performance team around 2013, precisely because hand-written benchmarks kept measuring the JIT's tricks instead of the code.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A new driver joins a ride-hailing fleet in Kolkata.",
        },
        {
          type: "list",
          items: [
            "**The interpreter is turn-by-turn navigation.** On day one, Ravi follows the app for every trip: correct, but slow, and he looks at the screen at every junction.",
            "**C1 with profiling is a notebook.** After a few hundred trips on the SALT-LAKE to NEW-TOWN run, he has a rough route written down and drives it faster, while still noting traffic at each junction (profiling) so he can improve it.",
            "**C2 is knowing the route by heart**, including the shortcut through the side road that is always open at night. He no longer checks; he **assumes**. That's speculation, and it's why he's fast.",
            "**Deoptimization** is the morning the side road is closed. Ravi doesn't crash: he notices at the junction, switches back to the app (the interpreter) for that trip, updates his notes, and eventually learns a new route that accounts for the closure.",
            "**Warm-up** is why a new driver's first week has worse ratings than his third: same driver, same car, less knowledge. A fleet that sends a new driver straight into peak-hour airport traffic will see complaints.",
            "**Tuning** is the fleet manager deciding the car size, fuel tank and spare tyre from measured trips, not from what another fleet does.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a human learns one route at a time and forgets slowly. The JVM learns per method, can hold several versions of the same method at once (an old one being retired while a new one is compiled), and forgets nothing between deploys only if you make it remember: by default every restart is a new driver on day one. CDS and the AOT cache in later JDKs are the beginning of giving the JVM a memory across restarts.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java/jit-compilation-and-jvm-tuning-tiers.svg",
          alt: "A timeline of one method through HotSpot's tiers on JDK 21. Tier 0, the interpreter, executes bytecode and counts invocations and loop back-edges. After about 200 invocations (checked every 128, so at the 256th call in my measurement) the method is queued for tier 3: C1 with full profiling, which records branch frequencies and receiver types. After about 5,000 more invocations it is queued for tier 4: C2, which uses the profile to inline, eliminate allocations by escape analysis, unroll and vectorise loops, and speculate on types. The tier 3 version is then marked made not entrant. A long arrow from tier 4 back to tier 0 is labelled deoptimization: an uncommon trap such as unstable_if or class_check sends execution back to the interpreter and the method is recompiled with the new profile. A side box shows on-stack replacement, the percent sign in PrintCompilation output, where a long-running loop switches to compiled code at a bytecode index. Another box shows tiers 1 and 2: C1 without or with limited profiling, used for trivial methods or when C2's queue is long. At the bottom, the code cache with its three segments: non-method code, profiled code from tier 2 and 3, and non-profiled code from tiers 1 and 4.",
          caption: "Interpret, profile, compile for what was seen, and fall back when the assumption breaks.",
        },
        {
          type: "heading",
          text: "The five tiers",
        },
        {
          type: "table",
          headers: ["Tier", "Who runs it", "Profiling", "Typical speed in my WarmupBatches test", "When it's used"],
          rows: [
            ["0", "Interpreter", "Invocation and back-edge counters, some type profiles", "~1,500 µs per batch", "Every method starts here; deoptimized code returns here"],
            ["1", "C1, no profiling", "None", "~600 µs", "Trivial methods (getters) that C2 couldn't improve; `-XX:TieredStopAtLevel=1`"],
            ["2", "C1, limited profiling", "Counters only", "", "When C2's queue is long, as a cheaper stepping stone"],
            ["3", "C1, full profiling", "Counters, branches, receiver types", "~640 µs", "The normal second step"],
            ["4", "C2", "None (uses the tier 3 profile)", "~120 to 150 µs", "Hot methods; speculative optimisation"],
          ],
        },
        {
          type: "heading",
          text: "The thresholds and limits that matter",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+PrintFlagsFinal -version 2>/dev/null | grep -E " (Tier3InvocationThreshold|Tier4InvocationThreshold|Tier3BackEdgeThreshold|Tier4BackEdgeThreshold|Tier0InvokeNotifyFreqLog|Tier3InvokeNotifyFreqLog|CompileThreshold|MaxInlineSize|FreqInlineSize|MaxInlineLevel|ReservedCodeCacheSize|CICompilerCount|DoEscapeAnalysis|UseSuperWord|LoopUnrollLimit) "`,
        },
        {
          type: "output",
          text: `     intx CICompilerCount                          = 4                                         {product} {ergonomic}
     intx CompileThreshold                         = 10000                                  {pd product} {default}
     bool DoEscapeAnalysis                         = true                                   {C2 product} {default}
     intx FreqInlineSize                           = 325                                 {C2 pd product} {default}
     intx LoopUnrollLimit                          = 60                                  {C2 pd product} {default}
     intx MaxInlineLevel                           = 15                                     {C2 product} {default}
     intx MaxInlineSize                            = 35                                     {C2 product} {default}
    uintx ReservedCodeCacheSize                    = 251658240                              {pd product} {ergonomic}
     intx Tier0InvokeNotifyFreqLog                 = 7                                         {product} {default}
     intx Tier3BackEdgeThreshold                   = 60000                                     {product} {default}
     intx Tier3InvocationThreshold                 = 200                                       {product} {default}
     intx Tier3InvokeNotifyFreqLog                 = 10                                        {product} {default}
     intx Tier4BackEdgeThreshold                   = 40000                                     {product} {default}
     intx Tier4InvocationThreshold                 = 5000                                      {product} {default}
     bool UseSuperWord                             = true                                   {C2 product} {default}`,
        },
        {
          type: "table",
          headers: ["Flag", "Default here", "Meaning"],
          rows: [
            ["`Tier3InvocationThreshold`", "200", "Calls before the interpreter asks for a tier 3 compile"],
            ["`Tier0InvokeNotifyFreqLog`", "7", "The interpreter only checks the counter every 2^7 = 128 calls"],
            ["`Tier4InvocationThreshold`", "5000", "Calls in tier 3 code before C2 is asked"],
            ["`Tier3InvokeNotifyFreqLog`", "10", "Tier 3 code checks every 2^10 = 1,024 calls"],
            ["`Tier3/4BackEdgeThreshold`", "60,000 / 40,000", "Loop iterations that trigger compilation (and OSR) of a method with a hot loop"],
            ["`CompileThreshold`", "10,000", "Only used with `-XX:-TieredCompilation`"],
            ["`MaxInlineSize`", "35 bytes", "Any callee up to this bytecode size can be inlined"],
            ["`FreqInlineSize`", "325 bytes", "Hot callees up to this size can be inlined by C2"],
            ["`CICompilerCount`", "4 (8 CPUs)", "Compiler threads, chosen by ergonomics, split between C1 and C2"],
            ["`ReservedCodeCacheSize`", "240 MB", "The code cache, segmented"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "A small fare calculation, called a million times from `main`, so both an ordinary method and a hot loop get compiled:",
        },
        {
          type: "code",
          language: "java",
          title: "FareJit.java",
          code: `public class FareJit {
    static long fare(long distanceM, long minutes, int surgePercent) {
        long base = 4_000 + distanceM * 12 / 1_000 * 100 + minutes * 150;   // paise
        return base + base * surgePercent / 100;
    }

    public static void main(String[] args) {
        long total = 0;
        for (int i = 0; i < 1_000_000; i++) {
            total += fare(1_000 + i % 9_000, 5 + i % 40, i % 3 == 0 ? 20 : 0);
        }
        System.out.println("total " + total);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -XX:+PrintCompilation FareJit | grep -E \"FareJit|total\"",
        },
        {
          type: "output",
          text: `21    6       3       FareJit::fare (39 bytes)
21    7       4       FareJit::fare (39 bytes)
22    6       3       FareJit::fare (39 bytes)   made not entrant
24    8 %     3       FareJit::main @ 4 (64 bytes)
24    9       3       FareJit::main (64 bytes)
25   10 %     4       FareJit::main @ 4 (64 bytes)
26    8 %     3       FareJit::main @ 4 (64 bytes)   made not entrant
31   10 %     4       FareJit::main @ 4 (64 bytes)   made not entrant
total 15167708010`,
        },
        {
          type: "table",
          headers: ["Column", "Example", "Meaning"],
          rows: [
            ["1", "`21`", "Milliseconds since JVM start"],
            ["2", "`6`", "Compile ID; the same ID on a later line refers to the same compiled version"],
            ["3", "`%`", "Attributes: `%` on-stack replacement, `s` synchronized, `!` has exception handlers, `b` blocking compile, `n` native wrapper"],
            ["4", "`3`", "Tier (0 to 4)"],
            ["5", "`FareJit::fare (39 bytes)`", "Method and its bytecode size"],
            ["OSR only", "`@ 4`", "The bytecode index of the loop where compiled code is entered"],
            ["Suffix", "`made not entrant`", "This version may not be entered any more; callers will go to a newer version or the interpreter"],
          ],
        },
        {
          type: "list",
          items: [
            "**`fare` went 0, 3, 4 in about a millisecond.** Compile 6 is the C1 tier 3 version with profiling; compile 7 is C2's. As soon as C2's version was installed, the tier 3 version was **made not entrant**: it's still in the code cache until no thread is executing it, but new calls go to compile 7.",
            "**`main` never returns until the end, so it can't simply be replaced.** The `%` lines are on-stack replacement: compile 8 is a tier 3 version of `main` entered at bytecode 4 (the loop header), and compile 10 is C2's. The running interpreter frame is converted into a compiled frame in the middle of the loop.",
            "**Why was C2's OSR code made not entrant at 31 ms, when the loop had finished?** I turned on `-Xlog:deoptimization=debug` to find out:",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xlog:deoptimization=debug FareJit",
        },
        {
          type: "output",
          text: `[0.040s][debug][deoptimization] cid=  10 osr level=4 FareJit.main([Ljava/lang/String;)V trap_bci=7 osr_bci=4 unstable_if reinterpret pc=0x00007439442c9b5c relative_pc=0x000000000000015c
total 15167708010`,
        },
        {
          type: "paragraph",
          text: "`unstable_if` at bytecode 7, the loop condition `i < 1_000_000`. In every profiled iteration that branch had gone the same way, so C2 compiled only the \"keep looping\" path and put an **uncommon trap** on the exit path instead of real code. When the loop finally ended, the trap fired: the compiled frame was converted back into an interpreter frame (`reinterpret`), and the interpreter ran the `println`. That's deoptimization in its most harmless form, and it shows the core idea: C2 doesn't compile code for paths it has never seen run.",
        },
      ],
    },
    {
      title: "Warm-Up, Measured",
      blocks: [
        {
          type: "paragraph",
          text: "The JVM lesson timed a whole program under each mode. For a service, what matters is how the **per-request** cost changes over the first seconds, so I timed a fare quote in batches of 2,000 calls:",
        },
        {
          type: "code",
          language: "java",
          title: "WarmupBatches.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class WarmupBatches {
    static final Map<String, Integer> SURGE = new HashMap<>(Map.of("SALT-LAKE", 20, "NEW-TOWN", 10, "HOWRAH", 0));
    static final String[] ZONES = {"SALT-LAKE", "NEW-TOWN", "HOWRAH"};

    static long quote(int i) {
        String zone = ZONES[i % ZONES.length];
        long distanceM = 800 + (i * 37L) % 12_000;
        long paise = 4_000 + distanceM * 12 / 10 + (i % 40) * 150;
        for (int stop = 0; stop < 20; stop++) paise += (paise ^ stop) % 7;   // a bit of real work
        return paise + paise * SURGE.getOrDefault(zone, 0) / 100;
    }

    public static void main(String[] args) {
        int batches = 40, perBatch = 2_000;
        long sink = 0;
        long[] micros = new long[batches];
        for (int b = 0; b < batches; b++) {
            long t = System.nanoTime();
            for (int i = 0; i < perBatch; i++) sink += quote(b * perBatch + i);
            micros[b] = (System.nanoTime() - t) / 1_000;
        }
        StringBuilder sb = new StringBuilder("us per batch of 2000:");
        for (int b : new int[] {0, 1, 2, 3, 4, 5, 9, 19, 39}) sb.append(" b").append(b + 1).append('=').append(micros[b]);
        System.out.println(sb + "  (sink " + sink % 1000 + ")");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xint WarmupBatches                    # interpreter only
java -XX:TieredStopAtLevel=1 WarmupBatches  # interpreter + C1 without profiling
java -XX:-TieredCompilation WarmupBatches   # interpreter + C2 only
java WarmupBatches                          # default: tiered`,
        },
        {
          type: "output",
          text: `# -Xint
us per batch of 2000: b1=1544 b2=1507 b3=1472 b4=1538 b5=1467 b6=1511 b10=1499 b20=1421 b40=1444  (sink 851)
# -XX:TieredStopAtLevel=1
us per batch of 2000: b1=954 b2=630 b3=584 b4=628 b5=587 b6=626 b10=616 b20=629 b40=541  (sink 851)
# -XX:-TieredCompilation
us per batch of 2000: b1=1759 b2=1707 b3=404 b4=421 b5=348 b6=396 b10=200 b20=154 b40=156  (sink 851)
# default
us per batch of 2000: b1=1118 b2=637 b3=713 b4=665 b5=618 b6=661 b10=146 b20=146 b40=118  (sink 851)`,
        },
        {
          type: "list",
          items: [
            "**`-Xint` is flat and slow:** about 1,500 µs per batch forever, 0.75 µs per quote. No warm-up, because there's nothing to warm up.",
            "**C1 alone gets fast immediately and stays there:** from the second batch, about 600 µs, 2.5 times faster than the interpreter. It's what `TieredStopAtLevel=1` is for: short-lived tools and CLIs that will never reach C2 anyway.",
            "**C2 alone (no tiers) has the worst start:** two full batches at interpreter speed (it waits for 10,000 invocations plus back-edges, `CompileThreshold`), then the fastest steady state.",
            "**Tiered gives both:** batch 1 is a mix of interpreter and compilation, batches 2 to 6 run on C1's profiled code (about 640 µs, a little slower than plain C1 because it's counting), and by batch 10 C2's code has taken over at 120 to 150 µs, **10 times faster than batch 1 for the same work**. In this program, warm-up is about 15,000 to 20,000 calls.",
            "The numbers are single runs on one laptop; I ran each mode three times, and the shape (and the 10x) was the same every time, with individual batches moving by 10 to 30%.",
          ],
        },
        {
          type: "heading",
          text: "Finding the compile thresholds exactly",
        },
        {
          type: "paragraph",
          text: "`Tier3InvocationThreshold` is 200, but a method called 200 times isn't compiled. To see the real rule, I called a tiny method exactly `n` times, slowly enough that the compiler threads keep up, and bisected `n`:",
        },
        {
          type: "code",
          language: "java",
          title: "Threshold.java",
          code: `public class Threshold {
    static int surge(int zone) {                     // no loop inside: only invocations count
        return zone % 3 == 0 ? 20 : 10;
    }

    public static void main(String[] args) throws Exception {
        int calls = Integer.parseInt(args[0]);
        int sum = 0;
        for (int i = 0; i < calls; i++) {
            sum += surge(i);
            if (i % 50 == 0) Thread.sleep(1);        // slow enough that compilation keeps up
        }
        Thread.sleep(200);
        System.out.println(calls + " calls, sum " + sum);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `for n in 255 256 6000; do java -XX:+PrintCompilation Threshold $n | grep -E "Threshold::surge|calls"; done`,
        },
        {
          type: "output",
          text: `255 calls, sum 3400
28    6       3       Threshold::surge (14 bytes)
256 calls, sum 3420
29    6       3       Threshold::surge (14 bytes)
147    7       4       Threshold::surge (14 bytes)
148    6       3       Threshold::surge (14 bytes)   made not entrant
6000 calls, sum 80000`,
        },
        {
          type: "list",
          items: [
            "**255 calls: never compiled. 256 calls: tier 3.** The threshold is 200, but the interpreter only checks its counter every 2^`Tier0InvokeNotifyFreqLog` = 128 calls. At 128 the count is below 200; at 256 it's above. So in practice tier 3 happens at the 256th call.",
            "**Tier 4 followed the same logic one level up:** tier 3 code checks every 1,024 calls, and the threshold is 5,000 more calls, so the first check that passes is around call 256 + 5,120. In repeated runs, tier 4 appeared between 5,400 and 5,500 calls (compilation is asynchronous, so a few calls happen before the compiled code is installed). In one early run, on a busier machine, it appeared by 4,000. HotSpot scales thresholds with compiler queue length, so these are not contractual numbers.",
            "Methods with loops are compiled much sooner, because back-edges count too: that's how `main` in `FareJit` was OSR-compiled within milliseconds of starting.",
          ],
        },
      ],
    },
    {
      title: "Inlining: The Optimisation That Enables the Others",
      blocks: [
        {
          type: "paragraph",
          text: "Inlining copies a callee's body into the caller. On its own it saves a call, but its real value is that the optimiser can then see across what used to be a method boundary: constants propagate, branches fold, and objects passed to the callee may no longer escape. I wrote a fare calculation with a deliberately large tariff method:",
        },
        {
          type: "code",
          language: "java",
          title: "Inlining.java",
          code: `import java.lang.management.ManagementFactory;

public class Inlining {
    record Trip(long distanceM, int minutes, String zone) {}

    static int surgePercent(String zone) {                          // small: 20-odd bytes of bytecode
        return zone.equals("SALT-LAKE") ? 20 : 0;
    }

    static long bigTariff(Trip t) {                                 // deliberately large method
        long p = 4_000;
        if (t.distanceM() > 1_000) p += (t.distanceM() - 1_000) * 12 / 10;
        if (t.distanceM() > 5_000) p += (t.distanceM() - 5_000) * 2 / 10;
        if (t.distanceM() > 10_000) p += (t.distanceM() - 10_000) * 3 / 10;
        if (t.distanceM() > 20_000) p += (t.distanceM() - 20_000) * 4 / 10;
        if (t.minutes() > 10) p += (t.minutes() - 10) * 150L;
        if (t.minutes() > 30) p += (t.minutes() - 30) * 50L;
        if (t.minutes() > 60) p += (t.minutes() - 60) * 25L;
        if (t.zone().startsWith("SALT")) p += 500;
        if (t.zone().startsWith("NEW")) p += 300;
        if (t.zone().startsWith("HOW")) p += 200;
        if (t.zone().length() > 8) p += 10;
        return p;
    }

    static long fare(Trip t) {
        long base = bigTariff(t);
        return base + base * surgePercent(t.zone()) / 100;
    }

    public static void main(String[] args) {
        var mx = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        String[] zones = {"SALT-LAKE", "NEW-TOWN", "HOWRAH"};
        for (int round = 1; round <= 5; round++) {
            long bytes = mx.getCurrentThreadAllocatedBytes(), t = System.nanoTime(), total = 0;
            for (int i = 0; i < 2_000_000; i++) {
                total += fare(new Trip(500 + i % 25_000, i % 90, zones[i % 3]));   // a Trip per call
            }
            System.out.printf("round %d: %3d ms, %,11d bytes allocated, total %d%n", round,
                    (System.nanoTime() - t) / 1_000_000, mx.getCurrentThreadAllocatedBytes() - bytes, total);
        }
    }
}`,
        },
        {
          type: "paragraph",
          text: "`-XX:+PrintInlining` normally needs `-XX:+UnlockDiagnosticVMOptions` and prints the decisions for every compile in the JVM. A `CompileCommand` limits it to one method, without the unlock:",
        },
        {
          type: "code",
          language: "bash",
          code: "java -XX:CompileCommand=quiet -XX:CompileCommand=PrintInlining,Inlining::fare Inlining",
        },
        {
          type: "output",
          text: `                              @ 1   Inlining::bigTariff (270 bytes)   callee is too large
                              @ 8   Inlining$Trip::zone (5 bytes)   inline
                              @ 11   Inlining::surgePercent (16 bytes)   inline
                                @ 3   java.lang.String::equals (56 bytes)   callee is too large
                              @ 1   Inlining::bigTariff (270 bytes)   inline (hot)
                                @ 5   Inlining$Trip::distanceM (5 bytes)   accessor
                                @ 17   Inlining$Trip::distanceM (5 bytes)   accessor
...
                                @ 202   java.lang.String::startsWith (7 bytes)   inline (hot)
                                  @ 3   java.lang.String::startsWith (123 bytes)   inline (hot)
...
                              @ 8   Inlining$Trip::zone (5 bytes)   accessor
                              @ 11   Inlining::surgePercent (16 bytes)   inline (hot)
                                @ 3   java.lang.String::equals (56 bytes)   inline (hot)
                                  @ 44   java.lang.StringLatin1::equals (36 bytes)   (intrinsic)
... (the same two blocks a second time: fare was recompiled once)
round 1:  58 ms,  20,348,984 bytes allocated, total 60748639449
...`,
        },
        {
          type: "list",
          items: [
            "**The first block is C1 (tier 3 or 2).** It inlines small methods only (`MaxInlineSize`, 35 bytes): `bigTariff` at 270 bytes is \"callee is too large\", and so is `String.equals` at 56 bytes.",
            "**The second block is C2 (tier 4)**, with the profile in hand. `bigTariff` is **hot**, and hot callees can be up to `FreqInlineSize` (325 bytes), so it's inlined, and so is everything inside it: record accessors (`accessor`), `startsWith`, `String.equals`. `StringLatin1.equals` isn't compiled from bytecode at all: it's an **intrinsic**, replaced by a hand-written assembly routine.",
            "The `@ 202` numbers are bytecode indexes of the call sites inside each caller, which `javap -c` shows; that's how to match a decision to a line of source.",
          ],
        },
        {
          type: "paragraph",
          text: "Then the experiment that shows why inlining matters so much. Each loop iteration creates a `Trip` and passes it to `fare`. If `fare` and everything it calls is inlined, C2 can see the whole life of the `Trip` and remove it; if any callee that receives it isn't inlined, the `Trip` escapes into that call and must exist on the heap:",
        },
        {
          type: "code",
          language: "bash",
          code: `java Inlining                           # default
java -XX:FreqInlineSize=200 Inlining    # bigTariff (270 bytes) is now too big to inline
java -XX:-DoEscapeAnalysis Inlining`,
        },
        {
          type: "output",
          text: `round 1:  57 ms,  20,093,208 bytes allocated, total 60748639449
round 2:  35 ms,  22,282,208 bytes allocated, total 60748639449
round 3:  20 ms,          32 bytes allocated, total 60748639449
round 4:  21 ms,          32 bytes allocated, total 60748639449
round 5:  21 ms,          32 bytes allocated, total 60748639449

round 1:  65 ms,  64,005,848 bytes allocated, total 60748639449
round 2:  60 ms,  64,000,032 bytes allocated, total 60748639449
round 3:  39 ms,  64,000,032 bytes allocated, total 60748639449
round 4:  37 ms,  64,000,032 bytes allocated, total 60748639449
round 5:  46 ms,  64,000,032 bytes allocated, total 60748639449

round 1:  68 ms,  64,005,848 bytes allocated, total 60748639449
round 2:  70 ms,  64,000,032 bytes allocated, total 60748639449
round 3:  43 ms,  64,000,032 bytes allocated, total 60748639449
round 4:  31 ms,  64,000,032 bytes allocated, total 60748639449
round 5:  39 ms,  64,000,032 bytes allocated, total 60748639449`,
        },
        {
          type: "list",
          items: [
            "**Default: 64 MB of `Trip`s became 32 bytes** once C2's code was running (round 3). 2 million `Trip`s at 32 bytes each is exactly 64,000,000 bytes, so every one of them was removed. The 32 bytes are the measurement itself.",
            "**One flag that stops one inlining decision, and all 64 MB come back.** With `FreqInlineSize=200`, `PrintInlining` reports `bigTariff (270 bytes) hot method too big`; the `Trip` is passed to a real call, so it escapes, and the loop is about twice as slow (37 to 46 ms against 21 ms).",
            "**Turning escape analysis off has the same effect**, which confirms that the allocations were removed by escape analysis, and that inlining was its precondition.",
            "The practical lesson isn't to tune `FreqInlineSize`. It's that small methods are free (the JIT inlines them), and huge methods are expensive in ways the source doesn't show: they block inlining into themselves, and through that, every optimisation that depends on it.",
          ],
        },
      ],
    },
    {
      title: "Escape Analysis and the Boxes That Survived",
      blocks: [
        {
          type: "paragraph",
          text: "The Memory Allocation lesson showed escape analysis removing every `Point` from a loop (240 MB to 0). The Wrapper Traps lesson found something stranger: a `Long sum += i` loop allocated 1.2 GB for 100 million iterations, half of the 2.4 GB that one `Long` per iteration would cost. Escape analysis removed half of the boxes and kept the other half. I wanted to know why:",
        },
        {
          type: "code",
          language: "java",
          title: "BoxedSum.java",
          code: `import java.lang.management.ManagementFactory;

public class BoxedSum {
    static long boxedSum(int n) {
        Long sum = 0L;                                     // the Wrapper Traps loop
        for (int i = 0; i < n; i++) sum += i;
        return sum;
    }

    public static void main(String[] args) {
        var mx = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        for (int round = 1; round <= 5; round++) {
            long bytes = mx.getCurrentThreadAllocatedBytes(), t = System.nanoTime();
            long result = boxedSum(10_000_000);
            long allocated = mx.getCurrentThreadAllocatedBytes() - bytes;
            System.out.printf("round %d: %3d ms, %,12d bytes = %4.1f bytes per iteration (result %d)%n", round,
                    (System.nanoTime() - t) / 1_000_000, allocated, allocated / 10_000_000.0, result);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java BoxedSum | tail -1
java -XX:-DoEscapeAnalysis BoxedSum | tail -1
java -XX:-EliminateAutoBox BoxedSum | tail -1
java -XX:LoopUnrollLimit=0 BoxedSum | tail -1      # no loop unrolling
java -XX:LoopUnrollLimit=250 BoxedSum | tail -1    # more unrolling
java -XX:LoopUnrollLimit=1000 BoxedSum | tail -1`,
        },
        {
          type: "output",
          text: `round 5:  45 ms,  119,999,808 bytes = 12.0 bytes per iteration (result 49999995000000)
round 5:  25 ms,  239,999,616 bytes = 24.0 bytes per iteration (result 49999995000000)
round 5:  30 ms,  239,999,616 bytes = 24.0 bytes per iteration (result 49999995000000)
round 5:  27 ms,  239,999,616 bytes = 24.0 bytes per iteration (result 49999995000000)
round 5:   5 ms,   29,999,952 bytes =  3.0 bytes per iteration (result 49999995000000)
round 5:   4 ms,   14,999,976 bytes =  1.5 bytes per iteration (result 49999995000000)`,
        },
        {
          type: "list",
          items: [
            "**Default: 12 bytes per iteration**, exactly half a 24-byte `Long`, the same ratio as in Wrapper Traps.",
            "**With no unrolling, 24 bytes:** every box allocated. With escape analysis or box elimination off, also 24.",
            "**With more unrolling, fewer boxes:** 3 bytes per iteration (one box per 8 iterations) and 1.5 bytes (one per 16).",
            "**So the rule is one surviving box per unrolled loop body.** C2 unrolls the loop (by 2 with the default `LoopUnrollLimit`). Inside one copy of the body, the intermediate `Long` produced by the first `sum += i` is consumed by the second and goes nowhere else, so it's scalar-replaced. But the value at the end of each unrolled body flows around the loop back-edge into the next iteration, through a merge point (a phi node), and C2's escape analysis in JDK 21 can't scalar-replace an object that flows through a phi. That box is allocated for real.",
            "The timing column is noisy (5 runs, last shown) and shouldn't be read closely; the allocation column is exact and was identical in every run. The fix in Wrapper Traps stands: use `long`. But now the \"half\" has an explanation, and it's a good example of why allocation-elimination can't be relied on: a change in loop shape or unrolling changes how many boxes survive.",
          ],
        },
        {
          type: "table",
          headers: ["Where the object goes", "Escape state", "Can C2 remove it?"],
          rows: [
            ["Only used inside the method (after inlining)", "NoEscape", "Yes: scalar replacement, no allocation"],
            ["Passed to a callee that wasn't inlined", "ArgEscape", "No allocation removal; locks on it can be removed"],
            ["Stored in a field, a static, an array, returned, or thrown", "GlobalEscape", "No"],
            ["Merges with another object at a phi (loop back-edge, if/else)", "Treated as escaping in JDK 21", "No, which is why one box per unrolled body survived"],
          ],
        },
      ],
    },
    {
      title: "Deoptimization: When Speculation Fails",
      blocks: [
        {
          type: "paragraph",
          text: "A virtual or interface call is where C2's speculation pays most. If the profile says only one class has ever arrived at a call site (**monomorphic**), C2 inlines that class's method behind a cheap class check. Two classes (**bimorphic**): two checks, both inlined. Three or more (**megamorphic**): a real virtual call through the interface table, nothing inlined. I watched one call site go through all three:",
        },
        {
          type: "code",
          language: "java",
          title: "Deopt.java",
          code: `public class Deopt {
    interface FareRule { long apply(long paise); }
    static final class Flat implements FareRule { public long apply(long p) { return p; } }
    static final class Surge implements FareRule { public long apply(long p) { return p + p / 5; } }
    static final class Night implements FareRule { public long apply(long p) { return p + p / 4; } }

    static long price(FareRule rule, long paise) {
        return rule.apply(paise);                       // the call site the JIT profiles
    }

    static long phase(String label, FareRule[] rules) {
        long t = System.nanoTime(), sum = 0;
        for (int i = 0; i < 20_000_000; i++) sum += price(rules[i % rules.length], 10_000 + (i & 1023));
        System.out.printf("%-26s %4d ms%n", label, (System.nanoTime() - t) / 1_000_000);
        return sum;
    }

    public static void main(String[] args) {
        FareRule[] one = {new Flat()};
        FareRule[] two = {new Flat(), new Surge()};
        FareRule[] three = {new Flat(), new Surge(), new Night()};
        long s = 0;
        s += phase("monomorphic (Flat)", one);
        s += phase("monomorphic again", one);
        s += phase("bimorphic (Flat, Surge)", two);
        s += phase("bimorphic again", two);
        s += phase("megamorphic (3 classes)", three);
        s += phase("megamorphic again", three);
        System.out.println(s);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+PrintCompilation Deopt | grep "Deopt::price"
java -Xlog:deoptimization=debug:file=deopt.log Deopt
grep "Deopt.price" deopt.log`,
        },
        {
          type: "output",
          text: `30   11       3       Deopt::price (8 bytes)
31   14       4       Deopt::price (8 bytes)
31   11       3       Deopt::price (8 bytes)   made not entrant
193   14       4       Deopt::price (8 bytes)   made not entrant
193  134       4       Deopt::price (8 bytes)
341  134       4       Deopt::price (8 bytes)   made not entrant
341  152       3       Deopt::price (8 bytes)
341  154       4       Deopt::price (8 bytes)
342  152       3       Deopt::price (8 bytes)   made not entrant

monomorphic (Flat)           62 ms
monomorphic again            66 ms
bimorphic (Flat, Surge)      77 ms
bimorphic again              70 ms
megamorphic (3 classes)     162 ms
megamorphic again           146 ms
1366478030756
[0.175s][debug][deoptimization] cid= 129     level=4 Deopt.price(LDeopt$FareRule;J)J trap_bci=2 class_check maybe_recompile pc=...
[0.175s][debug][deoptimization] cid=  14     level=4 Deopt.price(LDeopt$FareRule;J)J trap_bci=2 class_check maybe_recompile pc=...
[0.176s][debug][deoptimization] cid= 128 osr level=4 Deopt.price(LDeopt$FareRule;J)J trap_bci=2 osr_bci=10 class_check maybe_recompile pc=...
...
[0.325s][debug][deoptimization] cid= 132     level=4 Deopt.price(LDeopt$FareRule;J)J trap_bci=2 bimorphic_or_optimized_type_check maybe_recompile pc=...
[0.328s][debug][deoptimization] cid= 136 osr level=4 Deopt.price(LDeopt$FareRule;J)J trap_bci=2 osr_bci=10 bimorphic_or_optimized_type_check maybe_recompile pc=...`,
        },
        {
          type: "list",
          items: [
            "**Monomorphic:** compile 14 (C2) inlined `Flat.apply` behind a class check. 62 ms for 20 million calls.",
            "**The first `Surge` arrives:** the class check fails, and instead of a slow path there's an **uncommon trap** (`class_check`, at bytecode 2, the `invokeinterface`). The frame is deoptimized, compile 14 is **made not entrant** at 193 ms, and C2 recompiles `price` (compile 134) with a profile that now has two receivers. Note that the trap is reported in `price` even when it fires inside compiled `phase` code (cid 129 and the OSR cid 128) that had inlined `price`; every compiled method that made the same assumption is invalidated.",
            "**Bimorphic** cost almost nothing extra: 70 to 77 ms. Two inlined targets behind two checks are still cheap.",
            "**The third class** fails the bimorphic check (`bimorphic_or_optimized_type_check`), compile 134 is thrown away at 341 ms, `price` goes back through tier 3 (compile 152) to collect a fresh profile, and C2's new version (154) uses a real interface dispatch. **Megamorphic: 146 to 162 ms, more than twice as slow**, because there's no inlining anymore, and so no optimisation across the call either.",
            "Deoptimization itself is cheap (microseconds per frame). The cost is the recompilation and the slower code on the new path. In a service, the classic case is a code path that only runs at a certain time (a night tariff after 23:00, a new rule turned on by a feature flag): at that moment a hot call site turns bimorphic or megamorphic and the service briefly runs in the interpreter and C1 again.",
          ],
        },
        {
          type: "table",
          headers: ["Trap reason", "What the compiled code had assumed"],
          rows: [
            ["`unstable_if`", "A branch never taken during profiling stays untaken (the loop exit in `FareJit`)"],
            ["`class_check`", "Only one receiver class at this call site"],
            ["`bimorphic_or_optimized_type_check`", "Only these two receiver classes"],
            ["`null_check`", "A value that was never null stays non-null"],
            ["`range_check`", "An index that was always in bounds stays in bounds"],
            ["Class loading (dependency)", "A class had no subclasses (class hierarchy analysis); loading one invalidates the code"],
          ],
        },
      ],
    },
    {
      title: "Loops, OSR, Vectorisation and the Code Cache",
      blocks: [
        {
          type: "paragraph",
          text: "C2 spends much of its effort on loops: it removes range checks it can prove unnecessary, hoists invariant code, unrolls the body (the reason for the surviving boxes above), and, where iterations are independent, **vectorises** them with SIMD instructions (SuperWord), processing several array elements per instruction:",
        },
        {
          type: "code",
          language: "java",
          title: "Vectorise.java",
          code: `public class Vectorise {
    static void addSurge(int[] fares, int[] surge, int[] out) {
        for (int i = 0; i < fares.length; i++) out[i] = fares[i] + surge[i];   // independent iterations
    }

    public static void main(String[] args) {
        int n = 4_096;                                                  // fits in the L1/L2 cache
        int[] fares = new int[n], surge = new int[n], out = new int[n];
        for (int i = 0; i < n; i++) { fares[i] = 10_000 + i % 5_000; surge[i] = i % 7 * 100; }
        long best = Long.MAX_VALUE;
        for (int round = 0; round < 100_000; round++) {
            long t = System.nanoTime();
            addSurge(fares, surge, out);
            best = Math.min(best, System.nanoTime() - t);
        }
        System.out.printf("best of 100000: %d ns for %,d elements (out[123] = %d)%n", best, n, out[123]);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Vectorise
java -XX:-UseSuperWord Vectorise
java -XX:LoopUnrollLimit=0 Vectorise`,
        },
        {
          type: "output",
          text: `best of 100000: 557 ns for 4,096 elements (out[123] = 10523)
best of 100000: 2305 ns for 4,096 elements (out[123] = 10523)
best of 100000: 2355 ns for 4,096 elements (out[123] = 10523)`,
        },
        {
          type: "list",
          items: [
            "**Vectorised: 557 ns for 4,096 additions**, about 0.14 ns each, several elements per instruction. With SuperWord off, 2,305 ns: **4.1 times slower**, for identical results. Turning off unrolling also disables vectorisation, because SuperWord works by packing unrolled iterations together.",
            "My first version used arrays of a million elements, and the difference almost disappeared (565 against 714 µs): 12 MB of arrays don't fit in cache, so the loop was waiting on memory, and wider arithmetic doesn't help a memory-bound loop. With 4,096 elements the data stays in cache and the compute speed shows.",
            "Vectorisation needs simple counted loops over arrays with no dependencies between iterations and no calls. A loop over a `List<Integer>` can't be vectorised at all (boxing, pointer chasing), one more reason the Arrays lesson recommends primitive arrays for numeric hot paths. The incubating Vector API (`jdk.incubator.vector`) lets you write SIMD explicitly when auto-vectorisation won't.",
          ],
        },
        {
          type: "heading",
          text: "On-stack replacement",
        },
        {
          type: "paragraph",
          text: "Every `%` line so far was OSR: compiled code that is entered at a loop's bytecode index from a running interpreter frame, because the method itself (often `main`, or a long batch job's loop) never returns to be called again. OSR versions are compiled separately from normal versions of the same method (`FareJit::main` had both, compiles 9 and 10), and they're often less optimised, because the compiler must accept the interpreter's state at an arbitrary point in the loop. A practical consequence for benchmarks: code that runs once in one huge loop in `main` measures OSR code, not the code a service would run.",
        },
        {
          type: "heading",
          text: "The code cache",
        },
        {
          type: "paragraph",
          text: "Compiled code lives in the code cache (240 MB reserved by default, in three segments). A service that fills it gets `CodeCache is full. Compiler has been disabled.` and continues interpreted. I couldn't fill it with these programs (the quote service used 4.4 MB), so I squeezed it to the minimum instead:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+PrintCodeCache QuoteService 20000 | grep -v "^requests"
java -XX:ReservedCodeCacheSize=2496k -XX:+PrintCodeCache QuoteService 20000 | grep -v "^requests"`,
        },
        {
          type: "output",
          text: `ready after 526 ms (warm-up requests: 20000)
CodeHeap 'non-profiled nmethods': size=120028Kb used=771Kb max_used=771Kb free=119256Kb
 bounds [0x00007aa25c2c9000, 0x00007aa25c539000, 0x00007aa263800000]
CodeHeap 'profiled nmethods': size=120028Kb used=2191Kb max_used=2191Kb free=117836Kb
 bounds [0x00007aa254800000, 0x00007aa254a70000, 0x00007aa25bd37000]
CodeHeap 'non-nmethods': size=5704Kb used=1423Kb max_used=1492Kb free=4280Kb
 bounds [0x00007aa25bd37000, 0x00007aa25bfa7000, 0x00007aa25c2c9000]
CodeCache: size=245760Kb, used=4385Kb, max_used=4454Kb, free=241372Kb
 total_blobs=1899, nmethods=1392, adapters=413, full_count=0
Compilation: enabled, stopped_count=0, restarted_count=0

ready after 933 ms (warm-up requests: 20000)
CodeCache: size=2496Kb used=2115Kb max_used=2225Kb free=380Kb
 bounds [0x00007c2a67d90000, 0x00007c2a68000000, 0x00007c2a68000000]
 total_blobs=869, nmethods=362, adapters=413, full_count=0
Compilation: enabled, stopped_count=0, restarted_count=0`,
        },
        {
          type: "paragraph",
          text: "With 2.5 MB (2,496 KB is the smallest size the JVM accepts here), the cache is no longer segmented (one heap instead of three), and it held 362 compiled methods instead of 1,392: the JVM kept flushing cold code to make room, and the same warm-up took 933 ms instead of 526 (two other runs: 908 and 589). It never reached `full_count` 1, so compilation was never disabled. In a large application (thousands of classes, heavy use of lambdas and proxies), watch `jcmd <pid> Compiler.codecache`; if `max_used` approaches `size`, raise `ReservedCodeCacheSize`.",
        },
      ],
    },
    {
      title: "Why Microbenchmarks Lie, and What JMH Does About It",
      blocks: [
        {
          type: "paragraph",
          text: "Everything above has a consequence for measuring code: the JIT can remove work you meant to measure. The simplest version:",
        },
        {
          type: "code",
          language: "java",
          title: "NaiveBench.java",
          code: `public class NaiveBench {
    static long fare(long distanceM, int surgePercent) {
        long p = 4_000 + distanceM * 12 / 10;
        for (int k = 0; k < 10; k++) p += (p ^ k) % 7;
        return p + p * surgePercent / 100;
    }

    public static void main(String[] args) {
        for (int round = 1; round <= 5; round++) {
            long t = System.nanoTime();
            for (int i = 0; i < 10_000_000; i++) fare(1_000 + i % 9_000, 20);      // result ignored
            long ignored = System.nanoTime() - t;

            t = System.nanoTime();
            long sum = 0;
            for (int i = 0; i < 10_000_000; i++) sum += fare(1_000 + i % 9_000, 20);  // result used
            long used = System.nanoTime() - t;
            System.out.printf("round %d: result ignored %6.2f ns/call, result used %6.2f ns/call (sum %d)%n",
                    round, ignored / 1e7, used / 1e7, sum);
        }
    }
}`,
        },
        {
          type: "output",
          text: `round 1: result ignored   0.77 ns/call, result used  30.49 ns/call (sum 127524127690)
round 2: result ignored   2.35 ns/call, result used  31.74 ns/call (sum 127524127690)
round 3: result ignored   0.00 ns/call, result used  30.67 ns/call (sum 127524127690)
round 4: result ignored   0.00 ns/call, result used  30.67 ns/call (sum 127524127690)
round 5: result ignored   0.00 ns/call, result used  30.40 ns/call (sum 127524127690)`,
        },
        {
          type: "list",
          items: [
            "**0.00 ns per call** is not a fast method. `fare` has no side effects, its result was ignored, so after inlining C2 deleted the call and then the empty loop: **dead-code elimination**. The same method, with its result used, costs 30 ns.",
            "Round 1 already shows 0.77 ns, because OSR compiled the loop within its first few milliseconds; which version of the code a hand-written timing loop measures depends on when the JIT happened to replace it.",
            "Other ways naive benchmarks lie: **constant folding** (inputs the JIT can see are constant get precomputed), measuring OSR code, **warm-up** mixed into the measurement, profile pollution (benchmarking two implementations in one JVM: the second sees a bimorphic call site the first didn't, exactly as in `Deopt`), GC pauses landing in one run, and CPU frequency scaling.",
          ],
        },
        {
          type: "paragraph",
          text: "**JMH** (the Java Microbenchmark Harness, from OpenJDK) exists to handle all of these: it forks a fresh JVM per benchmark (no profile pollution), runs configurable warm-up iterations before measuring, sinks results into a `Blackhole` the JIT can't see through (no dead-code elimination), reads inputs from `@State` fields rather than constants (no constant folding), and reports errors and confidence intervals. I checked for it on this machine (`~/.m2` and a filesystem search for `jmh-core`) and it isn't available offline, so every timing in this track is a hand-written `System.nanoTime` measurement, labelled as such and repeated to check the shape. For conclusions about a few nanoseconds, use JMH; for \"is this 10 times slower\" and \"does this allocate\", careful hand timing plus allocation counters is enough, as long as the result is used.",
        },
      ],
    },
    {
      title: "Ergonomics and Container Memory",
      blocks: [
        {
          type: "paragraph",
          text: "Without flags, the JVM chooses its own settings from the machine it finds: **ergonomics**. `-XX:+PrintFlagsFinal` prints every flag's final value, and the `{ergonomic}` tag marks the ones the JVM chose. On this laptop (8 CPUs, 7.6 GB):",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+PrintFlagsFinal -version 2>/dev/null | grep -E " MaxHeapSize | UseG1GC | CICompilerCount | MaxRAMPercentage | UseContainerSupport "`,
        },
        {
          type: "output",
          text: `     intx CICompilerCount                          = 4                                         {product} {ergonomic}
   size_t MaxHeapSize                              = 2040528896                                {product} {ergonomic}
   double MaxRAMPercentage                         = 25.000000                                 {product} {default}
     bool UseContainerSupport                      = true                                      {product} {default}
     bool UseG1GC                                  = true                                      {product} {ergonomic}`,
        },
        {
          type: "paragraph",
          text: "A maximum heap of 1.9 GB: **25% of RAM**, from `MaxRAMPercentage`. The Memory Allocation lesson showed this with `-XX:MaxRAM` to simulate smaller machines. I wanted to see it inside real containers, so I ran this host's own JDK 21 in a Debian container with memory and CPU limits:",
        },
        {
          type: "code",
          language: "bash",
          title: "box.sh",
          code: `box() {   # box <memory> <cpus> <java args...>: the host's JDK 21 inside a limited container
  mem=$1; cpus=$2; shift 2
  docker run --rm -m $mem --memory-swap $mem --cpus $cpus \\
    -v /usr/lib/jvm/java-21-openjdk-amd64:/jdk:ro -v /etc/java-21-openjdk:/etc/java-21-openjdk:ro \\
    -v $PWD:/app -w /app postgres:16 /jdk/bin/java "$@"
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `. ./box.sh
for spec in "1g 2" "2g 2" "2g 1" "4g 4"; do
  echo "# box $spec"
  box $spec -XX:+PrintFlagsFinal -version 2>/dev/null | grep -E " MaxHeapSize | UseSerialGC | UseG1GC "
done
echo "# box 1g 2 -XX:MaxRAMPercentage=75"
box 1g 2 -XX:MaxRAMPercentage=75 -XX:+PrintFlagsFinal -version 2>/dev/null | grep -E " MaxHeapSize "
box 1g 2 -XshowSettings:system -version 2>&1 | grep -E "Provider|Effective CPU|Memory Limit"`,
        },
        {
          type: "output",
          text: `# box 1g 2
   size_t MaxHeapSize                              = 268435456                                 {product} {ergonomic}
     bool UseG1GC                                  = false                                     {product} {default}
     bool UseSerialGC                              = true                                      {product} {ergonomic}
# box 2g 2
   size_t MaxHeapSize                              = 536870912                                 {product} {ergonomic}
     bool UseG1GC                                  = true                                      {product} {ergonomic}
     bool UseSerialGC                              = false                                     {product} {default}
# box 2g 1
   size_t MaxHeapSize                              = 536870912                                 {product} {ergonomic}
     bool UseG1GC                                  = false                                     {product} {default}
     bool UseSerialGC                              = true                                      {product} {ergonomic}
# box 4g 4
   size_t MaxHeapSize                              = 1073741824                                {product} {ergonomic}
     bool UseG1GC                                  = true                                      {product} {ergonomic}
     bool UseSerialGC                              = false                                     {product} {default}
# box 1g 2 -XX:MaxRAMPercentage=75
   size_t MaxHeapSize                              = 805306368                                 {product} {ergonomic}
    Provider: cgroupv2
    Effective CPU Count: 2
    Memory Limit: 1.00G`,
        },
        {
          type: "list",
          items: [
            "**The JVM reads the cgroup limit, not the host:** 1 GB container, 256 MB heap; 2 GB, 512 MB; 4 GB, 1 GB. Always 25%. Three quarters of the memory you pay for is left for everything that isn't heap, which is usually far more than needed.",
            "**The surprise: a 1 GB container gets the Serial collector**, even with 2 CPUs. The JVM only considers a machine \"server class\" (and picks G1) with at least 2 CPUs **and** about 1,792 MB of memory. A 2 GB container with 1 CPU also gets Serial. Simulating with `-XX:MaxRAM=1g` on the host didn't show this (it kept G1), because that check uses the real physical memory and CPU count, not `MaxRAM`. Only the real container did.",
            "**`-XX:MaxRAMPercentage=75`** gave a 768 MB heap in the 1 GB container, which is a common starting point. `-Xmx` always wins over the percentage if both are set.",
          ],
        },
        {
          type: "paragraph",
          text: "The opposite mistake is just as common: someone sees the 25% waste and sets the percentage to 90. The previous lesson measured how much native memory a JVM uses besides the heap. This is what happens when that's ignored, in a 512 MB container with 160 MB of direct buffers (Netty-style socket buffers) and a heap that is really used:",
        },
        {
          type: "code",
          language: "java",
          title: "TripBuffers.java",
          code: `import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

public class TripBuffers {
    public static void main(String[] args) {
        long maxHeapMb = Runtime.getRuntime().maxMemory() / (1024 * 1024);
        System.out.println("max heap " + maxHeapMb + " MB");
        List<ByteBuffer> sockets = new ArrayList<>();
        for (int i = 0; i < 160; i++) sockets.add(ByteBuffer.allocateDirect(1024 * 1024));   // 160 MB off-heap, like Netty
        System.out.println("direct buffers 160 MB");
        List<byte[]> trips = new ArrayList<>();
        for (int mb = 1; ; mb++) {
            byte[] chunk = new byte[1024 * 1024];
            java.util.Arrays.fill(chunk, (byte) 1);                  // touch the pages, as real data would
            trips.add(chunk);
            if (mb % 100 == 0) System.out.println("heap data " + mb + " MB");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `box 512m 2 -XX:MaxRAMPercentage=90 TripBuffers; echo "exit code $?"
box 512m 2 -XX:MaxRAMPercentage=60 TripBuffers; echo "exit code $?"`,
        },
        {
          type: "output",
          text: `max heap 446 MB
direct buffers 160 MB
heap data 100 MB
heap data 200 MB
exit code 137
max heap 297 MB
direct buffers 160 MB
heap data 100 MB
heap data 200 MB
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at TripBuffers.main(TripBuffers.java:14)
exit code 1`,
        },
        {
          type: "list",
          items: [
            "**At 90%, the kernel killed the JVM: exit code 137 (SIGKILL), no exception, no stack trace, no heap dump.** The heap still had room (446 MB maximum), but heap in use plus 160 MB of direct buffers plus the JVM's own native memory crossed 512 MB. `-XX:+HeapDumpOnOutOfMemoryError` can't help, because the JVM never had a chance to run any code. In Kubernetes this shows up as `OOMKilled` and a restart count.",
            "**At 60%, the JVM failed first, in a diagnosable way:** a Java `OutOfMemoryError`, which `HeapDumpOnOutOfMemoryError` would have captured. Same program, same data; only the split between heap and everything else changed.",
            "The rule I'd use: heap at 50 to 75% of the container limit, lower for services with many threads or large direct buffers, and set `-XX:MaxDirectMemorySize` explicitly (it defaults to the max heap size, so with 90% the JVM would have allowed 446 MB of direct buffers too).",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Virtual threads change the thread-stack part of the budget",
          text: "Platform threads each reserve a native stack (1 MB by default) outside the heap. Virtual threads (Java 21, JEP 444) keep their stacks as heap objects that grow and shrink, so a service moving from 200 platform threads to thousands of virtual threads shifts memory from native stacks into the heap. Stack vs Heap measured this; the tuning consequence is to re-check heap sizing after the switch, and the Multithreading and Concurrency track covers them properly.",
        },
      ],
    },
    {
      title: "Startup: CDS and AppCDS",
      blocks: [
        {
          type: "paragraph",
          text: "Before any JIT warm-up, a JVM has to load, verify and link its classes. Class Data Sharing stores parsed classes in an archive that the JVM maps into memory instead. The JDK ships a default archive for its own core classes (the 13 MB \"shared class space\" in the previous lesson's NMT output); **AppCDS** extends that to the application's classes and the JDK classes it actually uses. Since Java 13, one run with `-XX:ArchiveClassesAtExit` creates the archive. I used the quote service from the production section, which uses regex, `java.time`, streams, `String.format` and an `HttpClient`, about 2,100 classes in total:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:ArchiveClassesAtExit=quote.jsa QuoteService > /dev/null     # one training run
for mode in -Xshare:off -Xshare:auto -XX:SharedArchiveFile=quote.jsa; do
  java $mode -Xlog:class+load:file=cl.txt QuoteService > /dev/null
  echo "$mode: $(wc -l < cl.txt) classes, $(grep -c 'shared objects file' cl.txt) from an archive"
done`,
        },
        {
          type: "output",
          text: `-Xshare:off: 2155 classes, 0 from an archive
-Xshare:auto: 2126 classes, 1044 from an archive
-XX:SharedArchiveFile=quote.jsa: 2074 classes, 1993 from an archive`,
        },
        {
          type: "paragraph",
          text: "Then the time until the service was ready to take traffic (JVM uptime when `main` reached the ready line), 10 runs each, sorted:",
        },
        {
          type: "code",
          language: "bash",
          code: `for mode in -Xshare:off -Xshare:auto -XX:SharedArchiveFile=quote.jsa; do
  printf "%-34s" "$mode"
  for r in $(seq 10); do java $mode QuoteService | head -1 | awk '{print $3}'; done |
    sort -n | awk '{a[NR]=$1} END {printf "best %d ms, median %d ms\\n", a[1], a[int((NR+1)/2)]}'
done`,
        },
        {
          type: "output",
          text: `-Xshare:off                       best 291 ms, median 325 ms
-Xshare:auto                      best 256 ms, median 304 ms
-XX:SharedArchiveFile=quote.jsa   best 182 ms, median 211 ms`,
        },
        {
          type: "list",
          items: [
            "**AppCDS cut the median startup by about a third** (304 to 211 ms), and 96% of the loaded classes came from the archive instead of 49%. Inside the 1 GB container from the previous section the effect was similar: 194 to 219 ms with the default archive, 130 to 139 ms with AppCDS (5 runs each).",
            "**The default archive alone** was worth about 20 ms here. It's on by default, which is why `java -version` says `sharing`; `-Xshare:off` is mainly useful for this kind of comparison.",
            "**The archive is tied to the exact JDK build and class path.** A JDK upgrade or a changed JAR invalidates it (the JVM silently falls back to normal loading), so it has to be rebuilt in the same build pipeline that produces the image. In a container, I created it inside the container, because the JDK path there differs from the host's.",
            "CDS helps class loading only. It does nothing for JIT warm-up: code still starts in the interpreter. Java 24's AOT cache (JEP 483) goes further by also storing linked classes, and later Leyden work adds method profiles; on 21, warm-up is handled separately (next sections).",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "The life of `Deopt.price` from the first call to its third compiled version:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Interpreted (tier 0).** Each call increments `price`'s invocation counter; the interpreter's `invokeinterface` also records the receiver class in the method's profile. Every 128 calls the counter is compared with the tier 3 threshold.",
            "**Tier 3 request.** Past 200 calls, the interpreter puts `price` in the C1 queue and keeps interpreting. A C1 compiler thread compiles it with full profiling (compile 11); the next call jumps to the compiled code.",
            "**Profiling in C1 code.** Tier 3 code counts calls and records receiver types at the `invokeinterface`: 100% `Flat`. Every 1,024 calls it checks the tier 4 threshold.",
            "**Tier 4.** C2 (compile 14) reads the profile, inlines `Flat.apply` behind a class check, and puts an uncommon trap on the \"some other class\" path. When it's installed, compile 11 is made not entrant.",
            "**Speculation fails.** The first `Surge` reaches the check. The trap fires: the compiled frame is rebuilt as an interpreter frame at bytecode 2 (`class_check`, `maybe_recompile`), compile 14 is made not entrant, and every compiled caller that inlined the same assumption is deoptimized too.",
            "**Recompile.** The interpreter and C1 update the profile (now `Flat` and `Surge`), and C2 produces compile 134 with two inlined targets.",
            "**Megamorphic.** `Night` triggers `bimorphic_or_optimized_type_check`; `price` goes back through tier 3 (compile 152) and C2's compile 154 uses a real interface call. No more traps fire, and the code is stable, but slower: 146 to 162 ms per phase instead of 62.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "The JIT and tuning flags and tools I actually use, with real output from the quote service running a long warm-up (`java -Xmx64m QuoteService 3000000`). `jcmd` takes a PID or a main class name; `jstat` only takes a PID.",
        },
        {
          type: "code",
          language: "bash",
          code: `# GC utilisation every 500 ms, 6 samples: survivor, eden, old, metaspace %, young/full/concurrent counts and times
jstat -gcutil <pid> 500 6
#   S0     S1     E      O      M     CCS    YGC     YGCT     FGC    FGCT     CGC    CGCT       GCT
#      -   0.20  76.92  15.36  95.52  86.36     24     0.027     0     0.000     0     0.000     0.027
#      -   0.20  58.97  15.36  95.52  86.36     42     0.036     0     0.000     0     0.000     0.036
#      -   0.20  87.18  15.36  95.52  86.36     60     0.046     0     0.000     0     0.000     0.046
#      -   0.39  89.74  15.36  95.52  86.36     76     0.055     0     0.000     0     0.000     0.055
#      -   0.20  30.77  15.36  95.52  86.36     95     0.066     0     0.000     0     0.000     0.066
#      -   0.20  12.82  15.36  95.52  86.36    112     0.076     0     0.000     0     0.000     0.076

# JIT activity so far
jstat -compiler <pid>
# Compiled Failed Invalid   Time   FailedType FailedMethod
#     1114      0       0     1.58          0

# Code cache usage (watch max_used against size)
jcmd <pid> Compiler.codecache
# CodeHeap 'non-profiled nmethods': size=120028Kb used=933Kb max_used=933Kb free=119094Kb
# CodeHeap 'profiled nmethods': size=120028Kb used=2082Kb max_used=2082Kb free=117945Kb
# CodeHeap 'non-nmethods': size=5704Kb used=1412Kb max_used=1475Kb free=4291Kb
# CodeCache: size=245760Kb, used=4427Kb, max_used=4490Kb, free=241330Kb

# A JFR recording on a running JVM, no restart needed
jcmd <pid> JFR.start name=live settings=profile
# Started recording 1. No limit specified, using maxsize=250MB as default.
jcmd <pid> JFR.dump name=live filename=/tmp/live.jfr
# Dumped recording "live", 454.9 kB written to: ...
jcmd <pid> JFR.stop name=live
# Stopped recording "live".

# Command-line flags
#   -XX:+PrintFlagsFinal                      every flag's final value, {ergonomic} = chosen by the JVM
#   -XX:+PrintCompilation                     one line per compile and per made-not-entrant
#   -XX:CompileCommand=PrintInlining,Cls::m   inlining decisions for one method
#   -Xlog:deoptimization=debug                every uncommon trap, with its reason
#   -Xint / -XX:TieredStopAtLevel=1           interpreter only / stop at C1
#   -XX:MaxRAMPercentage=75                   heap as a share of the container limit
#   -XX:StartFlightRecording=filename=app.jfr,settings=profile
#   -XX:ArchiveClassesAtExit=app.jsa  then  -XX:SharedArchiveFile=app.jsa`,
        },
        {
          type: "paragraph",
          text: "Reading `jstat`: 18 young collections a second (`YGC` from 24 to 112 in 3 s) costing about 3 ms per second (`YGCT` from 0.027 to 0.076 s), old generation flat at 15%, no full or concurrent collections. That's a healthy allocation-heavy service: frequent cheap young collections, nothing accumulating.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Profiling with JFR from the command line",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx32m -XX:StartFlightRecording=filename=quote.jfr,settings=profile QuoteService 50000
jfr summary quote.jfr | head -14
jfr print --events jdk.GarbageCollection quote.jfr | head -11
jfr view gc-pauses quote.jfr
jfr view allocation-by-class quote.jfr | head -8`,
        },
        {
          type: "output",
          text: `[0.445s][info][jfr,startup] Started recording 1. No limit specified, using maxsize=250MB as default.
...
 Version: 2.1
 Chunks: 1
 Start: 2026-11-13 16:41:29 (UTC)
 Duration: 1 s

 Event Type                              Count  Size (bytes)
=============================================================
 jdk.GCPhaseParallel                       870         22659
 jdk.ModuleExport                          507          4896
 jdk.BooleanFlag                           505         15365
 jdk.ActiveSetting                         360         10391
 jdk.SystemProcess                         350         59995
 jdk.ObjectAllocationSample                300          4458

jdk.GarbageCollection {
  startTime = 22:11:29.523 (2026-11-13)
  duration = 6.59 ms
  gcId = 1
  name = "G1New"
  cause = "G1 Evacuation Pause"
  sumOfPauses = 6.59 ms
  longestPause = 6.59 ms
  eventThread = "VM Thread" (osThreadId = 71147)
}

GC Pauses
---------
Total Pause Time: 17.1 ms
Number of Pauses: 12
Minimum Pause Time: 0.451 ms
Median Pause Time: 0.589 ms
Average Pause Time: 1.42 ms
P90 Pause Time: 7.74 ms
P95 Pause Time: 6.59 ms
P99 Pause Time: 6.59 ms
P99.9% Pause Time: 6.59 ms
Maximum Pause Time: 6.59 ms

                              Allocation by Class

Object Type                                                 Allocation Pressure
----------------------------------------------------------- -------------------
java.util.Formatter$FormatSpecifier                                      43.79%
byte[]                                                                   10.36%
java.util.stream.IntPipeline$Head                                        10.19%
java.util.concurrent.ConcurrentHashMap$Node[]                             9.32%`,
        },
        {
          type: "list",
          items: [
            "**JFR is the first profiler I'd reach for in production:** it's built into the JVM, records GC, JIT, allocation, locks, I/O and CPU samples, and the `profile` settings cost a few percent (the default settings about 1%). The `jfr` tool reads recordings without a GUI; JDK Mission Control opens the same files graphically.",
            "**`jfr view allocation-by-class` found the real allocation hotspot:** 44% of allocation pressure was `Formatter$FormatSpecifier`, from the `String.format` call that builds each JSON response. That's a concrete, cheap tuning target (a `StringBuilder` or a JSON library), found without guessing.",
            "**Read the percentiles with care:** with only 12 pauses, `jfr view` printed a P90 (7.74 ms) above the P95 (6.59 ms), which can't be true of a real distribution. With so few samples, percentiles mean little; the maximum and the total are what to read.",
            "The recording started 0.445 s into the run (`[0.445s] ... Started recording`): JFR itself takes a moment to initialise, so `-XX:StartFlightRecording` slows startup measurably. For startup work, measure without it.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Warm-up with tiered settings compared on one service",
        },
        {
          type: "paragraph",
          text: "The same quote service, cold, under the three settings people most often suggest for warm-up problems, with the latency of each 500-request batch:",
        },
        {
          type: "code",
          language: "bash",
          code: `java QuoteService | head -4
java -XX:TieredStopAtLevel=1 QuoteService | head -4
java QuoteService 20000 | head -4`,
        },
        {
          type: "output",
          text: `ready after 275 ms (warm-up requests: 0)
requests     1-  500  p50    56 us  p99    148 us  max   5952 us
requests   501- 1000  p50    20 us  p99     81 us  max    299 us
requests  1001- 1500  p50    13 us  p99     36 us  max     71 us

ready after 229 ms (warm-up requests: 0)
requests     1-  500  p50    35 us  p99    135 us  max   4899 us
requests   501- 1000  p50     8 us  p99     45 us  max     57 us
requests  1001- 1500  p50     6 us  p99     22 us  max    134 us

ready after 577 ms (warm-up requests: 20000)
requests     1-  500  p50     6 us  p99     16 us  max     59 us
requests   501- 1000  p50     7 us  p99     22 us  max     74 us
requests  1001- 1500  p50     7 us  p99     21 us  max     38 us`,
        },
        {
          type: "paragraph",
          text: "C1 only looked better than I expected, and in two full runs its last batches (requests 9,501 to 10,000) had a 4 µs median against 5 µs for the default. 10,000 requests is still early for C2, so I ran both with a 300,000-request warm-up and looked at the ready time (how long the 300,000 took) and the last batch:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:TieredStopAtLevel=1 QuoteService 300000 | sed -n '1p;$p'
java QuoteService 300000 | sed -n '1p;$p'`,
        },
        {
          type: "output",
          text: `ready after 2228 ms (warm-up requests: 300000)
requests  9501-10000  p50     4 us  p99      4 us  max      7 us
ready after 1332 ms (warm-up requests: 300000)
requests  9501-10000  p50     2 us  p99      6 us  max     12 us`,
        },
        {
          type: "list",
          items: [
            "**Cold, default:** the first batch's median is 56 µs and its worst request 6 ms (class loading, interpretation and the first compiles all land on it). By request 1,500 the median is 13 µs.",
            "**C1 only** warms up faster (6 µs by the third batch) because C1 compiles quickly and there's no profiling tier. Over a short run it even looked better. Over 300,000 requests it wasn't: C2 code got through them 1.7 times faster (1.3 s against 2.2 s) and settled at a 1 to 2 µs median against C1's 4 µs (a second pair of runs gave the same picture). `TieredStopAtLevel=1` trades long-term throughput for a better first few seconds: right for CLIs and short jobs, rarely for a service.",
            "**Warm-up before taking traffic** moved the whole cost before the ready line: startup grew by about 300 ms, and the first real request batch had a 6 µs median and a 59 µs worst case. This is the fix the production section uses.",
          ],
        },
        {
          type: "heading",
          text: "Example 3: Reading ergonomics for any limit without a container",
        },
        {
          type: "code",
          language: "bash",
          code: `for ram in 1g 2g 4g; do
  for pct in 25 75; do
    printf "MaxRAM=%s MaxRAMPercentage=%s -> " $ram $pct
    java -XX:MaxRAM=$ram -XX:MaxRAMPercentage=$pct -XX:+PrintFlagsFinal -version 2>/dev/null | awk '/ MaxHeapSize / {printf "%d MB\\n", $4/1048576}'
  done
done
java -XX:MaxRAM=200m -XX:+PrintFlagsFinal -version 2>/dev/null | awk '/ MaxHeapSize / {printf "MaxRAM=200m (default %%) -> %d MB\\n", $4/1048576}'`,
        },
        {
          type: "output",
          text: `MaxRAM=1g MaxRAMPercentage=25 -> 256 MB
MaxRAM=1g MaxRAMPercentage=75 -> 768 MB
MaxRAM=2g MaxRAMPercentage=25 -> 512 MB
MaxRAM=2g MaxRAMPercentage=75 -> 1536 MB
MaxRAM=4g MaxRAMPercentage=25 -> 1024 MB
MaxRAM=4g MaxRAMPercentage=75 -> 3072 MB
MaxRAM=200m (default %) -> 100 MB`,
        },
        {
          type: "list",
          items: [
            "`-XX:MaxRAM` makes the JVM size itself as if it had that much memory, which is a quick way to check heap settings for a deployment target. It matched the real containers for the heap size; it did **not** reproduce the collector choice (Serial in a 1 GB container), as the previous section found.",
            "**Small memory uses a different rule:** with 200 MB the heap was 100 MB, 50%, because below roughly 250 MB the JVM uses `MinRAMPercentage` (50% by default) instead of `MaxRAMPercentage`. The names are confusing: `MinRAMPercentage` is the percentage for small-memory machines, not a minimum heap.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which Tool",
      blocks: [
        {
          type: "table",
          headers: ["Question", "Tool", "Cost"],
          rows: [
            ["Which flags is this JVM really running with?", "`jcmd <pid> VM.flags`, `-XX:+PrintFlagsFinal`", "None"],
            ["Is GC a problem right now?", "`jstat -gcutil <pid> 1000`", "None"],
            ["What did GC do over the last days?", "`-Xlog:gc*:file=...` (always on)", "Negligible"],
            ["Where does CPU time and allocation go in production?", "JFR (`JFR.start` / `-XX:StartFlightRecording`), `jfr view`", "About 1 to 3%"],
            ["Which methods were compiled, deoptimized, and why?", "`-XX:+PrintCompilation`, `-Xlog:deoptimization=debug`, JFR `jdk.Deoptimization`", "Low; diagnostic runs"],
            ["Why wasn't this method inlined?", "`-XX:CompileCommand=PrintInlining,Cls::method`", "Low; diagnostic runs"],
            ["Is this code faster than that code?", "JMH", "A separate benchmark project"],
            ["Is startup dominated by class loading?", "`-Xlog:class+load`, `-Xshare:off` vs AppCDS", "Diagnostic runs"],
            ["Where is native memory going?", "`-XX:NativeMemoryTracking=summary` + `jcmd VM.native_memory`", "A few percent; enable when investigating"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Tuning before measuring",
        },
        {
          type: "paragraph",
          text: "Copying a list of 20 `-XX` flags from a blog post is the most common JVM tuning mistake. Most defaults on JDK 21 are good, several old flags are obsolete or harmful, and each extra flag is one more thing nobody remembers the reason for. Start from GC logs, `jstat` and a JFR recording, change one thing, and measure again.",
        },
        {
          type: "heading",
          text: "Leaving the heap at the default in a container",
        },
        {
          type: "paragraph",
          text: "In a 1 GB container the JVM chose a 256 MB heap and the Serial collector. Set `-XX:MaxRAMPercentage` (or `-Xmx`) deliberately, and choose the collector explicitly in small containers if Serial's pauses aren't acceptable.",
        },
        {
          type: "heading",
          text: "Setting the heap so high that the container gets killed",
        },
        {
          type: "paragraph",
          text: "At `MaxRAMPercentage=90` the container died with exit code 137 and no diagnostics; at 60 the same program produced a normal `OutOfMemoryError`. Leave room for native memory, and cap direct memory.",
        },
        {
          type: "heading",
          text: "Benchmarking with a timing loop around code whose result is unused",
        },
        {
          type: "paragraph",
          text: "My naive benchmark measured 0.00 ns per call: the JIT deleted the work. Use the result (or JMH's `Blackhole`), warm up, and report the shape, not the nanoseconds.",
        },
        {
          type: "heading",
          text: "Sending production traffic to a cold JVM",
        },
        {
          type: "paragraph",
          text: "The first 500 requests of the cold quote service had a median about 10 times its steady state and a 6 ms worst case. With readiness probes that pass as soon as the port is open, every deploy and every autoscaling event pays this on real users. Warm up before reporting ready.",
        },
        {
          type: "heading",
          text: "Writing huge methods",
        },
        {
          type: "paragraph",
          text: "A 270-byte method stopped C2 from inlining it under a lower limit, and that alone brought back 64 MB of allocation and doubled the loop time. Methods over 8,000 bytes of bytecode are never compiled at all (`DontCompileHugeMethods`). Generated code (big `switch` statements, parsers) hits this most.",
        },
        {
          type: "heading",
          text: "Using -Xint or disabling tiered compilation \"for stability\"",
        },
        {
          type: "paragraph",
          text: "`-Xint` was 10 times slower than C2 in steady state; `-XX:-TieredCompilation` had the slowest start of all four modes. Neither is a stability setting.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Measure first: GC logs on permanently, `jstat`/`jcmd` for live checks, JFR for where time and allocation go. Change one flag at a time and keep the reason next to it.",
            "Size the heap explicitly in containers: `-XX:MaxRAMPercentage` around 50 to 75%, with `-XX:MaxDirectMemorySize` and `-XX:MaxMetaspaceSize` set, and verify with `-XX:+PrintFlagsFinal` inside the real container.",
            "Check which collector ergonomics picked in small containers; a 1 GB, 2-CPU container gets Serial unless you say otherwise.",
            "Warm the JVM before taking traffic: replay representative requests (or a recorded sample) until latency stabilises, then mark the instance ready.",
            "Build an AppCDS archive in the same pipeline as the image, with `-XX:ArchiveClassesAtExit` on a training run, for faster startup.",
            "Keep hot methods small and call sites monomorphic where it's natural; avoid making a hot call site megamorphic just for a rare case.",
            "Prefer primitive arrays and simple counted loops in numeric hot paths, so C2 can unroll and vectorise them.",
            "Use JMH for microbenchmarks; for hand timing, use the result, warm up, repeat, and report allocation as well as time.",
            "After moving to virtual threads, re-check heap sizing: stacks move from native memory into the heap.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Every number in this lesson, in one place. All single-machine `System.nanoTime` measurements on JDK 21 (8 CPUs, 7.6 GB), repeated at least three times for shape; not JMH.",
        },
        {
          type: "table",
          headers: ["Measurement", "Result", "Takeaway"],
          rows: [
            ["Quote batch: interpreter vs C1 vs C2", "~1,500 / ~600 / ~120 to 150 µs per 2,000 calls", "C2 is ~10x the interpreter, ~4x C1"],
            ["Tier 3 compile", "At the 256th call (threshold 200, checked every 128)", "Warm-up is counted in calls, not seconds"],
            ["Inlining blocked by `FreqInlineSize=200`", "0 B to 64 MB allocated, ~2x slower", "Inlining enables escape analysis"],
            ["`Long sum += i`", "12 B/iteration; 24 with no unrolling; 1.5 with 16x unrolling", "One box survives per unrolled body"],
            ["Monomorphic vs megamorphic call site", "62 ms vs 146 to 162 ms per 20M calls", "Lost inlining doubles the cost"],
            ["SuperWord vectorisation", "557 ns vs 2,305 ns per 4,096 elements", "4x, when data fits in cache"],
            ["Unused result in a timing loop", "0.00 ns vs 30 ns per call", "Dead-code elimination"],
            ["Startup: no CDS / default CDS / AppCDS", "325 / 304 / 211 ms median", "AppCDS saves about a third"],
            ["Cold vs warmed-up first batch", "p50 56 µs vs 6 µs, max 6 ms vs 59 µs", "Warm up before traffic"],
            ["Tiny code cache (2.5 MB)", "362 vs 1,392 compiled methods; warm-up 933 vs 526 ms", "Watch `max_used`"],
            ["300,000 quotes: C1 only vs tiered", "2.2 s vs 1.3 s", "C1 warms faster, C2 wins long runs"],
          ],
        },
      ],
    },
    {
      title: "JVM Tuning in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend runs its fare-quote service on Kubernetes: a Spring Boot service, 1 GiB memory limit, 2 CPUs, no JVM flags in the Dockerfile. Every deploy, and every time the autoscaler added pods during the evening peak in SALT-LAKE and NEW-TOWN, the p99 latency alert fired for about a minute, and the rider app showed \"Fetching fare...\" for longer than usual. Between deploys, latency was fine. The team's first guess was GC; the GC logs, once turned on, showed it was only part of the story.",
        },
        {
          type: "paragraph",
          text: "I rebuilt the service's request path as `QuoteService`: parse a request with a regex, parse a time with `java.time`, compute the fare with a night surcharge and zone surge, build a breakdown with a stream and format a JSON response. It reports when it's ready and then the latency of each batch of 500 requests:",
        },
        {
          type: "code",
          language: "java",
          title: "QuoteService.java",
          code: `import java.lang.management.ManagementFactory;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class QuoteService {
    static final Pattern REQUEST = Pattern.compile("zone=([A-Z-]+)&distanceM=(\\\\d+)&minutes=(\\\\d+)&at=(\\\\d\\\\d:\\\\d\\\\d)");
    static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");
    static final Map<String, Integer> SURGE = new HashMap<>(Map.of("SALT-LAKE", 20, "NEW-TOWN", 10, "HOWRAH", 0));
    static HttpClient payments;                                        // built at startup, like a real client

    static String handle(String request) {
        Matcher m = REQUEST.matcher(request);
        if (!m.matches()) throw new IllegalArgumentException(request);
        String zone = m.group(1);
        long distanceM = Long.parseLong(m.group(2));
        int minutes = Integer.parseInt(m.group(3));
        LocalTime at = LocalTime.parse(m.group(4), HHMM);
        long paise = 4_000 + distanceM * 12 / 10 + minutes * 150L;
        if (at.getHour() >= 23 || at.getHour() < 5) paise += paise / 4;   // night fare
        paise += paise * SURGE.getOrDefault(zone, 0) / 100;
        long total = paise;
        String breakdown = IntStream.range(0, 4).mapToObj(i -> "leg" + i + "=" + (total / 4))
                .collect(Collectors.joining(",", "[", "]"));
        return String.format("{\\"zone\\":\\"%s\\",\\"farePaise\\":%d,\\"legs\\":\\"%s\\"}", zone, total, breakdown);
    }

    static String request(int i) {
        String[] zones = {"SALT-LAKE", "NEW-TOWN", "HOWRAH"};
        return "zone=" + zones[i % 3] + "&distanceM=" + (800 + i * 37 % 12_000) + "&minutes=" + (5 + i % 40)
                + "&at=" + String.format("%02d:%02d", i % 24, i % 60);
    }

    public static void main(String[] args) {
        payments = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
        int warmup = args.length > 0 ? Integer.parseInt(args[0]) : 0;
        for (int i = 0; i < warmup; i++) handle(request(i));             // synthetic traffic before going live
        long readyMs = ManagementFactory.getRuntimeMXBean().getUptime();
        System.out.println("ready after " + readyMs + " ms (warm-up requests: " + warmup + ")");

        int batch = 500;
        long[] lat = new long[batch];
        for (int b = 1; b <= 20; b++) {
            for (int i = 0; i < batch; i++) {
                String req = request(b * batch + i);
                long t = System.nanoTime();
                handle(req);
                lat[i] = System.nanoTime() - t;
            }
            Arrays.sort(lat);
            if (b <= 4 || b % 5 == 0) {
                System.out.printf("requests %5d-%5d  p50 %5d us  p99 %6d us  max %6d us%n", (b - 1) * batch + 1, b * batch,
                        lat[batch / 2] / 1000, lat[batch * 99 / 100] / 1000, lat[batch - 1] / 1000);
            }
        }
    }
}`,
        },
        {
          type: "paragraph",
          text: "Then I ran it exactly as the pods did: in a 1 GB, 2-CPU container, no flags. First what the JVM chose, then the run:",
        },
        {
          type: "code",
          language: "bash",
          code: `. ./box.sh
box 1g 2 -XX:+PrintFlagsFinal -version 2>/dev/null | grep -E " MaxHeapSize | UseSerialGC "
box 1g 2 QuoteService`,
        },
        {
          type: "output",
          text: `   size_t MaxHeapSize                              = 268435456                                 {product} {ergonomic}
     bool UseSerialGC                              = true                                      {product} {ergonomic}
ready after 223 ms (warm-up requests: 0)
requests     1-  500  p50    54 us  p99    167 us  max   6421 us
requests   501- 1000  p50    27 us  p99    137 us  max  15833 us
requests  1001- 1500  p50    15 us  p99     49 us  max     65 us
requests  1501- 2000  p50    12 us  p99     40 us  max     51 us
requests  2001- 2500  p50     7 us  p99     26 us  max     36 us
requests  4501- 5000  p50     6 us  p99     42 us  max    306 us
requests  7001- 7500  p50     6 us  p99     27 us  max    340 us
requests  9501-10000  p50     6 us  p99     26 us  max    326 us`,
        },
        {
          type: "list",
          items: [
            "**Two problems, not one.** The JVM picked a **256 MB heap and the Serial collector** for a 1 GiB pod, and the first 1,500 requests ran on cold code: medians of 54 and 27 µs against a steady state of 6, with a 6 ms and a 16 ms worst case. In a second run the worst case in the first 1,500 requests was 30 ms.",
            "**Warm-up was the larger effect.** Requests 1 to 1,000 were 4 to 9 times slower at the median than requests from 2,000 onwards, and that's in a toy service; a real Spring service has thousands of hot methods and takes far longer to reach C2. During an autoscaling event every new pod goes through this at once, exactly when traffic is highest.",
            "**Serial GC showed up as tail latency:** a stop-the-world young collection lands on whichever request is running, with one thread doing the copying. With a bigger heap and G1, young pauses are shorter and less frequent.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix had three parts: size the heap and choose the collector explicitly, warm up before reporting ready, and add an AppCDS archive built inside the image to take class loading off the critical path. The archive is created by one training run in the same container:",
        },
        {
          type: "code",
          language: "bash",
          code: `box 1g 2 -XX:ArchiveClassesAtExit=quote.jsa QuoteService > /dev/null 2>&1
box 1g 2 -XX:MaxRAMPercentage=75 -XX:+UseG1GC -XX:SharedArchiveFile=quote.jsa QuoteService 20000`,
        },
        {
          type: "output",
          text: `ready after 525 ms (warm-up requests: 20000)
requests     1-  500  p50     7 us  p99     24 us  max     78 us
requests   501- 1000  p50     6 us  p99     27 us  max    775 us
requests  1001- 1500  p50     7 us  p99     26 us  max     57 us
requests  1501- 2000  p50     7 us  p99     18 us  max     60 us
requests  2001- 2500  p50    11 us  p99     24 us  max     58 us
requests  4501- 5000  p50     9 us  p99     22 us  max    948 us
requests  7001- 7500  p50     7 us  p99     19 us  max     26 us
requests  9501-10000  p50     7 us  p99     18 us  max     25 us`,
        },
        {
          type: "list",
          items: [
            "**The first real request batch now looks like steady state:** median 7 µs, p99 24 µs, worst 78 µs, against 54, 167 and 6,421 µs before. The worst cases left (775 and 948 µs) are isolated events (a GC pause or a late compile) instead of the whole first minute.",
            "**The cost moved before the ready line:** 525 ms to ready instead of 223. That's the trade: a pod takes about 300 ms longer to join the load balancer, and nobody waits for it. AppCDS pays back part of it; on its own, without warm-up, it took the container's ready time from about 200 ms to about 135 ms.",
            "**The heap is 768 MB with G1** instead of 256 MB with Serial, leaving 256 MB of the pod for metaspace, code cache, thread stacks and buffers, which the previous lesson's NMT numbers say is enough for a service like this. I'd still check with NMT in the real service before trusting that.",
          ],
        },
        {
          type: "list",
          items: [
            "**Lesson 1: look at what the JVM chose.** One `-XX:+PrintFlagsFinal` inside the real pod showed the 256 MB heap and the Serial collector; nobody had chosen either.",
            "**Lesson 2: readiness should mean warm.** The readiness probe now passes only after the warm-up replay finishes, so the load balancer never sends user traffic to interpreted code. Replaying a sample of real (anonymised) requests is better than synthetic ones, because it trains the same branches and receiver types that production will use.",
            "**Lesson 3: measure the first minute separately.** The service's p99 over an hour looked fine; the p99 of each pod's first minute was where the problem lived. A per-pod-age latency panel made the next regression visible immediately.",
            "**Lesson 4: change one thing at a time, and run long enough.** The team also tried `-XX:TieredStopAtLevel=1`, which looked good for the first 10,000 requests and then fell behind (Example 2: 2.2 s against 1.3 s for 300,000 requests), and `-Xmx900m`, which would have left 124 MB for everything else in a 1 GiB pod. Measuring each change separately, for longer than the first impression, is what ruled both out.",
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
              question: "What is the JIT compiler?",
              answer:
                "The part of the JVM that compiles bytecode to machine code while the program runs. It starts by interpreting, counts how often methods and loops run, and compiles the hot ones, using run-time profile data (taken branches, receiver classes) to optimise. In my measurements a fare-quote batch ran about 10 times faster on C2-compiled code than in the interpreter, and the JVM lesson measured 25 times on a CPU-bound loop.",
            },
            {
              question: "What's the difference between the interpreter, C1 and C2?",
              answer:
                "The interpreter executes bytecode directly: no compile cost, slowest. C1 compiles quickly with simple optimisations, and in tier 3 also collects profiles. C2 compiles slowly but optimises aggressively using those profiles: inlining, escape analysis, loop unrolling, vectorisation, speculation. Measured per 2,000 quotes: about 1,500 µs interpreted, 600 µs with C1, 120 to 150 µs with C2.",
            },
            {
              question: "What is JVM warm-up?",
              answer:
                "The period after startup when code is still being interpreted and compiled, so it runs slower than it will later. In my quote service the first 500 requests had a median of 48 to 56 µs across runs and a worst case of several milliseconds, against about 6 µs once warm. Services handle it by sending synthetic or replayed traffic before reporting ready.",
            },
            {
              question: "How do you see what the JIT compiles?",
              answer:
                "`-XX:+PrintCompilation` prints one line per compilation: time, compile ID, attributes (`%` for on-stack replacement), tier, method and size, and `made not entrant` when a version is retired. `-Xlog:deoptimization=debug` shows why compiled code was abandoned, and `-XX:CompileCommand=PrintInlining,Class::method` shows inlining decisions. JFR records compilations and deoptimizations as events too.",
            },
            {
              question: "What is the default maximum heap size, and how do you change it?",
              answer:
                "25% of physical memory, or of the container's memory limit (`MaxRAMPercentage=25`), with a different rule (50%) for very small memory. On my 7.6 GB laptop that was 1.9 GB; in a 1 GB container, 256 MB. Change it with `-Xmx` or, better in containers, `-XX:MaxRAMPercentage`, and check the result with `-XX:+PrintFlagsFinal | grep MaxHeapSize`.",
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
              question: "Explain tiered compilation and its levels.",
              answer:
                "Tier 0 is the interpreter; tier 1 is C1 without profiling (trivial methods); tier 2 is C1 with counters only (used when C2 is busy); tier 3 is C1 with full profiling, the normal second step; tier 4 is C2. A method normally goes 0, 3, 4. I measured the transitions: tier 3 at the 256th call (threshold 200, checked every 128 calls) and tier 4 after roughly 5,400 calls. Methods with hot loops get there sooner because back-edges count, and on-stack replacement swaps compiled code into a running loop.",
            },
            {
              question: "What is escape analysis?",
              answer:
                "A C2 analysis that determines whether an object can be seen outside the compiled method (after inlining). If not, C2 can replace it with its fields as local values (scalar replacement), so it's never allocated, and remove locks on it. In my `Inlining` test, 64 MB of `Trip` records per round became 32 bytes; with `-XX:-DoEscapeAnalysis`, or with one callee no longer inlined, all 64 MB came back. It's an optimisation, not a guarantee.",
            },
            {
              question: "What is inlining and why does it matter so much?",
              answer:
                "Replacing a call with the callee's body. It saves the call, but mainly it lets the optimiser work across the old boundary: constant propagation, escape analysis, removing checks. C2 inlines any method up to 35 bytes and hot methods up to 325 bytes, to a depth of 15. Lowering `FreqInlineSize` so that one 270-byte method wasn't inlined made a loop twice as slow and brought back 64 MB of allocation per 2 million calls.",
            },
            {
              question: "What is deoptimization?",
              answer:
                "Abandoning compiled code and continuing in the interpreter, when an assumption the compiler made stops being true: a branch never seen (`unstable_if`), a single receiver class (`class_check`), no subclasses of a class (invalidated by class loading). The compiled frame is converted into interpreter frames, the code is marked not entrant, and the method is recompiled with the new profile. I watched a call site go monomorphic, bimorphic, megamorphic, with two deoptimizations and the loop slowing from 62 to about 150 ms.",
            },
            {
              question: "How do you tune JVM memory in a container?",
              answer:
                "The JVM reads the cgroup limit (container support has been on by default since Java 10), but takes only 25% for the heap. I set `-XX:MaxRAMPercentage` to 50 to 75 depending on native memory needs, cap `MaxDirectMemorySize` and `MaxMetaspaceSize`, and verify with `PrintFlagsFinal` inside the real container. Too high is worse than too low: at 90% of a 512 MB container with 160 MB of direct buffers, the kernel killed the JVM with exit code 137 instead of an `OutOfMemoryError`. Also check the collector: a 1 GB, 2-CPU container gets Serial by default.",
            },
            {
              question: "Why do microbenchmarks lie, and what is JMH?",
              answer:
                "Because the JIT optimises the benchmark: it removes code whose result is unused (my naive loop measured 0.00 ns per call against 30 ns when the result was used), folds constants, measures OSR code, mixes warm-up into results, and lets one test's profile affect another. JMH, the OpenJDK harness, forks a JVM per benchmark, runs warm-up iterations, consumes results through a `Blackhole`, reads inputs from `@State` and reports statistics.",
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
              question: "Why did a Long accumulator loop allocate exactly half its boxes?",
              answer:
                "Because of loop unrolling and the limits of C2's escape analysis. C2 unrolls the loop body (by 2 by default); inside one unrolled body, the intermediate `Long` from the first `sum += i` is used only by the second, so it's scalar-replaced. The value at the end of each body flows around the back-edge through a phi node, and JDK 21's escape analysis treats objects merged at a phi as escaping, so that one is allocated. I confirmed it: 24 bytes per iteration with `LoopUnrollLimit=0`, 12 by default, 3 and 1.5 with more unrolling.",
            },
            {
              question: "What are monomorphic, bimorphic and megamorphic call sites?",
              answer:
                "The number of receiver classes the profile has seen at a virtual or interface call. Monomorphic: C2 inlines the one target behind a type check with an uncommon trap. Bimorphic: two inlined targets behind two checks. Megamorphic (three or more): a real vtable or itable dispatch, no inlining. In my test bimorphic cost almost nothing extra (70 against 62 ms) and megamorphic more than doubled the time (146 to 162 ms), mostly because inlining, and everything that depends on it, was lost.",
            },
            {
              question: "What is on-stack replacement and when does it matter?",
              answer:
                "Switching a method that is already running in the interpreter to compiled code in the middle of a loop, at a bytecode index (the `%` and `@ 4` in PrintCompilation). It's needed for long loops in methods that are called once, like `main` or a batch job. OSR code is compiled separately and is sometimes less optimised, which matters for benchmarks written as one big loop in `main`: they measure OSR code, not the code a service would run.",
            },
            {
              question: "What does CDS / AppCDS do, and what doesn't it do?",
              answer:
                "It stores classes in an already-parsed form in an archive that the JVM maps into memory, skipping parsing and some verification and linking at startup. The JDK ships an archive for core classes; AppCDS (`-XX:ArchiveClassesAtExit` then `-XX:SharedArchiveFile`) adds the application's classes. In my quote service, 1,993 of 2,074 classes came from the archive and median startup fell from 304 to 211 ms. It doesn't help JIT warm-up at all: code still starts in the interpreter. The archive must be rebuilt for each JDK build and class path.",
            },
            {
              question: "How would you choose between -Xmx and -XX:MaxRAMPercentage?",
              answer:
                "`-Xmx` is an absolute size that ignores the environment, which is predictable but must be kept in sync with the container limit by hand. `MaxRAMPercentage` scales with the limit, so one image works in pods of different sizes. I prefer the percentage in containers, checked with `PrintFlagsFinal` in the real environment, and `-Xmx` where the memory is fixed. `-Xmx` wins if both are given. Either way the heap must leave room for native memory, or the container is killed instead of failing with an OOM.",
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
              question: "After every deploy, a service's p99 latency spikes for a minute and then recovers. How do you investigate and fix it?",
              answer:
                "First confirm it's warm-up: plot latency by instance age; if only new instances are slow, it's JIT warm-up and class loading, possibly with GC. `-XX:+PrintCompilation` or JFR shows heavy compilation in the first minute. In my rebuild, the first 500 requests had a 54 µs median against 6 µs later, and up to 16 ms worst case. The fix: replay representative traffic before the readiness probe passes (first batch dropped to 7 µs median, 78 µs worst case), add AppCDS for class loading, and check heap and collector choice (the pod was running with 256 MB and Serial GC).",
            },
            {
              question: "A pod keeps restarting with OOMKilled, but the logs show no OutOfMemoryError. What do you do?",
              answer:
                "The kernel killed it for exceeding the container limit, so the problem is total process memory, not the heap. I'd check the heap setting relative to the limit (`PrintFlagsFinal` in the pod), enable NMT to see native memory by category, look at direct buffers, thread count and Metaspace, then lower `MaxRAMPercentage` and cap `MaxDirectMemorySize`. I reproduced it: at 90% heap in 512 MB with 160 MB of direct buffers, exit 137 and nothing logged; at 60%, a normal `OutOfMemoryError` with a stack trace.",
            },
            {
              question: "A teammate's benchmark shows that a new pricing method takes 0 ns. What's wrong?",
              answer:
                "The JIT removed the work: the result isn't used, so after inlining, the call and then the loop are dead code. My naive version measured 0.00 ns ignoring the result and 30 ns using it. Fix the measurement, not the code: use the result (or a JMH `Blackhole`), avoid constant inputs, warm up, run in separate JVMs for each variant, and preferably write it in JMH.",
            },
            {
              question: "Latency got 2x worse after a release that added a third FareRule implementation, although the new rule is rarely used. Why might that be?",
              answer:
                "A hot interface call site that used to see two classes now sees three, so C2 deoptimized and recompiled it as a megamorphic call: no inlining, no optimisation across the call. My test showed exactly this: 70 ms bimorphic, 146 to 162 ms megamorphic, with `bimorphic_or_optimized_type_check` traps in `-Xlog:deoptimization=debug`. Options: confirm with JFR's deoptimization events or `PrintCompilation`, then restructure the hot path so the common case stays monomorphic (handle the rare rule separately, or use a `switch` over a sealed hierarchy or enum).",
            },
            {
              question: "A service in a 1 GiB container shows long GC pauses although the heap is mostly empty. What would you check first?",
              answer:
                "Which collector and heap the JVM chose. In a 1 GB, 2-CPU container, ergonomics picks the Serial collector and a 256 MB heap (I verified both in a real container); Serial does every collection on one thread, stopping the application. I'd set `-XX:+UseG1GC` explicitly, raise `MaxRAMPercentage` to give the heap room, enable GC logging to confirm the pause times, and re-measure.",
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
            "Run `java -XX:+PrintCompilation Threshold 300` and `java -XX:+PrintCompilation Threshold 127`. Which one compiles `surge`, and at which tier?",
            "Run `WarmupBatches` with `-XX:TieredStopAtLevel=3`. Compare batch 40 with the default run.",
            "Run `Inlining` with `-XX:MaxInlineLevel=0` and look at the allocation column.",
            "Change `Deopt.main` so the megamorphic phases run first and the monomorphic ones last. Does the monomorphic phase get its speed back?",
            "Run `NaiveBench` with `-Xint`.",
            "Run `java -XX:MaxRAM=1g -XX:+PrintFlagsFinal -version | grep -E \" MaxHeapSize | UseSerialGC \"` and compare with the real 1 GB container result in this lesson.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 compiles `surge` at tier 3 for 300 calls (past the 256-call check) and not at all for 127. Step 2 stays at about the C1 profiled speed (560 to 650 µs per batch) to the end, because tier 3 code keeps profiling and never gets C2's optimisations; the default reaches about 120 µs. Step 3 allocates the full 64,000,032 bytes in every round and runs 4 to 5 times slower (94 to 128 ms), because nothing is inlined into `main`'s loop at all, so every `Trip` escapes into the call to `fare`. Step 4: no, the call site stays megamorphic (117 to 176 ms per phase in two runs, even when only `Flat` arrives), because the profile keeps the receiver types it has already seen. Step 5 shows both loops at interpreter speed, about 290 ns per call whether the result is used or not, since there's no JIT to remove anything. Step 6 shows a 256 MB heap like the container, but `UseSerialGC = false`, because `MaxRAM` doesn't affect the server-class check.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `TIERS      0 interpreter -> 3 C1 + profiling -> 4 C2   (1, 2: C1 variants)
           tier 3 at the 256th call (200, checked every 128); tier 4 ~5,400
           loops count too: OSR = '%' in PrintCompilation, entered @ bci

C2         inlining (35 B any, 325 B hot) -> escape analysis -> scalar replacement
           unrolling, range-check elimination, SuperWord (4x on int[])
           speculation + uncommon traps: unstable_if, class_check, bimorphic

DEOPT      assumption broken -> interpreter -> recompile ("made not entrant")
           mono 62 ms | bi 70 ms | mega ~150 ms (no inlining)

MEASURE    warm-up 10x on the first batches; result unused -> 0.00 ns
           JMH: forks, warm-up, Blackhole, @State   (not available here)

ERGONOMICS heap = 25% of RAM / container limit; 1 GB container -> Serial GC
           MaxRAMPercentage 50-75; too high -> exit 137, no OOM, no dump

TOOLS      PrintFlagsFinal  PrintCompilation  CompileCommand=PrintInlining
           -Xlog:deoptimization=debug  jstat -gcutil  jcmd Compiler.codecache
           JFR: -XX:StartFlightRecording, jfr summary / print / view

STARTUP    AppCDS: -XX:ArchiveClassesAtExit -> -XX:SharedArchiveFile (-1/3)
           warm up before ready; CDS doesn't warm the JIT`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "The JIT interprets first, profiles, and compiles hot code for what it has seen: inlining makes escape analysis, unrolling and vectorisation possible, and deoptimization makes the speculation safe. Warm-up is the cost of learning, and it's paid again by every new JVM.",
            "Tuning is measuring: what ergonomics chose (`PrintFlagsFinal`), what GC is doing (`-Xlog:gc*`, `jstat`), where time and allocation go (JFR). In containers, the heap percentage and the collector choice matter more than any exotic flag, and warm-up before readiness plus AppCDS fix most \"slow after deploy\" problems.",
            "With this lesson the JVM Deep Dive phase, and with it the whole Java track, is complete: from what Java is, through the language, OOP, exceptions, strings, arrays, generics, enums, wrappers, files, serialization, reflection and annotations, back to the JVM that runs it all. The natural next step is the Multithreading and Concurrency track, where threads, the Java Memory Model, locks, executors and virtual threads build directly on the stacks, heap, safepoints and JIT behaviour measured in this phase.",
          ],
        },
      ],
    },
  ],
};
