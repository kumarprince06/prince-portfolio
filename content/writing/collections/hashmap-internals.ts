import type { Lesson } from "../types";

export const hashMapInternals: Lesson = {
  slug: "hashmap-internals",
  date: "2026-10-29",
  title: "HashMap Internals",
  description:
    "What really happens inside a Java HashMap: the bucket array, hash spreading, power-of-two indexing, collisions, resizing with the lo/hi split and Java 8 treeification, all checked against the live internal state of a JDK 21 map.",
  tags: ["Collections", "HashMap", "Data Structures", "Interview", "JVM"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the token counter at a cloakroom. I hand over my bag and get token number 42. When I come back and show token 42, the attendant goes straight to the right shelf and hands me my bag without opening any other shelf.",
        },
        {
          type: "paragraph",
          text: "A **`HashMap`** is that counter for data. I store a value under a key, like a shop storing how many cups of tea are left under the word `\"tea\"`. Later I give it the key and it hands the value back almost instantly, whether it holds ten items or ten million.",
        },
        {
          type: "paragraph",
          text: "Each key is stored only once. If I put a new value under the same key, the old value is replaced. That makes a HashMap my go-to tool whenever I need to look something up by a name, an id or a code.",
        },
        {
          type: "code",
          language: "java",
          code: `Map<String, Integer> stock = new HashMap<>();
stock.put("tea", 20);
stock.put("coffee", 12);
stock.put("tea", 18);                    // same key, value replaced
System.out.println(stock.get("tea"));
System.out.println(stock.size());`,
        },
        {
          type: "output",
          text: `18
2`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "A `HashMap` finds a value from its key in one quick step, and each key can appear only once.",
        },
      ],
    },
    {
      title: "What a HashMap Is",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the cloakroom at a big railway station. You hand over your bag, the attendant gives you a token, and when you come back with the token he walks straight to one shelf and hands the bag back. He doesn't search every shelf. The token tells him where to look.",
        },
        {
          type: "paragraph",
          text: "A **HashMap** does the same thing for data. It stores **key-value pairs**, like a city name and its base fare, and finds a value by its key in roughly constant time, no matter whether the map holds ten entries or ten million. The key plays the part of the token: from the key, the map computes which shelf, called a **bucket**, the pair lives in.",
        },
        {
          type: "code",
          language: "java",
          code: `Map<String, Integer> baseFare = new HashMap<>();
baseFare.put("Kolkata", 40);      // store
int fare = baseFare.get("Kolkata"); // find: 40, without scanning anything`,
        },
        {
          type: "paragraph",
          text: "This is the single most asked collections topic in Java interviews, and for a good reason. Using a HashMap is easy. Using it **correctly** depends on understanding what's inside: why `hashCode` and `equals` must agree, why a key must never change after it's stored, why iteration order looks random, and why sharing one between threads silently loses data.",
        },
        {
          type: "paragraph",
          text: "So in this lesson I opened a real JDK 21 HashMap with `javap` and reflection and watched every one of those things happen.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 (1996) shipped `java.util.Hashtable`. Every method on it was `synchronized`, it refused `null` keys and values, and it didn't belong to any common interface family, because there wasn't one yet.",
        },
        {
          type: "paragraph",
          text: "Java 1.2 (1998) introduced the **Collections Framework**, designed mainly by Joshua Bloch: `Collection`, `List`, `Set`, `Map` and the classes behind them. `HashMap` was the new general-purpose map. It dropped the built-in locking (most maps are used by one thread, so why pay for locks), allowed one `null` key and any number of `null` values, and implemented the new `Map` interface. `Hashtable` was kept for compatibility, and today it's legacy.",
        },
        {
          type: "paragraph",
          text: "The big internal rewrite came in **Java 8** (2014). Two changes matter for this lesson. Buckets that collect too many entries now turn from a linked list into a small red-black tree (JEP 180), so a flood of colliding keys can't make lookups crawl. And resizing was rewritten to keep each bucket's order, which also ended a famous Java 7 bug where two threads resizing at once could create a loop.",
        },
        {
          type: "paragraph",
          text: "Java 8 also added the default methods on `Map`, like `getOrDefault` and `merge`. More recently, **Java 19** added `HashMap.newHashMap(n)`, which sizes a map correctly for `n` entries.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I stayed with the railway cloakroom, because it maps onto almost every part of a HashMap.",
        },
        {
          type: "list",
          items: [
            "The cloakroom has a row of **lockers numbered 0 to 15**. That's the `table` array with 16 buckets.",
            "Every bag has a long tag number printed on it. That's the key's `hashCode()`. The attendant doesn't care how big the number is; he just needs a locker.",
            "To pick a locker he looks at the **last digits** of the tag number. That's `(n - 1) & hash`, a fast way of taking the hash \"modulo 16\".",
            "Two bags can end up in the same locker. That's a **collision**. The attendant just hangs the second bag behind the first on a hook chain. To return one, he opens that one locker and reads each bag's full name label until it matches. That's `equals()`.",
            "When the lockers get three-quarters full, the station builds a new row twice as long and moves every bag across. That's the **resize** at load factor `0.75`.",
            "If one locker gets absurdly crowded, he swaps the hook chain for a small sorted rack so he can find a bag by binary search. That's **treeification**.",
            "And if a passenger repaints the name on their bag after handing it in, the attendant now looks in the wrong locker and never finds it. That's the **mutable key** trap.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The fields, straight from javap",
        },
        {
          type: "paragraph",
          text: "Before trusting any diagram, I asked the JDK what a HashMap actually holds. `javap -p` lists private members too, and `-constants` prints the values of the constants:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.HashMap | grep -v '('
javap -p -constants java.util.HashMap | grep -E 'static final (int|float)'
javap -p 'java.util.HashMap$Node'`,
        },
        {
          type: "output",
          text: `  transient java.util.HashMap$Node<K, V>[] table;
  transient java.util.Set<java.util.Map$Entry<K, V>> entrySet;
  transient int size;
  transient int modCount;
  int threshold;
  final float loadFactor;

  static final int DEFAULT_INITIAL_CAPACITY = 16;
  static final int MAXIMUM_CAPACITY = 1073741824;
  static final float DEFAULT_LOAD_FACTOR = 0.75f;
  static final int TREEIFY_THRESHOLD = 8;
  static final int UNTREEIFY_THRESHOLD = 6;
  static final int MIN_TREEIFY_CAPACITY = 64;

class java.util.HashMap$Node<K, V> implements java.util.Map$Entry<K, V> {
  final int hash;
  final K key;
  V value;
  java.util.HashMap$Node<K, V> next;`,
        },
        {
          type: "paragraph",
          text: "That's the whole data structure. A HashMap is an **array of `Node` references** (`table`), and each `Node` is one key-value pair plus two extras: the key's spread hash, cached so it never has to call `hashCode()` again, and a `next` pointer to the following node in the same bucket. `size` counts entries, `threshold` is the size at which the next resize happens, and `modCount` counts structural changes so iterators can detect modification while looping.",
        },
        {
          type: "table",
          headers: ["Constant", "Value", "Meaning"],
          rows: [
            ["`DEFAULT_INITIAL_CAPACITY`", "16", "Table length on first use, unless you ask for something else"],
            ["`DEFAULT_LOAD_FACTOR`", "0.75", "Resize when size goes past 75% of the table length"],
            ["`TREEIFY_THRESHOLD`", "8", "A bucket's list turns into a tree when it grows past this"],
            ["`UNTREEIFY_THRESHOLD`", "6", "A tree that shrinks to this size during a resize turns back into a list"],
            ["`MIN_TREEIFY_CAPACITY`", "64", "Below this table length, a crowded bucket triggers a resize instead of a tree"],
            ["`MAXIMUM_CAPACITY`", "2^30", "The table never grows beyond this"],
          ],
        },
        {
          type: "heading",
          text: "The structure in memory",
        },
        {
          type: "diagram",
          text: ` HashMap object
┌──────────────────────┐
│ size = 3             │
│ threshold = 12       │
│ loadFactor = 0.75    │
│ table ───────────────┼──┐
└──────────────────────┘  │
                          ▼
 table: Node[16]
┌───┬───┬───┬─ ─ ─┬────┬─ ─ ─┬────┐
│ 0 │ 1 │ 2 │     │ 10 │     │ 15 │
└───┴─┬─┴───┴─ ─ ─┴─┬──┴─ ─ ─┴────┘
      │             │
      ▼             ▼
 ┌───────────┐  ┌────────────┐    ┌────────────┐
 │hash  ...  │  │hash  ...   │    │hash  ...   │
 │key "Delhi"│  │key "Kolkata│    │key "Pune"  │
 │value 50   │  │value 42    │    │value 45    │
 │next null  │  │next ───────┼───►│next null   │
 └───────────┘  └────────────┘    └────────────┘
                 bucket 10 holds a chain of two`,
          caption:
            "A HashMap is an array of buckets. Each bucket is null, a linked chain of Nodes, or (when crowded) a red-black tree of TreeNodes. This exact layout is what BucketDump prints further down.",
        },
        {
          type: "heading",
          text: "The tree node",
        },
        {
          type: "paragraph",
          text: "Crowded buckets use a different node class. `javap` shows it is a subclass, so a tree bucket can still be walked through `next` like a list:",
        },
        {
          type: "output",
          text: `final class java.util.HashMap$TreeNode<K, V> extends java.util.LinkedHashMap$Entry<K, V> {
  java.util.HashMap$TreeNode<K, V> parent;
  java.util.HashMap$TreeNode<K, V> left;
  java.util.HashMap$TreeNode<K, V> right;
  java.util.HashMap$TreeNode<K, V> prev;
  boolean red;`,
        },
        {
          type: "paragraph",
          text: "`TreeNode` extends `LinkedHashMap.Entry`, which extends `HashMap.Node`. So a tree node carries the four `Node` fields, plus `before`/`after` from `LinkedHashMap.Entry`, plus `parent`, `left`, `right`, `prev` and a colour bit. Roughly twice the size of a plain node, which is why the JDK only builds trees when a bucket is genuinely overloaded.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/collections/hashmap-resize.svg",
          alt: "HashMap resizing from 16 to 32 buckets, splitting bucket 5 holding 5, 21, 37 and 53 into buckets 5 and 21 using hash and 16.",
          caption: "On resize every entry either stays at its index or moves to index + 16, decided by one bit: `hash & oldCap`.",
        },
        {
          type: "image",
          src: "/images/collections/hashmap-buckets.svg",
          alt: "HashMap put of Pune: hashCode, hash spreading, index mask giving bucket 10, a collision chain with Kolkata, and treeify of crowded buckets.",
          caption: "`\"Pune\"` and `\"Kolkata\"` both land in bucket 10 of a 16-slot table; a bucket only becomes a tree when it is crowded **and** the table has at least 64 slots.",
        },
        {
          type: "paragraph",
          text: "The JDK source zip isn't installed on this machine, so everything below comes from three kinds of evidence: `javap` on the real JDK 21 class files (field names, constants, bytecode), reflection into live maps with `--add-opens java.base/java.util=ALL-UNNAMED`, and the well-known structure of the OpenJDK source, which the bytecode lets me double-check.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Why --add-opens",
          text: "Since Java 16, the JDK's internals are strongly encapsulated. Without the flag, `setAccessible(true)` on `HashMap.table` fails with `InaccessibleObjectException: Unable to make field transient java.util.HashMap$Node[] java.util.HashMap.table accessible: module java.base does not \"opens java.util\" to unnamed module`. The flag opens `java.util` to my test code only. It's for learning and debugging, never for production code.",
        },
        {
          type: "heading",
          text: "Step 1: spreading the hash",
        },
        {
          type: "paragraph",
          text: "Every operation starts by turning the key into an `int`. HashMap doesn't use `hashCode()` directly. It runs it through a static method called `hash`, and the bytecode is short enough to read whole:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p java.util.HashMap   # the hash(Object) method`,
        },
        {
          type: "output",
          text: `  static final int hash(java.lang.Object);
    Code:
       0: aload_0
       1: ifnonnull     8
       4: iconst_0
       5: goto          19
       8: aload_0
       9: invokevirtual #1                  // Method java/lang/Object.hashCode:()I
      12: dup
      13: istore_1
      14: iload_1
      15: bipush        16
      17: iushr
      18: ixor
      19: ireturn`,
        },
        {
          type: "paragraph",
          text: "Translated back into Java, that's exactly one line:",
        },
        {
          type: "code",
          language: "java",
          code: `static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}`,
        },
        {
          type: "paragraph",
          text: "A `null` key gets hash `0`. Anything else gets its `hashCode()` XOR-ed with itself shifted right by 16 bits (`iushr` is the unsigned shift `>>>`). This mixes the **high 16 bits into the low 16 bits**. The reason only makes sense after step 2, so here's step 2.",
        },
        {
          type: "heading",
          text: "Step 2: from hash to bucket index",
        },
        {
          type: "paragraph",
          text: "Back at the cloakroom, with 16 lockers the attendant only needs the last digit or two of a long tag number. HashMap does the same with bits.",
        },
        {
          type: "paragraph",
          text: "The bucket index is `(n - 1) & hash`, where `n` is the table length. With `n = 16`, `n - 1` is `15`, binary `1111`, so the `&` keeps only the **lowest 4 bits** of the hash. That's the same answer as `hash % 16` for non-negative numbers, but it's a single AND instruction, with no division and no negative-number trouble.",
        },
        {
          type: "paragraph",
          text: "This trick only works when `n` is a **power of two**, because only then is `n - 1` a solid block of 1 bits. That's why HashMap's table length is always 16, 32, 64 and so on, and why `new HashMap<>(1000)` silently rounds up to 1024 (the internal `tableSizeFor` method does this).",
        },
        {
          type: "paragraph",
          text: "Now the problem: if only the low 4 bits pick the bucket, keys whose hash codes differ only in their **high** bits all crash into the same bucket. `Integer` keys like 65536, 131072 and 196608 are a real example: their low 16 bits are all zero. The spreading step fixes that by folding the high bits down. I checked both effects:",
        },
        {
          type: "code",
          language: "java",
          title: "HashSpread.java",
          code: `public class HashSpread {
    static int spread(Object key) {
        int h = key.hashCode();
        return h ^ (h >>> 16);                 // same formula as HashMap.hash()
    }

    public static void main(String[] args) {
        int n = 16;                            // table length
        for (String city : new String[] {"Kolkata", "Delhi", "Pune"}) {
            int h = city.hashCode();
            System.out.printf("%-8s hashCode=%11d spread=%11d index=%d%n",
                    city, h, spread(city), (n - 1) & spread(city));
        }
        System.out.println("--- keys that differ only in high bits ---");
        for (int key : new int[] {65536, 131072, 196608}) {
            System.out.printf("%6d  without spread -> %d   with spread -> %d%n",
                    key, (n - 1) & key, (n - 1) & spread(key));
        }
    }
}`,
        },
        {
          type: "output",
          text: `Kolkata  hashCode= 1124159915 spread= 1124143786 index=10
Delhi    hashCode=   65915436 spread=   65915329 index=1
Pune     hashCode=    2499228 spread=    2499258 index=10
--- keys that differ only in high bits ---
 65536  without spread -> 0   with spread -> 1
131072  without spread -> 0   with spread -> 2
196608  without spread -> 0   with spread -> 3`,
        },
        {
          type: "list",
          items: [
            "Without spreading, all three `Integer` keys would land in bucket 0. With it, they go to 1, 2 and 3. One XOR and one shift is a very cheap insurance against weak `hashCode()` implementations.",
            "`Kolkata` and `Pune` both land in bucket 10 of a 16-bucket table. A real collision between two ordinary strings, and I'll use it in the next step.",
            "`String.hashCode()` is computed from the characters, so these numbers are the same on every JVM and every run. That's what keeps this whole lesson's output reproducible.",
          ],
        },
        {
          type: "heading",
          text: "Step 3: put, one step at a time",
        },
        {
          type: "paragraph",
          text: "`put` itself is tiny. `javap -c` shows it computes the hash and hands everything to `putVal`:",
        },
        {
          type: "output",
          text: `  public V put(K, V);
    Code:
       0: aload_0
       1: aload_1
       2: invokestatic  #149                // Method hash:(Ljava/lang/Object;)I
       5: aload_1
       6: aload_2
       7: iconst_0
       8: iconst_1
       9: invokevirtual #152                // Method putVal:(ILjava/lang/Object;Ljava/lang/Object;ZZ)Ljava/lang/Object;
      12: areturn`,
        },
        {
          type: "paragraph",
          text: "The two constants are flags: `onlyIfAbsent = false` (so an existing value gets replaced; `putIfAbsent` passes `true`) and `evict = true`. Inside `putVal`, this is the sequence, matching the OpenJDK source and the markers I could see in its bytecode:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "If `table` is `null` or empty, call `resize()` to create it. The table is **lazy**: a new HashMap allocates no array until the first `put`.",
            "Compute `i = (n - 1) & hash` (an `isub` and `iand` in the bytecode) and look at `table[i]`.",
            "If the bucket is empty, create a new `Node(hash, key, value, null)` and put it there. Done with the lookup part.",
            "Otherwise, check the first node: if its cached `hash` matches **and** the key is the same object (`==`) or `equals()` it, this is an update.",
            "If the first node is a `TreeNode`, delegate to the tree's own insert.",
            "Otherwise walk the chain via `next`. If a matching key is found, it's an update. If the end is reached, **append** the new node at the tail, and if the chain now holds more than 8 nodes, call `treeifyBin` (in the bytecode: a `bipush 7` compare on the loop counter, then `invokevirtual treeifyBin`).",
            "For an update, replace the value, call the `afterNodeAccess` hook (LinkedHashMap uses it) and return the **old** value. No size change.",
            "For a new entry, increment `modCount` and `size`, then `if (++size > threshold) resize()` (a `putfield size`, `getfield threshold`, `if_icmple`, `invokevirtual resize` in the bytecode). Return `null`.",
          ],
        },
        {
          type: "paragraph",
          text: "Note the comparison order in step 4: the cached `int` hash is compared first, because it's nearly free. `equals()`, which might compare long strings, only runs when the hashes already match. I put three cities in a map, overwrote one, and dumped every bucket through reflection:",
        },
        {
          type: "code",
          language: "java",
          title: "BucketDump.java",
          code: `import java.lang.reflect.Field;
import java.util.HashMap;

public class BucketDump {
    public static void main(String[] args) throws Exception {
        HashMap<String, Integer> baseFare = new HashMap<>();
        baseFare.put("Kolkata", 40);
        baseFare.put("Delhi", 50);
        baseFare.put("Pune", 45);
        baseFare.put("Kolkata", 42);                 // same key: value replaced

        Field tableField = HashMap.class.getDeclaredField("table");
        tableField.setAccessible(true);
        Field nextField = Class.forName("java.util.HashMap$Node").getDeclaredField("next");
        nextField.setAccessible(true);

        Object[] table = (Object[]) tableField.get(baseFare);
        int used = 0;
        for (int i = 0; i < table.length; i++) {
            if (table[i] == null) continue;
            used++;
            StringBuilder line = new StringBuilder("bucket[" + i + "]: ");
            for (Object node = table[i]; node != null; node = nextField.get(node))
                line.append(node).append(" -> ");
            System.out.println(line.append("null"));
        }
        System.out.println("size=" + baseFare.size() + ", buckets used=" + used + " of " + table.length);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util=ALL-UNNAMED BucketDump",
        },
        {
          type: "output",
          text: `bucket[1]: Delhi=50 -> null
bucket[10]: Kolkata=42 -> Pune=45 -> null
size=3, buckets used=2 of 16`,
        },
        {
          type: "list",
          items: [
            "`Kolkata` and `Pune` share bucket 10, chained in insertion order: `Pune` was **appended** behind `Kolkata`. Java 8+ adds at the tail; Java 7 added at the head, which matters for the thread-safety story later.",
            "The second `put(\"Kolkata\", 42)` didn't add a node. It found the existing key and replaced 40 with 42. `size` stayed 3.",
            "14 of the 16 buckets are empty. That's normal and is the price paid for speed.",
          ],
        },
        {
          type: "heading",
          text: "Step 4: get",
        },
        {
          type: "paragraph",
          text: "`get` is `put` without the writing. The bytecode shows `get` calls `getNode(key)` and returns the node's `value`, or `null` if there's no node:",
        },
        {
          type: "output",
          text: `  public V get(java.lang.Object);
    Code:
       0: aload_0
       1: aload_1
       2: invokevirtual #158                // Method getNode:(Ljava/lang/Object;)Ljava/util/HashMap$Node;
       5: dup
       6: astore_2
       7: ifnonnull     14
      10: aconst_null
      11: goto          18
      14: aload_2
      15: getfield      #162                // Field java/util/HashMap$Node.value:Ljava/lang/Object;
      18: areturn`,
        },
        {
          type: "paragraph",
          text: "`getNode` computes the hash, picks the bucket with `(n - 1) & hash`, and checks the first node. If that's not it, it either searches the tree or walks the chain, comparing hash first and then `==` or `equals()`. For `get(\"Pune\")` above, that means: hash, index 10, first node is `Kolkata` (hash differs, skip), next node is `Pune` (hash matches, `equals` is true), return 45. Two comparisons, out of a map that could hold millions.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "get() returning null means two things",
          text: "`get` returns `null` when the key is missing **and** when the key is present with a `null` value. The bytecode makes it obvious: both paths end in `areturn` of `null`. If `null` values are possible, use `containsKey`, or better, don't store `null` values at all.",
        },
        {
          type: "heading",
          text: "Step 5: why equals and hashCode must agree",
        },
        {
          type: "paragraph",
          text: "Everyday version: two passengers show the same PNR number at the counter. The clerk should treat them as the same booking. But if the clerk files bookings by the colour of the passenger's shirt, the two \"same\" bookings go into different drawers and are never compared.",
        },
        {
          type: "paragraph",
          text: "HashMap only calls `equals()` on keys in the **same bucket**, and the bucket comes from `hashCode()`. So the contract is: if `a.equals(b)`, then `a.hashCode() == b.hashCode()`. Override `equals` without `hashCode` and two equal keys get `Object`'s identity-based hash codes, almost certainly different buckets, and `equals` never even runs:",
        },
        {
          type: "code",
          language: "java",
          title: "BrokenKey.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class BrokenKey {
    static class PhoneNumber {
        final String digits;
        PhoneNumber(String digits) { this.digits = digits; }
        @Override public boolean equals(Object o) {        // equals without hashCode
            return o instanceof PhoneNumber p && p.digits.equals(digits);
        }
    }

    public static void main(String[] args) {
        Map<PhoneNumber, String> riders = new HashMap<>();
        riders.put(new PhoneNumber("9830012345"), "Asha");
        riders.put(new PhoneNumber("9830012345"), "Asha again");

        System.out.println(riders.size());
        System.out.println(riders.get(new PhoneNumber("9830012345")));
        System.out.println(new PhoneNumber("1").equals(new PhoneNumber("1")));
    }
}`,
        },
        {
          type: "output",
          text: `2
null
true`,
        },
        {
          type: "paragraph",
          text: "Two \"equal\" keys, two entries, and a lookup that finds neither. The fix is to override `hashCode` from the same fields as `equals` (`Objects.hash(digits)`), or just make the key a `record`, which generates both consistently. The reverse direction is allowed: unequal keys may share a hash code. That's simply a collision, and `equals` sorts it out.",
        },
        {
          type: "heading",
          text: "Step 6: load factor, threshold and resize",
        },
        {
          type: "paragraph",
          text: "A car park with 100 spaces feels fine at 60 cars and terrible at 98, because the last few cars circle forever. Buckets work the same way: the fuller the table, the more collisions. So HashMap keeps the table at most 75% full. The **threshold** is `capacity × loadFactor`, `16 × 0.75 = 12` for a default map, and the put that takes `size` above it triggers a resize to **double** the length.",
        },
        {
          type: "code",
          language: "java",
          title: "ResizeWatch.java",
          code: `import java.lang.reflect.Field;
import java.util.HashMap;

public class ResizeWatch {
    static Field table, threshold;

    static String state(HashMap<?, ?> map) throws Exception {
        Object[] t = (Object[]) table.get(map);
        return "size=" + map.size() + " table=" + (t == null ? "null" : t.length)
                + " threshold=" + threshold.get(map);
    }

    public static void main(String[] args) throws Exception {
        table = HashMap.class.getDeclaredField("table");
        threshold = HashMap.class.getDeclaredField("threshold");
        table.setAccessible(true);
        threshold.setAccessible(true);

        HashMap<Integer, String> map = new HashMap<>();
        System.out.println("new       " + state(map));
        int lastLength = 0;
        for (int i = 1; i <= 100; i++) {
            map.put(i, "trip-" + i);
            int length = ((Object[]) table.get(map)).length;
            if (length != lastLength) {
                System.out.println("put #" + i + (i < 10 ? "    " : i < 100 ? "   " : "  ") + state(map));
                lastLength = length;
            }
        }
        System.out.println("end       " + state(map));
    }
}`,
        },
        {
          type: "output",
          text: `new       size=0 table=null threshold=0
put #1    size=1 table=16 threshold=12
put #13   size=13 table=32 threshold=24
put #25   size=25 table=64 threshold=48
put #49   size=49 table=128 threshold=96
put #97   size=97 table=256 threshold=192
end       size=100 table=256 threshold=192`,
        },
        {
          type: "list",
          items: [
            "A brand new `HashMap` has `table=null`. Nothing is allocated until the first `put`, which creates the 16-slot table.",
            "The 13th put resized the table from 16 to 32, because `size` became 13, which is greater than the threshold 12. Then the 25th, 49th and 97th. Every resize doubles the table and doubles the threshold.",
            "So 100 entries in a default map cost **five** array allocations and four full rehashes along the way. That's the case for sizing a map up front, which I measure in the Performance section.",
          ],
        },
        {
          type: "heading",
          text: "Step 7: the resize is cheaper than it looks (the lo/hi split)",
        },
        {
          type: "paragraph",
          text: "When the cloakroom doubles from 16 to 32 lockers, the attendant doesn't need to re-read every tag. A bag in locker 5 can only go to locker 5 or locker 21 (5 + 16). Which one depends on a single extra digit of the tag number.",
        },
        {
          type: "paragraph",
          text: "That's exactly how HashMap resizes. Going from `n` to `2n`, the index uses one more bit of the hash: the bit worth `n`. If that bit is 0, the node stays at index `i` (the **lo** list). If it's 1, it moves to `i + n` (the **hi** list).",
        },
        {
          type: "paragraph",
          text: "`resize()` walks each old bucket once, splits it into those two lists keeping their relative order, and drops them into the new table. No `hashCode()` calls, no full index recomputation. I put four `Integer` keys that all share bucket 5 in a 16-slot table and forced a resize:",
        },
        {
          type: "code",
          language: "java",
          title: "LoHiSplit.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class LoHiSplit {
    static Field tableField, nextField, keyField;

    static List<Object> chain(HashMap<?, ?> map, int index) throws Exception {
        List<Object> keys = new ArrayList<>();
        Object node = ((Object[]) tableField.get(map))[index];
        for (; node != null; node = nextField.get(node)) keys.add(keyField.get(node));
        return keys;
    }

    public static void main(String[] args) throws Exception {
        tableField = HashMap.class.getDeclaredField("table");
        Class<?> nodeClass = Class.forName("java.util.HashMap$Node");
        nextField = nodeClass.getDeclaredField("next");
        keyField = nodeClass.getDeclaredField("key");
        for (Field f : new Field[] {tableField, nextField, keyField}) f.setAccessible(true);

        HashMap<Integer, String> map = new HashMap<>();
        for (int key : new int[] {5, 21, 37, 53}) map.put(key, "seat-" + key);
        System.out.println("table=16  bucket[5]=" + chain(map, 5));

        for (int key = 200; key < 209; key++) map.put(key, "filler");   // 13th put resizes
        System.out.println("table=32  bucket[5]=" + chain(map, 5) + "  bucket[21]=" + chain(map, 21));
    }
}`,
        },
        {
          type: "output",
          text: `table=16  bucket[5]=[5, 21, 37, 53]
table=32  bucket[5]=[5, 37]  bucket[21]=[21, 53]`,
        },
        {
          type: "paragraph",
          text: "An `Integer`'s hash code is its value, and small values aren't changed by spreading. In binary, 5 is `000101`, 21 is `010101`, 37 is `100101` and 53 is `110101`. All end in `0101`, hence bucket 5 at `n = 16`.",
        },
        {
          type: "paragraph",
          text: "The deciding bit for the resize is the one worth 16. 5 and 37 have it clear, so they stay in bucket 5. 21 and 53 have it set, so they move to bucket 5 + 16 = 21. And within each list the original order (5 before 37, 21 before 53) is kept.",
        },
        {
          type: "diagram",
          text: `n = 16                         n = 32   (check the bit worth 16)
bucket 5:  5 → 21 → 37 → 53    bucket 5  (bit = 0, "lo"):  5 → 37
                               bucket 21 (bit = 1, "hi"): 21 → 53
           0b000101  5   bit16=0 → stays at 5
           0b010101  21  bit16=1 → moves to 5 + 16
           0b100101  37  bit16=0 → stays at 5
           0b110101  53  bit16=1 → moves to 5 + 16`,
          caption: "A resize never scatters a bucket randomly. Each node either stays put or moves exactly n slots up, in order.",
        },
        {
          type: "heading",
          text: "Step 8: treeification, and why it waits for 64",
        },
        {
          type: "paragraph",
          text: "If someone could make every bag go into the same locker, the attendant would be back to searching a long chain, which is O(n). That's not just theory: before Java 8, attackers sent web requests with thousands of carefully chosen parameter names that all had the same `String` hash code, and servers spent all their CPU walking one chain (the 2011 \"hash flooding\" attacks).",
        },
        {
          type: "paragraph",
          text: "Java 8's defence: when one bucket's chain grows past `TREEIFY_THRESHOLD` (8), it is converted into a red-black tree of `TreeNode`s, giving O(log n) lookups in that bucket.",
        },
        {
          type: "paragraph",
          text: "But there's a catch. A crowded bucket in a **small** table usually means the table is just too small, not that the keys are bad. So `treeifyBin` first checks the table length: below `MIN_TREEIFY_CAPACITY` (64), it resizes instead. I forced every key into one bucket with a constant hash code and watched the bucket's node class:",
        },
        {
          type: "code",
          language: "java",
          title: "TreeifyWatch.java",
          code: `import java.lang.reflect.Field;
import java.util.HashMap;

public class TreeifyWatch {
    // Every key lands in the same bucket on purpose
    record BadKey(int id) implements Comparable<BadKey> {
        @Override public int hashCode() { return 42; }
        @Override public int compareTo(BadKey o) { return Integer.compare(id, o.id); }
    }

    public static void main(String[] args) throws Exception {
        Field tableField = HashMap.class.getDeclaredField("table");
        tableField.setAccessible(true);

        HashMap<BadKey, String> map = new HashMap<>();
        for (int i = 1; i <= 12; i++) {
            map.put(new BadKey(i), "v" + i);
            Object[] table = (Object[]) tableField.get(map);
            int index = (table.length - 1) & 42;
            System.out.println("keys=" + i + (i < 10 ? " " : "") + "  table=" + table.length
                    + "  bucket[" + index + "] is " + table[index].getClass().getSimpleName());
        }
    }
}`,
        },
        {
          type: "output",
          text: `keys=1   table=16  bucket[10] is Node
keys=2   table=16  bucket[10] is Node
keys=3   table=16  bucket[10] is Node
keys=4   table=16  bucket[10] is Node
keys=5   table=16  bucket[10] is Node
keys=6   table=16  bucket[10] is Node
keys=7   table=16  bucket[10] is Node
keys=8   table=16  bucket[10] is Node
keys=9   table=32  bucket[10] is Node
keys=10  table=64  bucket[42] is Node
keys=11  table=64  bucket[42] is TreeNode
keys=12  table=64  bucket[42] is TreeNode`,
        },
        {
          type: "list",
          items: [
            "Up to 8 keys, the bucket is a plain chain, even though all 8 collide.",
            "The 9th key pushed the chain past 8, but the table was only 16 long, so `treeifyBin` **resized** to 32 instead of building a tree. The map's size was only 9, far below the threshold of 12. This resize was caused purely by the crowded bucket.",
            "The 10th did the same again: 32 to 64. Hash 42 now maps to bucket 42 instead of 10, because `63 & 42 = 42`.",
            "The 11th key finally found a table of 64, so the chain became a red-black tree: `TreeNode`.",
          ],
        },
        {
          type: "paragraph",
          text: "The tree is ordered by hash first. When hashes are equal, as here, it uses `compareTo` if the keys are `Comparable` with each other, which is why I made `BadKey` comparable. Without that, it falls back to a tie-break on class name and identity hash code, and lookups may have to search both sides of the tree. So for a key type that might collide a lot, implementing `Comparable` really does help.",
        },
        {
          type: "heading",
          text: "Step 9: turning a tree back into a list",
        },
        {
          type: "paragraph",
          text: "`UNTREEIFY_THRESHOLD` (6) is used during a resize. When a tree bucket is split into lo and hi halves, any half with 6 or fewer nodes becomes a plain chain again. The gap between 8 and 6 stops a bucket hovering at the edge from flipping back and forth.",
        },
        {
          type: "paragraph",
          text: "To see it, I put 7 keys with hash 42 and 4 with hash 106 into a 64-slot table (both hashes give index 42 there), then forced a resize to 128, where they separate:",
        },
        {
          type: "code",
          language: "java",
          title: "SplitWatch.java",
          code: `import java.lang.reflect.Field;
import java.util.HashMap;

public class SplitWatch {
    record Key(int id, int hash) implements Comparable<Key> {
        @Override public int hashCode() { return hash; }
        @Override public int compareTo(Key o) { return Integer.compare(id, o.id); }
    }

    static Field tableField, nextField;

    static String bucket(HashMap<?, ?> map, int index) throws Exception {
        Object node = ((Object[]) tableField.get(map))[index];
        int count = 0;
        for (Object n = node; n != null; n = nextField.get(n)) count++;   // TreeNodes keep next too
        return node.getClass().getSimpleName() + " with " + count + " entries";
    }

    public static void main(String[] args) throws Exception {
        tableField = HashMap.class.getDeclaredField("table");
        tableField.setAccessible(true);
        nextField = Class.forName("java.util.HashMap$Node").getDeclaredField("next");
        nextField.setAccessible(true);
        HashMap<Key, String> map = new HashMap<>(64);
        for (int i = 0; i < 7; i++) map.put(new Key(i, 42), "lo");        // 42 & 63 = 42
        for (int i = 7; i < 11; i++) map.put(new Key(i, 42 + 64), "hi");  // 106 & 63 = 42
        System.out.println("table=64  bucket[42]:  " + bucket(map, 42));

        for (int i = 0; i < 40; i++) map.put(new Key(100 + i, i), "filler");
        System.out.println("table=" + ((Object[]) tableField.get(map)).length);
        System.out.println("bucket[42]  (lo): " + bucket(map, 42));
        System.out.println("bucket[106] (hi): " + bucket(map, 106));
    }
}`,
        },
        {
          type: "output",
          text: `table=64  bucket[42]:  TreeNode with 11 entries
table=128
bucket[42]  (lo): TreeNode with 7 entries
bucket[106] (hi): Node with 4 entries`,
        },
        {
          type: "paragraph",
          text: "The lo half kept 7 nodes, more than 6, so it stayed a tree. The hi half got 4, so it was untreeified into a plain chain.",
        },
        {
          type: "paragraph",
          text: "Removing entries is slightly different: `remove` doesn't count against 6, it untreeifies when the tree's shape becomes too small (root missing a child, or the left child missing its own left). Extending `TreeifyWatch` to remove keys one by one, the bucket stayed a `TreeNode` down to 4 keys and became a `Node` chain at 3 in my run.",
        },
        {
          type: "heading",
          text: "The null key lives in bucket 0",
        },
        {
          type: "paragraph",
          text: "Since `hash(null)` is `0`, and `(n - 1) & 0` is `0`, a `null` key always goes to bucket 0. There's no special branch for it anywhere else. Only one `null` key can exist, like any other key, while `null` values are unlimited:",
        },
        {
          type: "code",
          language: "java",
          title: "NullKey.java",
          code: `import java.lang.reflect.Field;
import java.util.HashMap;

public class NullKey {
    public static void main(String[] args) throws Exception {
        HashMap<String, Integer> fares = new HashMap<>();
        fares.put(null, 0);              // allowed: one null key
        fares.put("Kolkata", 250);
        fares.put("Delhi", null);        // null values: as many as you like

        Field tableField = HashMap.class.getDeclaredField("table");
        tableField.setAccessible(true);
        Object bucket0 = ((Object[]) tableField.get(fares))[0];
        System.out.println("bucket[0] = " + bucket0);
        System.out.println(fares.get(null) + " " + fares.get("Delhi") + " " + fares.get("Mumbai"));
        System.out.println(fares.containsKey("Delhi") + " " + fares.containsKey("Mumbai"));
    }
}`,
        },
        {
          type: "output",
          text: `bucket[0] = null=0
0 null null
true false`,
        },
        {
          type: "paragraph",
          text: "The middle line is the `get` ambiguity from before, live: `Delhi` (present, value `null`) and `Mumbai` (absent) both return `null`. Only `containsKey` tells them apart. `Hashtable` and `ConcurrentHashMap` reject `null` keys and values precisely to avoid this ambiguity.",
        },
        {
          type: "heading",
          text: "Why iteration order looks random",
        },
        {
          type: "paragraph",
          text: "Iterating a HashMap walks the table from bucket 0 upwards, and each chain from head to tail. So the order is **bucket order**, which depends on the hash codes and the current table length, not on when keys arrived. And because a resize moves nodes to new buckets, the order can change just because the map grew:",
        },
        {
          type: "code",
          language: "java",
          title: "IterationOrder.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class IterationOrder {
    public static void main(String[] args) {
        Map<String, Integer> waitingList = new HashMap<>();
        String[] arrivalOrder = {"Asha", "Ravi", "Meera", "Imran", "Kabir"};
        for (String name : arrivalOrder) waitingList.put(name, name.length());
        System.out.println(waitingList.keySet());

        for (int i = 1; i <= 12; i++) waitingList.put("Extra-" + i, i);   // forces a resize
        waitingList.keySet().removeIf(k -> k.startsWith("Extra-"));
        System.out.println(waitingList.keySet());
    }
}`,
        },
        {
          type: "output",
          text: `[Meera, Asha, Ravi, Kabir, Imran]
[Ravi, Imran, Meera, Asha, Kabir]`,
        },
        {
          type: "paragraph",
          text: "Same five names, never in arrival order, and in a **different** order after the map grew and shrank back, because removing entries never shrinks the table. This output is stable for these `String`s on JDK 21, but nothing promises it across JDK versions. If order matters, use `LinkedHashMap` (arrival order) or `TreeMap` (sorted), which are the next lesson.",
        },
        {
          type: "heading",
          text: "Why HashMap isn't thread-safe",
        },
        {
          type: "paragraph",
          text: "Two cashiers updating the same paper ledger at the same moment: both read \"total 100\", both add their sale, both write their result, and one sale disappears.",
        },
        {
          type: "paragraph",
          text: "That's a **lost update**, and `putVal` is full of read-then-write steps exactly like it: \"is the bucket empty? then write my node\", \"`++size`\", \"is size over threshold? then resize\". With two threads, both can see the same empty bucket and the second write overwrites the first. I let two threads insert 50,000 different keys each:",
        },
        {
          type: "code",
          language: "java",
          title: "LostUpdates.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class LostUpdates {
    public static void main(String[] args) throws Exception {
        Map<Integer, String> map = new HashMap<>();
        Thread a = new Thread(() -> { for (int i = 0; i < 50_000; i++) map.put(i, "a"); });
        Thread b = new Thread(() -> { for (int i = 50_000; i < 100_000; i++) map.put(i, "b"); });
        a.start(); b.start();
        a.join(); b.join();
        System.out.println("expected 100000, size() = " + map.size());
        System.out.println("keys really findable = "
                + java.util.stream.IntStream.range(0, 100_000).filter(map::containsKey).count());
    }
}`,
        },
        {
          type: "table",
          headers: ["Run", "size()", "keys really findable"],
          rows: [
            ["1", "98,064", "73,914"],
            ["2", "97,007", "61,319"],
            ["3", "98,102", "64,777"],
            ["4", "97,056", "85,290"],
            ["5", "98,155", "66,952"],
          ],
        },
        {
          type: "paragraph",
          text: "Five runs on my machine, five different wrong answers, and no exception at all. `size()` itself lost about 2,000 increments, and far fewer keys could actually be found than `size()` claimed, because nodes written into the old table during a concurrent resize were simply dropped. Your numbers will differ every run; the point is that they're never 100,000.",
        },
        {
          type: "callout",
          tone: "note",
          title: "The Java 7 infinite loop",
          text: "Java 7's resize inserted each moved node at the **head** of its new bucket, which reversed chains. If two threads resized at the same time, one could see the other's half-reversed chain and link two nodes to each other, creating a cycle. The next `get` on that bucket looped forever at 100% CPU, a classic production outage. Java 8's tail-preserving lo/hi split removed the cycle, but as my test shows, concurrent use still corrupts the map. I can't run Java 7 here, so this part comes from the JDK history, not my own trace. For shared maps, use `ConcurrentHashMap`, which gets its own lesson in the Multithreading and Concurrency track.",
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
          code: `Map<String, Integer> m = new HashMap<>();          // default: 16 buckets, 0.75
Map<String, Integer> sized = HashMap.newHashMap(500);  // Java 19+: fits 500 without resize

m.put("Howrah", 3);              // insert or replace, returns old value or null
m.get("Howrah");                 // 3, or null if missing
m.getOrDefault("Garia", 0);      // 0 instead of null
m.containsKey("Howrah");         // true
m.remove("Howrah");              // returns removed value
m.size();  m.isEmpty();  m.clear();

m.putIfAbsent("Garia", 1);       // only if no value yet
m.merge("Garia", 1, Integer::sum);           // add 1, or start at 1
m.computeIfAbsent("Behala", k -> 0);         // create on first use
m.compute("Garia", (k, v) -> v == null ? 1 : v * 2);

for (Map.Entry<String, Integer> e : m.entrySet())   // keys and values together
    System.out.println(e.getKey() + "=" + e.getValue());
m.forEach((k, v) -> System.out.println(k + "=" + v));
m.values().removeIf(v -> v == 0);            // safe removal while "looping"`,
        },
        {
          type: "paragraph",
          text: "Declare the variable as `Map`, not `HashMap`, unless you need a HashMap-only method. Then switching to `LinkedHashMap` or `TreeMap` later is a one-word change.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The Java 8 default methods in one go",
        },
        {
          type: "paragraph",
          text: "A tally sheet at a taxi rank: every time a ride goes to a zone, someone adds a stroke next to the zone's name, writing the name first if it's new. Before Java 8 that was a `get`, a `null` check and a `put`. Now it's one call:",
        },
        {
          type: "code",
          language: "java",
          title: "DefaultMethods.java",
          code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DefaultMethods {
    public static void main(String[] args) {
        Map<String, Integer> ridesPerZone = new HashMap<>();
        for (String zone : List.of("Howrah", "Garia", "Howrah", "Howrah", "Garia", "Behala")) {
            ridesPerZone.merge(zone, 1, Integer::sum);          // count without if/else
        }
        System.out.println(ridesPerZone);
        System.out.println(ridesPerZone.getOrDefault("Dum Dum", 0));

        System.out.println(ridesPerZone.putIfAbsent("Garia", 99) + " " + ridesPerZone.get("Garia"));

        Map<String, List<String>> driversByZone = new HashMap<>();
        driversByZone.computeIfAbsent("Howrah", z -> new ArrayList<>()).add("Asha");
        driversByZone.computeIfAbsent("Howrah", z -> new ArrayList<>()).add("Ravi");
        System.out.println(driversByZone);

        ridesPerZone.computeIfPresent("Behala", (zone, count) -> count - 1 == 0 ? null : count - 1);
        System.out.println(ridesPerZone);
    }
}`,
        },
        {
          type: "output",
          text: `{Garia=2, Howrah=3, Behala=1}
0
2 2
{Howrah=[Asha, Ravi]}
{Garia=2, Howrah=3}`,
        },
        {
          type: "list",
          items: [
            "`merge(key, 1, Integer::sum)`: if the key is missing, store 1; otherwise store `old + 1`. The standard counting idiom.",
            "`getOrDefault` returned 0 for a zone that never appeared, with no `null` to unbox.",
            "`putIfAbsent(\"Garia\", 99)` returned the existing value 2 and changed nothing.",
            "`computeIfAbsent` creates the list on the first call and returns the **existing** list on the second, so `.add` works both times. The standard grouping idiom.",
            "Returning `null` from `compute`, `computeIfPresent` or `merge`'s function **removes** the entry. Behala's count dropped to 0 and it vanished.",
          ],
        },
        {
          type: "heading",
          text: "Removing while iterating",
        },
        {
          type: "code",
          language: "java",
          title: "RemoveWhileLooping.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class RemoveWhileLooping {
    public static void main(String[] args) {
        Map<String, Integer> idleMinutes = new HashMap<>(Map.of("Asha", 3, "Ravi", 45, "Meera", 62));
        try {
            for (String driver : idleMinutes.keySet())
                if (idleMinutes.get(driver) > 30) idleMinutes.remove(driver);
        } catch (Exception e) {
            System.out.println(e.getClass().getSimpleName());
        }
        Map<String, Integer> fresh = new HashMap<>(Map.of("Asha", 3, "Ravi", 45, "Meera", 62));
        fresh.values().removeIf(minutes -> minutes > 30);   // the safe way
        System.out.println(fresh);
    }
}`,
        },
        {
          type: "output",
          text: `ConcurrentModificationException
{Asha=3}`,
        },
        {
          type: "paragraph",
          text: "This is what `modCount` is for. The iterator remembers `modCount` when it starts, `remove` increments it, and the iterator's next step sees the mismatch and throws. It's a best-effort check, not a guarantee, but it catches most of these bugs in testing. `removeIf` on `keySet()`, `values()` or `entrySet()`, or an explicit `Iterator.remove()`, removes safely.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Changing a key after putting it in",
        },
        {
          type: "paragraph",
          text: "This is the repainted cloakroom bag. The node caches the hash it was stored with, and lives in the bucket that hash picked. Change a field that `hashCode` uses, and every future lookup computes a different hash and searches a different bucket:",
        },
        {
          type: "code",
          language: "java",
          title: "MutableKey.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class MutableKey {
    static class Seat {                     // mutable key: a bad idea
        String coach; int number;
        Seat(String coach, int number) { this.coach = coach; this.number = number; }
        @Override public boolean equals(Object o) {
            return o instanceof Seat s && s.coach.equals(coach) && s.number == number;
        }
        @Override public int hashCode() { return Objects.hash(coach, number); }
    }

    public static void main(String[] args) {
        Map<Seat, String> bookings = new HashMap<>();
        Seat seat = new Seat("S1", 12);
        bookings.put(seat, "Asha");

        seat.number = 13;                     // key changed after it was stored
        System.out.println(bookings.get(seat));
        System.out.println(bookings.get(new Seat("S1", 12)));
        System.out.println(bookings.containsKey(seat) + " size=" + bookings.size());
        System.out.println(bookings.keySet().iterator().next() == seat);
    }
}`,
        },
        {
          type: "output",
          text: `null
null
false size=1
true`,
        },
        {
          type: "paragraph",
          text: "The entry is still in the map (`size=1`, and the iterator hands back the very same `seat` object), yet neither the changed key nor the original value can find it. `get(seat)` looks in the bucket for (S1, 13). `get(new Seat(\"S1\", 12))` finds the right bucket and the right cached hash, but `equals` now fails because the stored key says 13.",
        },
        {
          type: "paragraph",
          text: "The entry is a ghost: unreachable, but still using memory. Keys should be immutable: `String`, `Integer`, enums, records with immutable fields.",
        },
        {
          type: "heading",
          text: "Overriding equals without hashCode",
        },
        {
          type: "paragraph",
          text: "`BrokenKey` above: two equal keys, two entries, `get` finds nothing. Always override both, from the same fields, or use a `record`.",
        },
        {
          type: "heading",
          text: "Relying on iteration order",
        },
        {
          type: "paragraph",
          text: "`IterationOrder` above changed order just because the map resized. Tests that compare `map.toString()` to a fixed string, or code that takes \"the first entry\" of a HashMap, will break on a different JDK or with different data. Use `LinkedHashMap` or `TreeMap` when order matters.",
        },
        {
          type: "heading",
          text: "Sharing a HashMap between threads",
        },
        {
          type: "paragraph",
          text: "`LostUpdates` above lost thousands of entries silently. Even \"only one thread writes, others read\" isn't safe without proper publication. Use `ConcurrentHashMap` (covered in the Multithreading and Concurrency track), or `Collections.synchronizedMap` if the access is light and you need `null`s.",
        },
        {
          type: "heading",
          text: "Treating a null from get() as \"missing\"",
        },
        {
          type: "paragraph",
          text: "`NullKey` above showed `get` returns `null` for both cases. The other classic: `int count = map.get(key);` throws `NullPointerException` when the key is missing, because unboxing `null` fails. `getOrDefault(key, 0)` or `merge` avoid both.",
        },
        {
          type: "heading",
          text: "Removing inside a for-each loop",
        },
        {
          type: "paragraph",
          text: "`RemoveWhileLooping` above threw `ConcurrentModificationException`. Use `removeIf` or an explicit iterator.",
        },
        {
          type: "heading",
          text: "Expecting new HashMap<>(1000) to hold 1000 without resizing",
        },
        {
          type: "paragraph",
          text: "The constructor argument is the **table capacity**, not the number of entries. It becomes 1024 buckets with a threshold of 768, so the 769th entry still triggers a resize. Measured in the next section.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use immutable keys. `String`, boxed numbers, enums and records of immutable fields are ideal. Never change a field that `equals`/`hashCode` depend on while the object is a key.",
            "Override `equals` and `hashCode` together, from the same fields. Records do this for you.",
            "If you know roughly how many entries are coming, size the map with `HashMap.newHashMap(expected)` (Java 19+). On older Java, `new HashMap<>((int) (expected / 0.75f) + 1)`.",
            "Leave the load factor at 0.75 unless you've measured a reason. Lower wastes memory, higher means longer chains.",
            "Prefer `getOrDefault`, `merge`, `computeIfAbsent` over get-check-put sequences. Shorter and fewer lookups.",
            "Iterate `entrySet()` when you need both key and value, instead of looping over `keySet()` and calling `get` for each key.",
            "Don't store `null` values. It makes `get` ambiguous and breaks `merge`/`compute` semantics.",
            "Program to the `Map` interface, and pick `LinkedHashMap` or `TreeMap` when order matters, `ConcurrentHashMap` when threads share it.",
            "If a custom key type might collide heavily, implement `Comparable` too, so tree bins can search in O(log n).",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "table",
          headers: ["Operation", "Average", "Worst case (Java 8+)", "Notes"],
          rows: [
            ["`get`, `containsKey`", "O(1)", "O(log n) in a tree bin, O(n) chain below 64 buckets", "One hash, one index, a few comparisons"],
            ["`put`", "O(1) amortized", "O(n) for the put that resizes", "Resizes are rare and double the table"],
            ["`remove`", "O(1)", "O(log n) in a tree bin", "Table never shrinks"],
            ["`containsValue`", "O(n)", "O(n)", "Scans every bucket; values aren't indexed"],
            ["Iteration", "O(capacity + size)", "same", "Empty buckets are visited too"],
            ["`resize`", "O(n)", "O(n)", "Each node moved once via lo/hi split"],
          ],
        },
        {
          type: "heading",
          text: "Sizing up front, measured",
        },
        {
          type: "paragraph",
          text: "Moving house once is cheaper than moving every time the family grows. I inserted 1,000 keys into three differently created maps and counted resizes through reflection:",
        },
        {
          type: "code",
          language: "java",
          title: "Sizing.java",
          code: `import java.lang.reflect.Field;
import java.util.HashMap;

public class Sizing {
    static Field tableField;

    static String fill(String label, HashMap<Integer, Integer> map) throws Exception {
        int resizes = 0, lastLength = 0;
        for (int i = 0; i < 1000; i++) {
            map.put(i, i);
            int length = ((Object[]) tableField.get(map)).length;
            if (lastLength != 0 && length != lastLength) resizes++;
            lastLength = length;
        }
        return String.format("%-26s table=%d resizes=%d", label, lastLength, resizes);
    }

    public static void main(String[] args) throws Exception {
        tableField = HashMap.class.getDeclaredField("table");
        tableField.setAccessible(true);
        System.out.println(fill("new HashMap<>()", new HashMap<>()));
        System.out.println(fill("new HashMap<>(1000)", new HashMap<>(1000)));
        System.out.println(fill("HashMap.newHashMap(1000)", HashMap.newHashMap(1000)));
    }
}`,
        },
        {
          type: "output",
          text: `new HashMap<>()            table=2048 resizes=7
new HashMap<>(1000)        table=2048 resizes=1
HashMap.newHashMap(1000)   table=2048 resizes=0`,
        },
        {
          type: "paragraph",
          text: "All three end at 2,048 buckets, but the default map got there through 7 resizes (16, 32, 64, 128, 256, 512, 1024, 2048), and `new HashMap<>(1000)` still needed one, at entry 769.",
        },
        {
          type: "paragraph",
          text: "Before the first put, that map showed `table=null threshold=1024`: the requested capacity is parked in `threshold` until the lazy table is created, and then becomes `table=1024 threshold=768`. `newHashMap(1000)` divides by the load factor first, so it starts at 2,048 and never resizes. I'm deliberately not quoting timings; the resize count is the honest, repeatable measurement here.",
        },
        {
          type: "heading",
          text: "Other real considerations",
        },
        {
          type: "list",
          items: [
            "**Memory.** Every entry is a separate `Node` object with an object header and four fields (`hash`, `key`, `value`, `next`), plus a slot in the table, plus the key and value objects themselves. With compressed references that works out to about 32 bytes per `Node` by field layout, before counting keys and values. Boxed `Integer` keys add their own objects. For millions of primitive keys, a primitive-specialised map from a library is far smaller.",
            "**hashCode quality.** A constant or poorly mixed `hashCode` turns O(1) into O(log n) or worse, as `TreeifyWatch` showed. `Objects.hash` and records are good enough for normal keys.",
            "**hashCode cost.** `String` caches its hash code after the first call, and the node caches the spread hash too. A custom key with an expensive `hashCode` pays that on every lookup, so keep it cheap or cache it in an immutable key.",
            "**Iteration cost** depends on the table length, not just the size. A map that once held a million entries and was then mostly emptied still walks its huge table. Copy it into a new map if that matters.",
          ],
        },
      ],
    },
    {
      title: "HashMap in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A small but realistic service: a **surge board** for a ride-hailing app. During a busy evening, ride requests come in tagged with a pickup zone. The board counts requests per zone and compares them with available drivers to give a fare multiplier. Counting per key and looking up by key is precisely HashMap's job.",
        },
        {
          type: "code",
          language: "java",
          title: "SurgeBoard.java",
          code: `import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SurgeBoard {
    record RideRequest(String riderId, String zone) {}

    private final Map<String, Integer> requestsPerZone;
    private final Map<String, Integer> driversPerZone;

    SurgeBoard(Map<String, Integer> driversPerZone) {
        this.driversPerZone = Map.copyOf(driversPerZone);           // read-only snapshot
        this.requestsPerZone = HashMap.newHashMap(driversPerZone.size());
    }

    void record(RideRequest request) {
        requestsPerZone.merge(request.zone(), 1, Integer::sum);
    }

    double multiplier(String zone) {
        int requests = requestsPerZone.getOrDefault(zone, 0);
        int drivers = Math.max(1, driversPerZone.getOrDefault(zone, 0));
        double ratio = (double) requests / drivers;
        return ratio <= 1.0 ? 1.0 : Math.min(2.0, Math.round(ratio * 10) / 10.0);
    }

    public static void main(String[] args) {
        SurgeBoard board = new SurgeBoard(Map.of("Howrah", 2, "Garia", 4, "Behala", 3));
        List.of(new RideRequest("r1", "Howrah"), new RideRequest("r2", "Howrah"),
                new RideRequest("r3", "Howrah"), new RideRequest("r4", "Garia"),
                new RideRequest("r5", "Salt Lake")).forEach(board::record);

        for (String zone : List.of("Howrah", "Garia", "Behala", "Salt Lake"))
            System.out.println(zone + " x" + board.multiplier(zone));
    }
}`,
        },
        {
          type: "output",
          text: `Howrah x1.5
Garia x1.0
Behala x1.0
Salt Lake x1.0`,
        },
        {
          type: "list",
          items: [
            "Keys are `String` zone names: immutable, with a cached, well-spread hash code. Nothing can go wrong with them as keys.",
            "`merge` counts in one call. `getOrDefault` handles zones with no requests (Behala) or no known drivers (Salt Lake) without `null` checks.",
            "The map is sized up front with `newHashMap` from the number of known zones, so the common case never resizes.",
            "The driver counts are a `Map.copyOf` snapshot: immutable, so nobody can change them under the board.",
            "This version is single-threaded. In a real server, requests arrive on many threads at once, and `LostUpdates` showed what a plain HashMap does then. The real thing would use `ConcurrentHashMap` with the same `merge` call, which is atomic there. That's in the Multithreading and Concurrency track.",
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
              question: "How does a HashMap store its data?",
              answer:
                "In an array called `table`, where each slot is a bucket. Each bucket is either empty, a linked chain of `Node` objects, or, when it gets crowded, a red-black tree of `TreeNode`s. A `Node` holds the key, the value, the key's spread hash, and a `next` pointer.\n\nI confirmed this with `javap -p java.util.HashMap`, which lists `transient Node<K,V>[] table`, `size`, `threshold`, `modCount` and `loadFactor`, and `HashMap$Node` with its four fields `hash`, `key`, `value` and `next`.",
            },
            {
              question: "What happens when you call put(key, value)?",
              answer:
                "It computes `hash(key)`, which is `hashCode()` XOR-ed with its own top 16 bits, then the index `(n - 1) & hash`. If that bucket is empty, a new node goes there. If not, it walks the bucket comparing the cached hash first and then `==` or `equals()`. A match replaces the value and returns the old one; no match appends a new node at the tail.\n\nAfter adding, it increments `size`, and if `size` is now greater than `threshold`, it resizes. If the chain grew past 8 nodes it calls `treeifyBin`. In the bytecode of `put` you can see it's literally `hash(key)` followed by `putVal(hash, key, value, false, true)`.",
            },
            {
              question: "What is a collision and how does HashMap handle it?",
              answer:
                "A collision is two different keys landing in the same bucket. HashMap handles it by chaining: the nodes are linked through `next`, and lookups walk the chain using `equals()` to find the right key. In Java 8+, a chain longer than 8 in a table of at least 64 becomes a red-black tree.\n\nCollisions are normal, not an error. `\"Kolkata\"` and `\"Pune\"` both land in bucket 10 of a 16-slot map, and my `BucketDump` showed them chained as `Kolkata=42 -> Pune=45 -> null`.",
            },
            {
              question: "What are the default capacity and load factor, and what is the threshold?",
              answer:
                "Default capacity is 16 and load factor 0.75, both visible with `javap -constants`. The threshold is capacity times load factor, so 12 for a default map.\n\nWhen a put makes `size` greater than the threshold, the table doubles. My `ResizeWatch` showed the 13th put taking the table from 16 to 32, then resizes at the 25th, 49th and 97th puts.",
            },
            {
              question: "Can a HashMap have a null key or null values?",
              answer:
                "Yes: one `null` key and any number of `null` values. `hash(null)` returns 0, so the null key always lives in bucket 0, and my reflection dump showed `bucket[0] = null=0`.\n\n`Hashtable` and `ConcurrentHashMap` allow neither, partly because `get` returning `null` would be ambiguous: missing key, or key mapped to `null`?",
            },
            {
              question: "Why must equals and hashCode be overridden together?",
              answer:
                "Because HashMap uses `hashCode` to choose the bucket and only then uses `equals` inside that bucket. Equal objects must have equal hash codes, or they end up in different buckets and `equals` is never even called.\n\nMy `BrokenKey` class overrode only `equals`. Two equal phone numbers became two entries, `size()` was 2, and `get` with a third equal key returned `null`. A `record` generates both methods consistently.",
            },
            {
              question: "Is HashMap ordered?",
              answer:
                "No. Iteration goes bucket by bucket, so the order depends on hash codes and the current table length. It's not insertion order, and it can change after a resize.\n\nIn my test, five names inserted in one order came out as `[Meera, Asha, Ravi, Kabir, Imran]`, and after the map grew and the extra keys were removed, as `[Ravi, Imran, Meera, Asha, Kabir]`. `LinkedHashMap` keeps insertion order, `TreeMap` keeps keys sorted.",
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
              question: "What happens if you change a key's fields after putting it in a HashMap?",
              answer:
                "The entry becomes unreachable. The node sits in the bucket chosen by the old hash, and it also caches that old hash. A lookup with the changed key computes a new hash and searches a different bucket. A lookup with an equal copy of the original key finds the right bucket, but `equals` fails against the changed key.\n\nMy `MutableKey` test showed exactly that: both lookups returned `null`, `containsKey` was `false`, yet `size()` was 1 and iterating returned the same object. It's effectively a memory leak, which is why keys should be immutable.",
            },
            {
              question: "Why does get() returning null not prove the key is absent?",
              answer:
                "Because `get` also returns `null` for a key that is present with a `null` value. The bytecode of `get` returns `null` whenever `getNode` returns `null` **or** the node's value is `null`; nothing distinguishes the two.\n\nUse `containsKey` to check presence, or avoid storing `null` values. In my `NullKey` test, `get(\"Delhi\")` and `get(\"Mumbai\")` both returned `null`, but only `containsKey(\"Delhi\")` was `true`.",
            },
            {
              question: "Does new HashMap<>(1000) avoid resizing for 1000 entries?",
              answer:
                "No. 1000 is rounded up to a capacity of 1024, and with load factor 0.75 the threshold is 768, so the 769th put resizes to 2048. The argument is a capacity, not an expected size.\n\nI measured it: `new HashMap<>(1000)` resized once while filling 1000 keys, the default constructor resized 7 times, and Java 19's `HashMap.newHashMap(1000)`, which divides by the load factor for you, didn't resize at all.",
            },
            {
              question: "Two threads put into the same HashMap. What can go wrong?",
              answer:
                "Lost updates and a corrupted map, without any exception. Two threads can both see an empty bucket and overwrite each other's node, both can increment `size` from the same value, and entries written into the old table during a concurrent resize can be dropped.\n\nWhen I had two threads insert 50,000 distinct keys each, `size()` came out around 97,000 to 98,000 and only 61,000 to 85,000 keys could actually be found, different every run. In Java 7, concurrent resizes could even create a cycle and an infinite loop in `get`. The fix is `ConcurrentHashMap`.",
            },
            {
              question: "Why might removing entries in a for-each loop throw ConcurrentModificationException, and how do you avoid it?",
              answer:
                "Every structural change increments `modCount`. The iterator records `modCount` when it starts and checks it on each step, so a `map.remove` inside a for-each loop is detected on the next iteration and it throws. It's fail-fast, best effort, meant to catch bugs.\n\nUse `map.keySet().removeIf(...)`, `values().removeIf(...)`, `entrySet().removeIf(...)` or `Iterator.remove()`. My `RemoveWhileLooping` threw on the loop and worked with `values().removeIf(minutes -> minutes > 30)`.",
            },
            {
              question: "Why can two keys with different hash codes still collide?",
              answer:
                "Because the bucket index uses only the low bits of the spread hash. With 16 buckets, only 4 bits matter, so any two hashes that agree in those bits collide, even if they're completely different numbers.\n\n`\"Kolkata\"` (spread hash 1124143786) and `\"Pune\"` (2499258) both give index 10 with 16 buckets. Collisions are expected; it's why `equals` is always checked after the hash.",
            },
            {
              question: "What do getOrDefault, putIfAbsent, computeIfAbsent and merge give you over get and put?",
              answer:
                "They replace multi-step get-check-put code with one call and usually one lookup. `getOrDefault` avoids `null`, `putIfAbsent` only writes when there's no value, `computeIfAbsent` creates a value lazily and returns the existing one if present, and `merge` combines a new value with an old one, which makes counting a one-liner.\n\nIn a plain HashMap they are just convenience, not atomic. In `ConcurrentHashMap` the same calls are atomic, which is the main reason to write code in this style even before you need threads.",
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
              question: "What does hash() do, and why not use hashCode() directly?",
              answer:
                "It returns `h ^ (h >>> 16)` where `h` is `key.hashCode()`, or 0 for `null`. The `javap` bytecode is literally `invokevirtual hashCode`, `bipush 16`, `iushr`, `ixor`.\n\nThe index uses only the low bits, so without this step, keys whose hash codes differ only in their high bits would all collide. My `HashSpread` test showed `Integer` keys 65536, 131072 and 196608 all mapping to bucket 0 without spreading, and to 1, 2 and 3 with it. It's one cheap operation that protects against weak hash functions.",
            },
            {
              question: "Why is the table length always a power of two?",
              answer:
                "So the bucket index can be computed as `(n - 1) & hash` instead of `hash % n`. When `n` is a power of two, `n - 1` is all 1 bits, and the AND keeps exactly the low bits: one fast instruction, never negative.\n\nIt also makes resizing cheap. Doubling `n` adds exactly one bit to the index, so each node either stays at `i` or moves to `i + n`, depending on that one bit. Any requested capacity is rounded up by `tableSizeFor`, so `new HashMap<>(1000)` gets 1024.",
            },
            {
              question: "Explain the lo/hi split during resize.",
              answer:
                "When the table doubles from `n` to `2n`, each old bucket is split into two lists by testing `hash & n`. If that bit is 0 the node goes to the **lo** list and stays at index `i`; if it's 1 it goes to the **hi** list at index `i + n`. Each list keeps the original order, and no hash codes are recomputed.\n\nI watched it with reflection: keys 5, 21, 37, 53 shared bucket 5 at 16 buckets. After the resize, bucket 5 held `[5, 37]` and bucket 21 held `[21, 53]`. 21 and 53 have the bit worth 16 set; 5 and 37 don't.",
            },
            {
              question: "When exactly does a bucket become a tree, and why is MIN_TREEIFY_CAPACITY 64?",
              answer:
                "When adding a node makes a chain longer than `TREEIFY_THRESHOLD` (8), `putVal` calls `treeifyBin`. But if the table is shorter than `MIN_TREEIFY_CAPACITY` (64), `treeifyBin` resizes instead, because in a small table a long chain usually means the table is too small, and resizing spreads the chain out for free.\n\nMy `TreeifyWatch` with a constant hash code showed it: the 9th key resized 16 to 32, the 10th resized 32 to 64, and the 11th turned the bucket into a `TreeNode`. Tree nodes are about twice the size of normal nodes, so the JDK only pays for them when it must.",
            },
            {
              question: "When does a tree bin turn back into a list?",
              answer:
                "During a resize, when the tree is split into lo and hi halves, any half with `UNTREEIFY_THRESHOLD` (6) or fewer nodes becomes a plain chain. On `remove`, it untreeifies based on the tree's shape becoming very small, rather than counting to 6.\n\nIn my `SplitWatch`, an 11-node tree split into a 7-node lo half, still a `TreeNode`, and a 4-node hi half, which became a `Node` chain. The gap between 8 and 6 avoids flipping back and forth when a bucket hovers around the limit.",
            },
            {
              question: "How does a tree bin order keys that have the same hash?",
              answer:
                "It orders by hash first. For equal hashes it uses `compareTo` if both keys are of the same `Comparable` class. Otherwise it breaks the tie by class name and then `System.identityHashCode`, and lookups may need to search both subtrees because that order can't be reconstructed from a lookup key.\n\nSo a key type that collides heavily gets real O(log n) lookups only if it implements `Comparable`. That's why my `BadKey` record implemented it.",
            },
            {
              question: "What changed in HashMap between Java 7 and Java 8?",
              answer:
                "Three big things. Crowded buckets became red-black trees (treeify at 8, only with 64+ buckets), so worst-case lookups went from O(n) to O(log n). New nodes are appended at the tail instead of inserted at the head. And resize was rewritten as the order-preserving lo/hi split, which removed the infinite-loop bug that concurrent resizes could cause in Java 7.\n\nThe hash function also got simpler: Java 7 used several shifts and XORs, Java 8 just `h ^ (h >>> 16)`, because trees now handle the bad cases. And `Map` gained default methods like `getOrDefault`, `computeIfAbsent` and `merge`.",
            },
            {
              question: "Why is the table created lazily?",
              answer:
                "Many maps are created and never used, or used only for a handful of entries. Not allocating a 16-slot array until the first `put` saves memory for all of them.\n\nReflection shows it directly: a new map has `table=null threshold=0`. For `new HashMap<>(1000)` the requested capacity is parked in `threshold` (1024) until the first put creates the table, and then the threshold becomes the real one, 768.",
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
            "Count how many times each word appears in a sentence using `merge`. Hint: `split(\" \")`, then `counts.merge(word, 1, Integer::sum)`.",
            "Group a list of names by their first letter into a `Map<Character, List<String>>`. Hint: `computeIfAbsent(name.charAt(0), c -> new ArrayList<>()).add(name)`.",
            "Write a `Point(int x, int y)` class that overrides only `equals`. Put a point in a HashMap and look it up with an equal point. Then add `hashCode` and try again. Hint: then turn it into a `record` and delete both methods.",
            "Copy `ResizeWatch`, but create the map with `new HashMap<>(64)` and then with `HashMap.newHashMap(100)`. Predict when each one resizes before running. Hint: threshold is capacity times 0.75.",
            "Find two different `String`s with the **same** `hashCode()`. Hint: `\"Aa\"` and `\"BB\"`. Put both in a map and check they're both retrievable. What does that tell you about `equals`?",
            "Make every key collide with a constant `hashCode()`, insert 20 keys into a `new HashMap<>(64)`, and use the `TreeifyWatch` reflection to see when the bucket becomes a `TreeNode`. Hint: no resize should happen first this time.",
            "Have two threads each put 10,000 distinct keys into a `HashMap`, then into a `ConcurrentHashMap`, and compare `size()`. Run it five times. Hint: only one of them is always right.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Solution sketch for exercise 4",
              answer:
                "`new HashMap<>(64)` gets a 64-slot table on the first put, threshold 48, so the 49th put resizes to 128.\n\n`HashMap.newHashMap(100)` computes 100 / 0.75 = 134, rounds up to 256 buckets, threshold 192, so it doesn't resize until the 193rd put.",
            },
            {
              question: "Solution sketch for exercise 5",
              answer:
                "`\"Aa\".hashCode()` and `\"BB\".hashCode()` are both 2112, so they always share a bucket. Both are retrievable because after matching the hash, HashMap calls `equals`, and `\"Aa\".equals(\"BB\")` is false, so they're stored as two nodes in one chain.\n\nThat's the point: a hash code only narrows the search; `equals` decides identity.",
            },
            {
              question: "Solution sketch for exercise 6",
              answer:
                "With 64 buckets already, the 9th colliding key makes the chain longer than 8, and `treeifyBin` finds the table is big enough, so it builds the tree right away. Expect `Node` for keys 1 to 8 and `TreeNode` from key 9, with the table staying at 64.",
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
          text: `STRUCTURE   Node[] table   (lazy, length = power of two)
            Node = hash, key, value, next
            bucket = null | chain of Node | tree of TreeNode

HASH        h = key.hashCode();  hash = h ^ (h >>> 16)
            null key -> hash 0 -> bucket 0
INDEX       (n - 1) & hash          (n always 2^k)

PUT         index -> empty? new node
            else compare hash, then == / equals
            match -> replace value, return old
            no match -> append at tail
            chain > 8 -> treeifyBin (resize if n < 64)
            ++size > threshold -> resize

RESIZE      threshold = capacity * 0.75   (16 -> 12)
            n -> 2n, each node stays at i or moves to i + n
            tree half <= 6 nodes -> back to a list

CONTRACT    a.equals(b)  =>  a.hashCode() == b.hashCode()
            keys must not change while in the map

NOT         ordered, thread-safe, shrinking
SIZE IT     HashMap.newHashMap(expected)   (Java 19+)`,
          caption: "The whole lesson on one screen, for the night before an interview.",
        },
        {
          type: "list",
          items: [
            "A HashMap is an array of buckets. The key's spread hash picks the bucket with one AND, and `equals` picks the entry inside it.",
            "Resizing doubles the table when it's 75% full, and each node either stays or moves exactly `n` slots up. Crowded buckets in big tables become red-black trees.",
            "Most real bugs are contract bugs: missing `hashCode`, mutable keys, trusting iteration order, and sharing one map between threads.",
          ],
        },
      ],
    },
  ],
};
