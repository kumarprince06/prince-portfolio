import type { Lesson } from "../types";

export const collectors: Lesson = {
  slug: "collectors",
  date: "2026-10-29",
  title: "Collectors",
  description:
    "How a stream's results get gathered into lists, maps, totals and reports: toList, toMap, joining, groupingBy, partitioningBy and their downstream collectors, down to the four functions inside every Collector and how a parallel collect merges partial results.",
  tags: ["Core Java", "Java 8", "Streams", "Collectors", "Collections"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "After washing clothes, I don't leave them in one heap. I sort them into piles: red clothes here, blue clothes there. The heap goes in, and organised piles come out.",
        },
        {
          type: "paragraph",
          text: "A **collector** does that sorting at the end of a stream. It decides what shape the result takes: a list, a set, a map, one long line of text, or groups like my piles. `Collectors.groupingBy(...)` makes the piles, and I only have to say what each pile is based on, here the colour word.",
        },
        {
          type: "paragraph",
          text: "I use collectors for reports: totals per city, trips per driver, names joined with commas. One `collect(...)` call replaces a whole loop that fills a map by hand.",
        },
        {
          type: "code",
          language: "java",
          code: `List<String> clothes = List.of("red shirt", "blue jeans", "red socks", "blue cap");
Map<String, List<String>> piles = clothes.stream()
        .collect(Collectors.groupingBy(item -> item.split(" ")[0]));
System.out.println(piles);`,
        },
        {
          type: "output",
          text: `{red=[red shirt, red socks], blue=[blue jeans, blue cap]}`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "A collector decides what the stream turns into at the end: a list, a map, a string, or groups.",
        },
      ],
    },
    {
      title: "What a Collector Is",
      blocks: [
        {
          type: "paragraph",
          text: "In the Streams API lesson, almost every pipeline ended with `.collect(Collectors.toList())`. I wrote it so often that I stopped seeing it. But that one call is where most of the real work in reporting code happens: totals per city, trips per driver, a map from id to object, a comma-separated list for an email.",
        },
        {
          type: "paragraph",
          text: "A **collector** is a recipe for turning a stream of elements into one result container. `Stream.collect(collector)` is the terminal operation, and `java.util.stream.Collectors` is a class full of ready-made recipes: `toList`, `toSet`, `toMap`, `joining`, `counting`, `groupingBy`, `partitioningBy` and more. Most of them can be **nested**: \"group by city, and inside each city, sum the fares\" is one collector inside another.",
        },
        {
          type: "paragraph",
          text: "Under all of them is one small interface, `Collector<T, A, R>`, with four functions. Once I understood those four functions, `groupingBy` stopped being magic, and writing my own collector became a ten-line job. That's where this lesson goes after the everyday recipes.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Collectors shipped with streams in Java 8 (2014), as part of JSR 335. The designers had a problem: `reduce` folds elements into one immutable value, which is perfect for a sum but terrible for building a list, because \"add an element\" would mean copying the whole list each time. They needed a **mutable reduction**: start with an empty container, add elements into it in place, and in parallel, merge containers. `Collector` is the packaged form of that idea.",
        },
        {
          type: "paragraph",
          text: "If I squint, `groupingBy` is SQL's `GROUP BY` and the downstream collectors are its aggregate functions (`COUNT`, `SUM`, `AVG`, `MAX`). That's not an accident. The library authors pointed at SQL as the model for what people would want to do with in-memory data.",
        },
        {
          type: "paragraph",
          text: "Later versions filled gaps: `filtering`, `flatMapping` and a clearer `toMap` duplicate-key message in Java 9, `toUnmodifiableList`/`Set`/`Map` in Java 10, `teeing` in Java 12, and `Stream.toList()` in Java 16 as a shortcut for the most common case. I mark the version each time one comes up.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a collector as sorting the post at a small post office at the end of the day.",
        },
        {
          type: "list",
          items: [
            "**Supplier:** fetch an empty tray to put letters in.",
            "**Accumulator:** take one letter and put it in the tray. Repeated for every letter.",
            "**Combiner:** on a busy day, three clerks each fill their own tray, and at the end the trays are tipped into one. A single clerk never needs this step.",
            "**Finisher:** turn the full tray into the thing that's actually sent out, like a bundle with a rubber band and a count written on top. Sometimes the tray **is** the result, and there's nothing to do.",
          ],
        },
        {
          type: "paragraph",
          text: "`groupingBy` is the wall of pigeonholes, one per pin code. Each letter goes into the hole for its pin code, and each hole can be its own little process: count the letters, or bundle them, or keep only the registered ones. That's a downstream collector.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/collectors-groupingby.svg",
          alt: "Five trips flow into groupingBy(Trip::city), which splits them into Pune, Delhi and Kolkata buckets; summingDouble(Trip::fare) totals each bucket into a Map of city to total fare",
          caption: "`groupingBy` picks the bucket and the downstream collector, here `summingDouble(Trip::fare)`, decides what each bucket becomes.",
        },
        {
          type: "heading",
          text: "The interface",
        },
        {
          type: "code",
          language: "java",
          title: "java.util.stream.Collector (the parts that matter)",
          code: `public interface Collector<T, A, R> {
    Supplier<A> supplier();             // make an empty container
    BiConsumer<A, T> accumulator();     // fold one element into a container
    BinaryOperator<A> combiner();       // merge two containers (parallel)
    Function<A, R> finisher();          // container -> final result
    Set<Characteristics> characteristics();

    enum Characteristics { CONCURRENT, UNORDERED, IDENTITY_FINISH }
}`,
        },
        {
          type: "table",
          headers: ["Type parameter", "Meaning", "For toList()"],
          rows: [
            ["`T`", "Element type coming in", "whatever the stream holds"],
            ["`A`", "The mutable container while collecting (often hidden as `?`)", "`ArrayList<T>`"],
            ["`R`", "The final result type", "`List<T>`"],
          ],
        },
        {
          type: "heading",
          text: "The three characteristics",
        },
        {
          type: "list",
          items: [
            "**IDENTITY_FINISH:** the container is already the result, so the finisher can be skipped (an unchecked cast from `A` to `R`). `toList` has it. `joining` doesn't, because its container is a `StringBuilder` and the finisher calls `toString()`.",
            "**UNORDERED:** the result doesn't depend on encounter order. `toSet` has it, so the stream is free to drop ordering constraints.",
            "**CONCURRENT:** one container can be safely accumulated into by many threads at once. Only `toConcurrentMap` and `groupingByConcurrent` have it. Combined with UNORDERED, a parallel collect uses **one** shared container and no combiner.",
          ],
        },
        {
          type: "heading",
          text: "The families of built-in collectors",
        },
        {
          type: "table",
          headers: ["Family", "Collectors", "Since"],
          rows: [
            ["Into a collection", "`toList`, `toSet`, `toCollection(supplier)`", "8"],
            ["Unmodifiable", "`toUnmodifiableList`, `toUnmodifiableSet`, `toUnmodifiableMap`", "10"],
            ["Into a map", "`toMap` (2, 3, 4 args), `toConcurrentMap`", "8"],
            ["Text", "`joining()`, `joining(sep)`, `joining(sep, prefix, suffix)`", "8"],
            ["Numbers", "`counting`, `summingInt/Long/Double`, `averagingX`, `summarizingX`", "8"],
            ["Pick one", "`minBy(cmp)`, `maxBy(cmp)`, `reducing(...)`", "8"],
            ["Group", "`groupingBy` (1, 2, 3 args), `groupingByConcurrent`, `partitioningBy` (1, 2 args)", "8"],
            ["Adapt a downstream", "`mapping`, `collectingAndThen`", "8"],
            ["Adapt a downstream", "`filtering`, `flatMapping`", "9"],
            ["Two at once", "`teeing(c1, c2, merger)`", "12"],
          ],
        },
        {
          type: "paragraph",
          text: "The mental model I use: the **outer** collector decides the shape (a list, a map of groups, a true/false split), and the **downstream** collector decides what goes in each slot (a list, a count, a sum, the max).",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Watching the four functions run",
        },
        {
          type: "paragraph",
          text: "I wrote a collector with `Collector.of` where each function prints what it's doing, then collected three tea-stall orders into a bill:",
        },
        {
          type: "code",
          language: "java",
          title: "TracedCollector.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collector;

public class TracedCollector {
    public static void main(String[] args) {
        Collector<String, List<String>, String> bill = Collector.of(
                () -> { System.out.println("supplier    -> new empty tray"); return new ArrayList<>(); },
                (tray, item) -> { System.out.println("accumulator -> put " + item); tray.add(item); },
                (a, b) -> { System.out.println("combiner    -> merge trays"); a.addAll(b); return a; },
                tray -> { System.out.println("finisher    -> print bill"); return String.join(" + ", tray); });

        String result = List.of("tea", "samosa", "juice").stream().collect(bill);
        System.out.println(result);
    }
}`,
        },
        {
          type: "output",
          text: `supplier    -> new empty tray
accumulator -> put tea
accumulator -> put samosa
accumulator -> put juice
finisher    -> print bill
tea + samosa + juice`,
        },
        {
          type: "paragraph",
          text: "Sequentially: one `supplier` call, one `accumulator` call per element, **no** combiner call, and one `finisher` call. That's exactly what `Stream.collect` does in sequential mode. In the JDK, `collect` turns the collector into a reduce operation (`ReduceOps.makeRef(collector)`) whose sink is roughly:",
        },
        {
          type: "code",
          language: "text",
          title: "The sink a collector becomes (simplified)",
          code: `begin(size):   state = supplier.get()
accept(t):     accumulator.accept(state, t)
combine(other): state = combiner.apply(state, other.state)   // parallel only

after the pipeline:
    if IDENTITY_FINISH: return (R) state
    else:               return finisher.apply(state)`,
        },
        {
          type: "paragraph",
          text: "It's the same Sink chain from the Streams lesson. The collector's sink is just the innermost sink, the one at the counter.",
        },
        {
          type: "heading",
          text: "A parallel collect: one container per piece, then merge",
        },
        {
          type: "paragraph",
          text: "In parallel, the source is split into pieces (leaves), and each leaf runs the same sink on its own piece, so each leaf calls the supplier and gets its **own** container. No locks, because no two threads ever touch the same container.",
        },
        {
          type: "paragraph",
          text: "As leaves finish, their parent task calls the combiner on the left and right results. Since a binary tree with `n` leaves has `n - 1` merge points, the number of containers minus the number of combines should always be exactly 1. I counted:",
        },
        {
          type: "code",
          language: "java",
          title: "ParallelCollect.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collector;
import java.util.stream.IntStream;

public class ParallelCollect {
    public static void main(String[] args) {
        AtomicInteger trays = new AtomicInteger();
        AtomicInteger merges = new AtomicInteger();

        Collector<Integer, List<Integer>, List<Integer>> toTray = Collector.of(
                () -> { trays.incrementAndGet(); return new ArrayList<>(); },
                List::add,
                (a, b) -> { merges.incrementAndGet(); a.addAll(b); return a; });

        List<Integer> tokens = IntStream.rangeClosed(1, 1_000).boxed().parallel().collect(toTray);

        System.out.println("size " + tokens.size() + ", in order? " + tokens.equals(IntStream.rangeClosed(1, 1_000).boxed().toList()));
        System.out.println("trays - merges = " + (trays.get() - merges.get()));
        System.out.println("trays on this run: " + trays.get());
    }
}`,
        },
        {
          type: "output",
          text: `size 1000, in order? true
trays - merges = 1
trays on this run: 64`,
        },
        {
          type: "list",
          items: [
            "`trays - merges = 1` on every run: each leaf made a container, and every merge removed one, until one was left.",
            "`64` trays is specific to my machine. The common pool there has 15 workers, so the stream aims for leaves of about `1000 / (15 * 4)`, roughly 16 elements, and halving 1000 down to that size gives 64 pieces. With `-Djava.util.concurrent.ForkJoinPool.common.parallelism=3` the same program made 16 trays (target about 83 elements per leaf). Same answer either way.",
            "The list came out in order even though threads finished in random order. The combiner is always called as `combiner(leftResult, rightResult)`, so `a.addAll(b)` puts earlier elements first. That's why the combiner must keep \"left before right\" for any ordered collector.",
            "The supplier is called many times. A supplier that returns the **same** container every time (a field, say) would make all leaves share one `ArrayList`, which brings back the data race from `SharedListBug` in the Streams lesson. It must return a **new** container each call.",
          ],
        },
        {
          type: "heading",
          text: "CONCURRENT collectors skip the merge",
        },
        {
          type: "paragraph",
          text: "`ReferencePipeline.collect` checks three things: the stream is parallel, the collector is `CONCURRENT`, and either the stream or the collector is unordered. If all are true, it calls the supplier **once** and lets every thread call the accumulator on that one shared container (which must therefore be thread-safe, like a `ConcurrentHashMap`). No combiner runs. Otherwise it uses the per-leaf containers and merges. I printed the characteristics of a few built-ins:",
        },
        {
          type: "code",
          language: "java",
          title: "Characteristics.java",
          code: `import java.util.stream.Collectors;

public class Characteristics {
    public static void main(String[] args) {
        System.out.println("toList        " + Collectors.toList().characteristics());
        System.out.println("toSet         " + Collectors.toSet().characteristics());
        System.out.println("joining       " + Collectors.joining().characteristics());
        System.out.println("counting      " + Collectors.counting().characteristics());
        System.out.println("groupingBy    " + Collectors.groupingBy(String::length).characteristics());
        System.out.println("groupingByC.  " + Collectors.groupingByConcurrent(String::length).characteristics());
        System.out.println("toUnmodList   " + Collectors.toUnmodifiableList().characteristics());
    }
}`,
        },
        {
          type: "output",
          text: `toList        [IDENTITY_FINISH]
toSet         [UNORDERED, IDENTITY_FINISH]
joining       []
counting      []
groupingBy    [IDENTITY_FINISH]
groupingByC.  [CONCURRENT, UNORDERED, IDENTITY_FINISH]
toUnmodList   []`,
        },
        {
          type: "list",
          items: [
            "`joining` has a finisher (`StringBuilder` to `String`), so no IDENTITY_FINISH.",
            "`counting` has none either. In current JDKs it's built on `summingLong`, whose container is a one-element `long[]`, and the finisher unwraps it. My old notes said `counting()` was a simple `reduce(0L, ...)`. That was the Java 8 implementation. The visible behaviour is the same.",
            "`groupingBy` with the default `toList` downstream is IDENTITY_FINISH, because the map of lists is already the answer. With a downstream that has a finisher (like `counting`), it isn't.",
            "`toUnmodifiableList` builds an `ArrayList` and its finisher copies it into an unmodifiable list, so no IDENTITY_FINISH.",
          ],
        },
        {
          type: "heading",
          text: "How groupingBy is built",
        },
        {
          type: "paragraph",
          text: "`groupingBy(classifier, mapFactory, downstream)` is itself just a collector whose container is a `Map<K, A>`: a map from each key to a **downstream container**. In the JDK source the accumulator is essentially:",
        },
        {
          type: "code",
          language: "java",
          title: "groupingBy's accumulator (from the JDK, lightly trimmed)",
          code: `BiConsumer<Map<K, A>, T> accumulator = (m, t) -> {
    K key = Objects.requireNonNull(classifier.apply(t), "element cannot be mapped to a null key");
    A container = m.computeIfAbsent(key, k -> downstreamSupplier.get());
    downstreamAccumulator.accept(container, t);
};`,
        },
        {
          type: "list",
          items: [
            "**Supplier:** the map factory, `HashMap::new` by default.",
            "**Accumulator:** compute the key, find that key's downstream container (creating it with the downstream's supplier the first time the key appears), and feed the element to the downstream's accumulator. A key exists only if at least one element mapped to it.",
            "**Combiner:** merge two maps key by key. When both maps have a key, the two downstream containers are merged with the **downstream's** combiner.",
            "**Finisher:** if the downstream is IDENTITY_FINISH (like `toList`), nothing to do. Otherwise it runs `map.replaceAll((k, v) -> downstreamFinisher.apply(v))`, turning each container into its final value, a `long[]` into a `Long` for `counting`, say. That's why the map's value type changes from `A` to `D` at the end.",
          ],
        },
        {
          type: "paragraph",
          text: "To check I really understood it, I wrote my own `groupBy` with `Collector.of` (using `TreeMap` so the output is sorted) and ran it sequentially and in parallel against the real `counting()` downstream:",
        },
        {
          type: "code",
          language: "java",
          title: "MyGroupingBy.java",
          code: `import java.util.*;
import java.util.function.*;
import java.util.stream.Collector;
import java.util.stream.Collectors;

public class MyGroupingBy {
    static <T, K, A, D> Collector<T, ?, Map<K, D>> groupBy(Function<T, K> keyOf, Collector<T, A, D> downstream) {
        return Collector.<T, Map<K, A>, Map<K, D>>of(
                TreeMap::new,                                              // one map for the run
                (map, t) -> {
                    A box = map.computeIfAbsent(keyOf.apply(t), k -> downstream.supplier().get());
                    downstream.accumulator().accept(box, t);              // fill that key's box
                },
                (left, right) -> {                                         // parallel: merge maps
                    right.forEach((k, box) -> left.merge(k, box, downstream.combiner()));
                    return left;
                },
                map -> {                                                   // finish every box
                    Map<K, D> done = new TreeMap<>();
                    map.forEach((k, box) -> done.put(k, downstream.finisher().apply(box)));
                    return done;
                });
    }

    public static void main(String[] args) {
        System.out.println(Trips.TODAY.stream().collect(groupBy(Trips.Trip::city, Collectors.counting())));
        System.out.println(Trips.TODAY.parallelStream().collect(groupBy(Trips.Trip::city, Collectors.counting())));
    }
}`,
        },
        {
          type: "output",
          text: `{Delhi=2, Kolkata=2, Mumbai=2}
{Delhi=2, Kolkata=2, Mumbai=2}`,
        },
        {
          type: "paragraph",
          text: "(`Trips` is the six-trip data set from Syntax at a Glance.) It works in both modes, and it shows why a parallel `groupingBy` can disappoint: every leaf builds a whole map, and every merge walks a whole map. With many distinct keys, the merging can cost more than the grouping. `groupingByConcurrent` avoids it by having all threads write into one `ConcurrentHashMap`, giving up encounter order inside each group.",
        },
        {
          type: "heading",
          text: "How toMap detects a duplicate key",
        },
        {
          type: "paragraph",
          text: "The two-argument `toMap(keyMapper, valueMapper)` (since Java 9) accumulates with `putIfAbsent` and throws if there was already a value for that key. That's where the message in the Examples section comes from: `Duplicate key Kolkata (attempted merging values 220.0 and 150.0)`.",
        },
        {
          type: "paragraph",
          text: "In Java 8, the same mistake threw `IllegalStateException: Duplicate key 220.0`, printing the **value** where it said \"key\", which confused a lot of people (JDK-8040892, fixed in 9). It also rejects `null` values, because `HashMap.merge` and the newer accumulator both refuse them.",
        },
      ],
    },
    {
      title: "Collectors in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `groupingBy(Trip::city, counting())

   T1 Kolkata ─┐            HashMap<String, long[]>          finisher
   T2 Delhi   ─┤  key   ┌──────────┬────────┐          ┌──────────┬────┐
   T3 Kolkata ─┼──────► │ Kolkata  │ [2]    │  ──────► │ Kolkata  │ 2  │
   T4 Mumbai  ─┤        │ Delhi    │ [2]    │ replace  │ Delhi    │ 2  │
   T5 Delhi   ─┤        │ Mumbai   │ [2]    │   All    │ Mumbai   │ 2  │
   T6 Mumbai  ─┘        └──────────┴────────┘          └──────────┴────┘
                computeIfAbsent(key, downstream supplier)
                then downstream accumulator on that box

 parallel:  leaf maps {Kolkata=[1], Delhi=[2]}  +  {Kolkata=[1], Mumbai=[2]}
            combiner merges per key with the downstream combiner`,
          caption:
            "The outer collector owns the map. Each key gets its own downstream container, and the finisher turns every container into its final value.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "Same data set as the Streams lesson: today's trips at a cab company. (`record` is Java 16 syntax, used only to keep the data class short. The collectors are Java 8 unless marked.)",
        },
        {
          type: "code",
          language: "java",
          title: "Trips.java",
          code: `import java.util.List;

public class Trips {
    record Trip(String id, String driverId, String city, double fare, String status) { }

    static final List<Trip> TODAY = List.of(
            new Trip("T1", "D1", "Kolkata", 220.0, "COMPLETED"),
            new Trip("T2", "D2", "Delhi",   480.0, "COMPLETED"),
            new Trip("T3", "D1", "Kolkata", 150.0, "CANCELLED"),
            new Trip("T4", "D3", "Mumbai",  610.0, "COMPLETED"),
            new Trip("T5", "D2", "Delhi",   90.0,  "COMPLETED"),
            new Trip("T6", "D3", "Mumbai",  300.0, "CANCELLED"));
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Cheat sheet (fragments, with import static java.util.stream.Collectors.*)",
          code: `.collect(toList())                       // List<T>
.collect(toSet())                        // Set<T>
.collect(toCollection(TreeSet::new))     // any collection
.collect(toMap(Trip::id, Trip::fare))    // Map<K, V>, throws on duplicate keys
.collect(toMap(k, v, Double::sum))       // merge duplicates
.collect(toMap(k, v, merge, TreeMap::new))
.collect(joining(", ", "[", "]"))        // "[a, b, c]"
.collect(counting())  summingDouble(f)  averagingDouble(f)  summarizingDouble(f)
.collect(minBy(cmp))  maxBy(cmp)         // Optional<T>
.collect(groupingBy(Trip::city))                          // Map<K, List<T>>
.collect(groupingBy(Trip::city, counting()))              // Map<K, Long>
.collect(groupingBy(Trip::city, TreeMap::new, counting()))
.collect(partitioningBy(t -> t.fare() > 300))             // Map<Boolean, List<T>>
mapping(f, downstream)   filtering(p, ds) (9)   flatMapping(f, ds) (9)
collectingAndThen(downstream, finisher)
teeing(c1, c2, (r1, r2) -> ...) (12)
toUnmodifiableList() (10)`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "toList, toSet, toCollection, toUnmodifiableList",
        },
        {
          type: "paragraph",
          text: "Everyday version: the list of cities we drove in today, once with repeats (a logbook), once without (a set of stamps in a passport), once alphabetical.",
        },
        {
          type: "code",
          language: "java",
          title: "ListSetDemo.java",
          code: `import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

public class ListSetDemo {
    public static void main(String[] args) {
        List<String> cities = Trips.TODAY.stream().map(Trips.Trip::city).collect(Collectors.toList());
        Set<String> unique = Trips.TODAY.stream().map(Trips.Trip::city).collect(Collectors.toSet());
        TreeSet<String> sorted = Trips.TODAY.stream().map(Trips.Trip::city)
                .collect(Collectors.toCollection(TreeSet::new));
        System.out.println(cities);
        System.out.println(unique.size() + " unique, sorted: " + sorted);

        cities.add("Pune");                                 // toList(): happens to be an ArrayList
        System.out.println("added to toList() result: " + cities.size());

        List<String> locked = Trips.TODAY.stream().map(Trips.Trip::city)
                .collect(Collectors.toUnmodifiableList());  // Java 10
        try {
            locked.add("Pune");
        } catch (UnsupportedOperationException e) {
            System.out.println("toUnmodifiableList: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `[Kolkata, Delhi, Kolkata, Mumbai, Delhi, Mumbai]
3 unique, sorted: [Delhi, Kolkata, Mumbai]
added to toList() result: 7
toUnmodifiableList: java.lang.UnsupportedOperationException`,
        },
        {
          type: "list",
          items: [
            "`toSet()` gives a `HashSet` today, with no promised order, so I printed its size rather than its contents. When I need a specific type or order, `toCollection(TreeSet::new)` or `toCollection(LinkedHashSet::new)` says so.",
            "Adding to the `toList()` result worked, but the Javadoc promises nothing about mutability. If I'm going to modify the list, `toCollection(ArrayList::new)` makes that a guarantee instead of an accident.",
            "`toUnmodifiableList()` (Java 10) refuses changes, and also refuses `null` elements.",
          ],
        },
        {
          type: "table",
          headers: ["Way to get a List", "Since", "Modifiable?", "Nulls?"],
          rows: [
            ["`collect(Collectors.toList())`", "8", "Not promised (an `ArrayList` today)", "Yes"],
            ["`collect(Collectors.toUnmodifiableList())`", "10", "No", "No, throws NPE"],
            ["`stream.toList()`", "16", "No", "Yes"],
            ["`collect(Collectors.toCollection(ArrayList::new))`", "8", "Yes, guaranteed", "Yes"],
          ],
        },
        {
          type: "heading",
          text: "toMap: keys, duplicate keys, merge function, map supplier",
        },
        {
          type: "paragraph",
          text: "Everyday version: a cloakroom. Each token number (key) maps to one coat (value). If two people get the same token, the attendant has to decide what to do, and `toMap` by default refuses to guess.",
        },
        {
          type: "code",
          language: "java",
          title: "ToMapDemo.java",
          code: `import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

public class ToMapDemo {
    public static void main(String[] args) {
        Map<String, Double> fareById = Trips.TODAY.stream()
                .collect(Collectors.toMap(Trips.Trip::id, Trips.Trip::fare));
        System.out.println("by id: " + new TreeMap<>(fareById));

        try {
            Trips.TODAY.stream().collect(Collectors.toMap(Trips.Trip::city, Trips.Trip::fare));
        } catch (IllegalStateException e) {
            System.out.println("by city: " + e.getMessage());
        }

        Map<String, Double> totalByCity = Trips.TODAY.stream()
                .collect(Collectors.toMap(
                        Trips.Trip::city,
                        Trips.Trip::fare,
                        Double::sum,            // what to do when a key repeats
                        TreeMap::new));         // which Map to build
        System.out.println("total by city: " + totalByCity);
    }
}`,
        },
        {
          type: "output",
          text: `by id: {T1=220.0, T2=480.0, T3=150.0, T4=610.0, T5=90.0, T6=300.0}
by city: Duplicate key Kolkata (attempted merging values 220.0 and 150.0)
total by city: {Delhi=570.0, Kolkata=370.0, Mumbai=910.0}`,
        },
        {
          type: "list",
          items: [
            "Trip ids are unique, so the two-argument form is perfect. (I wrapped it in a `TreeMap` only to print it in a stable order. The real result is a `HashMap`.)",
            "Cities repeat, so the same call throws `IllegalStateException` at the second Kolkata trip. This is a feature: silently keeping one value would hide a data bug.",
            "The third argument, the **merge function**, says what to do with two values for one key. `Double::sum` adds them. `(first, second) -> first` keeps the first, `(first, second) -> second` keeps the latest.",
            "The fourth argument, the **map supplier**, picks the map type. `TreeMap::new` for sorted keys, `LinkedHashMap::new` for first-seen order, `() -> new EnumMap<>(Status.class)` for enum keys.",
          ],
        },
        {
          type: "heading",
          text: "joining, counting, summing, averaging, summarizing",
        },
        {
          type: "code",
          language: "java",
          title: "NumbersDemo.java",
          code: `import java.util.DoubleSummaryStatistics;
import java.util.stream.Collectors;

public class NumbersDemo {
    public static void main(String[] args) {
        String ids = Trips.TODAY.stream().map(Trips.Trip::id)
                .collect(Collectors.joining(", ", "[", "]"));
        long count = Trips.TODAY.stream().collect(Collectors.counting());
        double sum = Trips.TODAY.stream().collect(Collectors.summingDouble(Trips.Trip::fare));
        double avg = Trips.TODAY.stream().collect(Collectors.averagingDouble(Trips.Trip::fare));
        DoubleSummaryStatistics stats = Trips.TODAY.stream()
                .collect(Collectors.summarizingDouble(Trips.Trip::fare));

        System.out.println(ids);
        System.out.println(count + " trips, sum " + sum + ", avg " + avg);
        System.out.println(stats);
    }
}`,
        },
        {
          type: "output",
          text: `[T1, T2, T3, T4, T5, T6]
6 trips, sum 1850.0, avg 308.3333333333333
DoubleSummaryStatistics{count=6, sum=1850.000000, min=90.000000, average=308.333333, max=610.000000}`,
        },
        {
          type: "paragraph",
          text: "On their own, these are wordier than `stream.count()` or `mapToDouble(...).sum()`, and I'd use the stream methods for a single total. They exist to be **downstream** collectors: \"count per city\" needs `counting()` inside `groupingBy`. `joining` only accepts `CharSequence` elements, so I map to a `String` first. `summarizingDouble` gets all five numbers in one pass, and `averagingDouble` on an empty stream returns `0.0`, not an empty `Optional`, which is worth remembering for reports.",
        },
        {
          type: "heading",
          text: "groupingBy with 1, 2 and 3 arguments",
        },
        {
          type: "paragraph",
          text: "Everyday version: sorting the day's receipts into envelopes by city. The one-argument form just puts receipts into envelopes. The two-argument form also writes something on each envelope (a count, a total). The three-argument form also lets me choose the filing cabinet (sorted or not).",
        },
        {
          type: "code",
          language: "java",
          title: "GroupingDemo.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

public class GroupingDemo {
    public static void main(String[] args) {
        // 1-arg: key -> List of elements (a HashMap, so I wrap it in a TreeMap to print)
        Map<String, List<Trips.Trip>> byCity = Trips.TODAY.stream()
                .collect(Collectors.groupingBy(Trips.Trip::city));
        new TreeMap<>(byCity).forEach((city, trips) ->
                System.out.println(city + " -> " + trips.stream().map(Trips.Trip::id).toList()));

        // 2-arg: key -> whatever the downstream collector makes
        Map<String, Long> countByCity = Trips.TODAY.stream()
                .collect(Collectors.groupingBy(Trips.Trip::city, Collectors.counting()));
        System.out.println("count: " + new TreeMap<>(countByCity));

        // 3-arg: also choose the Map
        TreeMap<String, Double> fareByCity = Trips.TODAY.stream()
                .collect(Collectors.groupingBy(Trips.Trip::city, TreeMap::new,
                        Collectors.summingDouble(Trips.Trip::fare)));
        System.out.println("fare:  " + fareByCity);
    }
}`,
        },
        {
          type: "output",
          text: `Delhi -> [T2, T5]
Kolkata -> [T1, T3]
Mumbai -> [T4, T6]
count: {Delhi=2, Kolkata=2, Mumbai=2}
fare:  {Delhi=570.0, Kolkata=370.0, Mumbai=910.0}`,
        },
        {
          type: "paragraph",
          text: "The one-argument form is exactly `groupingBy(classifier, HashMap::new, toList())`. Inside each group, elements keep their encounter order (`T1` before `T3`). Note the result type in the three-argument call: I could declare it as `TreeMap<String, Double>` because the map supplier fixes the type.",
        },
        {
          type: "heading",
          text: "Downstream collectors: mapping, nested groupingBy, maxBy",
        },
        {
          type: "code",
          language: "java",
          title: "DownstreamDemo.java",
          code: `import java.util.*;
import java.util.stream.Collectors;

public class DownstreamDemo {
    public static void main(String[] args) {
        Map<String, Set<String>> driversByCity = Trips.TODAY.stream()
                .collect(Collectors.groupingBy(Trips.Trip::city, TreeMap::new,
                        Collectors.mapping(Trips.Trip::driverId, Collectors.toCollection(TreeSet::new))));
        System.out.println("drivers:  " + driversByCity);

        Map<String, Map<String, Long>> cityThenStatus = Trips.TODAY.stream()
                .collect(Collectors.groupingBy(Trips.Trip::city, TreeMap::new,
                        Collectors.groupingBy(Trips.Trip::status, TreeMap::new, Collectors.counting())));
        System.out.println("nested:   " + cityThenStatus);

        Map<String, Optional<Trips.Trip>> topByCity = Trips.TODAY.stream()
                .collect(Collectors.groupingBy(Trips.Trip::city, TreeMap::new,
                        Collectors.maxBy(Comparator.comparingDouble(Trips.Trip::fare))));
        topByCity.forEach((city, t) -> System.out.println("top " + city + ": " + t.map(Trips.Trip::id)));
    }
}`,
        },
        {
          type: "output",
          text: `drivers:  {Delhi=[D2], Kolkata=[D1], Mumbai=[D3]}
nested:   {Delhi={COMPLETED=2}, Kolkata={CANCELLED=1, COMPLETED=1}, Mumbai={CANCELLED=1, COMPLETED=1}}
top Delhi: Optional[T2]
top Kolkata: Optional[T1]
top Mumbai: Optional[T4]`,
        },
        {
          type: "list",
          items: [
            "`mapping(f, downstream)` changes each element **before** it reaches the downstream. It's `map` for the inside of a group. Without it I'd get whole `Trip` objects per city.",
            "A `groupingBy` inside a `groupingBy` gives a two-level report, like a pivot table: city, then status. Delhi has no `CANCELLED` entry at all, because a key only exists if some element produced it.",
            "`maxBy` returns `Optional<Trip>` per group, even though a group can never be empty. That `Optional` is noise, and `collectingAndThen` below is how I remove it.",
          ],
        },
        {
          type: "heading",
          text: "filtering (Java 9) versus filter before grouping",
        },
        {
          type: "paragraph",
          text: "Everyday version: a manager wants \"number of big trips (over ₹400) per city\", and wants to **see** the cities with zero, because a zero is information.",
        },
        {
          type: "code",
          language: "java",
          title: "FilteringDemo.java",
          code: `import java.util.*;
import java.util.stream.Collectors;

public class FilteringDemo {
    public static void main(String[] args) {
        // filter first: a city with no big trips disappears
        Map<String, Long> filterFirst = Trips.TODAY.stream()
                .filter(t -> t.fare() > 400)
                .collect(Collectors.groupingBy(Trips.Trip::city, TreeMap::new, Collectors.counting()));

        // Java 9 filtering(): every city stays, with 0 when nothing matched
        Map<String, Long> filterInside = Trips.TODAY.stream()
                .collect(Collectors.groupingBy(Trips.Trip::city, TreeMap::new,
                        Collectors.filtering(t -> t.fare() > 400, Collectors.counting())));

        System.out.println("filter first:  " + filterFirst);
        System.out.println("filtering():   " + filterInside);
    }
}`,
        },
        {
          type: "output",
          text: `filter first:  {Delhi=1, Mumbai=1}
filtering():   {Delhi=1, Kolkata=0, Mumbai=1}`,
        },
        {
          type: "paragraph",
          text: "With `filter` before grouping, Kolkata's trips never reach the collector, so the key is never created and Kolkata vanishes from the report. With `filtering` inside, every trip creates its city's key first, and the filter only decides what reaches the downstream counter. That's the whole reason `filtering` was added in Java 9.",
        },
        {
          type: "heading",
          text: "flatMapping (Java 9)",
        },
        {
          type: "code",
          language: "java",
          title: "FlatMappingDemo.java",
          code: `import java.util.*;
import java.util.stream.Collectors;

public class FlatMappingDemo {
    record Order(String city, List<String> items) { }

    public static void main(String[] args) {
        List<Order> orders = List.of(
                new Order("Kolkata", List.of("tea", "samosa")),
                new Order("Kolkata", List.of("tea")),
                new Order("Delhi", List.of("coffee")));

        Map<String, Set<String>> itemsByCity = orders.stream()
                .collect(Collectors.groupingBy(Order::city, TreeMap::new,
                        Collectors.flatMapping(o -> o.items().stream(),     // Java 9
                                Collectors.toCollection(TreeSet::new))));
        System.out.println(itemsByCity);
    }
}`,
        },
        {
          type: "output",
          text: `{Delhi=[coffee], Kolkata=[samosa, tea]}`,
        },
        {
          type: "paragraph",
          text: "\"Which items were ordered in each city\": each order has several items, so `mapping` would give a set of **lists**. `flatMapping` opens each order's list and drops the items one by one into the city's set, so `tea` appears once.",
        },
        {
          type: "heading",
          text: "partitioningBy",
        },
        {
          type: "paragraph",
          text: "Everyday version: the bouncer at a club door. Two lines only: in and out.",
        },
        {
          type: "code",
          language: "java",
          title: "PartitionDemo.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class PartitionDemo {
    public static void main(String[] args) {
        Map<Boolean, List<String>> paidOrNot = Trips.TODAY.stream()
                .collect(Collectors.partitioningBy(t -> t.status().equals("COMPLETED"),
                        Collectors.mapping(Trips.Trip::id, Collectors.toList())));
        System.out.println(paidOrNot);

        Map<Boolean, Long> huge = Trips.TODAY.stream()
                .collect(Collectors.partitioningBy(t -> t.fare() > 10_000, Collectors.counting()));
        System.out.println(huge);     // both keys, even though nothing matched
    }
}`,
        },
        {
          type: "output",
          text: `{false=[T3, T6], true=[T1, T2, T4, T5]}
{false=6, true=0}`,
        },
        {
          type: "paragraph",
          text: "`partitioningBy` always returns a map with **both** `true` and `false`, even when one side is empty. That's the key difference from `groupingBy(t -> t.fare() > 10_000)`, which would only have a `false` key. Internally it's not a `HashMap` at all but a tiny special `Partition` map with two fields, which is also why there's no map-supplier argument.",
        },
        {
          type: "heading",
          text: "collectingAndThen, minBy and teeing",
        },
        {
          type: "code",
          language: "java",
          title: "AndThenDemo.java",
          code: `import java.util.*;
import java.util.stream.Collectors;

public class AndThenDemo {
    public static void main(String[] args) {
        List<String> locked = Trips.TODAY.stream().map(Trips.Trip::id)
                .collect(Collectors.collectingAndThen(Collectors.toList(), Collections::unmodifiableList));
        System.out.println(locked + " " + locked.getClass().getSimpleName());

        Trips.Trip cheapest = Trips.TODAY.stream()
                .collect(Collectors.collectingAndThen(
                        Collectors.minBy(Comparator.comparingDouble(Trips.Trip::fare)),
                        Optional::orElseThrow));                 // Optional<Trip> -> Trip
        System.out.println("cheapest: " + cheapest.id());

        String summary = Trips.TODAY.stream()
                .collect(Collectors.teeing(                      // Java 12
                        Collectors.counting(),
                        Collectors.summingDouble(Trips.Trip::fare),
                        (count, total) -> count + " trips, " + total + " total"));
        System.out.println(summary);
    }
}`,
        },
        {
          type: "output",
          text: `[T1, T2, T3, T4, T5, T6] UnmodifiableRandomAccessList
cheapest: T5
6 trips, 1850.0 total`,
        },
        {
          type: "list",
          items: [
            "`collectingAndThen(downstream, f)` adds one more finishing step. It's the Java 8 way to get an unmodifiable list, and the standard way to unwrap `maxBy`/`minBy` inside a `groupingBy`, where I know no group is empty. (`Optional::orElseThrow` with no arguments is Java 10. On Java 8, `Optional::get` does the same here.)",
            "`teeing(c1, c2, merger)` (Java 12) sends every element to **two** collectors and combines their results. Count and total in one pass, without `summarizingDouble`.",
          ],
        },
        {
          type: "heading",
          text: "Deduplicating events with toMap",
        },
        {
          type: "paragraph",
          text: "Everyday version: a payment gateway sometimes sends the same \"payment received\" message twice (it retried because our server was slow to answer). I want each event once, keeping the first copy and the arrival order.",
        },
        {
          type: "code",
          language: "java",
          title: "DedupeEvents.java",
          code: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

public class DedupeEvents {
    record PaymentEvent(String eventId, String tripId, double amount) { }

    public static void main(String[] args) {
        List<PaymentEvent> received = List.of(        // the gateway retried E2
                new PaymentEvent("E1", "T1", 220.0),
                new PaymentEvent("E2", "T2", 480.0),
                new PaymentEvent("E2", "T2", 480.0),
                new PaymentEvent("E3", "T4", 610.0));

        List<PaymentEvent> unique = received.stream()
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(PaymentEvent::eventId, Function.identity(),
                                (first, retry) -> first,           // keep the first copy
                                LinkedHashMap::new),               // keep arrival order
                        map -> new ArrayList<>(map.values())));
        unique.forEach(System.out::println);
    }
}`,
        },
        {
          type: "output",
          text: `PaymentEvent[eventId=E1, tripId=T1, amount=220.0]
PaymentEvent[eventId=E2, tripId=T2, amount=480.0]
PaymentEvent[eventId=E3, tripId=T4, amount=610.0]`,
        },
        {
          type: "paragraph",
          text: "Every part of the four-argument `toMap` earns its place: the key is the event id, `Function.identity()` keeps the whole event as the value, the merge function decides the retry loses, and `LinkedHashMap` keeps the order events arrived in.",
        },
        {
          type: "paragraph",
          text: "Plain `distinct()` would also work here because records have value-based `equals`, but only if the retry is identical in **every** field. Keying on the id is what a real system means by \"same event\". (A real service would also check a processed-events table, because retries can arrive in different batches.)",
        },
        {
          type: "heading",
          text: "Writing my own collector",
        },
        {
          type: "paragraph",
          text: "`Collector.of(supplier, accumulator, combiner, finisher, characteristics...)` builds one from four lambdas. Here's a total-fare collector whose container is a one-element `double[]`, the same trick the JDK uses for `summingDouble`:",
        },
        {
          type: "code",
          language: "java",
          title: "A custom collector (from CollectorSolutions.java below)",
          code: `Collector<Trips.Trip, double[], Double> totalFare = Collector.of(
        () -> new double[1],                      // supplier: a fresh box per container
        (box, t) -> box[0] += t.fare(),           // accumulator: add one trip
        (a, b) -> { a[0] += b[0]; return a; },    // combiner: merge two boxes
        box -> box[0]);                           // finisher: unwrap the number`,
        },
        {
          type: "paragraph",
          text: "It printed `1850.0` both sequentially and with `parallelStream()` (full program in Try It Yourself). Why a `double[]` and not a `Double`? Because the accumulator is a `BiConsumer`: it returns nothing, so it must **change** the container in place. A `Double` is immutable, so `box += fare` inside the lambda would only change a local copy. The array is a mutable box. There's also a four-argument `Collector.of` without a finisher, which sets IDENTITY_FINISH for me.",
        },
        {
          type: "paragraph",
          text: "The contract a custom collector must keep, in plain words: the supplier returns a new container every call; the accumulator and combiner may modify and return their first argument; the combiner must keep left-before-right if order matters; and the characteristics must be true (claiming CONCURRENT for a `HashMap` container, or IDENTITY_FINISH when the finisher does something, produces wrong results silently).",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "toMap with keys that aren't unique",
        },
        {
          type: "paragraph",
          text: "Works in testing with neat data, then fails in production on the first repeated key with `IllegalStateException: Duplicate key ...`. Before writing `toMap(k, v)`, I ask: is this key really unique? If not, add a merge function, or use `groupingBy`.",
        },
        {
          type: "heading",
          text: "Null keys and null values",
        },
        {
          type: "code",
          language: "java",
          title: "NullTraps.java",
          code: `import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class NullTraps {
    record Rider(String name, String promoCode) { }

    public static void main(String[] args) {
        List<Rider> riders = List.of(new Rider("Asha", "WELCOME"), new Rider("Ravi", null));
        try {
            riders.stream().collect(Collectors.toMap(Rider::name, Rider::promoCode));
        } catch (NullPointerException e) {
            System.out.println("toMap:      NPE " + e.getMessage());
        }
        try {
            riders.stream().collect(Collectors.groupingBy(Rider::promoCode));
        } catch (NullPointerException e) {
            System.out.println("groupingBy: NPE " + e.getMessage());
        }
        try {
            Arrays.asList("a", null).stream().collect(Collectors.toUnmodifiableList());
        } catch (NullPointerException e) {
            System.out.println("toUnmodifiableList: NPE");
        }
    }
}`,
        },
        {
          type: "output",
          text: `toMap:      NPE null
groupingBy: NPE element cannot be mapped to a null key
toUnmodifiableList: NPE`,
        },
        {
          type: "list",
          items: [
            "`toMap` rejects a `null` **value**, even though `HashMap` itself allows one. And the message is literally `null`, which makes it hard to find in logs. Map nulls to a default first (`r -> Objects.requireNonNullElse(r.promoCode(), \"NONE\")` on Java 9+, or a ternary).",
            "`groupingBy` rejects a `null` **key**, with a clearer message, the one from the accumulator I quoted in Internal Working.",
            "`toUnmodifiableList` rejects `null` elements. `Stream.toList()` allows them.",
          ],
        },
        {
          type: "heading",
          text: "Filtering before grouping when empty groups matter",
        },
        {
          type: "paragraph",
          text: "As `FilteringDemo` showed, `filter` then `groupingBy` drops the keys with no matches. If the report should list every city, use `filtering` (Java 9) inside the group, or start from the full list of keys.",
        },
        {
          type: "heading",
          text: "Expecting an order from HashMap results",
        },
        {
          type: "paragraph",
          text: "`groupingBy` and `toMap` build a `HashMap` by default, and its iteration order depends on hash codes. It may look sorted for small string keys on my laptop and come out differently with more data. If order matters for an API response or a CSV, pass `TreeMap::new` or `LinkedHashMap::new`.",
        },
        {
          type: "heading",
          text: "Assuming toList() is mutable (or immutable)",
        },
        {
          type: "paragraph",
          text: "`Collectors.toList()` happens to be mutable, `Stream.toList()` isn't. Code that calls `.add` on a result breaks when someone \"modernizes\" `collect(Collectors.toList())` to `.toList()`. Pick the one whose guarantee you need.",
        },
        {
          type: "heading",
          text: "A type inference error that isn't about my types",
        },
        {
          type: "paragraph",
          text: "While writing the exercise solutions I passed a `groupingBy(..., TreeMap::new, ...)` result straight into `System.out.println(...)` and `javac` gave a wall of text starting with `incompatible types: inference variable R has incompatible bounds`. The code was fine. `println` has overloads for `String`, `char[]` and `Object`, and inference couldn't pick one while also inferring the collector's types.",
        },
        {
          type: "paragraph",
          text: "Assigning the result to a typed variable first (or passing it to a method that takes `Object`) fixed it. When a collector chain gives a confusing inference error, splitting it into a variable with an explicit type is the first thing I try.",
        },
        {
          type: "heading",
          text: "Wrong characteristics or a shared container in a custom collector",
        },
        {
          type: "paragraph",
          text: "A supplier like `() -> this.sharedList` or a non-thread-safe container marked CONCURRENT both work sequentially and lose data in parallel. `ParallelCollect` showed 64 containers for 1,000 elements: the supplier really is called once per piece.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Add `import static java.util.stream.Collectors.*;` in files that use many collectors. `groupingBy(Trip::city, counting())` reads like a sentence.",
            "Always think about duplicate keys before `toMap`. Write the merge function even when you believe keys are unique if a duplicate wouldn't be a bug, and leave it out deliberately if a duplicate **is** a bug you want to hear about.",
            "Choose the map type on purpose: `TreeMap` for sorted reports, `LinkedHashMap` for first-seen order, `EnumMap` for enum keys. The default `HashMap` is fine when order doesn't matter.",
            "Use downstream collectors instead of post-processing. `groupingBy(city, summingDouble(fare))` beats grouping into lists and then summing each list in a loop.",
            "Unwrap `maxBy`/`minBy` with `collectingAndThen` when groups can't be empty, so callers don't deal with an `Optional` that's never empty.",
            "Use `Stream.toList()` on Java 16+ for plain read-only lists. Use `toCollection(ArrayList::new)` when the caller needs to modify the list.",
            "Keep collector chains to two levels of nesting. A three-level nested `groupingBy` is usually clearer as a small record key (`groupingBy(t -> new CityStatus(t.city(), t.status()))`) or as a database query.",
            "For money, collect `BigDecimal` with `reducing(BigDecimal.ZERO, Trip::amount, BigDecimal::add)` rather than `summingDouble`.",
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
            "Collectors are a terminal operation, so they run inside the same single fused loop as the rest of the pipeline. `groupingBy(city, summingDouble(fare))` is one pass over the data and one map lookup per element.",
            "Boxing hides in collectors. `summingDouble` and `averagingDouble` keep primitive state internally (a small `double[]`), but `counting()` returns `Long`, and a `Map<String, Long>` holds boxed values. For a few hundred keys this is nothing. For millions of entries in a hot path, it adds up.",
            "`toMap` and `groupingBy` resize their `HashMap` as it grows. Passing a presized map (`() -> new HashMap<>(expectedKeys * 4 / 3 + 1)`) avoids rehashing when the key count is known and large.",
            "`collectingAndThen(toList(), Collections::unmodifiableList)` wraps (cheap). `toUnmodifiableList()` copies into a new array (one extra copy). Both are fine. `Stream.toList()` avoids the copy when the size is known.",
            "In parallel, every leaf builds its own container and every merge copies one into another. For `toList` that's cheap. For `groupingBy` with many keys, merging whole maps can cost more than the grouping, as I explained with `MyGroupingBy`. `groupingByConcurrent` writes into one `ConcurrentHashMap` instead, but loses encounter order within groups and pays for contention on hot keys. Neither is automatically faster, so I'd only switch after measuring with JMH.",
            "The biggest win is usually upstream: let the database do `GROUP BY` on big tables, and use collectors to shape results that are already in memory.",
          ],
        },
      ],
    },
    {
      title: "Collectors in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A simple, realistic job: an operations dashboard shows today's completed trips per city, with the number of trips, the total fare and the biggest fare, sorted by city name. It's one service method, and I stuck to Java 8 collectors on purpose:",
        },
        {
          type: "code",
          language: "java",
          title: "CityReportService.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

// @Service in the real app; the trips would come from a repository
public class CityReportService {
    record CityLine(long trips, double total, double biggestFare) { }

    Map<String, CityLine> todaysReport(List<Trips.Trip> trips) {
        return trips.stream()
                .filter(t -> t.status().equals("COMPLETED"))
                .collect(Collectors.groupingBy(
                        Trips.Trip::city,
                        TreeMap::new,                                       // sorted by city
                        Collectors.collectingAndThen(
                                Collectors.summarizingDouble(Trips.Trip::fare),
                                s -> new CityLine(s.getCount(), s.getSum(), s.getMax()))));
    }

    public static void main(String[] args) {
        new CityReportService().todaysReport(Trips.TODAY)
                .forEach((city, line) -> System.out.println(city + " " + line));
    }
}`,
        },
        {
          type: "output",
          text: `Delhi CityLine[trips=2, total=570.0, biggestFare=480.0]
Kolkata CityLine[trips=1, total=220.0, biggestFare=220.0]
Mumbai CityLine[trips=1, total=610.0, biggestFare=610.0]`,
        },
        {
          type: "list",
          items: [
            "`filter` keeps completed trips only. Here, dropping cities with no completed trips is what I want (every city still had one). If the dashboard had to show a zero row, I'd use `filtering` inside the group instead.",
            "`groupingBy(city, TreeMap::new, ...)` gives one row per city, sorted, so the JSON response has a stable order and tests don't flake.",
            "`summarizingDouble` collects count, sum and max in one pass, and `collectingAndThen` turns the statistics object into my own small `CityLine` record, which is what the API returns. On Java 12+, `teeing` is another way to combine two downstream results.",
            "Each `CityLine` is computed while grouping, so there's no second loop over the groups.",
            "In a real service, the money would be `BigDecimal`, the date range would be in the repository query, and for a big table the whole thing would be a SQL `GROUP BY` with the collector just mapping rows to `CityLine`.",
          ],
        },
        {
          type: "paragraph",
          text: "The other two collectors I reach for constantly in backend code are `toMap(Entity::getId, Function.identity())`, to turn a list fetched with one `IN (...)` query into a lookup map and avoid N+1 queries, and the `DedupeEvents` pattern for webhook or message retries.",
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
              question: "What is a Collector?",
              answer:
                "A recipe for a mutable reduction: how to turn a stream of elements into one result container. It's passed to `Stream.collect`, which is a terminal operation. `Collectors` provides ready-made ones like `toList`, `toMap`, `joining` and `groupingBy`.\n\nTechnically it's the interface `Collector<T, A, R>`: element type, mutable accumulation type, and result type, with four functions (supplier, accumulator, combiner, finisher) and a set of characteristics.",
            },
            {
              question: "What's the difference between reduce and collect?",
              answer:
                "`reduce` combines immutable values into a new value at each step, like adding numbers. `collect` is a mutable reduction: it creates a container once and adds elements into it in place.\n\nBuilding a list with `reduce` would copy the list on every element. `collect` with `toList` adds to one `ArrayList` per thread and merges at the end. Use `reduce` for sums and maxima, `collect` for collections, maps and strings.",
            },
            {
              question: "What happens with toMap when two elements have the same key?",
              answer:
                "The two-argument `toMap` throws `IllegalStateException`. On Java 9+ the message names the key and both values: `Duplicate key Kolkata (attempted merging values 220.0 and 150.0)` in my run. On Java 8 the message wrongly printed a value where it said key.\n\nThe fix is the three-argument form with a merge function, like `Double::sum` to add or `(a, b) -> a` to keep the first. The four-argument form also picks the map type, like `TreeMap::new`.",
            },
            {
              question: "What's the difference between groupingBy and partitioningBy?",
              answer:
                "`groupingBy` takes a function to any key and creates one entry per distinct key that actually occurs. `partitioningBy` takes a predicate and always returns a map with exactly two keys, `true` and `false`, even if one side is empty.\n\nIn my run, partitioning by \"fare over 10,000\" gave `{false=6, true=0}`. A `groupingBy` on the same condition would only have had `false`.",
            },
            {
              question: "What does a downstream collector do?",
              answer:
                "It decides what to collect inside each group. `groupingBy(classifier)` puts the elements of each group in a `List`. With a downstream, each group gets its own collector instead: `counting()` for a count, `summingDouble(f)` for a total, `mapping(f, toSet())` to collect a projected value, or another `groupingBy` for a second level.\n\nIt's the aggregate function in SQL's `GROUP BY`, applied per group.",
            },
            {
              question: "What does Collectors.joining do?",
              answer:
                "It concatenates `CharSequence` elements into one `String`, with an optional separator, prefix and suffix. `joining(\", \", \"[\", \"]\")` gave me `[T1, T2, T3, T4, T5, T6]`.\n\nThe container is a `StringBuilder` (a `StringJoiner` with prefix/suffix), and the finisher calls `toString()`, which is why `joining` doesn't have the IDENTITY_FINISH characteristic. Elements have to be mapped to strings first.",
            },
            {
              question: "toList(), toUnmodifiableList(), Stream.toList(): which to use?",
              answer:
                "`Collectors.toList()` (Java 8) promises nothing about mutability; it's an `ArrayList` today. `toUnmodifiableList()` (Java 10) is unmodifiable and rejects nulls. `Stream.toList()` (Java 16) is unmodifiable and allows nulls.\n\nOn modern Java I use `stream.toList()` by default, and `toCollection(ArrayList::new)` when the caller needs to modify the result, because that's the only one that guarantees mutability.",
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
              question: "Why might filter-then-groupingBy give a different report than groupingBy with filtering()?",
              answer:
                "A `groupingBy` key only exists if some element produced it. Filtering before grouping removes elements, so a group whose elements were all removed never gets a key. `filtering` (Java 9) runs inside the group, after the key is created, so the group stays with an empty downstream result.\n\nIn my run, counting trips over 400 gave `{Delhi=1, Mumbai=1}` with `filter`, and `{Delhi=1, Kolkata=0, Mumbai=1}` with `filtering`.",
            },
            {
              question: "Can toMap or groupingBy handle nulls?",
              answer:
                "Not well. `toMap` throws an NPE for a null value, even though `HashMap` allows it, and the exception message is just `null`. `groupingBy` throws an NPE for a null key with the message \"element cannot be mapped to a null key\".\n\nThe fix is to map nulls to a default before collecting, or filter them out explicitly so the decision is visible in the code.",
            },
            {
              question: "Why does maxBy inside groupingBy return Optional, and how do you get rid of it?",
              answer:
                "`maxBy` is a general collector, and on an empty stream there's no maximum, so it returns `Optional`. Inside `groupingBy`, a group can never be empty, but `maxBy` doesn't know that.\n\nWrap it: `collectingAndThen(maxBy(comparator), Optional::get)`, or `Optional::orElseThrow` on Java 10+. Then the map is `Map<String, Trip>` instead of `Map<String, Optional<Trip>>`.",
            },
            {
              question: "Is the order of elements preserved inside groupingBy groups?",
              answer:
                "Yes, for an ordered stream with the default `groupingBy`: each group's list keeps encounter order, which is why Kolkata came out as `[T1, T3]`. The order of the **keys** is a different matter: it's `HashMap` order unless you pass a map factory.\n\n`groupingByConcurrent` gives up order within groups in parallel, because many threads add into the same list concurrently.",
            },
            {
              question: "Why doesn't this compile: System.out.println(stream.collect(groupingBy(f, TreeMap::new, counting()))) ?",
              answer:
                "It can fail with \"inference variable R has incompatible bounds\". `println` is overloaded for `String`, `char[]`, `Object` and others, and the compiler has to pick an overload while also inferring the collector's generic result type from `TreeMap::new`. The two inferences get tangled.\n\nI hit this for real while writing this lesson. Assigning the result to a variable with an explicit type, then printing the variable, compiles fine.",
            },
            {
              question: "How would you deduplicate a list by one field, keeping the first?",
              answer:
                "`toMap(Event::id, Function.identity(), (first, dup) -> first, LinkedHashMap::new)` and then take `values()`. The merge function keeps the first, and `LinkedHashMap` keeps arrival order. My `DedupeEvents` example dropped the retried `E2` this way.\n\n`distinct()` only works if the duplicates are equal in every field, because it uses `equals`.",
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
              question: "Explain the supplier, accumulator, combiner and finisher.",
              answer:
                "The supplier creates an empty mutable container. The accumulator folds one element into a container. The combiner merges two containers into one, and it's only used when partial results from parallel pieces need joining. The finisher turns the final container into the result type.\n\nMy traced collector showed it sequentially: supplier once, accumulator once per element, no combiner, finisher once. In parallel, each leaf calls the supplier, and there's one combiner call fewer than containers. I counted 64 containers and 63 merges for 1,000 elements on my machine.",
            },
            {
              question: "What are the Collector characteristics?",
              answer:
                "`IDENTITY_FINISH` means the container is the result, so the finisher can be skipped. `UNORDERED` means the result doesn't depend on encounter order. `CONCURRENT` means one container can be accumulated into from many threads at once.\n\nI printed them: `toList` is `[IDENTITY_FINISH]`, `toSet` is `[UNORDERED, IDENTITY_FINISH]`, `joining` and `counting` have none, and `groupingByConcurrent` has all three.",
            },
            {
              question: "How does a parallel collect work?",
              answer:
                "The stream splits the source into pieces. Each leaf task calls the supplier to get its own container, accumulates its piece into it, and parents merge left and right results with the combiner. No locks are needed because no container is shared. Order is preserved because the combiner always gets the left result first.\n\nThe exception is a CONCURRENT collector on an unordered stream (or with UNORDERED): then there's one shared thread-safe container, every thread accumulates into it, and the combiner isn't used.",
            },
            {
              question: "How is groupingBy implemented?",
              answer:
                "It's a collector whose container is a `Map<K, A>`, with a downstream container per key. The accumulator computes the key (rejecting null), does `computeIfAbsent(key, k -> downstreamSupplier.get())`, and passes the element to the downstream accumulator. The combiner merges two maps key by key with the downstream combiner. The finisher, if the downstream has one, runs `replaceAll` over the map to finish each container.\n\nI rebuilt it with `Collector.of` in about twenty lines and got the same results sequentially and in parallel.",
            },
            {
              question: "Why must the supplier return a new container each time?",
              answer:
                "Because in parallel it's called once per leaf, and each leaf's container is filled by a different thread without locks. If the supplier returned the same object every time, all threads would write into one non-thread-safe container: lost elements, corrupt state, or exceptions, and the combiner would merge the container with itself.\n\nSequentially it's only called once, so the bug hides until someone adds `parallel()`.",
            },
            {
              question: "When is groupingByConcurrent better than groupingBy?",
              answer:
                "Possibly for a large parallel stream where merging many per-leaf hash maps is the bottleneck. `groupingByConcurrent` uses one `ConcurrentHashMap` that all threads write into, so there are no map merges.\n\nThe costs are contention on popular keys, no encounter order within groups, and an unordered result map. For sequential streams it's just a slower `groupingBy`. I'd only switch after measuring.",
            },
          ],
        },
        {
          type: "heading",
          text: "Coding",
        },
        {
          type: "qa",
          items: [
            {
              question: "Count trips per driver, sorted by driver id.",
              answer:
                "`trips.stream().collect(groupingBy(Trip::driverId, TreeMap::new, counting()))`. On my data set that's `{D1=2, D2=2, D3=2}`.\n\nThe `TreeMap::new` factory gives sorted keys, and `counting()` gives `Long` values.",
            },
            {
              question: "Find the highest-fare trip id per driver, with no Optional in the result.",
              answer:
                "`groupingBy(Trip::driverId, TreeMap::new, collectingAndThen(maxBy(comparingDouble(Trip::fare)), best -> best.get().id()))`. On my data that's `{D1=T1, D2=T2, D3=T4}`.\n\n`get()` is safe here because a group always has at least one element. `collectingAndThen` both unwraps the `Optional` and maps the trip to its id.",
            },
            {
              question: "Average fare per city.",
              answer:
                "`groupingBy(Trip::city, TreeMap::new, averagingDouble(Trip::fare))`, which gave `{Delhi=285.0, Kolkata=185.0, Mumbai=455.0}`.\n\n`averagingDouble` returns `Double`, and `0.0` for an empty input, though that can't happen inside a group.",
            },
            {
              question: "Write a collector that joins names in upper case, without using joining().",
              answer:
                "`Collector.of(() -> new StringJoiner(\", \"), (j, s) -> j.add(s.toUpperCase()), StringJoiner::merge, StringJoiner::toString)`. Collecting `asha` and `ravi` with it gave `ASHA, RAVI`.\n\nSupplier makes an empty joiner, accumulator adds one name, `StringJoiner::merge` combines two joiners for parallel, and the finisher turns it into a `String`. That's essentially how `joining` itself is built.",
            },
          ],
        },
      ],
    },
    {
      title: "Try It Yourself",
      blocks: [
        {
          type: "paragraph",
          text: "Use the `Trips` class from Syntax at a Glance. Predict each answer before running.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Count trips per driver, sorted by driver. Hint: three-argument `groupingBy` with `counting()`.",
            "Total **completed** fare per driver. Hint: `filter` first, then `summingDouble`.",
            "All distinct cities joined with `\" | \"`. Hint: `map`, `distinct`, `sorted`, `joining`.",
            "Average fare per city. Hint: `averagingDouble`.",
            "The best trip id per driver, with no `Optional` in the map. Hint: `collectingAndThen(maxBy(...), ...)`.",
            "A custom `Collector.of` that totals fares. Run it with `stream()` and with `parallelStream()`. Hint: the container has to be mutable.",
            "Map trip id to status with `toMap`, then try mapping **driver id** to status. Read the exception, then fix it so the latest status wins.",
            "Partition trips into fare `>= 300` and below, collecting only the ids. Then change the threshold to `5000`. What does the `true` side hold?",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "CollectorSolutions.java (exercises 1 to 6)",
          code: `import java.util.*;
import java.util.stream.Collector;
import java.util.stream.Collectors;

public class CollectorSolutions {
    static void show(Object result) { System.out.println(result); }

    public static void main(String[] args) {
        show(Trips.TODAY.stream().collect(
                Collectors.groupingBy(Trips.Trip::driverId, TreeMap::new, Collectors.counting())));
        show(Trips.TODAY.stream().filter(t -> t.status().equals("COMPLETED")).collect(
                Collectors.groupingBy(Trips.Trip::driverId, TreeMap::new, Collectors.summingDouble(Trips.Trip::fare))));
        show(Trips.TODAY.stream().map(Trips.Trip::city).distinct().sorted()
                .collect(Collectors.joining(" | ")));
        show(Trips.TODAY.stream().collect(Collectors.groupingBy(Trips.Trip::city, TreeMap::new,
                Collectors.averagingDouble(Trips.Trip::fare))));
        show(Trips.TODAY.stream().collect(Collectors.groupingBy(Trips.Trip::driverId, TreeMap::new,
                Collectors.collectingAndThen(Collectors.maxBy(Comparator.comparingDouble(Trips.Trip::fare)),
                        best -> best.get().id()))));

        Collector<Trips.Trip, double[], Double> totalFare = Collector.of(
                () -> new double[1],
                (box, t) -> box[0] += t.fare(),
                (a, b) -> { a[0] += b[0]; return a; },
                box -> box[0]);
        show(Trips.TODAY.stream().collect(totalFare));
        show(Trips.TODAY.parallelStream().collect(totalFare));
    }
}`,
        },
        {
          type: "output",
          text: `{D1=2, D2=2, D3=2}
{D1=220.0, D2=570.0, D3=610.0}
Delhi | Kolkata | Mumbai
{Delhi=285.0, Kolkata=185.0, Mumbai=455.0}
{D1=T1, D2=T2, D3=T4}
1850.0
1850.0`,
        },
        {
          type: "paragraph",
          text: "The little `show(Object)` helper is there because of the `println` inference problem from Common Mistakes.",
        },
        {
          type: "qa",
          items: [
            {
              question: "Exercise 7: what happens, and what's the fix?",
              answer:
                "Driver ids repeat (`D1` has two trips), so the two-argument `toMap` throws `IllegalStateException: Duplicate key D1 (attempted merging values COMPLETED and CANCELLED)`.\n\nThe fix is a merge function that keeps the later value: `toMap(Trip::driverId, Trip::status, (older, newer) -> newer)`. Whether \"latest wins\" is right depends on the data being in time order, which is worth saying out loud in a code review.",
            },
            {
              question: "Exercise 8: what does the true side hold at 5000?",
              answer:
                "An empty list. `partitioningBy` always has both keys, so the result is `{false=[T1, T2, T3, T4, T5, T6], true=[]}`. At 300 it's `true=[T2, T4, T6]` and `false=[T1, T3, T5]`.\n\nThat guaranteed `true` key is the main reason to pick `partitioningBy` over `groupingBy` with a boolean classifier.",
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
          text: `COLLECTOR<T, A, R>
  supplier     () -> new container        (once per leaf)
  accumulator  (container, t) -> void     (per element)
  combiner     (left, right) -> merged    (parallel only)
  finisher     container -> result        (skipped if IDENTITY_FINISH)
  traits       IDENTITY_FINISH  UNORDERED  CONCURRENT

SHAPES      toList toSet toCollection(sup)  toUnmodifiableX (10)
            toMap(k, v)          duplicate key -> IllegalStateException
            toMap(k, v, merge)   toMap(k, v, merge, mapSupplier)
            joining(sep, pre, suf)
NUMBERS     counting summingX averagingX summarizingX minBy maxBy
GROUPS      groupingBy(k)  (k, downstream)  (k, mapFactory, downstream)
            partitioningBy(pred[, downstream])  -> always true AND false
DOWNSTREAM  mapping  filtering(9)  flatMapping(9)
            collectingAndThen(c, f)  teeing(c1, c2, merge)(12)

GROUPINGBY  map.computeIfAbsent(key, downstream supplier)
            -> downstream accumulator; finish = replaceAll
NULLS       toMap value null -> NPE;  groupingBy key null -> NPE
ORDER       default maps are HashMap: pass TreeMap/LinkedHashMap`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A collector is four functions: make a container, add one element, merge two containers, finish. Everything in `Collectors` is built from those.",
            "The outer collector picks the shape (list, map, two-way split). The downstream collector picks what goes in each slot.",
            "Watch three things in real code: duplicate keys in `toMap`, nulls, and map ordering. And when the data lives in a database, let `GROUP BY` do the heavy lifting.",
          ],
        },
      ],
    },
  ],
};
