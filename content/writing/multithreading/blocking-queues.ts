import type { Lesson } from "../types";

export const blockingQueues: Lesson = {
  slug: "blocking-queues",
  date: "2026-11-14",
  title: "BlockingQueue Implementations",
  description:
    "Every BlockingQueue in java.util.concurrent, opened up on JDK 21: the four-way method matrix (throw, special value, block, time out) demonstrated call by call, ArrayBlockingQueue's ring buffer under one ReentrantLock with notEmpty and notFull conditions, LinkedBlockingQueue's separate putLock and takeLock and its Integer.MAX_VALUE default capacity, consumers caught parked on the Condition in a thread dump, ABQ against LBQ measured with 1 and 4 producers and consumers, a fair ArrayBlockingQueue that was 80 times slower and made 800,000 parks for 400,000 items, SynchronousQueue's zero-capacity hand-off and how the cached thread pool depends on it, PriorityBlockingQueue, DelayQueue for retries and expiring offers, LinkedTransferQueue's transfer, LinkedBlockingDeque for work stealing, why every one of them rejects null, drainTo batching that cut 20,000 database round trips to 80, and a fair queue in a ride-hailing location pipeline that couldn't keep up with peak hour.",
  tags: ["Multithreading", "Concurrency", "BlockingQueue", "Performance"],
  sections: [
    {
      title: "What BlockingQueue Implementations Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, ConcurrentHashMap Atomic Operations and Pitfalls, was about many threads updating **shared state** safely: `compute`, `merge`, `putIfAbsent` and the traps around them. This lesson is about the other way threads cooperate: one thread **hands work** to another. A GPS ingest thread receives a location ping and passes it to a thread that writes to the database. A request thread passes a payout to a retry worker. A thread pool's submitters pass tasks to its workers. The structure in the middle of every one of these is a `BlockingQueue`.",
        },
        {
          type: "paragraph",
          text: "A `BlockingQueue` is a thread-safe `Queue` with one extra ability: it can make a thread **wait**. `take()` on an empty queue parks the consumer until something arrives; `put()` on a full queue parks the producer until there is room. That waiting is the whole point. Without it, a consumer has to spin in a loop calling `poll()` and burning CPU, and a producer has no way to slow down when the consumer falls behind. The Collections lesson \"Queue, Deque and PriorityQueue\" ended with the remark that none of `ArrayDeque`, `LinkedList` or `PriorityQueue` is safe for threads and pointed here.",
        },
        {
          type: "paragraph",
          text: "There are seven implementations in `java.util.concurrent`, and they differ in ways that matter in production: bounded or unbounded, one lock or two, FIFO or priority or delay order, storage or no storage at all. I opened each one with `javap`, caught waiting threads in thread dumps, measured throughput and allocation, and found one setting (fairness) that made a queue 80 times slower. The next lesson, Producer-Consumer, Backpressure and Clean Shutdown, builds complete pipelines on top of these queues.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Before Java 5, a producer-consumer buffer was written by hand with `synchronized`, `wait()` and `notifyAll()`, exactly the bounded buffer from the lesson synchronized, Monitors and Race Conditions. Everyone wrote it slightly differently, and the classic bugs (`if` instead of `while` around `wait`, `notify` instead of `notifyAll`, a lost wake-up) were everywhere. Doug Lea had published a `BoundedBuffer`, `LinkedQueue` and `SynchronousChannel` in his `EDU.oswego.cs.dl.util.concurrent` library in the late 1990s, and JSR 166, led by him, turned those into `java.util.concurrent`.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`Object.wait`/`notify`, `Vector`", "Hand-written buffers, one monitor per object"],
            ["Java 5 (2004)", "JSR 166: `BlockingQueue`, `ArrayBlockingQueue`, `LinkedBlockingQueue`, `PriorityBlockingQueue`, `DelayQueue`, `SynchronousQueue`; `ReentrantLock` and `Condition`; `ThreadPoolExecutor` built on a `BlockingQueue`", "The four-way method matrix and the one-lock/two-lock designs date from here"],
            ["Java 6 (2006)", "`BlockingDeque`, `LinkedBlockingDeque`; `SynchronousQueue` rewritten with non-blocking dual stack and dual queue (Scherer, Lea, Scott)", "Blocking at both ends"],
            ["Java 7 (2011)", "`TransferQueue`, `LinkedTransferQueue`; `ForkJoinPool` with work-stealing deques", "`transfer()`: wait until a consumer has the element"],
            ["Java 8 (2014)", "Spliterators, `forEach` and `removeIf` on the concurrent queues", "Queues work with streams (weakly consistent)"],
            ["Java 21 (2023)", "Virtual threads (JEP 444); `SynchronousQueue` reimplemented on top of `LinkedTransferQueue`", "A virtual thread blocked in `take()` unmounts from its carrier; `javap` shows the new `SynchronousQueue$Transferer extends LinkedTransferQueue`"],
          ],
        },
        {
          type: "paragraph",
          text: "The last row surprised me. On JDK 17, `javap -p java.util.concurrent.SynchronousQueue` still lists the Java 6 design (`TransferStack`, `TransferQueue`, `SPIN_FOR_TIMEOUT_THRESHOLD`). On the JDK 21 build used here, the class has a single `transferer` field whose type is `SynchronousQueue$Transferer<E> extends LinkedTransferQueue<E>`, with an `xferLifo` method for the unfair (stack-like) mode. The old `qlock`, `waitingProducers` and `waitingConsumers` fields are still declared, but only so that serialized queues from old JDKs can be read.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the pickup counter at a busy restaurant in Salt Lake that serves a food-delivery app.",
        },
        {
          type: "list",
          items: [
            "**The counter shelf is an `ArrayBlockingQueue`.** It has room for exactly 12 bags. Cooks (producers) put bags on it, delivery riders (consumers) take them. When the shelf is full, a cook stands holding the bag until a slot frees up: `put()` blocking. When it's empty, riders wait on the bench: `take()` blocking. One manager with one key controls the whole shelf: one lock.",
            "**A `LinkedBlockingQueue` is a long conveyor belt with two doors**, one at the kitchen end and one at the pickup end, each with its own key. Cooks and riders never queue for the same key. If nobody sets a length, the belt is as long as the building allows (`Integer.MAX_VALUE`), and cooks never wait at all, even when no rider has come for an hour.",
            "**`SynchronousQueue` is no shelf at all.** The cook has to hand the bag directly to a rider. If no rider is standing there, the cook waits (or, with `offer`, walks away).",
            "**`PriorityBlockingQueue` is a shelf where the manager always hands out the most urgent order first**, regardless of when it was cooked. **`DelayQueue`** is the \"ready at\" shelf: a bag can't be picked up before its time. **`LinkedTransferQueue`** is a cook who can choose to wait until a rider actually has the bag in hand. **`LinkedBlockingDeque`** is a shelf with access from both sides, so a rider from another restaurant can take the oldest bag from the back while the local rider takes from the front.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real cook waiting at a full shelf is visible to everyone, and the manager would notice. A thread parked in `put()` is invisible unless you take a thread dump or watch queue metrics. And a real belt can't be infinitely long, but an unbounded `LinkedBlockingQueue` will keep accepting work until the heap runs out, which is the production story of the next lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/blocking-queues-locks.svg",
          alt: "Left panel: ArrayBlockingQueue with capacity 4 drawn as a ring of four slots holding T5, T6, null and T4, with putIndex pointing at slot 2 and takeIndex at slot 3. Below it one ReentrantLock box labelled 'every put, take, offer, poll, size and drainTo takes this one lock', and two Condition boxes: notEmpty, where take waits when the count is 0 and which put signals, and notFull, where put waits when full and which take signals. Right panel: LinkedBlockingQueue as a linked list starting with a dummy head node followed by ping-1, ping-2 and ping-3, with head and last pointers, a takeLock with the notEmpty condition on the head side and a putLock with the notFull condition on the tail side; producers and consumers use different locks and share an AtomicInteger count, a put into an empty queue briefly takes takeLock to signal, and the no-argument capacity is Integer.MAX_VALUE. Bottom left: an excerpt of a thread dump showing db-writer-1 WAITING (parking), parking to wait for an AbstractQueuedSynchronizer ConditionObject, at ArrayBlockingQueue.take line 420. Bottom right: the method matrix: add and remove throw, offer and poll return false or null, put and take block, offer and poll with a timeout wait and then return false or null.",
          caption: "ArrayBlockingQueue serialises everything through one lock; LinkedBlockingQueue splits the head and the tail.",
        },
        {
          type: "heading",
          text: "The method matrix",
        },
        {
          type: "table",
          headers: ["Operation", "Throws exception", "Special value", "Blocks", "Times out"],
          rows: [
            ["Insert", "`add(e)`: `IllegalStateException(\"Queue full\")`", "`offer(e)`: `false`", "`put(e)`", "`offer(e, time, unit)`: `false`"],
            ["Remove", "`remove()`: `NoSuchElementException`", "`poll()`: `null`", "`take()`", "`poll(time, unit)`: `null`"],
            ["Examine", "`element()`: `NoSuchElementException`", "`peek()`: `null`", "not applicable", "not applicable"],
            ["Bulk", "", "`drainTo(c)`, `drainTo(c, max)`: count moved", "", ""],
            ["Capacity", "", "`remainingCapacity()`: `Integer.MAX_VALUE` if unbounded", "", ""],
          ],
        },
        {
          type: "paragraph",
          text: "The blocking and timed methods throw `InterruptedException`: a thread parked in `take()` wakes up immediately when interrupted. That's how a well-written consumer is stopped, and the next lesson relies on it.",
        },
        {
          type: "heading",
          text: "The seven implementations",
        },
        {
          type: "table",
          headers: ["Class", "Bound", "Order", "Locking", "Per-element allocation (measured)"],
          rows: [
            ["`ArrayBlockingQueue`", "Fixed, required in the constructor", "FIFO", "One `ReentrantLock`, conditions `notEmpty`/`notFull`; optional fairness", "0 bytes (preallocated `Object[]`)"],
            ["`LinkedBlockingQueue`", "Optional; default `Integer.MAX_VALUE`", "FIFO", "Two locks: `putLock` + `notFull`, `takeLock` + `notEmpty`; `AtomicInteger count`", "24 bytes (`Node`)"],
            ["`LinkedBlockingDeque`", "Optional; default `Integer.MAX_VALUE`", "Both ends", "One lock, two conditions", "24 bytes (`Node` with `prev`)"],
            ["`PriorityBlockingQueue`", "Unbounded (`put` never blocks)", "By `Comparator`/`Comparable`", "One lock, only `notEmpty`", "0 once the array has grown"],
            ["`DelayQueue`", "Unbounded", "By remaining delay; only expired elements come out", "One lock, `available` condition, a `leader` thread", "Inside its `PriorityQueue`"],
            ["`SynchronousQueue`", "Zero: `size()` is always 0", "Hand-off", "Lock-free (on JDK 21, a `LinkedTransferQueue` subclass)", "A node per waiting thread"],
            ["`LinkedTransferQueue`", "Unbounded", "FIFO, plus `transfer`", "Lock-free CAS on `head`/`tail`", "32 bytes (`DualNode`)"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The fields, from javap",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -constants java.util.concurrent.ArrayBlockingQueue | grep -v '('
javap -p -constants java.util.concurrent.LinkedBlockingQueue | grep -v '('
javap -p 'java.util.concurrent.LinkedBlockingQueue$Node' | grep -v '('`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.ArrayBlockingQueue<E> extends java.util.AbstractQueue<E> implements java.util.concurrent.BlockingQueue<E>, java.io.Serializable {
  final java.lang.Object[] items;
  int takeIndex;
  int putIndex;
  int count;
  final java.util.concurrent.locks.ReentrantLock lock;
  private final java.util.concurrent.locks.Condition notEmpty;
  private final java.util.concurrent.locks.Condition notFull;
  transient java.util.concurrent.ArrayBlockingQueue<E>.Itrs itrs;
}
public class java.util.concurrent.LinkedBlockingQueue<E> extends java.util.AbstractQueue<E> implements java.util.concurrent.BlockingQueue<E>, java.io.Serializable {
  private final int capacity;
  private final java.util.concurrent.atomic.AtomicInteger count;
  transient java.util.concurrent.LinkedBlockingQueue$Node<E> head;
  private transient java.util.concurrent.LinkedBlockingQueue$Node<E> last;
  private final java.util.concurrent.locks.ReentrantLock takeLock;
  private final java.util.concurrent.locks.Condition notEmpty;
  private final java.util.concurrent.locks.ReentrantLock putLock;
  private final java.util.concurrent.locks.Condition notFull;
}
class java.util.concurrent.LinkedBlockingQueue$Node<E> {
  E item;
  java.util.concurrent.LinkedBlockingQueue$Node<E> next;
}`,
        },
        {
          type: "list",
          items: [
            "**`ArrayBlockingQueue`** is a plain `Object[]`, two indexes and a `count`, all guarded by one `ReentrantLock`. `count` is a plain `int`, not volatile and not atomic: the lock provides the visibility (the happens-before rule from the volatile lesson applies to `unlock`/`lock` pairs). Both conditions come from that one lock (`lock.newCondition()`), which is why a waiting `take()` and a waiting `put()` can each be woken by the other side.",
            "**`LinkedBlockingQueue`** has two locks, and `count` is an `AtomicInteger` precisely because the two sides update it under **different** locks. `capacity` is `final`: the no-argument constructor calls `this(Integer.MAX_VALUE)`, so an \"unbounded\" `LinkedBlockingQueue` is really bounded at 2,147,483,647 elements, far beyond any heap.",
            "`head` always points at a **dummy node** whose `item` is `null`; the first real element is `head.next`. That's what lets a taker work on `head` and a putter on `last` without touching the same node, even when the queue has one element.",
            "`ArrayBlockingQueue.itrs` tracks live iterators, so that iterators stay weakly consistent while the ring wraps around underneath them.",
          ],
        },
        {
          type: "heading",
          text: "What put and take actually do",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p java.util.concurrent.ArrayBlockingQueue    # take() and enqueue(E)
javap -c -p java.util.concurrent.LinkedBlockingQueue   # put(E)`,
        },
        {
          type: "output",
          text: `ArrayBlockingQueue.take():
       1: getfield      #61   // Field lock:Ljava/util/concurrent/locks/ReentrantLock;
       6: invokevirtual #106  // Method java/util/concurrent/locks/ReentrantLock.lockInterruptibly:()V
      10: getfield      #11   // Field count:I
      13: ifne          28
      17: getfield      #14   // Field notEmpty:Ljava/util/concurrent/locks/Condition;
      20: invokeinterface #109,  1  // InterfaceMethod java/util/concurrent/locks/Condition.await:()V
      29: invokevirtual #121  // Method dequeue:()Ljava/lang/Object;
      34: invokevirtual #95   // Method java/util/concurrent/locks/ReentrantLock.unlock:()V
ArrayBlockingQueue.enqueue(E):
       7: getfield      #7    // Field putIndex:I
      11: aastore
      14: getfield      #7    // Field putIndex:I
      18: iadd
      24: arraylength
      25: if_icmpne     33
      30: putfield      #7    // Field putIndex:I        (wrap to 0)
      40: putfield      #11   // Field count:I
      47: invokeinterface #18,  1  // InterfaceMethod java/util/concurrent/locks/Condition.signal:()V
LinkedBlockingQueue.put(E):
       8: invokespecial #97   // Method java/lang/NullPointerException."<init>":()V
      17: invokespecial #77   // Method java/util/concurrent/LinkedBlockingQueue$Node."<init>":(Ljava/lang/Object;)V
      35: invokevirtual #116  // Method java/util/concurrent/locks/ReentrantLock.lockInterruptibly:()V   (putLock)
      40: invokevirtual #112  // Method java/util/concurrent/atomic/AtomicInteger.get:()I
      44: getfield      #73   // Field capacity:I
      54: invokeinterface #119,  1  // InterfaceMethod java/util/concurrent/locks/Condition.await:()V   (notFull)
      64: invokevirtual #105  // Method enqueue:(Ljava/util/concurrent/LinkedBlockingQueue$Node;)V
      69: invokevirtual #122  // Method java/util/concurrent/atomic/AtomicInteger.getAndIncrement:()I
      87: invokeinterface #17,  1   // InterfaceMethod java/util/concurrent/locks/Condition.signal:()V   (notFull, cascade)
      94: invokevirtual #22   // Method java/util/concurrent/locks/ReentrantLock.unlock:()V
     115: invokevirtual #125  // Method signalNotEmpty:()V`,
        },
        {
          type: "list",
          items: [
            "**`take()` is the textbook guarded wait**, now with a `Condition` instead of `Object.wait`: lock (interruptibly), `while (count == 0) notEmpty.await()` (the `ifne` loops back), `dequeue()`, unlock. `await()` releases the lock while parked and reacquires it before returning, just like `wait()` inside `synchronized`.",
            "**`enqueue` is the ring buffer**: store at `putIndex`, increment, wrap to 0 when it reaches `items.length`, `count++`, then `notEmpty.signal()`. One `signal`, not `signalAll`: each put makes exactly one element available, so waking exactly one taker is enough. Because takers and putters wait on **different** conditions, a signal can never wake the wrong kind of thread, which is the problem that forced `notifyAll` in the hand-written buffer.",
            "**`LinkedBlockingQueue.put`** allocates the `Node` **before** taking the lock (offset 17, then the lock at 35), keeping the critical section short. Under `putLock` it waits on `notFull`, links the node, and does `count.getAndIncrement()`. If there is still room it signals `notFull` itself (offset 87): a cascade, so one woken putter wakes the next instead of the taker having to take `putLock`. After unlocking, if the queue **was empty** (the old count was 0) it calls `signalNotEmpty()`, which briefly takes `takeLock` to wake a taker. `take` mirrors all of this.",
            "**The null check is the first instruction** (offset 8): `put(null)` throws before any locking.",
          ],
        },
        {
          type: "heading",
          text: "Watching the ring buffer",
        },
        {
          type: "paragraph",
          text: "The fields are package-private, so reading them needs `--add-opens`. This is only for looking; never do it in real code.",
        },
        {
          type: "code",
          language: "java",
          title: "AbqRing.java",
          code: `import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.concurrent.ArrayBlockingQueue;

public class AbqRing {
    static Object field(Object o, String name) throws Exception {
        Field f = ArrayBlockingQueue.class.getDeclaredField(name);
        f.setAccessible(true);
        return f.get(o);
    }

    static void show(String step, ArrayBlockingQueue<String> q) throws Exception {
        System.out.printf("%-22s items=%-26s takeIndex=%d putIndex=%d count=%d%n", step,
                Arrays.toString((Object[]) field(q, "items")), field(q, "takeIndex"), field(q, "putIndex"), field(q, "count"));
    }

    public static void main(String[] args) throws Exception {
        ArrayBlockingQueue<String> q = new ArrayBlockingQueue<>(4);
        show("new(4)", q);
        q.put("T1"); q.put("T2"); q.put("T3");
        show("put T1 T2 T3", q);
        q.take(); q.take();
        show("take x2", q);
        q.put("T4"); q.put("T5"); q.put("T6");
        show("put T4 T5 T6 (wraps)", q);
        System.out.println("offer T7 on full: " + q.offer("T7") + ", toString " + q);
        q.take();
        show("take", q);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED AbqRing",
        },
        {
          type: "output",
          text: `new(4)                 items=[null, null, null, null]   takeIndex=0 putIndex=0 count=0
put T1 T2 T3           items=[T1, T2, T3, null]         takeIndex=0 putIndex=3 count=3
take x2                items=[null, null, T3, null]     takeIndex=2 putIndex=3 count=1
put T4 T5 T6 (wraps)   items=[T5, T6, T3, T4]           takeIndex=2 putIndex=2 count=4
offer T7 on full: false, toString [T3, T4, T5, T6]
take                   items=[T5, T6, null, T4]         takeIndex=3 putIndex=2 count=3`,
        },
        {
          type: "list",
          items: [
            "After the wrap, `T5` and `T6` sit at indexes 0 and 1, **before** `T3` in the array, but `toString` prints `[T3, T4, T5, T6]` because it walks from `takeIndex`. Nothing ever shifts.",
            "Unlike `ArrayDeque` (which keeps one slot empty to tell full from empty), `ArrayBlockingQueue` uses **all four slots**: when `takeIndex == putIndex`, `count` says whether that means empty or full.",
            "`take` sets the slot back to `null` (index 2 after the last step) so the queue doesn't keep a taken element reachable. A ring buffer that forgot this would be a memory leak.",
          ],
        },
        {
          type: "heading",
          text: "Consumers parked on the Condition, in a thread dump",
        },
        {
          type: "code",
          language: "java",
          title: "ParkedThreads.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class ParkedThreads {
    public static void main(String[] args) throws Exception {
        BlockingQueue<String> empty = new ArrayBlockingQueue<>(10);
        for (int i = 1; i <= 2; i++) {
            Thread.ofPlatform().name("db-writer-" + i).start(() -> {
                try { empty.take(); } catch (InterruptedException e) { }
            });
        }
        BlockingQueue<String> full = new LinkedBlockingQueue<>(1);
        full.put("ping-0");
        Thread.ofPlatform().name("gps-ingest-1").start(() -> {
            try { full.put("ping-1"); } catch (InterruptedException e) { }
        });
        System.out.println("pid " + ProcessHandle.current().pid());
        Thread.sleep(60_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java ParkedThreads &
jcmd <pid> Thread.print       # jstack -l <pid> prints the same, plus ownable synchronizers`,
        },
        {
          type: "output",
          text: `"db-writer-1" #20 [126770] prio=5 os_prio=0 cpu=1.23ms elapsed=2.16s tid=0x0000720a48179bb0 nid=126770 waiting on condition  [0x0000720a2c7fe000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008df14b48> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:371)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionNode.block(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:519)
	at java.util.concurrent.ForkJoinPool.unmanagedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3780)
	at java.util.concurrent.ForkJoinPool.managedBlock(java.base@21.0.13.0.3/ForkJoinPool.java:3725)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1746)
	at java.util.concurrent.ArrayBlockingQueue.take(java.base@21.0.13.0.3/ArrayBlockingQueue.java:420)
	at ParkedThreads.lambda$main$0(ParkedThreads.java:10)
...
"db-writer-2" #21 [126771] prio=5 os_prio=0 cpu=0.19ms elapsed=2.30s tid=0x0000720a4817acc0 nid=126771 waiting on condition  [0x0000720a2c6fe000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008df14b48> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
...
	at java.util.concurrent.ArrayBlockingQueue.take(java.base@21.0.13.0.3/ArrayBlockingQueue.java:420)
...
   Locked ownable synchronizers:
	- None

"gps-ingest-1" #22 [126772] prio=5 os_prio=0 cpu=0.18ms elapsed=2.16s tid=0x0000720a4817c040 nid=126772 waiting on condition  [0x0000720a2c5fe000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	- parking to wait for  <0x000000008df49230> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
...
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(java.base@21.0.13.0.3/AbstractQueuedSynchronizer.java:1746)
	at java.util.concurrent.LinkedBlockingQueue.put(java.base@21.0.13.0.3/LinkedBlockingQueue.java:343)`,
        },
        {
          type: "list",
          items: [
            "**`WAITING (parking)`, not `BLOCKED`.** `BLOCKED` is only for threads waiting to enter a `synchronized` monitor. Everything in `java.util.concurrent` parks through `LockSupport.park`, so a stuck consumer shows as `WAITING (parking)` with `waiting on condition`, the same as an idle one. The stack (`ArrayBlockingQueue.take`) and the object it waits for tell them apart.",
            "**Both writers park on the same object, `0x000000008df14b48`**: the `notEmpty` `ConditionObject` of the one queue. `gps-ingest-1` parks on a different object (`0x000000008df49230`), the `notFull` condition of the full `LinkedBlockingQueue`, inside `LinkedBlockingQueue.put`. Grouping threads by \"parking to wait for\" address is the fastest way to read a big dump: 200 threads on one address are 200 idle consumers of one queue.",
            "**`Locked ownable synchronizers: None`.** `jstack -l` lists the `ReentrantLock`s a thread holds. The waiting writer holds none: `await()` released the queue's lock before parking, which is why the producer can get in to add an element.",
            "**`ForkJoinPool.managedBlock` in a plain thread.** On JDK 21, `ConditionObject.await` blocks through `ForkJoinPool.managedBlock`. Outside a fork-join pool that's just `unmanagedBlock` (a direct park), but inside one it lets the pool start a compensating thread so a blocked worker doesn't reduce parallelism.",
          ],
        },
        {
          type: "heading",
          text: "What fairness costs, seen with JFR",
        },
        {
          type: "paragraph",
          text: "`new ArrayBlockingQueue<>(capacity, true)` makes the internal `ReentrantLock` fair: threads get the lock in arrival order. That sounds harmless. I ran 4 producers and 4 consumers moving 400,000 elements through a capacity-1024 queue, with JFR recording every park (`jdk.ThreadPark` has a 20 ms threshold by default, so I set it to 0):",
        },
        {
          type: "code",
          language: "java",
          title: "FairVsUnfair.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;

public class FairVsUnfair {
    public static void main(String[] args) throws Exception {
        boolean fair = Boolean.parseBoolean(args[0]);
        int items = 400_000;
        BlockingQueue<Integer> q = new ArrayBlockingQueue<>(1024, fair);
        Integer ping = 1;
        CountDownLatch start = new CountDownLatch(1);
        Thread[] ts = new Thread[8];
        for (int i = 0; i < 4; i++) {
            ts[i] = new Thread(() -> {
                try { start.await(); for (int k = 0; k < items / 4; k++) q.put(ping); } catch (InterruptedException e) { }
            });
            ts[4 + i] = new Thread(() -> {
                try { start.await(); for (int k = 0; k < items / 4; k++) q.take(); } catch (InterruptedException e) { }
            });
        }
        for (Thread t : ts) t.start();
        long t0 = System.nanoTime();
        start.countDown();
        for (Thread t : ts) t.join();
        System.out.printf("fair=%b  %,d items in %d ms%n", fair, items, (System.nanoTime() - t0) / 1_000_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:StartFlightRecording:filename=fair-false.jfr,jdk.ThreadPark#threshold=0ms,jdk.ThreadPark#stackTrace=false FairVsUnfair false
java -XX:StartFlightRecording:filename=fair-true.jfr,jdk.ThreadPark#threshold=0ms,jdk.ThreadPark#stackTrace=false FairVsUnfair true
jfr summary fair-false.jfr | grep ThreadPark
jfr summary fair-true.jfr | grep ThreadPark`,
        },
        {
          type: "output",
          text: `fair=false  400,000 items in 75 ms
fair=true  400,000 items in 6153 ms
 jdk.ThreadPark                           1691         62473
 jdk.ThreadPark                         799811      29594128`,
        },
        {
          type: "list",
          items: [
            "**82 times slower, and 473 times more parks.** The unfair queue parked 1,691 times for 400,000 elements; the fair queue parked **799,811** times, almost exactly two parks per element.",
            "**Why:** an unfair `ReentrantLock` lets a running thread **barge**: if the lock is free at the moment it asks, it takes it, even if other threads are queued. A producer that's already on a CPU can do many puts in a row while the lock is hot in its cache. A fair lock refuses to barge whenever anyone is queued, so every acquisition is a hand-off to the longest-waiting thread, which is parked and has to be unparked by the OS and scheduled before it can run. Every element pays for two of those context switches (one for the put side, one for the take side).",
            "Fairness also doesn't buy what people expect. It orders **lock acquisition**, not the elements (the queue is FIFO either way), and the Javadoc itself says fairness \"generally decreases throughput but reduces variability and avoids starvation\". The production section shows this setting in a location pipeline.",
          ],
        },
        {
          type: "heading",
          text: "Allocation per element",
        },
        {
          type: "code",
          language: "java",
          title: "NodeAllocation.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.LinkedTransferQueue;
import java.util.concurrent.PriorityBlockingQueue;

public class NodeAllocation {
    static final com.sun.management.ThreadMXBean MX =
            (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static final Integer PING = 1;
    static final int N = 1_000_000;

    static void measure(String label, BlockingQueue<Integer> q) {
        for (int round = 0; round < 3; round++) {                  // warm up, keep the last round
            long before = MX.getCurrentThreadAllocatedBytes();
            for (int i = 0; i < N; i++) q.offer(PING);
            long afterPut = MX.getCurrentThreadAllocatedBytes();
            for (int i = 0; i < N; i++) q.poll();
            long afterTake = MX.getCurrentThreadAllocatedBytes();
            if (round == 2) {
                System.out.printf("%-34s put %5.1f bytes/element   take %4.1f bytes/element%n",
                        label, (afterPut - before) / (double) N, (afterTake - afterPut) / (double) N);
            }
        }
    }

    public static void main(String[] args) {
        measure("ArrayBlockingQueue(1,000,000)", new ArrayBlockingQueue<>(N));
        measure("LinkedBlockingQueue", new LinkedBlockingQueue<>());
        measure("LinkedBlockingDeque", new LinkedBlockingDeque<>());
        measure("LinkedTransferQueue", new LinkedTransferQueue<>());
        measure("PriorityBlockingQueue", new PriorityBlockingQueue<>());
    }
}`,
        },
        {
          type: "output",
          text: `ArrayBlockingQueue(1,000,000)      put   0.0 bytes/element   take  0.0 bytes/element
LinkedBlockingQueue                put  24.0 bytes/element   take  0.0 bytes/element
LinkedBlockingDeque                put  24.0 bytes/element   take  0.0 bytes/element
LinkedTransferQueue                put  32.0 bytes/element   take  0.0 bytes/element
PriorityBlockingQueue              put   0.0 bytes/element   take  0.0 bytes/element`,
        },
        {
          type: "paragraph",
          text: "Exactly the node sizes: `LinkedBlockingQueue$Node` is a 12-byte header plus two compressed references, 20 bytes padded to 24. `LinkedBlockingDeque$Node` adds `prev` and still fits in 24. `LinkedTransferQueue$DualNode` has `item`, `next`, `waiter` and a `boolean isData`: 32 bytes. `ArrayBlockingQueue` preallocates its array, and `PriorityBlockingQueue` had already grown its array in the warm-up rounds. At a million elements a second, a linked queue allocates 24 MB/s of short-lived garbage. That's cheap for G1's young collections (the GC lesson showed why dead young objects cost nothing), but it isn't zero.",
        },
        {
          type: "heading",
          text: "The other classes",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.PriorityBlockingQueue | grep -v '('
javap -p java.util.concurrent.DelayQueue | grep -v '('
javap -p 'java.util.concurrent.LinkedTransferQueue$DualNode' | grep -v '('
javap -p java.util.concurrent.LinkedBlockingDeque | grep -v '('`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.PriorityBlockingQueue<E> ... {
  private static final int DEFAULT_INITIAL_CAPACITY = 11;
  private transient java.lang.Object[] queue;
  private transient int size;
  private transient java.util.Comparator<? super E> comparator;
  private final java.util.concurrent.locks.ReentrantLock lock;
  private final java.util.concurrent.locks.Condition notEmpty;
  private volatile transient int allocationSpinLock;
  private java.util.PriorityQueue<E> q;
  private static final java.lang.invoke.VarHandle ALLOCATIONSPINLOCK;
}
public class java.util.concurrent.DelayQueue<E extends java.util.concurrent.Delayed> ... {
  private final transient java.util.concurrent.locks.ReentrantLock lock;
  private final java.util.PriorityQueue<E> q;
  private java.lang.Thread leader;
  private final java.util.concurrent.locks.Condition available;
}
final class java.util.concurrent.LinkedTransferQueue$DualNode implements java.util.concurrent.ForkJoinPool$ManagedBlocker {
  volatile java.lang.Object item;
  java.util.concurrent.LinkedTransferQueue$DualNode next;
  java.lang.Thread waiter;
  final boolean isData;
  private static final int SPINS = 128;
  ...
}
public class java.util.concurrent.LinkedBlockingDeque<E> ... {
  transient java.util.concurrent.LinkedBlockingDeque$Node<E> first;
  transient java.util.concurrent.LinkedBlockingDeque$Node<E> last;
  private transient int count;
  private final int capacity;
  final java.util.concurrent.locks.ReentrantLock lock;
  private final java.util.concurrent.locks.Condition notEmpty;
  private final java.util.concurrent.locks.Condition notFull;
}`,
        },
        {
          type: "list",
          items: [
            "**`PriorityBlockingQueue`** is the binary heap from the Collections lesson (`Object[] queue`, children at `2i + 1` and `2i + 2`) behind one lock. It has **no `notFull`**, because it never refuses an element. When the array must grow, it releases the main lock and uses `allocationSpinLock` (a CAS flag) to allocate the bigger array, so takers aren't blocked during the copy. The `PriorityQueue q` field is used only for serialization.",
            "**`DelayQueue`** wraps a plain `PriorityQueue` ordered by delay. The `leader` field is the leader-follower pattern: only one waiting thread (the leader) does a **timed** wait for the head's remaining delay; every other taker waits indefinitely on `available`. When the leader takes the element, it signals the next one to become leader. Without it, ten waiting threads would all wake at the same instant to compete for one element.",
            "**`LinkedTransferQueue`** has no lock at all: a linked list of `DualNode`s updated with CAS. A node is either **data** (`isData = true`, an element waiting for a consumer) or a **request** (a consumer waiting for data), hence \"dual\". A consumer arriving at a list of data nodes matches the first one; a consumer arriving at an empty list appends a request node and parks, with `waiter` pointing at its thread. `SPINS = 128`: a waiter spins briefly before parking, because a match often arrives within microseconds.",
            "**`LinkedBlockingDeque`** is doubly linked with **one** lock (two locks can't work when both ends can be used for both operations). Its `count` is a plain `int` for the same reason as in `ArrayBlockingQueue`.",
          ],
        },
      ],
    },
    {
      title: "The Four Ways to Insert and Remove",
      blocks: [
        {
          type: "paragraph",
          text: "Every cell of the method matrix on a queue with room for two ride requests:",
        },
        {
          type: "code",
          language: "java",
          title: "MethodMatrix.java",
          code: `import java.util.NoSuchElementException;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

public class MethodMatrix {
    static long t0 = System.nanoTime();
    static String ms() { return String.format("%4d ms", (System.nanoTime() - t0) / 1_000_000); }

    public static void main(String[] args) throws Exception {
        BlockingQueue<String> q = new ArrayBlockingQueue<>(2);       // room for two ride requests

        // 1. throws an exception
        q.add("R1");
        q.add("R2");
        try {
            q.add("R3");
        } catch (IllegalStateException e) {
            System.out.println("add on full      -> IllegalStateException: " + e.getMessage());
        }
        System.out.println("element          -> " + q.element() + ", remove -> " + q.remove() + ", " + q.remove());
        try {
            q.remove();
        } catch (NoSuchElementException e) {
            System.out.println("remove on empty  -> NoSuchElementException");
        }

        // 2. returns a special value
        System.out.println("offer x3         -> " + q.offer("R4") + " " + q.offer("R5") + " " + q.offer("R6"));
        System.out.println("peek, poll x3    -> " + q.peek() + ", " + q.poll() + " " + q.poll() + " " + q.poll());

        // 3. times out
        t0 = System.nanoTime();
        q.put("R7");
        q.put("R8");
        boolean accepted = q.offer("R9", 300, TimeUnit.MILLISECONDS);
        System.out.println(ms() + " offer(e, 300ms) on full -> " + accepted);
        q.clear();
        t0 = System.nanoTime();
        String got = q.poll(200, TimeUnit.MILLISECONDS);
        System.out.println(ms() + " poll(200ms) on empty    -> " + got);

        // 4. blocks
        t0 = System.nanoTime();
        Thread driverApp = new Thread(() -> {
            try {
                Thread.sleep(250);
                q.put("R10");                                         // wakes the taker
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        driverApp.start();
        System.out.println(ms() + " take() waiting ...");
        String taken = q.take();
        System.out.println(ms() + " take() -> " + taken);

        q.put("R11");
        q.put("R12");
        t0 = System.nanoTime();
        Thread dispatcher = new Thread(() -> {
            try {
                Thread.sleep(250);
                System.out.println(ms() + " dispatcher took " + q.take());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        dispatcher.start();
        q.put("R13");                                                 // blocks until there is room
        System.out.println(ms() + " put(R13) returned, queue " + q + ", remainingCapacity " + q.remainingCapacity());
        dispatcher.join();
    }
}`,
        },
        {
          type: "output",
          text: `add on full      -> IllegalStateException: Queue full
element          -> R1, remove -> R1, R2
remove on empty  -> NoSuchElementException
offer x3         -> true true false
peek, poll x3    -> R4, R4 R5 null
 300 ms offer(e, 300ms) on full -> false
 200 ms poll(200ms) on empty    -> null
   3 ms take() waiting ...
 254 ms take() -> R10
 251 ms dispatcher took R11
 252 ms put(R13) returned, queue [R12, R13], remainingCapacity 0`,
        },
        {
          type: "list",
          items: [
            "**Throws:** `add` on a full queue throws `IllegalStateException: Queue full`; `remove` and `element` on an empty queue throw `NoSuchElementException`. These come from `AbstractQueue`, which implements them on top of `offer`/`poll`/`peek`.",
            "**Special value:** the third `offer` returned `false` and the third `poll` returned `null`. Nothing waited.",
            "**Timed:** `offer(e, 300ms)` on a full queue waited the full 300 ms and returned `false`; `poll(200ms)` on an empty queue waited 200 ms and returned `null`. These are the backpressure tools of the next lesson: wait a bounded time, then decide what to do with the element.",
            "**Blocking:** `take()` waited 251 ms until the driver-app thread put `R10`. `put(R13)` on a full queue waited until the dispatcher took `R11` 251 ms later. The dispatcher's line and the `put` line are printed by different threads one millisecond apart; their order can swap between runs.",
            "A detail that cost me a rerun: my first version printed `ms() + \" take() -> \" + q.take()`. Java evaluates string concatenation left to right, so `ms()` was computed **before** `take()` blocked, and the line claimed `take()` returned after 4 ms. Measure first, then print.",
          ],
        },
        {
          type: "paragraph",
          text: "Which column to use is a design decision, not a style choice. `add` is for queues that should never be full (a full one is a bug). `offer` is for \"try, and if not, do something else now\" (shed the request, return 429). `put`/`take` are for worker threads whose only job is to move elements. The timed versions are for everything that must not hang forever: a request thread should never call plain `put` on a queue that a slow consumer drains.",
        },
      ],
    },
    {
      title: "ArrayBlockingQueue vs LinkedBlockingQueue",
      blocks: [
        {
          type: "paragraph",
          text: "The usual claim is that `LinkedBlockingQueue` has higher throughput because producers and consumers don't share a lock. I measured both, moving 2,000,000 elements (one shared `Integer`, so the elements themselves allocate nothing) with 1 producer and 1 consumer, then 4 and 4. Best of five runs per line:",
        },
        {
          type: "code",
          language: "java",
          title: "QueueThroughput.java",
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.function.Supplier;

public class QueueThroughput {
    static final int ITEMS = 2_000_000;
    static final Integer PING = 42;                         // one shared element: no allocation per item

    static long run(Supplier<BlockingQueue<Integer>> factory, int producers, int consumers) throws Exception {
        BlockingQueue<Integer> q = factory.get();
        CountDownLatch start = new CountDownLatch(1);
        Thread[] threads = new Thread[producers + consumers];
        for (int p = 0; p < producers; p++) {
            threads[p] = new Thread(() -> {
                try {
                    start.await();
                    for (int i = 0; i < ITEMS / producers; i++) q.put(PING);
                } catch (InterruptedException e) { }
            });
        }
        for (int c = 0; c < consumers; c++) {
            threads[producers + c] = new Thread(() -> {
                try {
                    start.await();
                    for (int i = 0; i < ITEMS / consumers; i++) q.take();
                } catch (InterruptedException e) { }
            });
        }
        for (Thread t : threads) t.start();
        long t0 = System.nanoTime();
        start.countDown();
        for (Thread t : threads) t.join();
        return System.nanoTime() - t0;
    }

    static void report(String label, Supplier<BlockingQueue<Integer>> factory, int p, int c) throws Exception {
        long best = Long.MAX_VALUE;
        for (int r = 0; r < 5; r++) best = Math.min(best, run(factory, p, c));
        System.out.printf("%-26s %dP/%dC  %5d ms  %,6.1f M items/s%n", label, p, c,
                best / 1_000_000, ITEMS / (best / 1e9) / 1e6);
    }

    public static void main(String[] args) throws Exception {
        for (int[] pc : new int[][] {{1, 1}, {4, 4}}) {
            report("ArrayBlockingQueue(1024)", () -> new ArrayBlockingQueue<>(1024), pc[0], pc[1]);
            report("LinkedBlockingQueue(1024)", () -> new LinkedBlockingQueue<>(1024), pc[0], pc[1]);
            report("LinkedBlockingQueue()", LinkedBlockingQueue::new, pc[0], pc[1]);
        }
        report("ArrayBlockingQueue fair", () -> new ArrayBlockingQueue<>(1024, true), 4, 4);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx512m QueueThroughput",
        },
        {
          type: "output",
          text: `ArrayBlockingQueue(1024)   1P/1C    312 ms     6.4 M items/s
LinkedBlockingQueue(1024)  1P/1C    296 ms     6.8 M items/s
LinkedBlockingQueue()      1P/1C    223 ms     8.9 M items/s
ArrayBlockingQueue(1024)   4P/4C    215 ms     9.3 M items/s
LinkedBlockingQueue(1024)  4P/4C    279 ms     7.1 M items/s
LinkedBlockingQueue()      4P/4C    267 ms     7.5 M items/s
ArrayBlockingQueue fair    4P/4C  36507 ms     0.1 M items/s`,
        },
        {
          type: "paragraph",
          text: "I ran the whole program three times. Other benchmarks were running on this 8-core machine at the same time (load average between 3 and 10), so these are single-machine numbers under load, not JMH. The ranges across the three runs, in millions of elements per second:",
        },
        {
          type: "table",
          headers: ["Queue", "1 producer, 1 consumer", "4 producers, 4 consumers"],
          rows: [
            ["`ArrayBlockingQueue(1024)`", "3.4 to 6.4", "6.7 to 9.5"],
            ["`LinkedBlockingQueue(1024)`", "2.3 to 7.3", "5.2 to 7.1"],
            ["`LinkedBlockingQueue()` (unbounded)", "7.9 to 8.9", "7.5 to 11.4"],
            ["`ArrayBlockingQueue(1024, true)`", "not run", "0.1 (19.7 to 36.5 seconds)"],
          ],
        },
        {
          type: "list",
          items: [
            "**The two-lock advantage didn't show up as a clear win for bounded queues.** With the same capacity, `ArrayBlockingQueue` and `LinkedBlockingQueue` overlapped across runs; at 4/4 the array queue was ahead of the bounded linked queue in two of three runs (9.3 against 7.1, and 9.5 against 5.2) and behind in one (6.7 against 7.1). When the queue is bounded and the producer is faster, the queue sits full: producers wait on `notFull` and the real cost is parking and unparking, which both designs pay. The array queue allocates nothing and touches one cache line per element; the linked queue allocates a node per element.",
            "**The unbounded `LinkedBlockingQueue` was the most consistent at 1/1**, 7.9 to 8.9 million per second. Producers never wait, so the producer runs ahead and the consumer always finds work. That speed is borrowed: the queue grows, and it's exactly the behaviour that turns into an `OutOfMemoryError` when the consumer is slower for real, as the next lesson measures.",
            "**The fair queue was 94 to 170 times slower** than the unfair `ArrayBlockingQueue` at 4/4 (19.7 to 36.5 seconds against 209 to 298 ms), the same order as the 82 times in the JFR measurement above.",
            "**The variance is the honest result.** Queue throughput at this level is dominated by scheduling: how often threads park, which cores they land on. A machine under load moves the numbers by a factor of two. Choose between the two by behaviour (fixed memory and no allocation versus optional bound and separate locks), not by a benchmark like this one; if the queue really is the bottleneck, the fix is usually batching (`drainTo`, below), not a different queue.",
          ],
        },
      ],
    },
    {
      title: "SynchronousQueue and the Cached Thread Pool",
      blocks: [
        {
          type: "paragraph",
          text: "A `SynchronousQueue` has no capacity. `put` waits until a consumer takes the element; `offer` succeeds only if a consumer is **already waiting**. It's a meeting point, not a buffer.",
        },
        {
          type: "code",
          language: "java",
          title: "HandOff.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class HandOff {
    static final long T0 = System.nanoTime();
    static String ms() { return String.format("%4d ms", (System.nanoTime() - T0) / 1_000_000); }

    public static void main(String[] args) throws Exception {
        SynchronousQueue<String> q = new SynchronousQueue<>();
        System.out.println("offer with no taker: " + q.offer("trip-1") + ", size " + q.size()
                + ", remainingCapacity " + q.remainingCapacity() + ", peek " + q.peek());

        Thread driver = new Thread(() -> {
            try {
                Thread.sleep(200);
                System.out.println(ms() + " driver take() -> " + q.take());
            } catch (InterruptedException e) { }
        });
        driver.start();
        System.out.println(ms() + " rider put(trip-2) ...");
        q.put("trip-2");                                          // returns only once someone has taken it
        System.out.println(ms() + " rider put returned");
        driver.join();

        // The cached thread pool is a ThreadPoolExecutor(0, MAX, 60s, new SynchronousQueue<>())
        ThreadPoolExecutor cached = (ThreadPoolExecutor) Executors.newCachedThreadPool();
        System.out.println("cached pool queue: " + cached.getQueue().getClass().getSimpleName()
                + ", core " + cached.getCorePoolSize() + ", max " + cached.getMaximumPoolSize());
        for (int i = 0; i < 3; i++) cached.execute(() -> sleep(300));   // nobody idle: 3 new threads
        System.out.println("after 3 slow tasks: pool size " + cached.getPoolSize());
        Thread.sleep(400);                                        // all three now idle, polling the queue
        for (int i = 0; i < 3; i++) cached.execute(() -> sleep(300));   // handed to idle threads
        System.out.println("after 3 more once idle: pool size " + cached.getPoolSize()
                + ", completed " + cached.getCompletedTaskCount());
        cached.shutdown();

        // Same queue, but a capped pool: the hand-off fails and the task is rejected
        ExecutorService capped = new ThreadPoolExecutor(0, 2, 60, TimeUnit.SECONDS, new SynchronousQueue<>());
        for (int i = 1; i <= 3; i++) {
            try {
                capped.execute(() -> sleep(300));
                System.out.println("capped task " + i + " accepted");
            } catch (RejectedExecutionException e) {
                System.out.println("capped task " + i + " rejected: no idle thread and max 2 reached");
            }
        }
        capped.shutdown();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `offer with no taker: false, size 0, remainingCapacity 0, peek null
  34 ms rider put(trip-2) ...
 234 ms rider put returned
 234 ms driver take() -> trip-2
cached pool queue: SynchronousQueue, core 0, max 2147483647
after 3 slow tasks: pool size 3
after 3 more once idle: pool size 3, completed 3
capped task 1 accepted
capped task 2 accepted
capped task 3 rejected: no idle thread and max 2 reached`,
        },
        {
          type: "list",
          items: [
            "`offer` with no waiting taker returned `false` immediately. `size()` is always 0, `peek()` always `null`, `remainingCapacity()` always 0, and iterating it yields nothing.",
            "`put(\"trip-2\")` returned at 234 ms, when the driver thread woke from its 200 ms sleep and took it. The two lines printed at 234 ms come from different threads; in this run the rider's line won the race to `System.out`.",
            "**How the cached thread pool uses it.** `Executors.newCachedThreadPool()` is `new ThreadPoolExecutor(0, Integer.MAX_VALUE, 60s, new SynchronousQueue<>())`. `execute` calls `workQueue.offer(task)`, never `put`. Idle workers sit in `workQueue.poll(60, SECONDS)`. So `offer` succeeds exactly when an idle worker is waiting; otherwise it fails, and the executor starts a **new thread**. The first three slow tasks found nobody waiting and created three threads. 400 ms later all three were idle in `poll`, so the next three tasks were handed to them and the pool stayed at 3.",
            "**The danger is the maximum.** With `Integer.MAX_VALUE` as the maximum and a queue that never buffers, a burst of 10,000 slow tasks creates 10,000 threads. ThreadPoolExecutor Internals: Queues, Rejection and Sizing covered that failure; here the capped pool (max 2) shows the alternative: the third task is **rejected** because the hand-off failed and no new thread was allowed.",
            "A `SynchronousQueue` is the right queue when buffering would only hide a problem: you want the submitter to know immediately that nobody is free.",
          ],
        },
      ],
    },
    {
      title: "PriorityBlockingQueue and DelayQueue",
      blocks: [
        {
          type: "heading",
          text: "PriorityBlockingQueue: urgent first, and no limit",
        },
        {
          type: "code",
          language: "java",
          title: "PriorityDispatch.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.atomic.AtomicLong;

public class PriorityDispatch {
    static final AtomicLong SEQ = new AtomicLong();

    record Request(String rider, int tier, long seq) {      // tier 0 = ambulance, 1 = premium, 2 = regular
        Request(String rider, int tier) { this(rider, tier, SEQ.getAndIncrement()); }
    }

    public static void main(String[] args) throws Exception {
        PriorityBlockingQueue<Request> q = new PriorityBlockingQueue<>(11,
                Comparator.comparingInt(Request::tier).thenComparingLong(Request::seq));   // FIFO within a tier
        q.put(new Request("Asha", 2));
        q.put(new Request("Ravi", 1));
        q.put(new Request("Meera", 2));
        q.put(new Request("Hospital", 0));
        q.put(new Request("Kabir", 1));
        System.out.println("remainingCapacity " + q.remainingCapacity() + " (unbounded: put never blocks)");
        System.out.println("iteration order:  " + q.stream().map(Request::rider).toList());
        List<String> served = new ArrayList<>();
        while (!q.isEmpty()) served.add(q.take().rider());
        System.out.println("take order:       " + served);

        for (int i = 0; i < 1_000_000; i++) q.offer(new Request("r" + i, 2));   // nothing stops it growing
        System.out.println("after 1,000,000 offers: size " + q.size()
                + ", heap used " + (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / (1 << 20) + " MB");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m PriorityDispatch",
        },
        {
          type: "output",
          text: `remainingCapacity 2147483647 (unbounded: put never blocks)
iteration order:  [Hospital, Ravi, Meera, Asha, Kabir]
take order:       [Hospital, Ravi, Kabir, Asha, Meera]
after 1,000,000 offers: size 1000000, heap used 94 MB`,
        },
        {
          type: "list",
          items: [
            "**`take` follows the comparator**: tier 0 first, then tier 1 in arrival order (Ravi before Kabir), then tier 2 (Asha before Meera). The `seq` tie-breaker matters: a heap is not stable, so without it two premium riders could come out in either order.",
            "**Iteration and `toString` are heap order, not priority order**: `[Hospital, Ravi, Meera, Asha, Kabir]` is the array layout. The same trap as `PriorityQueue`.",
            "**It is always unbounded.** The `capacity` constructor argument is only the initial array size. `remainingCapacity()` is `Integer.MAX_VALUE`, `put` never blocks, and a million queued requests took 94 MB of a 256 MB heap. If producers can outrun consumers, a `PriorityBlockingQueue` needs a limit from outside: a `Semaphore` around `put`, or a check of `size()` before `offer`.",
            "With a priority queue, low-priority work can **starve**: as long as tier-0 and tier-1 requests keep arriving, tier 2 never comes out. Ageing (raising priority with waiting time) or separate queues with a weighted consumer fix it.",
          ],
        },
        {
          type: "heading",
          text: "DelayQueue: retry later, without a polling loop",
        },
        {
          type: "paragraph",
          text: "Elements implement `Delayed`: `getDelay(unit)` says how long until the element is ready, and `compareTo` orders by that time. `take()` blocks until the **head** has expired; `poll()` returns `null` if nothing has expired, even when the queue isn't empty.",
        },
        {
          type: "code",
          language: "java",
          title: "RetryQueue.java",
          code: `import java.util.concurrent.DelayQueue;
import java.util.concurrent.Delayed;
import java.util.concurrent.TimeUnit;

public class RetryQueue {
    static final long T0 = System.nanoTime();
    static String ms() { return String.format("%4d ms", (System.nanoTime() - T0) / 1_000_000); }

    // A payout to a driver that failed and must be retried later
    record Retry(String payoutId, int attempt, long dueNanos) implements Delayed {
        static Retry after(String id, int attempt, long delayMs) {
            return new Retry(id, attempt, System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(delayMs));
        }
        public long getDelay(TimeUnit unit) {
            return unit.convert(dueNanos - System.nanoTime(), TimeUnit.NANOSECONDS);
        }
        public int compareTo(Delayed o) {
            return Long.compare(dueNanos, ((Retry) o).dueNanos);
        }
    }

    public static void main(String[] args) throws Exception {
        DelayQueue<Retry> retries = new DelayQueue<>();
        retries.put(Retry.after("PAYOUT-Ravi", 1, 400));
        retries.put(Retry.after("PAYOUT-Asha", 1, 100));
        System.out.println(ms() + " size " + retries.size() + ", peek " + retries.peek().payoutId()
                + ", poll " + retries.poll());               // nothing is due yet

        int processed = 0;
        while (processed < 4) {
            Retry r = retries.take();                         // blocks until the earliest is due
            System.out.println(ms() + " retrying " + r.payoutId() + " attempt " + r.attempt());
            processed++;
            if (r.payoutId().equals("PAYOUT-Asha") && r.attempt() < 3) {
                long backoff = 100L << r.attempt();           // 200, then 400 ms
                retries.put(Retry.after(r.payoutId(), r.attempt() + 1, backoff));
                System.out.println(ms() + "   failed again, next try in " + backoff + " ms");
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `   0 ms size 2, peek PAYOUT-Asha, poll null
 101 ms retrying PAYOUT-Asha attempt 1
 109 ms   failed again, next try in 200 ms
 309 ms retrying PAYOUT-Asha attempt 2
 309 ms   failed again, next try in 400 ms
 400 ms retrying PAYOUT-Ravi attempt 1
 709 ms retrying PAYOUT-Asha attempt 3`,
        },
        {
          type: "list",
          items: [
            "`size()` was 2 and `peek()` returned Asha's retry, but `poll()` returned `null`: `peek` shows the head whether or not it has expired, `poll` and `take` only hand out expired elements.",
            "Each `take()` woke within a millisecond or two of the due time (101, 309, 400, 709 ms). The consumer thread didn't spin or poll in between; it was parked in a timed wait for exactly the head's remaining delay, as the `leader` field described.",
            "Exponential backoff falls out naturally: re-queue with a longer delay. Ravi's first retry (due at 400 ms) came out between Asha's second and third because the queue orders by due time, not by insertion.",
            "`getDelay` must be computed from `System.nanoTime()`, not `currentTimeMillis()`, so that a clock adjustment (NTP) doesn't fire every retry at once or delay them by an hour.",
            "A `DelayQueue` lives in memory: retries are lost on restart. For payouts I'd store the next attempt time in the database and use the queue only as the in-process timer. A `ScheduledThreadPoolExecutor` uses the same idea internally (its `DelayedWorkQueue` is a heap of delayed tasks).",
          ],
        },
      ],
    },
    {
      title: "LinkedTransferQueue and LinkedBlockingDeque",
      blocks: [
        {
          type: "heading",
          text: "transfer: put and wait for the consumer",
        },
        {
          type: "code",
          language: "java",
          title: "TransferDemo.java",
          code: `import java.util.concurrent.LinkedTransferQueue;
import java.util.concurrent.TimeUnit;

public class TransferDemo {
    static final long T0 = System.nanoTime();
    static String ms() { return String.format("%4d ms", (System.nanoTime() - T0) / 1_000_000); }

    public static void main(String[] args) throws Exception {
        LinkedTransferQueue<String> q = new LinkedTransferQueue<>();
        q.put("ping-1");                                        // ordinary queue: never blocks, unbounded
        System.out.println(ms() + " put -> size " + q.size());
        boolean now = q.tryTransfer("ping-2");
        System.out.println(ms() + " tryTransfer(ping-2), no consumer waiting -> " + now);
        boolean timed = q.tryTransfer("ping-3", 150, TimeUnit.MILLISECONDS);
        System.out.println(ms() + " tryTransfer(ping-3, 150ms) -> " + timed + ", size " + q.size());

        Thread consumer = new Thread(() -> {
            try {
                Thread.sleep(300);
                String first = q.take();
                System.out.println(ms() + " consumer take -> " + first);
                String second = q.take();
                System.out.println(ms() + " consumer take -> " + second);
            } catch (InterruptedException e) { }
        });
        consumer.start();
        q.transfer("trip-complete-42");                        // waits until a consumer has received it
        System.out.println(ms() + " transfer returned, hasWaitingConsumer " + q.hasWaitingConsumer());
        consumer.join();

        Thread waiting = new Thread(() -> {
            try {
                String got = q.take();
                System.out.println(ms() + " waiting consumer got " + got);
            } catch (InterruptedException e) { }
        });
        waiting.start();
        Thread.sleep(100);
        System.out.println(ms() + " hasWaitingConsumer " + q.hasWaitingConsumer());
        boolean handed = q.tryTransfer("ping-4");
        waiting.join();
        System.out.println(ms() + " tryTransfer(ping-4) -> " + handed + ", size " + q.size());
    }
}`,
        },
        {
          type: "output",
          text: `   1 ms put -> size 1
  28 ms tryTransfer(ping-2), no consumer waiting -> false
 179 ms tryTransfer(ping-3, 150ms) -> false, size 1
 510 ms consumer take -> ping-1
 515 ms consumer take -> trip-complete-42
 515 ms transfer returned, hasWaitingConsumer false
 616 ms hasWaitingConsumer true
 617 ms waiting consumer got ping-4
 618 ms tryTransfer(ping-4) -> true, size 0`,
        },
        {
          type: "list",
          items: [
            "`LinkedTransferQueue` is an ordinary unbounded FIFO queue (`put` never blocks) that **also** offers the `SynchronousQueue` behaviour per call.",
            "`tryTransfer(e)` with no consumer waiting returned `false` and did **not** enqueue: size stayed 1. The timed version waited 150 ms, gave up, and also left nothing behind.",
            "`transfer(e)` enqueued `trip-complete-42` at the tail and waited. It returned only after the consumer had taken `ping-1` (which was ahead of it) and then the transferred element. Transfer respects FIFO order: it doesn't jump the queue.",
            "With a consumer already parked in `take()`, `hasWaitingConsumer()` was `true` and `tryTransfer` succeeded immediately.",
            "Use it when the producer must know the consumer has the element (handing over a resource, or a slow consumer that should push back on exactly one producer without a fixed capacity). In most pipelines a bounded queue is simpler.",
          ],
        },
        {
          type: "heading",
          text: "LinkedBlockingDeque: the work-stealing idea",
        },
        {
          type: "paragraph",
          text: "Work stealing gives every worker its own deque. A worker takes from **its own** end; an idle worker steals from the **other** end of someone else's deque, so owner and thief rarely touch the same element. `ForkJoinPool` does this with its own lock-free arrays, but the idea is visible with two `LinkedBlockingDeque`s:",
        },
        {
          type: "code",
          language: "java",
          title: "WorkStealing.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.atomic.AtomicInteger;

public class WorkStealing {
    public static void main(String[] args) throws Exception {
        // Each worker owns a deque; the SALT-LAKE worker gets all 12 fare-recalculation jobs
        List<LinkedBlockingDeque<String>> deques = List.of(new LinkedBlockingDeque<>(), new LinkedBlockingDeque<>());
        for (int i = 1; i <= 12; i++) deques.get(0).putLast("job-" + i);
        AtomicInteger remaining = new AtomicInteger(12);
        Map<String, Integer> doneBy = new ConcurrentHashMap<>();
        CountDownLatch finished = new CountDownLatch(2);

        for (int w = 0; w < 2; w++) {
            int me = w;
            Thread.ofPlatform().name(me == 0 ? "salt-lake" : "new-town").start(() -> {
                LinkedBlockingDeque<String> own = deques.get(me), other = deques.get(1 - me);
                StringBuilder log = new StringBuilder();
                while (remaining.get() > 0) {
                    String job = own.pollFirst();                     // owner works from the head
                    String how = "own  ";
                    if (job == null) { job = other.pollLast(); how = "stole"; }   // thief takes from the tail
                    if (job == null) continue;
                    try { Thread.sleep(20); } catch (InterruptedException e) { return; }
                    log.append(how).append(' ').append(job).append("  ");
                    doneBy.merge(Thread.currentThread().getName(), 1, Integer::sum);
                    remaining.decrementAndGet();
                }
                System.out.println(Thread.currentThread().getName() + ": " + log);
                finished.countDown();
            });
        }
        finished.await();
        System.out.println("jobs per worker " + new java.util.TreeMap<>(doneBy));
    }
}`,
        },
        {
          type: "output",
          text: `new-town: stole job-12  stole job-11  stole job-10  stole job-9  stole job-8  stole job-7
salt-lake: own   job-1  own   job-2  own   job-3  own   job-4  own   job-5  own   job-6
jobs per worker {new-town=6, salt-lake=6}`,
        },
        {
          type: "list",
          items: [
            "All twelve jobs were queued for `salt-lake`. `new-town` had nothing, so it stole from the tail: `job-12`, `job-11` and so on, while the owner worked forwards from `job-1`. They met in the middle, six each. Two runs gave the same split.",
            "Owner and thief work at **opposite ends**, so they only compete for the last element. In `ForkJoinPool` the owner even works LIFO (most recently forked task first, which is still hot in cache) while thieves take the oldest, largest tasks.",
            "`LinkedBlockingDeque` has one lock, so this demo doesn't get the low-contention benefit that real work-stealing deques have; it shows the access pattern. The idle loop here (`continue` when both deques are empty) spins; a real pool parks idle workers.",
          ],
        },
      ],
    },
    {
      title: "Nulls, remainingCapacity and drainTo",
      blocks: [
        {
          type: "heading",
          text: "No queue accepts null",
        },
        {
          type: "code",
          language: "java",
          title: "NullsAndCapacity.java",
          code: `import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.DelayQueue;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.LinkedTransferQueue;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.SynchronousQueue;

public class NullsAndCapacity {
    public static void main(String[] args) {
        List<BlockingQueue<?>> queues = List.of(new ArrayBlockingQueue<>(100), new LinkedBlockingQueue<>(),
                new LinkedBlockingQueue<>(100), new PriorityBlockingQueue<>(), new DelayQueue<>(),
                new SynchronousQueue<>(), new LinkedTransferQueue<>(), new LinkedBlockingDeque<>());
        for (BlockingQueue<?> q : queues) {
            @SuppressWarnings("unchecked") BlockingQueue<Object> raw = (BlockingQueue<Object>) q;
            String nullResult;
            try {
                raw.offer(null);
                nullResult = "accepted";
            } catch (NullPointerException e) {
                nullResult = "NullPointerException";
            }
            System.out.printf("%-22s remainingCapacity %,13d   offer(null) -> %s%n",
                    q.getClass().getSimpleName(), q.remainingCapacity(), nullResult);
        }

        BlockingQueue<String> pings = new ArrayBlockingQueue<>(100);
        for (int i = 0; i < 80; i++) pings.offer("ping-" + i);
        System.out.println("80 of 100 used: size " + pings.size() + ", remainingCapacity " + pings.remainingCapacity()
                + ", fill " + 100 * pings.size() / (pings.size() + pings.remainingCapacity()) + "%");
    }
}`,
        },
        {
          type: "output",
          text: `ArrayBlockingQueue     remainingCapacity           100   offer(null) -> NullPointerException
LinkedBlockingQueue    remainingCapacity 2,147,483,647   offer(null) -> NullPointerException
LinkedBlockingQueue    remainingCapacity           100   offer(null) -> NullPointerException
PriorityBlockingQueue  remainingCapacity 2,147,483,647   offer(null) -> NullPointerException
DelayQueue             remainingCapacity 2,147,483,647   offer(null) -> NullPointerException
SynchronousQueue       remainingCapacity             0   offer(null) -> NullPointerException
LinkedTransferQueue    remainingCapacity 2,147,483,647   offer(null) -> NullPointerException
LinkedBlockingDeque    remainingCapacity 2,147,483,647   offer(null) -> NullPointerException
80 of 100 used: size 80, remainingCapacity 20, fill 80%`,
        },
        {
          type: "list",
          items: [
            "**Every implementation throws `NullPointerException` for `null`**, as the `BlockingQueue` contract requires. `poll()` and `poll(timeout)` return `null` to mean \"nothing there\"; if `null` were a legal element, a consumer couldn't tell an empty queue from a `null` element. `LinkedTransferQueue` and `SynchronousQueue` also use a `null` item internally to mark a request node. If a pipeline needs \"no value\", use a sentinel object or `Optional`.",
            "**`remainingCapacity()` is how a bound becomes a metric.** `size + remainingCapacity` is the capacity for a bounded queue, so fill percentage is one line. For an unbounded queue it's always `Integer.MAX_VALUE` and tells you nothing; export `size()` instead.",
            "Both values are a snapshot. By the time the caller reads them, another thread may have changed the queue, so `if (q.remainingCapacity() > 0) q.put(e)` is still a check-then-act race. Use `offer` and check its result.",
          ],
        },
        {
          type: "heading",
          text: "drainTo: one lock for many elements",
        },
        {
          type: "paragraph",
          text: "`drainTo(collection, max)` moves up to `max` available elements in **one** lock acquisition and never blocks. The usual pattern is `take()` to wait for the first element, then `drainTo` for whatever else is already there. I measured it twice: on the queue alone, and with a consumer that writes each batch to a database stand-in costing 300 microseconds per round trip plus 2 microseconds per row.",
        },
        {
          type: "code",
          language: "java",
          title: "DrainToBatch.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.locks.LockSupport;

public class DrainToBatch {
    static final Integer PING = 7;
    static int dbCalls;

    // Stands in for one INSERT round trip: 300 us fixed cost plus 2 us per row
    static void writeToDb(int rows) {
        dbCalls++;
        LockSupport.parkNanos(300_000 + 2_000L * rows);
    }

    static Thread producer(BlockingQueue<Integer> q, int n) {
        Thread t = new Thread(() -> {
            try { for (int i = 0; i < n; i++) q.put(PING); } catch (InterruptedException e) { }
        });
        t.start();
        return t;
    }

    static long oneByOne(int n, boolean db) throws Exception {
        BlockingQueue<Integer> q = new ArrayBlockingQueue<>(1024);
        long t0 = System.nanoTime();
        Thread p = producer(q, n);
        for (int i = 0; i < n; i++) {
            q.take();
            if (db) writeToDb(1);
        }
        p.join();
        return System.nanoTime() - t0;
    }

    static long batched(int n, boolean db) throws Exception {
        BlockingQueue<Integer> q = new ArrayBlockingQueue<>(1024);
        List<Integer> batch = new ArrayList<>(256);
        long t0 = System.nanoTime();
        Thread p = producer(q, n);
        int done = 0;
        while (done < n) {
            batch.add(q.take());                      // block for the first element
            q.drainTo(batch, 255);                    // then grab whatever else is already there
            if (db) writeToDb(batch.size());
            done += batch.size();
            batch.clear();
        }
        p.join();
        return System.nanoTime() - t0;
    }

    interface Run { long go() throws Exception; }

    static void report(String label, Run r) throws Exception {
        long best = Long.MAX_VALUE;
        dbCalls = 0;
        for (int i = 0; i < 5; i++) { dbCalls = 0; best = Math.min(best, r.go()); }
        System.out.printf("%-34s %6d ms   db calls %,d%n", label, best / 1_000_000, dbCalls);
    }

    public static void main(String[] args) throws Exception {
        report("queue only, take() x 2,000,000", () -> oneByOne(2_000_000, false));
        report("queue only, take + drainTo(255)", () -> batched(2_000_000, false));
        report("20,000 events, 1 INSERT each", () -> oneByOne(20_000, true));
        report("20,000 events, drainTo batches", () -> batched(20_000, true));
    }
}`,
        },
        {
          type: "output",
          text: `queue only, take() x 2,000,000        399 ms   db calls 0
queue only, take + drainTo(255)       102 ms   db calls 0
20,000 events, 1 INSERT each         7710 ms   db calls 20,000
20,000 events, drainTo batches         72 ms   db calls 80`,
        },
        {
          type: "list",
          items: [
            "**Queue overhead alone: about 3 to 4 times less** with `drainTo` (102 to 145 ms against 341 to 399 ms across three runs). One `take` per element means one lock acquisition per element and frequent parking whenever the consumer catches up; `drainTo` takes the lock once per batch of up to 256.",
            "**With a database in the loop: 107 times faster** (72 ms against 7,710 ms; all three runs between 71 and 73 ms against 7,710 to 8,007 ms). 20,000 single-row inserts cost 20,000 round trips. Batching turned them into 80 calls, because the producer filled the queue while each batch was being written. Each `parkNanos(300 µs)` actually took about 385 µs (Linux timer slack), which is why one-by-one took 7.7 s instead of 6 s.",
            "Batching adapts by itself: when the consumer keeps up, batches are small and latency stays low; when it falls behind, batches grow and per-element cost drops. That property is what the next lesson uses to survive a slow database.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing a producer calling `put(\"ping-7\")` on a full `ArrayBlockingQueue(2)` while a consumer is about to call `take()`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Null check.** `put` calls `Objects.requireNonNull(e)`: a `null` would throw here, before any locking.",
            "**Lock.** The producer calls `lock.lockInterruptibly()`. The lock is free, so a CAS sets the AQS state from 0 to 1 and the producer owns it.",
            "**Check, then wait.** `count == items.length` (2 == 2), so the producer calls `notFull.await()`. `await` adds a node to the condition's wait list, **fully releases** the lock (state back to 0), and parks the thread: `WAITING (parking)`, \"parking to wait for\" the `notFull` `ConditionObject`.",
            "**The consumer takes the lock.** `take()` calls `lockInterruptibly()` and gets it immediately, because the producer released it in `await`. `count` is 2, so no waiting.",
            "**Dequeue.** `dequeue()` reads `items[takeIndex]`, sets that slot to `null`, advances `takeIndex` (wrapping to 0 at the end), decrements `count` to 1, tells any live iterators (`itrs`), and calls `notFull.signal()`.",
            "**Signal moves, it doesn't wake.** `signal()` transfers the producer's node from the condition queue to the lock's wait queue. The producer stays parked for now, because the consumer still holds the lock.",
            "**Unlock.** The consumer's `unlock()` releases the lock and unparks the first thread in the lock's queue: the producer.",
            "**The producer re-acquires and re-checks.** Back inside `await`, the producer reacquires the lock before returning, then the `while` loop checks `count == items.length` again (1 == 2 is false). The re-check is what makes a spurious wake-up, or another producer that got there first, harmless.",
            "**Enqueue.** `items[putIndex] = \"ping-7\"`, advance `putIndex` with wrap, `count` back to 2, `notEmpty.signal()` (nobody is waiting, so nothing happens), unlock. `put` returns.",
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
          title: "BlockingQueueTour.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingDeque;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.TimeUnit;

public class BlockingQueueTour {
    public static void main(String[] args) throws Exception {
        // 1. bounded: always pass a capacity
        BlockingQueue<String> pings = new ArrayBlockingQueue<>(3);
        BlockingQueue<String> events = new LinkedBlockingQueue<>(10_000);

        // 2. the four styles of insert
        pings.add("p1");                                          // throws if full
        boolean ok = pings.offer("p2");                           // false if full
        pings.put("p3");                                          // blocks while full
        boolean timed = pings.offer("p4", 50, TimeUnit.MILLISECONDS);   // waits up to 50 ms
        System.out.println(ok + " " + timed + " " + pings + " remaining " + pings.remainingCapacity());

        // 3. the four styles of remove
        String head = pings.element();                            // throws if empty (peek returns null)
        String a = pings.remove();                                // throws if empty
        String b = pings.poll();                                  // null if empty
        String c = pings.take();                                  // blocks while empty
        String d = pings.poll(50, TimeUnit.MILLISECONDS);         // waits up to 50 ms, then null
        System.out.println(head + " " + a + " " + b + " " + c + " " + d);

        // 4. batching
        for (int i = 0; i < 7; i++) events.put("e" + i);
        List<String> batch = new ArrayList<>();
        int n = events.drainTo(batch, 5);
        System.out.println("drained " + n + " " + batch + ", left " + events.size());

        // 5. ordering by priority instead of arrival
        BlockingQueue<Integer> byFare = new PriorityBlockingQueue<>(11, Comparator.reverseOrder());
        byFare.addAll(List.of(14_500, 32_000, 9_900));
        System.out.println("highest fare first: " + byFare.take() + ", " + byFare.take());

        // 6. no storage at all: a direct hand-off
        SynchronousQueue<String> handOff = new SynchronousQueue<>();
        Thread.ofPlatform().start(() -> {
            try { handOff.put("trip-9"); } catch (InterruptedException e) { }
        });
        System.out.println("hand-off received " + handOff.take() + ", size always " + handOff.size());

        // 7. both ends
        BlockingDeque<String> deque = new LinkedBlockingDeque<>(5);
        deque.putLast("normal");
        deque.putFirst("urgent");
        System.out.println(deque.takeFirst() + " then " + deque.takeLast());
    }
}`,
        },
        {
          type: "output",
          text: `true false [p1, p2, p3] remaining 0
p1 p1 p2 p3 null
drained 5 [e0, e1, e2, e3, e4], left 2
highest fare first: 32000, 14500
hand-off received trip-9, size always 0
urgent then normal`,
        },
        {
          type: "paragraph",
          text: "`offer(\"p4\", 50ms)` on the full queue returned `false` after 50 ms, and `poll(50ms)` on the empty one returned `null`. `element()` peeks without removing, which is why `p1` appears twice. `PriorityBlockingQueue` with `Comparator.reverseOrder()` hands out the largest fare first. The deque took `urgent` from the front and `normal` from the back.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A batch writer that flushes on size or time",
        },
        {
          type: "paragraph",
          text: "A database writer for GPS pings should write 100 rows at a time during bursts, but shouldn't hold a single ping for long when traffic is light. The rule: flush when 100 events are waiting or 50 ms after the first event of a batch, whichever comes first.",
        },
        {
          type: "code",
          language: "java",
          title: "BatchFlusher.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

public class BatchFlusher {
    static final String STOP = "STOP";
    static final long T0 = System.nanoTime();
    static long ms() { return (System.nanoTime() - T0) / 1_000_000; }

    // Flush when 100 events are waiting, or 50 ms after the first event of a batch, whichever comes first
    static void flushLoop(BlockingQueue<String> q, int maxBatch, long maxWaitMs) throws InterruptedException {
        List<String> batch = new ArrayList<>(maxBatch);
        boolean stop = false;
        while (!stop) {
            batch.add(q.take());                                       // sleep until there is something
            long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(maxWaitMs);
            while (batch.size() < maxBatch && !batch.contains(STOP)) {
                q.drainTo(batch, maxBatch - batch.size());              // whatever is already there
                long left = deadline - System.nanoTime();
                if (batch.size() >= maxBatch || batch.contains(STOP) || left <= 0) break;
                String next = q.poll(left, TimeUnit.NANOSECONDS);       // wait for more, not past the deadline
                if (next == null) break;
                batch.add(next);
            }
            stop = batch.remove(STOP);                                  // drainTo can pick up the stop marker too
            if (!batch.isEmpty()) flush(batch, stop ? "stop" : batch.size() >= maxBatch ? "full" : "timer");
        }
    }

    static void flush(List<String> batch, String why) {
        System.out.printf("%4d ms  flush %3d events (%s)  %s .. %s%n", ms(), batch.size(), why,
                batch.get(0), batch.get(batch.size() - 1));
        batch.clear();
    }

    public static void main(String[] args) throws Exception {
        BlockingQueue<String> q = new ArrayBlockingQueue<>(1_000);
        Thread writer = Thread.ofPlatform().name("db-writer").start(() -> {
            try { flushLoop(q, 100, 50); } catch (InterruptedException e) { }
        });
        for (int i = 0; i < 250; i++) q.put("ping-" + i);              // a burst: full batches
        Thread.sleep(200);
        for (int i = 250; i < 262; i++) { q.put("ping-" + i); Thread.sleep(2); }   // a trickle: timer batches
        Thread.sleep(200);
        q.put("ping-262");
        q.put(STOP);
        writer.join();
        System.out.println("writer finished");
    }
}`,
        },
        {
          type: "output",
          text: `  11 ms  flush 100 events (full)  ping-0 .. ping-99
  25 ms  flush 100 events (full)  ping-100 .. ping-199
  76 ms  flush  50 events (timer)  ping-200 .. ping-249
 263 ms  flush  12 events (timer)  ping-250 .. ping-261
 439 ms  flush   1 events (stop)  ping-262 .. ping-262
writer finished`,
        },
        {
          type: "list",
          items: [
            "The burst of 250 became two full batches and a 50-event timer batch: the last 50 were all in the queue, but the writer waited out the 50 ms window in `poll(left, NANOSECONDS)` in case more arrived.",
            "The trickle of 12 pings, 2 ms apart, became one batch, flushed 50 ms after the first of them.",
            "**My first version hung.** It checked only the element returned by `take()`/`poll()` for the `STOP` marker, but `drainTo` had swept `STOP` into the batch along with `ping-262`. The writer flushed it as data and went back to `take()` forever. `drainTo` doesn't know about markers; any loop that uses both a poison pill and `drainTo` must check the drained elements too. The next lesson returns to this.",
            "`poll` with the time remaining until the deadline (not a fixed 50 ms each time) is what keeps the batch window at 50 ms from the first event.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Expiring trip offers with DelayQueue",
        },
        {
          type: "paragraph",
          text: "A trip is offered to one driver at a time. If the driver doesn't accept in time, the offer expires and goes to the next driver. Accepting must cancel the timer.",
        },
        {
          type: "code",
          language: "java",
          title: "OfferExpiry.java",
          code: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.DelayQueue;
import java.util.concurrent.Delayed;
import java.util.concurrent.TimeUnit;

public class OfferExpiry {
    static final long T0 = System.nanoTime();
    static String ms() { return String.format("%4d ms", (System.nanoTime() - T0) / 1_000_000); }

    // A trip offered to one driver; if they don't answer in time it goes to the next driver
    record Offer(String trip, String driver, long expiresAt) implements Delayed {
        public long getDelay(TimeUnit unit) { return unit.convert(expiresAt - System.nanoTime(), TimeUnit.NANOSECONDS); }
        public int compareTo(Delayed o) { return Long.compare(expiresAt, ((Offer) o).expiresAt); }
    }

    static final DelayQueue<Offer> pending = new DelayQueue<>();
    static final Map<String, Offer> byTrip = new ConcurrentHashMap<>();

    static void offer(String trip, String driver, long timeoutMs) {
        Offer o = new Offer(trip, driver, System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs));
        byTrip.put(trip, o);
        pending.put(o);
        System.out.println(ms() + " offered " + trip + " to " + driver + " (" + timeoutMs + " ms to accept)");
    }

    static void accept(String trip) {
        Offer o = byTrip.remove(trip);
        boolean removed = o != null && pending.remove(o);              // O(n) scan, under the queue's lock
        System.out.println(ms() + " " + trip + " accepted by " + (o == null ? "?" : o.driver()) + ", timer cancelled " + removed);
    }

    public static void main(String[] args) throws Exception {
        Thread expirer = Thread.ofPlatform().name("offer-expirer").start(() -> {
            try {
                while (true) {
                    Offer o = pending.take();                          // wakes exactly when the earliest expires
                    if (byTrip.remove(o.trip(), o)) {
                        System.out.println(ms() + " " + o.trip() + " expired for " + o.driver() + ", re-offering");
                        offer(o.trip(), o.driver().equals("Ravi") ? "Meera" : "Ravi", 150);
                    }
                }
            } catch (InterruptedException e) {
                System.out.println(ms() + " expirer stopped, " + pending.size() + " offers pending");
            }
        });
        offer("TRIP-1", "Asha", 200);
        offer("TRIP-2", "Kabir", 100);
        Thread.sleep(50);
        accept("TRIP-1");
        Thread.sleep(300);
        accept("TRIP-2");
        expirer.interrupt();
        expirer.join();
    }
}`,
        },
        {
          type: "output",
          text: `  10 ms offered TRIP-1 to Asha (200 ms to accept)
  63 ms offered TRIP-2 to Kabir (100 ms to accept)
 148 ms TRIP-1 accepted by Asha, timer cancelled true
 163 ms TRIP-2 expired for Kabir, re-offering
 172 ms offered TRIP-2 to Ravi (150 ms to accept)
 323 ms TRIP-2 expired for Ravi, re-offering
 323 ms offered TRIP-2 to Meera (150 ms to accept)
 458 ms TRIP-2 accepted by Meera, timer cancelled true
 459 ms expirer stopped, 0 offers pending`,
        },
        {
          type: "list",
          items: [
            "One thread handles every timer: it sleeps in `take()` until the earliest offer expires, with no polling and no thread per offer.",
            "**Cancellation is the hard part.** `accept` removes the offer from the map **and** from the queue. `DelayQueue.remove(Object)` is an O(n) scan under the queue's lock, fine for thousands of pending offers, slow for millions. The expirer also uses `byTrip.remove(trip, offer)` (remove only if still mapped to **this** offer), so an offer that was accepted at the same instant it expired is not re-offered: whichever of the two `remove` calls wins, the other sees it gone.",
            "`interrupt()` is the shutdown: `take()` throws `InterruptedException` and the loop ends.",
            "For huge numbers of timers, a hashed timing wheel (Netty's `HashedWheelTimer`) or a `ScheduledThreadPoolExecutor` with `setRemoveOnCancelPolicy(true)` scales better; the `DelayQueue` version is the clearest way to see the idea.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which Queue",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["A bounded buffer between producer and consumer threads", "`ArrayBlockingQueue(n)` (fixed memory, no allocation) or `LinkedBlockingQueue(n)`", "`new LinkedBlockingQueue<>()` with no capacity"],
            ["A thread pool's work queue", "A bounded `ArrayBlockingQueue`/`LinkedBlockingQueue` with a rejection policy", "The unbounded queue of `newFixedThreadPool` for untrusted load"],
            ["Direct hand-off, no buffering, fail fast when nobody is free", "`SynchronousQueue` (with a capped pool)", "`SynchronousQueue` with an unbounded maximum pool size"],
            ["Process by importance", "`PriorityBlockingQueue` with a tie-breaker, plus an external bound", "Assuming it's bounded, or that iteration is sorted"],
            ["Run something later: retries, expiries, timeouts", "`DelayQueue`, or `ScheduledThreadPoolExecutor`", "A thread that sleeps and polls a list"],
            ["Producer must know the consumer received it", "`LinkedTransferQueue.transfer`", "`put` followed by hand-made acknowledgement"],
            ["Both ends, work stealing, undo-style LIFO between threads", "`LinkedBlockingDeque`, or `ForkJoinPool` for real work stealing", "`Collections.synchronizedList` used as a deque"],
            ["Many elements per lock acquisition", "`take()` then `drainTo(batch, max)`", "One `take()` and one database call per element"],
            ["No blocking at all, lock-free", "`ConcurrentLinkedQueue` (lesson 14)", "A `BlockingQueue` polled in a spin loop"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Using new LinkedBlockingQueue<>() and calling it bounded",
        },
        {
          type: "paragraph",
          text: "The no-argument constructor sets the capacity to `Integer.MAX_VALUE`. `put` never blocks, so there is no backpressure, and a slow consumer turns into heap growth and eventually `OutOfMemoryError`. `Executors.newFixedThreadPool` and `newSingleThreadExecutor` use exactly this queue. Always pass a capacity you've thought about.",
        },
        {
          type: "heading",
          text: "Turning on fairness \"to be safe\"",
        },
        {
          type: "paragraph",
          text: "`new ArrayBlockingQueue<>(n, true)` was 82 to 170 times slower in every measurement above, with two context switches per element. Fairness orders lock acquisition, not elements; FIFO order of elements is guaranteed either way. Use it only if you have measured producer or consumer starvation.",
        },
        {
          type: "heading",
          text: "Polling in a loop instead of blocking",
        },
        {
          type: "code",
          language: "java",
          code: `while (running) {
    Ping p = queue.poll();          // returns null immediately when empty
    if (p != null) write(p);        // so this loop burns a full core while idle
}`,
        },
        {
          type: "paragraph",
          text: "Use `take()`, or `poll(timeout, unit)` if the loop must check a flag periodically. A `BlockingQueue` that's never blocked on is just a slower `ConcurrentLinkedQueue`.",
        },
        {
          type: "heading",
          text: "Calling put from a request thread",
        },
        {
          type: "paragraph",
          text: "A request-handling thread that calls `put` on a full queue waits indefinitely, and so does the client. Request threads should use `offer(e, timeout, unit)` and turn `false` into a fast failure (HTTP 429/503) or a fallback.",
        },
        {
          type: "heading",
          text: "Swallowing InterruptedException",
        },
        {
          type: "paragraph",
          text: "`catch (InterruptedException e) { }` inside a consumer loop that then continues means the thread can never be stopped by interruption: the next `take()` just parks again. Either exit the loop, or restore the flag with `Thread.currentThread().interrupt()` and let the caller exit. The Exception Handling Best Practices lesson has the general rule.",
        },
        {
          type: "heading",
          text: "Check-then-act with size or remainingCapacity",
        },
        {
          type: "paragraph",
          text: "`if (!q.isEmpty()) q.take()` can block forever if another consumer took the last element in between; `if (q.remainingCapacity() > 0) q.put(e)` can block for the same reason. Use the single atomic operation (`poll`, `offer`) and check its result.",
        },
        {
          type: "heading",
          text: "Assuming PriorityBlockingQueue iteration is sorted, or that it's bounded",
        },
        {
          type: "paragraph",
          text: "Iteration and `toString` show heap order. The constructor's capacity is only the initial size. Both surprises showed up in `PriorityDispatch`.",
        },
        {
          type: "heading",
          text: "Mixing drainTo with a poison pill without checking the batch",
        },
        {
          type: "paragraph",
          text: "`drainTo` moves the pill into the batch like any other element, as my first `BatchFlusher` found by hanging. Check drained elements for the marker, or stop consumers by interruption.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Bound every queue, and pick the bound from memory and latency: capacity times element size must fit in the heap, and capacity divided by consumer throughput is the worst-case wait.",
            "Prefer `ArrayBlockingQueue` when the bound is fixed and modest (no allocation, predictable memory); `LinkedBlockingQueue` with a capacity when the bound is large and usually far from full (memory only for what's queued).",
            "Use the column of the method matrix that matches the caller: `put`/`take` in dedicated worker threads, timed `offer`/`poll` anywhere a caller must not hang, plain `offer` to shed load immediately.",
            "Batch on the consumer side with `take()` + `drainTo(batch, max)`, especially when each element costs a network round trip.",
            "Export `size()` and, for bounded queues, fill percentage (`size / (size + remainingCapacity)`) as metrics, and alert on a queue that stays full or keeps growing.",
            "Leave fairness off unless starvation has been measured.",
            "Respect interruption in every consumer loop, and give threads names (`gps-ingest-1`, `db-writer-2`) so thread dumps are readable.",
            "Don't build a `PriorityBlockingQueue` or `DelayQueue` pipeline without an external bound if producers can outrun consumers.",
            "Never put `null`; use a sentinel record or `Optional` for \"no value\".",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Everything measured in this lesson, in one place. All numbers are from one 8-core machine with other benchmarks running, best of five within a run, each program run three times; they're ratios to reason with, not JMH results.",
        },
        {
          type: "table",
          headers: ["Measurement", "Result", "What it means"],
          rows: [
            ["`ArrayBlockingQueue(1024)` vs `LinkedBlockingQueue(1024)`, 1P/1C and 4P/4C", "Overlapping ranges, 2.3 to 9.5 M elements/s; ABQ ahead of bounded LBQ at 4P/4C in two of three runs", "Choose by behaviour, not by this benchmark"],
            ["Unbounded `LinkedBlockingQueue`, 1P/1C", "7.9 to 8.9 M/s, the most stable", "Producers never wait; the speed comes from letting the queue grow"],
            ["Fair `ArrayBlockingQueue`, 4P/4C", "0.1 M/s: 94 to 170 times slower; 799,811 parks for 400,000 elements (JFR)", "Fairness forces a context switch per lock hand-off"],
            ["`take()` vs `take()` + `drainTo(255)`, queue only", "341 to 399 ms vs 102 to 145 ms for 2 M elements", "3 to 4 times less queue overhead"],
            ["One insert per event vs `drainTo` batches, 20,000 events", "7,710 to 8,007 ms vs 71 to 73 ms; 20,000 vs 80 calls", "Round trips dominate; batching is the biggest lever"],
            ["Allocation per element", "ABQ 0, LBQ 24, LBD 24, LTQ 32 bytes", "Linked queues create one young-generation object per element"],
            ["1,000,000 elements in a `PriorityBlockingQueue`", "94 MB of heap", "Unbounded queues need an external limit"],
          ],
        },
        {
          type: "paragraph",
          text: "The broader lesson from these numbers: the choice of queue class moved throughput by less than a factor of two, while fairness moved it by a factor of 80 to 170 and batching by a factor of 100. When a queue is the bottleneck, look at how often threads park and how much work each lock acquisition does before switching implementations.",
        },
      ],
    },
    {
      title: "BlockingQueue in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend in Kolkata keeps the last known position of every online driver in memory, for matching riders to nearby cars. Four ingest threads receive GPS pings from the driver apps and `put` them into an `ArrayBlockingQueue(1024)`; four matcher threads `take` them and update a `ConcurrentHashMap` of positions. Someone had constructed the queue with `fair = true` after reading that fairness \"prevents starvation\". At normal load it was fine. On the first rainy Friday evening, with about 150,000 pings per second across Salt Lake and New Town, the ingest threads spent most of their time parked in `put`, the driver apps' upload requests started timing out, and riders were matched to drivers whose positions were 30 seconds old.",
        },
        {
          type: "paragraph",
          text: "I rebuilt the pipeline with the same thread counts and queue capacity, and 400,000 pings from 20,000 drivers:",
        },
        {
          type: "code",
          language: "java",
          title: "LocationFanIn.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

public class LocationFanIn {
    record Ping(int driverId, int lat, int lon) { }

    static final int PINGS = 400_000, INGEST = 4, MATCHERS = 4;

    static void run(String label, boolean fair, boolean batch) throws Exception {
        BlockingQueue<Ping> q = new ArrayBlockingQueue<>(1024, fair);
        ConcurrentHashMap<Integer, Ping> lastKnown = new ConcurrentHashMap<>();
        Ping[] pings = new Ping[PINGS];
        for (int i = 0; i < PINGS; i++) pings[i] = new Ping(i % 20_000, 22_570 + i % 97, 88_360 + i % 89);
        CountDownLatch start = new CountDownLatch(1), done = new CountDownLatch(INGEST + MATCHERS);
        int perMatcher = PINGS / MATCHERS;
        for (int p = 0; p < INGEST; p++) {
            int from = p * (PINGS / INGEST);
            new Thread(() -> {
                try {
                    start.await();
                    for (int i = from; i < from + PINGS / INGEST; i++) q.put(pings[i]);
                } catch (InterruptedException e) { }
                done.countDown();
            }).start();
        }
        for (int c = 0; c < MATCHERS; c++) {
            new Thread(() -> {
                List<Ping> buf = new ArrayList<>(256);
                int handled = 0;
                try {
                    start.await();
                    while (handled < perMatcher) {
                        buf.add(q.take());
                        if (batch) q.drainTo(buf, Math.min(255, perMatcher - handled - 1));
                        for (Ping ping : buf) lastKnown.put(ping.driverId(), ping);
                        handled += buf.size();
                        buf.clear();
                    }
                } catch (InterruptedException e) { }
                done.countDown();
            }).start();
        }
        long t0 = System.nanoTime();
        start.countDown();
        done.await();
        double secs = (System.nanoTime() - t0) / 1e9;
        System.out.printf("%-34s %,7d ms  %,10.0f pings/s  drivers tracked %,d%n",
                label, Math.round(secs * 1000), PINGS / secs, lastKnown.size());
    }

    public static void main(String[] args) throws Exception {
        System.out.println("peak need: 150,000 pings/s");
        run("before: fair=true, take()", true, false);
        run("after:  fair=false, take()", false, false);
        run("after:  fair=false, take+drainTo", false, true);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m LocationFanIn",
        },
        {
          type: "output",
          text: `peak need: 150,000 pings/s
before: fair=true, take()            8,903 ms      44,930 pings/s  drivers tracked 20,000
after:  fair=false, take()             186 ms   2,152,549 pings/s  drivers tracked 20,000
after:  fair=false, take+drainTo       100 ms   4,014,453 pings/s  drivers tracked 20,000`,
        },
        {
          type: "paragraph",
          text: "Across three runs: the fair queue managed 44,930 to 85,194 pings per second, below the 150,000 needed, so the backlog could only grow. The unfair queue managed 2.0 to 2.5 million per second, and with `drainTo` 2.1 to 4.2 million (one run was slower than plain `take`, the other two almost twice as fast). Same results in every case: all 20,000 drivers tracked.",
        },
        {
          type: "list",
          items: [
            "**The setting that looked safest was the bottleneck.** `fair = true` made every lock acquisition a hand-off to a parked thread. The work per ping (one map update) was tiny, so the cost of the queue was everything. Removing one boolean made the pipeline 24 to 56 times faster.",
            "**The symptom pointed at the wrong place.** Timeouts appeared at the ingest API, so the first suspicion was the network. A thread dump showed all four ingest threads `WAITING (parking)` in `ArrayBlockingQueue.put` and the matchers mostly parked too, with very little CPU used: a queue where nobody is busy and everybody waits is a lock problem, not a capacity problem.",
            "**`drainTo` is the second lever.** Matchers that take a batch per lock acquisition spend less time in the lock; here it helped in two of three runs. With a real database behind the consumer, the earlier measurement showed it's worth 100 times.",
            "**The bounded queue was right; the fairness was wrong.** Capacity 1024 limited memory and gave the ingest API backpressure. The next lesson is about what that backpressure should do when the consumer is genuinely slower, and about not losing the queued pings on deploy.",
            "**Metrics that would have caught it before Friday:** queue fill percentage (it sat at 100%), time spent in `put` per ingest thread, and pings processed per second against pings received per second.",
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
              question: "What is a BlockingQueue, and how is it different from a normal Queue?",
              answer:
                "A thread-safe `Queue` that can make threads wait: `take()` blocks while the queue is empty and `put()` blocks while it's full. A normal `Queue` like `ArrayDeque` isn't thread-safe and only offers throw or return-a-special-value behaviour. Blocking lets consumers sleep instead of spinning and lets a full queue slow producers down.",
            },
            {
              question: "What are the four groups of BlockingQueue methods?",
              answer:
                "Throw an exception (`add`, `remove`, `element`), return a special value (`offer` returns `false`, `poll` and `peek` return `null`), block (`put`, `take`), and time out (`offer(e, time, unit)` returns `false`, `poll(time, unit)` returns `null`). In my `MethodMatrix` run, `offer(e, 300ms)` on a full queue returned `false` after 300 ms and `take()` waited 251 ms for a producer.",
            },
            {
              question: "Why can't you put null into a BlockingQueue?",
              answer:
                "Because `poll` and `poll(timeout)` use `null` to mean \"no element\". If `null` were allowed, a consumer couldn't tell an empty queue from a `null` element. All seven implementations throw `NullPointerException` on `offer(null)`; I checked each one.",
            },
            {
              question: "What's the difference between ArrayBlockingQueue and LinkedBlockingQueue?",
              answer:
                "`ArrayBlockingQueue` is a fixed-size ring buffer (`Object[]`, `takeIndex`, `putIndex`, `count`) with one `ReentrantLock` and two conditions; capacity is required, memory is preallocated, and it allocates nothing per element. `LinkedBlockingQueue` is a linked list with separate `putLock` and `takeLock` and an `AtomicInteger` count; capacity is optional (default `Integer.MAX_VALUE`) and each element allocates a 24-byte node.",
            },
            {
              question: "What is the default capacity of LinkedBlockingQueue?",
              answer:
                "`Integer.MAX_VALUE`. The no-argument constructor calls `this(Integer.MAX_VALUE)`, so `remainingCapacity()` returns 2,147,483,647 and `put` effectively never blocks. In practice it's unbounded: the heap runs out long before the capacity.",
            },
            {
              question: "What does remainingCapacity() return?",
              answer:
                "How many more elements can be added without blocking: capacity minus size for bounded queues, `Integer.MAX_VALUE` for unbounded ones, 0 for `SynchronousQueue`. It's a snapshot, useful for metrics (fill percentage), not for deciding whether a following `put` will block.",
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
              question: "How does ArrayBlockingQueue implement blocking internally?",
              answer:
                "With one `ReentrantLock` and two `Condition`s created from it, `notEmpty` and `notFull`. `take()` locks, loops `while (count == 0) notEmpty.await()`, dequeues, signals `notFull`, unlocks. `put()` is the mirror. `await` releases the lock while parked. In a thread dump, waiting consumers show `WAITING (parking)` and \"parking to wait for\" the same `AbstractQueuedSynchronizer$ConditionObject` address, with `ArrayBlockingQueue.take` on the stack and no locks held.",
            },
            {
              question: "Why does LinkedBlockingQueue use two locks, and why is its count an AtomicInteger?",
              answer:
                "So producers (at the tail, under `putLock`) and consumers (at the head, under `takeLock`) don't contend with each other. A dummy head node keeps them on different nodes even with one element. Because the two sides change the count under different locks, the count must be atomic. A put that makes the queue non-empty briefly takes `takeLock` to signal `notEmpty`, and puts cascade `notFull` signals to each other to avoid crossing locks more often.",
            },
            {
              question: "What is a SynchronousQueue and where is it used?",
              answer:
                "A queue with zero capacity: each insert must meet a remove. `put` waits for a taker; `offer` succeeds only if a taker is already waiting. `Executors.newCachedThreadPool()` uses it: `execute` calls `offer`, which succeeds only if an idle worker is waiting in `poll(60s)`, and otherwise the pool creates a new thread. With a capped maximum pool size, a failed hand-off means rejection, which my `HandOff` demo showed with the third task.",
            },
            {
              question: "How does DelayQueue work?",
              answer:
                "Elements implement `Delayed` (`getDelay` and `compareTo`). Internally it's a `PriorityQueue` ordered by delay, one lock and an `available` condition. `take()` blocks until the head's delay has expired; `poll()` returns `null` if nothing has expired even when elements exist. A `leader` thread does the timed wait for the head, while others wait untimed, so only one thread wakes per expiry. In my retry demo, takes fired within 1 to 2 ms of each due time.",
            },
            {
              question: "What does drainTo do and why use it?",
              answer:
                "Moves up to `max` available elements into a collection in one lock acquisition, without blocking. Typical consumer: `take()` to wait for the first element, then `drainTo(batch, max - 1)`. I measured 3 to 4 times less queue overhead, and with a database round trip per write, 20,000 events went from 20,000 calls and 7.7 s to 80 calls and 72 ms.",
            },
            {
              question: "Is PriorityBlockingQueue bounded?",
              answer:
                "No. The constructor's capacity is only the initial array size; it grows without limit, `remainingCapacity()` is `Integer.MAX_VALUE`, and `put` never blocks. A million queued requests took 94 MB in my test. It also iterates in heap order, not priority order, and isn't stable among equal priorities, so add a sequence tie-breaker.",
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
              question: "What does fairness do in ArrayBlockingQueue, and what does it cost?",
              answer:
                "It makes the internal `ReentrantLock` fair: a thread can't barge in when others are queued, so the lock goes in arrival order. It doesn't change element order (FIFO either way). The cost is a context switch per hand-off. I measured 75 ms against 6,153 ms for 400,000 elements with 4 producers and 4 consumers, and JFR counted 1,691 against 799,811 `jdk.ThreadPark` events.",
            },
            {
              question: "Why does ArrayBlockingQueue use signal() and not signalAll(), when a hand-written wait/notify buffer needs notifyAll()?",
              answer:
                "With one monitor, producers and consumers wait in the same wait set, so `notify` might wake a thread of the wrong kind, which goes back to waiting while the right thread sleeps: a lost wake-up. `notifyAll` is the safe fix. With two conditions, producers only wait on `notFull` and consumers only on `notEmpty`, so each `signal` reaches a thread that can use the change, and one element added justifies waking exactly one taker.",
            },
            {
              question: "How is LinkedTransferQueue different from LinkedBlockingQueue?",
              answer:
                "It's lock-free (CAS on `head`, `tail` and node fields) and unbounded, and it adds `transfer(e)`, which enqueues and waits until a consumer receives the element, plus `tryTransfer` variants that never leave the element behind if no consumer takes it. Its nodes are \"dual\": data nodes and request nodes for waiting consumers. On JDK 21 `SynchronousQueue` is implemented as a subclass of it. Each element allocates a 32-byte `DualNode`.",
            },
            {
              question: "In a thread dump, how do you tell an idle consumer from a stuck producer?",
              answer:
                "Both are `WAITING (parking)`. Look at the frame and the object: consumers have `take` or `poll` on the stack and park on the queue's `notEmpty` condition; blocked producers have `put` and park on `notFull`. Group threads by the \"parking to wait for\" address. Many producers on one `notFull` address means the queue is full and consumers are slow or dead; many consumers on `notEmpty` is normal idleness.",
            },
            {
              question: "How do virtual threads interact with BlockingQueue?",
              answer:
                "Blocking in `take`/`put` goes through `LockSupport.park`, which a virtual thread handles by unmounting from its carrier, so thousands of virtual threads can wait on queues without holding platform threads. The queues themselves don't change. What changes is that blocking is cheap, so the bound on the queue (not the number of threads) becomes the main way to limit work in flight. Virtual Threads, Pinning and Structured Concurrency covers the cases where a virtual thread can't unmount.",
            },
            {
              question: "Why does LinkedBlockingDeque use one lock when LinkedBlockingQueue uses two?",
              answer:
                "Because in a deque both ends support both inserts and removes. With two locks, a `pollLast` and a `pollFirst` on a one-element deque would race for the same node, and there's no natural split of the operations. One lock with `notEmpty` and `notFull` keeps it simple, at the cost of contention between the two ends.",
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
              question: "Driver apps' location uploads are timing out at peak, CPU on the ingest service is low, and the queue between ingest and matcher threads is always full. What do you check?",
              answer:
                "A thread dump first: are ingest threads `WAITING (parking)` in `put`, and are the matchers busy or also parked? Low CPU with everyone parked suggests a lock problem rather than slow consumers. Then the queue's construction: a fair `ArrayBlockingQueue` produced exactly this in my rebuild (45,000 to 85,000 pings per second against a 150,000 need, versus over 2 million unfair). JFR's `jdk.ThreadPark` count per element confirms it. Fix: drop fairness, batch the consumers with `drainTo`, and add fill-percentage and processed-vs-received metrics.",
            },
            {
              question: "A service's heap grows steadily under load and finally throws OutOfMemoryError. The heap dump is mostly LinkedBlockingQueue$Node objects. What happened and what's the fix?",
              answer:
                "A queue built with `new LinkedBlockingQueue<>()` (or an `Executors.newFixedThreadPool`, which uses one) has capacity `Integer.MAX_VALUE`, so producers never block and a consumer that's slower than the arrival rate turns the difference into heap. Each `Node` is 24 bytes plus the element. Fix: give the queue a capacity, decide what producers do when it's full (block with a timeout, shed, or reject), add batching to speed the consumer, and export queue size. The next lesson reproduces this with a small heap and fixes it.",
            },
            {
              question: "A batch writer thread sometimes stops writing during shutdown and the process never exits. It uses a poison pill and drainTo. Where would you look?",
              answer:
                "Whether `drainTo` can move the pill into the batch. If the loop checks only the element returned by `take()`, a pill swept up by `drainTo` is treated as data and the thread goes back to `take()` forever. My first `BatchFlusher` hung exactly like this. Fix by checking the drained batch for the marker, or stop the thread by interruption, and make the thread a non-daemon with a bounded `join` timeout on shutdown.",
            },
            {
              question: "A cached thread pool in a booking service suddenly has 4,000 threads during a traffic spike, and the machine starts swapping. Why, and what do you change?",
              answer:
                "The cached pool uses a `SynchronousQueue` and a maximum of `Integer.MAX_VALUE`. Each submitted task needs an idle worker to accept the hand-off; when tasks are slow (a downstream call hanging), no worker is idle, so every submission creates a new thread. Replace it with a `ThreadPoolExecutor` with a sensible maximum and either a bounded queue or a `SynchronousQueue` plus a rejection policy, and put timeouts on the downstream call so workers free up.",
            },
            {
              question: "Payout retries are implemented by a thread that wakes every second, scans a list of failed payouts and retries the ones that are due. CPU is fine but retries are up to a second late and the list scan is getting slow. How would you redesign it?",
              answer:
                "Use a `DelayQueue` of retry records with `getDelay` based on `System.nanoTime()`: the retry thread blocks in `take()` until exactly the next one is due, with no scanning. My `RetryQueue` fired within 1 to 2 ms of each due time. Re-queue with exponential backoff on failure. Keep the source of truth (next attempt time) in the database so retries survive restarts, and rebuild the queue from it at startup.",
            },
            {
              question: "A consumer thread is shown as RUNNABLE at 100% CPU in top, but it processes nothing most of the time. What's the likely bug?",
              answer:
                "A loop calling `poll()` (no timeout) on an empty queue and immediately looping again. `poll()` never blocks, so the thread spins. Replace with `take()`, or `poll(timeout, unit)` if it must check a shutdown flag. In a thread dump a correct idle consumer is `WAITING (parking)` in `take`, not `RUNNABLE`.",
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
            "Create `new ArrayBlockingQueue<String>(2)`, call `add` three times inside a `try`, and print the exception. Then call `offer` three times and print the results.",
            "On an empty `ArrayBlockingQueue`, time `poll(500, TimeUnit.MILLISECONDS)` with `System.nanoTime()` and print the result and the elapsed milliseconds.",
            "Start two threads that call `take()` on the same empty queue, name them, and run `jcmd <pid> Thread.print`. Compare their \"parking to wait for\" addresses.",
            "Print `new LinkedBlockingQueue<>().remainingCapacity()` and `new SynchronousQueue<>().offer(\"x\")`.",
            "Run `FairVsUnfair` from the Internal Working section with `false`, then `true`.",
            "Put 10 strings into a `LinkedBlockingQueue`, then call `drainTo(list, 4)` twice and print the list and the queue after each call.",
            "Create a `PriorityBlockingQueue<Integer>` with `List.of(5, 1, 4, 2, 3)` via `addAll`, print it, then `take()` until empty.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `IllegalStateException: Queue full` and then `true true false`. Step 2 prints `null` after about 500 ms (I got 500 to 505). Step 3 shows both threads `WAITING (parking)` in `ArrayBlockingQueue.take` with the **same** address. Step 4 prints `2147483647` and `false`. Step 5 takes tens of milliseconds unfair and several seconds fair (75 ms against 6,153 ms on my machine). Step 6 prints four elements, then eight, with six and two left in the queue. Step 7 prints a heap-ordered array (I got `[1, 2, 4, 5, 3]`) and then takes `1 2 3 4 5`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `MATRIX      throws: add/remove/element   value: offer/poll/peek
            blocks: put/take             timed: offer(e,t,u)/poll(t,u)
            null always rejected (poll's null means "empty")

ABQ         Object[] ring + takeIndex/putIndex/count, ONE lock
            notEmpty/notFull conditions, signal() not signalAll()
            capacity required, 0 bytes per element, fair option = 82-170x slower
LBQ         linked nodes (24 B), putLock + takeLock, AtomicInteger count
            new LinkedBlockingQueue() -> capacity Integer.MAX_VALUE (!)
SYNCHRONOUS capacity 0, hand-off; offer works only if a taker waits
            cached pool = SynchronousQueue + max MAX_VALUE -> thread explosion
PBQ         heap, unbounded, iteration NOT sorted, add a tie-breaker
DELAY       Delayed elements, take() when head expires, leader thread
TRANSFER    LinkedTransferQueue.transfer waits for the consumer
DEQUE       LinkedBlockingDeque: both ends, one lock, work-stealing shape

DUMPS       WAITING (parking) on ConditionObject: take -> notEmpty, put -> notFull
BATCH       take() + drainTo(batch, max): 20,000 db calls -> 80 (107x)
            drainTo also drains your poison pill`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `BlockingQueue` is a thread-safe queue that parks threads: consumers when it's empty, producers when it's full. The four method columns decide what a caller does when it can't proceed right now: throw, return, block or wait a bounded time.",
            "The implementations differ in bound, order and locking: one lock and a ring for `ArrayBlockingQueue`, two locks and nodes for `LinkedBlockingQueue`, no storage for `SynchronousQueue`, a heap for the priority and delay queues. Fairness and batching changed throughput far more than the choice between them.",
            "Next comes Producer-Consumer, Backpressure and Clean Shutdown: complete pipelines built on these queues, what a bounded queue does to a slow database compared with an unbounded one, and how to stop consumers without losing the work that's still queued.",
          ],
        },
      ],
    },
  ],
};
