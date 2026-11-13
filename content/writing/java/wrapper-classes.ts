import type { Lesson } from "../types";

export const wrapperClasses: Lesson = {
  slug: "wrapper-classes",
  date: "2026-11-13",
  title: "Wrapper Classes and Autoboxing",
  description:
    "The eight wrapper classes on JDK 21 and what autoboxing really compiles to: Integer.valueOf and intValue() read from javap, the caches behind valueOf (-128 to 127 for Integer, Long, Short and Byte, 0 to 127 for Character, none for Double) and -XX:AutoBoxCacheMax, why Integer == Integer is true for 127 and false for 128, an Integer measured at 16 bytes and a Long at 24, why wrappers are immutable and what that means for i++, the NullPointerException hiding in every unboxing, parseInt and valueOf and their exact error messages, the deprecated new Integer(), and driver IDs compared with == that passed every test and rejected every real driver in a ride-hailing backend.",
  tags: ["Core Java", "Wrapper Classes", "Autoboxing", "Integer Cache"],
  sections: [
    {
      title: "What Wrapper Classes Are",
      blocks: [
        {
          type: "paragraph",
          text: "Java has two kinds of values. The eight **primitives** (`byte`, `short`, `int`, `long`, `float`, `double`, `char`, `boolean`) are plain values: no object, no methods, no `null`. Everything else is an **object**. Generics, collections and most APIs work only with objects, as the Generics phase showed: `List<int>` doesn't compile.",
        },
        {
          type: "paragraph",
          text: "A **wrapper class** is an object that holds one primitive value: `Integer` holds an `int`, `Double` a `double`, `Boolean` a `boolean`, and so on. Wrappers let primitives go where objects are required (`List<Integer>`, `Map<String, Long>`, `Optional<Double>`), let a number be `null` (a rating that hasn't been given yet), and are the home of useful static methods: `Integer.parseInt`, `Long.MAX_VALUE`, `Character.isDigit`, `Double.compare`.",
        },
        {
          type: "paragraph",
          text: "Since Java 5 the compiler converts between the two automatically: **autoboxing** turns an `int` into an `Integer`, **unboxing** turns it back. That convenience hides object creation, caching and `null` checks behind ordinary-looking code, and earlier lessons kept running into the consequences: `Integer[]` used 5 times the memory of `int[]`, and summing a `List<Integer>` was 6 times slower. This lesson shows exactly what happens; the next one, Wrapper Traps, covers the bugs it causes.",
        },
      ],
    },
    {
      title: "Where They Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 (1996) kept primitives for speed: an `int` is a CPU register or 4 bytes in memory, not an object with a header. To use them with `Vector` and `Hashtable`, which held `Object`s, it shipped wrapper classes from day one, and programmers wrapped and unwrapped by hand: `list.add(new Integer(5))` and `((Integer) list.get(0)).intValue()`.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`Integer`, `Long`, `Double`, `Boolean`, `Character`...; `parseInt`", "Wrapping by hand"],
            ["Java 1.1 (1997)", "`Byte`, `Short`; `Number` gets `byteValue`/`shortValue`", "All eight wrappers"],
            ["Java 5 (2004)", "Autoboxing and unboxing (JSR 201); `Integer.valueOf(int)` with a cache; generics", "The compiler inserts `valueOf` and `intValue()`"],
            ["Java 5 (2004)", "`-XX:AutoBoxCacheMax` (HotSpot)", "A bigger `Integer` cache on request"],
            ["Java 7 (2011)", "`Integer.compare`, `Long.compare`...", "Comparing without subtraction overflow"],
            ["Java 8 (2014)", "`Integer.sum`, `max`, `min`, `hashCode(int)`; unsigned methods (`parseUnsignedInt`, `toUnsignedString`)", "Method references like `Integer::sum`"],
            ["Java 9 (2017)", "Wrapper constructors (`new Integer(5)`) deprecated", "Use `valueOf`"],
            ["Java 16 (2021)", "Constructors deprecated **for removal** (JEP 390); wrappers become value-based classes; `javac` warns on `synchronized` on them", "Identity of wrappers isn't guaranteed; never rely on it"],
          ],
        },
        {
          type: "paragraph",
          text: "JEP 390 is the important recent change: wrappers are now documented as **value-based classes**. Code must not depend on their identity: not `==`, not `synchronized (anInteger)`, not `System.identityHashCode`. Project Valhalla plans to make them true value objects without identity in a future release, which would remove most of the costs measured below; none of that is in Java 21.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of cash and sealed envelopes.",
        },
        {
          type: "list",
          items: [
            "A **primitive is cash in my hand**: a 100-rupee note. I can add it up instantly. It's always there; there's no such thing as \"no note\".",
            "A **wrapper is the same note in a sealed envelope** with a label. Envelopes can go where only envelopes are accepted (a filing cabinet, a courier: collections and generics). An envelope can also be **empty** (`null`), which cash can't.",
            "**Autoboxing** is a clerk who silently puts my cash into an envelope whenever I hand it to the filing cabinet; **unboxing** is the clerk opening it whenever I do arithmetic. Opening an empty envelope is the `NullPointerException`.",
            "The **cache** is a stack of pre-sealed envelopes for common amounts, -128 to 127. Ask for an envelope with 100 and I get one from the stack, the same one everyone else gets. Ask for 1,000 and the clerk seals a new one each time. So \"same envelope?\" (`==`) is true for 100 and false for 1,000, while \"same amount inside?\" (`equals`) is always true.",
            "**Envelopes are sealed for good**: to \"add 1\" to an envelope, the clerk opens it, adds, and seals a **new** envelope. That's why `Integer` is immutable and `i++` on an `Integer` creates a new object.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real envelope costs a little paper. A Java `Integer` costs 16 bytes to hold 4 bytes of value, and a `Long` 24 bytes for 8, measured below. Handing the filing cabinet millions of envelopes is the boxing cost the Generics and Arrays lessons measured.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The eight wrappers",
        },
        {
          type: "code",
          language: "java",
          title: "EightWrappers.java",
          code: `public class EightWrappers {
    public static void main(String[] args) {
        System.out.printf("%-9s %-5s %-8s %-22s %s%n", "wrapper", "BYTES", "TYPE", "MIN_VALUE", "MAX_VALUE");
        System.out.printf("%-9s %-5d %-8s %-22d %d%n", "Byte", Byte.BYTES, Byte.TYPE, Byte.MIN_VALUE, Byte.MAX_VALUE);
        System.out.printf("%-9s %-5d %-8s %-22d %d%n", "Short", Short.BYTES, Short.TYPE, Short.MIN_VALUE, Short.MAX_VALUE);
        System.out.printf("%-9s %-5d %-8s %-22d %d%n", "Integer", Integer.BYTES, Integer.TYPE, Integer.MIN_VALUE, Integer.MAX_VALUE);
        System.out.printf("%-9s %-5d %-8s %-22d %d%n", "Long", Long.BYTES, Long.TYPE, Long.MIN_VALUE, Long.MAX_VALUE);
        System.out.printf("%-9s %-5d %-8s %-22s %s%n", "Float", Float.BYTES, Float.TYPE, Float.MIN_VALUE, Float.MAX_VALUE);
        System.out.printf("%-9s %-5d %-8s %-22s %s%n", "Double", Double.BYTES, Double.TYPE, Double.MIN_VALUE, Double.MAX_VALUE);
        System.out.printf("%-9s %-5d %-8s %-22d %d%n", "Character", Character.BYTES, Character.TYPE, (int) Character.MIN_VALUE, (int) Character.MAX_VALUE);
        System.out.printf("%-9s %-5s %-8s %-22s %s%n", "Boolean", "-", Boolean.TYPE, Boolean.FALSE, Boolean.TRUE);

        System.out.println(Integer.parseInt("120") + 1);                 // String -> int
        System.out.println(Integer.valueOf("120").getClass().getSimpleName()); // String -> Integer
        System.out.println(Integer.toString(255, 16) + " " + Integer.toBinaryString(10) + " " + Integer.parseInt("ff", 16));
        System.out.println(Integer.compare(3, 7) + " " + Integer.max(3, 7) + " " + Integer.sum(3, 7) + " " + Integer.bitCount(255));
        System.out.println(Character.isDigit('7') + " " + Character.isLetter('₹') + " " + Character.toUpperCase('a') + " " + Character.getNumericValue('9'));
        System.out.println(Boolean.parseBoolean("TRUE") + " " + Boolean.parseBoolean("yes") + " " + Boolean.logicalXor(true, false));
        System.out.println(Double.isNaN(0.0 / 0) + " " + Double.isInfinite(1 / 0.0) + " " + Double.MIN_VALUE + " " + Long.numberOfTrailingZeros(8));
        System.out.println(Integer.class.getSuperclass().getSimpleName() + " " + (Integer.valueOf(1) instanceof Comparable)
                + " " + Boolean.class.getSuperclass().getSimpleName() + " " + Character.class.getSuperclass().getSimpleName());
    }
}`,
        },
        {
          type: "output",
          text: `wrapper   BYTES TYPE     MIN_VALUE              MAX_VALUE
Byte      1     byte     -128                   127
Short     2     short    -32768                 32767
Integer   4     int      -2147483648            2147483647
Long      8     long     -9223372036854775808   9223372036854775807
Float     4     float    1.4E-45                3.4028235E38
Double    8     double   4.9E-324               1.7976931348623157E308
Character 2     char     0                      65535
Boolean   -     boolean  false                  true
121
Integer
ff 1010 255
-1 7 10 8
true false A 9
true false true
true true 4.9E-324 3
Number true Object Object`,
        },
        {
          type: "list",
          items: [
            "The six numeric wrappers extend `java.lang.Number`, which gives every one of them `intValue()`, `longValue()`, `doubleValue()` and so on. `Boolean` and `Character` extend `Object` directly. All eight are `final`, immutable, and `Comparable`.",
            "`TYPE` is the `Class` object for the primitive (`int.class`), used by reflection: `Integer.TYPE == int.class`.",
            "**`Double.MIN_VALUE` is not negative**: it's the smallest *positive* double, 4.9E-324. The most negative double is `-Double.MAX_VALUE`. That trips up every \"find the maximum\" loop that starts at `Double.MIN_VALUE` and meets negative numbers.",
            "`Character.isLetter('₹')` is `false`: the rupee sign is a currency symbol (`Character.getType` says `CURRENCY_SYMBOL`).",
            "`Boolean.parseBoolean` is `true` only for `\"true\"`, case-insensitively. `\"yes\"`, `\"1\"` and `\"Y\"` are all `false`, silently.",
          ],
        },
        {
          type: "heading",
          text: "Primitive, wrapper and conversions",
        },
        {
          type: "table",
          headers: ["Primitive", "Wrapper", "String → primitive", "String → wrapper", "Wrapper → primitive"],
          rows: [
            ["`int`", "`Integer`", "`Integer.parseInt(s)`", "`Integer.valueOf(s)`", "`x.intValue()`"],
            ["`long`", "`Long`", "`Long.parseLong(s)`", "`Long.valueOf(s)`", "`x.longValue()`"],
            ["`double`", "`Double`", "`Double.parseDouble(s)`", "`Double.valueOf(s)`", "`x.doubleValue()`"],
            ["`float`", "`Float`", "`Float.parseFloat(s)`", "`Float.valueOf(s)`", "`x.floatValue()`"],
            ["`short`, `byte`", "`Short`, `Byte`", "`Short.parseShort(s)`...", "`Short.valueOf(s)`...", "`x.shortValue()`..."],
            ["`boolean`", "`Boolean`", "`Boolean.parseBoolean(s)`", "`Boolean.valueOf(s)`", "`x.booleanValue()`"],
            ["`char`", "`Character`", "`s.charAt(0)`", "`Character.valueOf(c)`", "`x.charValue()`"],
          ],
        },
        {
          type: "paragraph",
          text: "`parseXxx` returns the primitive; `valueOf` returns the wrapper (through the cache). Going back to text: `String.valueOf(x)`, `Integer.toString(x)` or `\"\" + x`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What autoboxing compiles to",
        },
        {
          type: "code",
          language: "java",
          title: "Boxing.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Boxing {
    static int demo() {
        Integer boxed = 5;            // autoboxing
        int plain = boxed;            // unboxing
        boxed++;                      // unbox, add 1, box a new Integer
        List<Integer> fares = new ArrayList<>();
        fares.add(plain);             // autoboxing in a call
        return fares.get(0) + boxed;  // unboxing both
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Boxing.java && javap -c Boxing",
        },
        {
          type: "output",
          text: `  static int demo();
    Code:
       0: iconst_5
       1: invokestatic  #7                  // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
       4: astore_0
       5: aload_0
       6: invokevirtual #13                 // Method java/lang/Integer.intValue:()I
       9: istore_1
      10: aload_0
      11: astore_2
      12: aload_0
      13: invokevirtual #13                 // Method java/lang/Integer.intValue:()I
      16: iconst_1
      17: iadd
      18: invokestatic  #7                  // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      21: astore_0
      22: aload_2
      23: pop
      24: new           #17                 // class java/util/ArrayList
      27: dup
      28: invokespecial #19                 // Method java/util/ArrayList."<init>":()V
      31: astore_2
      32: aload_2
      33: iload_1
      34: invokestatic  #7                  // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      37: invokeinterface #20,  2           // InterfaceMethod java/util/List.add:(Ljava/lang/Object;)Z
      42: pop
      43: aload_2
      44: iconst_0
      45: invokeinterface #26,  2           // InterfaceMethod java/util/List.get:(I)Ljava/lang/Object;
      50: checkcast     #8                  // class java/lang/Integer
      53: invokevirtual #13                 // Method java/lang/Integer.intValue:()I
      56: aload_0
      57: invokevirtual #13                 // Method java/lang/Integer.intValue:()I
      60: iadd
      61: ireturn
}`,
        },
        {
          type: "list",
          items: [
            "**Boxing is `Integer.valueOf(int)`** (offsets 1, 18, 34). There's no new instruction and no `new Integer`: the compiler inserts an ordinary static call, which is where the cache comes in.",
            "**Unboxing is `intValue()`** (offsets 6, 13, 53, 57), an ordinary virtual call on the object. If the reference is `null`, that call throws `NullPointerException`: unboxing has a hidden null check at every use.",
            "**`boxed++` is three steps** (offsets 12 to 21): unbox, `iadd`, box again with `valueOf`, and store the **new** reference. The old `Integer` is untouched. (Offsets 10, 11 and 22, 23 save and discard the old value, which is what a postfix `++` evaluates to.)",
            "**`fares.get(0) + boxed`** combines generics and unboxing: `checkcast Integer` from erasure (the Generics lesson), then `intValue()`.",
            "Autoboxing is purely a compiler feature. The JVM only sees method calls, which is also why the JIT can sometimes remove them (escape analysis), and why it often can't.",
          ],
        },
        {
          type: "heading",
          text: "The caches behind valueOf",
        },
        {
          type: "code",
          language: "java",
          title: "Caches.java",
          code: `public class Caches {
    public static void main(String[] args) {
        Integer a = 127, b = 127;
        Integer c = 128, d = 128;
        System.out.println("Integer 127 == 127: " + (a == b) + ",  128 == 128: " + (c == d) + ",  equals: " + c.equals(d));
        Integer m = -128, n = -128, o = -129, p = -129;
        System.out.println("Integer -128: " + (m == n) + ", -129: " + (o == p));

        Long l1 = 127L, l2 = 127L, l3 = 128L, l4 = 128L;
        Short s1 = 127, s2 = 127;
        Byte b1 = -1, b2 = -1;
        Character ch1 = 'z', ch2 = 'z', ch3 = '₹', ch4 = '₹';
        Boolean t1 = true, t2 = Boolean.valueOf("TRUE");
        Double d1 = 1.0, d2 = 1.0;
        System.out.println("Long 127: " + (l1 == l2) + ", 128: " + (l3 == l4)
                + " | Short 127: " + (s1 == s2) + " | Byte -1: " + (b1 == b2));
        System.out.println("Character 'z': " + (ch1 == ch2) + ", '₹': " + (ch3 == ch4)
                + " | Boolean: " + (t1 == t2) + " | Double 1.0: " + (d1 == d2));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Caches.java && java Caches
java -XX:AutoBoxCacheMax=1000 Caches | head -1`,
        },
        {
          type: "output",
          text: `Integer 127 == 127: true,  128 == 128: false,  equals: true
Integer -128: true, -129: false
Long 127: true, 128: false | Short 127: true | Byte -1: true
Character 'z': true, '₹': false | Boolean: true | Double 1.0: false

Integer 127 == 127: true,  128 == 128: true,  equals: true`,
        },
        {
          type: "image",
          src: "/images/java/wrapper-integer-cache.svg",
          alt: "Source: Integer a = 127, b = 127; Integer c = 128, d = 128; a == b is true, c == d is false, c.equals(d) is true. Integer.valueOf(i) returns cache[i + 128] when i is between -128 and high, otherwise new Integer(i); high is 127 or set by -XX:AutoBoxCacheMax. On the heap, IntegerCache.cache holds 256 shared Integers from -128 to 127, and a and b both point to the 127 entry, while c and d are two separate new Integer 128 objects. Below, one Integer object is 16 bytes: an 8-byte mark word, a 4-byte class pointer and the 4-byte int value; Long and Double are 24 bytes. Caches: Integer, Long, Short and Byte from -128 to 127, Character 0 to 127, Boolean TRUE and FALSE, Float and Double none.",
          caption: "Autoboxing calls valueOf, and valueOf hands out shared objects only for small values.",
        },
        {
          type: "list",
          items: [
            "`Integer.valueOf(i)` returns a **pre-built object** from `Integer.IntegerCache` for -128 to 127, and a new `Integer` otherwise. Two boxes of 127 are the same object, so `==` is `true`; two boxes of 128 are different objects, so `==` is `false`, while `equals` compares the values and is `true` either way.",
            "The JLS (5.1.7) **requires** this caching for -128 to 127 for `int`, `short`, `byte`, for `char` from `\\u0000` to `\\u007f`, and for both `boolean` values. That's why `Long`, `Short` and `Byte` cache exactly the same range, `Character` caches 0 to 127 (so `'₹'` isn't cached), and `Boolean.valueOf` always returns `Boolean.TRUE` or `Boolean.FALSE`.",
            "`Float` and `Double` have **no cache**: every `Double` box is a new object, even for 1.0.",
            "HotSpot lets the upper bound of the `Integer` cache be raised with `-XX:AutoBoxCacheMax=1000` (it sets the `java.lang.Integer.IntegerCache.high` VM property, which `IntegerCache` reads when it initialises). Then `128 == 128` became `true`. Only `Integer`'s cache can grow; `Long`'s can't. Changing this flag to make `==` \"work\" would be fixing the wrong thing: the code should use `equals`.",
          ],
        },
        {
          type: "heading",
          text: "How big a wrapper is",
        },
        {
          type: "code",
          language: "java",
          title: "WrapperSizes.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class WrapperSizes {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;

    interface Make { Object make(int i); }

    static long cost(Make m, int i) {
        long before = MX.getCurrentThreadAllocatedBytes();
        sink = m.make(i);
        return MX.getCurrentThreadAllocatedBytes() - before;
    }

    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);
        System.out.println("Integer.value at offset " + u.objectFieldOffset(Integer.class.getDeclaredField("value"))
                + ", Long.value at offset " + u.objectFieldOffset(Long.class.getDeclaredField("value")));

        Make[] makers = {i -> Integer.valueOf(i), i -> Long.valueOf(i), i -> Double.valueOf(i),
                         i -> Short.valueOf((short) i), i -> Character.valueOf((char) i), i -> Boolean.valueOf(i % 2 == 0)};
        String[] names = {"Integer", "Long", "Double", "Short", "Character", "Boolean"};
        for (int r = 0; r < 20_000; r++) for (Make m : makers) cost(m, 1000 + r);        // warm up
        for (int k = 0; k < makers.length; k++) {
            System.out.printf("%-9s valueOf(5): %2d bytes   valueOf(1000): %2d bytes%n",
                    names[k], cost(makers[k], 5), cost(makers[k], 1000));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -nowarn WrapperSizes.java          # warnings: Unsafe is internal proprietary API
java WrapperSizes`,
        },
        {
          type: "output",
          text: `Integer.value at offset 12, Long.value at offset 16
Integer   valueOf(5):  0 bytes   valueOf(1000): 16 bytes
Long      valueOf(5):  0 bytes   valueOf(1000): 24 bytes
Double    valueOf(5): 24 bytes   valueOf(1000): 24 bytes
Short     valueOf(5):  0 bytes   valueOf(1000): 16 bytes
Character valueOf(5):  0 bytes   valueOf(1000): 16 bytes
Boolean   valueOf(5):  0 bytes   valueOf(1000):  0 bytes`,
        },
        {
          type: "list",
          items: [
            "**An `Integer` is 16 bytes**: a 12-byte object header (8-byte mark word plus 4-byte compressed class pointer) with the 4-byte `int` right after it at offset 12. Four times the size of the value.",
            "**A `Long` is 24 bytes**: the `long` needs 8-byte alignment, so it starts at offset 16, leaving a 4-byte gap after the header; 16 + 8 = 24. `Double` is the same.",
            "**Cached values cost nothing**: `valueOf(5)` allocated 0 bytes for every type with a cache. `Double.valueOf(5)` allocated 24, because `Double` has none.",
            "**`Boolean` never allocates**: there are only two values, both pre-built.",
            "Add the 4-byte reference that points to each wrapper from an array or collection, and a boxed `int` costs 20 bytes against 4, the 5x the Arrays lesson measured for `Integer[]`.",
          ],
        },
        {
          type: "heading",
          text: "Constructors are deprecated for removal",
        },
        {
          type: "code",
          language: "java",
          title: "NewInteger.java",
          code: `public class NewInteger {
    public static void main(String[] args) {
        Integer x = new Integer(5);
        System.out.println(x == Integer.valueOf(5));
    }
}`,
        },
        {
          type: "output",
          text: `NewInteger.java:3: warning: [removal] Integer(int) in Integer has been deprecated and marked for removal
        Integer x = new Integer(5);
                    ^
1 warning
false`,
        },
        {
          type: "paragraph",
          text: "`new Integer(5)` always creates a new object, bypassing the cache, so it isn't `==` to `valueOf(5)` even though 5 is cached. The constructors have been deprecated since Java 9 and marked **for removal** since Java 16, as part of preparing wrappers to become value objects. Always use `valueOf` or plain autoboxing.",
        },
      ],
    },
    {
      title: "Unboxing and null",
      blocks: [
        {
          type: "paragraph",
          text: "A wrapper variable can be `null`; a primitive can't. Every unboxing is an `intValue()` call, so unboxing `null` throws `NullPointerException`, often from a line that doesn't look like it calls anything:",
        },
        {
          type: "code",
          language: "java",
          title: "UnboxingNpe.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class UnboxingNpe {
    record Driver(String id, Integer rating) { }               // rating may be missing

    public static void main(String[] args) {
        Map<String, Integer> tripsToday = new HashMap<>();
        tripsToday.put("D1", 7);

        int d1 = tripsToday.get("D1");
        System.out.println("D1 trips " + d1);
        try {
            int d2 = tripsToday.get("D2");                   // no entry: get returns null
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
        }
        int safe = tripsToday.getOrDefault("D2", 0);
        System.out.println("D2 trips " + safe);

        Driver newDriver = new Driver("D9", null);
        try {
            if (newDriver.rating() >= 4) System.out.println("top rated");
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `D1 trips 7
Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
D2 trips 0
Cannot invoke "java.lang.Integer.intValue()" because the return value of "UnboxingNpe$Driver.rating()" is null`,
        },
        {
          type: "list",
          items: [
            "`int d2 = tripsToday.get(\"D2\")` has no visible method call on a possibly-null value, but the compiler added `.intValue()`. Helpful NullPointerException messages (Java 14+) name it exactly: `Cannot invoke \"java.lang.Integer.intValue()\"`. When a stack trace points at an innocent-looking line, that phrase means unboxing.",
            "`Map.get` returns `null` for a missing key, so unboxing its result is the most common source. `getOrDefault`, `merge` and `computeIfAbsent` avoid the `null` entirely.",
            "`newDriver.rating() >= 4` unboxes for the comparison. A nullable `Integer` field that's compared or added to is a `NullPointerException` waiting for the first record without a value.",
            "Wrappers are the right choice exactly when \"no value\" is meaningful (a rating not yet given, an optional database column). Then every use needs a decision about `null`; `Optional`/`OptionalInt` or an explicit default make that decision visible.",
          ],
        },
      ],
    },
    {
      title: "Wrappers Are Immutable",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Immutable.java",
          code: `public class Immutable {
    static void addBonus(Integer trips) {
        trips += 5;                                    // a new Integer, local to this method
        System.out.println("inside: " + trips);
    }

    public static void main(String[] args) {
        Integer trips = 1000;
        Integer before = trips;
        addBonus(trips);
        System.out.println("outside: " + trips);
        trips++;
        System.out.println("after ++: " + trips + ", same object as before? " + (trips == before));
    }
}`,
        },
        {
          type: "output",
          text: `inside: 1005
outside: 1000
after ++: 1001, same object as before? false`,
        },
        {
          type: "list",
          items: [
            "An `Integer`'s `value` field is `private final`. There's no method that changes it, so like `String`, every \"change\" is a new object.",
            "`trips += 5` inside `addBonus` unboxes, adds and assigns a **new** `Integer` to the method's local parameter. The caller's variable still points at the original 1000. Passing a wrapper to a method can't be used to return a changed number; return the new value, or use a mutable holder like `AtomicInteger` or an `int[1]`.",
            "`trips++` in `main` made `trips` point to a new object: `trips == before` is `false`. Code that uses a wrapper as a lock (`synchronized (count)`) and then increments it is locking a different object each time; since Java 16 `javac` warns about synchronizing on value-based classes.",
            "Immutability is what makes the cache safe: everyone can share the same `Integer` 127 because nobody can change it.",
          ],
        },
      ],
    },
    {
      title: "Parsing and Converting",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Parsing.java",
          code: `public class Parsing {
    static void tryParse(String s) {
        try {
            System.out.printf("%-16s -> %d%n", "\\"" + s + "\\"", Integer.parseInt(s));
        } catch (NumberFormatException e) {
            System.out.printf("%-16s -> %s%n", s == null ? "null" : "\\"" + s + "\\"", e.getMessage());
        }
    }

    public static void main(String[] args) {
        for (String s : new String[] {"120", "+42", "-7", " 42", "4_2", "12.5", "", "2147483648", null}) tryParse(s);
        System.out.println(Integer.decode("0x1F") + " " + Integer.decode("010") + " " + Integer.parseInt("1010", 2)
                + " " + Long.parseLong("9999999999") + " " + Double.parseDouble("1e3") + " " + Integer.parseInt(" 42 ".strip()));
        System.out.println(Integer.MAX_VALUE + 1);
        System.out.println(Integer.parseUnsignedInt("4294967295") + " " + Integer.toUnsignedString(-1));
    }
}`,
        },
        {
          type: "output",
          text: `"120"            -> 120
"+42"            -> 42
"-7"             -> -7
" 42"            -> For input string: " 42"
"4_2"            -> For input string: "4_2"
"12.5"           -> For input string: "12.5"
""               -> For input string: ""
"2147483648"     -> For input string: "2147483648"
null             -> Cannot parse null string
31 8 10 9999999999 1000.0 42
-2147483648
-1 4294967295`,
        },
        {
          type: "list",
          items: [
            "`parseInt` is strict: an optional sign, then digits, nothing else. Whitespace, underscores (legal in source literals like `1_000`, not in strings) and decimals all throw `NumberFormatException`. Strip input first.",
            "**Overflow is checked when parsing** (`\"2147483648\"` throws) but **not in arithmetic**: `Integer.MAX_VALUE + 1` silently wraps to `Integer.MIN_VALUE`. Use `Math.addExact` where overflow must be caught, or `Long`.",
            "`null` throws `NumberFormatException`, not `NullPointerException`, with the message \"Cannot parse null string\".",
            "`Integer.decode` understands `0x` hex and a leading `0` as **octal**: `decode(\"010\")` is 8. That's a trap for IDs or codes with leading zeros; `parseInt(\"010\")` is 10.",
            "Java has no unsigned `int`, but since Java 8 there are methods that treat an `int`'s 32 bits as unsigned: `-1` is `4294967295` unsigned.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `Integer c = 128, d = 128; System.out.println(c == d);` from `Caches.java`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile.** `javac` sees an `int` literal assigned to an `Integer`, a boxing conversion (JLS 5.1.7), and emits `sipush 128` followed by `invokestatic Integer.valueOf(I)`. Same for `d`. For `c == d`, both operands are references, so `==` stays a reference comparison: `if_acmpne`.",
            "**First use of `Integer.valueOf`.** If `Integer`'s nested `IntegerCache` class isn't initialised yet (it almost always is, because the JDK uses it at startup), its static initialiser reads the `high` bound (default 127, or `-XX:AutoBoxCacheMax`) and fills `cache` with `Integer` objects for -128 to `high`. With Class Data Sharing, that array comes pre-built from the CDS archive.",
            "**`valueOf(128)` for `c`.** 128 is above `high`, so it executes `new Integer(128)`: a 16-byte object allocated in the thread's TLAB, `value` set to 128.",
            "**`valueOf(128)` for `d`.** Another `new Integer(128)`: a second, separate object.",
            "**`c == d`.** `if_acmpne` compares the two references: different addresses, so `false`. Nothing about the values is looked at.",
            "**With 127 instead,** both `valueOf` calls return `cache[127 + 128]`, the same object, and `==` is `true`. The code is identical; only the value changed which branch `valueOf` took.",
            "**With `c.equals(d)`,** `Integer.equals` checks `obj instanceof Integer` and compares `value == ((Integer) obj).intValue()`: `true` for both cases.",
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
          code: `import java.util.ArrayList;
import java.util.List;

public class SyntaxTour {
    public static void main(String[] args) {
        // 1. boxing and unboxing
        Integer boxed = 42;                    // Integer.valueOf(42)
        int plain = boxed;                     // boxed.intValue()
        Integer explicit = Integer.valueOf(42);
        int back = explicit.intValue();
        System.out.println(boxed + " " + plain + " " + explicit + " " + back);

        // 2. parsing and converting
        int n = Integer.parseInt("120");
        Integer w = Integer.valueOf("120");
        long big = Long.parseLong("9000000000");
        double d = Double.parseDouble("3.75");
        boolean flag = Boolean.parseBoolean("true");
        String s = Integer.toString(255) + " " + String.valueOf(3.5) + " " + Integer.toHexString(255);
        System.out.println(n + " " + w + " " + big + " " + d + " " + flag + " " + s);

        // 3. comparing
        Integer a = 1000, b = 1000;
        System.out.println(a.equals(b) + " " + (a.intValue() == b) + " " + Integer.compare(a, b) + " " + a.compareTo(2000));

        // 4. constants and helpers
        System.out.println(Integer.MAX_VALUE + " " + Long.MIN_VALUE + " " + Character.isLetterOrDigit('_')
                + " " + Integer.signum(-5) + " " + Double.compare(0.0, -0.0));

        // 5. collections need wrappers
        List<Integer> fares = new ArrayList<>(List.of(120, 85));
        fares.add(240);                        // boxed
        int total = 0;
        for (int f : fares) total += f;        // unboxed
        System.out.println(fares + " total " + total);

        // 6. a null wrapper is allowed, a null primitive isn't
        Integer rating = null;
        System.out.println("rating " + rating + ", present? " + (rating != null));
    }
}`,
        },
        {
          type: "output",
          text: `42 42 42 42
120 120 9000000000 3.75 true 255 3.5 ff
true true 0 -1
2147483647 -9223372036854775808 false -1 1
[120, 85, 240] total 445
rating null, present? false`,
        },
        {
          type: "paragraph",
          text: "`a.intValue() == b` compares numbers: once one side is a primitive, the other is unboxed, so it's `true` for 1000 too. `for (int f : fares)` unboxes each element as it's read; writing `for (Integer f : fares)` and then `total += f` does the same, one step later.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Counting with Map.merge",
        },
        {
          type: "code",
          language: "java",
          title: "TripCounter.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class TripCounter {
    public static void main(String[] args) {
        List<String> completedBy = List.of("D7", "D2", "D7", "D9", "D7", "D2");

        Map<String, Integer> counts = new TreeMap<>();
        for (String d : completedBy) {
            counts.merge(d, 1, Integer::sum);          // no get/null-check/put dance
        }
        System.out.println(counts);

        // The pre-Java-8 version, and why it needs care
        Map<String, Integer> old = new TreeMap<>();
        for (String d : completedBy) {
            Integer c = old.get(d);
            old.put(d, c == null ? 1 : c + 1);         // forgetting the null check = NPE on first sighting
        }
        System.out.println(old + " same? " + old.equals(counts));

        String busiest = counts.entrySet().stream()
                .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("-");
        System.out.println("busiest " + busiest);
    }
}`,
        },
        {
          type: "output",
          text: `{D2=2, D7=3, D9=1}
{D2=2, D7=3, D9=1} same? true
busiest D7`,
        },
        {
          type: "paragraph",
          text: "`merge(key, 1, Integer::sum)` puts 1 for a new key and otherwise adds, with boxing handled inside. The old version needs `Integer c` (not `int`) because `get` can return `null`, and an explicit check. `Integer::sum` is one of the Java 8 static helpers added to wrappers precisely so they can be used as method references.",
        },
        {
          type: "heading",
          text: "Example 2: Reading numeric settings with defaults and bounds",
        },
        {
          type: "code",
          language: "java",
          title: "ConfigValues.java",
          code: `import java.util.Map;
import java.util.OptionalInt;

public class ConfigValues {
    // Parse without exceptions for the common "bad value" case
    static OptionalInt parseInt(String raw) {
        if (raw == null) return OptionalInt.empty();
        try {
            return OptionalInt.of(Integer.parseInt(raw.strip()));
        } catch (NumberFormatException e) {
            return OptionalInt.empty();
        }
    }

    static int intSetting(Map<String, String> env, String key, int fallback, int min, int max) {
        int v = parseInt(env.get(key)).orElse(fallback);
        if (v < min || v > max) throw new IllegalArgumentException(key + "=" + v + " outside " + min + ".." + max);
        return v;
    }

    public static void main(String[] args) {
        Map<String, String> env = Map.of("POOL_SIZE", " 32 ", "TIMEOUT_MS", "3s", "RETRIES", "7");
        System.out.println("POOL_SIZE  " + intSetting(env, "POOL_SIZE", 10, 1, 200));
        System.out.println("TIMEOUT_MS " + intSetting(env, "TIMEOUT_MS", 2000, 100, 60_000) + " (bad value, default used)");
        System.out.println("MISSING    " + intSetting(env, "MISSING", 5, 0, 10));
        try {
            intSetting(env, "RETRIES", 3, 0, 5);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `POOL_SIZE  32
TIMEOUT_MS 2000 (bad value, default used)
MISSING    5
RETRIES=7 outside 0..5`,
        },
        {
          type: "paragraph",
          text: "`OptionalInt` represents \"maybe an `int`\" without boxing and without `null`. Whitespace is stripped before parsing, a missing or unparseable value falls back to the default, and an out-of-range value fails loudly at startup. Whether a malformed value like `\"3s\"` should fall back or fail is a design choice; for something like a timeout, failing at startup is often better, because a silent default hides a configuration mistake.",
        },
        {
          type: "heading",
          text: "Example 3: Validating a number plate with Character",
        },
        {
          type: "code",
          language: "java",
          title: "PlateCheck.java",
          code: `public class PlateCheck {
    // Indian registration plates like "WB 02 AK 1234": state, district, series, number
    static boolean looksValid(String plate) {
        String p = plate.replace(" ", "").toUpperCase(java.util.Locale.ROOT);
        if (p.length() < 8 || p.length() > 10) return false;
        if (!Character.isLetter(p.charAt(0)) || !Character.isLetter(p.charAt(1))) return false;
        if (!Character.isDigit(p.charAt(2)) || !Character.isDigit(p.charAt(3))) return false;
        int digitsAtEnd = 0;
        for (int i = p.length() - 1; i >= 0 && Character.isDigit(p.charAt(i)); i--) digitsAtEnd++;
        if (digitsAtEnd != 4) return false;
        for (int i = 4; i < p.length() - 4; i++) if (!Character.isLetter(p.charAt(i))) return false;
        return true;
    }

    public static void main(String[] args) {
        for (String p : new String[] {"WB 02 AK 1234", "wb02ak1234", "DL 1C AA 1111", "MH 12 1234", "KA 05 MJ 12A4"}) {
            System.out.printf("%-14s %b%n", p, looksValid(p));
        }
        System.out.println(Character.isDigit('٣') + " " + Character.getNumericValue('٣'));
    }
}`,
        },
        {
          type: "output",
          text: `WB 02 AK 1234  true
wb02ak1234     true
DL 1C AA 1111  false
MH 12 1234     false
KA 05 MJ 12A4  false
true 3`,
        },
        {
          type: "list",
          items: [
            "`Character.isLetter` and `isDigit` read clearly and handle every check without a regex.",
            "`DL 1C AA 1111` is a real Delhi plate format (single-digit district plus a letter) and my rule rejects it. Real plate rules vary by state, which is why production validation usually uses a regex per format and accepts more than it rejects.",
            "**The trap:** `Character.isDigit('٣')` is `true`. It's ARABIC-INDIC DIGIT THREE, and `getNumericValue` gives 3. `isDigit` accepts every Unicode decimal digit, so for strictly ASCII input, check `c >= '0' && c <= '9'`. The same applies to `\\d` in Java regex only when `UNICODE_CHARACTER_CLASS` is on; by default it's ASCII.",
          ],
        },
      ],
    },
    {
      title: "When to Use a Wrapper",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["Local variables, loop counters, arithmetic", "Primitive", "No allocation, no `null`, fastest"],
            ["Fields that always have a value", "Primitive", "`int seats`, `long farePaise`"],
            ["Elements of collections, generic type arguments", "Wrapper (required)", "`List<Integer>`; consider `int[]`/`IntStream` for big numeric data"],
            ["A value that may be absent (optional column, not-yet-given rating)", "Wrapper, or `OptionalInt` in return types", "`null` means \"no value\"; document it"],
            ["JPA entity IDs", "`Long`", "`null` means \"not persisted yet\""],
            ["Parsing text", "`parseInt` for a primitive, `valueOf` for a wrapper", "Avoid an unnecessary box"],
            ["Comparing two values", "Primitives with `==`, wrappers with `equals`/`Objects.equals`", "`==` on wrappers compares identity"],
            ["A counter changed by several threads", "`AtomicInteger`/`LongAdder`", "Wrappers are immutable; `Integer` fields need locking"],
            ["Money", "`long` paise or `BigDecimal`", "Never `double`/`Double` (next lesson)"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: primitives by default, wrappers only where an object is required or `null` is meaningful. A nullable wrapper should be a deliberate decision with a reason, not the result of an IDE generating `Integer` because a JSON field might be missing.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Comparing wrappers with ==",
        },
        {
          type: "paragraph",
          text: "`Integer a = 128, b = 128; a == b` is `false`, and the same code with 127 is `true`. Tests with small values pass; production with real values fails. The production section is this bug with driver IDs. Use `equals`, `Objects.equals`, or unbox one side.",
        },
        {
          type: "heading",
          text: "Unboxing a value that can be null",
        },
        {
          type: "paragraph",
          text: "`int x = map.get(key);`, `if (driver.rating() >= 4)`, and passing an `Integer` to a method taking `int` all throw `NullPointerException` when the wrapper is `null`. Use `getOrDefault`, check for `null` explicitly, or keep the value in a primitive from the start.",
        },
        {
          type: "heading",
          text: "Using new Integer(...)",
        },
        {
          type: "paragraph",
          text: "Deprecated for removal since Java 16, bypasses the cache, and creates identity where none should exist. Use `Integer.valueOf` or autoboxing.",
        },
        {
          type: "heading",
          text: "Starting a maximum search at Double.MIN_VALUE",
        },
        {
          type: "paragraph",
          text: "`Double.MIN_VALUE` is 4.9E-324, the smallest positive double. A loop starting `double max = Double.MIN_VALUE` returns it for an array of negative numbers. Start at `Double.NEGATIVE_INFINITY` or `-Double.MAX_VALUE`, or at the first element. (`Integer.MIN_VALUE` is negative; only the floating-point types are different.)",
        },
        {
          type: "heading",
          text: "Expecting parseBoolean or parseInt to be lenient",
        },
        {
          type: "paragraph",
          text: "`Boolean.parseBoolean(\"yes\")` is silently `false`; `Integer.parseInt(\" 42\")` throws. Normalise input (`strip()`), and for booleans from config, accept an explicit list of values and reject the rest.",
        },
        {
          type: "heading",
          text: "Integer.decode on values with leading zeros",
        },
        {
          type: "paragraph",
          text: "`Integer.decode(\"010\")` is 8 (octal) and `decode(\"09\")` throws. Use `parseInt` unless hex or octal prefixes are really expected.",
        },
        {
          type: "heading",
          text: "Synchronizing on a wrapper",
        },
        {
          type: "paragraph",
          text: "`synchronized (count) { count++; }` locks one object and then replaces it; cached wrappers are shared across the whole JVM, so unrelated code may lock the same `Integer`. Since Java 16 `javac` warns: \"attempt to synchronize on an instance of a value-based class\". Lock on a dedicated `private final Object`, or use `AtomicInteger`.",
        },
        {
          type: "heading",
          text: "Changing a wrapper parameter to return a result",
        },
        {
          type: "paragraph",
          text: "`void addBonus(Integer trips) { trips += 5; }` changes nothing for the caller, as `Immutable.java` showed. Return the new value.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Prefer primitives; use wrappers only where objects are required or `null` carries meaning.",
            "Compare wrapper values with `equals` or `Objects.equals`, or convert to primitives first; never `==` between two wrappers.",
            "Treat every unboxing as a possible `NullPointerException`: use `getOrDefault`, `merge`, `Optional`, or explicit checks.",
            "Use `valueOf`/autoboxing, never wrapper constructors.",
            "Use `parseXxx` when a primitive is wanted, to avoid a needless box; strip input first.",
            "Use the static helpers: `Integer.compare` instead of subtraction in comparators, `Integer.sum`/`max` as method references, `Math.addExact` for overflow-checked arithmetic.",
            "Use `OptionalInt`/`OptionalLong`/`OptionalDouble` for optional primitive return values.",
            "Don't synchronize on wrappers or rely on their identity; they're value-based classes.",
            "For large numeric data, use primitive arrays and primitive streams instead of boxed collections.",
            "Turn on IDE inspections or Error Prone checks for `==` on boxed types (Error Prone's `ReferenceEquality`, IntelliJ's \"Number comparison using '=='\").",
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
            "**Memory.** An `Integer` is 16 bytes and a `Long` or `Double` 24, measured above; with the reference pointing to it, a boxed `int` costs 20 bytes against 4. One million `Integer`s in an `Integer[]` took 20 MB against 4 MB for `int[]` (Arrays lesson).",
            "**Allocation.** Boxing outside the cache allocates every time. A `Long` accumulator in a loop allocates a `Long` per iteration; the next lesson measures 1.2 GB of garbage for a 100-million-iteration loop.",
            "**Indirection.** Reading a boxed value means loading a reference and then the object it points to, usually elsewhere in the heap. Summing a `List<Integer>` was 6 times slower than an `int[]` (Generics lesson).",
            "**The cache is free.** `valueOf` for -128 to 127 is a range check and an array load: no allocation, as `WrapperSizes` showed with 0 bytes.",
            "**Escape analysis helps sometimes.** When a box never escapes a compiled method, C2 can remove the allocation entirely. It's an optimisation, not a guarantee: it depends on inlining and on the box not being stored, so hot paths shouldn't rely on it.",
            "**`-XX:AutoBoxCacheMax`** can reduce allocation for workloads that box many medium-sized integers, at the cost of a larger cache array created at startup. It's a tuning knob for measured problems, never a way to make `==` correct.",
          ],
        },
      ],
    },
    {
      title: "Wrapper Classes in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend lets a driver accept a trip only if it was assigned to them. The `Trip` entity has `Long assignedDriverId` (ORMs map ID columns to `Long`, so `null` can mean \"not persisted\"), and the driver ID arrives in the request and is parsed into a `Long`. The check was written as `trip.assignedDriverId() == driverId`. Every unit test passed. After launch, no driver could accept any trip, and the error rate on the accept endpoint was 100%.",
        },
        {
          type: "code",
          language: "java",
          title: "TripAssignment.java",
          code: `import java.util.Objects;

public class TripAssignment {
    // An entity as an ORM would load it: the id column maps to a Long
    static final class Trip {
        private final Long id;
        private final Long assignedDriverId;
        Trip(Long id, Long assignedDriverId) { this.id = id; this.assignedDriverId = assignedDriverId; }
        Long assignedDriverId() { return assignedDriverId; }
    }

    // What shipped: compares two Long objects with ==
    static boolean canAccept(Trip trip, Long driverId) {
        return trip.assignedDriverId() == driverId;
    }

    static boolean canAcceptFixed(Trip trip, Long driverId) {
        return Objects.equals(trip.assignedDriverId(), driverId);
    }

    // The driver id arrives from a JSON body or path variable: parsed into a new Long
    static Long fromRequest(String raw) {
        return Long.valueOf(raw);
    }

    public static void main(String[] args) {
        // Unit test data: small ids
        Trip testTrip = new Trip(1L, 42L);
        System.out.println("test, driver 42   : " + canAccept(testTrip, fromRequest("42")));

        // Production data: real ids
        Trip prodTrip = new Trip(9_001_337L, 104_233L);
        System.out.println("prod, driver 104233: " + canAccept(prodTrip, fromRequest("104233")));
        System.out.println("prod, fixed        : " + canAcceptFixed(prodTrip, fromRequest("104233")));
        System.out.println("prod, null driver  : " + canAcceptFixed(new Trip(5L, null), fromRequest("104233")));
    }
}`,
        },
        {
          type: "output",
          text: `test, driver 42   : true
prod, driver 104233: false
prod, fixed        : true
prod, null driver  : false`,
        },
        {
          type: "list",
          items: [
            "**Why the tests passed.** Test fixtures used driver IDs like 1, 7 and 42. `Long.valueOf(42)` returns the cached `Long`, so the entity's ID and the parsed ID were the same object, and `==` was `true`.",
            "**Why production failed.** Real driver IDs (104233) are far above 127. The ORM created one `Long` when loading the trip, the request parser created another, and `==` compared two different objects: `false` for every driver.",
            "**The fix.** `Objects.equals(a, b)` compares values and handles `null` (an unassigned trip returns `false` instead of throwing). Comparing `a.longValue() == b` also works but throws on `null`.",
            "**Why nothing warned.** `==` between two `Long`s is legal Java, `javac -Xlint:all` says nothing, and the result is correct for 256 values. IntelliJ's \"Number comparison using '=='\" inspection and Error Prone's `ReferenceEquality` check both flag it, and are worth enabling in CI.",
            "**The test lesson.** Test data should look like production data: IDs from realistic ranges (or random large values), not 1, 2, 3. Many teams start ID sequences in tests at 1,000,000 for exactly this reason.",
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
              question: "What are wrapper classes, and why do we need them?",
              answer:
                "Classes that wrap one primitive value in an object: `Byte`, `Short`, `Integer`, `Long`, `Float`, `Double`, `Character`, `Boolean`. We need them because generics and collections only work with objects (`List<Integer>`, not `List<int>`), because a wrapper can be `null` to mean \"no value\", and because they hold utility methods and constants like `Integer.parseInt` and `Long.MAX_VALUE`.",
            },
            {
              question: "What are autoboxing and unboxing?",
              answer:
                "Automatic conversions added in Java 5. Autoboxing converts a primitive to its wrapper where an object is needed (`Integer x = 5;`, `list.add(5)`), and unboxing converts back (`int y = x;`). `javap` shows they're compiled to `Integer.valueOf(int)` and `x.intValue()` calls; the JVM has no special support.",
            },
            {
              question: "What is the difference between parseInt and valueOf?",
              answer:
                "`Integer.parseInt(s)` returns a primitive `int`. `Integer.valueOf(s)` returns an `Integer`, going through the cache, so values from -128 to 127 return shared objects. Both throw `NumberFormatException` for invalid input. Use `parseInt` when a primitive is wanted, to avoid creating a box.",
            },
            {
              question: "Why does Integer a = 127, b = 127; a == b print true, but 128 prints false?",
              answer:
                "Because `==` on two `Integer`s compares references, and autoboxing calls `Integer.valueOf`, which returns cached objects for -128 to 127. Both 127s are the same cached object; each 128 is a new object. The values are equal in both cases, which `equals` would show. The cache range is required by the JLS; the upper bound can be raised with `-XX:AutoBoxCacheMax`, but the fix is to use `equals`.",
            },
            {
              question: "Can a wrapper be null? Can a primitive?",
              answer:
                "A wrapper is a reference, so it can be `null`; a primitive can't. Unboxing a `null` wrapper throws `NullPointerException`, because unboxing calls `intValue()` on it. `int x = map.get(\"missing\")` is the classic case; the helpful NPE message says `Cannot invoke \"java.lang.Integer.intValue()\"`.",
            },
            {
              question: "Are wrapper classes immutable?",
              answer:
                "Yes. The value field is `private final` and there's no setter. `count++` on an `Integer` unboxes, adds, and boxes a new object, so the variable points to a different `Integer` afterwards. That's why passing an `Integer` to a method and changing it there doesn't affect the caller, and why the cache can safely share objects.",
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
              question: "Which wrappers have a cache, and what range does it cover?",
              answer:
                "`Integer`, `Long`, `Short` and `Byte` cache -128 to 127; `Character` caches 0 to 127; `Boolean.valueOf` always returns `Boolean.TRUE` or `Boolean.FALSE`. `Float` and `Double` have no cache. The JLS requires these ranges for boxing conversions. Only `Integer`'s upper bound can be raised, with `-XX:AutoBoxCacheMax`.",
            },
            {
              question: "How much memory does an Integer use?",
              answer:
                "16 bytes on a 64-bit JVM with compressed class pointers: a 12-byte header (8-byte mark word, 4-byte class pointer) plus the 4-byte `int` at offset 12. `Long` and `Double` are 24 bytes, because the 8-byte value is aligned to offset 16. With the 4-byte reference that points to it from a collection, a boxed `int` costs about 20 bytes versus 4. I measured these with `Unsafe.objectFieldOffset` and the thread allocation counter.",
            },
            {
              question: "Why were the wrapper constructors deprecated?",
              answer:
                "`new Integer(5)` always creates a new object, bypassing the cache and wasting memory, and it gives wrappers an identity that code could depend on. They were deprecated in Java 9 and marked for removal in Java 16 (JEP 390), when wrappers were declared value-based classes, as preparation for Project Valhalla making them identity-free value objects. Use `valueOf` or autoboxing.",
            },
            {
              question: "What happens with Integer.MAX_VALUE + 1, and with Integer.parseInt(\"2147483648\")?",
              answer:
                "The arithmetic silently overflows to `Integer.MIN_VALUE` (-2147483648); Java integer arithmetic wraps without error. The parse is checked: it throws `NumberFormatException: For input string: \"2147483648\"`. For checked arithmetic, use `Math.addExact`/`multiplyExact`, which throw `ArithmeticException` on overflow.",
            },
            {
              question: "What is Double.MIN_VALUE?",
              answer:
                "The smallest positive `double`, about 4.9E-324, not the most negative one. The most negative finite double is `-Double.MAX_VALUE`. A maximum search initialised with `Double.MIN_VALUE` gives the wrong answer for all-negative data; start with `Double.NEGATIVE_INFINITY` or the first element. `Integer.MIN_VALUE`, by contrast, is negative.",
            },
            {
              question: "Why does i++ on an Integer variable create a new object?",
              answer:
                "Because `Integer` is immutable. The compiler turns `i++` into `i = Integer.valueOf(i.intValue() + 1)`: unbox, add, box. `javap` shows `intValue`, `iadd`, `valueOf`. The variable then refers to a new (or cached) `Integer`, and the old one is unchanged, which is also why synchronizing on an `Integer` you increment is broken.",
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
              question: "What exactly does javac generate for autoboxing and unboxing?",
              answer:
                "Ordinary method calls: boxing is `invokestatic Integer.valueOf(I)` (or `Long.valueOf(J)`...), unboxing is `invokevirtual Integer.intValue()`. Compound operations like `boxed++` become unbox, arithmetic, box, store. With generics there's also a `checkcast` from erasure before the unboxing. There's no special bytecode; the cache behaviour comes entirely from `valueOf`'s implementation.",
            },
            {
              question: "How does -XX:AutoBoxCacheMax work, and should you use it?",
              answer:
                "It sets the VM property `java.lang.Integer.IntegerCache.high`, which `Integer.IntegerCache` reads when it initialises, creating cached `Integer`s up to that value. With 1000, `Integer` 128 == 128 became `true` in my test. It only affects `Integer`. It can reduce allocation for workloads that box many medium integers, but it costs startup memory and never fixes `==` comparisons, which should use `equals`.",
            },
            {
              question: "What is a value-based class, and why does it matter for wrappers?",
              answer:
                "A class whose instances are defined only by their value, with no meaningful identity: final, immutable, `equals` based on state, created through factories rather than constructors. Since Java 16 (JEP 390) the wrappers are documented as value-based, so code must not use `==` on them, synchronize on them, or rely on `identityHashCode`. `javac` warns about `synchronized` on them. It prepares for Valhalla value objects, where wrappers may have no identity at all.",
            },
            {
              question: "Can the JIT remove autoboxing?",
              answer:
                "Sometimes. If a boxed object never escapes a compiled method, C2's escape analysis can scalar-replace it and remove the allocation; there are also intrinsics for `valueOf` and `intValue`. But it depends on inlining and on the box not being stored in a field, array or collection, so boxes put into a `List<Integer>` or a `HashMap` are always allocated. Hot code should use primitives rather than count on the optimisation.",
            },
            {
              question: "Why does Character.isDigit return true for characters that aren't 0 to 9?",
              answer:
                "`isDigit` checks the Unicode general category `DECIMAL_DIGIT_NUMBER`, which includes digits from many scripts: Arabic-Indic `٣`, Devanagari `३` and others. `getNumericValue('٣')` is 3. For ASCII-only validation (IDs, plates, OTPs), check `c >= '0' && c <= '9'`. Java regex `\\d` is ASCII-only by default.",
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
              question: "After launch, drivers can't accept trips assigned to them; tests pass. The check is trip.getDriverId() == request.getDriverId(), both Long. What's wrong?",
              answer:
                "`==` between two `Long` objects compares references. `Long.valueOf` caches -128 to 127, so with test IDs like 42 both sides are the same cached object and the check passes; with real IDs like 104233 the entity and the parsed request value are different objects, and it's always `false`. `TripAssignment` reproduces it exactly.\n\nFix with `Objects.equals(trip.getDriverId(), request.getDriverId())`, which also handles an unassigned (`null`) driver. Then search the codebase for other `==` on boxed types (IntelliJ inspection, Error Prone `ReferenceEquality`), and change test fixtures to realistic, large IDs.",
            },
            {
              question: "A report job crashes with NullPointerException at a line int total = stats.get(zone) + extra; but neither stats nor zone is null. What happened?",
              answer:
                "`stats.get(zone)` returned `null` because the map has no entry for that zone, and unboxing it for the `+` called `intValue()` on `null`. The helpful message would say `Cannot invoke \"java.lang.Integer.intValue()\" because the return value of \"java.util.Map.get(Object)\" is null`, which is the giveaway.\n\nFix: `stats.getOrDefault(zone, 0) + extra`, or decide explicitly what a missing zone means. If missing zones aren't expected, I'd fail with a clear message naming the zone rather than an NPE, and check why the data is incomplete.",
            },
            {
              question: "A service uses Integer fields for counters and synchronizes on them: synchronized (requestCount) { requestCount++; }. Counts are wrong under load. Why?",
              answer:
                "Two problems. `requestCount++` replaces the field with a new `Integer`, so each thread may lock a different object, and the lock protects nothing. And small `Integer` values are shared cached objects, so unrelated code locking on the same value contends on the same monitor. `javac` warns about synchronizing on value-based classes since Java 16.\n\nReplace it with an `AtomicInteger` (`incrementAndGet()`), or a `LongAdder` for heavily contended counters, or lock on a dedicated `private final Object lock`.",
            },
            {
              question: "A JSON request has an optional field \"tipAmount\". The DTO uses Integer, and the service adds it to the fare. Some requests fail with NPE. How would you redesign it?",
              answer:
                "When the field is absent, Jackson leaves the `Integer` as `null`, and `fare + tipAmount` unboxes it. Decide what absence means: for a tip, it's zero. Options: a primitive `int` field (Jackson sets 0 when the field is missing), a default in the DTO, or normalising at the boundary (`int tip = dto.tipAmount() == null ? 0 : dto.tipAmount();`) so the rest of the code works with primitives.\n\nIf \"not provided\" must be distinguished from 0 later, keep it as `OptionalInt` or an explicit nullable field with every use checked. And money should be whole paise in a `long` or a `BigDecimal`, not an `Integer` of rupees.",
            },
            {
              question: "A config flag \"enableSurge\" is set to \"yes\" in production, but surge pricing stays off. The code uses Boolean.parseBoolean. What's going on?",
              answer:
                "`Boolean.parseBoolean` returns `true` only for the string `\"true\"` (case-insensitive); everything else, including `\"yes\"`, `\"1\"` and `\"on\"`, is silently `false`. So the flag was read as off without any error.\n\nI'd parse booleans strictly: accept a defined set (`true`/`false`, or a documented list like `yes`/`no`), throw at startup for anything else, and log the effective value. Frameworks like Spring Boot already accept `yes`/`on`/`1` for boolean properties, so the bug often appears only in hand-written config code.",
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
            "Print `Integer.valueOf(127) == Integer.valueOf(127)` and the same for 128, then run again with `-XX:AutoBoxCacheMax=200`.",
            "Write `Integer x = 10; x++;` in a method, compile it and find the `valueOf` and `intValue` calls with `javap -c`.",
            "Create a `Map<String, Integer>`, call `int n = map.get(\"missing\");`, and read the full exception message.",
            "Print `Double.MIN_VALUE`, then write a loop that finds the maximum of `{-3.5, -1.2, -7.0}` starting from `Double.MIN_VALUE`. Fix it.",
            "Parse `\" 7\"`, `\"07\"`, `\"0x7\"` and `\"7.0\"` with `Integer.parseInt` and with `Integer.decode`, and note which throw.",
            "Compare `Long.valueOf(127) == Long.valueOf(127)` and `Long.valueOf(128) == 128L`, and explain why the second is `true`.",
            "Write `synchronized (Integer.valueOf(1)) { }` and compile it with `-Xlint:all`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `true`, `false`, then `true`, `true` with the flag. Step 2 shows `invokevirtual Integer.intValue`, `iadd`, `invokestatic Integer.valueOf`. Step 3 throws `NullPointerException: Cannot invoke \"java.lang.Integer.intValue()\" because the return value of \"java.util.Map.get(Object)\" is null`. Step 4 returns 4.9E-324 instead of -1.2. Step 5: `parseInt` gives an error, 7, an error, an error; `decode` gives an error for `\" 7\"`, 7 (octal 07), 7, and an error. Step 6: the first is `true` (cache), the second is `true` because one side is a primitive, so the `Long` is unboxed and compared numerically. Step 7 warns \"attempt to synchronize on an instance of a value-based class\".",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT       8 wrappers: Byte Short Integer Long Float Double Character Boolean
           final, immutable, Comparable; numeric ones extend Number
           needed for generics/collections, null, and static helpers

BOXING     Integer x = 5      ->  Integer.valueOf(5)        (javap)
           int y = x          ->  x.intValue()  -> NPE if x is null
           x++                ->  x = valueOf(x.intValue() + 1)  new object

CACHE      valueOf: Integer/Long/Short/Byte -128..127, Character 0..127,
           Boolean TRUE/FALSE, Float/Double none
           Integer 127 == 127 true, 128 == 128 false; equals always true
           -XX:AutoBoxCacheMax raises Integer's high only

SIZE       Integer 16 B (header 12 + int 4), Long/Double 24 B
           boxed int in a collection ~20 B vs 4 B

PARSE      parseInt -> int, valueOf -> Integer (cached)
           strict: no spaces, no _, no decimals; null -> NFE
           decode("010") = 8 (octal); MAX_VALUE + 1 wraps silently

AVOID      == on wrappers   new Integer()   synchronized(wrapper)
           Double.MIN_VALUE as "most negative"   parseBoolean("yes")
           unboxing anything that can be null`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Wrappers are immutable objects around primitives, and autoboxing is the compiler inserting `valueOf` and `intValue()` calls. Everything surprising about them comes from those two calls: `valueOf` hands out cached, shared objects only for small values, and `intValue()` on `null` throws.",
            "So: primitives by default, wrappers where objects or `null` are needed, `equals` instead of `==`, and a deliberate decision wherever a wrapper might be `null`.",
            "The next lesson, Wrapper Traps: Equality, Overloading and Performance, covers the subtler bugs: `Long.equals(Integer)` being `false`, a map that never finds its keys, the ternary operator that unboxes `null`, overloads that prefer widening to boxing, `List.remove` by index or value, `NaN` and `-0.0`, money in `BigDecimal`, and boxing measured in hot loops.",
          ],
        },
      ],
    },
  ],
};
