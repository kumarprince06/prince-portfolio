import type { Lesson } from "../types";

export const arraysClassAndCopying: Lesson = {
  slug: "arrays-class-and-copying",
  date: "2026-11-13",
  title: "The Arrays Class and Copying Arrays",
  description:
    "Everything java.util.Arrays and System.arraycopy add to plain arrays, on JDK 21: five ways to copy and what each one really copies, shallow versus deep copies of object arrays and 2D arrays, toString, equals, deepEquals, hashCode, mismatch and compare, sorting with dual-pivot quicksort and TimSort proved from javap and a stack trace, stability, the \"Comparison method violates its general contract\" crash, parallelSort measured at 4x, binarySearch and its negative insertion point, fill and the shared-row trap, Arrays.asList against List.of, streams over arrays, copy speed measured, and a seat-map preview that booked seats in an event-booking backend.",
  tags: ["Core Java", "Arrays", "Sorting", "Copying"],
  sections: [
    {
      title: "What the Arrays Class Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Arrays lesson ended with arrays that know their length and nothing else: they can't print themselves, compare themselves by content, sort, search or copy themselves into a bigger array. Every one of those jobs is a loop I could write by hand, and every hand-written version is a chance for an off-by-one.",
        },
        {
          type: "paragraph",
          text: "`java.util.Arrays` is a class of static utility methods that does those jobs: `toString`, `equals`, `hashCode`, `sort`, `binarySearch`, `fill`, `copyOf`, `asList`, `stream` and more, each overloaded for every primitive type and for objects. Next to it is `System.arraycopy`, the native method that almost every copy in the JDK ends up calling, and every array's own `clone()`.",
        },
        {
          type: "paragraph",
          text: "This lesson goes through them by job: copying first, because the difference between a **shallow** and a **deep** copy causes real bugs; then printing and comparing; sorting, including which algorithm runs and why one comparator crashes it; searching; filling; and converting between arrays and lists, where `Arrays.asList` has three traps. As before, everything is run on JDK 21, and the internals stay in.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 had `System.arraycopy` and `clone()` but nothing else: every program wrote its own sorting and searching. The Collections Framework in Java 1.2 (1998), designed by Joshua Bloch, added `java.util.Arrays` alongside `List`, `Set` and `Map`, with `sort`, `binarySearch`, `equals`, `fill` and `asList` as the bridge between arrays and collections. Later releases kept adding to it.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`System.arraycopy`, `clone()` on arrays", "The two copy primitives everything else uses"],
            ["Java 1.2 (1998)", "`java.util.Arrays`: `sort` (quicksort for primitives, merge sort for objects), `binarySearch`, `equals`, `fill`, `asList`", "The core of the class"],
            ["Java 5 (2004)", "`toString`, `deepToString`, `hashCode`, `deepHashCode`, `deepEquals`; `asList` becomes varargs", "Printing and content hashing without loops"],
            ["Java 6 (2006)", "`copyOf`, `copyOfRange`", "Copy and resize in one call; `ArrayList` uses `copyOf` to grow"],
            ["Java 7 (2011)", "Dual-pivot quicksort for primitives; TimSort for objects", "Faster sorts, and TimSort detects broken comparators"],
            ["Java 8 (2014)", "`parallelSort`, `parallelPrefix`, `setAll`, `parallelSetAll`, `stream`, `spliterator`", "Fork/join sorting and lambdas"],
            ["Java 9 (2017)", "`mismatch`, `compare`, range versions of `equals`; `List.of`", "Lexicographic comparison; immutable lists"],
            ["Java 11 (2018)", "`Collection.toArray(IntFunction)`", "`list.toArray(String[]::new)`"],
            ["Java 14 (2020)", "Primitive sorting reworked (JDK-8226297): heap sort fallback, parallel merging", "Guaranteed O(n log n) worst case for primitive sorts"],
            ["Java 16 (2021)", "`Stream.toList()`", "An unmodifiable list straight from a stream"],
          ],
        },
        {
          type: "paragraph",
          text: "The Java 7 sorting change was visible to users: code with an inconsistent comparator that had \"worked\" for years started throwing `IllegalArgumentException: Comparison method violates its general contract!`. The JDK kept a switch for it, `-Djava.util.Arrays.useLegacyMergeSort=true`, which still exists on JDK 21 and shows up in the `javap` output below.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I picture an office with filing cabinets.",
        },
        {
          type: "list",
          items: [
            "An **array is a drawer of folders**. Some folders hold the actual papers (a primitive array); some hold only a note saying which other cabinet the papers are in (an array of objects).",
            "A **shallow copy is photocopying the drawer's index**. For papers kept in the drawer, I get my own copy. For notes that point elsewhere, I get a copy of the note, and both notes lead to the **same** papers. Scribble on those papers and the original drawer sees the scribble.",
            "A **deep copy is photocopying every paper the notes point to** as well, and writing new notes that point to the copies.",
            "`Arrays.sort` is the **office clerk who files alphabetically**: a different clerk for numbers (dual-pivot quicksort) and for folders of objects (TimSort), and the object clerk never swaps two folders that compare equal, so their original order survives (stability).",
            "`binarySearch` is **opening the drawer in the middle** and halving each time. It only works if the drawer is already sorted; in an unsorted drawer it confidently reports \"not here\".",
            "`Arrays.asList` is a **window onto the drawer**: I can swap papers through it, but I can't add or remove folders, because the drawer's size is fixed. `List.of` is a **sealed photocopy**: independent of the drawer, and nobody can change it.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real photocopy is never \"half deep\". A Java copy is exactly one level deep, so copying a 2D array with `clone()` copies the outer drawer of notes and shares every row, which is the bug in the production section.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The class by job",
        },
        {
          type: "table",
          headers: ["Job", "Methods", "Notes"],
          rows: [
            ["Copy", "`copyOf`, `copyOfRange`, plus `System.arraycopy` and `array.clone()`", "All shallow"],
            ["Print", "`toString`, `deepToString`", "`deepToString` for nested arrays"],
            ["Compare", "`equals`, `deepEquals`, `mismatch`, `compare`", "Content, not identity"],
            ["Hash", "`hashCode`, `deepHashCode`", "Consistent with `equals` / `deepEquals`"],
            ["Sort", "`sort`, `parallelSort`", "Whole array or a range; objects with a `Comparator`"],
            ["Search", "`binarySearch`", "Sorted input only"],
            ["Fill", "`fill`, `setAll`, `parallelSetAll`, `parallelPrefix`", "Same value, or a value per index"],
            ["Convert", "`asList`, `stream`, `spliterator`", "Bridges to collections and streams"],
          ],
        },
        {
          type: "heading",
          text: "The copy options",
        },
        {
          type: "table",
          headers: ["Way", "Creates the target?", "Resize?", "Partial range?", "Type change?"],
          rows: [
            ["`a.clone()`", "Yes, same length", "No", "No", "No"],
            ["`Arrays.copyOf(a, n)`", "Yes", "Yes: pads with defaults or truncates", "From 0", "Overload `copyOf(a, n, Integer[].class)` for object arrays"],
            ["`Arrays.copyOfRange(a, from, to)`", "Yes", "`to` may pass the end; padded", "Yes", "Same overload"],
            ["`System.arraycopy(src, sp, dst, dp, n)`", "No, copies into an existing array", "No", "Yes, any offsets; overlap is safe", "Checked at run time"],
            ["A `for` loop", "Up to me", "Up to me", "Yes", "Any conversion I write"],
            ["`Arrays.stream(a).toArray()`", "Yes", "With `limit`/`skip`", "With `skip`/`limit`", "With `map`"],
          ],
        },
        {
          type: "paragraph",
          text: "Every one of these copies **one level**: the elements themselves. For `int[]` the elements are the values, so the copy is fully independent. For `Seat[]` or `int[][]` the elements are references, so the copy shares the objects or rows they point to. That's a **shallow copy**. A **deep copy** also copies what the references point to, and Java has no built-in method for it on arrays.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Everything ends in System.arraycopy",
        },
        {
          type: "paragraph",
          text: "`System.arraycopy` is declared `native` in `java.lang.System` and is a HotSpot **intrinsic**: the JIT replaces the call with its own copy code (vectorised loads and stores, or a `memmove`-like stub) instead of calling into C. `Arrays.copyOf(int[], int)` allocates the new array and calls `System.arraycopy`; `ArrayList.add` grows its `elementData` with `Arrays.copyOf`. `clone()` on an array is a different path: it's an intrinsic too, allocating the copy and copying the whole object body in one step.",
        },
        {
          type: "code",
          language: "java",
          title: "CloneBytecode.java",
          code: `public class CloneBytecode {
    static int[] copy(int[] a) { return a.clone(); }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac CloneBytecode.java && javap -c CloneBytecode",
        },
        {
          type: "output",
          text: `  static int[] copy(int[]);
    Code:
       0: aload_0
       1: invokevirtual #7                  // Method "[I".clone:()Ljava/lang/Object;
       4: checkcast     #8                  // class "[I"`,
        },
        {
          type: "list",
          items: [
            "`a.clone()` compiles to a call to `clone` on the class `[I`, followed by a `checkcast` to `[I`. Since Java 5 the source doesn't need a cast, because the JLS says an array's `clone()` returns the array's own type; the cast is still there in the bytecode, inserted by `javac`.",
            "Array classes override `Object.clone()` as **public** and without `throws CloneNotSupportedException`, which is why `a.clone()` needs no `try`/`catch`, unlike `clone()` on ordinary classes (the Object Class lesson covered that).",
            "`System.arraycopy` checks its arguments at run time: both must be arrays, of compatible types, with valid ranges. The `ArrayCopyRules` program below shows each failure.",
          ],
        },
        {
          type: "heading",
          text: "Which sort runs",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c java.util.Arrays | sed -n '/public static void sort(int\\[\\]);/,/return/p'
javap -c java.util.Arrays | sed -n '/public static void sort(java.lang.Object\\[\\]);/,/return/p'`,
        },
        {
          type: "output",
          text: `  public static void sort(int[]);
    Code:
       0: aload_0
       1: iconst_0
       2: iconst_0
       3: aload_0
       4: arraylength
       5: invokestatic  #7                  // Method java/util/DualPivotQuicksort.sort:([IIII)V
       8: return
  public static void sort(java.lang.Object[]);
    Code:
       0: getstatic     #112                // Field java/util/Arrays$LegacyMergeSort.userRequested:Z
       3: ifeq          13
       6: aload_0
       7: invokestatic  #118                // Method legacyMergeSort:([Ljava/lang/Object;)V
      10: goto          23
      13: aload_0
      14: iconst_0
      15: aload_0
      16: arraylength
      17: aconst_null
      18: iconst_0
      19: iconst_0
      20: invokestatic  #122                // Method java/util/ComparableTimSort.sort:([Ljava/lang/Object;II[Ljava/lang/Object;II)V
      23: return`,
        },
        {
          type: "list",
          items: [
            "`sort(int[])` calls `DualPivotQuicksort.sort(a, 0, 0, a.length)`. The second argument is the **parallelism**, 0 here; `parallelSort` passes the common pool's parallelism to the same class. On JDK 21 that class mixes insertion sort for tiny ranges, dual-pivot quicksort, merging of already-sorted runs, and a heap sort fallback that guarantees O(n log n) even on adversarial input. It isn't stable, which doesn't matter for primitives: two equal `int`s are indistinguishable.",
            "`sort(Object[])` checks the legacy flag (`-Djava.util.Arrays.useLegacyMergeSort=true`), and otherwise calls `ComparableTimSort`. With a `Comparator`, it's `TimSort`. TimSort is a **stable**, adaptive merge sort: it finds runs that are already sorted, extends short ones with binary insertion sort, and merges them. On nearly sorted data it approaches O(n).",
            "Objects need stability because equal objects can still be different: sorting trips by fare must not shuffle two trips with the same fare. Primitives don't, so they get the faster unstable algorithm.",
          ],
        },
        {
          type: "paragraph",
          text: "I confirmed the TimSort path at run time by sorting with a comparator that throws, and printing the JDK frames of the stack trace:",
        },
        {
          type: "code",
          language: "java",
          title: "WhichSort.java",
          code: `import java.util.Arrays;

public class WhichSort {
    public static void main(String[] args) {
        Integer[] few = {3, 1, 2};
        try {
            Arrays.sort(few, (x, y) -> { throw new IllegalStateException("look at the stack"); });
        } catch (IllegalStateException e) {
            for (StackTraceElement f : e.getStackTrace()) {
                if (f.getClassName().startsWith("java.util")) System.out.println("  at " + f);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `  at java.base/java.util.TimSort.countRunAndMakeAscending(TimSort.java:355)
  at java.base/java.util.TimSort.sort(TimSort.java:220)
  at java.base/java.util.Arrays.sort(Arrays.java:1234)`,
        },
        {
          type: "paragraph",
          text: "The very first comparison happens in `countRunAndMakeAscending`, TimSort's search for an initial sorted run. For an array this small (under 32 elements) TimSort doesn't merge at all; it finds one run and finishes with binary insertion sort.",
        },
      ],
    },
    {
      title: "Copying Arrays",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "CopyWays.java",
          code: `import java.util.Arrays;

public class CopyWays {
    public static void main(String[] args) {
        int[] fares = {60, 70, 80, 90, 100};

        int[] alias = fares;                                   // not a copy: same array
        int[] loop = new int[fares.length];
        for (int i = 0; i < fares.length; i++) loop[i] = fares[i];
        int[] cloned = fares.clone();
        int[] copyOf = Arrays.copyOf(fares, fares.length);
        int[] longer = Arrays.copyOf(fares, 7);                // padded with 0
        int[] shorter = Arrays.copyOf(fares, 3);               // truncated
        int[] range = Arrays.copyOfRange(fares, 1, 4);         // [1, 4)
        int[] target = new int[8];
        System.arraycopy(fares, 0, target, 2, fares.length);   // src, srcPos, dest, destPos, length
        int[] streamed = Arrays.stream(fares).toArray();

        fares[0] = -1;                                         // change the original
        System.out.printf("%-10s%s%n", "alias", Arrays.toString(alias));
        System.out.printf("%-10s%s%n", "loop", Arrays.toString(loop));
        System.out.printf("%-10s%s%n", "clone", Arrays.toString(cloned));
        System.out.printf("%-10s%s%n", "copyOf", Arrays.toString(copyOf));
        System.out.printf("%-10s%s%n", "longer", Arrays.toString(longer));
        System.out.printf("%-10s%s%n", "shorter", Arrays.toString(shorter));
        System.out.printf("%-10s%s%n", "range", Arrays.toString(range));
        System.out.printf("%-10s%s%n", "arraycopy", Arrays.toString(target));
        System.out.printf("%-10s%s%n", "stream", Arrays.toString(streamed));
    }
}`,
        },
        {
          type: "output",
          text: `alias     [-1, 70, 80, 90, 100]
loop      [60, 70, 80, 90, 100]
clone     [60, 70, 80, 90, 100]
copyOf    [60, 70, 80, 90, 100]
longer    [60, 70, 80, 90, 100, 0, 0]
shorter   [60, 70, 80]
range     [70, 80, 90]
arraycopy [0, 0, 60, 70, 80, 90, 100, 0]
stream    [60, 70, 80, 90, 100]`,
        },
        {
          type: "list",
          items: [
            "`int[] alias = fares` isn't a copy: changing `fares[0]` changed `alias[0]`. Every other line made an independent array, so the -1 didn't reach them.",
            "`copyOf(a, n)` with `n` larger than the length pads with the default value (0 here, `null` for objects); smaller truncates. That's how `ArrayList` grows.",
            "`copyOfRange(a, from, to)` uses the usual half-open range `[from, to)`: indexes 1, 2 and 3.",
            "`System.arraycopy(src, srcPos, dest, destPos, length)` copies into an array that already exists, at any offset. It's the only one that doesn't allocate, which is why `ArrayList.add(index, e)` and `remove` use it to shift elements.",
          ],
        },
        {
          type: "heading",
          text: "arraycopy's rules",
        },
        {
          type: "code",
          language: "java",
          title: "ArrayCopyRules.java",
          code: `import java.util.Arrays;

public class ArrayCopyRules {
    static void attempt(String label, Runnable r) {
        try { r.run(); System.out.println(label + " -> ok"); }
        catch (RuntimeException e) { System.out.println(label + " -> " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4, 5, 0, 0};
        System.arraycopy(a, 0, a, 2, 5);                  // overlapping: shift right by 2
        System.out.println("shift right " + Arrays.toString(a));
        int[] b = {1, 2, 3, 4, 5};
        System.arraycopy(b, 1, b, 0, 4);                  // shift left: delete b[0]
        System.out.println("shift left  " + Arrays.toString(b));

        attempt("int[] into long[]", () -> System.arraycopy(new int[2], 0, new long[2], 0, 2));
        attempt("too long", () -> System.arraycopy(new int[3], 0, new int[3], 1, 3));
        attempt("Object[] holding a String into Integer[]",
                () -> System.arraycopy(new Object[] {"x"}, 0, new Integer[1], 0, 1));
        attempt("null source", () -> System.arraycopy(null, 0, new int[1], 0, 1));
        attempt("copyOf negative length", () -> Arrays.copyOf(new int[2], -1));
    }
}`,
        },
        {
          type: "output",
          text: `shift right [1, 2, 1, 2, 3, 4, 5]
shift left  [2, 3, 4, 5, 5]
int[] into long[] -> ArrayStoreException: arraycopy: type mismatch: can not copy int[] into long[]
too long -> ArrayIndexOutOfBoundsException: arraycopy: last destination index 4 out of bounds for int[3]
Object[] holding a String into Integer[] -> ArrayStoreException: arraycopy: element type mismatch: can not cast one of the elements of java.lang.Object[] to the type of the destination array, java.lang.Integer
null source -> NullPointerException: null
copyOf negative length -> NegativeArraySizeException: -1`,
        },
        {
          type: "list",
          items: [
            "**Overlap is safe.** Copying `a[0..4]` to `a[2..6]` in the same array gave the right result, as if through a temporary copy. A naive forward loop would have overwritten `a[2]` before reading it and produced `1, 2, 1, 2, 1, 2, 1`.",
            "Shifting left by one is how `ArrayList.remove(0)` works. The last slot keeps a stale value (`5`); `ArrayList` then sets it to `null` so the GC can collect the removed object.",
            "**No widening.** `arraycopy` won't copy `int[]` into `long[]`, even though `int` widens to `long` everywhere else. Primitive arrays must match exactly; that needs a loop.",
            "**Element checks for object arrays.** Copying from `Object[]` to `Integer[]` checks each element, and throws `ArrayStoreException` on the first that doesn't fit. Elements before it have already been copied.",
            "Range errors are checked **before** anything is copied, and the messages name the offending index and type.",
          ],
        },
      ],
    },
    {
      title: "Shallow vs Deep Copy",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ShallowDeep.java",
          code: `import java.util.Arrays;

public class ShallowDeep {
    static final class Seat {
        final String label;
        boolean booked;
        Seat(String label) { this.label = label; }
        @Override public String toString() { return label + (booked ? "*" : ""); }
    }

    public static void main(String[] args) {
        // 1. Array of objects: clone copies the references
        Seat[] row = {new Seat("A1"), new Seat("A2")};
        Seat[] copy = row.clone();
        copy[0].booked = true;                       // changes the shared Seat
        copy[1] = new Seat("X9");                    // replaces only copy's slot
        System.out.println("original " + Arrays.toString(row) + "  copy " + Arrays.toString(copy)
                + "  same Seat? " + (row[0] == copy[0]));

        // 2. 2D array: clone copies the outer array only
        int[][] grid = {{0, 0}, {0, 0}};
        int[][] shallow = grid.clone();
        shallow[0][0] = 1;
        System.out.println("grid after shallow edit " + Arrays.deepToString(grid)
                + "  same row? " + (grid[0] == shallow[0]));

        // 3. Deep copy of a 2D int array: clone every row
        int[][] deep = new int[grid.length][];
        for (int r = 0; r < grid.length; r++) deep[r] = grid[r].clone();
        deep[1][1] = 7;
        System.out.println("grid after deep edit    " + Arrays.deepToString(grid)
                + "  deep " + Arrays.deepToString(deep));

        // 4. Deep copy of objects: copy each object too
        Seat[] deepRow = new Seat[row.length];
        for (int i = 0; i < row.length; i++) {
            deepRow[i] = new Seat(row[i].label);
            deepRow[i].booked = row[i].booked;
        }
        deepRow[1].booked = true;
        System.out.println("original " + Arrays.toString(row) + "  deep " + Arrays.toString(deepRow));
    }
}`,
        },
        {
          type: "output",
          text: `original [A1*, A2]  copy [A1*, X9]  same Seat? true
grid after shallow edit [[1, 0], [0, 0]]  same row? true
grid after deep edit    [[1, 0], [0, 0]]  deep [[1, 0], [0, 7]]
original [A1*, A2]  deep [A1*, A2*]`,
        },
        {
          type: "image",
          src: "/images/java/arrays-class-and-copying-shallow-deep.svg",
          alt: "Left: grid and shallow are two outer arrays whose row 0 and row 1 slots point to the same two int arrays, so shallow[0][0] = 1 also changes grid[0][0]. Right: grid and deep each point to their own two row arrays, so deep[1][1] = 7 leaves grid untouched.",
          caption: "clone() copies one level. For a 2D array that's the outer array of row references; the rows are shared until each one is cloned too.",
        },
        {
          type: "list",
          items: [
            "**Case 1.** `row.clone()` made a new array holding the **same** two `Seat` objects. Booking `copy[0]` booked `row[0]`, because it's one object. Replacing `copy[1]` with a new `Seat` changed only the copy's slot. Shallow copies share objects, not slots.",
            "**Case 2.** A 2D array is an array of row references, so `grid.clone()` copied two references and shared both rows. Writing `shallow[0][0]` wrote `grid[0][0]`.",
            "**Case 3.** Cloning each row gives a real copy for a 2D array of primitives: two levels, both copied. For three dimensions it needs one more level.",
            "**Case 4.** For mutable objects, a deep copy means creating new objects with the same state, through a copy constructor or a copy method. For **immutable** elements (`String`, `Integer`, records with immutable fields) a shallow copy is already safe, because nothing can change the shared objects.",
          ],
        },
        {
          type: "table",
          headers: ["Array", "Is `clone()` / `copyOf` enough?", "Deep copy"],
          rows: [
            ["`int[]`, `double[]`, any primitive", "Yes", "Not needed"],
            ["`String[]`, `Integer[]`, records of immutable fields", "Yes, the shared objects can't change", "Not needed"],
            ["`int[][]`", "No, rows are shared", "Clone every row"],
            ["`Seat[]`, `StringBuilder[]`, any mutable objects", "No, objects are shared", "Copy each object (copy constructor or method)"],
            ["`Seat[][]`", "No", "New outer array, new rows, new objects"],
          ],
        },
      ],
    },
    {
      title: "Printing, Comparing and Hashing",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "PrintAndCompare.java",
          code: `import java.util.Arrays;

public class PrintAndCompare {
    public static void main(String[] args) {
        int[] a = {60, 70, 80};
        int[] b = {60, 70, 80};
        int[][] g1 = {{1, 2}, {3}};
        int[][] g2 = {{1, 2}, {3}};

        System.out.println("println(a)          " + a);
        System.out.println("toString(a)         " + Arrays.toString(a));
        System.out.println("toString(g1)        " + Arrays.toString(g1));
        System.out.println("deepToString(g1)    " + Arrays.deepToString(g1));

        System.out.println("a == b              " + (a == b));
        System.out.println("a.equals(b)         " + a.equals(b));
        System.out.println("Arrays.equals(a, b) " + Arrays.equals(a, b));
        System.out.println("equals(g1, g2)      " + Arrays.equals(g1, g2));
        System.out.println("deepEquals(g1, g2)  " + Arrays.deepEquals(g1, g2));

        System.out.println("hashCode same?      " + (a.hashCode() == b.hashCode())
                + " / Arrays.hashCode same? " + (Arrays.hashCode(a) == Arrays.hashCode(b)));

        int[] c = {60, 75, 80};
        System.out.println("mismatch(a, c)      " + Arrays.mismatch(a, c) + ", mismatch(a, b) " + Arrays.mismatch(a, b));
        System.out.println("compare(a, c)       " + Arrays.compare(a, c) + ", compare({1,2}, {1,2,3}) "
                + Arrays.compare(new int[] {1, 2}, new int[] {1, 2, 3}));
        System.out.println("equals ranges       " + Arrays.equals(a, 0, 1, c, 0, 1));
    }
}`,
        },
        {
          type: "output",
          text: `println(a)          [I@2a139a55
toString(a)         [60, 70, 80]
toString(g1)        [[I@14ae5a5, [I@7f31245a]
deepToString(g1)    [[1, 2], [3]]
a == b              false
a.equals(b)         false
Arrays.equals(a, b) true
equals(g1, g2)      false
deepEquals(g1, g2)  true
hashCode same?      false / Arrays.hashCode same? true
mismatch(a, c)      1, mismatch(a, b) -1
compare(a, c)       -1, compare({1,2}, {1,2,3}) -1
equals ranges       true`,
        },
        {
          type: "list",
          items: [
            "`a.equals(b)` is `Object.equals`, identity, so it's `false` just like `==`. `Arrays.equals` compares lengths, then elements. (The `@...` hash values differ per run.)",
            "For nested arrays, `Arrays.equals(g1, g2)` compares the **rows** with `equals`, which is identity again, so it's `false`. `deepEquals` recurses into nested arrays. The same goes for `toString` versus `deepToString`.",
            "`a.hashCode()` is the identity hash, different for two arrays with equal contents. `Arrays.hashCode` is computed from the contents (`31 * h + element`, the same scheme as `List.hashCode`), so it's consistent with `Arrays.equals`.",
            "`mismatch` (Java 9) returns the first index where two arrays differ, or -1 if they're equal. `compare` orders arrays lexicographically: the first differing element decides, and a proper prefix comes first. Both use vectorised code internally, which makes them faster than a hand-written loop on large arrays.",
            "The range overload `equals(a, aFrom, aTo, b, bFrom, bTo)` compares slices without copying them.",
          ],
        },
        {
          type: "heading",
          text: "Arrays as keys",
        },
        {
          type: "code",
          language: "java",
          title: "ArraysEqualsMistake.java",
          code: `import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class ArraysEqualsMistake {
    public static void main(String[] args) {
        Set<int[]> seen = new HashSet<>();
        seen.add(new int[] {1, 2});
        System.out.println("contains {1,2}? " + seen.contains(new int[] {1, 2}));

        Set<String> keys = new HashSet<>();
        keys.add(Arrays.toString(new int[] {1, 2}));
        System.out.println("as String key: " + keys.contains(Arrays.toString(new int[] {1, 2})));

        record Point(int x, int y) { }
        Set<Point> points = new HashSet<>();
        points.add(new Point(1, 2));
        System.out.println("as record key: " + points.contains(new Point(1, 2)));
    }
}`,
        },
        {
          type: "output",
          text: `contains {1,2}? false
as String key: true
as record key: true`,
        },
        {
          type: "paragraph",
          text: "`HashSet` and `HashMap` use the element's own `hashCode` and `equals`, and an array's are identity-based, so an equal array is never found. The fix is a key type with content-based equality: a `record` (best, when the size is fixed), a `List<Integer>`, or as a last resort a `String` built with `Arrays.toString`.",
        },
      ],
    },
    {
      title: "Sorting",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Sorting.java",
          code: `import java.util.Arrays;
import java.util.Comparator;

public class Sorting {
    record Trip(String rider, int fare) { }

    public static void main(String[] args) {
        int[] fares = {240, 60, 150, 85, 120};
        Arrays.sort(fares);
        System.out.println("ints          " + Arrays.toString(fares));

        String[] names = {"ravi", "Asha", "meera", "Kabir"};
        Arrays.sort(names);
        System.out.println("natural       " + Arrays.toString(names));
        Arrays.sort(names, String.CASE_INSENSITIVE_ORDER);
        System.out.println("ignore case   " + Arrays.toString(names));
        Arrays.sort(names, Comparator.comparing(String::length).thenComparing(Comparator.reverseOrder()));
        System.out.println("length, desc  " + Arrays.toString(names));

        int[] part = {9, 8, 7, 6, 5, 4};
        Arrays.sort(part, 1, 4);                            // sorts indexes 1..3 only
        System.out.println("range [1,4)   " + Arrays.toString(part));

        Integer[] boxed = {3, 1, 2};
        Arrays.sort(boxed, Comparator.reverseOrder());      // descending needs objects
        System.out.println("descending    " + Arrays.toString(boxed));

        // Stability: equal fares keep their original order
        Trip[] trips = {new Trip("Asha", 120), new Trip("Ravi", 80), new Trip("Meera", 120), new Trip("Kabir", 80)};
        Arrays.sort(trips, Comparator.comparingInt(Trip::fare));
        System.out.println("stable        " + Arrays.toString(trips));
    }
}`,
        },
        {
          type: "output",
          text: `ints          [60, 85, 120, 150, 240]
natural       [Asha, Kabir, meera, ravi]
ignore case   [Asha, Kabir, meera, ravi]
length, desc  [ravi, Asha, meera, Kabir]
range [1,4)   [9, 6, 7, 8, 5, 4]
descending    [3, 2, 1]
stable        [Trip[rider=Ravi, fare=80], Trip[rider=Kabir, fare=80], Trip[rider=Asha, fare=120], Trip[rider=Meera, fare=120]]`,
        },
        {
          type: "list",
          items: [
            "Natural order for `String` is `compareTo`, by UTF-16 code, which happens to look alphabetical here only because each name starts with a different letter. `CASE_INSENSITIVE_ORDER` is what a person expects.",
            "Comparators compose: `comparing(String::length).thenComparing(reverseOrder())` sorts by length, then by reverse natural order within the same length.",
            "There's no `sort(int[], Comparator)`. To sort primitives in descending order, sort ascending and reverse, or box into an `Integer[]`. The boxed route costs memory, as the Arrays lesson measured.",
            "**Stability.** Ravi came before Kabir in the input, and Asha before Meera; both pairs kept that order after sorting by fare. TimSort guarantees it. That's what makes multi-pass sorting work: sort by name, then by fare, and each fare group stays sorted by name.",
          ],
        },
        {
          type: "heading",
          text: "Comparison method violates its general contract!",
        },
        {
          type: "code",
          language: "java",
          title: "BrokenComparator.java",
          code: `import java.util.Arrays;
import java.util.Comparator;
import java.util.Random;

public class BrokenComparator {
    record Driver(String id, double rating) { }

    public static void main(String[] args) {
        Random rnd = new Random(7);
        Driver[] drivers = new Driver[5_000];
        for (int i = 0; i < drivers.length; i++) drivers[i] = new Driver("D" + i, 1 + rnd.nextInt(5));

        // "Higher rating first" written by hand, but never returns 0 for equal ratings
        Comparator<Driver> broken = (a, b) -> a.rating() < b.rating() ? 1 : -1;
        try {
            Arrays.sort(drivers, broken);
            System.out.println("sorted");
        } catch (IllegalArgumentException e) {
            System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage());
        }

        Comparator<Driver> fixed = Comparator.comparingDouble(Driver::rating).reversed();
        Arrays.sort(drivers, fixed);
        System.out.println("fixed: first " + drivers[0].rating() + ", last " + drivers[drivers.length - 1].rating());
    }
}`,
        },
        {
          type: "output",
          text: `IllegalArgumentException: Comparison method violates its general contract!
fixed: first 5.0, last 1.0`,
        },
        {
          type: "list",
          items: [
            "A comparator must be consistent: `compare(a, b)` and `compare(b, a)` must have opposite signs, equal elements must return 0, and the order must be transitive. The broken one returns -1 for two drivers with the same rating whichever way round they're passed, so each one is \"less\" than the other.",
            "TimSort relies on that contract to skip comparisons while merging, and when it detects a contradiction it throws instead of silently producing garbage. On small arrays the same bug often goes unnoticed, which is why it shows up in production with real data sizes.",
            "The fix is to build comparators from `Comparator.comparing...`, `thenComparing` and `reversed()`, or use `Integer.compare` / `Double.compare`. Never subtract to compare (`a.fare - b.fare` overflows for large values), and never leave out the `0` case.",
          ],
        },
        {
          type: "heading",
          text: "parallelSort",
        },
        {
          type: "code",
          language: "java",
          title: "ParallelSort.java",
          code: `import java.util.Arrays;
import java.util.Random;

public class ParallelSort {
    public static void main(String[] args) {
        int[] data = new Random(1).ints(20_000_000).toArray();
        long sortBest = Long.MAX_VALUE, parBest = Long.MAX_VALUE;
        for (int round = 0; round < 5; round++) {
            int[] a = data.clone(), b = data.clone();
            long t = System.nanoTime(); Arrays.sort(a); sortBest = Math.min(sortBest, System.nanoTime() - t);
            t = System.nanoTime(); Arrays.parallelSort(b); parBest = Math.min(parBest, System.nanoTime() - t);
            if (!Arrays.equals(a, b)) throw new AssertionError();
        }
        System.out.println("cores " + Runtime.getRuntime().availableProcessors());
        System.out.println("Arrays.sort         " + sortBest / 1_000_000 + " ms");
        System.out.println("Arrays.parallelSort " + parBest / 1_000_000 + " ms");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx2g ParallelSort",
        },
        {
          type: "output",
          text: `cores 8
Arrays.sort         1787 ms
Arrays.parallelSort 458 ms`,
        },
        {
          type: "paragraph",
          text: "On 8 cores, `parallelSort` sorted 20 million random `int`s about 3.9 times faster, with an identical result. It splits the array, sorts the parts on the common `ForkJoinPool` and merges them. Below a threshold it just runs the sequential sort: 4,096 elements for primitive arrays (`DualPivotQuicksort.MIN_PARALLEL_SORT_SIZE`) and 8,192 for object arrays (`Arrays.MIN_ARRAY_SORT_GRAN`), both read with `javap -constants`, and on a busy server its threads compete with everything else using the common pool, so it's worth it for large arrays in batch work, not for small sorts inside request handlers.",
        },
        {
          type: "heading",
          text: "Natural order surprises",
        },
        {
          type: "code",
          language: "java",
          title: "SortStrings.java",
          code: `import java.util.Arrays;

public class SortStrings {
    public static void main(String[] args) {
        String[] files = {"trip10.csv", "trip2.csv", "Trip1.csv"};
        Arrays.sort(files);
        System.out.println(Arrays.toString(files));
        Integer[] withNull = {3, null, 1};
        try {
            Arrays.sort(withNull);
        } catch (NullPointerException e) {
            System.out.println("NullPointerException sorting an array with a null");
        }
        Arrays.sort(withNull, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()));
        System.out.println(Arrays.toString(withNull));
    }
}`,
        },
        {
          type: "output",
          text: `[Trip1.csv, trip10.csv, trip2.csv]
NullPointerException sorting an array with a null
[1, 3, null]`,
        },
        {
          type: "paragraph",
          text: "String order is character by character: upper-case `T` sorts before every lower-case letter, and `trip10` comes before `trip2` because `'1'` < `'2'`. Sorting file names or versions the way people expect needs a custom comparator that compares the numeric parts as numbers. Natural ordering also can't compare `null`; `Comparator.nullsFirst` / `nullsLast` wrap another comparator to place them.",
        },
      ],
    },
    {
      title: "Searching",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Searching.java",
          code: `import java.util.Arrays;

public class Searching {
    public static void main(String[] args) {
        int[] fares = {60, 85, 120, 150, 240};                  // sorted
        System.out.println("search 120 -> " + Arrays.binarySearch(fares, 120));
        int r = Arrays.binarySearch(fares, 100);
        System.out.println("search 100 -> " + r + ", insertion point " + (-r - 1));
        System.out.println("search 10  -> " + Arrays.binarySearch(fares, 10));
        System.out.println("search 999 -> " + Arrays.binarySearch(fares, 999));

        int[] dupes = {5, 7, 7, 7, 9};
        System.out.println("search 7 in dupes -> " + Arrays.binarySearch(dupes, 7));

        int[] unsorted = {240, 60, 150, 85, 120};
        System.out.println("search 60 in unsorted -> " + Arrays.binarySearch(unsorted, 60));

        // linear search for unsorted data
        int at = -1;
        for (int i = 0; i < unsorted.length; i++) if (unsorted[i] == 60) { at = i; break; }
        System.out.println("linear search 60 -> " + at);

        // inserting while keeping the array sorted
        int value = 100, ip = -Arrays.binarySearch(fares, value) - 1;
        int[] grown = new int[fares.length + 1];
        System.arraycopy(fares, 0, grown, 0, ip);
        grown[ip] = value;
        System.arraycopy(fares, ip, grown, ip + 1, fares.length - ip);
        System.out.println("inserted   " + Arrays.toString(grown));
    }
}`,
        },
        {
          type: "output",
          text: `search 120 -> 2
search 100 -> -3, insertion point 2
search 10  -> -1
search 999 -> -6
search 7 in dupes -> 2
search 60 in unsorted -> -1
linear search 60 -> 1
inserted   [60, 85, 100, 120, 150, 240]`,
        },
        {
          type: "list",
          items: [
            "Found: the index. Not found: `-(insertionPoint) - 1`, where the insertion point is where the value would go to keep the array sorted. 100 belongs at index 2, so the result is -3. The `- 1` makes \"not found, would go at 0\" (-1) different from \"found at 0\" (0), so **any negative result means not found**.",
            "With duplicates, any matching index can be returned (here the middle 7, index 2), not necessarily the first. Finding the first or last occurrence needs a hand-written lower-bound or upper-bound search.",
            "On an **unsorted** array the result is undefined: 60 is at index 1, but the search looked at the middle (150), went left, and reported not found. No exception, just a wrong answer. Sort first, or use a linear search.",
            "Binary search is O(log n): about 20 comparisons for a million elements, against up to a million for a linear search. The insertion point plus two `arraycopy` calls inserts while keeping the array sorted, which is how a sorted array can serve as a compact read-mostly set.",
          ],
        },
      ],
    },
    {
      title: "Filling and Generating",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "FillSetAll.java",
          code: `import java.util.Arrays;

public class FillSetAll {
    public static void main(String[] args) {
        int[] seats = new int[6];
        Arrays.fill(seats, -1);
        Arrays.fill(seats, 2, 4, 9);                         // [2, 4)
        System.out.println("fill        " + Arrays.toString(seats));

        int[] squares = new int[6];
        Arrays.setAll(squares, i -> i * i);
        System.out.println("setAll      " + Arrays.toString(squares));

        long[] prefix = {1, 2, 3, 4, 5};
        Arrays.parallelPrefix(prefix, Long::sum);
        System.out.println("prefix      " + Arrays.toString(prefix));

        // The trap: fill puts the SAME row object in every slot
        int[][] grid = new int[3][];
        Arrays.fill(grid, new int[3]);
        grid[0][0] = 1;
        System.out.println("fill rows   " + Arrays.deepToString(grid) + "  same row? " + (grid[0] == grid[2]));

        int[][] fixed = new int[3][];
        Arrays.setAll(fixed, i -> new int[3]);               // a new row per index
        fixed[0][0] = 1;
        System.out.println("setAll rows " + Arrays.deepToString(fixed));

        StringBuilder[] notes = new StringBuilder[2];
        Arrays.fill(notes, new StringBuilder());
        notes[0].append("x");
        System.out.println("fill objects " + Arrays.toString(notes));
    }
}`,
        },
        {
          type: "output",
          text: `fill        [-1, -1, 9, 9, -1, -1]
setAll      [0, 1, 4, 9, 16, 25]
prefix      [1, 3, 6, 10, 15]
fill rows   [[1, 0, 0], [1, 0, 0], [1, 0, 0]]  same row? true
setAll rows [[1, 0, 0], [0, 0, 0], [0, 0, 0]]
fill objects [x, x]`,
        },
        {
          type: "list",
          items: [
            "`fill` writes one value into every slot (or a `[from, to)` range). `setAll` calls a function with each index, so each slot can get a different value.",
            "`parallelPrefix` replaces each element with the running total (any associative operation), splitting the work across cores for large arrays. It's the in-place version of the prefix sums from the Arrays lesson.",
            "**The trap:** `fill(grid, new int[3])` evaluates `new int[3]` **once** and stores that one reference in every slot. All three \"rows\" are the same array, so writing `grid[0][0]` changed every row. The same happens with any object, like the `StringBuilder`. `setAll(grid, i -> new int[3])` runs the lambda per index and creates a new row each time.",
          ],
        },
      ],
    },
    {
      title: "Arrays.asList, List.of and toArray",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "AsListTraps.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class AsListTraps {
    static void attempt(String label, Runnable r) {
        try { r.run(); System.out.println(label + " -> ok"); }
        catch (RuntimeException e) { System.out.println(label + " -> " + e.getClass().getSimpleName()); }
    }

    public static void main(String[] args) {
        String[] cities = {"Kolkata", "Pune", "Delhi"};
        List<String> view = Arrays.asList(cities);

        view.set(0, "Mumbai");                                // writes through to the array
        cities[2] = "Chennai";                                // and the array writes through to the list
        System.out.println("array " + Arrays.toString(cities) + "  list " + view);
        attempt("view.add", () -> view.add("Goa"));
        attempt("view.remove", () -> view.remove(0));
        System.out.println("view class " + view.getClass().getName());

        int[] nums = {1, 2, 3};
        List<int[]> wrong = Arrays.asList(nums);              // ONE element: the int[] itself
        System.out.println("asList(int[]) size " + wrong.size());
        List<Integer> right = Arrays.stream(nums).boxed().toList();
        System.out.println("boxed list " + right);

        List<String> copy = new ArrayList<>(Arrays.asList(cities));   // independent and resizable
        copy.add("Goa");
        System.out.println("copy " + copy + "  array " + Arrays.toString(cities));

        List<String> fixed = List.of(cities);                         // copies, unmodifiable
        cities[0] = "Surat";
        System.out.println("List.of " + fixed);
        attempt("List.of(...).set", () -> fixed.set(0, "x"));
        attempt("List.of with null", () -> List.of("a", null));
        attempt("Arrays.asList with null", () -> Arrays.asList("a", null));

        String[] back = copy.toArray(new String[0]);
        Object[] objs = copy.toArray();
        System.out.println(back.getClass().getSimpleName() + " " + back.length + ", " + objs.getClass().getSimpleName());
    }
}`,
        },
        {
          type: "output",
          text: `array [Mumbai, Pune, Chennai]  list [Mumbai, Pune, Chennai]
view.add -> UnsupportedOperationException
view.remove -> UnsupportedOperationException
view class java.util.Arrays$ArrayList
asList(int[]) size 1
boxed list [1, 2, 3]
copy [Mumbai, Pune, Chennai, Goa]  array [Mumbai, Pune, Chennai]
List.of [Mumbai, Pune, Chennai]
List.of(...).set -> UnsupportedOperationException
List.of with null -> NullPointerException
Arrays.asList with null -> ok
String[] 4, Object[]`,
        },
        {
          type: "list",
          items: [
            "**Trap 1: it's a view, not a copy.** `Arrays.asList` wraps the array in `java.util.Arrays$ArrayList`, a private class that is **not** `java.util.ArrayList`. `set` writes into the array, and writing to the array changes the list.",
            "**Trap 2: fixed size.** `add` and `remove` throw `UnsupportedOperationException`, because the array underneath can't grow or shrink. Code that receives this list as a plain `List` fails only when it tries.",
            "**Trap 3: primitive arrays.** `Arrays.asList(T... a)` is generic, and `T` can't be `int`, so an `int[]` becomes a single element of type `int[]`: a `List<int[]>` of size 1. `Arrays.stream(nums).boxed().toList()` gives a `List<Integer>`.",
            "`new ArrayList<>(Arrays.asList(...))` is the classic way to get an independent, resizable list.",
            "`List.of(array)` **copies** the elements into an unmodifiable list: changing the array afterwards didn't affect it, and `set` throws. It rejects `null` elements; `Arrays.asList` allows them.",
            "`toArray(new String[0])` returns a `String[]`; plain `toArray()` returns an `Object[]` that can't be cast to `String[]`. Passing a zero-length array is the recommended form: the list allocates one of the exact size.",
          ],
        },
        {
          type: "table",
          headers: ["", "`Arrays.asList(arr)`", "`List.of(arr)`", "`new ArrayList<>(Arrays.asList(arr))`"],
          rows: [
            ["Copies the array?", "No, a view", "Yes", "Yes"],
            ["`set`", "Yes, writes to the array", "Throws", "Yes"],
            ["`add` / `remove`", "Throws", "Throws", "Yes"],
            ["`null` elements", "Allowed", "`NullPointerException`", "Allowed"],
            ["Works on `int[]`?", "No: `List<int[]>`", "No: `List<int[]>`", "No"],
          ],
        },
      ],
    },
    {
      title: "Arrays and Streams",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "StreamsOnArrays.java",
          code: `import java.util.Arrays;
import java.util.IntSummaryStatistics;

public class StreamsOnArrays {
    public static void main(String[] args) {
        int[] fares = {120, 85, 240, 60, 150};
        IntSummaryStatistics s = Arrays.stream(fares).summaryStatistics();
        System.out.println(s);
        System.out.println(Arrays.stream(fares).filter(f -> f >= 100).count() + " fares >= 100");
        System.out.println(Arrays.toString(Arrays.stream(fares).map(f -> f * 2).sorted().toArray()));
        System.out.println(Arrays.stream(fares, 1, 3).sum() + " (indexes 1..2)");
        String[] names = {"asha", "ravi"};
        System.out.println(Arrays.toString(Arrays.stream(names).map(String::toUpperCase).toArray(String[]::new)));
    }
}`,
        },
        {
          type: "output",
          text: `IntSummaryStatistics{count=5, sum=655, min=60, average=131.000000, max=240}
3 fares >= 100
[120, 170, 240, 300, 480]
325 (indexes 1..2)
[ASHA, RAVI]`,
        },
        {
          type: "paragraph",
          text: "`Arrays.stream(int[])` returns an `IntStream`, so there's no boxing: `sum`, `average` and `summaryStatistics` work on primitives directly. A range overload streams part of an array without copying it. `toArray(String[]::new)` gives a `String[]` instead of an `Object[]`. Streams are covered in depth in the Java 8 category; here they're one more way to read an array.",
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
          code: `import java.util.Arrays;

public class Flow {
    public static void main(String[] args) {
        int[][] grid = {{3, 1}, {2, 0}};
        int[][] copy = grid.clone();
        copy[0] = copy[0].clone();
        Arrays.sort(copy[0]);
        copy[1][1] = 9;
        System.out.println(Arrays.deepToString(grid) + " " + Arrays.deepToString(copy));
    }
}`,
        },
        {
          type: "output",
          text: `[[3, 1], [2, 9]] [[1, 3], [2, 9]]`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`int[][] grid = {{3, 1}, {2, 0}}`.** Three objects: two `int[2]` rows and an outer `int[][]` holding their references.",
            "**`grid.clone()`.** The array clone intrinsic allocates a new outer array of length 2 and copies its body: the two row **references**. `copy` and `grid` are different objects pointing to the same two rows.",
            "**`copy[0] = copy[0].clone()`.** Row 0 is cloned into a new `int[2]` {3, 1}, and only `copy`'s slot 0 is pointed at it. `grid[0]` still points at the original row 0. Row 1 is still shared.",
            "**`Arrays.sort(copy[0])`.** `DualPivotQuicksort` sorts the new row in place to {1, 3}. A 2-element range is handled by insertion sort. `grid[0]` is untouched because it's a different array now.",
            "**`copy[1][1] = 9`.** `aaload` reads `copy[1]`, which is the **shared** row 1, and `iastore` writes 9 into it. `grid[1][1]` becomes 9 too.",
            "**Printing.** `deepToString` recurses into each row: `grid` shows its original row 0 and the changed row 1; `copy` shows its sorted row 0 and the same row 1. Copying one level deeper for row 0 only protected row 0.",
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
          title: "ArraysTour.java",
          code: `import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

public class ArraysTour {
    public static void main(String[] args) {
        int[] a = {5, 3, 9, 1};

        // copying
        int[] c1 = a.clone();
        int[] c2 = Arrays.copyOf(a, 6);
        int[] c3 = Arrays.copyOfRange(a, 1, 3);
        int[] c4 = new int[4];
        System.arraycopy(a, 0, c4, 0, 4);
        System.out.println(Arrays.toString(c1) + " " + Arrays.toString(c2) + " " + Arrays.toString(c3) + " " + Arrays.toString(c4));

        // printing, comparing, hashing
        System.out.println(Arrays.toString(a) + " " + Arrays.deepToString(new int[][] {{1}, {2}})
                + " " + Arrays.equals(a, c1) + " " + Arrays.deepEquals(new int[][] {{1}}, new int[][] {{1}})
                + " " + (Arrays.hashCode(a) == Arrays.hashCode(c1)) + " " + Arrays.mismatch(a, c2) + " " + Arrays.compare(a, c4));

        // sorting and searching
        Arrays.sort(a);
        System.out.println(Arrays.toString(a) + " found 9 at " + Arrays.binarySearch(a, 9));
        String[] s = {"pune", "Delhi", "kolkata"};
        Arrays.sort(s, Comparator.comparing(String::toLowerCase));
        System.out.println(Arrays.toString(s));

        // filling
        int[] f = new int[4];
        Arrays.fill(f, 7);
        Arrays.setAll(c4, i -> i * 10);
        System.out.println(Arrays.toString(f) + " " + Arrays.toString(c4));

        // to and from lists and streams
        List<String> view = Arrays.asList(s);
        String[] back = List.of("x", "y").toArray(new String[0]);
        System.out.println(view + " " + back.length + " " + Arrays.stream(a).sum() + " " + Arrays.stream(a).boxed().toList());
    }
}`,
        },
        {
          type: "output",
          text: `[5, 3, 9, 1] [5, 3, 9, 1, 0, 0] [3, 9] [5, 3, 9, 1]
[5, 3, 9, 1] [[1], [2]] true true true 4 0
[1, 3, 5, 9] found 9 at 3
[Delhi, kolkata, pune]
[7, 7, 7, 7] [0, 10, 20, 30]
[Delhi, kolkata, pune] 2 18 [1, 3, 5, 9]`,
        },
        {
          type: "paragraph",
          text: "`Arrays.mismatch(a, c2)` is 4: the first four elements match and `c2` is longer, so the mismatch is at the end of the shorter array. `Arrays.compare(a, c4)` is 0 because `c4` is an exact copy at that point.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Merging two sorted arrays",
        },
        {
          type: "code",
          language: "java",
          title: "MergeSorted.java",
          code: `import java.util.Arrays;

public class MergeSorted {
    static int[] merge(int[] a, int[] b) {
        int[] out = new int[a.length + b.length];
        int i = 0, j = 0, k = 0;
        while (i < a.length && j < b.length) out[k++] = a[i] <= b[j] ? a[i++] : b[j++];
        System.arraycopy(a, i, out, k, a.length - i);         // whatever is left in a
        k += a.length - i;
        System.arraycopy(b, j, out, k, b.length - j);         // or in b
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(merge(new int[] {60, 120, 240}, new int[] {85, 90, 150, 300})));
        System.out.println(Arrays.toString(merge(new int[] {}, new int[] {1, 2})));
    }
}`,
        },
        {
          type: "output",
          text: `[60, 85, 90, 120, 150, 240, 300]
[1, 2]`,
        },
        {
          type: "paragraph",
          text: "The merge step of merge sort, and of TimSort: take the smaller head each time, then copy whatever is left of the other array in one `arraycopy`. O(n + m). Using `<=` takes from `a` on ties, which keeps the merge stable.",
        },
        {
          type: "heading",
          text: "Example 2: A pair with a given sum, without touching the caller's array",
        },
        {
          type: "code",
          language: "java",
          title: "PairSum.java",
          code: `import java.util.Arrays;

public class PairSum {
    // Two fares that add up to a voucher amount: sort, then walk inwards
    static int[] pairWithSum(int[] fares, int target) {
        int[] sorted = fares.clone();                         // don't reorder the caller's array
        Arrays.sort(sorted);
        int lo = 0, hi = sorted.length - 1;
        while (lo < hi) {
            int sum = sorted[lo] + sorted[hi];
            if (sum == target) return new int[] {sorted[lo], sorted[hi]};
            if (sum < target) lo++; else hi--;
        }
        return new int[0];
    }

    public static void main(String[] args) {
        int[] fares = {240, 60, 150, 85, 120};
        System.out.println(Arrays.toString(pairWithSum(fares, 205)));
        System.out.println(Arrays.toString(pairWithSum(fares, 1000)));
        System.out.println("caller's array unchanged: " + Arrays.toString(fares));
    }
}`,
        },
        {
          type: "output",
          text: `[85, 120]
[]
caller's array unchanged: [240, 60, 150, 85, 120]`,
        },
        {
          type: "paragraph",
          text: "Sorting makes the two-pointer walk possible: if the sum is too small, only moving `lo` right can increase it; too big, only moving `hi` left can decrease it. O(n log n) overall. The `clone()` before sorting is the important habit: `Arrays.sort` works in place, and sorting an argument would silently reorder the caller's data. \"No pair\" returns an empty array, not `null`.",
        },
        {
          type: "heading",
          text: "Example 3: Duplicates and the k-th largest by sorting",
        },
        {
          type: "code",
          language: "java",
          title: "Duplicates.java",
          code: `import java.util.Arrays;

public class Duplicates {
    static boolean hasDuplicate(String[] ids) {
        String[] sorted = ids.clone();
        Arrays.sort(sorted);                                  // equal values become neighbours
        for (int i = 1; i < sorted.length; i++) {
            if (sorted[i].equals(sorted[i - 1])) return true;
        }
        return false;
    }

    static int kthLargest(int[] values, int k) {
        int[] sorted = values.clone();
        Arrays.sort(sorted);
        return sorted[sorted.length - k];
    }

    public static void main(String[] args) {
        System.out.println(hasDuplicate(new String[] {"T9", "T2", "T7", "T2"}) + " "
                + hasDuplicate(new String[] {"T1", "T2"}));
        System.out.println(kthLargest(new int[] {240, 60, 150, 85, 120}, 2));
    }
}`,
        },
        {
          type: "output",
          text: `true false
150`,
        },
        {
          type: "paragraph",
          text: "Sorting puts equal values next to each other, so one pass over neighbours finds duplicates in O(n log n) with no extra data structure; a `HashSet` does it in O(n) average time with O(n) extra memory. The k-th largest after sorting is at `length - k`. For large arrays and small `k`, a `PriorityQueue` of size `k` (O(n log k)) avoids sorting everything; the Collections category covers it.",
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["I want to...", "Use", "Why"],
          rows: [
            ["Copy a whole array of the same length", "`a.clone()`", "Shortest, and as fast as the others"],
            ["Copy and resize, or copy a prefix", "`Arrays.copyOf`", "Pads or truncates in one call"],
            ["Copy a slice", "`Arrays.copyOfRange`", "Half-open range, allocates the result"],
            ["Copy into an existing array, or shift within one", "`System.arraycopy`", "No allocation, overlap-safe"],
            ["Copy a 2D array or an array of mutable objects", "A loop that copies each row or object", "All built-in copies are shallow"],
            ["Print for debugging or logs", "`Arrays.toString` / `deepToString`", "`println(array)` prints `[I@...`"],
            ["Compare contents", "`Arrays.equals` / `deepEquals` / `mismatch`", "`==` and `equals` are identity"],
            ["Use as a map key", "A `record` or `List`", "Arrays hash by identity"],
            ["Sort primitives / objects", "`Arrays.sort`, `parallelSort` for very large arrays", "Dual-pivot quicksort / stable TimSort"],
            ["Find a value", "`binarySearch` if sorted, a loop otherwise", "Binary search on unsorted data is silently wrong"],
            ["A list backed by an array, size fixed", "`Arrays.asList`", "No copy; `set` writes through"],
            ["An unmodifiable list", "`List.of`", "Copies; rejects `null`"],
            ["A resizable list", "`new ArrayList<>(Arrays.asList(a))`", "Independent copy"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Thinking clone() or copyOf makes an independent copy of a 2D array",
        },
        {
          type: "paragraph",
          text: "They copy the outer array only; every row is shared, as `ShallowDeep` and the production section show. Clone each row, or copy each object for arrays of mutable objects.",
        },
        {
          type: "heading",
          text: "Arrays.fill with an object or a row",
        },
        {
          type: "paragraph",
          text: "`Arrays.fill(grid, new int[3])` puts one array in every slot. Use `Arrays.setAll(grid, i -> new int[3])` or `new int[3][3]`.",
        },
        {
          type: "heading",
          text: "Adding to the list from Arrays.asList",
        },
        {
          type: "paragraph",
          text: "`Arrays.asList(a).add(x)` throws `UnsupportedOperationException`. It usually happens far from where the list was created: a method declared to return `List<String>` returns `Arrays.asList(...)`, and a caller later calls `add`. Return `new ArrayList<>(...)` if callers may modify it, or `List.of(...)` to make the read-only contract explicit.",
        },
        {
          type: "heading",
          text: "Arrays.asList(intArray)",
        },
        {
          type: "paragraph",
          text: "It compiles, and gives a `List<int[]>` of size 1. `list.contains(2)` is then always `false`. Use `Arrays.stream(a).boxed().toList()` or `IntStream.of(a)` operations.",
        },
        {
          type: "heading",
          text: "binarySearch on unsorted data",
        },
        {
          type: "paragraph",
          text: "No exception, just a wrong answer: `Searching` reported 60 missing from an array that contains it. Sort first (with the same comparator used for searching), or search linearly.",
        },
        {
          type: "heading",
          text: "Sorting an array you were given",
        },
        {
          type: "paragraph",
          text: "`Arrays.sort` is in place. Sorting a parameter reorders the caller's array, which is a surprising side effect for a method that only needed to read it. Clone first, as `PairSum` does.",
        },
        {
          type: "heading",
          text: "A comparator that isn't consistent",
        },
        {
          type: "paragraph",
          text: "Never returning 0, subtracting `int`s, or comparing on a field that can change during the sort leads to `Comparison method violates its general contract!` on large inputs, or to a silently wrong order. Build comparators with `Comparator.comparing` and friends.",
        },
        {
          type: "heading",
          text: "Expecting toArray() to return a String[]",
        },
        {
          type: "paragraph",
          text: "`(String[]) list.toArray()` throws `ClassCastException`: the no-argument version returns `Object[]`. Use `list.toArray(new String[0])` or `list.toArray(String[]::new)`.",
        },
        {
          type: "heading",
          text: "Copying primitive arrays of different types with arraycopy",
        },
        {
          type: "paragraph",
          text: "`System.arraycopy` from `int[]` to `long[]` throws `ArrayStoreException`. Widening needs a loop, or `Arrays.stream(ints).asLongStream().toArray()`.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Pick the copy by intent: `clone()` for a full copy, `copyOf` to resize, `copyOfRange` for a slice, `arraycopy` to copy into an existing array.",
            "Decide consciously between shallow and deep. If the elements are mutable objects or arrays, write the deep copy (and put it in one helper so it isn't half-done in several places).",
            "Make defensive copies at the boundaries of a class: copy arrays received in constructors and setters, and return copies (or unmodifiable lists) from getters.",
            "Use `Arrays.toString`/`deepToString` in logs and `Arrays.equals`/`deepEquals`/`hashCode` in `equals` and `hashCode` implementations of classes with array fields. Records with array components don't do this automatically: their generated `equals` compares the array references.",
            "Build comparators with `Comparator.comparing`, `thenComparing`, `reversed`, `nullsFirst`/`nullsLast`; never by subtraction.",
            "Clone before sorting an array that isn't yours.",
            "Use `binarySearch` only on data sorted with the same order, and treat any negative result as \"not found\".",
            "Use `setAll` instead of `fill` when each slot needs its own object.",
            "Prefer `List.of` for fixed lists, `new ArrayList<>(...)` for modifiable ones, and `Arrays.asList` only when a write-through view of an existing array is actually wanted.",
            "Use `parallelSort` for large arrays in batch jobs, not for small sorts inside request handling.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Folklore says `System.arraycopy` is much faster than a loop. I copied a 10-million-element `int[]` (40 MB) four ways, best of 20 runs each:",
        },
        {
          type: "code",
          language: "java",
          title: "CopySpeed.java",
          code: `import java.util.Arrays;
import java.util.function.Supplier;

public class CopySpeed {
    static int[] src = new int[10_000_000];

    static int[] loop() {
        int[] dst = new int[src.length];
        for (int i = 0; i < src.length; i++) dst[i] = src[i];
        return dst;
    }

    static int[] arraycopy() {
        int[] dst = new int[src.length];
        System.arraycopy(src, 0, dst, 0, src.length);
        return dst;
    }

    static long best(Supplier<int[]> s) {
        long best = Long.MAX_VALUE;
        for (int i = 0; i < 20; i++) {
            long t = System.nanoTime();
            int[] r = s.get();
            best = Math.min(best, System.nanoTime() - t);
            if (r[r.length - 1] != src[src.length - 1]) throw new AssertionError();
        }
        return best / 1_000;
    }

    public static void main(String[] args) {
        Arrays.setAll(src, i -> i * 31);
        System.out.println("for loop          " + best(CopySpeed::loop) + " µs");
        System.out.println("System.arraycopy  " + best(CopySpeed::arraycopy) + " µs");
        System.out.println("clone()           " + best(() -> src.clone()) + " µs");
        System.out.println("Arrays.copyOf     " + best(() -> Arrays.copyOf(src, src.length)) + " µs");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx1g CopySpeed",
        },
        {
          type: "output",
          text: `for loop          7660 µs
System.arraycopy  7600 µs
clone()           8944 µs
Arrays.copyOf     7619 µs`,
        },
        {
          type: "list",
          items: [
            "All four took about 7.6 ms, roughly 10 GB/s of reads and writes. At this size the copy is limited by **memory bandwidth**, not by the code: once the data doesn't fit in the CPU caches, every method waits for RAM at the same speed. A second run gave 7.5 to 7.8 ms for all four, `clone()` included; its 8.9 ms here is noise.",
            "The plain loop kept up because C2 recognises it as a copy loop, removes the bounds checks and vectorises it. The \"arraycopy is faster\" advice dates from interpreters and early JITs.",
            "So I choose by readability and intent, not speed. Where `arraycopy` really wins is shifting within one array (overlap handled correctly) and copying object arrays, where a loop would add a covariance check per store.",
            "This is a `System.nanoTime` measurement, not JMH. For small arrays, where allocation and call overhead dominate, results can differ; JMH is the tool for that question.",
          ],
        },
        {
          type: "heading",
          text: "The other costs",
        },
        {
          type: "list",
          items: [
            "**Sorting:** O(n log n) for both algorithms. TimSort approaches O(n) on nearly sorted object arrays. `parallelSort` was 3.9 times faster on 20 million `int`s with 8 cores.",
            "**Sorting objects is slower than primitives:** each comparison follows two references and calls a comparator, and the elements are scattered across the heap. Sorting a `long[]` of IDs is far cheaper than sorting `Long[]`.",
            "**`binarySearch`:** O(log n), about 20 comparisons per million elements.",
            "**`equals`, `mismatch`, `compare`, `fill`:** O(n), and implemented with vectorised intrinsics in the JDK, faster than a hand-written loop over large primitive arrays.",
            "**`Arrays.hashCode` is O(n) every call**, with no caching (unlike `String`). A key type wrapping a large array should compute its hash once.",
            "**`Arrays.asList`** is O(1): it wraps, it doesn't copy. `List.of(array)` and `new ArrayList<>(...)` copy, O(n).",
          ],
        },
      ],
    },
    {
      title: "Arrays in Production",
      blocks: [
        {
          type: "paragraph",
          text: "An event-booking backend shows each user a seat map, and when they tap seats it shows a **preview**: their selection highlighted as \"held\", before anything is booked. The developer wanted the preview not to touch the real seat map, so they cloned it first. A second feature, a report, called the seat map's getter and marked a seat on the returned array for display. After launch, shows started to sell out with empty seats in the hall: seats were \"held\" that nobody had booked.",
        },
        {
          type: "code",
          language: "java",
          title: "SeatMapPreview.java",
          code: `import java.util.Arrays;

public class SeatMapPreview {
    static final int FREE = 0, BOOKED = 1, HELD = 2;

    // What shipped
    static final class ShowBefore {
        private final int[][] seats = new int[3][5];          // 3 rows x 5 seats, the source of truth

        int[][] seats() { return seats; }                     // "read-only" getter

        // Shows the user their selection without booking it
        int[][] preview(int row, int... cols) {
            int[][] view = seats.clone();                     // shallow: rows are shared
            for (int c : cols) view[row][c] = HELD;
            return view;
        }
    }

    // The fix
    static final class ShowAfter {
        private final int[][] seats = new int[3][5];

        int[][] seats() { return deepCopy(seats); }

        int[][] preview(int row, int... cols) {
            int[][] view = deepCopy(seats);
            for (int c : cols) view[row][c] = HELD;
            return view;
        }

        static int[][] deepCopy(int[][] src) {
            int[][] copy = new int[src.length][];
            for (int r = 0; r < src.length; r++) copy[r] = src[r].clone();
            return copy;
        }
    }

    static long free(int[][] seats) {
        return Arrays.stream(seats).flatMapToInt(Arrays::stream).filter(s -> s == FREE).count();
    }

    public static void main(String[] args) {
        ShowBefore before = new ShowBefore();
        before.preview(0, 1, 2);                              // a user just looks at A2 and A3
        System.out.println("before: free seats after a preview      " + free(before.seats) + " of 15");
        before.seats()[2][4] = BOOKED;                        // a report "highlights" a seat on the returned array
        System.out.println("before: free seats after a caller edit  " + free(before.seats) + " of 15");
        System.out.println("before: " + Arrays.deepToString(before.seats));

        ShowAfter after = new ShowAfter();
        int[][] view = after.preview(0, 1, 2);
        after.seats()[2][4] = BOOKED;
        System.out.println("after:  free seats " + free(after.seats) + " of 15, preview shows " + Arrays.toString(view[0]));
    }
}`,
        },
        {
          type: "output",
          text: `before: free seats after a preview      13 of 15
before: free seats after a caller edit  12 of 15
before: [[0, 2, 2, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 1]]
after:  free seats 15 of 15, preview shows [0, 2, 2, 0, 0]`,
        },
        {
          type: "list",
          items: [
            "**Bug 1: the shallow clone.** `seats.clone()` copied the three row references, so `view[row][c] = HELD` wrote into the **real** rows. Every preview held seats for good: after one user merely looked at A2 and A3, only 13 of 15 seats were free. Real traffic means thousands of previews.",
            "**Bug 2: the leaking getter.** `seats()` returned the internal array itself. The report's harmless-looking write went straight into the source of truth and marked C5 booked. A `private final` field only stops the **reference** from being reassigned; it does nothing for the array's contents. The Encapsulation lesson called this a broken boundary.",
            "**The fix.** One `deepCopy` helper, used for the preview and the getter. The real map keeps all 15 seats free, and the preview still shows A2 and A3 held. The copy costs 4 small arrays per call, nothing next to a network request.",
            "**Why tests missed it.** The preview test checked that the returned view had the seats held, which it did. Nobody asserted that the original was unchanged afterwards. For any method that promises not to modify something, the test should check exactly that.",
            "**Stronger designs.** Return an immutable view instead of an array: `List<List<SeatState>>` built with `List.copyOf`, or a `SeatMap` class with `isFree(row, col)` and no way to get at the array. Seat holds that should exist belong in a separate structure with an expiry, written under the booking transaction, never as a side effect of rendering.",
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
              question: "How do you print an array in Java?",
              answer:
                "`Arrays.toString(a)` for a one-dimensional array and `Arrays.deepToString(a)` for nested arrays. `System.out.println(a)` prints the type and identity hash, like `[I@2a139a55`, because arrays don't override `toString`. The exception is `char[]`, which has its own `println` overload.",
            },
            {
              question: "How do you compare two arrays for equality?",
              answer:
                "`Arrays.equals(a, b)` compares lengths and elements. For nested arrays, `Arrays.deepEquals`. `a == b` and `a.equals(b)` both compare identity, so two separately created arrays with the same contents are not equal by either. In my test `Arrays.equals(g1, g2)` on two equal 2D arrays was `false` (it compares the rows by identity) and `deepEquals` was `true`.",
            },
            {
              question: "What are the ways to copy an array?",
              answer:
                "`a.clone()`, `Arrays.copyOf(a, n)` (resize: pad or truncate), `Arrays.copyOfRange(a, from, to)`, `System.arraycopy(src, srcPos, dest, destPos, length)` (into an existing array), a loop, and `Arrays.stream(a).toArray()`. Plain assignment (`int[] b = a`) is not a copy; both variables point to the same array. All of the real copies are shallow.",
            },
            {
              question: "How do you sort an array in descending order?",
              answer:
                "For objects: `Arrays.sort(arr, Comparator.reverseOrder())`, or `comparing(...).reversed()`. For primitives there's no comparator overload, so sort ascending and reverse in place with two pointers, or box into an `Integer[]` and use `reverseOrder()`, which costs memory.",
            },
            {
              question: "What does Arrays.binarySearch return when the element isn't found?",
              answer:
                "`-(insertionPoint) - 1`, where the insertion point is the index where the element would be inserted to keep the array sorted. Searching 100 in `{60, 85, 120, 150, 240}` returned -3 (insertion point 2). The `- 1` guarantees the result is negative even when the insertion point is 0, so any negative value means not found.",
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
              question: "What is the difference between a shallow copy and a deep copy of an array?",
              answer:
                "A shallow copy copies the elements of the array itself. For primitives that's the values, so it's fully independent; for references it's the references, so both arrays share the same objects or rows. A deep copy also copies what those references point to.\n\n`clone()`, `copyOf` and `arraycopy` are all shallow. For an `int[][]` I clone each row; for an array of mutable objects I create new objects. In my test, `grid.clone()` and then `shallow[0][0] = 1` changed `grid[0][0]`; a row-by-row deep copy didn't.",
            },
            {
              question: "What is the difference between Arrays.asList and List.of?",
              answer:
                "`Arrays.asList` returns a fixed-size **view** of the array (`java.util.Arrays$ArrayList`): `set` writes through to the array and changes to the array show in the list, but `add`/`remove` throw `UnsupportedOperationException`. It allows `null`.\n\n`List.of` returns an **unmodifiable copy**: no `set`, `add` or `remove`, and changes to the source array don't affect it. It rejects `null` with `NullPointerException`.",
            },
            {
              question: "Why does Arrays.asList(new int[] {1, 2, 3}).size() return 1?",
              answer:
                "`asList(T... a)` is generic, and a type parameter can't be a primitive. An `int[]` can't be spread into `T...` as `Integer`s, so the whole `int[]` becomes the single argument: a `List<int[]>` with one element. Use `Arrays.stream(arr).boxed().toList()` to get a `List<Integer>`.",
            },
            {
              question: "Which sorting algorithms does Arrays.sort use?",
              answer:
                "For primitive arrays, dual-pivot quicksort (`DualPivotQuicksort`), with insertion sort for small ranges, run merging, and a heap sort fallback that guarantees O(n log n); it isn't stable. For object arrays, TimSort (`ComparableTimSort` without a comparator, `TimSort` with one), a stable, adaptive merge sort. I confirmed both from `javap -c java.util.Arrays` and from a stack trace thrown inside a comparator.",
            },
            {
              question: "Why is object sorting stable but primitive sorting not?",
              answer:
                "Two equal `int`s are indistinguishable, so stability can't matter and the faster unstable quicksort is used. Two objects that compare equal can still be different (two trips with the same fare but different riders), and stability guarantees their original order is kept, which is what makes sorting by one key and then by another work.",
            },
            {
              question: "What causes \"Comparison method violates its general contract!\"?",
              answer:
                "A comparator that isn't consistent: it never returns 0 for equal elements, isn't antisymmetric (`compare(a, b)` and `compare(b, a)` don't have opposite signs), or isn't transitive. TimSort detects the contradiction while merging and throws `IllegalArgumentException`. My comparator `a.rating() < b.rating() ? 1 : -1` triggered it on 5,000 drivers. The fix is `Comparator.comparingDouble(Driver::rating).reversed()`.",
            },
            {
              question: "Can you use an int[] as a key in a HashMap?",
              answer:
                "It compiles, but it doesn't work as expected: arrays use identity `hashCode` and `equals`, so a lookup with an equal but different array never finds the entry. My `HashSet<int[]>.contains(new int[] {1, 2})` returned `false`. Use a `record`, a `List<Integer>`, or a wrapper class whose `equals`/`hashCode` call `Arrays.equals`/`Arrays.hashCode`.",
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
              question: "Is System.arraycopy faster than a for loop?",
              answer:
                "For large primitive arrays, not measurably on a modern JVM. Copying 10 million `int`s took about 7.6 ms with a loop, `arraycopy`, `clone()` and `copyOf` alike: the copy is bound by memory bandwidth, and C2 vectorises the plain loop. `arraycopy` is still the right tool for copying into an existing array, shifting within one array (it handles overlap) and copying object arrays, where it avoids a per-element covariance check.",
            },
            {
              question: "How does System.arraycopy handle overlapping source and destination?",
              answer:
                "Correctly: the result is as if the source range were first copied to a temporary array. Shifting `{1, 2, 3, 4, 5, 0, 0}` right by 2 within the same array gave `{1, 2, 1, 2, 3, 4, 5}`. A naive forward loop would overwrite elements before reading them. `ArrayList.add(index, e)` and `remove(index)` rely on this.",
            },
            {
              question: "What does array clone() compile to, and why doesn't it throw CloneNotSupportedException?",
              answer:
                "`invokevirtual \"[I\".clone()` followed by `checkcast \"[I\"`. Array classes implement `Cloneable` and override `clone()` as public without a `throws` clause, and the JLS gives it the array's own return type, so no cast or `try` is needed in source. HotSpot implements it as an intrinsic that allocates the copy and copies the body in one step. It's shallow, like every other array copy.",
            },
            {
              question: "When would you use parallelSort, and when not?",
              answer:
                "For large arrays in batch or offline work: on 8 cores it sorted 20 million `int`s in 458 ms against 1,787 ms. Below 4,096 elements for primitives (8,192 for objects) it just runs the sequential sort. I wouldn't use it inside request handling on a busy server: it uses the shared `ForkJoinPool.commonPool()`, so it competes with parallel streams and other tasks, and the speed-up assumes idle cores.",
            },
            {
              question: "How would you implement equals and hashCode for a class with an array field?",
              answer:
                "Use `Arrays.equals(this.values, other.values)` and `Arrays.hashCode(values)` (the `deep` versions for nested arrays), and make a defensive copy of the array in the constructor and getter so the contents can't change after the object is used as a key. Records don't do this automatically: a record's generated `equals` compares array components by reference, so `record Point(int[] coords)` needs overridden `equals` and `hashCode`, or better, a `List<Integer>` component.",
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
              question: "Users report that just previewing seats makes them unavailable for others. The preview method clones the seat map before marking seats as held. What's wrong?",
              answer:
                "The seat map is a 2D array, and `clone()` is shallow: it copies the outer array of row references, so the preview writes into the real rows. That's the `SeatMapPreview` bug: one preview of two seats left 13 of 15 free.\n\nI'd fix it with a deep copy (clone every row), add a test asserting the original is unchanged after a preview, and check the getters too: in the same code the getter returned the internal array, so any caller could modify it. Longer term, I'd expose an immutable view or query methods instead of the array.",
            },
            {
              question: "A service fails in production with UnsupportedOperationException from AbstractList.add, but the method returns a List. How do you track it down?",
              answer:
                "That exception from `add` on a plain `List` almost always means the list is fixed-size or unmodifiable: `Arrays.asList`, `List.of`, `Collections.unmodifiableList`, or `Stream.toList()`. The stack trace shows where `add` was called; I'd then find where that list was created, often a method returning `Arrays.asList(array)` or `List.of(...)`.\n\nThe fix depends on intent: if callers are meant to modify it, return `new ArrayList<>(...)`; if not, keep it unmodifiable and fix the caller, and document the contract. `getClass().getName()` on the list during debugging shows `java.util.Arrays$ArrayList` or `java.util.ImmutableCollections$ListN` right away.",
            },
            {
              question: "A leaderboard sort started throwing \"Comparison method violates its general contract!\" after the user base grew. It had worked for months. Why now, and how do you fix it?",
              answer:
                "The comparator has always been inconsistent, but TimSort only detects the contradiction in certain merge patterns, which become likely with large inputs. Small arrays (under 32 elements) don't merge at all. Typical causes: never returning 0, subtracting values that can overflow, or comparing on a score that changes while the sort runs (another thread updating it).\n\nI'd rewrite it with `Comparator.comparingInt(Player::score).reversed().thenComparing(Player::id)`, which is consistent and gives ties a stable tiebreak, and sort a snapshot of the scores rather than live, mutable objects. `-Djava.util.Arrays.useLegacyMergeSort=true` hides the exception, but the order would still be wrong.",
            },
            {
              question: "A deduplication job keeps int[] coordinate pairs in a HashSet to skip points it has seen, but the set keeps growing and duplicates aren't skipped. What's happening?",
              answer:
                "Arrays use identity `equals` and `hashCode`, so every new `int[] {x, y}`, even with the same values, is a different key. `contains` always returns `false`, every point is added, and the set grows without bound, effectively a memory leak.\n\nThe fix is a key with value equality: `record Point(int x, int y)` is the cleanest. If it has to be fast and compact, encode the pair into one `long` (`((long) x << 32) | (y & 0xffffffffL)`) and use a primitive-friendly set.",
            },
            {
              question: "A search for a driver ID in a large sorted array sometimes says the ID doesn't exist even though it does. What would you check?",
              answer:
                "First, that the array really is sorted at the moment of the search, and in the same order the search assumes. `binarySearch` on unsorted or differently sorted data doesn't throw; it just gives a wrong answer, as `Searching` showed with 60. Common causes: an element was appended or changed after sorting, the array was sorted with a comparator but searched with natural order (or the reverse), or another thread modified it.\n\nSecond, that the result is checked with `< 0` rather than `== -1`: any negative value means not found, and a caller treating -3 as an index would fail differently. If the data changes often, a `TreeSet` or `HashSet` is a better structure than re-sorting an array.",
            },
            {
              question: "You need to return a list of 10 million IDs from a method that currently builds a long[]. A teammate suggests returning Arrays.asList on a Long[] instead. What do you say?",
              answer:
                "Converting to `Long[]` would allocate 10 million `Long` objects: about 240 MB of objects plus 40 MB of references, against 80 MB for the `long[]`, and the GC would have to trace all of them. `Arrays.asList` itself is cheap, but the boxing isn't.\n\nI'd keep the `long[]`, or expose it without boxing: a `LongStream` (`Arrays.stream(ids)`), an unmodifiable wrapper class with `get(int)` and `size()`, or a defensive copy of the `long[]` if callers need an array. `List<Long>` is only worth it when the size is small.",
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
            "Create `int[][] m = {{1, 2}, {3, 4}}`, copy it with `m.clone()`, set `copy[0][0] = 99`, and print both with `deepToString`. Then write `deepCopy(int[][])` and repeat.",
            "Print `Arrays.equals(new int[][] {{1}}, new int[][] {{1}})` and `Arrays.deepEquals` of the same two arrays.",
            "Sort `String[] {\"banana\", \"Apple\", \"cherry\", \"apple\"}` with natural order, then with `String.CASE_INSENSITIVE_ORDER`, and explain the first result.",
            "Run `Arrays.binarySearch(new int[] {10, 20, 30, 40}, 25)` and compute the insertion point from the result.",
            "Run `List<String> l = Arrays.asList(\"a\", \"b\"); l.set(0, \"z\"); l.add(\"c\");` and note which line fails.",
            "Shift `int[] a = {1, 2, 3, 4, 5}` left by one with a single `System.arraycopy` call and set the last element to 0.",
            "Write a comparator `(x, y) -> x.length() - y.length()` and one with `Comparator.comparingInt(String::length)`. Explain why the second is safer.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 shows `m` changed after the shallow copy and unchanged after the deep copy. Step 2 prints `false` then `true`. Step 3 gives `[Apple, apple, banana, cherry]` for natural order, because upper-case letters sort before all lower-case ones; case-insensitive order gives the same here, with `Apple` and `apple` kept in input order by the stable sort. Step 4 returns -3, so the insertion point is 2. Step 5 fails on `add` with `UnsupportedOperationException`; `set` worked. Step 6 is `System.arraycopy(a, 1, a, 0, 4); a[4] = 0;` giving `[2, 3, 4, 5, 0]`. Step 7: subtraction is fine for string lengths, but the same pattern overflows for large or negative `int`s, and `comparingInt` can't.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `COPY       a.clone()                  same length
           Arrays.copyOf(a, n)        pad with defaults / truncate
           Arrays.copyOfRange(a,f,t)  [f, t)
           System.arraycopy(s,sp,d,dp,n)  into existing, overlap-safe
           ALL SHALLOW: object refs and 2D rows are shared
           deep copy = clone each row / copy each mutable object

PRINT      Arrays.toString / deepToString     (println -> [I@...)
COMPARE    Arrays.equals / deepEquals, mismatch, compare
HASH       Arrays.hashCode / deepHashCode     (a.hashCode = identity)

SORT       primitives: DualPivotQuicksort, not stable
           objects:    TimSort, STABLE, needs a consistent comparator
           broken comparator -> "violates its general contract!"
           parallelSort: ForkJoin, big arrays only (3.9x on 8 cores)

SEARCH     binarySearch: SORTED input only
           found -> index;  missing -> -(insertionPoint) - 1

FILL       fill(a, v) one value  |  setAll(a, i -> ...) per index
           fill(grid, new int[3]) -> ONE row shared by all slots

LISTS      Arrays.asList: fixed-size VIEW, set writes through,
                          add/remove throw, int[] -> List<int[]>
           List.of: unmodifiable COPY, no nulls
           list.toArray(new String[0])  -> String[]`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`java.util.Arrays` and `System.arraycopy` turn plain arrays into something usable: copying, printing, comparing, hashing, sorting, searching and converting, each with a method that's faster and safer than the loop I'd write.",
            "The two ideas that prevent most bugs are \"every built-in copy is shallow\" and \"arrays compare and hash by identity\". The seat-map preview, the shared rows from `fill`, and the `HashSet<int[]>` that never finds anything all come from forgetting one of them.",
            "With this lesson the Arrays phase is complete. Next comes Generics: type parameters, bounded types, wildcards, and the type erasure that made `new T[10]` impossible.",
          ],
        },
      ],
    },
  ],
};
