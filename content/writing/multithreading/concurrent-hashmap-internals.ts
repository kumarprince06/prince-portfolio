import type { Lesson } from "../types";

export const concurrentHashMapInternals: Lesson = {
  slug: "concurrent-hashmap-internals",
  date: "2026-11-14",
  title: "ConcurrentHashMap Internals",
  description:
    "Inside ConcurrentHashMap on JDK 21, measured rather than described: a shared HashMap that lost half its keys, threw ClassCastException from its own tree code and twice spun forever at 100% CPU in its tree code, Hashtable and synchronizedMap stuck near 5 million operations a second on 8 threads while ConcurrentHashMap reached 17 to 45 million, the Java 7 segments and the Java 8 redesign read from javap (CAS into empty bins through Unsafe, synchronized on the first node, TreeBin, ForwardingNode, ReservationNode), a resize copied by eight threads at once watched through sizeCtl and transferIndex, baseCount and CounterCells with negative cells that still add up, why null is banned, weakly consistent iterators, and a driver-location map in a ride-hailing backend that reported 105,257 drivers online out of 60,000.",
  tags: ["Multithreading", "ConcurrentHashMap", "Collections", "JVM Internals"],
  sections: [
    {
      title: "What ConcurrentHashMap Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, ThreadPoolExecutor Internals: Queues, Rejection and Sizing, ended with a pool of worker threads that all serve the same requests. Sooner or later those workers need to share state: the last known location of every driver, the trips each driver has completed today, a cache of rider profiles. The Collections track's HashMap Internals lesson showed what happens when two threads share a plain `HashMap`: lost entries and a wrong `size()`. This lesson is about the map that was designed for the job, `java.util.concurrent.ConcurrentHashMap`, and about how it manages to be thread-safe without one big lock.",
        },
        {
          type: "paragraph",
          text: "From the outside, `ConcurrentHashMap` is a `Map`: `put`, `get`, `remove`, iteration. Every single call is thread-safe and atomic. Inside, it's the same idea as `HashMap` (an array of bins, each holding a chain or a red-black tree), with three changes that make it concurrent: an empty bin is filled with one compare-and-set instead of a lock, a non-empty bin is locked on its **first node** only, so writers to different bins never wait for each other, and `get` takes **no lock at all**. Resizing is shared between whichever threads happen to be writing, and the size is kept in a striped counter so that writers don't fight over one number.",
        },
        {
          type: "paragraph",
          text: "I built on HashMap Internals here rather than repeating it: hashing, buckets, treeification and the lo/hi split are assumed. Everything below was measured on JDK 21 on an 8-core machine: the fields and bytecode with `javap`, the live table with reflection, locks with `jstack` and JFR, and the costs with small benchmarks. The next lesson, ConcurrentHashMap Atomic Operations and Pitfalls, is about using it correctly: `merge`, `compute`, `computeIfAbsent` and the bugs that survive a thread-safe map.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0's `Hashtable` made every method `synchronized`, which was correct and simple: one lock for the whole table. Java 1.2 kept that design available as `Collections.synchronizedMap`. Doug Lea's `util.concurrent` library (1998 onwards) explored better designs, and JSR 166 brought them into the JDK in Java 5 as `java.util.concurrent`. The first `ConcurrentHashMap` split the table into 16 **segments**, each a small hash table guarded by its own `ReentrantLock`, so up to 16 writers could work in parallel while reads usually took no lock. Java 8 threw the segments away and rebuilt the class around per-bin locking, CAS and cooperative resizing, which is the design JDK 21 still uses.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`Hashtable`: every method `synchronized`, no `null` keys or values", "One lock for every reader and writer"],
            ["Java 1.2 (1998)", "`HashMap` (not thread-safe) and `Collections.synchronizedMap`", "Still one lock: the wrapper's mutex"],
            ["Java 5 (2004)", "JSR 166: `ConcurrentHashMap` with 16 `Segment`s (each a `ReentrantLock`), `ConcurrentMap` interface, weakly consistent iterators", "Lock striping: 16 writers at once"],
            ["Java 7 (2011)", "Segments created lazily, `Unsafe`-based reads", "Less memory for small maps; the segment design's last version"],
            ["Java 8 (2014)", "Rewrite (JEP 155): `Node` table, CAS into empty bins, `synchronized` on the first node, `TreeBin`, `ForwardingNode` and multi-threaded resize, `CounterCell` counting, `mappingCount`, bulk operations, `newKeySet`", "The design in this lesson; `Segment` survives only for serialization"],
            ["Java 8 (2014)", "`HashMap` resize keeps chain order", "Ends the Java 7 `HashMap` infinite loop in resize, but not concurrent corruption"],
            ["Java 9 (2017)", "`computeIfAbsent` returns early when the first node already holds the key; recursive updates throw `IllegalStateException`", "Covered in the next lesson"],
            ["Java 21 (2023)", "Same design; bins read and written through `jdk.internal.misc.Unsafe` acquire/release methods", "The JDK used for every measurement here"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the dispatch office of a taxi company in Kolkata, with a wall of pigeonholes, one per driver, where dispatchers drop and read slips.",
        },
        {
          type: "list",
          items: [
            "**`Hashtable` is an office with one door key.** Whoever holds the key is the only person allowed near the wall, even to read a slip. Eight dispatchers spend most of the day queueing for the key.",
            "**Java 5's segments are 16 separate rooms**, each with its own key. Sixteen people can work at once, but two dispatchers who need the same room still queue, and the number of rooms never changes after the office is built.",
            "**Java 8 puts a small latch on every pigeonhole.** Dropping a slip into an **empty** pigeonhole needs no latch at all: you look, and if it's still empty you drop the slip in one movement (CAS). If someone beat you to it, you look again. Adding to a pigeonhole that already has slips means holding **that pigeonhole's** latch for a moment.",
            "**Reading never touches a latch.** A dispatcher just looks. Slips are written fully before they're dropped in, so a reader never sees half a slip.",
            "**Moving to a bigger wall (resize)** is done by everyone who walks past: each person takes a stretch of 16 or more pigeonholes, moves their slips to the new wall, and puts a \"moved\" card (`ForwardingNode`) in each emptied hole. Readers who find a card simply go to the new wall.",
            "**Counting slips** isn't one tally sheet that everyone fights over. There's a main sheet (`baseCount`) and, when people collide, a few extra sheets (`CounterCell`s). The total is the sum of all of them, added up while people may still be writing.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real office would notice a dispatcher who reads pigeonhole 7, walks away, and writes in pigeonhole 7 based on what was there a minute ago. `ConcurrentHashMap` makes each visit atomic, but it can't know that two visits belong together. That's the check-then-act problem of the next lesson, and the reason the map's own atomic methods exist.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/concurrent-hashmap-internals-bins.svg",
          alt: "Diagram of a JDK 21 ConcurrentHashMap. On the left a volatile Node table with five slots, each showing one kind of bin. Slot 0 is null: put does casTabAt from null to a new Node with no lock and retries if it fails. Slot 1 is a chain of Nodes with hash greater than or equal to 0: put synchronizes on the first node to replace or append, and jstack shows locked a ConcurrentHashMap$Node. Slot 2 is a TreeBin with hash -2, created when a ninth node arrives in a bin of a table of 64 or more; writers lock the TreeBin and readers use lockState or walk the plain next list. Slot 3 is a ForwardingNode with hash -1, meaning the bin was already copied to nextTable during a resize; get follows it and put calls helpTransfer. Slot 4 is a ReservationNode with hash -3, a placeholder while computeIfAbsent's function runs. On the right, counting entries: a long baseCount plus a CounterCell array used under contention, with size equal to baseCount plus every cell, read one by one, so it is an estimate. Below it, the meanings of sizeCtl: 0 no table yet, positive initial size then resize count, -1 a thread is creating the table, less than -1 resizing with a 16-bit stamp in the high bits and 1 plus the number of resizers in the low bits; transferIndex hands out stripes of at least 16 bins per thread. At the bottom: get uses spread of the hash code, then tabAt, an acquire read, then volatile next and val; negative hashes are reserved for special nodes.",
          caption: "Empty bins are filled with CAS, non-empty bins are locked on their first node, and negative hashes mark the special nodes.",
        },
        {
          type: "heading",
          text: "Three ways to share a map",
        },
        {
          type: "table",
          headers: ["", "`Hashtable`", "`Collections.synchronizedMap`", "`ConcurrentHashMap` (Java 8+)"],
          rows: [
            ["Lock for `get`", "The map's monitor", "The wrapper's monitor", "None"],
            ["Lock for `put`", "The map's monitor", "The wrapper's monitor", "None for an empty bin (CAS); the first node's monitor otherwise"],
            ["Writers in parallel", "1", "1", "As many as there are different bins"],
            ["`null` keys / values", "No / no", "Whatever the wrapped map allows", "No / no"],
            ["Iterators", "Fail-fast", "Fail-fast, and you must hold the lock while iterating", "Weakly consistent, never throw `ConcurrentModificationException`"],
            ["Atomic compound operations", "`synchronized` blocks around calls", "`synchronized (map)` around calls", "`putIfAbsent`, `compute`, `merge`... (next lesson)"],
            ["`size()`", "Exact (under the lock)", "Exact (under the lock)", "An estimate while writers are active"],
          ],
        },
        {
          type: "heading",
          text: "The special hashes",
        },
        {
          type: "table",
          headers: ["Node class", "`hash` field", "Meaning", "Where I saw it"],
          rows: [
            ["`Node`", "`spread(key.hashCode())`, always >= 0", "An ordinary entry in a chain", "Every bin of a small map"],
            ["`TreeBin`", "`TREEBIN = -2`", "Head of a red-black tree of `TreeNode`s", "`BinKinds`, 10 colliding keys"],
            ["`ForwardingNode`", "`MOVED = -1`", "Bin already copied to `nextTable` during a resize", "`ResizeWatch`, up to 3.7 million at once"],
            ["`ReservationNode`", "`RESERVED = -3`", "Placeholder while `computeIfAbsent`/`compute` runs on an empty bin", "`BinKinds`, mid-`computeIfAbsent`"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "As in HashMap Internals, the JDK source isn't installed on this machine, so the evidence is `javap` on the real JDK 21 class files, reflection into live maps (with `--add-opens java.base/java.util.concurrent=ALL-UNNAMED`, for learning only), thread dumps, and the structure of the OpenJDK source, which the bytecode lets me check. First, the fields:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.ConcurrentHashMap | grep -E 'transient|Unsafe U'
javap -p -constants java.util.concurrent.ConcurrentHashMap | grep 'static final int'`,
        },
        {
          type: "output",
          text: `  volatile transient java.util.concurrent.ConcurrentHashMap$Node<K, V>[] table;
  private volatile transient java.util.concurrent.ConcurrentHashMap$Node<K, V>[] nextTable;
  private volatile transient long baseCount;
  private volatile transient int sizeCtl;
  private volatile transient int transferIndex;
  private volatile transient int cellsBusy;
  private volatile transient java.util.concurrent.ConcurrentHashMap$CounterCell[] counterCells;
  private transient java.util.concurrent.ConcurrentHashMap$KeySetView<K, V> keySet;
  private transient java.util.concurrent.ConcurrentHashMap$ValuesView<K, V> values;
  private transient java.util.concurrent.ConcurrentHashMap$EntrySetView<K, V> entrySet;
  private static final jdk.internal.misc.Unsafe U;

  private static final int DEFAULT_CAPACITY = 16;
  static final int TREEIFY_THRESHOLD = 8;
  static final int MIN_TREEIFY_CAPACITY = 64;
  private static final int MIN_TRANSFER_STRIDE = 16;
  private static final int MAX_RESIZERS = 65535;
  private static final int RESIZE_STAMP_SHIFT = 16;
  static final int MOVED = -1;
  static final int TREEBIN = -2;
  static final int RESERVED = -3;
  static final int HASH_BITS = 2147483647;`,
        },
        {
          type: "list",
          items: [
            "**`table` is `volatile`**, unlike `HashMap.table`. Publishing a new table after a resize is a volatile write, so every thread sees the whole new table.",
            "**`nextTable` and `transferIndex`** exist only for resizing: the table being filled, and the next stripe of old bins still to hand out.",
            "**`baseCount`, `counterCells` and `cellsBusy`** are the size counter. There is no `int size` and, unlike `HashMap`, no `modCount` at all: nothing to make an iterator fail fast.",
            "**`sizeCtl`** is overloaded: the initial table size before the table exists, `-1` while one thread creates it, the next resize threshold afterwards, and a negative stamp-plus-count during a resize (the image above has the full list).",
            "**`U` is `jdk.internal.misc.Unsafe`.** On JDK 21 this class still uses `Unsafe` for its array and field CAS, not `VarHandle` (a `VarHandle` would give the same memory semantics; `Unsafe` is simply what this code base uses).",
            "`MIN_TRANSFER_STRIDE = 16` is the smallest number of bins a resizing thread claims at once, and `MAX_RESIZERS = 65535` is the most threads that can help with one resize, because the count lives in the low 16 bits of `sizeCtl`.",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: `for c in Node TreeBin ForwardingNode ReservationNode CounterCell; do
  javap -p "java.util.concurrent.ConcurrentHashMap\\$$c"
done`,
        },
        {
          type: "output",
          text: `class java.util.concurrent.ConcurrentHashMap$Node<K, V> implements java.util.Map$Entry<K, V> {
  final int hash;
  final K key;
  volatile V val;
  volatile java.util.concurrent.ConcurrentHashMap$Node<K, V> next;

final class java.util.concurrent.ConcurrentHashMap$TreeBin<K, V> extends java.util.concurrent.ConcurrentHashMap$Node<K, V> {
  java.util.concurrent.ConcurrentHashMap$TreeNode<K, V> root;
  volatile java.util.concurrent.ConcurrentHashMap$TreeNode<K, V> first;
  volatile java.lang.Thread waiter;
  volatile int lockState;

final class java.util.concurrent.ConcurrentHashMap$ForwardingNode<K, V> extends java.util.concurrent.ConcurrentHashMap$Node<K, V> {
  final java.util.concurrent.ConcurrentHashMap$Node<K, V>[] nextTable;

final class java.util.concurrent.ConcurrentHashMap$ReservationNode<K, V> extends java.util.concurrent.ConcurrentHashMap$Node<K, V> {

final class java.util.concurrent.ConcurrentHashMap$CounterCell {
  volatile long value;`,
        },
        {
          type: "paragraph",
          text: "Compared with `HashMap.Node` (`final int hash`, `final K key`, `V value`, `Node next`), the concurrent `Node` makes `val` and `next` **`volatile`**. That's what lets `get` run without a lock: a reader that reaches a node through volatile reads sees the key, the hash and the latest value written by the thread that last wrote them. `TreeBin` carries its own tiny read-write lock (`lockState` with `WRITER = 1`, `WAITER = 2`, `READER = 4`) so that readers of a tree never block; if a writer is restructuring the tree, a reader walks the plain `first`/`next` list instead. `CounterCell` is just one `volatile long`.",
        },
        {
          type: "heading",
          text: "spread, tabAt and casTabAt",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.concurrent.ConcurrentHashMap   # spread, tabAt, casTabAt",
        },
        {
          type: "output",
          text: `  static final int spread(int);
    Code:
       0: iload_0
       1: iload_0
       2: bipush        16
       4: iushr
       5: ixor
       6: ldc           #5                  // int 2147483647
       8: iand
       9: ireturn
...
  static final <K, V> java.util.concurrent.ConcurrentHashMap$Node<K, V> tabAt(java.util.concurrent.ConcurrentHashMap$Node<K, V>[], int);
    Code:
       0: getstatic     #40                 // Field U:Ljdk/internal/misc/Unsafe;
       3: aload_0
       4: iload_1
       5: i2l
       6: getstatic     #44                 // Field ASHIFT:I
       9: lshl
      10: getstatic     #48                 // Field ABASE:I
      13: i2l
      14: ladd
      15: invokevirtual #51                 // Method jdk/internal/misc/Unsafe.getReferenceAcquire:(Ljava/lang/Object;J)Ljava/lang/Object;
      18: checkcast     #57                 // class java/util/concurrent/ConcurrentHashMap$Node
      21: areturn

  static final <K, V> boolean casTabAt(java.util.concurrent.ConcurrentHashMap$Node<K, V>[], int, java.util.concurrent.ConcurrentHashMap$Node<K, V>, java.util.concurrent.ConcurrentHashMap$Node<K, V>);
    Code:
       0: getstatic     #40                 // Field U:Ljdk/internal/misc/Unsafe;
       3: aload_0
       4: iload_1
       5: i2l
       6: getstatic     #44                 // Field ASHIFT:I
       9: lshl
      10: getstatic     #48                 // Field ABASE:I
      13: i2l
      14: ladd
      15: aload_2
      16: aload_3
      17: invokevirtual #59                 // Method jdk/internal/misc/Unsafe.compareAndSetReference:(Ljava/lang/Object;JLjava/lang/Object;Ljava/lang/Object;)Z
      20: ireturn`,
        },
        {
          type: "list",
          items: [
            "**`spread(h)` is `(h ^ (h >>> 16)) & 0x7fffffff`.** The XOR with the high half is the same mixing as `HashMap.hash`. The extra `iand` with `2147483647` (`HASH_BITS`) clears the sign bit, because negative hashes are reserved for `MOVED`, `TREEBIN` and `RESERVED`. A real key can never be mistaken for a forwarding node.",
            "**`tabAt` reads `table[i]` with `Unsafe.getReferenceAcquire`**, at address `ABASE + (i << ASHIFT)`. A plain array read could see a stale reference; an acquire read sees the node together with everything written before it was published.",
            "**`casTabAt` is `Unsafe.compareAndSetReference`**: \"if `table[i]` is still `null`, make it this new node\", in one hardware instruction (`lock cmpxchg` on x86). `setTabAt` (not shown) is `putReferenceRelease`, used when a thread that already holds the bin's lock replaces the bin's head.",
          ],
        },
        {
          type: "heading",
          text: "putVal: CAS, help, or lock",
        },
        {
          type: "paragraph",
          text: "`put(k, v)` is `putVal(k, v, false)`. These are the lines of its bytecode that make the decisions (the full method is 430 bytes):",
        },
        {
          type: "output",
          text: `  final V putVal(K, V, boolean);
    Code:
       0: aload_1
       1: ifnull        8
       4: aload_2
       5: ifnonnull     16
       8: new           #139                // class java/lang/NullPointerException
      ...
      15: athrow
      16: aload_1
      17: invokevirtual #98                 // Method java/lang/Object.hashCode:()I
      20: invokestatic  #102                // Method spread:(I)I
      ...
      49: invokevirtual #155                // Method initTable:()[Ljava/util/concurrent/ConcurrentHashMap$Node;
      ...
      69: invokestatic  #109                // Method tabAt:(...)Ljava/util/concurrent/ConcurrentHashMap$Node;
      ...
      94: invokestatic  #162                // Method casTabAt:(...)Z
      97: ifeq          420
      ...
     105: getfield      #113                // Field java/util/concurrent/ConcurrentHashMap$Node.hash:I
     ...
     111: iconst_m1
     112: if_icmpne     128
     ...
     120: invokevirtual #166                // Method helpTransfer:(...)[Ljava/util/concurrent/ConcurrentHashMap$Node;
     ...
     187: monitorenter
     ...
     192: invokestatic  #109                // Method tabAt:(...)Ljava/util/concurrent/ConcurrentHashMap$Node;
     ...
     313: instanceof    #170                // class java/util/concurrent/ConcurrentHashMap$TreeBin
     ...
     331: invokevirtual #172                // Method java/util/concurrent/ConcurrentHashMap$TreeBin.putTreeVal:(...)
     ...
     362: instanceof    #176                // class java/util/concurrent/ConcurrentHashMap$ReservationNode
     ...
     372: ldc           #180                // String Recursive update
     ...
     399: bipush        8
     ...
     409: invokevirtual #185                // Method treeifyBin:(...)V
     ...
     427: invokevirtual #189                // Method addCount:(JI)V`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Offsets 0 to 15: no nulls.** A `null` key or value throws a `NullPointerException` created with no message (which is why the NPE from `put` prints `null` as its message later on).",
            "**Offset 20: `spread`** of the key's `hashCode()`.",
            "**Offset 49: `initTable`** if there's no table yet. Only one thread wins the CAS of `sizeCtl` to `-1`; the others `Thread.yield()` and loop until the table appears.",
            "**Offsets 69 to 97: empty bin.** `tabAt` returned `null`, so build a `Node` and `casTabAt` it in. If the CAS fails (`ifeq 420`), another thread filled the bin first: go round the loop again. No lock is taken.",
            "**Offsets 105 to 120: forwarded bin.** If the first node's hash is `-1` (`iconst_m1`, `MOVED`), a resize is running: call `helpTransfer`, copy some bins, and retry on the new table.",
            "**Offsets 128 to 176** (not shown): a shortcut taken only by `putIfAbsent` (`onlyIfAbsent` is `true`), which returns the existing value without locking if the first node already holds the key.",
            "**Offset 187: `monitorenter` on the first node.** After locking, `tabAt` is read again (offset 192): if the head changed while this thread waited, the lock is on a stale node, and the loop starts over. Otherwise walk the chain and replace or append, or delegate to `TreeBin.putTreeVal` (offset 331). A `ReservationNode` here means a `computeIfAbsent` is running on this bin from the same thread: `IllegalStateException(\"Recursive update\")`.",
            "**Offsets 399 and 409: treeify** if the chain had 8 or more nodes.",
            "**Offset 427: `addCount(1, binCount)`** updates the size and checks whether to resize.",
          ],
        },
        {
          type: "paragraph",
          text: "`get` is the opposite: `javap -c` finds **zero** `monitorenter` instructions in `get(Object)`. It calls `spread`, `tabAt`, compares hash and `equals`, follows `next`, and for a negative hash calls the special node's `find` (a `ForwardingNode` looks in `nextTable`, a `TreeBin` searches the tree). Across the whole class there are 11 `monitorenter`s, in `putVal`, `replaceNode`, `clear`, `transfer`, `treeifyBin`, and the `compute` family.",
        },
        {
          type: "heading",
          text: "Seeing the bin lock in a thread dump",
        },
        {
          type: "paragraph",
          text: "If writes lock the first node of a bin, a thread dump should show a `ConcurrentHashMap$Node` as the monitor. I held a bin with a slow `compute` and sent two more writers, one to the same key and one to another key, plus a `get` for the locked key:",
        },
        {
          type: "code",
          language: "java",
          title: "BinLock.java",
          code: `import java.util.concurrent.ConcurrentHashMap;

public class BinLock {
    static void log(long start, String msg) {
        System.out.printf("%5d ms  %-12s %s%n", (System.nanoTime() - start) / 1_000_000, Thread.currentThread().getName(), msg);
    }

    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<String, Integer> waitingRiders = new ConcurrentHashMap<>();
        waitingRiders.put("SALT-LAKE", 10);
        waitingRiders.put("NEW-TOWN", 4);
        long start = System.nanoTime();

        Thread slow = new Thread(() -> waitingRiders.compute("SALT-LAKE", (zone, n) -> {
            log(start, "inside compute, holding the bin lock for 3 s");
            try { Thread.sleep(3_000); } catch (InterruptedException e) { }
            return n + 1;
        }), "zone-updater");
        slow.start();
        Thread.sleep(200);

        Thread sameKey = new Thread(() -> {
            waitingRiders.merge("SALT-LAKE", 1, Integer::sum);
            log(start, "merge(SALT-LAKE) done");
        }, "same-key");
        Thread otherKey = new Thread(() -> {
            waitingRiders.merge("NEW-TOWN", 1, Integer::sum);
            log(start, "merge(NEW-TOWN) done");
        }, "other-key");
        sameKey.start();
        otherKey.start();
        log(start, "get(SALT-LAKE) = " + waitingRiders.get("SALT-LAKE") + " (no lock, old value)");
        slow.join(); sameKey.join(); otherKey.join();
        log(start, "final " + waitingRiders);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java BinLock &
sleep 1.2; jstack $(jps | awk '/BinLock/{print $1}')`,
        },
        {
          type: "output",
          text: `    8 ms  zone-updater inside compute, holding the bin lock for 3 s
  208 ms  other-key    merge(NEW-TOWN) done
  214 ms  main         get(SALT-LAKE) = 10 (no lock, old value)
 3032 ms  same-key     merge(SALT-LAKE) done
 3033 ms  main         final {SALT-LAKE=12, NEW-TOWN=5}`,
        },
        {
          type: "output",
          text: `"zone-updater" #20 [1470869] prio=5 os_prio=0 cpu=25.67ms elapsed=1.61s tid=0x000070002417c6e0 nid=1470869 waiting on condition  [0x00006ffff9ffe000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
	at java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
	at BinLock.lambda$main$0(BinLock.java:16)
	at BinLock$$Lambda/0x00006fffac000c30.apply(Unknown Source)
	at java.util.concurrent.ConcurrentHashMap.compute(java.base@21.0.13.0.3/ConcurrentHashMap.java:1940)
	- locked <0x000000008df159a8> (a java.util.concurrent.ConcurrentHashMap$Node)
...
"same-key" #21 [1470874] prio=5 os_prio=0 cpu=1.11ms elapsed=1.41s tid=0x000070002417e720 nid=1470874 waiting for monitor entry  [0x00006ffff9efe000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at java.util.concurrent.ConcurrentHashMap.merge(java.base@21.0.13.0.3/ConcurrentHashMap.java:2048)
	- waiting to lock <0x000000008df159a8> (a java.util.concurrent.ConcurrentHashMap$Node)`,
        },
        {
          type: "list",
          items: [
            "**The lock is an ordinary monitor on a `Node` object**: `- locked <0x...8df159a8> (a java.util.concurrent.ConcurrentHashMap$Node)` inside `compute`, and the second writer is `BLOCKED (on object monitor)` waiting for the same address. It's the `synchronized` of lesson 3, applied to one bin.",
            "**`merge(NEW-TOWN)` finished at 208 ms**, as soon as it started: a different bin, a different monitor.",
            "**`get(SALT-LAKE)` returned 10 at 214 ms** while `compute` was still running, without waiting. It saw the old value, because `compute` hadn't stored its result yet. A reader never blocks, and it never sees a half-finished update; it sees the last completed one.",
            "**`merge(SALT-LAKE)` waited 2.8 seconds** and then applied its +1 to the 11 that `compute` stored: the final value is 12, no update lost.",
          ],
        },
        {
          type: "heading",
          text: "Watching the table grow",
        },
        {
          type: "code",
          language: "java",
          title: "ChmPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.ConcurrentHashMap;

public class ChmPeek {
    static final Field TABLE, SIZE_CTL, BASE_COUNT, COUNTER_CELLS;
    static {
        try {
            Class<?> c = ConcurrentHashMap.class;
            TABLE = c.getDeclaredField("table");
            SIZE_CTL = c.getDeclaredField("sizeCtl");
            BASE_COUNT = c.getDeclaredField("baseCount");
            COUNTER_CELLS = c.getDeclaredField("counterCells");
            for (Field f : new Field[] {TABLE, SIZE_CTL, BASE_COUNT, COUNTER_CELLS}) f.setAccessible(true);
        } catch (ReflectiveOperationException e) { throw new ExceptionInInitializerError(e); }
    }

    static String state(ConcurrentHashMap<?, ?> m) throws IllegalAccessException {
        Object[] t = (Object[]) TABLE.get(m);
        Object[] cells = (Object[]) COUNTER_CELLS.get(m);
        return "size=" + m.size() + " table=" + (t == null ? "null" : t.length) + " sizeCtl=" + SIZE_CTL.get(m)
                + " baseCount=" + BASE_COUNT.get(m) + " counterCells=" + (cells == null ? "null" : cells.length);
    }

    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<Integer, String> map = new ConcurrentHashMap<>();
        System.out.println("new             " + state(map));
        int lastLength = 0;
        for (int i = 1; i <= 100; i++) {
            map.put(i, "trip-" + i);
            int length = ((Object[]) TABLE.get(map)).length;
            if (length != lastLength) {
                System.out.printf("after put #%-4d %s%n", i, state(map));
                lastLength = length;
            }
        }
        for (int cap : new int[] {16, 100, 1000}) {
            ConcurrentHashMap<Integer, String> sized = new ConcurrentHashMap<>(cap);
            System.out.printf("new CHM(%4d)   sizeCtl=%d", cap, SIZE_CTL.get(sized));
            sized.put(1, "x");
            System.out.println(" -> first put: table=" + ((Object[]) TABLE.get(sized)).length + " sizeCtl=" + SIZE_CTL.get(sized));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED ChmPeek",
        },
        {
          type: "output",
          text: `new             size=0 table=null sizeCtl=0 baseCount=0 counterCells=null
after put #1    size=1 table=16 sizeCtl=12 baseCount=1 counterCells=null
after put #12   size=12 table=32 sizeCtl=24 baseCount=12 counterCells=null
after put #24   size=24 table=64 sizeCtl=48 baseCount=24 counterCells=null
after put #48   size=48 table=128 sizeCtl=96 baseCount=48 counterCells=null
after put #96   size=96 table=256 sizeCtl=192 baseCount=96 counterCells=null
new CHM(  16)   sizeCtl=32 -> first put: table=32 sizeCtl=24
new CHM( 100)   sizeCtl=256 -> first put: table=256 sizeCtl=192
new CHM(1000)   sizeCtl=2048 -> first put: table=2048 sizeCtl=1536`,
        },
        {
          type: "list",
          items: [
            "**The table is lazy**, as in `HashMap`: `table=null`, `sizeCtl=0` until the first `put` creates 16 bins and sets `sizeCtl` to 12, the next resize point.",
            "**It resizes one entry earlier than `HashMap`.** HashMap Internals measured `HashMap` going from 16 to 32 bins on the 13th put (`++size > threshold`). `ConcurrentHashMap` resized on the **12th** (`addCount` checks `s >= sizeCtl`). Then 24, 48, 96: always at 75%.",
            "**`counterCells` stayed `null`.** One thread never contends on `baseCount`, so the striped cells are never created.",
            "**The constructor argument is an expected size, not a table size.** `new ConcurrentHashMap<>(16)` made a **32**-bin table: the constructor computes `1 + 16 / 0.75`, which is 22, and rounds up to a power of two (`javap -c` on the constructor shows the `dconst_1` and `fdiv`). 100 gave 256, 1000 gave 2048. Before the table exists, `sizeCtl` holds that initial size; after the first put it's back to being the 75% threshold. Example 2 compares this with `HashMap`.",
          ],
        },
        {
          type: "heading",
          text: "Every kind of bin, live",
        },
        {
          type: "code",
          language: "java",
          title: "BinKinds.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

public class BinKinds {
    record BadKey(int id) implements Comparable<BadKey> {
        @Override public int hashCode() { return 42; }                  // every key in one bin
        @Override public int compareTo(BadKey o) { return Integer.compare(id, o.id); }
    }

    static Field table, hash;

    static Object bin(ConcurrentHashMap<?, ?> m, int h) throws IllegalAccessException {
        Object[] t = (Object[]) table.get(m);
        return t[(t.length - 1) & h];
    }

    static String describe(Object node) throws IllegalAccessException {
        return node.getClass().getSimpleName() + " (hash " + hash.get(node) + ")";
    }

    public static void main(String[] args) throws Exception {
        table = ConcurrentHashMap.class.getDeclaredField("table");
        table.setAccessible(true);
        hash = Class.forName("java.util.concurrent.ConcurrentHashMap$Node").getDeclaredField("hash");
        hash.setAccessible(true);

        // 1. spread(): the sign bit is always cleared
        String odd = "polygenelubricants";
        int h = odd.hashCode();
        System.out.println("hashCode " + h + "  HashMap.hash " + (h ^ (h >>> 16))
                + "  CHM.spread " + ((h ^ (h >>> 16)) & 0x7fffffff));

        // 2. a crowded bin: Node chain, resize below 64, then TreeBin
        ConcurrentHashMap<BadKey, String> crowded = new ConcurrentHashMap<>();
        for (int i = 1; i <= 10; i++) {
            crowded.put(new BadKey(i), "v" + i);
            System.out.printf("keys=%-3d table=%-3d bin is %s%n", i, ((Object[]) table.get(crowded)).length,
                    describe(bin(crowded, 42)));
        }

        // 3. a computeIfAbsent in progress on an empty bin: ReservationNode
        ConcurrentHashMap<String, String> lazy = new ConcurrentHashMap<>();
        CountDownLatch inside = new CountDownLatch(1), release = new CountDownLatch(1);
        Thread loader = new Thread(() -> lazy.computeIfAbsent("ravi", k -> {
            inside.countDown();
            try { release.await(); } catch (InterruptedException e) { }
            return "profile-of-ravi";
        }));
        loader.start();
        inside.await();
        int spread = ("ravi".hashCode() ^ ("ravi".hashCode() >>> 16)) & 0x7fffffff;
        System.out.println("during computeIfAbsent: bin is " + describe(bin(lazy, spread))
                + ", get(\\"ravi\\") = " + lazy.get("ravi"));
        release.countDown();
        loader.join();
        System.out.println("after computeIfAbsent:  bin is " + describe(bin(lazy, spread))
                + ", get(\\"ravi\\") = " + lazy.get("ravi"));
    }
}`,
        },
        {
          type: "output",
          text: `hashCode -2147483648  HashMap.hash -2147450880  CHM.spread 32768
keys=1   table=16  bin is Node (hash 42)
keys=2   table=16  bin is Node (hash 42)
keys=3   table=16  bin is Node (hash 42)
keys=4   table=16  bin is Node (hash 42)
keys=5   table=16  bin is Node (hash 42)
keys=6   table=16  bin is Node (hash 42)
keys=7   table=16  bin is Node (hash 42)
keys=8   table=16  bin is Node (hash 42)
keys=9   table=128 bin is Node (hash 42)
keys=10  table=128 bin is TreeBin (hash -2)
during computeIfAbsent: bin is ReservationNode (hash -3), get("ravi") = null
after computeIfAbsent:  bin is Node (hash 3493143), get("ravi") = profile-of-ravi`,
        },
        {
          type: "list",
          items: [
            "**`\"polygenelubricants\".hashCode()` is `Integer.MIN_VALUE`.** `HashMap.hash` keeps it negative (`-2147450880`); `spread` clears the sign bit and gives `32768`. Inside `ConcurrentHashMap` an ordinary key's hash is never negative.",
            "**Eight colliding keys stay a `Node` chain**, all with hash 42.",
            "**The 9th key resized the table from 16 straight to 128**, not to 32. `treeifyBin` calls `tryPresize(n << 1)` when the table is smaller than 64, and `tryPresize` keeps doubling until the table's threshold is above the requested size: 16, 32, 64, then 128. `HashMap` went 16, 32, 64 one put at a time in the same experiment.",
            "**The 10th key made a `TreeBin` with hash `-2`.** Not a `TreeNode` at the head, as in `HashMap`, but a separate wrapper object that owns the tree and its `lockState`, so the bin's head (and therefore its monitor) never changes while the tree rebalances.",
            "**During `computeIfAbsent` on an empty bin, the bin holds a `ReservationNode` with hash `-3`.** The thread CASes the placeholder in, locks it, runs the function, then replaces it with the real node. A concurrent `get` returned `null`: the reservation has no value. After the function returned, the bin held a normal `Node` (hash 3493143) with the value.",
          ],
        },
      ],
    },
    {
      title: "Why HashMap Breaks Under Concurrency",
      blocks: [
        {
          type: "paragraph",
          text: "HashMap Internals showed two threads losing about 2,000 increments of `size()` and up to 40% of their keys. I wanted to know what four threads do on JDK 21, and I added a watchdog, because the first version of this program never finished:",
        },
        {
          type: "code",
          language: "java",
          title: "HashMapRace.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.stream.IntStream;

public class HashMapRace {
    // Four threads put 25,000 distinct keys each. Returns false if a thread is still running after 5 s.
    static boolean fill(Map<Integer, String> map) throws InterruptedException {
        CountDownLatch start = new CountDownLatch(1);
        Thread[] writers = new Thread[4];
        for (int t = 0; t < writers.length; t++) {
            int from = t * 25_000;
            writers[t] = new Thread(() -> {
                try { start.await(); } catch (InterruptedException e) { return; }
                for (int i = from; i < from + 25_000; i++) map.put(i, "trip-" + i);
            }, "writer-" + t);
            writers[t].setDaemon(true);                  // so a stuck writer can't keep the JVM alive
            writers[t].start();
        }
        start.countDown();
        boolean finished = true;
        for (Thread w : writers) {
            w.join(5_000);
            if (w.isAlive()) {
                finished = false;
                StackTraceElement top = w.getStackTrace()[0];
                System.out.println("  " + w.getName() + " still RUNNABLE after 5 s in " + top.getClassName()
                        + "." + top.getMethodName() + ":" + top.getLineNumber());
            }
        }
        return finished;
    }

    static void report(String label, Map<Integer, String> map) {
        long findable = IntStream.range(0, 100_000).filter(map::containsKey).count();
        System.out.printf("%-18s size()=%,7d  findable=%,7d  (expected 100,000)%n", label, map.size(), findable);
    }

    public static void main(String[] args) throws Exception {
        Map<Integer, String> plain = new HashMap<>();
        if (fill(plain)) report("HashMap", plain);
        else System.out.println("HashMap            HUNG (infinite loop inside the map)");

        Map<Integer, String> chm = new ConcurrentHashMap<>();
        fill(chm);
        report("ConcurrentHashMap", chm);
    }
}`,
        },
        {
          type: "output",
          text: `HashMap            size()= 90,436  findable= 47,670  (expected 100,000)
ConcurrentHashMap  size()=100,000  findable=100,000  (expected 100,000)`,
        },
        {
          type: "paragraph",
          text: "That's a typical run: no exception, `size()` says 90,436, and only 47,670 of the 100,000 keys can be found. I ran this version 37 times (25 in one batch, 12 in another), plus the first version once, and every single `HashMap` run was wrong. `size()` ranged from 9,434 to 99,958 and the findable keys from 5,455 to 91,951. In one run more keys were findable (91,230) than `size()` claimed (90,911): the size counter and the table are corrupted independently. `ConcurrentHashMap` printed exactly 100,000 and 100,000 every time.",
        },
        {
          type: "heading",
          text: "Two worse outcomes: ClassCastException and a hang",
        },
        {
          type: "paragraph",
          text: "Three of the 38 runs threw exceptions from inside `HashMap`'s own tree code (two threads' traces were interleaved in the output; this is one of them):",
        },
        {
          type: "output",
          text: `Exception in thread "writer-2" java.lang.ClassCastException: class java.util.HashMap$Node cannot be cast to class java.util.HashMap$TreeNode (java.util.HashMap$Node and java.util.HashMap$TreeNode are in module java.base of loader 'bootstrap')
	at java.base/java.util.HashMap$TreeNode.moveRootToFront(HashMap.java:1994)
	at java.base/java.util.HashMap$TreeNode.treeify(HashMap.java:2110)
	at java.base/java.util.HashMap.treeifyBin(HashMap.java:778)
	at java.base/java.util.HashMap.putVal(HashMap.java:650)
	at java.base/java.util.HashMap.put(HashMap.java:618)
	at HashMapRace.lambda$fill$0(HashMapRace.java:16)
	at java.base/java.lang.Thread.run(Thread.java:1583)
...
HashMap            size()= 66,220  findable= 33,627  (expected 100,000)
ConcurrentHashMap  size()=100,000  findable=100,000  (expected 100,000)`,
        },
        {
          type: "paragraph",
          text: "And two runs never finished. One was a run of the watchdog version, which reported:",
        },
        {
          type: "output",
          text: `  writer-3 still RUNNABLE after 5 s in java.util.HashMap$TreeNode.treeify:2107
HashMap            HUNG (infinite loop inside the map)
ConcurrentHashMap  size()=100,000  findable=100,000  (expected 100,000)`,
        },
        {
          type: "paragraph",
          text: "The other was the very first run of the first version, without the watchdog, and I took a thread dump before killing it. Three of the four writer threads had each burned about 151 seconds of CPU in 155 seconds of wall time, `RUNNABLE` inside `HashMap`, at 300% CPU in `top`:",
        },
        {
          type: "output",
          text: `"Thread-0" #20 [126093] prio=5 os_prio=0 cpu=151295.10ms elapsed=155.80s tid=0x00007c5c2c17cce0 nid=126093 runnable  [0x00007c5bbaa2c000]
   java.lang.Thread.State: RUNNABLE
	at java.util.HashMap$TreeNode.root(java.base@21.0.13.0.3/HashMap.java:1983)
	at java.util.HashMap$TreeNode.putTreeVal(java.base@21.0.13.0.3/HashMap.java:2137)
	at java.util.HashMap.putVal(java.base@21.0.13.0.3/HashMap.java:644)
	at java.util.HashMap.put(java.base@21.0.13.0.3/HashMap.java:618)
	...
"Thread-2" #22 [126095] prio=5 os_prio=0 cpu=150575.13ms elapsed=155.80s tid=0x00007c5c2c17f130 nid=126095 runnable  [0x00007c5bba82c000]
   java.lang.Thread.State: RUNNABLE
	at java.util.HashMap$TreeNode.treeify(java.base@21.0.13.0.3/HashMap.java:2107)
	at java.util.HashMap.treeifyBin(java.base@21.0.13.0.3/HashMap.java:778)
	at java.util.HashMap.putVal(java.base@21.0.13.0.3/HashMap.java:650)
	at java.util.HashMap.put(java.base@21.0.13.0.3/HashMap.java:618)
	...
"Thread-3" #23 [126096] prio=5 os_prio=0 cpu=151310.11ms elapsed=155.80s tid=0x00007c5c2c1802d0 nid=126096 runnable  [0x00007c5bba72c000]
   java.lang.Thread.State: RUNNABLE
	at java.util.HashMap$TreeNode.root(java.base@21.0.13.0.3/HashMap.java:1983)
	at java.util.HashMap$TreeNode.putTreeVal(java.base@21.0.13.0.3/HashMap.java:2137)
	...`,
        },
        {
          type: "list",
          items: [
            "**Why do sequential `Integer` keys end up in trees at all?** They have perfect hashes and should never collide. But when two threads resize at once, nodes are linked into the wrong chains (or into chains of a table that's being thrown away), and some bins end up with long, malformed chains. Past 8 nodes, `treeifyBin` turns them into trees, using `TreeNode` links that other threads are concurrently rewriting.",
            "**`TreeNode.root()` walks `parent` pointers until it finds a node with no parent.** If concurrent writes leave two tree nodes as each other's parent, that loop never ends, which is exactly where `Thread-0` and `Thread-3` were: `HashMap.java:1983`, 151 seconds of CPU each. `moveRootToFront` found a plain `Node` where it required a `TreeNode`: the `ClassCastException`.",
            "**The famous Java 7 bug was a different loop with the same cause.** Java 7's `HashMap.transfer` inserted each moved node at the **head** of its new bucket, reversing chains, and two threads resizing together could link two nodes to each other; the next `get` on that bucket looped forever. I can't run Java 7 here, so that part is history, not a measurement. Java 8 fixed the reversal (resize keeps order, as HashMap Internals showed), and people often conclude that concurrent `HashMap` \"only loses data now\". On JDK 21 I measured both: lost data in every run, and an infinite loop in 2 runs out of 38, now in the tree code.",
            "**The lesson isn't \"use a big enough map\" or \"it only happens with 4 threads\".** Any unsynchronized concurrent write to a `HashMap` is a data race, and the Java Memory Model makes no promises about a racy program's result. Corruption, exceptions and hangs are all allowed outcomes, and all three appeared within 38 runs.",
          ],
        },
      ],
    },
    {
      title: "One Lock vs Many: Hashtable, synchronizedMap and ConcurrentHashMap",
      blocks: [
        {
          type: "paragraph",
          text: "`Hashtable` and `Collections.synchronizedMap` are correct: every call takes the map's one lock. The cost is that every call, reads included, waits for every other call. I measured throughput with a read-mostly mix (90% `get`, 10% `put`, random keys from 0 to 99,999, 2 million operations per thread) at 1, 2, 4 and 8 threads:",
        },
        {
          type: "code",
          language: "java",
          title: "MapScaling.java",
          code: `import java.util.Collections;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

public class MapScaling {
    static final int KEYS = 100_000, OPS_PER_THREAD = 2_000_000;
    static int writePercent = 10;

    // random keys; writePercent% put, the rest get: a read-mostly cache such as driver locations
    static long run(Map<Integer, Long> map, int threads) throws InterruptedException {
        CountDownLatch ready = new CountDownLatch(threads), go = new CountDownLatch(1), done = new CountDownLatch(threads);
        for (int t = 0; t < threads; t++) {
            new Thread(() -> {
                ThreadLocalRandom r = ThreadLocalRandom.current();
                ready.countDown();
                try { go.await(); } catch (InterruptedException e) { return; }
                long sink = 0;
                for (int i = 0; i < OPS_PER_THREAD; i++) {
                    Integer key = r.nextInt(KEYS);
                    if (r.nextInt(100) < writePercent) map.put(key, (long) i);
                    else { Long v = map.get(key); if (v != null) sink += v; }
                }
                if (sink == 42) System.out.print("");
                done.countDown();
            }).start();
        }
        ready.await();
        long start = System.nanoTime();
        go.countDown();
        done.await();
        return System.nanoTime() - start;
    }

    public static void main(String[] args) throws Exception {
        Map<String, Supplier<Map<Integer, Long>>> kinds = new java.util.LinkedHashMap<>();
        kinds.put("Hashtable", Hashtable::new);
        kinds.put("synchronizedMap", () -> Collections.synchronizedMap(new HashMap<>()));
        kinds.put("ConcurrentHashMap", ConcurrentHashMap::new);
        if (args.length > 0) writePercent = Integer.parseInt(args[0]);
        System.out.println("Mops/s (best of 5), " + (100 - writePercent) + "% get / " + writePercent + "% put, 2M ops per thread");
        System.out.printf("%-18s %8s %8s %8s %8s%n", "", "1 thr", "2 thr", "4 thr", "8 thr");
        for (var kind : kinds.entrySet()) {
            System.out.printf("%-18s", kind.getKey());
            for (int threads : new int[] {1, 2, 4, 8}) {
                long best = Long.MAX_VALUE;
                for (int rep = 0; rep < 5; rep++) {
                    Map<Integer, Long> map = kind.getValue().get();
                    for (int k = 0; k < KEYS; k++) map.put(k, (long) k);
                    best = Math.min(best, run(map, threads));
                }
                System.out.printf(" %8.1f", threads * (double) OPS_PER_THREAD / best * 1000);
            }
            System.out.println();
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xms1g -Xmx1g MapScaling 10
java -Xms1g -Xmx1g MapScaling 0`,
        },
        {
          type: "output",
          text: `Mops/s (best of 5), 90% get / 10% put, 2M ops per thread
                      1 thr    2 thr    4 thr    8 thr
Hashtable              11.6      8.3      4.9      4.4
synchronizedMap        10.5      8.5      4.7      4.7
ConcurrentHashMap       9.8     15.9     19.3     20.2

Mops/s (best of 5), 100% get / 0% put, 2M ops per thread
                      1 thr    2 thr    4 thr    8 thr
Hashtable               9.6      6.1      5.1      5.7
synchronizedMap        11.8      7.0      5.0      5.2
ConcurrentHashMap      10.0     18.9     30.8     45.3`,
        },
        {
          type: "list",
          items: [
            "**The one-lock maps get slower with more threads.** `Hashtable` went from 11.6 million operations a second on one thread to 4.4 on eight. More threads don't add capacity; they add queueing, and every hand-over of a contended monitor costs a park and an unpark.",
            "**`ConcurrentHashMap` scaled**: 9.8, 15.9, 19.3, 20.2 with 10% writes, and 10.0, 18.9, 30.8, 45.3 with reads only: at 8 threads, about 4 times the one-lock maps with 10% writes and 8 to 9 times with reads only.",
            "**On one thread it isn't faster.** An uncontended `synchronized` is cheap, and `ConcurrentHashMap` does extra work per call (volatile reads, the CAS, the counter). In my runs single-threaded throughput was within the noise of the other two, sometimes a little behind. The point of `ConcurrentHashMap` is scaling, not raw speed.",
            "**These numbers are noisy.** Other agents were running benchmarks on this 8-core machine at the same time (load average 6 to 9), so the 8-thread figures varied from run to run: 16.7 to 20.2 for `ConcurrentHashMap` with 10% writes across five runs, while the one-lock maps stayed between 4.1 and 5.2. They're best-of-5, single-machine, not JMH. The ratios were stable; the absolute numbers aren't something to quote.",
          ],
        },
        {
          type: "heading",
          text: "Counting the waits",
        },
        {
          type: "paragraph",
          text: "Throughput says something is slow; I wanted to see the waiting directly. `ThreadMXBean` can count how often and how long each thread was `BLOCKED` on a monitor, once contention monitoring is switched on:",
        },
        {
          type: "code",
          language: "java",
          title: "LockContention.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.util.Collections;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadLocalRandom;

public class LockContention {
    static final ThreadMXBean MX = ManagementFactory.getThreadMXBean();

    // 8 threads, 1M ops each (90% get, 10% put); sums how often and how long they were BLOCKED on a monitor
    static void measure(String label, Map<Integer, Long> map) throws InterruptedException {
        for (int k = 0; k < 100_000; k++) map.put(k, (long) k);
        CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(8);
        long[] ids = new long[8];
        long[][] stats = new long[8][];
        for (int t = 0; t < 8; t++) {
            int slot = t;
            Thread th = new Thread(() -> {
                ThreadLocalRandom r = ThreadLocalRandom.current();
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int i = 0; i < 1_000_000; i++) {
                    int key = r.nextInt(100_000);
                    if (r.nextInt(10) == 0) map.put(key, (long) i); else map.get(key);
                }
                ThreadInfo info = MX.getThreadInfo(Thread.currentThread().threadId());
                stats[slot] = new long[] {info.getBlockedCount(), info.getBlockedTime()};
                done.countDown();
            });
            ids[t] = th.threadId();
            th.start();
        }
        long start = System.nanoTime();
        go.countDown();
        done.await();
        long wall = (System.nanoTime() - start) / 1_000_000;
        long blocked = 0, blockedMs = 0;
        for (long[] s : stats) { blocked += s[0]; blockedMs += s[1]; }
        System.out.printf("%-18s wall %5d ms   BLOCKED %,9d times, %,7d ms in total%n", label, wall, blocked, blockedMs);
    }

    public static void main(String[] args) throws Exception {
        MX.setThreadContentionMonitoringEnabled(true);
        measure("Hashtable", new Hashtable<>());
        measure("synchronizedMap", Collections.synchronizedMap(new HashMap<>()));
        measure("ConcurrentHashMap", new ConcurrentHashMap<>());
    }
}`,
        },
        {
          type: "output",
          text: `Hashtable          wall  1056 ms   BLOCKED    77,976 times,   6,041 ms in total
synchronizedMap    wall   967 ms   BLOCKED    77,680 times,   5,320 ms in total
ConcurrentHashMap  wall   312 ms   BLOCKED         1 times,       6 ms in total`,
        },
        {
          type: "paragraph",
          text: "Eight threads, about one second of wall time, and **5.3 to 6 seconds of blocked time** in total for the one-lock maps: most of each thread's life was spent waiting for the lock. Over three earlier runs the numbers were 38,000 to 105,000 blocks and 7.1 to 8.7 seconds. `ConcurrentHashMap` blocked 0 or 1 times across all runs: the only monitors it takes are on the first nodes of bins, and two of eight threads rarely write to the same bin of 262,144 at the same moment.",
        },
        {
          type: "paragraph",
          text: "JFR shows the same thing with stack traces. The `profile` settings record every monitor wait longer than 10 ms as a `jdk.JavaMonitorEnter` event:",
        },
        {
          type: "code",
          language: "bash",
          code: "java -XX:StartFlightRecording:filename=c.jfr,settings=profile LockContention",
        },
        {
          type: "output",
          text: `$ jfr summary c.jfr | grep JavaMonitorEnter
 jdk.JavaMonitorEnter                      437         10051
$ jfr print --events jdk.JavaMonitorEnter c.jfr | grep monitorClass | sort | uniq -c
    134   monitorClass = java.util.Collections$SynchronizedMap (classLoader = bootstrap)
    303   monitorClass = java.util.Hashtable (classLoader = bootstrap)
$ jfr print --events jdk.JavaMonitorEnter c.jfr | grep address | sort | uniq -c
    303   address = 0x7A5178003C60
    134   address = 0x7A517C002EF0
$ jfr print --events jdk.JavaMonitorEnter c.jfr | head -16
jdk.JavaMonitorEnter {
  startTime = 08:20:39.881 (2026-11-14)
  duration = 12.0 ms
  monitorClass = java.util.Hashtable (classLoader = bootstrap)
  previousOwner = "Thread-4" (javaThreadId = 29)
  address = 0x7A5178003C60
  eventThread = "Thread-1" (javaThreadId = 26)
  stackTrace = [
    java.util.Hashtable.get(Object) line: 380
    LockContention.lambda$measure$0(CountDownLatch, Map, long[][], int, CountDownLatch) line: 28
    java.lang.Thread.run() line: 1583
    ...
  ]
}`,
        },
        {
          type: "list",
          items: [
            "437 waits of 10 ms or more (the longest 48.6 ms), every one of them on `java.util.Hashtable` or `Collections$SynchronizedMap`, and **none** on any `ConcurrentHashMap` class.",
            "All 303 `Hashtable` events have the **same address**: one monitor for the whole map. `synchronizedMap` locks the wrapper object itself (its `mutex` is `this`), the other single address.",
            "259 of the 303 `Hashtable` waits were in **`get`**, not `put`: readers queue behind other readers, because a `synchronized` method doesn't distinguish them.",
          ],
        },
      ],
    },
    {
      title: "Resizing Together: sizeCtl, transferIndex and ForwardingNode",
      blocks: [
        {
          type: "paragraph",
          text: "A `HashMap` resize is one thread copying everything. In `ConcurrentHashMap`, the thread whose `addCount` crosses the threshold starts the resize: it allocates `nextTable` at twice the size and sets `sizeCtl` to `(resizeStamp(n) << 16) + 2`, a negative number whose low 16 bits count resizers plus one. Any other thread that writes during the resize (in `putVal`, `addCount` or `helpTransfer`) CASes `sizeCtl + 1` and joins. Each resizer claims a stripe of bins by CASing `transferIndex` downwards (from `n` towards 0, at least 16 bins at a time), copies each bin under that bin's lock using the same lo/hi split as `HashMap`, and leaves a `ForwardingNode` in the old slot. The last thread out rechecks the whole table and publishes `nextTable` as `table`.",
        },
        {
          type: "paragraph",
          text: "I sampled the live fields from a spinning thread while eight writers inserted 4 million keys:",
        },
        {
          type: "code",
          language: "java",
          title: "ResizeWatch.java",
          code: `import java.lang.reflect.Field;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

public class ResizeWatch {
    public static void main(String[] args) throws Exception {
        Class<?> c = ConcurrentHashMap.class;
        Field table = c.getDeclaredField("table"), next = c.getDeclaredField("nextTable");
        Field sizeCtl = c.getDeclaredField("sizeCtl"), transferIndex = c.getDeclaredField("transferIndex");
        for (Field f : new Field[] {table, next, sizeCtl, transferIndex}) f.setAccessible(true);

        ConcurrentHashMap<Integer, Integer> map = new ConcurrentHashMap<>();
        CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(8);
        for (int t = 0; t < 8; t++) {
            int from = t * 500_000;
            new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int i = from; i < from + 500_000; i++) map.put(i, i);
                done.countDown();
            }, "writer-" + t).start();
        }

        // old table length -> {max threads resizing at once, lowest transferIndex, most ForwardingNodes counted}
        Map<Integer, int[]> seen = new TreeMap<>();
        long samples = 0;
        go.countDown();
        while (done.getCount() > 0) {
            int ctl = (int) sizeCtl.get(map);
            Object[] nt = (Object[]) next.get(map), t = (Object[]) table.get(map);
            if (ctl >= 0 || nt == null || t == null || nt.length != 2 * t.length) continue;   // not resizing
            int[] s = seen.computeIfAbsent(t.length, k -> new int[] {0, Integer.MAX_VALUE, 0});
            s[0] = Math.max(s[0], (ctl & 0xFFFF) - 1);          // low 16 bits of sizeCtl: 1 + resizing threads
            s[1] = Math.min(s[1], (int) transferIndex.get(map));
            if (samples++ % 64 == 0) {                          // now and then, count the bins already moved
                int fwd = 0;
                for (Object bin : t) if (bin != null && bin.getClass().getSimpleName().equals("ForwardingNode")) fwd++;
                s[2] = Math.max(s[2], fwd);
            }
        }
        System.out.println("   resize            most threads copying   lowest transferIndex   ForwardingNodes seen");
        seen.forEach((len, s) -> System.out.printf("%,9d -> %,-9d %12d %22d %22d%n", len, 2 * len, s[0], s[1], s[2]));
        System.out.printf("final size %,d, table %,d%n", map.size(), ((Object[]) table.get(map)).length);
    }
}`,
        },
        {
          type: "output",
          text: `   resize            most threads copying   lowest transferIndex   ForwardingNodes seen
   16,384 -> 32,768               5                   1536                  15545
   32,768 -> 65,536               4                      0                  32768
   65,536 -> 131,072              8                      0                  65536
  131,072 -> 262,144              8                      0                 128672
  262,144 -> 524,288              1                      0                 260015
  524,288 -> 1,048,576            0                      0                 524288
1,048,576 -> 2,097,152            4                      0                1048576
2,097,152 -> 4,194,304            2                      0                2097152
4,194,304 -> 8,388,608            1                 458752                3771897
final size 4,000,000, table 8,388,608`,
        },
        {
          type: "list",
          items: [
            "**Up to all eight writers copied the same resize at once** (65,536 to 131,072 and 131,072 to 262,144). A writer that finds a `ForwardingNode` doesn't wait for the resize: it helps finish it.",
            "**`transferIndex` counts down to 0** as stripes are handed out. Seeing 0 means every stripe was already claimed (the remaining work was in progress); 1536 and 458752 are moments caught early in a resize.",
            "**ForwardingNodes fill the old table.** For 32,768 to 65,536 the sampler counted all 32,768 old bins forwarded at once: the copy was complete but the last resizer hadn't published the new table yet. Any `get` arriving at that moment found a `ForwardingNode` and followed it into `nextTable`, so reads were never blocked by the resize.",
            "**A row with 0 threads** is a sample from the very end, when the last resizer has decremented the count and is about to swap the tables.",
            "Sampling with reflection is coarse: it misses short resizes (the first ones took microseconds) and the numbers differ every run. The three runs I did all showed several resizes with 5 to 8 threads copying.",
          ],
        },
        {
          type: "heading",
          text: "A surprise: the final table size depends on timing",
        },
        {
          type: "paragraph",
          text: "The three `ResizeWatch` runs ended with tables of 8,388,608, 4,194,304 and 2,097,152 bins for the same 4 million keys. That looked like a bug in my sampler, so I checked without it:",
        },
        {
          type: "code",
          language: "java",
          title: "LazyResize.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

public class LazyResize {
    static Field table, sizeCtl, cells;

    static String fill(int threads) throws Exception {
        ConcurrentHashMap<Integer, Integer> map = new ConcurrentHashMap<>();
        int per = 4_000_000 / threads;
        CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(threads);
        for (int t = 0; t < threads; t++) {
            int from = t * per;
            new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int i = from; i < from + per; i++) map.put(i, i);
                done.countDown();
            }).start();
        }
        go.countDown();
        done.await();
        Object[] t = (Object[]) table.get(map);
        Object[] c = (Object[]) cells.get(map);
        return String.format("%d thread(s): size=%,d table=%,d sizeCtl=%,d entries per bin=%.2f counterCells=%s",
                threads, map.size(), t.length, (int) sizeCtl.get(map), map.size() / (double) t.length,
                c == null ? "null" : String.valueOf(c.length));
    }

    public static void main(String[] args) throws Exception {
        table = ConcurrentHashMap.class.getDeclaredField("table");
        sizeCtl = ConcurrentHashMap.class.getDeclaredField("sizeCtl");
        cells = ConcurrentHashMap.class.getDeclaredField("counterCells");
        table.setAccessible(true); sizeCtl.setAccessible(true); cells.setAccessible(true);
        System.out.println(fill(1));
        for (int run = 0; run < 4; run++) System.out.println(fill(8));
    }
}`,
        },
        {
          type: "output",
          text: `1 thread(s): size=4,000,000 table=8,388,608 sizeCtl=6,291,456 entries per bin=0.48 counterCells=null
8 thread(s): size=4,000,000 table=8,388,608 sizeCtl=6,291,456 entries per bin=0.48 counterCells=8
8 thread(s): size=4,000,000 table=2,097,152 sizeCtl=1,572,864 entries per bin=1.91 counterCells=8
8 thread(s): size=4,000,000 table=2,097,152 sizeCtl=1,572,864 entries per bin=1.91 counterCells=8
8 thread(s): size=4,000,000 table=8,388,608 sizeCtl=6,291,456 entries per bin=0.48 counterCells=8`,
        },
        {
          type: "paragraph",
          text: "One thread always ends at 8,388,608 bins (0.48 entries per bin). Eight threads ended anywhere between 2,097,152 and 8,388,608, at load factors up to **1.91**, well past the documented 0.75. The explanation is in `addCount`. With contention, the count goes into a `CounterCell`, and then `addCount` returns **without checking for a resize** unless the put landed in a bin that already had at least two nodes (the `check <= 1` early return; the OpenJDK source documents the parameter as \"if <= 1 only check if uncontended\"). Sequential `Integer` keys spread perfectly: no bin ever gets two nodes until the table is badly overfull, so once the counter cells exist, almost nothing triggers the next resize. Keys with ordinary hashes do collide, so a real map catches up; this is an edge case of perfectly spread keys under contention. It's harmless for correctness, slightly slower lookups (about two nodes per bin), and a good reason to **presize** a map you're about to fill from many threads, which the Performance section measures.",
        },
      ],
    },
    {
      title: "Counting Without a Shared Counter: baseCount and CounterCells",
      blocks: [
        {
          type: "paragraph",
          text: "If every `put` did `size++` on one field with CAS, eight writers would fight over one cache line: exactly the contention the table design avoids. So `addCount` first tries one CAS on `baseCount`. If that CAS fails (another thread got there first), the thread switches to a `CounterCell` chosen by its per-thread probe value, the same striping trick as `LongAdder` (lesson 6 covers `LongAdder` itself). `size()` and `mappingCount()` call `sumCount()`, which is `baseCount` plus every cell, read one at a time with no lock.",
        },
        {
          type: "code",
          language: "java",
          title: "SizeEstimate.java",
          code: `import java.lang.reflect.Field;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

public class SizeEstimate {
    public static void main(String[] args) throws Exception {
        Field base = ConcurrentHashMap.class.getDeclaredField("baseCount");
        Field cells = ConcurrentHashMap.class.getDeclaredField("counterCells");
        Field value = Class.forName("java.util.concurrent.ConcurrentHashMap$CounterCell").getDeclaredField("value");
        base.setAccessible(true); cells.setAccessible(true); value.setAccessible(true);

        ConcurrentHashMap<String, Integer> online = new ConcurrentHashMap<>();
        for (int i = 0; i < 1000; i++) online.put("driver-" + i, i);
        System.out.println("before: size=" + online.size() + " baseCount=" + base.get(online) + " counterCells=" + cells.get(online));

        AtomicBoolean stop = new AtomicBoolean();
        Thread[] churn = new Thread[7];
        for (int t = 0; t < churn.length; t++) {
            String key = "temp-" + t;
            churn[t] = new Thread(() -> {                       // each thread: add one key, remove it, forever
                while (!stop.get()) { online.put(key, 1); online.remove(key); }
            });
            churn[t].start();
        }
        // the true size is always between 1000 and 1007
        long min = Long.MAX_VALUE, max = Long.MIN_VALUE, outside = 0, samples = 0;
        long end = System.nanoTime() + 2_000_000_000L;
        while (System.nanoTime() < end) {
            long n = online.mappingCount();
            min = Math.min(min, n); max = Math.max(max, n);
            if (n < 1000 || n > 1007) outside++;
            samples++;
        }
        stop.set(true);
        for (Thread t : churn) t.join();
        System.out.printf("%,d samples of mappingCount(): min %d, max %d, outside [1000, 1007]: %,d%n", samples, min, max, outside);

        Object[] cs = (Object[]) cells.get(online);
        StringBuilder parts = new StringBuilder();
        long sum = (long) base.get(online);
        for (Object c : cs) { if (c == null) { parts.append("null "); continue; } long v = (long) value.get(c); sum += v; parts.append(v).append(' '); }
        System.out.println("after: size=" + online.size() + " baseCount=" + base.get(online) + " cells=[" + parts.toString().trim()
                + "] base+cells=" + sum);
    }
}`,
        },
        {
          type: "output",
          text: `before: size=1000 baseCount=1000 counterCells=null
17,240,042 samples of mappingCount(): min 1000, max 1007, outside [1000, 1007]: 0
after: size=1000 baseCount=1001 cells=[0 -7 5 4 -1 -1 -1 null] base+cells=1000`,
        },
        {
          type: "list",
          items: [
            "**The cells hold negative numbers.** `[0 -7 5 4 -1 -1 -1 null]`: a thread's `put` may be counted in one cell and its `remove` in another (a thread moves to a new cell when it collides), so individual cells are meaningless. Only the sum is, and it's exactly 1000 when the writers are quiet. One cell is still `null`: cells are created lazily, on first use.",
            "**During the churn, all 7 to 17 million samples per run were within [1000, 1007]**, the range the true size could be in. I half-expected to catch an impossible value from reading cells at different moments and didn't, in seven runs. The guarantee is weaker than my result, though: the Javadoc calls the value an estimate, because the sum is not an atomic snapshot of all the cells.",
            "**`size()` returns `int` and caps at `Integer.MAX_VALUE`; `mappingCount()` returns the same estimate as a `long`.** For a map that might exceed 2^31 entries, `mappingCount()` is the one to use.",
            "**Neither is a basis for decisions.** `if (map.size() < LIMIT) map.put(k, v)` is a check-then-act race even with an exact count: by the time `put` runs, other threads may have added entries. The next lesson deals with that kind of code.",
          ],
        },
      ],
    },
    {
      title: "Why null Is Banned",
      blocks: [
        {
          type: "paragraph",
          text: "In a `HashMap`, `get(k) == null` can mean \"no mapping\" or \"mapped to null\", and code tells them apart with `containsKey`. In a concurrent map that's two calls, and the map can change between them. Doug Lea's reasoning for banning `null` was exactly this: a concurrent map can't offer an atomic way to ask both questions, so `get` returning `null` must mean only one thing. I measured the race on a map that does allow nulls:",
        },
        {
          type: "code",
          language: "java",
          title: "NullAmbiguity.java",
          code: `import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

public class NullAmbiguity {
    enum Status { ON_TRIP, ON_BREAK }

    public static void main(String[] args) throws Exception {
        Map<String, Integer> chm = new ConcurrentHashMap<>();
        for (Runnable r : new Runnable[] {
                () -> chm.put(null, 1), () -> chm.put("asha", null), () -> chm.get(null), () -> chm.containsKey(null)}) {
            try { r.run(); } catch (NullPointerException e) { System.out.println("NullPointerException " + e.getMessage()); }
        }

        // A map that allows null values, where null is supposed to mean "logged in, on a break"
        Map<String, Status> drivers = Collections.synchronizedMap(new HashMap<>());
        AtomicBoolean stop = new AtomicBoolean();
        Thread logins = new Thread(() -> {
            while (!stop.get()) { drivers.put("ravi", Status.ON_TRIP); drivers.remove("ravi"); }   // log in, log out
        });
        logins.start();
        long checks = 0, wrong = 0;
        long end = System.nanoTime() + 1_000_000_000L;
        while (System.nanoTime() < end) {
            if (drivers.containsKey("ravi")) {              // two calls, each one synchronized on its own
                Status s = drivers.get("ravi");
                checks++;
                if (s == null) wrong++;                     // "on a break"? No: he logged out in between
            }
        }
        stop.set(true);
        logins.join();
        System.out.printf("containsKey + get: %,d checks, %,d times a logged-out driver was reported ON_BREAK%n", checks, wrong);

        // With ConcurrentHashMap: one call, null can only mean absent, and "on break" needs a real value
        Map<String, Status> safe = new ConcurrentHashMap<>();
        safe.put("ravi", Status.ON_BREAK);
        Status s = safe.get("ravi");
        System.out.println("single get: " + (s == null ? "not logged in" : s));
    }
}`,
        },
        {
          type: "output",
          text: `NullPointerException null
NullPointerException null
NullPointerException Cannot invoke "Object.hashCode()" because "key" is null
NullPointerException Cannot invoke "Object.hashCode()" because "key" is null
containsKey + get: 1,080,004 checks, 26,434 times a logged-out driver was reported ON_BREAK
single get: ON_BREAK`,
        },
        {
          type: "list",
          items: [
            "**All four `null` uses throw `NullPointerException`.** `put` throws the message-less NPE from the bytecode shown earlier (offsets 0 to 15); `get(null)` and `containsKey(null)` fail calling `hashCode()` on the key, so the JDK 21 helpful message names it.",
            "**`containsKey` then `get` misreported Ravi 26,434 times in one second** (11,905 to 26,434 across four runs): `containsKey` saw him logged in, the other thread logged him out, and `get` returned `null`, which the code read as \"on a break\". Each call was synchronized; the pair wasn't.",
            "**The fix isn't a lock around both calls; it's not encoding meaning in `null`.** With `ConcurrentHashMap`, one `get` answers the question, and \"on a break\" is a real value (`Status.ON_BREAK`). If you need \"present but empty\", use a sentinel value, an enum, or `Optional` as the value type.",
          ],
        },
      ],
    },
    {
      title: "Weakly Consistent Iterators",
      blocks: [
        {
          type: "paragraph",
          text: "Iterators: Fail-Fast and Fail-Safe already showed that a `ConcurrentHashMap` iterator never throws `ConcurrentModificationException`. Knowing the table layout explains which changes an iterator sees. The iterator (a `Traverser`) walks the bins in index order and reads each bin when it gets there. So a change to a bin it hasn't reached yet is visible, and a change to a bin it has passed isn't. With `Integer` keys 1 to 5 in a 16-bin table, key `i` sits in bin `i`, which makes this deterministic:",
        },
        {
          type: "code",
          language: "java",
          title: "WeakIterator.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

public class WeakIterator {
    public static void main(String[] args) throws Exception {
        // Integer keys 1..5 sit in bins 1..5 of a 16-bin table, so bin order is key order
        ConcurrentHashMap<Integer, String> trips = new ConcurrentHashMap<>();
        for (int i = 1; i <= 5; i++) trips.put(i, "t" + i);
        List<String> seen = new ArrayList<>();
        for (Map.Entry<Integer, String> e : trips.entrySet()) {
            if (e.getKey() == 2) {
                trips.put(0, "behind");       // bin 0: the iterator has already passed it
                trips.put(14, "ahead");       // bin 14: not reached yet
                trips.put(4, "t4-updated");   // existing key ahead: new value
                trips.remove(5);              // removed before the iterator gets there
            }
            seen.add(e.getKey() + "=" + e.getValue());
        }
        System.out.println("iterator saw: " + seen);
        System.out.println("map now:      " + trips);

        // Concurrent writer: how many of its keys does one pass see?
        for (int run = 1; run <= 3; run++) {
            ConcurrentHashMap<Integer, Integer> live = new ConcurrentHashMap<>();
            for (int i = 0; i < 200_000; i++) live.put(i, i);
            CountDownLatch started = new CountDownLatch(1);
            Thread writer = new Thread(() -> {
                started.countDown();
                for (int i = 200_000; i < 300_000; i++) live.put(i, i);
            });
            writer.start();
            started.await();
            long total = 0, fresh = 0;
            for (Integer k : live.keySet()) { total++; if (k >= 200_000) fresh++; }
            writer.join();
            System.out.printf("run %d: one pass saw %,d keys, %,d of them added during the pass (map ends with %,d)%n",
                    run, total, fresh, live.size());
        }
    }
}`,
        },
        {
          type: "output",
          text: `iterator saw: [1=t1, 2=t2, 3=t3, 4=t4-updated, 14=ahead]
map now:      {0=behind, 1=t1, 2=t2, 3=t3, 4=t4-updated, 14=ahead}
run 1: one pass saw 254,845 keys, 54,845 of them added during the pass (map ends with 300,000)
run 2: one pass saw 293,786 keys, 93,786 of them added during the pass (map ends with 300,000)
run 3: one pass saw 300,000 keys, 100,000 of them added during the pass (map ends with 300,000)`,
        },
        {
          type: "list",
          items: [
            "**At key 2 the loop made four changes.** Key 0 (bin 0, already passed) was **not** seen. Key 14 (bin 14, ahead) **was** seen. Key 4's new value was seen. Key 5, removed before the iterator reached bin 5, was not returned. No exception.",
            "**With a concurrent writer, one pass saw between 49,862 and 100,000 of the 100,000 keys added during it** over nine passes, different in each run. Each key that was present for the whole pass was seen exactly once; the new ones were a matter of timing.",
            "**If a resize happens during the walk**, the iterator meets `ForwardingNode`s, follows them into `nextTable` and comes back (the `TableStack` inner class in the `javap` list remembers where), so it still returns every key present throughout exactly once.",
            "**Weakly consistent is not a snapshot.** A loop that sums values while other threads write sees some values before and some after their updates. Example 3 shows what that does to a total.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `waitingRiders.put(\"SALT-LAKE\", 12)` on a map with 16 bins, while another thread is in the middle of `compute(\"SALT-LAKE\", ...)` on the same key, as in `BinLock`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Reject nulls.** Key and value are both non-null, so carry on.",
            "**Hash.** `\"SALT-LAKE\".hashCode()`, then `spread`: XOR in the high 16 bits and clear the sign bit.",
            "**Read the table.** `table` is a volatile read; it's not `null`, so no `initTable`. The index is `(16 - 1) & hash`.",
            "**Read the bin.** `tabAt(tab, i)` does an acquire read and finds the existing `Node` for `SALT-LAKE` (not `null`, so no CAS). Its hash isn't `MOVED`, so no resize is in progress.",
            "**Lock the bin.** `monitorenter` on that first node. The `compute` thread holds this monitor, so this thread goes `BLOCKED (on object monitor)`, as in the `same-key` thread dump. Writers to other bins and every reader carry on meanwhile.",
            "**Re-check after locking.** When `compute` finishes and releases the monitor, this thread acquires it and reads `tabAt(tab, i)` again. If the first node is still the one it locked, carry on; if a resize or removal replaced it, unlock and start again from step 3.",
            "**Find the key.** Walk the chain comparing the cached hash, then `==` or `equals`. `SALT-LAKE` is the first node.",
            "**Write the value.** `e.val = 12`, a volatile write, so the next `get` from any thread sees 12. The old value is returned.",
            "**Unlock and count.** `monitorexit`. Since this was a replacement, not a new node, `addCount` isn't called and no resize check happens.",
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
          title: "ChmTour.java",
          code: `import java.util.Enumeration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class ChmTour {
    public static void main(String[] args) {
        // 1. create: default, sized for an expected number of entries, from another map
        ConcurrentMap<String, Integer> waiting = new ConcurrentHashMap<>();
        ConcurrentHashMap<Long, String> drivers = new ConcurrentHashMap<>(10_000);
        ConcurrentHashMap<String, Integer> copy = new ConcurrentHashMap<>(Map.of("HOWRAH", 2));

        // 2. the Map basics, all thread-safe
        waiting.put("SALT-LAKE", 12);
        waiting.put("NEW-TOWN", 4);
        System.out.println(waiting.get("SALT-LAKE") + " " + waiting.getOrDefault("GARIA", 0) + " "
                + waiting.containsKey("NEW-TOWN") + " " + waiting.remove("NEW-TOWN") + " " + waiting);

        // 3. no nulls, keys or values
        try { waiting.put("GARIA", null); } catch (NullPointerException e) { System.out.println("null value -> NPE"); }

        // 4. size as an int and as a long estimate
        drivers.put(42L, "Ravi");
        System.out.println(drivers.size() + " " + drivers.mappingCount() + " " + copy);

        // 5. iteration is weakly consistent: no ConcurrentModificationException
        for (Map.Entry<String, Integer> e : waiting.entrySet()) waiting.put(e.getKey() + "-EXTRA", 0);
        System.out.println(waiting.keySet().stream().sorted().toList());

        // 6. Hashtable-era methods it still has
        Enumeration<String> keys = ((ConcurrentHashMap<String, Integer>) waiting).keys();
        System.out.println(keys.hasMoreElements() + " " + ((ConcurrentHashMap<String, Integer>) waiting).contains(0));
    }
}`,
        },
        {
          type: "output",
          text: `12 0 true 4 {SALT-LAKE=12}
null value -> NPE
1 1 {HOWRAH=2}
[SALT-LAKE, SALT-LAKE-EXTRA]
true true`,
        },
        {
          type: "paragraph",
          text: "Declare the variable as `ConcurrentMap` or `ConcurrentHashMap`, not `Map`: the type tells the next reader the map is shared, and `ConcurrentHashMap` has methods `Map` doesn't (`mappingCount`, `keySet(V)`, bulk operations). The loop in step 5 added `SALT-LAKE-EXTRA` and didn't go on to add `SALT-LAKE-EXTRA-EXTRA`, because the new key landed in a bin the iterator had already passed; that's deterministic for these two strings on JDK 21, not something to rely on. `keys()`, `elements()` and `contains(value)` are leftovers from `Hashtable` compatibility; `contains` means `containsValue`, a full scan.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: The Java 7 segments that are still there",
        },
        {
          type: "code",
          language: "java",
          title: "LegacySegments.java",
          code: `import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

public class LegacySegments {
    public static void main(String[] args) throws Exception {
        Field sizeCtl = ConcurrentHashMap.class.getDeclaredField("sizeCtl");
        sizeCtl.setAccessible(true);
        System.out.println("CHM(16, 0.75f, 1)   sizeCtl " + sizeCtl.get(new ConcurrentHashMap<>(16, 0.75f, 1)));
        System.out.println("CHM(16, 0.75f, 64)  sizeCtl " + sizeCtl.get(new ConcurrentHashMap<>(16, 0.75f, 64)));

        ConcurrentHashMap<String, Integer> m = new ConcurrentHashMap<>();
        m.put("SALT-LAKE", 1);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) { out.writeObject(m); }
        String s = new String(bytes.toByteArray(), StandardCharsets.ISO_8859_1);
        System.out.println("serialized form mentions Segment: " + s.contains("ConcurrentHashMap$Segment")
                + ", segmentMask: " + s.contains("segmentMask") + ", " + bytes.size() + " bytes");
    }
}`,
        },
        {
          type: "output",
          text: `CHM(16, 0.75f, 1)   sizeCtl 32
CHM(16, 0.75f, 64)  sizeCtl 128
serialized form mentions Segment: true, segmentMask: true, 1091 bytes`,
        },
        {
          type: "list",
          items: [
            "**`concurrencyLevel` no longer means \"number of segments\".** It's only a sizing hint: the constructor uses `max(initialCapacity, concurrencyLevel)` as the expected size, so 64 gave a 128-bin table and 1 changed nothing. In Java 7, `new ConcurrentHashMap<>(16, 0.75f, 64)` would have created 64 segments, each with its own lock.",
            "**The serialized form still contains `ConcurrentHashMap$Segment` objects and `segmentMask`.** `writeObject` writes 16 dummy segments so that a map serialized by Java 8+ can be read by Java 7 and the other way round. `javap` shows what's left of the class: `Segment extends ReentrantLock` with a single `loadFactor` field, used for nothing else.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: What new ConcurrentHashMap<>(n) really allocates",
        },
        {
          type: "code",
          language: "java",
          title: "Sizing.java",
          code: `import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;

public class Sizing {
    static Field chmTable, hmTable;

    static int chmLength(ConcurrentHashMap<?, ?> m) throws IllegalAccessException {
        Object[] t = (Object[]) chmTable.get(m);
        return t == null ? 0 : t.length;
    }
    static int hmLength(HashMap<?, ?> m) throws IllegalAccessException {
        Object[] t = (Object[]) hmTable.get(m);
        return t == null ? 0 : t.length;
    }

    public static void main(String[] args) throws Exception {
        chmTable = ConcurrentHashMap.class.getDeclaredField("table");
        hmTable = HashMap.class.getDeclaredField("table");
        chmTable.setAccessible(true);
        hmTable.setAccessible(true);
        System.out.println("       n | new CHM(n): table, resized? | new HashMap(n): table, resized? | HashMap.newHashMap(n): table, resized?");
        for (int n : new int[] {12, 16, 100, 1_000, 10_000}) {
            ConcurrentHashMap<Integer, Integer> chm = new ConcurrentHashMap<>(n);
            HashMap<Integer, Integer> hm = new HashMap<>(n), hm2 = HashMap.newHashMap(n);
            chm.put(-1, 0); hm.put(-1, 0); hm2.put(-1, 0);                 // allocate the tables
            int c0 = chmLength(chm), h0 = hmLength(hm), n0 = hmLength(hm2);
            for (int i = 1; i < n; i++) { chm.put(i, i); hm.put(i, i); hm2.put(i, i); }
            System.out.printf("%8d | %6d  %-19s| %6d  %-23s| %6d  %s%n", n, c0, chmLength(chm) != c0 ? "yes -> " + chmLength(chm) : "no",
                    h0, hmLength(hm) != h0 ? "yes -> " + hmLength(hm) : "no", n0, hmLength(hm2) != n0 ? "yes" : "no");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED --add-opens java.base/java.util=ALL-UNNAMED Sizing",
        },
        {
          type: "output",
          text: `       n | new CHM(n): table, resized? | new HashMap(n): table, resized? | HashMap.newHashMap(n): table, resized?
      12 |     32  no                 |     16  no                     |     16  no
      16 |     32  no                 |     16  yes -> 32              |     32  no
     100 |    256  no                 |    128  yes -> 256             |    256  no
    1000 |   2048  no                 |   1024  yes -> 2048            |   2048  no
   10000 |  16384  no                 |  16384  no                     |  16384  no`,
        },
        {
          type: "list",
          items: [
            "**`new ConcurrentHashMap<>(n)` never resized while adding `n` entries**, because its argument means \"expected number of mappings\" (since Java 8).",
            "**`new HashMap<>(n)` resized for 16, 100 and 1000**, because its argument is a table capacity, and 16 entries don't fit in 16 slots at load factor 0.75. `HashMap.newHashMap(n)` (Java 19) is the `HashMap` equivalent of the concurrent constructor.",
            "**12 expected entries got 32 bins**, where `HashMap.newHashMap(12)` used 16. That's not waste: `ConcurrentHashMap` resizes when the count **reaches** 75% (the 12th put into 16 bins, as `ChmPeek` showed), while `HashMap` resizes when it **passes** it, so 12 entries really do need 32 bins here. The constructor's `1 + n / 0.75` accounts for that.",
          ],
        },
        {
          type: "heading",
          text: "Example 3: A total that is never quite right",
        },
        {
          type: "code",
          language: "java",
          title: "WalletTotals.java",
          code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;

public class WalletTotals {
    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<Integer, Long> walletPaise = new ConcurrentHashMap<>();
        for (int rider = 0; rider < 1_000; rider++) walletPaise.put(rider, 10_000L);   // Rs 100 each, Rs 1,00,000 in total

        AtomicBoolean stop = new AtomicBoolean();
        Thread transfers = new Thread(() -> {
            ThreadLocalRandom r = ThreadLocalRandom.current();
            while (!stop.get()) {
                int from = r.nextInt(1_000), to = r.nextInt(1_000);
                walletPaise.merge(from, -500L, Long::sum);     // each call is atomic on its own key...
                walletPaise.merge(to, 500L, Long::sum);        // ...but the pair is not one operation
            }
        });
        transfers.start();
        for (int report = 1; report <= 5; report++) {
            long total = 0;
            for (long paise : walletPaise.values()) total += paise;
            long viaReduce = walletPaise.reduceValuesToLong(Long.MAX_VALUE, Long::longValue, 0L, Long::sum);
            System.out.printf("report %d: sum by iteration %,d   by reduce %,d   (no money is created or lost: 10,000,000)%n",
                    report, total, viaReduce);
            Thread.sleep(50);
        }
        stop.set(true);
        transfers.join();
        long end = walletPaise.reduceValuesToLong(Long.MAX_VALUE, Long::longValue, 0L, Long::sum);
        System.out.printf("after the transfers stop: %,d%n", end);
    }
}`,
        },
        {
          type: "output",
          text: `report 1: sum by iteration 10,000,000   by reduce 10,009,000   (no money is created or lost: 10,000,000)
report 2: sum by iteration 9,992,500   by reduce 10,007,500   (no money is created or lost: 10,000,000)
report 3: sum by iteration 10,007,500   by reduce 9,992,000   (no money is created or lost: 10,000,000)
report 4: sum by iteration 10,007,000   by reduce 9,994,000   (no money is created or lost: 10,000,000)
report 5: sum by iteration 10,002,000   by reduce 10,024,000   (no money is created or lost: 10,000,000)
after the transfers stop: 10,000,000`,
        },
        {
          type: "list",
          items: [
            "**1,000 rider wallets of Rs 100 each always hold Rs 1,00,000 in total**, apart from at most one half-finished transfer of 500 paise. Yet the reports were off by up to 24,000 paise, in both directions, and the iteration and the `reduce` gave different answers 50 microseconds apart.",
            "**One half-done transfer can't explain 24,000 paise.** The weakly consistent walk can: it reads wallet 10 before a transfer and wallet 900 after the next one, so the sum mixes many moments. Each value it reads is real; the total corresponds to no moment at all.",
            "**`ConcurrentHashMap` makes each key atomic, never a group of keys.** A total that must balance needs the two updates and the read to be one operation: a lock around all of them, a single key holding the whole state, or (in a real system) a database transaction, which lesson 23 covers. The next lesson shows which multi-step operations on one key the map can make atomic.",
          ],
        },
      ],
    },
    {
      title: "When to Use What",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Avoid"],
          rows: [
            ["A map shared by threads, read and written concurrently", "`ConcurrentHashMap`", "`HashMap`, even \"mostly read\""],
            ["Many readers, occasional writers", "`ConcurrentHashMap` (reads take no lock)", "`Hashtable`, `synchronizedMap`: readers queue too"],
            ["Several keys must change together", "A lock or a single immutable value replaced atomically; a database transaction across servers", "Several separate `put`s and hoping"],
            ["Iterating while others write", "`ConcurrentHashMap`, accepting a weakly consistent view", "`synchronizedMap` without holding its lock during the loop"],
            ["A map written once at startup, then only read", "An immutable `Map.copyOf` published safely", "Paying for concurrency you don't need"],
            ["Sorted keys with concurrency", "`ConcurrentSkipListMap` (lesson 14)", "`Collections.synchronizedSortedMap` on a hot path"],
            ["Values meaning \"present but empty\"", "A sentinel, enum or `Optional` value", "`null` values with `containsKey` checks"],
            ["Exact size for a decision", "A counter updated in the same atomic step as the map", "`size()` as a guard"],
            ["Legacy code that needs `null` and has light contention", "`Collections.synchronizedMap(new HashMap<>())`, iterating inside `synchronized (map)`", "`Hashtable`"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Sharing a HashMap because \"only one thread writes\"",
        },
        {
          type: "paragraph",
          text: "One writer and several readers is still a data race: readers can see a table mid-resize, a node whose fields aren't visible yet, or a chain being rewritten, and the HashMap race above corrupted the map with writers alone. Use `ConcurrentHashMap`, or publish an immutable copy through a `volatile` field.",
        },
        {
          type: "heading",
          text: "Believing Java 8 fixed the HashMap infinite loop",
        },
        {
          type: "paragraph",
          text: "It fixed one loop (chain reversal in resize). On JDK 21 I still got a thread spinning forever in `TreeNode.root()` and `ClassCastException`s from `treeify`. A concurrent `HashMap` can still hang a pod at 100% CPU.",
        },
        {
          type: "heading",
          text: "Replacing HashMap with Hashtable or synchronizedMap and calling it fixed",
        },
        {
          type: "paragraph",
          text: "It's correct for single calls, but every call, `get` included, takes one lock. At 8 threads the one-lock maps ran at 4 to 5 million operations a second against 17 to 45 million for `ConcurrentHashMap`, and JFR showed readers queueing in `Hashtable.get`. It also leaves compound operations racy.",
        },
        {
          type: "heading",
          text: "Iterating a synchronizedMap without holding its lock",
        },
        {
          type: "paragraph",
          text: "`Collections.synchronizedMap` synchronizes each call, not a loop. Its Javadoc requires `synchronized (map) { for (...) ... }` around iteration; without it, the loop can throw `ConcurrentModificationException` or read a corrupted chain. `ConcurrentHashMap` doesn't need this.",
        },
        {
          type: "heading",
          text: "Storing null to mean something",
        },
        {
          type: "paragraph",
          text: "`ConcurrentHashMap` throws `NullPointerException`; code ported from `HashMap` that stored `null` values breaks at run time. The fix is a real value for the state, not a lock around `containsKey` and `get`.",
        },
        {
          type: "heading",
          text: "Trusting size(), isEmpty() or an iteration total for decisions",
        },
        {
          type: "paragraph",
          text: "They're accurate only when no thread is writing. A sum computed by iterating mixes moments (24,000 paise off in `WalletTotals`). Keep counters that must be exact in the same atomic update as the data.",
        },
        {
          type: "heading",
          text: "Using concurrencyLevel to tune parallelism",
        },
        {
          type: "paragraph",
          text: "Since Java 8 it only affects the initial size. Parallelism comes from the number of bins, which grows with the map.",
        },
        {
          type: "heading",
          text: "Expecting new ConcurrentHashMap<>(n) to behave like new HashMap<>(n)",
        },
        {
          type: "paragraph",
          text: "The concurrent constructor takes an expected size (`16` gave 32 bins, enough for 16 entries); the `HashMap` one takes a capacity and resized at 16, 100 and 1000 entries. Pass the number of entries you expect to `ConcurrentHashMap`, and use `HashMap.newHashMap(n)` for `HashMap`.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Make every map that more than one thread touches a `ConcurrentHashMap` (or an immutable map published once), and declare it as `ConcurrentMap` or `ConcurrentHashMap` so the intent is visible.",
            "Never share a plain `HashMap` between threads, including \"one writer, many readers\" designs.",
            "Prefer `ConcurrentHashMap` to `Hashtable` and `synchronizedMap` for anything with real concurrency; keep the latter two for legacy code that needs `null` or has trivial contention.",
            "Presize maps you're about to fill from many threads: `new ConcurrentHashMap<>(expectedEntries)`.",
            "Don't store `null`; model absent, empty and special states with real values.",
            "Treat `size()`, `isEmpty()`, iteration and bulk-operation results as estimates while writers are active.",
            "Remember that the map is atomic per key, per call. Multi-key invariants need something else, and multi-step logic on one key needs the atomic methods of the next lesson.",
            "Keep keys with good, stable `hashCode`s (immutable records are ideal): one bin is one lock, so a pathological hash turns the map back into a single lock.",
            "When a service is slow or hot, look for `ConcurrentHashMap$Node` in thread dumps and `jdk.JavaMonitorEnter` events in JFR: they show bin contention directly.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The scaling table above is the main result: with 8 threads, `ConcurrentHashMap` did 4 to 9 times the work of the one-lock maps, and the gap grows with the share of reads. Two more measurements: what presizing saves when many threads fill a map, and what the per-bin design costs in the single-threaded case.",
        },
        {
          type: "code",
          language: "java",
          title: "Presize.java",
          code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.function.Supplier;

public class Presize {
    // 8 threads insert 4M distinct random-looking keys; best of 5
    static long fill(Supplier<ConcurrentHashMap<Long, Long>> make) throws InterruptedException {
        long best = Long.MAX_VALUE;
        for (int rep = 0; rep < 5; rep++) {
            ConcurrentHashMap<Long, Long> map = make.get();
            CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(8);
            for (int t = 0; t < 8; t++) {
                long from = t * 500_000L;
                new Thread(() -> {
                    try { go.await(); } catch (InterruptedException e) { return; }
                    for (long i = from; i < from + 500_000; i++) map.put(i * 0x9E3779B97F4A7C15L, i);
                    done.countDown();
                }).start();
            }
            long start = System.nanoTime();
            go.countDown();
            done.await();
            best = Math.min(best, System.nanoTime() - start);
            if (map.size() != 4_000_000) throw new AssertionError(map.size());
        }
        return best / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        System.out.println("default CHM()          " + fill(ConcurrentHashMap::new) + " ms");
        System.out.println("presized CHM(4M)       " + fill(() -> new ConcurrentHashMap<>(4_000_000)) + " ms");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xms3g -Xmx3g Presize",
        },
        {
          type: "output",
          text: `default CHM()          771 ms
presized CHM(4M)       577 ms`,
        },
        {
          type: "list",
          items: [
            "**Presizing saved about a quarter of the time**: 771 against 577 ms, and 760 against 524 and 953 against 758 in two more runs. The default map resized from 16 bins to 8,388,608 (19 resizes), each one allocating a new table and copying every bin under its lock; the presized map allocated its 8,388,608 bins once.",
            "The keys here are multiplied by a large odd constant, so they collide like real IDs; with sequential keys the lazy-resize effect above would have muddied the comparison.",
            "**Single-threaded, `ConcurrentHashMap` is no faster than `HashMap` under a lock.** In `MapScaling` its 1-thread numbers (9.7 to 10.0 million operations a second in the quiet runs) were close to `Hashtable` and `synchronizedMap` (8.0 to 11.9). The volatile reads and the CAS cost a few nanoseconds; uncontended monitors cost about the same.",
            "Memory per entry is the same as `HashMap` (a 32-byte `Node` with compressed oops); the extra fields are per map, plus counter cells only under contention.",
            "All timings are best-of-5 `System.nanoTime` measurements on one 8-core machine shared with other benchmarks, not JMH. I ran each at least three times and quote ratios.",
          ],
        },
      ],
    },
    {
      title: "ConcurrentHashMap in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing dispatch service in Kolkata keeps the last known location of every online driver in memory, `Map<Long, Location> lastKnown = new HashMap<>()`, written by GPS-ingest consumer threads and read by the matching threads that pick a driver for each ride request. It worked in testing with one consumer. After the team scaled ingest to six consumer threads for the evening peak, three things appeared: the \"drivers online\" dashboard (which reads `lastKnown.size()`) showed more drivers than had logged in, matching occasionally logged \"driver not found\" for drivers who were pinging every few seconds, and once a week one pod went to 100% CPU and stopped processing pings until it was restarted. The first fix someone shipped was `Collections.synchronizedMap`. I rebuilt the service's map usage:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverLocations.java",
          code: `import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicIntegerArray;
import java.util.concurrent.atomic.AtomicLong;

public class DriverLocations {
    record Location(double lat, double lng, long atMs) {}

    // 6 GPS-ingest threads: drivers log in over the shift, then keep sending pings.
    // 2 matching threads look drivers up the whole time.
    static void shift(String label, Map<Long, Location> lastKnown) throws InterruptedException {
        int drivers = 60_000, pingsPerThread = 400_000;
        CountDownLatch go = new CountDownLatch(1);
        AtomicBoolean ingestDone = new AtomicBoolean();
        AtomicLong lookups = new AtomicLong(), notFound = new AtomicLong();
        AtomicIntegerArray online = new AtomicIntegerArray(drivers);          // 1 once a driver's first ping is stored
        Thread[] ingest = new Thread[6];
        for (int t = 0; t < ingest.length; t++) {
            int lane = t;
            ingest[t] = new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                ThreadLocalRandom r = ThreadLocalRandom.current();
                for (int i = 0; i < pingsPerThread; i++) {
                    long seen = Math.min(drivers, (long) i * drivers / (pingsPerThread / 2) + 1);   // logins ramp up
                    long id = r.nextLong(seen) / 6 * 6 + lane;                                       // each lane owns its drivers
                    if (id >= drivers) id -= 6;
                    lastKnown.put(id, new Location(22.5 + r.nextDouble() / 10, 88.4 + r.nextDouble() / 10, i));
                    online.set((int) id, 1);
                }
            }, "gps-ingest-" + t);
            ingest[t].setDaemon(true);
        }
        Thread[] matchers = new Thread[2];
        for (int t = 0; t < matchers.length; t++) {
            matchers[t] = new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                ThreadLocalRandom r = ThreadLocalRandom.current();
                while (!ingestDone.get()) {
                    int id = r.nextInt(drivers);
                    if (online.get(id) == 1) {                                       // he has pinged before
                        lookups.incrementAndGet();
                        if (lastKnown.get((long) id) == null) notFound.incrementAndGet();   // "driver not found"
                    }
                }
            }, "matcher-" + t);
            matchers[t].setDaemon(true);
        }
        for (Thread t : ingest) t.start();
        for (Thread t : matchers) t.start();
        long start = System.nanoTime();
        go.countDown();
        for (Thread t : ingest) t.join(10_000);
        long ms = (System.nanoTime() - start) / 1_000_000;
        ingestDone.set(true);
        for (Thread t : ingest) {
            if (t.isAlive()) {
                StackTraceElement top = t.getStackTrace()[0];
                System.out.printf("%-17s HUNG: %s still RUNNABLE after 10 s in %s.%s%n", label, t.getName(),
                        top.getClassName(), top.getMethodName());
                return;
            }
        }
        for (Thread t : matchers) t.join();
        long missing = 0;
        for (long id = 0; id < drivers; id++) if (!lastKnown.containsKey(id)) missing++;
        System.out.printf("%-17s %,5d ms  size()=%,7d (real drivers %,d, missing at the end %d)  online drivers not found %,d of %,d lookups%n",
                label, ms, lastKnown.size(), drivers, missing, notFound.get(), lookups.get());
    }

    public static void main(String[] args) throws Exception {
        String which = args.length > 0 ? args[0] : "all";
        if (which.equals("all") || which.equals("hashmap")) shift("HashMap", new HashMap<>());
        if (which.equals("all") || which.equals("sync")) shift("synchronizedMap", Collections.synchronizedMap(new HashMap<>()));
        if (which.equals("all") || which.equals("chm")) shift("ConcurrentHashMap", new ConcurrentHashMap<>());
    }
}`,
        },
        {
          type: "output",
          text: `HashMap             344 ms  size()=105,257 (real drivers 60,000, missing at the end 0)  online drivers not found 269,375 of 2,517,576 lookups
synchronizedMap   1,003 ms  size()= 60,000 (real drivers 60,000, missing at the end 0)  online drivers not found 0 of 1,290,248 lookups
ConcurrentHashMap   326 ms  size()= 60,000 (real drivers 60,000, missing at the end 0)  online drivers not found 0 of 951,410 lookups`,
        },
        {
          type: "list",
          items: [
            "**The dashboard bug, reproduced.** With `HashMap`, `size()` reported **105,257** drivers online for 60,000 real drivers (70,931 to 105,257 over five runs). Each driver is written by only one consumer here, so this isn't two threads adding the same key: a ping written into the old table during a concurrent resize is dropped, the driver's next ping finds no entry and adds him again, and `size` counts him twice.",
            "**\"Driver not found\", reproduced.** Matching threads looked up drivers who had already pinged, and `HashMap` returned `null` **269,375 times out of 2.5 million** lookups in this run (3,286 to 269,375 over five runs). By the end of the shift every driver had been re-added, so a check at the end (\"missing at the end 0\") would have found nothing wrong. The damage happens during the shift.",
            "**The 100% CPU pod** is the infinite loop measured earlier in `HashMapRace`: threads spinning in `HashMap$TreeNode.root()` or `treeify`. This program's watchdog prints `HUNG` if it happens; it didn't in these five runs, and it happened twice in 38 runs of the simpler program. A thread dump of a stuck pod shows `RUNNABLE` threads with `HashMap$TreeNode` on top of the stack, which is the signature to look for.",
            "**`synchronizedMap` fixed correctness and cost throughput.** 0 drivers lost, an exact `size()`, but the six ingest threads took 750 to 1,071 ms instead of about 230 to 405, and the matchers completed fewer lookups in the time (the lock is shared with them). At peak that's ingest lag: locations get stale.",
            "**`ConcurrentHashMap` was correct and as fast as the broken `HashMap`**: exactly 60,000 drivers, 0 lookups that missed an online driver, 228 to 405 ms. A pure type change, `new ConcurrentHashMap<>()`, plus presizing to the expected peak of online drivers.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from it:",
        },
        {
          type: "list",
          items: [
            "Shared mutable maps are found by searching for `new HashMap` in fields of singletons (Spring beans, static fields, caches) and checking which threads touch them.",
            "Concurrent `HashMap` corruption is mostly silent. The symptoms were a too-high count, intermittent misses that healed themselves, and a rare hang: none of them points at the map unless you know the pattern.",
            "End-of-run checks miss it. Measure during the load, as the matcher threads did here.",
            "Correct and scalable aren't the same fix. `synchronizedMap` stopped the corruption and tripled ingest time; `ConcurrentHashMap` stopped it without the cost.",
            "Thread dumps diagnose the hang in seconds: `RUNNABLE` threads with `java.util.HashMap$TreeNode.root` or `treeify` at the top, burning CPU, is a shared `HashMap`.",
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
              question: "What is ConcurrentHashMap and why use it instead of HashMap?",
              answer:
                "A thread-safe `Map` implementation in `java.util.concurrent`. A `HashMap` shared between threads is a data race: in my test with four writers, every run lost keys (often half of them), `size()` was wrong, some runs threw `ClassCastException` from inside `HashMap`, and two runs out of 38 hung in an infinite loop. `ConcurrentHashMap` gave exactly 100,000 entries every time, and it scales because readers take no lock and writers lock only one bin.",
            },
            {
              question: "What's the difference between Hashtable, Collections.synchronizedMap and ConcurrentHashMap?",
              answer:
                "`Hashtable` and `synchronizedMap` use one lock for every call, reads included; `ConcurrentHashMap` uses CAS for empty bins, a lock on the first node of a bin for other writes, and no lock for reads. At 8 threads I measured 4 to 5 million operations a second for the one-lock maps against 17 to 45 million for `ConcurrentHashMap`. Also: `synchronizedMap` allows `null` if the wrapped map does, its iterators are fail-fast and need external locking, while `ConcurrentHashMap` bans `null` and has weakly consistent iterators.",
            },
            {
              question: "Does ConcurrentHashMap allow null keys or values?",
              answer:
                "Neither. `put(null, v)`, `put(k, null)`, `get(null)` and `containsKey(null)` all throw `NullPointerException`. The reason is ambiguity: in a concurrent map, `get(k) == null` must mean \"no mapping\", because checking `containsKey` first is a separate call and the map can change in between. I measured that race on a map that allows nulls: a logged-out driver was reported \"on a break\" up to 26,000 times a second.",
            },
            {
              question: "Can you iterate a ConcurrentHashMap while other threads modify it?",
              answer:
                "Yes. Its iterators are weakly consistent: they never throw `ConcurrentModificationException`, return each key present for the whole iteration exactly once, and may or may not show changes made during the walk. In my test, a change to a bin the iterator hadn't reached yet was visible and a change to a bin it had passed wasn't.",
            },
            {
              question: "Is get() on ConcurrentHashMap blocking?",
              answer:
                "No. `javap -c` shows no `monitorenter` in `get`. It reads the bin with an acquire read (`Unsafe.getReferenceAcquire`) and follows `volatile` `next` and `val` fields. In `BinLock`, a `get` returned the old value immediately while another thread held that key's bin lock for 3 seconds.",
            },
            {
              question: "Why is size() only an estimate?",
              answer:
                "Because the count is striped: a `baseCount` plus an array of `CounterCell`s used under contention, and `size()` adds them up one at a time without a lock, while writers may still be updating them. It's exact when no thread is writing. Individual cells even held negative values in my test; only the sum means anything.",
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
              question: "How did ConcurrentHashMap work in Java 7, and what changed in Java 8?",
              answer:
                "Java 5 to 7 split the map into segments (16 by default, set by `concurrencyLevel`), each a small hash table extending `ReentrantLock`; writes locked one segment, so at most 16 writers ran in parallel, and the segment count was fixed for life. Java 8 removed segments: one `Node` table, CAS to fill empty bins, `synchronized` on the first node for other writes, `TreeBin` for crowded bins, resizing shared by all writing threads through `ForwardingNode`s, and a striped counter. `Segment` remains only for serialization compatibility, and `concurrencyLevel` is just a sizing hint (64 gave a 128-bin table in my test).",
            },
            {
              question: "What happens inside put() when the bin is empty, and when it isn't?",
              answer:
                "Empty: create a `Node` and `casTabAt(table, i, null, node)`, which is `Unsafe.compareAndSetReference`; if the CAS fails, another thread filled it, so loop and re-read. No lock at all. Not empty: if the head's hash is `MOVED` (-1), help the resize and retry; otherwise `synchronized` on the head node, re-check that it's still the head, then replace the value or append (or `putTreeVal` on a `TreeBin`), and treeify past 8 nodes. Finally `addCount`. I saw the lock in a thread dump as `locked <...> (a java.util.concurrent.ConcurrentHashMap$Node)`.",
            },
            {
              question: "Why does spread() AND the hash with 0x7fffffff?",
              answer:
                "To make every real key's hash non-negative, because negative hashes mark special nodes: `MOVED = -1` (`ForwardingNode`), `TREEBIN = -2`, `RESERVED = -3` (`ReservationNode`). Code can then check one `int` to know whether a bin is ordinary. `\"polygenelubricants\".hashCode()` is `Integer.MIN_VALUE`; `HashMap.hash` keeps it negative, `spread` turned it into 32768.",
            },
            {
              question: "Why does a ConcurrentHashMap iterator never throw ConcurrentModificationException?",
              answer:
                "There's nothing to detect it with: the class has no `modCount` field (`javap -p` lists none). The iterator walks the live table bin by bin with volatile reads, follows `ForwardingNode`s into the new table during a resize, and simply reports whatever each bin holds when it gets there. That's weakly consistent by design, not fail-safe by copying.",
            },
            {
              question: "What is a TreeBin, and how is it different from HashMap's tree bins?",
              answer:
                "When a bin gets a 9th node and the table has at least 64 bins, `ConcurrentHashMap` converts the chain to a red-black tree, like `HashMap`. But the bin's head is a separate `TreeBin` object (hash `-2`) that owns the tree, so the head and its monitor stay the same while the tree rebalances. `TreeBin` also has a small read-write lock in `lockState`: readers don't block; if a writer is restructuring, a reader walks the linked `next` list instead. Below 64 bins it resizes instead; in my test 9 colliding keys took the table from 16 straight to 128.",
            },
            {
              question: "How does presizing help, and what does the constructor argument mean?",
              answer:
                "The argument is the expected number of entries, not the table length: `new ConcurrentHashMap<>(n)` never resized while I added `n` entries (unlike `new HashMap<>(n)`, which resized at 16, 100 and 1000). Each resize allocates a new table and copies every bin under lock, so filling 4 million keys from 8 threads took about 25% less time when presized.",
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
              question: "Explain how a ConcurrentHashMap resize works with multiple threads.",
              answer:
                "The thread whose `addCount` crosses `sizeCtl` creates `nextTable` (twice as long) and sets `sizeCtl` to a negative value: a resize stamp derived from the table length in the high 16 bits, and 1 plus the number of resizers in the low 16. Other threads that write during the resize, or find a `ForwardingNode`, CAS `sizeCtl` up by one and help. Each claims a stripe of at least 16 bins by CASing `transferIndex` down, copies each bin under its lock with the lo/hi split, and installs a `ForwardingNode` (hash `-1`) in the old slot. Reads that hit a `ForwardingNode` look in `nextTable`. The last helper re-scans and publishes the new table and the new threshold. I sampled 8 threads copying one resize at once, and an old table that was entirely `ForwardingNode`s just before the swap.",
            },
            {
              question: "How does ConcurrentHashMap count its size without a contended counter?",
              answer:
                "`addCount` first tries one CAS on `baseCount`. If it fails, or cells already exist, it increments a `CounterCell` chosen by the thread's probe hash, and creates or grows the cell array on contention (`cellsBusy` is a spin lock for that), up to the number of CPUs: the `LongAdder` design. `sumCount` returns `baseCount` plus all cells. With one thread `counterCells` stayed `null`; with 8 threads it had 8 cells. A side effect I measured: under contention `addCount` skips the resize check unless the put landed in a bin with 2+ nodes, so 4 million perfectly spread `Integer` keys could end in a 2-million-bin table at load factor 1.91.",
            },
            {
              question: "How does get() see a consistent value without locking?",
              answer:
                "The table reference is `volatile`, `tabAt` is an acquire read of the array slot, and `Node.val` and `Node.next` are `volatile`. A writer fully constructs a node before publishing it with a CAS or a release write, so by the happens-before rules a reader that sees the node also sees its key, hash and value. A value update is a single volatile write, so a reader sees either the old or the new value, never a torn one. Special nodes have their own `find`: `ForwardingNode` searches `nextTable`, `TreeBin` takes a read lock or walks the list.",
            },
            {
              question: "Can a concurrent HashMap on Java 8+ still go into an infinite loop?",
              answer:
                "Yes, I measured it on JDK 21. Java 8 fixed the Java 7 cause (resize reversing chains), but concurrent resizes still corrupt chains, and once a corrupted bin gets 8+ nodes it is treeified with `TreeNode` links other threads are rewriting. Two of my 38 runs had threads spinning at 100% CPU in `HashMap$TreeNode.root()` or `treeify` indefinitely, and three threw `ClassCastException` (`HashMap$Node cannot be cast to HashMap$TreeNode`). Any racy `HashMap` use can produce any of these.",
            },
            {
              question: "Why does ConcurrentHashMap lock on the first node instead of using a ReentrantLock per bin?",
              answer:
                "Memory and speed. A lock object per bin would add an object per bin; the first node already exists, and an uncontended `synchronized` is a CAS on its header. Contention per bin is expected to be rare (in my 8-thread test it blocked 0 or 1 times in 8 million operations). The cost is that the head can change (removal, resize, treeify), so after locking, `putVal` re-reads the bin and retries if the head it locked is no longer the head. `TreeBin` exists partly so the head of a tree bin never changes.",
            },
            {
              question: "What's the time complexity of ConcurrentHashMap operations, and how do bad hash codes affect concurrency?",
              answer:
                "Expected O(1) for `get`, `put` and `remove`, O(log n) within a bin once it's a tree. Bad hashes hurt twice: lookups degrade as in `HashMap`, and since one bin is one lock, keys that collide also serialize writers. A key type whose `hashCode` returns a constant turns the map into a single-lock map for writes. Comparable keys help the tree bins, as in `HashMap`.",
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
              question: "One pod of a Java service sits at 100% CPU and stops processing, other pods are fine, and a restart fixes it for a few days. What do you check?",
              answer:
                "Take two or three thread dumps (`jstack <pid>` or `jcmd <pid> Thread.print`) a few seconds apart and look for threads that stay `RUNNABLE` in the same frames with growing `cpu=` values. If the top frames are `java.util.HashMap$TreeNode.root`, `putTreeVal`, `treeify`, or `HashMap.getNode` on a long walk, it's a `HashMap` shared between threads, now with a corrupted (cyclic) structure. That's exactly what my hung run looked like: three threads, 151 seconds of CPU each in 155 seconds.\n\nFind the map (the frames below `HashMap.put` name the caller), replace it with `ConcurrentHashMap`, and search for other `HashMap` fields in singletons. The restart \"fixes\" it only because the corrupted map is rebuilt.",
            },
            {
              question: "A dashboard shows 105,000 drivers online when only 60,000 have logged in, and matching sometimes says \"driver not found\" for active drivers. What's going on?",
              answer:
                "A classic signature of a `HashMap` written by several threads. Entries written into the old table during a concurrent resize are lost; the driver's next update re-adds him and increments `size` again, so the count drifts upwards while lookups intermittently miss. I reproduced it with `DriverLocations`: `size()` 70,931 to 105,257 for 60,000 drivers, up to 269,375 failed lookups in 2.5 million, and an end-of-shift check that found nothing missing.\n\nI'd confirm by finding which threads write the map, switch to a presized `ConcurrentHashMap`, and add a metric for lookup misses of drivers known to be online, because this kind of corruption heals itself and hides.",
            },
            {
              question: "After replacing a shared HashMap with Collections.synchronizedMap, the bugs stopped but p99 latency and ingest lag went up. What do you do?",
              answer:
                "Confirm it's lock contention: JFR's `jdk.JavaMonitorEnter` events (with `settings=profile`) or `ThreadMXBean` blocked time will show waits on `Collections$SynchronizedMap`, all with the same monitor address. In my test, 8 threads spent about 6 seconds blocked in total during one second of work, and most waits were in `get`.\n\nSwitch to `ConcurrentHashMap`: reads take no lock and writes lock one bin, so in my rebuild ingest went from about 1,000 ms back to about 300 ms with the same correctness. Then check for any compound operations (`get` then `put`, `containsKey` then `put`) that relied on the wrapper's lock being held across calls, and replace them with atomic methods.",
            },
            {
              question: "A migration from HashMap to ConcurrentHashMap started throwing NullPointerException in production. Why, and how do you fix it properly?",
              answer:
                "`ConcurrentHashMap` rejects `null` keys and values, and the old code stored `null` values to mean something (\"no surge\", \"profile not loaded yet\") or passed `null` keys from missing request fields. The `put` NPE has no message (it's thrown explicitly in `putVal`), which makes it look odd in logs.\n\nDon't wrap calls in null checks that silently drop data. Model the meaning: an enum or sentinel value for \"no surge\", `Optional` or a dedicated `NOT_LOADED` object for pending entries, and validate keys at the boundary. If code used `containsKey` plus `get` to distinguish missing from null, that pair was also racy; a single `get` is now enough.",
            },
            {
              question: "A nightly settlement job sums all wallet balances from an in-memory ConcurrentHashMap while transfers continue, and the total never matches the ledger. What's wrong?",
              answer:
                "Iteration and bulk operations are weakly consistent, and a transfer is two updates on two keys. The sum mixes values read at different moments and may include half-finished transfers. In `WalletTotals`, a pool that always held exactly 10,000,000 paise was reported as anything from 9,992,000 to 10,024,000.\n\nFor an exact total, the read must be atomic with the writes: stop writes (a lock or a quiesce point), keep a running total updated in the same atomic step as the balances, or (for real money) keep balances in the database and sum them in a transaction, which is what lessons 23 and 24 are about. The map itself can't give a multi-key snapshot.",
            },
            {
              question: "A cache map filled by 8 threads at startup takes longer to warm up than expected, and a heap dump shows a table with far fewer bins than entries. Is that a bug?",
              answer:
                "Probably the lazy-resize behaviour of `addCount`: under contention the count goes to `CounterCell`s and the resize check runs only when a put lands in a bin that already has 2+ nodes. With well-spread keys (sequential IDs especially), the table can lag behind; I measured 4 million `Integer` keys ending in 2,097,152 bins (1.91 per bin) in some runs and 8,388,608 in others.\n\nIt's not a correctness bug, but it costs lookups and the repeated resizes cost warm-up time. Presize: `new ConcurrentHashMap<>(expectedEntries)`. In my test that also made the 8-thread fill about 25% faster.",
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
            "Run `HashMapRace` ten times. Note the `size()` and findable numbers, and whether any run hangs or throws.",
            "Run `javap -c -p java.util.concurrent.ConcurrentHashMap` and count the `monitorenter` instructions in `get(java.lang.Object)` and in `putVal`.",
            "Run `BinLock`, take a `jstack` while `compute` sleeps, and find the `ConcurrentHashMap$Node` monitor in two threads' stacks.",
            "Run `ChmPeek` and change the loop to 200 puts: at which put numbers does the table grow?",
            "Create `new ConcurrentHashMap<>(16)` and `new HashMap<>(16)`, put 16 entries in each, and compare their table lengths with reflection.",
            "In `WeakIterator`, put key `15` instead of `14` during the loop, then key `-1`. Predict whether the iterator sees each one before running it.",
            "Put a key whose `hashCode` is negative into a `ConcurrentHashMap` and read its node's `hash` field with reflection.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 gives wrong numbers on every run, different each time; a hang or a `ClassCastException` is possible but rare (5 of my 38 runs). Step 2 finds 0 in `get` and 1 in `putVal`. Step 3 shows `- locked <0x...>` in `zone-updater` and `- waiting to lock <0x...>` with the same address in `same-key`. Step 4 shows growth at puts 1, 12, 24, 48, 96 and 192 (to 512 bins). Step 5 gives 32 for the concurrent map and 32 for the `HashMap` too, but the `HashMap` got there by resizing from 16 on the 13th put. In step 6, key 15 sits in bin 15, ahead of the iterator, so it's seen; `-1` hashes to `Integer.hashCode(-1) = -1`, which `spread` turns into `0x7fff0000` (bin 0 of 16), behind the iterator, so it isn't seen. Step 7 shows a non-negative `hash` (for example, `\"polygenelubricants\"` gives 32768).",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `SHARED HashMap  JDK 21, 4 writers: every run lost keys (up to 94%), wrong size,
                3/38 ClassCastException, 2/38 infinite loop in TreeNode code

ONE LOCK        Hashtable, synchronizedMap: every call, get too
                8 threads: ~4-5 Mops/s, ~6 s BLOCKED per 1 s of work

JAVA 5-7        16 Segments (ReentrantLock each), fixed forever
JAVA 8+         Node[] table (volatile), no modCount
  empty bin     casTabAt(null -> Node)            no lock
  other bins    synchronized (first node)          re-check head after lock
  get           tabAt (acquire) + volatile val/next  NO lock
  TreeBin -2    9th node, table >= 64 (else tryPresize: 16 -> 128)
  Forwarding -1 bin moved; get follows, put helps resize
  Reservation -3  computeIfAbsent placeholder
  spread        (h ^ h>>>16) & 0x7fffffff  (negatives reserved)

RESIZE          sizeCtl < 0: stamp | 1 + resizers; transferIndex: stripes >= 16
                8 threads copied one resize; presize for bulk fills (~25% faster)
SIZE            baseCount + CounterCell[] (LongAdder-like): estimate, mappingCount()
NULLS           banned: get()==null must mean absent
ITERATORS       weakly consistent: bins ahead seen, bins behind not, never CME
ATOMIC          per key, per call; never across keys or across calls`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`ConcurrentHashMap` is a `HashMap` with three changes: CAS into empty bins, a monitor on the first node of non-empty bins, and lock-free reads through volatile fields. Resizing and counting are spread across threads with `ForwardingNode`s, `transferIndex` and `CounterCell`s.",
            "It makes each call on each key atomic, scales where `Hashtable` and `synchronizedMap` queue, and never corrupts itself. It does not make a sequence of calls atomic, and its `size`, iteration and bulk results are estimates while writers are active.",
            "Next comes ConcurrentHashMap Atomic Operations and Pitfalls: the check-then-act and read-modify-write bugs that survive a thread-safe map, `putIfAbsent`, `computeIfAbsent`, `compute`, `merge` and `replace` loops, what runs while a bin is locked, and a trip counter that underpaid drivers.",
          ],
        },
      ],
    },
  ],
};
