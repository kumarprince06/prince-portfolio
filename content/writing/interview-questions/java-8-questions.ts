import type { Lesson } from "../types";

export const java8Questions: Lesson = {
  slug: "java-8-interview-questions",
  date: "2026-10-29",
  title: "Java 8 Interview Questions",
  description: "The Java 8 questions I keep getting asked, from lambdas, method references and default methods to Streams internals, Collectors, Optional, java.time and CompletableFuture. It ends with 29 classic stream coding questions, each main solution run on JDK 21.",
  tags: [
    "Interview",
    "Java",
    "Java 8",
    "Streams",
    "Lambdas",
  ],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These are the Java 8 questions I keep getting asked, written the way I'd answer them out loud. Try answering each one yourself before you open it. A ⭐ marks the ones that come up most often.",
        },
        {
          type: "paragraph",
          text: "Every answer starts with a plain, everyday picture and then goes into the technical detail. The last big section is pure stream coding, the \"write it on the whiteboard\" part of most Java interviews.",
        },
      ],
    },
    {
      title: "The Big Picture",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What came in Java 8, and why was it such a big release?",
              answer: "Java 8 (2014) changed how everyday Java is written. Before it, passing \"a bit of behaviour\" around meant writing a whole anonymous class. After it, I can just pass a lambda.\n\nThe main additions were lambdas and functional interfaces, method references, the Streams API, `Optional`, default and static methods in interfaces, the new `java.time` Date/Time API, `CompletableFuture`, and Metaspace replacing PermGen inside the JVM.\n\nIf I had to pick one theme: Java 8 brought a functional style into an object-oriented language, without breaking any old code.",
            },
            {
              question: "Why did Java add functional programming at all?",
              answer: "Two reasons. Code got shorter and more readable: \"give me the names of drivers rated above 4.5\" reads like the sentence itself when written as a stream. And CPUs went multi-core, so a style built on small, side-effect-free functions is much easier to split across cores.\n\nIt was also catching up. C#, Scala and JavaScript already had lambdas, and Java code full of anonymous classes looked heavy next to them.",
            },
          ],
        },
      ],
    },
    {
      title: "Lambdas and Functional Interfaces",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is a lambda expression?",
              answer: "A lambda is a short, unnamed function that I can pass around like a value. Think of handing a note to a tea stall helper that says \"only serve customers who paid\". The note is the behaviour, and the helper decides when to apply it.\n\nIn code that note is `order -> order.isPaid()`. The left side is the parameter list, the arrow separates it, and the right side is the body. With one statement there are no braces and no `return`; with several statements I use `{ ... return x; }`.\n\nA lambda always implements a functional interface. Its type comes from where I use it, so the same `x -> x * 2` can be a `Function<Integer, Integer>` or an `IntUnaryOperator` depending on the target.",
            },
            {
              question: "⭐ What is a functional interface?",
              answer: "An interface with exactly one abstract method, so a lambda knows which method it is implementing. `Runnable` (`run`), `Comparator` (`compare`) and `Callable` (`call`) were already functional interfaces before Java 8; they just got the name then.\n\n`@FunctionalInterface` is optional, but I always add it on my own ones, because the compiler then refuses a second abstract method. Default methods, static methods and methods that come from `Object` (like `equals`) don't count toward the one.",
            },
            {
              question: "Which built-in functional interfaces should I know?",
              answer: "The four core ones, all in `java.util.function`.\n\n**Predicate<T>** takes a T and returns a boolean. It answers a yes/no question, like \"is this order paid?\", and is what `filter` wants.\n\n**Function<T, R>** turns a T into an R, like an order into its amount. That's what `map` wants.\n\n**Consumer<T>** takes a T and returns nothing. It does something with it, like printing a receipt or sending an SMS.\n\n**Supplier<T>** takes nothing and returns a T. It produces a value on demand, like a fresh OTP or a default config.\n\nAround those: `BiFunction<T, U, R>` and `BiPredicate` take two inputs, `UnaryOperator<T>` is a `Function<T, T>`, `BinaryOperator<T>` combines two Ts into one (what `reduce` wants), and primitive versions like `IntPredicate` and `ToDoubleFunction` avoid boxing.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "Predicate<Order> isPaid     = order -> order.isPaid();\nFunction<Order, Double> fee = order -> order.amount() * 0.05;\nConsumer<String> sendSms    = text -> System.out.println(\"SMS: \" + text);\nSupplier<String> newOtp     = () -> String.valueOf(1000 + new Random().nextInt(9000));",
          title: "The four core interfaces, one line each",
        },
        {
          type: "qa",
          items: [
            {
              question: "Can I combine predicates and functions?",
              answer: "Yes, they have default methods for it. `isPaid.and(isLarge)`, `isPaid.or(isFree)` and `isPaid.negate()` build new predicates. For functions, `f.andThen(g)` runs f then g, and `f.compose(g)` runs g then f.\n\nIt's handy when the filter rules come from settings: I can build one combined `Predicate` and pass it to a single `filter` call.",
            },
            {
              question: "Lambda vs anonymous class: what's the difference?",
              answer: "They look like they do the same job, but there are real differences.\n\nIn a lambda, `this` means the enclosing object. In an anonymous class, `this` is the anonymous object itself.\n\nA lambda can only implement a functional interface. An anonymous class can extend a class, implement an interface with many methods, and keep its own fields.\n\nUnder the hood, the compiler writes a separate `Outer$1.class` file for every anonymous class. A lambda gets no class file at compile time; its body becomes a private method and the class is created at runtime through `invokedynamic`. A lambda that captures nothing is created once and reused, so it is cheap.",
            },
            {
              question: "What does \"effectively final\" mean, and why can lambdas only capture such variables?",
              answer: "A local variable is effectively final if it is never reassigned after it gets its value, even without the `final` keyword.\n\nLambdas can only read such variables because the lambda gets a copy of the value. It might run later, maybe on another thread, after the method that created it has already returned and its stack frame is gone. If the variable could still change, the copy and the original would disagree, so Java just forbids it.\n\nFields are different: a lambda can read and change fields, because it reaches them through `this`, not through a copy. That is also why changing a shared field from a parallel stream is a data race.",
            },
            {
              question: "How do I get around \"variable used in lambda must be final\" when I really need a counter?",
              answer: "Usually the right fix is to not count by hand at all: `count()`, `sum()` or a collector does it. If I really need a mutable holder, an `AtomicInteger` or a one-element array works, because the reference stays final while the content changes.\n\nThe atomic is the only safe one if the stream could be parallel. But reaching for these is often a hint that a loop would read better than a stream.",
            },
          ],
        },
      ],
    },
    {
      title: "Method References",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is a method reference, and what are the four kinds?",
              answer: "A shortcut for a lambda that only calls one existing method. Instead of `name -> System.out.println(name)` I write `System.out::println`. Same behaviour, less noise.\n\nThe four kinds: a static method (`Integer::parseInt`, meaning `s -> Integer.parseInt(s)`); an instance method of a particular object (`System.out::println`, or `cart::add`); an instance method of an arbitrary object of a type (`String::toUpperCase`, meaning `s -> s.toUpperCase()`); and a constructor (`ArrayList::new`, meaning `() -> new ArrayList<>()`).",
            },
            {
              question: "When should I prefer a lambda over a method reference?",
              answer: "When the reference would be less clear than the lambda. `Order::isPaid` is clearer than `o -> o.isPaid()`. But if I'd need a weird helper method just to use a reference, or the call needs extra arguments like `o -> o.amount() > 100`, the lambda reads better. Readability decides, not length.",
            },
          ],
        },
      ],
    },
    {
      title: "Default and Static Methods in Interfaces",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Why were default methods added?",
              answer: "To let interfaces grow without breaking every class that implements them. Java 8 wanted to add `forEach`, `stream()` and `removeIf` to `Collection`. Without default methods, every collection class in every library in the world would have stopped compiling.\n\nA default method has a body inside the interface. Implementations get it for free and can override it. It's like a franchise rulebook adding \"greet every customer\" with a standard greeting: every outlet picks it up, and an outlet can still use its own words.",
            },
            {
              question: "What happens if a class gets the same default method from two interfaces?",
              answer: "That's the diamond problem, and Java makes me resolve it. If `Car` and `Boat` both have `default void start()` and `AmphibiousCar` implements both, the code does not compile until I override `start()`.\n\nInside the override I can pick one or call both: `Car.super.start();`. One rule to remember: a method from a class always wins over a default method from an interface (\"class wins\").",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "interface Car  { default String start() { return \"engine on\"; } }\ninterface Boat { default String start() { return \"propeller on\"; } }\n\nclass AmphibiousCar implements Car, Boat {\n    @Override\n    public String start() {\n        return Car.super.start() + \" + \" + Boat.super.start();\n    }\n}",
          title: "Resolving a default-method clash",
        },
        {
          type: "qa",
          items: [
            {
              question: "What are static methods in interfaces for?",
              answer: "Helpers that belong to the interface itself, so I don't need a separate utility class like `Collections` next to `Collection`. `Comparator.comparing(...)`, `Function.identity()` and `List.of(...)` (Java 9) are examples.\n\nThey are called on the interface name (`Comparator.naturalOrder()`) and are not inherited by implementing classes. Java 9 also added private interface methods, so several default methods can share code.",
            },
            {
              question: "If interfaces can have method bodies now, is there any reason left for abstract classes?",
              answer: "Yes. An interface still can't hold instance state (fields that change per object), can't have constructors, and all its members are public (except Java 9 private methods). An abstract class can have fields, constructors and protected methods.\n\nSo: an interface for \"what it can do\", an abstract class when implementations really share state or a common algorithm.",
            },
          ],
        },
      ],
    },
    {
      title: "Streams Basics",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is a stream, and how is it different from a collection?",
              answer: "A collection is a box that stores data. A stream is a conveyor belt that carries data past a series of workers, each doing one job, and it stores nothing.\n\nStreams don't change their source: filtering a list gives a new result, the list stays as it was. They're lazy: nothing happens until a terminal operation asks for a result. And they can be consumed only once.",
            },
            {
              question: "⭐ What are intermediate and terminal operations?",
              answer: "Intermediate operations describe a step and return another stream: `filter`, `map`, `flatMap`, `sorted`, `distinct`, `limit`, `skip`, `peek`. Calling them does no work yet.\n\nTerminal operations produce a result or a side effect and actually run the pipeline: `collect`, `toList` (Java 16), `forEach`, `count`, `reduce`, `min`, `max`, `findFirst`, `anyMatch`. After a terminal operation the stream is used up.",
            },
            {
              question: "What does \"lazy evaluation\" mean in streams? Show it.",
              answer: "Nothing runs until the terminal operation. Then each element travels through all the steps before the next element starts, instead of \"filter everything, then map everything\".\n\nShort-circuiting operations like `findFirst`, `anyMatch` and `limit` stop as soon as they have their answer. In the example below, \"cocoa\" and \"juice\" are never even looked at.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "String first = Stream.of(\"tea\", \"coffee\", \"cocoa\", \"juice\")\n    .filter(d -> { System.out.println(\"filter \" + d); return d.startsWith(\"c\"); })\n    .map(d -> { System.out.println(\"map    \" + d); return d.toUpperCase(); })\n    .findFirst()\n    .orElse(\"none\");\nSystem.out.println(\"result \" + first);",
          title: "LazyStream.java",
        },
        {
          type: "output",
          text: "filter tea\nfilter coffee\nmap    coffee\nresult COFFEE",
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is the difference between `map` and `flatMap`?",
              answer: "`map` is one in, one out: each order becomes its amount. `flatMap` is one in, many out, then flattened into one stream: each customer has a list of orders, and `flatMap(c -> c.orders().stream())` gives one stream of all orders across all customers.\n\nWithout `flatMap` I'd get a `Stream<List<Order>>`, a stream of boxes, when what I wanted was the items inside the boxes.",
            },
            {
              question: "What is the difference between `findFirst` and `findAny`?",
              answer: "`findFirst` returns the first element in encounter order. `findAny` may return any element. In a sequential stream they usually behave the same; in a parallel stream `findAny` is faster because it doesn't have to wait for the \"first\" chunk.",
            },
            {
              question: "Can a stream be reused?",
              answer: "No. A second terminal operation on the same stream throws `IllegalStateException: stream has already been operated upon or closed`. If I need it twice, I create a new stream from the source, or keep a `Supplier<Stream<T>>` and call `get()` each time.",
            },
            {
              question: "What is `peek` for, and why is it a trap?",
              answer: "It's meant for debugging: look at each element as it passes, without changing it. The trap is putting real work in it. It only runs when a terminal operation pulls elements through, and since Java 9 `count()` can skip the whole pipeline when the size is already known, so `peek` may not run at all.",
            },
            {
              question: "What are `IntStream`, `LongStream` and `DoubleStream` for?",
              answer: "They are streams of primitives, so no boxing into `Integer` objects. They also have number-specific operations: `sum()`, `average()`, `range(0, 10)` and `summaryStatistics()` (count, sum, min, max and average in one pass).\n\nI switch with `mapToInt(Order::quantity)` and back with `boxed()`. For large numeric work the difference in memory and speed is real.",
            },
            {
              question: "`reduce` vs `collect`: when do I use which?",
              answer: "`reduce` folds elements into one immutable value: `numbers.stream().reduce(0, Integer::sum)`. It's for values like sums, max or a combined string.\n\n`collect` is a mutable reduction: it builds up a container like a list, a map or a `StringBuilder`. Building a list with `reduce` would create a new list at every step, so collecting into containers is `collect`'s job.",
            },
            {
              question: "What are `takeWhile` and `dropWhile`? (Java 9)",
              answer: "`takeWhile` keeps taking elements while the condition holds and stops at the first one that fails. `dropWhile` skips elements while the condition holds and keeps everything after.\n\nOn a sorted list of bus departure times, `takeWhile(t -> t.isBefore(noon))` gives the morning buses and stops reading right at noon. Unlike `filter`, they care about order and stop early.",
            },
          ],
        },
      ],
    },
    {
      title: "How Streams Work Internally",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How do streams work internally?",
              answer: "A stream is a linked chain of stages: the source, then one stage per intermediate operation, then the terminal operation. Calling `filter` or `map` only adds a stage to the chain.\n\nWhen the terminal operation runs, the source's `Spliterator` (a \"splittable iterator\") hands over elements one at a time, and each element is pushed through all the stages in a row. That's called loop fusion: the whole pipeline is effectively one loop.\n\nStateful operations like `sorted` and `distinct` are the exception: `sorted` has to see every element before it can pass the first one on, so it buffers.",
            },
            {
              question: "What are stateless and stateful operations, and why does it matter?",
              answer: "Stateless operations (`filter`, `map`, `flatMap`) handle each element on its own. Stateful operations (`sorted`, `distinct`, `limit`, `skip`) need to remember something about other elements.\n\nIt matters for performance and parallelism. A stateful step can mean buffering the whole stream (`sorted` on a million rows), and in parallel it needs coordination between threads, which can wipe out the speed-up.",
            },
            {
              question: "What is a `Spliterator`?",
              answer: "The iterator behind every stream. Besides walking elements (`tryAdvance`), it can split its data in half (`trySplit`) for parallel streams, and it reports characteristics like SIZED, ORDERED, SORTED and DISTINCT.\n\nThose flags let the stream skip work. If the source is SIZED and nothing filters, `count()` can just return the size.",
            },
          ],
        },
      ],
    },
    {
      title: "Parallel Streams",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How do parallel streams work, and when should I use them?",
              answer: "`parallelStream()` splits the source into chunks with the Spliterator, processes the chunks on the common `ForkJoinPool` (one thread fewer than the CPU cores, plus the calling thread), and merges the partial results at the end.\n\nI'd use them only when all of these hold: lots of data, CPU-heavy work per element, no shared mutable state, and a source that splits well (`ArrayList` and arrays split well; `LinkedList` and `Stream.iterate` don't).\n\nIn a web server I almost never use them. The common pool is shared by the whole JVM, so one request running a slow parallel stream, worse still one doing I/O, slows everyone else using the pool. And for small lists the split-and-merge overhead makes them slower than sequential.",
            },
            {
              question: "Why is `list.parallelStream().forEach(result::add)` into an `ArrayList` a bug?",
              answer: "Several threads add to a non-thread-safe list at once, so elements go missing or the list throws `ArrayIndexOutOfBoundsException`. It's like several cashiers writing in one notebook at the same time.\n\nThe fix is to let the stream build the result: `collect(Collectors.toList())` or `toList()` gives each thread its own partial list and merges them safely.",
            },
            {
              question: "Does a parallel stream keep the order?",
              answer: "Encounter order is kept for operations that respect it, like `collect` into a list and `findFirst`, but keeping order costs speed. `forEach` gives no order guarantee in parallel; `forEachOrdered` does, at the cost of waiting. If I don't care about order, `unordered()` lets operations like `distinct` and `limit` run faster.",
            },
          ],
        },
      ],
    },
    {
      title: "Collectors",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is the difference between `groupingBy` and `partitioningBy`?",
              answer: "`groupingBy` splits elements into as many groups as there are keys: today's orders by city gives one list per city. `partitioningBy` always splits into exactly two groups, `true` and `false`, by a condition: paid and unpaid orders.\n\nBoth take a downstream collector to say what to do with each group, like `counting()`, `summingDouble(...)`, `mapping(...)` or `maxBy(...)`. And `partitioningBy` always has both keys, even when a group is empty.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "record Order(String city, String item, double amount) {}\n\nList<Order> orders = List.of(\n    new Order(\"Pune\", \"masala tea\", 20),\n    new Order(\"Delhi\", \"veg thali\", 150),\n    new Order(\"Pune\", \"dosa\", 80),\n    new Order(\"Delhi\", \"lassi\", 40));\n\nMap<String, Double> totalByCity = orders.stream()\n    .collect(Collectors.groupingBy(Order::city, TreeMap::new,\n             Collectors.summingDouble(Order::amount)));\n\nList<String> bigOrders = orders.stream()\n    .filter(o -> o.amount() >= 50)\n    .map(Order::item)\n    .toList();\n\nSystem.out.println(totalByCity);\nSystem.out.println(bigOrders);",
          title: "Group today's orders by city",
        },
        {
          type: "output",
          text: "{Delhi=190.0, Pune=100.0}\n[veg thali, dosa]",
        },
        {
          type: "qa",
          items: [
            {
              question: "What happens with `Collectors.toMap` when two elements have the same key?",
              answer: "It throws `IllegalStateException: Duplicate key`. I pass a third argument, the merge function, to decide: keep the first `(a, b) -> a`, keep the latest `(a, b) -> b`, or add them `Integer::sum`.\n\nTwo more traps: `toMap` throws a `NullPointerException` if any value is null, and it returns a `HashMap` with no order. A fourth argument, like `LinkedHashMap::new`, picks the map type.",
            },
            {
              question: "What does `Collectors.collectingAndThen` do?",
              answer: "It runs a collector and then applies one last function to the result. Two common uses: `collectingAndThen(toList(), Collections::unmodifiableList)` for a read-only list, and unwrapping `maxBy`'s `Optional` inside a `groupingBy`, like \"the highest-paid person per department\" without an Optional in every map value.",
            },
            {
              question: "`Collectors.toList()` vs `Stream.toList()` (Java 16)?",
              answer: "`stream.toList()` returns an unmodifiable list, so `add` throws `UnsupportedOperationException`. `Collectors.toList()` makes no promise; today it gives an `ArrayList` that I can change. If I need to change the result later, I use `Collectors.toCollection(ArrayList::new)` to say so.",
            },
            {
              question: "What does `Collectors.joining` do?",
              answer: "It glues strings together with an optional separator, prefix and suffix: `joining(\", \", \"[\", \"]\")` turns tea, coffee and juice into `[tea, coffee, juice]`. It uses a `StringBuilder` under the hood, so it's the right tool instead of `+` in a loop.",
            },
          ],
        },
      ],
    },
    {
      title: "Optional",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is `Optional`, and what problem does it solve?",
              answer: "A box that either holds a value or is empty. It makes \"this might not exist\" part of the method's return type. If `findDriverById` returns `Optional<Driver>`, the caller can't forget the \"not found\" case the way they forget a null check.\n\nIt's a return-type tool. It doesn't remove nulls from Java; it makes absence visible at the places where it's expected.",
            },
            {
              question: "⭐ `orElse` vs `orElseGet`: what's the difference?",
              answer: "`orElse(value)` always evaluates its argument, even when the Optional has a value. `orElseGet(supplier)` only calls the supplier when it's empty.\n\nWith a constant it doesn't matter. With something expensive it matters a lot: `orElse(loadDefaultFromDb())` hits the database every single time. So: `orElse` for constants, `orElseGet` for anything with a cost. `orElseThrow(() -> new NotFoundException(...))` is the third option, for \"absent is an error\".",
            },
            {
              question: "`Optional.of` vs `Optional.ofNullable`?",
              answer: "`Optional.of(x)` throws a `NullPointerException` if x is null, so I use it when I know the value is there. `Optional.ofNullable(x)` gives an empty Optional for null; that's the one for wrapping results from old APIs that return null.",
            },
            {
              question: "How is `Optional` misused?",
              answer: "As a field, a method parameter, or inside collections. It isn't `Serializable` and was designed only for return values; for a parameter, an overload or a null check is simpler.\n\nCalling `get()` without checking. That's just a null check with extra steps, and `get()` on an empty Optional throws `NoSuchElementException`. I use `map`, `orElse` or `ifPresent` instead.\n\nReturning `Optional<List<T>>`. An empty list already means \"nothing found\".\n\nAnd `if (opt.isPresent()) { x = opt.get(); }`, which is old null-checking in disguise. `opt.map(...).orElse(...)` says it in one line.",
            },
            {
              question: "How do `map` and `flatMap` work on `Optional`?",
              answer: "`map` transforms the value if one is there: `findUser(id).map(User::email)` gives `Optional<String>`. If the function itself returns an Optional, `map` would give `Optional<Optional<T>>`, so I use `flatMap` to keep it flat, exactly like streams.\n\n`filter` works too: `findUser(id).filter(User::isActive)`. Java 9 added `ifPresentOrElse`, `or` and `stream()`.",
            },
          ],
        },
      ],
    },
    {
      title: "Date and Time API",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "Why was the new Date/Time API (`java.time`) needed?",
              answer: "The old `java.util.Date` and `Calendar` were famously bad. They're mutable, so a date passed into a method could be changed behind my back. `SimpleDateFormat` isn't thread-safe, and sharing one between threads gives garbage dates. Months start at 0, so January is 0. And one `Date` class tried to be a moment, a calendar date and a timestamp at once.\n\n`java.time` (based on Joda-Time) fixes all of it: every type is immutable and thread-safe, months start at 1, and each concept has its own clear type.",
            },
            {
              question: "Which `java.time` classes should I know?",
              answer: "**Instant** is an exact moment on the UTC timeline, like \"the payment happened at this instant\". It's the right type for storing events.\n\n**LocalDate**, **LocalTime** and **LocalDateTime** have no time zone: a birthday, a shop's opening time, \"the meeting on 5 March at 10:00\" without saying where.\n\n**ZonedDateTime** is a date and time in a named zone like `Asia/Kolkata`, with daylight-saving rules. **OffsetDateTime** has a fixed offset like +05:30.\n\n**Duration** is an amount of time in seconds and nanos (a 25-minute ride). **Period** is in years, months and days (a 3-month subscription). **DateTimeFormatter** is the thread-safe formatter.",
            },
            {
              question: "How should a backend store dates and times?",
              answer: "Store moments as `Instant` in UTC (a `TIMESTAMPTZ` column in Postgres), and convert to the user's zone only when showing it. That way a cab booked in Mumbai and viewed from London means the same moment for both.\n\n`LocalDateTime` is only right for things that really have no zone, like \"the shop opens at 09:00 every day\". For tests, injecting a `Clock` instead of calling `Instant.now()` makes time controllable.",
            },
          ],
        },
      ],
    },
    {
      title: "CompletableFuture",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is `CompletableFuture`, and why is it better than `Future`?",
              answer: "A `Future` is a token for a result that will arrive later, and the only way to use it is `get()`, which blocks until the result arrives. It's like ordering food and standing at the counter until it's ready.\n\nA `CompletableFuture` is more like getting a buzzer: I say what should happen when the food is ready and go do other things. It lets me chain steps, combine results from several calls, handle errors and add timeouts, all without blocking a thread.",
            },
            {
              question: "Which `CompletableFuture` methods do I need to know?",
              answer: "`supplyAsync(supplier, executor)` starts work that returns a value. `runAsync` is the same with no value.\n\n`thenApply` transforms the result (like `map`). `thenCompose` chains another async call that itself returns a future (like `flatMap`). `thenCombine` merges two independent futures. `thenAccept` consumes the result.\n\n`allOf` waits for all of several futures; `anyOf` waits for the first. `exceptionally` recovers from an error, and `handle` sees both the result and the error. Java 9 added `orTimeout` and `completeOnTimeout`. Finally, `join()` gets the result like `get()`, but throws an unchecked exception.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "ExecutorService pool = Executors.newFixedThreadPool(4);\n\nCompletableFuture<Double> distanceKm =\n    CompletableFuture.supplyAsync(() -> mapsClient.distanceKm(from, to), pool);\nCompletableFuture<Double> surge =\n    CompletableFuture.supplyAsync(() -> pricing.currentSurge(city), pool);\n\ndouble fare = distanceKm\n    .thenCombine(surge, (km, multiplier) -> km * 12 * multiplier)\n    .completeOnTimeout(150.0, 2, TimeUnit.SECONDS)   // flat fare if slow\n    .join();",
          title: "Fare estimate from two calls running in parallel",
        },
        {
          type: "qa",
          items: [
            {
              question: "Why should I pass my own executor to the async methods?",
              answer: "Without one, `supplyAsync` runs on the common `ForkJoinPool`, which has only about as many threads as CPU cores and is shared by the whole JVM, parallel streams included. Put blocking HTTP or database calls on it and a few slow calls can starve everything else.\n\nMy own bounded pool keeps the blocking work separate and lets me size it for waiting, not for CPU.",
            },
            {
              question: "`thenApply` vs `thenApplyAsync`?",
              answer: "`thenApply` runs the next step on whichever thread completed the previous one (or on the caller if it was already done). `thenApplyAsync` hands the step to an executor. For quick transformations `thenApply` is fine; for heavy steps the async version with my own executor keeps them off the thread that finished the I/O.",
            },
          ],
        },
      ],
    },
    {
      title: "Other Java 8 Additions",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What other smaller Java 8 additions are worth mentioning?",
              answer: "`Map` got very useful defaults: `getOrDefault`, `putIfAbsent`, `computeIfAbsent`, `merge` (perfect for counting: `counts.merge(word, 1, Integer::sum)`), `forEach` and `replaceAll`.\n\n`Collection.removeIf` removes items safely while scanning. `Iterable.forEach` and `List.sort` were added. `String.join(\", \", list)` and `StringJoiner` arrived. `Base64` came into the JDK, and so did `StampedLock`, `LongAdder` and the `ConcurrentHashMap` bulk operations.\n\nThere were also repeatable annotations and type annotations, and the Nashorn JavaScript engine (removed again in Java 15).",
            },
            {
              question: "What happened to PermGen in Java 8?",
              answer: "It was removed. Class metadata now lives in Metaspace, which is allocated from native memory and grows as needed instead of having a small fixed size. That ended the classic `OutOfMemoryError: PermGen space` after redeploying apps in an app server. A limit is still set with `-XX:MaxMetaspaceSize`, otherwise a class-loader leak can eat the machine's memory.",
            },
          ],
        },
      ],
    },
    {
      title: "Stream Coding Questions",
      blocks: [
        {
          type: "paragraph",
          text: "These are the classic \"write it with streams\" asks. The main solution in every answer below was compiled and run on JDK 21. The sample inputs: `nums = [5, 3, 8, 3, 9, 1, 8, 6]`, `word = \"programming\"`, and a small `staff` list of `Employee(name, dept, salary)` records.",
        },
        {
          type: "qa",
          items: [
            {
              question: "Find all even numbers in a list.",
              answer: "`nums.stream().filter(n -> n % 2 == 0).toList()` gives `[8, 8, 6]`. One `filter`, one terminal operation; the warm-up question.",
            },
            {
              question: "⭐ Find the duplicate elements in a list.",
              answer: "Use a `Set` as a memory of what's been seen. `Set.add` returns false when the element is already there:\n\n`Set<Integer> seen = new HashSet<>();` then `nums.stream().filter(n -> !seen.add(n)).collect(Collectors.toSet())` gives `[3, 8]`.\n\nA purer version that is also safe in parallel: group and count, then keep the counts above 1, `groupingBy(n -> n, counting())` followed by a filter on `e.getValue() > 1`.",
            },
            {
              question: "⭐ Count how many times each character appears in a string.",
              answer: "`word.chars().mapToObj(c -> (char) c).collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()))`\n\nFor \"programming\" that gives `{p=1, r=2, o=1, g=2, a=1, m=2, i=1, n=1}`. `chars()` gives an `IntStream`, so `mapToObj` turns it back into characters, and `LinkedHashMap::new` keeps the order the characters first appear in.",
            },
            {
              question: "⭐ Find the first non-repeated character in a string.",
              answer: "Build the ordered count map from the previous question, then take the first entry with count 1:\n\n`freq.entrySet().stream().filter(e -> e.getValue() == 1).map(Map.Entry::getKey).findFirst()`\n\nFor \"programming\" it's `p`. The `LinkedHashMap` is the whole trick; a plain `HashMap` would lose the \"first\".",
            },
            {
              question: "Find the first repeated character in a string.",
              answer: "`Set<Character> seen = new HashSet<>();` then `word.chars().mapToObj(c -> (char) c).filter(c -> !seen.add(c)).findFirst()`. For \"programming\" it's `r`: the second `r` is the first character that was already seen.",
            },
            {
              question: "⭐ Find the second highest number in a list.",
              answer: "`nums.stream().distinct().sorted(Comparator.reverseOrder()).skip(1).findFirst()` gives `8`.\n\nThe `distinct()` matters: without it, a list like `[9, 9, 8]` would answer 9. Sorting is O(n log n); if they ask for better, one pass that tracks the top two values is O(n).",
            },
            {
              question: "Find the max, min, sum and average in one pass.",
              answer: "`nums.stream().mapToInt(Integer::intValue).summaryStatistics()` returns count, sum, min, average and max together: `count=8, sum=43, min=1, average=5.375, max=9`. One pass instead of four separate streams.",
            },
            {
              question: "Sum of the squares of the odd numbers.",
              answer: "`nums.stream().filter(n -> n % 2 == 1).mapToInt(n -> n * n).sum()` gives 25 + 9 + 9 + 81 + 1 = `125`. `mapToInt` avoids boxing and gives me `sum()` directly.",
            },
            {
              question: "Count the words in a sentence.",
              answer: "`Arrays.stream(sentence.split(\"\\\\s+\")).collect(Collectors.groupingBy(w -> w, TreeMap::new, Collectors.counting()))`\n\nFor \"the cab and the bus and the train\" that's `{and=2, bus=1, cab=1, the=3, train=1}`. `\\\\s+` handles repeated spaces; `TreeMap::new` sorts the words.",
            },
            {
              question: "Find the top 2 most frequent words.",
              answer: "Count the words, then sort the entries by count, highest first, and break ties alphabetically:\n\n`counts.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey())).limit(2).map(Map.Entry::getKey).toList()`\n\nThat gives `[the, and]`. The explicit type witness `<String, Long>` is needed because `reversed()` breaks the type inference.",
            },
            {
              question: "Reverse each word in a sentence.",
              answer: "`Arrays.stream(sentence.split(\" \")).map(w -> new StringBuilder(w).reverse().toString()).collect(Collectors.joining(\" \"))`\n\n\"the cab\" becomes \"eht bac\". To reverse the word order instead, collect into a list and use `Collections.reverse`.",
            },
            {
              question: "Check whether a string is a palindrome using streams.",
              answer: "`IntStream.range(0, s.length() / 2).allMatch(i -> s.charAt(i) == s.charAt(s.length() - 1 - i))`\n\nIt compares mirror pairs and `allMatch` stops at the first mismatch. \"madam\" gives `true`. `new StringBuilder(s).reverse().toString().equals(s)` is simpler, but it builds a whole new string.",
            },
            {
              question: "⭐ Group employees by department.",
              answer: "`staff.stream().collect(Collectors.groupingBy(Employee::dept, Collectors.mapping(Employee::name, Collectors.toList())))`\n\nThe output is like `{Sales=[Asha, Ravi], Support=[Zoya], Tech=[Meera, Kabir]}`. Without the `mapping` downstream I'd get whole Employee objects in each list.",
            },
            {
              question: "Find the average salary per department.",
              answer: "`staff.stream().collect(Collectors.groupingBy(Employee::dept, Collectors.averagingDouble(Employee::salary)))` gives `{Sales=57500.0, Support=40000.0, Tech=82500.0}`.",
            },
            {
              question: "Find the highest-paid employee in each department.",
              answer: "`groupingBy(Employee::dept, collectingAndThen(maxBy(Comparator.comparingDouble(Employee::salary)), o -> o.get().name()))`\n\nThat gives `{Sales=Ravi, Support=Zoya, Tech=Meera}`. `maxBy` returns an `Optional`, and `collectingAndThen` unwraps it. The `get()` is safe here because a group only exists if it has at least one employee.",
            },
            {
              question: "Find the employee with the second highest salary.",
              answer: "`staff.stream().sorted(Comparator.comparingDouble(Employee::salary).reversed()).skip(1).findFirst()` gives Kabir (75000) after Meera (90000). If two people can share the top salary, I'd first get the distinct salaries, pick the second, then filter employees by it.",
            },
            {
              question: "Split numbers into even and odd.",
              answer: "`nums.stream().collect(Collectors.partitioningBy(n -> n % 2 == 0))` gives `{false=[5, 3, 3, 9, 1], true=[8, 8, 6]}`. `partitioningBy`, because there are exactly two groups.",
            },
            {
              question: "Flatten a list of lists.",
              answer: "`baskets.stream().flatMap(List::stream).distinct().toList()`\n\nFor three orders `[tea, bun]`, `[coffee]` and `[tea, samosa]`, the unique items are `[tea, bun, coffee, samosa]`.",
            },
            {
              question: "Sort a map by its values, highest first.",
              answer: "`sales.entrySet().stream().sorted(Map.Entry.<String, Integer>comparingByValue().reversed()).collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new))`\n\n`{Delhi=40, Pune=75, Goa=20}` becomes `{Pune=75, Delhi=40, Goa=20}`. The `LinkedHashMap::new` at the end is the part people forget: a plain `toMap` returns a `HashMap` and the sorting is lost.",
            },
            {
              question: "Group words that are anagrams of each other.",
              answer: "Use the sorted letters as the key, since \"listen\" and \"silent\" both sort to \"eilnst\":\n\n`words.stream().collect(Collectors.groupingBy(w -> { char[] c = w.toCharArray(); Arrays.sort(c); return new String(c); }))`\n\nFor listen, silent, tea, eat and cab the groups are `[listen, silent]`, `[tea, eat]` and `[cab]`.",
            },
            {
              question: "Remove duplicates but keep the original order.",
              answer: "`nums.stream().distinct().toList()` gives `[5, 3, 8, 9, 1, 6]`. `distinct()` keeps the first occurrence and the encounter order in a sequential stream. Outside streams, `new LinkedHashSet<>(list)` does the same.",
            },
            {
              question: "Convert a list of objects into a map.",
              answer: "`staff.stream().collect(Collectors.toMap(Employee::name, Employee::salary))`. If names can repeat, add the merge function `(a, b) -> a`, otherwise it throws \"Duplicate key\".",
            },
            {
              question: "Generate the first 10 Fibonacci numbers.",
              answer: "`Stream.iterate(new long[]{0, 1}, f -> new long[]{f[1], f[0] + f[1]}).limit(10).map(f -> f[0]).toList()`\n\nThat gives `[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`. Each element carries the pair it needs to make the next one. Without `limit`, the stream is infinite.",
            },
            {
              question: "Find all prime numbers up to 30.",
              answer: "`IntStream.rangeClosed(2, 30).filter(n -> IntStream.rangeClosed(2, (int) Math.sqrt(n)).noneMatch(d -> n % d == 0)).boxed().toList()`\n\nThat gives `[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]`. Checking divisors only up to the square root is the detail interviewers listen for.",
            },
            {
              question: "Find the character that appears most often.",
              answer: "`freq.entrySet().stream().max(Map.Entry.comparingByValue()).get()` gives `r=2` for \"programming\". r, g and m all appear twice; `max` keeps the first one it saw on a tie, so I'd mention ties if they ask for \"the\" answer.",
            },
            {
              question: "Sum the digits of a number.",
              answer: "`String.valueOf(4821).chars().map(c -> c - '0').sum()` gives `15`. Subtracting `'0'` turns the character code into the digit value.",
            },
            {
              question: "Count the vowels in a string.",
              answer: "`word.chars().filter(c -> \"aeiou\".indexOf(c) >= 0).count()` gives `3` for \"programming\" (o, a, i).",
            },
            {
              question: "Find the longest string in a list.",
              answer: "`Stream.of(\"tea\", \"samosa\", \"bun\").max(Comparator.comparingInt(String::length)).get()` gives `samosa`.",
            },
            {
              question: "Join a list of strings with a comma and brackets.",
              answer: "`Stream.of(\"tea\", \"coffee\", \"juice\").collect(Collectors.joining(\", \", \"[\", \"]\"))` gives `[tea, coffee, juice]`.",
            },
          ],
        },
      ],
    },
    {
      title: "Quick Revision",
      blocks: [
        {
          type: "diagram",
          text: "LAMBDA        (params) -> body    implements ONE abstract method\nFUNCTIONAL    Predicate T->boolean | Function T->R | Consumer T->void\n              Supplier ()->T | UnaryOperator T->T | BinaryOperator (T,T)->T\nMETHOD REF    Integer::parseInt | System.out::println | String::trim | ArrayList::new\nDEFAULT       interface grows without breaking impls; clash -> override, A.super.m()\n\nSTREAM        source -> intermediate (lazy) -> terminal (runs it, once only)\n  lazy        each element flows through ALL stages, then the next one\n  short-circ  findFirst / anyMatch / limit stop early\n  stateful    sorted / distinct buffer\n  map         1 -> 1          flatMap   1 -> many, flattened\n  reduce      immutable value collect   mutable container\n  parallel    common ForkJoinPool (cores-1); CPU-heavy, big, no shared state\n\nCOLLECTORS    groupingBy(key, downstream)   partitioningBy(predicate) -> true/false\n              toMap(k, v, merge, LinkedHashMap::new)   duplicate key -> exception\n              counting() summingDouble() averagingDouble() mapping() maxBy()\n\nOPTIONAL      return types only; orElse = always runs, orElseGet = lazy\n              never get() blindly; never fields, params, collections\n\nJAVA.TIME     Instant (moment, UTC)  LocalDate/Time (no zone)  ZonedDateTime\n              Duration (time)  Period (days/months)  all immutable + thread-safe\n\nCOMPLETABLE   supplyAsync -> thenApply / thenCompose / thenCombine\nFUTURE        allOf / anyOf  exceptionally / handle  orTimeout  -> own executor",
          caption: "Java 8 in one screen",
        },
      ],
    },
  ],
};
