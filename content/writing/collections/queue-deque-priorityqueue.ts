import type { Lesson } from "../types";

export const queueDequePriorityQueue: Lesson = {
  slug: "queue-deque-priorityqueue",
  date: "2026-10-29",
  title: "Queue, Deque and PriorityQueue",
  description:
    "First in first out, last in first out, and most important first: the Queue and Deque methods, ArrayDeque's circular array, and PriorityQueue's binary heap, traced through their live internal arrays on JDK 21.",
  tags: ["Collections", "Queue", "Deque", "PriorityQueue", "Heap", "Data Structures"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the queue at a ticket window. The person who came first gets served first. That's a **`Queue`**: first in, first out.",
        },
        {
          type: "paragraph",
          text: "Now think of a stack of plates in a canteen. I put a clean plate on top, and the next person takes the top one, the last plate I added. That's a stack: last in, first out. In Java I use a **`Deque`** (short for \"double-ended queue\", a line I can add to and take from at both ends) for this.",
        },
        {
          type: "paragraph",
          text: "And sometimes the order is about importance, not arrival, like a hospital seeing the most serious patient first. That's a **`PriorityQueue`**. One class, `ArrayDeque`, covers both the ticket line and the plate stack.",
        },
        {
          type: "code",
          language: "java",
          code: `Queue<String> ticketLine = new ArrayDeque<>();
ticketLine.offer("Asha");
ticketLine.offer("Ben");
System.out.println(ticketLine.poll());   // first in, first out

Deque<String> plates = new ArrayDeque<>();
plates.push("plate 1");
plates.push("plate 2");
System.out.println(plates.pop());        // last in, first out`,
        },
        {
          type: "output",
          text: `Asha
plate 2`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "Ticket line = `Queue` (`offer`/`poll`), plate stack = `Deque` (`push`/`pop`), most important first = `PriorityQueue`.",
        },
      ],
    },
    {
      title: "What Queue, Deque and PriorityQueue Are",
      blocks: [
        {
          type: "paragraph",
          text: "Lists and maps are about **storing** things and finding them again. This lesson is about collections that decide **what comes out next**. There are three everyday rules for that, and Java has a collection for each.",
        },
        {
          type: "list",
          items: [
            "A ticket counter: whoever joined the line first is served first. **First in, first out (FIFO)**. That's a `Queue`.",
            "A stack of plates in a canteen: you put a clean plate on top, and the next person takes the top one. **Last in, first out (LIFO)**. That's a stack, and in modern Java you use a `Deque` for it.",
            "A hospital emergency room: patients are seen by how serious their condition is, not by when they arrived. **Most important first**. That's a `PriorityQueue`.",
          ],
        },
        {
          type: "paragraph",
          text: "`Queue` is the interface for \"add at one end, take from the other\". `Deque` (pronounced \"deck\", short for double-ended queue) can add and remove at **both** ends, so it works as a queue and as a stack. `ArrayDeque` is the class I use for both. `PriorityQueue` looks like a queue from outside, but inside it's a **binary heap** that always keeps the smallest element (by your chosen order) at the front.",
        },
        {
          type: "code",
          language: "java",
          code: `Queue<String> counter = new ArrayDeque<>();          // FIFO
Deque<String> plates  = new ArrayDeque<>();          // LIFO with push/pop
Queue<Integer> triage = new PriorityQueue<>();       // smallest first`,
        },
        {
          type: "paragraph",
          text: "All three show up constantly in backend work: request and job queues, undo history, parsing and graph searches, scheduling, and \"top K\" questions like the three nearest drivers. And `PriorityQueue` internals, the heap in an array, is a favourite interview topic. As in the map lessons, I looked inside the real JDK 21 classes rather than trusting diagrams.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "**Java 1.0** (1996) had `java.util.Stack`, built by extending `Vector`. That inheritance turned out to be a mistake: a `Stack` is a `Vector`, so it has `get(int)`, `add(int, E)` and every other list method, letting anyone reach into the middle of a \"stack\". And every method is `synchronized`, which costs something even with one thread.",
        },
        {
          type: "paragraph",
          text: "The Collections Framework in Java 1.2 had no queue interface at all. **Java 5** (2004) added `Queue`, `PriorityQueue`, made `LinkedList` implement `Queue`, and introduced the `java.util.concurrent` package with its `BlockingQueue` family for producer-consumer work between threads.",
        },
        {
          type: "paragraph",
          text: "**Java 6** (2006) added `Deque` and `ArrayDeque`. The `Stack` Javadoc itself now recommends a `Deque` instead: `Deque<Integer> stack = new ArrayDeque<Integer>();`. And **Java 21** made `Deque` part of the new sequenced collections. `javap` shows the current declaration: `public interface java.util.Deque<E> extends java.util.Queue<E>, java.util.SequencedCollection<E>`, which brings `reversed()` along with the familiar `getFirst`/`getLast`.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a **cab stand outside a railway station**.",
        },
        {
          type: "list",
          items: [
            "Cabs join at the back of the line and passengers take the cab at the front. That's a `Queue`: `offer` at the tail, `poll` from the head.",
            "Now say the stand is a short lane open at both ends. A cab can be waved in at the front (a driver returning from a 2-minute trip keeps their place), and a cab can leave from the back. That's a `Deque`: both ends work.",
            "If only one end is ever used, both joining and leaving, the lane behaves like the stack of plates: the last cab in is the first out. Same `Deque`, used as a stack.",
            "The stand's painted lane is a fixed-length strip of road that's reused in a circle: when cabs leave from the front, new cabs can fill in from the back of the strip and wrap around. That's `ArrayDeque`'s circular array.",
            "Finally, the airport stand, where the dispatcher always sends out the cab with the highest rating, no matter when it arrived. The dispatcher doesn't keep the whole line sorted; he only makes sure the best cab is always at the head. That's a `PriorityQueue` and its heap.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Two flavours of every Queue method",
        },
        {
          type: "paragraph",
          text: "`Queue` has each operation twice: one that throws when it can't do its job, and one that returns a special value instead.",
        },
        {
          type: "table",
          headers: ["Operation", "Throws an exception", "Returns a special value"],
          rows: [
            ["Insert at tail", "`add(e)`: `IllegalStateException` if full", "`offer(e)`: `false` if full"],
            ["Remove head", "`remove()`: `NoSuchElementException` if empty", "`poll()`: `null` if empty"],
            ["Look at head", "`element()`: `NoSuchElementException` if empty", "`peek()`: `null` if empty"],
          ],
        },
        {
          type: "paragraph",
          text: "Because `poll` and `peek` use `null` to mean \"empty\", most queues refuse `null` elements. Otherwise a `null` from `poll` would be ambiguous, the same problem as `HashMap.get`.",
        },
        {
          type: "heading",
          text: "Deque: both ends, and a stack API",
        },
        {
          type: "table",
          headers: ["", "Head (first)", "Tail (last)"],
          rows: [
            ["Insert", "`addFirst` / `offerFirst` / `push`", "`addLast` / `offerLast` / `add` / `offer`"],
            ["Remove", "`removeFirst` / `pollFirst` / `pop` / `poll` / `remove`", "`removeLast` / `pollLast`"],
            ["Examine", "`getFirst` / `peekFirst` / `peek` / `element`", "`getLast` / `peekLast`"],
          ],
        },
        {
          type: "paragraph",
          text: "Used as a **queue**, a Deque adds at the tail and removes from the head. Used as a **stack**, it pushes and pops at the **head**: `push` is `addFirst`, `pop` is `removeFirst`, `peek` is `peekFirst`. That detail matters when you print a deque used as a stack, as I'll show.",
        },
        {
          type: "heading",
          text: "The fields, straight from javap",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -constants java.util.ArrayDeque | grep -v '('
javap -p -constants java.util.PriorityQueue | grep -E 'DEFAULT|queue;|size;|comparator;|sift|heapify|grow'`,
        },
        {
          type: "output",
          text: `  transient java.lang.Object[] elements;
  transient int head;
  transient int tail;
  private static final int MAX_ARRAY_SIZE = 2147483639;
  ...
  private static final int DEFAULT_INITIAL_CAPACITY = 11;
  transient java.lang.Object[] queue;
  int size;
  private final java.util.Comparator<? super E> comparator;
  private void grow(int);
  private void siftUp(int, E);
  private static <T> void siftUpComparable(int, T, java.lang.Object[]);
  private static <T> void siftUpUsingComparator(int, T, java.lang.Object[], java.util.Comparator<? super T>);
  private void siftDown(int, E);
  private static <T> void siftDownComparable(int, T, java.lang.Object[], int);
  private static <T> void siftDownUsingComparator(int, T, java.lang.Object[], int, java.util.Comparator<? super T>);
  private void heapify();`,
        },
        {
          type: "list",
          items: [
            "`ArrayDeque` is just an `Object[]` and two indexes, `head` and `tail`. There isn't even a `size` field: the size is worked out from `head` and `tail`. No nodes, no per-element objects.",
            "`PriorityQueue` is also just an `Object[]` (named `queue`), a `size` and an optional `comparator`. The tree I'll draw in a moment exists only as a rule for which array index is whose child. The `siftUp`/`siftDown` methods, each in a `Comparable` and a `Comparator` version, are the heap algorithm.",
          ],
        },
        {
          type: "heading",
          text: "ArrayDeque in memory: a circular array",
        },
        {
          type: "diagram",
          text: `elements (length 8)
 index:   0     1     2     3     4     5     6     7
       ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
       │ C6  │  _  │  _  │  _  │  _  │ C3  │ C4  │ C5  │
       └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                 ▲                       ▲
               tail                    head
          (next free slot)        (first element)

 logical order: C3, C4, C5, C6   - the queue wraps past the end
 addLast  -> write at tail, tail = tail + 1 (wrapping to 0)
 addFirst -> head = head - 1 (wrapping to length - 1), write at head
 head == tail  means empty`,
          caption:
            "Both ends move around the array in a circle, so adding or removing at either end never shifts other elements.",
        },
        {
          type: "heading",
          text: "PriorityQueue in memory: a tree stored in an array",
        },
        {
          type: "diagram",
          text: `array:  index  0   1   2   3   4   5   6
               [ 1 , 3 , 2 , 7 , 5 , 9 , 8 ]

as a tree:                1          index 0
                       /     \\
                     3         2     index 1, 2
                    / \\       / \\
                   7   5     9   8   index 3, 4, 5, 6

 children of i:  2i + 1  and  2i + 2
 parent of i:    (i - 1) / 2
 heap rule:      every parent <= its children
                 (so the smallest is always at index 0)`,
          caption:
            "The real array HeapWalk printed after seven offers. Siblings aren't sorted, and the array isn't sorted; only parent-before-child is guaranteed.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/collections/priorityqueue-heap.svg",
          alt: "Min-heap of support ticket priorities shown as a tree and as an array, with the child and parent index rules, and offer and poll steps.",
          caption: "A `PriorityQueue` is a min-heap in an array: children of `i` sit at `2i + 1` and `2i + 2`.",
        },
        {
          type: "image",
          src: "/images/collections/arraydeque-circular.svg",
          alt: "ArrayDeque as an eight-slot circular array where addFirst wraps the head index to the end and pollFirst moves it back.",
          caption: "`ArrayDeque` never shifts elements: `head` and `tail` simply wrap around the array.",
        },
        {
          type: "paragraph",
          text: "The JDK source zip isn't installed on this machine, so the internals below come from `javap` on the JDK 21 classes, reflection into live objects with `--add-opens java.base/java.util=ALL-UNNAMED`, and the well-known OpenJDK algorithms, which the traces below agree with step by step.",
        },
        {
          type: "heading",
          text: "ArrayDeque: watching head and tail move",
        },
        {
          type: "paragraph",
          text: "I made a small cab stand, `new ArrayDeque<>(4)`, and printed the raw `elements` array, `head` and `tail` after each step. `_` is an empty slot:",
        },
        {
          type: "code",
          language: "java",
          title: "DequeWalk.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayDeque;
import java.util.Arrays;

public class DequeWalk {
    static Field elements, head, tail;

    static void show(String step, ArrayDeque<?> deque) throws Exception {
        Object[] array = (Object[]) elements.get(deque);
        System.out.printf("%-16s head=%-2s tail=%-2s %s%n", step, head.get(deque), tail.get(deque),
                Arrays.toString(array).replace("null", "_"));
    }

    public static void main(String[] args) throws Exception {
        elements = ArrayDeque.class.getDeclaredField("elements");
        head = ArrayDeque.class.getDeclaredField("head");
        tail = ArrayDeque.class.getDeclaredField("tail");
        for (Field f : new Field[] {elements, head, tail}) f.setAccessible(true);

        ArrayDeque<String> cabStand = new ArrayDeque<>(4);
        show("new(4)", cabStand);
        cabStand.addLast("C1");  cabStand.addLast("C2");  show("addLast x2", cabStand);
        cabStand.addFirst("C0");                         show("addFirst C0", cabStand);
        cabStand.pollFirst();    cabStand.pollFirst();   show("pollFirst x2", cabStand);
        cabStand.addLast("C3");  cabStand.addLast("C4"); show("addLast x2", cabStand);
        cabStand.addLast("C5");                          show("addLast C5", cabStand);
        cabStand.addLast("C6");                          show("addLast C6", cabStand);
        System.out.println(cabStand + " size=" + cabStand.size());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util=ALL-UNNAMED DequeWalk",
        },
        {
          type: "output",
          text: `new(4)           head=0  tail=0  [_, _, _, _, _]
addLast x2       head=0  tail=2  [C1, C2, _, _, _]
addFirst C0      head=4  tail=2  [C1, C2, _, _, C0]
pollFirst x2     head=1  tail=2  [_, C2, _, _, _]
addLast x2       head=1  tail=4  [_, C2, C3, C4, _]
addLast C5       head=1  tail=0  [_, C2, C3, C4, C5]
addLast C6       head=8  tail=1  [C6, _, _, _, _, _, _, _, C2, C3, C4, C5]
[C2, C3, C4, C5, C6] size=5`,
        },
        {
          type: "paragraph",
          text: "Every line of that trace taught me something:",
        },
        {
          type: "list",
          items: [
            "**Capacity 4 gave an array of 5.** ArrayDeque always keeps at least one empty slot, so that `head == tail` can only mean \"empty\". If the array could be completely full, \"full\" would also look like `head == tail`.",
            "**`addFirst` on an empty front wrapped backwards.** `head` was 0, so the new head became 4, the last slot. `C0` sits at the end of the array but is logically first.",
            "**`pollFirst` just cleared the slot and moved `head` forward** (C0 at index 4 was removed, then `head` wrapped to 0 and C1 was removed). Nothing else moved. That's why removing from the front is O(1), unlike `ArrayList.remove(0)`, which shifts every element.",
            "**`addLast C5` wrapped `tail` to 0.** The next free slot is now the start of the array. This is the circle in action: the space freed at the front is reused.",
            "**`addLast C6` filled the last free slot, so it grew.** The array went from 5 to 12 slots. The elements from `head` to the old end (C2 to C5) were moved to the **end** of the new array, `head` became 8, and C6 stayed at index 0. Logical order is unchanged: `[C2, C3, C4, C5, C6]`.",
          ],
        },
        {
          type: "paragraph",
          text: "The growth rule matches PriorityQueue's (below): small arrays grow by their size plus 2 (5 + 7 = 12), large ones by 50%. A default `new ArrayDeque<>()` starts with 17 slots (16 usable plus the spare one), which I read with the same reflection.",
        },
        {
          type: "heading",
          text: "Why ArrayDeque beats Stack and LinkedList",
        },
        {
          type: "list",
          items: [
            "**Against `Stack`**: `Stack` extends `Vector`, and `javap -p java.util.Stack` shows `public synchronized E pop()`, `peek()` and `search()`. Every operation takes a lock, and the full list API is exposed. ArrayDeque has no locks and only deque operations.",
            "**Against `LinkedList`**: a LinkedList allocates a node object (item, `next`, `prev`) for every element, which means more memory, more garbage, and elements scattered around the heap instead of side by side in one array, which is worse for the CPU cache. ArrayDeque stores references in one contiguous array and allocates only when it grows.",
            "**What LinkedList still offers**: it allows `null` elements and implements `List` too. Neither is a good reason to use it as a queue.",
          ],
        },
        {
          type: "heading",
          text: "PriorityQueue: sift up on offer",
        },
        {
          type: "paragraph",
          text: "Back at the hospital, a new patient doesn't go to the end of the line and stay there. The nurse compares them with the person ahead; if the newcomer is more urgent, they swap places, and this repeats until the newcomer is behind someone at least as urgent. That's **sift up**.",
        },
        {
          type: "paragraph",
          text: "In the array: `offer` puts the new element at index `size` (the next leaf), then compares it with its parent at `(i - 1) / 2`. If it's smaller, the parent moves down into its slot and the walk continues from the parent's index. It stops at the root or at a parent that's not bigger. I offered seven wait times and printed the raw `queue` array after each:",
        },
        {
          type: "code",
          language: "java",
          title: "HeapWalk.java",
          code: `import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.PriorityQueue;

public class HeapWalk {
    static Field queueField;

    static String array(PriorityQueue<?> pq) throws Exception {
        Object[] raw = (Object[]) queueField.get(pq);
        return Arrays.toString(Arrays.copyOf(raw, pq.size()));
    }

    public static void main(String[] args) throws Exception {
        queueField = PriorityQueue.class.getDeclaredField("queue");
        queueField.setAccessible(true);

        PriorityQueue<Integer> waitMinutes = new PriorityQueue<>();
        for (int minutes : new int[] {7, 3, 9, 1, 5, 8, 2}) {
            waitMinutes.offer(minutes);
            System.out.println("offer " + minutes + " -> " + array(waitMinutes));
        }
        System.out.println("toString: " + waitMinutes);
        while (!waitMinutes.isEmpty()) {
            int top = waitMinutes.poll();
            System.out.println("poll " + top + "  -> " + array(waitMinutes));
        }
    }
}`,
        },
        {
          type: "output",
          text: `offer 7 -> [7]
offer 3 -> [3, 7]
offer 9 -> [3, 7, 9]
offer 1 -> [1, 3, 9, 7]
offer 5 -> [1, 3, 9, 7, 5]
offer 8 -> [1, 3, 8, 7, 5, 9]
offer 2 -> [1, 3, 2, 7, 5, 9, 8]
toString: [1, 3, 2, 7, 5, 9, 8]
poll 1  -> [2, 3, 8, 7, 5, 9]
poll 2  -> [3, 5, 8, 7, 9]
poll 3  -> [5, 7, 8, 9]
poll 5  -> [7, 9, 8]
poll 7  -> [8, 9]
poll 8  -> [9]
poll 9  -> []`,
        },
        {
          type: "paragraph",
          text: "Tracing two of the offers by hand against that output:",
        },
        {
          type: "list",
          items: [
            "**offer 1** into `[3, 7, 9]`: it starts at index 3. Parent is index `(3 - 1) / 2 = 1`, holding 7. 1 is smaller, so 7 moves down to index 3. Now at index 1, the parent is index 0, holding 3. 1 is smaller again, so 3 moves down to index 1 and 1 lands at the root. Result `[1, 3, 9, 7]`. Two comparisons, two moves.",
            "**offer 2** into `[1, 3, 8, 7, 5, 9]`: starts at index 6, parent index 2 holds 8, so 8 moves down. At index 2, parent index 0 holds 1, which is smaller, so it stops. Result `[1, 3, 2, 7, 5, 9, 8]`.",
          ],
        },
        {
          type: "paragraph",
          text: "A new element climbs at most the height of the tree, about `log2(n)` levels, so `offer` is O(log n). It doesn't compare with siblings at all.",
        },
        {
          type: "heading",
          text: "PriorityQueue: sift down on poll",
        },
        {
          type: "paragraph",
          text: "When the most urgent patient goes in to see the doctor, the front spot is empty. The nurse takes the person at the very back, puts them at the front, and then lets the more urgent of the two people behind them overtake, repeatedly, until they're in a fair spot. That's **sift down**.",
        },
        {
          type: "list",
          items: [
            "**poll** on `[1, 3, 2, 7, 5, 9, 8]`: the root 1 is the answer. The last element, 8, is removed from the end and sifted down from index 0. Its children are 3 (index 1) and 2 (index 2); the smaller is 2, and 2 < 8, so 2 moves up to index 0. Now at index 2, the only child left is 9 (index 5, since index 6 is gone), and 9 > 8, so 8 stops at index 2. Result `[2, 3, 8, 7, 5, 9]`, exactly the next output line.",
            "Every poll costs at most two comparisons per level (find the smaller child, then compare with it), so `poll` is O(log n).",
          ],
        },
        {
          type: "heading",
          text: "Why iteration and toString aren't sorted",
        },
        {
          type: "paragraph",
          text: "`toString` printed `[1, 3, 2, 7, 5, 9, 8]`, which is just the raw array in index order. The iterator, `forEach` and `toString` all walk the array; none of them pull elements out in priority order. Only repeated `poll` produces sorted order, as the second half of the trace shows (1, 2, 3, 5, 7, 8, 9). If you need everything sorted at once without emptying the queue, copy it into a list and sort that.",
        },
        {
          type: "heading",
          text: "Growth and heapify",
        },
        {
          type: "code",
          language: "java",
          title: "HeapGrow.java",
          code: `import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.PriorityQueue;

public class HeapGrow {
    public static void main(String[] args) throws Exception {
        Field queueField = PriorityQueue.class.getDeclaredField("queue");
        queueField.setAccessible(true);

        PriorityQueue<Integer> pq = new PriorityQueue<>();
        int last = -1;
        for (int i = 1; i <= 100; i++) {
            pq.offer(i);
            int length = ((Object[]) queueField.get(pq)).length;
            if (length != last) System.out.println("size " + i + " -> array length " + length);
            last = length;
        }

        PriorityQueue<Integer> built = new PriorityQueue<>(List.of(7, 3, 9, 1, 5, 8, 2));
        Object[] raw = (Object[]) queueField.get(built);
        System.out.println("heapified: " + Arrays.toString(Arrays.copyOf(raw, built.size())));
    }
}`,
        },
        {
          type: "output",
          text: `size 1 -> array length 11
size 12 -> array length 24
size 25 -> array length 50
size 51 -> array length 102
heapified: [1, 3, 2, 7, 5, 8, 9]`,
        },
        {
          type: "list",
          items: [
            "The default capacity is 11 (`DEFAULT_INITIAL_CAPACITY`, from `javap -constants`). Below 64 the array grows by its length plus 2 (11 to 24 to 50 to 102, since 50 is still below 64), and from 64 on by 50%. Extending the loop to 400 elements showed that second rule: 102, 153, 229, 343. An `ArrayDeque` filled the same way went 17, 36, 74, 111, 166.",
            "Building from a collection uses `heapify`: copy everything into the array, then sift down every non-leaf from the middle backwards. That's O(n) in total, cheaper than n separate offers at O(log n) each.",
            "The heapified array, `[1, 3, 2, 7, 5, 8, 9]`, differs from the one built by seven offers, `[1, 3, 2, 7, 5, 9, 8]`. Both are valid heaps. A heap isn't one fixed arrangement, which is another reason never to rely on its iteration order.",
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
          title: "Cheat sheet (fragments)",
          code: `// Queue: FIFO
Queue<String> q = new ArrayDeque<>();
q.offer("a");  q.peek();  q.poll();          // null-returning versions
q.add("b");    q.element();  q.remove();     // throwing versions

// Deque as a stack: LIFO at the head
Deque<String> stack = new ArrayDeque<>();
stack.push("x");  stack.peek();  stack.pop();

// Deque at both ends
Deque<String> d = new ArrayDeque<>();
d.offerFirst("front");  d.offerLast("back");
d.pollFirst();  d.pollLast();  d.peekFirst();  d.peekLast();
d.reversed();                                 // Java 21 view

// PriorityQueue: smallest first by default
Queue<Integer> minHeap = new PriorityQueue<>();
Queue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
Queue<Task> byDue = new PriorityQueue<>(Comparator.comparing(Task::due));
Queue<Integer> fromList = new PriorityQueue<>(List.of(5, 1, 3));   // O(n) heapify`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "offer versus add, poll versus remove",
        },
        {
          type: "paragraph",
          text: "At a counter with no one in line, \"next please\" gets silence (`poll` returns `null`), while a strict clerk raises an alarm (`remove` throws). To see `offer` versus `add` I needed a queue that can be full, so I borrowed `ArrayBlockingQueue` with room for one person. It belongs to the `BlockingQueue` family, which is covered in the Multithreading and Concurrency track; here I only use its plain `Queue` methods.",
        },
        {
          type: "code",
          language: "java",
          title: "QueueMethods.java",
          code: `import java.util.ArrayDeque;
import java.util.Queue;
import java.util.concurrent.ArrayBlockingQueue;

public class QueueMethods {
    public static void main(String[] args) {
        Queue<String> counter = new ArrayDeque<>();
        System.out.println(counter.poll() + " " + counter.peek());   // empty: null
        try {
            counter.remove();
        } catch (Exception e) {
            System.out.println("remove(): " + e.getClass().getSimpleName());
        }
        try {
            counter.element();
        } catch (Exception e) {
            System.out.println("element(): " + e.getClass().getSimpleName());
        }

        Queue<String> oneSeat = new ArrayBlockingQueue<>(1);         // bounded queue
        System.out.println(oneSeat.offer("Asha") + " " + oneSeat.offer("Ravi"));
        try {
            oneSeat.add("Meera");
        } catch (Exception e) {
            System.out.println("add(): " + e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `null null
remove(): NoSuchElementException
element(): NoSuchElementException
true false
add(): IllegalStateException: Queue full`,
        },
        {
          type: "paragraph",
          text: "On an unbounded queue like `ArrayDeque` or `PriorityQueue`, `add` and `offer` behave the same, since there's no \"full\". I still use `offer`/`poll`/`peek` by default, because code written that way keeps working if the queue is later swapped for a bounded one.",
        },
        {
          type: "heading",
          text: "A waiting list and an undo stack",
        },
        {
          type: "paragraph",
          text: "Two everyday jobs, one class. A restaurant waiting list seats people in the order they arrived. An editor's undo button reverses the last change first.",
        },
        {
          type: "code",
          language: "java",
          title: "UndoAndWaiting.java",
          code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Queue;

public class UndoAndWaiting {
    public static void main(String[] args) {
        // A restaurant waiting list: first come, first seated
        Queue<String> waitingList = new ArrayDeque<>();
        waitingList.offer("Asha (2 people)");
        waitingList.offer("Ravi (4 people)");
        waitingList.offer("Meera (3 people)");
        System.out.println("Seat now: " + waitingList.poll() + ", next up: " + waitingList.peek());

        // An editor's undo history: last change undone first
        Deque<String> undo = new ArrayDeque<>();
        StringBuilder text = new StringBuilder();
        for (String word : new String[] {"Pickup", " at", " gate 4"}) {
            text.append(word);
            undo.push(word);
        }
        System.out.println(text);
        String last = undo.pop();
        text.setLength(text.length() - last.length());
        System.out.println(text + "   (undid \\"" + last + "\\")");
    }
}`,
        },
        {
          type: "output",
          text: `Seat now: Asha (2 people), next up: Ravi (4 people)
Pickup at gate 4
Pickup at   (undid " gate 4")`,
        },
        {
          type: "heading",
          text: "Stack versus ArrayDeque, side by side",
        },
        {
          type: "code",
          language: "java",
          title: "StackVsDeque.java",
          code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Stack;

public class StackVsDeque {
    public static void main(String[] args) {
        Stack<String> oldStack = new Stack<>();
        Deque<String> plates = new ArrayDeque<>();
        for (String plate : new String[] {"red", "green", "blue"}) {
            oldStack.push(plate);
            plates.push(plate);
        }
        System.out.println("Stack:      " + oldStack + " peek=" + oldStack.peek());
        System.out.println("ArrayDeque: " + plates + " peek=" + plates.peek());
        System.out.println(oldStack.get(0) + " " + oldStack.search("red"));  // Vector leaks through
        try {
            plates.push(null);
        } catch (NullPointerException e) {
            System.out.println("ArrayDeque refuses null");
        }
    }
}`,
        },
        {
          type: "output",
          text: `Stack:      [red, green, blue] peek=blue
ArrayDeque: [blue, green, red] peek=blue
red 3
ArrayDeque refuses null`,
        },
        {
          type: "list",
          items: [
            "Both agree the top plate is `blue`. But they **print** in opposite orders. `Stack` is a `Vector` that pushes at the end, so it prints bottom to top. ArrayDeque pushes at the head, so it prints and iterates top to bottom, the order things would pop. Code that iterates a stack gives different results after switching classes.",
            "`oldStack.get(0)` reached the bottom plate directly, which no real stack should allow. That's the `Vector` inheritance leaking through.",
            "ArrayDeque rejects `null` with a `NullPointerException`, because `null` is its \"empty\" signal from `poll`/`peek`.",
          ],
        },
        {
          type: "heading",
          text: "Hospital triage with a comparator",
        },
        {
          type: "paragraph",
          text: "Triage has two rules: most severe first, and among equally severe patients, whoever arrived first. A `Comparator` expresses both, and `Collections.reverseOrder()` turns the default min-heap into a max-heap:",
        },
        {
          type: "code",
          language: "java",
          title: "Triage.java",
          code: `import java.util.Collections;
import java.util.Comparator;
import java.util.PriorityQueue;

public class Triage {
    record Patient(String name, int severity, int arrival) {}

    public static void main(String[] args) {
        PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        maxHeap.addAll(java.util.List.of(4, 9, 1, 7));
        System.out.println(maxHeap.poll() + " " + maxHeap.poll());

        Comparator<Patient> mostUrgentFirst = Comparator
                .comparingInt(Patient::severity).reversed()        // 5 = critical
                .thenComparingInt(Patient::arrival);               // then who came first
        PriorityQueue<Patient> er = new PriorityQueue<>(mostUrgentFirst);
        er.offer(new Patient("Asha", 2, 1));
        er.offer(new Patient("Ravi", 5, 2));
        er.offer(new Patient("Meera", 3, 3));
        er.offer(new Patient("Imran", 5, 4));
        while (!er.isEmpty()) {
            Patient p = er.poll();
            System.out.println(p.name() + " severity=" + p.severity());
        }
    }
}`,
        },
        {
          type: "output",
          text: `9 7
Ravi severity=5
Imran severity=5
Meera severity=3
Asha severity=2`,
        },
        {
          type: "paragraph",
          text: "Ravi and Imran are both severity 5, and Ravi arrived earlier, so he's first. That only works because of `thenComparingInt(Patient::arrival)`. A heap is **not stable**: without the tie-breaker, equal elements come out in whatever order the sifting leaves them. I checked that with five orders of equal priority A to E plus one more urgent order X: they came out `X C E D A B`.",
        },
        {
          type: "heading",
          text: "Top K: the three nearest drivers",
        },
        {
          type: "paragraph",
          text: "Picking the three tallest kids for a photo from a long line doesn't need everyone sorted. Keep the best three so far, and whenever a new kid beats the **shortest** of those three, swap them. The trick is that \"the worst of my current best\" must be quick to find, which is exactly a heap's root.",
        },
        {
          type: "paragraph",
          text: "For the K **nearest** drivers, keep a **max**-heap of size K by distance. The farthest of the current best sits on top. Offer every driver, and if the heap grows past K, poll the farthest away:",
        },
        {
          type: "code",
          language: "java",
          title: "NearestDrivers.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;

public class NearestDrivers {
    record Driver(String name, double km) {}

    static List<Driver> nearest(List<Driver> drivers, int k) {
        // max-heap of size k: the farthest of the current best k sits on top
        PriorityQueue<Driver> best = new PriorityQueue<>(
                Comparator.comparingDouble(Driver::km).reversed());
        for (Driver d : drivers) {
            best.offer(d);
            if (best.size() > k) best.poll();      // throw away the farthest
        }
        List<Driver> result = new ArrayList<>(best);
        result.sort(Comparator.comparingDouble(Driver::km));
        return result;
    }

    public static void main(String[] args) {
        List<Driver> online = List.of(new Driver("Asha", 2.4), new Driver("Ravi", 0.8),
                new Driver("Meera", 5.1), new Driver("Imran", 1.6),
                new Driver("Kabir", 3.3), new Driver("Tara", 0.9));
        nearest(online, 3).forEach(d -> System.out.println(d.name() + " " + d.km() + " km"));
    }
}`,
        },
        {
          type: "output",
          text: `Ravi 0.8 km
Tara 0.9 km
Imran 1.6 km`,
        },
        {
          type: "list",
          items: [
            "The heap never holds more than K + 1 drivers, so memory is O(K) and time is O(n log K). For K = 3 out of thousands of drivers, that's much cheaper than sorting everyone at O(n log n).",
            "The direction feels backwards at first: for the K **smallest**, use a **max**-heap; for the K **largest**, use a **min**-heap. The heap's root is always the one you'd throw out next.",
            "The final `sort` is only over K elements, because the heap's own order isn't sorted.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Changing an element's priority while it's in the heap",
        },
        {
          type: "paragraph",
          text: "If a patient's condition gets worse while they're waiting, the nurse has to physically move them up the line. Just writing a new number on their chart doesn't move them. A PriorityQueue only sifts during `offer`, `poll` and `remove`; it has no idea a field changed:",
        },
        {
          type: "code",
          language: "java",
          title: "MutablePriority.java",
          code: `import java.util.Comparator;
import java.util.PriorityQueue;

public class MutablePriority {
    static class Ticket {
        String id; int priority;
        Ticket(String id, int priority) { this.id = id; this.priority = priority; }
        public String toString() { return id + "(p" + priority + ")"; }
    }

    public static void main(String[] args) {
        PriorityQueue<Ticket> desk = new PriorityQueue<>(Comparator.comparingInt((Ticket t) -> t.priority));
        Ticket refund = new Ticket("T1", 3);
        desk.offer(refund);
        desk.offer(new Ticket("T2", 2));
        desk.offer(new Ticket("T3", 4));

        refund.priority = 1;                    // changed while inside the heap
        System.out.println("wrong: " + desk.peek() + " " + desk);

        desk.remove(refund);                    // the fix: take it out...
        desk.offer(refund);                     // ...and put it back so it sifts
        System.out.println("right: " + desk.peek() + " " + desk);
    }
}`,
        },
        {
          type: "output",
          text: `wrong: T2(p2) [T2(p2), T1(p1), T3(p4)]
right: T1(p1) [T1(p1), T3(p4), T2(p2)]`,
        },
        {
          type: "paragraph",
          text: "After the change, T1 had priority 1 but sat at index 1 behind T2, breaking the heap rule, and `peek` returned the wrong ticket. Removing and re-offering fixed it. Note `remove(Object)` is O(n), because it has to search the array. Better still, make queue elements immutable and replace them with a new object.",
        },
        {
          type: "heading",
          text: "Expecting a PriorityQueue to iterate in order",
        },
        {
          type: "paragraph",
          text: "`HeapWalk` printed `[1, 3, 2, 7, 5, 9, 8]` from `toString`. A for-each loop, `stream()` and `forEach` give that same array order. Only `poll` in a loop is sorted.",
        },
        {
          type: "heading",
          text: "Assuming equal priorities come out first come, first served",
        },
        {
          type: "paragraph",
          text: "My equal-priority test came out `X C E D A B`, not A to E. If arrival order matters among equals, add a sequence number or timestamp as a tie-breaker in the comparator.",
        },
        {
          type: "heading",
          text: "Using Stack, or LinkedList as a queue",
        },
        {
          type: "paragraph",
          text: "`Stack` locks on every call and exposes the whole `Vector` API. `LinkedList` allocates a node per element. `ArrayDeque` is the right default for both stacks and queues on one thread.",
        },
        {
          type: "heading",
          text: "Pushing null into an ArrayDeque or PriorityQueue",
        },
        {
          type: "paragraph",
          text: "Both throw `NullPointerException`, as `StackVsDeque` showed. Use an explicit marker object or an `Optional` if \"nothing\" must be represented.",
        },
        {
          type: "heading",
          text: "Writing a comparator with subtraction",
        },
        {
          type: "paragraph",
          text: "`(a, b) -> a.priority - b.priority` overflows for large or negative values and gives the wrong sign. Use `Comparator.comparingInt(...)` or `Integer.compare(a, b)`.",
        },
        {
          type: "heading",
          text: "Getting the stack's print order backwards after switching",
        },
        {
          type: "paragraph",
          text: "`Stack` prints bottom to top, `ArrayDeque` top to bottom. Tests or logs that compare the printed form break when the class changes.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use `ArrayDeque` for both stacks and FIFO queues in single-threaded code. Declare it as `Deque` for a stack, `Queue` for a queue.",
            "Prefer `offer`, `poll` and `peek`, and handle the `null` from `poll`/`peek` explicitly. Use the throwing versions only where empty or full really is a bug.",
            "Give every PriorityQueue an explicit comparator with a tie-breaker when order among equals matters, typically a monotonically increasing sequence number.",
            "Keep elements in a PriorityQueue immutable, or at least never change the fields the comparator reads while they're queued.",
            "Build a heap from existing data with the constructor (`new PriorityQueue<>(collection)`), which heapifies in O(n), rather than offering one by one.",
            "For top-K, keep a heap of size K with the opposite order (max-heap for smallest K) instead of sorting everything.",
            "If you know roughly how many elements are coming, pass an initial capacity to avoid repeated growth.",
            "When threads share a queue, don't wrap these classes in locks yourself: use the `BlockingQueue` or `ConcurrentLinkedQueue` classes, covered in the Multithreading and Concurrency track.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "table",
          headers: ["Operation", "ArrayDeque", "LinkedList", "PriorityQueue", "Stack"],
          rows: [
            ["Add at an end", "O(1) amortized", "O(1)", "O(log n) `offer`", "O(1) amortized `push`"],
            ["Remove from an end", "O(1)", "O(1)", "O(log n) `poll`", "O(1) `pop`"],
            ["Peek", "O(1)", "O(1)", "O(1)", "O(1)"],
            ["`contains`, `remove(Object)`", "O(n)", "O(n)", "O(n)", "O(n)"],
            ["Build from n items", "O(n)", "O(n)", "O(n) heapify", "O(n)"],
            ["Memory per element", "one array slot", "node object + slot", "one array slot", "one array slot"],
            ["Locking", "none", "none", "none", "every call `synchronized`"],
            ["`null` allowed", "no", "yes", "no", "yes"],
          ],
        },
        {
          type: "list",
          items: [
            "**Growth.** Both ArrayDeque and PriorityQueue grow by roughly doubling while small (size + 2) and by 50% once large, which I saw as 5 to 12 for ArrayDeque and 11, 24, 50, 102 for PriorityQueue. Each growth copies the array, which is why `add` is O(1) **amortized**, not O(1) every time.",
            "**Memory locality.** Array-based structures keep references in one block. A LinkedList node per element means more allocations, more garbage collection work, and pointer chasing through memory. This is the main practical reason ArrayDeque is the default.",
            "**Comparison cost.** A PriorityQueue makes about `log2(n)` comparisons per `offer` and up to twice that per `poll`. With a comparator chain (`comparing(...).thenComparing(...)`) each comparison does a bit more work. It rarely matters, but a heap of a million elements does about 20 levels per operation.",
            "**Neither shrinks.** Polling everything out of a huge ArrayDeque or PriorityQueue leaves the big array allocated. Drop the reference and create a new one if the spike won't come back.",
          ],
        },
        {
          type: "paragraph",
          text: "As in the other lessons, no timings here on purpose. The Big-O classes and the structural facts are reliable; real speed should be measured with JMH on the real workload.",
        },
      ],
    },
    {
      title: "PriorityQueue in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A small, realistic service: a **support ticket desk** for a ride-hailing app. Tickets arrive all day with a priority. An agent clicks \"next\" and must get the most important open ticket, and among tickets of the same priority, the oldest one. That's a PriorityQueue with a two-part comparator.",
        },
        {
          type: "code",
          language: "java",
          title: "SupportDesk.java",
          code: `import java.util.Comparator;
import java.util.PriorityQueue;

public class SupportDesk {
    enum Priority { URGENT, HIGH, NORMAL }          // declaration order = importance

    record Ticket(long seq, String subject, Priority priority) {}

    private final PriorityQueue<Ticket> open = new PriorityQueue<>(
            Comparator.comparing(Ticket::priority).thenComparingLong(Ticket::seq));
    private long nextSeq = 1;

    void raise(String subject, Priority priority) {
        open.offer(new Ticket(nextSeq++, subject, priority));
    }

    Ticket next() {
        return open.poll();                          // null when the desk is clear
    }

    public static void main(String[] args) {
        SupportDesk desk = new SupportDesk();
        desk.raise("Change profile photo", Priority.NORMAL);
        desk.raise("Charged twice for a trip", Priority.URGENT);
        desk.raise("Driver was rude", Priority.HIGH);
        desk.raise("Card declined at pickup", Priority.URGENT);
        desk.raise("Receipt email missing", Priority.NORMAL);

        for (Ticket t = desk.next(); t != null; t = desk.next())
            System.out.println("#" + t.seq() + " " + t.priority() + "  " + t.subject());
    }
}`,
        },
        {
          type: "output",
          text: `#2 URGENT  Charged twice for a trip
#4 URGENT  Card declined at pickup
#3 HIGH  Driver was rude
#1 NORMAL  Change profile photo
#5 NORMAL  Receipt email missing`,
        },
        {
          type: "list",
          items: [
            "Enums are `Comparable` by declaration order, so `Comparator.comparing(Ticket::priority)` puts `URGENT` first without any numbers to get wrong.",
            "The sequence number is the tie-breaker. Without it, the two URGENT tickets and the two NORMAL tickets could come out in any order, as the stability test showed. With it, it's fair: oldest first within each level.",
            "`Ticket` is an immutable record, so nothing can change its priority while it's queued. Re-prioritising a ticket means removing it and raising a new one.",
            "`next()` returns `null` on an empty desk, which the loop uses as its stop condition, the natural use of `poll`.",
            "This is single-threaded. A real desk has many agents clicking \"next\" at once, and two of them must never get the same ticket. That calls for `PriorityBlockingQueue` or, more commonly, the database itself (\"select the next open ticket and lock it\"). The concurrent queues are covered in the Multithreading and Concurrency track.",
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
              question: "What's the difference between offer/poll/peek and add/remove/element?",
              answer:
                "They do the same jobs, but report failure differently. `add` throws `IllegalStateException` when a bounded queue is full, while `offer` returns `false`. `remove` and `element` throw `NoSuchElementException` on an empty queue, while `poll` and `peek` return `null`.\n\nI ran all six: on an empty `ArrayDeque`, `poll` and `peek` printed `null` while `remove` and `element` threw, and on an `ArrayBlockingQueue` of capacity 1, the second `offer` returned `false` while `add` threw \"Queue full\".",
            },
            {
              question: "What is a Deque, and how do you use it as a stack and as a queue?",
              answer:
                "A double-ended queue: you can add, remove and peek at both the head and the tail. As a FIFO queue, add at the tail with `offer` and remove from the head with `poll`. As a LIFO stack, use `push`, `pop` and `peek`, which all work at the head.\n\n`ArrayDeque` is the standard implementation for both. Since Java 21, `Deque` also extends `SequencedCollection`, which `javap` confirms.",
            },
            {
              question: "Why should you prefer ArrayDeque over Stack?",
              answer:
                "`Stack` extends `Vector`, so every method is `synchronized` (`javap` shows `public synchronized E pop()`), and it exposes list operations like `get(0)` that let anyone reach the bottom of the stack. ArrayDeque has no locking overhead and only deque operations.\n\nThe `Stack` Javadoc itself recommends `Deque<Integer> stack = new ArrayDeque<Integer>()`. One difference to remember when switching: Stack prints bottom to top, ArrayDeque top to bottom.",
            },
            {
              question: "Why should you prefer ArrayDeque over LinkedList as a queue?",
              answer:
                "LinkedList allocates a node object with `prev` and `next` pointers for every element, so it uses more memory, creates more garbage, and scatters elements across the heap. ArrayDeque keeps references in one contiguous circular array and only allocates when it grows.\n\nBoth give O(1) operations at the ends, so the difference is constant factors and memory. LinkedList allows `null` and implements `List`, but neither is useful for a queue.",
            },
            {
              question: "What does a PriorityQueue return first by default?",
              answer:
                "The smallest element by natural ordering, so it's a min-heap. For a max-heap, pass `Collections.reverseOrder()` or `Comparator.reverseOrder()`, or reverse a custom comparator with `.reversed()`.\n\nIn my `Triage` example, a reversed queue of 4, 9, 1, 7 polled 9 then 7.",
            },
            {
              question: "Can you store null in these queues?",
              answer:
                "Not in ArrayDeque or PriorityQueue: both throw `NullPointerException`, because `poll` and `peek` use `null` to mean empty. LinkedList and Stack do allow `null`, which makes their `poll`/`peek` results ambiguous.\n\nMy `StackVsDeque` test showed `plates.push(null)` throwing on an ArrayDeque.",
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
              question: "Why doesn't iterating or printing a PriorityQueue give sorted order?",
              answer:
                "Because the iterator and `toString` just walk the internal array in index order, and a heap array is only partially ordered: each parent is smaller than its children, but siblings and cousins can be in any order.\n\nAfter offering 7, 3, 9, 1, 5, 8, 2, `toString` printed `[1, 3, 2, 7, 5, 9, 8]`. Only repeatedly calling `poll` gave 1, 2, 3, 5, 7, 8, 9. For a sorted view without emptying the queue, copy to a list and sort it.",
            },
            {
              question: "Is PriorityQueue stable? What happens with equal priorities?",
              answer:
                "No. Elements that compare as equal come out in whatever order sifting leaves them, not in insertion order.\n\nI offered five orders A to E with the same priority plus one more urgent X, and they came out `X C E D A B`. If first-come-first-served matters among equals, add a sequence number or timestamp as a tie-breaker in the comparator, like the `seq` field in my support desk.",
            },
            {
              question: "What happens if you change the priority field of an element already in a PriorityQueue?",
              answer:
                "Nothing moves, so the heap rule is silently broken. The queue only sifts during `offer`, `poll` and `remove`, so `peek` and `poll` can return the wrong element afterwards.\n\nIn my test, lowering T1's priority to 1 while queued still gave T2 from `peek`. The fix is to `remove` the element (O(n)), change it, and `offer` it again, or better, keep elements immutable and offer a replacement.",
            },
            {
              question: "How do you find the K smallest elements of a large stream efficiently?",
              answer:
                "Keep a max-heap of size K. Offer each element, and whenever the size exceeds K, poll, which removes the largest of the current candidates. At the end, the heap holds the K smallest. That's O(n log K) time and O(K) memory, versus O(n log n) to sort everything.\n\nMy `NearestDrivers` found the 3 nearest of 6 drivers that way: Ravi 0.8, Tara 0.9, Imran 1.6. For the K largest, it's the mirror: a min-heap of size K.",
            },
            {
              question: "How would you implement an undo feature, and why a stack?",
              answer:
                "Every change is pushed onto a stack as it happens, and undo pops the most recent one and reverses it. A stack fits because undo must reverse changes in the opposite order they were made: last in, first out.\n\nIn Java that's a `Deque` with `push` and `pop`. A redo feature adds a second stack: undo pops from the undo stack and pushes onto the redo stack, and any new change clears the redo stack.",
            },
            {
              question: "Which queues are safe to share between threads?",
              answer:
                "None of ArrayDeque, LinkedList or PriorityQueue are. For thread-safe use there's `ConcurrentLinkedQueue` and `ConcurrentLinkedDeque` (non-blocking), and the `BlockingQueue` family, like `ArrayBlockingQueue`, `LinkedBlockingQueue` and `PriorityBlockingQueue`, where `put` and `take` wait for space or elements.\n\nThose get their own lesson in the Multithreading and Concurrency track. `Stack` is synchronized per call, but that doesn't make check-then-act sequences like \"if not empty, pop\" safe.",
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
              question: "How is a binary heap stored in PriorityQueue?",
              answer:
                "In a plain `Object[]` called `queue`, which `javap` shows along with `size` and `comparator`. The tree is implicit: the children of index `i` are at `2i + 1` and `2i + 2`, and the parent is at `(i - 1) / 2`. The heap rule is that every parent is less than or equal to its children, so the minimum is always at index 0.\n\nNo node objects, no pointers. Reading the array with reflection after a few offers gave `[1, 3, 2, 7, 5, 9, 8]`, which is exactly that tree laid out level by level.",
            },
            {
              question: "Explain sift up and sift down.",
              answer:
                "Sift up runs on `offer`: the new element goes into the next free slot and swaps with its parent while it's smaller than the parent. Sift down runs on `poll`: the root is removed, the last element moves to the root, and it swaps with its smaller child while it's bigger than that child. Both touch one node per level, so they're O(log n).\n\nI traced offering 1 into `[3, 7, 9]`: it went into index 3, beat 7 at index 1, then beat 3 at index 0, giving `[1, 3, 9, 7]`. And polling `[1, 3, 2, 7, 5, 9, 8]` moved 8 to the root, swapped it with the smaller child 2, and stopped above 9, giving `[2, 3, 8, 7, 5, 9]`.",
            },
            {
              question: "Why is building a heap from a collection O(n) and not O(n log n)?",
              answer:
                "`heapify` copies all elements into the array and then sifts down every non-leaf node, starting from the last parent and working back to the root. Most nodes are near the bottom and can only sift down a level or two; only a few near the top can travel far. The sum works out to O(n).\n\nThe PriorityQueue constructor that takes a collection uses it. It can produce a different, equally valid arrangement: my heapified `[7, 3, 9, 1, 5, 8, 2]` became `[1, 3, 2, 7, 5, 8, 9]`, while offering the same values one by one gave `[1, 3, 2, 7, 5, 9, 8]`.",
            },
            {
              question: "How does ArrayDeque work internally?",
              answer:
                "It's a circular buffer: an `Object[] elements` with `head` (index of the first element) and `tail` (index of the next free slot), both wrapping around the array. `addLast` writes at `tail` and moves it forward, `addFirst` moves `head` backward and writes there, and removals clear a slot and move an index. Nothing else ever shifts.\n\nIt always keeps one slot empty, so `head == tail` can only mean empty. My trace showed `new ArrayDeque<>(4)` creating a 5-slot array, `addFirst` on index 0 wrapping head to 4, and the array growing from 5 to 12 slots when the last spare slot was used, with the front segment moved to the end of the new array.",
            },
            {
              question: "How do ArrayDeque and PriorityQueue grow?",
              answer:
                "Both copy into a bigger array when full. While the array is small (under 64), the new length is roughly double plus 2; after that, it grows by 50%. That keeps `add`/`offer` O(1) amortized for ArrayDeque and O(log n) amortized for PriorityQueue.\n\nWith reflection I saw PriorityQueue go from its default 11 slots to 24, 50 and 102, and a 5-slot ArrayDeque grow to 12. Neither shrinks when emptied.",
            },
            {
              question: "Why does ArrayDeque not have a size field?",
              answer:
                "Because the size can be computed from `head`, `tail` and the array length: it's the distance from head to tail, wrapping around. One fewer field to keep in sync on every operation.\n\n`javap -p java.util.ArrayDeque` lists only `elements`, `head` and `tail` as instance fields, and `size()` is a small calculation. PriorityQueue, by contrast, has an explicit `size` field, since its elements always fill indexes 0 to size minus 1.",
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
            "Check whether brackets in a string like `\"{[()]}\"` are balanced using a `Deque` as a stack. Hint: push opening brackets, pop and compare on closing ones, and the stack must be empty at the end.",
            "Simulate a cab stand with an `ArrayDeque`: cabs join at the back, passengers take from the front, and a returning cab can rejoin at the front with `offerFirst`. Print the stand after each step.",
            "Copy `DequeWalk`, start with `new ArrayDeque<>(2)`, and predict `head`, `tail` and the array length before each step. Hint: the array always has one spare slot.",
            "Copy `HeapWalk` with your own numbers and draw the tree after each `offer` on paper before running. Hint: parent of `i` is `(i - 1) / 2`.",
            "Turn `Triage` into a max-heap of fares and print the three highest. Hint: `Comparator.reverseOrder()`, then three polls.",
            "Find the 5 largest numbers in a list of 1,000 random ints with a min-heap of size 5, and compare your answer with sorting. Hint: poll when size goes over 5.",
            "Add browser back and forward buttons with two stacks. Hint: visiting a new page clears the forward stack.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Solution sketch for exercise 1",
              answer:
                "Loop over the characters. On `(`, `[` or `{`, `push` it. On a closing bracket, if the stack is empty or `pop()` isn't the matching opener, return `false`. After the loop, return `stack.isEmpty()`.\n\n`\"{[()]}\"` is balanced, `\"{[(])}\"` fails at `]`, and `\"((\"` fails because the stack isn't empty at the end.",
            },
            {
              question: "Solution sketch for exercise 7",
              answer:
                "Keep the current page plus two `Deque`s. Visiting a page pushes the current page onto `back` and clears `forward`. Back pushes the current page onto `forward` and pops from `back`. Forward does the mirror image.\n\nIt's the undo/redo pattern again: two stacks, and a new action wipes the redo side.",
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
          text: `QUEUE (FIFO)     offer / poll / peek       null or false on failure
                 add / remove / element    throw on failure
DEQUE            both ends: offerFirst/Last, pollFirst/Last
  as a stack     push / pop / peek          all at the HEAD
ARRAYDEQUE       Object[] elements + head + tail, circular
                 one slot always empty (head == tail -> empty)
                 grows ~2x (+2) under 64, then +50%; no nulls
                 beats Stack (synchronized, Vector API)
                 beats LinkedList (node per element)

PRIORITYQUEUE    binary min-heap in Object[] queue
                 children 2i+1, 2i+2   parent (i-1)/2
                 offer -> sift up    poll -> sift down   O(log n)
                 peek O(1)   heapify O(n)   default capacity 11
                 iteration/toString NOT sorted; not stable
                 max-heap: Comparator.reverseOrder()
                 top-K smallest: max-heap of size K

THREADS          none of these; BlockingQueue family ->
                 Multithreading and Concurrency track`,
          caption: "Three rules for what comes out next, and the structures behind them.",
        },
        {
          type: "list",
          items: [
            "Use `ArrayDeque` for both queues and stacks: a circular array with O(1) work at both ends and no per-element objects.",
            "A `PriorityQueue` is a heap in an array. It always knows the smallest element and nothing more, so iteration isn't sorted and equal priorities aren't first come, first served.",
            "Never change what a comparator reads while an element is queued, add a tie-breaker when fairness matters, and reach for the concurrent queues once threads share the work.",
          ],
        },
      ],
    },
  ],
};
