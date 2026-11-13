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
            ["Java 15 (2020)", "Text blocks (JEP 378); `formatted`, `stripIndent`, `translateEscapes`", "Covered in String Formatting, Text Blocks and Regular Expressions"],
            ["Java 18 (2022)", "UTF-8 by default (JEP 400); string deduplication in Serial, Parallel and ZGC", "`getBytes()` and source files stop depending on the platform charset"],
            ["Java 21 (2023)", "`indexOf(ch, from, to)`, `splitWithDelimiters`; String Templates first preview (JEP 430)", "Templates were withdrawn after JDK 22; the third lesson of this phase covers that history"],
            ["Java 25 (2025)", "Compact object headers become a product option (JEP 519)", "Not a `String` change, but it shrinks the arrays inside strings; measured below"],
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
  ],
};
