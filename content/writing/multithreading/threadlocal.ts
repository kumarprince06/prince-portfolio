import type { Lesson } from "../types";

export const threadLocalLesson: Lesson = {
  slug: "threadlocal",
  date: "2026-11-14",
  title: "ThreadLocal, InheritableThreadLocal and Leaks in Pools",
  description:
    "Per-thread variables in Java, taken apart on JDK 21: the ThreadLocalMap that lives in each Thread rather than in the ThreadLocal, open addressing with linear probing, the 0x61c88647 golden-ratio hash that spread nine locals over sixteen slots without a collision, weak keys with strong values and the stale entry that kept a 1 MB array alive until a fourth set() happened to expunge it, withInitial and remove in finally, a rider context that bled into the next anonymous request on a pool thread, per-instance ThreadLocals that pinned 351 to 439 MB in four pool threads, a redeployed web app whose class loader could never be collected, InheritableThreadLocal copied once at thread creation (and wrong for every pooled task after the first), SimpleDateFormat shared across threads producing 251,516 wrong dates, MDC logging context that vanishes across an executor, 100,000 virtual threads creating 100,000 cached formatters, jdk.traceVirtualThreadLocals, ScopedValue as a preview in Java 21, and an audit log in a ride-hailing backend that blamed riders for 1,997 of 2,000 driver payouts.",
  tags: ["Multithreading", "ThreadLocal", "Memory Leaks", "JVM Internals"],
  sections: [
    {
      title: "What ThreadLocal Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Timeouts, Fallbacks, Fan-out and Choosing Executors, finished the CompletableFuture phase with a question it couldn't fully answer: when a request fans out across executors, how does the request's context (who the rider is, which trace it belongs to) travel with the work? Every tool so far has been about sharing data between threads safely. This lesson is about the opposite: data that each thread keeps **to itself**, so no sharing and no locking are needed at all.",
        },
        {
          type: "paragraph",
          text: "A `ThreadLocal<T>` is a variable with one independent value per thread. `RIDER.set(\"asha\")` on one thread and `RIDER.get()` on another returns that other thread's value, usually `null`. It's used for three things: **context** that would otherwise be passed through every method (the current user, a transaction, a trace ID for logging), **per-thread caches** of objects that aren't thread-safe or are expensive to create (`SimpleDateFormat`, buffers, `MessageDigest`), and per-thread state inside libraries (Spring's transaction synchronisation, Logback's MDC, Hibernate's current session).",
        },
        {
          type: "paragraph",
          text: "The catch is that a value lives as long as its **thread**, and in a server, threads are pooled and live for days. Forget to clear a value and it leaks: into the next request (a security bug), into memory (a heap problem), or across redeployments (a class loader leak). `InheritableThreadLocal` adds a second trap with pools, and virtual threads change the cost model completely. This lesson measures all of it on JDK 21, from the hash constant inside `ThreadLocalMap` to `ScopedValue`, the preview API designed to replace most uses of `ThreadLocal`.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "`ThreadLocal` and `InheritableThreadLocal` arrived in Java 1.2, written by Josh Bloch and Doug Lea, when servlet containers were starting to run every request on a pooled thread and needed somewhere to keep per-request state. The first implementation kept a synchronized map from `Thread` to value inside each `ThreadLocal`, which meant a lock on every access. By JDK 1.4 the design had been turned inside out into what's still there in JDK 21: each `Thread` holds a small custom hash table (`ThreadLocalMap`) whose keys are the `ThreadLocal` objects, so a lookup touches only the current thread's own data and needs no lock.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.2 (1998)", "`ThreadLocal`, `InheritableThreadLocal`", "Per-thread variables in the standard library"],
            ["JDK 1.3 / 1.4 (2000 to 2002)", "Storage moved into `Thread.threadLocals`; weak-keyed `ThreadLocalMap` with the `0x61c88647` hash increment", "No lock on `get`; the layout this lesson takes apart"],
            ["Java 5 (2004)", "Generics (`ThreadLocal<T>`); `remove()`", "Before `remove()` you could only `set(null)`, which keeps the entry"],
            ["Java 7 (2011)", "`ThreadLocalRandom`", "Per-thread random state, later kept in `Thread` fields, not a `ThreadLocal`"],
            ["Java 8 (2014)", "`ThreadLocal.withInitial(Supplier)`", "The lambda form of `initialValue()`"],
            ["Java 19 (2022)", "Virtual threads preview (JEP 425), with a builder option to forbid thread locals", "Thread locals become a cost question"],
            ["Java 20 (2023)", "`ScopedValue` incubator (JEP 429)", "Immutable, scoped per-thread values"],
            ["Java 21 (2023)", "Virtual threads final (JEP 444): thread locals always allowed; `jdk.traceVirtualThreadLocals`; `ScopedValue` preview (JEP 446)", "The JDK used in this lesson"],
            ["Java 25 (2025)", "`ScopedValue` final (JEP 506)", "The replacement becomes a standard API"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing company's call centre, where agents sit at desks and take calls one after another.",
        },
        {
          type: "list",
          items: [
            "**Each desk has its own drawer** (the thread's `ThreadLocalMap`). A label like \"current customer\" (the `ThreadLocal`) is the same printed label in every drawer, but each agent's drawer holds a different card behind it. Nobody needs to lock anything: you only ever open your own drawer.",
            "**`remove()` is clearing the drawer when the call ends.** Agents are reused (thread pools): the next call goes to the same desk. If the last agent left Asha's card in the drawer, the next caller, who never said who they are, gets treated as Asha.",
            "**`InheritableThreadLocal` is a new desk being set up by photocopying the drawer of whoever set it up.** That's useful once, and wrong for every call after it, because the photocopy is never redone.",
            "**A class loader leak is a contractor's card left in a drawer after the contractor's company has left the building.** The card names the company, the company's whole office stays rented, and the drawer belongs to a desk that never closes.",
            "**`ScopedValue` is a visitor badge issued for one meeting**: it's handed over at the door, can't be changed during the meeting, and is collected automatically when the meeting ends.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real drawer is either full or empty. A `ThreadLocalMap` entry can be half-dead: its label (the key) can be garbage-collected while the card (the value) is still in the drawer, taking up space until the agent happens to open a nearby drawer. That half-dead state is where most of the surprises in this lesson come from.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/threadlocal-map.svg",
          alt: "A Thread object named pool-1-thread-1 whose threadLocals field points to a ThreadLocalMap with an Entry array of 16 slots. Slots 0, 7 and 14 hold live entries; slot 6 holds a stale entry. A legend says hash 0x00000000 goes to slot 0, 0x61c88647 to slot 7, 0xc3910c8e to slot 14. Below, three cards. The live entry in slot 0 has key RIDER, held weakly, and value \"asha\", held strongly; because RIDER is a static final field the key never dies and only remove() clears the entry. The stale entry in slot 6 has a cleared key and a strongly held 1 MB byte array that stays until expungeStaleEntry runs. The third card shows the leaking reference chain: pool thread, threadLocals, table, Entry, value, the value's class, its class loader, every class. A bottom box lists the rules: slot equals hash AND table length minus one, each new ThreadLocal's hash adds 0x61c88647, collisions probe linearly, the table purges stale entries then doubles at two thirds full, and stale entries are expunged on a get miss, set, remove or rehash but never on a get hit.",
          caption: "The map belongs to the thread, not to the ThreadLocal. Keys are weak, values are strong, and nothing clears a value except remove(), the thread dying, or a lucky probe.",
        },
        {
          type: "heading",
          text: "Where the pieces live",
        },
        {
          type: "table",
          headers: ["Piece", "Field / class", "Holds", "Lifetime"],
          rows: [
            ["The variable", "`ThreadLocal<T>` with `final int threadLocalHashCode`", "Nothing per thread: it's only the key and the hash", "As long as something references it (usually a `static final` field)"],
            ["The map", "`Thread.threadLocals` (a `ThreadLocal.ThreadLocalMap`)", "`Entry[] table`, `size`, `threshold`", "Created on the thread's first `set`/`get`; dies with the thread"],
            ["Inherited map", "`Thread.inheritableThreadLocals`", "Entries of `InheritableThreadLocal`s, copied from the parent", "Copied once in the `Thread` constructor"],
            ["An entry", "`ThreadLocalMap.Entry extends WeakReference<ThreadLocal<?>>`", "Weak ref to the key, strong `Object value`", "Until `remove()`, expunging, or thread death"],
            ["Scoped binding (Java 21 preview)", "`Thread.scopedValueBindings`", "An immutable chain of `ScopedValue` bindings", "Exactly the `where(...).run(...)` call"],
          ],
        },
        {
          type: "heading",
          text: "The operations",
        },
        {
          type: "table",
          headers: ["Call", "What happens", "Cost and caveat"],
          rows: [
            ["`get()`", "Look up `currentThread().threadLocals` by this key; on a miss call `initialValue()` and **store** the result", "Even `get()` on a plain `ThreadLocal` inserts an entry (with `null`)"],
            ["`set(v)`", "Insert or replace in the current thread's map; may purge some stale entries and resize", "Never visible to other threads"],
            ["`remove()`", "Clear the key, null the value, expunge stale entries after it", "The only reliable way to release the value on a long-lived thread"],
            ["`withInitial(s)`", "A `ThreadLocal` whose `initialValue()` calls `s.get()`", "Runs once per thread, and again after each `remove()`"],
            ["`InheritableThreadLocal.childValue(p)`", "Called in the child's constructor to compute its copy", "Default returns the same object: a shallow copy"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The JDK classes, as `javap -p` sees them on JDK 21:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.lang.ThreadLocal 'java.lang.ThreadLocal$ThreadLocalMap' 'java.lang.ThreadLocal$ThreadLocalMap$Entry'
javap -p java.lang.Thread | grep -i -E "local|scoped"`,
        },
        {
          type: "output",
          text: `public class java.lang.ThreadLocal<T> {
  private static final boolean TRACE_VTHREAD_LOCALS;
  private final int threadLocalHashCode;
  private static final java.util.concurrent.atomic.AtomicInteger nextHashCode;
  private static final int HASH_INCREMENT;
  ...
  public T get();
  private T get(java.lang.Thread);
  private T setInitialValue(java.lang.Thread);
  public void set(T);
  public void remove();
  java.lang.ThreadLocal$ThreadLocalMap getMap(java.lang.Thread);
  static java.lang.ThreadLocal$ThreadLocalMap createInheritedMap(java.lang.ThreadLocal$ThreadLocalMap);
  T childValue(T);
  static void dumpStackIfVirtualThread();
  ...
}
class java.lang.ThreadLocal$ThreadLocalMap {
  private static final int INITIAL_CAPACITY;
  private java.lang.ThreadLocal$ThreadLocalMap$Entry[] table;
  private int size;
  private int threshold;
  private static int nextIndex(int, int);
  private java.lang.ThreadLocal$ThreadLocalMap$Entry getEntry(java.lang.ThreadLocal<?>);
  private java.lang.ThreadLocal$ThreadLocalMap$Entry getEntryAfterMiss(java.lang.ThreadLocal<?>, int, java.lang.ThreadLocal$ThreadLocalMap$Entry);
  private void set(java.lang.ThreadLocal<?>, java.lang.Object);
  private void remove(java.lang.ThreadLocal<?>);
  private void replaceStaleEntry(java.lang.ThreadLocal<?>, java.lang.Object, int);
  private int expungeStaleEntry(int);
  private boolean cleanSomeSlots(int, int);
  private void rehash();
  private void resize();
  private void expungeStaleEntries();
}
class java.lang.ThreadLocal$ThreadLocalMap$Entry extends java.lang.ref.WeakReference<java.lang.ThreadLocal<?>> {
  java.lang.Object value;
  java.lang.ThreadLocal$ThreadLocalMap$Entry(java.lang.ThreadLocal<?>, java.lang.Object);
}
  java.lang.ThreadLocal$ThreadLocalMap threadLocals;
  java.lang.ThreadLocal$ThreadLocalMap inheritableThreadLocals;
  private java.lang.Object scopedValueBindings;
  long threadLocalRandomSeed;
  int threadLocalRandomProbe;
  int threadLocalRandomSecondarySeed;`,
        },
        {
          type: "list",
          items: [
            "**A `ThreadLocal` holds no values at all.** Its only instance field is `threadLocalHashCode`. The values live in `Thread.threadLocals`, one map per thread, which is why a lookup needs no lock: only the owning thread ever touches its map.",
            "**`Entry` extends `WeakReference<ThreadLocal<?>>`** and adds a plain, strong `Object value`. The key can be collected; the value can't, while the entry is in the table.",
            "**`ThreadLocalRandom` doesn't use `ThreadLocal`.** Its seed and probe are dedicated fields in `Thread` (`threadLocalRandomSeed`, `threadLocalRandomProbe`), which is cheaper than a map lookup. `ConcurrentHashMap` and `LongAdder` use the same probe to pick a counter cell.",
            "**`scopedValueBindings`** is where `ScopedValue` (preview) keeps its bindings, a separate mechanism covered later.",
          ],
        },
        {
          type: "paragraph",
          text: "The hot paths in bytecode (`javap -c -p -constants java.lang.ThreadLocal`, trimmed):",
        },
        {
          type: "output",
          text: `  private static int nextHashCode();
       0: getstatic     #1    // Field nextHashCode:Ljava/util/concurrent/atomic/AtomicInteger;
       3: ldc           #7    // int 1640531527
       5: invokevirtual #8    // Method java/util/concurrent/atomic/AtomicInteger.getAndAdd:(I)I
       8: ireturn

  private T get(java.lang.Thread);
       2: invokevirtual #54   // Method getMap:(Ljava/lang/Thread;)Ljava/lang/ThreadLocal$ThreadLocalMap;
       7: ifnull        29
      12: invokevirtual #58   // Method java/lang/ThreadLocal$ThreadLocalMap.getEntry:(Ljava/lang/ThreadLocal;)...
      17: ifnull        29
      21: getfield      #64   // Field java/lang/ThreadLocal$ThreadLocalMap$Entry.value:Ljava/lang/Object;
      28: areturn
      31: invokevirtual #70   // Method setInitialValue:(Ljava/lang/Thread;)Ljava/lang/Object;
      34: areturn

  java.lang.ThreadLocal$ThreadLocalMap getMap(java.lang.Thread);
       1: getfield      #110  // Field java/lang/Thread.threadLocals:Ljava/lang/ThreadLocal$ThreadLocalMap;

  public void set(T);
       5: invokevirtual #101  // Method set:(Ljava/lang/Thread;Ljava/lang/Object;)V
       8: getstatic     #95   // Field TRACE_VTHREAD_LOCALS:Z
      11: ifeq          17
      14: invokestatic  #98   // Method dumpStackIfVirtualThread:()V

ThreadLocalMap.getEntry(ThreadLocal):
       1: getfield      #22   // Field java/lang/ThreadLocal.threadLocalHashCode:I
       5: getfield      #18   // Field table:[Ljava/lang/ThreadLocal$ThreadLocalMap$Entry;
       8: arraylength
       9: iconst_1
      10: isub
      11: iand
      18: aaload
      26: invokevirtual #50   // Method java/lang/ThreadLocal$ThreadLocalMap$Entry.refersTo:(Ljava/lang/Object;)Z
      38: invokevirtual #54   // Method getEntryAfterMiss:(...)`,
        },
        {
          type: "list",
          items: [
            "**The hash increment is 1640531527, which is `0x61c88647`.** Every new `ThreadLocal` gets the next multiple of it from a global `AtomicInteger`. The number is 2^32 divided by the golden ratio (2^32 x 0.6180339887 = 2654435769 = `0x9E3779B9`), negated modulo 2^32. Multiples of it, masked to a power of two, visit every slot before repeating: **Fibonacci hashing**. Consecutive `ThreadLocal`s therefore spread across the table instead of clustering.",
            "**`getEntry` is `hash & (table.length - 1)`, one array load and `refersTo`.** On a direct hit, that's the whole lookup. Only a miss (empty slot, another key, or a cleared key) goes to `getEntryAfterMiss`, which walks forward slot by slot (linear probing) and expunges stale entries it passes.",
            "**`get()` on a miss calls `setInitialValue`**, which stores the initial value. A plain `ThreadLocal` without `withInitial` stores `null`: reading a thread local you never set still creates an entry.",
            "**`set` checks `TRACE_VTHREAD_LOCALS`**, a static final boolean read from `-Djdk.traceVirtualThreadLocals`, used later in this lesson.",
            "Elsewhere in the class: the table starts at 16 slots (`bipush 16` in the constructor), `setThreshold` is `len * 2 / 3`, and `rehash` first expunges all stale entries, then doubles the table only if `size >= threshold - threshold / 4`.",
          ],
        },
        {
          type: "heading",
          text: "Watching the map with reflection",
        },
        {
          type: "paragraph",
          text: "`java.base` doesn't open `java.lang` to application code, so reading `Thread.threadLocals` needs `--add-opens java.base/java.lang=ALL-UNNAMED`. Without it, `setAccessible` throws `InaccessibleObjectException: ... module java.base does not \"opens java.lang\" to unnamed module`. With it, the program below prints each slot as `L` (live), `S` (stale: key collected) or `.` (empty). It runs on a fresh thread so the JDK's own thread locals on `main` don't get in the way.",
        },
        {
          type: "code",
          language: "java",
          title: "ThreadLocalMapPeek.java",
          code: `import java.lang.ref.WeakReference;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;

public class ThreadLocalMapPeek {
    static Field field(Class<?> c, String name) throws Exception {
        Field f = c.getDeclaredField(name);
        f.setAccessible(true);
        return f;
    }

    static final Field THREAD_LOCALS, TABLE, SIZE, THRESHOLD, VALUE, HASH;
    static {
        try {
            Class<?> map = Class.forName("java.lang.ThreadLocal$ThreadLocalMap");
            Class<?> entry = Class.forName("java.lang.ThreadLocal$ThreadLocalMap$Entry");
            THREAD_LOCALS = field(Thread.class, "threadLocals");
            TABLE = field(map, "table");
            SIZE = field(map, "size");
            THRESHOLD = field(map, "threshold");
            VALUE = field(entry, "value");
            HASH = field(ThreadLocal.class, "threadLocalHashCode");
        } catch (Exception e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    static void dump(String label) throws Exception {
        Object map = THREAD_LOCALS.get(Thread.currentThread());
        Object[] table = (Object[]) TABLE.get(map);
        int live = 0, stale = 0;
        StringBuilder slots = new StringBuilder();
        for (int i = 0; i < table.length; i++) {
            Object e = table[i];
            if (e == null) { slots.append('.'); continue; }
            boolean cleared = ((WeakReference<?>) e).get() == null;
            if (cleared) { stale++; slots.append('S'); } else { live++; slots.append('L'); }
        }
        System.out.printf("%-26s table=%d size=%d threshold=%d live=%d stale=%d  [%s]%n", label,
                table.length, SIZE.getInt(map), THRESHOLD.getInt(map), live, stale, slots);
    }

    public static void main(String[] args) throws Exception {
        Thread t = new Thread(() -> {
            try {
                List<ThreadLocal<String>> locals = new ArrayList<>();
                for (int i = 0; i < 9; i++) {
                    ThreadLocal<String> tl = new ThreadLocal<>();
                    int h = HASH.getInt(tl);
                    System.out.printf("local %d  hash=0x%08x  slot in 16 = %2d%n", i, h, h & 15);
                    tl.set("v" + i);
                    locals.add(tl);
                }
                dump("after 9 set()");

                ThreadLocal<String> tenth = new ThreadLocal<>();
                tenth.set("v9");
                locals.add(tenth);
                dump("after 10th set()");

                ThreadLocal<byte[]> big = new ThreadLocal<>();
                big.set(new byte[1 << 20]);
                big = null;                                   // drop the only strong ref to the key
                System.gc();
                dump("key collected by GC");
                Object map = THREAD_LOCALS.get(Thread.currentThread());
                for (Object e : (Object[]) TABLE.get(map)) {
                    if (e != null && ((WeakReference<?>) e).get() == null) {
                        System.out.println("stale entry still holds value: " + VALUE.get(e).getClass().getSimpleName()
                                + " of " + ((byte[]) VALUE.get(e)).length + " bytes");
                    }
                }
                for (int i = 0; i < locals.size(); i++) locals.get(i).get();      // hits: no cleanup
                dump("after 10 get() hits");
                locals.get(0).remove();                      // remove expunges from its slot onwards
                dump("after one remove()");
                for (int i = 0; i < 4; i++) {
                    ThreadLocal<String> extra = new ThreadLocal<>();
                    extra.set("x" + i);                      // set() runs cleanSomeSlots
                    locals.add(extra);
                    dump("new local, slot " + (HASH.getInt(extra) & 31));
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, "peek");
        t.start();
        t.join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac ThreadLocalMapPeek.java && java --add-opens java.base/java.lang=ALL-UNNAMED ThreadLocalMapPeek",
        },
        {
          type: "output",
          text: `local 0  hash=0x00000000  slot in 16 =  0
local 1  hash=0x61c88647  slot in 16 =  7
local 2  hash=0xc3910c8e  slot in 16 = 14
local 3  hash=0x255992d5  slot in 16 =  5
local 4  hash=0x8722191c  slot in 16 = 12
local 5  hash=0xe8ea9f63  slot in 16 =  3
local 6  hash=0x4ab325aa  slot in 16 = 10
local 7  hash=0xac7babf1  slot in 16 =  1
local 8  hash=0x0e443238  slot in 16 =  8
after 9 set()              table=16 size=9 threshold=10 live=9 stale=0  [LL.L.L.LL.L.L.L.]
after 10th set()           table=32 size=10 threshold=21 live=10 stale=0  [L..L...L..L...L..L...L..L...L..L]
key collected by GC        table=32 size=11 threshold=21 live=10 stale=1  [L..L..SL..L...L..L...L..L...L..L]
stale entry still holds value: byte[] of 1048576 bytes
after 10 get() hits        table=32 size=11 threshold=21 live=10 stale=1  [L..L..SL..L...L..L...L..L...L..L]
after one remove()         table=32 size=10 threshold=21 live=9 stale=1  [...L..SL..L...L..L...L..L...L..L]
new local, slot 13         table=32 size=11 threshold=21 live=10 stale=1  [...L..SL..L..LL..L...L..L...L..L]
new local, slot 20         table=32 size=12 threshold=21 live=11 stale=1  [...L..SL..L..LL..L..LL..L...L..L]
new local, slot 27         table=32 size=13 threshold=21 live=12 stale=1  [...L..SL..L..LL..L..LL..L..LL..L]
new local, slot 2          table=32 size=13 threshold=21 live=13 stale=0  [..LL...L..L..LL..L..LL..L..LL..L]`,
        },
        {
          type: "list",
          items: [
            "**The first `ThreadLocal` my program created had hash `0x00000000`.** The counter is global and starts at zero, so nothing in JDK startup had created a `ThreadLocal` before `main` ran. The output was identical across three runs.",
            "**Nine keys, nine different slots, no collisions**: 0, 7, 14, 5, 12, 3, 10, 1, 8. That's the golden-ratio increment at work: each step moves 7 slots (mod 16), and since 7 and 16 share no factor, all 16 slots are visited before any repeats. In a 32-slot table the sequence is 0, 7, 14, 21, 28, 3, 10, ...",
            "**The tenth `set` resized the table to 32.** The threshold for 16 slots is 10 (two thirds); reaching it triggered `rehash`, which found no stale entries to purge and doubled. The new threshold is 21.",
            "**A collected key leaves a stale entry holding a 1 MB value.** After `big = null` and `System.gc()`, slot 6 shows `S`: the `WeakReference` was cleared, but `value` still points to the `byte[1048576]`. Ten `get()` hits changed nothing: a direct hit never looks at other slots.",
            "**`remove()` didn't purge it either.** `remove` of the key in slot 0 runs `expungeStaleEntry(0)`, which walks forward only until the first empty slot (slot 1). Slot 6 was out of reach.",
            "**The fourth new `set()` did.** Inserting into slot 2 called `cleanSomeSlots`, which scans about log2(size) slots after the insertion point (3, 4, 5, 6), found the stale entry in slot 6 and expunged it: size stayed 13 with one entry added and one removed. Cleanup is **opportunistic**: it depends on which slots later operations happen to touch.",
          ],
        },
        {
          type: "heading",
          text: "Where inheritance happens",
        },
        {
          type: "paragraph",
          text: "`InheritableThreadLocal` values are copied in the `Thread` constructor, by the thread that **creates** the new thread (`javap -c -p java.lang.Thread`, the main constructor, trimmed):",
        },
        {
          type: "output",
          text: `  java.lang.Thread(java.lang.ThreadGroup, java.lang.String, int, java.lang.Runnable, long, java.security.AccessControlContext);
     237: iload_3                        // characteristics
     238: iconst_4                       // NO_INHERIT_THREAD_LOCALS
     239: iand
     240: ifne          290
     243: aload         8                // parent = Thread.currentThread()
     245: getfield      #229             // Field inheritableThreadLocals:Ljava/lang/ThreadLocal$ThreadLocalMap;
     257: invokevirtual #233             // Method java/lang/ThreadLocal$ThreadLocalMap.size:()I
     260: ifle          272
     266: invokestatic  #238             // Method java/lang/ThreadLocal.createInheritedMap:(...)
     269: putfield      #229             // Field inheritableThreadLocals:Ljava/lang/ThreadLocal$ThreadLocalMap;`,
        },
        {
          type: "paragraph",
          text: "The copy is made once, in the constructor, from `Thread.currentThread()`. The builder flag `inheritInheritableThreadLocals(false)` sets the `NO_INHERIT_THREAD_LOCALS` characteristic (the `iconst_4` bit) and skips it. Nothing ever copies again: not when the thread starts, and not when a pool hands it a new task. That one fact explains the pool bug later in the lesson.",
        },
      ],
    },
    {
      title: "Leaks in Thread Pools",
      blocks: [
        {
          type: "paragraph",
          text: "A thread pool reuses threads, so whatever a task leaves in a `ThreadLocal` is waiting for the next task on that thread. There are two kinds of leak: **stale context**, where the next task reads a value meant for someone else, and **retained memory**, where values nobody will read again stay reachable.",
        },
        {
          type: "heading",
          text: "Stale context: the next request becomes the previous rider",
        },
        {
          type: "code",
          language: "java",
          title: "RequestContextLeak.java",
          code: `import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class RequestContextLeak {
    record Request(String path, String authenticatedRider) { }

    static final ThreadLocal<String> RIDER = new ThreadLocal<>();

    static String fareEstimate(Request r) {
        String rider = RIDER.get();                      // deep in the service layer
        return rider == null ? "anonymous estimate" : "estimate with " + rider + "'s saved promo";
    }

    // What shipped: the filter sets the context only for logged-in riders, and never clears it
    static String handleBuggy(Request r) {
        if (r.authenticatedRider() != null) RIDER.set(r.authenticatedRider());
        return fareEstimate(r);
    }

    static String handleFixed(Request r) {
        if (r.authenticatedRider() != null) RIDER.set(r.authenticatedRider());
        try {
            return fareEstimate(r);
        } finally {
            RIDER.remove();                              // the thread goes back clean
        }
    }

    public static void main(String[] args) throws Exception {
        List<Request> requests = List.of(
                new Request("/estimate", "asha"), new Request("/estimate", "ravi"),
                new Request("/estimate", null), new Request("/estimate", null),
                new Request("/estimate", null), new Request("/estimate", "ravi"),
                new Request("/estimate", null));
        for (String mode : List.of("buggy", "fixed")) {
            System.out.println("--- " + mode);
            ExecutorService tomcat = Executors.newFixedThreadPool(2);
            for (Request r : requests) {
                String result = tomcat.submit(() -> Thread.currentThread().getName() + "  rider="
                        + r.authenticatedRider() + "  -> "
                        + (mode.equals("buggy") ? handleBuggy(r) : handleFixed(r))).get();
                System.out.println(result);
            }
            tomcat.shutdown();
        }
    }
}`,
        },
        {
          type: "output",
          text: `--- buggy
pool-1-thread-1  rider=asha  -> estimate with asha's saved promo
pool-1-thread-2  rider=ravi  -> estimate with ravi's saved promo
pool-1-thread-1  rider=null  -> estimate with asha's saved promo
pool-1-thread-2  rider=null  -> estimate with ravi's saved promo
pool-1-thread-2  rider=null  -> estimate with ravi's saved promo
pool-1-thread-2  rider=ravi  -> estimate with ravi's saved promo
pool-1-thread-2  rider=null  -> estimate with ravi's saved promo
--- fixed
pool-2-thread-1  rider=asha  -> estimate with asha's saved promo
pool-2-thread-2  rider=ravi  -> estimate with ravi's saved promo
pool-2-thread-1  rider=null  -> anonymous estimate
pool-2-thread-1  rider=null  -> anonymous estimate
pool-2-thread-2  rider=null  -> anonymous estimate
pool-2-thread-1  rider=ravi  -> estimate with ravi's saved promo
pool-2-thread-2  rider=null  -> anonymous estimate`,
        },
        {
          type: "list",
          items: [
            "**Every anonymous request got a logged-in rider's promo.** The third request ran on `pool-1-thread-1`, whose map still held `asha` from request one; the fourth ran on `thread-2` and got `ravi`. Which rider leaks depends only on which thread picks up the task, so in production it looks random.",
            "Which thread ran each task varied between runs (the fixed run above alternated differently from the buggy one), but every buggy run I did showed all four anonymous requests as somebody. With a pool of one thread, every anonymous request became `ravi`, the last rider to log in.",
            "**The fix is structural: set in a `try`, `remove()` in `finally`.** Then the thread leaves the request exactly as it found it, whether the handler returns or throws. A filter that sets context should be the same code that clears it.",
            "`set(null)` isn't a substitute: it leaves the entry (and the key's slot) in the map. `remove()` deletes the entry and runs `expungeStaleEntry` from its slot.",
          ],
        },
        {
          type: "heading",
          text: "Retained memory: a new ThreadLocal per object",
        },
        {
          type: "paragraph",
          text: "A `ThreadLocal` should almost always be `static final`: one key, one entry per thread. When it's an instance field, every new object creates a new key, and every thread that uses it gets a new entry. When the object becomes garbage, its key is only weakly reachable, so the entry goes stale, but the value stays until something expunges it.",
        },
        {
          type: "code",
          language: "java",
          title: "PerInstanceLocalLeak.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class PerInstanceLocalLeak {
    static final ThreadLocal<byte[]> SHARED = ThreadLocal.withInitial(() -> new byte[64 * 1024]);

    // A new calculator per request, each with its own ThreadLocal: a new map key every time
    static class FareCalculator {
        private final ThreadLocal<byte[]> scratch = ThreadLocal.withInitial(() -> new byte[64 * 1024]);
        long quote(int trip, boolean clean) {
            try {
                scratch.get()[trip % 1024] = 1;
                return 15_000 + trip % 500;
            } finally {
                if (clean) scratch.remove();
            }
        }
    }

    static long usedMb() {
        System.gc();
        return ManagementFactory.getMemoryMXBean().getHeapMemoryUsage().getUsed() >> 20;
    }

    static void histogram() throws Exception {
        Process p = new ProcessBuilder("jcmd", Long.toString(ProcessHandle.current().pid()), "GC.class_histogram")
                .redirectErrorStream(true).start();
        p.inputReader().lines().filter(l -> l.contains("ThreadLocalMap$Entry ") || l.contains(" [B "))
                .forEach(l -> System.out.println("    " + l.trim()));
        p.waitFor();
    }

    static void run(String mode, int requests) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        long before = usedMb();
        for (int i = 0; i < requests; i++) {
            int trip = i;
            pool.submit(() -> switch (mode) {
                case "static ThreadLocal" -> SHARED.get()[0] = 1;
                case "per-instance, no remove" -> new FareCalculator().quote(trip, false);
                default -> new FareCalculator().quote(trip, true);
            }).get();
        }
        System.out.printf("%-24s requests=%,6d  retained by 4 live pool threads: %4d MB%n", mode, requests, usedMb() - before);
        if (mode.equals("per-instance, no remove")) histogram();
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.MINUTES);           // dead threads take their maps with them
    }

    public static void main(String[] args) throws Exception {
        for (int n : new int[] {1_000, 10_000}) {
            run("static ThreadLocal", n);
            run("per-instance, no remove", n);
            run("per-instance, remove()", n);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java PerInstanceLocalLeak                 # default max heap: 1.9 GB on this machine",
        },
        {
          type: "output",
          text: `static ThreadLocal       requests= 1,000  retained by 4 live pool threads:    0 MB
per-instance, no remove  requests= 1,000  retained by 4 live pool threads:   15 MB
    1:         10505       15876728  [B (java.base@21.0.13.0.3)
    19:           235           7520  java.lang.ThreadLocal$ThreadLocalMap$Entry (java.base@21.0.13.0.3)
per-instance, remove()   requests= 1,000  retained by 4 live pool threads:    0 MB
static ThreadLocal       requests=10,000  retained by 4 live pool threads:    0 MB
per-instance, no remove  requests=10,000  retained by 4 live pool threads:  439 MB
    1:         17297      459926648  [B (java.base@21.0.13.0.3)
    3:          7009         224288  java.lang.ThreadLocal$ThreadLocalMap$Entry (java.base@21.0.13.0.3)
per-instance, remove()   requests=10,000  retained by 4 live pool threads:    0 MB`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m PerInstanceLocalLeak | grep \"no remove\"",
        },
        {
          type: "output",
          text: `per-instance, no remove  requests= 1,000  retained by 4 live pool threads:   12 MB
per-instance, no remove  requests=10,000  retained by 4 live pool threads:   42 MB`,
        },
        {
          type: "list",
          items: [
            "**A `static final` local retained nothing extra** (four 64 KB buffers, one per thread, rounds to 0 MB), and per-instance locals with `remove()` retained nothing.",
            "**Per-instance locals without `remove()` kept 439 MB alive in four threads** after 10,000 requests and a full GC. The histogram shows 7,009 `ThreadLocalMap$Entry` objects still in the four maps, and about 450 MB of `byte[]` reachable through them. Over three runs it was 351 to 439 MB.",
            "**The size depends on the GC, not on the code.** With a 256 MB heap the same run retained 19 to 54 MB over three runs. Weak keys are only cleared when a GC runs, and stale entries are only expunged when later `set`s happen to probe past them. A big heap means rare GCs, so thousands of not-yet-cleared keys pile up, and once traffic stops, nothing on those threads ever runs `set` again to clean them. That's why this kind of leak shows up as \"memory that depends on the heap size and never comes back\".",
            "**Shutting the pool down releases everything**: the next measurement started from 0 because the dead threads' maps became garbage with them. With an application server's request threads, which live as long as the server, that never happens.",
          ],
        },
      ],
    },
    {
      title: "Class Loader Leaks in Application Servers",
      blocks: [
        {
          type: "paragraph",
          text: "In Tomcat, Jetty or WildFly, each deployed application gets its own class loader, while the request threads belong to the container and survive redeployments. If application code leaves a value in a container thread's `ThreadLocal`, the reference chain is: container thread, `threadLocals`, `Entry`, the value, the value's `Class`, that class's `ClassLoader`, and from there **every class the application loaded and all their static fields**. The weak key doesn't help: in the usual case the `ThreadLocal` is itself a static field of an application class, so the value keeps its own key alive through that chain. Undeploying the app can't free any of it.",
        },
        {
          type: "code",
          language: "java",
          title: "RiderSession.java",
          code: `// Part of the "webapp": loaded by its own class loader, like a WAR in Tomcat
public class RiderSession {
    static final byte[] ROUTE_CACHE = new byte[50 * 1024 * 1024];   // a big static, to make the leak visible
    static final ThreadLocal<RiderSession> CURRENT = new ThreadLocal<>();

    final String rider;
    RiderSession(String rider) { this.rider = rider; }

    public static String handle(String rider, boolean cleanUp) {
        CURRENT.set(new RiderSession(rider));
        try {
            return "handled " + CURRENT.get().rider + " (" + ROUTE_CACHE.length / (1024 * 1024) + " MB cache)";
        } finally {
            if (cleanUp) CURRENT.remove();
        }
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "UndeployLeak.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.ref.WeakReference;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class UndeployLeak {
    static long usedMb() {
        System.gc();
        return ManagementFactory.getMemoryMXBean().getHeapMemoryUsage().getUsed() >> 20;
    }

    // Deploy the webapp, serve one request on a container thread, undeploy. Returns a weak ref to the loader.
    static WeakReference<ClassLoader> deployServeUndeploy(ExecutorService container, boolean cleanUp) throws Exception {
        URL classes = Path.of("webapp").toUri().toURL();
        URLClassLoader loader = new URLClassLoader(new URL[] {classes}, ClassLoader.getPlatformClassLoader());
        Class<?> app = loader.loadClass("RiderSession");
        Object reply = container.submit(() ->
                app.getMethod("handle", String.class, boolean.class).invoke(null, "asha", cleanUp)).get();
        System.out.println("  " + reply);
        loader.close();                                      // "undeploy"
        return new WeakReference<>(loader);
    }

    public static void main(String[] args) throws Exception {
        ExecutorService container = Executors.newFixedThreadPool(1);   // the container's worker outlives the app
        for (boolean cleanUp : new boolean[] {false, true}) {
            System.out.println(cleanUp ? "with remove() in finally:" : "without remove():");
            long base = usedMb();
            for (int redeploy = 1; redeploy <= 3; redeploy++) {
                WeakReference<ClassLoader> ref = deployServeUndeploy(container, cleanUp);
                long grown = usedMb() - base;                        // runs a GC first
                System.out.printf("  redeploy %d: old loader collected=%b, heap +%d MB%n",
                        redeploy, ref.get() == null, grown);
            }
        }
        container.shutdown();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `mkdir -p webapp && javac -d webapp RiderSession.java      # the app's classes, NOT on the classpath
javac UndeployLeak.java && java -Xmx512m UndeployLeak`,
        },
        {
          type: "output",
          text: `without remove():
  handled asha (50 MB cache)
  redeploy 1: old loader collected=false, heap +51 MB
  handled asha (50 MB cache)
  redeploy 2: old loader collected=false, heap +102 MB
  handled asha (50 MB cache)
  redeploy 3: old loader collected=false, heap +153 MB
with remove() in finally:
  handled asha (50 MB cache)
  redeploy 1: old loader collected=true, heap +0 MB
  handled asha (50 MB cache)
  redeploy 2: old loader collected=true, heap +0 MB
  handled asha (50 MB cache)
  redeploy 3: old loader collected=true, heap +0 MB`,
        },
        {
          type: "list",
          items: [
            "**Each redeploy without `remove()` leaked a whole application**: the loader was never collected, and the heap grew by its 50 MB static each time. In a real server it's also the Metaspace of every loaded class, which is how \"`OutOfMemoryError: Metaspace` after a few redeploys\" happens.",
            "**Why the weak key didn't help.** The entry's key is `RiderSession.CURRENT`, a static field. The entry's value is a `RiderSession`, whose class is `RiderSession`, whose static field is the key. The key is strongly reachable through its own value, so it's never cleared, and the entry is never even stale.",
            "**With `remove()` every loader was collected and the heap didn't grow.** (The second baseline is measured after the first phase, so its +0 MB means no further growth; the three leaked apps from the first phase were still there.)",
            "Tomcat checks for exactly this on undeploy and logs `SEVERE: The web application [...] created a ThreadLocal with key of type [...] ... and a value of type [...] ... but failed to remove it when the web application was stopped`, then renews its worker threads to cut the chain. In a heap dump, the path to GC roots for a leaked `WebappClassLoader` goes through `Thread.threadLocals`.",
          ],
        },
      ],
    },
    {
      title: "InheritableThreadLocal",
      blocks: [
        {
          type: "paragraph",
          text: "`InheritableThreadLocal` copies the creating thread's values into a new thread. It's meant for a parent that starts a child to help with its own work. With pools, \"the creating thread\" is whichever task happened to make the pool start a worker.",
        },
        {
          type: "code",
          language: "java",
          title: "InheritableDemo.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class InheritableDemo {
    static final InheritableThreadLocal<String> TRACE = new InheritableThreadLocal<>();
    static final ThreadLocal<String> PLAIN = new ThreadLocal<>();
    static final InheritableThreadLocal<Map<String, String>> TAGS = new InheritableThreadLocal<>();

    static void show(String who) {
        System.out.printf("%-34s TRACE=%-8s PLAIN=%s%n", who, TRACE.get(), PLAIN.get());
    }

    public static void main(String[] args) throws Exception {
        // 1. copied once, when the child Thread object is created
        TRACE.set("trace-1");
        PLAIN.set("plain-1");
        Thread child = new Thread(() -> {
            sleep(100);
            show("child (parent changed meanwhile)");
        });
        TRACE.set("trace-2");                                     // after creation: child doesn't see it
        child.start();
        child.join();
        show("parent");

        // 2. the copy is shallow: a mutable value is shared
        TAGS.set(new HashMap<>(Map.of("zone", "SALT-LAKE")));
        Thread tagger = new Thread(() -> TAGS.get().put("zone", "NEW-TOWN"));
        tagger.start();
        tagger.join();
        System.out.println("parent's map after the child wrote to its copy: " + TAGS.get());

        // 3. pools: workers inherit from whichever thread happened to create them
        ExecutorService pool = Executors.newFixedThreadPool(1);
        for (String request : new String[] {"trace-A", "trace-B", "trace-C"}) {
            TRACE.set(request);                                       // the request thread's context
            pool.submit(() -> show("pool task for " + request)).get();
        }
        pool.shutdown();

        // 4. virtual threads inherit by default; the builder can turn it off
        TRACE.set("trace-V");
        Thread.ofVirtual().start(() -> show("virtual, default")).join();
        Thread.ofVirtual().inheritInheritableThreadLocals(false).start(() -> show("virtual, inherit=false")).join();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `child (parent changed meanwhile)   TRACE=trace-1  PLAIN=null
parent                             TRACE=trace-2  PLAIN=plain-1
parent's map after the child wrote to its copy: {zone=NEW-TOWN}
pool task for trace-A              TRACE=trace-A  PLAIN=null
pool task for trace-B              TRACE=trace-A  PLAIN=null
pool task for trace-C              TRACE=trace-A  PLAIN=null
virtual, default                   TRACE=trace-V  PLAIN=null
virtual, inherit=false             TRACE=null     PLAIN=null`,
        },
        {
          type: "list",
          items: [
            "**The copy is a snapshot from construction time.** The child was created while `TRACE` was `trace-1`; the parent's later `set(\"trace-2\")` never reached it. A plain `ThreadLocal` isn't copied at all.",
            "**The copy is shallow.** The child got the same `HashMap` object, and its `put` changed the parent's map. Override `childValue` to copy mutable values (the tour below does that).",
            "**In a pool, every task saw `trace-A`.** The worker thread was created by the first `submit`, from the main thread while it held `trace-A`, and inherited that value once. `trace-B` and `trace-C` tasks ran on the same worker and read the stale copy. This is the general rule: `InheritableThreadLocal` and thread pools don't mix, because pool threads are created at unpredictable moments by unrelated callers and then reused.",
            "**Virtual threads inherit by default**, and `Thread.ofVirtual().inheritInheritableThreadLocals(false)` turns it off. With `newVirtualThreadPerTaskExecutor()` instead of the pool, each task got its own request's trace (I checked: A, B, C), because each task gets a new thread created by the submitting thread.",
            "The usual fix for pools is to stop relying on thread creation and **capture context at submit time**, then install it around the task: the decorator in the MDC example below, Spring's `TaskDecorator`, or Alibaba's TransmittableThreadLocal library, which does this for executors automatically.",
          ],
        },
      ],
    },
    {
      title: "ThreadLocal with Virtual Threads",
      blocks: [
        {
          type: "paragraph",
          text: "Virtual threads support `ThreadLocal` fully: `getMap` reads `Thread.currentThread().threadLocals`, and for a virtual thread that's the virtual thread's own map, not the carrier's. What changes is the arithmetic. A per-thread cache assumes a few long-lived threads; with one virtual thread per task, every task is a new thread, so a \"cache\" fills once and is thrown away.",
        },
        {
          type: "code",
          language: "java",
          title: "VirtualThreadLocals.java",
          code: `import java.lang.management.ManagementFactory;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

public class VirtualThreadLocals {
    static final AtomicInteger CREATED = new AtomicInteger();
    static final ThreadLocal<SimpleDateFormat> FORMAT = ThreadLocal.withInitial(() -> {
        CREATED.incrementAndGet();
        return new SimpleDateFormat("yyyy-MM-dd HH:mm");
    });
    static final ThreadLocal<byte[]> BUFFER = new ThreadLocal<>();

    static long usedMb() {
        System.gc();
        return ManagementFactory.getMemoryMXBean().getHeapMemoryUsage().getUsed() >> 20;
    }

    static void formatTasks(String label, ExecutorService executor, int tasks) throws Exception {
        CREATED.set(0);
        try (executor) {
            for (int i = 0; i < tasks; i++) executor.submit(() -> FORMAT.get().format(new Date(0)));
        }                                                       // close() waits for all tasks
        System.out.printf("%-30s tasks=%,d  SimpleDateFormats created=%,d%n", label, tasks, CREATED.get());
    }

    // 100,000 parked virtual threads, with or without a 4 KB thread-local buffer each
    static void parkedThreads(boolean withLocal) throws Exception {
        long before = usedMb();
        CountDownLatch release = new CountDownLatch(1), started = new CountDownLatch(100_000);
        Thread[] threads = new Thread[100_000];
        for (int i = 0; i < threads.length; i++) {
            threads[i] = Thread.ofVirtual().start(() -> {
                if (withLocal) BUFFER.set(new byte[4096]);
                started.countDown();
                try { release.await(); } catch (InterruptedException e) { }
            });
        }
        started.await();
        System.out.printf("100,000 parked virtual threads, thread-local 4 KB buffer=%-5b heap +%d MB%n", withLocal, usedMb() - before);
        release.countDown();
        for (Thread t : threads) t.join();
    }

    public static void main(String[] args) throws Exception {
        formatTasks("fixed pool of 8 platform", Executors.newFixedThreadPool(8), 100_000);
        formatTasks("virtual thread per task", Executors.newVirtualThreadPerTaskExecutor(), 100_000);
        parkedThreads(false);
        parkedThreads(true);
    }
}`,
        },
        {
          type: "output",
          text: `fixed pool of 8 platform       tasks=100,000  SimpleDateFormats created=8
virtual thread per task        tasks=100,000  SimpleDateFormats created=100,000
100,000 parked virtual threads, thread-local 4 KB buffer=false heap +134 MB
100,000 parked virtual threads, thread-local 4 KB buffer=true  heap +494 MB`,
        },
        {
          type: "list",
          items: [
            "**The per-thread cache became a per-task allocation.** Eight pool threads created 8 formatters for 100,000 tasks; one virtual thread per task created 100,000, plus 100,000 thread-local maps to hold them. The \"optimisation\" made things worse than `new SimpleDateFormat` per call.",
            "**Thread-local values multiply by the thread count.** 100,000 parked virtual threads took 97 to 134 MB of heap on their own (over three runs), and 492 to 495 MB with a 4 KB buffer in a thread local each. The difference, 360 to 398 MB, is roughly 4 KB per thread: the buffer plus a `ThreadLocalMap`, its 16-slot table and one entry, which the noisy baseline makes hard to separate. Code written for 200 pool threads that holds a 4 KB buffer per thread is fine; the same code on a million virtual threads is 4 GB.",
            "JDK 19's preview let you forbid thread locals on a virtual thread (`allowSetThreadLocals(false)`); JEP 444 removed that option in Java 21 because too much existing library code depends on them. The new advice is to **find** them instead.",
          ],
        },
        {
          type: "heading",
          text: "Finding thread-local use: jdk.traceVirtualThreadLocals",
        },
        {
          type: "code",
          language: "java",
          title: "TraceLocals.java",
          code: `public class TraceLocals {
    static final ThreadLocal<StringBuilder> SCRATCH = new ThreadLocal<>();

    static String quote(String zone) {
        StringBuilder sb = SCRATCH.get();
        if (sb == null) {
            sb = new StringBuilder(256);
            SCRATCH.set(sb);                       // the line the trace points at
        }
        sb.setLength(0);
        return sb.append("quote for ").append(zone).toString();
    }

    public static void main(String[] args) throws Exception {
        Thread.ofVirtual().name("quote-vt").start(() -> System.out.println(quote("SALT-LAKE"))).join();
        System.out.println(quote("NEW-TOWN"));        // platform thread: not traced
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Djdk.traceVirtualThreadLocals=true TraceLocals",
        },
        {
          type: "output",
          text: `VirtualThread[#20,quote-vt]/runnable@ForkJoinPool-1-worker-1
    java.base/java.lang.ThreadLocal.setInitialValue(ThreadLocal.java:236)
    java.base/java.lang.ThreadLocal.get(ThreadLocal.java:194)
    java.base/java.lang.ThreadLocal.get(ThreadLocal.java:172)
    TraceLocals.quote(TraceLocals.java:5)
    TraceLocals.lambda$main$0(TraceLocals.java:15)
    java.base/java.lang.VirtualThread.run(VirtualThread.java:329)
VirtualThread[#20,quote-vt]/runnable@ForkJoinPool-1-worker-1
    java.base/java.lang.ThreadLocal.set(ThreadLocal.java:253)
    TraceLocals.quote(TraceLocals.java:8)
    TraceLocals.lambda$main$0(TraceLocals.java:15)
    java.base/java.lang.VirtualThread.run(VirtualThread.java:329)
quote for SALT-LAKE
quote for NEW-TOWN`,
        },
        {
          type: "list",
          items: [
            "Two stack traces for one virtual thread, none for the platform thread. **The first comes from `get()`**: on a miss, `get` calls `setInitialValue`, which stores `null`, and that store is traced too. Even reading an unset thread local writes to the map.",
            "The second is the explicit `set`. Running a test suite with this flag on virtual threads shows every library that keeps per-thread state, which is the list to review before moving a service to virtual threads.",
            "An empty value (`-Djdk.traceVirtualThreadLocals`) also turns it on; the check in `traceVirtualThreadLocals()` treats empty as true.",
          ],
        },
      ],
    },
    {
      title: "ScopedValue: the Replacement (Preview in Java 21)",
      blocks: [
        {
          type: "paragraph",
          text: "`ScopedValue` (JEP 446) is a **preview API in Java 21**: it must be compiled with `--release 21 --enable-preview` and run with `--enable-preview`, and the API may change (it became final, as JEP 506, in Java 25). It fixes the three structural problems of `ThreadLocal` for context passing: a binding is **immutable** (no `set`), it's **bounded** (it exists only during a `run` or `call`, so there's nothing to forget to remove), and it's **inherited cheaply** by the child threads of a `StructuredTaskScope` without copying a map.",
        },
        {
          type: "code",
          language: "java",
          title: "ScopedRider.java",
          code: `import java.util.NoSuchElementException;
import java.util.concurrent.StructuredTaskScope;

public class ScopedRider {
    static final ScopedValue<String> RIDER = ScopedValue.newInstance();

    static String fareEstimate() {
        return RIDER.isBound() ? "estimate with " + RIDER.get() + "'s saved promo" : "anonymous estimate";
    }

    public static void main(String[] args) throws Exception {
        ScopedValue.where(RIDER, "asha").run(() -> {
            System.out.println("inside where(asha):  " + fareEstimate());
            ScopedValue.where(RIDER, "ravi").run(() ->
                    System.out.println("nested where(ravi):  " + fareEstimate()));
            System.out.println("back in asha's scope: " + fareEstimate());
        });
        System.out.println("after the scope:     " + fareEstimate());
        try {
            RIDER.get();
        } catch (NoSuchElementException e) {
            System.out.println("RIDER.get() unbound: NoSuchElementException");
        }

        // child threads of a StructuredTaskScope see the binding; a plain new Thread does not
        ScopedValue.where(RIDER, "asha").run(() -> {
            try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
                var quote = scope.fork(ScopedRider::fareEstimate);
                scope.join().throwIfFailed();
                System.out.println("forked in scope:     " + quote.get());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
            Thread plain = Thread.ofVirtual().start(() -> System.out.println("plain virtual thread: " + fareEstimate()));
            try { plain.join(); } catch (InterruptedException e) { }
        });
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 21 --enable-preview ScopedRider.java    # Note: ScopedRider.java uses preview features of Java SE 21.
java --enable-preview ScopedRider`,
        },
        {
          type: "output",
          text: `inside where(asha):  estimate with asha's saved promo
nested where(ravi):  estimate with ravi's saved promo
back in asha's scope: estimate with asha's saved promo
after the scope:     anonymous estimate
RIDER.get() unbound: NoSuchElementException
forked in scope:     estimate with asha's saved promo
plain virtual thread: anonymous estimate`,
        },
        {
          type: "list",
          items: [
            "**Rebinding is nesting, not mutation.** The inner `where(RIDER, \"ravi\")` shadows the outer binding for its own `run`, and `asha` is back when it returns. There's no `set`, so a callee can't change what its caller sees.",
            "**Nothing to clean up.** After `run` returns, `RIDER` is unbound and `get()` throws `NoSuchElementException`. A pooled thread can't carry it into the next task, which removes the stale-context bug class entirely.",
            "**Inheritance is structured.** The subtask forked in a `StructuredTaskScope` saw `asha` (the scope captures the bindings when it's opened). A plain `Thread.ofVirtual().start` inside the same binding saw nothing: unlike `InheritableThreadLocal`, there's no implicit copy into arbitrary threads.",
            "Without `--enable-preview`, `javac` refuses: `error: ScopedValue is a preview API and is disabled by default.`",
            "`ScopedValue` is for context passed **down** a call tree. It isn't a replacement for a per-thread cache of mutable objects like a `SimpleDateFormat`: for those, the replacement is an immutable, thread-safe class (`DateTimeFormatter`) or a small pool.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `RIDER.set(\"asha\")`, `RIDER.get()` and `RIDER.remove()` on a pool thread that has never used a thread local:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Class initialisation.** `static final ThreadLocal<String> RIDER = new ThreadLocal<>()` runs once. The constructor field initialiser calls `nextHashCode()`: `AtomicInteger.getAndAdd(0x61c88647)`. `RIDER` gets the current counter value as its `threadLocalHashCode`, and the counter moves on.",
            "**`set(\"asha\")`.** `Thread.currentThread()` is the pool thread. `getMap(t)` reads `t.threadLocals`: `null`, so `createMap` builds a `ThreadLocalMap` with a 16-slot `Entry[]`, threshold 10, and puts `new Entry(RIDER, \"asha\")` at `hash & 15`. If `-Djdk.traceVirtualThreadLocals` were on and the thread were virtual, a stack trace would print now.",
            "**`get()`.** `getMap` returns the map; `getEntry` computes the same slot, loads the entry and checks `refersTo(RIDER)`. It's a hit, so `entry.value` (`\"asha\"`) is returned. No lock, no cleanup work.",
            "**Another `ThreadLocal` collides.** If a second local's hash lands on an occupied slot, `set` probes slot + 1, + 2, ... (wrapping) until it finds an empty slot, a stale entry it can reuse (`replaceStaleEntry`) or its own key. Then `cleanSomeSlots` scans about log2(n) slots for stale entries, and if none were removed and `size >= threshold`, `rehash` expunges all stale entries and doubles the table if it's still three quarters of the threshold.",
            "**`remove()`.** The map finds `RIDER`'s entry, calls `Reference.clear()` on it (key gone) and `expungeStaleEntry(slot)`: the value is nulled, the slot emptied, `size` decremented, and following entries up to the next empty slot are either expunged (if stale) or re-hashed closer to their ideal slot so probing keeps working.",
            "**The task ends and the thread returns to the pool** with nothing for `RIDER`. If step 5 is skipped, the entry stays with `\"asha\"`, and the next task's `RIDER.get()` returns it. If `RIDER` were an instance field whose owner is collected, the entry's key would be cleared at the next GC and the value would stay until some later `set`, `remove` or `get` miss on this thread probes past that slot.",
            "**The thread dies** (pool shutdown): `Thread.exit` calls `clearReferences()`, which sets `threadLocals` and `inheritableThreadLocals` to `null`, and the whole map becomes garbage. For a container's request threads this is the only automatic cleanup, and it may never come.",
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
          title: "ThreadLocalTour.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class ThreadLocalTour {
    static final AtomicInteger INITS = new AtomicInteger();

    // 1. plain: starts as null in every thread
    static final ThreadLocal<String> RIDER = new ThreadLocal<>();

    // 2. withInitial: the supplier runs once per thread, on the first get()
    static final ThreadLocal<StringBuilder> SCRATCH = ThreadLocal.withInitial(() -> {
        INITS.incrementAndGet();
        return new StringBuilder(64);
    });

    // 3. subclass form (pre-Java 8 style)
    static final ThreadLocal<List<String>> EVENTS = new ThreadLocal<>() {
        @Override protected List<String> initialValue() { return new ArrayList<>(); }
    };

    // 4. inheritable, with a defensive copy for the child
    static final InheritableThreadLocal<List<String>> TAGS = new InheritableThreadLocal<>() {
        @Override protected List<String> childValue(List<String> parent) { return new ArrayList<>(parent); }
    };

    public static void main(String[] args) throws Exception {
        System.out.println("1. " + RIDER.get());
        RIDER.set("asha");
        try {
            System.out.println("   " + RIDER.get());
        } finally {
            RIDER.remove();                                   // always, in finally
        }
        System.out.println("   after remove: " + RIDER.get());

        SCRATCH.get().append("SALT-LAKE");
        SCRATCH.get().append("/NEW-TOWN");                    // same builder: no second init
        System.out.println("2. " + SCRATCH.get() + "  inits=" + INITS.get());
        SCRATCH.remove();
        System.out.println("   after remove: '" + SCRATCH.get() + "'  inits=" + INITS.get());

        EVENTS.get().add("trip-accepted");
        Thread other = new Thread(() -> System.out.println("3. other thread sees " + EVENTS.get()));
        other.start();
        other.join();
        System.out.println("   main sees " + EVENTS.get());

        TAGS.set(new ArrayList<>(List.of("zone=SALT-LAKE")));
        Thread child = new Thread(() -> {
            TAGS.get().add("child-only");
            System.out.println("4. child " + TAGS.get());
        });
        child.start();
        child.join();
        System.out.println("   parent " + TAGS.get());
    }
}`,
        },
        {
          type: "output",
          text: `1. null
   asha
   after remove: null
2. SALT-LAKE/NEW-TOWN  inits=1
   after remove: ''  inits=2
3. other thread sees []
   main sees [trip-accepted]
4. child [zone=SALT-LAKE, child-only]
   parent [zone=SALT-LAKE]`,
        },
        {
          type: "paragraph",
          text: "`remove()` followed by `get()` runs the initial-value supplier again (`inits=2`), so `remove` resets rather than deletes for a `withInitial` local. The other thread got its own empty list from `initialValue()`. Overriding `childValue` gave the child its own copy, so `child-only` didn't leak back into the parent, unlike the shared `HashMap` in `InheritableDemo`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: SimpleDateFormat, the classic per-thread cache",
        },
        {
          type: "paragraph",
          text: "`SimpleDateFormat` keeps its parsing state in instance fields (a `Calendar` and a number formatter), so sharing one across threads corrupts results. Before Java 8, `ThreadLocal<SimpleDateFormat>` was the standard fix, and it's still all over older code bases:",
        },
        {
          type: "code",
          language: "java",
          title: "DateFormatPerThread.java",
          code: `import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

public class DateFormatPerThread {
    static final SimpleDateFormat SHARED = new SimpleDateFormat("yyyy-MM-dd");
    static final ThreadLocal<SimpleDateFormat> PER_THREAD =
            ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));
    static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");   // immutable

    static String viaSdf(SimpleDateFormat f, String s) {
        try {
            return f.format(f.parse(s));
        } catch (ParseException e) {
            throw new IllegalStateException(e);
        }
    }

    static void run(String label, Function<String, String> roundTrip) throws Exception {
        AtomicInteger wrong = new AtomicInteger(), thrown = new AtomicInteger();
        AtomicReference<String> sample = new AtomicReference<>(), error = new AtomicReference<>();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        long t0 = System.nanoTime();
        Future<?>[] fs = new Future<?>[8];
        for (int w = 0; w < 8; w++) {
            int worker = w;
            fs[w] = pool.submit(() -> {
                for (int i = 0; i < 50_000; i++) {
                    String in = String.format("2026-%02d-%02d", 1 + (worker + i) % 12, 1 + i % 28);
                    try {
                        String out = roundTrip.apply(in);
                        if (!out.equals(in) && wrong.incrementAndGet() == 1) sample.set(in + " -> " + out);
                    } catch (RuntimeException e) {
                        if (thrown.incrementAndGet() == 1) error.set(e.getClass().getSimpleName() + ": " + e.getMessage());
                    }
                }
            });
        }
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        System.out.printf("%-34s wrong=%,7d exceptions=%,6d  %4d ms%n", label, wrong.get(), thrown.get(),
                (System.nanoTime() - t0) / 1_000_000);
        if (sample.get() != null) System.out.println("    e.g. " + sample.get() + "   first exception: " + error.get());
    }

    public static void main(String[] args) throws Exception {
        for (int round = 0; round < 2; round++) {         // round 1 warms up; I quote round 2
            run("shared SimpleDateFormat", s -> viaSdf(SHARED, s));
            run("new SimpleDateFormat per call", s -> viaSdf(new SimpleDateFormat("yyyy-MM-dd"), s));
            run("ThreadLocal<SimpleDateFormat>", s -> viaSdf(PER_THREAD.get(), s));
            run("DateTimeFormatter (immutable)", s -> LocalDate.parse(s, ISO).format(ISO));
        }
    }
}`,
        },
        {
          type: "output",
          text: `shared SimpleDateFormat            wrong=251,516 exceptions=78,387   883 ms
    e.g. 2026-01-09 -> 2026-01-01   first exception: ClassCastException: class sun.util.calendar.Gregorian$Date cannot be cast to class sun.util.calendar.JulianCalendar$Date (...)
new SimpleDateFormat per call      wrong=      0 exceptions=     0   903 ms
ThreadLocal<SimpleDateFormat>      wrong=      0 exceptions=     0   577 ms
DateTimeFormatter (immutable)      wrong=      0 exceptions=     0   341 ms`,
        },
        {
          type: "list",
          items: [
            "**The shared formatter got 330,000 of 400,000 round trips wrong**: 251,516 silently wrong dates (`2026-01-09` came back as `2026-01-01`) and 78,387 exceptions. Over three runs it was 238,284 to 268,924 wrong and 50,698 to 100,708 exceptions, and the first exception varied: `ClassCastException` from inside the calendar code in some runs, `NumberFormatException: For input string: \"\"` in others. Silent wrong answers are the dangerous part.",
            "**`ThreadLocal<SimpleDateFormat>` was correct** and faster than creating a formatter per call (351 to 577 ms against 574 to 903 ms over three runs), because 8 pool threads created only 8 formatters.",
            "**`DateTimeFormatter` was correct and the fastest** (248 to 341 ms) with no thread local at all, because it's immutable and safe to share. That's the real fix: on Java 8 and later, a per-thread cache for a mutable formatter is a workaround for a class that should be replaced.",
            "Timings are single-machine `System.nanoTime` measurements under load from other processes, not JMH; the ordering was the same in every run.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: MDC logging context across an executor",
        },
        {
          type: "paragraph",
          text: "SLF4J's MDC (Mapped Diagnostic Context) is a per-thread `Map<String, String>` that the logging pattern can print (`%X{traceId}`). Logback's `LogbackMDCAdapter` keeps it in a `ThreadLocal`. Handing work to another thread loses it, because the other thread has its own map. A minimal MDC shows both the loss and the standard fix:",
        },
        {
          type: "code",
          language: "java",
          title: "MiniMdc.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MiniMdc {
    // What SLF4J's MDC does underneath: a per-thread map of strings
    static final ThreadLocal<Map<String, String>> MDC = ThreadLocal.withInitial(HashMap::new);

    static void log(String msg) {
        System.out.printf("%-16s %-32s %s%n", Thread.currentThread().getName(), MDC.get(), msg);
    }

    // Capture the submitter's context now; install it around the task; put the worker's own context back
    static Runnable withContext(Runnable task) {
        Map<String, String> captured = Map.copyOf(MDC.get());
        return () -> {
            Map<String, String> previous = MDC.get();
            MDC.set(new HashMap<>(captured));
            try {
                task.run();
            } finally {
                MDC.set(previous);
            }
        };
    }

    public static void main(String[] args) throws Exception {
        ExecutorService notifications = Executors.newSingleThreadExecutor(r -> new Thread(r, "notify-1"));
        Thread request = new Thread(() -> {
            MDC.get().put("traceId", "t-9f2c");
            MDC.get().put("rider", "asha");
            try {
                log("trip completed, fare 14500 paise");
                notifications.submit(() -> log("receipt sent (plain submit)")).get();
                notifications.submit(withContext(() -> log("receipt sent (withContext)"))).get();
            } catch (Exception e) {
                throw new RuntimeException(e);
            } finally {
                MDC.remove();
            }
        }, "http-nio-8080-1");
        request.start();
        request.join();
        notifications.submit(() -> log("next task on the worker")).get();
        notifications.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `http-nio-8080-1  {traceId=t-9f2c, rider=asha}     trip completed, fare 14500 paise
notify-1         {}                               receipt sent (plain submit)
notify-1         {traceId=t-9f2c, rider=asha}     receipt sent (withContext)
notify-1         {}                               next task on the worker`,
        },
        {
          type: "list",
          items: [
            "**A plain `submit` logged with an empty context**: the receipt line can't be found by searching for `t-9f2c`, which is exactly when you need it.",
            "**`withContext` captures a copy on the submitting thread** (`Map.copyOf` at wrap time, not at run time), installs it on the worker, and **restores the worker's previous map in `finally`**. The next task on `notify-1` saw `{}` again. With SLF4J the same decorator uses `MDC.getCopyOfContextMap()` and `MDC.setContextMap(...)`; Spring calls it a `TaskDecorator`.",
            "Capturing at submit time is what `InheritableThreadLocal` can't do: it copies at thread creation. The restore-in-`finally` half is the one people forget, and the production story below is what happens then.",
          ],
        },
      ],
    },
    {
      title: "When to Use What",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["Request context (user, tenant, trace) on platform threads", "`static final ThreadLocal`, set in a filter, `remove()` in `finally`", "Setting it in one place and hoping someone clears it"],
            ["Request context on Java 21 virtual threads / structured code", "`ScopedValue` (preview in 21, final in 25), or explicit parameters", "`InheritableThreadLocal`"],
            ["Context across an executor", "Capture at submit, install and restore around the task (decorator)", "`InheritableThreadLocal` with pools"],
            ["A non-thread-safe helper object", "An immutable replacement (`DateTimeFormatter`), or a local variable", "A shared instance; `ThreadLocal` caches on virtual threads"],
            ["An expensive per-thread buffer on a fixed pool", "`static final ThreadLocal` with a size cap", "Instance-field `ThreadLocal`s; huge buffers"],
            ["Random numbers in concurrent code", "`ThreadLocalRandom.current()`", "A shared `Random` (contended CAS), or `ThreadLocal<Random>`"],
            ["Logging context", "MDC with a context-propagating executor wrapper", "MDC set in one thread and expected in another"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Setting without remove() on a pooled thread",
        },
        {
          type: "paragraph",
          text: "The value outlives the request and the next task reads it: in `RequestContextLeak`, every anonymous request became a logged-in rider. Every `set` on a pooled thread needs a matching `remove()` in a `finally`, ideally in the same method.",
        },
        {
          type: "heading",
          text: "Using set(null) as cleanup",
        },
        {
          type: "paragraph",
          text: "`set(null)` keeps the entry and its slot, and for an instance-field `ThreadLocal` it keeps a key that will go stale. `remove()` deletes the entry and expunges after it.",
        },
        {
          type: "heading",
          text: "Declaring a ThreadLocal as an instance field",
        },
        {
          type: "paragraph",
          text: "Each instance is a new key, so each object adds an entry per thread that touches it, and the values stay until GC plus a lucky probe. `PerInstanceLocalLeak` retained 351 to 439 MB in four threads. Make it `static final`; if the value is genuinely per object and per thread, the design probably wants a map inside the object, not a thread local.",
        },
        {
          type: "heading",
          text: "Expecting InheritableThreadLocal to work with executors",
        },
        {
          type: "paragraph",
          text: "Pool threads inherit once, from whoever triggered their creation. All three tasks in `InheritableDemo` saw `trace-A`. Capture context explicitly at submit time instead.",
        },
        {
          type: "heading",
          text: "Propagating context without restoring the previous value",
        },
        {
          type: "paragraph",
          text: "A decorator that does `CONTEXT.set(captured); task.run();` leaves the captured value on the worker after the task, so any unwrapped task that runs there next inherits it. Save the previous value, and restore it (or `remove()` if there was none) in `finally`.",
        },
        {
          type: "heading",
          text: "Using ThreadLocal caches on virtual threads",
        },
        {
          type: "paragraph",
          text: "With one virtual thread per task, a per-thread cache is a per-task allocation plus a map: 100,000 tasks made 100,000 `SimpleDateFormat`s. Use immutable shared objects, or a bounded object pool if the object really is expensive.",
        },
        {
          type: "heading",
          text: "Storing large or mutable shared objects in a thread local",
        },
        {
          type: "paragraph",
          text: "A 4 KB buffer per thread is 400 MB at 100,000 virtual threads, and a mutable value handed to `InheritableThreadLocal` is shared with every child unless `childValue` copies it.",
        },
        {
          type: "heading",
          text: "Leaving application values in a container thread at undeploy",
        },
        {
          type: "paragraph",
          text: "A value whose class came from the web app's class loader keeps the whole application loaded: in `UndeployLeak`, three redeploys kept three copies. Clear thread locals in a `finally` at the request boundary, and treat Tomcat's \"failed to remove it when the web application was stopped\" warning as a bug, not noise.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Declare thread locals `private static final`, with a name that says what they hold, and expose them through a small class (`RequestContext.current()`, `RequestContext.runAs(...)`) so there's one place that sets and clears.",
            "Pair every `set` with `remove()` in `finally`, in the same method, at the boundary where the context starts (a servlet filter, a message listener, a scheduled job's run method).",
            "Prefer passing values as parameters when the call chain is short; use a thread local only for genuinely cross-cutting context.",
            "For executors, propagate context explicitly: capture at submit, install around the task, restore in `finally`. Wrap the executor once rather than every call site.",
            "Don't use `InheritableThreadLocal` with pools; with virtual threads, consider `inheritInheritableThreadLocals(false)` when inheritance isn't wanted.",
            "Replace per-thread caches of mutable helpers with immutable alternatives (`DateTimeFormatter`, `java.time`), especially before adopting virtual threads.",
            "Run tests with `-Djdk.traceVirtualThreadLocals=true` on virtual threads to find every library that sets thread locals.",
            "On Java 21, try `ScopedValue` for new context-passing code behind `--enable-preview` if your build allows previews; plan for it as the standard tool from Java 25.",
            "In heap dumps, check `Thread.threadLocals` paths when a class loader or a large object won't go away; in Tomcat, read the undeploy leak warnings.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "What does a `ThreadLocal.get()` actually cost? One loop per access style, so each call site stays monomorphic, best of seven runs of 50 million gets each:",
        },
        {
          type: "code",
          language: "java",
          title: "LocalCost.java",
          code: `public class LocalCost {
    record Ctx(int zone) { }
    static volatile Ctx field = new Ctx(7);                   // volatile: re-read every iteration
    static final ThreadLocal<Ctx> LOCAL = ThreadLocal.withInitial(() -> new Ctx(7));
    static final ScopedValue<Ctx> SCOPED = ScopedValue.newInstance();
    static final int N = 50_000_000;

    static long viaField()  { long s = 0; for (int i = 0; i < N; i++) s += field.zone(); return s; }
    static long viaLocal()  { long s = 0; for (int i = 0; i < N; i++) s += LOCAL.get().zone(); return s; }
    static long viaScoped() { long s = 0; for (int i = 0; i < N; i++) s += SCOPED.get().zone(); return s; }

    interface Loop { long run(); }

    static void time(String label, Loop loop) {
        long best = Long.MAX_VALUE, sink = 0;
        for (int r = 0; r < 7; r++) {
            long t = System.nanoTime();
            sink += loop.run();
            best = Math.min(best, System.nanoTime() - t);
        }
        System.out.printf("%-40s %5.2f ns/get%n", label, (double) best / N);
        if (sink == 42) System.out.println();
    }

    public static void main(String[] args) {
        time("volatile static field", LocalCost::viaField);
        time("ThreadLocal.get()", LocalCost::viaLocal);
        ScopedValue.where(SCOPED, new Ctx(7)).run(() -> time("ScopedValue.get() (preview)", LocalCost::viaScoped));
        for (int i = 0; i < 200; i++) new ThreadLocal<Integer>().set(i);     // 200 more entries in this thread's map
        time("ThreadLocal.get(), 200 other entries", LocalCost::viaLocal);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 21 --enable-preview LocalCost.java
java --enable-preview LocalCost`,
        },
        {
          type: "output",
          text: `volatile static field                     0.52 ns/get
ThreadLocal.get()                         2.35 ns/get
ScopedValue.get() (preview)               0.01 ns/get
ThreadLocal.get(), 200 other entries      1.82 ns/get`,
        },
        {
          type: "list",
          items: [
            "**`ThreadLocal.get()` cost about 2 ns** (1.77 to 2.35 ns over three runs): `currentThread()`, a field load, a masked index, an array load and a `refersTo` check. That's cheap enough that the cost of a thread local is almost never the lookup; it's the leaks and the memory.",
            "**200 other entries in the map made no consistent difference** (1.79 to 3.10 ns), because the golden-ratio hash keeps the key on its home slot most of the time.",
            "**`ScopedValue.get()` measured 0.01 ns, which isn't a real per-call cost**: it means the JIT moved the lookup out of the loop. It can, because a binding can't change during the `run`, so the value is loop-invariant. It can't do that for `ThreadLocal.get()`, because any call could `set` it. That hoisting is one of the reasons `ScopedValue` was designed to be immutable.",
            "The measurements that matter more came earlier in the lesson: 439 MB retained by per-instance locals, 100,000 formatters for 100,000 virtual-thread tasks, and a 4 KB thread-local buffer costing 360 to 398 MB across 100,000 virtual threads. All are single-machine numbers, not JMH, taken while other benchmarks were running.",
          ],
        },
      ],
    },
    {
      title: "ThreadLocal in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend writes an audit record for every ledger change: rider wallet debits, receipts, driver payouts, with an `actor` field for compliance. Request threads set `ACTOR` to the logged-in rider. Async work goes through a shared pool, and to keep the actor on receipts someone wrote a small decorator that copies `ACTOR` into the task. The nightly driver-payout job submits plain tasks to the same pool; with no actor set, the audit code records `system`. During an audit, finance found that most driver payouts were attributed to riders. I rebuilt it:",
        },
        {
          type: "code",
          language: "java",
          title: "AuditActorLeak.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class AuditActorLeak {
    static final ThreadLocal<String> ACTOR = new ThreadLocal<>();     // who is acting: a rider, or nobody

    // Every write to the ledger is audited with the current actor; background jobs should say "system"
    static final Map<String, AtomicInteger> AUDIT = new ConcurrentHashMap<>();
    static void audit(String action) {
        String actor = ACTOR.get() == null ? "system" : ACTOR.get();
        AUDIT.computeIfAbsent(action + " by " + (actor.equals("system") ? "system" : "a rider"),
                k -> new AtomicInteger()).incrementAndGet();
    }

    // Shipped version of the context-propagating decorator: sets, never restores
    static Runnable propagateBuggy(Runnable task) {
        String captured = ACTOR.get();
        return () -> {
            ACTOR.set(captured);
            task.run();
        };
    }

    static Runnable propagateFixed(Runnable task) {
        String captured = ACTOR.get();
        return () -> {
            String previous = ACTOR.get();
            if (captured == null) ACTOR.remove(); else ACTOR.set(captured);
            try {
                task.run();
            } finally {
                if (previous == null) ACTOR.remove(); else ACTOR.set(previous);
            }
        };
    }

    static void simulate(String label, boolean fixed) throws Exception {
        AUDIT.clear();
        ExecutorService async = Executors.newFixedThreadPool(4);
        List<String> riders = List.of("asha", "ravi", "meera", "farhan");
        for (int i = 0; i < 2_000; i++) {
            // a rider's request thread: completes a trip and hands the receipt to the async pool
            ACTOR.set(riders.get(i % riders.size()));
            Runnable receipt = () -> audit("receipt");
            async.execute(fixed ? propagateFixed(receipt) : propagateBuggy(receipt));
            ACTOR.remove();
            // the nightly payout job shares the pool and submits plain tasks: no rider involved
            async.execute(() -> audit("driver payout"));
        }
        async.shutdown();
        async.awaitTermination(1, TimeUnit.MINUTES);
        System.out.println(label + new java.util.TreeMap<>(AUDIT));
    }

    public static void main(String[] args) throws Exception {
        simulate("before: ", false);
        simulate("after:  ", true);
    }
}`,
        },
        {
          type: "output",
          text: `before: {driver payout by a rider=1997, driver payout by system=3, receipt by a rider=2000}
after:  {driver payout by system=2000, receipt by a rider=2000}`,
        },
        {
          type: "list",
          items: [
            "**1,997 of 2,000 payouts were attributed to a rider.** The buggy decorator set `ACTOR` on the worker and never restored it, so after the first receipt ran on a worker, that worker \"was\" a rider for every later plain task. Over four runs, 1,991 to 1,998 payouts were misattributed; the few correct ones ran on a worker before it had executed any receipt.",
            "**Receipts were right in both versions**, which is why tests that checked receipts passed. The bug was entirely in the code the decorator didn't wrap.",
            "**The fix is the restore.** `propagateFixed` saves the worker's previous value, installs the captured one (or removes it, if the submitter had none), and puts the previous value back in `finally`. After it: 2,000 payouts by `system`, 2,000 receipts by a rider.",
            "**What I'd check first in production.** Any decorator, interceptor or filter that calls `set` on a thread local: does it restore in `finally`? Then grep for executors that are shared between request-driven code and jobs, because that's where a leaked context meets code that never sets its own.",
            "**What prevents it next time.** Wrap the executor itself, so every task (wrapped intentionally or not) runs with exactly the submitter's context and leaves nothing behind; add a test that runs an unwrapped task after a wrapped one on a single-thread executor and asserts the context is empty. On newer JDKs, `ScopedValue` makes this bug impossible: a binding ends with its `run`.",
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
              question: "What is a ThreadLocal, and when would you use one?",
              answer:
                "A variable with an independent value per thread: `set` and `get` only see the current thread's value, so no synchronisation is needed. Typical uses are request context that would otherwise be passed through every method (user, tenant, trace ID), per-thread instances of non-thread-safe helpers (historically `SimpleDateFormat`), and per-thread state inside frameworks (transactions, MDC). It isn't a way to share data between threads; it's a way to avoid sharing.",
            },
            {
              question: "Why must you call remove() when using ThreadLocal in a thread pool?",
              answer:
                "Because pool threads are reused, and a value lives as long as the thread. Without `remove()`, the next task on that thread reads the previous task's value. In my `RequestContextLeak` run, anonymous requests got `asha`'s and `ravi`'s promos from earlier requests on the same threads. The value also stays in memory. Put `remove()` in a `finally` block next to the `set`.",
            },
            {
              question: "What does ThreadLocal.withInitial do?",
              answer:
                "It creates a `ThreadLocal` whose initial value comes from a `Supplier`, called the first time each thread calls `get()` (and again after a `remove()`). It's the Java 8 replacement for subclassing and overriding `initialValue()`. In my tour, the supplier ran once for two `get` calls, and a second time after `remove`.",
            },
            {
              question: "Is ThreadLocal thread-safe? Does it need synchronisation?",
              answer:
                "Access to the thread local itself is safe without locks, because each thread reads and writes only its own map (`Thread.threadLocals`). But the **value** isn't protected: if you put a shared mutable object into thread locals of several threads (or an `InheritableThreadLocal` hands the same object to a child), those threads share it and need synchronisation as usual.",
            },
            {
              question: "What is InheritableThreadLocal?",
              answer:
                "A `ThreadLocal` whose values are copied from the creating thread into a new thread when the `Thread` object is constructed. The copy is a snapshot (later changes in the parent aren't seen) and shallow by default (override `childValue` to copy mutable values). It's unreliable with thread pools, because workers are created once by whichever caller triggered them.",
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
              question: "How does ThreadLocal work internally? Is it a map from Thread to value?",
              answer:
                "The other way round: each `Thread` has a `ThreadLocalMap` (field `threadLocals`), and the `ThreadLocal` is the **key**. `get()` reads `currentThread().threadLocals`, computes `threadLocalHashCode & (table.length - 1)` and checks that slot. The map is a custom open-addressing table with linear probing, starting at 16 slots, resizing at two thirds full. The early Java 1.2 design was a synchronized map inside the `ThreadLocal`; moving the map into the thread removed the lock.",
            },
            {
              question: "Why are ThreadLocalMap keys weak references, and why doesn't that prevent leaks?",
              answer:
                "Weak keys let an entry become collectable when nothing else references the `ThreadLocal` object (for example, an instance-field local whose owner is gone). But the **value** is held strongly by the entry, and stale entries are only purged when a later `set`, `remove`, `get` miss or rehash on that thread probes past them. In my peek, a stale entry kept a 1 MB array through ten `get` hits and a `remove`, until a fourth `set` happened to scan its slot. And for the common `static final` local, the key never becomes weakly reachable at all.",
            },
            {
              question: "What is the 0x61c88647 constant in ThreadLocal?",
              answer:
                "The hash increment: each new `ThreadLocal` gets the next multiple of `0x61c88647` as its hash. It's 2^32 divided by the golden ratio, negated (the negative of `0x9E3779B9`). Multiples of it, masked to a power-of-two table size, visit every slot before repeating (Fibonacci hashing), so consecutive thread locals spread out. My first nine locals landed in slots 0, 7, 14, 5, 12, 3, 10, 1, 8 of a 16-slot table, with no collisions.",
            },
            {
              question: "How does a ThreadLocal cause a class loader leak in an application server?",
              answer:
                "The container's request threads outlive the web app. If app code leaves a value in a thread local, the chain thread to `threadLocals` to entry to value to the value's class to the app's class loader keeps the whole application (all classes and statics, plus Metaspace) alive after undeploy. Because the key is usually a static field of an app class, the key is reachable through its own value, so it never even goes stale. In my `UndeployLeak`, each redeploy without `remove()` kept its loader and 50 MB; with `remove()` every loader was collected.",
            },
            {
              question: "Why was ThreadLocal<SimpleDateFormat> common, and what replaced it?",
              answer:
                "`SimpleDateFormat` keeps parse state in fields and isn't thread-safe: a shared instance gave me 251,516 wrong dates and 78,387 exceptions out of 400,000 round trips on 8 threads. A per-thread instance fixed it without creating one per call. Since Java 8, `DateTimeFormatter` is immutable and thread-safe, so a single shared `static final` instance is correct and was the fastest option in my run.",
            },
            {
              question: "How do you propagate a ThreadLocal context to tasks in an executor?",
              answer:
                "Capture the value on the submitting thread when the task is wrapped, then in the wrapper: save the worker's current value, set the captured one, run the task, and restore the saved value (or `remove()`) in `finally`. Wrap the executor rather than individual calls. That's what Spring's `TaskDecorator` and SLF4J MDC helpers do; `InheritableThreadLocal` doesn't work for this because it copies at thread creation.",
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
              question: "Walk through what expungeStaleEntry and cleanSomeSlots do, and when they run.",
              answer:
                "`expungeStaleEntry(i)` nulls the value and the slot at `i`, decrements `size`, then walks forward to the next empty slot: stale entries it meets are removed too, and live entries are re-hashed (moved closer to their ideal slot) so linear probing still finds them. `cleanSomeSlots(i, n)` scans about log2(n) slots after `i` and calls `expungeStaleEntry` on any stale one it finds; finding one resets its counter to the table length, so a dirty region gets scanned further. They run from `set` (after an insert), `remove`, `getEntryAfterMiss` (a `get` that didn't hit directly), and `rehash` (which expunges everything before deciding to resize). A direct `get` hit runs none of them.",
            },
            {
              question: "How do ThreadLocals behave with virtual threads, and what changed between the preview and Java 21?",
              answer:
                "They work fully: each virtual thread has its own `threadLocals` map, separate from its carrier's. The cost model changes, because with a thread per task, a per-thread cache is rebuilt for every task (100,000 tasks made 100,000 formatters in my test) and per-thread values multiply by a huge thread count (a 4 KB buffer per thread took 360 to 398 MB more for 100,000 parked threads). The JDK 19 and 20 previews allowed creating virtual threads that rejected `set`; JEP 444 removed that option in 21 and added `-Djdk.traceVirtualThreadLocals` to print a stack trace whenever a virtual thread sets a thread local.",
            },
            {
              question: "What is ScopedValue and how does it differ from ThreadLocal?",
              answer:
                "A preview API in Java 21 (JEP 446, final in 25 as JEP 506). A value is bound with `ScopedValue.where(KEY, v).run(...)` and is visible only during that call; it's immutable (no `set`), rebinding nests and unwinds automatically, and there's no `remove` to forget. Child threads forked in a `StructuredTaskScope` inherit the bindings without copying a map, but arbitrary new threads don't. Because bindings can't change, the JIT can treat a lookup as loop-invariant; in my loop it hoisted `get()` entirely. It's for passing context down a call tree, not for per-thread caches.",
            },
            {
              question: "Why does ThreadLocalRandom not use ThreadLocal?",
              answer:
                "Speed and footprint. Its state lives in dedicated `Thread` fields (`threadLocalRandomSeed`, `threadLocalRandomProbe`, `threadLocalRandomSecondarySeed`, visible with `javap -p java.lang.Thread`), so `current()` is a field read on the current thread with no hash lookup and no map. The same probe is reused by `LongAdder` and `ConcurrentHashMap` to choose a contention cell.",
            },
            {
              question: "Can an InheritableThreadLocal value differ between two tasks submitted by the same thread to the same pool?",
              answer:
                "Yes, and two tasks submitted by different threads can see the same value. A pool worker inherits once, from the thread that caused its creation, typically the caller of the first `submit` that needed a new worker. After that, the value on that worker is fixed (unless a task changes it). In my demo, tasks submitted with `trace-A`, `trace-B` and `trace-C` all saw `trace-A`. With `newVirtualThreadPerTaskExecutor`, each task is a new thread created by the submitter, so each saw its own trace.",
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
              question: "Support reports that a logged-out user occasionally sees another rider's saved addresses. The service keeps the current user in a ThreadLocal set by an authentication filter. What do you check and fix?",
              answer:
                "Whether every path that sets the thread local clears it, especially the path where authentication **doesn't** happen. A filter that sets only for logged-in requests and never removes leaves the previous user on the pool thread, so an anonymous request on that thread inherits them; `RequestContextLeak` reproduced it with every anonymous request becoming `asha` or `ravi`. Fix: `try { set; chain.doFilter(...) } finally { remove(); }` in the same filter, and code that treats a missing user as anonymous only after the context is guaranteed clean.\n\nI'd also treat it as a security incident: find the deploy that introduced it, check logs for cross-user access, and add a test that runs an authenticated then an anonymous request on a single-thread executor.",
            },
            {
              question: "After each redeploy of a WAR, Tomcat's heap and Metaspace grow and never come back; after five redeploys it fails with OutOfMemoryError: Metaspace. How do you investigate?",
              answer:
                "First, read Tomcat's log at undeploy: it reports thread locals it found (`created a ThreadLocal with key of type [...] ... but failed to remove it when the web application was stopped`). Then take a heap dump, find the `WebappClassLoader` instances that should be gone (there will be one per old deployment), and ask for the path to GC roots: a thread-local leak shows up as a container thread, `threadLocals`, `table`, an `Entry` and an app object. My `UndeployLeak` showed the mechanism: each redeploy kept its loader and its 50 MB static.\n\nFix the code that sets the thread local to `remove()` in `finally` (often a library: an old logging or JDBC driver version); as mitigation, Tomcat's thread renewal on context stop helps.",
            },
            {
              question: "Logs from an async notification service have no traceId, so you can't correlate them with the request that triggered them. What's going on and what's the fix?",
              answer:
                "MDC is thread-local; the notification runs on an executor thread whose MDC is empty (or worse, stale). In `MiniMdc`, a plain `submit` logged `{}`. Fix: wrap the executor so each task captures the submitter's MDC at submit time (`MDC.getCopyOfContextMap()`), installs it on the worker, and restores the worker's previous map in `finally`. Wrap at the executor bean, not at call sites, and do the same for `CompletableFuture.*Async` calls by passing the wrapped executor, since the default common pool won't propagate anything.",
            },
            {
              question: "A service moved to virtual threads, and heap usage tripled under the same traffic, with no change in request rate. Heap dumps show millions of SimpleDateFormat and byte[] objects. Why?",
              answer:
                "Per-thread caches. Code that kept a `ThreadLocal<SimpleDateFormat>` or a `ThreadLocal<byte[]>` buffer assumed a few hundred pool threads; with a virtual thread per request, every request creates its own cached object and map. I measured 100,000 formatters for 100,000 tasks, and 360 to 398 MB extra for a 4 KB thread-local buffer across 100,000 virtual threads. I'd run a test with `-Djdk.traceVirtualThreadLocals=true` to list who sets thread locals, replace mutable cached helpers with immutable ones (`DateTimeFormatter`), and turn big buffers into method-local allocations or a bounded pool.",
            },
            {
              question: "Driver payouts in the audit log are attributed to riders, but only for jobs that run on the shared async pool. Receipts are attributed correctly. Where would you look?",
              answer:
                "At whatever propagates the actor to async tasks. A decorator that sets the captured value but doesn't restore the worker's previous value in `finally` leaves a rider on the worker, and unwrapped tasks (the payout job) run with it. `AuditActorLeak` reproduced it: 1,997 of 2,000 payouts blamed on riders, receipts all correct. Fix the decorator to save, set, run and restore (or remove), wrap the whole executor so jobs get a clean context too, and add a test that runs an unwrapped task after a wrapped one on a one-thread executor and asserts the actor is empty.",
            },
            {
              question: "Memory in a long-running service slowly grows; the heap dump's biggest retainers are a few Tomcat worker threads, each with a huge threadLocals table full of entries whose keys are null. What happened?",
              answer:
                "Stale entries: a `ThreadLocal` created per object or per request (an instance field, or `new ThreadLocal` inside a method) with values set and never removed. Each new local is a new key; when its owner is collected the key is cleared, but the value stays until a later operation on that thread expunges it, which may never happen if that code path stops running. My `PerInstanceLocalLeak` kept 351 to 439 MB in four threads after 10,000 requests, and the amount depended on heap size, because GC frequency decides when keys are cleared. Fix: make the local `static final` and `remove()` in `finally`; as a stopgap, restarting or renewing the threads releases it.",
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
            "Create `ThreadLocal<String> T = ThreadLocal.withInitial(() -> \"init\")`, call `T.set(\"x\")` on `main`, then print `T.get()` from a new thread and from `main`.",
            "Print `(0x61c88647 * k) & 15` for `k` from 0 to 15, then `& 31` for 0 to 31. Does any slot repeat?",
            "Run `RequestContextLeak` with `Executors.newFixedThreadPool(1)`. Which rider does every anonymous request get?",
            "In `InheritableDemo`, replace the fixed pool with `Executors.newVirtualThreadPerTaskExecutor()` and look at the three pool-task lines.",
            "Run `TraceLocals` with `-Djdk.traceVirtualThreadLocals=true`. How many stack traces print, and for which thread?",
            "Compile `ScopedRider.java` with a plain `javac ScopedRider.java`, without the preview flags.",
            "Run `PerInstanceLocalLeak` with `-Xmx256m` and with the default heap, and compare the retained megabytes for the no-remove case.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `init` from the new thread and `x` from `main`, because each thread has its own value and the initial value is computed per thread. Step 2 prints `0 7 14 5 12 3 10 1 8 15 6 13 4 11 2 9`, then all 32 values 0 to 31 in a scrambled order (0, 7, 14, 21, 28, 3, ...), with no repeats in either. Step 3: with one thread, every anonymous request reads `ravi`, the most recent rider to log in before it. Step 4 prints `trace-A`, `trace-B` and `trace-C` on the three task lines, because each task runs on a new virtual thread that inherits from the submitter at creation. Step 5 prints two stack traces, both for `VirtualThread[#20,quote-vt]`: one through `setInitialValue` (from the `get`) and one from `set`; the platform-thread call isn't traced. Step 6 fails with `error: StructuredTaskScope is a preview API and is disabled by default.` and the same error for `ScopedValue`, with the hint `(use --enable-preview to enable preview APIs)`. Step 7 retains tens of megabytes with the small heap (19 to 54 MB at 10,000 requests in my runs) and hundreds with the default heap (351 to 439 MB), for the same code.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHERE      Thread.threadLocals = ThreadLocalMap (per thread)
           ThreadLocal = the KEY + threadLocalHashCode, holds no values
           Entry extends WeakReference<ThreadLocal>; value is STRONG

HASHING    hash += 0x61c88647 (2^32 / golden ratio, Fibonacci hashing)
           slot = hash & (len - 1); clash -> linear probe
           16 slots, threshold 2/3; rehash purges stale, then doubles
           stale entries expunged on set / remove / get MISS / rehash only

RULES      static final; set in try, remove() in finally
           get() on an unset local inserts an entry (null)
           set(null) is not cleanup

LEAKS      pool thread keeps the value -> next request sees it
           instance-field locals -> stale entries: 351-439 MB in 4 threads
           app value in container thread -> class loader never collected

INHERIT    InheritableThreadLocal copied ONCE in the Thread constructor
           shallow (childValue to copy); pools: wrong after the first
           executors: capture at submit, install, RESTORE in finally

VIRTUAL    works, one map per virtual thread; caches become per-task
           -Djdk.traceVirtualThreadLocals=true shows every set

SCOPED     ScopedValue (preview 21, final 25): where(K, v).run(...)
           immutable, bounded, inherited by StructuredTaskScope forks`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `ThreadLocal` is only a key; the value lives in the thread's own map, held strongly, for as long as the thread lives. Every problem in this lesson (stale context, retained memory, class loader leaks) is that one fact meeting a long-lived pooled thread, and `remove()` in `finally` prevents nearly all of them.",
            "`InheritableThreadLocal` copies at thread creation, which pools make meaningless; propagate context by capturing at submit time and restoring afterwards. With virtual threads, per-thread caches stop being caches, and `ScopedValue` is the designed replacement for passing context.",
            "Next comes Virtual Threads, Pinning and Structured Concurrency: how a virtual thread mounts and unmounts on a carrier, why 100,000 blocking tasks become cheap, what pins a carrier on Java 21 and how to find it, and `StructuredTaskScope`, the other half of the API that `ScopedValue` was built for.",
          ],
        },
      ],
    },
  ],
};
