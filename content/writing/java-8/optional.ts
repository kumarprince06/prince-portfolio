import type { Lesson } from "../types";

export const optional: Lesson = {
  slug: "optional",
  date: "2026-10-29",
  title: "Optional",
  description:
    "Java 8's Optional as a return type that says \"there might be nothing here\": creating it, map/flatMap/filter chains, the orElse versus orElseGet trap, the Java 9 to 11 additions, OptionalInt and friends, how the class is built inside, and the ways people misuse it.",
  tags: ["Core Java", "Java 8", "Optional", "Null Safety", "Functional Programming"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "When I open a food delivery app, sometimes there's a coupon waiting for me and sometimes there isn't. A good app doesn't crash when there's no coupon. It just shows \"No coupon today\".",
        },
        {
          type: "paragraph",
          text: "`Optional` is like a gift box in Java: there may be one value inside, or nothing at all. A method that returns `Optional<String>` is telling me, right in its type, \"there might be nothing here, so plan for it\". Methods like `orElse` let me say what to use when the box is empty.",
        },
        {
          type: "paragraph",
          text: "I use it as the return type of methods that sometimes have no answer, like \"find the driver with this id\". It stops me from forgetting the empty case and getting a `NullPointerException` (the error Java throws when I use a missing value).",
        },
        {
          type: "code",
          language: "java",
          code: `Optional<String> coupon = Optional.empty();
System.out.println(coupon.orElse("No coupon today"));

Optional<String> festiveCoupon = Optional.of("DIWALI50");
System.out.println(festiveCoupon.orElse("No coupon today"));`,
        },
        {
          type: "output",
          text: `No coupon today
DIWALI50`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "`Optional` is a box that may be empty, and it makes me decide what happens when it is.",
        },
      ],
    },
    {
      title: "What Optional Is",
      blocks: [
        {
          type: "paragraph",
          text: "Every Java developer has met `NullPointerException`. Most of them come from one situation: a method that sometimes has nothing to give back returns `null`, and the caller forgets to check.",
        },
        {
          type: "paragraph",
          text: "`java.util.Optional<T>` is a small box that either holds exactly one non-null value or is empty. A method that returns `Optional<Driver>` instead of `Driver` is saying, in its signature, \"you might not get a driver, decide what to do about that\". The caller can't call `driver.name()` straight away. They have to open the box first.",
        },
        {
          type: "code",
          language: "java",
          title: "Basics.java",
          code: `import java.util.Optional;

public class Basics {
    public static void main(String[] args) {
        Optional<String> coupon = Optional.of("CHAI10");      // must not be null
        Optional<String> none   = Optional.empty();           // an empty box
        Optional<String> maybe  = Optional.ofNullable(null);  // null becomes empty

        System.out.println(coupon + " " + none + " " + maybe);
        System.out.println(coupon.isPresent() + " " + none.isPresent());
        coupon.ifPresent(c -> System.out.println("apply " + c));
        none.ifPresent(c -> System.out.println("never printed"));
        System.out.println(none.orElse("NO-COUPON"));

        try {
            Optional.of(null);
        } catch (NullPointerException e) {
            System.out.println("Optional.of(null) -> NullPointerException");
        }
        try {
            none.get();
        } catch (Exception e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `Optional[CHAI10] Optional.empty Optional.empty
true false
apply CHAI10
NO-COUPON
Optional.of(null) -> NullPointerException
java.util.NoSuchElementException: No value present`,
        },
        {
          type: "paragraph",
          text: "Two things to notice already. `Optional.of(null)` fails immediately, so `of` is for values I know are there. And `get()` on an empty box doesn't return `null`, it throws. Optional doesn't make the \"nothing\" case go away. It makes it visible.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Tony Hoare, who added null references to ALGOL W in 1965, later called them his \"billion-dollar mistake\". Other languages had already found a different way to say \"maybe no value\": Haskell's `Maybe`, ML's and Scala's `Option`. In Java, Google's Guava library shipped its own `Optional` around 2011, and a lot of teams were using it before Java had one.",
        },
        {
          type: "paragraph",
          text: "Java 8 (2014) added `java.util.Optional` together with streams, and that's the real reason it exists. Stream operations like `findFirst()`, `max()` and `reduce()` need to say \"the stream was empty\", and returning `null` from a fluent chain would have been miserable.",
        },
        {
          type: "paragraph",
          text: "So `Optional` was designed with a deliberately narrow goal. Its own Javadoc says it's \"primarily intended for use as a method return type where there is a clear need to represent 'no result'\", and that a variable of type `Optional` should never itself be `null`.",
        },
        {
          type: "paragraph",
          text: "It kept growing after Java 8:",
        },
        {
          type: "table",
          headers: ["Version", "Added"],
          rows: [
            ["8", "`of`, `ofNullable`, `empty`, `isPresent`, `ifPresent`, `get`, `orElse`, `orElseGet`, `orElseThrow(Supplier)`, `map`, `flatMap`, `filter`, plus `OptionalInt`, `OptionalLong`, `OptionalDouble`"],
            ["9", "`ifPresentOrElse`, `or`, `stream`"],
            ["10", "`orElseThrow()` with no arguments, a clearer name for `get()`"],
            ["11", "`isEmpty`"],
            ["16", "Marked with the internal `@ValueBased` annotation, so `javac` warns about synchronizing on it"],
          ],
        },
        {
          type: "paragraph",
          text: "My old notes said Optional \"removes NullPointerException from Java\". It doesn't. It only covers the values that are wrapped in it, and it's one tool among several (validation, `Objects.requireNonNull`, non-null defaults like empty lists).",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of `Optional` as a **food delivery bag**.",
        },
        {
          type: "list",
          items: [
            "The restaurant always hands the rider a bag. Sometimes there's a biryani inside, sometimes the order got cancelled and the bag is empty. But there is always a bag. (A method returning `Optional` must never return `null` itself.)",
            "Before Java 8, the restaurant sometimes handed over a bag and sometimes handed over nothing at all, and the rider only found out when they reached into thin air. That's `null`.",
            "With a bag, the rider can say \"if there's food, deliver it\" (`ifPresent`), \"if there's food, put it in a box first\" (`map`), \"if it's empty, grab a sandwich from the counter\" (`orElse`), or \"if it's empty, phone the customer\" (`orElseThrow`).",
            "Ripping the bag open without looking (`get()`) is how you end up surprised in front of a customer.",
          ],
        },
        {
          type: "paragraph",
          text: "The analogy also explains the misuses. You don't keep a delivery bag as a permanent shelf in the kitchen (an `Optional` field), and you don't hand the chef an empty bag as an ingredient (an `Optional` parameter). It's for handing a result over, once.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/optional-box.svg",
          alt: "Optional shown as a box: a full box holding Ravi goes through map, filter and orElse and gives RAVI; an empty box skips map and filter and orElse gives No driver; note that orElse always evaluates its argument while orElseGet only calls it when empty",
          caption: "A full Optional runs each step and an empty one skips them; `orElse` always evaluates its argument, `orElseGet` only when the box is empty.",
        },
        {
          type: "heading",
          text: "Creating one",
        },
        {
          type: "table",
          headers: ["Method", "Use when", "With null"],
          rows: [
            ["`Optional.of(v)`", "I know `v` is not null", "Throws `NullPointerException` right away"],
            ["`Optional.ofNullable(v)`", "`v` might be null, for example from a `Map.get`", "Returns an empty Optional"],
            ["`Optional.empty()`", "There's definitely nothing", "Not applicable"],
          ],
        },
        {
          type: "heading",
          text: "Getting the value out",
        },
        {
          type: "table",
          headers: ["Method", "If present", "If empty"],
          rows: [
            ["`orElse(other)`", "The value", "`other`, which was **always** computed before the call"],
            ["`orElseGet(supplier)`", "The value", "Calls `supplier` and returns its result"],
            ["`orElseThrow()` (10)", "The value", "`NoSuchElementException`"],
            ["`orElseThrow(supplier)`", "The value", "Throws the exception the supplier makes"],
            ["`get()`", "The value", "`NoSuchElementException`. Same as `orElseThrow()`, worse name"],
            ["`ifPresent(action)`", "Runs `action`", "Does nothing"],
            ["`ifPresentOrElse(action, empty)` (9)", "Runs `action`", "Runs `empty`"],
          ],
        },
        {
          type: "heading",
          text: "Transforming without opening the box",
        },
        {
          type: "list",
          items: [
            "`map(f)`: if present, apply `f` and wrap the result. If `f` returns `null`, the result is empty, not a box holding `null`.",
            "`flatMap(f)`: for when `f` itself returns an `Optional`. It doesn't wrap again, so I get `Optional<Wallet>`, not `Optional<Optional<Wallet>>`.",
            "`filter(p)`: keep the value only if it passes the test, otherwise empty.",
            "`or(supplier)` (9): if empty, use another `Optional`. Like `orElseGet`, but the fallback can also be empty.",
            "`stream()` (9): a stream of zero or one element. Handy for flattening a list of Optionals.",
          ],
        },
        {
          type: "paragraph",
          text: "Every one of these returns a new `Optional` and leaves the original alone. On an empty Optional, `map`, `flatMap` and `filter` don't call the function at all, they just pass the empty box along. That's what makes a chain safe: the first empty step turns the rest of the chain into no-ops.",
        },
        {
          type: "heading",
          text: "Primitive versions",
        },
        {
          type: "paragraph",
          text: "`OptionalInt`, `OptionalLong` and `OptionalDouble` hold a primitive directly, so there's no boxing. They're what `IntStream.max()` or `average()` return. They're much smaller APIs: `getAsInt()`, `orElse`, `orElseGet`, `orElseThrow`, `ifPresent`, `isPresent`, plus `ifPresentOrElse` and `stream` in 9 and `isEmpty` in 11. There's no `map`, `flatMap` or `filter` on them.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "I expected `Optional` to be something clever. It turned out to be one of the simplest classes in the JDK, and that simplicity explains most of its rules. My JDK 21 install has no `src.zip`, so instead of reading the source I read the compiled class with `javap`:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.util.Optional`,
        },
        {
          type: "output",
          text: `Compiled from "Optional.java"
public final class java.util.Optional<T> {
  private static final java.util.Optional<?> EMPTY;
  private final T value;
  public static <T> java.util.Optional<T> empty();
  private java.util.Optional(T);
  public static <T> java.util.Optional<T> of(T);
  public static <T> java.util.Optional<T> ofNullable(T);
  public T get();
  public boolean isPresent();
  public boolean isEmpty();
  public void ifPresent(java.util.function.Consumer<? super T>);
  public void ifPresentOrElse(java.util.function.Consumer<? super T>, java.lang.Runnable);
  public java.util.Optional<T> filter(java.util.function.Predicate<? super T>);
  public <U> java.util.Optional<U> map(java.util.function.Function<? super T, ? extends U>);
  public <U> java.util.Optional<U> flatMap(java.util.function.Function<? super T, ? extends java.util.Optional<? extends U>>);
  public java.util.Optional<T> or(java.util.function.Supplier<? extends java.util.Optional<? extends T>>);
  public java.util.stream.Stream<T> stream();
  public T orElse(T);
  public T orElseGet(java.util.function.Supplier<? extends T>);
  public T orElseThrow();
  public <X extends java.lang.Throwable> T orElseThrow(java.util.function.Supplier<? extends X>) throws X;
  public boolean equals(java.lang.Object);
  public int hashCode();
  public java.lang.String toString();
  static {};
}`,
        },
        {
          type: "list",
          items: [
            "`final class`: nobody can subclass it. No `Some`/`None` subclasses like in Scala.",
            "**One field**, `private final T value`. Empty means `value == null`. That's the whole representation. The `final` makes it immutable and safe to share between threads.",
            "`private` constructor: the only way in is through `of`, `ofNullable` and `empty`.",
            "`EMPTY`: a single shared empty instance, created once in the static initializer.",
            "No `implements Serializable`. That's deliberate, and it matters for fields, as I show below.",
          ],
        },
        {
          type: "heading",
          text: "The bytecode of the important methods",
        },
        {
          type: "paragraph",
          text: "From `javap -c -p java.util.Optional`, trimmed to the methods worth reading. First, how `EMPTY` is made and how `empty()` and `ofNullable()` use it:",
        },
        {
          type: "output",
          text: `  static {};
    Code:
       0: new           #2                  // class java/util/Optional
       3: dup
       4: aconst_null
       5: invokespecial #23                 // Method "<init>":(Ljava/lang/Object;)V
       8: putstatic     #1                  // Field EMPTY:Ljava/util/Optional;
      11: return

  public static <T> java.util.Optional<T> empty();
    Code:
       0: getstatic     #1                  // Field EMPTY:Ljava/util/Optional;
       3: astore_0
       4: aload_0
       5: areturn

  public static <T> java.util.Optional<T> ofNullable(T);
    Code:
       0: aload_0
       1: ifnonnull     10
       4: getstatic     #1                  // Field EMPTY:Ljava/util/Optional;
       7: goto          18
      10: new           #2                  // class java/util/Optional
      13: dup
      14: aload_0
      15: invokespecial #23                 // Method "<init>":(Ljava/lang/Object;)V
      18: areturn`,
        },
        {
          type: "paragraph",
          text: "`EMPTY` is literally `new Optional(null)`. `empty()` just returns that one object, so it never allocates. `ofNullable` returns `EMPTY` for `null` and allocates a new box only when there's a value. Then `map`:",
        },
        {
          type: "output",
          text: `  public <U> java.util.Optional<U> map(java.util.function.Function<? super T, ? extends U>);
    Code:
       0: aload_1
       1: invokestatic  #17                 // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
       4: pop
       5: aload_0
       6: invokevirtual #43                 // Method isEmpty:()Z
       9: ifeq          16
      12: invokestatic  #53                 // Method empty:()Ljava/util/Optional;
      15: areturn
      16: aload_1
      17: aload_0
      18: getfield      #13                 // Field value:Ljava/lang/Object;
      21: invokeinterface #57,  2           // InterfaceMethod java/util/function/Function.apply:(Ljava/lang/Object;)Ljava/lang/Object;
      26: invokestatic  #62                 // Method ofNullable:(Ljava/lang/Object;)Ljava/util/Optional;
      29: areturn`,
        },
        {
          type: "paragraph",
          text: "In Java, that's roughly `if (isEmpty()) return empty(); return ofNullable(mapper.apply(value));`. Three facts fall straight out of it:",
        },
        {
          type: "list",
          items: [
            "The function is checked for null first, even on an empty Optional.",
            "On an empty Optional, the function is never called.",
            "The result goes through `ofNullable`, which is why a function that returns `null` gives an empty Optional instead of crashing.",
          ],
        },
        {
          type: "paragraph",
          text: "And the pair that causes the most bugs, `orElse` and `orElseGet`:",
        },
        {
          type: "output",
          text: `  public T orElse(T);
    Code:
       0: aload_0
       1: getfield      #13                 // Field value:Ljava/lang/Object;
       4: ifnull        14
       7: aload_0
       8: getfield      #13                 // Field value:Ljava/lang/Object;
      11: goto          15
      14: aload_1
      15: areturn

  public T orElseGet(java.util.function.Supplier<? extends T>);
    Code:
       0: aload_0
       1: getfield      #13                 // Field value:Ljava/lang/Object;
       4: ifnull        14
       7: aload_0
       8: getfield      #13                 // Field value:Ljava/lang/Object;
      11: goto          20
      14: aload_1
      15: invokeinterface #69,  1           // InterfaceMethod java/util/function/Supplier.get:()Ljava/lang/Object;
      20: areturn`,
        },
        {
          type: "paragraph",
          text: "`orElse` receives the fallback as an already-computed argument (`aload_1`) and just returns it. `orElseGet` receives a `Supplier` and calls `Supplier.get` only on the empty branch. The difference isn't in `Optional` at all, it's in Java's rule that arguments are evaluated before a method is called. I compiled a caller to see it:",
        },
        {
          type: "code",
          language: "java",
          title: "OrElseTrap.java",
          code: `import java.util.Optional;

public class OrElseTrap {
    static String callBackupApi() {
        System.out.println("  (backup API called)");
        return "backup-driver";
    }

    public static void main(String[] args) {
        Optional<String> nearby = Optional.of("Ravi");

        System.out.println("orElse:");
        System.out.println(nearby.orElse(callBackupApi()));

        System.out.println("orElseGet:");
        System.out.println(nearby.orElseGet(() -> callBackupApi()));

        System.out.println("orElseGet, empty:");
        System.out.println(Optional.<String>empty().orElseGet(OrElseTrap::callBackupApi));
    }
}`,
        },
        {
          type: "output",
          text: `orElse:
  (backup API called)
Ravi
orElseGet:
Ravi
orElseGet, empty:
  (backup API called)
backup-driver`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c OrElseTrap | sed -n '/main/,$p' | grep -E "invoke|ldc"`,
        },
        {
          type: "output",
          text: `      18: invokestatic  #33                 // Method callBackupApi:()Ljava/lang/String;
      21: invokevirtual #39                 // Method java/util/Optional.orElse:(Ljava/lang/Object;)Ljava/lang/Object;
      ...
      42: invokedynamic #47,  0             // InvokeDynamic #0:get:()Ljava/util/function/Supplier;
      47: invokevirtual #51                 // Method java/util/Optional.orElseGet:(Ljava/util/function/Supplier;)Ljava/lang/Object;`,
        },
        {
          type: "paragraph",
          text: "(Trimmed to the two calls that matter.) There it is in two lines. For `orElse`, `callBackupApi()` runs at offset 18, **before** `orElse` is even called, even though Ravi was there. For `orElseGet`, the call site only builds a `Supplier` with `invokedynamic` (cheap, no API call) and hands it over.",
        },
        {
          type: "heading",
          text: "A value-based class",
        },
        {
          type: "paragraph",
          text: "The Javadoc calls `Optional` a **value-based class**: it's final and immutable, `equals` compares contents, and code must not care about object identity. Two equal Optionals may or may not be the same object, and the JDK is free to change which. I tested identity:",
        },
        {
          type: "code",
          language: "java",
          title: "Identity.java",
          code: `import java.util.Optional;

public class Identity {
    public static void main(String[] args) {
        System.out.println(Optional.empty() == Optional.empty());           // one shared EMPTY
        System.out.println(Optional.ofNullable(null) == Optional.empty());
        System.out.println(Optional.of("tea") == Optional.of("tea"));       // two new boxes
        System.out.println(Optional.of("tea").equals(Optional.of("tea")));  // compare contents
    }
}`,
        },
        {
          type: "output",
          text: `true
true
false
true`,
        },
        {
          type: "paragraph",
          text: "The first two are `true` only because of the `EMPTY` singleton, an implementation detail. The rule is: always use `equals`, never `==`, and never lock on one. Since Java 16 the class carries `@jdk.internal.ValueBased` (visible in `javap -v` as a `RuntimeVisibleAnnotations` entry), and `javac` warns:",
        },
        {
          type: "code",
          language: "java",
          title: "SyncOnOptional.java",
          code: `import java.util.Optional;

public class SyncOnOptional {
    static final Optional<String> LOCK = Optional.of("lock");

    public static void main(String[] args) {
        synchronized (LOCK) {
            System.out.println("inside");
        }
    }
}`,
        },
        {
          type: "output",
          text: `SyncOnOptional.java:7: warning: [synchronization] attempt to synchronize on an instance of a value-based class
        synchronized (LOCK) {
        ^
1 warning`,
        },
        {
          type: "paragraph",
          text: "The reason for all this caution is Project Valhalla. The plan is for value-based classes like `Optional` to become true value classes one day, with no identity at all, so the JVM can store them flat without a separate heap object. Code that uses `==` or `synchronized` on them would break, so the JDK is warning early.",
        },
        {
          type: "heading",
          text: "What it costs",
        },
        {
          type: "paragraph",
          text: "A present `Optional` is one extra small object: an object header plus one reference. On a 64-bit HotSpot with compressed pointers that's typically 16 bytes. An empty one costs nothing, it's the shared `EMPTY`. When an Optional is created and consumed inside one method after inlining (the usual `find(...).map(...).orElse(...)` chain), the JIT's escape analysis can often remove the allocation completely. When it's stored in a field or a collection, it can't.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "the everyday shapes",
          code: `// Returning one
Optional<Driver> findNearest(Location at) {
    Driver d = repo.nearest(at);          // may be null
    return Optional.ofNullable(d);
}

// Using one
String name = findNearest(here)
        .filter(Driver::isOnline)
        .map(Driver::name)
        .orElse("No driver nearby");

findNearest(here).ifPresent(dispatcher::assign);

Driver d = findNearest(here)
        .orElseThrow(() -> new NoDriverException(here));

// Java 9+
findNearest(here).ifPresentOrElse(dispatcher::assign, () -> queue.add(request));
Optional<Driver> any = findNearest(here).or(() -> findInNextZone(here));
List<Driver> found = ids.stream().map(this::findById).flatMap(Optional::stream).toList();`,
        },
        {
          type: "paragraph",
          text: "(That's a fragment with made-up types, so there's no output.) The shape is always the same: produce an Optional at the edge where \"nothing\" can happen, transform it with `map`/`flatMap`/`filter`, and close it with exactly one `orElse...` or `ifPresent...` at the end.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A chain: can this rider pay from their wallet?",
        },
        {
          type: "paragraph",
          text: "Everyday version: the cab app checks, step by step, \"is this a known rider? do they have a wallet? does it have at least Rs 100?\". If any step says no, the answer is \"collect cash\". In plain `if` checks that's three nested null checks. With Optional, each \"no\" just turns the rest of the chain off:",
        },
        {
          type: "code",
          language: "java",
          title: "Chain.java",
          code: `import java.util.Map;
import java.util.Optional;

public class Chain {
    record Rider(String name, String phone) { }

    static final Map<String, Rider> RIDERS = Map.of("111", new Rider("Asha", "111"), "222", new Rider("Ravi", "222"));
    static final Map<String, Integer> WALLETS = Map.of("111", 250);   // Ravi has no wallet

    static Optional<Rider> findRider(String phone)    { return Optional.ofNullable(RIDERS.get(phone)); }
    static Optional<Integer> walletOf(Rider rider)     { return Optional.ofNullable(WALLETS.get(rider.phone())); }

    static String paymentFor(String phone) {
        return findRider(phone)
                .flatMap(Chain::walletOf)            // Rider -> Optional<Integer>, not nested
                .filter(balance -> balance >= 100)   // keep it only if it covers the ride
                .map(balance -> "wallet, balance " + balance)
                .orElse("cash");
    }

    public static void main(String[] args) {
        System.out.println(paymentFor("111"));
        System.out.println(paymentFor("222"));
        System.out.println(paymentFor("999"));
        System.out.println(findRider("111").map(Chain::walletOf));   // map would nest
    }
}`,
        },
        {
          type: "output",
          text: `wallet, balance 250
cash
cash
Optional[Optional[250]]`,
        },
        {
          type: "list",
          items: [
            "Asha: rider found, wallet found, 250 passes the filter, so the `map` builds the text.",
            "Ravi: rider found, but `walletOf` returns empty, so `filter` and `map` are skipped and `orElse` gives `cash`.",
            "Unknown phone `999`: empty from the very first step.",
            "The last line shows why `flatMap` exists. `map` with a function that already returns an Optional gives a box inside a box.",
          ],
        },
        {
          type: "heading",
          text: "map with a function that returns null",
        },
        {
          type: "code",
          language: "java",
          title: "MapNull.java",
          code: `import java.util.Map;
import java.util.Optional;

public class MapNull {
    public static void main(String[] args) {
        Map<String, String> drivers = Map.of("D1", "Asha");
        Optional<String> id = Optional.of("D2");
        System.out.println(id.map(drivers::get));             // get returns null -> empty
        System.out.println(id.map(drivers::get).isPresent());
    }
}`,
        },
        {
          type: "output",
          text: `Optional.empty
false`,
        },
        {
          type: "paragraph",
          text: "That's the `ofNullable` at the end of `map`'s bytecode. It's convenient: old APIs that return `null` slot straight into a chain.",
        },
        {
          type: "heading",
          text: "The Java 9, 10 and 11 additions",
        },
        {
          type: "code",
          language: "java",
          title: "Newer.java",
          code: `import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

public class Newer {
    static Optional<String> fromCache(String id) { return Optional.empty(); }
    static Optional<String> fromDb(String id)    { return Optional.of("Asha (from db)"); }

    public static void main(String[] args) {
        Optional<String> driver = Optional.empty();

        driver.ifPresentOrElse(                                   // Java 9
                d -> System.out.println("assigned " + d),
                () -> System.out.println("no driver yet, keep searching"));

        System.out.println(fromCache("7").or(() -> fromDb("7")).get());   // Java 9

        List<Optional<String>> promos = List.of(Optional.of("CHAI10"), Optional.empty(), Optional.of("RAIN20"));
        System.out.println(promos.stream().flatMap(Optional::stream)       // Java 9
                                 .collect(Collectors.toList()));

        System.out.println(driver.isEmpty());                              // Java 11
        try {
            driver.orElseThrow();                                          // Java 10
        } catch (Exception e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `no driver yet, keep searching
Asha (from db)
[CHAI10, RAIN20]
true
java.util.NoSuchElementException: No value present`,
        },
        {
          type: "list",
          items: [
            "`ifPresentOrElse` finally gave Optional an \"else\" branch. In Java 8 people wrote `if (o.isPresent()) ... else ...`, which defeats the point.",
            "`or` is the \"check the cache, then the database\" pattern. The database lookup only runs if the cache was empty, and the result is still an Optional.",
            "`Optional::stream` turns each box into a stream of zero or one elements, so `flatMap` drops the empty ones. In Java 8 this needed `filter(Optional::isPresent).map(Optional::get)`.",
            "`orElseThrow()` does exactly what `get()` does. It was added because `get()` sounds safe and isn't.",
          ],
        },
        {
          type: "heading",
          text: "OptionalInt and friends",
        },
        {
          type: "code",
          language: "java",
          title: "Primitive.java",
          code: `import java.util.OptionalDouble;
import java.util.OptionalInt;
import java.util.stream.IntStream;

public class Primitive {
    public static void main(String[] args) {
        int[] todaysFares = {120, 340, 90};
        int[] noRides = {};

        OptionalInt best = IntStream.of(todaysFares).max();
        OptionalDouble avg = IntStream.of(noRides).average();

        System.out.println(best + " -> " + best.getAsInt());
        System.out.println(avg + " -> " + avg.orElse(0.0));
        System.out.println(IntStream.of(noRides).sum());   // sum has a natural "zero"
    }
}`,
        },
        {
          type: "output",
          text: `OptionalInt[340] -> 340
OptionalDouble.empty -> 0.0
0`,
        },
        {
          type: "paragraph",
          text: "`max` and `average` of no rides have no sensible answer, so they return an empty `OptionalInt`/`OptionalDouble`. `sum` does have one, zero, so it returns a plain `int`. That's the design rule in miniature: Optional is for \"there may be no answer\", not for every value.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Returning null from a method that returns Optional",
        },
        {
          type: "code",
          language: "java",
          title: "NullOptional.java",
          code: `import java.util.Optional;

public class NullOptional {
    static Optional<String> findCoupon(String user) {
        return null;                                // the one thing an Optional method must never do
    }

    public static void main(String[] args) {
        System.out.println(findCoupon("asha").orElse("none"));
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "java.util.Optional.orElse(Object)" because the return value of "NullOptional.findCoupon(String)" is null
	at NullOptional.main(NullOptional.java:9)`,
        },
        {
          type: "paragraph",
          text: "Worse than returning a plain `null`, because the signature promised the caller they didn't need a null check. Return `Optional.empty()`.",
        },
        {
          type: "heading",
          text: "Calling get() without checking",
        },
        {
          type: "paragraph",
          text: "`none.get()` in the first example threw `NoSuchElementException: No value present`. `opt.get()` with no check is just a `NullPointerException` with a different name. And `if (opt.isPresent()) { use(opt.get()); }` works, but it's the old null check with extra steps. Prefer `map`, `ifPresent`, `orElse...`, or `orElseThrow` with a meaningful exception.",
        },
        {
          type: "heading",
          text: "orElse with an expensive or side-effecting fallback",
        },
        {
          type: "paragraph",
          text: "`OrElseTrap` showed the backup API being called even though a driver was found. With a database call, a remote API, or `orElse(createDefaultUser())` that **inserts a row**, this is a real bug, not just wasted time. Rule: `orElse` for constants and already-computed values, `orElseGet` for anything that does work.",
        },
        {
          type: "heading",
          text: "Optional fields",
        },
        {
          type: "code",
          language: "java",
          title: "NotSerializable.java",
          code: `import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.Optional;

public class NotSerializable {
    record Booking(String id, Optional<String> promo) implements Serializable { }

    public static void main(String[] args) throws Exception {
        try (ObjectOutputStream out = new ObjectOutputStream(new ByteArrayOutputStream())) {
            out.writeObject(new Booking("B-101", Optional.of("CHAI10")));
        } catch (Exception e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `java.io.NotSerializableException: java.util.Optional`,
        },
        {
          type: "paragraph",
          text: "`Optional` isn't `Serializable` on purpose, and JPA doesn't map `Optional` fields to columns either. An Optional field also costs an extra object per instance and can itself be `null`. Keep the field as a plain nullable `String promo`, and expose `Optional<String> promo()` from the getter if callers benefit.",
        },
        {
          type: "heading",
          text: "Optional parameters",
        },
        {
          type: "code",
          language: "java",
          code: `// Awkward: every caller wraps, and someone will still pass null
Fare quote(String from, String to, Optional<String> promo) { ... }
quote("Park St", "Airport", Optional.empty());

// Clearer: an overload, or a nullable parameter documented as optional
Fare quote(String from, String to) { return quote(from, to, null); }
Fare quote(String from, String to, String promoOrNull) { ... }`,
        },
        {
          type: "paragraph",
          text: "An `Optional` parameter doesn't protect anything. The method still has to handle `promo == null`, and now also `promo.isEmpty()`. Inside a method, `Optional.ofNullable(promoOrNull)` is a fine way to start a chain.",
        },
        {
          type: "heading",
          text: "Optional in collections, or an Optional collection",
        },
        {
          type: "paragraph",
          text: "`List<Optional<Order>>` and `Optional<List<Order>>` are both smells. For a list, \"nothing\" is the empty list, which is already safe to loop over. Return `List.of()`, not `Optional.empty()`. A list of Optionals should be flattened with `flatMap(Optional::stream)` as early as possible.",
        },
        {
          type: "heading",
          text: "findFirst on a stream that contains null",
        },
        {
          type: "code",
          language: "java",
          title: "FindFirstNull.java",
          code: `import java.util.Arrays;
import java.util.List;

public class FindFirstNull {
    public static void main(String[] args) {
        List<String> seats = Arrays.asList(null, "A2", "A3");   // seat A1 is unassigned
        System.out.println(seats.stream().findFirst());
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.NullPointerException
	at java.base/java.util.Objects.requireNonNull(Objects.java:233)
	at java.base/java.util.Optional.of(Optional.java:113)
	at java.base/java.util.stream.FindOps$FindSink$OfRef.get(FindOps.java:194)
	at java.base/java.util.stream.FindOps$FindSink$OfRef.get(FindOps.java:191)
	at java.base/java.util.stream.FindOps$FindOp.evaluateSequential(FindOps.java:150)
	at java.base/java.util.stream.AbstractPipeline.evaluate(AbstractPipeline.java:234)
	at java.base/java.util.stream.ReferencePipeline.findFirst(ReferencePipeline.java:647)
	at FindFirstNull.main(FindFirstNull.java:7)`,
        },
        {
          type: "paragraph",
          text: "An Optional can't hold `null`, so a stream can't report \"the first element was null\". `findFirst` uses `Optional.of`, which is visible in the trace. Filter nulls out first with `filter(Objects::nonNull)`.",
        },
        {
          type: "heading",
          text: "Comparing Optionals with ==",
        },
        {
          type: "paragraph",
          text: "`Optional.of(\"tea\") == Optional.of(\"tea\")` was `false` in `Identity`. Use `equals`, which compares the values inside.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use `Optional` as a **return type** for lookups that can legitimately find nothing: `findById`, `findByCode`, `nearestDriver`. Spring Data repositories already do this.",
            "Never return `null` from an Optional-returning method, and never let an Optional variable be `null`.",
            "Don't use it for fields, parameters, collections or map values. Use nullable fields, overloads, and empty collections.",
            "End every chain with one clear terminal: `orElse` for a constant, `orElseGet` for computed fallbacks, `orElseThrow(() -> new SomethingNotFound(id))` when absence is an error.",
            "Prefer `orElseThrow()` over `get()` when I really know the value is there. It says \"this can throw\" in its name.",
            "Use `ofNullable` at the boundary with old APIs that return `null` (`Map.get`, legacy DAOs), and `of` when null would be a bug that should fail fast.",
            "Don't turn every null check into an Optional chain. `if (driver != null)` on a local variable is fine. Optional earns its place in method signatures.",
            "Use `OptionalInt`/`OptionalLong`/`OptionalDouble` with primitive streams instead of `Optional<Integer>`, to avoid boxing.",
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
            "An empty Optional is free: `empty()` and `ofNullable(null)` return the shared `EMPTY` instance, as the bytecode showed.",
            "A present Optional is one small allocation. For a lookup that also hits a database or a map, that's noise.",
            "Short-lived Optionals in a hot method are often removed entirely by escape analysis once the chain is inlined. Optionals stored in fields or collections can't be, which is one more reason not to store them.",
            "Every `map`/`filter` step allocates a new Optional and calls a lambda. Inside a very tight loop over millions of primitives, a plain `if` or an `OptionalInt` is cheaper. In ordinary service code it doesn't matter.",
            "The `orElse` trap is the real performance bug: computing a fallback that's thrown away, possibly a network call, on every request.",
          ],
        },
      ],
    },
    {
      title: "Optional in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Everyday version first. A rider types a promo code at checkout. It might be blank, it might have spaces or lowercase letters, it might not exist, and if it does exist the discount is capped. Whatever happens, the app must show a fare. That's a chain of \"maybe\" steps with one safe fallback at the end, which is exactly what Optional is good at.",
        },
        {
          type: "paragraph",
          text: "This is the kind of fare code a ride-booking backend like my RideX project needs. It's plain Java so it runs on its own, with comments where Spring would come in:",
        },
        {
          type: "code",
          language: "java",
          title: "FareDemo.java",
          code: `import java.util.Map;
import java.util.Optional;

record Promo(String code, int percentOff, int maxOff) { }

// In Spring this would be a JpaRepository: Optional<Promo> findByCode(String code)
class PromoRepository {
    private final Map<String, Promo> table = Map.of(
            "CHAI10", new Promo("CHAI10", 10, 30),
            "RAIN50", new Promo("RAIN50", 50, 100));

    Optional<Promo> findByCode(String code) {
        return Optional.ofNullable(table.get(code));
    }
}

// @Service
class FareService {
    private final PromoRepository promos;

    FareService(PromoRepository promos) { this.promos = promos; }

    int finalFare(int baseFare, String promoCode) {          // promoCode may be null
        int discount = Optional.ofNullable(promoCode)
                .map(String::trim)
                .map(String::toUpperCase)
                .flatMap(promos::findByCode)
                .map(p -> Math.min(baseFare * p.percentOff() / 100, p.maxOff()))
                .orElse(0);
        return baseFare - discount;
    }

    Promo requirePromo(String code) {                         // for the admin screen
        return promos.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Unknown promo: " + code));
    }
}

public class FareDemo {
    public static void main(String[] args) {
        FareService fares = new FareService(new PromoRepository());
        System.out.println(fares.finalFare(240, " chai10 "));
        System.out.println(fares.finalFare(240, "RAIN50"));
        System.out.println(fares.finalFare(240, "BADCODE"));
        System.out.println(fares.finalFare(240, null));
        System.out.println(fares.requirePromo("RAIN50"));
        System.out.println(fares.requirePromo("FREE100"));
    }
}`,
        },
        {
          type: "output",
          text: `216
140
240
240
Promo[code=RAIN50, percentOff=50, maxOff=100]
Exception in thread "main" java.lang.IllegalArgumentException: Unknown promo: FREE100
	at FareService.lambda$requirePromo$1(FareDemo.java:35)
	at java.base/java.util.Optional.orElseThrow(Optional.java:403)
	at FareService.requirePromo(FareDemo.java:35)
	at FareDemo.main(FareDemo.java:47)`,
        },
        {
          type: "list",
          items: [
            "`\" chai10 \"`: trimmed and uppercased into `CHAI10`, found, 10% of 240 is 24, under the cap of 30. Fare 216.",
            "`RAIN50`: 50% of 240 is 120, capped at 100. Fare 140.",
            "`BADCODE` and `null`: the chain goes empty (at `findByCode` and at `ofNullable` respectively), and `orElse(0)` means no discount. The rider still gets a fare.",
            "`orElse(0)` is right here because `0` is a constant. If the fallback were \"look up today's surge discount\", it would be `orElseGet`.",
            "`requirePromo` is the other style: on the admin screen an unknown code is an error, so `orElseThrow` turns absence into an exception with a useful message. In a Spring app that would be a custom `PromoNotFoundException` mapped to HTTP 404.",
            "The stack trace shows the exception being created inside the lambda (`lambda$requirePromo$1`) and thrown by `Optional.orElseThrow`. The supplier only ran because the Optional was empty.",
          ],
        },
        {
          type: "paragraph",
          text: "Notice what's not in the code: no `Optional` field in `Promo`, no `Optional` parameter on `finalFare`, no `get()`. The Optional lives for one expression and is gone.",
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
              question: "What is Optional and why was it introduced?",
              answer:
                "A container that holds one non-null value or nothing, added in Java 8. It makes \"this method might not have a result\" part of the return type, so the caller is forced to deal with the empty case instead of getting a surprise `null`.\n\nIt came with streams, which needed a way for `findFirst`, `max` and `reduce` to say \"the stream was empty\". Its Javadoc describes it as primarily a method return type.",
            },
            {
              question: "What is the difference between Optional.of, Optional.ofNullable and Optional.empty?",
              answer:
                "`of(v)` wraps a value that must not be null and throws `NullPointerException` immediately if it is. `ofNullable(v)` returns an empty Optional for null and a full one otherwise. `empty()` returns an empty Optional.\n\nInternally, `empty()` and `ofNullable(null)` both return the same shared `EMPTY` instance, so they don't allocate.",
            },
            {
              question: "What is the difference between orElse and orElseGet?",
              answer:
                "`orElse(x)` takes a value, `orElseGet(supplier)` takes a function that produces one. Because Java evaluates arguments before calling a method, the expression inside `orElse(...)` always runs, even when the Optional has a value. `orElseGet` only calls the supplier when it's empty.\n\nIn my test, `orElse(callBackupApi())` called the backup API even though a driver was present. `javap` showed the `invokestatic callBackupApi` happening before `invokevirtual orElse`. So `orElse` is for constants, `orElseGet` for anything with a cost or side effect.",
            },
            {
              question: "What does get() do on an empty Optional? Why was orElseThrow() added?",
              answer:
                "It throws `NoSuchElementException: No value present`.\n\nJava 10 added the no-argument `orElseThrow()`, which does exactly the same thing. The reason is naming: `get()` looks like a harmless getter, so people called it without checking. `orElseThrow()` says in its name that it can throw.",
            },
            {
              question: "What is the difference between map and flatMap on Optional?",
              answer:
                "`map(f)` applies `f` and wraps the result in a new Optional. `flatMap(f)` is for functions that already return an Optional, and returns that Optional directly instead of wrapping it again.\n\nIn my wallet example, `findRider(\"111\").map(Chain::walletOf)` printed `Optional[Optional[250]]`, while `flatMap` gave `Optional[250]`.",
            },
            {
              question: "What were the Java 9, 10 and 11 additions to Optional?",
              answer:
                "Java 9 added `ifPresentOrElse` (an else branch), `or` (fall back to another Optional, lazily), and `stream` (zero or one element, great with `flatMap`). Java 10 added `orElseThrow()` with no arguments. Java 11 added `isEmpty`.\n\nThe primitive versions got matching additions where they make sense, like `OptionalInt.stream` and `isEmpty`.",
            },
            {
              question: "What are OptionalInt, OptionalLong and OptionalDouble for?",
              answer:
                "They hold a primitive without boxing, and they're what primitive streams return from `max`, `min`, `average`, `findFirst` and so on. `IntStream.of().average()` gave me `OptionalDouble.empty`.\n\nThey're much simpler than `Optional`: `getAsInt`, `orElse`, `orElseGet`, `orElseThrow`, `ifPresent`, but no `map`, `flatMap` or `filter`.",
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
              question: "Why shouldn't Optional be used as a field or a method parameter?",
              answer:
                "As a field: it isn't `Serializable` (my record threw `NotSerializableException: java.util.Optional`), JPA doesn't map it, it adds an object per instance, and the field itself can still be `null`. A nullable field with an Optional-returning getter is the usual answer.\n\nAs a parameter: callers must wrap every argument, they can still pass `null`, and the method now has to check for both `null` and empty. An overload or a documented nullable parameter is clearer.",
            },
            {
              question: "What happens if the function passed to map returns null?",
              answer:
                "You get an empty Optional, not an exception and not a box holding null. `map` passes the function's result through `ofNullable`, which I could see as `invokestatic ofNullable` at the end of `map`'s bytecode.\n\nThat's why `Optional.of(\"D2\").map(drivers::get)` printed `Optional.empty` when the map had no such key. `flatMap`, on the other hand, throws `NullPointerException` if its function returns `null` instead of an Optional.",
            },
            {
              question: "Should a method return Optional<List<T>>?",
              answer:
                "No. For a collection, \"nothing\" is the empty collection, which callers can already loop over safely. Return `List.of()` or `Collections.emptyList()`.\n\nThe same goes for arrays, maps and strings in many APIs. Optional is for single values where there's no natural \"empty\" value.",
            },
            {
              question: "Why does stream().findFirst() throw NullPointerException on a stream whose first element is null?",
              answer:
                "Because an Optional cannot hold `null`, so there's no way to return \"the first element, which is null\". `findFirst` builds its result with `Optional.of`, and my stack trace showed `Objects.requireNonNull` inside `Optional.of` called from `FindOps`.\n\nThe fix is `filter(Objects::nonNull)` before `findFirst`, or not having nulls in the collection.",
            },
            {
              question: "Is it a good idea to replace every null check with Optional?",
              answer:
                "No. `Optional.ofNullable(x).ifPresent(...)` around a local variable is more code and an extra allocation for the same `if`. Optional's value is in method signatures, where it tells callers something they'd otherwise have to read docs for.\n\nInside a method, a plain null check is fine. At API boundaries, return Optional for \"may be absent\", and use empty collections and validation elsewhere.",
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
              question: "How is Optional implemented internally?",
              answer:
                "It's a `final class` with one field, `private final T value`, a private constructor, and a `private static final EMPTY` instance created once as `new Optional(null)`. Empty means `value == null`. `javap -p java.util.Optional` shows exactly that.\n\nEvery method is a few bytecodes: `orElse` checks `value` for null and returns either it or the argument; `map` checks `isEmpty()`, then calls the function and wraps with `ofNullable`.",
            },
            {
              question: "What is a value-based class, and why does it matter for Optional?",
              answer:
                "A class whose instances are immutable, compared with `equals`, and whose identity must not matter: code shouldn't use `==`, `synchronized` or `System.identityHashCode` on them. The JDK may return the same instance or different ones at will.\n\nFor Optional, `Optional.empty() == Optional.empty()` was `true` only because of the `EMPTY` singleton, and `Optional.of(\"tea\") == Optional.of(\"tea\")` was `false`. Since Java 16 it's annotated `@jdk.internal.ValueBased`, and `javac` warns on `synchronized` with it. This prepares for Project Valhalla, where such classes may lose identity altogether.",
            },
            {
              question: "Is Optional thread-safe?",
              answer:
                "The Optional itself is: its only field is `final`, so once published it can be shared freely between threads. But it says nothing about the object inside. An `Optional<List<String>>` holding an `ArrayList` is as thread-unsafe as the list.",
            },
            {
              question: "What's the memory and performance cost of Optional?",
              answer:
                "Empty Optionals are free, they're the shared `EMPTY`. A present one is one small object, typically 16 bytes on 64-bit HotSpot with compressed pointers. In a short chain that's inlined, escape analysis can often remove the allocation entirely.\n\nIt's negligible next to a database lookup. It can matter in tight loops over primitives, where `OptionalInt` or a plain `if` avoids boxing and allocation.",
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
            "Write `Optional<String> findDriver(String zone)` that returns a driver's name from a `Map` for known zones. Print the result for a known and an unknown zone using `orElse(\"none\")`. Hint: `Optional.ofNullable(map.get(zone))`.",
            "Write a method that prints something and returns a fallback. Call it once through `orElse(...)` and once through `orElseGet(...)` on a **present** Optional and count how many times it printed.",
            "Given `Map<String, String> riderToCity` and `Map<String, Integer> cityToBaseFare`, write a method that returns the base fare for a rider, or `50` if anything is missing. Use `flatMap` once.",
            "Turn `List<Optional<String>>` into a `List<String>` of only the present values, first with Java 8 methods, then with `Optional::stream`.",
            "Use `IntStream` to find the cheapest of an array of fares. Print it with `orElse(-1)`, then try an empty array.",
            "Write a method returning `Optional<String>` that accidentally returns `null`. Call `.orElse(\"x\")` on it and read the helpful NPE message.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Solution sketch for exercise 3",
              answer:
                "`return Optional.ofNullable(riderToCity.get(rider)).flatMap(city -> Optional.ofNullable(cityToBaseFare.get(city))).orElse(50);`\n\nUsing `map` instead of `flatMap` for the second step also works here, because `map` wraps with `ofNullable` and a missing fare becomes empty. `flatMap` is needed when the second step is already a method returning `Optional`.",
            },
            {
              question: "Solution sketch for exercise 4",
              answer:
                "Java 8: `list.stream().filter(Optional::isPresent).map(Optional::get).collect(Collectors.toList())`.\n\nJava 9+: `list.stream().flatMap(Optional::stream).toList()`. My `Newer` example printed `[CHAI10, RAIN20]` from three promos where one was empty.",
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
          text: `CREATE    of(v)          v must not be null (NPE now)
          ofNullable(v)  null -> empty
          empty()        shared EMPTY singleton

CHAIN     map(f)         f's null result -> empty
          flatMap(f)     f returns Optional, no nesting
          filter(p)      fails -> empty
          or(sup)    9   empty -> another Optional

FINISH    orElse(x)      x ALWAYS evaluated
          orElseGet(s)   s called only when empty
          orElseThrow()  10   (= get(), better name)
          orElseThrow(s) your exception
          ifPresent / ifPresentOrElse(9)
          isPresent / isEmpty(11) / stream(9)

INSIDE    final class, one field: final T value
          empty == (value == null), value-based

USE FOR   return types of lookups
NOT FOR   fields, params, collections, == , get()`,
          caption: "Everything I want to remember about Optional on one screen.",
        },
        {
          type: "list",
          items: [
            "Optional is a return type that says \"maybe nothing\". It makes absence visible; it doesn't make it disappear.",
            "Chain with `map`, `flatMap` and `filter`, finish with one `orElse...` or `ifPresent...`. Use `orElseGet` whenever the fallback costs something.",
            "Inside, it's one final field and a shared empty instance. Treat it as a value: `equals`, never `==` or `synchronized`.",
          ],
        },
      ],
    },
  ],
};
