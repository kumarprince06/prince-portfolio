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
    {
      title: "How javac Compiles +",
      blocks: [
        {
          type: "paragraph",
          text: "Every Java developer has heard \"`+` on strings uses a `StringBuilder` behind the scenes\". That was true up to Java 8 and isn't any more. I compiled the same method twice with the JDK 21 `javac`: once with `--release 8`, which produces Java 8 class files with the Java 8 translation, and once normally.",
        },
        {
          type: "code",
          language: "java",
          title: "Concat.java",
          code: `public class Concat {
    static String greet(String name, int age) {
        return "Hi " + name + ", age " + age + "!";
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 8 -d j8 Concat.java && javap -c -cp j8 Concat
javac -d j21 Concat.java && javap -c -cp j21 Concat`,
        },
        {
          type: "output",
          text: `  static java.lang.String greet(java.lang.String, int);
    Code:
       0: new           #7                  // class java/lang/StringBuilder
       3: dup
       4: invokespecial #9                  // Method java/lang/StringBuilder."<init>":()V
       7: ldc           #10                 // String Hi
       9: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      12: aload_0
      13: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      16: ldc           #16                 // String , age
      18: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      21: iload_1
      22: invokevirtual #18                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      25: ldc           #21                 // String !
      27: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      30: invokevirtual #23                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
      33: areturn`,
        },
        {
          type: "paragraph",
          text: "That's the `--release 8` class file. The Java 21 class file for the same source:",
        },
        {
          type: "output",
          text: `  static java.lang.String greet(java.lang.String, int);
    Code:
       0: aload_0
       1: iload_1
       2: invokedynamic #7,  0              // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;I)Ljava/lang/String;
       7: areturn`,
        },
        {
          type: "list",
          items: [
            "**Java 8 and earlier:** `new StringBuilder()`, one `append` per operand, `toString()`. That's 34 bytes of bytecode, and the builder starts at the default capacity of 16, so a longer result grows it, with the copy that costs.",
            "**Java 9 and later (JEP 280):** one `invokedynamic` instruction that passes the two variables. The constant parts (`\"Hi \"`, `\", age \"`, `\"!\"`) are stored in a recipe string in the bootstrap method arguments. 8 bytes of bytecode.",
            "The first time that `invokedynamic` runs, the JVM calls `StringConcatFactory.makeConcatWithConstants`, which builds a method handle specialised for exactly these argument types. On JDK 21 that strategy computes the exact final length and coder first, allocates one `byte[]` of the right size, and fills it, so no builder and no growth. Later calls go straight to the linked handle.",
            "Because the strategy lives in the JDK, not in my class file, a newer JVM can use a better strategy for old class files without recompiling. That was the main argument for JEP 280.",
            "Constant expressions like `\"Kol\" + \"kata\"` don't reach either form; `javac` folds them, as the Strings lesson showed.",
          ],
        },
        {
          type: "paragraph",
          text: "So for one expression, however many `+` it has, plain `+` is the right choice on Java 9+, and replacing it with a hand-written `StringBuilder` chain doesn't make it faster. What `invokedynamic` can't fix is a **loop**: each iteration is a separate concatenation that creates a separate `String`.",
        },
      ],
    },
    {
      title: "The Cost of + in a Loop",
      blocks: [
        {
          type: "paragraph",
          text: "`s += \"x\"` means `s = s + \"x\"`: create a new `String` with room for the old text plus the new piece, copy the old text in, and drop the old string. On the 1,000th pass it copies 999 chars, on the 100,000th it copies 99,999. The total copying for `n` passes is about `n²/2` chars. A `StringBuilder` copies only when it grows, which the previous sections showed is amortized O(1) per char.",
        },
        {
          type: "code",
          language: "java",
          title: "ConcatLoop.java",
          code: `public class ConcatLoop {
    static String plus(int n) {
        String s = "";
        for (int i = 0; i < n; i++) s += "x";
        return s;
    }

    static String builder(int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append("x");
        return sb.toString();
    }

    static long ms(Runnable r) {
        long t = System.nanoTime();
        r.run();
        return (System.nanoTime() - t) / 1_000_000;
    }

    public static void main(String[] args) {
        plus(20_000); builder(20_000);                                 // warm-up
        for (int n : new int[] {25_000, 50_000, 100_000, 200_000}) {
            long p = ms(() -> plus(n));
            long b = ms(() -> builder(n));
            System.out.printf("n = %,7d   += : %5d ms   StringBuilder : %d ms%n", n, p, b);
        }
    }
}`,
        },
        {
          type: "output",
          text: `n =  25,000   += :    59 ms   StringBuilder : 0 ms
n =  50,000   += :   221 ms   StringBuilder : 1 ms
n = 100,000   += :   483 ms   StringBuilder : 1 ms
n = 200,000   += :  1909 ms   StringBuilder : 0 ms`,
        },
        {
          type: "list",
          items: [
            "Each time `n` doubles, the `+=` time roughly quadruples: 59, 221, 483, 1,909 ms. That's the signature of O(n²). A first run on the same machine gave 59, 329, 580 and 2,274 ms: the exact numbers move, the shape doesn't.",
            "The `StringBuilder` version stays at 0 to 2 ms for every size, too fast for millisecond timing to measure. 200,000 appends of one char is nothing.",
            "At 200,000 chars, the `+=` loop copied about 20 billion bytes in total (n²/2, one byte per Latin-1 char) and created 200,000 intermediate strings for the garbage collector.",
            "`invokedynamic` doesn't help here. Each `s += \"x\"` is a complete concatenation of two operands, and it can't know there will be another one on the next pass. `javac` doesn't rewrite loops, and neither does the JIT.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "The rule I actually use",
          text: "One expression, any number of `+`: use `+`. Text built across loop iterations, method calls or `if` branches: use one `StringBuilder` and call `toString()` once at the end. Joining a collection: `String.join` or `Collectors.joining`.",
        },
      ],
    },
    {
      title: "StringBuffer and Thread Safety",
      blocks: [
        {
          type: "paragraph",
          text: "`StringBuffer` is called thread-safe because each of its methods is `synchronized`. That makes each **single call** atomic: no two threads are inside `append` on the same buffer at once. It says nothing about a **sequence** of calls. I raced four threads against a shared `StringBuilder` and a shared `StringBuffer` to see what each one actually guarantees:",
        },
        {
          type: "code",
          language: "java",
          title: "SharedBuilders.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SharedBuilders {
    // Runs the same work on 4 threads named A to D and reports any exceptions
    static void race(String label, Runnable work) throws InterruptedException {
        List<Thread> threads = new ArrayList<>();
        List<Throwable> errors = new ArrayList<>();
        for (String name : List.of("A", "B", "C", "D")) {
            Thread t = new Thread(work, name);
            t.setUncaughtExceptionHandler((th, e) -> { synchronized (errors) { errors.add(e); } });
            threads.add(t);
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        System.out.println(label + (errors.isEmpty() ? "" : "   threads died: " + errors.size()
                + " (" + errors.get(0).getClass().getSimpleName() + ")"));
    }

    static int intact(CharSequence text) {
        Matcher m = Pattern.compile("\\\\[[A-D]\\\\]").matcher(text);
        int n = 0;
        while (m.find()) n++;
        return n;
    }

    public static void main(String[] args) throws InterruptedException {
        // 1. One append per step: 4 threads x 100,000 chars
        StringBuilder builder = new StringBuilder();
        race("StringBuilder", () -> { for (int i = 0; i < 100_000; i++) builder.append('x'); });
        System.out.println("  length " + builder.length() + " (expected 400000)");

        StringBuffer buffer = new StringBuffer();
        race("StringBuffer", () -> { for (int i = 0; i < 100_000; i++) buffer.append('x'); });
        System.out.println("  length " + buffer.length() + " (expected 400000)");

        // 2. One record = three appends: "[" + name + "]"
        StringBuffer records = new StringBuffer();
        race("StringBuffer, three appends per record", () -> {
            String name = Thread.currentThread().getName();
            for (int i = 0; i < 10_000; i++) records.append('[').append(name).append(']');
        });
        System.out.println("  intact records " + intact(records) + " of 40000, length " + records.length());

        // 3. The same, with the whole record under the buffer's own lock
        StringBuffer locked = new StringBuffer();
        race("StringBuffer, synchronized (sb) around each record", () -> {
            String name = Thread.currentThread().getName();
            for (int i = 0; i < 10_000; i++) {
                synchronized (locked) { locked.append('[').append(name).append(']'); }
            }
        });
        System.out.println("  intact records " + intact(locked) + " of 40000, length " + locked.length());
    }
}`,
        },
        {
          type: "output",
          text: `StringBuilder   threads died: 3 (ArrayIndexOutOfBoundsException)
  length 101071 (expected 400000)
StringBuffer
  length 400000 (expected 400000)
StringBuffer, three appends per record
  intact records 20173 of 40000, length 120000
StringBuffer, synchronized (sb) around each record
  intact records 40000 of 40000, length 120000`,
        },
        {
          type: "list",
          items: [
            "**Shared `StringBuilder`: broken.** Three of the four threads died with `ArrayIndexOutOfBoundsException`, and only 101,071 of 400,000 chars arrived. `append` reads `count`, checks capacity, writes the char and stores `count + 1`. Two threads can read the same `count` and overwrite each other, or one can grow the array while another is still writing to the old one at an index that's now out of range. Over several runs I saw one to three dead threads and lengths from about 100,000 to 108,000. It's never correct.",
            "**Shared `StringBuffer`, one append per step: correct.** Exactly 400,000 chars and no exceptions, every run. Each `append` holds the buffer's lock from start to finish.",
            "**Shared `StringBuffer`, three appends per record: still broken.** All 120,000 chars arrived, but only 20,173 of 40,000 records were intact, and across my runs it ranged from about 15,000 to 22,000. Between `append('[')` and `append(name)`, another thread can take the lock and write its own `[`. One run started with `[[A B]]...`. The class is thread-safe; my code using it wasn't.",
            "**`synchronized (locked)` around the whole record: correct.** All 40,000 records intact. A `StringBuffer`'s methods lock on the buffer itself, so the outer block holds the same lock and the three calls can't be interleaved (Java monitors are reentrant, so the inner `synchronized` methods don't deadlock). But once I'm writing my own lock, a `StringBuilder` inside it would be just as correct.",
          ],
        },
        {
          type: "paragraph",
          text: "That's why `StringBuffer` is rarely the right answer. Text building is almost always confined to one thread: a method builds a string and returns it. If several threads really do need to contribute to one piece of text, each thread can build its own part with a local `StringBuilder` and hand over the finished `String`, which is immutable and safe to share. The production section has the logging version of this bug.",
        },
      ],
    },
    {
      title: "StringJoiner, String.join and Collectors.joining",
      blocks: [
        {
          type: "paragraph",
          text: "The most common thing I built with a `StringBuilder` used to be a list with separators, and the most common bug in it was a separator after the last item. Java 8 added three ways to do it without that check:",
        },
        {
          type: "code",
          language: "java",
          title: "Joining.java",
          code: `import java.util.List;
import java.util.StringJoiner;
import java.util.stream.Collectors;

public class Joining {
    record Item(String name, int qty) { }

    public static void main(String[] args) {
        List<String> cities = List.of("Kolkata", "Pune", "Delhi");

        System.out.println(String.join(", ", cities));

        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (String c : cities) sj.add(c);
        System.out.println(sj + "  length " + sj.length());

        StringJoiner empty = new StringJoiner(", ", "[", "]");
        System.out.println(empty);
        empty.setEmptyValue("no cities");
        System.out.println(empty);

        List<Item> cart = List.of(new Item("tea", 2), new Item("samosa", 4));
        System.out.println(cart.stream()
                .map(i -> i.qty() + " x " + i.name())
                .collect(Collectors.joining("; ", "Order: ", ".")));

        // The manual version everyone writes once
        StringBuilder sb = new StringBuilder();
        for (String c : cities) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(c);
        }
        System.out.println(sb);
    }
}`,
        },
        {
          type: "output",
          text: `Kolkata, Pune, Delhi
[Kolkata, Pune, Delhi]  length 22
[]
no cities
Order: 2 x tea; 4 x samosa.
Kolkata, Pune, Delhi`,
        },
        {
          type: "table",
          headers: ["Tool", "Use it when", "Notes"],
          rows: [
            ["`String.join(sep, items)`", "I already have an array or `Iterable` of `CharSequence`s", "Simplest; no prefix or suffix"],
            ["`StringJoiner(sep, prefix, suffix)`", "Items arrive one at a time in a loop, maybe conditionally", "`setEmptyValue` controls the output with no items; by default it's prefix + suffix (`[]`)"],
            ["`Collectors.joining(sep, prefix, suffix)`", "The items come out of a stream", "Uses a `StringBuilder` per stream, or per chunk for parallel streams"],
            ["`StringBuilder` by hand", "Mixed content, not just a list: headers, numbers, conditional parts", "I do the separator check myself; `isEmpty()` on a builder is Java 15"],
          ],
        },
        {
          type: "paragraph",
          text: "`String.join` and `Collectors.joining` are built on `StringJoiner`, which keeps the pieces and only builds the final `String` in `toString()`. All of them accept `CharSequence`, so a `StringBuilder` can be one of the items.",
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
        StringBuilder sb = new StringBuilder();
        sb.append("Order #").append(1042);
        System.out.println(sb.length() + "/" + sb.capacity());
        sb.append(" for ").append("Asha Rao");
        System.out.println(sb.length() + "/" + sb.capacity());
        String receipt = sb.toString();
        sb.setLength(0);
        System.out.println("[" + receipt + "] [" + sb + "] " + sb.capacity());
    }
}`,
        },
        {
          type: "output",
          text: `11/16
24/34
[Order #1042 for Asha Rao] [] 34`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`new StringBuilder()`.** Allocates the builder object and a 16-byte array. `coder` is LATIN1, `count` is 0, capacity 16.",
            "**`append(\"Order #\")`.** 7 chars fit, so the bytes are copied into the array at index 0 and `count` becomes 7. The method returns `this`, so the chain continues on the same object.",
            "**`append(1042)`.** The `int` is written as digits straight into the buffer, without creating a `String` for `\"1042\"`. `count` is 11. Capacity is still 16.",
            "**`append(\" for \")`.** 16 total, still fits exactly.",
            "**`append(\"Asha Rao\")`.** 24 chars are needed and only 16 fit. The new capacity is `max(24, 16 * 2 + 2) = 34`. A 34-byte array is allocated, the 16 existing bytes are copied, the old array becomes garbage, and the 8 new chars are written. `count` is 24.",
            "**`toString()`.** Creates a new `String`, copying the 24 used bytes into an exact-size array. `coder` is LATIN1, so the result is compact. The builder and the string now share nothing.",
            "**`setLength(0)`.** Sets `count` to 0. The 34-byte array stays, so the builder is ready for reuse with no allocation. `receipt` is unaffected because it has its own copy.",
            "**After `main`.** The builder and its array are unreachable; so is the old 16-byte array from step 5. They're collected at the next young GC. If the JIT had compiled this method and proved the builder never escapes, it could have skipped allocating the builder object altogether (escape analysis).",
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
          title: "BuilderTour.java",
          code: `public class BuilderTour {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("Kolkata");
        StringBuilder same = sb.append(" 700001");
        System.out.println(sb + " | same object? " + (sb == same));

        sb.insert(0, "City: ");                  System.out.println(sb);
        sb.replace(0, 4, "Town");                System.out.println(sb);
        sb.delete(sb.indexOf(" 7"), sb.length()); System.out.println(sb);
        sb.deleteCharAt(4);                      System.out.println(sb);
        sb.setCharAt(0, 't');                    System.out.println(sb);
        sb.reverse();                            System.out.println(sb);
        sb.reverse();
        System.out.println(sb.charAt(1) + " " + sb.indexOf("Kol") + " " + sb.length() + " " + sb.substring(5));

        sb.setLength(4);                         System.out.println("[" + sb + "]");
        sb.append(1).append('-').append(2.5).append(true).append((Object) null);
        System.out.println(sb);

        sb.setLength(0);
        sb.repeat("ab", 3).repeat('-', 2);       // Java 21
        System.out.println(sb + " | isEmpty " + sb.isEmpty());

        String snapshot = sb.toString();
        sb.append("!");
        System.out.println(snapshot + " vs " + sb);

        StringBuffer buf = new StringBuffer("same API");
        buf.append(", synchronized").insert(0, '>');
        System.out.println(buf);
    }
}`,
        },
        {
          type: "output",
          text: `Kolkata 700001 | same object? true
City: Kolkata 700001
Town: Kolkata 700001
Town: Kolkata
Town Kolkata
town Kolkata
atakloK nwot
o 5 12 Kolkata
[town]
town1-2.5truenull
ababab-- | isEmpty false
ababab-- vs ababab--!
>same API, synchronized`,
        },
        {
          type: "list",
          items: [
            "`append` returns the same builder (`sb == same`), which is why chaining works and why ignoring the return value is harmless here, unlike with `String`.",
            "Positions follow the `String` convention: `start` inclusive, `end` exclusive. `replace(0, 4, \"Town\")` replaced `City`; `delete(indexOf(\" 7\"), length())` cut the PIN code off the end.",
            "`setLength(4)` truncated to `town`. `append` has an overload for every primitive, and `(Object) null` appends the text `null`.",
            "`repeat` is new in Java 21. `isEmpty()` on a builder came with `CharSequence.isEmpty()` in Java 15.",
            "`toString()` is a snapshot: appending `!` afterwards didn't change `snapshot`.",
            "`StringBuffer` has the same methods, returning `StringBuffer`.",
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Reversing a string and the words in a sentence",
        },
        {
          type: "code",
          language: "java",
          title: "ReverseWords.java",
          code: `public class ReverseWords {
    static String reverse(String s) {
        return new StringBuilder(s).reverse().toString();
    }

    static String reverseWords(String sentence) {
        String[] words = sentence.trim().split("\\\\s+");
        StringBuilder sb = new StringBuilder(sentence.length());
        for (int i = words.length - 1; i >= 0; i--) {
            sb.append(words[i]);
            if (i > 0) sb.append(' ');
        }
        return sb.toString();
    }

    static boolean isPalindrome(String s) {
        return s.contentEquals(new StringBuilder(s).reverse());
    }

    public static void main(String[] args) {
        System.out.println(reverse("Kolkata"));
        System.out.println(reverseWords("  Java   strings are   immutable "));
        System.out.println(isPalindrome("racecar") + " " + isPalindrome("rickshaw"));
    }
}`,
        },
        {
          type: "output",
          text: `atakloK
immutable are strings Java
true false`,
        },
        {
          type: "paragraph",
          text: "`reverse()` is the one-line answer to the most common string interview question; the interviewer usually then asks for it without `reverse()`, which is a two-pointer swap on a `char[]`. `split(\"\\\\s+\")` treats any run of whitespace as one separator, and `trim()` first stops a leading space from producing an empty first word. `contentEquals` compares a `String` with any `CharSequence` without calling `toString()`.",
        },
        {
          type: "heading",
          text: "Example 2: A receipt built with a presized builder",
        },
        {
          type: "code",
          language: "java",
          title: "Receipt.java",
          code: `import java.util.List;

public class Receipt {
    record Line(String item, int qty, long pricePaise) { }

    static String render(String customer, List<Line> lines) {
        StringBuilder sb = new StringBuilder(64 + lines.size() * 40);    // rough size up front
        sb.append("Receipt for ").append(customer).append('\\n');
        sb.append("-".repeat(32)).append('\\n');
        long total = 0;
        for (Line l : lines) {
            long amount = l.qty() * l.pricePaise();
            total += amount;
            sb.append(String.format("%-14s %3d %12.2f%n", l.item(), l.qty(), amount / 100.0));
        }
        sb.append("-".repeat(32)).append('\\n');
        sb.append(String.format("%-18s %12.2f%n", "TOTAL", total / 100.0));
        return sb.toString();
    }

    public static void main(String[] args) {
        System.out.print(render("Asha Rao", List.of(
                new Line("Masala chai", 2, 2500),
                new Line("Veg sandwich", 1, 8000),
                new Line("Samosa", 3, 1500))));
    }
}`,
        },
        {
          type: "output",
          text: `Receipt for Asha Rao
--------------------------------
Masala chai      2        50.00
Veg sandwich     1        80.00
Samosa           3        45.00
--------------------------------
TOTAL                    175.00`,
        },
        {
          type: "paragraph",
          text: "The initial capacity is an estimate from the number of lines, so the builder normally never grows. It doesn't need to be exact: too small just means one or two growths, too large wastes a few bytes until `toString()`. Money is kept in paise as a `long` and only turned into a decimal for display. `String.format` inside the loop creates a temporary `String` per line; `Formatter` writing straight into the builder (`new Formatter(sb).format(...)`) avoids that if it ever matters.",
        },
        {
          type: "heading",
          text: "Example 3: Reusing one builder with setLength(0)",
        },
        {
          type: "code",
          language: "java",
          title: "ReuseBuilder.java",
          code: `import java.lang.management.ManagementFactory;

public class ReuseBuilder {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static long sink;

    static void newEachTime(int rows) {
        for (int i = 0; i < rows; i++) {
            StringBuilder sb = new StringBuilder();
            sb.append("trip-").append(i).append(",Kolkata,").append(i * 7).append(",COMPLETED");
            sink += sb.length();
        }
    }

    static void reused(int rows) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < rows; i++) {
            sb.setLength(0);
            sb.append("trip-").append(i).append(",Kolkata,").append(i * 7).append(",COMPLETED");
            sink += sb.length();
        }
    }

    static long allocated(Runnable r) {
        long before = MX.getCurrentThreadAllocatedBytes();
        r.run();
        return MX.getCurrentThreadAllocatedBytes() - before;
    }

    public static void main(String[] args) {
        for (int i = 0; i < 5; i++) { newEachTime(100_000); reused(100_000); }   // warm-up
        System.out.printf("new builder per row : %,d bytes%n", allocated(() -> newEachTime(100_000)));
        System.out.printf("one reused builder  : %,d bytes%n", allocated(() -> reused(100_000)));
    }
}`,
        },
        {
          type: "output",
          text: `new builder per row : 18,742,832 bytes
one reused builder  : 200 bytes`,
        },
        {
          type: "list",
          items: [
            "A new builder per row allocated about 187 bytes per row: the builder object and its 16-char array, then growths to 34 and, for most rows, 70 chars, because once `i * 7` has six digits a row is 35 chars, one more than 34. 100,000 rows made 18.7 MB of garbage.",
            "The reused builder grew once, on the first row, and then `setLength(0)` kept its array for every following row: 200 bytes in total.",
            "This only works because the builder is local to one method and one thread. Reusing a builder across threads, through a `static` field, is the production bug below. Allocation in the young generation is cheap, so I only do this in a hot loop that a profiler has pointed at, never as a habit.",
          ],
        },
        {
          type: "heading",
          text: "Example 4: Run-length compression",
        },
        {
          type: "code",
          language: "java",
          title: "Compress.java",
          code: `public class Compress {
    // "aaabccdddd" -> "a3b1c2d4"; returns the input if compressing doesn't make it shorter
    static String compress(String s) {
        if (s.isEmpty()) return s;
        StringBuilder sb = new StringBuilder();
        int run = 1;
        for (int i = 1; i <= s.length(); i++) {
            if (i < s.length() && s.charAt(i) == s.charAt(i - 1)) {
                run++;
            } else {
                sb.append(s.charAt(i - 1)).append(run);
                run = 1;
            }
        }
        return sb.length() < s.length() ? sb.toString() : s;
    }

    public static void main(String[] args) {
        System.out.println(compress("aaabccdddd"));
        System.out.println(compress("abc"));
        System.out.println(compress("zzzzzzzzzz"));
    }
}`,
        },
        {
          type: "output",
          text: `a3b1c2d4
abc
z10`,
        },
        {
          type: "paragraph",
          text: "A classic interview problem. Running the loop to `i == s.length()` flushes the last run without duplicating the append after the loop. With `+=` this would be O(n²) on a long input; with the builder it's O(n). `\"abc\"` would become `a1b1c1`, longer than the input, so the original is returned.",
        },
      ],
    },
    {
      title: "When to Use String, StringBuilder or StringBuffer",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "What I use", "Why"],
          rows: [
            ["A value: a name, a key, a message, a field", "`String`", "Immutable, safe to share, works as a map key"],
            ["One expression with a few `+`", "`+`", "Compiled to one exact-size `invokedynamic` concatenation"],
            ["Text built in a loop or across branches", "`StringBuilder`, local to the method", "Amortized O(1) per append instead of O(n)"],
            ["A list with separators, prefix or suffix", "`String.join`, `StringJoiner`, `Collectors.joining`", "No last-separator bug"],
            ["Formatted columns", "`String.format` / `formatted`, or a `Formatter` on a builder", "Alignment and number formatting"],
            ["Several threads each adding a complete piece", "Each thread builds a `String`, then a concurrent collection or a lock gathers them", "A shared builder needs a lock around every compound write anyway"],
            ["A legacy API that takes or returns `StringBuffer` (old `Matcher.appendReplacement`, some old libraries)", "`StringBuffer`", "Only because the API demands it"],
            ["A very large output (files, HTTP responses)", "A `Writer` or `OutputStream`, streaming", "Building everything in memory first can need several times the output size"],
          ],
        },
        {
          type: "paragraph",
          text: "In code written since Java 5, I've essentially never needed `StringBuffer`. `Matcher.appendReplacement` and `appendTail` accept a `StringBuilder` since Java 9, which removed one of the last reasons to use it.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Passing a builder where a String is expected",
        },
        {
          type: "code",
          language: "java",
          title: "NotAString.java",
          code: `public class NotAString {
    static void greet(String name) { System.out.println("Hello " + name); }

    public static void main(String[] args) {
        StringBuilder name = new StringBuilder("Asha");
        greet(name);
    }
}`,
        },
        {
          type: "output",
          text: `NotAString.java:6: error: incompatible types: StringBuilder cannot be converted to String
        greet(name);
              ^
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
1 error`,
        },
        {
          type: "paragraph",
          text: "A `StringBuilder` is a `CharSequence`, not a `String`. Call `toString()`, or declare the parameter as `CharSequence` if the method only reads the text.",
        },
        {
          type: "heading",
          text: "new StringBuilder('A') and comparing builders with equals",
        },
        {
          type: "code",
          language: "java",
          title: "CharTrap.java",
          code: `public class CharTrap {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder('A');           // meant "start with A"
        System.out.println("[" + sb + "] length " + sb.length() + ", capacity " + sb.capacity());

        StringBuilder a = new StringBuilder("Kolkata");
        StringBuilder b = new StringBuilder("Kolkata");
        System.out.println(a.equals(b) + " " + a.toString().equals(b.toString())
                + " " + "Kolkata".contentEquals(a) + " " + (a.compareTo(b) == 0));
    }
}`,
        },
        {
          type: "output",
          text: `[] length 0, capacity 65
false true true true`,
        },
        {
          type: "list",
          items: [
            "There's no `StringBuilder(char)` constructor. `'A'` is widened to the `int` 65 and picks `StringBuilder(int capacity)`, so the builder is **empty** with capacity 65. It compiles without a warning. Write `new StringBuilder(\"A\")` or `new StringBuilder().append('A')`.",
            "`StringBuilder` and `StringBuffer` don't override `equals` or `hashCode`; they use `Object`'s identity versions. Two builders with the same content are not `equals`. Compare with `a.compareTo(b) == 0` (Java 11), `\"text\".contentEquals(sb)`, or `toString().equals(...)`.",
            "For the same reason, a builder must never be a `HashMap` key or a `HashSet` element when content matters, and it's mutable anyway, which is the `MutableText` problem from the Strings lesson.",
          ],
        },
        {
          type: "heading",
          text: "+= in a loop",
        },
        {
          type: "paragraph",
          text: "Measured above: doubling the input quadrupled the time, and 200,000 appends took about 2 seconds instead of 1 ms. It's easy to miss in review because it looks just like the single `+` that's perfectly fine, and it's fast on the small data used in tests.",
        },
        {
          type: "heading",
          text: "+ inside append",
        },
        {
          type: "paragraph",
          text: "`sb.append(name + \", \" + city)` first builds a temporary `String` with `+`, then copies it into the builder. `sb.append(name).append(\", \").append(city)` writes straight into the buffer. In a hot loop the difference is one extra allocation and copy per call; outside one, readability wins.",
        },
        {
          type: "heading",
          text: "Sharing a StringBuilder between threads",
        },
        {
          type: "paragraph",
          text: "A `static` or singleton-bean field holding a `StringBuilder` \"to save allocations\" loses data, garbles output or throws `ArrayIndexOutOfBoundsException` under load, as `SharedBuilders.java` showed. Replacing it with `StringBuffer` stops the exceptions but still interleaves multi-call writes. The fix is a local builder.",
        },
        {
          type: "heading",
          text: "Calling toString() repeatedly",
        },
        {
          type: "paragraph",
          text: "Each `toString()` on a `StringBuilder` copies the whole content into a new `String`. Calling it inside a loop (`if (sb.toString().contains(...))`) turns an O(n) build into O(n²). Use the builder's own `indexOf`, `charAt` and `length`, which read the buffer directly.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use `+` for a single expression and `StringBuilder` when text is built across loop iterations or statements.",
            "Keep builders local to a method. Build, call `toString()` once, return the `String`.",
            "Use `StringBuilder`, not `StringBuffer`, unless an API forces `StringBuffer` on me. If text really is shared between threads, lock the whole compound operation or, better, have each thread build its own string.",
            "Presize when the final size is roughly known: `new StringBuilder(expectedLength)`. An estimate is enough.",
            "Chain `append` calls instead of `append(a + b)`, and use the primitive overloads (`append(int)`, `append(char)`) instead of converting to `String` first.",
            "Use `String.join`, `StringJoiner` or `Collectors.joining` for lists with separators.",
            "Declare parameters as `CharSequence` when a method only reads text, so callers can pass a `String` or a builder without `toString()`.",
            "Never use a builder as a map key or compare builders with `equals`.",
            "For large outputs, stream to a `Writer` instead of building one huge string in memory.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The History section promised a measurement of what `StringBuffer`'s locking costs on a JDK without biased locking. I appended 50 million chars on one thread, with each class used two ways: as a local variable, and through a `static` field so the builder escapes the method. Each figure is the best of five rounds:",
        },
        {
          type: "code",
          language: "java",
          title: "BufferCost.java",
          code: `public class BufferCost {
    static StringBuffer sharedBuffer = new StringBuffer();      // escapes: the JIT must keep the lock
    static StringBuilder sharedBuilder = new StringBuilder();
    static long sink;

    static void localBuilder(int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) { sb.append('x'); if (sb.length() > 1000) sb.setLength(0); }
        sink += sb.length();
    }

    static void localBuffer(int n) {
        StringBuffer sb = new StringBuffer();                    // never escapes: lock can be elided
        for (int i = 0; i < n; i++) { sb.append('x'); if (sb.length() > 1000) sb.setLength(0); }
        sink += sb.length();
    }

    static void fieldBuilder(int n) {
        for (int i = 0; i < n; i++) { sharedBuilder.append('x'); if (sharedBuilder.length() > 1000) sharedBuilder.setLength(0); }
    }

    static void fieldBuffer(int n) {
        for (int i = 0; i < n; i++) { sharedBuffer.append('x'); if (sharedBuffer.length() > 1000) sharedBuffer.setLength(0); }
    }

    static long ms(Runnable r) {
        long best = Long.MAX_VALUE;
        for (int round = 0; round < 5; round++) {
            long t = System.nanoTime();
            r.run();
            best = Math.min(best, System.nanoTime() - t);
        }
        return best / 1_000_000;
    }

    public static void main(String[] args) {
        int n = 50_000_000;
        System.out.println("local StringBuilder : " + ms(() -> localBuilder(n)) + " ms");
        System.out.println("local StringBuffer  : " + ms(() -> localBuffer(n)) + " ms");
        System.out.println("field StringBuilder : " + ms(() -> fieldBuilder(n)) + " ms");
        System.out.println("field StringBuffer  : " + ms(() -> fieldBuffer(n)) + " ms");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java BufferCost
java -XX:-EliminateLocks BufferCost`,
        },
        {
          type: "output",
          text: `local StringBuilder : 90 ms
local StringBuffer  : 115 ms
field StringBuilder : 116 ms
field StringBuffer  : 1843 ms

local StringBuilder : 91 ms
local StringBuffer  : 1833 ms
field StringBuilder : 116 ms
field StringBuffer  : 1847 ms`,
        },
        {
          type: "list",
          items: [
            "**Escaping `StringBuffer`: about 16 times slower** than the same code with a `StringBuilder` (1,843 vs 116 ms). Every `append` and `length` call takes and releases the monitor with an atomic compare-and-swap, even though only one thread ever touches it. That's the cost biased locking used to hide before JDK 15.",
            "**Local `StringBuffer`: almost free.** 115 ms against 90 ms for the local builder. The JIT's escape analysis proved the buffer never leaves `localBuffer`, so no other thread can ever lock it, and it removed the locks (lock elision).",
            "**`-XX:-EliminateLocks` proves it.** With lock elision switched off, the local `StringBuffer` drops to 1,833 ms, the same as the escaping one. Nothing else changed.",
            "So a `StringBuffer` in old code costs little when it's a local the JIT can see through, and a lot when it's stored in a field, passed around or returned. In both cases `StringBuilder` is at least as fast, so there's no performance reason to keep `StringBuffer`.",
            "This is a single-machine measurement with `System.nanoTime`, not a JMH benchmark, and the absolute numbers depend on the CPU. The ratios were stable across three runs. JMH is the tool to use before making decisions from numbers like these.",
          ],
        },
        {
          type: "heading",
          text: "The other costs, in one place",
        },
        {
          type: "list",
          items: [
            "**Growth:** amortized O(1) per char. Without presizing, building 1 MB of text allocated about 2.36 MB of arrays in total (`GrowthCost`); presized, 1 MB.",
            "**`toString()`:** always copies, O(length). Once at the end is fine; in a loop it's a hidden O(n²).",
            "**`insert(0, ...)` and `deleteCharAt(0)`:** shift every char after the position, O(length) per call. Building text backwards with `insert(0, x)` in a loop is O(n²); append and `reverse()` once instead.",
            "**Inflation:** one non-Latin-1 char doubles the buffer's bytes for the rest of its life, but `toString()` still produces a compact Latin-1 `String` if the final content allows it.",
            "**`+` in one expression:** no slower than a hand-written builder on Java 9+, because `invokedynamic` sizes the result exactly.",
          ],
        },
      ],
    },
    {
      title: "StringBuilder in Production",
      blocks: [
        {
          type: "heading",
          text: "Bug 1: the trip export that got slower every month",
        },
        {
          type: "paragraph",
          text: "A ride-hailing backend has an admin endpoint that exports a city's completed trips as CSV. It was written with `+=`, tested with a few hundred trips, and was instant. Six months later, operations reported that exporting a busy day timed out after 30 seconds. Nothing in the code had changed; the data had grown. I rebuilt it with the original approach and the fix:",
        },
        {
          type: "code",
          language: "java",
          title: "TripCsvExport.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class TripCsvExport {
    record Trip(long id, String rider, String city, long farePaise) { }

    static List<Trip> trips(int n) {
        List<Trip> list = new ArrayList<>(n);
        for (int i = 0; i < n; i++) list.add(new Trip(100_000 + i, "rider-" + (i % 997), "Kolkata", 5_000 + i % 9_000));
        return list;
    }

    // What shipped: += on a String, one row at a time
    static String exportSlow(List<Trip> trips) {
        String csv = "id,rider,city,fare\\n";
        for (Trip t : trips) {
            csv += t.id() + "," + t.rider() + "," + t.city() + "," + t.farePaise() / 100.0 + "\\n";
        }
        return csv;
    }

    // The fix: one builder, sized from a rough estimate
    static String exportFast(List<Trip> trips) {
        StringBuilder sb = new StringBuilder(32 + trips.size() * 40);
        sb.append("id,rider,city,fare\\n");
        for (Trip t : trips) {
            sb.append(t.id()).append(',').append(t.rider()).append(',')
              .append(t.city()).append(',').append(t.farePaise() / 100.0).append('\\n');
        }
        return sb.toString();
    }

    static long ms(Runnable r) {
        long t = System.nanoTime();
        r.run();
        return (System.nanoTime() - t) / 1_000_000;
    }

    public static void main(String[] args) {
        exportSlow(trips(5_000)); exportFast(trips(5_000));                         // warm-up
        for (int n : new int[] {5_000, 10_000, 20_000, 40_000}) {
            List<Trip> data = trips(n);
            System.out.printf("%,6d trips   += : %5d ms   StringBuilder : %2d ms   same output: %b%n",
                    n, ms(() -> exportSlow(data)), ms(() -> exportFast(data)),
                    exportSlow(data).equals(exportFast(data)));
        }
    }
}`,
        },
        {
          type: "output",
          text: ` 5,000 trips   += :    53 ms   StringBuilder :  2 ms   same output: true
10,000 trips   += :   237 ms   StringBuilder :  3 ms   same output: true
20,000 trips   += :   692 ms   StringBuilder :  6 ms   same output: true
40,000 trips   += :  2686 ms   StringBuilder :  7 ms   same output: true`,
        },
        {
          type: "list",
          items: [
            "**The curve is the bug.** Each doubling of trips multiplied the `+=` time by about 3 to 4.5; at 40,000 trips it took 2.7 seconds versus 7 ms. A busy day with a few hundred thousand trips lands in the tens of seconds and beyond, which is the timeout operations hit. The builder grows linearly.",
            "**Same output.** The fix is a pure refactoring; the `equals` check confirms the CSV is identical byte for byte.",
            "**Why tests missed it.** Every test used small data, where `+=` and the builder are both a few milliseconds. Quadratic code only shows up when data grows, which is why it reaches production. A test with 50,000 generated rows and a time budget, or a code review rule against `+=` on a `String` inside a loop, would have caught it.",
            "**The next step.** Even with a builder, the whole CSV sits in memory, about 40 bytes per trip plus the final `String` copy. For really large exports the endpoint should stream rows to the response's `Writer` as they're read from the database, so memory stays flat whatever the size.",
          ],
        },
        {
          type: "heading",
          text: "Bug 2: the shared log builder that garbled lines",
        },
        {
          type: "paragraph",
          text: "In the same backend, someone optimised a hot logging helper by keeping one `StringBuilder` in a `static` field and resetting it with `setLength(0)`, the trick from Example 3, but shared by every request thread. Under load, support found log lines with the wrong driver on a trip, which sent an investigation in the wrong direction for a day.",
        },
        {
          type: "code",
          language: "java",
          title: "LogFormatter.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class LogFormatter {
    // The bug: one builder shared by every request thread, "to avoid garbage"
    static final StringBuilder SHARED = new StringBuilder(256);

    static String formatShared(String trip, String driver, String status) {
        SHARED.setLength(0);
        SHARED.append("trip=").append(trip).append(" driver=").append(driver).append(" status=").append(status);
        return SHARED.toString();
    }

    // The fix: a local builder per call
    static String formatLocal(String trip, String driver, String status) {
        return new StringBuilder(64)
                .append("trip=").append(trip).append(" driver=").append(driver).append(" status=").append(status)
                .toString();
    }

    interface Formatter { String format(String trip, String driver, String status); }

    static void run(String label, Formatter f) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<int[]>> results = new ArrayList<>();
        for (int w = 0; w < 8; w++) {
            final int worker = w;
            results.add(pool.submit(() -> {
                int bad = 0, crashed = 0;
                for (int i = 0; i < 20_000; i++) {
                    String trip = "T" + worker + "-" + i, driver = "D" + worker;
                    String expected = "trip=" + trip + " driver=" + driver + " status=COMPLETED";
                    try {
                        if (!f.format(trip, driver, "COMPLETED").equals(expected)) bad++;
                    } catch (RuntimeException e) {
                        crashed++;
                    }
                }
                return new int[] {bad, crashed};
            }));
        }
        int bad = 0, crashed = 0;
        for (Future<int[]> r : results) { bad += r.get()[0]; crashed += r.get()[1]; }
        pool.shutdown();
        System.out.printf("%-7s 160,000 lines: %,d garbled, %,d threw%n", label, bad, crashed);
    }

    public static void main(String[] args) throws Exception {
        System.out.println(formatShared("T1-1", "D1", "COMPLETED"));
        run("shared", LogFormatter::formatShared);
        run("local", LogFormatter::formatLocal);
    }
}`,
        },
        {
          type: "output",
          text: `trip=T1-1 driver=D1 status=COMPLETED
shared  160,000 lines: 93,486 garbled, 0 threw
local   160,000 lines: 0 garbled, 0 threw`,
        },
        {
          type: "list",
          items: [
            "**Single-threaded, it's perfect.** The first line is exactly right, and so is every unit test that calls the formatter from one thread.",
            "**Under 8 threads, 58% of lines were wrong** (93,486 of 160,000; a second run gave 71,982). One thread's `setLength(0)` wipes another's half-built line, and appends from different requests mix, so a line can carry one trip's ID and another's driver. Nothing threw this time because the buffer had already grown big enough, but the earlier race showed `ArrayIndexOutOfBoundsException` is possible too.",
            "**Swapping in `StringBuffer` doesn't fix it.** Each `append` would be atomic, but `setLength(0)` plus six appends is a sequence, and other threads can still run in between, as the three-appends-per-record test showed.",
            "**The fix is a local builder:** zero garbled lines. The allocation it \"saved\" was a 64-char builder per log line, which a young-generation GC collects almost for free. A shared mutable object to save a tiny short-lived allocation is a bad trade. If a profiler really shows allocation pressure here, a `ThreadLocal<StringBuilder>` gives each thread its own reusable builder, but with virtual threads (Java 21), where there can be millions of threads, even that stops paying off.",
            "**In real code** the logging framework already does this correctly: `log.info(\"trip={} driver={} status={}\", trip, driver, status)` with SLF4J formats into its own per-call buffer, and only when the level is enabled.",
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
              question: "What is the difference between String, StringBuilder and StringBuffer?",
              answer:
                "`String` is immutable: every \"change\" creates a new object. `StringBuilder` and `StringBuffer` are mutable buffers with the same API (`append`, `insert`, `delete`, `reverse`...) that change the text in place.\n\n`StringBuffer` (Java 1.0) has `synchronized` methods; `StringBuilder` (Java 5) has no locking and is faster. Use `String` for values, `StringBuilder` for building text in one thread, and `StringBuffer` only when a legacy API requires it.",
            },
            {
              question: "Why use StringBuilder instead of + in a loop?",
              answer:
                "Each `s += x` creates a new `String` and copies everything built so far, so `n` iterations copy about `n²/2` chars: O(n²). A `StringBuilder` appends into one buffer that grows by doubling: amortized O(1) per char, O(n) in total.\n\nMy measurement: 200,000 single-char appends took about 1.9 seconds with `+=` and under 2 ms with a `StringBuilder`; doubling `n` quadrupled the `+=` time.",
            },
            {
              question: "What is the default capacity of a StringBuilder, and how does it grow?",
              answer:
                "16 for `new StringBuilder()`, and `length + 16` for `new StringBuilder(String)`. When an append doesn't fit, the new capacity is `max(needed, old * 2 + 2)`: 16, 34, 70, 142, 286... If doubling isn't enough (appending 50 chars to a 16-char builder), it grows to exactly what's needed. Growing allocates a new array and copies the old content; the old array becomes garbage.",
            },
            {
              question: "What's the difference between length() and capacity()?",
              answer:
                "`length()` is the number of chars currently in the builder. `capacity()` is how many chars fit in the current array before it has to grow. `setLength(0)` makes the length 0 but keeps the capacity, and `trimToSize()` shrinks the capacity down to the length.",
            },
            {
              question: "Does StringBuilder override equals()?",
              answer:
                "No. `StringBuilder` and `StringBuffer` inherit `equals` and `hashCode` from `Object`, so two builders with the same content are not equal. Compare content with `sb1.compareTo(sb2) == 0` (Java 11+), `str.contentEquals(sb)`, or `sb1.toString().equals(sb2.toString())`.",
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
              question: "Is StringBuffer thread-safe? Is that enough?",
              answer:
                "Each method call is atomic, because every public method that touches the buffer is `synchronized` on the buffer. That isn't enough for anything that takes more than one call. In my test, four threads appending `[`, a name and `]` as three calls to one `StringBuffer` got every char in, but only 15,000 to 22,000 of 40,000 records were intact across runs.\n\nThe fix is to hold the buffer's lock around the whole compound operation (`synchronized (sb) { ... }`), and at that point a `StringBuilder` under the same lock is equally correct. Better still, don't share a builder: each thread builds its own `String`.",
            },
            {
              question: "What happens if you share a StringBuilder between threads?",
              answer:
                "Lost and overwritten characters, and sometimes `ArrayIndexOutOfBoundsException` when one thread grows the array while another writes. In my test, four threads appending 100,000 chars each produced about 101,000 chars, and three of the four threads died with `ArrayIndexOutOfBoundsException`. It's never reliably correct.",
            },
            {
              question: "How does the + operator on strings compile?",
              answer:
                "Constant expressions are folded into one literal by `javac`. Up to Java 8, other `+` expressions became `new StringBuilder().append(a).append(b).toString()`. Since Java 9 (JEP 280) they compile to one `invokedynamic` call to `StringConcatFactory.makeConcatWithConstants`; the JVM picks the strategy at run time, which on JDK 21 computes the exact size and fills one array. I compared both with `javap`: 34 bytes of `StringBuilder` calls with `--release 8`, 8 bytes with one `invokedynamic` on Java 21.",
            },
            {
              question: "Is it worth replacing a + b + c with a StringBuilder?",
              answer:
                "Not for a single expression on Java 9+. The `invokedynamic` concatenation sizes the result exactly, so a hand-written builder is no faster and harder to read. It's worth it only when the text is built across a loop or several statements, because each separate `+=` is a separate concatenation.",
            },
            {
              question: "What does new StringBuilder('A') create?",
              answer:
                "An empty builder with capacity 65. There's no `StringBuilder(char)` constructor, so the `char` is widened to `int` and the `StringBuilder(int capacity)` constructor is chosen. It compiles without a warning. Use `new StringBuilder(\"A\")` or `new StringBuilder().append('A')`.",
            },
            {
              question: "When would you use StringJoiner or Collectors.joining?",
              answer:
                "For joining items with a separator, optionally with a prefix and suffix. `String.join(\", \", list)` for something already in a collection, `StringJoiner` when items are added one by one in a loop (with `setEmptyValue` for the no-items case), and `Collectors.joining(\", \", \"[\", \"]\")` at the end of a stream. They remove the classic bug of a separator after the last item.",
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
              question: "How is StringBuilder stored internally since Java 9?",
              answer:
                "Both builders extend the package-private `AbstractStringBuilder`, which has a `byte[] value`, a `byte coder` (LATIN1 or UTF16), an `int count` and, on recent JDKs, a `boolean maybeLatin1` hint. A new builder is LATIN1, one byte per char. The first char outside Latin-1 inflates the whole buffer to UTF-16, two bytes per char, and it stays UTF-16 for the builder's lifetime even if that char is deleted. `toString()` compresses back to a Latin-1 `String` when the content allows. `StringBuffer` also has a `transient` `toStringCache`.",
            },
            {
              question: "Is StringBuffer always slower than StringBuilder?",
              answer:
                "Not always. When a `StringBuffer` is a local variable that never escapes, the JIT's escape analysis removes its locks (lock elision), and it ran in 115 ms against 90 ms for a `StringBuilder` in my test. When it escapes, through a field, every call pays an atomic lock operation: 1,843 ms against 116 ms. With `-XX:-EliminateLocks` the local one was slow too (1,833 ms), which proves elision was the reason. Biased locking, which used to hide the cost, was disabled in JDK 15 and removed later.",
            },
            {
              question: "Why does a synchronized method have no monitorenter in its bytecode?",
              answer:
                "A `synchronized` method is marked with the `ACC_SYNCHRONIZED` access flag, and the JVM acquires the receiver's monitor before running the body and releases it on any exit, normal or exceptional. Only `synchronized` blocks compile to explicit `monitorenter`/`monitorexit` instructions. `javap -v` on `StringBuffer.append(String)` shows the flag, and a body that's otherwise just `toStringCache = null` and a call to `AbstractStringBuilder.append`.",
            },
            {
              question: "Should you reuse StringBuilder objects?",
              answer:
                "Within one method and one thread, `setLength(0)` reuse avoids allocation: one reused builder allocated 200 bytes over 100,000 rows, against 18.7 MB for a new builder per row. Across threads, through a `static` field, it garbled 58% of log lines in my test. Young-generation allocation is cheap, so I reuse only in hot loops a profiler points at, and never share. `ThreadLocal` builders were a common pattern, but they work poorly with virtual threads.",
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
              question: "An admin export that was instant at launch now times out after 30 seconds. Nothing in the code has changed, only the amount of data. What do you suspect?",
              answer:
                "Something quadratic, and the most common case in export code is building the output with `+=` on a `String` inside a loop. Each `+=` copies everything built so far, so doubling the rows roughly quadruples the time. My `TripCsvExport` rebuild took 53 ms for 5,000 trips and 2,686 ms for 40,000 with `+=`, against 2 to 7 ms with one `StringBuilder`, with byte-identical output.\n\nI'd confirm with a profiler or a thread dump (the hot frame is in string concatenation inside the loop), replace it with a presized `StringBuilder`, and for really large exports stream rows to the response `Writer` instead of building one string in memory.",
            },
            {
              question: "Under load, log lines show one trip's ID next to another trip's driver. Single-threaded tests are all fine. What would you look for?",
              answer:
                "Shared mutable state in the formatting code, most likely a `static` or singleton-bean `StringBuilder` reused with `setLength(0)` to \"save allocations\". Concurrent requests reset and append to the same buffer, so lines mix. In my `LogFormatter` rebuild, 8 threads garbled 58% of 160,000 lines; a local builder garbled none.\n\nSwitching to `StringBuffer` isn't a fix: each call would be atomic, but `setLength(0)` plus six appends is a sequence that other threads can still interleave. The fix is a local builder per call, or the logging framework's own parameterised messages (`log.info(\"trip={} driver={}\", ...)`).",
            },
            {
              question: "In code review, a teammate has replaced every return \"Hi \" + name + \"!\" in the codebase with explicit StringBuilder chains \"for performance\". How do you respond?",
              answer:
                "That on Java 9 and later it doesn't help and hurts readability. A single expression with `+` compiles to one `invokedynamic` call to `StringConcatFactory`, which computes the exact length and fills one array: no builder and no growth. `javap` showed 8 bytes of bytecode for it on Java 21 against 34 for the Java 8 `StringBuilder` chain. A hand-written chain with a default capacity of 16 can even be slower, because it may have to grow.\n\nThe place where a `StringBuilder` really matters is text built across loop iterations or several statements. I'd ask them to revert the single-expression cases and keep builders for loops.",
            },
            {
              question: "A legacy codebase uses StringBuffer everywhere. Is it worth migrating to StringBuilder, and is it safe?",
              answer:
                "It's safe wherever the buffer is confined to one thread, which is almost always: a local variable built and turned into a `String` in one method. For those, the gain is small, because the JIT elides the locks of a non-escaping `StringBuffer` (115 ms against 90 ms in my test). The gain is large where the buffer escapes into a field, is passed around or is returned: there every call pays a real atomic lock, and it was 16 times slower than `StringBuilder` in my test.\n\nBefore changing a buffer that really is shared between threads, I'd check what it relies on: if it depends on single calls being atomic, it needs a different design (local builders, then a thread-safe collection of finished `String`s), not a plain swap to `StringBuilder`. IntelliJ's \"StringBuffer may be StringBuilder\" inspection finds the safe local cases automatically.",
            },
            {
              question: "A report service builds a 400 MB JSON response in a StringBuilder and keeps failing with OutOfMemoryError on a 2 GB heap. The data itself is only 400 MB. Why?",
              answer:
                "Building it in memory needs several times the final size at the peak. When the builder grows, the full old array and the new one, about twice as big, exist together during the copy: roughly 3 times the content. `toString()` then copies the content into a new `String` while the builder (whose capacity can be up to twice the content) is still alive: another 3 times. So 400 MB of Latin-1 text can need about 1.2 GB at the peak, and twice that if any char is outside Latin-1, because the buffer is then UTF-16 at two bytes per char. On top of that come the objects the data was built from.\n\nThe real fix is not to build it in memory: stream the JSON straight to the response with a streaming writer (Jackson's `JsonGenerator` on the output stream). If a builder is unavoidable, presize it to avoid the growth copies.",
            },
            {
              question: "Memory per request thread keeps creeping up in a service that reuses one StringBuilder per thread through a ThreadLocal. It's emptied with setLength(0) after each use. What's happening?",
              answer:
                "`setLength(0)` resets the length but keeps the array, as `EnsureTrim` showed: capacity stayed at 13 after `setLength(0)`. A builder that once held one huge message keeps that capacity for as long as its thread lives, and a `ThreadLocal` lives as long as the thread, which in a pool is the life of the application. With 200 pool threads that each once built a 10 MB message, that's 2 GB of mostly empty arrays.\n\nOptions: cap the reuse (throw the builder away, or call `trimToSize()`, when its capacity passes a limit), or simply allocate a local builder per call, which is cheap in the young generation. With Java 21 virtual threads, where there can be millions of threads, per-thread caches like this stop making sense at all.",
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
            "Create `new StringBuilder()` and append the alphabet one letter at a time, printing `length()` and `capacity()` whenever the capacity changes. Predict the values first.",
            "Print `new StringBuilder(\"Kolkata\").capacity()` and `new StringBuilder('K').capacity()`, and explain both.",
            "Build `\"0,1,2,...,49999\"` once with `+=` and once with a `StringBuilder`, timing each with `System.nanoTime()`. Then double the count and time again.",
            "Write `static String reverse(String s)` without `StringBuilder.reverse()`: copy to a `char[]`, swap from both ends, and return `new String(chars)`.",
            "Share one `StringBuilder` between two threads that each append `'x'` 50,000 times, join them, and print the length. Run it three times. Then switch to `StringBuffer`.",
            "Join `List.of(\"tea\", \"coffee\", \"lassi\")` into `Menu: tea | coffee | lassi.` with `Collectors.joining`, and print what a `StringJoiner` with the same prefix and suffix gives for an empty list.",
            "Compile `static String f(String a, int b) { return a + b; }` with `javac --release 8` and with plain `javac`, and compare `javap -c`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints capacity 16 until the 17th letter, then 34; the alphabet ends at length 26, capacity 34. Step 2 gives 23 (7 + 16) and 75: `'K'` is the `int` 75, so it's an empty builder. Step 3 shows `+=` taking hundreds of milliseconds and roughly 4 times longer after doubling, while the builder stays at a few milliseconds. Step 5 gives a different wrong length each run, sometimes with an `ArrayIndexOutOfBoundsException`, and exactly 100,000 with `StringBuffer`. Step 6 prints `Menu: tea | coffee | lassi.` and `Menu: .`. Step 7 shows a `StringBuilder` chain for release 8 and one `invokedynamic` for the default.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `                String         StringBuilder       StringBuffer
MUTABLE         no             yes                 yes
THREAD-SAFE     yes (immut.)   no                  per call only
SINCE           1.0            5                   1.0
equals          content        identity            identity
USE FOR         values, keys   building text       legacy APIs

STORAGE    AbstractStringBuilder: byte[] value, coder, count
           LATIN1 until first non-Latin-1 char -> UTF16 for good

CAPACITY   new SB() = 16; new SB(str) = len + 16; new SB(n) = n
           grow: max(needed, old * 2 + 2) -> new array + copy
           setLength(0) keeps the array; trimToSize() shrinks it
           new StringBuilder('A') -> capacity 65, EMPTY

+          constants: folded by javac
           Java 8:  new StringBuilder().append()...toString()
           Java 9+: invokedynamic makeConcatWithConstants
           one expression: + is fine; in a LOOP: O(n^2)

THREADS    shared StringBuilder -> lost chars, AIOOBE
           shared StringBuffer  -> each call atomic,
                                   multi-call writes interleave
           fix: local builders; share finished Strings

JOINING    String.join, StringJoiner, Collectors.joining

PERF       local StringBuffer: locks elided by the JIT
           escaping StringBuffer: ~16x slower than StringBuilder`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`StringBuilder` is the mutable counterpart of `String`: one resizable buffer, edited in place, turned into a `String` once with `toString()`. Its growth rule makes appending amortized O(1), which is what turns the O(n²) `+=` loop into O(n).",
            "`StringBuffer`'s locks protect single calls, not the sequences real code needs, and they cost a lot whenever the JIT can't remove them. Builders belong inside one method on one thread; across threads, share the finished, immutable `String`.",
            "With these two lessons, the String phase is complete: what a `String` is and why it can't change, and how to build text efficiently when it needs to. Next comes Arrays: fixed-size collections of values and how they sit in memory.",
          ],
        },
      ],
    },
  ],
};
