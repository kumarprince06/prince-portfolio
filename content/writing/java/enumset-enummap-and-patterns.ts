import type { Lesson } from "../types";

export const enumSetEnumMapAndPatterns: Lesson = {
  slug: "enumset-enummap-and-patterns",
  date: "2026-11-13",
  title: "EnumSet, EnumMap and Enum Patterns",
  description:
    "The collections built for enums and the designs built on them, on JDK 21: EnumSet as a single long bit vector (RegularEnumSet) or a long[] (JumboEnumSet) read with reflection, EnumMap as an Object[] indexed by ordinal with its NULL marker, both measured against HashSet and HashMap (32 bytes against 272, about 2.6x faster contains), set algebra and groupingBy into an EnumMap, enums implementing interfaces as extensible strategies, a trip state machine with EnumMap and EnumSet, the enum singleton surviving reflection and serialization where a class singleton doesn't, and a partner JSON feed whose new status value broke deserialization until Jackson got a default constant.",
  tags: ["Core Java", "Enums", "Collections", "Design Patterns"],
  sections: [
    {
      title: "What EnumSet and EnumMap Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson showed that every enum constant has an `ordinal()`, a small integer from 0 up, and that enums are fixed at compile time. Two collections in `java.util` exploit exactly that. **`EnumSet<E>`** is a `Set` of enum constants stored as **bits**: bit `n` is set when the constant with ordinal `n` is in the set. **`EnumMap<K, V>`** is a `Map` with enum keys stored as an **array** of values indexed by ordinal.",
        },
        {
          type: "paragraph",
          text: "From the outside they're ordinary `Set` and `Map` implementations, so they work with every collection API. Inside, there's no hashing, no buckets and no entry objects, which makes them smaller and faster than `HashSet` and `HashMap` with enum keys, and they iterate in declaration order. They also replace the old C habit of bit flags (`READ | WRITE`) with something type-safe.",
        },
        {
          type: "paragraph",
          text: "The second half of this lesson is about designs that use enums as more than constants: enums implementing interfaces, state machines, the enum singleton, and what happens to enums at the edges of a system, in serialization and JSON, including a production failure caused by a partner adding one new value.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "`EnumSet` and `EnumMap` shipped with enums in Java 5 (2004), part of the same JSR 201 work led by Joshua Bloch. The motivation was spelled out in *Effective Java*: \"Use EnumSet instead of bit fields\" and \"Use EnumMap instead of ordinal indexing\". Code at the time used `int` masks like `STYLE_BOLD | STYLE_ITALIC`, which were fast but type-unsafe and printed as numbers, or arrays indexed with `ordinal()`, which were fast but fragile.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`EnumSet`, `EnumMap`, enum serialization by name", "Everything in this lesson"],
            ["Java 5 (2004)", "`RegularEnumSet` (one `long`) and `JumboEnumSet` (`long[]`)", "The two hidden implementations"],
            ["Java 8 (2014)", "`Collectors.groupingBy(f, mapFactory, downstream)`, `Map.merge`", "Collect straight into an `EnumMap`"],
            ["Java 9 (2017)", "`Set.of`, `Map.of`", "Immutable alternatives, but hash-based"],
            ["Java 10 (2018)", "`Collectors.toUnmodifiableMap`", "Read-only lookup maps for enum parsing"],
            ["Java 17 (2021)", "Strong encapsulation of `java.base`", "Reading `EnumSet` internals needs `--add-opens java.base/java.util`"],
          ],
        },
        {
          type: "paragraph",
          text: "The enum singleton also comes from *Effective Java* (second edition, 2008, item 3): \"a single-element enum type is often the best way to implement a singleton\", because the JVM itself guarantees the properties a hand-written singleton has to defend.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a panel of light switches and a wall of numbered pigeonholes.",
        },
        {
          type: "list",
          items: [
            "An **`EnumSet` is a panel of switches**, one per constant, in a fixed order. \"Is SAT in the set?\" means \"is switch 5 on?\", which is one glance. A `HashSet` is a filing cabinet: to check SAT, compute where SAT's folder should be, open that drawer, compare what's there.",
            "**Set operations are panel operations**: union is \"turn on every switch that's on in either panel\", which a computer does for 64 switches in one instruction.",
            "An **`EnumMap` is a wall of pigeonholes**, one per constant, labelled in declaration order. Putting a value under SEDAN means dropping it into box 2. No hashing, no searching.",
            "An **empty box** means \"no entry\". To store \"an entry whose value is nothing\", `EnumMap` puts a special card saying NULL into the box, so the two cases stay distinguishable.",
            "**The enum singleton** is a building with exactly one entrance that the architect bricked up behind them: no copy can be built (constructor), no photocopy works (clone), and anyone who ships the building's blueprint gets directed to the original (serialization).",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real switch panel can grow by adding a switch. An `EnumSet` sized for an enum with 64 constants switches to a different implementation at 65 (`JumboEnumSet`), shown below; the class changes, not just the size.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Creating an EnumSet",
        },
        {
          type: "table",
          headers: ["Factory", "Result", "Example"],
          rows: [
            ["`EnumSet.noneOf(Day.class)`", "Empty set", "Starting point for building up"],
            ["`EnumSet.allOf(Day.class)`", "Every constant", "\"All features enabled\""],
            ["`EnumSet.of(a, b, ...)`", "The given constants", "`EnumSet.of(SAT, SUN)`"],
            ["`EnumSet.range(from, to)`", "Inclusive range by ordinal", "`range(TUE, THU)` is TUE, WED, THU"],
            ["`EnumSet.complementOf(set)`", "Every constant not in `set`", "Weekdays from weekend"],
            ["`EnumSet.copyOf(collection)`", "A copy; the collection must be non-empty unless it's an `EnumSet`", "From a `List<Day>`"],
          ],
        },
        {
          type: "paragraph",
          text: "There's no public constructor; the factories choose the implementation. Everything else is the normal `Set` API: `add`, `remove`, `contains`, `addAll` (union), `retainAll` (intersection), `removeAll` (difference), `containsAll` (subset).",
        },
        {
          type: "heading",
          text: "EnumMap",
        },
        {
          type: "list",
          items: [
            "Created with the key class: `new EnumMap<>(VehicleType.class)`, or copied from another map with `new EnumMap<>(map)`.",
            "Full `Map` API: `put`, `get`, `merge`, `computeIfAbsent`, `entrySet()`...",
            "Keys iterate in **declaration order**, always, unlike `HashMap`.",
            "`null` keys are rejected; `null` values are allowed.",
          ],
        },
        {
          type: "heading",
          text: "Compared with the general collections",
        },
        {
          type: "table",
          headers: ["", "`EnumSet`", "`HashSet<E>`", "`EnumMap`", "`HashMap<E, V>`", "`TreeMap<E, V>`"],
          rows: [
            ["Storage", "Bits in a `long` / `long[]`", "A `HashMap` inside", "`Object[]` by ordinal", "Buckets of nodes", "Red-black tree"],
            ["`contains`/`get`", "One bit test", "Hash, bucket, `equals`", "One array read", "Hash, bucket, `equals`", "O(log n) compares"],
            ["Order", "Declaration", "None", "Declaration", "None", "Declaration (natural order)"],
            ["`null`", "Not allowed", "One allowed", "Values only", "Key and values", "Values only"],
            ["Thread-safe", "No", "No", "No", "No", "No"],
          ],
        },
        {
          type: "paragraph",
          text: "None of them is synchronized. For shared use, wrap with `Collections.synchronizedSet`/`synchronizedMap`, or use an immutable copy published once (`Collections.unmodifiableSet(EnumSet.copyOf(...))`).",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "EnumSet is a long",
        },
        {
          type: "code",
          language: "java",
          title: "EnumSetInside.java",
          code: `import java.lang.reflect.Field;
import java.util.EnumSet;

public class EnumSetInside {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    // 70 constants: more than fit in one long
    enum Seat {
        S00, S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19,
        S20, S21, S22, S23, S24, S25, S26, S27, S28, S29, S30, S31, S32, S33, S34, S35, S36, S37, S38, S39,
        S40, S41, S42, S43, S44, S45, S46, S47, S48, S49, S50, S51, S52, S53, S54, S55, S56, S57, S58, S59,
        S60, S61, S62, S63, S64, S65, S66, S67, S68, S69
    }

    public static void main(String[] args) throws Exception {
        EnumSet<Day> weekend = EnumSet.of(Day.SAT, Day.SUN);
        System.out.println(weekend.getClass().getName());
        Field elements = weekend.getClass().getDeclaredField("elements");
        elements.setAccessible(true);
        long bits = (long) elements.get(weekend);
        System.out.println("elements = " + bits + " = 0b" + Long.toBinaryString(bits)
                + "  (SAT ordinal " + Day.SAT.ordinal() + ", SUN ordinal " + Day.SUN.ordinal() + ")");

        EnumSet<Seat> seats = EnumSet.of(Seat.S01, Seat.S65);
        System.out.println(seats.getClass().getName());
        Field jumbo = seats.getClass().getDeclaredField("elements");
        jumbo.setAccessible(true);
        long[] words = (long[]) jumbo.get(seats);
        System.out.println("elements = long[" + words.length + "]: " + words[0] + ", " + words[1]);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac EnumSetInside.java
java --add-opens java.base/java.util=ALL-UNNAMED EnumSetInside`,
        },
        {
          type: "output",
          text: `java.util.RegularEnumSet
elements = 96 = 0b1100000  (SAT ordinal 5, SUN ordinal 6)
java.util.JumboEnumSet
elements = long[2]: 2, 2`,
        },
        {
          type: "image",
          src: "/images/java/enumset-enummap-layout.svg",
          alt: "Top: enum Day with ordinals 0 to 6. EnumSet.of(SAT, SUN) is a RegularEnumSet whose long elements has bits 5 and 6 set and the rest clear: 0b1100000 = 96; contains(d) is (elements & (1L << d.ordinal())) != 0. More than 64 constants use JumboEnumSet with a long array. Bottom: EnumMap<VehicleType, Integer> has an Object[] vals indexed by ordinal: AUTO 0 holds 15, MINI 1 is null meaning absent, SEDAN 2 holds the EnumMap.NULL marker for a stored null, SUV 3 holds 2. get(k) is vals[k.ordinal()].",
          caption: "Both collections turn the ordinal into a position: a bit in a long, or a slot in an array.",
        },
        {
          type: "list",
          items: [
            "`EnumSet.of` returned a **`RegularEnumSet`**, a package-private class whose whole state is one `long elements` (plus references to the enum type and its shared array of constants). SAT has ordinal 5 and SUN 6, so bits 5 and 6 are set: `0b1100000` = 96.",
            "Every operation is bit arithmetic. `contains(e)` is `(elements & (1L << e.ordinal())) != 0`; `add` is `elements |= bit`; `addAll` of another `RegularEnumSet` is `elements |= other.elements`, one instruction for all 64 possible constants; `size()` is `Long.bitCount(elements)`, a single CPU instruction (`popcnt`) on modern hardware.",
            "For an enum with **more than 64 constants**, the factory returns a **`JumboEnumSet`** with a `long[]`, one word per 64 constants. My 70-constant `Seat` needed `long[2]`: S01 is bit 1 of word 0, and S65 is bit 1 of word 1 (65 - 64), so both words are `2`.",
            "The factories pick the implementation from the enum's size, which is why `EnumSet` has no public constructor. Both share the enum's array of constants with every other `EnumSet` of that type, taken from the JDK's internal cache rather than cloned from `values()`.",
            "Since JDK 17, reading these private fields needs `--add-opens java.base/java.util=ALL-UNNAMED`, as the Java Modules lesson explained.",
          ],
        },
        {
          type: "heading",
          text: "EnumMap is an array",
        },
        {
          type: "code",
          language: "java",
          title: "EnumMapDemo.java",
          code: `import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;

public class EnumMapDemo {
    enum VehicleType { AUTO, MINI, SEDAN, SUV }

    public static void main(String[] args) throws Exception {
        Map<VehicleType, Integer> available = new EnumMap<>(VehicleType.class);
        available.put(VehicleType.SUV, 2);
        available.put(VehicleType.AUTO, 14);
        available.put(VehicleType.SEDAN, null);              // null values are allowed
        available.merge(VehicleType.AUTO, 1, Integer::sum);
        System.out.println(available + " size " + available.size());   // iterates in declaration order

        Field vals = EnumMap.class.getDeclaredField("vals");
        vals.setAccessible(true);
        Object[] slots = (Object[]) vals.get(available);
        System.out.println("vals = " + Arrays.toString(slots));

        try {
            available.put(null, 1);
        } catch (NullPointerException e) {
            System.out.println("null key: NullPointerException");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac EnumMapDemo.java
java --add-opens java.base/java.util=ALL-UNNAMED EnumMapDemo`,
        },
        {
          type: "output",
          text: `{AUTO=15, SEDAN=null, SUV=2} size 3
vals = [15, null, java.util.EnumMap.NULL, 2]
null key: NullPointerException`,
        },
        {
          type: "list",
          items: [
            "The values live in `Object[] vals`, one slot per constant, indexed by ordinal: AUTO is slot 0, SUV is slot 3. `get(k)` is essentially `vals[k.ordinal()]` after checking `k` has the right enum type. No `hashCode`, no `equals`, no `Node` objects.",
            "A `null` slot means \"no mapping\" (MINI). A mapping to `null` is stored as a private marker object, which prints itself as `java.util.EnumMap.NULL` (SEDAN), and is turned back into `null` by `get`. That's how `containsKey(SEDAN)` can be `true` while `containsKey(MINI)` is `false`.",
            "I inserted SUV, then AUTO, then SEDAN; iteration follows the array, so it's always declaration order. A `HashMap` gives whatever order the hash buckets give.",
            "`size` is a separate counter, so `size()` is O(1).",
          ],
        },
        {
          type: "heading",
          text: "Enum.valueOf's cache",
        },
        {
          type: "paragraph",
          text: "One more internal detail from the previous lesson: `Enum.valueOf(Class, String)` asks the `Class` object for its **enum constant directory**, a `Map<String, T>` built from the constants the first time it's needed and cached in the `Class`. The constants array behind it (`getEnumConstantsShared`) is also cached and shared, which is what `EnumSet` and `EnumMap` use as their \"universe\" without paying for a `values()` clone per collection.",
        },
      ],
    },
    {
      title: "EnumSet in Use",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "EnumSetBasics.java",
          code: `import java.util.EnumSet;
import java.util.Set;

public class EnumSetBasics {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    public static void main(String[] args) {
        EnumSet<Day> weekend = EnumSet.of(Day.SAT, Day.SUN);
        EnumSet<Day> weekdays = EnumSet.complementOf(weekend);
        EnumSet<Day> midweek = EnumSet.range(Day.TUE, Day.THU);
        EnumSet<Day> none = EnumSet.noneOf(Day.class);
        EnumSet<Day> all = EnumSet.allOf(Day.class);
        System.out.println(weekend + " " + weekdays + " " + midweek + " " + none + " " + all.size());

        EnumSet<Day> surgeDays = EnumSet.of(Day.SUN, Day.FRI, Day.SAT, Day.FRI);   // order and duplicates don't matter
        System.out.println(surgeDays + " contains FRI? " + surgeDays.contains(Day.FRI));
        surgeDays.retainAll(weekend);
        System.out.println("surge on weekends: " + surgeDays);

        Set<Day> copy = EnumSet.copyOf(Set.of(Day.WED, Day.MON));
        System.out.println(copy + " " + copy.getClass().getSimpleName());
        try {
            weekend.add(null);
        } catch (NullPointerException e) {
            System.out.println("null element: NullPointerException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `[SAT, SUN] [MON, TUE, WED, THU, FRI] [TUE, WED, THU] [] 7
[FRI, SAT, SUN] contains FRI? true
surge on weekends: [SAT, SUN]
[MON, WED] RegularEnumSet
null element: NullPointerException`,
        },
        {
          type: "list",
          items: [
            "`EnumSet.of(SUN, FRI, SAT, FRI)` printed `[FRI, SAT, SUN]`: duplicates collapse, and iteration always follows declaration order, because it walks the bits from 0 up.",
            "`retainAll` is intersection: surge days that are also weekend days. For two `RegularEnumSet`s it's `elements &= other.elements`.",
            "`copyOf(Set.of(WED, MON))` came back sorted as `[MON, WED]`: whatever the source order, the result is in declaration order.",
            "`null` is rejected, as in every enum collection.",
          ],
        },
        {
          type: "paragraph",
          text: "`EnumSet` is the modern replacement for bit flags. Instead of `int flags = AC | LUGGAGE;` and `(flags & PET) != 0`, which accept any `int` and print as numbers, `EnumSet.of(AC, LUGGAGE)` and `contains(PET)` are type-checked and print as names, at practically the same cost.",
        },
      ],
    },
    {
      title: "EnumMap in Use",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "StatusCounts.java",
          code: `import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class StatusCounts {
    enum Status { REQUESTED, ACCEPTED, STARTED, COMPLETED, CANCELLED }
    record Trip(String id, Status status, long farePaise) { }

    public static void main(String[] args) {
        List<Trip> trips = List.of(
                new Trip("T1", Status.COMPLETED, 14_500), new Trip("T2", Status.CANCELLED, 0),
                new Trip("T3", Status.COMPLETED, 8_000), new Trip("T4", Status.STARTED, 0),
                new Trip("T5", Status.COMPLETED, 22_000));

        Map<Status, Long> counts = trips.stream().collect(
                Collectors.groupingBy(Trip::status, () -> new EnumMap<>(Status.class), Collectors.counting()));
        System.out.println(counts + " " + counts.getClass().getSimpleName());

        Map<Status, Long> withZeros = new EnumMap<>(Status.class);
        for (Status s : Status.values()) withZeros.put(s, 0L);
        withZeros.putAll(counts);
        System.out.println(withZeros);

        Map<Status, Long> revenue = trips.stream().collect(
                Collectors.groupingBy(Trip::status, () -> new EnumMap<>(Status.class), Collectors.summingLong(Trip::farePaise)));
        System.out.println("revenue in paise " + revenue);
    }
}`,
        },
        {
          type: "output",
          text: `{STARTED=1, COMPLETED=3, CANCELLED=1} EnumMap
{REQUESTED=0, ACCEPTED=0, STARTED=1, COMPLETED=3, CANCELLED=1}
revenue in paise {STARTED=0, COMPLETED=44500, CANCELLED=0}`,
        },
        {
          type: "list",
          items: [
            "`groupingBy` normally builds a `HashMap`. The three-argument form takes a map factory, `() -> new EnumMap<>(Status.class)`, so the result is an `EnumMap` and comes out in lifecycle order, which is what a dashboard wants.",
            "`groupingBy` only creates keys that occur. For a report that must show every status, start with all constants mapped to zero and `putAll` the counts.",
            "This is the \"use EnumMap instead of ordinal indexing\" advice in practice: the old way was `long[] counts = new long[Status.values().length]; counts[t.status().ordinal()]++;`, which works but prints as numbers and breaks if someone indexes it with the wrong enum.",
          ],
        },
      ],
    },
    {
      title: "Enums Implementing Interfaces",
      blocks: [
        {
          type: "paragraph",
          text: "Enums can't be extended, so a set of constants is closed. When a set of **behaviours** should be open, so other modules can add their own, the trick is an interface: built-in options are an enum implementing it, and other code adds more enums (or classes) implementing the same interface. Code is written against the interface.",
        },
        {
          type: "code",
          language: "java",
          title: "ExtensibleEnum.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ExtensibleEnum {
    // The contract
    interface Surcharge {
        String label();
        long applyPaise(long fare);
    }

    // Built-in surcharges shipped with the platform
    enum StandardSurcharge implements Surcharge {
        NIGHT("Night") { public long applyPaise(long f) { return f / 4; } },
        AIRPORT("Airport") { public long applyPaise(long f) { return 5_000; } };

        private final String label;
        StandardSurcharge(String label) { this.label = label; }
        public String label() { return label; }
    }

    // A city team adds its own without touching StandardSurcharge
    enum KolkataSurcharge implements Surcharge {
        DURGA_PUJA;
        public String label() { return "Durga Puja"; }
        public long applyPaise(long f) { return f / 2; }
    }

    static long total(long fare, List<? extends Surcharge> surcharges) {
        long t = fare;
        for (Surcharge s : surcharges) {
            long extra = s.applyPaise(fare);
            System.out.printf("  %-10s +Rs %.2f%n", s.label(), extra / 100.0);
            t += extra;
        }
        return t;
    }

    public static void main(String[] args) {
        List<Surcharge> applied = new ArrayList<>();
        applied.add(StandardSurcharge.NIGHT);
        applied.add(KolkataSurcharge.DURGA_PUJA);
        applied.add(StandardSurcharge.AIRPORT);
        System.out.printf("total Rs %.2f%n", total(30_000, applied) / 100.0);
    }
}`,
        },
        {
          type: "output",
          text: `  Night      +Rs 75.00
  Durga Puja +Rs 150.00
  Airport    +Rs 50.00
total Rs 575.00`,
        },
        {
          type: "list",
          items: [
            "`total` depends only on `Surcharge`. It doesn't know which enums exist, and the Kolkata team added `DURGA_PUJA` without editing the platform's enum. That's the **extensible enum** pattern from *Effective Java* (item 38).",
            "Each enum keeps the benefits of enums: a fixed, named set within its own module, `==`, `EnumSet` and serializability.",
            "The price: there's no single exhaustive list of all surcharges, so an exhaustive `switch` over all of them is impossible. If the full set must be known in one place and checked by the compiler, a sealed interface is the alternative; if it must be open, this pattern is.",
            "It's also the **strategy pattern** with the strategies as constants: `java.nio.file.StandardOpenOption implements OpenOption` and `StandardCopyOption implements CopyOption` in the JDK are exactly this design.",
          ],
        },
      ],
    },
    {
      title: "State Machines with Enums",
      blocks: [
        {
          type: "paragraph",
          text: "A trip moves through statuses, and not every move is legal: a completed trip can't be cancelled, a requested trip can't start. Encoding the allowed transitions next to the enum, in an `EnumMap` of `EnumSet`s, makes them data that can be checked and printed, instead of `if` statements spread across services:",
        },
        {
          type: "code",
          language: "java",
          title: "TripStateMachine.java",
          code: `import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public class TripStateMachine {
    enum TripStatus {
        REQUESTED, ACCEPTED, DRIVER_ARRIVED, STARTED, COMPLETED, CANCELLED;

        private static final Map<TripStatus, Set<TripStatus>> NEXT = new EnumMap<>(TripStatus.class);
        static {
            NEXT.put(REQUESTED, EnumSet.of(ACCEPTED, CANCELLED));
            NEXT.put(ACCEPTED, EnumSet.of(DRIVER_ARRIVED, CANCELLED));
            NEXT.put(DRIVER_ARRIVED, EnumSet.of(STARTED, CANCELLED));
            NEXT.put(STARTED, EnumSet.of(COMPLETED));
            NEXT.put(COMPLETED, EnumSet.noneOf(TripStatus.class));
            NEXT.put(CANCELLED, EnumSet.noneOf(TripStatus.class));
        }

        boolean canMoveTo(TripStatus next) { return NEXT.get(this).contains(next); }
        boolean isFinal() { return NEXT.get(this).isEmpty(); }
    }

    static final class Trip {
        private TripStatus status = TripStatus.REQUESTED;
        void moveTo(TripStatus next) {
            if (!status.canMoveTo(next)) {
                throw new IllegalStateException("cannot go from " + status + " to " + next);
            }
            status = next;
            System.out.println("  -> " + status + (status.isFinal() ? " (final)" : ""));
        }
    }

    public static void main(String[] args) {
        Trip trip = new Trip();
        for (TripStatus s : new TripStatus[] {TripStatus.ACCEPTED, TripStatus.DRIVER_ARRIVED, TripStatus.STARTED,
                                              TripStatus.CANCELLED, TripStatus.COMPLETED}) {
            try {
                trip.moveTo(s);
            } catch (IllegalStateException e) {
                System.out.println("  rejected: " + e.getMessage());
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `  -> ACCEPTED
  -> DRIVER_ARRIVED
  -> STARTED
  rejected: cannot go from STARTED to CANCELLED
  -> COMPLETED (final)`,
        },
        {
          type: "list",
          items: [
            "The whole lifecycle is in one `static` block: six lines anyone can review against the product spec. The map is filled after the constants exist, which is why it's in a `static` block and not in the constructor (the previous lesson's rule).",
            "Cancelling a started trip was rejected with a precise message. In a real service that becomes a 409 Conflict, instead of a trip ending up in an impossible state because two requests raced.",
            "An alternative is an abstract method per constant (`abstract Set<TripStatus> next();` with a body on each constant). The map version keeps the graph visible in one place and avoids an anonymous class per constant; constant bodies suit transitions that need logic, like \"STARTED can be cancelled only within 2 minutes\".",
            "In a database-backed system, the same check should guard the update (`UPDATE trips SET status = ? WHERE id = ? AND status = ?`) so that concurrent transitions can't both succeed. The Transactions and Locking lesson covers that side.",
          ],
        },
      ],
    },
    {
      title: "The Enum Singleton",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Singletons.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.lang.reflect.Constructor;

public class Singletons {
    // Classic singleton: private constructor + static instance
    static final class FareConfig implements Serializable {
        static final FareConfig INSTANCE = new FareConfig();
        private FareConfig() { }
    }

    // Enum singleton
    enum SurgeConfig {
        INSTANCE;
        private double multiplier = 1.0;
        double multiplier() { return multiplier; }
        void setMultiplier(double m) { multiplier = m; }
    }

    @SuppressWarnings("unchecked")
    static <T> T roundTrip(T obj) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) { out.writeObject(obj); }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            return (T) in.readObject();
        }
    }

    public static void main(String[] args) throws Exception {
        // 1. Reflection
        Constructor<FareConfig> c = FareConfig.class.getDeclaredConstructor();
        c.setAccessible(true);
        System.out.println("class singleton, reflection: second instance? " + (c.newInstance() != FareConfig.INSTANCE));

        Constructor<SurgeConfig> e = SurgeConfig.class.getDeclaredConstructor(String.class, int.class);
        e.setAccessible(true);
        try {
            e.newInstance("SECOND", 1);
        } catch (IllegalArgumentException ex) {
            System.out.println("enum singleton, reflection: " + ex.getMessage());
        }

        // 2. Serialization
        System.out.println("class singleton, serialization: same instance? " + (roundTrip(FareConfig.INSTANCE) == FareConfig.INSTANCE));
        SurgeConfig.INSTANCE.setMultiplier(1.8);
        SurgeConfig back = roundTrip(SurgeConfig.INSTANCE);
        System.out.println("enum singleton, serialization: same instance? " + (back == SurgeConfig.INSTANCE)
                + ", multiplier " + back.multiplier());
    }
}`,
        },
        {
          type: "output",
          text: `class singleton, reflection: second instance? true
enum singleton, reflection: Cannot reflectively create enum objects
class singleton, serialization: same instance? false
enum singleton, serialization: same instance? true, multiplier 1.8`,
        },
        {
          type: "list",
          items: [
            "**Reflection** broke the class singleton: `setAccessible(true)` on the private constructor created a second `FareConfig`. Defending against it needs a check in the constructor that throws if `INSTANCE` already exists. The enum's constructor can't be invoked reflectively at all.",
            "**Serialization** broke it again: `readObject` creates a new object without calling the constructor, so the round trip produced a second `FareConfig`. Defending against it needs a `readResolve()` method returning `INSTANCE` (and `transient` on every field). Enums are serialized as just their **name**, and deserialization calls `Enum.valueOf`, which returns the existing constant: same instance.",
            "**The multiplier came back as 1.8**, but not because it was serialized: enum fields are **never** written to the stream, only the name. The deserialized reference is simply the same in-memory `INSTANCE`. In another JVM, it would be that JVM's `INSTANCE`, with its own state. Enum singletons shouldn't rely on serialized state.",
            "**Thread safety** comes from class initialisation: `INSTANCE` is created once, under the JVM's initialisation lock, before any thread can see it. No double-checked locking, no `volatile`.",
            "The limits: an enum can't extend a class, and it's created eagerly on first use of the class. And this enum's mutable `multiplier` is global mutable state; in a real service I'd keep a singleton's state immutable or thread-safe, and usually let a DI container (Spring's singleton scope) manage the single instance instead.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `EnumSet.of(Day.SAT, Day.SUN).contains(Day.FRI)`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`Day` initialises** on first use: `static {}` creates MON (ordinal 0) to SUN (6) and `$VALUES`.",
            "**`EnumSet.of(e1, e2)`** calls `noneOf(e1.getDeclaringClass())`. `noneOf` asks the JDK's shared-secrets mechanism for the cached, shared array of `Day` constants (the \"universe\"), sees 7 ≤ 64, and creates a `RegularEnumSet` with `elements = 0`.",
            "**`add(SAT)`** checks the element's class against `Day`, then computes `1L << 5` and ORs it in: `elements = 0b100000` (32). **`add(SUN)`**: `1L << 6`, `elements = 0b1100000` (96).",
            "**`contains(FRI)`** checks that `FRI` is a `Day` (anything else, or `null`, returns `false`), then computes `elements & (1L << 4)`: `96 & 16 = 0`, so `false`. No hash, no `equals`, no loop.",
            "**Printing** iterates bits from lowest to highest with `Long.numberOfTrailingZeros`, looking each one up in the universe array: `[SAT, SUN]`.",
            "**After the JIT**, `contains` is inlined to a type check, a shift, an AND and a compare: a handful of instructions.",
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
          title: "CollectionsTour.java",
          code: `import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;

public class CollectionsTour {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    public static void main(String[] args) {
        // EnumSet factories
        EnumSet<Day> a = EnumSet.of(Day.MON, Day.WED);
        EnumSet<Day> b = EnumSet.range(Day.WED, Day.FRI);
        EnumSet<Day> c = EnumSet.complementOf(b);
        EnumSet<Day> d = EnumSet.allOf(Day.class);
        EnumSet<Day> e = EnumSet.noneOf(Day.class);
        e.add(Day.SUN);
        System.out.println(a + " " + b + " " + c + " " + d.size() + " " + e);

        // set algebra with the usual Set methods
        EnumSet<Day> union = EnumSet.copyOf(a); union.addAll(b);
        EnumSet<Day> inter = EnumSet.copyOf(a); inter.retainAll(b);
        EnumSet<Day> diff = EnumSet.copyOf(b); diff.removeAll(a);
        System.out.println(union + " " + inter + " " + diff);

        // EnumMap
        Map<Day, Integer> trips = new EnumMap<>(Day.class);
        trips.put(Day.FRI, 120);
        trips.put(Day.MON, 80);
        trips.merge(Day.FRI, 15, Integer::sum);
        trips.computeIfAbsent(Day.SAT, k -> 0);
        System.out.println(trips + " firstKey via keySet " + trips.keySet().iterator().next());

        EnumMap<Day, Integer> copy = new EnumMap<>(trips);
        copy.remove(Day.MON);
        System.out.println(copy + " " + trips.containsKey(Day.MON));
    }
}`,
        },
        {
          type: "output",
          text: `[MON, WED] [WED, THU, FRI] [MON, TUE, SAT, SUN] 7 [SUN]
[MON, WED, THU, FRI] [WED] [THU, FRI]
{MON=80, FRI=135, SAT=0} firstKey via keySet MON
{FRI=135, SAT=0} true`,
        },
        {
          type: "paragraph",
          text: "`EnumSet` set algebra uses the standard `Set` methods on a copy (`addAll` for union, `retainAll` for intersection, `removeAll` for difference); there are no special union methods. `copy` is independent of `trips`: removing MON from it left `trips` unchanged.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Matching drivers to ride requirements",
        },
        {
          type: "code",
          language: "java",
          title: "DriverMatch.java",
          code: `import java.util.EnumSet;
import java.util.List;
import java.util.Set;

public class DriverMatch {
    enum Feature { AC, LUGGAGE, PET_FRIENDLY, WHEELCHAIR, CHILD_SEAT, EV }

    record Driver(String id, Set<Feature> features) { }

    static List<Driver> eligible(List<Driver> drivers, Set<Feature> required) {
        return drivers.stream().filter(d -> d.features().containsAll(required)).toList();
    }

    public static void main(String[] args) {
        List<Driver> drivers = List.of(
                new Driver("D1", EnumSet.of(Feature.AC, Feature.LUGGAGE)),
                new Driver("D2", EnumSet.of(Feature.AC, Feature.PET_FRIENDLY, Feature.LUGGAGE)),
                new Driver("D3", EnumSet.of(Feature.WHEELCHAIR, Feature.AC)));

        Set<Feature> request = EnumSet.of(Feature.AC, Feature.LUGGAGE);
        System.out.println("AC + luggage: " + eligible(drivers, request).stream().map(Driver::id).toList());
        System.out.println("pet friendly: " + eligible(drivers, EnumSet.of(Feature.PET_FRIENDLY)).stream().map(Driver::id).toList());

        Set<Feature> missing = EnumSet.complementOf(EnumSet.copyOf(drivers.get(0).features()));
        System.out.println("D1 lacks: " + missing);
    }
}`,
        },
        {
          type: "output",
          text: `AC + luggage: [D1, D2]
pet friendly: [D2]
D1 lacks: [PET_FRIENDLY, WHEELCHAIR, CHILD_SEAT, EV]`,
        },
        {
          type: "paragraph",
          text: "`containsAll` between two `RegularEnumSet`s is a subset test on bits: `(required & ~driver) == 0`, one operation no matter how many features exist. Dispatch runs this check for every nearby driver on every request, so it matters. The record's `features` field is typed as `Set<Feature>` so callers aren't tied to `EnumSet`, but every value passed in is one.",
        },
        {
          type: "heading",
          text: "Example 2: Role permissions as EnumMap of EnumSet",
        },
        {
          type: "code",
          language: "java",
          title: "RolePermissions.java",
          code: `import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public class RolePermissions {
    enum Permission { VIEW_TRIPS, CANCEL_TRIP, ISSUE_REFUND, EDIT_FARES, MANAGE_USERS }
    enum Role { RIDER, DRIVER, SUPPORT, FINANCE, ADMIN }

    static final Map<Role, Set<Permission>> GRANTS = new EnumMap<>(Role.class);
    static {
        GRANTS.put(Role.RIDER, EnumSet.of(Permission.VIEW_TRIPS, Permission.CANCEL_TRIP));
        GRANTS.put(Role.DRIVER, EnumSet.of(Permission.VIEW_TRIPS));
        GRANTS.put(Role.SUPPORT, EnumSet.of(Permission.VIEW_TRIPS, Permission.CANCEL_TRIP, Permission.ISSUE_REFUND));
        GRANTS.put(Role.FINANCE, EnumSet.of(Permission.VIEW_TRIPS, Permission.ISSUE_REFUND, Permission.EDIT_FARES));
        GRANTS.put(Role.ADMIN, EnumSet.allOf(Permission.class));
    }

    static boolean can(Set<Role> roles, Permission p) {
        for (Role r : roles) if (GRANTS.get(r).contains(p)) return true;
        return false;
    }

    static Set<Permission> effective(Set<Role> roles) {
        Set<Permission> all = EnumSet.noneOf(Permission.class);
        for (Role r : roles) all.addAll(GRANTS.get(r));
        return all;
    }

    public static void main(String[] args) {
        Set<Role> asha = EnumSet.of(Role.SUPPORT, Role.FINANCE);
        System.out.println("Asha can edit fares? " + can(asha, Permission.EDIT_FARES)
                + ", manage users? " + can(asha, Permission.MANAGE_USERS));
        System.out.println("Asha effective: " + effective(asha));
        System.out.println("Asha lacks:     " + EnumSet.complementOf(EnumSet.copyOf(effective(asha))));
    }
}`,
        },
        {
          type: "output",
          text: `Asha can edit fares? true, manage users? false
Asha effective: [VIEW_TRIPS, CANCEL_TRIP, ISSUE_REFUND, EDIT_FARES]
Asha lacks:     [MANAGE_USERS]`,
        },
        {
          type: "paragraph",
          text: "The previous lesson's `Role.atLeast` relied on declaration order; this version relies on explicit grants, so `FINANCE` can edit fares without being \"above\" `SUPPORT`. Permissions of several roles combine with `addAll` (a bitwise OR), and `complementOf` lists what's missing, handy for an admin screen. `ADMIN` uses `allOf`, so a new permission is granted to admins automatically; whether that's desirable is a security decision worth writing down.",
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Why"],
          rows: [
            ["A set of enum constants", "`EnumSet`", "Bits: smallest, fastest, ordered"],
            ["A map with enum keys", "`EnumMap`", "Array by ordinal: smaller and faster than `HashMap`, ordered"],
            ["An immutable set or map of enums", "`Collections.unmodifiableSet(EnumSet.of(...))`, or `Set.copyOf` if speed doesn't matter", "`Set.of` is hash-based and has no defined order"],
            ["Bit flags", "`EnumSet`", "Type-safe flags at bit-mask speed"],
            ["A lookup from external code to constant", "`Map<String, E>` built once from `values()`", "Keys are strings, not enums"],
            ["Open set of strategies", "Interface + one or more enums implementing it", "Extensible across modules"],
            ["Closed set of states with allowed moves", "Enum + `EnumMap<E, EnumSet<E>>`", "The transition table is data"],
            ["A single instance", "Single-constant enum, or a DI-managed bean", "Enum: JVM-guaranteed; bean: testable and configurable"],
            ["Per-constant data that changes at run time", "A separate `EnumMap<E, Config>` loaded from config", "Keeps enum constants immutable"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Using HashSet/HashMap for enum keys out of habit",
        },
        {
          type: "paragraph",
          text: "They work, but cost more memory and time and iterate in hash order. Unless a `null` element or key is needed, `EnumSet` and `EnumMap` are strictly better for enums.",
        },
        {
          type: "heading",
          text: "EnumSet.copyOf on an empty collection",
        },
        {
          type: "paragraph",
          text: "`EnumSet.copyOf(Collection)` needs at least one element to find the enum type, and throws `IllegalArgumentException` for an empty `List` or `HashSet`. Use `EnumSet.noneOf(E.class)` and `addAll`, or pass an `EnumSet` (which knows its type even when empty).",
        },
        {
          type: "heading",
          text: "Indexing arrays with ordinal()",
        },
        {
          type: "paragraph",
          text: "`counts[status.ordinal()]++` is what `EnumMap` replaces: the array isn't type-checked, prints as numbers, and silently means something else after constants are reordered.",
        },
        {
          type: "heading",
          text: "Sharing a mutable EnumSet or EnumMap between threads",
        },
        {
          type: "paragraph",
          text: "Neither is thread-safe. A `static` set modified at run time by request threads loses updates. Publish an unmodifiable set, or replace the whole set atomically (a `volatile` field holding an immutable copy), or synchronize.",
        },
        {
          type: "heading",
          text: "Mutable state in an enum singleton",
        },
        {
          type: "paragraph",
          text: "`SurgeConfig.INSTANCE.setMultiplier(...)` is global mutable state with no synchronization: one thread's write may not be seen by another. Keep singleton state immutable, `volatile`, or behind thread-safe types, and remember it isn't serialized.",
        },
        {
          type: "heading",
          text: "A 1:1 enum for an external API's values",
        },
        {
          type: "paragraph",
          text: "Mapping a partner's status field directly onto an enum makes every new value they add a deserialization failure on our side, which is the production section. Give such enums an `UNKNOWN` constant and a tolerant mapping, and alert on it.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use `EnumSet` for any set of enum constants and `EnumMap` for any map keyed by an enum.",
            "Declare fields and parameters as `Set<E>`/`Map<E, V>`, and create them with `EnumSet`/`EnumMap`.",
            "Collect into `EnumMap` with `groupingBy(f, () -> new EnumMap<>(E.class), downstream)` when results are reported per constant.",
            "Use `EnumSet` instead of `int` bit flags in new code; convert at the boundary if an external format needs a bitmask.",
            "Put transition tables and permission grants in `static` blocks next to the enum, as data, so they can be reviewed and tested as a whole.",
            "Use the interface-plus-enum pattern when other modules must add options; use sealed types when the full set must be known.",
            "Prefer a single-constant enum when a hand-written singleton is really needed; prefer dependency injection when the singleton has dependencies or needs replacing in tests.",
            "For enums that mirror external systems, add an explicit fallback constant (`UNKNOWN`) and enable tolerant deserialization, with monitoring on how often it's used.",
            "Never expose a mutable `EnumSet`/`EnumMap` from a `static` field; wrap it with `Collections.unmodifiable...`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "I measured `EnumSet`/`EnumMap` against `HashSet`/`HashMap` with the same enum keys: bytes allocated to build each (per-thread allocation counter), and the best of seven runs of 100 million `contains`/`get` calls:",
        },
        {
          type: "code",
          language: "java",
          title: "EnumCollectionsCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

public class EnumCollectionsCost {
    enum Feature { AC, LUGGAGE, PET, WHEELCHAIR, CHILD_SEAT, EV, WIFI, PREMIUM }
    static final Feature[] F = Feature.values();
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;

    static long allocated(Supplier<Object> s) {
        for (int i = 0; i < 10_000; i++) sink = s.get();
        long before = MX.getCurrentThreadAllocatedBytes();
        sink = s.get();
        return MX.getCurrentThreadAllocatedBytes() - before;
    }

    static long ms(LongSupplier s) {
        long best = Long.MAX_VALUE, check = 0;
        for (int r = 0; r < 7; r++) {
            long t = System.nanoTime();
            check += s.getAsLong();
            best = Math.min(best, System.nanoTime() - t);
        }
        if (check == 42) System.out.print("");
        return best / 1_000_000;
    }

    public static void main(String[] args) {
        System.out.println("bytes to build a set of 4 features:");
        System.out.println("  EnumSet  " + allocated(() -> EnumSet.of(F[0], F[2], F[4], F[6])));
        System.out.println("  HashSet  " + allocated(() -> { Set<Feature> s = new HashSet<>(); s.add(F[0]); s.add(F[2]); s.add(F[4]); s.add(F[6]); return s; }));
        System.out.println("bytes to build a map of all 8 features:");
        System.out.println("  EnumMap  " + allocated(() -> { Map<Feature, Integer> m = new EnumMap<>(Feature.class); for (Feature f : F) m.put(f, 1); return m; }));
        System.out.println("  HashMap  " + allocated(() -> { Map<Feature, Integer> m = new HashMap<>(); for (Feature f : F) m.put(f, 1); return m; }));

        Set<Feature> es = EnumSet.of(F[0], F[2], F[4], F[6]);
        Set<Feature> hs = new HashSet<>(es);
        Map<Feature, Integer> em = new EnumMap<>(Feature.class);
        Map<Feature, Integer> hm = new HashMap<>();
        for (Feature f : F) { em.put(f, f.ordinal()); hm.put(f, f.ordinal()); }

        int n = 100_000_000;
        System.out.println("100M contains / get:");
        System.out.println("  EnumSet.contains " + ms(() -> { long c = 0; for (int i = 0; i < n; i++) if (es.contains(F[i & 7])) c++; return c; }) + " ms");
        System.out.println("  HashSet.contains " + ms(() -> { long c = 0; for (int i = 0; i < n; i++) if (hs.contains(F[i & 7])) c++; return c; }) + " ms");
        System.out.println("  EnumMap.get      " + ms(() -> { long c = 0; for (int i = 0; i < n; i++) c += em.get(F[i & 7]); return c; }) + " ms");
        System.out.println("  HashMap.get      " + ms(() -> { long c = 0; for (int i = 0; i < n; i++) c += hm.get(F[i & 7]); return c; }) + " ms");
    }
}`,
        },
        {
          type: "output",
          text: `bytes to build a set of 4 features:
  EnumSet  32
  HashSet  272
bytes to build a map of all 8 features:
  EnumMap  88
  HashMap  384
100M contains / get:
  EnumSet.contains 65 ms
  HashSet.contains 172 ms
  EnumMap.get      110 ms
  HashMap.get      214 ms`,
        },
        {
          type: "list",
          items: [
            "**Memory.** An `EnumSet` of up to 64 constants is a single 32-byte object: header, two references and the `long`; the constants array is shared. A `HashSet` of 4 elements is a `HashSet`, an inner `HashMap`, a 16-slot table and a `Node` per element: 272 bytes, 8.5 times as much. The maps: 88 bytes against 384.",
            "**Speed.** `EnumSet.contains` was about 2.6 times faster than `HashSet.contains` (65 against 172 ms; a second run gave 67 and 169), and `EnumMap.get` about 2 times faster than `HashMap.get` (110 against 214). Enum `hashCode()` is the identity hash, so `HashMap` has no expensive hash to compute, yet it still loses: it has to find the bucket and follow a node.",
            "**Bulk operations** are where `EnumSet` wins most: `addAll`, `retainAll`, `containsAll` and `equals` between two `RegularEnumSet`s are single `long` operations, regardless of how many elements are involved.",
            "This is a `System.nanoTime` measurement in one process, not JMH; the absolute numbers depend on the CPU, but the ratios were stable across runs.",
          ],
        },
      ],
    },
    {
      title: "Enums in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend imports trips from a partner fleet operator every few minutes as a JSON array. The integration defined `enum Status` with exactly the five values the partner documented. Months later, the partner adds a status `DRIVER_ARRIVED` to their API, announced in a changelog nobody on our side read. From that moment, every import batch fails: not just the trips with the new status, but every trip in every batch, because one bad value aborts the whole `readValue`. Revenue reports for that partner stop updating. I rebuilt it with real Jackson 2.21.5 (`com.fasterxml.jackson.core:jackson-databind:2.21.5` plus `jackson-core` and `jackson-annotations`); `$JACKSON` is the classpath of those JARs.",
        },
        {
          type: "code",
          language: "java",
          title: "PartnerFeed.java",
          code: `import java.util.List;

import com.fasterxml.jackson.annotation.JsonEnumDefaultValue;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

public class PartnerFeed {
    // What shipped: the enum mirrors the partner's statuses at integration time
    public enum Status { REQUESTED, ACCEPTED, STARTED, COMPLETED, CANCELLED }
    public record Trip(String id, Status status) { }

    // The fix: an explicit fallback constant for values we don't know yet
    public enum SafeStatus {
        REQUESTED, ACCEPTED, STARTED, COMPLETED, CANCELLED,
        @JsonEnumDefaultValue UNKNOWN
    }
    public record SafeTrip(String id, SafeStatus status) { }

    // Months later the partner adds DRIVER_ARRIVED, without telling anyone
    static final String FEED = """
            [{"id":"T-1","status":"COMPLETED"},
             {"id":"T-2","status":"DRIVER_ARRIVED"},
             {"id":"T-3","status":"CANCELLED"}]""";

    public static void main(String[] args) throws Exception {
        ObjectMapper strict = new ObjectMapper();
        try {
            List<Trip> trips = strict.readValue(FEED, new TypeReference<List<Trip>>() { });
            System.out.println(trips);
        } catch (Exception e) {
            String msg = e.getMessage();
            System.out.println(e.getClass().getSimpleName() + ": " + msg.substring(0, msg.indexOf('\\n')));
        }

        ObjectMapper tolerant = new ObjectMapper()
                .enable(DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE);
        List<SafeTrip> trips = tolerant.readValue(FEED, new TypeReference<List<SafeTrip>>() { });
        trips.forEach(System.out::println);
        long unknown = trips.stream().filter(t -> t.status() == SafeStatus.UNKNOWN).count();
        System.out.println("processed " + trips.size() + " trips, " + unknown + " with an unknown status");

        System.out.println("written back: " + tolerant.writeValueAsString(trips.get(0)));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp $JACKSON PartnerFeed.java
java -cp $JACKSON:. PartnerFeed`,
        },
        {
          type: "output",
          text: `InvalidFormatException: Cannot deserialize value of type \`PartnerFeed$Status\` from String "DRIVER_ARRIVED": not one of the values accepted for Enum class: [CANCELLED, COMPLETED, REQUESTED, ACCEPTED, STARTED]
SafeTrip[id=T-1, status=COMPLETED]
SafeTrip[id=T-2, status=UNKNOWN]
SafeTrip[id=T-3, status=CANCELLED]
processed 3 trips, 1 with an unknown status
written back: {"id":"T-1","status":"COMPLETED"}`,
        },
        {
          type: "list",
          items: [
            "**One value failed the whole batch.** Jackson maps enums by `name()` by default, and a string that matches no constant throws `InvalidFormatException`. Because it happens inside `readValue` for the whole array, T-1 and T-3, which were perfectly valid, were lost too.",
            "**The fix in the model.** `SafeStatus` gets an extra constant annotated `@JsonEnumDefaultValue`, and the mapper enables `READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE`. Unknown strings become `UNKNOWN`, and the batch imports. (`READ_UNKNOWN_ENUM_VALUES_AS_NULL` is the other option, but `null` spreads `NullPointerException`s; a named constant is explicit.)",
            "**Unknown must not mean ignored.** The code counts them; in production that count becomes a metric with an alert, so the team learns about the new partner status within minutes and decides what `DRIVER_ARRIVED` should mean (probably \"still in progress\", which is what billing cares about). Exhaustive switches over `SafeStatus` force every consumer to decide what to do with `UNKNOWN`.",
            "**Serialization by name in both directions.** Writing back produced `\"status\":\"COMPLETED\"`, the name. Java serialization (`ObjectOutputStream`) does the same, as the singleton section showed, and so does `@Enumerated(EnumType.STRING)` in JPA: names are the stable representation. When an external system uses different strings (`\"in_progress\"`), map them with `@JsonProperty(\"in_progress\")` on the constant or a `@JsonValue`/`@JsonCreator` pair, rather than renaming constants to match.",
            "**Contract tests.** A consumer-driven contract test, or simply a nightly job that deserializes a fresh sample of the partner's feed in strict mode, turns the next new value into a failing build instead of a production outage.",
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
              question: "What is EnumSet, and why is it better than HashSet for enums?",
              answer:
                "A `Set` implementation for enum constants, stored as bits in a `long` (one bit per constant, indexed by ordinal), or a `long[]` for enums with more than 64 constants. Compared with a `HashSet` it's much smaller (32 bytes against 272 for 4 elements in my test), faster (`contains` about 2.6x faster), and iterates in declaration order. It's created with factories like `EnumSet.of`, `noneOf`, `allOf`, `range` and `complementOf`.",
            },
            {
              question: "What is EnumMap?",
              answer:
                "A `Map` whose keys are constants of one enum, stored as an `Object[]` of values indexed by the key's ordinal. `get` is an array read, with no hashing; it iterates in declaration order; it rejects `null` keys but allows `null` values. It's created with the key class: `new EnumMap<>(Status.class)`.",
            },
            {
              question: "Can EnumSet or EnumMap contain null?",
              answer:
                "`EnumSet` can't contain `null`: `add(null)` throws `NullPointerException`. `EnumMap` can't have a `null` key, but it can map a key to `null`; internally it stores a private `NULL` marker in the array slot so it can tell \"mapped to null\" from \"no mapping\".",
            },
            {
              question: "What is the enum singleton?",
              answer:
                "A singleton written as an enum with one constant: `enum SurgeConfig { INSTANCE; ... }`. The JVM creates `INSTANCE` once during class initialisation (thread-safe), the constructor can't be called via reflection, and serialization returns the existing constant. *Effective Java* recommends it as the best way to implement a singleton when one is needed.",
            },
            {
              question: "Can enums implement interfaces? Why would you do it?",
              answer:
                "Yes, any number. It lets enum constants be used wherever the interface is expected, which makes them strategies (each constant implements the behaviour differently) and allows extensible designs: the platform ships `enum StandardSurcharge implements Surcharge`, and another module adds `enum KolkataSurcharge implements Surcharge` without modifying the first. The JDK does this with `StandardOpenOption implements OpenOption`.",
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
              question: "How is EnumSet implemented internally?",
              answer:
                "Two package-private classes behind the factories. `RegularEnumSet`, for enums with up to 64 constants, keeps one `long elements`; constant `e` is present when bit `e.ordinal()` is set. `JumboEnumSet` keeps a `long[]`, one word per 64 constants. I read the field with reflection: `EnumSet.of(SAT, SUN)` had `elements = 96` (`0b1100000`, bits 5 and 6), and a 70-constant enum got a `long[2]`. Operations are bit operations: `contains` is a shift and an AND, `addAll` is an OR, `size` is `Long.bitCount`.",
            },
            {
              question: "Why does EnumSet have no public constructor?",
              answer:
                "Because the right implementation depends on the enum's size, `RegularEnumSet` for up to 64 constants, `JumboEnumSet` above, and only the factory knows it. The factories (`noneOf`, `of`, `allOf`, `range`, `copyOf`, `complementOf`) inspect the enum type and return the appropriate subclass, which is also why the classes themselves aren't public.",
            },
            {
              question: "Why is the enum singleton safe against serialization and reflection, when a class singleton isn't?",
              answer:
                "Serialization: enum constants are written as their name only, and deserialization calls `Enum.valueOf`, returning the existing constant. A class singleton gets a new object from `readObject` unless it adds `readResolve()`; my round trip produced a second `FareConfig`. Reflection: `Constructor.newInstance` refuses enum classes (\"Cannot reflectively create enum objects\"), while `setAccessible(true)` on a class singleton's private constructor created a second instance.",
            },
            {
              question: "Are enum fields serialized?",
              answer:
                "No. Only the constant's name goes into the stream; fields are ignored, and the deserialized reference is the receiving JVM's own constant with whatever state it has there. In my test the multiplier came back as 1.8 only because both ends were the same JVM. `serialVersionUID`, `writeObject` and `readObject` are ignored for enums.",
            },
            {
              question: "How would you model a state machine with enums?",
              answer:
                "An enum for the states, plus the allowed transitions as data: `EnumMap<TripStatus, EnumSet<TripStatus>>` filled in a `static` block, with `canMoveTo(next)` and `isFinal()` methods. Any attempt to move along a missing edge throws `IllegalStateException`. For transitions that need logic, abstract methods with constant-specific bodies work too. In a database, the transition also needs a conditional update so two concurrent requests can't both move the trip.",
            },
            {
              question: "How do you collect stream results into an EnumMap?",
              answer:
                "With the three-argument `groupingBy`: `groupingBy(Trip::status, () -> new EnumMap<>(Status.class), Collectors.counting())`. The map factory makes the result an `EnumMap`, so it's ordered by declaration and cheaper than the default `HashMap`. Keys that never occur are absent, so pre-filling with zeros is needed for complete reports.",
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
              question: "What happens with EnumSet for an enum with more than 64 constants?",
              answer:
                "The factories return a `JumboEnumSet`, which stores a `long[]` with `(n + 63) / 64` words. Constant `e` is bit `e.ordinal() % 64` of word `e.ordinal() / 64`; for my 70 constants, S01 and S65 were both bit 1, in words 0 and 1. It keeps a separate size counter. Operations stay word-wise, so they're still very fast, just no longer a single instruction.",
            },
            {
              question: "Why is EnumMap faster than HashMap even though enum hashCode is cheap?",
              answer:
                "Enum `hashCode()` is the identity hash, so hashing itself is cheap. But `HashMap.get` still spreads the hash, indexes the table, loads a `Node`, compares the key, and may follow a chain or tree. `EnumMap.get` checks the key's class and reads `vals[ordinal]`. In my test that was 110 ms against 214 ms for 100 million gets, and 88 bytes against 384 to build an 8-entry map.",
            },
            {
              question: "What do you lose with the extensible enum (interface) pattern?",
              answer:
                "The closed set. Code written against the interface can't enumerate every implementation, can't use `EnumSet`/`EnumMap` across different enums, and can't have an exhaustive `switch` over all options. It also loses `valueOf` across enums: parsing a string needs a registry. If the full set must be known and checked, a sealed interface (possibly implemented by enums) is the better tool.",
            },
            {
              question: "How does Jackson handle enums, and how do you make it tolerant of new values?",
              answer:
                "By default it writes `name()` and reads by exact name, throwing `InvalidFormatException` for unknown strings, which aborts the whole `readValue`. For tolerance: annotate a fallback constant with `@JsonEnumDefaultValue` and enable `DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE` (or `READ_UNKNOWN_ENUM_VALUES_AS_NULL`). Custom external names use `@JsonProperty` per constant or `@JsonValue`/`@JsonCreator`; case-insensitive reading is `MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS`.",
            },
            {
              question: "When would you not use an enum singleton?",
              answer:
                "When the singleton needs dependencies injected, needs to be replaced with a fake in tests, needs lazy initialisation separate from class loading, or must extend a class. In application code with a DI container, a singleton-scoped bean gives one instance per container and keeps it testable. The enum singleton fits stateless or immutable utilities that must be unique per JVM regardless of how they're reached.",
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
              question: "A partner integration suddenly fails every import with InvalidFormatException for an enum field, and no data arrives at all. What happened, and how do you fix it for good?",
              answer:
                "The partner started sending a value our enum doesn't have; Jackson rejects unknown enum strings by default, and since the exception is thrown inside `readValue` for the whole batch, valid records are lost too. `PartnerFeed` reproduces it with `DRIVER_ARRIVED`.\n\nShort term: add an `UNKNOWN` constant with `@JsonEnumDefaultValue` and enable `READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE`, so batches import. Then emit a metric and alert on `UNKNOWN`, decide with the business what the new status means, and add it properly. Long term: contract tests against the partner's feed, and processing records one by one so one bad record goes to a dead-letter queue instead of failing the batch.",
            },
            {
              question: "A permission check runs on every API call and shows up in profiling: it uses a HashSet<Permission> per user and calls containsAll. How would you improve it?",
              answer:
                "Switch to `EnumSet<Permission>`. For enums with up to 64 constants, `containsAll` between two `EnumSet`s is a single bitwise test, `contains` is a shift and an AND, and each set is a 32-byte object instead of a `HashSet` with a table and nodes. In my test, `EnumSet.contains` was 2.6x faster and the set 8.5x smaller.\n\nI'd also precompute each role's set once (an `EnumMap<Role, EnumSet<Permission>>` like `RolePermissions`) and union a user's roles with `addAll` when the session is created, so the per-call check doesn't rebuild anything.",
            },
            {
              question: "Two requests arrive at the same moment, one to start a trip and one to cancel it, and the trip ends up both started and refunded. Your code checks transitions with an enum state machine. What's missing?",
              answer:
                "The check isn't atomic with the update. Each request read the current status (ACCEPTED or DRIVER_ARRIVED), both found their transition allowed by `canMoveTo`, and both wrote. The enum's transition table is correct; the race is in the persistence layer.\n\nThe update must be conditional: `UPDATE trips SET status = 'STARTED' WHERE id = ? AND status = 'DRIVER_ARRIVED'`, and only proceed (and only refund) if one row was updated. Optimistic locking with a version column, or `SELECT ... FOR UPDATE`, are the alternatives. The losing request then gets a 409 Conflict.",
            },
            {
              question: "A teammate implemented a configuration singleton as a class with a private constructor and getInstance(). A security review says it can be instantiated twice. Is that true, and what would you suggest?",
              answer:
                "True, in two ways, both reproduced in `Singletons`: reflection with `setAccessible(true)` on the private constructor creates a second instance, and if the class is `Serializable`, deserializing it creates another unless it has `readResolve()`.\n\nIf it really must be a JVM-wide singleton, a single-constant enum fixes both, because the JVM refuses to create enum instances reflectively and resolves deserialized enums by name. In a Spring application I'd rather make it a singleton-scoped bean and not implement `Serializable` at all; the real protection against reflection there is not letting untrusted code run in the JVM.",
            },
            {
              question: "A monthly report groups trips by status into a HashMap, and finance complains the columns come out in a different order every run and some statuses are missing. How do you fix it?",
              answer:
                "Two separate issues. Order: `HashMap` iteration order depends on hashing, and enum hash codes are identity hashes that change between JVM runs. Collecting with `groupingBy(Trip::status, () -> new EnumMap<>(Status.class), counting())` gives declaration order every time. Missing statuses: `groupingBy` only creates keys that occur, so pre-fill an `EnumMap` with every constant mapped to zero and `putAll` the counts, as `StatusCounts` does.\n\nIf the business order differs from declaration order, I'd sort by an explicit field rather than reorder the enum, since reordering constants is risky wherever ordinals leaked.",
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
            "Create `EnumSet.range(TUE, FRI)` and its `complementOf` for a `Day` enum, and print both.",
            "With `--add-opens java.base/java.util=ALL-UNNAMED`, print the `elements` field of `EnumSet.of(MON, WED, FRI)` in binary.",
            "Declare an enum with 65 constants and print `EnumSet.noneOf(...).getClass()`.",
            "Call `EnumSet.copyOf(new ArrayList<Day>())` and read the exception.",
            "Group a list of strings by an enum of their length category (`SHORT`, `MEDIUM`, `LONG`) into an `EnumMap`, then into the default `HashMap`, and compare the printed order over a few runs.",
            "Serialize and deserialize a single-constant enum with a mutable field. Change the field after serializing, then deserialize and print it.",
            "Add `@JsonEnumDefaultValue` to a constant in your own enum and deserialize a JSON value that doesn't exist, with and without `READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `[TUE, WED, THU, FRI]` and `[MON, SAT, SUN]`. Step 2 prints `10101` (bits 0, 2 and 4) = 21. Step 3 prints `class java.util.JumboEnumSet`. Step 4 throws `IllegalArgumentException: Collection is empty`. Step 5: the `EnumMap` always prints in declaration order; the `HashMap` order can differ between runs because enum hash codes are identity hashes. Step 6 prints the changed value: the deserialized reference is the same in-memory constant, whose field was never serialized. Step 7 throws `InvalidFormatException` without the feature and returns your default constant with it.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ENUMSET     bits by ordinal: RegularEnumSet = one long (<= 64 constants)
            JumboEnumSet = long[] (> 64); factories pick, no constructor
            of / noneOf / allOf / range / complementOf / copyOf
            contains = shift + AND; addAll = OR; size = bitCount
            declaration order, no null; 32 B vs HashSet 272 B, ~2.6x faster

ENUMMAP     Object[] vals by ordinal; get = vals[k.ordinal()]
            declaration order; null keys no, null values yes (NULL marker)
            groupingBy(f, () -> new EnumMap<>(E.class), downstream)
            88 B vs HashMap 384 B, ~2x faster get

PATTERNS    interface + enum(s)  -> extensible strategies (StandardOpenOption)
            EnumMap<E, EnumSet<E>> -> state machine transitions as data
            EnumMap<Role, EnumSet<Permission>> -> permissions, bitwise union

SINGLETON   enum X { INSTANCE; }   created once at class init (thread-safe)
            reflection: "Cannot reflectively create enum objects"
            serialization: by NAME -> same instance; fields NOT serialized

EDGES       Java / JPA STRING / Jackson all use name()
            unknown value -> InvalidFormatException (whole batch!)
            @JsonEnumDefaultValue UNKNOWN + READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE
            + alert on UNKNOWN`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`EnumSet` and `EnumMap` turn an enum's ordinal into a bit position or an array index, so they're smaller and faster than the hash-based collections, iterate in declaration order, and should be the default for anything keyed by an enum.",
            "On top of enums sit some of Java's cleanest patterns: strategies through interfaces, state machines as `EnumMap`s of `EnumSet`s, and the one singleton the JVM itself protects.",
            "Enums are closed inside the JVM and open at its edges: they travel by name, and an external system adding a name we don't know must be handled deliberately. With this lesson the Enums phase is complete. Next comes Wrapper Classes: the object versions of primitives, autoboxing, the `Integer` cache that kept appearing in earlier lessons, and its traps.",
          ],
        },
      ],
    },
  ],
};
