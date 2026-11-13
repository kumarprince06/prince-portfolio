import type { Lesson } from "../types";

export const arrays: Lesson = {
  slug: "arrays",
  date: "2026-11-13",
  title: "Arrays",
  description:
    "How Java arrays really work on JDK 21: declaring, creating and initialising them, default values, why an array is an object with a class like [I, the 16-byte header and per-element sizes measured with Unsafe, the newarray and iaload bytecodes, bounds checks and the size limit, int[] against Integer[] (5x the memory), for-each and what it compiles to, multi-dimensional and jagged arrays as arrays of arrays, row-by-row versus column-by-column measured at 32x, covariance and ArrayStoreException, why generic arrays can't be created, passing arrays and varargs, and a revenue heatmap fixed in a ride-hailing backend.",
  tags: ["Core Java", "Arrays", "Memory", "Performance"],
  sections: [
    {
      title: "What an Array Is",
      blocks: [
        {
          type: "paragraph",
          text: "The String phase ended with text stored in a `byte[]` inside every `String` and every `StringBuilder`. That `byte[]` is the simplest container Java has, and the one every other container is built on: `ArrayList` keeps its elements in an `Object[]`, `HashMap` keeps its buckets in an array, and `String` keeps its characters in one.",
        },
        {
          type: "paragraph",
          text: "An **array** is a fixed-size, ordered sequence of values of one type, stored next to each other in memory and accessed by an `int` index starting at 0. `int[] fares = new int[3];` creates room for exactly three `int`s, `fares[0]` to `fares[2]`, and that size never changes. Reading or writing any element by index takes the same time, however long the array is, because the JVM can compute the element's address directly: start of the data plus index times element size.",
        },
        {
          type: "paragraph",
          text: "Arrays look like a primitive feature, with their own syntax (`[]`, `{1, 2, 3}`, `.length` without parentheses), but every array is an **object** on the heap with a header, a class and a length. This lesson covers both sides: everything I need to use arrays correctly in everyday code and interviews, and what the JVM does underneath, measured on JDK 21. The next lesson, The Arrays Class and Copying Arrays, covers `java.util.Arrays`: copying, comparing, sorting and searching.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "C arrays are a pointer to the first element and nothing else. There's no stored length, so a function receiving an array also needs its size as a separate argument, and nothing stops `a[10]` on a 10-element array from reading or overwriting whatever memory comes next. Buffer overflows from exactly that have been among the most common security bugs for decades.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) kept C's syntax and C's speed, but made arrays objects: each one knows its own `length`, every access is bounds-checked, and an out-of-range index throws `ArrayIndexOutOfBoundsException` instead of corrupting memory. Arrays of objects were made **covariant** (`String[]` is a subtype of `Object[]`), which made generic-looking utility methods possible years before generics existed, at the cost of a run-time type check on every store.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "Arrays as objects with `length`, bounds checks, covariance, `System.arraycopy`, `clone()`", "Everything in this lesson builds on these"],
            ["Java 1.1 (1997)", "Anonymous arrays: `new int[] {1, 2, 3}`", "Array literals usable outside a declaration"],
            ["Java 1.2 (1998)", "`java.util.Arrays`: `sort`, `binarySearch`, `fill`, `equals`, `asList`", "The utility class covered in the next lesson"],
            ["Java 5 (2004)", "Enhanced `for`, varargs, generics; `Arrays.toString`, `deepToString`, `hashCode`, `deepEquals`", "No generic array creation; `int...` is an `int[]`"],
            ["Java 6 (2006)", "`Arrays.copyOf`, `copyOfRange`", "Copying with resizing in one call"],
            ["Java 7 (2011)", "TimSort for object arrays; dual-pivot quicksort for primitives", "The sorting algorithms still used on JDK 21"],
            ["Java 8 (2014)", "`Arrays.stream`, `setAll`, `parallelSort`, `parallelPrefix`", "Arrays meet streams and lambdas"],
            ["Java 9 (2017)", "`Arrays.mismatch`, `compare`, range overloads of `equals`", "Content comparison without loops"],
            ["Java 10 (2018)", "`var`", "`var fares = new int[3];` infers `int[]`"],
            ["Java 11 (2018)", "`Collection.toArray(IntFunction)`", "`list.toArray(String[]::new)`"],
            ["Java 21 (2023)", "Pattern matching for `switch`", "`case int[] a when a.length == 0 ->` works on arrays"],
          ],
        },
        {
          type: "paragraph",
          text: "Project Valhalla (value classes, not part of Java 21) aims to let arrays of small value objects be stored flat, the way `int[]` is, instead of as arrays of references. Until then, the `int[]` versus `Integer[]` difference measured below is something I have to manage myself.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a row of numbered lockers at a railway station.",
        },
        {
          type: "list",
          items: [
            "An **array is a row of lockers** installed in one go. The number of lockers is fixed when the row is built; to get more, I have to build a new, longer row and move everything over. That's why arrays can't grow.",
            "The **index is the locker number**, starting at 0. Because the lockers are the same width and in a straight line, I can walk straight to locker 57 without opening 0 to 56. That's constant-time access.",
            "**All lockers are the same size.** An `int[]` row only takes `int`s, the way a row of small lockers only takes small bags.",
            "The **sign at the end of the row says how many lockers there are**: that's `length`, stored in the array's header. Asking for locker 10 in a 10-locker row gets a security guard (`ArrayIndexOutOfBoundsException`), not someone else's luggage.",
            "An **`int[]` keeps the bag in the locker**. An **`Integer[]` or `String[]` keeps a claim ticket** in each locker that says where the bag is stored elsewhere in the building. Following the ticket costs a walk, and every bag takes extra space of its own.",
            "A **2D array is a corridor of rows**: the corridor holds a sign for each row saying where that row is. The rows don't have to be the same length or next to each other.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a new row of real lockers would start empty, but a new Java array always starts filled with default values (0, `false`, `null`). And a real station can't put the same row in two places in a corridor, but `grid[0] = grid[1] = row;` does exactly that, which is a classic bug later in this lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Declaring and creating",
        },
        {
          type: "table",
          headers: ["Form", "Example", "Notes"],
          rows: [
            ["Declare only", "`int[] fares;`", "No array yet; a local can't be used until assigned, a field is `null`"],
            ["Create with a size", "`fares = new int[3];`", "All elements get the default value"],
            ["Initializer", "`int[] fares = {60, 70, 80};`", "Size comes from the values; only allowed in a declaration"],
            ["Anonymous array", "`fares = new int[] {60, 70, 80};`", "Usable anywhere, e.g. as an argument"],
            ["C-style brackets", "`int fares[] = new int[3];`", "Legal, discouraged; the type is `int[]`, so keep `[]` with the type"],
            ["`var` (Java 10)", "`var fares = new int[3];`", "`var fares = {1, 2};` doesn't compile: the initializer needs a declared type"],
            ["Two dimensions", "`int[][] grid = new int[3][4];`", "An array of 3 row arrays of 4"],
            ["Jagged", "`int[][] tri = new int[3][];`", "Rows are `null` until I create them"],
          ],
        },
        {
          type: "heading",
          text: "Default values",
        },
        {
          type: "code",
          language: "java",
          title: "Defaults.java",
          code: `import java.util.Arrays;

public class Defaults {
    public static void main(String[] args) {
        System.out.println("int[]     " + Arrays.toString(new int[3]));
        System.out.println("double[]  " + Arrays.toString(new double[3]));
        System.out.println("boolean[] " + Arrays.toString(new boolean[3]));
        System.out.println("char[]    " + Arrays.toString(new char[3]).replace("\\u0000", "\\\\u0000"));
        System.out.println("String[]  " + Arrays.toString(new String[3]));

        int[] fares = {60, 70, 80};                    // initializer: size from the values
        int[] more = new int[] {1, 2, 3, 4};           // same, usable anywhere
        System.out.println(fares.length + " " + more.length + " " + fares[0] + " " + fares[fares.length - 1]);
        int[] empty = new int[0];
        System.out.println("empty length " + empty.length);
    }
}`,
        },
        {
          type: "output",
          text: `int[]     [0, 0, 0]
double[]  [0.0, 0.0, 0.0]
boolean[] [false, false, false]
char[]    [\\u0000, \\u0000, \\u0000]
String[]  [null, null, null]
3 4 60 80
empty length 0`,
        },
        {
          type: "list",
          items: [
            "Every element of a new array is set to its type's default: `0` for numbers, `'\\\\u0000'` for `char`, `false` for `boolean`, `null` for references. This is true for arrays created anywhere, including inside a method, unlike local variables of primitive type, which must be assigned before use.",
            "`length` is read like a field, not called like a method: `fares.length`, never `fares.length()` (that's `String`). The last element is always `fares[fares.length - 1]`.",
            "An empty array (`new int[0]`) is a real object with length 0. Returning one is better than returning `null`, because callers can loop over it without a null check.",
          ],
        },
        {
          type: "heading",
          text: "Array types and their class names",
        },
        {
          type: "table",
          headers: ["Type", "`getClass().getName()`", "Element size (JDK 21 defaults)"],
          rows: [
            ["`byte[]`, `boolean[]`", "`[B`, `[Z`", "1 byte"],
            ["`char[]`, `short[]`", "`[C`, `[S`", "2 bytes"],
            ["`int[]`, `float[]`", "`[I`, `[F`", "4 bytes"],
            ["`long[]`, `double[]`", "`[J`, `[D`", "8 bytes"],
            ["`String[]`", "`[Ljava.lang.String;`", "4 bytes (a compressed reference)"],
            ["`int[][]`", "`[[I`", "4 bytes per row reference"],
          ],
        },
        {
          type: "paragraph",
          text: "Those names come from the JVM's type descriptors: `[` for \"array of\", one letter per primitive, `L...;` for a class. They're what appears in `[I@2a139a55` when an array is printed by mistake, and in error messages like `class [Ljava.lang.Object; cannot be cast to class [Ljava.lang.String;`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "An array is an object",
        },
        {
          type: "code",
          language: "java",
          title: "ArraysAreObjects.java",
          code: `import java.util.Arrays;

public class ArraysAreObjects {
    public static void main(String[] args) {
        Object[] samples = {new int[2], new long[2], new boolean[2], new String[2], new int[2][3], new Object[0]};
        for (Object a : samples) {
            Class<?> c = a.getClass();
            System.out.printf("%-22s getName %-22s super %-16s component %s%n",
                    c.getSimpleName(), c.getName(), c.getSuperclass().getSimpleName(), c.getComponentType().getName());
        }
        Class<?> c = int[].class;
        System.out.println("interfaces " + Arrays.toString(c.getInterfaces()));
        System.out.println("declared fields " + c.getDeclaredFields().length + ", isArray " + c.isArray());
        int[] a = {1, 2};
        Object o = a;
        System.out.println("an int[] is an Object: " + (o instanceof Object) + ", toString " + (a.toString().startsWith("[I@")));
    }
}`,
        },
        {
          type: "output",
          text: `int[]                  getName [I                     super Object           component int
long[]                 getName [J                     super Object           component long
boolean[]              getName [Z                     super Object           component boolean
String[]               getName [Ljava.lang.String;    super Object           component java.lang.String
int[][]                getName [[I                    super Object           component [I
Object[]               getName [Ljava.lang.Object;    super Object           component java.lang.Object
interfaces [interface java.lang.Cloneable, interface java.io.Serializable]
declared fields 0, isArray true
an int[] is an Object: true, toString true`,
        },
        {
          type: "list",
          items: [
            "Every array type is a class, created by the JVM on demand the first time it's needed; there's no `.class` file for `int[]`. Its superclass is `Object`, so an array can be assigned to an `Object` variable, stored in a `List<Object>`, locked with `synchronized`, and has `hashCode`, `equals` and `toString`, all inherited from `Object` and all identity-based.",
            "Array classes implement `Cloneable` and `Serializable`, which is why `a.clone()` works and arrays can be serialized.",
            "The component type of `int[][]` is `int[]` (`[I`). A two-dimensional array is literally an array whose elements are arrays, which explains everything about jagged arrays later.",
            "`getDeclaredFields()` returns nothing: `length` isn't a Java field. It's a slot in the object header, read by its own bytecode instruction.",
          ],
        },
        {
          type: "heading",
          text: "The memory layout, measured",
        },
        {
          type: "paragraph",
          text: "I read where element data starts and how big each element is with `Unsafe` (the same technique as the Memory Allocation and Strings lessons), then measured what `new` actually allocates with the per-thread allocation counter:",
        },
        {
          type: "code",
          language: "java",
          title: "ArrayLayout.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class ArrayLayout {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;

    interface Maker { Object make(); }

    static long cost(Maker m) {
        long before = MX.getCurrentThreadAllocatedBytes();
        sink = m.make();
        return MX.getCurrentThreadAllocatedBytes() - before;
    }

    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);

        Class<?>[] types = {byte[].class, boolean[].class, char[].class, short[].class, int[].class,
                            float[].class, long[].class, double[].class, Object[].class};
        for (Class<?> t : types) {
            System.out.printf("%-10s data starts at %d, %d bytes per element%n",
                    t.getSimpleName(), u.arrayBaseOffset(t), u.arrayIndexScale(t));
        }

        Maker[] makers = {() -> new int[0], () -> new int[1], () -> new int[2], () -> new int[3],
                          () -> new int[10], () -> new byte[10], () -> new long[10], () -> new String[10]};
        String[] labels = {"new int[0]", "new int[1]", "new int[2]", "new int[3]",
                           "new int[10]", "new byte[10]", "new long[10]", "new String[10]"};
        for (int i = 0; i < 10_000; i++) for (Maker m : makers) cost(m);              // warm up
        System.out.println();
        for (int i = 0; i < makers.length; i++) {
            System.out.printf("%-15s %3d bytes%n", labels[i], cost(makers[i]));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -nowarn ArrayLayout.java          # warnings: Unsafe is internal proprietary API
java ArrayLayout`,
        },
        {
          type: "output",
          text: `byte[]     data starts at 16, 1 bytes per element
boolean[]  data starts at 16, 1 bytes per element
char[]     data starts at 16, 2 bytes per element
short[]    data starts at 16, 2 bytes per element
int[]      data starts at 16, 4 bytes per element
float[]    data starts at 16, 4 bytes per element
long[]     data starts at 16, 8 bytes per element
double[]   data starts at 16, 8 bytes per element
Object[]   data starts at 16, 4 bytes per element

new int[0]       16 bytes
new int[1]       24 bytes
new int[2]       24 bytes
new int[3]       32 bytes
new int[10]      56 bytes
new byte[10]     32 bytes
new long[10]     96 bytes
new String[10]   56 bytes`,
        },
        {
          type: "paragraph",
          text: "Running it again with compressed pointers switched off changes the last three lines of the first block:",
        },
        {
          type: "code",
          language: "bash",
          code: "java -XX:-UseCompressedOops -XX:-UseCompressedClassPointers ArrayLayout",
        },
        {
          type: "output",
          text: `long[]     data starts at 24, 8 bytes per element
double[]   data starts at 24, 8 bytes per element
Object[]   data starts at 24, 8 bytes per element`,
        },
        {
          type: "image",
          src: "/images/java/arrays-memory-layout.svg",
          alt: "An int array {60, 70, 80} laid out as an 8-byte mark word, a 4-byte class pointer, a 4-byte length of 3, three 4-byte ints at offsets 16, 20 and 24, and 4 bytes of padding up to 32. Below, an Integer array holds three references, each pointing to a separate 16-byte Integer object; a million values cost 4.0 MB as int[] and 20.0 MB as Integer[]. Next to it, int[3][4] is an outer array of three row references pointing to three separate int[4] arrays.",
          caption: "One header, one length, then the elements back to back. An Integer[] or a 2D array adds objects the array only points to.",
        },
        {
          type: "list",
          items: [
            "Every array has a **16-byte header**: an 8-byte mark word (identity hash, lock and GC bits, as for any object), a 4-byte compressed class pointer (to `[I`, `[J`...), and a 4-byte `int` length. That's one more slot than an ordinary object's header, and it's why element data starts at offset 16.",
            "Elements follow back to back, `arrayIndexScale` bytes each. The address of `a[i]` is `start + 16 + i * scale`, which is why access by index is O(1).",
            "Objects are padded to a multiple of 8 bytes. `new int[0]` is just the header (16). `int[1]` and `int[2]` both round up to 24. `int[3]` is 16 + 12 = 28, padded to 32. `byte[10]` is 26, padded to 32.",
            "`String[10]` is 56 bytes, the same as `int[10]`: with compressed oops a reference takes 4 bytes. The strings themselves aren't counted; the array only stores references to them.",
            "With compressed pointers off, data starts at 24 (8 mark, 8 class, 4 length, padded) and every reference takes 8 bytes. Compressed oops are on by default for heaps under 32 GB.",
            "`boolean[]` uses a whole byte per element, not a bit. For a large set of flags, `java.util.BitSet` packs 64 per `long`.",
          ],
        },
        {
          type: "heading",
          text: "Why the first index is 0",
        },
        {
          type: "paragraph",
          text: "The layout above is the whole answer. An index isn't a position number (\"first\", \"second\"); it's an **offset**: how many elements to skip from the start of the data. The element address is `start + 16 + i * 4` for an `int[]`, so `fares[0]` is the element 0 steps from the start, at offset 16, `fares[1]` is 4 bytes further, and so on. With indexes starting at 1, every access would need `start + 16 + (i - 1) * 4`, an extra subtraction on the most frequent operation in the language (or a data area shifted back by one element).",
        },
        {
          type: "list",
          items: [
            "**History.** BCPL and then C defined `a[i]` as `*(a + i)`: the value at pointer `a` plus `i` elements, so the first element is `*(a + 0)`. Java took its syntax from C and C++ so that programmers could move across easily, and kept 0-based indexing with it. Python, JavaScript, C# and Go did the same; Fortran, MATLAB and Lua start at 1.",
            "**Ranges come out cleaner.** With 0-based indexes, the valid indexes of an array of length `n` are the half-open range `[0, n)`: the loop is `i < n`, the number of elements in `[from, to)` is `to - from`, and two adjacent ranges `[0, k)` and `[k, n)` meet without overlap. Dijkstra's note *Why numbering should start at zero* (EWD831, 1982) makes exactly this argument. The JDK uses the same convention everywhere: `substring(begin, end)`, `copyOfRange(a, from, to)`, `Arrays.fill(a, from, to, v)`.",
            "**Index arithmetic works directly.** Row-major indexing of a flat grid is `row * width + col`, a circular buffer is `i % n`, and `charAt(s.length() - 1)` is the last character. With 1-based indexes each of these needs a `+ 1` or `- 1` somewhere.",
            "**The cost of the choice** is the off-by-one shown in Common Mistakes: the last element is at `length - 1`, not `length`.",
          ],
        },
        {
          type: "heading",
          text: "The bytecode for arrays",
        },
        {
          type: "code",
          language: "java",
          title: "Bytecode.java",
          code: `public class Bytecode {
    static int demo() {
        int[] a = new int[3];
        String[] s = new String[2];
        int[][] g = new int[2][4];
        a[1] = 7;
        s[0] = "x";
        return a[1] + a.length + g[1].length;
    }

    static int forEach(int[] values) {
        int sum = 0;
        for (int v : values) sum += v;
        return sum;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Bytecode.java && javap -c Bytecode",
        },
        {
          type: "output",
          text: `  static int demo();
    Code:
       0: iconst_3
       1: newarray       int
       3: astore_0
       4: iconst_2
       5: anewarray     #7                  // class java/lang/String
       8: astore_1
       9: iconst_2
      10: iconst_4
      11: multianewarray #9,  2             // class "[[I"
      15: astore_2
      16: aload_0
      17: iconst_1
      18: bipush        7
      20: iastore
      21: aload_1
      22: iconst_0
      23: ldc           #11                 // String x
      25: aastore
      26: aload_0
      27: iconst_1
      28: iaload
      29: aload_0
      30: arraylength
      31: iadd
      32: aload_2
      33: iconst_1
      34: aaload
      35: arraylength
      36: iadd
      37: ireturn`,
        },
        {
          type: "table",
          headers: ["Instruction", "What it does", "Can throw"],
          rows: [
            ["`newarray int`", "Create a primitive array of the size on the stack, zeroed", "`NegativeArraySizeException`, `OutOfMemoryError`"],
            ["`anewarray String`", "Create an array of references, all `null`", "Same"],
            ["`multianewarray [[I, 2`", "Create the outer array and every row in one instruction", "Same"],
            ["`iastore` / `iaload`", "Write / read an `int` element (also `bastore`, `castore`, `lastore`, `dastore`...)", "`NullPointerException`, `ArrayIndexOutOfBoundsException`"],
            ["`aastore` / `aaload`", "Write / read a reference element", "Also `ArrayStoreException` on `aastore`"],
            ["`arraylength`", "Read the length from the header", "`NullPointerException`"],
          ],
        },
        {
          type: "paragraph",
          text: "Arrays have their own instructions instead of method calls, which is part of why they're fast. Each load and store includes a null check and a bounds check, and `aastore` also includes the covariance type check covered later. The JIT removes those checks when it can prove they always pass: in `for (int i = 0; i < a.length; i++) sum += a[i];`, `i` is always between 0 and `a.length - 1`, so the compiled loop has no per-element bounds check (**range check elimination**). That's why plain array loops in Java run close to C speed. The `forEach` method's bytecode is shown in Iterating Arrays below.",
        },
        {
          type: "heading",
          text: "Bounds checks and size limits",
        },
        {
          type: "code",
          language: "java",
          title: "Limits.java",
          code: `public class Limits {
    static void attempt(String label, Runnable r) {
        try {
            r.run();
            System.out.println(label + " -> ok");
        } catch (Throwable t) {
            System.out.println(label + " -> " + t.getClass().getSimpleName() + ": " + t.getMessage());
        }
    }

    public static void main(String[] args) {
        int[] fares = {60, 70, 80};
        attempt("fares[3]", () -> System.out.print(fares[3]));
        attempt("fares[-1]", () -> System.out.print(fares[-1]));
        attempt("new int[-1]", () -> { int[] a = new int[-1]; });
        attempt("new int[Integer.MAX_VALUE]", () -> { int[] a = new int[Integer.MAX_VALUE]; });
        attempt("new int[Integer.MAX_VALUE - 8]", () -> { int[] a = new int[Integer.MAX_VALUE - 8]; });
        attempt("new byte[100_000_000]", () -> { byte[] a = new byte[100_000_000]; });
        long big = 3_000_000_000L;
        attempt("new int[(int) 3_000_000_000L]", () -> { int[] a = new int[(int) big]; });
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx1g Limits",
        },
        {
          type: "output",
          text: `fares[3] -> ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3
fares[-1] -> ArrayIndexOutOfBoundsException: Index -1 out of bounds for length 3
new int[-1] -> NegativeArraySizeException: -1
new int[Integer.MAX_VALUE] -> OutOfMemoryError: Requested array size exceeds VM limit
new int[Integer.MAX_VALUE - 8] -> OutOfMemoryError: Java heap space
new byte[100_000_000] -> ok
new int[(int) 3_000_000_000L] -> NegativeArraySizeException: -1294967296`,
        },
        {
          type: "list",
          items: [
            "Valid indexes are `0` to `length - 1`. Both `length` and negative indexes throw, with a message that names the index and the length.",
            "Array sizes and indexes are `int`, so no Java array can have more than about 2.1 billion elements. HotSpot refuses sizes within a few elements of `Integer.MAX_VALUE` with a special message (\"exceeds VM limit\"), because the header has to fit too; that's why `ArrayList` caps its growth at `Integer.MAX_VALUE - 8`.",
            "`Integer.MAX_VALUE - 8` ints is an 8 GB array: a legal size, but bigger than my 1 GB heap, so it's the normal `Java heap space` error.",
            "Casting a `long` size to `int` silently wraps: 3,000,000,000 became -1,294,967,296. The error names the wrong number, which can be confusing. `Math.toIntExact(size)` throws `ArithmeticException` at the cast instead.",
          ],
        },
      ],
    },
    {
      title: "int[] vs Integer[]",
      blocks: [
        {
          type: "paragraph",
          text: "An `int[]` stores the numbers themselves. An `Integer[]` stores references to `Integer` objects, each a separate 16-byte object (12-byte header plus the 4-byte value). I filled a million-element array of each with the same values and counted the bytes allocated:",
        },
        {
          type: "code",
          language: "java",
          title: "BoxedCost.java",
          code: `import java.lang.management.ManagementFactory;

public class BoxedCost {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;

    static long allocated(Runnable r) {
        long before = MX.getCurrentThreadAllocatedBytes();
        r.run();
        return MX.getCurrentThreadAllocatedBytes() - before;
    }

    public static void main(String[] args) {
        int n = 1_000_000;
        long prim = allocated(() -> {
            int[] a = new int[n];
            for (int i = 0; i < n; i++) a[i] = i * 3;
            sink = a;
        });
        long boxed = allocated(() -> {
            Integer[] a = new Integer[n];
            for (int i = 0; i < n; i++) a[i] = i * 3;          // autoboxing: Integer.valueOf
            sink = a;
        });
        System.out.printf("int[1,000,000]     %,12d bytes%n", prim);
        System.out.printf("Integer[1,000,000] %,12d bytes  (%.1fx)%n", boxed, (double) boxed / prim);
    }
}`,
        },
        {
          type: "output",
          text: `int[1,000,000]        4,000,176 bytes
Integer[1,000,000]   19,999,496 bytes  (5.0x)`,
        },
        {
          type: "list",
          items: [
            "The `int[]` is the 16-byte header plus 4 bytes per element: 4.0 MB. The extra 160 bytes are the lambda.",
            "The `Integer[]` is the same 4 MB of references, plus about a million 16-byte `Integer` objects: 20 MB, **five times** as much, for exactly the same numbers.",
            "Not quite a million: `a[i] = i * 3` calls `Integer.valueOf`, which returns cached objects for -128 to 127, so the first 43 values (0 to 126) were shared. That cache is covered in the Wrapper Classes phase.",
            "Memory isn't the only cost. Reading `a[i]` from an `Integer[]` means loading the reference, then following it to a different place in the heap; summing it means unboxing each one. And an `Integer[]` element can be `null`, so `int x = a[i];` can throw `NullPointerException`.",
          ],
        },
        {
          type: "paragraph",
          text: "So for numbers I use primitive arrays (`int[]`, `long[]`, `double[]`) and primitive streams (`IntStream`). An `Integer[]` is only needed where an API requires objects, for example `Arrays.sort(array, Comparator)`, which has no primitive overload.",
        },
      ],
    },
    {
      title: "Iterating Arrays",
      blocks: [
        {
          type: "table",
          headers: ["Loop", "Use it when", "Notes"],
          rows: [
            ["`for (int i = 0; i < a.length; i++)`", "I need the index, write elements, or walk two arrays together", "The only loop that can assign `a[i] = ...`"],
            ["`for (int v : a)`", "I only read each element, front to back", "No index, no off-by-one, can't write elements"],
            ["`for (int i = a.length - 1; i >= 0; i--)`", "Backwards, or removing while iterating", "Start at `length - 1`, not `length`"],
            ["`Arrays.stream(a)...`", "Filtering, mapping, summing in one expression", "`IntStream` for `int[]`, no boxing"],
            ["`while` with two indexes", "Two-pointer algorithms", "Reverse, partition, merge"],
          ],
        },
        {
          type: "heading",
          text: "for-each gives a copy of each element",
        },
        {
          type: "code",
          language: "java",
          title: "ForEachCopy.java",
          code: `import java.util.Arrays;

public class ForEachCopy {
    public static void main(String[] args) {
        int[] fares = {60, 70, 80};
        for (int f : fares) f = f * 2;                  // f is a copy of each element
        System.out.println(Arrays.toString(fares));
        for (int i = 0; i < fares.length; i++) fares[i] = fares[i] * 2;
        System.out.println(Arrays.toString(fares));

        StringBuilder[] notes = {new StringBuilder("a"), new StringBuilder("b")};
        for (StringBuilder sb : notes) sb.append("!");  // the copy is a reference: the objects change
        System.out.println(Arrays.toString(notes));
    }
}`,
        },
        {
          type: "output",
          text: `[60, 70, 80]
[120, 140, 160]
[a!, b!]`,
        },
        {
          type: "paragraph",
          text: "Assigning to the loop variable changes a local copy, not the array. With an array of objects the copy is a reference, so calling a method on it changes the shared object, but assigning a new object to it still doesn't touch the array.",
        },
        {
          type: "heading",
          text: "What for-each compiles to",
        },
        {
          type: "paragraph",
          text: "The `forEach` method from `Bytecode.java` above, through `javap -c`:",
        },
        {
          type: "output",
          text: `  static int forEach(int[]);
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
          type: "list",
          items: [
            "Offsets 2 to 3: `javac` copies the array reference into a hidden local (slot 2).",
            "Offsets 4 to 6: it reads `arraylength` **once** into another hidden local (slot 3).",
            "Offsets 7 to 8 and 27: a hidden index (slot 4) starts at 0 and is incremented with `iinc`.",
            "Offsets 16 to 20: `iaload` reads `a[i]` and stores it in `v` (slot 5). That store is why assigning to `v` never reaches the array.",
          ],
        },
        {
          type: "paragraph",
          text: "So for an array, the enhanced `for` is exactly an index loop: no `Iterator` and no allocation, unlike for-each over a `List`. Reassigning the array variable inside the loop doesn't affect the iteration, because the hidden copy is what's used.",
        },
      ],
    },
    {
      title: "Multi-Dimensional and Jagged Arrays",
      blocks: [
        {
          type: "paragraph",
          text: "Java has no true 2D arrays. `int[][]` is an array of `int[]`, and each row is an independent array object. That one fact explains jagged arrays, shared rows, the memory cost and the iteration-order performance below.",
        },
        {
          type: "code",
          language: "java",
          title: "Grid.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.Arrays;

public class Grid {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;

    static long allocated(Runnable r) {
        long before = MX.getCurrentThreadAllocatedBytes();
        r.run();
        return MX.getCurrentThreadAllocatedBytes() - before;
    }

    public static void main(String[] args) {
        int[][] seats = new int[3][4];                       // 3 rows of 4
        seats[1][2] = 1;
        System.out.println(Arrays.deepToString(seats) + "  rows " + seats.length + ", cols " + seats[0].length);

        int[][] jagged = new int[3][];                       // rows not created yet
        System.out.println("jagged before " + Arrays.toString(jagged));
        for (int r = 0; r < jagged.length; r++) jagged[r] = new int[r + 1];
        System.out.println("jagged after  " + Arrays.deepToString(jagged));

        int[][] literal = {{1, 2, 3}, {4, 5}, {6}};
        System.out.println("literal row lengths " + literal[0].length + " " + literal[1].length + " " + literal[2].length);

        int[][] shared = new int[2][];
        int[] row = {7, 7};
        shared[0] = row;
        shared[1] = row;                                     // two rows, one array
        shared[0][0] = 9;
        System.out.println("shared rows   " + Arrays.deepToString(shared));

        for (int i = 0; i < 3; i++) { allocated(() -> sink = new int[1000][1000]); allocated(() -> sink = new int[1_000_000]); }
        System.out.printf("new int[1000][1000]  %,d bytes%n", allocated(() -> sink = new int[1000][1000]));
        System.out.printf("new int[1_000_000]   %,d bytes%n", allocated(() -> sink = new int[1_000_000]));
        System.out.printf("new int[1_000_000][1] %,d bytes%n", allocated(() -> sink = new int[1_000_000][1]));
    }
}`,
        },
        {
          type: "output",
          text: `[[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0]]  rows 3, cols 4
jagged before [null, null, null]
jagged after  [[0], [0, 0], [0, 0, 0]]
literal row lengths 3 2 1
shared rows   [[9, 7], [9, 7]]
new int[1000][1000]  4,020,016 bytes
new int[1_000_000]   4,000,016 bytes
new int[1_000_000][1] 28,000,016 bytes`,
        },
        {
          type: "list",
          items: [
            "`seats.length` is the number of rows; `seats[0].length` is the length of row 0. In a jagged array each row can have its own length, so loops should use `seats[r].length`, not a fixed column count.",
            "`new int[3][]` creates only the outer array; its rows are `null` until assigned. Using `jagged[0][0]` before that throws `NullPointerException`.",
            "Rows are references, so two slots can point at the same row. Writing through one changed both. This is the bug behind `Arrays.fill(grid, new int[3])`, covered in the next lesson.",
            "`int[1000][1000]` is 1,001 objects: a 4,016-byte outer array of references plus 1,000 rows of 4,016 bytes, for 4,020,016 bytes. A flat `int[1_000_000]` is one object and 20 KB smaller.",
            "The shape matters a lot: `int[1_000_000][1]` is a million tiny arrays, each with its own 16-byte header and padding, and costs **7 times** as much as the flat array for the same million `int`s. Put the long dimension last.",
          ],
        },
        {
          type: "heading",
          text: "Row by row or column by column",
        },
        {
          type: "paragraph",
          text: "Each row's elements sit next to each other in memory, but different rows can be anywhere in the heap. The CPU loads memory in 64-byte cache lines, so reading `g[r][0]`, `g[r][1]`, `g[r][2]` uses each line fully, while reading `g[0][c]`, `g[1][c]`, `g[2][c]` touches a different row array, and usually a different cache line, every step:",
        },
        {
          type: "code",
          language: "java",
          title: "RowVsColumn.java",
          code: `public class RowVsColumn {
    static long rowMajor(int[][] g) {
        long sum = 0;
        for (int r = 0; r < g.length; r++)
            for (int c = 0; c < g[r].length; c++) sum += g[r][c];
        return sum;
    }

    static long columnMajor(int[][] g) {
        long sum = 0;
        for (int c = 0; c < g[0].length; c++)
            for (int r = 0; r < g.length; r++) sum += g[r][c];
        return sum;
    }

    static long best(java.util.function.LongSupplier s) {
        long best = Long.MAX_VALUE;
        for (int i = 0; i < 7; i++) {
            long t = System.nanoTime();
            if (s.getAsLong() == 42) System.out.print("");
            best = Math.min(best, System.nanoTime() - t);
        }
        return best / 1_000_000;
    }

    public static void main(String[] args) {
        int n = 4_000;
        int[][] g = new int[n][n];
        for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) g[r][c] = r ^ c;
        System.out.println("same sum: " + (rowMajor(g) == columnMajor(g)));
        System.out.println("row by row       : " + best(() -> rowMajor(g)) + " ms");
        System.out.println("column by column : " + best(() -> columnMajor(g)) + " ms");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx1g RowVsColumn",
        },
        {
          type: "output",
          text: `same sum: true
row by row       : 4 ms
column by column : 128 ms`,
        },
        {
          type: "paragraph",
          text: "The same 16 million additions, the same result, and **32 times** slower column by column (130 ms on a second run; best of seven each). The row loop also lets the JIT eliminate bounds checks and use SIMD instructions on one row at a time. The rule: the innermost loop should run along the last index. If the natural access is by column, store the data transposed.",
        },
      ],
    },
    {
      title: "Arrays and Types: Covariance and Generics",
      blocks: [
        {
          type: "heading",
          text: "Covariance and ArrayStoreException",
        },
        {
          type: "code",
          language: "java",
          title: "Covariance.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Covariance {
    public static void main(String[] args) {
        String[] names = {"Asha", "Ravi"};
        Object[] objects = names;                 // allowed: String[] is a subtype of Object[]
        System.out.println(objects.getClass().getSimpleName() + " " + (objects == names));
        try {
            objects[0] = 42;                      // compiles: the static type is Object[]
        } catch (ArrayStoreException e) {
            System.out.println("ArrayStoreException: " + e.getMessage());
        }

        List<String> list = new ArrayList<>();
        // List<Object> objs = list;             // does not compile: generics are invariant
        System.out.println(names[0]);
    }
}`,
        },
        {
          type: "output",
          text: `String[] true
ArrayStoreException: java.lang.Integer
Asha`,
        },
        {
          type: "paragraph",
          text: "Arrays are **covariant**: since `String` is a subtype of `Object`, `String[]` is a subtype of `Object[]`, so the assignment compiles, and `objects` is the very same `String[]`. Putting an `Integer` into it would break every reader expecting `String`s, so every `aastore` checks the element's class against the array's real component type and throws `ArrayStoreException`. The array is unchanged: `names[0]` is still `Asha`. Generics made the opposite choice: `List<String>` is not a `List<Object>`, and the mistake is caught at compile time instead.",
        },
        {
          type: "heading",
          text: "Why generic arrays can't be created",
        },
        {
          type: "code",
          language: "java",
          title: "GenericArray.java",
          code: `import java.util.List;

public class GenericArray<T> {
    T[] items = new T[10];
    List<String>[] lists = new List<String>[3];
}`,
        },
        {
          type: "output",
          text: `GenericArray.java:4: error: generic array creation
    T[] items = new T[10];
                ^
GenericArray.java:5: error: generic array creation
    List<String>[] lists = new List<String>[3];
                           ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "An array needs to know its exact component type at run time to do the `ArrayStoreException` check. Generic types are erased at compile time: inside `GenericArray<T>` there's no way to know what `T` is, and a `List<String>[]` and a `List<Integer>[]` would both just be a `List[]`. So the compiler refuses to create them. The usual workaround is the one `ArrayList` uses internally, an `Object[]` cast to `T[]`, and it has a trap:",
        },
        {
          type: "code",
          language: "java",
          title: "GenericBox.java",
          code: `public class GenericBox<T> {
    private final T[] items;

    @SuppressWarnings("unchecked")
    GenericBox(int size) {
        items = (T[]) new Object[size];          // the usual workaround; ArrayList does the same
    }

    void set(int i, T value) { items[i] = value; }
    T get(int i) { return items[i]; }
    T[] all() { return items; }                  // lets the Object[] escape

    public static void main(String[] args) {
        GenericBox<String> box = new GenericBox<>(2);
        box.set(0, "Asha");
        String first = box.get(0);               // fine: the cast is to String
        System.out.println("get(0) = " + first);
        String[] everything = box.all();         // the cast is to String[]
        System.out.println(everything.length);
    }
}`,
        },
        {
          type: "output",
          text: `get(0) = Asha
Exception in thread "main" java.lang.ClassCastException: class [Ljava.lang.Object; cannot be cast to class [Ljava.lang.String; ([Ljava.lang.Object; and [Ljava.lang.String; are in module java.base of loader 'bootstrap')
	at GenericBox.main(GenericBox.java:18)`,
        },
        {
          type: "list",
          items: [
            "`get(0)` works: the compiler inserts a cast of the element to `String`, and the element really is a `String`.",
            "`all()` fails: the compiler inserts a cast of the **array** to `String[]`, but the object is an `Object[]`. The `(T[])` cast inside the class \"succeeded\" only because `T` erases to `Object`.",
            "So the workaround is safe only while the `T[]` stays private. `ArrayList.toArray(T[] a)` asks the caller for an array of the right runtime type for exactly this reason. In my own code I use `List<T>` instead of `T[]`, and `List<List<String>>` instead of `List<String>[]`.",
          ],
        },
      ],
    },
    {
      title: "Passing Arrays to Methods and Varargs",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "PassArrays.java",
          code: `import java.util.Arrays;

public class PassArrays {
    static void raise(int[] fares) {
        for (int i = 0; i < fares.length; i++) fares[i] += 10;    // changes the caller's array
    }

    static void replace(int[] fares) {
        fares = new int[] {0, 0, 0};                                // only the local copy of the reference
    }

    static int[] minMax(int[] values) {                             // returning two results
        int min = values[0], max = values[0];
        for (int v : values) { min = Math.min(min, v); max = Math.max(max, v); }
        return new int[] {min, max};
    }

    static int sum(int... values) {                                 // varargs: an int[] in disguise
        int total = 0;
        for (int v : values) total += v;
        return total;
    }

    public static void main(String[] args) {
        int[] fares = {60, 70, 80};
        raise(fares);
        System.out.println("after raise   " + Arrays.toString(fares));
        replace(fares);
        System.out.println("after replace " + Arrays.toString(fares));
        System.out.println("minMax " + Arrays.toString(minMax(fares)));
        System.out.println(sum() + " " + sum(5) + " " + sum(1, 2, 3) + " " + sum(new int[] {4, 5}));
    }
}`,
        },
        {
          type: "output",
          text: `after raise   [70, 80, 90]
after replace [70, 80, 90]
minMax [70, 90]
0 5 6 9`,
        },
        {
          type: "list",
          items: [
            "Java passes everything by value, and the value of an array variable is a reference. `raise` gets a copy of the reference to the **same** array, so its writes are visible to the caller. `replace` points its own copy at a new array; the caller's variable is untouched. The Methods lesson showed the same rule for objects.",
            "Returning an array is a quick way to return several values of one type. For values with meaning (min and max, a status and a message) a `record` is clearer: `record Range(int min, int max)`.",
            "`int... values` is compiled as an `int[]` parameter. The caller can pass zero or more `int`s, and `javac` creates the array, or pass an `int[]` directly. A varargs parameter must be last, and there can only be one.",
            "Because varargs creates an array on every call, the JDK provides fixed-arity overloads for hot paths: `List.of` has overloads for 0 to 10 elements before falling back to `E...`.",
            "`public static void main(String[] args)` is an array parameter too; `String... args` is equally valid.",
          ],
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
        int[] fares = new int[3];
        fares[0] = 60;
        int[] alias = fares;
        alias[1] = 70;
        fares = new int[] {1, 2};
        System.out.println(alias[0] + " " + alias[1] + " " + alias[2] + " | " + fares.length);
    }
}`,
        },
        {
          type: "output",
          text: `60 70 0 | 2`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`new int[3]`.** `iconst_3`, `newarray int`. The JVM checks the size isn't negative, allocates 32 bytes in the thread's TLAB (16-byte header plus 12 bytes of data, padded), writes the mark word, the class pointer to `[I` and the length 3, and zeroes the data. The reference goes into local `fares`, on the stack.",
            "**`fares[0] = 60`.** `iastore` checks `fares` isn't null, checks 0 is less than 3, and writes 60 at offset 16.",
            "**`int[] alias = fares`.** Copies the reference. There's still one array; two stack slots point to it.",
            "**`alias[1] = 70`.** Writes 70 at offset 20 of the same array, so `fares[1]` is 70 too.",
            "**`fares = new int[] {1, 2}`.** Creates a second array, a 24-byte `int[2]`, fills it, and points `fares` at it. `alias` still points at the first array.",
            "**The print.** `alias[2]` was never written, so it's still the default 0. `fares.length` reads the length from the new array's header: 2.",
            "**After `main`.** Both arrays become unreachable when the frame is popped, and are collected at the next young GC.",
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
          code: `import java.util.Arrays;

public class SyntaxTour {
    public static void main(String[] args) {
        // 1. declaring and creating
        int[] a = new int[3];                 // preferred style
        int b[] = new int[3];                 // C style, legal but discouraged
        int[] c = {10, 20, 30};               // initializer, only in a declaration
        int[] d;
        d = new int[] {1, 2};                 // anonymous array, usable anywhere
        String[] names = new String[] {"Asha", "Ravi"};
        var fares = new double[] {60.5, 70.0}; // var infers double[]
        System.out.println(a.length + " " + b.length + " " + c[2] + " " + d.length + " " + names[1] + " " + fares[0]);

        // 2. reading and writing
        c[0] = 11;
        c[c.length - 1] += 5;
        System.out.println(Arrays.toString(c));

        // 3. iterating
        for (int i = 0; i < c.length; i++) System.out.print(i + ":" + c[i] + " ");
        for (int v : c) System.out.print(v + " ");
        for (int i = c.length - 1; i >= 0; i--) System.out.print(c[i] + " ");
        System.out.println();
        System.out.println(Arrays.stream(c).sum() + " " + Arrays.stream(c).max().getAsInt());

        // 4. two dimensions
        int[][] grid = new int[2][3];
        int[][] jagged = {{1}, {2, 3}};
        grid[1][2] = 9;
        System.out.println(Arrays.deepToString(grid) + " " + jagged[1].length);

        // 5. arrays of objects start as null
        StringBuilder[] notes = new StringBuilder[2];
        notes[0] = new StringBuilder("ok");
        System.out.println(notes[0] + " " + notes[1]);

        // 6. varargs and main's String[] args
        System.out.println(String.join("-", "a", "b", "c") + " args.length " + args.length);
    }
}`,
        },
        {
          type: "output",
          text: `3 3 30 2 Ravi 60.5
[11, 20, 35]
0:11 1:20 2:35 11 20 35 35 20 11
66 35
[[0, 0, 0], [0, 0, 9]] 2
ok null
a-b-c args.length 0`,
        },
        {
          type: "paragraph",
          text: "`args` is an empty array, never `null`, when the program is run with no arguments. `String.join(\"-\", \"a\", \"b\", \"c\")` is a varargs call: `javac` packs the three strings into a `String[]`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Min, max, average and the second largest",
        },
        {
          type: "code",
          language: "java",
          title: "Stats.java",
          code: `public class Stats {
    // min, max and average in one pass
    static double[] stats(int[] values) {
        if (values.length == 0) throw new IllegalArgumentException("no values");
        int min = Integer.MAX_VALUE, max = Integer.MIN_VALUE;
        long sum = 0;                                    // long: an int sum can overflow
        for (int v : values) {
            if (v < min) min = v;
            if (v > max) max = v;
            sum += v;
        }
        return new double[] {min, max, (double) sum / values.length};
    }

    static int secondLargest(int[] values) {
        Integer first = null, second = null;
        for (int v : values) {
            if (first == null || v > first) { second = first; first = v; }
            else if (v != first && (second == null || v > second)) second = v;
        }
        if (second == null) throw new IllegalArgumentException("no second distinct value");
        return second;
    }

    public static void main(String[] args) {
        int[] fares = {120, 85, 240, 60, 240, 150};
        double[] s = stats(fares);
        System.out.printf("min %.0f, max %.0f, avg %.2f%n", s[0], s[1], s[2]);
        System.out.println("second largest " + secondLargest(fares));
        int[] big = {Integer.MAX_VALUE, Integer.MAX_VALUE};
        System.out.printf("avg of two MAX_VALUEs %.1f%n", stats(big)[2]);
    }
}`,
        },
        {
          type: "output",
          text: `min 60, max 240, avg 149.17
second largest 150
avg of two MAX_VALUEs 2147483647.0`,
        },
        {
          type: "list",
          items: [
            "Starting `min` at `Integer.MAX_VALUE` and `max` at `Integer.MIN_VALUE` means the first element always replaces both, so no special case is needed.",
            "The sum is a `long`. Two `Integer.MAX_VALUE`s added as `int`s overflow to -2; as `long`s the average is correct.",
            "`secondLargest` must handle duplicates: 240 appears twice, and the second *distinct* largest is 150. Using `Integer` with `null` as \"not seen yet\" avoids picking a sentinel like `Integer.MIN_VALUE`, which would be wrong if that value is in the data. One pass, O(n), instead of sorting at O(n log n).",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Reversing and rotating in place",
        },
        {
          type: "code",
          language: "java",
          title: "Rotate.java",
          code: `import java.util.Arrays;

public class Rotate {
    static void reverse(int[] a, int from, int to) {         // to is inclusive
        while (from < to) {
            int tmp = a[from];
            a[from++] = a[to];
            a[to--] = tmp;
        }
    }

    // Rotate right by k in place, O(n) time, O(1) extra space
    static void rotateRight(int[] a, int k) {
        if (a.length == 0) return;
        k %= a.length;
        reverse(a, 0, a.length - 1);
        reverse(a, 0, k - 1);
        reverse(a, k, a.length - 1);
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4, 5, 6, 7};
        reverse(a, 0, a.length - 1);
        System.out.println("reversed      " + Arrays.toString(a));
        reverse(a, 0, a.length - 1);
        rotateRight(a, 3);
        System.out.println("rotated by 3  " + Arrays.toString(a));
        int[] b = {1, 2, 3};
        rotateRight(b, 10);
        System.out.println("rotated by 10 " + Arrays.toString(b));
    }
}`,
        },
        {
          type: "output",
          text: `reversed      [7, 6, 5, 4, 3, 2, 1]
rotated by 3  [5, 6, 7, 1, 2, 3, 4]
rotated by 10 [3, 1, 2]`,
        },
        {
          type: "paragraph",
          text: "Two pointers swap from both ends towards the middle. Rotating right by `k` is three reversals: the whole array, then the first `k`, then the rest. `k %= a.length` handles `k` larger than the array: rotating 3 elements by 10 is the same as rotating by 1. The naive alternative, shifting by one position `k` times, is O(n·k).",
        },
        {
          type: "heading",
          text: "Example 3: Moving zeros and removing duplicates with a write pointer",
        },
        {
          type: "code",
          language: "java",
          title: "MoveZeros.java",
          code: `import java.util.Arrays;

public class MoveZeros {
    // Keeps the order of non-zero values, two pointers, one pass
    static void moveZerosToEnd(int[] a) {
        int write = 0;
        for (int read = 0; read < a.length; read++) {
            if (a[read] != 0) a[write++] = a[read];
        }
        while (write < a.length) a[write++] = 0;
    }

    // Sorted input: removes duplicates in place, returns the new logical length
    static int dedupeSorted(int[] a) {
        if (a.length == 0) return 0;
        int write = 1;
        for (int read = 1; read < a.length; read++) {
            if (a[read] != a[write - 1]) a[write++] = a[read];
        }
        return write;
    }

    public static void main(String[] args) {
        int[] a = {0, 5, 0, 3, 12, 0, 7};
        moveZerosToEnd(a);
        System.out.println(Arrays.toString(a));
        int[] b = {1, 1, 2, 3, 3, 3, 8};
        int len = dedupeSorted(b);
        System.out.println(len + " " + Arrays.toString(Arrays.copyOf(b, len)) + " raw " + Arrays.toString(b));
    }
}`,
        },
        {
          type: "output",
          text: `[5, 3, 12, 7, 0, 0, 0]
4 [1, 2, 3, 8] raw [1, 2, 3, 8, 3, 3, 8]`,
        },
        {
          type: "paragraph",
          text: "Arrays can't shrink, so \"removing\" elements in place means compacting the ones I keep to the front and tracking a **logical length**. The raw array still holds leftovers after position 4; only the first `len` elements are meaningful. That's exactly how `ArrayList` works: an `Object[]` with spare room and a `size` field.",
        },
        {
          type: "heading",
          text: "Example 4: Transposing a matrix and prefix sums",
        },
        {
          type: "code",
          language: "java",
          title: "Transpose.java",
          code: `import java.util.Arrays;

public class Transpose {
    static int[][] transpose(int[][] m) {
        int rows = m.length, cols = m[0].length;
        int[][] t = new int[cols][rows];
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) t[c][r] = m[r][c];
        return t;
    }

    static int[] prefixSums(int[] a) {
        int[] p = new int[a.length + 1];                   // p[i] = sum of the first i values
        for (int i = 0; i < a.length; i++) p[i + 1] = p[i] + a[i];
        return p;
    }

    public static void main(String[] args) {
        int[][] m = {{1, 2, 3}, {4, 5, 6}};
        System.out.println(Arrays.deepToString(transpose(m)));
        int[] trips = {4, 7, 2, 9, 5};                     // trips per hour
        int[] p = prefixSums(trips);
        System.out.println(Arrays.toString(p) + " trips in hours 1..3 = " + (p[4] - p[1]));
    }
}`,
        },
        {
          type: "output",
          text: `[[1, 4], [2, 5], [3, 6]]
[0, 4, 11, 13, 22, 27] trips in hours 1..3 = 18`,
        },
        {
          type: "paragraph",
          text: "A transposed matrix has the dimensions swapped, so it needs a new array; a non-square matrix can't be transposed in place. Prefix sums trade one O(n) pass for O(1) range queries afterwards: the trips in hours 1 to 3 (0-based) are `p[4] - p[1]` = 7 + 2 + 9 = 18, without looping. The extra leading 0 removes the special case for ranges starting at 0.",
        },
      ],
    },
    {
      title: "When to Use an Array",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "What I use", "Why"],
          rows: [
            ["A fixed number of primitive values (pixels, counters per hour, a buffer)", "`int[]`, `long[]`, `double[]`, `byte[]`", "No boxing, contiguous memory, the fastest access Java has"],
            ["A collection that grows or shrinks", "`ArrayList`", "It manages the array and resizing for me"],
            ["A collection of objects passed around an API", "`List<T>`", "Works with generics, can be made unmodifiable, has `equals` by content"],
            ["Lookup by key", "`HashMap` / `EnumMap`", "Arrays only index by position"],
            ["A grid of fixed size", "`int[rows][cols]`, or a flat `int[rows * cols]` for very large ones", "Flat avoids a header per row and keeps rows contiguous"],
            ["Lots of booleans", "`BitSet`", "1 bit per flag instead of 1 byte"],
            ["Byte buffers for I/O", "`byte[]`, or `ByteBuffer` for direct or off-heap memory", "What streams, files and sockets use"],
            ["A method taking \"any number\" of arguments", "Varargs", "`T...` is an array parameter with nicer call syntax"],
            ["Returning several results", "A `record`", "Named fields instead of `result[0]`, `result[1]`"],
          ],
        },
        {
          type: "paragraph",
          text: "In application code I reach for `List` by default and use arrays where the data is primitive, fixed-size and performance-sensitive, or where an API demands one (`main(String[] args)`, `String.split`, `byte[]` I/O, varargs). Collections are covered in their own category.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Off by one: i <= length",
        },
        {
          type: "code",
          language: "java",
          title: "OffByOne.java",
          code: `public class OffByOne {
    public static void main(String[] args) {
        int[] fares = {60, 70, 80};
        int total = 0;
        for (int i = 0; i <= fares.length; i++) total += fares[i];
        System.out.println(total);
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3
	at OffByOne.main(OffByOne.java:5)`,
        },
        {
          type: "paragraph",
          text: "The last valid index is `length - 1`, so the condition is `i < length`. Using for-each whenever I don't need the index makes this impossible.",
        },
        {
          type: "heading",
          text: "Using an initializer outside a declaration",
        },
        {
          type: "code",
          language: "java",
          title: "InitOnlyInDecl.java",
          code: `public class InitOnlyInDecl {
    public static void main(String[] args) {
        int[] fares;
        fares = {60, 70, 80};
    }
}`,
        },
        {
          type: "output",
          text: `InitOnlyInDecl.java:4: error: illegal start of expression
        fares = {60, 70, 80};
                ^
InitOnlyInDecl.java:4: error: not a statement
        fares = {60, 70, 80};
                 ^
InitOnlyInDecl.java:4: error: ';' expected
        fares = {60, 70, 80};
                   ^
3 errors`,
        },
        {
          type: "paragraph",
          text: "The short `{...}` form only works where the type is declared on the same line. Anywhere else, including `return {1, 2};` and method arguments, write `new int[] {60, 70, 80}`.",
        },
        {
          type: "heading",
          text: "Printing an array directly",
        },
        {
          type: "paragraph",
          text: "`System.out.println(fares)` prints something like `[I@2a139a55`: the class name and identity hash from `Object.toString()`. Use `Arrays.toString(fares)`, or `Arrays.deepToString(grid)` for nested arrays. The one exception is `char[]`, which `println` has an overload for.",
        },
        {
          type: "heading",
          text: "Comparing arrays with == or equals",
        },
        {
          type: "paragraph",
          text: "Arrays inherit `equals` and `hashCode` from `Object`, so both compare identity: two arrays with the same contents are not equal, and an `int[]` doesn't work as a `HashMap` key or `HashSet` element. Use `Arrays.equals`, `Arrays.deepEquals` and `Arrays.hashCode`; the next lesson shows them all.",
        },
        {
          type: "heading",
          text: "Trying to modify through for-each",
        },
        {
          type: "paragraph",
          text: "`for (int f : fares) f = f * 2;` compiles and changes nothing, as `ForEachCopy` showed. Use an index loop or `Arrays.setAll(fares, i -> fares[i] * 2)`.",
        },
        {
          type: "heading",
          text: "Expecting an array to grow",
        },
        {
          type: "paragraph",
          text: "There's no `add`. Writing past the end throws, and \"growing\" means creating a bigger array and copying (`Arrays.copyOf(a, a.length * 2)`). If the size isn't known in advance, use an `ArrayList`.",
        },
        {
          type: "heading",
          text: "Assuming every row of a 2D array exists and has the same length",
        },
        {
          type: "paragraph",
          text: "`new int[3][]` has `null` rows, and a jagged array's rows have different lengths. Loop with `grid[r].length` for the inner bound, not `grid[0].length`.",
        },
        {
          type: "heading",
          text: "Summing into an int",
        },
        {
          type: "paragraph",
          text: "Adding many `int`s into an `int` overflows silently, as `Stats` showed with two `Integer.MAX_VALUE`s. Accumulate into a `long`, or use `Math.addExact` to fail loudly.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Write `int[] fares`, not `int fares[]`: the brackets are part of the type.",
            "Use for-each for reading, an index loop for writing or when the index matters, and `length - 1` for the last element.",
            "Prefer primitive arrays for numbers; box only when an API needs objects.",
            "Return an empty array, not `null`, when there's nothing to return. A shared `private static final int[] EMPTY = new int[0];` is safe to reuse, because an empty array has nothing to modify.",
            "Don't expose internal arrays: return a copy from getters and copy arrays passed into constructors. The next lesson shows the bug this prevents.",
            "Put the long dimension last in multi-dimensional arrays, and iterate with the last index in the inner loop.",
            "Use `List` in APIs and generic code; use `List<List<T>>` instead of arrays of generic types.",
            "Use `Arrays.toString`, `deepToString`, `equals` and `hashCode` instead of the `Object` versions.",
            "Use `Math.toIntExact` when an array size comes from a `long`.",
            "Use a `record` instead of an array to return several values with different meanings.",
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
            "**Access by index is O(1)**: one address calculation, one load. Searching an unsorted array is O(n); inserting or deleting in the middle is O(n) because everything after it shifts.",
            "**Contiguous memory is fast memory.** Sequential access reads full cache lines and lets the CPU prefetch the next ones. Row-by-row iteration was 32 times faster than column-by-column on the same 4,000 × 4,000 grid.",
            "**Bounds checks are usually free.** The JIT eliminates them in loops whose index provably stays in range, and HotSpot can vectorise simple loops over primitive arrays with SIMD instructions.",
            "**Primitive beats boxed**: an `Integer[]` used 5 times the memory of an `int[]`, and every access follows a reference to another object.",
            "**Each array has a 16-byte header.** Many small arrays (`int[1_000_000][1]`, 28 MB) cost far more than one large one (4 MB) for the same data.",
            "**Allocation zeroes memory.** `new long[10_000_000]` writes 80 MB of zeros before the program uses it. Allocating huge arrays repeatedly in a loop is expensive; reuse a buffer where it's safe.",
            "**Large arrays are humongous objects in G1**: an array bigger than half a region (regions are 1 to 32 MB, depending on heap size) is allocated directly in the old generation, in its own regions. Lots of short-lived huge arrays can trigger extra GC cycles.",
          ],
        },
      ],
    },
    {
      title: "Arrays in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend keeps a live revenue heatmap for the operations dashboard: revenue in paise for every zone (2,000 zones) and every minute of the day (1,440). It was first written as `Long[][] revenue = new Long[1440][2000]`, indexed `[minute][zone]` because events arrive by time, with `revenue[m][z] += fare`. The dashboard's main query is \"total revenue per zone today\". Under peak load the service's GC time climbed, and the dashboard query got slow. I rebuilt both versions and fed them 5 million trips:",
        },
        {
          type: "code",
          language: "java",
          title: "RevenueHeatmap.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.Arrays;
import java.util.Random;

public class RevenueHeatmap {
    static final int MINUTES = 1_440, ZONES = 2_000;
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();

    // What shipped: revenue in paise, [minute][zone], boxed
    static final class Before {
        final Long[][] revenue = new Long[MINUTES][ZONES];
        Before() { for (Long[] row : revenue) Arrays.fill(row, 0L); }
        void record(int minute, int zone, long farePaise) { revenue[minute][zone] += farePaise; }  // unbox, add, box
        long[] dailyTotals() {
            long[] totals = new long[ZONES];
            for (int z = 0; z < ZONES; z++)
                for (int m = 0; m < MINUTES; m++) totals[z] += revenue[m][z];                     // column by column
            return totals;
        }
    }

    // The fix: [zone][minute], primitive long
    static final class After {
        final long[][] revenue = new long[ZONES][MINUTES];
        void record(int minute, int zone, long farePaise) { revenue[zone][minute] += farePaise; }
        long[] dailyTotals() {
            long[] totals = new long[ZONES];
            for (int z = 0; z < ZONES; z++) {
                long t = 0;
                for (int m = 0; m < MINUTES; m++) t += revenue[z][m];                              // row by row
                totals[z] = t;
            }
            return totals;
        }
    }

    public static void main(String[] args) {
        int n = 5_000_000;
        int[] minutes = new int[n], zones = new int[n];
        long[] fares = new long[n];
        Random rnd = new Random(42);
        for (int i = 0; i < n; i++) {
            minutes[i] = rnd.nextInt(MINUTES); zones[i] = rnd.nextInt(ZONES); fares[i] = 5_000 + rnd.nextInt(45_000);
        }

        long mem = MX.getCurrentThreadAllocatedBytes();
        Before b = new Before();
        long t = System.nanoTime();
        for (int i = 0; i < n; i++) b.record(minutes[i], zones[i], fares[i]);
        long recordB = (System.nanoTime() - t) / 1_000_000;
        long allocB = MX.getCurrentThreadAllocatedBytes() - mem;

        mem = MX.getCurrentThreadAllocatedBytes();
        After a = new After();
        t = System.nanoTime();
        for (int i = 0; i < n; i++) a.record(minutes[i], zones[i], fares[i]);
        long recordA = (System.nanoTime() - t) / 1_000_000;
        long allocA = MX.getCurrentThreadAllocatedBytes() - mem;

        long totalB = Long.MAX_VALUE, totalA = Long.MAX_VALUE;
        boolean same = true;
        for (int round = 0; round < 5; round++) {
            t = System.nanoTime(); long[] x = b.dailyTotals(); totalB = Math.min(totalB, System.nanoTime() - t);
            t = System.nanoTime(); long[] y = a.dailyTotals(); totalA = Math.min(totalA, System.nanoTime() - t);
            same &= Arrays.equals(x, y);
        }
        System.out.printf("Long[minute][zone] : record %4d ms, allocated %,13d bytes, daily totals %3d ms%n",
                recordB, allocB, totalB / 1_000_000);
        System.out.printf("long[zone][minute] : record %4d ms, allocated %,13d bytes, daily totals %3d ms%n",
                recordA, allocA, totalA / 1_000_000);
        System.out.println("same totals: " + same);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx2g RevenueHeatmap",
        },
        {
          type: "output",
          text: `Long[minute][zone] : record  671 ms, allocated   131,553,120 bytes, daily totals  85 ms
long[zone][minute] : record  108 ms, allocated    23,083,144 bytes, daily totals   2 ms
same totals: true`,
        },
        {
          type: "list",
          items: [
            "**Boxing on every event.** `revenue[m][z] += fare` on a `Long` unboxes, adds, and boxes a brand-new `Long` (24 bytes), because fares are far outside the -128 to 127 cache. 5 million events allocated 120 MB of `Long` objects on top of the 11.5 MB of arrays, almost all of it immediate garbage. That was the GC pressure.",
            "**Retained memory too.** Each live cell holds a 4-byte reference plus a 24-byte `Long`, against 8 bytes for a `long`. The boxed heatmap keeps roughly three times the live heap.",
            "**Wrong iteration order.** The dashboard sums per zone, but zones were the inner index, so the query walked column by column, touching a different row array for each minute: 85 ms against 2 ms after swapping to `[zone][minute]`. Recording got 6 times faster as well.",
            "**Same answer.** `Arrays.equals` on the totals confirms both versions agree, so the change is a pure refactor. A second run gave 632 and 101 ms for recording and the same allocation and totals.",
            "**What to look for in review.** A wrapper type in an array (`Long[]`, `Integer[][]`) used for arithmetic, and a nested loop whose inner index is the *first* subscript. A heap histogram (`jcmd <pid> GC.class_histogram`) showing millions of `java.lang.Long` instances points straight at the first problem.",
            "**A trap in my first attempt.** I first measured per-minute ride *counts* in an `Integer[][]`, and the boxed version allocated nothing extra: counts that small (under 128) all come from `Integer`'s cache. Boxing costs depend on the values, which is exactly why the problem appeared only once the data grew.",
            "**If it must be concurrent.** This rebuild is single-threaded. With request threads recording concurrently, the cells need `AtomicLongArray` or a `LongAdder` per zone, still without boxing; concurrency gets its own phase.",
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
              question: "What is an array in Java?",
              answer:
                "A fixed-size, ordered container of elements of one type, accessed by an `int` index from 0 to `length - 1`. Its size is set when it's created and can't change. Every array is an object on the heap, even an `int[]`, with a header that stores its length, and its elements are stored next to each other, which makes access by index O(1).",
            },
            {
              question: "Why does array indexing start at 0 in Java?",
              answer:
                "Because an index is an **offset** from the start of the array's data, not a position number. The address of `a[i]` is `start + i * elementSize` (plus the 16-byte header in HotSpot), so the first element is 0 elements from the start. Starting at 1 would need `(i - 1) * elementSize`, an extra subtraction on every access.\n\nJava inherited this from C, where `a[i]` means `*(a + i)`, and kept C's syntax so C and C++ programmers could switch easily. It also gives clean half-open ranges: valid indexes are `[0, length)`, loops use `i < length`, and a range `[from, to)` has `to - from` elements, the convention behind `substring` and `Arrays.copyOfRange`. Dijkstra's EWD831, *Why numbering should start at zero*, is the classic argument. The price is that the last element is at `length - 1`, the source of most off-by-one errors.",
            },
            {
              question: "What are the default values of array elements?",
              answer:
                "`0` for `byte`, `short`, `int` and `long`, `0.0` for `float` and `double`, `'\\\\u0000'` for `char`, `false` for `boolean`, and `null` for any reference type. They're set when the array is created, wherever it's created, so array elements never need explicit initialization the way local variables do.",
            },
            {
              question: "What is the difference between length and length()?",
              answer:
                "`length` (no parentheses) is the size of an array; it's stored in the array's header and read with the `arraylength` instruction. `length()` is a method on `String` and other `CharSequence`s. Collections use `size()`.",
            },
            {
              question: "What happens if you access an index outside the array?",
              answer:
                "The JVM throws `ArrayIndexOutOfBoundsException` with a message like \"Index 3 out of bounds for length 3\". Every array load and store is bounds-checked, which is the main safety difference from C. Negative indexes throw too. Creating an array with a negative size throws `NegativeArraySizeException`.",
            },
            {
              question: "Can the size of an array be changed after creation?",
              answer:
                "No. To \"resize\", create a new array and copy the elements over, for example with `Arrays.copyOf(a, newLength)`. `ArrayList` does exactly that internally when it runs out of room, growing by about 50% each time.",
            },
            {
              question: "What is the difference between int[] a = {1, 2} and new int[] {1, 2}?",
              answer:
                "They create the same array. The short initializer form is only allowed in a declaration, where the type is known. `new int[] {1, 2}` (an anonymous array) works anywhere: in an assignment, a `return`, or as a method argument. `fares = {1, 2};` on its own line doesn't compile.",
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
              question: "Is an array an object in Java?",
              answer:
                "Yes. Each array type is a class created by the JVM (`int[]` is `[I`, `String[]` is `[Ljava.lang.String;`), its superclass is `Object`, and it implements `Cloneable` and `Serializable`. Arrays inherit `equals`, `hashCode` and `toString` from `Object`, which is why `==` and `equals` both compare identity and printing shows `[I@...`.",
            },
            {
              question: "How is a 2D array stored in Java?",
              answer:
                "As an array of arrays. `new int[3][4]` creates an outer array of 3 references plus 3 separate `int[4]` row objects. Rows can have different lengths (jagged arrays), can be `null` (`new int[3][]`), and can even be the same object. Each row is contiguous, but rows can be anywhere in the heap, so iterating row by row is much faster than column by column: 4 ms against 128 ms on a 4,000 × 4,000 grid in my test.",
            },
            {
              question: "What is the difference between int[] and Integer[]?",
              answer:
                "`int[]` stores the values directly, 4 bytes each. `Integer[]` stores references to separate `Integer` objects: 4 bytes per reference plus 16 bytes per object. A million values took 4.0 MB as `int[]` and 20.0 MB as `Integer[]` in my measurement. `Integer[]` elements can also be `null`, and reading them means following a reference and unboxing.",
            },
            {
              question: "What is array covariance, and what is ArrayStoreException?",
              answer:
                "Covariance means `String[]` is a subtype of `Object[]`, so `Object[] o = new String[2];` compiles. The object is still a `String[]`, so `o[0] = 42;` compiles but fails at run time with `ArrayStoreException`, because every reference store (`aastore`) checks the element against the array's real component type. Generics are invariant instead: `List<String>` is not a `List<Object>`, and the error is caught at compile time.",
            },
            {
              question: "Why can't you create a generic array like new T[10]?",
              answer:
                "Arrays need their exact component type at run time to perform the `ArrayStoreException` check, but generic type arguments are erased at compile time, so `T` isn't known. The compiler reports \"generic array creation\". The workaround, `(T[]) new Object[n]`, works while the array stays private (as in `ArrayList`), but returning it as a `T[]` to a caller expecting `String[]` throws `ClassCastException`. Prefer `List<T>`.",
            },
            {
              question: "Is Java pass-by-reference for arrays?",
              answer:
                "No, Java is always pass-by-value, but the value of an array variable is a reference. A method can change the elements of the caller's array (same object), but assigning a new array to its parameter doesn't affect the caller's variable. My `raise` method changed the caller's fares; `replace` didn't.",
            },
            {
              question: "What does the enhanced for loop compile to for an array?",
              answer:
                "An ordinary index loop: `javac` stores the array reference and its length in hidden locals, then loads `a[i]` into the loop variable each iteration. No `Iterator` and no allocation. Assigning to the loop variable changes only that local copy, never the array.",
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
              question: "How much memory does an int[10] use?",
              answer:
                "56 bytes on a 64-bit JVM with default settings: a 16-byte header (8-byte mark word, 4-byte compressed class pointer, 4-byte length) plus 10 × 4 bytes of data = 56, already a multiple of 8. An `int[3]` is 16 + 12 = 28, padded to 32. Without compressed pointers, element data starts at 24. I measured these with `Unsafe.arrayBaseOffset` and the thread allocation counter.",
            },
            {
              question: "What is the maximum size of an array?",
              answer:
                "The index type is `int`, so the theoretical limit is `Integer.MAX_VALUE` elements. HotSpot rejects sizes very close to it with `OutOfMemoryError: Requested array size exceeds VM limit` (the header must fit too), which is why `ArrayList` caps growth at `Integer.MAX_VALUE - 8`. In practice the heap is the limit: `new int[Integer.MAX_VALUE - 8]` needs 8 GB and failed with \"Java heap space\" on a 1 GB heap.",
            },
            {
              question: "Does Java check array bounds on every access? Isn't that slow?",
              answer:
                "Every `xaload`/`xastore` instruction is defined with a bounds check, but the JIT removes it when it can prove the index is always in range, as in `for (int i = 0; i < a.length; i++)` (range check elimination). It also hoists or merges checks in other loops, and can vectorise simple primitive loops. So typical array loops have no per-element bounds check in compiled code.",
            },
            {
              question: "Which bytecode instructions deal with arrays?",
              answer:
                "`newarray` (primitive), `anewarray` (reference) and `multianewarray` (several dimensions) create them; `iaload`/`iastore`, `laload`, `daload`, `baload`, `caload`, `aaload`/`aastore` and the rest read and write elements; `arraylength` reads the length. `aastore` also performs the covariance type check. `javap -c` on a small method shows all of them.",
            },
            {
              question: "Why is iterating a 2D array column by column slow?",
              answer:
                "Each row is a separate object, contiguous within itself. Row-by-row access reads consecutive addresses, so each 64-byte cache line serves 16 `int`s and the hardware prefetcher keeps up. Column-by-column access jumps to a different row array for every element, wasting most of every cache line, and blocks the JIT's vectorisation. On a 4,000 × 4,000 `int` grid it was 32 times slower.",
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
              question: "A nightly report crashes with \"ArrayIndexOutOfBoundsException: Index 24 out of bounds for length 24\" on one day of the year. What's going on?",
              answer:
                "The code keeps one slot per hour, `new int[24]`, and indexes it with an hour number that reached 24. I'd first look for an inclusive loop or calculation (`<= 24`, `hour + 1`), but a crash on **one day of the year** points to daylight saving time: in a zone with DST, the day the clocks go back has 25 hours, so an \"hours since midnight\" counter reaches 24.\n\nThe fix is to size the array from the data rather than assume it (`Duration.between(start, end).toHours()`), or bucket by UTC hour, and to validate the index with a clear message instead of letting the array throw. The exception message already gives both numbers, index 24 and length 24, which is the fastest clue.",
            },
            {
              question: "A teammate calls your method with an int[] of fares, and afterwards their own copy of the fares has changed. How did that happen, and how do you prevent it?",
              answer:
                "Arrays are passed as a copy of the **reference**, so my method and their code point at the same array. Any write I do, such as sorting it or adjusting a value, is visible to them, as `raise` showed in `PassArrays`.\n\nTo prevent it: don't modify an argument unless that's the documented purpose of the method. When I need a modified version, copy first (`fares.clone()` or `Arrays.copyOf`) and work on the copy, as `PairSum` in the next lesson does before sorting. In the other direction, a class that stores an array it was given should copy it in the constructor, and a getter should return a copy, so no outside code holds a reference to the internal state.",
            },
            {
              question: "A metrics service's heap histogram shows tens of millions of java.lang.Long objects and frequent young GCs. The code keeps counters in a Long[][]. What do you change?",
              answer:
                "Every `cell += value` on a `Long` unboxes, adds and allocates a new `Long`, unless the result is between -128 and 127. That's one 24-byte object per update, almost all of it immediate garbage, plus 28 bytes per live cell instead of 8. In my `RevenueHeatmap` rebuild, 5 million updates allocated 131 MB with `Long[][]` against 23 MB with `long[][]`, and ran 6 times faster.\n\nI'd switch to `long[][]`, and check the loop order while I'm there: the inner loop should walk the last index. If the counters are updated from several threads, I'd use `AtomicLongArray` or `LongAdder`, which still avoid boxing.",
            },
            {
              question: "You need a grid of 100,000 × 100,000 cells, but only about 50,000 cells will ever be non-zero. How would you store it?",
              answer:
                "Not as an `int[100_000][100_000]`: that's 10 billion `int`s, about 40 GB, almost all of it zeros. It also needs 100,000 row arrays before storing anything.\n\nFor sparse data I'd store only the non-zero cells, for example a `HashMap<Long, Integer>` keyed by `(long) row * COLS + col`, which costs memory per stored cell instead of per possible cell. If cells are read row by row, a `Map<Integer, Map<Integer, Integer>>` or a per-row sorted structure keeps that efficient. A dense array is the right choice only when most cells are used.",
            },
            {
              question: "An image-processing job that loops over a 2D int[][] of pixels is much slower than expected. Where do you look first?",
              answer:
                "At the loop order. If the outer loop is over columns and the inner loop over rows, every step jumps to a different row array, wasting most of each cache line. Swapping to row-outer, column-inner was 32 times faster on a 4,000 × 4,000 grid in my test, with identical results.\n\nAfter that I'd check for boxing (`Integer[][]`), for a new array allocated per pixel or per row inside the loop, and for very many tiny rows; a flat `int[width * height]` indexed by `y * width + x` is often the fastest layout.",
            },
            {
              question: "A method should return the drivers near a pickup point, and sometimes there are none. Should it return null or an empty array?",
              answer:
                "An empty array (or an empty `List`). Callers can loop over it, check its length, or stream it without a null check, and forgetting a null check can't cause a `NullPointerException` later. `null` forces every caller to remember a special case.\n\nA zero-length array can't be modified, so a single `private static final Driver[] NONE = new Driver[0];` can be returned every time without any allocation.",
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
            "Create `new double[2]`, `new char[2]`, `new Boolean[2]` and `new boolean[2]`, print each with `Arrays.toString`, and explain the difference between the last two.",
            "Print `new int[0].getClass().getName()`, `new String[0][0].getClass().getName()` and `new int[0].getClass().getSuperclass()`.",
            "Write `static void swap(int[] a, int i, int j)` and use it to reverse an array. Then write `static void swapRefs(int[] x, int[] y)` that tries to swap two arrays by assigning the parameters, and check whether the caller sees a change.",
            "Create `int[][] tri = new int[5][]`, fill it as Pascal's triangle (row `r` has `r + 1` elements, edges are 1, inner values are the sum of the two above), and print it with `Arrays.deepToString`.",
            "Write `Object[] objs = new Integer[3]; objs[0] = \"x\";` and run it. Then try `List<Object> list = new ArrayList<Integer>();` and compile it.",
            "Sum a 3,000 × 3,000 `int[][]` row by row and column by column, timing each with `System.nanoTime()`.",
            "Write `static int max(int first, int... rest)` so that calling `max()` with no arguments doesn't compile.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `[0.0, 0.0]`, two invisible `\\\\u0000` chars, `[null, null]` and `[false, false]`: `Boolean` is a reference type. Step 2 prints `[I`, `[[Ljava.lang.String;` and `class java.lang.Object`. Step 3: `swap` changes the caller's array, `swapRefs` doesn't, because it only reassigns its own copies of the references. Step 4 ends with `[1, 4, 6, 4, 1]`. Step 5 throws `ArrayStoreException: java.lang.String` at run time, while the `List` line fails to compile with \"incompatible types\". Step 6 shows column by column several to tens of times slower. Step 7 makes at least one argument mandatory, a common JDK pattern.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT       fixed-size, one type, index 0..length-1, O(1) access
           an OBJECT on the heap: class [I, super Object,
           Cloneable + Serializable, equals/hashCode = identity

CREATE     int[] a = new int[3];        defaults 0/false/null
           int[] a = {1, 2, 3};         only in a declaration
           a = new int[] {1, 2, 3};     anywhere
           int[][] g = new int[3][4];   int[][] j = new int[3][];

LAYOUT     16-byte header: mark 8 + class 4 + length 4
           elements back to back; padded to 8 bytes
           index = OFFSET: &a[i] = start + 16 + i * size -> first is 0
           int[3] = 32 B   int[10] = 56 B   Integer[] = refs + objects

BYTECODE   newarray / anewarray / multianewarray
           iaload iastore aaload aastore arraylength
           bounds + null check on each; JIT removes provable ones

ERRORS     a[length], a[-1]  -> ArrayIndexOutOfBoundsException
           new int[-1]       -> NegativeArraySizeException
           Object[] o = new String[1]; o[0] = 1 -> ArrayStoreException
           new T[10]         -> compile error: generic array creation

2D         array of row arrays; rows can differ, be null, be shared
           loop the LAST index innermost (32x faster here)

METHODS    pass-by-value of the reference: elements shared,
           reassigning the parameter isn't seen by the caller
           int... = int[] parameter, must be last

PREFER     int[] over Integer[] (5x memory); List in APIs;
           Arrays.toString / equals / hashCode`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "An array is the simplest container Java has: one object with a header, a length and its elements back to back. That layout gives O(1) access and cache-friendly loops, and also the fixed size, the 16-byte overhead per array, and the identity-based `equals`.",
            "Most array bugs come from forgetting that arrays are objects referenced by variables: aliases and shared rows, for-each copies, `==` and printing. The performance traps come from forgetting the layout: boxed elements and column-first loops.",
            "The next lesson, The Arrays Class and Copying Arrays, covers what `java.util.Arrays` and `System.arraycopy` add: copying (and shallow versus deep copies), printing, comparing, sorting with the algorithms behind it, binary search, filling, and the traps in `Arrays.asList`.",
          ],
        },
      ],
    },
  ],
};
