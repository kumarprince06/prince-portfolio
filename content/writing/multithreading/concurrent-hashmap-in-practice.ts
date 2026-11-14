import type { Lesson } from "../types";

export const concurrentHashMapInPractice: Lesson = {
  slug: "concurrent-hashmap-in-practice",
  date: "2026-11-14",
  title: "ConcurrentHashMap Atomic Operations and Pitfalls",
  description:
    "Using ConcurrentHashMap correctly on JDK 21, measured: containsKey-then-put that told 8 drivers they had won the same trip (up to 13,465 extra winners in 10,000 trips), get-then-put counters that lost up to a million of 8 million increments, and the atomic replacements (putIfAbsent, computeIfAbsent, compute, merge, replace CAS loops) read in bytecode down to the monitorenter that wraps your function; why computeIfAbsent runs once where ConcurrentSkipListMap ran it 1,215 times, a slow function that stalled other keys in the same bin for 2 seconds, IllegalStateException \"Recursive update\" (and the presized map where recursion silently worked), a deadlock from nested compute calls, ArrayList values that lost a third of their adds, bulk operations with a parallelism threshold, newKeySet, a cache that grew by 130 MB per million requests, and two production rebuilds from a ride-hailing backend: per-driver trip counters that underpaid bonuses, and a profile cache whose remote call ran inside computeIfAbsent.",
  tags: ["Multithreading", "ConcurrentHashMap", "Atomicity", "Production Bugs"],
  sections: [
    {
      title: "What ConcurrentHashMap's Atomic Operations Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, ConcurrentHashMap Internals, ended with a warning: the map makes each call on each key atomic, and nothing more. Every `get`, `put` and `remove` is safe on its own. But almost no real code is a single call. \"If this driver hasn't accepted the trip yet, assign it\" is a `containsKey` and a `put`. \"Add one to this driver's trip count\" is a `get` and a `put`. Between the two calls, another thread can do the same thing, and one of the updates is lost, on a perfectly thread-safe map.",
        },
        {
          type: "paragraph",
          text: "`ConcurrentHashMap` solves that with methods that do the whole read-decide-write step as **one** operation on one key: `putIfAbsent`, `computeIfAbsent`, `computeIfPresent`, `compute`, `merge`, `replace(key, old, new)` and `remove(key, value)`. The Internals lesson showed how: the bin's first node is locked (or an empty bin is filled with CAS), and the read, your function and the write all happen inside that lock. That's also the source of every pitfall in this lesson: your function runs while a lock is held, so a slow function stalls other threads, a function that touches the map can throw or deadlock, and the lock protects the map's entry but not the object stored in it.",
        },
        {
          type: "paragraph",
          text: "I measured each of these on JDK 21 on the same 8-core machine: how many updates the two-call versions lose, what each atomic method costs under contention, what a thread dump looks like when nested `compute` calls deadlock, and two bugs rebuilt from a ride-hailing backend, a trip counter and a profile cache. The internals (bins, `ReservationNode`, the bin lock) are assumed from the previous lesson.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The atomic methods arrived in two waves. Java 5's `ConcurrentMap` interface added the four conditional writes that a concurrent map can't do without: `putIfAbsent`, `remove(k, v)`, `replace(k, v)` and `replace(k, old, new)`. Everything else had to be built as a retry loop on top of them. Java 8 added the functional ones (`compute`, `computeIfAbsent`, `computeIfPresent`, `merge`) to `Map` as default methods, and `ConcurrentHashMap` overrode them to run the function under the bin lock, exactly once. Caching libraries grew up alongside: Guava's `CacheBuilder` (2011) and later Caffeine (2015) added the things a map doesn't have, such as eviction, expiry and refresh.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`ConcurrentMap`: `putIfAbsent`, `remove(k, v)`, `replace(k, v)`, `replace(k, old, new)`", "The first atomic check-then-act operations"],
            ["Java 6 (2006)", "`ConcurrentSkipListMap`, a sorted concurrent map", "Its `computeIfAbsent` makes no once-only promise (lesson 14 covers the class)"],
            ["Java 8 (2014)", "`compute`, `computeIfAbsent`, `computeIfPresent`, `merge`, `getOrDefault` on `Map`; `ConcurrentMap` defaults built as retry loops; `ConcurrentHashMap` overrides them to run atomically", "The counting and grouping idioms of this lesson"],
            ["Java 8 (2014)", "`ConcurrentHashMap` bulk operations (`forEach`, `search`, `reduce` with a parallelism threshold), `newKeySet`, `keySet(V)`, `mappingCount`; `LongAdder`", "Parallel scans and concurrent sets"],
            ["Java 9 (2017)", "Recursive `computeIfAbsent`/`compute` throws `IllegalStateException(\"Recursive update\")` instead of looping forever; `HashMap` throws `ConcurrentModificationException` for the same mistake; `computeIfAbsent` skips the lock when the first node already holds the key", "Two of the pitfalls below"],
            ["Java 21 (2023)", "Same behaviour", "Every measurement here"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Back to the dispatch office with a pigeonhole per driver, where each pigeonhole has its own latch.",
        },
        {
          type: "list",
          items: [
            "**`get` then `put`** is reading the tally slip in Ravi's pigeonhole (\"7 trips\"), walking to your desk, writing \"8\" on a new slip and coming back to swap it in. Another dispatcher did the same at the same time, also wrote \"8\", and one of the two trips vanished.",
            "**`merge` and `compute`** are taking Ravi's latch, reading the slip, writing the new number and putting it back, all before letting go. The second dispatcher waits a moment at the latch and then reads \"8\".",
            "**`putIfAbsent`** is the trip-claim board: \"write your name on this trip if the space is blank\", done while holding the latch, so only one name ever ends up there.",
            "**A slow function inside `compute`** is a dispatcher who takes the latch and then phones the head office before writing. Everyone needing that pigeonhole, and (because neighbouring pigeonholes share a latch) a few unrelated ones, waits for the phone call.",
            "**`compute` that touches another key** is a dispatcher holding Asha's latch while reaching for Ravi's, at the moment a colleague holding Ravi's reaches for Asha's: a deadlock.",
            "**A mutable value** is a notebook kept in the pigeonhole. The latch protects which notebook is in there, not people writing in it at the same time.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: real pigeonholes each have their own latch. In `ConcurrentHashMap` a latch belongs to a **bin**, and the keys that share a bin are decided by their hash codes and the current table size, not by anything you chose. Which unrelated keys wait for a slow function changes as the map grows.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/concurrent-hashmap-in-practice-atomic-ops.svg",
          alt: "Two panels and a summary. Left panel, get then put, a lost trip: trips.get(\"ravi\") is 7 and two trip-completed events arrive together. consumer-1 runs n = get(\"ravi\") and gets 7, consumer-2 runs n = get(\"ravi\") and also gets 7, consumer-1 puts 8, consumer-2 puts 8: two trips, one increment; measured 0.6 to 1.1 million lost of 8 million. Right panel, merge(\"ravi\", 1, Integer::sum): consumer-1 synchronizes on the first node of the bin, reads 7, computes 8, stores 8, unlocks; consumer-2 is BLOCKED until the unlock, then locks, reads 8, computes 9, stores 9; the same holds for compute, computeIfAbsent, putIfAbsent and replace with an expected value. Below: while a compute, merge or computeIfAbsent function runs it holds that bin's monitor. Waits for the function: writes to the same key, writes to other keys in the bin, the resize copying that bin. Does not wait: get on any key, writes to other bins, computeIfAbsent when the key is the first node. So the function must be short and must not touch the map: the same bin again gives IllegalStateException Recursive update, two threads with two keys and nested compute deadlock, and a 50 ms remote call means 50 ms stalls for unlucky keys. At the bottom: the map protects its own entries, not the objects stored in them; computeIfAbsent with new ArrayList then add from 8 threads lost up to a third of the adds.",
          caption: "One call is atomic; a sequence of calls is not. The atomic methods run your function while the bin is locked.",
        },
        {
          type: "heading",
          text: "The atomic methods",
        },
        {
          type: "table",
          headers: ["Method", "Does atomically", "Returns", "Your function runs under the bin lock?"],
          rows: [
            ["`putIfAbsent(k, v)`", "Insert only if no mapping", "Existing value, or `null` if this call inserted", "No function"],
            ["`replace(k, old, new)`", "Replace only if the current value `equals(old)`", "`true` if replaced", "No function"],
            ["`remove(k, v)`", "Remove only if the current value `equals(v)`", "`true` if removed", "No function"],
            ["`computeIfAbsent(k, f)`", "If absent, store `f(k)` (unless `null`)", "Existing or new value", "Yes, at most once per absent key"],
            ["`computeIfPresent(k, f)`", "If present, replace with `f(k, v)`; `null` removes", "New value or `null`", "Yes"],
            ["`compute(k, f)`", "Replace with `f(k, v or null)`; `null` removes", "New value or `null`", "Yes"],
            ["`merge(k, v, f)`", "Store `v` if absent, else `f(old, v)`; `null` removes", "New value or `null`", "Yes"],
          ],
        },
        {
          type: "heading",
          text: "Which tool for which job",
        },
        {
          type: "table",
          headers: ["Job", "Racy version", "Atomic version"],
          rows: [
            ["Claim something once", "`if (!m.containsKey(k)) m.put(k, me)`", "`m.putIfAbsent(k, me) == null`"],
            ["Count", "`m.put(k, m.getOrDefault(k, 0) + 1)`", "`m.merge(k, 1, Integer::sum)`, or `computeIfAbsent(k, x -> new LongAdder()).increment()`"],
            ["Create on first use", "`if (m.get(k) == null) m.put(k, create())`", "`m.computeIfAbsent(k, x -> create())`"],
            ["Update from the old value", "`m.put(k, f(m.get(k)))`", "`m.compute(k, (key, old) -> f(old))` or a `replace(k, old, new)` loop"],
            ["Remove only if unchanged", "`if (m.get(k) == v) m.remove(k)`", "`m.remove(k, v)`"],
            ["Deduplicate", "`if (!set.contains(x)) { set.add(x); handle(x); }`", "`if (set.add(x)) handle(x)` on `ConcurrentHashMap.newKeySet()`"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "Three questions about the atomic methods can be answered from the class files: where does my function run relative to the lock, why does `ConcurrentHashMap`'s `computeIfAbsent` run my function once when the interface doesn't promise that, and what does `putIfAbsent` actually call.",
        },
        {
          type: "heading",
          text: "computeIfAbsent, in bytecode",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.concurrent.ConcurrentHashMap   # computeIfAbsent, selected lines",
        },
        {
          type: "output",
          text: `  public V computeIfAbsent(K, java.util.function.Function<? super K, ? extends V>);
    Code:
      ...
      79: new           #176                // class java/util/concurrent/ConcurrentHashMap$ReservationNode
      ...
      93: monitorenter
      ...
     101: invokestatic  #162                // Method casTabAt:(...)Z
      ...
     115: invokeinterface #382,  2          // InterfaceMethod java/util/function/Function.apply:(Ljava/lang/Object;)Ljava/lang/Object;
      ...
     167: monitorexit
      ...
     241: invokevirtual #120                // Method java/lang/Object.equals:(Ljava/lang/Object;)Z
      ...
     260: areturn
      ...
     269: monitorenter
      ...
     274: invokestatic  #109                // Method tabAt:(...)Ljava/util/concurrent/ConcurrentHashMap$Node;
      ...
     356: invokeinterface #382,  2          // InterfaceMethod java/util/function/Function.apply:(Ljava/lang/Object;)Ljava/lang/Object;
      ...
     379: ldc           #180                // String Recursive update
      ...
     500: instanceof    #176                // class java/util/concurrent/ConcurrentHashMap$ReservationNode
      ...
     510: ldc           #180                // String Recursive update`,
        },
        {
          type: "list",
          items: [
            "**Empty bin (offsets 79 to 167):** create a `ReservationNode`, lock it (`monitorenter` at 93) **before** it's visible, CAS it into the bin (101), then call your function (`Function.apply` at 115) and replace the reservation with the real node. The function runs between `monitorenter` and `monitorexit`: other writers to this bin find the reservation and block on its monitor.",
            "**Key already the first node (offsets 241 to 260):** compare with `equals` and return the existing value **without locking**. This is the Java 9 fast path, and it's why a cache hit through `computeIfAbsent` is cheap, but only when the key happens to be the first node in its bin.",
            "**Non-empty bin otherwise (offset 269 onwards):** lock the first node, re-read the bin with `tabAt`, walk the chain, and if the key is missing call your function (356) while holding the lock.",
            "**The \"Recursive update\" checks (379, 510):** if, while holding the lock, the code finds a `ReservationNode` where it expected the bin's head, the only possible owner is this thread itself, re-entering the map from inside its own function. (A monitor is re-entrant, so the thread wouldn't block on itself; without this check it would loop forever, which is what Java 8 did.)",
          ],
        },
        {
          type: "paragraph",
          text: "`compute`, `computeIfPresent` and `merge` have the same shape: `javap` finds the \"Recursive update\" string in all of them, and `Function.apply` or `BiFunction.apply` between a `monitorenter` and a `monitorexit`. `putIfAbsent` is just `putVal(key, value, true)`, and `replace(k, old, new)` calls `replaceNode(key, new, old)`, which locks the first node like `putVal`. There's no separate CAS on the value: the \"compare\" in compare-and-replace happens under the bin lock.",
        },
        {
          type: "heading",
          text: "The interface's defaults are retry loops",
        },
        {
          type: "code",
          language: "bash",
          code: `javap java.util.concurrent.ConcurrentMap | grep -E 'default|abstract'
javap -c java.util.concurrent.ConcurrentMap    # computeIfAbsent's default body, calls only`,
        },
        {
          type: "output",
          text: `  public default V getOrDefault(java.lang.Object, V);
  public default void forEach(java.util.function.BiConsumer<? super K, ? super V>);
  public abstract V putIfAbsent(K, V);
  public abstract boolean remove(java.lang.Object, java.lang.Object);
  public abstract boolean replace(K, V, V);
  public abstract V replace(K, V);
  public default void replaceAll(java.util.function.BiFunction<? super K, ? super V, ? extends V>);
  public default V computeIfAbsent(K, java.util.function.Function<? super K, ? extends V>);
  public default V computeIfPresent(K, java.util.function.BiFunction<? super K, ? super V, ? extends V>);
  public default V compute(K, java.util.function.BiFunction<? super K, ? super V, ? extends V>);
  public default V merge(K, V, java.util.function.BiFunction<? super V, ? super V, ? extends V>);

  public default V computeIfAbsent(K, java.util.function.Function<? super K, ? extends V>);
       1: invokestatic  #7                  // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
       7: invokeinterface #1,  2            // InterfaceMethod get:(Ljava/lang/Object;)Ljava/lang/Object;
      14: ifnonnull     49
      19: invokeinterface #55,  2           // InterfaceMethod java/util/function/Function.apply:(Ljava/lang/Object;)Ljava/lang/Object;
      27: ifnull        49
      34: invokeinterface #60,  3           // InterfaceMethod putIfAbsent:(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
      41: ifnonnull     49`,
        },
        {
          type: "paragraph",
          text: "Only the four Java 5 methods are abstract. The default `computeIfAbsent` is `get`, then `apply`, then `putIfAbsent`: the result is still atomic (only one value wins), but several threads that miss at the same time **all run the function**, and the losers' results are thrown away. A `ConcurrentMap` that doesn't override it behaves that way. `ConcurrentSkipListMap` overrides it, but its Javadoc says the function is not guaranteed to be applied once. I raced 8 threads on each of 1,000 missing keys:",
        },
        {
          type: "code",
          language: "java",
          title: "CallsOnce.java",
          code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class CallsOnce {
    // 8 threads ask for the same missing key at the same moment; how often does the loader run?
    static void race(String label, ConcurrentMap<String, String> map) throws InterruptedException {
        AtomicInteger loads = new AtomicInteger();
        int rounds = 1_000;
        for (int round = 0; round < rounds; round++) {
            String key = "driver-" + round;
            CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(8);
            for (int t = 0; t < 8; t++) {
                new Thread(() -> {
                    try { go.await(); } catch (InterruptedException e) { return; }
                    map.computeIfAbsent(key, k -> { loads.incrementAndGet(); return "profile-of-" + k; });
                    done.countDown();
                }).start();
            }
            go.countDown();
            done.await();
        }
        System.out.printf("%-22s %,d keys, loader ran %,d times%n", label, map.size(), loads.get());
    }

    public static void main(String[] args) throws Exception {
        race("ConcurrentHashMap", new ConcurrentHashMap<>());
        race("ConcurrentSkipListMap", new ConcurrentSkipListMap<>());
    }
}`,
        },
        {
          type: "output",
          text: `ConcurrentHashMap      1,000 keys, loader ran 1,000 times
ConcurrentSkipListMap  1,000 keys, loader ran 1,215 times`,
        },
        {
          type: "paragraph",
          text: "`ConcurrentHashMap` ran the loader exactly once per key in all runs; `ConcurrentSkipListMap` ran it 1,215 times for 1,000 keys here (1,262 to 1,395 in three earlier runs). Both maps ended with one value per key. If the loader is a database query or a remote call, \"runs once\" is the property you're paying for, and it's specific to `ConcurrentHashMap`.",
        },
        {
          type: "heading",
          text: "A deadlock in a thread dump",
        },
        {
          type: "paragraph",
          text: "Because `compute` holds a real monitor, the JVM's deadlock detector understands it. The section \"computeIfAbsent Holds the Bin Lock\" below builds a wallet transfer that calls `compute` on one key from inside `compute` on another; `jstack` on it printed:",
        },
        {
          type: "output",
          text: `Found one Java-level deadlock:
=============================
"pay-asha-to-ravi":
  waiting to lock monitor 0x00007b78a8004340 (object 0x000000008df15e48, a java.util.concurrent.ConcurrentHashMap$Node),
  which is held by "pay-ravi-to-asha"

"pay-ravi-to-asha":
  waiting to lock monitor 0x00007b78ac00a4c0 (object 0x000000008df15de0, a java.util.concurrent.ConcurrentHashMap$Node),
  which is held by "pay-asha-to-ravi"

Java stack information for the threads listed above:
===================================================
"pay-asha-to-ravi":
	at java.util.concurrent.ConcurrentHashMap.compute(java.base@21.0.13.0.3/ConcurrentHashMap.java:1932)
	- waiting to lock <0x000000008df15e48> (a java.util.concurrent.ConcurrentHashMap$Node)
	at NestedCompute.lambda$main$1(NestedCompute.java:18)
	at NestedCompute$$Lambda/0x00007b78e4001000.apply(Unknown Source)
	at java.util.concurrent.ConcurrentHashMap.compute(java.base@21.0.13.0.3/ConcurrentHashMap.java:1940)
	- locked <0x000000008df15de0> (a java.util.concurrent.ConcurrentHashMap$Node)
	at NestedCompute.lambda$main$2(NestedCompute.java:15)
	at NestedCompute$$Lambda/0x00007b78e4000a08.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)
"pay-ravi-to-asha":
	at java.util.concurrent.ConcurrentHashMap.compute(java.base@21.0.13.0.3/ConcurrentHashMap.java:1932)
	- waiting to lock <0x000000008df15de0> (a java.util.concurrent.ConcurrentHashMap$Node)
	at NestedCompute.lambda$main$4(NestedCompute.java:24)
	at NestedCompute$$Lambda/0x00007b78e4001238.apply(Unknown Source)
	at java.util.concurrent.ConcurrentHashMap.compute(java.base@21.0.13.0.3/ConcurrentHashMap.java:1940)
	- locked <0x000000008df15e48> (a java.util.concurrent.ConcurrentHashMap$Node)
	at NestedCompute.lambda$main$5(NestedCompute.java:21)
	at NestedCompute$$Lambda/0x00007b78e4000c30.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)

Found 1 deadlock.`,
        },
        {
          type: "paragraph",
          text: "Each thread holds one bin's `ConcurrentHashMap$Node` monitor (`- locked`, taken by the outer `compute` at `ConcurrentHashMap.java:1940`, the line that calls your function) and waits for the other's (`- waiting to lock`, the inner `compute`). That's a lock-ordering deadlock from lesson 21, made with nothing but a map.",
        },
      ],
    },
    {
      title: "Check-Then-Act and Read-Modify-Write",
      blocks: [
        {
          type: "paragraph",
          text: "The two classic races. **Check-then-act**: decide based on a read, then write, assuming nothing changed in between. **Read-modify-write**: read a value, compute a new one, write it back. Both are two calls, so both break on a thread-safe map. First, eight drivers racing to accept the same 10,000 trips:",
        },
        {
          type: "code",
          language: "java",
          title: "CheckThenAct.java",
          code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class CheckThenAct {
    interface Claim { boolean tryClaim(ConcurrentHashMap<Integer, String> owners, int trip, String driver); }

    // 8 drivers race to accept the same 10,000 trips; each trip must have exactly one winner
    static void race(String label, Claim claim) throws InterruptedException {
        ConcurrentHashMap<Integer, String> owners = new ConcurrentHashMap<>();
        AtomicInteger wins = new AtomicInteger();
        CountDownLatch go = new CountDownLatch(1);
        Thread[] drivers = new Thread[8];
        for (int d = 0; d < drivers.length; d++) {
            String name = "driver-" + d;
            drivers[d] = new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int trip = 0; trip < 10_000; trip++) if (claim.tryClaim(owners, trip, name)) wins.incrementAndGet();
            });
            drivers[d].start();
        }
        go.countDown();
        for (Thread t : drivers) t.join();
        System.out.printf("%-28s trips=%,d  drivers told \\"you got it\\"=%,d  double bookings=%,d%n",
                label, owners.size(), wins.get(), wins.get() - owners.size());
    }

    public static void main(String[] args) throws Exception {
        for (int run = 1; run <= 3; run++) {
            race("containsKey then put", (owners, trip, driver) -> {
                if (!owners.containsKey(trip)) {         // check
                    owners.put(trip, driver);            // act: another driver may have got here first
                    return true;
                }
                return false;
            });
        }
        race("putIfAbsent", (owners, trip, driver) -> owners.putIfAbsent(trip, driver) == null);
    }
}`,
        },
        {
          type: "output",
          text: `containsKey then put         trips=10,000  drivers told "you got it"=14,084  double bookings=4,084
containsKey then put         trips=10,000  drivers told "you got it"=20,357  double bookings=10,357
containsKey then put         trips=10,000  drivers told "you got it"=17,769  double bookings=7,769
putIfAbsent                  trips=10,000  drivers told "you got it"=10,000  double bookings=0`,
        },
        {
          type: "list",
          items: [
            "**`containsKey` then `put` told 14,084 to 20,357 drivers \"you got it\" for 10,000 trips** (4,084 to 13,465 extra winners across twelve runs). Several drivers saw the trip as free, all wrote their name, and the last `put` won the map, while every one of them was told they had the trip.",
            "**The map itself looks fine afterwards**: exactly 10,000 trips, one owner each. The damage is in what the code **did** based on the check (notifying drivers, starting navigation). That's why check-then-act bugs pass tests that only inspect the map.",
            "**`putIfAbsent` returned `null` to exactly one caller per trip**: 10,000 winners, every run. The check and the write are one operation under the bin lock.",
          ],
        },
        {
          type: "paragraph",
          text: "Now counters. Eight threads each add 1 a million times, spread over 64 zone keys, with six different techniques:",
        },
        {
          type: "code",
          language: "java",
          title: "Counters.java",
          code: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.IntConsumer;

public class Counters {
    static final int THREADS = 8, PER_THREAD = 1_000_000, ZONES = 64;
    static final AtomicLong RETRIES = new AtomicLong();

    // runs the increment THREADS x PER_THREAD times; returns elapsed ns
    static long hammer(IntConsumer increment) throws InterruptedException {
        CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(THREADS);
        for (int t = 0; t < THREADS; t++) {
            int seed = t;
            new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int i = 0; i < PER_THREAD; i++) increment.accept((i * 31 + seed) % ZONES);
                done.countDown();
            }).start();
        }
        long start = System.nanoTime();
        go.countDown();
        done.await();
        return System.nanoTime() - start;
    }

    static void report(String label, Map<Integer, ?> map, java.util.function.ToLongFunction<Object> read, long ns) {
        long total = 0;
        for (Object v : map.values()) total += read.applyAsLong(v);
        long expected = (long) THREADS * PER_THREAD;
        System.out.printf("%-34s total %,10d  lost %,9d  %5d ms%n", label, total, expected - total, ns / 1_000_000);
    }

    public static void main(String[] args) throws Exception {
        {
            ConcurrentHashMap<Integer, Integer> a = new ConcurrentHashMap<>();
            long ns = hammer(z -> { Integer n = a.get(z); a.put(z, n == null ? 1 : n + 1); });
            report("get then put", a, v -> (Integer) v, ns);

            ConcurrentHashMap<Integer, Integer> b = new ConcurrentHashMap<>();
            ns = hammer(z -> b.merge(z, 1, Integer::sum));
            report("merge(z, 1, Integer::sum)", b, v -> (Integer) v, ns);

            ConcurrentHashMap<Integer, Integer> c = new ConcurrentHashMap<>();
            ns = hammer(z -> c.compute(z, (k, n) -> n == null ? 1 : n + 1));
            report("compute", c, v -> (Integer) v, ns);

            ConcurrentHashMap<Integer, Integer> d = new ConcurrentHashMap<>();
            RETRIES.set(0);
            ns = hammer(z -> {
                while (true) {
                    Integer n = d.putIfAbsent(z, 1);
                    if (n == null || d.replace(z, n, n + 1)) return;   // CAS on the value
                    RETRIES.incrementAndGet();
                }
            });
            report("putIfAbsent + replace(k, old, new)", d, v -> (Integer) v, ns);
            System.out.printf("%34s (%,d retries)%n", "", RETRIES.get());

            ConcurrentHashMap<Integer, AtomicLong> e = new ConcurrentHashMap<>();
            ns = hammer(z -> e.computeIfAbsent(z, k -> new AtomicLong()).incrementAndGet());
            report("computeIfAbsent -> AtomicLong", e, v -> ((AtomicLong) v).get(), ns);

            ConcurrentHashMap<Integer, LongAdder> f = new ConcurrentHashMap<>();
            ns = hammer(z -> f.computeIfAbsent(z, k -> new LongAdder()).increment());
            report("computeIfAbsent -> LongAdder", f, v -> ((LongAdder) v).sum(), ns);
        }
    }
}`,
        },
        {
          type: "output",
          text: `get then put                       total  7,256,462  lost   743,538    164 ms
merge(z, 1, Integer::sum)          total  8,000,000  lost         0    164 ms
compute                            total  8,000,000  lost         0    147 ms
putIfAbsent + replace(k, old, new) total  8,000,000  lost         0    215 ms
                                   (337,597 retries)
computeIfAbsent -> AtomicLong      total  8,000,000  lost         0     99 ms
computeIfAbsent -> LongAdder       total  8,000,000  lost         0    138 ms`,
        },
        {
          type: "list",
          items: [
            "**`get` then `put` lost 743,538 of 8,000,000 increments** in this run, and between 632,545 and 1,073,091 over seven runs: 8 to 13% of all trips gone, with no exception and a map that looks healthy.",
            "**`merge`, `compute` and the `replace` loop were all exact.** `merge` and `compute` lock the bin and run the addition inside. The `replace` loop never loses either, but it **retried** 308,000 to 410,000 times: each retry is a `replace(k, old, new)` that found someone else's value and had to read again.",
            "**`computeIfAbsent` returning a counter object was the fastest**: 50 to 106 ms for `AtomicLong`, against 114 to 217 ms for `merge` and `compute`. After the first call per zone, `computeIfAbsent` usually returns from the first-node fast path without locking, and the increment is a single CAS on the `AtomicLong`. The map is used only to find the counter.",
            "**`LongAdder` was slower than `AtomicLong` here** (74 to 152 ms). With 64 keys and 8 threads, two threads rarely hit the same counter at the same moment, so `AtomicLong`'s single CAS rarely fails and `LongAdder`'s extra machinery doesn't pay off. The Performance section puts all eight threads on one key, where the result flips.",
            "Times are single runs under load from other benchmarks, so only the big differences mean anything; the lost counts are the point.",
          ],
        },
      ],
    },
    {
      title: "putIfAbsent, computeIfAbsent, compute and merge",
      blocks: [
        {
          type: "paragraph",
          text: "A quick tour of what each one returns and when it removes, because the return values are where the bugs hide:",
        },
        {
          type: "code",
          language: "java",
          title: "AtomicOpsTour.java",
          code: `import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.LongAdder;

public class AtomicOpsTour {
    public static void main(String[] args) {
        ConcurrentHashMap<String, Integer> surge = new ConcurrentHashMap<>();

        // 1. insert only if absent: returns the existing value, or null if this call inserted
        System.out.println(surge.putIfAbsent("SALT-LAKE", 120) + " " + surge.putIfAbsent("SALT-LAKE", 150));

        // 2. conditional replace and remove: compare-and-set on the value
        System.out.println(surge.replace("SALT-LAKE", 120, 140) + " " + surge.replace("SALT-LAKE", 120, 999)
                + " " + surge.remove("SALT-LAKE", 999) + " " + surge);

        // 3. compute family: the function runs atomically for that key
        surge.computeIfAbsent("NEW-TOWN", zone -> 100);
        surge.computeIfPresent("NEW-TOWN", (zone, pct) -> pct + 10);
        surge.compute("HOWRAH", (zone, pct) -> pct == null ? 100 : pct + 5);
        surge.compute("HOWRAH", (zone, pct) -> null);               // returning null removes the entry
        System.out.println(surge);

        // 4. merge: the counting idiom
        ConcurrentHashMap<String, Long> tripsPerZone = new ConcurrentHashMap<>();
        for (String z : List.of("SALT-LAKE", "NEW-TOWN", "SALT-LAKE")) tripsPerZone.merge(z, 1L, Long::sum);
        System.out.println(tripsPerZone);

        // 5. thread-safe values for collections and hot counters
        ConcurrentHashMap<String, ConcurrentLinkedQueue<Long>> tripIds = new ConcurrentHashMap<>();
        tripIds.computeIfAbsent("SALT-LAKE", z -> new ConcurrentLinkedQueue<>()).add(9001L);
        ConcurrentHashMap<String, LongAdder> pings = new ConcurrentHashMap<>();
        pings.computeIfAbsent("ravi", d -> new LongAdder()).increment();
        System.out.println(tripIds + " " + pings);

        // 6. a concurrent set, and bulk operations with a parallelism threshold
        Set<Long> online = ConcurrentHashMap.newKeySet();
        System.out.println(online.add(42L) + " " + online.add(42L));
        long total = tripsPerZone.reduceValuesToLong(1_000, Long::longValue, 0L, Long::sum);
        String busy = tripsPerZone.search(1_000, (zone, n) -> n > 1 ? zone : null);
        System.out.println(total + " " + busy);
    }
}`,
        },
        {
          type: "output",
          text: `null 120
true false false {SALT-LAKE=140}
{SALT-LAKE=140, NEW-TOWN=110}
{SALT-LAKE=2, NEW-TOWN=1}
{SALT-LAKE=[9001]} {ravi=1}
true false
3 SALT-LAKE`,
        },
        {
          type: "list",
          items: [
            "**`putIfAbsent` returns the previous value**: `null` the first time (this call inserted), `120` the second time (nothing changed, 150 was ignored). \"Did I win?\" is `putIfAbsent(...) == null`, which only works because the map has no `null` values.",
            "**`putIfAbsent` evaluates its argument even when the key is present**, because Java evaluates arguments before the call. `putIfAbsent(k, new ExpensiveThing())` builds the thing every time; `computeIfAbsent(k, x -> new ExpensiveThing())` builds it only on a miss.",
            "**`replace(k, old, new)` and `remove(k, v)` compare with `equals`**: `replace(\"SALT-LAKE\", 120, 140)` succeeded, a second `replace` expecting 120 found 140 and failed, and `remove(\"SALT-LAKE\", 999)` removed nothing.",
            "**Returning `null` from `compute`, `computeIfPresent` or `merge`'s function removes the entry** (`HOWRAH` was added and then removed). Returning `null` from `computeIfAbsent`'s function stores nothing.",
            "**`merge(k, 1L, Long::sum)` is the counting idiom**: store 1 if absent, otherwise `old + 1`.",
          ],
        },
        {
          type: "heading",
          text: "replace(key, old, new) and CAS loops",
        },
        {
          type: "paragraph",
          text: "Before Java 8, a conditional update was written as a loop: read, compute, `replace(k, old, new)`, and retry if someone else got in first. It's still useful when the update often turns out to be unnecessary, because a read that decides \"nothing to do\" takes no lock, while `merge` and `compute` always lock the bin. Keeping the highest fare seen per zone:",
        },
        {
          type: "code",
          language: "java",
          title: "MaxFare.java",
          code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicLong;

public class MaxFare {
    static final AtomicLong RETRIES = new AtomicLong();

    // keep the highest fare seen per zone with a compare-and-set loop on the value
    static void recordWithReplace(ConcurrentHashMap<String, Long> highest, String zone, long farePaise) {
        while (true) {
            Long current = highest.get(zone);
            if (current == null) {
                if (highest.putIfAbsent(zone, farePaise) == null) return;    // first fare for the zone
            } else if (farePaise <= current) {
                return;                                                     // nothing to do
            } else if (highest.replace(zone, current, farePaise)) {
                return;                                                     // CAS succeeded
            }
            RETRIES.incrementAndGet();                                       // someone changed it: read again
        }
    }

    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<String, Long> viaReplace = new ConcurrentHashMap<>(), viaMerge = new ConcurrentHashMap<>();
        CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(8);
        for (int t = 0; t < 8; t++) {
            int seed = t;
            new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (long i = 0; i < 500_000; i++) {
                    long fare = 5_000 + (i * 7919 + seed * 104_729) % 100_000;   // 5,000 to 104,999 paise
                    String zone = (i % 2 == 0) ? "SALT-LAKE" : "NEW-TOWN";
                    recordWithReplace(viaReplace, zone, fare);
                    viaMerge.merge(zone, fare, Math::max);                       // the same thing in one call
                }
                done.countDown();
            }).start();
        }
        go.countDown();
        done.await();
        System.out.println("replace loop: " + viaReplace + " after " + RETRIES.get() + " retries");
        System.out.println("merge(max):   " + viaMerge);
    }
}`,
        },
        {
          type: "output",
          text: `replace loop: {SALT-LAKE=104999, NEW-TOWN=104999} after 6 retries
merge(max):   {SALT-LAKE=104999, NEW-TOWN=104999}`,
        },
        {
          type: "paragraph",
          text: "Both give 104,999 paise, the true maximum. The loop retried only 0 to 6 times in 4 million calls per run across four runs, because once the maximum is high, almost every call returns at \"nothing to do\" without writing. `merge(zone, fare, Math::max)` is shorter and just as correct; it locks the bin on every call. Note what the loop does **not** do: it never writes the result of a stale read. Every write is conditional on the value it read still being there.",
        },
      ],
    },
    {
      title: "computeIfAbsent Holds the Bin Lock",
      blocks: [
        {
          type: "paragraph",
          text: "The Javadoc says the mapping function \"should be short and simple, and must not attempt to update any other mappings of this map\". All three parts of that sentence can be measured.",
        },
        {
          type: "heading",
          text: "A slow function blocks other keys in the same bin",
        },
        {
          type: "paragraph",
          text: "I found four driver keys that share a bin in a 16-bin table, cached two of them, and started a `computeIfAbsent` for a third whose function sleeps for 2 seconds (a stand-in for a remote call). Then five other operations, each on its own thread, all at once:",
        },
        {
          type: "code",
          language: "java",
          title: "SameBinStall.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

public class SameBinStall {
    static int bin(Object key) {                              // ConcurrentHashMap.spread, then & (16 - 1)
        int h = key.hashCode();
        return ((h ^ (h >>> 16)) & 0x7fffffff) & 15;
    }

    // runs each probe on its own thread, all at once, and reports how long each call took
    static void probe(String[] labels, Runnable[] calls) throws InterruptedException {
        Thread[] ts = new Thread[calls.length];
        String[] lines = new String[calls.length];
        for (int i = 0; i < calls.length; i++) {
            int n = i;
            ts[i] = new Thread(() -> {
                long t = System.nanoTime();
                calls[n].run();
                lines[n] = String.format("  %-48s %5d ms", labels[n], (System.nanoTime() - t) / 1_000_000);
            });
            ts[i].start();
        }
        for (Thread t : ts) t.join();
        for (String l : lines) System.out.println(l);
    }

    public static void main(String[] args) throws Exception {
        List<String> sameBin = new ArrayList<>();                 // four driver keys that share one bin
        for (int i = 0; sameBin.size() < 4; i++) if (bin("driver-" + i) == bin("driver-0")) sameBin.add("driver-" + i);
        String first = sameBin.get(0), second = sameBin.get(1), slowKey = sameBin.get(2), neighbour = sameBin.get(3);
        System.out.println(sameBin + " share bin " + bin(first) + "; driver-1 is in bin " + bin("driver-1"));

        ConcurrentHashMap<String, String> profiles = new ConcurrentHashMap<>();   // 16 bins
        profiles.put(first, "cached");                            // first node of the bin
        profiles.put(second, "cached");                           // second node of the bin
        CountDownLatch inside = new CountDownLatch(1);
        Thread loader = new Thread(() -> profiles.computeIfAbsent(slowKey, k -> {
            inside.countDown();
            try { Thread.sleep(2_000); } catch (InterruptedException e) { }   // a slow remote call
            return "loaded";
        }));
        loader.start();
        inside.await();
        System.out.println("while computeIfAbsent(" + slowKey + ") sleeps 2 s inside its function:");
        probe(new String[] {
                "get(" + second + ")              same bin",
                "computeIfAbsent(" + first + ")   same bin, 1st node",
                "computeIfAbsent(" + second + ")  same bin, 2nd node",
                "put(" + neighbour + ")              same bin, new key",
                "put(driver-1)               other bin"},
            new Runnable[] {
                () -> profiles.get(second),
                () -> profiles.computeIfAbsent(first, k -> "x"),
                () -> profiles.computeIfAbsent(second, k -> "x"),
                () -> profiles.put(neighbour, "v"),
                () -> profiles.put("driver-1", "v")});
        loader.join();
    }
}`,
        },
        {
          type: "output",
          text: `[driver-0, driver-20, driver-31, driver-42] share bin 12; driver-1 is in bin 11
while computeIfAbsent(driver-31) sleeps 2 s inside its function:
  get(driver-20)              same bin                 0 ms
  computeIfAbsent(driver-0)   same bin, 1st node       1 ms
  computeIfAbsent(driver-20)  same bin, 2nd node    1988 ms
  put(driver-42)              same bin, new key     1988 ms
  put(driver-1)               other bin                0 ms`,
        },
        {
          type: "list",
          items: [
            "**`put(driver-42)` waited 1,988 ms** although `driver-42` has nothing to do with `driver-31`: its only connection is the hash code that put it in bin 12.",
            "**`computeIfAbsent(driver-20)` also waited**, although `driver-20` was already cached, because it's the **second** node of the bin. The Java 9 fast path only checks the first node; for anything else, `computeIfAbsent` locks the bin to look.",
            "**`computeIfAbsent(driver-0)`, the first node, returned in 1 ms** through that fast path, and **`get(driver-20)` returned immediately** because `get` never locks.",
            "**`put(driver-1)`, in bin 11, was unaffected.**",
            "So the set of keys a slow function blocks is \"whatever shares its bin right now\": a handful of keys in a small map, rarely anything in a large one, and different after every resize. That's why this shows up as occasional tail latency in production rather than as a constant slowdown, as the second production story shows.",
          ],
        },
        {
          type: "heading",
          text: "A function that updates the map: Recursive update",
        },
        {
          type: "paragraph",
          text: "The classic way to hit this is memoised recursion: Fibonacci with `computeIfAbsent`, where computing `fib(n)` calls `computeIfAbsent` for `n - 1` and `n - 2` from inside the function.",
        },
        {
          type: "code",
          language: "java",
          title: "RecursiveUpdate.java",
          code: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RecursiveUpdate {
    static Map<Integer, Long> memo;

    static long fib(int n) {
        if (n < 2) return n;
        return memo.computeIfAbsent(n, k -> fib(k - 1) + fib(k - 2));   // updates the map from inside its own function
    }

    static void attempt(String label, Map<Integer, Long> map, int n) {
        memo = map;
        try {
            System.out.printf("%-26s fib(%d) = %d%n", label, n, fib(n));
        } catch (RuntimeException e) {
            StackTraceElement where = e.getStackTrace()[0];
            System.out.printf("%-26s fib(%d) -> %s: %s  (in %s)%n", label, n, e.getClass().getSimpleName(),
                    e.getMessage(), where.getMethodName());
        }
    }

    public static void main(String[] args) {
        attempt("CHM default", new ConcurrentHashMap<>(), 13);
        attempt("CHM default", new ConcurrentHashMap<>(), 14);
        attempt("CHM default", new ConcurrentHashMap<>(), 30);
        attempt("CHM presized for 1000", new ConcurrentHashMap<>(1000), 30);
        attempt("HashMap", new HashMap<>(), 30);

        ConcurrentHashMap<Integer, Integer> m = new ConcurrentHashMap<>();             // 16 bins
        try {
            m.computeIfAbsent(1, k -> m.computeIfAbsent(17, j -> 2));                  // 17 & 15 == 1: same bin
        } catch (IllegalStateException e) {
            System.out.println("same bin (1 and 17)        -> IllegalStateException: " + e.getMessage());
        }
        ConcurrentHashMap<Integer, Integer> m2 = new ConcurrentHashMap<>();
        m2.computeIfAbsent(1, k -> m2.computeIfAbsent(2, j -> 2));                     // different bins
        System.out.println("different bins (1 and 2)   -> no exception, map " + m2);
    }
}`,
        },
        {
          type: "output",
          text: `CHM default                fib(13) = 233
CHM default                fib(14) -> IllegalStateException: Recursive update  (in transfer)
CHM default                fib(30) -> IllegalStateException: Recursive update  (in computeIfAbsent)
CHM presized for 1000      fib(30) = 832040
HashMap                    fib(30) -> ConcurrentModificationException: null  (in computeIfAbsent)
same bin (1 and 17)        -> IllegalStateException: Recursive update
different bins (1 and 2)   -> no exception, map {1=2, 2=2}`,
        },
        {
          type: "list",
          items: [
            "**`fib(13)` worked and `fib(14)` threw `IllegalStateException: Recursive update`.** Nothing about Fibonacci changed between 13 and 14: the 12th entry triggered a resize, and `transfer`, copying bins while this thread was inside a function that owns a `ReservationNode`, found the reservation and threw (\"in transfer\").",
            "**`fib(30)` threw from `computeIfAbsent` itself**: the recursion reached a key in the same bin as one it had reserved (with 16 bins, 17 and 1 share bin 1).",
            "**Presized for 1,000 entries, `fib(30)` succeeded silently.** No resize, and every key in its own bin, so neither check fired. The code is exactly as wrong as before (the Javadoc forbids it), but the detection is best-effort and depends on bins and timing. A test with a big map can pass while production throws.",
            "**`HashMap` throws `ConcurrentModificationException`** for the same mistake (since Java 9), with no message.",
            "**The last two lines isolate the rule**: a nested `computeIfAbsent` on a key in the **same** bin throws; on a key in a **different** bin it ran without complaint. The fix for memoisation is to compute outside the map (a loop from the bottom up, or `get` then compute then `putIfAbsent`), never to rely on which bin a key falls in.",
          ],
        },
        {
          type: "heading",
          text: "A function that updates another key: deadlock",
        },
        {
          type: "code",
          language: "java",
          title: "NestedCompute.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

public class NestedCompute {
    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<String, Long> walletPaise = new ConcurrentHashMap<>();
        walletPaise.put("asha", 50_000L);
        walletPaise.put("ravi", 50_000L);
        CountDownLatch bothInside = new CountDownLatch(2);

        // transfer(from, to): debit inside compute(from), and credit 'to' from inside that function
        Runnable ashaPaysRavi = () -> walletPaise.compute("asha", (k, bal) -> {
            bothInside.countDown();
            try { bothInside.await(); } catch (InterruptedException e) { }
            walletPaise.compute("ravi", (k2, b2) -> b2 + 10_000);    // another key, inside compute
            return bal - 10_000;
        });
        Runnable raviPaysAsha = () -> walletPaise.compute("ravi", (k, bal) -> {
            bothInside.countDown();
            try { bothInside.await(); } catch (InterruptedException e) { }
            walletPaise.compute("asha", (k2, b2) -> b2 + 5_000);
            return bal - 5_000;
        });
        Thread t1 = new Thread(ashaPaysRavi, "pay-asha-to-ravi");
        Thread t2 = new Thread(raviPaysAsha, "pay-ravi-to-asha");
        t1.setDaemon(true); t2.setDaemon(true);
        t1.start(); t2.start();
        t1.join(2_000); t2.join(2_000);

        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        long[] stuck = mx.findDeadlockedThreads();
        System.out.println("finished: " + !t1.isAlive() + ", deadlocked threads: " + (stuck == null ? 0 : stuck.length));
        if (stuck != null) {
            for (ThreadInfo info : mx.getThreadInfo(stuck)) {
                System.out.println("  " + info.getThreadName() + " " + info.getThreadState() + " on " + info.getLockName()
                        + " held by " + info.getLockOwnerName());
            }
        }
        System.out.println("get still works: " + walletPaise.get("asha") + " " + walletPaise.get("ravi"));
    }
}`,
        },
        {
          type: "output",
          text: `finished: false, deadlocked threads: 2
  pay-asha-to-ravi BLOCKED on java.util.concurrent.ConcurrentHashMap$Node@7699a589 held by pay-ravi-to-asha
  pay-ravi-to-asha BLOCKED on java.util.concurrent.ConcurrentHashMap$Node@6acbcfc0 held by pay-asha-to-ravi
get still works: 50000 50000`,
        },
        {
          type: "list",
          items: [
            "**Each transfer debits inside `compute(from)` and credits with a nested `compute(to)`.** Asha paying Ravi holds Asha's bin and wants Ravi's; Ravi paying Asha holds Ravi's and wants Asha's. Both threads are `BLOCKED` forever, and `ThreadMXBean.findDeadlockedThreads()` reports both, each waiting for a `ConcurrentHashMap$Node` monitor held by the other.",
            "**`get` still worked** and returned the old balances, 50,000 each: readers never notice the deadlock, which makes it harder to spot. Only writes to those two bins hang, along with everything that later waits on them.",
            "The latch makes the timing certain here; in production the same code deadlocks only when two opposite transfers overlap, which can take weeks of traffic. If two keys must change together, the map is the wrong tool: use a lock with a fixed ordering (lesson 21) or, for money, a database transaction (lesson 23).",
          ],
        },
      ],
    },
    {
      title: "The Values Must Be Thread-Safe Too",
      blocks: [
        {
          type: "paragraph",
          text: "`computeIfAbsent(zone, z -> new ArrayList<>()).add(trip)` looks atomic, and it's the standard grouping idiom from HashMap Internals. But only the `computeIfAbsent` is atomic. It returns the list and releases the bin lock, and then `add` runs on a plain `ArrayList` that eight threads share:",
        },
        {
          type: "code",
          language: "java",
          title: "MutableValues.java",
          code: `import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiConsumer;

public class MutableValues {
    static final String[] ZONES = {"SALT-LAKE", "NEW-TOWN", "PARK-STREET", "HOWRAH"};

    // 8 threads each record 20,000 trip ids under 4 zones
    static void run(String label, BiConsumer<String, Long> record, Map<String, ? extends Collection<Long>> map)
            throws InterruptedException {
        AtomicInteger errors = new AtomicInteger();
        java.util.Set<String> kinds = ConcurrentHashMap.newKeySet();
        CountDownLatch go = new CountDownLatch(1);
        Thread[] ts = new Thread[8];
        for (int t = 0; t < ts.length; t++) {
            int id = t;
            ts[t] = new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int i = 0; i < 20_000; i++) {
                    try { record.accept(ZONES[i % 4], id * 1_000_000L + i); }
                    catch (RuntimeException e) { errors.incrementAndGet(); kinds.add(e.getClass().getSimpleName()); }
                }
            });
            ts[t].start();
        }
        long start = System.nanoTime();
        go.countDown();
        for (Thread t : ts) t.join();
        long ms = (System.nanoTime() - start) / 1_000_000;
        int total = 0, nulls = 0;
        for (Collection<Long> c : map.values()) for (Object x : c.toArray()) { if (x == null) nulls++; else total++; }
        System.out.printf("%-40s recorded %,7d of 160,000  nulls %,5d  exceptions %d  %5d ms%n",
                label, total, nulls, errors.get(), ms);
        if (!kinds.isEmpty()) System.out.println("    " + kinds);
    }

    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<String, List<Long>> a = new ConcurrentHashMap<>();
        run("computeIfAbsent(z, ArrayList::new).add", (z, trip) -> a.computeIfAbsent(z, k -> new ArrayList<>()).add(trip), a);

        ConcurrentHashMap<String, Collection<Long>> b = new ConcurrentHashMap<>();
        run("... new ConcurrentLinkedQueue<>()).add", (z, trip) -> b.computeIfAbsent(z, k -> new ConcurrentLinkedQueue<>()).add(trip), b);

        ConcurrentHashMap<String, List<Long>> c = new ConcurrentHashMap<>();
        run("... new CopyOnWriteArrayList<>()).add", (z, trip) -> c.computeIfAbsent(z, k -> new CopyOnWriteArrayList<>()).add(trip), c);

        ConcurrentHashMap<String, List<Long>> d = new ConcurrentHashMap<>();
        run("compute(z, add inside the lock)", (z, trip) -> d.compute(z, (k, list) -> {
            if (list == null) list = new ArrayList<>();
            list.add(trip);                                // mutation happens while the bin is locked
            return list;
        }), d);
    }
}`,
        },
        {
          type: "output",
          text: `computeIfAbsent(z, ArrayList::new).add   recorded 135,369 of 160,000  nulls     8  exceptions 0     19 ms
... new ConcurrentLinkedQueue<>()).add   recorded 160,000 of 160,000  nulls     0  exceptions 0     31 ms
... new CopyOnWriteArrayList<>()).add    recorded 160,000 of 160,000  nulls     0  exceptions 0   1135 ms
compute(z, add inside the lock)          recorded 160,000 of 160,000  nulls     0  exceptions 0     26 ms`,
        },
        {
          type: "list",
          items: [
            "**The `ArrayList` version lost 24,631 of 160,000 trip IDs** in this run, and between 15,181 and 53,884 over 14 runs. Some runs also left `null` slots in the lists (up to 6,014: `size` was incremented but the element write was lost) or threw `ArrayIndexOutOfBoundsException` inside `add` (up to 31,679 times in one run). One run even made a later single-threaded iteration throw `ConcurrentModificationException`, because the list's `size` had grown past its array.",
            "**`ConcurrentLinkedQueue` as the value was exact and fast** (31 to 104 ms): the map hands out one queue per zone, and the queue is safe for concurrent `add`.",
            "**`CopyOnWriteArrayList` was exact and 30 to 40 times slower** (1,121 to 1,367 ms): every `add` copies the whole array, and these lists grew to 40,000 elements. It's for read-mostly lists (lesson 13), not for collecting.",
            "**Doing the `add` inside `compute` was exact and fast** (22 to 50 ms), because the mutation happens under the bin lock. But only writers are protected: a reader that does `map.get(zone)` and iterates the `ArrayList` while another thread is inside `compute` still races with the `add`. It's safe only if all access, reads included, goes through `compute`.",
            "**Immutable values are the other safe option**: `merge(zone, List.of(trip), (a, b) -> concat(a, b))` replaces the list instead of changing it, so readers always see a complete list. Each `merge` copies the list, which is fine for small lists and too slow for 40,000 elements. The same reasoning explains why the `Integer` and `Long` counters above are safe with `merge`: wrapper objects are immutable, and `merge` replaces them.",
          ],
        },
      ],
    },
    {
      title: "Bulk Operations and Key Sets",
      blocks: [
        {
          type: "paragraph",
          text: "Java 8 gave `ConcurrentHashMap` its own parallel bulk operations: `forEach`, `search` and `reduce` (with `Keys`, `Values`, `Entries` and `ToLong`/`ToInt`/`ToDouble` variants). Each takes a **`parallelismThreshold`**: if the map has fewer entries than the threshold, the operation runs on the calling thread; otherwise it splits the table and runs on the common `ForkJoinPool`. `Long.MAX_VALUE` means \"never parallel\", `1` means \"as parallel as possible\".",
        },
        {
          type: "code",
          language: "java",
          title: "BulkOps.java",
          code: `import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ForkJoinPool;

public class BulkOps {
    record Trip(long id, String zone, long farePaise) {}

    public static void main(String[] args) {
        String[] zones = {"SALT-LAKE", "NEW-TOWN", "PARK-STREET", "HOWRAH"};
        ConcurrentHashMap<Long, Trip> trips = new ConcurrentHashMap<>();
        for (long id = 0; id < 2_000_000; id++) trips.put(id, new Trip(id, zones[(int) (id % 4)], 10_000 + id % 50_000));
        System.out.println("commonPool parallelism " + ForkJoinPool.commonPool().getParallelism());

        for (long threshold : new long[] {Long.MAX_VALUE, 1}) {
            Set<String> threads = ConcurrentHashMap.newKeySet();
            trips.forEach(threshold, (id, trip) -> {
                if (id % 1000 == 0) threads.add(Thread.currentThread().getName().replaceAll("\\\\d+$", "N"));
            });
            long best = Long.MAX_VALUE, total = 0;
            for (int rep = 0; rep < 5; rep++) {
                long t = System.nanoTime();
                total = trips.reduceValuesToLong(threshold, Trip::farePaise, 0L, Long::sum);
                best = Math.min(best, System.nanoTime() - t);
            }
            System.out.printf("threshold %-20d sum %,d paise  best %3d ms  threads %s%n",
                    threshold, total, best / 1_000_000, threads);
        }

        Trip big = trips.search(10_000, (id, trip) -> trip.farePaise() == 59_999 && trip.zone().equals("HOWRAH") ? trip : null);
        System.out.println("search: " + big + " (any match, not the first)");
        String longest = trips.reduceValues(10_000, Trip::zone, (a, b) -> a.length() >= b.length() ? a : b);
        System.out.println("reduce: longest zone name " + longest);
        trips.forEach(10_000, (id, trip) -> { if (id == 7) System.out.println("forEach on " + Thread.currentThread().getName().replaceAll("\\\\d+$", "N") + ": " + trip); });

        Set<Long> onlineDrivers = ConcurrentHashMap.newKeySet();          // a concurrent Set
        onlineDrivers.add(42L);
        System.out.println("newKeySet: " + onlineDrivers + " " + onlineDrivers.getClass().getSimpleName());
        ConcurrentHashMap<String, Boolean> flags = new ConcurrentHashMap<>();
        Set<String> view = flags.keySet(Boolean.TRUE);                    // add() puts the default value
        view.add("SALT-LAKE");
        System.out.println("keySet(TRUE).add: " + flags + ", mappingCount " + trips.mappingCount());
    }
}`,
        },
        {
          type: "output",
          text: `commonPool parallelism 7
threshold 9223372036854775807  sum 69,999,000,000 paise  best  20 ms  threads [main]
threshold 1                    sum 69,999,000,000 paise  best   9 ms  threads [ForkJoinPool.commonPool-worker-N, main]
search: Trip[id=1049999, zone=HOWRAH, farePaise=59999] (any match, not the first)
reduce: longest zone name PARK-STREET
forEach on main: Trip[id=7, zone=HOWRAH, farePaise=10007]
newKeySet: [42] KeySetView
keySet(TRUE).add: {SALT-LAKE=true}, mappingCount 2000000`,
        },
        {
          type: "list",
          items: [
            "**Threshold `Long.MAX_VALUE` ran on `main` only, threshold `1` on `main` plus the common pool's workers**, and summing 2 million fares went from 20 ms to 9 ms (20 to 23 against 8 to 9 in four runs). The common pool has 7 workers on this 8-core machine.",
            "**`search` returns any match, not the first.** Several trips are HOWRAH fares of 59,999 paise; the parallel search returned trip 1,049,999 in every run here, but that's an accident of how the work was split. A `search` function must return non-null only for results you'd accept from any matching entry.",
            "**Bulk operations are weakly consistent like iterators**: concurrent updates may or may not be included, and a `reduce` over a changing map isn't a snapshot (the Internals lesson's wallet total showed that).",
            "**`ConcurrentHashMap.newKeySet()` is the concurrent `HashSet`**, backed by a `ConcurrentHashMap<K, Boolean>`; its class is `KeySetView`. `add` returns `false` if the element was present, atomically, which makes it a deduplication primitive. `keySet(Boolean.TRUE)` gives a key-set view of an existing map whose `add` inserts the key with that default value.",
            "**`mappingCount()` returns a `long`**; prefer it to `size()` for maps that could exceed `Integer.MAX_VALUE` entries.",
            "Functions passed to bulk operations run on pool threads, so they must not block and must not depend on thread-local state. They also shouldn't modify the map.",
          ],
        },
      ],
    },
    {
      title: "ConcurrentHashMap as a Cache",
      blocks: [
        {
          type: "paragraph",
          text: "`computeIfAbsent` makes `ConcurrentHashMap` look like a cache: load on a miss, at most once per key, then hit. What it doesn't have is everything a cache needs to stay a cache: no maximum size, no expiry, no eviction, no statistics. With keys that keep changing, it's a memory leak with a good API. Fare quotes cached by exact pickup coordinates:",
        },
        {
          type: "code",
          language: "java",
          title: "UnboundedCache.java",
          code: `import java.util.concurrent.ConcurrentHashMap;

public class UnboundedCache {
    record Quote(long farePaise, long expiresAtMs) {}

    static long usedMb() {
        Runtime rt = Runtime.getRuntime();
        System.gc();
        return (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
    }

    static Quote price(String key, long nowMs) { return new Quote(15_000 + key.length(), nowMs + 60_000); }

    public static void main(String[] args) {
        // Fare quotes cached by exact pickup coordinates: almost every request is a new key
        ConcurrentHashMap<String, Quote> naive = new ConcurrentHashMap<>();
        ConcurrentHashMap<String, Quote> swept = new ConcurrentHashMap<>();
        long clockMs = 0;                                   // simulated time: one request per millisecond
        for (int i = 1; i <= 3_000_000; i++, clockMs++) {
            String key = String.format("22.%06d,88.%06d", i % 999_983, i * 7 % 999_979);
            long now = clockMs;
            naive.computeIfAbsent(key, k -> price(k, now));
            swept.computeIfAbsent(key, k -> price(k, now));
            if (i % 10_000 == 0) swept.values().removeIf(q -> q.expiresAtMs() < now);   // a sweep every 10 s
            if (i % 1_000_000 == 0) {
                long naiveMb = usedMb();
                System.out.printf("after %,d requests: naive %,9d entries | with TTL sweep %,7d entries | heap used %d MB%n",
                        i, naive.size(), swept.size(), naiveMb);
            }
        }
        naive.clear();
        System.out.println("heap used with only the swept cache left: " + usedMb() + " MB");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx1g UnboundedCache",
        },
        {
          type: "output",
          text: `after 1,000,000 requests: naive 1,000,000 entries | with TTL sweep  60,001 entries | heap used 137 MB
after 2,000,000 requests: naive 2,000,000 entries | with TTL sweep  60,001 entries | heap used 268 MB
after 3,000,000 requests: naive 3,000,000 entries | with TTL sweep  60,001 entries | heap used 391 MB
heap used with only the swept cache left: 18 MB`,
        },
        {
          type: "list",
          items: [
            "**The naive cache grew by about 130 MB per million requests** and would have hit any heap limit. With 3 million requests, every one a new key, the hit rate was zero: a cache that only costs memory.",
            "**A TTL sweep kept it flat at 60,001 entries**, the quotes from the last 60 seconds of simulated time. `values().removeIf(...)` is safe on a `ConcurrentHashMap` while other threads read and write (weakly consistent, no `ConcurrentModificationException`). It's the smallest thing that works, not a design: the sweep is O(n) every 10 seconds, and nothing bounds the size if traffic spikes.",
            "**For a real cache, use a cache library.** Caffeine (conceptually, a `ConcurrentHashMap` plus a size or weight bound, expiry after write or access, refresh, an admission and eviction policy based on access frequency, and hit-rate statistics) gives you `cache.get(key, loader)` with the same once-per-key loading as `computeIfAbsent`. I haven't measured it in this lesson; the point is which problems a plain map leaves to you.",
            "**Choose keys that repeat.** Rounding coordinates to a zone or a geohash cell turns millions of one-off keys into a few thousand reusable ones, and that fixes the hit rate as well as the memory.",
            "**`ConcurrentSkipListMap`** is the sorted alternative (range queries, ordered iteration, \"all drivers by ETA\"), with O(log n) operations and no `computeIfAbsent`-once guarantee, as `CallsOnce` showed. It belongs to lesson 14, ConcurrentLinkedQueue, ConcurrentLinkedDeque and ConcurrentSkipListMap.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `trips.merge(\"ravi\", 1, Integer::sum)` when two consumer threads call it at the same moment and Ravi's count is 7, as in the image above:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Both threads check arguments and hash.** `merge` rejects a `null` key, value or function, then computes `spread(\"ravi\".hashCode())` and the bin index.",
            "**Both read the bin with `tabAt`.** It holds Ravi's node, whose hash isn't `MOVED`, so there's no resize to help with.",
            "**Both try to lock the first node.** Consumer-1 gets the monitor. Consumer-2 goes `BLOCKED (on object monitor)`, waiting for the same `ConcurrentHashMap$Node`.",
            "**Consumer-1 re-checks the bin** (`tabAt` again) to make sure the node it locked is still the head, then walks the chain and finds `ravi` with value 7.",
            "**Consumer-1 calls the function** `Integer.sum(7, 1)` while holding the lock. Had the function been slow, consumer-2 (and any writer to another key in this bin) would wait the whole time.",
            "**Consumer-1 stores 8** with a volatile write to the node's `val`, and releases the monitor. Any `get` from now on returns 8.",
            "**Consumer-2 acquires the monitor**, re-checks the head, finds `ravi` with 8, calls `Integer.sum(8, 1)` and stores 9.",
            "**If the function had returned `null`**, the node would have been unlinked and `addCount(-1)` called. If the key had been absent, `merge` would have stored the given value (1) without calling the function, through a CAS for an empty bin or under the lock otherwise.",
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
          code: `ConcurrentHashMap<String, Long> m = new ConcurrentHashMap<>();

// claim once
boolean won = m.putIfAbsent("trip-9001", 42L) == null;

// count
m.merge("SALT-LAKE", 1L, Long::sum);
ConcurrentHashMap<String, LongAdder> hot = new ConcurrentHashMap<>();
hot.computeIfAbsent("SALT-LAKE", k -> new LongAdder()).increment();

// create on first use (function runs at most once per key, under the bin lock: keep it short)
m.computeIfAbsent("ravi", id -> 0L);

// update from the old value
m.compute("ravi", (id, n) -> n == null ? 1 : n + 1);
m.computeIfPresent("ravi", (id, n) -> n > 1 ? n - 1 : null);          // null removes

// compare-and-set loop
for (Long cur = m.get("ravi"); cur != null && !m.replace("ravi", cur, cur + 1); cur = m.get("ravi")) { }

// conditional remove
m.remove("ravi", 0L);

// concurrent set and bulk operations
Set<String> seen = ConcurrentHashMap.newKeySet();
if (seen.add(eventId)) handle(eventId);
long total = m.reduceValuesToLong(10_000, Long::longValue, 0L, Long::sum);`,
        },
        {
          type: "paragraph",
          text: "Two rules cover most of it: one call per decision (never a `get` or `containsKey` followed by a write), and functions passed to the map must be short, must not block and must not touch the map.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Counting trips per zone three ways",
        },
        {
          type: "code",
          language: "java",
          title: "ZoneCounts.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class ZoneCounts {
    public static void main(String[] args) {
        String[] zones = {"SALT-LAKE", "NEW-TOWN", "PARK-STREET", "HOWRAH", "GARIA", "DUM-DUM"};
        Random r = new Random(11);
        List<String> log = IntStream.range(0, 3_000_000).mapToObj(i -> zones[r.nextInt(zones.length)]).toList();

        ConcurrentHashMap<String, Long> merged = new ConcurrentHashMap<>();
        log.parallelStream().forEach(z -> merged.merge(z, 1L, Long::sum));

        ConcurrentHashMap<String, LongAdder> adders = new ConcurrentHashMap<>();
        log.parallelStream().forEach(z -> adders.computeIfAbsent(z, k -> new LongAdder()).increment());

        ConcurrentMap<String, Long> grouped = log.parallelStream()
                .collect(Collectors.groupingByConcurrent(Function.identity(), Collectors.counting()));

        Map<String, Long> fromAdders = adders.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().sum()));
        System.out.println("merge:                " + new java.util.TreeMap<>(merged));
        System.out.println("LongAdder:            same=" + fromAdders.equals(merged));
        System.out.println("groupingByConcurrent: same=" + grouped.equals(merged));
    }
}`,
        },
        {
          type: "output",
          text: `merge:                {DUM-DUM=499817, GARIA=499804, HOWRAH=500659, NEW-TOWN=499535, PARK-STREET=500008, SALT-LAKE=500177}
LongAdder:            same=true
groupingByConcurrent: same=true`,
        },
        {
          type: "list",
          items: [
            "Three million log lines counted by a parallel stream with `merge`, with `LongAdder` values, and with `Collectors.groupingByConcurrent(identity(), counting())`: all three agree, to the trip, on every run (the log is generated from a fixed seed).",
            "`groupingByConcurrent` collects into a `ConcurrentHashMap` shared by all stream threads instead of merging per-thread maps; it's the stream-native way to do this and doesn't keep encounter order, which counting doesn't need.",
            "With only six keys, every thread hits the same six counters constantly: the hot-key case where `LongAdder` shines (see Performance).",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Deduplicating webhook deliveries",
        },
        {
          type: "code",
          language: "java",
          title: "WebhookDedup.java",
          code: `import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class WebhookDedup {
    public static void main(String[] args) throws Exception {
        // The payment gateway retries: every "payment.captured" event arrives 3 times, on different threads
        Set<String> processed = ConcurrentHashMap.newKeySet();
        Set<String> racyProcessed = ConcurrentHashMap.newKeySet();
        AtomicInteger credited = new AtomicInteger(), racyCredited = new AtomicInteger();
        CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(6);
        for (int t = 0; t < 6; t++) {
            new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int copy = 0; copy < 3; copy++) {
                    for (int i = 0; i < 20_000; i++) {
                        String eventId = "evt_" + i;
                        if (processed.add(eventId)) credited.incrementAndGet();           // add() is the check AND the act
                        if (!racyProcessed.contains(eventId)) {                           // check...
                            racyProcessed.add(eventId);                                   // ...then act
                            racyCredited.incrementAndGet();
                        }
                    }
                }
                done.countDown();
            }).start();
        }
        go.countDown();
        done.await();
        System.out.printf("add() result:        %,d events, %,d wallets credited%n", processed.size(), credited.get());
        System.out.printf("contains() then add: %,d events, %,d wallets credited%n", racyProcessed.size(), racyCredited.get());
    }
}`,
        },
        {
          type: "output",
          text: `add() result:        20,000 events, 20,000 wallets credited
contains() then add: 20,000 events, 20,833 wallets credited`,
        },
        {
          type: "list",
          items: [
            "**`processed.add(eventId)` is the check and the act in one call**: exactly 20,000 wallets credited for 20,000 distinct events delivered three times each by six threads.",
            "**`contains` then `add` credited 20,833 wallets** (20,247 to 32,563 over five runs): usually a few hundred riders paid twice, and in one run 12,563. The set ended up with the right 20,000 IDs, so inspecting it would show nothing wrong.",
            "An in-memory set only deduplicates within one JVM and is lost on restart. The Idempotency and Webhooks lesson in the System Design track, and lesson 24 here, store the processed IDs in the database with a unique constraint, which works across servers.",
          ],
        },
        {
          type: "heading",
          text: "Example 3: Memoisation without recursive updates",
        },
        {
          type: "paragraph",
          text: "The fix for `RecursiveUpdate` is to stop calling the map from inside its own function. For Fibonacci the simplest version fills the cache bottom-up, so every `computeIfAbsent` finds its inputs already present and never recurses:",
        },
        {
          type: "code",
          language: "java",
          title: "SafeMemo.java",
          code: `import java.util.concurrent.ConcurrentHashMap;

public class SafeMemo {
    static final ConcurrentHashMap<Integer, Long> MEMO = new ConcurrentHashMap<>();

    // Bottom-up: when n is computed, n - 1 and n - 2 are already in the map, so the function only reads
    static long fib(int n) {
        if (n < 2) return n;
        for (int i = 2; i <= n; i++) MEMO.computeIfAbsent(i, x -> value(x - 1) + value(x - 2));
        return MEMO.get(n);
    }

    static long value(int i) { return i < 2 ? i : MEMO.get(i); }   // a plain get: never an update

    public static void main(String[] args) {
        System.out.println("fib(14) = " + fib(14));
        System.out.println("fib(90) = " + fib(90) + ", map size " + MEMO.size());
    }
}`,
        },
        {
          type: "output",
          text: `fib(14) = 377
fib(90) = 2880067194370816120, map size 89`,
        },
        {
          type: "paragraph",
          text: "When the dependencies aren't known in advance (a fare rule that depends on other rules, say), the general pattern is: `get`, and on a miss compute the value **outside** the map (recursion is fine there), then `putIfAbsent` and use whatever the map ends up holding. Two threads may compute the same value; only one is stored. If the computation is expensive enough that doing it twice matters, cache a `CompletableFuture` instead, as the production section does.",
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
            ["Do something only for the first caller", "`putIfAbsent(k, v) == null`, `newKeySet().add(x)`", "`containsKey` / `contains` then `put` / `add`"],
            ["Counter per key, moderate contention", "`merge(k, 1L, Long::sum)` or `computeIfAbsent(k, x -> new AtomicLong())`", "`get` then `put`"],
            ["Counter per key, a few very hot keys", "`computeIfAbsent(k, x -> new LongAdder()).increment()`", "`merge` on a hot key"],
            ["Create an object on first use", "`computeIfAbsent` with a fast, side-effect-free function", "`putIfAbsent(k, new Expensive())`, which builds it every time"],
            ["Load from a slow source", "`computeIfAbsent(k, x -> supplyAsync(load, pool))` then `join` outside, or a cache library", "The slow call inside `computeIfAbsent`"],
            ["Update depending on the old value", "`compute`, or a `replace(k, old, new)` loop when most updates are no-ops", "Reading, computing, `put`"],
            ["Group values by key", "`computeIfAbsent(k, x -> new ConcurrentLinkedQueue<>()).add(v)`", "`ArrayList` values mutated outside the lock"],
            ["Change two keys together", "A lock, one key holding both values, or a database transaction", "Nested `compute` calls"],
            ["A bounded cache with expiry", "A cache library such as Caffeine", "A bare `ConcurrentHashMap` with ever-new keys"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Assuming a thread-safe map makes your code thread-safe",
        },
        {
          type: "paragraph",
          text: "Each call is atomic; your sequence of calls isn't. `containsKey` then `put` gave up to 13,465 extra winners in 10,000 trips, and `get` then `put` lost up to 13% of 8 million increments, all on `ConcurrentHashMap`.",
        },
        {
          type: "heading",
          text: "Doing slow work inside computeIfAbsent, compute or merge",
        },
        {
          type: "paragraph",
          text: "Remote calls, database queries, file I/O and `Thread.sleep` inside the function hold the bin lock for their whole duration. Other keys in that bin waited 1,988 ms in `SameBinStall`. Load outside the lock, or store a future.",
        },
        {
          type: "heading",
          text: "Touching the map from inside its own function",
        },
        {
          type: "paragraph",
          text: "Recursive `computeIfAbsent` throws `IllegalStateException: Recursive update` when it hits the same bin or a resize, and silently \"works\" otherwise, so tests can pass with a presized map. Updating a different key from inside `compute` can deadlock with another thread doing the opposite.",
        },
        {
          type: "heading",
          text: "Storing mutable, non-thread-safe values",
        },
        {
          type: "paragraph",
          text: "`computeIfAbsent(k, x -> new ArrayList<>()).add(v)` lost up to a third of the adds and threw `ArrayIndexOutOfBoundsException`. Use concurrent collections or atomic counters as values, mutate only inside `compute`, or replace immutable values with `merge`.",
        },
        {
          type: "heading",
          text: "Using putIfAbsent with an expensive argument",
        },
        {
          type: "paragraph",
          text: "`putIfAbsent(k, loadProfile(k))` calls `loadProfile` on every call, hit or miss, because arguments are evaluated first. Use `computeIfAbsent`.",
        },
        {
          type: "heading",
          text: "Relying on the return value of put or get for decisions",
        },
        {
          type: "paragraph",
          text: "`if (map.put(k, v) == null)` does tell you whether you inserted, but by the time you act on it, other threads may have replaced the value. Act on the return values of the conditional methods (`putIfAbsent`, `replace`, `remove(k, v)`), which describe what your own call did.",
        },
        {
          type: "heading",
          text: "Using LongAdder everywhere, or AtomicLong everywhere",
        },
        {
          type: "paragraph",
          text: "With 64 keys and little contention, `AtomicLong` values were 1.4 to 2.2 times as fast as `LongAdder`; with one hot key, `LongAdder` was 4 to 7 times faster than `AtomicLong`. Pick by measured contention, and remember `LongAdder.sum()` isn't an atomic snapshot.",
        },
        {
          type: "heading",
          text: "Treating ConcurrentHashMap as a cache",
        },
        {
          type: "paragraph",
          text: "No size bound, no expiry, no eviction. With keys that never repeat it grew by about 130 MB per million requests. Use a cache library, or at least design repeating keys and a sweep.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Make each decision with one call: `putIfAbsent`, `computeIfAbsent`, `compute`, `merge`, `replace(k, old, new)`, `remove(k, v)`, `Set.add`.",
            "Keep functions passed to the map short, non-blocking and free of side effects; never call the same map (or another lock) from inside them.",
            "Load slow values outside the lock: store a `CompletableFuture` with `computeIfAbsent` and `join` it after the call returns, and remove failed futures so errors aren't cached forever.",
            "Use thread-safe values: `AtomicLong`, `LongAdder`, `ConcurrentLinkedQueue`, `ConcurrentHashMap.newKeySet()`, or immutable values replaced with `merge`.",
            "Choose `merge` for simple counters, `AtomicLong` values for many lightly contended keys, and `LongAdder` values for a few hot keys; measure before switching.",
            "Keep multi-key invariants out of the map: one lock with a fixed order, one value holding the related state, or a database transaction.",
            "Use bulk operations with a deliberate `parallelismThreshold` (`Long.MAX_VALUE` for small maps or latency-sensitive threads), and remember `search` returns any match.",
            "Don't use a bare map as a cache for unbounded key spaces; use a cache library and export its hit rate.",
            "In code review, flag `containsKey`, `get` or `contains` followed by a write to the same map, and any `computeIfAbsent` whose function does I/O.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "`Counters` measured 64 lightly contended keys. The opposite case is one hot key, like the trip counter for SALT-LAKE at peak hour: eight threads, 2 million increments each, best of five:",
        },
        {
          type: "code",
          language: "java",
          title: "HotKey.java",
          code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

public class HotKey {
    // 8 threads x 2M increments of ONE key ("SALT-LAKE" at peak hour); best of 5
    static long best(Runnable increment) throws InterruptedException {
        long best = Long.MAX_VALUE;
        for (int rep = 0; rep < 5; rep++) {
            CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(8);
            for (int t = 0; t < 8; t++) {
                new Thread(() -> {
                    try { go.await(); } catch (InterruptedException e) { return; }
                    for (int i = 0; i < 2_000_000; i++) increment.run();
                    done.countDown();
                }).start();
            }
            long start = System.nanoTime();
            go.countDown();
            done.await();
            best = Math.min(best, System.nanoTime() - start);
        }
        return best / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<String, Long> m = new ConcurrentHashMap<>();
        System.out.printf("%-34s %5d ms%n", "merge(k, 1L, Long::sum)", best(() -> m.merge("SALT-LAKE", 1L, Long::sum)));
        ConcurrentHashMap<String, Long> c = new ConcurrentHashMap<>();
        System.out.printf("%-34s %5d ms%n", "compute(k, n + 1)", best(() -> c.compute("SALT-LAKE", (k, n) -> n == null ? 1 : n + 1)));
        ConcurrentHashMap<String, AtomicLong> a = new ConcurrentHashMap<>();
        System.out.printf("%-34s %5d ms%n", "computeIfAbsent -> AtomicLong", best(() -> a.computeIfAbsent("SALT-LAKE", k -> new AtomicLong()).incrementAndGet()));
        ConcurrentHashMap<String, LongAdder> l = new ConcurrentHashMap<>();
        System.out.printf("%-34s %5d ms%n", "computeIfAbsent -> LongAdder", best(() -> l.computeIfAbsent("SALT-LAKE", k -> new LongAdder()).increment()));
        System.out.println("totals " + m.get("SALT-LAKE") + " " + c.get("SALT-LAKE") + " " + a.get("SALT-LAKE") + " " + l.get("SALT-LAKE").sum());
    }
}`,
        },
        {
          type: "output",
          text: `merge(k, 1L, Long::sum)             1016 ms
compute(k, n + 1)                    939 ms
computeIfAbsent -> AtomicLong        489 ms
computeIfAbsent -> LongAdder          71 ms
totals 80000000 80000000 80000000 80000000`,
        },
        {
          type: "list",
          items: [
            "**On one hot key, `LongAdder` was 6 to 14 times faster than `merge` or `compute`** (71 to 128 ms against 666 to 1,016 ms over four runs), and 4 to 7 times faster than `AtomicLong` (449 to 529 ms). Every `merge` serializes on the bin's monitor; every `AtomicLong` increment fights for one cache line with CAS retries; `LongAdder` spreads the increments over cells, one per contending thread.",
            "**With 64 keys (`Counters`) the order was different**: `AtomicLong` 50 to 106 ms, `LongAdder` 74 to 152 ms, `merge`/`compute` 114 to 217 ms. Low contention per counter favours the simplest CAS.",
            "**`computeIfAbsent` was nearly free in both cases**: after the first call it returns from the lock-free first-node check, so the cost is the counter's own.",
            "All four produced the exact total, 80,000,000 (8 threads, 2 million, 5 repetitions). The lossy `get`-then-`put` version isn't in this table because its speed doesn't matter.",
            "Single machine, `System.nanoTime`, best of five, with other benchmarks running; I ran `HotKey` four times and the ranking never changed, but the ratios moved by a factor of two.",
          ],
        },
      ],
    },
    {
      title: "ConcurrentHashMap Atomic Operations in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Two bugs from the same driver-location service as the Internals lesson's production story, after it had moved to `ConcurrentHashMap`.",
        },
        {
          type: "heading",
          text: "Story 1: trip counters that underpaid bonuses",
        },
        {
          type: "paragraph",
          text: "The service also counted completed trips per driver for the daily incentive: 12 trips earn a Rs 150 bonus. Trip-completed events arrive from a message broker and are processed by 8 consumer threads. The counter was `Long n = trips.get(driverId); trips.put(driverId, n == null ? 1 : n + 1);` on a `ConcurrentHashMap`. Support tickets from drivers who were sure they'd done 12 trips were closed as \"system shows 11\". I rebuilt the day: 2,000 drivers, exactly 12 trips each, shuffled:",
        },
        {
          type: "code",
          language: "java",
          title: "TripCounter.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.LongConsumer;

public class TripCounter {
    static final int DRIVERS = 2_000, TRIPS_EACH = 12, BONUS_AT = 12;   // 12 trips today -> Rs 150 bonus

    // One "trip completed" event per trip, shuffled, consumed by 8 threads as a message consumer would
    static long consume(List<Long> events, LongConsumer onTripCompleted) throws InterruptedException {
        CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(8);
        for (int t = 0; t < 8; t++) {
            int part = t;
            new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int i = part; i < events.size(); i += 8) onTripCompleted.accept(events.get(i));
                done.countDown();
            }).start();
        }
        long start = System.nanoTime();
        go.countDown();
        done.await();
        return (System.nanoTime() - start) / 1_000;
    }

    static void report(String label, Map<Long, Long> counts, long micros) {
        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        long missedBonus = counts.values().stream().filter(n -> n < BONUS_AT).count();
        System.out.printf("%-26s trips counted %,6d of %,d, drivers short-changed %,3d (Rs %,d of bonus not paid)%n",
                label, total, DRIVERS * TRIPS_EACH, missedBonus, missedBonus * 150);
    }

    public static void main(String[] args) throws Exception {
        List<Long> events = new ArrayList<>();
        for (long driver = 1; driver <= DRIVERS; driver++) for (int t = 0; t < TRIPS_EACH; t++) events.add(driver);
        Collections.shuffle(events, new java.util.Random(42));

        for (int run = 1; run <= 3; run++) {
            Map<Long, Long> before = new ConcurrentHashMap<>();
            long us = consume(events, driver -> {
                Long n = before.get(driver);                            // what shipped
                before.put(driver, n == null ? 1 : n + 1);
            });
            report("get + put (run " + run + ")", before, us);
        }

        Map<Long, Long> merged = new ConcurrentHashMap<>();
        long us = consume(events, driver -> merged.merge(driver, 1L, Long::sum));
        report("merge", merged, us);

        ConcurrentHashMap<Long, LongAdder> adders = new ConcurrentHashMap<>();
        us = consume(events, driver -> adders.computeIfAbsent(driver, d -> new LongAdder()).increment());
        Map<Long, Long> view = new ConcurrentHashMap<>();
        adders.forEach((d, a) -> view.put(d, a.sum()));
        report("computeIfAbsent+LongAdder", view, us);
    }
}`,
        },
        {
          type: "output",
          text: `get + put (run 1)          trips counted 23,963 of 24,000, drivers short-changed  29 (Rs 4,350 of bonus not paid)
get + put (run 2)          trips counted 23,969 of 24,000, drivers short-changed  19 (Rs 2,850 of bonus not paid)
get + put (run 3)          trips counted 23,975 of 24,000, drivers short-changed  25 (Rs 3,750 of bonus not paid)
merge                      trips counted 24,000 of 24,000, drivers short-changed   0 (Rs 0 of bonus not paid)
computeIfAbsent+LongAdder  trips counted 24,000 of 24,000, drivers short-changed   0 (Rs 0 of bonus not paid)`,
        },
        {
          type: "list",
          items: [
            "**Only 2 to 37 trips of 24,000 were lost per run (at most 0.15%)**, and that was enough to deny the bonus to **up to 29 drivers** a day (2 to 29 over 15 runs), Rs 300 to Rs 4,350 of bonuses not paid. A 0.1% counting error becomes a 100% error for the driver it lands on.",
            "**Why so few losses here, and so many in `Counters`?** Two consumers must update the **same driver** at the **same moment**. With 2,000 drivers and shuffled events that's rare; with 64 zones and a tight loop it was 8 to 13% of increments. The bug's size depends on contention per key, which is why it passed load tests that spread traffic over many drivers.",
            "**`merge(driver, 1L, Long::sum)`** and **`computeIfAbsent(driver, d -> new LongAdder()).increment()`** counted every trip in every run. `merge` is the one-line fix; the `LongAdder` version suits counters that are also read rarely and written very often.",
          ],
        },
        {
          type: "heading",
          text: "Story 2: a remote call inside computeIfAbsent",
        },
        {
          type: "paragraph",
          text: "Driver profiles came from a profile service over HTTP (about 50 ms) and were cached with `profiles.computeIfAbsent(driverId, this::fetchFromProfileService)`. The cache worked: the hit rate was 95%. But the latency of **cache hits** had a strange tail: almost all under 10 microseconds, and a few that took a full remote-call time. I rebuilt it with 16 request threads, 1,000 cached drivers with sparse random IDs, 95% hits and 5% new drivers:",
        },
        {
          type: "code",
          language: "java",
          title: "ProfileCache.java",
          code: `import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.LongFunction;

public class ProfileCache {
    record Profile(long driverId, String name) {}

    static final AtomicInteger REMOTE_CALLS = new AtomicInteger();
    static final long[] CACHED = new java.util.Random(7).longs(1_000, 1, Long.MAX_VALUE).toArray();   // real ids are sparse

    static Profile fetchFromProfileService(long id) {           // the slow remote call: 50 ms
        REMOTE_CALLS.incrementAndGet();
        try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return new Profile(id, "driver-" + id);
    }

    // 16 request threads x 2,000 lookups: 95% for 1,000 already-cached drivers, 5% for new drivers
    static void load(String label, LongFunction<Profile> lookup) throws InterruptedException {
        REMOTE_CALLS.set(0);
        long[] hitMicros = new long[16 * 2_000];
        AtomicInteger hits = new AtomicInteger();
        CountDownLatch go = new CountDownLatch(1), done = new CountDownLatch(16);
        for (int t = 0; t < 16; t++) {
            new Thread(() -> {
                ThreadLocalRandom r = ThreadLocalRandom.current();
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int i = 0; i < 2_000; i++) {
                    boolean hit = r.nextInt(100) < 95;
                    long id = hit ? CACHED[r.nextInt(1_000)] : r.nextLong(1, Long.MAX_VALUE);   // a driver not seen before
                    long start = System.nanoTime();
                    lookup.apply(id);
                    if (hit) hitMicros[hits.getAndIncrement()] = (System.nanoTime() - start) / 1_000;
                }
                done.countDown();
            }).start();
        }
        long start = System.nanoTime();
        go.countDown();
        done.await();
        long wall = (System.nanoTime() - start) / 1_000_000;
        long[] h = Arrays.copyOf(hitMicros, hits.get());
        Arrays.sort(h);
        long slow = Arrays.stream(h).filter(us -> us > 5_000).count();
        System.out.printf("%-30s wall %5d ms  cache hits %,d: p50 %d us, p99 %,d us, p99.9 %,d us, max %,d us, slower than 5 ms: %,d%n",
                label, wall, h.length, h[h.length / 2], h[(int) (h.length * 0.99)], h[(int) (h.length * 0.999)], h[h.length - 1], slow);
        System.out.printf("%-30s remote calls %,d%n", "", REMOTE_CALLS.get());
    }

    public static void main(String[] args) throws Exception {
        // Before: the remote call runs inside computeIfAbsent, holding the bin lock for 20 ms
        ConcurrentHashMap<Long, Profile> before = new ConcurrentHashMap<>();
        for (long id : CACHED) before.put(id, new Profile(id, "driver-" + id));
        load("computeIfAbsent(remote call)", id -> before.computeIfAbsent(id, ProfileCache::fetchFromProfileService));

        // After: the map holds futures; the lock is held only to install one, the call runs on a pool
        ExecutorService profileIo = Executors.newFixedThreadPool(16);
        ConcurrentHashMap<Long, CompletableFuture<Profile>> after = new ConcurrentHashMap<>();
        for (long id : CACHED) after.put(id, CompletableFuture.completedFuture(new Profile(id, "driver-" + id)));
        load("computeIfAbsent(future) + join", id -> after.computeIfAbsent(id,
                k -> CompletableFuture.supplyAsync(() -> fetchFromProfileService(k), profileIo)).join());
        profileIo.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `computeIfAbsent(remote call)   wall  6013 ms  cache hits 30,345: p50 0 us, p99 3 us, p99.9 68 us, max 50,493 us, slower than 5 ms: 15
                               remote calls 1,655
computeIfAbsent(future) + join wall  6109 ms  cache hits 30,348: p50 0 us, p99 4 us, p99.9 15 us, max 4,161 us, slower than 5 ms: 0
                               remote calls 1,652`,
        },
        {
          type: "list",
          items: [
            "**Before: 15 cache hits took a full remote-call time** (up to 50.5 ms) although their profiles were already cached; 15 to 22 per run over four runs, out of about 30,400 hits. They were hits for keys that shared a bin with a key being loaded and weren't the bin's first node (so `computeIfAbsent` had to lock to look), or writes that had to wait for a locked bin during a resize. The median and p99 were unaffected (0 and 3 microseconds); p99.9 and the maximum told the story.",
            "**After: no hit slower than 5 ms in any run** (maximum 1.0 to 4.2 ms, scheduler noise on a loaded machine). The map now holds `CompletableFuture<Profile>`: `computeIfAbsent` only installs a future, which takes microseconds under the lock, and the 50 ms call runs on a separate pool. Callers `join()` **outside** the map's lock, so threads waiting for Ravi's profile wait on Ravi's future, not on a bin.",
            "**Still one remote call per driver**: about 1,600 remote calls for about 1,600 misses in both versions. The future version keeps `computeIfAbsent`'s once-per-key guarantee, because the future is created once.",
            "**Wall time didn't change** (about 6 seconds, dominated by the misses). This kind of bug never shows up in throughput or averages, only in the tail.",
            "**The future version needs one more line in production**: if the remote call fails, the failed future stays cached and every later lookup fails instantly. Remove it on failure (`future.whenComplete((p, e) -> { if (e != null) profiles.remove(id, future); })`) or use a cache library that handles failed loads and expiry.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from both:",
        },
        {
          type: "list",
          items: [
            "Search for `get(` or `containsKey(` followed by `put(` on the same map: in a concurrent service, almost every one is a bug.",
            "The size of a lost-update bug depends on contention per key, so it hides in load tests with many keys and appears for the busiest keys in production.",
            "A rare per-key error is a certain error for someone: reconcile counters that drive money against the source events.",
            "Nothing slow inside `computeIfAbsent`, `compute` or `merge`: install a future, a placeholder or nothing, and do the work outside.",
            "Look at p99.9 and max, not just averages, for anything that holds a lock.",
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
              question: "If ConcurrentHashMap is thread-safe, why can `if (!map.containsKey(k)) map.put(k, v)` still be a bug?",
              answer:
                "Because it's two calls. Each is atomic, but another thread can put the key between the check and the put, and both threads then act as if they inserted. In my test, 8 drivers racing for 10,000 trips produced 4,084 to 13,465 extra \"you got it\" results. `putIfAbsent(k, v) == null` does the check and the insert as one operation and gave exactly 10,000 winners.",
            },
            {
              question: "How do you count occurrences safely with ConcurrentHashMap?",
              answer:
                "`map.merge(key, 1, Integer::sum)`, which reads, adds and writes under the bin lock. For very hot keys, `map.computeIfAbsent(key, k -> new LongAdder()).increment()`. Never `map.put(key, map.getOrDefault(key, 0) + 1)`: with 8 threads it lost 632,545 to 1,073,091 of 8 million increments in my runs.",
            },
            {
              question: "What's the difference between putIfAbsent and computeIfAbsent?",
              answer:
                "`putIfAbsent(k, v)` takes a ready value, so the value is created even when the key is present (Java evaluates arguments first); it returns the previous value or `null`. `computeIfAbsent(k, f)` calls `f` only when the key is absent, at most once per key in `ConcurrentHashMap`, and returns the current value (existing or new). Use `computeIfAbsent` when the value is expensive to create.",
            },
            {
              question: "What happens if the function given to compute or merge returns null?",
              answer:
                "The mapping is removed (or, for `computeIfAbsent`, nothing is stored). In my tour, `compute(\"HOWRAH\", (z, p) -> null)` removed HOWRAH. That's the idiomatic way to delete a counter when it reaches zero: `computeIfPresent(k, (key, n) -> n > 1 ? n - 1 : null)`.",
            },
            {
              question: "Is `computeIfAbsent(k, x -> new ArrayList<>()).add(v)` thread-safe on a ConcurrentHashMap?",
              answer:
                "No. `computeIfAbsent` is atomic, but it returns the list and releases the lock, and then several threads call `add` on the same `ArrayList`. With 8 threads I lost 15,181 to 53,884 of 160,000 adds and saw `ArrayIndexOutOfBoundsException`. Use `ConcurrentLinkedQueue` or another concurrent collection as the value, or mutate inside `compute`.",
            },
            {
              question: "What does ConcurrentHashMap.newKeySet() give you?",
              answer:
                "A thread-safe `Set` backed by a `ConcurrentHashMap` (its class is `ConcurrentHashMap.KeySetView`). Its `add` returns `true` only for the call that actually inserted, atomically, so `if (set.add(id)) process(id)` processes each ID once. With `contains` then `add`, my webhook test credited up to 12,563 extra wallets.",
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
              question: "How does ConcurrentHashMap make compute and merge atomic?",
              answer:
                "It locks the bin. For an empty bin `compute` and `computeIfAbsent` CAS in a locked `ReservationNode` placeholder; otherwise they `synchronized` on the bin's first node. The read of the old value, your function and the write all happen before the monitor is released. `javap -c` shows `Function.apply` between `monitorenter` and `monitorexit`. Other writers to that bin block; readers don't, and see the old value until the new one is stored.",
            },
            {
              question: "Why should the function passed to computeIfAbsent be short?",
              answer:
                "Because it runs while the bin lock is held. Every write to that bin waits, including writes to unrelated keys that just share the bin, and `computeIfAbsent` on cached keys that aren't the bin's first node. In `SameBinStall` a 2-second function made `put` and `computeIfAbsent` on other keys wait 1,988 ms, while `get` and the first node's `computeIfAbsent` returned at once. In production that showed up as rare cache hits taking a full remote-call time.",
            },
            {
              question: "Does computeIfAbsent call the mapping function only once?",
              answer:
                "In `ConcurrentHashMap`, yes, at most once per absent key: other threads asking for the same key block on the bin and then see the stored value. That's not a property of the `ConcurrentMap` interface: its default `computeIfAbsent` is `get`, `apply`, `putIfAbsent`, so several threads can all run the function. Racing 8 threads on each of 1,000 keys, `ConcurrentHashMap` ran the loader 1,000 times and `ConcurrentSkipListMap` 1,215 to 1,395 times.",
            },
            {
              question: "When would you write a replace(k, old, new) loop instead of using compute or merge?",
              answer:
                "When most updates turn out to be unnecessary, because the read that decides \"nothing to do\" takes no lock; or when you need to know whether your specific update won. Keeping a per-zone maximum fare, my loop retried only 0 to 6 times in 8 million calls, since nearly every call returned early. For plain increments `merge` is simpler, and under contention the loop retried 308,000 to 410,000 times in `Counters`.",
            },
            {
              question: "AtomicLong or LongAdder as the value of a counter map?",
              answer:
                "Depends on contention per key. With 64 keys and 8 threads, `AtomicLong` took 50 to 106 ms against 74 to 152 ms for `LongAdder`. With one hot key, `LongAdder` took 71 to 128 ms against 449 to 529 ms for `AtomicLong`. `LongAdder` spreads increments over cells, which wins when many threads hit one counter, at the cost of more memory and a `sum()` that isn't an atomic snapshot.",
            },
            {
              question: "What are parallelismThreshold and the bulk operations?",
              answer:
                "`forEach`, `search`, `reduce` and their typed variants on `ConcurrentHashMap` take a threshold: below it they run on the calling thread, above it they split the table across the common `ForkJoinPool`. `Long.MAX_VALUE` disables parallelism; `1` maximises it. Summing 2 million values went from 20 ms on `main` to 8 or 9 ms with the pool's 7 workers. Results are weakly consistent, and `search` returns any match, not the first.",
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
              question: "What is the \"Recursive update\" IllegalStateException, and why doesn't it always happen?",
              answer:
                "It's thrown when a thread re-enters the map from inside its own `computeIfAbsent`/`compute` function and reaches a bin holding its own `ReservationNode`, either directly (same bin) or while helping a resize (`transfer`). Monitors are re-entrant, so without the check the thread would loop; Java 8 did loop forever. It's detection, not prevention: memoised `fib(13)` worked on a default map, `fib(14)` threw when the 12th entry triggered a resize, and `fib(30)` on a map presized for 1,000 entries worked silently. The rule is simply never to modify the map from inside its functions.",
            },
            {
              question: "How can nested compute calls deadlock?",
              answer:
                "`compute(a)` holds bin A's monitor while its function runs; if the function calls `compute(b)`, it needs bin B's monitor. Another thread doing `compute(b)` with a nested `compute(a)` holds B and wants A. `NestedCompute` reproduced it: both threads `BLOCKED` forever, `jstack` printed \"Found one Java-level deadlock\" with two `ConcurrentHashMap$Node` monitors, and `get` kept working, which hides the problem. It's a lock-ordering deadlock; the fix is not to nest map operations, or to use one external lock with a fixed order.",
            },
            {
              question: "Why is computeIfAbsent sometimes lock-free on a hit and sometimes not?",
              answer:
                "Since Java 9 it compares the key with the bin's **first** node before locking and returns that node's value if it matches (offsets 241 to 260 in the bytecode, before the `monitorenter` at 269). If the key is the second or later node, it locks the bin to search the chain. In `SameBinStall`, `computeIfAbsent` on the first node returned in 1 ms while one on the second node waited 1,988 ms behind a slow function. For guaranteed lock-free hits, call `get` first and `computeIfAbsent` only on a miss.",
            },
            {
              question: "How would you build a cache that loads each key once without holding the bin lock during the load?",
              answer:
                "Store futures: `CompletableFuture<V> f = map.computeIfAbsent(k, key -> CompletableFuture.supplyAsync(() -> load(key), ioPool)); return f.join();`. The lock is held only to create the future; the load runs on `ioPool`; concurrent callers for the same key share the future and wait on it outside the map. In my rebuild, hits slower than 5 ms went from 15 to 22 per run to 0, with the same number of remote calls. Add removal of failed futures, a size bound and expiry, or use a cache library that does all of it.",
            },
            {
              question: "What do ConcurrentMap's default compute methods guarantee, compared with ConcurrentHashMap's overrides?",
              answer:
                "The defaults (in `ConcurrentMap`) are optimistic retry loops built on the four abstract Java 5 methods: `get`, call the function, then `putIfAbsent`/`replace`/`remove(k, v)`, retrying on failure. The final state is consistent, but the function may run several times and must be side-effect free. `ConcurrentHashMap` overrides them so the function runs once, under the bin lock, which is stronger but brings the blocking and re-entrancy pitfalls. A custom `ConcurrentMap` gets the default behaviour.",
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
              question: "Drivers complain their daily trip counts are sometimes one short and they miss bonuses. The counter is a ConcurrentHashMap<Long, Long>. What do you check?",
              answer:
                "How the counter is updated. If it's `get` then `put` (or `getOrDefault` plus `put`), two events for the same driver processed concurrently lose one increment. My rebuild lost 2 to 37 trips of 24,000 per day, at most 0.15%, but that denied the bonus to 2 to 29 drivers per run. Switch to `merge(driverId, 1L, Long::sum)` (or a `LongAdder` value), which counted every trip.\n\nThen reconcile: recompute the affected days' counts from the trip events (the source of truth) and pay the difference, and add a daily job that compares counters with events, because a low-rate lost-update bug is invisible in aggregate metrics.",
            },
            {
              question: "A service's cache-hit latency is under 10 µs at p99 but occasionally 50 ms, about the time of the remote call behind the cache. What could cause that?",
              answer:
                "A slow load running inside `computeIfAbsent` (or `compute`), holding a bin lock. Hits on keys that share the bin and aren't its first node, and writes to that bin (including a resize copying it), wait for the whole remote call. In my rebuild, 15 to 22 of about 30,400 hits per run took a full 50 ms, while p50 and p99 were unaffected.\n\nConfirm with a thread dump during a spike: threads `BLOCKED` on a `ConcurrentHashMap$Node` while another holds it inside your loader. Fix by caching `CompletableFuture`s so only the future's creation happens under the lock, or by moving to a cache library; after the change, no hit exceeded 5 ms.",
            },
            {
              question: "A memoised pricing function using computeIfAbsent passes all tests but throws IllegalStateException: Recursive update in production. Why only in production?",
              answer:
                "The function calls `computeIfAbsent` on the same map for its dependencies. Detection is best-effort: it fires when a nested call reaches a bin holding this thread's `ReservationNode`, or when a resize hits one. Tests used a small fixed set of keys or a presized map, so nothing collided; production has more keys, collisions and resizes. I saw exactly this: `fib(13)` fine, `fib(14)` threw in `transfer`, and `fib(30)` on a presized map worked.\n\nFix the design, not the sizing: compute dependencies outside the map (bottom-up, or `get`, compute, `putIfAbsent`), so no function touches the map it's running in.",
            },
            {
              question: "Wallet transfer threads occasionally hang forever; the rest of the service keeps working and reads of the balances are fine. What do you look for?",
              answer:
                "A deadlock between bin locks. Take a thread dump: if it says \"Found one Java-level deadlock\" with threads waiting on `java.util.concurrent.ConcurrentHashMap$Node` monitors held by each other, the code is calling `compute` on one key from inside `compute` on another, in opposite orders on different threads. `NestedCompute` produced exactly that dump, and `get` kept returning the old balances, which is why reads looked fine.\n\nA transfer touches two keys, so it needs a mechanism for two keys: a lock acquired in a fixed order (by wallet ID), or a database transaction with row locks if the balances matter beyond one JVM.",
            },
            {
              question: "A trip-grouping job using computeIfAbsent(zone, z -> new ArrayList<>()).add(trip) sometimes reports fewer trips than were processed and occasionally logs ArrayIndexOutOfBoundsException. The map is a ConcurrentHashMap. What's wrong?",
              answer:
                "The map is safe; the `ArrayList` values aren't. `computeIfAbsent` returns the shared list and releases the lock before `add` runs, so concurrent `add`s corrupt it: lost elements, `null` slots, and `ArrayIndexOutOfBoundsException` from a resize race inside `ArrayList`. I lost up to a third of 160,000 adds with 8 threads.\n\nUse `ConcurrentLinkedQueue` (exact and fast in my test), or do the `add` inside `compute` if all readers also go through the map's atomic methods. `CopyOnWriteArrayList` is correct but was 30 to 40 times slower for this write-heavy job.",
            },
            {
              question: "Heap usage of a service grows steadily until it's restarted, and a heap dump shows a ConcurrentHashMap with millions of fare-quote entries. What do you do?",
              answer:
                "It's being used as a cache without eviction, keyed by something that rarely repeats (exact coordinates, timestamps, request IDs). My rebuild grew by about 130 MB per million requests with a zero hit rate. Short term, add expiry: a TTL value and a periodic `values().removeIf(...)` sweep kept it at 60,001 entries.\n\nProperly: replace it with a bounded cache library (size or weight limit, expire-after-write, statistics), and fix the key so it repeats (round coordinates to a zone or geohash cell). Then watch the hit rate: if it's near zero, the cache shouldn't exist.",
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
            "Run `CheckThenAct` three times and compare the extra winners. Then change the racy version to `owners.putIfAbsent(trip, driver) == null` and run it again.",
            "In `Counters`, set `ZONES = 1` so every thread hits the same key, and compare `merge`, `AtomicLong` and `LongAdder` again.",
            "Run `SameBinStall`, then change the map to `new ConcurrentHashMap<>(1024)` (the four keys will no longer share a bin) and run it again.",
            "Call memoised `fib` from `RecursiveUpdate` for every `n` from 2 to 20 on a fresh default map each time, and note the first `n` that throws.",
            "Run `NestedCompute` in the background and take a `jstack` within two seconds. Find the deadlock report.",
            "In `MutableValues`, replace `ArrayList::new` with `k -> Collections.synchronizedList(new ArrayList<>())` and run it.",
            "Call `trips.forEach(1, (id, t) -> ...)` and `trips.forEach(Long.MAX_VALUE, ...)` from `BulkOps`, printing `Thread.currentThread().getName()` for one key in each.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 gives thousands of extra winners that differ on every run, and 0 with `putIfAbsent`. Step 2 makes `LongAdder` by far the fastest (70 ms against 220 for `AtomicLong` and about 460 for `merge`/`compute` in my run), the `replace` loop the slowest with millions of retries, and `get` then `put` loses most of the 8 million increments. Step 3: with 1,024 bins the keys spread out, and the two calls that waited about 2 seconds return in about 0 ms (only a call for `driver-31` itself would wait). Step 4: 2 to 13 succeed and 14 is the first to throw `IllegalStateException: Recursive update` (from `transfer`). Step 5 prints \"Found one Java-level deadlock\" with two `ConcurrentHashMap$Node` monitors. Step 6 records all 160,000 IDs (each `add` is synchronized on its own list). Step 7 prints `main` or a `ForkJoinPool.commonPool-worker-` name for threshold 1, depending on which part of the table the key is in (key 7 stayed on `main` and key 1,500,000 went to a worker in my runs), and always `main` for `Long.MAX_VALUE`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ONE CALL = ATOMIC      a sequence of calls is NOT
  containsKey + put    8 drivers, 10,000 trips: up to 13,465 extra winners
  get + put counter    lost 8-13% of 8M increments; 0.1% of trips -> missed bonuses

ATOMIC TOOLS           putIfAbsent(k,v)==null   claim once
                       merge(k,1,sum)            count
                       computeIfAbsent(k,f)      create once (CHM: f runs once; CSLM: 1,215/1,000)
                       compute / computeIfPresent  update from old; null removes
                       replace(k,old,new) loop   CAS, lock-free when nothing to do
                       newKeySet().add(x)        dedupe

YOUR FUNCTION RUNS UNDER THE BIN LOCK  (monitorenter ... apply ... monitorexit)
  slow function        other keys in the bin waited 1,988 ms; get never waits
  touches same map     "Recursive update" (best effort: presized map hid it)
  nested compute       deadlock on two ConcurrentHashMap$Node monitors
  fix                  short, no I/O; cache CompletableFuture and join outside

VALUES                 map protects the entry, not the object
  ArrayList values     lost up to 1/3 of adds -> ConcurrentLinkedQueue, LongAdder, immutable+merge
COUNTERS               64 keys: AtomicLong fastest; 1 hot key: LongAdder 6-14x merge
BULK                   forEach/search/reduce(threshold): MAX_VALUE = caller only; search = any match
CACHE                  no bound, no expiry: +130 MB per 1M new keys -> cache library`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`ConcurrentHashMap` makes single calls atomic; correct concurrent code makes each decision in one call, with `putIfAbsent`, `computeIfAbsent`, `compute`, `merge`, `replace(k, old, new)` or `Set.add`, never with a read followed by a write.",
            "The atomic methods run your function under the bin lock: keep it short, keep I/O and other map calls out of it, and keep the values themselves thread-safe or immutable. Multi-key invariants and real caching need tools beyond the map.",
            "Next comes BlockingQueue Implementations: `ArrayBlockingQueue`, `LinkedBlockingQueue`, `SynchronousQueue`, `PriorityBlockingQueue` and `DelayQueue`, what blocks and why, measured the same way, as the foundation for the producer-consumer lesson that follows it.",
          ],
        },
      ],
    },
  ],
};
