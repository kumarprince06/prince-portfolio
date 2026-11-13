import type { Lesson } from "../types";

export const stringBuilderAndStringBuffer: Lesson = {
  slug: "stringbuilder-and-stringbuffer",
  date: "2026-11-13",
  title: "StringBuilder and StringBuffer",
  description:
    "Why Java has mutable string builders and how they really work: the AbstractStringBuilder byte array, capacity growth measured step by step, Latin-1 to UTF-16 inflation, StringBuffer's synchronized methods and what they do and don't protect, how javac compiles + with StringBuilder chains before Java 9 and invokedynamic since, the quadratic cost of + in a loop, StringJoiner and Collectors.joining, and a trip export and a shared log builder fixed in a ride-hailing backend.",
  tags: ["Core Java", "StringBuilder", "StringBuffer", "Performance"],
  sections: [
    {
      title: "What StringBuilder and StringBuffer Are",
      blocks: [
        {
          type: "paragraph",
          text: "The Strings and Immutability lesson ended on the price of immutability: a `String` can never change, so every \"change\" (`concat`, `replace`, `toUpperCase`, `+`) builds a brand new `String` and copies the characters into it. For one or two operations that's nothing. For text that is assembled piece by piece, a report line after line or a receipt item after item, it means copying everything written so far on every step.",
        },
        {
          type: "paragraph",
          text: "`StringBuilder` and `StringBuffer` are the mutable counterparts. Each one owns a resizable character buffer. `append`, `insert`, `delete` and friends edit that buffer in place, and only `toString()` produces a `String` at the end. The two classes have the same API. The difference is that every public `StringBuffer` method that touches the buffer is `synchronized`, and `StringBuilder` has no locking at all.",
        },
        {
          type: "paragraph",
          text: "I wanted to go further than \"use StringBuilder in loops\". This lesson measures how the buffer grows and what that costs, looks at the class's fields through reflection, proves what `StringBuffer`'s locks protect and what they don't with threads that really race, reads the bytecode `javac` produces for `+` on Java 8 and on Java 21, and times the classic `+=` loop until the quadratic curve is obvious. The production section rebuilds two bugs I'd expect in a backend: a CSV export that gets slower as data grows, and a shared builder that garbles log lines.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 (January 1996) shipped `String` as immutable from day one, and `StringBuffer` next to it as the way to build text. The 1990s idea of thread safety was to make library classes safe to share by default, so `StringBuffer`, like `Vector` and `Hashtable` from the same release, synchronized every method. It was also what `javac` used to compile the `+` operator: `\"a\" + b` became `new StringBuffer().append(\"a\").append(b).toString()`, so every concatenation in every program paid for a lock it never needed.",
        },
        {
          type: "paragraph",
          text: "Java 5 (2004) fixed that by adding `StringBuilder`: the same API with no synchronization, documented as a drop-in replacement \"in places where the string buffer was being used by a single thread (as is generally the case)\". Both classes became subclasses of a new package-private `AbstractStringBuilder`, and `javac` switched its `+` translation to `StringBuilder`. Java 9 changed both the storage and the translation again.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`String` immutable, `StringBuffer` with synchronized methods", "`javac` compiles `+` to a `StringBuffer` chain"],
            ["Java 1.2 (1998)", "`StringBuffer.delete`, `deleteCharAt`, `replace`, `substring`", "The editing API in its current shape"],
            ["Java 1.4 (2002)", "`CharSequence` interface; `indexOf` on `StringBuffer`", "`String` and the builders share a read-only view"],
            ["Java 5 (2004)", "`StringBuilder`, `AbstractStringBuilder`, `Appendable`", "Unsynchronized builder; `+` compiles to `StringBuilder`"],
            ["Java 6 (2006)", "HotSpot enables biased locking by default", "Uncontended locks, like `StringBuffer`'s, become very cheap"],
            ["Java 8 (2014)", "`StringJoiner`, `String.join`, `Collectors.joining`", "Joining with delimiters without manual builder code"],
            ["Java 9 (2017)", "Compact strings (JEP 254); indified concatenation (JEP 280)", "Builders store `byte[]` plus a coder; `+` compiles to `invokedynamic`"],
            ["Java 11 (2018)", "`StringBuilder` and `StringBuffer` implement `Comparable`; `CharSequence.compare`", "Content comparison without `toString()`"],
            ["Java 15 (2020)", "Biased locking disabled by default and deprecated (JEP 374)", "Uncontended `StringBuffer` locking costs a CAS again"],
            ["Java 21 (2023)", "`StringBuilder.repeat` and `StringBuffer.repeat`", "Repeat a char or string straight into the buffer"],
          ],
        },
        {
          type: "paragraph",
          text: "Two things about the Java 15 row. JEP 374 says the gains from biased locking had faded on modern hardware, and that the applications that benefited most were older ones built on collections that \"synchronize on every access (e.g., Hashtable and Vector)\". `StringBuffer` is the same design. The biased-locking code was removed from HotSpot afterwards: on my JDK 21, `java -XX:+UseBiasedLocking -version` fails with `Unrecognized VM option 'UseBiasedLocking'`. The Performance section measures what that leaves `StringBuffer` costing.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a printed label against a whiteboard.",
        },
        {
          type: "list",
          items: [
            "A **`String` is a printed label** from a label maker. To change one letter, I print a whole new label. The old one is still lying around until someone throws it away (the garbage collector).",
            "A **`StringBuilder` is a whiteboard**. I write, erase, squeeze a word in, all on the same board. Nothing new is printed while I work.",
            "The **board's width is the capacity**. When a line won't fit, I fetch a board a bit more than twice as wide and copy everything across before I continue. That copy is the real cost of growth, which is why starting with the right size board helps.",
            "**`toString()` is taking a photo** of the board. The photo is a `String`: rubbing out the board afterwards doesn't change the photo.",
            "A **`StringBuffer` is a whiteboard in a shared meeting room with one marker**. Whoever holds the marker writes; everyone else waits. But the marker is handed back after every single stroke, so two people writing sentences at the same time can still end up with their words interleaved.",
            "Several people writing on a **plain whiteboard at once** (a shared `StringBuilder`) overwrite each other's letters and sometimes knock the board over. That's the lost characters and the `ArrayIndexOutOfBoundsException` in the thread-safety section.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: in a real meeting room, someone has to walk over and pick up the marker even when they're alone. The JIT can prove a `StringBuffer` never leaves one method and remove its locks entirely (lock elision), which the Performance section measures. And a real whiteboard swap costs the same every time, while here the doubling rule makes the copying cheap on average: building a million characters one at a time allocated about 2.4 times the final size in total, not a million copies.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "String, StringBuilder and StringBuffer side by side",
        },
        {
          type: "table",
          headers: ["", "`String`", "`StringBuilder`", "`StringBuffer`"],
          rows: [
            ["Mutable", "No", "Yes", "Yes"],
            ["Thread-safe", "Yes, because it's immutable", "No", "Each method call is atomic; sequences of calls are not"],
            ["Since", "1.0", "5", "1.0"],
            ["Storage (Java 9+)", "`byte[] value` + `coder`, exact size", "`byte[] value` + `coder` + `count`, spare capacity", "Same as `StringBuilder`, plus `toStringCache`"],
            ["`equals` / `hashCode`", "By content", "Not overridden: identity", "Not overridden: identity"],
            ["`compareTo`", "Yes", "Yes, since 11", "Yes, since 11"],
            ["Typical use", "Values, keys, anything shared", "Building text in one thread", "Legacy APIs that require it"],
          ],
        },
        {
          type: "heading",
          text: "The class family",
        },
        {
          type: "diagram",
          text: `            CharSequence      Appendable      Comparable<T> (11+)
                 ▲                ▲                ▲
                 └────────┬───────┘                │
              AbstractStringBuilder                │
              (package-private, java.lang)         │
              byte[] value, byte coder,            │
              boolean maybeLatin1, int count       │
                 ▲                  ▲              │
        ┌────────┴──────┐  ┌────────┴───────┐      │
        │ StringBuilder │  │ StringBuffer   ├──────┤
        │ final, no     │  │ final, methods │      │
        │ locking       │  │ synchronized   │      │
        └───────┬───────┘  └────────────────┘      │
                └──────────────────────────────────┘`,
          caption: "Both builders are final, and both inherit the buffer and the algorithms from AbstractStringBuilder. StringBuffer's overrides add synchronized and a toString cache.",
        },
        {
          type: "paragraph",
          text: "Because both implement `CharSequence`, either can be passed anywhere a `CharSequence` is accepted: `String.contentEquals`, `Pattern.matcher`, `String.join`, `Appendable`-based formatters. Neither is a `String`, though, so a method declared with a `String` parameter won't take one; Common Mistakes has the compile error.",
        },
        {
          type: "heading",
          text: "Constructors and capacity",
        },
        {
          type: "table",
          headers: ["Constructor", "Initial capacity", "Content"],
          rows: [
            ["`new StringBuilder()`", "16", "empty"],
            ["`new StringBuilder(int capacity)`", "`capacity` (negative throws `NegativeArraySizeException`)", "empty"],
            ["`new StringBuilder(String s)`", "`s.length() + 16`", "a copy of `s`"],
            ["`new StringBuilder(CharSequence cs)`", "`cs.length() + 16`", "a copy of `cs`"],
          ],
        },
        {
          type: "paragraph",
          text: "**Length** is the number of chars currently in the builder (`length()`). **Capacity** is how many chars fit before the internal array has to be replaced (`capacity()`). When an append needs more room, the new capacity is `max(needed, old * 2 + 2)`. The next section but one prints that rule step by step.",
        },
        {
          type: "heading",
          text: "The API in one table",
        },
        {
          type: "table",
          headers: ["Method", "What it does", "Notes"],
          rows: [
            ["`append(x)`", "Adds `x` at the end", "Overloaded for every primitive, `char[]`, `String`, `CharSequence`, `Object`; `null` appends `\"null\"`"],
            ["`insert(offset, x)`", "Inserts `x` before `offset`", "Shifts everything after `offset` right: O(length)"],
            ["`delete(start, end)`", "Removes `[start, end)`", "`end` past the length is clamped, `start > end` throws"],
            ["`deleteCharAt(i)`", "Removes one char", "Shifts the tail left"],
            ["`replace(start, end, str)`", "Replaces `[start, end)` with `str`", "Positional, unlike `String.replace`"],
            ["`reverse()`", "Reverses in place", "Keeps surrogate pairs in order"],
            ["`setCharAt(i, c)`", "Overwrites one char", "No shifting"],
            ["`setLength(n)`", "Truncates, or pads with `'\\u0000'`", "`setLength(0)` empties the builder and keeps the array"],
            ["`capacity()`, `ensureCapacity(n)`, `trimToSize()`", "Inspect, grow, shrink the array", "`ensureCapacity` grows by the normal rule"],
            ["`charAt`, `indexOf`, `lastIndexOf`, `substring`, `chars`, `codePoints`", "Read without changing", "`substring` returns a new `String`"],
            ["`repeat(cs, n)`, `repeat(codePoint, n)`", "Appends `n` copies", "Java 21"],
            ["`compareTo(other)`", "Lexicographic comparison", "Java 11; `equals` is still identity"],
            ["`toString()`", "Copies the content into a new `String`", "The builder stays usable"],
          ],
        },
        {
          type: "paragraph",
          text: "Every mutating method returns `this` (typed as `StringBuilder` or `StringBuffer`), which is what makes `sb.append(a).append(',').append(b)` chain. The chain is plain method calls on one object; nothing about it is special to the compiler.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The fields",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.lang.AbstractStringBuilder | head -6
javap -p java.lang.StringBuffer | grep -E "class|toStringCache"`,
        },
        {
          type: "output",
          text: `Compiled from "AbstractStringBuilder.java"
abstract class java.lang.AbstractStringBuilder implements java.lang.Appendable,java.lang.CharSequence {
  byte[] value;
  byte coder;
  boolean maybeLatin1;
  int count;
public final class java.lang.StringBuffer extends java.lang.AbstractStringBuilder implements java.lang.Appendable, java.io.Serializable, java.lang.Comparable<java.lang.StringBuffer>, java.lang.CharSequence {
  private transient java.lang.String toStringCache;`,
        },
        {
          type: "list",
          items: [
            "`value` is the buffer. Since Java 9 it's a `byte[]`, not a `char[]`: the compact strings design from JEP 254 applies to builders as well as to `String`.",
            "`coder` says how to read those bytes: `0` (LATIN1) means one byte per char, `1` (UTF16) means two bytes per char. So `capacity()` is `value.length >> coder`, not `value.length`.",
            "`count` is the length: how many chars of `value` are in use. Everything past `count` is spare capacity.",
            "`maybeLatin1` is a hint that a UTF-16 buffer might hold only Latin-1 chars again after a deletion, so `toString()` should try to compress. It's on my JDK 21 build and in the JDK 25 source.",
            "`StringBuffer` adds `toStringCache`, a `String` remembered from the last `toString()` and cleared by every modification. It's `transient` and isn't serialized.",
          ],
        },
        {
          type: "heading",
          text: "Latin-1 until it can't be",
        },
        {
          type: "paragraph",
          text: "A new builder starts in LATIN1. The first char that doesn't fit in one byte **inflates** the whole buffer to UTF-16: a new array twice the size, every existing char widened. I read the private fields with reflection to watch it happen, which needs `--add-opens` because `java.lang` isn't open to my code:",
        },
        {
          type: "code",
          language: "java",
          title: "Inflation.java",
          code: `import java.lang.reflect.Field;

public class Inflation {
    static Field value, coder;

    static void show(String label, StringBuilder sb) throws Exception {
        byte[] bytes = (byte[]) value.get(sb);
        byte c = coder.getByte(sb);
        System.out.printf("%-26s length %2d  capacity %2d  coder %d (%s)  value.length %2d bytes%n",
                label, sb.length(), sb.capacity(), c, c == 0 ? "LATIN1" : "UTF16", bytes.length);
    }

    public static void main(String[] args) throws Exception {
        Class<?> asb = StringBuilder.class.getSuperclass();     // AbstractStringBuilder
        value = asb.getDeclaredField("value");
        coder = asb.getDeclaredField("coder");
        value.setAccessible(true);
        coder.setAccessible(true);

        StringBuilder sb = new StringBuilder();
        show("new StringBuilder()", sb);
        sb.append("Caf");
        show("append(\\"Caf\\")", sb);
        sb.append('é');                                        // U+00E9, inside Latin-1
        show("append('é')", sb);
        sb.append(" ₹");                                       // U+20B9, outside Latin-1
        show("append(\\" ₹\\")", sb);
        sb.setLength(4);                                       // remove the rupee sign again
        show("setLength(4)", sb);
        sb.trimToSize();
        show("trimToSize()", sb);

        Field strValue = String.class.getDeclaredField("value");
        Field strCoder = String.class.getDeclaredField("coder");
        strValue.setAccessible(true);
        strCoder.setAccessible(true);
        String result = sb.toString();
        System.out.printf("%-26s String coder %d (LATIN1)  value.length %d bytes%n",
                "toString() \\"" + result + "\\"", strCoder.getByte(result), ((byte[]) strValue.get(result)).length);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Inflation.java
java --add-opens java.base/java.lang=ALL-UNNAMED Inflation`,
        },
        {
          type: "output",
          text: `new StringBuilder()        length  0  capacity 16  coder 0 (LATIN1)  value.length 16 bytes
append("Caf")              length  3  capacity 16  coder 0 (LATIN1)  value.length 16 bytes
append('é')                length  4  capacity 16  coder 0 (LATIN1)  value.length 16 bytes
append(" ₹")               length  6  capacity 16  coder 1 (UTF16)  value.length 32 bytes
setLength(4)               length  4  capacity 16  coder 1 (UTF16)  value.length 32 bytes
trimToSize()               length  4  capacity  4  coder 1 (UTF16)  value.length  8 bytes
toString() "Café"          String coder 0 (LATIN1)  value.length 4 bytes`,
        },
        {
          type: "list",
          items: [
            "`é` is U+00E9, inside Latin-1, so it costs one byte like any ASCII letter. Latin-1 is not the same as ASCII.",
            "`₹` (U+20B9) forced the switch. The capacity stayed 16 chars, but the array went from 16 to 32 bytes, because every char now takes two.",
            "Deleting the rupee sign did **not** shrink the builder back to LATIN1. Once inflated, a builder stays UTF16 for its lifetime; `trimToSize()` only cut the array to 4 chars, which is 8 bytes.",
            "`toString()` still produced a compact LATIN1 `String` of 4 bytes. The `String` constructor checks whether the content fits in Latin-1 and compresses it if so. So the inflation is a cost while building, not something the result carries.",
            "I ran the same file on JDK 25 and got identical output.",
          ],
        },
        {
          type: "heading",
          text: "The growth code",
        },
        {
          type: "paragraph",
          text: "The JDK 21 `src.zip` on my machine is a broken link, so I read the growth logic two ways: the JDK 25 source, and `javap -c -p java.lang.AbstractStringBuilder` on JDK 21 to check the 21 bytecode does the same thing. Written back as Java, the JDK 21 version is:",
        },
        {
          type: "code",
          language: "java",
          code: `// AbstractStringBuilder, JDK 21 (read back from javap -c -p)
private void ensureCapacityInternal(int minimumCapacity) {
    int oldCapacity = value.length >> coder;
    if (minimumCapacity - oldCapacity > 0) {
        value = Arrays.copyOf(value, newCapacity(minimumCapacity) << coder);
    }
}

private int newCapacity(int minCapacity) {
    int oldLength = value.length;                    // in bytes
    int newLength = minCapacity << coder;            // bytes actually needed
    int growth = newLength - oldLength;
    int length = ArraysSupport.newLength(oldLength, growth, oldLength + (2 << coder));
    if (length == Integer.MAX_VALUE) {
        throw new OutOfMemoryError("Required length exceeds implementation limit");
    }
    return length >> coder;                          // back to chars
}

// jdk.internal.util.ArraysSupport
public static int newLength(int oldLength, int minGrowth, int prefGrowth) {
    int prefLength = oldLength + Math.max(minGrowth, prefGrowth);
    if (0 < prefLength && prefLength <= SOFT_MAX_ARRAY_LENGTH) {   // Integer.MAX_VALUE - 8
        return prefLength;
    }
    return hugeLength(oldLength, minGrowth);
}`,
        },
        {
          type: "paragraph",
          text: "The preferred growth is `oldLength + (2 << coder)` bytes, so the new byte length is `2 * oldLength + 2` for LATIN1 and `2 * oldLength + 4` for UTF16. Converted back to chars, both are **`old * 2 + 2`**. If even that's not enough for the append, it takes exactly what's needed instead. `Arrays.copyOf` then allocates the new array and copies every existing byte. The old array becomes garbage.",
        },
        {
          type: "heading",
          text: "StringBuffer is StringBuilder plus a flag",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -v java.lang.StringBuffer | grep -A2 -E "^  public (synchronized )?java.lang.StringBuffer (append\\(java.lang.String\\)|reverse\\(\\));"
javap -v java.lang.StringBuilder | grep -A2 -E "^  public java.lang.StringBuilder (append\\(java.lang.String\\)|reverse\\(\\));"`,
        },
        {
          type: "output",
          text: `  public synchronized java.lang.StringBuffer append(java.lang.String);
    descriptor: (Ljava/lang/String;)Ljava/lang/StringBuffer;
    flags: (0x0021) ACC_PUBLIC, ACC_SYNCHRONIZED
--
  public synchronized java.lang.StringBuffer reverse();
    descriptor: ()Ljava/lang/StringBuffer;
    flags: (0x0021) ACC_PUBLIC, ACC_SYNCHRONIZED
  public java.lang.StringBuilder append(java.lang.String);
    descriptor: (Ljava/lang/String;)Ljava/lang/StringBuilder;
    flags: (0x0001) ACC_PUBLIC
--
  public java.lang.StringBuilder reverse();
    descriptor: ()Ljava/lang/StringBuilder;
    flags: (0x0001) ACC_PUBLIC`,
        },
        {
          type: "paragraph",
          text: "The bodies are almost the same too:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c java.lang.StringBuffer | sed -n '/public synchronized java.lang.StringBuffer append(java.lang.String)/,/areturn/p'
javap -c java.lang.StringBuilder | sed -n '/public java.lang.StringBuilder append(java.lang.String)/,/areturn/p'`,
        },
        {
          type: "output",
          text: `  public synchronized java.lang.StringBuffer append(java.lang.String);
    Code:
       0: aload_0
       1: aconst_null
       2: putfield      #34                 // Field toStringCache:Ljava/lang/String;
       5: aload_0
       6: aload_1
       7: invokespecial #73                 // Method java/lang/AbstractStringBuilder.append:(Ljava/lang/String;)Ljava/lang/AbstractStringBuilder;
      10: pop
      11: aload_0
      12: areturn
  public java.lang.StringBuilder append(java.lang.String);
    Code:
       0: aload_0
       1: aload_1
       2: invokespecial #29                 // Method java/lang/AbstractStringBuilder.append:(Ljava/lang/String;)Ljava/lang/AbstractStringBuilder;
       5: pop
       6: aload_0
       7: areturn`,
        },
        {
          type: "list",
          items: [
            "There is no `monitorenter` or `monitorexit` in the `StringBuffer` method. A `synchronized` **method** is just the `ACC_SYNCHRONIZED` flag (0x0020); the JVM acquires the object's monitor before running the body and releases it on return or on an exception. Only a `synchronized` **block** compiles to explicit monitor instructions.",
            "Both delegate the real work to the same `AbstractStringBuilder.append` with `invokespecial` (a `super.` call). The only extra line in `StringBuffer` clears `toStringCache`.",
            "Both return `this` (`aload_0`, `areturn`), with the subclass type in the descriptor, so chains keep the right type.",
          ],
        },
        {
          type: "paragraph",
          text: "Not every public `StringBuffer` method carries the flag. Of the 95 public methods and constructors `javap -p` lists on JDK 21, 45 are `synchronized`. Most of the rest are constructors, the compiler's bridge methods (the ones returning `AbstractStringBuilder` or `Appendable`), and convenience overloads like `insert(int, int)` that just call a synchronized method. Two that read the buffer without any lock are `chars()` and `codePoints()`, inherited from `AbstractStringBuilder`.",
        },
        {
          type: "heading",
          text: "Biased locking and what it changed",
        },
        {
          type: "paragraph",
          text: "Acquiring an uncontended monitor in HotSpot is a compare-and-swap on the object header (on JDK 21 by default; on JDK 25 the default lightweight locking also starts with a CAS). From Java 6 to Java 14, **biased locking** went one step further: the first thread to lock an object \"biased\" it to itself, and later locks by that same thread needed no atomic instruction at all. That made a `StringBuffer` used by one thread nearly as cheap as a `StringBuilder`. Revoking a bias when a second thread showed up was expensive, though, and needed a safepoint. JEP 374 disabled it by default in JDK 15, and JDK 21 no longer knows the flag. So on a current JVM, every call on a `StringBuffer` that escapes its method pays a real atomic operation, unless the JIT removes the lock. Both effects are measured in the Performance section.",
        },
      ],
    },
    {
      title: "Capacity and Growth, Measured",
      blocks: [
        {
          type: "paragraph",
          text: "To see the `old * 2 + 2` rule, I appended one char at a time and printed every capacity change:",
        },
        {
          type: "code",
          language: "java",
          title: "CapacityGrowth.java",
          code: `public class CapacityGrowth {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();
        int last = sb.capacity();
        System.out.println("length    0  capacity " + last + "  (new StringBuilder())");
        for (int i = 1; i <= 300; i++) {
            sb.append('x');
            if (sb.capacity() != last) {
                System.out.printf("length %4d  capacity %3d  = %d * 2 + 2%n", i, sb.capacity(), last);
                last = sb.capacity();
            }
        }

        System.out.println();
        System.out.println("new StringBuilder(\\"Order\\")  capacity " + new StringBuilder("Order").capacity());
        System.out.println("new StringBuilder(100)      capacity " + new StringBuilder(100).capacity());
        System.out.println("new StringBuilder(0)        capacity " + new StringBuilder(0).capacity());

        StringBuilder jump = new StringBuilder();          // capacity 16
        jump.append("a".repeat(50));                        // 16 * 2 + 2 = 34 is not enough
        System.out.println("append 50 chars to 16       capacity " + jump.capacity());
    }
}`,
        },
        {
          type: "output",
          text: `length    0  capacity 16  (new StringBuilder())
length   17  capacity  34  = 16 * 2 + 2
length   35  capacity  70  = 34 * 2 + 2
length   71  capacity 142  = 70 * 2 + 2
length  143  capacity 286  = 142 * 2 + 2
length  287  capacity 574  = 286 * 2 + 2

new StringBuilder("Order")  capacity 21
new StringBuilder(100)      capacity 100
new StringBuilder(0)        capacity 0
append 50 chars to 16       capacity 50`,
        },
        {
          type: "list",
          items: [
            "The 17th char doesn't fit in 16, so the buffer becomes 34. Every later growth is the same rule: 34, 70, 142, 286, 574.",
            "`new StringBuilder(\"Order\")` is `5 + 16 = 21`: the String constructor leaves 16 chars of headroom on top of the initial text.",
            "Appending 50 chars at once to a 16-char builder went straight to 50, not 34. When `old * 2 + 2` is too small, the builder takes exactly what's needed, and the next growth doubles from there.",
          ],
        },
        {
          type: "image",
          src: "/images/java/stringbuilder-and-stringbuffer-capacity-growth.svg",
          alt: "A StringBuilder object with fields value, coder = 0 (LATIN1) and count = 16 points to a 16-byte array that is full. Appending a 17th char allocates a new 34-byte array, copies the 16 bytes across and writes the new char at index 16, leaving 17 spare slots; the old array becomes garbage. A second step shows 35 chars needing a 70-byte array. A row of capacities reads 16, 34, 70, 142, 286, 574, each old times two plus two. A lower panel shows inflation: appending the rupee sign to a LATIN1 builder replaces its 16-byte array with a 32-byte UTF16 array for the same 16-char capacity.",
          caption: "Growth replaces the array; it never extends it. Inflation does the same, keeping the capacity in chars and doubling the bytes.",
        },
        {
          type: "heading",
          text: "ensureCapacity, trimToSize and setLength",
        },
        {
          type: "code",
          language: "java",
          title: "EnsureTrim.java",
          code: `public class EnsureTrim {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();
        System.out.println("start                  capacity " + sb.capacity());

        sb.ensureCapacity(10);                   // already enough: nothing happens
        System.out.println("ensureCapacity(10)     capacity " + sb.capacity());

        sb.ensureCapacity(17);                   // grows by the normal rule, not to 17
        System.out.println("ensureCapacity(17)     capacity " + sb.capacity());

        sb.ensureCapacity(100);                  // 34 * 2 + 2 = 70 is too small, so 100
        System.out.println("ensureCapacity(100)    capacity " + sb.capacity());

        sb.append("Invoice #1042");
        sb.trimToSize();                         // shrink the array to the length
        System.out.println("trimToSize()           capacity " + sb.capacity() + ", length " + sb.length());

        sb.setLength(0);                         // empty, but the array stays
        System.out.println("setLength(0)           capacity " + sb.capacity() + ", length " + sb.length());

        sb.ensureCapacity(-5);                   // negative: silently ignored
        System.out.println("ensureCapacity(-5)     capacity " + sb.capacity());
    }
}`,
        },
        {
          type: "output",
          text: `start                  capacity 16
ensureCapacity(10)     capacity 16
ensureCapacity(17)     capacity 34
ensureCapacity(100)    capacity 100
trimToSize()           capacity 13, length 13
setLength(0)           capacity 13, length 0
ensureCapacity(-5)     capacity 13`,
        },
        {
          type: "list",
          items: [
            "`ensureCapacity(n)` guarantees **at least** `n`. It uses the same `max(n, old * 2 + 2)` rule as an append, so asking for 17 gave 34. To get an exact size, I pass it to the constructor instead.",
            "`trimToSize()` copies the content into an array of exactly `length()` chars. It's worth calling on a builder that will be kept around for a long time after it's finished growing; for a builder that's about to be turned into a `String` and dropped, it's a wasted copy.",
            "`setLength(0)` resets `count` and keeps the array, which is what makes reusing one builder in a loop cheap. Example 3 measures it.",
          ],
        },
        {
          type: "heading",
          text: "What growth costs",
        },
        {
          type: "paragraph",
          text: "Doubling keeps the number of copies small, but each copy allocates a new array. I measured the bytes allocated by the current thread (`com.sun.management.ThreadMXBean.getCurrentThreadAllocatedBytes`, a HotSpot extension) while building one million chars, with and without presizing:",
        },
        {
          type: "code",
          language: "java",
          title: "GrowthCost.java",
          code: `import java.lang.management.ManagementFactory;

public class GrowthCost {
    static final com.sun.management.ThreadMXBean THREADS =
            (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();

    static long allocated() {
        return THREADS.getCurrentThreadAllocatedBytes();
    }

    static int build(StringBuilder sb, int n) {
        int grows = 0;
        int cap = sb.capacity();
        for (int i = 0; i < n; i++) {
            sb.append('x');
            if (sb.capacity() != cap) {
                grows++;
                cap = sb.capacity();
            }
        }
        return grows;
    }

    public static void main(String[] args) {
        int n = 1_000_000;
        build(new StringBuilder(), n);            // warm-up, so class loading isn't counted
        build(new StringBuilder(n), n);

        long before = allocated();
        StringBuilder growing = new StringBuilder();
        int grows = build(growing, n);
        long growingBytes = allocated() - before;

        before = allocated();
        StringBuilder presized = new StringBuilder(n);
        int presizedGrows = build(presized, n);
        long presizedBytes = allocated() - before;

        System.out.printf("default  : %2d grows, final capacity %,d, allocated %,d bytes%n",
                grows, growing.capacity(), growingBytes);
        System.out.printf("presized : %2d grows, final capacity %,d, allocated %,d bytes%n",
                presizedGrows, presized.capacity(), presizedBytes);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx256m GrowthCost`,
        },
        {
          type: "output",
          text: `default  : 16 grows, final capacity 1,179,646, allocated 2,359,576 bytes
presized :  0 grows, final capacity 1,000,000, allocated 1,000,040 bytes`,
        },
        {
          type: "list",
          items: [
            "Sixteen growths took the buffer from 16 to 1,179,646 chars. The arrays along the way add up to about twice the final one (16 + 34 + ... + 1,179,646), so the default builder allocated 2.36 MB to hold 1 MB of text, and copied about 1.2 MB of it during growth.",
            "The final buffer is 18% bigger than the content. If that builder were kept, `trimToSize()` would give the space back.",
            "Presized, it allocated exactly one 1,000,000-byte array plus the headers of the array and the builder: 1,000,040 bytes.",
            "The numbers were identical on three runs. Allocation counts don't depend on timing, which makes them a better measurement than milliseconds on a busy machine.",
          ],
        },
        {
          type: "paragraph",
          text: "So growth is amortized O(1) per appended char, and presizing removes a constant factor, not a complexity class. That's the important contrast with `+=` in a loop, which is O(n) per step and is measured two sections down.",
        },
      ],
    },
  ],
};
