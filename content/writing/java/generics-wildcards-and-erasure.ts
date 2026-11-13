import type { Lesson } from "../types";

export const genericsWildcardsAndErasure: Lesson = {
  slug: "generics-wildcards-and-erasure",
  date: "2026-11-13",
  title: "Wildcards, Variance and Type Erasure in Depth",
  description:
    "Why a List<Integer> is not a List<Number> and what would break if it were, upper and lower bounded wildcards and what each lets me read and write, PECS with the JDK's own signatures, Comparable<? super T>, how wildcards are encoded in the Signature attribute (+, -, *) and the CAP#1 captures in javac's errors, wildcard capture helpers, heap pollution through raw types and generic varargs, @SafeVarargs, reading List<Fare> back at run time with reflection and a super type token, and a generic Jackson helper that silently returned LinkedHashMaps instead of fares, all on JDK 21.",
  tags: ["Core Java", "Generics", "Wildcards", "Type Erasure"],
  sections: [
    {
      title: "What Wildcards Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson ended with a rule that surprises everyone the first time: `Integer` is a `Number`, but a `List<Integer>` is **not** a `List<Number>`. A method declared `total(List<Number> amounts)` refuses a `List<Integer>`, which seems to make generic code far less reusable than it should be.",
        },
        {
          type: "paragraph",
          text: "A **wildcard** is the answer. `?` stands for an unknown type argument, and it can be bounded: `List<? extends Number>` means \"a list of some subtype of `Number`, I don't know which\", and accepts `List<Integer>`, `List<Double>` and `List<Number>`. `List<? super Integer>` means \"a list of `Integer` or some supertype\", and accepts `List<Integer>`, `List<Number>` and `List<Object>`. Each kind of wildcard gives up some operations in exchange for accepting more types, and the rule for choosing is short enough to memorise: **PECS, Producer Extends, Consumer Super**.",
        },
        {
          type: "paragraph",
          text: "This lesson also finishes type erasure: how wildcards look in the class file, what **heap pollution** is and the two ways it happens, and how frameworks still manage to recover `List<Fare>` at run time when objects don't remember their type arguments. The production section is a real Jackson bug that comes straight from that last point.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The early generics proposals had only plain type parameters, and the invariance problem was obvious immediately: utility methods like `Collections.copy` or `addAll` would need either overloads or unchecked casts. Wildcards came from research on **variance** in type systems, Atsushi Igarashi and Mirko Viroli's *variant parametric types* (2002). Mads Torgersen, Peter von der Ahé, Gilad Bracha and others turned them into Java wildcards and published *Adding Wildcards to the Java Programming Language* (2004). They shipped with generics in Java 5.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "Generics with wildcards; the Collections Framework retrofitted with `? extends`/`? super`", "`addAll(Collection<? extends E>)`, `Collections.max(Collection<? extends T>)`"],
            ["Java 5 (2004)", "`Collections.checkedList`, `checkedMap`...", "Runtime type checks for heap-pollution debugging"],
            ["Java 7 (2011)", "`@SafeVarargs`; new \"possible heap pollution\" warning at varargs declarations (JEP-free, Project Coin)", "Varargs of generic types made safe to call"],
            ["Java 8 (2014)", "Functional interfaces using PECS: `Function<? super T, ? extends R>`", "Every stream method relies on wildcards"],
            ["Java 9 (2017)", "`@SafeVarargs` allowed on private instance methods", "More helper methods can declare safety"],
            ["Java 21 (2023)", "Generic record patterns with inference in `switch`", "`case Box<String>(var s)` checks the component, not the erased type argument"],
          ],
        },
        {
          type: "paragraph",
          text: "Java uses **use-site variance**: the caller's parameter type says `? extends` or `? super`, each time. Kotlin and Scala use **declaration-site variance**: the class declares once that it only produces `T` (`out T` in Kotlin, `+T` in Scala) or only consumes it. C# has both. Use-site wildcards are more flexible and more verbose, which is why Java signatures like `<T extends Comparable<? super T>> void sort(List<T> list)` look the way they do.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of baskets at a fruit market.",
        },
        {
          type: "list",
          items: [
            "A **basket of apples is not a basket of fruit**. If my apple basket could be handed over as a \"fruit basket\", someone could put a banana in it, and the next person expecting apples would bite a banana. That's invariance, and `WhyInvariant` below makes the banana appear.",
            "**`? extends Fruit` is a basket I can only take from**: \"some kind of fruit basket\". Whatever I take out is definitely fruit. I can't put anything in, because I don't know whether it's the apple basket or the banana basket. A **producer**.",
            "**`? super Apple` is a basket I can only put apples into**: \"a basket that accepts apples\", maybe an apple basket, a fruit basket or a basket for anything. Putting an apple in is always fine. Taking something out, I only know it's \"some object\". A **consumer**.",
            "**`?` is a basket I only count or look at**: I can see how many items it has, but I can't safely put anything in or assume what comes out.",
            "**Heap pollution is a banana smuggled into the apple basket** through a side door (a raw type or an unchecked cast). Nobody notices until someone bites it, far from where it was smuggled in.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real basket can be inspected to see what's inside. A Java `List<?>` object can't tell you its type argument at run time, because of erasure; only the declarations in the class file can. That's the reason for the type-token section and the Jackson bug.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Five ways to declare a list parameter",
        },
        {
          type: "table",
          headers: ["Parameter type", "Accepts", "Read elements as", "Can add"],
          rows: [
            ["`List<Number>`", "Only `List<Number>`", "`Number`", "Any `Number`"],
            ["`List<? extends Number>`", "`List<Number>`, `List<Integer>`, `List<Double>`...", "`Number`", "Nothing (only `null`)"],
            ["`List<? super Integer>`", "`List<Integer>`, `List<Number>`, `List<Object>`", "`Object`", "`Integer` (and subtypes)"],
            ["`List<?>`", "Any `List<X>`", "`Object`", "Nothing (only `null`)"],
            ["`List` (raw)", "Anything, with warnings", "`Object`", "Anything: unchecked, unsafe"],
          ],
        },
        {
          type: "paragraph",
          text: "`List<?>` and raw `List` look similar but are opposites. `List<?>` is fully type-checked: the compiler knows there is *some* specific type and refuses anything that could violate it. A raw `List` switches checking off. `List<Object>` is different again: it's a list that may contain anything, so it accepts only a `List<Object>` as an argument, not a `List<String>`.",
        },
        {
          type: "heading",
          text: "Variance in one table",
        },
        {
          type: "table",
          headers: ["Kind", "Meaning", "In Java"],
          rows: [
            ["Covariant", "If `A` is a subtype of `B`, `X<A>` is a subtype of `X<B>`", "Arrays (`Integer[]` is a `Number[]`), and `? extends`"],
            ["Contravariant", "If `A` is a subtype of `B`, `X<B>` is a subtype of `X<A>`", "`? super`"],
            ["Invariant", "No relation between `X<A>` and `X<B>`", "Plain generic types: `List<Integer>` vs `List<Number>`"],
          ],
        },
        {
          type: "image",
          src: "/images/java/generics-wildcards-variance.svg",
          alt: "Left panel, List<? extends Number> as a producer: List<Object> is rejected, List<Number>, List<Integer> and List<Double> are accepted; reading Number n = list.get(0) works, writing list.add(1) doesn't because it could be a List<Double>. Right panel, List<? super Integer> as a consumer: List<Object>, List<Number> and List<Integer> are accepted, List<Double> is rejected; writing list.add(1) works, reading as Integer doesn't, only as Object. Footer: get values out with ? extends T, put values in with ? super T, both with plain T, neither with ?.",
          caption: "Each wildcard widens what a method accepts by giving up either writing or typed reading.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "How wildcards are stored",
        },
        {
          type: "code",
          language: "java",
          title: "WildcardSignatures.java",
          code: `import java.util.List;

public class WildcardSignatures {
    static double total(List<? extends Number> amounts) { return 0; }
    static void fill(List<? super Integer> target) { }
    static int count(List<?> items) { return items.size(); }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac WildcardSignatures.java
javap -s -p WildcardSignatures
javap -v WildcardSignatures | grep 'Signature: #'`,
        },
        {
          type: "output",
          text: `  static double total(java.util.List<? extends java.lang.Number>);
    descriptor: (Ljava/util/List;)D
--
  static void fill(java.util.List<? super java.lang.Integer>);
    descriptor: (Ljava/util/List;)V
--
  static int count(java.util.List<?>);
    descriptor: (Ljava/util/List;)I
    Signature: #20                          // (Ljava/util/List<+Ljava/lang/Number;>;)D
    Signature: #23                          // (Ljava/util/List<-Ljava/lang/Integer;>;)V
    Signature: #26                          // (Ljava/util/List<*>;)I`,
        },
        {
          type: "list",
          items: [
            "The **descriptor**, which the JVM uses to link and call the method, is just `(Ljava/util/List;)`: all three methods take a plain `List` at run time. Wildcards, like type arguments, are erased.",
            "The **Signature** attribute keeps them, with one character each: `+` for `? extends`, `-` for `? super`, `*` for `?`. `javac` reads these when compiling callers, and reflection exposes them as `WildcardType` objects with upper and lower bounds.",
            "So wildcards cost nothing at run time. They are purely instructions to the compiler about which calls to allow.",
          ],
        },
        {
          type: "heading",
          text: "Capture conversion and CAP#1",
        },
        {
          type: "paragraph",
          text: "Inside a method, the compiler can't work with \"unknown\" directly. Every time an expression of type `List<? extends Number>` is used, `javac` replaces the wildcard with a **fresh type variable** that stands for \"the specific, unknown type of this list\". That's **capture conversion**, and those variables appear in error messages as `CAP#1`, `CAP#2`:",
        },
        {
          type: "code",
          language: "java",
          title: "WildcardErrors.java",
          code: `import java.util.List;

public class WildcardErrors {
    static void producer(List<? extends Number> amounts) {
        amounts.add(1);                       // can't write: which subtype of Number is it?
        Number n = amounts.get(0);            // reading is fine
    }

    static void consumer(List<? super Integer> target) {
        target.add(1);                        // writing an Integer is fine
        Integer i = target.get(0);            // can't read as Integer: could be a List<Object>
        Object o = target.get(0);             // only Object is guaranteed
    }

    static void unbounded(List<?> items) {
        items.add("x");                       // nothing but null can be added
        items.add(null);
    }
}`,
        },
        {
          type: "output",
          text: `WildcardErrors.java:5: error: incompatible types: int cannot be converted to CAP#1
        amounts.add(1);                       // can't write: which subtype of Number is it?
                    ^
  where CAP#1 is a fresh type-variable:
    CAP#1 extends Number from capture of ? extends Number
WildcardErrors.java:11: error: incompatible types: CAP#1 cannot be converted to Integer
        Integer i = target.get(0);            // can't read as Integer: could be a List<Object>
                              ^
  where CAP#1 is a fresh type-variable:
    CAP#1 extends Object super: Integer from capture of ? super Integer
WildcardErrors.java:16: error: incompatible types: String cannot be converted to CAP#1
        items.add("x");                       // nothing but null can be added
                  ^
  where CAP#1 is a fresh type-variable:
    CAP#1 extends Object from capture of ?
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
3 errors`,
        },
        {
          type: "list",
          items: [
            "**Line 5.** `amounts` is a `List<CAP#1>` where `CAP#1 extends Number`. `add` needs a `CAP#1`. An `int` (boxed to `Integer`) isn't known to be a `CAP#1`: the list might be a `List<Double>`. Rejected.",
            "**Line 6 compiles.** `get` returns a `CAP#1`, and every `CAP#1` is a `Number`.",
            "**Line 11.** `CAP#1` has a lower bound (`super: Integer`) but its upper bound is only `Object`. Reading gives a `CAP#1`, which might be `Number` or `Object`, so it can't be assigned to `Integer`. Line 12, reading as `Object`, compiles.",
            "**Line 16.** For `List<?>`, nothing is known to be a `CAP#1` except `null`, which is a member of every reference type. Line 17 compiles.",
          ],
        },
        {
          type: "paragraph",
          text: "Reading these messages is mostly a matter of recognising `CAP#n` as \"the type I said I don't know\". Whenever an error mentions a capture, the fix is either a different wildcard, or a helper method that gives the capture a name, shown in Wildcard Capture below.",
        },
      ],
    },
    {
      title: "Invariance: Why List<Integer> Isn't a List<Number>",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Invariance.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Invariance {
    static double total(List<Number> amounts) {
        double s = 0;
        for (Number n : amounts) s += n.doubleValue();
        return s;
    }

    public static void main(String[] args) {
        List<Integer> fares = new ArrayList<>(List.of(60, 70));
        System.out.println(total(fares));
        List<Number> numbers = fares;
    }
}`,
        },
        {
          type: "output",
          text: `Invariance.java:13: error: incompatible types: List<Integer> cannot be converted to List<Number>
        System.out.println(total(fares));
                                 ^
Invariance.java:14: error: incompatible types: List<Integer> cannot be converted to List<Number>
        List<Number> numbers = fares;
                               ^
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
2 errors`,
        },
        {
          type: "paragraph",
          text: "To see why the compiler refuses, I forced the conversion through an unchecked cast and did what a `List<Number>` is allowed to do:",
        },
        {
          type: "code",
          language: "java",
          title: "WhyInvariant.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class WhyInvariant {
    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        List<Integer> fares = new ArrayList<>(List.of(60, 70));
        // Pretend List<Integer> were a List<Number>, by forcing it through a raw cast
        List<Number> numbers = (List<Number>) (List<?>) fares;
        numbers.add(2.5);                              // a Double, legal for a List<Number>
        System.out.println("fares now " + fares);
        try {
            int last = fares.get(2);                   // the compiler inserted a cast to Integer
            System.out.println(last);
        } catch (ClassCastException e) {
            System.out.println("ClassCastException: " + e.getMessage().substring(0, 60) + "...");
        }

        // Arrays made the opposite choice and check at run time instead
        Integer[] arr = {60, 70};
        Number[] nums = arr;
        try {
            nums[0] = 2.5;
        } catch (ArrayStoreException e) {
            System.out.println("ArrayStoreException: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `fares now [60, 70, 2.5]
ClassCastException: class java.lang.Double cannot be cast to class java.lang.Int...
ArrayStoreException: java.lang.Double`,
        },
        {
          type: "list",
          items: [
            "Through the `List<Number>` view, adding `2.5` is perfectly legal. But it's the same list object as `fares`, so now a `List<Integer>` contains a `Double`. Reading it as an `int` failed in the cast `javac` inserted. If `List<Integer>` were a subtype of `List<Number>`, this would compile **without** any cast or warning: the type system would be unsound.",
            "Arrays are covariant (`Integer[]` is a `Number[]`), and pay for it at run time: every store is checked, and `nums[0] = 2.5` threw `ArrayStoreException`. Generics can't do that check, because after erasure the list doesn't know its element type. So generics are invariant and the mistake is caught at compile time instead.",
            "Invariance is safe but rigid. Wildcards bring back exactly the flexibility that's safe: reading from a `List<Integer>` as `Number`s (`? extends`) or writing `Integer`s into a `List<Number>` (`? super`).",
          ],
        },
      ],
    },
    {
      title: "Upper and Lower Bounded Wildcards",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Wildcards.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Wildcards {
    // Producer: reads Numbers out, accepts List<Integer>, List<Double>, List<Number>...
    static double total(List<? extends Number> amounts) {
        double s = 0;
        for (Number n : amounts) s += n.doubleValue();
        return s;
    }

    // Consumer: writes Integers in, accepts List<Integer>, List<Number>, List<Object>
    static void addDefaultFares(List<? super Integer> target) {
        target.add(60);
        target.add(70);
    }

    // Unbounded: only uses Object methods and size
    static void describe(List<?> items) {
        System.out.println(items.size() + " items, first " + (items.isEmpty() ? "-" : items.get(0)));
    }

    public static void main(String[] args) {
        System.out.println(total(List.of(60, 70)) + " " + total(List.of(1.5, 2.5)));

        List<Number> numbers = new ArrayList<>();
        List<Object> objects = new ArrayList<>(List.of("header"));
        addDefaultFares(numbers);
        addDefaultFares(objects);
        System.out.println(numbers + " " + objects);

        describe(List.of("Asha", "Ravi"));
        describe(numbers);
        describe(List.of());
    }
}`,
        },
        {
          type: "output",
          text: `130.0 4.0
[60, 70] [header, 60, 70]
2 items, first Asha
2 items, first 60
0 items, first -`,
        },
        {
          type: "list",
          items: [
            "**`? extends Number`**: the same `total` now accepts `List<Integer>` and `List<Double>`, the method `Invariance` couldn't write. It only reads, which is all it needed.",
            "**`? super Integer`**: `addDefaultFares` writes `Integer`s into a `List<Number>` and a `List<Object>`. A parameter of plain `List<Integer>` would have refused both.",
            "**`?`**: `describe` uses only `size()`, `isEmpty()` and `get` as `Object`, so it accepts any list at all. `List<?>` is the right type for \"I don't care what's in it\".",
            "The trade-off is exactly what `WildcardErrors` showed: `? extends` can't add, `? super` can only read `Object`, `?` can do neither.",
          ],
        },
      ],
    },
    {
      title: "PECS: Producer Extends, Consumer Super",
      blocks: [
        {
          type: "paragraph",
          text: "Joshua Bloch's mnemonic from *Effective Java*: if a parameter **produces** `T` values for the method to read, use `? extends T`; if it **consumes** `T` values the method writes, use `? super T`; if it does both, use plain `T`. Functions follow the same rule: a `Predicate<? super T>` consumes `T`s; a `Function<? super T, ? extends R>` consumes `T` and produces `R`.",
        },
        {
          type: "code",
          language: "java",
          title: "Pecs.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.function.Predicate;

public class Pecs {
    // src produces T (extends), dst consumes T (super)
    static <T> void copyMatching(List<? extends T> src, List<? super T> dst, Predicate<? super T> keep) {
        for (T t : src) if (keep.test(t)) dst.add(t);
    }

    static class Vehicle {
        final String plate; final int seats;
        Vehicle(String plate, int seats) { this.plate = plate; this.seats = seats; }
        @Override public String toString() { return getClass().getSimpleName() + " " + plate; }
    }
    static class Cab extends Vehicle { Cab(String p) { super(p, 4); } }
    static class Auto extends Vehicle { Auto(String p) { super(p, 3); } }

    public static void main(String[] args) {
        List<Cab> cabs = List.of(new Cab("WB-01"), new Cab("WB-02"));
        List<Auto> autos = List.of(new Auto("WB-91"));
        List<Vehicle> fleet = new ArrayList<>();
        List<Object> audit = new ArrayList<>();

        Predicate<Vehicle> anyVehicle = v -> v.seats >= 3;      // a predicate on the supertype
        copyMatching(cabs, fleet, anyVehicle);                  // T = Cab: src List<Cab>, dst List<Vehicle>
        copyMatching(autos, fleet, anyVehicle);
        copyMatching(cabs, audit, v -> true);
        System.out.println("fleet " + fleet + "  audit " + audit);

        // The JDK uses the same pattern
        List<Vehicle> sorted = new ArrayList<>(fleet);
        Comparator<Vehicle> byPlate = Comparator.comparing(v -> v.plate);
        List<Cab> myCabs = new ArrayList<>(cabs);
        myCabs.sort(byPlate.reversed());                        // sort(Comparator<? super E>)
        Collections.addAll(sorted, new Cab("WB-00"));           // addAll(Collection<? super T>, T...)
        System.out.println(myCabs + " " + sorted.size());
        List<Vehicle> dst = new ArrayList<>(Collections.nCopies(2, (Vehicle) null));
        Collections.copy(dst, cabs);                            // copy(List<? super T>, List<? extends T>)
        System.out.println(dst);
    }
}`,
        },
        {
          type: "output",
          text: `fleet [Cab WB-01, Cab WB-02, Auto WB-91]  audit [Cab WB-01, Cab WB-02]
[Cab WB-02, Cab WB-01] 4
[Cab WB-01, Cab WB-02]`,
        },
        {
          type: "list",
          items: [
            "One `copyMatching` handles cabs into a vehicle fleet, autos into the same fleet, and cabs into an `Object` audit list, all with full type checking. With plain `List<T>` everywhere, all three lists would have to have exactly the same element type.",
            "The predicate is a `Predicate<Vehicle>`, used to test `Cab`s: a predicate is a consumer of `T`, so `Predicate<? super T>` accepts a predicate written for any supertype.",
            "`myCabs.sort(byPlate.reversed())` sorts a `List<Cab>` with a `Comparator<Vehicle>`, because `List.sort` takes `Comparator<? super E>`. `Collections.copy(List<? super T> dest, List<? extends T> src)` is PECS spelled out in the JDK.",
          ],
        },
        {
          type: "heading",
          text: "Comparable<? super T>",
        },
        {
          type: "paragraph",
          text: "The most famous PECS signature is `Collections.max`: `<T extends Object & Comparable<? super T>> T max(Collection<? extends T> coll)`. The `? super T` matters whenever a subclass inherits `compareTo` from its parent:",
        },
        {
          type: "code",
          language: "java",
          title: "ComparableSuper.java",
          code: `import java.util.List;

public class ComparableSuper {
    static class Fare implements Comparable<Fare> {
        final int paise;
        Fare(int paise) { this.paise = paise; }
        public int compareTo(Fare o) { return Integer.compare(paise, o.paise); }
        public String toString() { return getClass().getSimpleName() + "(" + paise + ")"; }
    }
    static class SurgeFare extends Fare {                     // Comparable<Fare>, not Comparable<SurgeFare>
        SurgeFare(int paise) { super(paise); }
    }

    static <T extends Comparable<? super T>> T max(List<? extends T> items) {
        T best = items.get(0);
        for (T t : items) if (t.compareTo(best) > 0) best = t;
        return best;
    }

    public static void main(String[] args) {
        List<SurgeFare> surge = List.of(new SurgeFare(9_000), new SurgeFare(12_000));
        System.out.println(max(surge));
    }
}`,
        },
        {
          type: "output",
          text: `SurgeFare(12000)`,
        },
        {
          type: "paragraph",
          text: "With the stricter bound from the previous lesson, the same call doesn't compile:",
        },
        {
          type: "code",
          language: "java",
          title: "ComparableStrict.java",
          code: `import java.util.List;

public class ComparableStrict {
    static class Fare implements Comparable<Fare> {
        public int compareTo(Fare o) { return 0; }
    }
    static class SurgeFare extends Fare { }

    static <T extends Comparable<T>> T max(List<T> items) { return items.get(0); }

    public static void main(String[] args) {
        List<SurgeFare> surge = List.of(new SurgeFare());
        SurgeFare s = max(surge);
    }
}`,
        },
        {
          type: "output",
          text: `ComparableStrict.java:13: error: method max in class ComparableStrict cannot be applied to given types;
        SurgeFare s = max(surge);
                      ^
  required: List<T>
  found:    List<SurgeFare>
  reason: inference variable T has incompatible equality constraints Fare,SurgeFare
  where T is a type-variable:
    T extends Comparable<T> declared in method <T>max(List<T>)
1 error`,
        },
        {
          type: "paragraph",
          text: "`SurgeFare` is a `Comparable<Fare>`, not a `Comparable<SurgeFare>`, so `T extends Comparable<T>` can't be satisfied with `T = SurgeFare`, and the list pins `T` to `SurgeFare`. With `Comparable<? super T>`, it's enough that `SurgeFare` can be compared to *some supertype* of itself, which it can. Any time I write a bound with `Comparable`, `Comparator` or another consumer of `T`, I use `? super T`.",
        },
      ],
    },
    {
      title: "Wildcard Capture",
      blocks: [
        {
          type: "paragraph",
          text: "A public API often looks best with `List<?>`: the caller shouldn't have to think about types. But inside, the method sometimes needs to say \"the same type as the list\", which a bare `?` can't express:",
        },
        {
          type: "code",
          language: "java",
          title: "CaptureError.java",
          code: `import java.util.List;

public class CaptureError {
    static void swap(List<?> list, int i, int j) {
        list.set(i, list.get(j));
    }
}`,
        },
        {
          type: "output",
          text: `CaptureError.java:5: error: incompatible types: Object cannot be converted to CAP#1
        list.set(i, list.get(j));
                            ^
  where CAP#1 is a fresh type-variable:
    CAP#1 extends Object from capture of ?
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
1 error`,
        },
        {
          type: "paragraph",
          text: "`list.get(j)` is treated as `Object`, and `set` needs a `CAP#1`. Each use of `list` is a fresh capture, so the compiler can't connect the two. A private generic helper fixes it, because calling it **names** the capture:",
        },
        {
          type: "code",
          language: "java",
          title: "Capture.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Capture {
    // Public API: callers don't care about the element type
    static void swap(List<?> list, int i, int j) {
        swapHelper(list, i, j);                   // the compiler captures ? as a fresh T
    }

    private static <T> void swapHelper(List<T> list, int i, int j) {
        T tmp = list.get(i);
        list.set(i, list.get(j));
        list.set(j, tmp);
    }

    public static void main(String[] args) {
        List<String> zones = new ArrayList<>(Arrays.asList("SALT-LAKE", "NEW-TOWN", "PARK-ST"));
        swap(zones, 0, 2);
        System.out.println(zones);
    }
}`,
        },
        {
          type: "output",
          text: `[PARK-ST, NEW-TOWN, SALT-LAKE]`,
        },
        {
          type: "paragraph",
          text: "When `swap` calls `swapHelper(list, ...)`, inference sets `T` to the capture of `?`, and inside the helper `list.get(i)` returns a `T` that `list.set` accepts. `Collections.swap(List<?> list, int i, int j)` and `Collections.reverse(List<?>)` in the JDK are written this way (internally they use a raw cast, but the effect is the same).",
        },
      ],
    },
    {
      title: "Heap Pollution",
      blocks: [
        {
          type: "paragraph",
          text: "**Heap pollution** is a variable of a parameterized type referring to an object that isn't of that type: a `List<String>` that contains an `Integer`. The compiler warns wherever it can happen (\"unchecked\"), and the failure appears later, at a read, as a `ClassCastException` from a cast the programmer never wrote. There are two common sources.",
        },
        {
          type: "heading",
          text: "Source 1: raw types and unchecked casts",
        },
        {
          type: "code",
          language: "java",
          title: "RawMixing.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class RawMixing {
    @SuppressWarnings({"rawtypes", "unchecked"})
    static void legacyAppend(List list) {
        list.add(42);                                  // a raw List accepts anything
    }

    public static void main(String[] args) {
        List<String> names = new ArrayList<>(List.of("Asha"));
        legacyAppend(names);                           // heap pollution: a List<String> holding an Integer
        System.out.println("size " + names.size() + ", contents " + names);
        Object o = names.get(1);                       // no cast to String needed here, so no failure
        System.out.println("as Object: " + o);
        try {
            String s = names.get(1);                   // the compiler-inserted cast fails here
        } catch (ClassCastException e) {
            System.out.println("ClassCastException at the read, not at the add");
        }
    }
}`,
        },
        {
          type: "output",
          text: `size 2, contents [Asha, 42]
as Object: 42
ClassCastException at the read, not at the add`,
        },
        {
          type: "paragraph",
          text: "The polluted element survives printing and reading as `Object`, because `javac` only inserts a `checkcast String` where a `String` is actually needed. That's what makes heap pollution hard to debug: the list can travel a long way before anything fails. The previous lesson's `SurgeZones` bug was this, and `Collections.checkedList` was how to catch the write.",
        },
        {
          type: "heading",
          text: "Source 2: generic varargs",
        },
        {
          type: "code",
          language: "java",
          title: "VarargsPollution.java",
          code: `import java.util.List;

public class VarargsPollution {
    // Returns its varargs array: the array's runtime type is decided by the CALLER
    static <T> T[] toArray(T... items) {
        return items;
    }

    // Generic code calls it, so T is erased here and the array created is Object[]
    static <T> T[] pickTwo(T a, T b, T c) {
        return toArray(a, b);
    }

    @SafeVarargs                                   // safe: never stores into or exposes the array
    static <T> List<T> listOf(T... items) {
        return List.of(items);
    }

    public static void main(String[] args) {
        String[] direct = toArray("Asha", "Ravi");                // array created here as String[]
        System.out.println(direct.getClass().getSimpleName());
        try {
            String[] picked = pickTwo("Asha", "Ravi", "Meera");   // array created inside pickTwo as Object[]
            System.out.println(picked.length);
        } catch (ClassCastException e) {
            System.out.println("ClassCastException: " + e.getMessage().substring(0, 76) + "...");
        }
        System.out.println(listOf("a", "b"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -Xlint:unchecked VarargsPollution.java && java VarargsPollution",
        },
        {
          type: "output",
          text: `VarargsPollution.java:5: warning: [unchecked] Possible heap pollution from parameterized vararg type T
    static <T> T[] toArray(T... items) {
                                ^
  where T is a type-variable:
    T extends Object declared in method <T>toArray(T...)
VarargsPollution.java:11: warning: [unchecked] unchecked generic array creation for varargs parameter of type T[]
        return toArray(a, b);
                      ^
  where T is a type-variable:
    T extends Object declared in method <T>pickTwo(T,T,T)
2 warnings
String[]
ClassCastException: class [Ljava.lang.Object; cannot be cast to class [Ljava.lang.String; ([Ljav...
[a, b]`,
        },
        {
          type: "list",
          items: [
            "A varargs parameter is an array, and the **caller** creates it. Called directly with strings, `javac` created a `String[]`, and everything worked.",
            "`pickTwo` is generic, so at its call to `toArray(a, b)` the only thing `javac` knows about `T` is its erasure, `Object`. It created an `Object[]`. That array was returned all the way to `main`, where the inserted cast to `String[]` failed, the same trap as `GenericBox.all()` in the Arrays lesson.",
            "`javac` warns at the declaration (\"possible heap pollution\") and at the generic call site. Calling `List.of`, `Arrays.asList` or `Stream.of` with generic types gives no warning, because they're annotated `@SafeVarargs`.",
            "**`@SafeVarargs`** is a promise by the method author that the method doesn't store anything into the varargs array and doesn't let a reference to it escape. `listOf` only reads the array, so the promise holds and callers get no warning. It's allowed only on methods that can't be overridden: `static`, `final`, constructors, and (since Java 9) `private` methods. Putting it on `toArray` would compile and be a lie.",
          ],
        },
      ],
    },
    {
      title: "Generic Types at Run Time: Reflection and Type Tokens",
      blocks: [
        {
          type: "paragraph",
          text: "Objects don't remember their type arguments, but declarations do (the Signature attribute). Reflection exposes those declarations as `java.lang.reflect.Type` objects: `ParameterizedType` for `List<Fare>`, `TypeVariable` for `T`, `WildcardType` for `? extends Number`, and plain `Class` for the rest.",
        },
        {
          type: "code",
          language: "java",
          title: "GenericReflection.java",
          code: `import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class GenericReflection {
    static class Fare { }

    static class FareService {
        List<Fare> recent;                                  // declaration keeps List<Fare>
        Map<String, List<Fare>> byZone;
        List<Fare> quote(Map<String, Integer> distances) { return null; }
    }

    // A class that extends a parameterized type records that type argument too
    static class FareList extends ArrayList<Fare> { }

    // Super type token: an anonymous subclass captures the full type
    static abstract class TypeRef<T> {
        final Type type;
        protected TypeRef() {
            ParameterizedType sup = (ParameterizedType) getClass().getGenericSuperclass();
            type = sup.getActualTypeArguments()[0];
        }
    }

    static <T> Type erasedInside() {
        return new TypeRef<List<T>>() { }.type;             // T is still just a type variable here
    }

    public static void main(String[] args) throws Exception {
        Field recent = FareService.class.getDeclaredField("recent");
        System.out.println("field type          " + recent.getType().getSimpleName());
        System.out.println("field generic type  " + recent.getGenericType());
        System.out.println("map generic type    " + FareService.class.getDeclaredField("byZone").getGenericType());
        Method quote = FareService.class.getDeclaredMethod("quote", Map.class);
        System.out.println("return / param      " + quote.getGenericReturnType() + " / " + quote.getGenericParameterTypes()[0]);
        System.out.println("FareList super      " + FareList.class.getGenericSuperclass());

        List<Fare> local = new ArrayList<>();
        System.out.println("an object's class   " + local.getClass().getGenericSuperclass());

        System.out.println("TypeRef<List<Fare>> " + new TypeRef<List<Fare>>() { }.type);
        System.out.println("TypeRef<List<T>>    " + erasedInside());
    }
}`,
        },
        {
          type: "output",
          text: `field type          List
field generic type  java.util.List<GenericReflection$Fare>
map generic type    java.util.Map<java.lang.String, java.util.List<GenericReflection$Fare>>
return / param      java.util.List<GenericReflection$Fare> / java.util.Map<java.lang.String, java.lang.Integer>
FareList super      java.util.ArrayList<GenericReflection$Fare>
an object's class   java.util.AbstractList<E>
TypeRef<List<Fare>> java.util.List<GenericReflection$Fare>
TypeRef<List<T>>    java.util.List<T>`,
        },
        {
          type: "list",
          items: [
            "`getType()` gives the erased class, `List`. `getGenericType()` reads the Signature attribute and gives the full `List<Fare>`, nested types and all. This is how Spring injects a `List<FareRule>` with every `FareRule` bean, and how JPA knows the element type of a `@OneToMany List<Trip>`.",
            "A class that **extends** a parameterized type, like `FareList extends ArrayList<Fare>`, records `Fare` in its own Signature, so `getGenericSuperclass()` returns it.",
            "A plain `new ArrayList<Fare>()` records nothing: its class is `ArrayList`, whose superclass is declared `AbstractList<E>`. The `Fare` existed only in my source.",
            "**The super type token** combines the two: `new TypeRef<List<Fare>>() { }` creates an anonymous subclass whose declared superclass is `TypeRef<List<Fare>>`, so the constructor reads `List<Fare>` back. Neal Gafter described this trick in 2006; Jackson's `TypeReference`, Guava's `TypeToken` and Spring's `ParameterizedTypeReference` are all built on it. The `{ }` is what makes it work.",
            "**The trap:** inside a generic method, `new TypeRef<List<T>>() { }` records `List<T>`, with `T` a type variable, because that's what the source says at that point. The caller's type argument never reaches it. That's the production bug below.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `total(List.of(60, 70))` from `Wildcards.java`, where `total` takes `List<? extends Number>`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Infer the argument.** `List.of(60, 70)` is a generic method call with no target type of its own except the parameter. Its `E` is inferred from the arguments as `Integer` (the ints are boxed with `Integer.valueOf`), giving `List<Integer>`.",
            "**Check the call.** Is `List<Integer>` compatible with `List<? extends Number>`? The wildcard's bound is `Number`, and `Integer` is a subtype of `Number`, so it **contains** `Integer`: yes. With a parameter of `List<Number>` this check fails, which is `Invariance`'s error.",
            "**Check the body.** Inside `total`, `amounts` has a captured type `List<CAP#1>` with `CAP#1 extends Number`. The enhanced `for` assigns each element to `Number n`: a `CAP#1` is a `Number`, so it compiles. An `amounts.add(...)` here would not.",
            "**Erase.** The method's descriptor becomes `(Ljava/util/List;)D`, with `List<+Ljava/lang/Number;>` kept in its Signature. The loop calls `Iterator.next()`, which returns `Object`, and `javac` inserts `checkcast Number` before calling `doubleValue()`.",
            "**Run.** `List.of` returns an immutable list of two `Integer`s. The loop iterates, each `checkcast Number` succeeds, `doubleValue()` dispatches to `Integer.doubleValue()`, and the sum is 130.0. At run time there's no trace of the wildcard: it only decided which calls compiled.",
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
          title: "WildcardTour.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

public class WildcardTour {
    // 1. upper bounded, lower bounded, unbounded parameters
    static double sum(List<? extends Number> xs) { return xs.stream().mapToDouble(Number::doubleValue).sum(); }
    static void fill(List<? super Integer> xs) { xs.add(1); }
    static int count(List<?> xs) { return xs.size(); }

    // 2. a generic method combining a type parameter with wildcards (PECS)
    static <T> void copy(List<? super T> dst, List<? extends T> src) { dst.addAll(src); }

    // 3. functional parameters follow PECS: Function<? super T, ? extends R>
    static <T, R> List<R> mapAll(List<T> xs, Function<? super T, ? extends R> f) {
        List<R> out = new ArrayList<>();
        for (T x : xs) out.add(f.apply(x));
        return out;
    }

    // 4. recursive bound with a wildcard, as in Collections.max
    static <T extends Comparable<? super T>> T largest(List<? extends T> xs) {
        return xs.stream().max(Comparator.naturalOrder()).orElseThrow();
    }

    public static void main(String[] args) {
        List<Integer> ints = new ArrayList<>(List.of(3, 1, 2));
        List<Number> nums = new ArrayList<>();
        fill(nums);
        copy(nums, ints);
        System.out.println(sum(ints) + " " + nums + " " + count(List.of("a")));

        Function<Object, String> describe = o -> "<" + o + ">";
        List<CharSequence> labels = mapAll(ints, describe);        // ? super Integer, ? extends CharSequence
        System.out.println(labels + " " + largest(ints));

        // 5. wildcards in fields and nested types
        Map<String, List<? extends Number>> series = new HashMap<>();
        series.put("fares", ints);
        series.put("ratings", List.of(4.5, 4.9));
        Class<?> anyClass = series.getClass();
        System.out.println(series.get("ratings") + " " + anyClass.getSimpleName());
    }
}`,
        },
        {
          type: "output",
          text: `6.0 [1, 3, 1, 2] 1
[<3>, <1>, <2>] 3
[4.5, 4.9] HashMap`,
        },
        {
          type: "paragraph",
          text: "`mapAll(ints, describe)` shows both sides of PECS in one call: a `Function<Object, String>` is accepted where `Function<? super Integer, ? extends R>` is expected, and `R` is inferred from the target as `CharSequence`, which `String` extends. `Map<String, List<? extends Number>>` lets one map hold lists of different number types; reading a value gives a `List<? extends Number>`. `Class<?>` is the usual way to hold \"some class\".",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: An event bus with Consumer<? super E>",
        },
        {
          type: "code",
          language: "java",
          title: "EventBus.java",
          code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class EventBus {
    interface Event { }
    record TripStarted(String tripId) implements Event { }
    record TripEnded(String tripId, int farePaise) implements Event { }

    private final Map<Class<?>, List<Consumer<? super Event>>> handlers = new HashMap<>();

    // A handler for E, or for any supertype of E, can receive E
    <E extends Event> void subscribe(Class<E> type, Consumer<? super E> handler) {
        Consumer<? super Event> h = e -> handler.accept(type.cast(e));
        handlers.computeIfAbsent(type, k -> new ArrayList<>()).add(h);
    }

    void publish(Event e) {
        handlers.getOrDefault(e.getClass(), List.of()).forEach(h -> h.accept(e));
    }

    public static void main(String[] args) {
        EventBus bus = new EventBus();
        Consumer<Object> audit = e -> System.out.println("audit   " + e);          // handles anything
        Consumer<TripEnded> billing = e -> System.out.println("billing Rs " + e.farePaise() / 100);

        bus.subscribe(TripStarted.class, audit);
        bus.subscribe(TripEnded.class, audit);
        bus.subscribe(TripEnded.class, billing);

        bus.publish(new TripStarted("T1"));
        bus.publish(new TripEnded("T1", 14_500));
    }
}`,
        },
        {
          type: "output",
          text: `audit   TripStarted[tripId=T1]
audit   TripEnded[tripId=T1, farePaise=14500]
billing Rs 145`,
        },
        {
          type: "paragraph",
          text: "`subscribe` takes `Consumer<? super E>`, so one `Consumer<Object>` audit handler can be registered for every event type, while `billing` only accepts `TripEnded`. With `Consumer<E>`, the audit logger would need a separate lambda per event type. The `Class<E>` token lets `type.cast` check each event at run time inside the map, which mixes types and so can only be typed with wildcards. `type.cast` is what keeps this free of unchecked casts: the code compiles with no warnings under `-Xlint:all`.",
        },
        {
          type: "heading",
          text: "Example 2: Utilities that accept any numeric collection",
        },
        {
          type: "code",
          language: "java",
          title: "NumberStats.java",
          code: `import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

public class NumberStats {
    record Summary(int count, double sum, double max) { }

    // Works for any collection of any Number subtype
    static Summary summarize(Collection<? extends Number> values) {
        double sum = 0, max = Double.NEGATIVE_INFINITY;
        for (Number n : values) {
            sum += n.doubleValue();
            max = Math.max(max, n.doubleValue());
        }
        return new Summary(values.size(), sum, max);
    }

    // Fills any list that can hold Integers
    static void addRange(List<? super Integer> target, int from, int to) {
        for (int i = from; i < to; i++) target.add(i);
    }

    public static void main(String[] args) {
        System.out.println(summarize(List.of(120, 85, 240)));
        System.out.println(summarize(Set.of(1.5, 2.25)));
        System.out.println(summarize(List.of(new BigDecimal("10.10"), new BigDecimal("0.40"))));
        List<Number> mixed = new ArrayList<>(List.of(0.5));
        addRange(mixed, 1, 4);
        System.out.println(mixed + " " + summarize(mixed));
    }
}`,
        },
        {
          type: "output",
          text: `Summary[count=3, sum=445.0, max=240.0]
Summary[count=2, sum=3.75, max=2.25]
Summary[count=2, sum=10.5, max=10.1]
[0.5, 1, 2, 3] Summary[count=4, sum=6.5, max=3.0]`,
        },
        {
          type: "paragraph",
          text: "`summarize` reads only, so `Collection<? extends Number>` accepts lists and sets of `Integer`, `Double` and `BigDecimal`. `addRange` writes only, so `List<? super Integer>` lets it fill a `List<Number>` that already holds a `Double`. Using `Collection` rather than `List` for the producer widens it further: a parameter should ask for the least it needs.",
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["The parameter...", "Declare it as", "Example"],
          rows: [
            ["Only gives me `T`s to read", "`? extends T`", "`addAll(Collection<? extends E> c)`"],
            ["Only receives `T`s I write", "`? super T`", "`Collections.addAll(Collection<? super T> c, T... elements)`"],
            ["Is read and written as `T`", "Plain `T`", "`Collections.swap` helper, `List<T> sort` in place"],
            ["Only uses `Object` methods or `size()`", "`?`", "`Collection.containsAll(Collection<?> c)`"],
            ["Is a function taking `T`", "`Function<? super T, ...>`, `Predicate<? super T>`, `Consumer<? super T>`", "`Stream.filter(Predicate<? super T>)`"],
            ["Is a function returning `R`", "`Function<..., ? extends R>`, `Supplier<? extends T>`", "`Stream.map(Function<? super T, ? extends R>)`"],
            ["Compares `T`s", "`Comparator<? super T>`, `<T extends Comparable<? super T>>`", "`List.sort(Comparator<? super E>)`"],
            ["Is a return type", "No wildcard: a concrete type", "`List<Fare> findFares()`, not `List<? extends Fare>`"],
            ["Must link two parameters (same type)", "A type parameter `<T>`", "`<T> void copy(List<? super T> dst, List<? extends T> src)`"],
          ],
        },
        {
          type: "paragraph",
          text: "Wildcards belong in **parameters**, not return types. A method returning `List<? extends Fare>` pushes the wildcard onto every caller, who then can't add to the list and has to carry `? extends` in their own variables. If callers shouldn't modify it, return an unmodifiable `List<Fare>`.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Declaring List<Object> to mean \"any list\"",
        },
        {
          type: "paragraph",
          text: "`void print(List<Object> items)` refuses a `List<String>`. \"Any list\" is `List<?>`. `List<Object>` means \"a list that may contain anything\", which is a much narrower set of arguments.",
        },
        {
          type: "heading",
          text: "Trying to add to a List<? extends T>",
        },
        {
          type: "paragraph",
          text: "It's a producer; `add` fails with a `CAP#1` error. If the method needs to add, the parameter is a consumer (`? super T`) or both (`T`).",
        },
        {
          type: "heading",
          text: "Comparable<T> instead of Comparable<? super T>",
        },
        {
          type: "paragraph",
          text: "`<T extends Comparable<T>>` rejects subclasses that inherit `compareTo`, like `SurgeFare`. Use `<T extends Comparable<? super T>>`, as the JDK does.",
        },
        {
          type: "heading",
          text: "Wildcards in return types",
        },
        {
          type: "paragraph",
          text: "`List<? extends Fare> getFares()` makes every caller deal with the wildcard. Return a concrete type.",
        },
        {
          type: "heading",
          text: "Ignoring varargs warnings, or using @SafeVarargs without checking",
        },
        {
          type: "paragraph",
          text: "\"Possible heap pollution from parameterized vararg type\" means callers might get an array of the wrong runtime type. Annotate with `@SafeVarargs` only when the method neither writes to the array nor lets it escape (returning it, storing it in a field, passing it to untrusted code). `toArray` in `VarargsPollution` breaks the second rule.",
        },
        {
          type: "heading",
          text: "Building a type token inside a generic method",
        },
        {
          type: "paragraph",
          text: "`new TypeReference<List<T>>() { }` in a generic method captures `List<T>`, not the caller's type. Libraries then fall back to defaults (Jackson: `LinkedHashMap`), and the error appears later as a `ClassCastException`. Pass a `Class<T>` and build the type with the library's type factory, as the production section does.",
        },
        {
          type: "heading",
          text: "Expecting getClass() to show the type argument",
        },
        {
          type: "paragraph",
          text: "`list.getClass()` is `ArrayList`. Type arguments of objects are only available where they were written into a declaration: a field, a method signature, or a subclass's `extends` clause.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Apply PECS to every generic parameter of a public API: `? extends T` for inputs I read, `? super T` for outputs I write into, plain `T` when both.",
            "Use `? super T` for every function, comparator and consumer parameter: `Predicate<? super T>`, `Comparator<? super T>`, `Consumer<? super T>`.",
            "Use `<T extends Comparable<? super T>>` for natural-order bounds.",
            "Keep wildcards out of return types and out of fields that callers see.",
            "Prefer `List<?>` to raw `List` whenever the element type doesn't matter.",
            "Hide wildcard capture behind a private generic helper rather than casting.",
            "Treat every unchecked warning as possible heap pollution: fix it or prove it safe, and suppress it on one statement with a comment.",
            "Use `@SafeVarargs` only on methods that don't store into or leak the varargs array; never on a method that returns it.",
            "To keep a full generic type at run time, use a super type token (`TypeReference`, `TypeToken`, `ParameterizedTypeReference`) at a call site where the type is concrete, or pass a `Class<T>` and build the type with the library's factory.",
            "Use `Collections.checkedList` and friends to find heap pollution at its source.",
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
            "**Wildcards cost nothing at run time.** `javap` showed the same `(Ljava/util/List;)` descriptor for `List<? extends Number>`, `List<? super Integer>` and `List<?>`. All the work is done by `javac`.",
            "**Casts are the only runtime trace** of generics, as in the previous lesson: one `checkcast` where a typed value is used, which the JIT usually folds away.",
            "**`Collections.checkedList` is not free**: every insert does a `Class.isInstance` check. Fine for debugging and at module boundaries, not something to wrap around every hot collection permanently.",
            "**Reflection on generic types is slow the first time.** `getGenericType()` parses the Signature string and builds `Type` objects. Frameworks cache the result: Jackson caches serializers per `JavaType`, Spring caches `ResolvableType`. In my own code I'd build a `TypeReference` or `JavaType` once, as a constant, rather than per request.",
            "**`ObjectMapper` is expensive to create and safe to share**; creating one per call, as some generic JSON helpers do, costs far more than any generic-type handling. The production example keeps one `static final` mapper.",
            "**Boxing remains the real cost** of generic code over primitives, as measured in the previous lesson.",
          ],
        },
      ],
    },
    {
      title: "Generics in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend receives a fare feed from a partner as a JSON array. A developer wrote a \"reusable\" generic helper, `fromJsonList(json)`, using Jackson's `TypeReference` the way the documentation shows, but inside a generic method. It compiled without a single warning, and the unit test for the helper (which only checked `size()`) passed. The first service to sum the fares failed in production with a `ClassCastException` mentioning `LinkedHashMap`, a class nobody had used. I rebuilt it with real Jackson 2.21.5 (`com.fasterxml.jackson.core:jackson-databind:2.21.5`, which brings `jackson-core` and `jackson-annotations`); `$JACKSON` is the classpath of those three JARs.",
        },
        {
          type: "code",
          language: "java",
          title: "FareFeed.java",
          code: `import java.util.List;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;

public class FareFeed {
    public record Fare(String zone, int paise) { }

    static final ObjectMapper MAPPER = new ObjectMapper();
    static final String JSON = """
            [{"zone":"SALT-LAKE","paise":7000},{"zone":"NEW-TOWN","paise":8000}]""";

    // What shipped: a "reusable" generic helper
    static <T> List<T> fromJsonList(String json) throws Exception {
        return MAPPER.readValue(json, new TypeReference<List<T>>() { });
    }

    // The fix: the caller passes the element class, and Jackson builds the full type
    static <T> List<T> fromJsonList(String json, Class<T> elementType) throws Exception {
        JavaType type = MAPPER.getTypeFactory().constructCollectionType(List.class, elementType);
        return MAPPER.readValue(json, type);
    }

    public static void main(String[] args) throws Exception {
        List<Fare> fares = fromJsonList(JSON);                       // compiles, no warning
        System.out.println("size " + fares.size() + ", element class "
                + ((Object) fares.get(0)).getClass().getName());
        try {
            int total = 0;
            for (Fare f : fares) total += f.paise();                // the hidden cast to Fare
            System.out.println(total);
        } catch (ClassCastException e) {
            System.out.println("ClassCastException: " + e.getMessage().substring(0, 88) + "...");
        }

        List<Fare> typed = MAPPER.readValue(JSON, new TypeReference<List<Fare>>() { });
        System.out.println("TypeReference<List<Fare>>: " + typed.get(0));

        List<Fare> fixed = fromJsonList(JSON, Fare.class);
        System.out.println("constructCollectionType:   " + fixed.stream().mapToInt(Fare::paise).sum());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp $JACKSON FareFeed.java
java -cp $JACKSON:. FareFeed`,
        },
        {
          type: "output",
          text: `size 2, element class java.util.LinkedHashMap
ClassCastException: class java.util.LinkedHashMap cannot be cast to class FareFeed$Fare (java.util.LinkedHas...
TypeReference<List<Fare>>: Fare[zone=SALT-LAKE, paise=7000]
constructCollectionType:   15000`,
        },
        {
          type: "list",
          items: [
            "**What Jackson saw.** The anonymous `TypeReference` subclass is created inside `fromJsonList`, where the source says `List<T>`. Its Signature records `List<T>` with `T` a type variable, exactly like `erasedInside()` in the reflection section. Jackson can't resolve `T`, treats it as `Object`, and deserializes each JSON object into its default for an object: a `LinkedHashMap`.",
            "**Why nothing complained.** `readValue` returns `List<T>`, the caller assigns it to `List<Fare>`, and inference makes `T = Fare` at the call. No unchecked warning, because the generic types line up on paper. But the list holds `LinkedHashMap`s: heap pollution created by a library, without a raw type in sight. `size()` works; the first read as a `Fare` fails in the hidden `checkcast`.",
            "**Fix 1: a token at a concrete call site.** `new TypeReference<List<Fare>>() { }` written where the type is known records `List<Fare>`, and Jackson builds real `Fare` records.",
            "**Fix 2: keep the helper, pass the class.** `fromJsonList(json, Fare.class)` hands Jackson a `Class` object at run time, and `constructCollectionType(List.class, elementType)` builds the full `List<Fare>` type. Spring's `RestTemplate` and `WebClient` need the same thing: `ParameterizedTypeReference<List<Fare>>` at the call site.",
            "**The test lesson.** The helper's test checked `size()`, which works on polluted lists. A test that reads one element as its declared type (`fares.get(0).zone()`) fails immediately. For generic helpers, always test through the element type.",
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
              question: "Why isn't List<Integer> a subtype of List<Number>?",
              answer:
                "Because then code holding it as a `List<Number>` could add a `Double` to what is really a `List<Integer>`, and code reading it as integers would fail. Generics are **invariant** to prevent that at compile time. I forced the conversion with an unchecked cast in `WhyInvariant`: adding `2.5` worked, and reading it back as an `int` threw `ClassCastException`. Arrays are covariant instead and pay with a runtime check (`ArrayStoreException`), which generics can't do after erasure.",
            },
            {
              question: "What is a wildcard in generics?",
              answer:
                "`?`, an unknown type argument. `List<?>` is a list of some specific but unknown type. It can be bounded: `List<? extends Number>` (some subtype of `Number`) and `List<? super Integer>` (`Integer` or some supertype). Wildcards let a method accept a family of parameterized types that invariance would otherwise keep apart.",
            },
            {
              question: "What is the difference between <? extends T> and <? super T>?",
              answer:
                "`? extends T` accepts `T` and its subtypes, and lets me **read** elements as `T` but not add (except `null`). `? super T` accepts `T` and its supertypes, and lets me **add** `T`s but only read elements as `Object`. In my test, `total(List<? extends Number>)` accepted `List<Integer>` and `List<Double>`, and `addDefaultFares(List<? super Integer>)` accepted `List<Number>` and `List<Object>`.",
            },
            {
              question: "What does PECS stand for?",
              answer:
                "Producer Extends, Consumer Super, from Joshua Bloch's *Effective Java*. If a parameter produces values the method reads, declare it `? extends T`; if it consumes values the method writes, declare it `? super T`; if both, use `T`. `Collections.copy(List<? super T> dest, List<? extends T> src)` is the textbook example.",
            },
            {
              question: "What is the difference between List<?>, List<Object> and raw List?",
              answer:
                "`List<?>` accepts any parameterized list, is fully type-checked, and allows only `null` to be added. `List<Object>` accepts only a `List<Object>` (not a `List<String>`), and allows adding anything because its element type really is `Object`. Raw `List` accepts anything and allows adding anything, with type checking switched off and only warnings: that's how heap pollution happens.",
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
              question: "Why can't you add an Integer to a List<? extends Number>?",
              answer:
                "Because the list's real type might be `List<Double>`: the wildcard means \"some subtype of `Number`, unknown\". `javac` captures it as `CAP#1 extends Number`, and `add` needs a `CAP#1`; an `Integer` isn't known to be one. The error says exactly that: \"int cannot be converted to CAP#1\". Only `null` can be added. Reading is fine, because every `CAP#1` is a `Number`.",
            },
            {
              question: "Why does Collections.max use <T extends Object & Comparable<? super T>>?",
              answer:
                "Two reasons. `Comparable<? super T>` lets it work with classes that inherit `compareTo` from a supertype: my `SurgeFare extends Fare implements Comparable<Fare>` worked with that bound and failed with `Comparable<T>` (\"incompatible equality constraints Fare, SurgeFare\"). And `Object &` makes `Object` the first bound, so the method erases to `Object max(Collection)`, the same descriptor it had before generics, keeping old compiled code working. `javap -s` shows `(Ljava/util/Collection;)Ljava/lang/Object;`.",
            },
            {
              question: "What is wildcard capture, and what is a capture helper?",
              answer:
                "When an expression of a wildcard type is used, `javac` replaces the `?` with a fresh type variable (`CAP#1`) for that use. Two uses are two different captures, so `list.set(i, list.get(j))` on a `List<?>` fails. A capture helper is a private generic method `<T> void swapHelper(List<T> list, ...)`: calling it with the `List<?>` binds `T` to the capture, and inside it `get` and `set` agree on `T`. `Collections.swap(List<?>, int, int)` relies on the same idea.",
            },
            {
              question: "What is heap pollution?",
              answer:
                "A variable of a parameterized type pointing to an object that isn't of that type, such as a `List<String>` containing an `Integer`. It happens through raw types, unchecked casts, generic varargs, and libraries filling a list with the wrong type. The failure is a `ClassCastException` at a later read, where `javac` inserted a cast, not where the wrong element went in. `javac` warns about each possible source with \"unchecked\".",
            },
            {
              question: "What does @SafeVarargs mean, and when is it safe to use?",
              answer:
                "It's the method author's promise that a varargs method with a generic element type doesn't misuse the varargs array: it doesn't store values into it and doesn't let a reference to it escape. It removes the \"possible heap pollution\" warning for callers. It's allowed only on `static`, `final` and `private` methods and constructors. My `listOf(T...)` that only reads the array is safe; `toArray(T...)` that returns the array isn't, and called from generic code it produced an `Object[]` that failed as a `String[]`.",
            },
            {
              question: "Should a method return List<? extends Fare>?",
              answer:
                "Generally no. Wildcards are for parameters, to make methods accept more argument types. In a return type the wildcard is pushed onto every caller, who then can't add to the list and must declare their own variables with `? extends`. Return `List<Fare>`, unmodifiable if callers shouldn't change it.",
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
              question: "How are wildcards represented in the class file?",
              answer:
                "They're erased from method descriptors, which the JVM uses: `total(List<? extends Number>)`, `fill(List<? super Integer>)` and `count(List<?>)` all have `(Ljava/util/List;)` as their parameter descriptor. The Signature attribute keeps them as `List<+Ljava/lang/Number;>`, `List<-Ljava/lang/Integer;>` and `List<*>`: `+` for `extends`, `-` for `super`, `*` for unbounded. Reflection exposes them as `WildcardType` with `getUpperBounds()`/`getLowerBounds()`.",
            },
            {
              question: "If generic types are erased, how does Jackson deserialize into List<Fare>?",
              answer:
                "From declarations, which keep generic types in Signature attributes. `new TypeReference<List<Fare>>() { }` creates an anonymous subclass whose declared superclass is `TypeReference<List<Fare>>`; `getClass().getGenericSuperclass()` reads `List<Fare>` back. That's the super type token pattern, also used by Guava's `TypeToken` and Spring's `ParameterizedTypeReference`. Jackson can also read field types with `Field.getGenericType()`, or take a `JavaType` built from `Class` objects with its `TypeFactory`.",
            },
            {
              question: "Why does new TypeReference<List<T>>() {} inside a generic method fail?",
              answer:
                "The anonymous class's Signature records what's in the source at that point: `List<T>`, where `T` is the method's type variable. The caller's actual type argument only exists at the caller's compile time and is erased; it never reaches the anonymous class. Jackson sees an unresolved `T`, uses `Object`, and produces `LinkedHashMap`s. In my `FareFeed` test it compiled without warnings and failed with `ClassCastException` on the first read. The fix is a `Class<T>` parameter and `TypeFactory.constructCollectionType`.",
            },
            {
              question: "Compare Java's use-site variance with Kotlin's declaration-site variance.",
              answer:
                "In Java, variance is chosen at each use: every method parameter writes `? extends T` or `? super T`. In Kotlin, a class declares it once: `interface Source<out T>` means `Source<String>` is always a `Source<Any>`, and the compiler ensures the class only produces `T`. Kotlin also has use-site projections (`Array<out Any>`). Declaration-site variance removes most wildcard noise from APIs; Java's approach works with existing classes like `List` that both read and write `T`, at the cost of longer signatures like `Function<? super T, ? extends R>` everywhere.",
            },
            {
              question: "Can a List<String> ever contain an Integer at run time? How?",
              answer:
                "Yes, through heap pollution: a raw type (`((List) names).add(42)`), an unchecked cast (`(List<String>) (List<?>) ints`), a generic varargs array created as `Object[]`, or a library that deserializes into a different type than declared. The JVM itself doesn't stop it, because after erasure the list only holds `Object`s. It's discovered at the first compiler-inserted cast to `String`, which can be far away. `Collections.checkedList` moves detection to the insertion.",
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
              question: "A service calls a generic JSON helper and fails with \"LinkedHashMap cannot be cast to class Fare\", but the helper's own tests pass. What's wrong?",
              answer:
                "The helper almost certainly builds its type information inside a generic method, like `new TypeReference<List<T>>() { }`, so Jackson only sees `List<T>` and deserializes each element as a `LinkedHashMap`. The list's size is right, which is why a test checking only `size()` passes; the first read as a `Fare` fails in the hidden cast, as `FareFeed` showed.\n\nI'd change the helper to take a `Class<T>` (or a `JavaType`/`TypeReference` built by the caller) and use `getTypeFactory().constructCollectionType(List.class, elementType)`, and add a test that reads an element as its declared type. The same pattern applies to Spring's `RestTemplate`, which needs `ParameterizedTypeReference<List<Fare>>` at the call site.",
            },
            {
              question: "A utility method sum(List<Number> values) is used across the codebase, and every caller has to copy its List<Integer> into a new ArrayList<Number> first. How do you fix the API?",
              answer:
                "Change the parameter to `List<? extends Number>`, or better `Collection<? extends Number>`, since the method only reads. Then `List<Integer>`, `List<Double>`, `Set<Long>` and so on are all accepted directly, and the copies, with their allocation and boxing, can be deleted from the callers.\n\nIt's source-compatible for existing callers that pass a `List<Number>`, and binary-compatible because the erased descriptor stays `(Ljava/util/List;)`. I'd look for the same mistake in sibling methods: every read-only generic parameter of a shared utility should be `? extends`.",
            },
            {
              question: "You inherit a sort utility declared <T extends Comparable<T>> void sortAll(List<T> items). A new subclass DiscountedFare extends Fare (which is Comparable<Fare>) can't be sorted with it. What do you change?",
              answer:
                "The bound. `DiscountedFare` is a `Comparable<Fare>`, not a `Comparable<DiscountedFare>`, so `T extends Comparable<T>` fails (\"incompatible equality constraints\"), the same error as `ComparableStrict`. Changing it to `<T extends Comparable<? super T>>` accepts any class that can be compared with some supertype of itself, which is what `Collections.sort` and `List.sort` use.\n\nIt doesn't change the erasure, so existing callers aren't affected. I'd also consider offering an overload that takes a `Comparator<? super T>`, so callers can sort by fields other than the natural order.",
            },
            {
              question: "An event library lets you subscribe with Consumer<OrderPlaced>, and the team wants one generic audit logger for all event types. What signature makes that possible?",
              answer:
                "`<E extends Event> void subscribe(Class<E> type, Consumer<? super E> handler)`. With `Consumer<? super E>`, a single `Consumer<Object>` (or `Consumer<Event>`) audit handler can be registered for `OrderPlaced`, `OrderShipped` and every other event, while specific handlers still take `Consumer<OrderPlaced>`. My `EventBus` example registered one `Consumer<Object>` for two event types plus a typed `Consumer<TripEnded>`.\n\nWith plain `Consumer<E>`, the logger would need one lambda per event type. The `Class<E>` parameter lets the bus check each event's type at run time, because the handler map has to mix types.",
            },
            {
              question: "Code review: a helper is annotated @SafeVarargs and returns the varargs array. Is that OK?",
              answer:
                "No, it's exactly the case `@SafeVarargs` is not for. The varargs array is created by the caller, and when the caller is itself generic, that array is created with the erased type, usually `Object[]`. Returning it lets that `Object[]` reach code that expects a `String[]`, which fails with `ClassCastException`, as `pickTwo` did in `VarargsPollution`. The annotation would also silence the warning that points to the problem.\n\nI'd make it return a `List<T>` (`List.of(items)` copies safely) and then keep `@SafeVarargs`, since the method would only read the array.",
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
            "Write `static void printAll(List<Object> items)` and call it with a `List<String>`. Read the error, then change the parameter to `List<?>`.",
            "Write `static double average(Collection<? extends Number> c)` and call it with a `List<Integer>`, a `Set<Double>` and a `List<Long>`.",
            "Write `static void addZeros(List<? super Integer> l, int n)` and call it with a `List<Number>` and a `List<Object>`. Then try a `List<Double>`.",
            "Inside a method taking `List<? extends Number>`, try `list.add(1)` and read the `CAP#1` in the error.",
            "Write `swap(List<?> list, int i, int j)` directly, read the error, then add a private generic capture helper.",
            "Declare `static <T> T[] same(T... a) { return a; }` and call it from a generic method `static <T> T[] two(T x, T y) { return same(x, y); }` with `String[] s = two(\"a\", \"b\");`. Compile with `-Xlint:unchecked` and run.",
            "Create `new TypeRef<Map<String, List<Integer>>>() { }` with the `TypeRef` class from this lesson and print its `type`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 fails with \"List<String> cannot be converted to List<Object>\" and compiles with `List<?>`. Step 2 accepts all three collections. Step 3 accepts `List<Number>` and `List<Object>`, and rejects `List<Double>` because `Double` isn't a supertype of `Integer`. Step 4 says \"int cannot be converted to CAP#1\", with `CAP#1 extends Number`. Step 5 fails with \"Object cannot be converted to CAP#1\" until the helper names the type. Step 6 warns \"possible heap pollution\" and \"unchecked generic array creation\", then throws `ClassCastException`: `[Ljava.lang.Object;` cannot be cast to `[Ljava.lang.String;`. Step 7 prints `java.util.Map<java.lang.String, java.util.List<java.lang.Integer>>`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `INVARIANCE   List<Integer> is NOT a List<Number>
             (else: add a Double into a List<Integer> -> CCE later)
             arrays are covariant -> ArrayStoreException at run time

WILDCARDS    List<? extends Number>  read as Number, can't add   PRODUCER
             List<? super Integer>   add Integer, read as Object CONSUMER
             List<?>                 size/Object only, add null  ANY
             List<Object>            only a List<Object>!
             raw List                checks OFF

PECS         Producer Extends, Consumer Super; both -> plain T
             Function<? super T, ? extends R>, Comparator<? super T>
             <T extends Comparable<? super T>>   (subclass compareTo)
             no wildcards in return types

CLASS FILE   descriptor: (Ljava/util/List;) for all of them
             Signature:  List<+Number>  List<-Integer>  List<*>
             javac errors: CAP#1 = "the unknown type of this use"
             capture helper: private <T> void helper(List<T> l)

POLLUTION    List<String> holding an Integer: raw types, unchecked
             casts, generic varargs, libraries -> CCE at the READ
             Collections.checkedList catches the WRITE
             @SafeVarargs: only if the array isn't stored or leaked

RUN TIME     objects forget type args; declarations keep them
             Field.getGenericType(), getGenericSuperclass()
             super type token: new TypeRef<List<Fare>>() { }
             inside <T> method: List<T> -> Jackson -> LinkedHashMap`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Generic types are invariant because the alternative is unsound: a `List<Integer>` viewed as a `List<Number>` could be given a `Double`. Wildcards restore the safe half of variance: `? extends` to read, `? super` to write, chosen with PECS.",
            "Wildcards exist only for the compiler: they're `+`, `-` and `*` in the Signature attribute and nothing in the descriptors. Heap pollution is what happens when that compile-time checking is bypassed, and it always surfaces late, at a read.",
            "Erasure removes type arguments from objects, not from declarations, so frameworks read `List<Fare>` from fields, signatures and super type tokens, but never from inside a generic method's own `T`. With this lesson the Generics phase is complete. Next comes Enums: fixed sets of constants that are full classes, with fields, methods and their own `switch` support.",
          ],
        },
      ],
    },
  ],
};
