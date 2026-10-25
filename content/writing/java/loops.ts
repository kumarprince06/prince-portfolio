import type { Lesson } from "../types";

export const loops: Lesson = {
  slug: "loops",
  date: "2026-10-17",
  title: "Loops",
  description:
    "The four Java loops, break and continue with and without labels, what `javac` turns each loop into, how the JIT treats hot loops, and the classic bugs: off-by-one, infinite loops and modifying a collection mid-iteration.",
  tags: ["Core Java", "Loops", "Control Flow", "Bytecode"],
  sections: [
    {
      title: "What Loops Are",
      blocks: [
        {
          type: "paragraph",
          text: "In the Control Statements lesson I looked at how a program chooses which path to take. A loop is the other half of control flow: it takes one path **again and again**, as long as some condition holds, without me writing the code out repeatedly.",
        },
        {
          type: "paragraph",
          text: "Formally, a **loop** is a statement that executes its body repeatedly while a condition is true. Java has four of them: `for`, `while`, `do-while` and the enhanced `for` (for-each). Two keywords change the normal flow inside them: `break` leaves the loop, `continue` skips to the next iteration.",
        },
        {
          type: "paragraph",
          text: "The reason loops exist is simple: a fixed, small amount of source code has to handle an amount of work I don't know when I write it. Printing a line 1,000 times, summing a million rows, retrying a call until it succeeds or reading messages until a queue is empty are all the same few lines of code.",
        },
        {
          type: "paragraph",
          text: "As a backend developer I write loops all the time, mostly hidden behind nicer syntax: iterating a `List` of entities, paging through a database result, a retry with backoff, a consumer polling a queue. Most of the interesting bugs I've read about in loops aren't about syntax at all. They're about the boundary (`<` versus `<=`), the exit condition, or changing a collection while walking it, so that's where most of this lesson goes.",
        },
      ],
    },
    {
      title: "Where They Came From",
      blocks: [
        {
          type: "list",
          items: [
            "The idea is as old as programming languages. FORTRAN (1957) had the `DO` loop for counted repetition, and early languages already distinguished \"repeat N times\" from \"repeat while something is true\".",
            "Java's `for`, `while` and `do-while`, along with `break` and `continue`, come almost unchanged from C, the same as most of the syntax in the Variables, Operators and Control Statements lessons. The three-part `for (init; condition; update)` header is C's.",
            "Java added one thing C didn't have: **labeled** `break` and `continue`, which can jump out of (or to the next iteration of) an outer loop. Java has no `goto` statement, and labels cover the main legitimate use C programmers had for it. `goto` is still a reserved word in Java, so nobody can use it as an identifier.",
            "**Java 5 (2004)**, the release that also brought generics, enums and autoboxing (I covered it in the History of Java lesson), added the **enhanced for loop**: `for (String s : list)`. It came from JSR 201, together with enums, autoboxing and static imports.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "for-each wasn't a Java invention",
          text: "My old notes called the enhanced for loop a genuine Java innovation. It wasn't new as an idea: Perl had `foreach` in the late 1980s and C# 1.0 shipped `foreach` in 2002. What Java 5 did was make it work with any `Iterable` and with generics, so the loop variable is typed and there's no cast.",
        },
        {
          type: "paragraph",
          text: "There's been no new loop syntax since. Java 20 previewed record patterns directly in the enhanced for header (`for (Point(var x, var y) : points)`), but that part was dropped when record patterns were finalized in Java 21, so on Java 21 the loop variable is still a plain declaration.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of the four loops as four ways of telling someone to do repetitive work:",
        },
        {
          type: "list",
          items: [
            "`for`: \"Do this 10 times, counting as you go.\" The count is known, or can be computed, before starting.",
            "`while`: \"Keep doing this as long as the box isn't empty.\" Check first, every time. If the box is empty to begin with, do nothing at all.",
            "`do-while`: \"Do it once, then check whether to do it again.\" At least one attempt, even if the check would have failed the first time.",
            "for-each: \"Go through this stack of papers front to back.\" No counting, no position, just the next item until there are none.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks: in real Java code the \"count\" in a `for` loop is just another condition. `for` and `while` are interchangeable, and as the bytecode below shows, `javac` produces exactly the same instructions for both. The choice between them is about readability, not about what the machine does.",
        },
      ],
    },
    {
      title: "The Four Loops and Loop Control",
      blocks: [
        {
          type: "heading",
          text: "for",
        },
        {
          type: "paragraph",
          text: "`for (initialization; condition; update) body`. The **initialization** runs once, before anything else. The **condition** is checked before every iteration, including the first. The **update** runs after each body, before the next condition check. All three parts are optional: `for (;;)` is a legal infinite loop, and a missing condition means `true`. The initialization can declare several variables of one type (`int i = 0, j = n - 1`), and the update can be a comma-separated list (`i++, j--`).",
        },
        {
          type: "heading",
          text: "while",
        },
        {
          type: "paragraph",
          text: "`while (condition) body`. The condition is checked before every iteration. If it's false at the start, the body runs **zero** times.",
        },
        {
          type: "heading",
          text: "do-while",
        },
        {
          type: "paragraph",
          text: "`do body while (condition);`. The body runs first, then the condition is checked. It's the only Java loop that always runs its body at least once. The semicolon after the closing parenthesis is required.",
        },
        {
          type: "heading",
          text: "Enhanced for (for-each)",
        },
        {
          type: "paragraph",
          text: "`for (Type x : expression) body`, where the expression is either an array or something that implements `java.lang.Iterable` (every `List`, `Set` and `Queue`, but not a `Map` itself, which is why I write `map.entrySet()`). There's no index and no bounds check to get wrong. The loop variable can be `final` or `var`.",
        },
        {
          type: "paragraph",
          text: "Here are all four plus `break` and `continue` in one file:",
        },
        {
          type: "code",
          language: "java",
          title: "LoopForms.java",
          code: `public class LoopForms {
    public static void main(String[] args) {
        // for: init; condition; update
        for (int i = 0; i < 3; i++) {
            System.out.println("for " + i);
        }

        // while: condition first, zero iterations possible
        int j = 0;
        while (j < 3) {
            System.out.println("while " + j);
            j++;
        }

        // do-while: body first, at least one iteration
        int k = 0;
        do {
            System.out.println("do-while " + k);
            k++;
        } while (k < 3);

        // enhanced for: no index
        int[] numbers = {10, 20, 30};
        for (int num : numbers) {
            System.out.println("for-each " + num);
        }

        // break and continue
        for (int i = 0; i < 10; i++) {
            if (i == 5) break;          // leave the loop
            if (i % 2 == 0) continue;   // skip the rest of this pass
            System.out.println("odd " + i);
        }
    }
}`,
        },
        {
          type: "output",
          text: `for 0
for 1
for 2
while 0
while 1
while 2
do-while 0
do-while 1
do-while 2
for-each 10
for-each 20
for-each 30
odd 1
odd 3`,
        },
        {
          type: "paragraph",
          text: "My notes had these as separate fragments that each declared `int i`. Pasted into one method they don't compile (`variable i is already defined`), which is why the `while` and `do-while` counters here are `j` and `k`. The two `for` loops can both use `i` because each `for` variable is scoped to its own loop.",
        },
        {
          type: "heading",
          text: "break and continue",
        },
        {
          type: "list",
          items: [
            "`break` ends the innermost enclosing loop (or `switch`) immediately. Execution continues with the first statement after it.",
            "`continue` ends only the **current iteration**. In a `for` loop it jumps to the update, in `while` and `do-while` to the condition check.",
            "Both accept a **label**: `break outer;` ends the loop labeled `outer`, and `continue outer;` starts its next iteration. A label is just an identifier and a colon in front of a statement.",
          ],
        },
        {
          type: "heading",
          text: "Scope of the loop variable",
        },
        {
          type: "paragraph",
          text: "A variable declared in the `for` header only exists inside the loop. I tried to print it afterwards:",
        },
        {
          type: "code",
          language: "java",
          title: "Scope.java",
          code: `public class Scope {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            System.out.println(i);
        }
        System.out.println("last i = " + i);
    }
}`,
        },
        {
          type: "output",
          text: `Scope.java:6: error: cannot find symbol
        System.out.println("last i = " + i);
                                         ^
  symbol:   variable i
  location: class Scope
1 error`,
        },
        {
          type: "paragraph",
          text: "If I need the value after the loop, for example the index where a search stopped, I declare the variable before the loop instead.",
        },
        {
          type: "heading",
          text: "The compiler checks reachability",
        },
        {
          type: "paragraph",
          text: "`javac` treats a loop whose condition is the constant `true` as one that can only end through `break`. Code after a `while (true)` with no `break` can never run, and that's a compile error, not a warning. The same rule rejects a `while (false)` body:",
        },
        {
          type: "code",
          language: "java",
          title: "Unreachable.java",
          code: `public class Unreachable {
    static void poll() {
        while (true) {
            System.out.println("polling");
        }
        System.out.println("done");
    }

    static void never() {
        while (false) {
            System.out.println("never");
        }
    }
}`,
        },
        {
          type: "output",
          text: `Unreachable.java:6: error: unreachable statement
        System.out.println("done");
        ^
Unreachable.java:10: error: unreachable statement
        while (false) {
                      ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "This only works for compile-time constants. `while (running)` with a boolean variable compiles fine, because the compiler can't know its value. Interestingly, `if (false) { ... }` is allowed on purpose, so debug flags can switch code off, but `while (false)` isn't.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The JVM has no loop instruction. In the Control Statements lesson an `if` compiled to a conditional jump **forward**, over code that shouldn't run. A loop is the same conditional jump forward (to get out) plus an unconditional `goto` **backward** (to go round again). Everything else in this section is a variation of that.",
        },
        {
          type: "heading",
          text: "while, for and do-while in bytecode",
        },
        {
          type: "paragraph",
          text: "I wrote the same \"print 0, 1, 2\" three ways and disassembled them:",
        },
        {
          type: "code",
          language: "java",
          title: "Shapes.java",
          code: `public class Shapes {
    static void whileLoop() {
        int i = 0;
        while (i < 3) {
            System.out.println(i);
            i++;
        }
    }

    static void forLoop() {
        for (int i = 0; i < 3; i++) {
            System.out.println(i);
        }
    }

    static void doWhileLoop() {
        int i = 0;
        do {
            System.out.println(i);
            i++;
        } while (i < 3);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c Shapes",
        },
        {
          type: "output",
          text: `  static void whileLoop();
    Code:
       0: iconst_0
       1: istore_0
       2: iload_0
       3: iconst_3
       4: if_icmpge     20
       7: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
      10: iload_0
      11: invokevirtual #13                 // Method java/io/PrintStream.println:(I)V
      14: iinc          0, 1
      17: goto          2
      20: return

  static void forLoop();
    Code:
       0: iconst_0
       1: istore_0
       2: iload_0
       3: iconst_3
       4: if_icmpge     20
       7: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
      10: iload_0
      11: invokevirtual #13                 // Method java/io/PrintStream.println:(I)V
      14: iinc          0, 1
      17: goto          2
      20: return

  static void doWhileLoop();
    Code:
       0: iconst_0
       1: istore_0
       2: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
       5: iload_0
       6: invokevirtual #13                 // Method java/io/PrintStream.println:(I)V
       9: iinc          0, 1
      12: iload_0
      13: iconst_3
      14: if_icmplt     2
      17: return`,
        },
        {
          type: "list",
          items: [
            "`whileLoop` and `forLoop` are **byte-for-byte identical**. The `for` header is only syntax: the init became offsets 0-1, the condition 2-4, the body 7-11 and the update `iinc 0, 1` at 14, right before the jump back.",
            "The condition is compiled **inverted**. The source says `i < 3` (keep going), the bytecode says `if_icmpge 20` (if `i >= 3`, jump forward to the exit). The fall-through path is the body.",
            "`goto 2` at offset 17 is the back-edge: a jump to a lower offset. That's the one thing that makes this a loop instead of an `if`.",
            "`do-while` has no `goto` at all. The body comes first, the test is at the bottom, and it's not inverted: `if_icmplt 2` (if `i < 3`, jump **back** to the body). Nothing guards the first pass, which is the at-least-once guarantee in two bytes.",
          ],
        },
        {
          type: "paragraph",
          text: "The infinite forms are the extreme case. Both `for (;;) { }` and `while (true) { }` compile to a single instruction:",
        },
        {
          type: "output",
          text: `  static void a();
    Code:
       0: goto          0

  static void b();
    Code:
       0: goto          0`,
        },
        {
          type: "heading",
          text: "break, continue and labels",
        },
        {
          type: "paragraph",
          text: "`break` and `continue` are just `goto`s with different targets. Here's the `break`/`continue` loop from `LoopForms` and a labeled `break` out of a nested loop:",
        },
        {
          type: "code",
          language: "java",
          title: "Jumps.java",
          code: `public class Jumps {
    static void breakAndContinue() {
        for (int i = 0; i < 10; i++) {
            if (i == 5) break;
            if (i % 2 == 0) continue;
            System.out.println(i);
        }
    }

    static void labeled(int[][] grid, int target) {
        outer:
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (grid[r][c] == target) break outer;
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `  static void breakAndContinue();
    Code:
       0: iconst_0
       1: istore_0
       2: iload_0
       3: bipush        10
       5: if_icmpge     38
       8: iload_0
       9: iconst_5
      10: if_icmpne     16
      13: goto          38
      16: iload_0
      17: iconst_2
      18: irem
      19: ifne          25
      22: goto          32
      25: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
      28: iload_0
      29: invokevirtual #13                 // Method java/io/PrintStream.println:(I)V
      32: iinc          0, 1
      35: goto          2
      38: return

  static void labeled(int[][], int);
    Code:
       0: iconst_0
       1: istore_2
       2: iload_2
       3: aload_0
       4: arraylength
       5: if_icmpge     42
       8: iconst_0
       9: istore_3
      10: iload_3
      11: aload_0
      12: iload_2
      13: aaload
      14: arraylength
      15: if_icmpge     36
      18: aload_0
      19: iload_2
      20: aaload
      21: iload_3
      22: iaload
      23: iload_1
      24: if_icmpne     30
      27: goto          42
      30: iinc          3, 1
      33: goto          10
      36: iinc          2, 1
      39: goto          2
      42: return`,
        },
        {
          type: "list",
          items: [
            "`break` at offset 13 is `goto 38`, the same exit target the loop condition uses. Breaking out and the condition failing land on the same instruction.",
            "`continue` at offset 22 is `goto 32`, which is the **update** (`iinc 0, 1`), not the condition. That's the JLS rule for `for` loops, visible in the bytecode: `continue` still runs `i++`. In a `while` loop it would target the condition check.",
            "In `labeled`, the inner loop's normal exit (`if_icmpge 36`) goes to the outer loop's update. `break outer` at offset 27 is `goto 42`, past both loops. Labels don't exist in the class file at all; `javac` resolves them to jump targets.",
          ],
        },
        {
          type: "heading",
          text: "for-each over an array",
        },
        {
          type: "paragraph",
          text: "The enhanced for loop is pure compiler sugar, and it compiles differently depending on what it iterates:",
        },
        {
          type: "code",
          language: "java",
          title: "ForEachShapes.java",
          code: `import java.util.List;

public class ForEachShapes {
    static int sumArray(int[] data) {
        int sum = 0;
        for (int x : data) {
            sum += x;
        }
        return sum;
    }

    static int sumList(List<Integer> data) {
        int sum = 0;
        for (Integer x : data) {
            sum += x;
        }
        return sum;
    }
}`,
        },
        {
          type: "output",
          text: `  static int sumArray(int[]);
    Code:
       0: iconst_0
       1: istore_1
       2: aload_0
       3: astore_2
       4: aload_2
       5: arraylength
       6: istore_3
       7: iconst_0
       8: istore        4
      10: iload         4
      12: iload_3
      13: if_icmpge     33
      16: aload_2
      17: iload         4
      19: iaload
      20: istore        5
      22: iload_1
      23: iload         5
      25: iadd
      26: istore_1
      27: iinc          4, 1
      30: goto          10
      33: iload_1
      34: ireturn`,
        },
        {
          type: "paragraph",
          text: "Over an array, `javac` writes the index loop for me. It copies the array reference into a hidden local (slot 2), stores the length once (slot 3), keeps a hidden index (slot 4), and loads each element into `x` (slot 5). Because the array reference and length are copied up front, reassigning `data` inside the loop wouldn't change what's being iterated.",
        },
        {
          type: "heading",
          text: "for-each over an Iterable",
        },
        {
          type: "output",
          text: `  static int sumList(java.util.List<java.lang.Integer>);
    Code:
       0: iconst_0
       1: istore_1
       2: aload_0
       3: invokeinterface #7,  1            // InterfaceMethod java/util/List.iterator:()Ljava/util/Iterator;
       8: astore_2
       9: aload_2
      10: invokeinterface #13,  1           // InterfaceMethod java/util/Iterator.hasNext:()Z
      15: ifeq          38
      18: aload_2
      19: invokeinterface #19,  1           // InterfaceMethod java/util/Iterator.next:()Ljava/lang/Object;
      24: checkcast     #23                 // class java/lang/Integer
      27: astore_3
      28: iload_1
      29: aload_3
      30: invokevirtual #25                 // Method java/lang/Integer.intValue:()I
      33: iadd
      34: istore_1
      35: goto          9
      38: iload_1
      39: ireturn`,
        },
        {
          type: "paragraph",
          text: "Over a `List` there's no index at all. It's `iterator()` once, then `hasNext()` as the condition and `next()` for each element, with a `checkcast` because generics are erased and `next()` returns `Object`. The `+=` also needs `intValue()`, which is auto-unboxing. Two consequences I care about: for-each over a `LinkedList` is efficient (no `get(i)` walking the list each time), and every rule of the collection's iterator applies, including the one that throws `ConcurrentModificationException`.",
        },
        {
          type: "heading",
          text: "ConcurrentModificationException and modCount",
        },
        {
          type: "paragraph",
          text: "`ArrayList` keeps a counter called `modCount` (inherited from `AbstractList`) that goes up on every structural change: add, remove, clear. Its iterator records the value as `expectedModCount` when it's created, and `next()` compares the two. If the list changed behind the iterator's back, `next()` throws:",
        },
        {
          type: "code",
          language: "java",
          title: "CmeTrace.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class CmeTrace {
    public static void main(String[] args) {
        List<String> orders = new ArrayList<>(List.of("A", "CANCELLED", "B", "C"));
        for (String o : orders) {
            if (o.equals("CANCELLED")) {
                orders.remove(o);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.util.ConcurrentModificationException
\tat java.base/java.util.ArrayList$Itr.checkForComodification(ArrayList.java:1095)
\tat java.base/java.util.ArrayList$Itr.next(ArrayList.java:1049)
\tat CmeTrace.main(CmeTrace.java:7)`,
        },
        {
          type: "paragraph",
          text: "The trace points at line 7, the `for` header, because that's where the hidden `next()` call is. No second thread is involved: \"concurrent\" here means the list was modified while an iteration was in progress. The check is best effort, and in the Common Mistakes section I show a case where the same bug throws nothing and silently skips an element.",
        },
        {
          type: "heading",
          text: "What the JVM does with a hot loop",
        },
        {
          type: "list",
          items: [
            "**OSR (on-stack replacement):** normally the JIT compiles a method and the next **call** uses the compiled version. A `main` with one long loop is only called once, so HotSpot also counts loop back-edges. When a loop gets hot, it compiles the method with an entry point at the loop header and switches the running frame over to it **in the middle of the loop**. I show this with `-XX:+PrintCompilation` in the Performance section.",
            "**Safepoint polls:** when the GC (or something else) needs every thread stopped, compiled code notices at safepoint polls, which sit at method returns and loop back-edges. For counted `int` loops C2 used to leave the poll out for speed, so one long loop could hold up a GC pause for every thread. Since JDK 10, **loop strip mining** splits such loops into strips with a poll between them. On my JDK 21 with G1 the flags are `UseCountedLoopSafepoints = true` and `LoopStripMiningIter = 1000`.",
            "**Loop optimizations in C2:** range check elimination (proving `a[i]` can't go out of bounds so the per-access check can be hoisted or dropped), loop unrolling, hoisting invariant code out of the loop, and auto-vectorization (`UseSuperWord`) of simple array loops. These are why a plain loop over an `int[]` ends up close to what a C compiler would produce.",
          ],
        },
      ],
    },
    {
      title: "The Loop in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `           init  (for loops only, runs once)
             │
             ▼
   ┌───────────────────┐  false
┌─►│ condition (top)   ├────────────┐
│  └─────────┬─────────┘            │
│            │ true                 │
│            ▼                      │
│  ┌───────────────────┐  break     │
│  │ body              ├────────────┤
│  └──┬──────────────┬─┘            │
│     │ end of body  │ continue     │
│     ▼              ▼              │
│  ┌───────────────────┐            │
│  │ update (for only) │            │
│  └─────────┬─────────┘            │
│            │ goto (back-edge)     ▼
└────────────┘                 after the loop`,
          caption:
            "while and for. A do-while enters at the body instead, and its condition sits at the bottom of the box.",
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
            "For a `for` loop, the initialization runs once. A `while` loop has no init part; whatever it tests was set up by earlier code.",
            "The condition is evaluated. For `for` and `while` this happens before the first iteration. A `do-while` skips this step on the first pass and goes straight to the body.",
            "If the condition is false, execution jumps past the loop. If it's true, the body runs.",
            "Inside the body, `break` jumps past the loop immediately. `continue` jumps to the update (`for`) or the condition (`while`, `do-while`), skipping the rest of the body.",
            "After the body (or a `continue`), a `for` loop runs its update.",
            "A `goto` takes execution back to the condition, and the cycle repeats from step 2.",
            "When the condition is finally false, or a `break` or `return` fires, or an exception is thrown, execution leaves the loop. Local variables declared inside it go out of scope.",
          ],
        },
      ],
    },
    {
      title: "Where Loop Variables Live",
      blocks: [
        {
          type: "paragraph",
          text: "Loop counters are ordinary local variables, so they follow the rules from the Variables lesson: they live in a **slot** of the current method's stack frame. A loop doesn't create a new variable per iteration. It's the same slot, overwritten each time by `iinc`.",
        },
        {
          type: "diagram",
          text: `┌───────────────────────────────────────────┐
│ Stack frame: Shapes.whileLoop()           │
│                                           │
│  local slot 0:  i   0 → 1 → 2 → 3         │
│                 same slot every pass,     │
│                 updated in place by iinc  │
│                                           │
│  operand stack: i and 3 pushed for the    │
│                 compare, popped by        │
│                 if_icmpge                 │
└───────────────────────────────────────────┘`,
          caption: "whileLoop is static, so there is no this and i gets slot 0. In main, slot 0 is args.",
        },
        {
          type: "paragraph",
          text: "The scoping from earlier is visible in the class file too. Two loops in a row, each with its own counter, end up **sharing** one slot, because their scopes don't overlap. I compiled with `-g` to get the local variable table:",
        },
        {
          type: "code",
          language: "java",
          title: "Slots.java",
          code: `public class Slots {
    static void twoLoops() {
        for (int i = 0; i < 2; i++) {
            System.out.println("i=" + i);
        }
        for (int j = 0; j < 2; j++) {
            System.out.println("j=" + j);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -g Slots.java
javap -c -l Slots`,
        },
        {
          type: "output",
          text: `      19: iinc          0, 1
      22: goto          2
      25: iconst_0
      26: istore_0
      ...
      44: iinc          0, 1
      47: goto          27
      50: return
    ...
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          2      23     0     i   I
         27      23     0     j   I`,
        },
        {
          type: "paragraph",
          text: "`i` owns slot 0 from offset 2 to 25, then `j` reuses slot 0 from 27 to 50. The frame size is fixed at compile time (`max_locals`), so a loop never allocates stack memory per iteration. What can grow is the **heap**, if the body creates objects: `new` inside a loop that runs a million times is a million allocations, which the GC handles well for short-lived objects but is still worth noticing in hot code.",
        },
      ],
    },
    {
      title: "How javac Builds a Loop",
      blocks: [
        {
          type: "paragraph",
          text: "My notes had pseudo-code with `if_icmpge` hard-coded for every loop. That only fits a condition like `i < n`. The real rule is that the compiler emits whatever jump means \"the condition is false\". Corrected, and matching the bytecode I saw:",
        },
        {
          type: "code",
          language: "text",
          title: "pseudo-code",
          code: `compileWhile(cond, body):            // for(init; cond; update) is the
    top  = newLabel()                //   same, with init emitted first and
    exit = newLabel()                //   update emitted at "next"
    next = newLabel()                // continue target

    place(top); place(next)          // for a while loop, next == top
    emitJumpIfFalse(cond, exit)      // i < n   ->  if_icmpge exit
                                     // flag    ->  ifeq exit
    emit(body)                       // break -> goto exit
                                     // continue -> goto next
    emit("goto " + top)              // the back-edge
    place(exit)

compileDoWhile(body, cond):
    top  = newLabel()
    place(top)
    emit(body)
    emitJumpIfTrue(cond, top)        // i < n   ->  if_icmplt top
                                     // no goto needed`,
        },
        {
          type: "paragraph",
          text: "The difference from an `if` in the Control Statements lesson is one instruction: the `goto` back to the top. Compilers for other languages often rotate a `while` into a test at the bottom to save a jump per iteration, but `javac` keeps the simple shape and leaves optimization to the JIT, which builds its own control-flow graph from the bytecode anyway.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "while versus do-while with the same condition",
        },
        {
          type: "code",
          language: "java",
          title: "DoWhileDemo.java",
          code: `public class DoWhileDemo {
    public static void main(String[] args) {
        int x = 10;

        System.out.println("before while");
        while (x < 5) {
            System.out.println("while: " + x);
        }
        System.out.println("after while");

        do {
            System.out.println("do-while: " + x);
        } while (x < 5);
    }
}`,
        },
        {
          type: "output",
          text: `before while
after while
do-while: 10`,
        },
        {
          type: "paragraph",
          text: "`x < 5` is false from the start. The `while` body never runs, the `do-while` body runs exactly once and then the false condition stops it. Neither loop changes `x`, which would be an infinite loop if the condition were ever true. I left it like that on purpose to keep the difference visible, but I wouldn't write a loop that can't change its own condition in real code.",
        },
        {
          type: "heading",
          text: "Prompting until the input is valid",
        },
        {
          type: "paragraph",
          text: "This is the textbook `do-while` case: I always need to ask at least once. I piped three answers in to test it:",
        },
        {
          type: "code",
          language: "java",
          title: "PromptUntilValid.java",
          code: `import java.util.Scanner;

public class PromptUntilValid {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int qty;
        do {
            System.out.print("Quantity (1-99): ");
            String line = in.nextLine().trim();
            qty = line.matches("\\\\d{1,2}") ? Integer.parseInt(line) : -1;
            System.out.println(line);
        } while (qty < 1 || qty > 99);
        System.out.println("accepted " + qty);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `printf 'abc\\n0\\n42\\n' | java PromptUntilValid`,
        },
        {
          type: "output",
          text: `Quantity (1-99): abc
Quantity (1-99): 0
Quantity (1-99): 42
accepted 42`,
        },
        {
          type: "paragraph",
          text: "(The `println(line)` only echoes the piped input so the output reads like a session.) With a `while` loop I'd have to either duplicate the prompt before the loop or initialize `qty` to a fake invalid value to force the first pass. `do-while` says what I mean.",
        },
        {
          type: "heading",
          text: "Nested loops, plain and labeled break",
        },
        {
          type: "code",
          language: "java",
          title: "FindInGrid.java",
          code: `public class FindInGrid {
    public static void main(String[] args) {
        int[][] grid = {
            {4, 8, 15},
            {16, 23, 42},
            {6, 10, 12}
        };

        // Plain break: only leaves the inner loop
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (grid[r][c] == 23) {
                    System.out.println("plain break: found at " + r + "," + c);
                    break;
                }
            }
            System.out.println("plain break: finished row " + r);
        }

        // Labeled break: leaves both loops
        search:
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (grid[r][c] == 23) {
                    System.out.println("labeled break: found at " + r + "," + c);
                    break search;
                }
            }
            System.out.println("labeled break: finished row " + r);
        }

        // Labeled continue: skip to the next row
        rows:
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (grid[r][c] % 2 != 0) {
                    System.out.println("row " + r + ": first odd value " + grid[r][c]);
                    continue rows;
                }
            }
            System.out.println("row " + r + ": no odd values");
        }
    }
}`,
        },
        {
          type: "output",
          text: `plain break: finished row 0
plain break: found at 1,1
plain break: finished row 1
plain break: finished row 2
labeled break: finished row 0
labeled break: found at 1,1
row 0: first odd value 15
row 1: first odd value 23
row 2: no odd values`,
        },
        {
          type: "paragraph",
          text: "The plain `break` found 23 and then kept going: \"finished row 1\" and the whole of row 2 still ran, because it only left the inner loop. The labeled version stopped dead. `continue rows` skipped the \"no odd values\" line for rows 0 and 1, and only row 2, which really has no odd value, reached it. In real code I'd usually move the search into a method and `return` instead of using a label, but labels are the right tool when that's awkward.",
        },
        {
          type: "heading",
          text: "A retry loop with exponential backoff",
        },
        {
          type: "paragraph",
          text: "A shape that shows up in almost every backend: call something that can fail transiently, wait longer each time, give up after a limit. The call itself is faked here so it fails twice:",
        },
        {
          type: "code",
          language: "java",
          title: "RetryWithBackoff.java",
          code: `import java.util.concurrent.ThreadLocalRandom;

public class RetryWithBackoff {
    static int calls = 0;

    // Pretend remote call: fails twice, then succeeds
    static String fetchQuote() {
        calls++;
        if (calls < 3) throw new IllegalStateException("503 from pricing service");
        return "quote-42";
    }

    public static void main(String[] args) throws InterruptedException {
        int maxAttempts = 5;
        long delayMs = 100;
        int attempt = 0;
        String result = null;

        do {
            attempt++;
            try {
                result = fetchQuote();
                System.out.println("attempt " + attempt + ": ok -> " + result);
            } catch (IllegalStateException e) {
                if (attempt == maxAttempts) throw e;
                long jitter = ThreadLocalRandom.current().nextLong(delayMs / 2);
                System.out.println("attempt " + attempt + ": " + e.getMessage()
                    + ", retrying in ~" + delayMs + " ms");
                Thread.sleep(delayMs + jitter);
                delayMs = Math.min(delayMs * 2, 2_000);   // exponential, capped
            }
        } while (result == null);
    }
}`,
        },
        {
          type: "output",
          text: `attempt 1: 503 from pricing service, retrying in ~100 ms
attempt 2: 503 from pricing service, retrying in ~200 ms
attempt 3: ok -> quote-42`,
        },
        {
          type: "paragraph",
          text: "Three things make it safe: a hard limit (`maxAttempts`) so it can't spin forever, a growing delay with a cap so it doesn't hammer a struggling service, and random jitter so many clients that failed together don't all retry at the same instant. In Spring code I'd normally reach for Spring Retry or Resilience4j rather than hand-writing this, but they implement exactly this loop.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Off-by-one at the boundary",
        },
        {
          type: "code",
          language: "java",
          title: "OffByOne.java",
          code: `public class OffByOne {
    public static void main(String[] args) {
        int[] ids = {101, 102, 103};
        for (int i = 0; i <= ids.length; i++) {
            System.out.println(ids[i]);
        }
    }
}`,
        },
        {
          type: "output",
          text: `101
102
103
Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3
\tat OffByOne.main(OffByOne.java:5)`,
        },
        {
          type: "paragraph",
          text: "Valid indices are `0` to `length - 1`, so the condition must be `i < ids.length`. With arrays Java at least fails loudly. The quieter version is `i < n - 1` where `n` was meant, which silently skips the last element, or a 1-based page number compared with `<` against a page count. For-each removes the whole class of bug when I don't need the index.",
        },
        {
          type: "heading",
          text: "An infinite loop from a condition that can't become false",
        },
        {
          type: "paragraph",
          text: "Forgetting `i++` in a `while` loop is the obvious one. A sneakier one comes from the Data Types lesson: a `byte` can never reach 128.",
        },
        {
          type: "code",
          language: "java",
          title: "ByteLoop.java",
          code: `public class ByteLoop {
    public static void main(String[] args) {
        int wraps = 0;
        for (byte b = 0; b < 128; b++) {   // b can never reach 128
            if (b == 127 && ++wraps <= 3) {
                System.out.println("b = 127, b++ gives " + (byte) (b + 1) + " (wrap " + wraps + ")");
            }
        }
        System.out.println("loop finished");  // never printed
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `timeout 3 java ByteLoop; echo "exit $?"`,
        },
        {
          type: "output",
          text: `b = 127, b++ gives -128 (wrap 1)
b = 127, b++ gives -128 (wrap 2)
b = 127, b++ gives -128 (wrap 3)
exit 124`,
        },
        {
          type: "paragraph",
          text: "`b++` on a `byte` is an implicit narrowing cast, so 127 wraps to -128 and `b < 128` stays true forever. `javac` compiles it without a warning. I had to kill it with `timeout` (exit code 124 means it timed out). The same thing happens with `for (int i = 0; i <= Integer.MAX_VALUE; i++)`. Loops over `float` or `double` with `!=` as the exit test are the other classic: `x != 1.0` can step right past 1.0 because of rounding.",
        },
        {
          type: "heading",
          text: "Removing from a list inside for-each",
        },
        {
          type: "paragraph",
          text: "The `ConcurrentModificationException` from the internals section is the good outcome. The bad one is when it doesn't throw:",
        },
        {
          type: "code",
          language: "java",
          title: "RemoveWhileIterating.java",
          code: `import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class RemoveWhileIterating {
    public static void main(String[] args) {
        List<String> orders = new ArrayList<>(List.of("A", "CANCELLED", "B", "C"));
        try {
            for (String o : orders) {
                if (o.equals("CANCELLED")) {
                    orders.remove(o);          // structural change mid-loop
                }
            }
        } catch (Exception e) {
            System.out.println("1. " + e);
        }

        // Same mistake, but the removed element is second-to-last
        List<String> tricky = new ArrayList<>(List.of("A", "B", "CANCELLED", "C"));
        for (String o : tricky) {
            if (o.equals("CANCELLED")) {
                tricky.remove(o);
            }
        }
        System.out.println("2. no exception, list = " + tricky);

        // Correct: remove through the iterator
        List<String> safe = new ArrayList<>(List.of("A", "CANCELLED", "B", "C"));
        Iterator<String> it = safe.iterator();
        while (it.hasNext()) {
            if (it.next().equals("CANCELLED")) {
                it.remove();
            }
        }
        System.out.println("3. iterator.remove: " + safe);

        // Shorter: removeIf (Java 8+)
        List<String> shorter = new ArrayList<>(List.of("A", "CANCELLED", "B", "C"));
        shorter.removeIf(o -> o.equals("CANCELLED"));
        System.out.println("4. removeIf:        " + shorter);
    }
}`,
        },
        {
          type: "output",
          text: `1. java.util.ConcurrentModificationException
2. no exception, list = [A, B, C]
3. iterator.remove: [A, B, C]
4. removeIf:        [A, B, C]`,
        },
        {
          type: "paragraph",
          text: "Case 2 looks correct, but the loop never visited `C`. After removing `CANCELLED` at index 2, the list's size dropped to 3, and the iterator's cursor was already 3. `hasNext()` is just `cursor != size`, so it returned `false` and the loop ended before `next()` could run the modCount check. If the loop had been doing real work on each order, `C` would have been silently skipped. The Javadoc says it plainly: fail-fast behaviour is best effort and can't be relied on for correctness. `Iterator.remove()` or `removeIf` are the right tools.",
        },
        {
          type: "heading",
          text: "Assigning to the for-each variable",
        },
        {
          type: "code",
          language: "java",
          title: "ForEachCopy.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ForEachCopy {
    public static void main(String[] args) {
        int[] prices = {100, 200, 300};
        for (int p : prices) {
            p = p * 2;                       // changes the local copy only
        }
        System.out.println(java.util.Arrays.toString(prices));

        for (int i = 0; i < prices.length; i++) {
            prices[i] = prices[i] * 2;       // writes into the array
        }
        System.out.println(java.util.Arrays.toString(prices));

        List<StringBuilder> names = new ArrayList<>(List.of(new StringBuilder("a"), new StringBuilder("b")));
        for (StringBuilder sb : names) {
            sb.append("!");                  // mutates the object the list points to
        }
        System.out.println(names);
    }
}`,
        },
        {
          type: "output",
          text: `[100, 200, 300]
[200, 400, 600]
[a!, b!]`,
        },
        {
          type: "paragraph",
          text: "The bytecode for array for-each showed why: `x` is a separate local slot that gets a copy of each element (`iaload`, `istore`). Assigning to it changes the slot, never the array. Calling a method on an object element is different: the copy is a reference to the same object, so `append` is visible in the list. To replace elements I need the index (or `List.replaceAll`).",
        },
        {
          type: "heading",
          text: "break inside a switch inside a loop",
        },
        {
          type: "code",
          language: "java",
          title: "SwitchInLoop.java",
          code: `public class SwitchInLoop {
    public static void main(String[] args) {
        String[] commands = {"PING", "STOP", "PING"};

        for (String cmd : commands) {
            switch (cmd) {
                case "PING":
                    System.out.println("pong");
                    break;
                case "STOP":
                    System.out.println("stopping?");
                    break;              // leaves the switch, not the loop
            }
        }

        System.out.println("-- with a label --");
        loop:
        for (String cmd : commands) {
            switch (cmd) {
                case "PING" -> System.out.println("pong");
                case "STOP" -> {
                    System.out.println("stopping");
                    break loop;
                }
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `pong
stopping?
pong
-- with a label --
pong
stopping`,
        },
        {
          type: "paragraph",
          text: "`break` targets the innermost `switch` **or** loop, and here that's the `switch`. The third command still ran. A labeled `break` (or a `return`) is how to leave the loop from inside a `switch`.",
        },
        {
          type: "heading",
          text: "Mixing up break and continue",
        },
        {
          type: "paragraph",
          text: "`break` ends the loop, `continue` ends the iteration. The one-line check I use: after a `continue`, the loop condition is evaluated again; after a `break`, it never is.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use for-each whenever I don't need the index. It's shorter, can't go out of bounds, and works the same for arrays and collections.",
            "Use `for` when there's a counter or index, `while` when the exit depends on something other than a counter (a queue being empty, a stream returning `null`), and `do-while` only when the body really must run once first.",
            "Write boundaries in the standard half-open form, `for (int i = 0; i < n; i++)`. It runs exactly `n` times and `n - 0` is the count, which makes off-by-one mistakes easier to spot in review.",
            "Every loop that waits on the outside world (retries, polling, reading a stream) needs a guaranteed exit: a max attempt count, a deadline, or an interruption check like `while (!Thread.currentThread().isInterrupted())`.",
            "Don't modify a collection structurally while iterating it with for-each. Use `Iterator.remove`, `removeIf`, or collect the changes and apply them after.",
            "Prefer extracting a nested search into a method that `return`s over a labeled `break`. Use labels when extraction would be clumsier.",
            "Keep expensive work that doesn't change out of the loop body: a regex compiled once with `Pattern.compile`, not `String.matches` per iteration in hot code; a database call per item is the big one (the N+1 problem).",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "heading",
          text: "Watching OSR happen",
        },
        {
          type: "code",
          language: "java",
          title: "HotLoop.java",
          code: `public class HotLoop {
    public static void main(String[] args) {
        long sum = 0;
        for (int i = 0; i < 100_000_000; i++) {
            sum += i % 7;
        }
        System.out.println("sum = " + sum);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+PrintCompilation HotLoop | grep -E "HotLoop|sum ="`,
        },
        {
          type: "output",
          text: `33    6 %     3       HotLoop::main @ 4 (37 bytes)
34    7       3       HotLoop::main (37 bytes)
34    8 %     4       HotLoop::main @ 4 (37 bytes)
36    6 %     3       HotLoop::main @ 4 (37 bytes)   made not entrant
178    8 %     4       HotLoop::main @ 4 (37 bytes)   made not entrant
sum = 299999995`,
        },
        {
          type: "list",
          items: [
            "The columns are: milliseconds since start, compile ID, flags, tier, method. The `%` flag marks an **OSR** compilation, and `@ 4` is the bytecode offset it enters at. In `javap -c HotLoop`, offset 4 is `iload_3`, the loop header that `goto 4` jumps back to.",
            "`main` was called once, but about 33 ms in, the back-edge counter made the loop hot. C1 compiled an OSR version at tier 3, then C2 at tier 4, and the running frame was moved over to them mid-loop.",
            "`made not entrant` means that compiled version must not be entered again. The tier-3 one was replaced by C2's. The C2 one was invalidated at 178 ms, which is when the loop finished. My understanding is that the code after the loop had never run while the method was being profiled, so C2 compiled it as an uncommon trap and deoptimized back to the interpreter when execution reached it. It doesn't matter here, the work was done.",
          ],
        },
        {
          type: "heading",
          text: "Indexed for vs for-each vs a List",
        },
        {
          type: "paragraph",
          text: "I timed summing 10 million `int`s with an indexed loop and a for-each over an `int[]`, and with for-each over an `ArrayList<Integer>` holding the same values, five rounds in one JVM:",
        },
        {
          type: "code",
          language: "java",
          title: "LoopTiming.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class LoopTiming {
    static long indexed(int[] a) {
        long s = 0;
        for (int i = 0; i < a.length; i++) s += a[i];
        return s;
    }

    static long forEach(int[] a) {
        long s = 0;
        for (int x : a) s += x;
        return s;
    }

    static long boxedList(List<Integer> list) {
        long s = 0;
        for (Integer x : list) s += x;
        return s;
    }

    public static void main(String[] args) {
        int n = 10_000_000;
        int[] a = new int[n];
        List<Integer> list = new ArrayList<>(n);
        for (int i = 0; i < n; i++) { a[i] = i % 100; list.add(i % 100); }

        for (int round = 1; round <= 5; round++) {
            long t0 = System.nanoTime(); long r1 = indexed(a);
            long t1 = System.nanoTime(); long r2 = forEach(a);
            long t2 = System.nanoTime(); long r3 = boxedList(list);
            long t3 = System.nanoTime();
            if (r1 != r2 || r2 != r3) throw new AssertionError();
            System.out.printf("round %d  indexed %5.1f ms  for-each %5.1f ms  List<Integer> %5.1f ms%n",
                round, (t1 - t0) / 1e6, (t2 - t1) / 1e6, (t3 - t2) / 1e6);
        }
    }
}`,
        },
        {
          type: "output",
          text: `round 1  indexed   8.9 ms  for-each   7.1 ms  List<Integer>  17.3 ms
round 2  indexed  10.4 ms  for-each   6.6 ms  List<Integer>   7.7 ms
round 3  indexed   3.0 ms  for-each   2.6 ms  List<Integer>  15.2 ms
round 4  indexed   3.0 ms  for-each   2.5 ms  List<Integer>   7.6 ms
round 5  indexed   2.7 ms  for-each   2.9 ms  List<Integer>   8.8 ms`,
        },
        {
          type: "callout",
          tone: "warning",
          title: "These numbers are noisy",
          text: "A second run gave a 14.7 ms indexed round next to a 3.7 ms for-each round, and in the next round for-each was the slow one (6.2 ms against 2.8 ms). Hand-written `nanoTime` loops are distorted by JIT warm-up, OSR, GC and CPU frequency changes, so I only read them for big differences. For a real comparison the tool is JMH, which handles warm-up, forks and dead-code elimination properly.",
        },
        {
          type: "list",
          items: [
            "Indexed and for-each over an array: no meaningful difference once warmed up, around 2-3 ms in both. That matches the bytecode, which is the same index loop either way.",
            "The `List<Integer>` was consistently slower, roughly 3x or more in the warmed rounds. Each element is a pointer to an `Integer` object that has to be loaded and unboxed, versus `int`s sitting next to each other in memory. (Values 0-99 come from the `Integer` cache, so there was no allocation in the loop; the cost is indirection.)",
            "The first rounds were slowest for all three: interpreted and C1 code before C2 caught up.",
          ],
        },
        {
          type: "heading",
          text: "Nested loops multiply",
        },
        {
          type: "code",
          language: "java",
          title: "NestedCount.java",
          code: `public class NestedCount {
    public static void main(String[] args) {
        for (int n : new int[]{10, 100, 1000}) {
            long pairs = 0;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    pairs++;
                }
            }
            System.out.println("n = " + n + " -> inner body ran " + pairs + " times");
        }
    }
}`,
        },
        {
          type: "output",
          text: `n = 10 -> inner body ran 100 times
n = 100 -> inner body ran 10000 times
n = 1000 -> inner body ran 1000000 times`,
        },
        {
          type: "paragraph",
          text: "10x more input, 100x more work. That's O(n²), and it's how an innocent \"for each order, look through all drivers\" turns slow in production. Replacing the inner loop with a `HashMap` lookup usually brings it back to O(n).",
        },
        {
          type: "list",
          items: [
            "What matters most for loop speed is the body times the iteration count: one I/O call or allocation-heavy operation per iteration dwarfs any difference between loop forms.",
            "C2 does unroll, vectorize and remove bounds checks from simple counted loops over arrays. Loops with an `int` counter, a simple bound and no calls in the body give it the best chance. I haven't measured each of these separately, so I'm not putting numbers on them.",
          ],
        },
      ],
    },
    {
      title: "Loops in Production",
      blocks: [
        {
          type: "list",
          items: [
            "**Batch processing:** reading records in chunks and processing each chunk, as Spring Batch does with its chunk-oriented steps. Under the framework it's a loop of read, process, write until the reader returns `null`.",
            "**Pagination:** `do { page = repo.findAll(PageRequest.of(n++, 500)); process(page); } while (page.hasNext());` is a common way to walk a large table without loading it all. The exit condition and page numbering (Spring Data pages are 0-based) are where off-by-one bugs hide.",
            "**Retry with backoff:** the shape from the examples, usually through Spring Retry or Resilience4j. Bounded attempts, growing delay, jitter.",
            "**Polling and consumers:** a Kafka consumer is a `while (running) { records = consumer.poll(timeout); ... }` loop. It needs a clean exit path (a flag, `wakeup()`, interruption), otherwise shutdown hangs.",
            "**Collections:** most loops in service code are for-each over a `List` of entities or DTOs, or streams, which are loops underneath. The `ConcurrentModificationException` and N+1 query problems both live here.",
          ],
        },
        {
          type: "paragraph",
          text: "In production, the loop bugs that matter are rarely syntax. An exit condition that depends on a remote system behaving, a boundary that's off by one page, or a loop that does a query per item are the ones to look for in code review.",
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
              question: "Name the four loop types in Java.",
              answer:
                "`for`, `while`, `do-while`, and the enhanced `for`, usually called for-each.\n\nThe first three come from C. For-each was added in Java 5 and works over arrays and anything that implements `Iterable`. Under the hood they're all the same thing, a conditional jump out and a `goto` back, which I checked with `javap`.",
            },
            {
              question: "What are the three parts of a for loop's header?",
              answer:
                "Initialization, condition and update: `for (int i = 0; i < n; i++)`. Init runs once, the condition is checked before each iteration, and the update runs after each body.\n\nAll three are optional, and `for (;;)` is an infinite loop. In the bytecode for my `forLoop` example, the update `iinc 0, 1` sits right before the `goto` that jumps back to the condition.",
            },
            {
              question: "When is a while loop's condition checked, before or after the body runs?",
              answer:
                "Before, every time, including the very first iteration.\n\nThat's why a `while` can run zero times. In my `DoWhileDemo`, `while (x < 5)` with `x = 10` printed nothing between \"before while\" and \"after while\".",
            },
            {
              question: "When is a do-while loop's condition checked?",
              answer:
                "After the body. The first pass always happens, then the condition decides whether to go again.\n\nIn bytecode it's very visible: the body comes first and the test is at the bottom, `if_icmplt 2`, jumping back to the start of the body. There's no check in front of the first pass at all.",
            },
            {
              question: "Can a while loop's body execute zero times? Can a do-while's?",
              answer:
                "A `while` loop's body can run zero times. A `do-while` body can't, it always runs at least once.\n\nSame condition, different result: with `x = 10`, `while (x < 5)` printed nothing, and `do { ... } while (x < 5)` printed \"do-while: 10\" once.",
            },
            {
              question: "What does break do inside a loop?",
              answer:
                "It exits the innermost enclosing loop immediately, and execution continues after the loop. The condition isn't checked again.\n\nTwo details worth adding: inside a `switch` it exits the `switch`, not the loop around it, and with a label (`break outer;`) it can exit an outer loop. In bytecode it's just a `goto` to the same exit address the condition jumps to.",
            },
            {
              question: "What does continue do inside a loop?",
              answer:
                "It skips the rest of the current iteration. In a `for` loop it goes to the update step, in `while` and `do-while` to the condition.\n\nIn the `javap` output of my break/continue loop, `continue` compiled to `goto 32`, which was the `iinc` for `i++`, not the condition. So `continue` in a `for` loop never skips the increment.",
            },
            {
              question: "What Java version introduced the enhanced for-each loop?",
              answer:
                "Java 5, released in 2004, as part of JSR 201 together with enums, autoboxing and static imports. Generics came in the same release.\n\nIt wasn't a new idea, C# and Perl already had `foreach`. What made it nice in Java was the combination with generics: `for (String s : names)` with no cast.",
            },
            {
              question: "Does the enhanced for-each loop give you access to the current index?",
              answer:
                "No. If I need the index, I use a classic `for` loop or keep a counter myself.\n\nOver an array `javac` actually does generate an index, but it's a hidden local slot I can't name. Over a `List` there's no index at all, it's an `Iterator`. That's also why for-each can't replace elements: assigning to the loop variable in my test left the array unchanged.",
            },
            {
              question: "What happens if a loop's condition never becomes false?",
              answer:
                "It runs forever, an infinite loop. The thread is stuck, typically burning a CPU core, until something outside kills it, or until a `break`, `return` or exception gets it out.\n\nIt doesn't crash on its own, because a loop doesn't grow the stack. My `for (byte b = 0; b < 128; b++)` ran until `timeout` killed it after 3 seconds, with exit code 124. If the compiler can see the condition is the constant `true` and there's no `break`, it even rejects code after the loop as unreachable.",
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
              question: "Explain the exact bytecode-level mechanism that makes a loop repeat (name the instruction type).",
              answer:
                "A conditional branch instruction, like `if_icmpge`, jumps forward out of the loop when the condition is false, and an unconditional `goto` at the end of the body jumps backward to the condition.\n\nIn my `whileLoop`, that was `4: if_icmpge 20` and `17: goto 2`. The JVM has no loop instruction. A loop is just a jump to a lower bytecode offset, which the JVM calls a back-edge.",
            },
            {
              question: "Why is the \"jump backward\" instruction the defining feature that distinguishes a loop from a simple if statement at the bytecode level?",
              answer:
                "Because an `if` only ever jumps forward, so each instruction runs at most once per pass through the method. A backward jump is the only way the same instructions can run again.\n\nIt's also what the JVM itself uses to recognize loops. HotSpot counts back-edges to decide when a loop is hot enough for OSR compilation, and in my `PrintCompilation` output the OSR entry was `@ 4`, exactly the target of the `goto 4`.",
            },
            {
              question: "What's the practical difference between using break and simply letting a loop's condition become false naturally?",
              answer:
                "Where the exit happens. The condition is checked at one fixed point, at the top for `for`/`while`. `break` exits from the middle of the body, skipping the rest of it and, in a `for` loop, the update.\n\nIn bytecode both end up at the same address: in my example the condition's `if_icmpge 38` and the `break`'s `goto 38`. So it's a readability choice. `break` is right for \"stop as soon as I find it\" searches. If every exit is a `break`, a proper condition is usually clearer.",
            },
            {
              question: "Why does a loop counter variable not get \"recreated\" each iteration? Where does it actually live in memory?",
              answer:
                "It lives in a local variable slot in the method's stack frame, and the slot is allocated once when the frame is created. Each iteration just overwrites it, with `iinc` for `i++`.\n\nThe frame size is fixed at compile time. In my `Slots` example, `javap -l` showed two loops in a row sharing slot 0, `i` first, then `j`. Objects created inside the body are different, those are new heap allocations each time.",
            },
            {
              question: "Give an example scenario where do-while is genuinely the correct choice over while.",
              answer:
                "Input validation: prompt, read, and repeat while the input is invalid. I always need to ask at least once.\n\nMy `PromptUntilValid` example did exactly that and accepted `42` after rejecting `abc` and `0`. With a `while` I'd have to duplicate the prompt before the loop or start with a fake invalid value. A retry loop where the first attempt always happens fits the same shape.",
            },
            {
              question: "Why was the enhanced for-each loop introduced specifically in Java 5, alongside Generics?",
              answer:
                "Because together they fixed the pain of iterating collections. Before Java 5, it was `Iterator it = list.iterator(); while (it.hasNext()) { String s = (String) it.next(); ... }`, with a manual cast every time.\n\nGenerics made the element type known at compile time, and for-each hid the iterator. `javac` still generates that iterator loop, the `iterator()`/`hasNext()`/`next()` calls and a `checkcast` are all in the bytecode I looked at, but I no longer write them.",
            },
            {
              question: "What real bug class does the enhanced for-each loop eliminate compared to manual indexing?",
              answer:
                "Off-by-one and out-of-bounds errors: `<=` instead of `<`, starting at 1 instead of 0, or using the wrong array's length as the bound.\n\nMy `OffByOne` example with `i <= ids.length` printed all three ids and then threw `ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3`. With for-each there's no index to get wrong. It also stops me from calling `list.get(i)` on a `LinkedList`, which would be O(n) per access.",
            },
            {
              question: "Can you modify a collection's elements using an enhanced for-each loop? What about the collection's structure (adding/removing)?",
              answer:
                "I can modify the objects the elements point to, but I can't replace elements, and I shouldn't add or remove. Assigning to the loop variable only changes a local copy, which is why my `prices` array was unchanged after `p = p * 2`, while `sb.append(\"!\")` on `StringBuilder` elements was visible.\n\nAdding or removing during for-each over an `ArrayList` usually throws `ConcurrentModificationException`, because the iterator's `next()` checks `modCount`. Not always, though: removing the second-to-last element made the loop end quietly and skip the last one. The safe ways are `Iterator.remove()` or `removeIf`.",
            },
            {
              question: "Why does JIT compilation particularly benefit loop-heavy code?",
              answer:
                "Because loops are where the same bytecode runs millions of times, which is exactly what the JIT is looking for. Compiling them to native code pays off immediately, and C2 has loop-specific optimizations: range check elimination, unrolling, hoisting invariant code, and vectorization.\n\nThe JVM also doesn't need to wait for the method to be called again. With OSR it compiles a hot loop and switches into it mid-execution. My `HotLoop` showed `HotLoop::main @ 4` with the `%` OSR flag at about 33 ms, even though `main` was called only once.",
            },
            {
              question: "What's an off-by-one error? Give a concrete example using < vs <=.",
              answer:
                "A loop that runs one time too many or too few, almost always because of the boundary. For an array of length 3, `for (int i = 0; i <= arr.length; i++)` runs four times and the fourth access throws.\n\nThe opposite is `i < arr.length - 1`, which silently skips the last element and doesn't throw at all, so it's worse. I stick to the half-open form `0 <= i < n`, which runs exactly `n` times, and I test boundaries with empty, one-element and exact-size inputs.",
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
              question: "Trace precisely, at the bytecode level, how a for loop's three components (init, condition, update) map to specific bytecode positions and jump targets.",
              answer:
                "For `for (int i = 0; i < 3; i++) println(i)`: the init is `0: iconst_0, 1: istore_0`. The condition starts at offset 2, `iload_0, iconst_3, if_icmpge 20`, jumping to the exit when false. The body is 7 to 11. The update is `14: iinc 0, 1`, and `17: goto 2` jumps back to the condition.\n\nSo the update is placed after the body even though it's written in the header, and it's the `continue` target. When I compared it with the same loop written as a `while`, `javap` showed identical bytecode.",
            },
            {
              question: "Compare the bytecode generated for a while loop versus a do-while loop. What's structurally different about where the condition check is positioned relative to the body?",
              answer:
                "In a `while`, the test is at the top, inverted (`if_icmpge` to exit), and there's a `goto` at the bottom back to the test. In a `do-while`, the body comes first and the test is at the bottom, not inverted (`if_icmplt` back to the body), with no `goto` at all.\n\nSo a `while` executes two jumps per iteration in bytecode and a `do-while` one. That doesn't matter for performance, because the JIT builds its own control-flow graph, but it's exactly why a `do-while` can't skip its first pass: nothing sits in front of the body.",
            },
            {
              question: "Explain how continue is implemented at the bytecode level differently from break.",
              answer:
                "Both are plain `goto`s; only the target differs. `break` jumps to the first instruction after the loop. `continue` jumps to the update in a `for` loop, or to the condition in `while`/`do-while`.\n\nIn my `breakAndContinue` method, `break` was `goto 38` (the `return` after the loop) and `continue` was `goto 32` (the `iinc`). Labeled versions are the same with an outer loop's targets: `break outer` became `goto 42`, past both loops.",
            },
            {
              question: "Why might a poorly bounded loop cause a StackOverflowError versus simply running very slowly? What's the distinction between an infinite loop and unbounded recursion?",
              answer:
                "A loop can't cause a `StackOverflowError` on its own. It runs inside one stack frame and reuses the same local slots, so an infinite loop just runs forever, burning CPU. My `ByteLoop` ran until `timeout` killed it, no error at all. A loop can only overflow the stack if its body calls something recursive.\n\nUnbounded recursion pushes a new frame per call, and each thread's stack has a fixed size (`-Xss`), so it fails fast with `StackOverflowError`. A loop that keeps adding to a collection is a third case: it eventually fails with `OutOfMemoryError`, because that grows the heap.",
            },
            {
              question: "How does the JIT compiler's loop optimization (e.g., loop unrolling) improve performance for extremely hot loop bodies?",
              answer:
                "Unrolling copies the body several times per iteration, so the loop does fewer compares and back-edge jumps per element and the CPU gets more independent work to schedule. C2 combines it with range check elimination, which proves the array index can't go out of bounds so the per-access check is removed or hoisted out, and with SuperWord vectorization, which uses SIMD instructions to process several array elements at once.\n\nI checked that these are on in my JDK 21 (`RangeCheckElimination`, `UseSuperWord` true, `LoopUnrollLimit = 60`), but I haven't measured each in isolation, so I wouldn't quote a speedup. JMH with `-prof perfasm` is the way to see it.",
            },
            {
              question: "Explain a real production scenario where an off-by-one bug in a loop caused a genuine incident, and how careful boundary testing would have caught it.",
              answer:
                "I'd describe the classic pagination one rather than claim an incident of my own: an export job loops `for (int page = 1; page < totalPages; page++)`, while the API is 0-based. It starts at page 1 and skips page 0, and stops one page short too. Nothing throws, the job reports success, and a slice of records is just missing from the export, often noticed days later.\n\nBoundary tests catch it: run the loop with 0 items, exactly one page, one page plus one item, and assert the total processed equals the total available. My `OffByOne` example at least failed loudly; this shape fails silently, which is why the count check matters.",
            },
            {
              question: "Why is modifying a collection's size while iterating over it with a for-each loop dangerous?",
              answer:
                "Because for-each uses the collection's iterator, and the iterator's position no longer matches the collection. `ArrayList` tracks structural changes in `modCount`. The iterator saves it and checks it in `next()`, throwing `ConcurrentModificationException` if it changed. My trace showed it from `ArrayList$Itr.checkForComodification`, reported on the `for` line.\n\nThe more dangerous case is when it doesn't throw. `hasNext()` only compares the cursor with the size, so removing the second-to-last element made the loop end early, and `C` was never processed. The fail-fast check is best effort. `Iterator.remove()`, `removeIf`, or a concurrent collection are the correct options.",
            },
            {
              question: "Compare the performance of a for loop with a manually managed index versus an enhanced for-each loop for simple array iteration. Is there a meaningful difference at the JIT-optimized level?",
              answer:
                "No. For an array, `javac` turns for-each into an index loop, so the bytecode is essentially the same, apart from for-each caching the array reference and length in hidden locals. The JIT sees the same counted loop and applies the same optimizations.\n\nMy timings agreed: after warm-up both took about 2-3 ms for 10 million `int`s, and which one \"won\" flipped between runs, which is noise. The difference that showed up was data layout: for-each over a `List<Integer>` was roughly 3x slower because of the pointer chasing and unboxing.",
            },
            {
              question: "Explain how nested loops multiply their total iteration count, and why this matters for algorithmic complexity.",
              answer:
                "The inner loop runs completely for every iteration of the outer one, so the counts multiply: n outer times m inner. With both equal to n, that's n², quadratic.\n\nMy `NestedCount` run showed it directly: n = 10, 100, 1000 gave 100, 10,000 and 1,000,000 inner iterations. Ten times the input, a hundred times the work. In backend code that's \"for each order, scan all drivers\", and the usual fix is building a `HashMap` first so the inner scan becomes an O(1) lookup.",
            },
            {
              question: "Design a scenario where using while(true) with an internal break condition is clearer than expressing the same logic as a standard for or while loop.",
              answer:
                "When the exit decision sits in the middle of the body, after some work that must happen first. For example, a consumer: `while (true) { Message m = queue.take(); if (m == POISON_PILL) break; handle(m); }`. Writing it as `while (cond)` would mean reading the first message before the loop and again at the end of the body.\n\nIt's also the shape for loops with several exits, like a retry that can stop on success, on a non-retryable error, or on a deadline. The compiler is fine with it: `javac` only complains about code after a `while (true)` if there's no `break` at all, which I saw as an \"unreachable statement\" error.",
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
              question: "A colleague's loop never terminates and the program hangs. What are the two most likely causes you'd check first?",
              answer:
                "First, the update: a `while` loop that never changes the variable in its condition, or a `continue` that skips the increment in a `while` loop. Second, a condition that can't become false, like `b < 128` on a `byte`, `!=` on a floating-point value, or a `while (true)` whose `break` is never reached because it waits on something external that never comes.\n\nTo confirm, I'd take a thread dump with `jstack` (or `jcmd <pid> Thread.print`): a busy loop shows up as a thread in `RUNNABLE` on the same line every time. My `ByteLoop` is the kind I'd look for, it compiled cleanly and ran until killed.",
            },
            {
              question: "You need to process a list of records exactly once each, without needing to know their position. Which loop type would you choose, and why?",
              answer:
                "The enhanced for loop, `for (Record r : records)`. It visits each element once in order, has no index or bound to get wrong, and works the same whether the list is an `ArrayList` or a `LinkedList`.\n\nThe one caveat: I wouldn't remove items from the list inside it. If processing means filtering out some records, I'd use `removeIf` or collect into a new list. A stream (`records.forEach(...)` or a pipeline) is the other reasonable choice.",
            },
            {
              question: "You need to keep prompting a user for input until they enter a valid value, guaranteeing at least one prompt even if they get it right immediately. Which loop type fits, and why?",
              answer:
                "`do-while`. The body (prompt and read) has to run once before there's anything to check, and that's exactly what `do-while` guarantees.\n\nMy `PromptUntilValid` did it: `do { prompt; read; parse } while (qty < 1 || qty > 99);`. Given `abc`, `0` and `42`, it asked three times and accepted `42`. In a real service I'd also cap the attempts, so a client sending garbage can't keep it going forever.",
            },
            {
              question: "Someone's loop is supposed to process 10 items but only processes 9. What's the most likely cause?",
              answer:
                "An off-by-one at a boundary. Usually the start or the end: starting at 1 with `< 10`, or `< size - 1` instead of `< size`.\n\nThe other cause I'd check is removing from the list while iterating it. My `RemoveWhileIterating` case 2 removed one element and the loop quietly skipped the last item without any exception. I'd print the indices at the boundaries, or better, write a test with the exact count that asserts every item was handled.",
            },
            {
              question: "A teammate uses break inside a nested loop expecting it to exit both loops, but it only exits the inner one. Explain what's actually happening.",
              answer:
                "An unlabeled `break` only ends the innermost loop (or `switch`) it's in. Control goes to the statement after the inner loop, which is still inside the outer loop, so the outer loop just carries on with its next iteration.\n\nIn my `FindInGrid` run, the plain `break` found 23 but still printed \"finished row 1\" and went through row 2. The fixes are a labeled `break search;`, which jumped straight past both loops, or moving the search into a method and using `return`. In bytecode the labeled version is just a `goto` to after the outer loop.",
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
            "Write `LoopsDemo.java` with a `for` loop that prints the numbers 1 to 10.",
            "Add a `while` loop whose condition is false from the start. Print something before and after it to prove the body never ran.",
            "Add a `do-while` loop with exactly the same condition, and show its body runs once anyway. Put a comment above it explaining, in your own words, why the same condition behaves differently.",
            "Use an enhanced for loop to print each element of an `int[]`.",
            "In two small separate loops, use `break` to stop once a specific value is found, and `continue` to skip even numbers.",
            "Bonus: run `javap -c LoopsDemo` and find the `goto` for each loop. Which loop doesn't have one?",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: my version printed `1 2 3 4 5 6 7 8 9 10` on one line, then `before while` and `after while` with nothing in between, then `do-while body ran` exactly once. The array `{120, 85, 240}` printed one fare per line. Searching `{7, 19, 42, 63}` for 42 printed `checked 7`, `checked 19`, `found 42, stopping`, and the `continue` loop printed `1 3 5 7 9`. In the bonus, the `do-while` is the loop without a `goto`: its condition at the bottom jumps back by itself.",
        },
      ],
    },
    {
      title: "Mini Project",
      blocks: [
        {
          type: "paragraph",
          text: "The task: a `NumberAnalyzer` that walks 1 to 50 with a `for` loop and uses `%` from the Operators lesson to say whether each number is divisible by 3, by 5, by both, or neither. \"Both\" must print something distinct, and numbers divisible by neither are skipped with `continue`. It's FizzBuzz with labels, and it pulls together the Operators, Control Statements and Loops lessons. I added counters so the totals can be checked.",
        },
        {
          type: "code",
          language: "java",
          title: "NumberAnalyzer.java",
          code: `public class NumberAnalyzer {
    public static void main(String[] args) {
        int byThree = 0, byFive = 0, byBoth = 0, skipped = 0;

        for (int n = 1; n <= 50; n++) {
            boolean three = n % 3 == 0;
            boolean five = n % 5 == 0;

            if (!three && !five) {
                skipped++;
                continue;                 // nothing to print for this number
            }

            String label;
            if (three && five) {          // check "both" first, or 15 would print as Fizz
                label = "FizzBuzz (by 3 and 5)";
                byBoth++;
            } else if (three) {
                label = "Fizz     (by 3)";
                byThree++;
            } else {
                label = "Buzz     (by 5)";
                byFive++;
            }
            System.out.printf("%2d  %s%n", n, label);
        }

        System.out.println("-".repeat(28));
        System.out.printf("by 3 only: %d, by 5 only: %d, both: %d, neither: %d%n",
            byThree, byFive, byBoth, skipped);
    }
}`,
        },
        {
          type: "output",
          text: ` 3  Fizz     (by 3)
 5  Buzz     (by 5)
 6  Fizz     (by 3)
 9  Fizz     (by 3)
10  Buzz     (by 5)
12  Fizz     (by 3)
15  FizzBuzz (by 3 and 5)
18  Fizz     (by 3)
20  Buzz     (by 5)
21  Fizz     (by 3)
24  Fizz     (by 3)
25  Buzz     (by 5)
27  Fizz     (by 3)
30  FizzBuzz (by 3 and 5)
33  Fizz     (by 3)
35  Buzz     (by 5)
36  Fizz     (by 3)
39  Fizz     (by 3)
40  Buzz     (by 5)
42  Fizz     (by 3)
45  FizzBuzz (by 3 and 5)
48  Fizz     (by 3)
50  Buzz     (by 5)
----------------------------
by 3 only: 13, by 5 only: 7, both: 3, neither: 27`,
        },
        {
          type: "list",
          items: [
            "The totals check out: 16 multiples of 3 and 10 multiples of 5 up to 50, with 3 in both (15, 30, 45). That's 13 + 7 + 3 = 23 printed lines and 50 - 23 = 27 skipped.",
            "The order of the `if` chain matters. If `three` were tested first, 15, 30 and 45 would be labeled Fizz and the both-branch would never run.",
            "Computing `three` and `five` once per iteration keeps each `%` in one place. `continue` puts the skip case up front, so the rest of the body only deals with numbers that get printed.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `LOOPS     for (init; cond; update)   counter / index
          while (cond)               check first, 0+ runs
          do { } while (cond);       body first, 1+ runs
          for (T x : arrayOrIterable) no index, Java 5+

CONTROL   break        exit innermost loop or switch
          continue     for: go to update
                       while/do-while: go to condition
          break label / continue label   outer loop

BYTECODE  cond inverted, jump forward to exit
          goto backward = the loop (back-edge)
          for == while; do-while: test at bottom
          for-each array -> hidden index loop
          for-each Iterable -> iterator/hasNext/next

JVM       hot loop -> OSR compile (% in PrintCompilation)
          safepoint polls on back-edges (strip mining)
          C2: unroll, range-check elim., vectorize

BUGS      <= length              -> AIOOBE
          byte b < 128           -> never ends
          remove in for-each     -> CME, or skipped item
          break in switch        -> loop keeps going`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If someone asks what makes a loop: a conditional jump out and a `goto` back. `do-while` runs at least once because nothing guards its first pass.",
            "For-each is compiler sugar. Over arrays it's an index loop, over collections it's an iterator, with all the iterator's rules.",
            "Most loop bugs are at the edges: the boundary, the exit condition, and changing what's being iterated.",
          ],
        },
      ],
    },
  ],
};
