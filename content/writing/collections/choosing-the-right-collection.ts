import type { Lesson } from "../types";

export const choosingTheRightCollection: Lesson = {
  slug: "choosing-the-right-collection",
  date: "2026-10-29",
  title: "Choosing the Right Collection",
  description:
    "A practical decision guide for Java collections: a Big-O table for every main implementation, measured memory per entry, real backend scenarios from deduplicating events to an LRU cache, interview puzzles about picking structures, and a practice set of fourteen small problems with real outputs.",
  tags: ["Core Java", "Collections", "Big-O", "Data Structures", "Interview Prep"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think about tidying a house. A to-do list on the fridge keeps jobs in order. A stamp album holds each country only once. A row of key hooks has a label above each hook, so I grab the car key without checking the others. A stack of plates is used from the top.",
        },
        {
          type: "paragraph",
          text: "Choosing a Java collection is the same habit: I first ask what job the container has to do, then pick the one built for that job. In order with repeats? A `List`. Each thing only once? A `Set`. Find by a label (a key)? A `Map`. Take from one end? A `Deque`.",
        },
        {
          type: "paragraph",
          text: "Picking well matters because the wrong container still works, just slowly or awkwardly, like hunting for one key in a drawer full of keys.",
        },
        {
          type: "code",
          language: "java",
          code: `List<String> todo = new ArrayList<>(List.of("milk", "bread"));   // order matters
Set<String> stamps = new HashSet<>(List.of("India", "Japan", "India")); // no repeats
Map<String, String> keyHooks = new HashMap<>();                  // find by label
keyHooks.put("car", "blue key");
Deque<String> plates = new ArrayDeque<>();                       // take from the top
plates.push("plate 1");
plates.push("plate 2");
System.out.println(todo.get(0) + " " + stamps.size() + " " + keyHooks.get("car") + " " + plates.peek());`,
        },
        {
          type: "output",
          text: `milk 2 blue key plate 2`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "Ask what the container has to do first; the job picks the collection, not habit.",
        },
      ],
    },
    {
      title: "What This Lesson Is",
      blocks: [
        {
          type: "paragraph",
          text: "A kitchen has many containers: a spice rack with numbered slots, a stack of plates, a queue of order tickets on a rail, a labelled drawer for each utensil. A good cook doesn't think about it, he reaches for the right one. A beginner keeps everything in one big bag and then spends the evening digging through it.",
        },
        {
          type: "paragraph",
          text: "Java's collections are those containers. The earlier lessons in this track opened each one up. This one is the cheat sheet I wish I'd had: which question to ask first, what each operation really costs, how much memory each one burns per element, and how the choice looks in real backend code. It ends with a practice set of small problems, because picking the right structure is a skill that comes from doing it many times.",
        },
        {
          type: "paragraph",
          text: "The short version I keep in my head: **`ArrayList` for lists, `HashMap` for lookups, `HashSet` for uniqueness, `ArrayDeque` for stacks and queues.** Everything else is for a specific need: order (`LinkedHashMap`, `LinkedHashSet`), sorting and ranges (`TreeMap`, `TreeSet`), priority (`PriorityQueue`), enum keys (`EnumMap`, `EnumSet`), and threads (the concurrent collections).",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 had three general containers: arrays, `Vector` and `Hashtable`, plus `Stack` built on `Vector`. All of them were synchronized on every method, which made single-threaded code pay for locks it didn't need. Java 1.2 brought the Collections Framework with unsynchronized `ArrayList`, `LinkedList`, `HashMap`, `HashSet`, `TreeMap` and `TreeSet` behind common interfaces, so I could switch implementation by changing one `new`.",
        },
        {
          type: "paragraph",
          text: "Later releases filled the gaps: `LinkedHashMap` and `LinkedHashSet` in 1.4, `PriorityQueue`, `EnumMap`, `EnumSet` and the `java.util.concurrent` collections in 5, `ArrayDeque` and `NavigableMap` in 6, the immutable factories in 9, and sequenced collections (`getFirst`, `getLast`, `reversed`) in 21. `Vector`, `Stack` and `Hashtable` still exist for compatibility, but I never pick them for new code.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "list",
          items: [
            "**`ArrayList`** is a row of numbered lockers. Opening locker 57 is instant. Adding one at the end is easy. Squeezing a new locker in the middle means shifting every locker after it.",
            "**`LinkedList`** is a treasure hunt: each clue points to the next. Inserting a clue is easy once I'm standing there, but getting to clue 57 means following 57 clues.",
            "**`HashMap`** is a post office with pigeonholes by pin code. I go straight to the right hole without looking at the others.",
            "**`TreeMap`** is a dictionary on a shelf, always alphabetical. Finding a word takes a few halvings, and \"every word from 'ca' to 'ch'\" is easy.",
            "**`ArrayDeque`** is a tube of tennis balls open at both ends: push and pop from either side.",
            "**`PriorityQueue`** is a hospital emergency desk: whoever is most urgent goes next, not whoever came first.",
            "**`LinkedHashMap`** is a guest register: a fast lookup by name, but the pages still read in arrival order.",
          ],
        },
      ],
    },
    {
      title: "The Decision Guide",
      blocks: [
        {
          type: "image",
          src: "/images/collections/choosing-a-collection.svg",
          alt: "Flowchart for picking a collection: key to value leads to a Map, unique items to a Set, FIFO or priority to ArrayDeque or PriorityQueue, otherwise ArrayList.",
          caption: "Ask these questions top to bottom and stop at the first yes.",
        },
        {
          type: "paragraph",
          text: "I ask these questions in this order. The first \"yes\" usually decides it.",
        },
        {
          type: "diagram",
          text: `Do I look things up by a KEY (id, name, code)?
 ├─ yes ─► a Map
 │         keys are enum constants?           ─► EnumMap
 │         need keys sorted / ranges / floor?  ─► TreeMap
 │         need insertion or access order?     ─► LinkedHashMap  (LRU: accessOrder=true)
 │         shared between threads?             ─► ConcurrentHashMap
 │         otherwise                           ─► HashMap
 │
 ├─ no, I need each value only ONCE (uniqueness / "seen it?")
 │         enum values?                        ─► EnumSet
 │         sorted / ranges?                    ─► TreeSet
 │         keep first-seen order?              ─► LinkedHashSet
 │         otherwise                           ─► HashSet
 │
 ├─ no, I process items in an ORDER of arrival or urgency
 │         most urgent / smallest first?       ─► PriorityQueue
 │         first in, first out / last in, first out / both ends? ─► ArrayDeque
 │         producer-consumer between threads?  ─► BlockingQueue (Multithreading track)
 │
 └─ no, I just keep a SEQUENCE and read by position
           almost always                       ─► ArrayList
           fixed, never changes                ─► List.of(...)
           read-mostly, shared, many readers   ─► CopyOnWriteArrayList
           LinkedList?  only if I really insert/remove through an
                        iterator in the middle, which is rare`,
          caption: "Key, uniqueness, processing order, plain sequence: in that order.",
        },
        {
          type: "paragraph",
          text: "Then two follow-up questions: will it be **modified after creation** (if not, use the immutable factories), and will **several threads** touch it (if so, a concurrent collection, covered in the Multithreading track)?",
        },
      ],
    },
    {
      title: "Big-O for Every Main Implementation",
      blocks: [
        {
          type: "heading",
          text: "Lists and queues",
        },
        {
          type: "table",
          headers: ["Implementation", "get(i)", "add at end", "add/remove at front", "add/remove in middle", "contains / remove(obj)", "Order"],
          rows: [
            ["`ArrayList`", "O(1)", "O(1) amortized", "O(n)", "O(n) shift", "O(n)", "Insertion / index"],
            ["`LinkedList`", "O(n)", "O(1)", "O(1)", "O(n) to reach, O(1) to relink", "O(n)", "Insertion / index"],
            ["`ArrayDeque`", "no index", "O(1) amortized", "O(1) amortized", "not supported", "O(n)", "Insertion"],
            ["`PriorityQueue`", "no index", "`offer` O(log n)", "`poll` O(log n), `peek` O(1)", "not supported", "O(n)", "Heap order (iteration is **not** sorted)"],
            ["`CopyOnWriteArrayList`", "O(1)", "O(n), copies array", "O(n)", "O(n)", "O(n)", "Insertion / index"],
          ],
        },
        {
          type: "heading",
          text: "Sets and maps",
        },
        {
          type: "table",
          headers: ["Implementation", "add / put", "contains / get", "remove", "first / floor / range", "Iteration order", "Nulls"],
          rows: [
            ["`HashMap` / `HashSet`", "O(1) avg", "O(1) avg", "O(1) avg", "not supported", "None you can rely on", "One null key, null values"],
            ["`LinkedHashMap` / `LinkedHashSet`", "O(1) avg", "O(1) avg", "O(1) avg", "first/last only (Java 21)", "Insertion (or access)", "Same as Hash"],
            ["`TreeMap` / `TreeSet`", "O(log n)", "O(log n)", "O(log n)", "O(log n)", "Sorted by key", "No null keys with natural order"],
            ["`EnumMap` / `EnumSet`", "O(1)", "O(1)", "O(1)", "not supported", "Enum declaration order", "No null keys"],
            ["`ConcurrentHashMap`", "O(1) avg", "O(1) avg", "O(1) avg", "not supported", "None you can rely on", "**No** nulls at all"],
            ["`Set.of` / `Map.of`", "immutable", "O(1) avg", "immutable", "not supported", "Random per JVM run", "No nulls"],
          ],
        },
        {
          type: "list",
          items: [
            "\"Amortized O(1)\" for `ArrayList.add` means most adds are instant and an occasional one copies the array to grow it by half. Averaged over many adds, it's constant.",
            "\"O(1) avg\" for hash structures assumes a reasonable `hashCode`. With many collisions in one bucket, Java 8+ turns that bucket into a small red-black tree, so the worst case is O(log n), not O(n), as long as the keys are `Comparable`.",
            "Iterating any of these is O(n), except hash structures, which are O(capacity + n) because the iterator visits empty buckets too.",
          ],
        },
      ],
    },
    {
      title: "Memory Overhead",
      blocks: [
        {
          type: "paragraph",
          text: "Big-O is about time. The other cost is memory, and it surprised me more. Every element in a linked or hashed structure lives in its own little node object, and on top of that a `List<Integer>` stores every number as a separate `Integer` object. A grocer storing rice in individually wrapped grains is the picture.",
        },
        {
          type: "paragraph",
          text: "I didn't want to quote numbers from memory, so I filled five collections with the same 100,000 `Integer` keys and asked the JVM for a class histogram from inside the program:",
        },
        {
          type: "code",
          language: "java",
          title: "Footprint.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.*;
import javax.management.ObjectName;

public class Footprint {
    public static void main(String[] args) throws Exception {
        List<Integer> arrayList = new ArrayList<>();
        List<Integer> linkedList = new LinkedList<>();
        Map<Integer, Integer> hashMap = new HashMap<>();
        Map<Integer, Integer> linkedHashMap = new LinkedHashMap<>();
        Map<Integer, Integer> treeMap = new TreeMap<>();
        for (int i = 0; i < 100_000; i++) {
            Integer key = 1000 + i;                       // one Integer, shared by all five
            arrayList.add(key); linkedList.add(key);
            hashMap.put(key, key); linkedHashMap.put(key, key); treeMap.put(key, key);
        }
        String histogram = (String) ManagementFactory.getPlatformMBeanServer().invoke(
                new ObjectName("com.sun.management:type=DiagnosticCommand"),
                "gcClassHistogram", new Object[] {null}, new String[] {String[].class.getName()});
        for (String line : histogram.split("\\n")) {
            if (line.contains("#instances") || line.contains("java.util.HashMap$Node")
                    || line.contains("java.util.LinkedHashMap$Entry") || line.contains("java.util.TreeMap$Entry")
                    || line.contains("java.util.LinkedList$Node") || line.contains("java.lang.Integer ")) {
                System.out.println(line.replace(" (java.base@21.0.12.1)", ""));
            }
        }
        // keep all five reachable until the histogram has been taken
        System.out.println(arrayList.size() + linkedList.size() + hashMap.size()
                + linkedHashMap.size() + treeMap.size());
    }
}`,
        },
        {
          type: "output",
          text: ` num     #instances         #bytes  class name (module)
   1:        100162        4006480  java.util.TreeMap$Entry
   2:        100015        4000600  java.util.LinkedHashMap$Entry
   3:        101400        3244800  java.util.HashMap$Node
   4:        100000        2400000  java.util.LinkedList$Node
   7:        100285        1604560  java.lang.Integer
500000`,
        },
        {
          type: "paragraph",
          text: "Dividing bytes by instances gives the size of one node on JDK 21, 64-bit, with compressed object pointers (the default for heaps under about 32 GB). The few hundred extra instances belong to the JDK's own maps.",
        },
        {
          type: "table",
          headers: ["Structure", "Per-element cost (measured, plus element)", "What's in it"],
          rows: [
            ["`int[]`", "4 bytes, no objects", "Just the numbers"],
            ["`ArrayList`", "4-byte reference per slot, up to 50% spare slots", "One `Object[]`"],
            ["`LinkedList`", "24-byte `Node`", "item, next, prev"],
            ["`HashMap`", "32-byte `Node` + table slot", "hash, key, value, next"],
            ["`LinkedHashMap`", "40-byte `Entry` + table slot", "Node + before, after"],
            ["`TreeMap`", "40-byte `Entry`", "key, value, left, right, parent, color"],
            ["`Integer` itself", "16 bytes each", "Header + one `int`"],
          ],
        },
        {
          type: "list",
          items: [
            "The histogram also showed the two hash tables (`HashMap$Node[]`) at about 2.1 MB together. 100,000 entries pushed each map's table to 262,144 slots of 4 bytes, roughly 10 more bytes per entry, because the table doubles whenever it's 75% full.",
            "Storing 100,000 numbers: an `int[]` is 400 KB. A `List<Integer>` is about 400 KB of references plus 1.6 MB of `Integer` objects. A `HashSet<Integer>` is more than 3 MB of nodes plus the table plus the `Integer`s. Same data, about ten times the memory.",
            "This is why primitive arrays still matter for big numeric data, and why `HashSet` of a few million ids can quietly eat hundreds of megabytes.",
            "These are numbers from one run on my machine. Without compressed pointers (heaps over ~32 GB), references are 8 bytes and every node grows.",
          ],
        },
      ],
    },
    {
      title: "Real Backend Scenarios",
      blocks: [
        {
          type: "heading",
          text: "Deduplicate repeated events: HashSet",
        },
        {
          type: "paragraph",
          text: "A payment provider sends webhooks and, like a courier ringing the bell twice, sometimes delivers the same event more than once. Processing a refund twice is expensive, so I remember which event ids I've already handled:",
        },
        {
          type: "code",
          language: "java",
          title: "DedupeEvents.java",
          code: `import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class DedupeEvents {
    public static void main(String[] args) {
        // a payment webhook can deliver the same event more than once
        List<String> deliveries = List.of("evt_1", "evt_2", "evt_1", "evt_3", "evt_2");
        Set<String> processed = new HashSet<>();

        for (String eventId : deliveries) {
            if (processed.add(eventId)) {          // add() returns false if already there
                System.out.println("processing " + eventId);
            } else {
                System.out.println("skipping duplicate " + eventId);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `processing evt_1
processing evt_2
skipping duplicate evt_1
processing evt_3
skipping duplicate evt_2`,
        },
        {
          type: "paragraph",
          text: "`add` returning a boolean turns \"have I seen it?\" and \"remember it\" into one O(1) call. In production this set lives in the database (a unique constraint on the event id) or in Redis, because an in-memory set is lost on restart and isn't shared between servers. The data structure idea is the same.",
        },
        {
          type: "heading",
          text: "Keep insertion order in a response: LinkedHashMap",
        },
        {
          type: "paragraph",
          text: "A trip status timeline should come back to the app in the order it happened, like the stamps on a passport:",
        },
        {
          type: "code",
          language: "java",
          title: "ResponseOrder.java",
          code: `import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

public class ResponseOrder {
    public static void main(String[] args) {
        String[] steps = {"pickup", "en_route", "arrived", "started", "completed"};
        Map<String, Integer> hash = new HashMap<>();
        Map<String, Integer> linked = new LinkedHashMap<>();
        for (int i = 0; i < steps.length; i++) {
            hash.put(steps[i], i + 1);
            linked.put(steps[i], i + 1);
        }
        System.out.println("HashMap:       " + hash);
        System.out.println("LinkedHashMap: " + linked);
    }
}`,
        },
        {
          type: "output",
          text: `HashMap:       {arrived=3, en_route=2, pickup=1, started=4, completed=5}
LinkedHashMap: {pickup=1, en_route=2, arrived=3, started=4, completed=5}`,
        },
        {
          type: "paragraph",
          text: "The `HashMap` order comes from the keys' hash codes. It's stable for these `String` keys on this JDK, but it isn't a promise and it scrambled the timeline. `LinkedHashMap` costs one extra pair of links per entry (the 40 versus 32 bytes above) and keeps the order. JSON libraries serialize a `LinkedHashMap` in that same order.",
        },
        {
          type: "heading",
          text: "Sorted price slabs: TreeMap",
        },
        {
          type: "paragraph",
          text: "A taxi fare chart says: from 0 km, Rs 15 per km; from 5 km, Rs 12; from 20 km, Rs 10; from 50 km, Rs 8. For any distance I need \"the slab that starts at or below this km\". That's exactly `floorEntry`:",
        },
        {
          type: "code",
          language: "java",
          title: "PriceSlabs.java",
          code: `import java.util.TreeMap;

public class PriceSlabs {
    public static void main(String[] args) {
        // km from -> rate per km, like a fare chart on a taxi stand
        TreeMap<Integer, Integer> slabs = new TreeMap<>();
        slabs.put(0, 15);
        slabs.put(5, 12);
        slabs.put(20, 10);
        slabs.put(50, 8);

        for (int km : new int[] {3, 5, 18, 75}) {
            System.out.println(km + " km -> slab from " + slabs.floorKey(km)
                    + " km, rate " + slabs.floorEntry(km).getValue());
        }
        System.out.println("slabs at or above 10 km: " + slabs.tailMap(10, true));
    }
}`,
        },
        {
          type: "output",
          text: `3 km -> slab from 0 km, rate 15
5 km -> slab from 5 km, rate 12
18 km -> slab from 5 km, rate 12
75 km -> slab from 50 km, rate 8
slabs at or above 10 km: {20=10, 50=8}`,
        },
        {
          type: "paragraph",
          text: "With a `HashMap` I'd have to scan every slab. `TreeMap` answers `floorKey`, `ceilingKey`, `headMap`, `tailMap` and `subMap` in O(log n). Tax brackets, discount tiers, delivery-fee bands and \"which time window does this timestamp fall in\" are all the same shape.",
        },
        {
          type: "heading",
          text: "An LRU cache: LinkedHashMap with access order",
        },
        {
          type: "paragraph",
          text: "A small cache of user profiles that keeps the most recently used ones, like a desk that only has room for three files: when a fourth comes in, the one I haven't touched longest goes back to the cabinet.",
        },
        {
          type: "code",
          language: "java",
          title: "LruCache.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;

public class LruCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;

    LruCache(int capacity) {
        super(16, 0.75f, true);                  // true = access order, not insertion
        this.capacity = capacity;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;                // evict once over capacity
    }

    public static void main(String[] args) {
        LruCache<String, String> cache = new LruCache<>(3);
        cache.put("u1", "Asha");
        cache.put("u2", "Ravi");
        cache.put("u3", "Meera");
        cache.get("u1");                         // u1 is now most recently used
        cache.put("u4", "Kabir");                // evicts u2, the least recently used
        System.out.println(cache);
    }
}`,
        },
        {
          type: "output",
          text: "{u3=Meera, u1=Asha, u4=Kabir}",
        },
        {
          type: "paragraph",
          text: "With `accessOrder = true`, every `get` moves the entry to the end of the linked list, so the head is always the least recently used. `removeEldestEntry` is a hook `LinkedHashMap` calls after each `put`. This class isn't thread-safe (even `get` changes the order). For a real shared cache I'd use a caching library such as Caffeine, but this is the structure behind it, and a very common interview question.",
        },
        {
          type: "heading",
          text: "A priority work queue: PriorityQueue",
        },
        {
          type: "paragraph",
          text: "Background jobs where a refund must not wait behind a newsletter, like an emergency ward triaging patients:",
        },
        {
          type: "code",
          language: "java",
          title: "WorkQueue.java",
          code: `import java.util.Comparator;
import java.util.PriorityQueue;

public class WorkQueue {
    record Job(String name, int priority) {}

    public static void main(String[] args) {
        PriorityQueue<Job> queue = new PriorityQueue<>(
                Comparator.comparingInt(Job::priority));      // 1 = most urgent
        queue.add(new Job("send newsletter", 5));
        queue.add(new Job("refund payment", 1));
        queue.add(new Job("resize images", 3));
        queue.add(new Job("reset password email", 2));

        while (!queue.isEmpty()) {
            Job next = queue.poll();                         // always the smallest
            System.out.println(next.priority() + " " + next.name());
        }
    }
}`,
        },
        {
          type: "output",
          text: `1 refund payment
2 reset password email
3 resize images
5 send newsletter`,
        },
        {
          type: "paragraph",
          text: "A binary heap keeps the smallest element on top: `offer` and `poll` are O(log n), `peek` is O(1). Printing the queue or iterating it does **not** give sorted order, only repeated `poll` does. Jobs with equal priority come out in no guaranteed order, so if fairness matters I add a sequence number as a tie-breaker.",
        },
        {
          type: "heading",
          text: "Lookups by id: HashMap built once",
        },
        {
          type: "paragraph",
          text: "A dispatcher receives driver ids and needs the driver for each. Scanning a list for every request is a receptionist flipping through the whole register for each visitor. Indexing it once is a receptionist with a card file:",
        },
        {
          type: "code",
          language: "java",
          title: "LookupById.java",
          code: `import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LookupById {
    record Driver(long id, String name) {}

    public static void main(String[] args) {
        List<Driver> drivers = List.of(new Driver(7, "Asha"), new Driver(12, "Ravi"),
                new Driver(31, "Meera"));

        Map<Long, Driver> byId = new HashMap<>();
        for (Driver d : drivers) byId.put(d.id(), d);   // build once: O(n)

        long[] requests = {12, 31, 99};
        for (long id : requests) {                      // each lookup: O(1) on average
            Driver d = byId.get(id);
            System.out.println(id + " -> " + (d == null ? "not found" : d.name()));
        }
    }
}`,
        },
        {
          type: "output",
          text: `12 -> Ravi
31 -> Meera
99 -> not found`,
        },
        {
          type: "paragraph",
          text: "This is the single most useful pattern in backend code. Loading 500 orders and then, for each, looking up its customer in a list of 500 customers is 250,000 comparisons. Indexing the customers in a `HashMap` first makes it 1,000 operations. The same idea fixes the classic N+1 problem: fetch all related rows in one query, index them by id, then join in memory.",
        },
        {
          type: "heading",
          text: "Stacks and queues: ArrayDeque",
        },
        {
          type: "code",
          language: "java",
          title: "DequeBoth.java",
          code: `import java.util.ArrayDeque;
import java.util.Deque;

public class DequeBoth {
    public static void main(String[] args) {
        Deque<String> undo = new ArrayDeque<>();          // as a stack
        undo.push("type A"); undo.push("type B"); undo.push("bold");
        System.out.println("undo: " + undo.pop() + ", then " + undo.pop());

        Deque<String> counter = new ArrayDeque<>();       // as a queue
        counter.offer("token 1"); counter.offer("token 2"); counter.offer("token 3");
        System.out.println("serve: " + counter.poll() + ", then " + counter.poll());
    }
}`,
        },
        {
          type: "output",
          text: `undo: bold, then type B
serve: token 1, then token 2`,
        },
        {
          type: "paragraph",
          text: "An undo history is a stack of plates: last in, first out. A bank's token counter is a queue: first in, first out. `ArrayDeque` does both with a circular array, no node objects, and O(1) at both ends. The `Stack` class is a synchronized `Vector` from 1996 and its Javadoc itself recommends `Deque` instead. `ArrayDeque` doesn't allow `null`, which is a feature: `poll()` returns `null` to mean \"empty\".",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**`list.contains(x)` inside a loop.** It's O(n) each time, so the loop is O(n²). Put the values in a `HashSet` first. This one mistake is behind most \"it was fine with test data and slow in production\" stories I've seen.",
            "**Picking `LinkedList` for \"lots of inserts\".** The inserts are O(1) only once I'm at the position, and getting there is O(n). With 24 bytes per node and poor cache locality, `ArrayList` wins most real benchmarks even for inserts in the middle. `ArrayDeque` is better for queue use.",
            "**Expecting `HashMap` or `HashSet` to keep any order.** It may look ordered in a test with small integers and then change with more data or another JDK. Use `LinkedHashMap` or a `TreeMap` when order is part of the contract.",
            "**Printing a `PriorityQueue` and expecting it sorted.** Its `toString` and iterator show heap order. Only `poll` returns elements in priority order.",
            "**Mutable objects as `HashMap` keys or `HashSet` elements.** Change a field that `hashCode` uses after inserting, and the entry is stranded in the wrong bucket: `contains` returns false for an element that's in the set.",
            "**`TreeMap` with a comparator that ties on different keys.** It treats them as the same key and overwrites, as shown with the `TreeSet` in the Comparable lesson.",
            "**`Vector`, `Stack`, `Hashtable` in new code.** They lock every call and still aren't safe for compound actions. Use `ArrayList`, `ArrayDeque`, `HashMap`, or the concurrent collections.",
            "**Returning `null` instead of an empty collection.** Callers then need a null check before every loop. Return `List.of()` or `Collections.emptyList()`.",
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
            "Declare variables and return types as the interface (`List`, `Map`, `Set`, `Deque`) and pick the implementation only at `new`. Switching from `HashMap` to `LinkedHashMap` is then a one-word change.",
            "Default to `ArrayList`, `HashMap`, `HashSet` and `ArrayDeque`. Move away only for a reason I can name: ordering, sorting, priority, enum keys, threads.",
            "Pre-size when I know the size: `new ArrayList<>(n)`, and for a hash map `HashMap.newHashMap(n)` (Java 19+), which accounts for the 0.75 load factor for me.",
            "Use `EnumMap`/`EnumSet` for enum keys. They're arrays and bit vectors underneath, smaller and faster than hash structures.",
            "Use the immutable factories for anything that doesn't change after creation.",
            "For big numeric data, consider primitive arrays before `List<Integer>`. The memory table above is the reason.",
            "When in doubt about speed, measure with a proper benchmark (JMH) on realistic data, not with intuition or a single timing loop.",
          ],
        },
      ],
    },
    {
      title: "Interview Puzzles About Picking Structures",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "You need to check quickly whether a user has already voted in a poll with millions of voters. What do you use?",
              answer:
                "A `HashSet<Long>` of voter ids: `add` returns false for a repeat vote, O(1) on average. If memory is tight and ids are dense small integers, a `BitSet` uses one bit per possible id instead of about 50 bytes per entry.\n\nIn a real system across many servers it becomes a unique constraint in the database or a Redis set, but the reasoning is the same: membership test, so a set.",
            },
            {
              question: "Design a leaderboard that shows the top 10 and updates scores often.",
              answer:
                "A `HashMap<String, Integer>` from player to score for O(1) updates, plus a `TreeSet` of (score, player) entries ordered by score descending and then player name, for sorted top-10 reads. On an update I remove the old entry from the tree, change the map, and insert the new entry, each O(log n).\n\nThe tie-breaker on name matters: without it, two players with the same score would collide in the `TreeSet` and one would disappear.",
            },
            {
              question: "Implement autocomplete for city names as the user types a prefix.",
              answer:
                "Put the names in a `TreeSet<String>` (or keys of a `TreeMap`), then `subSet(prefix, prefix + Character.MAX_VALUE)` returns every name starting with the prefix, in sorted order, in O(log n + k).\n\nFor very large vocabularies a trie is the textbook structure, but a sorted set is usually enough and needs no custom code.",
            },
            {
              question: "Undo and redo in a text editor: which structures?",
              answer:
                "Two stacks, both `ArrayDeque`. Every new action is pushed on the undo stack and clears the redo stack. Undo pops from undo and pushes onto redo; redo does the reverse.\n\nNot `Stack`, which is a synchronized `Vector` and whose own Javadoc points to `Deque`.",
            },
            {
              question: "Rate-limit an API to 100 requests per minute per user.",
              answer:
                "A `HashMap<String, ArrayDeque<Long>>` from user to the timestamps of their recent requests. On each request, remove timestamps older than 60 seconds from the front of that user's deque, then allow the request if fewer than 100 remain and add the new timestamp at the back.\n\nThe deque works because timestamps arrive in order, so old ones are always at the front. Across servers this moves to Redis, but the sliding-window shape stays.",
            },
            {
              question: "Return the K most frequent search terms from a huge log.",
              answer:
                "Count with a `HashMap<String, Integer>`, then keep a **min**-heap `PriorityQueue` of size K: add each entry and poll when the size exceeds K. What's left is the top K, in O(n log K) instead of O(n log n) for sorting everything.\n\nThe practice set below has this exact program with its output.",
            },
            {
              question: "You need a map whose keys come back in sorted order and you also need \"the largest key below X\". Which map?",
              answer:
                "`TreeMap`. It keeps keys sorted, and `lowerKey(x)`, `floorKey(x)`, `ceilingKey(x)` and `higherKey(x)` are O(log n). A `HashMap` would need a full scan for each such query.\n\nMy fare-slab example used `floorEntry` for exactly that.",
            },
            {
              question: "Store settings per day of week, or per order status enum. Which map?",
              answer:
                "`EnumMap`. It's an array indexed by the enum's ordinal, so lookups are O(1) with no hashing, iteration follows the enum's declaration order, and it's more compact than a `HashMap`. `EnumSet` is the matching set, a bit vector.\n\nThe only limitation is that keys must all be of one enum type.",
            },
          ],
        },
      ],
    },
    {
      title: "Collections Practice Set",
      blocks: [
        {
          type: "paragraph",
          text: "Fourteen small problems, each solved with the structure that fits it. Every program here was compiled and run on JDK 21, and the output under it is real. I tried each one myself before reading my solution again, and I'd suggest the same.",
        },
        {
          type: "heading",
          text: "1. Word frequency in a review",
        },
        {
          type: "paragraph",
          text: "A restaurant wants to know which words customers use most. Count each word. I use a `TreeMap` only so the printout is sorted; a `HashMap` is the normal choice when order doesn't matter.",
        },
        {
          type: "code",
          language: "java",
          title: "WordCount.java",
          code: `import java.util.Map;
import java.util.TreeMap;

public class WordCount {
    public static void main(String[] args) {
        String review = "good food good service bad parking good food";
        Map<String, Integer> counts = new TreeMap<>();        // sorted keys for printing
        for (String word : review.split(" ")) {
            counts.put(word, counts.getOrDefault(word, 0) + 1);
        }
        System.out.println(counts);
    }
}`,
        },
        {
          type: "output",
          text: "{bad=1, food=2, good=3, parking=1, service=1}",
        },
        {
          type: "complexity",
          time: "O(n log u) with TreeMap, O(n) with HashMap (u = distinct words)",
          space: "O(u)",
        },
        {
          type: "heading",
          text: "2. First non-repeating character",
        },
        {
          type: "paragraph",
          text: "Count characters in a `LinkedHashMap`, which remembers first-seen order, then return the first with a count of 1.",
        },
        {
          type: "code",
          language: "java",
          title: "FirstUnique.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;

public class FirstUnique {
    static Character firstUnique(String s) {
        Map<Character, Integer> counts = new LinkedHashMap<>();   // keeps first-seen order
        for (char c : s.toCharArray()) {
            counts.put(c, counts.getOrDefault(c, 0) + 1);
        }
        for (Map.Entry<Character, Integer> e : counts.entrySet()) {
            if (e.getValue() == 1) return e.getKey();
        }
        return null;
    }

    public static void main(String[] args) {
        System.out.println(firstUnique("swiss"));
        System.out.println(firstUnique("aabbcc"));
        System.out.println(firstUnique("leetcode"));
    }
}`,
        },
        {
          type: "output",
          text: `w
null
l`,
        },
        {
          type: "complexity",
          time: "O(n)",
          space: "O(k), k = distinct characters",
        },
        {
          type: "heading",
          text: "3. Remove duplicates, keep order",
        },
        {
          type: "paragraph",
          text: "A user's page visits, with repeats. Show each page once, in the order first visited. `LinkedHashSet` does the whole job.",
        },
        {
          type: "code",
          language: "java",
          title: "DedupeKeepOrder.java",
          code: `import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

public class DedupeKeepOrder {
    public static void main(String[] args) {
        List<String> visits = List.of("home", "menu", "cart", "menu", "home", "pay");
        List<String> unique = new ArrayList<>(new LinkedHashSet<>(visits));
        System.out.println(unique);
    }
}`,
        },
        {
          type: "output",
          text: "[home, menu, cart, pay]",
        },
        {
          type: "complexity",
          time: "O(n)",
          space: "O(n)",
        },
        {
          type: "heading",
          text: "4. Group anagrams",
        },
        {
          type: "paragraph",
          text: "Words with the same letters belong together. Sorting a word's letters gives a key that all its anagrams share. `computeIfAbsent` creates the list the first time a key appears. (The `k -> new ArrayList<>()` is a lambda; read it as \"make an empty list\".)",
        },
        {
          type: "code",
          language: "java",
          title: "GroupAnagrams.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class GroupAnagrams {
    public static void main(String[] args) {
        String[] words = {"listen", "silent", "enlist", "google", "gogole", "cat", "act", "tac", "dog"};
        Map<String, List<String>> groups = new TreeMap<>();
        for (String w : words) {
            char[] letters = w.toCharArray();
            Arrays.sort(letters);                         // "listen" -> "eilnst"
            String key = new String(letters);
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(w);
        }
        for (Map.Entry<String, List<String>> e : groups.entrySet()) {
            System.out.println(e.getKey() + " -> " + e.getValue());
        }
    }
}`,
        },
        {
          type: "output",
          text: `act -> [cat, act, tac]
dgo -> [dog]
eggloo -> [google, gogole]
eilnst -> [listen, silent, enlist]`,
        },
        {
          type: "complexity",
          time: "O(n * m log m), m = word length",
          space: "O(n * m)",
        },
        {
          type: "heading",
          text: "5. Top-K most ordered items",
        },
        {
          type: "paragraph",
          text: "A canteen wants its two best sellers. Count with a `HashMap`, then keep a min-heap of size K: the weakest of the current top K sits on top and is the one thrown out.",
        },
        {
          type: "code",
          language: "java",
          title: "TopK.java",
          code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

public class TopK {
    public static void main(String[] args) {
        String[] orders = {"tea", "coffee", "tea", "samosa", "coffee", "tea", "juice", "samosa", "tea", "coffee"};
        int k = 2;
        Map<String, Integer> freq = new HashMap<>();
        for (String o : orders) freq.put(o, freq.getOrDefault(o, 0) + 1);

        // min-heap of size k: the weakest of the current top-k sits on top
        PriorityQueue<Map.Entry<String, Integer>> heap =
                new PriorityQueue<>((a, b) -> Integer.compare(a.getValue(), b.getValue()));
        for (Map.Entry<String, Integer> e : freq.entrySet()) {
            heap.offer(e);
            if (heap.size() > k) heap.poll();          // drop the weakest
        }
        List<String> top = new ArrayList<>();
        while (!heap.isEmpty()) {
            Map.Entry<String, Integer> e = heap.poll();
            top.add(0, e.getKey() + "=" + e.getValue());   // smallest comes out first
        }
        System.out.println(top);
    }
}`,
        },
        {
          type: "output",
          text: "[tea=4, coffee=3]",
        },
        {
          type: "complexity",
          time: "O(n + u log k)",
          space: "O(u + k)",
        },
        {
          type: "paragraph",
          text: "I chose counts without ties on purpose. With a tie for second place, which item wins would depend on `HashMap` iteration order; a real version would add a tie-breaker on the name.",
        },
        {
          type: "heading",
          text: "6. LRU cache with get and put",
        },
        {
          type: "paragraph",
          text: "The interview version: `get` returns -1 for a miss, `put` evicts the least recently used key when over capacity. Same `LinkedHashMap` trick as the scenario above, written without subclassing.",
        },
        {
          type: "code",
          language: "java",
          title: "LruPractice.java",
          code: `import java.util.LinkedHashMap;

public class LruPractice {
    private final int capacity;
    private final LinkedHashMap<Integer, Integer> map;

    LruPractice(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<>(16, 0.75f, true);    // access order
    }

    int get(int key) {
        return map.getOrDefault(key, -1);                    // a hit moves key to the end
    }

    void put(int key, int value) {
        map.put(key, value);
        if (map.size() > capacity) {
            Integer eldest = map.keySet().iterator().next(); // first = least recently used
            map.remove(eldest);
        }
    }

    public static void main(String[] args) {
        LruPractice cache = new LruPractice(2);
        cache.put(1, 100);
        cache.put(2, 200);
        System.out.println(cache.get(1));   // 100, and 1 becomes most recent
        cache.put(3, 300);                  // evicts 2
        System.out.println(cache.get(2));   // -1
        cache.put(4, 400);                  // evicts 1
        System.out.println(cache.get(1) + " " + cache.get(3) + " " + cache.get(4));
    }
}`,
        },
        {
          type: "output",
          text: `100
-1
-1 300 400`,
        },
        {
          type: "complexity",
          time: "O(1) per get and put",
          space: "O(capacity)",
        },
        {
          type: "heading",
          text: "7. Merge two sorted lists",
        },
        {
          type: "paragraph",
          text: "Two sorted queues of exam scores from two sections, merged into one sorted list. Two pointers, always take the smaller head.",
        },
        {
          type: "code",
          language: "java",
          title: "MergeSorted.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class MergeSorted {
    static List<Integer> merge(List<Integer> a, List<Integer> b) {
        List<Integer> out = new ArrayList<>(a.size() + b.size());
        int i = 0, j = 0;
        while (i < a.size() && j < b.size()) {
            out.add(a.get(i) <= b.get(j) ? a.get(i++) : b.get(j++));   // <= keeps it stable
        }
        while (i < a.size()) out.add(a.get(i++));
        while (j < b.size()) out.add(b.get(j++));
        return out;
    }

    public static void main(String[] args) {
        System.out.println(merge(List.of(1, 4, 9, 12), List.of(2, 4, 10)));
        System.out.println(merge(List.of(), List.of(3, 5)));
    }
}`,
        },
        {
          type: "output",
          text: `[1, 2, 4, 4, 9, 10, 12]
[3, 5]`,
        },
        {
          type: "complexity",
          time: "O(n + m)",
          space: "O(n + m) for the result",
        },
        {
          type: "paragraph",
          text: "`get(i)` is O(1) only because the inputs are `RandomAccess` lists. With `LinkedList` inputs I'd use two iterators instead, or the loop becomes quadratic.",
        },
        {
          type: "heading",
          text: "8. Two items that fit the budget exactly",
        },
        {
          type: "paragraph",
          text: "A gift card worth Rs 300 must be spent on exactly two items. For each price, ask a `HashMap` whether its partner (budget minus price) was already seen.",
        },
        {
          type: "code",
          language: "java",
          title: "TwoSum.java",
          code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class TwoSum {
    static int[] twoSum(int[] prices, int budget) {
        Map<Integer, Integer> seen = new HashMap<>();        // price -> index
        for (int i = 0; i < prices.length; i++) {
            Integer partner = seen.get(budget - prices[i]);
            if (partner != null) return new int[] {partner, i};
            seen.put(prices[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[] {120, 300, 80, 220}, 300)));
        System.out.println(Arrays.toString(twoSum(new int[] {50, 60}, 500)));
    }
}`,
        },
        {
          type: "output",
          text: `[2, 3]
[]`,
        },
        {
          type: "complexity",
          time: "O(n)",
          space: "O(n)",
        },
        {
          type: "heading",
          text: "9. Balanced brackets",
        },
        {
          type: "paragraph",
          text: "Like checking that every opened box in a warehouse was closed in the right order. Push openers on an `ArrayDeque` stack; each closer must match the latest opener.",
        },
        {
          type: "code",
          language: "java",
          title: "Brackets.java",
          code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;

public class Brackets {
    static final Map<Character, Character> PAIRS = Map.of(')', '(', ']', '[', '}', '{');

    static boolean balanced(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') {
                stack.push(c);
            } else if (PAIRS.containsKey(c)) {
                if (stack.isEmpty() || !stack.pop().equals(PAIRS.get(c))) return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        for (String s : new String[] {"{[()]}", "([)]", "((", "fare(km[2])"}) {
            System.out.println(s + " -> " + balanced(s));
        }
    }
}`,
        },
        {
          type: "output",
          text: `{[()]} -> true
([)] -> false
(( -> false
fare(km[2]) -> true`,
        },
        {
          type: "complexity",
          time: "O(n)",
          space: "O(n)",
        },
        {
          type: "paragraph",
          text: "I compare with `equals`, not `!=`. The stack holds `Character` objects, and `!=` on boxed values compares references. It happens to work for ASCII because small `Character` values are cached, which is exactly the kind of accident I don't want to depend on.",
        },
        {
          type: "heading",
          text: "10. Items in both shopping carts",
        },
        {
          type: "paragraph",
          text: "Which items are in both my cart and my friend's? `retainAll` keeps only what's also in the other collection. Making the other side a `HashSet` keeps each check O(1).",
        },
        {
          type: "code",
          language: "java",
          title: "CommonItems.java",
          code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class CommonItems {
    public static void main(String[] args) {
        List<String> myCart = List.of("milk", "bread", "eggs", "rice", "milk");
        List<String> friendCart = List.of("rice", "milk", "tea");

        Set<String> common = new LinkedHashSet<>(myCart);        // my order, no repeats
        common.retainAll(new HashSet<>(friendCart));            // keep only shared items
        System.out.println(new ArrayList<>(common));
    }
}`,
        },
        {
          type: "output",
          text: "[milk, rice]",
        },
        {
          type: "complexity",
          time: "O(n + m)",
          space: "O(n + m)",
        },
        {
          type: "heading",
          text: "11. Kth largest score",
        },
        {
          type: "paragraph",
          text: "Who came third? A min-heap holding only the K biggest scores seen so far has the answer on top.",
        },
        {
          type: "code",
          language: "java",
          title: "KthLargest.java",
          code: `import java.util.PriorityQueue;

public class KthLargest {
    static int kthLargest(int[] scores, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>();   // min-heap
        for (int s : scores) {
            heap.offer(s);
            if (heap.size() > k) heap.poll();                  // keep only the k biggest
        }
        return heap.peek();
    }

    public static void main(String[] args) {
        int[] scores = {45, 82, 12, 97, 60, 82, 30};
        System.out.println("1st: " + kthLargest(scores, 1));
        System.out.println("2nd: " + kthLargest(scores, 2));
        System.out.println("3rd: " + kthLargest(scores, 3));
    }
}`,
        },
        {
          type: "output",
          text: `1st: 97
2nd: 82
3rd: 82`,
        },
        {
          type: "complexity",
          time: "O(n log k)",
          space: "O(k)",
        },
        {
          type: "paragraph",
          text: "Two students scored 82, so 2nd and 3rd are both 82. If the question means \"third distinct score\", I'd put the scores in a `TreeSet` first and walk down from `last()`.",
        },
        {
          type: "heading",
          text: "12. Find duplicate phone numbers",
        },
        {
          type: "paragraph",
          text: "A sign-up list where some people registered twice. A `HashSet` of seen numbers; the second sighting goes into the duplicates set.",
        },
        {
          type: "code",
          language: "java",
          title: "FindDuplicates.java",
          code: `import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class FindDuplicates {
    public static void main(String[] args) {
        List<String> phones = List.of("98300", "98311", "98300", "90000", "98311", "98300");
        Set<String> seen = new HashSet<>();
        Set<String> dupes = new LinkedHashSet<>();
        for (String p : phones) {
            if (!seen.add(p)) dupes.add(p);         // second sighting -> duplicate
        }
        System.out.println(dupes);
    }
}`,
        },
        {
          type: "output",
          text: "[98300, 98311]",
        },
        {
          type: "complexity",
          time: "O(n)",
          space: "O(n)",
        },
        {
          type: "heading",
          text: "13. Sort a map by its values",
        },
        {
          type: "paragraph",
          text: "A scoreboard map from batter to runs, printed highest first. Maps can't be sorted by value directly, so I copy the entries into a list and sort that.",
        },
        {
          type: "code",
          language: "java",
          title: "SortByValue.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class SortByValue {
    public static void main(String[] args) {
        Map<String, Integer> runs = Map.of("Rohit", 45, "Virat", 82, "Gill", 12, "Rahul", 61);
        List<Map.Entry<String, Integer>> rows = new ArrayList<>(runs.entrySet());
        rows.sort(Map.Entry.<String, Integer>comparingByValue().reversed());
        for (Map.Entry<String, Integer> e : rows) {
            System.out.println(e.getKey() + " " + e.getValue());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Virat 82
Rahul 61
Rohit 45
Gill 12`,
        },
        {
          type: "complexity",
          time: "O(n log n)",
          space: "O(n)",
        },
        {
          type: "paragraph",
          text: "`Map.of`'s own order changes every run, but the output above is stable because the sort decides it and there are no ties. If I needed the result as a map, I'd put the sorted entries into a `LinkedHashMap`, which keeps that order.",
        },
        {
          type: "heading",
          text: "14. Keep only the last N log lines",
        },
        {
          type: "paragraph",
          text: "A support screen shows the last three requests, like a CCTV recorder that overwrites the oldest footage. Add at the back of an `ArrayDeque`, drop from the front when over the limit.",
        },
        {
          type: "code",
          language: "java",
          title: "RecentLogs.java",
          code: `import java.util.ArrayDeque;
import java.util.Deque;

public class RecentLogs {
    private final Deque<String> lines = new ArrayDeque<>();
    private final int limit;

    RecentLogs(int limit) { this.limit = limit; }

    void add(String line) {
        lines.addLast(line);
        if (lines.size() > limit) lines.removeFirst();   // forget the oldest
    }

    public static void main(String[] args) {
        RecentLogs recent = new RecentLogs(3);
        for (int i = 1; i <= 6; i++) recent.add("request " + i);
        System.out.println(recent.lines);
    }
}`,
        },
        {
          type: "output",
          text: "[request 4, request 5, request 6]",
        },
        {
          type: "complexity",
          time: "O(1) per add",
          space: "O(limit)",
        },
        {
          type: "heading",
          text: "Bonus: round-robin assignment",
        },
        {
          type: "paragraph",
          text: "A restaurant gives each new table to the next waiter in turn. `Collections.rotate(list, -1)` moves the first waiter to the back.",
        },
        {
          type: "code",
          language: "java",
          title: "RotateQueue.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class RotateQueue {
    public static void main(String[] args) {
        // round-robin: whoever served last goes to the back
        List<String> waiters = new ArrayList<>(List.of("Anu", "Bilal", "Chris", "Deepa"));
        for (int table = 1; table <= 5; table++) {
            System.out.println("table " + table + " -> " + waiters.get(0));
            Collections.rotate(waiters, -1);           // move the first to the end
        }
    }
}`,
        },
        {
          type: "output",
          text: `table 1 -> Anu
table 2 -> Bilal
table 3 -> Chris
table 4 -> Deepa
table 5 -> Anu`,
        },
        {
          type: "paragraph",
          text: "`rotate` is O(n) per call. For a real dispatcher I'd use an `ArrayDeque` and do `addLast(pollFirst())`, which is O(1), or just keep an index that wraps around with `%`.",
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
              question: "ArrayList or LinkedList: which do you pick and why?",
              answer:
                "`ArrayList` almost always. It has O(1) access by index, amortized O(1) appends, and its elements sit in one contiguous array, which is cache-friendly. `LinkedList` only wins when I insert or remove through an iterator in the middle of a long list, and even then the O(n) walk to get there usually dominates.\n\nMemory matters too: I measured 24 bytes per `LinkedList` node on top of each element, against a 4-byte slot in an `ArrayList`'s array. For queue or stack use, `ArrayDeque` beats both.",
            },
            {
              question: "HashMap, LinkedHashMap or TreeMap?",
              answer:
                "`HashMap` for plain key lookups: O(1) average, no order. `LinkedHashMap` when I also need insertion order (or access order, for an LRU cache), at the cost of two extra links per entry: 40 bytes per entry instead of 32 in my measurement. `TreeMap` when keys must be sorted or I need range queries like `floorKey`, `subMap`, `firstKey`, at O(log n) per operation.\n\nMy fare slabs needed `floorEntry`, so `TreeMap`. My trip timeline needed arrival order, so `LinkedHashMap`.",
            },
            {
              question: "When do you use a Set instead of a List?",
              answer:
                "When each value should appear once, or when the main question is \"is this in here?\". `HashSet.contains` is O(1) average, `List.contains` is O(n). `add` on a set also returns false for a repeat, which turns deduplication into one call.\n\nIf I need uniqueness **and** order, `LinkedHashSet` keeps first-seen order and `TreeSet` keeps sorted order.",
            },
            {
              question: "What should you use for a stack or a queue in modern Java?",
              answer:
                "`ArrayDeque` for both: `push`/`pop` for a stack, `offer`/`poll` for a queue, all O(1) amortized, backed by a circular array. `Stack` is a synchronized `Vector` from Java 1.0, and its own Javadoc recommends `Deque`. `LinkedList` also implements `Deque` but allocates a node per element.\n\nFor priority order, `PriorityQueue`. For handing work between threads, a `BlockingQueue`.",
            },
            {
              question: "What's the time complexity of contains on ArrayList, HashSet and TreeSet?",
              answer:
                "O(n) for `ArrayList`, a linear scan with `equals`. O(1) on average for `HashSet`, using `hashCode` to find the bucket and then `equals`. O(log n) for `TreeSet`, a walk down a red-black tree using `compareTo` or the comparator.\n\nThat difference is why calling `list.contains` inside a loop is the most common accidental O(n²) in backend code.",
            },
            {
              question: "What is EnumMap and when is it better than HashMap?",
              answer:
                "A map whose keys are constants of one enum type, implemented as an array indexed by each constant's ordinal. Lookups are O(1) with no hashing and no collisions, iteration follows the enum's declaration order, and it uses less memory than a `HashMap`.\n\nAny map keyed by an enum, like settings per order status or counts per day of week, should be an `EnumMap`. `EnumSet` is the set version, stored as a bit vector.",
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
              question: "Why can LinkedList be slower than ArrayList even for inserts in the middle?",
              answer:
                "Because the O(1) insert only applies once I'm at the node, and reaching index i means following i links (or n - i from the other end). Each link is a separate object somewhere on the heap, so the walk is a chain of cache misses. `ArrayList` has to shift elements, but that's one `System.arraycopy` over contiguous memory, which the CPU does very fast.\n\nSo both are O(n) for a middle insert by index, and the constant factor favours the array. Benchmarks with JMH, not intuition, are the way to settle a specific case.",
            },
            {
              question: "Why does printing a PriorityQueue not show sorted order?",
              answer:
                "Because it's a binary heap stored in an array. The heap only guarantees that each parent is smaller than its children, so the smallest element is at index 0, but the rest of the array is only partially ordered. `toString` and the iterator walk that array as-is.\n\nOnly repeated `poll()` gives elements in priority order, as in my work-queue example. If I need a sorted view of everything, I sort a copy or use a `TreeSet`.",
            },
            {
              question: "Why might a HashSet say it doesn't contain an element you added?",
              answer:
                "Usually because the element was mutated after it was added, changing its `hashCode`. The set looks in the bucket for the new hash, and the element is still sitting in the bucket for the old one. Another cause is a class that overrides `equals` but not `hashCode`, so two equal objects land in different buckets.\n\nThe rules: override both together, and don't mutate fields that `hashCode` depends on while the object is in a hash-based collection. Records and immutable keys avoid the problem.",
            },
            {
              question: "Your service builds a List of 10,000 ids and checks list.contains(id) for each of 10,000 incoming events. It's slow. Why, and what's the fix?",
              answer:
                "Each `contains` scans the list, up to 10,000 `equals` calls, so 10,000 events cost up to 100 million comparisons, O(n × m). Converting the ids to a `HashSet` once, O(n), makes each check O(1) on average, so the whole job is about 20,000 operations.\n\nThe code change is one line: `Set<Long> ids = new HashSet<>(idList);`. It's the same pattern as indexing drivers by id in a `HashMap` before handling requests.",
            },
            {
              question: "Is HashMap's iteration order random?",
              answer:
                "Not random, but unspecified. It follows bucket order, which depends on the keys' hash codes and the table size. For `String` keys on one JDK it's stable from run to run, which is why code ends up depending on it, and then it changes when the table resizes, when more keys are added, or when the JDK changes its hashing.\n\nIn my timeline example, `HashMap` printed `arrived, en_route, pickup, started, completed`. `Set.of` and `Map.of` go further and really do randomize per JVM run. If order matters, `LinkedHashMap` or `TreeMap`.",
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
              question: "How much memory does a HashMap entry really take?",
              answer:
                "On a 64-bit JDK 21 with compressed pointers, I measured 32 bytes per `HashMap$Node` (hash, key, value, next, plus the object header), and the table adds a 4-byte slot for every bucket. Because the table doubles when it's 75% full, 100,000 entries ended up in a 262,144-slot table, about 10 more bytes per entry. On top of that come the key and value objects themselves, 16 bytes for each distinct `Integer`.\n\n`LinkedHashMap` and `TreeMap` entries were 40 bytes each. That's why a `Map<Integer, Integer>` of 100,000 entries costs several megabytes while two `int[]` of the same data cost 800 KB.",
            },
            {
              question: "How does LinkedHashMap support an LRU cache?",
              answer:
                "Its entries are also linked in a doubly linked list. With the constructor flag `accessOrder = true`, every `get` or `put` of an existing key moves that entry to the tail, so the head is always the least recently used. After every insertion it calls `removeEldestEntry(eldest)`, a protected hook that returns false by default.\n\nOverriding it to return `size() > capacity` gives an LRU cache in a few lines. My cache of 3 evicted `u2` after `u1` had been read, printing `{u3=Meera, u1=Asha, u4=Kabir}`.",
            },
            {
              question: "What happens inside a HashMap when many keys collide?",
              answer:
                "Colliding keys share a bucket as a linked list of nodes, which makes lookups in that bucket O(k). Since Java 8, when one bucket reaches 8 nodes and the table has at least 64 buckets, that bucket is converted into a red-black tree of `TreeNode`s, so the worst case becomes O(log k). If the table is smaller than 64, it resizes instead.\n\nTree bins order keys by hash and, when they're `Comparable`, by `compareTo`. That's a defence against hash-flooding attacks with many colliding keys. The lesson on HashMap itself goes into this in depth.",
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
            "Count how many times each letter appears in your full name, printed in alphabetical order. Hint: `TreeMap<Character, Integer>`.",
            "Given a list of order ids with repeats, print the first id that appears exactly twice. Hint: a `LinkedHashMap` of counts.",
            "Build a fare calculator with a `TreeMap` of distance slabs that charges each km at its own slab's rate (like income tax brackets), not the whole trip at one rate.",
            "Write a `RecentlyViewed` class that keeps the last 5 distinct product ids a user viewed, most recent first, with no duplicates. Hint: `LinkedHashSet`, remove and re-add on each view.",
            "Simulate a hospital desk with a `PriorityQueue` of patients by severity, and add a sequence number so that equal severities are served first-come, first-served.",
            "Take any program from the practice set that uses a `HashMap` and replace it with a `TreeMap`. What changes in the output, and in the complexity?",
            "Run `Footprint` with `-XX:-UseCompressedOops` and compare the bytes per node with the table above.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `DEFAULTS     List -> ArrayList    Map -> HashMap
             Set  -> HashSet      Stack/Queue -> ArrayDeque

NEED ORDER   insertion -> LinkedHashMap / LinkedHashSet
             sorted, ranges, floor/ceiling -> TreeMap / TreeSet
             most urgent first -> PriorityQueue (poll, not print)
ENUM KEYS    EnumMap / EnumSet
NEVER CHANGE List.of / Set.of / Map.of / List.copyOf
THREADS      ConcurrentHashMap, CopyOnWriteArrayList, BlockingQueue

COSTS        ArrayList   get O(1)  add O(1)*  middle O(n)  contains O(n)
             LinkedList  get O(n)  ends O(1)  contains O(n)  24 B/node
             HashMap     get/put/remove O(1) avg     32 B/entry + table
             TreeMap     get/put/remove O(log n)     40 B/entry
             ArrayDeque  both ends O(1)*   PriorityQueue offer/poll O(log n)
             (* amortized)

PATTERNS     dedupe           -> HashSet.add() returns false on repeat
             lookup by id     -> build a HashMap once, then O(1) gets
             LRU cache        -> LinkedHashMap(accessOrder) + removeEldestEntry
             top-K            -> count in HashMap + min-heap of size K
             slabs / brackets -> TreeMap.floorEntry`,
          caption: "The whole collection decision on one screen.",
        },
        {
          type: "list",
          items: [
            "Ask in order: lookup by key, uniqueness, processing order, plain sequence. Then: does it change, and do threads share it?",
            "Default to `ArrayList`, `HashMap`, `HashSet` and `ArrayDeque`, and move away only for a reason you can name.",
            "Watch the hidden costs: `contains` on a list inside a loop, node overhead in linked and hashed structures, and boxing in collections of numbers.",
          ],
        },
      ],
    },
  ],
};
