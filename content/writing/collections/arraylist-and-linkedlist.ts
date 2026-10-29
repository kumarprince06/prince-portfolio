import type { Lesson } from "../types";

export const arrayListAndLinkedList: Lesson = {
  slug: "arraylist-and-linkedlist",
  date: "2026-10-29",
  title: "ArrayList and LinkedList",
  description:
    "How Java's two main List implementations really work: ArrayList's backing array, lazy default capacity and 1.5x growth, LinkedList's doubly linked nodes, and what add, get and remove actually cost, traced with javap and reflection on JDK 21.",
  tags: ["Collections", "Core Java", "Data Structures", "ArrayList", "LinkedList"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a row of numbered seats in a cinema. If I want seat 3, I walk straight to seat 3. That's an **`ArrayList`**: every item has a number (its index), so getting item 3 is instant. But if the person in seat 1 leaves, everyone after them shuffles one seat left to fill the gap.",
        },
        {
          type: "paragraph",
          text: "Now think of a group of friends walking in a line, each holding the hand of the person in front and behind. Someone can join or leave by just letting go and holding a new hand, nobody else moves. That's a **`LinkedList`**. The catch: to find the fifth friend, I have to start at the front and count hands one by one.",
        },
        {
          type: "paragraph",
          text: "Both are lists, so I use them the same way: `add`, `get`, `remove`. In real code I pick `ArrayList` almost every time, because jumping straight to a position is what most programs need.",
        },
        {
          type: "code",
          language: "java",
          code: `List<String> seats = new ArrayList<>();
seats.add("Amit");
seats.add("Bina");
seats.add("Chirag");
System.out.println(seats.get(1));   // jump straight to seat 1
seats.remove("Amit");               // the rest shift left
System.out.println(seats);`,
        },
        {
          type: "output",
          text: `Bina
[Bina, Chirag]`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "`ArrayList` is my default list; I only reach for something else when I can prove I need it.",
        },
      ],
    },
    {
      title: "What ArrayList and LinkedList Are",
      blocks: [
        {
          type: "paragraph",
          text: "Picture two ways to keep a row of books. The first is a bookshelf with numbered slots. Finding book number 7 is instant, I just look at slot 7. But if I pull out book 2, every book after it slides one slot left to close the gap, and when the shelf is full I have to buy a bigger shelf and move everything across.",
        },
        {
          type: "paragraph",
          text: "The second is a train. Each coach is coupled to the one in front and the one behind. Adding or removing a coach only means uncoupling and recoupling its neighbours, nothing else moves. But to reach coach 7, I have to walk through coaches 1 to 6 first, because there's no slot number to jump to.",
        },
        {
          type: "paragraph",
          text: "That's the whole difference. **`ArrayList`** is the shelf: a `List` backed by an array that it resizes for me. **`LinkedList`** is the train: a `List` made of separate node objects, each holding an element plus links to the previous and next node. Both implement `List`, so the code that uses them looks identical. What changes is the cost of each operation, and that's what this lesson measures.",
        },
        {
          type: "paragraph",
          text: "Spoiler, so the rest reads in the right light: `ArrayList` is the right default almost always. `LinkedList` wins far less often than textbooks suggest, and when I need a queue or a stack, `ArrayDeque` usually beats both.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 already had a growable array, `Vector`, with every method `synchronized`. When the Collections Framework arrived in Java 1.2 (1998), `ArrayList` was added as the same idea without the locking, and `LinkedList` arrived alongside it as the classic linked alternative.",
        },
        {
          type: "paragraph",
          text: "Both kept evolving. In Java 6, `LinkedList` was made to implement the new `Deque` interface, so it became a queue and a stack too. During the Java 7 update releases (7u40), `ArrayList`'s no-argument constructor stopped allocating a 10-slot array up front and started sharing one empty array until the first `add`, because huge numbers of lists in real programs are created and never filled. In Java 21, both picked up `getFirst`, `getLast` and `reversed()` from `SequencedCollection`.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I stick with the bookshelf and the train, and add one detail to each:",
        },
        {
          type: "list",
          items: [
            "**The shelf has spare slots.** When I buy a shelf, I buy one with room to grow. `size` is how many books are on it, **capacity** is how many slots it has. When the last slot fills, I buy a shelf about one and a half times bigger and move every book over. Moving is slow, but it happens rarely, so on average adding a book stays cheap.",
            "**The train has a driver's cabin at each end.** `LinkedList` remembers its `first` and `last` coach. Adding or removing at either end is instant. Anything in the middle means walking from the nearer end, coach by coach.",
            "**Pulling a book from the middle of the shelf** makes everything after it shift. **Removing a coach from the middle of the train** is instant, but only once I'm standing next to it, and getting there is the slow part.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "ArrayList in memory",
        },
        {
          type: "diagram",
          text: `ArrayList object
┌──────────────────────┐
│ size        = 4      │
│ modCount    = 4      │
│ elementData ─────────┼──► Object[] (capacity 10)
└──────────────────────┘    ┌───┬───┬───┬───┬────┬────┬────┬────┬────┬────┐
                            │ ● │ ● │ ● │ ● │null│null│null│null│null│null│
                            └─┼─┴─┼─┴─┼─┴─┼─┴────┴────┴────┴────┴────┴────┘
                              ▼   ▼   ▼   ▼
                            "A"  "B" "C" "D"     (the objects live elsewhere on the heap)`,
          caption:
            "One object, one array of references. Index i is just elementData[i], so get(i) is a single array read.",
        },
        {
          type: "heading",
          text: "LinkedList in memory",
        },
        {
          type: "diagram",
          text: `LinkedList object
┌────────────────┐
│ size  = 3      │
│ first ─────────┼──┐
│ last  ─────────┼──┼──────────────────────────────────┐
└────────────────┘  ▼                                  ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   null ◄───┤ prev         │◄───┤ prev         │◄───┤ prev         │
            │ item "Engine"│    │ item "S1"    │    │ item "AC1"   │
            │ next         ├───►│ next         ├───►│ next         ├───► null
            └──────────────┘    └──────────────┘    └──────────────┘`,
          caption:
            "Every element gets its own Node object with two links. To reach index i, the list follows links from first or last.",
        },
        {
          type: "heading",
          text: "The interfaces each one implements",
        },
        {
          type: "table",
          headers: ["", "ArrayList", "LinkedList"],
          rows: [
            ["Extends", "`AbstractList`", "`AbstractSequentialList`"],
            ["`List`", "Yes", "Yes"],
            ["`RandomAccess` (fast index)", "Yes", "No"],
            ["`Deque` (queue and stack)", "No", "Yes"],
            ["Allows `null` and duplicates", "Yes", "Yes"],
            ["Thread-safe", "No", "No"],
          ],
        },
        {
          type: "paragraph",
          text: "Both are ordered by position, both allow duplicates and `null`, and neither is thread-safe. The difference is entirely in the structure underneath.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/collections/linkedlist-nodes.svg",
          alt: "Four LinkedList nodes with prev, item and next fields, first and last pointers, and get(i) starting from the nearer end.",
          caption: "A `LinkedList` is a chain of nodes; `get(i)` starts from `first` or `last`, whichever is nearer.",
        },
        {
          type: "image",
          src: "/images/collections/arraylist-growth.svg",
          alt: "ArrayList backing array full at capacity 10 being copied into a new array of 15, and remove(2) shifting later elements one slot left.",
          caption: "When `elementData` is full, `ArrayList` copies into an array **1.5×** bigger; `remove(index)` shifts every later element left.",
        },
        {
          type: "paragraph",
          text: "The JDK source zip isn't installed on my machine, so everything here comes from two kinds of evidence: `javap -p` and `javap -c` on the real JDK 21 classes, and reflection to read private fields of live objects. Reading `java.util` internals needs `--add-opens java.base/java.util=ALL-UNNAMED`, otherwise the module system blocks it:",
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.reflect.InaccessibleObjectException: Unable to make field protected transient int java.util.AbstractList.modCount accessible: module java.base does not "opens java.util" to unnamed module ...`,
        },
        {
          type: "heading",
          text: "ArrayList's fields",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p java.util.ArrayList",
        },
        {
          type: "output",
          text: `public class java.util.ArrayList<E> extends java.util.AbstractList<E> implements java.util.List<E>, java.util.RandomAccess, java.lang.Cloneable, java.io.Serializable {
  private static final long serialVersionUID;
  private static final int DEFAULT_CAPACITY;
  private static final java.lang.Object[] EMPTY_ELEMENTDATA;
  private static final java.lang.Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA;
  transient java.lang.Object[] elementData;
  private int size;
  ...
  public void trimToSize();
  public void ensureCapacity(int);
  private java.lang.Object[] grow(int);
  private java.lang.Object[] grow();
  ...
  private void fastRemove(java.lang.Object[], int);
  ...`,
        },
        {
          type: "list",
          items: [
            "`elementData` is the backing array. It's `Object[]`, not `E[]`, because of type erasure, which is why `get` needs a cast that `javac` adds for me.",
            "`size` is how many elements are in use. The array's length is the capacity. They are different numbers most of the time.",
            "There are two shared empty arrays. `DEFAULTCAPACITY_EMPTY_ELEMENTDATA` marks \"created with `new ArrayList<>()`, grow to 10 on first add\". `EMPTY_ELEMENTDATA` marks \"created with an explicit capacity of 0\", which grows more slowly. The trace below shows the difference.",
            "`elementData` is `transient`: Java serialization skips the array and `writeObject` writes only the `size` live elements, not the empty slots.",
            "`modCount` isn't listed because it's inherited from `AbstractList`.",
          ],
        },
        {
          type: "heading",
          text: "Watching the capacity grow",
        },
        {
          type: "paragraph",
          text: "I read `elementData.length` with reflection after every `add`, and printed a line only when it changed:",
        },
        {
          type: "code",
          language: "java",
          title: "Capacity.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayList;

public class Capacity {
    static int capacity(ArrayList<?> list) throws Exception {
        Field f = ArrayList.class.getDeclaredField("elementData");
        f.setAccessible(true);
        return ((Object[]) f.get(list)).length;
    }

    public static void main(String[] args) throws Exception {
        ArrayList<Integer> list = new ArrayList<>();
        System.out.println("new ArrayList<>()  size 0, capacity " + capacity(list));
        int last = capacity(list);
        for (int i = 1; i <= 100; i++) {
            list.add(i);
            int cap = capacity(list);
            if (cap != last) {
                System.out.println("add #" + i + "  ->  capacity " + last + " -> " + cap);
                last = cap;
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util=ALL-UNNAMED Capacity",
        },
        {
          type: "output",
          text: `new ArrayList<>()  size 0, capacity 0
add #1  ->  capacity 0 -> 10
add #11  ->  capacity 10 -> 15
add #16  ->  capacity 15 -> 22
add #23  ->  capacity 22 -> 33
add #34  ->  capacity 33 -> 49
add #50  ->  capacity 49 -> 73
add #74  ->  capacity 73 -> 109`,
        },
        {
          type: "list",
          items: [
            "A fresh `new ArrayList<>()` has capacity **0**, not 10. The 10-slot array is allocated lazily, on the first `add`. Many interview answers still say \"default capacity 10\" without this detail.",
            "After that, each growth is old + old/2: 10 to 15, 15 to 22 (15 + 7), 22 to 33, 33 to 49. That's the \"1.5x\", done with a right shift, so it rounds down.",
            "Growth happened only 7 times in 100 adds. Each growth copies every element, but because the array grows by a fraction of its size, the total copying stays proportional to n. That's what **amortized O(1)** means for `add` at the end.",
          ],
        },
        {
          type: "heading",
          text: "The grow method, in bytecode",
        },
        {
          type: "paragraph",
          text: "To confirm the formula rather than guess it from numbers, I disassembled `grow(int)`:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.ArrayList",
        },
        {
          type: "output",
          text: `  private java.lang.Object[] grow(int);
    Code:
       0: aload_0
       1: getfield      #9     // Field elementData:[Ljava/lang/Object;
       4: arraylength
       5: istore_2                                   // oldCapacity
       6: iload_2
       7: ifgt          20                           // old > 0: normal growth
      10: aload_0
      11: getfield      #9     // Field elementData:[Ljava/lang/Object;
      14: getstatic     #39    // Field DEFAULTCAPACITY_EMPTY_ELEMENTDATA:[Ljava/lang/Object;
      17: if_acmpeq     45                           // the lazy default case
      20: iload_2
      21: iload_1
      22: iload_2
      23: isub                                       // minGrowth = minCapacity - old
      24: iload_2
      25: iconst_1
      26: ishr                                       // prefGrowth = old >> 1
      27: invokestatic  #73    // Method jdk/internal/util/ArraysSupport.newLength:(III)I
      30: istore_3
      31: aload_0
      32: aload_0
      33: getfield      #9     // Field elementData:[Ljava/lang/Object;
      36: iload_3
      37: invokestatic  #66    // Method java/util/Arrays.copyOf:([Ljava/lang/Object;I)[Ljava/lang/Object;
      40: dup_x1
      41: putfield      #9     // Field elementData:[Ljava/lang/Object;
      44: areturn
      45: aload_0
      46: bipush        10                           // DEFAULT_CAPACITY
      48: iload_1
      49: invokestatic  #79    // Method java/lang/Math.max:(II)I
      52: anewarray     #7     // class java/lang/Object
      55: dup_x1
      56: putfield      #9     // Field elementData:[Ljava/lang/Object;
      59: areturn`,
        },
        {
          type: "paragraph",
          text: "(The `//` notes on the right are mine.) Translated back into Java, it reads like this:",
        },
        {
          type: "code",
          language: "java",
          title: "grow(minCapacity), reconstructed from the bytecode",
          code: `Object[] grow(int minCapacity) {
    int oldCapacity = elementData.length;
    if (oldCapacity > 0 || elementData != DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        int newCapacity = ArraysSupport.newLength(oldCapacity,
                minCapacity - oldCapacity,      // the least it must grow
                oldCapacity >> 1);              // the growth it prefers: half
        return elementData = Arrays.copyOf(elementData, newCapacity);
    }
    return elementData = new Object[Math.max(DEFAULT_CAPACITY, minCapacity)];
}`,
        },
        {
          type: "paragraph",
          text: "`ArraysSupport.newLength` returns the old length plus the larger of the two growths, with overflow checks near `Integer.MAX_VALUE`. `Arrays.copyOf` allocates the new array and copies the references across (it's backed by the native `System.arraycopy`). The old array becomes garbage.",
        },
        {
          type: "heading",
          text: "add(E): the fast path",
        },
        {
          type: "output",
          text: `  public boolean add(E);
       0: aload_0
       1: dup
       2: getfield      #63    // Field modCount:I
       5: iconst_1
       6: iadd
       7: putfield      #63    // Field modCount:I
      10: aload_0
      11: aload_1
      12: aload_0
      13: getfield      #9     // Field elementData:[Ljava/lang/Object;
      16: aload_0
      17: getfield      #48    // Field size:I
      20: invokevirtual #131   // Method add:(Ljava/lang/Object;[Ljava/lang/Object;I)V
      23: iconst_1
      24: ireturn

  private void add(E, java.lang.Object[], int);
       0: iload_3
       1: aload_2
       2: arraylength
       3: if_icmpne     11     // size == length? then grow
       6: aload_0
       7: invokevirtual #129   // Method grow:()[Ljava/lang/Object;
      10: astore_2
      11: aload_2
      12: iload_3
      13: aload_1
      14: aastore              // elementData[size] = e
      15: aload_0
      16: iload_3
      17: iconst_1
      18: iadd
      19: putfield      #48    // Field size:I
      22: return`,
        },
        {
          type: "paragraph",
          text: "`add` bumps `modCount`, then calls a tiny private helper. The helper grows only if the array is full, stores the reference, and increments `size`. The JDK splits it this way on purpose: the public method stays small enough for the JIT to inline, and the rare grow path is out of the way. `add` always returns `true`, because a list always accepts the element.",
        },
        {
          type: "heading",
          text: "Removing from the middle: System.arraycopy",
        },
        {
          type: "paragraph",
          text: "`remove(index)` and `remove(Object)` both end in `fastRemove`:",
        },
        {
          type: "output",
          text: `  private void fastRemove(java.lang.Object[], int);
       0: aload_0
       1: dup
       2: getfield      #63    // Field modCount:I
       5: iconst_1
       6: iadd
       7: putfield      #63    // Field modCount:I
      10: aload_0
      11: getfield      #48    // Field size:I
      14: iconst_1
      15: isub
      16: dup
      17: istore_3                                   // newSize = size - 1
      18: iload_2
      19: if_icmple     34                           // removing the last one? skip the copy
      22: aload_1
      23: iload_2
      24: iconst_1
      25: iadd
      26: aload_1
      27: iload_2
      28: iload_3
      29: iload_2
      30: isub
      31: invokestatic  #112   // Method java/lang/System.arraycopy:(Ljava/lang/Object;ILjava/lang/Object;II)V
      34: aload_1
      35: aload_0
      36: iload_3
      37: dup_x1
      38: putfield      #48    // Field size:I
      41: aconst_null
      42: aastore                                    // es[newSize] = null
      43: return`,
        },
        {
          type: "paragraph",
          text: "That's `System.arraycopy(es, i + 1, es, i, newSize - i)`: shift everything after `i` one slot left, then null out the old last slot so the garbage collector can reclaim the object it pointed to. I watched it happen on the raw array:",
        },
        {
          type: "code",
          language: "java",
          title: "RemoveShift.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class RemoveShift {
    static Object[] raw(ArrayList<?> list) throws Exception {
        Field f = ArrayList.class.getDeclaredField("elementData");
        f.setAccessible(true);
        return (Object[]) f.get(list);
    }

    public static void main(String[] args) throws Exception {
        ArrayList<String> coaches = new ArrayList<>(List.of("A", "B", "C", "D", "E"));
        coaches.ensureCapacity(8);
        System.out.println("start       " + Arrays.toString(raw(coaches)));
        coaches.remove(1);
        System.out.println("remove(1)   " + Arrays.toString(raw(coaches)));
        coaches.add(0, "Z");
        System.out.println("add(0, Z)   " + Arrays.toString(raw(coaches)));
        System.out.println("size " + coaches.size() + ", list " + coaches);
    }
}`,
        },
        {
          type: "output",
          text: `start       [A, B, C, D, E, null, null, null]
remove(1)   [A, C, D, E, null, null, null, null]
add(0, Z)   [Z, A, C, D, E, null, null, null]
size 5, list [Z, A, C, D, E]`,
        },
        {
          type: "paragraph",
          text: "`remove(1)` slid C, D and E left and cleared slot 4. `add(0, \"Z\")` did the opposite: its bytecode calls `System.arraycopy(es, index, es, index + 1, s - index)` to slide everything right, then writes into the gap. So both operations cost one shift of `size - index` references. At the end of the list that's zero, at the front it's all of them.",
        },
        {
          type: "heading",
          text: "Other constructors, trimToSize and ensureCapacity",
        },
        {
          type: "code",
          language: "java",
          title: "ZeroStart.java (main body, capacity() as in Capacity.java)",
          code: `ArrayList<Integer> zero = new ArrayList<>(0);
StringBuilder caps = new StringBuilder();
for (int i = 0; i < 8; i++) {
    zero.add(i);
    caps.append(capacity(zero)).append(' ');
}
System.out.println("new ArrayList<>(0), after each add: " + caps);

ArrayList<Integer> sized = new ArrayList<>(500);
System.out.println("new ArrayList<>(500): capacity " + capacity(sized) + ", size " + sized.size());

ArrayList<Integer> copy = new ArrayList<>(List.of(1, 2, 3));
System.out.println("copy of 3 elements: capacity " + capacity(copy));

ArrayList<Integer> list = new ArrayList<>();
for (int i = 0; i < 11; i++) list.add(i);
System.out.println("11 elements: capacity " + capacity(list));
list.trimToSize();
System.out.println("after trimToSize: capacity " + capacity(list));
list.ensureCapacity(1000);
System.out.println("after ensureCapacity(1000): capacity " + capacity(list));`,
        },
        {
          type: "output",
          text: `new ArrayList<>(0), after each add: 1 2 3 4 6 6 9 9
new ArrayList<>(500): capacity 500, size 0
copy of 3 elements: capacity 3
11 elements: capacity 15
after trimToSize: capacity 11
after ensureCapacity(1000): capacity 1000`,
        },
        {
          type: "list",
          items: [
            "`new ArrayList<>(0)` uses `EMPTY_ELEMENTDATA`, so the `DEFAULTCAPACITY` shortcut to 10 doesn't apply. It grows from 0 by \"at least 1, preferably half\": 1, 2, 3, 4, 6, 9. Lots of tiny copies early on.",
            "`new ArrayList<>(500)` allocates all 500 slots immediately, but `size` is still 0. Capacity is room, not content: `get(0)` would throw.",
            "Copying a collection makes the array exactly as big as the source. The first `add` afterwards will grow it.",
            "`trimToSize()` shrinks the array to `size` (15 to 11), useful for a big list that won't change again.",
            "`ensureCapacity(1000)` grows straight to 1000 instead of going through 16, 24, 36 and so on. Use it before a known large batch of adds.",
          ],
        },
        {
          type: "heading",
          text: "modCount: how a list notices it changed",
        },
        {
          type: "paragraph",
          text: "`modCount` counts **structural** changes, the ones that change the size or the backing array:",
        },
        {
          type: "code",
          language: "java",
          title: "ModCount.java",
          code: `import java.lang.reflect.Field;
import java.util.*;

public class ModCount {
    static int modCount(List<?> list) throws Exception {
        Field f = AbstractList.class.getDeclaredField("modCount");
        f.setAccessible(true);
        return f.getInt(list);
    }

    public static void main(String[] args) throws Exception {
        ArrayList<String> riders = new ArrayList<>(List.of("Asha", "Ravi", "Meena"));
        System.out.println("after copy  modCount " + modCount(riders));
        riders.add("Kabir");
        System.out.println("after add   modCount " + modCount(riders));
        riders.set(0, "ASHA");
        System.out.println("after set   modCount " + modCount(riders) + "  (set is not structural)");
        riders.remove("Ravi");
        System.out.println("after remove modCount " + modCount(riders));
        riders.ensureCapacity(100);
        System.out.println("after ensureCapacity modCount " + modCount(riders));
    }
}`,
        },
        {
          type: "output",
          text: `after copy  modCount 0
after add   modCount 1
after set   modCount 1  (set is not structural)
after remove modCount 2
after ensureCapacity modCount 3`,
        },
        {
          type: "paragraph",
          text: "`set` replaces a value in place, so it doesn't count. `ensureCapacity` surprised me: it doesn't change the size, but it does swap the backing array, and that counts. Every iterator remembers `modCount` when it's created (as `expectedModCount`) and compares on each `next()`. If they differ, it throws `ConcurrentModificationException`. This is called **fail-fast** iteration. It's a best-effort bug detector, not a thread-safety feature.",
        },
        {
          type: "heading",
          text: "LinkedList's fields and its Node",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.LinkedList
javap -p 'java.util.LinkedList$Node'`,
        },
        {
          type: "output",
          text: `public class java.util.LinkedList<E> extends java.util.AbstractSequentialList<E> implements java.util.List<E>, java.util.Deque<E>, java.lang.Cloneable, java.io.Serializable {
  transient int size;
  transient java.util.LinkedList$Node<E> first;
  transient java.util.LinkedList$Node<E> last;
  ...
  private void linkFirst(E);
  void linkLast(E);
  void linkBefore(E, java.util.LinkedList$Node<E>);
  private E unlinkFirst(java.util.LinkedList$Node<E>);
  private E unlinkLast(java.util.LinkedList$Node<E>);
  E unlink(java.util.LinkedList$Node<E>);
  ...
  java.util.LinkedList$Node<E> node(int);
  ...

class java.util.LinkedList$Node<E> {
  E item;
  java.util.LinkedList$Node<E> next;
  java.util.LinkedList$Node<E> prev;
  java.util.LinkedList$Node(java.util.LinkedList$Node<E>, E, java.util.LinkedList$Node<E>);
}`,
        },
        {
          type: "paragraph",
          text: "Three fields on the list, three on each node. There's no array anywhere, and no capacity. Every `add` creates one new `Node`. I walked a real list through its private links:",
        },
        {
          type: "code",
          language: "java",
          title: "Nodes.java",
          code: `import java.lang.reflect.Field;
import java.util.LinkedList;
import java.util.List;

public class Nodes {
    static Object read(Object target, Class<?> owner, String name) throws Exception {
        Field f = owner.getDeclaredField(name);
        f.setAccessible(true);
        return f.get(target);
    }

    public static void main(String[] args) throws Exception {
        LinkedList<String> train = new LinkedList<>(List.of("Engine", "S1", "AC1"));
        Class<?> nodeClass = Class.forName("java.util.LinkedList$Node");

        Object node = read(train, LinkedList.class, "first");
        while (node != null) {
            Object prev = read(node, nodeClass, "prev");
            Object next = read(node, nodeClass, "next");
            System.out.printf("%-7s prev=%-7s next=%s%n",
                read(node, nodeClass, "item"),
                prev == null ? "null" : read(prev, nodeClass, "item"),
                next == null ? "null" : read(next, nodeClass, "item"));
            node = next;
        }
        Object last = read(train, LinkedList.class, "last");
        System.out.println("last = " + read(last, nodeClass, "item") + ", size = " + train.size());
    }
}`,
        },
        {
          type: "output",
          text: `Engine  prev=null    next=S1
S1      prev=Engine  next=AC1
AC1     prev=S1      next=null
last = AC1, size = 3`,
        },
        {
          type: "paragraph",
          text: "It's a plain doubly linked list, not a circular one. The first node's `prev` and the last node's `next` are `null`, and there's no dummy head node.",
        },
        {
          type: "heading",
          text: "linkLast: what add(E) does on a LinkedList",
        },
        {
          type: "output",
          text: `  void linkLast(E);
       0: aload_0
       1: getfield      #27    // Field last:Ljava/util/LinkedList$Node;
       4: astore_2                                   // l = last
       5: new           #22    // class java/util/LinkedList$Node
       8: dup
       9: aload_2
      10: aload_1
      11: aconst_null
      12: invokespecial #24    // Method java/util/LinkedList$Node."<init>":(...)V
      15: astore_3                                   // newNode = new Node(l, e, null)
      16: aload_0
      17: aload_3
      18: putfield      #27    // Field last                 last = newNode
      21: aload_2
      22: ifnonnull     33
      25: aload_0
      26: aload_3
      27: putfield      #18    // Field first                if l == null: first = newNode
      30: goto          38
      33: aload_2
      34: aload_3
      35: putfield      #36    // Field Node.next            else: l.next = newNode
      38: ...                                        // size++, modCount++`,
        },
        {
          type: "paragraph",
          text: "A fixed handful of steps no matter how long the list is: allocate a node, point it back at the old last, update `last`, link the old last forward. That's true O(1), not amortized. The price is one object allocation per element.",
        },
        {
          type: "heading",
          text: "node(int): why get(i) walks, but only halfway",
        },
        {
          type: "output",
          text: `  java.util.LinkedList$Node<E> node(int);
       0: iload_1
       1: aload_0
       2: getfield      #7     // Field size:I
       5: iconst_1
       6: ishr
       7: if_icmpge     35     // index < size >> 1 ?
      10: aload_0
      11: getfield      #18    // Field first     yes: start at first
      ...
      23: getfield      #36    // Field java/util/LinkedList$Node.next:Ljava/util/LinkedList$Node;
      ...
      30: goto          17     //  and follow next, index times
      35: aload_0
      36: getfield      #27    // Field last      no: start at last
      ...
      53: getfield      #30    // Field java/util/LinkedList$Node.prev:Ljava/util/LinkedList$Node;
      ...
      60: goto          47     //  and follow prev backwards`,
        },
        {
          type: "paragraph",
          text: "So `get(i)`, `set(i, x)`, `add(i, x)` and `remove(i)` on a `LinkedList` all start by walking from the nearer end. The worst case is the middle, about `size / 2` hops. Still O(n). Each hop is a pointer chase to a node that could be anywhere on the heap, which is exactly what CPU caches are bad at.",
        },
        {
          type: "heading",
          text: "Memory per element",
        },
        {
          type: "paragraph",
          text: "I didn't measure object sizes (that needs a tool like JOL), but the usual 64-bit HotSpot layout with compressed references gives a good picture. An `ArrayList` slot is one 4-byte reference in the array, plus some unused spare capacity.",
        },
        {
          type: "paragraph",
          text: "A `LinkedList` element costs a whole `Node` object: a 12-byte object header plus three 4-byte references, about 24 bytes, on top of the reference to the element itself. The elements are the same in both lists; it's the container overhead that's several times larger for `LinkedList`.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Cheat sheet (fragments)",
          code: `List<String> list = new ArrayList<>();          // capacity 0 until first add
List<String> sized = new ArrayList<>(1_000);     // 1000 slots up front
List<String> copy = new ArrayList<>(other);      // exact-size copy

list.add("x");               // append            list.add(0, "y");     // insert, shifts
list.get(0);                 // read by index      list.set(0, "z");     // replace
list.remove(0);              // by index           list.remove("z");     // by value (equals)
list.indexOf("x");           // -1 if absent       list.contains("x");
list.subList(1, 3);          // a live view        list.removeIf(s -> s.isEmpty());
list.getFirst(); list.getLast(); list.reversed();  // Java 21

LinkedList<String> train = new LinkedList<>();
train.addFirst("E"); train.addLast("G");         // O(1) at both ends
train.pollFirst();   train.peekLast();           // Deque methods`,
        },
        {
          type: "heading",
          text: "LinkedList as a Deque",
        },
        {
          type: "code",
          language: "java",
          title: "LinkedDeque.java",
          code: `import java.util.Deque;
import java.util.LinkedList;

public class LinkedDeque {
    public static void main(String[] args) {
        LinkedList<String> stand = new LinkedList<>();
        stand.addLast("cab-1");
        stand.addLast("cab-2");
        stand.addFirst("cab-0");                 // a priority cab jumps the line
        System.out.println(stand + " first=" + stand.getFirst() + " last=" + stand.getLast());
        System.out.println("rider takes " + stand.pollFirst() + ", left " + stand);

        Deque<String> undo = new LinkedList<>();
        undo.push("type A"); undo.push("type B");
        System.out.println("undo " + undo.pop() + ", then " + undo.peek());
        System.out.println("get(1) on a LinkedList still works: " + stand.get(1));
    }
}`,
        },
        {
          type: "output",
          text: `[cab-0, cab-1, cab-2] first=cab-0 last=cab-2
rider takes cab-0, left [cab-1, cab-2]
undo type B, then type A
get(1) on a LinkedList still works: cab-2`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "remove(int) versus remove(Object)",
        },
        {
          type: "paragraph",
          text: "A `List<Integer>` has two `remove` overloads, and overload resolution (from the Methods lesson) picks `remove(int index)` for a plain `int` argument, because phase 1 matches without boxing:",
        },
        {
          type: "code",
          language: "java",
          title: "RemoveTrap.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class RemoveTrap {
    public static void main(String[] args) {
        List<Integer> seats = new ArrayList<>(List.of(10, 20, 30, 1));
        seats.remove(1);                          // remove(int index)
        System.out.println("remove(1)                 " + seats);

        seats = new ArrayList<>(List.of(10, 20, 30, 1));
        seats.remove(Integer.valueOf(1));         // remove(Object o)
        System.out.println("remove(Integer.valueOf(1)) " + seats);

        try {
            seats.remove(30);                     // index 30, not the value 30
        } catch (IndexOutOfBoundsException e) {
            System.out.println("remove(30)                " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `remove(1)                 [10, 30, 1]
remove(Integer.valueOf(1)) [10, 20, 30]
remove(30)                Index 30 out of bounds for length 3`,
        },
        {
          type: "heading",
          text: "Removing while looping",
        },
        {
          type: "code",
          language: "java",
          title: "ForEachRemove.java",
          code: `import java.util.*;

public class ForEachRemove {
    static void tryRemove(String target) {
        List<String> riders = new ArrayList<>(List.of("Asha", "Ravi", "Meena", "Kabir"));
        try {
            for (String r : riders) {
                if (r.equals(target)) riders.remove(r);
            }
            System.out.println("remove " + target + ": no exception, list " + riders);
        } catch (ConcurrentModificationException e) {
            System.out.println("remove " + target + ": ConcurrentModificationException");
        }
    }

    public static void main(String[] args) {
        tryRemove("Ravi");
        tryRemove("Meena");          // second to last
        List<String> riders = new ArrayList<>(List.of("Asha", "Ravi", "Meena", "Kabir"));
        riders.removeIf(r -> r.startsWith("M") || r.startsWith("R"));
        System.out.println("removeIf: " + riders);
    }
}`,
        },
        {
          type: "output",
          text: `remove Ravi: ConcurrentModificationException
remove Meena: no exception, list [Asha, Ravi, Kabir]
removeIf: [Asha, Kabir]`,
        },
        {
          type: "paragraph",
          text: "The second line is the sneaky one. Removing the second-to-last element shrinks `size` from 4 to 3, and the iterator's cursor is now 3. `hasNext()` checks `cursor != size`, gets `false`, and the loop ends quietly before `next()` can compare `modCount`. No exception, and \"Kabir\" was never even looked at. Fail-fast is best-effort, so the fix is never to rely on it: use `removeIf`, or `Iterator.remove()`.",
        },
        {
          type: "heading",
          text: "Editing through a ListIterator",
        },
        {
          type: "code",
          language: "java",
          title: "IteratorRemove.java",
          code: `import java.util.*;

public class IteratorRemove {
    public static void main(String[] args) {
        List<Integer> fares = new LinkedList<>(List.of(50, 400, 75, 900, 60));
        ListIterator<Integer> it = fares.listIterator();
        while (it.hasNext()) {
            int fare = it.next();
            if (fare > 300) it.remove();        // O(1) unlink at the cursor
            else it.set(fare + 10);             // replace in place
        }
        System.out.println(fares);
    }
}`,
        },
        {
          type: "output",
          text: `[60, 85, 70]`,
        },
        {
          type: "paragraph",
          text: "This is the one place `LinkedList` genuinely shines. The iterator is already standing at the node, so `it.remove()` just relinks two neighbours. On an `ArrayList`, the same `it.remove()` works too, but each one shifts the tail of the array. For bulk removal on an `ArrayList`, `removeIf` is better still: it marks what to remove and compacts the array in one pass.",
        },
        {
          type: "heading",
          text: "subList is a window, not a copy",
        },
        {
          type: "code",
          language: "java",
          title: "SubListView.java",
          code: `import java.util.*;

public class SubListView {
    public static void main(String[] args) {
        List<String> train = new ArrayList<>(List.of("E", "S1", "S2", "S3", "AC1", "G"));
        List<String> sleeper = train.subList(1, 4);       // S1..S3, a window, not a copy
        System.out.println("view        " + sleeper);

        sleeper.set(0, "S1*");                              // write through the view
        System.out.println("train       " + train);

        sleeper.clear();                                    // removes the range from train
        System.out.println("after clear " + train);

        List<String> window = train.subList(0, 2);
        train.add("PANTRY");                                // structural change on the parent
        try {
            System.out.println(window.size());
        } catch (ConcurrentModificationException e) {
            System.out.println("stale view  ConcurrentModificationException");
        }
        List<String> safeCopy = new ArrayList<>(train.subList(0, 2));
        System.out.println("copy        " + safeCopy);
    }
}`,
        },
        {
          type: "output",
          text: `view        [S1, S2, S3]
train       [E, S1*, S2, S3, AC1, G]
after clear [E, AC1, G]
stale view  ConcurrentModificationException
copy        [E, AC1]`,
        },
        {
          type: "paragraph",
          text: "Three lessons in one program. Writes through the view change the original. `subList(1, 4).clear()` is the idiomatic way to delete a range in one call. And once the parent is structurally changed some other way, the old view is dead and throws on any use. Wrap it in `new ArrayList<>(...)` if you need to keep it.",
        },
        {
          type: "heading",
          text: "Arrays.asList and List.of are not ArrayList",
        },
        {
          type: "code",
          language: "java",
          title: "AsListTrap.java",
          code: `import java.util.*;

public class AsListTrap {
    public static void main(String[] args) {
        String[] arr = {"tea", "coffee"};
        List<String> fixed = Arrays.asList(arr);
        fixed.set(0, "chai");
        System.out.println(Arrays.toString(arr) + " " + fixed.getClass().getName());
        try {
            fixed.add("lassi");
        } catch (UnsupportedOperationException e) {
            System.out.println("Arrays.asList: add -> UnsupportedOperationException");
        }
        List<String> immutable = List.of("tea", "coffee");
        try {
            immutable.set(0, "chai");
        } catch (UnsupportedOperationException e) {
            System.out.println("List.of: set -> UnsupportedOperationException");
        }
        List<String> growable = new ArrayList<>(Arrays.asList(arr));
        growable.add("lassi");
        System.out.println(growable);
    }
}`,
        },
        {
          type: "output",
          text: `[chai, coffee] java.util.Arrays$ArrayList
Arrays.asList: add -> UnsupportedOperationException
List.of: set -> UnsupportedOperationException
[chai, coffee, lassi]`,
        },
        {
          type: "paragraph",
          text: "`Arrays.asList` returns `java.util.Arrays$ArrayList`, a private class that happens to share the name. It's a fixed-size view over the original array: `set` writes into the array (`arr[0]` became \"chai\"), but `add` and `remove` throw. `List.of` is fully immutable. When I need a real, growable list, I copy into `new ArrayList<>(...)`.",
        },
        {
          type: "heading",
          text: "Same contents, equal lists",
        },
        {
          type: "code",
          language: "java",
          title: "Equality.java",
          code: `import java.util.*;

public class Equality {
    public static void main(String[] args) {
        List<String> a = new ArrayList<>(List.of("x", "y"));
        List<String> b = new LinkedList<>(List.of("x", "y"));
        System.out.println(a.equals(b) + " " + (a.hashCode() == b.hashCode()));
        System.out.println(a instanceof RandomAccess);
        System.out.println(b instanceof RandomAccess);
    }
}`,
        },
        {
          type: "output",
          text: `true true
true
false`,
        },
        {
          type: "paragraph",
          text: "The `List` contract defines `equals` as \"same elements in the same order\", whatever the implementation. So an `ArrayList` and a `LinkedList` with the same contents are equal and have the same hash code.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Calling list.remove(i) on a List<Integer> meaning the value",
        },
        {
          type: "paragraph",
          text: "As `RemoveTrap` showed, an `int` argument picks the index version. To remove by value, write `list.remove(Integer.valueOf(x))`.",
        },
        {
          type: "heading",
          text: "Removing inside a for-each loop",
        },
        {
          type: "paragraph",
          text: "It throws `ConcurrentModificationException`, or worse, silently skips elements, as the second-to-last case proved. Use `removeIf` or an explicit `Iterator` with `it.remove()`.",
        },
        {
          type: "heading",
          text: "Looping a LinkedList by index",
        },
        {
          type: "paragraph",
          text: "`for (int i = 0; i < list.size(); i++) list.get(i)` is O(n) on an `ArrayList` and O(n²) on a `LinkedList`, because every `get(i)` walks from an end. A for-each loop uses the iterator and is O(n) on both. This is the reason to declare parameters as `List` but never assume `get(i)` is cheap unless the list is `RandomAccess`.",
        },
        {
          type: "heading",
          text: "Confusing capacity with size",
        },
        {
          type: "paragraph",
          text: "`new ArrayList<>(100)` creates an empty list with room for 100. `list.get(0)` or `list.set(5, x)` on it throws `IndexOutOfBoundsException`. Capacity is never visible through the `List` API.",
        },
        {
          type: "heading",
          text: "Keeping a subList around",
        },
        {
          type: "paragraph",
          text: "A `subList` is tied to its parent. Change the parent's size and the view throws on its next use. Holding a small `subList` of a huge list also keeps the whole parent array alive. Copy it if it needs to outlive the moment.",
        },
        {
          type: "heading",
          text: "Adding to Arrays.asList",
        },
        {
          type: "paragraph",
          text: "It's fixed-size and throws `UnsupportedOperationException`. Wrap it: `new ArrayList<>(Arrays.asList(...))`.",
        },
        {
          type: "heading",
          text: "Choosing LinkedList for \"lots of inserts\"",
        },
        {
          type: "paragraph",
          text: "Inserting in the middle of a `LinkedList` is O(1) only once you're at the node. Getting there by index is O(n) of pointer chasing. An `ArrayList` insert is also O(n), but it's one `System.arraycopy` over contiguous memory, which is very fast in practice. Unless the code already holds an iterator at the right spot, `LinkedList` rarely wins.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Default to `ArrayList`, declared as `List<T>`.",
            "If I know roughly how many elements are coming, pass it to the constructor (`new ArrayList<>(expected)`) or call `ensureCapacity` before a big batch. It saves the repeated grow-and-copy steps.",
            "For a queue or a stack, use `ArrayDeque` through the `Deque` interface, not `LinkedList` and not `Stack`.",
            "Remove in bulk with `removeIf`, not in a loop.",
            "Iterate with for-each or streams, not `get(i)`, unless the list is known to be `RandomAccess`.",
            "Return `List.copyOf(list)` or `Collections.unmodifiableList(list)` from getters so callers can't change internal state.",
            "Call `trimToSize()` only on large, long-lived lists that are finished growing. It's not worth it for small or short-lived ones.",
            "For lists shared between threads, look at `CopyOnWriteArrayList` (read-mostly) or a proper lock. Both are covered in the Multithreading and Concurrency track. `Vector` is not the answer.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "table",
          headers: ["Operation", "ArrayList", "LinkedList", "Why"],
          rows: [
            ["`add(e)` at end", "O(1) amortized", "O(1)", "Array has spare room most of the time; list updates `last`"],
            ["`add(0, e)` at front", "O(n)", "O(1)", "Shift everything right vs. relink one node"],
            ["`add(i, e)` in the middle", "O(n)", "O(n)", "Shift the tail vs. walk to node `i`"],
            ["`get(i)` / `set(i, e)`", "O(1)", "O(n)", "Array index vs. walk from the nearer end"],
            ["`remove(i)`", "O(n)", "O(n)", "Shift the tail vs. walk to node `i`"],
            ["`removeFirst()`", "O(n)", "O(1)", "Shift everything left vs. unlink first"],
            ["`removeLast()`", "O(1)", "O(1)", "No shift needed vs. unlink last"],
            ["`contains` / `indexOf`", "O(n)", "O(n)", "Linear scan with `equals` in both"],
            ["`iterator.remove()`", "O(n)", "O(1)", "Shift vs. relink at the cursor"],
            ["Memory per element", "One reference + spare capacity", "One `Node` (about 24 bytes) + reference", "See the memory note above"],
          ],
        },
        {
          type: "list",
          items: [
            "**Cache locality** is the real story behind the table. An `ArrayList`'s references sit side by side in one array, so the CPU loads several at once and prefetches the next ones. A `LinkedList` follows a pointer to each node, and the nodes can be scattered across the heap, so each hop can be a cache miss. Equal Big-O often hides a large constant-factor gap in `ArrayList`'s favour.",
            "`System.arraycopy` is an intrinsic: the JIT replaces it with optimized memory-copy code. Shifting a few thousand references is much cheaper than the O(n) suggests.",
            "Each `LinkedList` add is an allocation, and each node is one more object for the garbage collector to trace.",
            "Growing an `ArrayList` temporarily needs both the old and the new array in memory during the copy. For very large lists, pre-sizing avoids that spike.",
            "I didn't put timing numbers here. They depend heavily on the machine, the JIT and the element types, and the honest way to get them is a JMH benchmark on the real workload.",
          ],
        },
        {
          type: "paragraph",
          text: "For comparison, here is the legacy `Vector`, which doubles instead of growing by half:",
        },
        {
          type: "code",
          language: "java",
          title: "VectorGrowth.java",
          code: `import java.util.Vector;

public class VectorGrowth {
    public static void main(String[] args) {
        Vector<Integer> v = new Vector<>();
        StringBuilder sb = new StringBuilder();
        int last = v.capacity();
        sb.append(last);
        for (int i = 0; i < 100; i++) {
            v.add(i);
            if (v.capacity() != last) { last = v.capacity(); sb.append(" -> ").append(last); }
        }
        System.out.println("Vector capacity: " + sb);
    }
}`,
        },
        {
          type: "output",
          text: `Vector capacity: 10 -> 20 -> 40 -> 80 -> 160`,
        },
        {
          type: "paragraph",
          text: "`Vector` allocates its 10 slots eagerly (capacity 10 before any add, unlike `ArrayList`'s 0), doubles when full unless a `capacityIncrement` was given, and has a public `capacity()` method. Doubling grows less often but wastes more memory at the top.",
        },
      ],
    },
    {
      title: "Lists in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A cab stand at a railway station: cabs join the line as they arrive, a rider takes the first cab, a driver sometimes leaves the line to go home, and the stand keeps a log of today's trips that the dashboard reads from the end.",
        },
        {
          type: "code",
          language: "java",
          title: "CabStand.java",
          code: `import java.util.*;

public class CabStand {
    private final Deque<String> waitingCabs = new ArrayDeque<>();   // the line at the stand
    private final List<String> todaysLog = new ArrayList<>();       // append-only, read by index

    void cabArrives(String cab)  { waitingCabs.addLast(cab); }

    void cabLeavesLine(String cab) { waitingCabs.remove(cab); }     // driver went home: O(n)

    Optional<String> riderArrives(String rider) {
        String cab = waitingCabs.pollFirst();                       // first in line
        if (cab == null) return Optional.empty();
        todaysLog.add(rider + " -> " + cab);
        return Optional.of(cab);
    }

    List<String> lastTrips(int n) {
        int from = Math.max(0, todaysLog.size() - n);
        return List.copyOf(todaysLog.subList(from, todaysLog.size()));   // copy, not a live view
    }

    public static void main(String[] args) {
        CabStand stand = new CabStand();
        stand.cabArrives("WB-11"); stand.cabArrives("WB-22"); stand.cabArrives("WB-33");
        stand.cabLeavesLine("WB-22");
        System.out.println(stand.riderArrives("Asha").orElse("no cab"));
        System.out.println(stand.riderArrives("Ravi").orElse("no cab"));
        System.out.println(stand.riderArrives("Meena").orElse("no cab"));
        System.out.println("last trips " + stand.lastTrips(5));
    }
}`,
        },
        {
          type: "output",
          text: `WB-11
WB-33
no cab
last trips [Asha -> WB-11, Ravi -> WB-33]`,
        },
        {
          type: "list",
          items: [
            "My first version used a `LinkedList` for the line, because \"queue\" sounded like \"linked list\". `ArrayDeque` does the same job with O(1) at both ends, no node per cab, and no `null`s allowed, which makes `pollFirst()` returning `null` an unambiguous \"no cab\".",
            "The trip log is an `ArrayList`: it only ever grows at the end, and the dashboard reads the last few entries by index.",
            "`lastTrips` copies its `subList`. Returning the live view would hand the caller a window that throws the moment another trip is logged.",
            "`cabLeavesLine` is O(n), and that's fine for a stand with a few dozen cabs. For thousands of cabs, I'd add a `Set` of cabs in the line, or a `LinkedHashSet` to get both order and O(1) removal by id.",
            "A real stand is updated by many threads at once. These classes aren't thread-safe; the concurrent versions (`ConcurrentLinkedDeque`, `LinkedBlockingDeque`) come in the concurrency track.",
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
              question: "What's the difference between ArrayList and LinkedList?",
              answer:
                "`ArrayList` is backed by a resizable array, so `get(i)` is O(1) and adding at the end is amortized O(1), but inserting or removing near the front shifts elements. `LinkedList` is a doubly linked list of `Node` objects, so adding or removing at either end is O(1), but `get(i)` walks from the nearer end, O(n).\n\n`LinkedList` also implements `Deque`, and `ArrayList` implements `RandomAccess`. In practice `ArrayList` wins most real workloads because of cache locality and lower memory per element.",
            },
            {
              question: "What is the default capacity of an ArrayList?",
              answer:
                "Ten, but lazily. `new ArrayList<>()` starts with a shared empty array, capacity 0, and allocates 10 slots on the first `add`.\n\nI read `elementData.length` with reflection: it was 0 after construction and 10 after the first add. `Vector`, by contrast, allocates 10 slots in its constructor.",
            },
            {
              question: "How does an ArrayList grow?",
              answer:
                "When `size` reaches the array length, `grow` creates a new array of about 1.5 times the old length (`old + (old >> 1)`) with `Arrays.copyOf` and copies the references over.\n\nMy trace showed 10, 15, 22, 33, 49, 73, 109. The bytecode of `grow(int)` confirms it: `iconst_1`, `ishr` for the preferred growth, then `ArraysSupport.newLength` and `Arrays.copyOf`.",
            },
            {
              question: "What's the difference between size and capacity?",
              answer:
                "`size` is the number of elements in the list. Capacity is the length of the backing array, the number of slots available before the next grow. Capacity is always at least `size`.\n\n`new ArrayList<>(500)` has capacity 500 and size 0, so `get(0)` throws. Capacity can't be read through the `List` API; I needed reflection to see it.",
            },
            {
              question: "When would you choose LinkedList over ArrayList?",
              answer:
                "Rarely. The honest case is when code adds and removes at the front a lot, or removes through an iterator that's already at the right position, and doesn't need index access.\n\nEven then, for front and back operations `ArrayDeque` is usually the better choice, with no per-element `Node` object. I'd pick `LinkedList` only if I need both `List` and `Deque` behaviour in one object, or `null` elements in a deque.",
            },
            {
              question: "Are ArrayList and LinkedList thread-safe?",
              answer:
                "No, neither is. Concurrent modification from several threads can corrupt them or throw `ConcurrentModificationException`.\n\nThe options are `Collections.synchronizedList`, `CopyOnWriteArrayList` for read-mostly lists, or external locking. `Vector` is synchronized but is legacy. The concurrent collections get their own lessons in the concurrency track.",
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
              question: "What does list.remove(1) do on a List<Integer> containing [10, 20, 30, 1]?",
              answer:
                "It removes the element at **index** 1, which is `20`, giving `[10, 30, 1]`. The `int` argument matches `remove(int)` in the first phase of overload resolution, without boxing, so `remove(Object)` never gets considered.\n\nTo remove the value 1, write `remove(Integer.valueOf(1))`. And `remove(30)` on that list throws `IndexOutOfBoundsException`, because there's no index 30.",
            },
            {
              question: "Why does removing an element inside a for-each loop sometimes not throw ConcurrentModificationException?",
              answer:
                "Because the check happens in `next()`, and `hasNext()` only compares the cursor with `size`. If the removed element was second to last, `size` drops to equal the cursor, `hasNext()` returns `false`, and the loop ends without ever calling `next()` again.\n\nI reproduced it: removing \"Meena\" from four names threw nothing and skipped \"Kabir\" completely. Fail-fast behaviour is best-effort and must never be relied on.",
            },
            {
              question: "What's wrong with adding to the list returned by Arrays.asList?",
              answer:
                "It's a fixed-size view backed by the original array, a private class `java.util.Arrays$ArrayList`, not `java.util.ArrayList`. `set` works and writes through to the array, but `add` and `remove` throw `UnsupportedOperationException`.\n\nThe fix is `new ArrayList<>(Arrays.asList(...))`. `List.of` is stricter still: fully immutable, and it rejects `null`.",
            },
            {
              question: "What happens to a subList when the original list is modified?",
              answer:
                "If the modification is structural and not made through the sublist, the sublist becomes invalid and throws `ConcurrentModificationException` on its next use. It checks the parent's `modCount` just like an iterator does.\n\nChanges made through the sublist are fine and write through to the parent. `list.subList(2, 5).clear()` is the standard way to remove a range.",
            },
            {
              question: "Is iterating a LinkedList with a for loop and get(i) a problem?",
              answer:
                "Yes. Each `get(i)` walks from the nearer end, so a full loop is O(n²). With 100,000 elements that's billions of node hops.\n\nA for-each loop uses the iterator, which just follows `next` links, so it's O(n). Generic code can check `list instanceof RandomAccess` before choosing index-based access, which is what `Collections.binarySearch` does.",
            },
            {
              question: "Does ensureCapacity change modCount?",
              answer:
                "Yes, when it actually grows the array. I read `modCount` with reflection: it went from 2 to 3 after `ensureCapacity(100)`, even though the size didn't change.\n\nReplacing the backing array counts as a structural change, so an iterator created before the call would fail on its next `next()`.",
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
              question: "Why is ArrayList.add amortized O(1) and not O(1)?",
              answer:
                "Most adds just write into a spare slot, which is O(1). Occasionally the array is full and `grow` copies all n elements, which is O(n). Because each growth multiplies the capacity by 1.5, those copies get rarer as the list grows, and the total copying across n adds stays proportional to n.\n\nSpread over all adds, that's a constant cost per add. In my trace, 100 adds triggered only seven growths.",
            },
            {
              question: "What happens inside ArrayList when you remove from the middle?",
              answer:
                "`remove` calls `fastRemove`, which increments `modCount`, then calls `System.arraycopy(es, i + 1, es, i, size - 1 - i)` to shift the tail left by one, and finally sets the old last slot to `null` so the garbage collector can reclaim that object.\n\nI watched the raw array go from `[A, B, C, D, E, null, ...]` to `[A, C, D, E, null, null, ...]` after `remove(1)`. The capacity doesn't shrink.",
            },
            {
              question: "Why are there two empty arrays, EMPTY_ELEMENTDATA and DEFAULTCAPACITY_EMPTY_ELEMENTDATA?",
              answer:
                "So `grow` can tell how the list was created. `new ArrayList<>()` uses `DEFAULTCAPACITY_EMPTY_ELEMENTDATA`, and its first growth jumps to 10. `new ArrayList<>(0)` uses `EMPTY_ELEMENTDATA`, and grows by the normal rule from 0.\n\nThe bytecode of `grow` compares `elementData` against `DEFAULTCAPACITY_EMPTY_ELEMENTDATA` with `if_acmpeq`. My trace for `new ArrayList<>(0)` went 1, 2, 3, 4, 6, 6, 9, 9 instead of jumping to 10.",
            },
            {
              question: "How does LinkedList.get(index) find the node?",
              answer:
                "The package-private `node(int)` method compares the index with `size >> 1`. If it's in the first half, it starts at `first` and follows `next` links; otherwise it starts at `last` and follows `prev` links.\n\nSo the worst case is the middle, about n/2 hops, which is still O(n). I confirmed both branches in `javap -c` output.",
            },
            {
              question: "What is modCount and how does fail-fast iteration work?",
              answer:
                "`modCount` is a field in `AbstractList` that counts structural modifications: adds, removes, clears, and array replacement by `ensureCapacity` or `trimToSize`. `set` doesn't count.\n\nAn iterator copies it into `expectedModCount` when created and compares on every `next()` and `remove()`. A mismatch throws `ConcurrentModificationException`. It isn't synchronized, so it's a debugging aid that catches most bugs, not a guarantee.",
            },
            {
              question: "Why is elementData declared transient?",
              answer:
                "Because the array usually has spare capacity full of `null`s, and serializing those would waste space. `ArrayList` has its own private `writeObject` and `readObject` (visible in `javap -p`) that write only `size` and the live elements, and rebuild a right-sized array on read.\n\n`LinkedList` does the same with its `first` and `last` fields: it writes the elements, not the node objects.",
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
            "Print an `ArrayList`'s capacity after each of the first 20 adds. Hint: reflection on `elementData`, and run with `--add-opens java.base/java.util=ALL-UNNAMED`. Compare with `Capacity.java` above.",
            "Remove every even number from `[1, 2, 3, 4, 5, 6]` three ways: `removeIf`, an explicit `Iterator`, and an index loop. Hint: the index loop must run backwards.",
            "Given `List<Integer> seats = [5, 1, 2]`, remove the **value** 1. Hint: `Integer.valueOf`.",
            "Build a browser back button with a `Deque<String>`: visit three pages, press back once, print the current page. Hint: `push`, `pop`, `peek`.",
            "Delete coaches 2 to 4 from `[E, S1, S2, S3, S4, G]` in a single statement. Hint: `subList(...).clear()`.",
            "Rotate a cab line so the first cab goes to the back, once with `LinkedList` methods and once with `Collections.rotate`.",
            "Predict what `Arrays.asList(1, 2, 3).add(4)` does, then run it.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "ListSolutions.java (exercises 2 to 6)",
          code: `import java.util.*;

public class ListSolutions {
    public static void main(String[] args) {
        List<Integer> a = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6));
        a.removeIf(n -> n % 2 == 0);

        List<Integer> b = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6));
        for (Iterator<Integer> it = b.iterator(); it.hasNext(); ) {
            if (it.next() % 2 == 0) it.remove();
        }

        List<Integer> c = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6));
        for (int i = c.size() - 1; i >= 0; i--) {
            if (c.get(i) % 2 == 0) c.remove(i);
        }
        System.out.println("2  " + a + " " + b + " " + c);

        List<Integer> seats = new ArrayList<>(List.of(5, 1, 2));
        seats.remove(Integer.valueOf(1));
        System.out.println("3  " + seats);

        Deque<String> history = new ArrayDeque<>();
        history.push("home"); history.push("search"); history.push("trip/42");
        history.pop();
        System.out.println("4  back to " + history.peek());

        List<String> coaches = new ArrayList<>(List.of("E", "S1", "S2", "S3", "S4", "G"));
        coaches.subList(2, 5).clear();
        System.out.println("5  " + coaches);

        LinkedList<String> line = new LinkedList<>(List.of("cab-1", "cab-2", "cab-3"));
        line.addLast(line.removeFirst());
        List<String> same = new ArrayList<>(List.of("cab-1", "cab-2", "cab-3"));
        Collections.rotate(same, -1);
        System.out.println("6  " + line + " " + same);
    }
}`,
        },
        {
          type: "output",
          text: `2  [1, 3, 5] [1, 3, 5] [1, 3, 5]
3  [5, 2]
4  back to search
5  [E, S1, G]
6  [cab-2, cab-3, cab-1] [cab-2, cab-3, cab-1]`,
        },
        {
          type: "qa",
          items: [
            {
              question: "Exercise 2: why must the index loop run backwards?",
              answer:
                "Removing at index `i` shifts every later element one place left. Going forwards, the element that slides into slot `i` gets skipped when `i++` runs, so two evens in a row would leave one behind.\n\nGoing backwards, the shifted elements are ones already checked. `removeIf` avoids the question entirely and does a single compaction pass.",
            },
            {
              question: "Exercise 7: what does Arrays.asList(1, 2, 3).add(4) do?",
              answer:
                "It throws `UnsupportedOperationException`. `Arrays.asList` returns a fixed-size list backed by an array, so it supports `get` and `set` but not `add` or `remove`.\n\nThe exception comes from `AbstractList.add`, which the private `Arrays$ArrayList` class doesn't override.",
            },
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ARRAYLIST   Object[] elementData + int size (+ modCount)
            new ArrayList<>() -> capacity 0, 10 on first add
            grow: old + old>>1 via Arrays.copyOf  10 15 22 33 49
            get/set O(1)   add-at-end O(1) amortized
            add/remove at i: System.arraycopy, O(n - i)
            trimToSize (bumps modCount)  ensureCapacity (bumps it when it grows)

LINKEDLIST  Node{item, prev, next}  first  last  size
            add/remove at ends O(1)   get(i) O(n), walks from nearer end
            List + Deque; not RandomAccess; ~24 B per node

BOTH        ordered, duplicates, nulls ok, NOT thread-safe
            fail-fast iterators via modCount (best effort)

TRAPS       remove(int) vs remove(Object) on List<Integer>
            for-each + remove -> CME (or silent skip)
            subList = live view; Arrays.asList = fixed size
            get(i) loop on LinkedList = O(n^2)

CHOOSE      list -> ArrayList   queue/stack -> ArrayDeque
            threads -> CopyOnWriteArrayList etc. (concurrency track)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`ArrayList` is an array that resizes itself by about half each time. Reads are instant, appends are cheap on average, and middle edits cost one fast array shift.",
            "`LinkedList` trades index access and memory for O(1) work at the ends. `ArrayDeque` usually does that job better.",
            "Most real bugs with lists aren't about speed. They're `remove(int)` versus `remove(Object)`, modifying during iteration, and treating views like copies.",
          ],
        },
      ],
    },
  ],
};
