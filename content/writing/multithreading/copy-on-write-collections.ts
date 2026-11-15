import type { Lesson } from "../types";

export const copyOnWriteCollections: Lesson = {
  slug: "copy-on-write-collections",
  date: "2026-11-16",
  title: "CopyOnWriteArrayList and CopyOnWriteArraySet",
  description:
    "The copy-on-write collections of java.util.concurrent on JDK 21, taken apart and measured: a volatile Object[] that readers load with no lock and a final Object lock (a ReentrantLock until Java 8) that every writer takes with synchronized, read through javap and reflection, an array that is replaced on every add, set and remove but untouched by reads (and not even copied when set() stores the same reference), snapshot iterators that never throw ConcurrentModificationException and refuse remove, an index loop that threw IndexOutOfBoundsException in 60,198 of a million rounds while for-each threw nothing, a write cost that grew from 34 ns at 10 elements to 3.1 ms at a million, a list built with add() in a loop that took 3.8 s instead of 3 ms, contains-then-add that produced up to 2,261 duplicates where addIfAbsent produced none, CopyOnWriteArraySet taking 1.4 s for 30,000 ids against 4 ms for ConcurrentHashMap.newKeySet(), subList views that throw after any outside write, 13.5 M iterations per second against 1.7 M for Collections.synchronizedList (whose unlocked iteration threw in 2,583 of 10,000 loops), listener lists where an ArrayList silently skipped a listener, configuration reloads where readers saw an empty rule list 65,533 times, million-element lists that G1 cannot eagerly reclaim (14 full GCs and 5.5 s of GC for 2,000 writes), and a driver-location registry in a ride-hailing backend whose pings fell 3 seconds behind once the city reached 80,000 drivers.",
  tags: ["Multithreading", "CopyOnWriteArrayList", "Concurrent Collections", "Concurrency"],
  sections: [
    {
      title: "What CopyOnWriteArrayList and CopyOnWriteArraySet Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Producer-Consumer, Backpressure and Clean Shutdown, finished the blocking queue phase: structures where threads hand data to each other and wait when there is nothing to take or no room to put. This phase covers the other concurrent collections, and it starts with the strangest trade in the whole package. `CopyOnWriteArrayList` is a thread-safe `List` where **reads take no lock at all**, and every write (add, set, remove) copies the entire backing array, changes the copy, and swaps it in.",
        },
        {
          type: "paragraph",
          text: "That sounds wasteful, and for most lists it is. But some lists are read thousands of times for every write: the listeners on an event bus, the fare adjusters in a pricing pipeline, the zones a service is configured for. For those, copy-on-write gives three things nothing else gives as cheaply: reads that never block or contend, iterators that can never throw `ConcurrentModificationException` (a **snapshot**: the iterator walks the array as it was when the loop began), and a list that can be changed safely from inside a loop over it. `CopyOnWriteArraySet` is the same idea as a `Set`, built on top of a `CopyOnWriteArrayList`.",
        },
        {
          type: "paragraph",
          text: "This lesson takes both apart on JDK 21: the two fields that make up the list, the bytecode of `add`, `set` and `addIfAbsent`, what a write costs at 10 elements and at a million, why the set's `add` is O(n), how `subList` breaks the snapshot rule, a measured comparison with `Collections.synchronizedList` and a read-write lock, the listener-list and configuration-snapshot patterns, and the garbage collector cost of copying big arrays. It ends with a ride-hailing incident where a copy-on-write list held something it should never have held. The next lesson, ConcurrentLinkedQueue, ConcurrentLinkedDeque and ConcurrentSkipListMap, covers the lock-free collections that handle frequent writes instead.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Copy-on-write is an old idea from operating systems: after `fork()`, parent and child share memory pages until one of them writes, and only then is the page copied. Doug Lea's `EDU.oswego.cs.dl.util.concurrent` library applied it to Java collections in the late 1990s with `CopyOnWriteArrayList` and `CopyOnWriteArraySet`, aimed squarely at listener lists in GUI and event code, where the hand-written alternative was cloning a `Vector` before every notification. Both classes arrived in Java 5 with JSR 166.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.2 (1998)", "`Collections.synchronizedList`, and `Vector` before it", "One lock for every call; iteration must hold it by hand"],
            ["Java 5 (2004)", "`CopyOnWriteArrayList`, `CopyOnWriteArraySet` (JSR 166)", "Lock-free reads, snapshot iterators, `addIfAbsent`"],
            ["Java 5 to 8", "Writers locked a `final transient ReentrantLock lock`", "Older articles and dumps show `ReentrantLock` frames"],
            ["Java 8 (2014)", "`removeIf`, `replaceAll`, `sort`, `forEach`, `spliterator`", "Bulk operations that copy once instead of once per element"],
            ["Java 9 (2017)", "The lock became `final transient Object lock` with `synchronized`", "Writers waiting for it show as `BLOCKED (on object monitor)`"],
            ["Java 21 (2023)", "`SequencedCollection`: `addFirst`, `getLast`, `removeFirst`, `reversed()`...", "More write methods, each one a full copy"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The printed duty roster pinned to the drivers' lounge noticeboard.",
        },
        {
          type: "list",
          items: [
            "**Reading is free.** Any number of drivers can read the roster at the same time. Nobody queues, nobody asks permission, and nobody's reading slows anyone else down.",
            "**Changing it means reprinting the whole sheet.** The supervisor doesn't scribble on the pinned copy. She takes the master file into her office (only one person in the office at a time: the lock), prints a complete new roster with the change, walks out and swaps the sheets on the board in one move. A driver who glances at the board sees either the old sheet or the new one, never one with a half-written line.",
            "**A driver who photographed the old sheet keeps the old sheet.** That's the snapshot iterator: it goes on showing exactly what was pinned when the photo was taken, no matter how many times the board changes, and it can't be used to change the board.",
            "**Reprinting is fine for a one-page roster changed twice a day.** For a 300-page list of every driver's current location, changed every few seconds, the office spends all day at the printer and the bin overflows with old copies. That's the production incident at the end of this lesson.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real supervisor reprinting the sheet would notice if two people asked for changes at once and merge them. The list does too, but only for a single call; two separate calls (\"is Asha on the roster? no, so add her\") can interleave with another writer's, which is why `addIfAbsent` exists.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/copy-on-write-collections-snapshot.svg",
          alt: "Left panel, a CopyOnWriteArrayList of zones with two fields from javap on JDK 21: final Object lock, used by add, set and remove through synchronized (a ReentrantLock in Java 8), and volatile Object[] array. The array field points to the current array of length 3, SALT-LAKE, NEW-TOWN, PARK-STREET, where new readers start. Below it, the old array of length 2, SALT-LAKE and NEW-TOWN, never modified and garbage once no iterator holds it; an iterator box labelled snapshot still points at the old array. Pseudocode: add(e) takes the lock, copies the array with length n plus 1, stores e at index n, sets array to the copy and unlocks. Right panel, one write copies the whole array: 10 elements cost 31 to 34 ns and copy 56 bytes, 1,000 cost 0.4 to 0.5 microseconds and 4 KB, 100,000 cost 41 to 57 microseconds and 400 KB, 1,000,000 cost 3.1 to 3.8 ms and 4 MB. A note says a 4 MB Object array is humongous in G1 with 1 MB regions and never eagerly reclaimed, so 2,000 writes cost 14 full GCs and 5.5 seconds in GC. A bar chart for 7 readers iterating 50 elements with 1 writer every millisecond: CopyOnWriteArrayList 13.4 M iterations per second, synchronizedList 1.7 to 3.4 M, ReentrantReadWriteLock 1.8 to 3.2 M. Bottom boxes: iterators never throw ConcurrentModificationException, see the list as it was when created, and throw UnsupportedOperationException for remove, set and add, but subList does throw ConcurrentModificationException after a write. Compound actions: contains plus add gave 264 to 2,261 duplicates, addIfAbsent gave 0 because it re-checks under the lock, clear plus addAll let readers see an empty list, and the fix is to build aside and publish one reference. CopyOnWriteArraySet is a CopyOnWriteArrayList inside, its add is addIfAbsent with an O(n) scan plus a copy, and 30,000 ids added twice took 1.3 to 1.4 seconds against 4 to 8 ms for ConcurrentHashMap.newKeySet().",
          caption: "Readers load one volatile reference and never wait. Writers take one lock, copy everything, and publish a new array; the old one lives on only in iterators that still hold it.",
        },
        {
          type: "heading",
          text: "The pieces",
        },
        {
          type: "table",
          headers: ["Piece", "Field / class", "Role"],
          rows: [
            ["The data", "`private transient volatile Object[] array`", "Always exactly `size()` long; never modified after it is published"],
            ["The writer lock", "`final transient Object lock`", "`synchronized (lock)` around every write; readers never touch it"],
            ["The iterator", "`COWIterator`: `final Object[] snapshot`, `int cursor`", "Walks the array that was current when `iterator()` was called"],
            ["The sub-list", "`COWSubList`: `offset`, `size`, `Object[] expectedArray`", "A **live** view, checked against the current array on every call"],
            ["The set", "`CopyOnWriteArraySet`: `final CopyOnWriteArrayList<E> al`", "`add` = `al.addIfAbsent`, `contains` = a linear scan"],
          ],
        },
        {
          type: "heading",
          text: "Copy-on-write against the other thread-safe lists",
        },
        {
          type: "table",
          headers: ["", "CopyOnWriteArrayList", "Collections.synchronizedList", "List behind a ReadWriteLock"],
          rows: [
            ["Read (`get`, `contains`)", "No lock: one volatile read", "Takes the list's monitor", "Takes the read lock (a CAS on shared state)"],
            ["Write", "Lock + copy of the whole array: O(n)", "Monitor, O(1) for `set`/`add` at the end", "Write lock, O(1) for `set`/`add` at the end"],
            ["Iteration while others write", "Safe, snapshot, never throws", "Must hold the monitor for the whole loop, or it throws CME", "Must hold the read lock for the whole loop"],
            ["Readers block writers?", "Never", "Yes, for as long as a loop holds the monitor", "Yes, while any read lock is held"],
            ["`iterator.remove()`", "`UnsupportedOperationException`", "Works (with the monitor held)", "Works (with the write lock)"],
            ["Memory per write", "A new array of n references", "None", "None"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The list and its inner classes, as `javap -p` sees them on JDK 21 (method lists trimmed to the ones this lesson uses):",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.concurrent.CopyOnWriteArrayList 'java.util.concurrent.CopyOnWriteArrayList$COWIterator' \\
         'java.util.concurrent.CopyOnWriteArrayList$COWSubList' java.util.concurrent.CopyOnWriteArraySet`,
        },
        {
          type: "output",
          text: `public class java.util.concurrent.CopyOnWriteArrayList<E> implements java.util.List<E>, java.util.RandomAccess, java.lang.Cloneable, java.io.Serializable {
  private static final long serialVersionUID;
  final transient java.lang.Object lock;
  private volatile transient java.lang.Object[] array;
  final java.lang.Object[] getArray();
  final void setArray(java.lang.Object[]);
  ...
  public E get(int);
  public E set(int, E);
  public boolean add(E);
  public boolean addIfAbsent(E);
  private boolean addIfAbsent(E, java.lang.Object[]);
  public int addAllAbsent(java.util.Collection<? extends E>);
  public boolean removeIf(java.util.function.Predicate<? super E>);
  public java.util.Iterator<E> iterator();
  public java.util.List<E> subList(int, int);
  public java.util.List<E> reversed();
  private void resetLock();
  ...
}
final class java.util.concurrent.CopyOnWriteArrayList$COWIterator<E> implements java.util.ListIterator<E> {
  private final java.lang.Object[] snapshot;
  private int cursor;
  ...
  public void remove();
  public void set(E);
  public void add(E);
}
class java.util.concurrent.CopyOnWriteArrayList$COWSubList implements java.util.List<E>, java.util.RandomAccess {
  private final int offset;
  private int size;
  private java.lang.Object[] expectedArray;
  final java.util.concurrent.CopyOnWriteArrayList this$0;
  private void checkForComodification();
  ...
}
public class java.util.concurrent.CopyOnWriteArraySet<E> extends java.util.AbstractSet<E> implements java.io.Serializable {
  private final java.util.concurrent.CopyOnWriteArrayList<E> al;
  ...
}`,
        },
        {
          type: "list",
          items: [
            "**Two fields hold the whole list.** `array` is `volatile`, so a reader that loads it sees the array and every element stored in it before it was published (a volatile write happens-before every later volatile read of the same field, from volatile, Visibility and the Java Memory Model). `lock` is a plain `Object` used only by writers. Both are `transient`: serialization writes the elements itself, and `readObject` and `clone` call `resetLock()` to give the copy a fresh lock object (the `lambda$resetLock$2` in the full listing is the reflective `Field` it uses, since `lock` is `final`).",
            "**There's no `size` field and no spare capacity.** Unlike `ArrayList`, the array is always exactly as long as the list. `size()` is `getArray().length`. Every `add` therefore allocates a new array one slot longer.",
            "**The iterator holds an array, not the list.** `COWIterator` has a `final Object[] snapshot` and a cursor, nothing else: no `modCount`, no reference back to the list. That is why it can't detect concurrent changes (there's nothing to detect) and can't remove (it has no list to remove from).",
            "**The sub-list holds an `expectedArray`.** It's the one part of the class that behaves like `ArrayList`: a live view that checks for outside writes. More on that below.",
            "**The set is a wrapper.** `CopyOnWriteArraySet` has one field, a `CopyOnWriteArrayList`. Every set method delegates to it.",
          ],
        },
        {
          type: "heading",
          text: "add, set and get in bytecode",
        },
        {
          type: "paragraph",
          text: "`javap -c -p java.util.concurrent.CopyOnWriteArrayList`, three methods (constant-pool comments shortened, my notes after them):",
        },
        {
          type: "output",
          text: `  public boolean add(E);
    Code:
       0: aload_0
       1: getfield      #13     // Field lock:Ljava/lang/Object;
       4: dup
       5: astore_2
       6: monitorenter          // synchronized (lock) {
       7: aload_0
       8: invokevirtual #27     // Method getArray:()[Ljava/lang/Object;
      11: astore_3              //   es = array
      12: aload_3
      13: arraylength
      14: istore        4       //   len = es.length
      16: aload_3
      17: iload         4
      19: iconst_1
      20: iadd
      21: invokestatic  #113    // Method java/util/Arrays.copyOf:([Ljava/lang/Object;I)[Ljava/lang/Object;
      24: astore_3              //   es = Arrays.copyOf(es, len + 1)
      25: aload_3
      26: iload         4
      28: aload_1
      29: aastore               //   es[len] = e
      30: aload_0
      31: aload_3
      32: invokevirtual #17     // Method setArray:([Ljava/lang/Object;)V   (the volatile write)
      35: iconst_1
      36: aload_2
      37: monitorexit           // }
      38: ireturn

  public E set(int, E);
    Code:
       ...
       6: monitorenter
       7: aload_0
       8: invokevirtual #27     // Method getArray:()[Ljava/lang/Object;
      11: astore        4
      13: aload         4
      15: iload_1
      16: invokestatic  #106    // Method elementAt:([Ljava/lang/Object;I)Ljava/lang/Object;
      19: astore        5       //   oldValue = es[index]
      21: aload         5
      23: aload_2
      24: if_acmpeq     42      //   same reference? skip the copy
      27: aload         4
      29: invokevirtual #80     // Method "[Ljava/lang/Object;".clone:()Ljava/lang/Object;
      ...
      41: aastore               //   es = es.clone(); es[index] = element
      42: aload_0
      43: aload         4
      45: invokevirtual #17     // Method setArray:([Ljava/lang/Object;)V   (always, even with no copy)
      ...
      51: monitorexit

  public E get(int);
    Code:
       0: aload_0
       1: invokevirtual #27     // Method getArray:()[Ljava/lang/Object;
       4: iload_1
       5: invokestatic  #106    // Method elementAt:([Ljava/lang/Object;I)Ljava/lang/Object;
       8: areturn`,
        },
        {
          type: "list",
          items: [
            "**Writers use `monitorenter`/`monitorexit` on `lock`:** plain `synchronized`, with the usual exception-table entry that releases the monitor if the copy throws (an `OutOfMemoryError`, say). In Java 8 the same code was `lock.lock()` and `lock.unlock()` on a `ReentrantLock`.",
            "**The copy happens inside the lock.** `Arrays.copyOf` for `add`, `clone()` for `set`. Holding the lock during the copy is what makes writers safe against each other: two concurrent `add`s can't both copy the same old array and lose one element. It also means writers are fully serialised, and a write to a big list holds the lock for as long as the copy takes.",
            "**`set` skips the copy when the element is the same reference**, but still calls `setArray` with the old array. That volatile write keeps the method's memory-ordering promise (everything before `set` happens-before a later read) even when nothing changed.",
            "**`get` is two instructions of real work:** load the volatile `array`, index into it. No lock, no CAS, no write to shared memory. That's why reads scale with the number of cores, as the measurements below show.",
          ],
        },
        {
          type: "heading",
          text: "addIfAbsent: check outside the lock, re-check inside",
        },
        {
          type: "output",
          text: `  public boolean addIfAbsent(E);
    Code:
       0: aload_0
       1: invokevirtual #27     // Method getArray:()[Ljava/lang/Object;
       4: astore_2              // snapshot = array             (no lock)
       5: aload_1
       6: aload_2
       7: iconst_0
       8: aload_2
       9: arraylength
      10: invokestatic  #56     // Method indexOfRange:(...)I   (linear scan of the snapshot)
      13: ifge          29      // found: return false without locking
      16: aload_0
      17: aload_1
      18: aload_2
      19: invokevirtual #148    // Method addIfAbsent:(Ljava/lang/Object;[Ljava/lang/Object;)Z
      ...
  private boolean addIfAbsent(E, java.lang.Object[]);
    Code:
       6: monitorenter
       7: aload_0
       8: invokevirtual #27     // Method getArray:()[Ljava/lang/Object;
      11: astore        4       // current = array
      ...
      18: aload_2
      19: aload         4
      21: if_acmpeq     94      // unchanged since the snapshot: go straight to the copy
      ...                       // changed: re-scan the elements that differ or are new
      61: invokestatic  #142    // Method java/util/Objects.equals:(...)Z
      ...
      84: invokestatic  #56     // Method indexOfRange:(...)I
      ...
     100: invokestatic  #113    // Method java/util/Arrays.copyOf:([Ljava/lang/Object;I)[Ljava/lang/Object;
     ...
     114: invokevirtual #17     // Method setArray:([Ljava/lang/Object;)V
     ...
     119: monitorexit`,
        },
        {
          type: "paragraph",
          text: "The common case (the element is already there) costs one scan and no lock at all. If the element is missing, the private overload takes the lock and compares the array it scanned with the current one by reference (offset 21). If no writer got in between, it copies straight away; if one did, it re-checks only what could have changed, then adds. That re-check is the whole difference between `addIfAbsent` and `if (!list.contains(x)) list.add(x)`, as the race below shows. And `CopyOnWriteArraySet.add` is literally `return al.addIfAbsent(e);`, so every `add` to the set pays a linear scan.",
        },
        {
          type: "heading",
          text: "Watching the array being replaced",
        },
        {
          type: "paragraph",
          text: "I read the private fields with reflection and printed the identity of the array after each operation, with an iterator created halfway through:",
        },
        {
          type: "code",
          language: "java",
          title: "CowInternals.java",
          code: `import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Iterator;
import java.util.concurrent.CopyOnWriteArrayList;

public class CowInternals {
    // Private fields of CopyOnWriteArrayList and its iterator (needs --add-opens java.base/java.util.concurrent)
    static Object read(Object target, String name) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        return f.get(target);
    }

    static String arr(CopyOnWriteArrayList<?> list) throws Exception {
        Object[] a = (Object[]) read(list, "array");
        return "array@" + Integer.toHexString(System.identityHashCode(a)) + " length " + a.length + " " + Arrays.toString(a);
    }

    public static void main(String[] args) throws Exception {
        Field lockField = CopyOnWriteArrayList.class.getDeclaredField("lock");
        Field arrayField = CopyOnWriteArrayList.class.getDeclaredField("array");
        System.out.println("lock:  " + lockField);
        System.out.println("array: " + arrayField);

        CopyOnWriteArrayList<String> zones = new CopyOnWriteArrayList<>();
        Object lock = read(zones, "lock");
        System.out.println("lock object is a " + lock.getClass().getName());
        System.out.println("empty:            " + arr(zones));
        zones.add("SALT-LAKE");
        System.out.println("add SALT-LAKE:    " + arr(zones));
        zones.add("NEW-TOWN");
        System.out.println("add NEW-TOWN:     " + arr(zones));

        Iterator<String> it = zones.iterator();
        Object[] snapshot = (Object[]) read(it, "snapshot");
        System.out.println("iterator snapshot array@" + Integer.toHexString(System.identityHashCode(snapshot)));

        zones.get(0);
        zones.contains("HOWRAH");
        System.out.println("after get+contains: " + arr(zones));
        zones.add("PARK-STREET");
        System.out.println("add PARK-STREET:  " + arr(zones));
        zones.set(0, "SALT-LAKE");                 // same reference: no copy
        System.out.println("set same element: " + arr(zones));
        zones.set(0, new String("SALT-LAKE"));     // equal but different object: copy
        System.out.println("set new object:   " + arr(zones));

        StringBuilder seen = new StringBuilder();
        while (it.hasNext()) seen.append(it.next()).append(' ');
        System.out.println("old iterator still walks " + seen + "(snapshot length " + snapshot.length + ")");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED CowInternals.java",
        },
        {
          type: "output",
          text: `lock:  final transient java.lang.Object java.util.concurrent.CopyOnWriteArrayList.lock
array: private transient volatile java.lang.Object[] java.util.concurrent.CopyOnWriteArrayList.array
lock object is a java.lang.Object
empty:            array@61df66b6 length 0 []
add SALT-LAKE:    array@6973b51b length 1 [SALT-LAKE]
add NEW-TOWN:     array@1ab3a8c8 length 2 [SALT-LAKE, NEW-TOWN]
iterator snapshot array@1ab3a8c8
after get+contains: array@1ab3a8c8 length 2 [SALT-LAKE, NEW-TOWN]
add PARK-STREET:  array@479d31f3 length 3 [SALT-LAKE, NEW-TOWN, PARK-STREET]
set same element: array@479d31f3 length 3 [SALT-LAKE, NEW-TOWN, PARK-STREET]
set new object:   array@40ef3420 length 3 [SALT-LAKE, NEW-TOWN, PARK-STREET]
old iterator still walks SALT-LAKE NEW-TOWN (snapshot length 2)`,
        },
        {
          type: "list",
          items: [
            "**`lock` really is a `java.lang.Object`** on JDK 21, and `array` is `private transient volatile`, exactly as `javap` said.",
            "**Every `add` produced a new array** (`61df66b6`, `6973b51b`, `1ab3a8c8`, `479d31f3`), each exactly as long as the list. Even the empty list has its own zero-length array.",
            "**`get` and `contains` changed nothing:** the array was still `1ab3a8c8` afterwards. Reads are pure loads.",
            "**`set` with the same reference didn't copy** (`479d31f3` stayed): the string literal `\"SALT-LAKE\"` is interned, so it was the very object already in slot 0. `new String(\"SALT-LAKE\")` is equal but a different object, and that `set` produced a new array, `40ef3420`.",
            "**The iterator kept array `1ab3a8c8`**, the one current when it was created, and walked exactly two zones after three more writes. It's not \"the list at some point during the loop\"; it's precisely the list at the moment `iterator()` ran.",
          ],
        },
        {
          type: "heading",
          text: "Contending writers in a thread dump",
        },
        {
          type: "paragraph",
          text: "Three threads updating a 500,000-element list (every write copies 2 MB of references) and one thread iterating it, captured with `jcmd`:",
        },
        {
          type: "code",
          language: "java",
          title: "WritersInDump.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class WritersInDump {
    public static void main(String[] args) throws Exception {
        List<Integer> init = new ArrayList<>();
        for (int i = 0; i < 500_000; i++) init.add(i);
        CopyOnWriteArrayList<Integer> pings = new CopyOnWriteArrayList<>(init);   // 2 MB array
        for (int w = 0; w < 3; w++) {
            int id = w;
            Thread.ofPlatform().daemon().name("ping-writer-" + w).start(() -> {
                Integer a = -1, b = -2;
                for (int k = 0; ; k++) pings.set(id, pings.get(id) == a ? b : a);   // every write copies 2 MB
            });
        }
        Thread.ofPlatform().daemon().name("dispatch-reader").start(() -> {
            long s = 0;
            while (true) for (int x : pings) s += x;                                  // no lock at all
        });
        Thread.sleep(30_000);   // time for: jcmd WritersInDump Thread.print -l
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d cls WritersInDump.java && java -Xmx256m -cp cls WritersInDump &
jcmd WritersInDump Thread.print -l`,
        },
        {
          type: "output",
          text: `"ping-writer-0" #20 [504084] daemon prio=5 os_prio=0 cpu=994.70ms elapsed=5.44s tid=0x00007426d415f740 nid=504084 waiting for monitor entry  [0x00007426adefe000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at java.util.concurrent.CopyOnWriteArrayList.set(java.base@21.0.13.0.3/CopyOnWriteArrayList.java:441)
	- waiting to lock <0x00000000f6e00490> (a java.lang.Object)
	at WritersInDump.lambda$main$0(WritersInDump.java:14)
	at WritersInDump$$Lambda/0x0000742660000a08.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
	- None

"ping-writer-1" ... the same frames, waiting to lock the same <0x00000000f6e00490>

"ping-writer-2" #22 [504087] daemon prio=5 os_prio=0 cpu=1192.40ms elapsed=5.44s tid=0x00007426d41619f0 nid=504087 runnable  [0x00007426adcfe000]
   java.lang.Thread.State: RUNNABLE
	at java.lang.Object.clone(java.base@21.0.13.0.3/Native Method)
	at java.util.concurrent.CopyOnWriteArrayList.set(java.base@21.0.13.0.3/CopyOnWriteArrayList.java:446)
	- locked <0x00000000f6e00490> (a java.lang.Object)
	at WritersInDump.lambda$main$0(WritersInDump.java:14)
	at WritersInDump$$Lambda/0x0000742660000a08.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
	- None

"dispatch-reader" #23 [504095] daemon prio=5 os_prio=0 cpu=3293.67ms elapsed=5.44s tid=0x00007426d4163370 nid=504095 runnable  [0x00007426adbfd000]
   java.lang.Thread.State: RUNNABLE
	at WritersInDump.lambda$main$1(WritersInDump.java:19)
	at WritersInDump$$Lambda/0x0000742660000c30.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

   Locked ownable synchronizers:
	- None`,
        },
        {
          type: "list",
          items: [
            "**Waiting writers are `BLOCKED (on object monitor)`**, `waiting to lock <0x...f6e00490> (a java.lang.Object)` inside `CopyOnWriteArrayList.set`. Not `WAITING (parking)` as with a `ReentrantLock`: since Java 9 it's an intrinsic monitor, so it looks like any `synchronized` contention, and `Locked ownable synchronizers` is `None`. The object type, a bare `java.lang.Object`, is the clue that it's the list's private lock rather than one of yours.",
            "**The writer holding the lock is in `Object.clone`**, a native method: it's copying. In a dump of a real service, a `RUNNABLE` thread in `clone` or `Arrays.copyOf` under `CopyOnWriteArrayList` with others `BLOCKED` behind it is the signature of a copy-on-write list that's written too often.",
            "**The reader isn't waiting on anything.** It's `RUNNABLE`, with no list frames at all (the JIT inlined the iterator into the loop), and it had used 3.3 seconds of CPU in 5.4 seconds, more than any writer. Reads never queue behind writes.",
          ],
        },
      ],
    },
    {
      title: "Snapshot Iterators: No ConcurrentModificationException, No remove",
      blocks: [
        {
          type: "paragraph",
          text: "An `ArrayList` iterator is **fail-fast**: it records the list's `modCount` (a counter bumped by every structural change) and throws `ConcurrentModificationException` (CME) when it sees a different value. A copy-on-write iterator is a **snapshot**: it has nothing to compare, so it never throws, and it never sees writes made after it was created. I modified both lists inside a for-each loop, tried the iterator's write methods, and then kept one thread writing while another iterated:",
        },
        {
          type: "code",
          language: "java",
          title: "SnapshotIterators.java",
          code: `import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class SnapshotIterators {
    static void modifyWhileIterating(List<String> drivers) {
        String name = drivers.getClass().getSimpleName();
        try {
            int visited = 0;
            for (String d : drivers) {
                visited++;
                if (d.equals("ravi")) drivers.add("meera");     // a write during the loop
            }
            System.out.printf("%-20s loop finished: visited %d, list now %s%n", name, visited, drivers);
        } catch (RuntimeException e) {
            System.out.printf("%-20s loop failed: %s, list now %s%n", name, e.getClass().getSimpleName(), drivers);
        }
    }

    public static void main(String[] args) throws Exception {
        modifyWhileIterating(new ArrayList<>(List.of("asha", "ravi", "imran")));
        modifyWhileIterating(new CopyOnWriteArrayList<>(List.of("asha", "ravi", "imran")));

        List<String> online = new CopyOnWriteArrayList<>(List.of("asha", "ravi", "imran"));
        Iterator<String> it = online.iterator();
        it.next();
        try {
            it.remove();
        } catch (UnsupportedOperationException e) {
            System.out.println("iterator.remove(): " + e);
        }
        try {
            online.listIterator().set("x");
        } catch (UnsupportedOperationException e) {
            System.out.println("listIterator.set(): " + e);
        }
        online.removeIf(d -> d.startsWith("r"));               // the list's own methods work
        System.out.println("removeIf instead: " + online);

        // A reader iterating while another thread keeps writing
        List<Integer> trips = new CopyOnWriteArrayList<>();
        for (int i = 0; i < 1_000; i++) trips.add(i);
        Thread writer = Thread.ofPlatform().start(() -> {
            for (int i = 1_000; i < 21_000; i++) {
                trips.add(i);
                if (i % 2 == 0) trips.remove(0);
            }
        });
        int iterations = 0, minSeen = Integer.MAX_VALUE, maxSeen = 0;
        while (writer.isAlive()) {
            int n = 0;
            for (int t : trips) n++;                            // never throws, never sees a half-done write
            iterations++;
            minSeen = Math.min(minSeen, n);
            maxSeen = Math.max(maxSeen, n);
        }
        writer.join();
        System.out.printf("reader: %d full iterations during 20,000 writes, sizes seen %d..%d, final size %d%n",
                iterations, minSeen, maxSeen, trips.size());
    }
}`,
        },
        {
          type: "output",
          text: `ArrayList            loop failed: ConcurrentModificationException, list now [asha, ravi, imran, meera]
CopyOnWriteArrayList loop finished: visited 3, list now [asha, ravi, imran, meera]
iterator.remove(): java.lang.UnsupportedOperationException
listIterator.set(): java.lang.UnsupportedOperationException
removeIf instead: [asha, imran]
reader: 1973 full iterations during 20,000 writes, sizes seen 1000..11000, final size 11000`,
        },
        {
          type: "list",
          items: [
            "**The `ArrayList` loop threw CME** on the `next()` after the add, though the add itself succeeded: the list ended with four drivers and the loop never finished. The copy-on-write loop finished, visited exactly **3** drivers (the snapshot), and the fourth was there afterwards.",
            "**The iterator's write methods throw `UnsupportedOperationException`.** `remove()`, `set()` and `add()` on a `COWIterator` do nothing else: their bytecode is `new UnsupportedOperationException`, `dup`, `invokespecial`, `athrow`. To remove while looping, call the list's own methods: `removeIf` (one copy for the whole removal) or `list.remove(x)` from inside the loop, which the snapshot tolerates.",
            "**A reader looping while a writer made 20,000 adds (and 10,000 removes along the way)** completed 1,973 full iterations with no exception. Each iteration saw one consistent size between 1,000 and 11,000. Across three runs the reader completed 650 to 6,632 iterations, depending on how busy the machine was; it never threw.",
          ],
        },
        {
          type: "heading",
          text: "The snapshot only covers one call",
        },
        {
          type: "paragraph",
          text: "A snapshot is taken by each method call separately. A loop written with indexes calls `size()` once per pass and `get(i)` once per element, and each call can see a different array:",
        },
        {
          type: "code",
          language: "java",
          title: "IndexLoop.java",
          code: `import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

public class IndexLoop {
    public static void main(String[] args) throws Exception {
        CopyOnWriteArrayList<String> nearby = new CopyOnWriteArrayList<>(List.of("asha", "ravi", "imran", "meera"));
        AtomicBoolean stop = new AtomicBoolean();
        Thread churn = Thread.ofPlatform().start(() -> {        // drivers go offline and come back
            while (!stop.get()) { nearby.remove("meera"); nearby.add("meera"); }
        });
        int indexLoopFailures = 0, foreachFailures = 0;
        for (int round = 0; round < 1_000_000; round++) {
            try {
                for (int i = 0; i < nearby.size(); i++) nearby.get(i).length();   // size() and get(i) see different arrays
            } catch (IndexOutOfBoundsException e) {
                indexLoopFailures++;
            }
            try {
                for (String d : nearby) d.length();                                // one snapshot for the whole loop
            } catch (RuntimeException e) {
                foreachFailures++;
            }
        }
        stop.set(true);
        churn.join();
        System.out.printf("index loop: %,d IndexOutOfBoundsException in 1,000,000 rounds; for-each: %d%n", indexLoopFailures, foreachFailures);
    }
}`,
        },
        {
          type: "output",
          text: `index loop: 60,198 IndexOutOfBoundsException in 1,000,000 rounds; for-each: 0`,
        },
        {
          type: "paragraph",
          text: "About six percent of the index loops threw (60,198 in this run, 76,720 in the second): `size()` returned 4, a remove made the array 3 long, and `get(3)` ran against the new array. The for-each loop over the same list never failed, because `iterator()` loaded the array once. The same applies to `if (!list.isEmpty()) list.get(0)`: two calls, two possible arrays. Use the iterator, `forEach`, or call `toArray()` once and work on the result.",
        },
      ],
    },
    {
      title: "What a Write Costs",
      blocks: [
        {
          type: "paragraph",
          text: "A write copies every reference in the array, so its cost should grow linearly with the size of the list. I timed `set()` on lists of `Integer` from 10 to a million elements (swapping between two objects so every `set` really copied), timed `get()` on the same lists, and then built lists of 10,000 to 100,000 elements by calling `add()` in a loop:",
        },
        {
          type: "code",
          language: "java",
          title: "WriteCost.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class WriteCost {
    static long sink;

    public static void main(String[] args) {
        System.out.println("elements    set() per write   get() per read   bytes copied per write");
        for (int n : new int[] {10, 1_000, 100_000, 1_000_000}) {
            List<Integer> base = new ArrayList<>();
            for (int i = 0; i < n; i++) base.add(i);
            CopyOnWriteArrayList<Integer> list = new CopyOnWriteArrayList<>(base);
            Integer a = -1, b = -2;                             // swap between two objects, so every set() really copies
            int writes = (int) Math.max(20, Math.min(1_000_000, 200_000_000L / n));
            long bestWrite = Long.MAX_VALUE, bestRead = Long.MAX_VALUE;
            for (int rep = 0; rep < 5; rep++) {
                long t = System.nanoTime();
                for (int w = 0; w < writes; w++) {
                    int i = w % n;
                    list.set(i, list.get(i) == a ? b : a);      // set() with the same reference would skip the copy
                }
                bestWrite = Math.min(bestWrite, (System.nanoTime() - t) / writes);
                t = System.nanoTime();
                for (int r = 0; r < 10_000_000; r++) sink += list.get(r % n);
                bestRead = Math.min(bestRead, (System.nanoTime() - t) / 10_000_000);
            }
            long bytes = 16 + 4L * n;                           // array header + compressed references
            System.out.printf("%,9d   %,12d ns   %,11d ns   %,13d%n", n, bestWrite, bestRead, bytes);
        }

        // Building a list one add() at a time vs one addAll()
        for (int n : new int[] {10_000, 50_000, 100_000}) {
            long t = System.nanoTime();
            CopyOnWriteArrayList<Integer> oneByOne = new CopyOnWriteArrayList<>();
            for (int i = 0; i < n; i++) oneByOne.add(i);
            long addMs = (System.nanoTime() - t) / 1_000_000;
            List<Integer> staged = new ArrayList<>(n);
            t = System.nanoTime();
            for (int i = 0; i < n; i++) staged.add(i);
            CopyOnWriteArrayList<Integer> bulk = new CopyOnWriteArrayList<>(staged);
            double bulkMs = (System.nanoTime() - t) / 1e6;
            System.out.printf("build %,7d: add() one by one %,6d ms, ArrayList + one copy %6.2f ms%n", n, addMs, bulkMs);
        }
        System.out.println("sink " + (sink != 0));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx512m WriteCost.java",
        },
        {
          type: "output",
          text: `elements    set() per write   get() per read   bytes copied per write
       10             34 ns             3 ns              56
    1,000            433 ns             3 ns           4,016
  100,000         40,915 ns             3 ns         400,016
1,000,000      3,104,037 ns             3 ns       4,000,016
build  10,000: add() one by one     61 ms, ArrayList + one copy   0.28 ms
build  50,000: add() one by one    759 ms, ArrayList + one copy   1.61 ms
build 100,000: add() one by one  3,830 ms, ArrayList + one copy   3.41 ms
sink true`,
        },
        {
          type: "list",
          items: [
            "**Writes grow with the list; reads don't.** `set()` went from 34 ns at 10 elements to 433 ns at 1,000, 41 microseconds at 100,000 and 3.1 ms at a million: from 1,000 elements up, roughly proportional to the size, as a copy should be (at 10 elements the fixed cost of the call and the lock dominates). `get()` stayed at 3 ns throughout. In a second run the numbers were 31 ns, 548 ns, 57 microseconds and 3.8 ms; the shape was identical.",
            "**Bytes copied are 16 + 4n.** A 64-bit JVM with compressed references (the default under 32 GB of heap) stores each reference in 4 bytes, plus a 16-byte array header. A million-element list means a 4 MB array allocated and filled on every write. The `Integer` objects themselves aren't copied; only the references to them.",
            "**My first version of this benchmark measured 23 to 31 ns at every size.** It wrote the same `Integer` back into slots that already held it, and `set` skips the copy for the same reference. A benchmark of a copy-on-write list has to make sure it's actually writing.",
            "**Building a list with `add()` in a loop is quadratic.** 100,000 adds copied 1 + 2 + ... + 100,000 references, about 5 billion, and took 3.8 seconds (3.6 in the second run). Building an `ArrayList` and passing it to the constructor copied once: 0.3 to 3.4 ms. Ten times more elements took 63 times longer with `add()` (10,000 to 100,000: 61 ms to 3,830 ms).",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The cost lands in two places",
          text: "The writer pays the copy while holding the lock, so other writers queue behind it. Then the garbage collector pays for every old array. A list of 100,000 elements written 1,000 times a second allocates 400 MB a second of garbage, even though the list never grows. The GC section below measures what that does.",
        },
      ],
    },
    {
      title: "addIfAbsent and CopyOnWriteArraySet",
      blocks: [
        {
          type: "paragraph",
          text: "Each method of a copy-on-write list is atomic on its own. Two calls in a row aren't. Four threads each register the same 2,000 driver ids, once with `contains` followed by `add` (check-then-act) and once with `addIfAbsent`. Then the cost of `CopyOnWriteArraySet`, whose `add` is `addIfAbsent`, against a concurrent hash set:",
        },
        {
          type: "code",
          language: "java",
          title: "AddIfAbsentRace.java",
          code: `import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.CountDownLatch;

public class AddIfAbsentRace {
    interface Adder { void add(CopyOnWriteArrayList<Integer> list, int id); }

    // 4 threads each try to register the same 2,000 driver ids
    static int duplicates(Adder adder) throws InterruptedException {
        CopyOnWriteArrayList<Integer> drivers = new CopyOnWriteArrayList<>();
        CountDownLatch start = new CountDownLatch(1);
        Thread[] ts = new Thread[4];
        for (int t = 0; t < 4; t++) {
            ts[t] = Thread.ofPlatform().start(() -> {
                try { start.await(); } catch (InterruptedException e) { return; }
                for (int id = 0; id < 2_000; id++) adder.add(drivers, id);
            });
        }
        start.countDown();
        for (Thread t : ts) t.join();
        return drivers.size() - new HashSet<>(drivers).size();
    }

    static double fill(Set<Integer> set, int n) {
        long t = System.nanoTime();
        for (int i = 0; i < n; i++) set.add(i);
        for (int i = 0; i < n; i++) set.add(i);                // second pass: every add is a duplicate
        return (System.nanoTime() - t) / 1e6;
    }

    public static void main(String[] args) throws Exception {
        for (int run = 0; run < 3; run++) {
            int racy = duplicates((l, id) -> { if (!l.contains(id)) l.add(id); });   // check-then-act
            int safe = duplicates((l, id) -> l.addIfAbsent(id));                      // re-checks under the lock
            System.out.printf("run %d: contains+add -> %,d duplicates, addIfAbsent -> %d duplicates%n", run, racy, safe);
        }
        for (int n : new int[] {1_000, 10_000, 30_000}) {
            double cow = fill(new CopyOnWriteArraySet<>(), n);
            double chm = fill(ConcurrentHashMap.newKeySet(), n);
            System.out.printf("%,6d ids added twice: CopyOnWriteArraySet %,8.1f ms, ConcurrentHashMap.newKeySet() %5.1f ms%n", n, cow, chm);
        }
    }
}`,
        },
        {
          type: "output",
          text: `run 0: contains+add -> 2,261 duplicates, addIfAbsent -> 0 duplicates
run 1: contains+add -> 264 duplicates, addIfAbsent -> 0 duplicates
run 2: contains+add -> 1,991 duplicates, addIfAbsent -> 0 duplicates
 1,000 ids added twice: CopyOnWriteArraySet      1.6 ms, ConcurrentHashMap.newKeySet()   1.1 ms
10,000 ids added twice: CopyOnWriteArraySet    171.5 ms, ConcurrentHashMap.newKeySet()  14.9 ms
30,000 ids added twice: CopyOnWriteArraySet  1,386.4 ms, ConcurrentHashMap.newKeySet()   4.4 ms`,
        },
        {
          type: "list",
          items: [
            "**Check-then-act produced duplicates in every run:** 2,261, 264 and 1,991 out of 8,000 attempted registrations, and 747 to 1,504 in a second set of runs. Two threads both ran `contains` against the same array, both saw the id missing, and both added it. Each call was thread-safe; the pair wasn't.",
            "**`addIfAbsent` produced none in six runs.** It makes the decision under the lock, after checking whether the array changed since its unlocked scan (the reference comparison at offset 21 above).",
            "**`CopyOnWriteArraySet` is fine for small sets and terrible for large ones.** At 1,000 ids it was in the same range as `ConcurrentHashMap.newKeySet()` (1.6 against 1.1 ms). At 10,000 it was 11 times slower (172 against 15 ms), at 30,000 between 160 and 315 times (1,386 against 4.4 ms; 1,286 against 8.0 in the second run). Every `add` scans the whole array, duplicate or not, and every successful `add` copies it too: that's O(n) per add and O(n²) to fill.",
            "**What the set gives in exchange:** insertion order, snapshot iteration, and lock-free reads. For a few dozen listeners or zone names, that's a good deal; for driver ids, it's the wrong structure.",
          ],
        },
        {
          type: "paragraph",
          text: "For a list, `addAllAbsent(collection)` is the bulk form: one lock, one scan per candidate, one copy for all the new elements. `CopyOnWriteArraySet.addAll` uses it.",
        },
      ],
    },
    {
      title: "subList Is a Live View, Not a Snapshot",
      blocks: [
        {
          type: "paragraph",
          text: "Iterators are snapshots, so it's natural to assume `subList` is too. It isn't. `COWSubList` keeps a reference to the array it expects (`expectedArray`) and compares it with the list's current array on every call:",
        },
        {
          type: "code",
          language: "java",
          title: "SubListBehaviour.java",
          code: `import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class SubListBehaviour {
    public static void main(String[] args) {
        CopyOnWriteArrayList<String> queue = new CopyOnWriteArrayList<>(List.of("asha", "ravi", "imran", "meera", "joy"));
        List<String> firstThree = queue.subList(0, 3);
        System.out.println("subList: " + firstThree + " (" + firstThree.getClass().getName() + ")");

        firstThree.set(0, "ASHA");                         // writes through the view, under the list's lock
        System.out.println("after view.set: list " + queue);

        firstThree.add("tapas");                           // view writes keep the view valid
        System.out.println("after view.add: list " + queue + ", view " + firstThree);

        queue.add("rahul");                                // a write to the list itself
        try {
            System.out.println(firstThree.get(0));
        } catch (RuntimeException e) {
            System.out.println("view after list.add: " + e);
        }

        // A snapshot that can't go stale: copy it out
        List<String> copy = List.copyOf(queue.subList(0, 3));
        queue.add("arjun");
        System.out.println("List.copyOf(subList) after another add: " + copy);
    }
}`,
        },
        {
          type: "output",
          text: `subList: [asha, ravi, imran] (java.util.concurrent.CopyOnWriteArrayList$COWSubList)
after view.set: list [ASHA, ravi, imran, meera, joy]
after view.add: list [ASHA, ravi, imran, tapas, meera, joy], view [ASHA, ravi, imran, tapas]
view after list.add: java.util.ConcurrentModificationException
List.copyOf(subList) after another add: [ASHA, ravi, imran]`,
        },
        {
          type: "list",
          items: [
            "**Writes through the view work and keep the view valid.** `set` and `add` on the sub-list took the parent's lock, wrote to the parent (`tapas` landed at index 3 of the list) and updated the view's `expectedArray` to the new array.",
            "**Any write to the list itself kills the view.** After `queue.add(\"rahul\")`, the next `firstThree.get(0)` threw `ConcurrentModificationException`: `checkForComodification` saw `getArray() != expectedArray`. This is the one place in the class where CME appears, and in a concurrent program any other thread's write triggers it.",
            "**For a stable slice, copy it.** `List.copyOf(queue.subList(0, 3))` copies the elements straight away; it didn't change when another driver joined.",
          ],
        },
      ],
    },
    {
      title: "Against Collections.synchronizedList and a Read-Write Lock",
      blocks: [
        {
          type: "paragraph",
          text: "The claim is that copy-on-write wins when reads dominate. I measured it: seven reader threads each iterate a 50-element list and sum it, one writer replaces elements, for two seconds per implementation. First the writer pauses 1 ms between writes (a list changed a few hundred times a second), then it writes as fast as it can. The `synchronizedList` readers hold the list's monitor for the whole loop, as its Javadoc requires; the read-write-lock readers hold the read lock:",
        },
        {
          type: "code",
          language: "java",
          title: "ReadHeavy.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.LongAdder;
import java.util.concurrent.locks.LockSupport;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.IntConsumer;
import java.util.function.ToLongFunction;

public class ReadHeavy {
    static final int SIZE = 50, READERS = 7;

    // readAll: one full iteration, returns a checksum; write: replace element i
    record Impl(String name, ToLongFunction<Void> readAll, IntConsumer write) { }

    static void run(Impl impl, long writePauseNanos) throws InterruptedException {
        AtomicBoolean stop = new AtomicBoolean();
        LongAdder reads = new LongAdder(), writes = new LongAdder();
        List<Thread> ts = new ArrayList<>();
        for (int r = 0; r < READERS; r++) {
            ts.add(Thread.ofPlatform().start(() -> {
                long sum = 0, n = 0;
                while (!stop.get()) { sum += impl.readAll().applyAsLong(null); n++; }
                reads.add(n);
                if (sum == 42) System.out.print("");
            }));
        }
        ts.add(Thread.ofPlatform().start(() -> {
            int i = 0;
            while (!stop.get()) {
                impl.write().accept(i++ % SIZE);
                writes.increment();
                if (writePauseNanos > 0) LockSupport.parkNanos(writePauseNanos);
            }
        }));
        Thread.sleep(2_000);
        stop.set(true);
        for (Thread t : ts) t.join();
        System.out.printf("  %-24s %6.1f M iterations/s   %,10d writes/s%n",
                impl.name(), reads.sum() / 2e6, writes.sum() / 2);
    }

    public static void main(String[] args) throws Exception {
        List<Integer> init = new ArrayList<>();
        for (int i = 0; i < SIZE; i++) init.add(i);

        CopyOnWriteArrayList<Integer> cow = new CopyOnWriteArrayList<>(init);
        Impl cowImpl = new Impl("CopyOnWriteArrayList", v -> {
            long s = 0; for (int x : cow) s += x; return s;
        }, i -> cow.set(i, cow.get(i) + 1));

        List<Integer> sync = Collections.synchronizedList(new ArrayList<>(init));
        Impl syncImpl = new Impl("synchronizedList", v -> {
            long s = 0;
            synchronized (sync) { for (int x : sync) s += x; }   // iteration must hold the list's lock
            return s;
        }, i -> sync.set(i, sync.get(i) + 1));

        List<Integer> plain = new ArrayList<>(init);
        ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
        Impl rwImpl = new Impl("ReentrantReadWriteLock", v -> {
            long s = 0;
            rw.readLock().lock();
            try { for (int x : plain) s += x; } finally { rw.readLock().unlock(); }
            return s;
        }, i -> {
            rw.writeLock().lock();
            try { plain.set(i, plain.get(i) + 1); } finally { rw.writeLock().unlock(); }
        });

        for (long pause : new long[] {1_000_000, 0}) {
            System.out.println(pause > 0 ? "7 readers, 1 writer pausing 1 ms between writes:" : "7 readers, 1 writer writing flat out:");
            for (Impl impl : List.of(cowImpl, syncImpl, rwImpl)) run(impl, pause);
        }
    }
}`,
        },
        {
          type: "output",
          text: `7 readers, 1 writer pausing 1 ms between writes:
  CopyOnWriteArrayList       13.5 M iterations/s          661 writes/s
  synchronizedList            1.7 M iterations/s            7 writes/s
  ReentrantReadWriteLock      1.8 M iterations/s           34 writes/s
7 readers, 1 writer writing flat out:
  CopyOnWriteArrayList       13.0 M iterations/s    1,592,840 writes/s
  synchronizedList            2.5 M iterations/s      260,629 writes/s
  ReentrantReadWriteLock      1.5 M iterations/s    1,352,436 writes/s`,
        },
        {
          type: "list",
          items: [
            "**Reads: about 13 million iterations a second against 1.5 to 3.4 million.** Copy-on-write readers share nothing but one volatile load, so seven of them run on seven cores without interfering. `synchronizedList` lets one reader in at a time. The read-write lock lets readers in together, but every `lock()` and `unlock()` is a CAS on the same `state` word, and that cache line bounces between cores: in a second run it was 3.2 M against 3.4 M for `synchronizedList`, no better than a single lock. The machine was heavily loaded (load average 4 to 27 during these runs), so treat the absolute numbers as rough; copy-on-write led by 4 to 9 times in both runs.",
            "**The writer suffered most with locks.** With a 1 ms pause between writes, the copy-on-write writer managed 661 writes a second (745 in the second run), close to what the pause allows. The `synchronizedList` writer got **7** (6 in the second run): seven readers kept re-taking the monitor, and the writer almost never won it. The read-write lock writer got 34 to 36. A reader-heavy lock can starve writers; copy-on-write can't, because readers don't take the lock at all.",
            "**With 50 elements, copy-on-write even won when writing flat out:** 0.9 to 1.6 million writes a second, while readers still did 10 to 13 million iterations. A 50-element copy costs a few tens of nanoseconds. That changes completely with size, as the previous section showed.",
          ],
        },
        {
          type: "heading",
          text: "Forgetting to lock a synchronizedList during iteration",
        },
        {
          type: "paragraph",
          text: "`synchronizedList` makes each call atomic, but iteration is many calls, so its Javadoc says the caller must hold the list's monitor during the loop. Nothing enforces that:",
        },
        {
          type: "code",
          language: "java",
          title: "SyncListIteration.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

public class SyncListIteration {
    public static void main(String[] args) throws Exception {
        List<Integer> sync = Collections.synchronizedList(new ArrayList<>());
        for (int i = 0; i < 1_000; i++) sync.add(i);
        AtomicBoolean stop = new AtomicBoolean();
        Thread writer = Thread.ofPlatform().start(() -> {
            while (!stop.get()) { sync.add(1); sync.remove(0); }   // each call is synchronized
        });
        int ok = 0, cme = 0;
        for (int round = 0; round < 10_000; round++) {
            try {
                long s = 0;
                for (int x : sync) s += x;                        // NOT holding the list's lock
                ok++;
            } catch (java.util.ConcurrentModificationException e) {
                cme++;
            }
        }
        stop.set(true);
        writer.join();
        System.out.printf("synchronizedList iterated without its lock: %,d ok, %,d ConcurrentModificationException%n", ok, cme);
    }
}`,
        },
        {
          type: "output",
          text: `synchronizedList iterated without its lock: 7,417 ok, 2,583 ConcurrentModificationException`,
        },
        {
          type: "paragraph",
          text: "A quarter of the loops threw (2,583 of 10,000; 6,425 in the second run). The ones that didn't throw weren't necessarily correct either: a fail-fast iterator detects changes on a best-effort basis. Holding the monitor fixes it, at the price measured above: every writer waits for every loop. Copy-on-write removes the rule entirely, which is a large part of its appeal for code where the person writing the loop isn't the person who wrote the list.",
        },
      ],
    },
    {
      title: "Listener Lists",
      blocks: [
        {
          type: "paragraph",
          text: "The use case copy-on-write was designed for. An event bus holds listeners; events are published far more often than listeners change; and listeners sometimes register or unregister **during** an event, from inside their own callback. A one-shot listener that unsubscribes after the first trip ends, and a listener that registers another one during dispatch:",
        },
        {
          type: "code",
          language: "java",
          title: "TripEvents.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

public class TripEvents {
    // A tiny event bus: listeners register and unregister at any time, events are published often
    static class TripEventBus {
        private final List<Consumer<String>> listeners;
        TripEventBus(List<Consumer<String>> impl) { this.listeners = impl; }
        boolean register(Consumer<String> l) { return listeners.add(l); }
        void unregister(Consumer<String> l) { listeners.remove(l); }
        void publish(String event) {
            for (Consumer<String> l : listeners) l.accept(event);  // no lock held while calling out
        }
        int size() { return listeners.size(); }
    }

    static void scenario(String label, List<Consumer<String>> impl) {
        TripEventBus bus = new TripEventBus(impl);
        List<String> log = new ArrayList<>();
        bus.register(e -> log.add("receipts:" + e));
        AtomicReference<Consumer<String>> oneShot = new AtomicReference<>();
        oneShot.set(e -> {                                   // wants only the first TRIP_ENDED, then unsubscribes
            log.add("rating-prompt:" + e);
            bus.unregister(oneShot.get());
        });
        bus.register(oneShot.get());
        bus.register(e -> {
            log.add("payouts:" + e);
            if (e.equals("T1")) bus.register(x -> log.add("late-listener:" + x));   // added during dispatch
        });
        try {
            bus.publish("T1");
            bus.publish("T2");
            System.out.printf("%-20s %s, %d listeners now%n", label, log, bus.size());
        } catch (RuntimeException ex) {
            System.out.printf("%-20s %s after %s%n", label, ex.getClass().getSimpleName(), log);
        }
    }

    public static void main(String[] args) {
        scenario("ArrayList", new ArrayList<>());
        scenario("CopyOnWriteArrayList", new CopyOnWriteArrayList<>());
    }
}`,
        },
        {
          type: "output",
          text: `ArrayList            [receipts:T1, rating-prompt:T1, receipts:T2, payouts:T2], 2 listeners now
CopyOnWriteArrayList [receipts:T1, rating-prompt:T1, payouts:T1, receipts:T2, payouts:T2, late-listener:T2], 3 listeners now`,
        },
        {
          type: "list",
          items: [
            "**With `ArrayList`, the `payouts` listener silently missed `T1`.** No exception at all. The one-shot listener removed itself while the loop was at index 1 of 3; the list shrank to 2, the iterator's cursor was 2, and `hasNext()` (which is `cursor != size`) returned `false`. The loop ended early, and because `payouts` never saw `T1`, the late listener was never registered either. A missed payout event with no error is worse than a crash.",
            "**With `CopyOnWriteArrayList`, every listener present at publish time saw the event.** `payouts:T1` ran, the one-shot listener was gone for `T2`, and the listener registered during `T1` didn't see `T1` (it wasn't in the snapshot) but did see `T2`. Those are exactly the semantics an event bus wants.",
            "**No lock is held while calling listeners.** With `synchronizedList`, dispatch would have to hold the list's monitor while calling out to arbitrary code, a classic deadlock setup (a listener that takes another lock while some thread holding that lock tries to register). The snapshot makes \"never call alien code under a lock\" automatic.",
          ],
        },
        {
          type: "paragraph",
          text: "Whether an `ArrayList` throws or silently skips depends on where the removal happens. Removing during a for-each loop over four elements, at each position in turn:",
        },
        {
          type: "code",
          language: "java",
          title: "RemoveDuringLoop.java",
          code: `import java.util.*;
public class RemoveDuringLoop { public static void main(String[] a){ for(int pos=0;pos<4;pos++){ List<Integer> l=new ArrayList<>(List.of(0,1,2,3)); int seen=0; try{ for(int x: l){ seen++; if(x==pos) l.remove((Integer)x);} System.out.println("remove at "+pos+": ok, visited "+seen);}catch(Exception e){System.out.println("remove at "+pos+": "+e.getClass().getSimpleName()+" after "+seen);} } } }`,
        },
        {
          type: "output",
          text: `remove at 0: ConcurrentModificationException after 1
remove at 1: ConcurrentModificationException after 2
remove at 2: ok, visited 3
remove at 3: ConcurrentModificationException after 4`,
        },
        {
          type: "paragraph",
          text: "Removing the second-to-last element is the one case that ends the loop quietly, skipping the last element. Every other position throws. A listener list built on `ArrayList` can pass every test where the self-removing listener happens to be elsewhere and lose events in production when the registration order changes.",
        },
      ],
    },
    {
      title: "Configuration Snapshots",
      blocks: [
        {
          type: "paragraph",
          text: "The second good fit: configuration that many threads read and one refresher replaces now and then. Here a refresher reloads the surge rules (four zones) 20,000 times while four fare-quote threads read them. Two refreshes edit a shared `CopyOnWriteArrayList` in place; the third builds a new immutable list and publishes it through one `volatile` field:",
        },
        {
          type: "code",
          language: "java",
          title: "SurgeConfig.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.LongAdder;

public class SurgeConfig {
    record SurgeRule(String zone, double cap) { }

    static List<SurgeRule> load(int version) {                 // what the config service returns
        List<SurgeRule> rules = new ArrayList<>();
        for (String z : List.of("SALT-LAKE", "NEW-TOWN", "HOWRAH", "PARK-STREET")) rules.add(new SurgeRule(z, 1.5 + version % 2 * 0.5));
        return rules;
    }

    // Version 1: refresh the shared list in place
    static final CopyOnWriteArrayList<SurgeRule> RULES = new CopyOnWriteArrayList<>(load(0));
    // Version 2: build aside, publish one immutable list through one volatile write
    static volatile List<SurgeRule> rules = List.copyOf(load(0));

    static void run(String label, Runnable refresh, java.util.function.Supplier<List<SurgeRule>> current) throws InterruptedException {
        AtomicBoolean stop = new AtomicBoolean();
        LongAdder lookups = new LongAdder(), empty = new LongAdder(), partial = new LongAdder();
        List<Thread> pricing = new ArrayList<>();
        for (int t = 0; t < 4; t++) {
            pricing.add(Thread.ofPlatform().start(() -> {
                while (!stop.get()) {
                    int n = current.get().size();                 // a fare quote reads the rules
                    lookups.increment();
                    if (n == 0) empty.increment();
                    else if (n < 4) partial.increment();
                }
            }));
        }
        Thread refresher = Thread.ofPlatform().start(() -> {
            for (int i = 0; i < 20_000; i++) refresh.run();
        });
        refresher.join();
        stop.set(true);
        for (Thread t : pricing) t.join();
        System.out.printf("%-34s %,12d quotes, %,8d saw no rules, %,6d saw some rules%n", label, lookups.sum(), empty.sum(), partial.sum());
    }

    public static void main(String[] args) throws Exception {
        int[] version = {0};
        run("COW list: clear() + addAll()", () -> {
            List<SurgeRule> fresh = load(++version[0]);
            RULES.clear();                                       // write 1: readers now see []
            RULES.addAll(fresh);                                 // write 2
        }, () -> RULES);
        run("COW list: removeIf + add one by one", () -> {
            List<SurgeRule> fresh = load(++version[0]);
            RULES.removeIf(r -> true);
            for (SurgeRule r : fresh) RULES.add(r);              // 4 more writes, 4 more copies
        }, () -> RULES);
        run("volatile List.copyOf(fresh)", () -> {
            rules = List.copyOf(load(++version[0]));             // one reference swap
        }, () -> rules);
    }
}`,
        },
        {
          type: "output",
          text: `COW list: clear() + addAll()            234,437 quotes,   65,533 saw no rules,      0 saw some rules
COW list: removeIf + add one by one    1,332,362 quotes,  114,707 saw no rules, 262,050 saw some rules
volatile List.copyOf(fresh)             287,776 quotes,        0 saw no rules,      0 saw some rules`,
        },
        {
          type: "list",
          items: [
            "**`clear()` then `addAll()` is two writes, and readers saw the gap:** 65,533 quotes found no surge rules at all (231,051 in the second run). In production that's fares quoted with no surge cap, during every reload. Every individual call was atomic and the list was never corrupt; it was just empty for a moment, which is a perfectly valid state between two writes.",
            "**Removing and adding one by one was worse:** readers also saw lists with one, two or three zones (262,050 partial reads, 337,421 in the second run), and every refresh paid five copies instead of two.",
            "**One reference swap had no gaps:** zero empty and zero partial reads in both runs. The new list is fully built before the `volatile` write publishes it, so readers see either the complete old list or the complete new one.",
            "**This is copy-on-write done by hand,** at the level of the whole configuration instead of one list. When a configuration change touches several things at once (rules and caps and zone names), put them in one immutable object and swap that. A `CopyOnWriteArrayList` is the right tool when the changes really are single-element: one listener added, one zone enabled.",
          ],
        },
      ],
    },
    {
      title: "Memory Churn and the Garbage Collector",
      blocks: [
        {
          type: "paragraph",
          text: "Every write leaves the old array behind as garbage. For a small list that's a few bytes of young-generation garbage, which the GC clears almost for free. For a big list, it's a big object. G1, the default collector, splits the heap into regions (1 MB each with a 512 MB heap), and any object of half a region or more is **humongous**: allocated in its own contiguous regions, outside the young generation. I wrote the same total number of bytes two ways: 2,000 writes to a million-element list, and 2,000,000 writes to a thousand-element list, with GC logging on:",
        },
        {
          type: "code",
          language: "java",
          title: "GcChurn.java",
          code: `import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class GcChurn {
    public static void main(String[] args) throws Exception {
        int size = Integer.parseInt(args[0]);
        int writes = Integer.parseInt(args[1]);
        List<Integer> init = new ArrayList<>(size);
        for (int i = 0; i < size; i++) init.add(i);
        CopyOnWriteArrayList<Integer> list = new CopyOnWriteArrayList<>(init);
        init = null;
        System.gc();

        com.sun.management.ThreadMXBean threads = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        long gcCount0 = 0, gcTime0 = 0;
        for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans()) { gcCount0 += gc.getCollectionCount(); gcTime0 += gc.getCollectionTime(); }
        long alloc0 = threads.getCurrentThreadAllocatedBytes();
        long t = System.nanoTime();

        Integer a = -1, b = -2;
        for (int w = 0; w < writes; w++) {
            int i = w % size;
            list.set(i, list.get(i) == a ? b : a);               // one location update = one full copy
        }

        double secs = (System.nanoTime() - t) / 1e9;
        long allocated = threads.getCurrentThreadAllocatedBytes() - alloc0;
        long gcCount = -gcCount0, gcTime = -gcTime0;
        for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans()) { gcCount += gc.getCollectionCount(); gcTime += gc.getCollectionTime(); }
        System.out.printf("%,d elements, %,d writes in %.2f s: allocated %,d MB (%,.0f MB/s), %d GCs, %d ms in GC%n",
                size, writes, secs, allocated >> 20, (allocated >> 20) / secs, gcCount, gcTime);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx512m -Xlog:gc:file=gc-big.log GcChurn.java 1000000 2000
java -Xmx512m -Xlog:gc:file=gc-small.log GcChurn.java 1000 2000000`,
        },
        {
          type: "output",
          text: `1,000,000 elements, 2,000 writes in 16.54 s: allocated 7,629 MB (461 MB/s), 114 GCs, 5457 ms in GC
1,000 elements, 2,000,000 writes in 2.33 s: allocated 7,659 MB (3,293 MB/s), 50 GCs, 189 ms in GC`,
        },
        {
          type: "paragraph",
          text: "The same 7.6 GB of garbage cost 189 ms of GC as small arrays and 5.5 seconds as big ones. Grouping the pauses in the two logs:",
        },
        {
          type: "output",
          text: `gc-big.log (1,000,000 elements)
  Pause Young (Concurrent Start) (G1 Humongous Allocation)   57
  Pause Young (Prepare Mixed) (G1 Humongous Allocation)      14
  Pause Full (G1 Compaction Pause)                           14   608 ms total, max 63.7 ms
  Pause Young, all kinds                                      71   4,805 ms total, max 471.2 ms
  Concurrent Mark Cycle                                       30
  Concurrent Undo Cycle                                       84

gc-small.log (1,000 elements)
  Pause Young (Normal) (G1 Evacuation Pause)                 50   190 ms total, max 11.4 ms

[3.463s][info][gc] GC(13) Pause Young (Prepare Mixed) (G1 Humongous Allocation) 500M->500M(508M) 22.038ms
[3.499s][info][gc] GC(14) Pause Full (G1 Compaction Pause) 500M->20M(74M) 35.939ms`,
        },
        {
          type: "list",
          items: [
            "**Every young collection in the big run was triggered by a humongous allocation.** Each 4,000,016-byte array took four 1 MB regions. Allocating humongous objects starts concurrent marking (`Concurrent Start`) once the heap passes a threshold, so the log is full of marking cycles that the small run never needed.",
            "**Young collections couldn't free the dead arrays.** The two lines at the bottom show the heap at 500 MB of a 508 MB maximum after a young pause freed nothing, and then a **full GC** compacting it from 500 MB to 20 MB. That happened 14 times in 16 seconds.",
            "**Why young GCs couldn't help:** G1 can reclaim a dead humongous object during a young pause (\"eager reclaim\"), but on JDK 21 only for primitive arrays. With `-Xlog:gc+humongous=debug`, every one of these regions was logged as `object size 4000016 ... reclaim candidate 0 type array 0`: an `Object[]` is not a \"type array\" (an array of primitives), so it must wait for a marking cycle or a full GC.",
            "**Pauses were long and the run slowed down.** The worst young pause was 471 ms (510 ms in a second run with 14 full GCs and 5.8 s of GC); the machine had little free memory, so part of that is the operating system, but the small-array run on the same machine never paused more than 11 ms. The 2,000 writes took 16.5 seconds (19.7 in the second run), far more than the 3 to 4 ms per copy measured earlier.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "A rule of thumb from these numbers",
          text: "Multiply the array size (16 + 4n bytes) by the write rate. Hundreds of kilobytes a second is noise. Hundreds of megabytes a second is a GC problem. Once a single array passes half a G1 region (512 KB, about 128,000 elements, with 1 MB regions; regions grow with the heap), every write is a humongous allocation and the GC behaviour changes completely.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `listeners.add(l)` on a list of three listeners while a dispatcher thread is halfway through iterating it:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**The dispatcher started its loop earlier.** `iterator()` called `getArray()`, a volatile read of `array`, which returned array A (length 3). It built a `COWIterator` holding A as `snapshot`, cursor 0. It has called `next()` once; cursor is 1. It holds no lock.",
            "**The registering thread calls `add(l)`.** It loads `lock` and executes `monitorenter`. If another writer holds the monitor, this thread goes `BLOCKED (on object monitor)` until it's released. The dispatcher is unaffected either way.",
            "**Inside the lock, it reads `array`:** still A. `len = 3`. `Arrays.copyOf(A, 4)` allocates array B of length 4 and copies the three references (the listeners themselves are not copied). It stores `l` at `B[3]`.",
            "**`setArray(B)`:** a volatile write. Everything the thread did before it (filling B, and anything it wrote before calling `add`) is now visible to any thread that later reads `array` and gets B.",
            "**`monitorexit`.** The next waiting writer, if any, can enter and will copy B, not A, so no write is lost.",
            "**The dispatcher calls `next()` again** and gets `A[1]`. It finishes the loop over A's three listeners; the new listener isn't called for this event. Its snapshot is the only remaining reference to A.",
            "**The next event's loop calls `iterator()`**, reads `array`, gets B, and calls all four listeners.",
            "**A becomes garbage** when the dispatcher's iterator goes out of scope. For a small list, it dies young and costs almost nothing. For an array of half a G1 region or more, it was allocated as a humongous object and waits for a marking cycle or a full GC.",
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
          title: "CowTour.java",
          code: `import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CopyOnWriteArraySet;

public class CowTour {
    public static void main(String[] args) {
        // 1. Build it in one go: one copy, not one per element
        CopyOnWriteArrayList<String> zones = new CopyOnWriteArrayList<>(List.of("SALT-LAKE", "NEW-TOWN"));

        // 2. Writes: each one takes the lock and copies the array
        zones.add("HOWRAH");
        zones.add(0, "PARK-STREET");
        System.out.println("addIfAbsent HOWRAH: " + zones.addIfAbsent("HOWRAH") + ", addIfAbsent DUMDUM: " + zones.addIfAbsent("DUMDUM"));
        System.out.println("addAllAbsent: " + zones.addAllAbsent(List.of("HOWRAH", "GARIA", "BEHALA")) + " added");
        zones.removeIf(z -> z.startsWith("B"));          // one copy for the whole removal
        System.out.println("zones: " + zones);

        // 3. Reads: no lock, no copy
        System.out.println("get(1)=" + zones.get(1) + ", contains GARIA=" + zones.contains("GARIA") + ", indexOf HOWRAH=" + zones.indexOf("HOWRAH"));

        // 4. Iterators are snapshots
        Iterator<String> it = zones.iterator();
        zones.clear();
        int n = 0;
        while (it.hasNext()) { it.next(); n++; }
        System.out.println("iterator made before clear() still saw " + n + " zones; list size now " + zones.size());

        // 5. Sequenced methods (Java 21)
        zones.addAll(List.of("A", "B", "C"));
        zones.addFirst("Z");
        System.out.println("getFirst=" + zones.getFirst() + ", getLast=" + zones.getLast() + ", reversed=" + zones.reversed());

        // 6. A set backed by a CopyOnWriteArrayList: insertion order, O(n) contains
        Set<String> onlineDrivers = new CopyOnWriteArraySet<>();
        System.out.println("add asha: " + onlineDrivers.add("asha") + ", add asha again: " + onlineDrivers.add("asha")
                + ", add ravi: " + onlineDrivers.add("ravi") + " -> " + onlineDrivers);

        // 7. Copying out
        Object[] arr = zones.toArray();
        List<String> frozen = List.copyOf(zones);
        System.out.println("toArray length " + arr.length + ", List.copyOf " + frozen + ", equals ArrayList: " + zones.equals(new java.util.ArrayList<>(frozen)));
    }
}`,
        },
        {
          type: "output",
          text: `addIfAbsent HOWRAH: false, addIfAbsent DUMDUM: true
addAllAbsent: 2 added
zones: [PARK-STREET, SALT-LAKE, NEW-TOWN, HOWRAH, DUMDUM, GARIA]
get(1)=SALT-LAKE, contains GARIA=true, indexOf HOWRAH=3
iterator made before clear() still saw 6 zones; list size now 0
getFirst=Z, getLast=C, reversed=[C, B, A, Z]
add asha: true, add asha again: false, add ravi: true -> [asha, ravi]
toArray length 4, List.copyOf [Z, A, B, C], equals ArrayList: true`,
        },
        {
          type: "table",
          headers: ["Method", "Cost", "Notes"],
          rows: [
            ["`get`, `size`, `isEmpty`", "O(1), no lock", "Each call reads `array` separately"],
            ["`contains`, `indexOf`", "O(n), no lock", "Linear scan with `equals`"],
            ["`iterator()`, `forEach`, `stream()`", "O(1) to create, no lock", "Snapshot; iterator write methods throw `UnsupportedOperationException`"],
            ["`add`, `set`, `remove(int)`", "O(n): lock + full copy", "`set` with the same reference skips the copy"],
            ["`remove(Object)`", "O(n) scan + copy", "Scans outside the lock, re-checks inside"],
            ["`addIfAbsent`", "O(n) scan, + copy if added", "The atomic check-then-act; `CopyOnWriteArraySet.add` uses it"],
            ["`addAll`, `removeIf`, `replaceAll`, `sort`, `clear`", "One copy for the whole operation", "Prefer these to loops of single writes"],
            ["`addAllAbsent(c)`", "O(n × c) scan + one copy", "Bulk `addIfAbsent`"],
            ["`subList`", "Live view", "Throws CME after any write to the list not made through the view"],
            ["`addFirst`, `addLast`, `removeFirst`, `removeLast`, `reversed()` (Java 21)", "Writes copy as usual", "`reversed()` is a view"],
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A pricing pipeline that ops can change while quotes are running",
        },
        {
          type: "code",
          language: "java",
          title: "FareChain.java",
          code: `import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.function.DoubleUnaryOperator;

public class FareChain {
    record Adjuster(String name, DoubleUnaryOperator op) { }

    // The pricing pipeline: ops can add or remove adjusters while quotes are being computed
    static final CopyOnWriteArrayList<Adjuster> CHAIN = new CopyOnWriteArrayList<>(List.of(
            new Adjuster("base+distance", f -> f + 12 * 8.5),
            new Adjuster("surge x1.4", f -> f * 1.4)));

    static String quote(CountDownLatch midway, CountDownLatch resume) throws InterruptedException {
        double fare = 50;
        StringBuilder applied = new StringBuilder();
        int step = 0;
        for (Adjuster a : CHAIN) {                         // one snapshot for the whole quote
            fare = a.op().applyAsDouble(fare);
            applied.append(a.name()).append(" -> ");
            if (step++ == 0 && midway != null) { midway.countDown(); resume.await(); }   // pause after step 1
        }
        return String.format("%s%.2f", applied, fare);
    }

    public static void main(String[] args) throws Exception {
        CountDownLatch midway = new CountDownLatch(1), resume = new CountDownLatch(1);
        String[] inFlight = new String[1];
        Thread q = Thread.ofPlatform().start(() -> {
            try { inFlight[0] = quote(midway, resume); } catch (InterruptedException e) { }
        });
        midway.await();                                    // the quote is halfway through the chain
        CHAIN.add(new Adjuster("festival +25", f -> f + 25));
        CHAIN.removeIf(a -> a.name().startsWith("surge")); // ops turn surge off at the same moment
        resume.countDown();
        q.join();
        System.out.println("quote in flight: " + inFlight[0]);
        System.out.println("next quote:      " + quote(null, null));
    }
}`,
        },
        {
          type: "output",
          text: `quote in flight: base+distance -> surge x1.4 -> 212.80
next quote:      base+distance -> festival +25 -> 177.00`,
        },
        {
          type: "paragraph",
          text: "A fare quote runs through a chain of adjusters. Ops added a festival surcharge and turned surge off while a quote was paused after its first step. The quote in flight finished with the chain it started with (base, then surge x1.4: 212.80), and the next quote used the new chain (base, then festival +25: 177.00). Neither saw a mix like \"surge and festival\" or \"no surge and no festival\". With a plain `ArrayList` the loop would have thrown CME or skipped an adjuster; with `synchronizedList` the ops change would have waited for every running quote. The snapshot is per loop, though: the two ops writes (`add` and `removeIf`) were separate, so a quote starting between them would have seen surge **and** festival. If two changes must appear together, publish them together.",
        },
        {
          type: "heading",
          text: "Example 2: Syncing a blocklist without gaps or a thousand copies",
        },
        {
          type: "code",
          language: "java",
          title: "BlocklistSync.java",
          code: `import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.LongAdder;

public class BlocklistSync {
    static Set<String> fromCompliance(int hour) {           // 2,000 blocked drivers; 5% change every hour
        Set<String> s = new HashSet<>();
        for (int i = 0; i < 2_000; i++) s.add("D" + (i + hour * 100));
        return s;
    }

    interface Sync { void apply(CopyOnWriteArraySet<String> blocked, Set<String> fresh); }

    static void run(String label, Sync sync) throws InterruptedException {
        CopyOnWriteArraySet<String> blocked = new CopyOnWriteArraySet<>(fromCompliance(0));
        AtomicBoolean stop = new AtomicBoolean();
        LongAdder checks = new LongAdder(), wronglyAllowed = new LongAdder();
        Thread matcher = Thread.ofPlatform().start(() -> {
            while (!stop.get()) {
                checks.increment();
                if (!blocked.contains("D1999")) wronglyAllowed.increment();   // blocked in every hour 0..10
            }
        });
        long t = System.nanoTime();
        for (int hour = 1; hour <= 10; hour++) sync.apply(blocked, fromCompliance(hour));
        double ms = (System.nanoTime() - t) / 1e6;
        stop.set(true);
        matcher.join();
        System.out.printf("%-30s 10 syncs in %7.1f ms, %,9d checks, %,7d let a blocked driver through, size %d%n",
                label, ms, checks.sum(), wronglyAllowed.sum(), blocked.size());
    }

    public static void main(String[] args) throws Exception {
        run("clear() + add() each", (blocked, fresh) -> {
            blocked.clear();
            for (String d : fresh) blocked.add(d);          // 2,000 writes, each an O(n) scan + copy
        });
        run("removeIf + addAll(fresh)", (blocked, fresh) -> {
            blocked.removeIf(d -> !fresh.contains(d));       // one copy
            blocked.addAll(fresh);                           // one copy, but 2,000 x 2,000 equals() calls
        });
        run("removeIf + addAll(only new)", (blocked, fresh) -> {
            Set<String> current = new HashSet<>(blocked);   // iterate one snapshot into a hash set
            Set<String> added = new HashSet<>(fresh);
            added.removeAll(current);                        // the ~100 new ids
            blocked.removeIf(d -> !fresh.contains(d));       // one copy
            blocked.addAll(added);                           // one copy, 100 x 2,000 equals() calls
        });
    }
}`,
        },
        {
          type: "output",
          text: `clear() + add() each           10 syncs in   535.9 ms,    72,966 checks,   2,221 let a blocked driver through, size 2000
removeIf + addAll(fresh)       10 syncs in   426.7 ms,   197,453 checks,       0 let a blocked driver through, size 2000
removeIf + addAll(only new)    10 syncs in    63.1 ms,    18,119 checks,       0 let a blocked driver through, size 2000`,
        },
        {
          type: "list",
          items: [
            "**Rebuilding with `clear()` and 2,000 `add()` calls let blocked drivers through:** 2,221 checks found driver `D1999` missing during the 10 syncs (5,429 in the second run), and each sync paid 2,001 writes, 2,000 of them with an O(n) scan and a copy,: 536 ms for ten syncs.",
            "**`removeIf` plus `addAll(fresh)` closed the gap** (0 in both runs) with two copies per sync, but it was still slow, 365 to 427 ms: `CopyOnWriteArraySet.addAll` is `addAllAbsent`, which checks each of the 2,000 candidates against the 2,000 current elements by scanning.",
            "**Computing the difference first cut it to 63 to 67 ms.** One iteration into a `HashSet`, a set difference to find the roughly 100 new ids, then `removeIf` and `addAll` of only those. Between the two writes the set briefly lacks the new ids (they become blocked a moment later), but no driver who stays blocked is ever missing. The general lesson: with copy-on-write, do the work outside, then make as few writes as possible.",
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
            ["Listeners, observers, callbacks, plugin chains", "`CopyOnWriteArrayList` (or `CopyOnWriteArraySet` to avoid double registration)", "`ArrayList` (skips or throws), `synchronizedList` (calls alien code under a lock)"],
            ["Small configuration read on every request, changed rarely", "An immutable object (`List.copyOf`, a record) behind a `volatile` field or `AtomicReference`", "Editing a shared list in place with several calls"],
            ["Small set of names/ids checked constantly, changed by an admin", "`CopyOnWriteArraySet` (up to a few hundred elements)", "`synchronizedSet` with iteration under the lock"],
            ["Frequently updated data (positions, sessions, counters)", "`ConcurrentHashMap`, `ConcurrentLinkedQueue` (next lesson)", "Any copy-on-write collection"],
            ["Large sets with frequent `add`/`contains`", "`ConcurrentHashMap.newKeySet()`", "`CopyOnWriteArraySet` (O(n) per operation)"],
            ["Readers need a consistent view of data that changes often", "A periodically published immutable snapshot built from a concurrent map", "Copying on every single write"],
            ["A list shared by threads that need `iterator.remove()` or index-based edits", "`synchronizedList` with explicit `synchronized (list)` blocks, or a lock", "Copy-on-write (its iterator can't write)"],
            ["Ordered concurrent data with range queries", "`ConcurrentSkipListMap`/`Set` (next lesson)", "Sorting a copy-on-write list on every change"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Using it for data that changes often",
        },
        {
          type: "paragraph",
          text: "The single biggest mistake. \"Thread-safe list, fast reads\" gets chosen for driver positions, active sessions or a cache, and every update copies the whole thing. At 100,000 elements a write took 41 to 57 microseconds and left 400 KB of garbage; at a million, 3 to 4 ms and 4 MB of humongous garbage. If writes are more than occasional, it's the wrong collection.",
        },
        {
          type: "heading",
          text: "Building or refreshing it one element at a time",
        },
        {
          type: "paragraph",
          text: "`for (x : source) cow.add(x)` is quadratic: 100,000 adds took 3.8 seconds against 3 ms for one constructor call. Build an ordinary collection first and pass it to the constructor, `addAll`, or a single `removeIf`.",
        },
        {
          type: "heading",
          text: "Check-then-act across two calls",
        },
        {
          type: "paragraph",
          text: "`if (!list.contains(x)) list.add(x)` produced up to 2,261 duplicates; use `addIfAbsent`. The same goes for `if (!list.isEmpty()) list.get(0)` and index loops (`IndexOutOfBoundsException` in 6 to 8% of rounds): each call may see a different array. Iterate, or take `toArray()` once.",
        },
        {
          type: "heading",
          text: "Replacing contents with clear() and addAll()",
        },
        {
          type: "paragraph",
          text: "Readers see the empty list in between (65,533 quotes with no surge rules). Build the new contents aside and swap one reference, or use one bulk write that computes the result inside the lock (`removeIf`, `replaceAll`).",
        },
        {
          type: "heading",
          text: "Calling iterator.remove()",
        },
        {
          type: "paragraph",
          text: "It always throws `UnsupportedOperationException`, as do the list iterator's `set` and `add`. Code ported from `ArrayList` compiles fine and fails at the first removal. Use `removeIf`, or `list.remove(x)` inside the loop.",
        },
        {
          type: "heading",
          text: "Holding on to a subList",
        },
        {
          type: "paragraph",
          text: "A sub-list is live, and any write to the parent from anywhere makes its next call throw `ConcurrentModificationException`. Copy it (`List.copyOf(list.subList(a, b))`) if it has to outlive the moment.",
        },
        {
          type: "heading",
          text: "Expecting the snapshot to include your own later writes",
        },
        {
          type: "paragraph",
          text: "A loop that adds to the list it's iterating doesn't see what it adds (the `meera` added mid-loop was not visited). That's the intended semantics, but code that appends work items to the list it's processing, expecting to reach them in the same loop, silently skips them. Use a queue for work lists.",
        },
        {
          type: "heading",
          text: "Mutable elements",
        },
        {
          type: "paragraph",
          text: "The list copies references, not objects. If a listener or rule object has mutable fields, a snapshot iterator still sees today's field values, and changing them from one thread while another reads them is an ordinary data race. Keep elements immutable (records are ideal), and change an element by `set`-ing a new one.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use copy-on-write only where reads outnumber writes by orders of magnitude and the collection is small: listeners, plugins, a handful of zones or rules.",
            "Estimate the garbage: (16 + 4n bytes) × writes per second. Keep each array well under half a G1 region (512 KB with 1 MB regions).",
            "Make elements immutable, and change an element by replacing it with `set`.",
            "Iterate with for-each, `forEach` or a stream; never with `size()` and `get(i)` while others write.",
            "Use `addIfAbsent`/`addAllAbsent` (or `CopyOnWriteArraySet`) for registration, never `contains` followed by `add`.",
            "Batch writes: construct from a collection, `addAll`, `removeIf`, `replaceAll`. Compute differences outside the list and write only what changed.",
            "When several changes must appear together, publish one immutable object through a `volatile` field or `AtomicReference` instead of editing a list in place.",
            "Call listeners from a snapshot and never under a lock; catch each listener's exceptions so one bad listener can't stop the others.",
            "In a thread dump, `BLOCKED` threads `waiting to lock (a java.lang.Object)` inside `CopyOnWriteArrayList` and a `RUNNABLE` one in `clone`/`Arrays.copyOf` mean too many writes; move that data to a concurrent map or queue.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Two more measurements. First, how much batching saves: changing 1,000 elements of a 10,000-element list with single writes against one bulk call, best of seven:",
        },
        {
          type: "code",
          language: "java",
          title: "BatchWrites.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class BatchWrites {
    static CopyOnWriteArrayList<Integer> fresh() {
        List<Integer> base = new ArrayList<>();
        for (int i = 0; i < 10_000; i++) base.add(i);
        return new CopyOnWriteArrayList<>(base);
    }

    interface Op { void apply(CopyOnWriteArrayList<Integer> l); }

    static void measure(String label, Op op) {
        double best = Double.MAX_VALUE;
        for (int rep = 0; rep < 7; rep++) {
            CopyOnWriteArrayList<Integer> l = fresh();
            long t = System.nanoTime();
            op.apply(l);
            best = Math.min(best, (System.nanoTime() - t) / 1e6);
        }
        System.out.printf("%-46s %8.2f ms%n", label, best);
    }

    public static void main(String[] args) {
        List<Integer> extra = new ArrayList<>();
        for (int i = 0; i < 1_000; i++) extra.add(-i);
        System.out.println("list of 10,000; change 1,000 elements, best of 7:");
        measure("add() x 1,000", l -> { for (Integer x : extra) l.add(x); });
        measure("addAll(1,000)", l -> l.addAll(extra));
        measure("remove(Object) x 1,000", l -> { for (int i = 0; i < 1_000; i++) l.remove(Integer.valueOf(i * 10)); });
        measure("removeIf(i % 10 == 0)", l -> l.removeIf(i -> i % 10 == 0));
        measure("set() x 1,000", l -> { for (int i = 0; i < 1_000; i++) l.set(i, -i - 1); });
        measure("replaceAll (all 10,000)", l -> l.replaceAll(i -> -i - 1));
    }
}`,
        },
        {
          type: "output",
          text: `list of 10,000; change 1,000 elements, best of 7:
add() x 1,000                                      7.65 ms
addAll(1,000)                                      0.01 ms
remove(Object) x 1,000                            14.58 ms
removeIf(i % 10 == 0)                              0.60 ms
set() x 1,000                                      7.40 ms
replaceAll (all 10,000)                            0.79 ms`,
        },
        {
          type: "list",
          items: [
            "**Bulk calls were about 9 to 700 times faster.** 1,000 `add()` calls copied the array 1,000 times (7.7 ms; 5.3 in the second run); `addAll` copied it once (0.01 ms). `remove(Object)` in a loop was the slowest, 9.5 to 14.6 ms, because each call also scans for the element; `removeIf` did the same removal in 0.3 to 0.6 ms. Even `replaceAll` over all 10,000 elements (0.7 to 0.8 ms) beat 1,000 single `set`s (6.1 to 7.4 ms).",
          ],
        },
        {
          type: "paragraph",
          text: "Second, whether reading a copy-on-write list costs anything compared with an unsynchronized `ArrayList`:",
        },
        {
          type: "code",
          language: "java",
          title: "IterCost.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class IterCost {
    static long iterate(List<Integer> l) { long s = 0; for (int x : l) s += x; return s; }
    static long forEach(List<Integer> l) { long[] s = {0}; l.forEach(x -> s[0] += x); return s[0]; }

    public static void main(String[] args) {
        List<Integer> base = new ArrayList<>();
        for (int i = 0; i < 10_000; i++) base.add(i);
        List<Integer> plain = new ArrayList<>(base);
        List<Integer> cow = new CopyOnWriteArrayList<>(base);
        long sink = 0;
        for (int round = 0; round < 5; round++) {
            double[] r = new double[4];
            List<List<Integer>> lists = List.of(plain, cow);
            for (int k = 0; k < 2; k++) {
                long t = System.nanoTime();
                for (int i = 0; i < 20_000; i++) sink += iterate(lists.get(k));
                r[k] = (System.nanoTime() - t) / 20_000.0 / 1_000;
                t = System.nanoTime();
                for (int i = 0; i < 20_000; i++) sink += forEach(lists.get(k));
                r[k + 2] = (System.nanoTime() - t) / 20_000.0 / 1_000;
            }
            System.out.printf("round %d, 10,000 elements: for-each loop ArrayList %.1f us, COW %.1f us; forEach() ArrayList %.1f us, COW %.1f us%n",
                    round, r[0], r[1], r[2], r[3]);
        }
        System.out.println(sink != 0);
    }
}`,
        },
        {
          type: "output",
          text: `round 0, 10,000 elements: for-each loop ArrayList 54.4 us, COW 98.3 us; forEach() ArrayList 26.1 us, COW 29.0 us
round 1, 10,000 elements: for-each loop ArrayList 38.0 us, COW 55.1 us; forEach() ArrayList 20.0 us, COW 15.2 us
round 2, 10,000 elements: for-each loop ArrayList 33.6 us, COW 58.4 us; forEach() ArrayList 15.5 us, COW 11.6 us
round 3, 10,000 elements: for-each loop ArrayList 33.9 us, COW 37.0 us; forEach() ArrayList 13.3 us, COW 10.7 us
round 4, 10,000 elements: for-each loop ArrayList 37.1 us, COW 60.1 us; forEach() ArrayList 17.9 us, COW 22.6 us
true`,
        },
        {
          type: "list",
          items: [
            "**Iteration is in the same range as `ArrayList`.** `forEach()`, which loops over the array directly, took 11 to 29 microseconds for both. The for-each loop through an iterator was noisier and sometimes slower for the copy-on-write list (37 to 98 against 34 to 54 microseconds in this run; in a second run's last round it was the other way round, 30.8 against 39.8). Both lists went through the same `iterate` method, so the JIT saw two iterator types at that call site, which can cost an extra type check per element; I wouldn't read more into a difference that changed sign between runs.",
            "**The real performance story is the write side:** 34 ns to 3.8 ms per write depending on size, writers fully serialised by one monitor, and GC cost that can turn into full collections for big arrays. Reads are as cheap as reads get.",
            "These are `System.nanoTime` measurements on an 8-core machine shared with other benchmarks (load average between 4 and 27 during the runs), not JMH. The ratios were stable between runs; the absolute numbers were not.",
          ],
        },
      ],
    },
    {
      title: "Copy-on-Write Collections in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend keeps every online driver's latest position in memory for the dispatch matcher, which scans it for drivers near each new ride request. In the pilot city, with 2,000 drivers, someone chose a `CopyOnWriteArrayList<Position>` with one slot per driver: the matcher scans it constantly, so \"fast lock-free reads\" sounded right, and location pings arrive only once every 4 seconds per driver. It worked for a year. On the evening of a festival in the largest city, online drivers passed 80,000. Pings (20,000 a second) started arriving at the matcher seconds late, riders were matched to drivers who had already driven away, and the GC log showed young collections back to back. I rebuilt it at 40,000 and 80,000 drivers, pinging every 4 seconds for 3 seconds, with four ingest threads, two matcher threads, and two alternatives:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverPings.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.LongAdder;

public class DriverPings {
    record Position(int driverId, double lat, double lng, long at) { }

    static final int DRIVERS = Integer.getInteger("drivers", 40_000);   // online drivers at peak
    static final int RATE = DRIVERS / 4;                                   // one ping per driver every 4 s
    static final int PINGS = RATE * 3;                                     // 3 seconds of pings
    static final int INGEST_THREADS = 4, MATCHERS = 2;

    interface Store {
        void update(Position p);                   // a driver's location ping
        int scanNearby(double lat, double lng);    // the matcher: count drivers within ~1 km
    }

    static void run(String label, Store store) throws Exception {
        com.sun.management.ThreadMXBean mx = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        AtomicBoolean stop = new AtomicBoolean();
        LongAdder scans = new LongAdder(), allocated = new LongAdder();
        java.util.concurrent.atomic.LongAccumulator lag = new java.util.concurrent.atomic.LongAccumulator(Math::max, 0);
        List<Thread> matchers = new ArrayList<>();
        for (int m = 0; m < MATCHERS; m++) {
            matchers.add(Thread.ofPlatform().start(() -> {
                while (!stop.get()) { store.scanNearby(22.57, 88.36); scans.increment(); }
            }));
        }
        long t0 = System.nanoTime();
        List<Thread> ingest = new ArrayList<>();
        for (int w = 0; w < INGEST_THREADS; w++) {
            int id = w;
            ingest.add(Thread.ofPlatform().start(() -> {
                long before = mx.getCurrentThreadAllocatedBytes();
                for (int k = id; k < PINGS; k += INGEST_THREADS) {
                    long due = t0 + k * 1_000_000_000L / RATE;              // when this ping arrives
                    while (System.nanoTime() < due) java.util.concurrent.locks.LockSupport.parkNanos(50_000);
                    lag.accumulate((System.nanoTime() - due) / 1_000_000);
                    int driver = (k * 7919) % DRIVERS;
                    store.update(new Position(driver, 22.5 + (k % 100) / 1000.0, 88.3 + (k % 70) / 1000.0, k));
                }
                allocated.add(mx.getCurrentThreadAllocatedBytes() - before);
            }));
        }
        for (Thread t : ingest) t.join();
        double secs = (System.nanoTime() - t0) / 1e9;
        stop.set(true);
        for (Thread t : matchers) t.join();
        System.out.printf("%-21s %,d pings due in 3 s, done in %5.2f s, worst ping lag %,5d ms, ingest allocated %,6d MB, %,6.0f matcher scans/s%n",
                label, PINGS, secs, lag.get(), allocated.sum() >> 20, scans.sum() / secs);
    }

    public static void main(String[] args) throws Exception {
        System.out.printf("%,d drivers, %,d pings/s%n", DRIVERS, RATE);
        List<Position> initial = new ArrayList<>();
        for (int d = 0; d < DRIVERS; d++) initial.add(new Position(d, 22.5, 88.3, 0));

        // What shipped: one list, slot i holds driver i
        CopyOnWriteArrayList<Position> list = new CopyOnWriteArrayList<>(initial);
        run("CopyOnWriteArrayList", new Store() {
            public void update(Position p) { list.set(p.driverId(), p); }            // copies 40,000 references
            public int scanNearby(double lat, double lng) {
                int n = 0;
                for (Position p : list) if (Math.abs(p.lat() - lat) < 0.01 && Math.abs(p.lng() - lng) < 0.01) n++;
                return n;
            }
        });

        // The fix: one entry per driver, updates touch one bin
        ConcurrentHashMap<Integer, Position> map = new ConcurrentHashMap<>();
        for (Position p : initial) map.put(p.driverId(), p);
        run("ConcurrentHashMap", new Store() {
            public void update(Position p) { map.put(p.driverId(), p); }
            public int scanNearby(double lat, double lng) {
                int n = 0;
                for (Position p : map.values()) if (Math.abs(p.lat() - lat) < 0.01 && Math.abs(p.lng() - lng) < 0.01) n++;
                return n;
            }
        });

        // The fix that shipped: map for writes, one immutable snapshot every 250 ms for the matcher
        ConcurrentHashMap<Integer, Position> live = new ConcurrentHashMap<>(map);
        AtomicReference<Position[]> snapshot = new AtomicReference<>(live.values().toArray(new Position[0]));
        AtomicBoolean done = new AtomicBoolean();
        Thread publisher = Thread.ofPlatform().daemon().start(() -> {
            while (!done.get()) {
                snapshot.set(live.values().toArray(new Position[0]));   // one copy per 250 ms, not per ping
                try { Thread.sleep(250); } catch (InterruptedException e) { return; }
            }
        });
        run("CHM + 250 ms snapshot", new Store() {
            public void update(Position p) { live.put(p.driverId(), p); }
            public int scanNearby(double lat, double lng) {
                int n = 0;
                for (Position p : snapshot.get()) if (Math.abs(p.lat() - lat) < 0.01 && Math.abs(p.lng() - lng) < 0.01) n++;
                return n;
            }
        });
        done.set(true);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx512m DriverPings.java
java -Xmx512m -Ddrivers=80000 DriverPings.java`,
        },
        {
          type: "output",
          text: `40,000 drivers, 10,000 pings/s
CopyOnWriteArrayList  30,000 pings due in 3 s, done in  3.00 s, worst ping lag     9 ms, ingest allocated  4,579 MB, 27,282 matcher scans/s
ConcurrentHashMap     30,000 pings due in 3 s, done in  3.00 s, worst ping lag     6 ms, ingest allocated      1 MB,  2,062 matcher scans/s
CHM + 250 ms snapshot 30,000 pings due in 3 s, done in  3.00 s, worst ping lag    12 ms, ingest allocated      1 MB,  5,791 matcher scans/s
80,000 drivers, 20,000 pings/s
CopyOnWriteArrayList  60,000 pings due in 3 s, done in  5.98 s, worst ping lag 3,025 ms, ingest allocated 18,313 MB,  1,344 matcher scans/s
ConcurrentHashMap     60,000 pings due in 3 s, done in  3.00 s, worst ping lag     8 ms, ingest allocated      3 MB,    824 matcher scans/s
CHM + 250 ms snapshot 60,000 pings due in 3 s, done in  3.00 s, worst ping lag     5 ms, ingest allocated      3 MB,  3,534 matcher scans/s`,
        },
        {
          type: "list",
          items: [
            "**At 40,000 drivers it just about kept up.** All 30,000 pings were applied within the 3 seconds, but the ingest threads allocated 4.6 GB doing it (each ping copied 160 KB) and the worst ping waited 9 ms in this run and 469 ms in an earlier one. A system running this close to the edge looks fine on a dashboard until the load grows.",
            "**At 80,000 drivers it fell behind.** Each ping now copied 320 KB, and with all writers serialised on one monitor, 20,000 copies a second was more than one thread at a time could do: 3 seconds of pings took 5.98 seconds to apply, the worst ping was **3 seconds late**, and the ingest threads allocated 18.3 GB. A second run took 4.03 seconds with a worst lag of 1.7 seconds. Adding ingest threads can't help: they just queue on the lock. With a GC log on, that run had 138 young collections, almost all in the copy-on-write phase (the other two allocated 3 MB each). Each array was 320 KB, under the 512 KB humongous threshold, so these were ordinary young pauses, just very many of them; at around 130,000 drivers every ping would have become a humongous allocation.",
            "**`ConcurrentHashMap` kept the lag at 3 to 8 ms** and allocated 1 to 3 MB, because a ping replaces one map entry. But its matcher was slower: scanning `values()` (a weakly consistent iterator over hash bins and nodes) did 824 to 2,062 scans a second against a contiguous array's much higher numbers. The trade is real: copy-on-write really does read fastest.",
            "**The fix that shipped kept both properties.** Pings go into the `ConcurrentHashMap`; a publisher thread copies `values()` into an array every 250 ms and publishes it through an `AtomicReference`; the matcher scans the array. That's copy-on-write with the copy **batched**: four copies a second instead of 20,000, positions at most 250 ms stale (pings arrive every 4 seconds anyway), lag of 5 to 12 ms, and matcher scans as fast as or faster than the plain map (3,534 against 824 at 80,000 drivers).",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from it:",
        },
        {
          type: "list",
          items: [
            "Copy-on-write cost scales with **size × write rate**, and both grow with the business. A choice that's right for 2,000 elements and a handful of writes can be wrong at 80,000 and 20,000 writes a second without a line of code changing. Write the expected size and write rate next to every `CopyOnWriteArrayList` field.",
            "Writers on a copy-on-write list are serialised and each one does O(n) work under the lock; throughput is capped at one copy at a time, whatever the thread count.",
            "When readers need an array-fast consistent view of data that changes often, separate the two: a concurrent map for writes, a snapshot published on a timer for reads.",
            "Monitor the age of data, not just throughput: ping lag (\"now minus ping time when applied\") would have alerted at 40,000 drivers, months before the festival.",
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
              question: "What is CopyOnWriteArrayList and when would you use it?",
              answer:
                "A thread-safe `List` where every write (add, set, remove) copies the whole backing array, changes the copy and publishes it through a `volatile` field, while reads use the current array with no lock. It suits lists that are read or iterated far more often than they change and are small: listener lists, plugin chains, small configuration. In my measurement with seven readers, it did about 13 million iterations a second against 1.7 to 3.4 million for `Collections.synchronizedList`.",
            },
            {
              question: "Can a CopyOnWriteArrayList iterator throw ConcurrentModificationException?",
              answer:
                "No. The iterator holds the array that was current when it was created (`COWIterator.snapshot`) and has no modification counter to check. It walks that snapshot to the end, never sees later writes, and never throws CME. In my test, a loop that added an element mid-iteration visited the original 3 elements and finished; a reader looping during 30,000 writes completed 1,973 iterations with no exception. The one exception in the class is `subList`, which is a live view and does throw CME.",
            },
            {
              question: "Why does iterator.remove() throw UnsupportedOperationException?",
              answer:
                "Because the iterator only has a snapshot array and a cursor; it has no reference to the list, so there's nothing to remove from, and modifying the snapshot would break the guarantee that it never changes. `remove`, `set` and `add` on a `COWIterator` each just throw. Use `list.removeIf(...)` or call `list.remove(x)` inside the loop, which the snapshot tolerates.",
            },
            {
              question: "What is CopyOnWriteArraySet?",
              answer:
                "A `Set` backed by a `CopyOnWriteArrayList` (its only field is `al`). `add` is `al.addIfAbsent(e)`, `contains` is a linear scan. It keeps insertion order and has snapshot iterators, but every operation is O(n): adding 30,000 ids twice took 1.3 to 1.4 seconds against 4 to 8 ms for `ConcurrentHashMap.newKeySet()`. Use it for small sets only.",
            },
            {
              question: "Is get() on a CopyOnWriteArrayList synchronized?",
              answer:
                "No. `get` reads the `volatile` `array` field and indexes into it: two bytecodes of real work, no lock, no CAS. It stayed at 3 ns whether the list had 10 or a million elements. The volatile read is what guarantees the reader sees a fully built array, since arrays are never modified after they're published.",
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
              question: "How do writes stay thread-safe if reads take no lock?",
              answer:
                "Writers serialise on `final transient Object lock` with `synchronized` (a `ReentrantLock` in Java 8). Inside the lock a writer reads the current array, copies it with `Arrays.copyOf` or `clone`, changes the copy, and publishes it with `setArray`, a volatile write. Published arrays are never modified, so readers holding any array see a consistent, immutable list, and the volatile write/read pair makes the copy's contents visible. Holding the lock during the copy means two writers can't both copy the same old array and lose an update.",
            },
            {
              question: "Why is `if (!list.contains(x)) list.add(x)` wrong on a CopyOnWriteArrayList, and what's the fix?",
              answer:
                "Each call is atomic, but the pair isn't: two threads can both run `contains` on the same array, both see `x` missing, and both add it. With four threads registering the same 2,000 ids, I got 264 to 2,261 duplicates. `addIfAbsent(x)` scans without the lock, then under the lock checks whether the array changed since the scan (a reference comparison) and re-checks if so, before adding: 0 duplicates in every run.",
            },
            {
              question: "How does a CopyOnWriteArrayList compare with Collections.synchronizedList?",
              answer:
                "`synchronizedList` locks every call, including reads, and requires the caller to hold its monitor while iterating; forgetting that threw CME in 2,583 to 6,425 of 10,000 loops in my test. Its writes are O(1). Copy-on-write reads take no lock and its iterators need none, but every write is O(n). With seven readers and one writer on a 50-element list, copy-on-write did about 13 M iterations a second against 1.7 to 3.4 M, and the `synchronizedList` writer got only 6 to 7 writes a second through, starved by the readers. With large lists or frequent writes, the comparison reverses.",
            },
            {
              question: "What does subList return, and how does it behave under concurrent writes?",
              answer:
                "A `COWSubList`: a live view with an `offset`, a `size` and an `expectedArray`. Every call compares the list's current array with `expectedArray` and throws `ConcurrentModificationException` if they differ. Writes through the view update `expectedArray` and keep it valid; a write to the list by anyone else invalidates it. In my test, one `queue.add` made the next `view.get(0)` throw. For a stable slice, copy it: `List.copyOf(list.subList(a, b))`.",
            },
            {
              question: "Why are copy-on-write lists a good fit for listener lists?",
              answer:
                "Events are dispatched far more often than listeners change; listeners may register or unregister from inside their own callback; and dispatch shouldn't hold a lock while calling unknown code. The snapshot iterator handles all three: no lock during dispatch, no CME, and every listener present when the event started gets it. In my test an `ArrayList` silently skipped the `payouts` listener when a one-shot listener removed itself, while the copy-on-write list delivered to everyone.",
            },
            {
              question: "How many times does `list.addAll(c)` copy the array, compared with adding the elements one by one?",
              answer:
                "Once. Bulk methods (`addAll`, `removeIf`, `replaceAll`, `sort`, `clear`, the copy constructor) take the lock once and build the new array in one go. Adding 1,000 elements one by one to a 10,000-element list took 5 to 8 ms; `addAll` took 0.01 ms. Building a 100,000-element list with `add()` in a loop took 3.8 seconds, because it copies 1 + 2 + ... + n references.",
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
              question: "What changed in CopyOnWriteArrayList's locking between Java 8 and Java 21, and how does it show up?",
              answer:
                "Java 5 to 8 used `final transient ReentrantLock lock`; since Java 9 it's `final transient Object lock` with `synchronized` blocks (`monitorenter`/`monitorexit` in `javap -c`). Waiting writers now appear in thread dumps as `BLOCKED (on object monitor)`, `waiting to lock <...> (a java.lang.Object)` inside `CopyOnWriteArrayList.set` or `add`, with `Locked ownable synchronizers: None`, instead of `WAITING (parking)` on a `ReentrantLock$NonfairSync`. On Java 21 specifically, a virtual thread blocked entering that monitor also pins its carrier thread (fixed in JDK 24 by JEP 491).",
            },
            {
              question: "Why does set() call setArray even when it doesn't copy?",
              answer:
                "`set` skips the clone when the new element is the same reference as the old one (`if_acmpeq` in the bytecode), but still writes the old array back to the volatile field. That volatile write preserves the memory-consistency guarantee of the class: actions before a `set` happen-before actions after a later read of the list, even when nothing changed. I saw the skip directly: setting the same interned string kept the array identity; an equal but distinct `String` produced a new array.",
            },
            {
              question: "What is the GC impact of a large CopyOnWriteArrayList that's written often?",
              answer:
                "Each write allocates 16 + 4n bytes (with compressed references) and makes the previous array garbage. Once an array is half a G1 region or more, it's a humongous object; on JDK 21 G1 can't eagerly reclaim humongous `Object[]` in young pauses (`-Xlog:gc+humongous=debug` showed `reclaim candidate 0 type array 0`), so they wait for marking or a full GC. Writing 7.6 GB as 2,000 copies of a 4 MB array caused 14 full GCs and 5.5 seconds of GC in my run, against 189 ms for the same bytes as 2 million small arrays.",
            },
            {
              question: "How does addIfAbsent avoid holding the lock during the scan in the common case?",
              answer:
                "It takes a snapshot and scans it without the lock; if the element is found, it returns `false` without ever locking. Only if it's missing does it lock and compare the current array with the snapshot by reference. If they're the same object, no writer intervened and it copies immediately. Otherwise it re-checks the overlapping prefix element by element (skipping identical references) and scans any new tail, then adds. So a registration that's already present costs a lock-free scan.",
            },
            {
              question: "Why can't you make a large, frequently written CopyOnWriteArrayList faster by adding writer threads?",
              answer:
                "All writes go through one monitor, and each does O(n) copying while holding it, so throughput is at most one copy at a time. More writers only add `BLOCKED` threads. In my driver-ping test, 80,000 elements and 20,000 writes a second needed more copy bandwidth than one thread at a time could provide: 3 seconds of pings took 4 to 6 seconds to apply with four ingest threads. The fix is a structure with O(1) writes that can proceed in parallel (`ConcurrentHashMap`), plus a periodically published snapshot if readers need an array.",
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
              question: "After a traffic spike, a dispatch service's GC log fills with 'G1 Humongous Allocation' pauses and occasional full GCs, though live heap after each full GC is only about 20 MB. CPU profiles show time in Arrays.copyOf under CopyOnWriteArrayList. What is going on and what do you change?",
              answer:
                "A large copy-on-write list is being written frequently. Each write allocates a new array; above half a G1 region these are humongous, and on JDK 21 dead humongous `Object[]` can't be eagerly reclaimed at young pauses, so the heap fills with dead arrays until marking or a full GC clears them (my reproduction went 500 MB to 20 MB in one full GC, 14 times in 16 seconds). Confirm with a thread dump (writers `BLOCKED` on a `java.lang.Object` inside `CopyOnWriteArrayList`, one `RUNNABLE` in `clone`/`Arrays.copyOf`) and estimate size × write rate. Change the data structure: a `ConcurrentHashMap` for updates, plus a periodically published immutable snapshot if readers need a fast array.",
            },
            {
              question: "Your trip-event bus uses an ArrayList of listeners guarded by nothing. In production, roughly one in a few thousand trips never generates a driver payout event, and there are no exceptions in the logs. What could be happening?",
              answer:
                "A listener is unregistering itself (or another one) during dispatch. With an `ArrayList`, removing the second-to-last element during a for-each loop doesn't throw: the cursor equals the new size, `hasNext()` returns `false`, and the last listener (payouts) is silently skipped for that event. Other positions throw CME, which may be caught and swallowed. My reproduction lost `payouts:T1` with no error. Switch the listener list to a `CopyOnWriteArrayList` (snapshot iteration, no lock while calling out), and isolate each listener call in its own try/catch.",
            },
            {
              question: "A fare service reloads surge rules from the config service every 30 seconds with rules.clear(); rules.addAll(fresh) on a CopyOnWriteArrayList. Finance reports a handful of quotes per day priced without the surge cap. Why, and what's the fix?",
              answer:
                "`clear()` and `addAll()` are two atomic writes, and between them the list is validly empty. Any quote that reads the rules in that window sees no cap. My reproduction saw 65,533 to 231,051 empty reads over 20,000 reloads. Build the new rules aside and publish one immutable list through a `volatile` field or `AtomicReference` (0 empty or partial reads in my test); or, if it must stay a list, compute the result inside one bulk write. And group anything that must change together into one object.",
            },
            {
              question: "A teammate replaced a synchronizedList with a CopyOnWriteArrayList to fix intermittent ConcurrentModificationExceptions, and now a nightly job that adds 200,000 records to it takes 20 minutes instead of seconds. Explain and fix.",
              answer:
                "The job adds records one at a time, and each `add` copies the entire array, so filling n elements copies about n²/2 references: quadratic. In my test, 100,000 adds took 3.8 seconds against 3 ms for building an `ArrayList` and passing it to the constructor; 200,000 would be about four times longer, and much worse if readers or GC compete. Fix the job to build the batch in an ordinary list and publish it with one `addAll` (or swap in a new list). And question the choice: a list that a nightly job fills with 200,000 records is not a copy-on-write workload; if the original problem was unlocked iteration, the fix was `synchronized (list)` around the loops.",
            },
            {
              question: "A code review shows `for (int i = 0; i < drivers.size(); i++) process(drivers.get(i));` over a CopyOnWriteArrayList that other threads modify. The author says it's safe because the list is thread-safe. Is it?",
              answer:
                "No. Each `size()` and `get(i)` call reads `array` separately, so `size()` can return 4 and `get(3)` run against a newer array of length 3. My test threw `IndexOutOfBoundsException` in 60,198 to 76,720 of a million rounds while another thread removed and re-added one driver; the for-each version threw 0 times. Use `for (Driver d : drivers)`, `drivers.forEach(...)`, or `Object[] snapshot = drivers.toArray()` once. Thread-safe methods don't make a sequence of calls atomic.",
            },
            {
              question: "A blocklist of 2,000 drivers in a CopyOnWriteArraySet is synced hourly by clearing it and re-adding each id. Security finds blocked drivers occasionally got trips right after the sync. What do you change?",
              answer:
                "The clear-and-re-add leaves a window where blocked drivers are missing from the set (2,221 to 5,429 checks let `D1999` through in my 10 simulated syncs), and it's also slow: 2,001 copies and 2,000 O(n) scans per sync. Compute the difference outside: remove the ids no longer blocked with one `removeIf`, add only the new ones with one `addAll`. No still-blocked driver is ever missing, and ten syncs took 63 to 67 ms instead of 536. If the list grows past a few thousand, use `ConcurrentHashMap.newKeySet()` or publish an immutable `Set.copyOf` snapshot.",
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
            "Create a `CopyOnWriteArrayList` of three strings, get an iterator, call `clear()`, then walk the iterator and print what it returns.",
            "On a fresh list of three strings, call `iterator().remove()`, then `list.listIterator().add(\"x\")`, then print the list.",
            "Make a list of `[\"a\", \"b\", \"c\", \"d\", \"e\"]`, take `subList(1, 3)`, call `list.set(0, \"A\")`, then print the sub-list.",
            "Add the same string to a `CopyOnWriteArraySet` twice and print both return values and `size()`.",
            "Run `WriteCost` with `-Xmx512m`, then change the benchmark to write the same `Integer` back and compare the 1,000,000-element line.",
            "Run `GcChurn 1000000 200` with `-Xlog:gc+humongous=debug` and look for `reclaim candidate` in the output; then try `GcChurn 100000 2000` and see whether the humongous lines disappear.",
            "Run `WritersInDump`, take two `jcmd` thread dumps a second apart, and see whether the writer inside `Object.clone` changes.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints all three strings, because the iterator holds the array from before `clear()`. Step 2 throws `UnsupportedOperationException` both times, and the list still has its three strings. Step 3 throws `ConcurrentModificationException` when printing the sub-list (its `toString` checks the array). Step 4 prints `true`, `false` and size 1. Step 5's same-reference version reports a few tens of nanoseconds at every size, because `set` skips the copy. Step 6 shows the 4 MB arrays as humongous with `reclaim candidate 0`; at 100,000 elements each array is 400,016 bytes, under half a 1 MB region, so no humongous lines appear and the GCs are ordinary young pauses. Step 7 may show a different writer holding the lock in each dump, but never two at once: writers take turns.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `FIELDS      volatile Object[] array   (length == size, never modified once published)
            final Object lock         (synchronized since Java 9; ReentrantLock in 8)

READ        get/contains/iterator: one volatile load, no lock    get = 3 ns at any size
WRITE       lock -> copyOf/clone -> change copy -> setArray -> unlock
            O(n): 34 ns (10) .. 433 ns (1k) .. 41 us (100k) .. 3.1 ms (1M)
            set() with the same reference: no copy
            add() in a loop = O(n^2): 100k adds 3.8 s vs 3 ms for one copy

ITERATOR    snapshot of one array: never CME, never sees later writes
            remove/set/add -> UnsupportedOperationException
            size()+get(i) = two arrays -> IndexOutOfBounds (60k/1M rounds)
SUBLIST     live view: any outside write -> CME   (copy it: List.copyOf)

ATOMICITY   contains+add -> 264..2,261 duplicates   addIfAbsent -> 0
            clear+addAll -> readers saw [] (65k)    swap one volatile ref -> 0
SET         CopyOnWriteArraySet = COW list; add = addIfAbsent = O(n)
            30k ids x2: 1.4 s vs 4 ms for ConcurrentHashMap.newKeySet()

VS LOCKS    7 readers: 13.5 M iter/s vs 1.7 M synchronizedList, 1.8 M RW lock
            synchronizedList writer starved: 7 writes/s vs 661

GC          garbage = (16 + 4n) bytes x writes/s
            >= half a G1 region -> humongous Object[], no eager reclaim on 21
            1M x 2,000 writes: 14 full GCs, 5.5 s GC (vs 189 ms small arrays)

USE FOR     listeners, plugin chains, small configs, small admin-edited sets
NOT FOR     positions, sessions, caches: map + periodic snapshot instead`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`CopyOnWriteArrayList` makes reads free by making writes expensive: one volatile array that's never modified, a lock that only writers take, and a full copy on every change. Snapshot iterators follow from that design: they can't throw CME, can't remove, and never see later writes.",
            "It's exactly right for small, rarely changed, constantly read lists (listeners, plugin chains, small configuration) and badly wrong for anything large or frequently written, where the O(n) copy, serialised writers and humongous garbage take over. Single calls are atomic, sequences of calls are not: use `addIfAbsent`, bulk writes, and one-reference swaps.",
            "Next comes ConcurrentLinkedQueue, ConcurrentLinkedDeque and ConcurrentSkipListMap: lock-free collections built from CAS on individual nodes instead of copies of the whole structure, where writes are cheap and many threads can change the collection at once, and the sorted skip list that gives concurrent code ordered maps and range queries.",
          ],
        },
      ],
    },
  ],
};
