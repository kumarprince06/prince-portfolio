import type { Lesson } from "../types";

export const wrapperTraps: Lesson = {
  slug: "wrapper-traps",
  date: "2026-11-13",
  title: "Wrapper Traps: Equality, Overloading and Performance",
  description:
    "The subtle bugs autoboxing causes and how to spot them in bytecode, on JDK 21: Long.equals(Integer) is always false and Map<Long, V>.get(int) always misses, the ternary operator that unboxes a null into a NullPointerException, overload resolution that prefers widening to boxing, List<Integer>.remove(1) removing an index, NaN that isn't equal to itself and -0.0 that equals 0.0 but not by equals, 0.1 + 0.2, money in BigDecimal (new BigDecimal(0.1), equals vs compareTo, rounding) and in long paise, a Long accumulator that allocated 1.2 GB and a boxed HashMap counter 27 times slower than an int[], and a driver cache in a ride-hailing backend with a 0% hit rate because its keys were Long and its lookups were int.",
  tags: ["Core Java", "Wrapper Classes", "BigDecimal", "Performance"],
  sections: [
    {
      title: "What Can Go Wrong",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson covered what wrappers are: immutable objects created through `valueOf`, cached for small values, unboxed with `intValue()`. Each of those facts is simple. The trouble starts where autoboxing combines with other language rules that were designed before it existed: `equals` that checks the exact class, overload resolution, the type rules of the `? :` operator, and collection methods that take `Object`.",
        },
        {
          type: "paragraph",
          text: "The result is a family of bugs that compile without warnings, often pass tests, and fail with real data: a map lookup that never finds anything, a `NullPointerException` from a line containing no method call, a `remove` that deletes the wrong element, a comparison that's false for equal numbers. The second half of this lesson is about the two areas where wrapper choices have real cost: floating-point values (including money) and performance in hot loops.",
        },
        {
          type: "paragraph",
          text: "For each trap, I'll show the bytecode or the JLS rule that explains it, because once the mechanism is clear, the bugs become easy to recognise in code review.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Autoboxing arrived in Java 5 (2004) and had to fit into rules that were already fixed. Overload resolution couldn't change behaviour for existing code, so the JLS made boxing a **later phase**: a method that matches without boxing always wins over one that needs it. `equals` on wrappers already compared only the same class. The conditional operator already had \"numeric promotion\" rules, which now apply when one side is a wrapper. Joshua Bloch and Neal Gafter collected many of the resulting surprises in *Java Puzzlers* (2005), and most are still true on Java 21.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`Integer.equals` compares only with `Integer`; IEEE 754 doubles (`NaN`, `-0.0`)", "Cross-type equality and float traps predate boxing"],
            ["Java 1.1 (1997)", "`BigDecimal`", "Exact decimal arithmetic for money"],
            ["Java 5 (2004)", "Autoboxing; three-phase overload resolution (JLS 15.12.2); `BigDecimal.valueOf(double)` fixed to use `Double.toString`", "Widening beats boxing beats varargs"],
            ["Java 5 (2004)", "`List.remove(int)` and `remove(Object)` meet `List<Integer>`", "Index or value?"],
            ["Java 8 (2014)", "Poly expressions: conditional operator typing refined (JLS 15.25)", "Which `? :` expressions unbox"],
            ["Java 14 (2020)", "Helpful NullPointerException messages (JEP 358), on by default from Java 15", "Unboxing NPEs name `intValue()`"],
            ["Java 16 (2021)", "Wrappers are value-based classes (JEP 390)", "Identity comparisons are explicitly unsupported"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Back to envelopes of money, now in a bank.",
        },
        {
          type: "list",
          items: [
            "**`Long.equals(Integer)` is two envelopes with different labels**: one says \"long\", one says \"int\", both hold 7. The bank clerk's rule for \"same envelope contents?\" starts with \"same kind of envelope?\" and stops there. A map is a row of safe-deposit boxes opened by matching envelopes, so an \"int 7\" envelope never opens a \"long 7\" box.",
            "**The ternary trap is a teller who has to hand over either an envelope or loose cash.** The rules say: if one option is loose cash, both must be loose cash. So the teller opens the envelope first, and if it's empty, there's nothing to hand over: `NullPointerException`.",
            "**Overloading is a counter with several windows**: \"loose cash, any size\" (widening), \"envelopes only\" (boxing), \"bulk deposits\" (varargs). The bank always sends you to the first window that can serve you without repackaging, so an `int` goes to the `long` window, never the `Integer` window.",
            "**`double` is a scale that weighs to about 16 significant digits**: perfect for weighing gold, wrong for counting coins, because ten 10-paise coins weigh 0.9999999999999999 rupees. `BigDecimal` and whole paise in a `long` count coins exactly.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real clerk would notice that two envelopes both hold 7 rupees. Java's `equals` is deliberately strict, because `equals` must be symmetric and consistent with `hashCode` across all types, and `Long.valueOf(7).equals(Integer.valueOf(7))` being `true` would require `Integer` to know about `Long` and every other `Number`.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "What == and equals compare",
        },
        {
          type: "image",
          src: "/images/java/wrapper-equality-rules.svg",
          alt: "A table of expressions, what happens and the result. Integer == Integer for 127: reference compare, both from the cache, true by luck. Integer == Integer for 128: reference compare, two new objects, false. Long == int (7L, 7): one side primitive, so unbox, widen and compare numbers, true. Integer.equals(Integer): same type, compare int values, true. Long(7).equals(7): 7 boxes to Integer, and a Long never equals an Integer, false. Map<Long,V>.get(int): get(Object) compiles, the Integer key never matches, null. Double(0.0).equals(-0.0): equals compares bits while 0.0 == -0.0 is true, false. Double(NaN).equals(NaN): equals compares bits while NaN == NaN is false, true.",
          caption: "Whether == unboxes depends on whether one operand is primitive; equals always requires the same wrapper class.",
        },
        {
          type: "heading",
          text: "The rules behind the traps",
        },
        {
          type: "table",
          headers: ["Rule", "Source", "Consequence"],
          rows: [
            ["`==` with two reference operands compares references; with one numeric primitive operand, the other is unboxed and both are promoted", "JLS 15.21", "`Long == Long` compares identity; `Long == int` compares values"],
            ["`Integer.equals(o)` is `o instanceof Integer && value == ((Integer) o).value`", "`Integer` source", "`Long.equals(Integer)` is always `false`"],
            ["`Map.get`, `containsKey`, `Collection.contains`, `remove(Object)` take `Object`", "Collections API (pre-generics compatibility)", "Wrong key types compile and silently miss"],
            ["A conditional `? :` with one `int` and one `Integer` operand has type `int`", "JLS 15.25 (numeric conditional)", "The `Integer` side is unboxed, even when it's `null`"],
            ["Overload resolution: phase 1 without boxing/varargs, phase 2 with boxing, phase 3 with varargs", "JLS 15.12.2", "`f(long)` beats `f(Integer)` for an `int` argument"],
            ["`Double.equals` compares `doubleToLongBits`", "`Double` source", "`NaN` equals itself, `0.0` doesn't equal `-0.0`"],
            ["`BigDecimal.equals` compares value **and scale**", "`BigDecimal` source", "`2.0` isn't `equals` to `2.00`; use `compareTo`"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "Three of the traps compiled side by side, to see what `javac` actually decided:",
        },
        {
          type: "code",
          language: "java",
          title: "TrapBytecode.java",
          code: `import java.util.Map;

public class TrapBytecode {
    static Integer ternary(Map<String, Integer> m, boolean peak) {
        return peak ? m.get("x") : 0;
    }

    static String lookup(Map<Long, String> m, int id) {
        return m.get(id);
    }

    static void charge(long paise) { }
    static void charge(Integer paise) { }

    static void call(int fare) {
        charge(fare);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac TrapBytecode.java && javap -c TrapBytecode",
        },
        {
          type: "output",
          text: `  static java.lang.Integer ternary(java.util.Map<java.lang.String, java.lang.Integer>, boolean);
    Code:
       0: iload_1
       1: ifeq          21
       4: aload_0
       5: ldc           #7                  // String x
       7: invokeinterface #9,  2            // InterfaceMethod java/util/Map.get:(Ljava/lang/Object;)Ljava/lang/Object;
      12: checkcast     #15                 // class java/lang/Integer
      15: invokevirtual #17                 // Method java/lang/Integer.intValue:()I
      18: goto          22
      21: iconst_0
      22: invokestatic  #21                 // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      25: areturn
  static java.lang.String lookup(java.util.Map<java.lang.Long, java.lang.String>, int);
    Code:
       0: aload_0
       1: iload_1
       2: invokestatic  #21                 // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
       5: invokeinterface #9,  2            // InterfaceMethod java/util/Map.get:(Ljava/lang/Object;)Ljava/lang/Object;
      10: checkcast     #25                 // class java/lang/String
      13: areturn
  static void call(int);
    Code:
       0: iload_0
       1: i2l
       2: invokestatic  #27                 // Method charge:(J)V
       5: return`,
        },
        {
          type: "list",
          items: [
            "**The ternary unboxes, then re-boxes.** The method returns `Integer`, and `m.get(\"x\")` is an `Integer`, so it looks like no conversion is needed. But the other operand is the `int` 0, which makes the whole conditional an `int` expression (JLS 15.25). `javac` calls `intValue()` on the `get` result (offset 15), and only then boxes the result with `valueOf` (offset 22). If `get` returns `null`, offset 15 throws.",
            "**`Map<Long, String>.get(int)` boxes to `Integer`.** `Map.get` takes `Object` (the API predates generics and was never narrowed), so the `int` is boxed with the only boxing conversion an `int` has: `Integer.valueOf` (offset 2). The `HashMap` then compares an `Integer` key against `Long` keys with `equals`, which is never `true`. No warning: it's a legal call.",
            "**`charge(fare)` chose `charge(long)`.** The bytecode is `i2l` (widen `int` to `long`) and a call to `charge:(J)V`. `charge(Integer)` would need boxing, which is only considered in phase 2, and phase 1 already found a match. The choice is fixed at compile time; the JVM just calls the method named in the class file.",
          ],
        },
      ],
    },
    {
      title: "Equality Across Wrapper Types",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "CrossTypeEquals.java",
          code: `import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class CrossTypeEquals {
    public static void main(String[] args) {
        Long id = 7L;
        System.out.println("Long(7).equals(7)    " + id.equals(7));          // 7 boxes to Integer
        System.out.println("Long(7).equals(7L)   " + id.equals(7L));
        System.out.println("Long(7) == 7         " + (id == 7));             // unboxes: numeric compare
        System.out.println("Integer(7).equals(Long(7)) " + Integer.valueOf(7).equals(7L));
        System.out.println("hashCodes " + Integer.valueOf(7).hashCode() + " " + Long.valueOf(7).hashCode());

        Map<Long, String> drivers = new HashMap<>();
        drivers.put(7L, "Ravi");
        int fromRequest = 7;
        System.out.println("get(int 7)  " + drivers.get(fromRequest));             // compiles: get(Object)
        System.out.println("get(7L)     " + drivers.get((long) fromRequest));

        Set<Short> codes = new HashSet<>();
        for (short s = 0; s < 5; s++) {
            codes.add(s);
            codes.remove(s - 1);                       // s - 1 is an int: removes nothing
        }
        System.out.println("Set<Short> after remove(s - 1): " + codes);
    }
}`,
        },
        {
          type: "output",
          text: `Long(7).equals(7)    false
Long(7).equals(7L)   true
Long(7) == 7         true
Integer(7).equals(Long(7)) false
hashCodes 7 7
get(int 7)  null
get(7L)     Ravi
Set<Short> after remove(s - 1): [0, 1, 2, 3, 4]`,
        },
        {
          type: "list",
          items: [
            "`id.equals(7)`: `equals` takes `Object`, so the literal 7 is boxed to `Integer`, and `Long.equals` returns `false` for anything that isn't a `Long`. `id.equals(7L)` is `true`.",
            "`id == 7` is `true`: one operand is a primitive, so the `Long` is unboxed and compared numerically. The same `==` that compares references between two wrappers compares values here.",
            "The two objects even have the **same hash code** (7), so a `HashMap` finds the right bucket and still says \"not equal\". The equality check, not the hashing, rejects it.",
            "`drivers.get(fromRequest)` with an `int` returned `null` for a key that's there. With `(long) fromRequest`, boxing produces a `Long` and the lookup works.",
            "The last one is from *Java Puzzlers*: `s - 1` with a `short` is an `int` expression (arithmetic promotes to `int`), so `remove` gets an `Integer`, which never equals a `Short`. Nothing is removed, and the set ends with all five elements instead of one.",
          ],
        },
        {
          type: "paragraph",
          text: "The general rule: **wrappers are equal only to the same wrapper type**, and collection methods that take `Object` won't catch a type mismatch. The fix is to keep key types consistent across the code (one ID type, used everywhere), and to convert at the boundary, not at each lookup.",
        },
      ],
    },
    {
      title: "The Ternary Operator Trap",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "TernaryNpe.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class TernaryNpe {
    public static void main(String[] args) {
        Map<String, Integer> surgePercent = new HashMap<>();
        surgePercent.put("SALT-LAKE", 20);
        boolean peak = true;

        Integer ok = peak ? surgePercent.get("SALT-LAKE") : 0;
        System.out.println("SALT-LAKE " + ok);

        try {
            Integer boom = peak ? surgePercent.get("NEW-TOWN") : 0;      // Integer : int  -> int
            System.out.println("NEW-TOWN " + boom);
        } catch (NullPointerException e) {
            System.out.println("NullPointerException: " + e.getMessage());
        }

        Integer fixed = peak ? surgePercent.get("NEW-TOWN") : Integer.valueOf(0);   // Integer : Integer
        System.out.println("NEW-TOWN fixed " + fixed);
        Integer clearer = surgePercent.getOrDefault("NEW-TOWN", 0);
        System.out.println("NEW-TOWN getOrDefault " + clearer);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -g TernaryNpe.java && java TernaryNpe",
        },
        {
          type: "output",
          text: `SALT-LAKE 20
NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
NEW-TOWN fixed null
NEW-TOWN getOrDefault 0`,
        },
        {
          type: "list",
          items: [
            "Both sides of the assignment are `Integer`, and `null` would be a perfectly valid `Integer`. The `NullPointerException` comes from the conditional's own type: `Integer` and `int` operands make it an `int` expression, so `javac` unboxes the `get` result, as the bytecode showed. The variable on the left plays no part in that decision.",
            "Making both operands `Integer` (`Integer.valueOf(0)`) makes the conditional an `Integer` expression with no unboxing, so the result is `null`, not an exception. Whether `null` is the right answer is another question: here the intended default was 0, and `fixed` is `null`.",
            "`getOrDefault(key, 0)` says what was meant and returns 0. Most of these ternaries are trying to write `getOrDefault`, `Optional.orElse` or `Objects.requireNonNullElse`.",
            "The same trap appears with `return cond ? someInteger : 0;` in a method returning `Integer`, and with `switch` expressions that mix `Integer` and `int` results.",
            "A detail of the rule: it's about an operand whose **type** is `Integer`. `true ? null : 0` with the literal `null` doesn't throw, because the `null` literal and an `int` give the conditional the type `Integer`. `Integer n = null; true ? n : 0` does throw. I checked both on JDK 21.",
          ],
        },
      ],
    },
    {
      title: "Overloading, Boxing and List.remove",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Overloads.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Overloads {
    static void charge(long paise) { System.out.println("charge(long)    " + paise); }
    static void charge(Integer paise) { System.out.println("charge(Integer) " + paise); }
    static void charge(Object paise) { System.out.println("charge(Object)  " + paise); }
    static void charge(int... paise) { System.out.println("charge(int...)  " + paise.length + " values"); }

    static void log(Object o) { System.out.println("log(Object) " + o.getClass().getSimpleName()); }
    static void log(double d) { System.out.println("log(double) " + d); }

    public static void main(String[] args) {
        int fare = 14_500;
        charge(fare);                         // widening int -> long beats boxing
        charge(Integer.valueOf(fare));        // exact match
        charge("free");                       // only Object fits
        charge();                             // only varargs fits
        log('A');                             // char widens to double before boxing
        log(10L);

        List<Integer> fares = new ArrayList<>(List.of(10, 20, 30, 40));
        fares.remove(1);                      // remove(int index)
        System.out.println("after remove(1):                 " + fares);
        fares.remove(Integer.valueOf(30));    // remove(Object)
        System.out.println("after remove(Integer.valueOf(30)): " + fares);
    }
}`,
        },
        {
          type: "output",
          text: `charge(long)    14500
charge(Integer) 14500
charge(Object)  free
charge(int...)  0 values
log(double) 65.0
log(double) 10.0
after remove(1):                 [10, 30, 40]
after remove(Integer.valueOf(30)): [10, 40]`,
        },
        {
          type: "list",
          items: [
            "**Phase 1, no boxing:** `charge(fare)` with an `int` matches `charge(long)` by widening, so `charge(Integer)` isn't even considered. If someone later removes `charge(long)`, the same call silently starts calling `charge(Integer)`, or `charge(Object)` if that's all that's left.",
            "**Phase 2, boxing allowed:** used only when phase 1 finds nothing. `charge(\"free\")` reaches `charge(Object)` through normal subtyping in phase 1.",
            "**Phase 3, varargs:** `charge()` with no arguments can only match `int...`.",
            "`log('A')` printed `log(double) 65.0`: `char` widens to `double` (phase 1) rather than boxing to `Character` and matching `Object` (phase 2). `log(10L)` likewise prefers `double`.",
            "**`List<Integer>.remove`** has two overloads: `remove(int index)` and `remove(Object o)`. With an `int` argument, phase 1 finds `remove(int)` without boxing, so `remove(1)` removed the element **at index 1** (20), not the value 1. Removing a value needs an `Integer` argument: `remove(Integer.valueOf(30))`. The same applies to `indexOf`-style code written for lists of IDs.",
          ],
        },
      ],
    },
    {
      title: "Double and Float: NaN, -0.0 and Precision",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "DoubleTraps.java",
          code: `import java.util.Arrays;

public class DoubleTraps {
    public static void main(String[] args) {
        double nan = 0.0 / 0.0;
        System.out.println("NaN == NaN                 " + (nan == nan));
        System.out.println("Double.valueOf(NaN).equals " + Double.valueOf(nan).equals(nan));
        System.out.println("0.0 == -0.0                " + (0.0 == -0.0));
        System.out.println("Double(0.0).equals(-0.0)   " + Double.valueOf(0.0).equals(-0.0));
        System.out.println("Double.compare(0.0, -0.0)  " + Double.compare(0.0, -0.0));
        System.out.println("NaN > 1, NaN < 1           " + (nan > 1) + " " + (nan < 1));
        System.out.println("0.1 + 0.2                  " + (0.1 + 0.2) + "  == 0.3? " + (0.1 + 0.2 == 0.3));
        System.out.println("Math.abs(0.1+0.2-0.3)<1e-9 " + (Math.abs(0.1 + 0.2 - 0.3) < 1e-9));

        Double[] ratings = {4.5, Double.NaN, -0.0, 0.0, 3.9};
        Arrays.sort(ratings);
        System.out.println("sorted Double[]            " + Arrays.toString(ratings));
        double[] raw = {4.5, Double.NaN, -0.0, 0.0, 3.9};
        Arrays.sort(raw);
        System.out.println("sorted double[]            " + Arrays.toString(raw));
    }
}`,
        },
        {
          type: "output",
          text: `NaN == NaN                 false
Double.valueOf(NaN).equals true
0.0 == -0.0                true
Double(0.0).equals(-0.0)   false
Double.compare(0.0, -0.0)  1
NaN > 1, NaN < 1           false false
0.1 + 0.2                  0.30000000000000004  == 0.3? false
Math.abs(0.1+0.2-0.3)<1e-9 true
sorted Double[]            [-0.0, 0.0, 3.9, 4.5, NaN]
sorted double[]            [-0.0, 0.0, 3.9, 4.5, NaN]`,
        },
        {
          type: "list",
          items: [
            "**`==` on primitives follows IEEE 754:** `NaN` is not equal to anything, including itself, and every comparison with it is `false` (so `NaN > 1` and `NaN < 1` are both `false`). `0.0` and `-0.0` are equal.",
            "**`Double.equals` and `Double.compare` compare bit patterns** (`doubleToLongBits`): `NaN` equals `NaN`, and `0.0` doesn't equal `-0.0`, with `-0.0` ordered first. They have to: `equals` must be reflexive for `Double` to work as a `HashMap` key, and `compareTo` must be a total order for sorting.",
            "So **`==` and `equals` disagree** for doubles, in both directions. That's why `Double d = ...; d == otherDouble` and `d.equals(other)` can give different answers even beyond the identity problem.",
            "Sorting uses `Double.compare` for both `Double[]` and `double[]`: `-0.0` before `0.0`, `NaN` last. A hand-written comparator that uses `<` gets an inconsistent order with `NaN` in the data, the \"violates its general contract\" crash from the Arrays lessons.",
            "**`0.1 + 0.2` isn't `0.3`.** 0.1 has no exact binary representation, so doubles carry tiny errors. Compare with a tolerance (`Math.abs(a - b) < epsilon`) for measurements, and don't use `double` at all where exact decimals matter, which is money.",
          ],
        },
      ],
    },
    {
      title: "Money: BigDecimal and long",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Money.java",
          code: `import java.math.BigDecimal;
import java.math.RoundingMode;

public class Money {
    public static void main(String[] args) {
        double total = 0;
        for (int i = 0; i < 10; i++) total += 0.10;                         // ten 10-paise coins
        System.out.println("double sum of 10 x 0.10   " + total + "  == 1.0? " + (total == 1.0));

        System.out.println("new BigDecimal(0.1)       " + new BigDecimal(0.1));
        System.out.println("BigDecimal.valueOf(0.1)   " + BigDecimal.valueOf(0.1));
        System.out.println("new BigDecimal(\\"0.1\\")     " + new BigDecimal("0.1"));

        BigDecimal sum = BigDecimal.ZERO;
        for (int i = 0; i < 10; i++) sum = sum.add(new BigDecimal("0.10"));
        System.out.println("BigDecimal sum            " + sum + "  equals 1? " + sum.equals(BigDecimal.ONE)
                + "  compareTo == 0? " + (sum.compareTo(BigDecimal.ONE) == 0));

        BigDecimal fare = new BigDecimal("145.00");
        BigDecimal gst = fare.multiply(new BigDecimal("0.05"));                 // 5% GST
        System.out.println("GST raw                   " + gst + "  rounded " + gst.setScale(2, RoundingMode.HALF_EVEN));
        BigDecimal split = new BigDecimal("100.00");
        try {
            split.divide(new BigDecimal("3"));
        } catch (ArithmeticException e) {
            System.out.println("100/3                     " + e.getMessage());
        }
        System.out.println("100/3 to 2 places         " + split.divide(new BigDecimal("3"), 2, RoundingMode.HALF_EVEN));

        long paise = 14_500;                                                   // or: whole paise in a long
        System.out.println("paise as long             " + paise + " = Rs " + paise / 100 + "." + String.format("%02d", paise % 100));
    }
}`,
        },
        {
          type: "output",
          text: `double sum of 10 x 0.10   0.9999999999999999  == 1.0? false
new BigDecimal(0.1)       0.1000000000000000055511151231257827021181583404541015625
BigDecimal.valueOf(0.1)   0.1
new BigDecimal("0.1")     0.1
BigDecimal sum            1.00  equals 1? false  compareTo == 0? true
GST raw                   7.2500  rounded 7.25
100/3                     Non-terminating decimal expansion; no exact representable decimal result.
100/3 to 2 places         33.33
paise as long             14500 = Rs 145.00`,
        },
        {
          type: "list",
          items: [
            "**Ten 10-paise coins in a `double` aren't one rupee.** The error is tiny, but `== 1.0` is `false`, totals drift over millions of transactions, and rounding at different points gives different paise.",
            "**`new BigDecimal(0.1)` is exact, and that's the problem:** it captures the binary approximation of 0.1 exactly, all 55 digits of it. `BigDecimal.valueOf(0.1)` goes through `Double.toString`, giving `0.1`. Best of all, create money from strings (`new BigDecimal(\"0.1\")`) or integers, never from a `double` that has already lost precision.",
            "**`BigDecimal.equals` compares scale:** `1.00` and `1` are different (`equals` is `false`) but numerically equal (`compareTo` is 0). Use `compareTo` for value comparisons; `equals` only matters (and only works) when scales are normalised, which is why a `HashSet<BigDecimal>` can contain both `1.0` and `1.00`.",
            "**Division needs a scale and a rounding mode.** 100/3 has no exact decimal result, and `divide` without them throws `ArithmeticException`. Always pass both, and choose the rounding mode deliberately: `HALF_EVEN` (banker's rounding) avoids bias over many operations; tax rules sometimes require `HALF_UP`.",
            "**Whole paise in a `long`** is the simplest exact representation: integer arithmetic, no boxing, no rounding until display. It's what this course's ride-hailing examples have used for fares (`farePaise`). `BigDecimal` is the better fit when amounts need fractional paise during calculation (interest, currency conversion) or arbitrary precision.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `Integer boom = peak ? surgePercent.get(\"NEW-TOWN\") : 0;` from `TernaryNpe`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Type the operands.** `surgePercent.get(\"NEW-TOWN\")` has type `Integer` (from `Map<String, Integer>`). `0` has type `int`.",
            "**Type the conditional (JLS 15.25).** One operand is `Integer`, the other `int`: both are convertible to numeric types, so this is a **numeric conditional expression**, and its type is `int` after unboxing. The target type `Integer` on the left doesn't change that.",
            "**Emit the true branch.** Call `Map.get`, `checkcast Integer` (erasure), then `invokevirtual Integer.intValue()` to produce the `int`.",
            "**Emit the false branch.** `iconst_0`.",
            "**Emit the assignment.** The conditional's `int` result must go into an `Integer` variable: `invokestatic Integer.valueOf`.",
            "**Run with `peak = true`.** `HashMap.get(\"NEW-TOWN\")` hashes the string, finds no entry and returns `null`. `checkcast` lets `null` through (it's a valid reference of any type). `intValue()` is invoked on `null`: `NullPointerException`, whose helpful message names `intValue()` and `Map.get(Object)`.",
            "**With `Integer.valueOf(0)` as the false branch,** both operands are `Integer`, the conditional is a reference conditional of type `Integer`, no `intValue()` is emitted, and `boom` would simply be `null`.",
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
          title: "TrapsTour.java",
          code: `import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class TrapsTour {
    public static void main(String[] args) {
        // 1. comparing wrappers safely
        Integer a = 1000, b = 1000, none = null;
        System.out.println(a.equals(b) + " " + Objects.equals(a, b) + " " + Objects.equals(none, a)
                + " " + (a.intValue() == b.intValue()) + " " + Integer.compare(a, b));

        // 2. same value, different wrapper type
        Long l = 1000L;
        System.out.println(l.equals(1000) + " " + l.equals(1000L) + " " + (l.longValue() == a.intValue()));

        // 3. null-safe unboxing
        Integer maybe = null;
        int value = Objects.requireNonNullElse(maybe, 0);
        System.out.println(value + " " + (maybe != null && maybe > 3));

        // 4. List<Integer>.remove: index vs value
        List<Integer> xs = new ArrayList<>(List.of(5, 6, 7));
        xs.remove(0);
        xs.remove(Integer.valueOf(7));
        System.out.println(xs);

        // 5. doubles: compare, NaN, tolerance
        System.out.println(Double.compare(0.1 + 0.2, 0.3) + " " + Double.isNaN(Math.sqrt(-1)) + " "
                + (Math.abs((0.1 + 0.2) - 0.3) < 1e-9));

        // 6. money: BigDecimal from strings, compareTo, explicit rounding
        BigDecimal fare = new BigDecimal("145.50");
        BigDecimal tip = new BigDecimal("10.5");
        BigDecimal total = fare.add(tip);
        System.out.println(total + " " + total.compareTo(new BigDecimal("156.0")) + " "
                + total.multiply(new BigDecimal("0.18")).setScale(2, RoundingMode.HALF_UP));
    }
}`,
        },
        {
          type: "output",
          text: `true true false true 0
false true true
0 false
[6]
1 true true
156.00 0 28.08`,
        },
        {
          type: "paragraph",
          text: "`maybe != null && maybe > 3` is the safe pattern for a nullable comparison: `&&` short-circuits before the unboxing. `Objects.requireNonNullElse(maybe, 0)` (Java 9) replaces the `cond ? x : 0` ternaries that cause the NPE above. `BigDecimal` keeps the larger scale on addition, so `145.50 + 10.5` is `156.00`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Comparing numbers of different types by value",
        },
        {
          type: "code",
          language: "java",
          title: "CompareNumbers.java",
          code: `import java.math.BigDecimal;
import java.util.List;

public class CompareNumbers {
    // Value equality across Integer, Long, Double, BigDecimal... (NaN and infinities rejected)
    static boolean sameValue(Number x, Number y) {
        if (x == null || y == null) return x == y;
        return toDecimal(x).compareTo(toDecimal(y)) == 0;
    }

    static BigDecimal toDecimal(Number n) {
        if (n instanceof BigDecimal bd) return bd;
        if (n instanceof Integer || n instanceof Long || n instanceof Short || n instanceof Byte) {
            return BigDecimal.valueOf(n.longValue());
        }
        return new BigDecimal(n.toString());                 // Double/Float: their shortest decimal form
    }

    public static void main(String[] args) {
        List<Number[]> pairs = List.of(
                new Number[] {7L, 7}, new Number[] {7, 7.0}, new Number[] {new BigDecimal("2.50"), 2.5},
                new Number[] {0.1 + 0.2, 0.3}, new Number[] {null, null}, new Number[] {1, null});
        for (Number[] p : pairs) {
            System.out.printf("%-20s %-6s equals=%-5b sameValue=%b%n", p[0], p[1],
                    p[0] != null && p[0].equals(p[1]), sameValue(p[0], p[1]));
        }
    }
}`,
        },
        {
          type: "output",
          text: `7                    7      equals=false sameValue=true
7                    7.0    equals=false sameValue=true
2.50                 2.5    equals=false sameValue=true
0.30000000000000004  0.3    equals=false sameValue=false
null                 null   equals=false sameValue=true
1                    null   equals=false sameValue=false`,
        },
        {
          type: "paragraph",
          text: "When values of mixed `Number` types really must be compared (a generic rules engine, JSON numbers that may be parsed as `Integer`, `Long` or `Double`), converting both to `BigDecimal` and using `compareTo` compares the values exactly. `equals` was `false` for every pair. `0.1 + 0.2` still isn't `0.3`, correctly: the double holds a different number. The `toDecimal` for `Double` uses `toString`, the same as `BigDecimal.valueOf`, and `new BigDecimal(\"NaN\")` would throw, which is why `NaN` is excluded.",
        },
        {
          type: "heading",
          text: "Example 2: A small Money type on long paise",
        },
        {
          type: "code",
          language: "java",
          title: "MoneyType.java",
          code: `import java.util.List;

public class MoneyType {
    // Money as whole paise in a long: exact, fast, no boxing in arithmetic
    record Money(long paise) implements Comparable<Money> {
        static Money rupees(String amount) {
            return new Money(new java.math.BigDecimal(amount).movePointRight(2).longValueExact());
        }
        Money plus(Money other) { return new Money(Math.addExact(paise, other.paise)); }
        Money percent(int pct) { return new Money(Math.round(paise * pct / 100.0)); }
        public int compareTo(Money o) { return Long.compare(paise, o.paise); }
        @Override public String toString() {
            long abs = Math.abs(paise);
            return String.format("%sRs %d.%02d", paise < 0 ? "-" : "", abs / 100, abs % 100);
        }
    }

    public static void main(String[] args) {
        Money fare = Money.rupees("145.50");
        Money gst = fare.percent(5);
        Money total = fare.plus(gst);
        System.out.println(fare + " + GST " + gst + " = " + total);

        Money sum = new Money(0);
        for (int i = 0; i < 10; i++) sum = sum.plus(Money.rupees("0.10"));
        System.out.println("ten 0.10s = " + sum + ", equals Rs 1.00? " + sum.equals(Money.rupees("1.00")));
        System.out.println(List.of(Money.rupees("99.99"), Money.rupees("10"), Money.rupees("250")).stream().sorted().toList());
        System.out.println("refund " + new Money(-50));
        try {
            Money.rupees("1.005");
        } catch (ArithmeticException e) {
            System.out.println("1.005 rupees: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Rs 145.50 + GST Rs 7.28 = Rs 152.78
ten 0.10s = Rs 1.00, equals Rs 1.00? true
[Rs 10.00, Rs 99.99, Rs 250.00]
refund -Rs 0.50
1.005 rupees: Rounding necessary`,
        },
        {
          type: "list",
          items: [
            "A `record` around a `long` gives exact arithmetic, value-based `equals` (Rs 1.00 equals Rs 1.00, unlike `BigDecimal` with different scales), and no boxing in calculations.",
            "Parsing goes through `BigDecimal` once, at the boundary: `movePointRight(2).longValueExact()` turns `\"145.50\"` into 14550 and **throws** for `\"1.005\"`, which has fractional paise, instead of silently rounding.",
            "`Math.addExact` throws on overflow instead of wrapping. `percent` rounds with `Math.round` (half up): 5% of Rs 145.50 is 727.5 paise, rounded to Rs 7.28. Whether to round half up or half even is a business rule, so it belongs in one named method, like here, not scattered across services.",
            "`toString` handles negative amounts explicitly; an earlier draft of this example printed a 50-paise refund as `Rs 0.50`, which is why it's worth a test.",
          ],
        },
      ],
    },
    {
      title: "When to Use What",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["Compare two wrapper values of the same type", "`a.equals(b)`, `Objects.equals(a, b)`", "`a == b`"],
            ["Compare numbers that may be different types", "Convert to one primitive type, or `BigDecimal.compareTo`", "`equals` across types"],
            ["Map/set keys", "One key type used consistently (`Long` everywhere, or a record `DriverId`)", "Looking up with whatever numeric type is at hand"],
            ["Default for a missing value", "`getOrDefault`, `Objects.requireNonNullElse`, `Optional.orElse`", "`cond ? wrapper : 0`"],
            ["Remove a value from `List<Integer>`", "`remove(Integer.valueOf(v))`, or `removeIf(x -> x == v)`", "`remove(v)` with an `int`"],
            ["Compare doubles", "`Double.compare`, or a tolerance for computed values", "`==` on computed values; `<` in comparators"],
            ["Money", "`long` minor units, or `BigDecimal` from strings with explicit rounding", "`double`, `new BigDecimal(double)`, `BigDecimal.equals`"],
            ["Accumulators and counters in loops", "`long`, `int[]`, `LongAdder`", "`Long sum`, `Map<K, Integer>` in hot paths"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Looking up a Map<Long, V> with an int",
        },
        {
          type: "paragraph",
          text: "`map.get(intId)` boxes to `Integer` and never matches a `Long` key. It compiles without a warning even under `-Xlint:all`. The production section shows a cache with a 0% hit rate because of it. IntelliJ's \"Suspicious collections method call\" inspection and Error Prone's `CollectionIncompatibleType` catch it.",
        },
        {
          type: "heading",
          text: "Mixing Integer and int in a ternary",
        },
        {
          type: "paragraph",
          text: "`Integer x = cond ? maybeNull : 0;` unboxes `maybeNull`. Use `getOrDefault`/`requireNonNullElse`, or make both operands `Integer`.",
        },
        {
          type: "heading",
          text: "Calling remove(int) on a List<Integer>",
        },
        {
          type: "paragraph",
          text: "`ids.remove(driverId)` with an `int` removes by **index**: it either deletes the wrong element or throws `IndexOutOfBoundsException` for large IDs. Use `remove(Integer.valueOf(driverId))` or `removeIf`.",
        },
        {
          type: "heading",
          text: "Relying on overload choice when boxing is involved",
        },
        {
          type: "paragraph",
          text: "Overloads that differ by `long` vs `Long`, or `int` vs `Object`, change behaviour when an argument's type changes or an overload is removed. Prefer distinct method names for different meanings.",
        },
        {
          type: "heading",
          text: "Using double for money, or new BigDecimal(double)",
        },
        {
          type: "paragraph",
          text: "`double` can't represent most decimal fractions exactly, and `new BigDecimal(0.1)` faithfully preserves the error. Use `long` minor units or `BigDecimal` built from strings, with explicit scale and rounding.",
        },
        {
          type: "heading",
          text: "Comparing BigDecimal with equals",
        },
        {
          type: "paragraph",
          text: "`new BigDecimal(\"1.0\").equals(new BigDecimal(\"1.00\"))` is `false`. Use `compareTo(...) == 0`, or normalise scale with `setScale` before using `equals`/`hashCode` (for example, as map keys).",
        },
        {
          type: "heading",
          text: "Writing comparators or equality with == on doubles",
        },
        {
          type: "paragraph",
          text: "`NaN` breaks `<`-based comparators, and computed doubles rarely compare equal with `==`. Use `Double.compare` for ordering and a tolerance for computed equality.",
        },
        {
          type: "heading",
          text: "Accumulating into a wrapper",
        },
        {
          type: "paragraph",
          text: "`Long total = 0L; for (...) total += x;` creates a new `Long` on almost every iteration. Use `long`. The Performance section measures 1.2 GB of garbage for 100 million iterations.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Choose one numeric type per concept (all IDs are `long`/`Long`, all money is `long` paise) and convert only at system boundaries.",
            "Wrap important IDs in records (`record DriverId(long value)`): the compiler then rejects `Map<DriverId, V>.get(42)`-style mistakes at the type level.",
            "Never compare wrappers with `==`; use `equals`, `Objects.equals`, or primitives.",
            "Replace `cond ? wrapper : primitive` with `getOrDefault`, `requireNonNullElse` or `Optional`.",
            "Be explicit with `List<Integer>.remove`: `Integer.valueOf(v)` for values, an `int` only for indexes.",
            "Use `Double.compare` and `Comparator.comparingDouble` for ordering; never `==` on computed doubles.",
            "Represent money exactly: `long` minor units or `BigDecimal` from strings, `compareTo` for comparisons, explicit `RoundingMode` everywhere, one place that defines the rounding rule.",
            "Keep accumulators, counters and hot-loop variables primitive; use `int[]`/`long[]` or primitive-specialised collections for large numeric maps.",
            "Enable static analysis that understands these traps: Error Prone (`CollectionIncompatibleType`, `ReferenceEquality`, `BoxedPrimitiveEquality`) or the equivalent IntelliJ/SonarQube inspections.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Two classic boxing costs: a `Long` accumulator (from *Effective Java*, item 6), and counting with a `HashMap<Integer, Integer>` where an array would do. Best of five runs each, with the bytes allocated by the last run:",
        },
        {
          type: "code",
          language: "java",
          title: "BoxedLoop.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.HashMap;
import java.util.Map;
import java.util.function.LongSupplier;

public class BoxedLoop {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();

    static long boxedSum(int n) {
        Long sum = 0L;                               // one capital letter
        for (int i = 0; i < n; i++) sum += i;
        return sum;
    }

    static long primitiveSum(int n) {
        long sum = 0L;
        for (int i = 0; i < n; i++) sum += i;
        return sum;
    }

    static void report(String label, LongSupplier work) {
        long best = Long.MAX_VALUE, bytes = 0, result = 0;
        for (int r = 0; r < 5; r++) {
            long a = MX.getCurrentThreadAllocatedBytes();
            long t = System.nanoTime();
            result = work.getAsLong();
            best = Math.min(best, System.nanoTime() - t);
            bytes = MX.getCurrentThreadAllocatedBytes() - a;
        }
        System.out.printf("%-30s %5d ms  %,14d bytes  (result %d)%n", label, best / 1_000_000, bytes, result);
    }

    public static void main(String[] args) {
        int n = 100_000_000;
        report("Long sum += i", () -> boxedSum(n));
        report("long sum += i", () -> primitiveSum(n));

        int[] zones = new int[20_000_000];
        for (int i = 0; i < zones.length; i++) zones[i] = (i * 31) % 500;
        report("HashMap<Integer,Integer>.merge", () -> {
            Map<Integer, Integer> counts = new HashMap<>();
            for (int z : zones) counts.merge(z, 1, Integer::sum);
            return counts.get(7);
        });
        report("int[500] counts[z]++", () -> {
            int[] counts = new int[500];
            for (int z : zones) counts[z]++;
            return counts[7];
        });
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx1g BoxedLoop",
        },
        {
          type: "output",
          text: `Long sum += i                    130 ms   1,199,999,808 bytes  (result 4999999950000000)
long sum += i                     29 ms               0 bytes  (result 4999999950000000)
HashMap<Integer,Integer>.merge   272 ms     557,088,288 bytes  (result 40000)
int[500] counts[z]++              10 ms           2,016 bytes  (result 40000)`,
        },
        {
          type: "list",
          items: [
            "**One capital letter, 1.2 GB of garbage.** `Long sum` made the loop allocate about 1.2 GB for 100 million iterations: one 24-byte `Long` per two iterations. The JIT's escape analysis removed about half of the boxes (most likely the ones between two unrolled iterations, which never escape), but not the rest, and the loop was 4.5 times slower than with `long` (130 against 29 ms). The `long` version allocated nothing.",
            "**Counting with a boxed map: 27 times slower.** 20 million `merge` calls on a `HashMap<Integer, Integer>` took 272 ms and allocated 557 MB: every count above 127 is a new `Integer` per increment, plus `Integer` keys for zones above 127. The `int[500]` indexed by zone did the same work in 10 ms with 2 KB, because zones are small integers. When keys are dense small integers, an array is the right map.",
            "Results are identical in both pairs, so these are pure refactorings.",
            "The allocation is the expensive part beyond the loop itself: young-generation GCs, cache pollution, and in a real service, competing with request traffic. Profilers show it as `Long.valueOf`/`Integer.valueOf` in the allocation view.",
            "These are single-process `System.nanoTime` measurements, not JMH; the ratios were the point, and they were stable.",
          ],
        },
      ],
    },
    {
      title: "Wrapper Traps in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend caches driver profiles in memory, keyed by driver ID. The `Driver` entity uses `long id`, so the cache is a `Map<Long, Driver>`. The trip-acceptance handler was written against an older API model where the driver ID was an `int`, and it looks the driver up with that `int`. Everything is functionally correct, because a miss falls back to the database. The symptom was in metrics: the driver database's read load matched request volume exactly, and the cache's hit rate was 0%, although the cache was full.",
        },
        {
          type: "code",
          language: "java",
          title: "DriverCache.java",
          code: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class DriverCache {
    record Driver(long id, String name) { }

    // Stands in for the database: counts how often it is hit
    static final AtomicLong DB_CALLS = new AtomicLong();
    static Driver loadFromDb(long id) {
        DB_CALLS.incrementAndGet();
        return new Driver(id, "driver-" + id);
    }

    // The cache: keyed by Long, because the entity id is a Long
    static final Map<Long, Driver> CACHE = new ConcurrentHashMap<>();

    // What shipped: the request handler has the id as an int (from an older API model)
    static Driver lookupBuggy(int driverId) {
        Driver d = CACHE.get(driverId);                    // get(Object): boxes to Integer, never equals a Long
        if (d == null) {
            d = loadFromDb(driverId);
            CACHE.put(d.id(), d);                          // stored under a Long
        }
        return d;
    }

    static Driver lookupFixed(long driverId) {
        return CACHE.computeIfAbsent(driverId, DriverCache::loadFromDb);   // the key type is checked here
    }

    public static void main(String[] args) {
        int[] requests = new int[100_000];
        for (int i = 0; i < requests.length; i++) requests[i] = 104_000 + (i % 200);   // 200 hot drivers

        for (int id : requests) lookupBuggy(id);
        System.out.printf("buggy: %,d lookups, %,d DB calls, cache size %d%n", requests.length, DB_CALLS.get(), CACHE.size());

        CACHE.clear();
        DB_CALLS.set(0);
        for (int id : requests) lookupFixed(id);
        System.out.printf("fixed: %,d lookups, %,d DB calls, cache size %d%n", requests.length, DB_CALLS.get(), CACHE.size());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -Xlint:all DriverCache.java      # no warnings at all
java DriverCache`,
        },
        {
          type: "output",
          text: `buggy: 100,000 lookups, 100,000 DB calls, cache size 200
fixed: 100,000 lookups, 200 DB calls, cache size 200`,
        },
        {
          type: "list",
          items: [
            "**Every lookup missed.** `CACHE.get(driverId)` boxed the `int` to an `Integer`; the keys were `Long`s from `d.id()`. Same hash codes, never `equals`. The cache filled up with exactly the 200 drivers and was never read successfully: 100,000 lookups, 100,000 database calls.",
            "**Why it was invisible.** Results were correct, because the fallback loaded the right driver. Latency was only somewhat worse. The giveaway was operational: database load proportional to traffic, and a hit-rate metric of zero. Without a hit-rate metric, this kind of bug can live for years.",
            "**Why the compiler didn't help.** `Map.get` takes `Object` for compatibility with pre-generics code, so any key type compiles, and `javac -Xlint:all` gave no warning. `put` takes `K`, which is why the `put` line converted correctly to `Long`.",
            "**The fix.** Use the cache's key type at the call: `lookupFixed(long driverId)`, so the `int` is widened to `long` before boxing, and `computeIfAbsent(K key, ...)` makes the key type checked by the compiler. 200 database calls for 200 drivers.",
            "**Preventing the class of bug.** A `record DriverId(long value)` as the key type would have made `CACHE.get(intId)` impossible to write meaningfully. Static analysis (Error Prone `CollectionIncompatibleType`, IntelliJ's suspicious-call inspection) flags `get` with an incompatible type. And every cache should export a hit-rate metric, so a 0% cache is noticed on day one.",
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
              question: "Why does Long.valueOf(7).equals(7) return false?",
              answer:
                "`equals` takes `Object`, so the `int` 7 is autoboxed to an `Integer`, and `Long.equals` only returns `true` for another `Long` with the same value. An `Integer` is never equal to a `Long`, even with the same number and the same hash code. `Long.valueOf(7).equals(7L)` is `true`, and `Long.valueOf(7) == 7` is `true` because one operand is primitive, so it's a numeric comparison.",
            },
            {
              question: "What does list.remove(1) do on a List<Integer>?",
              answer:
                "It removes the element **at index 1**, not the value 1. `List` has `remove(int index)` and `remove(Object o)`, and overload resolution picks `remove(int)` for an `int` argument because it matches without boxing. To remove the value, pass an `Integer`: `list.remove(Integer.valueOf(1))`. In my test, `remove(1)` on `[10, 20, 30, 40]` removed 20.",
            },
            {
              question: "Why can't you compare 0.1 + 0.2 == 0.3?",
              answer:
                "Because `double` is binary floating point, and 0.1, 0.2 and 0.3 have no exact binary representation. `0.1 + 0.2` is `0.30000000000000004`, a different double from `0.3`. Compare computed doubles with a tolerance (`Math.abs(a - b) < 1e-9`), and use `BigDecimal` or integer minor units where decimal values must be exact.",
            },
            {
              question: "Why shouldn't you use double for money?",
              answer:
                "It can't represent most decimal amounts exactly, so errors accumulate and rounding becomes unpredictable: adding 0.10 ten times gave 0.9999999999999999, not 1.0. Use whole minor units in a `long` (paise, cents) or `BigDecimal` created from strings, with explicit scale and rounding mode.",
            },
            {
              question: "What's the difference between BigDecimal.equals and compareTo?",
              answer:
                "`equals` compares both the value and the scale, so `1.0` and `1.00` are not equal. `compareTo` compares only the numeric value, returning 0 for them. Use `compareTo(...) == 0` for value comparisons; in my test, a sum of `1.00` was `compareTo`-equal to `BigDecimal.ONE` but not `equals`.",
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
              question: "Why does Integer x = flag ? map.get(k) : 0; throw a NullPointerException?",
              answer:
                "Because the conditional expression has operands of type `Integer` and `int`, which makes it a numeric conditional of type `int` (JLS 15.25). `javac` unboxes `map.get(k)` with `intValue()` before the assignment, and if `get` returns `null`, that throws. The assignment target being `Integer` doesn't matter. `javap` showed `intValue()` on the `get` result and then `valueOf`. Fix with `map.getOrDefault(k, 0)` or `Integer.valueOf(0)` as the second operand.",
            },
            {
              question: "Given f(long) and f(Integer), which is called by f(5)?",
              answer:
                "`f(long)`. Overload resolution runs in phases: first without boxing or varargs (where `int` widens to `long`), then with boxing, then with varargs. A phase-1 match wins, so the boxing overload is never considered. The bytecode is `i2l` and a call to `f:(J)V`. Removing `f(long)` would silently change the call to `f(Integer)`.",
            },
            {
              question: "Why can a Map<Long, V> lookup with an int return null even though the key exists?",
              answer:
                "`Map.get` takes `Object`, so the `int` is boxed to an `Integer`, and an `Integer` never equals a `Long`. It compiles with no warning, even with `-Xlint:all`. Fix by converting to `long` first (`map.get((long) id)`), or better, by using one ID type consistently or a record key type. Static analysis (Error Prone `CollectionIncompatibleType`) detects it.",
            },
            {
              question: "How do NaN and -0.0 behave with == and equals?",
              answer:
                "With `==` on primitives, IEEE 754 rules apply: `NaN == NaN` is `false`, and `0.0 == -0.0` is `true`. `Double.equals` and `Double.compare` compare bit patterns: `NaN` equals `NaN`, and `0.0` doesn't equal `-0.0` (with `-0.0` ordered first). The bit-based versions exist so that `Double` works as a map key and sorts consistently; both `Arrays.sort` variants put `-0.0` before `0.0` and `NaN` last.",
            },
            {
              question: "Why is new BigDecimal(0.1) discouraged?",
              answer:
                "It converts the double's exact binary value, so `new BigDecimal(0.1)` is `0.1000000000000000055511151231257827021181583404541015625`. `BigDecimal.valueOf(0.1)` goes through `Double.toString` and gives `0.1`. Best is to never pass through a `double` at all: `new BigDecimal(\"0.1\")` from text, or `BigDecimal.valueOf(long, scale)` from integers.",
            },
            {
              question: "Why does BigDecimal.divide sometimes throw ArithmeticException?",
              answer:
                "Without a scale and rounding mode, `divide` must return the exact result, and results like 100/3 have no finite decimal representation: \"Non-terminating decimal expansion; no exact representable decimal result.\" Always use `divide(divisor, scale, RoundingMode)`, or a `MathContext`, and choose the rounding mode on purpose (`HALF_EVEN` to avoid systematic bias, or whatever the tax rule requires).",
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
              question: "Why do collection methods like get, contains and remove take Object instead of K or E?",
              answer:
                "Compatibility and a deliberate design choice when generics were added in Java 5: these methods only need `equals` to work, and objects of different types can legitimately be equal (a `List` can equal another `List` implementation). Narrowing them to `K` would have broken existing code. The cost is that type mismatches like `Map<Long, V>.get(Integer)` compile silently, which is why tools such as Error Prone add a dedicated check.",
            },
            {
              question: "Describe the three phases of overload resolution and how boxing fits in.",
              answer:
                "JLS 15.12.2: phase 1 considers only methods applicable by strict or loose invocation without boxing/unboxing or varargs (identity, widening primitives, subtyping); phase 2 allows boxing and unboxing; phase 3 allows variable arity. The first phase with any applicable method decides, and within it the most specific method wins. This guaranteed that adding autoboxing in Java 5 didn't change which method existing code called. It's also why `log('A')` chose `log(double)` over `log(Object)`.",
            },
            {
              question: "Why is a Long accumulator in a loop slow, and can the JIT fix it?",
              answer:
                "`sum += i` on a `Long` compiles to unbox, add, `Long.valueOf`, so each iteration may allocate a 24-byte `Long`. C2's escape analysis can remove boxes that never escape, and in my test it removed about half (1.2 GB allocated for 100 million iterations instead of 2.4 GB), but the loop was still 4.5x slower than with `long`. The optimisation depends on inlining and loop shape and isn't guaranteed, so the fix is the primitive type.",
            },
            {
              question: "Why does Double.equals compare bits instead of using ==?",
              answer:
                "To satisfy the `equals` and `hashCode` contracts. `equals` must be reflexive (`x.equals(x)`), but IEEE `NaN == NaN` is `false`, so a `Double` NaN key could never be found in a map. And `equals` must be consistent with `hashCode`; `0.0` and `-0.0` have different bits and therefore different hash codes, so they can't be `equals`. Comparing `doubleToLongBits` (which also normalises all NaN bit patterns to one) satisfies both, at the cost of disagreeing with `==`.",
            },
            {
              question: "How would you model money in a Java service, and why?",
              answer:
                "As whole minor units in a `long` wrapped in a value type (`record Money(long paise)`, or with a currency field) for most business logic: exact, fast, no boxing, value-based `equals`. Parsing goes through `BigDecimal` at the boundary with `longValueExact()` so fractional minor units fail loudly. Where calculations need more precision (interest, FX, pro-rating), `BigDecimal` with explicit `MathContext`/`RoundingMode`, comparing with `compareTo`, and rounding at defined points. Never `double`, never `new BigDecimal(double)`, and one place that owns the rounding rule.",
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
              question: "A cache keyed by Long shows a 0% hit rate, but it's full and the results are correct. What would you check?",
              answer:
                "Whether lookups use a different key type than inserts. `Map.get(Object)` with an `int` or `Integer` boxes to `Integer`, which never equals a `Long` key, while `put(K, V)` forces the right type, so the cache fills but every `get` misses and falls back to the source. `DriverCache` reproduces it: 100,000 lookups, 100,000 database calls.\n\nFix the call site's type (pass a `long`, or use `computeIfAbsent`, whose key parameter is typed), then make it impossible: a `record DriverId(long)` key type and Error Prone's `CollectionIncompatibleType`. Keep the hit-rate metric; it's what revealed the bug.",
            },
            {
              question: "A pricing service throws NullPointerException intermittently from the line Integer surge = isPeak ? surgeByZone.get(zone) : 0;. Nothing on that line looks nullable. Why intermittently, and how do you fix it?",
              answer:
                "The conditional mixes `Integer` and `int`, so it's an `int` expression and `get`'s result is unboxed. It only fails when `isPeak` is true **and** the zone has no surge entry, hence intermittent. The NPE message says `Cannot invoke \"java.lang.Integer.intValue()\" because the return value of \"java.util.Map.get(Object)\" is null`.\n\nFix with `int surge = isPeak ? surgeByZone.getOrDefault(zone, 0) : 0;`, which also makes the variable primitive. Then I'd search for other `? :` expressions mixing wrappers and primitives; IntelliJ flags \"possible NPE from unboxing\" in many of them.",
            },
            {
              question: "A cleanup job calls ids.remove(driverId) on a List<Integer> of driver IDs and sometimes throws IndexOutOfBoundsException, sometimes removes the wrong driver. What's happening?",
              answer:
                "`driverId` is an `int`, so `remove(int index)` is chosen over `remove(Object)` (no boxing needed in phase 1 of overload resolution). The ID is used as an index: large IDs throw `IndexOutOfBoundsException`, small IDs remove whatever driver happens to be at that position.\n\nFix with `ids.remove(Integer.valueOf(driverId))`, or `ids.removeIf(id -> id == driverId)` to remove all occurrences. If membership is what matters, a `Set<Integer>` (or a primitive set) avoids the ambiguity and the O(n) scan.",
            },
            {
              question: "Finance reports that daily totals computed by the service differ from the bank's by a few paise. The code sums fares as double. How would you fix it end to end?",
              answer:
                "Doubles can't represent paise amounts exactly, and rounding at different points (per trip, per day, on display) produces drift; ten 0.10s added to 0.9999999999999999 in my test. I'd change the money representation to whole paise in a `long` (or a `Money` record around it), convert at the API and database boundaries with `BigDecimal` and `longValueExact()`, store amounts as integer minor units or `DECIMAL` columns, and define rounding (mode and point) in one place, matching the bank's rules.\n\nThen I'd reconcile historical data by recomputing from source amounts, and add a test that sums thousands of realistic fares and compares against an exact `BigDecimal` reference.",
            },
            {
              question: "A deduplication step uses a HashSet<BigDecimal> of amounts and lets through duplicates like 100.0 and 100.00. Why, and what's the fix?",
              answer:
                "`BigDecimal.equals` and `hashCode` include the scale, so `100.0` and `100.00` are different keys. Fix by normalising before inserting, for example `amount.setScale(2, RoundingMode.UNNECESSARY)` for money with two decimals (which also throws if an amount has more precision than expected), or `stripTrailingZeros()` for arbitrary values. Alternatively, use a `TreeSet<BigDecimal>`, which uses `compareTo` and treats them as equal. For money, converting to `long` minor units avoids the issue entirely.",
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
            "Create `Map<Long, String> m = new HashMap<>(); m.put(1L, \"a\");` and print `m.get(1)`, `m.get(1L)` and `m.containsKey(1)`.",
            "Write `Integer n = null; Integer x = true ? n : 0;` and run it. Then try `Integer y = true ? null : 0;` with the literal `null`.",
            "Write overloads `void f(long x)`, `void f(Integer x)` and `void f(Object x)`, and call `f(1)`, `f('a')` and `f(1.5)`. Predict each before running.",
            "Make `List<Integer> l = new ArrayList<>(List.of(3, 2, 1));`, call `l.remove(1)` and `l.remove(Integer.valueOf(1))`, printing after each.",
            "Print `Double.NaN == Double.NaN`, `Double.valueOf(Double.NaN).equals(Double.NaN)`, and the result of sorting `new double[] {Double.NaN, -1, -0.0, 0.0}`.",
            "Print `new BigDecimal(\"2.50\").equals(new BigDecimal(\"2.5\"))`, the `compareTo` of the same pair, and `new BigDecimal(\"10\").divide(new BigDecimal(\"4\"))`.",
            "Time a loop summing 50 million `int`s into a `Long` and into a `long`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `null`, `a`, `false`. Step 2 throws `NullPointerException` for `n` (an `Integer` and an `int` make the conditional an `int`, so `n` is unboxed), but prints `null` for the literal: the `null` literal and an `int` give the conditional type `Integer` (JLS 15.25), so nothing is unboxed. Step 3 prints `f(long)` for `1` and for `'a'` (both widen), and `f(Object)` for `1.5` (a `double` can't widen to `long`, so phase 2 boxes it to `Double`, which only `Object` accepts). Step 4 prints `[3, 1]` (index 1 removed), then `[3]`. Step 5 prints `false`, `true`, and `[-1.0, -0.0, 0.0, NaN]`. Step 6 prints `false`, `0`, and `2.5` (exact, so no exception). Step 7 shows the `Long` loop several times slower, with gigabytes allocated if measured.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `EQUALITY   wrapper == wrapper   -> references (true only by cache luck)
           wrapper == primitive -> unbox + numeric compare
           Long.equals(Integer) -> ALWAYS false (same hash, different class)
           Map<Long,V>.get(int) -> boxes to Integer -> null, no warning

TERNARY    cond ? Integer : int  -> type int -> Integer is UNBOXED
           -> NPE if null; use getOrDefault / requireNonNullElse

OVERLOADS  phase 1: widening/subtyping   (int -> long wins)
           phase 2: boxing               phase 3: varargs
           List<Integer>.remove(1) -> INDEX; remove(Integer.valueOf(1)) -> value

DOUBLE     ==: NaN != NaN, 0.0 == -0.0
           equals/compare: bits -> NaN equals NaN, 0.0 != -0.0
           0.1 + 0.2 = 0.30000000000000004 -> tolerance or BigDecimal

MONEY      long paise, or BigDecimal("0.10") (never new BigDecimal(0.1))
           compareTo, not equals (scale!)   divide(x, scale, RoundingMode)

COST       Long sum += i : 1.2 GB / 100M iterations, 4.5x slower
           HashMap<Integer,Integer> counting: 27x slower than int[]

TOOLS      Error Prone: CollectionIncompatibleType, ReferenceEquality,
           BoxedPrimitiveEquality; hit-rate metrics on every cache`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Every trap in this lesson comes from autoboxing meeting an older rule: class-strict `equals`, `Object`-typed collection methods, numeric conditionals, and overload phases that prefer widening. Reading the bytecode, or knowing the JLS rule, turns each \"impossible\" bug into an obvious one.",
            "Floating point and money are a separate family with the same lesson: equality depends on representation. Use `Double.compare` and tolerances for measurements, and exact types (`long` minor units, `BigDecimal` from strings) for money.",
            "With this lesson the Wrapper Classes phase is complete. Next comes File Handling: reading and writing files with `java.io` and `java.nio`, streams, readers, paths, and the resource handling from the try-with-resources lesson applied to real files.",
          ],
        },
      ],
    },
  ],
};
