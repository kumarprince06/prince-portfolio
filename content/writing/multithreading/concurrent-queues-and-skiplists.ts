import type { Lesson } from "../types";

export const concurrentQueuesAndSkipLists: Lesson = {
  slug: "concurrent-queues-and-skiplists",
  date: "2026-11-16",
  title: "ConcurrentLinkedQueue, ConcurrentLinkedDeque and ConcurrentSkipListMap",
  description:
    "The lock-free queues and the concurrent sorted map of java.util.concurrent on JDK 21, taken apart and measured: the Michael-Scott queue inside ConcurrentLinkedQueue read through javap and reflection (a dummy first node, a tail that lags one node behind and moves only every second offer, VarHandle CAS on item and next, and polled head nodes linked to themselves so stale walkers restart), size() as a full walk that took 3.2 to 4.4 ms at 1,000,000 elements against 2 to 7 ns for isEmpty(), and that reported up to 19,213 for a queue whose true size never left 9,998 to 10,000, isEmpty-then-poll returning null, a spinning consumer that burned 1,010 ms of CPU per second against 7 to 10 ms for LinkedBlockingQueue.take(), an unbounded queue that hit OutOfMemoryError in under 3 seconds while a bounded one held its backlog at 10,000, ConcurrentLinkedDeque's two lagging ends and terminator nodes, ConcurrentSkipListMap's index towers (25.05% of 1,000,000 keys on level 1, 17 levels, 0.50 Index objects per key, 36 bytes per entry against 40 for TreeMap and 41.5 for ConcurrentHashMap), the random level from two ThreadLocalRandom draws, marker nodes on remove, a LongAdder size() of 2 to 4 ns while headMap(500_000).size() took 2.3 to 2.5 ms, live weakly consistent views that skipped a key inserted just ahead of the iterator, the skip list against a synchronized TreeMap and ConcurrentHashMap under 1 and 8 threads, expiring ride offers and a driver leaderboard, and a nearest-driver index in a ride-hailing backend that held 31 of 400 drivers because its comparator looked only at the ETA.",
  tags: ["Multithreading", "ConcurrentLinkedQueue", "ConcurrentSkipListMap", "Lock-Free", "Concurrency"],
  sections: [
    {
      title: "What ConcurrentLinkedQueue, ConcurrentLinkedDeque and ConcurrentSkipListMap Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, CopyOnWriteArrayList and CopyOnWriteArraySet, covered collections that make reads free by copying the whole array on every write. That only works when writes are rare. This lesson covers the other end: collections built for **many threads writing at the same time**, without any lock at all. `ConcurrentLinkedQueue` is an unbounded first-in, first-out queue. `ConcurrentLinkedDeque` is the same idea with both ends open (a deque, pronounced \"deck\", is a double-ended queue). `ConcurrentSkipListMap` is a sorted map, the concurrent counterpart of `TreeMap`, and `ConcurrentSkipListSet` is a sorted set built on it.",
        },
        {
          type: "paragraph",
          text: "All four are **lock-free**: no method takes a lock, so no thread can ever be stuck behind another thread that was descheduled, paused by the garbage collector or killed while holding a lock. Instead, each change is a compare-and-set (CAS, from Atomics, CAS and the ABA Problem) on one field, and a thread that loses a CAS race simply re-reads and tries again. That gives them two properties worth understanding before using them: they **never block** (an empty queue's `poll()` returns `null` at once, it doesn't wait), and their bulk operations (`size()`, iteration, range views) are **weakly consistent**: they see the structure while other threads keep changing it.",
        },
        {
          type: "paragraph",
          text: "This lesson takes all of them apart on JDK 21: the Michael-Scott queue algorithm inside `ConcurrentLinkedQueue`, read with `javap` and reflection, why its `size()` is slow and can be wrong, what a missing `take()` costs, how the skip list's index levels are built from random numbers, what the sorted navigation methods and views really guarantee, and how the skip list compares with a synchronized `TreeMap` and with `ConcurrentHashMap` when measured. The next lesson, CountDownLatch and CyclicBarrier, moves from sharing data to making threads wait for each other.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The queue comes from a 1996 paper by Maged Michael and Michael Scott, \"Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms\". Their non-blocking queue is a singly linked list with a dummy node at the front and two pointers, `head` and `tail`, each moved with CAS; the key trick is that any thread that finds `tail` behind the real last node helps move it forward. Doug Lea adapted it for `java.util.concurrent` with one more trick: `head` and `tail` are allowed to lag, so most operations do one CAS instead of two. The skip list comes from William Pugh's 1990 paper \"Skip Lists: A Probabilistic Alternative to Balanced Trees\": a sorted linked list with extra \"express lanes\" built by coin flips instead of tree rotations. Rotations change many pointers at once, which is very hard to do without a lock; a skip list changes one pointer at a time, which CAS can do.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`ConcurrentLinkedQueue` (JSR 166)", "The first lock-free collection in the JDK"],
            ["Java 6 (2006)", "`ConcurrentSkipListMap`, `ConcurrentSkipListSet`, `ConcurrentNavigableMap`", "A concurrent sorted map; `TreeMap` had no concurrent equivalent before"],
            ["Java 7 (2011)", "`ConcurrentLinkedDeque`", "A lock-free double-ended queue"],
            ["Java 8 (2014)", "Spliterators, `forEach`, `removeIf` on all three", "Bulk operations that are also weakly consistent"],
            ["Java 9 (2017)", "`java.util.concurrent` moved from `sun.misc.Unsafe` to `VarHandle`", "The `HEAD`, `TAIL`, `ITEM`, `NEXT` handles in this lesson's `javap` output"],
            ["Later rewrites (in JDK 21)", "`ConcurrentSkipListMap` counts entries in a `LongAdder`", "`size()` became cheap; Java 8's version walked the whole base list"],
            ["Java 21 (2023)", "Sequenced collections: `putFirst`/`putLast` on `SequencedMap`", "The skip list throws `UnsupportedOperationException` for them: position is decided by the key"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Two pieces of a ride-hailing company's dispatch floor.",
        },
        {
          type: "list",
          items: [
            "**`ConcurrentLinkedQueue` is a line of ride requests written on cards and clipped to a long string.** Anyone can clip a new card to the end, anyone can unclip the first card. There's no attendant and no turnstile: if two people reach for the same spot, one gets it and the other just reaches for the next one. Nobody ever waits for someone else to finish.",
            "**The sign saying \"end of line here\" (`tail`) is often one card behind.** Whoever notices it is out of date moves it forward. Keeping it exact would mean everyone fighting over the sign on every card.",
            "**Asking \"how many cards are there?\" means walking the whole string and counting**, while people keep adding and removing cards. By the time you finish, your number describes no moment that actually existed.",
            "**There's no chair to sit in while the line is empty.** Someone waiting for a card must keep looking (busy polling) or go away and come back later. A `BlockingQueue` is the same line with a waiting room and a bell.",
            "**`ConcurrentSkipListMap` is the dispatch board of drivers sorted by ETA, with express lanes.** The bottom row lists every driver in order. Above it, a shorter row lists about one in four of them, and above that rows that are shorter again. To find the first driver with an ETA of 155 seconds or more, you scan the top row, drop down a row when you'd overshoot, and reach the right spot in a few steps instead of reading the whole bottom row.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real dispatcher would notice that two drivers with the same ETA are different people. A skip list doesn't: it only knows what its comparator tells it, and if the comparator says two entries are equal, the second one is simply not added. The production section of this lesson is that exact mistake.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/concurrent-queues-and-skiplists-levels.svg",
          alt: "Two panels. Top: ConcurrentLinkedQueue after offer(T1), offer(T2), offer(T3). Fields volatile Node head and tail; each Node holds a volatile item and a volatile next and takes 24 bytes; CAS goes through the VarHandles HEAD, TAIL, ITEM and NEXT. A chain n0 (item null, the dummy, marked head) to n1 T1 to n2 T2 (marked tail, one node behind) to n3 T3 (the real last node). A separate old head node whose next arrow loops back to itself, labelled 'after poll: next = itself'. Notes: offer CASes last.next from null to the new node and moves tail with a weak CAS only when it lags, every second offer; poll CASes item from x to null, moves head lazily and setRelease(oldHead.next, oldHead) so stale walkers restart from head; size() walks every node, O(n), 3.2 to 4.4 ms at 1,000,000 elements, while isEmpty() checks the first live node in 2 to 7 ns. Bottom: ConcurrentSkipListMap with keys 10, 20 up to 320 from one real run. Level 3 holds 90 and 280; level 2 holds 30, 90, 280 and 290; level 1 holds 10, 30, 90, 130, 200, 250, 280, 290 and 300; the base row holds all 32 keys. An orange search path for floorEntry(155) starts at the head on level 3, moves right to 90, drops down twice to level 1, moves right to 130, drops to the base row and moves right through 140 to 150: 4 moves right and 3 down instead of walking 15 base nodes. Notes: with 1,000,000 keys, 25.05% of keys are on level 1 and about half as many on each level above, 17 levels, 501,668 Index objects (0.50 per key); 36 bytes per entry against 40 for TreeMap and 41.5 for ConcurrentHashMap; remove CASes val to null, appends a marker node with a null key, then unlinks; get takes no lock and size reads a LongAdder.",
          caption: "A queue that lets its ends lag behind, and a sorted list with randomly built express lanes: both changed one pointer at a time with CAS.",
        },
        {
          type: "heading",
          text: "The four classes side by side",
        },
        {
          type: "table",
          headers: ["", "ConcurrentLinkedQueue", "ConcurrentLinkedDeque", "ConcurrentSkipListMap / Set"],
          rows: [
            ["Shape", "Singly linked list, FIFO", "Doubly linked list, both ends", "Sorted base list + index levels"],
            ["Bounded", "No", "No", "No"],
            ["Blocks when empty", "No: `poll()` returns `null`", "No: `pollFirst()`/`pollLast()` return `null`", "No: `firstEntry()` returns `null`, `firstKey()` throws"],
            ["Locks", "None (CAS)", "None (CAS)", "None (CAS)"],
            ["`size()`", "O(n) walk, not exact under change", "O(n) walk, not exact under change", "O(1)-ish: a `LongAdder` sum (views: O(n))"],
            ["Iteration", "Weakly consistent, no `ConcurrentModificationException`", "Same, in both directions", "Same, in key order, plus live range views"],
            ["Nulls", "Not allowed", "Not allowed", "No null keys or values"],
            ["Node cost (measured)", "24 bytes per element", "Not measured: one more pointer (`prev`) per node", "36 bytes per entry"],
            ["Nearest JDK relative", "`LinkedBlockingQueue` without blocking", "`LinkedBlockingDeque` without blocking", "`TreeMap` / `TreeSet`"],
          ],
        },
        {
          type: "heading",
          text: "The operations that matter",
        },
        {
          type: "table",
          headers: ["Method", "What it does", "Cost and notes"],
          rows: [
            ["`queue.offer(e)` / `add(e)`", "Appends at the tail", "Always `true` (unbounded); one CAS on `last.next`, `null` throws NPE"],
            ["`queue.poll()` / `peek()`", "Removes / reads the head", "`null` when empty, immediately"],
            ["`queue.isEmpty()`", "Is there a live first node?", "Constant time; use this, never `size() == 0`"],
            ["`queue.size()`", "Counts live nodes", "Walks the list: O(n), and only an estimate under concurrent change"],
            ["`queue.remove(o)` / `contains(o)`", "Finds by `equals`", "O(n) walk"],
            ["`deque.offerFirst/offerLast`, `pollFirst/pollLast`, `push/pop`", "Both ends", "`push`/`pop` work on the front (stack order)"],
            ["`map.get/put/remove/putIfAbsent/compute/merge`", "Sorted-map point operations", "O(log n) expected; `get` takes no lock"],
            ["`firstEntry`, `ceilingKey`, `floorEntry`, `higherKey`, `lowerKey`", "Nearest key in either direction", "O(log n); return `null` when there is none"],
            ["`headMap`, `tailMap`, `subMap`, `descendingMap`", "Live views of a key range", "Weakly consistent; their `size()` walks the range"],
            ["`pollFirstEntry`, `pollLastEntry`", "Atomically remove the smallest / largest", "Each entry is returned to exactly one caller"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "ConcurrentLinkedQueue: two volatile pointers and four VarHandles",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.ConcurrentLinkedQueue 'java.util.concurrent.ConcurrentLinkedQueue$Node'`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.ConcurrentLinkedQueue<E> extends java.util.AbstractQueue<E> implements java.util.Queue<E>, java.io.Serializable {
  private static final long serialVersionUID;
  volatile transient java.util.concurrent.ConcurrentLinkedQueue$Node<E> head;
  private volatile transient java.util.concurrent.ConcurrentLinkedQueue$Node<E> tail;
  private static final int MAX_HOPS;
  private static final java.lang.invoke.VarHandle HEAD;
  private static final java.lang.invoke.VarHandle TAIL;
  static final java.lang.invoke.VarHandle ITEM;
  static final java.lang.invoke.VarHandle NEXT;
  ...
  final void updateHead(java.util.concurrent.ConcurrentLinkedQueue$Node<E>, java.util.concurrent.ConcurrentLinkedQueue$Node<E>);
  final java.util.concurrent.ConcurrentLinkedQueue$Node<E> succ(java.util.concurrent.ConcurrentLinkedQueue$Node<E>);
  ...
  public boolean offer(E);
  public E poll();
  public E peek();
  java.util.concurrent.ConcurrentLinkedQueue$Node<E> first();
  public boolean isEmpty();
  public int size();
  ...
}
final class java.util.concurrent.ConcurrentLinkedQueue$Node<E> {
  volatile E item;
  volatile java.util.concurrent.ConcurrentLinkedQueue$Node<E> next;
  java.util.concurrent.ConcurrentLinkedQueue$Node(E);
  java.util.concurrent.ConcurrentLinkedQueue$Node();
  void appendRelaxed(java.util.concurrent.ConcurrentLinkedQueue$Node<E>);
  boolean casItem(E, E);
}`,
        },
        {
          type: "list",
          items: [
            "**The whole queue is two `volatile` fields**, `head` and `tail`. There's no count field and no lock field, which already tells you `size()` must count by walking.",
            "**A `Node` is two `volatile` fields:** `item` and `next`. With compressed pointers that's a 12-byte header plus two 4-byte references, padded to 24 bytes; I measured exactly 24.0 bytes per element later in this lesson.",
            "**Four `VarHandle`s** (a `VarHandle` is a typed pointer to a field that supports atomic operations like `compareAndSet`, the Java 9 replacement for `sun.misc.Unsafe`): `HEAD` and `TAIL` for the queue's fields, `ITEM` and `NEXT` for a node's fields. Every change to the queue goes through one of them.",
          ],
        },
        {
          type: "heading",
          text: "offer() and poll() in bytecode",
        },
        {
          type: "paragraph",
          text: "This is `javap -c -p` output for `offer`, trimmed, with my notes after the constant-pool comments:",
        },
        {
          type: "output",
          text: `  public boolean offer(E);
       0: new           #7     // class ConcurrentLinkedQueue$Node
       5: invokestatic  #35    // Method java/util/Objects.requireNonNull   (null -> NPE)
      13: getfield      #10    // Field tail                                 (t = tail, p = t)
      22: getfield      #69    // Field Node.next                            (q = p.next)
      29: ifnonnull     63     //                                             p is not last: go to 63
      39: invokevirtual #84    // Method VarHandle.compareAndSet(p, null, newNode)   on NEXT: the linearization point
      42: ifeq          117    //                                             lost the race: retry
      48: if_acmpeq     61     //                                             p == t: tail is only 1 behind, leave it
      57: invokevirtual #90    // Method VarHandle.weakCompareAndSet(this, t, newNode)  on TAIL, result ignored
      62: ireturn              //                                             return true
      67: if_acmpne     93     //                                             p == q: p was polled and self-linked
      85: getfield      #16    // Field head                                 ... restart from tail, or from head
      96: if_acmpeq     113    //                                             otherwise hop to q, re-reading tail
     117: goto          20`,
        },
        {
          type: "list",
          items: [
            "**The one essential step is a CAS of the last node's `next` from `null` to the new node** (offset 39). Whoever wins that CAS has appended; everyone else re-reads and tries again. This is the Michael-Scott queue's linearization point: the instant the element is in the queue.",
            "**Moving `tail` is optional.** At offset 48 the thread checks whether it found the last node at `tail` itself. If so, `tail` is now one node behind and is left alone. Only if `tail` was already behind does it try to move it, with a `weakCompareAndSet` whose result is thrown away (`pop`): if it fails, someone else moved it. So `tail` moves on every second `offer`, and every offer pays for at most one or two CASes instead of always two.",
            "**`p == q` (offset 67) means \"this node was removed and points to itself\".** A thread that walked onto such a node can't continue from it, so it jumps back to `tail` or `head`.",
          ],
        },
        {
          type: "output",
          text: `  public E poll();
       1: getfield      #16    // Field head                                 (h = head, p = h)
       8: getfield      #93    // Field Node.item
      14: ifnull        54     //                                             empty slot: look at p.next
      21: invokevirtual #97    // Method Node.casItem(item, null)            the linearization point
      29: if_acmpeq     51     //                                             p == h: leave head where it is
      48: invokevirtual #101   // Method updateHead(h, p.next or p)
      53: areturn
      60: ifnonnull     71     //                                             p.next == null: queue is empty
      66: invokevirtual #101   // Method updateHead(h, p)
      70: areturn              //                                             return null
      73: if_acmpne     79     //                                             p.next == p: restart from head

  final void updateHead(Node h, Node p);
      11: invokevirtual #56    // Method VarHandle.compareAndSet(this, h, p)   on HEAD
      22: invokevirtual #65    // Method VarHandle.setRelease(h, h)           on NEXT: h.next = h`,
        },
        {
          type: "list",
          items: [
            "**Removing an element is a CAS of its `item` to `null`** (offset 21), not unlinking the node. A node with a `null` item is a dead node; it stays in the list until `head` moves past it.",
            "**`head` also moves lazily.** If the removed node was the one `head` pointed to, `head` stays; only when `poll` had to step past a dead node does it call `updateHead`.",
            "**`updateHead` links the old head to itself** with `setRelease(h, h)` (a write with release ordering, cheaper than a full volatile write). That self-link is the signal `p == q` in `offer` and `poll` checks for. It also helps the garbage collector: an old node that pointed forward would keep every later node reachable from it; a self-linked one keeps nothing alive.",
            "**`poll` on an empty queue returns `null` immediately** (offset 70). There's no waiting anywhere in the class.",
          ],
        },
        {
          type: "heading",
          text: "Watching head and tail lag",
        },
        {
          type: "paragraph",
          text: "To see all of this on a live queue, I read `head`, `tail` and each node's `item` and `next` with reflection after every operation, naming nodes `n0`, `n1` ... in the order I first met them:",
        },
        {
          type: "code",
          language: "java",
          title: "ClqInternals.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

public class ClqInternals {
    static Field HEAD, TAIL, ITEM, NEXT;

    static void open() throws Exception {
        HEAD = ConcurrentLinkedQueue.class.getDeclaredField("head");
        TAIL = ConcurrentLinkedQueue.class.getDeclaredField("tail");
        Class<?> node = Class.forName("java.util.concurrent.ConcurrentLinkedQueue$Node");
        ITEM = node.getDeclaredField("item");
        NEXT = node.getDeclaredField("next");
        for (Field f : new Field[] {HEAD, TAIL, ITEM, NEXT}) f.setAccessible(true);
    }

    // Names every node reachable from head: n0, n1, ... and marks where head and tail point
    static void show(String label, ConcurrentLinkedQueue<String> q, List<Object> seen) throws Exception {
        Object head = HEAD.get(q), tail = TAIL.get(q);
        StringBuilder sb = new StringBuilder();
        for (Object p = head; p != null; ) {
            if (!seen.contains(p)) seen.add(p);
            sb.append("n").append(seen.indexOf(p)).append("(").append(ITEM.get(p)).append(")");
            if (p == head) sb.append("<-head");
            if (p == tail) sb.append("<-tail");
            Object next = NEXT.get(p);
            if (next == p) { sb.append(" next=itself"); break; }
            if (next != null) sb.append(" -> ");
            p = next;
        }
        System.out.printf("%-22s %s%n", label, sb);
    }

    public static void main(String[] args) throws Exception {
        open();
        ConcurrentLinkedQueue<String> q = new ConcurrentLinkedQueue<>();
        List<Object> seen = new ArrayList<>();
        show("new queue", q, seen);
        for (String trip : new String[] {"T1", "T2", "T3", "T4"}) {
            q.offer(trip);
            show("offer(" + trip + ")", q, seen);
        }
        Object oldHead = HEAD.get(q);
        System.out.println("poll() = " + q.poll());
        show("after poll", q, seen);
        System.out.println("poll() = " + q.poll());
        show("after 2nd poll", q, seen);
        Object n0 = seen.get(0);
        System.out.println("old head n0: item=" + ITEM.get(n0) + ", next is itself: " + (NEXT.get(n0) == n0));
        System.out.println("n1 (polled, skipped): item=" + ITEM.get(seen.get(1)) + ", next is n" + seen.indexOf(NEXT.get(seen.get(1))));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED ClqInternals.java",
        },
        {
          type: "output",
          text: `new queue              n0(null)<-head<-tail
offer(T1)              n0(null)<-head<-tail -> n1(T1)
offer(T2)              n0(null)<-head -> n1(T1) -> n2(T2)<-tail
offer(T3)              n0(null)<-head -> n1(T1) -> n2(T2)<-tail -> n3(T3)
offer(T4)              n0(null)<-head -> n1(T1) -> n2(T2) -> n3(T3) -> n4(T4)<-tail
poll() = T1
after poll             n2(T2)<-head -> n3(T3) -> n4(T4)<-tail
poll() = T2
after 2nd poll         n2(null)<-head -> n3(T3) -> n4(T4)<-tail
old head n0: item=null, next is itself: true
n1 (polled, skipped): item=null, next is n2`,
        },
        {
          type: "list",
          items: [
            "**A new queue is one dummy node** `n0` with a `null` item, and both `head` and `tail` point to it. The dummy means `offer` and `poll` never fight over the same field when the queue has elements: producers work at the tail, consumers at the head.",
            "**`tail` moved on every second offer.** After `offer(T1)` it still pointed to `n0`; after `offer(T2)` it jumped to `n2`; after `T3` it stayed at `n2` (one behind the real last node `n3`); after `T4` it jumped to `n4`. That's the bytecode's `p == t` check in action.",
            "**The first `poll` jumped `head` two nodes.** It found the dummy `n0` empty, stepped to `n1`, CASed `T1` to `null`, and because it had stepped past `head`, called `updateHead(n0, n2)`. `n0` now points to itself; `n1` became unreachable garbage with a `null` item.",
            "**The second `poll` didn't move `head` at all.** `T2` was in the node `head` pointed to, so it just CASed the item to `null`, leaving `n2(null)` as the new dummy. A queue at rest usually has a dead node at the front, which is why `isEmpty()` must look past it.",
          ],
        },
        {
          type: "heading",
          text: "size() and isEmpty() in bytecode",
        },
        {
          type: "output",
          text: `  public int size();
       0: iconst_0             //                         count = 0 (restart point)
       3: invokevirtual #104   // Method first:()Node     first live node
      12: getfield      #93    // Field Node.item
      15: ifnull        30     //                         dead node: don't count it
      18: iinc          1, 1   //                         count++
      22: ldc           #110   // int 2147483647          stop at Integer.MAX_VALUE
      32: getfield      #69    // Field Node.next
      37: if_acmpne     7      //                         p != p.next: keep walking
      40: goto          0      //                         self-linked node: START OVER from zero

  public boolean isEmpty();
       1: invokevirtual #104   // Method first:()Node
       4: ifnonnull     11     //                         any live node at all?`,
        },
        {
          type: "paragraph",
          text: "`size()` visits every node. Worse, if the node it's standing on was polled and self-linked by another thread meanwhile (offset 40), it **starts counting again from zero**. Under a steady stream of polls, a long `size()` can restart several times. `isEmpty()` only asks `first()` for the first node with a non-null item, which is usually the first or second node. The next section measures both.",
        },
        {
          type: "heading",
          text: "ConcurrentLinkedDeque: two lagging ends and terminator nodes",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.ConcurrentLinkedDeque 'java.util.concurrent.ConcurrentLinkedDeque$Node'`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.ConcurrentLinkedDeque<E> extends java.util.AbstractCollection<E> implements java.util.Deque<E>, java.io.Serializable {
  private volatile transient java.util.concurrent.ConcurrentLinkedDeque$Node<E> head;
  private volatile transient java.util.concurrent.ConcurrentLinkedDeque$Node<E> tail;
  private static final java.util.concurrent.ConcurrentLinkedDeque$Node<java.lang.Object> PREV_TERMINATOR;
  private static final java.util.concurrent.ConcurrentLinkedDeque$Node<java.lang.Object> NEXT_TERMINATOR;
  private static final int HOPS;
  private static final java.lang.invoke.VarHandle HEAD;
  private static final java.lang.invoke.VarHandle TAIL;
  private static final java.lang.invoke.VarHandle PREV;
  private static final java.lang.invoke.VarHandle NEXT;
  private static final java.lang.invoke.VarHandle ITEM;
  ...
}
final class java.util.concurrent.ConcurrentLinkedDeque$Node<E> {
  volatile java.util.concurrent.ConcurrentLinkedDeque$Node<E> prev;
  volatile E item;
  volatile java.util.concurrent.ConcurrentLinkedDeque$Node<E> next;
}`,
        },
        {
          type: "paragraph",
          text: "The deque adds a `prev` pointer and two shared sentinel nodes, `PREV_TERMINATOR` and `NEXT_TERMINATOR`, used to mark nodes that have been cut out of the list. I ran the same reflection walk on it:",
        },
        {
          type: "code",
          language: "java",
          title: "DequeInternals.java",
          code: `import java.lang.reflect.Field;
import java.util.IdentityHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedDeque;

public class DequeInternals {
    static Field HEAD, TAIL, PREV, ITEM, NEXT, PREV_T, NEXT_T;
    static Map<Object, String> names = new IdentityHashMap<>();

    static String name(Object node) throws Exception {
        if (node == null) return "null";
        if (node == PREV_T.get(null)) return "PREV_TERMINATOR";
        if (node == NEXT_T.get(null)) return "NEXT_TERMINATOR";
        return names.computeIfAbsent(node, n -> "n" + names.size());
    }

    static void show(String label, ConcurrentLinkedDeque<String> d) throws Exception {
        Object head = HEAD.get(d), tail = TAIL.get(d);
        Object p = head;
        while (PREV.get(p) != null && PREV.get(p) != p && PREV.get(p) != PREV_T.get(null)) p = PREV.get(p);
        StringBuilder sb = new StringBuilder();
        for (; p != null; p = NEXT.get(p)) {
            sb.append(name(p)).append("(").append(ITEM.get(p)).append(")");
            if (p == head) sb.append("<-head");
            if (p == tail) sb.append("<-tail");
            if (NEXT.get(p) == p) { sb.append(" next=itself"); break; }
            if (NEXT.get(p) != null) sb.append(" <-> ");
        }
        System.out.printf("%-20s %s%n", label, sb);
    }

    public static void main(String[] args) throws Exception {
        Class<?> node = Class.forName("java.util.concurrent.ConcurrentLinkedDeque$Node");
        HEAD = ConcurrentLinkedDeque.class.getDeclaredField("head");
        TAIL = ConcurrentLinkedDeque.class.getDeclaredField("tail");
        PREV_T = ConcurrentLinkedDeque.class.getDeclaredField("PREV_TERMINATOR");
        NEXT_T = ConcurrentLinkedDeque.class.getDeclaredField("NEXT_TERMINATOR");
        PREV = node.getDeclaredField("prev");
        ITEM = node.getDeclaredField("item");
        NEXT = node.getDeclaredField("next");
        for (Field f : new Field[] {HEAD, TAIL, PREV_T, NEXT_T, PREV, ITEM, NEXT}) f.setAccessible(true);

        ConcurrentLinkedDeque<String> d = new ConcurrentLinkedDeque<>();
        show("new deque", d);
        d.offerLast("T2");   show("offerLast(T2)", d);
        d.offerLast("T3");   show("offerLast(T3)", d);
        d.offerFirst("T1");  show("offerFirst(T1)", d);
        d.offerLast("T4");   show("offerLast(T4)", d);
        Object first = HEAD.get(d);
        Object last = TAIL.get(d);
        System.out.println("pollFirst() = " + d.pollFirst() + ", pollLast() = " + d.pollLast());
        show("after both polls", d);
        for (Object n : names.keySet().toArray()) {
            if (ITEM.get(n) == null)
                System.out.printf("removed %s: prev=%s next=%s%n", name(n), name(PREV.get(n)), name(NEXT.get(n)));
        }
    }
}`,
        },
        {
          type: "output",
          text: `new deque            n0(null)<-head<-tail
offerLast(T2)        n0(null)<-head<-tail <-> n1(T2)
offerLast(T3)        n0(null)<-head <-> n1(T2) <-> n2(T3)<-tail
offerFirst(T1)       n3(T1) <-> n0(null)<-head <-> n1(T2) <-> n2(T3)<-tail
offerLast(T4)        n3(T1) <-> n0(null)<-head <-> n1(T2) <-> n2(T3)<-tail <-> n4(T4)
pollFirst() = T1, pollLast() = T4
after both polls     n3(null)<-head <-> n1(T2) <-> n2(T3) <-> n4(null)<-tail
removed n4: prev=n2 next=null
removed n0: prev=PREV_TERMINATOR next=n0
removed n3: prev=null next=n1`,
        },
        {
          type: "list",
          items: [
            "**Both ends lag.** After `offerFirst(T1)`, `head` still pointed to the empty `n0`, one node behind the real first node `n3`; after `offerLast(T4)`, `tail` was one behind `n4`. Exactly the queue's trick, applied at both ends.",
            "**Removal is again \"null the item first\".** `pollFirst` emptied `n3` and `pollLast` emptied `n4`; both stayed in the list as dead nodes at the ends, with `head` and `tail` moved onto them.",
            "**The old dummy `n0` was unlinked** and marked: its `next` points to itself and its `prev` to `PREV_TERMINATOR`, so any thread that was walking through it knows to restart from an end. Unlinking a node from a doubly linked list without a lock takes several CASes, which is why the deque was measured slower than the queue in most runs of the throughput test at the end of this lesson.",
          ],
        },
        {
          type: "heading",
          text: "ConcurrentSkipListMap: Nodes, Indexes and a LongAdder",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.ConcurrentSkipListMap 'java.util.concurrent.ConcurrentSkipListMap$Node' 'java.util.concurrent.ConcurrentSkipListMap$Index'`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.ConcurrentSkipListMap<K, V> extends java.util.AbstractMap<K, V> implements java.util.concurrent.ConcurrentNavigableMap<K, V>, java.lang.Cloneable, java.io.Serializable {
  final java.util.Comparator<? super K> comparator;
  private transient java.util.concurrent.ConcurrentSkipListMap$Index<K, V> head;
  private transient java.util.concurrent.atomic.LongAdder adder;
  ...
  private static final java.lang.invoke.VarHandle HEAD;
  private static final java.lang.invoke.VarHandle ADDER;
  private static final java.lang.invoke.VarHandle NEXT;
  private static final java.lang.invoke.VarHandle VAL;
  private static final java.lang.invoke.VarHandle RIGHT;
  ...
  private java.util.concurrent.ConcurrentSkipListMap$Node<K, V> findPredecessor(java.lang.Object, java.util.Comparator<? super K>);
  private V doGet(java.lang.Object);
  private V doPut(K, V, boolean);
  static <K, V> boolean addIndices(java.util.concurrent.ConcurrentSkipListMap$Index<K, V>, int, java.util.concurrent.ConcurrentSkipListMap$Index<K, V>, java.util.Comparator<? super K>);
  final V doRemove(java.lang.Object, java.lang.Object);
  private void tryReduceLevel();
  ...
  public V putFirst(K, V);
  public V putLast(K, V);
  ...
}
final class java.util.concurrent.ConcurrentSkipListMap$Node<K, V> {
  final K key;
  V val;
  java.util.concurrent.ConcurrentSkipListMap$Node<K, V> next;
}
final class java.util.concurrent.ConcurrentSkipListMap$Index<K, V> {
  final java.util.concurrent.ConcurrentSkipListMap$Node<K, V> node;
  final java.util.concurrent.ConcurrentSkipListMap$Index<K, V> down;
  java.util.concurrent.ConcurrentSkipListMap$Index<K, V> right;
}`,
        },
        {
          type: "list",
          items: [
            "**Two kinds of objects.** A `Node` holds one entry: the `key`, the `val` and the `next` node in key order. Together, the nodes form the **base list**, an ordinary sorted singly linked list with every entry. An `Index` is one rung of an express lane: it points at a base `node`, at the `Index` one level `down` for the same node, and at the next `Index` to the `right` on its level. `head` is the top-left `Index`.",
            "**The fields aren't `volatile`.** Unlike the queue, `val`, `next` and `right` are plain fields, and every read and CAS goes through the `VAL`, `NEXT` and `RIGHT` VarHandles with explicit memory ordering. The effect is the same; the code chooses the ordering per access instead of paying for a volatile access every time.",
            "**`adder` is a `LongAdder`** (the striped counter from Atomics, CAS and the ABA Problem). Every successful insert adds 1, every remove adds -1, and `size()` returns its sum, capped at `Integer.MAX_VALUE`. That makes `size()` constant time, unlike the queues, but still only an estimate while threads are changing the map.",
            "**`putFirst` and `putLast` exist (from Java 21's `SequencedMap`) but throw `UnsupportedOperationException`**: in a sorted map the key decides the position.",
          ],
        },
        {
          type: "heading",
          text: "How a new key gets its level",
        },
        {
          type: "paragraph",
          text: "After `doPut` has linked the new `Node` into the base list, it decides whether to build an index tower for it. The relevant bytecode, trimmed:",
        },
        {
          type: "output",
          text: `     369: invokestatic  #126   // Method ThreadLocalRandom.nextSecondarySeed:()I     lr = random int
     376: iconst_3
     377: iand
     378: ifne          538    //                     (lr & 3) != 0: no index at all (3 keys in 4)
     381: invokestatic  #126   // Method ThreadLocalRandom.nextSecondarySeed:()I     hr = another random int
     389: bipush        32
     391: lshl                 //                     rnd = (hr << 32) | (lr & 0xffffffffL)
     402: iload         7      //                     skips = current number of levels
     409: new           #26    // class ConcurrentSkipListMap$Index                   idx = new Index(z, idx, null)
     427: ifge          450    //                     rnd >= 0 (top bit 0): stop growing
     430: iinc          13, -1 //                     --skips; stop if below 0
     444: lshl                 //                     rnd <<= 1, and add another level
     458: invokestatic  #134   // Method addIndices(...)                               splice the tower in, CAS on RIGHT
     470: getfield      #19    // Field head          tower taller than the map: CAS a new head level`,
        },
        {
          type: "list",
          items: [
            "**One key in four gets an index at all**: the low two bits of a random number must both be 0.",
            "**Each further level needs one more 1-bit** at the top of a 64-bit random number, read one bit at a time by shifting left: probability 1/2 per level. So about 1/4 of keys reach level 1, 1/8 level 2, 1/16 level 3, and so on.",
            "**A tower can be at most one level taller than the map.** If it is, the thread CASes a new `head` level on top. No rebalancing ever happens: the shape is decided by coin flips at insert time, and the expected cost of a search stays O(log n) no matter what order the keys arrive in.",
            "**The random numbers come from `ThreadLocalRandom`'s secondary seed**, so threads never contend on a shared random generator.",
          ],
        },
        {
          type: "paragraph",
          text: "To see the real levels, I walked the index from `head` with reflection, first for 32 keys, then for a million:",
        },
        {
          type: "code",
          language: "java",
          title: "SkipLevels.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentSkipListMap;

public class SkipLevels {
    static Field HEAD, NODE, DOWN, RIGHT, KEY;

    // Keys on each index level, top level first (the head Index of each level has a dummy node, key null)
    static List<List<Object>> levels(ConcurrentSkipListMap<?, ?> m) throws Exception {
        List<List<Object>> out = new ArrayList<>();
        for (Object h = HEAD.get(m); h != null; h = DOWN.get(h)) {
            List<Object> keys = new ArrayList<>();
            for (Object r = RIGHT.get(h); r != null; r = RIGHT.get(r)) keys.add(KEY.get(NODE.get(r)));
            out.add(keys);
        }
        return out;
    }

    public static void main(String[] args) throws Exception {
        HEAD = ConcurrentSkipListMap.class.getDeclaredField("head");
        Class<?> index = Class.forName("java.util.concurrent.ConcurrentSkipListMap$Index");
        Class<?> node = Class.forName("java.util.concurrent.ConcurrentSkipListMap$Node");
        NODE = index.getDeclaredField("node");
        DOWN = index.getDeclaredField("down");
        RIGHT = index.getDeclaredField("right");
        KEY = node.getDeclaredField("key");
        for (Field f : new Field[] {HEAD, NODE, DOWN, RIGHT, KEY}) f.setAccessible(true);

        ConcurrentSkipListMap<Integer, String> small = new ConcurrentSkipListMap<>();
        for (int k = 10; k <= 320; k += 10) small.put(k, "trip-" + k);
        List<List<Object>> lv = levels(small);
        for (int i = 0; i < lv.size(); i++) System.out.printf("level %d: %s%n", lv.size() - i, lv.get(i));
        System.out.println("base:    all " + small.size() + " keys, 10 .. 320");

        ConcurrentSkipListMap<Integer, Integer> big = new ConcurrentSkipListMap<>();
        int n = 1_000_000;
        for (int k = 0; k < n; k++) big.put(k, k);
        lv = levels(big);
        long indexes = 0;
        System.out.printf("%n%,d keys: %d index levels%n", n, lv.size());
        for (int i = lv.size() - 1; i >= 0; i--) {
            int level = lv.size() - i, count = lv.get(i).size();
            indexes += count;
            if (level <= 6 || i == 0) System.out.printf("  level %2d: %,8d index nodes (%5.2f%% of keys)%n", level, count, 100.0 * count / n);
        }
        System.out.printf("  total:    %,8d Index objects, %.3f per key%n", indexes, (double) indexes / n);
    }
}`,
        },
        {
          type: "output",
          text: `level 3: [90, 280]
level 2: [30, 90, 280, 290]
level 1: [10, 30, 90, 130, 200, 250, 280, 290, 300]
base:    all 32 keys, 10 .. 320

1,000,000 keys: 17 index levels
  level  1:  250,524 index nodes (25.05% of keys)
  level  2:  125,490 index nodes (12.55% of keys)
  level  3:   62,928 index nodes ( 6.29% of keys)
  level  4:   31,280 index nodes ( 3.13% of keys)
  level  5:   15,682 index nodes ( 1.57% of keys)
  level  6:    7,906 index nodes ( 0.79% of keys)
  level 17:        1 index nodes ( 0.00% of keys)
  total:     501,668 Index objects, 0.502 per key`,
        },
        {
          type: "list",
          items: [
            "**With 32 keys, 9 got an index**, about the 1 in 4 the bytecode predicts. The levels differ on every run, because they come from random numbers; this run is the one drawn in the diagram above.",
            "**With a million keys the probabilities show up exactly:** 25.05% on level 1, then 12.55%, 6.29%, 3.13%, halving each level, up to 17 levels with a single index at the top. log2 of 1,000,000 is about 20, so 17 levels means a search touches a few nodes per level and a few dozen in total.",
            "**0.50 `Index` objects per key in total** (1/4 + 1/8 + 1/16 ... = 1/2). An `Index` is three references plus a header, 24 bytes, so the express lanes cost about 12 bytes per entry on top of the 24-byte `Node`: the 36 bytes per entry I measured later.",
            "**The search in the diagram:** `floorEntry(155)` starts at `head` on level 3, moves right to 90 (280 is too far), drops to level 2 and then level 1 at 90, moves right to 130 (200 is too far), drops to the base list and walks 140, 150, stopping because 160 > 155. Four moves right and three down, instead of 15 steps along the base list.",
          ],
        },
        {
          type: "heading",
          text: "Removal: null the value, then a marker node",
        },
        {
          type: "output",
          text: `  final V doRemove(java.lang.Object, java.lang.Object);
      23: invokevirtual #101   // Method findPredecessor(key, cmp)
     138: invokevirtual #151   // Method VarHandle.compareAndSet(n, v, null)    on VAL: the entry is now deleted
     152: invokestatic  #105   // Method unlinkNode(b, n)
     167: invokevirtual #154   // Method tryReduceLevel()
     174: invokevirtual #141   // Method addCount(-1)                         the LongAdder

  static void unlinkNode(Node b, Node n);
      37: new           #32    // class ConcurrentSkipListMap$Node
      41: aconst_null          //   key  = null
      42: aconst_null          //   val  = null      -> a marker node
      47: invokevirtual #48    // Method VarHandle.compareAndSet(n.next: f -> marker)
      64: invokevirtual #52    // Method VarHandle.compareAndSet(b.next: n -> f)   unlink n and the marker together`,
        },
        {
          type: "list",
          items: [
            "**The delete happens at the CAS of `val` to `null`.** From that moment `get` returns `null` for the key, even though the node is still linked.",
            "**Then a marker node is appended after the deleted node** (a node with a `null` key and value). Without it, another thread could insert a new key right after the deleted node at the same moment its predecessor's `next` is swung past it, and the new key would be lost. The marker makes `n.next` unusable for inserts, so the second CAS can safely unlink `n` and the marker together. Index entries pointing to deleted nodes are cleaned up by later searches.",
            "**`get` takes no lock and does no CAS**: `doGet` is reads only. Readers never slow writers down, and writers only ever CAS one field at a time.",
          ],
        },
        {
          type: "heading",
          text: "What these look like in a thread dump",
        },
        {
          type: "paragraph",
          text: "None of these classes ever parks a thread, so they never appear in a `parking to wait for` line. What they do produce is the opposite symptom when misused: a consumer that spins. Two consumers on empty queues, one polling a `ConcurrentLinkedQueue` in a loop and one in `LinkedBlockingQueue.take()`, captured with `jcmd` after 6 seconds:",
        },
        {
          type: "code",
          language: "java",
          title: "IdleConsumers.java",
          code: `import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class IdleConsumers {
    public static void main(String[] args) throws Exception {
        ConcurrentLinkedQueue<String> requests = new ConcurrentLinkedQueue<>();
        LinkedBlockingQueue<String> payouts = new LinkedBlockingQueue<>();
        Thread.ofPlatform().daemon().name("dispatch-spinner").start(() -> {
            while (true) {
                String r = requests.poll();                 // empty queue: returns null at once
                if (r != null) System.out.println("dispatch " + r);
            }
        });
        Thread.ofPlatform().daemon().name("payout-worker").start(() -> {
            try {
                while (true) System.out.println("pay " + payouts.take());   // empty queue: parks
            } catch (InterruptedException e) { }
        });
        Thread.sleep(60_000);                               // time for: jcmd IdleConsumers Thread.print
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java IdleConsumers &
jcmd IdleConsumers Thread.print`,
        },
        {
          type: "output",
          text: `"dispatch-spinner" #20 [849786] daemon prio=5 os_prio=0 cpu=6151.06ms elapsed=6.28s tid=0x00007105b8107750 nid=849786 runnable  [0x00007105bc697000]
   java.lang.Thread.State: RUNNABLE
	at IdleConsumers.lambda$main$0(IdleConsumers.java:12)
	at IdleConsumers$$Lambda/0x0000710544000a08.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

"payout-worker" #21 [849787] daemon prio=5 os_prio=0 cpu=1.40ms elapsed=6.28s tid=0x00007105b8108950 nid=849787 waiting on condition  [0x00007105bc598000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x00000000ffd17d08> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:371)
	...`,
        },
        {
          type: "list",
          items: [
            "**The spinner used 6,151 ms of CPU in 6.28 s of life**: one full core, doing nothing. It shows as `RUNNABLE`, which looks healthy in a dump.",
            "**Its stack doesn't even mention `ConcurrentLinkedQueue`.** The JIT inlined `poll()` into the loop, so the only frame is the lambda, at line 12: the loop's closing brace, where the compiled loop checks for safepoints. In a real service, the clue is `cpu=` growing as fast as `elapsed=` on a thread that should be idle; `top -H` or a CPU profile points straight at it.",
            "**The `take()` thread used 1.40 ms** and parks on the `LinkedBlockingQueue`'s `ConditionObject` (Blocking Queues showed why). That's the trade-off the next sections measure.",
          ],
        },
      ],
    },
    {
      title: "size() Is a Walk, and Not Exact",
      blocks: [
        {
          type: "paragraph",
          text: "The bytecode says `size()` visits every node. I measured how long that takes at three sizes, against `isEmpty()` and against `LinkedBlockingQueue.size()`, which reads an `AtomicInteger` count:",
        },
        {
          type: "code",
          language: "java",
          title: "SizeCost.java",
          code: `import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.Queue;

public class SizeCost {
    static long sink;

    // Best of 5: average nanoseconds for one call of the given operation
    static double time(Runnable op, int calls) {
        long best = Long.MAX_VALUE;
        for (int rep = 0; rep < 5; rep++) {
            long t = System.nanoTime();
            for (int i = 0; i < calls; i++) op.run();
            best = Math.min(best, System.nanoTime() - t);
        }
        return best / (double) calls;
    }

    public static void main(String[] args) {
        String trip = "trip";
        for (int n : new int[] {1_000, 100_000, 1_000_000}) {
            ConcurrentLinkedQueue<String> clq = new ConcurrentLinkedQueue<>();
            LinkedBlockingQueue<String> lbq = new LinkedBlockingQueue<>();
            for (int i = 0; i < n; i++) { clq.offer(trip); lbq.offer(trip); }
            int calls = Math.max(20, 20_000_000 / n);
            double clqSize = time(() -> sink += clq.size(), calls);
            double clqEmpty = time(() -> sink += clq.isEmpty() ? 1 : 0, 1_000_000);
            double lbqSize = time(() -> sink += lbq.size(), 1_000_000);
            System.out.printf("%,9d elements: CLQ.size() %,12.0f ns   CLQ.isEmpty() %4.1f ns   LBQ.size() %4.1f ns%n",
                    n, clqSize, clqEmpty, lbqSize);
        }
        System.out.println("sink " + (sink > 0));
    }
}`,
        },
        {
          type: "output",
          text: `    1,000 elements: CLQ.size()        2,575 ns   CLQ.isEmpty()  4.0 ns   LBQ.size()  5.0 ns
  100,000 elements: CLQ.size()      353,859 ns   CLQ.isEmpty()  4.6 ns   LBQ.size()  4.8 ns
1,000,000 elements: CLQ.size()    3,628,984 ns   CLQ.isEmpty()  3.9 ns   LBQ.size()  4.2 ns`,
        },
        {
          type: "list",
          items: [
            "**`size()` grew linearly with the queue:** about 2.5 microseconds at 1,000 elements, 0.35 ms at 100,000 and 3.6 ms at a million. Over four runs the million-element walk took 3.2 to 4.4 ms. That's 3 to 4 ns per node, the cost of following one pointer that's probably not in the CPU cache.",
            "**`isEmpty()` took 2 to 7 ns at every size** across the runs, as did `LinkedBlockingQueue.size()`. A metrics gauge that calls `size()` on a busy `ConcurrentLinkedQueue` every few milliseconds can easily burn a core by itself when the queue backs up, exactly when the service can least afford it.",
          ],
        },
        {
          type: "paragraph",
          text: "Slow is one problem; wrong is another. Here two threads keep moving elements from the front of a 10,000-element queue to its back (`poll` then `offer`). At any instant the true size is between 9,998 and 10,000, because each mover holds at most one element. Meanwhile `main` calls `size()` 2,000 times:",
        },
        {
          type: "code",
          language: "java",
          title: "SizeDrift.java",
          code: `import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;

public class SizeDrift {
    public static void main(String[] args) throws Exception {
        int n = 10_000, movers = 2;
        ConcurrentLinkedQueue<Integer> q = new ConcurrentLinkedQueue<>();
        for (int i = 0; i < n; i++) q.offer(i);
        AtomicBoolean stop = new AtomicBoolean();
        Thread[] ts = new Thread[movers];
        for (int m = 0; m < movers; m++) {
            ts[m] = Thread.ofPlatform().start(() -> {
                while (!stop.get()) {
                    Integer x = q.poll();          // take one from the front ...
                    if (x != null) q.offer(x);     // ... and put it back at the end
                }
            });
        }
        // The true size is always between n - movers and n: each mover holds at most one element
        int min = Integer.MAX_VALUE, max = 0, outside = 0, calls = 2_000;
        for (int i = 0; i < calls; i++) {
            int s = q.size();
            min = Math.min(min, s);
            max = Math.max(max, s);
            if (s < n - movers || s > n) outside++;
        }
        stop.set(true);
        for (Thread t : ts) t.join();
        System.out.printf("true size always %,d to %,d; size() returned %,d to %,d; %,d of %,d calls outside the possible range%n",
                n - movers, n, min, max, outside, calls);
        System.out.println("after the movers stopped: size() = " + q.size());
    }
}`,
        },
        {
          type: "output",
          text: `true size always 9,998 to 10,000; size() returned 9,998 to 19,213; 1,897 of 2,000 calls outside the possible range
after the movers stopped: size() = 10000`,
        },
        {
          type: "list",
          items: [
            "**`size()` returned numbers up to 19,213 for a queue that never held more than 10,000.** In two more runs it returned 10,074 to 11,384 and 10,149 to 14,568, with 2,000 of 2,000 calls impossible. The walk moves from front to back while the movers take elements from in front of it and put them behind it, so the same element gets counted again when the walk reaches the tail.",
            "**After the movers stopped, `size()` was exactly 10,000.** It's only exact when nothing is changing, which is what the Javadoc means by \"not very useful in concurrent applications\".",
            "**Treat `size()` on these queues as a rough, expensive estimate.** If you need a reliable count (for a gauge, a limit or a decision), keep one yourself in a `LongAdder` or `AtomicInteger` next to the queue, or use a queue that keeps one, like `LinkedBlockingQueue`.",
          ],
        },
      ],
    },
    {
      title: "No Blocking: Busy Polling and No Backpressure",
      blocks: [
        {
          type: "paragraph",
          text: "A `ConcurrentLinkedQueue` has no `take()`. A consumer that wants the next element must decide what to do when `poll()` returns `null`. I sent one ride request every 10 ms for a second to a single consumer and measured its CPU time (with `ThreadMXBean.getCurrentThreadCpuTime`) and how long each request waited between `offer` and being taken, for five waiting strategies:",
        },
        {
          type: "code",
          language: "java",
          title: "PollingCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.Arrays;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;

public class PollingCost {
    static final int REQUESTS = 100;          // one ride request every 10 ms, for about a second
    static final ThreadMXBean MX = ManagementFactory.getThreadMXBean();

    interface Take { Long take() throws InterruptedException; }

    static void run(String label, java.util.Queue<Long> q, Take take) throws Exception {
        long[] delayUs = new long[REQUESTS];
        long[] cpuNs = new long[1];
        Thread consumer = Thread.ofPlatform().name("dispatcher").start(() -> {
            long cpu0 = MX.getCurrentThreadCpuTime();
            try {
                for (int i = 0; i < REQUESTS; i++) {
                    Long sentAt = take.take();
                    delayUs[i] = (System.nanoTime() - sentAt) / 1_000;
                }
            } catch (InterruptedException e) { return; }
            cpuNs[0] = MX.getCurrentThreadCpuTime() - cpu0;
        });
        long t0 = System.nanoTime();
        for (int i = 0; i < REQUESTS; i++) {
            Thread.sleep(10);
            q.offer(System.nanoTime());
        }
        consumer.join();
        long wall = (System.nanoTime() - t0) / 1_000_000;
        Arrays.sort(delayUs);
        System.out.printf("%-30s CPU %5d ms of %4d ms wall   hand-off median %4d us, max %5d us%n",
                label, cpuNs[0] / 1_000_000, wall, delayUs[REQUESTS / 2], delayUs[REQUESTS - 1]);
    }

    public static void main(String[] args) throws Exception {
        ConcurrentLinkedQueue<Long> clq = new ConcurrentLinkedQueue<>();
        run("CLQ, spin on poll()", clq, () -> {
            Long x;
            while ((x = clq.poll()) == null) { }
            return x;
        });
        run("CLQ, poll() + onSpinWait()", clq, () -> {
            Long x;
            while ((x = clq.poll()) == null) Thread.onSpinWait();
            return x;
        });
        run("CLQ, poll() + parkNanos(100us)", clq, () -> {
            Long x;
            while ((x = clq.poll()) == null) LockSupport.parkNanos(100_000);
            return x;
        });
        run("CLQ, poll() + sleep(5 ms)", clq, () -> {
            Long x;
            while ((x = clq.poll()) == null) Thread.sleep(5);
            return x;
        });
        LinkedBlockingQueue<Long> lbq = new LinkedBlockingQueue<>();
        run("LinkedBlockingQueue.take()", lbq, lbq::take);
    }
}`,
        },
        {
          type: "output",
          text: `CLQ, spin on poll()            CPU  1010 ms of 1011 ms wall   hand-off median   10 us, max   317 us
CLQ, poll() + onSpinWait()     CPU  1009 ms of 1010 ms wall   hand-off median   21 us, max    64 us
CLQ, poll() + parkNanos(100us) CPU    61 ms of 1010 ms wall   hand-off median   88 us, max   216 us
CLQ, poll() + sleep(5 ms)      CPU     9 ms of 1015 ms wall   hand-off median 2060 us, max  5164 us
LinkedBlockingQueue.take()     CPU     7 ms of 1022 ms wall   hand-off median   90 us, max   373 us`,
        },
        {
          type: "list",
          items: [
            "**Spinning cost a whole core for 100 events.** Both spin loops used about 1,000 ms of CPU per second of wall time, in both runs, whether or not they called `Thread.onSpinWait()` (which only hints to the CPU that this is a spin loop; it doesn't give the core away). They had the lowest hand-off delay, 10 to 46 microseconds median, but on a busy machine the first run's spinner also hit a 7.4 ms worst case when the OS took its core away anyway.",
            "**Sleeping saved CPU and cost latency:** 6 to 9 ms of CPU, but a median wait of 2 to 2.5 ms and a maximum of over 5 ms, because a request that arrives just after the check waits for the whole sleep.",
            "**Parking 100 microseconds between polls was a reasonable middle**, 61 to 68 ms of CPU and a median of about 0.1 ms; but I had to choose the number, and it's wrong for some load.",
            "**`LinkedBlockingQueue.take()` gave the best of both:** 7 to 10 ms of CPU and a median of 90 to 166 microseconds, the cost of one park and unpark. When a consumer waits for work, a blocking queue is the right tool; `ConcurrentLinkedQueue` suits consumers that always have something else to do (an event loop that drains the queue between other tasks) or producers and consumers that never wait.",
          ],
        },
        {
          type: "heading",
          text: "No bound means no backpressure",
        },
        {
          type: "paragraph",
          text: "The other half of \"never blocks\": `offer` always succeeds, so nothing ever slows a producer down. A producer of driver location pings feeding a consumer that needs about 2 microseconds per ping, first through a `ConcurrentLinkedQueue`, then through an `ArrayBlockingQueue` of 10,000 whose `put` waits when full, each with a 256 MB heap:",
        },
        {
          type: "code",
          language: "java",
          title: "NoBackpressure.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicLong;

public class NoBackpressure {
    record LocationPing(String driverId, double lat, double lon, long at) { }

    public static void main(String[] args) throws Exception {
        boolean bounded = args.length > 0 && args[0].equals("bounded");
        ConcurrentLinkedQueue<LocationPing> clq = new ConcurrentLinkedQueue<>();
        BlockingQueue<LocationPing> abq = new ArrayBlockingQueue<>(10_000);
        AtomicLong produced = new AtomicLong(), consumed = new AtomicLong();

        Thread consumer = Thread.ofPlatform().daemon().start(() -> {
            while (true) {
                LocationPing p = bounded ? abq.poll() : clq.poll();
                if (p == null) { Thread.onSpinWait(); continue; }
                consumed.incrementAndGet();
                long spin = System.nanoTime() + 2_000;          // the consumer needs about 2 us per ping
                while (System.nanoTime() < spin) Thread.onSpinWait();
            }
        });
        Thread producer = Thread.ofPlatform().daemon().start(() -> {
            try {
                for (long i = 0; ; i++) {
                    LocationPing p = new LocationPing("D" + (i % 5_000), 22.57, 88.36, i);
                    if (bounded) abq.put(p); else clq.offer(p); // put() waits when full; offer() never does
                    produced.incrementAndGet();
                }
            } catch (InterruptedException e) { }
        });
        long t0 = System.nanoTime();
        for (int s = 1; s <= 8; s++) {
            Thread.sleep(1_000);
            long backlog = produced.get() - consumed.get();
            Runtime rt = Runtime.getRuntime();
            System.out.printf("%s t=%ds produced %,11d consumed %,9d backlog %,11d heap used %4d MB%n",
                    bounded ? "ArrayBlockingQueue(10k)" : "ConcurrentLinkedQueue  ", s, produced.get(), consumed.get(),
                    backlog, (rt.totalMemory() - rt.freeMemory()) >> 20);
            if (!producer.isAlive()) { System.out.println("producer died"); break; }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx256m NoBackpressure.java
java -Xmx256m NoBackpressure.java bounded`,
        },
        {
          type: "output",
          text: `ConcurrentLinkedQueue   t=1s produced   1,642,256 consumed   105,937 backlog   1,535,034 heap used  184 MB
ConcurrentLinkedQueue   t=2s produced   2,438,402 consumed   138,223 backlog   2,300,188 heap used  249 MB
ConcurrentLinkedQueue   t=3
Exception: java.lang.OutOfMemoryError thrown from the UncaughtExceptionHandler in thread "Thread-1"

Exception: java.lang.OutOfMemoryError thrown from the UncaughtExceptionHandler in thread "main"
ArrayBlockingQueue(10k) t=1s produced     304,096 consumed   294,096 backlog      10,000 heap used   12 MB
ArrayBlockingQueue(10k) t=2s produced     636,306 consumed   626,331 backlog       9,982 heap used   42 MB
ArrayBlockingQueue(10k) t=3s produced     957,343 consumed   947,344 backlog       9,997 heap used   29 MB
ArrayBlockingQueue(10k) t=4s produced   1,281,106 consumed 1,271,107 backlog       9,999 heap used   60 MB
ArrayBlockingQueue(10k) t=5s produced   1,501,458 consumed 1,491,458 backlog      10,000 heap used   10 MB
ArrayBlockingQueue(10k) t=6s produced   1,682,071 consumed 1,672,072 backlog      10,000 heap used   27 MB
ArrayBlockingQueue(10k) t=7s produced   1,960,001 consumed 1,950,004 backlog       9,998 heap used   53 MB
ArrayBlockingQueue(10k) t=8s produced   2,107,038 consumed 2,097,426 backlog       9,618 heap used   67 MB`,
        },
        {
          type: "list",
          items: [
            "**The unbounded queue died in under 3 seconds.** The backlog grew by over a million pings per second until the heap was full, and the JVM ended with `OutOfMemoryError` (thrown so deep that even the uncaught-exception handler couldn't run). It ended the same way in a second run. Every queued ping was a stale location by the time it would have been read.",
            "**The consumer was slower with the unbounded queue,** about 105,000 pings in the first second against 294,000 with the bounded one, because the garbage collector was busy copying a growing heap. A backlog makes the consumer slower, which makes the backlog grow faster.",
            "**The bounded queue held the backlog at 10,000 and the heap under 70 MB** for all 8 seconds. `put` made the producer wait for the consumer: that's backpressure. With a `ConcurrentLinkedQueue`, any bound has to be built by hand (a counter checked before `offer`, or a `Semaphore`), and the policy for a full queue (drop the oldest ping, reject, slow down) has to be decided explicitly.",
          ],
        },
      ],
    },
    {
      title: "ConcurrentSkipListMap: Sorted Navigation and Live Views",
      blocks: [
        {
          type: "paragraph",
          text: "A `ConcurrentSkipListMap` implements `ConcurrentNavigableMap`: everything a `TreeMap` can do, safely from many threads. The methods that make it worth its cost are the ones a hash map can't offer: the nearest key in either direction, and ranges. Drivers keyed by their ETA to a rider, in seconds:",
        },
        {
          type: "code",
          language: "java",
          title: "NavigableViews.java",
          code: `import java.util.Iterator;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentNavigableMap;
import java.util.concurrent.ConcurrentSkipListMap;

public class NavigableViews {
    public static void main(String[] args) {
        // ETA in seconds to the rider -> driver
        ConcurrentSkipListMap<Integer, String> byEta = new ConcurrentSkipListMap<>(Map.of(
                95, "Asha", 140, "Ravi", 210, "Imran", 260, "Meera", 330, "Tapas", 420, "Joy"));

        System.out.println("firstEntry       " + byEta.firstEntry());
        System.out.println("ceilingKey(200)  " + byEta.ceilingKey(200) + "   (smallest key >= 200)");
        System.out.println("floorEntry(200)  " + byEta.floorEntry(200) + "   (largest key <= 200)");
        System.out.println("higherKey(420)   " + byEta.higherKey(420));
        ConcurrentNavigableMap<Integer, String> within4Min = byEta.headMap(240);          // keys < 240
        ConcurrentNavigableMap<Integer, String> band = byEta.subMap(120, true, 300, true); // 120 <= key <= 300
        System.out.println("headMap(240)     " + within4Min);
        System.out.println("subMap(120..300) " + band);
        System.out.println("descendingMap    " + byEta.descendingMap());

        // Views are live: a put on the map shows up in every view whose range contains the key
        byEta.put(180, "Sana");
        byEta.put(500, "Dev");
        System.out.println("after put(180), put(500): headMap(240) " + within4Min + ", size " + within4Min.size());

        // A view rejects keys outside its range
        try { within4Min.put(300, "Nope"); } catch (IllegalArgumentException e) { System.out.println("headMap(240).put(300): " + e); }

        // Modify while iterating: weakly consistent, never ConcurrentModificationException
        Iterator<Map.Entry<Integer, String>> it = byEta.entrySet().iterator();
        StringBuilder seen = new StringBuilder();
        while (it.hasNext()) {
            Map.Entry<Integer, String> e = it.next();
            seen.append(e.getKey()).append(' ');
            if (e.getKey() == 140) { byEta.remove(210); byEta.put(150, "Late"); byEta.put(100, "Behind"); }
        }
        System.out.println("CSLM iteration while removing 210, adding 150 and 100: " + seen.toString().trim());
        System.out.println("map now: " + byEta.keySet());

        NavigableMap<Integer, String> tree = new TreeMap<>(byEta);
        try {
            for (Integer k : tree.keySet()) if (k == 140) tree.put(150, "Late again");
        } catch (Exception e) {
            System.out.println("TreeMap, same kind of change: " + e.getClass().getName());
        }

        // pollFirstEntry: atomically take the nearest driver
        System.out.println("pollFirstEntry   " + byEta.pollFirstEntry() + ", then firstKey " + byEta.firstKey());
        try { byEta.putFirst(1, "x"); } catch (UnsupportedOperationException e) { System.out.println("putFirst: " + e); }
    }
}`,
        },
        {
          type: "output",
          text: `firstEntry       95=Asha
ceilingKey(200)  210   (smallest key >= 200)
floorEntry(200)  140=Ravi   (largest key <= 200)
higherKey(420)   null
headMap(240)     {95=Asha, 140=Ravi, 210=Imran}
subMap(120..300) {140=Ravi, 210=Imran, 260=Meera}
descendingMap    {420=Joy, 330=Tapas, 260=Meera, 210=Imran, 140=Ravi, 95=Asha}
after put(180), put(500): headMap(240) {95=Asha, 140=Ravi, 180=Sana, 210=Imran}, size 4
headMap(240).put(300): java.lang.IllegalArgumentException: key out of range
CSLM iteration while removing 210, adding 150 and 100: 95 140 180 260 330 420 500
map now: [95, 100, 140, 150, 180, 260, 330, 420, 500]
TreeMap, same kind of change: java.util.ConcurrentModificationException
pollFirstEntry   95=Asha, then firstKey 100
putFirst: java.lang.UnsupportedOperationException`,
        },
        {
          type: "list",
          items: [
            "**`ceilingKey`, `floorEntry`, `higherKey` and `lowerKey` answer \"nearest\" questions in O(log n).** They return `null` when nothing qualifies (`higherKey(420)` with 420 the largest key), unlike `firstKey()` and `lastKey()`, which throw `NoSuchElementException` on an empty map.",
            "**`headMap`, `tailMap` and `subMap` are views, not copies.** After `put(180)`, the `headMap(240)` created earlier contained 180 too; `put(500)` didn't appear because 500 is outside its range. A view also refuses keys outside its range: `IllegalArgumentException: key out of range`.",
            "**Iteration is weakly consistent: no exception, no snapshot.** While iterating, I removed 210 (not seen: removed before the iterator got there), added 100 (not seen: behind the iterator) and added 150 (also **not** seen, although it sorts after 140, where the iterator was). The iterator had already read its next node, 180, when it returned 140, so a key inserted between them was skipped. The guarantee is only this: every key present for the whole iteration is returned once, in order; keys added or removed during it may or may not be.",
            "**The same change on a `TreeMap` threw `ConcurrentModificationException`**, which is at least loud. A skip-list view never fails, so code that needs a consistent picture (a report that must add up) has to copy first and accept that the copy is also weakly consistent.",
            "**`pollFirstEntry()` removes and returns the smallest entry atomically:** two threads calling it never get the same entry. It's the building block for \"take the next due job\" and \"take the nearest driver\". The returned entry is an immutable snapshot (`setValue` throws `UnsupportedOperationException`).",
          ],
        },
        {
          type: "heading",
          text: "size() on the map vs size() on a view",
        },
        {
          type: "paragraph",
          text: "The map's `size()` reads the `LongAdder`. A view has no counter of its own, so its `size()` counts the entries in its range:",
        },
        {
          type: "code",
          language: "java",
          title: "SkipSizeCost.java",
          code: `import java.util.concurrent.ConcurrentNavigableMap;
import java.util.concurrent.ConcurrentSkipListMap;

public class SkipSizeCost {
    static long sink;

    static double nanos(Runnable op, int calls) {
        long best = Long.MAX_VALUE;
        for (int rep = 0; rep < 5; rep++) {
            long t = System.nanoTime();
            for (int i = 0; i < calls; i++) op.run();
            best = Math.min(best, System.nanoTime() - t);
        }
        return best / (double) calls;
    }

    public static void main(String[] args) {
        ConcurrentSkipListMap<Integer, Boolean> m = new ConcurrentSkipListMap<>();
        for (int k = 0; k < 1_000_000; k++) m.put(k, Boolean.TRUE);
        ConcurrentNavigableMap<Integer, Boolean> half = m.headMap(500_000);
        ConcurrentNavigableMap<Integer, Boolean> tiny = m.subMap(1_000, 1_010);
        System.out.printf("map.size()                    %,12.1f ns  -> %,d%n", nanos(() -> sink += m.size(), 1_000_000), m.size());
        System.out.printf("map.isEmpty()                 %,12.1f ns%n", nanos(() -> sink += m.isEmpty() ? 1 : 0, 1_000_000));
        System.out.printf("headMap(500_000).size()       %,12.1f ns  -> %,d%n", nanos(() -> sink += half.size(), 20), half.size());
        System.out.printf("subMap(1_000, 1_010).size()   %,12.1f ns  -> %,d%n", nanos(() -> sink += tiny.size(), 100_000), tiny.size());
        System.out.printf("headMap(500_000).isEmpty()    %,12.1f ns%n", nanos(() -> sink += half.isEmpty() ? 1 : 0, 1_000_000));
        System.out.println(sink > 0);
    }
}`,
        },
        {
          type: "output",
          text: `map.size()                             3.7 ns  -> 1,000,000
map.isEmpty()                          2.8 ns
headMap(500_000).size()        2,519,039.5 ns  -> 500,000
subMap(1_000, 1_010).size()           93.2 ns  -> 10
headMap(500_000).isEmpty()             6.8 ns
true`,
        },
        {
          type: "paragraph",
          text: "The map's `size()` took 2 to 4 ns across two runs; `headMap(500_000).size()` took 2.3 to 2.5 ms, a walk over half a million nodes, and a 10-key `subMap` cost 81 to 93 ns. So \"how many drivers within 4 minutes?\" costs time proportional to the answer, and \"what rank is this driver?\" (`headSet(x).size()`) costs time proportional to the rank, as the leaderboard example measures. `isEmpty()` on a view is cheap: it only looks for the first key in range.",
        },
      ],
    },
    {
      title: "Skip List vs Synchronized TreeMap vs ConcurrentHashMap",
      blocks: [
        {
          type: "paragraph",
          text: "When a team needs a concurrent map, the realistic choices are `ConcurrentHashMap` (no order), `Collections.synchronizedNavigableMap(new TreeMap<>())` (order, one lock) and `ConcurrentSkipListMap` (order, no lock). I measured all three with 100,000 keys, probing a range of 200,000 so half the lookups miss, with 1 and 8 threads, 500 ms per measurement, best of three:",
        },
        {
          type: "code",
          language: "java",
          title: "SortedMapBench.java",
          code: `import java.util.Collections;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.LongAdder;

public class SortedMapBench {
    static final int KEYS = 100_000, RANGE = KEYS * 2;   // half the probed keys exist
    static final Integer[] K = new Integer[RANGE];

    interface Op { void run(int key, int dice); }

    // threads run 'op' for 500 ms; returns million operations per second (best of 3)
    static double measure(int threads, Op op) throws Exception {
        double best = 0;
        for (int rep = 0; rep < 3; rep++) {
            AtomicBoolean stop = new AtomicBoolean();
            LongAdder ops = new LongAdder();
            Thread[] ts = new Thread[threads];
            for (int t = 0; t < threads; t++) {
                ts[t] = Thread.ofPlatform().start(() -> {
                    ThreadLocalRandom r = ThreadLocalRandom.current();
                    long n = 0;
                    while (!stop.get()) {
                        for (int i = 0; i < 100; i++) op.run(r.nextInt(RANGE), r.nextInt(100));
                        n += 100;
                    }
                    ops.add(n);
                });
            }
            long t0 = System.nanoTime();
            Thread.sleep(500);
            stop.set(true);
            for (Thread t : ts) t.join();
            best = Math.max(best, ops.sum() / ((System.nanoTime() - t0) / 1e9) / 1e6);
        }
        return best;
    }

    static <M extends Map<Integer, Integer>> M fill(M m) {
        for (int i = 0; i < RANGE; i += 2) m.put(K[i], i);
        return m;
    }

    public static void main(String[] args) throws Exception {
        for (int i = 0; i < RANGE; i++) K[i] = i;
        for (int threads : new int[] {1, 8}) {
            ConcurrentSkipListMap<Integer, Integer> cslm = fill(new ConcurrentSkipListMap<>());
            NavigableMap<Integer, Integer> sync = Collections.synchronizedNavigableMap(fill(new TreeMap<>()));
            ConcurrentHashMap<Integer, Integer> chm = fill(new ConcurrentHashMap<>());

            // 90% get, 5% put, 5% remove
            System.out.printf("%d thread(s), 90%% get / 5%% put / 5%% remove (million ops/s):%n", threads);
            System.out.printf("  ConcurrentSkipListMap      %6.1f%n", measure(threads, (k, d) -> {
                if (d < 90) cslm.get(K[k]); else if (d < 95) cslm.put(K[k], k); else cslm.remove(K[k]); }));
            System.out.printf("  synchronized TreeMap       %6.1f%n", measure(threads, (k, d) -> {
                if (d < 90) sync.get(K[k]); else if (d < 95) sync.put(K[k], k); else sync.remove(K[k]); }));
            System.out.printf("  ConcurrentHashMap          %6.1f%n", measure(threads, (k, d) -> {
                if (d < 90) chm.get(K[k]); else if (d < 95) chm.put(K[k], k); else chm.remove(K[k]); }));

            // 90% ceilingKey (nearest key at or above), 5% put, 5% remove: no ConcurrentHashMap equivalent
            System.out.printf("%d thread(s), 90%% ceilingKey / 5%% put / 5%% remove (million ops/s):%n", threads);
            System.out.printf("  ConcurrentSkipListMap      %6.1f%n", measure(threads, (k, d) -> {
                if (d < 90) cslm.ceilingKey(K[k]); else if (d < 95) cslm.put(K[k], k); else cslm.remove(K[k]); }));
            System.out.printf("  synchronized TreeMap       %6.1f%n", measure(threads, (k, d) -> {
                if (d < 90) sync.ceilingKey(K[k]); else if (d < 95) sync.put(K[k], k); else sync.remove(K[k]); }));
        }
    }
}`,
        },
        {
          type: "output",
          text: `1 thread(s), 90% get / 5% put / 5% remove (million ops/s):
  ConcurrentSkipListMap         1.3
  synchronized TreeMap          2.2
  ConcurrentHashMap            11.3
1 thread(s), 90% ceilingKey / 5% put / 5% remove (million ops/s):
  ConcurrentSkipListMap         1.4
  synchronized TreeMap          1.5
8 thread(s), 90% get / 5% put / 5% remove (million ops/s):
  ConcurrentSkipListMap         2.5
  synchronized TreeMap          0.9
  ConcurrentHashMap            17.7
8 thread(s), 90% ceilingKey / 5% put / 5% remove (million ops/s):
  ConcurrentSkipListMap         2.2
  synchronized TreeMap          1.3`,
        },
        {
          type: "list",
          items: [
            "**On one thread, the `TreeMap` was faster**: in two of three runs it did 1.5 to 2.2 million operations per second against 1.2 to 1.4 for the skip list; in the third, with the machine at its busiest, everything was slower (0.4 to 1.5) and the `TreeMap` still led. A red-black tree touches fewer nodes per lookup than a skip list, and an uncontended lock is cheap. If only one thread uses the map, a skip list is pure overhead.",
            "**With 8 threads, the skip list scaled and the `TreeMap` didn't.** The skip list did 2.2 to 4.2 million operations per second; the synchronized `TreeMap` stayed at 0.9 to 1.9, no better than one thread and in the first run worse, because 8 threads queued for one lock. The skip list's absolute numbers were modest because every operation is a chain of cache misses through a 100,000-entry structure, and the machine was running other benchmarks (load average 10 to 14 during these runs), so treat the ranges as rough.",
            "**`ConcurrentHashMap` was in a different league for point lookups:** 4.6 to 11.3 million per second on one thread and 14 to 35 million on eight, 6 to 16 times the skip list, in every run. A hash lookup is one or two cache misses; a skip-list lookup is a dozen or more. If you never need order, nearest-key queries or ranges, use `ConcurrentHashMap`.",
            "**Nearest-key queries are the skip list's home ground:** `ceilingKey` has no `ConcurrentHashMap` equivalent at all, and with 8 threads the skip list did it about 1.4 to 2.5 times faster than the locked tree.",
          ],
        },
        {
          type: "heading",
          text: "Memory per entry",
        },
        {
          type: "paragraph",
          text: "I measured the heap used per entry by each structure after a full GC, with a million `Integer` keys created beforehand so they aren't counted, and one shared value object:",
        },
        {
          type: "code",
          language: "java",
          title: "EntryCost.java",
          code: `import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.function.Supplier;

public class EntryCost {
    static final int N = 1_000_000;
    static final Integer[] KEYS = new Integer[N];       // created once, so key objects are not counted
    static final Object VALUE = new Object();

    static long usedAfterGc() throws InterruptedException {
        long used = Long.MAX_VALUE;
        for (int i = 0; i < 5; i++) {
            System.gc();
            Thread.sleep(50);
            Runtime rt = Runtime.getRuntime();
            used = Math.min(used, rt.totalMemory() - rt.freeMemory());
        }
        return used;
    }

    static void measure(String label, Supplier<Object> build) throws InterruptedException {
        long before = usedAfterGc();
        Object structure = build.get();
        long after = usedAfterGc();
        System.out.printf("%-24s %5.1f bytes per entry%n", label, (after - before) / (double) N);
        if (structure.hashCode() == 42) System.out.println();   // keep it reachable until measured
    }

    static Object fill(Map<Integer, Object> m) {
        for (Integer k : KEYS) m.put(k, VALUE);
        return m;
    }

    public static void main(String[] args) throws Exception {
        for (int i = 0; i < N; i++) KEYS[i] = i * 7;     // spread, not sorted by hash
        measure("ConcurrentSkipListMap", () -> fill(new ConcurrentSkipListMap<>()));
        measure("TreeMap", () -> fill(new TreeMap<>()));
        measure("ConcurrentHashMap", () -> fill(new ConcurrentHashMap<>()));
        measure("ConcurrentLinkedQueue", () -> {
            ConcurrentLinkedQueue<Object> q = new ConcurrentLinkedQueue<>();
            for (Integer k : KEYS) q.offer(k);
            return q;
        });
    }
}`,
        },
        {
          type: "output",
          text: `ConcurrentSkipListMap     36.0 bytes per entry
TreeMap                   40.0 bytes per entry
ConcurrentHashMap         41.5 bytes per entry
ConcurrentLinkedQueue     24.0 bytes per entry`,
        },
        {
          type: "paragraph",
          text: "Both runs gave identical numbers. The skip list's 36 bytes is a 24-byte `Node` plus half a 24-byte `Index` (0.50 per key, as `SkipLevels` counted). A `TreeMap.Entry` holds a key, a value, left, right and parent pointers and a colour flag: 40 bytes. `ConcurrentHashMap` uses a 32-byte node plus its table; at a million entries with the default load factor the table has 2,097,152 slots of 4 bytes, about 8.4 bytes per entry, which accounts for about 40 of the 41.5 bytes. The queue's node is the 24 bytes worked out from `javap`. So the skip list's express lanes are not a memory penalty compared with its alternatives.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `ClqInternals` and a `put`, `get` and `remove` on a skip list:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`new ConcurrentLinkedQueue<>()`** creates one dummy `Node` with a `null` item; `head` and `tail` both point to it.",
            "**`offer(T1)`** creates a node (after `Objects.requireNonNull`), reads `tail` (the dummy), sees `next == null` and CASes the dummy's `next` to the new node. It found the last node at `tail` itself, so it leaves `tail` alone: `tail` is now one behind. Returns `true`.",
            "**`offer(T2)`** starts at `tail` (still the dummy), finds `next` is not `null`, hops to the T1 node, CASes its `next` to the T2 node, and because it had to hop, tries `weakCompareAndSet(tail, dummy, T2 node)`. `tail` catches up.",
            "**Two producers at once:** both read the same last node and both try the CAS on its `next`. One wins and returns. The loser re-reads `next`, hops to the winner's node and CASes after it. Nobody waited; the loser just did one more loop.",
            "**`poll()`** reads `head` (the dummy). Its item is `null`, so it moves to `next` (T1), CASes the item from T1 to `null` and, having stepped past `head`, calls `updateHead`: CAS `head` forward, then `setRelease(oldHead.next, oldHead)`, linking the old dummy to itself. Returns T1.",
            "**A thread that was walking through the old dummy** (a slow `size()`, an iterator, an `offer` starting from an outdated `tail`) reads `next == itself`, knows it fell off the list, and restarts from `head` (`size()` restarts its count from zero).",
            "**`poll()` on an empty queue** finds no live item and `next == null` and returns `null`. Nothing parks, ever.",
            "**`skipList.put(155, v)`** calls `doPut`: `findPredecessor` walks right and down through the `Index` levels to the base node just before 155, then walks the base list to the exact spot. A CAS of the predecessor's `next` links the new `Node` in. The entry now exists; `addCount(1)` bumps the `LongAdder`.",
            "**Index tower:** a random number decides: 3 times in 4, no index. Otherwise, one `Index` per extra 1-bit, chained by `down`, spliced into each level with a CAS on `right` (`addIndices`), and possibly a new top level CASed into `head`.",
            "**`get(155)`** walks the same path with plain reads and returns the node's `val`; no lock, no CAS.",
            "**`remove(155)`** finds the node, CASes `val` to `null` (deleted from this moment), appends a marker node after it, CASes the predecessor's `next` past both, reduces the number of levels if the top became empty, and subtracts 1 from the `LongAdder`.",
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
          title: "QueuesTour.java",
          code: `import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.ConcurrentSkipListSet;

public class QueuesTour {
    public static void main(String[] args) {
        // 1. ConcurrentLinkedQueue: unbounded FIFO, never blocks, null means "empty right now"
        ConcurrentLinkedQueue<String> events = new ConcurrentLinkedQueue<>(List.of("TRIP_STARTED", "TRIP_ENDED"));
        events.offer("FARE_CHARGED");                          // always true: unbounded
        System.out.println("1. peek " + events.peek() + ", poll " + events.poll() + ", left " + events);
        System.out.println("   poll on empty: " + new ConcurrentLinkedQueue<String>().poll());
        try { events.offer(null); } catch (NullPointerException e) { System.out.println("   offer(null): NullPointerException"); }

        // 2. ConcurrentLinkedDeque: both ends; push/pop use the front (a stack)
        ConcurrentLinkedDeque<String> recent = new ConcurrentLinkedDeque<>();
        recent.offerFirst("trip-2"); recent.offerFirst("trip-3"); recent.offerLast("trip-1");
        System.out.println("2. " + recent + ", peekFirst " + recent.peekFirst() + ", pollLast " + recent.pollLast());
        recent.push("trip-4");
        System.out.println("   after push: " + recent + ", pop " + recent.pop());

        // 3. ConcurrentSkipListMap: sorted, concurrent, navigable
        ConcurrentSkipListMap<Integer, String> etaToDriver = new ConcurrentSkipListMap<>();
        etaToDriver.put(240, "Meera"); etaToDriver.put(90, "Asha"); etaToDriver.put(150, "Ravi");
        System.out.println("3. " + etaToDriver + ", first " + etaToDriver.firstKey()
                + ", ceilingEntry(100) " + etaToDriver.ceilingEntry(100) + ", headMap(200) " + etaToDriver.headMap(200));
        System.out.println("   putIfAbsent(90) -> " + etaToDriver.putIfAbsent(90, "Joy")
                + ", merge(150) -> " + etaToDriver.merge(150, "+Sana", String::concat));
        System.out.println("   pollFirstEntry " + etaToDriver.pollFirstEntry() + ", left " + etaToDriver);

        // 4. ConcurrentSkipListSet: a sorted set backed by a ConcurrentSkipListMap
        ConcurrentSkipListSet<String> zones = new ConcurrentSkipListSet<>(List.of("SALT-LAKE", "HOWRAH", "NEW-TOWN"));
        System.out.println("4. " + zones + ", ceiling(\\"I\\") " + zones.ceiling("I") + ", descending " + zones.descendingSet());
    }
}`,
        },
        {
          type: "output",
          text: `1. peek TRIP_STARTED, poll TRIP_STARTED, left [TRIP_ENDED, FARE_CHARGED]
   poll on empty: null
   offer(null): NullPointerException
2. [trip-3, trip-2, trip-1], peekFirst trip-3, pollLast trip-1
   after push: [trip-4, trip-3, trip-2], pop trip-4
3. {90=Asha, 150=Ravi, 240=Meera}, first 90, ceilingEntry(100) 150=Ravi, headMap(200) {90=Asha, 150=Ravi}
   putIfAbsent(90) -> Asha, merge(150) -> Ravi+Sana
   pollFirstEntry 90=Asha, left {150=Ravi+Sana, 240=Meera}
4. [HOWRAH, NEW-TOWN, SALT-LAKE], ceiling("I") NEW-TOWN, descending [SALT-LAKE, NEW-TOWN, HOWRAH]`,
        },
        {
          type: "paragraph",
          text: "The output is deterministic. Note `push` and `pop` on the deque work at the **front**, so it behaves as a stack, and `ConcurrentSkipListSet` is just a `ConcurrentSkipListMap` whose values are all the same placeholder object (`javap -p` shows its only instance field is `private final ConcurrentNavigableMap<E, Object> m`).",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Expiring ride offers, oldest first",
        },
        {
          type: "code",
          language: "java",
          title: "OfferExpiry.java",
          code: `import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.atomic.AtomicInteger;

public class OfferExpiry {
    // Sorted by expiry time, then by id, so two offers expiring in the same millisecond are both kept
    record Due(long expiresAt, String offerId) { }
    static final Comparator<Due> ORDER = Comparator.comparingLong(Due::expiresAt).thenComparing(Due::offerId);

    public static void main(String[] args) throws Exception {
        ConcurrentSkipListMap<Due, String> pending = new ConcurrentSkipListMap<>(ORDER);
        AtomicInteger seq = new AtomicInteger();

        // Four dispatch threads each send 2,500 offers; each offer expires 15 s after a send time in 0..59 s
        Thread[] dispatchers = new Thread[4];
        for (int d = 0; d < 4; d++) {
            int lane = d;
            dispatchers[d] = Thread.ofPlatform().start(() -> {
                for (int i = 0; i < 2_500; i++) {
                    long sentAt = (i * 4L + lane) % 60 * 1_000;          // many offers share a send second
                    String id = "offer-" + seq.incrementAndGet();
                    pending.put(new Due(sentAt + 15_000, id), "driver-" + (i % 300));
                }
            });
        }
        for (Thread t : dispatchers) t.join();
        System.out.printf("pending %,d offers, earliest expiry %d ms, latest %d ms%n",
                pending.size(), pending.firstKey().expiresAt(), pending.lastKey().expiresAt());

        // The sweeper: everything due at or before 'now' is removed, oldest first
        for (long now : new long[] {20_000, 40_000, 80_000}) {
            int expired = 0;
            Map.Entry<Due, String> e;
            while ((e = pending.firstEntry()) != null && e.getKey().expiresAt() <= now) {
                if (pending.remove(e.getKey(), e.getValue())) expired++;   // another sweeper may have taken it
            }
            System.out.printf("now=%,6d ms: expired %,5d, still pending %,5d%n", now, expired, pending.size());
        }

        // Same job with the range view: one call drops every key below the cut-off
        ConcurrentSkipListMap<Due, String> again = new ConcurrentSkipListMap<>(ORDER);
        for (int i = 0; i < 10_000; i++) again.put(new Due((i % 60) * 1_000L + 15_000, "o" + i), "d");
        again.headMap(new Due(40_000, ""), false).clear();        // "" sorts before every real id
        System.out.printf("headMap(40 s).clear(): %,d left, first expiry now %,d ms%n", again.size(), again.firstKey().expiresAt());
    }
}`,
        },
        {
          type: "output",
          text: `pending 10,000 offers, earliest expiry 15000 ms, latest 74000 ms
now=20,000 ms: expired 1,002, still pending 8,998
now=40,000 ms: expired 3,340, still pending 5,658
now=80,000 ms: expired 5,658, still pending     0
headMap(40 s).clear(): 5,825 left, first expiry now 40,000 ms`,
        },
        {
          type: "list",
          items: [
            "**A sorted map is a natural timer list.** Each offer a driver hasn't answered expires 15 seconds after it was sent; the key is the expiry time, so the next one to expire is always `firstEntry()`. The sweeper removes from the front while the first key is due, and stops at the first key in the future without looking at the rest. Both runs printed the same numbers.",
            "**The key includes the offer ID.** Many offers expire in the same millisecond; a `Long` key would have kept only one of them per millisecond (the next mistake, and the production incident, are both about this).",
            "**`remove(key, value)` instead of `remove(key)`** makes two sweepers safe: only one of them succeeds for each entry, so an offer is never expired twice.",
            "**`headMap(cutoff).clear()` removes a whole range in one call.** The sentinel ID `\"\"` sorts before every real ID, so `new Due(40_000, \"\")` with `inclusive = false` means \"everything before 40 seconds\". `clear()` on a view removes entry by entry, so it's not atomic; other threads see the range shrink gradually.",
            "**For running the actions themselves, prefer a `ScheduledExecutorService`** (Executor Service Basics). A skip list fits when the timed items are data you also query, cancel or count, like these offers.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: A driver earnings leaderboard",
        },
        {
          type: "code",
          language: "java",
          title: "Leaderboard.java",
          code: `import java.util.Comparator;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListSet;
import java.util.concurrent.ThreadLocalRandom;

public class Leaderboard {
    record Score(long paise, String driverId) { }
    // Highest earnings first; ties broken by id so every driver keeps exactly one entry
    static final Comparator<Score> RANKING = Comparator.comparingLong(Score::paise).reversed().thenComparing(Score::driverId);

    final ConcurrentSkipListSet<Score> board = new ConcurrentSkipListSet<>(RANKING);
    final ConcurrentHashMap<String, Score> current = new ConcurrentHashMap<>();

    void addFare(String driverId, long paise) {
        current.compute(driverId, (id, old) -> {           // one update per driver at a time
            Score next = new Score((old == null ? 0 : old.paise()) + paise, id);
            if (old != null) board.remove(old);
            board.add(next);
            return next;
        });
    }

    public static void main(String[] args) throws Exception {
        Leaderboard lb = new Leaderboard();
        int drivers = 50_000;
        Thread[] ts = new Thread[8];
        for (int t = 0; t < ts.length; t++) {
            ts[t] = Thread.ofPlatform().start(() -> {
                ThreadLocalRandom r = ThreadLocalRandom.current();
                for (int i = 0; i < 100_000; i++) lb.addFare("D" + r.nextInt(drivers), r.nextLong(8_000, 60_000));
            });
        }
        for (Thread t : ts) t.join();
        System.out.println("entries " + lb.board.size() + " for " + lb.current.size() + " drivers");
        lb.board.stream().limit(3).forEach(s -> System.out.printf("  top: %-6s Rs %,.2f%n", s.driverId(), s.paise() / 100.0));

        // Rank = how many entries sort before mine: headSet(...).size() walks all of them
        long sink = 0, t0 = System.nanoTime();
        for (int i = 0; i < 2_000; i++) sink += lb.board.headSet(lb.current.get("D" + i)).size();
        long rankUs = (System.nanoTime() - t0) / 2_000 / 1_000;
        t0 = System.nanoTime();
        for (int i = 0; i < 1_000_000; i++) sink += lb.board.first().paise();
        long firstNs = (System.nanoTime() - t0) / 1_000_000;
        System.out.printf("rank via headSet().size(): %,d us on average; first(): %d ns%n",
                rankUs, firstNs);
    }
}`,
        },
        {
          type: "output",
          text: `entries 50000 for 50000 drivers
  top: D43566 Rs 12,972.85
  top: D30375 Rs 12,867.40
  top: D25426 Rs 12,029.10
rank via headSet().size(): 945 us on average; first(): 9 ns`,
        },
        {
          type: "list",
          items: [
            "**Exactly one entry per driver** after 800,000 concurrent fare updates from 8 threads, in both runs. Two things made that true: the comparator breaks ties by driver ID, and each driver's remove-then-add runs inside `ConcurrentHashMap.compute`, which holds that key's bin lock, so two updates for one driver can't interleave.",
            "**The score in the set is immutable.** To change a driver's earnings, the old `Score` is removed and a new one added. Mutating a field that the comparator reads, while the object is in the set, would leave it in the wrong position where no search can find it.",
            "**The top of the board is nearly free:** `first()` took 9 to 24 ns. A rank is not: `headSet(score).size()` walks every entry ahead of the driver, 0.9 to 2.1 ms on average for these 50,000 drivers. If ranks are needed often, compute them for everyone in one ordered pass, or cache them per minute.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Avoid"],
          rows: [
            ["Many threads hand work to consumers that should sleep when idle", "`LinkedBlockingQueue` or `ArrayBlockingQueue` with `take()`", "`ConcurrentLinkedQueue` with a spin or sleep loop"],
            ["A queue drained by a thread that always has other work (event loop, batcher, actor mailbox)", "`ConcurrentLinkedQueue`", "A blocking queue whose blocking is never used"],
            ["Producers must slow down when consumers fall behind", "A bounded `BlockingQueue` with `put` or `offer(e, timeout)`", "Any unbounded queue"],
            ["Add and remove at both ends from many threads (recent items, undo stacks, work to steal)", "`ConcurrentLinkedDeque`", "`synchronized` around an `ArrayDeque`, at high contention"],
            ["Concurrent map, point lookups only", "`ConcurrentHashMap`", "`ConcurrentSkipListMap` (6 to 16 times slower here)"],
            ["Concurrent map with order, nearest key or ranges", "`ConcurrentSkipListMap` / `ConcurrentSkipListSet`", "A synchronized `TreeMap` under contention"],
            ["Sorted map used by one thread, or rarely by others", "`TreeMap` (behind a lock if shared)", "A skip list's extra cost"],
            ["Time-ordered events, expiring offers, scheduled lookups that are also queried", "Skip list keyed by (time, id)", "A key of time alone"],
            ["Run tasks at a time", "`ScheduledExecutorService`", "A hand-written skip-list scheduler"],
            ["An exact count of a concurrent queue", "A separate `LongAdder`, or `LinkedBlockingQueue.size()`", "`ConcurrentLinkedQueue.size()`"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Checking isEmpty() and then calling poll()",
        },
        {
          type: "paragraph",
          text: "Each call is thread-safe, but the pair is a check-then-act race: between the two, another consumer can take the last element. Four consumers draining a million rides with `while (!rides.isEmpty()) { r = rides.poll(); ... }`:",
        },
        {
          type: "code",
          language: "java",
          title: "CheckThenAct.java",
          code: `import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.LongAdder;

public class CheckThenAct {
    public static void main(String[] args) throws Exception {
        ConcurrentLinkedQueue<String> rides = new ConcurrentLinkedQueue<>();
        for (int i = 0; i < 1_000_000; i++) rides.offer("ride-" + i);
        LongAdder taken = new LongAdder(), gotNull = new LongAdder();
        Thread[] ts = new Thread[4];
        for (int t = 0; t < ts.length; t++) {
            ts[t] = Thread.ofPlatform().start(() -> {
                while (!rides.isEmpty()) {          // check ...
                    String r = rides.poll();        // ... then act: another thread may have emptied it
                    if (r == null) gotNull.increment(); else taken.increment();
                }
            });
        }
        for (Thread t : ts) t.join();
        System.out.printf("taken %,d, poll() returned null after isEmpty() said false: %d times%n", taken.sum(), gotNull.sum());
    }
}`,
        },
        {
          type: "output",
          text: `taken 1,000,000, poll() returned null after isEmpty() said false: 2 times`,
        },
        {
          type: "paragraph",
          text: "It happened 1 or 2 times per run, always at the very end, which is exactly the kind of bug that passes tests and throws a `NullPointerException` once a week in production. The fix is to make `poll()` itself the check: `while ((r = rides.poll()) != null) { ... }`.",
        },
        {
          type: "heading",
          text: "Using size() for decisions, gauges or emptiness",
        },
        {
          type: "paragraph",
          text: "`size() == 0` is a full walk; use `isEmpty()`. `if (queue.size() < LIMIT) queue.offer(x)` is a slow check-then-act whose number can be off by thousands under load (`SizeDrift` saw 19,213 for 10,000). Keep your own `LongAdder` or use a bounded `BlockingQueue`.",
        },
        {
          type: "heading",
          text: "Spinning on poll() in an idle consumer",
        },
        {
          type: "paragraph",
          text: "A loop that only polls burns a whole core while there's nothing to do (1,010 ms of CPU per second in `PollingCost`). Adding `Thread.onSpinWait()` doesn't change that. If the consumer has nothing else to do, it wants a `BlockingQueue`.",
        },
        {
          type: "heading",
          text: "Assuming a lock-free queue protects the heap",
        },
        {
          type: "paragraph",
          text: "Unbounded means unbounded: in `NoBackpressure`, the queue reached `OutOfMemoryError` in under 3 seconds when the consumer fell behind. Decide on a bound and an overflow policy before production decides for you.",
        },
        {
          type: "heading",
          text: "A comparator that calls different things equal",
        },
        {
          type: "paragraph",
          text: "Skip lists use the comparator, not `equals`, for identity. Two drivers with the same ETA under `Comparator.comparingInt(DriverEta::etaSeconds)` are \"the same key\", and `add` returns `false` for the second. Always add a unique tie-breaker (`thenComparing(DriverEta::driverId)`). A case-insensitive comparator on a `ConcurrentSkipListSet<String>` similarly keeps only one of `\"howrah\"` and `\"HOWRAH\"`.",
        },
        {
          type: "heading",
          text: "Mutating a key after inserting it",
        },
        {
          type: "paragraph",
          text: "If a field the comparator reads changes while the object is in a skip list, the entry sits in the wrong place: `get`, `remove` and `contains` search where it should be and miss it, and iteration returns it out of order. Make keys immutable (records are ideal) and update by remove-then-add.",
        },
        {
          type: "heading",
          text: "Updating a sorted index with an unsynchronised remove + add",
        },
        {
          type: "paragraph",
          text: "Each call is atomic, the pair is not. Two concurrent updates for the same driver can both remove the same old entry and both add a new one, leaving a ghost. The production section measured 12 to 36 duplicate drivers this way; serialise updates per key (`ConcurrentHashMap.compute`) or keep one owner thread per key.",
        },
        {
          type: "heading",
          text: "Expecting an iterator or a view to be a snapshot",
        },
        {
          type: "paragraph",
          text: "Iterators and views are weakly consistent: `NavigableViews` skipped a key inserted just ahead of the iterator. Code that needs totals that add up should build them from one pass and accept that the pass describes no single instant, or stop writers while it reads.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Pick the queue by how consumers wait: `ConcurrentLinkedQueue` when nobody waits, a `BlockingQueue` when consumers sleep until work arrives.",
            "Write consumer loops as `while ((x = q.poll()) != null)`, never `isEmpty()` then `poll()`.",
            "Never call `size()` on a `ConcurrentLinkedQueue` or `ConcurrentLinkedDeque` on a hot path or in a frequent gauge; keep a `LongAdder` if the number matters.",
            "Put a bound on every queue that crosses a speed boundary (fast producer, slower consumer), and make the overflow policy explicit and measured.",
            "Use `ConcurrentHashMap` unless you need order, nearest-key queries or ranges; then use `ConcurrentSkipListMap`.",
            "Give every skip-list comparator a unique tie-breaker, and test it with equal primary values.",
            "Make skip-list keys immutable; update by removing the old key and adding a new one, serialised per logical entity.",
            "Prefer `pollFirstEntry()` and `remove(key, value)` for \"take the next one\" logic; they hand each entry to exactly one thread.",
            "Treat range-view `size()` and rank queries as O(range) and cache them if they're asked often.",
            "Monitor consumer threads' CPU: a queue consumer whose CPU time grows at wall-clock speed is spinning.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Is lock-free faster? I measured raw queue throughput: producers and consumers using only `offer` and `poll` (consumers spin briefly when empty), 2,000,000 events per run, best of three, for 1 producer and 1 consumer, then 4 and 4:",
        },
        {
          type: "code",
          language: "java",
          title: "QueueThroughput.java",
          code: `import java.util.ArrayDeque;
import java.util.Queue;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.Supplier;

public class QueueThroughput {
    static final Object EVENT = new Object();

    // pairs producers and pairs consumers; every thread uses offer()/poll() only (no blocking)
    static long run(Queue<Object> q, int pairs, int perProducer) throws Exception {
        AtomicBoolean stop = new AtomicBoolean();
        LongAdder consumed = new LongAdder();
        long total = (long) pairs * perProducer;
        Thread[] ts = new Thread[pairs * 2];
        long t0 = System.nanoTime();
        for (int i = 0; i < pairs; i++) {
            ts[i] = Thread.ofPlatform().start(() -> {
                for (int k = 0; k < perProducer; k++) {
                    while (!q.offer(EVENT)) Thread.onSpinWait();   // a bounded queue may be full
                }
            });
            ts[pairs + i] = Thread.ofPlatform().start(() -> {
                while (!stop.get()) {
                    if (q.poll() != null) consumed.increment();
                    else Thread.onSpinWait();
                }
            });
        }
        for (int i = 0; i < pairs; i++) ts[i].join();
        while (consumed.sum() < total) Thread.onSpinWait();   // every event taken
        long ns = System.nanoTime() - t0;
        stop.set(true);
        for (int i = pairs; i < ts.length; i++) ts[i].join();
        return (long) (total * 1e9 / ns);
    }

    public static void main(String[] args) throws Exception {
        record Q(String name, Supplier<Queue<Object>> make) { }
        Q[] queues = {
                new Q("ConcurrentLinkedQueue", ConcurrentLinkedQueue::new),
                new Q("ConcurrentLinkedDeque", ConcurrentLinkedDeque::new),
                new Q("LinkedBlockingQueue", LinkedBlockingQueue::new),
                new Q("ArrayBlockingQueue(4096)", () -> new ArrayBlockingQueue<>(4096)),
                new Q("synchronized ArrayDeque", SyncDeque::new),
        };
        for (int pairs : new int[] {1, 4}) {
            System.out.printf("%d producer(s), %d consumer(s), offer/poll:%n", pairs, pairs);
            for (Q q : queues) {
                long best = 0;
                for (int rep = 0; rep < 3; rep++) best = Math.max(best, run(q.make().get(), pairs, 2_000_000 / pairs));
                System.out.printf("  %-26s %,6.1f million ops/s%n", q.name(), best / 1e6);
            }
        }
    }

    // ArrayDeque behind one lock, the way a hand-rolled "thread-safe queue" usually looks
    static final class SyncDeque extends java.util.AbstractQueue<Object> {
        private final ArrayDeque<Object> d = new ArrayDeque<>();
        public synchronized boolean offer(Object o) { return d.offer(o); }
        public synchronized Object poll() { return d.poll(); }
        public synchronized Object peek() { return d.peek(); }
        public synchronized int size() { return d.size(); }
        public java.util.Iterator<Object> iterator() { throw new UnsupportedOperationException(); }
    }
}`,
        },
        {
          type: "output",
          text: `1 producer(s), 1 consumer(s), offer/poll:
  ConcurrentLinkedQueue        15.1 million ops/s
  ConcurrentLinkedDeque         9.2 million ops/s
  LinkedBlockingQueue           6.1 million ops/s
  ArrayBlockingQueue(4096)      7.1 million ops/s
  synchronized ArrayDeque      10.8 million ops/s
4 producer(s), 4 consumer(s), offer/poll:
  ConcurrentLinkedQueue         6.7 million ops/s
  ConcurrentLinkedDeque         4.6 million ops/s
  LinkedBlockingQueue           5.5 million ops/s
  ArrayBlockingQueue(4096)      6.3 million ops/s
  synchronized ArrayDeque       8.2 million ops/s`,
        },
        {
          type: "list",
          items: [
            "**No clear winner.** Over three runs, `ConcurrentLinkedQueue` did 6.3 to 15.1 million operations per second with one pair and 6.7 to 9.3 with four pairs. `LinkedBlockingQueue` (two locks, one per end) did 6.1 to 10.9 and 5.3 to 7.4. A plain `synchronized` `ArrayDeque` did 8.4 to 10.8 and 5.5 to 8.2, and beat the lock-free queue in one of the four-pair runs. The machine's load average reached 44 while these ran, so the ranges are wide; the rankings changed between runs, the overall picture didn't.",
            "**`ConcurrentLinkedDeque` was slower than the queue in most runs** (4.6 to 10.1 against 6.3 to 15.1): a doubly linked node is bigger and unlinking needs more CASes.",
            "**`ArrayBlockingQueue` was the most erratic**: 4.1 to 7.1 with one pair, 1.5 to 6.3 with four. A single lock for both ends, plus a full queue making producers spin on `offer`, made it the most sensitive to scheduling.",
            "**Why lock-free didn't win outright:** all of them spend most of their time on the same contended cache lines (the head and tail of the queue). A short `synchronized` block with an array is very fast when the lock is held for nanoseconds. Lock-free's real advantages are elsewhere: no thread can be stuck behind a descheduled lock holder, no convoys when the lock holder is preempted, and readers that never block writers.",
            "These are `System.nanoTime` measurements on one 8-core machine shared with other benchmarks, not JMH. For a real decision, measure with your element sizes and thread counts.",
          ],
        },
        {
          type: "heading",
          text: "The measured numbers in one place",
        },
        {
          type: "table",
          headers: ["Operation", "Measured", "So"],
          rows: [
            ["`ConcurrentLinkedQueue.size()`, 1,000,000 elements", "3.2 to 4.4 ms", "Never on a hot path"],
            ["`ConcurrentLinkedQueue.isEmpty()`", "2 to 7 ns", "Always for emptiness"],
            ["`size()` under concurrent moves (true 9,998 to 10,000)", "Up to 19,213", "Not a number to act on"],
            ["Spinning consumer, 100 events per second", "About 1,000 ms CPU per second", "Use `take()` when idle: 7 to 10 ms"],
            ["Unbounded queue, consumer behind", "`OutOfMemoryError` in under 3 s (256 MB)", "Bound it"],
            ["Skip list: Index objects per key", "0.50 (25.05% on level 1, 17 levels at 1M)", "O(log n) with no rebalancing"],
            ["Bytes per entry", "Skip list 36, `TreeMap` 40, `ConcurrentHashMap` 41.5, queue node 24", "Index levels are not a memory problem"],
            ["Skip-list `size()` vs `headMap(500_000).size()`", "2 to 4 ns vs 2.3 to 2.5 ms", "View sizes are walks"],
            ["8-thread mixed workload", "Skip list 2.2 to 4.2 M/s, synced `TreeMap` 0.9 to 1.9, CHM 14 to 35", "Skip list for order, CHM for lookups"],
          ],
        },
      ],
    },
    {
      title: "Concurrent Collections in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing matching service kept, for each pickup hotspot, the available drivers sorted by ETA in a `ConcurrentSkipListSet<DriverEta>`, so \"offer the trip to the nearest driver\" was `first()` and \"drivers within 5 minutes\" was `headSet`. GPS pings updated a driver's entry by removing the old one and adding a new one. One release changed the ETA service to round ETAs to 30-second buckets (to stop offers flickering between drivers). That evening, riders at busy hotspots saw \"no drivers nearby\" or waited for distant drivers, while the fleet dashboard, which read driver status from a separate `ConcurrentHashMap`, showed hundreds of drivers online and idle. I rebuilt the index with 400 drivers and the rounded ETAs, then the first hotfix, then the real fix:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverIndex.java",
          code: `import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListSet;
import java.util.concurrent.ThreadLocalRandom;

public class DriverIndex {
    record DriverEta(int etaSeconds, String driverId) { }

    static final int DRIVERS = 400, UPDATERS = 8, UPDATES_PER_THREAD = 50_000;

    static int roundedEta() {                                   // the ETA service rounds to 30 s buckets
        return ThreadLocalRandom.current().nextInt(0, 31) * 30;
    }

    static void report(String label, ConcurrentSkipListSet<DriverEta> set) {
        Map<String, Integer> entries = new HashMap<>();
        for (DriverEta d : set) entries.merge(d.driverId(), 1, Integer::sum);
        long twice = entries.values().stream().filter(c -> c > 1).count();
        System.out.printf("%-34s set.size() %4d, distinct drivers %3d of %d, drivers listed twice or more %3d, nearest %s%n",
                label, set.size(), entries.size(), DRIVERS, twice, set.first());
    }

    public static void main(String[] args) throws Exception {
        // 1. Ordered by ETA only: two drivers with the same ETA are "equal", so the second add is dropped
        ConcurrentSkipListSet<DriverEta> byEtaOnly = new ConcurrentSkipListSet<>(Comparator.comparingInt(DriverEta::etaSeconds));
        int rejected = 0;
        for (int i = 0; i < DRIVERS; i++) if (!byEtaOnly.add(new DriverEta(roundedEta(), "D" + i))) rejected++;
        System.out.println("comparator on ETA only: add() returned false " + rejected + " times");
        report("1. ETA-only comparator", byEtaOnly);

        // 2. Tie-break on driverId, but update with an unsynchronised remove(old) + add(new)
        Comparator<DriverEta> byEtaThenId = Comparator.comparingInt(DriverEta::etaSeconds).thenComparing(DriverEta::driverId);
        ConcurrentSkipListSet<DriverEta> racy = new ConcurrentSkipListSet<>(byEtaThenId);
        Map<String, DriverEta> currentRacy = new ConcurrentHashMap<>();
        for (int i = 0; i < DRIVERS; i++) { DriverEta d = new DriverEta(roundedEta(), "D" + i); racy.add(d); currentRacy.put(d.driverId(), d); }
        runUpdaters(() -> {
            String id = "D" + ThreadLocalRandom.current().nextInt(DRIVERS);
            DriverEta fresh = new DriverEta(roundedEta(), id);
            DriverEta old = currentRacy.put(id, fresh);        // two GPS pings for one driver can interleave here
            racy.remove(old);
            racy.add(fresh);
        });
        report("2. tie-break, racy remove+add", racy);

        // 3. Tie-break, and every update for one driver serialised by ConcurrentHashMap.compute
        ConcurrentSkipListSet<DriverEta> safe = new ConcurrentSkipListSet<>(byEtaThenId);
        ConcurrentHashMap<String, DriverEta> current = new ConcurrentHashMap<>();
        for (int i = 0; i < DRIVERS; i++) { DriverEta d = new DriverEta(roundedEta(), "D" + i); safe.add(d); current.put(d.driverId(), d); }
        runUpdaters(() -> {
            String id = "D" + ThreadLocalRandom.current().nextInt(DRIVERS);
            DriverEta fresh = new DriverEta(roundedEta(), id);
            current.compute(id, (k, old) -> {                  // holds this driver's bin lock in the map
                if (old != null) safe.remove(old);
                safe.add(fresh);
                return fresh;
            });
        });
        report("3. tie-break + compute per driver", safe);
    }

    static void runUpdaters(Runnable update) throws InterruptedException {
        Thread[] ts = new Thread[UPDATERS];
        for (int t = 0; t < UPDATERS; t++) ts[t] = Thread.ofPlatform().start(() -> {
            for (int i = 0; i < UPDATES_PER_THREAD; i++) update.run();
        });
        for (Thread t : ts) t.join();
    }
}`,
        },
        {
          type: "output",
          text: `comparator on ETA only: add() returned false 369 times
1. ETA-only comparator             set.size()   31, distinct drivers  31 of 400, drivers listed twice or more   0, nearest DriverEta[etaSeconds=0, driverId=D14]
2. tie-break, racy remove+add      set.size()  436, distinct drivers 400 of 400, drivers listed twice or more  36, nearest DriverEta[etaSeconds=0, driverId=D192]
3. tie-break + compute per driver  set.size()  400, distinct drivers 400 of 400, drivers listed twice or more   0, nearest DriverEta[etaSeconds=0, driverId=D101]`,
        },
        {
          type: "list",
          items: [
            "**The index held 31 of 400 drivers.** The comparator looked only at `etaSeconds`. Before the rounding change, two drivers almost never had exactly the same ETA, so the bug was invisible. With 30-second buckets there were only 31 possible ETAs (0 to 900 seconds), so the set kept one driver per bucket and `add` returned `false` for the other 369, a return value nobody checked. Same in all three runs. No exception, no log line: the set did exactly what its comparator said.",
            "**The first hotfix added a tie-breaker and exposed a second bug.** With `thenComparing(DriverEta::driverId)` every driver fit, but the update path was `current.put(id, fresh); set.remove(old); set.add(fresh)` from 8 ping-handling threads. When two pings for the same driver interleave, both can remove the same old entry and both add theirs, so the earlier fresh entry stays behind as a ghost. After 400,000 updates, 36 drivers were listed twice (12 and 20 in the other runs), with stale ETAs, so riders got offers \"from a driver 2 minutes away\" who had already driven off, and some drivers got two offers at once.",
            "**The real fix serialised updates per driver.** The remove-and-add runs inside `ConcurrentHashMap.compute(id, ...)`, which holds that driver's bin lock in the map, so two pings for one driver run one after the other while pings for different drivers still run in parallel. Result: exactly 400 entries, one per driver, in every run.",
            "**Why it was hard to see:** nothing was slow or stuck, no thread was blocked, CPU was normal, and `set.size()` looked like a plausible number. The missing drivers only showed up when someone compared the index's driver count with the status map's.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from it:",
        },
        {
          type: "list",
          items: [
            "In a sorted collection, the comparator **is** the identity. Every comparator gets a unique tie-breaker, and a unit test that inserts two items equal on the primary field.",
            "Check the boolean that `add` and `remove` return when the code assumes they succeed; a dropped driver should at least be a log line or a metric.",
            "Two thread-safe calls in a row are not a thread-safe update. Serialise updates per entity (`compute`, an owner thread, or a per-driver lock), or make the whole change one atomic operation.",
            "Reconcile derived indexes against their source: an alert on \"drivers in index vs drivers available\" would have fired within a minute of the release.",
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
              question: "What is the difference between ConcurrentLinkedQueue and LinkedBlockingQueue?",
              answer:
                "Both are thread-safe FIFO queues built on linked nodes. `ConcurrentLinkedQueue` is lock-free (CAS only), unbounded and never blocks: `poll()` on an empty queue returns `null` immediately, and `size()` walks the list. `LinkedBlockingQueue` uses two locks (one for each end), can be bounded, has `put`/`take` that wait, and keeps a count, so `size()` is constant time. Use the blocking one when consumers or producers should wait; the lock-free one when nobody waits.",
            },
            {
              question: "Why shouldn't you call size() on a ConcurrentLinkedQueue to check if it's empty?",
              answer:
                "Because `size()` walks every node: I measured 3.2 to 4.4 ms at a million elements, against 2 to 7 ns for `isEmpty()`, which only looks for the first live node. And under concurrent changes `size()` isn't even accurate; in my test it reported up to 19,213 for a queue that always held 9,998 to 10,000 elements.",
            },
            {
              question: "What is a ConcurrentSkipListMap and when would you use it?",
              answer:
                "A thread-safe, lock-free sorted map, the concurrent counterpart of `TreeMap`. Keys are kept in comparator order, and it supports nearest-key queries (`ceilingKey`, `floorEntry`), ranges (`headMap`, `subMap`) and atomic `pollFirstEntry`. Use it when several threads need a map that is sorted or queried by ranges: time-ordered events, leaderboards, drivers by ETA. If you only need `get` and `put`, `ConcurrentHashMap` is much faster.",
            },
            {
              question: "Can a ConcurrentSkipListMap contain null keys or values? Can a ConcurrentLinkedQueue contain null?",
              answer:
                "No to all of them. `put(null, v)` and `put(k, null)` throw `NullPointerException`, and so does `offer(null)` on the queue. These classes use `null` internally to mean \"no element\" or \"deleted\": `poll()` returns `null` for an empty queue, a deleted skip-list entry has a `null` value, and a removed queue node has a `null` item.",
            },
            {
              question: "What does weakly consistent iteration mean?",
              answer:
                "The iterator never throws `ConcurrentModificationException` and works while other threads change the collection. Every element present for the whole iteration is returned exactly once; elements added or removed during it may or may not appear. In my test, iterating a skip list while adding 150 just after the current key 140 skipped 150, because the iterator had already read its next node. A `TreeMap` threw `ConcurrentModificationException` for the same change.",
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
              question: "How does ConcurrentLinkedQueue add an element without a lock?",
              answer:
                "It uses the Michael-Scott algorithm: read `tail`, walk to the real last node (where `next == null`), and CAS that node's `next` from `null` to the new node. The winner of the CAS has appended; losers re-read and retry. Moving `tail` is a separate, optional `weakCompareAndSet`, done only when `tail` was already behind, so `tail` lags the last node by up to one and moves on every second offer, which I saw with reflection.",
            },
            {
              question: "Why does a removed head node in ConcurrentLinkedQueue point to itself?",
              answer:
                "When `head` moves forward, `updateHead` does `setRelease(oldHead.next, oldHead)`. A thread still walking from that node (a slow `size()`, an iterator, an `offer` that started from an old `tail`) sees `p.next == p`, knows it fell off the list and restarts from `head`. It also helps GC: an old node pointing forward would keep the whole rest of the queue reachable from it, for example from an old-generation object.",
            },
            {
              question: "How does a skip list decide how many levels a new key gets?",
              answer:
                "Randomly, at insert time. In JDK 21's `doPut`, a key gets an index only if the low two bits of a random int are 0 (1 in 4); each further level requires another 1-bit at the top of a 64-bit random number (probability 1/2 each), capped at one level above the current height. With a million keys I counted 25.05% on level 1, 12.55% on level 2, halving upward to 17 levels, 0.50 `Index` objects per key. No rebalancing is ever needed, and expected search cost is O(log n).",
            },
            {
              question: "When is a synchronized TreeMap better than a ConcurrentSkipListMap?",
              answer:
                "When there's little contention. On one thread the `TreeMap` was faster in every run of my test (1.5 to 2.2 million ops/s against 1.2 to 1.4 in two runs, 0.5 against 0.4 for lookups in a third, busier one), because a red-black tree touches fewer nodes and an uncontended lock is cheap. With 8 threads it fell to 0.9 to 1.9 while the skip list did 2.2 to 4.2. A `TreeMap` also gives you `ConcurrentModificationException` and the option of locking the whole map for a consistent multi-step read, which a skip list can't offer.",
            },
            {
              question: "What do headMap, tailMap and subMap return on a ConcurrentSkipListMap?",
              answer:
                "Live views backed by the map, not copies: later puts and removes inside the range appear in the view, keys outside the range are rejected with `IllegalArgumentException: key out of range`, and iteration is weakly consistent. Their `size()` walks the range: `headMap(500_000).size()` took 2.3 to 2.5 ms on a million keys, while the map's own `size()` took 2 to 4 ns from its `LongAdder`.",
            },
            {
              question: "Why can't you just use a BlockingQueue's take() with a ConcurrentLinkedQueue?",
              answer:
                "Because it has none: it doesn't implement `BlockingQueue`. A consumer must poll in a loop. Spinning used about 1,000 ms of CPU per second in my test; sleeping 5 ms between polls cut CPU to under 10 ms but added a 2 ms median delay. `LinkedBlockingQueue.take()` got 7 to 10 ms of CPU and a sub-0.2 ms median, by parking and being woken by the producer.",
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
              question: "Why does ConcurrentLinkedQueue let head and tail lag behind the real ends?",
              answer:
                "To halve the CASes on the hottest fields. Keeping `tail` exact would need two successful CASes per offer (link the node, move `tail`), and every producer would contend on `tail` twice. Letting it lag by one means only every second offer moves it, and a failed `weakCompareAndSet` on it is ignored because someone else moved it. The price is that every traversal must be ready to walk a node or two and to restart on self-linked nodes, which is why `size()` can restart from zero.",
            },
            {
              question: "How does ConcurrentSkipListMap remove a key safely without a lock?",
              answer:
                "In steps that each CAS one field. First CAS the node's `val` to `null`: that's the moment of deletion, after which `get` returns `null`. Then `unlinkNode` CASes a marker node (null key and value) in as the deleted node's `next`, which stops any concurrent insert from linking a new node after it, and then CASes the predecessor's `next` past both. Without the marker, a concurrent insert after the deleted node could be lost when the predecessor is swung past it. Indexes pointing at the dead node are cleaned up by later searches, and the `LongAdder` is decremented.",
            },
            {
              question: "Why is ConcurrentSkipListMap's size() cheap but not exact, and the queue's size() neither?",
              answer:
                "The skip list keeps a `LongAdder` updated after each insert and remove; `size()` sums its cells (2 to 4 ns), but inserts and removes in flight may or may not be counted, so it's an estimate under concurrency. The queue keeps no count, so `size()` walks the list (O(n)) while elements are moved around it, can count an element twice, and restarts from zero if it lands on a self-linked node. My measured worst case was 19,213 for a true size of at most 10,000.",
            },
            {
              question: "Is lock-free always faster than locking?",
              answer:
                "No. In my throughput test, a `synchronized` `ArrayDeque` matched or beat `ConcurrentLinkedQueue` in some runs (5.5 to 8.2 million ops/s with 4+4 threads against 6.7 to 9.3), because both are bottlenecked on the same contended cache lines and a lock held for nanoseconds is cheap. Lock-free's guarantees are about progress, not speed: a thread preempted mid-operation can't block others, there are no lock convoys, and readers never wait for writers.",
            },
            {
              question: "Why does a skip list work for lock-free concurrency where a balanced tree doesn't?",
              answer:
                "A balanced tree insert can trigger rotations that change several pointers in different nodes, and they must all appear to happen at once, which needs a lock or a much more complex algorithm. A skip-list insert or remove changes one pointer at a time: link into the base list with one CAS (the entry now exists), then add index levels one CAS each; the index is only a hint for faster search, so it's fine if it's briefly incomplete. Random levels replace rebalancing.",
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
              question: "Your nearest-driver index, a ConcurrentSkipListSet ordered by ETA, shows far fewer drivers than the status service after a change that rounded ETAs to 30 seconds. Nothing errors. What happened and what do you do?",
              answer:
                "The comparator only compares ETA, so drivers with equal ETAs are 'equal' and `add` returns `false` for all but one per value. With 31 possible rounded values, my reproduction kept 31 of 400 drivers. Fix: add a unique tie-breaker (`thenComparing(driverId)`), check `add`'s return value, and add a test with equal ETAs. Then check the update path: a racy remove-then-add left 12 to 36 ghost duplicates in my test; serialise per driver with `ConcurrentHashMap.compute`, which brought it to exactly 400.",
            },
            {
              question: "A service's CPU usage jumped to one full core per instance at night, when traffic is lowest. A thread dump shows a dispatcher thread RUNNABLE in a lambda, with cpu= almost equal to elapsed=. What's going on?",
              answer:
                "A consumer polling a `ConcurrentLinkedQueue` in a loop. When the queue is empty, `poll()` returns `null` immediately and the loop spins, so the less traffic, the more empty polls; the JIT inlines `poll()`, so the dump shows only the lambda. In my test a spinner used 6,151 ms of CPU in 6.28 s. Replace it with a `BlockingQueue` and `take()` (7 to 10 ms of CPU per second in my measurement), or, if it must stay lock-free, park between empty polls and accept the added latency.",
            },
            {
              question: "After a deploy, a pod's /metrics endpoint takes seconds to respond and CPU rises whenever the event backlog grows. The gauge is eventQueue.size() on a ConcurrentLinkedQueue. Why, and what's the fix?",
              answer:
                "`size()` walks every node: 3.2 to 4.4 ms per call at a million elements in my measurement, and longer while consumers poll because it restarts on self-linked nodes. Several scrapers and dashboards calling it while the backlog grows multiply that, and the number is wrong anyway under concurrency. Keep a `LongAdder` incremented on offer and decremented on successful poll, and export that; or move to a `LinkedBlockingQueue`, whose `size()` reads a counter.",
            },
            {
              question: "A location-ingest service crashes with OutOfMemoryError during traffic spikes. A heap dump is dominated by ConcurrentLinkedQueue$Node objects. What happened and how do you prevent it?",
              answer:
                "Producers outpaced the consumer and the queue, being unbounded, never pushed back. In my test the backlog grew by a million pings a second and a 256 MB heap ran out in under 3 seconds; GC pressure even slowed the consumer further. Bound it: an `ArrayBlockingQueue` held the backlog at 10,000 and the heap under 70 MB, with `put` slowing the producer. For location pings, dropping old ones (or keeping only the latest per driver in a `ConcurrentHashMap`) is often the right overflow policy, since stale positions are worthless.",
            },
            {
              question: "A job sweeps expired ride offers from a ConcurrentSkipListMap<Long, Offer> keyed by expiry time. Some offers are never expired and drivers keep seeing them. Why?",
              answer:
                "Two offers with the same expiry millisecond have the same key, so the second `put` replaced the first: the first offer is gone from the map, never swept, but still shown wherever else it was stored. Key by a composite (expiry, offerId) with a comparator that tie-breaks on the ID, as in `OfferExpiry`, and remove with `remove(key, value)` so two sweepers can't both process one offer.",
            },
            {
              question: "A report iterates a ConcurrentSkipListMap of trips to compute totals while trips are being added, and the totals sometimes don't match a count taken right after. Is the map broken?",
              answer:
                "No. Iteration is weakly consistent: entries added or removed during the iteration may or may not be seen, and the iterator reads one node ahead, so even a key inserted just after the current position can be skipped (it was in my test). `size()` is an estimate too. If the report must be consistent, either quiesce writers, take a consistent snapshot under a lock that writers also use, or compute the report from an event log with a clear cut-off instead of from a live structure.",
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
            "Call `firstEntry()` and then `firstKey()` on an empty `ConcurrentSkipListMap`.",
            "Try `put(null, \"x\")` and `put(1, null)` on a `ConcurrentSkipListMap`, then `put(1, null)` on a `TreeMap`.",
            "Create `new ConcurrentSkipListSet<>(String.CASE_INSENSITIVE_ORDER)`, add `\"howrah\"` and `\"HOWRAH\"`, print both `add` results, the set and `contains(\"HoWrAh\")`.",
            "Offer `\"T1\"` twice to a `ConcurrentLinkedQueue`, call `remove(\"T1\")` once, and print the queue and its size.",
            "Run `SkipLevels` twice and compare the 32-key levels; then compare the million-key percentages.",
            "In `SizeDrift`, set `movers = 0` and run it.",
            "Take `firstEntry()` from a `ConcurrentSkipListMap` and call `setValue` on it.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `null`, then throws `NoSuchElementException`. Step 2 throws `NullPointerException` twice, while `TreeMap` accepts the null value and prints `{1=null}`. Step 3 prints `true false [howrah] true`: the comparator, not `equals`, decides identity. Step 4 removes only the first occurrence and prints `[T1] 1`. Step 5 gives different small levels every run, but the large percentages stay close to 25%, 12.5%, 6.25%. Step 6 makes `size()` exact every time (10,000, nothing is moving). Step 7 throws `UnsupportedOperationException`: entries returned by the navigation methods are immutable snapshots, so changing a value must go through the map (`put`, `replace`, `compute`).",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `CLQ         Michael-Scott queue: dummy node, volatile head/tail, VarHandle CAS
            offer = CAS(last.next, null, node); tail moves every 2nd offer
            poll  = CAS(item, x, null); old head.next = itself (restart signal)
            never blocks: poll() on empty -> null; unbounded: offer() always true
            Node = 24 bytes

SIZE        CLQ/CLD size(): walk O(n), 3.2..4.4 ms at 1M; restarts on self-links
            under change: returned 19,213 for a true 9,998..10,000
            isEmpty(): 2..7 ns   ->  while ((x = q.poll()) != null)

WAITING     spin on poll: ~1,000 ms CPU per second; take(): 7..10 ms
            no bound: OOM in < 3 s; bounded put(): backlog held at 10,000

CLD         doubly linked, both ends lag, PREV/NEXT_TERMINATOR on unlinked nodes
            push/pop = front; usually slower than CLQ

SKIP LIST   base list of Nodes + Index(node, down, right) levels, head = top-left
            level: 1 in 4 keys indexed, +1 level per extra random bit (p = 1/2)
            1M keys: 25.05% L1, 17 levels, 0.50 Index/key, 36 B/entry
            get: no lock; remove: CAS val->null, marker node, unlink
            size(): LongAdder (2..4 ns); view size(): walk (2.3..2.5 ms)

VIEWS       ceilingKey/floorEntry/higherKey: O(log n), null if none
            headMap/subMap/tailMap: live, range-checked, weakly consistent
            iterator reads one ahead: may skip a key inserted just after it

CHOOSE      lookups only: ConcurrentHashMap (6..16x faster)
            order/ranges + contention: skip list; 1 thread: TreeMap
            comparator = identity: ALWAYS add a unique tie-breaker`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`ConcurrentLinkedQueue` and `ConcurrentLinkedDeque` are lock-free linked lists that change one pointer per CAS and let their ends lag. They never block and never bound, so `size()` is a slow estimate, an idle consumer spins, and a slow consumer can fill the heap. Use them where nobody waits; use a `BlockingQueue` where somebody does.",
            "`ConcurrentSkipListMap` and `ConcurrentSkipListSet` are sorted, lock-free and scale with threads, at the cost of slower point lookups than `ConcurrentHashMap`. Their strength is nearest-key queries, ranges and atomic `pollFirstEntry`; their trap is that the comparator defines identity, and that live views and iterators are weakly consistent.",
            "Next comes CountDownLatch and CyclicBarrier: instead of sharing data, threads wait for each other, with a one-shot latch built on AQS and a reusable barrier built from a lock, a condition and a generation object.",
          ],
        },
      ],
    },
  ],
};
