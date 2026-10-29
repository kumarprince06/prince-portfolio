import type { Lesson } from "../types";

export const comparableAndComparator: Lesson = {
  slug: "comparable-and-comparator",
  date: "2026-10-29",
  title: "Comparable and Comparator",
  description:
    "How Java decides which of two objects comes first: natural order with Comparable, custom orders with Comparator, the contracts both must follow, and what Collections.sort, List.sort and Arrays.sort really run underneath.",
  tags: ["Core Java", "Collections", "Sorting", "Comparable", "Comparator"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a teacher lining up students. Usually she lines them up by name, A to Z, because that's the normal, everyday order for a register. But on sports day she may line them up by height instead. Same students, a different rule.",
        },
        {
          type: "paragraph",
          text: "Java has a word for each of those. **`Comparable`** is the normal order a type already knows about itself, like names sorting A to Z or numbers smallest first. **`Comparator`** is an extra rule I write from outside, like \"shortest name first\", and I can write as many as I like.",
        },
        {
          type: "paragraph",
          text: "Whenever Java sorts anything, or keeps a sorted map or set, it uses one of these two to decide which of two things comes first.",
        },
        {
          type: "code",
          language: "java",
          code: `List<String> names = new ArrayList<>(List.of("Zoya", "Om", "Meera"));
Collections.sort(names);                                  // natural order: A to Z
System.out.println(names);
names.sort(Comparator.comparing(String::length));         // my own order: shortest first
System.out.println(names);`,
        },
        {
          type: "output",
          text: `[Meera, Om, Zoya]
[Om, Zoya, Meera]`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "`Comparable` is a type's one built-in order; a `Comparator` is any other order I want to sort by.",
        },
      ],
    },
    {
      title: "What Comparable and Comparator Are",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a cricket scoreboard after an innings. Nobody needs to be told how to rank the batters: most runs at the top. That's the **natural order** for a scorecard. But the same eleven players can also be listed by jersey number for the team sheet, or by strike rate for an analyst. Same people, different orders, depending on who is asking.",
        },
        {
          type: "paragraph",
          text: "Java splits those two ideas into two interfaces. **`Comparable`** is the order a class carries with itself, its one natural order: numbers smallest first, strings alphabetically, dates earliest first. A class opts in by implementing one method, `compareTo`. **`Comparator`** is an order written from the outside, as a separate object, so I can have as many as I like: by price, by name, by rating and then by price.",
        },
        {
          type: "paragraph",
          text: "Both answer exactly one question about two objects: which one comes first? A negative number means \"the first one\", zero means \"same position\", positive means \"the second one\". Every sorted thing in the Collections Framework runs on that one question: `Collections.sort`, `List.sort`, `Arrays.sort`, `TreeMap`, `TreeSet`, `PriorityQueue`, `Collections.max`. So getting these two interfaces right is what makes the rest of the track work.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Both interfaces arrived together in Java 1.2 (1998), with the Collections Framework itself. Before that, Java had `Vector` and `Hashtable` and no standard way to sort objects at all. `String`, `Integer`, `Date` and friends were retrofitted to implement `Comparable` in the same release, which is why they all sort \"naturally\" today.",
        },
        {
          type: "paragraph",
          text: "In Java 5 both became generic. `Comparable` turned into `Comparable<T>`, so `compareTo` takes a `Player` instead of an `Object` and a wrong type is a compile error rather than a `ClassCastException`. I'll show below how the compiler still keeps an `Object` version around for old code.",
        },
        {
          type: "paragraph",
          text: "Java 8 changed how comparators are written. `Comparator` became a functional interface and gained static and default helper methods: `comparing`, `thenComparing`, `reversed`, `nullsFirst`, `naturalOrder`. Before that, every custom order was an anonymous inner class with a hand-written `compare` method. `List.sort` also arrived in Java 8 as a default method on `List`.",
        },
        {
          type: "callout",
          tone: "note",
          title: "A quick word on lambdas",
          text: "Lambdas and method references get their own lessons in the next track (Java 8). In this lesson, read `(a, b) -> Integer.compare(a, b)` as \"a tiny compare method written inline\", and `Dish::price` as \"call `price()` on each dish\". That's all I need from them here.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a school sports day.",
        },
        {
          type: "list",
          items: [
            "Every student has a **roll number** printed on their badge. That's `Comparable`: one built-in order, carried by the student, the same everywhere. If someone just says \"line up\", this is the order they mean.",
            "The race marshal has a **clipboard rule**: \"line up by height\" for the photo, \"by finishing time\" for the prize list. That's a `Comparator`: a separate rule the marshal brings, and he can swap it for another without touching the students.",
            "A clipboard rule can have a **tie-breaker**: \"by house, and inside a house by height\". That's `thenComparing`.",
            "If two students have the same height and nobody asked for a tie-breaker, the line keeps them in the order they were already standing. That's a **stable** sort, and Java's object sort is stable.",
          ],
        },
        {
          type: "paragraph",
          text: "The roll number lives inside the class. The clipboard rules live outside. That one difference decides when I use which.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The two interfaces",
        },
        {
          type: "paragraph",
          text: "I asked `javap` for the real shapes of both on JDK 21:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap java.lang.Comparable java.util.Comparator",
        },
        {
          type: "output",
          text: `public interface java.lang.Comparable<T> {
  public abstract int compareTo(T);
}
public interface java.util.Comparator<T> {
  public abstract int compare(T, T);
  public abstract boolean equals(java.lang.Object);
  public default java.util.Comparator<T> reversed();
  public default java.util.Comparator<T> thenComparing(java.util.Comparator<? super T>);
  public default <U extends java.lang.Comparable<? super U>> java.util.Comparator<T> thenComparing(java.util.function.Function<? super T, ? extends U>);
  public default java.util.Comparator<T> thenComparingInt(java.util.function.ToIntFunction<? super T>);
  ...
  public static <T extends java.lang.Comparable<? super T>> java.util.Comparator<T> reverseOrder();
  public static <T extends java.lang.Comparable<? super T>> java.util.Comparator<T> naturalOrder();
  public static <T> java.util.Comparator<T> nullsFirst(java.util.Comparator<? super T>);
  public static <T> java.util.Comparator<T> nullsLast(java.util.Comparator<? super T>);
  public static <T, U extends java.lang.Comparable<? super U>> java.util.Comparator<T> comparing(java.util.function.Function<? super T, ? extends U>);
  public static <T> java.util.Comparator<T> comparingInt(java.util.function.ToIntFunction<? super T>);
  ...`,
        },
        {
          type: "list",
          items: [
            "`Comparable` lives in `java.lang` and has exactly one method. It's so basic that `String`, `Integer` and every enum implement it.",
            "`Comparator` lives in `java.util`. Its only abstract method that matters is `compare(T, T)`. The `equals(Object)` you see is just a redeclaration of `Object.equals` for documentation, so it doesn't count against being a functional interface.",
            "Everything else on `Comparator` is a default or static helper from Java 8. They build new comparators out of old ones without me writing `compare` by hand.",
          ],
        },
        {
          type: "table",
          headers: ["", "Comparable", "Comparator"],
          rows: [
            ["Package", "`java.lang`", "`java.util`"],
            ["Method", "`int compareTo(T other)`", "`int compare(T a, T b)`"],
            ["Where it lives", "Inside the class being sorted", "A separate object"],
            ["How many orders", "One, the natural order", "As many as I need"],
            ["Needs the source code", "Yes, the class implements it", "No, works on any class, even JDK ones"],
            ["Used by default by", "`Collections.sort(list)`, `TreeSet()`, `TreeMap()`", "Anything that takes a `Comparator` argument"],
          ],
        },
        {
          type: "heading",
          text: "The return value",
        },
        {
          type: "diagram",
          text: `a.compareTo(b)   or   cmp.compare(a, b)

   negative  ->  a comes BEFORE b      (a "is less")
   zero      ->  same position         (a "equals" b for ordering)
   positive  ->  a comes AFTER b       (a "is greater")

Only the SIGN matters.  -1, -32 and -2_000_000 all mean "before".`,
          caption: "The whole contract in one picture. The size of the number carries no meaning.",
        },
        {
          type: "paragraph",
          text: "I learned the hard way that only the sign counts. `\"Apple\".compareTo(\"apple\")` returns `-32` (the gap between `'A'` and `'a'` in Unicode), and that's a perfectly valid answer. Code that checks `== -1` instead of `< 0` is a bug waiting to happen.",
        },
        {
          type: "heading",
          text: "The contract, in plain words",
        },
        {
          type: "paragraph",
          text: "The Javadoc lists rules that every `compareTo` and `compare` must follow. Sorting algorithms assume them, and if they're broken the result is a wrong order or an exception. Translated into scoreboard language:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Flip symmetry:** if Virat ranks above Rohit, Rohit must rank below Virat. Formally, `sgn(compare(a, b)) == -sgn(compare(b, a))`.",
            "**Transitivity:** if Virat is above Rohit and Rohit is above Gill, Virat is above Gill. No rock-paper-scissors.",
            "**Ties are consistent:** if Rohit and Rahul tie, they must compare the same way against everyone else.",
            "**Recommended, not required:** `compare(a, b) == 0` exactly when `a.equals(b)`. This is called being **consistent with equals**, and breaking it has real consequences in `TreeSet` and `TreeMap`, shown below.",
          ],
        },
        {
          type: "heading",
          text: "Where each one is used",
        },
        {
          type: "diagram",
          text: `               ┌─────────────────────────────┐
  no Comparator│ uses the element's          │  Collections.sort(list)
  given ──────►│ compareTo  (Comparable)     │  new TreeSet<>()
               │ ClassCastException if the   │  new TreeMap<>()
               │ class doesn't implement it  │  new PriorityQueue<>()
               └─────────────────────────────┘  list.sort(null)

               ┌─────────────────────────────┐
  Comparator   │ uses cmp.compare(a, b)      │  list.sort(cmp)
  given ──────►│ compareTo is ignored        │  new TreeSet<>(cmp)
               │                             │  Arrays.sort(arr, cmp)
               └─────────────────────────────┘  Collections.max(list, cmp)`,
          caption: "Every sorted API in java.util takes an optional Comparator and falls back to natural order without one.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/collections/comparator-chain.svg",
          alt: "Five trips sorted by city and then by fare in descending order, shown as before and after tables.",
          caption: "`thenComparing` only breaks ties: trips are sorted by city, then by highest fare inside each city.",
        },
        {
          type: "heading",
          text: "The hidden bridge method",
        },
        {
          type: "paragraph",
          text: "Here's a cricket player whose natural order is runs scored, fewest first:",
        },
        {
          type: "code",
          language: "java",
          title: "Player.java",
          code: `public class Player implements Comparable<Player> {
    final String name;
    final int runs;

    Player(String name, int runs) {
        this.name = name;
        this.runs = runs;
    }

    @Override
    public int compareTo(Player other) {
        return Integer.compare(this.runs, other.runs);   // fewer runs first
    }

    @Override
    public String toString() {
        return name + "(" + runs + ")";
    }
}`,
        },
        {
          type: "paragraph",
          text: "I wrote one `compareTo`. `javap -p` shows two:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p Player && javap -v -p Player | grep -A2 'compareTo(java.lang.Object)'",
        },
        {
          type: "output",
          text: `public class Player implements java.lang.Comparable<Player> {
  final java.lang.String name;
  final int runs;
  Player(java.lang.String, int);
  public int compareTo(Player);
  public java.lang.String toString();
  public int compareTo(java.lang.Object);
}
  public int compareTo(java.lang.Object);
    descriptor: (Ljava/lang/Object;)I
    flags: (0x1041) ACC_PUBLIC, ACC_BRIDGE, ACC_SYNTHETIC`,
        },
        {
          type: "paragraph",
          text: "Generics are erased at runtime, so to the JVM the interface method is really `compareTo(Object)`. My method takes a `Player`, which is a different descriptor. `javac` fills the gap with a **bridge method**, flagged `ACC_BRIDGE, ACC_SYNTHETIC`. Its bytecode is tiny:",
        },
        {
          type: "output",
          text: `  public int compareTo(java.lang.Object);
    Code:
       0: aload_0
       1: aload_1
       2: checkcast     #8                  // class Player
       5: invokevirtual #27                 // Method compareTo:(LPlayer;)I
       8: ireturn`,
        },
        {
          type: "paragraph",
          text: "It casts the argument to `Player` and calls my real method. That `checkcast` is where a `ClassCastException` comes from if something sneaks a non-`Player` into a sorted collection through raw types. Sorting code inside the JDK calls `compareTo(Object)` through the interface, lands on the bridge, and the bridge forwards to my code.",
        },
        {
          type: "heading",
          text: "Who actually sorts: following the call",
        },
        {
          type: "paragraph",
          text: "I wanted to see which JDK classes run when I call `Collections.sort`, without reading the source. So I made the comparator print its own call stack the first time it was asked to compare anything:",
        },
        {
          type: "code",
          language: "java",
          title: "WhoSorts.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class WhoSorts {
    static void showCaller(String label) {
        System.out.println(label);
        for (StackTraceElement f : new Throwable().getStackTrace()) {
            String c = f.getClassName();
            if (c.startsWith("java.util")) {
                System.out.println("  " + c + "." + f.getMethodName());
            }
        }
    }

    public static void main(String[] args) {
        List<String> small = new ArrayList<>(List.of("b", "a"));
        Collections.sort(small, (x, y) -> { showCaller("Collections.sort, 2 items:"); return x.compareTo(y); });

        String[] big = new String[40];
        for (int i = 0; i < big.length; i++) big[i] = "s" + (40 - i) % 7 + i;
        boolean[] printed = {false};
        Arrays.sort(big, (x, y) -> {
            if (!printed[0]) { printed[0] = true; showCaller("Arrays.sort, 40 items:"); }
            return x.compareTo(y);
        });
    }
}`,
        },
        {
          type: "output",
          text: `Collections.sort, 2 items:
  java.util.TimSort.countRunAndMakeAscending
  java.util.TimSort.sort
  java.util.Arrays.sort
  java.util.ArrayList.sort
  java.util.Collections.sort`,
        },
        {
          type: "paragraph",
          text: "Reading bottom up: `Collections.sort` just calls `list.sort`, `ArrayList.sort` hands its internal array to `Arrays.sort`, and `Arrays.sort` with a comparator runs **TimSort**. The first thing TimSort does is `countRunAndMakeAscending`: it looks for an already-sorted stretch at the start of the array. (The 40-item run printed the same three TimSort frames, so I've left that part out.)",
        },
        {
          type: "paragraph",
          text: "`javap -c` confirms the hand-offs. `Collections.sort(list, c)` is one `invokeinterface List.sort`. `ArrayList.sort` is more interesting:",
        },
        {
          type: "output",
          text: `  public void sort(java.util.Comparator<? super E>);
    Code:
       0: aload_0
       1: getfield      #63                 // Field modCount:I
       4: istore_2
       5: aload_0
       6: getfield      #9                  // Field elementData:[Ljava/lang/Object;
       9: iconst_0
      10: aload_0
      11: getfield      #48                 // Field size:I
      14: aload_1
      15: invokestatic  #325                // Method java/util/Arrays.sort:([Ljava/lang/Object;IILjava/util/Comparator;)V
      18: aload_0
      19: getfield      #63                 // Field modCount:I
      22: iload_2
      23: if_icmpeq     34
      26: new           #161                // class java/util/ConcurrentModificationException
      ...
      36: getfield      #63                 // Field modCount:I
      39: iconst_1
      40: iadd
      41: putfield      #63                 // Field modCount:I
      44: return`,
        },
        {
          type: "list",
          items: [
            "It sorts its own backing array in place: no copy, because `ArrayList` owns that array.",
            "It remembers `modCount` before sorting and throws `ConcurrentModificationException` if the list changed during the sort, for example from inside a badly written comparator.",
            "It bumps `modCount` afterwards, so any iterator that was open on the list will fail fast. The Iterators lesson explains `modCount` properly.",
          ],
        },
        {
          type: "paragraph",
          text: "For lists that aren't `ArrayList`, the default `List.sort` in the interface does it the slow, safe way. `javap -c java.util.List` shows the calls: `toArray()`, then `Arrays.sort(array, c)`, then a `listIterator()` loop of `next()` and `set()` to write the sorted values back. So sorting a `LinkedList` copies it into an array first. Nobody sorts a linked list node by node.",
        },
        {
          type: "heading",
          text: "Two algorithms: one for primitives, one for objects",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c java.util.Arrays   # the sort(int[]) and sort(Object[]) methods`,
        },
        {
          type: "output",
          text: `  public static void sort(java.lang.Object[]);
    Code:
       0: getstatic     #112                // Field java/util/Arrays$LegacyMergeSort.userRequested:Z
       3: ifeq          13
       ...
      20: invokestatic  #122                // Method java/util/ComparableTimSort.sort:([Ljava/lang/Object;II[Ljava/lang/Object;II)V
      23: return
  public static void sort(int[]);
    Code:
       ...
       5: invokestatic  #7                  // Method java/util/DualPivotQuicksort.sort:([IIII)V
       8: return`,
        },
        {
          type: "table",
          headers: ["Call", "Algorithm on JDK 21", "Stable?", "Why"],
          rows: [
            ["`Arrays.sort(int[])`, `long[]`, `double[]`...", "`DualPivotQuicksort`", "Not needed", "Two equal `int`s are indistinguishable, so stability means nothing. Quicksort is fast and needs no extra array"],
            ["`Arrays.sort(Object[])`", "`ComparableTimSort`", "Yes", "Uses `compareTo`. Equal objects can still differ (two players with 45 runs), so their order must be kept"],
            ["`Arrays.sort(T[], cmp)`, `List.sort`, `Collections.sort`", "`TimSort`", "Yes", "Same as above, but calls the comparator"],
          ],
        },
        {
          type: "paragraph",
          text: "`javap -p -constants java.util.TimSort` shows the tuning knobs: `MIN_MERGE = 32` (arrays shorter than this are sorted with a binary insertion sort, no merging at all), `MIN_GALLOP = 7`, and a temporary buffer starting at `INITIAL_TMP_STORAGE_LENGTH = 256`. The `getstatic LegacyMergeSort.userRequested` check is an escape hatch: the system property `java.util.Arrays.useLegacyMergeSort=true` brings back the pre-Java 7 merge sort, for old code that relied on a broken comparator not throwing.",
        },
        {
          type: "paragraph",
          text: "TimSort itself is well documented: it scans for **runs** (stretches that are already ascending, or strictly descending, which it reverses), extends short runs to a minimum length with insertion sort, and merges runs in a careful order using a stack. When one run keeps \"winning\" during a merge, it switches to **galloping**, jumping ahead with binary search.",
        },
        {
          type: "paragraph",
          text: "That's why it's close to O(n) on data that's already mostly sorted, which real data often is, and O(n log n) in the worst case. It needs up to n/2 extra references of temporary space.",
        },
        {
          type: "heading",
          text: "When the contract is broken, TimSort notices",
        },
        {
          type: "paragraph",
          text: "Because TimSort assumes the contract while it merges, it sometimes catches a comparator that breaks it. I gave it a comparator that answers at random, like a scorer flipping a coin:",
        },
        {
          type: "code",
          language: "java",
          title: "BrokenContract.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class BrokenContract {
    public static void main(String[] args) {
        List<Integer> nums = new ArrayList<>();
        Random random = new Random(7);
        for (int i = 0; i < 1000; i++) nums.add(random.nextInt(100));

        // "random" comparator: breaks every rule of the contract
        Random coin = new Random(42);
        try {
            Collections.sort(nums, (a, b) -> coin.nextInt(3) - 1);
            System.out.println("sorted without complaint");
        } catch (IllegalArgumentException e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: "java.lang.IllegalArgumentException: Comparison method violates its general contract!",
        },
        {
          type: "paragraph",
          text: "That message is famous in production logs. It's a best-effort check, not a guarantee: a broken comparator can just as easily produce a silently wrong order, especially on small lists that never reach the merge step. The real fix is always the comparator, never the JVM flag.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "SortTour.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class SortTour {
    public static void main(String[] args) {
        int[] scores = {45, 12, 82, 30};
        Arrays.sort(scores);                                  // primitives: natural only
        System.out.println(Arrays.toString(scores));

        String[] names = {"Rohit", "Gill", "Virat"};
        Arrays.sort(names, Comparator.reverseOrder());        // objects: any Comparator
        System.out.println(Arrays.toString(names));

        List<String> squad = new ArrayList<>(List.of("Rohit", "Gill", "Virat", "Bumrah"));
        Collections.sort(squad);                              // natural order
        System.out.println(squad);
        squad.sort(Comparator.comparingInt(String::length));  // List.sort, Java 8
        System.out.println(squad);

        int[] part = {9, 7, 5, 3, 1};
        Arrays.sort(part, 1, 4);                              // only index 1..3
        System.out.println(Arrays.toString(part));
    }
}`,
        },
        {
          type: "output",
          text: `[12, 30, 45, 82]
[Virat, Rohit, Gill]
[Bumrah, Gill, Rohit, Virat]
[Gill, Rohit, Virat, Bumrah]
[9, 3, 5, 7, 1]`,
        },
        {
          type: "list",
          items: [
            "`Arrays.sort(int[])` has no comparator version. To sort primitives in a custom order, I box them (`Integer[]`) or sort and then reverse.",
            "`Collections.sort(list)` and `list.sort(null)` both mean natural order. `list.sort(cmp)` is the modern spelling; `Collections.sort(list, cmp)` just calls it.",
            "Sorting by length kept `Gill`, `Rohit`, `Virat` in their alphabetical order for equal lengths (`Rohit` and `Virat` are both 5). That's stability again.",
            "`Arrays.sort(part, 1, 4)` sorts the half-open range: index 1 up to, but not including, 4.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Comparator builders (fragments)",
          code: `Comparator.naturalOrder()                       // same as compareTo
Comparator.reverseOrder()                       // natural, flipped
Comparator.comparing(Dish::name)                // by a Comparable key
Comparator.comparingInt(Dish::price)            // by an int key, no boxing
cmp.reversed()                                  // flip this whole comparator
cmp.thenComparing(Dish::name)                   // tie-breaker
Comparator.nullsFirst(cmp)                      // nulls before everything
Comparator.comparing(Dish::rating, Comparator.nullsLast(Comparator.reverseOrder()))`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Natural order: the scoreboard",
        },
        {
          type: "paragraph",
          text: "With `Player` from above implementing `Comparable`, the scoreboard can sort without being told how:",
        },
        {
          type: "code",
          language: "java",
          title: "Scoreboard.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Scoreboard {
    public static void main(String[] args) {
        List<Player> players = new ArrayList<>(List.of(
                new Player("Rohit", 45),
                new Player("Virat", 82),
                new Player("Gill", 12),
                new Player("Rahul", 45)));

        Collections.sort(players);                          // natural order
        System.out.println("ascending:  " + players);

        players.sort(Collections.reverseOrder());          // flip it
        System.out.println("descending: " + players);

        System.out.println("top scorer: " + Collections.max(players));
    }
}`,
        },
        {
          type: "output",
          text: `ascending:  [Gill(12), Rohit(45), Rahul(45), Virat(82)]
descending: [Virat(82), Rohit(45), Rahul(45), Gill(12)]
top scorer: Virat(82)`,
        },
        {
          type: "paragraph",
          text: "Rohit and Rahul both have 45. They stayed in the order they were added in **both** sorts, because a reverse comparator still says \"tie\" for them, and a stable sort doesn't swap ties. `Collections.max` also uses `compareTo`, no sorting needed.",
        },
        {
          type: "heading",
          text: "A menu card, sorted three ways",
        },
        {
          type: "paragraph",
          text: "A restaurant's menu card is grouped by section, and inside a section the waiter wants the expensive dishes first. The customer app wants \"cheapest first\". Same dishes, three comparators, and the `Dish` record doesn't implement `Comparable` at all:",
        },
        {
          type: "code",
          language: "java",
          title: "MenuSort.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class MenuSort {
    record Dish(String name, String category, int price) {}

    public static void main(String[] args) {
        List<Dish> menu = new ArrayList<>(List.of(
                new Dish("Paneer Tikka", "Starter", 220),
                new Dish("Gulab Jamun", "Dessert", 90),
                new Dish("Veg Soup", "Starter", 120),
                new Dish("Biryani", "Main", 260),
                new Dish("Dal Makhani", "Main", 180),
                new Dish("Kulfi", "Dessert", 90)));

        menu.sort(Comparator.comparing(Dish::price));
        print("by price", menu);

        menu.sort(Comparator.comparing(Dish::category)
                .thenComparing(Dish::price, Comparator.reverseOrder()));
        print("by category, then price high to low", menu);

        menu.sort(Comparator.comparingInt(Dish::price).reversed()
                .thenComparing(Dish::name));
        print("price high to low, then name", menu);
    }

    static void print(String label, List<Dish> menu) {
        System.out.println(label + ":");
        for (Dish d : menu) {
            System.out.println("  " + d.category() + " | " + d.name() + " | " + d.price());
        }
    }
}`,
        },
        {
          type: "output",
          text: `by price:
  Dessert | Gulab Jamun | 90
  Dessert | Kulfi | 90
  Starter | Veg Soup | 120
  Main | Dal Makhani | 180
  Starter | Paneer Tikka | 220
  Main | Biryani | 260
by category, then price high to low:
  Dessert | Gulab Jamun | 90
  Dessert | Kulfi | 90
  Main | Biryani | 260
  Main | Dal Makhani | 180
  Starter | Paneer Tikka | 220
  Starter | Veg Soup | 120
price high to low, then name:
  Main | Biryani | 260
  Starter | Paneer Tikka | 220
  Main | Dal Makhani | 180
  Starter | Veg Soup | 120
  Dessert | Gulab Jamun | 90
  Dessert | Kulfi | 90`,
        },
        {
          type: "list",
          items: [
            "`comparing(Dish::price)` builds a comparator that pulls out the price of each dish and compares those. I never wrote `compare`.",
            "`thenComparing(Dish::price, Comparator.reverseOrder())` is the tie-breaker, with its own order. Only the price part is reversed; categories stay A to Z.",
            "`comparingInt` avoids boxing every price into an `Integer` for each comparison. For a menu it doesn't matter, for a million rows it's free speed.",
          ],
        },
        {
          type: "heading",
          text: "Handling missing values with nullsFirst and nullsLast",
        },
        {
          type: "paragraph",
          text: "A teacher's register has a few students whose names haven't been entered yet. Natural order can't compare `null` with anything, so I have to say where the blanks go:",
        },
        {
          type: "code",
          language: "java",
          title: "NullsDemo.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

public class NullsDemo {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>(Arrays.asList("Meera", null, "Arjun", "Zoya", null));

        try {
            names.sort(Comparator.naturalOrder());
        } catch (NullPointerException e) {
            System.out.println("naturalOrder: NullPointerException");
        }

        names.sort(Comparator.nullsFirst(Comparator.naturalOrder()));
        System.out.println("nullsFirst: " + names);

        names.sort(Comparator.nullsLast(Comparator.<String>naturalOrder().reversed()));
        System.out.println("nullsLast, reversed: " + names);
    }
}`,
        },
        {
          type: "output",
          text: `naturalOrder: NullPointerException
nullsFirst: [null, null, Arjun, Meera, Zoya]
nullsLast, reversed: [Zoya, Meera, Arjun, null, null]`,
        },
        {
          type: "paragraph",
          text: "`nullsFirst` and `nullsLast` wrap another comparator. They handle the `null` cases themselves and only call the inner comparator when both sides are non-null. The `.reversed()` is inside the `nullsLast`, so it flips the names but leaves the blanks at the end.",
        },
        {
          type: "heading",
          text: "Stability, seen directly",
        },
        {
          type: "paragraph",
          text: "Orders arrive at a delivery hub in id order. The dispatcher regroups them by city but wants each city's orders to stay first-come, first-served:",
        },
        {
          type: "code",
          language: "java",
          title: "StableSort.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class StableSort {
    record Order(int id, String city) {}

    public static void main(String[] args) {
        // already sorted by id, the order they arrived in
        List<Order> orders = new ArrayList<>(List.of(
                new Order(101, "Pune"), new Order(102, "Delhi"),
                new Order(103, "Pune"), new Order(104, "Agra"),
                new Order(105, "Delhi"), new Order(106, "Pune")));

        orders.sort(Comparator.comparing(Order::city));
        for (Order o : orders) {
            System.out.println(o.city() + " " + o.id());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Agra 104
Delhi 102
Delhi 105
Pune 101
Pune 103
Pune 106`,
        },
        {
          type: "paragraph",
          text: "Inside each city the ids are still ascending, without me adding `thenComparing(Order::id)`. That's guaranteed for `List.sort`, `Collections.sort` and `Arrays.sort` on objects. It isn't guaranteed for `Arrays.sort(int[])`, and it isn't a property of `PriorityQueue` at all, so I don't rely on it there.",
        },
        {
          type: "heading",
          text: "How Strings compare",
        },
        {
          type: "code",
          language: "java",
          title: "StringOrder.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class StringOrder {
    public static void main(String[] args) {
        List<String> fruits = new ArrayList<>(List.of("banana", "apple", "Cherry", "10", "9"));
        fruits.sort(null);                                   // null = natural order
        System.out.println("natural:          " + fruits);
        fruits.sort(String.CASE_INSENSITIVE_ORDER);
        System.out.println("case-insensitive: " + fruits);
        System.out.println("\\"Apple\\".compareTo(\\"apple\\") = " + "Apple".compareTo("apple"));
        System.out.println("\\"10\\".compareTo(\\"9\\")        = " + "10".compareTo("9"));
    }
}`,
        },
        {
          type: "output",
          text: `natural:          [10, 9, Cherry, apple, banana]
case-insensitive: [10, 9, apple, banana, Cherry]
"Apple".compareTo("apple") = -32
"10".compareTo("9")        = -8`,
        },
        {
          type: "paragraph",
          text: "`String`'s natural order compares character codes, one by one. Every uppercase letter comes before every lowercase one, so `Cherry` jumps ahead of `apple`. And digits compare as characters, not numbers: `\"10\"` is before `\"9\"` because `'1'` is before `'9'`. For human-friendly order I use `String.CASE_INSENSITIVE_ORDER`, or a `java.text.Collator` for real language rules, and I compare numbers as numbers.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Comparing by subtraction",
        },
        {
          type: "paragraph",
          text: "`return a - b;` looks like the neatest comparator in the world, and it's in a lot of old tutorials. It's wrong whenever the difference doesn't fit in an `int`. Picture a bank ledger with one big credit and one big debit:",
        },
        {
          type: "code",
          language: "java",
          title: "Overflow.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Overflow {
    public static void main(String[] args) {
        Comparator<Integer> bySubtraction = (a, b) -> a - b;        // looks fine
        Comparator<Integer> byCompare = (a, b) -> Integer.compare(a, b);

        int big = 2_000_000_000, small = -2_000_000_000;
        System.out.println("big - small        = " + (big - small));
        System.out.println("subtraction says   = " + bySubtraction.compare(big, small));
        System.out.println("Integer.compare    = " + byCompare.compare(big, small));

        List<Integer> balances = new ArrayList<>(List.of(small, big));
        balances.sort(bySubtraction);
        System.out.println("sorted (broken)    = " + balances);
        balances.sort(byCompare);
        System.out.println("sorted (correct)   = " + balances);
    }
}`,
        },
        {
          type: "output",
          text: `big - small        = -294967296
subtraction says   = -294967296
Integer.compare    = 1
sorted (broken)    = [2000000000, -2000000000]
sorted (correct)   = [-2000000000, 2000000000]`,
        },
        {
          type: "paragraph",
          text: "Two billion minus minus-two billion is four billion, which doesn't fit in an `int` (max about 2.1 billion), so it wraps around to a negative number. The comparator then claims the big credit is **smaller** than the debt, and the \"sorted\" list comes out backwards. `Integer.compare`, `Long.compare` and `Double.compare` never overflow. Or I skip writing it at all with `Comparator.comparingInt`.",
        },
        {
          type: "heading",
          text: "Reversing the whole chain by accident",
        },
        {
          type: "paragraph",
          text: "A class teacher wants a merit list: marks high to low, and students with equal marks in alphabetical order. The obvious chain gets it wrong:",
        },
        {
          type: "code",
          language: "java",
          title: "ReversedTrap.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class ReversedTrap {
    record Student(String name, int marks) {}

    public static void main(String[] args) {
        List<Student> list = new ArrayList<>(List.of(
                new Student("Asha", 90), new Student("Ravi", 75),
                new Student("Bina", 90), new Student("Chetan", 75)));

        // want: marks high to low, then name A to Z
        list.sort(Comparator.comparingInt(Student::marks)
                .thenComparing(Student::name).reversed());
        System.out.println("whole chain reversed: " + names(list));

        list.sort(Comparator.comparingInt(Student::marks).reversed()
                .thenComparing(Student::name));
        System.out.println("only marks reversed:  " + names(list));
    }

    static List<String> names(List<Student> list) {
        List<String> out = new ArrayList<>();
        for (Student s : list) out.add(s.name() + " " + s.marks());
        return out;
    }
}`,
        },
        {
          type: "output",
          text: `whole chain reversed: [Bina 90, Asha 90, Ravi 75, Chetan 75]
only marks reversed:  [Asha 90, Bina 90, Chetan 75, Ravi 75]`,
        },
        {
          type: "paragraph",
          text: "`.reversed()` applies to everything built so far. Called at the end, it flipped the name tie-breaker too, so Bina came before Asha. Call it right after the key it should flip, or pass `Comparator.reverseOrder()` as the second argument to `comparing`/`thenComparing`.",
        },
        {
          type: "heading",
          text: "A comparator that drops elements from a TreeSet",
        },
        {
          type: "paragraph",
          text: "`TreeSet` and `TreeMap` don't use `equals` at all. If the comparator says zero, they treat the two objects as the **same element**:",
        },
        {
          type: "code",
          language: "java",
          title: "TreeSetLoss.java",
          code: `import java.util.Comparator;
import java.util.Set;
import java.util.TreeSet;

public class TreeSetLoss {
    record Student(String name, int marks) {}

    public static void main(String[] args) {
        Set<Student> byMarks = new TreeSet<>(Comparator.comparingInt(Student::marks));
        byMarks.add(new Student("Asha", 90));
        byMarks.add(new Student("Bina", 90));      // compare says "same" -> dropped
        byMarks.add(new Student("Ravi", 75));
        System.out.println(byMarks);

        Set<Student> fixed = new TreeSet<>(Comparator.comparingInt(Student::marks)
                .thenComparing(Student::name));
        fixed.add(new Student("Asha", 90));
        fixed.add(new Student("Bina", 90));
        fixed.add(new Student("Ravi", 75));
        System.out.println(fixed);
    }
}`,
        },
        {
          type: "output",
          text: `[Student[name=Ravi, marks=75], Student[name=Asha, marks=90]]
[Student[name=Ravi, marks=75], Student[name=Asha, marks=90], Student[name=Bina, marks=90]]`,
        },
        {
          type: "paragraph",
          text: "Bina silently vanished. No exception, `add` just returned `false`. The fix is a tie-breaker that makes the comparator consistent with `equals`, ideally ending on something unique like an id.",
        },
        {
          type: "heading",
          text: "Inconsistent with equals: the BigDecimal case",
        },
        {
          type: "paragraph",
          text: "The JDK has its own famous example. On a shop bill, Rs 1.0 and Rs 1.00 are the same amount. `BigDecimal` agrees in `compareTo`, but `equals` also compares the **scale** (number of decimal places):",
        },
        {
          type: "code",
          language: "java",
          title: "ScaleDemo.java",
          code: `import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.TreeSet;

public class ScaleDemo {
    public static void main(String[] args) {
        BigDecimal a = new BigDecimal("1.0");
        BigDecimal b = new BigDecimal("1.00");

        System.out.println("equals:    " + a.equals(b));      // scale differs
        System.out.println("compareTo: " + a.compareTo(b));   // same value

        Set<BigDecimal> hashSet = new HashSet<>(Set.of(a, b));
        Set<BigDecimal> treeSet = new TreeSet<>(Set.of(a, b));
        System.out.println("HashSet size: " + hashSet.size());
        System.out.println("TreeSet size: " + treeSet.size());
    }
}`,
        },
        {
          type: "output",
          text: `equals:    false
compareTo: 0
HashSet size: 2
TreeSet size: 1`,
        },
        {
          type: "paragraph",
          text: "Same two values, different set sizes, depending only on which set I picked. `HashSet` goes by `equals` and `hashCode`; `TreeSet` goes by `compareTo`. The `Comparable` Javadoc calls this out for `BigDecimal` by name. For money I either normalize the scale first (`setScale(2)`) or compare with `compareTo` everywhere.",
        },
        {
          type: "heading",
          text: "Smaller mistakes I've made",
        },
        {
          type: "list",
          items: [
            "Checking `compareTo(...) == -1` or `== 1`. Only the sign is promised, as `\"Apple\".compareTo(\"apple\")` returning `-32` showed. Use `< 0` and `> 0`.",
            "Comparing `double`s with `<` and `>` inside a comparator. `NaN` breaks it (every comparison with `NaN` is false). `Double.compare` puts `NaN` in a consistent place.",
            "Putting objects that don't implement `Comparable` into a `TreeSet` with no comparator. `Collections.sort(list)` refuses to compile for such a list, but `new TreeSet<Dish>()` compiles fine and the very first `add` fails with `ClassCastException: class ...Dish cannot be cast to class java.lang.Comparable`, thrown from `TreeMap.compare`.",
            "Writing a comparator that reads mutable fields and then changing those fields while the object sits in a `TreeSet`. The tree is now ordered by stale values, and lookups miss.",
          ],
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Implement `Comparable` only when the class has one obvious order everyone would agree on: an amount, a date, a version number. If I hesitate (\"by name? by price?\"), it's a `Comparator` instead.",
            "Build comparators with `Comparator.comparing`, `comparingInt` and `thenComparing` rather than writing `compare` by hand. They can't overflow and they read like the requirement.",
            "Never subtract to compare. Use `Integer.compare`, `Long.compare`, `Double.compare`.",
            "End every chain on a unique field (an id) when the result is shown to users or paged. Otherwise ties come out in whatever order they happened to be in, and page 2 can repeat items from page 1.",
            "Keep `compareTo` consistent with `equals` whenever the objects might go into a `TreeSet` or be `TreeMap` keys. If it can't be, document it like `BigDecimal` does.",
            "Store reusable comparators as `static final` constants (`BY_PRICE`) instead of rebuilding them in every call.",
            "Decide about `null` explicitly with `nullsFirst` or `nullsLast`. Don't let a single missing value turn a sort into a `NullPointerException`.",
            "Remember that `List.sort` sorts in place. If the list came from a caller, copy it first.",
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
            "Object sorts (`List.sort`, `Collections.sort`, `Arrays.sort(T[])`) are TimSort: O(n log n) comparisons in the worst case, close to O(n) when the input is already mostly in order, and up to n/2 extra references of temporary memory.",
            "Primitive sorts are dual-pivot quicksort: O(n log n) on average, in place, no comparator calls at all. Sorting an `int[]` is much cheaper than sorting the same numbers as a `List<Integer>`, where every comparison unboxes two objects.",
            "The comparator runs O(n log n) times, so whatever it does is multiplied. A comparator that parses a date string, lowercases a name or hits a map on every call does that work millions of times on a big list. Precompute the key once per element if it's expensive.",
            "`comparingInt`, `comparingLong` and `comparingDouble` avoid boxing the extracted key. `comparing(Dish::price)` with an `int` price boxes it to `Integer` on every comparison.",
            "Below 32 elements (`MIN_MERGE`), TimSort doesn't merge at all, it does a binary insertion sort. So tiny lists cost almost nothing to sort.",
            "`Arrays.parallelSort` exists for large arrays and uses the common fork/join pool. It only pays off for big inputs, and parallel work gets its own lessons later.",
            "If I only need the top few items of a huge list, I don't sort it. A `PriorityQueue` of size k (shown in Choosing the Right Collection) is O(n log k).",
          ],
        },
        {
          type: "paragraph",
          text: "I haven't measured sort timings here on purpose. They depend on data shape, JIT warm-up and the machine, and a number from my laptop would be misleading. The complexity figures above are the part that transfers.",
        },
      ],
    },
    {
      title: "Comparators in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The most common place I meet comparators in a backend is a listing endpoint: \"show products, sorted by whatever the user picked\". Here's a small version with the habits from above baked in: out-of-stock items always last, the user's chosen sort in the middle, a name tie-breaker so pages are stable, `nullsLast` for unrated items, and a copy so the caller's list is never touched.",
        },
        {
          type: "code",
          language: "java",
          title: "ProductListing.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public class ProductListing {
    record Product(String name, boolean inStock, Double rating, int price) {}

    static final Comparator<Product> BY_PRICE = Comparator.comparingInt(Product::price);
    static final Comparator<Product> BY_RATING = Comparator.comparing(
            Product::rating, Comparator.nullsLast(Comparator.reverseOrder()));
    static final Map<String, Comparator<Product>> SORTS = Map.of(
            "price", BY_PRICE, "rating", BY_RATING);

    static List<Product> list(List<Product> all, String sortKey) {
        Comparator<Product> chosen = SORTS.getOrDefault(sortKey, BY_RATING);
        Comparator<Product> full = Comparator.comparing(Product::inStock).reversed()
                .thenComparing(chosen)
                .thenComparing(Product::name);           // tie-breaker: stable pages
        List<Product> copy = new ArrayList<>(all);       // never sort the caller's list
        copy.sort(full);
        return copy;
    }

    public static void main(String[] args) {
        List<Product> all = List.of(
                new Product("Kettle", true, 4.2, 1499),
                new Product("Toaster", false, 4.8, 1999),
                new Product("Mixer", true, null, 2499),
                new Product("Iron", true, 4.2, 899));
        for (Product p : list(all, "rating")) System.out.println("rating: " + p);
        for (Product p : list(all, "price")) System.out.println("price:  " + p);
    }
}`,
        },
        {
          type: "output",
          text: `rating: Product[name=Iron, inStock=true, rating=4.2, price=899]
rating: Product[name=Kettle, inStock=true, rating=4.2, price=1499]
rating: Product[name=Mixer, inStock=true, rating=null, price=2499]
rating: Product[name=Toaster, inStock=false, rating=4.8, price=1999]
price:  Product[name=Iron, inStock=true, rating=4.2, price=899]
price:  Product[name=Kettle, inStock=true, rating=4.2, price=1499]
price:  Product[name=Mixer, inStock=true, rating=null, price=2499]
price:  Product[name=Toaster, inStock=false, rating=4.8, price=1999]`,
        },
        {
          type: "list",
          items: [
            "`Boolean`'s natural order is `false` before `true`, so `comparing(Product::inStock).reversed()` puts in-stock items first. The Toaster has the best rating and still comes last, because it can't be bought.",
            "Iron and Kettle tie on rating 4.2. The `name` tie-breaker decides, so the order is the same on every request. Without it, ties would depend on the database's row order.",
            "The sort key comes from a whitelist map, never from a raw request parameter turned into a field name. Unknown keys fall back to rating.",
            "In a real Spring service the same idea usually moves into the database (`ORDER BY in_stock DESC, rating DESC NULLS LAST, name`), because sorting in Java only works once all rows are loaded. In-memory comparators are right for small lists, merged results from several sources, or caches.",
          ],
        },
      ],
    },
    {
      title: "Interview Questions",
      blocks: [
        {
          type: "heading",
          text: "Basics",
        },
        {
          type: "qa",
          items: [
            {
              question: "What's the difference between Comparable and Comparator?",
              answer:
                "`Comparable` defines a class's natural order from inside the class, with `compareTo(T other)`. A class has at most one. `Comparator` defines an order from outside, as a separate object with `compare(T a, T b)`, and I can have as many as I need, even for classes I don't own.\n\nI use `Comparable` when there's one obvious order, like an amount or a date, and `Comparator` for everything else: sort by price, by name, by rating then price. The sorted APIs take an optional `Comparator` and fall back to `Comparable` without one.",
            },
            {
              question: "What do the return values of compareTo mean?",
              answer:
                "Negative means this object comes before the other, zero means they're equal for ordering, positive means it comes after. Only the sign matters, never the size.\n\nThat's not theoretical: `\"Apple\".compareTo(\"apple\")` returns `-32` on JDK 21. Code that checks `== -1` would break on it, so I always compare against zero.",
            },
            {
              question: "How do you sort a list of custom objects in Java?",
              answer:
                "Either make the class implement `Comparable` and call `Collections.sort(list)` or `list.sort(null)`, or pass a `Comparator`: `list.sort(Comparator.comparing(Dish::price))`. For arrays, `Arrays.sort(array)` or `Arrays.sort(array, comparator)`.\n\nAll of these sort in place. `Collections.sort(list, c)` is just a call to `list.sort(c)`, which I confirmed with `javap`, and `ArrayList.sort` sorts its own backing array directly.",
            },
            {
              question: "What are Comparator.comparing and thenComparing?",
              answer:
                "Java 8 factory and default methods that build comparators from key extractors. `comparing(Dish::category)` compares by the category, and `.thenComparing(Dish::price)` is used only when the categories tie. There are `comparingInt`, `comparingLong` and `comparingDouble` variants that avoid boxing, and two-argument versions that take a comparator for the key, like `thenComparing(Dish::price, Comparator.reverseOrder())`.\n\nThey replace hand-written `compare` methods, which removes a whole class of bugs like subtraction overflow and forgotten tie cases.",
            },
            {
              question: "How do you sort in descending order?",
              answer:
                "`Collections.reverseOrder()` or `Comparator.reverseOrder()` for natural order, or `.reversed()` on any comparator. For example `list.sort(Comparator.comparingInt(Dish::price).reversed())`.\n\nFor a primitive array there's no comparator overload, so I sort ascending and reverse it, or box it into an `Integer[]` if it's small.",
            },
            {
              question: "How do you handle null values while sorting?",
              answer:
                "Wrap the comparator in `Comparator.nullsFirst(...)` or `Comparator.nullsLast(...)`. For a nullable field, pass that as the key comparator: `Comparator.comparing(Product::rating, Comparator.nullsLast(Comparator.reverseOrder()))`.\n\nWithout it, `naturalOrder()` throws `NullPointerException` as soon as it meets a `null`, which I reproduced with a list of names that had two blanks.",
            },
          ],
        },
        {
          type: "heading",
          text: "Tricky",
        },
        {
          type: "qa",
          items: [
            {
              question: "Why is `return a - b;` a bad comparator?",
              answer:
                "Because `a - b` can overflow. With `a = 2_000_000_000` and `b = -2_000_000_000`, the difference wraps around to `-294967296`, so the comparator says the larger number is smaller. My two-element list came out as `[2000000000, -2000000000]`.\n\n`Integer.compare(a, b)` never overflows, and `Comparator.comparingInt` uses it. Subtraction is only safe when both values are known to be small and non-negative, and that's not worth remembering.",
            },
            {
              question: "What does it mean for compareTo to be consistent with equals, and what breaks if it isn't?",
              answer:
                "It means `a.compareTo(b) == 0` exactly when `a.equals(b)`. It's strongly recommended but not required.\n\nIf it doesn't hold, sorted sets and maps behave differently from hash-based ones, because `TreeSet` and `TreeMap` only use `compareTo`. `BigDecimal` is the textbook case: `1.0` and `1.00` aren't `equals` (different scale) but `compareTo` returns 0, so a `HashSet` kept both and a `TreeSet` kept one when I tried it.",
            },
            {
              question: "A TreeSet with a comparator by marks lost some students. Why?",
              answer:
                "Because `TreeSet` treats compare-equals-zero as \"same element\", and it never calls `equals`. Two students with 90 marks compare as zero, so the second `add` returns `false` and the student is simply not stored.\n\nThe fix is a tie-breaker that only returns zero for truly equal objects, for example `comparingInt(Student::marks).thenComparing(Student::name)`, or better, ending on a unique id.",
            },
            {
              question: "What's the difference between `comparing(a).thenComparing(b).reversed()` and `comparing(a).reversed().thenComparing(b)`?",
              answer:
                "`.reversed()` flips everything that's been chained before it. In the first version, both the main key and the tie-breaker are reversed. In the second, only the main key is reversed and the tie-breaker stays ascending.\n\nWith marks and names, the first gave me `[Bina 90, Asha 90, ...]` and the second `[Asha 90, Bina 90, ...]`. For a merit list with alphabetical ties, the second is right.",
            },
            {
              question: "Is Java's sort stable? Does it matter?",
              answer:
                "For objects, yes: `List.sort`, `Collections.sort` and `Arrays.sort(Object[])` use TimSort, which is stable, so equal elements keep their relative order. For primitive arrays the question doesn't apply, since two equal `int`s can't be told apart, and they use dual-pivot quicksort.\n\nIt matters whenever I sort in stages or sort data that already has a meaningful order. Orders arriving by id, sorted by city, kept their id order within each city without a second key. `PriorityQueue` gives no such guarantee.",
            },
            {
              question: "What is \"Comparison method violates its general contract!\"?",
              answer:
                "An `IllegalArgumentException` thrown by TimSort when, during merging, it notices that the comparator's answers contradict each other, for example `a < b`, `b < c` but `c < a`. Typical causes are random or time-based comparators, comparators on mutable fields that change mid-sort, subtraction overflow, and badly handled `NaN` or `null`.\n\nIt's best effort: I triggered it with a coin-flip comparator on 1,000 elements, but smaller or luckier inputs just come out wrongly ordered. The fix is the comparator. The `java.util.Arrays.useLegacyMergeSort` property only hides it.",
            },
          ],
        },
        {
          type: "heading",
          text: "Internals",
        },
        {
          type: "qa",
          items: [
            {
              question: "Which algorithm does Arrays.sort use?",
              answer:
                "It depends on the type. `javap -c java.util.Arrays` on JDK 21 shows `sort(int[])` calling `DualPivotQuicksort.sort`, while `sort(Object[])` calls `ComparableTimSort.sort` and the comparator version calls `TimSort`.\n\nQuicksort is fine for primitives, where stability is meaningless and in-place sorting saves memory. Objects need a stable sort, and TimSort is also very fast on partially sorted real-world data.",
            },
            {
              question: "How does TimSort work, roughly?",
              answer:
                "It walks the array finding natural runs, stretches already in ascending order, or strictly descending ones that it reverses in place. Short runs are extended to a minimum run length with binary insertion sort, and runs are pushed on a stack and merged under rules that keep the merges balanced. During a merge, if one side keeps winning, it switches to galloping, binary-searching ahead instead of comparing one by one.\n\nThe result is O(n log n) worst case and close to O(n) on nearly sorted input, with up to n/2 extra space. `javap -p -constants` shows `MIN_MERGE = 32`: below that, it's insertion sort only. My stack trace experiment showed the first call is always `countRunAndMakeAscending`.",
            },
            {
              question: "Why does a class implementing Comparable<Player> have two compareTo methods in its class file?",
              answer:
                "Because of type erasure. At runtime, `Comparable`'s method is `compareTo(Object)`, but my method is `compareTo(Player)`, a different descriptor. `javac` generates a bridge method `compareTo(Object)` flagged `ACC_BRIDGE, ACC_SYNTHETIC` that does `checkcast Player` and calls my method.\n\nI saw it with `javap -p` and `javap -v`. That `checkcast` is where a `ClassCastException` would come from if a raw-typed collection mixed in a different type.",
            },
            {
              question: "How does Collections.sort sort a LinkedList?",
              answer:
                "It calls `list.sort(c)`. `LinkedList` doesn't override it, so the default method in `List` runs: `javap -c java.util.List` shows it calling `toArray()`, then `Arrays.sort(array, c)`, then walking a `listIterator()` and calling `set()` for each element to write the sorted order back.\n\nSo it's O(n log n) on an array plus two O(n) passes. Nobody sorts linked nodes in place. `ArrayList` overrides `sort` and sorts its backing array directly, without the copy.",
            },
            {
              question: "Why does ArrayList.sort touch modCount?",
              answer:
                "Two reasons, both visible in its bytecode. It saves `modCount` before calling `Arrays.sort` and throws `ConcurrentModificationException` if it changed during the sort, which catches a comparator that modifies the list. Then it increments `modCount`, because a sort reorders elements, so any iterator that was open on the list must fail fast instead of continuing over a reshuffled array.\n\nThat's the same mechanism behind `ConcurrentModificationException` in loops, covered in the Iterators lesson.",
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
            "Make a `Book` class (title, author, year) implement `Comparable` by year. Sort five books with `Collections.sort` and print them. Hint: use `Integer.compare(this.year, other.year)`.",
            "Sort the same books by author, then title, using `Comparator.comparing(...).thenComparing(...)`. Hint: you don't touch the `Book` class at all.",
            "Sort them newest first, with ties broken by title A to Z. Then move `.reversed()` to the end of the chain and predict the difference before running it.",
            "Give two books a `null` author and sort by author with `nullsLast`. Then try plain `comparing(Book::author)` and read the exception.",
            "Put `new BigDecimal(\"2.50\")` and `new BigDecimal(\"2.5\")` into a `HashSet` and a `TreeSet`. Print the sizes and explain the difference in one sentence.",
            "Write `(a, b) -> a - b` and find two `int`s for which it gives the wrong sign. Hint: one large positive, one large negative.",
            "Sort a list of 10 orders by city only and check that orders within each city keep their original order. Then sort an `int[]` and think about why stability isn't even a question there.",
            "Bonus: run `javap -p` on your `Book` class and find the bridge method `compareTo(java.lang.Object)`.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `COMPARABLE   inside the class    int compareTo(T other)
             one natural order   String, Integer, LocalDate, enums
COMPARATOR   outside the class   int compare(T a, T b)
             any number of them  works on classes you don't own

RESULT       < 0 before   0 same position   > 0 after   (sign only!)

CONTRACT     flip symmetric, transitive, consistent ties
             recommended: compare == 0  <=>  equals
             TreeSet/TreeMap use compare, never equals

BUILDERS     comparing / comparingInt   thenComparing
             reversed (flips the whole chain so far)
             nullsFirst / nullsLast     naturalOrder / reverseOrder

NEVER        return a - b;      -> Integer.compare(a, b)

SORTING      list.sort(cmp)     Collections.sort -> list.sort
             ArrayList: sorts its array in place, bumps modCount
             other lists: toArray, sort, write back
             objects  -> TimSort, stable, O(n log n), ~O(n) if sorted
             int[]... -> DualPivotQuicksort, not stable, in place`,
          caption: "Everything from this lesson on one screen.",
        },
        {
          type: "list",
          items: [
            "`Comparable` is the order a class is born with; `Comparator` is any order I bring along. Both only answer \"which comes first\".",
            "Build comparators from keys with `comparing` and `thenComparing`, never by subtraction, and end on a unique tie-breaker.",
            "Object sorts are stable TimSort; primitive sorts are quicksort. Sorted collections trust the comparator completely, so a sloppy one loses data instead of throwing.",
          ],
        },
      ],
    },
  ],
};
