import type { Lesson } from "../types";

export const exceptionBestPractices: Lesson = {
  slug: "exception-best-practices",
  date: "2026-11-13",
  title: "Exception Handling Best Practices",
  description:
    "The decisions behind good Java exception handling: checked or unchecked, catch or propagate, never swallowing, logging once, exceptions versus Optional and sealed result types, failures in streams, executors and CompletableFuture, InterruptedException, retries and idempotency, what throwing really costs down to the JIT's uncommon traps, and a Spring 6.2 handler that turns domain exceptions into RFC 9457 problem details without leaking a stack trace.",
  tags: ["Core Java", "Exceptions", "Best Practices", "Spring"],
  sections: [
    {
      title: "What Good Exception Handling Looks Like",
      blocks: [
        {
          type: "paragraph",
          text: "The four lessons before this one were about mechanics. Exceptions and the Exception Hierarchy showed what a `Throwable` is and how the JVM throws one. try, catch and finally showed the exception table and how a stack unwinds. throw, throws and Custom Exceptions showed how to declare, chain and design my own. try-with-resources showed how cleanup survives a failure. None of them answered the question I actually face every day: **at this line, what should I do with this failure?**",
        },
        {
          type: "paragraph",
          text: "That question has a small number of good answers, and most bad exception handling I've read comes from picking one of the bad ones by reflex: an IDE-generated `catch (Exception e) { e.printStackTrace(); }`, a `return null` that turns a database outage into \"no results\", or a log statement at every layer so one failure shows up five times. This lesson is the decision guide for the whole phase. I keep each mechanic short and point back to the lesson that owns it, and spend the space on the choices: checked or unchecked, catch or propagate, exception or `Optional` or a result type, and what changes once the failure happens on another thread.",
        },
        {
          type: "paragraph",
          text: "The way I think about it: a failure is information. Good handling makes sure that information reaches the one place that can act on it, with enough context to act, exactly once, and without leaking anything to the people who shouldn't see it. Every practice below is a version of that sentence.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The Exceptions and the Exception Hierarchy lesson tells the language history (PL/I, CLU's `signals` clause, C++). For the practices, one more name matters: John Goodenough's 1975 paper \"Exception Handling: Issues and a Proposed Notation\" (Communications of the ACM), which treated exception handling as a language-design problem in its own right: what counts as an exception condition, and what a handler should be allowed to do about it.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) took the bold step: **checked exceptions**, enforced by the compiler. A method that can throw a checked exception must declare it in `throws`, and every caller must catch it or declare it too. The intent was good: failures a caller can reasonably recover from (a missing file, a dropped connection) shouldn't be forgettable. Unchecked exceptions (`RuntimeException` and `Error`) were for programming errors and JVM problems, which no caller can sensibly be forced to handle.",
        },
        {
          type: "paragraph",
          text: "The rest of the history is mostly about living with that choice, and the industry gradually moving away from it:",
        },
        {
          type: "table",
          headers: ["When", "What changed", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "Checked and unchecked exceptions; `throws` enforced by `javac`", "The decision this lesson starts with"],
            ["Java 1.4 (2002)", "Exception chaining (`getCause`, `initCause`), `getStackTrace()`, `java.util.logging`, `assert`", "Translation without losing the original became possible"],
            ["C# 1.0 (2002)", "Exceptions, deliberately with no checked ones", "Anders Hejlsberg's 2003 interview \"The Trouble with Checked Exceptions\" explains why"],
            ["Spring 1.0 (2004)", "`DataAccessException`: an unchecked hierarchy that translates `SQLException`", "The first big framework to say \"unchecked by default\""],
            ["Java 5 (2004)", "`Thread.UncaughtExceptionHandler`, `ExecutorService`, `Future`, `ExecutionException` (JSR 166)", "Failures on other threads got an API"],
            ["Java 7 (2011)", "try-with-resources, multi-catch, precise rethrow, suppressed exceptions, `Objects.requireNonNull`, the `Throwable` constructor with `writableStackTrace`", "Less boilerplate, fail-fast helpers, stackless exceptions"],
            ["Java 8 (2014)", "Lambdas and streams, `Optional`, `CompletableFuture`, `UncheckedIOException`", "Checked exceptions stopped fitting the new functional interfaces"],
            ["Kotlin 1.0 (2016)", "No checked exceptions at all", "A JVM language that dropped them entirely"],
            ["Java 9 (2017)", "`Objects.checkIndex`, `CompletableFuture.orTimeout` and `completeOnTimeout`", "More fail-fast and timeout tools"],
            ["Java 12 (2019)", "`CompletableFuture.exceptionallyCompose` and `exceptionallyAsync`", "Async recovery that itself is async"],
            ["Java 14 (2020)", "Helpful NullPointerException messages (JEP 358), on by default from 15", "NPEs name the null expression"],
            ["Java 16, 17, 21", "Records (JEP 395), sealed classes (JEP 409), pattern matching for `switch` (JEP 441) and record patterns (JEP 440)", "Sealed result types became a practical alternative to exceptions for expected outcomes"],
            ["Java 19 (2022)", "`Future.state()`, `resultNow()`, `exceptionNow()`", "Reading a failed future without the `ExecutionException` wrapper"],
            ["Spring 6.0 (2022)", "`ProblemDetail` and `ErrorResponse`, based on RFC 7807", "A standard JSON shape for API errors; RFC 9457 replaced RFC 7807 in July 2023"],
            ["Jackson 3.0 (2025)", "`JacksonException` became unchecked", "Even a library built on `IOException` switched sides"],
          ],
        },
        {
          type: "paragraph",
          text: "I checked the Jackson change rather than trust a release note. `javap` on the two jars in my local Maven repository:",
        },
        {
          type: "output",
          text: `public abstract class com.fasterxml.jackson.core.JacksonException extends java.io.IOException {     (jackson-core 2.21.7)
public class tools.jackson.core.JacksonException extends java.lang.RuntimeException {                (jackson-core 3.1.2)`,
        },
        {
          type: "paragraph",
          text: "JDK 25, the current LTS, didn't change any rule in this lesson. I re-ran the thread, executor and `CompletableFuture` programs below on JDK 25.0.5 and got the same output apart from line numbers inside JDK classes.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a restaurant kitchen during a busy dinner, where something goes wrong with an order.",
        },
        {
          type: "list",
          items: [
            "A **line cook** burns a steak. If there's another steak and time, the cook just makes it again. That's **recovering**: catching the failure where it can actually be fixed.",
            "If the cook can't fix it (no more steak), the cook tells the head chef \"table 12's steak is gone, out of ribeye\", not just \"problem!\". That's **adding context** before passing it up.",
            "The head chef doesn't tell the waiter \"the grill's thermocouple failed\". The chef says \"table 12's main will be 20 minutes late\". That's **translating** a low-level failure into the language of the layer above.",
            "The **waiter** is the boundary. Only the waiter talks to the guest, and says something polite and useful: \"the steak is unavailable, may I suggest the fish?\" Not the kitchen's internal details. That's mapping an exception to a clean response, with no stack trace.",
            "The **incident log** gets one entry, written by the person who handled it, with the whole story. Not one entry from the cook, one from the chef and one from the waiter about the same steak. That's **logging once**.",
            "A cook who hides the burnt steak under the counter and serves nothing is **swallowing** the exception. The guest waits forever and nobody knows why.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down. In a kitchen, passing a problem up takes effort, so people are tempted to deal with it on the spot. In Java it's the opposite: propagating is free (I just don't catch), and catching is the effort. So the bias in code should be toward letting exceptions travel, which feels backwards to people who think every failure needs a try block next to it. And a kitchen can't rewind a burnt steak, while a transient failure in software often can just be retried, which is where the Retries and Idempotency section comes in.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Three kinds of failure",
        },
        {
          type: "paragraph",
          text: "Before choosing a mechanism, I classify the failure. Nearly every failure I write code for falls into one of three groups, and each group has a natural tool:",
        },
        {
          type: "table",
          headers: ["Kind", "Examples", "Who can fix it", "Natural tool"],
          rows: [
            ["Programming error (a bug)", "null where none is allowed, index out of range, illegal state, a negative quantity from my own code", "A developer, by changing code", "Unchecked: `NullPointerException`, `IllegalArgumentException`, `IllegalStateException`. Fail fast, don't catch"],
            ["Expected outcome", "book not in the catalogue, insufficient funds, coupon expired, validation failed on user input", "The caller, as part of normal logic", "`Optional`, a sealed result type, or a domain exception the boundary maps to a 4xx response"],
            ["Environmental or transient", "timeout, connection reset, disk full, a 503 from another service, a deadlock victim", "Nobody in the call path; sometimes time (a retry)", "An exception that propagates to a boundary, possibly retried there"],
          ],
        },
        {
          type: "paragraph",
          text: "The categories are about the failure, not the type. A `FileNotFoundException` is environmental when a config file disappears, and an expected outcome when a user picks a file name in an upload dialog. The same exception can be handled very differently depending on which it is at that call site.",
        },
        {
          type: "heading",
          text: "The four reasons to catch",
        },
        {
          type: "paragraph",
          text: "A `catch` block is justified when the code at that spot does one of four things. If none applies, the exception should propagate:",
        },
        {
          type: "table",
          headers: ["Reason", "What the catch block does", "Example in this lesson"],
          rows: [
            ["Recover", "Produces a correct result another way: a fallback, a default, a retry", "`NotifierFallback` sends an SMS when email fails"],
            ["Add context", "Rethrows with information only this level knows (an id, a file name)", "`could not load order 13`"],
            ["Translate", "Rethrows as an exception that belongs to this layer's abstraction, keeping the cause", "`IOException` becomes `OrderStoreException`"],
            ["Boundary", "Turns any failure into the outside world's format: an HTTP response, an exit code, a log line, a failed job record", "The `@RestControllerAdvice` in production"],
          ],
        },
        {
          type: "paragraph",
          text: "For the bug row I reuse the JDK's standard types (`IllegalArgumentException`, `IllegalStateException`, `NullPointerException`, `IndexOutOfBoundsException`, `UnsupportedOperationException`) before writing my own; the Exceptions and the Exception Hierarchy lesson lists them with a trigger each, along with the compiler's checked-versus-unchecked rule. That rule is a compiler rule only. At run time the JVM treats every `Throwable` the same way, and the class file's `Exceptions` attribute that records a `throws` clause isn't checked by the verifier. That's what makes the \"sneaky throw\" trick in the throw, throws and Custom Exceptions lesson possible.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The Exceptions and the Exception Hierarchy lesson showed that `new` on any `Throwable` calls `fillInStackTrace()` in the constructor, and that the try, catch and finally lesson's exception table is how the JVM finds a handler. Here I wanted to know two things that drive practical decisions: how much a throw really costs, split into its parts, and what the JIT does with a `throw` that almost never happens.",
        },
        {
          type: "heading",
          text: "Where the cost of a throw goes",
        },
        {
          type: "paragraph",
          text: "A throw has three costs: allocating the exception object, capturing the stack trace in the constructor, and unwinding frames until a handler is found. To separate them, I threw three kinds of exception from a recursive method at three depths. A normal one, a **stackless** one built with the protected `Throwable(String, Throwable, boolean enableSuppression, boolean writableStackTrace)` constructor from Java 7, and a single **preallocated** stackless instance thrown again and again:",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowCost.java",
          code: `public class ThrowCost {
    static final int N = 200_000;

    static class Stackless extends RuntimeException {
        Stackless(String message) {
            super(message, null, false, false);   // no suppression, no stack trace
        }
    }

    static final RuntimeException PREALLOCATED = new Stackless("preallocated");

    static long sink;

    // Recurse to the requested depth, then throw the requested kind
    static void throwAt(int depth, int kind) {
        if (depth > 0) {
            throwAt(depth - 1, kind);
            return;
        }
        switch (kind) {
            case 0 -> throw new RuntimeException("full");
            case 1 -> throw new Stackless("stackless");
            default -> throw PREALLOCATED;
        }
    }

    static long nanosPerThrow(int depth, int kind) {
        long start = System.nanoTime();
        for (int i = 0; i < N; i++) {
            try {
                throwAt(depth, kind);
            } catch (RuntimeException e) {
                sink += e.getMessage().length();
            }
        }
        return (System.nanoTime() - start) / N;
    }

    public static void main(String[] args) {
        String[] names = {"new RuntimeException", "stackless (no trace)", "preallocated"};
        for (int warm = 0; warm < 3; warm++) {          // warm-up rounds, results discarded
            for (int kind = 0; kind < 3; kind++) {
                nanosPerThrow(0, kind);
                nanosPerThrow(10, kind);
                nanosPerThrow(100, kind);
            }
        }
        System.out.printf("%-22s %10s %10s %10s%n", "", "depth 0", "depth 10", "depth 100");
        for (int kind = 0; kind < 3; kind++) {
            System.out.printf("%-22s %7d ns %7d ns %7d ns%n", names[kind],
                    nanosPerThrow(0, kind), nanosPerThrow(10, kind), nanosPerThrow(100, kind));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ThrowCost.java && java -Xmx128m ThrowCost`,
        },
        {
          type: "output",
          text: `                          depth 0   depth 10  depth 100
new RuntimeException       489 ns    1288 ns    8977 ns
stackless (no trace)         7 ns     574 ns    5473 ns
preallocated                 0 ns     490 ns    4787 ns`,
        },
        {
          type: "paragraph",
          text: "These numbers are from one run on my machine on JDK 21, with other JVMs busy on the same box, and they moved by 20 to 50 percent between runs. A hand-written loop is not JMH. I only trust the shape, which was the same in every run:",
        },
        {
          type: "list",
          items: [
            "**The stack trace is the biggest single cost when the throw is close to the catch.** At depth 0 the normal exception cost about 500 ns and the stackless one under 10 ns. `fillInStackTrace` walks every frame on the thread's stack, including `main` and `nanosPerThrow`, whether or not anyone reads the trace. Turning that walk into `StackTraceElement` objects, which printing or logging does, costs more again, as the StackCost run in Exceptions and the Exception Hierarchy showed.",
            "**At depth 0 the JIT made the stackless throw almost free.** `throwAt` was inlined into the loop, so the `athrow` and its handler ended up in the same compiled method and the throw became little more than a jump. The preallocated one measured as 0 ns because there was nothing left to do but the jump.",
            "**Unwinding costs per frame.** At depth 100 even the preallocated exception cost about 5 microseconds. Each compiled frame the exception passes through without a handler means a call into the JVM's runtime to look up that frame's handler and pop it. A return does none of that.",
            "**The trace cost grows with depth too**: about 500 ns at depth 0, 1.3 microseconds at 10 frames, 9 microseconds at 100. A Spring request thread is often 100 or more frames deep before my code even starts.",
          ],
        },
        {
          type: "heading",
          text: "A throw that never happened yet: uncommon traps",
        },
        {
          type: "paragraph",
          text: "C2, HotSpot's optimizing compiler, compiles from profiling data. If a branch has never been taken by the time a method gets hot, C2 usually doesn't compile that branch at all. It puts an **uncommon trap** there instead: a stub that, if it's ever reached, abandons the compiled code (deoptimization), continues that call in the interpreter, and lets the method be compiled again later with the new profile. A `throw` behind a validation check is the classic never-taken branch. I wrote a method that validates a percentage, ran it a million times with valid input, then fed it one bad value:",
        },
        {
          type: "code",
          language: "java",
          title: "RareThrow.java",
          code: `public class RareThrow {
    static int parsePercent(int value) {
        if (value < 0 || value > 100) {
            throw new IllegalArgumentException("percent out of range: " + value);
        }
        return value;
    }

    static long run(int bad) {
        long sum = 0;
        for (int i = 0; i < 1_000_000; i++) {
            try {
                sum += parsePercent(i == bad ? -1 : i % 101);
            } catch (IllegalArgumentException e) {
                sum--;
            }
        }
        return sum;
    }

    public static void main(String[] args) {
        System.out.println("warm-up, never throws: " + run(-1));
        System.out.println("now one bad value:     " + run(500_000));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac RareThrow.java
java -Xlog:deoptimization=debug RareThrow      # each line trimmed after the trap reason`,
        },
        {
          type: "output",
          text: `[0.041s][debug][deoptimization] cid=  10 osr level=4 RareThrow.run(I)J trap_bci=7 osr_bci=4 unstable_if reinterpret
warm-up, never throws: 49999950
[0.055s][debug][deoptimization] cid=  89 osr level=4 RareThrow.run(I)J trap_bci=13 osr_bci=4 unstable_if reinterpret
[0.055s][debug][deoptimization] cid=   7     level=4 RareThrow.parsePercent(I)I trap_bci=1 unstable_fused_if reinterpret
now one bad value:     49999899`,
        },
        {
          type: "paragraph",
          text: "The interesting line is the last trap. `javap -c` shows what bytecode index 1 of `parsePercent` is:",
        },
        {
          type: "output",
          text: `  static int parsePercent(int);
    Code:
       0: iload_0
       1: iflt          10
       4: iload_0
       5: bipush        100
       7: if_icmple     24
      10: new           #7                  // class java/lang/IllegalArgumentException
      ...
      23: athrow
      24: iload_0
      25: ireturn`,
        },
        {
          type: "list",
          items: [
            "`trap_bci=1` is the `iflt 10` that jumps to the `throw`. During the warm-up that branch was never taken, so C2's compiled `parsePercent` (compile id 7, tier 4) had no code for building and throwing the exception, only a trap.",
            "When `-1` arrived, the trap fired: reason `unstable_if` (here `unstable_fused_if`, because C2 had merged the two comparisons), action `reinterpret`. That compiled version was thrown away and the call finished in the interpreter, which threw the exception normally.",
            "The first trap, at `trap_bci=7` in `run`, has nothing to do with exceptions: it's the loop's exit test, never false while the warm-up loop was being compiled. The second, `trap_bci=13`, is the `i == bad` branch being taken for the first time. Uncommon traps are everywhere in compiled code, not just on `throw` paths.",
            "With `-XX:+PrintCompilation` the same moment shows up as the tier 4 compilation of `parsePercent` being `made not entrant`, followed by a fresh compilation.",
            "The trap line appeared in 8 of 10 runs. In the other two it didn't appear at all, presumably because the compiled code in place when the bad value arrived was a different version. JIT behaviour depends on timing, which is why I describe this as what commonly happens, not what always happens.",
          ],
        },
        {
          type: "paragraph",
          text: "The practical meaning: a validation `throw` that never fires costs nothing in compiled code, not even the code to build the message. The first time it fires after warm-up costs a deoptimization and a recompile, which is microseconds to milliseconds, once. What C2 does when the throw becomes **frequent** is a different optimization, covered in Performance: for some JVM-created exceptions it stops filling in stack traces altogether.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "I keep this claim narrow on purpose",
          text: "Whether C2 emits a trap or real code for a rare branch depends on profile counts, the tier, inlining and flags like `-XX:PerMethodTrapLimit`. I've shown one run where it did. I wouldn't claim every never-taken `throw` becomes a trap, only that it commonly does, and that the log above is how to check a specific method.",
        },
      ],
    },
    {
      title: "Checked or Unchecked?",
      blocks: [
        {
          type: "heading",
          text: "The original intent",
        },
        {
          type: "paragraph",
          text: "The rule as the original Java Tutorial put it: if a client can reasonably be expected to recover from an exception, make it checked; if a client can't do anything to recover, make it unchecked. Programming errors were always meant to be unchecked. The idea was that the compiler would make sure nobody forgot about a missing file or a broken connection.",
        },
        {
          type: "heading",
          text: "What happened in practice",
        },
        {
          type: "list",
          items: [
            "**Most callers can't recover either.** A service method that gets an `SQLException` usually can't fix the database. So the checked exception gets declared upward through every layer, or wrapped, or (worst) swallowed to make the compiler stop complaining.",
            "**Checked exceptions leak implementation details.** If `OrderRepository.find` declares `throws SQLException`, every caller now depends on the fact that it's a SQL database. Switching to a REST call means changing every signature to `throws IOException`.",
            "**They don't compose with lambdas.** `Function.apply` declares no exceptions, so `stream.map(path -> Files.readString(path))` doesn't compile. The Exceptions in Lambdas and Streams section shows the real error.",
            "**Frameworks voted.** Spring translates `SQLException` into its unchecked `DataAccessException` hierarchy, JPA's `PersistenceException` is unchecked, Kotlin has no checked exceptions, and Jackson 3 moved from `IOException` to an unchecked `JacksonException`.",
          ],
        },
        {
          type: "paragraph",
          text: "The JDK itself shows the shift. `SimpleDateFormat` from Java 1.1 throws a checked `ParseException`; `java.time` from Java 8 throws an unchecked `DateTimeParseException`:",
        },
        {
          type: "code",
          language: "java",
          title: "TwoDateApis.java",
          code: `import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Date;

public class TwoDateApis {
    static boolean isChecked(Throwable t) {
        return !(t instanceof RuntimeException) && !(t instanceof Error);
    }

    // Java 1.1 API: ParseException is checked, so every caller has to deal with it
    static Date oldParse(String text) throws ParseException {
        return new SimpleDateFormat("yyyy-MM-dd").parse(text);
    }

    // Java 8 API: DateTimeParseException is unchecked
    static LocalDate newParse(String text) {
        return LocalDate.parse(text);
    }

    public static void main(String[] args) {
        try {
            System.out.println("old API parsed 2026-13-45 as " + oldParse("2026-13-45"));
            oldParse("13/11/2026");
        } catch (ParseException e) {
            System.out.println("old: " + e + ", checked=" + isChecked(e));
        }
        try {
            newParse("2026-13-45");
        } catch (DateTimeParseException e) {
            System.out.println("new: " + e + ", checked=" + isChecked(e));
        }
    }
}`,
        },
        {
          type: "output",
          text: `old API parsed 2026-13-45 as Sun Feb 14 00:00:00 IST 2027
old: java.text.ParseException: Unparseable date: "13/11/2026", checked=true
new: java.time.format.DateTimeParseException: Text '2026-13-45' could not be parsed: Invalid value for MonthOfYear (valid values 1 - 12): 13, checked=false`,
        },
        {
          type: "paragraph",
          text: "(`IST` because my machine runs in India's time zone.) The first line is the real lesson: the checked API forced me to write a `catch`, and still silently accepted month 13, day 45 and rolled it into February 2027, because `SimpleDateFormat` is lenient by default. Being checked says nothing about being correct. The unchecked `java.time` API rejected it with a precise message. I also had to write `isChecked` as a method: `e instanceof RuntimeException` directly on a `ParseException` variable doesn't compile, because `javac` knows the two types can never match.",
        },
        {
          type: "heading",
          text: "My decision guide",
        },
        {
          type: "table",
          headers: ["Situation", "My choice", "Why"],
          rows: [
            ["A bug: bad argument, broken invariant, null", "Unchecked, a standard JDK type", "No caller should catch it; the fix is in code"],
            ["A domain failure the boundary maps to a response (not found, payment declined)", "Unchecked custom exception with fields", "Only the boundary handles it; layers in between stay clean"],
            ["An infrastructure failure (I/O, database, remote call)", "Translate to unchecked at my layer's edge, keep the cause", "Callers don't depend on how I store data"],
            ["An expected outcome every caller must look at, right away", "Not an exception: `Optional` or a sealed result type", "The type system forces handling, and it works with lambdas"],
            ["A library API where the caller genuinely can and should recover, and lambdas aren't involved", "Checked is defensible", "It's still the language's tool for \"you must think about this\""],
            ["`InterruptedException`", "Keep it checked: propagate it or restore the flag", "It's a cancellation signal, not an error; see its own section"],
          ],
        },
        {
          type: "paragraph",
          text: "So in application code I default to unchecked, and use the type system (a return type) rather than `throws` when I want to force callers to handle something. I don't convert checked exceptions to unchecked by reflex, though: `InterruptedException` has a specific meaning that wrapping destroys.",
        },
      ],
    },
    {
      title: "Catch or Propagate?",
      blocks: [
        {
          type: "paragraph",
          text: "The rule from the Technical Picture: catch only to recover, add context, translate, or at a boundary. Here are three of the four in one program, a repository, a service and a request handler. The repository can't do anything about a broken connection, so it doesn't catch. The service translates and adds the order id. The handler is the boundary:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderLookup.java",
          code: `import java.io.IOException;

public class OrderLookup {
    // Translated, unchecked exceptions the service layer exposes
    static class OrderStoreException extends RuntimeException {
        OrderStoreException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static class OrderNotFoundException extends RuntimeException {
        OrderNotFoundException(long orderId) {
            super("order " + orderId + " does not exist");
        }
    }

    // Repository: speaks the storage's language, including its checked exception
    static String readRow(long orderId) throws IOException {
        if (orderId == 13) {
            throw new IOException("connection reset by peer");
        }
        return orderId == 99 ? null : orderId + ",PAID,2499";
    }

    // Service: can't fix a broken connection, but can translate and add context
    static String status(long orderId) {
        String row;
        try {
            row = readRow(orderId);
        } catch (IOException e) {
            throw new OrderStoreException("could not load order " + orderId, e);
        }
        if (row == null) {
            throw new OrderNotFoundException(orderId);
        }
        return row.split(",")[1];
    }

    // Boundary: the one place that turns any failure into a response
    static String handle(long orderId) {
        try {
            return "200 " + status(orderId);
        } catch (OrderNotFoundException e) {
            return "404 " + e.getMessage();
        } catch (OrderStoreException e) {
            e.printStackTrace(System.out);          // stands in for log.error(..., e)
            return "503 try again later";
        }
    }

    public static void main(String[] args) {
        System.out.println(handle(7));
        System.out.println(handle(99));
        System.out.println(handle(13));
    }
}`,
        },
        {
          type: "output",
          text: `200 PAID
404 order 99 does not exist
OrderLookup$OrderStoreException: could not load order 13
	at OrderLookup.status(OrderLookup.java:31)
	at OrderLookup.handle(OrderLookup.java:42)
	at OrderLookup.main(OrderLookup.java:54)
Caused by: java.io.IOException: connection reset by peer
	at OrderLookup.readRow(OrderLookup.java:20)
	at OrderLookup.status(OrderLookup.java:29)
	... 2 more
503 try again later`,
        },
        {
          type: "list",
          items: [
            "The trace tells the whole story in two parts: **what** the application was doing (`could not load order 13`, thrown in `status`) and **why** (`connection reset by peer`, thrown in `readRow`). Neither line alone is enough. That's what translation with a cause buys.",
            "`... 2 more` means the cause's last two frames (`handle` and `main`) are the same as the outer exception's, so they're not printed twice.",
            "`handle` has two different reactions: a missing order is the caller's problem (404, no stack trace needed), a storage failure is ours (503, logged with the trace). The boundary is the only place that knows enough to make that call.",
            "`status` doesn't catch `OrderNotFoundException`, and nothing between `status` and `handle` catches anything. In a real service those middle layers are where most code lives, and they'd have no try blocks at all.",
          ],
        },
        {
          type: "image",
          src: "/images/java/exception-best-practices-layers.svg",
          alt: "A diagram of one request, GET /orders/13, through four boxes in a row: Client, OrderController, OrderService and OrderRepository. Below each box is what that layer does with the failure. OrderRepository throws IOException, connection reset by peer, and does not catch it because it cannot fix it. OrderService catches and translates it into OrderStoreException with the message could not load order 13 and the IOException as cause. OrderController does nothing: no try, no catch, no log, the exception passes through. Arrows carry the failure down to a wide box, the global handler annotated @RestControllerAdvice, which is the boundary: it logs once at ERROR with the full trace including Caused by java.io.IOException, and maps types to statuses, not found to 404, store unavailable to 503, anything unexpected to 500 with an error id. An arrow goes up to the client box, which receives 503 problem+json, try again later, with no stack trace and no class names. A footer says: catch only to recover, add context, translate, or answer at a boundary; everything else propagates.",
          caption: "The same shape as OrderLookup, in a web service: one translation, one boundary, one log line.",
        },
        {
          type: "heading",
          text: "Where the boundaries are",
        },
        {
          type: "table",
          headers: ["Kind of program", "Boundary", "What it does with an exception"],
          rows: [
            ["Web service", "A global handler (`@RestControllerAdvice`), or a servlet filter", "Log once, map to a status and an error body"],
            ["Message consumer", "The listener method or the container around it", "Log, retry or dead-letter the message, never lose it"],
            ["Batch job", "The per-item loop and the job runner", "Record per-item failures and continue, or fail the job with a summary"],
            ["Thread or executor task", "The task's `run`/`call`, the `Future`, or an `UncaughtExceptionHandler`", "Make sure someone sees it; see Threads and Executors"],
            ["Command-line tool", "`main`", "Print a human message to `System.err` and exit with a non-zero code"],
          ],
        },
      ],
    },
    {
      title: "Never Swallow an Exception",
      blocks: [
        {
          type: "paragraph",
          text: "Swallowing means catching an exception and continuing as if nothing happened, with nobody told. It's the most expensive habit in this lesson, because the failure doesn't disappear. It turns into wrong data or a different exception later, somewhere unrelated, with the evidence gone. Two forms are the classic ones; the third, `catch (Exception e)` turning a bug into \"bad input\", is `BroadCatch` in the try, catch and finally lesson:",
        },
        {
          type: "code",
          language: "java",
          title: "Swallowed.java",
          code: `import java.io.IOException;

public class Swallowed {
    record Customer(String name, String email) { }

    // Bug 1: an empty catch. A bad coupon silently means "no discount".
    static long priceAfterCoupon(long pricePaise, String coupon) {
        int percent = 0;
        try {
            percent = Integer.parseInt(coupon.replace("OFF", ""));
        } catch (NumberFormatException e) {
            // ignore
        }
        return pricePaise - pricePaise * percent / 100;
    }

    // Bug 2: catch and return null. The real failure is thrown away here...
    static Customer loadCustomer(long id) {
        try {
            return fetchFromStore(id);
        } catch (IOException e) {
            return null;
        }
    }

    static Customer fetchFromStore(long id) throws IOException {
        throw new IOException("customer store timed out after 2000 ms");
    }

    // ...and a NullPointerException turns up somewhere else, with no cause attached
    static String receiptHeader(long customerId) {
        Customer customer = loadCustomer(customerId);
        return "Receipt for " + customer.name();
    }

    public static void main(String[] args) {
        System.out.println("1: " + priceAfterCoupon(50_000, "10%OFF"));
        System.out.println("2: " + receiptHeader(42));
    }
}`,
        },
        {
          type: "output",
          text: `1: 50000
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "Swallowed$Customer.name()" because "<local2>" is null
	at Swallowed.receiptHeader(Swallowed.java:33)
	at Swallowed.main(Swallowed.java:38)`,
        },
        {
          type: "list",
          items: [
            "**Bug 1** charged the full 50,000 paise. The coupon was `10%OFF`; removing `OFF` left `10%`, which `parseInt` rejects, and the empty catch turned that into a 0 percent discount. No error, no log line, an unhappy customer, and nothing for anyone to search for.",
            "**Bug 2** is the worse of the two. The `IOException` said exactly what was wrong: `customer store timed out after 2000 ms`. It was dropped in `loadCustomer`, and the program died one method later with a `NullPointerException` about `<local2>` (the `customer` variable; `customerId` is a `long` and takes slots 0 and 1). The trace has no `Caused by`, because there's no cause left. Anyone debugging this starts by looking for a null bug that doesn't exist.",
          ],
        },
        {
          type: "paragraph",
          text: "The fixes follow the four reasons. Bug 1: the coupon is user input, so reject it with a message (`IllegalArgumentException(\"unrecognised coupon: 10%OFF\")`) or at least log and count it. Bug 2: don't catch at all, or translate with the cause; if \"no customer\" is a real outcome, return `Optional<Customer>` and keep failures as exceptions. And for the third form, catch only the type I expect (`NumberFormatException` around a `parseInt`) and let anything else, a bug included, propagate to the boundary where it's logged as what it is.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "When ignoring really is right",
          text: "Sometimes there's genuinely nothing to do, like a failure closing a read-only stream after the data was already read. Then I write it so the next reader knows it was a decision: name the variable `ignored` (IntelliJ's empty-catch inspection treats that as intent) and add a comment saying why. `catch (IOException ignored) { // already read everything; close failure can't lose data }`. An empty catch with no comment is always a question mark.",
        },
      ],
    },
    {
      title: "Log Once, at the Boundary",
      blocks: [
        {
          type: "paragraph",
          text: "The opposite of swallowing is just as common: **log and rethrow** at every layer. Each layer means well (\"I'll log it in case nobody else does\"), and the result is the same failure printed three times with three slightly different messages, often with the full stack trace each time. On a dashboard that looks like three errors. I used `java.util.logging` so the program needs nothing outside the JDK, with a one-line format set on the command line:",
        },
        {
          type: "code",
          language: "java",
          title: "DuplicateLogs.java",
          code: `import java.util.logging.Level;
import java.util.logging.Logger;

public class DuplicateLogs {
    static final Logger LOG = Logger.getLogger("orders");

    static class StorageException extends RuntimeException {
        StorageException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    // ---- log-and-rethrow at every layer ----
    static void saveRow(long orderId) {
        try {
            throw new IllegalStateException("disk full");
        } catch (IllegalStateException e) {
            LOG.log(Level.SEVERE, "repository: save failed for order " + orderId, e);
            throw e;
        }
    }

    static void placeOrder(long orderId) {
        try {
            saveRow(orderId);
        } catch (IllegalStateException e) {
            LOG.log(Level.SEVERE, "service: could not place order " + orderId, e);
            throw new StorageException("could not place order " + orderId, e);
        }
    }

    static String handleNoisy(long orderId) {
        try {
            placeOrder(orderId);
            return "201";
        } catch (StorageException e) {
            LOG.log(Level.SEVERE, "controller: request failed", e);
            return "500";
        }
    }

    // ---- log once, at the boundary ----
    static void saveRowQuietly(long orderId) {
        throw new IllegalStateException("disk full");
    }

    static void placeOrderQuietly(long orderId) {
        try {
            saveRowQuietly(orderId);
        } catch (IllegalStateException e) {
            throw new StorageException("could not place order " + orderId, e);   // context, no log
        }
    }

    static String handleOnce(long orderId) {
        try {
            placeOrderQuietly(orderId);
            return "201";
        } catch (StorageException e) {
            LOG.log(Level.SEVERE, "POST /orders failed", e);                     // the one log line
            return "500";
        }
    }

    public static void main(String[] args) {
        System.err.println("== log and rethrow ==");
        System.err.println("response " + handleNoisy(501));
        System.err.println("== log once ==");
        System.err.println("response " + handleOnce(502));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac DuplicateLogs.java
java -Djava.util.logging.SimpleFormatter.format='%4$s %3$s: %5$s%6$s%n' DuplicateLogs`,
        },
        {
          type: "output",
          text: `== log and rethrow ==
SEVERE orders: repository: save failed for order 501
java.lang.IllegalStateException: disk full
	at DuplicateLogs.saveRow(DuplicateLogs.java:16)
	at DuplicateLogs.placeOrder(DuplicateLogs.java:25)
	at DuplicateLogs.handleNoisy(DuplicateLogs.java:34)
	at DuplicateLogs.main(DuplicateLogs.java:67)

SEVERE orders: service: could not place order 501
java.lang.IllegalStateException: disk full
	at DuplicateLogs.saveRow(DuplicateLogs.java:16)
	at DuplicateLogs.placeOrder(DuplicateLogs.java:25)
	at DuplicateLogs.handleNoisy(DuplicateLogs.java:34)
	at DuplicateLogs.main(DuplicateLogs.java:67)

SEVERE orders: controller: request failed
DuplicateLogs$StorageException: could not place order 501
	at DuplicateLogs.placeOrder(DuplicateLogs.java:28)
	at DuplicateLogs.handleNoisy(DuplicateLogs.java:34)
	at DuplicateLogs.main(DuplicateLogs.java:67)
Caused by: java.lang.IllegalStateException: disk full
	at DuplicateLogs.saveRow(DuplicateLogs.java:16)
	at DuplicateLogs.placeOrder(DuplicateLogs.java:25)
	... 2 more

response 500
== log once ==
SEVERE orders: POST /orders failed
DuplicateLogs$StorageException: could not place order 502
	at DuplicateLogs.placeOrderQuietly(DuplicateLogs.java:51)
	at DuplicateLogs.handleOnce(DuplicateLogs.java:57)
	at DuplicateLogs.main(DuplicateLogs.java:69)
Caused by: java.lang.IllegalStateException: disk full
	at DuplicateLogs.saveRowQuietly(DuplicateLogs.java:44)
	at DuplicateLogs.placeOrderQuietly(DuplicateLogs.java:49)
	... 2 more

response 500`,
        },
        {
          type: "list",
          items: [
            "One disk-full failure produced **three SEVERE entries** in the noisy version, with the same `IllegalStateException` trace printed three times (twice on its own, once as a cause). An alert that counts SEVERE lines would fire three times for one event.",
            "The last of the three entries already contained everything the first two had, because the cause chain carries the original trace. The first two added nothing but noise.",
            "The quiet version has **one entry** with the same information: the context (`could not place order 502`), where the request entered (`POST /orders`), and the root cause with its frames.",
            "The rule I follow: a method either **handles** an exception (and then it may log it) or **passes it on** (wrapped or not), never both. Passing on with more context goes into the exception's message, not into a log line.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Exceptions to log-once",
          text: "Two cases where I do log below the boundary. First, at a thread or process boundary that's also a boundary for the logs: a background task's catch-all, because nothing above it will ever see the exception. Second, when a lower layer recovers (a retry that succeeded, a fallback that worked), a WARN line there is the only trace the failure ever happened. Both are \"handling\", so they don't break the rule.",
        },
      ],
    },
    {
      title: "Messages That Help (and Leak Nothing)",
      blocks: [
        {
          type: "paragraph",
          text: "An exception message is written for the developer who reads the log at 3 a.m. with no other context. It should say what was being attempted, with which identifiers, what was wrong, and if possible what was expected. It should never contain secrets, because logs get copied into tickets, chat and third-party log services. I compared three messages for the same failed card payment:",
        },
        {
          type: "code",
          language: "java",
          title: "Messages.java",
          code: `public class Messages {
    record CardPayment(String orderId, String cardNumber, String cvv, long amountPaise) { }

    static class PaymentFailedException extends RuntimeException {
        private final String orderId;
        private final String gatewayCode;

        PaymentFailedException(String orderId, String gatewayCode, String message) {
            super(message);
            this.orderId = orderId;
            this.gatewayCode = gatewayCode;
        }

        String orderId() { return orderId; }
        String gatewayCode() { return gatewayCode; }
    }

    static String lastFour(String cardNumber) {
        return "****" + cardNumber.substring(cardNumber.length() - 4);
    }

    static void vague(CardPayment p) {
        throw new RuntimeException("Something went wrong");
    }

    static void leaky(CardPayment p) {
        throw new RuntimeException("Payment failed: " + p);        // record toString: every field
    }

    static void useful(CardPayment p) {
        throw new PaymentFailedException(p.orderId(), "51",
                "card " + lastFour(p.cardNumber()) + " declined for order " + p.orderId()
                + ": amount " + p.amountPaise() + " paise, gateway code 51 (insufficient funds)");
    }

    public static void main(String[] args) {
        CardPayment p = new CardPayment("ORD-1042", "4111111111111111", "123", 249_900);
        for (Runnable attempt : new Runnable[] {() -> vague(p), () -> leaky(p), () -> useful(p)}) {
            try {
                attempt.run();
            } catch (RuntimeException e) {
                System.out.println(e.getMessage());
                if (e instanceof PaymentFailedException pf) {
                    System.out.println("  fields for code: orderId=" + pf.orderId() + ", gatewayCode=" + pf.gatewayCode());
                }
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `Something went wrong
Payment failed: CardPayment[orderId=ORD-1042, cardNumber=4111111111111111, cvv=123, amountPaise=249900]
card ****1111 declined for order ORD-1042: amount 249900 paise, gateway code 51 (insufficient funds)
  fields for code: orderId=ORD-1042, gatewayCode=51`,
        },
        {
          type: "list",
          items: [
            "**Vague**: no order, no amount, no reason. The log line can't be connected to a customer complaint.",
            "**Leaky**: concatenating the whole record put the full card number and the CVV into the message. A record's generated `toString` prints every component, so this happens by accident whenever someone writes `\"failed: \" + request`. The fix for the record itself is to override `toString` to mask sensitive components, so even an accidental concatenation is safe.",
            "**Useful**: the order id, the amount, the masked card and the gateway's code and meaning. The code also lives in **fields**, so the boundary can branch on `gatewayCode()` without parsing the message text.",
          ],
        },
        {
          type: "list",
          items: [
            "Include identifiers (order id, customer id, file name, line number) and the offending value, quoted or bracketed so empty strings and spaces are visible.",
            "Leave out passwords, tokens, API keys, full card numbers, CVVs, and personal data the logs aren't allowed to hold. The same goes for whole request bodies.",
            "Don't make the message the only carrier of data. A field on a custom exception is for code; the message is for humans.",
            "Don't reuse the internal message as the user-facing text. The production section keeps the two apart.",
          ],
        },
      ],
    },
    {
      title: "Exceptions, Optional or a Result Type?",
      blocks: [
        {
          type: "paragraph",
          text: "For an **expected** outcome, an exception is often the wrong tool. It isn't visible in the method signature (if unchecked), it's easy to forget, and it's slower than a return. Java gives me two alternatives. `Optional<T>` (the Java 8 track has its own Optional lesson) is for exactly one kind of \"no answer\": absent. A **sealed interface of records** is for several outcomes that each carry their own data, and since Java 21 a `switch` over it is checked for exhaustiveness by the compiler:",
        },
        {
          type: "code",
          language: "java",
          title: "ExpectedFailures.java",
          code: `import java.util.Map;
import java.util.Optional;

public class ExpectedFailures {
    // "Not found" is a normal answer to a lookup: Optional says so in the type
    record Book(String isbn, String title) { }

    static final Map<String, Book> CATALOGUE = Map.of(
            "978-0134685991", new Book("978-0134685991", "Effective Java"));

    static Optional<Book> findBook(String isbn) {
        return Optional.ofNullable(CATALOGUE.get(isbn));
    }

    // Several expected outcomes, each with its own data: a sealed result type
    sealed interface Withdrawal permits Approved, InsufficientFunds, AccountFrozen { }
    record Approved(long newBalance) implements Withdrawal { }
    record InsufficientFunds(long balance, long shortBy) implements Withdrawal { }
    record AccountFrozen(String reason) implements Withdrawal { }

    static class BankAccount {
        private long balance;
        private final boolean frozen;

        BankAccount(long balance, boolean frozen) {
            this.balance = balance;
            this.frozen = frozen;
        }

        Withdrawal withdraw(long amount) {
            if (amount <= 0) {
                throw new IllegalArgumentException("amount must be positive: " + amount);   // a bug
            }
            if (frozen) {
                return new AccountFrozen("KYC documents expired");
            }
            if (amount > balance) {
                return new InsufficientFunds(balance, amount - balance);
            }
            balance -= amount;
            return new Approved(balance);
        }
    }

    static String describe(Withdrawal w) {
        return switch (w) {                                 // exhaustive: no default needed
            case Approved(long newBalance) -> "approved, balance now " + newBalance;
            case InsufficientFunds(long balance, long shortBy) ->
                    "declined, short by " + shortBy + " (balance " + balance + ")";
            case AccountFrozen(String reason) -> "frozen: " + reason;
        };
    }

    public static void main(String[] args) {
        System.out.println(findBook("978-0134685991").map(Book::title).orElse("not in catalogue"));
        System.out.println(findBook("000-0000000000").map(Book::title).orElse("not in catalogue"));

        BankAccount open = new BankAccount(5_000, false);
        System.out.println(describe(open.withdraw(2_000)));
        System.out.println(describe(open.withdraw(4_000)));
        System.out.println(describe(new BankAccount(9_000, true).withdraw(100)));
        try {
            open.withdraw(-50);
        } catch (IllegalArgumentException e) {
            System.out.println("bug, thrown: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Effective Java
not in catalogue
approved, balance now 3000
declined, short by 1000 (balance 3000)
frozen: KYC documents expired
bug, thrown: amount must be positive: -50`,
        },
        {
          type: "paragraph",
          text: "The same method uses both tools on purpose. A frozen account and insufficient funds are normal business answers, so they're return values the caller can't ignore. A negative amount is a bug in the caller, so it's still an exception. The real payoff is what happens when someone adds a fourth outcome, or forgets one. I removed the `AccountFrozen` case from the switch:",
        },
        {
          type: "code",
          language: "java",
          title: "MissingCase.java",
          code: `public class MissingCase {
    sealed interface Withdrawal permits Approved, InsufficientFunds, AccountFrozen { }
    record Approved(long newBalance) implements Withdrawal { }
    record InsufficientFunds(long balance, long shortBy) implements Withdrawal { }
    record AccountFrozen(String reason) implements Withdrawal { }

    static String describe(Withdrawal w) {
        return switch (w) {
            case Approved a -> "approved, balance now " + a.newBalance();
            case InsufficientFunds f -> "declined, short by " + f.shortBy();
        };
    }
}`,
        },
        {
          type: "output",
          text: `MissingCase.java:8: error: the switch expression does not cover all possible input values
        return switch (w) {
               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "That's the checked-exception promise (\"the compiler won't let you forget\") delivered through the return type, and unlike a checked exception it works inside a lambda. The catch is that it only works if I don't add a `default` branch, which would silently swallow every future outcome.",
        },
        {
          type: "table",
          headers: ["Situation", "Tool", "Example"],
          rows: [
            ["A lookup that may find nothing, and that's normal", "`Optional<T>`", "`findBook(isbn)`, `findByEmail(email)`"],
            ["Several expected outcomes, each with different data", "Sealed interface of records", "`Approved` / `InsufficientFunds` / `AccountFrozen`"],
            ["Validation of user input with many possible problems", "A result holding a list of errors", "The per-row errors in the `BatchImport` example"],
            ["The caller can't sensibly continue, and some boundary will handle it", "Unchecked exception", "`OrderStoreException`, `PaymentDeclinedException` in production"],
            ["A bug in the caller", "Standard unchecked exception", "`IllegalArgumentException` for a negative amount"],
            ["\"Not found\" where the caller asked for something that must exist", "Exception", "`getById` for an id that came from a link; a 404 at the boundary"],
          ],
        },
        {
          type: "paragraph",
          text: "The last row is a judgement call I make by the method's name. `findX` returns `Optional`; `getX` promises the thing exists and throws if it doesn't. Spring Data follows the same split: `findById` returns `Optional`, `getReferenceById` assumes existence.",
        },
      ],
    },
    {
      title: "Exceptions as Control Flow",
      blocks: [
        {
          type: "paragraph",
          text: "Using a throw and catch where an `if` would do is slower and harder to read. Harder to read because a `catch` says \"something went wrong\" when nothing did. Slower because of the costs measured in Internal Working, paid on every \"no\" answer. The try, catch and finally lesson measured the classic case, testing whether a string is a number by trying to parse it: over a million strings, half of them invalid, `ParseCost` took about 300 to 700 ms when it caught `NumberFormatException` and 12 to 20 ms when it checked the characters first, roughly 20 to 40 times slower on my machine. Half a million exceptions, each with a stack trace and a message, is real work. The fix isn't to make the exception cheaper. It's to not use one for a question with a normal \"no\" answer.",
        },
        {
          type: "paragraph",
          text: "The same principle applies to other shapes: `catch (IndexOutOfBoundsException e)` to stop a loop, `catch (NoSuchElementException e)` instead of `hasNext()`, or throwing a custom exception to break out of nested loops. A labelled `break`, a `return`, or a check says what's meant. The test I use: if a caller has to catch an exception to do something ordinary, the API is wrong, and the answer belongs in the return type (`Optional`, a boolean, a result record).",
        },
      ],
    },
    {
      title: "Fail Fast with Validation",
      blocks: [
        {
          type: "paragraph",
          text: "The cheapest bug to diagnose is one that's reported where it was introduced. The Exceptions and the Exception Hierarchy lesson's `FailFast` showed the mechanics: a constructor that stored a `null` produced an NPE much later, in a trace that didn't include the code that passed the null, while `Objects.requireNonNull` in the constructor put the caller in the trace. Here I care about the practice: which checks, and where. A record's compact constructor is the natural place for a value object:",
        },
        {
          type: "code",
          language: "java",
          title: "FailFast.java",
          code: `import java.util.List;
import java.util.Objects;

public class FailFast {
    // Fail fast: the constructor refuses bad input with a clear message
    record Employee(String name, String email, int salary) {
        Employee {
            Objects.requireNonNull(name, "name must not be null");
            Objects.requireNonNull(email, "email must not be null");
            if (!email.contains("@")) {
                throw new IllegalArgumentException("email must contain @: " + email);
            }
            if (salary < 0) {
                throw new IllegalArgumentException("salary must be >= 0, was " + salary);
            }
        }
    }

    static String pick(List<String> names, int index) {
        Objects.checkIndex(index, names.size());          // Java 9: IndexOutOfBoundsException with both numbers
        return names.get(index);
    }

    public static void main(String[] args) {
        try {
            new Employee("Asha", null, 50_000);
        } catch (NullPointerException e) {
            System.out.println("early: " + e.getMessage());
        }
        try {
            new Employee("Ravi", "ravi.example.com", 50_000);
        } catch (IllegalArgumentException e) {
            System.out.println("early: " + e.getMessage());
        }
        try {
            pick(List.of("Asha", "Ravi"), 5);
        } catch (IndexOutOfBoundsException e) {
            System.out.println("early: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `early: email must not be null
early: email must contain @: ravi.example.com
early: Index 5 out of bounds for length 2`,
        },
        {
          type: "list",
          items: [
            "The record's **compact constructor** runs before the fields are assigned, so an invalid `Employee` can never exist. Every later method can rely on `email` being non-null and containing `@`.",
            "`Objects.requireNonNull(x, message)` throws an NPE with my message; `Objects.checkIndex(index, length)` (Java 9) throws `IndexOutOfBoundsException` with both numbers. They're one-liners that make the intent obvious, and the JIT inlines them (`checkIndex` is even a JIT intrinsic), so there's no reason to skip them for speed.",
            "I validate at **trust boundaries** (public constructors and methods, request handlers, message consumers) and rely on that validation inside. Re-checking the same arguments in every private helper is noise.",
          ],
        },
        {
          type: "paragraph",
          text: "`assert` is not a substitute. Assertions are disabled unless the JVM runs with `-ea`, and they're off by default in production, so an `assert email != null` checks nothing where it matters. I use `assert` only for internal invariants I want checked in tests.",
        },
      ],
    },
    {
      title: "Exceptions in Lambdas and Streams",
      blocks: [
        {
          type: "paragraph",
          text: "The functional interfaces in `java.util.function` declare no checked exceptions. `Function<T, R>.apply` is `R apply(T t)`, nothing more. So a lambda passed to `map` can't throw `IOException`, and the very common first attempt, `.map(path -> Files.readString(path))`, fails with `unreported exception IOException; must be caught or declared to be thrown`, pointing at the call inside the lambda. The try, catch and finally lesson's `LambdaChecked` shows the same error on `forEach`, and why a `try` around the call doesn't help: the exception would be thrown from inside the lambda's own method, which can't declare it. There are three patterns I actually use, and they differ in what happens to the rest of the stream:",
        },
        {
          type: "code",
          language: "java",
          title: "StreamErrors.java",
          code: `import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class StreamErrors {
    // Pattern 2: a functional interface that is allowed to throw, plus one adapter
    @FunctionalInterface
    interface ThrowingFunction<T, R> {
        R apply(T t) throws IOException;
    }

    static <T, R> Function<T, R> unchecked(ThrowingFunction<T, R> f) {
        return t -> {
            try {
                return f.apply(t);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        };
    }

    // Pattern 3: keep going, and report per item
    sealed interface Loaded permits Ok, Failed { }
    record Ok(String file, int chars) implements Loaded { }
    record Failed(String file, String error) implements Loaded { }

    static Loaded load(Path path) {
        try {
            return new Ok(path.getFileName().toString(), Files.readString(path).length());
        } catch (IOException e) {
            return new Failed(path.getFileName().toString(), e.getClass().getSimpleName());
        }
    }

    public static void main(String[] args) throws IOException {
        Path dir = Files.createTempDirectory("orders");
        Files.writeString(dir.resolve("jan.csv"), "id,total\\n1,250\\n");
        Files.writeString(dir.resolve("mar.csv"), "id,total\\n7,990\\n");
        List<Path> files = List.of(dir.resolve("jan.csv"), dir.resolve("feb.csv"), dir.resolve("mar.csv"));

        // Pattern 1: wrap inside the lambda; the stream stops at the first failure
        try {
            files.stream()
                    .map(path -> {
                        try {
                            return Files.readString(path);
                        } catch (IOException e) {
                            throw new UncheckedIOException("reading " + path.getFileName(), e);
                        }
                    })
                    .forEach(text -> System.out.println("read " + text.length() + " chars"));
        } catch (UncheckedIOException e) {
            System.out.println("1: " + e.getMessage() + ", cause " + e.getCause().getClass().getSimpleName());
        }

        // Pattern 2: same behaviour, less noise at the call site
        try {
            files.stream().map(unchecked(Files::readString)).toList();
        } catch (UncheckedIOException e) {
            System.out.println("2: cause " + e.getCause().getClass().getSimpleName());
        }

        // Pattern 3: every file gets an answer
        Map<Boolean, List<Loaded>> byOutcome = files.stream()
                .map(StreamErrors::load)
                .collect(Collectors.partitioningBy(r -> r instanceof Ok));
        System.out.println("3: ok=" + byOutcome.get(true));
        System.out.println("3: failed=" + byOutcome.get(false));
    }
}`,
        },
        {
          type: "output",
          text: `read 15 chars
1: reading feb.csv, cause NoSuchFileException
2: cause NoSuchFileException
3: ok=[Ok[file=jan.csv, chars=15], Ok[file=mar.csv, chars=15]]
3: failed=[Failed[file=feb.csv, error=NoSuchFileException]]`,
        },
        {
          type: "list",
          items: [
            "**Pattern 1** is the plain version: catch inside the lambda and rethrow as `UncheckedIOException`, which exists for exactly this (Java 8). `jan.csv` was read and printed, then `feb.csv` failed and the whole pipeline stopped; `mar.csv` was never read. Streams are lazy and process element by element, so whatever ran before the failure has already happened.",
            "**Pattern 2** moves the try/catch into a reusable adapter. The call site becomes `map(unchecked(Files::readString))`. Libraries like Vavr and jOOλ ship generic versions; for one checked type, ten lines of my own are enough.",
            "**Pattern 3** turns each failure into a value, using the sealed-result idea from earlier. Every file gets an answer, and the caller decides what a partial failure means. For a batch import, this is usually what I want.",
            "The catch for patterns 1 and 2 is outside the stream, where `UncheckedIOException` is unwrapped back to the real cause. Catching it inside the lambda and returning `null` or an empty string would be swallowing again, just in a smaller space.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Don't reach for sneaky throw here",
          text: "The throw, throws and Custom Exceptions lesson shows the generic trick that throws a checked exception without declaring it. It does make `map(path -> Files.readString(path))` style code compile through a helper, but the caller then can't even write `catch (IOException e)` around the stream without a compile error (\"exception IOException is never thrown in body of corresponding try statement\"). Wrapping is honest; sneaky throw hides the failure from the type system and from readers.",
        },
      ],
    },
    {
      title: "Exceptions in Threads and Executors",
      blocks: [
        {
          type: "paragraph",
          text: "An exception that escapes a thread's `run` kills only that thread. The Exceptions and the Exception Hierarchy lesson's `Uncaught` showed the plain-thread case: the default handler printed the trace to `System.err`, the thread became `TERMINATED`, `main` carried on with no idea the work wasn't done, and a process where only a worker failed still exits with code 0. So my practice for plain threads is short: `Thread.setDefaultUncaughtExceptionHandler` with a handler that logs through the real logger (and counts the failure) is cheap insurance in any long-running service, because stderr is often not collected at all. Executors change the picture again, and that's where \"the job failed and nobody noticed\" usually comes from.",
        },
        {
          type: "heading",
          text: "Executors: execute versus submit",
        },
        {
          type: "paragraph",
          text: "`ExecutorService` has two ways to run a task, and they treat exceptions completely differently. This is the demo I'd show anyone who uses `submit` for fire-and-forget work:",
        },
        {
          type: "code",
          language: "java",
          title: "ExecutorFailures.java",
          code: `import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class ExecutorFailures {
    static void sendInvoice(long orderId) {
        throw new IllegalStateException("no billing address for order " + orderId);
    }

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(1);

        // execute(): the exception reaches the worker thread's uncaught handler
        pool.execute(() -> sendInvoice(1));
        Thread.sleep(200);

        // submit(): the exception is stored in the Future. Nothing is printed.
        Future<?> future = pool.submit(() -> sendInvoice(2));
        Thread.sleep(200);
        System.err.println("after submit: done=" + future.isDone() + ", nothing printed");
        try {
            future.get();
        } catch (ExecutionException e) {
            System.err.println("get() threw " + e);
            System.err.println("  cause: " + e.getCause());
        }
        System.err.println("state()=" + future.state() + ", exceptionNow()=" + future.exceptionNow());
        pool.shutdown();

        // A periodic task that throws once is never run again, silently
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicInteger runs = new AtomicInteger();
        ScheduledFuture<?> sync = scheduler.scheduleAtFixedRate(() -> {
            int run = runs.incrementAndGet();
            System.err.println("sync run " + run);
            if (run == 3) {
                throw new IllegalStateException("stock feed returned HTTP 500");
            }
        }, 0, 50, TimeUnit.MILLISECONDS);
        Thread.sleep(500);
        System.err.println("after 500 ms: runs=" + runs.get() + ", done=" + sync.isDone());
        try {
            sync.get();
        } catch (ExecutionException e) {
            System.err.println("the schedule ended with: " + e.getCause().getMessage());
        }
        scheduler.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "pool-1-thread-1" java.lang.IllegalStateException: no billing address for order 1
	at ExecutorFailures.sendInvoice(ExecutorFailures.java:12)
	at ExecutorFailures.lambda$main$0(ExecutorFailures.java:19)
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1144)
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:642)
	at java.base/java.lang.Thread.run(Thread.java:1583)
after submit: done=true, nothing printed
get() threw java.util.concurrent.ExecutionException: java.lang.IllegalStateException: no billing address for order 2
  cause: java.lang.IllegalStateException: no billing address for order 2
state()=FAILED, exceptionNow()=java.lang.IllegalStateException: no billing address for order 2
sync run 1
sync run 2
sync run 3
after 500 ms: runs=3, done=true
the schedule ended with: stock feed returned HTTP 500`,
        },
        {
          type: "list",
          items: [
            "**`execute`** runs the `Runnable` directly on the worker, so the exception escapes and reaches the thread's uncaught handler: the default message appears. The worker thread dies with it, and `ThreadPoolExecutor` starts a replacement worker for later tasks.",
            "**`submit`** wraps the task in a `FutureTask`, which catches **everything** the task throws and stores it in the future. Nothing is printed, nothing is logged, and the task looks finished (`done=true`). The exception only comes out when someone calls `get()`, wrapped in an `ExecutionException` whose cause is the original.",
            "If nobody ever calls `get()` on that future, the failure is gone for good. A `submit` whose future is thrown away is the most common way background work fails silently.",
            "`state()` and `exceptionNow()` (Java 19) read a finished future without the wrapper and without a checked exception. `exceptionNow()` throws `IllegalStateException` if the task didn't fail, so it's for code that already checked `state()`.",
            "**`scheduleAtFixedRate`** is the nastiest: its Javadoc says that if any execution throws, subsequent executions are suppressed. The sync ran three times, failed once, and then simply stopped. No message, `isDone()` is `true`, and the only place the exception lives is the `ScheduledFuture`.",
          ],
        },
        {
          type: "paragraph",
          text: "What I do about it: for fire-and-forget work I use `execute`, or I wrap the task body in a try/catch that logs (this is a boundary, so logging here is right). For periodic tasks I always catch inside the task, so one bad run doesn't cancel the schedule. And for work whose result matters, I keep the `Future` and call `get` with a timeout, or use `CompletableFuture` with a handler at the end.",
        },
      ],
    },
    {
      title: "CompletableFuture Errors",
      blocks: [
        {
          type: "paragraph",
          text: "The Java 8 track's CompletableFuture lesson covers the API. The error-handling part comes down to four methods and one wrapper. An exception thrown inside any stage's function is stored in that stage wrapped in a `CompletionException`, every dependent stage is skipped and completes with the same failure, and the handlers at the end see it:",
        },
        {
          type: "code",
          language: "java",
          title: "FutureErrors.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;

public class FutureErrors {
    static int stockFor(String sku) {
        if (sku.startsWith("X")) {
            throw new IllegalArgumentException("unknown sku " + sku);
        }
        return 12;
    }

    // Peel off the wrappers the async APIs add
    static Throwable unwrap(Throwable e) {
        while ((e instanceof CompletionException || e instanceof ExecutionException) && e.getCause() != null) {
            e = e.getCause();
        }
        return e;
    }

    public static void main(String[] args) throws InterruptedException {
        // 1. The failure skips thenApply; join() and get() wrap it differently
        CompletableFuture<String> label = CompletableFuture
                .supplyAsync(() -> stockFor("X-9"))
                .thenApply(qty -> qty + " in stock");
        try {
            label.join();
        } catch (CompletionException e) {
            System.out.println("join(): " + e.getClass().getSimpleName() + " -> " + e.getCause());
        }
        try {
            label.get();
        } catch (ExecutionException e) {
            System.out.println("get():  " + e.getClass().getSimpleName() + " -> " + e.getCause());
        }

        // 2. exceptionally: recover with a fallback value; it sees the wrapper
        String withFallback = label
                .exceptionally(e -> {
                    System.out.println("exceptionally got " + e.getClass().getSimpleName()
                            + ", unwrapped " + unwrap(e).getClass().getSimpleName());
                    return "stock unknown";
                })
                .join();
        System.out.println("fallback: " + withFallback);

        // 3. handle: gets the result or the exception, returns a new value either way
        String handled = CompletableFuture
                .supplyAsync(() -> stockFor("X-4"))
                .handle((qty, e) -> e == null ? qty + " in stock" : "error: " + unwrap(e).getMessage())
                .join();
        System.out.println("handle:   " + handled);

        // 4. whenComplete: observes (log, metrics) but the stage stays failed
        CompletableFuture<Integer> observed = CompletableFuture
                .supplyAsync(() -> stockFor("X-1"))
                .whenComplete((qty, e) -> System.out.println("whenComplete saw: " + unwrap(e)));
        try {
            observed.join();
        } catch (CompletionException e) {
            System.out.println("after whenComplete, join() still threw: " + unwrap(e).getMessage());
        }

        // 5. completed exceptionally from outside: stored as is, wrapped for dependents
        CompletableFuture<Integer> feed = CompletableFuture.failedFuture(new IllegalStateException("feed down"));
        feed.exceptionally(e -> {
            System.out.println("same stage sees " + e.getClass().getSimpleName());
            return 0;
        }).join();
        feed.thenApply(qty -> qty * 2).exceptionally(e -> {
            System.out.println("dependent stage sees " + e.getClass().getSimpleName());
            return 0;
        }).join();
    }
}`,
        },
        {
          type: "output",
          text: `join(): CompletionException -> java.lang.IllegalArgumentException: unknown sku X-9
get():  ExecutionException -> java.lang.IllegalArgumentException: unknown sku X-9
exceptionally got CompletionException, unwrapped IllegalArgumentException
fallback: stock unknown
handle:   error: unknown sku X-4
whenComplete saw: java.lang.IllegalArgumentException: unknown sku X-1
after whenComplete, join() still threw: unknown sku X-1
same stage sees IllegalStateException
dependent stage sees CompletionException`,
        },
        {
          type: "table",
          headers: ["Method", "Runs on", "Can change the outcome?", "Typical use"],
          rows: [
            ["`exceptionally(fn)`", "Failure only", "Yes: returns a replacement value", "A fallback value"],
            ["`handle((value, ex) -> ...)`", "Success and failure", "Yes: maps either into a new value", "Turning the outcome into a response at the end of a pipeline"],
            ["`whenComplete((value, ex) -> ...)`", "Success and failure", "No: the result passes through unchanged", "Logging, metrics, cleanup"],
            ["`exceptionallyCompose(fn)` (Java 12)", "Failure only", "Yes: returns another future", "Fallback that is itself async, like a second service"],
          ],
        },
        {
          type: "list",
          items: [
            "`join()` throws the unchecked `CompletionException`; `get()` throws the checked `ExecutionException` (and `InterruptedException`). Both carry the original as the cause.",
            "Handlers usually see the **wrapper**, not my exception: `exceptionally` got `CompletionException`. A check like `e instanceof IllegalArgumentException` inside a handler silently never matches. The small `unwrap` helper is something I'd put in any codebase that uses `CompletableFuture`.",
            "Section 5 shows the one exception to wrapping. A future completed from outside with `completeExceptionally` or `failedFuture` stores the exception as is, so a handler on that same stage sees `IllegalStateException`. Any dependent stage sees it wrapped. An exception thrown by the `supplyAsync` supplier, on the other hand, is wrapped already in that first stage, which is why `handle` in section 3 needed `unwrap`.",
            "`whenComplete` saw the failure but didn't recover from it; `join()` still threw. That's the right tool for logging at the end, because it can't accidentally turn a failure into a success.",
            "A `CompletableFuture` that fails and is never joined or handled behaves like `submit`: the exception sits in the object and nobody sees it. Every async pipeline needs a terminal `handle`, `exceptionally` or `join`.",
          ],
        },
      ],
    },
    {
      title: "Handling InterruptedException",
      blocks: [
        {
          type: "paragraph",
          text: "`InterruptedException` is not an error. It's how one thread asks another to stop what it's doing: `thread.interrupt()` sets a flag, and blocking methods like `sleep`, `wait`, `join` and `BlockingQueue.take` notice it, **clear the flag**, and throw. Executors use it too: `shutdownNow()` and `Future.cancel(true)` interrupt the workers. That clearing is the trap. If I catch the exception and carry on, the request to stop is gone:",
        },
        {
          type: "code",
          language: "java",
          title: "Interrupts.java",
          code: `public class Interrupts {
    // Swallows the interrupt: the flag was cleared when sleep threw, and nobody sets it again
    static void pauseSwallowing(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            // ignore
        }
    }

    // Restores the interrupt: the caller's loop can still see it
    static void pauseRestoring(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    static Thread worker(String name, boolean restore) {
        return new Thread(() -> {
            int batches = 0;
            while (!Thread.currentThread().isInterrupted() && batches < 20) {
                batches++;                                  // "process a batch of emails"
                if (restore) {
                    pauseRestoring(50);
                } else {
                    pauseSwallowing(50);
                }
            }
            System.out.println(name + " stopped after " + batches + " batches");
        }, name);
    }

    public static void main(String[] args) throws InterruptedException {
        for (boolean restore : new boolean[] {false, true}) {
            Thread t = worker(restore ? "restoring" : "swallowing", restore);
            t.start();
            Thread.sleep(120);
            t.interrupt();                                  // "shut down, please"
            t.join();
        }
    }
}`,
        },
        {
          type: "output",
          text: `swallowing stopped after 20 batches
restoring stopped after 3 batches`,
        },
        {
          type: "list",
          items: [
            "Both workers were interrupted after about 120 ms. The swallowing one ignored it and ran all 20 batches, about a second; with no upper bound it would never have stopped, and an executor's `shutdownNow()` followed by `awaitTermination` would time out with the task still running.",
            "The restoring one stopped after 3 batches (the exact number depends on timing): `sleep` threw and cleared the flag, the catch set it again with `Thread.currentThread().interrupt()`, and the loop condition saw it.",
            "The rules, in order of preference: let `InterruptedException` propagate (declare `throws InterruptedException`); if the method can't declare it (inside `Runnable.run`, or an interface I don't own), restore the flag and return; never catch it and continue as normal.",
            "Wrapping it in a `RuntimeException` without restoring the flag is also swallowing. And `catch (Exception e)` around a `sleep` or `take` catches `InterruptedException` too, which is one more reason to catch narrowly.",
          ],
        },
      ],
    },
    {
      title: "Retries and Idempotency",
      blocks: [
        {
          type: "paragraph",
          text: "Some failures go away on their own: a timeout, a dropped connection, a 503 from an overloaded service, a database deadlock victim, an optimistic-lock conflict. Retrying those is reasonable recovery. Others never go away: a validation error, a 404, a permission denied, a bug. Retrying those just repeats the failure, slower. And retrying anything is only safe if doing the operation twice has the same effect as doing it once. That property is **idempotency**.",
        },
        {
          type: "table",
          headers: ["Usually retryable", "Not retryable"],
          rows: [
            ["`SocketTimeoutException`, connect timeouts", "`IllegalArgumentException`, validation failures"],
            ["HTTP 503, 502, 504, and 429 (after `Retry-After`)", "HTTP 400, 401, 403, 404, 409, 422"],
            ["Deadlock victim, lock timeout, optimistic-lock conflict (re-read, then retry)", "Constraint violations such as a duplicate key"],
            ["Connection reset before the request was sent", "`NullPointerException` and any other bug"],
            ["Broker or leader temporarily unavailable", "Authentication failure, expired card, insufficient funds"],
          ],
        },
        {
          type: "paragraph",
          text: "Here's a small retry helper with a retryability check, exponential backoff and jitter, and the bug it can cause on a non-idempotent operation. The bank account's `deposit` does its work and then the response is lost, which a timeout can't tell apart from the work never happening:",
        },
        {
          type: "code",
          language: "java",
          title: "RetryDemo.java",
          code: `import java.net.SocketTimeoutException;
import java.io.UncheckedIOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class RetryDemo {
    // Only failures that might go away on their own are worth another try
    static final Predicate<Throwable> RETRYABLE =
            e -> e instanceof UncheckedIOException u && u.getCause() instanceof SocketTimeoutException;

    static <T> T retry(String what, Supplier<T> call, int maxAttempts, long baseDelayMs) throws InterruptedException {
        for (int attempt = 1; ; attempt++) {
            try {
                return call.get();
            } catch (RuntimeException e) {
                if (!RETRYABLE.test(e) || attempt == maxAttempts) {
                    System.out.println("  " + what + ": giving up after attempt " + attempt + ": " + e.getMessage());
                    throw e;
                }
                long backoff = baseDelayMs << (attempt - 1);                       // 10, 20, 40 ...
                long jitter = ThreadLocalRandom.current().nextLong(backoff / 2 + 1);
                System.out.println("  " + what + ": attempt " + attempt + " timed out, retrying");
                Thread.sleep(backoff + jitter);
            }
        }
    }

    static UncheckedIOException timeout() {
        return new UncheckedIOException("read timed out", new SocketTimeoutException("read timed out"));
    }

    // A bank account service whose response sometimes gets lost after the work is done
    static class AccountService {
        long balance = 1_000;
        int callsUntilHealthy = 1;
        final Map<String, Long> processed = new HashMap<>();   // idempotency key -> resulting balance

        long deposit(long amount) {
            balance += amount;                                  // the work happens...
            if (callsUntilHealthy-- > 0) {
                throw timeout();                                // ...but the caller never hears back
            }
            return balance;
        }

        long deposit(String idempotencyKey, long amount) {
            Long earlier = processed.get(idempotencyKey);
            if (earlier != null) {
                return earlier;                                 // seen this request: same answer, no new work
            }
            balance += amount;
            processed.put(idempotencyKey, balance);
            if (callsUntilHealthy-- > 0) {
                throw timeout();
            }
            return balance;
        }
    }

    public static void main(String[] args) throws InterruptedException {
        int[] stockCalls = {0};
        System.out.println("stock = " + retry("stock", () -> {
            if (++stockCalls[0] < 3) {
                throw timeout();
            }
            return 42;
        }, 4, 10));

        try {
            retry("validate", () -> {
                throw new IllegalArgumentException("quantity must be positive: -2");
            }, 4, 10);
        } catch (IllegalArgumentException e) {
            System.out.println("validate failed fast");
        }

        AccountService naive = new AccountService();
        retry("deposit", () -> naive.deposit(500), 3, 10);
        System.out.println("naive retry: balance " + naive.balance + " (expected 1500)");

        AccountService safe = new AccountService();
        retry("deposit", () -> safe.deposit("dep-7f3a", 500), 3, 10);
        System.out.println("with idempotency key: balance " + safe.balance);
    }
}`,
        },
        {
          type: "output",
          text: `  stock: attempt 1 timed out, retrying
  stock: attempt 2 timed out, retrying
stock = 42
  validate: giving up after attempt 1: quantity must be positive: -2
validate failed fast
  deposit: attempt 1 timed out, retrying
naive retry: balance 2000 (expected 1500)
  deposit: attempt 1 timed out, retrying
with idempotency key: balance 1500`,
        },
        {
          type: "list",
          items: [
            "The stock call timed out twice and succeeded on the third attempt. The backoff doubled each time, with random jitter so that many clients failing together don't all retry at the same instant.",
            "The validation error was **not retried**. The predicate decides retryability by type, and an `IllegalArgumentException` won't fix itself.",
            "The naive deposit **doubled the money**. The first call did the work and then timed out; the retry did it again. From the caller's side, a timeout means \"unknown\", not \"failed\".",
            "With an **idempotency key**, the service remembered the first request and answered the retry with the stored result. Payment APIs accept an `Idempotency-Key` header for exactly this. A real store keeps keys in the database, written in the same transaction as the work.",
            "`retry` declares `throws InterruptedException` because it sleeps, so an interrupt during backoff stops the retries instead of being swallowed.",
          ],
        },
        {
          type: "paragraph",
          text: "In a real service I'd use a library (Resilience4j, or Spring Retry's `@Retryable`) rather than this loop, but the decisions are the same ones the code makes visible: which exceptions, how many attempts, what delay, and whether the operation is idempotent. I also retry at **one** layer only. If the HTTP client, the service and the caller each make three attempts, one bad call becomes 27 requests.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `handle(13)` from `OrderLookup` through compile time and run time, using the exception tables `javap -c -p OrderLookup` printed:",
        },
        {
          type: "output",
          text: `  static java.lang.String status(long);
    ...
    Exception table:
       from    to  target type
           0     5     8   Class java/io/IOException

  static java.lang.String handle(long);
    ...
    Exception table:
       from    to  target type
           0     9    10   Class OrderLookup$OrderNotFoundException
           0     9    21   Class OrderLookup$OrderStoreException`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time.** `readRow` declares `throws IOException`. `javac` checks that `status` either catches it or declares it; the `catch (IOException e)` satisfies the rule. Without it, the error would be `unreported exception IOException; must be caught or declared to be thrown`.",
            "`OrderStoreException` and `OrderNotFoundException` extend `RuntimeException`, so `status` and `handle` need no `throws` clause. The translation is what keeps every caller of `status` free of storage details.",
            "`javac` writes one exception-table row for `status` (bytecode 0 to 5, the call to `readRow`, goes to handler 8 for `IOException`) and two for `handle`, one per `catch`, in source order.",
            "**Run time.** `main` calls `handle(13)`, which calls `status(13)`, which calls `readRow(13)`. Four frames on the main thread's stack.",
            "`readRow` executes `new IOException(...)`. The `Throwable` constructor calls `fillInStackTrace`, which records the four frames: `readRow`, `status`, `handle`, `main`.",
            "`athrow` in `readRow`: no exception table there, so the frame is popped. In `status`, the current bytecode index (the `invokestatic` at 1) is inside rows 0 to 5 and `IOException` matches, so execution jumps to 8 and the exception is stored in a local.",
            "The handler builds the message with `invokedynamic` (string concatenation) and runs `new OrderStoreException(message, e)`. Its constructor stores `e` as the cause and captures a **new** stack trace: `status`, `handle`, `main`.",
            "`athrow` at 23. The only row in `status` covers 0 to 5, so there's no match here, and the frame is popped.",
            "In `handle`, the JVM checks rows in order. `OrderNotFoundException` doesn't match the thrown type; `OrderStoreException` does, so control goes to 21.",
            "The handler calls `printStackTrace`, which prints the outer exception, then `Caused by:` and the cause's frames, replacing the two frames both traces share with `... 2 more`.",
            "`handle` returns `\"503 try again later\"` normally. As far as `main` is concerned, nothing was thrown at all: the boundary turned the failure into a value.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "Most of this lesson is about choices, not syntax, but these are the forms the practices use, in one program: a guard, `Optional`, a domain exception with data, the bridge from one to the other, multi-catch at a boundary, and `handle` at the end of an async pipeline. Translation with a cause and restoring the interrupt flag have their own programs above (`OrderLookup`, `Interrupts`).",
        },
        {
          type: "code",
          language: "java",
          title: "PracticesTour.java",
          code: `import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public class PracticesTour {
    // An unchecked domain exception that carries data
    static class ProductNotFoundException extends RuntimeException {
        final String sku;

        ProductNotFoundException(String sku) {
            super("no product with sku " + sku);
            this.sku = sku;
        }
    }

    static final Map<String, Integer> PRICES = Map.of("PEN-1", 40, "BOOK-7", 450);

    // Fail fast on bad arguments
    static int total(String sku, int quantity) {
        Objects.requireNonNull(sku, "sku must not be null");
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be > 0, was " + quantity);
        }
        return price(sku).orElseThrow(() -> new ProductNotFoundException(sku)) * quantity;
    }

    // "Not found" is a normal answer: Optional
    static Optional<Integer> price(String sku) {
        return Optional.ofNullable(PRICES.get(sku));
    }

    public static void main(String[] args) {
        System.out.println(total("BOOK-7", 2));

        // Multi-catch at a boundary: several failures, one response
        for (int quantity : new int[] {1, -1}) {
            try {
                total(quantity > 0 ? "GLUE-3" : "PEN-1", quantity);
            } catch (ProductNotFoundException | IllegalArgumentException e) {
                System.out.println("400 " + e.getMessage());
            }
        }

        // Async: handle turns a failure into a value at the end of the pipeline
        String async = CompletableFuture.supplyAsync(() -> total("BOOK-7", 0))
                .handle((sum, e) -> e == null ? "total " + sum : "failed: " + e.getCause().getMessage())
                .join();
        System.out.println(async);
    }
}`,
        },
        {
          type: "output",
          text: `900
400 no product with sku GLUE-3
400 quantity must be > 0, was -1
failed: quantity must be > 0, was 0`,
        },
        {
          type: "paragraph",
          text: "In `handle`, `e.getCause()` is needed because the exception thrown inside `supplyAsync` arrives wrapped in a `CompletionException`, as the CompletableFuture section showed. And `orElseThrow(() -> new ProductNotFoundException(sku))` is the bridge between the two worlds: `price` says \"maybe absent\", and `total`, which requires a price, turns absence into an exception.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A batch that reports every bad row",
        },
        {
          type: "paragraph",
          text: "A batch import is a boundary for each row. One bad row shouldn't stop the other four, and every rejection should say which line and why:",
        },
        {
          type: "code",
          language: "java",
          title: "BatchImport.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class BatchImport {
    record Employee(String id, String name, int salary) {
        Employee {
            if (salary < 0) {
                throw new IllegalArgumentException("salary must be >= 0, was " + salary);
            }
        }
    }

    record RowError(int line, String input, String problem) { }

    static Employee parse(String row) {
        String[] cols = row.split(",");
        if (cols.length != 3) {
            throw new IllegalArgumentException("expected 3 columns, found " + cols.length);
        }
        return new Employee(cols[0].trim(), cols[1].trim(), Integer.parseInt(cols[2].trim()));
    }

    public static void main(String[] args) {
        List<String> rows = List.of(
                "E1, Asha, 72000",
                "E2, Ravi",
                "E3, Meera, 6.5e4",
                "E4, Kabir, -10",
                "E5, Nisha, 81000");

        List<Employee> imported = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            try {
                imported.add(parse(rows.get(i)));
            } catch (IllegalArgumentException e) {     // NumberFormatException is a subclass
                errors.add(new RowError(i + 1, rows.get(i), e.getMessage()));
            }
        }

        System.out.println("imported " + imported.size() + " of " + rows.size());
        imported.forEach(emp -> System.out.println("  " + emp));
        System.out.println("rejected " + errors.size());
        errors.forEach(err -> System.out.println("  line " + err.line() + " \\"" + err.input() + "\\": " + err.problem()));
    }
}`,
        },
        {
          type: "output",
          text: `imported 2 of 5
  Employee[id=E1, name=Asha, salary=72000]
  Employee[id=E5, name=Nisha, salary=81000]
rejected 3
  line 2 "E2, Ravi": expected 3 columns, found 2
  line 3 "E3, Meera, 6.5e4": For input string: "6.5e4"
  line 4 "E4, Kabir, -10": salary must be >= 0, was -10`,
        },
        {
          type: "paragraph",
          text: "Three different failures, from three different places (my column check, `Integer.parseInt`, and the record's constructor), all caught by one `catch (IllegalArgumentException e)` because `NumberFormatException` extends it. That's a reasonable catch here because the loop body is small and every `IllegalArgumentException` in it really is a bad row. A bug like a `NullPointerException` would still propagate and stop the job, which is what I want.",
        },
        {
          type: "heading",
          text: "Recovering with a fallback, without losing the reasons",
        },
        {
          type: "paragraph",
          text: "Recovery is the best reason to catch, as long as the failure is still recorded. Here a notification falls back from email to SMS, and when every channel fails, the final exception carries each channel's reason as a suppressed exception:",
        },
        {
          type: "code",
          language: "java",
          title: "NotifierFallback.java",
          code: `import java.util.List;

public class NotifierFallback {
    interface Notifier {
        void send(String to, String message);
    }

    static class NotificationException extends RuntimeException {
        NotificationException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static class EmailNotifier implements Notifier {
        public void send(String to, String message) {
            throw new IllegalStateException("SMTP server refused connection");
        }
    }

    static class SmsNotifier implements Notifier {
        public void send(String to, String message) {
            System.out.println("SMS to " + to + ": " + message);
        }
    }

    // Recovery is possible here: there is a second channel
    static void notifyCustomer(List<Notifier> channels, String to, String message) {
        NotificationException failure = null;
        for (Notifier channel : channels) {
            try {
                channel.send(to, message);
                if (failure != null) {
                    System.out.println("(recovered after: " + failure.getSuppressed()[0].getMessage() + ")");
                }
                return;
            } catch (RuntimeException e) {
                if (failure == null) {
                    failure = new NotificationException("all channels failed for " + to, null);
                }
                failure.addSuppressed(e);                 // keep every channel's reason
            }
        }
        throw failure;
    }

    public static void main(String[] args) {
        notifyCustomer(List.of(new EmailNotifier(), new SmsNotifier()), "Asha", "Order ORD-77 shipped");
        try {
            notifyCustomer(List.of(new EmailNotifier()), "Ravi", "Order ORD-78 shipped");
        } catch (NotificationException e) {
            System.out.println(e.getMessage() + ", reasons: " + e.getSuppressed().length);
            for (Throwable reason : e.getSuppressed()) {
                System.out.println("  " + reason);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `SMS to Asha: Order ORD-77 shipped
(recovered after: SMTP server refused connection)
all channels failed for Ravi, reasons: 1
  java.lang.IllegalStateException: SMTP server refused connection`,
        },
        {
          type: "list",
          items: [
            "For Asha, the email failure was recovered from (the SMS went out) and still reported. In a real service that line is a WARN log or a metric, because a mail server refusing every connection is something someone needs to know about, even while the fallback hides it from customers.",
            "For Ravi there was no fallback, so the method threw one `NotificationException` holding every channel's failure. There's no single cause here, just independent failures in sibling attempts, which is exactly the situation the `addSuppressed` Javadoc describes, and the same mechanism try-with-resources uses.",
            "The catch is `RuntimeException`, not `Exception`, and it's acceptable only because this loop is a recovery boundary for each channel. A bug inside one notifier would be recorded as that channel's reason rather than lost.",
          ],
        },
        {
          type: "heading",
          text: "A deadline on a slow task",
        },
        {
          type: "paragraph",
          text: "`Future.get` with a timeout throws `TimeoutException`, which is a decision point, not a failure to log: give up, return something partial, or wait longer. What I must not do is give up and leave the task running. `cancel(true)` interrupts the worker, and because `buildReport` lets `InterruptedException` propagate, the worker really stops:",
        },
        {
          type: "code",
          language: "java",
          title: "TimeoutTask.java",
          code: `import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class TimeoutTask {
    // A slow report that checks for interruption between pages
    static String buildReport(int pages) throws InterruptedException {
        for (int page = 1; page <= pages; page++) {
            Thread.sleep(100);                       // throws InterruptedException if cancelled
        }
        return pages + "-page sales report";
    }

    static String reportWithin(ExecutorService pool, int pages, long timeoutMs) throws InterruptedException {
        Future<String> future = pool.submit(() -> buildReport(pages));
        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);                     // interrupt the worker; don't leave it running
            return "report not ready after " + timeoutMs + " ms, cancelled=" + future.isCancelled();
        } catch (ExecutionException e) {
            throw new IllegalStateException("report failed", e.getCause());
        }
    }

    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        System.out.println(reportWithin(pool, 2, 1_000));
        System.out.println(reportWithin(pool, 30, 300));
        pool.shutdown();
        System.out.println("pool terminated: " + pool.awaitTermination(1, TimeUnit.SECONDS));
    }
}`,
        },
        {
          type: "output",
          text: `2-page sales report
report not ready after 300 ms, cancelled=true
pool terminated: true`,
        },
        {
          type: "list",
          items: [
            "The 30-page report would have taken 3 seconds. After 300 ms, `get` threw `TimeoutException`, the catch cancelled the task, and `pool terminated: true` shows the worker had actually stopped. If `buildReport` had swallowed the interrupt, `awaitTermination` would have returned `false` after waiting its full second.",
            "`submit(() -> buildReport(pages))` compiles even though `buildReport` throws a checked exception, because the lambda is a `Callable`, whose `call()` declares `throws Exception`. A `Runnable` lambda wouldn't compile.",
            "`ExecutionException` is unwrapped and translated with the real cause. `reportWithin` itself declares `throws InterruptedException`, because `get` can be interrupted too and the caller should know.",
          ],
        },
        {
          type: "heading",
          text: "Degrading gracefully in an async pipeline",
        },
        {
          type: "paragraph",
          text: "A price quote needs a shipping cost and a discount from two slow services. If shipping is slow, I'd rather use a flat rate than make the customer wait; if the discount service is down, no discount is better than no quote. Both are recovery, and both are visible:",
        },
        {
          type: "code",
          language: "java",
          title: "AsyncQuote.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class AsyncQuote {
    static long shippingCost(String city) {
        sleep(city.equals("Leh") ? 2_000 : 50);      // one slow upstream call
        return 4_900;
    }

    static long discount(String customer) {
        throw new IllegalStateException("loyalty service returned 503");
    }

    static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    static String quote(String customer, String city) {
        CompletableFuture<Long> shipping = CompletableFuture
                .supplyAsync(() -> shippingCost(city))
                .completeOnTimeout(9_900L, 300, TimeUnit.MILLISECONDS);   // flat rate if slow

        CompletableFuture<Long> off = CompletableFuture
                .supplyAsync(() -> discount(customer))
                .exceptionally(e -> {                                    // degrade, but say so
                    System.out.println("  discount skipped: " + e.getCause().getMessage());
                    return 0L;
                });

        return shipping.thenCombine(off, (ship, disc) -> "shipping " + ship + ", discount " + disc).join();
    }

    public static void main(String[] args) {
        System.out.println("Pune: " + quote("Asha", "Pune"));
        System.out.println("Leh:  " + quote("Ravi", "Leh"));

        CompletableFuture<Long> strict = CompletableFuture
                .supplyAsync(() -> shippingCost("Leh"))
                .orTimeout(300, TimeUnit.MILLISECONDS);
        try {
            strict.join();
        } catch (RuntimeException e) {
            System.out.println("orTimeout: " + e.getClass().getSimpleName() + " -> " + e.getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `  discount skipped: loyalty service returned 503
Pune: shipping 4900, discount 0
  discount skipped: loyalty service returned 503
Leh:  shipping 9900, discount 0
orTimeout: CompletionException -> java.util.concurrent.TimeoutException`,
        },
        {
          type: "diagram",
          text: `quote("Ravi", "Leh")

 supplyAsync(shippingCost) ── 2 s ──► completeOnTimeout(9900, 300ms)
                                        │ at 300 ms: completes
                                        │ with the flat rate 9900
                                        ▼
                                   thenCombine ──► "shipping 9900,
                                        ▲           discount 0"
                                        │
 supplyAsync(discount) ── throws ──► exceptionally(e -> 0)
                                     prints "discount skipped"`,
          caption: "Two independent fallbacks feeding one result. Neither failure reaches the caller, and both are reported.",
        },
        {
          type: "list",
          items: [
            "`completeOnTimeout` (Java 9) completes the future with a default value if it isn't done in time; `orTimeout` completes it exceptionally with a `TimeoutException`, which `join()` shows wrapped in a `CompletionException`.",
            "Neither of them cancels the slow `shippingCost` call. It keeps running in the common pool until its sleep ends; only the future stops waiting. Real cancellation needs the upstream client's own timeout.",
            "`exceptionally` here is recovery, not swallowing, because it prints (in real code, logs at WARN and counts) the reason. A bare `exceptionally(e -> 0L)` would hide a broken loyalty service indefinitely.",
          ],
        },
      ],
    },
    {
      title: "When to Throw, Catch or Return: My Failure-Path Checklist",
      blocks: [
        {
          type: "paragraph",
          text: "This is the checklist I run through for any failure path, whether I'm writing the code or reviewing it. It's the same thinking as the capstone When to Use What in Java OOP lesson, applied to failures instead of types: pick the simplest tool that makes the failure impossible to ignore and easy to act on.",
        },
        {
          type: "diagram",
          text: `A failure is possible at this line.
│
├─ Is it a bug (bad argument, broken invariant, null)?
│   └─ yes ─► throw IllegalArgumentException / IllegalStateException /
│             requireNonNull at the entry point. Don't catch it.
│
├─ Is it a normal outcome the caller must look at right away?
│   ├─ one "absent" case ───────► return Optional<T>
│   └─ several outcomes ────────► return a sealed result type
│
└─ Otherwise it's an exception. At THIS line, can I:
    ├─ recover (fallback, default, retry a transient error)?
    │   └─ catch it, recover, log at WARN if it matters
    ├─ add context only this level knows?
    │   └─ catch, rethrow with message + cause. No log.
    ├─ translate to my layer's own exception?
    │   └─ catch, throw MyLayerException(msg, cause). No log.
    ├─ am I at a boundary (handler, task, main, consumer)?
    │   └─ catch broadly, log ONCE with the trace, map it
    └─ none of these?
        └─ don't catch. Let it propagate.`,
          caption: "Read top to bottom; stop at the first branch that fits.",
        },
        {
          type: "table",
          headers: ["Question", "If yes", "If no"],
          rows: [
            ["Is the exception type as narrow as possible?", "Good", "Catch the specific type; `catch (Exception e)` only at a boundary"],
            ["Does the rethrown exception keep the cause?", "Good", "Add it: `new X(message, e)`"],
            ["Is this failure logged exactly once?", "Good", "Remove log-and-rethrow; log where it's handled"],
            ["Does the message have ids and values, and no secrets?", "Good", "Rewrite it; mask what's sensitive"],
            ["Does it run on another thread?", "Make sure a `get`, `join`, handler or `UncaughtExceptionHandler` sees it", "Nothing extra"],
            ["Is it `InterruptedException`?", "Propagate, or restore the flag", "Nothing extra"],
            ["Will anything retry it?", "Only if it's transient and the operation is idempotent, at one layer", "Nothing extra"],
            ["Is it on a hot path, thrown often?", "Replace it with a check or a return value", "An exception is fine"],
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice",
        },
        {
          type: "paragraph",
          text: "Order history for a customer page. The wrong version catches the storage failure in the repository layer and returns an empty list, which feels \"safe\" because nothing crashes. The right one translates and lets the boundary decide:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderHistory.java",
          code: `import java.io.IOException;
import java.util.List;

public class OrderHistory {
    static class StoreUnavailableException extends RuntimeException {
        StoreUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static List<String> queryOrders(String customerId) throws IOException {
        throw new IOException("connection pool exhausted (10/10 in use)");
    }

    // Wrong: the failure becomes a believable but false answer
    static List<String> ordersWrong(String customerId) {
        try {
            return queryOrders(customerId);
        } catch (IOException e) {
            return List.of();
        }
    }

    // Right: the failure stays a failure, with context, and the boundary decides
    static List<String> ordersRight(String customerId) {
        try {
            return queryOrders(customerId);
        } catch (IOException e) {
            throw new StoreUnavailableException("order history for " + customerId, e);
        }
    }

    static String page(List<String> orders) {
        return orders.isEmpty() ? "You have no orders yet." : orders.size() + " orders";
    }

    public static void main(String[] args) {
        System.out.println("wrong: " + page(ordersWrong("C-1001")));
        try {
            System.out.println("right: " + page(ordersRight("C-1001")));
        } catch (StoreUnavailableException e) {
            System.out.println("right: Order history is unavailable right now. Please retry.");
            System.out.println("  log: " + e.getMessage() + " <- " + e.getCause().getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `wrong: You have no orders yet.
right: Order history is unavailable right now. Please retry.
  log: order history for C-1001 <- connection pool exhausted (10/10 in use)`,
        },
        {
          type: "list",
          items: [
            "**Wrong:** the customer was told they have no orders. That's a false statement shown as fact, and it might make them place a duplicate order. No log line exists, so the exhausted connection pool goes unnoticed until someone complains.",
            "**Right:** the page says the truth (\"unavailable, retry\"), and the log has the context and the root cause. The repository didn't decide how the failure looks to a customer; the boundary did.",
            "The general rule: an empty collection, `0`, `false` or `null` returned on failure is a lie the caller can't detect. If emptiness is a valid answer, a failure must not look like it.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Losing the cause when wrapping",
        },
        {
          type: "paragraph",
          text: "`throw new ReportException(\"could not render invoice\")` inside `catch (IOException e)` leaves a trace that says what failed and never why. The throw, throws and Custom Exceptions lesson's `ChainDemo` shows the two traces side by side, one ending at the wrapper and one with `Caused by:` down to the real reason. A custom exception should always offer a `(String, Throwable)` constructor, and the catch block should use it. `new X(\"failed: \" + e.getMessage())` is the same mistake with extra steps: it keeps one line of text and throws away the type and the frames.",
        },
        {
          type: "heading",
          text: "Catching Exception or Throwable in the middle of the code",
        },
        {
          type: "paragraph",
          text: "The try, catch and finally lesson's `BroadCatch` showed `catch (Exception e)` turning a missing-data `NullPointerException` into \"invalid id\", and `CatchThrowable` showed `catch (Throwable t)` also catching `OutOfMemoryError` and `StackOverflowError`, after which the JVM may be in no state to continue. In `NotifierFallback` above, the broad catch was deliberate: it was a recovery boundary for each channel. Broad catches belong at boundaries, where the job is to log and map anything, and nowhere else.",
        },
        {
          type: "heading",
          text: "Declaring throws Exception",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowsEverything.java",
          code: `import java.util.List;

public class ThrowsEverything {
    static String load(String id) throws Exception {
        return "order " + id;
    }

    public static void main(String[] args) {
        System.out.println(List.of("7", "8").stream().map(ThrowsEverything::load).toList());
    }
}`,
        },
        {
          type: "output",
          text: `ThrowsEverything.java:9: error: incompatible thrown types Exception in functional expression
        System.out.println(List.of("7", "8").stream().map(ThrowsEverything::load).toList());
                                                          ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`throws Exception` tells callers nothing about what can actually go wrong, forces every one of them to write `catch (Exception e)` (which then catches every bug too), and makes the method unusable as a method reference in a stream. Here it doesn't even throw anything. If a method throws a checked exception, I declare that specific type.",
        },
        {
          type: "heading",
          text: "printStackTrace instead of logging",
        },
        {
          type: "paragraph",
          text: "`e.printStackTrace()` writes to `System.err`, outside the logging system: no timestamp, no level, no request id, and often not collected at all. In real code it's `log.error(\"what I was doing\", e)` at the boundary. I only use `printStackTrace(System.out)` in this lesson to keep the demo output in one stream.",
        },
        {
          type: "heading",
          text: "The rest, each shown earlier with its real output",
        },
        {
          type: "list",
          items: [
            "**Swallowing.** An empty catch charged `50000` instead of `45000` in `Swallowed`, and `catch` plus `return null` turned a timeout into an unrelated NPE.",
            "**Log and rethrow.** One disk-full failure became three SEVERE entries in `DuplicateLogs`.",
            "**Fire-and-forget submit.** `ExecutorFailures` printed `after submit: done=true, nothing printed` for a task that had thrown, and a periodic task went quiet after `sync run 3`. If the future isn't kept and checked, use `execute` or catch inside the task.",
            "**Catching InterruptedException and carrying on.** `swallowing stopped after 20 batches`; one line, `Thread.currentThread().interrupt();`, made the other worker stop after 3.",
            "**Testing for my own type inside a CompletableFuture handler.** `exceptionally got CompletionException`, so `e instanceof IllegalArgumentException` never matches. Unwrap first.",
            "**Retrying something that isn't idempotent.** `naive retry: balance 2000 (expected 1500)`. Retry only transient failures of idempotent operations, or make the operation idempotent with a key.",
            "**Returning an empty result on failure.** `wrong: You have no orders yet.` was a database failure presented as a fact.",
            "**Secrets in messages.** Concatenating a record put `cardNumber=4111111111111111, cvv=123` into a message. Mask in `toString`, and build messages from the fields that are safe.",
          ],
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Classify the failure first: bug, expected outcome, or environmental. The tool follows from the kind.",
            "Validate at trust boundaries with `Objects.requireNonNull`, `checkIndex` and `IllegalArgumentException`, so bugs surface where they're introduced.",
            "Use `Optional` for \"absent\" and sealed result types for several expected outcomes. Keep exceptions for what the caller can't handle on the spot.",
            "Default to unchecked exceptions in application code. Translate checked infrastructure exceptions at the edge of the layer that owns them.",
            "Catch only to recover, add context, translate, or at a boundary. Everything else propagates without a try block.",
            "Catch the narrowest type that does the job. Broad catches only at boundaries.",
            "Always keep the cause when wrapping, and give custom exceptions a `(String, Throwable)` constructor.",
            "Log once, where the exception is handled, with the stack trace. Never log and rethrow.",
            "Write messages with ids and values for a developer reading logs; keep secrets and personal data out; put machine-readable data in fields.",
            "Never swallow. If ignoring is a real decision, name the variable `ignored` and write why.",
            "Install a default `UncaughtExceptionHandler`; catch inside periodic tasks; keep and check every `Future`; end every `CompletableFuture` pipeline with a handler or a `join`.",
            "Propagate `InterruptedException`, or restore the flag with `Thread.currentThread().interrupt()`.",
            "Retry only transient failures of idempotent operations, with backoff, jitter and a limit, at a single layer.",
            "Don't use exceptions for control flow on hot paths; a check or a return value is clearer and much cheaper.",
            "At an API boundary, map exceptions to a stable error format (RFC 9457 problem details), and never send stack traces or internal class names to clients.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "From the measurements in Internal Working and the try, catch and finally lesson's `ParseCost`, with the same warning: these are noisy numbers from my machine on JDK 21, and the ratios matter more than the values.",
        },
        {
          type: "table",
          headers: ["What", "Cost I measured", "What it means"],
          rows: [
            ["A `try` block when nothing is thrown", "Nothing to measure: it's an exception-table row, no instructions on the normal path", "Never avoid `try` for speed"],
            ["Throw and catch in the same compiled method, no stack trace", "Under 10 ns", "The JIT can turn it into a jump"],
            ["Normal exception, caught close by", "About 500 ns", "Mostly `fillInStackTrace`"],
            ["Normal exception through 100 frames", "About 9 microseconds", "Trace capture plus per-frame unwinding"],
            ["Stackless exception through 100 frames", "About 5 microseconds", "Unwinding alone still costs"],
            ["`parseInt` failing as a \"no\" answer, 500,000 times", "About 300 to 700 ms, against 12 to 20 ms for a check (`ParseCost`)", "Don't use exceptions for expected answers in loops"],
            ["A rare `throw` in hot compiled code", "Zero until it fires, then one deoptimization", "Validation guards are free"],
          ],
        },
        {
          type: "heading",
          text: "Stackless and preallocated exceptions",
        },
        {
          type: "paragraph",
          text: "When an exception is genuinely part of a hot path (a parser signalling end of input, a framework using it for flow it can't restructure), the stack trace can be turned off with the protected `Throwable(message, cause, false, false)` constructor, or by overriding `fillInStackTrace` to return `this`. The throw, throws and Custom Exceptions lesson's `Stackless` shows both effects: no frames, and `addSuppressed` silently ignored. My rules for using them:",
        },
        {
          type: "list",
          items: [
            "A stackless exception has `getStackTrace().length == 0`. If one ever escapes to a log, there's nothing to debug with. I use them only for exceptions that are always caught a few frames away.",
            "A **preallocated** instance (one `static final` exception thrown repeatedly) also saves the allocation, but it must be stackless and have suppression disabled. Otherwise `addSuppressed` from a try-with-resources would mutate a shared object across threads, and its trace would point at class initialization.",
            "Neither saves the unwinding cost, as the depth-100 column in `ThrowCost` showed. The real fix for a hot path is usually not throwing.",
          ],
        },
        {
          type: "heading",
          text: "OmitStackTraceInFastThrow, a recap",
        },
        {
          type: "paragraph",
          text: "The Exceptions and the Exception Hierarchy lesson demonstrates this one with its own `FastThrow`: for the implicit exceptions the JVM creates itself (`NullPointerException`, `ArithmeticException`, `ArrayIndexOutOfBoundsException`, `ArrayStoreException`, `ClassCastException`), C2 switches to a preallocated instance with no message and no stack trace once the same compiled site has thrown often enough. On my machine that happened a little after 5,000 NPEs from one line. It's on by default, and `-XX:-OmitStackTraceInFastThrow` turns it off.",
        },
        {
          type: "paragraph",
          text: "The practical side: in a production log it looks like a bare `java.lang.NullPointerException` with nothing under it, repeated thousands of times, while the first occurrences (thrown before C2 recompiled the method) still had full traces. When I see that pattern, I search back for the first occurrence, or restart with the flag off. The optimization exists because a site that throws the same implicit exception thousands of times is already a performance problem; the real fix is the bug.",
        },
        {
          type: "heading",
          text: "Logging is part of the cost",
        },
        {
          type: "paragraph",
          text: "Formatting and writing a stack trace of a hundred frames is usually far more expensive than throwing the exception. That's one more reason to log once: the three-times-logged failure in `DuplicateLogs` paid for three formatted traces. And a failure that happens thousands of times a minute should be counted as a metric and sampled in the logs, not logged with a full trace every time.",
        },
      ],
    },
    {
      title: "Exception Handling in Production",
      blocks: [
        {
          type: "paragraph",
          text: "In a ride-hailing backend, the endpoint that requests a ride can fail in several very different ways: no driver is free near the pickup zone (try again soon), the rider's payment method is declined (the rider must fix something), the request is malformed (a client bug), or my own code has a bug. A mobile app needs to tell those apart from the response alone, and it must never be shown a Java stack trace. The design I'd use: services throw unchecked domain exceptions with the fields a handler needs, nothing in between catches them, and **one** `@RestControllerAdvice` maps each type to an HTTP status and an RFC 9457 problem-details body, logging only the unexpected ones.",
        },
        {
          type: "paragraph",
          text: "I built both a bad version and that design with real Spring Framework 6.2.11 and drove them through Spring's `MockMvc`, which runs the real `DispatcherServlet`, argument resolution, exception resolvers and Jackson message conversion without starting a server. The Maven coordinates are `org.springframework:spring-webmvc:6.2.11` and `org.springframework:spring-test:6.2.11` (which bring `spring-web`, `spring-context` and the rest), `com.fasterxml.jackson.core:jackson-databind:2.21.7` for JSON, and `org.apache.tomcat.embed:tomcat-embed-core:10.1.46` for the Servlet 6 API. `$WEB` below is the classpath of those JARs.",
        },
        {
          type: "code",
          language: "java",
          title: "RideErrors.java",
          code: `import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

public class RideErrors {
    static final Logger SPRING_LOG = Logger.getLogger("org.springframework");

    // ---------- domain exceptions: unchecked, with the fields a handler needs ----------
    public static class NoDriverAvailableException extends RuntimeException {
        private final String zone;

        public NoDriverAvailableException(String zone) {
            super("no driver available in zone " + zone);
            this.zone = zone;
        }

        public String zone() { return zone; }
    }

    public static class PaymentDeclinedException extends RuntimeException {
        private final String riderId;
        private final String reason;

        public PaymentDeclinedException(String riderId, String reason) {
            super("payment declined for rider " + riderId + ": " + reason);
            this.riderId = riderId;
            this.reason = reason;
        }

        public String riderId() { return riderId; }
        public String reason() { return reason; }
    }

    // ---------- service and controller: no try/catch anywhere ----------
    public static class RideService {
        public String requestRide(String riderId, String zone) {
            if (zone.equals("AIRPORT")) {
                throw new NoDriverAvailableException(zone);
            }
            if (riderId.equals("r-17")) {
                throw new PaymentDeclinedException(riderId, "card expired");
            }
            if (zone.equals("NEW-ZONE")) {
                Map<String, Integer> baseFares = Map.of("CENTRAL", 50);
                int base = baseFares.get(zone);                    // a real bug: unboxing null
                return "ride-" + base;
            }
            return "ride-9001 for " + riderId + " in " + zone;
        }
    }

    @RestController
    public static class RideController {
        private final RideService rides = new RideService();

        @PostMapping("/rides")
        public Map<String, String> request(@RequestParam("riderId") String riderId,
                                           @RequestParam("zone") String zone) {
            return Map.of("ride", rides.requestRide(riderId, zone));
        }
    }

    // ---------- BAD: one catch-all that leaks the stack trace and says 500 for everything ----------
    public record LeakyError(String error, String trace) { }

    @RestControllerAdvice
    public static class LeakyAdvice {
        @ExceptionHandler(Exception.class)
        public ResponseEntity<LeakyError> any(Exception e) {
            StringWriter trace = new StringWriter();
            e.printStackTrace(new PrintWriter(trace));
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new LeakyError(e.toString(), trace.toString()));
        }
    }

    // ---------- GOOD: one place maps exceptions to RFC 9457 problem details ----------
    @RestControllerAdvice
    public static class RideProblemAdvice extends ResponseEntityExceptionHandler {
        private static final Logger LOG = Logger.getLogger("rides.api");
        private static final AtomicInteger ERROR_IDS = new AtomicInteger();

        @ExceptionHandler(NoDriverAvailableException.class)
        public ResponseEntity<ProblemDetail> noDriver(NoDriverAvailableException e) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
                    "All drivers near " + e.zone() + " are busy. Try again shortly.");
            problem.setType(URI.create("https://api.example.com/problems/no-driver-available"));
            problem.setTitle("No driver available");
            problem.setProperty("zone", e.zone());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .header(HttpHeaders.RETRY_AFTER, "30")
                    .body(problem);
        }

        @ExceptionHandler(PaymentDeclinedException.class)
        public ProblemDetail paymentDeclined(PaymentDeclinedException e) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.PAYMENT_REQUIRED,
                    "Your payment method was declined: " + e.reason() + ".");
            problem.setType(URI.create("https://api.example.com/problems/payment-declined"));
            problem.setTitle("Payment declined");
            return problem;
        }

        @ExceptionHandler(Exception.class)
        public ProblemDetail unexpected(Exception e) {
            String errorId = "err-" + ERROR_IDS.incrementAndGet();      // a real service would use the trace id
            LOG.log(Level.SEVERE, "unhandled error " + errorId, e);      // the one log line, with the trace
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Something went wrong on our side. Quote " + errorId + " if you contact support.");
            problem.setTitle("Internal error");
            problem.setProperty("errorId", errorId);
            return problem;
        }
    }

    static void call(MockMvc mvc, String query, int maxBody) throws Exception {
        String[] parts = query.split("&");
        var request = post("/rides");
        for (String part : parts) {
            String[] kv = part.split("=");
            request.param(kv[0], kv[1]);
        }
        MockHttpServletResponse response = mvc.perform(request).andReturn().getResponse();
        String body = response.getContentAsString();
        System.out.println("POST /rides?" + query + " -> " + response.getStatus()
                + " " + response.getContentType()
                + (response.getHeader("Retry-After") != null ? " Retry-After: " + response.getHeader("Retry-After") : ""));
        System.out.println("  " + (body.length() > maxBody ? body.substring(0, maxBody) + "..." : body));
    }

    public static void main(String[] args) throws Exception {
        SPRING_LOG.setLevel(Level.WARNING);                               // hide start-up INFO lines
        MockMvc leaky = MockMvcBuilders.standaloneSetup(new RideController())
                .setControllerAdvice(new LeakyAdvice()).build();
        MockMvc good = MockMvcBuilders.standaloneSetup(new RideController())
                .setControllerAdvice(new RideProblemAdvice()).build();

        System.out.println("=== leaky handler ===");
        call(leaky, "riderId=r-42&zone=AIRPORT", 140);
        call(leaky, "riderId=r-42&zone=NEW-ZONE", 140);

        System.out.println("=== problem details ===");
        call(good, "riderId=r-42&zone=CENTRAL", 1_000);
        call(good, "riderId=r-42&zone=AIRPORT", 1_000);
        call(good, "riderId=r-17&zone=CENTRAL", 1_000);
        call(good, "riderId=r-42", 1_000);
        call(good, "riderId=r-42&zone=NEW-ZONE", 1_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# WEB = spring-webmvc, spring-web, spring-test, spring-context and friends (6.2.11),
#       jackson-databind 2.21.7 with jackson-core and jackson-annotations,
#       tomcat-embed-core 10.1.46
javac -cp "$WEB" RideErrors.java
java -cp "$WEB:." -Djava.util.logging.SimpleFormatter.format='%4$s %3$s: %5$s%6$s%n' RideErrors`,
        },
        {
          type: "output",
          text: `=== leaky handler ===
POST /rides?riderId=r-42&zone=AIRPORT -> 500 application/json
  {"error":"RideErrors$NoDriverAvailableException: no driver available in zone AIRPORT","trace":"RideErrors$NoDriverAvailableException: no dri...
POST /rides?riderId=r-42&zone=NEW-ZONE -> 500 application/json
  {"error":"java.lang.NullPointerException: Cannot invoke \\"java.lang.Integer.intValue()\\" because the return value of \\"java.util.Map.get(Obj...
=== problem details ===
POST /rides?riderId=r-42&zone=CENTRAL -> 200 application/json
  {"ride":"ride-9001 for r-42 in CENTRAL"}
POST /rides?riderId=r-42&zone=AIRPORT -> 503 application/problem+json Retry-After: 30
  {"type":"https://api.example.com/problems/no-driver-available","title":"No driver available","status":503,"detail":"All drivers near AIRPORT are busy. Try again shortly.","instance":"/rides","zone":"AIRPORT"}
POST /rides?riderId=r-17&zone=CENTRAL -> 402 application/problem+json
  {"type":"https://api.example.com/problems/payment-declined","title":"Payment declined","status":402,"detail":"Your payment method was declined: card expired.","instance":"/rides"}
POST /rides?riderId=r-42 -> 400 application/problem+json
  {"type":"about:blank","title":"Bad Request","status":400,"detail":"Required parameter 'zone' is not present.","instance":"/rides"}
SEVERE rides.api: unhandled error err-1
java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
	at RideErrors$RideService.requestRide(RideErrors.java:65)
	at RideErrors$RideController.request(RideErrors.java:79)
	at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)
	at java.base/java.lang.reflect.Method.invoke(Method.java:580)
	at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:258)
	... 16 Spring, servlet and MockMvc frames, trimmed by me ...
	at RideErrors.call(RideErrors.java:143)
	at RideErrors.main(RideErrors.java:167)

POST /rides?riderId=r-42&zone=NEW-ZONE -> 500 application/problem+json
  {"type":"about:blank","title":"Internal error","status":500,"detail":"Something went wrong on our side. Quote err-1 if you contact support.","instance":"/rides","errorId":"err-1"}`,
        },
        {
          type: "heading",
          text: "What went wrong in the leaky version",
        },
        {
          type: "list",
          items: [
            "**Every failure was a 500.** \"No driver near the airport\" is a normal, temporary business condition, and the app received the same status as a crash. Clients and load balancers treat 500 as a server fault; the app can't show \"try again in a moment\", and retry logic can't tell it apart from a bug.",
            "**The body leaked internals**: the exception class name with its nesting (`RideErrors$NoDriverAvailableException`), and for the bug, the JDK's helpful NPE message naming `java.util.Map.get` and `Integer.intValue`. The `trace` field (cut off at 140 characters by my demo) held the whole stack: every class and method from my code through Spring to the servlet container, with line numbers. That's a free map of the backend for anyone probing the API.",
            "**Nothing was logged.** The handler sent the trace to the client and kept nothing for the team. A container's default error page can leak the same way when an exception escapes Spring entirely (Tomcat's `ErrorReportValve` includes the trace unless its `showReport` is turned off), which is why security scans flag stack traces in responses.",
          ],
        },
        {
          type: "heading",
          text: "What the problem-details version does",
        },
        {
          type: "list",
          items: [
            "**One status per meaning.** `NoDriverAvailableException` became **503** with a `Retry-After: 30` header: temporary, retryable, and the app knows when. `PaymentDeclinedException` became **402**, a status reserved by RFC 9110 for future use but widely used by payment APIs for declined cards; 422 would also be defensible. The unexpected NPE became **500**. Each tells the client what kind of failure it is without reading the text.",
            "**A standard body.** Each error is `application/problem+json` with RFC 9457's members: `type` (a URI identifying the problem kind, which clients can switch on), `title`, `status`, `detail` (human-readable, for this occurrence) and `instance`, which Spring filled with the request path. `zone` and `errorId` are **extension members**, which the RFC allows; Spring's Jackson support flattened them from `setProperty` into top-level fields.",
            "**The missing-parameter case cost nothing.** Extending `ResponseEntityExceptionHandler` made Spring's own exceptions (here `MissingServletRequestParameterException`) come back as problem details too: 400, `Required parameter 'zone' is not present.`, `type` defaulting to `about:blank`. In Spring Boot 3 and later, `spring.mvc.problemdetails.enabled=true` (off by default) registers the same kind of handler, a `ResponseEntityExceptionHandler` subclass, without writing one.",
            "**The bug was logged once, with its trace, and the client got an id.** The response says only \"something went wrong\" and `err-1`; the log line `unhandled error err-1` has the full stack. Support can join the two. In a real service the id would be the request's trace id from the tracing system.",
            "**No layer in between caught anything.** `RideService` and `RideController` have no try blocks. They throw, and the advice is the boundary, exactly the shape of the diagram earlier in this lesson.",
            "**Handler choice is by exception type, most specific first.** Spring picked `noDriver` for `NoDriverAvailableException` even though `unexpected(Exception e)` also matched, because `ExceptionHandlerMethodResolver` sorts matches by how close the declared type is in the hierarchy.",
          ],
        },
        {
          type: "paragraph",
          text: "Two follow-ups I'd do in a real codebase. Put the problem `type` URIs and titles in one place (an enum of error codes), so the API documents a closed set of problems instead of strings scattered across handlers. And write a test per mapping with `MockMvc`, just like this program, because the mapping from exception to status is part of the API contract: changing a 503 to a 500 breaks every client's retry logic without changing a single Java signature.",
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
              question: "What's the difference between checked and unchecked exceptions, and which should you use?",
              answer:
                "Checked exceptions extend `Exception` but not `RuntimeException`, and `javac` forces every caller to catch them or declare them in `throws`. Unchecked ones extend `RuntimeException` or `Error`, and nothing is enforced. The original idea was checked for recoverable conditions and unchecked for programming errors.\n\nIn application code I default to unchecked, use standard JDK types for bugs, and use `Optional` or a sealed result type when I want the compiler to force the caller to handle an outcome. The JDK itself shifted: `SimpleDateFormat.parse` throws a checked `ParseException`, `LocalDate.parse` an unchecked `DateTimeParseException`, and in my test the checked API still silently accepted month 13.",
            },
            {
              question: "Why is catching Exception usually a bad idea?",
              answer:
                "Because it catches everything, including bugs like `NullPointerException` that should crash loudly, and then the code treats them like the failure it expected. It also catches `InterruptedException` around blocking calls.\n\nThe try, catch and finally lesson's `BroadCatch` showed it: a customer with a missing tier caused an NPE, and `catch (Exception e)` reported it as an invalid id, while the specific `catch (NumberFormatException e)` let the bug crash where it could be seen. Broad catches are fine at boundaries, where the job is to log and map anything, like the `Exception` handler in my production `RideProblemAdvice`.",
            },
            {
              question: "What does it mean to swallow an exception, and why is it harmful?",
              answer:
                "Catching it and continuing without handling or reporting it: an empty catch, or `catch` and `return null`. The failure doesn't go away; it becomes wrong data or a different exception later, with the original evidence gone.\n\nIn my demo, an empty catch turned a malformed coupon into a full-price charge with no log line, and `return null` on an `IOException` made the program die one method later with an NPE about `<local2>` and no `Caused by`, so the real problem, a timeout, was invisible.",
            },
            {
              question: "What should a good exception message contain?",
              answer:
                "What was being attempted, the identifiers involved (order id, file, line), the offending value, and ideally what was expected. Never secrets: passwords, tokens, card numbers, CVVs or personal data the logs can't hold.\n\nMy `Messages` example compared \"Something went wrong\", a message that concatenated a whole record and leaked the card number and CVV, and `card ****1111 declined for order ORD-1042: amount 249900 paise, gateway code 51`. The good version also kept the order id and gateway code in fields, so code doesn't parse the text.",
            },
            {
              question: "When should a method return Optional instead of throwing?",
              answer:
                "When \"nothing found\" is a normal answer the caller should handle right away, like looking a book up by ISBN. `Optional` makes the absence part of the return type, so the caller can't forget it.\n\nI follow a naming rule: `findX` returns `Optional`, `getX` promises the thing exists and throws if it doesn't. `findBook(\"000-0000000000\")` printed `not in catalogue` through `orElse`, with no exception involved. `Optional` is only for the absent case; several outcomes with different data call for a sealed result type.",
            },
            {
              question: "What is fail-fast validation?",
              answer:
                "Checking arguments at the entry point and throwing immediately if they're invalid, so the failure is reported where the bad value came in rather than later where it's used. `Objects.requireNonNull`, `Objects.checkIndex` and `IllegalArgumentException` are the usual tools.\n\nIn my `FailFast`, the record's compact constructor rejected a null email at construction with `email must not be null` and an address without `@` with `email must contain @: ravi.example.com`, so an invalid `Employee` could never exist and no later method had to re-check.",
            },
            {
              question: "Why shouldn't exceptions be used for normal control flow?",
              answer:
                "They're slower than a check, and they're misleading to read: a `catch` says something went wrong when nothing did. Each throw allocates, captures a stack trace and unwinds frames.\n\nIn the try, catch and finally lesson's `ParseCost`, a million strings with half of them invalid took about 300 to 700 ms when catching `NumberFormatException` and 12 to 20 ms with a digit check first. The answer \"this isn't a number\" is a normal outcome, so it deserves a boolean, not an exception.",
            },
            {
              question: "What's wrong with e.printStackTrace()?",
              answer:
                "It writes to `System.err`, outside the logging system: no timestamp, no level, no request id, no routing to the log store, and in many deployments stderr isn't collected at all. It's also usually a sign that the catch block isn't really handling anything.\n\nAt a boundary I log with the real logger, passing the exception so the trace and the `Caused by` chain are included, as the single `POST /orders failed` entry in `DuplicateLogs` did. Below a boundary, I don't print anything: I propagate or wrap.",
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
              question: "What is log-and-rethrow, and why is it an anti-pattern?",
              answer:
                "Logging an exception and then throwing it (or a wrapper) onward, at several layers. Each layer logs the same failure, so one event produces several error entries, often each with the full trace.\n\nIn `DuplicateLogs` one disk-full failure produced three SEVERE entries, with the same `IllegalStateException` trace printed three times. The rule I use: a method either handles an exception (and may log it) or passes it on with added context in the message, never both. The boundary logs once with everything.",
            },
            {
              question: "When should you catch an exception, and when should you let it propagate?",
              answer:
                "Catch only to recover (fallback, default, retry), to add context only this level knows, to translate into this layer's exception, or at a boundary that turns failures into responses, log lines or exit codes. Otherwise, let it propagate; no try block at all.\n\nIn `OrderLookup`, the repository didn't catch, the service translated `IOException` into `OrderStoreException(\"could not load order 13\", e)`, and only `handle` decided between 404 and 503. The layers in between had nothing to do, which is the normal case.",
            },
            {
              question: "What is exception translation, and why must the cause be kept?",
              answer:
                "Catching a lower-level exception and throwing one that belongs to the current layer's abstraction, so callers don't depend on implementation details like SQL or HTTP. Spring's `DataAccessException` hierarchy is the classic example.\n\nThe cause must be passed to the new exception's constructor, or the root reason disappears. In `OrderLookup`, keeping the cause is what made the trace say both what failed (`could not load order 13`) and why (`Caused by: java.io.IOException: connection reset by peer`); drop it and only the first half survives.",
            },
            {
              question: "How do you handle a checked exception inside a stream lambda?",
              answer:
                "`Function.apply` can't throw checked exceptions, so `map(path -> Files.readString(path))` fails with `unreported exception IOException; must be caught or declared to be thrown`. The options: catch inside the lambda and rethrow as `UncheckedIOException`, use a small adapter like `unchecked(Files::readString)` that does the same, or turn each element's failure into a value.\n\nIn `StreamErrors`, the first two stopped the stream at `feb.csv`, after `jan.csv` was already processed; the third returned `Ok` for two files and `Failed` for one, which is what a batch usually needs. I avoid sneaky throw because callers then can't even write a `catch (IOException e)` around the stream.",
            },
            {
              question: "What happens when a task submitted with ExecutorService.submit throws an exception?",
              answer:
                "Nothing visible. `submit` wraps the task in a `FutureTask`, which catches whatever the task throws and stores it. The future completes, and the exception only comes out when someone calls `get()`, as an `ExecutionException` whose cause is the original.\n\nMy `ExecutorFailures` printed `after submit: done=true, nothing printed`, and only `get()` revealed `no billing address for order 2`. With `execute`, the same exception reached the worker's uncaught handler and was printed. If the future is thrown away, the failure is lost; Java 19's `state()` and `exceptionNow()` are a convenient way to inspect a finished one.",
            },
            {
              question: "How do you make sure exceptions in background threads are not lost?",
              answer:
                "Install a default `UncaughtExceptionHandler` that logs through the real logger, catch inside periodic tasks, keep and check every `Future`, and end every `CompletableFuture` chain with `handle`, `exceptionally` or `join`. A task's catch-all is a boundary, so logging there is right.\n\nWithout a handler, a dead thread leaves only a trace on stderr, and a process where only a worker died still exits with code 0, as the Exceptions and the Exception Hierarchy lesson showed. Worse, `scheduleAtFixedRate` stopped running a task after its third run threw, with no output at all; the exception lived only in the `ScheduledFuture`.",
            },
            {
              question: "How should InterruptedException be handled?",
              answer:
                "Propagate it by declaring `throws InterruptedException`. If that's not possible (inside `Runnable.run`, or an interface I don't own), restore the flag with `Thread.currentThread().interrupt()` and return or stop. Never catch it and continue.\n\nThe blocking method clears the interrupt flag when it throws, so swallowing it erases the stop request. In `Interrupts`, the swallowing worker ran all 20 batches after being interrupted; the one that restored the flag stopped after 3.",
            },
            {
              question: "What's the difference between exceptionally, handle and whenComplete on a CompletableFuture?",
              answer:
                "`exceptionally` runs only on failure and returns a replacement value. `handle` runs on success and failure and maps either into a new value. `whenComplete` runs on both but can't change the outcome: a failed stage stays failed. `exceptionallyCompose` (Java 12) recovers with another future.\n\nIn `FutureErrors`, `exceptionally` produced `stock unknown`, `handle` produced `error: unknown sku X-4`, and after `whenComplete` logged the failure, `join()` still threw. So I use `whenComplete` for logging and metrics, and `handle` at the end of a pipeline to build a response.",
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
              question: "Break down what it costs to throw an exception.",
              answer:
                "Three parts: allocating the object, capturing the stack trace in the constructor via `fillInStackTrace`, and unwinding frames until a handler is found. The trace walk is proportional to the stack depth, and unwinding costs per frame passed, because each compiled frame without a handler needs a runtime lookup.\n\nMy `ThrowCost` run (noisy, JDK 21) gave about 500 ns for a normal exception caught nearby, under 10 ns for a stackless one there because the JIT turned the throw into a jump, and about 9 microseconds for a normal one through 100 frames, of which a stackless one still cost about 5. Formatting and logging the trace usually costs more than all of that.",
            },
            {
              question: "What are stackless and preallocated exceptions, and when are they justified?",
              answer:
                "A stackless exception skips the stack walk, either with the protected `Throwable(message, cause, enableSuppression, writableStackTrace)` constructor from Java 7 with `writableStackTrace = false`, or by overriding `fillInStackTrace` to return `this`. A preallocated one is a single static instance thrown repeatedly, which also saves the allocation.\n\nThey're justified only on a measured hot path where the exception is always caught a few frames away. The cost is debuggability: `getStackTrace()` is empty. A preallocated instance must also disable suppression, or `addSuppressed` would mutate a shared object. And neither removes the unwinding cost, which was still about 5 microseconds at depth 100 in my measurement.",
            },
            {
              question: "What is OmitStackTraceInFastThrow, and how does it affect debugging?",
              answer:
                "A C2 optimization, on by default, for exceptions the JVM throws implicitly: NPE, `ArithmeticException`, array index and store exceptions, `ClassCastException`. Once a compiled site has thrown one often enough, C2 throws a preallocated instance with no message and no stack trace.\n\nIn the `FastThrow` program of the Exceptions and the Exception Hierarchy lesson, the NPE lost its helpful message and its frames a little after 5,000 throws from the same line. In logs that looks like thousands of bare `java.lang.NullPointerException` lines. I search back for the first full trace, or run with `-XX:-OmitStackTraceInFastThrow`, which kept every trace in that test.",
            },
            {
              question: "What does the JIT do with a throw that has never happened?",
              answer:
                "Commonly, C2 doesn't compile that path at all. It compiles from profiling data, and a branch that was never taken becomes an uncommon trap: if it's ever reached, the compiled method is deoptimized, the call continues in the interpreter, and the method is recompiled later with the new profile.\n\nWith `-Xlog:deoptimization=debug`, `RareThrow` showed `RareThrow.parsePercent(I)I trap_bci=1 unstable_fused_if reinterpret` the first time a bad value arrived after a million good ones, and bytecode index 1 was the `iflt` that jumps to the throw. So a never-taken validation guard costs nothing in compiled code, and the first throw costs one deoptimization.",
            },
            {
              question: "How do sealed result types compare to checked exceptions for expected failures?",
              answer:
                "Both make the compiler force callers to deal with outcomes, but a sealed interface of records does it through the return type. A `switch` over it with no `default` must cover every permitted subtype, it carries per-outcome data, it works inside lambdas, and it costs no more than a normal return.\n\nWhen I removed one case from the switch over `Withdrawal`, `javac` said `the switch expression does not cover all possible input values`. I still throw for bugs: the same `withdraw` method returned `InsufficientFunds` as a value but threw `IllegalArgumentException` for a negative amount.",
            },
            {
              question: "Why did much of the industry move away from checked exceptions, and is there still a place for them?",
              answer:
                "Because most callers can't recover either, so checked exceptions get declared through every layer or wrapped by reflex; they leak implementation details into signatures; adding one is a breaking change; and they don't fit `java.util.function` interfaces. Spring, JPA, Kotlin and C# all went unchecked, and Jackson 3's `JacksonException` extends `RuntimeException` where Jackson 2's extended `IOException`, which I confirmed with `javap`.\n\nThey still have a place where a caller genuinely can and must decide, and no lambdas are involved. `InterruptedException` is the clearest case: it's a cancellation protocol, and keeping it checked is what reminds people to restore the flag.",
            },
            {
              question: "Which exceptions are retryable, and what has to be true before you retry?",
              answer:
                "Transient ones: timeouts, connection resets, 503/502/504, 429 after `Retry-After`, deadlock victims and optimistic-lock conflicts. Not validation errors, 4xx client errors, auth failures or bugs, which fail identically every time. And the operation must be idempotent, because a timeout means \"unknown\", not \"failed\".\n\nIn `RetryDemo`, a validation error failed fast while a timeout was retried with backoff and jitter. A naive retry of a deposit whose response was lost ended with balance `2000` instead of `1500`; with an idempotency key the retry returned the stored result. I also retry at only one layer, since three layers of three attempts make 27 requests.",
            },
            {
              question: "How does global exception handling work in Spring MVC?",
              answer:
                "`@ExceptionHandler` methods in a `@RestControllerAdvice` class apply to all controllers. When a handler method throws, the `ExceptionHandlerExceptionResolver` finds the handler whose declared type is closest to the thrown type and uses its return value as the response. Extending `ResponseEntityExceptionHandler` adds handlers for Spring MVC's own exceptions, returning problem details.\n\nIn the production example, `NoDriverAvailableException` went to its own handler even though the `Exception` handler also matched, and a missing `zone` parameter came back as a 400 problem detail without any code of mine. In Spring Boot 3 and later, `spring.mvc.problemdetails.enabled=true` (off by default) enables a similar handler by configuration.",
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
              question: "A nightly job \"runs\" but its output is missing, and there's no error in the logs. How do you investigate and fix it?",
              answer:
                "My first suspects are the three silent paths from this lesson: a task given to `ExecutorService.submit` whose `Future` is never checked, a `scheduleAtFixedRate` task that threw once and was suppressed from then on, or a `CompletableFuture` chain with no terminal handler. A swallowing catch inside the job is the fourth. I'd look for futures that are discarded and catch blocks that don't rethrow or log.\n\nThe fix: wrap the job body in a catch-all that logs with the trace (it's a boundary), keep and `get` futures with timeouts, catch inside periodic tasks so one bad run doesn't cancel the schedule, and add a default `UncaughtExceptionHandler`. My `ExecutorFailures` demo reproduces all of it: `done=true, nothing printed`, and a schedule that went quiet after `sync run 3`.",
            },
            {
              question: "Every failed request produces the same error three to five times in the logs. What's going on, and how do you fix it?",
              answer:
                "Log-and-rethrow: each layer (repository, service, controller, maybe a filter) catches, logs and rethrows. The root cause appears once per layer, sometimes once more as a `Caused by`, and alerting overcounts.\n\nI'd remove the logging from every catch block that rethrows, move any useful context into the rethrown exception's message, and keep exactly one log statement at the boundary, which in Spring is the `@RestControllerAdvice`. `DuplicateLogs` went from three SEVERE entries to one with the same information.",
            },
            {
              question: "You're designing the error responses for the ride-request API. What would you return?",
              answer:
                "RFC 9457 problem details with `application/problem+json`, and a status that matches the meaning: 503 with `Retry-After` for no driver available, 402 (or 422) for a declined payment, 400 for malformed requests, 500 with an error id for bugs. A stable `type` URI per problem kind, a human `detail`, and extension members like `zone` for data the app needs. Never a stack trace or a class name.\n\nThat's what my `RideProblemAdvice` produced with Spring 6.2.11, while the leaky catch-all returned 500 for everything with the full trace in the body. Unexpected errors are logged once server-side with the same `errorId` the client sees, and I'd test every mapping with `MockMvc`, because changing a status breaks clients.",
            },
            {
              question: "Profiling shows a hot path spending most of its time in fillInStackTrace. What do you do?",
              answer:
                "Find which exception is thrown and why it's frequent. Usually it's an expected answer implemented as an exception, like parsing to test whether a string is a number, or a lookup that throws for \"not found\" inside a loop. The fix is a check or a return value (`Optional`, a boolean, a result type), not a cheaper exception.\n\nIn `ParseCost` (the try, catch and finally lesson), the check was roughly 20 to 40 times faster than catching `NumberFormatException`. Only if the exception can't be avoided (a library I don't control, or a deliberate parser signal) would I make it stackless, and only if it's always caught a few frames away. If the stack traces in the logs are also missing, `OmitStackTraceInFastThrow` has kicked in, which itself is a sign of a very hot throw site.",
            },
            {
              question: "A service takes 30 seconds to shut down and then gets killed. Thread dumps show workers still looping. What would you check?",
              answer:
                "Whether the workers' code swallows `InterruptedException`. Shutdown uses interrupts (`shutdownNow`, `Future.cancel(true)`), and a worker that catches the exception around `sleep` or `take` and continues has erased its stop signal, so it runs until the platform kills it.\n\nI'd search for catch blocks of `InterruptedException` (and `catch (Exception e)` around blocking calls) and make each one either propagate or call `Thread.currentThread().interrupt()` before returning. In `Interrupts`, that one line made the worker stop after 3 batches instead of running all 20.",
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
            "Write `static int parseQuantity(String s)` that throws `IllegalArgumentException(\"quantity must be a whole number: \" + s, e)` when `Integer.parseInt` fails, and `IllegalArgumentException(\"quantity must be > 0: \" + q)` when the number is not positive. Call it with `\"3\"`, `\"abc\"` and `\"-1\"`, printing either the result or the message and `getCause()`.",
            "Create `Executors.newSingleThreadExecutor()`, `submit` a lambda that throws `new IllegalStateException(\"report failed\")`, sleep 200 ms, and print a line. Then call `get()` on the future and print `e.getCause()` from the `ExecutionException`.",
            "Build `CompletableFuture.supplyAsync(...)` that throws `IllegalStateException(\"boom\")`, attach `.whenComplete((v, e) -> System.out.println(\"saw \" + e))`, and call `join()` inside a try/catch for `CompletionException`. Predict whether the catch runs before you try it.",
            "In `Interrupts.java`, comment out `Thread.currentThread().interrupt();` in `pauseRestoring` and run it again.",
            "Run `List.of(\"1\", \"2\", \"x\", \"4\").stream().map(Integer::parseInt).forEach(System.out::println);` and look at which numbers are printed before the exception and which method is at the bottom of the trace.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `3`, then the message `quantity must be a whole number: abc` with the cause `java.lang.NumberFormatException: For input string: \"abc\"`, then `quantity must be > 0: -1` with a `null` cause. Step 2 prints the line with nothing before it, and only `get()` reveals `java.lang.IllegalStateException: report failed`. Step 3 prints `saw java.util.concurrent.CompletionException: java.lang.IllegalStateException: boom`, and the catch does run: `whenComplete` observes but doesn't recover. Step 4 makes both workers print `stopped after 20 batches`. Step 5 prints `1` and `2`, then `NumberFormatException: For input string: \"x\"`, with my own class's `main` at the bottom and `ReferencePipeline.forEach` just above it: the terminal operation drove the work, and `4` was never parsed.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `CLASSIFY   bug ─────────► unchecked, fail fast, don't catch
           expected ────► Optional / sealed result type
           environment ─► exception, propagate to a boundary

CATCH ONLY recover · add context · translate · boundary
           everything else: no try block at all

WRAP       new MyException("what I was doing", cause)
LOG        once, at the boundary, with the trace
MESSAGES   ids + values, no secrets; data in fields
NEVER      empty catch, return null on failure,
           catch (Exception) mid-code, log-and-rethrow

THREADS    execute ─► uncaught handler (stderr)
           submit ──► hidden in Future until get()
           fixed-rate task throws ─► schedule stops
ASYNC      CompletionException wraps; unwrap in handlers
           exceptionally / handle change it; whenComplete
           only observes
INTERRUPT  propagate, or Thread.currentThread().interrupt()
RETRY      transient + idempotent, backoff + jitter, 1 layer

COST       trace walk ~ depth; unwinding ~ frames passed
           rare throw: uncommon trap; hot NPE: fast throw
SPRING     @RestControllerAdvice -> ProblemDetail
           (RFC 9457), status per meaning, no traces`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Every failure is information that has to reach the one place that can act on it: classify it, catch only where something can be done, keep the cause, and log it exactly once.",
            "Exceptions are for what the caller can't handle on the spot. Expected outcomes belong in the return type, and failures on other threads need a `get`, a handler or a `join` that someone actually calls.",
            "That closes Phase 7. Phase 8 starts with Strings, the type nearly every exception message, log line and parsed input in this lesson went through, and the place where immutability, the string pool and `StringBuilder` finally get their own deep look.",
          ],
        },
      ],
    },
  ],
};
