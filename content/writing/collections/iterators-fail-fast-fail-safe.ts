import type { Lesson } from "../types";

export const iteratorsFailFastFailSafe: Lesson = {
  slug: "iterators-fail-fast-fail-safe",
  date: "2026-10-29",
  title: "Iterators: Fail-Fast and Fail-Safe",
  description:
    "How Java walks a collection one element at a time: Iterator, ListIterator and Iterable, what a for-each loop compiles to, why changing a list mid-loop throws ConcurrentModificationException (and the odd case where it doesn't), and how snapshot and weakly consistent iterators avoid it.",
  tags: ["Core Java", "Collections", "Iterator", "ConcurrentModificationException"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a bus conductor walking down the aisle checking tickets. He looks at one passenger, then asks \"is there anyone else?\" and moves to the next. He doesn't need to know how the seats are arranged, he just keeps going until there's nobody left.",
        },
        {
          type: "paragraph",
          text: "An **iterator** is that conductor for a collection. It has two main questions: `hasNext()` (\"is there another one?\") and `next()` (\"give me the next one\"). A for-each loop uses one behind the scenes.",
        },
        {
          type: "paragraph",
          text: "The tricky part is changing the collection while walking through it, like passengers swapping seats mid-check. Most Java collections stop with an error if that happens behind the iterator's back. The safe way to remove an item mid-walk is to ask the iterator itself to do it, with `it.remove()`.",
        },
        {
          type: "code",
          language: "java",
          code: `List<String> tickets = new ArrayList<>(List.of("paid", "no ticket", "paid"));
Iterator<String> it = tickets.iterator();
while (it.hasNext()) {
    if (it.next().equals("no ticket")) {
        it.remove();                 // the safe way to remove while walking
    }
}
System.out.println(tickets);`,
        },
        {
          type: "output",
          text: `[paid, paid]`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "To remove items while looping, use the iterator's own `remove()` (or `removeIf`), never `list.remove()` inside a for-each.",
        },
      ],
    },
    {
      title: "What an Iterator Is",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a teacher taking attendance. She doesn't care whether the register is a bound book, a loose stack of cards or an app on her phone. She only needs two questions answered, over and over: \"is there another name?\" and \"what's the next name?\". When she's done, she's done. She can't jump back unless the register lets her.",
        },
        {
          type: "paragraph",
          text: "An **iterator** is exactly that: an object that walks through a collection one element at a time, with `hasNext()` and `next()`. It hides how the collection stores things. An `ArrayList` walks an array by index, a `LinkedList` follows node pointers, a `HashMap` hops between buckets, a `TreeSet` walks a tree in order. My loop looks the same for all of them.",
        },
        {
          type: "paragraph",
          text: "This lesson is also about what happens when somebody changes the register while the teacher is still reading it. Most `java.util` collections are **fail-fast**: their iterators notice the change and throw `ConcurrentModificationException` instead of carrying on with a confused view. The concurrent collections choose differently: **fail-safe** (or, more precisely, snapshot and weakly consistent) iterators that never throw. Knowing which one I'm holding explains a whole family of bugs.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 had `Enumeration`, with `hasMoreElements()` and `nextElement()`, used by `Vector` and `Hashtable`. It could only read. There was no way to remove the current element safely, and no protection against the collection changing underneath.",
        },
        {
          type: "paragraph",
          text: "Java 1.2 (1998) brought the Collections Framework and replaced it with `Iterator`: shorter names, an optional `remove()`, and the fail-fast behaviour, built on a counter called `modCount`. `ListIterator` arrived at the same time for lists, with backwards movement and in-place `set` and `add`.",
        },
        {
          type: "paragraph",
          text: "Java 5 added `Iterable` and the enhanced for loop (`for (String s : list)`), which is pure compiler sugar over an iterator, as `javap` will show. It also added `java.util.concurrent` with `CopyOnWriteArrayList` and `ConcurrentHashMap`, whose iterators never throw `ConcurrentModificationException`. Java 8 added `Iterator.forEachRemaining`, `Iterable.forEach`, `Collection.removeIf`, and `Spliterator`, the iterator that streams are built on.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a shopkeeper counting stock with a clipboard, walking along the shelves.",
        },
        {
          type: "list",
          items: [
            "Before starting, he notes the shelf's **version number** written on a sticker: \"version 7\". That's `expectedModCount`.",
            "Every time anyone adds or removes a box, they must bump the sticker: version 8. That's `modCount`. Swapping one box for another in the same spot doesn't count, the shelf layout didn't change.",
            "Before reading each box, the shopkeeper checks the sticker. If it no longer says 7, he stops and shouts. That's **fail-fast**: better to stop than to count a box twice or skip one.",
            "If the shopkeeper himself removes a box with his own hand (`iterator.remove()`), he updates both the sticker and his clipboard, so nothing is wrong.",
            "A different shop works from a **photo** of the shelf taken at the start. People can rearrange the real shelf freely, and he just counts the photo. That's a **snapshot** iterator, like `CopyOnWriteArrayList`'s.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Three interfaces",
        },
        {
          type: "table",
          headers: ["Interface", "Methods", "What it's for"],
          rows: [
            ["`Iterable<T>`", "`iterator()`, `forEach` (8), `spliterator` (8)", "\"I can be walked.\" Anything `Iterable` works in a for-each loop. `Collection` extends it."],
            ["`Iterator<T>`", "`hasNext()`, `next()`, `remove()`, `forEachRemaining` (8)", "One walk, forward only. Single-use: once it reaches the end, I need a new one."],
            ["`ListIterator<T>`", "adds `hasPrevious()`, `previous()`, `nextIndex()`, `previousIndex()`, `set(e)`, `add(e)`", "Lists only. Both directions, plus replace and insert at the current position."],
          ],
        },
        {
          type: "heading",
          text: "Where the cursor sits",
        },
        {
          type: "diagram",
          text: `list:       [ Aman ] [ Bela ] [ Chirag ] [ Divya ]
index:          0        1         2          3
cursor:     ^        ^        ^          ^          ^
            0        1        2          3          4

The cursor lives BETWEEN elements.
next()      returns the element after the cursor and moves right
previous()  returns the element before the cursor and moves left
hasNext()   cursor != size`,
          caption: "A ListIterator over four names. remove() and set() act on the element last returned by next() or previous().",
        },
        {
          type: "heading",
          text: "Fail-fast versus fail-safe",
        },
        {
          type: "table",
          headers: ["", "Fail-fast", "Snapshot / weakly consistent"],
          rows: [
            ["Collections", "`ArrayList`, `LinkedList`, `HashMap`, `HashSet`, `TreeMap`, `ArrayDeque`...", "`CopyOnWriteArrayList`, `ConcurrentHashMap`, `ConcurrentSkipListMap`, `ConcurrentLinkedQueue`..."],
            ["Change during a loop", "Throws `ConcurrentModificationException` on the next `next()` (best effort)", "Never throws"],
            ["What the loop sees", "Would be undefined, so it refuses", "COW: the snapshot from the start. CHM: some, all or none of the changes"],
            ["How", "Compares `modCount` with `expectedModCount`", "COW: iterates an old array. CHM: walks live nodes without a counter"],
            ["`iterator.remove()`", "Supported (on most)", "COW: `UnsupportedOperationException`. CHM: supported"],
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "\"Fail-safe\" isn't an official term",
          text: "The Javadoc never says fail-safe. It says fail-fast for `java.util` collections and **weakly consistent** for `java.util.concurrent` ones, and `CopyOnWriteArrayList` documents a **snapshot** iterator. Interviewers often use fail-safe for both; I mention the precise names when I answer.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/collections/fail-fast-iterator.svg",
          alt: "Removing from a list inside a for-each loop: modCount changes, the iterator's expectedModCount does not, and next() throws ConcurrentModificationException; safe alternatives listed.",
          caption: "The iterator compares `modCount` with its saved `expectedModCount` on every `next()`; use `it.remove()` or `removeIf` instead.",
        },
        {
          type: "heading",
          text: "What a for-each loop compiles to",
        },
        {
          type: "paragraph",
          text: "I wrote the same loop twice, once over a `List` and once over an `int[]`:",
        },
        {
          type: "code",
          language: "java",
          title: "ForEachCompiled.java",
          code: `import java.util.List;

public class ForEachCompiled {
    static int total(List<Integer> fares) {
        int sum = 0;
        for (int fare : fares) {
            sum += fare;
        }
        return sum;
    }

    static int total(int[] fares) {
        int sum = 0;
        for (int fare : fares) {
            sum += fare;
        }
        return sum;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac ForEachCompiled.java && javap -c -p ForEachCompiled",
        },
        {
          type: "output",
          text: `  static int total(java.util.List<java.lang.Integer>);
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
      27: invokevirtual #25                 // Method java/lang/Integer.intValue:()I
      30: istore_3
      31: iload_1
      32: iload_3
      33: iadd
      34: istore_1
      35: goto          9
      38: iload_1
      39: ireturn

  static int total(int[]);
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
      ...
      27: iinc          4, 1
      30: goto          10`,
        },
        {
          type: "paragraph",
          text: "Two completely different loops from the same syntax:",
        },
        {
          type: "list",
          items: [
            "Over a `List`, `javac` calls `iterator()`, stores it in a hidden local (slot 2), then loops on `hasNext()` and `next()`. The `checkcast Integer` and `intValue()` are the generic cast and the auto-unboxing. So a for-each loop over a collection **is** an iterator loop, and everything about iterators, including `ConcurrentModificationException`, applies to it.",
            "Over an array, there's no iterator at all. `javac` copies the array reference, reads `arraylength` once, and runs a plain index loop with `iaload`. Arrays aren't `Iterable`.",
            "The hidden iterator variable has no name I can reach in source. That's why I can't call `remove()` from inside a for-each loop, and why I switch to an explicit `Iterator` when I need to.",
          ],
        },
        {
          type: "heading",
          text: "ArrayList's iterator, field by field",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p 'java.util.ArrayList$Itr'",
        },
        {
          type: "output",
          text: `class java.util.ArrayList$Itr implements java.util.Iterator<E> {
  int cursor;
  int lastRet;
  int expectedModCount;
  final java.util.ArrayList this$0;
  java.util.ArrayList$Itr(java.util.ArrayList);
  public boolean hasNext();
  public E next();
  public void remove();
  public void forEachRemaining(java.util.function.Consumer<? super E>);
  final void checkForComodification();
}`,
        },
        {
          type: "list",
          items: [
            "`cursor` is the index of the next element to return.",
            "`lastRet` is the index of the element last returned, or `-1`. `remove()` needs it, and it's reset to `-1` after a remove, which is why calling `remove()` twice in a row fails.",
            "`expectedModCount` is the list's `modCount` copied when the iterator was created.",
            "`this$0` is the hidden reference to the owning `ArrayList`. `Itr` is an inner class.",
          ],
        },
        {
          type: "paragraph",
          text: "The two methods that matter, from `javap -c`:",
        },
        {
          type: "output",
          text: `  public boolean hasNext();
    Code:
       0: aload_0
       1: getfield      #25                 // Field cursor:I
       4: aload_0
       5: getfield      #1                  // Field this$0:Ljava/util/ArrayList;
       8: getfield      #28                 // Field java/util/ArrayList.size:I
      11: if_icmpeq     18
      14: iconst_1
      15: goto          19
      18: iconst_0
      19: ireturn
  final void checkForComodification();
    Code:
       0: aload_0
       1: getfield      #1                  // Field this$0:Ljava/util/ArrayList;
       4: getfield      #17                 // Field java/util/ArrayList.modCount:I
       7: aload_0
       8: getfield      #22                 // Field expectedModCount:I
      11: if_icmpeq     22
      14: new           #41                 // class java/util/ConcurrentModificationException
      17: dup
      18: invokespecial #43                 // Method java/util/ConcurrentModificationException."<init>":()V
      21: athrow
      22: return`,
        },
        {
          type: "paragraph",
          text: "Read carefully, because both details explain the odd behaviour below. `hasNext()` is just `cursor != size`. It does **not** check `modCount`. Only `next()` (and `remove()`) call `checkForComodification()`, which throws if the list's `modCount` no longer matches the iterator's copy.",
        },
        {
          type: "heading",
          text: "What bumps modCount",
        },
        {
          type: "paragraph",
          text: "`modCount` is a `protected transient int` field in `AbstractList`. It's not public, so I read it with reflection, which needs the module opened:",
        },
        {
          type: "code",
          language: "java",
          title: "ModCountPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.AbstractList;
import java.util.ArrayList;
import java.util.List;

public class ModCountPeek {
    static int modCount(List<?> list) throws Exception {
        Field f = AbstractList.class.getDeclaredField("modCount");
        f.setAccessible(true);
        return f.getInt(list);
    }

    public static void main(String[] args) throws Exception {
        List<String> list = new ArrayList<>();
        System.out.println("new list         modCount=" + modCount(list));
        list.add("a"); list.add("b"); list.add("c");
        System.out.println("after 3 adds     modCount=" + modCount(list));
        list.set(0, "A");
        System.out.println("after set        modCount=" + modCount(list));
        list.remove("b");
        System.out.println("after remove     modCount=" + modCount(list));
        list.sort(null);
        System.out.println("after sort       modCount=" + modCount(list));
        list.clear();
        System.out.println("after clear      modCount=" + modCount(list));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util=ALL-UNNAMED ModCountPeek",
        },
        {
          type: "output",
          text: `new list         modCount=0
after 3 adds     modCount=3
after set        modCount=3
after remove     modCount=4
after sort       modCount=5
after clear      modCount=6`,
        },
        {
          type: "list",
          items: [
            "Every `add` and `remove` is a **structural** change: the size changed, so `modCount` goes up.",
            "`set` replaces an element in its slot. Size and positions are unchanged, so `modCount` stays the same, and a `set` during iteration does not throw.",
            "`sort` reorders everything. `ArrayList.sort` deliberately increments `modCount` (I showed its bytecode in the Comparable lesson), so an open iterator fails fast.",
            "`clear()` is one structural change, one increment, no matter how many elements it removed. The value isn't a count of anything meaningful, only \"has it changed since I looked?\".",
          ],
        },
        {
          type: "heading",
          text: "The CME, and the case where it doesn't happen",
        },
        {
          type: "paragraph",
          text: "A shopkeeper has four items on a list and wants to remove one while looping. I tried removing each position in turn:",
        },
        {
          type: "code",
          language: "java",
          title: "CmeDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class CmeDemo {
    static void removeWhileLooping(String target) {
        List<String> stock = new ArrayList<>(List.of("rice", "dal", "sugar", "salt"));
        try {
            for (String item : stock) {
                if (item.equals(target)) {
                    stock.remove(item);
                }
            }
            System.out.println("remove " + target + ": no exception, list = " + stock);
        } catch (java.util.ConcurrentModificationException e) {
            System.out.println("remove " + target + ": " + e.getClass().getSimpleName());
        }
    }

    public static void main(String[] args) {
        removeWhileLooping("rice");     // first
        removeWhileLooping("dal");      // middle
        removeWhileLooping("sugar");    // second-to-last
        removeWhileLooping("salt");     // last
    }
}`,
        },
        {
          type: "output",
          text: `remove rice: ConcurrentModificationException
remove dal: ConcurrentModificationException
remove sugar: no exception, list = [rice, dal, salt]
remove salt: ConcurrentModificationException`,
        },
        {
          type: "paragraph",
          text: "Removing the second-to-last element **doesn't throw**. To see why, I traced the iterator's own fields with reflection while removing `sugar`:",
        },
        {
          type: "code",
          language: "java",
          title: "ItrTrace.java",
          code: `import java.lang.reflect.Field;
import java.util.AbstractList;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class ItrTrace {
    static int read(Object target, Class<?> owner, String field) throws Exception {
        Field f = owner.getDeclaredField(field);
        f.setAccessible(true);
        return f.getInt(target);
    }

    public static void main(String[] args) throws Exception {
        List<String> stock = new ArrayList<>(List.of("rice", "dal", "sugar", "salt"));
        Iterator<String> it = stock.iterator();
        Class<?> itr = it.getClass();
        while (it.hasNext()) {
            String item = it.next();
            if (item.equals("sugar")) stock.remove(item);
            System.out.printf("%-6s cursor=%d size=%d expected=%d modCount=%d%n", item,
                    read(it, itr, "cursor"), stock.size(),
                    read(it, itr, "expectedModCount"),
                    read(stock, AbstractList.class, "modCount"));
        }
        System.out.println("loop ended, salt was never visited: " + stock);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util=ALL-UNNAMED ItrTrace",
        },
        {
          type: "output",
          text: `rice   cursor=1 size=4 expected=0 modCount=0
dal    cursor=2 size=4 expected=0 modCount=0
sugar  cursor=3 size=3 expected=0 modCount=1
loop ended, salt was never visited: [rice, dal, salt]`,
        },
        {
          type: "list",
          items: [
            "`modCount` starts at 0 here because `new ArrayList<>(collection)` copies the elements without counting it as a modification.",
            "After `next()` returned `sugar`, the cursor was 3. Then the remove shrank the size to 3 and bumped `modCount` to 1.",
            "The loop asked `hasNext()`, which is only `cursor != size`: `3 != 3` is false. So the loop **ended normally**, and `next()`, the only method that checks `modCount`, was never called again.",
            "The result looks fine but isn't: `salt` was never visited. If the loop body had been \"remove expired items\", an expired `salt` would have survived silently.",
            "Removing the **last** element is the opposite case: the cursor is 4, the size drops to 3, `4 != 3` is true, so `next()` runs and throws.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Fail-fast is best effort",
          text: "The `ArrayList` Javadoc says it plainly: fail-fast iterators throw `ConcurrentModificationException` on a best-effort basis, and it would be wrong to write a program that depends on it for correctness. The exception exists to catch bugs, not to guarantee safety. The second-to-last case is one hole; another thread changing the list without synchronization is a bigger one, because `modCount` isn't `volatile`.",
        },
        {
          type: "heading",
          text: "Snapshot and weakly consistent iterators",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p 'java.util.concurrent.CopyOnWriteArrayList$COWIterator'
javap -p java.util.concurrent.CopyOnWriteArrayList | grep -E 'array|lock'`,
        },
        {
          type: "output",
          text: `final class java.util.concurrent.CopyOnWriteArrayList$COWIterator<E> implements java.util.ListIterator<E> {
  private final java.lang.Object[] snapshot;
  private int cursor;
  ...
  final transient java.lang.Object lock;
  private volatile transient java.lang.Object[] array;`,
        },
        {
          type: "paragraph",
          text: "That's the whole trick. `CopyOnWriteArrayList` keeps its elements in a `volatile` array, and **every write copies the array**, changes the copy, and swaps the field. The iterator holds a `final` reference to whichever array existed when it was created, its `snapshot`, plus a cursor. No `modCount`, no `expectedModCount`. Writers never touch the old array, so there's nothing to detect.",
        },
        {
          type: "paragraph",
          text: "`ConcurrentHashMap` has no `modCount` field at all (`javap -p` on it finds none, while `HashMap` has `transient int modCount` and its `HashIterator` has `expectedModCount`). Its iterators walk the live table and are **weakly consistent**: they never throw, never return an element twice, reflect the state at some point at or after their creation, and may or may not show changes made during the walk. Both collections belong to the Multithreading track; here I only need their iterator behaviour.",
        },
        {
          type: "heading",
          text: "Spliterator in one paragraph",
        },
        {
          type: "paragraph",
          text: "Since Java 8, every `Iterable` also has a `spliterator()`: a \"splittable iterator\" that can hand off part of its elements to another spliterator with `trySplit()`, and that reports **characteristics** such as `SIZED`, `ORDERED`, `DISTINCT` or `SORTED`. Streams are built on it, and parallel streams use `trySplit` to divide work between threads.",
        },
        {
          type: "paragraph",
          text: "On an `ArrayList` of eight ids, one `trySplit()` gave me two halves, `1 2 3 4` and `5 6 7 8`, each with `estimateSize()` 4, and the spliterator reported `SIZED=true ORDERED=true`. The Streams lesson in the next track goes into it properly.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Attendance.java",
          code: `import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class Attendance {
    public static void main(String[] args) {
        List<String> register = new ArrayList<>(List.of("Aman", "Bela", "Chirag", "Divya"));

        Iterator<String> it = register.iterator();
        while (it.hasNext()) {                 // anyone left to call?
            String student = it.next();        // call the next name
            System.out.println("Present: " + student);
        }
        System.out.println("hasNext now: " + it.hasNext());
        try {
            it.next();                         // past the end
        } catch (java.util.NoSuchElementException e) {
            System.out.println("next() past the end: " + e.getClass().getSimpleName());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Present: Aman
Present: Bela
Present: Chirag
Present: Divya
hasNext now: false
next() past the end: NoSuchElementException`,
        },
        {
          type: "code",
          language: "java",
          title: "Cheat sheet (fragments)",
          code: `for (String s : list) { ... }                 // read-only walk, compiles to an Iterator

Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if (shouldDrop(it.next())) it.remove();    // safe removal during a walk
}

list.removeIf(s -> s.isBlank());              // Java 8: same thing, one line
map.entrySet().removeIf(e -> e.getValue() == 0);

ListIterator<String> li = list.listIterator();
li.next(); li.set("X"); li.add("Y");          // replace, then insert after it
while (li.hasPrevious()) li.previous();       // walk back

it.forEachRemaining(System.out::println);     // Java 8: finish the walk`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Removing safely: Iterator.remove and removeIf",
        },
        {
          type: "paragraph",
          text: "The shopkeeper wants to drop every item with zero stock from his list. Two correct ways:",
        },
        {
          type: "code",
          language: "java",
          title: "SafeRemove.java",
          code: `import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class SafeRemove {
    public static void main(String[] args) {
        List<Integer> stock = new ArrayList<>(List.of(12, 0, 7, 0, 0, 3));

        Iterator<Integer> it = stock.iterator();
        while (it.hasNext()) {
            if (it.next() == 0) {
                it.remove();                    // removes what next() just returned
            }
        }
        System.out.println("Iterator.remove: " + stock);

        List<Integer> again = new ArrayList<>(List.of(12, 0, 7, 0, 0, 3));
        boolean changed = again.removeIf(qty -> qty == 0);   // Java 8
        System.out.println("removeIf:        " + again + " changed=" + changed);

        Iterator<Integer> bad = again.iterator();
        try {
            bad.remove();                       // no next() yet
        } catch (IllegalStateException e) {
            System.out.println("remove before next: " + e.getClass().getSimpleName());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Iterator.remove: [12, 7, 3]
removeIf:        [12, 7, 3] changed=true
remove before next: IllegalStateException`,
        },
        {
          type: "list",
          items: [
            "`it.remove()` removes the element at `lastRet` and then sets `expectedModCount = modCount`, so the iterator agrees with the list and keeps going. That's the shopkeeper updating his own clipboard.",
            "`removeIf` does the same job in one line, and on `ArrayList` it's smarter: it marks the elements to drop first, then shifts the survivors down once, instead of shifting after every single removal.",
            "`remove()` without a preceding `next()`, or twice in a row, throws `IllegalStateException` because `lastRet` is `-1`.",
          ],
        },
        {
          type: "heading",
          text: "ListIterator: a playlist editor",
        },
        {
          type: "paragraph",
          text: "A radio jockey walks through tonight's playlist, swaps the ad slot for a song, and slips a welcome message in after the intro, all in one pass:",
        },
        {
          type: "code",
          language: "java",
          title: "ListIteratorDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.ListIterator;

public class ListIteratorDemo {
    public static void main(String[] args) {
        List<String> playlist = new ArrayList<>(List.of("Intro", "Song A", "Ad", "Song B"));

        ListIterator<String> it = playlist.listIterator();
        while (it.hasNext()) {
            int index = it.nextIndex();
            String track = it.next();
            if (track.equals("Ad")) {
                it.set("Song A (remix)");          // replace in place
            } else if (track.equals("Intro")) {
                it.add("Welcome");                 // insert after Intro
            }
            System.out.println(index + " " + track);
        }
        System.out.println(playlist);

        System.out.print("backwards:");
        while (it.hasPrevious()) {
            System.out.print(" " + it.previous());
        }
        System.out.println();
    }
}`,
        },
        {
          type: "output",
          text: `0 Intro
2 Song A
3 Ad
4 Song B
[Intro, Welcome, Song A, Song A (remix), Song B]
backwards: Song B Song A (remix) Song A Welcome Intro`,
        },
        {
          type: "paragraph",
          text: "`add` inserts **before** the cursor, which is just after `Intro`, and the cursor moves past the new element, so the loop doesn't visit `Welcome`. That's why the next index printed is 2, not 1. After the forward walk the cursor sits at the end, so `previous()` walks straight back.",
        },
        {
          type: "heading",
          text: "Maps: changing values is fine, adding keys is not",
        },
        {
          type: "code",
          language: "java",
          title: "MapCme.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class MapCme {
    public static void main(String[] args) {
        Map<String, Integer> stock = new HashMap<>();
        stock.put("rice", 10);
        stock.put("dal", 4);
        stock.put("salt", 0);

        for (String item : stock.keySet()) {
            stock.put(item, stock.get(item) + 1);   // existing key: value change only
        }
        System.out.println("update values: OK, " + new java.util.TreeMap<>(stock));

        try {
            for (String item : stock.keySet()) {
                stock.put(item + "-pack", 1);         // new key: structural change
            }
        } catch (java.util.ConcurrentModificationException e) {
            System.out.println("add keys: " + e.getClass().getSimpleName());
        }
        System.out.println("after the failed loop: " + new java.util.TreeMap<>(stock));

        stock.entrySet().removeIf(e -> e.getKey().endsWith("-pack"));
        System.out.println("removeIf on entrySet: " + new java.util.TreeMap<>(stock));
    }
}`,
        },
        {
          type: "output",
          text: `update values: OK, {dal=5, rice=11, salt=1}
add keys: ConcurrentModificationException
after the failed loop: {dal=5, rice=11, salt=1, salt-pack=1}
removeIf on entrySet: {dal=5, rice=11, salt=1}`,
        },
        {
          type: "list",
          items: [
            "`put` on an existing key only replaces the value. No structural change, no `modCount` bump, no exception. (`entry.setValue(...)` is the cleaner way to do that inside a loop.)",
            "`put` on a new key is structural. The first new key went in, and the iterator's next `next()` threw. The map is left half-updated, with one `salt-pack`, which is the real danger of catching CME instead of fixing the loop. (I printed through a `TreeMap` so the output order is stable; `HashMap`'s own order isn't something to rely on.)",
            "`keySet()`, `values()` and `entrySet()` are views of the map, and `removeIf` on them removes from the map itself.",
          ],
        },
        {
          type: "heading",
          text: "Snapshot iteration with CopyOnWriteArrayList",
        },
        {
          type: "paragraph",
          text: "A token counter at a clinic: while the receptionist calls out the list, new patients arrive and someone leaves. With a copy-on-write list, she keeps reading the list as it was when she started:",
        },
        {
          type: "code",
          language: "java",
          title: "SnapshotDemo.java",
          code: `import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class SnapshotDemo {
    public static void main(String[] args) {
        List<String> queue = new CopyOnWriteArrayList<>(List.of("T1", "T2", "T3"));
        for (String token : queue) {
            if (token.equals("T1")) {
                queue.add("T4");                 // no exception
                queue.remove("T2");
            }
            System.out.println("saw " + token);   // still the old snapshot
        }
        System.out.println("list now: " + queue);

        Iterator<String> it = queue.iterator();
        try {
            it.next();
            it.remove();
        } catch (UnsupportedOperationException e) {
            System.out.println("COW iterator remove: " + e.getClass().getSimpleName());
        }

        Map<String, Integer> seats = new ConcurrentHashMap<>(Map.of("A1", 1, "A2", 1));
        for (String seat : seats.keySet()) {
            seats.put(seat + "-extra", 0);       // no CME; may or may not be seen
        }
        System.out.println("CHM after loop: " + new java.util.TreeSet<>(seats.keySet()));
    }
}`,
        },
        {
          type: "output",
          text: `saw T1
saw T2
saw T3
list now: [T1, T3, T4]
COW iterator remove: UnsupportedOperationException
CHM after loop: [A1, A1-extra, A1-extra-extra, A2, A2-extra]`,
        },
        {
          type: "list",
          items: [
            "The loop printed `T2` even though `T2` had been removed, and didn't print `T4`. It was reading the photo, not the shelf.",
            "The snapshot iterator can't remove, because removing from a photo means nothing. `remove`, `set` and `add` on it all throw `UnsupportedOperationException`.",
            "`ConcurrentHashMap` didn't throw either, but it's not a snapshot: the loop **did** see one of its own new keys, `A1-extra`, and added `A1-extra-extra` for it. It was the same on three runs, but the Javadoc promises nothing about which new keys a weakly consistent iterator sees. Code must not depend on it.",
          ],
        },
        {
          type: "heading",
          text: "Making my own class Iterable",
        },
        {
          type: "paragraph",
          text: "A bakery hands out token numbers 101 to 105. I don't need to store five numbers to loop over them, I just need an iterator that counts:",
        },
        {
          type: "code",
          language: "java",
          title: "Range.java",
          code: `import java.util.Iterator;
import java.util.NoSuchElementException;

public class Range implements Iterable<Integer> {
    private final int from, to;

    Range(int from, int to) { this.from = from; this.to = to; }

    @Override
    public Iterator<Integer> iterator() {
        return new Iterator<>() {
            private int next = from;

            public boolean hasNext() { return next <= to; }

            public Integer next() {
                if (!hasNext()) throw new NoSuchElementException();
                return next++;
            }
        };
    }

    public static void main(String[] args) {
        for (int token : new Range(101, 105)) {       // for-each works on any Iterable
            System.out.print("Token " + token + "  ");
        }
        System.out.println();
    }
}`,
        },
        {
          type: "output",
          text: "Token 101  Token 102  Token 103  Token 104  Token 105  ",
        },
        {
          type: "paragraph",
          text: "Because `iterator()` returns a **new** iterator each time, the same `Range` can be looped over many times. `remove()` isn't implemented, so it falls back to the default in `Iterator`, which throws `UnsupportedOperationException`. And `next()` past the end throws `NoSuchElementException`, as the interface requires.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Calling list.remove inside a for-each loop",
        },
        {
          type: "paragraph",
          text: "The classic, shown above: it throws for most positions, and silently skips the last element when removing the second-to-last. Use `Iterator.remove()` or `removeIf`.",
        },
        {
          type: "heading",
          text: "Removing in a forward index loop",
        },
        {
          type: "paragraph",
          text: "Switching to an index loop avoids the exception but brings a quieter bug:",
        },
        {
          type: "code",
          language: "java",
          title: "IndexSkip.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class IndexSkip {
    public static void main(String[] args) {
        List<Integer> stock = new ArrayList<>(List.of(5, 0, 0, 8, 0));
        for (int i = 0; i < stock.size(); i++) {
            if (stock.get(i) == 0) {
                stock.remove(i);                 // next element slides into i, then i++
            }
        }
        System.out.println("forward index loop: " + stock);

        List<Integer> again = new ArrayList<>(List.of(5, 0, 0, 8, 0));
        for (int i = again.size() - 1; i >= 0; i--) {
            if (again.get(i) == 0) {
                again.remove(i);                 // going backwards, nothing slides past us
            }
        }
        System.out.println("backward index loop: " + again);
    }
}`,
        },
        {
          type: "output",
          text: `forward index loop: [5, 0, 8]
backward index loop: [5, 8]`,
        },
        {
          type: "paragraph",
          text: "When index 1 is removed, the second `0` slides into index 1, the loop moves on to index 2, and that `0` is never checked. Going backwards works, but `removeIf` is shorter and faster than both.",
        },
        {
          type: "heading",
          text: "Thinking CME is about threads",
        },
        {
          type: "paragraph",
          text: "The name says \"concurrent\", but every CME in this lesson happened on a single thread. It means \"modified while being iterated\", by anyone. The reverse is also true: two threads sharing an `ArrayList` without locking may never see a CME at all, just corrupt data, because the check is best effort.",
        },
        {
          type: "heading",
          text: "Catching ConcurrentModificationException",
        },
        {
          type: "paragraph",
          text: "The map example left a half-applied change behind when the exception fired. Catching CME and moving on hides a bug and keeps the damage. Fix the loop instead: collect changes in a separate list and apply them after the loop, or use `removeIf`, `replaceAll` or `computeIfPresent`.",
        },
        {
          type: "heading",
          text: "Reusing an exhausted iterator",
        },
        {
          type: "paragraph",
          text: "An iterator is one walk. After the attendance loop, `hasNext()` stayed `false` and `next()` threw `NoSuchElementException`. To walk again, ask the collection for a new iterator.",
        },
        {
          type: "heading",
          text: "Expecting a silent skip to be harmless",
        },
        {
          type: "paragraph",
          text: "I tried an event publisher with listeners in a plain `ArrayList`, where a one-time listener unsubscribes itself while being notified. It sat in the middle of three listeners, so its removal was the second-to-last case, and the result was no exception and a missing notification:",
        },
        {
          type: "output",
          text: `email sent for ORD-1
first-order coupon for ORD-1
email sent for ORD-2
stock updated for ORD-2`,
        },
        {
          type: "paragraph",
          text: "\"stock updated\" never ran for `ORD-1`. The same code with `CopyOnWriteArrayList` is in the production section below and prints all three. That's the version of this bug that reaches production, because nothing crashes.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use for-each for reading. Switch to an explicit `Iterator` only when I need `remove()`, and to `ListIterator` when I need `set`, `add` or backwards movement.",
            "Prefer `removeIf` over hand-written removal loops. It's shorter, it can't hit the CME or skip bugs, and on `ArrayList` it's linear instead of quadratic.",
            "To change values while iterating a map, use `entry.setValue(...)` or `map.replaceAll(...)`. To add keys, collect them first and `putAll` after the loop.",
            "Never catch `ConcurrentModificationException` as a way to handle it. It's a bug report.",
            "When a collection is iterated much more often than it's changed and must tolerate changes during iteration (listener lists, config lists), use `CopyOnWriteArrayList`.",
            "For maps shared between threads, use `ConcurrentHashMap` and accept that its iterators are weakly consistent. Don't make decisions that assume the loop saw every concurrent change.",
            "In my own `Iterator` implementations, throw `NoSuchElementException` from `next()` at the end, and return a new iterator from every `iterator()` call.",
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
            "Iterating an `ArrayList` or `ArrayDeque` is a walk through a contiguous array, which is friendly to the CPU cache. `LinkedList` and tree iterators chase pointers from node to node, which is slower per element even though it's still O(n).",
            "Never loop over a `LinkedList` with `get(i)`. Each `get` walks from the nearer end, so the loop is O(n²). An iterator (or for-each) is O(n).",
            "Iterating a `HashMap` costs O(capacity + size), not O(size): the iterator visits every bucket, empty or not. A huge map that was emptied out is still slow to iterate until it's rebuilt.",
            "`Iterator.remove()` on an `ArrayList` shifts every element after it, so removing many elements one by one is O(n²) in the worst case. `removeIf` does one shifting pass, O(n).",
            "A for-each over an array has no iterator object at all, as `javap` showed. Over a collection there is one small iterator object per loop, which escape analysis often removes in hot code.",
            "`CopyOnWriteArrayList` makes iteration free of locks and checks, but every write copies the whole array: O(n) per `add`. It's for read-mostly data only.",
          ],
        },
      ],
    },
    {
      title: "Iterators in Production",
      blocks: [
        {
          type: "paragraph",
          text: "An order service lets other parts of the system subscribe to \"order placed\" events: email, stock, and a one-time first-order coupon that unsubscribes itself after firing once. Listeners can come and go while an event is being delivered, and reads (every order) vastly outnumber writes (subscriptions). That's the textbook case for `CopyOnWriteArrayList`.",
        },
        {
          type: "code",
          language: "java",
          title: "OrderEvents.java",
          code: `import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class OrderEvents {
    interface Listener { void onOrder(String orderId); }

    private final List<Listener> listeners = new CopyOnWriteArrayList<>();

    void subscribe(Listener l)   { listeners.add(l); }
    void unsubscribe(Listener l) { listeners.remove(l); }

    void publish(String orderId) {
        for (Listener l : listeners) {       // iterates a snapshot: safe to (un)subscribe
            l.onOrder(orderId);
        }
    }

    public static void main(String[] args) {
        OrderEvents events = new OrderEvents();
        events.subscribe(id -> System.out.println("email sent for " + id));
        events.subscribe(new Listener() {      // a one-time welcome offer
            public void onOrder(String id) {
                System.out.println("first-order coupon for " + id);
                events.unsubscribe(this);       // removes itself mid-loop
            }
        });
        events.subscribe(id -> System.out.println("stock updated for " + id));

        events.publish("ORD-1");
        events.publish("ORD-2");
    }
}`,
        },
        {
          type: "output",
          text: `email sent for ORD-1
first-order coupon for ORD-1
stock updated for ORD-1
email sent for ORD-2
stock updated for ORD-2`,
        },
        {
          type: "list",
          items: [
            "All three listeners ran for `ORD-1`, even though one removed itself in the middle. The loop was walking the snapshot.",
            "For `ORD-2`, the coupon listener was gone. New subscribers are picked up on the next `publish`, not the current one.",
            "With a plain `ArrayList` this exact program skipped \"stock updated for ORD-1\", as shown in Common Mistakes, with no exception. That's why the collection type here is a correctness decision, not a style one.",
            "It's also thread-safe, which matters as soon as subscriptions happen from other threads. The thread-safety side of `CopyOnWriteArrayList` is covered in the Multithreading track.",
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
              question: "What's the difference between Iterable and Iterator?",
              answer:
                "`Iterable` is something that can be walked: it has an `iterator()` method that returns a fresh `Iterator` each time, and it's what the for-each loop needs. `Iterator` is one walk in progress, with `hasNext()`, `next()` and optionally `remove()`.\n\n`Collection` extends `Iterable`, so every list, set and queue works in a for-each. An iterator is single-use: once `hasNext()` is false, I ask the collection for a new one.",
            },
            {
              question: "What does a for-each loop compile to?",
              answer:
                "Over a collection, an iterator loop. `javap -c` showed `invokeinterface List.iterator`, then a loop of `Iterator.hasNext` and `Iterator.next`, plus a `checkcast` for the generic type and `intValue()` for unboxing.\n\nOver an array, it compiles to a plain index loop with `arraylength` and `iaload`, no iterator at all. Since the iterator in a for-each is a hidden local, I can't call `remove()` on it, which is why removal needs an explicit `Iterator`.",
            },
            {
              question: "How is ListIterator different from Iterator?",
              answer:
                "It works only on lists and adds backwards movement (`hasPrevious`, `previous`), index queries (`nextIndex`, `previousIndex`), and in-place editing: `set` replaces the last returned element and `add` inserts at the cursor.\n\nIn my playlist example I replaced an ad with `set` and inserted a welcome track with `add` in a single forward pass, then walked back with `previous()` from the end.",
            },
            {
              question: "How do you safely remove elements from a list while iterating?",
              answer:
                "Use `Iterator.remove()` on an explicit iterator, or `Collection.removeIf` since Java 8. Both keep the iterator and the list in agreement.\n\n`removeIf` is the one I reach for: shorter, and on `ArrayList` it does one shifting pass instead of one per removal. For maps, `map.entrySet().removeIf(...)` or `map.values().removeIf(...)`.",
            },
            {
              question: "What is a fail-fast iterator?",
              answer:
                "An iterator that throws `ConcurrentModificationException` as soon as it notices the collection was structurally modified by anything other than itself after it was created. The iterators of `ArrayList`, `HashMap`, `HashSet`, `TreeMap` and most `java.util` collections are fail-fast.\n\nThe point is to stop early with a clear error instead of returning duplicates, skipping elements or reading past the end. It's documented as best effort, so it's a bug detector, not a guarantee.",
            },
            {
              question: "What is a fail-safe iterator? Give examples.",
              answer:
                "Informally, an iterator that doesn't throw when the collection changes during the walk. `CopyOnWriteArrayList` gives a snapshot iterator that reads the array as it was when the iterator was created. `ConcurrentHashMap` gives a weakly consistent iterator that walks live data and may or may not see concurrent changes.\n\nThe Javadoc doesn't use \"fail-safe\"; it says snapshot and weakly consistent. In my test, a COW loop still printed an element that had been removed, and a CHM loop saw some of its own new keys.",
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
              question: "Removing an element inside a for-each loop sometimes doesn't throw. When, and why?",
              answer:
                "When the removed element is the second-to-last one. After `next()` returns it, the cursor equals `size - 1`. The removal shrinks the size by one, so now cursor equals size, `hasNext()` returns false, and the loop ends without ever calling `next()`, which is the only place that checks `modCount`.\n\nI traced it with reflection: cursor 3, size 3, loop over. The last element was never visited, so a loop meant to remove all expired items would leave one behind silently.",
            },
            {
              question: "Can you get ConcurrentModificationException with a single thread?",
              answer:
                "Yes, and that's the usual case. It means the collection was modified during iteration by something other than the iterator, and the culprit is usually the loop body itself calling `list.remove` or `map.put` with a new key.\n\nEvery CME in my examples was single-threaded. With multiple threads it's actually less reliable, because `modCount` isn't volatile and the check is best effort.",
            },
            {
              question: "Does calling set() or put() on an existing key during iteration cause CME?",
              answer:
                "No. Those aren't structural changes: the size and layout stay the same, so `modCount` isn't incremented. I checked: `set` left `modCount` at 3, and updating every existing key's value in a `HashMap` loop worked fine.\n\nAdding a new key is structural, and in my test the next `next()` threw. Sorting an `ArrayList` also counts, because `ArrayList.sort` increments `modCount` on purpose.",
            },
            {
              question: "Why does a forward index loop that removes elements give wrong results?",
              answer:
                "Because removing at index `i` shifts every later element one place left, then the loop increments `i` and skips the element that slid into position `i`. Two adjacent matches means the second survives.\n\nIn my run, removing zeros from `[5, 0, 0, 8, 0]` going forward left `[5, 0, 8]`. Looping backwards fixes it, and `removeIf` is simpler still.",
            },
            {
              question: "Why does CopyOnWriteArrayList's iterator not support remove()?",
              answer:
                "Because it iterates a snapshot, an old copy of the array that writers never touch. Removing from the snapshot would change nothing in the live list, and removing from the live list by position could hit the wrong element if the list changed since the snapshot.\n\nSo `remove`, `set` and `add` on its iterator throw `UnsupportedOperationException`, which I saw. To remove, I call `list.remove(o)` or `list.removeIf(...)` directly; each one copies the array once.",
            },
            {
              question: "Is it a good idea to catch ConcurrentModificationException and retry?",
              answer:
                "No. It's a signal of a programming error, and by the time it's thrown the collection may already be partly modified. In my map test, one new key had been inserted before the exception, so the catch left the map half-updated.\n\nThe fix is in the loop: `removeIf`, `Iterator.remove`, collecting changes and applying them afterwards, or a concurrent collection if threads are really involved.",
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
              question: "How does fail-fast work internally?",
              answer:
                "The collection keeps a `modCount` field (in `AbstractList` for lists, in `HashMap` itself for maps) that structural operations increment. The iterator copies it into `expectedModCount` when it's created. `next()` and `remove()` call `checkForComodification()`, which throws `ConcurrentModificationException` if the two differ.\n\n`javap -p 'java.util.ArrayList$Itr'` shows the fields `cursor`, `lastRet` and `expectedModCount`, and `javap -c` shows the comparison and the `athrow`. `Iterator.remove()` re-syncs `expectedModCount` after removing, which is why it's safe.",
            },
            {
              question: "What fields does ArrayList's iterator have, and what does each do?",
              answer:
                "`cursor`, the index of the next element to return. `lastRet`, the index of the last returned element, or -1, which `remove()` uses and resets. `expectedModCount`, the snapshot of the list's `modCount`. And `this$0`, the hidden reference to the owning list, since `Itr` is an inner class.\n\n`hasNext()` is just `cursor != size`, without any `modCount` check. That detail is exactly what makes the second-to-last removal end the loop quietly.",
            },
            {
              question: "How does CopyOnWriteArrayList avoid ConcurrentModificationException?",
              answer:
                "Every write copies the backing array, changes the copy, and publishes it through a `volatile` field. The iterator holds a `final Object[] snapshot` taken at creation plus a cursor, and `javap -p` shows nothing else, no `modCount`. Since nobody ever modifies an array after it's published, there's nothing to detect.\n\nThe cost is O(n) per write and extra garbage, so it suits read-mostly data like listener lists.",
            },
            {
              question: "What does weakly consistent mean for ConcurrentHashMap iterators?",
              answer:
                "They never throw `ConcurrentModificationException`, they never return the same element twice, they reflect the map's state at some point at or after their creation, and they may or may not reflect changes made after that. There's no `modCount` in `ConcurrentHashMap` at all.\n\nIn my test, a loop that added a key per key it visited ended up seeing one of its own additions. That's allowed, and it's why logic must never depend on whether a weakly consistent iterator saw a concurrent change.",
            },
            {
              question: "What is a Spliterator and how is it related to Iterator?",
              answer:
                "A splittable iterator, added in Java 8 for streams. Besides walking elements with `tryAdvance` and `forEachRemaining`, it can split off part of its range with `trySplit()` so another thread can process it, and it reports characteristics such as `SIZED`, `ORDERED`, `SORTED` and `DISTINCT` that let the stream library skip work.\n\nEvery `Iterable` has a default `spliterator()`. On an `ArrayList` of 8 elements, `trySplit()` gave me halves of 4 and 4. Parallel streams are built on exactly that.",
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
            "Write a for-each loop over a `List<String>` and over a `String[]`, compile, and run `javap -c`. Find `Iterator.hasNext` in one and `arraylength` in the other.",
            "Make a list of five names and, in a for-each loop, remove the name at each position in turn (one run per position). Predict which runs throw before you run them. Hint: watch the second-to-last.",
            "Rewrite the removal with `Iterator.remove()`, then with `removeIf`. Check that both give the same list.",
            "Use a `ListIterator` to uppercase every name in place with `set`, then walk the list backwards with `previous()`.",
            "Loop over a `HashMap`'s `keySet()` and change values for existing keys. Then add a new key in the loop and read the exception. Then do the same on a `ConcurrentHashMap`.",
            "Write a `Countdown implements Iterable<Integer>` that yields 10 down to 1, and use it in a for-each loop. Hint: return a new anonymous `Iterator` from `iterator()`.",
            "Run `ModCountPeek` with and without `--add-opens java.base/java.util=ALL-UNNAMED` and read the error you get without it.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ITERABLE      iterator()  -> anything usable in for-each
ITERATOR      hasNext() next() remove()     one walk, forward only
LISTITERATOR  + previous() set() add() nextIndex()   lists only

FOR-EACH      collection -> iterator()/hasNext()/next() loop
              array      -> plain index loop, no iterator

FAIL-FAST     ArrayList, HashMap, HashSet, TreeMap ...
              modCount++ on structural change (add/remove/clear/sort)
              iterator keeps expectedModCount
              next()/remove() check -> ConcurrentModificationException
              hasNext() = cursor != size   (no check!)
              remove 2nd-to-last in for-each -> no CME, last skipped

SAFE REMOVAL  iterator.remove()   collection.removeIf(...)
              map.entrySet().removeIf(...)   entry.setValue(...)

SNAPSHOT      CopyOnWriteArrayList: iterates old array, never throws,
              iterator.remove() unsupported, O(n) writes
WEAKLY CONS.  ConcurrentHashMap: live walk, never throws,
              may or may not see concurrent changes

SPLITERATOR   trySplit() + characteristics, the base of streams`,
          caption: "Iterators on one screen.",
        },
        {
          type: "list",
          items: [
            "A for-each over a collection is an iterator loop, so it inherits every iterator rule, including fail-fast.",
            "ConcurrentModificationException is a single-threaded bug detector built on `modCount`, and it's best effort: the second-to-last removal slips through and silently skips the last element.",
            "Remove with `Iterator.remove` or `removeIf`. Use snapshot or weakly consistent iterators when changes during iteration are expected, and know which one you've got.",
          ],
        },
      ],
    },
  ],
};
