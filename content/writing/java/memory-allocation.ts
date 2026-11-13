import type { Lesson } from "../types";

export const memoryAllocation: Lesson = {
  slug: "memory-allocation",
  date: "2026-10-24",
  title: "Memory Allocation",
  description:
    "Where every value in a Java program lives — stack frames, the heap, Metaspace — and what really happens on `new`: TLAB bump-pointer allocation, zeroing, the object header, measured object sizes, escape analysis, the string pool, and a production memory leak traced to OutOfMemoryError.",
  tags: ["Core Java", "Memory", "JVM", "Heap", "Garbage Collection"],
  sections: [
    {
      title: "What Memory Allocation Means",
      blocks: [
        {
          type: "paragraph",
          text: "Every value a program works with has to sit somewhere in memory: a counter in a loop, a `String` from a request, an array of prices. **Memory allocation** is the act of reserving that space, and every language has to answer three questions about it: where does the value go, who reserves the space, and who gives it back.",
        },
        {
          type: "paragraph",
          text: "Java's answers are what make it feel different from C. I never call `malloc` and I never call `free`. Local variables get their space automatically in the method's frame, objects get theirs when I write `new`, and the **garbage collector** reclaims objects once nothing can reach them anymore. That's convenient, but it isn't magic, and the moment a service starts throwing `OutOfMemoryError` or pausing for GC, the details matter.",
        },
        {
          type: "paragraph",
          text: "The Methods lesson showed what a call does to the stack. This lesson is about everything else: what `new` actually does, how big an object really is, why some objects are never allocated at all, and how a harmless-looking `static` map leaks memory until the JVM dies. The next lesson puts stack and heap side by side.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "In C, the programmer manages the heap by hand: `malloc` reserves bytes, `free` returns them. Forget a `free` and the program leaks. Call it twice, or use the memory after freeing it, and the program corrupts itself, which is the root of a whole family of security bugs. C++ added constructors, destructors and later smart pointers, but the responsibility stayed with the programmer.",
        },
        {
          type: "paragraph",
          text: "Java took the opposite position in 1995: no pointers to arithmetic on, no `free`, and a garbage collector built into the runtime. The idea wasn't new (Lisp had garbage collection in 1959), but Java was the language that made it mainstream for everyday business code. The trade was some CPU and memory overhead in exchange for whole classes of bugs becoming impossible: there is no way to write a use-after-free or a double free in plain Java.",
        },
        {
          type: "paragraph",
          text: "The memory layout itself has moved over the years, and old blog posts still describe the old one:",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters today"],
          rows: [
            ["Java 1.2", "Generational GC: young and old generations", "Most objects die young, so collecting the young area often is cheap"],
            ["Java 6u23", "Compressed oops on by default for 64-bit heaps under ~32 GB", "References take 4 bytes instead of 8, objects are smaller"],
            ["Java 7", "String pool moved from PermGen to the heap", "Interned strings are garbage-collected like anything else"],
            ["Java 8", "PermGen removed, replaced by **Metaspace** in native memory", "No more `java.lang.OutOfMemoryError: PermGen space`"],
            ["Java 9", "G1 became the default collector", "Heap is split into regions, not two big fixed areas"],
            ["Java 10", "The JVM became container-aware", "Default heap size follows the container's memory limit, not the host's"],
            ["Java 21", "Generational ZGC; virtual threads", "Sub-millisecond pauses on big heaps; thread stacks that live on the heap"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture that made it click for me is a busy restaurant kitchen.",
        },
        {
          type: "list",
          items: [
            "Each **cook** is a thread. Each cook has a small **order slip** clipped in front of them with the quantities for the dish they're making right now. That's the stack frame: small, private, thrown away the moment the dish is done.",
            "The **storeroom** behind the kitchen is the heap. Big things live there: crates, trays, prepared sauces. Every cook can walk in, and any cook can use what's on a shelf, as long as they know which shelf.",
            "The **shelf label** written on the order slip is a reference. The slip doesn't contain the tray, only where to find it.",
            "The **recipe book** printed once and shared by everyone is Metaspace: the class definitions, not the food.",
            "The **cleaner** is the garbage collector. They walk the storeroom, and anything no order slip and no labelled shelf points to gets thrown out. They never ask a cook whether something is still needed; they only check whether anyone can still find it.",
            "Each cook also gets a **personal tray of empty containers** at the start of the shift, so grabbing one doesn't mean queuing at the storeroom door. That's the TLAB, explained below.",
          ],
        },
        {
          type: "paragraph",
          text: "The leak at the end of this lesson maps onto it too: someone keeps writing new shelf labels into a ledger that's never cleared. The cleaner sees every tray is still listed, so nothing is ever thrown out, until the storeroom is full.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The JVM's runtime data areas",
        },
        {
          type: "paragraph",
          text: "The JVM specification (chapter 2.5) defines the memory areas a running program uses. Some exist once per JVM, some once per thread:",
        },
        {
          type: "table",
          headers: ["Area", "One per", "Holds", "Error when full"],
          rows: [
            ["PC register", "thread", "Address of the bytecode instruction being executed", "—"],
            ["JVM stack", "thread", "Frames: locals, operand stack, frame data", "`StackOverflowError`"],
            ["Native method stack", "thread", "Frames of native (C) code called through JNI", "`StackOverflowError`"],
            ["Heap", "JVM", "Every object and every array, the string pool, the objects static fields point to", "`OutOfMemoryError: Java heap space`"],
            ["Method area (Metaspace in HotSpot)", "JVM", "Class metadata, method bytecode, the run-time constant pool", "`OutOfMemoryError: Metaspace`"],
            ["Code cache", "JVM", "Machine code produced by the JIT", "JIT stops compiling, with a warning"],
          ],
        },
        {
          type: "heading",
          text: "What goes where",
        },
        {
          type: "paragraph",
          text: "The rule I use is short: **objects always live on the heap, and variables live wherever they're declared**. A local variable lives in its frame, an instance field lives inside its object (so on the heap), and a static field belongs to the class. The confusion usually comes from mixing up the variable with the object it refers to.",
        },
        {
          type: "table",
          headers: ["Declaration", "The variable", "The value"],
          rows: [
            ["`int price = 12;` (local)", "Slot in the method's frame", "The `12` itself, right in the slot"],
            ["`Order order = new Order();` (local)", "Slot in the frame", "A reference; the `Order` object is on the heap"],
            ["`int quantity;` (instance field)", "Inside every `Order` object", "On the heap, as part of the object"],
            ["`static int orderCount;`", "Belongs to the class", "In HotSpot, stored in the class's `java.lang.Class` mirror, which is a heap object"],
            ["`\"Kolkata\"` (literal)", "—", "One pooled `String` object on the heap, shared by every use of that literal"],
            ["`new int[3]`", "—", "Arrays are objects: heap, every element zeroed"],
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "\"Primitives live on the stack\" is half true",
          text: "It's true for **local** primitives. A primitive field lives inside its object, so `order.quantity` is on the heap. And an `int[]` with a million elements is a million `int`s on the heap. The type doesn't decide the location; where the variable is declared does.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What `new` compiles to",
        },
        {
          type: "paragraph",
          text: "To see what `new` really is, I compiled the smallest factory method I could write and disassembled it:",
        },
        {
          type: "code",
          language: "java",
          title: "NewPoint.java",
          code: `public class NewPoint {
    int x, y;
    NewPoint(int x, int y) { this.x = x; this.y = y; }

    static NewPoint make() {
        return new NewPoint(1, 2);
    }

    public static void main(String[] args) {
        System.out.println(make().x);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac NewPoint.java && javap -c NewPoint",
        },
        {
          type: "output",
          text: `  static NewPoint make();
    Code:
       0: new           #8                  // class NewPoint
       3: dup
       4: iconst_1
       5: iconst_2
       6: invokespecial #16                 // Method "<init>":(II)V
       9: areturn`,
        },
        {
          type: "paragraph",
          text: "One line of Java became two separate steps. The `new` instruction **allocates** the object and pushes a reference to it. `invokespecial <init>` runs the **constructor** on that already-existing object. `dup` is there because the constructor call consumes one copy of the reference and `areturn` needs the other. So by the time a constructor's first line runs, the memory is already reserved, and every field already holds its default value.",
        },
        {
          type: "heading",
          text: "What the `new` instruction does",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Resolve the class.** The first time this `new` runs, the constant pool entry `#8` is resolved to the loaded `NewPoint` class. If the class hasn't been initialised yet, its static initialisers run now (the Class Loading lesson covered that).",
            "**Know the size.** The class's field layout was computed when it was loaded, so the object's size is a fixed number. No measuring at runtime.",
            "**Reserve the bytes, fast path.** Each thread owns a **TLAB** (thread-local allocation buffer), a private chunk of the young generation. Allocation is a pointer bump: check that `top + size` doesn't pass the end of the buffer, return `top`, move `top` forward. No lock, because no other thread touches this buffer. The JIT turns this into a handful of machine instructions.",
            "**Slow path.** If the TLAB is full, the thread retires it and gets a new one from eden. If eden is full, that triggers a young GC. Very large objects skip the TLAB altogether; in G1, anything at least half a region in size is a **humongous** object and gets its own contiguous regions.",
            "**Zero the memory.** Every byte of the fields is set to zero. That's where default values come from: `0`, `0.0`, `false`, `'\\u0000'` and `null` are all just zero bits.",
            "**Write the header.** The mark word (8 bytes) and the class pointer (4 bytes with compressed class pointers) go at the start of the object.",
            "**Push the reference.** The object exists. Then `invokespecial` runs the constructor on it.",
          ],
        },
        {
          type: "diagram",
          text: `Eden (young generation), shared by all threads
┌───────────────────────────────────────────────────────────────┐
│ TLAB of thread http-1          │ TLAB of thread http-2        │
│ [obj][obj][obj][   free   ]    │ [obj][obj][     free     ]   │
│                ▲ top     ▲ end │           ▲ top          ▲   │
└───────────────────────────────────────────────────────────────┘

allocate(size):
    if top + size <= end:      # almost always true
        obj = top
        top = top + size       # "bump the pointer", no lock
        return obj
    else:
        retire this TLAB, ask eden for a new one (may trigger a young GC)`,
          caption: "Allocation in a TLAB is cheaper than most method calls. The expensive part of an object is not creating it but keeping it alive.",
        },
        {
          type: "heading",
          text: "The object header and layout",
        },
        {
          type: "paragraph",
          text: "Every object starts with a header. The **mark word** is 8 bytes on a 64-bit JVM and holds the identity hash code (once something asks for it), the GC age, and lock state. The **class pointer** says which class this object is an instance of, pointing into Metaspace. With compressed class pointers, the default, it's 4 bytes. Arrays add a 4-byte length. Then come the fields, and the total is rounded up to a multiple of 8 bytes.",
        },
        {
          type: "image",
          src: "/images/java/object-layout.svg",
          alt: "Layout of new Product(1L, 12, \"Pen\"): an 8-byte mark word, a 4-byte class pointer, int stock at offset 12, long id at offset 16, a 4-byte reference to the name String at offset 24, and 4 bytes of padding, 32 bytes in total.",
          caption: "Declared as `long id; int stock; String name;`, but the JVM moved `stock` into the 4-byte gap right after the header.",
        },
        {
          type: "paragraph",
          text: "I didn't want to trust a diagram, so I read the field offsets back from the running JVM with `Unsafe.objectFieldOffset` (the internal API that tools like JOL use):",
        },
        {
          type: "code",
          language: "java",
          title: "Offsets.java",
          code: `import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class Offsets {
    static class Product { long id; int stock; String name; }

    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);
        for (String field : new String[] {"id", "stock", "name"}) {
            System.out.println(field + " at offset " + u.objectFieldOffset(Product.class.getDeclaredField(field)));
        }
        System.out.println("int[] data starts at " + u.arrayBaseOffset(int[].class));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Offsets
java -XX:-UseCompressedClassPointers -XX:-UseCompressedOops Offsets`,
        },
        {
          type: "output",
          text: `id at offset 16
stock at offset 12
name at offset 24
int[] data starts at 16

id at offset 16
stock at offset 24
name at offset 32
int[] data starts at 24`,
        },
        {
          type: "list",
          items: [
            "With the defaults, the header is 12 bytes, so `stock` (4 bytes) fits at offset 12. `id` is a `long` and needs an 8-aligned address, so it goes to 16. The reference `name` is 4 bytes, compressed, at 24.",
            "With compression off, the header is 16 bytes and references are 8. Everything moves, and the gap after the header disappears, so the declared order happens to come back.",
            "For an `int[]`, the data starts at 16: 8 bytes of mark word, 4 of class pointer, 4 of length.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Compressed oops in one paragraph",
          text: "A 64-bit JVM could use 8-byte references everywhere, but most heaps are far below the 2^64 bytes that requires. Since objects are 8-byte aligned, the JVM stores a reference as a 32-bit number and multiplies by 8 when using it, which addresses 32 GB. So under about 32 GB of heap, `UseCompressedOops` is on by default and every reference field, every array element of an object array and every class pointer is half the size. Going from a 31 GB heap to a 33 GB heap can actually leave **less** room for objects.",
        },
      ],
    },
    {
      title: "How Big Is an Object, Really",
      blocks: [
        {
          type: "paragraph",
          text: "There's no `sizeof` in Java, but HotSpot counts how many bytes each thread has allocated, and `com.sun.management.ThreadMXBean` exposes the counter. Allocating one object and reading the counter before and after gives its real size:",
        },
        {
          type: "code",
          language: "java",
          title: "AllocSize.java",
          code: `import java.lang.management.ManagementFactory;

public class AllocSize {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;                       // keeps each object reachable, so it is really allocated

    record Point(int x, int y) {}
    record Product(long id, int stock, String name) {}

    static long bytes(Runnable r) {
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        r.run();
        return MX.getThreadAllocatedBytes(id) - before;
    }

    public static void main(String[] args) {
        Runnable[] all = {
            () -> sink = new Object(),       () -> sink = new int[0],
            () -> sink = new int[10],        () -> sink = new long[10],
            () -> sink = new Point(1, 2),    () -> sink = new Product(1L, 12, "Pen"),
            () -> sink = new byte[1_000_000]
        };
        String[] names = { "new Object()", "new int[0]", "new int[10]", "new long[10]",
                           "new Point(1, 2)", "new Product(1L, 12, \\"Pen\\")", "new byte[1_000_000]" };
        for (int round = 0; round < 3; round++) for (Runnable r : all) bytes(r);   // load classes first
        long base = bytes(() -> {});
        for (int i = 0; i < all.length; i++) {
            System.out.printf("%-26s %,d bytes%n", names[i], bytes(all[i]) - base);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java AllocSize
java -XX:-UseCompressedClassPointers -XX:-UseCompressedOops AllocSize`,
        },
        {
          type: "table",
          headers: ["Allocation", "Default (compressed)", "Compression off", "Where the bytes go (default)"],
          rows: [
            ["`new Object()`", "16", "16", "12 header + 4 padding"],
            ["`new int[0]`", "16", "24", "12 header + 4 length"],
            ["`new int[10]`", "56", "64", "16 + 40 of data"],
            ["`new long[10]`", "96", "104", "16 + 80 of data"],
            ["`new Point(1, 2)`", "24", "24", "12 + 4 + 4 = 20, rounded to 24"],
            ["`new Product(1L, 12, \"Pen\")`", "32", "40", "12 + 4 + 8 + 4 = 28, rounded to 32"],
            ["`new byte[1_000_000]`", "1,000,016", "1,000,024", "16 + one byte per element"],
          ],
        },
        {
          type: "list",
          items: [
            "An empty `Object` is 16 bytes, not 0. An `Integer` holding a 4-byte `int` is also 16. That's why a `List<Integer>` of a million numbers costs around 20 MB (16 per `Integer` plus 4 per reference in the backing array), while an `int[]` of the same numbers costs 4 MB.",
            "The \"Pen\" string isn't counted in `Product`'s 32 bytes. The literal already existed in the pool; `Product` only holds a 4-byte reference to it.",
            "I warmed up three rounds first, because the very first `new Point` also loaded the class and allocated about 4.8 KB of metadata objects along the way. The first run of anything measures class loading, not the thing itself.",
          ],
        },
      ],
    },
    {
      title: "Objects That Are Never Allocated: Escape Analysis",
      blocks: [
        {
          type: "paragraph",
          text: "The JIT compiler (C2) looks at whether an object can **escape** the method that creates it: be returned, stored in a field, or passed somewhere it can't see into. If it can't, the object doesn't need to exist on the heap at all. C2 replaces it with its fields as plain local values, which is called **scalar replacement**. The object is still in my source code, but it's gone from the machine code.",
        },
        {
          type: "code",
          language: "java",
          title: "Escape.java",
          code: `import java.lang.management.ManagementFactory;

public class Escape {
    record Point(int x, int y) {}

    // The Point never leaves this method: a candidate for scalar replacement
    static long distanceSq(int x, int y) {
        Point p = new Point(x, y);
        return (long) p.x() * p.x() + (long) p.y() * p.y();
    }

    public static void main(String[] args) {
        var mx = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        long id = Thread.currentThread().threadId();
        long sum = 0;
        for (int round = 1; round <= 5; round++) {
            long before = mx.getThreadAllocatedBytes(id);
            for (int i = 0; i < 10_000_000; i++) {
                sum += distanceSq(i, i + 1);
            }
            long mb = (mx.getThreadAllocatedBytes(id) - before) / 1_000_000;
            System.out.println("round " + round + ": " + mb + " MB allocated");
        }
        System.out.println(sum);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Escape
java -XX:-DoEscapeAnalysis Escape
java -Xint Escape`,
        },
        {
          type: "output",
          text: `# default
round 1: 0 MB allocated
round 2: 0 MB allocated
round 3: 0 MB allocated
round 4: 0 MB allocated
round 5: 0 MB allocated
-5527344008078842496

# -XX:-DoEscapeAnalysis
round 1: 240 MB allocated
...
round 5: 240 MB allocated

# -Xint (interpreter only)
round 1: 240 MB allocated
round 2: 240 MB allocated`,
        },
        {
          type: "paragraph",
          text: "Ten million `Point`s at 24 bytes each is exactly 240 MB, and that's what was allocated with escape analysis off, or with no JIT at all. With the defaults, zero, even in round 1, because the loop got compiled through on-stack replacement within the first few milliseconds. The sum is the same in every run (it overflowed `long`, which doesn't matter here), so the program's behaviour didn't change, only its allocation.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "What this means in practice",
          text: "Small, short-lived objects inside hot methods (a record holding two values, an iterator in a for-each loop, a builder used once) are often free. That's a good reason not to contort code into primitives \"for performance\". It's not a guarantee though: an object that escapes (stored in a field, put in a collection, passed to a method too large to inline) is allocated for real.",
        },
      ],
    },
    {
      title: "Shared Objects: The String Pool and the Integer Cache",
      blocks: [
        {
          type: "paragraph",
          text: "Two places in the JDK avoid allocating by handing out an object that already exists. Both are why `==` on objects sometimes appears to work, which is worse than if it never did:",
        },
        {
          type: "code",
          language: "java",
          title: "Pools.java",
          code: `public class Pools {
    public static void main(String[] args) {
        String a = "hello";
        String b = "hello";
        String c = new String("hello");
        String d = c.intern();
        System.out.println("a == b        " + (a == b));
        System.out.println("a == c        " + (a == c));
        System.out.println("a == d        " + (a == d));
        System.out.println("a.equals(c)   " + a.equals(c));

        Integer small1 = 127, small2 = 127;
        Integer big1 = 128, big2 = 128;
        System.out.println("127 == 127    " + (small1 == small2));
        System.out.println("128 == 128    " + (big1 == big2));
    }
}`,
        },
        {
          type: "output",
          text: `a == b        true
a == c        false
a == d        true
a.equals(c)   true
127 == 127    true
128 == 128    false`,
        },
        {
          type: "list",
          items: [
            "**String literals** are interned: every `\"hello\"` literal in every class of the JVM resolves to one `String` object in the string pool, which has been on the heap since Java 7. That's why `a == b`.",
            "`new String(\"hello\")` always allocates a new object, so `a == c` is false even though the text is equal. `intern()` returns the pooled copy, so `a == d`.",
            "**Autoboxing** goes through `Integer.valueOf`, which returns cached objects for -128 to 127. The same applies to `Short`, `Byte`, `Long` and `Character` (0 to 127). From 128 up, each boxing allocates a new `Integer`, so `==` compares two different objects. The upper bound of the `Integer` cache can be raised with `-XX:AutoBoxCacheMax`, which is one more reason never to rely on it.",
          ],
        },
        {
          type: "paragraph",
          text: "The rule doesn't change: `==` on objects compares references, \"is this the same object\". Use `equals` for values. The pools only make the bug intermittent: tests with ids under 128 pass and production ids fail.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Putting it together for `Order order = new Order(5);` inside `main`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`main`'s frame already has a slot for `order`, sized by `javac` (`locals=`). Nothing is allocated for the variable at runtime.",
            "`new #x` resolves `Order` (loading and initialising it on first use) and knows its size from the field layout.",
            "The thread bumps the pointer in its TLAB by that many bytes. On the rare slow path it gets a new TLAB, and that may trigger a young GC.",
            "The fields are zeroed, so `quantity` is `0`, and the header is written.",
            "`dup`, then the argument `5` is pushed, then `invokespecial Order.<init>(I)V` runs the constructor in a new frame, with `this` in slot 0. It sets `quantity` to `5` and returns.",
            "`astore_1` stores the reference into `main`'s slot 1. The object is now reachable through that slot.",
            "When `main` returns, the slot disappears with the frame. If nothing else holds a reference, the object is now garbage, and the next GC that looks at its region reclaims the space. There is no explicit free; reclaiming is the GC noticing nobody can reach it.",
          ],
        },
      ],
    },
    {
      title: "Garbage Collection, Just Enough",
      blocks: [
        {
          type: "paragraph",
          text: "GC deserves its own track, but allocation doesn't make sense without the basic idea. The collector starts from **GC roots** (local variables in every live frame of every thread, static fields, active monitors, JNI references) and follows references. Everything it reaches is alive. Everything else is garbage, no matter how big, and no matter whether it still has references to other objects.",
        },
        {
          type: "diagram",
          text: `GC roots                      heap
──────────                    ─────────────────────────────────
main frame: order ──────────► Order ──► "Asha"
static CACHE ───────────────► HashMap ──► Report ──► byte[10000]
                                      └─► Report ──► byte[10000]

                              Employee ◄──► Team     ◄ point to each other,
                                                       but no root reaches them:
                                                       garbage (cycles are fine)`,
          caption: "Reachability, not reference counting. Two objects pointing at each other are still collected if nothing from a root reaches them.",
        },
        {
          type: "list",
          items: [
            "**Young generation** (eden plus survivor spaces): new objects go here. Most die before the next young GC, which only has to copy the few survivors, so the cost is proportional to what's alive, not to what was allocated.",
            "**Old generation**: objects that survived several young GCs (the age is in the mark word) get promoted here. Caches, sessions, connection pools.",
            "G1, the default since Java 9, splits the heap into equal regions (1 MB in the 128 MB heap I inspect with `jcmd` in the next lesson) and labels each region eden, survivor, old or humongous, rather than keeping one fixed block per generation.",
            "So from the allocation side the conclusion is: allocating is cheap, **retaining** is expensive. A leak isn't memory that wasn't freed; it's an object that is still reachable when it shouldn't be.",
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
          title: "AllocationSyntax.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class AllocationSyntax {
    record Order(int quantity) {}
    record Product(long id, int stock, String name) {}

    public static void main(String[] args) {
        int count = 0;                         // local primitive: value in the frame
        Order order = new Order(5);            // reference in the frame, object on the heap
        int[] prices = new int[5];             // array object, zero-filled: [0, 0, 0, 0, 0]
        int[] fixed = {120, 340, 90};          // array initializer: same as new int[] {...}
        String city = "Pune";                  // pooled literal, no allocation at this line
        String copy = new String("Pune");      // always a new object (almost never needed)
        Integer boxed = 42;                    // Integer.valueOf(42): cached, no allocation
        List<Integer> ids = new ArrayList<>(); // one ArrayList object; its array grows later
        var pen = new Product(1L, 12, "Pen");  // var: same allocation, the type is inferred

        System.out.println(count + " " + order + " " + prices.length + " " + fixed[1] + " "
            + (city == copy) + " " + boxed + " " + ids + " " + pen);
        order = null;                          // drops this reference; the object may now be garbage
    }
}`,
        },
        {
          type: "output",
          text: "0 Order[quantity=5] 5 340 false 42 [] Product[id=1, stock=12, name=Pen]",
        },
        {
          type: "table",
          headers: ["JVM flag", "What it controls", "Default on my machine (15 GB RAM)"],
          rows: [
            ["`-Xms`", "Initial heap size", "240 MB (1/64 of RAM)"],
            ["`-Xmx`", "Maximum heap size", "3.74 GB (1/4 of RAM)"],
            ["`-XX:MaxRAMPercentage`", "Max heap as a % of RAM or of the container limit", "25"],
            ["`-Xss`", "Stack size per platform thread", "1 MB"],
            ["`-XX:MaxMetaspaceSize`", "Cap on class metadata", "unlimited"],
            ["`-XX:+HeapDumpOnOutOfMemoryError`", "Write a heap dump on heap OOM", "off"],
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "paragraph",
          text: "Example 1: one program, every kind of storage from the table above.",
        },
        {
          type: "code",
          language: "java",
          title: "WhereItLives.java",
          code: `public class WhereItLives {
    static int orderCount = 0;                    // static field: with the class
    int quantity;                                 // instance field: inside each object

    WhereItLives(int quantity) { this.quantity = quantity; }

    public static void main(String[] args) {
        int price = 12;                           // primitive local: the value sits in main's frame
        WhereItLives order = new WhereItLives(3); // reference in the frame, object on the heap
        String customer = "Asha";                 // literal: one pooled String object on the heap
        int[] ratings = new int[3];               // arrays are objects too: heap, zero-filled
        orderCount++;

        System.out.println("price=" + price + " quantity=" + order.quantity + " customer=" + customer);
        System.out.println("ratings=" + java.util.Arrays.toString(ratings) + " orderCount=" + orderCount);
    }
}`,
        },
        {
          type: "output",
          text: `price=12 quantity=3 customer=Asha
ratings=[0, 0, 0] orderCount=1`,
        },
        {
          type: "diagram",
          text: `main frame (stack)          heap
┌──────────────────┐
│ 0 args     ●─────┼──────► String[0]
│ 1 price    12    │
│ 2 order    ●─────┼──────► WhereItLives { quantity: 3 }
│ 3 customer ●─────┼──────► "Asha"  (string pool)
│ 4 ratings  ●─────┼──────► int[3] { 0, 0, 0 }
└──────────────────┘
class WhereItLives: orderCount = 1  (static, held by the Class object)`,
          caption: "Four of the five locals are references. Only `price` holds its value directly.",
        },
        {
          type: "paragraph",
          text: "Example 2: default values come from zeroing, and only fields and array elements get them. Locals don't, because they aren't allocated by `new`.",
        },
        {
          type: "code",
          language: "java",
          title: "Defaults.java",
          code: `public class Defaults {
    int count;
    double amount;
    boolean active;
    String name;

    public static void main(String[] args) {
        Defaults d = new Defaults();
        System.out.println(d.count + " " + d.amount + " " + d.active + " " + d.name);

        String[] names = new String[2];
        char[] codes = new char[1];
        System.out.println(names[0] + " " + (int) codes[0]);
    }
}`,
        },
        {
          type: "output",
          text: `0 0.0 false null
null 0`,
        },
        {
          type: "paragraph",
          text: "Adding `int local; System.out.println(local);` to `main` doesn't compile:",
        },
        {
          type: "output",
          text: `Defaults.java:16: error: variable local might not have been initialized
        System.out.println(local);
                           ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A frame's slots are not zeroed, so the language makes reading an unassigned local a compile error instead. Fields can be read before any assignment because the heap memory under them was zeroed on allocation.",
        },
        {
          type: "paragraph",
          text: "Example 3: the cost of boxing, measured with the same allocation counter. One million numbers as an `int[]` versus an `ArrayList<Integer>`:",
        },
        {
          type: "code",
          language: "java",
          title: "BoxingCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.List;

public class BoxingCost {
    public static void main(String[] args) {
        var mx = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        long id = Thread.currentThread().threadId();

        long before = mx.getThreadAllocatedBytes(id);
        int[] primitives = new int[1_000_000];
        for (int i = 0; i < primitives.length; i++) primitives[i] = i + 1_000;
        long arrayBytes = mx.getThreadAllocatedBytes(id) - before;

        before = mx.getThreadAllocatedBytes(id);
        List<Integer> boxed = new ArrayList<>(1_000_000);
        for (int i = 0; i < 1_000_000; i++) boxed.add(i + 1_000);   // above the cache: new Integer each time
        long listBytes = mx.getThreadAllocatedBytes(id) - before;

        System.out.printf("int[]              %,d bytes%n", arrayBytes);
        System.out.printf("ArrayList<Integer> %,d bytes%n", listBytes);
        System.out.println(primitives[999_999] + " " + boxed.get(999_999));
    }
}`,
        },
        {
          type: "output",
          text: `int[]              4,000,064 bytes
ArrayList<Integer> 20,000,376 bytes
1000999 1000999`,
        },
        {
          type: "paragraph",
          text: "Five times the memory for the same million numbers: 16 bytes per `Integer` object plus a 4-byte reference to it in the list's backing array, plus the `ArrayList` itself. The few hundred bytes on top of the round numbers are the measuring itself (the `MXBean` call allocates a little), and they were identical on three runs. The values start at 1,000 on purpose so none of them come from the -128..127 cache. When I hold large numeric datasets in memory, primitive arrays (or `IntStream`, or a primitive collections library) are the difference between fitting in the heap and not.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**Thinking `new` is expensive and `null`-ing everything to \"help\" the GC.** Allocation is a pointer bump, and setting a local to `null` right before the method returns does nothing, the frame is about to vanish anyway. What helps is not keeping references in long-lived places.",
            "**Comparing objects with `==`.** It works for small `Integer`s and literals because of the caches, then fails for `128` or for a `String` built at runtime. Use `equals`, or `Objects.equals` when either side can be `null`.",
            "**Unbounded static collections.** A `static Map` used as a cache, a registry of listeners that are added but never removed, a `ThreadLocal` in a pooled thread that's never cleared. All are GC roots holding objects forever. The production example below is exactly this.",
            "**Calling `System.gc()`.** It's a request, not a command, it usually triggers a full collection, and with `-XX:+DisableExplicitGC` it does nothing. If code needs it to work correctly, the code has a leak.",
            "**Assuming the heap is the only memory.** A JVM with `-Xmx2g` uses more than 2 GB: thread stacks, Metaspace, the code cache, GC structures, direct `ByteBuffer`s. In a 2 GB container, `-Xmx2g` gets the process killed by the OOM killer, with no Java exception at all.",
            "**Boxing in hot paths.** `Map<Long, Long>` counters in a loop allocate on every update above 127. Usually fine, sometimes the reason a GC log is busy.",
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
            "Write clear code first. Short-lived small objects are cheap and often removed entirely by escape analysis. Optimise allocation only after a profiler (JFR's allocation view, or async-profiler with `-e alloc`) shows it matters.",
            "Bound every cache. Use a `LinkedHashMap` with `removeEldestEntry` for something simple, or Caffeine with a maximum size and expiry for something real. A cache without an eviction policy is a memory leak with a nicer name.",
            "Prefer primitive arrays over boxed collections for large numeric data.",
            "Size collections when the size is known: `new ArrayList<>(n)`, `HashMap.newHashMap(n)` (Java 19+). It avoids the intermediate arrays thrown away by each resize.",
            "In containers, set the heap as a percentage: `-XX:MaxRAMPercentage=75` instead of a fixed `-Xmx`, and leave the remaining memory for stacks, Metaspace and native buffers.",
            "Always run production JVMs with `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/some/volume`. The dump taken at the moment of failure is the evidence, and it's gone after a restart.",
            "Clear `ThreadLocal`s in a `finally` block when the thread belongs to a pool.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The numbers from this lesson, in one place, measured on JDK 21 with G1:",
        },
        {
          type: "table",
          headers: ["Fact", "Number", "Consequence"],
          rows: [
            ["Smallest object", "16 bytes", "An `Integer` costs 4× its `int`"],
            ["Reference size", "4 bytes (compressed, heap < 32 GB)", "Past ~32 GB, every reference doubles"],
            ["Allocation fast path", "Pointer bump in the thread's TLAB, no lock", "Creating objects is not the bottleneck"],
            ["Escape analysis", "240 MB → 0 MB in my loop", "Short-lived local objects can be free"],
            ["Boxed vs primitive", "20 MB vs 4 MB for a million ints", "Large numeric data belongs in arrays"],
            ["Default max heap", "1/4 of RAM or of the container limit", "Almost always too small for a service; set `MaxRAMPercentage`"],
          ],
        },
        {
          type: "paragraph",
          text: "The cost model that matters: a young GC's work is proportional to the **live** objects it copies, not to how much was allocated. A service allocating 1 GB/s of request garbage that dies immediately can run smoothly; a service with a slowly growing old generation will eventually spend most of its time in GC, and then die. Allocation rate shows up as GC **frequency**, retention as GC **duration** and memory growth.",
        },
      ],
    },
    {
      title: "Memory Allocation in Production",
      blocks: [
        {
          type: "paragraph",
          text: "This is the leak I'd expect to find in a real backend: a fare-quote service that caches quotes in a `static HashMap` keyed by route. In development, with a handful of routes, it works perfectly. In production, the keys are effectively unique per request, and nothing ever removes an entry.",
        },
        {
          type: "code",
          language: "java",
          title: "FareCacheLeak.java",
          code: `import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

public class FareCacheLeak {
    record Quote(String routeKey, byte[] payload) {}

    // Looks like a harmless cache. Nothing ever removes from it, and it's static,
    // so every Quote stays reachable for the life of the JVM.
    static final Map<String, Quote> CACHE = new HashMap<>();

    // Same idea, capped: the eldest entry is dropped once it holds 1,000 quotes
    static final Map<String, Quote> BOUNDED = new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Quote> eldest) {
            return size() > 1_000;
        }
    };

    static Quote quote(Map<String, Quote> cache, long requestId) {
        String key = "route-" + requestId;            // every request is a new key
        return cache.computeIfAbsent(key, k -> new Quote(k, new byte[10_000]));
    }

    public static void main(String[] args) {
        Map<String, Quote> cache = args.length > 0 && args[0].equals("bounded") ? BOUNDED : CACHE;
        Runtime rt = Runtime.getRuntime();
        for (long req = 1; req <= 20_000; req++) {
            quote(cache, req);
            if (req % 5_000 == 0) {
                long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
                System.out.println("requests=" + req + " cached=" + cache.size() + " heapUsed~" + usedMb + " MB");
            }
        }
        System.out.println("done");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx64m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=leak.hprof FareCacheLeak
java -Xmx64m FareCacheLeak bounded`,
        },
        {
          type: "output",
          text: `requests=5000 cached=5000 heapUsed~52 MB
java.lang.OutOfMemoryError: Java heap space
Dumping heap to leak.hprof ...
Heap dump file created [69563216 bytes in 0.075 secs]

Exception: java.lang.OutOfMemoryError thrown from the UncaughtExceptionHandler in thread "main"

# bounded
requests=5000 cached=1000 heapUsed~21 MB
requests=10000 cached=1000 heapUsed~43 MB
requests=15000 cached=1000 heapUsed~35 MB
requests=20000 cached=1000 heapUsed~47 MB
done`,
        },
        {
          type: "list",
          items: [
            "The leaking version died somewhere between 5,000 and 10,000 requests: 5,000 quotes × ~10 KB is already 50 MB of a 64 MB heap. The heap dump (about 70 MB) was written before the JVM gave up, which is the file I'd open in Eclipse MAT or IntelliJ's profiler. Its \"dominator tree\" would show one `HashMap` retaining almost the whole heap, and the path to GC roots would end at the static field `FareCacheLeak.CACHE`.",
            "The odd last line is real and worth recognising: after the OOM, the default uncaught-exception handler tried to print the stack trace, which itself needs memory, and the full cache was still reachable, so it ran out again. In production logs a leak often looks this messy.",
            "The bounded version kept exactly 1,000 entries and finished. Its `heapUsed` goes up and down because `totalMemory - freeMemory` includes garbage that hasn't been collected yet: evicted quotes stay in the heap until the next GC. That's normal; what matters is that it doesn't keep growing.",
          ],
        },
        {
          type: "heading",
          text: "Heap sizing in containers",
        },
        {
          type: "paragraph",
          text: "Since Java 10 the JVM reads the container's memory limit instead of the host's RAM, and by default it takes **25%** of it for the heap. To see what a given limit produces without a container, I used `-XX:MaxRAM` to simulate one:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:MaxRAM=1g -XX:+PrintFlagsFinal -version | grep " MaxHeapSize "
java -XX:MaxRAM=1g -XX:MaxRAMPercentage=75 -XX:+PrintFlagsFinal -version | grep " MaxHeapSize "`,
        },
        {
          type: "output",
          text: `   size_t MaxHeapSize = 268435456      {product} {ergonomic}
   size_t MaxHeapSize = 805306368      {product} {ergonomic}`,
        },
        {
          type: "paragraph",
          text: "So a Spring Boot service in a 1 GB container gets a 256 MB heap unless I say otherwise, and three quarters of the memory I'm paying for sits unused. `-XX:MaxRAMPercentage=75` gives 768 MB and leaves 256 MB for thread stacks (200 Tomcat threads × 1 MB of reserved stack, though only touched pages count), Metaspace and native memory. 75% is a common starting point, not a law; a service with many threads or heavy off-heap buffers needs a lower percentage.",
        },
        {
          type: "heading",
          text: "The flags I'd put on every production JVM",
        },
        {
          type: "code",
          language: "bash",
          code: `java \\
  -XX:MaxRAMPercentage=75 \\
  -XX:+HeapDumpOnOutOfMemoryError \\
  -XX:HeapDumpPath=/dumps \\
  -XX:+ExitOnOutOfMemoryError \\
  -Xlog:gc*:file=/logs/gc.log:time,uptime:filecount=5,filesize=20m \\
  -jar app.jar`,
        },
        {
          type: "list",
          items: [
            "`ExitOnOutOfMemoryError`: after an OOM, threads may be dead and caches half-updated. Exiting lets the orchestrator restart a clean instance instead of serving errors from a zombie.",
            "The GC log is cheap and is the first thing I'd want when someone reports \"the service is slow every few minutes\".",
            "`/dumps` must be a volume that survives the container restart, or the dump disappears with it.",
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
              question: "Where are objects stored in Java?",
              answer:
                "On the heap, always: every object and every array, created with `new`, a literal, autoboxing or anything else. The variables that refer to them can be anywhere: a local reference lives in the method's stack frame, a field reference lives inside another object.\n\nThe nuance is escape analysis: the JIT can avoid creating an object that never leaves a method, replacing it with its fields. In my test, a loop creating ten million `Point` records allocated 0 MB by default and 240 MB with `-XX:-DoEscapeAnalysis`. But from the language's point of view, the object is on the heap.",
            },
            {
              question: "Where are local variables stored?",
              answer:
                "In the method's frame on the thread's stack. Each call gets its own frame, so each call gets its own copy of the locals, and they disappear when the method returns. A local primitive holds its value directly; a local reference holds a pointer to a heap object.\n\nThat's also why locals have no default value: the frame isn't zeroed, so `javac` refuses to compile a read of a local before it's assigned, with \"variable might not have been initialized\".",
            },
            {
              question: "What happens when you write `new`?",
              answer:
                "The JVM reserves space on the heap for the object, sets every field to its default value, writes the object header, then runs the constructor on it, and the expression evaluates to a reference to the new object.\n\nIn bytecode it's visibly two steps: `new` (allocate) and `invokespecial <init>` (construct), with a `dup` between them because both the constructor and the caller need the reference. So the object already exists, fully zeroed, before the constructor's first line.",
            },
            {
              question: "What are the default values of fields?",
              answer:
                "`0` for numeric types, `0.0` for `float` and `double`, `false` for `boolean`, `'\\u0000'` for `char`, and `null` for any reference. The same applies to array elements.\n\nThey all come from one thing: the JVM zeroes the object's memory when allocating it, and all of those values are zero bits. My `Defaults` example printed `0 0.0 false null`. Locals don't get defaults because they aren't heap memory.",
            },
            {
              question: "What is the garbage collector?",
              answer:
                "The part of the JVM that reclaims heap memory from objects that are no longer reachable. It starts from GC roots (live locals in every thread's frames, static fields and a few others) and follows references; anything it can't reach is garbage and its memory is reused.\n\nThe important consequence is that Java has no `free`. I can't release an object; I can only stop referencing it. A leak in Java is therefore an object that's still reachable but no longer needed, like entries in a static map nobody clears.",
            },
            {
              question: "What is the String pool?",
              answer:
                "A JVM-wide table of interned `String` objects, so every occurrence of the same literal refers to one object. Since Java 7 it lives on the heap.\n\nIn my `Pools` test, two `\"hello\"` literals were `==`, `new String(\"hello\")` was not, and `intern()` returned the pooled one again. It saves memory for repeated text, but it's not a reason to compare strings with `==`.",
            },
            {
              question: "Does Java have pointers?",
              answer:
                "It has references, which point to objects, but not pointers in the C sense: there's no pointer arithmetic, no way to get an object's address, and no way to free memory through one.\n\nUnderneath, a reference is an address (or with compressed oops, a 32-bit value the JVM shifts left by 3 to get the address). Keeping that hidden is what lets the GC move objects around during compaction and update every reference without the program noticing.",
            },
            {
              question: "What does `OutOfMemoryError: Java heap space` mean?",
              answer:
                "The JVM needed space for a new object, ran a garbage collection, and still couldn't find enough free heap, because everything there is still reachable. Either the heap is genuinely too small for the workload or something is holding objects it shouldn't, a leak.\n\nI reproduced it with a static `HashMap` cache that never evicts and a 64 MB heap: it died somewhere between 5,000 and 10,000 cached quotes of 10 KB each. `-XX:+HeapDumpOnOutOfMemoryError` wrote a dump at that moment, which is how I'd find what's holding the memory.",
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
              question: "Are primitives always stored on the stack?",
              answer:
                "No. A primitive is stored wherever its variable is declared. A local `int` is in the stack frame, but an `int` field is inside its object on the heap, and an `int[]` is an object full of ints on the heap. The type decides how many bytes, not where.\n\nA static primitive belongs to the class; in HotSpot static fields are stored in the class's `java.lang.Class` mirror object, which is also on the heap.",
            },
            {
              question: "How big is an object in Java?",
              answer:
                "Header plus fields, rounded up to 8 bytes. On a 64-bit JVM with the default compressed class pointers, the header is 12 bytes (8-byte mark word, 4-byte class pointer), and arrays add 4 bytes for the length.\n\nI measured it with the per-thread allocation counter: `new Object()` is 16 bytes, `new int[10]` is 56, a record with two ints is 24, and a record with a `long`, an `int` and a `String` reference is 32. Turning compression off made the last one 40.",
            },
            {
              question: "What is a TLAB?",
              answer:
                "A thread-local allocation buffer: a chunk of eden that one thread owns. Allocating inside it is a pointer bump, compare and increment, with no lock or atomic operation, because no other thread allocates there.\n\nWhen it runs out, the thread gets a new TLAB from eden, which is the slow path that may trigger a young GC. That's why `new` for a small object costs about as much as a few arithmetic operations. `UseTLAB` is on by default; I checked with `-XX:+PrintFlagsFinal`.",
            },
            {
              question: "What is Metaspace, and how is it different from PermGen?",
              answer:
                "Metaspace is where HotSpot keeps class metadata: field layouts, method bytecode, the run-time constant pool. It's in native memory, outside the Java heap, and was introduced in Java 8 to replace PermGen, which was a fixed-size part of the heap.\n\nThe practical difference: PermGen had a small fixed cap, so apps that loaded many classes (or redeployed in an app server) hit `OutOfMemoryError: PermGen space`. Metaspace grows by default without a cap (`MaxMetaspaceSize` is unlimited unless set), and interned strings and static field values moved to the heap.",
            },
            {
              question: "Why does `Integer a = 127, b = 127; a == b` give true but 128 gives false?",
              answer:
                "Autoboxing calls `Integer.valueOf`, which returns cached instances for -128 to 127. Both 127s are the same cached object, so `==` (reference comparison) is true. 128 is outside the cache, so each boxing allocates a new `Integer`, and two different objects aren't `==`.\n\nMy `Pools` program printed exactly `true` and `false`. The upper bound can be raised with `-XX:AutoBoxCacheMax`, which makes the behaviour configuration-dependent too. The fix is always `equals`.",
            },
            {
              question: "What is escape analysis?",
              answer:
                "A C2 JIT optimisation that checks whether an object can escape the method creating it: be returned, stored in a field or passed to code it can't inline. If it can't escape, the JIT can replace the object with its individual fields as locals (scalar replacement) and never allocate it, and it can drop locking on it.\n\nI saw the effect directly: ten million `new Point(x, y)` in a hot loop allocated 0 MB with the default flags, and 240 MB, exactly 10 million × 24 bytes, with `-XX:-DoEscapeAnalysis` or in interpreter-only mode.",
            },
            {
              question: "What are compressed oops?",
              answer:
                "Ordinary object pointers stored as 32-bit values instead of 64-bit. Objects are 8-byte aligned, so the JVM stores the address divided by 8 and multiplies it back on use, which covers 32 GB of heap. It's on by default for heaps under about 32 GB.\n\nIt halves the size of every reference field and object array element. In my tests, turning it off made a `Product` record 40 bytes instead of 32. It's also why crossing the 32 GB mark can shrink usable heap: the same objects suddenly need more bytes.",
            },
            {
              question: "Can you force garbage collection?",
              answer:
                "No. `System.gc()` and `Runtime.gc()` are requests. HotSpot usually honours them with a full collection, but `-XX:+DisableExplicitGC` turns them into no-ops, and the specification doesn't promise anything.\n\nIn production I'd treat a `System.gc()` call as a smell: it causes a stop-the-world full GC at a moment the collector didn't choose. If the program is only correct when it runs, the program has a leak.",
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
              question: "Walk through exactly what the JVM does for `new Order(5)`.",
              answer:
                "The `new` instruction resolves the class reference in the constant pool, loading and initialising `Order` if this is the first use. The object's size is already known from the field layout. The thread tries to bump-allocate that many bytes in its TLAB; if it can't, it gets a new TLAB from eden, possibly after a young GC, and large objects may go straight to the old generation or, in G1, to humongous regions. The fields are zeroed, the mark word and class pointer are written, and the reference is pushed.\n\nThen `dup` and the argument are pushed and `invokespecial Order.<init>(I)V` runs the constructor in a new frame with `this` in slot 0, assigning `quantity = 5`. Finally `astore` puts the reference into the caller's local slot. With escape analysis, C2 may skip all of this if the object never escapes.",
            },
            {
              question: "Explain the object header on a 64-bit HotSpot JVM.",
              answer:
                "Two parts. The mark word, 8 bytes, holds the identity hash code once it's computed, the GC age (how many young collections the object survived), and lock state; when an object is locked, the mark word changes to point at lock information. Then the class pointer, 4 bytes with compressed class pointers or 8 without, pointing to the class metadata in Metaspace. Arrays add a 4-byte length.\n\nI confirmed it with `Unsafe.objectFieldOffset`: the first field of a class landed at offset 12, and `int[]` data started at offset 16, or 24 with compressed pointers off. Project Lilliput (experimental compact headers in JDK 24) shrinks the header to 8 bytes.",
            },
            {
              question: "Does the JVM keep fields in declaration order?",
              answer:
                "No. The layout is up to the JVM, and HotSpot packs fields to minimise padding: generally larger fields first, with smaller fields used to fill gaps. The JLS doesn't guarantee any order.\n\nFor `class Product { long id; int stock; String name; }` I read the offsets back: `stock` at 12, `id` at 16, `name` at 24. The `int` moved ahead of the `long` to fill the 4 bytes after the 12-byte header. That's why tools like JOL exist; reasoning about layout from the source is unreliable.",
            },
            {
              question: "What's the difference between allocation rate and retention, and how does each show up?",
              answer:
                "Allocation rate is how many bytes per second the program creates. Retention is how much of that stays reachable. A generational GC copies only live objects, so a high allocation rate of short-lived garbage mostly shows up as frequent but short young collections. Retention shows up as a growing old generation, longer and more frequent mixed or full collections, and eventually `OutOfMemoryError`.\n\nSo a service creating lots of per-request objects is normal. One whose heap-after-GC keeps rising over hours has a retention problem, and I'd look at a heap dump's dominator tree to find what's holding it.",
            },
            {
              question: "What is a humongous object in G1?",
              answer:
                "An object at least half the size of a G1 region. It isn't allocated in a TLAB or in eden; it gets one or more contiguous regions of its own, directly in the old generation area.\n\nThat matters because humongous allocations can fragment the heap and are reclaimed differently, so a service allocating many large `byte[]` buffers (big JSON payloads, file uploads read into memory) can trigger GCs and even OOMs with plenty of free space overall. The fixes are streaming instead of buffering, or a larger `-XX:G1HeapRegionSize`. `jcmd <pid> GC.heap_info` showed a 1 MB region size for a 128 MB heap, so a 1 MB `byte[]` there would be humongous.",
            },
            {
              question: "Why does a JVM with `-Xmx1g` use more than 1 GB of memory?",
              answer:
                "`-Xmx` only caps the Java heap. The process also has Metaspace for class metadata, the code cache for JIT-compiled code, a stack per thread (1 MB reserved each by default), GC data structures, direct `ByteBuffer`s used by Netty and NIO, and the JVM's own native allocations.\n\nIn containers this matters a lot: with the limit equal to `-Xmx`, the container is OOM-killed by the kernel and there's no Java exception or heap dump at all. Native Memory Tracking (`-XX:NativeMemoryTracking=summary` and `jcmd <pid> VM.native_memory`) shows the breakdown.",
            },
            {
              question: "How does the JVM decide the default heap size?",
              answer:
                "By ergonomics: on a server-class machine the initial heap is 1/64 of physical memory and the maximum is 1/4 (`MaxRAMPercentage=25`). Since Java 10, \"physical memory\" means the container's limit when there is one.\n\nOn my 15 GB laptop that gave 240 MB initial and 3.74 GB max. Simulating a 1 GB container with `-XX:MaxRAM=1g` gave 256 MB max, and adding `-XX:MaxRAMPercentage=75` gave 768 MB. That's why I set the percentage explicitly in containers instead of relying on defaults.",
            },
            {
              question: "How do references in Java differ from C pointers, from the GC's perspective?",
              answer:
                "The GC knows where every reference is: in each frame it has maps of which slots hold references (computed at safepoints), and every object's layout says which fields are references. That lets a moving collector copy objects and rewrite every reference to them. C pointers can be hidden in integers or computed with arithmetic, so a C collector can only be conservative and can't move objects.\n\nThat precision is what makes bump-pointer allocation possible in the first place: compacting collectors keep free space contiguous, so allocation can just bump a pointer, instead of searching free lists as `malloc` does.",
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
              question: "A service's heap usage grows steadily over days and it eventually dies with OutOfMemoryError. How do you investigate?",
              answer:
                "First I make sure the next failure leaves evidence: `-XX:+HeapDumpOnOutOfMemoryError` with a path on a persistent volume, and GC logging. If I can't wait, `jcmd <pid> GC.heap_dump /dumps/live.hprof` takes one from the running process, and two dumps a few hours apart make growth obvious. `jcmd <pid> GC.class_histogram` is a quicker first look at which classes have the most instances.\n\nThen in Eclipse MAT I open the dominator tree: what retains the most memory, and the path from it to a GC root. In my `FareCacheLeak` reproduction it would be one `HashMap` held by the static field `CACHE`. The usual suspects are unbounded caches, maps keyed by request or session id, listeners never unregistered, and `ThreadLocal`s on pooled threads.",
            },
            {
              question: "A container keeps getting killed (exit code 137) but there's no OutOfMemoryError in the logs. What's happening?",
              answer:
                "Exit code 137 is SIGKILL, usually the kernel's OOM killer enforcing the container's memory limit. The JVM didn't run out of heap; the whole process went over the limit, and a killed process can't log anything.\n\nThe typical cause is `-Xmx` set too close to the container limit, ignoring Metaspace, thread stacks, the code cache and direct buffers. I'd switch to `-XX:MaxRAMPercentage` around 70–75%, then use Native Memory Tracking to see where the non-heap memory goes if that isn't enough.",
            },
            {
              question: "A teammate wants to replace small value objects in a hot path with primitives \"to avoid allocation\". What do you say?",
              answer:
                "Measure first. If the objects don't escape the method, C2 often eliminates them completely; my `Point` loop allocated 0 MB with escape analysis on. And even when they are allocated, short-lived objects are cheap: a TLAB bump to create and nothing to collect, since the young GC only touches survivors.\n\nI'd run the code with JFR or async-profiler in allocation mode and only change it if those objects show up near the top. Where it does matter is large, long-lived data: a million boxed `Integer`s took 20 MB in my test versus 4 MB as an `int[]`.",
            },
            {
              question: "Code compares two Long user ids with ==. Tests pass, production sometimes says two equal ids are different. Explain.",
              answer:
                "`Long` is boxed, and `==` compares references. `Long.valueOf` caches -128 to 127, so test data with small ids gets the same cached objects and `==` happens to be true. Real ids are bigger, each one is a separate `Long` object, and `==` is false even when the values are equal.\n\nThe fix is `equals`, or `Objects.equals` for nullable values, or unboxing to `long` where `null` isn't possible. Static analysis (IntelliJ, SpotBugs, Error Prone) flags reference comparison of boxed types, which is how I'd keep it from coming back.",
            },
            {
              question: "After moving a service from a 24 GB heap to a 40 GB heap, the team expected far more headroom but got much less than 16 GB extra. Why?",
              answer:
                "Above roughly 32 GB the JVM can't use compressed oops, so every reference goes from 4 to 8 bytes, and compressed class pointers alone don't save the object fields. A heap full of reference-heavy objects (maps, lists, entity graphs) grows substantially when it switches.\n\nThe usual advice is to stay below ~31 GB with compressed oops, or jump well beyond, to something like 48 GB or more, so the extra space outweighs the larger references. I'd verify with `-XX:+PrintFlagsFinal | grep UseCompressedOops` after changing the size.",
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
            "Write a class `Order` with an `int quantity`, a `double price`, a `boolean paid` and a `String customer`. Create one with `new Order()` and print every field without assigning anything.",
            "In `main`, declare `int total;` and try to print it. Read the compile error, then explain in a comment why fields have defaults and locals don't.",
            "Copy `AllocSize` and add `new Order()` to it. Predict its size before running: header 12, then the fields, rounded to 8. Then run it.",
            "Compare `Integer x = 100, y = 100;` and `Integer p = 1000, q = 1000;` with `==` and with `equals`. Predict all four results first.",
            "Run `FareCacheLeak` with `-Xmx64m`, then change the bounded cache's limit to 5,000 and run `bounded` again with `-Xmx64m`. Does it still finish? Why or why not?",
            "Run `java -XX:+PrintFlagsFinal -version | grep -E \" (MaxHeapSize|InitialHeapSize|UseCompressedOops) \"` on your machine and work out what fraction of your RAM each heap value is.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `0 0.0 false null`. Step 2 fails with \"variable total might not have been initialized\". In step 3, `Order` is 12 + 8 (`double`) + 4 (`int`) + 1 (`boolean`) + 4 (reference) = 29, rounded to 32 bytes. Step 4 gives `true`, `true`, `false`, `true`. In step 5 it still finished for me, but `heapUsed` climbed to about 62 MB of 64: 5,000 quotes of ~10 KB is ~50 MB of live data, so almost nothing is left over. On my machine 6,000 still squeezed through and 7,000 died with the same `OutOfMemoryError` as the leak. A bound has to fit the heap, not just exist. Step 6 should show roughly 1/64 and 1/4 of your RAM.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHERE     objects, arrays, string pool      → heap (shared, GC'd)
          locals (values and references)    → stack frame (per thread)
          fields                            → inside their object
          class metadata, bytecode          → Metaspace (native)

new       new (allocate) + dup + invokespecial <init> (construct)
          resolve class → size known → TLAB bump → zero → header → ctor

SIZE      header 12 B (mark 8 + class ptr 4), arrays +4 length
          rounded to 8:  Object 16 · int[10] 56 · Integer 16
          compressed oops: 4-byte references under ~32 GB heap

DEFAULTS  fields/array elements zeroed: 0, 0.0, false, null
          locals: none → compile error if read unassigned

FREE      nobody: GC reclaims what no root can reach
          leak = still reachable, no longer needed

POOLS     "literal" == "literal"   Integer cache -128..127
          use equals(), never ==

JIT       escape analysis: non-escaping objects may never exist

FLAGS     -Xmx / -XX:MaxRAMPercentage=75   -Xss
          -XX:+HeapDumpOnOutOfMemoryError  -XX:+ExitOnOutOfMemoryError`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Objects are always on the heap; variables are wherever they're declared. Most \"stack or heap?\" confusion comes from mixing those up.",
            "Allocating is cheap, retaining is expensive. Leaks in Java are references that live too long, usually in something `static`.",
            "The next lesson puts the stack and the heap side by side: per-thread versus shared, lifetimes, the two errors, and what virtual threads changed.",
          ],
        },
      ],
    },
  ],
};
