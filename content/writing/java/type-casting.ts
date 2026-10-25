import type { Lesson } from "../types";

export const typeCasting: Lesson = {
  slug: "type-casting",
  date: "2026-10-07",
  title: "Type Casting",
  description:
    "What really happens when a value moves between types in Java: widening and narrowing, numeric promotion, the bytecode behind every cast, why some conversions silently wrap or lose precision, and how reference casts are checked at runtime.",
  tags: ["Core Java", "Type Casting", "Data Types", "Bytecode"],
  sections: [
    {
      title: "What Type Casting Is",
      blocks: [
        {
          type: "paragraph",
          text: "I'd already been casting without naming it. In the Operators lesson I wrote `(double) 7 / 2` to get `3.5` instead of `3`, and I kept seeing `int + double` turn into a `double`. This lesson is where I pin down exactly what happens when a value moves from one type to another.",
        },
        {
          type: "paragraph",
          text: "**Type conversion** is turning a value of one type into a value of another type. Some conversions happen automatically, because the compiler knows they're safe or the language says they're allowed in that spot. Others need me to write a **cast**, `(targetType) value`, which is me telling the compiler \"I know this might lose something, do it anyway\". People say \"type casting\" for both, and the JLS chapter that defines all of it (chapter 5, \"Conversions and Contexts\") is worth knowing by name.",
        },
        {
          type: "paragraph",
          text: "Java needs these rules because it's statically typed. Every variable and every expression has a type at compile time, so the compiler has to decide what `double y = x;` means when `x` is an `int`. The bit pattern for the `int` `5` and the `double` `5.0` are completely different, so something has to convert one into the other. That something turns out to be a dedicated bytecode instruction, which I'll show with `javap`.",
        },
        {
          type: "paragraph",
          text: "Why I care as a backend developer: the bugs here are quiet. A narrowing cast never throws. A `long` ID cast to `int`, a timestamp squeezed into 32 bits, or `int * int` overflowing before it's widened to `long` all produce a wrong number that looks perfectly normal. The reference side has the opposite problem: a bad cast like `(Long) map.get(\"id\")` compiles fine and throws `ClassCastException` at runtime.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Every statically typed language needs conversion rules. Java's were designed to be stricter than C's. In C, `int x = someLong;` or `int n = 3.9;` compiles, and at most the compiler warns if you turn on something like `-Wconversion`. Java makes any conversion that can lose information a compile error unless there's an explicit cast. That fits the \"robust\" goal from the Features of Java lesson: the risky line has to be visible in the source.",
        },
        {
          type: "paragraph",
          text: "Java also made the results fully defined. In C, converting an out-of-range `double` to `int` is undefined behaviour. In Java, the JLS says exactly what you get (`NaN` becomes `0`, huge values clamp to `Integer.MAX_VALUE`), and the JVM produces that on every platform.",
        },
        {
          type: "list",
          items: [
            "**Java 1.0:** primitive widening and narrowing, reference casts checked at runtime with `ClassCastException`.",
            "**Java 5:** autoboxing and unboxing became conversions of their own (`int` to `Integer` and back), and generics made a lot of explicit downcasts disappear from source code. `javac` still inserts them in the bytecode.",
            "**Java 7:** a cast like `(int) obj` on an `Object` became legal. It compiles to a `checkcast Integer` followed by unboxing.",
            "**Java 16:** pattern matching for `instanceof` (JEP 394), so `if (o instanceof String s)` checks and casts in one step.",
            "**Java 21:** pattern matching for `switch` (JEP 441) and record patterns (JEP 440), which remove most hand-written downcasts after a type check.",
            "**JDK 23 onwards:** primitive types in patterns, `instanceof` and `switch` (JEP 455 and its follow-ups) are in preview. They'd let me ask whether a value converts to `int` without loss. They're still a preview feature as I write this, so I don't use them.",
          ],
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I started with is pouring liquid between containers.",
        },
        {
          type: "list",
          items: [
            "**Widening** (small type to big type, like `int` to `long`) is pouring a cup into a bucket. Everything fits, so Java does it without asking.",
            "**Narrowing** (big type to small type, like `double` to `int`) is pouring a bucket into a cup. Some of it might not fit. Java makes me write the cast, which is me saying \"yes, I know it might spill\".",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks, and it breaks in two important places:",
        },
        {
          type: "list",
          items: [
            "Some \"bigger\" containers have a coarser measuring scale. `float` holds numbers far larger than any `int`, but only about 7 significant digits. Pouring `16777217` into a `float` gives `16777216`. It's still called widening, needs no cast, and loses data.",
            "When an integer overflows the cup, the extra doesn't spill on the floor. Java keeps the low bits and throws away the high ones, so `10_000_000_000L` cast to `int` becomes `1410065408`. It's more like the cup keeping a random-looking slice of the water.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The kinds of conversion",
        },
        {
          type: "paragraph",
          text: "JLS section 5.1 lists the conversions. These are the ones I actually run into:",
        },
        {
          type: "table",
          headers: ["Conversion", "Example", "Cast needed?"],
          rows: [
            ["Widening primitive (5.1.2)", "`int` to `long`, `char` to `int`", "No"],
            ["Narrowing primitive (5.1.3)", "`double` to `int`, `int` to `byte`", "Yes"],
            ["Widening and narrowing (5.1.4)", "`byte` to `char` only", "Yes"],
            ["Widening reference (5.1.5)", "`String` to `Object`", "No"],
            ["Narrowing reference (5.1.6)", "`Object` to `String`", "Yes, checked at runtime"],
            ["Boxing / unboxing (5.1.7, 5.1.8)", "`int` to `Integer` and back", "No"],
          ],
        },
        {
          type: "paragraph",
          text: "Which ones are allowed depends on the **context**: assignment, method invocation, an explicit cast, string concatenation, or numeric promotion inside an expression. A cast context allows the most. That's why `int i = 9.99;` fails while `int i = (int) 9.99;` compiles.",
        },
        {
          type: "heading",
          text: "Widening primitive conversions",
        },
        {
          type: "paragraph",
          text: "There are 19 of them, and they all go \"up\" this chart. No cast is needed, and they never throw:",
        },
        {
          type: "diagram",
          text: `byte ──► short ──► int ──► long ──► float ──► double
                    ▲
           char ────┘

  byte  -> short, int, long, float, double
  short -> int, long, float, double
  char  -> int, long, float, double
  int   -> long, float, double
  long  -> float, double
  float -> double`,
          caption:
            "char joins at int. There's no widening between char and byte or short in either direction.",
        },
        {
          type: "paragraph",
          text: "The `char` detail matters. `char` is an unsigned 16-bit number (0 to 65535) and `short` is signed (-32768 to 32767), so neither can hold all of the other's values. `short` to `char` and `char` to `short` both need a cast. `byte` to `char` is its own odd case in JLS 5.1.4: the `byte` is first widened to `int`, then narrowed to `char`.",
        },
        {
          type: "heading",
          text: "Widening that still loses precision",
        },
        {
          type: "paragraph",
          text: "`int` to `float`, `long` to `float` and `long` to `double` are widening, so they compile without a cast, but the JLS says outright that they can lose precision. A `float` has a 24-bit significand and a `double` has 53 bits, so integers above 2^24 and 2^53 respectively can't all be represented:",
        },
        {
          type: "code",
          language: "java",
          title: "PrecisionLoss.java",
          code: `public class PrecisionLoss {
    public static void main(String[] args) {
        int i = 16_777_217;              // 2^24 + 1
        float f = i;                     // widening, no cast needed
        System.out.println(f);
        System.out.println((int) f);

        long id = 9_007_199_254_740_993L; // 2^53 + 1
        double d = id;                   // widening, no cast needed
        System.out.println((long) d);

        long l = Long.MAX_VALUE;
        float lf = l;
        System.out.println(lf);
    }
}`,
        },
        {
          type: "output",
          text: `1.6777216E7
16777216
9007199254740992
9.223372E18`,
        },
        {
          type: "callout",
          tone: "warning",
          title: "Widening is not always lossless",
          text: "My old notes said widening is \"always safe\" because the bigger type can hold every value of the smaller one. That's true for the range, and it's lossless for things like `int` to `long` or `int` to `double`. But `int` to `float` turned `16777217` into `16777216` with no cast and no warning, and `long` to `double` dropped the last digit of `2^53 + 1`. What's always true is that widening never throws and never changes the sign or magnitude wildly.",
        },
        {
          type: "heading",
          text: "Narrowing primitive conversions",
        },
        {
          type: "paragraph",
          text: "Going the other way needs a cast. Without one, `javac` stops with a message I'd seen many times before I knew the name for it. I compiled this on purpose:",
        },
        {
          type: "code",
          language: "java",
          title: "Lossy.java",
          code: `public class Lossy {
    public static void main(String[] args) {
        double price = 19.99;
        int whole = price;

        byte a = 10, b = 20;
        byte sum = a + b;

        Long id = 5;
    }
}`,
        },
        {
          type: "output",
          text: `Lossy.java:4: error: incompatible types: possible lossy conversion from double to int
        int whole = price;
                    ^
Lossy.java:7: error: incompatible types: possible lossy conversion from int to byte
        byte sum = a + b;
                     ^
Lossy.java:9: error: incompatible types: int cannot be converted to Long
        Long id = 5;
                  ^
3 errors`,
        },
        {
          type: "list",
          items: [
            "Line 4 is the expected one: `double` to `int` needs `(int)`.",
            "Line 7 surprised me. Both operands are `byte`, but `a + b` is an `int` (numeric promotion, below), so storing it in a `byte` is narrowing.",
            "Line 9 is a different rule. Assignment can box `int` to `Integer`, or widen `int` to `long`, but not both. `Long id = 5L;` compiles.",
          ],
        },
        {
          type: "heading",
          text: "Numeric promotion in expressions",
        },
        {
          type: "paragraph",
          text: "Promotion is the automatic widening that happens inside an expression, before the operator runs (JLS 5.6). For a binary operator like `+` or `*`: if either operand is `double`, both become `double`; else if either is `float`, both become `float`; else if either is `long`, both become `long`; otherwise **both become `int`**. That last rule is the one my notes missed: `byte`, `short` and `char` never do arithmetic in their own type.",
        },
        {
          type: "code",
          language: "java",
          title: "Promotion.java",
          code: `public class Promotion {
    public static void main(String[] args) {
        int a = 5;
        double b = 2.0;
        System.out.println(a + b);

        System.out.println((double) 7 / 2);    // cast binds first: 7.0 / 2
        System.out.println((double) (7 / 2));  // int division first: 3 -> 3.0

        byte x = 10, y = 20;
        var sum = x + y;                       // byte + byte is int
        System.out.println(((Object) sum).getClass().getSimpleName());

        char c = 'a';
        System.out.println(c + c);

        int million = 1_000_000;
        long wrong = million * million;        // int * int overflows, THEN widens
        long right = (long) million * million; // long * int is long arithmetic
        System.out.println(wrong);
        System.out.println(right);
    }
}`,
        },
        {
          type: "output",
          text: `7.0
3.5
3.0
Integer
194
-727379968
1000000000000`,
        },
        {
          type: "paragraph",
          text: "`var` showed the type of `x + y` directly: boxing it printed `Integer`. `'a' + 'a'` is `97 + 97 = 194`, not `\"aa\"`. And the last pair is the bug I most want to remember: the type of the variable on the left has no effect on how the right side is computed. `million * million` is done in `int`, overflows, and only then is the broken result widened to `long`.",
        },
        {
          type: "heading",
          text: "Constants and compound assignment",
        },
        {
          type: "paragraph",
          text: "Two places where narrowing happens without a visible cast. First, assignment allows narrowing an `int` **constant expression** to `byte`, `short` or `char` if the value fits (JLS 5.2). Second, compound assignment operators like `+=` include a hidden cast back to the left side's type (JLS 15.26.2): `b += x` means `b = (byte) (b + x)`.",
        },
        {
          type: "code",
          language: "java",
          title: "Constants.java",
          code: `public class Constants {
    public static void main(String[] args) {
        byte small = 10;            // int constant, fits in byte: no cast
        final int limit = 100;
        byte fromFinal = limit;     // constant variable, still fine
        char c = 66;                // also fine

        byte b = 10;
        b += 300;                   // compound assignment hides a (byte) cast
        System.out.println(b);

        int total = 5;
        total += 2.7;               // hidden (int) cast again
        System.out.println(total);

        char letter = 'A';
        letter += 2;
        System.out.println(letter);
        System.out.println(small + " " + fromFinal + " " + c);
    }
}`,
        },
        {
          type: "output",
          text: `54
7
C
10 100 B`,
        },
        {
          type: "paragraph",
          text: "`10 + 300 = 310`, and the low 8 bits of `310` are `54`. `total += 2.7` gave `7`, silently. If I remove `final` from `limit`, or try a constant that doesn't fit, the exemption is gone:",
        },
        {
          type: "output",
          text: `NotConstant.java:4: error: incompatible types: possible lossy conversion from int to byte
        byte b = limit;
                 ^
NotConstant.java:5: error: incompatible types: possible lossy conversion from int to byte
        byte tooBig = 200;
                      ^
2 errors`,
        },
        {
          type: "heading",
          text: "char is a number",
        },
        {
          type: "paragraph",
          text: "A `char` holds a UTF-16 code unit, which is just an unsigned 16-bit number. So `char` to `int` is widening and gives the code (`'A'` is `65`), and `int` to `char` is narrowing: it keeps the low 16 bits, whatever they are.",
        },
        {
          type: "code",
          language: "java",
          title: "CharCasting.java",
          code: `public class CharCasting {
    public static void main(String[] args) {
        char letter = 'A';
        int code = letter;                 // widening: 65
        System.out.println(code);
        System.out.println((char) 66);     // narrowing: 'B'

        System.out.println(letter + 1);    // promoted to int
        System.out.println((char) (letter + 1));

        System.out.println((char) 65_601); // 65_601 = 65_536 + 65, low 16 bits are 65
        System.out.println((int) (char) -1);

        byte b = -1;
        char fromByte = (char) b;          // widening to int, then narrowing to char
        System.out.println((int) fromByte);

        short s = (short) fromByte;        // char -> short also needs a cast
        System.out.println(s);
    }
}`,
        },
        {
          type: "output",
          text: `65
B
66
B
A
65535
65535
-1`,
        },
        {
          type: "paragraph",
          text: "`(char) 65601` printing `A` is the proof that `int` to `char` doesn't check anything: it just drops the top 16 bits. And `-1` as a `char` is `65535`, because `char` has no sign.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "A primitive cast isn't a compiler annotation that disappears. `javac` emits a real conversion instruction, and the JVM's execution engine runs it like any other instruction. I started with the smallest example from my notes:",
        },
        {
          type: "code",
          language: "java",
          title: "Trace.java",
          code: `public class Trace {
    public static void main(String[] args) {
        double d = 9.99;
        int i = (int) d;
        System.out.println(i);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c Trace",
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: ldc2_w        #7                  // double 9.99d
       3: dstore_1
       4: dload_1
       5: d2i
       6: istore_3
       7: getstatic     #9                  // Field java/lang/System.out:Ljava/io/PrintStream;
      10: iload_3
      11: invokevirtual #15                 // Method java/io/PrintStream.println:(I)V
      14: return
}`,
        },
        {
          type: "list",
          items: [
            "`ldc2_w` pushes the `double` constant `9.99` from the constant pool, and `dstore_1` saves it in local variable slot 1.",
            "`dload_1` pushes it back onto the operand stack. `d2i` pops the `double` and pushes an `int`, rounding toward zero. That one instruction is the whole cast.",
            "`istore_3` saves `9` into slot 3. Not slot 2, because a `double` takes two local variable slots, 1 and 2.",
          ],
        },
        {
          type: "heading",
          text: "The full family of conversion instructions",
        },
        {
          type: "paragraph",
          text: "To see the rest, I wrote one method that widens and one that narrows:",
        },
        {
          type: "code",
          language: "java",
          title: "Conversions.java",
          code: `public class Conversions {
    static void widen(int i) {
        long l = i;
        float f = i;
        double d = i;
    }

    static void narrow(long l, double d, int i) {
        int a = (int) l;
        int b = (int) d;
        byte c = (byte) i;
        char e = (char) i;
        short s = (short) i;
        byte g = (byte) d;
    }
}`,
        },
        {
          type: "output",
          text: `  static void widen(int);
    Code:
       0: iload_0
       1: i2l
       2: lstore_1
       3: iload_0
       4: i2f
       5: fstore_3
       6: iload_0
       7: i2d
       8: dstore        4
      10: return

  static void narrow(long, double, int);
    Code:
       0: lload_0
       1: l2i
       2: istore        5
       4: dload_2
       5: d2i
       6: istore        6
       8: iload         4
      10: i2b
      11: istore        7
      13: iload         4
      15: i2c
      16: istore        8
      18: iload         4
      20: i2s
      21: istore        9
      23: dload_2
      24: d2i
      25: i2b
      26: istore        10
      28: return
}`,
        },
        {
          type: "paragraph",
          text: "Widening is not free in the bytecode either: `long l = i;` has no cast in the source but still compiles to `i2l`. The last cast is the interesting one. There's no `d2b` instruction, so `(byte) d` is compiled as `d2i` followed by `i2b`. The JLS defines it that way too: a floating value is narrowed to `int` first, then to `byte`.",
        },
        {
          type: "table",
          headers: ["From", "Instructions", "What they do"],
          rows: [
            ["`int`", "`i2l` `i2f` `i2d`", "sign-extend, or convert to nearest float/double"],
            ["`int`", "`i2b` `i2s` `i2c`", "keep low 8 / 16 bits (`i2c` zero-extends, others sign-extend)"],
            ["`long`", "`l2i` `l2f` `l2d`", "keep low 32 bits, or convert to nearest float/double"],
            ["`float`", "`f2i` `f2l` `f2d`", "round toward zero (saturating), or exact widen"],
            ["`double`", "`d2i` `d2l` `d2f`", "round toward zero (saturating), or round to nearest float"],
          ],
        },
        {
          type: "paragraph",
          text: "That's 15 instructions. There are none for `byte`, `short` or `char` as a source, because the JVM has no arithmetic on those types at all: on the operand stack and in local variables they are already `int`s. Loading a `byte` local is just `iload`. That's the JVM-level reason `byte + byte` is an `int` in Java.",
        },
        {
          type: "heading",
          text: "The JLS rules each instruction follows",
        },
        {
          type: "list",
          items: [
            "**Integer to smaller integer** (`l2i`, `i2b`, `i2s`, `i2c`): discard all but the low N bits. No range check, no exception. The result can have a different sign from the input.",
            "**Floating to `int` or `long`** (`d2i`, `f2i`, `d2l`, `f2l`): round toward zero. `NaN` becomes `0`. A value too large or too small **saturates** to the target's max or min. It does not wrap.",
            "**Floating to `byte`, `short`, `char`:** first to `int` with the rule above, then keep the low bits. So these can both saturate and wrap.",
            "**`double` to `float`** (`d2f`): round to nearest; too large becomes `Infinity`, too small becomes `0.0`.",
            "**Integer to floating** (`i2f`, `l2f`, `l2d`): round to nearest representable value. Never fails, may lose low digits.",
          ],
        },
        {
          type: "paragraph",
          text: "The saturation rule was new to me, so I tested every case:",
        },
        {
          type: "code",
          language: "java",
          title: "FloatToInt.java",
          code: `public class FloatToInt {
    public static void main(String[] args) {
        System.out.println((int) 3e10);            // too big for int
        System.out.println((int) -3e10);
        System.out.println((int) Double.NaN);
        System.out.println((int) Double.POSITIVE_INFINITY);
        System.out.println((long) 3e10);           // fits in long

        System.out.println((int) (long) 3e10);     // d2l, then l2i: wraps
        System.out.println((byte) 300.0);          // d2i gives 300, i2b keeps low 8 bits
        System.out.println((byte) 1e10);           // d2i saturates first, then i2b
    }
}`,
        },
        {
          type: "output",
          text: `2147483647
-2147483648
0
2147483647
30000000000
-64771072
44
-1`,
        },
        {
          type: "paragraph",
          text: "The same number, `3e10`, gives `2147483647` through `d2i` but `-64771072` through `d2l` then `l2i`. And `(byte) 1e10` is `-1`: `d2i` clamps to `Integer.MAX_VALUE` (`0x7FFFFFFF`), and its low 8 bits are `0xFF`.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Not every narrowing cast wraps",
          text: "My notes said a narrowing cast of a value that's too large \"wraps around\". That's only true for integer to integer (`long` to `int`, `int` to `byte`). A `double` or `float` that's too large for `int` or `long` clamps to the max or min value. Both are silent, but they produce very different wrong numbers.",
        },
      ],
    },
    {
      title: "What Happens to the Bits",
      blocks: [
        {
          type: "paragraph",
          text: "The dangerous example from my notes is a `long` that doesn't fit in an `int`. I printed the hex to see exactly what `l2i` keeps:",
        },
        {
          type: "code",
          language: "java",
          title: "NarrowingOverflow.java",
          code: `public class NarrowingOverflow {
    public static void main(String[] args) {
        long big = 10_000_000_000L;      // 10 billion, more than Integer.MAX_VALUE
        int broken = (int) big;
        System.out.println(broken);

        System.out.printf("long: %016x%n", big);
        System.out.printf("int:          %08x%n", broken);

        long justOver = 2_147_483_648L;  // Integer.MAX_VALUE + 1
        System.out.println((int) justOver);
        System.out.println((byte) 200);
        System.out.println((short) 40_000);
    }
}`,
        },
        {
          type: "output",
          text: `1410065408
long: 00000002540be400
int:          540be400
-2147483648
-56
-25536`,
        },
        {
          type: "diagram",
          text: `long  10_000_000_000
  ┌───────────────────┬───────────────────┐
  │ 00 00 00 02       │ 54 0b e4 00       │
  └───────────────────┴───────────────────┘
     high 32 bits         low 32 bits
     discarded            kept by l2i
                               │
                               ▼
int                   ┌───────────────────┐
                      │ 54 0b e4 00       │ = 1410065408
                      └───────────────────┘`,
          caption:
            "l2i keeps the low 32 bits. Mathematically it's the value modulo 2^32, read as a signed int.",
        },
        {
          type: "paragraph",
          text: "When the kept top bit is `1`, the result goes negative: `2147483648` (`0x80000000`) becomes `-2147483648`, `200` as a `byte` is `-56` (`200 - 256`), and `40000` as a `short` is `-25536` (`40000 - 65536`). No exception, because the JVM instruction has nothing to throw. It's just bit truncation.",
        },
      ],
    },
    {
      title: "The Flow in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `  value of type S used where type T is expected
                 │
                 ▼
    ┌───────────────────────────┐
    │ S == T, or S widens to T? │── yes ──► allowed,
    └─────────────┬─────────────┘          no cast in source
                  │ no
                  ▼
    ┌───────────────────────────┐
    │ int constant that fits in │── yes ──► allowed
    │ byte/short/char? (assign) │          (byte b = 10;)
    └─────────────┬─────────────┘
                  │ no
                  ▼
    ┌───────────────────────────┐
    │ explicit cast (T) here?   │── no ───► compile error:
    └─────────────┬─────────────┘          "possible lossy
                  │ yes                     conversion"
                  ▼
    ┌───────────────────────────┐
    │ javac emits d2i, l2i,     │
    │ i2b ... or checkcast      │
    └─────────────┬─────────────┘
                  ▼
    JVM converts the value at runtime
    (primitives: never throws; references:
     ClassCastException if the type is wrong)`,
          caption:
            "The compile-time decision for an assignment. Method calls follow the same idea without the constant rule.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "`javac` reaches an assignment, a method argument, a return, or an operator whose operand types don't match the expected type.",
            "Inside an expression, it applies numeric promotion first: `byte`, `short` and `char` operands become `int`, and mixed operands become the wider of the two.",
            "If the remaining conversion is widening (or boxing, in the right context), it's allowed silently. `javac` still emits the conversion instruction, like `i2l` or `i2d`.",
            "If it's narrowing, the code needs an explicit cast, or must be an `int` constant that fits in an assignment to `byte`, `short` or `char`. Otherwise it's the \"possible lossy conversion\" error, which is a semantic error at the attribution stage, the same stage that rejects `int x = \"hello\";`.",
            "With the cast present, `javac` emits the instruction (`d2i`, `l2i`, `i2b`...). For a reference type it emits `checkcast`.",
            "At runtime the execution engine runs the instruction on the operand stack. A primitive conversion always produces a value. A `checkcast` either passes the reference through unchanged or throws `ClassCastException`.",
          ],
        },
      ],
    },
    {
      title: "Where the Value Lives",
      blocks: [
        {
          type: "paragraph",
          text: "A cast doesn't create a new variable or a new object. For primitives it changes the value while it sits on the operand stack, between the load and the store. Here is the `Trace` example frame by frame, using the slot numbers `javap` showed:",
        },
        {
          type: "diagram",
          text: `main() frame
┌─────────────────────────────────────────────────┐
│ LOCAL VARIABLES                                 │
│   slot 0: args                                  │
│   slot 1-2: d = 9.99     (a double uses 2 slots)│
│   slot 3: i = 9                                 │
├─────────────────────────────────────────────────┤
│ OPERAND STACK                                   │
│   dload_1   push 9.99            [ 9.99 ]       │
│   d2i       pop 9.99, push 9     [ 9 ]          │
│   istore_3  pop 9 into slot 3    [ ]            │
└─────────────────────────────────────────────────┘`,
          caption:
            "d is never changed. The cast works on a copy of its value on the stack.",
        },
        {
          type: "paragraph",
          text: "A reference cast is different again. `(String) o` doesn't touch the object on the heap at all: `checkcast` checks that the object's class is `String` or a subtype, and then the same reference is used with a different static type. The object stays exactly the same.",
        },
      ],
    },
    {
      title: "Casting References",
      blocks: [
        {
          type: "paragraph",
          text: "My notes only covered primitives, but the same `(Type)` syntax works on references and means something quite different. Nothing is converted. An **upcast** (subclass to superclass or interface) is always safe and implicit. A **downcast** needs the cast, and the JVM checks it at runtime.",
        },
        {
          type: "code",
          language: "java",
          title: "ReferenceCasting.java",
          code: `public class ReferenceCasting {
    sealed interface Payment permits Card, Upi {}
    record Card(String last4) implements Payment {}
    record Upi(String vpa) implements Payment {}

    public static void main(String[] args) {
        Object o = "hello";                 // upcast: implicit
        String s = (String) o;              // downcast: checkcast at runtime
        System.out.println(s.length());

        if (o instanceof String str) {      // pattern matching, Java 16
            System.out.println(str.toUpperCase());
        }

        Payment p = new Upi("rider@okbank");
        System.out.println(describe(p));

        Object n = Integer.valueOf(42);
        try {
            String bad = (String) n;
        } catch (ClassCastException e) {
            System.out.println(e.getMessage());
        }
    }

    static String describe(Payment p) {
        return switch (p) {                 // pattern matching for switch, Java 21
            case Card c -> "card ending " + c.last4();
            case Upi u  -> "UPI " + u.vpa();
        };
    }
}`,
        },
        {
          type: "output",
          text: `5
HELLO
UPI rider@okbank
class java.lang.Integer cannot be cast to class java.lang.String (java.lang.Integer and java.lang.String are in module java.base of loader 'bootstrap')`,
        },
        {
          type: "paragraph",
          text: "The bytecode for the first part of `main` shows both reference instructions:",
        },
        {
          type: "output",
          text: `       0: ldc           #7                  // String hello
       2: astore_1
       3: aload_1
       4: checkcast     #9                  // class java/lang/String
       7: astore_2
...
      18: aload_1
      19: instanceof    #9                  // class java/lang/String
      22: ifeq          40
      25: aload_1
      26: checkcast     #9                  // class java/lang/String
      29: astore_3`,
        },
        {
          type: "list",
          items: [
            "The upcast `Object o = \"hello\"` produced no instruction at all. `astore_1` just stores the reference.",
            "`(String) o` is `checkcast`. It throws `ClassCastException` if the object isn't a `String`, otherwise leaves the reference on the stack untouched.",
            "The `instanceof` pattern compiles to `instanceof` followed by a `checkcast` that can't fail. Same work as the old two-line version, I just don't write the cast.",
            "The pattern `switch` in `describe` compiles to an `invokedynamic` `typeSwitch` call, then a `checkcast` in each branch. Because `Payment` is sealed, there's no `default`, and `javac` adds a branch that throws `MatchException` if a new subtype ever shows up at runtime.",
          ],
        },
        {
          type: "paragraph",
          text: "The compiler also rejects casts that can never succeed. `(Integer) \"text\"` is a compile error, because `String` and `Integer` are unrelated final classes. A cast from a non-final class to an interface compiles, since some subclass might implement it, but `(Runnable) \"text\"` doesn't, because `String` is final.",
        },
      ],
    },
    {
      title: "The Syntax in One Place",
      blocks: [
        {
          type: "code",
          language: "java",
          code: `// Widening: no cast
int i = 100;
long l = i;
double d = l;

// Narrowing: cast required
double price = 19.99;
int wholeDollars = (int) price;      // 19
long bigNumber = 10_000_000_000L;
int truncated = (int) bigNumber;     // 1410065408

// char and int
char letter = 'A';
int code = letter;                   // 65
char next = (char) 66;               // 'B'

// Cast binds tighter than arithmetic
double half = (double) 7 / 2;        // 3.5
int sum = (int) (2.6 + 2.6);         // 5, cast applies to the whole sum
int parts = (int) 2.6 + (int) 2.6;   // 4

// References
Object o = "text";                   // upcast, implicit
String s = (String) o;               // downcast, checked at runtime
if (o instanceof String str) {
    System.out.println(str.length());
}`,
        },
        {
          type: "paragraph",
          text: "I compiled this inside a `main` and printed every variable to check the comments. The precedence lines are the ones I'd get wrong under pressure: a cast applies only to the operand right after it, so I add parentheses whenever I mean the whole expression.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The basics, including negatives",
        },
        {
          type: "code",
          language: "java",
          title: "CastingBasics.java",
          code: `public class CastingBasics {
    public static void main(String[] args) {
        int a = 10;
        double b = a;               // widening: automatic
        System.out.println(b);

        double c = 9.99;
        int d = (int) c;            // narrowing: explicit cast
        System.out.println(d);

        System.out.println((int) -9.99);   // toward zero, not down
        System.out.println((int) 4.999999);
    }
}`,
        },
        {
          type: "output",
          text: `10.0
9
-9
4`,
        },
        {
          type: "paragraph",
          text: "`(int) -9.99` is `-9`, not `-10`. The cast truncates **toward zero**, which is not the same as rounding down (`Math.floor`) for negative numbers.",
        },
        {
          type: "heading",
          text: "Rounding, and narrowing that fails loudly",
        },
        {
          type: "paragraph",
          text: "When I want rounding or a range check instead of truncation, the JDK already has methods for it:",
        },
        {
          type: "code",
          language: "java",
          title: "SafeNarrowing.java",
          code: `import java.time.Instant;

public class SafeNarrowing {
    public static void main(String[] args) {
        long millis = Instant.parse("2026-10-07T00:00:00Z").toEpochMilli();
        System.out.println(millis);
        System.out.println((int) millis);                    // silent garbage
        System.out.println(Instant.ofEpochMilli((int) millis));

        System.out.println(Math.round(4.999999));            // long
        System.out.println(Math.round(2.5) + " " + Math.round(-2.5));
        System.out.println((int) Math.floor(-9.99) + " " + (int) Math.ceil(9.01));

        System.out.println(Math.toIntExact(1_000L));
        try {
            Math.toIntExact(millis);
        } catch (ArithmeticException e) {
            System.out.println("ArithmeticException: " + e.getMessage());
        }

        System.out.println(Instant.ofEpochSecond(Integer.MAX_VALUE));
        System.out.println(Instant.ofEpochSecond(Integer.MAX_VALUE + 1));
    }
}`,
        },
        {
          type: "output",
          text: `1791331200000
329837568
1970-01-04T19:37:17.568Z
5
3 -2
-10 10
1000
ArithmeticException: integer overflow
2038-01-19T03:14:07Z
1901-12-13T20:45:52Z`,
        },
        {
          type: "list",
          items: [
            "A timestamp in epoch milliseconds for October 2026 cast to `int` turned into a date in January 1970. No error anywhere.",
            "`Math.round(double)` returns a `long` and rounds half up: `2.5` gives `3`, `-2.5` gives `-2`. `Math.round(float)` returns an `int`.",
            "`Math.toIntExact` does the range check a cast skips, and throws `ArithmeticException: integer overflow`. `Math.addExact` and `Math.multiplyExact` do the same for arithmetic.",
            "The last two lines are the Year 2038 problem in two lines of Java. `Integer.MAX_VALUE` seconds after the epoch is `2038-01-19T03:14:07Z`. One more second, computed in `int`, wraps to a date in 1901.",
          ],
        },
        {
          type: "heading",
          text: "Casting boxed numbers",
        },
        {
          type: "paragraph",
          text: "This one shows up whenever data comes back as `Object`, like a `Map<String, Object>` from parsed JSON. A cast between wrapper types is a reference cast, so it checks the actual class:",
        },
        {
          type: "code",
          language: "java",
          title: "BoxedCasts.java",
          code: `import java.util.Map;

public class BoxedCasts {
    public static void main(String[] args) {
        Map<String, Object> json = Map.of("id", 42, "total", 1999.5);

        int id = (int) json.get("id");                       // checkcast Integer, then unbox
        long viaNumber = ((Number) json.get("id")).longValue();
        System.out.println(id + " " + viaNumber);

        try {
            long bad = (Long) json.get("id");                // it's an Integer, not a Long
        } catch (ClassCastException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `42 42
class java.lang.Integer cannot be cast to class java.lang.Long (java.lang.Integer and java.lang.Long are in module java.base of loader 'bootstrap')`,
        },
        {
          type: "paragraph",
          text: "`javap` shows `(int) json.get(\"id\")` as `checkcast java/lang/Integer` then `Integer.intValue()`, and `(Long) ...` as `checkcast java/lang/Long`, which fails. An `Integer` holding `42` is not a `Long`, even though `int` to `long` is a widening conversion. Casting to `Number` and calling `longValue()` works for any numeric wrapper.",
        },
        {
          type: "heading",
          text: "Promotion in overload resolution",
        },
        {
          type: "paragraph",
          text: "Conversions also decide which overloaded method gets called. `javac` looks for a match in three phases (JLS 15.12.2): first using only widening, then allowing boxing and unboxing, then allowing varargs. It stops at the first phase that finds anything, and picks the most specific method in that phase.",
        },
        {
          type: "code",
          language: "java",
          title: "Overloads.java",
          code: `public class Overloads {
    static void m(long x)    { System.out.println("m(long)"); }
    static void m(Integer x) { System.out.println("m(Integer)"); }
    static void m(int... x)  { System.out.println("m(int...)"); }

    static void n(short x)   { System.out.println("n(short)"); }
    static void n(int x)     { System.out.println("n(int)"); }
    static void n(double x)  { System.out.println("n(double)"); }

    public static void main(String[] args) {
        m(5);           // widening beats boxing beats varargs
        byte b = 1;
        n(b);           // byte -> short is the most specific widening
        n('x');         // char -> int (char never widens to short)
        n(5L);          // long -> double
    }
}`,
        },
        {
          type: "output",
          text: `m(long)
n(short)
n(int)
n(double)`,
        },
        {
          type: "paragraph",
          text: "`m(5)` picked `m(long)` over `m(Integer)`, even though `Integer` looks like the closer match. Phase 1 already found `m(long)` through widening, so boxing was never considered. This rule exists so that code written before Java 5 kept calling the same methods after autoboxing was added.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Expecting a cast to round",
        },
        {
          type: "paragraph",
          text: "`(int) 9.99` is `9` and `(int) 4.999999` is `4`. A cast truncates toward zero, the same direction as integer division from the Operators lesson. For rounding I use `Math.round`, and for money I don't use `double` at all.",
        },
        {
          type: "heading",
          text: "Forgetting that narrowing can change the value completely",
        },
        {
          type: "paragraph",
          text: "Losing a fraction is the mild case. An integer that doesn't fit keeps only its low bits, so `10_000_000_000L` becomes `1410065408` and `200` as a `byte` becomes `-56`. These look like valid numbers, which is what makes them hard to catch.",
        },
        {
          type: "heading",
          text: "Casting after the overflow already happened",
        },
        {
          type: "paragraph",
          text: "`long total = million * million;` gave `-727379968`. The fix is to make one operand `long` **before** the multiplication: `(long) million * million`. `(long) (million * million)` is still wrong, because the cast applies to the already-overflowed `int`.",
        },
        {
          type: "heading",
          text: "Missing the hidden cast in +=",
        },
        {
          type: "paragraph",
          text: "`total += 2.7` on an `int` compiles and gives `7`. `b += 300` on a `byte` gives `54`. Compound assignment narrows without a visible cast, so code review won't spot it as easily as `(int)`.",
        },
        {
          type: "heading",
          text: "Mixing up boxing and widening",
        },
        {
          type: "paragraph",
          text: "`Long id = 5;` doesn't compile (\"int cannot be converted to Long\"), and `(Long) obj` throws when `obj` is an `Integer`. Boxing only goes to the matching wrapper. `Long id = 5L;` and `((Number) obj).longValue()` are the fixes.",
        },
        {
          type: "heading",
          text: "Assuming widening never loses anything",
        },
        {
          type: "paragraph",
          text: "`int` to `float` and `long` to `double` compile silently and can round. A `long` database ID passed through a `double` (or through JSON parsed by something that uses doubles, like JavaScript) can come back off by one past 2^53.",
        },
        {
          type: "heading",
          text: "Adding casts that do nothing",
        },
        {
          type: "paragraph",
          text: "`double d = (double) i;` is harmless but noise. I checked: it compiles to exactly the same bytecode as `double d = i;`. I'd rather keep casts for places where they mean something, so a reader takes each one seriously.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Never narrow just to make the compiler happy. If the value might not fit, use `Math.toIntExact` (or check the range) so an overflow becomes an exception instead of bad data.",
            "Use `long` for IDs, counters that grow, epoch milliseconds and anything summed over time. `int` tops out at about 2.1 billion, and `java.time` already uses `long` for this reason.",
            "When a narrowing cast really is intended, leave a short comment saying why the loss is acceptable, like \"percent is 0-100, fits in byte\".",
            "Put the cast on the operand, not on the result: `(long) a * b`, `(double) sum / count`.",
            "Watch compound assignments on `byte`, `short`, `char` and `int` when the right side is wider. They narrow silently.",
            "For money, use `long` minor units (cents, paise) or `BigDecimal`. Casting a `double` amount to `int` truncates, and the `double` was probably inexact to begin with.",
            "For references, prefer `instanceof` patterns and `switch` patterns over a separate check and cast. They can't drift apart, and the compiler checks exhaustiveness for sealed types.",
            "Read numbers out of `Object` containers through `Number` (`((Number) v).longValue()`) instead of casting to a specific wrapper.",
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
            "Primitive conversions are cheap. After JIT compilation, most become a single CPU instruction (a sign extension for `i2l`, a register move for `l2i`), or disappear when the JIT can work with the low bits directly.",
            "Floating-to-integer conversions cost a little more. On x86-64, HotSpot compiles `d2i` to a `cvttsd2si` instruction plus a check for the special cases, because the hardware result for `NaN` or an out-of-range value isn't what Java requires. It's still nanoseconds.",
            "A redundant widening cast costs nothing, because the bytecode is identical with or without it. Removing it is about readability only.",
            "`checkcast` is usually very cheap. HotSpot caches the result of type checks and often removes the cast entirely when it can prove the type, for example inside a generic loop over a `List<String>`.",
            "Boxing is the one that actually costs something: an allocation for values outside the `Integer` cache range (-128 to 127), plus pointer chasing on unboxing. In hot loops I keep numbers primitive.",
          ],
        },
      ],
    },
    {
      title: "Type Casting in Production",
      blocks: [
        {
          type: "list",
          items: [
            "**IDs and keys:** JPA entities usually use `Long` for `@Id`, and database `BIGINT` maps to `long`. Code that casts these to `int` (for an array index, a legacy API, a hash) is where silent truncation shows up once the table passes `Integer.MAX_VALUE` rows.",
            "**Time:** `System.currentTimeMillis()`, `Instant.toEpochMilli()` and `Duration.toMillis()` all return `long`. Anything that stores epoch seconds in a signed 32-bit field hits the Year 2038 limit I printed above.",
            "**Pagination and sizes:** `Page.getTotalElements()` in Spring Data is a `long`, while `Collection.size()` is an `int`. Converting between them is a place to use `Math.toIntExact`.",
            "**JSON:** with an untyped `Map<String, Object>`, the numeric type you get back depends on the value and the parser settings. Jackson, by default, produces an `Integer` for small whole numbers and a `Long` only when needed, so `(Long) map.get(\"id\")` fails for small IDs. Binding to a typed DTO avoids the question.",
            "**Reference casts in frameworks:** `javac` inserts `checkcast` wherever generic code returns a type variable, which is why a heap-polluted collection fails far from where the bad element went in. In application code, sealed interfaces with pattern `switch` replace a lot of `instanceof` chains.",
            "**Money:** amounts kept as `long` minor units or `BigDecimal`. A `double` price cast to `int` is a bug that only shows up in reconciliation.",
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
              question: "What is type casting?",
              answer:
                "Converting a value from one type to another. Some conversions happen automatically, like `int` to `double`. Others need an explicit cast, `(int) someDouble`, because they can lose information.\n\nIt isn't just a compile-time label. When I ran `javap -c` on `int i = (int) d;`, the cast was a real instruction, `d2i`, between the load and the store.",
            },
            {
              question: "What's the difference between widening and narrowing conversion?",
              answer:
                "Widening goes to a type with a bigger range, like `int` to `long` or `char` to `int`. Narrowing goes to a smaller one, like `double` to `int` or `int` to `byte`.\n\nWidening is allowed implicitly and never throws. Narrowing needs a cast and can change the value: `(int) 10_000_000_000L` gave me `1410065408`.",
            },
            {
              question: "Does widening conversion require an explicit cast?",
              answer:
                "No. `long l = i;` or `double d = i;` compile as they are. Writing `(double) i` anyway is allowed, and I checked that it produces exactly the same bytecode.\n\nOne caveat I'd add: \"widening\" doesn't mean lossless. `int` to `float` turned `16777217` into `16777216` without a cast.",
            },
            {
              question: "Does narrowing conversion require an explicit cast?",
              answer:
                "Yes, with one exception. In an assignment, an `int` constant that fits can go to `byte`, `short` or `char` without a cast, so `byte b = 10;` is fine but `byte b = 200;` isn't.\n\nCompound assignment is the other place narrowing happens without a visible cast: `b += 300` on a `byte` compiled and gave `54`, because `+=` includes a cast to the left side's type.",
            },
            {
              question: "What does `(int) 9.99` evaluate to?",
              answer:
                "`9`. The cast drops the fractional part.\n\nAnd `(int) -9.99` is `-9`, not `-10`, which is the detail people miss. I ran both.",
            },
            {
              question: "Does a narrowing cast round or truncate?",
              answer:
                "It truncates toward zero. `(int) 4.999999` is `4`. That's the JLS rule for floating to integer conversion, and it's what `d2i` does.\n\nFor rounding I'd use `Math.round`, which gave `5` for `4.999999`, or `Math.floor` and `Math.ceil` for a specific direction.",
            },
            {
              question: "What's the widening order from smallest to largest for the numeric types?",
              answer:
                "`byte` to `short` to `int` to `long` to `float` to `double`, with `char` joining at `int`. Any type can widen to anything to its right, which gives 19 widening conversions in total.\n\n`char` is the odd one: it doesn't widen to or from `byte` or `short`, because `char` is unsigned and those are signed.",
            },
            {
              question: "Is converting `char` to `int` widening or narrowing?",
              answer:
                "Widening. A `char` is an unsigned 16-bit number, and every value from 0 to 65535 fits in an `int`. So `int code = 'A';` compiles and gives `65`.\n\nIt's also why `'A' + 1` is `66` rather than `'B'`: the `char` is promoted to `int` before the addition.",
            },
            {
              question: "Is converting `int` to `char` widening or narrowing?",
              answer:
                "Narrowing, so it needs a cast: `(char) 66` is `'B'`.\n\nIt keeps the low 16 bits and checks nothing else. `(char) 65601` printed `A` for me, because 65601 is 65536 + 65, and `(char) -1` is 65535.",
            },
            {
              question: "What happens if you try a narrowing conversion without a cast?",
              answer:
                "It's a compile error, not a runtime one. `int whole = price;` with a `double` gave \"incompatible types: possible lossy conversion from double to int\".\n\nThe same message shows up in less obvious places, like `byte sum = a + b;` where both are bytes, because the sum is an `int`.",
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
              question: "Why does Java require explicit casts for narrowing but not for widening?",
              answer:
                "Because narrowing can change the value and widening can't change its magnitude. Java forces the risky direction to be written down, so it's visible in the code and a reviewer can question it. C does the opposite and lets `int x = someLong;` through.\n\nThe cast is purely a compile-time permission, though. It doesn't add any checking at runtime: `(int) 10_000_000_000L` still silently gave `1410065408`.",
            },
            {
              question: "What's the difference between casting and type promotion in `int + double`?",
              answer:
                "Promotion is automatic widening inside an expression, before the operator runs. In `5 + 2.0`, the `int` is promoted to `double` and the result is `7.0`. A cast is something I write, and it can go in either direction.\n\nPromotion has its own rule that catches people: `byte`, `short` and `char` always promote to at least `int`. `byte + byte` is an `int`, which I confirmed by printing the boxed type of a `var`.",
            },
            {
              question: "Trace the bytecode for converting a `double` to an `int`.",
              answer:
                "For `int i = (int) d;` I got `dload_1`, `d2i`, `istore_3`. Load the `double` from its local slot onto the operand stack, `d2i` pops it and pushes the truncated `int`, then store it.\n\nThe store went to slot 3, not 2, because `d` took slots 1 and 2: a `double` uses two local variable slots. And for `(byte) d` there's no single instruction, it's `d2i` followed by `i2b`.",
            },
            {
              question: "What happens when you cast a `long` that exceeds `int`'s range to `int`? Does it throw?",
              answer:
                "No exception. `l2i` keeps the low 32 bits and discards the rest. `10_000_000_000L` is `0x2540BE400`, and the cast gave `0x540BE400`, which is `1410065408`.\n\nIf you want an exception, `Math.toIntExact` does the range check and throws `ArithmeticException: integer overflow`.",
            },
            {
              question: "Why is long-to-int overflow more dangerous than decimal truncation?",
              answer:
                "Truncation is predictable and small: you lose less than 1. Overflow gives a value with no visible relation to the input, sometimes with the opposite sign. `2147483648L` cast to `int` is `-2147483648`.\n\nIt's also hard to spot in logs because the result looks valid. My October 2026 timestamp cast to `int` became a plausible-looking number that decoded to a date in January 1970.",
            },
            {
              question: "Why can a `char` be widened to `int` automatically if it represents a character?",
              answer:
                "Because at the language level a `char` is a number, an unsigned 16-bit UTF-16 code unit. The character is just how it's printed. Every possible `char` value fits in an `int`, so nothing can be lost.\n\nIn the JVM there isn't even a separate `char` type on the operand stack. A `char` local is loaded with `iload` like an `int`, and only narrowing back needs `i2c`.",
            },
            {
              question: "What compiler error do you get for a missing narrowing cast?",
              answer:
                "\"incompatible types: possible lossy conversion from X to Y\", for example \"from double to int\" or \"from int to byte\".\n\nA related one that looks similar but isn't narrowing: `Long id = 5;` gives \"incompatible types: int cannot be converted to Long\", because assignment can't widen and box in one step.",
            },
            {
              question: "Why does an unnecessary explicit cast on a widening conversion cause no harm?",
              answer:
                "Because `javac` emits the same conversion instruction either way. I compiled `double d = i;` and `double d = (double) i;` and both methods were `iload_0`, `i2d`, `dstore_1`.\n\nThe only cost is readability. Explicit casts signal \"something risky happens here\", so redundant ones make the real ones easier to miss.",
            },
            {
              question: "How does numeric promotion relate to the widening rules?",
              answer:
                "Promotion is built from widening conversions. Binary numeric promotion picks a common type (`double`, else `float`, else `long`, else `int`) and widens each operand to it using the same widening conversions as assignment. Unboxing is applied first if an operand is a wrapper.\n\nSo `int * int` stays `int` even when assigned to a `long`. That's why `long wrong = million * million;` printed `-727379968`, and `(long) million * million` printed `1000000000000`.",
            },
            {
              question: "Give a real-world example where choosing `long` over `int` prevents an overflow bug.",
              answer:
                "Timestamps. Epoch seconds in a signed `int` run out at `2038-01-19T03:14:07Z`, and I printed that one second later wraps to 1901. Epoch milliseconds don't fit in an `int` at all today.\n\nPrimary keys are the other one. An auto-increment `int` ID column fails at about 2.1 billion rows, and migrating a live table and every service that reads it is far more expensive than using `BIGINT` and `long` from the start.",
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
              question: "Why does narrowing a `long` to an `int` produce a wrapped value instead of an exception?",
              answer:
                "Because the JLS defines narrowing between integer types as discarding the high-order bits, and the `l2i` instruction does exactly that. There's no range check in the instruction, so there's nothing that could throw. It's the same choice as integer arithmetic overflow in Java, which also wraps silently.\n\nThe design reason is cost and predictability: it's one CPU instruction with a fully defined result. If I want a check, I opt in with `Math.toIntExact`.",
            },
            {
              question: "What's the bit-level mechanism behind long-to-int overflow?",
              answer:
                "The low 32 bits of the 64-bit two's complement value are kept and read as a signed 32-bit two's complement `int`. Mathematically the result is the value modulo 2^32, shifted into the range -2^31 to 2^31 - 1.\n\nI printed it in hex: `00000002540be400` became `540be400`. When bit 31 of the kept half is 1, the result is negative, like `0x80000000` becoming `-2147483648`.",
            },
            {
              question: "Compare Java's mandatory narrowing casts with C's implicit narrowing. What bugs does Java's approach prevent?",
              answer:
                "C allows `int x = someLong;` or `int n = 3.9;` implicitly, so a type change somewhere else (a function that now returns `long`) silently truncates at every call site. Java turns each of those into a compile error until someone writes a cast, so the data loss shows up in a diff.\n\nJava also defines the results. In C an out-of-range `double` to `int` is undefined behaviour. In Java it clamps: `(int) 3e10` was `2147483647` and `(int) NaN` was `0`, on any platform. What Java doesn't prevent is the wrong value itself once the cast is written.",
            },
            {
              question: "Explain the JVM's conversion instruction family and why each direction needs its own instruction.",
              answer:
                "There are 15: `i2l`, `i2f`, `i2d`, `l2i`, `l2f`, `l2d`, `f2i`, `f2l`, `f2d`, `d2i`, `d2l`, `d2f`, plus `i2b`, `i2c` and `i2s`. JVM bytecode is typed: `iadd` and `dadd` are different instructions, and the verifier tracks whether a stack slot holds an `int`, `long`, `float` or `double`, which also differ in size. So every conversion between those four needs its own instruction with a defined rule.\n\nThe last three exist because `byte`, `short` and `char` are `int`s on the stack. Narrowing to them just truncates and re-extends an `int`. That's why `(byte) d` compiled to `d2i` then `i2b`.",
            },
            {
              question: "How does type promotion interact with method overloading resolution?",
              answer:
                "`javac` resolves overloads in three phases: widening only, then boxing and unboxing, then varargs, and it stops at the first phase with a match. Within a phase it picks the most specific method.\n\nI tested `m(5)` with `m(long)`, `m(Integer)` and `m(int...)`, and it called `m(long)`. A `byte` argument picked `n(short)` over `n(int)`, and a `char` went to `n(int)`, because `char` doesn't widen to `short`. The ordering exists so that old code didn't change behaviour when boxing arrived in Java 5.",
            },
            {
              question: "Why is an explicit cast a \"compiler contract\"? What is the programmer promising?",
              answer:
                "For primitives, I'm promising that either the value fits, or the loss is what I want. The compiler accepts that and adds no check, so if I'm wrong the result is silently wrong.\n\nFor references, I'm promising the object really is of that type, but this time the JVM verifies it with `checkcast` and throws `ClassCastException` if I'm wrong. So the same syntax is an unchecked promise for primitives and a checked one for references.",
            },
            {
              question: "Describe a realistic scenario where an int-to-long migration was needed because of an approaching limit.",
              answer:
                "The classic one is the Year 2038 problem. Unix systems stored time as signed 32-bit seconds since 1970, and that runs out at `2038-01-19T03:14:07Z`. I printed it with `Instant.ofEpochSecond(Integer.MAX_VALUE)`, and one more second in `int` arithmetic gave 1901. The fix across operating systems and file formats has been moving to 64-bit time.\n\nThe same pattern hits application databases with `INT` auto-increment keys. The migration means changing the column to `BIGINT`, every entity field to `long`, every API contract, and every place that cast the ID to `int`, ideally well before the counter reaches 2.1 billion.",
            },
            {
              question: "How does casting differ for primitive types versus reference types?",
              answer:
                "A primitive cast converts the value into a new representation with an instruction like `d2i`. It's never checked and never throws. A reference cast converts nothing. The object stays the same, and `checkcast` only verifies that it's an instance of the target type, throwing `ClassCastException` if not.\n\nUpcasts are free: `Object o = \"hello\"` produced no instruction at all in my `javap` output. Since Java 16 and 21, `instanceof` and `switch` patterns do the check and the cast together, and they compile to `instanceof` or `typeSwitch` plus a `checkcast` that can't fail.",
            },
            {
              question: "Why is a float-to-int cast truncation and not rounding? What would rounding require?",
              answer:
                "Because the JLS defines it as rounding toward zero, the same as integer division, and that maps directly to hardware truncating instructions like x86's `cvttsd2si`. It's also the behaviour C programmers expected.\n\nRounding is a separate operation you call explicitly. `Math.round` returns the closest whole number with ties going toward positive infinity, so `2.5` gives `3` and `-2.5` gives `-2`, and `Math.rint` rounds half to even. A cast that rounded would need an extra step before the conversion, and it would quietly change the meaning of decades of code.",
            },
            {
              question: "How would you defend against narrowing overflow with user-supplied large numbers?",
              answer:
                "Validate at the boundary and avoid narrowing in the first place. Parse into `long` or `BigInteger`/`BigDecimal`, check the allowed range with Bean Validation (`@Min`, `@Max`) or explicit checks, and reject bad input with a 400 instead of truncating.\n\nWhere narrowing is unavoidable, I'd use `Math.toIntExact`, `Math.addExact` and `Math.multiplyExact`, which throw `ArithmeticException` instead of wrapping. I saw `toIntExact` reject my epoch-millis value with \"integer overflow\" where the plain cast silently produced 1970.",
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
              question: "A colleague casts a `long` timestamp to `int` \"to save memory\", and the system starts producing strange dates. What happened?",
              answer:
                "Epoch milliseconds are around 1.79 trillion today, far past `Integer.MAX_VALUE`. The cast kept only the low 32 bits. When I tried it, `2026-10-07T00:00:00Z` in milliseconds became `329837568`, which decodes to `1970-01-04T19:37:17.568Z`.\n\nThe saving is 4 bytes per value, which almost never matters. I'd revert to `long`. If memory really is a concern, store a smaller unit relative to a known base and check it with `Math.toIntExact`, but not a raw cast.",
            },
            {
              question: "You see `int result = (int) someDouble;` in a PR with no comment. What do you ask the author?",
              answer:
                "Whether truncation toward zero is really what they want. For negatives it's not floor: `(int) -9.99` is `-9`. If they meant rounding, it should be `Math.round`, and if they meant floor, `Math.floor`.\n\nThen the range: what happens for `NaN`, for infinity, or for a value above about 2.1 billion? The cast gives `0` or clamps to `Integer.MAX_VALUE` without any error. And if the double is money, the bigger question is why it's a `double`.",
            },
            {
              question: "Someone expects `(int) 4.999999` to be 5 but gets 4. Explain, and how to round properly.",
              answer:
                "The cast doesn't round, it truncates toward zero, so anything from 4.0 up to just under 5.0 becomes 4. That's `d2i`, by definition in the JLS.\n\nFor rounding, `Math.round(4.999999)` gave `5`. It returns a `long` for a `double` argument, so `(int) Math.round(x)` or `Math.toIntExact(Math.round(x))` if it has to be an `int`. For money with specific rounding rules, `BigDecimal.setScale` with a `RoundingMode`.",
            },
            {
              question: "Why does `double d = 5;` compile but `int i = 5.0;` doesn't?",
              answer:
                "`int` to `double` is a widening conversion, which assignment allows. `double` to `int` is narrowing, and assignment only allows narrowing for `int` constants going to `byte`, `short` or `char`. A `double` constant doesn't qualify, even `5.0`, which happens to be a whole number.\n\nThe compiler judges by type, not value. `int i = 5.0;` gives \"possible lossy conversion from double to int\", and `int i = (int) 5.0;` fixes it.",
            },
            {
              question: "Your system stores user IDs as `int` and just passed 2 billion users. What's about to happen, and what should have been done?",
              answer:
                "At 2,147,483,647 the next ID doesn't fit. Depending on where it fails, the database rejects the insert with an out-of-range error, or a sequence in Java code wraps to `-2147483648` and starts creating negative or colliding IDs. Anything that cast a `long` ID down to `int` breaks earlier.\n\nIt should have been `BIGINT` and `long` from the start, which is what JPA's `Long` ID convention gives you. Now it needs a staged migration: widen the column, update every service and client contract, and use `Math.toIntExact` anywhere an `int` remains so the failures are loud.",
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
            "Write `TypeCastingDemo.java` that widens an `int` to a `double` without a cast and prints it.",
            "Narrow a `double` with a fractional part to an `int` with a cast, and print the truncated result.",
            "Cast a `long` that's clearly bigger than `Integer.MAX_VALUE` to `int` and print the wrapped value.",
            "Convert a `char` to an `int` (no cast) and an `int` back to a `char` (with a cast).",
            "Add a comment to each part saying what kind of conversion it is and why a cast was or wasn't needed. Then run `javap -c` on it and find `i2d`, `d2i`, `l2i` and `i2c`.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "TypeCastingDemo.java (my solution)",
          code: `public class TypeCastingDemo {
    public static void main(String[] args) {
        // 1. Widening int -> double: every int fits in a double, so no cast
        int trips = 42;
        double tripsAsDouble = trips;
        System.out.println("int -> double:  " + tripsAsDouble);

        // 2. Narrowing double -> int: the fraction can't fit, so a cast is required
        double fare = 249.75;
        int wholeFare = (int) fare;
        System.out.println("double -> int:  " + wholeFare);

        // 3. Narrowing long -> int: value too big, the cast keeps only the low 32 bits
        long bigCount = 5_000_000_000L;
        int wrapped = (int) bigCount;
        System.out.println("long -> int:    " + wrapped);

        // 4. char -> int is widening (no cast); int -> char is narrowing (cast)
        char grade = 'A';
        int gradeCode = grade;
        char next = (char) (gradeCode + 1);
        System.out.println("char -> int:    " + gradeCode);
        System.out.println("int -> char:    " + next);
    }
}`,
        },
        {
          type: "output",
          text: `int -> double:  42.0
double -> int:  249
long -> int:    705032704
char -> int:    65
int -> char:    B`,
        },
        {
          type: "paragraph",
          text: "What to expect: the widened `int` prints with a `.0`, `249.75` becomes `249`, and `5_000_000_000L` becomes `705032704` (5,000,000,000 minus 2^32). `'A'` is `65`, and `(char) 66` is `B`. Note the parentheses in `(char) (gradeCode + 1)`: without them the cast only applies to `gradeCode`, and the sum is an `int` again.",
        },
      ],
    },
    {
      title: "Mini Project: A Small Calculator",
      blocks: [
        {
          type: "paragraph",
          text: "The last exercise of this group of lessons pulls together variables, operators and casting: two `double` operands, all four operators, an integer division next to the `double` version, a ternary, and one narrowing cast with a reason.",
        },
        {
          type: "code",
          language: "java",
          title: "SimpleCalculator.java",
          code: `public class SimpleCalculator {
    public static void main(String[] args) {
        double x = 17.5;
        double y = 4.0;

        System.out.println(x + " + " + y + " = " + (x + y));
        System.out.println(x + " - " + y + " = " + (x - y));
        System.out.println(x + " * " + y + " = " + (x * y));
        System.out.println(x + " / " + y + " = " + (x / y));

        int a = 17;
        int b = 4;
        System.out.println("int    17 / 4 = " + (a / b));            // truncated
        System.out.println("double 17 / 4 = " + ((double) a / b));   // cast one operand first

        String larger = x > y ? "x" : "y";
        System.out.println("larger: " + larger);

        // Narrowing on purpose: the display only shows whole units,
        // and (int) drops the fraction toward zero
        int wholeQuotient = (int) (x / y);
        System.out.println("whole units: " + wholeQuotient);
    }
}`,
        },
        {
          type: "output",
          text: `17.5 + 4.0 = 21.5
17.5 - 4.0 = 13.5
17.5 * 4.0 = 70.0
17.5 / 4.0 = 4.375
int    17 / 4 = 4
double 17 / 4 = 4.25
larger: x
whole units: 4`,
        },
        {
          type: "list",
          items: [
            "The parentheses around `(x + y)` matter. Without them, string concatenation runs left to right and appends `17.5` and `4.0` as text.",
            "`(double) a / b` casts `a` first, so the division is done in `double`. `(double) (a / b)` would give `4.0`.",
            "`(int) (x / y)` needs the outer parentheses too. `(int) x / y` would cast only `x` to `17`, and `17 / 4.0` is a `double` again. I tried it: \"possible lossy conversion from double to int\".",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WIDENING   byte → short → int → long → float → double
           char → int        no cast, never throws
           int→float, long→float/double can lose precision

NARROWING  needs (T) value   compile error without it:
           "possible lossy conversion from X to Y"
           except int constants that fit: byte b = 10;
           and compound assignment: b += 300 → (byte)

RESULTS    double → int   toward zero: (int) -9.99 = -9
                          NaN → 0, too big → MAX/MIN
           long → int     keep low 32 bits: wraps
           (byte) 300.0   d2i then i2b = 44

PROMOTION  byte/short/char → int before any arithmetic
           mixed → widest; int*int overflows BEFORE
           assignment to long: cast an operand

BYTECODE   i2l i2f i2d l2i l2f l2d f2i f2l f2d
           d2i d2l d2f i2b i2c i2s   (15 total)
REFERENCE  upcast: nothing   downcast: checkcast
           instanceof / switch patterns (16 / 21)

SAFE       Math.round  Math.toIntExact  *Exact ops`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Two different narrowing risks: losing the fraction (truncation) and losing the high bits (wraparound, or clamping for floating values). Interviewers like hearing both named.",
            "A primitive cast is an unchecked promise. A reference cast is a checked one.",
            "When the value might not fit, `Math.toIntExact` turns silent bad data into an exception.",
          ],
        },
      ],
    },
  ],
};
