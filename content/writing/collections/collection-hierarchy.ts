import type { Lesson } from "../types";

export const collectionHierarchy: Lesson = {
  slug: "collection-hierarchy",
  date: "2026-10-29",
  title: "The Collection Hierarchy",
  description:
    "Why Java has a collections framework at all, how Iterable, Collection, List, Set, Queue, Deque and the separate Map tree fit together, what each interface promises, and how to pick the right type to declare, checked with reflection and javap on JDK 21.",
  tags: ["Collections", "Core Java", "Data Structures"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "My phone already uses every kind of collection. My music playlist keeps songs in order and happily plays the same song twice. My contacts never show the same person twice. My phone book lets me type a name and get a number back.",
        },
        {
          type: "paragraph",
          text: "Java's collections framework is just a set of ready-made containers for those same jobs. A **`List`** keeps things in order and allows repeats. A **`Set`** keeps each thing only once. A **`Map`** stores pairs, a key (like a name) and its value (like a number), and finds the value from the key.",
        },
        {
          type: "paragraph",
          text: "I use them instead of plain arrays because they grow and shrink on their own, and because they already know how to search, sort and remove, so I don't have to write that code myself.",
        },
        {
          type: "code",
          language: "java",
          code: `List<String> playlist = new ArrayList<>(List.of("Song A", "Song B", "Song A"));
Set<String> contacts = new HashSet<>(List.of("Ravi", "Asha", "Ravi"));
Map<String, String> phoneBook = new HashMap<>();
phoneBook.put("Ravi", "98300 11111");
System.out.println(playlist.size());          // repeats allowed
System.out.println(contacts.size());          // repeats dropped
System.out.println(phoneBook.get("Ravi"));    // look up by name`,
        },
        {
          type: "output",
          text: `3
2
98300 11111`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "Need order and repeats? `List`. Need each thing once? `Set`. Need to look something up by a key? `Map`.",
        },
      ],
    },
    {
      title: "What the Collections Framework Is",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a small bookshelf at home. When I buy a new book, I just slide it in. When I give one away, the others close the gap. I never ask the shelf \"how many books will you ever hold?\" before I start using it.",
        },
        {
          type: "paragraph",
          text: "An array is the opposite kind of shelf. It's a box with a fixed number of slots, decided the moment it's created. If I made room for three books, the fourth one doesn't fit. I have to build a bigger box and move every book across by hand. Removing a book from the middle leaves a hole that I have to close myself.",
        },
        {
          type: "code",
          language: "java",
          title: "ArrayVsList.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ArrayVsList {
    public static void main(String[] args) {
        String[] shelf = new String[3];          // size fixed forever
        shelf[0] = "Java"; shelf[1] = "SQL"; shelf[2] = "Git";
        try {
            shelf[3] = "Docker";
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("array: " + e.getMessage());
        }
        String[] bigger = Arrays.copyOf(shelf, 4);   // the manual fix
        bigger[3] = "Docker";
        System.out.println("array copy: " + Arrays.toString(bigger));

        List<String> books = new ArrayList<>(List.of("Java", "SQL", "Git"));
        books.add("Docker");                      // just grows
        books.remove("SQL");                      // and closes the gap
        System.out.println("list: " + books + ", size " + books.size());
        System.out.println("contains Git? " + books.contains("Git"));
    }
}`,
        },
        {
          type: "output",
          text: `array: Index 3 out of bounds for length 3
array copy: [Java, SQL, Git, Docker]
list: [Java, Git, Docker], size 3
contains Git? true`,
        },
        {
          type: "paragraph",
          text: "The **Collections Framework** is the set of ready-made containers in `java.util` that do that bookkeeping for me. It has three layers: **interfaces** that describe what a container promises (`List`, `Set`, `Queue`, `Map`), **implementations** that keep those promises in different ways (`ArrayList`, `HashSet`, `ArrayDeque`, `HashMap`), and **algorithms** that work on any of them (sorting, searching, shuffling in the `Collections` class).",
        },
        {
          type: "paragraph",
          text: "This lesson is the map of the whole thing. The next lessons open individual implementations up and look at their internals. Here I want to know which interface promises what, how they're related, and which type I should actually write on the left-hand side of `=`.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 (1996) shipped with only a handful of containers: `Vector` (a growable array), `Stack` (built on `Vector`), `Hashtable` (key to value), and `Enumeration` for walking through them. They worked, but they had no common interface. Code written for a `Vector` couldn't accept a `Hashtable`'s keys without copying, and every method was `synchronized` whether you needed it or not.",
        },
        {
          type: "paragraph",
          text: "Java 1.2 (1998) introduced the Collections Framework, designed mainly by Joshua Bloch. It added the interfaces `Collection`, `List`, `Set`, `SortedSet`, `Map` and `SortedMap`, the modern implementations `ArrayList`, `LinkedList`, `HashSet`, `TreeSet`, `HashMap` and `TreeMap`, and the `Iterator`. The old classes were retrofitted to implement the new interfaces, which is why `Vector` is a `List` today.",
        },
        {
          type: "paragraph",
          text: "After that it kept growing, one release at a time:",
        },
        {
          type: "table",
          headers: ["Version", "What came in"],
          rows: [
            ["Java 5 (2004)", "Generics (`List<String>`), the for-each loop, `java.lang.Iterable`, `Queue`, `PriorityQueue`, `EnumSet`, `EnumMap`"],
            ["Java 6 (2006)", "`Deque`, `ArrayDeque`, `NavigableSet`, `NavigableMap`"],
            ["Java 8 (2014)", "Default methods: `stream()`, `forEach`, `removeIf`, `Map.merge`, `computeIfAbsent`"],
            ["Java 9 (2017)", "Immutable factories `List.of`, `Set.of`, `Map.of`"],
            ["Java 10 (2018)", "`List.copyOf`, `Set.copyOf`, `Map.copyOf`"],
            ["Java 21 (2023)", "Sequenced collections (JEP 431): `SequencedCollection`, `SequencedSet`, `SequencedMap` with `getFirst`, `getLast`, `reversed`"],
          ],
        },
        {
          type: "paragraph",
          text: "The Java 21 change matters for this lesson, because it changed the hierarchy itself. On JDK 21, `List` no longer extends `Collection` directly. It extends `SequencedCollection`, which extends `Collection`. Plenty of older diagrams don't show that yet.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a neighbourhood library. Each container type is one thing the library already uses every day:",
        },
        {
          type: "list",
          items: [
            "**List** is the bookshelf. Books stand in a row, each in a numbered position. Two copies of the same book can stand next to each other. I can say \"give me the third book\".",
            "**Set** is the membership register. Each member appears once. Writing my name in again doesn't add a second line, and nobody asks \"who is member number three?\".",
            "**Queue** is the line at the issue counter, like the line at a tea stall. People join at the back and are served from the front.",
            "**Deque** is a line that's open at both ends, like a cab stand where a priority cab can be put at the front, or a stack of returned books where the last one dropped on the pile is the first one picked up.",
            "**Map** is the card catalogue. Each card number (the key) leads to exactly one book record (the value). It isn't a pile of books at all, it's a lookup from one thing to another.",
          ],
        },
        {
          type: "paragraph",
          text: "The catalogue is the odd one out, and that's exactly how Java models it: `Map` lives in its own tree and is not a `Collection`. A bookshelf, a register and a queue all hold single items. A catalogue holds pairs.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/collections/collection-hierarchy.svg",
          alt: "Java Collections Framework hierarchy: Iterable to Collection to List, Set and Queue with their main classes, and Map as a separate tree with HashMap, LinkedHashMap and TreeMap.",
          caption: "Two family trees: everything under `Collection` holds items, while `Map` holds key → value pairs and is **not** a `Collection`.",
        },
        {
          type: "heading",
          text: "The two trees",
        },
        {
          type: "diagram",
          text: `Iterable<E>
 └─ Collection<E>
     ├─ SequencedCollection<E>      (Java 21)
     │   ├─ List<E>
     │   ├─ Deque<E>                (also extends Queue)
     │   └─ SequencedSet<E>         (also extends Set)
     ├─ Set<E>
     │   └─ SortedSet<E>            (also extends SequencedSet)
     │       └─ NavigableSet<E>
     └─ Queue<E>
         └─ Deque<E>

Map<K,V>                            (not a Collection)
 └─ SequencedMap<K,V>               (Java 21)
     └─ SortedMap<K,V>
         └─ NavigableMap<K,V>

 Implementations
   List   : ArrayList  LinkedList  (Vector, Stack: legacy)
   Set    : HashSet  LinkedHashSet  TreeSet  EnumSet
   Queue  : PriorityQueue  ArrayDeque  LinkedList
   Map    : HashMap  LinkedHashMap  TreeMap  EnumMap  (Hashtable: legacy)`,
          caption:
            "Collection and Map are separate roots. Interfaces can have several parents, so Deque appears twice. LinkedList shows up twice in the implementations because it is both a List and a Deque.",
        },
        {
          type: "heading",
          text: "What each interface promises",
        },
        {
          type: "table",
          headers: ["Interface", "Promise", "Signature methods"],
          rows: [
            ["`Iterable<T>`", "You can walk through me with for-each", "`iterator()`, `forEach`"],
            ["`Collection<E>`", "A group of single elements", "`add`, `remove`, `contains`, `size`, `isEmpty`, `stream`"],
            ["`List<E>`", "Ordered by position, duplicates allowed", "`get(int)`, `set(int, E)`, `add(int, E)`, `indexOf`, `subList`"],
            ["`Set<E>`", "No two elements are `equals`", "Same as `Collection`, but `add` returns `false` for a duplicate"],
            ["`SortedSet` / `NavigableSet`", "A set kept in sorted order", "`first`, `last`, `headSet`, `floor`, `ceiling`"],
            ["`Queue<E>`", "Hold elements for processing, usually FIFO", "`offer`, `poll`, `peek` (and `add`, `remove`, `element`)"],
            ["`Deque<E>`", "A queue usable from both ends, also a stack", "`addFirst`, `pollLast`, `push`, `pop`"],
            ["`SequencedCollection<E>` (21)", "Has a defined first and last element", "`getFirst`, `getLast`, `addFirst`, `removeLast`, `reversed`"],
            ["`Map<K,V>`", "Each key maps to at most one value", "`put`, `get`, `containsKey`, `keySet`, `entrySet`, `merge`"],
          ],
        },
        {
          type: "heading",
          text: "Generics: telling the container what it holds",
        },
        {
          type: "paragraph",
          text: "Every interface has a type parameter. `List<String>` means \"a list of strings\", and the compiler then refuses to put an `Integer` in it and lets me read elements back without a cast. Collections only hold references, so primitives go in boxed: a `List<Integer>`, never a `List<int>`. When I write `list.add(120)`, the compiler quietly turns it into `list.add(Integer.valueOf(120))`.",
        },
        {
          type: "heading",
          text: "Collection versus Collections",
        },
        {
          type: "paragraph",
          text: "`Collection` (singular) is the interface at the root of the single-element tree. `Collections` (plural) is a final utility class full of static helper methods: `sort`, `max`, `reverse`, `shuffle`, `frequency`, `unmodifiableList`, `synchronizedList`, `emptyList`. Same idea as `Array` versus `Arrays`, and `Object` versus `Objects`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Asking the JDK for the real hierarchy",
        },
        {
          type: "paragraph",
          text: "Diagrams in books are often out of date, so I asked the classes themselves. `Class.getInterfaces()` returns the interfaces a class or interface directly extends, so a small recursive printer walks the whole tree:",
        },
        {
          type: "code",
          language: "java",
          title: "WhoIsWho.java",
          code: `import java.util.*;

public class WhoIsWho {
    static void print(Class<?> c, String indent) {
        System.out.println(indent + c.getSimpleName());
        for (Class<?> i : c.getInterfaces()) {
            print(i, indent + "  ");
        }
    }

    public static void main(String[] args) {
        print(ArrayList.class, "");
        System.out.println();
        print(ArrayDeque.class, "");
        System.out.println();
        print(HashMap.class, "");
    }
}`,
        },
        {
          type: "output",
          text: `ArrayList
  List
    SequencedCollection
      Collection
        Iterable
  RandomAccess
  Cloneable
  Serializable

ArrayDeque
  Deque
    Queue
      Collection
        Iterable
    SequencedCollection
      Collection
        Iterable
  Cloneable
  Serializable

HashMap
  Map
  Cloneable
  Serializable`,
        },
        {
          type: "list",
          items: [
            "`List` sits on `SequencedCollection` on JDK 21, not straight on `Collection`.",
            "`Deque` extends two interfaces, `Queue` and `SequencedCollection`, so `Collection` appears twice in its tree. Interfaces can have several parents; classes can't.",
            "`HashMap` implements `Map`, and `Map` extends nothing. There is no `Collection` or `Iterable` anywhere above it. That's why `for (String k : map)` doesn't compile, and I loop over `map.keySet()` or `map.entrySet()` instead.",
            "`RandomAccess` is a **marker interface** with no methods. It tells algorithms \"index access is fast here\". `LinkedList` doesn't have it, and `Collections.binarySearch` checks for it to choose its strategy.",
          ],
        },
        {
          type: "heading",
          text: "Abstract methods and default methods",
        },
        {
          type: "paragraph",
          text: "`javap` on an interface lists what an implementation must write (abstract) and what it gets for free (default). This is trimmed from `javap java.util.Collection` on JDK 21:",
        },
        {
          type: "output",
          text: `public interface java.util.Collection<E> extends java.lang.Iterable<E> {
  public abstract int size();
  public abstract boolean isEmpty();
  public abstract boolean contains(java.lang.Object);
  public abstract java.util.Iterator<E> iterator();
  public abstract boolean add(E);
  public abstract boolean remove(java.lang.Object);
  ...
  public default boolean removeIf(java.util.function.Predicate<? super E>);
  public default java.util.Spliterator<E> spliterator();
  public default java.util.stream.Stream<E> stream();
  public default java.util.stream.Stream<E> parallelStream();
}`,
        },
        {
          type: "paragraph",
          text: "Two things surprised me. First, `contains` and `remove` take `Object`, not `E`. That's historical (they were declared before generics) and it means `List<Integer>.remove(\"x\")` compiles and simply returns `false`. Second, `stream()` and `removeIf` are default methods. Java 8 needed them on every collection that already existed, including ones written by other people, and a default method was the only way to add a method to an interface without breaking every class that implements it.",
        },
        {
          type: "paragraph",
          text: "The implementations don't write everything from scratch either. They extend skeletal classes: `ArrayList extends AbstractList`, `HashSet extends AbstractSet`, and both sit on `AbstractCollection`. `javap java.util.AbstractList` shows `public abstract E get(int);` as the only abstract method, plus the `protected transient int modCount` field that every list uses to detect changes during iteration. More on that in the ArrayList lesson.",
        },
        {
          type: "heading",
          text: "Queue's two families of methods",
        },
        {
          type: "paragraph",
          text: "`javap java.util.Queue` shows exactly six methods. They come in pairs that do the same job but fail differently:",
        },
        {
          type: "table",
          headers: ["Job", "Throws on failure", "Returns a special value"],
          rows: [
            ["Insert at the tail", "`add(e)` throws `IllegalStateException` if full", "`offer(e)` returns `false`"],
            ["Remove the head", "`remove()` throws `NoSuchElementException` if empty", "`poll()` returns `null`"],
            ["Look at the head", "`element()` throws `NoSuchElementException`", "`peek()` returns `null`"],
          ],
        },
        {
          type: "paragraph",
          text: "Because `poll` uses `null` to mean \"empty\", most queues refuse to store `null` at all. Otherwise `poll()` returning `null` would be ambiguous. That's the reason behind the `ArrayDeque` and `PriorityQueue` rows in the null table further down.",
        },
        {
          type: "heading",
          text: "Generics disappear at runtime",
        },
        {
          type: "paragraph",
          text: "Generics are a compile-time check. At runtime a `List<String>` and a `List<Integer>` are the same class, and the elements are stored as plain `Object` references. This is called **type erasure**. Before generics, this is what everyone dealt with:",
        },
        {
          type: "code",
          language: "java",
          title: "RawTypes.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class RawTypes {
    @SuppressWarnings({"rawtypes", "unchecked"})
    public static void main(String[] args) {
        List fares = new ArrayList();            // raw: holds Object
        fares.add(120);
        fares.add("150");                         // nothing stops this
        int total = 0;
        try {
            for (Object f : fares) {
                total += (Integer) f;             // cast at every read
            }
        } catch (ClassCastException e) {
            System.out.println("raw list: " + e.getMessage());
        }

        List<Integer> safe = new ArrayList<>();
        safe.add(120);
        // safe.add("150");                     // compile error now
        System.out.println("typed list: " + (safe.get(0) + 30));

        List<String> names = new ArrayList<>();
        System.out.println("same class at runtime? " + (names.getClass() == safe.getClass()));
    }
}`,
        },
        {
          type: "output",
          text: `raw list: class java.lang.String cannot be cast to class java.lang.Integer (java.lang.String and java.lang.Integer are in module java.base of loader 'bootstrap')
typed list: 150
same class at runtime? true`,
        },
        {
          type: "paragraph",
          text: "So where does the type safety go? Into the call sites. I compiled a three-line method and looked at the bytecode:",
        },
        {
          type: "code",
          language: "java",
          title: "Erasure.java",
          code: `List<Integer> fares = new ArrayList<>();
fares.add(120);
int first = fares.get(0);`,
        },
        {
          type: "output",
          text: `       9: bipush        120
      11: invokestatic  #10                 // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      14: invokeinterface #16,  2           // InterfaceMethod java/util/List.add:(Ljava/lang/Object;)Z
      ...
      22: invokeinterface #22,  2           // InterfaceMethod java/util/List.get:(I)Ljava/lang/Object;
      27: checkcast     #11                 // class java/lang/Integer
      30: invokevirtual #26                 // Method java/lang/Integer.intValue:()I`,
        },
        {
          type: "list",
          items: [
            "`List.add` takes `Ljava/lang/Object;`. The list itself has no idea it's meant to hold `Integer`s.",
            "`List.get` returns `Object`, and `javac` inserted the `checkcast Integer` that I used to write by hand.",
            "The `120` was boxed with `Integer.valueOf` before going in, and unboxed with `intValue()` coming out. That boxing is a real cost in hot code, which is why primitive streams exist.",
          ],
        },
        {
          type: "heading",
          text: "Map is a separate tree, but it hands out collections",
        },
        {
          type: "paragraph",
          text: "`Map` isn't a `Collection`, but `javap java.util.Map` shows it can give me three: `keySet()` returns a `Set<K>`, `values()` returns a `Collection<V>`, and `entrySet()` returns a `Set<Map.Entry<K,V>>`. These are **views**, not copies. Removing a key from `keySet()` removes it from the map. That's how a map takes part in for-each loops and streams without being a collection itself.",
        },
        {
          type: "heading",
          text: "The legacy classes, from the inside",
        },
        {
          type: "paragraph",
          text: "`javap -p java.util.Vector` shows `public synchronized boolean add(E)`, `public synchronized E get(int)` and almost every other method marked `synchronized`. `javap java.util.Stack` shows `public class java.util.Stack<E> extends java.util.Vector<E>`, so a `Stack` inherits all of `Vector`'s list methods. And `Hashtable extends Dictionary`, an abstract class from Java 1.0 that predates `Map`. Those three facts explain everything that's awkward about them, which the examples show.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "The same four riders, fed into the four main kinds of container. Each one keeps its own promise:",
        },
        {
          type: "code",
          language: "java",
          title: "Promises.java",
          code: `import java.util.*;

public class Promises {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();
        Set<String> set = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        Map<String, Integer> map = new HashMap<>();

        for (String rider : List.of("Asha", "Ravi", "Asha", "Meena")) {
            list.add(rider);
            set.add(rider);
            queue.offer(rider);
            map.merge(rider, 1, Integer::sum);
        }
        System.out.println("List  keeps order and duplicates: " + list);
        System.out.println("Set   drops the duplicate:        size " + set.size());
        System.out.println("Queue serves the first in line:   " + queue.poll());
        System.out.println("Map   counts by key:              Asha=" + map.get("Asha"));
        System.out.println("list.get(1) = " + list.get(1));
    }
}`,
        },
        {
          type: "output",
          text: `List  keeps order and duplicates: [Asha, Ravi, Asha, Meena]
Set   drops the duplicate:        size 3
Queue serves the first in line:   Asha
Map   counts by key:              Asha=2
list.get(1) = Ravi`,
        },
        {
          type: "code",
          language: "java",
          title: "Cheat sheet (fragments)",
          code: `List<String> a = new ArrayList<>();          // diamond <> infers <String>
List<String> b = List.of("x", "y");           // immutable, no nulls
List<String> c = new ArrayList<>(b);           // mutable copy
Set<Integer> d = new HashSet<>();
Deque<String> e = new ArrayDeque<>();          // queue AND stack
Map<String, Integer> f = new HashMap<>();
for (String s : a) { }                         // any Iterable
for (Map.Entry<String, Integer> en : f.entrySet()) { }`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Order: insertion, sorted, or nobody promised anything",
        },
        {
          type: "paragraph",
          text: "Same five fruit names, with one duplicate, into five containers:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderRules.java",
          code: `import java.util.*;

public class OrderRules {
    public static void main(String[] args) {
        List<String> input = List.of("mango", "apple", "kiwi", "apple", "banana");
        System.out.println("ArrayList     " + new ArrayList<>(input));
        System.out.println("LinkedHashSet " + new LinkedHashSet<>(input));
        System.out.println("TreeSet       " + new TreeSet<>(input));
        System.out.println("HashSet       " + new HashSet<>(input));
        System.out.println("PriorityQueue " + new PriorityQueue<>(input));
    }
}`,
        },
        {
          type: "output",
          text: `ArrayList     [mango, apple, kiwi, apple, banana]
LinkedHashSet [mango, apple, kiwi, banana]
TreeSet       [apple, banana, kiwi, mango]
HashSet       [banana, apple, kiwi, mango]
PriorityQueue [apple, apple, kiwi, mango, banana]`,
        },
        {
          type: "list",
          items: [
            "`ArrayList` keeps exactly what I gave it, duplicates included.",
            "`LinkedHashSet` drops the second `apple` and keeps first-insertion order.",
            "`TreeSet` drops it too and sorts alphabetically.",
            "`HashSet` came out in bucket order. On my JDK this order is stable for these strings, but the `HashSet` contract promises nothing about it, and it can change when the set grows or the JDK changes. Never depend on it.",
            "`PriorityQueue` looks unsorted and that's not a bug. It only guarantees that `poll()` returns the smallest element. Its `toString` shows the internal heap array.",
          ],
        },
        {
          type: "heading",
          text: "Who accepts null",
        },
        {
          type: "code",
          language: "java",
          title: "NullRules.java",
          code: `import java.util.*;

public class NullRules {
    static void tryAdd(String name, Collection<String> c) {
        try {
            c.add(null);
            System.out.println(name + ": null accepted");
        } catch (NullPointerException e) {
            System.out.println(name + ": NullPointerException");
        }
    }

    public static void main(String[] args) {
        tryAdd("ArrayList    ", new ArrayList<>());
        tryAdd("LinkedList   ", new LinkedList<>());
        tryAdd("HashSet      ", new HashSet<>());
        tryAdd("LinkedHashSet", new LinkedHashSet<>());
        tryAdd("TreeSet      ", new TreeSet<>());
        tryAdd("ArrayDeque   ", new ArrayDeque<>());
        tryAdd("PriorityQueue", new PriorityQueue<>());
        tryAdd("Vector       ", new Vector<>());
        try { List.of("a", null); } catch (NullPointerException e) {
            System.out.println("List.of      : NullPointerException");
        }
        Map<String, String> tm = new TreeMap<>();
        try { tm.put(null, "x"); } catch (NullPointerException e) {
            System.out.println("TreeMap key  : NullPointerException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `ArrayList    : null accepted
LinkedList   : null accepted
HashSet      : null accepted
LinkedHashSet: null accepted
TreeSet      : NullPointerException
ArrayDeque   : NullPointerException
PriorityQueue: NullPointerException
Vector       : null accepted
List.of      : NullPointerException
TreeMap key  : NullPointerException`,
        },
        {
          type: "paragraph",
          text: "The pattern behind it: anything that has to **compare** elements (`TreeSet`, `TreeMap`, `PriorityQueue`) can't compare `null` with natural ordering. Anything that uses `null` as a signal (`ArrayDeque.poll()` meaning \"empty\") refuses it. And the Java 9 immutable factories reject `null` on purpose, to stop it spreading.",
        },
        {
          type: "heading",
          text: "The legacy classes and their replacements",
        },
        {
          type: "code",
          language: "java",
          title: "Legacy.java",
          code: `import java.util.*;

public class Legacy {
    public static void main(String[] args) {
        Vector<String> v = new Vector<>();
        v.add("old"); v.add("but working");
        System.out.println("Vector " + v + " capacity " + v.capacity());

        Stack<String> plates = new Stack<>();
        plates.push("plate1"); plates.push("plate2");
        plates.add(0, "sneaked in at the bottom");   // Stack is a Vector, so this compiles
        System.out.println("Stack " + plates + " pop " + plates.pop());

        Deque<String> better = new ArrayDeque<>();
        better.push("plate1"); better.push("plate2");
        System.out.println("ArrayDeque " + better + " pop " + better.pop());

        Hashtable<String, Integer> table = new Hashtable<>();
        try {
            table.put("key", null);
        } catch (NullPointerException e) {
            System.out.println("Hashtable rejects null values");
        }
        HashMap<String, Integer> map = new HashMap<>();
        map.put(null, null);
        System.out.println("HashMap allows " + map);
    }
}`,
        },
        {
          type: "output",
          text: `Vector [old, but working] capacity 10
Stack [sneaked in at the bottom, plate1, plate2] pop plate2
ArrayDeque [plate2, plate1] pop plate2
Hashtable rejects null values
HashMap allows {null=null}`,
        },
        {
          type: "list",
          items: [
            "A pile of plates should only let me touch the top one. `Stack` inherits `add(int, E)` from `Vector`, so I slid a plate in at the bottom. That's a design mistake baked into Java 1.0: `Stack` **is a** `Vector` when it should only **use** one.",
            "`ArrayDeque` used as a stack prints top-first (`[plate2, plate1]`) and has no index-based methods to abuse. The `Stack` Javadoc itself recommends `Deque` instead.",
            "`Hashtable` rejects `null` keys and values. `HashMap` allows one `null` key and any number of `null` values.",
          ],
        },
        {
          type: "heading",
          text: "Collections, the helper class",
        },
        {
          type: "code",
          language: "java",
          title: "CollectionsHelper.java",
          code: `import java.util.*;

public class CollectionsHelper {
    public static void main(String[] args) {
        List<Integer> fares = new ArrayList<>(List.of(340, 120, 90, 210));
        Collections.sort(fares);
        System.out.println("sorted     " + fares);
        System.out.println("max        " + Collections.max(fares));
        Collections.reverse(fares);
        System.out.println("reversed   " + fares);
        System.out.println("frequency  " + Collections.frequency(List.of("a", "b", "a"), "a"));

        List<Integer> readOnly = Collections.unmodifiableList(fares);
        try {
            readOnly.add(500);
        } catch (UnsupportedOperationException e) {
            System.out.println("unmodifiable view refuses add");
        }
        fares.add(500);                       // but the original can still change
        System.out.println("view sees  " + readOnly);
        System.out.println("empty      " + Collections.emptyList());
    }
}`,
        },
        {
          type: "output",
          text: `sorted     [90, 120, 210, 340]
max        340
reversed   [340, 210, 120, 90]
frequency  2
unmodifiable view refuses add
view sees  [340, 210, 120, 90, 500]
empty      []`,
        },
        {
          type: "paragraph",
          text: "The last two lines are the important ones. `unmodifiableList` is a read-only **window** onto the original list, not a frozen copy. Anyone holding the original can still change what the window shows. For a real snapshot I use `List.copyOf(fares)`.",
        },
        {
          type: "heading",
          text: "Declare the interface, pick the class once",
        },
        {
          type: "code",
          language: "java",
          title: "DeclareInterface.java",
          code: `import java.util.*;

public class DeclareInterface {
    // Callers can pass any List; the method only needs List behaviour
    static int countLong(List<String> trips) {
        int count = 0;
        for (String t : trips) if (t.length() > 4) count++;
        return count;
    }

    public static void main(String[] args) {
        List<String> trips = new ArrayList<>(List.of("short", "airport", "mall"));
        System.out.println(countLong(trips));
        trips = new LinkedList<>(trips);          // swap the implementation, nothing else changes
        System.out.println(countLong(trips));
        System.out.println(countLong(List.of("station", "home")));
    }
}`,
        },
        {
          type: "output",
          text: `2
2
1`,
        },
        {
          type: "paragraph",
          text: "`countLong` accepted an `ArrayList`, a `LinkedList` and an immutable `List.of` without a single change, because it asked for the promise (`List`) and not the shelf it's built from. If it had asked for `ArrayList<String>`, the last two calls wouldn't compile.",
        },
        {
          type: "heading",
          text: "First and last, the Java 21 way",
        },
        {
          type: "code",
          language: "java",
          title: "Sequenced.java",
          code: `import java.util.*;

public class Sequenced {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("a", "b", "c"));
        Deque<String> deque = new ArrayDeque<>(List.of("a", "b", "c"));
        LinkedHashSet<String> set = new LinkedHashSet<>(List.of("a", "b", "c"));
        System.out.println(list.getFirst() + " " + deque.getFirst() + " " + set.getFirst());
        System.out.println(list.reversed() + " " + deque.reversed() + " " + set.reversed());
    }
}`,
        },
        {
          type: "output",
          text: `a a a
[c, b, a] [c, b, a] [c, b, a]`,
        },
        {
          type: "paragraph",
          text: "Before Java 21, getting the last element meant `list.get(list.size() - 1)`, `deque.peekLast()`, or a full loop for a `LinkedHashSet`. Now they share one interface, and `reversed()` returns a reversed **view** without copying.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Using raw types",
        },
        {
          type: "paragraph",
          text: "`List list = new ArrayList();` compiles with a warning and moves the type error from compile time to a `ClassCastException` at runtime, as `RawTypes` showed. Always write the type parameter, even if it's `List<Object>`.",
        },
        {
          type: "heading",
          text: "Mixing up Collection and Collections",
        },
        {
          type: "paragraph",
          text: "`Collection` is an interface you implement or declare. `Collections` is a utility class you call static methods on. `Collections.sort(list)` works; `Collection.sort(list)` doesn't exist.",
        },
        {
          type: "heading",
          text: "Expecting HashSet or HashMap to keep order",
        },
        {
          type: "paragraph",
          text: "The output may look stable in a small test, as it did in `OrderRules`, and then change in production when the table resizes. If order matters, say so with the type: `LinkedHashSet`/`LinkedHashMap` for insertion order, `TreeSet`/`TreeMap` for sorted order.",
        },
        {
          type: "heading",
          text: "Treating an unmodifiable view as a copy",
        },
        {
          type: "paragraph",
          text: "`Collections.unmodifiableList(x)` still changes when `x` changes. `List.copyOf(x)` doesn't. Returning the view from a getter protects against the caller but not against the class's own later changes, which is usually fine; just know which one you have.",
        },
        {
          type: "heading",
          text: "Putting null into List.of or a TreeSet",
        },
        {
          type: "paragraph",
          text: "Both throw `NullPointerException`, and in a big pipeline the stack trace points at the factory, not at whoever produced the `null`. Filter `null`s out before building the collection.",
        },
        {
          type: "heading",
          text: "Reaching for Stack, Vector or Hashtable",
        },
        {
          type: "paragraph",
          text: "They still work and still appear in old code and interview questions, but they pay for locking on every call and `Stack` leaks list methods. Use `ArrayDeque` for a stack, `ArrayList` for a list, `HashMap` for a map, and the concurrent collections when threads really share data.",
        },
        {
          type: "heading",
          text: "Declaring the concrete class everywhere",
        },
        {
          type: "paragraph",
          text: "`ArrayList<String> trips = ...` in a field, a parameter and a return type ties every caller to that class. Changing it later becomes a refactor across files instead of one line.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Declare variables, fields, parameters and return types as the interface: `List<T> x = new ArrayList<>()`. Name the class only after `new`.",
            "Accept the widest type the method really needs. If it only loops, `Collection<T>` or even `Iterable<T>` is enough. If it needs `get(i)`, ask for `List<T>`.",
            "Pick by the promise first (duplicates? order? key lookup?), then by the implementation's cost profile.",
            "Start with the defaults: `ArrayList`, `HashSet`, `HashMap`, `ArrayDeque`. Move to `LinkedHashSet`, `TreeSet` or `TreeMap` only when you need their ordering.",
            "Return empty collections, never `null`: `List.of()` or `Collections.emptyList()`. Callers can loop without a null check.",
            "Use `List.of` / `Set.of` / `Map.of` for constants and `List.copyOf` for defensive copies.",
            "For a stack or a queue, use the `Deque` interface with `ArrayDeque`.",
            "Leave thread safety to the concurrent collections (`ConcurrentHashMap`, `CopyOnWriteArrayList`, `BlockingQueue`), which get their own lessons in the Multithreading and Concurrency track.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The interface tells me what's possible. The implementation decides what it costs. These are the standard costs from the JDK documentation and the data structures underneath; each one is opened up in its own lesson.",
        },
        {
          type: "table",
          headers: ["Implementation", "Structure", "add", "get / contains", "remove", "Notes"],
          rows: [
            ["`ArrayList`", "Resizable array", "O(1) amortized at end", "`get(i)` O(1), `contains` O(n)", "O(n) (shifts)", "Best default list"],
            ["`LinkedList`", "Doubly linked nodes", "O(1) at either end", "`get(i)` O(n), `contains` O(n)", "O(1) at ends or via iterator", "Rarely the best choice"],
            ["`HashSet`", "Hash table (a `HashMap`)", "O(1) average", "O(1) average", "O(1) average", "Needs good `hashCode`"],
            ["`LinkedHashSet`", "Hash table + linked list", "O(1) average", "O(1) average", "O(1) average", "Keeps insertion order"],
            ["`TreeSet`", "Red-black tree (a `TreeMap`)", "O(log n)", "O(log n)", "O(log n)", "Sorted, range queries"],
            ["`ArrayDeque`", "Circular array", "O(1) amortized at ends", "`contains` O(n)", "O(1) at ends", "Best queue and stack"],
            ["`PriorityQueue`", "Binary heap in an array", "O(log n)", "`peek` O(1), `contains` O(n)", "`poll` O(log n)", "Smallest first"],
            ["`HashMap`", "Hash table", "O(1) average", "O(1) average", "O(1) average", "Best default map"],
            ["`TreeMap`", "Red-black tree", "O(log n)", "O(log n)", "O(log n)", "Sorted keys"],
          ],
        },
        {
          type: "list",
          items: [
            "Big-O hides constants. An array is one block of memory that the CPU cache loves; linked nodes are scattered objects. That's why `ArrayList` usually beats `LinkedList` even in cases where the Big-O looks equal.",
            "Collections hold references, so a `List<Integer>` stores a pointer to a boxed `Integer` object per element, not the number itself. For millions of numbers, a plain `int[]` or a primitive stream is much lighter.",
            "Hash-based collections are only O(1) when `hashCode` spreads elements across buckets. A bad `hashCode` turns lookups into scans. The HashSet lesson shows what goes wrong.",
            "The legacy synchronized classes take a lock on every call, even in single-threaded code. The JIT can sometimes remove an uncontended lock, but there's no reason to ask for one.",
          ],
        },
      ],
    },
    {
      title: "Collections in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Here's a tiny trip desk for a cab service, the kind of class that sits inside a booking service. It needs four different jobs done, and each job gets the interface that promises exactly that:",
        },
        {
          type: "code",
          language: "java",
          title: "TripDesk.java",
          code: `import java.util.*;

public class TripDesk {
    private final List<String> todaysTrips = new ArrayList<>();      // history, in order
    private final Set<String> uniqueRiders = new HashSet<>();        // who used us today
    private final Deque<String> waiting = new ArrayDeque<>();        // first come, first served
    private final Map<String, String> activeRide = new HashMap<>();  // driver -> rider

    void request(String rider) {
        waiting.offerLast(rider);
        uniqueRiders.add(rider);
    }

    void driverFree(String driver) {
        String rider = waiting.pollFirst();
        if (rider == null) return;                                   // nobody waiting
        activeRide.put(driver, rider);
        todaysTrips.add(rider + " with " + driver);
    }

    public static void main(String[] args) {
        TripDesk desk = new TripDesk();
        desk.request("Asha"); desk.request("Ravi"); desk.request("Asha");
        desk.driverFree("D1"); desk.driverFree("D2");
        System.out.println("trips    " + desk.todaysTrips);
        System.out.println("riders   " + desk.uniqueRiders.size());
        System.out.println("waiting  " + desk.waiting);
        System.out.println("D2 has   " + desk.activeRide.get("D2"));
    }
}`,
        },
        {
          type: "output",
          text: `trips    [Asha with D1, Ravi with D2]
riders   2
waiting  [Asha]
D2 has   Ravi`,
        },
        {
          type: "list",
          items: [
            "The trip history is a `List`: order matters and the same rider can appear many times.",
            "Unique riders is a `Set`: Asha requested twice but counts once.",
            "The waiting line is a `Deque` used as a queue: `offerLast` to join, `pollFirst` to serve, and `null` from `pollFirst` means nobody is waiting.",
            "Who is driving whom is a `Map`: one lookup by driver id.",
            "Every field is declared as the interface. If the waiting line later needs priorities, only `new ArrayDeque<>()` changes.",
          ],
        },
        {
          type: "paragraph",
          text: "In a real service this class would be shared by many request threads, and these collections are not thread-safe. The fix is the concurrent collections or proper locking, which belong to the concurrency track. In a Spring app the long-lived state would also usually live in a database or Redis, not in a field.",
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
              question: "Why use collections instead of arrays?",
              answer:
                "An array has a fixed size and gives me nothing beyond index access. A collection grows and shrinks on its own, closes gaps on removal, and comes with ready-made operations like `contains`, sorting, deduplication and key lookup.\n\nIn my `ArrayVsList` test, writing a fourth item into a three-slot array threw `ArrayIndexOutOfBoundsException`, while the `ArrayList` just grew. Arrays still win for fixed-size primitive data, because a collection can only hold boxed objects.",
            },
            {
              question: "What is the root of the collection hierarchy?",
              answer:
                "`Collection` is the root interface for single-element containers, and it extends `java.lang.Iterable`, which is what makes for-each work. `List`, `Set` and `Queue` all descend from it.\n\n`Map` is not part of that tree at all. It's a separate root. Reflection on `HashMap` shows only `Map`, `Cloneable` and `Serializable`, with no `Collection` or `Iterable` above it.",
            },
            {
              question: "What's the difference between List, Set and Queue?",
              answer:
                "A `List` is ordered by position and allows duplicates, so it has `get(int)` and `indexOf`. A `Set` forbids duplicates, defined by `equals`, and has no positions. A `Queue` holds elements waiting to be processed, usually first in first out, with `offer`, `poll` and `peek`.\n\nIn my `Promises` example the same four names gave a list of four, a set of three, and a queue that handed back the first name.",
            },
            {
              question: "Why doesn't Map extend Collection?",
              answer:
                "Because a map holds key-value pairs, not single elements. `Collection.add(E)` has no sensible meaning for a map: add what, a key without a value?\n\nInstead a map offers three collection views: `keySet()`, `values()` and `entrySet()`. They're live views, so removing from `keySet()` removes from the map.",
            },
            {
              question: "What's the difference between Collection and Collections?",
              answer:
                "`Collection` is the root interface. `Collections` is a utility class with static helpers like `sort`, `max`, `reverse`, `frequency`, `unmodifiableList` and `synchronizedList`.\n\nSame naming pattern as `Arrays` for arrays and `Objects` for objects.",
            },
            {
              question: "Why should I write List<String> list = new ArrayList<>() instead of ArrayList<String> list = new ArrayList<>()?",
              answer:
                "Programming to the interface. Everything after that line only relies on `List` behaviour, so switching to another implementation is a one-word change, and methods that take `List` accept any list, including `List.of`.\n\nIn `DeclareInterface`, one method accepted an `ArrayList`, a `LinkedList` and an immutable list without changes. The exception is when I really need a class-specific method like `ensureCapacity`, which is rare.",
            },
            {
              question: "Which collections are legacy, and what replaces them?",
              answer:
                "`Vector`, `Stack`, `Hashtable` and the `Enumeration` interface, all from Java 1.0. `ArrayList` replaces `Vector`, `ArrayDeque` replaces `Stack`, `HashMap` replaces `Hashtable`, and `Iterator` replaces `Enumeration`.\n\nThey're synchronized on almost every method, which costs something even with one thread. When threads really share data, the modern answer is `ConcurrentHashMap`, `CopyOnWriteArrayList` or a `BlockingQueue`, not the legacy classes.",
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
              question: "Why is Stack considered a badly designed class?",
              answer:
                "Because it extends `Vector`, so it inherits every list operation. A stack should only allow push, pop and peek at the top, but `Stack` lets me call `add(0, x)` or `remove(3)`.\n\nIn my `Legacy` example I inserted a plate at the bottom of a `Stack` and it compiled and ran. Inheritance was used where composition was needed. `ArrayDeque` through the `Deque` interface is the replacement, and the `Stack` Javadoc says so.",
            },
            {
              question: "Which collections allow null, and why do some refuse it?",
              answer:
                "`ArrayList`, `LinkedList`, `HashSet`, `LinkedHashSet`, `HashMap` (one null key) and `Vector` accept it. `TreeSet`, `TreeMap` keys, `PriorityQueue`, `ArrayDeque`, `Hashtable` and the `List.of` family throw `NullPointerException`.\n\nSorted ones can't compare `null` with natural ordering. `ArrayDeque` and `PriorityQueue` use `null` from `poll()` to mean \"empty\", so storing it would be ambiguous. The immutable factories reject it by design. I confirmed every one of these in `NullRules`.",
            },
            {
              question: "Is Collections.unmodifiableList the same as List.copyOf?",
              answer:
                "No. `unmodifiableList` is a read-only view onto the original list. Nobody can change it through the view, but changes to the original show through. `List.copyOf` makes an independent immutable copy.\n\nIn `CollectionsHelper`, adding `500` to the original list made it appear in the unmodifiable view.",
            },
            {
              question: "Why does List<Integer>.remove(\"x\") compile?",
              answer:
                "`Collection.remove`, `contains` and `indexOf` take `Object`, not `E`. They were declared before generics, and it's also legitimately useful to ask \"is this object in here?\" with any object, because `equals` decides.\n\nSo the call compiles and returns `false`. IDEs warn about it, but the compiler doesn't.",
            },
            {
              question: "Why does a PriorityQueue print in a strange order?",
              answer:
                "Because `toString` walks the internal array, which is a binary heap, not a sorted list. The heap only guarantees the smallest element is at the root.\n\nIn `OrderRules` it printed `[apple, apple, kiwi, mango, banana]`. Calling `poll()` repeatedly would return them in sorted order.",
            },
            {
              question: "Can a HashSet's iteration order change while the program runs?",
              answer:
                "Yes. The order comes from which bucket each element lands in, and bucket positions depend on the table size. When the set grows past its threshold, the table doubles and elements can move.\n\nThe contract simply says no order is guaranteed. If a test passes only because of a particular `HashSet` order, the test is fragile.",
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
              question: "What changed in the hierarchy in Java 21?",
              answer:
                "JEP 431 added `SequencedCollection`, `SequencedSet` and `SequencedMap`. `List` and `Deque` now extend `SequencedCollection`, `LinkedHashSet` and `SortedSet` are `SequencedSet`s, and `LinkedHashMap` and `SortedMap` are `SequencedMap`s.\n\nThey give a uniform `getFirst`, `getLast`, `addFirst`, `removeLast` and `reversed()`. Reflection on `ArrayList` on JDK 21 shows `List` then `SequencedCollection` then `Collection`.",
            },
            {
              question: "How do generics work with collections at runtime?",
              answer:
                "They're erased. A `List<String>` and a `List<Integer>` are the same class at runtime, and elements are stored as `Object`. My `RawTypes` program printed `true` for comparing their classes.\n\nThe compiler checks types at compile time and inserts casts at the call sites. In the bytecode, `List.get` returns `Object` and `javac` added `checkcast java/lang/Integer` right after it.",
            },
            {
              question: "Why were stream(), forEach and removeIf added as default methods?",
              answer:
                "To add methods to existing interfaces without breaking every class that already implemented them, including third-party collections. An abstract method would have forced every implementation to add it.\n\n`javap java.util.Collection` shows them as `public default`. Classes like `ArrayList` still override some of them, like `removeIf`, with faster versions.",
            },
            {
              question: "What is the RandomAccess interface for?",
              answer:
                "It's a marker interface with no methods. A list implements it to say \"index access is constant time\". `ArrayList` and `Vector` do, `LinkedList` doesn't.\n\nGeneric algorithms check it with `instanceof`. In `javap -c java.util.Collections`, `binarySearch` starts with `instanceof RandomAccess`: if that's true, or the list has fewer than 5000 elements, it uses index access, otherwise an iterator-based version, so a big linked list doesn't pay an O(n) walk for every probe.",
            },
            {
              question: "What are AbstractList and AbstractCollection for?",
              answer:
                "They're skeletal implementations. They implement most of the interface in terms of a few primitive methods, so a new collection only writes those. For a read-only list, extending `AbstractList` and writing `get` and `size` is enough.\n\n`AbstractList` also owns the `modCount` field that iterators use to detect concurrent modification. `javap` shows it as `protected transient int modCount`.",
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
            "Put `tea, coffee, tea, lassi` into an `ArrayList`, a `LinkedHashSet` and a `TreeSet`. Predict each output before running. Hint: duplicates, then order.",
            "Write `static int countUnique(Collection<String> items)`. Call it with a `List` and with an `ArrayDeque`. Hint: one line, `new HashSet<>(items)`.",
            "Model a tea stall line with `Deque<String>`: three customers join, two are served. Print who's still waiting. Hint: `offer` and `poll`.",
            "Count how many times each order appears with a `Map<String, Integer>`, printed in alphabetical order. Hint: `merge(key, 1, Integer::sum)` and a `TreeMap`.",
            "Try adding `null` to a `TreeSet` and an `ArrayDeque`. Explain in one sentence each why they refuse.",
            "Replace a `Stack<String>` of plates with an `ArrayDeque`. Hint: `push`, `pop`, `peek` keep their names.",
            "Make an `unmodifiableList` view and a `List.copyOf` snapshot of the same list, then add to the original. Which one changed?",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "HierarchySolutions.java (exercises 1 to 4, 6, 7)",
          code: `import java.util.*;

public class HierarchySolutions {
    static int countUnique(Collection<String> items) {
        return new HashSet<>(items).size();
    }

    public static void main(String[] args) {
        List<String> orders = List.of("tea", "coffee", "tea", "lassi");
        System.out.println("1  " + new ArrayList<>(orders) + " " + new LinkedHashSet<>(orders)
            + " " + new TreeSet<>(orders));
        System.out.println("2  " + countUnique(orders) + " " + countUnique(new ArrayDeque<>(orders)));

        Deque<String> stall = new ArrayDeque<>();
        stall.offer("Asha"); stall.offer("Ravi"); stall.offer("Meena");
        System.out.println("3  served " + stall.poll() + ", " + stall.poll() + "; waiting " + stall);

        Map<String, Integer> counts = new TreeMap<>();
        for (String o : orders) counts.merge(o, 1, Integer::sum);
        System.out.println("4  " + counts);

        Deque<String> plates = new ArrayDeque<>();
        plates.push("p1"); plates.push("p2"); plates.push("p3");
        System.out.println("6  " + plates.pop() + " " + plates.peek());

        List<String> menu = new ArrayList<>(List.of("tea"));
        List<String> view = Collections.unmodifiableList(menu);
        List<String> snapshot = List.copyOf(menu);
        menu.add("samosa");
        System.out.println("7  view " + view + ", snapshot " + snapshot);
    }
}`,
        },
        {
          type: "output",
          text: `1  [tea, coffee, tea, lassi] [tea, coffee, lassi] [coffee, lassi, tea]
2  3 3
3  served Asha, Ravi; waiting [Meena]
4  {coffee=1, lassi=1, tea=2}
6  p3 p2
7  view [tea, samosa], snapshot [tea]`,
        },
        {
          type: "qa",
          items: [
            {
              question: "Exercise 5: why do TreeSet and ArrayDeque refuse null?",
              answer:
                "`TreeSet` has to compare every new element with existing ones, and natural ordering calls `compareTo` on it, which can't work on `null`. Even an empty `TreeSet` threw in my test, because it compares the first element with itself as a type check.\n\n`ArrayDeque` uses `null` internally to mark empty slots, and `poll()` returns `null` to mean \"nothing here\". Letting `null` in would make that signal ambiguous.",
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
          text: `ROOTS      Iterable -> Collection      Map (separate tree)
LIST       ordered by index, duplicates ok      ArrayList
SET        no duplicates (equals/hashCode)      HashSet
             insertion order -> LinkedHashSet   sorted -> TreeSet
QUEUE      offer/poll/peek (null = empty)       ArrayDeque, PriorityQueue
DEQUE      both ends; also the stack            ArrayDeque
MAP        key -> one value; keySet/values/entrySet views   HashMap
JAVA 21    SequencedCollection: getFirst getLast reversed

DECLARE    List<T> x = new ArrayList<>();  (interface left, class right)
GENERICS   compile-time only; erased; javac adds checkcast
NULL       no: TreeSet TreeMap-keys ArrayDeque PriorityQueue
               Hashtable List.of/Set.of/Map.of
LEGACY     Vector Stack Hashtable Enumeration -> don't start new code
HELPERS    Collections.sort/max/reverse/unmodifiableList
           unmodifiable = view;  List.copyOf = snapshot`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Choose by the promise first: positions and duplicates (`List`), uniqueness (`Set`), waiting line (`Queue`/`Deque`), lookup by key (`Map`).",
            "Then choose the implementation by cost and ordering, and declare the interface so that choice stays a one-line change.",
            "The next lessons open the main implementations up: `ArrayList` and `LinkedList` first, then the three sets.",
          ],
        },
      ],
    },
  ],
};
