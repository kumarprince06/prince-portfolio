import type { Lesson } from "../types";

export const hashSetLinkedHashSetTreeSet: Lesson = {
  slug: "hashset-linkedhashset-treeset",
  date: "2026-10-29",
  title: "HashSet, LinkedHashSet and TreeSet",
  description:
    "How Java's three main Set implementations keep elements unique: HashSet as a HashMap with a dummy value, LinkedHashSet's insertion order, and TreeSet's red-black tree with floor and ceiling lookups, plus the equals and hashCode rules that make or break all of them, checked with javap and reflection on JDK 21.",
  tags: ["Collections", "Core Java", "Data Structures", "HashSet", "TreeSet"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a class attendance register. When a student walks in, I tick their name. If the same student walks in again after lunch, I don't write their name a second time, they're already marked present.",
        },
        {
          type: "paragraph",
          text: "A **`Set`** works exactly like that register. It holds things, but never the same thing twice. If I add something that's already there, the set just ignores it. It's perfect for questions like \"how many **different** people came today?\" or \"have I seen this one before?\".",
        },
        {
          type: "paragraph",
          text: "Java gives me three common sets. `HashSet` is the fastest and doesn't care about order. `LinkedHashSet` remembers the order I added things. `TreeSet` keeps everything sorted.",
        },
        {
          type: "code",
          language: "java",
          code: `Set<String> present = new HashSet<>();
present.add("Riya");
present.add("Kabir");
present.add("Riya");                       // already marked, ignored
System.out.println(present.size());
System.out.println(present.contains("Kabir"));`,
        },
        {
          type: "output",
          text: `2
true`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "A `Set` is a list that refuses duplicates; I pick `HashSet`, `LinkedHashSet` or `TreeSet` by the order I need.",
        },
      ],
    },
    {
      title: "What a Set Is",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the visitor register at a building's front desk, but a smart one. When I walk in, the guard checks whether my name is already on today's list. If it is, nothing new is written. If it isn't, my name goes on. At the end of the day the register answers one question instantly: how many **different** people came in?",
        },
        {
          type: "paragraph",
          text: "A **`Set`** is that register. It holds elements with no duplicates, where \"duplicate\" means `a.equals(b)` is `true`. `add` returns `true` if the element was new and `false` if it was already there:",
        },
        {
          type: "code",
          language: "java",
          title: "AddReturns.java",
          code: `import java.util.HashSet;
import java.util.Set;

public class AddReturns {
    public static void main(String[] args) {
        Set<String> todaysVisitors = new HashSet<>();
        System.out.println(todaysVisitors.add("u-101"));   // new
        System.out.println(todaysVisitors.add("u-205"));   // new
        System.out.println(todaysVisitors.add("u-101"));   // already there
        System.out.println(todaysVisitors.size() + " unique, contains u-205? " + todaysVisitors.contains("u-205"));
        System.out.println(todaysVisitors.remove("u-999"));
    }
}`,
        },
        {
          type: "output",
          text: `true
true
false
2 unique, contains u-205? true
false`,
        },
        {
          type: "paragraph",
          text: "Java gives me three everyday implementations, and the only real difference between them is **order**:",
        },
        {
          type: "list",
          items: [
            "**`HashSet`**: fastest, no order promised at all.",
            "**`LinkedHashSet`**: remembers the order elements were first added.",
            "**`TreeSet`**: keeps elements sorted, and can answer \"what's the nearest element below or above X?\".",
          ],
        },
        {
          type: "paragraph",
          text: "The big surprise in this lesson is that none of them really stores elements \"as a set\". Each is a thin wrapper around a `Map`, and I'll prove that from the JDK classes.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 had no set at all. People used a `Hashtable` and ignored the values, which is, funnily enough, still roughly how `HashSet` works today. `Set`, `HashSet`, `SortedSet` and `TreeSet` arrived with the Collections Framework in Java 1.2 (1998). `LinkedHashSet` followed in Java 1.4, together with `LinkedHashMap`, to give a set with predictable iteration order without paying for sorting.",
        },
        {
          type: "paragraph",
          text: "Later additions: `EnumSet` in Java 5, `NavigableSet` (with `floor`, `ceiling` and friends) in Java 6, `Set.of` in Java 9, and in Java 21 `LinkedHashSet` and `TreeSet` became `SequencedSet`s, with `getFirst`, `getLast` and `reversed()`. Java 19 also added `HashSet.newHashSet(n)` for correct pre-sizing, which turns out to matter, as the internals section shows.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "Three places that keep a list of unique names, each in its own way:",
        },
        {
          type: "list",
          items: [
            "**HashSet is a wall of pigeonholes in a hostel.** Each guest's name is turned into a pigeonhole number by a fixed rule (the hash code). To check whether someone's registered, I go straight to their pigeonhole, no searching. But reading the pigeonholes left to right gives names in a jumbled order that depends on the rule, not on when people arrived.",
            "**LinkedHashSet is the same pigeonhole wall, plus a ribbon.** Every new card is tied to the previous card with a ribbon. Lookups still use the pigeonholes, but if I follow the ribbon I get names in arrival order.",
            "**TreeSet is a library card catalogue.** Cards are always filed in alphabetical order. Finding a card takes a few steps (open the right drawer, then the right section), not one. But I can instantly ask \"what's the first card after Kumar?\" or \"give me every card from M to P\".",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "HashSet: a HashMap with a dummy value",
        },
        {
          type: "diagram",
          text: `HashSet
┌──────────────┐
│ map ─────────┼──► HashMap<E, Object>
└──────────────┘     table (Node[16])
                     ┌────┬────┬────┬────┬────┬ ... ┬────┬────┬────┐
                     │    │    │    │    │ ●  │     │ ●  │ ●  │    │
                     └────┴────┴────┴────┴─┼──┴ ... ┴─┼──┴─┼──┴────┘
                       0    1    2    3    4│        11│  12│
                                            ▼          ▼    ▼
                               Node{hash, key "Ravi",  "Kabir" "Meena"
                                    value PRESENT}
                                    │ next
                                    ▼
                               "Asha" ──► "Dev"     (a collision chain)

  every value is the same shared object: PRESENT`,
          caption:
            "The set's elements are the map's keys. This exact layout is what the BucketPeek program below found.",
        },
        {
          type: "heading",
          text: "LinkedHashSet: the same, plus a doubly linked list",
        },
        {
          type: "diagram",
          text: `LinkedHashSet ── map ──► LinkedHashMap
                          buckets as in HashMap, and also:

  head ─► [Ravi] ⇄ [Asha] ⇄ [Meena] ⇄ [Kabir] ⇄ [Dev] ◄─ tail
          before/after links through every entry, in insertion order`,
          caption:
            "Lookups go through the buckets; iteration follows the before/after links.",
        },
        {
          type: "heading",
          text: "TreeSet: a red-black tree",
        },
        {
          type: "diagram",
          text: `TreeSet ── m ──► TreeMap ── root
                                │
                          ┌─── 50 ───┐            each node: key, value,
                          │          │            left, right, parent, color
                     ┌── 20 ─┐    ┌─ 80 ─┐
                     │       │    │      │        left subtree < node < right
                    10      30   60     90        height stays O(log n)`,
          caption:
            "In-order traversal (left, node, right) gives the elements sorted. That's all a TreeSet iterator does.",
        },
        {
          type: "heading",
          text: "Side by side",
        },
        {
          type: "table",
          headers: ["", "HashSet", "LinkedHashSet", "TreeSet"],
          rows: [
            ["Backed by", "`HashMap`", "`LinkedHashMap`", "`TreeMap` (red-black tree)"],
            ["Iteration order", "None promised", "Insertion order", "Sorted (natural or `Comparator`)"],
            ["Duplicates decided by", "`hashCode` + `equals`", "`hashCode` + `equals`", "`compareTo` / `compare` == 0"],
            ["`null` allowed", "One", "One", "No (with natural ordering)"],
            ["`add` / `contains` / `remove`", "O(1) average", "O(1) average", "O(log n)"],
            ["Extra powers", "-", "`getFirst`, `getLast`, `reversed`", "`floor`, `ceiling`, `headSet`, `tailSet`, ..."],
            ["Thread-safe", "No", "No", "No"],
          ],
        },
        {
          type: "heading",
          text: "The equals and hashCode contract",
        },
        {
          type: "paragraph",
          text: "Hash-based sets depend on a contract from `java.lang.Object`. If `a.equals(b)` is `true`, then `a.hashCode() == b.hashCode()` **must** be true. The reverse isn't required: two different objects may share a hash code (a collision), it just makes lookups slower. `equals` must also be reflexive, symmetric, transitive and consistent, and `x.equals(null)` must be `false`.",
        },
        {
          type: "paragraph",
          text: "Why it matters: `contains(x)` first uses `x.hashCode()` to pick a bucket, and only then calls `equals` on the elements in **that** bucket. If two equal objects have different hash codes, the set looks in the wrong bucket and never even calls `equals`.",
        },
        {
          type: "heading",
          text: "Comparable and Comparator, for TreeSet",
        },
        {
          type: "paragraph",
          text: "A `TreeSet` doesn't use `hashCode` or `equals` at all. It uses either the elements' **natural ordering** (`Comparable.compareTo`, which `String`, `Integer` and records you write can provide) or a **`Comparator`** passed to the constructor. If the comparison returns 0, the two elements are treated as the same element. The Comparable and Comparator lesson goes deeper; here I only need the consequence for sets.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/collections/treeset-red-black.svg",
          alt: "Red-black tree after inserting 10 to 70 in order, with root 20, and the floor(45) and ceiling(45) search path.",
          caption: "Inserting 10…70 in order still gives a short tree; `floor(45)` = 40 and `ceiling(45)` = 50 are found in one walk from the root.",
        },
        {
          type: "image",
          src: "/images/collections/hashset-is-hashmap.svg",
          alt: "HashSet wrapping an internal HashMap where each element is a key and every value points to one shared PRESENT object.",
          caption: "`HashSet.add(e)` is just `map.put(e, PRESENT) == null` on an internal `HashMap`.",
        },
        {
          type: "paragraph",
          text: "The JDK source zip isn't on my machine, so this section is built from `javap -p` and `javap -c` on the real JDK 21 classes and from reflection on live objects. Reflection into `java.util` needs `--add-opens java.base/java.util=ALL-UNNAMED` on the `java` command line.",
        },
        {
          type: "heading",
          text: "The fields",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.HashSet java.util.LinkedHashSet java.util.TreeSet`,
        },
        {
          type: "output",
          text: `public class java.util.HashSet<E> extends java.util.AbstractSet<E> implements java.util.Set<E>, java.lang.Cloneable, java.io.Serializable {
  static final long serialVersionUID;
  transient java.util.HashMap<E, java.lang.Object> map;
  static final java.lang.Object PRESENT;
  public java.util.HashSet();
  public java.util.HashSet(java.util.Collection<? extends E>);
  public java.util.HashSet(int, float);
  public java.util.HashSet(int);
  java.util.HashSet(int, float, boolean);
  ...
  public static <T> java.util.HashSet<T> newHashSet(int);
}
public class java.util.LinkedHashSet<E> extends java.util.HashSet<E> implements java.util.SequencedSet<E>, java.lang.Cloneable, java.io.Serializable {
  ...
  java.util.LinkedHashMap<E, java.lang.Object> map();
  public void addFirst(E);
  public void addLast(E);
  public E getFirst();
  public E getLast();
  ...
}
public class java.util.TreeSet<E> extends java.util.AbstractSet<E> implements java.util.NavigableSet<E>, java.lang.Cloneable, java.io.Serializable {
  private transient java.util.NavigableMap<E, java.lang.Object> m;
  private static final java.lang.Object PRESENT;
  ...`,
        },
        {
          type: "list",
          items: [
            "`HashSet` has exactly one real field, `map`, a `HashMap<E, Object>`, plus a shared static `PRESENT` object.",
            "`LinkedHashSet` declares no map field of its own. It **extends** `HashSet` and reuses its `map` field.",
            "`TreeSet` holds a `NavigableMap` called `m`, and its own `PRESENT`.",
            "That package-private constructor `HashSet(int, float, boolean)` is the trick behind `LinkedHashSet`, as the bytecode below shows.",
          ],
        },
        {
          type: "heading",
          text: "Reading the real objects",
        },
        {
          type: "code",
          language: "java",
          title: "Inside.java",
          code: `import java.lang.reflect.Field;
import java.util.*;

public class Inside {
    static Object read(Object target, Class<?> owner, String name) throws Exception {
        Field f = owner.getDeclaredField(name);
        f.setAccessible(true);
        return f.get(target);
    }

    public static void main(String[] args) throws Exception {
        HashSet<String> visitors = new HashSet<>(List.of("v1", "v2"));
        Map<?, ?> map = (Map<?, ?>) read(visitors, HashSet.class, "map");
        System.out.println("HashSet.map is a     " + map.getClass().getName());
        System.out.println("its keys             " + map.keySet());
        Object present = read(null, HashSet.class, "PRESENT");
        System.out.println("PRESENT class        " + present.getClass().getName());
        System.out.println("every value PRESENT? " + map.values().stream().allMatch(v -> v == present));

        LinkedHashSet<String> ordered = new LinkedHashSet<>(List.of("v1", "v2"));
        System.out.println("LinkedHashSet.map is " + read(ordered, HashSet.class, "map").getClass().getName());

        TreeSet<String> sorted = new TreeSet<>(List.of("v1", "v2"));
        System.out.println("TreeSet.m is         " + read(sorted, TreeSet.class, "m").getClass().getName());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util=ALL-UNNAMED Inside",
        },
        {
          type: "output",
          text: `HashSet.map is a     java.util.HashMap
its keys             [v1, v2]
PRESENT class        java.lang.Object
every value PRESENT? true
LinkedHashSet.map is java.util.LinkedHashMap
TreeSet.m is         java.util.TreeMap`,
        },
        {
          type: "paragraph",
          text: "`PRESENT` is a plain `new Object()`, one instance shared by every `HashSet` in the JVM. Every element is stored as a key mapped to that one object. And a `LinkedHashSet`'s inherited `map` field really holds a `LinkedHashMap`.",
        },
        {
          type: "heading",
          text: "add, contains, and how LinkedHashSet gets its map",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.HashSet java.util.LinkedHashSet",
        },
        {
          type: "output",
          text: `  public boolean add(E);
       0: aload_0
       1: getfield      #10    // Field map:Ljava/util/HashMap;
       4: aload_1
       5: getstatic     #64    // Field PRESENT:Ljava/lang/Object;
       8: invokevirtual #68    // Method java/util/HashMap.put:(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
      11: ifnonnull     18
      14: iconst_1
      15: goto          19
      18: iconst_0
      19: ireturn

  public boolean contains(java.lang.Object);
       0: aload_0
       1: getfield      #10    // Field map:Ljava/util/HashMap;
       4: aload_1
       5: invokevirtual #60    // Method java/util/HashMap.containsKey:(Ljava/lang/Object;)Z
       8: ireturn

  java.util.HashSet(int, float, boolean);
       0: aload_0
       1: invokespecial #1     // Method java/util/AbstractSet."<init>":()V
       4: aload_0
       5: new           #42    // class java/util/LinkedHashMap
       8: dup
       9: iload_1
      10: fload_2
      11: invokespecial #44    // Method java/util/LinkedHashMap."<init>":(IF)V
      14: putfield      #10    // Field map:Ljava/util/HashMap;
      17: return

  public java.util.LinkedHashSet();
       0: aload_0
       1: bipush        16
       3: ldc           #7     // float 0.75f
       5: iconst_1
       6: invokespecial #1     // Method java/util/HashSet."<init>":(IFZ)V
       9: return`,
        },
        {
          type: "list",
          items: [
            "`add(e)` is literally `return map.put(e, PRESENT) == null;`. `HashMap.put` returns the previous value for that key. A new key had no previous value, so `null`, so `true`. An existing key returns `PRESENT`, so `false`.",
            "`contains(o)` is `map.containsKey(o)`, and `remove(o)` is `map.remove(o) == PRESENT`. The set has no lookup logic of its own.",
            "The `boolean` in `HashSet(int, float, boolean)` is never read. It's a dummy parameter that only exists to give that constructor a different signature. Its body puts a `LinkedHashMap` into the `map` field.",
            "`LinkedHashSet`'s constructors just call it with 16 and 0.75. That's the whole implementation of insertion order: a different map behind the same `HashSet` code.",
          ],
        },
        {
          type: "paragraph",
          text: "One consequence of \"add is `map.put`\": when an equal element is added again, `HashMap` keeps the original key object and only replaces the value. So the set keeps the **first** object. I checked with a record whose `equals` ignores a `note` field: adding `Cab(\"WB-01\", \"second\")` after `Cab(\"WB-01\", \"first\")` returned `false`, and the set still printed `[Cab[plate=WB-01, note=first]]`.",
        },
        {
          type: "heading",
          text: "Where the elements actually land",
        },
        {
          type: "paragraph",
          text: "Since `HashSet` is a `HashMap`, I went one level deeper and read the map's `table` array and each bucket's `Node` chain:",
        },
        {
          type: "code",
          language: "java",
          title: "BucketPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.*;

public class BucketPeek {
    public static void main(String[] args) throws Exception {
        HashSet<String> set = new HashSet<>(List.of("Ravi", "Asha", "Meena", "Kabir", "Dev"));
        Field mapField = HashSet.class.getDeclaredField("map");
        mapField.setAccessible(true);
        Field tableField = HashMap.class.getDeclaredField("table");
        tableField.setAccessible(true);
        Object[] table = (Object[]) tableField.get(mapField.get(set));

        Class<?> node = Class.forName("java.util.HashMap$Node");
        Field key = node.getDeclaredField("key"); key.setAccessible(true);
        Field next = node.getDeclaredField("next"); next.setAccessible(true);

        System.out.println("table length " + table.length);
        for (int i = 0; i < table.length; i++) {
            StringBuilder chain = new StringBuilder();
            for (Object n = table[i]; n != null; n = next.get(n)) chain.append(key.get(n)).append(' ');
            if (chain.length() > 0) System.out.println("bucket " + i + ": " + chain);
        }
        for (String s : List.of("Ravi", "Asha")) {
            int h = s.hashCode();
            System.out.println(s + " hashCode " + h + " -> index " + ((h ^ (h >>> 16)) & (table.length - 1)));
        }
    }
}`,
        },
        {
          type: "output",
          text: `table length 16
bucket 4: Ravi Asha Dev
bucket 11: Kabir
bucket 12: Meena
Ravi hashCode 2539842 -> index 4
Asha hashCode 2050251 -> index 4`,
        },
        {
          type: "list",
          items: [
            "The bucket index is `(h ^ (h >>> 16)) & (length - 1)`: mix the high 16 bits of the hash code into the low bits, then keep only as many low bits as the table needs. With 16 buckets, that's the last 4 bits. My two printed indexes match the buckets the reflection found.",
            "Three of five names collided in bucket 4, so they form a linked chain. `contains(\"Dev\")` hashes to bucket 4 and then calls `equals` on up to three nodes. Still fast, but it shows why a good spread of hash codes matters.",
            "Iteration walks buckets 0 to 15 and each chain in order, which gives `Ravi, Asha, Dev, Kabir, Meena`. That's exactly the \"random\" `HashSet` order printed in the Examples section. It isn't random, it's bucket order, and it changes if the table size changes.",
            "When a single bucket's chain grows past 8 nodes and the table has at least 64 buckets, `HashMap` turns that bucket into a small red-black tree. The HashMap Internals lesson covers that and the full `put` path.",
          ],
        },
        {
          type: "heading",
          text: "When the table grows",
        },
        {
          type: "code",
          language: "java",
          title: "TableGrowth.java",
          code: `import java.lang.reflect.Field;
import java.util.*;

public class TableGrowth {
    static int tableLength(HashSet<?> set) throws Exception {
        Field mapField = HashSet.class.getDeclaredField("map");
        mapField.setAccessible(true);
        HashMap<?, ?> map = (HashMap<?, ?>) mapField.get(set);
        Field tableField = HashMap.class.getDeclaredField("table");
        tableField.setAccessible(true);
        Object[] table = (Object[]) tableField.get(map);
        return table == null ? 0 : table.length;
    }

    public static void main(String[] args) throws Exception {
        HashSet<Integer> set = new HashSet<>();
        System.out.println("empty: table length " + tableLength(set));
        int last = 0;
        for (int i = 1; i <= 100; i++) {
            set.add(i);
            int len = tableLength(set);
            if (len != last) {
                System.out.println("add #" + i + " -> table " + last + " -> " + len);
                last = len;
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `empty: table length 0
add #1 -> table 0 -> 16
add #13 -> table 16 -> 32
add #25 -> table 32 -> 64
add #49 -> table 64 -> 128
add #97 -> table 128 -> 256`,
        },
        {
          type: "paragraph",
          text: "Like `ArrayList`, the table is allocated lazily on the first `add`. It doubles whenever the number of elements goes past **capacity times load factor** (0.75 by default): past 12 in a 16-bucket table, past 24 in 32, and so on. Doubling keeps the length a power of two, which is what makes `& (length - 1)` a valid replacement for the slower `%`.",
        },
        {
          type: "heading",
          text: "The pre-sizing trap",
        },
        {
          type: "code",
          language: "java",
          title: "PresizeCheck.java (main body)",
          code: `HashSet<Integer> a = new HashSet<>(100);
HashSet<Integer> b = HashSet.newHashSet(100);
StringBuilder sa = new StringBuilder(), sb = new StringBuilder();
int la = -1, lb = -1;
for (int i = 1; i <= 100; i++) {
    a.add(i); b.add(i);
    if (tableLength(a) != la) { la = tableLength(a); sa.append(" #").append(i).append("->").append(la); }
    if (tableLength(b) != lb) { lb = tableLength(b); sb.append(" #").append(i).append("->").append(lb); }
}
System.out.println("new HashSet<>(100):      " + sa);
System.out.println("HashSet.newHashSet(100): " + sb);`,
        },
        {
          type: "output",
          text: `new HashSet<>(100):       #1->128 #97->256
HashSet.newHashSet(100):  #1->256`,
        },
        {
          type: "paragraph",
          text: "`new HashSet<>(100)` means \"100 buckets\" (rounded up to 128), not \"room for 100 elements\". With a 0.75 load factor, 128 buckets hold only 96 elements, so adding 100 still caused one full resize. `HashSet.newHashSet(100)` (Java 19+) takes the expected **element count** and sizes the table so no resize happens.",
        },
        {
          type: "heading",
          text: "TreeSet: the tree, drawn by the JDK itself",
        },
        {
          type: "paragraph",
          text: "`javap -p 'java.util.TreeMap$Entry'` shows each tree node holds `key`, `value`, `left`, `right`, `parent` and a `boolean color`, and `javap -p -constants java.util.TreeMap` shows `RED = false` and `BLACK = true`. Sorted input is the worst case for a plain binary search tree (it turns into a straight line), so I added 1 to 7 in order and printed the real tree, rotated 90 degrees (root on the left, right subtree above):",
        },
        {
          type: "code",
          language: "java",
          title: "TreeShape.java",
          code: `import java.lang.reflect.Field;
import java.util.*;

public class TreeShape {
    static Field f(Class<?> c, String name) throws Exception {
        Field field = c.getDeclaredField(name);
        field.setAccessible(true);
        return field;
    }

    static Class<?> entry;

    static void print(Object node, String indent) throws Exception {
        if (node == null) return;
        print(f(entry, "right").get(node), indent + "        ");
        boolean black = f(entry, "color").getBoolean(node);
        System.out.println(indent + f(entry, "key").get(node) + (black ? " (B)" : " (R)"));
        print(f(entry, "left").get(node), indent + "        ");
    }

    public static void main(String[] args) throws Exception {
        entry = Class.forName("java.util.TreeMap$Entry");
        TreeSet<Integer> set = new TreeSet<>();
        for (int i = 1; i <= 7; i++) set.add(i);             // sorted input, worst case for a plain BST
        TreeMap<?, ?> map = (TreeMap<?, ?>) f(TreeSet.class, "m").get(set);
        print(f(TreeMap.class, "root").get(map), "");
    }
}`,
        },
        {
          type: "output",
          text: `                        7 (R)
                6 (B)
                        5 (R)
        4 (R)
                3 (B)
2 (B)
        1 (B)`,
        },
        {
          type: "paragraph",
          text: "Tilt your head to the left and it's a tree with `2` at the root, `1` on its left, `4` on its right, and so on. Seven sorted inserts produced a tree only four levels deep instead of a seven-node chain. That's the red-black tree's rotations and recolouring at work.",
        },
        {
          type: "paragraph",
          text: "Its rules (the root is black, a red node has no red child, every path from a node down to the leaves has the same number of black nodes) guarantee the height stays at most about 2 log2(n), so every `add`, `contains` and `remove` is O(log n). A million elements means at most about 40 comparisons.",
        },
        {
          type: "paragraph",
          text: "`TreeSet.add` has the same shape as `HashSet.add`: `javap -c` shows `m.put(e, PRESENT)` followed by an `ifnonnull` check. The difference is all inside `TreeMap.put`, which walks down from the root calling `compare` (or `compareTo`) at each node, going left on a negative result, right on positive, and **replacing the value and stopping on 0**. That last part is why a comparator that returns 0 for two different objects makes the set drop one of them.",
        },
        {
          type: "heading",
          text: "EnumSet: a set that's really a bit field",
        },
        {
          type: "code",
          language: "java",
          title: "Enums.java",
          code: `import java.util.*;

public class Enums {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    public static void main(String[] args) {
        EnumSet<Day> weekend = EnumSet.of(Day.SUN, Day.SAT);
        EnumSet<Day> weekdays = EnumSet.complementOf(weekend);
        System.out.println(weekend + " " + weekdays);
        System.out.println(EnumSet.range(Day.TUE, Day.THU));
        System.out.println(weekend.getClass().getName());
    }
}`,
        },
        {
          type: "output",
          text: `[SAT, SUN] [MON, TUE, WED, THU, FRI]
[TUE, WED, THU]
java.util.RegularEnumSet`,
        },
        {
          type: "paragraph",
          text: "I added `SUN` before `SAT` and it still printed in declaration order. The runtime class is `RegularEnumSet`, which stores the whole set in a single `long`, one bit per enum constant (for enums with up to 64 constants; bigger enums get `JumboEnumSet`, an array of `long`s). `contains` is a bit test and `complementOf` is a bitwise NOT. For a set of enum values, `EnumSet` beats every other set on both speed and memory.",
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
          code: `Set<String> hs  = new HashSet<>();
Set<String> lhs = new LinkedHashSet<>();
NavigableSet<Integer> ts = new TreeSet<>();
Set<String> byLength = new TreeSet<>(Comparator.comparing(String::length)
                                              .thenComparing(Comparator.naturalOrder()));
Set<String> sized = HashSet.newHashSet(10_000);  // Java 19+: room for 10,000 elements
Set<String> fixed = Set.of("a", "b");             // immutable, no nulls, no duplicates

boolean isNew = hs.add("x");    hs.contains("x");    hs.remove("x");
a.addAll(b);     // union          a.retainAll(b);   // intersection
a.removeAll(b);  // difference     (all three change a: copy first)

ts.first(); ts.last(); ts.floor(7); ts.ceiling(7); ts.lower(7); ts.higher(7);
ts.headSet(10); ts.tailSet(10); ts.subSet(5, 10); ts.descendingSet(); ts.pollFirst();`,
        },
        {
          type: "heading",
          text: "Order, side by side",
        },
        {
          type: "code",
          language: "java",
          title: "OrderCompare.java",
          code: `import java.util.*;

public class OrderCompare {
    public static void main(String[] args) {
        List<String> arrivals = List.of("Ravi", "Asha", "Meena", "Asha", "Kabir", "Dev");
        System.out.println("HashSet       " + new HashSet<>(arrivals));
        System.out.println("LinkedHashSet " + new LinkedHashSet<>(arrivals));
        System.out.println("TreeSet       " + new TreeSet<>(arrivals));
    }
}`,
        },
        {
          type: "output",
          text: `HashSet       [Ravi, Asha, Dev, Kabir, Meena]
LinkedHashSet [Ravi, Asha, Meena, Kabir, Dev]
TreeSet       [Asha, Dev, Kabir, Meena, Ravi]`,
        },
        {
          type: "paragraph",
          text: "All three dropped the second `Asha`. The `HashSet` line is bucket order, the one `BucketPeek` explained. It's the same on every run of this JDK for these strings, but it's not a promise: another JDK, a different initial capacity or a few more elements can change it.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "equals without hashCode",
        },
        {
          type: "code",
          language: "java",
          title: "BrokenKey.java",
          code: `import java.util.HashSet;
import java.util.Set;

public class BrokenKey {
    static class NoHash {
        final String plate;
        NoHash(String plate) { this.plate = plate; }
        @Override public boolean equals(Object o) {
            return o instanceof NoHash other && plate.equals(other.plate);
        }
        // hashCode() not overridden
    }

    record Cab(String plate) { }                 // records get equals and hashCode

    public static void main(String[] args) {
        Set<NoHash> broken = new HashSet<>();
        broken.add(new NoHash("WB-01"));
        broken.add(new NoHash("WB-01"));
        System.out.println("equals only:    size " + broken.size()
            + ", contains? " + broken.contains(new NoHash("WB-01")));

        Set<Cab> fixed = new HashSet<>();
        fixed.add(new Cab("WB-01"));
        fixed.add(new Cab("WB-01"));
        System.out.println("equals+hashCode: size " + fixed.size()
            + ", contains? " + fixed.contains(new Cab("WB-01")));
    }
}`,
        },
        {
          type: "output",
          text: `equals only:    size 2, contains? false
equals+hashCode: size 1, contains? true`,
        },
        {
          type: "paragraph",
          text: "Two cabs with the same plate are `equals`, yet the set kept both and can't find a third.",
        },
        {
          type: "paragraph",
          text: "Without an override, `hashCode` comes from `Object` and is based on object identity, so each new object most likely lands in a different bucket and `equals` is never called. (It's \"most likely\" because identity hash codes can collide by chance; it's still broken either way.) A `record` generates matching `equals` and `hashCode` from its fields, which is why I reach for records for value-like keys.",
        },
        {
          type: "heading",
          text: "Changing an element after adding it",
        },
        {
          type: "code",
          language: "java",
          title: "MutableTrap.java",
          code: `import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class MutableTrap {
    static class Seat {
        String code;
        Seat(String code) { this.code = code; }
        @Override public boolean equals(Object o) {
            return o instanceof Seat s && code.equals(s.code);
        }
        @Override public int hashCode() { return Objects.hash(code); }
        @Override public String toString() { return code; }
    }

    public static void main(String[] args) {
        Set<Seat> booked = new HashSet<>();
        Seat seat = new Seat("S1-12");
        booked.add(seat);

        seat.code = "S1-13";                       // mutate while inside the set
        System.out.println("set          " + booked);
        System.out.println("contains it? " + booked.contains(seat));
        System.out.println("remove it?   " + booked.remove(seat));
        System.out.println("size         " + booked.size());
        System.out.println("iterate finds it: " + booked.stream().anyMatch(s -> s == seat));
    }
}`,
        },
        {
          type: "output",
          text: `set          [S1-13]
contains it? false
remove it?   false
size         1
iterate finds it: true`,
        },
        {
          type: "paragraph",
          text: "This one is spooky. The seat is visibly in the set, iteration finds it, but `contains` and `remove` both say no. The node was filed in the bucket for the **old** hash code (`\"S1-12\"`) and the node even caches that old hash. Lookups now compute the new hash and search a different bucket.",
        },
        {
          type: "paragraph",
          text: "The element is stuck: it can't be found or removed, only cleared with everything else. It's a classic memory leak in long-lived sets.",
        },
        {
          type: "paragraph",
          text: "The rule: never change the fields that `equals` and `hashCode` use while the object is in a hash-based set or used as a map key. Immutable elements (records, `String`) make it impossible.",
        },
        {
          type: "heading",
          text: "LinkedHashSet: re-adding doesn't move an element",
        },
        {
          type: "code",
          language: "java",
          title: "Reinsert.java",
          code: `import java.util.*;

public class Reinsert {
    public static void main(String[] args) {
        LinkedHashSet<String> seen = new LinkedHashSet<>(List.of("Ravi", "Asha", "Meena"));
        seen.add("Ravi");                       // already there: order unchanged
        System.out.println("add again    " + seen);
        seen.remove("Ravi");
        seen.add("Ravi");                       // removed then added: now last
        System.out.println("remove+add   " + seen);
        seen.addFirst("Kabir");                 // Java 21 SequencedSet
        seen.addLast("Asha");                   // moves an existing element to the end
        System.out.println("addFirst/Last " + seen);
        System.out.println("first " + seen.getFirst() + ", last " + seen.getLast()
            + ", reversed " + seen.reversed());
    }
}`,
        },
        {
          type: "output",
          text: `add again    [Ravi, Asha, Meena]
remove+add   [Asha, Meena, Ravi]
addFirst/Last [Kabir, Meena, Ravi, Asha]
first Kabir, last Asha, reversed [Asha, Ravi, Meena, Kabir]`,
        },
        {
          type: "paragraph",
          text: "Plain `add` of an existing element leaves its position alone: insertion order means **first** insertion. The Java 21 methods are different: `addLast(\"Asha\")` moved the existing `Asha` to the end, and `addFirst` puts an element at the front. That makes a `LinkedHashSet` a neat \"recently used\" list.",
        },
        {
          type: "heading",
          text: "TreeSet's navigation methods",
        },
        {
          type: "paragraph",
          text: "A cab company charges by distance slabs: 50, 100, 200, 500 and 1000 rupees. Given any amount, I want the nearest slab below or above it:",
        },
        {
          type: "code",
          language: "java",
          title: "Navigable.java",
          code: `import java.util.*;

public class Navigable {
    public static void main(String[] args) {
        TreeSet<Integer> slabs = new TreeSet<>(List.of(50, 100, 200, 500, 1000));
        System.out.println("floor(250)    " + slabs.floor(250));      // greatest <= 250
        System.out.println("ceiling(250)  " + slabs.ceiling(250));    // smallest >= 250
        System.out.println("lower(200)    " + slabs.lower(200));      // strictly less
        System.out.println("higher(200)   " + slabs.higher(200));     // strictly greater
        System.out.println("floor(10)     " + slabs.floor(10));       // nothing below
        System.out.println("headSet(200)  " + slabs.headSet(200));    // < 200
        System.out.println("headSet(200, true) " + slabs.headSet(200, true));
        System.out.println("tailSet(200)  " + slabs.tailSet(200));    // >= 200
        System.out.println("subSet(100, 500) " + slabs.subSet(100, 500));
        System.out.println("first/last    " + slabs.first() + " / " + slabs.last());
        System.out.println("descending    " + slabs.descendingSet());

        SortedSet<Integer> cheap = slabs.headSet(200);
        slabs.add(75);                                              // views are live
        System.out.println("view after add(75) " + cheap);
        try {
            cheap.add(300);
        } catch (IllegalArgumentException e) {
            System.out.println("cheap.add(300) -> " + e.getMessage());
        }
        System.out.println("pollFirst     " + slabs.pollFirst() + ", now " + slabs);
    }
}`,
        },
        {
          type: "output",
          text: `floor(250)    200
ceiling(250)  500
lower(200)    100
higher(200)   500
floor(10)     null
headSet(200)  [50, 100]
headSet(200, true) [50, 100, 200]
tailSet(200)  [200, 500, 1000]
subSet(100, 500) [100, 200]
first/last    50 / 1000
descending    [1000, 500, 200, 100, 50]
view after add(75) [50, 75, 100]
cheap.add(300) -> key out of range
pollFirst     50, now [75, 100, 200, 500, 1000]`,
        },
        {
          type: "list",
          items: [
            "`floor` and `ceiling` include the value itself, `lower` and `higher` don't. All four return `null` when nothing qualifies, so check for it (and don't unbox into an `int` blindly).",
            "The one-argument range methods follow the usual Java convention: `headSet(x)` excludes `x`, `tailSet(x)` includes it, `subSet(a, b)` is `a` inclusive to `b` exclusive. The `boolean` overloads let me choose.",
            "Range sets are live **views** into the same tree. `add(75)` on the parent showed up in `cheap`, and adding something outside the view's range throws `IllegalArgumentException`.",
            "Each of these is O(log n): one walk down the tree. Doing the same with a `HashSet` would mean scanning every element.",
          ],
        },
        {
          type: "heading",
          text: "When compareTo disagrees with equals",
        },
        {
          type: "code",
          language: "java",
          title: "ComparatorTrap.java",
          code: `import java.math.BigDecimal;
import java.util.*;

public class ComparatorTrap {
    public static void main(String[] args) {
        Set<String> names = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        names.add("asha");
        System.out.println("add Asha? " + names.add("Asha") + ", set " + names);

        BigDecimal a = new BigDecimal("1.0"), b = new BigDecimal("1.00");
        System.out.println("equals " + a.equals(b) + ", compareTo " + a.compareTo(b));
        System.out.println("HashSet size " + new HashSet<>(List.of(a, b)).size()
            + ", TreeSet size " + new TreeSet<>(List.of(a, b)).size());
    }
}`,
        },
        {
          type: "output",
          text: `add Asha? false, set [asha]
equals false, compareTo 0
HashSet size 2, TreeSet size 1`,
        },
        {
          type: "paragraph",
          text: "`\"Asha\"` and `\"asha\"` aren't `equals`, but the case-insensitive comparator says they're the same, so the `TreeSet` rejected the second one. `BigDecimal` is the famous example from the JDK itself: `1.0` and `1.00` differ in `equals` (scale counts) but `compareTo` returns 0. The same two values give a `HashSet` of size 2 and a `TreeSet` of size 1.",
        },
        {
          type: "paragraph",
          text: "The `Set` contract is written in terms of `equals`, so a `TreeSet` whose ordering is **inconsistent with equals** quietly breaks it. Sometimes that's what I want (case-insensitive usernames), but it has to be a decision, not an accident.",
        },
        {
          type: "heading",
          text: "A comparator that compares too little",
        },
        {
          type: "code",
          language: "java",
          title: "ByFare.java",
          code: `import java.util.*;

public class ByFare {
    record Trip(String id, int fare) { }

    public static void main(String[] args) {
        Comparator<Trip> byFareOnly = Comparator.comparingInt(Trip::fare);
        Set<Trip> wrong = new TreeSet<>(byFareOnly);
        wrong.add(new Trip("T1", 200));
        wrong.add(new Trip("T2", 200));         // same fare: treated as a duplicate
        System.out.println("fare only    " + wrong);

        Comparator<Trip> byFareThenId = byFareOnly.thenComparing(Trip::id);
        Set<Trip> right = new TreeSet<>(byFareThenId);
        right.add(new Trip("T1", 200));
        right.add(new Trip("T2", 200));
        right.add(new Trip("T0", 90));
        System.out.println("fare then id " + right);
    }
}`,
        },
        {
          type: "output",
          text: `fare only    [Trip[id=T1, fare=200]]
fare then id [Trip[id=T0, fare=90], Trip[id=T1, fare=200], Trip[id=T2, fare=200]]`,
        },
        {
          type: "paragraph",
          text: "This is the bug I'd actually expect in real code: \"sort trips by fare\" in a `TreeSet`, and every trip with the same fare silently disappears. The fix is a **tie-breaker** on something unique, so the comparator only returns 0 for truly identical elements.",
        },
        {
          type: "heading",
          text: "No ordering, no TreeSet",
        },
        {
          type: "code",
          language: "java",
          title: "NotComparable.java",
          code: `import java.util.*;

public class NotComparable {
    static class Driver {
        final String name;
        Driver(String name) { this.name = name; }
    }

    public static void main(String[] args) {
        Set<Driver> drivers = new TreeSet<>();
        try {
            drivers.add(new Driver("Asha"));
        } catch (ClassCastException e) {
            System.out.println(e.getMessage());
        }
        try {
            new TreeSet<String>().add(null);
        } catch (NullPointerException e) {
            System.out.println("TreeSet.add(null) -> NullPointerException");
        }
        Set<String> hs = new HashSet<>();
        hs.add(null);
        System.out.println("HashSet with null " + hs + ", contains null? " + hs.contains(null));
    }
}`,
        },
        {
          type: "output",
          text: `class NotComparable$Driver cannot be cast to class java.lang.Comparable (NotComparable$Driver is in unnamed module of loader 'app'; java.lang.Comparable is in module java.base of loader 'bootstrap')
TreeSet.add(null) -> NullPointerException
HashSet with null [null], contains null? true`,
        },
        {
          type: "paragraph",
          text: "`new TreeSet<Driver>()` compiles, because the constructor can't require `Comparable` at compile time. It fails on the very first `add`, even into an empty set, because `TreeMap.put` compares the first key with itself as a type check. Same reason `null` fails immediately. `HashSet` stores `null` happily (in bucket 0, since `HashMap` treats the hash of `null` as 0).",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Overriding equals but not hashCode",
        },
        {
          type: "paragraph",
          text: "`BrokenKey` kept two \"equal\" cabs. Always override both, or use a `record`. IDEs and Lombok's `@EqualsAndHashCode` can generate them, but generated code still needs to use the right fields.",
        },
        {
          type: "heading",
          text: "Mutating an element inside a HashSet",
        },
        {
          type: "paragraph",
          text: "`MutableTrap` left an element that can't be found or removed. Keep set elements immutable, or at least never change the fields used by `hashCode` while they're inside.",
        },
        {
          type: "heading",
          text: "Relying on HashSet order",
        },
        {
          type: "paragraph",
          text: "It's bucket order and it shifts when the table resizes. Tests that compare a `HashSet`'s `toString` to a fixed string pass until the day they don't. Use `LinkedHashSet` or `TreeSet` when order is part of the requirement, and compare sets with `equals` in tests.",
        },
        {
          type: "heading",
          text: "A TreeSet comparator without a tie-breaker",
        },
        {
          type: "paragraph",
          text: "`ByFare` lost every trip that shared a fare. If two different elements can compare as 0, add `thenComparing` on a unique field.",
        },
        {
          type: "heading",
          text: "Expecting retainAll, addAll or removeAll to return a new set",
        },
        {
          type: "paragraph",
          text: "They modify the set they're called on and return a `boolean` (\"did it change?\"). To keep the originals, copy first: `Set<String> both = new HashSet<>(a); both.retainAll(b);`.",
        },
        {
          type: "heading",
          text: "Pre-sizing with new HashSet<>(n)",
        },
        {
          type: "paragraph",
          text: "The argument is the bucket count, not the element count. `PresizeCheck` showed `new HashSet<>(100)` still resized while adding 100 elements. On Java 19+, use `HashSet.newHashSet(n)`; on older versions, `new HashSet<>((int) (n / 0.75f) + 1)`.",
        },
        {
          type: "heading",
          text: "Unboxing a floor or ceiling result",
        },
        {
          type: "paragraph",
          text: "`int slab = slabs.floor(amount);` throws `NullPointerException` when there's nothing below `amount`, as `floor(10)` returning `null` showed. Keep it as `Integer` and check.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Default to `HashSet`. Use `LinkedHashSet` when I need insertion order (deduplicating while keeping the original order), and `TreeSet` when I need sorted order or nearest-value and range queries.",
            "Declare as `Set<T>`, or `NavigableSet<T>` when I use the `TreeSet` navigation methods, so the type tells the reader what I rely on.",
            "Make elements immutable. Records are ideal: correct `equals` and `hashCode` for free, and nothing to mutate.",
            "Keep `compareTo` consistent with `equals` unless I deliberately want otherwise, and document it when I don't.",
            "Use `Set.of(...)` for fixed sets of constants and `EnumSet` for sets of enum values.",
            "Use the `boolean` from `add` instead of a separate `contains` check: `if (seen.add(id)) { firstTime(id); }` does one lookup, not two.",
            "Pre-size big sets with `HashSet.newHashSet(expected)`.",
            "For sets shared between threads, use `ConcurrentHashMap.newKeySet()` or `ConcurrentSkipListSet` (the sorted one). Both are covered in the Multithreading and Concurrency track.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "table",
          headers: ["Operation", "HashSet", "LinkedHashSet", "TreeSet"],
          rows: [
            ["`add`", "O(1) average", "O(1) average", "O(log n)"],
            ["`contains`", "O(1) average", "O(1) average", "O(log n)"],
            ["`remove`", "O(1) average", "O(1) average", "O(log n)"],
            ["Iterate all", "O(n + table length)", "O(n)", "O(n)"],
            ["`first` / `last`", "-", "O(1) (`getFirst`/`getLast`)", "O(log n)"],
            ["`floor` / `ceiling` / ranges", "Not available (O(n) scan)", "Not available", "O(log n)"],
            ["Worst case per lookup", "O(log n) once a bucket is treeified, O(n) for a bucket of non-comparable colliding keys", "Same as HashSet", "O(log n)"],
          ],
        },
        {
          type: "list",
          items: [
            "Hash-based O(1) depends entirely on `hashCode` spreading elements out. A `hashCode` that returns a constant puts everything in one bucket, and the set behaves like a list scan.",
            "Iterating a `HashSet` visits every bucket, including empty ones, so a set that once held a million elements and was then emptied with `remove` is still slow to iterate. `LinkedHashSet` iterates its linked list and doesn't have that problem.",
            "`LinkedHashSet` costs a bit more memory than `HashSet`: every entry carries two extra references (`before` and `after`, visible in `javap -p 'java.util.LinkedHashMap$Entry'`).",
            "`TreeSet` makes O(log n) comparisons per operation, and each is a method call into `compareTo` or a `Comparator`. For pure membership checks, a `HashSet` is usually faster; `TreeSet` earns its place when the ordering or the navigation methods are actually used.",
            "`EnumSet` is the fastest set of all for enum values: operations are bit operations on a `long`.",
            "No timing numbers here on purpose. They depend on the element type, the `hashCode` quality and the JIT, and the honest way to get them is a JMH benchmark with real data.",
          ],
        },
      ],
    },
    {
      title: "Sets in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A small analytics service that counts today's unique visitors for a dashboard, the kind of thing behind a \"1,240 unique visitors today\" tile. It also shows the first few visitors of the day, so it needs uniqueness **and** first-visit order.",
        },
        {
          type: "code",
          language: "java",
          title: "UniqueVisitors.java",
          code: `import java.util.*;

public class UniqueVisitors {
    private final Set<String> seenToday = new LinkedHashSet<>();   // unique, first-visit order

    // true only the first time a visitor shows up today
    boolean recordVisit(String visitorId) {
        return seenToday.add(visitorId);
    }

    int uniqueCount() { return seenToday.size(); }

    List<String> firstVisitors(int n) {
        return seenToday.stream().limit(n).toList();
    }

    void startNewDay() { seenToday.clear(); }

    public static void main(String[] args) {
        UniqueVisitors stats = new UniqueVisitors();
        String[] hits = {"u-7", "u-3", "u-7", "u-9", "u-3", "u-1"};
        for (String id : hits) {
            if (stats.recordVisit(id)) System.out.println("new visitor " + id);
        }
        System.out.println("page views " + hits.length + ", unique " + stats.uniqueCount());
        System.out.println("first two  " + stats.firstVisitors(2));
        stats.startNewDay();
        System.out.println("after reset " + stats.uniqueCount());
    }
}`,
        },
        {
          type: "output",
          text: `new visitor u-7
new visitor u-3
new visitor u-9
new visitor u-1
page views 6, unique 4
first two  [u-7, u-3]
after reset 0`,
        },
        {
          type: "list",
          items: [
            "`recordVisit` uses the `boolean` from `add` directly. One hash lookup answers \"is this new?\" and records it at the same time.",
            "Visitor ids are `String`s: immutable, with a good `hashCode`. No mutable-key surprises.",
            "If the dashboard didn't need first-visit order, a plain `HashSet` would do, slightly lighter on memory.",
            "Memory grows with every unique visitor, which is fine for thousands a day. For millions, real systems keep the set in Redis, or switch to an approximate counter like HyperLogLog, which estimates unique counts in a few kilobytes.",
            "Web requests arrive on many threads at once, and `LinkedHashSet` isn't thread-safe. A concurrent version would use `ConcurrentHashMap.newKeySet()`, from the concurrency track.",
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
              question: "What's the difference between HashSet, LinkedHashSet and TreeSet?",
              answer:
                "All three store unique elements. `HashSet` has no order and O(1) average operations. `LinkedHashSet` keeps insertion order, also O(1) average, with a bit more memory. `TreeSet` keeps elements sorted, with O(log n) operations, and adds navigation methods like `floor`, `ceiling`, `headSet` and `tailSet`.\n\nUnder the hood they're a `HashMap`, a `LinkedHashMap` and a `TreeMap` respectively, which I confirmed by reading their private fields with reflection.",
            },
            {
              question: "How does a HashSet prevent duplicates?",
              answer:
                "It stores each element as a key in an internal `HashMap`, and a map can't have duplicate keys. `add(e)` is `map.put(e, PRESENT) == null`: `put` returns `null` for a new key, so `add` returns `true`, and returns the old value for an existing key, so `add` returns `false`.\n\nWhether a key already exists is decided by `hashCode` (to find the bucket) and then `equals` (to compare within it).",
            },
            {
              question: "Does HashSet allow null? Does TreeSet?",
              answer:
                "`HashSet` and `LinkedHashSet` allow one `null`. `HashMap` gives `null` a hash of 0, so it lives in bucket 0.\n\n`TreeSet` with natural ordering throws `NullPointerException`, even on an empty set, because it has to call `compareTo`. A `TreeSet` with a null-friendly comparator, like `Comparator.nullsFirst(...)`, can hold one.",
            },
            {
              question: "What happens if you add a duplicate to a set?",
              answer:
                "Nothing changes and `add` returns `false`. The original element stays in the set; the new object isn't stored.\n\nI checked that with a record whose `equals` only looked at the plate: after adding a second `Cab` with the same plate and a different note, the set still held the first one.",
            },
            {
              question: "Why should a class used in a HashSet override both equals and hashCode?",
              answer:
                "Because the set uses `hashCode` to pick the bucket and `equals` only inside that bucket. If equal objects have different hash codes, they go to different buckets, `equals` is never called, and both are kept.\n\nMy `BrokenKey` class overrode only `equals`, and the set ended up with two equal cabs and `contains` returned `false` for a third. A `record` fixes it by generating both.",
            },
            {
              question: "What do floor, ceiling, lower and higher return in a TreeSet?",
              answer:
                "`floor(x)` is the greatest element less than or equal to `x`, `ceiling(x)` the smallest greater than or equal. `lower` and `higher` are the strict versions. Each returns `null` if there's no such element.\n\nWith slabs `{50, 100, 200, 500, 1000}`, `floor(250)` was 200, `ceiling(250)` was 500, and `floor(10)` was `null`.",
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
              question: "You add an object to a HashSet, change one of its fields, and then contains returns false. Why?",
              answer:
                "The field was part of `hashCode`. The element was filed in the bucket for its old hash, and the node even stores that old hash. `contains` computes the new hash, looks in a different bucket, and doesn't find it.\n\nIn `MutableTrap`, the seat was still printed by the set and found by iteration, but `contains` and `remove` both returned `false`. It's effectively leaked until the set is cleared. Elements of hash-based sets should be immutable.",
            },
            {
              question: "Why can a TreeSet and a HashSet built from the same elements have different sizes?",
              answer:
                "Because they decide duplicates differently. `HashSet` uses `equals` and `hashCode`; `TreeSet` treats elements as equal when `compareTo` or the comparator returns 0.\n\n`new BigDecimal(\"1.0\")` and `new BigDecimal(\"1.00\")` aren't `equals`, but `compareTo` returns 0. The same two values gave a `HashSet` of size 2 and a `TreeSet` of size 1 in my test.",
            },
            {
              question: "What does \"compareTo consistent with equals\" mean, and why does it matter?",
              answer:
                "It means `a.compareTo(b) == 0` exactly when `a.equals(b)`. Sorted sets and maps rely only on comparison, while the `Set` interface's contract is written in terms of `equals`. If the two disagree, a `TreeSet` can drop elements that `equals` considers different, or behave differently from other sets with the same contents.\n\nA case-insensitive `TreeSet` rejected `\"Asha\"` after `\"asha\"`. A comparator by fare alone dropped every trip that shared a fare. Adding a tie-breaker with `thenComparing` fixes the second case.",
            },
            {
              question: "What's the catch with new HashSet<>(100)?",
              answer:
                "The argument is the initial bucket count, not the expected number of elements. It's rounded up to 128 buckets, and with the default 0.75 load factor that holds only 96 elements before resizing.\n\nI traced it: adding 100 elements to `new HashSet<>(100)` resized from 128 to 256 at the 97th add. `HashSet.newHashSet(100)`, added in Java 19, takes the element count and sized the table to 256 up front with no resize.",
            },
            {
              question: "Does re-adding an existing element move it in a LinkedHashSet?",
              answer:
                "No. Plain `add` of an element that's already present changes nothing, so its original position stays. To move it to the end, remove and re-add it, or on Java 21 call `addLast`, which moves an existing element.\n\n`Reinsert` showed all three behaviours.",
            },
            {
              question: "Why does new TreeSet<>() compile for a class that isn't Comparable, and when does it fail?",
              answer:
                "The no-argument constructor can't express \"E must be Comparable\" without breaking the comparator constructor, so the check is left to runtime. It fails on the first `add`, even into an empty set, with a `ClassCastException` saying the class can't be cast to `java.lang.Comparable`.\n\nThe fixes are to implement `Comparable` or pass a `Comparator` to the constructor.",
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
              question: "What is PRESENT in HashSet?",
              answer:
                "A `static final Object`, one plain `new Object()` shared by every `HashSet`. Since the backing `HashMap` needs a value for each key, every element maps to this same dummy object.\n\nUsing a non-null value matters: `HashMap.put` returns the previous value, and `add` uses \"was it `null`?\" to decide whether the element was new. Reflection showed every value in the map was the same `PRESENT` instance.",
            },
            {
              question: "How does LinkedHashSet maintain insertion order if it doesn't override add?",
              answer:
                "It doesn't need to. Its constructors call a package-private `HashSet(int, float, boolean)` constructor, and that one stores a `LinkedHashMap` in the `map` field instead of a `HashMap`. The `boolean` is a dummy that only makes the signature different.\n\n`LinkedHashMap` threads a doubly linked list (`before` and `after` on every entry) through its entries in insertion order, and iteration follows that list. All the `HashSet` methods work unchanged on top.",
            },
            {
              question: "How does HashSet decide which bucket an element goes into?",
              answer:
                "`HashMap` takes `hashCode()`, spreads it with `h ^ (h >>> 16)` so the high bits also affect the result, and then masks it with `& (table.length - 1)`. The table length is always a power of two, so that mask is a cheap modulo.\n\nI read the real table: `Ravi`, `Asha` and `Dev` all landed in bucket 4 of 16, and my own index calculation gave 4 for the first two.",
            },
            {
              question: "When does a HashSet resize, and what does that do to iteration order?",
              answer:
                "When the number of elements exceeds table length times the load factor, 0.75 by default. The table doubles and every entry is redistributed into the new table. I saw resizes at the 13th, 25th, 49th and 97th add.\n\nBecause the bucket index depends on the table length, elements can change relative position, so iteration order can change after a resize. That's one concrete reason the order is never guaranteed.",
            },
            {
              question: "What data structure does TreeSet use and why is it O(log n)?",
              answer:
                "A red-black tree inside a `TreeMap`: a self-balancing binary search tree where each node is colored red or black. Its rules keep the longest path at most about twice the shortest, so the height is O(log n) and every add, remove and lookup is one walk down the tree.\n\nI inserted 1 to 7 in sorted order, the worst case for an unbalanced tree, and the real tree was four levels deep with `2` at the root, not a seven-node chain.",
            },
            {
              question: "How is EnumSet implemented?",
              answer:
                "As a bit vector. For enums with up to 64 constants the runtime class is `RegularEnumSet`, which keeps the whole set in one `long`, one bit per constant by ordinal. Bigger enums use `JumboEnumSet` with a `long[]`.\n\nThat makes `contains`, `add` and set operations single bitwise instructions, and iteration always comes out in declaration order. `getClass()` on `EnumSet.of(SUN, SAT)` printed `java.util.RegularEnumSet`.",
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
            "Count the unique words in `\"Tea is hot and the tea is sweet\"`, ignoring case. Hint: lowercase, `split(\" \")`, add to a `HashSet`.",
            "Write a `Cab` class with only `equals` overridden and show that a `HashSet` keeps two equal cabs. Then turn it into a `record` and run it again.",
            "Find the first repeated character in `\"kolkata\"`. Hint: `add` returns `false` the first time you see a repeat.",
            "Remove duplicates from `[u-7, u-3, u-7, u-9, u-3]` while keeping the first-seen order. Hint: one constructor call.",
            "Fare slabs start at 0, 5, 10 and 20 km. Which slab does a 12 km ride fall into? Hint: `floor`.",
            "Build a leaderboard of `record Player(String name, int score)` in a `TreeSet`, highest score first, and print the top three names. Two players have the same score. Hint: `reversed()` and a tie-breaker.",
            "Given Monday's and Tuesday's visitor sets, print visitors on both days, on either day, and only on Monday, without changing the originals. Hint: copy, then `retainAll`, `addAll`, `removeAll`.",
            "Predict the size of `new TreeSet<>(String.CASE_INSENSITIVE_ORDER)` after adding `\"Asha\"`, `\"ASHA\"` and `\"asha\"`. Then run it.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "SetSolutions.java (exercises 1, 3 to 7)",
          code: `import java.util.*;

public class SetSolutions {
    record Player(String name, int score) { }

    public static void main(String[] args) {
        String sentence = "Tea is hot and the tea is sweet";
        Set<String> words = new HashSet<>();
        for (String w : sentence.toLowerCase().split(" ")) words.add(w);
        System.out.println("1  " + words.size() + " unique words");

        Set<Character> seen = new HashSet<>();
        Character firstRepeat = null;
        for (char ch : "kolkata".toCharArray()) {
            if (!seen.add(ch)) { firstRepeat = ch; break; }
        }
        System.out.println("3  first repeat " + firstRepeat);

        List<String> withDupes = List.of("u-7", "u-3", "u-7", "u-9", "u-3");
        System.out.println("4  " + new ArrayList<>(new LinkedHashSet<>(withDupes)));

        TreeSet<Integer> slabs = new TreeSet<>(List.of(0, 5, 10, 20));
        System.out.println("5  12 km falls in slab " + slabs.floor(12));

        Comparator<Player> board = Comparator.comparingInt(Player::score).reversed()
            .thenComparing(Player::name);
        TreeSet<Player> top = new TreeSet<>(board);
        top.add(new Player("Ravi", 80)); top.add(new Player("Asha", 95));
        top.add(new Player("Dev", 80)); top.add(new Player("Meena", 60));
        System.out.println("6  " + top.stream().limit(3).map(Player::name).toList());

        Set<String> monday = Set.of("u-1", "u-2", "u-3"), tuesday = Set.of("u-2", "u-3", "u-4");
        Set<String> both = new TreeSet<>(monday); both.retainAll(tuesday);
        Set<String> either = new TreeSet<>(monday); either.addAll(tuesday);
        Set<String> onlyMonday = new TreeSet<>(monday); onlyMonday.removeAll(tuesday);
        System.out.println("7  both " + both + ", either " + either + ", only Monday " + onlyMonday);
    }
}`,
        },
        {
          type: "output",
          text: `1  6 unique words
3  first repeat k
4  [u-7, u-3, u-9]
5  12 km falls in slab 10
6  [Asha, Dev, Ravi]
7  both [u-2, u-3], either [u-1, u-2, u-3, u-4], only Monday [u-1]`,
        },
        {
          type: "qa",
          items: [
            {
              question: "Exercise 6: why does the leaderboard need thenComparing(Player::name)?",
              answer:
                "Ravi and Dev both scored 80. Comparing by score alone returns 0 for them, and a `TreeSet` treats 0 as \"same element\", so whichever was added second would vanish.\n\nThe name tie-breaker makes them different, and also gives a stable order among equal scores: Dev before Ravi.",
            },
            {
              question: "Exercise 8: what's the size?",
              answer:
                "1. The comparator says all three spellings compare as 0, so only the first one added, `\"Asha\"`, is kept and the other two `add` calls return `false`.\n\nA `HashSet` with the same three strings would have size 3, because `String.equals` is case-sensitive.",
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
          text: `HASHSET        HashMap<E,Object> map; every value = PRESENT
               add(e) = map.put(e, PRESENT) == null
               bucket = (h ^ h>>>16) & (len-1); table 16 on first add
               resize past len*0.75 (16->32 at #13); order = bucket order
LINKEDHASHSET  HashSet whose map is a LinkedHashMap (dummy-boolean ctor)
               insertion order (first add wins); Java 21 addFirst/addLast
TREESET        TreeMap (red-black tree), O(log n), sorted
               duplicate = compare()==0, not equals; no null
               floor<= ceiling>= lower< higher>  head/tail/subSet = views
ENUMSET        bits in a long (RegularEnumSet), declaration order

CONTRACT       equals true -> same hashCode   (records do this for you)
TRAPS          equals without hashCode -> duplicates
               mutate element in set -> can't find or remove it
               comparator without tie-breaker -> silent drops
               new HashSet<>(n) = buckets; use HashSet.newHashSet(n)
THREADS        ConcurrentHashMap.newKeySet(), ConcurrentSkipListSet`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Every everyday `Set` is a `Map` in disguise: the elements are keys, and the value is a shared dummy object.",
            "Hash-based sets live and die by `equals` and `hashCode`, and by elements that don't change while they're inside. `TreeSet` lives and dies by its comparison.",
            "Pick by order: none (`HashSet`), arrival (`LinkedHashSet`), sorted with nearest-value queries (`TreeSet`). Maps, the structure underneath all three, are next.",
          ],
        },
      ],
    },
  ],
};
