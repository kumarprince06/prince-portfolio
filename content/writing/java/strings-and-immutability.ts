import type { Lesson } from "../types";

export const stringsAndImmutability: Lesson = {
  slug: "strings-and-immutability",
  date: "2026-11-13",
  title: "Strings and Immutability",
  description:
    "How Java's String really works on JDK 21: literals versus new String, the string pool and intern() down to ldc, CONSTANT_String and the native StringTable, why String is immutable and final, ==, equals and compareTo, compact strings and the cached hash measured byte by byte, the methods that bite (split, trim, emoji length, valueOf(null)), switch on strings in bytecode, G1 string deduplication, and a fare cache that only failed in production because it compared zone names with ==.",
  tags: ["Core Java", "Strings", "String Pool", "Immutability"],
  sections: [
    {
      title: "What a String Really Is",
      blocks: [
        {
          type: "paragraph",
          text: "Phase 7 was about what happens when things go wrong. Almost every exception message, log line, HTTP header, JSON field, SQL query and map key in those lessons was a `String`. It's the type I use more than any other, and for a long time I treated it as if it were a primitive: write `\"Asha\"`, compare it, print it. It isn't a primitive. A `String` is an ordinary object on the heap, an instance of `java.lang.String`, with fields, a header and a separate array holding the characters.",
        },
        {
          type: "paragraph",
          text: "What makes it special is a set of decisions the language and the JVM made around it. String literals get their own constant-pool entry and are shared through a JVM-wide **string pool**. The class is `final` and every instance is **immutable**: once created, its characters never change, and every method that looks like it modifies a string returns a new one. The `+` operator works on it. `switch` works on it. And since Java 9 it stores Latin-1 text in one byte per character instead of two.",
        },
        {
          type: "paragraph",
          text: "The Memory Allocation lesson showed the pool in one program: two literals are `==`, `new String` isn't, and `intern()` brings it back. This lesson goes underneath that. I wanted to see the constant-pool entry a literal compiles to, the native hash table the pool really is, how many objects `new String(\"x\")` actually creates, the four fields inside every `String` and the bytes they take, and why each of those choices was made. Then the methods that cause real bugs, and a production bug where `==` passed every unit test.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "In C a string is just a `char` array ending in a zero byte. Anyone holding the pointer can overwrite it, nothing stops a write past the end, and two pieces of code sharing one buffer can corrupt each other. C++ added `std::string`, a mutable class with value semantics, so it gets copied whenever two owners need it to stay unchanged. Smalltalk had both a mutable `String` and an immutable, unique `Symbol`.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (January 1996) went a different way: one class, `java.lang.String`, declared `final`, with no method that modifies an instance. For changing text there was a separate mutable class, `StringBuffer`. Because a `String` can't change, it can be shared freely between objects and threads without copying, and the JVM can keep a single shared instance of every literal. `intern()` was in 1.0 as well. Internally a string was a `char[]` plus an `offset` and a `count`, so a `substring` could point into its parent's array.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`final` immutable `String`, interned literals, `intern()`, `StringBuffer`", "Everything in this lesson builds on these"],
            ["Java 5 (2004)", "`StringBuilder`; `contains`, `replace(CharSequence, CharSequence)`; code-point methods for Unicode 4.0 supplementary characters", "Non-synchronized builder; `codePointAt` and `codePointCount` for emoji-like characters"],
            ["Java 7 (2011)", "`switch` on strings (Project Coin); interned strings moved from PermGen to the main heap", "The pool stopped being a fixed-size PermGen problem"],
            ["7u6 (2012)", "`offset` and `count` removed; `substring` copies", "No more small substring pinning a huge parent array"],
            ["8u20 (2014)", "G1 string deduplication (JEP 192)", "Duplicate `String`s can share one array automatically"],
            ["Java 9 (2017)", "Compact strings (JEP 254); indy string concatenation (JEP 280)", "`byte[]` plus a `coder` instead of `char[]`; `+` compiles to `invokedynamic`"],
            ["Java 11 (2018)", "`isBlank`, `lines`, `repeat`, `strip`, `stripLeading`, `stripTrailing`", "Unicode-aware whitespace and the methods I now use most"],
            ["Java 12 (2019)", "`indent`, `transform`, `describeConstable` (JEP 334)", "`String` implements `Constable` and `ConstantDesc`"],
            ["Java 13 (2019)", "`hashIsZero` field", "Strings whose hash really is 0 stop being re-hashed on every call"],
            ["Java 15 (2020)", "Text blocks (JEP 378); `formatted`, `stripIndent`, `translateEscapes`", "Text blocks appear in Syntax at a Glance below"],
            ["Java 18 (2022)", "UTF-8 by default (JEP 400); string deduplication in Serial, Parallel and ZGC", "`getBytes()` and source files stop depending on the platform charset"],
            ["Java 21 (2023)", "`indexOf(ch, from, to)`, `splitWithDelimiters`; String Templates first preview (JEP 430)", "Templates were withdrawn after JDK 22, so they aren't part of Java 21 code"],
            ["Java 25 (2025)", "Compact object headers become a product option (JEP 519)", "Not a `String` change, but it shrinks the arrays inside strings; see Compact Strings, Measured"],
          ],
        },
        {
          type: "paragraph",
          text: "The `+` operator, `StringBuilder` and `StringBuffer` get the next lesson, StringBuilder and StringBuffer, including the `javap` proof of JEP 280. Here I only touch `+` where it decides whether something is a compile-time constant.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a library and its printed books.",
        },
        {
          type: "list",
          items: [
            "A **`String` is a printed book**. Once it's printed, the text is fixed. \"Editing\" it means printing a new edition; every existing copy still says exactly what it said. That's immutability, and why `name.toUpperCase()` returns a new string.",
            "A **variable is a borrowing slip** with a shelf number on it. Many readers can hold slips for the same copy. Because nobody can scribble in a printed book, sharing it is safe, which is the thread-safety argument in one line.",
            "The **string pool is the reference shelf**, where the library keeps exactly one copy of each title, and the **catalogue drawer** that says where each title stands is the `StringTable`. A literal like `\"Kolkata\"` in my code is a request slip for that title: everyone who asks gets the shelf copy.",
            "`new String(\"Kolkata\")` is **buying my own copy** of a title that's already on the shelf. Same text, different book, so `==` says no.",
            "`intern()` is **taking my copy to the librarian**. If the title is already on the reference shelf, I get the shelf copy back. If it isn't, my copy goes on the shelf and becomes the copy everyone gets.",
            "The **barcode** on the back is `hashCode()`. It's worked out the first time someone scans the book and then stuck on, so the next scan is instant. A printed book never needs a new barcode, because its text never changes.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down. A real reference shelf keeps its books forever; the string pool holds its entries weakly, so a pooled string nobody uses any more is garbage-collected, and I measure that below. A real library would photocopy my book before shelving it; since JDK 7 `intern()` shelves my actual object, with no copy. And a library can't print two books that share pages, but `new String(\"Kolkata\")` creates a new `String` object around the very same character array as the literal.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The class",
        },
        {
          type: "code",
          language: "java",
          code: `public final class String
    implements java.io.Serializable, Comparable<String>, CharSequence,
               Constable, ConstantDesc {

    private final byte[] value;     // the characters, Latin-1 or UTF-16 encoded
    private final byte coder;       // 0 = LATIN1, 1 = UTF16
    private int hash;               // cached hashCode(), 0 until computed
    private boolean hashIsZero;     // true if the computed hash really was 0
    ...
}`,
        },
        {
          type: "list",
          items: [
            "`final` on the class: nobody can subclass `String`. `javac` reports `cannot inherit from final String`.",
            "`private final` on `value` and `coder`: nothing outside the class can reach them, and they're assigned once, in a constructor.",
            "`hash` and `hashIsZero` are not `final`, and they're the only fields that ever change. They're a cache of a value computed from the immutable ones, which is why the class can still be called immutable.",
            "A `String` is a sequence of UTF-16 **code units** (`char` values). `length()` counts those, not letters and not bytes. A character outside the Basic Multilingual Plane, like most emoji, takes two.",
          ],
        },
        {
          type: "heading",
          text: "Ways to get a String",
        },
        {
          type: "table",
          headers: ["Expression", "New object?", "Pooled?"],
          rows: [
            ["`\"Kolkata\"` (literal)", "Only the first time any class's `ldc` resolves that text", "Yes, always (JLS 3.10.5)"],
            ["`\"Kol\" + \"kata\"`, or a `static final` constant", "No, `javac` folds it into one literal", "Yes"],
            ["`new String(\"Kolkata\")`", "Always one new `String`; it shares the literal's `byte[]`", "No"],
            ["`new String(chars)`, `new String(bytes, UTF_8)`", "Always, with its own array", "No"],
            ["`a + b` with a non-constant operand", "Always, built at run time", "No"],
            ["`sb.toString()`, `substring`, `toUpperCase`, `split`...", "Usually; some return `this` when nothing changes", "No"],
            ["`s.intern()`", "Never; returns the pooled instance, or pools `s` itself", "Yes"],
          ],
        },
        {
          type: "heading",
          text: "Compile-time constants",
        },
        {
          type: "paragraph",
          text: "JLS 15.29 defines a **constant expression**: literals, `+` between constants, and simple names of `final` variables initialised with a constant expression. A constant expression of type `String` is computed by `javac` and interned like a literal. So `\"Kol\" + \"kata\"` and `PART + \"kata\"` (with `final String PART = \"Kol\"`) are the literal `\"Kolkata\"` in the class file. Anything with a method call or a non-final variable in it is not a constant and builds a new string at run time.",
        },
        {
          type: "heading",
          text: "Comparing",
        },
        {
          type: "table",
          headers: ["Method", "Asks", "Result"],
          rows: [
            ["`a == b`", "Same object?", "`boolean`; almost never what I want for text"],
            ["`a.equals(b)`", "Same characters, exactly?", "`boolean`; `false` for `null` or a non-`String`"],
            ["`a.equalsIgnoreCase(b)`", "Same characters, ignoring case char by char?", "`boolean`"],
            ["`a.contentEquals(cs)`", "Same characters as any `CharSequence`?", "`boolean`; works with a `StringBuilder`"],
            ["`a.compareTo(b)`", "Which comes first, by UTF-16 code unit?", "`int`: negative, 0 or positive"],
            ["`a.compareToIgnoreCase(b)`", "The same, case-insensitive", "`int`"],
            ["`Objects.equals(a, b)`", "`equals` that tolerates `null` on either side", "`boolean`"],
          ],
        },
        {
          type: "paragraph",
          text: "And one definition to keep straight: an **immutable** object is one whose observable state can't change after construction. For `String` that means no setter, no method that writes to `value`, a defensive copy of any `char[]` or `byte[]` passed in, and the class `final` so no subclass can add mutable behaviour.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The fields and their offsets",
        },
        {
          type: "paragraph",
          text: "The Memory Allocation lesson read field offsets with `Unsafe.objectFieldOffset`. I did the same for `String` on JDK 21, plus the offset where a `byte[]`'s data starts:",
        },
        {
          type: "code",
          language: "java",
          title: "StringLayout.java",
          code: `import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import sun.misc.Unsafe;

public class StringLayout {
    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);

        for (Field field : String.class.getDeclaredFields()) {
            if (Modifier.isStatic(field.getModifiers())) continue;
            System.out.printf("%-10s %-8s offset %d%n",
                    field.getName(), field.getType().getSimpleName(), u.objectFieldOffset(field));
        }
        System.out.println("byte[] data starts at " + u.arrayBaseOffset(byte[].class));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac StringLayout.java          # 4 warnings: Unsafe is internal proprietary API
java StringLayout
java -XX:-UseCompressedClassPointers -XX:-UseCompressedOops StringLayout`,
        },
        {
          type: "output",
          text: `value      byte[]   offset 20
coder      byte     offset 16
hash       int      offset 12
hashIsZero boolean  offset 17
byte[] data starts at 16

value      byte[]   offset 24
coder      byte     offset 20
hash       int      offset 16
hashIsZero boolean  offset 21
byte[] data starts at 24`,
        },
        {
          type: "image",
          src: "/images/java/strings-and-immutability-compact-layout.svg",
          alt: "A String object of 24 bytes: an 8-byte mark word, a 4-byte class pointer, int hash at offset 12, byte coder at 16, boolean hashIsZero at 17, a 2-byte gap, and a 4-byte reference to byte[] value at 20. It points to either a Latin-1 array for \"Hello Kolkata\" (16-byte header plus 13 bytes, padded to 32, 56 bytes in total with the String) or a UTF-16 array for \"Price ₹120.00\" (16 plus 26 bytes, padded to 48, 72 bytes in total).",
          caption: "Every String is two heap objects. The String itself is a fixed 24 bytes; the array holds the text, one or two bytes per char.",
        },
        {
          type: "list",
          items: [
            "With the defaults, the header is 12 bytes and the four fields fit into the next 12: `hash` (4), `coder` (1), `hashIsZero` (1), two bytes of gap, then the compressed reference `value` (4). The JVM chose that order, not the source file. A `String` is **24 bytes**, whatever its length.",
            "With compression off, the header is 16 bytes and the reference 8, so a `String` grows to 32 bytes.",
            "The text itself is never inside the `String`. It's in a separate `byte[]` with its own 16-byte header (mark word, class pointer, length). So the smallest possible non-empty string costs 24 + 24 = 48 bytes.",
          ],
        },
        {
          type: "paragraph",
          text: "On JDK 25 with `-XX:+UseCompactObjectHeaders` (JEP 519) the same program printed `hash` at 8, `coder` at 12, `hashIsZero` at 13, `value` at 16, and array data starting at 12. The `String` is still 24 bytes after rounding, but every `byte[]` header shrinks by 4 bytes, which shows up in the compact strings measurements later.",
        },
        {
          type: "heading",
          text: "What a literal compiles to",
        },
        {
          type: "code",
          language: "java",
          title: "Literals.java",
          code: `public class Literals {
    static final String CITY = "Kolkata";            // a compile-time constant

    public static void main(String[] args) {
        String a = "Kolkata";                        // plain literal
        String b = "Kol" + "kata";                   // constant expression: folded by javac
        final String part = "Kol";
        String c = part + "kata";                    // final local initialised with a constant: folded
        String suffix = "kata";
        String d = "Kol" + suffix;                   // suffix is not final: built at run time
        String e = "Kol" + "kata".trim();            // a method call is never a constant

        System.out.println((a == CITY) + " " + (a == b) + " " + (a == c));
        System.out.println((a == d) + " " + (a == e) + " " + (a == d.intern()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Literals.java && java Literals && javap -c -v Literals",
        },
        {
          type: "output",
          text: `true true true
false false true

   #7 = String             #8             // Kolkata
   #8 = Utf8               Kolkata
   #9 = String             #10            // kata
  #10 = Utf8               kata
  ...
  static final java.lang.String CITY;
    descriptor: Ljava/lang/String;
    flags: (0x0018) ACC_STATIC, ACC_FINAL
    ConstantValue: String Kolkata
  ...
  public static void main(java.lang.String[]);
    Code:
         0: ldc           #7                  // String Kolkata
         2: astore_1
         3: ldc           #7                  // String Kolkata
         5: astore_2
         6: ldc           #7                  // String Kolkata
         8: astore_3
         9: ldc           #9                  // String kata
        11: astore        4
        13: aload         4
        15: invokedynamic #11,  0             // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;
        20: astore        5
        22: ldc           #9                  // String kata
        24: invokevirtual #15                 // Method java/lang/String.trim:()Ljava/lang/String;
        27: invokedynamic #11,  0             // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;
        32: astore        6
        34: getstatic     #21                 // Field java/lang/System.out:Ljava/io/PrintStream;
        37: aload_1
        38: ldc           #7                  // String Kolkata
        40: if_acmpne     47
        ...`,
        },
        {
          type: "list",
          items: [
            "A string literal becomes two constant-pool entries: a `CONSTANT_Utf8` (#8) holding the text in the class file's modified UTF-8, and a `CONSTANT_String` (#7) that points at it (JVMS 4.4.3). The `String` object doesn't exist yet; the class file only describes it.",
            "`a`, `b` and `c` all compile to the same instruction, `ldc #7`. There's no trace of `\"Kol\" + \"kata\"` or of `part` in the bytecode: `javac` folded both. That's why all three are `==`.",
            "`a == CITY` is also `ldc #7` at offset 38. Reading a `static final` constant doesn't even touch the field; `javac` copies the value into every place that uses it. The field still has a `ConstantValue` attribute for reflection and for other classes.",
            "`d` and `e` are `invokedynamic makeConcatWithConstants`, a new object at run time. `if_acmpne` is how `==` on references compiles: compare two addresses, nothing else.",
            "`d.intern()` returns the instance `ldc #7` had already put in the pool, so the last comparison is `true`.",
          ],
        },
        {
          type: "heading",
          text: "What ldc does at run time",
        },
        {
          type: "paragraph",
          text: "JVMS 5.1 describes how a `CONSTANT_String` becomes an object: if `String.intern()` has already been called on a string with the same characters, the result is that instance; otherwise a new `String` is created and interned. HotSpot does this lazily, the first time each `ldc` executes, and then patches the constant pool so later executions just load the cached reference. I wanted proof of both the laziness and the shared table, so I interned a string built at run time **before** the method containing the literal ever ran:",
        },
        {
          type: "code",
          language: "java",
          title: "LazyLiteral.java",
          code: `public class LazyLiteral {
    static String literal() {
        return "Library-Card-42";                // its ldc has not run yet when main starts
    }

    public static void main(String[] args) {
        String built = new StringBuilder("Library-").append("Card-42").toString();
        System.out.println("built.intern() == built   " + (built.intern() == built));
        System.out.println("literal() == built        " + (literal() == built));
    }
}`,
        },
        {
          type: "output",
          text: `built.intern() == built   true
literal() == built        true`,
        },
        {
          type: "paragraph",
          text: "The literal in `literal()` resolved to the object I built with a `StringBuilder`. The class was loaded before `main` ran, but its literal wasn't in the pool yet, so my `intern()` put `built` itself there, and the `ldc` found it later. Same result with `-Xint`. A literal and `intern()` are the same lookup into the same table.",
        },
        {
          type: "heading",
          text: "The StringTable",
        },
        {
          type: "paragraph",
          text: "The pool isn't a Java object and there's no `java.util` map behind it. It's HotSpot's **StringTable**, a concurrent hash table in native memory, keyed by the string's characters, whose entries are **weak references** to `String` objects on the heap. Since JDK 7 those `String` objects are ordinary heap objects. Before that, interned strings lived in PermGen, a fixed-size area where too many `intern()` calls gave `OutOfMemoryError: PermGen space`.",
        },
        {
          type: "list",
          items: [
            "**Size:** `-XX:+PrintFlagsFinal` shows `StringTableSize = 65536` buckets on JDK 21 and JDK 25. That's the starting size; the table grows itself as it fills, and I watch it double below. Old advice to tune `-XX:StringTableSize` came from JDK 6 and 7, when the table was fixed at 1009 buckets and later 60013.",
            "**Weak:** an entry doesn't keep its string alive. If nothing else references a pooled string, the GC clears it and the table drops the dead entry. Interning doesn't leak memory forever, but it does keep the table big while the strings are alive.",
            "**CDS:** at startup the JVM maps a shared, read-only table of strings archived by Class Data Sharing (7,711 entries in the statistics below). Those are the JDK's own literals, ready before any class loads.",
          ],
        },
        {
          type: "image",
          src: "/images/java/strings-and-immutability-pool.svg",
          alt: "The main frame holds four references. built points to a String \"Kolkata\" with its own byte array. constructed points to another String \"Kolkata\" whose value shares the byte array of the pooled String. literal and interned both point to the pooled String. Below the heap, the native StringTable holds a weak reference to the pooled String.",
          caption: "Four variables, three String objects, two byte arrays, one pool entry. The StringTable is outside the Java heap; the strings it points to are inside it.",
        },
        {
          type: "heading",
          text: "How equals compiles",
        },
        {
          type: "paragraph",
          text: "`javap -c -p java.lang.String` on JDK 21 shows `equals(Object)` in four steps: `if_acmpne` (same reference? then `true` at once), `instanceof String`, then `coder == other.coder` (a Latin-1 string can never equal a UTF-16 one, because a string is only stored as UTF-16 when it has a char that Latin-1 can't hold), and finally `StringLatin1.equals(value, other.value)`, which compares the array lengths before any bytes. Byte-by-byte comparison works for both encodings. In compiled code the JIT replaces that last call with an intrinsic that compares many bytes per instruction.",
        },
      ],
    },
    {
      title: "The String Pool and intern() in Depth",
      blocks: [
        {
          type: "heading",
          text: "Identity, proved",
        },
        {
          type: "paragraph",
          text: "`System.identityHashCode` is stable for one object over its whole life, so printing it for each reference shows which ones are the same object:",
        },
        {
          type: "code",
          language: "java",
          title: "PoolIdentity.java",
          code: `class Library {
    static String city() {
        return "Kolkata";                            // the same literal, in another class
    }
}

public class PoolIdentity {
    static void show(String label, String s) {
        System.out.printf("%-22s %10d%n", label, System.identityHashCode(s));
    }

    public static void main(String[] args) {
        String literal = "Kolkata";
        String fromOtherClass = Library.city();
        String constructed = new String("Kolkata");
        String built = new StringBuilder("Kol").append("kata").toString();
        String interned = built.intern();

        show("literal", literal);
        show("Library.city()", fromOtherClass);
        show("new String(...)", constructed);
        show("StringBuilder", built);
        show("built.intern()", interned);
        show("constructed.intern()", constructed.intern());
    }
}`,
        },
        {
          type: "output",
          text: `literal                 366712642
Library.city()          366712642
new String(...)         789451787
StringBuilder          1950409828
built.intern()          366712642
constructed.intern()    366712642`,
        },
        {
          type: "paragraph",
          text: "The numbers are from my run on JDK 21 and will differ on another machine; what matters is which ones match. `Library` is a different class with its own constant pool and its own `CONSTANT_String` entry, and it still got the same object, because both `ldc`s look up one JVM-wide table. `new String` and the `StringBuilder` result are separate objects, and `intern()` on either returns the pooled one.",
        },
        {
          type: "heading",
          text: "How many objects does new String(\"x\") create?",
        },
        {
          type: "paragraph",
          text: "The classic answer is \"two, one in the pool and one on the heap\". I measured it, using the per-thread allocation counter from the Memory Allocation lesson and `Unsafe` to compare the two strings' `value` arrays:",
        },
        {
          type: "code",
          language: "java",
          title: "HowManyObjects.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class HowManyObjects {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static String sink;

    static String make() {
        return new String("Hello Kolkata");
    }

    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);
        long valueOffset = u.objectFieldOffset(String.class.getDeclaredField("value"));

        for (int i = 0; i < 3; i++) sink = make();         // first call resolves the literal
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        sink = make();
        long after = MX.getThreadAllocatedBytes(id);

        String literal = "Hello Kolkata";
        System.out.println("bytes allocated by new String(literal): " + (after - before));
        System.out.println("same String object as the literal:      " + (sink == literal));
        System.out.println("same byte[] as the literal:             "
                + (u.getObject(sink, valueOffset) == u.getObject(literal, valueOffset)));
    }
}`,
        },
        {
          type: "output",
          text: `bytes allocated by new String(literal): 24
same String object as the literal:      false
same byte[] as the literal:             true`,
        },
        {
          type: "list",
          items: [
            "Once the literal is in the pool, each `new String(\"Hello Kolkata\")` allocates exactly **24 bytes**: one `String` object and nothing else.",
            "The `String(String original)` constructor copies the original's `value` reference, not the array. The new string and the pooled one are different objects sharing one `byte[]`. That's safe only because neither can ever modify it.",
            "So the precise answer is: the first time that line runs, up to two `String` objects and one `byte[]` (the literal and its array are created when the `ldc` resolves, unless the text was already pooled), then one 24-byte `String` per execution. Never two arrays. And `new String(\"...\")` has no good use: it's a copy that can't differ from the original.",
          ],
        },
        {
          type: "heading",
          text: "intern() keeps the object it's called on",
        },
        {
          type: "code",
          language: "java",
          title: "InternIdentity.java",
          code: `public class InternIdentity {
    public static void main(String[] args) {
        String fresh = new StringBuilder("Library").append("Card42").toString();
        System.out.println(fresh.intern() == fresh);     // nothing equal was pooled yet

        String java = new StringBuilder("ja").append("va").toString();
        System.out.println(java.intern() == java);       // "java" was pooled long before main ran
    }
}`,
        },
        {
          type: "output",
          text: `true
false`,
        },
        {
          type: "paragraph",
          text: "Since JDK 7, interning a heap string that isn't pooled yet adds that very object to the table; no copy is made, so `fresh.intern() == fresh`. On JDK 6, `intern()` copied the text into PermGen and the first line would print `false`. The second line is the well-known puzzle: `\"java\"` is a literal somewhere in the JDK's own startup code (or the CDS archive), so the pool already holds a different object with that text and `intern()` returns that one.",
        },
        {
          type: "heading",
          text: "Watching the table: -XX:+PrintStringTableStatistics",
        },
        {
          type: "code",
          language: "java",
          title: "PoolStats.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class PoolStats {
    public static void main(String[] args) {
        boolean keep = args.length > 0 && args[0].equals("keep");
        List<String> kept = new ArrayList<>();
        for (int i = 0; i < 200_000; i++) {
            String s = ("employee-" + i).intern();   // 200,000 distinct strings into the pool
            if (keep) kept.add(s);
        }
        System.gc();
        try { Thread.sleep(500); } catch (InterruptedException e) { }   // let the table finish cleaning
        System.out.println("interned 200,000 strings, kept " + kept.size());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx128m -XX:+PrintStringTableStatistics PoolStats keep
java -Xmx128m -XX:+PrintStringTableStatistics PoolStats`,
        },
        {
          type: "output",
          text: `interned 200,000 strings, kept 200000
...
StringTable statistics:
Number of buckets       :    131072 =   1048576 bytes, each 8
Number of entries       :    200023 =   3200368 bytes, each 16
Number of literals      :    200023 =  11201688 bytes, avg  56.000
Total footprint         :           =  15450632 bytes
Average bucket size     :     1.526
Variance of bucket size :     1.370
Std. dev. of bucket size:     1.171
Maximum bucket size     :         6
Shared String Table statistics:
Number of buckets       :      1985
Number of entries       :      7711
Maximum bucket size     :        12

interned 200,000 strings, kept 0
...
StringTable statistics:
Number of buckets       :    131072 =   1048576 bytes, each 8
Number of entries       :        23 =       368 bytes, each 16
Number of literals      :        23 =      1688 bytes, avg  73.000
Total footprint         :           =   1050632 bytes`,
        },
        {
          type: "list",
          items: [
            "The statistics print at JVM exit. The table started at 65,536 buckets and **doubled to 131,072** on its own as 200,023 entries went in.",
            "Each entry costs 16 bytes of native memory, on top of the strings themselves. The \"literals\" line is the heap size of the pooled strings: 56 bytes on average, which is exactly a 24-byte `String` plus a 32-byte array for 15-character text like `employee-123456`.",
            "Without `keep`, only **23 entries** were left. 200,000 interned strings had been garbage-collected and their entries removed, because the table holds them weakly. The bucket array didn't shrink back, though.",
            "My first attempt printed `statistics unavailable at this moment` for the StringTable, because the JVM exited while the table was still being cleaned after the GC. Sleeping half a second before exit fixed it. `jcmd <pid> VM.stringtable` prints the same numbers for a running JVM.",
          ],
        },
      ],
    },
    {
      title: "Immutability: What It Means and Why String Has It",
      blocks: [
        {
          type: "heading",
          text: "Every \"change\" is a new String",
        },
        {
          type: "code",
          language: "java",
          title: "NeverChanges.java",
          code: `public class NeverChanges {
    public static void main(String[] args) {
        String name = "  Asha Rao  ";
        String alias = name;                         // a second reference to the same object

        name.trim();                                 // result thrown away
        name.toUpperCase();                          // result thrown away
        System.out.println("[" + name + "]");

        String upper = name.trim().toUpperCase();    // each call returns a new String
        System.out.println("[" + upper + "]");

        name = name.trim();                          // repoint the variable
        System.out.println("[" + name + "] [" + alias + "]");
        System.out.println(name == alias);

        String same = "Asha".replace('z', 'y');     // nothing to replace
        System.out.println(same == "Asha");          // the same object comes back
    }
}`,
        },
        {
          type: "output",
          text: `[  Asha Rao  ]
[ASHA RAO]
[Asha Rao] [  Asha Rao  ]
false
true`,
        },
        {
          type: "list",
          items: [
            "`name.trim();` on its own line compiles and does nothing visible. The trimmed string is created and dropped. This is the single most common immutability bug, and the compiler doesn't warn.",
            "`name = name.trim()` doesn't change the object either. It points the variable at a new object. `alias` still points at the original, untouched, with its spaces.",
            "When there's nothing to change, many methods return `this` instead of a copy: `replace` with no match, `trim` and `strip` with no whitespace, `substring(0)`, `toUpperCase` on an already upper-case Latin-1 string. That's an optimisation only immutability allows, and it's why `same == \"Asha\"` is `true`. It's not a guarantee in the Javadoc, so I'd never rely on it.",
          ],
        },
        {
          type: "heading",
          text: "Why final: a subclass could break every promise",
        },
        {
          type: "code",
          language: "java",
          title: "MyString.java",
          code: `public class MyString extends String {
}`,
        },
        {
          type: "output",
          text: `MyString.java:1: error: cannot inherit from final String
public class MyString extends String {
                              ^
1 error`,
        },
        {
          type: "paragraph",
          text: "If `String` weren't `final`, a method declared to take a `String` could receive a subclass with a mutable field and overridden `charAt`, `length`, `equals` and `hashCode`. Immutability would become a property of some strings instead of the type. Every API that checks a string and then uses it (file paths, class names in `Class.forName`, host names, SQL fragments, map keys) would have to make a defensive copy first. `final` makes \"this is a `String`\" mean \"this is the JDK's `String`, with its rules\". The Inheritance lesson's rule of thumb, design for inheritance or prohibit it, is applied here at its strictest.",
        },
        {
          type: "heading",
          text: "The four reasons, with a mutable stand-in",
        },
        {
          type: "paragraph",
          text: "To see what immutability prevents, I wrote a small `MutableText` class that behaves like `String` would if its characters could change, and put it where `String` normally goes: a hash key and a security check.",
        },
        {
          type: "code",
          language: "java",
          title: "WhyImmutable.java",
          code: `import java.util.HashSet;
import java.util.Set;

public class WhyImmutable {
    // A "string" whose characters can change, the way String would be without immutability
    static final class MutableText {
        final StringBuilder chars;
        MutableText(String s) { chars = new StringBuilder(s); }
        @Override public boolean equals(Object o) {
            return o instanceof MutableText m && chars.toString().equals(m.chars.toString());
        }
        @Override public int hashCode() { return chars.toString().hashCode(); }
        @Override public String toString() { return chars.toString(); }
    }

    // A check that remembers what it approved
    static Object approved;
    static void approve(Object path) {
        if (path.toString().startsWith("/home/")) approved = path;
    }

    public static void main(String[] args) {
        // 1. Hash keys
        Set<MutableText> mutableKeys = new HashSet<>();
        MutableText key = new MutableText("Kolkata");
        mutableKeys.add(key);
        key.chars.setCharAt(0, 'C');                       // changed after it was hashed
        System.out.println("mutable key: contains(Colkata)? "
                + mutableKeys.contains(new MutableText("Colkata"))
                + ", contains(itself)? " + mutableKeys.contains(key) + ", size " + mutableKeys.size());

        Set<String> stringKeys = new HashSet<>();
        String city = "Kolkata";
        stringKeys.add(city);
        city = city.replace('K', 'C');                     // a new String; the key is untouched
        System.out.println("String key:  contains(Kolkata)? " + stringKeys.contains("Kolkata"));

        // 2. Check, then use
        MutableText path = new MutableText("/home/asha/notes.txt");
        approve(path);
        path.chars.replace(0, path.chars.length(), "/etc/shadow");
        System.out.println("approved a mutable path, now opening: " + approved);

        String safePath = "/home/asha/notes.txt";
        approve(safePath);
        safePath = "/etc/shadow";                          // only the local variable moves
        System.out.println("approved a String path, now opening:  " + approved);
    }
}`,
        },
        {
          type: "output",
          text: `mutable key: contains(Colkata)? false, contains(itself)? false, size 1
String key:  contains(Kolkata)? true
approved a mutable path, now opening: /etc/shadow
approved a String path, now opening:  /home/asha/notes.txt`,
        },
        {
          type: "list",
          items: [
            "**Hash keys.** The mutable key was stored in the bucket for `\"Kolkata\"`'s hash. After the change, a lookup computes `\"Colkata\"`'s hash, goes to a different bucket and finds nothing, not even with the key object itself. The entry is still in the set (`size 1`) but unreachable. The HashMap Internals lesson explains the buckets; immutability is what lets `String` be the default key type. It's also what makes caching the hash safe, covered below.",
            "**Security.** The check approved `/home/asha/notes.txt`, and then the caller changed the same object to `/etc/shadow`. That's a time-of-check to time-of-use bug, and it's exactly why `File`, `Path`, `URL`, `Class.forName` and the class loaders take `String`s: a `String` that passed a check is the `String` that gets used.",
            "**Thread safety.** All fields that define a `String` are `final` and set in the constructor, and JLS 17.5 guarantees that any thread that sees the reference sees those final fields fully initialised, even without synchronisation. So one `String` can be read by any number of threads with no locks. The cached `hash` field is a deliberate benign data race, explained in the hashCode section.",
            "**Sharing.** The pool, `substring(0)` returning `this`, and `new String(s)` reusing `s`'s array are only correct because nothing can ever write into a shared string.",
          ],
        },
        {
          type: "heading",
          text: "Can reflection break it?",
        },
        {
          type: "code",
          language: "java",
          title: "BreakIn.java",
          code: `import java.lang.reflect.Field;

public class BreakIn {
    static String city() {
        return "Kolkata";                            // a different method, the same pooled literal
    }

    public static void main(String[] args) throws Exception {
        String s = "Kolkata";
        Field value = String.class.getDeclaredField("value");
        value.setAccessible(true);                   // fails on JDK 17+ unless java.lang is opened
        byte[] bytes = (byte[]) value.get(s);
        bytes[0] = 'X';
        System.out.println(s);
        System.out.println(city());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java BreakIn
java --add-opens java.base/java.lang=ALL-UNNAMED BreakIn`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.reflect.InaccessibleObjectException: Unable to make field private final byte[] java.lang.String.value accessible: module java.base does not "opens java.lang" to unnamed module @15db9742
	at java.base/java.lang.reflect.AccessibleObject.throwInaccessibleObjectException(AccessibleObject.java:391)
	...
	at BreakIn.main(BreakIn.java:11)

Xolkata
Xolkata`,
        },
        {
          type: "paragraph",
          text: "On JDK 21, strong encapsulation of `java.base` (JEP 403, Java 17) stops it, as the Java Modules lesson showed. With the package opened on the command line, the write goes through, and it corrupts **every** use of the pooled literal: `city()` in a different method now returns `Xolkata` too, and the cached hash of that string (if computed) no longer matches its text. Immutability is a guarantee from the class, the module system and the JVM together; opening `java.lang` gives up one of the three.",
        },
      ],
    },
    {
      title: "Comparing Strings: ==, equals and compareTo",
      blocks: [
        {
          type: "paragraph",
          text: "The table in The Technical Picture listed the comparison methods. Here they are side by side on the same values, including the one that crashes:",
        },
        {
          type: "code",
          language: "java",
          title: "Comparing.java",
          code: `import java.util.Objects;

public class Comparing {
    public static void main(String[] args) {
        String a = "Kolkata";
        String b = new String("Kolkata");
        String c = "kolkata";
        String none = null;

        System.out.println("a == b                 " + (a == b));
        System.out.println("a.equals(b)            " + a.equals(b));
        System.out.println("a.equals(c)            " + a.equals(c));
        System.out.println("a.equalsIgnoreCase(c)  " + a.equalsIgnoreCase(c));
        System.out.println("a.compareTo(c)         " + a.compareTo(c));
        System.out.println("\\"Apple\\".compareTo(\\"Banana\\") " + "Apple".compareTo("Banana"));
        System.out.println("\\"Delhi\\".compareTo(\\"Del\\")    " + "Delhi".compareTo("Del"));
        System.out.println("\\"Kolkata\\".equals(none)  " + "Kolkata".equals(none));
        System.out.println("Objects.equals(none, a) " + Objects.equals(none, a));
        System.out.println("none.equals(a)         " + none.equals(a));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -g Comparing.java && java Comparing",
        },
        {
          type: "output",
          text: `a == b                 false
a.equals(b)            true
a.equals(c)            false
a.equalsIgnoreCase(c)  true
a.compareTo(c)         -32
"Apple".compareTo("Banana") -1
"Delhi".compareTo("Del")    2
"Kolkata".equals(none)  false
Objects.equals(none, a) false
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.equals(Object)" because "none" is null
	at Comparing.main(Comparing.java:19)`,
        },
        {
          type: "list",
          items: [
            "`==` compares references. `a` is the pooled literal and `b` is a separate object, so `==` is `false` even though the text is identical. `equals` compares the characters and says `true`.",
            "`compareTo` returns the difference at the first position where the strings differ: `'K'` (75) minus `'k'` (107) is `-32`, and `'A'` minus `'B'` is `-1`. When one string is a prefix of the other, it returns the difference in length: `\"Delhi\"` is 2 chars longer than `\"Del\"`. Only the sign is part of the contract, so I test `< 0`, `== 0` or `> 0`, never `== -1`.",
            "`compareTo` orders by UTF-16 code unit, so every upper-case ASCII letter sorts before every lower-case one, and it knows nothing about language rules. For sorting names shown to people I use `String.CASE_INSENSITIVE_ORDER` or a `java.text.Collator` for the user's locale.",
            "`\"Kolkata\".equals(none)` is `false`; `none.equals(a)` throws. Putting the known non-null value on the left, or using `Objects.equals`, is the null-safe habit. `javac -g` keeps local variable names, which is why the helpful NullPointerException message (JEP 358, on by default since Java 15) says `\"none\"` instead of `\"<local4>\"`.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Why == sometimes works",
          text: "`==` on strings gives the right answer whenever both sides happen to be the same pooled object, which is every time both come from literals or constants. That's exactly the situation in most unit tests. It gives the wrong answer as soon as one side is built at run time: read from a file, a request, a database, `split`, `substring` or `+`. The production section below is that bug.",
        },
      ],
    },
    {
      title: "hashCode and Why It's Cached",
      blocks: [
        {
          type: "paragraph",
          text: "`String.hashCode()` is defined in the Javadoc, so every JVM computes the same value for the same text: `s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]`, using `int` arithmetic that silently overflows. Equal strings always have equal hash codes, which is what makes them work as `HashMap` keys. Different strings can still share a hash code.",
        },
        {
          type: "code",
          language: "java",
          title: "HashCodes.java",
          code: `public class HashCodes {
    public static void main(String[] args) {
        String a = "Kolkata";
        String b = new String("Kolkata");
        System.out.println("equal strings, equal hash: " + (a.hashCode() == b.hashCode()) + " (" + a.hashCode() + ")");

        // s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
        int h = 0;
        for (char ch : "Hi".toCharArray()) h = 31 * h + ch;
        System.out.println("\\"Hi\\" by hand: " + h + ", hashCode(): " + "Hi".hashCode());

        System.out.println("\\"Aa\\" " + "Aa".hashCode() + ", \\"BB\\" " + "BB".hashCode()
                + ", equal? " + "Aa".equals("BB"));
    }
}`,
        },
        {
          type: "output",
          text: `equal strings, equal hash: true (1124159915)
"Hi" by hand: 2337, hashCode(): 2337
"Aa" 2112, "BB" 2112, equal? false`,
        },
        {
          type: "list",
          items: [
            "`'H'` is 72 and `'i'` is 105, so `\"Hi\"` is `72 * 31 + 105 = 2337`. The loop `h = 31 * h + ch` is exactly how the JDK writes it (Horner's method).",
            "`\"Aa\"` and `\"BB\"` collide: `65*31 + 97` and `66*31 + 66` are both 2112. Collisions are normal; `HashMap` falls back to `equals` inside a bucket. Because any combination of `Aa` and `BB` blocks collides too, an attacker could once flood a map with colliding keys; Java 8's `HashMap` turns long buckets into trees to limit the damage, covered in HashMap Internals.",
            "31 is an odd prime, and `31 * h` can be computed as `(h << 5) - h`. It's a long-standing choice, not a magic constant to memorise.",
          ],
        },
        {
          type: "heading",
          text: "The cache, measured",
        },
        {
          type: "code",
          language: "java",
          title: "HashCache.java",
          code: `public class HashCache {
    static long time(String s) {
        long t = System.nanoTime();
        int h = s.hashCode();
        long took = System.nanoTime() - t;
        if (h == 42) System.out.print("");                 // keep h alive
        return took;
    }

    public static void main(String[] args) {
        String big = "x".repeat(50_000_000);
        System.out.println("first  hashCode(): " + time(big) / 1_000 + " µs");
        System.out.println("second hashCode(): " + time(big) / 1_000 + " µs");
        System.out.println("third  hashCode(): " + time(big) / 1_000 + " µs");
        System.out.println("\\"f5a5a608\\".hashCode() = " + "f5a5a608".hashCode());
    }
}`,
        },
        {
          type: "output",
          text: `first  hashCode(): 46324 µs
second hashCode(): 0 µs
third  hashCode(): 0 µs
"f5a5a608".hashCode() = 0`,
        },
        {
          type: "list",
          items: [
            "The first call walked all 50 million chars and took about 46 ms on my machine. The second and third returned the value stored in the `hash` field, in well under a microsecond. That's the barcode from the analogy: computed once, then stuck on.",
            "Caching is only correct because the text can never change. A mutable string would have to recompute, or risk returning a stale hash, which is the `MutableText` key bug from the Immutability section.",
            "`hash` uses 0 to mean \"not computed yet\". A string whose real hash is 0, like `\"f5a5a608\"` or the empty string, used to be re-hashed on every call. Since Java 13 the `hashIsZero` flag records that case, so it's cached too.",
            "The cache is a deliberate, **benign data race**. `hash` isn't `volatile` and isn't written under a lock. Two threads calling `hashCode()` on a new string at once may both compute it and both write it, but they write the same `int`, and an `int` write can't be torn. The worst case is wasted work, never a wrong answer. The JDK code reads the field into a local once so it can't see 0 on one read and the value on another.",
          ],
        },
      ],
    },
    {
      title: "Compact Strings, Measured",
      blocks: [
        {
          type: "paragraph",
          text: "Before Java 9 every `String` stored its text in a `char[]`, two bytes per char, even for plain English. JEP 254 measured that most strings in real heaps were Latin-1 only, and changed the storage to a `byte[]` plus the `coder` field: one byte per char when every char fits in Latin-1 (U+0000 to U+00FF), two bytes per char (UTF-16) otherwise. Nothing in the public API changed. `charAt`, `length` and everything else check `coder` and read the array accordingly.",
        },
        {
          type: "paragraph",
          text: "I measured what one `new String(char[])` allocates on JDK 21, with compact strings on (the default) and switched off with `-XX:-CompactStrings`:",
        },
        {
          type: "code",
          language: "java",
          title: "CompactSizes.java",
          code: `import java.lang.management.ManagementFactory;

public class CompactSizes {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static String sink;

    static long cost(char[] chars) {
        long before = MX.getCurrentThreadAllocatedBytes();
        sink = new String(chars);                          // one String + one byte[]
        return MX.getCurrentThreadAllocatedBytes() - before;
    }

    public static void main(String[] args) {
        String[] samples = {"Hello Kolkata", "Price ₹120.00", "", "A", "employee-123456"};
        for (int i = 0; i < 1000; i++) for (String s : samples) cost(s.toCharArray());   // warm up
        for (String s : samples) {
            System.out.printf("%-18s length %2d  bytes %d%n", "\\"" + s + "\\"", s.length(), cost(s.toCharArray()));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java CompactSizes
java -XX:-CompactStrings CompactSizes`,
        },
        {
          type: "output",
          text: `"Hello Kolkata"    length 13  bytes 56
"Price ₹120.00"    length 13  bytes 104
""                 length  0  bytes 24
"A"                length  1  bytes 48
"employee-123456"  length 15  bytes 56

"Hello Kolkata"    length 13  bytes 72
"Price ₹120.00"    length 13  bytes 72
""                 length  0  bytes 24
"A"                length  1  bytes 48
"employee-123456"  length 15  bytes 72`,
        },
        {
          type: "table",
          headers: ["String", "Compact (default)", "-XX:-CompactStrings", "Why"],
          rows: [
            ["`\"Hello Kolkata\"` (13 Latin-1 chars)", "56 = 24 + 32", "72 = 24 + 48", "Array of 16 + 13 bytes padded to 32, versus 16 + 26 padded to 48"],
            ["`\"Price ₹120.00\"` (has `₹`)", "104 allocated, 72 kept", "72", "`₹` (U+20B9) isn't Latin-1, so the string must be UTF-16 either way"],
            ["`\"\"`", "24", "24", "Only the `String`; all empty strings share one empty array"],
            ["`\"A\"`", "48 = 24 + 24", "48 = 24 + 24", "16-byte header + 1 or 2 bytes, both padded to 24"],
            ["`\"employee-123456\"` (15 chars)", "56", "72", "The same 56 bytes the StringTable statistics showed per pooled string"],
          ],
        },
        {
          type: "list",
          items: [
            "For Latin-1 text the saving is almost half the array, which is why JEP 254 reported a smaller live heap for typical applications. The 24-byte `String` object itself doesn't change.",
            "The rupee string allocated 104 bytes, not 72. The constructor first **tries** to compress: it allocates a 13-byte Latin-1 array (32 bytes with header and padding), finds `₹`, gives up and allocates the 48-byte UTF-16 array. The failed attempt is garbage straight away; what stays alive is 24 + 48 = 72 bytes, the same as without compact strings. Text that's mostly non-Latin-1 (Hindi, Bengali, Chinese) pays that extra allocation on creation and saves nothing.",
            "One non-Latin-1 character anywhere makes the **whole** string UTF-16. A product name with a single `™` (U+2122) is stored at two bytes per char.",
            "These numbers are from JDK 21 with the default compressed class pointers. JDK 25's compact object headers (JEP 519, the last row of the history table) shrink each array header by 4 bytes, per the `StringLayout` offsets earlier; I haven't re-run this table on 25.",
          ],
        },
      ],
    },
    {
      title: "The Methods That Bite",
      blocks: [
        {
          type: "paragraph",
          text: "Most `String` methods do what their names say. A handful have rules that surprise people, and every one of these has turned up in code review or in an interview:",
        },
        {
          type: "code",
          language: "java",
          title: "MethodTraps.java",
          code: `import java.util.Arrays;

public class MethodTraps {
    public static void main(String[] args) {
        // 1. split drops trailing empty strings and takes a regex
        System.out.println(Arrays.toString("Asha,,Rao,,".split(",")));
        System.out.println(Arrays.toString("Asha,,Rao,,".split(",", -1)));
        System.out.println(Arrays.toString("10.5.2".split(".")));
        System.out.println(Arrays.toString("10.5.2".split("\\\\.")));

        // 2. trim only removes chars <= ' '; strip understands Unicode whitespace
        String padded = "\\u2003Asha\\u2003";                // EM SPACE on both sides
        System.out.println("[" + padded.trim() + "] [" + padded.strip() + "]");
        System.out.println("isEmpty " + "   ".isEmpty() + ", isBlank " + "   ".isBlank());

        // 3. length counts UTF-16 chars, not characters
        String thumbs = "Ok👍";
        System.out.println("length " + thumbs.length() + ", codePointCount "
                + thumbs.codePointCount(0, thumbs.length()));

        // 4. substring(begin, end): end is exclusive
        String email = "asha.rao@example.com";
        System.out.println(email.substring(0, email.indexOf('@')) + " | " + email.substring(email.indexOf('@') + 1));

        // 5. replace is literal, replaceAll is a regex
        System.out.println("1.2.3".replace(".", "-") + " vs " + "1.2.3".replaceAll(".", "-"));

        // 6. valueOf(null)
        Object nothing = null;
        System.out.println("valueOf(Object null) = " + String.valueOf(nothing));
        System.out.println("concat: " + ("Name: " + null));
        char[] noChars = null;
        System.out.println(String.valueOf(noChars));
    }
}`,
        },
        {
          type: "output",
          text: `[Asha, , Rao]
[Asha, , Rao, , ]
[]
[10, 5, 2]
[ Asha ] [Asha]
isEmpty false, isBlank true
length 4, codePointCount 3
asha.rao | example.com
1-2-3 vs -----
valueOf(Object null) = null
concat: Name: null
Exception in thread "main" java.lang.NullPointerException: Cannot read the array length because "value" is null
	at java.base/java.lang.String.<init>(String.java:278)
	at java.base/java.lang.String.valueOf(String.java:4468)
	at MethodTraps.main(MethodTraps.java:33)`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`split` drops trailing empty strings.** `\"Asha,,Rao,,\"` gave three parts, not five. For CSV-like data where an empty last column is meaningful, pass a negative limit: `split(\",\", -1)` keeps them. Empty strings in the middle are always kept.",
            "**`split` takes a regex.** `.` means \"any character\", so every character is a separator, every part is empty, and trailing empties are dropped: an empty array. `\"\\\\.\"` (or `Pattern.quote(\".\")`) splits on a literal dot. The same applies to `|`, `$`, `*`, `+`, `?`, `(`, `[`, `{` and `\\\\`.",
            "**`trim` vs `strip`.** `trim` (Java 1.0) removes chars with a code of `' '` (32) or less, and an em space (U+2003) is 8195. `strip` (Java 11) uses `Character.isWhitespace` and removes it. `isBlank` (Java 11) is the matching test: `\"   \".isEmpty()` is `false`, `isBlank()` is `true`. For user input I use `strip` and `isBlank`.",
            "**`length` counts `char`s.** `👍` (U+1F44D) is outside the Basic Multilingual Plane and takes two `char`s, a surrogate pair. `\"Ok👍\"` has length 4 but 3 code points. Truncating with `substring(0, 3)` would cut the emoji in half. Validation like \"name at most 20 characters\" should count code points.",
            "**`substring(begin, end)`** includes `begin` and excludes `end`, so `end - begin` is the length of the result. Out-of-range indexes throw `StringIndexOutOfBoundsException`. Since Java 7u6 it always copies, as the history table said.",
            "**`replace` vs `replaceAll`.** Both replace every match. `replace` treats its arguments literally; `replaceAll` and `replaceFirst` treat the first argument as a regex, so `replaceAll(\".\", \"-\")` replaced every character. The names suggest \"one\" versus \"all\", which is wrong.",
            "**`String.valueOf(null)`.** With an `Object` argument it returns the text `\"null\"`, and `+` does the same. A `char[]` that is `null` goes to the `valueOf(char[])` overload and throws. A literal `String.valueOf(null)` picks the `char[]` overload too, because `char[]` is more specific than `Object`, so it also throws.",
          ],
        },
        {
          type: "heading",
          text: "+ is evaluated left to right",
        },
        {
          type: "code",
          language: "java",
          title: "PlusOrder.java",
          code: `public class PlusOrder {
    public static void main(String[] args) {
        System.out.println(1 + 2 + "x");
        System.out.println("x" + 1 + 2);
        System.out.println("x" + (1 + 2));
        System.out.println('a' + 1 + "x");
        System.out.println("" + 'a' + 1);
        char[] letters = {'h', 'i'};
        System.out.println("letters: " + letters);
        System.out.println(letters);
    }
}`,
        },
        {
          type: "output",
          text: `3x
x12
x3
98x
a1
letters: [C@2a139a55
hi`,
        },
        {
          type: "list",
          items: [
            "`+` is left-associative. `1 + 2` is evaluated first as `int` addition, then `3 + \"x\"` is concatenation. Once the left operand is a `String`, every following `+` is concatenation, so `\"x\" + 1 + 2` is `\"x12\"`.",
            "`'a' + 1` is `char` plus `int`, which is numeric: 97 + 1 = 98. Starting with `\"\"` makes it concatenation.",
            "Concatenating a `char[]` calls `Object.toString()`, which prints the type and identity hash (`[C@...`; the number differs per run). `println(char[])` has its own overload that prints the characters. `String.valueOf(letters)` or `new String(letters)` gives the text.",
          ],
        },
      ],
    },
    {
      title: "switch on Strings",
      blocks: [
        {
          type: "paragraph",
          text: "Since Java 7 a `switch` can take a `String`. It matches with `equals`, so it's safe for strings built at run time, unlike `==`. It's case-sensitive, and a `null` selector throws `NullPointerException` (unless a pattern-matching `switch` on Java 21 has an explicit `case null`).",
        },
        {
          type: "code",
          language: "java",
          title: "SwitchOnString.java",
          code: `public class SwitchOnString {
    static int baseFare(String vehicle) {
        return switch (vehicle) {
            case "AUTO" -> 30;
            case "MINI" -> 50;
            case "SEDAN" -> 80;
            default -> throw new IllegalArgumentException("unknown vehicle: " + vehicle);
        };
    }

    public static void main(String[] args) {
        System.out.println(baseFare("MINI"));
        System.out.println(baseFare(new String("SEDAN")));     // switch uses equals, not ==
        try {
            System.out.println(baseFare("mini"));
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
        try {
            baseFare(null);
        } catch (NullPointerException e) {
            System.out.println("NullPointerException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `50
80
unknown vehicle: mini
NullPointerException`,
        },
        {
          type: "heading",
          text: "What it compiles to",
        },
        {
          type: "paragraph",
          text: "The JVM has no instruction for switching on a string. `javac` turns it into two switches: one on `hashCode()`, then `equals` to confirm, then a second switch on a small index. I compiled a classic `switch` with three cases on JDK 21 and disassembled it:",
        },
        {
          type: "code",
          language: "java",
          title: "SwitchBytecode.java",
          code: `public class SwitchBytecode {
    static int seats(String vehicle) {
        switch (vehicle) {
            case "AUTO": return 3;
            case "MINI": return 4;
            case "SUV":  return 6;
            default:     return 0;
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac SwitchBytecode.java && javap -c SwitchBytecode",
        },
        {
          type: "output",
          text: `  static int seats(java.lang.String);
    Code:
       0: aload_0
       1: astore_1
       2: iconst_m1
       3: istore_2
       4: aload_1
       5: invokevirtual #7                  // Method java/lang/String.hashCode:()I
       8: lookupswitch  { // 3
                 82484: 72
               2020783: 44
               2366551: 58
               default: 83
          }
      44: aload_1
      45: ldc           #13                 // String AUTO
      47: invokevirtual #15                 // Method java/lang/String.equals:(Ljava/lang/Object;)Z
      50: ifeq          83
      53: iconst_0
      54: istore_2
      55: goto          83
      58: aload_1
      59: ldc           #19                 // String MINI
      ...
      83: iload_2
      84: tableswitch   { // 0 to 2
                     0: 112
                     1: 114
                     2: 116
               default: 119
          }
     112: iconst_3
     113: ireturn
     ...`,
        },
        {
          type: "list",
          items: [
            "`hashCode()` on the selector is the first call, and that's where a `null` selector throws. The three case hashes are constants `javac` computed at compile time; that only works because `String.hashCode()`'s formula is fixed by the specification.",
            "`lookupswitch` jumps to the code for the matching hash, and `equals` confirms it. If two case labels had the same hash (`\"Aa\"` and `\"BB\"`), both `equals` checks would sit under one hash entry.",
            "The match stores an index (0, 1 or 2) in a local, and a second, dense `tableswitch` runs the case body. A string `switch` costs one hash (cached after the first call on that string), one `equals` and two jumps. That's cheaper than a chain of `if (s.equals(...))` once there are more than a few cases.",
          ],
        },
      ],
    },
    {
      title: "String Deduplication in G1",
      blocks: [
        {
          type: "paragraph",
          text: "The pool only shares strings that are literals or explicitly interned. Strings built at run time, such as JSON fields, CSV columns and database values, are separate objects even when thousands of them hold the same text. **String deduplication** (JEP 192, Java 8u20) is a GC feature that finds such duplicates and makes them share one `byte[]`. The `String` objects stay separate, so `==` and identity don't change; only the arrays are merged. It's off by default and enabled with `-XX:+UseStringDeduplication`. It started in G1; since Java 18 Serial, Parallel and ZGC support it too.",
        },
        {
          type: "code",
          language: "java",
          title: "Dedup.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Dedup {
    public static void main(String[] args) throws Exception {
        List<String> cities = new ArrayList<>();
        for (int i = 0; i < 500_000; i++) {
            cities.add(new String(("Kolkata-" + (i % 10)).toCharArray()));   // 10 distinct texts, 500,000 copies
        }
        for (int i = 0; i < 5; i++) { System.gc(); Thread.sleep(300); }
        System.out.println("kept " + cities.size());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx512m -XX:+UseG1GC -XX:+UseStringDeduplication -Xlog:stringdedup Dedup
java -Xmx512m -XX:+UseG1GC -Xlog:stringdedup Dedup`,
        },
        {
          type: "output",
          text: `[0.123s][info][stringdedup] Concurrent String Deduplication 87687 (inspected), 32/1400.0B (new unknown), 87652/2739.1K (deduped), ...
[0.199s][info][stringdedup] Concurrent String Deduplication 139848 (inspected), 74/3368.0B (new unknown), 139756/4367.5K (deduped), ...
[0.243s][info][stringdedup] Concurrent String Deduplication 272641 (inspected), 1/32.0B (new unknown), 272640/8520.0K (deduped), ..., 15626.6K (total deduped), ...
kept 500000

kept 500000`,
        },
        {
          type: "list",
          items: [
            "With the flag, G1 inspected 500,177 strings in three concurrent passes and deduplicated 500,048 of them, freeing about **15.6 MB** of `byte[]` while the program still held all 500,000 `String`s. The 108 \"new unknown\" ones were the first copy of each distinct text, plus the JDK's own strings.",
            "Without the flag, the same run logs nothing: no deduplication happened.",
            "Deduplication only looks at strings that survive a few GCs (its age threshold), and the work runs on a background thread, so it costs CPU and has no effect on short-lived strings. It's a one-flag fix for a heap full of long-lived duplicate text. `intern()` is the code-level alternative, and also merges the `String` objects, but it has to be called on purpose and adds the StringTable cost.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Flow.java",
          code: `public class Flow {
    public static void main(String[] args) {
        String a = "Asha";
        String b = "Asha";
        String c = new String("Asha");
        String d = c.intern();
        String e = a.toUpperCase();
        System.out.println((a == b) + " " + (a == c) + " " + (a == d) + " " + a.equals(c));
        System.out.println(a + " " + e);
    }
}`,
        },
        {
          type: "output",
          text: `true false true true
Asha ASHA`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time.** `javac` puts one `CONSTANT_String` for `\"Asha\"` in `Flow`'s constant pool. All three literals use it.",
            "**`String a = \"Asha\"`.** The first `ldc` for that entry looks up `\"Asha\"` in the StringTable. It isn't there, so the JVM creates a `String` and its 4-byte Latin-1 array on the heap, adds it to the table, and caches the reference in the constant pool. `a` gets that reference.",
            "**`String b = \"Asha\"`.** The same `ldc` finds the cached reference. No allocation; `b` and `a` point at the same object.",
            "**`new String(\"Asha\")`.** `new` allocates a fresh 24-byte `String`, and its constructor copies the literal's `value` and `coder` references. `c` is a new object that shares the literal's array.",
            "**`c.intern()`.** The StringTable already holds an equal string, the one `a` refers to, so `intern` returns that. `d == a`.",
            "**`a.toUpperCase()`.** A new `String` with a new array holding `ASHA`. `a` is untouched, because nothing can change it.",
            "**The comparisons.** `a == b` and `a == d` compare the same reference: `true`. `a == c` compares two different objects: `false`. `a.equals(c)` checks reference, type, `coder`, then the bytes: `true`.",
            "**Printing.** The two `+` expressions are built at run time through `invokedynamic`, and `println` writes them out. After `main` returns, `c`, `e` and the temporary strings are unreachable and collected at the next GC. The pooled `\"Asha\"` stays as long as `Flow`'s constant pool references it.",
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
          title: "SyntaxTour.java",
          code: `import java.util.List;

public class SyntaxTour {
    public static void main(String[] args) {
        // 1. creating
        String literal = "Asha Rao";
        String fromChars = new String(new char[] {'O', 'K'});
        String fromNumber = String.valueOf(42);
        String block = """
                Name: Asha
                City: Kolkata
                """;
        System.out.println(literal + " | " + fromChars + " | " + fromNumber);
        System.out.print(block);

        // 2. reading
        System.out.println(literal.length() + " " + literal.charAt(0) + " " + literal.indexOf("Rao")
                + " " + literal.contains("sha") + " " + literal.startsWith("As") + " " + literal.endsWith("o"));

        // 3. "changing" (always a new String)
        System.out.println(literal.toUpperCase() + " | " + literal.replace('a', '@') + " | "
                + literal.substring(5) + " | " + "  hi  ".strip() + "|");

        // 4. splitting and joining
        String[] parts = "red,green,blue".split(",");
        System.out.println(parts.length + " parts, joined: " + String.join(" / ", parts));
        System.out.println(String.join("-", List.of("2026", "11", "13")));

        // 5. Java 11+ helpers
        System.out.println("ab".repeat(3) + " " + "   ".isBlank() + " " + "a\\nb\\nc".lines().count());

        // 6. formatting
        System.out.println(String.format("%-6s|%5.2f|%03d", "fare", 123.456, 7));
        System.out.println("%s owes %d".formatted("Ravi", 250));

        // 7. comparing
        System.out.println("abc".equals("abc") + " " + "ABC".equalsIgnoreCase("abc") + " " + "a".compareTo("b"));

        // 8. converting
        char[] chars = literal.toCharArray();
        int n = Integer.parseInt("120");
        System.out.println(chars.length + " " + (n + 1) + " " + "Kolkata".chars().filter(c -> c == 'a').count());
    }
}`,
        },
        {
          type: "output",
          text: `Asha Rao | OK | 42
Name: Asha
City: Kolkata
8 A 5 true true true
ASHA RAO | Ash@ R@o | Rao | hi|
3 parts, joined: red / green / blue
2026-11-13
ababab true 3
fare  |123.46|007
Ravi owes 250
true true -1
8 121 2`,
        },
        {
          type: "paragraph",
          text: "The text block (Java 15) strips the indentation common to its lines, using the closing `\"\"\"` as the margin, and ends with a newline because the closing delimiter is on its own line. `String.format` and `formatted` (Java 15) use the same `Formatter` syntax: `%-6s` left-aligns in 6 columns, `%5.2f` rounds to 2 decimals in 5 columns, and `%03d` pads with zeros. `chars()` returns an `IntStream` of the UTF-16 chars.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Palindrome check, ignoring case and punctuation",
        },
        {
          type: "code",
          language: "java",
          title: "Palindrome.java",
          code: `public class Palindrome {
    // Ignores case, spaces and punctuation
    static boolean isPalindrome(String text) {
        String clean = text.toLowerCase().replaceAll("[^a-z0-9]", "");
        int i = 0, j = clean.length() - 1;
        while (i < j) {
            if (clean.charAt(i++) != clean.charAt(j--)) return false;
        }
        return true;
    }

    public static void main(String[] args) {
        for (String s : new String[] {"Madam", "A man, a plan, a canal: Panama", "Kolkata", ""}) {
            System.out.printf("%-32s %b%n", "\\"" + s + "\\"", isPalindrome(s));
        }
    }
}`,
        },
        {
          type: "output",
          text: `"Madam"                          true
"A man, a plan, a canal: Panama" true
"Kolkata"                        false
""                               true`,
        },
        {
          type: "paragraph",
          text: "Two pointers from both ends, O(n) time. The cleaning step creates two new strings (`toLowerCase`, `replaceAll`); an interview follow-up is to skip non-alphanumeric chars inside the loop with `Character.isLetterOrDigit` instead, which needs no extra memory.",
        },
        {
          type: "heading",
          text: "Character counts and the first non-repeating character",
        },
        {
          type: "code",
          language: "java",
          title: "CharCounts.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;

public class CharCounts {
    static Map<Character, Integer> counts(String s) {
        Map<Character, Integer> map = new LinkedHashMap<>();       // keeps first-seen order
        for (char ch : s.toCharArray()) {
            map.merge(ch, 1, Integer::sum);
        }
        return map;
    }

    static Character firstNonRepeating(String s) {
        for (Map.Entry<Character, Integer> e : counts(s).entrySet()) {
            if (e.getValue() == 1) return e.getKey();
        }
        return null;
    }

    public static void main(String[] args) {
        System.out.println(counts("banana"));
        System.out.println(firstNonRepeating("swiss"));
        System.out.println(firstNonRepeating("aabb"));
    }
}`,
        },
        {
          type: "output",
          text: `{b=1, a=3, n=2}
w
null`,
        },
        {
          type: "paragraph",
          text: "`LinkedHashMap` keeps keys in insertion order, so the first entry with a count of 1 is the first non-repeating character. A plain `HashMap` would give an arbitrary one. `merge(ch, 1, Integer::sum)` puts 1 for a new key and adds 1 to an existing one.",
        },
        {
          type: "heading",
          text: "Anagrams, two ways",
        },
        {
          type: "code",
          language: "java",
          title: "Anagram.java",
          code: `import java.util.Arrays;

public class Anagram {
    static boolean sorted(String a, String b) {
        char[] x = a.replace(" ", "").toLowerCase().toCharArray();
        char[] y = b.replace(" ", "").toLowerCase().toCharArray();
        Arrays.sort(x);
        Arrays.sort(y);
        return Arrays.equals(x, y);
    }

    // a-z only: count up for one string, down for the other
    static boolean counted(String a, String b) {
        if (a.length() != b.length()) return false;
        int[] freq = new int[26];
        for (int i = 0; i < a.length(); i++) {
            freq[a.charAt(i) - 'a']++;
            freq[b.charAt(i) - 'a']--;
        }
        for (int f : freq) if (f != 0) return false;
        return true;
    }

    public static void main(String[] args) {
        System.out.println(sorted("Listen", "Silent") + " " + sorted("Dormitory", "dirty room"));
        System.out.println(counted("listen", "silent") + " " + counted("rat", "car"));
    }
}`,
        },
        {
          type: "output",
          text: `true true
true false`,
        },
        {
          type: "paragraph",
          text: "Sorting is O(n log n) and works for any characters. The counting array is O(n) with constant extra space, but only for lowercase `a` to `z`; `ch - 'a'` turns a letter into an index from 0 to 25. `toCharArray()` copies, so sorting the arrays never touches the original strings.",
        },
        {
          type: "heading",
          text: "Masking personal data before logging",
        },
        {
          type: "code",
          language: "java",
          title: "MaskForLogs.java",
          code: `public class MaskForLogs {
    static String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return "*".repeat(phone.length() - 4) + phone.substring(phone.length() - 4);
    }

    static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "*".repeat(at - 1) + email.substring(at);
    }

    public static void main(String[] args) {
        System.out.println(maskPhone("9830012345"));
        System.out.println(maskEmail("asha.rao@example.com"));
        System.out.println(maskEmail("a@example.com"));
        System.out.println(maskPhone(null));
    }
}`,
        },
        {
          type: "output",
          text: `******2345
a*******@example.com
***@example.com
****`,
        },
        {
          type: "paragraph",
          text: "This is everyday backend string work: `indexOf`, `substring`, `repeat`, `charAt`, with explicit handling of `null` and short input so the masking code itself can't throw while logging an error. `email.charAt(0) + \"*\".repeat(...)` works because the right operand is a `String`; `charAt(0) + charAt(1)` would have added two numbers.",
        },
      ],
    },
    {
      title: "When to Use What",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "What I use", "Why"],
          rows: [
            ["Comparing text", "`equals`, or `\"CONST\".equals(x)` / `Objects.equals` when `null` is possible", "`==` only compares references"],
            ["Comparing user-typed text", "`equalsIgnoreCase`, or normalise once with `strip()` and `toLowerCase(Locale.ROOT)`", "Case and stray spaces differ between users"],
            ["Sorting text for display", "`Collator` for the user's locale", "`compareTo` sorts by UTF-16 code, so `Z` before `a`"],
            ["A fixed set of values (zones, statuses, vehicle types)", "An `enum`, converted from the string once at the boundary", "Typos fail at the boundary, and `==` is correct on enums"],
            ["Building text in a loop", "`StringBuilder`", "`+=` copies everything each time; the next lesson measures it"],
            ["Joining a collection with a separator", "`String.join` or `Collectors.joining`", "No manual first-element check"],
            ["Many long-lived copies of the same text", "`-XX:+UseStringDeduplication`, or a map-based cache; `intern()` only for a small, bounded set", "`intern()` on unbounded input grows the StringTable"],
            ["Passwords and secrets", "`char[]`, cleared after use", "A `String` can't be wiped and may sit in the heap or the pool until GC"],
            ["Multi-line text in code", "Text blocks (`\"\"\"`)", "No `\\n` and `+` chains"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Comparing with ==",
        },
        {
          type: "paragraph",
          text: "`if (status == \"COMPLETED\")` compiles, passes tests that use literals, and fails for any status read from a request or database. `Comparing.java` showed it, and the production section shows what it costs. Use `\"COMPLETED\".equals(status)`, or better, an enum.",
        },
        {
          type: "heading",
          text: "Ignoring the result",
        },
        {
          type: "paragraph",
          text: "`name.trim();` and `name.toUpperCase();` on their own lines do nothing visible, as `NeverChanges.java` showed. Every \"modifying\" method returns a new string, and the result has to be assigned: `name = name.trim();`. IntelliJ warns about this (\"Result of 'String.trim()' is ignored\"); `javac` doesn't.",
        },
        {
          type: "heading",
          text: "Calling a method on a string that might be null",
        },
        {
          type: "paragraph",
          text: "`input.equals(\"yes\")`, `input.isEmpty()` and `input.length()` all throw when `input` is `null`. Turn the comparison around (`\"yes\".equals(input)`), use `Objects.equals`, or check for `null` at the boundary once and never pass `null` inward.",
        },
        {
          type: "heading",
          text: "Forgetting that split and replaceAll take a regex",
        },
        {
          type: "paragraph",
          text: "`\"10.5.2\".split(\".\")` returns an empty array and `\"a|b\".split(\"|\")` splits between every character. Escape the delimiter (`\"\\\\.\"`, `\"\\\\|\"`), use `Pattern.quote`, or use `replace` when no regex is intended.",
        },
        {
          type: "heading",
          text: "toLowerCase without a Locale",
        },
        {
          type: "code",
          language: "java",
          title: "LocaleTrap.java",
          code: `import java.util.Locale;

public class LocaleTrap {
    public static void main(String[] args) {
        String header = "TITLE";
        Locale.setDefault(Locale.forLanguageTag("tr-TR"));          // a server in Turkey
        System.out.println(header.toLowerCase());
        System.out.println(header.toLowerCase().equals("title"));
        System.out.println(header.toLowerCase(Locale.ROOT).equals("title"));
    }
}`,
        },
        {
          type: "output",
          text: `tıtle
false
true`,
        },
        {
          type: "paragraph",
          text: "In Turkish, upper-case `I` lowers to dotless `ı`. `toLowerCase()` and `toUpperCase()` use the JVM's default locale, so code that lower-cases HTTP headers, enum names, file extensions or config keys works on every developer's laptop and breaks on a server with a Turkish locale. For anything that isn't text shown to a person, pass `Locale.ROOT`.",
        },
        {
          type: "heading",
          text: "Concatenating in a loop",
        },
        {
          type: "paragraph",
          text: "`for (...) result += item;` copies everything built so far on every pass, so the total work grows with the square of the output size. It's the main subject of the next lesson, which measures it and shows the fix with `StringBuilder`.",
        },
        {
          type: "heading",
          text: "Printing a char[] with +",
        },
        {
          type: "paragraph",
          text: "`\"letters: \" + letters` printed `[C@2a139a55` in `PlusOrder.java`. Arrays don't override `toString()`. Use `new String(chars)`, `String.valueOf(chars)` or `Arrays.toString(chars)`.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Compare text with `equals`, with the constant on the left or through `Objects.equals` when `null` is possible. Treat `==` on strings as a bug unless there's a comment explaining why identity is wanted.",
            "Turn strings from the outside world into types at the boundary: enums for fixed sets, `UUID`, `LocalDate`, `BigDecimal`, records for structured values. Strings that stay strings get validated once there.",
            "Always assign the result of `trim`, `strip`, `replace`, `toUpperCase` and friends.",
            "Use `strip`, `isBlank` and `lines` (Java 11) over `trim` and hand-written checks for user input.",
            "Pass `Locale.ROOT` to `toLowerCase`/`toUpperCase` for identifiers, keys and protocol text.",
            "Never write `new String(\"literal\")`; it's a copy that can't differ from the original.",
            "Use `StringBuilder` for text built in a loop, `String.join` or `Collectors.joining` for joining, and text blocks for multi-line literals.",
            "Count code points (`codePointCount`, `codePoints()`) when a limit is about characters a person sees, not storage.",
            "Keep `intern()` for small, known sets of values, and measure before using it. For lots of duplicate long-lived text, try `-XX:+UseStringDeduplication` first.",
            "Keep secrets out of `String`s where the API allows it (`char[]` from `JPasswordField`, `Console.readPassword`), and never log them; mask personal data before logging.",
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
            "**Memory.** Every string is two objects: a fixed 24-byte `String` plus a `byte[]` with a 16-byte header. Small strings are mostly overhead: `\"A\"` costs 48 bytes. Latin-1 text costs one byte per char thanks to compact strings; one non-Latin-1 char doubles the array.",
            "**Literals and constants are free at run time.** They're created once per JVM and shared. Constant expressions like `\"Kol\" + \"kata\"` are folded by `javac`, so splitting a long literal across lines with `+` costs nothing.",
            "**`hashCode` is O(n) once, then O(1).** That's what makes `String` a cheap `HashMap` key on repeated lookups. `equals` checks the reference, the `coder` and the length before comparing bytes, and the JIT compares many bytes per instruction.",
            "**Concatenation.** One expression with several `+` is compiled into a single `invokedynamic` call that sizes the result once (Java 9+). `+` in a loop is O(n²); the next lesson measures it.",
            "**`intern()` has a cost.** It's a lookup in a native hash table, and each entry costs 16 bytes of native memory on top of the string, as the `PoolStats` run showed. It pays off for a bounded set of values that would otherwise be duplicated many times; for unbounded input it just grows the table.",
            "**Deduplication** saved 15.6 MB for 500,000 duplicate strings with one flag, using background GC threads. It only acts on strings that live long enough to be aged.",
            "**Regex methods compile a pattern on every call.** `split` has a fast path for a single non-regex character such as `\",\"`; anything else compiles a `Pattern` each time. In a hot loop, compile a `Pattern` once and reuse it.",
          ],
        },
      ],
    },
    {
      title: "Strings in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend looks up the base fare for a pickup zone. Zones and fares are configured as constants. The mobile app sends a pickup code like `PK|SALT-LAKE|0042`, and the request parser cuts the zone name out of it. The developer compared zone names with `==`. Every unit test passed, because every test passed the zone as a literal. In production, every rider was charged the \"unknown zone\" fare.",
        },
        {
          type: "code",
          language: "java",
          title: "FareCache.java",
          code: `import java.util.List;

public class FareCache {
    record Fare(String zone, int baseRupees) { }

    static final List<Fare> FARES = List.of(
            new Fare("KOLKATA-CENTRAL", 60),
            new Fare("SALT-LAKE", 70),
            new Fare("NEW-TOWN", 80));

    // The bug: compares zone names with ==
    static int baseFareBuggy(String zone) {
        for (Fare f : FARES) {
            if (f.zone() == zone) return f.baseRupees();
        }
        return 100;                                     // "unknown zone" surcharge fare
    }

    static int baseFareFixed(String zone) {
        for (Fare f : FARES) {
            if (f.zone().equals(zone)) return f.baseRupees();
        }
        return 100;
    }

    // What the request parser does: cut the zone out of a pickup code like "PK|SALT-LAKE|0042"
    static String zoneFromPickupCode(String code) {
        return code.split("\\\\|")[1];
    }

    public static void main(String[] args) {
        // The unit test: a literal, pooled, the same object as in FARES
        System.out.println("test, literal zone      : " + baseFareBuggy("SALT-LAKE"));

        // Production: the zone is cut out of a request at run time
        String requestBody = new StringBuilder("PK|").append("SALT-LAKE").append("|0042").toString();
        String zone = zoneFromPickupCode(requestBody);
        System.out.println("prod, parsed zone       : " + baseFareBuggy(zone));
        System.out.println("prod, parsed, fixed     : " + baseFareFixed(zone));
        System.out.println("prod, parsed, intern()  : " + baseFareBuggy(zone.intern()));
    }
}`,
        },
        {
          type: "output",
          text: `test, literal zone      : 70
prod, parsed zone       : 100
prod, parsed, fixed     : 70
prod, parsed, intern()  : 70`,
        },
        {
          type: "list",
          items: [
            "**Why the test passed.** `\"SALT-LAKE\"` in the test and `\"SALT-LAKE\"` in `FARES` are literals, so both resolve to the one pooled object. `==` compared a reference with itself.",
            "**Why production failed.** `split` creates new `String` objects. The parsed zone has the same characters as the constant but is a different object, so `==` was `false` for every zone and every rider fell through to 100 rupees. Nothing threw, and nothing was logged; the only signal was support tickets about overcharging.",
            "**The fix is `equals`.** Calling `intern()` on the parsed zone also \"works\", as the last line shows, but it hides the real mistake and makes correctness depend on every caller remembering to intern. I'd reject it in review.",
            "**The better fix is a type.** Parse the zone into an `enum Zone { KOLKATA_CENTRAL, SALT_LAKE, NEW_TOWN }` (or a lookup in a `Map<String, Fare>`, which uses `equals` and `hashCode`) right in the request parser. An unknown zone then fails with a 400 at the boundary instead of quietly charging the wrong fare, and comparisons inside the system use enums, where `==` is correct.",
            "**The test lesson.** Tests that only use literals can't catch identity bugs. Building inputs the way production does, by parsing a request body, would have failed on the first run. Static analysis catches it too: SpotBugs reports `ES_COMPARING_STRINGS_WITH_EQ`, and IntelliJ flags \"String values are compared using '=='\".",
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
              question: "What is the difference between == and equals() for strings?",
              answer:
                "`==` checks whether two references point to the same object. `equals()` checks whether two strings have the same characters in the same order.\n\nTwo literals with the same text are `==` because both come from the string pool, but `new String(\"Kolkata\")` and any string built at run time (from `split`, `substring`, `+` with a variable, a file or a request) is a different object, so `==` is `false` while `equals` is `true`. For text, always use `equals`.",
            },
            {
              question: "Why is String immutable in Java?",
              answer:
                "Four reasons, all shown in `WhyImmutable.java`:\n\n1. **Hash keys**: a string's hash can be cached and stays valid, so it's safe as a `HashMap` key. A mutable key that changed after insertion became unreachable in my test.\n2. **Security**: a path, URL or class name that passed a check can't be changed before it's used.\n3. **Thread safety**: one string can be shared between threads with no locking.\n4. **Sharing**: the string pool, and methods returning `this` when nothing changes, are only safe because nothing can write into a shared string.",
            },
            {
              question: "What is the string pool?",
              answer:
                "A JVM-wide table of unique string instances. Every string literal and compile-time constant is looked up there, so all literals with the same text, in any class, share one object. Strings built at run time aren't pooled unless `intern()` is called.\n\nSince Java 7 the pooled strings live in the normal heap (before that, in PermGen), and the table holds them weakly, so pooled strings nobody uses can be garbage-collected.",
            },
            {
              question: "How many objects does String s = new String(\"hello\") create?",
              answer:
                "The textbook answer is \"two: one in the pool and one on the heap\". More precisely: the first time that line runs, the literal `\"hello\"` is created and pooled (unless an equal string was already pooled), and `new` creates one more `String`. After that, each execution creates exactly one new `String`.\n\nThe new `String` shares the literal's `byte[]` rather than copying it. My measurement showed 24 bytes allocated per execution: one `String` object, no array.",
            },
            {
              question: "Why is the String class final?",
              answer:
                "So no one can subclass it and break its guarantees. A subclass could add mutable state or override `equals`, `hashCode` or `charAt`, and then any method accepting a `String` couldn't trust it to be immutable. `final` makes \"this is a `String`\" mean \"this is the JDK's `String`\". `class MyString extends String` fails with `cannot inherit from final String`.",
            },
            {
              question: "What's the difference between isEmpty() and isBlank()?",
              answer:
                "`isEmpty()` is `true` only when `length()` is 0. `isBlank()` (Java 11) is `true` when the string is empty or contains only whitespace, using `Character.isWhitespace`. `\"   \".isEmpty()` is `false`, `\"   \".isBlank()` is `true`.",
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
              question: "What does intern() do?",
              answer:
                "It returns the pooled instance with the same characters. If there isn't one, it adds this string to the pool and returns it. After `s = s.intern()`, `s == \"literal\"` works for equal text.\n\nSince Java 7 the string object itself is pooled, not a copy, so `fresh.intern() == fresh` is `true` for text that wasn't pooled yet. `new StringBuilder(\"ja\").append(\"va\").toString().intern()` returns a *different* object, because the JDK already pooled `\"java\"` at startup.",
            },
            {
              question: "Which strings are compile-time constants?",
              answer:
                "Literals, `+` between constants, and `final` variables initialised with a constant expression (JLS 15.29). `\"Kol\" + \"kata\"` and `PART + \"kata\"` with `final String PART = \"Kol\"` are folded by `javac` into the literal `\"Kolkata\"` and are `==` to it. If the variable isn't `final`, or there's a method call (`\"kata\".trim()`), the result is built at run time and is a new object. `javap` showed the folded ones as the same `ldc` instruction.",
            },
            {
              question: "How is String.hashCode() calculated, and why is it cached?",
              answer:
                "`s[0]*31^(n-1) + ... + s[n-1]` in `int` arithmetic. The formula is part of the specification, so the value is the same on every JVM. The result is stored in the `hash` field after the first call, because the text can never change. On a 50-million-char string the first call took about 46 ms and later calls well under a microsecond.\n\nThe cache is a benign race: two threads may both compute it, but they write the same value. Since Java 13 a `hashIsZero` flag also caches strings whose hash really is 0.",
            },
            {
              question: "What are compact strings?",
              answer:
                "A Java 9 change (JEP 254): `String` stores its text in a `byte[]` with a `coder` flag instead of a `char[]`. Latin-1 text takes one byte per char, anything else two (UTF-16). My measurement: `\"Hello Kolkata\"` costs 56 bytes instead of 72. One non-Latin-1 char such as `₹` makes the whole string UTF-16. The public API didn't change.",
            },
            {
              question: "Why does \"10.5.2\".split(\".\") return an empty array?",
              answer:
                "`split` takes a regular expression, and `.` matches any character. Every character becomes a separator, all the parts are empty, and `split` drops trailing empty strings, which here is all of them. Use `split(\"\\\\.\")` or `Pattern.quote(\".\")`. A related trap: `split(\",\")` drops trailing empty fields; `split(\",\", -1)` keeps them.",
            },
            {
              question: "How does switch on a String work?",
              answer:
                "`javac` compiles it to a `lookupswitch` on `hashCode()`, an `equals` call to confirm the match, and a second `tableswitch` on the matched index. So it matches by content, not identity, and is safe for strings built at run time. It's case-sensitive, and a `null` selector throws `NullPointerException` from the `hashCode()` call.",
            },
            {
              question: "Why should passwords be stored in char[] rather than String?",
              answer:
                "A `String` is immutable, so the password can't be wiped after use. It stays in the heap until garbage collection, and possibly longer if it was interned or ends up in a heap dump. A `char[]` can be overwritten with `Arrays.fill(chars, '\\0')` as soon as it's no longer needed. It's also harder to log a `char[]` by accident; it prints as `[C@...`.",
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
              question: "Where does the string pool live, and can it cause OutOfMemoryError?",
              answer:
                "The pool is HotSpot's StringTable, a concurrent hash table in native memory whose entries point weakly to `String` objects on the heap. Up to Java 6 the interned strings were in PermGen, which was small and fixed, so heavy `intern()` use caused `OutOfMemoryError: PermGen space`. Since Java 7 they're ordinary heap objects, and since the entries are weak, unused pooled strings are collected.\n\nIt can still use a lot of memory while the strings are reachable: my 200,000 interned strings cost 3.2 MB of entries plus 11.2 MB of strings, and the table grew from 65,536 to 131,072 buckets. `-XX:+PrintStringTableStatistics` and `jcmd <pid> VM.stringtable` show it.",
            },
            {
              question: "Is String really immutable? Can reflection change it?",
              answer:
                "The class gives no way to change it, but reflection could write into the private `value` array on old JDKs. Since Java 17 (JEP 403), `java.base` is strongly encapsulated, so `setAccessible(true)` on `String.value` throws `InaccessibleObjectException`. With `--add-opens java.base/java.lang=ALL-UNNAMED` it works, and changing a pooled literal changed it everywhere: another method returning the same literal also printed the modified text. Immutability is guaranteed by the class, the module system and the JVM together.",
            },
            {
              question: "What did Java 7u6 change about substring()?",
              answer:
                "Before 7u6, a `String` had `offset` and `count` fields, and `substring` returned a new `String` that shared the parent's `char[]`. Taking a 10-char substring of a 10 MB string kept the whole 10 MB array alive. 7u6 removed those fields, and `substring` now copies the characters it needs. It's O(length of the result) instead of O(1), but it never pins a large parent.",
            },
            {
              question: "What is G1 string deduplication, and how is it different from intern()?",
              answer:
                "A GC feature (JEP 192, `-XX:+UseStringDeduplication`) that finds long-lived strings with equal content and makes them share one `byte[]`. The `String` objects remain distinct, so `==` doesn't change. It works on any string, needs no code change, and runs on background threads. `intern()` merges the `String` objects themselves, but only when code calls it.\n\nIn my run, 500,000 duplicate strings were deduplicated in three passes, freeing about 15.6 MB.",
            },
            {
              question: "How is the + operator on strings compiled?",
              answer:
                "Constant expressions are folded by `javac` into a single literal. Before Java 9, other `+` expressions compiled to `new StringBuilder().append(...).append(...).toString()`. Since Java 9 (JEP 280) they compile to one `invokedynamic` call to `StringConcatFactory.makeConcatWithConstants`, which lets the JVM choose the strategy at run time and size the result exactly. The next lesson shows both in `javap`.",
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
            "Write `Pool.java` with `String a = \"Java\"; String b = \"Ja\" + \"va\"; String part = \"Ja\"; String c = part + \"va\"; final String fpart = \"Ja\"; String d = fpart + \"va\";`. Before running, predict `a == b`, `a == c` and `a == d`. Then print them.",
            "Add `String e = new String(\"Java\");` and print `a == e`, `a.equals(e)` and `a == e.intern()`.",
            "Print `\"Java\".compareTo(\"java\")`, `\"java\".compareTo(\"javascript\")` and `\"b\".compareTo(\"a\")`, and explain each number.",
            "Print the arrays from `\"a,b,,c,,\".split(\",\")` and `\"a,b,,c,,\".split(\",\", -1)` with `Arrays.toString`.",
            "Print `\"ab\".hashCode()` and work it out by hand first.",
            "Write a method that reverses a string without `StringBuilder.reverse()`, using `toCharArray()` and two pointers, and check it with `\"Kolkata\"`.",
            "Write `static boolean same(String x, String y) { return x == y; }` and call it with `\"SALT-LAKE\"` and with `\"PK|SALT-LAKE\".split(\"\\\\|\")[1]`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 gives `true`, `false`, `true`: `b` and `d` are constant expressions, `c` uses a non-final variable. Step 2 gives `false`, `true`, `true`. Step 3 gives `-32` (`'J'` 74 minus `'j'` 106), `-6` (a prefix, so the length difference 4 - 10) and `1`. Step 4 prints `[a, b, , c]` and `[a, b, , c, , ]`. Step 5 is `97 * 31 + 98 = 3105`. Step 6 prints `atakloK`. Step 7 prints `true` for the literal and `false` for the parsed value, the production bug in two lines.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT       String = final class, immutable, on the heap
           24-byte String object + separate byte[] value
           coder: LATIN1 (1 byte/char) or UTF16 (2 bytes/char)

POOL       literals + compile-time constants -> one shared instance
           new String("x") -> new object (shares the array)
           runtime-built (split, substring, + var) -> new object
           s.intern() -> pooled instance; pools s itself if absent
           StringTable: native, weak entries, heap strings (Java 7+)

COMPARE    ==            same object?        (almost never for text)
           equals        same chars?         null-safe: "x".equals(s)
           compareTo     order by UTF-16 code; sign only
           Objects.equals(a, b)              both may be null

IMMUTABLE  every "change" returns a new String: s = s.trim();
           why: hash keys, security, thread safety, sharing
           final class -> no mutable subclass

HASH       s[0]*31^(n-1)+...+s[n-1], cached after first call
           "Aa" and "BB" collide (2112)

TRAPS      split/replaceAll take a regex; split drops trailing ""
           trim vs strip; isEmpty vs isBlank
           length() counts chars; emoji = 2
           toLowerCase() uses the default Locale -> Locale.ROOT
           1 + 2 + "x" = "3x";  "x" + 1 + 2 = "x12"

SWITCH     hashCode() -> lookupswitch -> equals -> tableswitch
           null selector -> NullPointerException

MEMORY     compact strings (Java 9), dedup (-XX:+UseStringDeduplication)
           intern only small, bounded sets`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `String` is an immutable heap object. Literals and constants share one pooled instance per text; everything built at run time is a new object. That single fact explains `==`, `intern()`, the `new String` puzzle and the fare bug.",
            "Immutability is what makes strings safe as keys, safe to share between threads, safe to pass to security checks, and cheap to cache. The price is that every change creates a new string.",
            "That price is the subject of the next lesson, StringBuilder and StringBuffer: mutable buffers for building text, how they grow, what `StringBuffer`'s locks do and don't protect, and how `+` is really compiled.",
          ],
        },
      ],
    },
  ],
};
