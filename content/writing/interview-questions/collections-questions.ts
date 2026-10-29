import type { Lesson } from "../types";

export const collectionsQuestions: Lesson = {
  slug: "collections-interview-questions",
  date: "2026-10-29",
  title: "Collections Interview Questions",
  description: "Java Collections interview questions explained from the inside out: ArrayList growth, HashMap buckets, resizing and treeification, ConcurrentHashMap, LRU with LinkedHashMap, TreeMap, PriorityQueue and the BlockingQueue family. It finishes with a Big-O cheat sheet.",
  tags: [
    "Interview",
    "Java",
    "Collections",
    "HashMap",
    "Data Structures",
  ],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These are the Collections questions I get asked, written the way I'd answer them out loud. Try answering each one yourself before you open it. A ⭐ marks the ones that come up most often.",
        },
        {
          type: "paragraph",
          text: "Collections are where \"how does it work internally?\" questions live, so this page goes deep on `HashMap` and `ConcurrentHashMap`. Every answer starts with a simple picture first.",
        },
      ],
    },
    {
      title: "The Hierarchy",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What does the Collections hierarchy look like?",
              answer: "At the top is `Iterable`, then `Collection`. Under `Collection` are three families. A `List` is ordered and allows duplicates: `ArrayList`, `LinkedList`. A `Set` has no duplicates: `HashSet`, `LinkedHashSet`, `TreeSet`. A `Queue` or `Deque` is for processing in order: `ArrayDeque`, `PriorityQueue`, and the `BlockingQueue` family.\n\n`Map` is a separate hierarchy and is not a `Collection`, because it holds key-value pairs rather than single elements: `HashMap`, `LinkedHashMap`, `TreeMap`, `ConcurrentHashMap`.",
            },
          ],
        },
        {
          type: "diagram",
          text: "Iterable\n  └─ Collection\n       ├─ List   ── ArrayList, LinkedList, CopyOnWriteArrayList\n       ├─ Set    ── HashSet, LinkedHashSet, TreeSet (SortedSet/NavigableSet)\n       └─ Queue  ── PriorityQueue, BlockingQueue family\n            └─ Deque ── ArrayDeque, LinkedList\n\nMap (separate)  ── HashMap, LinkedHashMap, TreeMap, ConcurrentHashMap",
        },
        {
          type: "qa",
          items: [
            {
              question: "`Collection` vs `Collections`?",
              answer: "`Collection` is the root interface for lists, sets and queues. `Collections` is a utility class full of static helpers: `sort`, `reverse`, `unmodifiableList`, `synchronizedMap`, `emptyList` and so on.",
            },
            {
              question: "Array vs `ArrayList`?",
              answer: "An array has a fixed size, can hold primitives directly, and is a little faster. An `ArrayList` grows by itself, holds only objects (so an `int` gets boxed into an `Integer`), and has a rich API. I use arrays for fixed-size, performance-sensitive data and `ArrayList` for everything else.",
            },
          ],
        },
      ],
    },
    {
      title: "Lists",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ `ArrayList` vs `LinkedList`?",
              answer: "An `ArrayList` is like a row of numbered lockers: jumping to locker 500 is instant (`get(i)` is O(1)), but inserting a new one in the middle means shifting everything after it (O(n)).\n\nA `LinkedList` is like a treasure hunt where each clue points to the next. Adding a clue in the middle is cheap once you're standing there, but getting to clue 500 means walking through 499 others (O(n)). Each node also carries two extra pointers, so it uses much more memory.\n\nIn practice `ArrayList` wins almost every time, because its array sits together in memory and CPU caches love that. I can't remember a real case where `LinkedList` paid off; for a queue, `ArrayDeque` is better.",
            },
            {
              question: "How does `ArrayList` grow?",
              answer: "`new ArrayList<>()` starts with an empty shared array and allocates capacity 10 on the first `add`. When it's full, it creates a new array about 1.5 times bigger (`old + old >> 1`) and copies everything over with `System.arraycopy`.\n\nSo `add` is O(1) amortized: most adds are instant, and the occasional copy is spread across them. If I know the size up front, `new ArrayList<>(5000)` avoids every resize. It never shrinks on its own; `trimToSize()` does that.",
            },
            {
              question: "What happens inside `ArrayList.remove(index)`?",
              answer: "It shifts every element after the index one place left with `System.arraycopy`, then sets the last slot to null so the removed object can be garbage collected. That's O(n) in general. Removing the last element shifts nothing, so it's O(1).",
            },
            {
              question: "`list.remove(1)` on a `List<Integer>`: index or value?",
              answer: "Index. `remove(int index)` is an exact match for the `int` literal, so the compiler picks it over `remove(Object)`. To remove the value, I box it: `list.remove(Integer.valueOf(10))`. The output below is from a real run.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "List<Integer> fares = new ArrayList<>(List.of(10, 20, 30));\nfares.remove(1);                     // index 1\nSystem.out.println(fares);\nfares.remove(Integer.valueOf(10));   // the value 10\nSystem.out.println(fares);",
          title: "RemoveTrap.java (part 1)",
        },
        {
          type: "output",
          text: "[10, 30]\n[30]",
        },
        {
          type: "qa",
          items: [
            {
              question: "`synchronizedList` vs `CopyOnWriteArrayList`?",
              answer: "`Collections.synchronizedList` wraps a list so every method takes one lock. It's safe for single calls, but I still have to lock it manually while iterating, or another thread can change it underneath me.\n\n`CopyOnWriteArrayList` copies the whole array on every write, and readers iterate over a snapshot with no lock at all. It's perfect for lists that are read constantly and changed rarely, like event listeners or a list of feature flags, and terrible for lists that change often.",
            },
            {
              question: "`Iterator` vs `ListIterator`?",
              answer: "`Iterator` moves forward only and can `remove`. `ListIterator` works only on lists, moves both ways (`previous()`), knows the index, and can also `add` and `set`. `Enumeration` is the legacy version from `Vector` and `Hashtable`.",
            },
          ],
        },
      ],
    },
    {
      title: "Iteration: Fail-Fast and Fail-Safe",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Fail-fast vs fail-safe iterators?",
              answer: "A fail-fast iterator throws `ConcurrentModificationException` as soon as it notices the collection was changed by something other than the iterator itself. `ArrayList`, `HashMap` and most `java.util` collections work this way. It's like a cashier who stops counting the moment someone touches the cash drawer.\n\nThey detect it with a counter: every structural change increments `modCount`, the iterator remembers the value it started with, and `next()` compares the two.\n\nFail-safe (more precisely, weakly consistent or snapshot) iterators belong to concurrent collections like `CopyOnWriteArrayList` and `ConcurrentHashMap`. They don't throw; they work on a snapshot or show some changes made during iteration and not others.",
            },
            {
              question: "⭐ How do I remove elements while looping?",
              answer: "Not with `list.remove()` inside a for-each loop. That changes `modCount` behind the iterator's back. I use `iterator.remove()`, or better, `list.removeIf(String::isEmpty)`, which does it in one pass.\n\nFail-fast is \"best effort\", not a promise. In my run below, removing the first item threw, but if the removed item had been the second-to-last one, the loop would have just ended quietly, because `hasNext()` checks the size before `next()` gets a chance to check `modCount`. So the exception is a bug detector, not something to rely on.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "List<String> queue = new ArrayList<>(List.of(\"\", \"Asha\", \"Ravi\"));\ntry {\n    for (String name : queue) {\n        if (name.isEmpty()) queue.remove(name);\n    }\n} catch (ConcurrentModificationException e) {\n    System.out.println(\"CME caught\");\n}\nSystem.out.println(queue);\n\nList<String> queue2 = new ArrayList<>(List.of(\"Asha\", \"\", \"Ravi\", \"\"));\nqueue2.removeIf(String::isEmpty);\nSystem.out.println(queue2);",
          title: "RemoveTrap.java (part 2)",
        },
        {
          type: "output",
          text: "CME caught\n[Asha, Ravi]\n[Asha, Ravi]",
        },
        {
          type: "qa",
          items: [
            {
              question: "Is `ConcurrentModificationException` only about threads?",
              answer: "No, and that surprises people. The most common cause is single-threaded: changing a collection inside a for-each loop over it. With several threads it's even worse, because a plain `ArrayList` isn't safe at all, and the exception may or may not show up.",
            },
          ],
        },
      ],
    },
    {
      title: "HashMap Internals",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ How does `HashMap` work internally?",
              answer: "Picture a post office with numbered pigeonholes. To store a letter, you work out its pigeonhole number from the name, put it there, and when two names land in the same hole, you stack the letters.\n\n`HashMap` is an array of buckets (the `table`). Each bucket holds a small chain of nodes, and each node stores the key, the value, the key's hash and a pointer to the next node.\n\nFor `put(key, value)`: compute `key.hashCode()`, spread it with `h ^ (h >>> 16)`, and pick the bucket with `(n - 1) & hash`. If the bucket is empty, a new node goes there. If not, walk the chain: when a node has the same hash and an equal key (`==` or `equals`), replace its value; otherwise add a new node at the end of the chain.\n\n`get(key)` finds the bucket the same way, then walks the chain using `equals` to find the key. With a good hash function the chains are tiny, so both are O(1) on average.",
            },
            {
              question: "Why is the capacity always a power of two, and what is the hash spreading for?",
              answer: "With a power-of-two capacity, `hash & (n - 1)` is the same as `hash % n` but much cheaper. Asking for capacity 20 actually gives 32.\n\nThe catch is that `& (n - 1)` only looks at the low bits of the hash. Hash codes that differ only in their high bits would all crowd into the same buckets. `h ^ (h >>> 16)` mixes the high 16 bits into the low 16, so those bits get a say too.",
            },
            {
              question: "⭐ When and how does `HashMap` resize?",
              answer: "When `size` goes past `capacity × load factor`. With the defaults (16 and 0.75), that's after the 12th entry. The table doubles to 32, and every entry is moved.\n\nThe clever part since Java 8: because the capacity doubled, each entry either stays at the same index `i` or moves to `i + oldCapacity`, depending on one extra bit of its hash. So there's no rehashing, just a one-bit check, and each old chain splits into a \"low\" and a \"high\" list that keep their order.\n\nResizing is O(n), so if I know I'll store 10,000 entries I size the map up front. The table itself is also lazy: it's only allocated on the first `put`.",
            },
            {
              question: "⭐ What changed in `HashMap` in Java 8? (treeification)",
              answer: "When many keys land in the same bucket, a chain becomes a long list and lookups degrade to O(n). That can happen with a bad `hashCode`, or on purpose in a hash-flooding attack.\n\nSince Java 8, when a bucket's chain grows past 8 nodes (`TREEIFY_THRESHOLD`), it's turned into a red-black tree, so the worst case becomes O(log n). But only if the table has at least 64 buckets (`MIN_TREEIFY_CAPACITY`); with a smaller table, the map resizes instead, since spreading entries out is the better fix.\n\nWhen a tree bucket shrinks to 6 or fewer nodes during a resize split (`UNTREEIFY_THRESHOLD`), or gets very small after removals, it turns back into a plain list. The gap between 8 and 6 stops it flipping back and forth. Tree nodes are ordered by hash and, if the keys are `Comparable`, by `compareTo`.",
            },
            {
              question: "How does `HashMap` handle a `null` key?",
              answer: "It allows one null key and any number of null values. `hash(null)` is defined as 0, so the null key always lives in bucket 0. That also means `get(key)` returning null is ambiguous: either the key isn't there or its value is null. `containsKey` tells the two apart.",
            },
            {
              question: "⭐ What happens if I use a mutable object as a `HashMap` key?",
              answer: "If I change a field that `hashCode` uses after putting the key in, the entry stays in the bucket of the old hash. `get` computes the new hash, looks in a different bucket, and finds nothing. The entry is still in the map, taking up memory, but I can't reach it. That's a quiet memory leak.\n\nIt's like moving house without updating your address with the post office: your letters still arrive at the old house. So keys should be immutable: `String`, `Integer`, enums, records.",
            },
            {
              question: "What is a hash collision, and how bad is it?",
              answer: "Two different keys whose hashes land in the same bucket. Collisions are normal and handled by the chain or tree. They only hurt when there are many: a `hashCode` that returns a constant puts every entry in one bucket, so the map becomes a list (or a tree, since Java 8). A good `hashCode` uses all the fields that `equals` uses; `Objects.hash(a, b)` is the easy way.",
            },
            {
              question: "⭐ How does `HashSet` work?",
              answer: "It's a `HashMap` underneath. My element is the key, and every value is the same shared dummy object (`PRESENT`). `add` is `map.put(e, PRESENT) == null`, which is how it knows whether the element was new. So all the `hashCode`/`equals` rules apply to set elements too.",
            },
            {
              question: "Why is `HashMap` not thread-safe? What can go wrong?",
              answer: "Two threads putting at the same moment can both decide a bucket is empty, and one entry overwrites the other. Two threads triggering a resize can lose entries or leave the size wrong. In Java 7, a concurrent resize could even create a loop in a chain, so a later `get` spun at 100% CPU forever. Java 8 changed the resize to keep order and avoid that loop, but the map is still not safe; use `ConcurrentHashMap`.",
            },
          ],
        },
      ],
    },
    {
      title: "ConcurrentHashMap",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ `HashMap` vs `Hashtable` vs `ConcurrentHashMap`?",
              answer: "`HashMap` isn't thread-safe and allows nulls. `Hashtable` is a legacy class with every method synchronized on the whole map: one lock for everything, like a bank with one teller for all customers. It allows no nulls.\n\n`ConcurrentHashMap` is thread-safe and fast: like a bank with a teller per counter. Customers at different counters never wait for each other; only two people at the same counter queue up. It allows no nulls either.",
            },
            {
              question: "⭐ How does `ConcurrentHashMap` work internally in Java 8+?",
              answer: "It uses the same bucket array as `HashMap`, with three tricks.\n\nPutting into an empty bucket uses CAS (compare-and-swap): no lock at all. Putting into a non-empty bucket locks only that bucket's first node with `synchronized`, so only threads hitting the same bucket wait. Reads are lock-free, because the table and node values are `volatile`.\n\nLong chains turn into trees, like in `HashMap`. Resizing is cooperative: a thread that finds a resize in progress helps move some buckets instead of waiting. `size()` adds up striped counters (the `LongAdder` idea), so under concurrent updates it's an estimate.\n\nJava 7 was different: the map was split into 16 segments, each a small hash table with its own lock.",
            },
            {
              question: "Why doesn't `ConcurrentHashMap` allow null keys or values?",
              answer: "Because `get(k)` returning null would be ambiguous: is the key missing, or is its value null? In a single-threaded `HashMap` I can follow up with `containsKey`. In a concurrent map, another thread can change things between those two calls, so the answer is useless. Banning null makes \"null means absent\" always true.",
            },
            {
              question: "Is `if (!map.containsKey(k)) map.put(k, v)` thread-safe on a `ConcurrentHashMap`?",
              answer: "No. Each call is safe on its own, but the pair isn't atomic: two threads can both see \"missing\" and both put, and one overwrites the other. It's like two people both checking that a cinema seat is free, then both sitting on it.\n\nThe fix is the atomic methods, which do check and act as one step inside the bucket lock: `putIfAbsent`, `computeIfAbsent`, `compute` and `merge`.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "ConcurrentHashMap<String, Integer> ordersPerCity = new ConcurrentHashMap<>();\n\nordersPerCity.merge(\"Pune\", 1, Integer::sum);           // thread-safe counter\nordersPerCity.putIfAbsent(\"Delhi\", 0);\nFareRules rules = fareRulesByCity.computeIfAbsent(\"Pune\",\n        city -> loadFareRulesFromDb(city));             // loaded once per city",
          title: "Atomic compound operations",
        },
        {
          type: "qa",
          items: [
            {
              question: "Any traps with `computeIfAbsent`?",
              answer: "The function runs while that bucket is locked. So it should be short, and it must not update the same map, since that can deadlock or throw `IllegalStateException: Recursive update`. A slow database call inside also blocks every other thread that needs that bucket. And if the function returns null, nothing is stored.",
            },
            {
              question: "How do `ConcurrentHashMap` iterators behave?",
              answer: "They're weakly consistent: they never throw `ConcurrentModificationException`, they see each element at most once, and they may or may not see changes made after the iteration started. That's fine for things like reporting, but not for \"exact count right now\".",
            },
          ],
        },
      ],
    },
    {
      title: "LinkedHashMap and LRU",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How does `LinkedHashMap` keep order?",
              answer: "It's a `HashMap` whose entries are also chained together in a doubly linked list. The hash table gives O(1) lookups, and the list remembers order.\n\nIn insertion order (the default), new entries go to the tail and iteration follows the list. In access order (`new LinkedHashMap<>(16, 0.75f, true)`), every `get` or `put` moves that entry to the tail, so the head is always the least recently used entry.",
            },
            {
              question: "⭐ Build an LRU cache.",
              answer: "Think of a small shelf at a tea stall that holds only the 3 most-requested snacks: whatever was asked for most recently moves to the front, and when a new snack arrives, the one nobody has asked for in the longest time goes back to the storeroom.\n\nWith `LinkedHashMap` in access order it's a few lines: after every `put`, `removeEldestEntry` is asked whether to drop the head.\n\nFrom scratch, the classic answer is a `HashMap` from key to node plus a doubly linked list. `get` moves the node to the head, and `put` past capacity removes the tail. Both are O(1). For thread safety I'd put a lock around it, and in a real system use a library like Caffeine.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "class LruCache<K, V> extends LinkedHashMap<K, V> {\n    private final int capacity;\n\n    LruCache(int capacity) {\n        super(16, 0.75f, true);   // true = access order\n        this.capacity = capacity;\n    }\n\n    @Override\n    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {\n        return size() > capacity;\n    }\n}",
          title: "LRU cache with LinkedHashMap",
        },
      ],
    },
    {
      title: "TreeMap and Sorted Collections",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ `HashMap` vs `LinkedHashMap` vs `TreeMap`?",
              answer: "`HashMap` has no order and O(1) operations. `LinkedHashMap` keeps insertion or access order, also O(1), with slightly more memory. `TreeMap` keeps keys sorted, costs O(log n), and offers range queries like `headMap`, `tailMap`, `floorKey` and `ceilingKey`.\n\nA delivery app that needs \"the nearest slot at or after 6:30 pm\" wants `TreeMap.ceilingKey(time)`.",
            },
            {
              question: "How does `TreeMap` work internally?",
              answer: "It's a red-black tree: a binary search tree that keeps itself balanced. Each node is coloured red or black, and the rules (no two reds in a row, the same number of blacks on every path down) are restored with recolouring and rotations after each insert or delete. That keeps the height at most about 2 log n, so operations stay O(log n) even with sorted input, which would turn a plain BST into a linked list.\n\nKeys are compared with `compareTo` or the given `Comparator`; `equals` and `hashCode` aren't used at all. So a comparator that says two keys are equal (returns 0) makes the map treat them as the same key, even if `equals` disagrees.",
            },
            {
              question: "`HashSet` vs `LinkedHashSet` vs `TreeSet`?",
              answer: "The same story as the maps, because each is built on its map: `HashSet` on `HashMap` (no order), `LinkedHashSet` on `LinkedHashMap` (insertion order) and `TreeSet` on `TreeMap` (sorted). `TreeSet` doesn't allow null, since null can't be compared.",
            },
          ],
        },
      ],
    },
    {
      title: "Queues and Heaps",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How does `PriorityQueue` work?",
              answer: "It's a binary min-heap stored in an array. Think of a hospital emergency room: patients aren't served in arrival order; the most urgent one is always next.\n\nFor an element at index `i`, its children are at `2i + 1` and `2i + 2`, and every parent is smaller than its children. `offer` adds at the end and sifts the element up while it's smaller than its parent. `poll` takes the root, moves the last element to the top, and sifts it down. Both are O(log n), and `peek` is O(1).\n\nIterating it or printing it does not give sorted order; only repeated `poll` does. It's the go-to structure for top-K problems (\"the 3 cheapest cabs\") and schedulers.",
            },
            {
              question: "`ArrayDeque` vs `Stack` vs `LinkedList` as a queue?",
              answer: "`Stack` is legacy: it extends the synchronized `Vector`. `ArrayDeque` is a resizable circular array that works as both a stack (`push`, `pop`) and a queue (`offer`, `poll`). It's faster than both `Stack` and `LinkedList` and uses less memory. It doesn't allow nulls.",
            },
            {
              question: "What do `offer`, `poll` and `peek` do differently from `add`, `remove` and `element`?",
              answer: "They handle \"full\" or \"empty\" quietly. `add`, `remove` and `element` throw an exception, while `offer` returns false, and `poll` and `peek` return null. For queues that can be full or empty in normal use, the quiet versions are the right default.",
            },
          ],
        },
      ],
    },
    {
      title: "BlockingQueue Family",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is a `BlockingQueue`?",
              answer: "A thread-safe queue where `put()` waits if the queue is full and `take()` waits if it's empty. A bakery counter with room for 10 trays: the baker waits when the counter is full, and the shop assistant waits when it's empty. Nobody needs to check in a busy loop.\n\nIt's the standard tool for producer-consumer problems, and it gives backpressure for free: a fast producer is forced to slow down when consumers fall behind.",
            },
            {
              question: "What are the four groups of `BlockingQueue` methods?",
              answer: "For insert: `add` throws when full, `offer` returns false, `put` blocks, and `offer(e, time, unit)` waits up to a timeout. For remove: `remove` throws when empty, `poll` returns null, `take` blocks, and `poll(time, unit)` times out. In production I prefer the timed versions so a thread can never hang forever.",
            },
          ],
        },
        {
          type: "table",
          headers: [
            "Action",
            "Throws",
            "Returns special value",
            "Blocks",
            "Times out",
          ],
          rows: [
            [
              "Insert",
              "`add(e)`",
              "`offer(e)` → false",
              "`put(e)`",
              "`offer(e, t, unit)`",
            ],
            [
              "Remove",
              "`remove()`",
              "`poll()` → null",
              "`take()`",
              "`poll(t, unit)`",
            ],
            [
              "Examine",
              "`element()`",
              "`peek()` → null",
              "none",
              "none",
            ],
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Which `BlockingQueue` implementations exist?",
              answer: "`ArrayBlockingQueue` is bounded, array-backed, with one lock: a good default when I want backpressure. `LinkedBlockingQueue` is optionally bounded, but unbounded by default, which is dangerous; it uses separate locks for `put` and `take`, so it has higher throughput.\n\n`PriorityBlockingQueue` is unbounded and ordered by priority. `DelayQueue` releases items only after their delay expires, which is nice for retries and expiring offers. `SynchronousQueue` has zero capacity: every `put` waits for a `take`, a direct hand-off, and `newCachedThreadPool` uses it. There's also `LinkedTransferQueue` and the double-ended `LinkedBlockingDeque`.",
            },
            {
              question: "`BlockingQueue` vs `ConcurrentLinkedQueue`?",
              answer: "`ConcurrentLinkedQueue` is lock-free (CAS-based) and never blocks: `poll()` on an empty queue just returns null. I use it when consumers shouldn't wait. `BlockingQueue` is for when I want waiting and a size limit.",
            },
          ],
        },
      ],
    },
    {
      title: "Comparable and Comparator",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ `Comparable` vs `Comparator`?",
              answer: "`Comparable` is an object's own natural order, written into the class with `compareTo`: strings sort alphabetically, numbers numerically. A class has one natural order.\n\nA `Comparator` is an external order I pass in, and I can have as many as I like. A list of cab drivers might be sorted by rating on one screen and by distance on another; neither belongs in the `Driver` class itself.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "drivers.sort(Comparator.comparingDouble(Driver::rating).reversed()\n        .thenComparingInt(Driver::distanceMeters));",
          title: "Building a comparator",
        },
        {
          type: "qa",
          items: [
            {
              question: "Why is `return a - b;` a bad `compareTo`?",
              answer: "Integer overflow. With large values of opposite signs, `a - b` overflows and flips the sign, so the sort becomes wrong. `Integer.compare(a, b)` or `Comparator.comparingInt(...)` never overflows.",
            },
            {
              question: "What does \"consistent with equals\" mean for a comparator?",
              answer: "`compare(a, b) == 0` should mean the same as `a.equals(b)`. If it doesn't, sorted collections behave oddly: `new BigDecimal(\"1.0\")` and `new BigDecimal(\"1.00\")` are not `equals`, but `compareTo` says they're the same. So a `HashSet` keeps both and a `TreeSet` keeps one.",
            },
          ],
        },
      ],
    },
    {
      title: "Immutable and Unmodifiable",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "`List.of()` vs `Arrays.asList()` vs `Collections.unmodifiableList()`?",
              answer: "`List.of(...)` (Java 9) is truly immutable: no add, remove or set, and no nulls (even `contains(null)` throws).\n\n`Arrays.asList(array)` is fixed-size but not read-only: `set` works and `add` throws. It's a view backed by the array, so changing one changes the other.\n\n`Collections.unmodifiableList(list)` is a read-only view. I can't change it through the view, but if someone changes the original list, the view shows it. It's like a shop window: you can't touch the items, but the shopkeeper can still rearrange them from inside. `List.copyOf(list)` makes a real immutable copy.",
            },
            {
              question: "What is a `WeakHashMap`?",
              answer: "A map whose keys are held through weak references. When nothing else in the program references a key, the GC can clear it and the entry disappears. It's used for caches tied to an object's lifetime, like extra data attached to objects you don't own. One trap: keys that stay reachable elsewhere, like string literals or small cached `Integer`s, never get cleared, so their entries never go away.",
            },
            {
              question: "What are `EnumMap` and `IdentityHashMap`?",
              answer: "`EnumMap` is a map keyed by an enum, backed by a plain array indexed by `ordinal()`, which makes it very fast and compact. `IdentityHashMap` compares keys with `==` instead of `equals`. It's used in special cases like serialization and graph-walking code that must tell apart objects that are equal but not the same.",
            },
          ],
        },
      ],
    },
    {
      title: "Big-O Cheat Sheet",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What are the time complexities of the common collections?",
              answer: "The table below is the one I keep in my head. The averages assume a decent `hashCode`.",
            },
          ],
        },
        {
          type: "table",
          headers: [
            "Collection",
            "get / lookup",
            "add / put",
            "remove",
            "contains",
            "Notes",
          ],
          rows: [
            [
              "ArrayList",
              "O(1) by index",
              "O(1) amortized at end",
              "O(n)",
              "O(n)",
              "middle insert O(n)",
            ],
            [
              "LinkedList",
              "O(n)",
              "O(1) at ends",
              "O(1) at ends",
              "O(n)",
              "lots of memory per node",
            ],
            [
              "HashMap / HashSet",
              "O(1) avg",
              "O(1) avg",
              "O(1) avg",
              "O(1) avg",
              "O(log n) worst since Java 8",
            ],
            [
              "LinkedHashMap",
              "O(1) avg",
              "O(1) avg",
              "O(1) avg",
              "O(1) avg",
              "keeps order",
            ],
            [
              "TreeMap / TreeSet",
              "O(log n)",
              "O(log n)",
              "O(log n)",
              "O(log n)",
              "sorted, range queries",
            ],
            [
              "PriorityQueue",
              "O(1) peek",
              "O(log n) offer",
              "O(log n) poll",
              "O(n)",
              "not sorted when iterated",
            ],
            [
              "ArrayDeque",
              "O(1) ends",
              "O(1) ends",
              "O(1) ends",
              "O(n)",
              "best stack and queue",
            ],
          ],
        },
      ],
    },
    {
      title: "Quick Revision",
      blocks: [
        {
          type: "diagram",
          text: "LIST       ArrayList (array, 1.5x grow, O(1) get)  >>  LinkedList (rarely wins)\n           remove(1) on List<Integer> = INDEX; remove(Integer.valueOf(1)) = value\nSET        Hash (no order) | Linked (insertion) | Tree (sorted, no null)\n           HashSet = HashMap keys + dummy value\n\nHASHMAP    table[] of buckets, index = (n-1) & (h ^ h>>>16)\n           put: empty bucket -> new node; else walk chain, equals -> replace\n           resize at size > cap * 0.75, doubles, entry stays at i or i+oldCap\n           chain > 8 AND table >= 64 -> red-black tree; <= 6 -> list again\n           one null key (bucket 0); NOT thread-safe; keys should be immutable\n\nCHM        empty bucket -> CAS; else synchronized(first node); reads lock-free\n           no nulls; use putIfAbsent / computeIfAbsent / merge (atomic)\n           Java 7: 16 segments with locks\n\nLRU        LinkedHashMap(16, 0.75f, true) + removeEldestEntry\nTREEMAP    red-black tree, O(log n), uses compareTo NOT equals\nPQ         array min-heap, children 2i+1 / 2i+2, sift up / down\nITERATORS  fail-fast (modCount -> CME) | weakly consistent (concurrent)\n           remove while looping -> iterator.remove() or removeIf\nBLOCKINGQ  put/take block | offer/poll special value | timed variants\n           ArrayBQ bounded | LinkedBQ unbounded by default | SynchronousQ 0 cap\nIMMUTABLE  List.of (immutable, no nulls) | asList (fixed size, backed)\n           unmodifiableList (read-only VIEW) | List.copyOf (real copy)",
          caption: "Collections in one screen",
        },
      ],
    },
  ],
};
