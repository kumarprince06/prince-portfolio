import type { Lesson } from "../types";

export const otherJava8Additions: Lesson = {
  slug: "other-java-8-additions",
  date: "2026-10-29",
  title: "Other Java 8 Additions",
  description:
    "The smaller Java 8 changes I use every day without thinking: new default methods on List and Map (merge, computeIfAbsent and friends), String.join and StringJoiner, Base64, Comparator chains, exact math, LongAdder and StampedLock, Metaspace replacing PermGen, repeatable and type annotations, and a one-table map of the whole Java 8 release.",
  tags: ["Java 8", "Collections", "Map", "Concurrency", "JVM"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "In a class monitor election, the teacher reads out each vote and adds a tally mark next to that name. If the name isn't on the board yet, she writes it with one mark. Simple, but doing it by hand in code used to take several lines.",
        },
        {
          type: "paragraph",
          text: "Java 8 added many small helper methods like that one. `map.merge(name, 1, Integer::sum)` means \"if this name is new, start at 1, otherwise add 1\". Others clean a list, join words with commas, or sort by a field, each in one line.",
        },
        {
          type: "paragraph",
          text: "I use these more than anything else from Java 8. None of them is big, but together they remove a lot of boring, repeated code.",
        },
        {
          type: "code",
          language: "java",
          code: `Map<String, Integer> votes = new TreeMap<>();
for (String name : List.of("Asha", "Ravi", "Asha", "Meena", "Asha")) {
    votes.merge(name, 1, Integer::sum);
}
System.out.println(votes);`,
        },
        {
          type: "output",
          text: `{Asha=3, Meena=1, Ravi=1}`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "Before writing a loop to count, clean or join things, I check whether Java 8 already added a one-line method for it.",
        },
      ],
    },
    {
      title: "What These Additions Are",
      blocks: [
        {
          type: "paragraph",
          text: "When people say \"Java 8\" they mean lambdas and streams. Those got their own lessons. But Java 8 also shipped a long list of small things, and honestly, these are the ones I type most often. `map.merge(city, 1, Integer::sum)` to count something. `list.removeIf(...)` to clean a list. `String.join(\", \", names)` to build a line of text. `Comparator.comparing(...)` to sort.",
        },
        {
          type: "paragraph",
          text: "Think of it like a kitchen renovation. The big news is the new stove (lambdas). But the same renovation also added a drawer for spoons, a hook for the towel and a better tap. Nobody shows guests the hook, and yet it's what I reach for twenty times a day.",
        },
        {
          type: "paragraph",
          text: "This lesson collects those smaller additions in one place, grouped by where they live: collections, strings, arrays, sorting, math, concurrency, the JVM itself and annotations. It ends with a table of the whole Java 8 release that points to the other Java 8 lessons.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 8 came out in March 2014. The headline was Project Lambda (JSR 335), and lambdas forced a design problem that explains most of this lesson. The Collections interfaces (`List`, `Map`, `Iterable`) had been frozen since 1998. Adding a method to an interface used to break every class that implemented it, including thousands of classes outside the JDK.",
        },
        {
          type: "paragraph",
          text: "The fix was **default methods**: an interface method with a body, which implementing classes get for free. That's what made it possible to add `forEach`, `removeIf`, `merge` and the rest to existing interfaces without breaking anyone. So most of the collection methods below are default methods, and some classes (like `HashMap`) override them with faster versions.",
        },
        {
          type: "paragraph",
          text: "Everything else here came from separate efforts that landed in the same release: `java.util.Base64` (finally a standard encoder, instead of the internal `sun.misc.BASE64Encoder` people used), JEP 122 which removed PermGen, JEP 104 for type annotations, JEP 120 for repeating annotations, JEP 174 for the Nashorn JavaScript engine, and the concurrency updates from Doug Lea's JSR 166 group.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "For the `Map` methods, the one that clicked for me was a tea stall's tally book. One page per customer, one number per page: how many cups they owe for.",
        },
        {
          type: "list",
          items: [
            "`getOrDefault(name, 0)`: look up a page. No page? Treat it as zero, but don't write anything.",
            "`putIfAbsent(name, 0)`: write a page only if there isn't one already.",
            "`computeIfAbsent(name, n -> new list)`: if there's no page, create one, and hand me the page either way so I can write on it.",
            "`computeIfPresent(name, ...)`: only touch the page if it exists. Return nothing and the page is torn out.",
            "`merge(name, 1, Integer::sum)`: the one I use most. \"Add one cup to this person.\" No page? Start one at 1. Page exists? Add 1 to what's there.",
          ],
        },
        {
          type: "paragraph",
          text: "Before Java 8, every one of those was three lines: `get`, check for `null`, `put`. That's two lookups in the book, and in a busy stall with two people writing at once, a chance to lose a cup between the reading and the writing. That second problem is what the `ConcurrentHashMap` part of this lesson is about.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "New methods on Iterable, Collection and List",
        },
        {
          type: "table",
          headers: ["Method", "On", "What it does"],
          rows: [
            ["`forEach(action)`", "`Iterable`", "Runs the action for each element"],
            ["`removeIf(predicate)`", "`Collection`", "Removes every element that matches, returns whether anything was removed"],
            ["`replaceAll(operator)`", "`List`", "Replaces each element with the operator's result, in place"],
            ["`sort(comparator)`", "`List`", "Sorts in place. `Collections.sort` now just calls this"],
            ["`spliterator()`, `stream()`, `parallelStream()`", "`Collection`", "The hooks streams are built on"],
          ],
        },
        {
          type: "heading",
          text: "New methods on Map",
        },
        {
          type: "table",
          headers: ["Method", "When the key is missing", "When the key is present"],
          rows: [
            ["`getOrDefault(k, def)`", "returns `def`", "returns the value (even if it's `null`)"],
            ["`putIfAbsent(k, v)`", "puts `v`", "does nothing, returns the current value"],
            ["`computeIfAbsent(k, fn)`", "puts `fn(k)` unless it's `null`", "does nothing, returns the current value"],
            ["`computeIfPresent(k, fn)`", "does nothing", "puts `fn(k, old)`, removes the key if that's `null`"],
            ["`compute(k, fn)`", "puts `fn(k, null)`", "puts `fn(k, old)`; `null` result removes"],
            ["`merge(k, v, fn)`", "puts `v`", "puts `fn(old, v)`; `null` result removes"],
            ["`forEach((k, v) -> ...)`", "-", "runs for every entry"],
            ["`replaceAll((k, v) -> ...)`", "-", "replaces every value"],
            ["`remove(k, v)`, `replace(k, v)`, `replace(k, old, new)`", "-", "conditional remove and replace"],
          ],
        },
        {
          type: "paragraph",
          text: "The rule hiding in that table: in the `compute`/`merge` family, returning `null` from the function means \"remove this entry\" (or \"don't add it\"). And \"absent\" means **missing or mapped to `null`**, which matters for `HashMap`, the one common map that allows `null` values.",
        },
        {
          type: "heading",
          text: "Strings, Base64, arrays",
        },
        {
          type: "list",
          items: [
            "`String.join(delimiter, parts...)` and `String.join(delimiter, iterable)`: glue strings with a separator.",
            "`StringJoiner(delimiter, prefix, suffix)`: the same, built up piece by piece, with `setEmptyValue` for the nothing-added case. `Collectors.joining` uses it underneath.",
            "`java.util.Base64`: `getEncoder()`/`getDecoder()` (standard), `getUrlEncoder()` (`-` and `_` instead of `+` and `/`, safe in URLs and file names), `getMimeEncoder()` (lines of 76 characters, for email).",
            "`Arrays.parallelSort`, `Arrays.parallelPrefix`, `Arrays.setAll`/`parallelSetAll`, and `Arrays.stream`.",
          ],
        },
        {
          type: "heading",
          text: "Sorting and math",
        },
        {
          type: "list",
          items: [
            "`Comparator` got static factories (`comparing`, `comparingInt`, `naturalOrder`, `reverseOrder`, `nullsFirst`, `nullsLast`) and default methods to chain them (`thenComparing`, `reversed`).",
            "`Math.addExact`, `subtractExact`, `multiplyExact`, `incrementExact`, `negateExact`, `toIntExact`: like the operators, but throw `ArithmeticException` on overflow instead of wrapping around.",
            "`Math.floorDiv` and `floorMod`: division and remainder that round toward negative infinity, which is what I want for things like \"which week is day -3 in\".",
            "Unsigned helpers: `Integer.toUnsignedString`, `Integer.divideUnsigned`, `Integer.parseUnsignedInt`, and the same on `Long`.",
            "`Integer.sum`, `Integer.max`, `Integer.min`: tiny, but they exist so they can be method references (`Integer::sum`).",
          ],
        },
        {
          type: "heading",
          text: "Concurrency",
        },
        {
          type: "list",
          items: [
            "`LongAdder` and `DoubleAdder`: counters that stay fast when many threads increment them.",
            "`StampedLock`: a read/write lock with an **optimistic read** mode that takes no lock at all.",
            "`ConcurrentHashMap` was rewritten, and got atomic `compute`/`merge`, bulk operations (`forEach`, `search`, `reduce` with a parallelism threshold), `mappingCount()` and `newKeySet()`.",
            "`CompletableFuture`, which has its own lesson.",
          ],
        },
        {
          type: "heading",
          text: "JVM and language",
        },
        {
          type: "list",
          items: [
            "**Metaspace** replaced PermGen as the home for class metadata (JEP 122).",
            "**Type annotations** (JEP 104): annotations can go anywhere a type is used, like `List<@NonNull String>`.",
            "**Repeating annotations** (JEP 120): the same annotation twice on one element, via `@Repeatable`.",
            "**Parameter names** at runtime with `javac -parameters` and `java.lang.reflect.Parameter`.",
            "**Nashorn**, a JavaScript engine on the JVM (deprecated in Java 11, removed in Java 15).",
            "**JDBC 4.2**: `java.time` types like `LocalDate` work directly with `setObject` and `getObject`.",
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Why merge beats get-then-put in HashMap",
        },
        {
          type: "paragraph",
          text: "The default `Map.merge` in the interface is written in terms of `get`, `put` and `remove`, so it works for any map, including my own. `HashMap` overrides it. I read the JDK 21 source, and in plain words its `merge` does this:",
        },
        {
          type: "code",
          language: "text",
          code: `HashMap.merge(key, value, fn):
    reject null value or null fn                (NullPointerException)
    hash = hash(key)
    resize the table if needed
    find the bucket: table[hash & (length - 1)]
    walk the bucket (a linked list, or a red-black tree if it's big)
        looking for a node with an equal key

    found, with a non-null old value:
        mc = modCount
        newValue = fn(old, value)
        if modCount changed while fn ran -> ConcurrentModificationException  (Java 9+)
        newValue == null ? unlink the node : node.value = newValue
    found, with a null value:
        node.value = value                       (fn is not called)
    not found:
        add a new node with value in that bucket (tree bin or list)
        ++size; resize if over the threshold`,
        },
        {
          type: "paragraph",
          text: "The key point is \"find the bucket\" happens **once**. The old style, `Integer old = map.get(k); map.put(k, old == null ? 1 : old + 1);`, hashes the key and walks the bucket twice. `computeIfAbsent` follows the same single-lookup path: find the node, and only if it's missing (or its value is `null`) call the function and link a new node.",
        },
        {
          type: "paragraph",
          text: "The `modCount` check is the part that bites. If my function changes the same map while `merge` or `computeIfAbsent` is running, `HashMap` throws `ConcurrentModificationException` on Java 9 and later. In Java 8 it didn't check, and a recursive `computeIfAbsent` could silently corrupt the map. That's the memoised Fibonacci trap, which I show below.",
        },
        {
          type: "heading",
          text: "ConcurrentHashMap: the function runs under a lock",
        },
        {
          type: "paragraph",
          text: "A plain `HashMap` gives no promise about threads at all. `ConcurrentHashMap` (rewritten in Java 8) makes `compute`, `computeIfAbsent`, `computeIfPresent` and `merge` **atomic per key**. Here's how, roughly:",
        },
        {
          type: "list",
          items: [
            "The table is an array of bins. An empty bin is filled with a single CAS, no lock.",
            "For a bin that already has nodes, the thread does `synchronized (firstNodeOfBin)` and runs the whole find-call-update step while holding that lock. Other threads working on other bins aren't blocked at all.",
            "So the function I pass is called **at most once per call**, and no other thread can change that key in the middle. That's the atomicity.",
            "The cost: my function runs while a lock is held. A slow function (a database call inside `computeIfAbsent`, say) blocks every other thread that hashes to the same bin. And if the function tries to update the same map, Java 9+ throws `IllegalStateException: Recursive update` instead of deadlocking or corrupting the bin.",
          ],
        },
        {
          type: "paragraph",
          text: "In Java 7, `ConcurrentHashMap` used 16 fixed `Segment` locks by default. Java 8 dropped segments for per-bin locking plus CAS, added tree bins for long chains (like `HashMap`), and counts its size with the same striped-cell trick as `LongAdder`, which is why there's `mappingCount()` returning a `long`.",
        },
        {
          type: "heading",
          text: "Seeing the difference with eight threads",
        },
        {
          type: "paragraph",
          text: "Eight threads each add 100,000 rides for one city, to a `HashMap`, a `ConcurrentHashMap` and a `LongAdder`:",
        },
        {
          type: "code",
          language: "java",
          title: "Counters.java",
          code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;

public class Counters {
    public static void main(String[] args) throws Exception {
        Map<String, Integer> unsafe = new HashMap<>();
        Map<String, Integer> safe = new ConcurrentHashMap<>();
        LongAdder taps = new LongAdder();

        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int t = 0; t < 8; t++) {
            pool.submit(() -> {
                for (int i = 0; i < 100_000; i++) {
                    unsafe.merge("Kolkata", 1, Integer::sum);   // HashMap: not thread-safe
                    safe.merge("Kolkata", 1, Integer::sum);     // CHM: atomic per key
                    taps.increment();
                }
            });
        }
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.MINUTES);

        System.out.println("expected:          800000");
        System.out.println("ConcurrentHashMap: " + safe.get("Kolkata"));
        System.out.println("LongAdder:         " + taps.sum());
        System.out.println("HashMap:           " + unsafe.get("Kolkata") + "  (varies, usually less)");
    }
}`,
        },
        {
          type: "output",
          text: `expected:          800000
ConcurrentHashMap: 800000
LongAdder:         800000
HashMap:           693261  (varies, usually less)`,
        },
        {
          type: "paragraph",
          text: "The `HashMap` lost over 100,000 updates. A second run gave `631849`. Two threads read the same old value, both add one, both write back, and one increment is gone. Same method name, `merge`, completely different promise, because the promise comes from the class, not the interface.",
        },
        {
          type: "heading",
          text: "The recursive computeIfAbsent trap",
        },
        {
          type: "code",
          language: "java",
          title: "RecursiveCompute.java",
          code: `import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class RecursiveCompute {
    static Map<Integer, Long> memo;

    static long fib(int n) {
        if (n < 2) return n;
        return memo.computeIfAbsent(n, k -> fib(k - 1) + fib(k - 2));   // modifies memo inside compute
    }

    public static void main(String[] args) {
        for (Map<Integer, Long> m : List.of(new HashMap<Integer, Long>(), new ConcurrentHashMap<Integer, Long>())) {
            memo = m;
            try {
                System.out.println(m.getClass().getSimpleName() + ": fib(30) = " + fib(30));
            } catch (RuntimeException e) {
                System.out.println(m.getClass().getSimpleName() + ": " + e);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `HashMap: java.util.ConcurrentModificationException
ConcurrentHashMap: java.lang.IllegalStateException: Recursive update`,
        },
        {
          type: "paragraph",
          text: "This memoised Fibonacci shows up in a lot of blog posts as a \"neat Java 8 trick\". The function for `fib(30)` calls `fib(29)`, which calls `computeIfAbsent` on the same map while the outer call is still in progress. On Java 9+ both maps refuse.",
        },
        {
          type: "paragraph",
          text: "My old notes said this was fine, and on Java 8 it often appeared to work, but `HashMap` could end up with a lost or broken entry and `ConcurrentHashMap` could even hang forever in Java 8. The fix is boring: check with `get`, compute outside, then `put`.",
        },
        {
          type: "heading",
          text: "LongAdder: many counters, one sum",
        },
        {
          type: "paragraph",
          text: "An `AtomicLong` is one number that every thread fights over with CAS. Under heavy contention most CAS attempts fail and retry. `LongAdder` keeps a base value plus an array of `Cell`s. When threads collide, each thread gets steered to its own cell and adds there. `sum()` adds the base and all cells.",
        },
        {
          type: "paragraph",
          text: "It's like a busy toll plaza opening more booths: each booth counts its own cars, and at the end of the day someone adds up the booths. The catch is that `sum()` isn't an atomic snapshot while threads are still adding, so `LongAdder` is for counting, not for things like generating unique ids.",
        },
        {
          type: "heading",
          text: "Metaspace versus PermGen",
        },
        {
          type: "paragraph",
          text: "Every loaded class has metadata: its methods, bytecode, constant pool, field layout. Up to Java 7, HotSpot kept that in the **Permanent Generation**, a fixed-size area of the Java heap set with `-XX:MaxPermSize`.",
        },
        {
          type: "paragraph",
          text: "Its default was small (64 to 82 MB depending on version and platform), and apps that loaded many classes, or redeployed in an app server and leaked old class loaders, crashed with `java.lang.OutOfMemoryError: PermGen space`. Interned strings also lived there until Java 7 moved them to the heap.",
        },
        {
          type: "paragraph",
          text: "Java 8 removed PermGen (JEP 122) and put class metadata in **Metaspace**, which is native memory outside the Java heap. Each class loader gets its own chunks, and when a loader is garbage collected, its chunks are freed together. On JDK 21 the old flag is simply rejected:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:MaxPermSize=256m -version
java -XX:+PrintFlagsFinal -version | grep -E " (MetaspaceSize|MaxMetaspaceSize|CompressedClassSpaceSize) "`,
        },
        {
          type: "output",
          text: `Unrecognized VM option 'MaxPermSize=256m'
Error: Could not create the Java Virtual Machine.
Error: A fatal exception has occurred. Program will exit.
   size_t CompressedClassSpaceSize                 = 1073741824                                {product} {default}
   size_t MaxMetaspaceSize                         = 18446744073709551615                      {product} {default}
   size_t MetaspaceSize                            = 22020096                                  {product} {default}`,
        },
        {
          type: "list",
          items: [
            "Java 8 itself only printed a warning (\"ignoring option MaxPermSize; support was removed in 8.0\") and started. By Java 17 it had become a fatal error (I checked both the 17 and 21 JDKs on my machine). Old startup scripts with `-XX:MaxPermSize` stop working when upgraded.",
            "`MaxMetaspaceSize` defaults to effectively unlimited (the largest 64-bit number). That's the big change: no more small fixed cap.",
            "`MetaspaceSize` (21 MB here) is not a size limit. It's the level at which the first metadata-triggered GC happens.",
            "`CompressedClassSpaceSize` (1 GB) is a separate reserved region for class structures when compressed class pointers are on.",
          ],
        },
        {
          type: "paragraph",
          text: "\"Unlimited\" doesn't mean a leak can't happen, it means it eats the machine's memory instead of a small box. I set a cap and leaked class loaders on purpose, each one loading the same small `Plugin` class:",
        },
        {
          type: "code",
          language: "java",
          title: "MetaspaceFill.java",
          code: `import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class MetaspaceFill {
    public static void main(String[] args) throws Exception {
        URL dir = Path.of("plugin").toUri().toURL();
        List<Class<?>> kept = new ArrayList<>();          // holding them = loaders can't be unloaded
        int loaded = 0;
        try {
            while (true) {
                ClassLoader fresh = new URLClassLoader(new URL[] {dir}, null);
                kept.add(fresh.loadClass("Plugin"));       // same class, new loader, new metadata
                loaded++;
            }
        } catch (OutOfMemoryError e) {
            kept.clear();
            System.out.println(e + " after " + (loaded / 1000) + "k loaders");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:MaxMetaspaceSize=32m MetaspaceFill`,
        },
        {
          type: "output",
          text: `java.lang.OutOfMemoryError: Metaspace after 5k loaders`,
        },
        {
          type: "paragraph",
          text: "Each `URLClassLoader` defines its own copy of `Plugin`, and because the list keeps every `Class` alive, every loader stays alive too. The exact count depends on the machine, which is why I rounded it. In production I set `-XX:MaxMetaspaceSize` to a sane value, so a class loader leak fails with a clear `OutOfMemoryError: Metaspace` instead of slowly pushing the container into the OOM killer.",
        },
      ],
    },
    {
      title: "The Map Methods in One Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/map-merge-flow.svg",
          alt: "Flow of counts.merge(city, 1, Integer::sum): if the city is missing, put 1; if present, put old plus 1; example with orders Pune, Delhi, Pune ending as Pune=2, Delhi=1",
          caption: "`merge(city, 1, Integer::sum)` puts 1 for a new city and adds 1 to an existing count; if the function returns null the key is removed.",
        },
        {
          type: "diagram",
          text: `                       key missing          key present (old != null)
                       (or value null)
getOrDefault(k,d)      return d             return old
putIfAbsent(k,v)       put v                keep old
computeIfAbsent(k,f)   put f(k)*            keep old
computeIfPresent(k,f)  nothing              put f(k,old)*
compute(k,f)           put f(k,null)*       put f(k,old)*
merge(k,v,f)           put v                put f(old,v)*

* if the function returns null: nothing is added / the key is removed

HashMap            one bucket lookup, NOT thread-safe
ConcurrentHashMap  same rules, atomic per key, f runs under the bin lock`,
          caption: "The tally-book rules. The asterisk is the null rule that surprises people.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          code: `list.forEach(x -> System.out.println(x));
list.removeIf(String::isBlank);
list.replaceAll(String::trim);
list.sort(Comparator.comparing(Driver::rating).reversed());

map.getOrDefault("Pune", 0);
map.putIfAbsent("Pune", 0);
map.computeIfAbsent("Pune", c -> new ArrayList<>()).add(order);
map.computeIfPresent("Pune", (c, n) -> n - 1);
map.merge("Pune", 1, Integer::sum);
map.forEach((city, n) -> System.out.println(city + "=" + n));

String.join(", ", names);
new StringJoiner(",", "[", "]").add("a").add("b");
Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

Arrays.parallelSort(array);
Math.addExact(a, b);
new LongAdder().increment();`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Cleaning a shopping cart: removeIf, replaceAll, sort, forEach",
        },
        {
          type: "paragraph",
          text: "A cart at a snack counter has blank entries from an app glitch. I want to drop them, make the names uppercase for the printed slip, sort them and print:",
        },
        {
          type: "code",
          language: "java",
          title: "ListDefaults.java",
          code: `import java.util.*;

public class ListDefaults {
    public static void main(String[] args) {
        List<String> cart = new ArrayList<>(List.of("tea", "samosa", "", "biscuit", "  "));

        cart.removeIf(String::isBlank);                 // drop empty entries
        cart.replaceAll(String::toUpperCase);           // change every item in place
        cart.sort(Comparator.naturalOrder());           // sort in place
        cart.forEach(item -> System.out.println("- " + item));
    }
}`,
        },
        {
          type: "output",
          text: `- BISCUIT
- SAMOSA
- TEA`,
        },
        {
          type: "paragraph",
          text: "Before Java 8, `removeIf` meant an explicit `Iterator` and `it.remove()`, because removing inside a for-each loop throws `ConcurrentModificationException`. Note the `new ArrayList<>(...)` wrapper: `List.of` (Java 9) is immutable, and all three of these mutating calls would throw `UnsupportedOperationException` on it.",
        },
        {
          type: "heading",
          text: "A tea stall's stock: every Map method",
        },
        {
          type: "code",
          language: "java",
          title: "MapDefaults.java",
          code: `import java.util.*;

public class MapDefaults {
    public static void main(String[] args) {
        Map<String, Integer> stock = new TreeMap<>(Map.of("tea", 10, "coffee", 4));

        System.out.println("getOrDefault: " + stock.getOrDefault("lassi", 0));
        stock.putIfAbsent("tea", 99);                       // already there: ignored
        stock.putIfAbsent("lassi", 6);                      // missing: added
        stock.computeIfPresent("coffee", (k, v) -> v - 1);  // sold one coffee
        stock.compute("tea", (k, v) -> v == null ? 1 : v + 5);
        stock.merge("samosa", 12, Integer::sum);            // new key: just puts 12
        stock.merge("samosa", 3, Integer::sum);             // existing: 12 + 3
        stock.replaceAll((k, v) -> v * 2);                  // double everything
        stock.forEach((k, v) -> System.out.println(k + " = " + v));

        Map<String, List<String>> ordersByCity = new TreeMap<>();
        ordersByCity.computeIfAbsent("Kolkata", c -> new ArrayList<>()).add("order-1");
        ordersByCity.computeIfAbsent("Kolkata", c -> new ArrayList<>()).add("order-2");
        ordersByCity.computeIfAbsent("Pune", c -> new ArrayList<>()).add("order-3");
        System.out.println(ordersByCity);
    }
}`,
        },
        {
          type: "output",
          text: `getOrDefault: 0
coffee = 6
lassi = 12
samosa = 30
tea = 30
{Kolkata=[order-1, order-2], Pune=[order-3]}`,
        },
        {
          type: "list",
          items: [
            "I used a `TreeMap` so the print order is alphabetical and the same every run. A `HashMap` prints in hash order.",
            "Tracing `tea`: 10, `putIfAbsent(99)` ignored, `compute` adds 5 to make 15, `replaceAll` doubles to 30. `coffee`: 4, minus 1, doubled to 6.",
            "`samosa` shows both halves of `merge`: the first call had no old value so it just put `12`, the second called `Integer.sum(12, 3)`.",
            "The `computeIfAbsent(...).add(...)` line is the pattern I use most for grouping. It returns the list that's in the map (new or existing), so I can add to it in the same line. The second `Kolkata` call didn't create a new list.",
          ],
        },
        {
          type: "heading",
          text: "The null rules",
        },
        {
          type: "code",
          language: "java",
          title: "NullRules.java",
          code: `import java.util.*;

public class NullRules {
    public static void main(String[] args) {
        Map<String, Integer> m = new HashMap<>();
        m.put("tea", 5);

        m.computeIfAbsent("coffee", k -> null);            // null result: nothing stored
        System.out.println("coffee stored? " + m.containsKey("coffee"));

        m.merge("tea", 5, (oldV, newV) -> null);           // null result: key removed
        System.out.println("tea stored?    " + m.containsKey("tea"));

        m.put("lassi", null);
        System.out.println("getOrDefault on null value: " + m.getOrDefault("lassi", 0));
        m.putIfAbsent("lassi", 7);                         // a null value counts as absent
        System.out.println("putIfAbsent over null:      " + m.get("lassi"));
    }
}`,
        },
        {
          type: "output",
          text: `coffee stored? false
tea stored?    false
getOrDefault on null value: null
putIfAbsent over null:      7`,
        },
        {
          type: "paragraph",
          text: "The last two lines disagree with each other, and that's the honest truth of the API. `getOrDefault` checks `containsKey`, and `lassi` **is** a key, so it returns the stored `null`, not `0`. `putIfAbsent` treats a `null` value as absent and overwrites it. The simplest way to never think about this: don't put `null` values in maps. `ConcurrentHashMap` doesn't even allow them.",
        },
        {
          type: "heading",
          text: "Joining text: a metro route",
        },
        {
          type: "code",
          language: "java",
          title: "Joiners.java",
          code: `import java.util.*;
import java.util.stream.Collectors;

public class Joiners {
    public static void main(String[] args) {
        List<String> stops = List.of("Howrah", "Esplanade", "Park Street");

        System.out.println(String.join(" -> ", stops));

        StringJoiner csv = new StringJoiner(",", "[", "]");
        csv.setEmptyValue("no stops");
        System.out.println(csv);                     // nothing added yet
        stops.forEach(csv::add);
        System.out.println(csv + " length=" + csv.length());

        System.out.println(stops.stream().collect(Collectors.joining(" | ", "<", ">")));
    }
}`,
        },
        {
          type: "output",
          text: `Howrah -> Esplanade -> Park Street
no stops
[Howrah,Esplanade,Park Street] length=30
<Howrah | Esplanade | Park Street>`,
        },
        {
          type: "paragraph",
          text: "No more \"add a comma after every item and then chop the last one off\". `String.join` is for when I already have all the parts. `StringJoiner` is for building it up in a loop, and `setEmptyValue` covers the empty case. `Collectors.joining` is the stream version, and it uses a `StringJoiner` inside.",
        },
        {
          type: "heading",
          text: "Base64: putting bytes in a URL",
        },
        {
          type: "code",
          language: "java",
          title: "B64.java",
          code: `import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class B64 {
    public static void main(String[] args) {
        byte[] raw = "rider:Asha?>>".getBytes(StandardCharsets.UTF_8);

        String basic = Base64.getEncoder().encodeToString(raw);
        String url   = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        System.out.println("basic: " + basic);
        System.out.println("url:   " + url);

        String back = new String(Base64.getDecoder().decode(basic), StandardCharsets.UTF_8);
        System.out.println("decoded: " + back);

        try {
            Base64.getDecoder().decode(url);         // wrong decoder for '-' and '_'
        } catch (IllegalArgumentException e) {
            System.out.println("basic decoder on url text: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `basic: cmlkZXI6QXNoYT8+Pg==
url:   cmlkZXI6QXNoYT8-Pg
decoded: rider:Asha?>>
basic decoder on url text: Illegal base64 character 2d`,
        },
        {
          type: "paragraph",
          text: "I picked `?>>` on purpose, because those bytes encode to `+`, which is the character that breaks URLs. The URL encoder wrote `-` instead, and `withoutPadding()` dropped the `==`. That's the format JWTs use. The basic decoder rejected the URL version: `2d` is the hex code of `-`. Encoder and decoder have to match. Base64 is **encoding, not encryption**: anyone can decode it.",
        },
        {
          type: "heading",
          text: "Arrays: daily ride counts",
        },
        {
          type: "code",
          language: "java",
          title: "ArraysDemo.java",
          code: `import java.util.Arrays;

public class ArraysDemo {
    public static void main(String[] args) {
        int[] dailyRides = {12, 7, 20, 3, 15};

        int[] sorted = dailyRides.clone();
        Arrays.parallelSort(sorted);                         // same result as sort
        System.out.println("sorted:     " + Arrays.toString(sorted));

        int[] runningTotal = dailyRides.clone();
        Arrays.parallelPrefix(runningTotal, Integer::sum);   // each slot = sum so far
        System.out.println("running:    " + Arrays.toString(runningTotal));

        int[] squares = new int[5];
        Arrays.setAll(squares, i -> i * i);                  // fill from the index
        System.out.println("setAll:     " + Arrays.toString(squares));
    }
}`,
        },
        {
          type: "output",
          text: `sorted:     [3, 7, 12, 15, 20]
running:    [12, 19, 39, 42, 57]
setAll:     [0, 1, 4, 9, 16]`,
        },
        {
          type: "paragraph",
          text: "`parallelPrefix` is a running total, like a bank passbook's balance column: each slot becomes the sum of everything up to it. `parallelSort` splits the array and sorts the parts on the common ForkJoin pool, but only if the array is bigger than 8,192 elements. Below that it just does a normal `Arrays.sort`, so on five elements there's nothing parallel about it.",
        },
        {
          type: "heading",
          text: "Comparators: ranking drivers",
        },
        {
          type: "code",
          language: "java",
          title: "Comparators.java",
          code: `import java.util.*;

public class Comparators {
    record Driver(String name, String city, Double rating) {}

    public static void main(String[] args) {
        List<Driver> drivers = new ArrayList<>(List.of(
            new Driver("Ravi", "Pune", 4.8), new Driver("Asha", "Kolkata", 4.9),
            new Driver("Imran", "Kolkata", null), new Driver("Meera", "Pune", 4.8)));

        drivers.sort(Comparator.comparing(Driver::city)
            .thenComparing(Driver::rating, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(Driver::name));
        drivers.forEach(d -> System.out.println(d.city() + "  " + d.rating() + "  " + d.name()));

        drivers.sort(Comparator.comparing(Driver::name).reversed());
        System.out.println(drivers.stream().map(Driver::name).toList());
    }
}`,
        },
        {
          type: "output",
          text: `Kolkata  4.9  Asha
Kolkata  null  Imran
Pune  4.8  Meera
Pune  4.8  Ravi
[Ravi, Meera, Imran, Asha]`,
        },
        {
          type: "list",
          items: [
            "Read the chain like a sentence: by city, then by rating highest first with unrated drivers last, then by name.",
            "Imran has no rating yet. Without `nullsLast`, comparing his `null` would throw a `NullPointerException` in the middle of the sort.",
            "Meera and Ravi tie on city and rating, so the name decides.",
            "`reversed()` flips the **whole** comparator it's called on. On a long chain that's easy to get wrong, which is why I put the `reverseOrder()` inside the one key that needed it.",
            "(The `record` is Java 16. In Java 8 itself `Driver` would be a small class with getters, and the comparators would be the same.)",
          ],
        },
        {
          type: "heading",
          text: "Exact math: a wallet that can't wrap",
        },
        {
          type: "code",
          language: "java",
          title: "ExactMath.java",
          code: `public class ExactMath {
    public static void main(String[] args) {
        int walletPaise = Integer.MAX_VALUE;

        System.out.println("plain +:   " + (walletPaise + 1));             // silently wraps
        try {
            Math.addExact(walletPaise, 1);
        } catch (ArithmeticException e) {
            System.out.println("addExact:  " + e.getMessage());
        }
        System.out.println("toIntExact(42L): " + Math.toIntExact(42L));
        System.out.println("floorDiv(-7, 2): " + Math.floorDiv(-7, 2) + "  vs  -7 / 2 = " + (-7 / 2));
        System.out.println("floorMod(-7, 2): " + Math.floorMod(-7, 2) + "  vs  -7 % 2 = " + (-7 % 2));
        System.out.println("Integer.toUnsignedString(-1): " + Integer.toUnsignedString(-1));
    }
}`,
        },
        {
          type: "output",
          text: `plain +:   -2147483648
addExact:  integer overflow
toIntExact(42L): 42
floorDiv(-7, 2): -4  vs  -7 / 2 = -3
floorMod(-7, 2): 1  vs  -7 % 2 = -1
Integer.toUnsignedString(-1): 4294967295`,
        },
        {
          type: "paragraph",
          text: "A wallet balance that turns negative by itself is the worst kind of bug, because nothing crashes. `addExact` turns that into a loud `ArithmeticException`. `floorMod` is the one I reach for with negative numbers: `%` keeps the sign of the dividend (`-1`), `floorMod` always gives a result in the range `0` to `divisor - 1`.",
        },
        {
          type: "heading",
          text: "StampedLock: reading a cab's position",
        },
        {
          type: "paragraph",
          text: "A cab's GPS position is read thousands of times (every rider's map) and written once every few seconds. A normal read lock still costs something on every read. `StampedLock`'s optimistic read is like glancing at a notice board: read it, then check nobody changed the notice while I was reading. Only if they did, read it again properly:",
        },
        {
          type: "code",
          language: "java",
          title: "Stamped.java",
          code: `import java.util.concurrent.locks.StampedLock;

public class Stamped {
    private final StampedLock lock = new StampedLock();
    private double lat = 22.57, lng = 88.36;           // a cab's position

    void move(double newLat, double newLng) {
        long stamp = lock.writeLock();
        try { lat = newLat; lng = newLng; } finally { lock.unlockWrite(stamp); }
    }

    String read() {
        long stamp = lock.tryOptimisticRead();          // no lock taken at all
        double a = lat, b = lng;
        if (!lock.validate(stamp)) {                    // a writer got in: read again properly
            stamp = lock.readLock();
            try { a = lat; b = lng; } finally { lock.unlockRead(stamp); }
        }
        return a + "," + b;
    }

    public static void main(String[] args) {
        Stamped cab = new Stamped();
        System.out.println(cab.read());
        cab.move(22.55, 88.35);
        System.out.println(cab.read());
    }
}`,
        },
        {
          type: "output",
          text: `22.57,88.36
22.55,88.35`,
        },
        {
          type: "paragraph",
          text: "Without the `validate` check, a reader could see the new latitude with the old longitude, a position the cab was never at. Two things to know: `StampedLock` is **not reentrant** (a thread that holds the write lock and asks for it again deadlocks itself), and it doesn't support `Condition`s. For most code a `ReentrantReadWriteLock` or a plain `synchronized` is simpler.",
        },
        {
          type: "heading",
          text: "ConcurrentHashMap's new tricks",
        },
        {
          type: "code",
          language: "java",
          title: "ChmExtras.java",
          code: `import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class ChmExtras {
    public static void main(String[] args) {
        ConcurrentHashMap<String, Integer> fares = new ConcurrentHashMap<>();
        fares.put("trip-1", 120); fares.put("trip-2", 340); fares.put("trip-3", 90);

        long total = fares.reduceValuesToLong(1, Integer::longValue, 0L, Long::sum);
        String big = fares.search(1, (trip, fare) -> fare > 300 ? trip : null);
        System.out.println("total=" + total + ", over 300: " + big + ", count=" + fares.mappingCount());

        Set<String> onlineDrivers = ConcurrentHashMap.newKeySet();   // a thread-safe Set
        onlineDrivers.add("Ravi");
        onlineDrivers.add("Ravi");
        System.out.println("online: " + onlineDrivers.size());
    }
}`,
        },
        {
          type: "output",
          text: `total=550, over 300: trip-2, count=3
online: 1`,
        },
        {
          type: "paragraph",
          text: "The first argument to `reduceValuesToLong` and `search` is a **parallelism threshold**: if the map has more entries than that, the work is split across the common pool. `1` means \"parallel whenever possible\", `Long.MAX_VALUE` means \"always on this thread\". `search` stops at the first non-null result. There's no `ConcurrentHashSet` class in the JDK; `newKeySet()` is the answer.",
        },
        {
          type: "heading",
          text: "Repeating annotations: a driver with two shifts",
        },
        {
          type: "code",
          language: "java",
          title: "Repeat.java",
          code: `import java.lang.annotation.*;
import java.util.Arrays;

public class Repeat {
    @Repeatable(Shifts.class)
    @Retention(RetentionPolicy.RUNTIME)
    @interface Shift { String value(); }

    @Retention(RetentionPolicy.RUNTIME)
    @interface Shifts { Shift[] value(); }      // the hidden container

    @Shift("morning")
    @Shift("night")
    static class Driver {}

    public static void main(String[] args) {
        Shift[] shifts = Driver.class.getAnnotationsByType(Shift.class);
        System.out.println(Arrays.stream(shifts).map(Shift::value).toList());
        System.out.println("getAnnotation(Shift):  " + Driver.class.getAnnotation(Shift.class));
        System.out.println("getAnnotation(Shifts): " + (Driver.class.getAnnotation(Shifts.class) != null));
    }
}`,
        },
        {
          type: "output",
          text: `[morning, night]
getAnnotation(Shift):  null
getAnnotation(Shifts): true`,
        },
        {
          type: "paragraph",
          text: "Repeating annotations are syntax sugar. The compiler wraps the two `@Shift`s into one `@Shifts({...})` container, so the class file really has a single `@Shifts`. That's why the old `getAnnotation(Shift.class)` returns `null` here, and why Java 8 also added `getAnnotationsByType`, which looks inside the container. Spring's `@PropertySource` and JUnit 5's `@Tag` are repeatable this way.",
        },
        {
          type: "heading",
          text: "Type annotations",
        },
        {
          type: "code",
          language: "java",
          title: "TypeAnno.java",
          code: `import java.lang.annotation.*;
import java.util.List;

public class TypeAnno {
    @Target(ElementType.TYPE_USE)
    @Retention(RetentionPolicy.RUNTIME)
    @interface NonEmpty {}

    static List<@NonEmpty String> names;      // annotation on a type argument

    public static void main(String[] args) throws Exception {
        var type = (java.lang.reflect.AnnotatedParameterizedType)
            TypeAnno.class.getDeclaredField("names").getAnnotatedType();
        System.out.println(type.getAnnotatedActualTypeArguments()[0]);
    }
}`,
        },
        {
          type: "output",
          text: `@TypeAnno.NonEmpty() java.lang.String`,
        },
        {
          type: "paragraph",
          text: "Before Java 8, annotations could only go on declarations (classes, fields, methods, parameters). `ElementType.TYPE_USE` lets them go on any **use** of a type: type arguments, casts (`(@NonNull String) x`), `throws` clauses, `new` expressions. Java itself does nothing with them. They're for tools: the Checker Framework, Bean Validation 2.0's `List<@Email String>`, and nullness checkers. (`var` is Java 10; in Java 8 that line would name the type.)",
        },
        {
          type: "heading",
          text: "Parameter names at runtime",
        },
        {
          type: "code",
          language: "java",
          title: "ParamNames.java",
          code: `import java.lang.reflect.Parameter;
import java.util.Arrays;

public class ParamNames {
    static int fare(int km, int waitMinutes) { return 50 + km * 12 + waitMinutes * 2; }

    public static void main(String[] args) throws Exception {
        Parameter[] ps = ParamNames.class.getDeclaredMethod("fare", int.class, int.class).getParameters();
        System.out.println(Arrays.stream(ps).map(Parameter::getName).toList());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ParamNames.java && java ParamNames
javac -parameters ParamNames.java && java ParamNames`,
        },
        {
          type: "output",
          text: `[arg0, arg1]
[km, waitMinutes]`,
        },
        {
          type: "paragraph",
          text: "By default the class file doesn't keep parameter names, so reflection invents `arg0`, `arg1`. With `-parameters` (new in Java 8), `javac` writes a `MethodParameters` attribute. This is why Spring can bind `@PathVariable Long id` without `@PathVariable(\"id\")`: Spring Boot's build plugins turn `-parameters` on. Spring 6.1 stopped falling back to reading debug info, so a project built without `-parameters` started failing there.",
        },
        {
          type: "heading",
          text: "Nashorn: here and gone",
        },
        {
          type: "code",
          language: "java",
          title: "NashornGone.java",
          code: `import javax.script.ScriptEngineManager;

public class NashornGone {
    public static void main(String[] args) {
        System.out.println("java " + System.getProperty("java.specification.version"));
        System.out.println("nashorn engine: " + new ScriptEngineManager().getEngineByName("nashorn"));
    }
}`,
        },
        {
          type: "output",
          text: `java 21
nashorn engine: null`,
        },
        {
          type: "paragraph",
          text: "Java 8 shipped Nashorn as a faster replacement for the old Rhino JavaScript engine, built on `invokedynamic`, with the `jjs` command-line tool. It couldn't keep up with how fast JavaScript changed, was deprecated in Java 11 and removed in Java 15 (JEP 372). On Java 21 the lookup just returns `null`, no error, which is an easy way to get a confusing `NullPointerException` later. The engine lives on as a standalone library (`org.openjdk.nashorn:nashorn-core`), and GraalJS is the other option.",
        },
        {
          type: "heading",
          text: "JDBC 4.2 and java.time",
        },
        {
          type: "paragraph",
          text: "Before Java 8, a date column meant `java.sql.Date` or `java.sql.Timestamp` and a conversion dance. JDBC 4.2 lets drivers map the `java.time` types directly. I don't have a database in my scratch folder, so this one is a fragment, not a run:",
        },
        {
          type: "code",
          language: "java",
          code: `PreparedStatement ps = conn.prepareStatement(
    "SELECT id, picked_up_at FROM rides WHERE ride_date = ?");
ps.setObject(1, LocalDate.of(2026, 10, 29));                     // DATE

try (ResultSet rs = ps.executeQuery()) {
    while (rs.next()) {
        LocalDateTime at = rs.getObject("picked_up_at", LocalDateTime.class);   // TIMESTAMP
        System.out.println(rs.getLong("id") + " " + at);
    }
}`,
        },
        {
          type: "paragraph",
          text: "`setObject` and the typed `getObject(column, Class)` are the 4.2 additions. The mapping is `LocalDate` to `DATE`, `LocalTime` to `TIME`, `LocalDateTime` to `TIMESTAMP` and `OffsetDateTime` to `TIMESTAMP WITH TIME ZONE`. It depends on the driver supporting 4.2, which every current PostgreSQL and MySQL driver does. JPA 2.2 and Hibernate 5.2+ use the same mapping, so entity fields can just be `LocalDate`.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**Sharing a HashMap between threads and calling merge.** The method name doesn't make it safe. My `Counters` run lost over 100,000 of 800,000 updates. Use `ConcurrentHashMap` or a `LongAdder`.",
            "**Modifying the map inside its own compute function.** The recursive Fibonacci memo throws `ConcurrentModificationException` on `HashMap` and `IllegalStateException: Recursive update` on `ConcurrentHashMap` (Java 9+). On Java 8 it could corrupt the map or hang.",
            "**Slow work inside ConcurrentHashMap.computeIfAbsent.** The function runs while the bin is locked. A remote call there blocks every other thread whose key lands in that bin. Load first, then `putIfAbsent`, or cache the future instead of the value.",
            "**Forgetting the null rule.** Returning `null` from a `merge` or `compute` function removes the key. That's useful on purpose (\"stock hit zero, drop it\") and confusing by accident.",
            "**Expecting getOrDefault to replace a stored null.** It doesn't, as `NullRules` showed. Only a missing key gets the default.",
            "**Calling mutating defaults on immutable lists.** `List.of(...).removeIf(...)` always throws `UnsupportedOperationException`, and `Arrays.asList(...).removeIf(...)` (fixed size) throws as soon as something matches.",
            "**Using the wrong Base64 flavour.** The basic decoder rejects URL-safe text (`Illegal base64 character 2d`), and the MIME encoder adds line breaks that break tokens. Match encoder and decoder.",
            "**Calling reversed() on the end of a long comparator chain.** It reverses every key, not just the last one.",
            "**Keeping -XX:MaxPermSize in startup scripts.** Ignored with a warning on Java 8, fatal \"Unrecognized VM option\" on Java 17 and 21.",
            "**Assuming Nashorn is there.** On Java 15+, `getEngineByName(\"nashorn\")` returns `null` without any error.",
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
            "Count with `map.merge(key, 1, Integer::sum)` and group with `map.computeIfAbsent(key, k -> new ArrayList<>()).add(x)`. Both say what they mean in one line.",
            "Keep functions passed to `compute`/`merge` short, pure and free of calls back into the same map.",
            "For counters hit by many threads, `LongAdder`. For a counter map, `ConcurrentHashMap<String, LongAdder>` with `computeIfAbsent(k, x -> new LongAdder()).increment()`.",
            "Don't store `null` values in maps. Then \"absent\" has one meaning.",
            "Build delimited text with `String.join`, `StringJoiner` or `Collectors.joining`, never by trimming the last comma.",
            "Use `Base64.getUrlEncoder().withoutPadding()` for anything that goes in a URL, file name or token.",
            "Use `Math.*Exact` for money and counts where overflow would be a silent bug.",
            "Write comparators as one readable chain, and put `reverseOrder()` or `nullsLast()` on the specific key that needs it.",
            "Set `-XX:MaxMetaspaceSize` in production containers so a class loader leak fails clearly.",
            "Compile with `-parameters` (Spring Boot's plugins already do).",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "list",
          items: [
            "`HashMap.merge` and `computeIfAbsent` do one hash and one bucket walk instead of two. In a rough loop of 20 million updates on four keys, I measured get+put at 131 to 214 ms and merge at about 150 ms across three rounds. The difference was inside the noise. I use `merge` because it's clearer and safe to switch to `ConcurrentHashMap`, not for speed.",
            "`LongAdder` beats `AtomicLong` when many threads increment at once, because they spread over cells instead of retrying CAS on one value. With little contention they're about the same, and `LongAdder` uses more memory.",
            "`ConcurrentHashMap` reads take no lock at all. Updates lock only one bin. That's why it scales far better than `Collections.synchronizedMap`, which locks the whole map.",
            "`StampedLock` optimistic reads cost nearly nothing when writes are rare. When writes are frequent, readers keep failing validation and fall back to the read lock anyway.",
            "`Arrays.parallelSort` only goes parallel above 8,192 elements, and uses the common ForkJoin pool. On a busy server that pool is shared with parallel streams and `CompletableFuture`, so \"parallel\" doesn't always mean faster.",
            "`List.removeIf` on an `ArrayList` is one pass that compacts the array, O(n). Removing with an `Iterator` in a loop shifts the tail on every removal, O(n²) in the worst case.",
            "Metaspace is native memory, so it doesn't show up in heap graphs. Watch it with `jcmd <pid> VM.metaspace` or the JVM's metaspace metrics in Micrometer.",
          ],
        },
      ],
    },
    {
      title: "Java 8 Additions in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A very common backend task: at the end of the day, a small service builds a CSV of orders per city for the operations team, highest revenue first. In a Spring app this would be a method on a `@Service` called by a scheduled job or a download endpoint. It uses four Java 8 additions in about fifteen lines: `merge` to count and sum, `Comparator` chains to sort, `forEach` to loop, and `StringJoiner` with `String.join` to build the CSV.",
        },
        {
          type: "code",
          language: "java",
          title: "DailyOrderReport.java",
          code: `import java.util.*;

public class DailyOrderReport {
    record Order(String id, String city, int amount) {}

    String cityCsv(List<Order> orders) {
        Map<String, Integer> count = new HashMap<>();
        Map<String, Integer> revenue = new HashMap<>();
        for (Order o : orders) {
            count.merge(o.city(), 1, Integer::sum);             // +1 order for this city
            revenue.merge(o.city(), o.amount(), Integer::sum);  // + this order's amount
        }

        List<String> cities = new ArrayList<>(count.keySet());
        cities.sort(Comparator.comparing((String c) -> revenue.get(c)).reversed()
                              .thenComparing(Comparator.naturalOrder()));

        StringJoiner csv = new StringJoiner("\\n", "city,orders,revenue\\n", "");
        cities.forEach(c -> csv.add(String.join(",", c, "" + count.get(c), "" + revenue.get(c))));
        return csv.toString();
    }

    public static void main(String[] args) {
        List<Order> today = List.of(
            new Order("o1", "Kolkata", 240), new Order("o2", "Pune", 180),
            new Order("o3", "Kolkata", 120), new Order("o4", "Delhi", 360),
            new Order("o5", "Pune", 200));
        System.out.println(new DailyOrderReport().cityCsv(today));
    }
}`,
        },
        {
          type: "output",
          text: `city,orders,revenue
Pune,2,380
Delhi,1,360
Kolkata,2,360`,
        },
        {
          type: "list",
          items: [
            "`count.merge(o.city(), 1, Integer::sum)` is the tally book: first order for a city puts `1`, every later one adds `1`. The revenue map does the same with the amount.",
            "`Comparator.comparing((String c) -> revenue.get(c)).reversed()` sorts by revenue, highest first. The `(String c)` type is needed because without it the compiler can't infer the lambda's type before `.reversed()` is applied. Here `reversed()` is placed before `thenComparing`, so it only flips the revenue key.",
            "Delhi and Kolkata tie on 360, so `thenComparing(Comparator.naturalOrder())` puts them alphabetically. Without a tie-breaker their order would depend on `HashMap` iteration order and could change between runs, which makes reports annoying to compare.",
            "`StringJoiner` with a prefix gives the header line for free, and there's no trailing newline to trim.",
          ],
        },
        {
          type: "paragraph",
          text: "If the orders came in on many threads at once (say, from a message consumer) instead of a list, I'd switch both maps to `ConcurrentHashMap` and keep the same `merge` calls. That's the payoff of writing it with `merge` instead of get-then-put: the code stays the same and becomes thread-safe.",
        },
        {
          type: "paragraph",
          text: "For a real CSV with commas or quotes inside values I'd use a CSV library, because `String.join` doesn't escape anything. On my RideX project, end-of-day summaries were built in this same shape.",
        },
      ],
    },
    {
      title: "Java 8 Features at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "Here's the whole Java 8 release on one table, with the lesson that covers each part. This lesson is the last row.",
        },
        {
          type: "table",
          headers: ["Feature", "What it gave me", "Lesson"],
          rows: [
            ["Lambda expressions", "Pass behaviour as a value: `x -> x * 2`", "Lambda Expressions"],
            ["Functional interfaces", "`Function`, `Predicate`, `Supplier`, `Consumer` and `@FunctionalInterface`", "Functional Interfaces"],
            ["Method references", "`String::length`, `Integer::sum`, `ArrayList::new`", "Method References"],
            ["Default and static interface methods", "Evolving interfaces without breaking implementers", "Default and Static Interface Methods"],
            ["Stream API", "`filter`, `map`, `reduce`, lazy pipelines, parallel streams", "Streams API"],
            ["Collectors", "`groupingBy`, `partitioningBy`, `toMap`, `joining`", "Collectors"],
            ["`Optional`", "A return type that says \"maybe no value\"", "Optional"],
            ["Date and Time API (`java.time`)", "Immutable `LocalDate`, `Instant`, `ZonedDateTime`, `Duration`", "Date and Time API"],
            ["`CompletableFuture`", "Async pipelines with callbacks, combining and timeouts", "CompletableFuture"],
            ["Collection and Map defaults", "`removeIf`, `merge`, `computeIfAbsent`, `forEach`", "this lesson"],
            ["Strings, Base64, Arrays, Math", "`String.join`, `StringJoiner`, `Base64`, `parallelSort`, `addExact`", "this lesson"],
            ["Concurrency updates", "`LongAdder`, `StampedLock`, new `ConcurrentHashMap`", "this lesson"],
            ["Metaspace", "Class metadata in native memory, PermGen gone", "this lesson"],
            ["Annotations and reflection", "Type annotations, `@Repeatable`, `-parameters`", "this lesson"],
            ["Nashorn, JDBC 4.2", "JavaScript on the JVM (removed in 15), `java.time` in JDBC", "this lesson"],
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
              question: "Besides lambdas and streams, what else came in Java 8?",
              answer:
                "Default and static methods in interfaces, which made it possible to add `forEach`, `removeIf`, `merge`, `computeIfAbsent` and others to the collection interfaces. Plus `Optional`, the `java.time` API, `CompletableFuture`, `String.join` and `StringJoiner`, `java.util.Base64`, `Arrays.parallelSort`, `Math.addExact` and friends, `LongAdder` and `StampedLock`, and a rewritten `ConcurrentHashMap`.\n\nOn the JVM side, Metaspace replaced PermGen. On the language side, type annotations, repeatable annotations and `-parameters` for runtime parameter names. And Nashorn, which has since been removed.",
            },
            {
              question: "What does Map.merge do?",
              answer:
                "`merge(key, value, fn)`: if the key is missing (or mapped to null), it puts `value`. If it's present, it puts `fn(oldValue, value)`. If `fn` returns null, the key is removed.\n\nThe classic use is counting: `counts.merge(word, 1, Integer::sum)`. In my stock example, the first `merge(\"samosa\", 12, ...)` just put 12 and the second made it 15.",
            },
            {
              question: "What's the difference between putIfAbsent and computeIfAbsent?",
              answer:
                "`putIfAbsent(k, v)` takes a value that's already been created, even if it won't be used. `computeIfAbsent(k, fn)` takes a function and only calls it when the key is missing, so the value is created lazily.\n\nThe other difference is the return value: `putIfAbsent` returns the previous value (null if it put), while `computeIfAbsent` returns the current value, new or existing. That's why `computeIfAbsent(k, x -> new ArrayList<>()).add(item)` works in one line and the `putIfAbsent` version doesn't.",
            },
            {
              question: "What's the difference between String.join and StringJoiner?",
              answer:
                "`String.join(delimiter, parts)` is a one-shot call when I already have all the pieces. `StringJoiner` is a builder: I create it with a delimiter and optional prefix and suffix, `add` pieces one by one, and can set an empty value for when nothing was added.\n\n`String.join` actually uses a `StringJoiner`-style join inside, and `Collectors.joining` uses `StringJoiner` too.",
            },
            {
              question: "What Base64 encoders does Java 8 provide?",
              answer:
                "Three: basic (`getEncoder`), URL and filename safe (`getUrlEncoder`, which uses `-` and `_` instead of `+` and `/`), and MIME (`getMimeEncoder`, with line breaks every 76 characters). Each has a matching decoder, and `withoutPadding()` drops the trailing `=`.\n\nThe decoder has to match: the basic decoder rejected my URL-safe text with `Illegal base64 character 2d`. Before Java 8 people used the internal `sun.misc.BASE64Encoder` or Apache Commons Codec.",
            },
            {
              question: "What replaced PermGen in Java 8, and why?",
              answer:
                "Metaspace. Class metadata moved from the fixed-size PermGen, part of the Java heap, into native memory, allocated per class loader. PermGen's small fixed limit caused `OutOfMemoryError: PermGen space` in apps that loaded many classes or leaked class loaders on redeploy, and tuning `MaxPermSize` was guesswork.\n\nMetaspace grows as needed by default (`MaxMetaspaceSize` is unlimited), and a whole loader's metadata is freed when the loader is collected. Interned strings and static fields had already moved to the heap in Java 7.",
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
              question: "Is HashMap.merge thread-safe?",
              answer:
                "No. `HashMap` gives no thread-safety for any method. With eight threads doing 100,000 merges each, my `HashMap` ended at 693,261 and 631,849 in two runs instead of 800,000. The same code on a `ConcurrentHashMap` gave exactly 800,000.\n\nThe atomicity comes from the implementation, not from the method name on `Map`.",
            },
            {
              question: "What happens if the function passed to computeIfAbsent returns null?",
              answer:
                "Nothing is stored, and `computeIfAbsent` returns null. Same family rule: for `computeIfPresent`, `compute` and `merge`, a null result removes the existing entry.\n\nMy `NullRules` program checked both: `computeIfAbsent(\"coffee\", k -> null)` left no key, and a `merge` returning null removed `tea`.",
            },
            {
              question: "Does getOrDefault return the default when the key maps to null?",
              answer:
                "No. It returns the default only if the key is missing. A key that's present with a `null` value returns `null`. But `putIfAbsent` and `computeIfAbsent` treat a `null` value as absent and replace it.\n\nMy test printed `null` for `getOrDefault(\"lassi\", 0)` and then `7` after `putIfAbsent(\"lassi\", 7)`. The easy way out is not storing null values at all.",
            },
            {
              question: "Why is calling computeIfAbsent recursively on the same map a problem?",
              answer:
                "Because the map is in the middle of an update when the function runs. On Java 9+, `HashMap` detects the modification with `modCount` and throws `ConcurrentModificationException`, and `ConcurrentHashMap` detects that the bin is already being computed and throws `IllegalStateException: Recursive update`. My memoised Fibonacci hit exactly those two.\n\nOn Java 8 there was no check, so `HashMap` could end up corrupted and `ConcurrentHashMap` could spin forever. The fix is a plain `get`, compute outside the map, then `put`.",
            },
            {
              question: "Why does getAnnotation return null for a repeated annotation?",
              answer:
                "Because when an annotation is repeated, the compiler stores it as one container annotation, here `@Shifts({@Shift(\"morning\"), @Shift(\"night\")})`. There's no direct `@Shift` on the class anymore, so `getAnnotation(Shift.class)` is null and `getAnnotation(Shifts.class)` isn't.\n\nJava 8 added `getAnnotationsByType(Shift.class)`, which looks through the container and returned both shifts in my run.",
            },
            {
              question: "What's the difference between Math.addExact and the + operator?",
              answer:
                "On overflow, `+` wraps around silently: `Integer.MAX_VALUE + 1` printed `-2147483648`. `Math.addExact` throws `ArithmeticException: integer overflow` instead.\n\nThe family also has `subtractExact`, `multiplyExact`, `incrementExact`, `decrementExact`, `negateExact` and `toIntExact` for narrowing a `long`. Java 8 also added `floorDiv` and `floorMod`, which round toward negative infinity: `floorMod(-7, 2)` is 1, while `-7 % 2` is -1.",
            },
            {
              question: "Is Nashorn still available?",
              answer:
                "Not in the JDK. It came in Java 8, was deprecated in Java 11 and removed in Java 15 by JEP 372. On my JDK 21, `new ScriptEngineManager().getEngineByName(\"nashorn\")` returned `null`, with no exception.\n\nIt's available as a standalone library, `org.openjdk.nashorn:nashorn-core`, and GraalJS is the other common choice.",
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
              question: "How does ConcurrentHashMap make compute and merge atomic?",
              answer:
                "Per bin. If the key's bin is empty, the new node goes in with a CAS. Otherwise the thread synchronizes on the first node of that bin and does the whole lookup, function call and update while holding that lock. Threads working on other bins aren't affected, and reads never lock.\n\nSo the function runs at most once per call and nobody else can change that key meanwhile. The flip side is that a slow function blocks other writers to the same bin, and touching the same map inside the function is forbidden.",
            },
            {
              question: "How did ConcurrentHashMap change from Java 7 to Java 8?",
              answer:
                "Java 7 split the map into segments (16 by default), each a small hash table with its own `ReentrantLock`, so at most 16 writers could work in parallel. Java 8 removed segments as the locking unit: it's one table of bins, with CAS for empty bins and `synchronized` on the first node for the rest, so concurrency scales with the table size.\n\nJava 8 also added tree bins for long collision chains, atomic `compute`/`merge`, bulk parallel operations like `search` and `reduce`, a `LongAdder`-style size counter with `mappingCount()`, and `newKeySet()`.",
            },
            {
              question: "How does LongAdder outperform AtomicLong under contention?",
              answer:
                "`AtomicLong` is one memory location, and every thread CASes it, so under heavy contention most attempts fail and retry. `LongAdder` has a `base` plus an array of padded `Cell`s. Uncontended adds go to `base`, and once threads collide, each is hashed to a cell, so they mostly update different memory.\n\n`sum()` adds base plus all cells. The trade-offs: more memory, and `sum()` isn't an atomic snapshot while updates are happening. Good for statistics, wrong for sequence numbers.",
            },
            {
              question: "What is the difference between MetaspaceSize and MaxMetaspaceSize?",
              answer:
                "`MaxMetaspaceSize` is the hard cap. It defaults to unlimited, which printed as `18446744073709551615` on my JDK 21. Hitting it gives `OutOfMemoryError: Metaspace`, which my leaking class loader test reached after about 5,000 loaders with a 32 MB cap.\n\n`MetaspaceSize` (about 21 MB by default) is not a limit. It's the high-water mark that triggers the first GC to try unloading classes, and it's adjusted after each GC.",
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
            "**Word count.** Split `\"tea coffee tea lassi tea coffee\"` on spaces and count each word into a `TreeMap` with `merge`. Hint: `counts.merge(w, 1, Integer::sum)`.",
            "**Group by first letter.** Group `List.of(\"Asha\", \"Ravi\", \"Arjun\", \"Rina\", \"Meera\")` into `Map<Character, List<String>>` using `computeIfAbsent`. Hint: `name.charAt(0)` is the key.",
            "**Stock that runs out.** Start with `tea=2`. Call `computeIfPresent(\"tea\", (k, v) -> v - 1 == 0 ? null : v - 1)` twice and print the map after each call. Predict what happens to the key.",
            "**Receipt line.** Use a `StringJoiner` with delimiter `\" + \"`, prefix `\"Total: \"`, suffix `\" rupees\"` and empty value `\"nothing ordered\"`. Print it before and after adding three prices.",
            "**URL-safe token.** Base64-encode `\"user=42&role=admin\"` with the basic and the URL encoders, then decode the URL one with the URL decoder. Hint: try the wrong decoder too and read the error.",
            "**Leaderboard.** Sort a list of players by score (highest first), then by name, where some scores are `null` and should go last. Hint: `thenComparing` and `Comparator.nullsLast(Comparator.reverseOrder())` on the score key.",
            "**Overflow guard.** Write `int addToWallet(int balance, int amount)` that uses `Math.addExact` and returns `-1` on overflow. Test it with `Integer.MAX_VALUE`.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Expected output for exercise 1",
              answer:
                "`{coffee=2, lassi=1, tea=3}`. The `TreeMap` keeps the keys in alphabetical order, so the output is the same on every run.",
            },
            {
              question: "Expected result for exercise 3",
              answer:
                "After the first call, `{tea=1}`. After the second, the function returns `null`, so the key is removed and the map prints `{}`.\n\nThat's the null rule working on purpose: when stock hits zero, the item disappears from the menu.",
            },
            {
              question: "Expected output for exercise 4",
              answer:
                "Before adding: `nothing ordered`. After adding 120, 40 and 15: `Total: 120 + 40 + 15 rupees`.\n\nThe prefix and suffix only appear once something has been added. Until then the empty value wins.",
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
          text: `COLLECTIONS  forEach  removeIf  replaceAll  List.sort
MAP          getOrDefault  putIfAbsent  computeIfAbsent
             computeIfPresent  compute  merge  forEach  replaceAll
             null from fn -> remove / don't add
             HashMap: one lookup, not thread-safe
             ConcurrentHashMap: atomic per key, fn runs under bin lock
             recursive update on same map -> CME / "Recursive update" (9+)

STRINGS      String.join   StringJoiner(delim, prefix, suffix)
BASE64       basic | url (- _) | mime (76-char lines); decoder must match
ARRAYS       parallelSort (>8192)  parallelPrefix  setAll
COMPARATOR   comparing  thenComparing  reversed (whole chain!)  nullsLast
MATH         addExact ... toIntExact -> ArithmeticException; floorDiv/floorMod

CONCURRENCY  LongAdder (striped cells)   StampedLock (optimistic read)
             CHM: search / reduce / mappingCount / newKeySet

JVM          PermGen (heap, fixed) -> Metaspace (native, per loader)
             MaxPermSize: warning in 8, fatal on 17 / 21
ANNOTATIONS  TYPE_USE anywhere a type is used;  @Repeatable + container
             getAnnotationsByType;  javac -parameters
GONE         Nashorn: added 8, deprecated 11, removed 15
JDBC 4.2     setObject / getObject(col, LocalDate.class)`,
          caption: "Everything in Java 8 that isn't a lambda or a stream, on one screen.",
        },
        {
          type: "list",
          items: [
            "Most of these are default methods, added to old interfaces without breaking them. That's the same feature that made lambdas fit into the existing collections.",
            "`merge` and `computeIfAbsent` are the two I'd learn first. Their promise about threads comes from the map class, not the method.",
            "Metaspace removed a fixed limit, not the possibility of a leak. Cap it in production.",
          ],
        },
      ],
    },
  ],
};
