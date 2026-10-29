import type { Lesson } from "../types";

export const linkedHashMapAndTreeMap: Lesson = {
  slug: "linkedhashmap-and-treemap",
  date: "2026-10-29",
  title: "LinkedHashMap and TreeMap",
  description:
    "The two maps that remember order: LinkedHashMap's linked entries, access order and a working LRU cache, and TreeMap's red-black tree with sorted keys and range queries, inspected live on JDK 21, plus EnumMap, WeakHashMap and IdentityHashMap.",
  tags: ["Collections", "LinkedHashMap", "TreeMap", "LRU Cache", "Data Structures"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "A plain HashMap is like a drawer where things get thrown in any order. Two of its cousins keep things tidy, each in its own way.",
        },
        {
          type: "paragraph",
          text: "A **`LinkedHashMap`** is like my phone's recent-apps list: it remembers the order things went in (or, if I ask, the order I last used them). A **`TreeMap`** is like a dictionary: no matter what order I add words, it always keeps them sorted from A to Z, so it can also tell me the first word, the last word, or the nearest word to one I'm looking for.",
        },
        {
          type: "paragraph",
          text: "Both work like any other `Map`: `put` a key with a value, `get` it back by the key. I only choose between them by asking which order I want to see.",
        },
        {
          type: "code",
          language: "java",
          code: `Map<String, Integer> recentApps = new LinkedHashMap<>();
recentApps.put("Maps", 1);
recentApps.put("Camera", 2);
recentApps.put("Chat", 3);
System.out.println(recentApps.keySet());   // order I added them

Map<String, Integer> dictionary = new TreeMap<>(recentApps);
System.out.println(dictionary.keySet());   // alphabetical`,
        },
        {
          type: "output",
          text: `[Maps, Camera, Chat]
[Camera, Chat, Maps]`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "Need the order I added things? `LinkedHashMap`. Need keys sorted? `TreeMap`.",
        },
      ],
    },
    {
      title: "What LinkedHashMap and TreeMap Are",
      blocks: [
        {
          type: "paragraph",
          text: "The HashMap lesson ended with a warning: a HashMap has no order. Keys come out in bucket order, and that order even changes after a resize. Most of the time that's fine. But often I need a map that **remembers**, and there are two very different things to remember.",
        },
        {
          type: "paragraph",
          text: "Open the recent-apps screen on a phone. The apps are listed by when you last used them, the most recent on top, and when the list is full the oldest one drops off. That's **order of arrival or use**, and it's what `LinkedHashMap` keeps. It is a HashMap with a doubly linked list running through all its entries, so it can replay them in insertion order, or, if you ask, in order of last access.",
        },
        {
          type: "paragraph",
          text: "Now picture a railway departure board. Trains are listed by time, not by when they were added to the system, and if you arrive at 9:30 you look for the first train **at or after** 9:30. That's **sorted order**, and it's what `TreeMap` keeps. It's a completely different structure, a red-black tree, so it can answer questions a hash map can't: smallest key, largest key, the nearest key below or above a value, and every key in a range.",
        },
        {
          type: "code",
          language: "java",
          code: `Map<String, Integer> arrival = new LinkedHashMap<>();  // remembers insertion order
NavigableMap<Integer, String> board = new TreeMap<>();  // keeps keys sorted
board.ceilingKey(30);                                   // first train at or after minute 30`,
        },
        {
          type: "paragraph",
          text: "Both are `Map`s, so code written against `Map` works with either. The choice is about what order you need and what it costs. By the end of this lesson I'll have built a real LRU cache with one overridden method, and used a TreeMap for distance-based fare slabs, both checked against their live internal state.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "`TreeMap` arrived with the Collections Framework in **Java 1.2** (1998), implementing `SortedMap`: a map with `firstKey`, `lastKey`, `headMap`, `tailMap` and `subMap`. Its algorithm is the red-black tree from the classic \"Introduction to Algorithms\" textbook, which the JDK source credits.",
        },
        {
          type: "paragraph",
          text: "`LinkedHashMap` came later, in **Java 1.4** (2002). People kept needing a HashMap with predictable iteration, and building caches by hand. LinkedHashMap gave them both, including the `accessOrder` flag and the `removeEldestEntry` hook that make an LRU cache a ten-line class.",
        },
        {
          type: "paragraph",
          text: "**Java 6** (2006) added `NavigableMap`, which `TreeMap` implements: `floorKey`, `ceilingKey`, `lowerKey`, `higherKey`, `descendingMap` and inclusive or exclusive range views. And **Java 21** (2023) added `SequencedMap` (JEP 431), a common interface for maps with a defined order. `LinkedHashMap` now has `firstEntry`, `lastEntry`, `pollFirstEntry`, `putFirst`, `putLast` and `reversed()`. `javap` on JDK 21 shows the new declaration: `public class java.util.LinkedHashMap<K, V> extends java.util.HashMap<K, V> implements java.util.SequencedMap<K, V>`.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "Back at the railway station cloakroom from the HashMap lesson, with two upgrades.",
        },
        {
          type: "list",
          items: [
            "**LinkedHashMap** is the same cloakroom with the same lockers, plus a **register book** at the counter. Every bag that comes in gets a line at the bottom of the book. Finding a bag is still \"go straight to the locker\", but now I can also read the book from top to bottom and get every bag in the order it arrived. Removing a bag means crossing out its line, which is quick because each line knows the line before and after it.",
            "**Access order** is a register where, every time a passenger checks on their bag, the attendant crosses out their line and rewrites it at the bottom. The top line is then always the bag nobody has touched for longest. If the cloakroom is full, that's the bag to send to the lost-property room. That's an LRU cache.",
            "**TreeMap** is a different building: a library card catalogue. Cards are filed in alphabetical order, in drawers that split and rebalance so no drawer gets too deep. Finding a card means a handful of \"before or after?\" decisions, not a direct jump, so it's slower than a locker. But I can ask things a cloakroom can't: \"the first card after M\", \"every card from K to P\".",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "LinkedHashMap: a HashMap plus a linked list",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.LinkedHashMap | grep -v '('
javap -p 'java.util.LinkedHashMap$Entry'`,
        },
        {
          type: "output",
          text: `public class java.util.LinkedHashMap<K, V> extends java.util.HashMap<K, V> implements java.util.SequencedMap<K, V> {
  transient java.util.LinkedHashMap$Entry<K, V> head;
  transient java.util.LinkedHashMap$Entry<K, V> tail;
  final boolean accessOrder;
  static final int PUT_NORM;
  static final int PUT_FIRST;
  static final int PUT_LAST;
  transient int putMode;

class java.util.LinkedHashMap$Entry<K, V> extends java.util.HashMap$Node<K, V> {
  java.util.LinkedHashMap$Entry<K, V> before;
  java.util.LinkedHashMap$Entry<K, V> after;`,
        },
        {
          type: "paragraph",
          text: "It `extends HashMap`, so it inherits the whole bucket table, hashing, resizing and treeification. It adds only three fields: `head` (eldest entry), `tail` (youngest) and `accessOrder`. Each entry is a `HashMap.Node` with two more pointers, `before` and `after`. `putMode` and the `PUT_*` constants are new in Java 21, for `putFirst` and `putLast`.",
        },
        {
          type: "diagram",
          text: ` table (inherited from HashMap)
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ ...
└───┴─┬─┴───┴─┬─┴───┴───┴─┬─┴───┘
      │       │           │        buckets: found by hash, as before
      ▼       ▼           ▼
   ┌──────┐ ┌──────┐   ┌──────┐
   │Camera│ │ Maps │   │ Chat │
   └──────┘ └──────┘   └──────┘

 the same three entries, linked in a second way:

 head                                tail
  │                                   │
  ▼                                   ▼
┌──────┐ after  ┌──────┐ after  ┌──────┐
│ Maps │───────►│Camera│───────►│ Chat │──► null
│      │◄───────│      │◄───────│      │
└──────┘ before └──────┘ before └──────┘`,
          caption:
            "Every entry lives in a bucket (for lookups) and in one doubly linked list (for order). Iteration follows the list, never the table.",
        },
        {
          type: "heading",
          text: "TreeMap: a red-black tree",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.TreeMap | grep -v '('
javap -p 'java.util.TreeMap$Entry' | grep -v '('
javap -p -constants java.util.TreeMap | grep -E 'RED|BLACK|rotate|fixAfter'`,
        },
        {
          type: "output",
          text: `public class java.util.TreeMap<K, V> extends java.util.AbstractMap<K, V> implements java.util.NavigableMap<K, V>, java.lang.Cloneable, java.io.Serializable {
  private final java.util.Comparator<? super K> comparator;
  private transient java.util.TreeMap$Entry<K, V> root;
  private transient int size;
  private transient int modCount;
  ...
final class java.util.TreeMap$Entry<K, V> implements java.util.Map$Entry<K, V> {
  K key;
  V value;
  java.util.TreeMap$Entry<K, V> left;
  java.util.TreeMap$Entry<K, V> right;
  java.util.TreeMap$Entry<K, V> parent;
  boolean color;

  private static final boolean RED = false;
  private static final boolean BLACK = true;
  private void rotateLeft(java.util.TreeMap$Entry<K, V>);
  private void rotateRight(java.util.TreeMap$Entry<K, V>);
  private void fixAfterInsertion(java.util.TreeMap$Entry<K, V>);
  private void fixAfterDeletion(java.util.TreeMap$Entry<K, V>);`,
        },
        {
          type: "paragraph",
          text: "No array, no hashing at all. A TreeMap is a `root` pointer, a `size`, and an optional `comparator`. Each `Entry` has `left`, `right` and `parent` pointers and a one-bit `color`. The private methods tell the story of how it stays balanced: after every insert or delete, `fixAfterInsertion` or `fixAfterDeletion` recolours nodes and calls `rotateLeft`/`rotateRight` as needed.",
        },
        {
          type: "diagram",
          text: `             ┌───────┐
             │ 2  B  │  root
             └───┬───┘
         ┌───────┴────────┐
     ┌───┴───┐        ┌───┴───┐
     │ 1  B  │        │ 4  R  │
     └───────┘        └───┬───┘
                  ┌───────┴───────┐
              ┌───┴───┐       ┌───┴───┐
              │ 3  B  │       │ 6  B  │
              └───────┘       └───┬───┘
                              ┌───┴───────┐
                          ┌───┴───┐   ┌───┴───┐
                          │ 5  R  │   │ 7  R  │
                          └───────┘   └───────┘
  left subtree < node < right subtree,  B = black, R = red`,
          caption: "The real tree a TreeMap built after inserting keys 1 to 7 in order. TreeShape below prints it.",
        },
        {
          type: "paragraph",
          text: "A red-black tree is a binary search tree with colouring rules: the root is black, a red node never has a red child, and every path from a node down to its empty leaves passes the same number of black nodes. Together these guarantee the longest path is at most twice the shortest, so the height stays around `2 log n`, and every operation is O(log n), whatever order the keys arrive in.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/collections/treemap-range.svg",
          alt: "TreeMap of fare slabs by distance with keys 0, 5, 10 and 20 km, and floorKey(7) returning 5 for a 90 rupee fare.",
          caption: "A 7 km trip falls in the 5 km slab: `floorKey(7)` returns 5 in O(log n).",
        },
        {
          type: "image",
          src: "/images/collections/linkedhashmap-lru.svg",
          alt: "LinkedHashMap in access order used as an LRU cache of fare quotes with capacity 3: get moves an entry to the tail and a fourth put evicts the head.",
          caption: "With `accessOrder = true` and `removeEldestEntry`, a `LinkedHashMap` becomes a small LRU cache.",
        },
        {
          type: "paragraph",
          text: "As in the HashMap lesson, the JDK source zip isn't on this machine, so I rely on `javap` for the real field and method names, reflection with `--add-opens java.base/java.util=ALL-UNNAMED` for live state, and the well-known OpenJDK design for the parts in between.",
        },
        {
          type: "heading",
          text: "LinkedHashMap rides on three hooks in HashMap",
        },
        {
          type: "paragraph",
          text: "In the HashMap lesson, `putVal`'s bytecode called two methods that did nothing visible: `afterNodeAccess` and `afterNodeInsertion`. Those are empty hooks in `HashMap`, and `javap` shows `LinkedHashMap` overrides them, plus `afterNodeRemoval` and `newNode`:",
        },
        {
          type: "output",
          text: `  java.util.HashMap$Node<K, V> newNode(int, K, V, java.util.HashMap$Node<K, V>);
  void afterNodeRemoval(java.util.HashMap$Node<K, V>);
  void afterNodeInsertion(boolean);
  void afterNodeAccess(java.util.HashMap$Node<K, V>);
  protected boolean removeEldestEntry(java.util.Map$Entry<K, V>);`,
        },
        {
          type: "list",
          items: [
            "`newNode`: HashMap's `putVal` calls it to create a node. LinkedHashMap returns an `Entry` instead and links it at the `tail` of the list.",
            "`afterNodeRemoval`: unlinks the entry from the list by joining its `before` and `after` neighbours. O(1), no searching.",
            "`afterNodeAccess`: if `accessOrder` is true, moves the entry to the tail. It's called from `get`, `getOrDefault`, and from `put` on an existing key.",
            "`afterNodeInsertion`: after a new entry is added, calls `removeEldestEntry(head)`. If that returns `true`, the head entry is removed. The default returns `false`, so a normal LinkedHashMap never removes anything.",
          ],
        },
        {
          type: "paragraph",
          text: "So LinkedHashMap is not a separate algorithm. It's HashMap's algorithm plus a few pointer updates in each hook. I walked the `head` to `after` chain with reflection, in both modes, after the same calls:",
        },
        {
          type: "code",
          language: "java",
          title: "LinkedWalk.java",
          code: `import java.lang.reflect.Field;
import java.util.LinkedHashMap;

public class LinkedWalk {
    static Field head, tail, after, key;

    static String walk(LinkedHashMap<?, ?> map) throws Exception {
        StringBuilder out = new StringBuilder("head -> ");
        for (Object e = head.get(map); e != null; e = after.get(e)) out.append(key.get(e)).append(" -> ");
        return out.append("null   (tail=").append(key.get(tail.get(map))).append(")").toString();
    }

    public static void main(String[] args) throws Exception {
        head = LinkedHashMap.class.getDeclaredField("head");
        tail = LinkedHashMap.class.getDeclaredField("tail");
        Class<?> entry = Class.forName("java.util.LinkedHashMap$Entry");
        after = entry.getDeclaredField("after");
        key = Class.forName("java.util.HashMap$Node").getDeclaredField("key");
        for (Field f : new Field[] {head, tail, after, key}) f.setAccessible(true);

        LinkedHashMap<String, Integer> insertion = new LinkedHashMap<>();
        LinkedHashMap<String, Integer> access = new LinkedHashMap<>(16, 0.75f, true);
        for (String app : new String[] {"Maps", "Camera", "Chat", "Music"}) {
            insertion.put(app, 1);
            access.put(app, 1);
        }
        insertion.get("Camera");  insertion.put("Maps", 2);   // no reordering
        access.get("Camera");     access.put("Maps", 2);      // both move to the tail
        System.out.println("insertion: " + walk(insertion));
        System.out.println("access:    " + walk(access));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util=ALL-UNNAMED LinkedWalk",
        },
        {
          type: "output",
          text: `insertion: head -> Maps -> Camera -> Chat -> Music -> null   (tail=Music)
access:    head -> Chat -> Music -> Camera -> Maps -> null   (tail=Maps)`,
        },
        {
          type: "list",
          items: [
            "In insertion order, `get(\"Camera\")` and re-putting `Maps` changed nothing. Updating the value of an existing key does **not** move it; only a brand new key goes to the tail.",
            "In access order, `get(\"Camera\")` moved Camera to the tail, then `put(\"Maps\", 2)` moved Maps behind it. The head is now `Chat`, the entry untouched for the longest time, which is exactly the one an LRU cache should evict.",
            "The only difference between the two maps is the third constructor argument, `true`. It sets the `final boolean accessOrder` field, and it can't be changed later.",
          ],
        },
        {
          type: "heading",
          text: "Access order means get() is a write",
        },
        {
          type: "paragraph",
          text: "That last point has a surprising side effect. In access order, `get` moves an entry in the list, which is a structural change, so it increments `modCount`. Calling `get` while iterating the same map trips the fail-fast check:",
        },
        {
          type: "code",
          language: "java",
          title: "AccessCme.java",
          code: `import java.util.LinkedHashMap;

public class AccessCme {
    public static void main(String[] args) {
        LinkedHashMap<String, Integer> lru = new LinkedHashMap<>(16, 0.75f, true);
        lru.put("Maps", 1);
        lru.put("Chat", 2);
        try {
            for (String app : lru.keySet()) System.out.println(app + "=" + lru.get(app));
        } catch (Exception e) {
            System.out.println(e.getClass().getSimpleName());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Maps=1
ConcurrentModificationException`,
        },
        {
          type: "paragraph",
          text: "The first `get(\"Maps\")` moved Maps to the tail and bumped `modCount`, and the iterator's next step threw. It also means an access-ordered LinkedHashMap is **never** safe for concurrent reads without locking, even when nobody calls `put`. Iterate `entrySet()` instead of calling `get` inside the loop.",
        },
        {
          type: "heading",
          text: "TreeMap: put and get are walks down the tree",
        },
        {
          type: "paragraph",
          text: "Finding a word in a paper dictionary: open the middle, decide \"before or after\", and repeat with half the book. A TreeMap lookup does exactly that, starting at `root` and comparing the key with each node: smaller goes `left`, bigger goes `right`, equal means found. With a red-black tree's height around `log n`, a million keys take about 20 to 40 comparisons.",
        },
        {
          type: "paragraph",
          text: "`put` does the same walk. If it finds an equal key it replaces the value. Otherwise it attaches a new **red** node where the walk fell off the tree, then `fixAfterInsertion` restores the colouring rules with recolouring and rotations. A rotation is a local rearrangement of three nodes that changes the shape without breaking the left-smaller-right-bigger order. The key point: TreeMap never calls `hashCode` or `equals` on keys. Everything comes from `compareTo` or the comparator.",
        },
        {
          type: "paragraph",
          text: "The best test of balancing is the worst input for a plain binary search tree: keys already in sorted order. A naive tree would become a straight line, 1 to 2 to 3 to 7. I inserted 1 to 7 in order and printed the real tree, sideways, with the right subtree on top:",
        },
        {
          type: "code",
          language: "java",
          title: "TreeShape.java",
          code: `import java.lang.reflect.Field;
import java.util.TreeMap;

public class TreeShape {
    static Field root, left, right, key, color;

    static void print(Object node, String indent) throws Exception {
        if (node == null) return;
        print(right.get(node), indent + "      ");
        boolean black = (boolean) color.get(node);
        System.out.println(indent + key.get(node) + (black ? " (B)" : " (R)"));
        print(left.get(node), indent + "      ");
    }

    public static void main(String[] args) throws Exception {
        root = TreeMap.class.getDeclaredField("root");
        Class<?> entry = Class.forName("java.util.TreeMap$Entry");
        left = entry.getDeclaredField("left");
        right = entry.getDeclaredField("right");
        key = entry.getDeclaredField("key");
        color = entry.getDeclaredField("color");
        for (Field f : new Field[] {root, left, right, key, color}) f.setAccessible(true);

        TreeMap<Integer, String> stops = new TreeMap<>();
        for (int km = 1; km <= 7; km++) stops.put(km, "stop-" + km);   // sorted input
        print(root.get(stops), "");
        System.out.println("root = " + key.get(root.get(stops)));
    }
}`,
        },
        {
          type: "output",
          text: `                  7 (R)
            6 (B)
                  5 (R)
      4 (R)
            3 (B)
2 (B)
      1 (B)
root = 2`,
        },
        {
          type: "paragraph",
          text: "Turn your head left and it's the tree from the diagram above: root 2, black, with 1 on its left and 4 on its right. The depth is 4 levels for 7 keys, not 7. The rotations kept pulling the tree back into shape as each bigger key arrived. It isn't perfectly balanced (the left side is shallower than the right), and that's by design: red-black trees allow some slack in exchange for fewer rotations than stricter trees like AVL.",
        },
        {
          type: "heading",
          text: "How floorKey and ceilingKey work",
        },
        {
          type: "paragraph",
          text: "`floorKey(x)` (the greatest key less than or equal to `x`) is the same walk down the tree, remembering the last node where the walk went **right**, because that node was smaller than `x`. When the walk falls off the tree, the remembered node is the answer. `ceilingKey` is the mirror image. So the nearest-key questions cost the same O(log n) as `get`. A HashMap would need to scan every key to answer them.",
        },
        {
          type: "paragraph",
          text: "Range views like `subMap(10, 40)` don't copy anything. They're small view objects holding the bounds and a reference to the backing map. Reading them walks the real tree from the first key in range, and writes go straight through to the real map, which is why a key added later shows up in the view. I show that in the examples.",
        },
        {
          type: "heading",
          text: "EnumMap: an array indexed by ordinal",
        },
        {
          type: "paragraph",
          text: "A row of pigeonholes labelled with the days of the week doesn't need hashing: Monday is always the first box. When keys are an enum, Java knows every possible key in advance, and each has a fixed `ordinal()`. `EnumMap` uses that. `javap` shows its fields: `keyType`, `keyUniverse` (all the enum constants) and `vals`, a plain `Object[]`:",
        },
        {
          type: "code",
          language: "java",
          title: "EnumVals.java",
          code: `import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.EnumMap;

public class EnumVals {
    enum TripStatus { REQUESTED, ACCEPTED, ON_TRIP, COMPLETED }

    public static void main(String[] args) throws Exception {
        EnumMap<TripStatus, Integer> counts = new EnumMap<>(TripStatus.class);
        counts.put(TripStatus.COMPLETED, 40);
        counts.put(TripStatus.REQUESTED, 6);
        Field vals = EnumMap.class.getDeclaredField("vals");
        vals.setAccessible(true);
        System.out.println(Arrays.toString((Object[]) vals.get(counts)));
    }
}`,
        },
        {
          type: "output",
          text: `[6, null, null, 40]`,
        },
        {
          type: "paragraph",
          text: "`REQUESTED` has ordinal 0, so its value is at index 0; `COMPLETED` has ordinal 3. No hash, no nodes, no collisions, just `vals[key.ordinal()]`. Iteration is always in enum declaration order. It's the fastest and smallest map in the JDK for enum keys.",
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
          code: `// LinkedHashMap
Map<String, Integer> byArrival = new LinkedHashMap<>();
Map<String, Integer> byUse = new LinkedHashMap<>(16, 0.75f, true);   // access order
LinkedHashMap<String, Integer> sized = LinkedHashMap.newLinkedHashMap(100); // Java 19+
sized.firstEntry();  sized.lastEntry();  sized.pollFirstEntry();     // Java 21
sized.putFirst("k", 1);  sized.putLast("k", 1);  sized.reversed();   // Java 21

// TreeMap
NavigableMap<Integer, String> tm = new TreeMap<>();                  // natural order
NavigableMap<String, Integer> desc = new TreeMap<>(Comparator.reverseOrder());
tm.firstKey();  tm.lastKey();                  // smallest, largest (throw if empty)
tm.floorKey(30);  tm.ceilingKey(30);           // <= 30, >= 30   (null if none)
tm.lowerKey(30);  tm.higherKey(30);            // <  30, >  30
tm.floorEntry(30).getValue();                  // key and value together
tm.headMap(30);  tm.headMap(30, true);         // keys < 30, keys <= 30
tm.tailMap(30);                                // keys >= 30
tm.subMap(10, 40);                             // 10 <= key < 40
tm.descendingMap();  tm.pollFirstEntry();

// Special-purpose
Map<Day, String> shifts = new EnumMap<>(Day.class);`,
        },
        {
          type: "paragraph",
          text: "Declare a TreeMap as `NavigableMap` when you use the navigation methods, otherwise as `Map`. A LinkedHashMap can be declared as `SequencedMap` on Java 21 when you need `firstEntry` and friends.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A working LRU cache",
        },
        {
          type: "paragraph",
          text: "Back to the phone's recent-apps list, limited to three apps. Opening an app moves it to the front. Opening a fourth new app kicks out the one used longest ago. With access order and `removeEldestEntry`, that's the whole class:",
        },
        {
          type: "code",
          language: "java",
          title: "LruCache.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;

public class LruCache<K, V> extends LinkedHashMap<K, V> {
    private final int maxEntries;

    public LruCache(int maxEntries) {
        super(16, 0.75f, true);                  // true = access order
        this.maxEntries = maxEntries;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        boolean evict = size() > maxEntries;
        if (evict) System.out.println("  evicting " + eldest.getKey());
        return evict;
    }

    public static void main(String[] args) {
        LruCache<String, String> recentApps = new LruCache<>(3);
        recentApps.put("Maps", "open");
        recentApps.put("Camera", "open");
        recentApps.put("Chat", "open");
        System.out.println(recentApps.keySet());

        recentApps.get("Maps");                  // touched: now most recent
        System.out.println(recentApps.keySet());

        recentApps.put("Music", "open");         // 4th app: least recent goes
        System.out.println(recentApps.keySet());
        System.out.println(recentApps.containsKey("Camera"));
    }
}`,
        },
        {
          type: "output",
          text: `[Maps, Camera, Chat]
[Camera, Chat, Maps]
  evicting Camera
[Chat, Maps, Music]
false`,
        },
        {
          type: "list",
          items: [
            "Without the `get(\"Maps\")`, Maps would have been the eldest and been evicted. The `get` moved it to the tail, so Camera became the head and was evicted instead. That's least-recently-**used**, not least-recently-**added**.",
            "`removeEldestEntry` runs after every new insertion (from the `afterNodeInsertion` hook), with the current `head` as `eldest`. Returning `true` removes it. The method can also do work first, like logging here, or writing the evicted value to disk.",
            "The list is ordered eldest first, so iteration shows the eviction queue from left to right.",
          ],
        },
        {
          type: "heading",
          text: "Java 21 sequenced methods",
        },
        {
          type: "paragraph",
          text: "A queue at a ticket counter where someone with a special pass can be sent to the front:",
        },
        {
          type: "code",
          language: "java",
          title: "Sequenced.java",
          code: `import java.util.LinkedHashMap;

public class Sequenced {
    public static void main(String[] args) {
        LinkedHashMap<String, Integer> queue = new LinkedHashMap<>();
        queue.put("Asha", 1);
        queue.put("Ravi", 2);
        queue.put("Meera", 3);

        System.out.println(queue.firstEntry() + " " + queue.lastEntry());
        queue.putFirst("Imran", 0);              // Java 21: jump the line
        System.out.println(queue);
        System.out.println(queue.reversed());
        System.out.println(queue.pollFirstEntry() + " " + queue);
    }
}`,
        },
        {
          type: "output",
          text: `Asha=1 Meera=3
{Imran=0, Asha=1, Ravi=2, Meera=3}
{Meera=3, Ravi=2, Asha=1, Imran=0}
Imran=0 {Asha=1, Ravi=2, Meera=3}`,
        },
        {
          type: "paragraph",
          text: "Before Java 21, getting the last entry of a LinkedHashMap meant iterating the whole map. `reversed()` returns a **view**, not a copy, so it costs nothing to create.",
        },
        {
          type: "heading",
          text: "Fare slabs by distance with floorEntry",
        },
        {
          type: "paragraph",
          text: "Income tax slabs, courier weight bands, and per-km fare slabs all have the same shape: \"from this point upwards, this rate applies\". The question for any value is: which slab started most recently at or below it? That's `floorEntry`, and it's the most useful TreeMap method in real code:",
        },
        {
          type: "code",
          language: "java",
          title: "FareSlabs.java",
          code: `import java.util.TreeMap;

public class FareSlabs {
    public static void main(String[] args) {
        // slab starts at this many km -> rate per km
        TreeMap<Integer, Integer> ratePerKm = new TreeMap<>();
        ratePerKm.put(0, 18);
        ratePerKm.put(5, 15);
        ratePerKm.put(15, 12);
        ratePerKm.put(40, 10);

        for (int km : new int[] {3, 5, 12, 60}) {
            int rate = ratePerKm.floorEntry(km).getValue();   // greatest start <= km
            System.out.println(km + " km -> Rs " + rate + "/km");
        }
    }
}`,
        },
        {
          type: "output",
          text: `3 km -> Rs 18/km
5 km -> Rs 15/km
12 km -> Rs 15/km
60 km -> Rs 10/km`,
        },
        {
          type: "paragraph",
          text: "No `if`/`else if` ladder, and adding a slab is one more `put`. The slab at 0 matters: without it, `floorEntry(3)` would return `null` and `.getValue()` would throw.",
        },
        {
          type: "heading",
          text: "Every navigation method on a train board",
        },
        {
          type: "code",
          language: "java",
          title: "Navigable.java",
          code: `import java.util.TreeMap;

public class Navigable {
    public static void main(String[] args) {
        TreeMap<Integer, String> trainsByTime = new TreeMap<>();   // minutes past 9:00
        trainsByTime.put(5, "Howrah Local");
        trainsByTime.put(20, "Bandel Local");
        trainsByTime.put(35, "Sealdah Fast");
        trainsByTime.put(50, "Barasat Local");

        System.out.println(trainsByTime.firstKey() + " " + trainsByTime.lastKey());
        System.out.println(trainsByTime.floorKey(30) + " " + trainsByTime.ceilingKey(30));
        System.out.println(trainsByTime.lowerKey(20) + " " + trainsByTime.higherKey(20));
        System.out.println(trainsByTime.ceilingKey(51));
        System.out.println(trainsByTime.headMap(20));
        System.out.println(trainsByTime.headMap(20, true));
        System.out.println(trainsByTime.tailMap(35));
        System.out.println(trainsByTime.subMap(10, 40));
        System.out.println(trainsByTime.descendingMap());

        var window = trainsByTime.subMap(10, 40);
        trainsByTime.put(25, "Extra Local");       // views are live
        System.out.println(window);
    }
}`,
        },
        {
          type: "output",
          text: `5 50
20 35
5 35
null
{5=Howrah Local}
{5=Howrah Local, 20=Bandel Local}
{35=Sealdah Fast, 50=Barasat Local}
{20=Bandel Local, 35=Sealdah Fast}
{50=Barasat Local, 35=Sealdah Fast, 20=Bandel Local, 5=Howrah Local}
{20=Bandel Local, 25=Extra Local, 35=Sealdah Fast}`,
        },
        {
          type: "list",
          items: [
            "`floorKey(30)` is 20 (the last train before I arrive) and `ceilingKey(30)` is 35 (the next train I can catch).",
            "`lowerKey` and `higherKey` are the strict versions: `lowerKey(20)` skips 20 itself and returns 5.",
            "`ceilingKey(51)` is `null`: no more trains today. Always handle that.",
            "`headMap(20)` excludes 20, `headMap(20, true)` includes it. `tailMap(35)` includes 35. `subMap(10, 40)` is from 10 inclusive to 40 exclusive, the usual Java half-open range.",
            "The `window` view was created before `put(25, ...)`, and still shows the new train. Views are live windows onto the tree, not copies.",
          ],
        },
        {
          type: "heading",
          text: "Custom ordering with a Comparator",
        },
        {
          type: "paragraph",
          text: "A leaderboard at a sports day: highest score first, and on a tie, alphabetical. A comparator describes that order, and the TreeMap keeps it:",
        },
        {
          type: "code",
          language: "java",
          title: "ComparatorDemo.java",
          code: `import java.util.Comparator;
import java.util.TreeMap;

public class ComparatorDemo {
    record Driver(String name, double rating) {}

    public static void main(String[] args) {
        TreeMap<String, Integer> byName = new TreeMap<>(Comparator.reverseOrder());
        byName.put("Asha", 4); byName.put("Ravi", 7); byName.put("Meera", 2);
        System.out.println(byName);

        Comparator<Driver> bestFirst = Comparator.comparingDouble(Driver::rating).reversed()
                .thenComparing(Driver::name);
        TreeMap<Driver, String> leaderboard = new TreeMap<>(bestFirst);
        leaderboard.put(new Driver("Ravi", 4.8), "car-12");
        leaderboard.put(new Driver("Asha", 4.9), "car-07");
        leaderboard.put(new Driver("Imran", 4.8), "car-03");
        leaderboard.forEach((d, car) -> System.out.println(d.name() + " " + d.rating() + " " + car));

        try {
            new TreeMap<Driver, String>().put(new Driver("Kabir", 4.5), "car-09");
        } catch (ClassCastException e) {
            System.out.println("no comparator: " + e.getClass().getSimpleName());
        }
        try {
            byName.put(null, 0);
        } catch (NullPointerException e) {
            System.out.println("null key: NullPointerException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `{Ravi=7, Meera=2, Asha=4}
Asha 4.9 car-07
Imran 4.8 car-03
Ravi 4.8 car-12
no comparator: ClassCastException
null key: NullPointerException`,
        },
        {
          type: "list",
          items: [
            "Ravi and Imran tie on 4.8, and `thenComparing(Driver::name)` breaks the tie alphabetically. Without the tie-breaker, the comparator would say they're **equal**, and the second `put` would overwrite the first. More on that trap below.",
            "A `record` isn't `Comparable`, so a TreeMap with no comparator can't order it and throws `ClassCastException` on the very first `put`. It even checks the first key against itself, so a TreeMap with one non-comparable key fails too.",
            "TreeMap rejects `null` keys (it would have to compare them), while `null` values are fine.",
          ],
        },
        {
          type: "heading",
          text: "EnumMap, IdentityHashMap and WeakHashMap, briefly",
        },
        {
          type: "code",
          language: "java",
          title: "SpecialMaps.java",
          code: `import java.util.EnumMap;
import java.util.IdentityHashMap;
import java.util.Map;
import java.util.WeakHashMap;

public class SpecialMaps {
    enum TripStatus { REQUESTED, ACCEPTED, ON_TRIP, COMPLETED }

    public static void main(String[] args) throws Exception {
        Map<TripStatus, Integer> counts = new EnumMap<>(TripStatus.class);
        counts.put(TripStatus.COMPLETED, 40);
        counts.put(TripStatus.REQUESTED, 6);
        counts.put(TripStatus.ON_TRIP, 3);
        System.out.println(counts);                       // always enum declaration order

        Map<String, String> byIdentity = new IdentityHashMap<>();
        String a = new String("PNR-42"), b = new String("PNR-42");
        byIdentity.put(a, "first object");
        byIdentity.put(b, "second object");
        System.out.println(byIdentity.size() + " " + a.equals(b));

        Map<Object, String> weak = new WeakHashMap<>();
        Object session = new Object();
        weak.put(session, "cached thumbnail");
        session = null;                                    // last strong reference gone
        System.gc();
        Thread.sleep(100);
        System.out.println("weak map size after GC: " + weak.size());
    }
}`,
        },
        {
          type: "output",
          text: `{REQUESTED=6, ON_TRIP=3, COMPLETED=40}
2 true
weak map size after GC: 0`,
        },
        {
          type: "list",
          items: [
            "**EnumMap**: enum keys, stored in an array by ordinal, iterated in declaration order. Use it instead of `HashMap` whenever the key is an enum.",
            "**IdentityHashMap**: compares keys with `==` and `System.identityHashCode`, not `equals`/`hashCode`. Two equal strings that are different objects are two keys. It's for special jobs like tracking which objects a deep-copy or serializer has already visited, not for business data. `javap` shows it has no `Node` class at all: keys and values sit side by side in one `Object[] table`.",
            "**WeakHashMap**: its entries extend `WeakReference` (`javap` shows `WeakHashMap$Entry ... extends java.lang.ref.WeakReference`), so a key that nothing else references can be garbage collected, and its entry disappears. `System.gc()` is only a request, so that last line is what I saw in three runs, not a guarantee. It's useful for attaching extra data to objects you don't own, but it's not a general-purpose cache: entries vanish on the next GC, not when memory is tight.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "A comparator that disagrees with equals",
        },
        {
          type: "paragraph",
          text: "Two people at a hotel desk both say their name is \"Asha\". If the desk only looks at first names, it gives the second Asha the first Asha's room key. TreeMap is that desk: it decides two keys are the same key when `compareTo` (or the comparator) returns 0, and never calls `equals`. If your ordering says 0 for keys that `equals` considers different, entries silently merge:",
        },
        {
          type: "code",
          language: "java",
          title: "CompareTrap.java",
          code: `import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

public class CompareTrap {
    public static void main(String[] args) {
        Map<BigDecimal, String> hash = new HashMap<>();
        Map<BigDecimal, String> tree = new TreeMap<>();
        for (String amount : new String[] {"1.0", "1.00"}) {
            hash.put(new BigDecimal(amount), amount);
            tree.put(new BigDecimal(amount), amount);
        }
        System.out.println("HashMap: " + hash);
        System.out.println("TreeMap: " + tree);
        System.out.println(new BigDecimal("1.0").equals(new BigDecimal("1.00")) + " "
                + new BigDecimal("1.0").compareTo(new BigDecimal("1.00")));

        Map<String, Integer> riders = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        riders.put("Asha", 1);
        riders.put("ASHA", 2);
        System.out.println(riders + " " + riders.get("asha"));
    }
}`,
        },
        {
          type: "output",
          text: `HashMap: {1.0=1.0, 1.00=1.00}
TreeMap: {1.0=1.00}
false 0
{Asha=2} 2`,
        },
        {
          type: "paragraph",
          text: "`BigDecimal`'s `equals` considers scale, so `1.0` and `1.00` are different; its `compareTo` only looks at the numeric value, so they're the same. The same two keys give two entries in a HashMap and one in a TreeMap, which kept the first key object and the second value.",
        },
        {
          type: "paragraph",
          text: "The case-insensitive map shows the same effect, deliberately this time: `ASHA` replaced `Asha`'s value, and `get(\"asha\")` found it. That's useful when intended and a nasty bug when not, as with the rating comparator without a tie-breaker above.",
        },
        {
          type: "heading",
          text: "Calling get() while iterating an access-ordered map",
        },
        {
          type: "paragraph",
          text: "`AccessCme` above: in access order, `get` reorders, so it throws `ConcurrentModificationException` mid-loop. Iterate `entrySet()` to read values.",
        },
        {
          type: "heading",
          text: "Expecting a re-put to move a key in insertion order",
        },
        {
          type: "paragraph",
          text: "`LinkedWalk` showed `put(\"Maps\", 2)` on an existing key leaves it where it was in insertion order. To move it to the end, `remove` it and `put` it again, or on Java 21 use `putLast`.",
        },
        {
          type: "heading",
          text: "Forgetting the null from floor and ceiling",
        },
        {
          type: "paragraph",
          text: "`ceilingKey(51)` returned `null` above. `floorEntry(km).getValue()` throws `NullPointerException` if `km` is below the first slab. Either guarantee a lowest key (like the slab at 0 km) or check for `null`. `firstKey()` and `lastKey()` are different again: they throw `NoSuchElementException` on an empty map.",
        },
        {
          type: "heading",
          text: "Mutating a TreeMap key",
        },
        {
          type: "paragraph",
          text: "Same trap as with HashMap, different mechanism. If a field used by `compareTo` changes, the node is now in the wrong place in the tree, and lookups take the wrong turn and miss it. Keys must be immutable for every kind of map.",
        },
        {
          type: "heading",
          text: "Building an unbounded LinkedHashMap \"cache\"",
        },
        {
          type: "paragraph",
          text: "Access order alone doesn't evict anything; the default `removeEldestEntry` returns `false`. Without the override, the \"cache\" grows until the heap runs out.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use `HashMap` by default, `LinkedHashMap` when iteration order must be predictable (insertion order, or LRU), `TreeMap` when you need sorted keys or nearest/range queries, and `EnumMap` for enum keys.",
            "Make comparators consistent with `equals`, or be sure you want keys that compare equal to merge. Add a tie-breaker (`thenComparing`) on a unique field.",
            "Prefer `Comparator.comparing(...).thenComparing(...)` over hand-written `compare` methods. Never compare by subtraction (`a - b`); it overflows.",
            "For an LRU cache, subclass `LinkedHashMap` with access order and `removeEldestEntry`. For a production cache with concurrency, expiry and statistics, use a caching library instead.",
            "Declare the type you rely on: `NavigableMap` for TreeMap navigation, `SequencedMap` (Java 21) for first/last access, plain `Map` otherwise.",
            "Treat `floorKey`, `ceilingKey`, `lowerKey` and `higherKey` results as nullable, every time.",
            "Remember range views are live. Copy with `new TreeMap<>(map.subMap(a, b))` if you need a snapshot.",
            "Keep keys immutable, whatever the map.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "table",
          headers: ["Operation", "HashMap", "LinkedHashMap", "TreeMap", "EnumMap"],
          rows: [
            ["`get`, `put`, `remove`", "O(1) average", "O(1) average", "O(log n)", "O(1)"],
            ["`containsKey`", "O(1)", "O(1)", "O(log n)", "O(1)"],
            ["first / last key", "O(n) scan", "O(1) (head/tail)", "O(log n)", "O(universe)"],
            ["floor / ceiling / range", "not supported", "not supported", "O(log n) + size of range", "not supported"],
            ["Iteration", "O(capacity + n)", "O(n), list only", "O(n), in order", "O(universe)"],
            ["Order", "none", "insertion or access", "sorted by key", "enum declaration"],
            ["`null` key", "one allowed", "one allowed", "not allowed", "not allowed"],
          ],
        },
        {
          type: "list",
          items: [
            "**LinkedHashMap** does a little more work than HashMap on every insert and removal (two or four pointer updates), and in access order on every `get` too. In exchange, iteration only visits real entries, so it doesn't pay for empty buckets the way HashMap does.",
            "**Memory.** A LinkedHashMap entry is a HashMap node plus two references (`before`, `after`). A TreeMap entry has `key`, `value`, `left`, `right`, `parent` and `color`, but there's no table array at all, so for small maps the totals are often close. EnumMap is the smallest: one array slot per enum constant.",
            "**TreeMap comparisons** can be expensive. Each lookup makes about `log n` to `2 log n` calls to `compareTo`. For `String` keys with long shared prefixes, each call scans characters. A HashMap uses the cached hash and usually one `equals`.",
            "**Sorted input doesn't hurt a TreeMap**, unlike a naive binary search tree. `TreeShape` showed keys 1 to 7, inserted in order, ending up 4 levels deep.",
            "If you only need sorted output once, at the end, it's usually cheaper to fill a `HashMap` and sort its entries once than to keep a TreeMap sorted during every insert. TreeMap pays off when you query in order repeatedly, or need floor, ceiling and ranges.",
          ],
        },
        {
          type: "paragraph",
          text: "I haven't quoted timings on purpose. The complexity classes and the structural facts above are reliable. Actual nanoseconds depend on key types, data size and the JIT, and should be measured with JMH on the real workload.",
        },
      ],
    },
    {
      title: "LinkedHashMap and TreeMap in Production",
      blocks: [
        {
          type: "paragraph",
          text: "One small service that needs both: a **fare quote service**. Riders often check the same route several times (open the app, compare, check again), so recent quotes are cached in an LRU map. Calculating a new quote uses distance-based slabs, looked up with `floorEntry`. The cache size is 2 here only so the eviction shows up in a short run.",
        },
        {
          type: "code",
          language: "java",
          title: "FareQuoteService.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

public class FareQuoteService {
    private final TreeMap<Integer, Integer> ratePerKm = new TreeMap<>(
            Map.of(0, 18, 5, 15, 15, 12, 40, 10));             // slab start km -> rate
    private final Map<String, Integer> recentQuotes =
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override protected boolean removeEldestEntry(Map.Entry<String, Integer> e) {
                    return size() > 2;                         // tiny on purpose, to show eviction
                }
            };
    private int computed = 0;

    int quote(String from, String to, int km) {
        return recentQuotes.computeIfAbsent(from + "->" + to, route -> {
            computed++;
            return 50 + km * ratePerKm.floorEntry(km).getValue();
        });
    }

    public static void main(String[] args) {
        FareQuoteService service = new FareQuoteService();
        System.out.println(service.quote("Howrah", "Salt Lake", 12));
        System.out.println(service.quote("Garia", "Airport", 28));
        System.out.println(service.quote("Howrah", "Salt Lake", 12));  // cache hit
        System.out.println(service.quote("Behala", "Esplanade", 4));   // evicts Garia->Airport
        System.out.println(service.recentQuotes.keySet() + " computed=" + service.computed);
    }
}`,
        },
        {
          type: "output",
          text: `230
386
230
122
[Howrah->Salt Lake, Behala->Esplanade] computed=3`,
        },
        {
          type: "list",
          items: [
            "12 km falls in the slab starting at 5 km (Rs 15/km): 50 + 180 = 230. 28 km is in the 15 km slab (Rs 12/km): 50 + 336 = 386. 4 km is in the first slab (Rs 18/km): 50 + 72 = 122.",
            "The third call for Howrah to Salt Lake was a cache hit: `computed` is 3 for 4 calls. The hit also moved that route to the most-recent end, so when Behala to Esplanade arrived, Garia to Airport was the eldest and got evicted.",
            "`computeIfAbsent` works with the LRU hooks: a new entry triggers `removeEldestEntry`, and a hit counts as an access.",
            "`new TreeMap<>(Map.of(...))` sorts the slabs on construction, so the order they're written in doesn't matter.",
            "What I'd change for real traffic: the cache is not thread-safe, and remember that even `get` mutates an access-ordered map. Wrapping it with `Collections.synchronizedMap` works for light traffic; a real service would use a concurrent caching library with a size limit and expiry, so a stale fare can't live forever. The slab table, never modified after construction, is safe to share.",
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
              question: "What's the difference between HashMap, LinkedHashMap and TreeMap?",
              answer:
                "HashMap has no defined order and O(1) average operations. LinkedHashMap is a HashMap plus a doubly linked list through its entries, so it iterates in insertion order, or access order if asked, still with O(1) operations. TreeMap is a red-black tree that keeps keys sorted, with O(log n) operations, plus navigation like `floorKey` and `subMap`.\n\nThey also differ on `null`: HashMap and LinkedHashMap allow one `null` key, TreeMap allows none, because it would have to compare it.",
            },
            {
              question: "How does LinkedHashMap maintain order?",
              answer:
                "It extends HashMap, uses a subclass of the node, `LinkedHashMap.Entry`, with extra `before` and `after` pointers, and keeps `head` and `tail` fields. New entries are linked at the tail; removed entries are unlinked in O(1).\n\n`javap -p` shows exactly those fields: `head`, `tail`, `accessOrder`, and in the entry, `before` and `after`. Iteration follows the list from `head`, never the bucket table.",
            },
            {
              question: "What is access order in LinkedHashMap?",
              answer:
                "With `new LinkedHashMap<>(16, 0.75f, true)`, every access, meaning `get`, `getOrDefault` or a `put` on an existing key, moves that entry to the tail. The head is then always the least recently used entry.\n\nIn my `LinkedWalk` test, after `get(\"Camera\")` and `put(\"Maps\", 2)`, the list went from Maps, Camera, Chat, Music to Chat, Music, Camera, Maps. The flag is `final`, so a map's mode is fixed at construction.",
            },
            {
              question: "How do you build an LRU cache in Java?",
              answer:
                "Subclass `LinkedHashMap` with `accessOrder = true` and override `removeEldestEntry` to return `size() > maxEntries`. After every insertion, LinkedHashMap passes its head, the least recently used entry, to that method and removes it if it returns `true`.\n\nMy `LruCache` with a limit of 3 evicted Camera, not Maps, because I had read Maps just before adding a fourth app. It's not thread-safe, and for production use I'd reach for a caching library.",
            },
            {
              question: "What data structure does TreeMap use, and what does that give you?",
              answer:
                "A red-black tree: a self-balancing binary search tree. `javap` shows `TreeMap$Entry` with `left`, `right`, `parent` and a boolean `color`, and private `rotateLeft`, `rotateRight` and `fixAfterInsertion` methods.\n\nBalance keeps the height around `log n`, so `get`, `put` and `remove` are O(log n) even for sorted input. Sorted order gives `firstKey`, `lastKey`, `floorKey`, `ceilingKey` and range views like `subMap`.",
            },
            {
              question: "How does TreeMap order its keys?",
              answer:
                "By the keys' natural ordering (`Comparable.compareTo`) or by a `Comparator` passed to the constructor. It never uses `hashCode` or `equals`.\n\nWithout a comparator, keys must be `Comparable`, or the first `put` throws `ClassCastException`, which I got by putting a plain record in. With `Comparator.reverseOrder()` my names came out `{Ravi, Meera, Asha}`.",
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
              question: "What does it mean for compareTo to be consistent with equals, and what breaks if it isn't?",
              answer:
                "Consistent means `a.compareTo(b) == 0` exactly when `a.equals(b)`. TreeMap uses only the comparison, so if two unequal keys compare as 0, it treats them as the same key and the second `put` overwrites the first.\n\n`BigDecimal` is the classic example: `new BigDecimal(\"1.0\").equals(new BigDecimal(\"1.00\"))` is `false`, but `compareTo` gives 0. In my test, a HashMap kept both as two entries and a TreeMap kept just one, `{1.0=1.00}`. The same thing happens with a comparator that has no tie-breaker.",
            },
            {
              question: "Why can calling get() inside a loop over an access-ordered LinkedHashMap throw ConcurrentModificationException?",
              answer:
                "Because in access order, `get` moves the entry to the tail, which is a structural change that increments `modCount`. The iterator sees `modCount` changed and throws on its next step.\n\nMy `AccessCme` printed `Maps=1` and then threw. Iterate `entrySet()` to read keys and values together. And it means an LRU map isn't safe for concurrent readers either.",
            },
            {
              question: "If you put an existing key again into an insertion-ordered LinkedHashMap, does its position change?",
              answer:
                "No. Only the value is replaced; the entry stays where it was first inserted. It only moves in access-order mode.\n\nIn my `LinkedWalk`, `put(\"Maps\", 2)` left Maps at the head of the insertion-ordered map. To move it, remove and re-put, or on Java 21 call `putLast`.",
            },
            {
              question: "What do floorKey, ceilingKey, lowerKey and higherKey return, and when do they return null?",
              answer:
                "`floorKey(x)` is the greatest key `<= x`, `ceilingKey(x)` the least key `>= x`, and `lowerKey`/`higherKey` are the strict `<` and `>` versions. They return `null` when there's no such key.\n\nOn my train board with keys 5, 20, 35, 50, `floorKey(30)` was 20, `ceilingKey(30)` 35, `lowerKey(20)` 5, and `ceilingKey(51)` `null`. Contrast `firstKey()` and `lastKey()`, which throw `NoSuchElementException` on an empty map.",
            },
            {
              question: "Are headMap, tailMap and subMap copies?",
              answer:
                "No, they're live views over the same tree. Reads walk the backing tree within the bounds, and changes through either the view or the map show up in both. Inserting a key outside the view's range through the view throws `IllegalArgumentException`.\n\nI created `subMap(10, 40)`, then put key 25 into the main map, and the view printed it. Wrap in `new TreeMap<>(...)` for a snapshot.",
            },
            {
              question: "When would you choose WeakHashMap, IdentityHashMap or EnumMap?",
              answer:
                "EnumMap whenever keys are an enum: it's an array indexed by `ordinal()`, compact, fast and ordered by declaration. IdentityHashMap when key identity, not equality, is the point, like tracking visited objects during a graph copy. WeakHashMap to attach data to objects you don't control, letting the entry disappear once the key is no longer used anywhere else.\n\nWeakHashMap is often misused as a cache. Its entries are cleared at the next GC once the key is unreachable, not under memory pressure, and string literal keys are never collected at all.",
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
              question: "How does LinkedHashMap reuse HashMap's code?",
              answer:
                "Through hooks. HashMap's `putVal` and `removeNode` call `newNode`, `afterNodeAccess`, `afterNodeInsertion` and `afterNodeRemoval`. In HashMap they're empty or trivial; LinkedHashMap overrides them to create linked entries, move entries to the tail, call `removeEldestEntry`, and unlink removed entries. It also overrides `get` and `getOrDefault` so a read can call `afterNodeAccess`.\n\nThe HashMap bytecode literally contains `invokevirtual afterNodeAccess` and `invokevirtual afterNodeInsertion` in `putVal`, and `javap -p java.util.LinkedHashMap` lists the overrides.",
            },
            {
              question: "What is a red-black tree and why does TreeMap use one?",
              answer:
                "A binary search tree with a colour bit per node and rules: the root is black, a red node has no red child, and every root-to-leaf path has the same number of black nodes. Those rules keep the longest path at most twice the shortest, so height is O(log n).\n\nInsertions and deletions restore the rules with recolouring and at most a few rotations. Compared with a stricter AVL tree, it does fewer rotations on updates at the cost of slightly taller trees. My `TreeShape` showed keys 1 to 7, inserted in order, ending up with root 2 and depth 4, not a 7-long chain.",
            },
            {
              question: "How does TreeMap find a floor key in O(log n)?",
              answer:
                "It walks down from the root as for `get`. Whenever the current key is less than the target, that key is a candidate and the walk goes right to look for a bigger one still `<=` the target. When the key is greater, it goes left. When the walk runs out of nodes, the last candidate is the floor.\n\nSo it visits one node per level, the same cost as a lookup. A HashMap can't do it without scanning every key, because hashing destroys order.",
            },
            {
              question: "Why does TreeMap reject null keys but HashMap allows one?",
              answer:
                "HashMap special-cases `null` with hash 0, so it never needs to call a method on it. TreeMap has to compare every key, and `null.compareTo(...)` throws. Even a comparator would have to handle `null` deliberately.\n\nIn my test `byName.put(null, 0)` threw `NullPointerException`. A comparator like `Comparator.nullsFirst(Comparator.naturalOrder())` makes `null` keys legal in a TreeMap if you really need them.",
            },
            {
              question: "How is EnumMap stored internally?",
              answer:
                "As a plain `Object[] vals` with one slot per enum constant, indexed by `ordinal()`, plus `keyUniverse`, the array of all constants. `javap` shows exactly those fields and no node class.\n\nWith reflection, after putting `COMPLETED=40` and `REQUESTED=6` into a four-constant enum map, `vals` was `[6, null, null, 40]`. Lookup is one array access, and iteration is declaration order.",
            },
            {
              question: "What did Java 21's SequencedMap add to LinkedHashMap?",
              answer:
                "A standard interface for ordered maps, with `firstEntry`, `lastEntry`, `pollFirstEntry`, `pollLastEntry`, `putFirst`, `putLast` and `reversed()`. Before that, the last entry of a LinkedHashMap needed a full iteration.\n\n`javap` on JDK 21 shows `LinkedHashMap ... implements java.util.SequencedMap` and the new `putMode` field with `PUT_FIRST`/`PUT_LAST` constants. My `Sequenced` example moved Imran to the front with `putFirst` and printed a reversed view.",
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
            "Print the keys of a `HashMap`, a `LinkedHashMap` and a `TreeMap` after putting the same five city names into each. Hint: only one of the three outputs should surprise you.",
            "Change `LruCache` so it evicts by insertion order instead of use. Hint: one constructor argument.",
            "Build a browser history of the last 5 pages with `LruCache`, visit 7 pages with a repeat in the middle, and print what's left. Hint: the repeated page should survive.",
            "Model income-tax style slabs with a `TreeMap<Integer, Integer>` and compute the slab rate for several incomes with `floorEntry`. Hint: add a slab starting at 0.",
            "Given a `TreeMap<LocalTime, String>` of bus departures, print the next bus after the current time, and \"no more buses\" when there isn't one. Hint: `ceilingEntry`, check for `null`.",
            "Create a `TreeMap<String, Integer>` with `String.CASE_INSENSITIVE_ORDER`, put \"Asha\" and \"ASHA\", and explain the size. Hint: what does `compare` return?",
            "Count trips by an enum `TripStatus` with an `EnumMap` and with a `HashMap`, and compare the printed order. Hint: only one is guaranteed.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Solution sketch for exercise 3",
              answer:
                "With pages A, B, C, D, A, E, F and a limit of 5: after A to D the map is A, B, C, D. Visiting A again moves it to the end: B, C, D, A. E makes five entries. F makes six, so the eldest, B, is evicted, leaving C, D, A, E, F.\n\nA survived because the repeat refreshed it. With insertion order, A would have been evicted instead.",
            },
            {
              question: "Solution sketch for exercise 6",
              answer:
                "The size is 1. `CASE_INSENSITIVE_ORDER.compare(\"Asha\", \"ASHA\")` is 0, so TreeMap treats them as the same key. The stored key stays \"Asha\" (the first one) and the value becomes the second one, exactly like my `CompareTrap` run printed `{Asha=2}`.",
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
          text: `LINKEDHASHMAP  HashMap + doubly linked list (before/after)
               fields: head (eldest), tail (newest), accessOrder
               new LinkedHashMap<>()              insertion order
               new LinkedHashMap<>(16, .75f, true) access order
               removeEldestEntry -> true  = evict head (LRU)
               re-put existing key: no move (insertion order)
               access order: get() reorders -> CME in loops
               Java 21: firstEntry lastEntry putFirst reversed

TREEMAP        red-black tree: root, left/right/parent, color
               O(log n), sorted by compareTo or Comparator
               never calls hashCode/equals; compare == 0 -> same key
               floorKey <=   ceilingKey >=   lower <   higher >
               headMap(k) <k  tailMap(k) >=k  subMap(a,b) [a,b)
               views are live; no null keys

ENUMMAP        Object[] vals indexed by ordinal, declaration order
IDENTITY       == instead of equals
WEAK           entry gone after GC when key unreachable

CHOOSE         no order -> HashMap   arrival/LRU -> LinkedHashMap
               sorted/nearest/range -> TreeMap   enum keys -> EnumMap`,
          caption: "Both lessons' maps in one place: what each one remembers, and what it costs.",
        },
        {
          type: "list",
          items: [
            "LinkedHashMap is HashMap plus a linked list, kept up to date by hooks HashMap already calls. Access order plus `removeEldestEntry` is a complete LRU cache.",
            "TreeMap is a self-balancing tree ordered only by comparison. It's slower per lookup than a hash map but answers floor, ceiling and range questions in O(log n).",
            "The classic traps: a comparator that merges keys `equals` keeps apart, `get` reordering an access-ordered map, and `null` from the navigation methods.",
          ],
        },
      ],
    },
  ],
};
