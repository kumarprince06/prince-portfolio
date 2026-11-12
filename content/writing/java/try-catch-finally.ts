import type { Lesson } from "../types";

export const tryCatchFinally: Lesson = {
  slug: "try-catch-finally",
  date: "2026-11-13",
  title: "try, catch and finally",
  description:
    "How Java's try, catch and finally really behave on the normal, caught and uncaught paths: catch order and the unreachable-catch errors, multi-catch and its implicitly final parameter, why catching Exception or Throwable hides bugs, when finally does and doesn't run, a return in finally that silently swallows an exception, nested try and rethrowing, down to the bytecode exception table, the copies of every finally block javac generates, frame-by-frame unwinding, and a payment marked paid although the charge was declined.",
  tags: ["Core Java", "Exceptions", "try-catch", "finally"],
  sections: [
    {
      title: "What try, catch and finally Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Exceptions and the Exception Hierarchy, was about the thing being thrown: what a `Throwable` is, `Error` versus `Exception`, checked versus unchecked, and how the JVM creates an exception object and throws it. This lesson is about the other end, the code that **receives** it. Java gives me exactly one statement for that, the `try` statement, with three parts:",
        },
        {
          type: "list",
          items: [
            "**`try`** marks a block of code whose exceptions I want a say in.",
            "**`catch`** declares a handler for one type of exception (or several, with multi-catch). If the exception thrown inside `try` is an instance of that type, the handler runs instead of the rest of the `try` block.",
            "**`finally`** is code that runs when the `try` statement is left, whichever way it's left: normally, through a `return`, `break` or `continue`, by a caught exception, or by an exception nobody here caught.",
          ],
        },
        {
          type: "paragraph",
          text: "That sounds simple, and the happy path is. The parts that cause real bugs are the edges: the order of catch clauses, a catch that's broader than its author meant, a `finally` that returns or throws and quietly replaces what the `try` block was doing, and the handful of cases where `finally` doesn't run at all. I also wanted to see what the compiler actually does with these blocks, because the answers to most interview questions on this topic (\"what's returned when try returns x and finally changes x?\") fall straight out of the bytecode.",
        },
        {
          type: "paragraph",
          text: "The Methods lesson noted, in passing, that a thrown exception discards frames until something handles it. This lesson finishes that story: the exception table each method carries, how the JVM searches it, and how it unwinds the stack one frame at a time. The production section then rebuilds a payment bug where one `return` inside a `finally` turned a declined card into a successful payment.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Structured exception handling predates Java by about thirty years. PL/I in the 1960s had `ON` conditions, handlers registered for named error conditions. CLU, Barbara Liskov's language at MIT in the 1970s, made exceptions part of a procedure's interface: a procedure listed the exceptions it could signal, an idea that Java's checked exceptions and `throws` clause echo. Ada 83 had exception handlers at the end of a block. C++ added `try`, `catch` and `throw` around 1990, and standardized them in C++98, but deliberately has no `finally`: in C++, cleanup goes in destructors that run as the stack unwinds (RAII). Modula-3, often listed among Java's influences, had both `TRY ... EXCEPT` and `TRY ... FINALLY`.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (January 1996) took the `try`, `catch` and `throw` syntax from C++, added `finally`, and made the compiler enforce checked exceptions. Java has no destructors, and the garbage collector decides when an object goes away, so `finally` was the only reliable place to release things like files, sockets and locks. That's why so much pre-2011 Java code is full of `finally { if (in != null) in.close(); }`.",
        },
        {
          type: "paragraph",
          text: "The early `javac` compiled a `finally` block as a small subroutine inside the method, called with the `jsr` instruction and left with `ret`. Those two instructions made bytecode verification much harder, and modern `javac` doesn't use them: it copies the `finally` code into every exit path instead, which the Internal Working section shows. Since class file version 51 (Java 7), `jsr` may not appear in a class file at all (JVMS 4.9.1), which leaves `ret` with nothing to return to.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`try`/`catch`/`finally`, checked exceptions, `throws`", "The statement this lesson is about; its rules haven't changed since, only grown"],
            ["Java 1.4 (2002)", "Exception chaining: `getCause()`, `initCause()`, cause constructors", "A catch block can wrap an exception without losing the original; the throw, throws and Custom Exceptions lesson covers it"],
            ["Java 7 (2011)", "Multi-catch, more precise rethrow, try-with-resources and suppressed exceptions (Project Coin, JSR 334)", "One handler for several unrelated types, and a fix for the \"exception in finally hides the original\" problem"],
            ["Java 7 (2011)", "Class files of version 51 and up may not contain `jsr`", "`finally` is always compiled as inlined copies"],
            ["Java 9 (2017)", "try-with-resources accepts an effectively final variable (JEP 213)", "Covered in the try-with-resources lesson"],
            ["Java 14 (2020)", "Helpful `NullPointerException` messages (JEP 358), on by default from Java 15", "The messages caught in this lesson name the null expression"],
            ["Java 20 (2023)", "`Thread.stop()` always throws `UnsupportedOperationException`", "One old way to kill a thread mid-`try` and skip its `finally` is gone"],
            ["Java 21 (2023)", "Unnamed variables `_` as a preview (JEP 443)", "A catch parameter I don't use can be `_`"],
            ["Java 22 (2024)", "Unnamed variables final (JEP 456)", "`catch (NumberFormatException _)` compiles without flags on 22 and later, including the Java 25 LTS"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a technician in a machine workshop, with a fire-safety routine.",
        },
        {
          type: "list",
          items: [
            "**The `try` block** is the job on the machine. Most of the time the part just gets made and nothing else happens.",
            "**A `catch` block** is an extinguisher for one kind of fire. A grease fire needs a different extinguisher from an electrical fire, so the technician checks the extinguishers in the order they hang on the wall and uses the first one rated for this fire. That's matching by exception type, top to bottom.",
            "**The order on the wall matters.** If the general-purpose extinguisher hangs first, the specialised one behind it is never reached. Java turns that mistake into a compile error.",
            "**The `finally` block** is switching off the machine's power. It happens whether the part came out fine, a small fire was put out, or the technician had to run out of the workshop.",
            "**No matching extinguisher** means the technician leaves the bench and the problem goes to the shift supervisor, then the plant manager. That's the exception propagating to the calling method, frame by frame, until someone has a handler. If nobody does, the workshop shuts for the day: the thread dies.",
            "**Catching `Throwable`** is spraying foam at everything, including a gas leak that really needs the building evacuated. It looks like the problem went away.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks down. Switching off the power can't cancel the fire report, but in Java a `finally` block that executes `return` really does make the exception disappear, and one that throws replaces it. And a real technician who hears the alarm for the whole building (`System.exit`) still switches the machine off on the way out; Java's `finally` doesn't run at all in that case.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Anatomy of a try statement",
        },
        {
          type: "code",
          language: "java",
          code: `try {
    // statements that might throw
} catch (NumberFormatException e) {       // catch clause: type + parameter
    // handler for that type and its subclasses
} catch (IllegalStateException | ArithmeticException e) {   // multi-catch, Java 7
    // one handler for several unrelated types
} finally {
    // runs however the try statement is left
}`,
        },
        {
          type: "table",
          headers: ["Part", "Required?", "Rules"],
          rows: [
            ["`try` block", "Always", "Braces are mandatory, even for one statement"],
            ["`catch` clauses", "Zero or more", "The type must be `Throwable` or a subclass. A checked type must be one the `try` block can throw (`Exception` and `Throwable` are exempt)"],
            ["`finally` block", "Zero or one", "Must come last"],
            ["At least one of `catch` or `finally`", "Yes", "A bare `try { }` is a compile error. try-with-resources is the one form that may have neither"],
          ],
        },
        {
          type: "paragraph",
          text: "The JLS defines this in 14.20, and splits it into two forms: `try`-`catch` (14.20.1) and `try`-`finally` or `try`-`catch`-`finally` (14.20.2). The rules about which `catch` clauses are legal live in the exception-checking section, 11.2.3.",
        },
        {
          type: "heading",
          text: "Normal and abrupt completion",
        },
        {
          type: "paragraph",
          text: "The JLS describes every statement as completing either **normally** (it ran to the end) or **abruptly**, and gives a reason for an abrupt completion: a `break`, a `continue`, a `return`, or a `throw` of some value (JLS 14.1). The whole behaviour of `try` is defined in those terms, and it's the cleanest way I've found to reason about tricky cases:",
        },
        {
          type: "table",
          headers: ["The try block...", "A matching catch?", "What happens"],
          rows: [
            ["completes normally", "not consulted", "`finally` runs, then execution continues after the statement"],
            ["completes abruptly by `return`, `break` or `continue`", "not consulted", "`finally` runs, then the `return`/`break`/`continue` carries on"],
            ["throws exception E", "yes, the first clause whose type E is an instance of", "That catch block runs, then `finally`. The `try` statement's result is the catch block's result"],
            ["throws exception E", "no", "`finally` runs, then E keeps propagating out of the statement"],
            ["anything", "", "If `finally` itself completes abruptly (its own `return`, `throw`, `break`, `continue`), that **replaces** whatever the try or catch was doing, including an exception in flight"],
          ],
        },
        {
          type: "paragraph",
          text: "The last row is the dangerous one, and it's in the specification on purpose (JLS 14.20.2): a `finally` block that completes abruptly wins. Two sections below show it swallowing an exception and overriding a return value.",
        },
        {
          type: "heading",
          text: "How a catch clause matches",
        },
        {
          type: "list",
          items: [
            "A clause `catch (T e)` matches if the thrown object is an instance of `T`, which includes every subclass of `T`. It's the same test as `instanceof`.",
            "Clauses are tried **in source order**, and the first match wins. Only one catch block runs per exception.",
            "An exception thrown **inside** a catch block is not handled by the sibling catch clauses of the same `try`. It goes to `finally`, then out to an enclosing `try` or the caller.",
            "`javac` rejects a clause that can never be reached because an earlier clause already catches its type or a supertype: `exception X has already been caught`.",
            "`javac` rejects a clause for a **checked** exception the `try` block can't throw: `exception X is never thrown in body of corresponding try statement`. `Exception`, `Throwable` and all unchecked types are exempt, because the block can always throw some unchecked exception.",
          ],
        },
        {
          type: "heading",
          text: "Multi-catch rules (Java 7)",
        },
        {
          type: "list",
          items: [
            "`catch (A | B e)` handles `A` or `B` with one block. The alternatives can't be related by subclassing: `NumberFormatException | IllegalArgumentException` is an error, since the second already covers the first.",
            "The parameter is **implicitly final**. Assigning to it is a compile error.",
            "Its static type is the least upper bound of the alternatives: for `NumberFormatException | ArithmeticException`, that's `RuntimeException`. Only the methods of that type are callable without a cast.",
            "In the class file it's one handler and several exception table rows, one per alternative.",
          ],
        },
        {
          type: "heading",
          text: "What the catch parameter is",
        },
        {
          type: "paragraph",
          text: "`e` is an ordinary local variable whose scope is the catch block. In a normal (uni-catch) clause, it isn't final, so `e = new ...` compiles, though I never do it, because it also turns off the precise-rethrow analysis that the next lesson covers. From Java 22, an unused parameter can be written `_`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The exception table",
        },
        {
          type: "paragraph",
          text: "There's no bytecode instruction for \"enter a try block\". Instead, every method's `Code` attribute in the class file carries an **exception table** (JVMS 4.7.3): a list of rows, each saying \"if an exception of this type is thrown while the program counter is in this range, jump to this handler\". I compiled the smallest method that has all three parts:",
        },
        {
          type: "code",
          language: "java",
          title: "FinallyCopies.java",
          code: `public class FinallyCopies {
    static int parse(String text) {
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException e) {
            return -1;
        } finally {
            System.out.println("cleanup");
        }
    }

    public static void main(String[] args) {
        System.out.println(parse("42"));
        System.out.println(parse("forty-two"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac FinallyCopies.java && java FinallyCopies
javap -c FinallyCopies`,
        },
        {
          type: "output",
          text: `cleanup
42
cleanup
-1`,
        },
        {
          type: "output",
          text: `  static int parse(java.lang.String);
    Code:
       0: aload_0
       1: invokestatic  #7                  // Method java/lang/Integer.parseInt:(Ljava/lang/String;)I
       4: istore_1
       5: getstatic     #13                 // Field java/lang/System.out:Ljava/io/PrintStream;
       8: ldc           #19                 // String cleanup
      10: invokevirtual #21                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      13: iload_1
      14: ireturn
      15: astore_1
      16: iconst_m1
      17: istore_2
      18: getstatic     #13                 // Field java/lang/System.out:Ljava/io/PrintStream;
      21: ldc           #19                 // String cleanup
      23: invokevirtual #21                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      26: iload_2
      27: ireturn
      28: astore_3
      29: getstatic     #13                 // Field java/lang/System.out:Ljava/io/PrintStream;
      32: ldc           #19                 // String cleanup
      34: invokevirtual #21                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      37: aload_3
      38: athrow
    Exception table:
       from    to  target type
           0     5    15   Class java/lang/NumberFormatException
           0     5    28   any
          15    18    28   any`,
        },
        {
          type: "paragraph",
          text: "Here's how I read it:",
        },
        {
          type: "list",
          items: [
            "**`from` is inclusive and `to` is exclusive.** The first row covers offsets 0 to 4: the call to `parseInt` and the `istore_1` that saves its result. If a `NumberFormatException` is thrown in there, the JVM jumps to offset 15.",
            "**`any` is the finally block's row.** In the class file, its `catch_type` is 0, which means \"every throwable\". Row two sends any other exception from the try block to offset 28. Row three does the same for the catch block (offsets 15 to 17), so an exception thrown while handling the first one still reaches `finally`.",
            "**The `println(\"cleanup\")` appears three times**, at 5, 18 and 29. `javac` copied the `finally` block onto every way out: after the try block's value is computed, after the catch block's value is computed, and in the `any` handler, which runs it and then rethrows the saved exception with `aload_3`, `athrow`.",
            "**The return value is saved before `finally` runs.** `istore_1` stores the parsed number in a local slot, the `finally` copy runs, then `iload_1`, `ireturn` returns the saved slot. That one detail explains the \"try returns x, finally changes x\" question later in this lesson.",
            "**The normal path has no extra instructions.** Offsets 0 to 14 are exactly what the method would be without the `try`, plus the inlined `finally`. Nothing is pushed or registered on the way in.",
            "Each catch block starts with `astore`: when the JVM jumps to a handler, it clears the operand stack and pushes the exception reference, and the handler stores it into the catch parameter's slot (or, for `any`, into a hidden slot).",
          ],
        },
        {
          type: "image",
          src: "/images/java/try-catch-finally-exception-table.svg",
          alt: "The bytecode of FinallyCopies.parse drawn as five consecutive blocks: offsets 0 to 4 are the try body, 5 to 14 the first finally copy followed by iload_1 and ireturn, 15 to 17 the catch body, 18 to 27 the second finally copy followed by iload_2 and ireturn, 28 to 38 the any handler with the third finally copy, aload_3 and athrow. On the right, the three exception table rows: 0 to 5 NumberFormatException to 15, 0 to 5 any to 28, 15 to 18 any to 28, with arrows from each row to its target offset. A note says from is inclusive, to is exclusive, and any means catch_type 0.",
          caption: "One try-catch-finally in the class file: three copies of the finally code and three table rows. Nothing runs on the way into the try block.",
        },
        {
          type: "heading",
          text: "How the JVM finds a handler",
        },
        {
          type: "paragraph",
          text: "When something is thrown, either by `athrow` or implicitly by an instruction like `idiv` or `invokevirtual` on `null`, the JVM runs this search (JVMS 2.10 and the `athrow` description in chapter 6):",
        },
        {
          type: "code",
          language: "text",
          code: `handle(exception, frame):
    loop:
        pc = frame.currentInstruction
        for row in frame.method.exceptionTable:        // in table order
            if row.from <= pc < row.to
               and (row.type == any or exception instanceof row.type):
                frame.operandStack.clear()
                frame.operandStack.push(exception)
                frame.pc = row.target                  // continue in the handler
                return
        // no row matched: this method completes abruptly
        pop frame off the thread's stack                // its locals are gone
        if the stack is empty:
            thread's uncaught exception handler runs    // prints the stack trace
            thread terminates
        frame = caller's frame                         // pc = the invoke instruction
        // and search again, in the caller`,
        },
        {
          type: "list",
          items: [
            "**Table order matters.** The JVM takes the first matching row. `javac` writes the rows of an inner `try` before the rows of the `try` around it, so the innermost handler wins, and it writes catch clauses in source order, which is why the first matching clause wins.",
            "**The match is by class, at run time.** The `type` column is a constant pool reference to a class. The JVM resolves it when it first needs it and does an `instanceof`-style check against the thrown object's real class.",
            "**In the caller, the pc is the invoke instruction.** So a row in the caller matches if the call itself sits inside its `try` range. That's how a `try` in `main` catches something thrown five calls deeper.",
            "**The stack trace isn't built here.** It was captured when the exception object was constructed (`fillInStackTrace` in the `Throwable` constructor, covered in the previous lesson). Unwinding doesn't add or remove frames from it.",
          ],
        },
        {
          type: "heading",
          text: "Unwinding, frame by frame",
        },
        {
          type: "paragraph",
          text: "To watch the search happen across methods, I built a three-level call chain where only the bottom method, `main`, has a matching handler. The middle one has a `catch` for the wrong type and a `finally`:",
        },
        {
          type: "code",
          language: "java",
          title: "Unwind.java",
          code: `public class Unwind {
    static void checkStock(int quantity) {
        System.out.println("    checkStock: start");
        if (quantity > 5) {
            throw new IllegalStateException("only 5 left, asked for " + quantity);
        }
        System.out.println("    checkStock: ok");             // skipped when it throws
    }

    static void reserve(int quantity) {
        System.out.println("  reserve: start");
        try {
            checkStock(quantity);
            System.out.println("  reserve: reserved");        // skipped
        } catch (NumberFormatException e) {                   // wrong type: not a match
            System.out.println("  reserve: never runs");
        } finally {
            System.out.println("  reserve: finally");
        }
        System.out.println("  reserve: end");                  // skipped
    }

    static void placeOrder(int quantity) {
        System.out.println(" placeOrder: start");
        reserve(quantity);                                     // no try here at all
        System.out.println(" placeOrder: end");                // skipped
    }

    public static void main(String[] args) {
        try {
            placeOrder(9);
            System.out.println("main: order placed");          // skipped
        } catch (IllegalStateException e) {
            System.out.println("main: caught \\"" + e.getMessage() + "\\"");
            for (StackTraceElement frame : e.getStackTrace()) {
                System.out.println("main:   was in " + frame.getMethodName() + ":" + frame.getLineNumber());
            }
        }
        System.out.println("main: carries on");
    }
}`,
        },
        {
          type: "output",
          text: ` placeOrder: start
  reserve: start
    checkStock: start
  reserve: finally
main: caught "only 5 left, asked for 9"
main:   was in checkStock:5
main:   was in reserve:13
main:   was in placeOrder:25
main:   was in main:31
main: carries on`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c Unwind`,
        },
        {
          type: "output",
          text: `  static void reserve(int);
    Code:
       ...
       8: iload_0
       9: invokestatic  #33                 // Method checkStock:(I)V
      12: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
      15: ldc           #39                 // String   reserve: reserved
       ...
      51: astore_2
      52: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
      55: ldc           #41                 // String   reserve: finally
      57: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      60: aload_2
      61: athrow
       ...
    Exception table:
       from    to  target type
           8    20    31   Class java/lang/NumberFormatException
           8    20    51   any
          31    40    51   any

  public static void main(java.lang.String[]);
    ...
    Exception table:
       from    to  target type
           0    13    16   Class java/lang/IllegalStateException`,
        },
        {
          type: "paragraph",
          text: "(`checkStock` and `placeOrder` have no exception table at all; I trimmed the rest.) Following the exception through the four frames:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`checkStock` executes `athrow` at line 5. Its method has no exception table, so nothing matches. Its frame is popped, and `checkStock: ok` never prints.",
            "In `reserve`, the current pc is 9, the `invokestatic` that called `checkStock`. Row one covers 8 to 19 but wants `NumberFormatException`: no match. Row two covers 8 to 19 with `any`: match. The JVM jumps to 51, which stores the exception, prints `reserve: finally`, and **rethrows it** with `athrow` at 61.",
            "Offset 61 isn't inside any row (the third row only covers the catch block, 31 to 39), so `reserve` completes abruptly and its frame is popped. `reserve: end` never prints.",
            "`placeOrder` has no table. Popped, without printing `placeOrder: end`.",
            "In `main`, the pc is the call to `placeOrder`, inside 0 to 12, and the exception is an `IllegalStateException`. The handler at 16 runs. The rest of `main` carries on normally.",
          ],
        },
        {
          type: "paragraph",
          text: "The stack trace that `main` printed still lists all four methods with the lines they were at, `checkStock:5`, `reserve:13`, `placeOrder:25`, `main:31`, although three of those frames no longer existed when it was printed. It's a snapshot from construction time, not a view of the live stack.",
        },
        {
          type: "image",
          src: "/images/java/try-catch-finally-unwinding.svg",
          alt: "Four stacked frames for Unwind: checkStock on top, then reserve, placeOrder and main. An IllegalStateException is thrown in checkStock, which has no exception table, so its frame is popped. In reserve, the NumberFormatException row does not match, the any row does, so the finally copy runs and athrow rethrows; the frame is popped. placeOrder has no table and is popped. In main, the IllegalStateException row covers the call and matches, so the handler runs and main carries on.",
          caption: "Each frame gets one search of its own table. A finally is an any row that rethrows, so it delays the unwinding but never stops it.",
        },
        {
          type: "heading",
          text: "A try block costs nothing until something is thrown",
        },
        {
          type: "paragraph",
          text: "Because the table is just data on the side, entering a `try` block executes nothing. I compiled the same one-line method with and without a `try`:",
        },
        {
          type: "code",
          language: "java",
          title: "TryCost.java",
          code: `public class TryCost {
    static int plain(int[] values, int i) {
        return values[i] * 2;
    }

    static int guarded(int[] values, int i) {
        try {
            return values[i] * 2;
        } catch (ArrayIndexOutOfBoundsException e) {
            return 0;
        }
    }

    static long sumPlain(int[] values) {
        long sum = 0;
        for (int round = 0; round < 50_000; round++) {
            for (int i = 0; i < values.length; i++) sum += plain(values, i);
        }
        return sum;
    }

    static long sumGuarded(int[] values) {
        long sum = 0;
        for (int round = 0; round < 50_000; round++) {
            for (int i = 0; i < values.length; i++) sum += guarded(values, i);
        }
        return sum;
    }

    public static void main(String[] args) {
        int[] values = new int[1_000];
        for (int i = 0; i < values.length; i++) values[i] = i;

        for (int run = 1; run <= 5; run++) {
            long t0 = System.nanoTime();
            long a = sumPlain(values);
            long t1 = System.nanoTime();
            long b = sumGuarded(values);
            long t2 = System.nanoTime();
            System.out.printf("run %d: plain %3d ms, with try %3d ms (same sum: %b)%n",
                    run, (t1 - t0) / 1_000_000, (t2 - t1) / 1_000_000, a == b);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c TryCost`,
        },
        {
          type: "output",
          text: `  static int plain(int[], int);
    Code:
       0: aload_0
       1: iload_1
       2: iaload
       3: iconst_2
       4: imul
       5: ireturn

  static int guarded(int[], int);
    Code:
       0: aload_0
       1: iload_1
       2: iaload
       3: iconst_2
       4: imul
       5: ireturn
       6: astore_2
       7: iconst_0
       8: ireturn
    Exception table:
       from    to  target type
           0     5     6   Class java/lang/ArrayIndexOutOfBoundsException`,
        },
        {
          type: "paragraph",
          text: "Offsets 0 to 5 are byte-for-byte identical. The handler sits after the `ireturn`, where the normal path never goes. The timing, from one of my runs on JDK 21:",
        },
        {
          type: "output",
          text: `run 1: plain  22 ms, with try  22 ms (same sum: true)
run 2: plain  24 ms, with try  23 ms (same sum: true)
run 3: plain  16 ms, with try  15 ms (same sum: true)
run 4: plain  15 ms, with try  15 ms (same sum: true)
run 5: plain  15 ms, with try  15 ms (same sum: true)`,
        },
        {
          type: "paragraph",
          text: "Fifty million calls each way, and the difference was inside the noise every time I ran it. These are rough wall-clock numbers on my machine, with other JVMs running at the same time, so the absolute milliseconds mean little; the point is that the two columns track each other. The JIT-compiled code keeps the same design: HotSpot records, for each compiled method, which code addresses map to which handler, and only consults that table when something is actually thrown. What does cost something is the throw itself, mostly building the stack trace, which the previous lesson covers.",
        },
      ],
    },
    {
      title: "The Three Paths Through a try Statement",
      blocks: [
        {
          type: "paragraph",
          text: "Every `try` statement is left in one of three ways: normally, through a catch block, or with an exception nobody here handles. I put a print at every point of one method and called it once per path:",
        },
        {
          type: "code",
          language: "java",
          title: "ThreePaths.java",
          code: `public class ThreePaths {
    static int pricePerItem(String totalText, int items) {
        System.out.println("  try: start with \\"" + totalText + "\\" / " + items);
        try {
            int total = Integer.parseInt(totalText);    // may throw NumberFormatException
            int each = total / items;                   // may throw ArithmeticException
            System.out.println("  try: done, each = " + each);
            return each;
        } catch (ArithmeticException e) {
            System.out.println("  catch: " + e.getMessage());
            return 0;
        } finally {
            System.out.println("  finally: runs on every path");
        }
    }

    public static void main(String[] args) {
        System.out.println("1. normal");
        System.out.println("  main got " + pricePerItem("1200", 4));

        System.out.println("2. caught");
        System.out.println("  main got " + pricePerItem("1200", 0));

        System.out.println("3. not caught here");
        System.out.println("  main got " + pricePerItem("twelve", 4));
        System.out.println("never printed");
    }
}`,
        },
        {
          type: "output",
          text: `1. normal
  try: start with "1200" / 4
  try: done, each = 300
  finally: runs on every path
  main got 300
2. caught
  try: start with "1200" / 0
  catch: / by zero
  finally: runs on every path
  main got 0
3. not caught here
  try: start with "twelve" / 4
  finally: runs on every path
Exception in thread "main" java.lang.NumberFormatException: For input string: "twelve"
	at java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
	at java.base/java.lang.Integer.parseInt(Integer.java:662)
	at java.base/java.lang.Integer.parseInt(Integer.java:778)
	at ThreePaths.pricePerItem(ThreePaths.java:5)
	at ThreePaths.main(ThreePaths.java:25)`,
        },
        {
          type: "list",
          items: [
            "**Normal path.** The whole `try` block ran, and its `return each` was held while `finally` printed its line. Only then did `main` get `300`. The catch block was skipped entirely.",
            "**Caught path.** `1200 / 0` threw `ArithmeticException`. The rest of the `try` block (`try: done`) was skipped, the catch block ran and returned `0`, and `finally` still ran before that `0` reached `main`.",
            "**Uncaught path.** `parseInt(\"twelve\")` threw `NumberFormatException`, which the single `catch` doesn't match. `finally` ran anyway, then the exception carried on out of `pricePerItem`, through `main` (no `try` there), and killed the main thread. The default uncaught-exception handler printed the stack trace, and the JVM exited with status 1. `never printed` wasn't.",
          ],
        },
        {
          type: "paragraph",
          text: "The third path is also the answer to \"can `try` exist without `catch`?\". Yes: `try` with only `finally` is legal and common, and it behaves like that third path every time something is thrown. It's for code that has cleanup to do but no business handling the error. The syntax tour below includes one.",
        },
        {
          type: "diagram",
          text: `                    ┌──────────────┐
                    │  try block   │
                    └──────┬───────┘
          ┌────────────────┼────────────────────┐
     no exception     throws E, a          throws E, no
          │           catch matches        catch matches
          │                │                    │
          │         ┌──────▼───────┐            │
          │         │ that catch   │            │
          │         └──────┬───────┘            │
          │                │                    │
          └────────► ┌─────▼────────┐ ◄─────────┘
                     │   finally    │
                     └─────┬────────┘
          ┌────────────────┼────────────────────┐
   continue after    continue after       E propagates
   the statement     the statement        to the caller
   (or return)       (or return)`,
          caption: "Three ways in, one finally, and the same three ways out, unless finally itself returns or throws.",
        },
      ],
    },
    {
      title: "Multiple catch Blocks and Their Order",
      blocks: [
        {
          type: "paragraph",
          text: "One `try` can have as many catch clauses as I need. They're checked top to bottom, and the first one whose type matches wins. Because a clause also catches every subclass of its type, the useful order is **most specific first**. Here three clauses sit on one hierarchy: `NumberFormatException` extends `IllegalArgumentException`, which extends `RuntimeException`.",
        },
        {
          type: "code",
          language: "java",
          title: "CatchChain.java",
          code: `public class CatchChain {
    static int quantity(String text) {
        if (text == null) {
            throw new NullPointerException("quantity is missing");
        }
        int q = Integer.parseInt(text);                    // NumberFormatException
        if (q < 0) {
            throw new IllegalArgumentException("quantity " + q + " is negative");
        }
        return q;
    }

    static String check(String text) {
        try {
            return "ok " + quantity(text);
        } catch (NumberFormatException e) {                // most specific first
            return "NumberFormatException: " + e.getMessage();
        } catch (IllegalArgumentException e) {             // its superclass
            return "IllegalArgumentException: " + e.getMessage();
        } catch (RuntimeException e) {                     // anything else unchecked
            return "RuntimeException (" + e.getClass().getSimpleName() + "): " + e.getMessage();
        }
    }

    public static void main(String[] args) {
        System.out.println(check("3"));
        System.out.println(check("three"));
        System.out.println(check("-3"));
        System.out.println(check(null));
    }
}`,
        },
        {
          type: "output",
          text: `ok 3
NumberFormatException: For input string: "three"
IllegalArgumentException: quantity -3 is negative
RuntimeException (NullPointerException): quantity is missing`,
        },
        {
          type: "list",
          items: [
            "`\"three\"` threw `NumberFormatException`. The first clause matched, and the other two weren't looked at, although the exception is also an `IllegalArgumentException` and a `RuntimeException`.",
            "`\"-3\"` threw a plain `IllegalArgumentException`. It isn't a `NumberFormatException`, so the second clause took it.",
            "`null` threw `NullPointerException`, which only the third clause covers. `getSimpleName()` shows the real class: a catch clause narrows what I know statically, not what the object is.",
          ],
        },
        {
          type: "heading",
          text: "The wrong order is a compile error",
        },
        {
          type: "paragraph",
          text: "If a general clause comes first, the specific one after it can never run. Java doesn't leave that as dead code, it refuses to compile it:",
        },
        {
          type: "code",
          language: "java",
          title: "CatchOrder.java",
          code: `public class CatchOrder {
    public static void main(String[] args) {
        try {
            int qty = Integer.parseInt(args[0]);
            System.out.println(qty);
        } catch (Exception e) {
            System.out.println("something went wrong");
        } catch (NumberFormatException e) {
            System.out.println("not a number");
        }
    }
}`,
        },
        {
          type: "output",
          text: `CatchOrder.java:8: error: exception NumberFormatException has already been caught
        } catch (NumberFormatException e) {
          ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The fix is to swap the two clauses. The rule only applies to types on the same branch of the hierarchy: `catch (NumberFormatException e)` followed by `catch (ArithmeticException e)` can be in either order, because neither is a subclass of the other.",
        },
        {
          type: "heading",
          text: "Catching a checked exception that can't happen",
        },
        {
          type: "paragraph",
          text: "The second compile-time check goes the other way. For a **checked** exception type, `javac` knows exactly what the `try` block can throw, because every method declares its checked exceptions. A clause for one that can't occur is an error too:",
        },
        {
          type: "code",
          language: "java",
          title: "NeverThrown.java",
          code: `import java.io.IOException;

public class NeverThrown {
    public static void main(String[] args) {
        try {
            System.out.println(Integer.parseInt("42"));
        } catch (IOException e) {
            System.out.println("cannot happen");
        }
    }
}`,
        },
        {
          type: "output",
          text: `NeverThrown.java:7: error: exception IOException is never thrown in body of corresponding try statement
        } catch (IOException e) {
          ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Unchecked types are exempt (any statement can throw a `RuntimeException`), and so are `Exception` and `Throwable`, because they include the unchecked ones. That exemption is one reason `catch (Exception e)` is so easy to write: the compiler never objects to it, wherever it's placed.",
        },
      ],
    },
    {
      title: "Multi-catch",
      blocks: [
        {
          type: "paragraph",
          text: "Before Java 7, two unrelated exceptions that needed the same handling meant two identical catch blocks, or one catch of a common supertype that caught too much. Multi-catch lists the alternatives with `|`:",
        },
        {
          type: "code",
          language: "java",
          title: "MultiCatchDemo.java",
          code: `public class MultiCatchDemo {
    static String kind(IllegalArgumentException e) { return "IllegalArgumentException"; }
    static String kind(RuntimeException e)         { return "RuntimeException"; }
    static String kind(Exception e)                { return "Exception"; }

    static int perItem(String total, String items) {
        try {
            return Integer.parseInt(total) / Integer.parseInt(items);
        } catch (NumberFormatException | ArithmeticException e) {
            System.out.println("static type " + kind(e) + ", runtime class "
                    + e.getClass().getSimpleName() + ": " + e.getMessage());
            return -1;
        }
    }

    public static void main(String[] args) {
        System.out.println(perItem("900", "3"));
        System.out.println(perItem("900", "zero"));
        System.out.println(perItem("900", "0"));
    }
}`,
        },
        {
          type: "output",
          text: `300
static type RuntimeException, runtime class NumberFormatException: For input string: "zero"
-1
static type RuntimeException, runtime class ArithmeticException: / by zero
-1`,
        },
        {
          type: "paragraph",
          text: "The overloaded `kind` methods show what `e` is to the compiler. Overloads are picked at compile time from the declared type (the Methods lesson), and `kind(e)` picked `kind(RuntimeException)`: the **least upper bound** of `NumberFormatException` and `ArithmeticException`. At run time, `getClass()` still reports the real class. In the class file, the clause is two rows pointing at one handler:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c MultiCatchDemo`,
        },
        {
          type: "output",
          text: `  static int perItem(java.lang.String, java.lang.String);
    Code:
       0: aload_0
       1: invokestatic  #13                 // Method java/lang/Integer.parseInt:(Ljava/lang/String;)I
       4: aload_1
       5: invokestatic  #13                 // Method java/lang/Integer.parseInt:(Ljava/lang/String;)I
       8: idiv
       9: ireturn
      10: astore_2
      11: getstatic     #23                 // Field java/lang/System.out:Ljava/io/PrintStream;
      14: aload_2
      15: invokestatic  #29                 // Method kind:(Ljava/lang/RuntimeException;)Ljava/lang/String;
      ...
    Exception table:
       from    to  target type
           0     9    10   Class java/lang/NumberFormatException
           0     9    10   Class java/lang/ArithmeticException`,
        },
        {
          type: "paragraph",
          text: "The handler at 10 exists once, so the bytecode is smaller than two copied catch blocks would be. Note the `to` column again: `ireturn` at 9 is outside the range, since returning can't throw either of these.",
        },
        {
          type: "heading",
          text: "Alternatives can't be related by subclassing",
        },
        {
          type: "code",
          language: "java",
          title: "MultiCatchSubclass.java",
          code: `public class MultiCatchSubclass {
    public static void main(String[] args) {
        try {
            System.out.println(Integer.parseInt(args[0]));
        } catch (NumberFormatException | IllegalArgumentException e) {
            System.out.println("bad input: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `MultiCatchSubclass.java:5: error: Alternatives in a multi-catch statement cannot be related by subclassing
        } catch (NumberFormatException | IllegalArgumentException e) {
                                         ^
  Alternative NumberFormatException is a subclass of alternative IllegalArgumentException
1 error`,
        },
        {
          type: "paragraph",
          text: "`IllegalArgumentException` already covers `NumberFormatException`, so listing both is redundant, and JLS 14.20 makes it an error rather than a style issue. The fix is `catch (IllegalArgumentException e)` alone.",
        },
        {
          type: "heading",
          text: "The parameter is implicitly final",
        },
        {
          type: "code",
          language: "java",
          title: "MultiCatchFinal.java",
          code: `public class MultiCatchFinal {
    public static void main(String[] args) {
        try {
            System.out.println(Integer.parseInt(args[0]) / 2);
        } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
            e = new IllegalArgumentException("replaced");
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `MultiCatchFinal.java:6: error: multi-catch parameter e may not be assigned
            e = new IllegalArgumentException("replaced");
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "With one type, `catch (NumberFormatException e) { e = new NumberFormatException(\"swapped\"); }` compiles; I checked. With several, `javac` refuses (JLS 14.20 declares the parameter implicitly final). The handler is shared by every alternative, and a `throw e;` from it is analysed as throwing exactly those alternatives, which only holds if `e` still refers to what was caught. That analysis is the precise rethrow the next lesson covers.",
        },
        {
          type: "heading",
          text: "An unused parameter: _ (Java 22 and later)",
        },
        {
          type: "paragraph",
          text: "When the handler doesn't need the exception object at all, Java 22 (JEP 456) lets me say so. On JDK 21 it's a preview feature:",
        },
        {
          type: "code",
          language: "java",
          title: "UnnamedCatch.java",
          code: `public class UnnamedCatch {
    static int parseOrDefault(String text, int fallback) {
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException _) {        // Java 22+: I don't need the exception object
            return fallback;
        }
    }

    public static void main(String[] args) {
        System.out.println(parseOrDefault("12", 1) + " " + parseOrDefault("twelve", 1));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac UnnamedCatch.java                  # JDK 21`,
        },
        {
          type: "output",
          text: `UnnamedCatch.java:5: error: unnamed variables are a preview feature and are disabled by default.
        } catch (NumberFormatException _) {        // Java 22+: I don't need the exception object
                                       ^
  (use --enable-preview to enable unnamed variables)
1 error`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac UnnamedCatch.java && java UnnamedCatch      # JDK 25`,
        },
        {
          type: "output",
          text: `12 1`,
        },
        {
          type: "paragraph",
          text: "That output is from JDK 25.0.5. The `_` also works in multi-catch. It's honest documentation that the exception is deliberately ignored, which matters, because an ignored exception is usually a bug. Here, a fallback for unparseable input is the whole point of the method.",
        },
      ],
    },
    {
      title: "Catching Exception, Throwable or Something Specific",
      blocks: [
        {
          type: "paragraph",
          text: "A catch clause is a claim: \"I know what this failure means and how to recover from it.\" The broader the type, the more failures that claim covers, including ones I never thought about. A discount lookup shows the problem. Customer 2 has a data bug: a missing tier.",
        },
        {
          type: "code",
          language: "java",
          title: "BroadCatch.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class BroadCatch {
    record Customer(String name, String tier) { }

    static final Map<Long, Customer> CUSTOMERS = new HashMap<>();
    static {
        CUSTOMERS.put(1L, new Customer("Asha", "GOLD"));
        CUSTOMERS.put(2L, new Customer("Ravi", null));        // a data bug: tier missing
    }

    // Broad: every failure becomes "invalid id"
    static int discountBroad(String idText) {
        try {
            Customer c = CUSTOMERS.get(Long.parseLong(idText));
            return c.tier().equals("GOLD") ? 10 : 0;
        } catch (Exception e) {
            System.out.println("  broad: treating \\"" + idText + "\\" as an invalid id");
            return 0;
        }
    }

    // Specific: only the failure I expect and know how to handle
    static int discountSpecific(String idText) {
        try {
            Customer c = CUSTOMERS.get(Long.parseLong(idText));
            return c.tier().equals("GOLD") ? 10 : 0;
        } catch (NumberFormatException e) {
            System.out.println("  specific: \\"" + idText + "\\" is not a number");
            return 0;
        }
    }

    public static void main(String[] args) {
        for (String id : new String[] {"1", "x7", "2"}) {
            System.out.println("broad(" + id + ") = " + discountBroad(id));
        }
        for (String id : new String[] {"1", "x7", "2"}) {
            System.out.println("specific(" + id + ") = " + discountSpecific(id));
        }
    }
}`,
        },
        {
          type: "output",
          text: `broad(1) = 10
  broad: treating "x7" as an invalid id
broad(x7) = 0
  broad: treating "2" as an invalid id
broad(2) = 0
specific(1) = 10
  specific: "x7" is not a number
specific(x7) = 0
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.equals(Object)" because the return value of "BroadCatch$Customer.tier()" is null
	at BroadCatch.discountSpecific(BroadCatch.java:28)
	at BroadCatch.main(BroadCatch.java:40)`,
        },
        {
          type: "list",
          items: [
            "**The broad version gave customer 2 the same answer as `\"x7\"`**: \"invalid id\", discount 0. The real cause, a `NullPointerException` from a missing tier, was turned into a wrong message and a wrong discount. Nothing was logged, nothing failed, and the data bug would stay in the database.",
            "**The specific version handled the one failure it understood**, a non-numeric id, and let the NPE through. The program crashed, with a helpful NPE message (JEP 358, on by default since Java 15) naming `tier()` as the null. That crash is the better outcome: it points straight at the bug.",
          ],
        },
        {
          type: "heading",
          text: "Throwable catches the things that aren't meant to be caught",
        },
        {
          type: "paragraph",
          text: "`Exception` at least stops at `Exception`. `Throwable` goes one level higher and also catches every `Error`: `StackOverflowError`, `OutOfMemoryError`, `AssertionError`, linkage errors. I ran four tasks through a method with both clauses, `Exception` first:",
        },
        {
          type: "code",
          language: "java",
          title: "CatchThrowable.java",
          code: `public class CatchThrowable {
    static int depth = 0;

    static void recurse() {
        depth++;
        recurse();
    }

    static void run(String label, Runnable task) {
        try {
            task.run();
            System.out.println(label + ": ok");
        } catch (Exception e) {
            System.out.println(label + ": caught as Exception -> " + e);
        } catch (Throwable t) {
            System.out.println(label + ": only Throwable caught it -> " + t);
        }
    }

    public static void main(String[] args) {
        run("parse", () -> Integer.parseInt("x"));
        run("recursion", CatchThrowable::recurse);
        run("assert", () -> { assert depth < 0 : "depth is not negative"; });
        run("big array", () -> { long[] huge = new long[Integer.MAX_VALUE - 8]; });
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -ea -Xmx64m CatchThrowable`,
        },
        {
          type: "output",
          text: `parse: caught as Exception -> java.lang.NumberFormatException: For input string: "x"
recursion: only Throwable caught it -> java.lang.StackOverflowError
assert: only Throwable caught it -> java.lang.AssertionError: depth is not negative
big array: only Throwable caught it -> java.lang.OutOfMemoryError: Java heap space`,
        },
        {
          type: "paragraph",
          text: "Three of the four failures went past `catch (Exception e)`, because they're `Error`s, and only `Throwable` stopped them. After an `OutOfMemoryError` or a `StackOverflowError`, the JVM may be in a state where the next allocation or call fails too, and an `AssertionError` means an invariant I wrote down is false. Carrying on as if nothing happened is rarely right. (Without `-ea`, assertions are disabled and the `assert` task prints `assert: ok`.) The Stack vs Heap lesson goes into the two big errors themselves.",
        },
        {
          type: "table",
          headers: ["Catch", "Catches", "Where it belongs"],
          rows: [
            ["A specific type, like `NumberFormatException`", "Only the failure I named, and its subclasses", "Almost everywhere: the code that knows what this failure means"],
            ["`IOException`, or another family type", "A related group of failures", "Where every member of the group gets the same handling"],
            ["`Exception`", "Every checked and unchecked exception, including NPEs from my own bugs", "Top-level boundaries only: a request handler, a job runner, a thread's main loop, which logs and fails the unit of work"],
            ["`Throwable`", "All of the above plus every `Error`", "Very rarely, at the outermost boundary of a thread or framework, to log and then rethrow or exit, never to carry on"],
          ],
        },
      ],
    },
    {
      title: "What finally Guarantees (and What It Doesn't)",
      blocks: [
        {
          type: "paragraph",
          text: "The usual sentence is \"`finally` always runs\". The accurate one is: `finally` runs whenever **control leaves the `try` statement**, by any route. If control never leaves, because the thread or the whole JVM stops in the middle, it doesn't run. I tested the two ways to stop the JVM from inside a `try`:",
        },
        {
          type: "code",
          language: "java",
          title: "ExitSkipsFinally.java",
          code: `public class ExitSkipsFinally {
    public static void main(String[] args) {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> System.out.println("shutdown hook runs")));
        try {
            System.out.println("try: argument " + args[0]);
            if (args[0].equals("exit")) {
                System.exit(3);
            } else if (args[0].equals("halt")) {
                Runtime.getRuntime().halt(4);
            }
            System.out.println("try: still here");
        } finally {
            System.out.println("finally: runs");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ExitSkipsFinally.java
java ExitSkipsFinally normal; echo "(exit code $?)"
java ExitSkipsFinally exit;   echo "(exit code $?)"
java ExitSkipsFinally halt;   echo "(exit code $?)"`,
        },
        {
          type: "output",
          text: `$ java ExitSkipsFinally normal
try: argument normal
try: still here
finally: runs
shutdown hook runs
(exit code 0)
$ java ExitSkipsFinally exit
try: argument exit
shutdown hook runs
(exit code 3)
$ java ExitSkipsFinally halt
try: argument halt
(exit code 4)`,
        },
        {
          type: "list",
          items: [
            "**`System.exit(3)`** never returns. It starts the JVM's shutdown sequence (shutdown hooks run, which is why `shutdown hook runs` appeared) and then halts. The thread that called it is still sitting inside the `try` block when the process ends, so `finally` never runs.",
            "**`Runtime.halt(4)`** is harsher: no shutdown hooks either. The process just ends with status 4.",
            "On the normal path, `finally` ran, `main` returned, and then the JVM ran the shutdown hook on its way out.",
          ],
        },
        {
          type: "paragraph",
          text: "The other case that catches people is a **daemon thread**. The JVM exits when the last non-daemon thread finishes, and daemon threads are simply abandoned wherever they are:",
        },
        {
          type: "code",
          language: "java",
          title: "DaemonFinally.java",
          code: `public class DaemonFinally {
    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            try {
                System.out.println("worker: try, sleeping");
                Thread.sleep(5_000);
            } catch (InterruptedException e) {
                System.out.println("worker: interrupted");
            } finally {
                System.out.println("worker: finally");
            }
        });
        worker.setDaemon(args.length > 0 && args[0].equals("daemon"));
        worker.start();
        Thread.sleep(200);
        if (!worker.isDaemon()) {
            worker.interrupt();                    // ask it to stop, and wait for it
            worker.join();
        }
        System.out.println("main: returning");
    }
}`,
        },
        {
          type: "output",
          text: `$ java DaemonFinally
worker: try, sleeping
worker: interrupted
worker: finally
main: returning
$ java DaemonFinally daemon
worker: try, sleeping
main: returning`,
        },
        {
          type: "paragraph",
          text: "As a normal thread, the worker was interrupted, left its `try` through the catch block, and ran `finally`. As a daemon, it was still sleeping inside `try` when `main` returned, and the JVM exited without running its `finally`. The Multithreading and Concurrency track covers daemon threads properly.",
        },
        {
          type: "table",
          headers: ["Situation", "Does finally run?", "Why"],
          rows: [
            ["Normal completion, `return`, `break`, `continue`", "Yes", "Control leaves the try statement"],
            ["Caught or uncaught exception", "Yes", "The `any` row sends it through finally before unwinding further"],
            ["An exception or `return` inside a catch block", "Yes", "The catch block is covered by its own `any` row"],
            ["`System.exit` inside try or catch", "No", "The JVM shuts down while the thread is still inside"],
            ["`Runtime.halt`, `kill -9`, a JVM crash, power loss", "No", "Nothing at all runs afterwards"],
            ["A daemon thread when the JVM exits", "No", "The thread is abandoned mid-try"],
            ["The try block never finishes (infinite loop, deadlock, a blocking call that never returns)", "Not yet", "Control hasn't left the statement"],
            ["Another thread calls `Thread.stop()` on this one", "Not possible since Java 20", "`stop()` now throws `UnsupportedOperationException`; before that, the injected `ThreadDeath` did run `finally` blocks"],
            ["`StackOverflowError` or `OutOfMemoryError` in try", "Yes, it's just a throwable", "But the finally code may fail the same way if it needs stack or heap"],
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "finally is not a guarantee against crashes",
          text: "Anything that must survive a crash, like \"this payment was taken\", can't depend on a `finally` block running. It needs to be written somewhere durable before the risky step, and reconciled afterwards. `finally` is for releasing in-process resources: locks, connections, files, temporary state.",
        },
      ],
    },
    {
      title: "return and finally",
      blocks: [
        {
          type: "heading",
          text: "A return in finally wins, and swallows exceptions",
        },
        {
          type: "paragraph",
          text: "Because a `finally` block that completes abruptly replaces whatever the try or catch block was doing, a `return` in `finally` overrides the try block's `return`, and it also throws away an exception in flight:",
        },
        {
          type: "code",
          language: "java",
          title: "ReturnInFinally.java",
          code: `public class ReturnInFinally {
    static String overrides() {
        try {
            return "from try";
        } finally {
            return "from finally";                  // wins over the try's return
        }
    }

    static int swallows(int[] stock, int index) {
        try {
            return stock[index];                    // throws for a bad index
        } finally {
            return -1;                              // the exception disappears
        }
    }

    public static void main(String[] args) {
        System.out.println(overrides());
        System.out.println(swallows(new int[] {7, 3}, 1));
        System.out.println(swallows(new int[] {7, 3}, 5));
        System.out.println("no exception reached main");
    }
}`,
        },
        {
          type: "output",
          text: `from finally
-1
-1
no exception reached main`,
        },
        {
          type: "list",
          items: [
            "`overrides()` returned `from finally`. The try block's `return \"from try\"` was evaluated, then cancelled.",
            "`swallows(..., 1)` should have returned `3`, and returned `-1`.",
            "`swallows(..., 5)` threw `ArrayIndexOutOfBoundsException` inside `try`. The `finally` block's `return -1` replaced it. `main` got a perfectly normal `-1`, and the exception left no trace at all.",
          ],
        },
        {
          type: "paragraph",
          text: "The compiler noticed, but only when asked. A plain `javac ReturnInFinally.java` printed nothing at all, on JDK 21 and on JDK 25. With the `finally` lint enabled:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac -Xlint:finally ReturnInFinally.java`,
        },
        {
          type: "output",
          text: `ReturnInFinally.java:7: warning: [finally] finally clause cannot complete normally
        }
        ^
ReturnInFinally.java:15: warning: [finally] finally clause cannot complete normally
        }
        ^
2 warnings`,
        },
        {
          type: "paragraph",
          text: "\"Cannot complete normally\" is the JLS way of saying the `finally` block always leaves abruptly, so whatever the try block was doing can never carry on. `-Xlint:all` includes it. The bytecode makes the swallowing visible:",
        },
        {
          type: "output",
          text: `  static java.lang.String overrides();
    Code:
       0: ldc           #7                  // String from try
       2: astore_0
       3: ldc           #9                  // String from finally
       5: areturn
       6: astore_1
       7: ldc           #9                  // String from finally
       9: areturn
    Exception table:
       from    to  target type
           0     3     6   any`,
        },
        {
          type: "paragraph",
          text: "`\"from try\"` is computed and stored in slot 0, then never loaded again. And the `any` handler at 6 stores the exception into slot 1 and returns. Compare it with `FinallyCopies`, where the handler ended in `aload_3`, `athrow`. Here there's no `athrow` anywhere: the exception has nowhere to go.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "It even hides checked exceptions from the compiler",
          text: "JLS 11.2.2 says a `try` statement can only throw what escapes it, and nothing escapes a `finally` that can't complete normally. So if the try block calls a method declared `throws SomeCheckedException`, a `return` in `finally` means the enclosing method compiles **without** declaring or catching it. I checked: removing the `return` gave `unreported exception ...; must be caught or declared to be thrown`. The production section shows what that does to a payment.",
        },
        {
          type: "heading",
          text: "try returns x, finally changes x",
        },
        {
          type: "paragraph",
          text: "The other half of the interview question. Without a `return` in `finally`, can `finally` change what's returned?",
        },
        {
          type: "code",
          language: "java",
          title: "FinallyChanges.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class FinallyChanges {
    static int count() {
        int x = 10;
        try {
            return x;                         // the value 10 is saved here
        } finally {
            x = 20;                           // changes the variable, not the saved value
        }
    }

    static List<String> items() {
        List<String> list = new ArrayList<>();
        list.add("pen");
        try {
            return list;                      // the reference is saved here
        } finally {
            list.add("ink");                  // same object: the caller sees this
        }
    }

    static List<String> replaced() {
        List<String> list = new ArrayList<>(List.of("pen"));
        try {
            return list;
        } finally {
            list = new ArrayList<>(List.of("pencil"));   // new object: the caller never sees it
        }
    }

    public static void main(String[] args) {
        System.out.println("count()    = " + count());
        System.out.println("items()    = " + items());
        System.out.println("replaced() = " + replaced());
    }
}`,
        },
        {
          type: "output",
          text: `count()    = 10
items()    = [pen, ink]
replaced() = [pen]`,
        },
        {
          type: "paragraph",
          text: "Three results, one rule: `return x;` evaluates `x` and saves the **value** before `finally` runs. For an `int` that value is `10`, and setting `x = 20` afterwards changes only the variable. For a `List`, the value is a reference: `finally` can't change which list is returned (`replaced()` still returned `[pen]`), but it can mutate the list that reference points at, so `items()` returned `[pen, ink]`. It's the same pass-by-value rule as in the Methods lesson, applied to a return value. The bytecode for `count()`:",
        },
        {
          type: "output",
          text: `  static int count();
    Code:
       0: bipush        10
       2: istore_0
       3: iload_0
       4: istore_1
       5: bipush        20
       7: istore_0
       8: iload_1
       9: ireturn`,
        },
        {
          type: "paragraph",
          text: "`x` is slot 0. `iload_0`, `istore_1` copies its value into a hidden slot 1, the inlined `finally` writes `20` into slot 0, and `iload_1`, `ireturn` returns the saved copy. There's no way for the finally code to reach slot 1.",
        },
      ],
    },
    {
      title: "When finally Throws",
      blocks: [
        {
          type: "paragraph",
          text: "A `throw` in `finally` follows the same rule as a `return`: it replaces whatever was in flight. It's easier to do by accident, because cleanup code calls methods, and methods throw:",
        },
        {
          type: "code",
          language: "java",
          title: "FinallyThrows.java",
          code: `public class FinallyThrows {
    static void saveReport(String name) {
        try {
            System.out.println("writing " + name);
            throw new IllegalStateException("disk full while writing " + name);
        } finally {
            System.out.println("closing " + name);
            closeFile(name);                       // throws too, and wins
        }
    }

    static void closeFile(String name) {
        throw new IllegalArgumentException("file handle for " + name + " already closed");
    }

    public static void main(String[] args) {
        try {
            saveReport("march.csv");
        } catch (RuntimeException e) {
            System.out.println("caught:     " + e);
            System.out.println("suppressed: " + e.getSuppressed().length);
            System.out.println("cause:      " + e.getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `writing march.csv
closing march.csv
caught:     java.lang.IllegalArgumentException: file handle for march.csv already closed
suppressed: 0
cause:      null`,
        },
        {
          type: "paragraph",
          text: "The exception that reached `main` is the one from `closeFile`. The real problem, \"disk full while writing march.csv\", is gone: it isn't the cause, and it isn't recorded as suppressed. Whoever reads the log will look for a double-close bug and never learn the disk was full.",
        },
        {
          type: "paragraph",
          text: "With a plain `finally`, keeping both means catching the cleanup exception inside `finally` and attaching it to the original with `addSuppressed`, by hand. That boilerplate is exactly what try-with-resources generates, and it's the subject of the try-with-resources lesson. For now, the rule I follow: cleanup code in `finally` must not be able to throw, or must catch what it throws.",
        },
      ],
    },
    {
      title: "Nested try and Rethrowing",
      blocks: [
        {
          type: "paragraph",
          text: "A `try` statement can sit inside another `try` block, inside a catch block, or inside a `finally`. The inner one gets the first chance at an exception; whatever it doesn't handle, or throws from its own handlers, goes to the outer one. That's useful when two scopes need different handling: one bad item versus the whole batch.",
        },
        {
          type: "code",
          language: "java",
          title: "NestedTry.java",
          code: `import java.util.List;

public class NestedTry {
    record Order(String id, String quantityText) { }

    static int importOrders(List<Order> orders) {
        int imported = 0;
        System.out.println("open batch");
        try {                                            // outer: the whole batch
            for (Order order : orders) {
                try {                                    // inner: one order
                    int quantity = Integer.parseInt(order.quantityText());
                    if (quantity <= 0) {
                        throw new IllegalStateException(order.id() + " has quantity " + quantity);
                    }
                    imported++;
                    System.out.println("  imported " + order.id());
                } catch (NumberFormatException e) {
                    System.out.println("  skipped " + order.id() + ": " + e.getMessage());
                } finally {
                    System.out.println("  inner finally for " + order.id());
                }
            }
        } catch (IllegalStateException e) {
            System.out.println("batch stopped: " + e.getMessage());
            throw new RuntimeException("import failed after " + imported + " orders", e);
        } finally {
            System.out.println("close batch");
        }
        return imported;
    }

    public static void main(String[] args) {
        System.out.println("result " + importOrders(List.of(new Order("A1", "2"), new Order("A2", "two"))));
        try {
            importOrders(List.of(new Order("B1", "1"), new Order("B2", "-4"), new Order("B3", "5")));
        } catch (RuntimeException e) {
            System.out.println("main: " + e.getMessage());
            System.out.println("main: cause was " + e.getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `open batch
  imported A1
  inner finally for A1
  skipped A2: For input string: "two"
  inner finally for A2
close batch
result 1
open batch
  imported B1
  inner finally for B1
  inner finally for B2
batch stopped: B2 has quantity -4
close batch
main: import failed after 1 orders
main: cause was java.lang.IllegalStateException: B2 has quantity -4`,
        },
        {
          type: "list",
          items: [
            "**A2's `NumberFormatException` was handled by the inner `try`.** The loop carried on, and the batch finished with one order imported.",
            "**B2's `IllegalStateException` didn't match the inner catch.** The inner `finally` ran first (`inner finally for B2`), then the exception left the loop, so B3 was never looked at.",
            "**The outer catch rethrew it wrapped**: `new RuntimeException(\"import failed after 1 orders\", e)` adds context the inner code didn't have, and passing `e` as the cause keeps the original. `main` saw both. Wrapping with a cause is exception chaining, which the next lesson covers properly.",
            "**The outer `finally` ran before the new exception left `importOrders`.** Order of events: inner finally, outer catch, outer finally, caller.",
          ],
        },
        {
          type: "paragraph",
          text: "In the exception table, the inner rows come first, which is how the JVM's \"first matching row\" rule gives the inner handler priority:",
        },
        {
          type: "output",
          text: `    Exception table:
       from    to  target type
          36    87   105   Class java/lang/NumberFormatException
          36    87   145   any
         105   127   145   any
         145   147   145   any
          10   168   179   Class java/lang/IllegalStateException
          10   168   210   any
         179   212   210   any`,
        },
        {
          type: "paragraph",
          text: "The first four rows are the inner `try` (offsets 36 to 86 are its block), and the last three are the outer one, whose range 10 to 167 contains the whole loop, inner `try` included. The odd-looking `145 147 145 any` row covers only the `astore 5` at 145, the first instruction of the inner `any` handler, and points back at that same handler. `javac` emits rows like that, and since an `astore` can't throw, it never fires.",
        },
        {
          type: "heading",
          text: "Rethrowing as is",
        },
        {
          type: "paragraph",
          text: "The other common pattern is to do something in the catch block and then `throw e;` unchanged, usually to count or record the failure without deciding what it means. The `CallMetrics` example below does exactly that. A rethrown exception keeps its original stack trace, because the trace was captured when it was created, not when it was thrown. The next lesson covers rethrowing in depth, including the Java 7 precise rethrow rule.",
        },
      ],
    },
    {
      title: "Catch and Continue in Loops",
      blocks: [
        {
          type: "paragraph",
          text: "Where the `try` sits relative to a loop decides what one bad item does to the rest. Same input, two placements:",
        },
        {
          type: "code",
          language: "java",
          title: "LoopPlacement.java",
          code: `import java.util.List;

public class LoopPlacement {
    static final List<String> PRICES = List.of("250", "1x0", "400", "", "75");

    public static void main(String[] args) {
        // try around the loop: the first bad price ends the loop
        int total = 0;
        try {
            for (String p : PRICES) {
                total += Integer.parseInt(p);
            }
        } catch (NumberFormatException e) {
            System.out.println("outside: stopped at " + e.getMessage());
        }
        System.out.println("outside: total " + total);

        // try inside the loop: skip the bad price and continue
        total = 0;
        int skipped = 0;
        for (String p : PRICES) {
            try {
                total += Integer.parseInt(p);
            } catch (NumberFormatException e) {
                skipped++;
                System.out.println("inside: skipped \\"" + p + "\\"");
            }
        }
        System.out.println("inside: total " + total + ", skipped " + skipped);
    }
}`,
        },
        {
          type: "output",
          text: `outside: stopped at For input string: "1x0"
outside: total 250
inside: skipped "1x0"
inside: skipped ""
inside: total 725, skipped 2`,
        },
        {
          type: "list",
          items: [
            "**`try` outside the loop:** the first bad price ended the loop. The total was `250`, a partial result, and `400` and `75` were never added. That's the right shape when one failure means the whole result is useless.",
            "**`try` inside the loop:** each iteration handles its own failure. Two bad prices were skipped and counted, and the three good ones gave `725`. That's the right shape for batches, imports and queues, as long as the skipped items are reported somewhere.",
          ],
        },
        {
          type: "paragraph",
          text: "A `continue` in a catch block (or a `break`) works the way it looks: it leaves the `try` statement, so `finally` runs first, and then the loop continues. Silently skipping is the trap. A loop that catches, does nothing and continues can lose most of its input without anyone noticing, so I always keep a count or a list of what was skipped, like `skipped` here or the `errors` list in the examples.",
        },
      ],
    },
    {
      title: "try-catch and Lambdas",
      blocks: [
        {
          type: "paragraph",
          text: "A lambda body is the body of a different method, the functional interface's. That has one consequence that surprises people: a `try` around the call that passes the lambda doesn't cover a **checked** exception thrown inside it.",
        },
        {
          type: "code",
          language: "java",
          title: "LambdaChecked.java",
          code: `import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class LambdaChecked {
    public static void main(String[] args) {
        List<Path> files = List.of(Path.of("a.txt"), Path.of("b.txt"));
        try {
            files.forEach(p -> System.out.println(Files.size(p)));
        } catch (java.io.IOException e) {
            System.out.println("could not read: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `LambdaChecked.java:9: error: unreported exception IOException; must be caught or declared to be thrown
            files.forEach(p -> System.out.println(Files.size(p)));
                                                            ^
LambdaChecked.java:10: error: exception IOException is never thrown in body of corresponding try statement
        } catch (java.io.IOException e) {
          ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "Both errors are about the same fact. `Consumer.accept` doesn't declare `IOException`, so the lambda can't let it escape, and the outer `try` body (`files.forEach(...)`) can't throw it either, so its catch clause is for an exception that can't happen. The checked exception has to be handled inside the lambda body.",
        },
        {
          type: "paragraph",
          text: "Unchecked exceptions do propagate out of a lambda, through the stream machinery, to the caller. So the placement question from the last section comes back:",
        },
        {
          type: "code",
          language: "java",
          title: "LambdaTry.java",
          code: `import java.util.List;

public class LambdaTry {
    public static void main(String[] args) {
        List<String> prices = List.of("120", "abc", "75");

        // 1. try around the pipeline: the first bad value ends the whole thing
        try {
            int total = prices.stream().mapToInt(Integer::parseInt).sum();
            System.out.println("total " + total);
        } catch (NumberFormatException e) {
            System.out.println("outer catch: " + e.getMessage());
        }

        // 2. try inside the lambda: each element is handled on its own
        int total = prices.stream()
                .mapToInt(text -> {
                    try {
                        return Integer.parseInt(text);
                    } catch (NumberFormatException e) {
                        System.out.println("inner catch: skipping " + text);
                        return 0;
                    }
                })
                .sum();
        System.out.println("total " + total);
    }
}`,
        },
        {
          type: "output",
          text: `outer catch: For input string: "abc"
inner catch: skipping abc
total 195`,
        },
        {
          type: "paragraph",
          text: "Around the pipeline, `\"abc\"` aborted the whole sum. Inside the lambda, it was handled per element and the total was `195`. A `try` block in the middle of a lambda gets clumsy quickly; the usual fix is to move it into a small named method and pass a method reference. Exceptions in lambdas, streams and `CompletableFuture` get a full treatment in Exception Handling Best Practices.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `FinallyCopies.parse(\"forty-two\")` from source to result, using the bytecode listed in Internal Working:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time, checking.** `javac` checks the catch clause against JLS 11.2.3: `NumberFormatException` is unchecked, so it's legal whatever the try block calls, and there's no earlier clause it could be hidden behind.",
            "**Compile time, code generation.** `javac` emits the try body (offsets 0 to 4), then a copy of the `finally` code and the return (5 to 14), then the catch body (15 to 17) with a second copy and its return (18 to 27), and finally an `any` handler (28 to 38) holding a third copy followed by `athrow`.",
            "**Compile time, the table.** It writes three rows: 0 to 5 for `NumberFormatException` to 15, 0 to 5 for `any` to 28, and 15 to 18 for `any` to 28, so an exception from the catch block also goes through `finally`.",
            "**Run time, the call.** `main` calls `parse`, and a new frame is pushed with `text` in slot 0.",
            "**The throw.** Deep inside `Integer.parseInt`, a `NumberFormatException` is constructed (its stack trace captured then) and thrown. None of the `Integer` frames has a matching row, so they're popped one by one.",
            "**The search in `parse`.** The pc is 1, the `invokestatic`. Row one covers 0 to 4 and the type matches, so the JVM clears `parse`'s operand stack, pushes the exception and jumps to 15.",
            "**The catch block.** `astore_1` puts the exception in slot 1, the variable `e`. (On the normal path, the same slot held the parsed number; `javac` reuses slots whose scopes don't overlap.) `iconst_m1`, `istore_2` saves the return value `-1` in slot 2.",
            "**The finally copy.** Offsets 18 to 23 print `cleanup`.",
            "**The return.** `iload_2`, `ireturn` returns the saved `-1`. The frame is popped, and `main` prints `-1`.",
          ],
        },
        {
          type: "paragraph",
          text: "If the catch block had thrown instead of returning, the third row (15 to 18, `any`) would have sent that new exception to 28: `cleanup` printed by the third copy, then `athrow` to pass it on to `main`.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "TryCatchTour.java",
          code: `import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;

public class TryCatchTour {
    public static void main(String[] args) {
        // 1. try + catch
        try {
            System.out.println(10 / Integer.parseInt("0"));
        } catch (ArithmeticException e) {
            System.out.println("1 catch: " + e.getMessage());
        }

        // 2. several catch blocks, most specific first
        try {
            new FileReader("missing.txt").close();
        } catch (FileNotFoundException e) {
            System.out.println("2 catch FileNotFoundException");
        } catch (IOException e) {
            System.out.println("2 catch IOException");
        }

        // 3. multi-catch (Java 7): one handler for unrelated types
        try {
            Object o = "text";
            Integer i = (Integer) o;
        } catch (ClassCastException | NullPointerException e) {
            System.out.println("3 multi-catch: " + e.getClass().getSimpleName());
        }

        // 4. try + catch + finally
        try {
            System.out.println("4 try");
        } catch (RuntimeException e) {
            System.out.println("4 catch");
        } finally {
            System.out.println("4 finally");
        }

        // 5. try + finally, no catch: the exception still propagates
        try {
            try {
                throw new IllegalStateException("from 5");
            } finally {
                System.out.println("5 inner finally");
            }
        } catch (IllegalStateException e) {
            System.out.println("5 outer catch: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `1 catch: / by zero
2 catch FileNotFoundException
3 multi-catch: ClassCastException
4 try
4 finally
5 inner finally
5 outer catch: from 5`,
        },
        {
          type: "list",
          items: [
            "In form 2, `FileReader`'s constructor declares `FileNotFoundException` and `close()` declares `IOException`, so both clauses are legal, and the subclass has to come first. Swapping the two clauses gives `exception FileNotFoundException has already been caught`.",
            "Form 3 combines two unrelated types. `e` is implicitly final, and its static type is `RuntimeException`.",
            "Form 4 is the full statement; with no exception, the catch is skipped and `finally` runs.",
            "Form 5 is `try`-`finally` with no catch: the inner `finally` ran, then the exception went to the enclosing `try`. try-with-resources, the sixth form, has its own lesson.",
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Importing records, one bad line at a time",
        },
        {
          type: "paragraph",
          text: "A list of student scores where some lines are broken in different ways. A multi-catch handles the two \"malformed\" cases the same way, and a separate clause gives the range error its own message:",
        },
        {
          type: "code",
          language: "java",
          title: "GradeImport.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class GradeImport {
    record Student(String name, int score) { }

    static Student parse(String line) {
        String[] parts = line.split(",");
        int score = Integer.parseInt(parts[1].trim());          // may throw two different ways
        if (score < 0 || score > 100) {
            throw new IllegalArgumentException("score " + score + " is out of range");
        }
        return new Student(parts[0].trim(), score);
    }

    public static void main(String[] args) {
        List<String> lines = List.of("Asha, 91", "Ravi, ninety", "Meera", "Kabir, 140", "Ishaan, 78");
        List<Student> students = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < lines.size(); i++) {
            try {
                students.add(parse(lines.get(i)));
            } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
                errors.add("line " + (i + 1) + ": malformed (" + e.getClass().getSimpleName() + ")");
            } catch (IllegalArgumentException e) {
                errors.add("line " + (i + 1) + ": " + e.getMessage());
            }
        }

        System.out.println("imported " + students);
        errors.forEach(System.out::println);
    }
}`,
        },
        {
          type: "output",
          text: `imported [Student[name=Asha, score=91], Student[name=Ishaan, score=78]]
line 2: malformed (NumberFormatException)
line 3: malformed (ArrayIndexOutOfBoundsException)
line 4: score 140 is out of range`,
        },
        {
          type: "paragraph",
          text: "Three lines failed for three different reasons and the other two were imported. The clause order matters here: `NumberFormatException` is a subclass of `IllegalArgumentException`, so the multi-catch has to come first, or `javac` would report it as already caught. The `try` is inside the loop and every failure lands in `errors` with its line number, so nothing is skipped silently.",
        },
        {
          type: "heading",
          text: "Releasing a lock on every path",
        },
        {
          type: "paragraph",
          text: "A `ReentrantLock` is the textbook resource for `finally`: unlike a `synchronized` block, nothing releases it automatically. A bank account with a leaky withdrawal and a correct one:",
        },
        {
          type: "code",
          language: "java",
          title: "AccountLock.java",
          code: `import java.util.concurrent.locks.ReentrantLock;

public class AccountLock {
    static class BankAccount {
        private final ReentrantLock lock = new ReentrantLock();
        private long balance;

        BankAccount(long balance) {
            this.balance = balance;
        }

        void withdrawLeaky(long amount) {
            lock.lock();
            if (amount > balance) {
                throw new IllegalStateException("insufficient funds");   // unlock below never runs
            }
            balance -= amount;
            lock.unlock();
        }

        void withdraw(long amount) {
            lock.lock();
            try {
                if (amount > balance) {
                    throw new IllegalStateException("insufficient funds");
                }
                balance -= amount;
            } finally {
                lock.unlock();                                          // runs on both paths
            }
        }

        boolean availableToOtherThreads() throws InterruptedException {
            boolean[] got = new boolean[1];
            Thread other = new Thread(() -> {
                got[0] = lock.tryLock();
                if (got[0]) lock.unlock();
            });
            other.start();
            other.join();
            return got[0];
        }
    }

    public static void main(String[] args) throws InterruptedException {
        BankAccount leaky = new BankAccount(1_000);
        try {
            leaky.withdrawLeaky(5_000);
        } catch (IllegalStateException e) {
            System.out.println("leaky: " + e.getMessage()
                    + ", lock free for others: " + leaky.availableToOtherThreads());
        }

        BankAccount safe = new BankAccount(1_000);
        try {
            safe.withdraw(5_000);
        } catch (IllegalStateException e) {
            System.out.println("safe:  " + e.getMessage()
                    + ", lock free for others: " + safe.availableToOtherThreads());
        }
    }
}`,
        },
        {
          type: "output",
          text: `leaky: insufficient funds, lock free for others: false
safe:  insufficient funds, lock free for others: true`,
        },
        {
          type: "paragraph",
          text: "Both withdrawals failed the same way, but the leaky one left the lock held by the main thread, so another thread's `tryLock()` got `false`. In a real service, every later call on that account would block forever. The `finally` version released it on the failure path too.",
        },
        {
          type: "diagram",
          text: `lock.lock();               ◄ BEFORE try: if this fails, there's
                             nothing to unlock
try {
    check and update       ◄ may throw
    the balance
} finally {
    lock.unlock();         ◄ runs on every way out of the try,
}                            and only once the lock is held`,
          caption: "The lock pattern. The acquire goes before try, the release is the only thing in finally.",
        },
        {
          type: "heading",
          text: "Retrying a flaky call",
        },
        {
          type: "paragraph",
          text: "A `try` inside a loop is also how a retry works. The notifier below fails twice before succeeding:",
        },
        {
          type: "code",
          language: "java",
          title: "NotifierRetry.java",
          code: `public class NotifierRetry {
    interface Notifier {
        void send(String message);
    }

    // Fails the first two times, like a mail server that's briefly unavailable
    static class FlakyEmailNotifier implements Notifier {
        private int calls = 0;

        public void send(String message) {
            calls++;
            if (calls <= 2) {
                throw new IllegalStateException("mail server busy (call " + calls + ")");
            }
            System.out.println("  sent: " + message);
        }
    }

    static void sendWithRetry(Notifier notifier, String message, int maxAttempts) {
        for (int attempt = 1; ; attempt++) {
            try {
                notifier.send(message);
                return;                                           // success: leave the loop
            } catch (IllegalStateException e) {
                System.out.println("  attempt " + attempt + " failed: " + e.getMessage());
                if (attempt == maxAttempts) {
                    throw new IllegalStateException("gave up after " + attempt + " attempts", e);
                }
            }
        }
    }

    public static void main(String[] args) {
        System.out.println("three attempts allowed:");
        sendWithRetry(new FlakyEmailNotifier(), "Order 42 shipped", 3);

        System.out.println("two attempts allowed:");
        try {
            sendWithRetry(new FlakyEmailNotifier(), "Order 43 shipped", 2);
        } catch (IllegalStateException e) {
            System.out.println("  " + e.getMessage() + ", last cause: " + e.getCause().getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `three attempts allowed:
  attempt 1 failed: mail server busy (call 1)
  attempt 2 failed: mail server busy (call 2)
  sent: Order 42 shipped
two attempts allowed:
  attempt 1 failed: mail server busy (call 1)
  attempt 2 failed: mail server busy (call 2)
  gave up after 2 attempts, last cause: mail server busy (call 2)`,
        },
        {
          type: "paragraph",
          text: "With three attempts, the third call succeeded and `return` left the loop from inside `try`. With two, the last failure was wrapped in a new exception carrying the attempt count, and the original kept as the cause. A real retry would also wait between attempts and only retry failures that can succeed later; Exception Handling Best Practices covers retries and idempotency.",
        },
        {
          type: "heading",
          text: "finally for bookkeeping",
        },
        {
          type: "paragraph",
          text: "`finally` isn't only for releasing resources. Anything that must happen once per call, success or failure, fits: a metric, a log line, a timer. Here a price lookup counts calls and failures, and rethrows the failure unchanged:",
        },
        {
          type: "code",
          language: "java",
          title: "CallMetrics.java",
          code: `import java.util.Map;

public class CallMetrics {
    static int calls = 0;
    static int failures = 0;

    static final Map<String, Integer> PRICES = Map.of("pen", 20, "book", 350);

    static int price(String product) {
        calls++;                                          // counted before anything can fail
        try {
            Integer p = PRICES.get(product);
            if (p == null) {
                throw new IllegalArgumentException("unknown product " + product);
            }
            return p;
        } catch (IllegalArgumentException e) {
            failures++;
            throw e;                                      // record it, then let the caller decide
        } finally {
            System.out.println("  price(" + product + ") done, calls=" + calls + " failures=" + failures);
        }
    }

    public static void main(String[] args) {
        for (String product : new String[] {"pen", "lamp", "book"}) {
            try {
                System.out.println(product + " costs " + price(product));
            } catch (IllegalArgumentException e) {
                System.out.println(product + ": " + e.getMessage());
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `  price(pen) done, calls=1 failures=0
pen costs 20
  price(lamp) done, calls=2 failures=1
lamp: unknown product lamp
  price(book) done, calls=3 failures=1
book costs 350`,
        },
        {
          type: "paragraph",
          text: "The order of the lines is the order the parts ran: the catch block counted the failure and executed `throw e`, `finally` printed with the updated counts, and only then did the caller's catch see `unknown product lamp`. The rethrow kept the original exception, message and stack trace included.",
        },
      ],
    },
    {
      title: "When to Use try-catch (and When to Let It Propagate)",
      blocks: [
        {
          type: "paragraph",
          text: "The question is never \"can this throw?\", because almost anything can. It's \"is this the place that can do something useful about it?\". A catch block that can't recover, retry, translate or report the failure doesn't belong there, and the exception should keep going up to a place that can. `finally` is a separate decision, about cleanup, and it's needed wherever something was acquired.",
        },
        {
          type: "table",
          headers: ["Situation", "What I write", "Why"],
          rows: [
            ["I can recover: a default, a fallback, skipping one item", "`try`-`catch` of the specific type, here", "This code knows what the failure means"],
            ["I can't do anything useful about it", "No `try`; let it propagate (declare it if checked)", "A caller with more context decides"],
            ["I acquired something that must be released", "`try`-`finally`, or try-with-resources if it's `AutoCloseable`", "Release on every path, whether or not I handle the error"],
            ["A lower layer's exception doesn't make sense to my callers", "`catch` and rethrow a different exception, with the original as cause", "Translation between layers; covered in the next lesson"],
            ["One item of a batch can fail without spoiling the rest", "`try` inside the loop, with a record of every failure", "Per-item handling, nothing skipped silently"],
            ["The top of a thread, request or job", "`catch (Exception e)`: log once, fail that unit of work", "The only place a broad catch is right"],
            ["The failure is a normal, expected outcome (\"not found\")", "Usually no exception: `Optional`, a boolean, a result type", "Exceptions are slow and noisy for expected cases; see Best Practices"],
          ],
        },
        {
          type: "diagram",
          text: `Something in this method can throw. Do I write a try?
│
├─ Did I acquire something (lock, file, connection)?
│   └─ yes ─► try-finally (or try-with-resources) for the release,
│             whatever the answer to the questions below
│
├─ Can this method recover, with a real fallback or a retry?
│   └─ yes ─► catch the specific type here
│
├─ Does the exception make sense to my callers as it is?
│   ├─ yes ─► no catch: let it propagate
│   └─ no ──► catch, wrap with the cause, rethrow
│
└─ Is this the outermost point of a request, job or thread?
    └─ yes ─► catch (Exception e): log once, fail this unit,
              keep the process alive`,
          caption: "Catch where the failure can be dealt with, release where the resource was acquired. They're often different places.",
        },
        {
          type: "list",
          items: [
            "Catch the narrowest type that describes the failure I'm handling. If I can't name it, I'm probably not handling it.",
            "A catch block that only logs and continues needs a reason, not a habit. If the result is now wrong, the program shouldn't continue as if it's right.",
            "Never invent a value in a catch block (`return 0`, `return null`) unless the caller is designed to treat that value as \"failed\".",
            "`finally` holds cleanup only: no `return`, no `throw`, no business logic.",
            "Prefer try-with-resources to `finally` for anything `AutoCloseable`; it handles the exception-in-cleanup case that plain `finally` gets wrong.",
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice",
        },
        {
          type: "paragraph",
          text: "An order total built from catalog prices, where one catalog entry is corrupt (`\"35O\"`, with a letter O). The wrong version catches deep inside the price lookup and keeps going with a made-up price; the right one lets the exception reach the code that's deciding whether to accept the order:",
        },
        {
          type: "code",
          language: "java",
          title: "WhereToCatch.java",
          code: `import java.util.List;
import java.util.Map;

public class WhereToCatch {
    record OrderItem(String sku, int quantity) { }

    // Prices as they arrive from a catalog file; one entry is corrupt
    static final Map<String, String> CATALOG = Map.of("PEN", "20", "BOOK", "35O", "BAG", "900");

    // Wrong choice: catch deep down and carry on with a made-up value
    static int unitPriceWrong(String sku) {
        try {
            return Integer.parseInt(CATALOG.get(sku));
        } catch (NumberFormatException e) {
            return 0;                                      // "keep the order flowing"
        }
    }

    // Right choice: no try here; this method can't fix a corrupt catalog
    static int unitPrice(String sku) {
        return Integer.parseInt(CATALOG.get(sku));
    }

    static int total(List<OrderItem> items, boolean wrong) {
        int sum = 0;
        for (OrderItem item : items) {
            int price = wrong ? unitPriceWrong(item.sku()) : unitPrice(item.sku());
            sum += price * item.quantity();
        }
        return sum;
    }

    public static void main(String[] args) {
        List<OrderItem> order = List.of(new OrderItem("PEN", 2), new OrderItem("BOOK", 1));

        System.out.println("wrong: order accepted, total " + total(order, true));

        try {                                              // the boundary that can decide
            System.out.println("right: order accepted, total " + total(order, false));
        } catch (NumberFormatException e) {
            System.out.println("right: order rejected, catalog price is corrupt (" + e.getMessage() + ")");
        }
    }
}`,
        },
        {
          type: "output",
          text: `wrong: order accepted, total 40
right: order rejected, catalog price is corrupt (For input string: "35O")`,
        },
        {
          type: "list",
          items: [
            "**Wrong:** `unitPriceWrong` had a `try` because it could throw, not because it could recover. Its `return 0` made the book free, and the order was accepted at `40` instead of failing. The catch was in the one place that didn't know an order was involved.",
            "**Right:** `unitPrice` has no `try` at all. The exception passed through `total`, which can't fix it either, to `main`, which owns the decision about the order and rejected it with the real reason. Fewer catch blocks, correct behaviour.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "A general catch before a specific one",
        },
        {
          type: "output",
          text: `CatchOrder.java:8: error: exception NumberFormatException has already been caught
        } catch (NumberFormatException e) {
          ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The `Exception` clause above it already takes every `NumberFormatException`. Specific types go first; the fix is to swap the clauses, or drop the specific one if both do the same thing.",
        },
        {
          type: "heading",
          text: "return in finally",
        },
        {
          type: "paragraph",
          text: "`swallows(new int[] {7, 3}, 5)` returned `-1` and the `ArrayIndexOutOfBoundsException` vanished. Plain `javac` said nothing; only `-Xlint:finally` reported `finally clause cannot complete normally`. I treat that warning as an error in builds (`-Xlint:finally -Werror`, or the equivalent compiler setting in Maven or Gradle).",
        },
        {
          type: "heading",
          text: "Acquiring the lock inside try",
        },
        {
          type: "paragraph",
          text: "If the acquire itself can fail, putting it inside `try` means `finally` releases a lock that was never taken:",
        },
        {
          type: "code",
          language: "java",
          title: "LockInsideTry.java",
          code: `import java.util.concurrent.locks.ReentrantLock;

public class LockInsideTry {
    static final ReentrantLock lock = new ReentrantLock();

    static void updateInventory() throws InterruptedException {
        try {
            lock.lockInterruptibly();                       // can throw before the lock is held
            System.out.println("updating inventory");
        } finally {
            lock.unlock();                                  // runs even when lock was never taken
        }
    }

    public static void main(String[] args) {
        Thread.currentThread().interrupt();                 // simulate a shutdown request
        try {
            updateInventory();
        } catch (Exception e) {
            System.out.println("caught " + e.getClass().getName());
            System.out.println("interrupt flag still set: " + Thread.currentThread().isInterrupted());
        }
    }
}`,
        },
        {
          type: "output",
          text: `caught java.lang.IllegalMonitorStateException
interrupt flag still set: false`,
        },
        {
          type: "paragraph",
          text: "`lockInterruptibly()` threw `InterruptedException` because the thread was interrupted, and it cleared the interrupt flag as it did. Then `unlock()` in `finally` threw `IllegalMonitorStateException`, since this thread didn't hold the lock, and that replaced the `InterruptedException`. The caller saw a confusing lock error instead of \"interrupted\", and the interrupt, a shutdown request, was lost. The fix is the pattern from the examples: acquire before `try`.",
        },
        {
          type: "heading",
          text: "Releasing outside finally",
        },
        {
          type: "paragraph",
          text: "`withdrawLeaky` unlocked at the end of the method, after the code that could throw, and the failure path skipped it: `leaky: insufficient funds, lock free for others: false`. Any release that's supposed to happen \"at the end\" has to be in `finally`, or in a try-with-resources.",
        },
        {
          type: "heading",
          text: "Catching Exception and guessing what it was",
        },
        {
          type: "paragraph",
          text: "`discountBroad(\"2\")` printed `broad: treating \"2\" as an invalid id`, when the real cause was a `NullPointerException` from missing data. A broad catch with a specific-sounding message is worse than no catch, because the log now lies. When a broad catch really is right, at a top-level boundary, it should log the exception itself, not a guess.",
        },
        {
          type: "heading",
          text: "Throwing from finally",
        },
        {
          type: "paragraph",
          text: "`FinallyThrows` reported `java.lang.IllegalArgumentException: file handle for march.csv already closed` with no cause and no suppressed exceptions, and the \"disk full\" failure was lost. Cleanup that can throw belongs in try-with-resources, which keeps the original and attaches the cleanup failure as suppressed.",
        },
        {
          type: "heading",
          text: "Wrapping a lambda call in try for a checked exception",
        },
        {
          type: "paragraph",
          text: "`LambdaChecked` failed with `unreported exception IOException; must be caught or declared to be thrown` at the lambda, plus `exception IOException is never thrown in body of corresponding try statement` for the outer catch. The lambda body is a separate method; the checked exception has to be handled inside it.",
        },
        {
          type: "heading",
          text: "Counting on finally at shutdown",
        },
        {
          type: "paragraph",
          text: "`java ExitSkipsFinally exit` printed `try: argument exit` and `shutdown hook runs`, and no `finally: runs`. Code that calls `System.exit` from deep inside a `try` skips every `finally` on the stack. In application code, I'd rather return an exit status to `main` and let it be the only caller of `System.exit`.",
        },
        {
          type: "heading",
          text: "An empty catch block",
        },
        {
          type: "paragraph",
          text: "`catch (SomeException e) { }` is the most common way an error disappears: the code after it runs with whatever half-finished state the `try` left behind. If ignoring really is correct, I write that down, with `_` on Java 22+ or a comment saying why, and make sure the result is still valid, as `parseOrDefault` does with its fallback.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Catch the most specific type I can actually handle, as close as possible to the code that knows what the failure means, and no closer.",
            "Order catch clauses from specific to general. Use multi-catch when the handling is identical, and separate clauses when it isn't.",
            "Keep `finally` for releasing what the `try` acquired. No `return`, no `throw`, nothing that can fail without its own catch.",
            "Acquire before `try`, release in `finally`: `lock.lock(); try { ... } finally { lock.unlock(); }`.",
            "Prefer try-with-resources for anything `AutoCloseable` (streams, readers, JDBC objects); it's shorter and keeps suppressed exceptions.",
            "Never swallow silently. Handle, rethrow, or wrap with the original as the cause. If ignoring is the intended behaviour, make it visible with `_` or a comment.",
            "Catch `Exception` only at boundaries: the top of a request handler, a job, a thread's loop. Catch `Throwable` almost never, and never to carry on.",
            "In loops, decide deliberately whether one failure should stop the loop or be recorded and skipped, and put the `try` inside or outside accordingly.",
            "Compile with `-Xlint:finally` (or `-Xlint:all`) so a `finally` that can't complete normally is at least a warning, ideally an error.",
            "Don't use `try`-`catch` as an `if`: check for expected conditions up front when it's cheap. The Performance section shows why.",
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
            "**Entering a `try` block is free.** There's no instruction for it; the handler information is a table on the side. `TryCost` showed identical bytecode on the normal path, and its two timings tracked each other on every run.",
            "**Throwing is the expensive part**, mostly because the `Throwable` constructor captures the stack trace. The previous lesson covers that cost and how to avoid it. A handler that's rarely taken costs nothing until it is.",
            "**`finally` costs bytecode, not time.** Every exit path gets its own copy. In `FinallyCopies`, the 8-byte `println(\"cleanup\")` appears three times, 24 of the method's 39 bytes. A big `finally` in a method with many `return`s multiplies that, and a larger method is less likely to be inlined by the JIT (the Methods lesson showed the 35-byte and 325-byte inlining thresholds). Moving a long `finally` body into its own method keeps the copies down to one call each.",
            "**Exceptions as control flow are slow when they're frequent.** I parsed a million strings, half of them invalid, once by catching `NumberFormatException` and once by checking the characters first.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "ParseCost.java",
          code: `public class ParseCost {
    static boolean isDigits(String s) {
        if (s.isEmpty() || s.length() > 9) return false;
        for (int i = 0; i < s.length(); i++) {
            if (!Character.isDigit(s.charAt(i))) return false;
        }
        return true;
    }

    static int viaException(String[] inputs) {
        int bad = 0;
        for (String s : inputs) {
            try {
                Integer.parseInt(s);
            } catch (NumberFormatException e) {
                bad++;
            }
        }
        return bad;
    }

    static int viaCheck(String[] inputs) {
        int bad = 0;
        for (String s : inputs) {
            if (isDigits(s)) Integer.parseInt(s); else bad++;
        }
        return bad;
    }

    public static void main(String[] args) {
        String[] inputs = new String[1_000_000];
        for (int i = 0; i < inputs.length; i++) {
            inputs[i] = (i % 2 == 0) ? Integer.toString(i) : "n/a";   // half of them are bad
        }
        for (int run = 1; run <= 3; run++) {
            long t0 = System.nanoTime();
            int a = viaException(inputs);
            long t1 = System.nanoTime();
            int b = viaCheck(inputs);
            long t2 = System.nanoTime();
            System.out.printf("run %d: catch %4d ms, check first %3d ms (bad: %d, %d)%n",
                    run, (t1 - t0) / 1_000_000, (t2 - t1) / 1_000_000, a, b);
        }
    }
}`,
        },
        {
          type: "output",
          text: `run 1: catch  684 ms, check first  17 ms (bad: 500000, 500000)
run 2: catch  405 ms, check first  20 ms (bad: 500000, 500000)
run 3: catch  309 ms, check first  12 ms (bad: 500000, 500000)`,
        },
        {
          type: "paragraph",
          text: "Same answer, and the exception version was roughly 20 to 40 times slower on my machine, each of the 500,000 failures creating a `NumberFormatException` with a full stack trace. The exact milliseconds vary between runs and machines; the gap was consistent across every run I did. For input that's usually valid, catching is fine and simpler. For input that's often invalid, a cheap check first is worth it.",
        },
      ],
    },
    {
      title: "try-catch-finally in Production",
      blocks: [
        {
          type: "paragraph",
          text: "In a ride-hailing backend, a completed ride is settled by charging the rider, and two settlements of the same ride must never run at once, so each ride has a settlement lock. The version below was written with two good intentions: always release the lock, and always return a status to the caller. Both ended up in `finally`, together with a `return`. The payment gateway can fail in two ways: a **declined** charge, a checked `PaymentDeclinedException`, and an unexpected **timeout**, a `RuntimeException`.",
        },
        {
          type: "code",
          language: "java",
          title: "RidePayments.java",
          code: `import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

public class RidePayments {
    enum Status { COMPLETED, PAID, PAYMENT_FAILED }

    static class PaymentDeclinedException extends Exception {
        PaymentDeclinedException(String message) {
            super(message);
        }
    }

    static class Ride {
        final String id;
        final String rider;
        final long farePaise;
        Status status = Status.COMPLETED;
        final ReentrantLock settlementLock = new ReentrantLock();   // one settlement at a time

        Ride(String id, String rider, long farePaise) {
            this.id = id;
            this.rider = rider;
            this.farePaise = farePaise;
        }
    }

    static class PaymentGateway {
        private final Map<String, Long> balances = Map.of("Asha", 50_000L, "Ravi", 8_000L);

        void charge(String rider, long paise) throws PaymentDeclinedException {
            if (rider.equals("Kiran")) {
                throw new IllegalStateException("gateway timeout after 3000 ms");
            }
            if (balances.get(rider) < paise) {
                throw new PaymentDeclinedException("insufficient balance for " + rider + ": needs "
                        + paise + ", has " + balances.get(rider));
            }
        }
    }

    static final PaymentGateway gateway = new PaymentGateway();

    // BEFORE: "always release the lock and always return a status"
    static Status settleBefore(Ride ride) {                  // compiles with no throws clause
        Status status = Status.PAID;                          // optimistic default
        ride.settlementLock.lock();
        try {
            gateway.charge(ride.rider, ride.farePaise);
        } finally {
            ride.settlementLock.unlock();
            ride.status = status;
            return status;                                    // swallows whatever charge threw
        }
    }

    // AFTER: finally only releases; the failure is handled where it's expected
    static Status settleAfter(Ride ride) {
        ride.settlementLock.lock();
        try {
            gateway.charge(ride.rider, ride.farePaise);
            ride.status = Status.PAID;
        } catch (PaymentDeclinedException e) {
            ride.status = Status.PAYMENT_FAILED;              // rider is asked to pay again
            System.out.println("  " + ride.id + " declined: " + e.getMessage());
        } finally {
            ride.settlementLock.unlock();
        }
        return ride.status;
    }

    static void settleAll(String label, java.util.function.Function<Ride, Status> settle) {
        System.out.println(label);
        for (Ride ride : new Ride[] {
                new Ride("R-101", "Asha", 23_400),
                new Ride("R-102", "Ravi", 23_400),
                new Ride("R-103", "Kiran", 9_900)}) {
            try {
                Status result = settle.apply(ride);
                System.out.println("  " + ride.id + " -> " + result + ", lock held: " + ride.settlementLock.isLocked());
            } catch (RuntimeException e) {
                System.out.println("  " + ride.id + " -> error \\"" + e.getMessage() + "\\", status still "
                        + ride.status + ", lock held: " + ride.settlementLock.isLocked());
            }
        }
    }

    public static void main(String[] args) {
        settleAll("BEFORE", RidePayments::settleBefore);
        settleAll("AFTER", RidePayments::settleAfter);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac RidePayments.java && java RidePayments`,
        },
        {
          type: "output",
          text: `BEFORE
  R-101 -> PAID, lock held: false
  R-102 -> PAID, lock held: false
  R-103 -> PAID, lock held: false
AFTER
  R-101 -> PAID, lock held: false
  R-102 declined: insufficient balance for Ravi: needs 23400, has 8000
  R-102 -> PAYMENT_FAILED, lock held: false
  R-103 -> error "gateway timeout after 3000 ms", status still COMPLETED, lock held: false`,
        },
        {
          type: "list",
          items: [
            "**Before: every ride was marked `PAID`.** Asha's charge succeeded. Ravi's was declined (8,000 paise against a 23,400 fare) and Kiran's timed out, but both exceptions were thrown inside `try`, and the `return status` in `finally` replaced them. `status` was still its optimistic default, so both rides were recorded as paid. Downstream, the driver would be paid out for two rides nobody paid for.",
            "**Nothing failed anywhere.** No stack trace, no log line, no exception reached `settleAll`. The lock was released correctly each time (`lock held: false`), which is exactly why the code looked fine in review: the cleanup worked, it was the `return` next to it that did the damage.",
            "**The compiler helped hide it.** `charge` declares `throws PaymentDeclinedException`, yet `settleBefore` has no `throws` clause and no catch for it, and it compiled without a word. Because its `finally` can't complete normally, the `try` statement can't throw anything (JLS 11.2.2), so the checked exception never had to be acknowledged. Only the lint said something:",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: `javac -Xlint:finally RidePayments.java`,
        },
        {
          type: "output",
          text: `RidePayments.java:53: warning: [finally] finally clause cannot complete normally
        }
        ^
1 warning`,
        },
        {
          type: "list",
          items: [
            "**After: each outcome is handled where it's understood.** The `finally` block contains only `unlock()`. The status is set to `PAID` inside `try`, right after the charge succeeds, so there's no optimistic default to leak out. Removing the `return` made `javac` insist on handling `PaymentDeclinedException`, which is the point of a checked exception.",
            "**The decline is an expected business outcome**, so it's caught by its specific type: Ravi's ride became `PAYMENT_FAILED` and the reason was printed. In a real service, that's where the rider would be asked to pay again.",
            "**The timeout is not handled here, on purpose.** Kiran's `IllegalStateException` propagated to the caller with the lock released and the status still `COMPLETED`, not `PAID`. Whether the charge actually went through is unknown after a timeout, so the right next step is a retry with an idempotency key or a reconciliation job, which belongs to the caller, not to this method. Exception Handling Best Practices covers that.",
            "**What would have caught it earlier:** `-Xlint:finally -Werror` in the build, a test that settles a ride with a declining card and asserts the status, and a rule that `finally` never contains `return`.",
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
              question: "What do try, catch and finally do?",
              answer:
                "`try` wraps code whose exceptions I want to handle, `catch` declares a handler for an exception type, and `finally` holds code that runs however the `try` statement is left: normally, by `return`, by a caught exception or by an uncaught one.\n\nIn my `ThreePaths` program, the finally line printed on all three paths, and on the uncaught path it printed before the `NumberFormatException` stack trace, because the exception only left the method after `finally` ran.",
            },
            {
              question: "Can a try block exist without a catch block?",
              answer:
                "Yes, as `try`-`finally`. A `try` needs at least one `catch` or a `finally`; only try-with-resources may have neither. A bare `try { }` doesn't compile.\n\n`try`-`finally` is for code that must clean up but can't handle the error. In my `TryCatchTour`, form 5 printed `5 inner finally` and then the exception was caught by the enclosing `try`.",
            },
            {
              question: "In what order are multiple catch blocks checked?",
              answer:
                "Top to bottom, and only the first matching one runs. A clause matches if the exception is an instance of its type, subclasses included.\n\nSo specific types go first. In `CatchChain`, a `NumberFormatException` went to the first clause even though the `IllegalArgumentException` and `RuntimeException` clauses below would also have matched.",
            },
            {
              question: "What happens if you put catch (Exception e) before catch (NumberFormatException e)?",
              answer:
                "It doesn't compile: `exception NumberFormatException has already been caught`. The second clause could never run, and the JLS makes that a compile-time error rather than dead code.\n\nI got exactly that error in `CatchOrder.java` at line 8. The fix is to swap them.",
            },
            {
              question: "Does finally run if the try block executes a return?",
              answer:
                "Yes. The return value is computed and saved, `finally` runs, and then the method returns the saved value.\n\nThe bytecode of `FinallyCopies.parse` shows it: `istore_1` saves the parsed number, the inlined `finally` prints `cleanup`, then `iload_1`, `ireturn`. The output printed `cleanup` before `42`.",
            },
            {
              question: "What is multi-catch?",
              answer:
                "A Java 7 feature that lets one catch clause handle several exception types: `catch (NumberFormatException | ArithmeticException e)`. It's for types that need identical handling.\n\nThe alternatives can't be subclasses of each other, the parameter is implicitly final, and its static type is the common supertype, `RuntimeException` in my `MultiCatchDemo`. In the class file it's two exception table rows pointing at one handler.",
            },
            {
              question: "What happens to an exception that no catch block matches?",
              answer:
                "It propagates: `finally` runs if there is one, the method's frame is popped, and the exception is rethrown in the caller, frame after frame. If no frame handles it, the thread dies and the uncaught-exception handler prints the stack trace.\n\nFor the main thread, that also ended my `ThreePaths` program with exit status 1, after printing `Exception in thread \"main\" java.lang.NumberFormatException`.",
            },
            {
              question: "Can a catch block catch an exception thrown by another catch block of the same try?",
              answer:
                "No. Sibling catch clauses only cover the `try` block. An exception thrown inside a catch block goes to that statement's `finally`, and then out to an enclosing `try` or the caller.\n\nThe exception table shows why: in `FinallyCopies`, the catch block's range (15 to 18) has only an `any` row, which leads to the `finally` copy and `athrow`. No row sends it to another catch handler.",
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
              question: "Does finally always run?",
              answer:
                "It runs whenever control leaves the `try` statement, by any route, including uncaught exceptions. It doesn't run if control never leaves: `System.exit` or `Runtime.halt` inside the `try`, the process being killed or crashing, or a daemon thread still inside the `try` when the JVM exits.\n\nI checked: `java ExitSkipsFinally exit` printed the shutdown hook's line but not `finally: runs`, and `DaemonFinally` as a daemon thread exited without printing `worker: finally`. `Thread.stop()`, the old way to kill a thread mid-try, has thrown `UnsupportedOperationException` since Java 20.",
            },
            {
              question: "What happens if both try and finally contain a return statement?",
              answer:
                "The `finally` block's `return` wins. A `finally` that completes abruptly replaces whatever the `try` was doing, so the try block's return value is discarded.\n\n`ReturnInFinally.overrides()` returned `from finally`. In the bytecode, `\"from try\"` was stored in a slot and never loaded again. `javac` only warns about it with `-Xlint:finally`: `finally clause cannot complete normally`.",
            },
            {
              question: "What happens to an exception thrown in try if finally has a return?",
              answer:
                "It's discarded. The method returns normally with the finally block's value, and the caller never sees the exception.\n\n`swallows(new int[] {7, 3}, 5)` threw `ArrayIndexOutOfBoundsException` inside `try` and returned `-1` to `main`. In `javap`, the `any` handler stored the exception and returned without an `athrow`. That's the bug in the production section, where a declined payment came back as `PAID`.",
            },
            {
              question: "If try returns x and finally changes x, what is returned?",
              answer:
                "For a primitive, the original value. `return x;` saves the value before `finally` runs, and changing `x` afterwards doesn't touch the saved copy. For a reference, the same object is returned, but if `finally` mutates that object, the caller sees the mutation.\n\n`FinallyChanges` printed `count() = 10` after `finally` set `x = 20`, `items() = [pen, ink]` after `finally` added to the list, and `replaced() = [pen]` after `finally` pointed the variable at a new list. The bytecode copies `x` into a hidden slot that the finally code never touches.",
            },
            {
              question: "What happens if finally throws an exception while another exception is propagating?",
              answer:
                "The new exception replaces the original, which is lost: it isn't the cause and it isn't recorded as suppressed.\n\nIn `FinallyThrows`, \"disk full\" was thrown in `try` and \"already closed\" in `finally`; `main` caught only the second, with `getSuppressed().length` of 0 and a null cause. try-with-resources fixes this by attaching the cleanup exception to the original with `addSuppressed`.",
            },
            {
              question: "What are the rules for multi-catch?",
              answer:
                "The alternatives can't be related by subclassing, the parameter is implicitly final, and its type is the least upper bound of the alternatives. It's still subject to the normal rules, like no clause for a checked exception that can't be thrown.\n\n`NumberFormatException | IllegalArgumentException` gave `Alternatives in a multi-catch statement cannot be related by subclassing`, and assigning to the parameter gave `multi-catch parameter e may not be assigned`. In `MultiCatchDemo`, overload resolution on `e` picked `kind(RuntimeException)`.",
            },
            {
              question: "Why is catching Exception usually a bad idea?",
              answer:
                "Because it catches every failure, including programming errors like `NullPointerException` that I didn't anticipate, and runs handling code written for something else. The bug gets a wrong label and the program continues with a wrong result.\n\nIn `BroadCatch`, a customer with a missing tier got \"invalid id\" and a discount of 0; the specific `catch (NumberFormatException e)` let the NPE through with a message naming `tier()`. Catching `Exception` is right only at boundaries like a request handler, where it logs and fails the unit of work.",
            },
            {
              question: "Is a try-catch block slow?",
              answer:
                "No, not when nothing is thrown. There's no bytecode for entering a `try`; handlers are described in the method's exception table and consulted only during a throw. Throwing is what costs, mostly the stack trace capture.\n\n`TryCost` compiled `plain` and `guarded` to identical instructions on the normal path, and their timings matched within noise. In `ParseCost`, half a million thrown `NumberFormatException`s were roughly 20 to 40 times slower than checking the characters first, on my machine.",
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
              question: "What is the exception table and what do its columns mean?",
              answer:
                "Each method's `Code` attribute has an exception table: rows of `from`, `to`, `target`, `type`. If an exception is thrown while the pc is in `[from, to)` and it's an instance of `type`, the JVM jumps to `target`. `from` is inclusive, `to` exclusive, and `any` (catch_type 0) matches everything and is how `finally` is implemented.\n\n`javap -c FinallyCopies` showed three rows: `0 5 15 NumberFormatException`, `0 5 28 any` and `15 18 28 any`. The JVM takes the first matching row in table order, and `javac` puts inner `try` rows before outer ones.",
            },
            {
              question: "How does javac compile a finally block?",
              answer:
                "By copying it. The `finally` code is inlined at the end of the try block, at the end of each catch block, and in an `any` handler that runs it and rethrows the saved exception with `athrow`. A `return` saves its value into a local before the copy and returns that local afterwards.\n\n`FinallyCopies` had `println(\"cleanup\")` at offsets 5, 18 and 29. Old compilers used `jsr`/`ret` subroutines instead, and since class file version 51 (Java 7), `jsr` isn't allowed in a class file at all.",
            },
            {
              question: "Explain how the JVM unwinds the stack when an exception is thrown.",
              answer:
                "It searches the current method's exception table for a row covering the current pc with a matching type. If one matches, it clears the operand stack, pushes the exception and jumps to the handler. If not, the frame is popped and the search repeats in the caller, with the pc at the invoke instruction. If the stack runs out, the thread's uncaught-exception handler runs and the thread ends.\n\nIn `Unwind`, `checkStock` had no table and was popped, `reserve` matched its `any` row, ran `finally` and rethrew, `placeOrder` had no table, and `main`'s `IllegalStateException` row covered the call. The printed trace still showed all four frames, because it was captured when the exception was created.",
            },
            {
              question: "Why can a method whose finally block returns compile without declaring a checked exception its try block throws?",
              answer:
                "Because JLS 11.2.2 says a `try` statement throws only what can escape it, and nothing escapes when the `finally` block can't complete normally. As far as the compiler is concerned, the checked exception can't leave the method, so no `throws` clause is needed.\n\n`settleBefore` in the production example calls `charge`, which declares `PaymentDeclinedException`, and compiles without mentioning it. A version without the `return` in `finally` failed with `unreported exception ...; must be caught or declared to be thrown`.",
            },
            {
              question: "What is the static type of a multi-catch parameter, and why is it final?",
              answer:
                "Its type is the least upper bound of the alternatives, so only members of that type are usable without a cast. It's implicitly final (JLS 14.20) because one handler serves every alternative, and a rethrow of `e` is analysed as throwing exactly those alternatives, which only works if `e` can't be reassigned.\n\nIn `MultiCatchDemo`, `kind(e)` resolved to `kind(RuntimeException)` at compile time while `getClass()` reported `NumberFormatException` or `ArithmeticException` at run time. `javap` showed one handler at offset 10 with two table rows.",
            },
            {
              question: "When is catching Throwable or Error ever justified?",
              answer:
                "At the outermost boundary of a thread or framework, to log or report the failure before the thread dies or the process exits, then rethrow or exit. Not to carry on as normal, because after an `OutOfMemoryError` or `StackOverflowError` the JVM may fail again immediately, and an `AssertionError` means an invariant is broken.\n\n`CatchThrowable` showed that `catch (Exception e)` let `StackOverflowError`, `AssertionError` (with `-ea`) and `OutOfMemoryError` through, and only `catch (Throwable t)` stopped them.",
            },
            {
              question: "Why should a lock be acquired before the try block rather than inside it?",
              answer:
                "Because if the acquire fails, `finally` would unlock a lock this thread doesn't hold, and the `IllegalMonitorStateException` from `unlock()` replaces the real exception.\n\nIn `LockInsideTry`, `lockInterruptibly()` threw `InterruptedException`, and the caller received `IllegalMonitorStateException` instead, with the interrupt flag already cleared. With `lock()` before `try`, a failed acquire means there's nothing to release, and `finally` only ever runs while the lock is held.",
            },
            {
              question: "What does a stack trace show after an exception has been caught and rethrown several frames up?",
              answer:
                "The frames that were on the stack when the exception object was constructed, not where it was caught or rethrown. `fillInStackTrace` runs in the `Throwable` constructor; `throw` and unwinding don't change the trace.\n\nIn `Unwind`, `main` printed `checkStock:5`, `reserve:13`, `placeOrder:25` and `main:31`, although three of those frames had already been popped. Rethrowing with `throw e;`, as `CallMetrics` did, keeps that original trace; wrapping in a new exception adds a new trace and keeps the old one as the cause.",
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
              question: "Rides are being marked as paid even though the payment gateway declined them. No errors appear in the logs. Where do you look?",
              answer:
                "For anything that can turn a thrown exception into a normal return: a `return` in `finally`, a `catch` that sets a success status or returns a default, or an empty catch. With no log line at all, a `return` in `finally` is the first suspect, because it discards the exception without any handler code running.\n\nThat's exactly the production example: `settleBefore` returned its optimistic `PAID` from `finally`, and both the declined charge and the timeout disappeared. I'd confirm with a test that settles a ride with a declining card, enable `-Xlint:finally` to find every such block, and fix it by setting the status after the charge succeeds and catching the decline specifically.",
            },
            {
              question: "After a failed withdrawal, every later operation on that account hangs. What's the likely bug?",
              answer:
                "A lock acquired and not released on the failure path: `lock.lock()` followed by code that throws, with `unlock()` at the end of the method instead of in `finally`.\n\n`AccountLock` reproduces it: after `withdrawLeaky` threw, another thread's `tryLock()` returned `false`. A thread dump would show the waiting threads parked on that `ReentrantLock`. The fix is `lock.lock(); try { ... } finally { lock.unlock(); }`, with the acquire outside `try`.",
            },
            {
              question: "A service logs \"invalid customer id\" for some customers whose ids are clearly valid. What would you suspect?",
              answer:
                "A broad `catch (Exception e)` whose message assumes one cause, hiding a different exception, most likely a `NullPointerException` from bad data or a bug.\n\n`BroadCatch` did exactly that: customer 2 had a missing tier, the NPE was caught as `Exception`, and the code printed \"invalid id\". I'd narrow the catch to `NumberFormatException` and log the exception object itself, so the next failure shows its real type and message.",
            },
            {
              question: "A nightly import stops at the first malformed record and the remaining thousands are never processed. How would you change it?",
              answer:
                "Move the `try` inside the loop so each record is handled on its own, and record every failure with enough context to fix it, like a line number and the exception's message. If too many records fail, it may still be right to abort the whole run, but that should be a decision, not a side effect of where the `try` sits.\n\n`LoopPlacement` showed both shapes: outside the loop the total stopped at `250`; inside, two bad prices were skipped and counted, and the total was `725`. `GradeImport` collects an `errors` list with line numbers.",
            },
            {
              question: "A report job fails with \"file handle already closed\", but the team suspects the real problem was something else. How can that happen, and how do you fix it?",
              answer:
                "The original exception was thrown in `try`, and the cleanup in `finally` threw a second one, which replaced it. The log shows only the cleanup failure.\n\n`FinallyThrows` reproduces it: \"disk full\" was lost, and `main` saw only \"already closed\", with no cause and nothing suppressed. The fix is try-with-resources, which keeps the original and adds the close failure as a suppressed exception, or, with a plain `finally`, catching the cleanup exception and attaching it with `addSuppressed`.",
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
            "Write `Order.java` with `static int pick()` whose body is `try { return 1; } finally { return 2; }`. Print `pick()`. Compile it with plain `javac`, then with `javac -Xlint:finally`.",
            "In a new class, write a `try` that calls `Integer.parseInt(\"7\") / 0`, followed by `catch (Exception e)` and then `catch (ArithmeticException e)`. Compile it.",
            "Change the catch to `catch (ArithmeticException | RuntimeException e)` and compile again.",
            "Write `static int bump()` with `int x = 1; try { return x; } finally { x++; }` and `static StringBuilder note()` with `StringBuilder sb = new StringBuilder(\"pen\"); try { return sb; } finally { sb.append(\"+ink\"); }`. Print both results.",
            "Put `System.out.println(\"try\"); System.exit(0);` in a `try` with a `finally` that prints `finally`. Run it.",
            "Write `static void work()` containing `try { step(); } catch (IllegalStateException e) { recover(); } finally { done(); }`, where the three helpers are empty static methods. Run `javap -c` on it and count the calls to `done` and the exception table rows.",
            "Write three methods, `a()` calling `b()` calling `c()`. `c()` throws `new IllegalStateException(\"from c\")`. `b()` has `try { c(); } finally { System.out.println(\"b finally\"); }` and `a()` has `try { b(); } catch (IllegalStateException e) { System.out.println(\"a caught \" + e.getMessage()); }`. Before running, write down the order of the two lines.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `2`; plain `javac` is silent and the lint reports `warning: [finally] finally clause cannot complete normally`. Step 2 fails with `exception ArithmeticException has already been caught`. Step 3 fails with `Alternatives in a multi-catch statement cannot be related by subclassing`, followed by `Alternative ArithmeticException is a subclass of alternative RuntimeException`. Step 4 prints `1` and `pen+ink`: the saved `int` doesn't change, the returned object does. Step 5 prints only `try`. Step 6 shows three `invokestatic` calls to `done` and three rows: one for `IllegalStateException` and two `any`. Step 7 prints `b finally` and then `a caught from c`, because `b`'s finally runs while the exception is still on its way out of `b`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `SYNTAX     try { } catch (A e) { } catch (B | C e) { } finally { }
           try needs a catch or a finally (try-with-resources: neither)

CATCH      first matching clause wins, top to bottom
           subclass before superclass, or "already been caught"
           checked type the try can't throw -> "never thrown"
           Exception, Throwable, unchecked: always allowed

MULTI      Java 7; no subclass-related alternatives
           parameter implicitly final; type = common supertype
           bytecode: one handler, one table row per type

FINALLY    runs whenever control leaves the try statement
           not on System.exit, halt, crash, daemon at JVM exit
           return in finally   overrides return, eats exception
           throw in finally    replaces the original
           -Xlint:finally  "finally clause cannot complete normally"

RETURN     return x saves the value first
           primitive: finally can't change it
           reference: finally can mutate the object

BYTECODE   no instruction for entering try: zero cost
           exception table rows: from (incl) to (excl) target type
           any = finally; finally copied onto every exit path
           search: first matching row, else pop frame, try caller

USE        catch where it can be handled, release where it was acquired
           lock(); try { ... } finally { unlock(); }`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `try` statement is a table, not an instruction: entering it is free, and a thrown exception is matched row by row, frame by frame, until a handler takes it. `finally` is an `any` row plus a copy of its code on every exit path.",
            "Catch the specific type where the failure can be handled, let everything else propagate, and keep `finally` for releasing what was acquired: never a `return`, never a `throw`.",
            "This lesson caught exceptions and rethrew a few. The next lesson, throw, throws and Custom Exceptions, is about the throwing side: declaring checked exceptions, precise rethrow, chaining causes, and designing an application's own exception types.",
          ],
        },
      ],
    },
  ],
};
