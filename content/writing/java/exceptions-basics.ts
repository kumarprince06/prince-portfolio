import type { Lesson } from "../types";

export const exceptionsBasics: Lesson = {
  slug: "exceptions-basics",
  date: "2026-11-13",
  title: "Exceptions and the Exception Hierarchy",
  description:
    "What a Java exception really is and why the language has them instead of error codes, the Throwable, Error, Exception and RuntimeException hierarchy printed by reflection, the compiler's checked-exception rule, a runnable trigger for every common exception and error, what an exception object carries and how to read a Caused by chain, what happens to an uncaught exception in main and in other threads, and the JVM side: new plus athrow, implicit exceptions, fillInStackTrace and its cost, helpful NullPointerException messages and HotSpot's OmitStackTraceInFastThrow, ending with a background worker thread killed by one malformed request.",
  tags: ["Core Java", "Exceptions", "Throwable", "Stack Trace"],
  sections: [
    {
      title: "What an Exception Is",
      blocks: [
        {
          type: "paragraph",
          text: "Phase 6 ended with the module system stopping a program before `main` even ran. Long before that, exceptions kept showing up in these notes without ever being the topic: the `NullPointerException` in the Methods lesson's stack trace, `StackOverflowError` and `OutOfMemoryError` in Stack vs Heap, `ExceptionInInitializerError` in Static Keyword, `IllegalAccessError` in Access Modifiers, `InaccessibleObjectException` in Java Modules. Every one of them was an object, created, thrown and either caught or printed. This phase is about that mechanism.",
        },
        {
          type: "paragraph",
          text: "An **exception** is an object that describes something that went wrong, together with a transfer of control: the moment it's thrown, the current method stops, and the JVM goes looking up the call stack for code that has declared it can handle that kind of problem. If it finds some, execution continues there. If it doesn't, the thread dies and the problem gets printed. Normal code stays readable because the error path doesn't have to be threaded through every return value by hand.",
        },
        {
          type: "paragraph",
          text: "This first lesson is about what exceptions **are**: the class hierarchy and what each branch means, the rule that makes some of them \"checked\", the common exceptions and what triggers each one, what an exception object carries, and what happens when nobody catches it. Underneath that, it's about what `javac` and the JVM actually do: `athrow`, exceptions the JVM throws without any `throw` in the code, the stack trace being captured at `new`, its cost, and the HotSpot optimization that sometimes throws it away. Catching them properly is the next lesson, try, catch and finally.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Before exceptions, a failing function had two ways to say so: return a special value (C's `-1` from `read`, `NULL` from `malloc` or `fopen`) or set a global error code (`errno`). Both have the same weakness: nothing forces the caller to look. A forgotten check lets the program carry on with a wrong value, and the failure shows up much later, somewhere else.",
        },
        {
          type: "code",
          language: "c",
          code: `FILE *f = fopen("orders.csv", "r");
if (f == NULL) {                  /* the check is optional */
    perror("fopen");              /* reason lives in errno */
    return -1;                    /* and every caller must check again */
}`,
        },
        {
          type: "paragraph",
          text: "Language-level exception handling grew up alongside that style. PL/I in the 1960s had ON-units, handlers for conditions like `ZERODIVIDE`. CLU, Barbara Liskov's language at MIT in the mid-1970s, gave procedures a `signals` clause listing the exceptions they could raise, and used the termination model Java has today: once an exception is signalled, the procedure that raised it is finished. Ada 83 made exceptions a core feature, and C++ added `try`, `throw` and `catch` around 1990, standardized in C++98. C++'s `throw(X)` specifications were checked only at run time and were later removed (C++17).",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) took the C++ syntax and made three choices that still define it. Everything thrown must be an object of class `Throwable` or a subclass. The hierarchy splits into `Error` (the JVM or its environment failed) and `Exception` (the program's problems). And most exceptions are **checked**: the compiler rejects a method that can throw one unless it catches it or declares it with `throws`. `RuntimeException` and `Error` are exempt. That compile-time rule is the part of Java's design that's still argued about, and the Exception Handling Best Practices lesson covers how the industry has shifted on it.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`Throwable`, `Error`, `Exception`, `RuntimeException`; `throw`, `throws`, `try`, `catch`, `finally`; checked exceptions", "The hierarchy in this lesson has been the same since"],
            ["JDK 1.4 (2002)", "Chained exceptions (`getCause`, `initCause`, cause constructors); `getStackTrace()` and `StackTraceElement`; `assert` and `AssertionError`", "`Caused by:` in stack traces, and stack traces as data instead of only text"],
            ["Java 7 (2011)", "try-with-resources, multi-catch and precise rethrow (Project Coin, JSR 334); `addSuppressed`; the `writableStackTrace` constructor; `ReflectiveOperationException`", "Suppressed exceptions and stack-trace-free exceptions appear in this lesson"],
            ["Java 8 (2014)", "`UncheckedIOException`", "The standard unchecked wrapper for an `IOException`"],
            ["Java 9 (2017)", "`StackWalker` (JEP 259); module names in `StackTraceElement`", "Why JDK frames print as `java.base/java.lang.Integer.parseInt`"],
            ["Java 14 and 15 (2020)", "Helpful NullPointerException messages (JEP 358), on by default from 15", "`Cannot invoke \"String.length()\" because ... is null`"],
            ["Java 21 (2023)", "`MatchException` for pattern matching in `switch` (JEP 441)", "A new unchecked exception the compiler inserts itself"],
            ["Java 25 (2025)", "Flexible constructor bodies (JEP 513)", "A constructor can validate and throw before calling `super(...)`"],
          ],
        },
        {
          type: "paragraph",
          text: "The Java 25 change touches the most common exception there is, `IllegalArgumentException` from a constructor. Until JEP 513, a subclass constructor couldn't run a check before `super(...)`:",
        },
        {
          type: "code",
          language: "java",
          title: "ValidateFirst.java",
          code: `public class ValidateFirst {
    static class Shape {
        final String name;
        Shape(String name) {
            this.name = name;
            System.out.println("Shape constructor ran for " + name);
        }
    }

    static class Circle extends Shape {
        final double radius;

        Circle(double radius) {
            if (radius <= 0) {
                throw new IllegalArgumentException("radius must be positive, was " + radius);
            }
            super("circle");                       // JDK 25: statements allowed before super(...)
            this.radius = radius;
        }
    }

    public static void main(String[] args) {
        System.out.println(new Circle(2).radius);
        try {
            new Circle(-1);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ValidateFirst.java                 # JDK 21
$JDK25/bin/javac ValidateFirst.java && $JDK25/bin/java ValidateFirst`,
        },
        {
          type: "output",
          text: `ValidateFirst.java:17: error: call to super must be first statement in constructor
            super("circle");                       // JDK 25: statements allowed before super(...)
                 ^
1 error
Shape constructor ran for circle
2.0
radius must be positive, was -1.0`,
        },
        {
          type: "paragraph",
          text: "JDK 21 rejects it; JDK 25 (25.0.5 here) compiles it, and for `-1` the exception is thrown before `Shape`'s constructor runs at all, so no half-built `Circle` ever reaches the superclass. Everything else in this lesson runs on JDK 21.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I use is a fire alarm in an office building.",
        },
        {
          type: "list",
          items: [
            "Someone on the seventh floor pulls the alarm. That's `throw`. Work on that floor stops immediately; nobody finishes the email they were typing. That's the rest of the method being skipped.",
            "The alarm doesn't stay on the seventh floor. It goes down floor by floor until it reaches someone whose job is to handle that kind of alarm. Floors are stack frames, and the person on duty is a `catch` block.",
            "The incident report travels with the alarm: what happened (the message), which room and which floors it passed (the stack trace), and what set it off (the cause, like smoke from a kitchen two rooms over).",
            "The building code requires a written plan for some incidents, like a fire, before the building can open. Those are **checked** exceptions: `javac` won't compile a method that can raise one without a plan, a `catch` or a `throws` that passes it upward.",
            "Tripping over a cable is also an incident, but nobody files a plan for it. It's fixed by not leaving cables on the floor. Those are **unchecked** exceptions, `RuntimeException`s: almost always a bug in the code.",
            "An earthquake isn't something the floor warden handles. Everyone gets out. That's an `Error`: the JVM itself, or its environment, is in trouble.",
            "If the alarm reaches the ground floor and nobody handled it, the building is evacuated. That's an uncaught exception: the thread ends and the report gets printed at the door.",
            "The old way, an error code, is a note slipped under a door. Whoever is inside can read it or ignore it, and nothing stops them from carrying on as if nothing happened.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real fire report is written when the alarm is pulled. A Java incident report, the stack trace, is written when the exception object is **created** with `new`, not when it's thrown, and writing it is the expensive part. Internal Working shows both. And unlike a real fire alarm, a `catch` block can silence an exception and let everyone carry on, which is the most common way exceptions get misused.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Definitions",
        },
        {
          type: "list",
          items: [
            "**Throwable:** `java.lang.Throwable`, the root class. Only an instance of `Throwable` or a subclass can be thrown with `throw` or caught with `catch`.",
            "**Error:** a serious problem a normal application shouldn't try to catch: the JVM ran out of memory or stack, a class that compiled fine is missing at run time, a static initializer failed.",
            "**Exception:** a problem a program might reasonably want to catch. Every `Exception` that isn't a `RuntimeException` is **checked**.",
            "**RuntimeException:** a subclass of `Exception` for problems that usually mean a bug in the calling code: a `null` where an object was needed, a bad index, an illegal argument. **Unchecked.**",
            "**Checked exception:** a `Throwable` that is not a `RuntimeException` or an `Error`, or a subclass of either. The compiler requires every method that can throw one to catch it or declare it (JLS 11.2).",
            "**Unchecked exception:** `RuntimeException`, `Error` and all their subclasses (JLS 11.1.1). No catch-or-declare rule.",
          ],
        },
        {
          type: "diagram",
          text: `                    Throwable  (checked)
                   /         \\
               Error         Exception  (checked)
            (unchecked)       /       \\
                |      IOException   RuntimeException (unchecked)
   StackOverflowError  Interrupted-     |
   OutOfMemoryError    Exception      NullPointerException
   NoClassDefFound-    ClassNotFound- IllegalArgumentException
   Error ...           Exception ...  IllegalStateException ...`,
          caption: "The three branches that matter. Every class below RuntimeException or Error is unchecked; everything else is checked, including Throwable and Exception themselves.",
        },
        {
          type: "table",
          headers: ["", "Error", "Checked exception", "RuntimeException"],
          rows: [
            ["Meaning", "The JVM or environment failed", "A failure outside the program's control that the caller can plan for", "A bug, or a broken precondition"],
            ["Examples", "`OutOfMemoryError`, `StackOverflowError`, `NoClassDefFoundError`", "`IOException`, `InterruptedException`, `ClassNotFoundException`", "`NullPointerException`, `IllegalArgumentException`, `ArithmeticException`"],
            ["Compiler rule", "None", "Catch it or declare it with `throws`", "None"],
            ["Usual response", "Let the thread or process die, then fix the cause", "Handle it where a decision can be made, or declare it", "Fix the code; handle it only at a boundary"],
            ["Who throws it", "Mostly the JVM", "Library code that does I/O, waits or reflects", "Both: the JVM implicitly, and code with `throw`"],
          ],
        },
        {
          type: "heading",
          text: "The syntax pieces",
        },
        {
          type: "code",
          language: "java",
          code: `void withdraw(long amount) throws InsufficientFundsException {   // throws: a declaration
    if (amount <= 0) {
        throw new IllegalArgumentException("amount: " + amount);   // throw: a statement
    }
    ...
}`,
        },
        {
          type: "table",
          headers: ["Piece", "Where", "What it does"],
          rows: [
            ["`throw expr;`", "A statement in a method body", "Throws the object `expr` evaluates to. It must be a `Throwable`; if it's `null`, a `NullPointerException` is thrown instead"],
            ["`throws A, B`", "A method or constructor header", "Declares checked exceptions the method can throw. Unchecked ones may be listed for documentation, and the compiler ignores them"],
            ["`try { } catch (T e) { }`", "A statement", "Runs the block; if a `T` (or subclass) is thrown inside it, runs the handler. The next lesson owns the details"],
            ["`new T(...)`", "Anywhere", "Creates the exception object, which captures the stack trace. Creating one doesn't throw it"],
          ],
        },
        {
          type: "heading",
          text: "What every Throwable carries",
        },
        {
          type: "table",
          headers: ["Part", "Field in Throwable", "Read with", "Set by"],
          rows: [
            ["Detail message", "`detailMessage`", "`getMessage()`, `getLocalizedMessage()`", "The constructor; can be `null`"],
            ["Cause", "`cause`", "`getCause()`", "A cause constructor, or `initCause()` once"],
            ["Stack trace", "`backtrace` (JVM-internal), `stackTrace`", "`getStackTrace()`, `printStackTrace()`", "`fillInStackTrace()`, called by the constructor"],
            ["Suppressed exceptions", "`suppressedExceptions`", "`getSuppressed()`", "`addSuppressed()`, used by try-with-resources"],
          ],
        },
        {
          type: "paragraph",
          text: "`Throwable` has four public constructors, `()`, `(String message)`, `(String message, Throwable cause)` and `(Throwable cause)`, and one protected one added in Java 7, `(String message, Throwable cause, boolean enableSuppression, boolean writableStackTrace)`. `Exception`, `RuntimeException` and `Error` mirror all five, so a custom exception can pass any of them to `super`. The cause-only constructor uses `cause.toString()` as the message, which is why a wrapper often prints as `IllegalStateException: java.io.IOException: ...`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "throw is new plus athrow",
        },
        {
          type: "paragraph",
          text: "I compiled one explicit `throw` and four lines that can fail without any `throw` in them, to compare what `javac` emits:",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowSite.java",
          code: `public class ThrowSite {
    static int checkedDivide(int a, int b) {
        if (b == 0) {
            throw new IllegalArgumentException("b must not be zero");
        }
        return a / b;
    }

    static int divide(int a, int b) {
        return a / b;                         // the JVM checks b itself
    }

    static int third(int[] values) {
        return values[2];                     // null check and bounds check, both implicit
    }

    static int length(String s) {
        return s.length();                    // implicit null check on the receiver
    }

    static String asText(Object o) {
        return (String) o;                    // checkcast
    }

    public static void main(String[] args) {
        System.out.println(checkedDivide(10, 2) + " " + divide(10, 3) + " "
                + third(new int[] {1, 2, 3}) + " " + length("pen") + " " + asText("ok"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac ThrowSite.java && java ThrowSite && javap -c ThrowSite     # trimmed to the five methods",
        },
        {
          type: "output",
          text: `5 3 3 3 ok
  static int checkedDivide(int, int);
    Code:
       0: iload_1
       1: ifne          14
       4: new           #7                  // class java/lang/IllegalArgumentException
       7: dup
       8: ldc           #9                  // String b must not be zero
      10: invokespecial #11                 // Method java/lang/IllegalArgumentException."<init>":(Ljava/lang/String;)V
      13: athrow
      14: iload_0
      15: iload_1
      16: idiv
      17: ireturn

  static int divide(int, int);
    Code:
       0: iload_0
       1: iload_1
       2: idiv
       3: ireturn

  static int third(int[]);
    Code:
       0: aload_0
       1: iconst_2
       2: iaload
       3: ireturn

  static int length(java.lang.String);
    Code:
       0: aload_0
       1: invokevirtual #14                 // Method java/lang/String.length:()I
       4: ireturn

  static java.lang.String asText(java.lang.Object);
    Code:
       0: aload_0
       1: checkcast     #15                 // class java/lang/String
       4: areturn`,
        },
        {
          type: "list",
          items: [
            "`throw new IllegalArgumentException(...)` is four ordinary instructions and one special one. `new`, `dup`, `ldc` and `invokespecial <init>` are exactly what any `new Foo(\"...\")` compiles to, as in the Memory Allocation lesson: allocate, then run the constructor. The exception is a plain heap object. Then `athrow` pops the reference and starts the search for a handler.",
            "`athrow` is the only bytecode instruction whose whole job is throwing. There's no instruction for `throws`, and no `try` instruction either; handlers live in a per-method **exception table**, shown further down.",
            "`divide`, `third`, `length` and `asText` contain no `athrow` at all, yet each one can throw. The JVM specification defines the failure of the instructions themselves: `idiv` throws `ArithmeticException` when the divisor is zero, `iaload` throws `NullPointerException` for a null array and `ArrayIndexOutOfBoundsException` for a bad index, `invokevirtual` throws `NullPointerException` for a null receiver, and `checkcast` throws `ClassCastException`. These are **implicit exceptions**: the JVM creates and throws them itself.",
            "`checkedDivide`'s own `idiv` at offset 16 can still throw an implicit `ArithmeticException` in principle, but the `ifne` at offset 1 jumps over the `throw` only when `b` isn't zero, so it never does. That's what a guard clause buys: my message instead of the JVM's `/ by zero`.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "How HotSpot finds a null without checking for it",
          text: "HotSpot often emits no null test at all, especially in JIT-compiled code. It lets the load from a null address fault, and its signal handler turns the fault into a `NullPointerException` at the right bytecode position. That's an **implicit null check**: free when the value isn't null, which is nearly always.",
        },
        {
          type: "heading",
          text: "throws is only metadata",
        },
        {
          type: "paragraph",
          text: "The `throws` clause is stored in the class file as an `Exceptions` attribute on the method:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -v Declared        # Declared.java is in the checked-exceptions section below; trimmed",
        },
        {
          type: "output",
          text: `  static java.io.FileReader open(java.lang.String) throws java.io.FileNotFoundException;
    descriptor: (Ljava/lang/String;)Ljava/io/FileReader;
    flags: (0x0008) ACC_STATIC
    ...
    Exceptions:
      throws java.io.FileNotFoundException`,
        },
        {
          type: "paragraph",
          text: "The descriptor `(Ljava/lang/String;)Ljava/io/FileReader;` doesn't mention the exception, so `throws` isn't part of how the JVM identifies or links the method. JVMS 4.7.5 says the requirement that checked exceptions be declared is enforced only by the compiler, not by the JVM. At run time, a checked exception is thrown, propagated and caught exactly like an unchecked one. The \"checked\" idea lives entirely in `javac`, which is why it can be bypassed: the throw, throws and Custom Exceptions lesson shows the sneaky-throw trick that does it, and why not to use it.",
        },
        {
          type: "heading",
          text: "The stack trace is taken at new, not at throw",
        },
        {
          type: "paragraph",
          text: "Every public `Throwable` constructor starts the same way. From the JDK source, trimmed to the lines that matter:",
        },
        {
          type: "code",
          language: "java",
          code: `public Throwable(String message) {
    fillInStackTrace();
    detailMessage = message;
}

public synchronized Throwable fillInStackTrace() {
    if (stackTrace != null || backtrace != null /* Out of protocol state */ ) {
        fillInStackTrace(0);                 // native: the JVM walks the thread's stack
        stackTrace = UNASSIGNED_STACK;
    }
    return this;
}`,
        },
        {
          type: "paragraph",
          text: "So the stack trace is recorded during construction, from wherever `new` runs. To prove it, I created an exception in one method and threw it from another, with a subclass that announces when `fillInStackTrace()` is called:",
        },
        {
          type: "code",
          language: "java",
          title: "StackAtNew.java",
          code: `public class StackAtNew {
    static class TracedException extends RuntimeException {
        TracedException(String message) {
            super(message);                         // Throwable's constructor runs first
        }

        @Override
        public synchronized Throwable fillInStackTrace() {
            System.out.println("  fillInStackTrace() called");
            return super.fillInStackTrace();
        }
    }

    static class QuietException extends RuntimeException {
        QuietException(String message) {
            super(message, null, false, false);     // no suppression, no stack trace
        }
    }

    static RuntimeException prepare() {
        System.out.println("prepare(): new TracedException");
        return new TracedException("made in prepare()");
    }

    static void fire(RuntimeException e) {
        System.out.println("fire(): throw");
        throw e;
    }

    public static void main(String[] args) {
        RuntimeException e = prepare();
        try {
            fire(e);
        } catch (RuntimeException caught) {
            System.out.println("top frame: " + caught.getStackTrace()[0]);
        }

        QuietException quiet = new QuietException("no trace");
        System.out.println("quiet frames: " + quiet.getStackTrace().length);
        quiet.printStackTrace(System.out);
    }
}`,
        },
        {
          type: "output",
          text: `prepare(): new TracedException
  fillInStackTrace() called
fire(): throw
top frame: StackAtNew.prepare(StackAtNew.java:22)
quiet frames: 0
StackAtNew$QuietException: no trace`,
        },
        {
          type: "list",
          items: [
            "`fillInStackTrace() called` printed inside `prepare()`, before `fire()` ever ran. `athrow` didn't touch the trace.",
            "The top frame is `prepare` at line 22, the `new`, not `fire`, where the `throw` was. An exception stored in a field and thrown later points at the wrong place, which is one reason not to reuse exception objects casually.",
            "The trace doesn't include the constructors themselves. The JVM skips the `fillInStackTrace` and `<init>` frames of the exception being built, so the trace starts at the code that said `new`.",
            "`QuietException` passed `writableStackTrace = false` to the protected constructor. `fillInStackTrace()` was never called, `getStackTrace()` is empty, and `printStackTrace` prints only the first line. The same constructor's `enableSuppression = false` makes `addSuppressed` a no-op.",
          ],
        },
        {
          type: "paragraph",
          text: "The `backtrace` field is the other half of the trick. The native walk stores a compact JVM-internal record (which method, which bytecode index) per frame. The `StackTraceElement` objects with class names, file names and line numbers are only built from it the first time something calls `getStackTrace()` or `printStackTrace()`. An exception that's created, caught and dropped never pays for those objects.",
        },
        {
          type: "heading",
          text: "What the walk costs",
        },
        {
          type: "paragraph",
          text: "Walking the stack is proportional to its depth. I created (not threw) exceptions at the bottom of a 10-frame and a 200-frame recursion, with and without a stack trace, and once more while also reading `getStackTrace()`:",
        },
        {
          type: "code",
          language: "java",
          title: "StackCost.java",
          code: `import java.util.function.Supplier;

public class StackCost {
    static class NoTrace extends RuntimeException {
        NoTrace() {
            super("no trace", null, false, false);
        }
    }

    static long sink;

    // Recurse to the wanted depth, then create (not throw) one exception there
    static Throwable at(int depth, Supplier<Throwable> factory) {
        return depth == 0 ? factory.get() : at(depth - 1, factory);
    }

    static double nanosPerException(int depth, Supplier<Throwable> factory, boolean readTrace) {
        int n = 20_000;
        long start = System.nanoTime();
        for (int i = 0; i < n; i++) {
            Throwable t = at(depth, factory);
            sink += readTrace ? t.getStackTrace().length : t.hashCode();
        }
        return (System.nanoTime() - start) / (double) n;
    }

    public static void main(String[] args) {
        Supplier<Throwable> normal = () -> new RuntimeException("boom");
        Supplier<Throwable> quiet = NoTrace::new;
        for (int round = 1; round <= 3; round++) {          // rounds 1-2 are warm-up
            double shallow = nanosPerException(10, normal, false);
            double deep = nanosPerException(200, normal, false);
            double deepQuiet = nanosPerException(200, quiet, false);
            double deepRead = nanosPerException(200, normal, true);
            if (round == 3) {
                System.out.printf("depth  10, stack trace       %,8.0f ns%n", shallow);
                System.out.printf("depth 200, stack trace       %,8.0f ns%n", deep);
                System.out.printf("depth 200, no stack trace    %,8.0f ns%n", deepQuiet);
                System.out.printf("depth 200, + getStackTrace() %,8.0f ns%n", deepRead);
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m StackCost        # three runs",
        },
        {
          type: "output",
          text: `depth  10, stack trace            917 ns
depth 200, stack trace          7,567 ns
depth 200, no stack trace         213 ns
depth 200, + getStackTrace()   35,516 ns

depth  10, stack trace          1,233 ns
depth 200, stack trace          8,667 ns
depth 200, no stack trace         208 ns
depth 200, + getStackTrace()   33,670 ns

depth  10, stack trace            848 ns
depth 200, stack trace          6,987 ns
depth 200, no stack trace         212 ns
depth 200, + getStackTrace()   33,984 ns`,
        },
        {
          type: "list",
          items: [
            "These are rough numbers from my machine on JDK 21, with other JVMs running at the same time. The ratios are what I'd trust, not the nanoseconds.",
            "Twenty times the depth cost about eight times as much. The 200-frame recursion itself is in every row, and without a stack trace the whole thing took about 210 ns, so nearly all of the 7 to 9 microseconds was `fillInStackTrace`.",
            "Turning the backtrace into `StackTraceElement` objects cost another 25 microseconds or more, several times the walk itself. Printing or logging a trace pays that, plus formatting the text.",
            "A Spring request thread is often more than 100 frames deep, so an exception created there costs microseconds, not nanoseconds. That's harmless for genuine failures and expensive for exceptions used as ordinary control flow, which When to Throw an Exception measures.",
          ],
        },
        {
          type: "heading",
          text: "How the JVM finds a handler",
        },
        {
          type: "paragraph",
          text: "When an exception is thrown, by `athrow` or implicitly, the JVM looks at the current method's exception table. Here's `main` from the `Unwinding` example further down, which calls `checkout(\"three\")` inside a `try`:",
        },
        {
          type: "output",
          text: `      21: invokestatic  #47                 // Method checkout:(Ljava/lang/String;)I
      ...
      32: goto          67
      35: astore_1
      ...
    Exception table:
       from    to  target type
          16    32    35   Class java/lang/NumberFormatException`,
        },
        {
          type: "paragraph",
          text: "Each row says: if an exception is thrown while the program counter is in `[from, to)` and it's an instance of `type`, clear the operand stack, push the exception and jump to `target`. If no row matches, the JVM discards the frame and repeats the search in the caller, at the instruction that made the call. That's **stack unwinding**. The try, catch and finally lesson takes the table apart, including how `finally` is compiled; for this lesson the important part is that the match is a plain `instanceof`-style check on the class. Checked or unchecked never comes into it.",
        },
        {
          type: "heading",
          text: "Helpful NullPointerException messages",
        },
        {
          type: "paragraph",
          text: "Since JDK 15, an NPE the JVM throws itself says exactly what was null (JEP 358). The JVM works it out from the bytecode of the failing method, and only when `getMessage()` is first called, so an NPE that's never printed doesn't pay for it:",
        },
        {
          type: "code",
          language: "java",
          title: "HelpfulNpe.java",
          code: `public class HelpfulNpe {
    static class Address { String city; }
    static class Customer { Address address; }
    static class Order { Customer customer; int[] quantities; }

    static int cityLength(Order order) {
        return order.customer.address.city.length();
    }

    static int firstQuantity(Order order) {
        return order.quantities[0];
    }

    public static void main(String[] args) {
        Order order = new Order();
        order.customer = new Customer();             // address left null
        try {
            cityLength(order);
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
        }
        try {
            firstQuantity(order);
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
        }
        try {
            Integer stock = null;
            int units = stock;                       // auto-unboxing
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
        }
        try {
            throw new NullPointerException();        // explicit: no helpful message
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac HelpfulNpe.java && java HelpfulNpe
javac -g HelpfulNpe.java && java HelpfulNpe
java -XX:-ShowCodeDetailsInExceptionMessages HelpfulNpe`,
        },
        {
          type: "output",
          text: `Cannot read field "city" because "<parameter1>.customer.address" is null
Cannot load from int array because "<parameter1>.quantities" is null
Cannot invoke "java.lang.Integer.intValue()" because "<local2>" is null
null

Cannot read field "city" because "order.customer.address" is null
Cannot load from int array because "order.quantities" is null
Cannot invoke "java.lang.Integer.intValue()" because "stock" is null
null

null
null
null
null`,
        },
        {
          type: "list",
          items: [
            "The message names the failed action (read field `city`, load from an `int` array, invoke `intValue()`) and the null expression, rebuilt from the bytecode: `order.customer.address`. In a chain of four dereferences, that's the difference between guessing and knowing.",
            "Without `-g`, the class file has no `LocalVariableTable`, so names become `<parameter1>` and `<local2>`. With `-g`, the real names appear. Maven and Gradle compile with debug info by default, which is why production NPEs usually show real names, as the Methods lesson noted.",
            "Unboxing a null `Integer` is an NPE on a call I never wrote: `stock.intValue()`, inserted by `javac`.",
            "An NPE created with `new NullPointerException()` gets no computed message; it's only for the ones the JVM throws. The feature can be switched off with `-XX:-ShowCodeDetailsInExceptionMessages`, which turned all four into `null`.",
          ],
        },
        {
          type: "heading",
          text: "When HotSpot drops the stack trace: OmitStackTraceInFastThrow",
        },
        {
          type: "paragraph",
          text: "There's one case where the JVM deliberately skips `fillInStackTrace`. When an implicit exception is thrown over and over from the same place in hot code, HotSpot's C2 compiler recompiles that spot to throw a **preallocated** exception object with no stack trace and no message. The flag is `OmitStackTraceInFastThrow`, and it's on by default:",
        },
        {
          type: "code",
          language: "java",
          title: "FastThrow.java",
          code: `public class FastThrow {
    static class Customer {
        String email;                                // null for some customers
    }

    static int emailLength(Customer c) {
        return c.email.length();                     // implicit NPE when email is null
    }

    public static void main(String[] args) {
        Customer noEmail = new Customer();
        int firstEmpty = -1;
        String firstMessage = null;
        for (int i = 1; i <= 200_000; i++) {
            try {
                emailLength(noEmail);
            } catch (NullPointerException e) {
                if (i == 1) {
                    System.out.println("call 1:      " + e.getMessage());
                    System.out.println("             frames: " + e.getStackTrace().length);
                }
                if (e.getStackTrace().length == 0 && firstEmpty < 0) {
                    firstEmpty = i;
                    firstMessage = e.getMessage();
                }
            }
        }
        if (firstEmpty < 0) {
            System.out.println("every NPE had a stack trace");
        } else {
            System.out.println("call " + firstEmpty + ": message " + firstMessage + ", frames: 0");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java FastThrow                                  # three runs
java -XX:-OmitStackTraceInFastThrow FastThrow`,
        },
        {
          type: "output",
          text: `call 1:      Cannot invoke "String.length()" because "<parameter1>.email" is null
             frames: 2
call 5251: message null, frames: 0
call 1:      Cannot invoke "String.length()" because "<parameter1>.email" is null
             frames: 2
call 5236: message null, frames: 0
call 1:      Cannot invoke "String.length()" because "<parameter1>.email" is null
             frames: 2
call 5311: message null, frames: 0

call 1:      Cannot invoke "String.length()" because "<parameter1>.email" is null
             frames: 2
every NPE had a stack trace`,
        },
        {
          type: "list",
          items: [
            "The first few thousand NPEs were normal: helpful message, two frames. Somewhere after call 5,000 (a different call each run) C2 recompiled `emailLength`, and from then on every NPE had **no message and an empty stack trace**. Printed, that's just `java.lang.NullPointerException`.",
            "It isn't a new exception per call. C2 preallocates one exception object when it compiles that spot and throws the same instance every time, which is why it can't carry a message or a trace.",
            "It's C2 only. With `-XX:TieredStopAtLevel=1` (C1 only) or `-Xint`, every NPE kept its trace (Try It Yourself runs both).",
            "It isn't only NPEs. C2 does the same for four more implicit exceptions: `ArithmeticException` from integer `/ 0`, `ArrayIndexOutOfBoundsException`, `ClassCastException` and `ArrayStoreException`. Exceptions thrown with an explicit `throw` are never affected.",
            "`-XX:-OmitStackTraceInFastThrow` turns it off: every NPE had its trace. `java -XX:+PrintFlagsFinal -version` on JDK 21 shows the default, `OmitStackTraceInFastThrow = true`, next to `MaxJavaStackTraceDepth = 1024`, the cap on how many frames any trace records.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "Reading a log full of bare NullPointerExceptions",
          text: "If a log shows the same exception thousands of times and the recent ones have no stack trace, I search backwards for the first occurrences. They were thrown before C2 recompiled the method, so they still have full traces. If the log has rotated, restarting with `-XX:-OmitStackTraceInFastThrow` brings the traces back, at the cost of a stack walk per exception.",
        },
      ],
    },
    {
      title: "Error Codes, Sentinels and Exceptions",
      blocks: [
        {
          type: "paragraph",
          text: "The C snippet in Where It Came From is the whole argument in miniature, but I wanted to see the failure mode in Java, where the sentinel style is still easy to write. A price lookup that returns `-1` for an unknown product, next to one that throws:",
        },
        {
          type: "code",
          language: "java",
          title: "SentinelVsException.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

public class SentinelVsException {
    static final Map<String, Integer> PRICES = Map.of("pen", 20, "pad", 45, "ink", 60);

    // C style: -1 means "not found", and nothing forces the caller to check
    static int priceOrMinusOne(String product) {
        Integer price = PRICES.get(product);
        return price == null ? -1 : price;
    }

    // Java style: a missing product can't be mistaken for a price
    static int price(String product) {
        Integer price = PRICES.get(product);
        if (price == null) {
            throw new NoSuchElementException("no price for product \\"" + product + "\\"");
        }
        return price;
    }

    public static void main(String[] args) {
        List<String> order = List.of("pen", "pad", "stapler", "ink");

        int total = 0;
        for (String product : order) {
            total += priceOrMinusOne(product);          // forgot to check for -1
        }
        System.out.println("sentinel total:  " + total);

        total = 0;
        for (String product : order) {
            total += price(product);
        }
        System.out.println("exception total: " + total);
    }
}`,
        },
        {
          type: "output",
          text: `sentinel total:  124
Exception in thread "main" java.util.NoSuchElementException: no price for product "stapler"
\tat SentinelVsException.price(SentinelVsException.java:18)
\tat SentinelVsException.main(SentinelVsException.java:34)`,
        },
        {
          type: "list",
          items: [
            "The sentinel version printed `124`, which is `20 + 45 - 1 + 60`. A wrong total, no error, nothing in any log. The missing stapler became a discount of one rupee.",
            "The exception version refused to produce a total at all, and said which product and which line. A loud failure in the right place is much cheaper than a quiet wrong answer that someone finds a week later.",
            "The sentinel also has to be a value the real result can never take. `-1` works for a price, but for something like a temperature there's no spare value, and the JDK has both kinds: `String.indexOf` returns `-1`, `Map.get` returns `null` (which is also a legal value in a `HashMap`), while `Integer.parseInt` throws.",
          ],
        },
        {
          type: "table",
          headers: ["", "Error code or sentinel", "Exception"],
          rows: [
            ["Can the caller ignore it?", "Yes, silently", "Only by catching it on purpose, or by letting the thread die"],
            ["Where the error path goes", "Through every return value, at every level", "Straight to the nearest matching handler"],
            ["Information carried", "A number, maybe `errno`", "Type, message, cause, full stack trace"],
            ["Return type", "Shared with the real result", "Free for the real result"],
            ["Cost when nothing fails", "A comparison per call", "Nothing: no handler setup at run time, just a table in the class file"],
            ["Cost when something fails", "Cheap", "Microseconds for the stack trace, as measured above"],
          ],
        },
        {
          type: "paragraph",
          text: "That last row is the honest trade-off. Exceptions are cheap when nothing goes wrong and expensive when something does, so they're for failures, not for answers the caller expects every day. A lookup that often finds nothing is better served by `Optional`, the Java 8 track's Optional lesson, as When to Throw an Exception shows.",
        },
      ],
    },
    {
      title: "The Hierarchy, Printed by Reflection",
      blocks: [
        {
          type: "paragraph",
          text: "Rather than trust a diagram, I asked each class for its superclass until there wasn't one, and classified it with the same rule `javac` uses:",
        },
        {
          type: "code",
          language: "java",
          title: "Hierarchy.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Hierarchy {
    static String chain(Class<?> c) {
        List<String> names = new ArrayList<>();
        for (Class<?> k = c; k != null; k = k.getSuperclass()) {
            names.add(k.getSimpleName());
        }
        return String.join(" -> ", names);
    }

    static String kind(Class<?> c) {
        if (Error.class.isAssignableFrom(c)) return "error";
        if (RuntimeException.class.isAssignableFrom(c)) return "unchecked";
        return "checked";
    }

    public static void main(String[] args) {
        Class<?>[] types = {
            NullPointerException.class,
            ArithmeticException.class,
            ArrayIndexOutOfBoundsException.class,
            ClassCastException.class,
            NumberFormatException.class,
            IllegalStateException.class,
            UnsupportedOperationException.class,
            java.util.ConcurrentModificationException.class,
            java.io.UncheckedIOException.class,
            java.io.FileNotFoundException.class,
            InterruptedException.class,
            ClassNotFoundException.class,
            CloneNotSupportedException.class,
            StackOverflowError.class,
            OutOfMemoryError.class,
            NoClassDefFoundError.class,
            ExceptionInInitializerError.class,
            AssertionError.class,
        };
        for (Class<?> t : types) {
            System.out.printf("%-9s %s%n", kind(t), chain(t));
        }
    }
}`,
        },
        {
          type: "output",
          text: `unchecked NullPointerException -> RuntimeException -> Exception -> Throwable -> Object
unchecked ArithmeticException -> RuntimeException -> Exception -> Throwable -> Object
unchecked ArrayIndexOutOfBoundsException -> IndexOutOfBoundsException -> RuntimeException -> Exception -> Throwable -> Object
unchecked ClassCastException -> RuntimeException -> Exception -> Throwable -> Object
unchecked NumberFormatException -> IllegalArgumentException -> RuntimeException -> Exception -> Throwable -> Object
unchecked IllegalStateException -> RuntimeException -> Exception -> Throwable -> Object
unchecked UnsupportedOperationException -> RuntimeException -> Exception -> Throwable -> Object
unchecked ConcurrentModificationException -> RuntimeException -> Exception -> Throwable -> Object
unchecked UncheckedIOException -> RuntimeException -> Exception -> Throwable -> Object
checked   FileNotFoundException -> IOException -> Exception -> Throwable -> Object
checked   InterruptedException -> Exception -> Throwable -> Object
checked   ClassNotFoundException -> ReflectiveOperationException -> Exception -> Throwable -> Object
checked   CloneNotSupportedException -> Exception -> Throwable -> Object
error     StackOverflowError -> VirtualMachineError -> Error -> Throwable -> Object
error     OutOfMemoryError -> VirtualMachineError -> Error -> Throwable -> Object
error     NoClassDefFoundError -> LinkageError -> Error -> Throwable -> Object
error     ExceptionInInitializerError -> LinkageError -> Error -> Throwable -> Object
error     AssertionError -> Error -> Throwable -> Object`,
        },
        {
          type: "image",
          src: "/images/java/exceptions-basics-hierarchy.svg",
          alt: "Tree diagram: Throwable at the top splits into Error and Exception. Under Error: VirtualMachineError with StackOverflowError and OutOfMemoryError, LinkageError with NoClassDefFoundError and ExceptionInInitializerError, and AssertionError. Under Exception: checked subclasses IOException with FileNotFoundException, InterruptedException, ReflectiveOperationException with ClassNotFoundException, and custom ones; and RuntimeException, with NullPointerException, ArithmeticException, IndexOutOfBoundsException with ArrayIndexOutOfBoundsException, ClassCastException, IllegalArgumentException with NumberFormatException, IllegalStateException, UnsupportedOperationException and ConcurrentModificationException.",
          caption: "The classes from the reflection output, drawn as a tree. Orange is checked, blue is unchecked, grey is Error.",
        },
        {
          type: "list",
          items: [
            "Every chain ends in `Throwable -> Object`. A `Throwable` is an ordinary object: it has `equals`, `hashCode` and `toString` from `Object`, can be stored in a field or a list, and is garbage collected like anything else.",
            "`NumberFormatException` is an `IllegalArgumentException`. A `catch (IllegalArgumentException e)` catches a failed `Integer.parseInt` too, which is either convenient or a surprise.",
            "`ClassNotFoundException` is checked, through `ReflectiveOperationException` (added in Java 7 as a common parent for the reflection exceptions). `NoClassDefFoundError`, the run-time cousin, is an `Error`. The names are similar and the branches couldn't be further apart.",
            "`UncheckedIOException` (Java 8) exists only to carry an `IOException` through code that can't declare checked exceptions, like a lambda passed to a stream.",
            "`AssertionError` sits directly under `Error`. It's what a failed `assert` throws when assertions are enabled with `-ea`.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Throwable and Exception are checked too",
          text: "The JLS rule is a list of exemptions, not a list of checked classes: `RuntimeException`, `Error` and their subclasses are unchecked, and every other `Throwable` is checked. That includes `Throwable` and `Exception` themselves. A method containing `throw new Exception(\"x\")` must declare `throws Exception`, and a `catch (Exception e)` that rethrows `e` as-is has to declare it too, unless Java 7's precise rethrow can prove only unchecked exceptions reach it (the throw, throws and Custom Exceptions lesson).",
        },
      ],
    },
    {
      title: "Checked vs Unchecked: The Compiler's Rule",
      blocks: [
        {
          type: "paragraph",
          text: "JLS 11.2 makes it a compile-time error for a method or constructor to be able to throw a checked exception that it neither catches nor declares. \"Able to throw\" is worked out from the code: a `throw` statement of a checked type, or a call to a method or constructor whose `throws` clause lists one. Two calls that look harmless are enough:",
        },
        {
          type: "code",
          language: "java",
          title: "Unreported.java",
          code: `import java.io.FileReader;

public class Unreported {
    static FileReader open(String path) {
        return new FileReader(path);              // FileReader(String) throws FileNotFoundException
    }

    static void pause() {
        Thread.sleep(100);                        // throws InterruptedException
    }
}`,
        },
        {
          type: "output",
          text: `Unreported.java:5: error: unreported exception FileNotFoundException; must be caught or declared to be thrown
        return new FileReader(path);              // FileReader(String) throws FileNotFoundException
               ^
Unreported.java:9: error: unreported exception InterruptedException; must be caught or declared to be thrown
        Thread.sleep(100);                        // throws InterruptedException
                    ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "There are exactly two fixes, and the error message names both: catch it, or declare it so the caller has to decide.",
        },
        {
          type: "code",
          language: "java",
          title: "Declared.java",
          code: `import java.io.FileNotFoundException;
import java.io.FileReader;

public class Declared {
    static FileReader open(String path) throws FileNotFoundException {   // option 1: declare
        return new FileReader(path);
    }

    public static void main(String[] args) {
        try {                                                        // option 2: catch
            open("orders.csv");
        } catch (FileNotFoundException e) {
            System.out.println("caught: " + e.getMessage());
        }
        try {
            System.out.println("no checked exception here");
        } catch (Exception e) {                                      // always allowed
            System.out.println("never printed");
        }
        try {
            System.out.println("no checked exception here either");
        } catch (RuntimeException e) {                               // unchecked: always allowed
            System.out.println("never printed");
        }
    }
}`,
        },
        {
          type: "output",
          text: `caught: orders.csv (No such file or directory)
no checked exception here
no checked exception here either`,
        },
        {
          type: "paragraph",
          text: "The rule also works in the other direction. Catching a checked exception that the `try` block can't possibly throw is an error too (JLS 11.2.3), because that handler is dead code:",
        },
        {
          type: "code",
          language: "java",
          title: "NeverThrown.java",
          code: `import java.io.IOException;

public class NeverThrown {
    public static void main(String[] args) {
        try {
            System.out.println("nothing here does I/O");
        } catch (IOException e) {
            System.out.println("unreachable");
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
          type: "list",
          items: [
            "`catch (Exception e)` and `catch (Throwable e)` are always allowed, even around code that throws nothing checked, because they also catch unchecked exceptions. `Declared` compiled with one.",
            "A `catch` of any unchecked type is always allowed for the same reason: any code can throw one.",
            "`main` is an ordinary method here. `public static void main(String[] args) throws Exception` is legal, and an exception that escapes it is handled like any uncaught exception: printed, exit code 1. The Syntax at a Glance program does exactly that.",
            "An overriding method can't declare broader checked exceptions than the method it overrides. The Polymorphism lesson showed the error; the throw, throws and Custom Exceptions lesson revisits it.",
            "A lambda can only throw the checked exceptions its functional interface method declares. `Runnable.run()` declares none, so `() -> Thread.sleep(10)` doesn't compile as a `Runnable`. That's why the `Triggers` program below uses its own interface with `throws Exception`.",
          ],
        },
        {
          type: "heading",
          text: "Why the line is drawn there",
        },
        {
          type: "paragraph",
          text: "The idea behind the split: a checked exception is a failure that a correct program still has to expect, because its cause is outside the program. The file might not exist; the network might drop; another thread might interrupt this one. The compiler makes sure someone planned for it. An unchecked exception is a failure that a correct program wouldn't produce: dividing by zero, indexing past the end, passing `null` where it's not allowed. Declaring those everywhere would add a `throws` to every method that ever touches an array, so they're exempt. Errors are exempt because there's usually nothing sensible a method could do about them.",
        },
        {
          type: "paragraph",
          text: "In practice the line is blurrier. `NumberFormatException` is unchecked even though bad input from outside the program is exactly the \"expect it\" case. And modern frameworks, Spring included, mostly wrap checked exceptions in unchecked ones (Spring's `DataAccessException` hierarchy is unchecked). The Exception Handling Best Practices lesson takes up that shift; this lesson sticks to what the compiler does.",
        },
      ],
    },
    {
      title: "The Common Exceptions, One Trigger Each",
      blocks: [
        {
          type: "paragraph",
          text: "I wanted to see every exception I'd expect in an interview list actually happen, with the JDK's real message, so I wrote one trigger per exception and ran them all through the same `catch`:",
        },
        {
          type: "code",
          language: "java",
          title: "Triggers.java",
          code: `import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Triggers {
    interface Action {
        void run() throws Exception;              // lets each trigger throw anything
    }

    static void trigger(String label, Action action) {
        try {
            action.run();
            System.out.println(label + " -> no exception");
        } catch (Exception e) {
            System.out.println(label + " -> " + e);
        }
    }

    static class Employee {
        String name;
        Employee manager;
    }

    static Employee asha = new Employee();        // asha.manager stays null

    public static void main(String[] args) {
        asha.name = "Asha";

        trigger("NPE  ", () -> System.out.println(asha.manager.name.length()));
        trigger("AE   ", () -> System.out.println(10 / (asha.name.length() - 4)));
        trigger("AIOOB", () -> {
            int[] scores = new int[3];
            scores[3] = 90;
        });
        trigger("CCE  ", () -> {
            Object o = "42";
            Integer i = (Integer) o;
        });
        trigger("NFE  ", () -> Integer.parseInt("12km"));
        trigger("IAE  ", () -> new ArrayList<String>(-1));
        trigger("ISE  ", () -> Stream.of("pen", "pad", "pen")
                .collect(Collectors.toMap(s -> s, s -> 1)));
        trigger("UOE  ", () -> List.of("pen").add("pad"));
        trigger("CME  ", () -> {
            List<String> items = new ArrayList<>(List.of("pen", "pad", "ink"));
            for (String item : items) {
                if (item.equals("pen")) items.remove(item);
            }
        });
        trigger("FNFE ", () -> new FileReader("orders.csv"));
        trigger("IE   ", () -> {
            Thread.currentThread().interrupt();   // someone asked this thread to stop
            Thread.sleep(1_000);
        });
    }
}`,
        },
        {
          type: "output",
          text: `NPE   -> java.lang.NullPointerException: Cannot read field "name" because "Triggers.asha.manager" is null
AE    -> java.lang.ArithmeticException: / by zero
AIOOB -> java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3
CCE   -> java.lang.ClassCastException: class java.lang.String cannot be cast to class java.lang.Integer (java.lang.String and java.lang.Integer are in module java.base of loader 'bootstrap')
NFE   -> java.lang.NumberFormatException: For input string: "12km"
IAE   -> java.lang.IllegalArgumentException: Illegal Capacity: -1
ISE   -> java.lang.IllegalStateException: Duplicate key pen (attempted merging values 1 and 1)
UOE   -> java.lang.UnsupportedOperationException
CME   -> java.util.ConcurrentModificationException
FNFE  -> java.io.FileNotFoundException: orders.csv (No such file or directory)
IE    -> java.lang.InterruptedException: sleep interrupted`,
        },
        {
          type: "table",
          headers: ["Exception", "Kind", "What caused it here", "What it usually means"],
          rows: [
            ["`NullPointerException`", "unchecked", "Read `name` through `asha.manager`, which was `null`", "A reference that should have been set wasn't; fail earlier with `Objects.requireNonNull`"],
            ["`ArithmeticException`", "unchecked", "Integer division by `\"Asha\".length() - 4`, which is 0", "Integer `/` or `%` by zero. Floating-point division by zero doesn't throw (Common Mistakes)"],
            ["`ArrayIndexOutOfBoundsException`", "unchecked", "Index 3 in an array of length 3", "An off-by-one: valid indexes are `0` to `length - 1`"],
            ["`ClassCastException`", "unchecked", "Cast a `String` to `Integer`", "A cast the object's real class doesn't allow; usually raw types or a wrong assumption about a collection's contents"],
            ["`NumberFormatException`", "unchecked", "`Integer.parseInt(\"12km\")`", "Text from outside the program that isn't a number. A subclass of `IllegalArgumentException`"],
            ["`IllegalArgumentException`", "unchecked", "`new ArrayList<>(-1)`", "The caller passed a value the method doesn't accept"],
            ["`IllegalStateException`", "unchecked", "`toMap` found the key `pen` twice", "The call is fine, but not now, or not with this object's current state"],
            ["`UnsupportedOperationException`", "unchecked", "`add` on an immutable `List.of` list", "The object doesn't support this operation at all. No message, as the output shows"],
            ["`ConcurrentModificationException`", "unchecked", "Removed from an `ArrayList` while a for-each loop was iterating it", "A collection changed under an iterator; in one thread, it's this. Use `removeIf` or the iterator's `remove`"],
            ["`FileNotFoundException`", "checked", "Opened `orders.csv`, which doesn't exist", "The file isn't there or can't be opened; an `IOException`"],
            ["`InterruptedException`", "checked", "Called `sleep` on a thread whose interrupt flag was set", "Another thread asked this one to stop waiting. Restore the flag with `Thread.currentThread().interrupt()` if not rethrowing"],
          ],
        },
        {
          type: "list",
          items: [
            "Only the last two needed the `Action` interface's `throws Exception`. The other nine are unchecked, so a plain `Runnable` would have compiled for them.",
            "Several messages are generated by the JDK, not the JVM: `Illegal Capacity: -1` comes from `ArrayList`'s constructor, `For input string` from `NumberFormatException.forInputString`. The `/ by zero`, the array index message and the `ClassCastException` text come from the JVM itself, because those were implicit exceptions.",
            "The `ClassCastException` message names the class loader of each class. With two loaders, as in the Class Loading lesson, it's the one message that explains why `com.shop.Order` can't be cast to `com.shop.Order`.",
            "The `ConcurrentModificationException` came from the loop's next call to `next()`, not from `remove`. The iterator compares the list's modification count with the one it saw at the start. It's best-effort: removing the second-to-last element skips that check and ends the loop silently, which is one reason not to rely on the exception.",
            "`UnsupportedOperationException` and `ConcurrentModificationException` have `null` messages. Code that logs only `e.getMessage()` prints `null` for them, which Common Mistakes shows.",
          ],
        },
        {
          type: "heading",
          text: "IndexOutOfBounds has several faces",
        },
        {
          type: "paragraph",
          text: "Arrays, strings and lists each throw their own flavour, with different messages. These are lines from a Try It Yourself exercise, run on JDK 21:",
        },
        {
          type: "output",
          text: `java.lang.ArrayIndexOutOfBoundsException: Index 2 out of bounds for length 2
java.lang.StringIndexOutOfBoundsException: Index 5 out of bounds for length 3
java.lang.StringIndexOutOfBoundsException: Range [5, 3) out of bounds for length 3
java.lang.IndexOutOfBoundsException: Index: 2 Size: 2
java.lang.IndexOutOfBoundsException: Index 2 out of bounds for length 2`,
        },
        {
          type: "paragraph",
          text: "In order: `a[2]` on an `int[2]`, `\"abc\".charAt(5)`, `\"abc\".substring(5)`, `List.of(1, 2).get(2)` and `new ArrayList<>(List.of(1, 2)).get(2)`. The two lists give different messages because `List.of` and `ArrayList` are different classes with their own bounds checks. All five are `IndexOutOfBoundsException`s, so one `catch` of the parent handles them all.",
        },
      ],
    },
    {
      title: "The Errors Worth Knowing",
      blocks: [
        {
          type: "paragraph",
          text: "Errors get less attention because code rarely throws or catches them, but four of them come up constantly in production logs and interviews.",
        },
        {
          type: "heading",
          text: "StackOverflowError and OutOfMemoryError",
        },
        {
          type: "paragraph",
          text: "Both are `VirtualMachineError`s, and the Stack vs Heap lesson has the runnable demo for each: `StackOverflowError` when one thread's stack has no room for another frame (usually runaway recursion, and its trace is the same lines repeated up to the 1,024-frame cap), and `OutOfMemoryError: Java heap space` when the shared heap can't satisfy an allocation even after a full GC. The point for this lesson is what they have in common: they can be thrown from almost any line, because almost any line calls a method or allocates.",
        },
        {
          type: "heading",
          text: "NoClassDefFoundError vs ClassNotFoundException",
        },
        {
          type: "paragraph",
          text: "The Class Loading lesson explains the loading machinery behind these two. Here's the short version, with one program that produces both. `Library` asks for a class by name, and also uses `Book` directly:",
        },
        {
          type: "code",
          language: "java",
          title: "Book.java",
          code: `public class Book {
    private final String title;

    public Book(String title) {
        this.title = title;
    }

    public String title() {
        return title;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Library.java",
          code: `public class Library {
    public static void main(String[] args) {
        try {
            Class.forName("Magazine");                    // a name in a string
        } catch (ClassNotFoundException e) {
            System.out.println("forName: " + e);
        }

        Book book = new Book("Dune");                     // a compiled reference
        System.out.println("borrowed " + book.title());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Library.java Book.java
java Library; echo "exit $?"
rm Book.class                    # the class existed at compile time, not now
java Library; echo "exit $?"`,
        },
        {
          type: "output",
          text: `forName: java.lang.ClassNotFoundException: Magazine
borrowed Dune
exit 0
forName: java.lang.ClassNotFoundException: Magazine
Exception in thread "main" java.lang.NoClassDefFoundError: Book
\tat Library.main(Library.java:9)
Caused by: java.lang.ClassNotFoundException: Book
\tat java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
\tat java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:188)
\tat java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:526)
\t... 1 more
exit 1`,
        },
        {
          type: "table",
          headers: ["", "ClassNotFoundException", "NoClassDefFoundError"],
          rows: [
            ["Branch", "Checked `Exception` (via `ReflectiveOperationException`)", "`Error` (via `LinkageError`)"],
            ["Thrown when", "Code asks for a class **by name** at run time: `Class.forName`, `ClassLoader.loadClass`", "The JVM resolves a reference **compiled into** the bytecode and the class can't be found or initialized"],
            ["In my run", "`Magazine` never existed, in both runs", "`Book` existed when `Library` was compiled, then I deleted it"],
            ["Typical cause", "A wrong name in config, a JDBC driver JAR missing", "A JAR on the compile classpath but not the runtime one, or a class whose static initializer failed earlier"],
          ],
        },
        {
          type: "paragraph",
          text: "The `Caused by: ClassNotFoundException: Book` line shows how they connect: the JVM resolved the `new Book` reference by asking the class loader, the loader threw `ClassNotFoundException`, and the JVM wrapped it in the `Error`. Note the `exit 1`: the uncaught `NoClassDefFoundError` ended `main`.",
        },
        {
          type: "heading",
          text: "ExceptionInInitializerError",
        },
        {
          type: "paragraph",
          text: "When a static initializer throws, the JVM wraps the exception in `ExceptionInInitializerError` (unless it's already an `Error`) and marks the class as erroneous. The first use gets that error, with the real exception as its cause; every later use gets `NoClassDefFoundError: Could not initialize class X`, because `<clinit>` is never retried. The Static Keyword lesson has the runnable demo (`PoisonedClass`) and the initialization steps behind it, including JDK 21 recording the original failure as the later error's cause. What matters here is the branch: both are `Error`s, so a `catch (Exception e)` doesn't see them, which Common Mistakes shows with `SafetyNet`.",
        },
        {
          type: "heading",
          text: "Why Errors shouldn't be caught",
        },
        {
          type: "list",
          items: [
            "**They can happen anywhere.** An `OutOfMemoryError` can come from any allocation, in any thread, including the middle of updating a shared map. After catching one, there's no telling what state the rest of the program was left in.",
            "**The cause is usually outside the code that sees them.** The thread that hit the OOM is often not the one leaking. A `NoClassDefFoundError` is a deployment problem. Catching them in business code fixes nothing.",
            "**Recovery often needs the resource that ran out.** Logging an OOM needs memory; handling a `StackOverflowError` needs stack. The Stack vs Heap lesson nulled a big list before printing for exactly that reason.",
            "**The right response is to let it fail and restart cleanly.** For an OOM, that means `-XX:+HeapDumpOnOutOfMemoryError` to capture the evidence and `-XX:+ExitOnOutOfMemoryError` (or `CrashOnOutOfMemoryError`) so a supervisor such as Kubernetes restarts the process instead of leaving a half-broken JVM running.",
          ],
        },
        {
          type: "paragraph",
          text: "The narrow exceptions are top-level code: a thread's outermost loop, a framework's request dispatcher or a test runner may catch `Throwable` to log it and report a failure, as long as it doesn't pretend nothing happened. That's also why `catch (Exception e)` is the usual \"catch everything\" in application code: it deliberately lets `Error`s through, as Common Mistakes shows.",
        },
      ],
    },
    {
      title: "What an Exception Object Carries",
      blocks: [
        {
          type: "paragraph",
          text: "To see all four parts at once, I wrapped an `IOException` in an `IllegalStateException`, added a suppressed exception by hand, and read everything back:",
        },
        {
          type: "code",
          language: "java",
          title: "ExceptionAnatomy.java",
          code: `import java.io.IOException;

public class ExceptionAnatomy {
    static void save(String bookId) throws IOException {
        throw new IOException("disk full while saving " + bookId);
    }

    public static void main(String[] args) {
        try {
            try {
                save("B-101");
            } catch (IOException e) {
                IllegalStateException wrapper = new IllegalStateException("could not save book", e);
                wrapper.addSuppressed(new IOException("cleanup also failed"));
                throw wrapper;
            }
        } catch (IllegalStateException e) {
            System.out.println("toString()   : " + e);
            System.out.println("getMessage() : " + e.getMessage());
            System.out.println("getCause()   : " + e.getCause());
            System.out.println("suppressed   : " + e.getSuppressed().length + " -> " + e.getSuppressed()[0].getMessage());

            StackTraceElement top = e.getStackTrace()[0];
            System.out.println("top frame    : class=" + top.getClassName() + " method=" + top.getMethodName()
                    + " file=" + top.getFileName() + " line=" + top.getLineNumber());
            System.out.println();
            e.printStackTrace(System.out);
        }
        System.out.println();
        System.out.println("no message   : " + new IllegalStateException().getMessage());
        System.out.println("cause only   : " + new IllegalStateException(new IOException("io")).getMessage());
    }
}`,
        },
        {
          type: "output",
          text: `toString()   : java.lang.IllegalStateException: could not save book
getMessage() : could not save book
getCause()   : java.io.IOException: disk full while saving B-101
suppressed   : 1 -> cleanup also failed
top frame    : class=ExceptionAnatomy method=main file=ExceptionAnatomy.java line=13

java.lang.IllegalStateException: could not save book
\tat ExceptionAnatomy.main(ExceptionAnatomy.java:13)
\tSuppressed: java.io.IOException: cleanup also failed
\t\tat ExceptionAnatomy.main(ExceptionAnatomy.java:14)
Caused by: java.io.IOException: disk full while saving B-101
\tat ExceptionAnatomy.save(ExceptionAnatomy.java:5)
\tat ExceptionAnatomy.main(ExceptionAnatomy.java:11)

no message   : null
cause only   : java.io.IOException: io`,
        },
        {
          type: "list",
          items: [
            "`toString()` is the class name, then `: ` and the message if there is one. That's the first line of every printed trace, and it's what string concatenation uses.",
            "The wrapper's trace starts at line 13, where `new IllegalStateException` ran, consistent with StackAtNew. The suppressed exception's trace starts at line 14, where it was created.",
            "Each `StackTraceElement` is data: class, method, file and line, plus the module name for JDK classes. Tools and loggers read these instead of parsing text.",
            "`printStackTrace` prints the exception, its suppressed exceptions indented with `Suppressed:`, then each cause with `Caused by:`. Suppressed exceptions are normally added by try-with-resources when `close()` fails too; that lesson covers them properly.",
            "With no message, `getMessage()` is `null`. With only a cause, it's the cause's `toString()`.",
          ],
        },
        {
          type: "heading",
          text: "Reading a Caused by chain",
        },
        {
          type: "paragraph",
          text: "The Methods lesson covered the basics of reading a trace: top frame first, each line below is a caller. Chains add one rule. In the Examples section, `OrderImport` wraps a `NumberFormatException` twice, and its uncaught trace looks like this:",
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.IllegalStateException: order import failed
\tat OrderImport.importOrder(OrderImport.java:22)
\tat OrderImport.main(OrderImport.java:29)
Caused by: java.lang.IllegalArgumentException: line 3: bad quantity in "ink,2x"
\tat OrderImport.parseLine(OrderImport.java:11)
\tat OrderImport.importOrder(OrderImport.java:19)
\t... 1 more
Caused by: java.lang.NumberFormatException: For input string: "2x"
\tat java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
\tat java.base/java.lang.Integer.parseInt(Integer.java:662)
\tat java.base/java.lang.Integer.parseInt(Integer.java:778)
\tat OrderImport.parseLine(OrderImport.java:9)
\t... 2 more`,
        },
        {
          type: "list",
          items: [
            "The first block is the **outermost** exception, the last one thrown. Each `Caused by:` goes one level deeper, so the **root cause is the last `Caused by:`**. That's where I start reading.",
            "`... 1 more` means \"the remaining frames are identical to the ones of the exception above\". The `IllegalArgumentException`'s full trace ends in `main` at line 29, which is already printed above, so it isn't repeated.",
            "Each level adds context the lower one didn't have. `NumberFormatException` knows the text `2x`; `parseLine` knows it was line 3 and the whole line; `importOrder` knows the import as a whole failed. Wrapping with a cause keeps all three. Wrapping without passing the cause would have thrown away the bottom two.",
          ],
        },
      ],
    },
    {
      title: "What Happens to an Uncaught Exception",
      blocks: [
        {
          type: "paragraph",
          text: "An exception that no frame catches doesn't crash the JVM. It ends the **thread** it was thrown in. To see the difference between a worker thread and `main`, I made both fail the same way:",
        },
        {
          type: "code",
          language: "java",
          title: "Uncaught.java",
          code: `public class Uncaught {
    static void processOrder(String quantity) {
        int units = Integer.parseInt(quantity);
        System.out.println("processed " + units + " units");
    }

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> processOrder("two"), "worker-1");
        worker.start();
        worker.join();
        System.out.println("main: worker-1 is " + worker.getState() + ", main carries on");

        Thread reporter = new Thread(() -> {
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                return;
            }
            System.out.println("reporter: still running after main died");
        }, "reporter");
        reporter.start();

        processOrder("3");
        processOrder("");                       // main's own uncaught exception
        System.out.println("never printed");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Uncaught 2>&1; echo "exit code: $?"`,
        },
        {
          type: "output",
          text: `Exception in thread "worker-1" java.lang.NumberFormatException: For input string: "two"
\tat java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
\tat java.base/java.lang.Integer.parseInt(Integer.java:662)
\tat java.base/java.lang.Integer.parseInt(Integer.java:778)
\tat Uncaught.processOrder(Uncaught.java:3)
\tat Uncaught.lambda$main$0(Uncaught.java:8)
\tat java.base/java.lang.Thread.run(Thread.java:1583)
main: worker-1 is TERMINATED, main carries on
processed 3 units
Exception in thread "main" java.lang.NumberFormatException: For input string: ""
\tat java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
\tat java.base/java.lang.Integer.parseInt(Integer.java:672)
\tat java.base/java.lang.Integer.parseInt(Integer.java:778)
\tat Uncaught.processOrder(Uncaught.java:3)
\tat Uncaught.main(Uncaught.java:24)
reporter: still running after main died
exit code: 1`,
        },
        {
          type: "list",
          items: [
            "**The worker thread died, and only it.** Its trace went to standard error, its state became `TERMINATED`, and `main` carried on as if nothing had happened. Nothing told `main` the work wasn't done; `join()` returned normally.",
            "**The printing is done by Java code, not the JVM.** When the last frame of a thread is popped without a handler, the JVM calls `Thread.dispatchUncaughtException`, which hands the exception to the thread's `UncaughtExceptionHandler`. If none was set, that's the thread's `ThreadGroup`, whose `uncaughtException` method uses `Thread.getDefaultUncaughtExceptionHandler()` if there is one, and otherwise prints `Exception in thread \"name\" ` followed by `printStackTrace` to `System.err`. The `Exception in thread` line is literally a `System.err.print`.",
            "**Main is just another thread.** Its exception was printed the same way, and `never printed` never was.",
            "**The JVM didn't exit when main died.** `reporter` was a non-daemon thread, and the JVM waits for all of them, so its line printed 300 ms later. Only then did the process end.",
            "**Exit code 1.** The `java` launcher remembers that `main` ended with an exception and returns `1`, even though another thread finished normally afterwards. Had only `worker-1` failed, the exit code would have been `0`; a Try It Yourself exercise checks that.",
          ],
        },
        {
          type: "image",
          src: "/images/java/exceptions-basics-throw-path.svg",
          alt: "Diagram of the thread stack for checkout(\"three\") in Unwinding.java, top first: three JDK frames inside Integer.parseInt that create the NumberFormatException and throw it, then parse, addItem and checkout, each with no handler and popped, then main, whose catch matches. On the right: step 1, new calls fillInStackTrace and records 7 frames; step 2, athrow searches each frame's exception table; then two outcomes: a match jumps to the handler and the thread carries on, or no frame matches, the thread ends, dispatchUncaughtException hands it to the handler or ThreadGroup which prints Exception in thread, and for the main thread the exit code is 1 while other threads keep running.",
          caption: "One exception's life, from new to either a handler or the uncaught-exception path.",
        },
        {
          type: "paragraph",
          text: "Setting a handler is how a service gets uncaught exceptions into its real log instead of a console nobody reads: `Thread.setDefaultUncaughtExceptionHandler` for every thread, or `setUncaughtExceptionHandler` on one. Thread pools change the picture again (an `ExecutorService` that runs a task with `submit` stores the exception in the `Future` and prints nothing). The Exception Handling Best Practices lesson covers both; the production section below shows what a dead worker thread looks like from the outside.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `processOrder(\"\")` from `Uncaught`, the call that ended `main`, from source to exit code:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time, the call.** `Integer.parseInt(quantity)` compiles to `invokestatic`. `parseInt` declares `throws NumberFormatException`, but that's unchecked, so `javac` requires nothing from `processOrder`. `main` declares `throws InterruptedException` only because of `worker.join()`.",
            "**Compile time, the tables.** Neither `processOrder` nor `main` has a `try` around this call, so neither has an exception table entry covering it.",
            "**Run time, the call.** `main` pushes `\"\"` and calls `processOrder`, which calls `Integer.parseInt(String)`, which calls `parseInt(String, int)` with radix 10. Four frames of ours and the JDK's are on the stack.",
            "**The failure is detected.** `parseInt` sees an empty string and calls `NumberFormatException.forInputString(\"\", 10)`, which executes `new NumberFormatException(...)`: allocation, then the constructor chain up to `Throwable`.",
            "**The trace is captured.** `Throwable`'s constructor calls `fillInStackTrace()`, and the JVM walks the stack: `forInputString`, `parseInt`, `parseInt`, `processOrder`, `main`. Five frames, recorded as a compact backtrace. Nothing has been thrown yet.",
            "**athrow.** `forInputString` returns the object, and `parseInt` throws it with `athrow`. The JVM checks `parseInt`'s exception table for an entry covering the current instruction whose type matches. None does.",
            "**Unwinding.** The JVM pops `parseInt(String, int)`, then `parseInt(String)`, then `processOrder`, then `main`, repeating the table check in each at the instruction that made the call. No frame matches. The line `never printed` is never reached.",
            "**The launcher records failure.** `main` has no frames left, so control returns to the `java` launcher's native code, which called `main` through JNI, with the exception still pending. The launcher sets the exit status to `1`.",
            "**The uncaught path.** As the launcher detaches the main thread from the JVM, the exception goes down the path every thread uses: `Thread.dispatchUncaughtException`, then the thread's `ThreadGroup`, which finds no default handler and prints `Exception in thread \"main\" ` plus the trace to `System.err`. Only now are the five frames turned into `StackTraceElement`s and formatted.",
            "**Shutdown waits.** The JVM waits for the remaining non-daemon thread, `reporter`, which prints its line. Then the process exits with status `1`.",
          ],
        },
        {
          type: "paragraph",
          text: "Had `main` wrapped the call in `try { ... } catch (NumberFormatException e)`, step 7 would have stopped at `main`: its exception table would have had an entry for that range, and execution would have jumped to the handler, as in the `Unwinding` example.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ExceptionSyntax.java",
          code: `import java.io.IOException;

public class ExceptionSyntax {
    // A checked exception: extends Exception, so callers must catch or declare it
    static class CourseFullException extends Exception {
        CourseFullException(String message) {
            super(message);
        }
    }

    // An unchecked exception: extends RuntimeException, no rule for callers
    static class EnrollmentException extends RuntimeException {
        EnrollmentException(String message, Throwable cause) {
            super(message, cause);                          // keeps the original as the cause
        }
    }

    static int seatsLeft = 1;

    // throws: part of the method's contract
    static void enroll(String student) throws CourseFullException {
        if (student == null || student.isBlank()) {
            throw new IllegalArgumentException("student name is required");   // unchecked
        }
        if (seatsLeft == 0) {
            throw new CourseFullException("no seat for " + student);          // checked
        }
        seatsLeft--;
        System.out.println(student + " enrolled");
    }

    static void enrollOrFail(String student) {
        try {
            enroll(student);
        } catch (CourseFullException e) {
            throw new EnrollmentException("enrollment failed", e);           // translate and chain
        }
    }

    // main may declare checked exceptions too
    public static void main(String[] args) throws IOException {
        enrollOrFail("Asha");
        try {
            enrollOrFail("Ravi");
        } catch (EnrollmentException e) {
            System.out.println(e.getMessage() + " <- " + e.getCause().getMessage());
        }
        try {
            enrollOrFail(" ");
        } catch (IllegalArgumentException e) {
            System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage());
        }
        throw new IOException("disk not mounted");                         // uncaught, ends main
    }
}`,
        },
        {
          type: "output",
          text: `Asha enrolled
enrollment failed <- no seat for Ravi
IllegalArgumentException: student name is required
Exception in thread "main" java.io.IOException: disk not mounted
\tat ExceptionSyntax.main(ExceptionSyntax.java:53)`,
        },
        {
          type: "list",
          items: [
            "Whether an exception class is checked is decided only by what it extends: `CourseFullException extends Exception` is checked, `EnrollmentException extends RuntimeException` isn't.",
            "`enroll` must declare `throws CourseFullException`; it doesn't have to declare the `IllegalArgumentException`, and doesn't.",
            "`enrollOrFail` catches the checked exception and throws an unchecked one with the original as its cause, so it needs no `throws` and callers can still find out why. The throw, throws and Custom Exceptions lesson goes deep on this translation pattern.",
            "The `IllegalArgumentException` for `\" \"` passed straight through `enrollOrFail`, whose `catch` only matches `CourseFullException`.",
            "`main` declares `throws IOException`, so the final `throw` compiles, and the uncaught exception ended the program with exit status 1.",
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Guard clauses: IllegalArgumentException vs IllegalStateException",
        },
        {
          type: "paragraph",
          text: "The two exceptions I throw most often by hand mean different things. `IllegalArgumentException` says \"you passed a bad value\"; `IllegalStateException` says \"the value is fine, but this object can't do that right now\". A bank account shows both, plus `Objects.requireNonNull` for the `null` case:",
        },
        {
          type: "code",
          language: "java",
          title: "GuardClauses.java",
          code: `import java.util.Objects;

public class GuardClauses {
    static class BankAccount {
        private final String owner;
        private long balance;
        private boolean frozen;

        BankAccount(String owner, long openingBalance) {
            this.owner = Objects.requireNonNull(owner, "owner");
            if (openingBalance < 0) {
                throw new IllegalArgumentException("opening balance must be >= 0, was " + openingBalance);
            }
            this.balance = openingBalance;
        }

        void freeze() {
            frozen = true;
        }

        void withdraw(long amount) {
            if (amount <= 0) {
                throw new IllegalArgumentException("amount must be positive, was " + amount);   // bad input
            }
            if (frozen) {
                throw new IllegalStateException("account of " + owner + " is frozen");        // bad timing
            }
            if (amount > balance) {
                throw new IllegalStateException("insufficient funds: balance " + balance + ", asked " + amount);
            }
            balance -= amount;
        }
    }

    static void attempt(String label, Runnable action) {
        try {
            action.run();
            System.out.println(label + " ok");
        } catch (RuntimeException e) {
            System.out.println(label + " " + e);
        }
    }

    public static void main(String[] args) {
        attempt("new(null)    ", () -> new BankAccount(null, 100));
        attempt("new(-5)      ", () -> new BankAccount("Asha", -5));

        BankAccount account = new BankAccount("Asha", 1_000);
        attempt("withdraw(0)  ", () -> account.withdraw(0));
        attempt("withdraw(300)", () -> account.withdraw(300));
        attempt("withdraw(900)", () -> account.withdraw(900));
        account.freeze();
        attempt("withdraw(100)", () -> account.withdraw(100));
        System.out.println("balance: " + account.balance);
    }
}`,
        },
        {
          type: "output",
          text: `new(null)     java.lang.NullPointerException: owner
new(-5)       java.lang.IllegalArgumentException: opening balance must be >= 0, was -5
withdraw(0)   java.lang.IllegalArgumentException: amount must be positive, was 0
withdraw(300) ok
withdraw(900) java.lang.IllegalStateException: insufficient funds: balance 700, asked 900
withdraw(100) java.lang.IllegalStateException: account of Asha is frozen
balance: 700`,
        },
        {
          type: "list",
          items: [
            "Every failed call left the account exactly as it was: the checks come first, the state change last. The final balance is `1000 - 300`.",
            "`Objects.requireNonNull(owner, \"owner\")` throws an NPE whose message is the name I gave it. The convention for `null` arguments in the JDK is `NullPointerException`, not `IllegalArgumentException`.",
            "Insufficient funds is an `IllegalStateException` here because the argument is valid on its own; it's the account's current balance that rules it out. Many codebases model it as a custom checked or unchecked exception instead, which is the throw, throws and Custom Exceptions lesson's territory.",
            "The messages include the bad value. `amount must be positive, was 0` can be acted on from a log line; `invalid amount` can't.",
          ],
        },
        {
          type: "heading",
          text: "Wrapping with a cause",
        },
        {
          type: "paragraph",
          text: "This is the program behind the `Caused by:` chain in What an Exception Object Carries. Each layer adds what it knows and passes the lower exception on as the cause:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderImport.java",
          code: `import java.util.List;

public class OrderImport {
    record OrderItem(String product, int quantity) { }

    static OrderItem parseLine(int lineNo, String line) {
        String[] parts = line.split(",");
        try {
            return new OrderItem(parts[0], Integer.parseInt(parts[1]));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("line " + lineNo + ": bad quantity in \\"" + line + "\\"", e);
        }
    }

    static int importOrder(List<String> lines) {
        int total = 0;
        try {
            for (int i = 0; i < lines.size(); i++) {
                total += parseLine(i + 1, lines.get(i)).quantity();
            }
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("order import failed", e);
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(importOrder(List.of("pen,2", "pad,5")));
        importOrder(List.of("pen,2", "pad,5", "ink,2x"));
    }
}`,
        },
        {
          type: "output",
          text: `7
Exception in thread "main" java.lang.IllegalStateException: order import failed
\tat OrderImport.importOrder(OrderImport.java:22)
\tat OrderImport.main(OrderImport.java:29)
Caused by: java.lang.IllegalArgumentException: line 3: bad quantity in "ink,2x"
\tat OrderImport.parseLine(OrderImport.java:11)
\tat OrderImport.importOrder(OrderImport.java:19)
\t... 1 more
Caused by: java.lang.NumberFormatException: For input string: "2x"
\tat java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
\tat java.base/java.lang.Integer.parseInt(Integer.java:662)
\tat java.base/java.lang.Integer.parseInt(Integer.java:778)
\tat OrderImport.parseLine(OrderImport.java:9)
\t... 2 more`,
        },
        {
          type: "paragraph",
          text: "The first order printed `7`. The second failed with three exceptions, each with its own trace, each starting where it was created: lines 22, 11 and 9. Notice `catch (IllegalArgumentException e)` in `importOrder` would also have caught a bare `NumberFormatException`, since it's a subclass. A line like `\"ink\"` with no comma would have escaped both handlers as an `ArrayIndexOutOfBoundsException` from `parts[1]`, which is the kind of gap the When to Throw section's \"validate at the boundary\" rule closes.",
        },
        {
          type: "heading",
          text: "Failing fast moves the stack trace to the real culprit",
        },
        {
          type: "paragraph",
          text: "An NPE is thrown where a null is **used**, which can be far from where it got in. Checking at the point of entry changes where the trace points:",
        },
        {
          type: "code",
          language: "java",
          title: "FailFast.java",
          code: `import java.util.Objects;

public class FailFast {
    static class Department {
        final String name;
        Department(String name) { this.name = name; }
    }

    static class LazyEmployee {
        final String name;
        final Department department;

        LazyEmployee(String name, Department department) {
            this.name = name;
            this.department = department;                 // accepts null silently
        }
    }

    static class StrictEmployee {
        final String name;
        final Department department;

        StrictEmployee(String name, Department department) {
            this.name = name;
            this.department = Objects.requireNonNull(department, "department of " + name);
        }
    }

    static String badgeText(LazyEmployee e) {
        return e.name + " / " + e.department.name.toUpperCase();
    }

    static LazyEmployee hireLazy(String name, Department d) {
        return new LazyEmployee(name, d);
    }

    static StrictEmployee hireStrict(String name, Department d) {
        return new StrictEmployee(name, d);
    }

    public static void main(String[] args) {
        Department unknown = null;                        // a lookup that found nothing

        LazyEmployee ravi = hireLazy("Ravi", unknown);
        System.out.println("hired " + ravi.name);
        try {
            System.out.println(badgeText(ravi));          // much later, somewhere else
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
            System.out.println("  thrown in " + e.getStackTrace()[0].getMethodName());
        }

        try {
            hireStrict("Ravi", unknown);
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
            for (StackTraceElement frame : e.getStackTrace()) {
                System.out.println("  at " + frame.getMethodName());
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `hired Ravi
Cannot read field "name" because "<parameter1>.department" is null
  thrown in badgeText
department of Ravi
  at requireNonNull
  at <init>
  at hireStrict
  at main`,
        },
        {
          type: "list",
          items: [
            "The lazy version hired Ravi without complaint, and the NPE surfaced in `badgeText`, which has nothing to do with hiring. `hireLazy` isn't in that trace at all; its frame was long gone.",
            "The strict version failed inside the constructor, and the trace names `hireStrict` and `main`: the code that actually passed the null. In a real service, that's the difference between a trace pointing at the badge printer and one pointing at the HR import that sent no department.",
            "`<init>` is the constructor's name in stack traces and bytecode.",
          ],
        },
        {
          type: "heading",
          text: "Watching frames unwind",
        },
        {
          type: "paragraph",
          text: "Three methods that print on the way in and on the way out, called once with good input and once with bad:",
        },
        {
          type: "code",
          language: "java",
          title: "Unwinding.java",
          code: `public class Unwinding {
    static int checkout(String quantity) {
        System.out.println("  checkout: start");
        int total = addItem(quantity) * 20;
        System.out.println("  checkout: end");            // skipped when addItem throws
        return total;
    }

    static int addItem(String quantity) {
        System.out.println("    addItem: start");
        int units = parse(quantity);
        System.out.println("    addItem: end");           // skipped when parse throws
        return units;
    }

    static int parse(String quantity) {
        System.out.println("      parse: " + quantity);
        return Integer.parseInt(quantity);                // may throw here
    }

    public static void main(String[] args) {
        System.out.println("total " + checkout("3"));
        try {
            System.out.println("total " + checkout("three"));
        } catch (NumberFormatException e) {
            System.out.println("main caught: " + e.getMessage());
            System.out.println("frames in the trace: " + e.getStackTrace().length);
        }
    }
}`,
        },
        {
          type: "output",
          text: `  checkout: start
    addItem: start
      parse: 3
    addItem: end
  checkout: end
total 60
  checkout: start
    addItem: start
      parse: three
main caught: For input string: "three"
frames in the trace: 7`,
        },
        {
          type: "diagram",
          text: `checkout("three")                     stack while unwinding
                                       ┌──────────────────────┐
 forInputString  new NFE, trace taken  │ 3 JDK frames         │ pop
 parseInt (x2)   athrow                ├──────────────────────┤
                                       │ parse                │ pop
                                       ├──────────────────────┤
 "addItem: end"  skipped               │ addItem              │ pop
                                       ├──────────────────────┤
 "checkout: end" skipped               │ checkout             │ pop
                                       ├──────────────────────┤
 table row 16-32 NumberFormatException │ main  ◄ handler      │ runs
                                       └──────────────────────┘`,
          caption: "No frame between the throw and the handler gets to finish. The handler's frame continues at the catch block.",
        },
        {
          type: "paragraph",
          text: "With `\"three\"`, neither `addItem: end` nor `checkout: end` printed: the exception took both methods off the stack mid-statement. The seven frames are the three JDK frames, `parse`, `addItem`, `checkout` and `main`. The `16 32 35 NumberFormatException` row of `main`'s exception table, shown in Internal Working, is what caught it. Any cleanup those skipped lines were meant to do needs `finally` or try-with-resources, the next two lessons.",
        },
      ],
    },
    {
      title: "When to Throw an Exception (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "The capstone lesson, When to Use What in Java OOP, used exceptions in two ways: `IllegalArgumentException` from a value object's constructor for a bad value, and `UnsupportedOperationException` as the warning sign of a subclass that isn't really an is-a. This is the fuller version I apply when deciding whether a failure should be an exception at all, and of which kind. The Exception Handling Best Practices lesson goes further on the catching side.",
        },
        {
          type: "table",
          headers: ["Situation", "What I use", "Example"],
          rows: [
            ["A caller passed a value the method can't accept", "`IllegalArgumentException`; `NullPointerException` via `Objects.requireNonNull` for nulls", "`withdraw(0)`, `new Circle(-1)`"],
            ["The call is valid, but not in the object's current state", "`IllegalStateException`", "Withdrawing from a frozen account, borrowing a book that's already out"],
            ["The operation isn't supported by this implementation", "`UnsupportedOperationException`", "`add` on an immutable list"],
            ["A failure outside the program the immediate caller can act on", "A checked exception, or an unchecked one if the codebase's convention is unchecked", "File missing, remote call refused, thread interrupted"],
            ["\"Not found\" is a normal, frequent answer", "`Optional` or an empty collection, not an exception", "`findBook(isbn)` for a book the library doesn't own"],
            ["Many independent validation failures to report at once", "Return a list of errors, then throw one exception carrying them if needed", "A form with five bad fields"],
            ["Ordinary control flow: ending a loop, choosing a branch", "Never an exception", "Catching `ArrayIndexOutOfBoundsException` to stop iterating"],
            ["The JVM or environment is broken", "Don't throw or catch `Error`s; let it fail", "`OutOfMemoryError`"],
          ],
        },
        {
          type: "diagram",
          text: `Something went wrong. Is it an exception?
│
├─ expected, frequent, part of the normal answer?
│    yes ─► return it: Optional, empty list, a result value
│
├─ the caller broke the contract (bad argument, null)?
│    yes ─► IllegalArgumentException / NullPointerException
│           thrown early, with the bad value in the message
│
├─ right argument, wrong moment for this object?
│    yes ─► IllegalStateException
│
├─ outside the program (I/O, network, interrupt) and the
│  caller can do something about it?
│    yes ─► checked exception, or unchecked by team convention,
│           always with the original as the cause
│
└─ the JVM itself (memory, stack, missing class)?
     yes ─► Error: don't catch it; log, dump, restart`,
          caption: "Exceptions are for broken contracts and real failures, not for answers the caller expects.",
        },
        {
          type: "list",
          items: [
            "Prefer the JDK's standard exceptions when one fits. `IllegalArgumentException`, `IllegalStateException`, `NullPointerException`, `UnsupportedOperationException`, `IndexOutOfBoundsException` and `NoSuchElementException` cover most precondition failures, and every Java developer knows what they mean.",
            "Throw early, at the boundary where the bad value enters. `FailFast` showed the trace pointing at the real culprit only when the check was in the constructor.",
            "An exception type is part of the API. Callers write `catch` blocks against it, so changing which exception a public method throws is a breaking change even when the compiler doesn't notice.",
            "If a caller has to catch an exception to do something ordinary, the API is wrong. That's the test I use for \"exceptions as control flow\".",
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice",
        },
        {
          type: "paragraph",
          text: "A library lookup. In the wrong version, \"the library doesn't own this book\" is an exception, and the caller uses `try`/`catch` as an `if`. In the right version, absence is part of the return type, and the exception is kept for the genuinely broken case of borrowing a book someone else already has:",
        },
        {
          type: "code",
          language: "java",
          title: "WhenToThrow.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

public class WhenToThrow {
    record Book(String isbn, String title) { }

    static class Library {
        private final Map<String, Book> shelf = new HashMap<>();
        private final Map<String, String> borrowedBy = new HashMap<>();

        void add(Book book) {
            shelf.put(book.isbn(), book);
        }

        // Wrong for this job: "not on the shelf" is an everyday answer, not a failure
        Book findOrThrow(String isbn) {
            Book book = shelf.get(isbn);
            if (book == null) {
                throw new NoSuchElementException("no book " + isbn);
            }
            return book;
        }

        // Right: absence is part of the return type
        Optional<Book> find(String isbn) {
            return Optional.ofNullable(shelf.get(isbn));
        }

        // Right: borrowing a book that is already out is a broken assumption
        void borrow(String isbn, String member) {
            Book book = find(isbn).orElseThrow(() -> new NoSuchElementException("no book " + isbn));
            String holder = borrowedBy.putIfAbsent(isbn, member);
            if (holder != null) {
                throw new IllegalStateException(book.title() + " is already borrowed by " + holder);
            }
        }
    }

    public static void main(String[] args) {
        Library library = new Library();
        library.add(new Book("978-0441013593", "Dune"));

        int misses = 0;
        long start = System.nanoTime();
        for (int i = 0; i < 100_000; i++) {
            try {
                library.findOrThrow("isbn-" + i);
            } catch (NoSuchElementException e) {
                misses++;                                   // exception as an if-statement
            }
        }
        long exceptionMs = (System.nanoTime() - start) / 1_000_000;

        start = System.nanoTime();
        for (int i = 0; i < 100_000; i++) {
            if (library.find("isbn-" + i).isEmpty()) {
                misses++;
            }
        }
        long optionalMs = (System.nanoTime() - start) / 1_000_000;
        System.out.println(misses + " misses; exceptions " + exceptionMs + " ms, Optional " + optionalMs + " ms");

        library.borrow("978-0441013593", "Asha");
        try {
            library.borrow("978-0441013593", "Ravi");
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java WhenToThrow        # three runs; timings are from my machine",
        },
        {
          type: "output",
          text: `200000 misses; exceptions 191 ms, Optional 13 ms
Dune is already borrowed by Asha
200000 misses; exceptions 195 ms, Optional 18 ms
Dune is already borrowed by Asha
200000 misses; exceptions 222 ms, Optional 13 ms
Dune is already borrowed by Asha`,
        },
        {
          type: "list",
          items: [
            "**Wrong:** 100,000 misses through exceptions took around 200 ms, about 2 microseconds each, for creating an exception, walking the stack and building a message that nobody read. The `Optional` loop did the same lookups in about 15 ms. The numbers are rough and machine-dependent; a gap of more than ten times is the part that held across runs.",
            "**Wrong, beyond speed:** the `catch` in the loop would also swallow a `NoSuchElementException` thrown for some other reason inside `findOrThrow`, hiding a real bug.",
            "**Right:** `find` returns `Optional<Book>`, so \"not found\" is visible in the signature and can't be ignored by accident. `borrow` still throws, through `orElseThrow`, because borrowing a book the library doesn't have, or one that's already out, means the caller's assumption was wrong.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Creating an exception and forgetting to throw it",
        },
        {
          type: "code",
          language: "java",
          title: "ForgotThrow.java",
          code: `public class ForgotThrow {
    static class BankAccount {
        private long balance = 1_000;

        void withdraw(long amount) {
            if (amount > balance) {
                new IllegalStateException("insufficient funds");   // created, never thrown
            }
            balance -= amount;
        }
    }

    public static void main(String[] args) {
        BankAccount account = new BankAccount();
        account.withdraw(5_000);
        System.out.println("balance: " + account.balance);
    }
}`,
        },
        {
          type: "output",
          text: `balance: -4000`,
        },
        {
          type: "paragraph",
          text: "It compiles without a warning, even with `-Xlint:all`, because creating an object as a statement is legal. The exception object was built, its stack trace was walked, and then it became garbage. Static analysis tools flag it (Error Prone calls it `DeadException`, and IntelliJ IDEA has an inspection for a throwable that isn't thrown), and a unit test for the failure case catches it immediately.",
        },
        {
          type: "heading",
          text: "Expecting catch (Exception e) to catch everything",
        },
        {
          type: "code",
          language: "java",
          title: "SafetyNet.java",
          code: `public class SafetyNet {
    static class Discounts {
        static final int PERCENT = Integer.parseInt("ten");
    }

    public static void main(String[] args) {
        try {
            System.out.println(Discounts.PERCENT);
        } catch (Exception e) {                          // "catches everything"
            System.out.println("handled: " + e);
        }
        System.out.println("after the try");
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.ExceptionInInitializerError
\tat SafetyNet.main(SafetyNet.java:8)
Caused by: java.lang.NumberFormatException: For input string: "ten"
\tat java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
\tat java.base/java.lang.Integer.parseInt(Integer.java:662)
\tat java.base/java.lang.Integer.parseInt(Integer.java:778)
\tat SafetyNet$Discounts.<clinit>(SafetyNet.java:3)
\t... 1 more`,
        },
        {
          type: "paragraph",
          text: "The root problem is a `NumberFormatException`, an `Exception`. But it was thrown inside the static initializer (`<clinit>` in the trace), and the JVM wrapped it in `ExceptionInInitializerError`, which is an `Error`. `catch (Exception e)` didn't match, `after the try` never printed, and `main` died. Usually letting `Error`s through is exactly right; the mistake is believing the handler covers them.",
        },
        {
          type: "heading",
          text: "Logging only getMessage()",
        },
        {
          type: "code",
          language: "java",
          title: "MessageOnly.java",
          code: `import java.util.List;

public class MessageOnly {
    public static void main(String[] args) {
        List<String> tags = List.of("new", "sale");
        try {
            tags.add("clearance");
        } catch (RuntimeException e) {
            System.out.println("Failed: " + e.getMessage());    // what the log line said
            System.out.println("Failed: " + e);                  // what it should have said
        }
    }
}`,
        },
        {
          type: "output",
          text: `Failed: null
Failed: java.lang.UnsupportedOperationException`,
        },
        {
          type: "paragraph",
          text: "Plenty of exceptions have no message, and the type is often the most important fact. `e.toString()` includes it. In real code, the exception goes to the logger as the last argument (`log.error(\"Failed to tag product {}\", id, e)`), so the type, message, trace and causes all get printed.",
        },
        {
          type: "heading",
          text: "Expecting floating-point division by zero to throw",
        },
        {
          type: "code",
          language: "java",
          title: "DivideByZero.java",
          code: `public class DivideByZero {
    static void show(String label, Runnable r) {
        try {
            r.run();
        } catch (ArithmeticException e) {
            System.out.println(label + " -> " + e);
        }
    }

    public static void main(String[] args) {
        int zero = 0;
        double dzero = 0.0;
        System.out.println("10.0 / 0  = " + (10.0 / dzero));
        System.out.println("-10.0 / 0 = " + (-10.0 / dzero));
        System.out.println("0.0 / 0   = " + (0.0 / dzero));
        System.out.println("10.0 % 0  = " + (10.0 % dzero));
        System.out.println("(int) NaN = " + (int) (0.0 / dzero));
        show("10 / 0   ", () -> System.out.println(10 / zero));
        show("10L % 0  ", () -> System.out.println(10L % zero));
    }
}`,
        },
        {
          type: "output",
          text: `10.0 / 0  = Infinity
-10.0 / 0 = -Infinity
0.0 / 0   = NaN
10.0 % 0  = NaN
(int) NaN = 0
10 / 0    -> java.lang.ArithmeticException: / by zero
10L % 0   -> java.lang.ArithmeticException: / by zero`,
        },
        {
          type: "paragraph",
          text: "Only integer `/` and `%` throw. `double` and `float` follow IEEE 754 and produce `Infinity` or `NaN` silently, and casting `NaN` to `int` quietly gives `0`, as the Type Casting lesson showed. An average computed over an empty list in `double` arithmetic doesn't fail; it becomes `NaN` and spreads into everything it touches. Code that must reject that checks `Double.isFinite` explicitly.",
        },
        {
          type: "heading",
          text: "Throwing a variable that can be null",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowNull.java",
          code: `public class ThrowNull {
    public static void main(String[] args) {
        RuntimeException pending = null;
        try {
            throw pending;
        } catch (NullPointerException e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `java.lang.NullPointerException: Cannot throw exception because "<local1>" is null`,
        },
        {
          type: "paragraph",
          text: "`athrow` on a null reference throws a `NullPointerException` instead, so the intended exception and its message are lost. It shows up in code that stores \"the first error\" in a variable and throws it at the end without checking that one was ever stored.",
        },
        {
          type: "heading",
          text: "Mixing up the two class-not-found failures",
        },
        {
          type: "paragraph",
          text: "`ClassNotFoundException` comes from a lookup by name and is checked; `NoClassDefFoundError` comes from a compiled reference that can't be satisfied now and is an `Error`. Searching for the wrong one sends the investigation in the wrong direction: a `NoClassDefFoundError: Could not initialize class X` isn't about the classpath at all, it's about X's static initializer failing earlier.",
        },
        {
          type: "heading",
          text: "Catching an exception just to make the compiler quiet",
        },
        {
          type: "code",
          language: "java",
          code: `try {
    Thread.sleep(100);
} catch (InterruptedException e) {
    // ignore
}`,
        },
        {
          type: "paragraph",
          text: "The compile error from Unreported goes away, and so does the information. For `InterruptedException` it's worse than silence: `sleep` clears the thread's interrupt flag when it throws, so once the exception is swallowed, nothing records that someone asked this thread to stop. If the method can't declare it, the minimum is `Thread.currentThread().interrupt();` in the `catch`. The Exception Handling Best Practices lesson treats swallowing in general.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use exceptions for failures, not for expected answers. \"Not found\", \"no more items\" and \"invalid form\" are usually return values.",
            "Pick the most specific standard exception that fits: `IllegalArgumentException` for bad arguments, `IllegalStateException` for bad timing, `NullPointerException` (through `Objects.requireNonNull`) for nulls, `UnsupportedOperationException` for operations that don't exist here.",
            "Validate at the boundary, early. Checking arguments at the top of a public method or constructor puts the stack trace on the caller that broke the contract, as `FailFast` showed.",
            "Write messages for the person reading the log at 3 a.m.: what was being done, and the offending value. `amount must be positive, was 0` beats `invalid amount`.",
            "When translating an exception, always pass the original as the cause. A wrapper without a cause throws away the root of the `Caused by:` chain.",
            "Log the exception object, not its message. `e.getMessage()` can be `null`; the type and the trace are usually what matter.",
            "Don't catch `Error`s, or `Throwable`, in business code. Top-level code (a thread's main loop, a framework's dispatcher) is the exception, and even there the job is to log and report, not to carry on as normal.",
            "Give long-lived threads a way to report death: an `UncaughtExceptionHandler`, or a loop that catches per-task failures, as the production fix does. A thread that dies with only `System.err` as a witness is a silent outage.",
            "Keep `-XX:+HeapDumpOnOutOfMemoryError` and `-XX:+ExitOnOutOfMemoryError` on in production, so an `Error` leaves evidence and a clean restart instead of a crippled JVM.",
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
            "**A `try` costs nothing when nothing is thrown.** There's no instruction that enters a `try`; handlers are rows in the method's exception table, consulted only when something is thrown. Wrapping a hot loop body in `try` doesn't slow it down by itself.",
            "**Creating an exception is the expensive part, and it scales with stack depth.** On my machine (JDK 21, numbers noisy): about 0.9 to 1.2 microseconds at 10 frames, 7 to 9 microseconds at 200 frames, and about 0.2 microseconds when the stack trace was turned off, the cost of the recursion itself.",
            "**Reading or printing the trace costs more than capturing it.** `getStackTrace()` added 25 microseconds or more at 200 frames, because it builds a `StackTraceElement` per frame from the compact backtrace. A logger formatting and writing a 150-line trace adds string building and I/O on top.",
            "**The throw and the catch are cheap by comparison.** Once the exception exists, unwinding is a table lookup per frame.",
            "**Exceptions as control flow are measurably slow.** `WhenToThrow`'s 100,000 lookup misses took around 200 ms through exceptions and about 15 ms through `Optional`, on my machine.",
            "**The JVM caps and trims the cost.** `MaxJavaStackTraceDepth` (1024 on JDK 21) limits every trace, which is why a `StackOverflowError` trace stops at 1,024 lines. `OmitStackTraceInFastThrow` replaces hot implicit exceptions with a preallocated, trace-less one. Helpful NPE messages are only computed when `getMessage()` is called.",
            "**Trace-less exceptions are a deliberate trade.** The protected constructor with `writableStackTrace = false`, or overriding `fillInStackTrace()` to return `this`, makes creation nearly free, and makes the exception almost useless for debugging. That's reasonable for a high-frequency, fully expected signal and wrong for anything someone will need to investigate. The Exception Handling Best Practices lesson covers preallocated exceptions properly.",
          ],
        },
      ],
    },
    {
      title: "Exceptions in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The exception bug I'd most expect in a backend isn't a crash. It's a background thread that dies quietly while everything else keeps answering. Here's a ride-hailing fare endpoint built that way: the HTTP layer parses the JSON body with Jackson into a `FareRequest` and hands it to a single worker thread through a queue. The worker computes the fare in paise (a base of 5,000 plus a per-km rate for the city) and completes a `CompletableFuture` the endpoint is waiting on, with a 300 ms timeout. The distance arrives as a string, because a mobile client sends it that way.",
        },
        {
          type: "paragraph",
          text: "I ran it with real Jackson 2.21.7 (Maven `com.fasterxml.jackson.core:jackson-databind:2.21.7`, which brings `jackson-core` and `jackson-annotations`). `$JACKSON` below is the classpath of those three JARs. The program runs four requests through the broken service, then the same four through the fixed one:",
        },
        {
          type: "code",
          language: "java",
          title: "FareWorker.java",
          code: `import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import com.fasterxml.jackson.databind.ObjectMapper;

public class FareWorker {
    record FareRequest(String rideId, String city, String distanceKm) { }

    record Job(FareRequest request, double km, CompletableFuture<Long> result) { }

    static final Map<String, Integer> PAISE_PER_KM = Map.of("BLR", 1_200, "CCU", 1_000);
    static final ObjectMapper JSON = new ObjectMapper();

    // Deep in the pricing code: base fare plus a per-km rate for the city
    static long fareInPaise(String city, double km) {
        int perKm = PAISE_PER_KM.get(city);                 // unboxing: NPE for an unknown city
        return 5_000 + Math.round(km * perKm);
    }

    // BEFORE: the endpoint hands the raw string to the worker, and the worker loop has no handler
    static class FareServiceBefore {
        final BlockingQueue<Job> queue = new LinkedBlockingQueue<>();
        final Thread worker = new Thread(this::work, "fare-worker-1");

        FareServiceBefore() {
            worker.setDaemon(true);
            worker.start();
        }

        void work() {
            while (true) {
                Job job;
                try {
                    job = queue.take();
                } catch (InterruptedException e) {
                    return;
                }
                double km = Double.parseDouble(job.request().distanceKm());   // throws on "12.5 km"
                job.result().complete(fareInPaise(job.request().city(), km));
            }
        }

        String quote(String body) throws Exception {
            FareRequest request = JSON.readValue(body, FareRequest.class);
            CompletableFuture<Long> result = new CompletableFuture<>();
            queue.put(new Job(request, Double.NaN, result));          // km is parsed later, by the worker
            try {
                return "200 " + request.rideId() + " fare " + result.get(300, TimeUnit.MILLISECONDS) + " paise";
            } catch (TimeoutException e) {
                return "504 " + request.rideId() + " timed out";
            }
        }
    }

    // AFTER: validate at the boundary, and the worker survives any single bad job
    static class FareServiceAfter {
        final BlockingQueue<Job> queue = new LinkedBlockingQueue<>();
        final Thread worker = new Thread(this::work, "fare-worker-2");

        FareServiceAfter() {
            worker.setDaemon(true);
            worker.start();
        }

        void work() {
            while (true) {
                Job job;
                try {
                    job = queue.take();
                } catch (InterruptedException e) {
                    return;
                }
                try {
                    job.result().complete(fareInPaise(job.request().city(), job.km()));
                } catch (RuntimeException e) {
                    job.result().completeExceptionally(e);   // the caller gets it, the loop goes on
                }
            }
        }

        static double parseKm(String raw) {
            if (raw == null) {
                throw new IllegalArgumentException("distanceKm is required");
            }
            double km;
            try {
                km = Double.parseDouble(raw);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("distanceKm must be a number of km, got \\"" + raw + "\\"", e);
            }
            if (!(km > 0 && km <= 500)) {                  // also rejects NaN and Infinity
                throw new IllegalArgumentException("distanceKm must be in (0, 500], got " + raw);
            }
            return km;
        }

        String quote(String body) throws Exception {
            FareRequest request = JSON.readValue(body, FareRequest.class);
            double km;
            try {
                km = parseKm(request.distanceKm());
            } catch (IllegalArgumentException e) {
                return "400 " + request.rideId() + " " + e.getMessage();
            }
            CompletableFuture<Long> result = new CompletableFuture<>();
            queue.put(new Job(request, km, result));
            try {
                return "200 " + request.rideId() + " fare " + result.get(300, TimeUnit.MILLISECONDS) + " paise";
            } catch (ExecutionException e) {
                System.out.println("  log: fare failed for " + request.rideId() + ": " + e.getCause());
                return "500 " + request.rideId() + " could not price this ride";
            } catch (TimeoutException e) {
                return "504 " + request.rideId() + " timed out";
            }
        }
    }

    static final String[] REQUESTS = {
        "{\\"rideId\\":\\"r-1\\",\\"city\\":\\"BLR\\",\\"distanceKm\\":\\"12.5\\"}",
        "{\\"rideId\\":\\"r-2\\",\\"city\\":\\"BLR\\",\\"distanceKm\\":\\"12.5 km\\"}",
        "{\\"rideId\\":\\"r-3\\",\\"city\\":\\"PNQ\\",\\"distanceKm\\":\\"4\\"}",
        "{\\"rideId\\":\\"r-4\\",\\"city\\":\\"CCU\\",\\"distanceKm\\":\\"7\\"}",
    };

    public static void main(String[] args) throws Exception {
        FareServiceBefore before = new FareServiceBefore();
        System.out.println("BEFORE");
        for (String body : REQUESTS) {
            System.out.println(before.quote(body));
        }
        System.out.println("worker alive: " + before.worker.isAlive() + ", jobs stuck in queue: " + before.queue.size());

        FareServiceAfter after = new FareServiceAfter();
        System.out.println("AFTER");
        for (String body : REQUESTS) {
            System.out.println(after.quote(body));
        }
        System.out.println("worker alive: " + after.worker.isAlive() + ", jobs stuck in queue: " + after.queue.size());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$JACKSON" FareWorker.java
java -cp "$JACKSON:." FareWorker 2>&1`,
        },
        {
          type: "output",
          text: `BEFORE
200 r-1 fare 20000 paise
Exception in thread "fare-worker-1" java.lang.NumberFormatException: For input string: "12.5 km"
\tat java.base/jdk.internal.math.FloatingDecimal.readJavaFormatString(FloatingDecimal.java:2054)
\tat java.base/jdk.internal.math.FloatingDecimal.parseDouble(FloatingDecimal.java:110)
\tat java.base/java.lang.Double.parseDouble(Double.java:792)
\tat FareWorker$FareServiceBefore.work(FareWorker.java:43)
\tat java.base/java.lang.Thread.run(Thread.java:1583)
504 r-2 timed out
504 r-3 timed out
504 r-4 timed out
worker alive: false, jobs stuck in queue: 2
AFTER
200 r-1 fare 20000 paise
400 r-2 distanceKm must be a number of km, got "12.5 km"
  log: fare failed for r-3: java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
500 r-3 could not price this ride
200 r-4 fare 12000 paise
worker alive: true, jobs stuck in queue: 0`,
        },
        {
          type: "list",
          items: [
            "**One bad request killed the worker.** `\"12.5 km\"` reached `Double.parseDouble` inside the worker's loop, the `NumberFormatException` had no handler in any frame of that thread, and `fare-worker-1` ended. The only evidence was the `Exception in thread` block, written by the default `ThreadGroup` handler to `System.err`, not to the application's logger.",
            "**Every request after it failed too, with a misleading symptom.** r-3 and r-4 were perfectly good rides as far as the endpoint knew, and each waited 300 ms for a future nobody would ever complete. Their jobs were still in the queue at the end (`jobs stuck in queue: 2`). From outside it looks like a slow pricing dependency, not a dead thread, and the process itself stays up, so a liveness check that only asks \"is the JVM answering?\" passes.",
            "**Without the timeout it would have been worse.** A plain `result.get()` blocks forever, and each request thread that called it would be stuck for good too.",
            "**r-3 was a second time bomb.** Its city, `PNQ`, has no rate in the map, so `fareInPaise` unboxes a `null` `Integer`: the NPE in the AFTER log. In the BEFORE service it never ran, but it would have killed the worker just the same.",
            "**Fix 1, validate at the boundary.** `parseKm` turns the raw string into a `double` or an `IllegalArgumentException` whose message names the field and the bad value, keeping the `NumberFormatException` as its cause. The endpoint maps that to a 400 for the one client that sent it, and the job never reaches the worker. The range check `!(km > 0 && km <= 500)` also rejects `\"NaN\"` and `\"Infinity\"`, which `Double.parseDouble` happily accepts.",
            "**Fix 2, the worker survives any single job.** The loop catches `RuntimeException` around each job and completes that job's future exceptionally, so the failure goes to the one caller that caused it (r-3 got a 500 and a log line with the full cause) and the loop takes the next job. r-4 was priced, the worker was still alive, and the queue was empty.",
            "**Why `RuntimeException` and not `Throwable`.** A bad ride is the worker's problem to contain; an `OutOfMemoryError` isn't. Letting `Error`s through still ends the thread, which is why a real service also sets an `UncaughtExceptionHandler` that logs through the application logger and raises an alert, covered in the Exception Handling Best Practices lesson.",
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
              question: "What is an exception in Java?",
              answer:
                "An object, an instance of `Throwable` or a subclass, that describes something that went wrong, combined with a transfer of control: when it's thrown, the current method stops and the JVM looks up the call stack for a matching `catch`. If none matches, the thread ends and the exception is printed.\n\nIt's a real heap object. `javap` showed `throw new IllegalArgumentException(...)` compiling to the same `new`, `dup`, `invokespecial <init>` as any object creation, followed by `athrow`.",
            },
            {
              question: "What is the difference between Error and Exception?",
              answer:
                "Both extend `Throwable`. `Error` means the JVM or its environment failed, like `OutOfMemoryError`, `StackOverflowError` or `NoClassDefFoundError`, and applications normally shouldn't catch it. `Exception` covers problems a program might reasonably handle, from `IOException` to `IllegalArgumentException`.\n\nMy reflection program printed the chains: `StackOverflowError -> VirtualMachineError -> Error -> Throwable` and `FileNotFoundException -> IOException -> Exception -> Throwable`. Errors are also unchecked, so the compiler never asks for them to be caught or declared.",
            },
            {
              question: "What is the difference between checked and unchecked exceptions? Give examples.",
              answer:
                "A checked exception must be caught or declared with `throws` by any method that can throw it; the compiler enforces that (JLS 11.2). Examples: `IOException`, `FileNotFoundException`, `InterruptedException`, `ClassNotFoundException`. Unchecked exceptions, `RuntimeException`, `Error` and their subclasses, have no such rule: `NullPointerException`, `IllegalArgumentException`, `ArithmeticException`.\n\nWhen I called `new FileReader(path)` and `Thread.sleep(100)` without handling them, `javac` failed with `unreported exception FileNotFoundException; must be caught or declared to be thrown`, and the same for `InterruptedException`. Nothing comparable happens for `Integer.parseInt`, which throws the unchecked `NumberFormatException`.",
            },
            {
              question: "Is RuntimeException checked or unchecked?",
              answer:
                "Unchecked, along with all its subclasses. It's the one branch under `Exception` that's exempt from the catch-or-declare rule.\n\nIt's an easy trick question because `RuntimeException` extends `Exception`, which is checked. The JLS rule is a list of exemptions, `RuntimeException` and `Error` and their subclasses, and everything else that's a `Throwable` is checked, including `Exception` and `Throwable` themselves.",
            },
            {
              question: "What is the difference between throw and throws?",
              answer:
                "`throw` is a statement that throws one exception object right now: `throw new IllegalStateException(\"frozen\")`. `throws` is part of a method header that declares which checked exceptions the method may let escape: `void enroll(String s) throws CourseFullException`.\n\nIn the class file they're completely different things. `throw` compiles to the `athrow` instruction. `throws` is only an `Exceptions` attribute on the method, which `javap -v` printed as `throws java.io.FileNotFoundException`, and the JVM doesn't enforce it.",
            },
            {
              question: "Name some common unchecked exceptions and what causes them.",
              answer:
                "`NullPointerException` (using a null reference), `ArithmeticException` (integer division by zero), `ArrayIndexOutOfBoundsException` (index outside `0..length-1`), `ClassCastException` (a cast the object's class doesn't allow), `NumberFormatException` (parsing text that isn't a number), `IllegalArgumentException`, `IllegalStateException`, `UnsupportedOperationException` (like `add` on `List.of`) and `ConcurrentModificationException` (changing a collection while iterating it).\n\nI triggered each one in `Triggers` and got the real messages, for example `Index 3 out of bounds for length 3` and `For input string: \"12km\"`. `NumberFormatException` is a subclass of `IllegalArgumentException`, so catching the parent catches both.",
            },
            {
              question: "Can main declare throws Exception? What happens if it throws?",
              answer:
                "Yes. `main` is an ordinary method as far as the compiler is concerned, so `public static void main(String[] args) throws Exception` is legal. If an exception escapes it, it's handled like any uncaught exception: the trace is printed to standard error as `Exception in thread \"main\" ...`, and the `java` launcher exits with status 1.\n\nMy `ExceptionSyntax` program declared `throws IOException` and ended with an uncaught `IOException: disk not mounted`. In `Uncaught`, `echo $?` printed `1`, and a non-daemon thread still finished its work before the JVM exited.",
            },
            {
              question: "What information does an exception object carry?",
              answer:
                "Four things: a detail message (`getMessage()`, may be `null`), a cause (`getCause()`, another `Throwable`), a stack trace (`getStackTrace()`, an array of `StackTraceElement`s with class, method, file and line), and suppressed exceptions (`getSuppressed()`, added by try-with-resources).\n\nMy `ExceptionAnatomy` program printed all four: the message, the wrapped `IOException` as cause, one suppressed exception, and a top frame of `ExceptionAnatomy.main` at line 13.",
            },
            {
              question: "What's the root class of everything that can be thrown?",
              answer:
                "`java.lang.Throwable`. `throw` only accepts an expression of type `Throwable` or a subclass, and `catch` parameters must be one too. Its two direct standard subclasses are `Error` and `Exception`.\n\nIt's an ordinary class extending `Object`; every chain my reflection program printed ended in `Throwable -> Object`. Throwing `null` is allowed by the compiler but throws a `NullPointerException` instead, which I saw as `Cannot throw exception because \"<local1>\" is null`.",
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
              question: "Why shouldn't you catch Error?",
              answer:
                "Because errors signal that the JVM or its environment is in trouble, they can happen at almost any line, and the code that sees them usually can't fix the cause. After an `OutOfMemoryError`, another thread may have been halfway through updating shared state, and handling it may itself need the memory that ran out.\n\nThe right response is to let it fail: heap dump, exit, restart. `catch (Exception e)` deliberately doesn't catch them; in my `SafetyNet` program an `ExceptionInInitializerError` went straight past it and ended `main`. Top-level code may catch `Throwable` to log and report, but not to carry on as if nothing happened.",
            },
            {
              question: "What is the difference between NoClassDefFoundError and ClassNotFoundException?",
              answer:
                "`ClassNotFoundException` is a checked exception thrown when code asks for a class by name at run time, through `Class.forName` or `ClassLoader.loadClass`, and no loader has it. `NoClassDefFoundError` is an `Error` thrown when the JVM resolves a class reference compiled into bytecode and the class can't be loaded now, or failed to initialize earlier.\n\nI compiled `Library` against `Book`, deleted `Book.class` and ran it: `Class.forName(\"Magazine\")` gave `ClassNotFoundException`, and `new Book(...)` gave `NoClassDefFoundError: Book` with `Caused by: ClassNotFoundException: Book`. The second one means \"it was there at compile time\", which points at the runtime classpath.",
            },
            {
              question: "What happens to an uncaught exception?",
              answer:
                "It unwinds every frame of its thread, then the JVM calls `Thread.dispatchUncaughtException`, which passes it to the thread's handler, or its `ThreadGroup`, which uses the default handler if one is set and otherwise prints `Exception in thread \"name\"` and the trace to `System.err`. The thread then ends. Other threads aren't affected.\n\nIn `Uncaught`, `worker-1` died with a `NumberFormatException` and `main` carried on, seeing it only as `TERMINATED`. When `main` itself died, a non-daemon thread still finished, and the process exited with code 1.",
            },
            {
              question: "How do you read a stack trace with Caused by sections, and what does \"... 2 more\" mean?",
              answer:
                "The first block is the outermost exception, the last one thrown. Each `Caused by:` goes one level deeper, so the root cause is the last `Caused by:`, and that's where I start. Within each block, the top frame is where that exception was created.\n\n`... 2 more` means the remaining frames are the same as the bottom frames of the enclosing exception's trace, so they're not repeated. In `OrderImport`, the `NumberFormatException` block ended with `parseLine` line 9 and `... 2 more`, the `importOrder` and `main` frames already printed above.",
            },
            {
              question: "When would you throw IllegalArgumentException versus IllegalStateException?",
              answer:
                "`IllegalArgumentException` when the argument itself is invalid, whatever state the object is in: a negative amount, an empty name. `IllegalStateException` when the arguments are fine but the object isn't in a state where the operation makes sense: withdrawing from a frozen account, or calling an iterator's `remove()` before `next()`.\n\nMy `GuardClauses` account threw `amount must be positive, was 0` as an `IllegalArgumentException` and `account of Asha is frozen` as an `IllegalStateException`. For a `null` argument the JDK's convention is a `NullPointerException` from `Objects.requireNonNull`.",
            },
            {
              question: "Is it a compile error to catch a checked exception that the try block never throws?",
              answer:
                "Yes, unless the type is `Exception`, `Throwable` or an unchecked exception. JLS 11.2.3 makes a `catch` of a checked exception an error when the `try` block can't throw it, because the handler would be dead code.\n\nMy `NeverThrown` program caught `IOException` around a `println` and got `exception IOException is never thrown in body of corresponding try statement`. In `Declared`, `catch (Exception e)` and `catch (RuntimeException e)` around the same kind of code compiled fine.",
            },
            {
              question: "What are helpful NullPointerException messages?",
              answer:
                "Since JDK 15 (JEP 358, introduced in 14), an NPE thrown by the JVM says what action failed and which expression was null, such as `Cannot read field \"city\" because \"order.customer.address\" is null`. The JVM works this out from the failing method's bytecode, lazily, when `getMessage()` is first called.\n\nWithout `-g`, names come out as `<parameter1>` or `<local2>`; with `-g` they're real names. An NPE created with `new NullPointerException()` gets no message, and `-XX:-ShowCodeDetailsInExceptionMessages` turns the feature off. I saw all of those in `HelpfulNpe`.",
            },
            {
              question: "Why can a ConcurrentModificationException happen in a single-threaded program?",
              answer:
                "Because it's about an iterator noticing that its collection changed underneath it, not about threads. `ArrayList`'s iterator remembers the list's modification count, and `next()` throws if the count has changed by any means other than the iterator's own `remove`.\n\nIn `Triggers`, removing `pen` inside a for-each loop over the same list threw it on the following `next()`. It's best-effort: removing the second-to-last element ends the loop without the check. `removeIf` or `Iterator.remove()` are the safe ways.",
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
              question: "How is an exception thrown at the bytecode level, and which exceptions does the JVM throw without athrow?",
              answer:
                "An explicit `throw` compiles to whatever builds the object (`new`, `dup`, arguments, `invokespecial <init>`) followed by `athrow`, which pops the reference and starts the search for a handler. Implicit exceptions come from instructions whose own specification includes failure: `idiv` and `irem` throw `ArithmeticException`, array loads and stores throw `NullPointerException` and `ArrayIndexOutOfBoundsException`, `invokevirtual` and `getfield` throw `NullPointerException`, `checkcast` throws `ClassCastException`.\n\nIn `ThrowSite`, `divide`, `third`, `length` and `asText` had no `athrow` at all, only `idiv`, `iaload`, `invokevirtual` and `checkcast`. In compiled code HotSpot often detects nulls without a test, by letting the access fault and converting the signal into an NPE.",
            },
            {
              question: "Does the JVM enforce checked exceptions?",
              answer:
                "No. Checked exceptions are purely a compile-time rule of the Java language. The `throws` clause is stored as an `Exceptions` attribute, which isn't part of the method descriptor, and JVMS 4.7.5 says the requirement is enforced only by the compiler.\n\n`javap -v` showed `Exceptions: throws java.io.FileNotFoundException` next to a descriptor of `(Ljava/lang/String;)Ljava/io/FileReader;` with no mention of it. At run time, handlers match on class alone. That's why other JVM languages like Kotlin have no checked exceptions, and why Java code can be tricked into throwing an undeclared checked exception.",
            },
            {
              question: "When is a stack trace captured, and why does that matter?",
              answer:
                "When the exception object is constructed. Every public `Throwable` constructor calls `fillInStackTrace()`, which asks the JVM to walk the current thread's stack. Throwing doesn't touch it.\n\nMy `StackAtNew` program created an exception in `prepare()` and threw it from `fire()`: the override printed `fillInStackTrace() called` before `fire` ran, and the top frame was `prepare` at line 22. So an exception created in one place and thrown in another, or cached and rethrown, reports where it was made, not where it was thrown.",
            },
            {
              question: "Why are exceptions considered expensive, and what exactly costs?",
              answer:
                "Mostly the stack trace. `fillInStackTrace` walks every frame, so creation cost grows with depth, and turning the result into `StackTraceElement`s for printing or `getStackTrace()` costs several times more. The `throw` and the handler lookup are comparatively cheap, and a `try` costs nothing when nothing is thrown.\n\nMy rough numbers on JDK 21: about 1 microsecond at 10 frames, 7 to 9 at 200 frames, about 0.2 with the stack trace disabled, and 25 or more on top at 200 frames to build the elements. In `WhenToThrow`, 100,000 misses through exceptions took around 200 ms against 15 ms with `Optional`.",
            },
            {
              question: "What is OmitStackTraceInFastThrow?",
              answer:
                "A HotSpot optimization, on by default: when C2 sees an implicit exception (NPE, `ArithmeticException`, `ArrayIndexOutOfBoundsException`, `ClassCastException`, `ArrayStoreException`) being thrown repeatedly from the same hot spot, it recompiles that code to throw a single preallocated exception with no message and no stack trace.\n\nIn `FastThrow`, the NPEs had a helpful message and two frames until somewhere after call 5,000, then `message null, frames: 0`, the same object every time. It didn't happen with `-XX:TieredStopAtLevel=1` or `-Xint`, and `-XX:-OmitStackTraceInFastThrow` turned it off. Explicit `throw` statements are never affected.",
            },
            {
              question: "How does the JVM find the handler for a thrown exception?",
              answer:
                "Each method has an exception table of `from`, `to`, `target` and `type` rows. On a throw, the JVM scans the current method's table for a row whose range covers the current instruction and whose type is the exception's class or a superclass. If it finds one, it clears the operand stack, pushes the exception and jumps to `target`. If not, it pops the frame and repeats in the caller, at the call instruction.\n\n`Unwinding`'s `main` had one row, `16 32 35 Class java/lang/NumberFormatException`. With `\"three\"`, `parse`, `addItem` and `checkout` were popped mid-statement, and their `end` lines never printed. The table compares classes only; checked or unchecked is invisible at that level.",
            },
            {
              question: "What does the writableStackTrace constructor flag do, and when would you use it?",
              answer:
                "It's the last parameter of the protected `Throwable(String, Throwable, boolean enableSuppression, boolean writableStackTrace)` constructor, added in Java 7. With `false`, the constructor skips `fillInStackTrace()` entirely and later calls to it are no-ops, so the exception has an empty stack trace and costs almost nothing to create.\n\nMy `QuietException` had zero frames and printed only its first line; at 200 frames deep, creating one took about 0.2 microseconds against 7 or more for a normal one. I'd use it only for very frequent, fully expected signals where nobody will ever need the trace; for anything that might need debugging, the trace is worth the cost.",
            },
            {
              question: "Why does a helpful NPE message sometimes say <local2> or <parameter1> instead of a name?",
              answer:
                "Because the message is rebuilt from bytecode, and names only exist in the class file if it was compiled with debug information. Without `javac -g` there's no `LocalVariableTable`, so the JVM can only say which slot held the null: `<parameter1>` for a parameter, `<localN>` for local slot N. Fields, methods and array accesses are always named, because those names are in the constant pool.\n\n`HelpfulNpe` printed `\"<parameter1>.customer.address\"` without `-g` and `\"order.customer.address\"` with it. Maven and Gradle compile with debug info by default, so production traces usually have real names.",
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
              question: "The logs show thousands of java.lang.NullPointerException lines with no message and no stack trace. What's going on, and how do you find the cause?",
              answer:
                "Almost certainly `OmitStackTraceInFastThrow`. The same implicit NPE was thrown often enough that C2 recompiled the method to throw a preallocated exception without a trace or a helpful message. The bug is real; only the evidence was optimized away.\n\nFirst I'd search backwards in the logs for the earliest occurrences, which were thrown before the recompilation and still have full traces and messages; in `FastThrow` the first five thousand or so were complete. If those have rotated away, I'd restart with `-XX:-OmitStackTraceInFastThrow`, reproduce, and read the full trace.",
            },
            {
              question: "A background worker in a service stops processing jobs, but the service is up and health checks pass. What do you suspect?",
              answer:
                "That the worker thread died from an uncaught exception. One bad job threw something nothing in the thread caught, the default handler printed it to standard error, and the thread ended, while the rest of the JVM carried on. Requests that depend on it time out, which looks like a slow dependency.\n\nThat's the fare worker in the production section: a `\"12.5 km\"` distance made `Double.parseDouble` throw inside `fare-worker-1`, and the next requests all returned 504 with their jobs stuck in the queue. I'd look for an `Exception in thread \"...\"` line in stderr, take a thread dump to confirm the worker is gone, then fix it on both sides: validate input at the boundary, and catch per-job failures in the loop so one job can't kill it.",
            },
            {
              question: "The application works locally but fails in production with ClassNotFoundException. How do you investigate?",
              answer:
                "It means something asked for a class by name and the production class loader couldn't find it, so the runtime classpath differs from the local one. Typical causes: a dependency with `provided` or `test` scope, a JDBC driver or plug-in named in configuration but not packaged, a class name typo in a property file, or a different packaging (fat JAR, container image) that left a JAR out.\n\nThe trace says which class and which loader asked. I'd compare `mvn dependency:tree` with what's actually in the artifact (`jar tf`), and run with `-Xlog:class+load` (or `-verbose:class`) to see where classes are coming from. If it's a `NoClassDefFoundError` instead, my `Library` demo applies: it was there at compile time, so it's the runtime classpath, or a static initializer that failed earlier.",
            },
            {
              question: "A report generator returns wrong totals now and then, but never logs an error. The lookup it uses returns -1 for unknown items. What would you change?",
              answer:
                "The sentinel. A `-1` that the caller forgets to check silently becomes part of the arithmetic. I'd make absence impossible to ignore: return `Optional<Integer>` (or `OptionalInt`) if \"unknown\" is a normal case the caller should handle, or throw a `NoSuchElementException` with the item's name if an unknown item is a data error.\n\n`SentinelVsException` showed both: the `-1` version printed a total of `124` for an order with an unpriced stapler, and the exception version stopped with `no price for product \"stapler\"` and the line number. A quiet wrong total is the most expensive kind of bug, because nobody is looking for it.",
            },
            {
              question: "After a deployment, every request fails with NoClassDefFoundError: Could not initialize class PricingRules. The class is definitely in the JAR. Why?",
              answer:
                "Because the class was found, but its static initialization failed once, and the JVM marks such a class as unusable for the rest of its life. The first use threw `ExceptionInInitializerError` with the real cause; every use after that gets this `NoClassDefFoundError`, whose message doesn't mention the cause.\n\nI'd search the log for the first `ExceptionInInitializerError` after startup, or look at this error's `getCause()`, which on JDK 21 records the original failure, as the Static Keyword lesson's `PoisonedClass` showed. Usually it's a static field reading configuration that's different in the new environment. The fix is in that initializer, and a restart is needed afterwards, since the class can't be retried in the same JVM.",
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
            "Change the `types` array in `Hierarchy` to `java.io.UncheckedIOException`, `java.util.NoSuchElementException`, `IllegalMonitorStateException` and `java.util.concurrent.TimeoutException`. Before running it, write down which ones you expect to be checked.",
            "Write `Load.java` with `static void load() { Thread.sleep(10); }` and a `main` that calls `load()`. Compile it. Then add `throws InterruptedException` to `load` only, and compile again.",
            "In one `main`, trigger and print (with `System.out.println(e)`) each of: `a[2] = 1` on an `int[2]`, `\"abc\".charAt(5)`, `\"abc\".substring(5)`, `List.of(1, 2).get(2)` and `new ArrayList<>(List.of(1, 2)).get(2)`.",
            "Create `Map<String, Integer> stock = new HashMap<>();` and run `int n = stock.get(\"pen\");` inside a `try`, printing `e.getMessage()`. Compile once with and once without `-g`.",
            "Run `FastThrow` with `-XX:-OmitStackTraceInFastThrow`, then with `-Xint`, then with `-XX:TieredStopAtLevel=1`.",
            "Write `ThreadExit.java`: start a thread that throws `new IllegalStateException(\"worker failed\")`, `join` it, and print `main done`. Run it and print the exit code with `echo $?`. Then add `throw new IllegalStateException(\"main failed\");` at the end of `main` and run it again.",
            "Write a `RuntimeException` subclass that overrides `fillInStackTrace()` to just `return this;`, and print `getStackTrace().length` for an instance of it and for a plain `new RuntimeException()` created in `main`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: in step 1, all four print, and only `TimeoutException` is checked (`TimeoutException -> Exception -> Throwable -> Object`); the other three go through `RuntimeException`. Step 2 first fails at `Thread.sleep(10)` with `unreported exception InterruptedException; must be caught or declared to be thrown`; after adding `throws` to `load`, the same error moves to the `load();` call in `main`. Step 3 prints the five lines in the IndexOutOfBounds output above, including `Range [5, 3) out of bounds for length 3` for `substring`. Step 4 prints `Cannot invoke \"java.lang.Integer.intValue()\" because the return value of \"java.util.Map.get(Object)\" is null` both times, because a method's return value needs no local variable name. Step 5 prints `every NPE had a stack trace` all three times. Step 6 prints the worker's trace under `Exception in thread \"Thread-0\"`, then `main done` and exit code `0`; with the extra throw, `main`'s trace and exit code `1`. Step 7 prints `0` and `1`: the plain exception created directly in `main` has exactly one frame.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `HIERARCHY  Throwable
             Error            JVM/environment, unchecked, don't catch
             Exception        checked
               RuntimeException   unchecked: bugs, preconditions

CHECKED    javac only (JLS 11.2): catch it or declare throws
           not in the descriptor, not enforced by the JVM
           catch of a never-thrown checked type: compile error

OBJECT     message  cause  stack trace  suppressed
           trace taken at new (fillInStackTrace), not at throw

BYTECODE   throw      -> new, dup, <init>, athrow
           implicit   idiv, iaload, invokevirtual, checkcast ...
           handlers   exception table: from to target type

UNCAUGHT   unwinds every frame, thread ends
           dispatchUncaughtException -> "Exception in thread"
           main: exit code 1; other threads keep running

ERRORS     NoClassDefFoundError    compiled reference, gone now
           ClassNotFoundException  lookup by name, checked
           ExceptionInInitializerError, then "Could not
           initialize class" on every later use

COST       try is free; creating is not (scales with depth)
           getStackTrace/printing costs more than capturing
           OmitStackTraceInFastThrow: hot implicit -> no trace
           -XX:-OmitStackTraceInFastThrow brings traces back`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "An exception is an ordinary object plus a jump: built with `new`, which records the stack trace, and thrown with `athrow` or implicitly by the JVM, it unwinds frames until a handler's exception table row matches, or ends the thread.",
            "Checked versus unchecked is a compiler rule and nothing more: `Error` and `RuntimeException` are exempt, everything else must be caught or declared, and the JVM treats them all the same.",
            "This lesson threw exceptions and watched where they went. The next lesson, try, catch and finally, is about catching them: multiple and multi-catch blocks, what `finally` really guarantees, and how `javac` compiles all of it into the exception table.",
          ],
        },
      ],
    },
  ],
};
