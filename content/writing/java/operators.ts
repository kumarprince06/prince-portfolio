import type { Lesson } from "../types";

export const operators: Lesson = {
  slug: "operators",
  date: "2026-10-02",
  title: "Operators",
  description:
    "Java's operators and what they really do: integer division and remainder, short-circuit logic, pre and post increment, compound assignment's hidden cast, shifts, the ternary's type rules, and the bytecode `javac` generates for each.",
  tags: ["Core Java", "Operators", "Bytecode", "Fundamentals"],
  sections: [
    {
      title: "What Operators Are",
      blocks: [
        {
          type: "paragraph",
          text: "I've been using operators from the very first `\"Hello, \" + name`, and `++count` showed up in a loop long before I could say exactly what it does. This lesson is me going back and pinning them down properly.",
        },
        {
          type: "paragraph",
          text: "An **operator** is a symbol that takes one, two or three values (its **operands**) and produces a result. In `5 + 3`, `+` is the operator, `5` and `3` are the operands, and the result is `8`. Together they form an **expression**, and every expression in Java has a type that the compiler works out before the program ever runs.",
        },
        {
          type: "paragraph",
          text: "They look like school maths, but a handful of them behave in ways that cause real bugs: `7 / 2` is `3`, `-7 % 2` is `-1`, `b += 5` compiles where `b = b + 5` doesn't, `&&` sometimes doesn't evaluate its right side at all, and `==` on two objects compares identity, not contents. Most of what follows is about those edges, and about what `javac` actually turns each operator into.",
        },
      ],
    },
    {
      title: "Where They Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java took its operators and most of its precedence table straight from C and C++. That was deliberate: in the mid-1990s the people Java wanted to win over were C and C++ programmers, and `+`, `&&`, `++`, `<<` and `? :` meant the same thing to them on day one.",
        },
        {
          type: "paragraph",
          text: "The interesting part is what Java changed:",
        },
        {
          type: "list",
          items: [
            "**`boolean` is its own type.** In C, `if (5)` is legal and any non-zero integer counts as true. In Java a condition must be a `boolean`, and there's no conversion between `int` and `boolean` at all. That single rule turns the classic `if (x = 5)` typo into a compile error.",
            "**Evaluation order is defined.** Java evaluates operands left to right, and the left operand of a binary operator is fully evaluated before the right one. In C, something like `a[i] = i++` is undefined behaviour. In Java it has exactly one answer, which I show later.",
            "**Sizes are fixed.** An `int` is always 32 bits and integer overflow always wraps in two's complement. In C, signed overflow is undefined.",
            "**`>>>` was added**, an unsigned right shift, because Java has no unsigned integer types to shift instead.",
            "**Things were removed:** pointer operators (`*p`, `&x`, `->`), `sizeof`, the comma operator, and C++-style operator overloading. The only overloaded operator is `+`, which also concatenates strings.",
          ],
        },
        {
          type: "paragraph",
          text: "Two later changes matter here. Java 9 changed how string `+` is compiled (JEP 280, `invokedynamic` instead of `StringBuilder` chains), and Java 16 finalized pattern matching for `instanceof` (JEP 394), so `obj instanceof String s` both tests and binds a variable.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of the operators as different tools on a workbench, each with a specific kind of input and output:",
        },
        {
          type: "list",
          items: [
            "**Arithmetic** (`+ - * / %`) are measuring and cutting tools. Quantities go in, a quantity comes out. Except the integer saw only cuts whole pieces: `7 / 2` gives `3` and the half falls on the floor.",
            "**Relational** (`== != < > <= >=`) are a balance scale. Two things go in, and what comes out is not a quantity but a yes/no answer.",
            "**Logical** (`&& || !`) are switches that combine yes/no answers: \"turn the light on if it's dark AND someone is home\". If it isn't dark, nobody bothers checking whether someone is home. That's short-circuiting.",
            "**Assignment** (`= += -=` ...) is relabelling a box: putting a new value into a variable's slot.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks: real tools don't care about the material, and Java operators very much do. The same `/` is a different machine instruction for `int`, `long`, `float` and `double`, with different rules for rounding and division by zero.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "paragraph",
          text: "Most notes, mine included, split Java's operators into eight groups: arithmetic, relational, logical, assignment, unary, bitwise and shift, ternary, and `instanceof`. That grouping is a teaching convention. The JLS organizes them by precedence and by operand type instead, which is why `&` shows up both as a bitwise operator on integers and as a logical operator on booleans.",
        },
        {
          type: "heading",
          text: "Arithmetic: + - * / %",
        },
        {
          type: "paragraph",
          text: "When both operands are integers, `/` is **integer division**: the result is an integer and the fractional part is thrown away. It truncates toward zero, it does not round, and it does not floor:",
        },
        {
          type: "code",
          language: "java",
          title: "Division.java",
          code: `public class Division {
    public static void main(String[] args) {
        int a = 7, b = 2;
        System.out.println("7 / 2          = " + (a / b));
        System.out.println("-7 / 2         = " + (-a / b));
        System.out.println("(double) 7 / 2 = " + ((double) a / b));
        System.out.println("7.0 / 2        = " + (7.0 / 2));
        System.out.println("(double)(7/2)  = " + (double) (a / b));
    }
}`,
        },
        {
          type: "output",
          text: `7 / 2          = 3
-7 / 2         = -3
(double) 7 / 2 = 3.5
7.0 / 2        = 3.5
(double)(7/2)  = 3.0`,
        },
        {
          type: "paragraph",
          text: "`-7 / 2` is `-3`, not `-4`, so it's truncation toward zero. And the last line is the trap inside the fix: casting **after** the division just converts the already-truncated `3` into `3.0`. The cast has to apply to an operand, so that the division itself happens in `double`.",
        },
        {
          type: "paragraph",
          text: "`%` is the **remainder** operator, and it's defined to fit that truncating division: `(a / b) * b + (a % b) == a` always holds. That makes the sign of the result follow the left operand (the dividend):",
        },
        {
          type: "code",
          language: "java",
          title: "Remainder.java",
          code: `public class Remainder {
    public static void main(String[] args) {
        System.out.println(" 7 %  2 = " + (7 % 2));
        System.out.println("-7 %  2 = " + (-7 % 2));
        System.out.println(" 7 % -2 = " + (7 % -2));
        System.out.println("floorMod(-7, 2) = " + Math.floorMod(-7, 2));
        System.out.println("5.5 % 2 = " + (5.5 % 2));
        System.out.println("10.0 / 0 = " + (10.0 / 0));
        System.out.println("0.0 / 0  = " + (0.0 / 0));
        System.out.println("10 % 0.0 = " + (10 % 0.0));
        int zero = 0;
        try {
            System.out.println(10 % zero);
        } catch (ArithmeticException e) {
            System.out.println("10 % 0   -> " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: ` 7 %  2 = 1
-7 %  2 = -1
 7 % -2 = 1
floorMod(-7, 2) = 1
5.5 % 2 = 1.5
10.0 / 0 = Infinity
0.0 / 0  = NaN
10 % 0.0 = NaN
10 % 0   -> java.lang.ArithmeticException: / by zero`,
        },
        {
          type: "list",
          items: [
            "Because `%` is a remainder and not a mathematical modulus, `-7 % 2` is `-1`. When I want a result that's always in `[0, n)`, I use `Math.floorMod`.",
            "`%` works on `double` too, which surprised me. `5.5 % 2` is `1.5`.",
            "Division by zero only throws for **integer** `/` and `%`. Floating-point division follows IEEE 754 and gives `Infinity` or `NaN` without any exception.",
            "Integer arithmetic also **overflows silently**: `Integer.MAX_VALUE + 1` is `Integer.MIN_VALUE`. There's a demo of that in the examples.",
          ],
        },
        {
          type: "heading",
          text: "Relational: == != < > <= >=",
        },
        {
          type: "paragraph",
          text: "These always produce a `boolean`, never a number. On primitives, `==` compares values. On references, it compares whether both sides point to the **same object**, which is a different question from whether the objects are equal:",
        },
        {
          type: "code",
          language: "java",
          title: "Equality.java",
          code: `public class Equality {
    public static void main(String[] args) {
        String a = "order-42";
        String b = new String("order-42");
        System.out.println("a == b      : " + (a == b));
        System.out.println("a.equals(b) : " + a.equals(b));

        Integer small1 = 127, small2 = 127;
        Integer big1 = 128, big2 = 128;
        System.out.println("127 == 127  : " + (small1 == small2));
        System.out.println("128 == 128  : " + (big1 == big2));
        System.out.println("128 equals  : " + big1.equals(big2));

        System.out.println("0.1 + 0.2 == 0.3 : " + (0.1 + 0.2 == 0.3));
        double nan = 0.0 / 0;
        System.out.println("NaN == NaN  : " + (nan == nan));
        System.out.println("isNaN       : " + Double.isNaN(nan));
        System.out.println("10 == 10.0  : " + (10 == 10.0));
    }
}`,
        },
        {
          type: "output",
          text: `a == b      : false
a.equals(b) : true
127 == 127  : true
128 == 128  : false
128 equals  : true
0.1 + 0.2 == 0.3 : false
NaN == NaN  : false
isNaN       : true
10 == 10.0  : true`,
        },
        {
          type: "list",
          items: [
            "The `Integer` result is the nasty one. Autoboxing goes through `Integer.valueOf`, which caches `-128` to `127`, so two boxed `127`s are the same object and two boxed `128`s are not. Code that compares `Integer`s with `==` passes every test with small IDs and breaks in production.",
            "`NaN` is not equal to anything, including itself. `Double.isNaN` is the only reliable check.",
            "`10 == 10.0` is `true` because the `int` is promoted to `double` before the comparison. Mixed-type comparisons always promote first.",
          ],
        },
        {
          type: "heading",
          text: "Logical: && || !",
        },
        {
          type: "paragraph",
          text: "`&&` and `||` are the **conditional** operators, and the important word is conditional: the right operand is only evaluated if it can still change the result. `&&` stops at the first `false`, `||` stops at the first `true`. Java also has `&`, `|` and `^` on booleans, which always evaluate both sides. I wrote a small `check` method that prints when it runs, to see the difference:",
        },
        {
          type: "code",
          language: "java",
          title: "ShortCircuit.java",
          code: `public class ShortCircuit {
    static boolean check(String name, boolean result) {
        System.out.println("  evaluated " + name);
        return result;
    }

    public static void main(String[] args) {
        int x = 0;
        if (x != 0 && (10 / x) > 2) {
            System.out.println("big");
        } else {
            System.out.println("x is zero, division skipped");
        }

        System.out.println("false && ...");
        boolean r1 = check("left", false) && check("right", true);
        System.out.println("true || ...");
        boolean r2 = check("left", true) || check("right", false);
        System.out.println("false & ...");
        boolean r3 = check("left", false) & check("right", true);
        System.out.println(r1 + " " + r2 + " " + r3);

        try {
            if (x != 0 & (10 / x) > 2) {
                System.out.println("big");
            }
        } catch (ArithmeticException e) {
            System.out.println("with & : " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `x is zero, division skipped
false && ...
  evaluated left
true || ...
  evaluated left
false & ...
  evaluated left
  evaluated right
false true false
with & : java.lang.ArithmeticException: / by zero`,
        },
        {
          type: "paragraph",
          text: "Short-circuiting isn't just an optimization, it's a guard. The left side checks that the right side is safe to run. Swap `&&` for `&` and the same `if` divides by zero.",
        },
        {
          type: "heading",
          text: "Assignment: = += -= *= /= %= and friends",
        },
        {
          type: "paragraph",
          text: "Plain `=` stores a value and is itself an expression whose value is what was stored, which is why `x = y = z = 7` works (assignment groups right to left). The compound forms (`+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, `>>=`, `>>>=`) look like pure shorthand, but they aren't. JLS 15.26.2 defines `E1 op= E2` as `E1 = (T) ((E1) op (E2))`, where `T` is the type of `E1`. There's a cast hiding in there:",
        },
        {
          type: "code",
          language: "java",
          title: "Compound.java",
          code: `public class Compound {
    public static void main(String[] args) {
        byte b = 10;
        b += 5;
        System.out.println("b += 5     -> " + b);

        byte big = 120;
        big += 10;
        System.out.println("120 += 10  -> " + big);

        int x = 5;
        x += 3.7;
        System.out.println("5 += 3.7   -> " + x);

        char ch = 'a';
        ch += 1;
        System.out.println("'a' += 1   -> " + ch);
    }
}`,
        },
        {
          type: "output",
          text: `b += 5     -> 15
120 += 10  -> -126
5 += 3.7   -> 8
'a' += 1   -> b`,
        },
        {
          type: "paragraph",
          text: "Every one of these compiles, and two of them quietly lose information: `120 + 10` wraps around to `-126` in a `byte`, and `5 + 3.7` becomes `8` because the `8.7` is cast back to `int`. Written the long way, the compiler refuses:",
        },
        {
          type: "code",
          language: "java",
          title: "CompoundError.java",
          code: `public class CompoundError {
    public static void main(String[] args) {
        byte b = 10;
        b = b + 5;
    }
}`,
        },
        {
          type: "output",
          text: `CompoundError.java:4: error: incompatible types: possible lossy conversion from int to byte
        b = b + 5;
              ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`b + 5` is an `int` (arithmetic on `byte`, `short` and `char` always promotes to `int` first), and assigning an `int` to a `byte` needs an explicit cast. `b += 5` has that cast built in. The Type Casting lesson goes deeper into the promotion rules.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "x += 3 is not just x = x + 3",
          text: "My old notes said `x += 3` and `x = x + 3` produce identical bytecode. They don't, on two counts. Semantically, the compound form includes a cast back to the left-hand type. And for an `int` local, `javac` compiles `x += 3` to a single `iinc 1, 3` but `x = x + 3` to `iload`, `iconst_3`, `iadd`, `istore`. The `javap` output is in Internal Working.",
        },
        {
          type: "heading",
          text: "Unary: + - ++ -- ~ !",
        },
        {
          type: "paragraph",
          text: "`-x` negates, `!b` flips a boolean, `~x` flips every bit. `++` and `--` add or subtract one and write the result back, and they come in two forms. **Pre-increment** (`++a`) updates the variable and the expression's value is the new value. **Post-increment** (`c++`) also updates the variable, but the expression's value is the **old** one:",
        },
        {
          type: "code",
          language: "java",
          title: "Increment.java",
          code: `public class Increment {
    public static void main(String[] args) {
        int a = 5;
        int b = ++a;
        System.out.println("a = " + a + ", b = " + b);

        int c = 5;
        int d = c++;
        System.out.println("c = " + c + ", d = " + d);
    }
}`,
        },
        {
          type: "output",
          text: `a = 6, b = 6
c = 6, d = 5`,
        },
        {
          type: "paragraph",
          text: "Both variables end up as `6`. The only difference is which value the expression hands to whoever is using it. On a line of its own, `count++;` and `++count;` do exactly the same thing.",
        },
        {
          type: "heading",
          text: "Bitwise and shift: & | ^ ~ << >> >>>",
        },
        {
          type: "paragraph",
          text: "These work on the two's-complement bits of `int` and `long` values (smaller types are promoted to `int` first). `<<` shifts left and fills with zeros. `>>` is an **arithmetic** right shift: it copies the sign bit in, so negative numbers stay negative. `>>>` is a **logical** right shift: it always fills with zeros.",
        },
        {
          type: "code",
          language: "java",
          title: "Shifts.java",
          code: `public class Shifts {
    static String bits(int v) {
        return String.format("%32s", Integer.toBinaryString(v)).replace(' ', '0');
    }

    public static void main(String[] args) {
        int n = -8;
        System.out.println("-8        " + bits(n));
        System.out.println("-8 >> 1   " + bits(n >> 1) + "  " + (n >> 1));
        System.out.println("-8 >>> 1  " + bits(n >>> 1) + "  " + (n >>> 1));
        System.out.println("-8 << 1   " + bits(n << 1) + "  " + (n << 1));
        System.out.println("1 << 32 = " + (1 << 32) + ", 1 << 33 = " + (1 << 33));
        System.out.println("1L << 33 = " + (1L << 33));

        byte b = -16;
        b >>>= 2;
        System.out.println("byte -16 >>>= 2 -> " + b);

        System.out.println("6 & 3 = " + (6 & 3) + ", 6 | 3 = " + (6 | 3)
            + ", 6 ^ 3 = " + (6 ^ 3) + ", ~6 = " + (~6));
        System.out.println("-7 >> 1 = " + (-7 >> 1) + ", -7 / 2 = " + (-7 / 2));
    }
}`,
        },
        {
          type: "output",
          text: `-8        11111111111111111111111111111000
-8 >> 1   11111111111111111111111111111100  -4
-8 >>> 1  01111111111111111111111111111100  2147483644
-8 << 1   11111111111111111111111111110000  -16
1 << 32 = 1, 1 << 33 = 2
1L << 33 = 8589934592
byte -16 >>>= 2 -> -4
6 & 3 = 2, 6 | 3 = 7, 6 ^ 3 = 5, ~6 = -7
-7 >> 1 = -4, -7 / 2 = -3`,
        },
        {
          type: "list",
          items: [
            "The shift distance is masked: only the low 5 bits are used for an `int` (6 bits for a `long`). So `1 << 32` is `1 << 0`, which is `1`, not `0`.",
            "`>>>` on a `byte` doesn't do what it looks like. The `-16` is promoted to a 32-bit `int` first (sign-extended), shifted, and then the compound assignment's cast chops it back to a `byte`. The result is `-4`, still negative.",
            "`~x` is always `-x - 1` in two's complement, so `~6` is `-7`.",
            "`x >> 1` is not the same as `x / 2` for negative odd numbers: the shift rounds down (`-4`), division truncates toward zero (`-3`).",
          ],
        },
        {
          type: "heading",
          text: "Ternary: condition ? a : b",
        },
        {
          type: "paragraph",
          text: "The only operator with three operands. `int max = (a > b) ? a : b;` does the same job as an `if`/`else` that assigns `max`, with one real difference: the ternary is an **expression**, so it has a value and a type. The rules for that type (JLS 15.25) are where the surprises are:",
        },
        {
          type: "code",
          language: "java",
          title: "Ternary.java",
          code: `public class Ternary {
    public static void main(String[] args) {
        boolean flag = true;
        System.out.println(flag ? 1 : 2.0);
        Object o = flag ? 1 : "one";
        System.out.println(o.getClass().getSimpleName());
        char c = 'x';
        System.out.println(false ? 1 : c);
        int i = 0;
        System.out.println(false ? i : c);

        Integer discount = null;
        try {
            int applied = flag ? discount : 0;
            System.out.println(applied);
        } catch (NullPointerException e) {
            System.out.println("NPE: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `1.0
Integer
x
120
NPE: Cannot invoke "java.lang.Integer.intValue()" because "discount" is null`,
        },
        {
          type: "list",
          items: [
            "`flag ? 1 : 2.0` prints `1.0`. Two numeric branches get binary numeric promotion, so the whole expression is a `double`, even when the `int` branch is the one chosen.",
            "`false ? 1 : c` is a `char` (`x`) because `1` is a constant that fits in a `char`. Replace the constant with an `int` variable and the type becomes `int`, so it prints `120`.",
            "`flag ? discount : 0` mixes `Integer` and `int`, so the result type is `int` and `discount` gets unboxed. It's `null`, so that's a `NullPointerException` on a line with no method call in sight. (The message names `discount` because I compiled with `-g`.)",
          ],
        },
        {
          type: "heading",
          text: "instanceof",
        },
        {
          type: "paragraph",
          text: "`obj instanceof Type` is `true` if `obj` is non-null and could be cast to `Type` without a `ClassCastException`. Since Java 16 it can also declare a pattern variable, which is only in scope where the test is known to have passed:",
        },
        {
          type: "code",
          language: "java",
          title: "Instance.java",
          code: `public class Instance {
    static String describe(Object o) {
        if (o instanceof String s && !s.isEmpty()) {
            return "String of length " + s.length();
        }
        if (o instanceof Integer n) {
            return "Integer, doubled " + (n * 2);
        }
        return "something else: " + o;
    }

    public static void main(String[] args) {
        System.out.println(describe("hello"));
        System.out.println(describe(""));
        System.out.println(describe(21));
        System.out.println(describe(null));
        Object o = "text";
        System.out.println(o instanceof CharSequence);
        System.out.println(null instanceof Object);
    }
}`,
        },
        {
          type: "output",
          text: `String of length 5
something else:
Integer, doubled 42
something else: null
true
false`,
        },
        {
          type: "paragraph",
          text: "`null instanceof Anything` is always `false`, so `instanceof` doubles as a null check. The `&& !s.isEmpty()` part works because `s` is only bound once the left side of `&&` is true, short-circuiting again. And if the cast could never succeed, the compiler rejects the test outright: `\"x\" instanceof Integer` fails with `incompatible types: String cannot be converted to Integer`. I'll come back to `instanceof` properly once classes and inheritance are covered.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "Operators don't exist in bytecode. `javac` turns each one into one or more JVM instructions, and those instructions are typed: there's `iadd` for `int`, `ladd` for `long`, `fadd`, `dadd`, and the same family for every arithmetic operator. That's why the compiler has to know every operand's type first. To see what each operator becomes, I compiled small classes and ran `javap -c` on them.",
        },
        {
          type: "heading",
          text: "Pre and post increment",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c Increment",
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: iconst_5
       1: istore_1
       2: iinc          1, 1
       5: iload_1
       6: istore_2
       ...
      20: iconst_5
      21: istore_3
      22: iload_3
      23: iinc          3, 1
      26: istore        4
       ...`,
        },
        {
          type: "paragraph",
          text: "The two forms use exactly the same instructions. Only the order differs:",
        },
        {
          type: "list",
          items: [
            "`int b = ++a;` is `iinc 1, 1` (add 1 to local slot 1, in place) **then** `iload_1` (push the updated `6`), then `istore_2` into `b`.",
            "`int d = c++;` is `iload_3` (push the current `5`) **then** `iinc 3, 1` (bump slot 3 to `6`), then `istore 4` stores the `5` that was already on the operand stack into `d`.",
          ],
        },
        {
          type: "paragraph",
          text: "`iinc` is a special instruction: it adds a constant directly to a local variable slot, without touching the operand stack. But it only exists for `int` **local variables**. When I incremented a field and a `long`, the compiler had to spell it out:",
        },
        {
          type: "code",
          language: "java",
          title: "IncField.java",
          code: `public class IncField {
    int count;
    long total;

    void bump() {
        count++;
        long t = total;
        t++;
        total = t;
    }

    void same() {
        int x = 5;
        x += 3;
        x = x + 3;
    }
}`,
        },
        {
          type: "output",
          text: `  void bump();
    Code:
       0: aload_0
       1: dup
       2: getfield      #7                  // Field count:I
       5: iconst_1
       6: iadd
       7: putfield      #7                  // Field count:I
      10: aload_0
      11: getfield      #13                 // Field total:J
      14: lstore_1
      15: lload_1
      16: lconst_1
      17: ladd
      18: lstore_1
      19: aload_0
      20: lload_1
      21: putfield      #13                 // Field total:J
      24: return

  void same();
    Code:
       0: iconst_5
       1: istore_1
       2: iinc          1, 3
       5: iload_1
       6: iconst_3
       7: iadd
       8: istore_1
       9: return`,
        },
        {
          type: "list",
          items: [
            "`count++` on a field is read, add, write: `getfield`, `iconst_1`, `iadd`, `putfield`. Three separate steps, which is exactly why `count++` on a shared field is not thread-safe. Two threads can both read the same old value.",
            "`t++` on a `long` local is `lload`, `lconst_1`, `ladd`, `lstore`. No `iinc` for longs.",
            "In `same()`, `x += 3` is one `iinc 1, 3`, while `x = x + 3` is four instructions. Same result, different bytecode.",
          ],
        },
        {
          type: "heading",
          text: "Compound assignment's hidden cast",
        },
        {
          type: "paragraph",
          text: "For a `byte`, there's no `iinc` shortcut and the cast from the JLS shows up as a real instruction:",
        },
        {
          type: "code",
          language: "java",
          title: "ByteOps.java",
          code: `public class ByteOps {
    static byte add(byte b) {
        b += 5;
        return b;
    }
}`,
        },
        {
          type: "output",
          text: `  static byte add(byte);
    Code:
       0: iload_0
       1: iconst_5
       2: iadd
       3: i2b
       4: istore_0
       5: iload_0
       6: ireturn`,
        },
        {
          type: "paragraph",
          text: "The JVM has no `byte` arithmetic at all. The `byte` is loaded as an `int` (`iload_0`), added as an `int` (`iadd`), and then `i2b` truncates it to 8 bits and sign-extends it back. That `i2b` is the hidden cast, and it's the instruction that turned `120 + 10` into `-126` earlier.",
        },
        {
          type: "heading",
          text: "Short-circuit is a conditional jump",
        },
        {
          type: "paragraph",
          text: "There's no \"and\" instruction for `&&`. It compiles into branches that jump over the right operand:",
        },
        {
          type: "code",
          language: "java",
          title: "Logic.java",
          code: `public class Logic {
    static boolean both(boolean a, boolean b) {
        return a && b;
    }

    static boolean bothEager(boolean a, boolean b) {
        return a & b;
    }

    static boolean either(boolean a, boolean b) {
        return a || b;
    }
}`,
        },
        {
          type: "output",
          text: `  static boolean both(boolean, boolean);
    Code:
       0: iload_0
       1: ifeq          12
       4: iload_1
       5: ifeq          12
       8: iconst_1
       9: goto          13
      12: iconst_0
      13: ireturn

  static boolean bothEager(boolean, boolean);
    Code:
       0: iload_0
       1: iload_1
       2: iand
       3: ireturn

  static boolean either(boolean, boolean);
    Code:
       0: iload_0
       1: ifne          8
       4: iload_1
       5: ifeq          12
       8: iconst_1
       9: goto          13
      12: iconst_0
      13: ireturn`,
        },
        {
          type: "list",
          items: [
            "In `both`, `ifeq 12` at offset 1 means \"if `a` is false (zero), jump straight to pushing `false`\". The instructions that load and test `b` are skipped completely. That jump **is** short-circuit evaluation.",
            "`either` mirrors it: `ifne 8` jumps straight to pushing `true` as soon as `a` is true.",
            "`bothEager` (`&`) loads both values and does `iand`, a bitwise AND on the `int`s `0` and `1`. No branch, so both sides always run. A `boolean` is just an `int` 0 or 1 on the operand stack.",
          ],
        },
        {
          type: "heading",
          text: "Constant folding",
        },
        {
          type: "code",
          language: "java",
          title: "Folding.java",
          code: `public class Folding {
    static int folded() {
        int result = 5 + 3;
        return result;
    }

    static int notFolded(int a, int b) {
        int result = a + b;
        return result;
    }
}`,
        },
        {
          type: "output",
          text: `  static int folded();
    Code:
       0: bipush        8
       2: istore_0
       3: iload_0
       4: ireturn

  static int notFolded(int, int);
    Code:
       0: iload_0
       1: iload_1
       2: iadd
       3: istore_2
       4: iload_2
       5: ireturn`,
        },
        {
          type: "paragraph",
          text: "`5 + 3` never reaches the JVM. Both operands are compile-time constants, so `javac` computes `8` and emits `bipush 8`. Only `a + b` produces an `iadd`. (A constant division by zero like `10 / 0` is not folded; it compiles and throws at runtime, with only a `[divzero]` warning under `-Xlint:all`.)",
        },
        {
          type: "heading",
          text: "String + is invokedynamic",
        },
        {
          type: "paragraph",
          text: "`+` with a `String` operand is string concatenation. Up to Java 8, `javac` compiled it into a `StringBuilder` chain. Since Java 9 (JEP 280) it emits a single `invokedynamic`:",
        },
        {
          type: "code",
          language: "java",
          title: "Greet.java",
          code: `public class Greet {
    static String greet(String name, int age) {
        return "Hello, " + name + " (" + age + ")";
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -v Greet",
        },
        {
          type: "output",
          text: `  static java.lang.String greet(java.lang.String, int);
    ...
         0: aload_0
         1: iload_1
         2: invokedynamic #7,  0              // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;I)Ljava/lang/String;
         7: areturn
...
BootstrapMethods:
  0: #21 REF_invokeStatic java/lang/invoke/StringConcatFactory.makeConcatWithConstants:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #19 Hello, \\u0001 (\\u0001)`,
        },
        {
          type: "paragraph",
          text: "The bytecode just pushes the two variables and calls `makeConcatWithConstants`. The constant parts live in a **recipe** string, `Hello, \\u0001 (\\u0001)`, where each `\\u0001` marks where an argument goes. The first time this line runs, `StringConcatFactory` builds an optimized method handle for exactly that shape, and later calls reuse it. The strategy now lives in the JDK, so it gets faster with JDK upgrades without recompiling.",
        },
        {
          type: "paragraph",
          text: "For comparison, `javac -XDstringConcat=inline` still produces the old style. The same method becomes fifteen instructions:",
        },
        {
          type: "output",
          text: `       0: new           #7                  // class java/lang/StringBuilder
       3: dup
       4: invokespecial #9                  // Method java/lang/StringBuilder."<init>":()V
       7: ldc           #10                 // String Hello,
       9: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      12: aload_0
      13: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      16: ldc           #16                 // String  (
      18: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      21: iload_1
      22: invokevirtual #18                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      25: ldc           #21                 // String )
      27: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      30: invokevirtual #23                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
      33: areturn`,
        },
        {
          type: "paragraph",
          text: "Because `+` groups left to right, where the first `String` appears decides what's arithmetic and what's concatenation:",
        },
        {
          type: "code",
          language: "java",
          title: "Concat.java (excerpt)",
          code: `System.out.println(1 + 2 + "3");     // (1 + 2) + "3"
System.out.println("1" + 2 + 3);     // ("1" + 2) + 3
System.out.println("1" + (2 + 3));
System.out.println('a' + 'b' + "c"); // char + char is int arithmetic
String n = null;
System.out.println("value: " + n);`,
        },
        {
          type: "output",
          text: `33
123
15
195c
value: null`,
        },
        {
          type: "paragraph",
          text: "`'a' + 'b'` is `97 + 98 = 195`, because two `char`s are promoted to `int` and added before any `String` is involved. And concatenating `null` doesn't throw, it appends the text `null`.",
        },
      ],
    },
    {
      title: "Pre vs Post in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `PRE-INCREMENT   int b = ++a;    (a starts at 5)

  iinc 1, 1    slot a: 5 -> 6          update first
  iload_1      operand stack: [6]      then read
  istore_2     b = 6

  result: a = 6, b = 6


POST-INCREMENT  int d = c++;    (c starts at 5)

  iload_3      operand stack: [5]      read first
  iinc 3, 1    slot c: 5 -> 6          then update
  istore 4     d = 5  (the value already on the stack)

  result: c = 6, d = 5`,
          caption:
            "Same two instructions, opposite order. iinc changes the slot directly, so whatever was already pushed keeps the old value.",
        },
        {
          type: "callout",
          tone: "note",
          text: "My first version of this picture had post-increment as load, store into `d`, then `iinc`. The result is the same, but that's not what `javac` emits: the `iinc` happens between the load and the store, while the old value sits on the operand stack.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Taking `double avg = total / count;` with two `int`s, here's what happens from source to result (the phases are the ones from the Compilation Process lesson):",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Parsing:** `javac`'s parser builds a tree for the expression. Precedence and associativity decide its shape: `a + b * c` becomes `a + (b * c)`, `a - b - c` becomes `(a - b) - c`. Precedence never appears again after this; it's baked into the tree.",
            "**Attribution:** the compiler checks each operator against its operand types and picks the right version. `int / int` is integer division with an `int` result. `boolean + int` is rejected here with \"bad operand types for binary operator\".",
            "**Promotion and conversion:** if the operand types differ, binary numeric promotion widens them first (`int` and `double` become `double`; `byte`, `short` and `char` always become at least `int`). Assigning the `int` result to `avg` then widens it to `double`, after the fraction has already been dropped.",
            "**Constant folding:** if every operand is a compile-time constant, `javac` computes the result itself and emits just the value, as with `bipush 8`.",
            "**Code generation:** each operator becomes typed instructions: `idiv` here, `iinc` for `++` on an `int` local, conditional jumps for `&&`, `||` and `? :`, `invokedynamic` for string `+`, `i2d` for the widening to `double`.",
            "**Runtime:** the interpreter executes those instructions on the frame's operand stack, operands strictly left to right. Hot methods are later JIT-compiled to machine code, where the operand stack disappears into CPU registers.",
          ],
        },
      ],
    },
    {
      title: "The Operand Stack",
      blocks: [
        {
          type: "paragraph",
          text: "Operators don't work on local variables directly (`iinc` is the exception). They work on the **operand stack**, a small scratch area inside each method's stack frame. Values are pushed, an instruction pops its operands and pushes its result, and a store moves the result into a local variable slot. For `int result = a + b;` in `notFolded`:",
        },
        {
          type: "diagram",
          text: `┌──────────────────────────────────────────────────┐
│ Stack frame: notFolded(int a, int b)             │
│                                                  │
│ Local variables        Operand stack             │
│ ┌───┬───┬────────┐                               │
│ │ a │ b │ result │                               │
│ └───┴───┴────────┘                               │
│                                                  │
│ iload_0   push a         [a]                     │
│ iload_1   push b         [a, b]                  │
│ iadd      pop 2, push    [a+b]                   │
│ istore_2  pop into slot  []    result = a+b      │
└──────────────────────────────────────────────────┘`,
          caption:
            "The operand stack fills and empties within every statement. Local variable slots live for the whole method call.",
        },
        {
          type: "paragraph",
          text: "My old picture used `int result = 5 + 3;` with two pushes and an `iadd`. As the `Folding` output shows, that's not what happens: `javac` folds constants, so the real bytecode is a single `bipush 8`. With variables, the picture above is exactly what `javap` printed.",
        },
        {
          type: "paragraph",
          text: "The JVM's verifier also checks the stack at class load time: each instruction must find operands of the right type, which is why `iadd` can never accidentally receive a `double`. The maximum depth is computed by `javac` and stored in the class file as `stack=2` in the `javap -v` output.",
        },
      ],
    },
    {
      title: "Precedence and Evaluation Order",
      blocks: [
        {
          type: "paragraph",
          text: "Two separate questions, and I used to mix them up. **Precedence** decides how an expression is grouped. **Evaluation order** decides in which order the grouped parts run. Java fixes both.",
        },
        {
          type: "table",
          headers: ["Level (high to low)", "Operators", "Groups"],
          rows: [
            ["Postfix", "`x++` `x--`", "left to right"],
            ["Unary", "`++x` `--x` `+x` `-x` `~` `!` and casts", "right to left"],
            ["Multiplicative", "`*` `/` `%`", "left to right"],
            ["Additive", "`+` `-`", "left to right"],
            ["Shift", "`<<` `>>` `>>>`", "left to right"],
            ["Relational", "`<` `>` `<=` `>=` `instanceof`", "left to right"],
            ["Equality", "`==` `!=`", "left to right"],
            ["Bitwise AND", "`&`", "left to right"],
            ["Bitwise XOR", "`^`", "left to right"],
            ["Bitwise OR", "`|`", "left to right"],
            ["Conditional AND", "`&&`", "left to right"],
            ["Conditional OR", "`||`", "left to right"],
            ["Ternary", "`? :`", "right to left"],
            ["Assignment", "`=` `+=` `-=` ... `>>>=`", "right to left"],
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Precedence.java",
          code: `public class Precedence {
    public static void main(String[] args) {
        int a = 2, b = 3, c = 4;
        System.out.println(a + b * c);
        System.out.println((a + b) * c);
        System.out.println(20 - 10 - 5);
        System.out.println(100 / 10 / 5);
        int x, y, z;
        x = y = z = 7;
        System.out.println(x + y + z);
        System.out.println(-2 * -3);
        System.out.println(true || false && false);
        System.out.println(5 > 3 == true);
    }
}`,
        },
        {
          type: "output",
          text: `14
20
5
2
21
6
true
true`,
        },
        {
          type: "paragraph",
          text: "`true || false && false` is `true` because `&&` binds tighter than `||`, so it's `true || (false && false)`. The one that has actually bitten people is the bitwise operators sitting **below** `==`, a leftover from C. Checking for an even number like this doesn't do what it reads like:",
        },
        {
          type: "code",
          language: "java",
          title: "BitPrecedence.java",
          code: `public class BitPrecedence {
    public static void main(String[] args) {
        int x = 6;
        if (x & 1 == 0) {
            System.out.println("even");
        }
    }
}`,
        },
        {
          type: "output",
          text: `BitPrecedence.java:4: error: bad operand types for binary operator '&'
        if (x & 1 == 0) {
              ^
  first type:  int
  second type: boolean
1 error`,
        },
        {
          type: "paragraph",
          text: "It parsed as `x & (1 == 0)`, an `int` AND a `boolean`. In C that compiles and silently returns the wrong answer. In Java the strict `boolean` type catches it. The fix is `(x & 1) == 0`.",
        },
        {
          type: "heading",
          text: "Left to right, always",
        },
        {
          type: "paragraph",
          text: "JLS 15.7 says the left operand is fully evaluated before the right one, operands are evaluated before the operation, and for an assignment to an array element the array reference and index are evaluated before the right-hand side. That gives side-effect puzzles one definite answer each:",
        },
        {
          type: "code",
          language: "java",
          title: "EvalOrder.java",
          code: `import java.util.Arrays;

public class EvalOrder {
    public static void main(String[] args) {
        int[] arr = new int[3];
        int i = 0;
        arr[i] = i++;
        System.out.println("arr[i] = i++    -> " + Arrays.toString(arr) + ", i = " + i);

        int[] arr2 = {10, 20, 30};
        int j = 0;
        arr2[j++] = arr2[j];
        System.out.println("arr2[j++] = arr2[j] -> " + Arrays.toString(arr2) + ", j = " + j);

        int k = 5;
        k = k++;
        System.out.println("k = k++         -> " + k);

        int m = 1;
        int r = m++ + ++m;
        System.out.println("m++ + ++m       -> " + r + ", m = " + m);

        int p = 2;
        p += p++ * 10;
        System.out.println("p += p++ * 10   -> " + p);
    }
}`,
        },
        {
          type: "output",
          text: `arr[i] = i++    -> [0, 0, 0], i = 1
arr2[j++] = arr2[j] -> [20, 20, 30], j = 1
k = k++         -> 5
m++ + ++m       -> 4, m = 3
p += p++ * 10   -> 22`,
        },
        {
          type: "list",
          items: [
            "`arr[i] = i++`: the index `i` is evaluated first (`0`), then `i++` yields `0` and makes `i` `1`, then `arr[0] = 0`.",
            "`arr2[j++] = arr2[j]`: the left side's `j++` runs first, so the target is `arr2[0]` and `j` is now `1`. The right side then reads `arr2[1]`, which is `20`.",
            "`k = k++` leaves `k` at `5`. `k++` pushes the old `5`, `iinc` makes the slot `6`, and then the assignment stores the pushed `5` back over it.",
            "`m++ + ++m`: the left operand yields `1` (m becomes `2`), the right one makes m `3` and yields `3`. `1 + 3 = 4`.",
            "`p += p++ * 10`: the compound assignment saves the left value `2` first, then `p++ * 10` is `20`. `2 + 20 = 22`, and that overwrites the `3` that `p++` wrote.",
          ],
        },
        {
          type: "paragraph",
          text: "All of these are well-defined, and I still wouldn't write any of them in real code.",
        },
      ],
    },
    {
      title: "Syntax Reference",
      blocks: [
        {
          type: "code",
          language: "java",
          code: `// Arithmetic
int sum = a + b;
int quotient = a / b;        // int / int truncates toward zero
int remainder = a % b;       // sign follows a
double exact = (double) a / b;

// Relational: always boolean
boolean isEqual = a == b;
boolean inRange = a >= 0 && a < 100;

// Logical: && and || short-circuit, ! negates
boolean bothPositive = a > 0 && b > 0;
boolean notBoth = !bothPositive;

// Assignment and compound assignment (hidden cast back to the left type)
a += 5;  a -= 5;  a *= 5;  a /= 5;  a %= 5;
a &= 1;  a |= 2;  a ^= 4;  a <<= 1;  a >>= 1;  a >>>= 1;

// Unary
a++;  a--;  ++a;  --a;
int negated = -a;
int inverted = ~a;

// Bitwise and shifts (int and long)
int mask = a & 0xFF;
int flags = a | 0b100;
int half = a >> 1;           // keeps the sign
int logical = a >>> 1;       // fills with zeros

// Ternary
int max = (a > b) ? a : b;

// instanceof, with a pattern variable (Java 16+)
if (obj instanceof String s) {
    System.out.println(s.length());
}`,
        },
        {
          type: "paragraph",
          text: "I compiled this inside a method taking `int a, int b, Object obj` with `-Xlint:all`, and it was clean.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Short-circuit as a null guard",
        },
        {
          type: "paragraph",
          text: "The most common `&&` in backend code isn't arithmetic at all, it's a null check before a method call:",
        },
        {
          type: "code",
          language: "java",
          title: "NullGuard.java",
          code: `public class NullGuard {
    record Location(double lat, double lng) {}
    record Driver(String name, Location location) {}

    static String eta(Driver driver) {
        if (driver != null && driver.location() != null) {
            return driver.name() + " is at " + driver.location().lat();
        }
        return "no location yet";
    }

    static String etaEager(Driver driver) {
        if (driver != null & driver.location() != null) {
            return driver.name() + " is at " + driver.location().lat();
        }
        return "no location yet";
    }

    public static void main(String[] args) {
        System.out.println(eta(new Driver("Asha", new Location(22.57, 88.36))));
        System.out.println(eta(new Driver("Ravi", null)));
        System.out.println(eta(null));
        System.out.println(etaEager(null));
    }
}`,
        },
        {
          type: "output",
          text: `Asha is at 22.57
no location yet
no location yet
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "NullGuard$Driver.location()" because "driver" is null
	at NullGuard.etaEager(NullGuard.java:13)
	at NullGuard.main(NullGuard.java:23)`,
        },
        {
          type: "paragraph",
          text: "One character apart. With `&&`, a `null` driver never reaches `driver.location()`. With `&`, both sides always run and the guard is useless. (The variable name `driver` in the message comes from compiling with `-g`; without it the JDK prints `<parameter1>`.)",
        },
        {
          type: "heading",
          text: "Silent overflow",
        },
        {
          type: "code",
          language: "java",
          title: "Overflow.java",
          code: `public class Overflow {
    public static void main(String[] args) {
        int max = Integer.MAX_VALUE;
        System.out.println("MAX + 1        = " + (max + 1));
        System.out.println("-MIN           = " + (-Integer.MIN_VALUE));
        System.out.println("MIN / -1       = " + (Integer.MIN_VALUE / -1));
        System.out.println("Math.abs(MIN)  = " + Math.abs(Integer.MIN_VALUE));

        int millisPerDay = 24 * 60 * 60 * 1000;
        long wrong = 30 * millisPerDay;
        long right = 30L * millisPerDay;
        System.out.println("30 days wrong  = " + wrong);
        System.out.println("30 days right  = " + right);

        try {
            Math.addExact(max, 1);
        } catch (ArithmeticException e) {
            System.out.println("addExact       -> " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `MAX + 1        = -2147483648
-MIN           = -2147483648
MIN / -1       = -2147483648
Math.abs(MIN)  = -2147483648
30 days wrong  = -1702967296
30 days right  = 2592000000
addExact       -> integer overflow`,
        },
        {
          type: "paragraph",
          text: "Only the last line complained. Everything else wrapped without a word. The `30 days wrong` case is the classic: the multiplication happens in `int` and overflows, and only **then** is the wrong result widened to `long`. Making one operand a `long` (`30L`) moves the whole multiplication to 64 bits. `Math.addExact`, `multiplyExact` and friends throw instead of wrapping, and `Math.abs(Integer.MIN_VALUE)` being negative is worth remembering for the next example.",
        },
        {
          type: "heading",
          text: "Picking a shard with % (and why it goes negative)",
        },
        {
          type: "paragraph",
          text: "A common use of `%` is spreading keys across N buckets: shards, partitions, worker queues. `hashCode()` can be negative, and so can `%`:",
        },
        {
          type: "code",
          language: "java",
          title: "Sharding.java",
          code: `public class Sharding {
    public static void main(String[] args) {
        int shards = 10;
        for (String key : new String[] {"order-9001", "user-17", "polygenelubricants"}) {
            int h = key.hashCode();
            System.out.printf("%-19s hash=%11d  %%=%2d  abs%%=%2d  floorMod=%d%n",
                key, h, h % shards, Math.abs(h) % shards, Math.floorMod(h, shards));
        }
    }
}`,
        },
        {
          type: "output",
          text: `order-9001          hash=  708419191  %= 1  abs%= 1  floorMod=1
user-17             hash= -147182744  %=-4  abs%= 4  floorMod=6
polygenelubricants  hash=-2147483648  %=-8  abs%=-8  floorMod=2`,
        },
        {
          type: "paragraph",
          text: "Plain `%` gives shard `-4` for `user-17`, which is an `ArrayIndexOutOfBoundsException` waiting to happen. The usual \"fix\", `Math.abs(h) % n`, works for almost every key, except the one whose hash is exactly `Integer.MIN_VALUE` (`\"polygenelubricants\"` is a well-known one), where `Math.abs` returns a negative number and you get shard `-8`. `Math.floorMod` is correct for every input.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Expecting int division to keep the fraction",
        },
        {
          type: "paragraph",
          text: "`7 / 2` is `3`, and `double d = 7 / 2;` is `3.0`, because the conversion to `double` happens after the integer division. One operand has to be a `double` (or cast to one) before the `/`. For money, neither is right; that's `BigDecimal` territory.",
        },
        {
          type: "heading",
          text: "= instead of == in a condition",
        },
        {
          type: "paragraph",
          text: "For `int`, Java catches it, because an assignment's value has the variable's type and `int` isn't `boolean`:",
        },
        {
          type: "code",
          language: "java",
          title: "IfInt.java",
          code: `public class IfInt {
    public static void main(String[] args) {
        int x = 0;
        if (5) { }
        if (x = 5) { }
    }
}`,
        },
        {
          type: "output",
          text: `IfInt.java:4: error: incompatible types: int cannot be converted to boolean
        if (5) { }
            ^
IfInt.java:5: error: incompatible types: int cannot be converted to boolean
        if (x = 5) { }
              ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "For a `boolean` variable, the same typo compiles, because `flag = true` is a `boolean` expression:",
        },
        {
          type: "code",
          language: "java",
          title: "IfFlag.java",
          code: `public class IfFlag {
    public static void main(String[] args) {
        boolean flag = false;
        if (flag = true) {
            System.out.println("ran, and flag is now " + flag);
        }
    }
}`,
        },
        {
          type: "output",
          text: "ran, and flag is now true",
        },
        {
          type: "paragraph",
          text: "The branch always runs and `flag` is overwritten. `javac` doesn't warn about it even with `-Xlint:all`. The real fix is to never compare a boolean with `==` in the first place: `if (flag)` and `if (!flag)`.",
        },
        {
          type: "heading",
          text: "Using ++ inside a bigger expression",
        },
        {
          type: "paragraph",
          text: "On its own line, `i++` and `++i` are identical. Inside an expression they give different values, and things like `k = k++` (which leaves `k` unchanged) are easy to misread. I keep increments on their own line.",
        },
        {
          type: "heading",
          text: "Assuming % is never negative",
        },
        {
          type: "paragraph",
          text: "`-7 % 2` is `-1`. So `n % 2 == 1` is a broken odd-number check: it's `false` for `-7`. `n % 2 != 0` works for both signs, and `Math.floorMod` gives a non-negative result when one is needed.",
        },
        {
          type: "heading",
          text: "Comparing objects with ==",
        },
        {
          type: "paragraph",
          text: "`==` on `String`, `Integer`, `Long` or `BigDecimal` compares references. It sometimes works by accident (string literals are interned, small `Integer`s are cached), which is why it survives testing. `equals`, or `Objects.equals(a, b)` when either side can be `null`, is the comparison I actually mean.",
        },
        {
          type: "heading",
          text: "Forgetting that arithmetic happens in int",
        },
        {
          type: "paragraph",
          text: "`30 * millisPerDay` overflowed before it was stored in a `long`, and `b + 5` on a `byte` is an `int`. The type of the target variable never affects how the right-hand side is computed.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Keep `++` and `--` on their own statements. `arr[i] = i++` is legal and defined, and nobody should have to work it out during a code review.",
            "Add parentheses whenever bitwise and comparison operators are mixed, and in any boolean expression that mixes `&&` and `||`. `(a && b) || c` costs nothing to read.",
            "When I want a fractional result, make one operand a `double` before the division, on purpose. Never rely on assigning to a `double` variable.",
            "Use `&&` and `||` for logic. Reserve `&`, `|` and `^` for bit work, or for the rare case where both sides genuinely must run (and then a comment).",
            "Use `equals` / `Objects.equals` for objects, and `==` only for primitives, enums, and deliberate identity checks.",
            "Use `Math.floorMod` for bucket indices and `Math.addExact` / `multiplyExact` / `toIntExact` where overflow would be a bug rather than a feature.",
            "Be suspicious of compound assignment on `byte`, `short`, `char`, and of `int += double`. They compile and narrow silently.",
            "Keep ternaries flat. One `? :` reads well; nested ones belong in an `if`/`else` or a `switch` expression. Watch for mixed `Integer`/`int` branches.",
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
            "Short-circuiting saves real work when the right side is expensive: a database lookup, a regex, a remote call. Putting the cheap or most-likely-to-decide check on the left is a free win.",
            "`&` on booleans has no branch, so in theory it can avoid a branch misprediction. In ordinary backend code this never matters, and the JIT may compile either form to similar machine code. I choose by semantics, not by guessing at speed.",
            "Bitwise operations are about as cheap as instructions get, which is why hash tables use `(n - 1) & hash` instead of `hash % n` when `n` is a power of two. But writing `x << 1` instead of `x * 2` by hand buys nothing: the JIT already turns multiplication and division by constants into shifts where that's valid.",
            "`iinc` versus `iload`/`iadd`/`istore` is a bytecode-size difference, not a speed difference that survives JIT compilation. Both become a register add.",
            "String `+` in a single expression is fine and, since Java 9, well optimized. String `+` inside a loop still creates a new `String` per iteration; a `StringBuilder` (or `String.join`, `Collectors.joining`) is the right tool there.",
            "Boxed types make operators slower and riskier: `Integer total; total += x;` unboxes, adds, and boxes a new `Integer` every time. Keep accumulators primitive.",
          ],
        },
      ],
    },
    {
      title: "Operators in Production",
      blocks: [
        {
          type: "list",
          items: [
            "**Null guards** with `&&` are everywhere in service code: `if (user != null && user.isActive())`. Modern code often uses `Optional`, `Objects.requireNonNull` or validation annotations instead, but the `&&` guard is still the basic building block.",
            "**Money** avoids both `double` (binary fractions, as in `0.1 + 0.2 != 0.3`) and casual integer division. Amounts are kept as `BigDecimal` with an explicit `RoundingMode`, or as a `long` count of the smallest unit (paise, cents), where splitting a bill means dealing with the remainder explicitly.",
            "**Hashing and bucketing** lean on bitwise operators. `HashMap` spreads hash bits with `h ^ (h >>> 16)` and picks a bucket with `(n - 1) & hash`, which only works because its table size is always a power of two. Code that picks a shard or partition from a hash needs `Math.floorMod` for the same reason as the sharding example.",
            "**Flags and permissions** are sometimes packed into an `int` with `|` to set, `&` to test and `& ~flag` to clear, especially in protocols and file formats. In business code, `EnumSet` gives the same compact bit-vector with names, and is what I'd reach for.",
            "**Time and size arithmetic** is where overflow shows up: milliseconds in a month, bytes in a file. Using `long` and `Duration`, or `Math.multiplyExact`, keeps it honest.",
            "**`instanceof` patterns** have replaced most cast-after-check code since Java 16, and pattern matching in `switch` (Java 21) extends the same idea to whole type hierarchies.",
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
              question: "Name the eight categories of operators in Java.",
              answer:
                "Arithmetic, relational, logical, assignment, unary, bitwise and shift, the ternary operator, and `instanceof`.\n\nI'd add that \"eight categories\" is a teaching grouping, not something the JLS defines. Some lists split shifts out from bitwise, and a few operators live in two groups: `&` is bitwise on `int`s and a non-short-circuit logical AND on `boolean`s, and `+` is also string concatenation.",
            },
            {
              question: "What does the % operator do?",
              answer:
                "It gives the remainder after division. `7 % 2` is `1`. It works on floating-point types too: `5.5 % 2` is `1.5`.\n\nThe detail worth knowing is that it's a remainder, not a mathematical modulus. The sign follows the left operand, so `-7 % 2` is `-1`. When I need a result in `[0, n)`, I use `Math.floorMod`, which gave `1` for the same input.",
            },
            {
              question: "What's the result of 7 / 2 if both operands are int?",
              answer:
                "`3`. Both operands are `int`, so it's integer division, and the fractional part is truncated, not rounded.\n\nTruncation is toward zero, so `-7 / 2` is `-3`, not `-4`. I checked both. And `double d = 7 / 2;` still gives `3.0`, because the division happens before the widening.",
            },
            {
              question: "What's the result of 7.0 / 2?",
              answer:
                "`3.5`. One operand is a `double`, so binary numeric promotion turns the `2` into `2.0` and the whole division happens in `double`.\n\n`(double) 7 / 2` gives the same `3.5`, because the cast applies to `7` before dividing. `(double) (7 / 2)` gives `3.0`, because the cast applies after the integer division already dropped the half.",
            },
            {
              question: "What type of result do relational operators (<, >, ==) always produce?",
              answer:
                "Always a `boolean`. Never a number, unlike C, where a comparison gives `0` or `1`.\n\nThat's also why they're the only sensible thing to put in an `if`. A condition in Java must be `boolean`, and `if (5)` doesn't compile.",
            },
            {
              question: "What's the difference between a++ and ++a?",
              answer:
                "Both add one to `a`. `++a` gives you the new value, `a++` gives you the old value. On a line by itself there's no difference.\n\nWhen I ran `int b = ++a;` with `a = 5`, both ended up `6`. With `int d = c++;`, `c` became `6` but `d` got `5`.",
            },
            {
              question: "What does the && operator do?",
              answer:
                "It's the conditional AND: the result is `true` only if both operands are `true`. The key word is conditional, because if the left side is `false` it doesn't evaluate the right side at all.\n\nThat makes it usable as a guard, like `driver != null && driver.location() != null`. In my test, a `null` driver went straight to the `else` with `&&`, and threw a `NullPointerException` with `&`.",
            },
            {
              question: "What does short-circuit evaluation mean?",
              answer:
                "It means `&&` and `||` stop as soon as the result is decided. `&&` stops at the first `false`, `||` at the first `true`, and the right operand is never evaluated.\n\nI tested it with a method that prints when it runs. `check(\"left\", false) && check(\"right\", true)` printed only `evaluated left`. With `&` instead, both printed.",
            },
            {
              question: "What is the ternary operator's syntax?",
              answer:
                "`condition ? valueIfTrue : valueIfFalse`, for example `int max = (a > b) ? a : b;`.\n\nIt's an expression, so it has a type, and that type can surprise you. `true ? 1 : 2.0` printed `1.0`, because the two branches are promoted to a common type, `double`.",
            },
            {
              question: "Does if (5) compile in Java? Why or why not?",
              answer:
                "No. Java requires a `boolean` condition, and there's no conversion from `int` to `boolean`. `javac` says `incompatible types: int cannot be converted to boolean`.\n\nThat's a deliberate break from C, where any non-zero value is true. The nice side effect is that `if (x = 5)` is also a compile error, so the classic assignment-instead-of-comparison typo can't slip through for numbers.",
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
              question: "Why does int result = 7 / 2; give 3, not 3.5? What's the exact mechanism?",
              answer:
                "Because the compiler picks the operator's version from the operand types. Two `int`s means `int` division, which `javac` compiles to `idiv`, and that instruction produces an `int`, truncated toward zero. There's nowhere for the `.5` to go.\n\nThe result type is decided by the operands, never by the variable you assign to. That's why `double d = 7 / 2;` is `3.0`: `idiv` runs first, then `i2d` widens the `3`.",
            },
            {
              question: "Trace precisely what happens, step by step, when int b = ++a; executes (bytecode level).",
              answer:
                "With `a` in slot 1 and `b` in slot 2: `iinc 1, 1` adds one to slot 1 in place, `iload_1` pushes the updated value onto the operand stack, and `istore_2` pops it into `b`.\n\nThat's straight from `javap -c` on my `Increment` class. Because the increment happens before the load, `b` sees the new value, `6`.",
            },
            {
              question: "Trace precisely what happens when int d = c++; executes, and explain why the result differs from pre-increment.",
              answer:
                "With `c` in slot 3 and `d` in slot 4: `iload_3` pushes the current `5`, `iinc 3, 1` bumps the slot to `6`, and `istore 4` stores the `5` that's still on the operand stack into `d`.\n\nSame instructions as pre-increment, just with the load moved before the `iinc`. Since `iinc` changes the slot and not the stack, the value already pushed stays old. That's the whole difference.",
            },
            {
              question: "Why does short-circuit evaluation prevent ArithmeticException in x != 0 && (10/x) > 2 when x is 0?",
              answer:
                "Because `x != 0` is `false`, and with `&&` a `false` left side decides the result, so `10 / x` is never executed. The division can't throw if it never runs.\n\nIn bytecode it's a conditional jump: `javac` emits an `ifeq` after the left side that jumps past the right side's instructions. When I changed `&&` to `&` in the same `if`, it threw `ArithmeticException: / by zero`.",
            },
            {
              question: "Why is if (flag = true) a dangerous bug, while if (x = 5) (with x as int) is a compile error instead?",
              answer:
                "An assignment is an expression whose value and type are those of the variable. `x = 5` has type `int`, which isn't allowed as a condition. `flag = true` has type `boolean`, so it's a perfectly valid condition.\n\nSo `if (flag = true)` overwrites `flag` and the branch always runs. My test printed `ran, and flag is now true`, with no warning from `javac` even under `-Xlint:all`. The habit that prevents it is never writing `== true` at all, just `if (flag)`.",
            },
            {
              question: "What does the iinc bytecode instruction do, and how does it relate to ++?",
              answer:
                "`iinc index, const` adds a signed constant directly to an `int` local variable slot, without going through the operand stack. `javac` uses it for `++`, `--` and also `+= constant` on `int` locals.\n\nIt's limited to `int` locals. When I ran `javap` on a field `count++`, it was `getfield`, `iconst_1`, `iadd`, `putfield`. A `long` local was `lload`, `lconst_1`, `ladd`, `lstore`. And `x += 3` was `iinc 1, 3`, while `x = x + 3` was four instructions.",
            },
            {
              question: "Why can % return a negative result with negative operands in Java?",
              answer:
                "Because `%` is defined to match integer division, which truncates toward zero. The JLS guarantees `(a / b) * b + (a % b) == a`. Since `-7 / 2` is `-3`, the remainder has to be `-1` for that to hold.\n\nSo the sign of the result follows the dividend: `7 % -2` is `1`, `-7 % 2` is `-1`. If I need a non-negative result, like a bucket index, I use `Math.floorMod`, which gave `6` where `%` gave `-4` in my sharding test.",
            },
            {
              question: "What's the difference between & and &&?",
              answer:
                "`&&` only works on booleans and short-circuits. `&` on booleans is a logical AND that always evaluates both sides, and on integers it's a bitwise AND.\n\nIn bytecode, `a && b` became `ifeq` jumps, while `a & b` became a plain `iand`. In practice the difference shows up as a guard that doesn't guard: `driver != null & driver.location() != null` threw a `NullPointerException` in my test.",
            },
            {
              question: "How does the ternary operator compare to an equivalent if-else block in terms of what it actually produces?",
              answer:
                "The bytecode is very similar: a conditional jump to one branch or the other, then a store. The difference is that the ternary is an expression with a value and a single type, while `if`/`else` is a statement.\n\nThat type is where they diverge. With `if`/`else`, each branch assigns its own value. With `flag ? discount : 0`, where `discount` is an `Integer`, the whole expression is `int`, so a `null` `discount` got unboxed and threw a `NullPointerException`. The same logic as an `if`/`else` assigning to an `Integer` would just store `null`.",
            },
            {
              question: "Why does == behave differently for primitives versus reference types?",
              answer:
                "Because a primitive variable holds the value itself, while a reference variable holds a reference to an object. `==` compares what's in the variables, so for primitives that's the value, and for references it's object identity.\n\n`\"order-42\" == new String(\"order-42\")` was `false` while `equals` was `true`. The sneakier case is boxing: two `Integer`s of `127` were `==`, two of `128` weren't, because `Integer.valueOf` caches `-128` to `127`.",
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
              question: "Explain exactly how the JVM's bytecode represents short-circuit evaluation (what instruction enables the \"skip\" behavior)?",
              answer:
                "Conditional branch instructions. There's no \"logical and\" instruction. For `a && b`, `javac` emits `iload a; ifeq L_false; iload b; ifeq L_false; iconst_1; goto end; L_false: iconst_0`. The `ifeq` after the left operand jumps over everything that computes the right operand.\n\n`||` uses `ifne` the same way, jumping to the `true` result. Inside an `if`, `javac` doesn't even materialize the `boolean`, it jumps straight to the `else` block. `&`, by contrast, compiled to `iand` with no branch at all.",
            },
            {
              question: "Why does Java use a dedicated iinc instruction instead of just doing \"load, add 1, store\" for increment operations? What's the benefit?",
              answer:
                "Compactness. Incrementing a local is extremely common, mostly loop counters, and `iinc` does it in one 3-byte instruction instead of four instructions. It also doesn't use the operand stack. Bytecode size mattered a lot when the format was designed for downloading applets, and fewer instructions also means less work for the interpreter.\n\nI wouldn't oversell it as a runtime speed trick, though. Once the JIT compiles the method, `iinc` and `iload`/`iadd`/`istore` both become a single add on a register. And it only covers `int` locals; fields and `long`s get the long form, as `javap` showed.",
            },
            {
              question: "How does operator precedence get resolved during the Syntax Analysis phase when building the AST?",
              answer:
                "The parser encodes precedence in the shape of the tree. `javac`'s parser handles binary expressions with operator-precedence parsing: when it sees `a + b * c`, `*` binds tighter, so it builds `Plus(a, Times(b, c))`. Left associativity makes `a - b - c` into `Minus(Minus(a, b), c)`. Parentheses just force a subtree.\n\nAfter parsing, precedence is gone; everything later works on the tree. You can see that in a compile error: `x & 1 == 0` failed with \"bad operand types for binary operator '&'\", first type `int`, second type `boolean`, which shows the tree was already `x & (1 == 0)` before type checking ran.",
            },
            {
              question: "Explain how type promotion rules interact with arithmetic operators when operands have different types (e.g., int + double).",
              answer:
                "Binary numeric promotion, JLS 5.6: if either operand is `double`, both become `double`; else if either is `float`, both become `float`; else if either is `long`, both become `long`; otherwise both become `int`. So `int + double` is computed as `double + double`.\n\nThe \"otherwise `int`\" part is what catches people. `byte + byte` is an `int`, which is why `b = b + 5` failed with \"possible lossy conversion from int to byte\". And promotion only looks at the operands, so `30 * millisPerDay` overflowed in `int` before being stored into a `long`. The Type Casting lesson covers this in depth.",
            },
            {
              question: "Why might combining i++ with array indexing in the same statement (arr[i++] = arr[i]) produce unexpected results, given evaluation order?",
              answer:
                "Because Java evaluates the left-hand side, including the index expression, before the right-hand side. In `arr[i++] = arr[i]`, `i++` runs first, so the target is `arr[0]` and `i` is already `1` when the right side reads `arr[1]`.\n\nWith `{10, 20, 30}` I got `[20, 20, 30]`. The point I'd make in an interview is that it's not undefined like in C: JLS 15.7 fixes the order, so it always gives that answer. It's unexpected for the reader, not for the JVM, and that's reason enough not to write it.",
            },
            {
              question: "How do bitwise shift operators (<<, >>, >>>) differ from each other, specifically regarding sign bits?",
              answer:
                "`<<` shifts left and fills with zeros, so the sign bit can change. `>>` is an arithmetic shift: it fills from the left with copies of the sign bit, so negatives stay negative. `>>>` is a logical shift: it always fills with zeros, so a negative number becomes a large positive one.\n\nFor `-8`, `>> 1` gave `-4` and `>>> 1` gave `2147483644`. Two more details: the shift distance is masked to 5 bits for `int`, so `1 << 32` is `1`. And `>>>` on a `byte` is misleading, because the byte is sign-extended to `int` first; `byte -16 >>>= 2` came out as `-4`.",
            },
            {
              question: "Explain the precise compile-time versus runtime distinction for a % operation involving division by zero, compared to a / operation.",
              answer:
                "For integers there's no difference between them: both `/` and `%` by zero throw `ArithmeticException: / by zero` at runtime, and the message is the same for `%`. Neither is a compile error. Even the literal `10 / 0` compiles, because an expression that would throw is not treated as a constant and isn't folded. `javac` only warns with `[divzero]` under `-Xlint:all`.\n\nThe real distinction is integer versus floating point. `10.0 / 0` is `Infinity`, `0.0 / 0` is `NaN`, and `10 % 0.0` is `NaN`, all without exceptions, following IEEE 754.",
            },
            {
              question: "Why does Java's strict separation of boolean from int (unlike C) eliminate an entire category of accidental-assignment bugs in if conditions?",
              answer:
                "Because a condition must be a `boolean`, and assignment expressions have the type of their variable. So `if (x = 5)` is an `int` in a `boolean` position and fails to compile. In C, it compiles, assigns, and is always true.\n\nIt narrows the category rather than eliminating it completely: `if (flag = true)` on a `boolean` still compiles. It also catches related C bugs, like `if (x & 1 == 0)`, which Java rejected as `int & boolean`.",
            },
            {
              question: "How would you explain the implications of using & versus && in a scenario where the right-hand operand has side effects (like a method call with logging)?",
              answer:
                "With `&&`, the side effect only happens when the left side is `true`. With `&`, it always happens. My `check` method printed `evaluated right` only in the `&` case. So switching between them changes behaviour, not just speed.\n\nPerformance-wise, `&&` skips a potentially expensive call. `&` avoids a branch, which almost never matters. But I'd say the real answer is not to depend on either: if a side effect must happen, do it as its own statement before the condition, so nobody \"optimizes\" `&` into `&&` and loses the log line.",
            },
            {
              question: "Explain how the ternary operator's result type is determined when the two branches have different types (e.g., one int, one double).",
              answer:
                "JLS 15.25 splits it into cases. If both branches are numeric, binary numeric promotion applies, so `int` and `double` give `double`. `true ? 1 : 2.0` printed `1.0`. There's a special case for constants: an `int` constant that fits in a `char` paired with a `char` gives `char`, so `false ? 1 : c` printed `x`, but with an `int` variable it printed `120`.\n\nIf one branch is boxed and the other primitive, the boxed one is unboxed, which is how `flag ? discount : 0` threw a `NullPointerException`. If the branches are unrelated references, like `1` and `\"one\"`, it's a reference conditional and the type is their common supertype; I got an `Integer` back as an `Object`.",
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
              question: "A teammate's code if (x = true) compiles and silently breaks their logic. Explain exactly what happened and why.",
              answer:
                "They assigned instead of comparing. `x = true` stores `true` into `x` and evaluates to `true`, which is a valid `boolean` condition, so the branch always runs and the original value of `x` is lost.\n\nIt compiles only because `x` is a `boolean`; for an `int` it would be a type error. `javac` doesn't warn, so I'd fix it as `if (x)` and mention that IDE inspections and static analysis like SonarQube flag assignments in conditions.",
            },
            {
              question: "Your calculation int average = total / count; is silently producing wrong results with no error. What's the most likely cause?",
              answer:
                "Integer division. Both operands are `int`, so the fraction is truncated toward zero; `7 / 2` is `3`. Even if `average` were a `double`, it would get `3.0`, because the division happens first.\n\nThe fix is `(double) total / count`, or `BigDecimal` with a `RoundingMode` if it's money. I'd also check two other silent problems: `total` overflowing if it's a sum of large values (use `long` or `Math.addExact`), and `count` being zero, which isn't silent but will throw `ArithmeticException`.",
            },
            {
              question: "A method with expensive logging is called inside the right-hand side of an && expression, and a teammate is confused why the logs sometimes don't appear. Explain using short-circuit evaluation.",
              answer:
                "Whenever the left side is `false`, `&&` already knows the result and never calls the right side. So the method, and its logging, only run when the left side is `true`.\n\nI reproduced exactly that: with `false && check(...)`, only `evaluated left` printed. If the log must always appear, the call should happen on its own line before the condition. Changing to `&` would technically work, but it hides an important side effect inside a boolean expression.",
            },
            {
              question: "Someone writes arr[i] = i++; and gets a result they didn't expect. Walk through the exact evaluation order to explain what happened.",
              answer:
                "Java evaluates the array reference and the index on the left first, so the target is `arr[0]` while `i` is still `0`. Then the right side, `i++`, yields the old value `0` and sets `i` to `1`. Finally `0` is stored into `arr[0]`.\n\nI ran it on `new int[3]` and got `[0, 0, 0]` with `i = 1`. People often expect `arr[1] = 0` because they assume the increment happens first. It's well-defined by JLS 15.7, but I'd split it into `arr[i] = i; i++;`.",
            },
            {
              question: "A colleague asks why -7 % 2 gives -1 instead of 1 in Java. Explain the behavior.",
              answer:
                "Java's `%` is a remainder, not a modulus. It's defined so that `(a / b) * b + (a % b) == a`, and since integer division truncates toward zero, `-7 / 2` is `-3`. For the identity to hold, `-7 % 2` must be `-1`. The sign always follows the left operand.\n\nIf they want the mathematical modulus, `Math.floorMod(-7, 2)` returns `1`. It matters in real code: a shard index computed with `hashCode() % 10` came out as `-4` in my test, and even `Math.abs(h) % 10` was `-8` for a hash of `Integer.MIN_VALUE`.",
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
            "Write `OperatorsDemo.java`. Divide two `int`s that don't divide evenly and print the truncated result, then fix it with a cast on one operand and print the decimal result.",
            "Declare two `int`s with the same value. Apply `++x` to one and `y++` to the other, capturing each expression's value in a separate variable, and print both the captured values and the final values.",
            "Write an `if` with `zero != 0 && 10 / zero > 2` where `zero` is `0`, and show that it doesn't throw.",
            "Add a comment above each of the three parts explaining why the output looks the way it does.",
            "Bonus: change the `&&` to `&` and run it again. Then run `javap -c OperatorsDemo` and find the `iinc` for `++x` and the `ifeq` that skips the division.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect, with `7` and `2` and starting values of `10`: `int split: 3`, `double split: 3.5`, `++x gave 11, x is now 11`, `y++ gave 10, y is now 11`, and the short-circuit line printing without an exception. With `&`, the program dies with `java.lang.ArithmeticException: / by zero`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ARITHMETIC  int / int truncates toward zero: 7/2=3, -7/2=-3
            % sign follows left: -7%2=-1   floorMod -> 1
            int /0, %0 throw; double /0 -> Infinity, NaN
            overflow wraps silently   Math.addExact throws

RELATIONAL  always boolean   == on objects = same object
            Integer cache -128..127   NaN != NaN

LOGICAL     && stops at false, || stops at true
            & | ^ on booleans: both sides always run
            bytecode: ifeq / ifne jumps vs iand

ASSIGNMENT  a op= b  ==  a = (T)(a op b)   hidden cast
            byte b; b += 5 ok, b = b + 5 error

UNARY       ++a: iinc then iload  (new value)
            a++: iload then iinc  (old value)
            iinc only for int locals

SHIFTS      >> keeps sign   >>> fills zeros
            int distance masked to 5 bits: 1<<32 == 1

TERNARY     numeric branches promoted: true?1:2.0 -> 1.0
            Integer vs int branch -> unboxing NPE

STRING +    Java 9+: invokedynamic StringConcatFactory

ORDER       & ^ | sit below == -> (x & 1) == 0
            operands always evaluated left to right`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Integer division truncates, it doesn't round. If I want a fraction, an operand has to be a `double` before the `/`.",
            "`&&` and `||` are guards as much as logic. The right side only runs when it can still change the answer.",
            "Compound assignment carries a hidden cast, and `==` on objects compares identity. Both compile without complaint, which is exactly why they're worth remembering.",
          ],
        },
      ],
    },
  ],
};
