import type { Lesson } from "../types";

export const customExceptions: Lesson = {
  slug: "custom-exceptions",
  date: "2026-11-11",
  title: "throw, throws and Custom Exceptions",
  description:
    "How Java code raises and declares its own failures: throw versus throws, precise rethrow, exception chaining with causes and initCause, custom checked and unchecked exceptions with useful fields, an application exception hierarchy mapped to HTTP status, translation between layers, the sneaky-throw trick, and what the class file and the JVM actually do with a throws clause, ending with a booking service whose logs said only \"error\".",
  tags: ["Core Java", "Exceptions", "Custom Exceptions", "Exception Chaining"],
  sections: [
    {
      title: "What throw, throws and Custom Exceptions Are",
      blocks: [
        {
          type: "paragraph",
          text: "The try, catch and finally lesson was all about the receiving end: something goes wrong, and a handler further up the stack deals with it. Every exception in that lesson was thrown by someone else, the JVM for a division by zero, or a JDK method like `Integer.parseInt`. This lesson is about the other end. My own code decides that something is wrong, creates an exception object that describes it, and hands it to whoever called me.",
        },
        {
          type: "paragraph",
          text: "Three tools do that. The `throw` **statement** raises an exception right now. The `throws` **clause** is part of a method's declaration and tells callers which checked exceptions can come out of it. And a **custom exception** is my own subclass of `Exception` or `RuntimeException`, with a name and fields that say what actually went wrong in my domain, instead of a generic `RuntimeException(\"error\")`.",
        },
        {
          type: "paragraph",
          text: "The reason this matters more than the syntax suggests: an exception is the only thing that survives a failure. The frames are gone by the time anyone reads the log. What's left is the exception's type, its message, its stack trace and its chain of causes. If my code throws a vague exception and drops the cause, the information needed to fix the problem is destroyed at the exact moment it existed. The production section rebuilds that bug in a booking service and fixes it.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Declaring which exceptions a procedure can raise wasn't Java's invention. CLU, Barbara Liskov's language from the 1970s, listed a procedure's exceptions in its header with a `signals` clause, and Modula-3 had a `RAISES` clause. C++ added dynamic exception specifications, `void f() throw(A, B)`, but checked them only at run time: an exception outside the list called `std::unexpected` and normally ended the program. C++11 deprecated them in favour of `noexcept`, and C++17 removed them (only the empty `throw()` lingered, until C++20).",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (January 1996) made the list a compile-time contract. A method's `throws` clause names its **checked** exceptions, `javac` refuses a method that throws a checked exception it didn't declare, and it refuses a caller that neither catches nor declares one. Unchecked exceptions (`RuntimeException`, `Error` and their subclasses) are exempt. The Exceptions and the Exception Hierarchy lesson covers that split; here it matters because it decides when `throws` is required.",
        },
        {
          type: "paragraph",
          text: "Not every language followed. C# (2000) deliberately left checked exceptions out, and Anders Hejlsberg explained the reasoning in a 2003 Artima interview with Bill Venners and Bruce Eckel, \"The Trouble with Checked Exceptions\": versionability and scalability problems when every layer has to redeclare everything below it. Kotlin and Scala have no checked exceptions either. Java kept them, and much of this lesson, translation between layers, wrapping in `UncheckedIOException`, even sneaky throw, is a response to exactly those problems.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`throw`, `throws`, checked exceptions, `Throwable`, `Exception`, `RuntimeException`, `Error`", "The whole model in this lesson, unchanged in its core"],
            ["JDK 1.4 (2002)", "The chained exception facility: `Throwable(String, Throwable)`, `Throwable(Throwable)`, `getCause()`, `initCause()`; `getStackTrace()` and `StackTraceElement`", "\"Caused by:\" in stack traces. Older ad hoc chains like `InvocationTargetException.getTargetException()` and `ExceptionInInitializerError.getException()` were retrofitted onto `getCause()`"],
            ["Java 7 (2011)", "Project Coin (JSR 334): multi-catch and more precise rethrow; try-with-resources; `addSuppressed`; the protected four-argument `Throwable` constructor", "`catch (Exception e) { throw e; }` stops widening the declared type; exceptions can skip the stack trace"],
            ["Java 8 (2014)", "`java.io.UncheckedIOException`; lambdas", "A standard unchecked wrapper for `IOException`, needed because the `java.util.function` interfaces declare no checked exceptions"],
            ["JDK 14 and 15 (2020)", "Helpful NullPointerException messages (JEP 358), on by default from 15", "`throw null` explains itself: `Cannot throw exception because \"null\" is null`"],
            ["Java 17 (2021) and 21 (2023)", "Sealed classes (JEP 409); pattern matching for `switch` (JEP 441)", "A sealed exception hierarchy can be mapped to HTTP statuses with an exhaustive `switch`"],
            ["Java 25 (2025)", "Flexible constructor bodies (JEP 513)", "A constructor can validate its arguments and throw before calling `super(...)`"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a warehouse with incident reports.",
        },
        {
          type: "list",
          items: [
            "`throw` is a worker stopping the job and filing an incident report. Whatever they were doing is abandoned; the report goes up to whoever assigned the work.",
            "`throws` is the job description. \"This role may file a Damaged Goods report\" tells every manager who assigns work to this role what to be ready for. HR (the compiler) refuses to approve a role that files reports its description doesn't mention.",
            "A **custom exception** is a dedicated form. A Damaged Goods form has boxes for the order number, the item and the count. A sticky note that says \"problem\" is `RuntimeException(\"error\")`.",
            "**Chaining** is stapling. When the shift manager writes a summary report for head office, they staple the worker's original report behind it. Throwing the original away is losing the cause.",
            "**Translation** is the customer letter. Head office tells the customer \"your delivery is delayed\" and keeps the stapled internal reports on file. The customer never reads \"forklift battery failed in aisle 7\", the way an API client shouldn't read a `SQLException`.",
            "An **exception hierarchy** is the binder of form categories: Damage, Delay, Missing. The escalation desk routes by category without reading every form type.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down. In the warehouse, a security guard could also check job descriptions at the door. The JVM doesn't: the `throws` clause is checked by `javac` and nobody else, and a checked exception can reach a caller that never declared it. Internal Working proves that with two versions of one class. The other mismatch is timing. A real report describes the moment it's handed over; an exception's stack trace is a snapshot of the moment the object was **created**, which is usually, but not necessarily, where it's thrown.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "throw versus throws",
        },
        {
          type: "table",
          headers: ["", "`throw`", "`throws`"],
          rows: [
            ["What it is", "A statement", "A clause in a method or constructor declaration"],
            ["Where it goes", "Inside a body, anywhere a statement can go", "After the parameter list: `void load() throws IOException`"],
            ["What follows it", "One expression of a `Throwable` type: `throw new IOException(\"...\")`", "One or more exception **types**, comma-separated"],
            ["When it acts", "At run time: the JVM starts looking for a handler", "At compile time only: `javac` checks callers and the body"],
            ["Required?", "Only when the code decides to fail", "For checked exceptions that can escape; optional for unchecked ones"],
            ["In the class file", "The `athrow` instruction", "The method's `Exceptions` attribute"],
          ],
        },
        {
          type: "heading",
          text: "The rules for throw",
        },
        {
          type: "list",
          items: [
            "The expression must have a type assignable to `Throwable`. `throw \"error\";` is a compile error.",
            "If the expression evaluates to `null`, the JVM throws a `NullPointerException` instead.",
            "A `throw` completes abruptly, always. The statement after it in the same block is unreachable, and a method whose last statement is a `throw` doesn't need a `return`.",
            "If the thrown type is checked, the enclosing method or constructor has to declare it (or a supertype) in its `throws` clause, or the `throw` has to sit inside a `try` that catches it (JLS 11.2.3).",
          ],
        },
        {
          type: "heading",
          text: "The rules for throws",
        },
        {
          type: "list",
          items: [
            "Every listed type must be a `Throwable` subclass. Listing unchecked exceptions is legal and has no effect on callers; it's documentation.",
            "A caller of a method with checked exceptions in its `throws` clause must catch them or declare them itself.",
            "Constructors can have a `throws` clause. Instance initializer blocks can throw a checked exception only if every constructor declares it. Static initializers can't throw checked exceptions at all.",
            "An override may declare the same checked exceptions, subclasses of them, fewer, or none, but never a new or broader checked one. Unchecked exceptions are unrestricted. The Polymorphism lesson owns this rule; there's a short recap below.",
            "The `throws` clause isn't part of the method signature and isn't in the descriptor, so two methods can't be overloaded by `throws` alone.",
          ],
        },
        {
          type: "heading",
          text: "Anatomy of a custom exception",
        },
        {
          type: "code",
          language: "java",
          code: `public class InsufficientFundsException      // a name that says what failed
        extends Exception {                    // checked; RuntimeException for unchecked
    private static final long serialVersionUID = 1L;   // Throwable is Serializable

    private final String accountId;            // context as final fields
    private final long shortfallPaise;

    public InsufficientFundsException(String accountId, long shortfallPaise) {
        super("account " + accountId + " is short by " + shortfallPaise + " paise");
        this.accountId = accountId;
        this.shortfallPaise = shortfallPaise;
    }

    public String accountId() { return accountId; }
    public long shortfallPaise() { return shortfallPaise; }
}`,
        },
        {
          type: "table",
          headers: ["`Throwable` constructor", "Since", "What it sets"],
          rows: [
            ["`Throwable()`", "1.0", "No message, cause not yet set"],
            ["`Throwable(String message)`", "1.0", "Message, cause not yet set"],
            ["`Throwable(String message, Throwable cause)`", "1.4", "Message and cause"],
            ["`Throwable(Throwable cause)`", "1.4", "Cause, and the message becomes `cause.toString()`"],
            ["`protected Throwable(String, Throwable, boolean enableSuppression, boolean writableStackTrace)`", "1.7", "Can switch off suppressed exceptions and the stack trace"],
          ],
        },
        {
          type: "paragraph",
          text: "`Exception`, `RuntimeException` and `Error` mirror all five, which is where the convention of \"the four standard constructors\" for a custom exception comes from. A custom exception doesn't have to offer all four, only the ones that make sense for it, but it does have to pass the message and the cause up with `super(...)`, because `Throwable` is where they're stored.",
        },
        {
          type: "heading",
          text: "The chain API",
        },
        {
          type: "table",
          headers: ["Method", "What it does"],
          rows: [
            ["`getCause()`", "The exception this one wraps, or `null`"],
            ["`initCause(Throwable)`", "Sets the cause once, for exceptions created without one. A second call, or a call after a cause constructor, throws `IllegalStateException`"],
            ["`getMessage()`", "The detail message; `toString()` is the class name plus `\": \" + message` if there is one"],
            ["`getStackTrace()`", "A copy of the captured frames as `StackTraceElement[]`"],
            ["`printStackTrace()`", "Prints `toString()`, the frames, then each cause as `Caused by:`, with frames shared with the enclosing trace folded into `... n more`"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "throws is a class file attribute",
        },
        {
          type: "paragraph",
          text: "I compiled one method with two checked exceptions in its `throws` clause and one with an unchecked exception in it, plus a `main` that asks reflection about them:",
        },
        {
          type: "code",
          language: "java",
          title: "Declared.java",
          code: `import java.io.IOException;
import java.util.Arrays;

public class Declared {
    static void load(String path) throws IOException, InterruptedException {
        if (path.isEmpty()) {
            throw new IOException("empty path");
        }
    }

    static void check(int qty) throws IllegalArgumentException {
        if (qty < 0) {
            throw new IllegalArgumentException("qty < 0");
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println(Arrays.toString(
                Declared.class.getDeclaredMethod("load", String.class).getExceptionTypes()));
        System.out.println(Arrays.toString(
                Declared.class.getDeclaredMethod("check", int.class).getExceptionTypes()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Declared.java && java Declared
javap -v -p Declared`,
        },
        {
          type: "output",
          text: `[class java.io.IOException, class java.lang.InterruptedException]
[class java.lang.IllegalArgumentException]

  static void load(java.lang.String) throws java.io.IOException, java.lang.InterruptedException;
    descriptor: (Ljava/lang/String;)V
    flags: (0x0008) ACC_STATIC
    Code:
      stack=3, locals=1, args_size=1
         0: aload_0
         1: invokevirtual #7                  // Method java/lang/String.isEmpty:()Z
         4: ifeq          17
         7: new           #13                 // class java/io/IOException
        10: dup
        11: ldc           #15                 // String empty path
        13: invokespecial #17                 // Method java/io/IOException."<init>":(Ljava/lang/String;)V
        16: athrow
        17: return
      ...
    Exceptions:
      throws java.io.IOException, java.lang.InterruptedException

  static void check(int) throws java.lang.IllegalArgumentException;
    ...
    Exceptions:
      throws java.lang.IllegalArgumentException`,
        },
        {
          type: "list",
          items: [
            "The `throws` clause lands in a separate **attribute** of the method, `Exceptions` (JVMS 4.7.5), a list of constant-pool class entries. The unchecked `IllegalArgumentException` is recorded too, exactly as written.",
            "The **descriptor** `(Ljava/lang/String;)V` doesn't mention exceptions at all. Linking a call site only uses the class, name and descriptor, so adding or removing a `throws` type doesn't break already-compiled callers with `NoSuchMethodError`.",
            "Reflection reads the attribute: `getExceptionTypes()` returned exactly the declared list. That's who reads it: reflection and JDK dynamic proxies at run time (a proxy wraps an undeclared checked exception in `UndeclaredThrowableException`, as the Interfaces lesson showed), and `javac` when it compiles code against this class.",
            "`throw new IOException(\"empty path\")` is four instructions before the throw: `new` allocates the object, `dup` keeps a second reference, `ldc` pushes the message, `invokespecial <init>` runs the constructor. Then `athrow` pops the reference and starts the search for a handler. There's no special \"throw a checked exception\" instruction; `athrow` takes any `Throwable`.",
          ],
        },
        {
          type: "heading",
          text: "What athrow does",
        },
        {
          type: "paragraph",
          text: "JVMS 6.5 defines `athrow` in a few sentences. It pops an object reference, which must be a `Throwable`. If it's `null`, the JVM throws a `NullPointerException` instead. Otherwise it searches the current method's exception table for an entry whose range covers the current instruction and whose catch type matches the exception's class. If one matches, the operand stack is cleared, the reference is pushed back, and execution jumps to the handler. If none matches, the frame is popped and the same search runs in the caller, at the instruction that made the call. The try, catch and finally lesson shows the exception table and that unwinding frame by frame.",
        },
        {
          type: "paragraph",
          text: "What's missing from that description is the point of the next demo: `athrow` never looks at the `Exceptions` attribute. Nothing at run time compares the thrown type with what the method declared.",
        },
        {
          type: "heading",
          text: "The JVM does not enforce throws",
        },
        {
          type: "paragraph",
          text: "To prove it, I compiled a caller against one version of a class and then swapped in a second version that throws a checked exception, without recompiling the caller:",
        },
        {
          type: "code",
          language: "java",
          title: "Catalog.java (v1)",
          code: `public class Catalog {
    public static String title(int id) {
        return "Book #" + id;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Catalog.java (v2)",
          code: `import java.io.IOException;

public class Catalog {
    public static String title(int id) throws IOException {
        throw new IOException("catalog file missing");
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Reader.java",
          code: `public class Reader {
    public static void main(String[] args) {
        try {
            System.out.println(Catalog.title(7));
        } catch (RuntimeException e) {
            System.out.println("caught: " + e);
        }
        System.out.println("done");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# v1 of Catalog.java in the directory
javac Catalog.java Reader.java && java Reader
# replace Catalog.java with v2, recompile only Catalog
javac Catalog.java && java Reader
# now try to recompile Reader against v2
javac Reader.java`,
        },
        {
          type: "output",
          text: `Book #7
done
Exception in thread "main" java.io.IOException: catalog file missing
	at Catalog.title(Catalog.java:5)
	at Reader.main(Reader.java:4)
Reader.java:4: error: unreported exception IOException; must be caught or declared to be thrown
            System.out.println(Catalog.title(7));
                                            ^
1 error`,
        },
        {
          type: "list",
          items: [
            "With v2 in place, a checked `IOException` came out of `Reader.main`, a method that declares nothing, and killed the thread. The JVM linked `Catalog.title:(I)Ljava/lang/String;` happily, because the descriptor hadn't changed.",
            "`catch (RuntimeException e)` didn't catch it, and `done` never printed. Code that was \"proved\" to only see unchecked exceptions saw a checked one.",
            "Recompiling `Reader` is what brought the check back. Checked exceptions are a **compiler** feature (JLS 11.2), and the guarantee only holds when everything was compiled together against the same versions.",
            "Changing a public method's `throws` clause is therefore source-incompatible but binary-compatible: old class files keep linking, and they meet exceptions they were never told about. The Sneaky Throw section gets the same effect without any separate compilation.",
          ],
        },
        {
          type: "heading",
          text: "Inside a Throwable",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.lang.Throwable`,
        },
        {
          type: "output",
          text: `public class java.lang.Throwable implements java.io.Serializable {
  private static final long serialVersionUID;
  private transient java.lang.Object backtrace;
  private java.lang.String detailMessage;
  private static final java.lang.StackTraceElement[] UNASSIGNED_STACK;
  private java.lang.Throwable cause;
  private java.lang.StackTraceElement[] stackTrace;
  private transient int depth;
  private static final java.util.List<java.lang.Throwable> SUPPRESSED_SENTINEL;
  private java.util.List<java.lang.Throwable> suppressedExceptions;
  ...
  public java.lang.Throwable();
  public java.lang.Throwable(java.lang.String);
  public java.lang.Throwable(java.lang.String, java.lang.Throwable);
  public java.lang.Throwable(java.lang.Throwable);
  protected java.lang.Throwable(java.lang.String, java.lang.Throwable, boolean, boolean);
  ...
  public synchronized java.lang.Throwable fillInStackTrace();
  private native java.lang.Throwable fillInStackTrace(int);
  ...`,
        },
        {
          type: "paragraph",
          text: "That's the whole state of an exception on JDK 21: a message, a cause, a stack trace in two forms, and a list of suppressed exceptions (the try-with-resources lesson uses that one). Two details in the bytecode explained behaviour I'd only known as rules:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p java.lang.Throwable`,
        },
        {
          type: "output",
          text: `  public java.lang.Throwable();
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0
       5: aload_0
       6: putfield      #7                  // Field cause:Ljava/lang/Throwable;
       9: aload_0
      10: getstatic     #13                 // Field UNASSIGNED_STACK:[Ljava/lang/StackTraceElement;
      13: putfield      #17                 // Field stackTrace:[Ljava/lang/StackTraceElement;
      ...
      23: aload_0
      24: invokevirtual #27                 // Method fillInStackTrace:()Ljava/lang/Throwable;
      27: pop
      28: return
  ...
  public synchronized java.lang.Throwable getCause();
    Code:
       0: aload_0
       1: getfield      #7                  // Field cause:Ljava/lang/Throwable;
       4: aload_0
       5: if_acmpne     12
       8: aconst_null
       9: goto          16
      12: aload_0
      13: getfield      #7                  // Field cause:Ljava/lang/Throwable;
      16: areturn`,
        },
        {
          type: "list",
          items: [
            "**A cause that points at the exception itself means \"not set yet\".** The constructor stores the object itself in `cause` (offsets 4 to 6), and `getCause()` returns `null` when `cause == this`. That sentinel is how `initCause` can tell \"never set\" from \"explicitly set to `null`\": a cause constructor overwrites the sentinel, even with `null`, and from then on `initCause` refuses.",
            "**The stack trace is captured in the constructor**, by `fillInStackTrace()` at offset 24, not by `athrow`. So an exception created in one method and thrown from another points at where it was created, and a rethrow never refreshes the trace. The Exceptions and the Exception Hierarchy lesson demonstrates that, and the lazy `backtrace`-to-`StackTraceElement` conversion, with runs of its own.",
            "`fillInStackTrace()` is called with `invokevirtual`, so a subclass can override it. That's the older way to make an exception without a stack trace; the protected four-argument constructor is the cleaner one.",
          ],
        },
        {
          type: "heading",
          text: "Exceptions without a stack trace",
        },
        {
          type: "paragraph",
          text: "The protected constructor `Throwable(message, cause, enableSuppression, writableStackTrace)` lets a subclass skip both the trace and the suppressed list. In the bytecode, `writableStackTrace = false` simply skips the `fillInStackTrace()` call and sets `stackTrace` to `null`:",
        },
        {
          type: "code",
          language: "java",
          title: "Stackless.java",
          code: `public class Stackless {
    // Normal exception: the constructor captures the stack
    static class SeatTakenException extends RuntimeException {
        SeatTakenException(String seat) {
            super("seat " + seat + " is taken");
        }
    }

    // No stack trace, no suppressed list: the protected four-argument constructor
    static class SeatTakenFast extends RuntimeException {
        SeatTakenFast(String seat) {
            super("seat " + seat + " is taken", null, false, false);
        }
    }

    static void reserve(String seat, boolean fast) {
        if (fast) {
            throw new SeatTakenFast(seat);
        }
        throw new SeatTakenException(seat);
    }

    public static void main(String[] args) {
        try {
            reserve("12A", false);
        } catch (SeatTakenException e) {
            System.out.println("normal frames:    " + e.getStackTrace().length);
            e.printStackTrace(System.out);
        }
        try {
            reserve("12A", true);
        } catch (SeatTakenFast e) {
            System.out.println("stackless frames: " + e.getStackTrace().length);
            e.printStackTrace(System.out);

            e.setStackTrace(new StackTraceElement[] {
                    new StackTraceElement("Fake", "frame", "Fake.java", 1)});
            System.out.println("after setStackTrace: " + e.getStackTrace().length);

            e.addSuppressed(new IllegalStateException("cleanup failed"));
            System.out.println("suppressed kept: " + e.getSuppressed().length);
        }
    }
}`,
        },
        {
          type: "output",
          text: `normal frames:    2
Stackless$SeatTakenException: seat 12A is taken
	at Stackless.reserve(Stackless.java:20)
	at Stackless.main(Stackless.java:25)
stackless frames: 0
Stackless$SeatTakenFast: seat 12A is taken
after setStackTrace: 0
suppressed kept: 0`,
        },
        {
          type: "list",
          items: [
            "The stackless exception printed one line and nothing else. Its trace stayed empty even after `setStackTrace`, which the Javadoc says is ignored when the trace isn't writable, and `addSuppressed` was silently dropped.",
            "I printed to `System.out` in these demos so the trace and the other lines can't interleave; `printStackTrace()` with no argument writes to `System.err`.",
            "When it's reasonable: an exception that signals an expected outcome thrown very often, where nobody will ever read the trace, such as a parser's \"no match here, try the next rule\" or a validation failure that's always turned into a response. The JDK does this internally: `sun.nio.fs.UnixException`, which the file system code always translates into an `IOException` before it leaves, overrides `fillInStackTrace()` to return `this`, with the source comment \"the stack trace is irrelevant\". When it isn't: anything that can reach a log. An unexpected failure without a trace is close to undebuggable. The Exceptions and the Exception Hierarchy lesson measures what the trace actually costs.",
          ],
        },
      ],
    },
    {
      title: "throw in Depth",
      blocks: [
        {
          type: "paragraph",
          text: "Throwing a checked exception and an unchecked one look the same at the `throw`. The difference is what the compiler demands around it:",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowBasics.java",
          code: `import java.io.FileNotFoundException;
import java.io.IOException;

public class ThrowBasics {
    static class BankAccount {
        private long balance = 1_000;

        // Unchecked: no throws clause needed, callers aren't forced to catch
        void withdraw(long amount) {
            if (amount <= 0) {
                throw new IllegalArgumentException("amount must be positive: " + amount);
            }
            if (amount > balance) {
                throw new IllegalStateException("balance " + balance + " < " + amount);
            }
            balance -= amount;
        }
    }

    // Checked: the throws clause is mandatory
    static String loadCatalog(String path) throws IOException {
        if (!path.endsWith(".csv")) {
            throw new FileNotFoundException(path + " (not a catalog file)");
        }
        return "catalog from " + path;
    }

    public static void main(String[] args) {
        BankAccount account = new BankAccount();
        for (long amount : new long[] {300, -5, 5_000}) {
            try {
                account.withdraw(amount);
                System.out.println("withdrew " + amount);
            } catch (RuntimeException e) {
                System.out.println(e);
            }
        }

        try {
            System.out.println(loadCatalog("books.csv"));
            System.out.println(loadCatalog("books.txt"));
        } catch (IOException e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `withdrew 300
java.lang.IllegalArgumentException: amount must be positive: -5
java.lang.IllegalStateException: balance 700 < 5000`,
        },
        {
          type: "output",
          text: `catalog from books.csv
java.io.FileNotFoundException: books.txt (not a catalog file)`,
        },
        {
          type: "list",
          items: [
            "`withdraw` throws two unchecked exceptions and declares nothing. `IllegalArgumentException` says \"you passed a bad argument\", `IllegalStateException` says \"the argument is fine, but not right now\". Those two, plus `NullPointerException`, `UnsupportedOperationException`, `IndexOutOfBoundsException` and `NoSuchElementException`, cover most of what a method needs before a custom exception is worth writing.",
            "`loadCatalog` throws a `FileNotFoundException` but declares `IOException`, its superclass. That's allowed: the `throws` clause must cover what's thrown, not name it exactly. The caller catches `IOException` and gets the subclass, as `toString()` shows.",
            "In both cases the method stops at the `throw`. The failed withdrawal of `5_000` left the balance at `700`, because the subtraction after the checks never ran. Checking first and changing state last is what makes a method safe to call again after it throws.",
          ],
        },
        {
          type: "heading",
          text: "Throwing null",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowNull.java",
          code: `public class ThrowNull {
    static RuntimeException lastError;                // never assigned, so null

    static void fail() {
        throw lastError;                              // compiles: the type is a Throwable
    }

    public static void main(String[] args) {
        try {
            throw null;                               // also compiles
        } catch (NullPointerException e) {
            System.out.println("1: " + e);
        }
        try {
            fail();
        } catch (NullPointerException e) {
            System.out.println("2: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `1: java.lang.NullPointerException: Cannot throw exception because "null" is null
2: java.lang.NullPointerException: Cannot throw exception because "ThrowNull.lastError" is null`,
        },
        {
          type: "paragraph",
          text: "`null` has the null type, which is assignable to `Throwable`, so `throw null;` compiles. At run time `athrow` finds a null reference and throws a `NullPointerException` in its place, with a helpful message since JDK 15. Nobody writes `throw null` on purpose, but the second case is real: rethrowing an exception from a field or a variable that was never set. The original problem is then replaced by an NPE that points at the `throw` line.",
        },
        {
          type: "heading",
          text: "What the compiler rejects",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowString.java",
          code: `public class ThrowString {
    static void check(int age) {
        if (age < 0) {
            throw "age cannot be negative";
        }
    }
}`,
        },
        {
          type: "output",
          text: `ThrowString.java:4: error: incompatible types: String cannot be converted to Throwable
            throw "age cannot be negative";
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A checked `throw` that's neither caught nor declared gets the familiar `unreported exception IOException; must be caught or declared to be thrown`. The Exceptions and the Exception Hierarchy lesson shows that error, and recompiling `Reader` against v2 of `Catalog` above produced the same error for a call. The third rejection is less familiar:",
        },
        {
          type: "code",
          language: "java",
          title: "AfterThrow.java",
          code: `public class AfterThrow {
    static int parsePercent(String s) {
        int value = Integer.parseInt(s);
        if (value >= 0 && value <= 100) {
            return value;
        }
        throw new IllegalArgumentException("not a percentage: " + value);
        System.out.println("rejected " + value);
    }
}`,
        },
        {
          type: "output",
          text: `AfterThrow.java:8: error: unreachable statement
        System.out.println("rejected " + value);
        ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Without the `println`, `AfterThrow` compiles, even though the method returns `int` and has no `return` at the end. A `throw` can't complete normally, so the end of the method is unreachable, and the \"missing return statement\" error from the Methods lesson doesn't apply. The same rule lets a `switch` expression arm throw instead of producing a value: `default -> throw new IllegalArgumentException(\"unknown tier: \" + tier);` compiles inside an expression that otherwise yields an `int`.",
        },
      ],
    },
    {
      title: "throws in Depth",
      blocks: [
        {
          type: "paragraph",
          text: "A `throws` clause can list several types, can include unchecked ones for the reader's sake, and works on constructors exactly as on methods:",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowsDemo.java",
          code: `import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

public class ThrowsDemo {
    static class Library {
        private final String name;

        // A constructor can declare checked exceptions too
        Library(String name, boolean shelvesReachable) throws IOException {
            if (!shelvesReachable) {
                throw new IOException("cannot reach the shelf index for " + name);
            }
            this.name = name;
        }

        // Several checked exceptions, plus an unchecked one listed for the reader
        LocalDate dueDate(String isbn, String issuedOn)
                throws IOException, InterruptedException, DateTimeParseException {
            if (isbn.isBlank()) {
                throw new IOException("no record for an empty ISBN");
            }
            return LocalDate.parse(issuedOn).plusDays(14);
        }
    }

    public static void main(String[] args) throws InterruptedException {
        try {
            Library library = new Library("City Library", true);
            System.out.println(library.dueDate("978-0134685991", "2026-11-01"));
            System.out.println(library.dueDate("978-0134685991", "01/11/2026"));
        } catch (IOException e) {
            System.out.println("I/O: " + e.getMessage());
        } catch (DateTimeParseException e) {
            System.out.println("bad date: " + e.getParsedString());
        }

        try {
            new Library("Branch Library", false);
        } catch (IOException e) {
            System.out.println("I/O: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `2026-11-15
bad date: 01/11/2026
I/O: cannot reach the shelf index for Branch Library`,
        },
        {
          type: "list",
          items: [
            "`main` handles `IOException` but passes `InterruptedException` on with its own `throws` clause. Propagating is a valid way to \"deal with\" a checked exception; if it escapes `main`, the thread's default handler prints the stack trace and the JVM exits with status 1 once no non-daemon threads are left.",
            "`DateTimeParseException` in the `throws` clause changed nothing for the compiler. I could have dropped it, and no caller would have been forced to catch it. Listing it, or better, documenting it with an `@throws` Javadoc tag, tells the reader what `dueDate` does with a malformed date.",
            "The constructor's `throws IOException` makes every `new Library(...)` a call site that has to handle or declare `IOException`, the same as a method call. The second `Library` was never created; there was no object to assign.",
          ],
        },
        {
          type: "heading",
          text: "Overriding and throws, briefly",
        },
        {
          type: "paragraph",
          text: "The Polymorphism lesson owns this rule, and its reason is substitutability: a caller holding a `Printer` only prepared for what `Printer.print` declares, so an override can't surprise it with something broader. One file shows all four cases:",
        },
        {
          type: "code",
          language: "java",
          title: "OverrideThrows.java",
          code: `import java.io.FileNotFoundException;
import java.io.IOException;

public class OverrideThrows {
    static class Printer {
        void print(String doc) throws IOException { }
    }

    static class FilePrinter extends Printer {
        @Override
        void print(String doc) throws FileNotFoundException { }   // narrower: fine
    }

    static class QuietPrinter extends Printer {
        @Override
        void print(String doc) { }                                 // none: fine
    }

    static class UncheckedPrinter extends Printer {
        @Override
        void print(String doc) throws IllegalStateException { }    // unchecked: fine
    }

    static class NetworkPrinter extends Printer {
        @Override
        void print(String doc) throws Exception { }                // broader: error
    }
}`,
        },
        {
          type: "output",
          text: `OverrideThrows.java:26: error: print(String) in NetworkPrinter cannot override print(String) in Printer
        void print(String doc) throws Exception { }                // broader: error
             ^
  overridden method does not throw Exception
1 error`,
        },
        {
          type: "paragraph",
          text: "Only `NetworkPrinter` failed. The same rule applies to implementing interface methods, which is why a `Runnable` lambda or `run()` method can't throw `IOException`: `Runnable.run()` declares nothing. `Callable.call()` declares `throws Exception`, so an implementation may throw any checked exception. Exceptions in lambdas get their own treatment in the Exception Handling Best Practices lesson.",
        },
        {
          type: "heading",
          text: "A type variable in throws",
        },
        {
          type: "paragraph",
          text: "A `throws` clause can name a type parameter. `Optional.orElseThrow` is declared as `<X extends Throwable> T orElseThrow(Supplier<? extends X> exceptionSupplier) throws X`, so `opt.orElseThrow(() -> new IOException(\"missing\"))` makes the call throw `IOException` and the compiler checks it, while `opt.orElseThrow(IllegalStateException::new)` needs no `try`. The generic `throws` is checked at compile time, but the class file's `Exceptions` attribute records only its erasure, which is exactly the gap the Sneaky Throw section exploits.",
        },
      ],
    },
    {
      title: "Rethrowing and Precise Rethrow",
      blocks: [
        {
          type: "paragraph",
          text: "A catch block can throw the exception it caught: `throw e;`. The object, its message and its original stack trace are unchanged, because the trace was filled in by the constructor long ago and `athrow` doesn't touch it. Rethrowing is how code logs or cleans up something it can't handle and passes the failure on.",
        },
        {
          type: "paragraph",
          text: "The question is what type the rethrow throws, as far as the compiler is concerned. Before Java 7, `catch (Exception e) { throw e; }` threw `Exception`, so the method had to declare `throws Exception`. Java 7 (JSR 334) made the analysis **precise**: if the catch parameter is final or effectively final, `throw e` can throw only the checked exceptions the `try` block can actually throw that this catch could have caught (JLS 11.2.2).",
        },
        {
          type: "code",
          language: "java",
          title: "PreciseRethrow.java",
          code: `import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;

public class PreciseRethrow {
    static void importRow(String row) throws IOException, ParseException {
        if (row.isBlank()) {
            throw new IOException("empty row");
        }
        new SimpleDateFormat("yyyy-MM-dd").parse(row);
    }

    // catch (Exception e) + throw e still declares only the two real types
    static void importLogged(String row) throws IOException, ParseException {
        try {
            importRow(row);
        } catch (Exception e) {
            System.out.println("log: " + e.getClass().getSimpleName() + " for '" + row + "'");
            throw e;
        }
    }

    public static void main(String[] args) {
        for (String row : new String[] {"2026-11-13", "", "13/11"}) {
            try {
                importLogged(row);
                System.out.println("imported " + row);
            } catch (IOException e) {
                System.out.println("caller handles I/O: " + e.getMessage());
            } catch (ParseException e) {
                System.out.println("caller handles parse at offset " + e.getErrorOffset());
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `imported 2026-11-13
log: IOException for ''
caller handles I/O: empty row
log: ParseException for '13/11'
caller handles parse at offset 2`,
        },
        {
          type: "paragraph",
          text: "`importLogged` catches `Exception` but declares only `IOException, ParseException`, and the callers keep their two specific catch blocks. Precise rethrow is easy to switch off by accident. Assigning to the catch parameter makes it no longer effectively final, and the compiler falls back to the declared type of `e`:",
        },
        {
          type: "code",
          language: "java",
          title: "LostPrecision.java",
          code: `import java.io.IOException;
import java.text.ParseException;

public class LostPrecision {
    static void importRow(String row) throws IOException, ParseException { }

    static void importLogged(String row) throws IOException, ParseException {
        try {
            importRow(row);
        } catch (Exception e) {
            e = new IOException("wrapped", e);    // e is no longer effectively final
            throw e;
        }
    }
}`,
        },
        {
          type: "output",
          text: `LostPrecision.java:12: error: unreported exception Exception; must be caught or declared to be thrown
            throw e;
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The fix is never to reuse the catch parameter: `throw new IOException(\"wrapped\", e);` directly. The same analysis has a less obvious consequence. When the `try` block can throw no checked exceptions at all, `catch (Exception e) { throw e; }` rethrows only unchecked ones, and the method needs no `throws` clause:",
        },
        {
          type: "code",
          language: "java",
          title: "RethrowUnchecked.java",
          code: `public class RethrowUnchecked {
    static int ratio(int a, int b) {              // no throws clause
        try {
            return a / b;
        } catch (Exception e) {                   // the try body throws nothing checked
            System.out.println("log: " + e);
            throw e;                              // so this rethrow is unchecked
        }
    }

    public static void main(String[] args) {
        System.out.println(ratio(10, 2));
        System.out.println(ratio(10, 0));
    }
}`,
        },
        {
          type: "output",
          text: `5
log: java.lang.ArithmeticException: / by zero
Exception in thread "main" java.lang.ArithmeticException: / by zero
	at RethrowUnchecked.ratio(RethrowUnchecked.java:4)
	at RethrowUnchecked.main(RethrowUnchecked.java:13)`,
        },
        {
          type: "paragraph",
          text: "The trace still points at line 4, the division, not line 7 where it was rethrown, because rethrowing doesn't refill the trace. The same analysis works in the other direction: `javac` knows what a `try` block can throw, so a catch for a checked exception the block can't throw (other than `Exception` and `Throwable`, which also cover unchecked ones) is the error `exception IOException is never thrown in body of corresponding try statement`. The try, catch and finally lesson demonstrates that, along with multi-catch, whose parameter is implicitly final, so a rethrow from it is always precise.",
        },
      ],
    },
    {
      title: "Exception Chaining",
      blocks: [
        {
          type: "paragraph",
          text: "When code catches one exception and throws a different one, the new exception should carry the old one as its **cause**. That's the whole idea of chaining: the outer exception says what failed at this level (\"bad salary row\"), the cause says why (\"For input string: 85k\"), and `printStackTrace` shows both. Here's the same failure thrown twice, once dropping the cause and once keeping it:",
        },
        {
          type: "code",
          language: "java",
          title: "ChainDemo.java",
          code: `public class ChainDemo {
    static class PayrollException extends Exception {
        PayrollException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static long parseSalary(String csvLine) {
        String[] parts = csvLine.split(",");
        return Long.parseLong(parts[1].trim());
    }

    // BUG: the original exception is dropped
    static long salaryLost(String csvLine) throws PayrollException {
        try {
            return parseSalary(csvLine);
        } catch (NumberFormatException e) {
            throw new PayrollException("bad salary row", null);
        }
    }

    // FIX: the original exception travels along as the cause
    static long salaryKept(String csvLine) throws PayrollException {
        try {
            return parseSalary(csvLine);
        } catch (NumberFormatException e) {
            throw new PayrollException("bad salary row: " + csvLine, e);
        }
    }

    public static void main(String[] args) {
        String row = "Asha,85k";
        try {
            salaryLost(row);
        } catch (PayrollException e) {
            e.printStackTrace(System.out);
        }
        System.out.println("----");
        try {
            salaryKept(row);
        } catch (PayrollException e) {
            e.printStackTrace(System.out);
            System.out.println("getCause(): " + e.getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `ChainDemo$PayrollException: bad salary row
	at ChainDemo.salaryLost(ChainDemo.java:18)
	at ChainDemo.main(ChainDemo.java:34)
----
ChainDemo$PayrollException: bad salary row: Asha,85k
	at ChainDemo.salaryKept(ChainDemo.java:27)
	at ChainDemo.main(ChainDemo.java:40)
Caused by: java.lang.NumberFormatException: For input string: "85k"
	at java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
	at java.base/java.lang.Long.parseLong(Long.java:709)
	at java.base/java.lang.Long.parseLong(Long.java:832)
	at ChainDemo.parseSalary(ChainDemo.java:10)
	at ChainDemo.salaryKept(ChainDemo.java:25)
	... 1 more
getCause(): java.lang.NumberFormatException: For input string: "85k"`,
        },
        {
          type: "list",
          items: [
            "The first trace says a salary row was bad and nothing else: not which row, not which value, not that `parseSalary` was involved. Everything the `NumberFormatException` knew died in the catch block.",
            "The second trace has a `Caused by:` section with the cause's own frames, down to `Long.parseLong`. (The JDK line numbers like `Long.java:709` are from my JDK 21 build.)",
            "`... 1 more` is `printStackTrace` saving space. The cause's trace ends with the same frames as the enclosing trace, here `ChainDemo.main`, so it prints the frames that differ and counts the shared tail. The frame `salaryKept(ChainDemo.java:25)` is where the cause passed through; line 27 in the outer trace is where the wrapper was created.",
            "The new message includes the row. Chaining keeps the cause, but the outer exception is still the place to add what only this level knows, like which input it was processing.",
          ],
        },
        {
          type: "heading",
          text: "initCause, and its rules",
        },
        {
          type: "paragraph",
          text: "Some exception classes, mostly old ones or custom ones written without a cause constructor, can only get a cause after construction, through `initCause`. It's a one-shot setter, and the `cause = this` sentinel from Internal Working is what enforces that:",
        },
        {
          type: "code",
          language: "java",
          title: "InitCauseDemo.java",
          code: `public class InitCauseDemo {
    // An old-style exception with no cause constructor
    static class LegacyException extends Exception {
        LegacyException(String message) {
            super(message);
        }
    }

    public static void main(String[] args) {
        NumberFormatException low = new NumberFormatException("For input string: \\"12x\\"");

        LegacyException legacy = new LegacyException("cannot read stock level");
        legacy.initCause(low);                               // allowed exactly once
        System.out.println("1: " + legacy.getCause());

        try {
            legacy.initCause(new RuntimeException("second"));
        } catch (IllegalStateException e) {
            System.out.println("2: " + e.getMessage());
        }

        RuntimeException withCause = new RuntimeException("wrapped", low);
        try {
            withCause.initCause(low);                        // cause already set by the constructor
        } catch (IllegalStateException e) {
            System.out.println("3: " + e.getMessage());
        }

        RuntimeException nullCause = new RuntimeException("no cause", null);
        try {
            nullCause.initCause(low);                        // null counts as "set"
        } catch (IllegalStateException e) {
            System.out.println("4: " + e.getMessage());
        }

        LegacyException self = new LegacyException("loop");
        try {
            self.initCause(self);
        } catch (IllegalArgumentException e) {
            System.out.println("5: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `1: java.lang.NumberFormatException: For input string: "12x"
2: Can't overwrite cause with java.lang.RuntimeException: second
3: Can't overwrite cause with java.lang.NumberFormatException: For input string: "12x"
4: Can't overwrite cause with java.lang.NumberFormatException: For input string: "12x"
5: Self-causation not permitted`,
        },
        {
          type: "list",
          items: [
            "Case 4 is the subtle one. Passing `null` to a cause constructor counts as setting the cause, so `initCause` refuses afterwards. Only the constructors without a cause parameter leave it open.",
            "`initCause` returns `this`, so the usual idiom is `throw (LegacyException) new LegacyException(\"...\").initCause(e);`, cast included, because the return type is `Throwable`. A cause constructor is cleaner whenever I own the class.",
            "Self-causation is the only cycle `initCause` checks for. A longer cycle, A caused by B caused by A, can still be built, so a loop walking `getCause()` should guard against it. `printStackTrace` does, and prints `[CIRCULAR REFERENCE: ...]` instead of recursing.",
          ],
        },
        {
          type: "heading",
          text: "Two ways the cause gets lost",
        },
        {
          type: "list",
          items: [
            "**Not passing it:** `throw new ServiceException(\"failed\")` inside a catch block. The fix is the two-argument constructor.",
            "**Passing only the message:** `throw new ServiceException(e.getMessage())`. It looks like it keeps the information, but it drops the cause's type, its stack trace and its own causes, and `getMessage()` can be `null`. This is the version that survives code review because the log line looks informative.",
          ],
        },
      ],
    },
    {
      title: "Writing Custom Exceptions",
      blocks: [
        {
          type: "paragraph",
          text: "A custom exception is an ordinary class. Extending `Exception` makes it checked; extending `RuntimeException` makes it unchecked. Everything else is a design choice: what it's called, what it carries, and which constructors it offers. Here's one of each kind:",
        },
        {
          type: "code",
          language: "java",
          title: "CustomExceptions.java",
          code: `import java.io.Serial;
import java.util.Map;

public class CustomExceptions {
    // Checked: a business outcome the caller is expected to handle
    static class InsufficientFundsException extends Exception {
        @Serial
        private static final long serialVersionUID = 1L;

        private final String accountId;
        private final long requestedPaise;
        private final long availablePaise;

        InsufficientFundsException(String accountId, long requestedPaise, long availablePaise) {
            super("account " + accountId + ": requested " + requestedPaise
                    + " paise, available " + availablePaise);
            this.accountId = accountId;
            this.requestedPaise = requestedPaise;
            this.availablePaise = availablePaise;
        }

        String accountId()   { return accountId; }
        long shortfallPaise() { return requestedPaise - availablePaise; }
    }

    // Unchecked, with the four standard constructors
    static class OrderNotFoundException extends RuntimeException {
        @Serial
        private static final long serialVersionUID = 1L;

        OrderNotFoundException() {
            super();
        }

        OrderNotFoundException(String message) {
            super(message);
        }

        OrderNotFoundException(String message, Throwable cause) {
            super(message, cause);
        }

        OrderNotFoundException(Throwable cause) {
            super(cause);
        }
    }

    static final Map<Long, String> ORDERS = Map.of(101L, "2 x Notebook");

    static String findOrder(long orderId) {
        String order = ORDERS.get(orderId);
        if (order == null) {
            throw new OrderNotFoundException("order " + orderId + " not found");
        }
        return order;
    }

    static void withdraw(String accountId, long balancePaise, long amountPaise)
            throws InsufficientFundsException {
        if (amountPaise > balancePaise) {
            throw new InsufficientFundsException(accountId, amountPaise, balancePaise);
        }
    }

    public static void main(String[] args) {
        System.out.println(findOrder(101));
        try {
            findOrder(999);
        } catch (OrderNotFoundException e) {
            System.out.println(e);
        }

        try {
            withdraw("ACC-42", 50_000, 80_000);
        } catch (InsufficientFundsException e) {
            System.out.println(e.getMessage());
            System.out.println("short by " + e.shortfallPaise() + " paise on " + e.accountId());
        }

        System.out.println(new OrderNotFoundException());
        System.out.println(new OrderNotFoundException(new IllegalStateException("index offline")));
    }
}`,
        },
        {
          type: "output",
          text: `2 x Notebook
CustomExceptions$OrderNotFoundException: order 999 not found
account ACC-42: requested 80000 paise, available 50000
short by 30000 paise on ACC-42
CustomExceptions$OrderNotFoundException
CustomExceptions$OrderNotFoundException: java.lang.IllegalStateException: index offline`,
        },
        {
          type: "list",
          items: [
            "**The fields are the point.** The caller of `withdraw` didn't parse a message to find the shortfall; it called `e.shortfallPaise()`. A message is for humans and logs. Fields are for code that wants to react: show the shortfall, retry with less, map to an error code.",
            "**The message is built once, in the constructor**, from the same values as the fields. That keeps `getMessage()` and the fields consistent, and every log line gets the context for free.",
            "**The four standard constructors** exist so the exception can be used the way the JDK's are: plain, with a message, with a message and a cause, or with only a cause. The last two lines show the two ends: no message makes `toString()` just the class name, and the cause-only constructor copies `cause.toString()` into the message. `InsufficientFundsException` has a single domain constructor instead, which is fine; the convention is a default, not a rule.",
            "**Immutability.** The fields are `final` with no setters. An exception can be caught on one thread and logged on another (through a `Future`, for example), stored, rethrown and serialized, so it should be a value that can't change under anyone.",
          ],
        },
        {
          type: "heading",
          text: "Checked or unchecked?",
        },
        {
          type: "table",
          headers: ["Make it checked (extends Exception) when", "Make it unchecked (extends RuntimeException) when"],
          rows: [
            ["The failure is an expected outcome of a correct call", "The failure means a bug or broken precondition in the caller"],
            ["The immediate caller can realistically do something about it", "Nobody nearby can fix it; it should travel to a global handler"],
            ["It's part of a small, stable API, like `InsufficientFundsException` above", "It crosses many layers, lambdas or framework callbacks"],
            ["Example: `BookUnavailableException` with a waitlist fallback", "Example: `OrderNotFoundException` turned into a 404 at the edge"],
          ],
        },
        {
          type: "paragraph",
          text: "Most modern Java backends, and Spring itself, lean heavily towards unchecked exceptions for application errors, keeping checked ones for the few cases where the compiler's reminder genuinely helps. The Exception Handling Best Practices lesson goes through that shift and its trade-offs; the rule I take from it here is that \"checked\" should mean \"the caller has a real recovery path\".",
        },
        {
          type: "heading",
          text: "serialVersionUID and what fields to carry",
        },
        {
          type: "paragraph",
          text: "`Throwable` implements `Serializable`, so every exception class is serializable whether I meant it or not. Exceptions do get serialized: Java RMI sends them across the wire, and some caches and job frameworks persist them. With `-Xlint:serial`, `javac` points out the two things to care about:",
        },
        {
          type: "code",
          language: "java",
          title: "SerialLint.java",
          code: `public class SerialLint {
    static class Order {
        long id;
    }

    static class OrderRejectedException extends RuntimeException {
        private final Order order;

        OrderRejectedException(Order order) {
            super("order " + order.id + " rejected");
            this.order = order;
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -Xlint:serial SerialLint.java`,
        },
        {
          type: "output",
          text: `SerialLint.java:6: warning: [serial] serializable class OrderRejectedException has no definition of serialVersionUID
    static class OrderRejectedException extends RuntimeException {
           ^
SerialLint.java:7: warning: [serial] non-transient instance field of a serializable class declared with a non-serializable type
        private final Order order;
                            ^
2 warnings`,
        },
        {
          type: "list",
          items: [
            "A `private static final long serialVersionUID = 1L;`, annotated with `@Serial` (Java 14+) as in `CustomExceptions`, silences the first warning and pins the class's serialized form. The Serialization lesson, later in this track, explains what the number actually controls.",
            "The second warning is the design hint: an exception should carry **identifiers and small values** (`orderId`, an error code, a count), not whole entities. A whole `Order` drags its object graph into every log call and serialization, can't be serialized at all here, and may contain data that shouldn't end up in a log.",
          ],
        },
        {
          type: "heading",
          text: "Naming",
        },
        {
          type: "list",
          items: [
            "End the name with `Exception`. `Error` is for serious, usually JVM-level problems that application code rarely defines.",
            "Name the **problem**, not the place: `OrderNotFoundException`, `InsufficientFundsException`, `CourseFullException`. `OrderServiceException` says where it came from, which the stack trace already says, and nothing about what went wrong.",
            "Don't reuse a JDK name for a different meaning. A custom `IllegalStateException` in my own package would shadow `java.lang.IllegalStateException` in every file of that package and every file that imports it.",
          ],
        },
      ],
    },
    {
      title: "Designing an Exception Hierarchy",
      blocks: [
        {
          type: "paragraph",
          text: "Once an application has more than a handful of custom exceptions, the way they relate starts to matter more than any single one. The shape I'd use for a backend has three levels: one base class for everything the application throws on purpose, a few categories that correspond to how a client should react, and specific domain exceptions under those categories.",
        },
        {
          type: "diagram",
          text: `RuntimeException
└── AppException (abstract)            code: stable, machine-readable
    ├── NotFoundException              -> 404   "NOT_FOUND"
    ├── ConflictException              -> 409   "CONFLICT"
    │   └── OutOfStockException        sku, requested, available
    ├── ValidationException            -> 400   "VALIDATION_FAILED"
    │                                  errors: List<String>
    └── DependencyException            -> 503   "DEPENDENCY_FAILED"
                                       cause: the low-level exception`,
          caption: "Categories decide how a client reacts; subclasses add domain detail.",
        },
        {
          type: "image",
          src: "/images/java/custom-exceptions-hierarchy.svg",
          alt: "An application exception hierarchy. At the top, the JDK classes Throwable, Exception and RuntimeException in grey. Under RuntimeException sits the abstract AppException in orange, which carries a stable code. Under it are four category boxes in blue: NotFoundException mapped to HTTP 404, ConflictException mapped to 409, ValidationException mapped to 400 and DependencyException mapped to 503. Under ConflictException hangs a domain subclass, OutOfStockException, with fields sku, requested and available. A note at the bottom says one switch at the edge maps categories to HTTP status, and the low-level cause stays inside the exception for the log.",
          caption: "Throw specific, catch general: code throws OutOfStockException, the web edge only needs to know it's a ConflictException.",
        },
        {
          type: "paragraph",
          text: "Here it is as code. Java 17's sealed classes and Java 21's pattern matching for `switch` make the mapping exhaustive: if someone adds a fifth category, the `switch` stops compiling until it's mapped.",
        },
        {
          type: "code",
          language: "java",
          title: "AppErrors.java",
          code: `import java.util.List;

public class AppErrors {
    // The base: every application exception has a stable, machine-readable code
    abstract static sealed class AppException extends RuntimeException
            permits NotFoundException, ConflictException, ValidationException, DependencyException {
        private final String code;

        AppException(String code, String message, Throwable cause) {
            super(message, cause);
            this.code = code;
        }

        String code() { return code; }
    }

    static final class NotFoundException extends AppException {
        NotFoundException(String what, Object id) {
            super("NOT_FOUND", what + " " + id + " not found", null);
        }
    }

    static non-sealed class ConflictException extends AppException {
        ConflictException(String message) {
            super("CONFLICT", message, null);
        }
    }

    // A domain-specific subclass of a generic category
    static final class OutOfStockException extends ConflictException {
        private final String sku;
        private final int requested;
        private final int available;

        OutOfStockException(String sku, int requested, int available) {
            super("only " + available + " of " + sku + " left, " + requested + " requested");
            this.sku = sku;
            this.requested = requested;
            this.available = available;
        }

        int available() { return available; }
    }

    static final class ValidationException extends AppException {
        private final List<String> errors;

        ValidationException(List<String> errors) {
            super("VALIDATION_FAILED", errors.size() + " field error(s)", null);
            this.errors = List.copyOf(errors);         // immutable snapshot
        }

        List<String> errors() { return errors; }
    }

    static final class DependencyException extends AppException {
        DependencyException(String dependency, Throwable cause) {
            super("DEPENDENCY_FAILED", dependency + " unavailable", cause);
        }
    }

    // What a web layer will do later: one place that maps the hierarchy to HTTP
    static int httpStatus(AppException e) {
        return switch (e) {
            case NotFoundException nf   -> 404;
            case ConflictException c    -> 409;
            case ValidationException v  -> 400;
            case DependencyException d  -> 503;
        };
    }

    public static void main(String[] args) {
        List<AppException> failures = List.of(
                new NotFoundException("Product", "SKU-123"),
                new OutOfStockException("SKU-777", 5, 2),
                new ValidationException(List.of("email: must not be blank", "age: must be >= 18")),
                new DependencyException("inventory-db", new java.net.ConnectException("Connection refused")));

        for (AppException e : failures) {
            System.out.printf("%d %-17s %s%n", httpStatus(e), e.code(), e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `404 NOT_FOUND         Product SKU-123 not found
409 CONFLICT          only 2 of SKU-777 left, 5 requested
400 VALIDATION_FAILED 2 field error(s)
503 DEPENDENCY_FAILED inventory-db unavailable`,
        },
        {
          type: "list",
          items: [
            "**The out-of-stock case became a 409 without being mentioned in the switch.** `OutOfStockException` is a `ConflictException`, and pattern matching matches subclasses. Code deep in the domain throws the specific type; the edge only knows the four categories.",
            "**The switch has no default branch.** The compiler accepts it because `AppException` is sealed and all four permitted subclasses are covered. `ConflictException` is `non-sealed` on purpose, so feature code can add its own conflicts without touching the base.",
            "**The code is separate from the message.** The message can be reworded at any time; the code is part of the API contract, and clients branch on it.",
            "**The base is abstract and has only a cause-taking constructor**, so every application exception states its code and nobody can throw a bare `AppException`.",
            "The mapping function is what Spring's `@RestControllerAdvice` turns into a global handler, and RFC 9457 `ProblemDetail` is the standard response body for it. Both are in the Exception Handling Best Practices lesson; here the point is that the hierarchy is what makes a single mapping possible.",
          ],
        },
        {
          type: "heading",
          text: "Rules I'd hold the hierarchy to",
        },
        {
          type: "list",
          items: [
            "Shallow: base, category, domain. A five-level exception tree is usually modelling the package structure, not failures.",
            "Categories by **reaction**, not by module. `NotFound` and `Conflict` tell a client what to do; `InventoryException` and `BillingException` don't.",
            "Every class in it is worth catching or mapping separately. If nothing would ever treat it differently from its parent, it doesn't need to exist; a different message is enough.",
            "Unchecked for the hierarchy as a whole. A sealed checked hierarchy would force every layer to declare `AppException`, which says nothing and gets copied everywhere.",
          ],
        },
      ],
    },
    {
      title: "Exception Translation Between Layers",
      blocks: [
        {
          type: "paragraph",
          text: "Each layer of an application has its own vocabulary. The repository knows about SQL and connections, the service about orders and stock, the web layer about requests and status codes. **Exception translation** means catching an exception at a layer boundary and rethrowing it as an exception from the next layer's vocabulary, with the original as the cause. Effective Java (Item 73) calls it \"throw exceptions appropriate to the abstraction\".",
        },
        {
          type: "paragraph",
          text: "Without translation, two things go wrong. The upper layers start depending on lower-level types (a controller that catches `SQLException` breaks the day the repository moves to a REST call), and the low-level details leak outward, sometimes all the way to the client. Here's an order-tracking call with a database failure, handled by a leaky web layer and a safe one:",
        },
        {
          type: "code",
          language: "java",
          title: "Layers.java",
          code: `import java.sql.SQLException;
import java.sql.SQLTransientConnectionException;

public class Layers {
    // ---- repository layer: knows about SQL, translates it away ----
    static class DataAccessException extends RuntimeException {
        DataAccessException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static class OrderRepository {
        private final boolean databaseUp;

        OrderRepository(boolean databaseUp) {
            this.databaseUp = databaseUp;
        }

        // Stands in for JDBC code: the driver throws SQLException
        private String query(long orderId) throws SQLException {
            if (!databaseUp) {
                throw new SQLTransientConnectionException(
                        "FATAL: password authentication failed for user \\"orders_rw\\" (host 10.0.4.17:5432)",
                        "08001");
            }
            return "order-" + orderId;
        }

        String findStatus(long orderId) {
            try {
                return query(orderId) + ": SHIPPED";
            } catch (SQLException e) {
                throw new DataAccessException("order lookup failed for id " + orderId, e);
            }
        }
    }

    // ---- service layer: speaks the domain's language ----
    static class OrderServiceException extends RuntimeException {
        private final long orderId;

        OrderServiceException(long orderId, String message, Throwable cause) {
            super(message, cause);
            this.orderId = orderId;
        }

        long orderId() { return orderId; }
    }

    static class OrderService {
        private final OrderRepository repository;

        OrderService(OrderRepository repository) {
            this.repository = repository;
        }

        String track(long orderId) {
            try {
                return repository.findStatus(orderId);
            } catch (DataAccessException e) {
                throw new OrderServiceException(orderId, "tracking unavailable", e);
            }
        }
    }

    // ---- web layer, two versions ----
    static String leakyHandler(OrderService service, long orderId) {
        try {
            return "200 " + service.track(orderId);
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();
            }
            return "500 " + root.getMessage();          // sends the database's words to the client
        }
    }

    static String safeHandler(OrderService service, long orderId) {
        try {
            return "200 " + service.track(orderId);
        } catch (OrderServiceException e) {
            // full chain goes to the log, a short stable message goes to the client
            System.out.println("LOG  " + e + " (order " + e.orderId() + ")");
            for (Throwable c = e.getCause(); c != null; c = c.getCause()) {
                System.out.println("LOG    caused by " + c);
            }
            return "503 Order tracking is temporarily unavailable";
        }
    }

    public static void main(String[] args) {
        OrderService healthy = new OrderService(new OrderRepository(true));
        OrderService broken = new OrderService(new OrderRepository(false));

        System.out.println(safeHandler(healthy, 42));
        System.out.println("leaky -> " + leakyHandler(broken, 42));
        System.out.println("safe  -> " + safeHandler(broken, 42));
    }
}`,
        },
        {
          type: "output",
          text: `200 order-42: SHIPPED
leaky -> 500 FATAL: password authentication failed for user "orders_rw" (host 10.0.4.17:5432)
LOG  Layers$OrderServiceException: tracking unavailable (order 42)
LOG    caused by Layers$DataAccessException: order lookup failed for id 42
LOG    caused by java.sql.SQLTransientConnectionException: FATAL: password authentication failed for user "orders_rw" (host 10.0.4.17:5432)
safe  -> 503 Order tracking is temporarily unavailable`,
        },
        {
          type: "image",
          src: "/images/java/custom-exceptions-translation.svg",
          alt: "Three layers stacked left to right: OrderRepository, OrderService and the web handler. In the repository, a SQLTransientConnectionException with SQLState 08001 and a database message is caught and wrapped in DataAccessException. In the service, DataAccessException is caught and wrapped in OrderServiceException carrying orderId 42. Each wrapper holds the previous exception as its cause, drawn as a chain of arrows back to the SQL exception. From the web handler two paths leave: to the log goes the full chain of three exceptions; to the client goes only 503 Order tracking is temporarily unavailable. A crossed-out leaky path shows the raw database message reaching the client.",
          caption: "Each layer wraps, never discards. The chain goes to the log; only a stable message goes to the client.",
        },
        {
          type: "list",
          items: [
            "**The leaky handler sent the database's own error text to the client**: a database user name, an internal IP and a port. It did the \"helpful\" thing, finding the root cause, and pointed it in the wrong direction.",
            "**Each layer translated, and none discarded.** The log shows three exceptions, each in its own layer's words, ending with the real `SQLTransientConnectionException`. Nothing above the repository mentions `java.sql`.",
            "**The service exception carries the order id as a field**, so the log line and any metrics can use it without parsing a message.",
            "**The status changed from 500 to 503.** Once the failure has a type that means \"a dependency is down\", the edge can say so, and a client knows retrying later makes sense.",
          ],
        },
        {
          type: "paragraph",
          text: "Spring does the repository half for me: `JdbcTemplate` translates every `SQLException` it sees, and when a `PersistenceExceptionTranslationPostProcessor` is registered (Spring Boot registers one), beans annotated `@Repository` get a proxy that translates JPA and Hibernate exceptions, both into Spring's own unchecked `DataAccessException` hierarchy (`DuplicateKeyException`, `QueryTimeoutException` and so on), with the original as the cause. The Spring Data JPA track covers it. Translation in my own services is still mine to write.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "Translate at boundaries, not at every method",
          text: "Wrapping in every method produces chains ten exceptions deep that all say the same thing. I translate where the vocabulary changes, usually once per layer, and let exceptions that are already in the right vocabulary pass through untouched.",
        },
      ],
    },
    {
      title: "Sneaky Throw",
      blocks: [
        {
          type: "paragraph",
          text: "Internal Working showed that the JVM doesn't check `throws` clauses. Sneaky throw uses that from source code, with no separate compilation. It relies on two facts about generics: a type parameter in a `throws` clause is erased, and when the compiler has to infer a type variable that only appears in a `throws` clause, it picks `RuntimeException` (JLS 18.1.3 and 18.4).",
        },
        {
          type: "code",
          language: "java",
          title: "SneakyThrow.java",
          code: `import java.io.IOException;

public class SneakyThrow {
    // E appears only in the throws clause, so a plain call infers E = RuntimeException
    @SuppressWarnings("unchecked")
    static <E extends Throwable> RuntimeException sneaky(Throwable t) throws E {
        throw (E) t;                       // erased to (Throwable) t: no runtime check
    }

    static String readTitle(String isbn) {    // no throws clause, yet it throws IOException
        if (isbn.isEmpty()) {
            throw sneaky(new IOException("catalog file missing"));
        }
        return "Effective Java";
    }

    public static void main(String[] args) {
        System.out.println(readTitle("978-0134685991"));
        try {
            readTitle("");
        } catch (Exception e) {               // catch (IOException e) would not compile
            System.out.println("caught " + e.getClass().getName()
                    + ", is RuntimeException? " + (e instanceof RuntimeException));
        }
        readTitle("");
    }
}`,
        },
        {
          type: "output",
          text: `Effective Java
caught java.io.IOException, is RuntimeException? false
Exception in thread "main" java.io.IOException: catalog file missing
	at SneakyThrow.readTitle(SneakyThrow.java:12)
	at SneakyThrow.main(SneakyThrow.java:25)`,
        },
        {
          type: "paragraph",
          text: "How the trick works, step by step:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "At the call `sneaky(new IOException(...))`, nothing constrains `E` except its bound and the fact that it's thrown. The inference rule for such \"throws\" variables picks `RuntimeException`. So, as far as `javac` knows, this call throws an unchecked exception, and `readTitle` needs no `throws` clause.",
            "Inside `sneaky`, `(E) t` is an unchecked cast. After erasure, `E` is its bound, `Throwable`, and casting a `Throwable` to `Throwable` needs no instruction at all.",
            "At run time `athrow` throws the `IOException` object as it is. Nothing checks it against anything.",
            "The return type `RuntimeException` is only there so callers can write `throw sneaky(e);`, which tells the compiler the line never completes normally. `sneaky` never actually returns.",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p -v SneakyThrow`,
        },
        {
          type: "output",
          text: `  static <E extends java.lang.Throwable> java.lang.RuntimeException sneaky(java.lang.Throwable) throws E;
    descriptor: (Ljava/lang/Throwable;)Ljava/lang/RuntimeException;
    flags: (0x0008) ACC_STATIC
    Code:
      stack=1, locals=1, args_size=1
         0: aload_0
         1: athrow
    ...
    Exceptions:
      throws java.lang.Throwable
    Signature: #71                          // <E:Ljava/lang/Throwable;>(Ljava/lang/Throwable;)Ljava/lang/RuntimeException;^TE;`,
        },
        {
          type: "paragraph",
          text: "Two instructions: load the parameter, throw it. No `checkcast`. The `Exceptions` attribute holds the erasure, `Throwable`, and the generic `throws E` survives only in the `Signature` attribute (`^TE;`), which the compiler reads and the JVM ignores. The price shows up at the caller. `main` couldn't catch the `IOException` by name:",
        },
        {
          type: "code",
          language: "java",
          title: "SneakyCatch.java",
          code: `import java.io.IOException;

public class SneakyCatch {
    @SuppressWarnings("unchecked")
    static <E extends Throwable> RuntimeException sneaky(Throwable t) throws E {
        throw (E) t;
    }

    static String readTitle(String isbn) {
        throw sneaky(new IOException("catalog file missing"));
    }

    public static void main(String[] args) {
        try {
            readTitle("");
        } catch (IOException e) {
            System.out.println("handled");
        }
    }
}`,
        },
        {
          type: "output",
          text: `SneakyCatch.java:16: error: exception IOException is never thrown in body of corresponding try statement
        } catch (IOException e) {
          ^
1 error`,
        },
        {
          type: "callout",
          tone: "warning",
          title: "Why I'd avoid it",
          text: "Sneaky throw breaks the one promise checked exceptions make. Callers can't catch the exception by its type, `catch (RuntimeException e)` safety nets miss it, and a JDK dynamic proxy in the call path typically wraps it in `UndeclaredThrowableException`. Spring's `@Transactional` by default rolls back only on `RuntimeException` and `Error` (`DefaultTransactionAttribute.rollbackOn` is exactly that `instanceof` test), so a sneaky `IOException` would commit the transaction. Lombok's `@SneakyThrows` relies on the same gap: its documented equivalent is `throw Lombok.sneakyThrow(e);`, and `Lombok.sneakyThrow` is this generic cast. I'd only accept it in a tiny, well-tested utility where the exception is guaranteed to be caught as `Exception` nearby; for everything else `UncheckedIOException` or a custom unchecked wrapper says honestly what's happening.",
        },
        {
          type: "paragraph",
          text: "The JDK had a sneaky path of its own: `Class.newInstance()` propagated any exception from the no-arg constructor, checked ones included, without declaring them. That's one of the reasons it was deprecated in Java 9 in favour of `getDeclaredConstructor().newInstance()`, which wraps them in `InvocationTargetException`.",
        },
      ],
    },
    {
      title: "Exceptions from Constructors and Initializers",
      blocks: [
        {
          type: "paragraph",
          text: "Two earlier lessons cover the run-time story. The Constructors lesson's \"When a Constructor Throws\" section shows that a constructor that throws leaves the caller with no reference, unless `this` escaped first. The Static Keyword lesson shows a static initializer failing once with `ExceptionInInitializerError` and the class staying broken with `NoClassDefFoundError: Could not initialize class`. Here are the compile-time rules that go with `throws`.",
        },
        {
          type: "list",
          items: [
            "A **constructor** declares checked exceptions like a method, as `Library(String, boolean) throws IOException` did above.",
            "An **instance initializer block** may throw a checked exception only if every constructor of the class declares it (JLS 8.6). An anonymous class has no constructors I can write, so its initializers may throw anything.",
            "A **static initializer** can't throw a checked exception at all (JLS 8.7), because no code calls it that could catch it.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "InitBlock.java",
          code: `import java.io.IOException;

public class InitBlock {
    static class Report {
        final String header;

        {                                        // instance initializer
            if (System.getenv("NO_FONTS") != null) {
                throw new IOException("font files missing");
            }
            header = "Quarterly Report";
        }

        Report() throws IOException { }          // every constructor must declare it
        Report(int pages) { }                    // this one doesn't
    }
}`,
        },
        {
          type: "output",
          text: `InitBlock.java:9: error: unreported exception IOException; must be caught or declared to be thrown
                throw new IOException("font files missing");
                ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Deleting `Report(int pages)` makes it compile, because the only remaining constructor declares `IOException`. A static block that throws a checked exception has no such escape hatch, so the usual workaround is to catch it inside the block and rethrow it unchecked. That compiles, and a failure then surfaces at run time as `ExceptionInInitializerError`, as the Static Keyword lesson showed. The better fix is usually not to do I/O in a static initializer at all.",
        },
        {
          type: "heading",
          text: "Java 25: validate before super(...)",
        },
        {
          type: "paragraph",
          text: "Before Java 25, a subclass constructor couldn't throw on a bad argument until after `super(...)` had run, because the explicit constructor call had to be the first statement. Flexible constructor bodies (JEP 513, final in Java 25) allow statements before it, as long as they don't read the object under construction (assigning its fields is the one exception):",
        },
        {
          type: "code",
          language: "java",
          title: "EarlyCheck.java",
          code: `public class EarlyCheck {
    static class Employee {
        final String name;

        Employee(String name) {
            System.out.println("  Employee(" + name + ") runs");
            this.name = name;
        }
    }

    static class Manager extends Employee {
        final int reports;

        Manager(String name, int reports) {
            if (reports < 0) {                       // Java 25: allowed before super(...)
                throw new IllegalArgumentException("reports < 0 for " + name);
            }
            super(name);
            this.reports = reports;
        }
    }

    public static void main(String[] args) {
        System.out.println(new Manager("Asha", 4).reports);
        try {
            new Manager("Ravi", -1);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# JDK 25
javac EarlyCheck.java && java EarlyCheck
# JDK 21
javac EarlyCheck.java`,
        },
        {
          type: "output",
          text: `  Employee(Asha) runs
4
reports < 0 for Ravi
EarlyCheck.java:18: error: call to super must be first statement in constructor
            super(name);
                 ^
1 error`,
        },
        {
          type: "paragraph",
          text: "On JDK 25, `Employee(Ravi)` never ran: the bad argument was rejected before any part of the object was initialized. On JDK 21 the same file doesn't compile. The Constructors lesson covers what else the prologue may and may not do.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `ChainDemo.salaryKept(\"Asha,85k\")` from source to the printed trace:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time, the exception class.** `PayrollException` extends `Exception`, so `javac` treats it as checked. Its constructor passes `message` and `cause` to `super`, which ends in `Throwable(String, Throwable)`.",
            "**Compile time, the throwing method.** In `salaryKept`, the `throw new PayrollException(...)` inside the catch is a checked throw, so `javac` checks that the method's `throws` clause covers it; it does. It writes `PayrollException` into the method's `Exceptions` attribute, and `new`, `dup`, the message and cause loads, `invokespecial <init>` and `athrow` into its code. The `try` block's range and the `NumberFormatException` handler go into the exception table.",
            "**Compile time, the caller.** In `main`, the call to `salaryKept` can throw `PayrollException`, and `main` has a matching catch, so no `throws` clause is needed.",
            "**Run time.** `main` calls `salaryKept`, which calls `parseSalary`, which calls `Long.parseLong(\"85k\")`. Deep inside, `NumberFormatException.forInputString` creates the low-level exception; its constructor runs `fillInStackTrace()`, capturing six frames from `forInputString` down to `main`.",
            "`athrow` in `Long.parseLong` finds no handler there, so the frames of `parseLong`, `parseLong` and `parseSalary` are popped one by one. In `salaryKept`, the exception table entry for the `try` range matches `NumberFormatException`, and control jumps to the catch block with `e` holding the exception.",
            "The catch block builds the message `\"bad salary row: Asha,85k\"` and calls `new PayrollException(message, e)`. `Throwable`'s constructor sets `cause` to the sentinel `this`, captures a new two-frame trace (`salaryKept` line 27, `main` line 40), stores the message and finally overwrites `cause` with `e`.",
            "`athrow` throws the `PayrollException`. `salaryKept`'s own handler covers only the `try` range, so its frame is popped. `main`'s exception table matches `PayrollException`, and its catch block runs.",
            "`printStackTrace(System.out)` prints `toString()` and the two frames, then follows `getCause()`. For the cause, it builds the `StackTraceElement`s from the stored backtrace, compares them with the enclosing trace from the end, prints the five frames that differ and folds the shared `main` frame into `... 1 more`. `getCause()` on the `NumberFormatException` returns `null`, so the printout stops.",
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
          title: "ExceptionSyntax.java",
          code: `import java.io.IOException;

public class ExceptionSyntax {
    // 1. A custom checked exception: extends Exception
    static class ShelfMissingException extends Exception {
        ShelfMissingException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    // 2. A custom unchecked exception with a field: extends RuntimeException
    static class BookNotFoundException extends RuntimeException {
        private final String isbn;

        BookNotFoundException(String isbn) {
            super("no book with ISBN " + isbn);
            this.isbn = isbn;
        }

        String isbn() { return isbn; }
    }

    // 3. throws declares; throw throws
    static String readShelf(int shelf) throws IOException {
        if (shelf > 9) {
            throw new IOException("shelf " + shelf + " not in index");
        }
        return "shelf " + shelf;
    }

    // 4. Translate and chain: the IOException becomes the cause
    static String locate(int shelf) throws ShelfMissingException {
        try {
            return readShelf(shelf);
        } catch (IOException e) {
            throw new ShelfMissingException("cannot locate shelf " + shelf, e);
        }
    }

    // 5. Precise rethrow: catch (Exception e) but declare only IOException
    static String readLogged(int shelf) throws IOException {
        try {
            return readShelf(shelf);
        } catch (Exception e) {
            System.out.println("  log: " + e.getMessage());
            throw e;
        }
    }

    // 6. Unchecked: no throws clause required
    static String find(String isbn) {
        if (!isbn.startsWith("978")) {
            throw new BookNotFoundException(isbn);
        }
        return "found " + isbn;
    }

    public static void main(String[] args) {
        try {
            System.out.println(locate(3));
            System.out.println(locate(12));
        } catch (ShelfMissingException e) {
            System.out.println(e.getMessage() + " <- " + e.getCause().getMessage());
        }

        try {
            readLogged(10);
        } catch (IOException e) {
            System.out.println("caller got " + e.getClass().getSimpleName());
        }

        try {
            System.out.println(find("9780134685991"));
            find("12345");
        } catch (BookNotFoundException e) {
            System.out.println(e.getMessage() + " (isbn field: " + e.isbn() + ")");
        }

        // 7. initCause for an exception type without a cause constructor
        IllegalStateException late = new IllegalStateException("catalog offline");
        late.initCause(new IOException("disk full"));
        System.out.println(late + " caused by " + late.getCause());
    }
}`,
        },
        {
          type: "output",
          text: `shelf 3
cannot locate shelf 12 <- shelf 12 not in index
  log: shelf 10 not in index
caller got IOException
found 9780134685991
no book with ISBN 12345 (isbn field: 12345)
java.lang.IllegalStateException: catalog offline caused by java.io.IOException: disk full`,
        },
        {
          type: "paragraph",
          text: "Seven forms in one file: a checked and an unchecked custom exception, `throw` and `throws`, translation with a cause, a precise rethrow that declares only `IOException` despite catching `Exception`, an unchecked throw with no clause, and `initCause` on an exception created without a cause.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Walking a cause chain to the root",
        },
        {
          type: "paragraph",
          text: "A course enrollment fails three levels down. I print every link of the chain, then find the root cause with a loop that can't spin forever on a cycle:",
        },
        {
          type: "code",
          language: "java",
          title: "RootCause.java",
          code: `import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

public class RootCause {
    static class EnrollmentException extends RuntimeException {
        EnrollmentException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static int parseCredits(String raw) {
        return Integer.parseInt(raw);
    }

    static int loadCourse(String code, String rawCredits) {
        try {
            return parseCredits(rawCredits);
        } catch (NumberFormatException e) {
            throw new IllegalStateException("course " + code + " has bad credits", e);
        }
    }

    static void enroll(String student, String code, String rawCredits) {
        try {
            loadCourse(code, rawCredits);
        } catch (IllegalStateException e) {
            throw new EnrollmentException("cannot enroll " + student + " in " + code, e);
        }
    }

    // Walk to the end of the chain; the identity set guards against a cycle
    static Throwable rootCause(Throwable t) {
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        while (t.getCause() != null && seen.add(t)) {
            t = t.getCause();
        }
        return t;
    }

    public static void main(String[] args) {
        try {
            enroll("Asha", "CS101", "four");
        } catch (EnrollmentException e) {
            int level = 0;
            for (Throwable t = e; t != null; t = t.getCause()) {
                System.out.println("level " + level++ + ": " + t);
            }
            System.out.println("root: " + rootCause(e).getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `level 0: RootCause$EnrollmentException: cannot enroll Asha in CS101
level 1: java.lang.IllegalStateException: course CS101 has bad credits
level 2: java.lang.NumberFormatException: For input string: "four"
root: For input string: "four"`,
        },
        {
          type: "diagram",
          text: `EnrollmentException    "cannot enroll Asha in CS101"   level 0
  │ getCause()                                  what the user tried
  ▼
IllegalStateException  "course CS101 has bad credits"  level 1
  │ getCause()                                  which data was bad
  ▼
NumberFormatException  For input string: "four"       level 2
  │ getCause()                                  the exact value
  ▼
 null    the last non-null link is the root cause`,
          caption: "Each level answers a different question. Dropping any link loses its answer.",
        },
        {
          type: "paragraph",
          text: "The identity set uses `==`, not `equals`, because two different exceptions could in theory be equal under an overridden `equals`, and a cycle is about the same object. Apache Commons Lang's `ExceptionUtils.getRootCause` and Guava's `Throwables.getRootCause` do the same job, both with protection against cycles.",
        },
        {
          type: "heading",
          text: "An exception that carries a list of errors",
        },
        {
          type: "paragraph",
          text: "Validation should report every problem at once, not the first one. The exception carries the whole list, as an unmodifiable copy:",
        },
        {
          type: "code",
          language: "java",
          title: "ValidationErrors.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ValidationErrors {
    static final class InvalidStudentException extends RuntimeException {
        private final List<String> fieldErrors;

        InvalidStudentException(List<String> fieldErrors) {
            super(fieldErrors.size() + " invalid field(s): " + String.join("; ", fieldErrors));
            this.fieldErrors = List.copyOf(fieldErrors);      // defensive, unmodifiable copy
        }

        List<String> fieldErrors() {
            return fieldErrors;
        }
    }

    record Student(String name, String email, int age) {
        Student {
            List<String> errors = new ArrayList<>();
            if (name == null || name.isBlank()) errors.add("name: must not be blank");
            if (email == null || !email.contains("@")) errors.add("email: must contain @");
            if (age < 16) errors.add("age: must be at least 16, was " + age);
            if (!errors.isEmpty()) {
                InvalidStudentException e = new InvalidStudentException(errors);
                errors.clear();                                  // the exception is unaffected
                throw e;
            }
        }
    }

    public static void main(String[] args) {
        System.out.println(new Student("Asha", "asha@uni.edu", 19));
        try {
            new Student(" ", "ravi.uni.edu", 14);
        } catch (InvalidStudentException e) {
            System.out.println(e.getMessage());
            for (String error : e.fieldErrors()) {
                System.out.println("  - " + error);
            }
            try {
                e.fieldErrors().add("hacked");
            } catch (UnsupportedOperationException uoe) {
                System.out.println("fieldErrors() is read-only");
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `Student[name=Asha, email=asha@uni.edu, age=19]
3 invalid field(s): name: must not be blank; email: must contain @; age: must be at least 16, was 14
  - name: must not be blank
  - email: must contain @
  - age: must be at least 16, was 14
fieldErrors() is read-only`,
        },
        {
          type: "paragraph",
          text: "Clearing the original list after creating the exception changed nothing, because `List.copyOf` took a snapshot. And no catch block can add to the errors afterwards. That's the immutability rule from Writing Custom Exceptions applied to a collection field. The record's compact constructor is a natural place to throw: an invalid `Student` is never created.",
        },
        {
          type: "heading",
          text: "A checked exception with a real recovery path",
        },
        {
          type: "paragraph",
          text: "This is the case checked exceptions were designed for: the caller is expected to handle the outcome, and the exception's fields tell it how.",
        },
        {
          type: "code",
          language: "java",
          title: "LibraryCheckout.java",
          code: `import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LibraryCheckout {
    // Checked: a normal, expected outcome the caller must plan for
    static class BookUnavailableException extends Exception {
        private final String isbn;
        private final LocalDate dueBack;

        BookUnavailableException(String isbn, LocalDate dueBack) {
            super("book " + isbn + " is out until " + dueBack);
            this.isbn = isbn;
            this.dueBack = dueBack;
        }

        String isbn()       { return isbn; }
        LocalDate dueBack() { return dueBack; }
    }

    static class Library {
        private final Map<String, LocalDate> onLoan = new HashMap<>();
        private final List<String> waitlist = new ArrayList<>();

        void checkout(String isbn, LocalDate today) throws BookUnavailableException {
            LocalDate due = onLoan.get(isbn);
            if (due != null) {
                throw new BookUnavailableException(isbn, due);
            }
            onLoan.put(isbn, today.plusDays(14));
        }

        void waitFor(String isbn, String member) {
            waitlist.add(member + " -> " + isbn);
        }

        List<String> waitlist() {
            return waitlist;
        }
    }

    static String borrow(Library library, String member, String isbn, LocalDate today) {
        try {
            library.checkout(isbn, today);
            return member + " borrowed " + isbn;
        } catch (BookUnavailableException e) {
            library.waitFor(e.isbn(), member);                 // recover using the fields
            return member + " waitlisted, expected back " + e.dueBack();
        }
    }

    public static void main(String[] args) {
        Library library = new Library();
        LocalDate today = LocalDate.of(2026, 11, 13);
        System.out.println(borrow(library, "Asha", "978-0134685991", today));
        System.out.println(borrow(library, "Ravi", "978-0134685991", today.plusDays(2)));
        System.out.println("waitlist: " + library.waitlist());
    }
}`,
        },
        {
          type: "output",
          text: `Asha borrowed 978-0134685991
Ravi waitlisted, expected back 2026-11-27`,
        },
        {
          type: "output",
          text: `waitlist: [Ravi -> 978-0134685991]`,
        },
        {
          type: "paragraph",
          text: "`borrow` is the immediate caller and it has a sensible fallback, so the compiler forcing it to deal with `BookUnavailableException` is a help, not a nuisance. If the same exception had to travel through five layers before anyone could do something with it, that would be the sign to make it unchecked.",
        },
        {
          type: "heading",
          text: "Wrapping a checked exception for a lambda, and unwrapping it",
        },
        {
          type: "paragraph",
          text: "`Function.apply` declares no checked exceptions, so a lambda that reads files has to wrap `IOException`. Java 8 added a standard wrapper for exactly this:",
        },
        {
          type: "code",
          language: "java",
          title: "UncheckedWrap.java",
          code: `import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

public class UncheckedWrap {
    static String readChapter(String name) throws IOException {
        if (name.startsWith("missing")) {
            throw new IOException("no file " + name + ".md");
        }
        return name.toUpperCase();
    }

    // Function-style code can't throw IOException, so it travels inside UncheckedIOException
    static List<String> readAll(List<String> names) {
        return names.stream().map(name -> {
            try {
                return readChapter(name);
            } catch (IOException e) {
                throw new UncheckedIOException("reading " + name, e);
            }
        }).toList();
    }

    public static void main(String[] args) {
        System.out.println(readAll(List.of("intro", "basics")));
        try {
            readAll(List.of("intro", "missing-appendix"));
        } catch (UncheckedIOException e) {
            IOException original = e.getCause();               // typed: no cast needed
            System.out.println(e.getMessage() + " <- " + original.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `[INTRO, BASICS]
reading missing-appendix <- no file missing-appendix.md`,
        },
        {
          type: "paragraph",
          text: "`UncheckedIOException` overrides `getCause()` with a covariant return type, `IOException`, and its constructors accept only an `IOException` cause, so the unwrapping side needs no cast. That's a pattern worth copying in a custom wrapper. JDK methods like `Files.lines` and `BufferedReader.lines` use this exception for the same reason. The Exception Handling Best Practices lesson has the wider set of options for lambdas and streams.",
        },
      ],
    },
    {
      title: "When to Use Custom Exceptions (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "The first decision isn't checked or unchecked. It's whether a new class is needed at all. The JDK's standard exceptions already have well-known meanings, and a reader who sees `IllegalArgumentException` knows what happened without opening a file.",
        },
        {
          type: "table",
          headers: ["Situation", "What I throw", "Why"],
          rows: [
            ["A caller passed a bad argument", "`IllegalArgumentException` (or `NullPointerException` via `Objects.requireNonNull`)", "A bug in the caller; everybody knows the type"],
            ["The object is in the wrong state for this call", "`IllegalStateException`", "\"Not now\", not \"not ever\""],
            ["An operation isn't supported by this implementation", "`UnsupportedOperationException`", "The collections convention"],
            ["A business rule failed and someone will react to it", "A custom exception with fields", "Callers and the web edge need the type and the data"],
            ["A low-level exception crosses a layer boundary", "A custom exception of the upper layer, with the cause", "Translation without leaking"],
            ["The caller has a realistic recovery and is the immediate caller", "A custom **checked** exception", "The compiler reminder is useful"],
            ["Many layers away from any recovery", "A custom **unchecked** exception", "No `throws` clauses copied through every layer"],
            ["A failure only a human will read", "A standard exception with a good message", "A new class adds nothing a message doesn't"],
          ],
        },
        {
          type: "diagram",
          text: `Something went wrong. Is it the caller's bug?
│
├─ yes ─► standard exception: IllegalArgumentException,
│         IllegalStateException, NullPointerException
│
└─ no ──► will any code treat it differently from other failures
          (catch it, map it to a status, read its fields)?
          ├─ no ──► standard exception, good message
          └─ yes ─► custom exception, named for the problem
                    │
                    └─ can the immediate caller recover?
                       ├─ yes, small API ─► checked
                       │                    (extends Exception)
                       └─ no, or crosses ─► unchecked (extends
                          layers            AppException or
                                            RuntimeException)`,
          caption: "A new exception class has to earn its place by being handled differently.",
        },
        {
          type: "list",
          items: [
            "If no catch block, mapper or test would ever single it out, it doesn't need its own class.",
            "If code would have to parse the message to react, it needs its own class with fields.",
            "A checked exception for a programming error is the worst of both: callers are forced to write a catch block, and there's nothing sensible to put in it.",
            "Custom exceptions go into the application's hierarchy, not straight under `Exception`, so one handler at the edge can cover them all.",
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice",
        },
        {
          type: "paragraph",
          text: "A shopping cart. The wrong version uses a checked custom exception for a bad quantity, which is a caller bug. The compiler forces every caller to catch it, and the catch block that gets written is the one that \"can't happen\". The right version uses `IllegalArgumentException` for the bug and an unchecked domain exception with fields for the real business rule:",
        },
        {
          type: "code",
          language: "java",
          title: "ExceptionChoice.java",
          code: `import java.util.Map;

public class ExceptionChoice {
    // ---------- wrong choice: a checked custom exception for a caller's bug ----------
    static class InvalidQuantityException extends Exception {
        InvalidQuantityException(String message) {
            super(message);
        }
    }

    static class WrongCart {
        int totalPaise;

        void add(String sku, int qty, int unitPaise) throws InvalidQuantityException {
            if (qty <= 0) {
                throw new InvalidQuantityException("qty " + qty);
            }
            totalPaise += qty * unitPaise;
        }
    }

    // ---------- right choice: standard exception for the bug, domain exception for the rule ----------
    static class OutOfStockException extends RuntimeException {
        private final String sku;
        private final int available;

        OutOfStockException(String sku, int requested, int available) {
            super("only " + available + " of " + sku + " in stock, " + requested + " requested");
            this.sku = sku;
            this.available = available;
        }

        String sku()   { return sku; }
        int available() { return available; }
    }

    static class Cart {
        static final Map<String, Integer> STOCK = Map.of("SKU-1", 10, "SKU-2", 10, "SKU-3", 3);
        int totalPaise;

        void add(String sku, int qty, int unitPaise) {
            if (qty <= 0) {
                throw new IllegalArgumentException("quantity must be positive for " + sku + ", was " + qty);
            }
            int available = STOCK.getOrDefault(sku, 0);
            if (qty > available) {
                throw new OutOfStockException(sku, qty, available);
            }
            totalPaise += qty * unitPaise;
        }
    }

    public static void main(String[] args) {
        WrongCart wrong = new WrongCart();
        int[][] lines = {{1, 2, 100}, {2, -2, 250}, {3, 1, 300}};
        for (int[] line : lines) {
            try {
                wrong.add("SKU-" + line[0], line[1], line[2]);
            } catch (InvalidQuantityException e) {
                // "can't happen": the compiler made me write this block
            }
        }
        System.out.println("wrong: total " + wrong.totalPaise + " paise, no error anywhere");

        Cart cart = new Cart();
        try {
            for (int[] line : lines) {
                cart.add("SKU-" + line[0], line[1], line[2]);
            }
        } catch (IllegalArgumentException e) {
            System.out.println("right: " + e);
        }

        try {
            cart.add("SKU-3", 5, 300);
        } catch (OutOfStockException e) {
            System.out.println("right: " + e.getMessage() + ", adding " + e.available() + " instead");
            cart.add(e.sku(), e.available(), 300);
        }
        System.out.println("right: total " + cart.totalPaise + " paise");
    }
}`,
        },
        {
          type: "output",
          text: `wrong: total 500 paise, no error anywhere
right: java.lang.IllegalArgumentException: quantity must be positive for SKU-2, was -2
right: only 3 of SKU-3 in stock, 5 requested, adding 3 instead
right: total 1100 paise`,
        },
        {
          type: "list",
          items: [
            "**Wrong:** the `-2` line was silently skipped and the cart totalled `500` paise with no error anywhere. The checked exception didn't make the code safer; it made swallowing the bug the path of least resistance.",
            "**Right, the bug:** the bad quantity surfaced as an `IllegalArgumentException` with the SKU and the value, and stopped the loop. Nobody was forced to catch it, so nobody hid it.",
            "**Right, the rule:** `OutOfStockException` carried `sku` and `available`, and the caller used them to add the three that were left. That reaction would have needed message parsing with a generic exception. (The `1100` is `2 x 100` from the first line plus `3 x 300`.)",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Dropping the cause",
        },
        {
          type: "paragraph",
          text: "`throw new SomeException(\"failed\")` inside a catch block, or `new SomeException(e.getMessage())`. The `ChainDemo` trace without `Caused by:` is what's left. It's the most common exception bug I know of, and the production section shows what it does to an incident.",
        },
        {
          type: "heading",
          text: "Forgetting to pass the message to super",
        },
        {
          type: "code",
          language: "java",
          title: "ForgotSuper.java",
          code: `public class ForgotSuper {
    static class CourseFullException extends RuntimeException {
        private final String courseCode;

        CourseFullException(String message, String courseCode) {
            this.courseCode = courseCode;                    // message never reaches Throwable
        }
    }

    public static void main(String[] args) {
        try {
            throw new CourseFullException("CS101 is full (60/60)", "CS101");
        } catch (CourseFullException e) {
            System.out.println("getMessage(): " + e.getMessage());
            System.out.println("toString():   " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `getMessage(): null
toString():   ForgotSuper$CourseFullException`,
        },
        {
          type: "paragraph",
          text: "It compiles because the implicit `super()` call is to the no-arg constructor, which exists. The `message` parameter is simply unused. The fix is `super(message);` as the first line.",
        },
        {
          type: "heading",
          text: "Extending Throwable (or Error) directly",
        },
        {
          type: "code",
          language: "java",
          title: "ExtendsThrowable.java",
          code: `public class ExtendsThrowable {
    static class PaymentDeclined extends Throwable {       // should extend Exception
        PaymentDeclined(String message) {
            super(message);
        }
    }

    static void charge(long amount) throws PaymentDeclined {
        throw new PaymentDeclined("card declined for " + amount);
    }

    public static void main(String[] args) throws Throwable {
        try {
            charge(4_999);
        } catch (Exception e) {                             // the usual safety net
            System.out.println("handled: " + e.getMessage());
        }
        System.out.println("order confirmed");
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" ExtendsThrowable$PaymentDeclined: card declined for 4999
	at ExtendsThrowable.charge(ExtendsThrowable.java:9)
	at ExtendsThrowable.main(ExtendsThrowable.java:14)`,
        },
        {
          type: "paragraph",
          text: "A direct subclass of `Throwable` is checked, but it isn't an `Exception`, so every `catch (Exception e)` in the codebase, and every framework handler written the same way, lets it through. `Error` subclasses have the same problem and also signal \"the JVM is in trouble\" to anyone reading the trace. Application exceptions extend `Exception` or `RuntimeException`, nothing else.",
        },
        {
          type: "heading",
          text: "throws Exception everywhere",
        },
        {
          type: "code",
          language: "java",
          title: "ThrowsEverything.java",
          code: `public class ThrowsEverything {
    interface Notifier {
        void send(String to, String message) throws Exception;   // "something might fail"
    }

    static class EmailNotifier implements Notifier {
        @Override
        public void send(String to, String message) {
            String domain = to.substring(to.indexOf('@') + 1);
            System.out.println("sent to " + domain.toUpperCase() + ": " + message);
        }
    }

    public static void main(String[] args) {
        Notifier notifier = new EmailNotifier();
        String[] recipients = {"asha@example.com", null};
        for (String to : recipients) {
            try {
                notifier.send(to, "Your order has shipped");
            } catch (Exception e) {                                // forced, and catches bugs too
                System.out.println("notification failed, will retry later");
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `sent to EXAMPLE.COM: Your order has shipped
notification failed, will retry later`,
        },
        {
          type: "paragraph",
          text: "The second failure was a `NullPointerException`, a bug, but `throws Exception` forced every caller to write `catch (Exception e)`, and that catch block can't tell a bug from a delivery failure. It reported \"will retry later\" for something no retry will fix. Declaring the specific exceptions, or a custom `NotificationException`, keeps bugs out of the recovery path.",
        },
        {
          type: "heading",
          text: "Smaller ones, each shown earlier",
        },
        {
          type: "list",
          items: [
            "**Reassigning the catch parameter before rethrowing.** `e = new IOException(\"wrapped\", e); throw e;` switched off precise rethrow in `LostPrecision` and produced `unreported exception Exception`. A new exception gets its own `throw` statement.",
            "**Declaring a broader exception in an override.** `NetworkPrinter.print` declaring `throws Exception` over `throws IOException` failed with `overridden method does not throw Exception`. The usual fix is to translate inside the override into an exception the parent allows.",
            "**Calling initCause after a cause constructor.** It throws `IllegalStateException: Can't overwrite cause`, even when the constructor got `null`, as cases 3 and 4 of `InitCauseDemo` showed.",
            "**Catching a sneaky-thrown exception by type.** `catch (IOException e)` around it is a compile error, as `SneakyCatch` showed. The only way to catch it is `catch (Exception e)` plus `instanceof`.",
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
            "Prefer standard exceptions (`IllegalArgumentException`, `IllegalStateException`, `UnsupportedOperationException`, `NoSuchElementException`) until some code needs to treat a failure differently.",
            "Name custom exceptions for the problem, end the name with `Exception`, and extend `Exception` or `RuntimeException`, never `Throwable` or `Error`.",
            "Always pass the cause when throwing from a catch block: `throw new X(\"what failed here, with context\", e)`.",
            "Put context in the message (ids, values, limits) and in final fields when code needs to react. Carry ids, not whole entities.",
            "Keep exceptions immutable: final fields, no setters, defensive copies of collections.",
            "Use checked exceptions only when the immediate caller has a realistic recovery path; use unchecked ones for bugs and for failures handled far away.",
            "Give the application one unchecked base exception with a stable error code, a few categories by client reaction, and map them in one place at the edge.",
            "Translate exceptions at layer boundaries, and never send a low-level message, a stack trace or a class name to a client.",
            "Don't declare `throws Exception` on an API. Declare what can actually happen.",
            "Rethrow with `throw e;` and leave the catch parameter alone, so precise rethrow keeps the declared types narrow.",
            "Document exceptions with `@throws` in Javadoc, including the unchecked ones callers should know about.",
            "Skip the stack trace (`super(msg, null, false, false)`) only for expected, high-frequency outcomes that never reach a log.",
            "Avoid sneaky throw outside a tiny utility; prefer `UncheckedIOException` or a custom unchecked wrapper.",
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
            "A `throws` clause costs nothing at run time. It's an attribute the JVM never reads during execution, as the `Catalog` demo showed.",
            "A `try` block costs essentially nothing when no exception is thrown: there's no instruction for entering it. The exception table is only consulted when something is thrown (the try, catch and finally lesson shows the table).",
            "The cost of an exception is mostly in **creating** it: `fillInStackTrace()` walks every frame on the thread's stack, so the price grows with stack depth, and building `StackTraceElement` objects is a second cost paid only when something reads or prints the trace. The Exceptions and the Exception Hierarchy lesson measures both; I won't repeat the benchmark here.",
            "For a custom exception, that means the stackless constructor from Internal Working is the one design lever. `Stackless` showed what it gives up: no frames at all, so it only fits an expected, high-frequency outcome that never reaches a log. A Spring request thread can easily be 100 or more frames deep, so the difference is real when such an exception is thrown thousands of times a second.",
            "Usually the better fix is not to use an exception for an expected outcome at all. The Exception Handling Best Practices lesson compares exceptions with `Optional` and result types, and covers HotSpot's `OmitStackTraceInFastThrow`.",
            "Chains add a little memory per link but don't change the per-throw cost much; each wrapper captures its own trace, usually shorter than the cause's.",
          ],
        },
      ],
    },
    {
      title: "Custom Exceptions in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The exception bug I'd most expect in a backend isn't a crash. It's an exception that destroys its own evidence. Picture a ride-hailing booking service: a rider asks for a cab, the service asks a geo index for drivers within 3 km of the pickup zone, and assigns one. Two very different things can fail. The geo index can time out (an infrastructure problem: page someone), or the zone can simply have no drivers online (a business outcome: tell the rider to try again). Here's a service that turns both into `RuntimeException(\"error\")`, and the fix with a small domain hierarchy.",
        },
        {
          type: "paragraph",
          text: "The fixed version renders its API error body with real Jackson 2.21.7 (Maven `com.fasterxml.jackson.core:jackson-databind:2.21.7`, which brings `jackson-core` and `jackson-annotations`). `$JACKSON` below is the classpath of those three JARs.",
        },
        {
          type: "code",
          language: "java",
          title: "BookingErrors.java",
          code: `import java.net.SocketTimeoutException;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;

public class BookingErrors {
    record BookingRequest(String riderId, String zone, LocalDateTime requestedAt) { }

    // The low-level client: a geo index over the network, with a checked exception
    static class DriverLocator {
        List<String> nearbyDrivers(String zone, int radiusMeters) throws SocketTimeoutException {
            if (zone.equals("KOL-NEWTOWN")) {
                throw new SocketTimeoutException("Read timed out");     // geo index too slow
            }
            if (zone.equals("KOL-SALTLAKE")) {
                return List.of();                                       // nobody online nearby
            }
            return List.of("driver-17", "driver-42");
        }
    }

    // ---------------- BEFORE: one generic exception, cause dropped ----------------
    static class BookingServiceBefore {
        private final DriverLocator locator = new DriverLocator();

        String book(BookingRequest request) {
            try {
                List<String> drivers = locator.nearbyDrivers(request.zone(), 3_000);
                if (drivers.isEmpty()) {
                    throw new RuntimeException("error");
                }
                return drivers.get(0);
            } catch (Exception e) {
                throw new RuntimeException("error");
            }
        }
    }

    // ---------------- AFTER: a small domain hierarchy that keeps the cause ----------------
    abstract static class BookingException extends RuntimeException {
        private final String code;
        private final String riderId;

        BookingException(String code, String riderId, String message, Throwable cause) {
            super(message, cause);
            this.code = code;
            this.riderId = riderId;
        }

        String code()    { return code; }
        String riderId() { return riderId; }
    }

    static final class NoDriverAvailableException extends BookingException {
        private final String zone;
        private final LocalDateTime requestedAt;

        NoDriverAvailableException(BookingRequest r, int radiusMeters) {
            super("NO_DRIVER_AVAILABLE", r.riderId(),
                    "no driver within " + radiusMeters + " m in " + r.zone() + " at " + r.requestedAt(), null);
            this.zone = r.zone();
            this.requestedAt = r.requestedAt();
        }

        String zone()              { return zone; }
        LocalDateTime requestedAt() { return requestedAt; }
    }

    static final class DriverLookupFailedException extends BookingException {
        private final String zone;

        DriverLookupFailedException(BookingRequest r, Throwable cause) {
            super("DRIVER_LOOKUP_FAILED", r.riderId(), "driver lookup failed in " + r.zone(), cause);
            this.zone = r.zone();
        }

        String zone() { return zone; }
    }

    static class BookingServiceAfter {
        private static final int RADIUS_METERS = 3_000;
        private final DriverLocator locator = new DriverLocator();

        String book(BookingRequest request) {
            List<String> drivers;
            try {
                drivers = locator.nearbyDrivers(request.zone(), RADIUS_METERS);
            } catch (SocketTimeoutException e) {
                throw new DriverLookupFailedException(request, e);           // translate, keep cause
            }
            if (drivers.isEmpty()) {
                throw new NoDriverAvailableException(request, RADIUS_METERS);  // a business outcome
            }
            return drivers.get(0);
        }
    }

    // What the API returns: stable code and safe details, never the raw exception
    record ErrorBody(int status, String code, String message, String zone) { }

    static final ObjectMapper JSON = new ObjectMapper();

    static String toResponse(BookingException e) throws Exception {
        ErrorBody body = switch (e) {
            case NoDriverAvailableException n -> new ErrorBody(409, n.code(),
                    "No drivers nearby right now. Please try again in a few minutes.", n.zone());
            case DriverLookupFailedException d -> new ErrorBody(503, d.code(),
                    "We couldn't search for drivers. Please retry.", d.zone());
            default -> new ErrorBody(500, e.code(), "Booking failed.", null);
        };
        return JSON.writeValueAsString(body);
    }

    public static void main(String[] args) throws Exception {
        LocalDateTime at = LocalDateTime.of(2026, 11, 13, 21, 40);
        List<BookingRequest> requests = List.of(
                new BookingRequest("rider-501", "KOL-NEWTOWN", at),
                new BookingRequest("rider-502", "KOL-SALTLAKE", at));

        System.out.println("===== BEFORE =====");
        BookingServiceBefore before = new BookingServiceBefore();
        for (BookingRequest r : requests) {
            try {
                before.book(r);
            } catch (RuntimeException e) {
                System.out.println("ERROR booking failed");
                e.printStackTrace(System.out);
            }
        }

        System.out.println("===== AFTER =====");
        BookingServiceAfter after = new BookingServiceAfter();
        for (BookingRequest r : requests) {
            try {
                after.book(r);
            } catch (NoDriverAvailableException e) {
                System.out.println("WARN  " + e.code() + " rider=" + e.riderId() + " zone=" + e.zone()
                        + " at=" + e.requestedAt());
                System.out.println("HTTP  " + toResponse(e));
            } catch (BookingException e) {
                System.out.println("ERROR " + e.code() + " rider=" + e.riderId());
                e.printStackTrace(System.out);
                System.out.println("HTTP  " + toResponse(e));
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$JACKSON" BookingErrors.java
java -cp "$JACKSON:." BookingErrors`,
        },
        {
          type: "output",
          text: `===== BEFORE =====
ERROR booking failed
java.lang.RuntimeException: error
	at BookingErrors$BookingServiceBefore.book(BookingErrors.java:35)
	at BookingErrors.main(BookingErrors.java:125)
ERROR booking failed
java.lang.RuntimeException: error
	at BookingErrors$BookingServiceBefore.book(BookingErrors.java:35)
	at BookingErrors.main(BookingErrors.java:125)
===== AFTER =====
ERROR DRIVER_LOOKUP_FAILED rider=rider-501
BookingErrors$DriverLookupFailedException: driver lookup failed in KOL-NEWTOWN
	at BookingErrors$BookingServiceAfter.book(BookingErrors.java:90)
	at BookingErrors.main(BookingErrors.java:136)
Caused by: java.net.SocketTimeoutException: Read timed out
	at BookingErrors$DriverLocator.nearbyDrivers(BookingErrors.java:14)
	at BookingErrors$BookingServiceAfter.book(BookingErrors.java:88)
	... 1 more
HTTP  {"status":503,"code":"DRIVER_LOOKUP_FAILED","message":"We couldn't search for drivers. Please retry.","zone":"KOL-NEWTOWN"}
WARN  NO_DRIVER_AVAILABLE rider=rider-502 zone=KOL-SALTLAKE at=2026-11-13T21:40
HTTP  {"status":409,"code":"NO_DRIVER_AVAILABLE","message":"No drivers nearby right now. Please try again in a few minutes.","zone":"KOL-SALTLAKE"}`,
        },
        {
          type: "list",
          items: [
            "**The two BEFORE traces are identical, character for character.** A geo-index timeout in one zone and an empty zone in another both became `RuntimeException: error` at line 35. Even the \"no driver\" exception thrown on line 31 was caught by the same `catch (Exception e)` and replaced. Someone on call reading this log has no zone, no rider, no cause, and no way to tell an outage from a quiet evening.",
            "**The catch-all also erased the difference between a failure and a bug.** `catch (Exception e)` would have replaced a `NullPointerException` from a bug in the same way, with the same message.",
            "**AFTER, the timeout keeps its cause.** It's a `DriverLookupFailedException` wrapping the `SocketTimeoutException`. The log shows where the booking failed (line 90), what the low-level failure was, and where it happened (line 14 in `nearbyDrivers`). That's the line that tells someone to look at the geo index, not the booking code.",
            "**The empty zone is a business outcome**: a `NoDriverAvailableException` with `zone` and `requestedAt` fields, logged as a one-line `WARN` with no stack trace, because it isn't a malfunction. Those fields are also what a metric like \"no-driver events per zone per hour\" would be built from, with no message parsing.",
            "**The client gets a stable code, a human message and the zone, never the exception.** Jackson serialized the `ErrorBody` record (records are supported since Jackson 2.12), and the 503 against the 409 tells the app whether retrying immediately makes sense.",
            "**The mapping has a default branch**: the `switch` in `toResponse` needs one because `BookingException` isn't sealed here, so a new subclass falls back to a 500 instead of failing to compile. Sealing the base, as in `AppErrors`, would trade that flexibility for exhaustiveness.",
          ],
        },
        {
          type: "paragraph",
          text: "In a Spring Boot service, the `catch` blocks in `main` would move to a `@RestControllerAdvice` with one `@ExceptionHandler` per category, and the logging would go through SLF4J with the exception as the last argument so the full chain is printed. The Exception Handling Best Practices lesson builds that version. The part that has to be right first is the part shown here: the service throws a specific exception, with fields, and with the cause.",
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
              question: "What is the difference between throw and throws?",
              answer:
                "`throw` is a statement that raises one exception object right now: `throw new IllegalArgumentException(\"amount must be positive\")`. `throws` is a clause in a method or constructor declaration that lists the checked exceptions that can escape it: `String loadCatalog(String path) throws IOException`.\n\n`throw` acts at run time; it compiles to the `athrow` instruction. `throws` acts at compile time; it compiles to the method's `Exceptions` attribute, which `javap -v` showed as `throws java.io.IOException, java.lang.InterruptedException` for my `Declared.load`.",
            },
            {
              question: "Can you throw any object in Java?",
              answer:
                "No, only instances of `Throwable` or its subclasses. `throw \"age cannot be negative\";` failed to compile with \"incompatible types: String cannot be converted to Throwable\".\n\nThe one odd case is `null`: `throw null;` compiles, because `null` is assignable to `Throwable`, and at run time the JVM throws a `NullPointerException` instead. JDK 21 even explains it: `Cannot throw exception because \"null\" is null`.",
            },
            {
              question: "How do you create a custom exception?",
              answer:
                "Write a class that extends `Exception` for a checked exception or `RuntimeException` for an unchecked one, and pass the message and cause to `super(...)`. Add final fields for any context code will need, and a `serialVersionUID` because `Throwable` is serializable.\n\nMy `InsufficientFundsException` extends `Exception`, builds its message in the constructor from `accountId`, the requested amount and the available amount, and exposes `shortfallPaise()`. The caller printed \"short by 30000 paise on ACC-42\" from the fields without parsing the message.",
            },
            {
              question: "When does a method have to declare an exception with throws?",
              answer:
                "When a checked exception can escape it, either thrown directly or coming from a call it doesn't catch. Unchecked exceptions, `RuntimeException`, `Error` and their subclasses, never need declaring.\n\nWhen I recompiled `Reader` against the version of `Catalog.title` that declares `IOException`, the call that `Reader` neither caught nor declared failed with \"unreported exception IOException; must be caught or declared to be thrown\". `BankAccount.withdraw` threw `IllegalArgumentException` and `IllegalStateException` with no clause at all.",
            },
            {
              question: "Can a constructor have a throws clause?",
              answer:
                "Yes, exactly like a method. Every `new` expression for it then has to handle or declare those checked exceptions. If the constructor throws, the caller never gets a reference to the object.\n\nMy `Library(String name, boolean shelvesReachable) throws IOException` threw for the branch library, and the catch block printed \"cannot reach the shelf index for Branch Library\" with no `Library` object ever assigned.",
            },
            {
              question: "What happens to the code after a throw statement?",
              answer:
                "It never runs. A `throw` always completes abruptly, so the compiler rejects a statement right after it in the same block with \"unreachable statement\", which is what `AfterThrow` got.\n\nThe flip side is useful: a non-void method that ends in a `throw` needs no `return`, because its end is unreachable. That's also why a `switch` expression arm can be `default -> throw new IllegalArgumentException(...)`.",
            },
            {
              question: "What does getCause() return?",
              answer:
                "The exception that caused this one, set through a cause constructor like `new PayrollException(message, e)` or through `initCause`, or `null` if there isn't one.\n\nIn `ChainDemo`, `getCause()` on the `PayrollException` returned the `NumberFormatException` for \"85k\", and `printStackTrace` printed it under `Caused by:`. Internally, `getCause()` returns `null` when the private `cause` field still holds the sentinel `this`.",
            },
            {
              question: "Why should a custom exception's constructor call super(message)?",
              answer:
                "Because `Throwable` stores the message. A subclass that keeps the message in its own field, or ignores it, leaves `getMessage()` returning `null`, and every log line shows only the class name.\n\nMy `CourseFullException` forgot it, compiled fine through the implicit `super()`, and printed `getMessage(): null`. The same applies to the cause: it has to reach `super(message, cause)` to show up as `Caused by:`.",
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
              question: "Should a custom exception be checked or unchecked? How do you decide?",
              answer:
                "Checked when the failure is an expected outcome of a correct call and the immediate caller can realistically recover. Unchecked when it signals a bug, or when the only sensible handling is far away, like a global handler that maps it to an HTTP status.\n\n`BookUnavailableException` is checked because `borrow` handles it on the spot by waitlisting the member. In `ExceptionChoice`, a checked exception for a bad quantity led to an empty \"can't happen\" catch block and a silently wrong total of 500 paise; `IllegalArgumentException` surfaced the bug instead. Most modern backends, Spring included, make application exceptions unchecked.",
            },
            {
              question: "What is exception chaining, and why does it matter?",
              answer:
                "Wrapping a caught exception as the cause of a new one: `throw new PayrollException(\"bad salary row: \" + csvLine, e)`. The new exception describes the failure at this level; the cause keeps the original type, message and stack trace.\n\nWithout it, the evidence is gone. My `salaryLost` trace said only \"bad salary row\" with two frames. `salaryKept` printed a `Caused by: java.lang.NumberFormatException: For input string: \"85k\"` section with the frames down to `Long.parseLong`.",
            },
            {
              question: "What's the difference between initCause and the cause constructor?",
              answer:
                "Both set the cause, but `initCause` is for exceptions created without one, and it works exactly once. After a cause constructor, even one given `null`, `initCause` throws `IllegalStateException`.\n\n`InitCauseDemo` showed all the rules: the first `initCause` worked, the second gave \"Can't overwrite cause with java.lang.RuntimeException: second\", a `null` cause from the constructor counted as set, and `self.initCause(self)` gave \"Self-causation not permitted\". The trick behind it is the `cause = this` sentinel the constructor stores.",
            },
            {
              question: "What is precise rethrow?",
              answer:
                "A Java 7 rule (JSR 334, JLS 11.2.2): when a catch parameter is final or effectively final, `throw e;` is treated as throwing only the checked exceptions the `try` block can actually throw, not the declared type of `e`. So `catch (Exception e) { log; throw e; }` can sit in a method that declares only `throws IOException, ParseException`.\n\n`PreciseRethrow.importLogged` did exactly that and its callers kept separate catches for the two types. Assigning to `e` before rethrowing broke it: `LostPrecision` failed with \"unreported exception Exception\".",
            },
            {
              question: "What is exception translation?",
              answer:
                "Catching an exception at a layer boundary and rethrowing it as an exception from the upper layer's vocabulary, with the original as the cause. Effective Java calls it throwing exceptions appropriate to the abstraction.\n\nIn `Layers`, the repository turned a `SQLException` into a `DataAccessException`, and the service turned that into an `OrderServiceException` with an `orderId` field. The log kept all three, and the client got \"503 Order tracking is temporarily unavailable\" instead of the database's password-failure message.",
            },
            {
              question: "Should custom exceptions carry fields? Which ones?",
              answer:
                "Yes, whenever code needs to react to the failure: identifiers, limits, counts, an error code. They should be final, small and serializable: ids rather than whole entities, and immutable copies of collections.\n\n`OutOfStockException` carried `sku` and `available`, and the cart added the three remaining units without parsing a message. With a whole `Order` as a field, `javac -Xlint:serial` warned about a non-serializable field in a serializable class.",
            },
            {
              question: "What are the rules for throws when overriding a method?",
              answer:
                "The override may declare the same checked exceptions, subclasses of them, fewer, or none. It may not add new or broader checked exceptions. Unchecked exceptions are unrestricted. The reason is substitutability: a caller holding the parent type only prepared for the parent's list.\n\nIn `OverrideThrows`, narrower `FileNotFoundException`, no clause, and unchecked `IllegalStateException` all compiled; `throws Exception` over `throws IOException` failed with \"overridden method does not throw Exception\".",
            },
            {
              question: "What does \"... 1 more\" mean in a stack trace?",
              answer:
                "In a `Caused by:` section, `printStackTrace` compares the cause's frames with the enclosing exception's frames from the bottom up. The frames they share are printed once, in the enclosing trace, and counted as `... n more` in the cause.\n\nIn `ChainDemo`, the cause and the wrapper shared only `ChainDemo.main` at line 40, so the cause section printed its five other frames and `... 1 more`. The frame just above, `salaryKept` at line 25, differs from the wrapper's line 27 and is printed.",
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
              question: "Does the JVM enforce throws clauses at run time?",
              answer:
                "No. Checked exceptions are a compile-time feature of the Java language (JLS 11.2). The `throws` clause is stored in the `Exceptions` attribute, and `athrow` never looks at it; it isn't even part of the method descriptor used for linking.\n\nI compiled `Reader` against a `Catalog.title` that declared nothing, then swapped in a version declaring and throwing `IOException`. `Reader` ran without recompiling and died with `java.io.IOException: catalog file missing`, and its `catch (RuntimeException e)` didn't catch it. Recompiling `Reader` brought back the \"unreported exception IOException\" error.",
            },
            {
              question: "What is sneaky throw, and how does it work?",
              answer:
                "A way to throw a checked exception from a method that doesn't declare it, using generics: `static <E extends Throwable> RuntimeException sneaky(Throwable t) throws E { throw (E) t; }`. A type variable that only appears in a `throws` clause is inferred as `RuntimeException` (JLS 18), so the compiler thinks the call throws something unchecked, and the cast `(E) t` erases to `Throwable`, so nothing is checked at run time.\n\n`javap` showed the method body as just `aload_0` and `athrow`, with `throws java.lang.Throwable` in the `Exceptions` attribute. The cost is at the caller: `catch (IOException e)` around it is a compile error, \"exception IOException is never thrown in body of corresponding try statement\". Lombok's `@SneakyThrows` uses the same idea.",
            },
            {
              question: "Is the stack trace captured when an exception is created or when it's thrown?",
              answer:
                "When it's created. `Throwable`'s constructors call `fillInStackTrace()`, which records the current thread's frames, leaving out the exception's own constructor frames. `athrow` doesn't touch the trace, and neither does a rethrow.\n\n`javap -c` on `Throwable` showed the no-arg constructor calling `fillInStackTrace()` at offset 24. In `RethrowUnchecked`, the trace still pointed at the division on line 4 after the `throw e;` on line 7. An exception created in one method and thrown from another names only the method that created it, which is why a preallocated, reused exception has a misleading trace.",
            },
            {
              question: "How is a throws clause represented in the class file, and who uses it?",
              answer:
                "As the `Exceptions` attribute of the method (JVMS 4.7.5): a list of class constants, including any unchecked exceptions written in the clause. Generic `throws E` is erased there to the bound, and the generic form lives in the `Signature` attribute.\n\nThe JVM doesn't use it for execution. `javac` reads it when compiling callers, reflection exposes it through `Method.getExceptionTypes()`, which returned `[class java.io.IOException, class java.lang.InterruptedException]` for `Declared.load`, and JDK dynamic proxies use the declared list to decide whether to wrap a thrown exception in `UndeclaredThrowableException`.",
            },
            {
              question: "How does Throwable tell \"no cause yet\" from \"cause is null\"?",
              answer:
                "With a sentinel. The constructors without a cause parameter store `this` in the private `cause` field. `getCause()` returns `null` when `cause == this`, and `initCause` only works while the sentinel is still there. A cause constructor overwrites it, even with `null`.\n\n`javap -c` on `Throwable` showed `aload_0, aload_0, putfield cause` right after `Object.<init>`, and `getCause()` as an `if_acmpne` comparison of `cause` with `this`. `InitCauseDemo` case 4, `new RuntimeException(\"no cause\", null)` followed by `initCause`, failed because the sentinel was gone.",
            },
            {
              question: "When is an exception without a stack trace reasonable, and how do you create one?",
              answer:
                "Call the protected constructor `super(message, cause, enableSuppression, writableStackTrace)` with `writableStackTrace = false`, or override `fillInStackTrace()` to return `this`. It's reasonable for expected, high-frequency outcomes that are always handled and never logged, like a parser backtracking signal. For anything that can reach a log, it's a debugging disaster.\n\nMy `SeatTakenFast` had zero frames, printed a single line, ignored `setStackTrace`, and with suppression off dropped `addSuppressed`. The saving is the stack walk in `fillInStackTrace()`, which grows with stack depth. The JDK's internal `sun.nio.fs.UnixException` overrides `fillInStackTrace()` for this reason and is always translated to an `IOException`.",
            },
            {
              question: "How would you design the exception hierarchy for an application?",
              answer:
                "One unchecked base class with a stable error code, a few categories based on how a client should react (not found, conflict, validation, dependency failure), and specific domain exceptions under those categories with fields. One mapper at the edge turns categories into HTTP statuses.\n\n`AppErrors` did that with a sealed `AppException` and a pattern-matching `switch` with no `default`: `OutOfStockException` became a 409 because it extends `ConflictException`. Sealing makes the mapping exhaustive at compile time; `javac` still adds a hidden default that throws `MatchException` for a subclass that appears without recompilation. A `non-sealed` category lets features add their own subclasses.",
            },
            {
              question: "Why can't a static initializer throw a checked exception, and what's the rule for instance initializers?",
              answer:
                "A static initializer runs during class initialization, triggered by whatever first uses the class, so there's no caller that could have declared or caught a checked exception; JLS 8.7 forbids it. An instance initializer runs as part of every constructor, so it may throw a checked exception only if every constructor declares it (JLS 8.6).\n\n`InitBlock` failed while one constructor didn't declare `IOException` and compiled once the only remaining constructor did. A failing static initializer at run time becomes `ExceptionInInitializerError`, as the Static Keyword lesson shows.",
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
              question: "Production logs show only \"java.lang.RuntimeException: error\" with no cause for every failed booking. What happened, and how do you fix it?",
              answer:
                "Somewhere a catch block replaced the real exception with a generic one and dropped the cause, so the trace starts and ends in that catch block. Every different failure collapses into the same line.\n\nIn my booking service, a geo-index timeout and an empty zone produced two identical traces ending at line 35. The fix was a small hierarchy, `BookingException` with `DriverLookupFailedException` (keeping the `SocketTimeoutException` as its cause) and `NoDriverAvailableException` with `zone` and `requestedAt` fields. After it, the log showed `Caused by: java.net.SocketTimeoutException: Read timed out` with the line in `nearbyDrivers`, and the empty zone became a one-line `WARN`. I'd also search the codebase for `new RuntimeException(` inside catch blocks without a second argument.",
            },
            {
              question: "You're designing the exceptions for a payment module. What would you create?",
              answer:
                "A base `PaymentException` under the application's unchecked base, with a stable code and the payment id. Under it, exceptions for outcomes callers treat differently: `PaymentDeclinedException` (a business outcome with the decline reason), `InsufficientFundsException` (with the shortfall), `DuplicatePaymentException` (idempotency key already used), and `PaymentGatewayException` (a dependency failure, always with the gateway's exception as the cause). Invalid amounts stay `IllegalArgumentException`.\n\nThe fields come from what callers need, as with `shortfallPaise()` in `InsufficientFundsException`. The gateway exception must never put the provider's raw response in a client message, the same leak `Layers` showed with SQL. Declines need no stack trace in the log; gateway failures do.",
            },
            {
              question: "An API error response contains a SQLException message with a table name and a database host. How do you fix it?",
              answer:
                "Translate at the boundaries and stop sending exception messages to clients. The repository wraps `SQLException` in a data-access exception with the cause, the service translates that into a domain exception, and the web layer maps domain exceptions to a fixed message and status, logging the full chain.\n\n`Layers` had exactly this bug: the leaky handler walked to the root cause and returned `FATAL: password authentication failed for user \"orders_rw\" (host 10.0.4.17:5432)`. The safe handler logged three `caused by` lines and returned \"503 Order tracking is temporarily unavailable\". I'd also make sure the global handler's fallback for unknown exceptions returns a generic 500 body.",
            },
            {
              question: "After upgrading a library, an old service crashes with a checked IOException escaping a method that never declared one. The code wasn't recompiled. How is that possible?",
              answer:
                "The library added `throws IOException` to a method, which is binary-compatible: the descriptor didn't change, so the old class file still links. The JVM doesn't check `throws` clauses, so the checked exception simply propagates through code that was compiled believing it couldn't happen.\n\n`Reader` and `Catalog` reproduced it: with v2 of `Catalog`, `Reader` died with `java.io.IOException: catalog file missing` past its `catch (RuntimeException e)`. Recompiling against the new version turns it into a compile error that forces handling, so the fix is to rebuild against the new library and handle or translate the exception.",
            },
            {
              question: "A teammate proposes declaring `throws Exception` on every service interface method \"to be safe\". What do you say?",
              answer:
                "It isn't safe; it pushes `catch (Exception e)` into every caller, and that catch can't tell a recoverable failure from a bug. It also tells readers nothing about what can actually go wrong.\n\n`ThrowsEverything` showed it: a `NullPointerException` from a `null` recipient was reported as \"notification failed, will retry later\". I'd declare specific exceptions, or better, use unchecked exceptions from the application hierarchy and document them with `@throws`.",
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
            "Write `checkAge(int age)` that throws `IllegalArgumentException(\"age must be >= 0, was \" + age)` for negative ages. Call it with `-3` inside a `try` and print the caught exception.",
            "Write a checked `InvalidIsbnException extends Exception` with a final `isbn` field, and `static void validate(String isbn) throws InvalidIsbnException` that throws when the length isn't 13. Call it with `\"12345\"` and print `getMessage()`. Then delete the `throws` clause and compile again.",
            "Catch the `NumberFormatException` from `Integer.parseInt(\"12a\")` and throw `new IllegalStateException(\"bad stock count\", e)`. Print the trace with `printStackTrace(System.out)`. Then remove `, e` and run it again.",
            "Write a method declared `throws IOException` that calls another `throws IOException` method inside `try { ... } catch (Exception e) { throw e; }`. Compile it. Then add `e = new Exception(\"oops\");` before the `throw` and compile again.",
            "Compile `class Loader { void load() throws java.io.IOException { } }` and run `javap -v Loader`. Find where the exception appears.",
            "Write `class QuietException extends RuntimeException` whose constructor calls `super(message, null, false, false)`. Throw and catch one, print `getStackTrace().length`, then call `printStackTrace(System.out)`.",
            "Write `class Oops extends Throwable`, throw it from a method declared `throws Oops`, and call that method from `main` (declared `throws Throwable`) inside `try { ... } catch (Exception e) { ... }`. Run it.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `java.lang.IllegalArgumentException: age must be >= 0, was -3`. Step 2 prints the message, and without the `throws` clause fails with two errors: `unreported exception InvalidIsbnException; must be caught or declared to be thrown` at the `throw`, and `exception InvalidIsbnException is never thrown in body of corresponding try statement` at the caller's catch. Step 3 shows a `Caused by: java.lang.NumberFormatException: For input string: \"12a\"` section with the frames down to `Integer.parseInt` (ending in `... 1 more` if the parsing happens in a separate method called from `main`), and without `, e` the trace stops after the `IllegalStateException`'s own frames. Step 4 compiles, then fails with `unreported exception Exception; must be caught or declared to be thrown`. Step 5 shows `Exceptions:` followed by `throws java.io.IOException` under `load()`, and nothing about it in the descriptor `()V`. Step 6 prints `0` and a single line with the class name and message. Step 7 skips the catch block and ends with `Exception in thread \"main\" Oops` (with a package or outer class prefix if there is one) and a stack trace.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `throw      statement, run time:  throw new X("msg", cause);
           any Throwable; null -> NullPointerException
           bytecode: new, dup, <init>, athrow
throws     clause, compile time: void m() throws IOException
           required for checked; documentation for unchecked
           class file: Exceptions attribute, not the descriptor
           JVM never checks it (swap a class, sneaky throw)

RETHROW    throw e;  same object, same trace
           Java 7 precise rethrow if e is effectively final

CHAIN      new X(msg, cause) | initCause once | getCause()
           cause == this  means "not set yet"
           printStackTrace: Caused by: ... n more

CUSTOM     extends Exception (checked) or RuntimeException
           super(message, cause); final fields; ids not entities
           serialVersionUID; name the problem

HIERARCHY  AppException(code) -> NotFound / Conflict /
           Validation / Dependency -> domain subclasses
           one mapper at the edge -> HTTP status

TRANSLATE  catch at a layer boundary, wrap with cause,
           log the chain, send the client a stable message

OVERRIDE   checked: same, narrower, fewer or none
NO TRACE   super(msg, cause, false, false): expected,
           high-frequency, never logged`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`throw` raises an exception at run time; `throws` is a compile-time contract that the JVM never checks. Keep the cause every time one exception replaces another.",
            "A custom exception earns its class by being handled differently: a name for the problem, final fields for context, a place in one application hierarchy, and translation at layer boundaries so nothing low-level leaks.",
            "Many exceptions are thrown while something is open: a file, a connection, a lock. The next lesson, try-with-resources, closes those safely and keeps a second exception from close() as a suppressed exception instead of losing the first one.",
          ],
        },
      ],
    },
  ],
};
