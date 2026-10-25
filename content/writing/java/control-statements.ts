import type { Lesson } from "../types";

export const controlStatements: Lesson = {
  slug: "control-statements",
  date: "2026-10-12",
  title: "Control Statements",
  description:
    "How Java decides which code runs: if, else-if chains and switch in its classic, arrow, expression and pattern-matching forms, and what each one turns into in bytecode.",
  tags: ["Core Java", "Control Flow", "Switch", "Bytecode"],
  sections: [
    {
      title: "What Control Statements Are",
      blocks: [
        {
          type: "paragraph",
          text: "Every program in the earlier lessons ran top to bottom, one statement after another. That stops being enough the moment a program has to react to its input. A login check has to compare a password, a dispatch service has to check whether a driver is free, a payment has to check the balance. Control statements are how code does something different depending on a value it only knows at runtime.",
        },
        {
          type: "paragraph",
          text: "A **control statement** changes the normal sequential flow: it picks one block of code over another, skips code, or (in the next lesson) repeats it. This lesson covers the **selection** statements, the ones that choose: `if`, `if-else`, `else if` chains, and `switch`. Since Java 14 `switch` can also be an **expression** that produces a value, and since Java 21 it can match on the type and shape of an object, not just on a constant.",
        },
        {
          type: "paragraph",
          text: "I had been using `if` all along without thinking about it, including the `if (false)` trick in the Class Loading lesson. What I wanted from this lesson was the precise rules (what a condition may be, what a `switch` can switch on, when fall-through happens) and what the compiler actually turns them into. The answer to the second one is pleasantly simple: jumps.",
        },
      ],
    },
    {
      title: "Where They Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Conditional branching is as old as programmable computers. At the machine level it has always been a **conditional jump**: compare something, and if the result is right, continue at a different address. Every high-level `if` since FORTRAN and ALGOL is sugar over that.",
        },
        {
          type: "paragraph",
          text: "Java took its `if`, `else` and `switch` syntax almost verbatim from C, the same way it took its operators: the goal was that C and C++ programmers could read Java on day one. It also took C's `switch` semantics, including **fall-through**: a `case` label is only an entry point, and without a `break` execution keeps going into the next case. That behaviour has caused bugs in C code for decades, and Java kept it anyway for familiarity.",
        },
        {
          type: "paragraph",
          text: "`switch` is the control statement that changed the most over Java's life:",
        },
        {
          type: "table",
          headers: ["Version", "Change"],
          rows: [
            ["Java 1.0", "`switch` on `int` and the types that widen to it: `char`, `byte`, `short`"],
            ["Java 5", "`switch` on enums, and on the wrappers `Character`, `Byte`, `Short`, `Integer` (unboxed)"],
            ["Java 7", "`switch` on `String`"],
            ["Java 12, 13", "Switch expressions and arrow labels as a preview (JEP 325, then JEP 354, which added `yield`)"],
            ["Java 14", "Switch expressions final (JEP 361)"],
            ["Java 17 to 20", "Pattern matching for `switch` in preview"],
            ["Java 21", "Pattern matching for `switch` (JEP 441) and record patterns (JEP 440) final, plus `case null`"],
          ],
        },
        {
          type: "paragraph",
          text: "Notice that Java 14 didn't fix the classic switch. It added a second form next to it. Changing what `case 1:` does without a `break` would have silently changed the behaviour of millions of lines of existing code, so the old form stays exactly as it was and the arrow form is the opt-in safe one.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a fork in a hiking trail with signposts.",
        },
        {
          type: "list",
          items: [
            "`if` is a sign with one condition: \"If it's raining, take the covered path.\" If it isn't raining, I just keep walking the main trail.",
            "`if-else` is a sign with exactly two options: covered path if raining, scenic path otherwise. Exactly one of them is taken, never both, never neither.",
            "An `else if` chain is a list of signs read in order: raining, path A; else very hot, path B; else windy, path C; otherwise the default path. I take the **first** sign that matches and stop reading, even if a later one would also have matched.",
            "A classic `switch` is a board of numbered gates for one value, like the day of the week. I go straight to the matching gate. The catch: the gates open into one shared corridor. Unless there's a wall (`break`), I keep walking past the next gates too.",
            "An arrow `switch` gives every gate its own separate room. No walls to forget.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks: on a real trail, reading signs costs the same however many there are. In bytecode an `else if` chain really is read sign by sign, but a `switch` on dense integers can jump straight to the right gate in one step. That difference is in the internals section.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "if",
        },
        {
          type: "code",
          language: "java",
          code: `if (condition) {
    // runs only when condition is true
}`,
        },
        {
          type: "paragraph",
          text: "The condition must be an expression of type `boolean` or `Boolean` (a `Boolean` is unboxed, and a `null` one throws `NullPointerException`). Unlike C, there's no conversion from numbers or references to true/false, so `if (count)` or `if (user)` don't compile. This is the same strict typing I noted in the Operators lesson. The braces are optional for a single statement, and leaving them out is where several of the mistakes later in this lesson come from.",
        },
        {
          type: "heading",
          text: "if-else",
        },
        {
          type: "code",
          language: "java",
          code: `if (condition) {
    // runs when condition is true
} else {
    // runs when condition is false
}`,
        },
        {
          type: "paragraph",
          text: "Exactly one branch runs. If the condition throws an exception while being evaluated, neither does, but that's the only exception.",
        },
        {
          type: "heading",
          text: "else if chains",
        },
        {
          type: "code",
          language: "java",
          code: `if (condition1) {
    // ...
} else if (condition2) {
    // ...
} else if (condition3) {
    // ...
} else {
    // none of the above matched
}`,
        },
        {
          type: "paragraph",
          text: "Conditions are evaluated top to bottom and the first `true` one wins. The ones after it are **never evaluated**, so a side effect or an expensive call in a later condition doesn't happen at all.",
        },
        {
          type: "paragraph",
          text: "One thing I hadn't realised: Java has no `else if` construct. The grammar only knows `if (c) S else S`. In `else if`, the second `if` is simply the statement after `else`. A chain is nested `if-else` statements, formatted flat. That's also why its bytecode, shown below, is just a sequence of test-and-jump pairs.",
        },
        {
          type: "heading",
          text: "Nested if and the dangling else",
        },
        {
          type: "paragraph",
          text: "An `if` inside another `if` is for decisions that only make sense once the outer condition holds. Without braces there's a classic trap: an `else` always belongs to the **nearest** `if` that doesn't already have one, whatever the indentation says (JLS 14.5). I wrote this with the `else` indented under the outer `if`:",
        },
        {
          type: "code",
          language: "java",
          title: "Dangling.java",
          code: `public class Dangling {
    public static void main(String[] args) {
        int balance = 500;
        boolean premium = false;
        if (balance > 100)
            if (premium)
                System.out.println("premium with balance");
        else
            System.out.println("low balance");
    }
}`,
        },
        {
          type: "output",
          text: "low balance",
        },
        {
          type: "paragraph",
          text: "The balance is 500 and it still printed \"low balance\", because the `else` is attached to `if (premium)`. With braces around the inner `if`, the same values print nothing from that block, which is what the indentation suggested.",
        },
        {
          type: "heading",
          text: "The classic switch statement",
        },
        {
          type: "code",
          language: "java",
          code: `switch (selector) {
    case value1:
        // code
        break;
    case value2:
    case value3:          // two labels, one block
        // code
        break;
    default:
        // no label matched
}`,
        },
        {
          type: "list",
          items: [
            "The selector is evaluated once, then control jumps to the matching `case` label, or to `default`, or past the whole switch if neither exists.",
            "Labels are only entry points into one block of statements. Without `break`, execution **falls through** into the code of the following labels. `break` jumps to the end of the switch. `return`, `throw` and `continue` (inside a loop) also leave it.",
            "Each constant label must be a **compile-time constant** of a type compatible with the selector, and no two labels may be equal. Enum labels are written as bare constant names: `case COMPLETED:`, not `case RideStatus.COMPLETED:` (qualified names are only allowed from Java 21).",
            "`default` can go anywhere, though putting it last is the convention.",
          ],
        },
        {
          type: "heading",
          text: "Arrow labels and switch expressions (Java 14)",
        },
        {
          type: "code",
          language: "java",
          code: `String type = switch (day) {
    case "MON", "TUE", "WED", "THU", "FRI" -> "Weekday";
    case "SAT", "SUN" -> "Weekend";
    default -> "Unknown";
};`,
        },
        {
          type: "paragraph",
          text: "Java 14 added two separate things that usually appear together:",
        },
        {
          type: "list",
          items: [
            "**Arrow labels** (`case X ->`). The right side is a single expression, a block, or a `throw`, and only that runs. There's no fall-through, and several values share one label with commas. Arrow labels work in a plain switch **statement** too, not only in expressions.",
            "**Switch expressions.** The whole `switch` produces a value, so it can be assigned, returned or passed as an argument. A block on the right side hands back its value with `yield`. With old-style colon labels inside a switch expression, `yield` is also how a value is produced.",
            "A switch expression must be **exhaustive**: every possible selector value has to be covered, either by a `default` or, for enums and sealed types, by listing every constant or subtype. Otherwise it doesn't compile.",
            "Arrow and colon labels can't be mixed in one switch. `javac` says \"different case kinds used in the switch\".",
          ],
        },
        {
          type: "heading",
          text: "What a switch can switch on",
        },
        {
          type: "table",
          headers: ["Selector type", "Since", "Labels"],
          rows: [
            ["`int`, `char`, `short`, `byte`", "1.0", "integer or char constants"],
            ["`Integer`, `Character`, `Short`, `Byte`", "5", "same, the selector is unboxed (`null` throws NPE)"],
            ["any `enum`", "5", "enum constant names"],
            ["`String`", "7", "string literals or constant `String`s"],
            ["any reference type", "21", "type and record patterns, `case null`, constants where they fit"],
            ["`long`, `float`, `double`, `boolean`", "not in 21", "compile error: `selector type long is not allowed`"],
          ],
        },
        {
          type: "paragraph",
          text: "Primitive selectors beyond `int` (and primitive type patterns in general) were previewed starting in JDK 23 with JEP 455, and were still a preview feature as of JDK 25. On Java 21 a `long` ID can't be switched on directly.",
        },
        {
          type: "heading",
          text: "Pattern matching for switch (Java 21)",
        },
        {
          type: "paragraph",
          text: "From Java 21 a case label can be a **type pattern** (`case Card c`) or a **record pattern** (`case Upi(String vpa, long amount)`), optionally with a guard (`when ...`). The switch tests the selector against each pattern in order and binds the matched parts to variables. With a sealed interface, the compiler knows every possible subtype, so a switch over it can be exhaustive with no `default` at all. I use exactly that in the examples.",
        },
        {
          type: "paragraph",
          text: "Two rules come with it. A label that can never match because an earlier one already catches everything it would (`case CharSequence cs` before `case String s`) is a compile error: \"this case label is dominated by a preceding case label\". And a switch that has no `case null` still throws `NullPointerException` on a `null` selector, as every switch always did.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The JVM has no instruction called \"if\" and no instruction that knows about blocks. `javac` translates every control statement into a small set of jump instructions. Each one either changes where the next instruction comes from or doesn't. I checked every case below with `javap -c` on JDK 21.",
        },
        {
          type: "heading",
          text: "An if-else is a conditional jump and a goto",
        },
        {
          type: "code",
          language: "java",
          title: "Sign.java",
          code: `public class Sign {
    public static void main(String[] args) {
        int x = Integer.parseInt(args[0]);
        if (x > 0) {
            System.out.println("positive");
        } else {
            System.out.println("non-positive");
        }
        System.out.println("done");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Sign.java && javap -c Sign",
        },
        {
          type: "output",
          text: `       6: istore_1
       7: iload_1
       8: ifle          22
      11: getstatic     #13                 // Field java/lang/System.out:Ljava/io/PrintStream;
      14: ldc           #19                 // String positive
      16: invokevirtual #21                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      19: goto          30
      22: getstatic     #13                 // Field java/lang/System.out:Ljava/io/PrintStream;
      25: ldc           #27                 // String non-positive
      27: invokevirtual #21                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      30: getstatic     #13                 // Field java/lang/System.out:Ljava/io/PrintStream;
      33: ldc           #29                 // String done
      35: invokevirtual #21                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      38: return`,
        },
        {
          type: "list",
          items: [
            "`iload_1` pushes `x` onto the operand stack.",
            "`ifle 22` pops it and jumps to offset 22 if it is **less than or equal to** zero. `javac` tests the **opposite** of my condition, because the jump has to skip the `if` block when the condition is false.",
            "If the jump isn't taken, execution simply continues into the `if` block at 11. At 19, `goto 30` jumps over the `else` block.",
            "Offset 22 is the `else` block, and 30 is where both paths meet again.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "There's no iconst_0 here",
          text: "My old notes traced `x > 0` as `iload x`, `iconst_0`, `if_icmple`. That's the general two-operand form, but for a comparison against zero `javac` uses the single-operand `ifle` and never pushes the `0`. The two-operand `if_icmp*` instructions appear when both sides are variables, as in the next example.",
        },
        {
          type: "heading",
          text: "The family of branch instructions",
        },
        {
          type: "table",
          headers: ["Instruction", "Pops", "Jumps when"],
          rows: [
            ["`ifeq`, `ifne`", "one `int`", "value `== 0` / `!= 0` (also how a `boolean` is tested: `false` is `0`)"],
            ["`iflt`, `ifge`, `ifgt`, `ifle`", "one `int`", "value compared with zero"],
            ["`if_icmpeq` ... `if_icmple`", "two `int`s", "the two values compare that way"],
            ["`if_acmpeq`, `if_acmpne`", "two references", "same object / different object"],
            ["`ifnull`, `ifnonnull`", "one reference", "reference is / isn't `null`"],
            ["`lcmp`, `fcmpl`/`fcmpg`, `dcmpl`/`dcmpg`", "two `long`/`float`/`double`", "never jump; push -1, 0 or 1 for an `if*` to test"],
            ["`goto`", "nothing", "always"],
            ["`tableswitch`, `lookupswitch`", "one `int`", "to the offset for that key, or `default`"],
          ],
        },
        {
          type: "paragraph",
          text: "A method with several kinds of condition shows most of them, plus how `&&` short-circuits. There's no \"and\" instruction: `&&` is two jumps to the same target.",
        },
        {
          type: "code",
          language: "java",
          title: "Compare.java (excerpt)",
          code: `static String check(int a, int b, String s) {
    if (a > b) return "a > b";
    if (a == 0) return "a is zero";
    if (s != null && s.isEmpty()) return "empty";
    return "other";
}`,
        },
        {
          type: "output",
          text: `       0: iload_0
       1: iload_1
       2: if_icmple     8
       5: ldc           #7                  // String a > b
       7: areturn
       8: iload_0
       9: ifne          15
      12: ldc           #9                  // String a is zero
      14: areturn
      15: aload_2
      16: ifnull        29
      19: aload_2
      20: invokevirtual #11                 // Method java/lang/String.isEmpty:()Z
      23: ifeq          29
      26: ldc           #17                 // String empty
      28: areturn
      29: ldc           #19                 // String other
      31: areturn`,
        },
        {
          type: "paragraph",
          text: "At 16, if `s` is `null` the code jumps straight to 29, and `isEmpty()` at 20 never runs. That jump **is** short-circuit evaluation. The `boolean` result of `isEmpty()` is tested with `ifeq`, because to the JVM a `boolean` on the stack is just an `int` that is 0 or 1.",
        },
        {
          type: "heading",
          text: "An else-if chain is a ladder of tests",
        },
        {
          type: "paragraph",
          text: "For the grade checker in the examples (`score >= 90`, `>= 80`, `>= 70`, else F), the branches are:",
        },
        {
          type: "output",
          text: `       3: iload_1
       4: bipush        90
       6: if_icmplt     20
          ... print "Grade: A" ...
      17: goto          62
      20: iload_1
      21: bipush        80
      23: if_icmplt     37
          ... print "Grade: B" ...
      34: goto          62
      37: iload_1
      38: bipush        70
      40: if_icmplt     54
          ... print "Grade: C" ...
      51: goto          62
      54: ... print "Grade: F" ...
      62: return`,
        },
        {
          type: "paragraph",
          text: "Each test jumps to the next test when it fails, and each branch ends with a `goto` to the common exit. A score of 40 runs all three comparisons before reaching F. The cost of a chain grows with the position of the branch that matches.",
        },
        {
          type: "heading",
          text: "switch on int: tableswitch or lookupswitch",
        },
        {
          type: "paragraph",
          text: "A switch is compiled differently. `javac` emits one of two dedicated instructions, and I wrote two methods to get one of each:",
        },
        {
          type: "code",
          language: "java",
          title: "Dense.java (excerpt)",
          code: `static String dense(int code) {
    switch (code) {
        case 1: return "one";
        case 2: return "two";
        case 3: return "three";
        case 5: return "five";
        default: return "other";
    }
}

static String sparse(int code) {
    switch (code) {
        case 1: return "one";
        case 100: return "hundred";
        case 1000: return "thousand";
        default: return "other";
    }
}`,
        },
        {
          type: "output",
          text: `  dense:
       1: tableswitch   { // 1 to 5
                     1: 36
                     2: 39
                     3: 42
                     4: 48
                     5: 45
               default: 48
          }
  sparse:
       1: lookupswitch  { // 3
                     1: 36
                   100: 39
                  1000: 42
               default: 45
          }`,
        },
        {
          type: "list",
          items: [
            "**`tableswitch`** stores a low and high bound and one jump offset for every value in between. Finding the target is a range check and an array index, constant time whatever the number of cases. The gap at 4 was filled with the `default` offset (48).",
            "**`lookupswitch`** stores only the keys that exist, sorted, each with its offset. A table from 1 to 1000 would waste almost a thousand entries, so `javac` used this one. Because the keys are sorted, the JVM can binary-search them.",
          ],
        },
        {
          type: "paragraph",
          text: "The choice is a cost formula in `javac`'s code generator (`Gen.visitSwitch`). It estimates table cost as `4 + (hi - lo + 1)` space plus 3 time, and lookup cost as `3 + 2n` space plus `n` time, weighting time three times, and picks the cheaper. I tested the boundary: cases `1, 2, 3, 10` gave a `tableswitch`, and `1, 2, 3, 11` gave a `lookupswitch`, exactly where the formula flips.",
        },
        {
          type: "heading",
          text: "Fall-through is just the absence of a goto",
        },
        {
          type: "paragraph",
          text: "Here is the fall-through demo from the examples, with `break` only after case 3:",
        },
        {
          type: "output",
          text: `       3: tableswitch   { // 1 to 3
                     1: 28
                     2: 36
                     3: 44
               default: 55
          }
      28: ... println "Monday" ...
      36: ... println "Tuesday" ...
      44: ... println "Wednesday" ...
      52: goto          63
      55: ... println "Other day" ...
      63: return`,
        },
        {
          type: "paragraph",
          text: "The case blocks are laid out one after another, and the switch just jumps into the middle. `break` compiles to a `goto` to the end (offset 52). Where there's no `break`, there's nothing between one block and the next, so the PC simply runs on. Fall-through isn't a feature anyone implemented. It's what happens when nothing stops it.",
        },
        {
          type: "heading",
          text: "switch on String: hashCode, then equals",
        },
        {
          type: "paragraph",
          text: "The JVM's switch instructions only take an `int`. For a `String`, `javac` switches on `hashCode()` first, then confirms with `equals()`, because different strings can share a hash code. I picked two labels that collide on purpose: `\"Aa\"` and `\"BB\"` both hash to 2112.",
        },
        {
          type: "code",
          language: "java",
          title: "Command.java (excerpt)",
          code: `static String run(String cmd) {
    switch (cmd) {
        case "start": return "starting";
        case "Aa":    return "Aa branch";
        case "BB":    return "BB branch";
        default:      return "unknown command";
    }
}`,
        },
        {
          type: "output",
          text: `       0: aload_0
       1: astore_1
       2: iconst_m1
       3: istore_2
       4: aload_1
       5: invokevirtual #7                  // Method java/lang/String.hashCode:()I
       8: lookupswitch  { // 2
                  2112: 50
             109757538: 36
               default: 75
          }
      36: aload_1
      37: ldc           #13                 // String start
      39: invokevirtual #15                 // Method java/lang/String.equals:(Ljava/lang/Object;)Z
      42: ifeq          75
      45: iconst_0
      46: istore_2
      47: goto          75
      50: aload_1
      51: ldc           #19                 // String BB
      53: invokevirtual #15                 // Method java/lang/String.equals:(Ljava/lang/Object;)Z
      56: ifeq          64
      59: iconst_2
      60: istore_2
      61: goto          75
      64: aload_1
      65: ldc           #21                 // String Aa
      67: invokevirtual #15                 // Method java/lang/String.equals:(Ljava/lang/Object;)Z
      70: ifeq          75
      73: iconst_1
      74: istore_2
      75: iload_2
      76: tableswitch   { // 0 to 2
                     0: 104
                     1: 107
                     2: 110
               default: 113
          }`,
        },
        {
          type: "list",
          items: [
            "It's two switches. The first (`lookupswitch` on the hash) figures out which label matched and stores its position, 0, 1 or 2, in a hidden local. That local starts at -1, meaning \"no match\".",
            "Under hash 2112 there are two `equals` checks, one for `\"BB\"` and one for `\"Aa\"`. That's how a collision is handled correctly.",
            "The second switch (`tableswitch` on the position) jumps to the real case code, which keeps the original fall-through behaviour intact.",
            "`hashCode()` is called on the selector at offset 5 with no null check, so a `null` string throws `NullPointerException`. I ran `run(null)` and got: `Cannot invoke \"String.hashCode()\" because \"<local1>\" is null`.",
          ],
        },
        {
          type: "heading",
          text: "switch on an enum: ordinal() and a switch map",
        },
        {
          type: "paragraph",
          text: "An enum switch could switch on `ordinal()` directly, but then reordering the enum's constants and recompiling only the enum would send every old switch to the wrong case. So `javac` generates a small synthetic class, `StatusLabel$1`, with an array that maps each constant's runtime ordinal to the case number used in **this** switch:",
        },
        {
          type: "output",
          text: `  static java.lang.String label(RideStatus);
    Code:
       0: getstatic     #7                  // Field StatusLabel$1.$SwitchMap$RideStatus:[I
       3: aload_0
       4: invokevirtual #13                 // Method RideStatus.ordinal:()I
       7: iaload
       8: tableswitch   { // 1 to 5
                     1: 54
                     2: 54
                     3: 59
                     4: 64
                     5: 69
               default: 44
          }
      44: new           #19                 // class java/lang/MatchException`,
        },
        {
          type: "paragraph",
          text: "The map is filled in `StatusLabel$1`'s static initializer by name (`RideStatus.REQUESTED.ordinal()` gets case 1, and so on), so it follows the enum as it is at runtime. The `default` at 44 is one I didn't write: my switch expression covers all five constants, and `javac` adds a `MatchException` path for a constant that didn't exist at compile time. I trigger it in Common Mistakes.",
        },
        {
          type: "heading",
          text: "Pattern switch: invokedynamic typeSwitch",
        },
        {
          type: "paragraph",
          text: "A pattern switch can't be a jump table over constants, so `javac` hands the type tests to a bootstrap method in the JDK. For the `Payments` example below, the method starts like this:",
        },
        {
          type: "output",
          text: `       0: aload_0
       1: astore_1
       2: iconst_0
       3: istore_2
       4: aload_1
       5: iload_2
       6: invokedynamic #7,  0              // InvokeDynamic #0:typeSwitch:(Ljava/lang/Object;I)I
      11: tableswitch   { // -1 to 4
                    -1: 58
                     0: 63
                     1: 89
                     2: 108
                     3: 146
                     4: 192
               default: 48
          }
      48: new           #11                 // class java/lang/MatchException
          ...
      63: aload_1
      64: checkcast     #18                 // class Card
      67: astore_3
      68: aload_3
      69: invokevirtual #20                 // Method Card.amountPaise:()J
      72: ldc2_w        #24                 // long 1000000l
      75: lcmp
      76: ifgt          84
      79: iconst_1
      80: istore_2
      81: goto          4`,
        },
        {
          type: "paragraph",
          text: "`javap -v` shows what the bootstrap method receives: the label types in order.",
        },
        {
          type: "output",
          text: `BootstrapMethods:
  0: #121 REF_invokeStatic java/lang/runtime/SwitchBootstraps.typeSwitch:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #18 Card
      #18 Card
      #36 Upi
      #43 Wallet
      #43 Wallet`,
        },
        {
          type: "list",
          items: [
            "`typeSwitch` takes the selector and a **restart index**, and returns the index of the first label at or after that index whose type matches, or -1 for `null`. The `tableswitch` then jumps to that case.",
            "Guards aren't part of the bootstrap. Case 0 is `case Card c when ...`: it casts, evaluates the guard, and if the guard is false (offset 76 not taken) it sets the restart index to 1 and jumps back to 4 to call `typeSwitch` again, now starting from the next label.",
            "Record patterns are compiled into `checkcast` plus calls to the record's accessor methods, so `case Upi(String vpa, long amount)` reads `vpa()` and `amountPaise()`.",
            "Because it's `invokedynamic`, the matching strategy lives in the JDK (`java.lang.runtime.SwitchBootstraps`), not in my class file. A newer JDK can make it faster without me recompiling.",
          ],
        },
        {
          type: "heading",
          text: "What the JIT does with it",
        },
        {
          type: "paragraph",
          text: "All of this is what the interpreter executes. Once a method gets hot, the JIT compilers turn the same branches into native compare-and-branch instructions, and C2 uses the branch counts the interpreter collected: it lays out the common path as straight-line code and can compile a switch into a native jump table or a tree of comparisons, whichever suits the keys. The bytecode is the contract. What finally runs on the CPU can look quite different.",
        },
      ],
    },
    {
      title: "The Flow in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `SOURCE                         BYTECODE (Sign.java)

if (x > 0) {                    7: iload_1
                                8: ifle 22   ────────┐ x <= 0
    println("positive");       11: ...positive...    │
                               19: goto 30  ───────┐ │
} else {                                           │ │
    println("non-positive");   22: ...non-pos... ◄─┼─┘
}                                                  │
println("done");               30: ...done...  ◄───┘`,
          caption:
            "An if-else is one conditional jump that skips the if block and one goto that skips the else block.",
        },
        {
          type: "diagram",
          text: `switch (code)             tableswitch 1..5
                          ┌─────┬─────────────────┐
  code ── range check ──► │ 1   │ -> 36           │
          lo <= code <= hi│ 2   │ -> 39           │
          index = code-lo │ 3   │ -> 42           │
                          │ 4   │ -> 48 (default) │
                          │ 5   │ -> 45           │
                          └─────┴─────────────────┘
  out of range ──────────► default

  lookupswitch: sorted (key, offset) pairs, searched
  else-if chain: test 1, test 2, test 3 ... in order`,
          caption: "Three ways to pick a branch: index into a table, search a sorted list, or test one by one.",
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
            "The thread's PC register points at the instructions that evaluate the condition. They push values onto the current frame's operand stack (`iload`, `aload`, a method call).",
            "A branch instruction pops those values and compares them. For a `switch`, the selector is turned into an `int` first: a `hashCode()` for `String`, a switch-map lookup for an enum, `typeSwitch` for patterns.",
            "If the branch is taken, the PC is set to the target offset. If not, the PC moves to the next instruction, as for any other instruction.",
            "Execution continues sequentially from there. Code that was jumped over simply never runs, and an `else if` condition that was never reached is never evaluated.",
            "At the end of the taken branch, a `goto` (or a `return`, or for a switch, falling off the last case) moves the PC to the code after the whole statement, and normal sequential flow resumes.",
          ],
        },
      ],
    },
    {
      title: "What Happens in Memory",
      blocks: [
        {
          type: "paragraph",
          text: "Control statements don't allocate anything. They use two per-thread structures from the JVM lesson: the **PC register**, which holds the offset of the current bytecode instruction, and the **operand stack** in the current frame, where the values being compared are pushed and popped. A pattern switch's binding variables (`Card c`) and the hidden locals `javac` adds for String and pattern switches are ordinary local variable slots in the frame.",
        },
        {
          type: "diagram",
          text: `┌─ Thread "main" ───────────────────────────────────┐
│ PC register: 8          (the ifle instruction)    │
│                                                   │
│ Frame: Sign.main                                  │
│   locals:        [0] args   [1] x = 5             │
│   operand stack: [ 5 ]   <- pushed by iload_1     │
└───────────────────────────────────────────────────┘
  ifle 22 pops 5. 5 > 0, so no jump: PC = 11.
  With x = -2 it would pop -2, jump: PC = 22.`,
          caption: "Normally the PC just moves to the next instruction. A taken branch sets it to the target instead.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Code that isn't there costs nothing",
          text: "When a condition is a compile-time constant, `javac` doesn't even emit the branch. In the Class Loading lesson, under \"Watching It Happen\", `if (false) { new Helper(); }` disappeared from the bytecode. The same happens with a `static final boolean DEBUG = false;` flag: I compiled `if (DEBUG) { println(\"debug...\"); }` and `javap -c` showed only the `println(\"work\")` after it. JLS 14.22 deliberately exempts `if` from the unreachable-code error so this kind of conditional compilation works. A `while (false)` body, by contrast, is a compile error.",
        },
      ],
    },
    {
      title: "The Syntax, All in One Place",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Syntax.java (main body)",
          code: `int score = 85;
int day = 2;
boolean verified = true;

// if
if (score >= 90) {
    System.out.println("A grade");
}

// if-else
if (score >= 90) {
    System.out.println("A grade");
} else {
    System.out.println("Not an A");
}

// else-if chain
if (score >= 90) {
    System.out.println("A");
} else if (score >= 80) {
    System.out.println("B");
} else if (score >= 70) {
    System.out.println("C");
} else {
    System.out.println("F");
}

// nested if
if (score >= 80) {
    if (verified) {
        System.out.println("eligible for scholarship");
    }
}

// classic switch statement
switch (day) {
    case 1:
        System.out.println("Monday");
        break;
    case 2:
        System.out.println("Tuesday");
        break;
    default:
        System.out.println("Unknown day");
}

// switch expression (Java 14+)
String dayName = switch (day) {
    case 1 -> "Monday";
    case 2 -> "Tuesday";
    default -> "Unknown";
};
System.out.println(dayName);`,
        },
        {
          type: "output",
          text: `Not an A
B
eligible for scholarship
Tuesday
Tuesday`,
        },
        {
          type: "paragraph",
          text: "The first `if` prints nothing because 85 isn't 90 or more. Note the semicolon after the switch expression's closing brace: it's the end of the `String dayName = ...;` declaration, and leaving it out is a compile error.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A grade checker",
        },
        {
          type: "code",
          language: "java",
          title: "GradeChecker.java",
          code: `public class GradeChecker {
    public static void main(String[] args) {
        int score = 85;
        if (score >= 90) {
            System.out.println("Grade: A");
        } else if (score >= 80) {
            System.out.println("Grade: B");
        } else if (score >= 70) {
            System.out.println("Grade: C");
        } else {
            System.out.println("Grade: F");
        }
    }
}`,
        },
        {
          type: "output",
          text: "Grade: B",
        },
        {
          type: "paragraph",
          text: "85 is also `>= 70`, but the chain stopped at the first match. The second condition doesn't need `&& score < 90`, because reaching it already means the first one was false.",
        },
        {
          type: "heading",
          text: "Fall-through in a classic switch",
        },
        {
          type: "code",
          language: "java",
          title: "FallThroughDemo.java",
          code: `public class FallThroughDemo {
    public static void main(String[] args) {
        int day = 2;
        switch (day) {
            case 1:
                System.out.println("Monday");
            case 2:                          // no break above, and none here either
                System.out.println("Tuesday");
            case 3:
                System.out.println("Wednesday");
                break;
            default:
                System.out.println("Other day");
        }
    }
}`,
        },
        {
          type: "output",
          text: `Tuesday
Wednesday`,
        },
        {
          type: "paragraph",
          text: "With `day = 2` the switch jumped to `case 2` and printed Tuesday, then ran straight into case 3's code and printed Wednesday, and only stopped at case 3's `break`. Monday didn't print because execution entered below it. The same code with the arrow form (`case 2 -> System.out.println(\"Tuesday\");`) printed only `Tuesday`, and its bytecode had a `goto` after every case.",
        },
        {
          type: "heading",
          text: "Several labels, one result",
        },
        {
          type: "code",
          language: "java",
          title: "HttpStatus.java",
          code: `public class HttpStatus {
    static String describe(int status) {
        return switch (status) {
            case 200, 201, 204 -> "success";
            case 301, 302 -> "redirect";
            case 400, 404 -> "client error";
            case 500, 503 -> "server error";
            default -> "unknown";
        };
    }

    public static void main(String[] args) {
        for (int s : new int[] {200, 204, 302, 404, 503, 418}) {
            System.out.println(s + " " + describe(s));
        }
    }
}`,
        },
        {
          type: "output",
          text: `200 success
204 success
302 redirect
404 client error
503 server error
418 unknown`,
        },
        {
          type: "paragraph",
          text: "In bytecode this is a single `lookupswitch` with nine keys, where 200, 201 and 204 all point to the same offset. Comma-separated labels cost nothing extra.",
        },
        {
          type: "heading",
          text: "A block with yield, and a throwing default",
        },
        {
          type: "code",
          language: "java",
          title: "Fare.java",
          code: `public class Fare {
    static int surchargePercent(String vehicle, int hour) {
        return switch (vehicle) {
            case "BIKE" -> 0;
            case "AUTO", "MINI" -> 10;
            case "SEDAN" -> {
                boolean peak = hour >= 8 && hour <= 10 || hour >= 17 && hour <= 20;
                yield peak ? 25 : 15;
            }
            default -> throw new IllegalArgumentException("unknown vehicle: " + vehicle);
        };
    }

    public static void main(String[] args) {
        System.out.println(surchargePercent("BIKE", 9));
        System.out.println(surchargePercent("MINI", 9));
        System.out.println(surchargePercent("SEDAN", 9));
        System.out.println(surchargePercent("SEDAN", 14));
        System.out.println(surchargePercent("TRUCK", 14));
    }
}`,
        },
        {
          type: "output",
          text: `0
10
25
15
Exception in thread "main" java.lang.IllegalArgumentException: unknown vehicle: TRUCK
	at Fare.surchargePercent(Fare.java:10)
	at Fare.main(Fare.java:19)`,
        },
        {
          type: "paragraph",
          text: "A block needs `yield` to produce its value. `return` there would try to return from the whole method, and the compiler rejects it inside a switch expression. A `throw` counts as covering the case, so `default` doesn't have to invent a value. When I left the `yield` out of a block, `javac` said: `switch rule completes without providing a value`.",
        },
        {
          type: "heading",
          text: "Pattern matching over a sealed type",
        },
        {
          type: "code",
          language: "java",
          title: "Payments.java",
          code: `sealed interface Payment permits Card, Upi, Wallet {}
record Card(String last4, long amountPaise) implements Payment {}
record Upi(String vpa, long amountPaise) implements Payment {}
record Wallet(long balancePaise, long amountPaise) implements Payment {}

public class Payments {
    static String route(Payment p) {
        return switch (p) {
            case null -> "rejected: no payment";
            case Card c when c.amountPaise() > 10_000_00 -> "card, needs 3-D Secure";
            case Card c -> "card ending " + c.last4();
            case Upi(String vpa, long amount) -> "UPI to " + vpa;
            case Wallet(long balance, long amount) when balance < amount -> "wallet: insufficient balance";
            case Wallet w -> "wallet";
        };
    }

    public static void main(String[] args) {
        Payment[] ps = {
            new Card("4242", 2_500_00), new Card("1111", 15_000_00),
            new Upi("prince@okbank", 300_00),
            new Wallet(100_00, 250_00), new Wallet(900_00, 250_00), null
        };
        for (Payment p : ps) System.out.println(route(p));
    }
}`,
        },
        {
          type: "output",
          text: `card ending 4242
card, needs 3-D Secure
UPI to prince@okbank
wallet: insufficient balance
wallet
rejected: no payment`,
        },
        {
          type: "list",
          items: [
            "There's no `default`. The interface is sealed to exactly three records, and every one has an unguarded case, so the compiler accepts the switch as exhaustive. If someone adds a fourth payment type, this method stops compiling until it's handled, which is the point.",
            "Order matters. The guarded `Card` case has to come before the plain `Card` case. The other way round, the plain one dominates and it's a compile error.",
            "`case null` is the only way to make a switch accept `null`. Without it, `route(null)` would throw `NullPointerException`.",
          ],
        },
        {
          type: "heading",
          text: "Fall-through on purpose",
        },
        {
          type: "paragraph",
          text: "There is one shape where fall-through is the clearest code: \"start at step N and do every step after it\". Schema-migration style upgrades are the textbook case:",
        },
        {
          type: "code",
          language: "java",
          title: "Migrations.java",
          code: `public class Migrations {
    // Deliberate fall-through: upgrading from version N runs every step after N.
    @SuppressWarnings("fallthrough")
    static void upgradeFrom(int version) {
        switch (version) {
            case 1:
                System.out.println("  add column rider.phone");
                // fall through
            case 2:
                System.out.println("  create table payments");
                // fall through
            case 3:
                System.out.println("  add index on rides.status");
                break;
            default:
                System.out.println("  already up to date");
        }
    }

    public static void main(String[] args) {
        System.out.println("from v1:"); upgradeFrom(1);
        System.out.println("from v3:"); upgradeFrom(3);
        System.out.println("from v4:"); upgradeFrom(4);
    }
}`,
        },
        {
          type: "output",
          text: `from v1:
  add column rider.phone
  create table payments
  add index on rides.status
from v3:
  add index on rides.status
from v4:
  already up to date`,
        },
        {
          type: "paragraph",
          text: "The `// fall through` comments are for people and for tools like Checkstyle, which accept that comment as a marker. `javac` ignores comments. Its `-Xlint:fallthrough` warning is silenced only by `@SuppressWarnings(\"fallthrough\")`, and with it this file compiled with no warnings.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Forgetting break",
        },
        {
          type: "paragraph",
          text: "The `FallThroughDemo` output above is the bug. `javac` can catch it, but the check is off by default:",
        },
        {
          type: "code",
          language: "bash",
          code: "javac -Xlint:fallthrough FallThroughDemo.java",
        },
        {
          type: "output",
          text: `FallThroughDemo.java:7: warning: [fallthrough] possible fall-through into case
            case 2:                          // no break above, and none here either
            ^
FallThroughDemo.java:9: warning: [fallthrough] possible fall-through into case
            case 3:
            ^
2 warnings`,
        },
        {
          type: "paragraph",
          text: "Turning on `-Xlint:all` (or at least `fallthrough`) in the build is cheap insurance. Using arrow labels in new code removes the problem entirely.",
        },
        {
          type: "heading",
          text: "= instead of == in a condition",
        },
        {
          type: "paragraph",
          text: "In C, `if (x = 5)` compiles and is always true. In Java the result of `x = 5` is an `int`, so it's a compile error. Same for a `String`:",
        },
        {
          type: "output",
          text: `IfInt.java:4: error: incompatible types: int cannot be converted to boolean
        if (x) {
            ^
IfInt.java:7: error: incompatible types: int cannot be converted to boolean
        if (x = 5) {
              ^
StrAssign.java:4: error: incompatible types: String cannot be converted to boolean
        if (userInput = "yes") {
                      ^`,
        },
        {
          type: "paragraph",
          text: "Java is only safe from this bug for non-boolean types. For a `boolean`, the assignment's value **is** a `boolean`, so it compiles:",
        },
        {
          type: "code",
          language: "java",
          title: "BoolAssign.java (excerpt)",
          code: `boolean isAdmin = false;
if (isAdmin = true) {
    System.out.println("access granted, isAdmin = " + isAdmin);
}`,
        },
        {
          type: "output",
          text: "access granted, isAdmin = true",
        },
        {
          type: "paragraph",
          text: "No warning, and it overwrote the variable. The fix is to never compare booleans to literals at all: write `if (isAdmin)` and `if (!isAdmin)`.",
        },
        {
          type: "heading",
          text: "Ordering overlapping conditions wrongly",
        },
        {
          type: "code",
          language: "java",
          title: "WrongOrder.java (excerpt)",
          code: `static String grade(int score) {
    if (score >= 70) {
        return "C";
    } else if (score >= 80) {
        return "B";
    } else if (score >= 90) {
        return "A";
    } else {
        return "F";
    }
}`,
        },
        {
          type: "output",
          text: `95 -> C
85 -> C
75 -> C
40 -> F`,
        },
        {
          type: "paragraph",
          text: "Every score of 70 or more stops at the first test, so B and A are unreachable. The compiler can't warn about it, because it doesn't reason about ranges. With `>=` tests, the highest threshold has to come first.",
        },
        {
          type: "heading",
          text: "Braces left out",
        },
        {
          type: "paragraph",
          text: "The dangling-else output earlier is one version. The other is adding a second line under a brace-less `if` and assuming it's guarded. Only the first statement is. Apple's 2014 \"goto fail\" TLS bug was a duplicated line under a brace-less `if` in C, which made certificate checks skip their last step. Always using braces makes both impossible.",
        },
        {
          type: "heading",
          text: "Switching on something that might be null",
        },
        {
          type: "paragraph",
          text: "A classic switch on a `String`, an enum or a wrapper type throws `NullPointerException` on `null`, before any case is considered. From `Command.run(null)`:",
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.hashCode()" because "<local1>" is null
	at Command.run(Command.java:3)
	at Command.main(Command.java:15)`,
        },
        {
          type: "paragraph",
          text: "`default` doesn't catch `null`. Either check before the switch, or on Java 21 add `case null` (or `case null, default ->`).",
        },
        {
          type: "heading",
          text: "Non-constant labels, duplicates and illegal selectors",
        },
        {
          type: "output",
          text: `NonConst.java:6: error: constant expression required
            case limit:
                 ^
NonConst.java:10: error: duplicate case label
            case 1:
            ^
LongSwitch.java:4: error: selector type long is not allowed
        switch (id) {
               ^
Mixed.java:6: error: different case kinds used in the switch
            case 2:
            ^`,
        },
        {
          type: "paragraph",
          text: "`limit` was a plain local `int`. Declaring it `final int limit = 10;` makes it a constant variable and the label compiles. One thing that confused me: the Java 17 `javac` that was also on my machine reported the `long` selector as \"patterns in switch statements are a preview feature\". The JDK 21 compiler gives the clear message above.",
        },
        {
          type: "heading",
          text: "Assuming an exhaustive switch stays exhaustive",
        },
        {
          type: "paragraph",
          text: "This switch expression covers every `RideStatus` constant, so it has no `default`:",
        },
        {
          type: "code",
          language: "java",
          title: "StatusLabel.java (excerpt)",
          code: `static String label(RideStatus status) {
    return switch (status) {
        case REQUESTED, ACCEPTED -> "waiting";
        case IN_PROGRESS -> "on the way";
        case COMPLETED -> "done";
        case CANCELLED -> "cancelled";
    };
}`,
        },
        {
          type: "paragraph",
          text: "I added `NO_SHOW` to the enum and recompiled **only** `RideStatus.java`, the way a library update would change an enum under already-compiled code:",
        },
        {
          type: "output",
          text: `REQUESTED -> waiting, final=false
ACCEPTED -> waiting, final=false
IN_PROGRESS -> on the way, final=false
COMPLETED -> done, final=true
CANCELLED -> cancelled, final=true
Exception in thread "main" java.lang.MatchException
	at StatusLabel.label(StatusLabel.java:3)
	at StatusLabel.main(StatusLabel.java:21)`,
        },
        {
          type: "paragraph",
          text: "That's the hidden `default` from the switch-map bytecode firing. Recompiling both files instead gave a compile error, `the switch expression does not cover all possible input values`, which is the better outcome: the compiler pointed at every switch that needs the new case. That's why I leave `default` out of enum switch expressions on purpose. (Before Java 21 the runtime error here was an `IncompatibleClassChangeError`.)",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Always use braces, even for one-line bodies. It removes the dangling-else and the \"second line isn't guarded\" bugs.",
            "Prefer arrow labels for new switches, statement or expression. No fall-through, multiple labels per case, and the compiler checks exhaustiveness for expressions.",
            "When a switch exists to compute a value, make it a switch expression instead of assigning a variable in every case. Missing cases become compile errors instead of a variable that stays at its initial value.",
            "Over an enum or sealed type, cover every case and leave `default` out, so adding a constant breaks the build where it matters. My old notes said \"always include a default\". That's right for open-ended values like `int` or `String`, and wrong for closed sets. When a `default` is needed for a value that \"can't happen\", make it `throw` rather than quietly return something.",
            "Use a switch when one value is compared against many constants, and `if-else` when conditions are ranges or involve different variables.",
            "Replace deep nesting with **guard clauses**: check the failure cases first and `return` or `throw` early, so the main logic sits at one indentation level.",
            "Write conditions positively and name them: `boolean isPeak = hour >= 17 && hour <= 20;` then `if (isPeak)`. Never write `== true` or `== false`.",
            "If fall-through is intentional, mark it with a `// fall through` comment and `@SuppressWarnings(\"fallthrough\")`, and compile with `-Xlint:fallthrough` so accidental ones show up.",
          ],
        },
        {
          type: "paragraph",
          text: "Here is the guard-clause refactor on a realistic validation. Both versions return the same result for every input; I ran five rides through both and compared:",
        },
        {
          type: "code",
          language: "java",
          title: "Guards.java (excerpt)",
          code: `// Nested version
static String startNested(Ride ride) {
    if (ride != null) {
        if (ride.status().equals("ACCEPTED")) {
            if (ride.driverId() != null) {
                if (ride.fare() > 0) {
                    return "started " + ride.id();
                } else {
                    return "error: fare not set";
                }
            } else {
                return "error: no driver";
            }
        } else {
            return "error: ride is " + ride.status();
        }
    } else {
        return "error: no ride";
    }
}

// Guard clauses: reject the bad cases first, keep the happy path flat
static String start(Ride ride) {
    if (ride == null) return "error: no ride";
    if (!ride.status().equals("ACCEPTED")) return "error: ride is " + ride.status();
    if (ride.driverId() == null) return "error: no driver";
    if (ride.fare() <= 0) return "error: fare not set";
    return "started " + ride.id();
}`,
        },
        {
          type: "output",
          text: `started R1
error: ride is REQUESTED
error: no driver
error: fare not set
error: no ride`,
        },
        {
          type: "paragraph",
          text: "My test printed `MISMATCH` next to any ride where the two disagreed, and none did. In the nested version each error message sits far from the check that causes it. In the flat one they're on the same line.",
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "list",
          items: [
            "A `tableswitch` finds its target in constant time. A `lookupswitch` searches sorted keys. An `else if` chain tests conditions one by one, so the cost depends on where the match is. With a handful of branches the difference is noise. It only starts to matter with many cases on a hot path.",
            "Arrow labels and switch expressions compile to the same `tableswitch`/`lookupswitch` as the classic form. Choosing the modern syntax costs nothing.",
            "A `String` switch costs one `hashCode()` (cached inside the `String` after its first computation) plus one `equals()` on a hash match. It's cheaper than an `else if` chain of `equals()` calls, which may compare against every label.",
            "In an `else if` chain where one case dominates, putting the most frequent case first saves comparisons, but only when the conditions don't overlap. Correctness decides the order first.",
            "The bigger factor on modern CPUs is branch prediction. A branch that goes the same way most of the time is nearly free, and an unpredictable one costs a pipeline flush. The JIT uses the interpreter's branch profiles to lay out the likely path, so for typical backend code I write the clearest version and only measure with JMH if a profiler points at a branch.",
            "A pattern switch's first call bootstraps the `invokedynamic` call site, a one-time cost. After that the linked call site is reused.",
          ],
        },
      ],
    },
    {
      title: "Control Statements in Production",
      blocks: [
        {
          type: "list",
          items: [
            "**Validation at the edges.** Controller and service methods start with guard clauses: reject a missing ID, a negative amount or an invalid state with an early `throw`, often of a custom exception that a Spring `@ControllerAdvice` turns into a 400 response. Bean Validation annotations (`@NotNull`, `@Positive`) move many of these `if`s out of the code, but they're still conditions underneath.",
            "**State machines.** Order, ride or payment status transitions are a natural fit for a switch over an enum: from `REQUESTED` you may go to `ACCEPTED` or `CANCELLED`, and anything else throws. An exhaustive switch expression makes adding a status a compile-time event.",
            "**Mapping.** Turning an enum or a status code into a message, an HTTP status or a DTO field is usually a one-screen switch expression.",
            "**Sealed hierarchies.** With Java 21, a result type like `sealed interface PaymentResult permits Success, Declined, Error` plus a pattern switch replaces chains of `instanceof` checks and casts.",
            "**Feature flags.** `if (flags.isEnabled(\"new-pricing\"))` is how many teams ship code dark and turn it on later. Unlike `static final` constants, these are runtime checks, so both branches stay in the bytecode.",
            "**Linters.** Checkstyle has `MissingSwitchDefault`, `FallThrough` and `NeedBraces` checks, and SonarQube and Error Prone flag fall-through and missing braces, because these are well-known sources of bugs.",
          ],
        },
        {
          type: "paragraph",
          text: "When a switch over a type keeps growing in several places, the usual next step is to move the behaviour into the types themselves (polymorphism, or a `Map` from key to handler) instead of adding more cases. That trade-off comes back once classes and interfaces are covered.",
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
              question: "What is a control statement?",
              answer:
                "A statement that changes the normal top-to-bottom flow of execution: it decides which code runs, skips code, or repeats it. In Java that means `if`/`else` and `switch` for choosing, loops for repeating, and `break`, `continue`, `return` and `throw` for jumping out.\n\nUnder the hood they all become jump instructions. When I ran `javap -c` on a simple `if-else`, it was one `ifle` that skipped the `if` block and one `goto` that skipped the `else` block.",
            },
            {
              question: "What's the difference between if and if-else?",
              answer:
                "A plain `if` runs its block when the condition is true and does nothing otherwise. `if-else` always runs exactly one of its two blocks.\n\nSo `if-else` is for a real either/or, and a plain `if` is for an optional extra step. In bytecode the difference is just the `goto` at the end of the `if` block that jumps over the `else` block.",
            },
            {
              question: "In an else if chain, how many branches can execute at most?",
              answer:
                "One. The conditions are checked top to bottom, and the first true one runs its block. Everything after it is skipped, including evaluating the remaining conditions. If none is true and there's no final `else`, zero branches run.\n\nI saw this with a wrongly ordered grade checker: with `score >= 70` first, 95 and 85 both came out as C, because the first test matched and the rest were never reached.",
            },
            {
              question: "What must the condition inside an if statement evaluate to?",
              answer:
                "A `boolean`, or a `Boolean` that gets unboxed. Nothing converts to `boolean` automatically, not numbers and not references.\n\n`if (x)` with an `int x` gives \"incompatible types: int cannot be converted to boolean\". And if it's a `Boolean` that happens to be `null`, the unboxing throws `NullPointerException` at runtime.",
            },
            {
              question: "What does break do inside a switch statement?",
              answer:
                "It exits the switch and continues after its closing brace. Without it, execution keeps running into the next case's code.\n\nIn bytecode, `break` is literally a `goto` to the end of the switch. I could see it in my fall-through demo: only case 3 had a `break`, and it was the only case with a `goto` after it.",
            },
            {
              question: "What happens if you omit break in a switch case?",
              answer:
                "Fall-through. After the matching case runs, execution continues into the following case blocks, whatever their labels say, until it hits a `break`, a `return`, a `throw` or the end of the switch.\n\nWith `day = 2` and no `break` on cases 1 and 2, my demo printed Tuesday and Wednesday. That only applies to classic colon labels. With arrow labels there's no fall-through.",
            },
            {
              question: "What does the default case in a switch do?",
              answer:
                "It runs when no `case` label matches. In a switch statement it's optional, and without it an unmatched value just skips the switch. In a switch expression, something has to cover every possible value, either `default` or a complete list of enum constants or sealed subtypes.\n\nOne thing it doesn't do is catch `null`. A `null` selector throws `NullPointerException` unless there's a `case null`.",
            },
            {
              question: "Can a switch statement's expression be a String?",
              answer:
                "Yes, since Java 7. It compares with `equals()`, so it's case-sensitive: `\"START\"` didn't match `case \"start\"` when I tried it.\n\nInternally `javac` switches on `hashCode()` first and then confirms with `equals()`, because two strings can share a hash. I used `\"Aa\"` and `\"BB\"`, which both hash to 2112, and the bytecode had both `equals` checks under that one hash key.",
            },
            {
              question: "What's the modern (Java 14+) switch syntax called, and what does it use instead of case ...: break;?",
              answer:
                "Switch expressions with arrow labels, `case X -> ...`. Only the code on the right of the arrow runs, so there's no `break` and no fall-through, and several values can share a label with commas.\n\nIt was previewed in Java 12 and 13 and became final in Java 14. A block on the right uses `yield` to produce the switch's value. The arrows also work in an ordinary switch statement, not just in expressions.",
            },
            {
              question: "Does if (5) compile in Java?",
              answer:
                "No. `5` is an `int`, and Java has no implicit conversion from `int` to `boolean`. The error is \"incompatible types: int cannot be converted to boolean\".\n\nThis is a deliberate break from C, where any non-zero value counts as true. It also means `if (x = 5)` doesn't compile, which kills a whole class of C bugs. It doesn't protect `boolean` variables, though: `if (isAdmin = true)` compiled and ran for me.",
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
              question: "Explain exactly what fall-through means in a classic switch statement.",
              answer:
                "A classic switch jumps to the matching label and then runs statements sequentially from there. Labels are only entry points, not boundaries, so it keeps going through the following cases' code until something transfers control out: `break`, `return`, `throw`, or the end of the switch.\n\nThe bytecode makes it obvious. The case blocks are laid out back to back, and `break` is a `goto` to the end. A case without `break` simply has nothing between it and the next block, so the PC runs on.",
            },
            {
              question: "Why does the arrow syntax eliminate fall-through?",
              answer:
                "Because each arrow case is defined to run exactly one thing, an expression, a block or a `throw`, and then leave the switch. There's no shared sequence of statements to fall into.\n\nThe compiler implements it the same way as a `break`: when I compiled the arrow version of my day switch, every case ended with a `goto` to the end. And since arrow and colon labels can't be mixed in one switch, there's no way to bring fall-through back in.",
            },
            {
              question: "In an else if chain, if two conditions would both be true, which one executes? Why?",
              answer:
                "The first one in source order. The chain is really nested `if-else`: the second `if` lives in the first one's `else`, so it's only reached when the first condition was false.\n\nIn bytecode each condition is a test that jumps to the next test on failure, and each branch ends with a `goto` out. Once a branch runs, the later tests aren't even evaluated.",
            },
            {
              question: "What bytecode instruction is typically used for a conditional jump in an if statement?",
              answer:
                "The `if*` family. For comparing two `int`s it's `if_icmp<cond>` (`if_icmple`, `if_icmplt` and so on). Against zero or for a `boolean` it's the one-operand form: `ifeq`, `ifne`, `ifle`. References use `if_acmpeq`/`if_acmpne` and `ifnull`/`ifnonnull`. `long`, `float` and `double` are compared with `lcmp`/`fcmp`/`dcmp` first, then tested with an `if*`.\n\n`javac` tests the inverse of the source condition, because the jump skips the block. `x > 0` became `ifle`, and `a > b` became `if_icmple`.",
            },
            {
              question: "Why is switch sometimes preferred over a long else if chain, beyond readability?",
              answer:
                "The compiler can check it and optimise it. Duplicate labels are a compile error, a switch expression must be exhaustive, and over enums or sealed types the compiler tells you when a new constant isn't handled. An `else if` chain gets none of that.\n\nOn performance, a dense integer switch becomes a `tableswitch`, a constant-time indexed jump, while a chain is tested one condition at a time. With a handful of cases that difference is irrelevant, so I'd lead with correctness and readability.",
            },
            {
              question: "Can switch cases share code intentionally? When is that useful?",
              answer:
                "Yes, in two ways. Stacked empty labels (`case 6: case 7:`) or a comma list (`case 6, 7 ->`) share one block, which is completely normal. Real fall-through, where one case does some work and then continues into the next, is legitimate when the logic really is cumulative.\n\nMy example was migrations: upgrading from version 1 runs steps 1, 2 and 3, from version 3 only step 3. I marked it with `// fall through` comments and `@SuppressWarnings(\"fallthrough\")`, so it compiles cleanly under `-Xlint:fallthrough` and the next reader knows it's on purpose.",
            },
            {
              question: "What's the difference between a tableswitch and sequential if-else comparisons, performance-wise?",
              answer:
                "A `tableswitch` does one range check and one indexed load to find the target, so it's constant time regardless of how many cases there are. An `if-else` chain does one comparison per condition until it matches, so it's linear in the position of the matching branch.\n\nIn practice the JIT recompiles both, uses branch profiles, and can turn either into something smarter. For a few cases the difference is nanoseconds. It matters for large dispatch switches on hot paths, like an interpreter or a protocol parser.",
            },
            {
              question: "Why must every case value in a classic switch be a compile-time constant?",
              answer:
                "Because `javac` builds the dispatch at compile time. The keys are written into the `tableswitch` or `lookupswitch` instruction in the class file, so they have to be known then, and the compiler has to be able to reject duplicates.\n\nA plain local `int limit` gave \"constant expression required\". Making it `final int limit = 10;` turns it into a constant variable and it compiles. Java 21 pattern labels are the exception, since they're type tests evaluated at runtime through `invokedynamic`.",
            },
            {
              question: "What happens to the Program Counter when a conditional jump instruction executes?",
              answer:
                "If the condition holds, the PC register is set to the jump's target offset. If not, it advances to the next instruction like it would for anything else. That's all a branch is.\n\nThe PC is per thread, so every thread has its own position in the code. In my `Sign` example, with `x = 5` the `ifle 22` at offset 8 wasn't taken and execution continued at 11. With a negative `x` the PC went straight to 22.",
            },
            {
              question: "Why does deep nesting of if statements become a code-quality concern even when it's correct?",
              answer:
                "Because readers have to keep every enclosing condition in their head to know when a line runs, and the `else` branches end up far from the conditions they belong to. It also invites the dangling-else bug when braces are skipped.\n\nI rewrote a four-level nested validation into guard clauses that return early. Same results for all five test rides, but each error message now sits on the same line as its check.",
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
              question: "Explain how if_icmple and similar instructions work at the operand-stack level.",
              answer:
                "`if_icmple target` pops two `int`s, `value2` on top and `value1` below it, and if `value1 <= value2` sets the PC to the target offset. Otherwise execution continues with the next instruction. The one-operand forms like `ifle` pop a single `int` and compare it with zero. In both cases the stack is left without the operands.\n\nThe target is a signed 16-bit offset relative to the instruction (there's `goto_w` for the wide case), and the verifier checks that it lands on the start of a real instruction in the same method with consistent stack types. For `a > b` I saw `iload_0`, `iload_1`, `if_icmple 8`.",
            },
            {
              question: "How does the compiler decide between tableswitch and lookupswitch?",
              answer:
                "`javac` estimates both. A table costs `4 + (hi - lo + 1)` in space and 3 in time, a lookup `3 + 2n` in space and `n` in time, with time weighted three times. It picks the table if its total is not larger.\n\nI checked the boundary: cases `1, 2, 3, 10` produced a `tableswitch`, `1, 2, 3, 11` a `lookupswitch`. Gaps in a table get filled with the `default` offset, which I saw for the missing case 4.",
            },
            {
              question: "Why did Java 14 add switch expressions instead of fixing the classic switch's fall-through?",
              answer:
                "Backward compatibility. Changing what an existing `case 1:` does without a `break` would silently change the behaviour of correct code that relies on fall-through, and that code is everywhere. Java almost never changes the meaning of code that already compiles.\n\nSo they added a new form next to the old one: arrow labels that don't fall through, a switch that can be an expression, and exhaustiveness checking. It also laid the groundwork for pattern matching in Java 21.",
            },
            {
              question: "How does an else if chain compile, and why does order matter for correctness and performance?",
              answer:
                "As a ladder. Each condition is evaluated and followed by an inverted conditional jump to the next condition, and each branch body ends with a `goto` to the common exit. In my grade checker that was three `if_icmplt` tests and three `goto 62`.\n\nFor correctness, the first match wins, so with overlapping conditions the most specific has to come first, otherwise later branches are unreachable. For performance, a value that matches late pays for every comparison before it. With non-overlapping conditions, putting the most common case first saves work.",
            },
            {
              question: "How would you refactor a deeply nested if chain into something flatter?",
              answer:
                "Guard clauses first: invert each precondition, and `return` or `throw` as soon as it fails, so the happy path ends up at one level at the bottom. Then extract named boolean methods for complicated conditions, and replace type- or value-based branching with a switch, a `Map` lookup, or polymorphism.\n\nThe guard-clause step is mechanical and safe. I did it on a four-level ride validation and checked both versions against the same five inputs. Every result matched.",
            },
            {
              question: "What are the trade-offs of switching on an enum versus on primitives or Strings?",
              answer:
                "An enum is a closed, type-safe set. Typos are compile errors, and a switch expression over it can be checked for exhaustiveness, so adding a constant breaks the build in every switch that needs updating. A `String` or `int` can hold anything, so it always needs a `default`, and a typo in a label just never matches.\n\nThe cost is a little indirection: `javac` generates a synthetic class with a `$SwitchMap$` array mapping each ordinal to a case number. And if the enum changes without the switch being recompiled, an unknown constant ends up at the hidden default. I got a `MatchException` that way after adding `NO_SHOW`.",
            },
            {
              question: "Give a real scenario where deliberate switch fall-through is legitimate.",
              answer:
                "Cumulative steps, where entering at step N means doing every step after it. Upgrading a schema or a config file from some version to the latest is the standard case, and so are some hash function implementations that process leftover bytes.\n\nMy migration example did that: starting from v1 printed all three steps, from v3 only the last one. To make it legitimate rather than a bug, it needs a comment at every fall-through point and `@SuppressWarnings(\"fallthrough\")` so `-Xlint` stays useful elsewhere.",
            },
            {
              question: "Why can't classic case labels be variables or runtime-computed values?",
              answer:
                "The jump table is built at compile time. `tableswitch` and `lookupswitch` store their keys as literal numbers in the bytecode, and the compiler has to verify there are no duplicates, which it can't do for values that only exist at runtime.\n\nIf the values really are dynamic, the right tool is an `if-else` chain or a `Map` lookup. Constant variables (`static final` or local `final` initialised with a constant) are fine, because they're folded at compile time.",
            },
            {
              question: "How does short-circuit evaluation interact with conditions in an if statement?",
              answer:
                "`&&` and `||` evaluate the right operand only if the left one doesn't already decide the result. So `if (user != null && user.active())` never calls `active()` on `null`. With the non-short-circuit `&`, my test threw `NullPointerException` on exactly that line.\n\nIn bytecode there's no \"and\" instruction. `s != null && s.isEmpty()` compiled to an `ifnull` and an `ifeq`, both jumping to the same place. The first jump skips the method call entirely. It's why order inside a condition matters: cheap checks and null checks go first.",
            },
            {
              question: "How can a switch expression assign a value directly, and what does being an expression imply?",
              answer:
                "Because it's an expression, it has a value and a type, so it can sit on the right of an assignment, in a `return`, or as a method argument. Each arm produces the value, either the expression after the arrow or `yield` inside a block.\n\nBeing an expression brings rules a statement doesn't have. It must be exhaustive. Every arm must produce a value or throw, and when I left the `yield` out of a block `javac` said \"switch rule completes without providing a value\". And you can't `return` or `break` out of it from inside. The upside is that the compiler proves every input gets a value.",
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
              question: "A colleague's switch prints several case results when only one should print. What's the likely cause?",
              answer:
                "Missing `break` statements, so the matched case falls through into the following cases. The giveaway is that the extra output is always from the cases right below the matching one, never from above it.\n\nI'd confirm by compiling with `-Xlint:fallthrough`, which flagged every fall-through point in my demo, and then fix it by converting to arrow labels rather than just adding the missing `break`, so it can't come back.",
            },
            {
              question: "You're reviewing code with six levels of nested if statements. What would you suggest?",
              answer:
                "Start with guard clauses: turn each precondition around and return or throw early, which usually flattens most of the levels. Then extract well-named methods for complex conditions, and look at whether the remaining branching is really dispatch on a type or status that a switch or polymorphism would express better.\n\nI'd want tests around it before touching it. When I flattened a nested validation, I ran both versions on the same inputs and compared outputs before deleting the old one.",
            },
            {
              question: "Should one variable be checked against 15 possible exact string values with if-else or switch?",
              answer:
                "A switch, ideally an arrow-form switch expression if it produces a value. Fifteen `equals` calls in a chain are harder to read, and the compiler can't catch a duplicated value. In a switch, a duplicate label is a compile error.\n\nIt's also cheaper: a `String` switch does one `hashCode()` and normally one `equals()`, against up to fifteen `equals()` for a chain. If those strings are really a fixed set of values, I'd suggest converting to an enum at the boundary and switching on that, so typos become compile errors too.",
            },
            {
              question: "A teammate's if (userInput = \"yes\") compiles in their language, but not in Java. Why does Java prevent this?",
              answer:
                "Because an `if` condition must be a `boolean`, and the value of an assignment is the assigned value, here a `String`. Java has no truthiness, so `javac` says \"incompatible types: String cannot be converted to boolean\".\n\nIt's the same strict typing as in the Operators lesson. The one hole is `boolean` itself: `if (isAdmin = true)` compiles, assigns, and is always true. And for strings the correct comparison is `\"yes\".equals(userInput)`, not `==`.",
            },
            {
              question: "Explain to a junior developer why overlapping ranges (score >= 70, then score >= 80) must be ordered highest first.",
              answer:
                "Because the chain stops at the first true condition. If `score >= 70` comes first, every score of 70 or above matches it, including 95, and the `>= 80` and `>= 90` branches can never be reached.\n\nI'd show them the output: with the wrong order, 95, 85 and 75 all came out as C. With the highest threshold first, each later test can rely on the earlier ones having failed, which is also why `else if (score >= 80)` doesn't need `&& score < 90`.",
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
            "Write `ControlStatementsDemo.java` with a `grade(int score)` method using an `else if` chain: A for 90 and above, B for 80 to 89, C for 70 to 79, F below 70. Test it with 95, 90, 89, 70 and 69, so every boundary is covered.",
            "Add a classic switch on a day number (1 to 3 plus `default`) with no `break` statements at all, and call it with 2.",
            "Copy it, add the missing `break`s, and call the fixed version with 2.",
            "Add a comment in your own words explaining why the fall-through happened and what `break` changed.",
            "Bonus: compile with `javac -Xlint:fallthrough`, then rewrite the switch as an arrow-form switch expression that returns the day name.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: the grades are A, A, B, C, F. The broken switch called with 2 prints Tuesday, Wednesday and the `default` line, because execution entered at case 2 and ran every block below it. The fixed one prints only Tuesday, and so does the switch expression. `-Xlint:fallthrough` gives three \"possible fall-through into case\" warnings for the broken version (cases 2, 3 and `default`) and none for the others.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `if / else   condition must be boolean (no truthiness)
            else binds to the nearest if: use braces
else if     nested if-else; first true wins, rest
            never evaluated. Highest threshold first.

switch      int-like, wrappers, enum, String (7),
(classic)   any reference with patterns (21).
            Not long/float/double/boolean.
            labels = compile-time constants, no dups
            no break -> FALL-THROUGH

switch ->   no fall-through, comma labels (14)
expression  produces a value, yield in blocks,
            must be exhaustive

patterns    case Card c when ..., case Upi(var v, ..)
(21)        sealed types: exhaustive without default
            case null, else null -> NPE

BYTECODE    if: ifeq/ifle/if_icmp*/ifnull + goto
            switch: tableswitch (dense, O(1))
                    lookupswitch (sparse, sorted)
            String: hashCode() switch + equals()
            enum: $SwitchMap$ ordinal array
            patterns: invokedynamic typeSwitch

SEE IT      javap -c MyClass   javac -Xlint:fallthrough`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Every `if` and `switch` is just jumps in bytecode. The PC register either moves to the next instruction or to a target.",
            "Say \"fall-through\" by name when switch comes up, and explain that `break` is a `goto` to the end.",
            "For new code: braces always, arrow labels, switch expressions over enums and sealed types without `default`, so the compiler tells me what I forgot.",
          ],
        },
      ],
    },
  ],
};
