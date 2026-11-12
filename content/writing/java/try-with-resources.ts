import type { Lesson } from "../types";

export const tryWithResources: Lesson = {
  slug: "try-with-resources",
  date: "2026-11-13",
  title: "try-with-resources",
  description:
    "How Java's try-with-resources really closes things: the three bugs of closing by hand, AutoCloseable versus Closeable, reverse close order, closing before catch and finally, suppressed exceptions and the edge cases of addSuppressed, null and effectively final resources, writing my own resources such as a lock guard, the JDK types that became AutoCloseable in Java 19 and 21, the exact bytecode javac generates, and an export job that ran out of file descriptors.",
  tags: ["Core Java", "Exceptions", "try-with-resources", "AutoCloseable"],
  sections: [
    {
      title: "What try-with-resources Is",
      blocks: [
        {
          type: "paragraph",
          text: "The last lesson ended on a practical problem: many exceptions are thrown while something is open. The try, catch and finally lesson made `finally` the place for cleanup, code that runs whether the `try` block finished normally or threw, and the obvious use is closing things. A file, a socket, a database connection, a lock: each holds something outside the Java heap that the garbage collector doesn't manage, so it has to be given back explicitly, and on every path, including the ones where something went wrong.",
        },
        {
          type: "paragraph",
          text: "Doing that with `finally` by hand turned out to be surprisingly hard to get right. I counted three separate bugs in the usual pattern, and the worst one quietly throws away the exception that explains what actually failed:",
        },
        {
          type: "code",
          language: "java",
          code: `ReportFile file = new ReportFile("customers.csv");
try {
    file.readLine();          // throws: "read failed in customers.csv"
} finally {
    file.close();             // throws too: "close failed for customers.csv"
}                             // the caller only ever sees the second one`,
        },
        {
          type: "paragraph",
          text: "A **try-with-resources** statement declares the things to close in parentheses after `try`. The compiler then generates the closing code itself: every resource is closed when the block ends, normally or by an exception, in reverse order of opening, and if closing fails while another exception is already in flight, the close failure is attached to the original as a **suppressed** exception instead of replacing it.",
        },
        {
          type: "code",
          language: "java",
          code: `try (ReportFile file = new ReportFile("customers.csv")) {
    file.readLine();
}                             // file.close() runs here on every path`,
        },
        {
          type: "paragraph",
          text: "This lesson starts with what the manual pattern gets wrong, with real output, then goes through the rules (what counts as a resource, close order, when closing happens relative to `catch` and `finally`, suppression, `null` and Java 9's effectively final variables), what `javac` actually generates, how to write my own resource, and the JDK types it applies to. The production section rebuilds an export job that runs out of file descriptors because one batch in three fails halfway.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The idea of tying cleanup to a scope is much older than Java. C++ has done it with destructors since the 1980s: an object on the stack is destroyed when its scope ends, and its destructor releases whatever it holds. The C++ community calls this RAII, \"resource acquisition is initialization\". C# 1.0 (2002) added a `using (...) { }` statement that calls `Dispose()` at the end of the block, and Python 2.5 (2006) added `with` (PEP 343).",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) had neither destructors nor a scoped statement. It had `finally`, which is general enough to do the job but leaves every detail to the programmer, and `Object.finalize()`, which runs at the garbage collector's convenience and was never a reliable way to close anything. The Object Class Methods lesson showed why `finalize` is now deprecated for removal.",
        },
        {
          type: "paragraph",
          text: "In 2009, Joshua Bloch proposed \"Automatic Resource Management\" blocks to Project Coin, the small-language-changes project for Java 7. It shipped in Java 7 (July 2011, JSR 334) as try-with-resources, together with three library changes that it needs: a new interface `java.lang.AutoCloseable` (its Javadoc lists Bloch as the author), the old `java.io.Closeable` (from Java 5) retrofitted to extend it, and two new methods on `Throwable`, `addSuppressed` and `getSuppressed`, so that one exception can carry others.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`try`/`finally`, `Object.finalize()`", "Cleanup by hand, or by the GC at an unknown time"],
            ["Java 5 (2004)", "`java.io.Closeable`, with `close() throws IOException`", "One interface for streams, readers and writers"],
            ["Java 7 (2011)", "try-with-resources, `AutoCloseable`, `Throwable.addSuppressed`/`getSuppressed` (JSR 334, Project Coin)", "The statement itself; JDBC's `Connection`, `Statement` and `ResultSet` became `AutoCloseable` in the same release"],
            ["Java 8 (2014)", "`Stream` extends `BaseStream`, which is `AutoCloseable`", "`Files.lines` returns a stream that holds a file open"],
            ["Java 9 (2017)", "Effectively final variables as resources (JEP 213, Milling Project Coin); `java.lang.ref.Cleaner`", "`try (in; out)` without redeclaring; a GC-driven safety net for forgotten closes"],
            ["Java 18 (2022)", "Finalization deprecated for removal (JEP 421)", "try-with-resources is the official answer"],
            ["Java 19 (2022)", "`ExecutorService` extends `AutoCloseable`", "`close()` shuts the pool down and waits for its tasks"],
            ["Java 21 (2023)", "`HttpClient` implements `AutoCloseable`; unnamed variables in preview (JEP 443)", "`try (var _ = ...)` is a preview feature here"],
            ["Java 22 (2024)", "Unnamed variables final (JEP 456)", "`try (var _ = lock())` compiles without flags, so on Java 25 LTS too"],
          ],
        },
        {
          type: "paragraph",
          text: "I checked the `ExecutorService` and `HttpClient` rows rather than trusting memory: the `ExecutorService.close()` Javadoc in the JDK 25 sources says `@since 19`, `HttpClient.close()` says `@since 21`, and JDK 17's `javac` rejects both types in a try-with-resources header. That run is in the Common Resources section.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a reference library where books can't leave the building, with one strict librarian at the only exit.",
        },
        {
          type: "list",
          items: [
            "Borrowing a book at the counter is **opening a resource**. The slip with the book's name on it is the declaration in the `try (...)` header.",
            "Reading in the reading room is the **try block**.",
            "The librarian at the exit is the **generated close code**. Nobody leaves without returning every book, whether they walk out calmly or leave because a fire alarm went off (an exception).",
            "Books go back **last borrowed, first returned**, because the last one is on top of the pile. That's the reverse close order.",
            "The help desk past the exit is the **catch block**. Whoever needs help gets there only after the books are back, which is why resources are already closed when `catch` and `finally` run.",
            "If a book turns out to be damaged while everyone is leaving during the fire alarm, the librarian writes the damage on the back of the fire-alarm report instead of throwing that report away and filing a damage report. That's a **suppressed exception**: the alarm is still the main event, and the damage is attached to it.",
            "A slip that names no book (a `null` resource) means there's nothing to return, and the librarian simply waves the reader through.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down. The librarian only knows about books written on slips at the counter. A book someone picked up inside the reading room isn't on any slip, and nobody checks it at the exit: try-with-resources closes only what's declared in its header, never objects created in the body. A real librarian can also chase a reader down the street later, but `close()` is called exactly once, at the end of the block, and if the building burns down (the JVM is killed, or `System.exit` runs inside the block) nobody returns anything.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Anatomy",
        },
        {
          type: "code",
          language: "java",
          code: `try (BufferedReader in = Files.newBufferedReader(source);   // resource 1
     BufferedWriter out = Files.newBufferedWriter(target)) { // resource 2
    // body: in and out are in scope here, and final
} catch (IOException e) {
    // optional: in and out are already closed, and out of scope
} finally {
    // optional: runs last
}`,
        },
        {
          type: "table",
          headers: ["Part", "Rule"],
          rows: [
            ["Resource specification", "One or more resources in parentheses, separated by `;`. A trailing `;` before `)` is allowed"],
            ["A resource", "Either a local variable declaration with an initializer (`Type name = expr` or `var name = expr`), or, since Java 9, a reference to an existing local variable that is `final` or effectively final, or to a `final` field"],
            ["Type", "Must be a subtype of `java.lang.AutoCloseable`, checked at compile time"],
            ["Declared resource variable", "Implicitly `final`. Assigning to it is a compile error"],
            ["Scope", "From its declaration to the end of the try block. Later resources in the header can use earlier ones. Not visible in `catch` or `finally`"],
            ["`catch` and `finally`", "Both optional. A try-with-resources with neither is legal, unlike a plain `try`"],
            ["Close order", "Reverse of initialization, and only for resources that were initialized to a non-null value"],
            ["Exceptions", "`close()`'s declared exceptions must be caught or declared, like any other call"],
          ],
        },
        {
          type: "heading",
          text: "The two meanings (JLS 14.20.3)",
        },
        {
          type: "paragraph",
          text: "The JLS defines the statement in two steps. A **basic** try-with-resources has no `catch` and no `finally`, and its meaning is given as a translation into ordinary `try`/`catch`/`finally` code (JLS 14.20.3.1); Internal Working puts that translation next to what `javac` really emits. An **extended** one, with a `catch` or a `finally`, is defined as a basic one wrapped in an outer `try` that holds the `catch` and `finally` (JLS 14.20.3.2):",
        },
        {
          type: "code",
          language: "java",
          code: `// what I write                     // what it means
try (R r = open()) {                 try {
    body();                              try (R r = open()) {
} catch (X e) {                              body();
    handle(e);                           }                // r closed here
} finally {                          } catch (X e) {
    cleanup();                           handle(e);       // r already closed
}                                    } finally {
                                         cleanup();
                                     }`,
        },
        {
          type: "paragraph",
          text: "That one rule explains three behaviours that look surprising at first. `catch` runs after the close, so the resource is unusable there. `catch` also sees exceptions thrown by the resource's initializer and by `close()` itself, because they all happen inside the inner statement. And the resource variable isn't in scope in `catch`, because it belongs to the inner `try`.",
        },
        {
          type: "heading",
          text: "AutoCloseable and Closeable",
        },
        {
          type: "code",
          language: "bash",
          code: "javap java.lang.AutoCloseable java.io.Closeable",
        },
        {
          type: "output",
          text: `Compiled from "AutoCloseable.java"
public interface java.lang.AutoCloseable {
  public abstract void close() throws java.lang.Exception;
}
Compiled from "Closeable.java"
public interface java.io.Closeable extends java.lang.AutoCloseable {
  public abstract void close() throws java.io.IOException;
}`,
        },
        {
          type: "table",
          headers: ["", "`AutoCloseable`", "`Closeable`"],
          rows: [
            ["Package, since", "`java.lang`, Java 7", "`java.io`, Java 5 (extends `AutoCloseable` since 7)"],
            ["`close()` throws", "`Exception`", "`IOException`, a narrower override"],
            ["Calling `close()` twice", "\"not required to be idempotent\", though implementers are \"strongly encouraged\" to make it so", "Must have no effect the second time"],
            ["Typical implementers", "JDBC types, `Stream`, `ExecutorService`, `HttpClient`, my own resources", "Streams, readers, writers, channels, `Scanner`, `ZipFile`"],
            ["Usable in try-with-resources", "Yes", "Yes, because it is an `AutoCloseable`"],
          ],
        },
        {
          type: "paragraph",
          text: "The quotes are from the Javadoc of `AutoCloseable.close()`, which also asks implementers to throw the most specific exception they can (or none), to release the resource and mark it closed **before** throwing, and not to throw `InterruptedException` from `close()` at all. The AutoCloseable vs Closeable section shows why each of those matters.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "There's nothing in the class file format or the JVM for try-with-resources. `javac` lowers it to ordinary instructions and an exception table, the same machinery the try, catch and finally lesson took apart. I compiled the smallest version twice, once with a resource from a method call and once from `new`:",
        },
        {
          type: "code",
          language: "java",
          title: "TwrBytecode.java",
          code: `public class TwrBytecode {
    static class Res implements AutoCloseable {
        void use() { }

        @Override
        public void close() { }
    }

    static Res open() {
        return new Res();
    }

    static void viaMethod() {
        try (Res r = open()) {
            r.use();
        }
    }

    static void viaNew() {
        try (Res r = new Res()) {
            r.use();
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac TwrBytecode.java && javap -c -p TwrBytecode",
        },
        {
          type: "output",
          text: `  static void viaMethod();
    Code:
       0: invokestatic  #10                 // Method open:()LTwrBytecode$Res;
       3: astore_0
       4: aload_0
       5: invokevirtual #16                 // Method TwrBytecode$Res.use:()V
       8: aload_0
       9: ifnull        39
      12: aload_0
      13: invokevirtual #19                 // Method TwrBytecode$Res.close:()V
      16: goto          39
      19: astore_1
      20: aload_0
      21: ifnull        37
      24: aload_0
      25: invokevirtual #19                 // Method TwrBytecode$Res.close:()V
      28: goto          37
      31: astore_2
      32: aload_1
      33: aload_2
      34: invokevirtual #24                 // Method java/lang/Throwable.addSuppressed:(Ljava/lang/Throwable;)V
      37: aload_1
      38: athrow
      39: return
    Exception table:
       from    to  target type
           4     8    19   Class java/lang/Throwable
          24    28    31   Class java/lang/Throwable

  static void viaNew();
    Code:
       0: new           #7                  // class TwrBytecode$Res
       3: dup
       4: invokespecial #9                  // Method TwrBytecode$Res."<init>":()V
       7: astore_0
       8: aload_0
       9: invokevirtual #16                 // Method TwrBytecode$Res.use:()V
      12: aload_0
      13: invokevirtual #19                 // Method TwrBytecode$Res.close:()V
      16: goto          35
      19: astore_1
      20: aload_0
      21: invokevirtual #19                 // Method TwrBytecode$Res.close:()V
      24: goto          33
      27: astore_2
      28: aload_1
      29: aload_2
      30: invokevirtual #24                 // Method java/lang/Throwable.addSuppressed:(Ljava/lang/Throwable;)V
      33: aload_1
      34: athrow
      35: return
    Exception table:
       from    to  target type
           8    12    19   Class java/lang/Throwable
          20    24    27   Class java/lang/Throwable`,
        },
        {
          type: "paragraph",
          text: "Reading `viaMethod` from the top:",
        },
        {
          type: "list",
          items: [
            "**0 to 3:** the resource is created and stored in local slot 0. That happens **before** the protected range starts at 4, so if `open()` throws there's nothing to close and nothing is attempted.",
            "**4 to 8:** the body, `r.use()`. The first exception table entry covers exactly this range and sends any `Throwable` to offset 19.",
            "**8 to 16, the normal path:** a null check (`ifnull 39`) and then a plain `close()`. This call is outside every protected range, so if it throws on the normal path, that exception simply propagates. Nothing is suppressed, because there was nothing to suppress.",
            "**19 to 38, the exception path:** the body's exception is stored in slot 1. Then the same null check and a second `close()` call, this one protected by the second table entry. If it throws, the handler at 31 stores the close failure in slot 2 and calls `slot1.addSuppressed(slot2)`. Either way, offset 37 rethrows the **original** exception with `athrow`.",
            "There are two `close()` call sites, one per path, which is the same duplication `javac` uses for `finally` blocks.",
          ],
        },
        {
          type: "paragraph",
          text: "`viaNew` is identical except for one thing: there's no `ifnull`. The result of `new` can never be `null`, and `javac` knows it, so it drops both null checks. Any other expression, a method call, a field or a ternary, gets the check.",
        },
        {
          type: "heading",
          text: "The JLS translation, compiled by hand",
        },
        {
          type: "paragraph",
          text: "JLS 14.20.3.1 defines a basic try-with-resources with one declared resource as this translation, where `#primaryExc`, `#t` and `#suppressedExc` are names the program can't see. I wrote it out as real Java to compare it with what `javac` emits:",
        },
        {
          type: "code",
          language: "java",
          title: "HandWritten.java",
          code: `public class HandWritten {
    static class Res implements AutoCloseable {
        void use() { }

        @Override
        public void close() { }
    }

    static Res open() {
        return new Res();
    }

    // JLS 14.20.3.1's translation of: try (Res r = open()) { r.use(); }
    static void spelledOut() {
        final Res r = open();
        Throwable primary = null;
        try {
            r.use();
        } catch (Throwable t) {
            primary = t;
            throw t;
        } finally {
            if (r != null) {
                if (primary != null) {
                    try {
                        r.close();
                    } catch (Throwable suppressed) {
                        primary.addSuppressed(suppressed);
                    }
                } else {
                    r.close();
                }
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac HandWritten.java && javap -c -p HandWritten",
        },
        {
          type: "output",
          text: `  static void spelledOut();
    Code:
       0: invokestatic  #10                 // Method open:()LHandWritten$Res;
       3: astore_0
       4: aconst_null
       5: astore_1
       6: aload_0
       7: invokevirtual #16                 // Method HandWritten$Res.use:()V
      10: aload_0
      11: ifnull        79
      14: aload_1
      15: ifnull        34
      ...
      41: astore_2
      42: aload_2
      43: astore_1
      44: aload_2
      45: athrow
      46: astore_3
      47: aload_0
      48: ifnull        77
      ...
      77: aload_3
      78: athrow
      79: return
    Exception table:
       from    to  target type
          18    22    25   Class java/lang/Throwable
           6    10    41   Class java/lang/Throwable
           6    10    46   any
          55    59    62   Class java/lang/Throwable
          41    47    46   any`,
        },
        {
          type: "list",
          items: [
            "Same behaviour, twice the code: 80 bytes of bytecode and five exception table entries, against 40 bytes and two for the real statement.",
            "The difference is that `javac` doesn't compile the translation literally. It knows that on the normal path no exception happened, so it skips the `primary != null` test and calls `close()` directly; on the exception path it knows `primary` is set, so it goes straight to the guarded `close()` and `addSuppressed`. The `primary` variable disappears altogether.",
            "The hand-written `finally` was copied into the normal path and the `any` handler, which is the general `finally` duplication from the try, catch and finally lesson. try-with-resources is specified in terms of `finally` but compiled more cleverly than a `finally` I could write.",
            "`throw t;` compiles in a method with no `throws` clause because `t` is an effectively final catch parameter, so Java 7's precise rethrow knows it can only be one of the body's unchecked exceptions. The throw, throws and Custom Exceptions lesson covers that rule.",
          ],
        },
        {
          type: "paragraph",
          text: "The JLS defines only the meaning, so the exact bytecode is up to the compiler. I compiled `TwrBytecode` with `javac` 17, 21 and 25 and disassembled all three class files with the same `javap`: the instructions and exception tables were identical, and only the class file version differed.",
        },
        {
          type: "heading",
          text: "Several resources",
        },
        {
          type: "paragraph",
          text: "With two resources, JLS 14.20.3.1 translates `try (A a = ...; B b = ...) body` as `try (A a = ...) { try (B b = ...) body }`: one nested statement per resource. That's where the reverse order comes from. The inner statement closes `b` when its block ends, and only then does the outer block end and close `a`. It also explains what happens when `B`'s initializer throws: the exception escapes the inner statement before `b` exists, and the outer statement closes `a` with that exception as the primary.",
        },
        {
          type: "heading",
          text: "Where close() shows up in a stack trace",
        },
        {
          type: "paragraph",
          text: "The generated `close()` calls have no source line of their own, so `javac` attributes them to the line where the `try` statement starts. In the Suppressed Exceptions section, both close failures show `at SuppressedDemo.process(SuppressedDemo.java:16)`, and line 16 is the `try (` line, not the line of the resource that failed. When a trace points at a `try (...)` line, the failure came from opening or closing one of its resources.",
        },
      ],
    },
    {
      title: "Closing by Hand: The Bugs It Fixes",
      blocks: [
        {
          type: "paragraph",
          text: "To see the problem properly, I wrote a fake file class that counts how many instances are open, can fail to open (empty name), always fails to read, and can be told to fail on close. Then three methods, one per classic mistake:",
        },
        {
          type: "code",
          language: "java",
          title: "ManualClose.java",
          code: `import java.io.IOException;

public class ManualClose {
    static class ReportFile {
        static int openCount = 0;                     // how many are open right now
        private final String name;
        private final boolean failOnClose;

        ReportFile(String name, boolean failOnClose) throws IOException {
            if (name.isEmpty()) {
                throw new IOException("cannot open a file with no name");
            }
            this.name = name;
            this.failOnClose = failOnClose;
            openCount++;
            System.out.println("  opened " + name);
        }

        String readLine() throws IOException {
            throw new IOException("read failed in " + name);
        }

        void close() throws IOException {
            openCount--;
            System.out.println("  closed " + name);
            if (failOnClose) {
                throw new IOException("close failed for " + name);
            }
        }
    }

    // Bug 1: close() sits on the happy path only
    static void forgetful(String name) throws IOException {
        ReportFile file = new ReportFile(name, false);
        System.out.println("  first line: " + file.readLine());
        file.close();                                 // never reached when readLine throws
    }

    // Bug 2: the finally block assumes the open succeeded
    static void npeInFinally(String name) throws IOException {
        ReportFile file = null;
        try {
            file = new ReportFile(name, false);
            System.out.println("  first line: " + file.readLine());
        } finally {
            file.close();                             // file is still null if the constructor threw
        }
    }

    // Bug 3: close() throws and replaces the real failure
    static void hiddenCause(String name) throws IOException {
        ReportFile file = new ReportFile(name, true);
        try {
            System.out.println("  first line: " + file.readLine());
        } finally {
            file.close();
        }
    }

    public static void main(String[] args) {
        System.out.println("1) forgetting to close");
        for (int i = 0; i < 3; i++) {
            try {
                forgetful("orders-" + i + ".csv");
            } catch (IOException e) {
                System.out.println("  caught: " + e.getMessage());
            }
        }
        System.out.println("  still open: " + ReportFile.openCount);

        System.out.println("2) open fails, finally runs anyway");
        try {
            npeInFinally("");
        } catch (Exception e) {
            System.out.println("  caught: " + e);
        }

        System.out.println("3) close fails after the read failed");
        try {
            hiddenCause("customers.csv");
        } catch (Exception e) {
            System.out.println("  caught: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `1) forgetting to close
  opened orders-0.csv
  caught: read failed in orders-0.csv
  opened orders-1.csv
  caught: read failed in orders-1.csv
  opened orders-2.csv
  caught: read failed in orders-2.csv
  still open: 3
2) open fails, finally runs anyway
  caught: java.lang.NullPointerException: Cannot invoke "ManualClose$ReportFile.close()" because "<local1>" is null
3) close fails after the read failed
  opened customers.csv
  closed customers.csv
  caught: java.io.IOException: close failed for customers.csv`,
        },
        {
          type: "list",
          items: [
            "**Bug 1, the leak.** `close()` only runs if every line before it succeeds. Three failed reads left three files open, and nothing in the output says so. With real files, each one is an operating-system file descriptor until the process exits or, maybe, the garbage collector's cleanup gets to it.",
            "**Bug 2, the NullPointerException.** The constructor threw, so `file` was still `null` when `finally` ran, and `file.close()` threw an NPE. The NPE escaped from `finally` and **replaced** the real `IOException` (\"cannot open a file with no name\"). `<local1>` is slot 1, `file`, because the class was compiled without `-g`; the Methods lesson explains the slot numbering.",
            "**Bug 3, the lost cause.** The read failed, then the close failed too, and the close exception replaced the read exception, because an exception thrown from `finally` replaces the one in flight (the try, catch and finally lesson showed the same thing with `FinallyThrows`). It isn't the cause and it isn't suppressed: it's gone. Whoever reads the log learns that a close failed and never learns that the read failed first, which is the actual problem.",
          ],
        },
        {
          type: "paragraph",
          text: "Before Java 7, the code that avoided all three looked like this, and every resource needed its own copy of it:",
        },
        {
          type: "code",
          language: "java",
          code: `ReportFile file = new ReportFile(name, false);   // open outside the try: no null check needed
try {
    process(file);
} finally {
    try {
        file.close();
    } catch (IOException closeFailure) {
        // log and ignore? then a failed close on the normal path is lost too
    }
}`,
        },
        {
          type: "paragraph",
          text: "Even that version has to choose between losing the close failure (it's swallowed on every path, including the normal one where it's the only failure) and losing the body's exception. Doing the right thing on both paths needs a variable that remembers whether the body failed, which is exactly the `primary` variable in the JLS translation above. With two resources it nests twice. Here's the same class as an `AutoCloseable`, with try-with-resources:",
        },
        {
          type: "code",
          language: "java",
          title: "TwrFixed.java",
          code: `import java.io.IOException;

public class TwrFixed {
    static class ReportFile implements AutoCloseable {
        static int openCount = 0;
        private final String name;
        private final boolean failOnClose;

        ReportFile(String name, boolean failOnClose) throws IOException {
            if (name.isEmpty()) {
                throw new IOException("cannot open a file with no name");
            }
            this.name = name;
            this.failOnClose = failOnClose;
            openCount++;
            System.out.println("  opened " + name);
        }

        String readLine() throws IOException {
            throw new IOException("read failed in " + name);
        }

        @Override
        public void close() throws IOException {      // narrower than AutoCloseable's "throws Exception"
            openCount--;
            System.out.println("  closed " + name);
            if (failOnClose) {
                throw new IOException("close failed for " + name);
            }
        }
    }

    static void read(String name, boolean failOnClose) throws IOException {
        try (ReportFile file = new ReportFile(name, failOnClose)) {
            System.out.println("  first line: " + file.readLine());
        }
    }

    public static void main(String[] args) {
        System.out.println("1) three failed reads");
        for (int i = 0; i < 3; i++) {
            try {
                read("orders-" + i + ".csv", false);
            } catch (IOException e) {
                System.out.println("  caught: " + e.getMessage());
            }
        }
        System.out.println("  still open: " + ReportFile.openCount);

        System.out.println("2) open fails");
        try {
            read("", false);
        } catch (IOException e) {
            System.out.println("  caught: " + e);
        }

        System.out.println("3) close fails after the read failed");
        try {
            read("customers.csv", true);
        } catch (IOException e) {
            System.out.println("  caught: " + e);
            for (Throwable s : e.getSuppressed()) {
                System.out.println("  suppressed: " + s);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `1) three failed reads
  opened orders-0.csv
  closed orders-0.csv
  caught: read failed in orders-0.csv
  opened orders-1.csv
  closed orders-1.csv
  caught: read failed in orders-1.csv
  opened orders-2.csv
  closed orders-2.csv
  caught: read failed in orders-2.csv
  still open: 0
2) open fails
  caught: java.io.IOException: cannot open a file with no name
3) close fails after the read failed
  opened customers.csv
  closed customers.csv
  caught: java.io.IOException: read failed in customers.csv
  suppressed: java.io.IOException: close failed for customers.csv`,
        },
        {
          type: "list",
          items: [
            "**Bug 1 is gone:** every file was closed even though every read failed, and the count went back to 0. Note \"closed\" is printed before \"caught\": the close happened before the exception reached the caller's `catch`.",
            "**Bug 2 is gone:** the constructor threw before the resource existed, so there was nothing to close and no NPE. The caller got the real `IOException`.",
            "**Bug 3 is gone:** the caller got the read failure, the one that matters, and the close failure is still there, attached as a suppressed exception.",
            "The `read` method is three lines. That's the real win: the correct version is now also the shortest one.",
          ],
        },
      ],
    },
    {
      title: "AutoCloseable vs Closeable",
      blocks: [
        {
          type: "paragraph",
          text: "Both interfaces have one method, `close()`. The differences are in the contract around it, and each one shows up in real code.",
        },
        {
          type: "heading",
          text: "The checked exception",
        },
        {
          type: "paragraph",
          text: "`AutoCloseable.close()` declares `throws Exception`. If the resource's **static** type is `AutoCloseable` itself, the implicit close call can throw any checked exception, and the compiler insists that it's handled:",
        },
        {
          type: "code",
          language: "java",
          title: "UnreportedClose.java",
          code: `public class UnreportedClose {
    public static void main(String[] args) {
        try (AutoCloseable session = () -> System.out.println("closed")) {
            System.out.println("working");
        }
    }
}`,
        },
        {
          type: "output",
          text: `UnreportedClose.java:3: error: unreported exception Exception; must be caught or declared to be thrown
        try (AutoCloseable session = () -> System.out.println("closed")) {
                           ^
  exception thrown from implicit call to close() on resource variable 'session'
1 error`,
        },
        {
          type: "paragraph",
          text: "The second line of the error is the useful one: the exception comes from a call I never wrote. What the compiler checks is the `close()` of the declared type, so the fix is a narrower type, not a `catch (Exception e)`. A `Closeable` resource only needs `IOException` handled, and my own resource classes can override `close()` with no `throws` clause at all, like `ScopedTimer` and `LockGuard` later in this lesson. An override can narrow the exceptions, never widen them, which the Polymorphism lesson covered for overriding in general.",
        },
        {
          type: "heading",
          text: "Idempotence",
        },
        {
          type: "paragraph",
          text: "`Closeable.close()` must do nothing when the resource is already closed. `AutoCloseable.close()` is only encouraged to. It matters because double closes happen all the time without anyone writing two `close()` calls: a wrapper like `BufferedReader` closes the reader it wraps, so if both are declared as resources, the inner one is closed twice. I built a tiny connection pool to see what that does to a resource that isn't idempotent:",
        },
        {
          type: "code",
          language: "java",
          title: "CloseTwice.java",
          code: `import java.io.BufferedReader;
import java.io.StringReader;

public class CloseTwice {
    static int freeConnections = 2;

    // Not idempotent: every close() returns a connection, even the second one
    static class PooledConnection implements AutoCloseable {
        PooledConnection() {
            freeConnections--;
        }

        @Override
        public void close() {
            freeConnections++;
        }
    }

    // Idempotent: remembers that it already gave the connection back
    static class SafeConnection implements AutoCloseable {
        private boolean closed;

        SafeConnection() {
            freeConnections--;
        }

        @Override
        public void close() {
            if (closed) {
                return;
            }
            closed = true;
            freeConnections++;
        }
    }

    // A wrapper that closes what it wraps, like BufferedReader does
    record Session(AutoCloseable connection) implements AutoCloseable {
        @Override
        public void close() throws Exception {
            connection.close();
        }
    }

    public static void main(String[] args) throws Exception {
        try (PooledConnection c = new PooledConnection();
             Session s = new Session(c)) {
            System.out.println("in use:      free = " + freeConnections);
        }
        System.out.println("plain:       free = " + freeConnections + "  (the pool only has 2)");

        freeConnections = 2;
        try (SafeConnection c = new SafeConnection();
             Session s = new Session(c)) {
            System.out.println("in use:      free = " + freeConnections);
        }
        System.out.println("idempotent:  free = " + freeConnections);

        BufferedReader reader = new BufferedReader(new StringReader("x"));
        reader.close();
        reader.close();                                      // Closeable: no effect the second time
        System.out.println("BufferedReader closed twice without complaint");
    }
}`,
        },
        {
          type: "output",
          text: `in use:      free = 1
plain:       free = 3  (the pool only has 2)
in use:      free = 1
idempotent:  free = 2
BufferedReader closed twice without complaint`,
        },
        {
          type: "paragraph",
          text: "`Session.close()` returned the connection, then the outer resource closed the same connection again, and a two-connection pool claimed to have three free. With the `closed` flag the second call is a no-op. Every `close()` I write gets that flag, whether the interface requires it or not.",
        },
        {
          type: "heading",
          text: "Release first, then throw",
        },
        {
          type: "paragraph",
          text: "The Javadoc's other request is that a `close()` that can fail should release what it holds and mark itself closed **before** throwing. A caller has no way to retry a close, and try-with-resources certainly won't, so a `close()` that throws halfway leaves the resource leaked forever. `ManualClose.ReportFile` above follows the rule by accident: it decrements `openCount` and only then throws.",
        },
        {
          type: "heading",
          text: "No InterruptedException from close()",
        },
        {
          type: "paragraph",
          text: "The last request is not to throw `InterruptedException` from `close()`. If the body has already failed, a close failure becomes a suppressed exception and nobody looks at it, and swallowing an `InterruptedException` loses the interrupt that another thread used to ask this one to stop. `javac -Xlint:try` warns about it, and about a resource that's never used in the body:",
        },
        {
          type: "code",
          language: "java",
          title: "LintTry.java",
          code: `public class LintTry {
    static class Job implements AutoCloseable {
        @Override
        public void close() throws Exception { }
    }

    public static void main(String[] args) throws Exception {
        try (Job job = new Job()) {
            System.out.println("job resource never used in the body");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -Xlint:try LintTry.java",
        },
        {
          type: "output",
          text: `LintTry.java:2: warning: [try] auto-closeable resource Job has a member method close() that could throw InterruptedException
    static class Job implements AutoCloseable {
           ^
LintTry.java:8: warning: [try] auto-closeable resource Job has a member method close() that could throw InterruptedException
        try (Job job = new Job()) {
                 ^
LintTry.java:8: warning: [try] auto-closeable resource job is never referenced in body of corresponding try statement
        try (Job job = new Job()) {
                 ^
3 warnings`,
        },
        {
          type: "paragraph",
          text: "`throws Exception` includes `InterruptedException`, so copying the interface's signature into an implementation is enough to trigger the warning; declaring nothing or `IOException` fixes it. The \"never referenced\" warning is for resources held only for their open/close side effect, like a lock guard. That's legitimate, and since Java 22 an unnamed variable (`var _`) says so explicitly, as the Resources section shows.",
        },
      ],
    },
    {
      title: "Close Order and Timing",
      blocks: [
        {
          type: "heading",
          text: "Reverse order",
        },
        {
          type: "paragraph",
          text: "Three resources named after the JDBC trio, because that's the classic case where the order matters: a result set belongs to a statement, which belongs to a connection.",
        },
        {
          type: "code",
          language: "java",
          title: "CloseOrder.java",
          code: `public class CloseOrder {
    record Tracked(String name) implements AutoCloseable {
        Tracked {
            System.out.println("open  " + name);
        }

        @Override
        public void close() {
            System.out.println("close " + name);
        }
    }

    public static void main(String[] args) {
        try (Tracked connection = new Tracked("connection");
             Tracked statement = new Tracked("statement");
             Tracked resultSet = new Tracked("resultSet")) {
            System.out.println("body  uses " + connection.name() + ", "
                    + statement.name() + ", " + resultSet.name());
        }
        System.out.println("after the try");
    }
}`,
        },
        {
          type: "output",
          text: `open  connection
open  statement
open  resultSet
body  uses connection, statement, resultSet
close resultSet
close statement
close connection
after the try`,
        },
        {
          type: "paragraph",
          text: "Last opened, first closed, like frames on a stack. That's the safe order whenever a later resource depends on an earlier one: the result set is closed while its statement and connection are still alive, and the connection isn't closed under objects still using it. It falls straight out of the nesting in the JLS translation, so it isn't something to configure.",
        },
        {
          type: "heading",
          text: "Closing happens before catch and finally",
        },
        {
          type: "code",
          language: "java",
          title: "CloseTiming.java",
          code: `public class CloseTiming {
    static class Printer implements AutoCloseable {
        Printer() {
            System.out.println("1. printer opened");
        }

        void print(String doc) {
            System.out.println("2. printing " + doc + ", then failing");
            throw new IllegalStateException("paper jam");
        }

        @Override
        public void close() {
            System.out.println("3. printer closed");
        }
    }

    public static void main(String[] args) {
        try (Printer printer = new Printer()) {
            printer.print("invoice.pdf");
        } catch (IllegalStateException e) {
            System.out.println("4. catch: " + e.getMessage());
        } finally {
            System.out.println("5. finally");
        }
    }
}`,
        },
        {
          type: "output",
          text: `1. printer opened
2. printing invoice.pdf, then failing
3. printer closed
4. catch: paper jam
5. finally`,
        },
        {
          type: "paragraph",
          text: "The printer was closed (3) before the `catch` saw the paper jam (4). That's the extended-statement rule from The Technical Picture, and it has a practical consequence: a `catch` attached to the try-with-resources can't use the resource to recover, for example to roll back a transaction on a connection. The resource is already closed, and the variable isn't even in scope there. Recovery that needs the resource goes in a `try`/`catch` **inside** the body.",
        },
        {
          type: "heading",
          text: "A return inside the block",
        },
        {
          type: "code",
          language: "java",
          title: "ReturnInside.java",
          code: `public class ReturnInside {
    static class Library implements AutoCloseable {
        Library() {
            System.out.println("library opened");
        }

        String borrow(String title) {
            System.out.println("borrowing " + title);
            return title.toUpperCase();
        }

        @Override
        public void close() {
            System.out.println("library closed");
        }
    }

    static String borrow(String title) {
        try (Library library = new Library()) {
            return library.borrow(title);              // value computed first, then close, then return
        } finally {
            System.out.println("finally");
        }
    }

    public static void main(String[] args) {
        System.out.println("main got " + borrow("Dune"));
    }
}`,
        },
        {
          type: "output",
          text: `library opened
borrowing Dune
library closed
finally
main got DUNE`,
        },
        {
          type: "paragraph",
          text: "The `return` expression is evaluated while the resource is open, then the resource is closed, then `finally` runs, then the method returns the value it already computed. So returning data read from a resource is fine. Returning the resource itself, or something lazy that still needs it, like a `Stream` from `lines()`, is not: the caller gets it already closed. The When to Use section has that bug with real output.",
        },
        {
          type: "heading",
          text: "When opening the second resource fails",
        },
        {
          type: "code",
          language: "java",
          title: "InitFailure.java",
          code: `public class InitFailure {
    static class Tracked implements AutoCloseable {
        private final String name;

        Tracked(String name, boolean fail) {
            if (fail) {
                System.out.println("open  " + name + " FAILED");
                throw new IllegalStateException("cannot open " + name);
            }
            this.name = name;
            System.out.println("open  " + name);
        }

        @Override
        public void close() {
            System.out.println("close " + name);
        }
    }

    public static void main(String[] args) {
        try (Tracked first = new Tracked("first", false);
             Tracked second = new Tracked("second", true);
             Tracked third = new Tracked("third", false)) {
            System.out.println("body never runs");
        } catch (IllegalStateException e) {
            System.out.println("catch " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `open  first
open  second FAILED
close first
catch cannot open second`,
        },
        {
          type: "list",
          items: [
            "Resources are initialized left to right, and each one is closed only if its initializer completed. `first` was closed; `second` never existed, so there was nothing to close; `third` was never even attempted.",
            "The body didn't run, and the `catch` still received the constructor's exception, because initializers run inside the inner statement.",
            "This is why each layer of a wrapped stream should be its own resource. In `new BufferedReader(new FileReader(f))` the inner `FileReader` is just an argument, not a resource, so if the wrapper's constructor throws, nobody closes it. `WrapperLeak` in the Common Resources section measures that leak.",
          ],
        },
      ],
    },
    {
      title: "Suppressed Exceptions",
      blocks: [
        {
          type: "paragraph",
          text: "When the body throws and then a `close()` throws as well, there are two exceptions and a method can only throw one. try-with-resources keeps the body's exception as the **primary** one and attaches the close failure to it with `primary.addSuppressed(closeFailure)`, the call I saw in the bytecode. With two resources both failing to close, the primary collects both:",
        },
        {
          type: "code",
          language: "java",
          title: "SuppressedDemo.java",
          code: `public class SuppressedDemo {
    static class Resource implements AutoCloseable {
        private final String name;

        Resource(String name) {
            this.name = name;
        }

        @Override
        public void close() {
            throw new IllegalStateException("close failed: " + name);
        }
    }

    static void process() {
        try (Resource file = new Resource("file");
             Resource cursor = new Resource("cursor")) {
            throw new RuntimeException("body failed");
        }
    }

    public static void main(String[] args) {
        try {
            process();
        } catch (RuntimeException e) {
            System.out.println("primary:    " + e.getMessage());
            for (Throwable s : e.getSuppressed()) {
                System.out.println("suppressed: " + s.getMessage());
            }
            System.out.println();
            e.printStackTrace();
        }
    }
}`,
        },
        {
          type: "output",
          text: `primary:    body failed
suppressed: close failed: cursor
suppressed: close failed: file

java.lang.RuntimeException: body failed
\tat SuppressedDemo.process(SuppressedDemo.java:18)
\tat SuppressedDemo.main(SuppressedDemo.java:24)
\tSuppressed: java.lang.IllegalStateException: close failed: cursor
\t\tat SuppressedDemo$Resource.close(SuppressedDemo.java:11)
\t\tat SuppressedDemo.process(SuppressedDemo.java:16)
\t\t... 1 more
\tSuppressed: java.lang.IllegalStateException: close failed: file
\t\tat SuppressedDemo$Resource.close(SuppressedDemo.java:11)
\t\tat SuppressedDemo.process(SuppressedDemo.java:16)
\t\t... 1 more`,
        },
        {
          type: "list",
          items: [
            "`getSuppressed()` returns the close failures in the order they happened: `cursor` first, because it was closed first.",
            "`printStackTrace()` prints each suppressed exception as an indented block starting with `Suppressed:`, after the primary's own frames and before any `Caused by:`. `... 1 more` means the remaining frame (`main`) is the same as in the enclosing trace. Logback and Log4j 2 print the same indented `Suppressed:` blocks, in their default layouts, when the exception object is passed as the last argument of the logging call.",
            "Both close frames say line 16, the `try (` line, as the Internal Working section explained.",
          ],
        },
        {
          type: "image",
          src: "/images/java/try-with-resources-suppressed.svg",
          alt: "A diagram of SuppressedDemo. On the left, six steps from top to bottom: open file, open cursor, the body throws RuntimeException body failed which becomes the primary exception, cursor.close() throws and is added with addSuppressed, file.close() throws and is added with addSuppressed, and the primary propagates to the caller's catch. On the right, the exception object the caller catches: RuntimeException body failed, with getSuppressed() holding IllegalStateException close failed: cursor at index 0 and close failed: file at index 1. Below it, a dashed box shows the same failure closed in hand-written finally blocks: the caller catches only the last close failure, close failed: file, body failed is gone and getSuppressed() is empty.",
          caption: "Close failures are attached to the body's exception in the order the resources close. A plain finally replaces the body's exception instead.",
        },
        {
          type: "heading",
          text: "Not lost, and not a cause",
        },
        {
          type: "paragraph",
          text: "The contrast with `finally` is already in this lesson: case 3 of `ManualClose` and case 3 of `TwrFixed` are the same failing read followed by the same failing close. With `finally`, the caller caught only `close failed for customers.csv`, and the read failure wasn't attached anywhere. With try-with-resources it caught `read failed in customers.csv` with the close failure inside it. Suppression is not chaining either: `getCause()` means \"this exception happened **because of** that one\", while a suppressed exception is an unrelated sibling that happened while cleaning up. The throw, throws and Custom Exceptions lesson covers causes.",
        },
        {
          type: "heading",
          text: "Close failures suppress each other too",
        },
        {
          type: "paragraph",
          text: "JLS 14.20.3 says an exception from closing one resource doesn't stop the others from closing, and that it's suppressed if an exception was thrown previously \"by an initializer, the try block, or the closing of a resource\". So the primary isn't always from the body:",
        },
        {
          type: "code",
          language: "java",
          title: "CloseChain.java",
          code: `public class CloseChain {
    record Res(String name, boolean failOnClose) implements AutoCloseable {
        @Override
        public void close() {
            System.out.println("closing " + name);
            if (failOnClose) {
                throw new IllegalStateException("close failed: " + name);
            }
        }
    }

    static Res failToOpen(String name) {
        throw new IllegalStateException("open failed: " + name);
    }

    static void report(RuntimeException e) {
        System.out.print("  thrown: " + e.getMessage());
        for (Throwable s : e.getSuppressed()) {
            System.out.print(" | suppressed: " + s.getMessage());
        }
        System.out.println();
    }

    public static void main(String[] args) {
        System.out.println("body ok, both closes fail");
        try (Res file = new Res("file", true);
             Res cursor = new Res("cursor", true)) {
            System.out.println("body ok");
        } catch (RuntimeException e) {
            report(e);
        }

        System.out.println("second open fails, first close fails");
        try (Res file = new Res("file", true);
             Res cursor = failToOpen("cursor")) {
            System.out.println("body never runs");
        } catch (RuntimeException e) {
            report(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `body ok, both closes fail
body ok
closing cursor
closing file
  thrown: close failed: cursor | suppressed: close failed: file
second open fails, first close fails
closing file
  thrown: open failed: cursor | suppressed: close failed: file`,
        },
        {
          type: "paragraph",
          text: "With a clean body, the first close failure (`cursor`) became the primary and the second was suppressed into it, and `file` was still closed after `cursor`'s close threw. When the second resource failed to open, that exception was the primary and `file`'s close failure went inside it.",
        },
        {
          type: "paragraph",
          text: "The first case also answers a question that comes up a lot: when the body succeeds, a failing `close()` **is** the exception, and nothing is suppressed into anything. Suppression only happens when there's already a primary. That's the right outcome for something like a buffered writer, where `close()` flushes the last bytes to disk and a failure there means the file is incomplete. It matches the bytecode in Internal Working, where the normal-path `close()` has no `addSuppressed` handler around it.",
        },
        {
          type: "heading",
          text: "The rules of addSuppressed",
        },
        {
          type: "code",
          language: "java",
          title: "SuppressionRules.java",
          code: `public class SuppressionRules {
    // An exception type that opts out of suppression (and of the stack trace)
    static class QuietException extends RuntimeException {
        QuietException(String message) {
            super(message, null, false, false);
        }
    }

    static class FailingClose implements AutoCloseable {
        @Override
        public void close() {
            throw new IllegalStateException("close failed");
        }
    }

    // A resource that remembers its failure and throws the same object again on close
    static class Sticky implements AutoCloseable {
        private RuntimeException failure;

        void write() {
            failure = new RuntimeException("write failed");
            throw failure;
        }

        @Override
        public void close() {
            if (failure != null) {
                throw failure;
            }
        }
    }

    public static void main(String[] args) {
        RuntimeException e = new RuntimeException("primary");
        try {
            e.addSuppressed(e);
        } catch (IllegalArgumentException x) {
            System.out.println("self:     " + x.getMessage());
        }
        try {
            e.addSuppressed(null);
        } catch (NullPointerException x) {
            System.out.println("null:     " + x.getMessage());
        }

        try (FailingClose r = new FailingClose()) {
            throw new QuietException("body failed");
        } catch (QuietException q) {
            System.out.println("disabled: " + q.getMessage() + ", suppressed " + q.getSuppressed().length);
        }

        try (Sticky s = new Sticky()) {
            s.write();
        } catch (RuntimeException x) {
            System.out.println("same object: " + x + ", cause: " + x.getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `self:     Self-suppression not permitted
null:     Cannot suppress a null exception.
disabled: body failed, suppressed 0
same object: java.lang.IllegalArgumentException: Self-suppression not permitted, cause: java.lang.RuntimeException: write failed`,
        },
        {
          type: "list",
          items: [
            "An exception can't suppress itself (`IllegalArgumentException`) or `null` (`NullPointerException`). Both checks are the first lines of `Throwable.addSuppressed`.",
            "The protected four-argument constructor `Throwable(message, cause, enableSuppression, writableStackTrace)`, also from Java 7, can turn suppression off. Then `addSuppressed` silently does nothing and `getSuppressed()` is empty, which is what `QuietException` showed. The Javadoc reserves this for special cases such as the JVM reusing a preallocated exception when memory is low.",
            "The last case is the surprising one. `Sticky.close()` rethrew the **same** exception object that the body threw, so the generated code called `failure.addSuppressed(failure)`. That threw `IllegalArgumentException`, which escaped from the try-with-resources and replaced the real error; the original survives only as its cause. A resource whose `close()` reports a stored failure should throw a new exception, with the stored one as the cause.",
          ],
        },
      ],
    },
    {
      title: "Resources: null, Existing Variables and Unnamed Ones",
      blocks: [
        {
          type: "heading",
          text: "A null resource is allowed",
        },
        {
          type: "paragraph",
          text: "The `ifnull` in the bytecode isn't defensive noise; the JLS says a resource is closed only if it was initialized to a non-null value. That makes \"maybe there's something to close\" code safe:",
        },
        {
          type: "code",
          language: "java",
          title: "NullResource.java",
          code: `import java.util.Set;

public class NullResource {
    static class BookReader implements AutoCloseable {
        private final String title;

        BookReader(String title) {
            this.title = title;
            System.out.println("opened " + title);
        }

        @Override
        public void close() {
            System.out.println("closed " + title);
        }
    }

    static final Set<String> CATALOG = Set.of("Dune");

    static BookReader openIfExists(String title) {
        return CATALOG.contains(title) ? new BookReader(title) : null;
    }

    public static void main(String[] args) {
        for (String title : new String[] {"Dune", "Emma"}) {
            try (BookReader reader = openIfExists(title)) {
                System.out.println(title + ": " + (reader == null ? "not in the catalog" : "reading"));
            }
        }
        System.out.println("no NullPointerException from the skipped close");
    }
}`,
        },
        {
          type: "output",
          text: `opened Dune
Dune: reading
closed Dune
Emma: not in the catalog
no NullPointerException from the skipped close`,
        },
        {
          type: "paragraph",
          text: "Only the close is protected. Using a `null` resource in the body still throws an NPE like any other `null`, so the body has to check, as this one does. I'd still rather return `Optional` or throw from a lookup than return a `null` resource; this rule is mostly useful for factories outside my control.",
        },
        {
          type: "heading",
          text: "Java 9: effectively final variables",
        },
        {
          type: "paragraph",
          text: "In Java 7 and 8, every resource had to be declared in the header. A resource that arrived as a parameter needed a pointless copy: `try (BufferedReader r = in)`. JEP 213 (Java 9) allows a plain reference to a variable, as long as it's `final` or effectively final:",
        },
        {
          type: "code",
          language: "java",
          title: "ExistingVariables.java",
          code: `import java.io.BufferedReader;
import java.io.StringReader;
import java.io.StringWriter;

public class ExistingVariables {
    static String upperCopy(BufferedReader in, StringWriter out) throws Exception {
        try (in; out) {                                // Java 9+: effectively final variables
            String line;
            while ((line = in.readLine()) != null) {
                out.write(line.toUpperCase());
                out.write('\\n');
            }
        }
        return out.toString();
    }

    public static void main(String[] args) throws Exception {
        BufferedReader in = new BufferedReader(new StringReader("book\\nlibrary\\n"));
        StringWriter out = new StringWriter();
        System.out.print(upperCopy(in, out));
        try {
            in.readLine();
        } catch (java.io.IOException e) {
            System.out.println("in after the try: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `BOOK
LIBRARY
in after the try: Stream closed`,
        },
        {
          type: "paragraph",
          text: "Two things to notice. The method closed objects it didn't create, which is only right because its contract says so; the When to Use section comes back to who owns a resource. And the variable is still in scope after the `try`, unlike a declared resource, so code can use the closed object by mistake, as `main` did on purpose here. If the variable is reassigned anywhere, the compiler rejects it:",
        },
        {
          type: "code",
          language: "java",
          title: "NotEffectivelyFinal.java",
          code: `import java.io.StringReader;

public class NotEffectivelyFinal {
    public static void main(String[] args) throws Exception {
        StringReader reader = new StringReader("first");
        if (args.length > 0) {
            reader = new StringReader(args[0]);
        }
        try (reader) {
            System.out.println((char) reader.read());
        }
    }
}`,
        },
        {
          type: "output",
          text: `NotEffectivelyFinal.java:9: error: variable reader used as a try-with-resources resource neither final nor effectively final
        try (reader) {
             ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The rule exists so that the object closed at the end is guaranteed to be the object the header named. A field works too (`try (this.out)`), if it's `final`.",
        },
        {
          type: "heading",
          text: "Unnamed resources (Java 22, so Java 25 too)",
        },
        {
          type: "paragraph",
          text: "Some resources exist only for their open and close: a lock guard, a timer, a scope that restores a setting. Naming them invites the \"never referenced\" lint warning. Java 22 finalized unnamed variables (JEP 456), and a try-with-resources resource is one of the places `_` is allowed. Here a method reference to `unlock` is the resource:",
        },
        {
          type: "code",
          language: "java",
          title: "UnnamedGuard.java",
          code: `import java.util.concurrent.locks.ReentrantLock;

public class UnnamedGuard {
    static final ReentrantLock LOCK = new ReentrantLock();

    static AutoCloseable locked() {
        LOCK.lock();
        return LOCK::unlock;
    }

    public static void main(String[] args) throws Exception {
        try (var _ = locked()) {
            System.out.println("inside, held: " + LOCK.isHeldByCurrentThread());
        }
        System.out.println("after,  held: " + LOCK.isHeldByCurrentThread());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac UnnamedGuard.java                       # JDK 21
javac --enable-preview --release 21 UnnamedGuard.java && java --enable-preview UnnamedGuard
# with JDK 25
javac UnnamedGuard.java && java UnnamedGuard`,
        },
        {
          type: "output",
          text: `UnnamedGuard.java:12: error: unnamed variables are a preview feature and are disabled by default.
        try (var _ = locked()) {
                 ^
  (use --enable-preview to enable unnamed variables)
1 error

Note: UnnamedGuard.java uses preview features of Java SE 21.
Note: Recompile with -Xlint:preview for details.
inside, held: true
after,  held: false

inside, held: true
after,  held: false`,
        },
        {
          type: "paragraph",
          text: "On JDK 21 it's a preview feature (JEP 443); JDK 25 compiled and ran it with no flags. `main` declares `throws Exception` because the resource's static type is plain `AutoCloseable`; the `LockGuard` in the next section avoids that with its own `close()` that throws nothing.",
        },
      ],
    },
    {
      title: "Writing My Own AutoCloseable",
      blocks: [
        {
          type: "paragraph",
          text: "Anything with a \"start\" and a matching \"end\" can be a resource: acquire and release a lock, start and stop a timer, set and restore a value, begin and end a transaction. The best example in the JDK is something that **isn't** one: `java.util.concurrent.locks.Lock` has `lock()` and `unlock()` but doesn't implement `AutoCloseable` (`javap` shows a plain `public interface java.util.concurrent.locks.Lock`). The documented idiom is `lock(); try { ... } finally { unlock(); }`, and forgetting the `finally` leaves the lock held forever: `AccountLock` in the try, catch and finally lesson showed a failed withdrawal leaving the lock held, so another thread's `tryLock()` got `false`. A small wrapper makes the safe version the short one. Here is the same bank account with a guard:",
        },
        {
          type: "code",
          language: "java",
          title: "LockGuardDemo.java",
          code: `import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class LockGuardDemo {
    // Lock is not AutoCloseable, so wrap it in something that is
    static final class LockGuard implements AutoCloseable {
        private final Lock lock;
        private boolean released;

        private LockGuard(Lock lock) {
            this.lock = lock;
        }

        static LockGuard acquire(Lock lock) {
            lock.lock();                              // acquire first, outside any try
            return new LockGuard(lock);
        }

        @Override
        public void close() {                         // no checked exception: callers need no catch
            if (!released) {                          // idempotent: a second close does nothing
                released = true;
                lock.unlock();
            }
        }
    }

    static class BankAccount {
        private final ReentrantLock lock = new ReentrantLock();
        private long balance = 1_000;

        void withdraw(long amount) {
            try (LockGuard guard = LockGuard.acquire(lock)) {
                if (amount > balance) {
                    throw new IllegalArgumentException("insufficient funds");
                }
                balance -= amount;
            }
        }

        boolean freeForOthers() throws InterruptedException {
            boolean[] got = new boolean[1];
            Thread other = new Thread(() -> {
                got[0] = lock.tryLock();
                if (got[0]) {
                    lock.unlock();
                }
            });
            other.start();
            other.join();
            return got[0];
        }
    }

    public static void main(String[] args) throws InterruptedException {
        BankAccount account = new BankAccount();
        try {
            account.withdraw(5_000);
        } catch (IllegalArgumentException e) {
            System.out.println("failed:    " + e.getMessage() + ", lock free for others: " + account.freeForOthers());
        }
        account.withdraw(300);
        System.out.println("succeeded: balance " + account.balance + ", lock free for others: " + account.freeForOthers());
    }
}`,
        },
        {
          type: "output",
          text: `failed:    insufficient funds, lock free for others: true
succeeded: balance 700, lock free for others: true`,
        },
        {
          type: "list",
          items: [
            "The withdrawal of 5,000 failed the same way as `AccountLock`'s leaky one, but this time another thread could take the lock straight afterwards, and the next withdrawal went through. With the leaky version, a plain `lock()` in that other thread would have blocked forever: a deadlock with no cycle in it, just a missing unlock.",
            "`acquire` locks **before** the guard exists, so if `lock()` itself fails there's no guard and nothing is unlocked. Unlocking a `ReentrantLock` the thread doesn't hold throws `IllegalMonitorStateException`, which is the same \"don't close what you didn't open\" rule as bug 2 in ManualClose.",
            "`close()` declares no exception, so `withdraw` needs no `catch` and no `throws`. The `released` flag makes it idempotent. It isn't thread-safe, and doesn't need to be, because a guard is used by the one thread that took the lock.",
          ],
        },
        {
          type: "paragraph",
          text: "The checklist I follow for my own resources, all of it from the `AutoCloseable` Javadoc or from the runs above:",
        },
        {
          type: "list",
          items: [
            "Acquire in a constructor or static factory, so the resource exists only if acquisition succeeded.",
            "Override `close()` with the narrowest `throws` clause possible, ideally none.",
            "Make `close()` idempotent with a flag.",
            "If `close()` can fail, release and mark closed first, then throw.",
            "Never throw `InterruptedException` from `close()`, and never rethrow a stored exception object; wrap it in a new one.",
            "If the type is meant to be used with try-with-resources only, say so in its Javadoc. There's no way to force callers to use it in a `try`.",
          ],
        },
      ],
    },
    {
      title: "Common Resources in the JDK",
      blocks: [
        {
          type: "heading",
          text: "Files: readers, writers, Files.lines, Scanner",
        },
        {
          type: "code",
          language: "java",
          title: "FileResources.java",
          code: `import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Scanner;
import java.util.stream.Stream;

public class FileResources {
    public static void main(String[] args) throws IOException {
        Path file = Files.createTempFile("books", ".csv");

        // Writing: the writer is flushed and closed when the block ends
        try (BufferedWriter out = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) {
            out.write("Dune,Herbert,1965\\n");
            out.write("Emma,Austen,1815\\n");
            out.write("Ulysses,Joyce,1922\\n");
        }

        // Reading line by line
        try (BufferedReader in = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            System.out.println("first line: " + in.readLine());
        }

        // Files.lines is lazy and holds the file open until the stream is closed
        try (Stream<String> lines = Files.lines(file)) {
            long before1900 = lines.filter(l -> Integer.parseInt(l.split(",")[2]) < 1900).count();
            System.out.println("books before 1900: " + before1900);
        }

        // Scanner is Closeable too
        try (Scanner scanner = new Scanner(file)) {
            scanner.useDelimiter(",");
            System.out.println("first title via Scanner: " + scanner.next());
        }

        Files.delete(file);
        System.out.println("deleted: " + !Files.exists(file));
    }
}`,
        },
        {
          type: "output",
          text: `first line: Dune,Herbert,1965
books before 1900: 1
first title via Scanner: Dune
deleted: true`,
        },
        {
          type: "list",
          items: [
            "For a writer, `close()` also flushes the buffer. Without it, the last few kilobytes may never reach the file. That's the case where a close failure on the normal path is the real error.",
            "`Files.lines`, `Files.list`, `Files.walk` and `Files.find` return streams backed by an open file or directory handle. Their Javadoc says to use them in a try-with-resources. A stream from `list.stream()` holds nothing and doesn't need one; the `AutoCloseable` Javadoc says exactly that about streams.",
            "Files are opened by the OS and counted against the process's file-descriptor limit. On Linux, `/proc/self/fd` lists them, which is what the next two programs count.",
          ],
        },
        {
          type: "heading",
          text: "Wrapped streams: declare every layer",
        },
        {
          type: "code",
          language: "java",
          title: "WrapperLeak.java",
          code: `import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public class WrapperLeak {
    static long openFds() throws IOException {               // Linux only
        try (var fds = Files.list(Path.of("/proc/self/fd"))) {
            return fds.count();
        }
    }

    public static void main(String[] args) throws IOException {
        File empty = Files.createTempFile("library", ".bin").toFile();   // 0 bytes: no stream header

        long start = openFds();
        for (int i = 0; i < 100; i++) {
            // Only the outer object is a resource. Its constructor throws, so nothing gets closed.
            try (ObjectInputStream in = new ObjectInputStream(new FileInputStream(empty))) {
                in.readObject();
            } catch (IOException | ClassNotFoundException e) {
                // EOFException from the ObjectInputStream constructor
            }
        }
        System.out.println("nested:   " + (openFds() - start) + " descriptors leaked");

        start = openFds();
        for (int i = 0; i < 100; i++) {
            // Each layer is its own resource, so the file is closed even if the wrapper fails
            try (FileInputStream file = new FileInputStream(empty);
                 ObjectInputStream in = new ObjectInputStream(file)) {
                in.readObject();
            } catch (IOException | ClassNotFoundException e) {
                // same EOFException
            }
        }
        System.out.println("separate: " + (openFds() - start) + " descriptors leaked");
        empty.delete();
    }
}`,
        },
        {
          type: "output",
          text: `nested:   100 descriptors leaked
separate: 0 descriptors leaked`,
        },
        {
          type: "paragraph",
          text: "`ObjectInputStream`'s constructor reads the stream header straight away, so on an empty file it throws `EOFException`. In the nested form, the `FileInputStream` was only an argument, the resource variable was never assigned, and 100 file descriptors stayed open. Declaring each layer separately closed all of them. It closes the `FileInputStream` twice when the wrapper is built successfully (once through the wrapper, once directly), which is harmless because `Closeable.close()` is idempotent. Many wrappers, like `BufferedReader`, do no I/O in their constructor, so the nested form is common and fine for them; for anything that does I/O in its constructor, I declare every layer.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Why not 100 forever?",
          text: "`FileInputStream` registers a `Cleaner` for its descriptor, the safety net from the Object Class Methods lesson, so a GC that finds those streams unreachable will eventually close them. Nothing promises when. In this short run no GC happened and all 100 stayed open. The production section shows a run where a GC did reclaim some of them, and why that's luck, not a fix.",
        },
        {
          type: "heading",
          text: "JDBC",
        },
        {
          type: "paragraph",
          text: "`Connection`, `Statement` and `ResultSet` all extend `AutoCloseable` (since JDBC 4.1, in Java 7), which `javap` confirms: `public interface java.sql.Connection extends java.sql.Wrapper,java.lang.AutoCloseable`. The standard shape, with a driver on the classpath, is:",
        },
        {
          type: "code",
          language: "java",
          code: `try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement(
             "SELECT id, name FROM employee WHERE department = ?")) {
    ps.setString(1, "Sales");
    try (ResultSet rs = ps.executeQuery()) {     // after the parameters are set
        while (rs.next()) {
            System.out.println(rs.getLong("id") + " " + rs.getString("name"));
        }
    }
}`,
        },
        {
          type: "list",
          items: [
            "The `ResultSet` goes in its own nested statement because it can only be created after `setString`. Closing a statement also closes its current result set, but closing it explicitly releases the database cursor as early as possible.",
            "With a connection pool (HikariCP, for example), `conn.close()` doesn't close the physical connection; it returns it to the pool. Forgetting it exhausts the pool rather than the database, and the next caller waits for a connection until the pool's timeout fires.",
            "In Spring, `JdbcTemplate` and JPA open and close these for me. try-with-resources is for code that touches JDBC directly. Spring Data JPA gets its own track.",
          ],
        },
        {
          type: "heading",
          text: "ExecutorService (Java 19) and HttpClient (Java 21)",
        },
        {
          type: "code",
          language: "java",
          title: "ModernResources.java",
          code: `import java.net.http.HttpClient;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

public class ModernResources {
    public static void main(String[] args) throws Exception {
        AtomicInteger done = new AtomicInteger();

        // ExecutorService is AutoCloseable since Java 19: close() = shutdown + wait
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            for (int i = 0; i < 4; i++) {
                pool.submit(() -> {
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    done.incrementAndGet();
                });
            }
            System.out.println("submitted, done so far: " + done.get());
        }
        System.out.println("after close, done: " + done.get());

        // HttpClient is AutoCloseable since Java 21
        HttpClient leaked;
        try (HttpClient client = HttpClient.newHttpClient()) {
            leaked = client;
            System.out.println("client terminated inside:  " + client.isTerminated());
        }
        System.out.println("client terminated after:   " + leaked.isTerminated());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ModernResources.java && java ModernResources     # JDK 21
javac ModernResources.java                             # the same file on JDK 17`,
        },
        {
          type: "output",
          text: `submitted, done so far: 0
after close, done: 4
client terminated inside:  false
client terminated after:   true

ModernResources.java:11: error: incompatible types: try-with-resources not applicable to variable type
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
                             ^
    (ExecutorService cannot be converted to AutoCloseable)
ModernResources.java:28: error: incompatible types: try-with-resources not applicable to variable type
        try (HttpClient client = HttpClient.newHttpClient()) {
                        ^
    (HttpClient cannot be converted to AutoCloseable)
...
4 errors`,
        },
        {
          type: "list",
          items: [
            "`ExecutorService.close()` is a default method that calls `shutdown()` and then waits in `awaitTermination` until every submitted task has finished; if the waiting thread is interrupted, it calls `shutdownNow()` and keeps waiting. So the end of the block is a join point: `done` was 0 when the body finished submitting (with tasks that sleep 100 ms, that's what I'd expect on any machine) and 4 after it. The History of Java and Stack vs Heap lessons used this with `Executors.newVirtualThreadPerTaskExecutor()`.",
            "That waiting is also the trap: a pool shared by the whole application must not be in a try-with-resources in one method, or the first request to finish shuts it down for everyone.",
            "`HttpClient.close()` shuts the client down and waits for in-flight requests; `isTerminated()` went from `false` to `true`. On JDK 17 both types are rejected (the other two errors are `isTerminated()` not existing yet).",
          ],
        },
        {
          type: "table",
          headers: ["Resource", "Interface", "What close() does"],
          rows: [
            ["`FileInputStream`, `BufferedReader`, `Files.newBufferedWriter`", "`Closeable`", "Releases the file descriptor; writers flush first"],
            ["`Stream` from `Files.lines`, `list`, `walk`", "`AutoCloseable`", "Closes the underlying file or directory handle"],
            ["`Scanner`, `ZipFile`, `Socket`, `ServerSocket`", "`Closeable`", "Closes the source, archive or socket"],
            ["`Connection`, `Statement`, `ResultSet`", "`AutoCloseable` (Java 7)", "Releases the connection (or returns it to a pool), statement or cursor"],
            ["`ExecutorService`", "`AutoCloseable` (Java 19)", "`shutdown()` and wait for the tasks"],
            ["`HttpClient`", "`AutoCloseable` (Java 21)", "Shut down and wait for in-flight requests"],
            ["Spring's `AnnotationConfigApplicationContext`", "`Closeable` (via `ConfigurableApplicationContext`)", "Destroys singleton beans; used in this track's Spring demos"],
            ["`URLClassLoader`", "`Closeable` (Java 7)", "Closes the JAR files it opened"],
            ["`Lock`", "Not a resource", "Needs a wrapper like `LockGuard`"],
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing case 3 of `TwrFixed`, `read(\"customers.csv\", true)`, where the read fails and then the close fails:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time, type check.** `javac` checks that `ReportFile` is a subtype of `AutoCloseable` and makes `file` implicitly final.",
            "**Compile time, exception check.** The constructor, `readLine()` and the implicit `close()` can all throw `IOException`. `javac` uses the `throws` clause of `ReportFile.close()`, not `AutoCloseable.close()`'s `Exception`, so `throws IOException` on `read` covers everything.",
            "**Compile time, lowering.** The statement becomes a store into a local slot, the body inside a protected range, one `close()` call on the normal path, and an exception handler that closes, catches a close failure, calls `addSuppressed` and rethrows. There's no `ifnull` because the resource comes from `new`.",
            "**Run time, open.** `new ReportFile(\"customers.csv\", true)` runs, prints `opened customers.csv`, and the reference is stored. Only now does the protected range begin.",
            "**Run time, body.** `readLine()` throws `IOException(\"read failed in customers.csv\")`. The JVM searches `read`'s exception table, finds the entry covering the body, and jumps to the handler with the exception on the operand stack. The handler stores it as the primary.",
            "**Run time, close.** The handler calls `file.close()`, which prints `closed customers.csv`, decrements the count and throws `IOException(\"close failed for customers.csv\")`.",
            "**Run time, suppress.** The second exception table entry catches that, and the handler calls `primary.addSuppressed(closeFailure)`. `Throwable` swaps its empty sentinel list for a real `ArrayList` and adds the close failure.",
            "**Run time, propagate.** `athrow` rethrows the primary. `read` has no other handler, so its frame is popped, and the JVM finds `main`'s `catch (IOException e)`.",
            "**Run time, report.** `main` prints the primary, then loops over `getSuppressed()`, which returns a fresh array copy of the list, and prints the close failure.",
          ],
        },
        {
          type: "paragraph",
          text: "If the read had succeeded, steps 5 to 7 would collapse into a single `close()` on the normal path, and the close failure would have propagated by itself as the only exception, like `cursor`'s close failure in the first case of `CloseChain`.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "SyntaxTour.java",
          code: `import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;

public class SyntaxTour {
    record Res(String name) implements AutoCloseable {
        Res {
            System.out.println("  open " + name);
        }

        @Override
        public void close() {
            System.out.println("  close " + name);
        }
    }

    public static void main(String[] args) throws IOException {
        System.out.println("1. one resource, no catch, no finally");
        try (Res a = new Res("a")) {
            System.out.println("  body");
        }

        System.out.println("2. several resources, closed in reverse; trailing ; allowed");
        try (Res a = new Res("a");
             Res b = new Res("b");) {
            System.out.println("  body");
        }

        System.out.println("3. var, plus catch and finally");
        try (var a = new Res("a")) {
            throw new IllegalStateException("fail");
        } catch (IllegalStateException e) {
            System.out.println("  catch " + e.getMessage());
        } finally {
            System.out.println("  finally");
        }

        System.out.println("4. Java 9: effectively final variables declared earlier");
        StringReader in = new StringReader("xyz");
        StringWriter out = new StringWriter();
        try (in; out) {
            out.write(in.read());
        }
        System.out.println("  copied " + out);

        System.out.println("5. a lambda as the resource");
        try (AutoCloseable cleanup = () -> System.out.println("  cleanup ran")) {
            System.out.println("  body");
        } catch (Exception e) {                          // AutoCloseable.close() throws Exception
            System.out.println("  close failed: " + e);
        }

        System.out.println("6. a null resource: close is skipped");
        try (Res none = null) {
            System.out.println("  body with " + none);
        }
    }
}`,
        },
        {
          type: "output",
          text: `1. one resource, no catch, no finally
  open a
  body
  close a
2. several resources, closed in reverse; trailing ; allowed
  open a
  open b
  body
  close b
  close a
3. var, plus catch and finally
  open a
  close a
  catch fail
  finally
4. Java 9: effectively final variables declared earlier
  copied x
5. a lambda as the resource
  body
  cleanup ran
6. a null resource: close is skipped
  body with null`,
        },
        {
          type: "paragraph",
          text: "Form 5 works because `AutoCloseable` has exactly one abstract method, so a lambda or method reference can implement it, even though the interface isn't annotated `@FunctionalInterface`. Form 3 shows `close a` before `catch fail`, the same order as `CloseTiming`. `main` declares `throws IOException` only because of form 4: `StringReader.read()` and the implicit `StringWriter.close()` both declare it, inherited from the `Reader` and `Writer` contracts, even though neither can fail here.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Copying a filtered file with two resources",
        },
        {
          type: "paragraph",
          text: "The most common real use: read one file, write another, and be sure both are closed whatever happens in between.",
        },
        {
          type: "code",
          language: "java",
          title: "CopyLines.java",
          code: `import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class CopyLines {
    // Copies only the lines that pass the filter, numbering them
    static int copyMatching(Path from, Path to, String word) throws IOException {
        int copied = 0;
        try (BufferedReader in = Files.newBufferedReader(from);
             BufferedWriter out = Files.newBufferedWriter(to)) {
            String line;
            while ((line = in.readLine()) != null) {
                if (line.contains(word)) {
                    out.write(++copied + ". " + line);
                    out.newLine();
                }
            }
        }
        return copied;
    }

    public static void main(String[] args) throws IOException {
        Path source = Files.createTempFile("employees", ".txt");
        Path target = Files.createTempFile("managers", ".txt");
        Files.write(source, List.of("Asha, Manager, Sales", "Ravi, Engineer, Platform",
                "Meera, Manager, Platform", "Kabir, Analyst, Sales"));

        int n = copyMatching(source, target, "Manager");
        System.out.println("copied " + n + " lines:");
        Files.readAllLines(target).forEach(System.out::println);

        Files.delete(source);
        Files.delete(target);
    }
}`,
        },
        {
          type: "output",
          text: `copied 2 lines:
1. Asha, Manager, Sales
2. Meera, Manager, Platform`,
        },
        {
          type: "paragraph",
          text: "`return copied` comes after the block, so by the time the caller reads the target file, the writer has been closed and therefore flushed. If `copyMatching` returned from inside the block it would still work, because the close happens before the method actually returns, as `ReturnInside` showed. `Files.write` and `Files.readAllLines` open and close their own streams internally, which is why they need no `try`.",
        },
        {
          type: "heading",
          text: "A scoped timer",
        },
        {
          type: "paragraph",
          text: "A resource doesn't have to hold anything external. This one exists only to run code at the end of a block, on every path:",
        },
        {
          type: "code",
          language: "java",
          title: "ScopedTimer.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ScopedTimer {
    // close() can't fail, so it declares no exception and callers need no catch
    record Timer(String label, long start) implements AutoCloseable {
        static Timer start(String label) {
            return new Timer(label, System.nanoTime());
        }

        @Override
        public void close() {
            long micros = (System.nanoTime() - start) / 1_000;
            System.out.println(label + " took " + micros + " us");
        }
    }

    public static void main(String[] args) {
        List<Long> squares = new ArrayList<>();
        try (Timer t = Timer.start("build squares")) {
            for (int i = 0; i < 100_000; i++) {
                squares.add((long) i * i);
            }
        }

        try (Timer t = Timer.start("sum squares")) {
            long sum = 0;
            for (long s : squares) {
                sum += s;
            }
            System.out.println("sum = " + sum);
        }

        try (Timer t = Timer.start("failing step")) {
            throw new IllegalStateException("boom");
        } catch (IllegalStateException e) {
            System.out.println("caught " + e.getMessage() + " (timer already printed)");
        }
    }
}`,
        },
        {
          type: "output",
          text: `build squares took 7152 us
sum = 333328333350000
sum squares took 5049 us
failing step took 38 us
caught boom (timer already printed)`,
        },
        {
          type: "paragraph",
          text: "The times are from one run on my machine and change on every run; they're there to show the shape, not to measure anything (a real measurement needs JMH and warm-up). What's stable is the order: the failing step's timer printed before the `catch` ran. The `(long)` cast matters too: without it, `i * i` overflows `int` once `i` passes 46,340, and the sum would be garbage.",
        },
        {
          type: "heading",
          text: "A lambda resource that restores a setting",
        },
        {
          type: "paragraph",
          text: "When the cleanup is one statement, a whole class is overkill. A sub-interface of `AutoCloseable` that narrows `close()` to throw nothing makes a lambda usable as a resource without a `catch (Exception e)`:",
        },
        {
          type: "code",
          language: "java",
          title: "TemporaryLocale.java",
          code: `import java.text.NumberFormat;
import java.util.Locale;

public class TemporaryLocale {
    // AutoCloseable with the checked exception removed: a functional interface
    @FunctionalInterface
    interface Restore extends AutoCloseable {
        @Override
        void close();
    }

    static Restore useLocale(Locale locale) {
        Locale previous = Locale.getDefault();
        Locale.setDefault(locale);
        return () -> Locale.setDefault(previous);           // the lambda IS the resource
    }

    static String price() {
        return NumberFormat.getNumberInstance().format(1234567.891);
    }

    public static void main(String[] args) {
        Locale.setDefault(Locale.US);
        System.out.println("before:  " + price());
        try (Restore r = useLocale(Locale.GERMANY)) {
            System.out.println("inside:  " + price());
        }
        System.out.println("after:   " + price());
    }
}`,
        },
        {
          type: "output",
          text: `before:  1,234,567.891
inside:  1.234.567,891
after:   1,234,567.891`,
        },
        {
          type: "paragraph",
          text: "The lambda captures `previous`, so the setting goes back to exactly what it was, even if the body throws. The same shape works for any \"set, then restore\" pair: a thread-local request id, a logging context, a system property in a test. `Locale.setDefault` is JVM-wide, so in a multi-threaded program this particular one would affect other threads while the block runs; a thread-local is the right home for per-request state.",
        },
        {
          type: "heading",
          text: "A resource per item in a loop",
        },
        {
          type: "paragraph",
          text: "Putting the try-with-resources **inside** the loop gives every item its own resource and its own failure handling, so one bad order doesn't stop the rest:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderBatch.java",
          code: `import java.util.List;

public class OrderBatch {
    record Order(int id, int quantity) { }

    static int openReceipts = 0;

    static class ReceiptPrinter implements AutoCloseable {
        private final int orderId;

        ReceiptPrinter(int orderId) {
            this.orderId = orderId;
            openReceipts++;
        }

        void print(Order order) {
            if (order.quantity() <= 0) {
                throw new IllegalArgumentException("order " + order.id() + " has quantity " + order.quantity());
            }
            System.out.println("printed receipt for order " + order.id());
        }

        @Override
        public void close() {
            openReceipts--;
            if (orderId == 3) {
                throw new IllegalStateException("printer jammed while closing order 3");
            }
        }
    }

    public static void main(String[] args) {
        List<Order> orders = List.of(new Order(1, 2), new Order(2, 0), new Order(3, -1), new Order(4, 5));
        int ok = 0;
        for (Order order : orders) {
            try (ReceiptPrinter printer = new ReceiptPrinter(order.id())) {
                printer.print(order);
                ok++;
            } catch (RuntimeException e) {
                System.out.println("skipped: " + e.getMessage());
                for (Throwable s : e.getSuppressed()) {
                    System.out.println("   also: " + s.getMessage());
                }
            }
        }
        System.out.println(ok + " of " + orders.size() + " printed, open receipts: " + openReceipts);
    }
}`,
        },
        {
          type: "output",
          text: `printed receipt for order 1
skipped: order 2 has quantity 0
skipped: order 3 has quantity -1
   also: printer jammed while closing order 3
printed receipt for order 4
2 of 4 printed, open receipts: 0`,
        },
        {
          type: "paragraph",
          text: "Order 3 failed twice, in `print` and in `close`, and the log shows both: the quantity problem first, the jam attached to it. A handler that logged only `e.getMessage()` would have hidden the jam completely. Every printer was closed, so the count ended at 0. This per-item shape is exactly what the production section's export job gets wrong.",
        },
        {
          type: "diagram",
          text: `for each order:
  ┌─ try (ReceiptPrinter printer = new ReceiptPrinter(id)) ─────────┐
  │   print(order) ──ok──► ok++                                     │
  │        │                                                        │
  │      throws                                                     │
  │        ▼                                                        │
  │   primary = "order 3 has quantity -1"                           │
  ├─ generated close ───────────────────────────────────────────────┤
  │   printer.close() ──throws──► primary.addSuppressed("jammed")   │
  └─────────────────────────────────────────────────────────────────┘
            │ primary (with 1 suppressed)
            ▼
  catch (RuntimeException e): log message, then e.getSuppressed()
            │
            ▼
  next order: a fresh printer, a fresh try`,
          caption: "Order 3's path through one loop iteration. The close runs inside the statement, before the catch.",
        },
      ],
    },
    {
      title: "When to Use try-with-resources (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "The rule is about **ownership**: try-with-resources belongs in the method that opens a resource and is also the last code to use it. If the resource's lifetime matches one block, it's the right tool. If the resource has to outlive the block, or someone else owns it, it's the wrong one, and it fails in a confusing way: the object is closed while somebody still needs it.",
        },
        {
          type: "table",
          headers: ["Situation", "What I use", "Why"],
          rows: [
            ["I open it, use it and finish with it in one method", "try-with-resources", "The lifetime is exactly the block"],
            ["Several resources that depend on each other", "One try-with-resources, in dependency order", "Reverse close order is then correct automatically"],
            ["A wrapper whose constructor can fail (`ObjectInputStream`, `GZIPInputStream`)", "Each layer as its own resource", "The inner stream is closed even if the wrapper isn't created"],
            ["A lock, a timer, a restore-on-exit setting", "A small `AutoCloseable` wrapper or lambda", "\"Undo on every path\" is what the statement is for"],
            ["A method that creates a resource and returns it, or returns a lazy view of it", "No try-with-resources in that method; the caller uses one", "Closing it would hand back a dead object"],
            ["A resource I received and don't own (an injected `DataSource`, `System.out`, a shared pool)", "Don't close it", "The owner closes it, once"],
            ["A resource held by an object for its whole lifetime", "The object implements `AutoCloseable` and closes it in its own `close()`", "Ownership moves to the holder, and the holder is used with try-with-resources"],
            ["Container-managed objects (Spring beans, pooled connections inside `JdbcTemplate`)", "Let the container close them", "Spring calls `close()`/`@PreDestroy` at shutdown"],
            ["Non-I/O streams (`list.stream()`)", "Nothing", "They hold no resource; the `AutoCloseable` Javadoc says so"],
          ],
        },
        {
          type: "diagram",
          text: `Does this method open (create) the resource?
│
├─ no ─► Do I own it by contract (the API says the callee closes)?
│        ├─ yes ─► try (existingVar) { ... }       Java 9+
│        └─ no ──► don't close it; the owner will
│
└─ yes ─► Is this method the last code to use it?
          ├─ yes ─► try (Res r = open()) { ... }
          │
          └─ no ──► Who uses it after this method returns?
                    ├─ the caller ──► return it unclosed;
                    │                 the caller writes the try
                    └─ an object ───► store it in a field;
                                      that object is AutoCloseable`,
          caption: "Whoever opens a resource and uses it last closes it. Everyone else leaves it alone.",
        },
        {
          type: "list",
          items: [
            "If a type implements `AutoCloseable` and I created it, I default to try-with-resources. The exceptions are non-I/O streams and objects whose lifetime is managed by a container.",
            "One method, one owner. A method that takes a resource as a parameter doesn't close it unless its name or Javadoc says so, like `ExistingVariables.upperCopy` did deliberately.",
            "A factory method (`openReader`, `newConnection`) never closes what it returns. Its callers get the try.",
            "Prefer `finally` only for cleanup that isn't about an object: resetting a counter, logging an exit. If the cleanup is \"undo what I just did to this thing\", it's a resource.",
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice",
        },
        {
          type: "paragraph",
          text: "Two wrong uses that both compile without a warning. A helper that wraps a reader in try-with-resources and returns its lines as a `Stream`, and a report that wraps `System.out` in a `PrintWriter` \"to be tidy\":",
        },
        {
          type: "code",
          language: "java",
          title: "ClosingTooMuch.java",
          code: `import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringReader;
import java.util.stream.Stream;

public class ClosingTooMuch {
    // Wrong: the method closes something whose lifetime belongs to the caller
    static Stream<String> titlesWrong(BufferedReader source) throws IOException {
        try (BufferedReader in = source) {
            return in.lines();                          // lazy: nothing is read yet
        }
    }

    // Right: hand the stream back and let the caller own it
    static Stream<String> titles(BufferedReader source) {
        return source.lines().onClose(() -> {
            try {
                source.close();
            } catch (IOException e) {
                throw new java.io.UncheckedIOException(e);
            }
        });
    }

    public static void main(String[] args) throws IOException {
        try {
            titlesWrong(new BufferedReader(new StringReader("Dune\\nEmma"))).forEach(System.out::println);
        } catch (Exception e) {
            System.out.println("wrong: " + e);
        }

        try (Stream<String> titles = titles(new BufferedReader(new StringReader("Dune\\nEmma")))) {
            titles.forEach(t -> System.out.println("right: " + t));
        }

        // Wrong: a PrintWriter around System.out closes System.out with it
        try (PrintWriter report = new PrintWriter(System.out)) {
            report.println("report line");
        }
        System.out.println("this line never appears");
        System.err.println("System.out has error flag: " + System.out.checkError());
    }
}`,
        },
        {
          type: "output",
          text: `wrong: java.io.UncheckedIOException: java.io.IOException: Stream closed
right: Dune
right: Emma
report line
System.out has error flag: true`,
        },
        {
          type: "list",
          items: [
            "**Wrong, the stream:** `lines()` is lazy. The `return` evaluated to a stream that hadn't read anything, then the block closed the reader, and the first read happened in the caller's `forEach`, against a closed reader. The error surfaces far away from its cause.",
            "**Right, the stream:** the method doesn't close anything. It attaches the reader's close to the stream with `onClose`, and the caller, who decides how long the stream lives, puts it in try-with-resources. That's the same `onClose` hook `Files.lines` uses to close its file.",
            "**Wrong, System.out:** closing the `PrintWriter` closed the stream it wraps, which is the process's standard output. The next `println` printed nothing and didn't throw either; `PrintStream` only records an error flag, which `checkError()` on `System.err` revealed. In a server, that's every later log line written to the console, gone. The fix is not to close it: `report.flush()` is all that was needed, because the code that opened `System.out` (the JVM) owns it.",
          ],
        },
        {
          type: "paragraph",
          text: "It's the lifecycle question from the Association, Aggregation and Composition lesson: who creates the object, who else may hold it, and whether it outlives its user. A resource my method created and nobody else holds is like a composed part, mine to close. One that came from outside, like an aggregated part, outlives my method, and closing it is the owner's job.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "A type that isn't AutoCloseable",
        },
        {
          type: "code",
          language: "java",
          title: "NotAutoCloseable.java",
          code: `public class NotAutoCloseable {
    public static void main(String[] args) {
        try (StringBuilder sb = new StringBuilder("draft")) {
            System.out.println(sb);
        }
    }
}`,
        },
        {
          type: "output",
          text: `NotAutoCloseable.java:3: error: incompatible types: try-with-resources not applicable to variable type
        try (StringBuilder sb = new StringBuilder("draft")) {
                           ^
    (StringBuilder cannot be converted to AutoCloseable)
1 error`,
        },
        {
          type: "paragraph",
          text: "Having a `close()` method isn't enough; the type has to implement the interface. The same error comes up for `Lock`, and for `ExecutorService` or `HttpClient` on a JDK older than 19 or 21.",
        },
        {
          type: "heading",
          text: "Reassigning the resource",
        },
        {
          type: "code",
          language: "java",
          title: "ReassignResource.java",
          code: `import java.io.StringReader;

public class ReassignResource {
    public static void main(String[] args) throws Exception {
        try (StringReader reader = new StringReader("first")) {
            reader = new StringReader("second");
        }
    }
}`,
        },
        {
          type: "output",
          text: `ReassignResource.java:6: error: auto-closeable resource reader may not be assigned
            reader = new StringReader("second");
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A declared resource is implicitly `final`. If reassignment were allowed, the first reader would leak and the second would be closed in its place.",
        },
        {
          type: "heading",
          text: "Using the resource in catch",
        },
        {
          type: "code",
          language: "java",
          title: "OutOfScope.java",
          code: `import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;

public class OutOfScope {
    public static void main(String[] args) {
        try (BufferedReader reader = new BufferedReader(new StringReader("line"))) {
            System.out.println(reader.readLine());
        } catch (IOException e) {
            System.out.println("failed while reading " + reader);
        }
    }
}`,
        },
        {
          type: "output",
          text: `OutOfScope.java:10: error: cannot find symbol
            System.out.println("failed while reading " + reader);
                                                         ^
  symbol:   variable reader
  location: class OutOfScope
1 error`,
        },
        {
          type: "paragraph",
          text: "The resource belongs to the inner statement of the JLS translation, and by the time `catch` runs it's closed anyway. Information needed for the error message (a file name, an id) goes in a variable declared before the `try`.",
        },
        {
          type: "heading",
          text: "Logging only the message",
        },
        {
          type: "paragraph",
          text: "`log.error(\"export failed: \" + e.getMessage())` throws away the stack trace, the cause chain and every suppressed exception. In `OrderBatch`, the printer jam was visible only because the handler looped over `getSuppressed()`. With a logging framework, passing the exception object as the last argument (`log.error(\"export failed\", e)`) prints the whole thing, `Suppressed:` blocks included.",
        },
        {
          type: "heading",
          text: "Mistakes already shown above",
        },
        {
          type: "list",
          items: [
            "**Nesting a constructor that can fail:** `new ObjectInputStream(new FileInputStream(f))` as one resource leaked 100 descriptors out of 100 in `WrapperLeak`. Declaring the `FileInputStream` separately fixed it.",
            "**Closing what I don't own:** `ClosingTooMuch` closed `System.out` by wrapping it, and returned a stream over a closed reader. Both compiled cleanly. The same mistake with an injected `DataSource` or a shared `ExecutorService` breaks every other user of that object.",
            "**Expecting the statement's catch to roll back through the resource:** `catch (SQLException e) { conn.rollback(); }` on `try (Connection conn = ...)` doesn't compile, because `conn` is out of scope (`OutOfScope`), and the connection would already be closed anyway (`CloseTiming`). The rollback goes in a `try`/`catch` inside the body.",
            "**A close() that ignores the contract:** non-idempotent (`CloseTwice` counted three free connections in a pool of two), declared `throws Exception` (every caller must catch `Exception`, and `-Xlint:try` warns), or rethrowing a stored exception object (`Sticky` turned the real error into `Self-suppression not permitted`).",
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
            "Use try-with-resources for every `AutoCloseable` I create and finish with in one method. Write `finally` by hand only for cleanup that isn't closing an object.",
            "Declare every layer of a wrapped stream as its own resource when a wrapper's constructor can throw.",
            "Order resources by dependency: what's opened first is closed last.",
            "Keep the resource's scope tight. Open it as late as possible and let the block end as soon as the resource isn't needed; slow work on data already read goes after the block.",
            "Don't close what I don't own, and don't return what I just closed. Factories return open resources; callers close them.",
            "Put recovery that needs the resource (rollback, a retry on the same connection) inside the body, not in the statement's `catch`.",
            "When writing a resource: narrow `close()`'s `throws` clause (ideally to nothing), make it idempotent, release before throwing, never throw `InterruptedException`, and never rethrow a stored exception instance.",
            "Log exceptions as objects, not messages, so `Caused by:` and `Suppressed:` survive.",
            "Wrap `Lock` in a guard instead of relying on everyone to write `finally { unlock(); }`. Since Java 22, `try (var _ = guard())` documents that the resource is never used.",
            "Compile with `-Xlint:try` (or `-Xlint:all`) to catch unused resources and `close()` methods that can throw `InterruptedException`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "list",
          items: [
            "On the normal path, try-with-resources costs the `close()` call and nothing else. The exception table entries are only consulted when something is thrown; HotSpot doesn't execute any instruction to \"enter\" a try block. A missing null check for `new` makes it even cheaper than the JLS translation.",
            "It's also smaller than doing it by hand: 40 bytes of bytecode and two exception table entries for `TwrBytecode.viaMethod`, against 80 bytes and five for the literal JLS translation in `HandWritten`. Smaller methods stay under the JIT's inlining thresholds more easily (35 bytes for any call, 325 for hot ones, from the Methods lesson).",
            "Suppression is allocation-free until it's used. A fresh `Throwable` points at a shared empty sentinel list; the first `addSuppressed` replaces it with an `ArrayList` of capacity 1. `getSuppressed()` copies the list into a new array on each call. I read this in the JDK 25 source of `Throwable`.",
            "The expensive part of the failure path is the exception itself, mostly filling in the stack trace, which the Exceptions and the Exception Hierarchy lesson covers. try-with-resources adds at most one more exception per failing `close()`.",
            "The real performance problems are leaks, not the statement: each leaked file costs a descriptor until the process exits or a GC-triggered cleaner gets to it, and each leaked pooled connection makes the next request wait for the pool's timeout. The per-process descriptor limit (`ulimit -n`) depends on the system and its configuration: my shell reported 1048576, and 1024 is a common soft limit on Linux.",
          ],
        },
      ],
    },
    {
      title: "try-with-resources in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend runs a nightly job that exports completed trips for the finance team. It works in batches of 100 trips: for each batch it opens a JSON-lines file and a database cursor over that batch's trips, serializes each trip with Jackson, and moves on. Some rows are corrupt (a fare that fails validation), and the job is written to skip a bad batch and keep going, which sounds robust. The bug is that \"skip the batch\" happens by an exception, and the closing code only exists on the happy path.",
        },
        {
          type: "paragraph",
          text: "I rebuilt it with a fake cursor that counts how many are open (standing in for a JDBC `ResultSet`, which holds a cursor on the database server) and real files, counting the process's open file descriptors through `/proc/self/fd`. That part is **Linux-specific**. Jackson is the real library, version 2.21.7 (Maven `com.fasterxml.jackson.core:jackson-databind:2.21.7`, which brings `jackson-core` and `jackson-annotations`); `$JACKSON` below is the classpath of those three JARs.",
        },
        {
          type: "code",
          language: "java",
          title: "TripExport.java",
          code: `import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.LongStream;

import com.fasterxml.jackson.databind.ObjectMapper;

public class TripExport {
    record Trip(long id, String rider, String driver, long farePaise, String city) { }

    // Stands in for a JDBC ResultSet: a server-side cursor that must be closed
    static class TripCursor implements AutoCloseable {
        static final AtomicInteger OPEN = new AtomicInteger();
        private final Iterator<Long> ids;

        TripCursor(int batch) {
            ids = LongStream.range(batch * 100L, batch * 100L + 100).iterator();
            OPEN.incrementAndGet();
        }

        boolean hasNext() {
            return ids.hasNext();
        }

        Trip next() {
            long id = ids.next();
            if (id % 300 == 150) {                       // one corrupt row in every third batch
                throw new IllegalStateException("corrupt fare in trip " + id);
            }
            return new Trip(id, "rider-" + id % 7, "driver-" + id % 5, 8_000 + id % 900, "Kolkata");
        }

        @Override
        public void close() {
            OPEN.decrementAndGet();
        }
    }

    static final ObjectMapper JSON = new ObjectMapper();

    // BEFORE: closes on the happy path only
    static void exportBatchBuggy(Path dir, int batch) throws IOException {
        BufferedWriter out = Files.newBufferedWriter(dir.resolve("trips-" + batch + ".jsonl"));
        TripCursor cursor = new TripCursor(batch);
        while (cursor.hasNext()) {
            out.write(JSON.writeValueAsString(cursor.next()));
            out.newLine();
        }
        cursor.close();
        out.close();
    }

    // AFTER: both resources are closed on every path, cursor first
    static void exportBatch(Path dir, int batch) throws IOException {
        try (BufferedWriter out = Files.newBufferedWriter(dir.resolve("trips-" + batch + ".jsonl"));
             TripCursor cursor = new TripCursor(batch)) {
            while (cursor.hasNext()) {
                out.write(JSON.writeValueAsString(cursor.next()));
                out.newLine();
            }
        }
    }

    static long openFds() throws IOException {           // Linux only: one entry per open descriptor
        try (var fds = Files.list(Path.of("/proc/self/fd"))) {
            return fds.count();
        }
    }

    public static void main(String[] args) throws IOException {
        boolean buggy = args.length > 0 && args[0].equals("buggy");
        Path dir = Files.createTempDirectory("trip-export");
        long fdsBefore = openFds();
        int ok = 0, failed = 0;
        String firstError = null;

        for (int batch = 0; batch < 300; batch++) {
            try {
                if (buggy) {
                    exportBatchBuggy(dir, batch);
                } else {
                    exportBatch(dir, batch);
                }
                ok++;
            } catch (IllegalStateException e) {
                failed++;                                // skip the bad batch, keep exporting
            } catch (IOException e) {
                failed++;
                if (firstError == null) {
                    firstError = "batch " + batch + ": " + e;
                }
            }
        }

        System.out.println((buggy ? "buggy" : "fixed") + " export: " + ok + " batches ok, " + failed + " failed");
        System.out.println("open cursors:       " + TripCursor.OPEN.get());
        try {
            System.out.println("leaked descriptors: " + (openFds() - fdsBefore));
        } catch (IOException e) {
            System.out.println("leaked descriptors: can't even list them: " + e.getMessage());
        }
        if (firstError != null) {
            System.out.println("first I/O error:    " + firstError.replace(dir.toString(), "<dir>"));
        }
        for (int batch = 0; batch < 300; batch++) {      // unlink needs no descriptor
            Files.deleteIfExists(dir.resolve("trips-" + batch + ".jsonl"));
        }
        Files.delete(dir);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$JACKSON" TripExport.java
java -cp "$JACKSON:." TripExport buggy
java -cp "$JACKSON:." TripExport fixed

# the same two runs with a 64-descriptor limit, like a tightly configured container
(ulimit -n 64; java -cp "$JACKSON:." TripExport buggy; java -cp "$JACKSON:." TripExport fixed)`,
        },
        {
          type: "output",
          text: `buggy export: 200 batches ok, 100 failed
open cursors:       100
leaked descriptors: 87
fixed export: 200 batches ok, 100 failed
open cursors:       0
leaked descriptors: 0

# ulimit -n 64
buggy export: 139 batches ok, 161 failed
open cursors:       70
leaked descriptors: can't even list them: /proc/self/fd: Too many open files
first I/O error:    batch 209: java.nio.file.FileSystemException: <dir>/trips-209.jsonl: Too many open files
fixed export: 200 batches ok, 100 failed
open cursors:       0
leaked descriptors: 0`,
        },
        {
          type: "list",
          items: [
            "**Every corrupt batch leaked both resources.** 100 batches failed on a corrupt row, and 100 cursors were still open at the end. The exception jumped from `cursor.next()` straight to the job's `catch`, past both `close()` calls. On a real database, each of those would be a server-side cursor, and often a pooled connection, held until something closes the connection or the process exits.",
            "**The descriptor count was 87, not 100, and it varied between runs** (81 to 87 in mine). A GC ran during the job, and the JDK's cleaners closed some of the unreachable writers' file descriptors. That's why this kind of leak passes a quick test: the GC hides part of it, at a time nobody controls. Nothing cleaned up the cursors, because nothing on the database side knows about Java's garbage collector.",
            "**With a 64-descriptor limit, healthy batches started failing.** From batch 209 in this run (203 to 209 across my runs), even opening a new file failed with `Too many open files`, so 161 batches failed instead of 100 (the counts in the limited run, including the 70 open cursors, moved by a few between runs). The error is reported against an innocent batch, nowhere near the corrupt rows that caused it. The job couldn't even list `/proc/self/fd` any more. 70 cursors were open against a limit of 64 descriptors, more proof that the cleaners had closed some of the leaked files.",
            "**The fix is one statement.** `exportBatch` declares the writer and the cursor as resources. The corrupt batches still fail, as they should, but both resources are closed on the way out, cursor first and then the writer, which also flushes it. Zero cursors and zero descriptors leaked, with or without the limit.",
            "**What the fix doesn't do:** the failed batches still leave a partial `trips-N.jsonl` behind, now properly flushed and closed. A real job would write to a temporary name and rename on success, or delete the partial file in the `catch`. That's a correctness decision, not a resource one, and the Exception Handling Best Practices lesson covers that kind of retry and cleanup logic.",
          ],
        },
        {
          type: "paragraph",
          text: "When a running JVM reports `Too many open files`, the first thing I'd check on Linux is what's holding the descriptors: `ls /proc/<pid>/fd | wc -l` against the `Max open files` line of `/proc/<pid>/limits` (set by `ulimit -n`, or `LimitNOFILE` for a systemd service), and `ls -l /proc/<pid>/fd` to see what each one points at. Thousands of entries for files in the same export directory, or thousands of `socket:` entries, point straight at a missing close.",
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
              question: "What is try-with-resources?",
              answer:
                "A form of the `try` statement, added in Java 7, that declares resources in parentheses after `try` and closes them automatically when the block ends, whether it ends normally, by `return`, or by an exception. It replaces the manual `finally { x.close(); }` pattern.\n\nIt also fixes the three bugs of that pattern, which I reproduced: forgetting to close on the exception path (three files left open after three failed reads), an NPE in `finally` when the open failed, and a close failure replacing the real exception. With try-with-resources the open count went back to 0, there was no NPE, and the read failure reached the caller with the close failure attached.",
            },
            {
              question: "Which objects can be used as resources?",
              answer:
                "Any object whose type implements `java.lang.AutoCloseable`, which includes everything that implements `java.io.Closeable`. The check is at compile time on the declared type.\n\nWhen I tried `try (StringBuilder sb = ...)`, `javac` said \"try-with-resources not applicable to variable type (StringBuilder cannot be converted to AutoCloseable)\". Having a method named `close()` isn't enough, which is why `Lock` needs a wrapper.",
            },
            {
              question: "In what order are multiple resources closed?",
              answer:
                "In reverse order of opening: the last one declared is closed first. That's the safe order when later resources depend on earlier ones, like a result set on a statement on a connection.\n\nMy `CloseOrder` program opened connection, statement, resultSet and closed resultSet, statement, connection. It falls out of the JLS definition, which treats several resources as nested try-with-resources statements, one per resource.",
            },
            {
              question: "Can a try-with-resources statement have no catch and no finally?",
              answer:
                "Yes. Unlike a plain `try`, which needs at least one `catch` or a `finally`, `try (R r = ...) { ... }` on its own is legal; the generated close code plays the role of the `finally`. Any checked exception from the body, the initializer or `close()` must then be declared by the method.\n\nThat's the form `TwrFixed.read` uses: three lines, `throws IOException`, and no handler at all.",
            },
            {
              question: "Can you use the resource variable in the catch or finally block?",
              answer:
                "No. A declared resource is in scope only from its declaration to the end of the try block. `javac` reports \"cannot find symbol\" for it in `catch`, which is what I got in `OutOfScope`.\n\nIt wouldn't help anyway: by the time `catch` or `finally` runs, the resource is already closed. Anything the handler needs, like a file name, goes in a variable declared before the `try`.",
            },
            {
              question: "Can a resource be null?",
              answer:
                "Yes. A resource is closed only if it was initialized to a non-null value, so a `null` resource just isn't closed, with no `NullPointerException`. Using it in the body still throws an NPE, like any null reference.\n\nIn the bytecode this is the `ifnull` before each `close()` call. `NullResource` opened `Dune`, closed it, and skipped the close for `Emma` without complaint. When the resource comes from `new`, `javac` leaves the null check out because it can't be null.",
            },
            {
              question: "What is the difference between AutoCloseable and Closeable?",
              answer:
                "`AutoCloseable` (Java 7, `java.lang`) has `close() throws Exception` and isn't required to be idempotent. `Closeable` (Java 5, `java.io`) extends it, narrows the exception to `IOException`, and requires that closing an already closed object has no effect.\n\n`javap` shows both signatures. The idempotence rule matters in practice: wrappers close what they wrap, so a resource can easily be closed twice. In `CloseTwice`, a non-idempotent connection made a pool of two report three free connections.",
            },
            {
              question: "Is the resource closed if the try block returns normally with a return statement?",
              answer:
                "Yes. The `return` value is computed first, then the resources are closed, then any `finally` runs, then the method returns the value already computed.\n\n`ReturnInside` printed `borrowing Dune`, `library closed`, `finally`, then `main got DUNE`. Returning data read from the resource is fine; returning the resource itself, or a lazy stream over it, hands the caller a closed object.",
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
              question: "Does the catch block run before or after the resources are closed?",
              answer:
                "After. JLS 14.20.3.2 defines a try-with-resources with `catch` or `finally` as a basic one wrapped in an outer `try` that holds them, so the inner statement closes everything before control reaches the outer handlers.\n\n`CloseTiming` printed `printer closed` before `catch: paper jam` and then `finally`. That's also why a `catch` there sees exceptions from the initializers and from `close()`, and why recovery that needs the resource, like a rollback, belongs inside the body.",
            },
            {
              question: "What are suppressed exceptions?",
              answer:
                "Exceptions attached to another exception with `Throwable.addSuppressed` and read back with `getSuppressed()`, both added in Java 7. try-with-resources uses them when the body has already thrown and a `close()` throws too: the body's exception propagates and the close failure is added to it as suppressed.\n\nIn `SuppressedDemo`, the primary was `body failed` with two suppressed close failures, in close order: `cursor` then `file`. `printStackTrace()` shows them as indented `Suppressed:` blocks.",
            },
            {
              question: "How is try-with-resources different from closing in a finally block?",
              answer:
                "Three ways. It closes only resources that were successfully opened (no NPE when the open fails), it closes several resources in reverse order with each close independent of the others, and when both the body and `close()` fail it keeps the body's exception and suppresses the close failure. In a `finally`, an exception thrown during cleanup replaces the one in flight.\n\nCase 3 of `ManualClose` and `TwrFixed` ran the same failing read and close both ways: with `finally` the caller saw only `close failed for customers.csv` and the read failure was gone; with try-with-resources it saw `read failed in customers.csv` with the close failure suppressed.",
            },
            {
              question: "What did Java 9 change in try-with-resources?",
              answer:
                "JEP 213 allowed an existing variable as a resource, as long as it's `final` or effectively final: `try (in; out) { ... }`. Before that, every resource had to be declared in the header, so a parameter needed a copy like `try (Reader r = in)`.\n\nIf the variable is reassigned anywhere, `javac` says \"variable reader used as a try-with-resources resource neither final nor effectively final\", which I reproduced. Unlike a declared resource, the variable stays in scope after the block, so code can still reach the closed object, as `ExistingVariables` showed with `Stream closed`.",
            },
            {
              question: "What happens if the second of three resources fails to open?",
              answer:
                "The first one is closed, the second was never created so there's nothing to close, the third is never attempted, the body doesn't run, and the second's exception propagates; a `catch` on the same statement does see it.\n\n`InitFailure` printed `open first`, `open second FAILED`, `close first`, `catch cannot open second`. If closing `first` had failed too, that failure would have been suppressed into the open failure, which `CloseChain` showed.",
            },
            {
              question: "What happens if close() throws but the body completed normally?",
              answer:
                "The close exception propagates as the only exception. Suppression only happens when there's already a primary exception to attach to.\n\nIn `CloseChain`, a clean body with two failing closes produced `thrown: close failed: cursor`: the first close failure became the exception, and only the second one was suppressed into it. That's important for writers, where `close()` flushes the last buffered data: a failure there means the output is incomplete and must not be lost.",
            },
            {
              question: "Why should close() be idempotent even though AutoCloseable doesn't require it?",
              answer:
                "Because resources get closed twice without anyone writing two calls: a wrapper closes the object it wraps, and if both are declared as resources, the inner one is closed by the wrapper and then again directly. The `AutoCloseable` Javadoc strongly encourages idempotence for that reason; `Closeable` requires it.\n\nIn `CloseTwice`, a pooled connection whose `close()` always returned the connection made a pool of two report three free. A `closed` flag fixed it, and closing a `BufferedReader` twice did nothing, as `Closeable` promises.",
            },
            {
              question: "Why does try (AutoCloseable r = ...) force you to handle Exception, and how do you avoid it?",
              answer:
                "Because the implicit `close()` call is checked against the declared type's `close()`, and `AutoCloseable.close()` declares `throws Exception`. `javac` reports \"unreported exception Exception\" with the note \"exception thrown from implicit call to close() on resource variable\".\n\nThe fix is a narrower static type: a `Closeable` only needs `IOException`, and my own resource can override `close()` with no `throws` clause. `TemporaryLocale` declared `interface Restore extends AutoCloseable { void close(); }`, which made a lambda usable as a resource with no `catch` at all.",
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
              question: "What bytecode does javac generate for try-with-resources?",
              answer:
                "No special instruction. The resource is created and stored in a local before the protected range; the body is covered by an exception table entry catching `Throwable`. The normal path does a null check and a plain `close()`. The exception path stores the primary, does the null check, calls `close()` inside a second protected range whose handler calls `primary.addSuppressed(closeFailure)`, and then rethrows the primary with `athrow`.\n\nFor `TwrBytecode.viaMethod` that's 40 bytes and two exception table entries, with two `close()` call sites. The literal JLS translation written by hand compiled to 80 bytes and five entries, because `javac` knows on each path whether a primary exception exists and drops the `primary != null` test. `javac` 17, 21 and 25 produced the same instructions.",
            },
            {
              question: "Why is there no null check in the bytecode when the resource is created with new?",
              answer:
                "Because the result of `new` can never be `null`, so the JLS's \"close only if non-null\" rule can be decided at compile time. `javac` omits the `ifnull` in that case and keeps it for any other initializer, such as a method call.\n\nI compiled the same block twice: `try (Res r = open())` had `ifnull 39` before each `close()`, and `try (Res r = new Res())` had no `ifnull` at all.",
            },
            {
              question: "If the body succeeds and two resources both fail to close, which exception propagates?",
              answer:
                "The first close failure, which is from the last-declared resource since closing goes in reverse. Every later close still runs, and its failure is suppressed into the first one. JLS 14.20.3 says a close exception is suppressed if an exception was thrown previously by an initializer, the try block, or the closing of a resource.\n\n`CloseChain` printed `thrown: close failed: cursor | suppressed: close failed: file`, and `closing file` appeared after cursor's failure, so one failed close didn't stop the next.",
            },
            {
              question: "What happens if a resource's close() throws the same exception object the body threw?",
              answer:
                "The generated code calls `primary.addSuppressed(primary)`, and `Throwable` rejects self-suppression with `IllegalArgumentException(\"Self-suppression not permitted\")`, passing the original as its cause. That new exception escapes the statement and replaces the real one, which survives only as the cause.\n\n`SuppressionRules.Sticky` stored its failure and rethrew it from `close()`, and the caller caught `IllegalArgumentException: Self-suppression not permitted` with `cause: RuntimeException: write failed`. A resource that reports a stored failure should throw a new exception with the stored one as cause.",
            },
            {
              question: "Can suppression be disabled, and why would anyone do that?",
              answer:
                "Yes, with the protected constructor `Throwable(String message, Throwable cause, boolean enableSuppression, boolean writableStackTrace)`, added in Java 7. With suppression disabled, `addSuppressed` only validates its argument and does nothing, and `getSuppressed()` returns an empty array.\n\n`QuietException` used it, and a failing close inside try-with-resources left it with 0 suppressed. The Javadoc reserves it for exceptional cases, such as the JVM reusing preallocated exception objects when memory is low, or immutable exceptions reused for control flow.",
            },
            {
              question: "What is the difference between a suppressed exception and a cause?",
              answer:
                "A cause is a causal link: the exception was thrown because of the cause, typically when a lower-level exception is caught and translated, and it's set at construction or with `initCause`. A suppressed exception is an independent sibling that happened during cleanup while another exception was already propagating; it's added after the fact, possibly several times.\n\nIn a stack trace, causes print as `Caused by:` sections and suppressed ones as indented `Suppressed:` blocks, which `SuppressedDemo` showed. One exception can have both.",
            },
            {
              question: "Why does the AutoCloseable Javadoc say close() should not throw InterruptedException?",
              answer:
                "Because a close failure is often suppressed, and a suppressed `InterruptedException` is effectively swallowed: the thread's interrupt, another thread's request to stop, is lost, and the code above never reacts to it. The Javadoc says runtime misbehaviour is likely if one is suppressed.\n\n`javac -Xlint:try` warns about it. `LintTry`'s resource declared `close() throws Exception`, which includes `InterruptedException`, and got \"has a member method close() that could throw InterruptedException\". Declaring nothing or `IOException` removes the warning.",
            },
            {
              question: "How do you make a java.util.concurrent.locks.Lock work with try-with-resources?",
              answer:
                "`Lock` isn't `AutoCloseable`, so I wrap it: a static factory that calls `lock()` and only then creates a guard, and a guard whose `close()` calls `unlock()` once, declares no checked exception, and is idempotent. A method reference (`LOCK::unlock`) typed as `AutoCloseable` also works, but then the caller has to handle `Exception`.\n\nIn `LockGuardDemo`, a withdrawal that threw `insufficient funds` still left the lock free for another thread's `tryLock()`, where the try, catch and finally lesson's leaky version had left it held. On Java 22 and later, `try (var _ = guard())` avoids naming a variable that's never used; JDK 21 needs `--enable-preview` for it, which I confirmed.",
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
              question: "A batch service dies after a few hours with \"Too many open files\". Where do you look and what's the likely fix?",
              answer:
                "A resource that isn't closed on some path, almost always the exception path. I'd count the process's descriptors in `/proc/<pid>/fd` against its limit in `/proc/<pid>/limits`, look at what they point to, then find the code that opens those files or sockets and check whether every path closes them. The fix is try-with-resources around each resource, with each wrapper layer declared separately.\n\nThe trip-export job in the production section is exactly this: it closed its file and cursor only on the happy path, so every corrupt batch leaked both. With a 64-descriptor limit, healthy batches started failing from about batch 203 to 209 with `Too many open files`, far from the real cause. The try-with-resources version leaked nothing. Raising `ulimit -n` would only delay the crash.",
            },
            {
              question: "The logs show \"close failed\" but nobody can find what actually went wrong. What happened?",
              answer:
                "Most likely a `finally` block that closes a resource threw, and its exception replaced the original one, which is then gone for good. The other possibility is a handler that logs only `e.getMessage()` and so drops the suppressed exceptions that try-with-resources did keep.\n\nCase 3 of `ManualClose` shows the first one: with `finally` the caller got `close failed for customers.csv` and the read failure was nowhere. Switching to try-with-resources made the body's exception the one that propagates, with the close failure attached, and logging the exception object rather than its message prints both, as in `SuppressedDemo`'s trace.",
            },
            {
              question: "Under load, requests start hanging, and a thread dump shows many threads waiting on the same ReentrantLock that no thread seems to be using. What's your diagnosis?",
              answer:
                "A code path that called `lock()` and then threw before `unlock()`, so the lock is still held by a thread that has moved on (in a pool, it's busy with other work while still owning the lock). It happens whenever `unlock()` isn't in a `finally`.\n\n`AccountLock.withdrawLeaky` in the try, catch and finally lesson reproduces it: after an `insufficient funds` exception the lock stayed held and another thread's `tryLock()` returned `false`. The fix is `lock(); try { ... } finally { unlock(); }`, or a `LockGuard` used with try-with-resources: in `LockGuardDemo` the same failure left the lock free for others.",
            },
            {
              question: "A helper returns Files.lines(path) from inside a try-with-resources, and callers get \"Stream closed\". Why, and how do you fix it?",
              answer:
                "The stream is lazy. The `return` hands back a stream that hasn't read anything, the block then closes it (and its file), and the caller's terminal operation runs against a closed stream. The helper closed a resource whose lifetime belongs to its caller.\n\n`ClosingTooMuch.titlesWrong` did the same with `BufferedReader.lines()` and the caller got `UncheckedIOException: java.io.IOException: Stream closed`. The fix is to return the stream unclosed, with `onClose` attached if it wraps another resource, and let the caller use try-with-resources, which printed both titles.",
            },
            {
              question: "A request handler creates a fixed thread pool in a try-with-resources, submits work, and returns. A colleague proposes doing the same with the application's shared executor. What do you say?",
              answer:
                "For a pool the handler creates itself, try-with-resources is fine on Java 19+: `close()` calls `shutdown()` and waits for the submitted tasks, so the end of the block is a join point. For a shared, injected executor it's a bug: the first request to finish would shut the pool down for everyone, and every later `submit` would be rejected. The owner of the shared pool, usually the container, closes it at shutdown.\n\n`ModernResources` showed the join: `done` was 0 at the end of the body and 4 after the block. The same ownership rule broke `System.out` in `ClosingTooMuch`.",
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
            "Write `Doors.java` with `record Door(String name) implements AutoCloseable`, printing `open <name>` in its compact constructor and `close <name>` in `close()`. Open `front`, `hall` and `room` in one try-with-resources and print `inside` in the body. Write down the output you expect before running it.",
            "Copy it to `StuckDoors.java`. Make `close()` throw `new RuntimeException(\"cannot close \" + name)` and the body throw `new IllegalStateException(\"stuck\")`. Catch `RuntimeException`, print its message and then every suppressed exception's message.",
            "Copy that to `StuckFinally.java` and replace the try-with-resources with three nested `try`/`finally` blocks written by hand, one per door, each `finally` calling `close()`. Print the caught message and `getSuppressed().length`.",
            "In a `main` with no `throws` clause, write `try (AutoCloseable a = () -> System.out.println(\"closed\")) { System.out.println(\"body\"); }` and compile it. Then fix it without adding a `catch` or `throws`.",
            "Declare `StringReader r = new StringReader(\"a\");`, then on the next line `r = new StringReader(\"b\");`, then `try (r) { ... }`. Compile it.",
            "Run `javap -c Doors` and count the calls to `Door.close` and to `addSuppressed`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `open front`, `open hall`, `open room`, `inside`, then `close room`, `close hall`, `close front`. Step 2 prints `stuck` followed by three suppressed messages in the order `cannot close room`, `cannot close hall`, `cannot close front`. Step 3 prints `cannot close front, suppressed: 0`: each `finally` replaced the exception before it, and the outermost close failure is all that's left. Step 4 fails with `unreported exception Exception; must be caught or declared to be thrown` and the note `exception thrown from implicit call to close() on resource variable 'a'`; a sub-interface like `TemporaryLocale.Restore` with `void close();` fixes it. Step 5 fails with `variable r used as a try-with-resources resource neither final nor effectively final`. Step 6 shows six `close` call sites and three `addSuppressed` calls: two closes and one suppression handler per resource, because three resources compile like three nested statements.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `SYNTAX     try (A a = ...; B b = ...) { body }   catch/finally optional
           Java 9: try (existingFinalVar) { ... }
           Java 22+: try (var _ = guard()) { ... }

RESOURCE   type implements AutoCloseable (compile-time check)
           declared variable is implicitly final, scoped to body
           null -> not closed, no NPE

ORDER      open a, open b ... body ... close b, close a
           failed open: earlier ones closed, later never opened
           close happens BEFORE catch and finally

EXCEPTIONS body fails + close fails -> body wins,
                       close.addSuppressed'ed into it
           body ok    + close fails -> close's exception
           finally by hand: cleanup exception REPLACES original
           close() rethrowing same object -> "Self-suppression
                       not permitted"

INTERFACES AutoCloseable  close() throws Exception, may repeat
           Closeable      close() throws IOException, idempotent

BYTECODE   no new instruction: 2 close() sites per resource,
           Throwable handler -> addSuppressed -> athrow
           ifnull skipped when the resource comes from new

JDK        streams, readers, Files.lines, Scanner, JDBC (7),
           ExecutorService (19), HttpClient (21); Lock: wrap it

OWNERSHIP  whoever opens it and uses it last closes it`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "try-with-resources closes every declared resource on every path, in reverse order, before `catch` and `finally`, and keeps the body's exception with close failures attached as suppressed. Closing by hand in `finally` got all three of those wrong in my tests.",
            "The resources themselves matter as much as the statement: declare every wrapper layer, make `close()` narrow, idempotent and free of `InterruptedException`, and close only what the method owns.",
            "This lesson was about one exception surviving cleanup intact. The next lesson, Exception Handling Best Practices, is about what to do with it once it arrives: checked or unchecked, catch or propagate, log once with the full chain, and how exceptions behave in streams, threads, `CompletableFuture` and Spring.",
          ],
        },
      ],
    },
  ],
};
